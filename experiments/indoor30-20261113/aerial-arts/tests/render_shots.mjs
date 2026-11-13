import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const sceneDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const httpPort = 8807;
const cdpPort = 9411;
const width = 1680;
const height = 1050;
const outDir = process.env.SHOT_DIR || '/opt/cursor/artifacts';
const shotsDir = resolve(sceneDir, 'shots');

const shots = [
  { name: 'aerial-arts_toon_default', file: 'toon_default.png', query: 'hud=0', unlit: false },
  { name: 'aerial-arts_toon_corner', file: 'toon_corner.png', query: 'hud=0&cam=corner', unlit: false },
  { name: 'aerial-arts_toon_close', file: 'toon_close.png', query: 'hud=0&cam=close', unlit: false },
  { name: 'aerial-arts_unlit_default', file: 'unlit_default.png', query: 'hud=0&mode=unlit', unlit: true },
];

function wait(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function waitForHttp() {
  const url = `http://127.0.0.1:${httpPort}/layout.json`;
  for (let i = 0; i < 50; i++) {
    try {
      const res = await fetch(url);
      if (res.ok) return;
    } catch { /* booting */ }
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
      const page = list.find((t) => t.type === 'page');
      if (page?.webSocketDebuggerUrl) {
        const ws = new WebSocket(page.webSocketDebuggerUrl);
        await new Promise((res, rej) => {
          ws.addEventListener('open', res);
          ws.addEventListener('error', rej);
        });
        return ws;
      }
    } catch { /* chrome booting */ }
    await wait(150);
  }
  throw new Error('chrome devtools did not start');
}

const probe = `(() => {
  const scene = window.__scene.scene;
  let toon = 0, basic = 0, nearest = 0, other = 0;
  scene.traverse((obj) => {
    if (!obj.isMesh) return;
    const mats = [].concat(obj.material);
    for (const m of mats) {
      if (!m) continue;
      if (m.type === 'MeshToonMaterial') {
        toon += 1;
        const img = m.gradientMap && m.gradientMap.image;
        if (m.gradientMap && m.gradientMap.magFilter === 1003 && img && img.width === 4) nearest += 1;
      } else if (m.type === 'MeshBasicMaterial') basic += 1;
      else other += 1;
    }
  });
  return {
    toon, basic, nearest, other,
    rig: window.__rigCheck ? window.__rigCheck() : ['no rig check'],
    mode: document.getElementById('mode')?.textContent || '',
    bounds: {
      bench: window.__bounds('wait_bench'),
      table: window.__bounds('warmup_table'),
      chair: window.__bounds('warmup_chair'),
      shelf: window.__bounds('grip_shelf'),
      lamp: window.__bounds('desk_lamp'),
      pend: window.__bounds('pendant_warm_a'),
      pot: window.__bounds('pot_wait'),
    },
  };
})()`;

function assertShot(info, unlit) {
  const problems = [];
  if (info.rig?.length) problems.push(`rig: ${info.rig.join('; ')}`);
  if (info.other) problems.push(`unexpected materials: ${info.other}`);
  if (unlit) {
    if (info.toon !== 0) problems.push(`unlit still has ${info.toon} toon materials`);
    if (info.basic < 40) problems.push('unlit produced too few basic materials');
    if (info.mode !== 'UNLIT') problems.push(`mode label ${info.mode}`);
  } else if (info.toon < 40 || info.nearest !== info.toon) {
    problems.push(`toon ${info.toon} nearest ${info.nearest}`);
  }
  const b = info.bounds || {};
  const height = (box) => (box ? box.max[1] - box.min[1] : null);
  if (!b.bench || height(b.bench) < 0.4 || height(b.bench) > 0.55) problems.push(`bench scale ${height(b.bench)}`);
  if (!b.table || height(b.table) < 0.68 || height(b.table) > 0.82) problems.push(`table scale ${height(b.table)}`);
  if (!b.chair || height(b.chair) < 0.75 || height(b.chair) > 1.05) problems.push(`chair scale ${height(b.chair)}`);
  if (!b.shelf || b.shelf.min[0] < -8.98 || b.shelf.max[0] > -8.35) problems.push(`shelf not on the west wall ${JSON.stringify(b.shelf)}`);
  if (!b.pend || b.pend.min[1] < 2.4) problems.push('pendant is not hanging from the soffit');
  if (!b.lamp || b.lamp.min[1] < 0.7) problems.push('desk lamp is not on the table');
  if (b.chair && b.table && b.chair.min[0] < b.table.max[0] - 0.05) problems.push('chair intersects the table');
  return problems;
}

async function shoot(send, query, logs) {
  await send('Page.navigate', { url: `http://127.0.0.1:${httpPort}/?${query}` });
  let state = null;
  for (let i = 0; i < 80; i++) {
    await wait(150);
    const result = await send('Runtime.evaluate', {
      expression: `({ ready: !!window.__ready, error: window.__bootError || null })`,
      returnByValue: true,
    });
    state = result.result.value;
    if (state?.error) throw new Error(state.error);
    if (state?.ready) break;
  }
  if (!state?.ready) {
    const extra = await send('Runtime.evaluate', {
      expression: `document.getElementById('status')?.textContent + ' | ' + location.href`,
      returnByValue: true,
    });
    throw new Error(`scene not ready ${JSON.stringify(state)} status=${extra.result?.value}\n${(logs || []).join('\n')}`);
  }
  await wait(700);
  const probed = await send('Runtime.evaluate', { expression: probe, returnByValue: true });
  const png = await send('Page.captureScreenshot', { format: 'png' });
  return { png: png.data, info: probed.result.value };
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
  '--user-data-dir=/tmp/aerial-chrome-profile',
  '--no-first-run',
  'about:blank',
], { stdio: 'ignore' });

try {
  await waitForHttp();
  const ws = await connectCdp();
  const { send, logs } = cdp(ws);
  await send('Page.enable');
  await send('Runtime.enable');
  await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: false });
  await mkdir(outDir, { recursive: true });
  await mkdir(shotsDir, { recursive: true });
  const report = [];
  for (const shot of shots) {
    const { png, info } = await shoot(send, shot.query, logs);
    const problems = assertShot(info, shot.unlit);
    const buf = Buffer.from(png, 'base64');
    await writeFile(resolve(outDir, `${shot.name}.png`), buf);
    await writeFile(resolve(shotsDir, shot.file), buf);
    report.push({ shot: shot.name, bytes: buf.length, info, problems });
    console.log(`${shot.file} ${buf.length} bytes ${problems.length ? problems.join(' | ') : 'ok'}`);
    if (problems.length) {
      console.error(problems.join('\n'));
      process.exitCode = 1;
    }
  }
  await writeFile('/tmp/aerial-render-report.json', JSON.stringify({ report, logs }, null, 2));
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
