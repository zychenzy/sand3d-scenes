/**
 * Loads the range in headless Chrome against a local static server.
 * Checks ready text, console errors, failed asset responses, face alignment,
 * and that unlit really swaps MeshToonMaterial for MeshBasicMaterial.
 *
 * Usage (server already running at the repo root):
 *   node test/browser.mjs http://127.0.0.1:8796/experiments/indoor30-20261113/archery-range/
 */
import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const base = (process.argv[2] || 'http://127.0.0.1:8796/experiments/indoor30-20261113/archery-range/').replace(/\/?$/, '/');
const shotDir = fileURLToPath(new URL('../shots/', import.meta.url));

const probe = `
(() => {
  const status = document.getElementById('status')?.textContent || '';
  const mode = document.getElementById('mode')?.textContent || '';
  const scene = window.__scene;
  if (!scene) return { status, mode, ready: false };
  let meshes = 0;
  const types = new Set();
  scene.scene.traverse((o) => {
    if (!o.isMesh) return;
    meshes++;
    const mats = Array.isArray(o.material) ? o.material : [o.material];
    for (const m of mats) if (m) types.add(m.type);
  });
  function worldBox(root) {
    root.updateWorldMatrix(true, true);
    const min = [Infinity, Infinity, Infinity];
    const max = [-Infinity, -Infinity, -Infinity];
    let n = 0;
    root.traverse((o) => {
      const pos = o.geometry?.attributes?.position;
      if (!o.isMesh || !pos) return;
      const e = o.matrixWorld.elements;
      for (let i = 0; i < pos.count; i += 4) {
        const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
        const wx = e[0] * x + e[4] * y + e[8] * z + e[12];
        const wy = e[1] * x + e[5] * y + e[9] * z + e[13];
        const wz = e[2] * x + e[6] * y + e[10] * z + e[14];
        if (wx < min[0]) min[0] = wx; if (wy < min[1]) min[1] = wy; if (wz < min[2]) min[2] = wz;
        if (wx > max[0]) max[0] = wx; if (wy > max[1]) max[1] = wy; if (wz > max[2]) max[2] = wz;
        n++;
      }
    });
    return { min, max, n };
  }
  const butt = scene.scene.getObjectByName('butt_3');
  let white = null;
  let gold = null;
  butt?.traverse((o) => {
    if (o.name === 'ring_1300_0') white = worldBox(o);
    if (o.name === 'ring_1300_5') gold = worldBox(o);
  });
  const names = ['butt_1','butt_2','butt_3','butt_4','ground_1','bow_walnut','hip_1','bench_l','score_table','score_chair_w'];
  const present = names.filter((id) => scene.scene.getObjectByName(id));
  return { status, mode, ready: status.startsWith('ready'), meshes, types: [...types], white, gold, present };
})()
`;

class Cdp {
  constructor(wsUrl) {
    this.ws = new WebSocket(wsUrl);
    this.next = 1;
    this.pending = new Map();
    this.events = [];
    this.ready = new Promise((resolve, reject) => {
      this.ws.addEventListener('open', resolve);
      this.ws.addEventListener('error', () => reject(new Error('cdp socket failed')));
    });
    this.ws.addEventListener('message', (ev) => {
      const msg = JSON.parse(ev.data);
      if (msg.id && this.pending.has(msg.id)) {
        const { resolve, reject } = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        if (msg.error) reject(new Error(msg.error.message));
        else resolve(msg.result);
      } else if (msg.method) {
        this.events.push(msg);
      }
    });
  }
  async send(method, params = {}) {
    await this.ready;
    const id = this.next++;
    const result = new Promise((resolve, reject) => this.pending.set(id, { resolve, reject }));
    this.ws.send(JSON.stringify({ id, method, params }));
    return result;
  }
  close() { this.ws.close(); }
}

async function newTab(url) {
  const created = await fetch(`http://127.0.0.1:9222/json/new?${encodeURIComponent(url)}`, { method: 'PUT' }).then((r) => r.json());
  const cdp = new Cdp(created.webSocketDebuggerUrl);
  await cdp.send('Page.enable');
  await cdp.send('Runtime.enable');
  await cdp.send('Network.enable');
  await cdp.send('Log.enable');
  await cdp.send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 720, deviceScaleFactor: 1, mobile: false });
  return { cdp, id: created.id };
}

