import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const sceneDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const httpPort = 8794;
const cdpPort = 9364;
const width = 1680;
const height = 1050;
const outDir = process.env.SHOT_DIR || '/opt/cursor/artifacts';
const shotsDir = resolve(sceneDir, 'shots');

const shots = [
  { name: 'boxing_default', file: 'toon_default.png', query: 'shot=1', mode: 'toon' },
  { name: 'boxing_corner', file: 'toon_corner.png', query: 'shot=1&cam=corner', mode: 'toon' },
  { name: 'boxing_detail', file: 'toon_detail.png', query: 'shot=1&cam=detail', mode: 'toon' },
  { name: 'boxing_unlit', file: 'unlit_default.png', query: 'shot=1&mode=unlit', mode: 'unlit' },
];

const names = ['ring', 'ring-canvas', 'bag_a', 'bag_b', 'bag_c', 'speed_a', 'speed_b', 'glove_rack', 'timer', 'stool_red', 'stool_blue', 'steps', 'bench_l', 'bench_r', 'wrap_shelf', 'ceiling', 'corner-pads', 'rail-apron'];

function wait(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function waitForHttp() {
  const url = `http://127.0.0.1:${httpPort}/layout.json`;
  for (let i = 0; i < 50; i++) {
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
      logs.push(
        `exception: ${msg.params.exceptionDetails?.text || ''} ${msg.params.exceptionDetails?.exception?.description || ''}`
      );
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
    } catch {
      /* chrome still booting */
    }
    await wait(150);
  }
  throw new Error('chrome devtools did not start');
}

async function shoot(send, logs, query) {
  const url = `http://127.0.0.1:${httpPort}/?${query}`;
  await send('Page.navigate', { url });
  let state = null;
  for (let i = 0; i < 80; i++) {
    await wait(150);
    const result = await send('Runtime.evaluate', {
      expression: `({ ready: !!window.__ready, error: window.__bootError || null, status: document.getElementById('status')?.textContent || '' })`,
      returnByValue: true,
    });
    state = result.result.value;
    if (state?.error) throw new Error(state.error);
    if (state?.ready) break;
  }
  if (!state?.ready) throw new Error('scene not ready: ' + JSON.stringify(state) + '\n' + logs.join('\n'));
  await wait(400);
  const probe = await send('Runtime.evaluate', {
    expression: `(() => {
      const THREE = window.__scene.THREE;
      const scene = window.__scene.scene;
      const bounds = {};
      for (const name of ${JSON.stringify(names)}) bounds[name] = window.__bounds(name);
      let toon = 0, basic = 0, nearest = 0, other = 0;
      scene.traverse((o) => {
        if (!o.isMesh || !o.material) return;
        const mats = [].concat(o.material);
        for (const m of mats) {
          if (m.isMeshToonMaterial) {
            toon++;
            if (m.gradientMap && m.gradientMap.magFilter === THREE.NearestFilter && m.gradientMap.minFilter === THREE.NearestFilter) nearest++;
          } else if (m.isMeshBasicMaterial) basic++;
          else other++;
        }
      });
      const ring = bounds.ring;
      return {
        mode: window.__scene.mode,
        toon, basic, nearest, other,
        hardShadow: window.__scene.renderer.shadowMap.type === THREE.PCFShadowMap,
        bounds,
        ringSize: ring ? [ring.max[0] - ring.min[0], ring.max[1] - ring.min[1], ring.max[2] - ring.min[2]] : null
      };
    })()`,
    returnByValue: true,
  });
  const png = await send('Page.captureScreenshot', { format: 'png' });
  return { png: png.data, probe: probe.result.value, status: state.status };
}

function overlaps(a, b, pad = 0) {
  if (!a || !b) return false;
  return a.min[0] < b.max[0] - pad && a.max[0] > b.min[0] + pad && a.min[2] < b.max[2] - pad && a.max[2] > b.min[2] + pad;
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
    '--user-data-dir=/tmp/boxing-gym-chrome',
    '--no-first-run',
    'about:blank',
  ],
  { stdio: 'ignore' }
);

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
    const { png, probe, status } = await shoot(send, logs, shot.query);
    if (probe.mode !== shot.mode) throw new Error(`${shot.name} mode ${probe.mode}`);
    if (!probe.hardShadow) throw new Error('shadow map is not PCF');
    if (probe.other) throw new Error(`${shot.name} unexpected materials ${probe.other}`);
    if (shot.mode === 'toon') {
      if (probe.toon < 40) throw new Error(`toon count ${probe.toon}`);
      if (probe.nearest !== probe.toon) throw new Error('toon gradient is not hard-stepped');
    } else if (probe.toon !== 0) {
      throw new Error(`unlit still has ${probe.toon} toon materials`);
    }
    for (const name of names) {
      if (!probe.bounds[name]) throw new Error(`missing bounds ${name}`);
    }
    const canvas = probe.bounds['ring-canvas'];
    const canvasW = canvas.max[0] - canvas.min[0];
    const canvasD = canvas.max[2] - canvas.min[2];
    if (canvasW < 5.6 || canvasW > 6.2 || canvasD < 5.6 || canvasD > 6.2) {
      throw new Error('canvas bounds ' + JSON.stringify(canvas));
    }
    const ring = probe.ringSize;
    if (!ring || ring[1] < 2.2 || ring[1] > 2.9 || ring[0] > 7.6) {
      throw new Error('ring bounds ' + JSON.stringify(ring));
    }
    const ceiling = probe.bounds.ceiling;
    const ceilW = ceiling.max[0] - ceiling.min[0];
    const ceilD = ceiling.max[2] - ceiling.min[2];
    if (ceilW < 14 || ceilD < 11.8) throw new Error('ceiling does not cover the room ' + JSON.stringify(ceiling));
    const pads = probe.bounds['corner-pads'];
    const padSpan = pads.max[0] - pads.min[0];
    if (padSpan < 4.9 || padSpan > 5.8) throw new Error('corner pads ' + JSON.stringify(pads));
    if (pads.max[1] < canvas.max[1] + 1.35 || pads.min[1] < canvas.max[1] - 0.05) {
      throw new Error('pads do not cover the rope turns ' + JSON.stringify(pads));
    }
    const rail = probe.bounds['rail-apron'];
    if (rail.min[2] > canvas.max[2] + 0.2 || rail.max[2] < canvas.max[2] - 0.02) {
      throw new Error('handrail misses the apron ' + JSON.stringify(rail));
    }
    if (rail.max[1] < canvas.max[1] + 0.8) throw new Error('handrail is short of the apron ' + JSON.stringify(rail));
    for (const id of ['bag_a', 'bag_b', 'bag_c']) {
      if (overlaps(probe.bounds[id], probe.bounds.ring, 0.05)) throw new Error(`${id} intersects the ring`);
    }
    const buf = Buffer.from(png, 'base64');
    if (buf.length < 10000) throw new Error(`${shot.name} screenshot too small`);
    const artifact = resolve(outDir, `${shot.name}.png`);
    await writeFile(artifact, buf);
    await writeFile(resolve(shotsDir, shot.file), buf);
    report.push({ shot: shot.name, status, bytes: buf.length, mode: probe.mode, toon: probe.toon, basic: probe.basic, ring });
    console.log(`wrote ${artifact} (${buf.length} bytes) mode=${probe.mode} toon=${probe.toon} basic=${probe.basic}`);
  }
  await writeFile('/tmp/boxing-gym-render-report.json', JSON.stringify({ report, logs }, null, 2));
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
