import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const repo = path.resolve(root, '../../..');
const port = 8766;
const base = `http://127.0.0.1:${port}/experiments/indoor30-20261113/perfumery/`;
const shots = [
  ['toon_default.png', `${base}?shot=1`],
  ['toon_corner.png', `${base}?cam=corner&shot=1`],
  ['toon_close.png', `${base}?cam=close&shot=1`],
  ['toon_detail.png', `${base}?cam=detail&shot=1`],
  ['unlit_default.png', `${base}?mode=unlit&shot=1`],
];
const outDir = '/opt/cursor/artifacts';
const shotDir = path.join(root, 'shots');
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
  '--enable-webgl',
  '--ignore-gpu-blocklist',
  '--hide-scrollbars',
  '--window-size=1440,900',
  '--remote-debugging-port=9228',
  '--user-data-dir=/tmp/chrome-perfumery',
  'about:blank',
], { stdio: ['ignore', 'pipe', 'pipe'] });

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function cdp() {
  let version;
  for (let i = 0; i < 50; i++) {
    try {
      version = await fetch('http://127.0.0.1:9228/json/version').then((r) => r.json());
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
  const { sessionId } = await send('Target.attachToTarget', { targetId: target.targetId, flatten: true });
  await send('Page.enable', {}, sessionId);
  await send('Runtime.enable', {}, sessionId);
  await send('Emulation.setDeviceMetricsOverride', {
    width: 1440, height: 900, deviceScaleFactor: 1, mobile: false,
  }, sessionId);
  await send('Page.navigate', { url }, sessionId);
  let info = {};
  for (let i = 0; i < 50; i++) {
    await sleep(250);
    const result = await send('Runtime.evaluate', {
      expression: `(() => JSON.stringify({
        status: document.getElementById('status')?.textContent || '',
        errors: window.__errors || [],
        ready: !!window.__ready,
        meshes: window.__scene?.meshCount || 0,
        organ: window.__counts?.organ || 0,
        blotter: window.__counts?.blotter || 0,
        mode: document.getElementById('mode')?.textContent || ''
      }))()`,
      returnByValue: true,
    }, sessionId);
    info = JSON.parse(result.result.value);
    if (info.errors.length) throw new Error(`${filename}: ${info.errors.join(' | ')}`);
    if (info.ready && info.status.startsWith('ready') && info.meshes > 200) break;
  }
  if (!info.ready || !String(info.status).startsWith('ready')) {
    throw new Error(`${filename}: not ready ${JSON.stringify(info)}`);
  }
  if (info.meshes < 400) throw new Error(`${filename}: sparse mesh count ${info.meshes}`);
  if (info.organ < 120) throw new Error(`${filename}: organ ${info.organ}`);
  if (info.blotter < 12) throw new Error(`${filename}: blotters ${info.blotter}`);
  if (filename.startsWith('unlit') && info.mode !== 'UNLIT') throw new Error(`${filename}: mode ${info.mode}`);
  if (!filename.startsWith('unlit') && info.mode !== 'TOON') throw new Error(`${filename}: mode ${info.mode}`);
  await sleep(500);
  const cap = await send('Page.captureScreenshot', { format: 'png' }, sessionId);
  const buf = Buffer.from(cap.data, 'base64');
  if (buf.length < 20000) throw new Error(`${filename}: screenshot too small ${buf.length}`);
  fs.writeFileSync(path.join(outDir, `perfumery_${filename}`), buf);
  fs.writeFileSync(path.join(shotDir, filename), buf);
  await send('Target.closeTarget', { targetId: target.targetId });
  console.log(`${filename} meshes=${info.meshes} organ=${info.organ} blotter=${info.blotter} mode=${info.mode} bytes=${buf.length}`);
}

try {
  const { send } = await cdp();
  for (const [name, url] of shots) await shot(send, url, name);
  console.log('render ok');
} catch (err) {
  console.error(err);
  process.exitCode = 1;
} finally {
  chrome.kill('SIGKILL');
  server.kill('SIGKILL');
  setTimeout(() => process.exit(process.exitCode || 0), 200);
}