function problems(cdp) {
  const errors = [];
  const failed = [];
  for (const ev of cdp.events) {
    if (ev.method === 'Runtime.exceptionThrown') {
      errors.push(ev.params.exceptionDetails?.exception?.description || ev.params.exceptionDetails?.text || 'exception');
    }
    if (ev.method === 'Runtime.consoleAPICalled' && ev.params.type === 'error') {
      const text = (ev.params.args || []).map((a) => a.value || a.description || '').join(' ');
      if (!/favicon/i.test(text)) errors.push(text || 'console error');
    }
    if (ev.method === 'Network.loadingFailed') {
      failed.push(`${ev.params.errorText} ${ev.params.type || ''}`);
    }
    if (ev.method === 'Network.responseReceived' && ev.params.response.status >= 400) {
      failed.push(`${ev.params.response.status} ${ev.params.response.url}`);
    }
    if (ev.method === 'Log.entryAdded' && ev.params.entry.level === 'error') {
      const t = ev.params.entry.text || '';
      if (!/favicon/i.test(t)) errors.push(t);
    }
  }
  return { errors, failed };
}

async function waitReady(cdp) {
  const start = Date.now();
  let last = null;
  while (Date.now() - start < 25000) {
    const value = await cdp.send('Runtime.evaluate', { expression: probe, returnByValue: true });
    last = value.result?.value;
    if (last?.ready) return last;
    if (last?.status?.startsWith('error')) throw new Error(last.status);
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error('timed out waiting for ready: ' + JSON.stringify(last));
}

async function shoot(name, query) {
  const { cdp, id } = await newTab(base + query);
  try {
    const info = await waitReady(cdp);
    await new Promise((r) => setTimeout(r, 400));
    const { errors, failed } = problems(cdp);
    const shot = await cdp.send('Page.captureScreenshot', { format: 'png' });
    writeFileSync(path.join(shotDir, name), Buffer.from(shot.data, 'base64'));
    return { name, info, errors, failed };
  } finally {
    cdp.close();
    await fetch(`http://127.0.0.1:9222/json/close/${id}`);
  }
}

const jobs = [
  ['toon_default.png', '?hud=0'],
  ['toon_corner.png', '?hud=0&cam=corner'],
  ['toon_close.png', '?hud=0&cam=close'],
  ['unlit_default.png', '?hud=0&mode=unlit'],
];

const results = [];
for (const [name, query] of jobs) {
  results.push(await shoot(name, query));
  console.log(name, results.at(-1).info.status, results.at(-1).info.mode, 'meshes', results.at(-1).info.meshes);
}

const fail = [];
for (const r of results) {
  if (!r.info.ready) fail.push(`${r.name} not ready`);
  if (r.errors.length) fail.push(`${r.name} errors: ${r.errors.slice(0, 4).join(' | ')}`);
  if (r.failed.length) fail.push(`${r.name} assets: ${r.failed.slice(0, 6).join(' | ')}`);
  if (r.info.present.length < 10) fail.push(`${r.name} missing props ${r.info.present.join(',')}`);
  if (r.info.meshes < 80) fail.push(`${r.name} too few meshes ${r.info.meshes}`);
}
const toon = results[0].info;
const unlit = results[3].info;
if (toon.mode !== 'TOON') fail.push('default mode is ' + toon.mode);
if (!toon.types.includes('MeshToonMaterial')) fail.push('toon pass has no MeshToonMaterial');
if (unlit.mode !== 'UNLIT') fail.push('unlit mode is ' + unlit.mode);
if (unlit.types.includes('MeshToonMaterial')) fail.push('unlit pass still has MeshToonMaterial ' + unlit.types.join(','));
if (!unlit.types.includes('MeshBasicMaterial')) fail.push('unlit pass has no MeshBasicMaterial');
const face = toon.white?.max?.[2];
const goldY = toon.gold ? (toon.gold.min[1] + toon.gold.max[1]) / 2 : null;
console.log('white face z', face, 'gold centre y', goldY);
if (face == null || Math.abs(face - 1.2) > 0.02) fail.push(`white face z ${face} is not 1.20`);
if (goldY == null || Math.abs(goldY - 1.3) > 0.02) fail.push(`gold centre y ${goldY} is not 1.30`);

if (fail.length) {
  console.error(fail.join('\n'));
  process.exit(1);
}
console.log('browser ok');
