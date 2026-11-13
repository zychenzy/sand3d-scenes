/**
 * Headless screenshots. Serves nothing; point it at an already running scene.
 *   node capture.mjs http://127.0.0.1:8796/experiments/indoor30-20261113/fencing-salle
 */
import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync, readFileSync } from 'node:fs';

const BASE = (process.argv[2] || 'http://127.0.0.1:8796/experiments/indoor30-20261113/fencing-salle').replace(/\/$/, '');
const PORT = 9336;
const OUT_DIRS = [
  '/opt/cursor/artifacts',
  new URL('./shots', import.meta.url).pathname,
];
const VIEWS = [
  ['toon_default', `${BASE}/?hud=0`, 'toon'],
  ['toon_corner', `${BASE}/?cam=corner&hud=0`, 'toon'],
  ['toon_close', `${BASE}/?cam=close&hud=0`, 'toon'],
  ['unlit_default', `${BASE}/?mode=unlit&hud=0`, 'unlit'],
];

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

const chrome = spawn('google-chrome', [
  '--headless=new',
  '--no-sandbox',
  '--disable-dev-shm-usage',
  '--disable-gpu',
  '--use-gl=angle',
  '--use-angle=swiftshader',
  '--remote-debugging-port=' + PORT,
  '--user-data-dir=/tmp/chrome-fencing-salle',
  '--window-size=1440,900',
  '--hide-scrollbars',
  'about:blank',
], { stdio: 'ignore' });

class Cdp {
  constructor(url) {
    this.ws = new WebSocket(url);
    this.next = 1;
    this.wait = new Map();
    this.ready = new Promise((res, rej) => {
      this.ws.addEventListener('open', res);
      this.ws.addEventListener('error', rej);
    });
    this.ws.addEventListener('message', (ev) => {
      const msg = JSON.parse(ev.data);
      if (msg.id && this.wait.has(msg.id)) {
        const { resolve, reject } = this.wait.get(msg.id);
        this.wait.delete(msg.id);
        if (msg.error) reject(new Error(JSON.stringify(msg.error)));
        else resolve(msg.result);
      }
    });
  }
  async send(method, params = {}) {
    await this.ready;
    const id = this.next++;
    this.ws.send(JSON.stringify({ id, method, params }));
    return new Promise((resolve, reject) => this.wait.set(id, { resolve, reject }));
  }
}

async function connect() {
  for (let i = 0; i < 40; i += 1) {
    try {
      const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
      const page = list.find((t) => t.type === 'page');
      if (page?.webSocketDebuggerUrl) return new Cdp(page.webSocketDebuggerUrl);
    } catch { /* chrome still booting */ }
    await sleep(200);
  }
  throw new Error('chrome devtools did not open');
}

const INSPECT = `(() => {
  const s = window.__scene;
  if (!s) return { ok: false, reason: 'no scene' };
  let meshes = 0;
  let toon = 0;
  let basic = 0;
  let kept = 0;
  let bad = 0;
  s.scene.updateMatrixWorld(true);
  s.scene.traverse((o) => {
    if (!o.isMesh) return;
    meshes += 1;
    const e = o.matrixWorld.elements;
    if (![e[12], e[13], e[14]].every(Number.isFinite)) bad += 1;
    if (o.userData.keepMaterial) { kept += 1; return; }
    const m = Array.isArray(o.material) ? o.material[0] : o.material;
    if (m && m.isMeshToonMaterial) toon += 1;
    else if (m && m.isMeshBasicMaterial) basic += 1;
  });
  const resources = performance.getEntriesByType('resource');
  const glb = resources.filter((r) => r.name.includes('.glb'));
  const failed = glb.filter((r) => r.transferSize === 0 && r.decodedBodySize === 0).map((r) => r.name);
  return {
    ok: true,
    meshes, toon, basic, kept, bad, failed,
    glb: glb.length,
    status: document.getElementById('status')?.textContent || '',
    errors: window.__errors || [],
  };
})()`;

async function shoot(cdp, url, expectMode) {
  await cdp.send('Page.enable');
  await cdp.send('Runtime.enable');
  await cdp.send('Page.addScriptToEvaluateOnNewDocument', {
    source: 'window.__errors=[];addEventListener("error",e=>window.__errors.push(String(e.message)));addEventListener("unhandledrejection",e=>window.__errors.push(String(e.reason&&e.reason.message||e.reason)));',
  });
  await cdp.send('Emulation.setDeviceMetricsOverride', {
    width: 1440, height: 900, deviceScaleFactor: 1, mobile: false,
  });
  await cdp.send('Page.navigate', { url });
  let status = '';
  let report = null;
  for (let i = 0; i < 60; i += 1) {
    await sleep(200);
    const ready = await cdp.send('Runtime.evaluate', {
      expression: '({ready: window.__sceneReady === true, status: document.getElementById("status")?.textContent || "", errors: window.__errors || []})',
      returnByValue: true,
    });
    status = ready.result.value.status;
    const pageErrors = ready.result.value.errors || [];
    if (pageErrors.length) throw new Error(pageErrors.join(' | '));
    if (ready.result.value.ready) {
      report = (await cdp.send('Runtime.evaluate', { expression: INSPECT, returnByValue: true })).result.value;
      break;
    }
    if (String(status).startsWith('error:')) throw new Error(status);
  }
  if (!status.startsWith('ready')) throw new Error(`scene not ready: ${status}`);
  if (!report || !report.ok) throw new Error('inspect failed ' + JSON.stringify(report));
  if (report.bad) throw new Error('non-finite mesh positions');
  if (report.failed.length) throw new Error('glb failed ' + report.failed.join(','));
  const assetCount = Object.keys(JSON.parse(readFileSync(new URL('./layout.json', import.meta.url), 'utf8')).assets).length;
  if (report.glb < assetCount) throw new Error('too few glb loads ' + report.glb + ' / ' + assetCount);
  if (expectMode === 'toon' && report.toon < 20) throw new Error('toon materials missing ' + JSON.stringify(report));
  if (expectMode === 'unlit' && (report.basic < 20 || report.toon > 0)) {
    throw new Error('unlit did not swap to MeshBasicMaterial ' + JSON.stringify(report));
  }
  await sleep(450);
  const shot = await cdp.send('Page.captureScreenshot', { format: 'png' });
  return { png: Buffer.from(shot.data, 'base64'), status, report };
}

try {
  const cdp = await connect();
  for (const out of OUT_DIRS) mkdirSync(out, { recursive: true });
  for (const [name, url, mode] of VIEWS) {
    const { png, status, report } = await shoot(cdp, url, mode);
    for (const out of OUT_DIRS) {
      const file = `${out}/${out.endsWith('shots') ? name : 'fencing-salle_' + name}.png`;
      for (let attempt = 0; attempt < 4; attempt += 1) {
        try {
          writeFileSync(file, png);
          break;
        } catch (err) {
          if (attempt === 3 || err.code !== 'EIO') throw err;
          await sleep(200 * (attempt + 1));
        }
      }
      console.log(file, png.length, status, JSON.stringify({ meshes: report.meshes, toon: report.toon, basic: report.basic, glb: report.glb }));
    }
  }
  chrome.kill();
  process.exit(0);
} catch (err) {
  console.error(err);
  chrome.kill();
  process.exit(1);
}
