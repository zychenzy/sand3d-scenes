import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const repo = path.resolve(import.meta.dirname, '../../../..');
const port = 8777;
const base = `http://127.0.0.1:${port}/experiments/sprint-20261110/glass-studio/`;
const shots = [
  ['toon_default.png', `${base}?hud=0`, 'glass-studio_default.png'],
  ['toon_corner.png', `${base}?cam=corner&hud=0`, 'glass-studio_corner.png'],
  ['toon_close.png', `${base}?cam=close&hud=0`, 'glass-studio_close.png'],
  ['unlit_default.png', `${base}?mode=unlit&hud=0`, 'glass-studio_unlit.png'],
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
  '--remote-debugging-port=9222',
  '--user-data-dir=/tmp/chrome-glass-studio',
  '--allow-file-access-from-files',
  'about:blank',
], { stdio: ['ignore', 'pipe', 'pipe'] });

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function cdp() {
  let version;
  for (let i = 0; i < 40; i++) {
    try {
      version = await fetch('http://127.0.0.1:9222/json/version').then((r) => r.json());
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
  const events = [];
  ws.addEventListener('message', (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      if (msg.error) reject(new Error(JSON.stringify(msg.error)));
      else resolve(msg.result);
    } else if (msg.method) {
      events.push(msg);
    }
  });
  function send(method, params = {}, sessionId) {
    const msgId = ++id;
    const payload = { id: msgId, method, params };
    if (sessionId) payload.sessionId = sessionId;
    ws.send(JSON.stringify(payload));
    return new Promise((resolve, reject) => pending.set(msgId, { resolve, reject }));
  }
  return { ws, send, events };
}

async function shot(send, sessionId, url, filename, shotName) {
  const logs = [];
  const onConsole = (msg) => {
    if (msg.method === 'Runtime.consoleAPICalled' || msg.method === 'Runtime.exceptionThrown') logs.push(msg);
  };
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
  for (let i = 0; i < 40; i++) {
    await sleep(250);
    const result = await send('Runtime.evaluate', {
      expression: `(() => {
        const t = document.getElementById('status')?.textContent || '';
        const n = window.__scene?.meshCount || 0;
        const errs = (window.__scene?.errors || []).join(' | ');
        return JSON.stringify({ t, n, errs });
      })()`,
      returnByValue: true,
    }, sid);
    const info = JSON.parse(result.result.value);
    status = info.t;
    meshCount = info.n;
    if (status.startsWith('error')) throw new Error(`${filename}: ${status} ${info.errs}`);
    if (status.startsWith('ready') && meshCount > 50) break;
  }
  if (!status.startsWith('ready')) throw new Error(`${filename}: timed out with status "${status}" mesh ${meshCount}`);
  await sleep(400);
  const cap = await send('Page.captureScreenshot', { format: 'png' }, sid);
  const buf = Buffer.from(cap.data, 'base64');
  fs.writeFileSync(path.join(outDir, filename), buf);
  fs.writeFileSync(path.join(shotDir, shotName), buf);
  await send('Target.closeTarget', { targetId: target.targetId });
  console.log(`${filename} status="${status}" meshes=${meshCount} bytes=${buf.length}`);
  void onConsole;
  void sessionId;
  void logs;
}

try {
  const { send } = await cdp();
  await send('Target.setDiscoverTargets', { discover: true });
  for (const [shotName, url, filename] of shots) {
    await shot(send, null, url, filename, shotName);
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
