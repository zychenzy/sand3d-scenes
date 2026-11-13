import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const sceneDir = resolve(dirname(fileURLToPath(import.meta.url)));
const repoRoot = resolve(sceneDir, '../../..');
const httpPort = Number(process.env.HTTP_PORT || 8797);
const cdpPort = Number(process.env.CDP_PORT || 9347);
const width = 1600;
const height = 1000;
const shotsDir = resolve(sceneDir, 'shots');
const artifactDir = process.env.SHOT_DIR || '/opt/cursor/artifacts';

const shots = [
  { file: 'toon_default.png', query: 'shot=1' },
  { file: 'toon_corner.png', query: 'shot=1&cam=corner' },
  { file: 'toon_close.png', query: 'shot=1&cam=close' },
  { file: 'unlit_default.png', query: 'shot=1&mode=unlit' },
];

function wait(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function waitForHttp() {
  const url = `http://127.0.0.1:${httpPort}/experiments/indoor-20261113/bowling-alley/layout.json`;
  for (let i = 0; i < 50; i += 1) {
    try {
      const res = await fetch(url);
      if (res.ok) return;
    } catch {
      /* server still booting */
    }
    await wait(150);
  }
  throw new Error('http server did not start');
}

function cdp(ws) {
  let id = 0;
  const pending = new Map();
  const logs = [];
  const failed = [];
  ws.addEventListener('message', (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.id && pending.has(msg.id)) {
      pending.get(msg.id)(msg);
      pending.delete(msg.id);
      return;
    }
    if (msg.method === 'Runtime.consoleAPICalled') {
      const text = (msg.params.args || []).map((a) => a.value ?? a.description ?? '').join(' ');
      if (msg.params.type === 'error') logs.push(`console.error: ${text}`);
    } else if (msg.method === 'Runtime.exceptionThrown') {
      logs.push(`exception: ${msg.params.exceptionDetails?.exception?.description || msg.params.exceptionDetails?.text || ''}`);
    } else if (msg.method === 'Network.loadingFailed') {
      failed.push(`${msg.params.errorText} ${msg.params.type || ''}`);
    }
  });
  function send(method, params = {}) {
    const msgId = ++id;
    return new Promise((resolvePromise, reject) => {
      const timer = setTimeout(() => reject(new Error(`cdp timeout ${method}`)), 20000);
      pending.set(msgId, (msg) => {
        clearTimeout(timer);
        if (msg.error) reject(new Error(JSON.stringify(msg.error)));
        else resolvePromise(msg.result);
      });
      ws.send(JSON.stringify({ id: msgId, method, params }));
    });
  }
  return { send, logs, failed };
}

async function connectCdp() {
  for (let i = 0; i < 50; i += 1) {
    try {
      const list = await fetch(`http://127.0.0.1:${cdpPort}/json/list`).then((r) => r.json());
      const page = list.find((t) => t.type === 'page');
      if (page?.webSocketDebuggerUrl) {
        const ws = new WebSocket(page.webSocketDebuggerUrl);
        await new Promise((res, rej) => {
          ws.addEventListener('open', res);
          ws.addEventListener('error', rej);
        });
        return ws;
      }
    } catch {
      /* chrome still booting */
    }
    await wait(150);
  }
  throw new Error('chrome devtools did not start');
}

const server = spawn('python3', ['-m', 'http.server', String(httpPort), '--bind', '127.0.0.1'], {
  cwd: repoRoot,
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
  '--user-data-dir=/tmp/northlane-chrome',
  '--no-first-run',
  'about:blank',
], { stdio: 'ignore' });

try {
  await waitForHttp();
  const ws = await connectCdp();
  const { send, logs, failed } = cdp(ws);
  await send('Runtime.enable');
  await send('Page.enable');
  await send('Network.enable');
  await mkdir(shotsDir, { recursive: true });
  await mkdir(artifactDir, { recursive: true });
  const report = [];
  for (const shot of shots) {
    const url = `http://127.0.0.1:${httpPort}/experiments/indoor-20261113/bowling-alley/?${shot.query}`;
    logs.length = 0;
    failed.length = 0;
    await send('Page.navigate', { url });
    let state = null;
    for (let i = 0; i < 80; i += 1) {
      await wait(200);
      const result = await send('Runtime.evaluate', {
        expression: `({ ready: !!window.__ready, errors: window.__errors || [], status: document.getElementById('status')?.textContent || '' })`,
        returnByValue: true,
      });
      state = result.result.value;
      if (state?.errors?.length) break;
      if (state?.ready) break;
    }
    if (!state?.ready) throw new Error(`${shot.file} not ready ${JSON.stringify(state)}\n${logs.join('\n')}`);
    if (state.errors?.length) throw new Error(`${shot.file} errors ${state.errors.join(' | ')}`);
    await wait(400);
    const audit = await send('Runtime.evaluate', {
      expression: `(() => {
        const scene = window.__scene.scene;
        const names = ['lane_1','lane_2','return_1','masking','seat_1','shoe_counter','pin_2_1','pin_2_7'];
        const out = {};
        for (const name of names) {
          const node = scene.getObjectByName(name);
          if (!node) { out[name] = null; continue; }
          const box = new window.__scene.THREE.Box3().setFromObject(node);
          out[name] = { min: box.min.toArray(), max: box.max.toArray() };
        }
        return { found: out, mode: document.getElementById('mode')?.textContent || '' };
      })()`,
      returnByValue: true,
    });
    const png = await send('Page.captureScreenshot', { format: 'png' });
    const buf = Buffer.from(png.data, 'base64');
    await writeFile(resolve(shotsDir, shot.file), buf);
    await writeFile(resolve(artifactDir, shot.file), buf);
    const problems = [...logs, ...failed];
    report.push({ file: shot.file, status: state.status, mode: audit.result.value.mode, missing: Object.entries(audit.result.value.found).filter(([, v]) => !v).map(([k]) => k), problems });
    if (problems.length) throw new Error(`${shot.file} console/network\n${problems.join('\n')}`);
  }
  console.log(JSON.stringify(report, null, 2));
} finally {
  server.kill();
  chrome.kill();
}
