import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { setTimeout as sleep } from 'node:timers/promises';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const port = 8791;
const cdp = 9334;
const shots = [
  ['toon_default', ''],
  ['toon_corner', 'cam=corner'],
  ['toon_close', 'cam=close'],
  ['unlit_default', 'mode=unlit'],
];

function start(cmd, args, cwd) {
  const child = spawn(cmd, args, { cwd, stdio: ['ignore', 'pipe', 'pipe'] });
  let log = '';
  child.stdout.on('data', (d) => { log += d; });
  child.stderr.on('data', (d) => { log += d; });
  child.log = () => log;
  return child;
}

async function waitJson(url) {
  for (let i = 0; i < 50; i++) {
    try {
      const res = await fetch(url);
      if (res.ok) return await res.json();
    } catch { /* chrome still booting */ }
    await sleep(150);
  }
  throw new Error('cdp not ready');
}

function cdpClient(wsUrl) {
  const ws = new WebSocket(wsUrl);
  let id = 0;
  const pending = new Map();
  const events = [];
  const opened = new Promise((resolve, reject) => {
    ws.addEventListener('open', resolve);
    ws.addEventListener('error', () => reject(new Error('cdp socket')));
  });
  ws.addEventListener('message', (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.id && pending.has(msg.id)) {
      pending.get(msg.id)(msg);
      pending.delete(msg.id);
    } else if (msg.method) events.push(msg);
  });
  async function send(method, params = {}) {
    await opened;
    const msgId = ++id;
    ws.send(JSON.stringify({ id: msgId, method, params }));
    const msg = await new Promise((resolve) => pending.set(msgId, resolve));
    if (msg.error) throw new Error(method + ' ' + JSON.stringify(msg.error));
    return msg.result;
  }
  return { send, events, ws };
}

async function main() {
  mkdirSync('/opt/cursor/artifacts', { recursive: true });
  mkdirSync(resolve(root, 'shots'), { recursive: true });
  const server = start('python3', ['-m', 'http.server', String(port), '--bind', '127.0.0.1'], root);
  const chrome = start('google-chrome', [
    '--headless=new',
    '--no-sandbox',
    '--disable-gpu',
    '--use-angle=swiftshader',
    '--enable-webgl',
    '--ignore-gpu-blocklist',
    `--remote-debugging-port=${cdp}`,
    '--user-data-dir=/tmp/jazz-club-chrome',
    '--window-size=1440,900',
    'about:blank',
  ], root);

  try {
    await waitJson(`http://127.0.0.1:${port}/layout.json`);
    const ver = await waitJson(`http://127.0.0.1:${cdp}/json/version`);
    const browser = cdpClient(ver.webSocketDebuggerUrl);
    const { targetId } = await browser.send('Target.createTarget', { url: 'about:blank' });
    let page = null;
    for (let i = 0; i < 30 && !page; i++) {
      const pages = await (await fetch(`http://127.0.0.1:${cdp}/json`)).json();
      page = pages.find((p) => p.id === targetId && p.webSocketDebuggerUrl);
      if (!page) await sleep(100);
    }
    if (!page) throw new Error('missing page target');
    const client = cdpClient(page.webSocketDebuggerUrl);
    await client.send('Page.enable');
    await client.send('Runtime.enable');
    await client.send('Emulation.setDeviceMetricsOverride', {
      width: 1440,
      height: 900,
      deviceScaleFactor: 1,
      mobile: false,
    });

    for (const [name, query] of shots) {
      const url = `http://127.0.0.1:${port}/?hud=0${query ? '&' + query : ''}`;
      await client.send('Page.navigate', { url });
      let info = null;
      for (let i = 0; i < 40; i++) {
        await sleep(250);
        const evaled = await client.send('Runtime.evaluate', {
          expression: `(() => ({ status: document.getElementById('status')?.textContent || '', errors: window.__errors || [], ready: !!(window.__scene && window.__scene.ready) }))()`,
          returnByValue: true,
        });
        info = evaled.result?.value;
        if (info?.ready || (info?.errors && info.errors.length)) break;
      }
      if (!info?.ready) {
        throw new Error(name + ' not ready ' + JSON.stringify(info));
      }
      if (info.errors?.length) {
        throw new Error(name + ' errors ' + info.errors.join('\n'));
      }
      const shot = await client.send('Page.captureScreenshot', { format: 'png' });
      const buf = Buffer.from(shot.data, 'base64');
      const artifact = `/opt/cursor/artifacts/jazz-club_${name}.png`;
      writeFileSync(artifact, buf);
      writeFileSync(resolve(root, 'shots', `${name}.png`), buf);
      console.log(name, buf.length, info.status);
    }
    client.ws.close();
    browser.ws.close();
  } finally {
    chrome.kill('SIGKILL');
    server.kill('SIGKILL');
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
