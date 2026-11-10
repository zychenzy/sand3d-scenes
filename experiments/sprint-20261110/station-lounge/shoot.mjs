import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';

const debugPort = Number(process.env.CHROME_PORT || 9333);
const base = process.env.SCENE_URL || 'http://127.0.0.1:8794/';
const outDir = process.env.SHOT_DIR || '/opt/cursor/artifacts';
const shots = [
  ['station-lounge_toon_default', `${base}?hud=0`],
  ['station-lounge_toon_corner', `${base}?hud=0&cam=corner`],
  ['station-lounge_toon_close', `${base}?hud=0&cam=close`],
  ['station-lounge_unlit_default', `${base}?hud=0&mode=unlit`],
];

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitFor(url, tries = 40) {
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(url);
      if (res.ok) return;
    } catch {
      /* chrome still booting */
    }
    await sleep(150);
  }
  throw new Error(`no response from ${url}`);
}

function send(ws, method, params = {}) {
  const id = send.next++;
  ws.send(JSON.stringify({ id, method, params }));
  return new Promise((resolve, reject) => {
    send.pending.set(id, { resolve, reject });
  });
}
send.next = 1;
send.pending = new Map();

async function shot(ws, url) {
  const errors = [];
  const onMessage = (event) => {
    const msg = JSON.parse(event.data);
    if (msg.id && send.pending.has(msg.id)) {
      const pending = send.pending.get(msg.id);
      send.pending.delete(msg.id);
      if (msg.error) pending.reject(new Error(JSON.stringify(msg.error)));
      else pending.resolve(msg.result || {});
      return;
    }
    if (msg.method === 'Runtime.exceptionThrown') {
      const d = msg.params.exceptionDetails;
      errors.push(d.exception?.description || d.text || 'exception');
    }
    if (msg.method === 'Runtime.consoleAPICalled' && msg.params.type === 'error') {
      errors.push(msg.params.args.map((a) => a.value ?? a.description ?? '').join(' '));
    }
  };
  ws.addEventListener('message', onMessage);
  await send(ws, 'Runtime.enable');
  await send(ws, 'Page.enable');
  await send(ws, 'Page.navigate', { url });
  let ready = false;
  let pageErrors = [];
  for (let i = 0; i < 80; i++) {
    const result = await send(ws, 'Runtime.evaluate', {
      expression: '({ ready: !!window.__ready, errors: window.__errors || [], status: (document.getElementById("status")||{}).textContent || "" })',
      returnByValue: true,
    });
    const value = result.result?.value;
    if (value?.ready) {
      ready = true;
      pageErrors = value.errors || [];
      break;
    }
    await sleep(200);
  }
  if (!ready) throw new Error(`scene not ready for ${url}`);
  await send(ws, 'Runtime.evaluate', {
    expression: 'new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve(true))))',
    awaitPromise: true,
  });
  const frame = await send(ws, 'Page.captureScreenshot', { format: 'png' });
  ws.removeEventListener('message', onMessage);
  return { png: Buffer.from(frame.data, 'base64'), errors: [...errors, ...pageErrors] };
}

async function main() {
  mkdirSync(outDir, { recursive: true });
  const chrome = spawn('/usr/local/bin/google-chrome', [
    '--headless=new',
    '--no-sandbox',
    '--disable-dev-shm-usage',
    '--disable-gpu',
    '--use-gl=angle',
    '--use-angle=swiftshader',
    '--enable-unsafe-swiftshader',
    `--remote-debugging-port=${debugPort}`,
    '--window-size=1600,1000',
    '--hide-scrollbars',
    '--user-data-dir=/tmp/chrome-station-lounge',
    'about:blank',
  ], { stdio: 'ignore' });
  try {
    await waitFor(`http://127.0.0.1:${debugPort}/json/version`);
    const list = await (await fetch(`http://127.0.0.1:${debugPort}/json/list`)).json();
    const page = list.find((t) => t.type === 'page');
    if (!page) throw new Error('no chrome page target');
    const ws = new WebSocket(page.webSocketDebuggerUrl);
    await new Promise((resolve, reject) => {
      ws.addEventListener('open', resolve);
      ws.addEventListener('error', reject);
    });
    ws.addEventListener('message', (event) => {
      const msg = JSON.parse(event.data);
      if (msg.id && send.pending.has(msg.id)) {
        const pending = send.pending.get(msg.id);
        send.pending.delete(msg.id);
        if (msg.error) pending.reject(new Error(JSON.stringify(msg.error)));
        else pending.resolve(msg.result || {});
      }
    });
    await send(ws, 'Emulation.setDeviceMetricsOverride', {
      width: 1600,
      height: 1000,
      deviceScaleFactor: 1,
      mobile: false,
    });
    const report = [];
    for (const [name, url] of shots) {
      const { png, errors } = await shot(ws, url);
      const file = `${outDir}/${name}.png`;
      writeFileSync(file, png);
      report.push({ name, file, bytes: png.length, errors });
      console.log(`${name} ${png.length} bytes errors=${errors.length}`);
      for (const err of errors) console.log('  ERR', err);
    }
    writeFileSync(`${outDir}/station-lounge_shoot.json`, JSON.stringify(report, null, 2));
    ws.close();
  } finally {
    chrome.kill('SIGKILL');
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
