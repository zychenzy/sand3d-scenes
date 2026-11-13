import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const repo = path.resolve(import.meta.dirname, '../../../..');
const port = 8793;
const base = `http://127.0.0.1:${port}/experiments/indoor30-20261113/stained-glass/`;
const shots = [
  ['toon_default.png', `${base}?hud=0`],
  ['toon_corner.png', `${base}?cam=corner&hud=0`],
  ['toon_detail.png', `${base}?cam=detail&hud=0`],
  ['unlit_default.png', `${base}?mode=unlit&hud=0`],
];
const outDir = '/opt/cursor/artifacts';
const shotDir = path.join(import.meta.dirname, '..', 'shots');
fs.mkdirSync(outDir, { recursive: true });
fs.mkdirSync(shotDir, { recursive: true });

const server = spawn('python3', ['-m', 'http.server', String(port), '--bind', '127.0.0.1'], {
  cwd: repo,
  stdio: ['ignore', 'pipe', 'pipe'],
});
const chrome = spawn('google-chrome', [
  '--headless=new',
  '--no-sandbox',
  '--disable-gpu',
  '--use-angle=swiftshader',
  '--hide-scrollbars',
  '--window-size=1440,900',
  '--remote-debugging-port=9234',
  '--user-data-dir=/tmp/chrome-stained-glass',
  'about:blank',
], { stdio: ['ignore', 'pipe', 'pipe'] });

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function cdp() {
  let version;
  for (let i = 0; i < 40; i++) {
    try {
      version = await fetch('http://127.0.0.1:9234/json/version').then((r) => r.json());
      break;
    } catch {
      await sleep(150);
    }
  }
  if (!version) throw new Error('chrome debug port did not open');
  const ws = new WebSocket(version.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    ws.addEventListener('open', resolve);
    ws.addEventListener('error', reject);
  });
  let id = 0;
  const pending = new Map();
  ws.addEventListener('message', (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      if (msg.error) reject(new Error(JSON.stringify(msg.error)));
      else resolve(msg.result);
    }
  });
  function send(method, params = {}, sessionId) {
    const msgId = ++id;
    const payload = { id: msgId, method, params };
    if (sessionId) payload.sessionId = sessionId;
    ws.send(JSON.stringify(payload));
    return new Promise((resolve, reject) => pending.set(msgId, { resolve, reject }));
  }
  return { send };
}

async function shot(send, url, filename) {
  const target = await send('Target.createTarget', { url: 'about:blank' });
  const { sessionId: sid } = await send('Target.attachToTarget', { targetId: target.targetId, flatten: true });
  await send('Page.enable', {}, sid);
  await send('Runtime.enable', {}, sid);
  await send('Emulation.setDeviceMetricsOverride', {
    width: 1440,
    height: 900,
    deviceScaleFactor: 1,
    mobile: false,
  }, sid);
  await send('Page.navigate', { url }, sid);
  let status = '';
  let meshCount = 0;
  let errs = '';
  for (let i = 0; i < 50; i++) {
    await sleep(250);
    const result = await send('Runtime.evaluate', {
      expression: `(() => {
        const t = document.getElementById('status')?.textContent || '';
        const n = window.__scene?.meshCount || 0;
        const e = (window.__scene?.errors || []).join(' | ');
        return JSON.stringify({ t, n, e });
      })()`,
      returnByValue: true,
    }, sid);
    const info = JSON.parse(result.result.value);
    status = info.t;
    meshCount = info.n;
    errs = info.e;
    if (status.startsWith('error')) throw new Error(`${filename}: ${status} ${errs}`);
    if (status.startsWith('ready') && meshCount > 80) break;
  }
  if (!status.startsWith('ready')) throw new Error(`${filename}: timed out status="${status}" mesh=${meshCount} ${errs}`);
  await sleep(500);
  const cap = await send('Page.captureScreenshot', { format: 'png' }, sid);
  const buf = Buffer.from(cap.data, 'base64');
  fs.writeFileSync(path.join(shotDir, filename), buf);
  fs.writeFileSync(path.join(outDir, filename), buf);
  await send('Target.closeTarget', { targetId: target.targetId });
  console.log(`${filename} status="${status}" meshes=${meshCount} bytes=${buf.length}`);
}

try {
  const { send } = await cdp();
  for (const [filename, url] of shots) {
    await shot(send, url, filename);
  }
  console.log('render ok');
} catch (err) {
  console.error(err);
  process.exitCode = 1;
} finally {
  chrome.kill('SIGKILL');
  server.kill('SIGKILL');
  setTimeout(() => process.exit(process.exitCode || 0), 200);
}
