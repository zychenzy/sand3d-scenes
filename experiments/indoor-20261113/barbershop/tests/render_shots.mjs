import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const sceneDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const httpPort = 8863;
const cdpPort = 9363;
const width = 1680;
const height = 1050;
const outDir = process.env.SHOT_DIR || '/opt/cursor/artifacts';
const shotsDir = resolve(sceneDir, 'shots');

const shots = [
  { name: 'barbershop_toon_default', file: 'toon_default.png', query: 'shot=1', expect: 'MeshToonMaterial' },
  { name: 'barbershop_toon_corner', file: 'toon_corner.png', query: 'shot=1&cam=corner', expect: 'MeshToonMaterial' },
  { name: 'barbershop_toon_close', file: 'toon_close.png', query: 'shot=1&cam=close', expect: 'MeshToonMaterial' },
  { name: 'barbershop_unlit_default', file: 'unlit_default.png', query: 'shot=1&mode=unlit', expect: 'MeshBasicMaterial' },
];

function wait(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function waitForHttp() {
  const url = `http://127.0.0.1:${httpPort}/layout.json`;
  for (let i = 0; i < 40; i++) {
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
    } else if (msg.method === 'Runtime.consoleAPICalled') {
      const text = (msg.params.args || []).map((a) => a.value ?? a.description ?? '').join(' ');
      logs.push(`${msg.params.type}: ${text}`);
    } else if (msg.method === 'Runtime.exceptionThrown') {
      logs.push(
        `exception: ${msg.params.exceptionDetails?.text || ''} ${msg.params.exceptionDetails?.exception?.description || ''}`
      );
    } else if (msg.method === 'Network.loadingFailed') {
      failed.push(`${msg.params.type || ''} ${msg.params.errorText || ''} ${msg.params.requestId || ''}`);
    } else if (msg.method === 'Network.responseReceived') {
      const status = msg.params.response?.status;
      const url = msg.params.response?.url || '';
      if (status >= 400) failed.push(`${status} ${url}`);
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
  return { send, logs, failed };
}

async function connectCdp() {
  for (let i = 0; i < 40; i++) {
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

async function shoot(send, query) {
  const url = `http://127.0.0.1:${httpPort}/?${query}`;
  await send('Page.navigate', { url });
  let state = null;
  for (let i = 0; i < 80; i++) {
    await wait(150);
    const result = await send('Runtime.evaluate', {
      expression: `({ ready: !!window.__ready, error: (window.__errors && window.__errors[0]) || null, status: document.getElementById('status')?.textContent || '' })`,
      returnByValue: true,
    });
    state = result.result.value;
    if (state?.error) throw new Error(state.error);
    if (state?.ready) break;
  }
  if (!state?.ready) throw new Error('scene not ready: ' + JSON.stringify(state));
  await wait(500);
  const probe = await send('Runtime.evaluate', {
    expression: `(() => {
      const types = new Set();
      let meshes = 0;
      window.__scene.scene.traverse((o) => {
        if (!o.isMesh || !o.material) return;
        meshes += 1;
        const mats = Array.isArray(o.material) ? o.material : [o.material];
        mats.forEach((m) => types.add(m.type));
      });
      const resources = performance.getEntriesByType('resource').map((r) => ({
        name: r.name.replace(location.origin, ''),
        type: r.initiatorType,
      }));
      const names = ['station-a', 'station-b', 'station-c', 'wash-chair', 'basin', 'pole', 'sofa', 'coffee', 'bench'];
      const bounds = {};
      for (const name of names) bounds[name] = window.__bounds(name);
      return {
        mode: window.__shadingMode,
        label: document.getElementById('mode')?.textContent,
        hud: document.getElementById('hud')?.style.display || '',
        types: [...types],
        meshes,
        resources,
        bounds,
        errors: window.__errors || [],
      };
    })()`,
    returnByValue: true,
  });
  const png = await send('Page.captureScreenshot', { format: 'png' });
  return { png: png.data, probe: probe.result.value, status: state.status };
}

const server = spawn('python3', ['-m', 'http.server', String(httpPort), '--bind', '127.0.0.1'], {
  cwd: sceneDir,
  stdio: 'ignore',
});
const chrome = spawn(
  'google-chrome',
  [
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
    '--user-data-dir=/tmp/barbershop-chrome-profile',
    '--no-first-run',
    'about:blank',
  ],
  { stdio: 'ignore' }
);

try {
  await waitForHttp();
  const ws = await connectCdp();
  const { send, logs, failed } = cdp(ws);
  await send('Page.enable');
  await send('Runtime.enable');
  await send('Network.enable');
  await send('Emulation.setDeviceMetricsOverride', {
    width,
    height,
    deviceScaleFactor: 1,
    mobile: false,
  });
  await mkdir(outDir, { recursive: true });
  await mkdir(shotsDir, { recursive: true });
  const report = [];
  for (const shot of shots) {
    const { png, probe, status } = await shoot(send, shot.query);
    if (probe.errors?.length) throw new Error(probe.errors.join(' | '));
    if (!probe.types.includes(shot.expect) || probe.types.length !== 1) {
      throw new Error(`${shot.file} materials ${probe.types.join(',')} expected only ${shot.expect}`);
    }
    if (shot.query.includes('unlit') && probe.mode !== 'unlit') throw new Error('unlit mode did not stick');
    if (!shot.query.includes('unlit') && probe.mode !== 'toon') throw new Error('toon is not the default');
    if (probe.hud !== 'none') throw new Error('HUD still visible');
    const external = (probe.resources || []).filter((r) => /^https?:/i.test(r.name) && !r.name.includes('127.0.0.1'));
    if (external.length) throw new Error('external resources ' + JSON.stringify(external));
    const buf = Buffer.from(png, 'base64');
    if (buf.length < 20000) throw new Error(`${shot.file} looks empty (${buf.length} bytes)`);
    const artifact = resolve(outDir, `${shot.name}.png`);
    await writeFile(artifact, buf);
    await writeFile(resolve(shotsDir, shot.file), buf);
    report.push({ shot: shot.name, status, bytes: buf.length, mode: probe.mode, types: probe.types, meshes: probe.meshes, bounds: probe.bounds });
    console.log(`wrote ${artifact} (${buf.length} bytes, ${probe.meshes} meshes, ${probe.mode})`);
  }
  const badNet = failed.filter((line) => !/favicon/i.test(line));
  const badLog = logs.filter((line) => /error|exception/i.test(line) && !/favicon/i.test(line));
  await writeFile('/tmp/barbershop-render-report.json', JSON.stringify({ report, logs, failed }, null, 2));
  if (badNet.length || badLog.length) {
    console.error(badNet.concat(badLog).join('\n'));
    process.exitCode = 1;
  }
  ws.close();
} finally {
  server.kill('SIGTERM');
  chrome.kill('SIGTERM');
}
