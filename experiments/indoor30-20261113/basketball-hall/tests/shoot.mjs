import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const scene = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const repo = resolve(scene, '../../..');
const httpPort = 8814;
const cdpPort = 9340;
const width = 1680;
const height = 1050;
const shotsDir = resolve(scene, 'shots');
const outDir = process.env.SHOT_DIR || '/opt/cursor/artifacts';

const shots = [
  { name: 'basketball_default', file: 'toon_default.png', query: 'shot=1' },
  { name: 'basketball_corner', file: 'toon_corner.png', query: 'shot=1&cam=corner' },
  { name: 'basketball_detail', file: 'toon_detail.png', query: 'shot=1&cam=detail' },
  { name: 'basketball_unlit', file: 'unlit_default.png', query: 'shot=1&mode=unlit' },
];

function wait(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function waitFor(url) {
  for (let i = 0; i < 50; i++) {
    try {
      const res = await fetch(url);
      if (res.ok) return;
    } catch { /* booting */ }
    await wait(150);
  }
  throw new Error('did not open ' + url);
}

function cdp(ws) {
  let id = 0;
  const pending = new Map();
  const logs = [];
  ws.addEventListener('message', (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.id && pending.has(msg.id)) {
      pending.get(msg.id)(msg);
      pending.delete(msg.id);
    } else if (msg.method === 'Runtime.exceptionThrown') {
      logs.push(msg.params.exceptionDetails?.exception?.description || msg.params.exceptionDetails?.text || 'exception');
    }
  });
  function send(method, params = {}) {
    const msgId = ++id;
    return new Promise((resolvePromise, reject) => {
      const timer = setTimeout(() => reject(new Error('cdp timeout ' + method)), 25000);
      pending.set(msgId, (msg) => {
        clearTimeout(timer);
        if (msg.error) reject(new Error(JSON.stringify(msg.error)));
        else resolvePromise(msg.result);
      });
      ws.send(JSON.stringify({ id: msgId, method, params }));
    });
  }
  return { send, logs };
}

const server = spawn('python3', ['-m', 'http.server', String(httpPort), '--bind', '127.0.0.1'], {
  cwd: repo, stdio: 'ignore',
});
const chrome = spawn('google-chrome', [
  '--headless=new', '--no-sandbox', '--disable-dev-shm-usage',
  '--use-gl=angle', '--use-angle=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist',
  '--hide-scrollbars', `--window-size=${width},${height}`,
  `--remote-debugging-port=${cdpPort}`,
  '--user-data-dir=/tmp/basketball-hall-shots',
  '--no-first-run', 'about:blank',
], { stdio: 'ignore' });

try {
  await waitFor(`http://127.0.0.1:${httpPort}/experiments/indoor30-20261113/basketball-hall/layout.json`);
  await waitFor(`http://127.0.0.1:${cdpPort}/json/version`);
  const list = await fetch(`http://127.0.0.1:${cdpPort}/json/list`).then((r) => r.json());
  const page = list.find((t) => t.type === 'page');
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((res, rej) => {
    ws.addEventListener('open', res);
    ws.addEventListener('error', rej);
  });
  const { send, logs } = cdp(ws);
  await send('Page.enable');
  await send('Runtime.enable');
  await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: false });
  await mkdir(shotsDir, { recursive: true });
  await mkdir(outDir, { recursive: true });
  for (const shot of shots) {
    const url = `http://127.0.0.1:${httpPort}/experiments/indoor30-20261113/basketball-hall/?${shot.query}`;
    await send('Page.navigate', { url });
    let state = null;
    for (let i = 0; i < 80; i++) {
      await wait(150);
      const result = await send('Runtime.evaluate', {
        expression: `({ ready: !!window.__ready, error: window.__bootError || null, status: document.getElementById('status')?.textContent || '' })`,
        returnByValue: true,
      });
      state = result.result.value;
      if (state?.error) throw new Error(state.error);
      if (state?.ready) break;
    }
    if (!state?.ready) throw new Error('scene not ready: ' + JSON.stringify(state) + '\n' + logs.join('\n'));
    await wait(400);
    const png = await send('Page.captureScreenshot', { format: 'png' });
    const buf = Buffer.from(png.data, 'base64');
    await writeFile(resolve(shotsDir, shot.file), buf);
    await writeFile(resolve(outDir, `${shot.name}.png`), buf);
    console.log(`wrote ${shot.file} (${buf.length} bytes) ${state.status}`);
  }
  if (logs.length) console.error(logs.join('\n'));
  ws.close();
} finally {
  server.kill('SIGTERM');
  chrome.kill('SIGTERM');
}
