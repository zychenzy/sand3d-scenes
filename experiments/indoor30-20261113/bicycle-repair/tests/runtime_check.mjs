/**
 * Load the shop in headless Chrome and check errors, GLB loads, and seat facing.
 * Usage: node tests/runtime_check.mjs [port]
 */
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const scene = path.resolve(here, '..');
const repo = path.resolve(scene, '../../..');
const port = Number(process.argv[2] || 8777);
const debugPort = port + 100;
const url = `http://127.0.0.1:${port}/experiments/indoor30-20261113/bicycle-repair/?hud=0`;

const server = spawn('python3', ['-m', 'http.server', String(port), '--bind', '127.0.0.1'], {
  cwd: repo,
  stdio: 'ignore',
});
const chromeDir = `/tmp/chrome-bike-test-${port}`;
mkdirSync(chromeDir, { recursive: true });
const chrome = spawn('google-chrome', [
  '--headless=new',
  '--disable-gpu',
  '--no-first-run',
  `--remote-debugging-port=${debugPort}`,
  `--user-data-dir=${chromeDir}`,
  'about:blank',
], { stdio: 'ignore' });

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function waitDebug() {
  const deadline = Date.now() + 15000;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`http://127.0.0.1:${debugPort}/json/version`);
      if (res.ok) return res.json();
    } catch {
      /* chrome still booting */
    }
    await sleep(200);
  }
  throw new Error('chrome debug port did not open');
}

let seq = 0;
function rpc(ws, method, params = {}, sessionId) {
  const id = ++seq;
  return new Promise((resolve, reject) => {
    const onMsg = (ev) => {
      const data = JSON.parse(ev.data);
      if (data.id !== id) return;
      ws.removeEventListener('message', onMsg);
      if (data.error) reject(new Error(JSON.stringify(data.error)));
      else resolve(data.result);
    };
    ws.addEventListener('message', onMsg);
    const payload = { id, method, params };
    if (sessionId) payload.sessionId = sessionId;
    ws.send(JSON.stringify(payload));
  });
}

try {
  await sleep(300);
  const version = await waitDebug();
  const ws = new WebSocket(version.webSocketDebuggerUrl);
  await new Promise((res, rej) => {
    ws.addEventListener('open', res);
    ws.addEventListener('error', () => rej(new Error('cdp socket failed')));
  });
  const { targetId } = await rpc(ws, 'Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await rpc(ws, 'Target.attachToTarget', { targetId, flatten: true });
  const call = (method, params) => rpc(ws, method, params, sessionId);
  await call('Page.enable');
  await call('Runtime.enable');
  await call('Page.navigate', { url });
  let ready = false;
  let status = '';
  const deadline = Date.now() + 25000;
  while (Date.now() < deadline) {
    const result = await call('Runtime.evaluate', {
      expression: `({ ready: !!window.__ready, status: document.getElementById('status')?.textContent || '', errors: window.__errors || [] })`,
      returnByValue: true,
    });
    const value = result.result.value;
    status = value.status;
    if (value.ready) {
      ready = true;
      break;
    }
    if (value.errors && value.errors.length) {
      console.error(JSON.stringify(value));
      process.exit(1);
    }
    await sleep(250);
  }
  if (!ready) {
    console.error(JSON.stringify({ ready, status }));
    process.exit(1);
  }
  const checked = await call('Runtime.evaluate', {
    expression: `(() => {
      const scene = window.__scene.scene;
      function find(name){ let n=null; scene.traverse(o=>{ if(!n && o.name===name) n=o; }); return n; }
      const props = find('props');
      const names = props.children.map(c => c.name);
      if (find('stool_staff')) names.push('stool_staff');
      const chair = find('chair_wait_a');
      chair.updateWorldMatrix(true, true);
      let back=null, seat=null;
      chair.traverse(o=>{
        if(!o.isMesh) return;
        if(!o.geometry.boundingBox) o.geometry.computeBoundingBox();
        const c=o.geometry.boundingBox.getCenter(new o.position.constructor());
        const w=o.localToWorld(c);
        if(o.name==='back_post') back=w.x;
        if(o.name==='seat') seat=w.x;
      });
      const bike = find('bike_stand');
      bike.updateWorldMatrix(true, true);
      let minY=Infinity, maxY=-Infinity;
      bike.traverse(o=>{
        if(!o.isMesh||!o.geometry) return;
        if(!o.geometry.boundingBox) o.geometry.computeBoundingBox();
        const bb=o.geometry.boundingBox;
        for (const x of [bb.min.x, bb.max.x]) for (const y of [bb.min.y, bb.max.y]) for (const z of [bb.min.z, bb.max.z]) {
          const p=o.localToWorld(new o.position.constructor(x,y,z));
          minY=Math.min(minY,p.y); maxY=Math.max(maxY,p.y);
        }
      });
      const mode = scene.children.some(o => o.isDirectionalLight && o.castShadow);
      return {
        names,
        errors: window.__errors,
        chairFacesCounter: back < seat,
        bikeHeight: +(maxY-minY).toFixed(3),
        toonShadows: mode,
      };
    })()`,
    returnByValue: true,
  });
  const info = checked.result.value;
  const need = ['bike_stand', 'bike_parked', 'wheel_truing', 'wheel_rack_a', 'pump', 'register', 'chair_wait_a', 'stool_staff'];
  const missing = need.filter((id) => !info.names.includes(id));
  if (missing.length || info.errors.length || !info.chairFacesCounter || info.bikeHeight < 0.95 || info.bikeHeight > 1.2) {
    console.error(JSON.stringify({ missing, info }, null, 2));
    process.exit(1);
  }
  await call('Runtime.evaluate', { expression: `window.__scene.setMode('unlit')`, returnByValue: true });
  const unlit = await call('Runtime.evaluate', {
    expression: `({ mode: document.getElementById('mode').textContent, shadows: window.__scene.renderer.shadowMap.enabled, basic: (() => { let n=0,b=0; window.__scene.scene.traverse(o=>{ if(!o.isMesh) return; n++; const m=Array.isArray(o.material)?o.material[0]:o.material; if(m && m.isMeshBasicMaterial) b++; }); return {n,b}; })() })`,
    returnByValue: true,
  });
  const u = unlit.result.value;
  if (u.mode !== 'UNLIT' || u.shadows !== false || u.basic.b < u.basic.n * 0.8) {
    console.error(JSON.stringify(u));
    process.exit(1);
  }
  console.log(JSON.stringify({ ok: true, status, bikeHeight: info.bikeHeight, meshes: u.basic.n, unlitBasic: u.basic.b }));
  await rpc(ws, 'Target.closeTarget', { targetId });
  ws.close();
} finally {
  server.kill();
  chrome.kill();
}
