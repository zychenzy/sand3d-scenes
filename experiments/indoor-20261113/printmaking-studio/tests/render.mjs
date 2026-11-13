import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const repo = path.resolve(import.meta.dirname, '../../../..');
const port = 8873;
const base = `http://127.0.0.1:${port}/experiments/indoor-20261113/printmaking-studio/`;
const shots = [
  ['toon_default.png', `${base}?hud=0`, 'printmaking-studio_toon_default.png', 'TOON'],
  ['toon_corner.png', `${base}?cam=corner&hud=0`, 'printmaking-studio_toon_corner.png', 'TOON'],
  ['toon_close.png', `${base}?cam=close&hud=0`, 'printmaking-studio_toon_close.png', 'TOON'],
  ['unlit_default.png', `${base}?mode=unlit&hud=0`, 'printmaking-studio_unlit_default.png', 'UNLIT'],
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
  '--remote-debugging-port=9373',
  '--user-data-dir=/tmp/chrome-printmaking-studio',
  'about:blank',
], { stdio: ['ignore', 'pipe', 'pipe'] });

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function cdp() {
  let version;
  for (let i = 0; i < 50; i++) {
    try {
      version = await fetch('http://127.0.0.1:9373/json/version').then((r) => r.json());
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
  const listeners = [];
  ws.addEventListener('message', (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      if (msg.error) reject(new Error(JSON.stringify(msg.error)));
      else resolve(msg.result);
    } else if (msg.method) {
      for (const fn of listeners) fn(msg);
    }
  });
  function send(method, params = {}, sessionId) {
    const msgId = ++id;
    const payload = { id: msgId, method, params };
    if (sessionId) payload.sessionId = sessionId;
    ws.send(JSON.stringify(payload));
    return new Promise((resolve, reject) => pending.set(msgId, { resolve, reject }));
  }
  return { send, listen: (fn) => listeners.push(fn) };
}

function writePng(file, buf) {
  for (let i = 0; i < 4; i++) {
    try {
      fs.writeFileSync(file, buf);
      return;
    } catch (err) {
      if (err.code !== 'EIO' || i === 3) throw err;
    }
  }
}

const probe = `(() => {
  const mats = { toon: 0, basic: 0, other: 0 };
  const scene = window.__scene && window.__scene.scene;
  if (scene) {
    scene.traverse((o) => {
      if (!o.isMesh) return;
      const list = Array.isArray(o.material) ? o.material : [o.material];
      for (const m of list) {
        if (!m) continue;
        if (m.type === 'MeshToonMaterial') mats.toon += 1;
        else if (m.type === 'MeshBasicMaterial') mats.basic += 1;
        else mats.other += 1;
      }
    });
  }
  return JSON.stringify({
    status: document.getElementById('status')?.textContent || '',
    mode: document.getElementById('mode')?.textContent || '',
    meshes: window.__scene?.meshCount || 0,
    errors: window.__errors || [],
    mats,
  });
})()`;

async function shot(send, listen, url, shotName, artifactName, expectMode) {
  const failed = [];
  const exceptions = [];
  const logs = [];
  const target = await send('Target.createTarget', { url: 'about:blank' });
  const { sessionId: sid } = await send('Target.attachToTarget', { targetId: target.targetId, flatten: true });
  listen((msg) => {
    if (msg.sessionId !== sid) return;
    if (msg.method === 'Network.loadingFailed') failed.push(msg.params?.errorText || 'load failed');
    if (msg.method === 'Network.responseReceived' && msg.params?.response?.status >= 400) {
      const url = msg.params.response.url || '';
      if (!url.endsWith('/favicon.ico')) failed.push(`${msg.params.response.status} ${url}`);
    }
    if (msg.method === 'Runtime.exceptionThrown') {
      const d = msg.params?.exceptionDetails;
      exceptions.push(d?.exception?.description || d?.text || 'exception');
    }
    if (msg.method === 'Runtime.consoleAPICalled' && msg.params?.type === 'error') {
      logs.push(JSON.stringify(msg.params.args?.map((a) => a.value || a.description) || []));
    }
  });
  await send('Page.enable', {}, sid);
  await send('Runtime.enable', {}, sid);
  await send('Network.enable', {}, sid);
  await send('Network.setCacheDisabled', { cacheDisabled: true }, sid);
  await send('Emulation.setDeviceMetricsOverride', {
    width: 1440, height: 900, deviceScaleFactor: 1, mobile: false,
  }, sid);
  await send('Page.navigate', { url }, sid);
  let info = null;
  for (let i = 0; i < 50; i++) {
    await sleep(250);
    const result = await send('Runtime.evaluate', { expression: probe, returnByValue: true }, sid);
    info = JSON.parse(result.result.value);
    if (info.status.startsWith('error') || info.status.startsWith('asset failed')) {
      throw new Error(`${shotName}: ${info.status} ${info.errors.join(' | ')}`);
    }
    if (info.status.startsWith('ready') && info.meshes > 80) break;
  }
  if (!info || !info.status.startsWith('ready')) {
    throw new Error(`${shotName}: timed out status="${info && info.status}" meshes=${info && info.meshes}`);
  }
  await sleep(500);
  const again = JSON.parse((await send('Runtime.evaluate', { expression: probe, returnByValue: true }, sid)).result.value);
  if (again.mode !== expectMode) throw new Error(`${shotName}: mode ${again.mode} expected ${expectMode}`);
  if (expectMode === 'TOON' && again.mats.toon < 40) throw new Error(`${shotName}: too few toon materials ${JSON.stringify(again.mats)}`);
  if (expectMode === 'UNLIT' && again.mats.toon !== 0) throw new Error(`${shotName}: unlit still has toon ${JSON.stringify(again.mats)}`);
  if (again.mats.other) throw new Error(`${shotName}: unexpected materials ${JSON.stringify(again.mats)}`);
  if (again.errors.length) throw new Error(`${shotName}: ${again.errors.join(' | ')}`);
  const cap = await send('Page.captureScreenshot', { format: 'png' }, sid);
  const buf = Buffer.from(cap.data, 'base64');
  writePng(path.join(shotDir, shotName), buf);
  writePng(path.join(outDir, artifactName), buf);
  await send('Target.closeTarget', { targetId: target.targetId });
  console.log(`${shotName} mode=${again.mode} meshes=${again.meshes} mats=${JSON.stringify(again.mats)} bytes=${buf.length} netFail=${failed.length} exceptions=${exceptions.length} consoleErr=${logs.length}`);
  if (exceptions.length) throw new Error(`${shotName} exceptions: ${exceptions.join(' | ')}`);
  if (failed.length) throw new Error(`${shotName} network: ${failed.slice(0, 6).join(' | ')}`);
  if (logs.length) throw new Error(`${shotName} console: ${logs.join(' | ')}`);
}

try {
  const { send, listen } = await cdp();
  for (const [shotName, url, artifactName, expectMode] of shots) {
    await shot(send, listen, url, shotName, artifactName, expectMode);
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
