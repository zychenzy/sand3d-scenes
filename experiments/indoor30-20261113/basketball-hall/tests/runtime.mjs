import { spawn } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const scene = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const repo = resolve(scene, '../../..');
const httpPort = 8813;
const cdpPort = 9338;

function wait(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function waitFor(url) {
  for (let i = 0; i < 50; i++) {
    try {
      const res = await fetch(url);
      if (res.ok) return;
    } catch { /* booting */ }
    await wait(150);
  }
  throw new Error('did not open ' + url);
}

function cdp(ws) {
  let id = 0;
  const pending = new Map();
  ws.addEventListener('message', (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.id && pending.has(msg.id)) {
      pending.get(msg.id)(msg);
      pending.delete(msg.id);
    }
  });
  function send(method, params = {}) {
    const msgId = ++id;
    return new Promise((resolvePromise, reject) => {
      const timer = setTimeout(() => reject(new Error('cdp timeout ' + method)), 20000);
      pending.set(msgId, (msg) => {
        clearTimeout(timer);
        if (msg.error) reject(new Error(JSON.stringify(msg.error)));
        else resolvePromise(msg.result);
      });
      ws.send(JSON.stringify({ id: msgId, method, params }));
    });
  }
  return { send };
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
  '--window-size=1280,800',
  `--remote-debugging-port=${cdpPort}`,
  '--user-data-dir=/tmp/basketball-hall-runtime',
  '--no-first-run',
  'about:blank',
], { stdio: 'ignore' });

try {
  await waitFor(`http://127.0.0.1:${httpPort}/experiments/indoor30-20261113/basketball-hall/layout.json`);
  await waitFor(`http://127.0.0.1:${cdpPort}/json/version`);
  const list = await fetch(`http://127.0.0.1:${cdpPort}/json/list`).then((r) => r.json());
  const page = list.find((t) => t.type === 'page');
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((res, rej) => {
    ws.addEventListener('open', res);
    ws.addEventListener('error', rej);
  });
  const { send } = cdp(ws);
  await send('Page.enable');
  await send('Runtime.enable');
  const url = `http://127.0.0.1:${httpPort}/experiments/indoor30-20261113/basketball-hall/?shot=1`;
  await send('Page.navigate', { url });
  let state = null;
  for (let i = 0; i < 80; i++) {
    await wait(150);
    const result = await send('Runtime.evaluate', {
      expression: `({ ready: !!window.__ready, error: window.__bootError || null, status: document.getElementById('status')?.textContent || '', mode: window.__mode || null })`,
      returnByValue: true,
    });
    state = result.result.value;
    if (state?.error) throw new Error(state.error);
    if (state?.ready) break;
  }
  if (!state?.ready) throw new Error('scene not ready: ' + JSON.stringify(state));
  if (state.mode !== 'toon') throw new Error('default mode is ' + state.mode);

  const probe = await send('Runtime.evaluate', {
    expression: `(() => {
      const scene = window.__scene.scene;
      let toon = 0, basic = 0, stepped = 0;
      scene.traverse((o) => {
        if (!o.isMesh || !o.material || o.userData.keepMaterial) return;
        const mats = Array.isArray(o.material) ? o.material : [o.material];
        for (const m of mats) {
          if (m.type === 'MeshToonMaterial') toon += 1;
          if (m.type === 'MeshBasicMaterial') basic += 1;
          if (m.gradientMap && m.gradientMap.image && m.gradientMap.image.width === 4) stepped += 1;
        }
      });
      window.__scene.setMode('unlit');
      let unlitBasic = 0, unlitToon = 0;
      scene.traverse((o) => {
        if (!o.isMesh || !o.material || o.userData.keepMaterial) return;
        const mats = Array.isArray(o.material) ? o.material : [o.material];
        for (const m of mats) {
          if (m.type === 'MeshBasicMaterial') unlitBasic += 1;
          if (m.type === 'MeshToonMaterial') unlitToon += 1;
        }
      });
      window.__scene.setMode('toon');
      return {
        toon, basic, stepped,
        unlitBasic, unlitToon,
        mode: window.__mode,
        ring: window.__bounds('ring_near'),
        bench: window.__bounds('bench_home'),
        cart: window.__bounds('ball_cart'),
        far: window.__bounds('ring_far'),
        tie: window.__bounds('tie_bench'),
        rack: window.__bounds('ball_rack'),
        pad: window.__bounds('wall_pad'),
        board: window.__bounds('coach_board'),
      };
    })()`,
    returnByValue: true,
  });
  const info = probe.result.value;
  if (!info) throw new Error('probe failed ' + JSON.stringify(probe));
  if (info.toon < 20) throw new Error('expected toon meshes, got ' + JSON.stringify(info));
  if (info.stepped < 20) throw new Error('toon gradient is not the 4-step map');
  if (info.unlitToon !== 0) throw new Error('unlit left toon materials in place');
  if (info.unlitBasic < 20) throw new Error('unlit did not switch to MeshBasicMaterial');
  if (info.mode !== 'toon') throw new Error('setMode did not restore toon');
  const ringY = (info.ring.min[1] + info.ring.max[1]) / 2;
  if (Math.abs(ringY - 3.05) > 0.02) throw new Error('near rim height ' + ringY);
  const farY = (info.far.min[1] + info.far.max[1]) / 2;
  if (Math.abs(farY - 3.05) > 0.02) throw new Error('far rim height ' + farY);
  if (info.bench.min[0] < 9.5) throw new Error('home bench enters the runoff ' + JSON.stringify(info.bench));
  if (info.cart.min[0] < 9.5) throw new Error('cart enters the runoff ' + JSON.stringify(info.cart));
  if (!info.tie || info.tie.max[0] > -9.5) throw new Error('tie bench missing or inside the runoff ' + JSON.stringify(info.tie));
  if (info.tie.max[2] - info.tie.min[2] < 2.4) throw new Error('tie bench is still a short seat ' + JSON.stringify(info.tie));
  if (!info.rack || info.rack.max[0] > -9.5) throw new Error('ball rack missing or inside the runoff ' + JSON.stringify(info.rack));
  if (!info.pad || info.pad.max[0] > -9.5) throw new Error('wall pad missing or inside the runoff ' + JSON.stringify(info.pad));
  if (info.board) throw new Error('classroom board is still in the scene');
  console.log(JSON.stringify({ status: state.status, ringY, benchMinX: info.bench.min[0], cartMinX: info.cart.min[0], tieMaxX: info.tie.max[0], toon: info.toon, unlitBasic: info.unlitBasic }, null, 2));
  ws.close();
} finally {
  server.kill('SIGTERM');
  chrome.kill('SIGTERM');
}
