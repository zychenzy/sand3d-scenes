import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const sceneDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const httpPort = 8871;
const cdpPort = 9371;
const width = 1440;
const height = 900;
const outDir = process.env.SHOT_DIR || '/opt/cursor/artifacts';
const shotsDir = resolve(sceneDir, 'shots');

const shots = [
  { name: 'pet-grooming_toon_default', file: 'toon_default.png', query: 'shot=1' },
  { name: 'pet-grooming_toon_corner', file: 'toon_corner.png', query: 'shot=1&cam=corner' },
  { name: 'pet-grooming_toon_close', file: 'toon_close.png', query: 'shot=1&cam=close' },
  { name: 'pet-grooming_unlit_default', file: 'unlit_default.png', query: 'shot=1&mode=unlit' },
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
  ws.addEventListener('message', (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.id && pending.has(msg.id)) {
      pending.get(msg.id)(msg);
      pending.delete(msg.id);
    } else if (msg.method === 'Runtime.consoleAPICalled') {
      const text = (msg.params.args || []).map((a) => a.value ?? a.description ?? '').join(' ');
      logs.push(`${msg.params.type}: ${text}`);
    } else if (msg.method === 'Runtime.exceptionThrown') {
      logs.push(`exception: ${msg.params.exceptionDetails?.text || ''} ${msg.params.exceptionDetails?.exception?.description || ''}`);
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
  return { send, logs };
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

async function shoot(send, logs, query) {
  await send('Page.navigate', { url: `http://127.0.0.1:${httpPort}/?${query}` });
  let state = null;
  for (let i = 0; i < 80; i++) {
    await wait(150);
    const result = await send('Runtime.evaluate', {
      expression: `({
        ready: !!window.__ready,
        errors: window.__errors || [],
        loaded: window.__loaded || [],
        status: document.getElementById('status')?.textContent || '',
        mode: document.getElementById('mode')?.textContent || ''
      })`,
      returnByValue: true,
    });
    state = result.result.value;
    if (state?.errors?.length) throw new Error(state.errors.join(' | '));
    if (state?.ready) break;
  }
  if (!state?.ready) throw new Error(`scene not ready: ${JSON.stringify(state)}\n${logs.join('\n')}`);
  await wait(500);
  const probe = await send('Runtime.evaluate', {
    expression: `(() => {
      const stats = window.__stats ? window.__stats() : null;
      const names = ['table-a-top','table-b-top','tub-rim','counter-top','kennel-bank','dryer','chair_groom_a','chair_guest_l','roof-deck'];
      const bounds = {};
      for (const name of names) bounds[name] = window.__bounds ? window.__bounds(name) : null;
      return { stats, bounds };
    })()`,
    returnByValue: true,
  });
  const png = await send('Page.captureScreenshot', { format: 'png' });
  return { png: png.data, probe: probe.result.value, status: state.status, loaded: state.loaded, mode: state.mode };
}

function boxHeight(box) {
  if (!box) return null;
  return box.max[1] - box.min[1];
}

const server = spawn('python3', ['-m', 'http.server', String(httpPort), '--bind', '127.0.0.1'], {
  cwd: sceneDir,
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
  '--user-data-dir=/tmp/pet-grooming-chrome',
  '--no-first-run',
  'about:blank',
], { stdio: 'ignore' });

try {
  await waitForHttp();
  const ws = await connectCdp();
  const { send, logs } = cdp(ws);
  await send('Page.enable');
  await send('Runtime.enable');
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
    const { png, probe, status, loaded, mode } = await shoot(send, logs, shot.query);
    const buf = Buffer.from(png, 'base64');
    if (buf.length < 5000) throw new Error(`${shot.name} screenshot too small`);
    await writeFile(resolve(outDir, `${shot.name}.png`), buf);
    await writeFile(resolve(shotsDir, shot.file), buf);
    report.push({ shot: shot.name, status, mode, bytes: buf.length, loaded, probe });
    console.log(`wrote ${shot.file} (${buf.length} bytes) mode=${mode} loaded=${loaded.length}`);
  }
  const first = report[0];
  if (!first.loaded || first.loaded.length !== 5) throw new Error(`expected 5 GLBs, got ${first.loaded}`);
  const stats = first.probe.stats;
  if (!stats || stats.maxTex > 512) throw new Error(`texture too large: ${JSON.stringify(stats)}`);
  if (!stats.meshes || stats.meshes < 40) throw new Error(`scene too empty: ${stats.meshes} meshes`);
  const b = first.probe.bounds;
  const tableH = b['table-a-top'] && b['table-a-top'].max[1];
  if (!(tableH > 0.84 && tableH < 1.0)) throw new Error(`table A top ${tableH}`);
  const tubH = b['tub-rim'] && b['tub-rim'].max[1];
  if (!(tubH > 0.86 && tubH < 1.15)) throw new Error(`tub rim ${tubH}`);
  const counterH = b['counter-top'] && b['counter-top'].max[1];
  if (!(counterH > 0.98 && counterH < 1.15)) throw new Error(`counter ${counterH}`);
  const chairH = boxHeight(b.chair_groom_a);
  if (!(chairH > 0.55 && chairH < 0.85)) throw new Error(`groomer stool height ${chairH}`);
  const guestH = boxHeight(b.chair_guest_l);
  if (!(guestH > 0.8 && guestH < 1.05)) throw new Error(`waiting chair height ${guestH}`);
  const roof = b['roof-deck'] && b['roof-deck'].max[1];
  if (!(roof > 3.05 && roof < 3.4)) throw new Error(`roof deck ${roof}`);
  if (report[3].mode !== 'UNLIT') throw new Error(`unlit shot stayed in ${report[3].mode}`);
  await writeFile('/tmp/pet-grooming-render-report.json', JSON.stringify({ report, logs }, null, 2));
  const bad = logs.filter((line) => /error|exception/i.test(line) && !/favicon/i.test(line));
  if (bad.length) {
    console.error(bad.join('\n'));
    process.exitCode = 1;
  }
  ws.close();
} finally {
  server.kill('SIGTERM');
  chrome.kill('SIGTERM');
}
