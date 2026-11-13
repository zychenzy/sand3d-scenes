import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const sceneDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const repo = resolve(sceneDir, '../../..');
const httpPort = 8793;
const cdpPort = 9347;
const width = 1680;
const height = 1050;
const shotsDir = resolve(sceneDir, 'shots');
const page = `http://127.0.0.1:${httpPort}/experiments/indoor30-20261113/post-office/`;

const shots = [
  { file: 'toon_default.png', query: 'shot=1' },
  { file: 'toon_corner.png', query: 'shot=1&cam=corner' },
  { file: 'toon_detail.png', query: 'shot=1&cam=detail' },
  { file: 'unlit_default.png', query: 'shot=1&mode=unlit' },
];

function wait(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function waitForHttp() {
  const url = `http://127.0.0.1:${httpPort}/experiments/indoor30-20261113/post-office/layout.json`;
  for (let i = 0; i < 40; i++) {
    try {
      const res = await fetch(url);
      if (res.ok) return;
    } catch {
      /* booting */
    }
    await wait(150);
  }
  throw new Error('http server did not start');
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
    } else if (msg.method === 'Runtime.consoleAPICalled') {
      const text = (msg.params.args || []).map((a) => a.value ?? a.description ?? '').join(' ');
      logs.push(`${msg.params.type}: ${text}`);
    } else if (msg.method === 'Runtime.exceptionThrown') {
      logs.push(`exception: ${msg.params.exceptionDetails?.exception?.description || msg.params.exceptionDetails?.text || ''}`);
    }
  });
  function send(method, params = {}) {
    const msgId = ++id;
    return new Promise((resolvePromise, reject) => {
      const timer = setTimeout(() => reject(new Error(`cdp timeout ${method}`)), 25000);
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

async function connectCdp() {
  for (let i = 0; i < 50; i++) {
    try {
      const list = await fetch(`http://127.0.0.1:${cdpPort}/json/list`).then((r) => r.json());
      const pageTarget = list.find((t) => t.type === 'page');
      if (pageTarget?.webSocketDebuggerUrl) {
        const ws = new WebSocket(pageTarget.webSocketDebuggerUrl);
        await new Promise((res, rej) => {
          ws.addEventListener('open', res);
          ws.addEventListener('error', rej);
        });
        return ws;
      }
    } catch {
      /* chrome booting */
    }
    await wait(150);
  }
  throw new Error('chrome devtools did not start');
}

const probe = `(() => {
  const scene = window.__scene && window.__scene.scene;
  let toon = 0, basic = 0, other = 0;
  if (scene) scene.traverse((o) => {
    if (!o.isMesh) return;
    const mats = [].concat(o.material);
    for (const m of mats) {
      if (!m) continue;
      if (m.type === 'MeshToonMaterial') toon++;
      else if (m.type === 'MeshBasicMaterial') basic++;
      else other++;
    }
  });
  const grad = window.__toonGradient;
  return {
    ready: !!window.__ready,
    error: window.__sceneError || null,
    errors: window.__errors || [],
    status: document.getElementById('status')?.textContent || '',
    shading: window.__shading || null,
    loaded: window.__loaded || 0,
    toon, basic, other,
    gradW: grad?.image?.width || grad?.image?.data?.length / 4 || 0,
    gradFilter: grad?.magFilter || 0,
    names: ['counter','po-boxes','pigeonholes','parcel-scale','queue','canvas-trolley','wire-trolley','staff-door'].map((n) => ({
      n, ok: !!(scene && scene.getObjectByName(n))
    })),
    clerk: window.__bounds ? window.__bounds('clerk_b') : null,
  };
})()`;

async function shoot(send, logs, query) {
  await send('Page.navigate', { url: `${page}?${query}` });
  let state = null;
  for (let i = 0; i < 80; i++) {
    await wait(150);
    const result = await send('Runtime.evaluate', { expression: probe, returnByValue: true });
    state = result.result.value;
    if (state?.error) throw new Error(state.error + '\n' + logs.join('\n'));
    if (state?.errors?.length) throw new Error(state.errors.join('\n') + '\n' + logs.join('\n'));
    if (state?.ready) break;
  }
  if (!state?.ready) throw new Error('scene not ready: ' + JSON.stringify(state) + '\n' + logs.join('\n'));
  await wait(400);
  const png = await send('Page.captureScreenshot', { format: 'png' });
  return { png: png.data, state };
}

const server = spawn('python3', ['-m', 'http.server', String(httpPort), '--bind', '127.0.0.1'], {
  cwd: repo,
  stdio: 'ignore',
});
const chrome = spawn('google-chrome', [
  '--headless=new',
  '--no-sandbox',
  '--disable-dev-shm-usage',
  '--use-gl=angle',
  '--use-angle=swiftshader',
  '--enable-webgl',
  '--ignore-gpu-blocklist',
  '--hide-scrollbars',
  `--window-size=${width},${height}`,
  `--remote-debugging-port=${cdpPort}`,
  '--user-data-dir=/tmp/post-office-chrome',
  '--no-first-run',
  'about:blank',
], { stdio: 'ignore' });

try {
  await waitForHttp();
  const ws = await connectCdp();
  const client = cdp(ws);
  await client.send('Runtime.enable');
  await client.send('Page.enable');
  await mkdir(shotsDir, { recursive: true });
  const report = [];
  for (const shot of shots) {
    const { png, state } = await shoot(client.send, client.logs, shot.query);
    const buf = Buffer.from(png, 'base64');
    if (buf.length < 20_000) throw new Error(`${shot.file} too small ${buf.length}`);
    await writeFile(resolve(shotsDir, shot.file), buf);
    const unlit = shot.query.includes('unlit');
    if (state.loaded !== 7) throw new Error(`loaded ${state.loaded}`);
    if (state.other !== 0) throw new Error(`other materials ${state.other}`);
    if (unlit) {
      if (state.shading !== 'unlit') throw new Error(state.shading);
      if (state.basic < 50 || state.toon !== 0) throw new Error(`unlit mix toon=${state.toon} basic=${state.basic}`);
    } else {
      if (state.shading !== 'toon') throw new Error(state.shading);
      if (state.toon < 50 || state.basic !== 0) throw new Error(`toon mix toon=${state.toon} basic=${state.basic}`);
      if (state.gradW !== 4) throw new Error(`gradient ${state.gradW}`);
    }
    const missing = state.names.filter((n) => !n.ok).map((n) => n.n);
    if (missing.length) throw new Error('missing ' + missing.join(','));
    report.push({ file: shot.file, bytes: buf.length, shading: state.shading, toon: state.toon, basic: state.basic });
    console.log(shot.file, buf.length, state.shading, 'toon', state.toon, 'basic', state.basic);
  }
  await writeFile(resolve(shotsDir, 'report.json'), JSON.stringify(report, null, 2));
  ws.close();
} finally {
  server.kill();
  chrome.kill();
}
