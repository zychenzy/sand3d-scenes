import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import http from 'node:http';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const repo = join(root, '../../..');
const shotDir = join(root, 'shots');
mkdirSync(shotDir, { recursive: true });
mkdirSync('/opt/cursor/artifacts', { recursive: true });

const pagePort = 8877;
const debugPort = 9334;
const base = `http://127.0.0.1:${pagePort}/experiments/indoor30-20261113/foley-stage/`;
const shots = [
  ['?clean=1', 'toon_default.png'],
  ['?clean=1&cam=corner', 'toon_corner.png'],
  ['?clean=1&cam=close', 'toon_close.png'],
  ['?clean=1&mode=unlit', 'unlit_default.png'],
];

function get(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let d = '';
      res.on('data', (c) => { d += c; });
      res.on('end', () => resolve(d));
    }).on('error', reject);
  });
}

async function waitFor(url) {
  for (let i = 0; i < 50; i++) {
    try {
      await get(url);
      return;
    } catch {
      await new Promise((r) => setTimeout(r, 150));
    }
  }
  throw new Error(`timeout ${url}`);
}

class Cdp {
  constructor(wsUrl) {
    this.ws = new WebSocket(wsUrl);
    this.id = 0;
    this.pending = new Map();
  }
  open() {
    return new Promise((resolve, reject) => {
      this.ws.onopen = resolve;
      this.ws.onerror = reject;
    });
  }
  send(method, params = {}) {
    const id = ++this.id;
    this.ws.send(JSON.stringify({ id, method, params }));
    return new Promise((resolve, reject) => this.pending.set(id, { resolve, reject }));
  }
  listen(fn) {
    this.ws.addEventListener('message', (ev) => {
      const msg = JSON.parse(ev.data);
      if (msg.id && this.pending.has(msg.id)) {
        const { resolve, reject } = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        if (msg.error) reject(new Error(JSON.stringify(msg.error)));
        else resolve(msg.result);
      } else fn(msg);
    });
  }
}

const server = spawn('python3', ['-m', 'http.server', String(pagePort), '--bind', '127.0.0.1'], {
  cwd: repo,
  stdio: 'ignore',
});
const chrome = spawn('google-chrome', [
  '--headless=new',
  '--disable-gpu',
  '--no-sandbox',
  '--use-angle=swiftshader',
  `--remote-debugging-port=${debugPort}`,
  '--window-size=1440,900',
  '--user-data-dir=/tmp/chrome-foley-stage',
  'about:blank',
], { stdio: 'ignore' });

const problems = [];
try {
  await waitFor(`http://127.0.0.1:${debugPort}/json/version`);
  await waitFor(base);
  const ver = JSON.parse(await get(`http://127.0.0.1:${debugPort}/json/version`));
  const browser = new Cdp(ver.webSocketDebuggerUrl);
  browser.listen(() => {});
  await browser.open();

  for (const [query, name] of shots) {
    const url = base + query;
    const { targetId } = await browser.send('Target.createTarget', { url: 'about:blank' });
    const list = JSON.parse(await get(`http://127.0.0.1:${debugPort}/json/list`));
    const hit = list.find((t) => t.id === targetId);
    const page = new Cdp(hit.webSocketDebuggerUrl);
    const pageProblems = [];
    page.listen((msg) => {
      if (msg.method === 'Runtime.exceptionThrown') {
        pageProblems.push(`exception ${msg.params.exceptionDetails.text} ${msg.params.exceptionDetails.exception?.description || ''}`);
      }
      if (msg.method === 'Runtime.consoleAPICalled' && msg.params.type === 'error') {
        pageProblems.push(`console ${msg.params.args.map((a) => a.value || a.description).join(' ')}`);
      }
      if (msg.method === 'Network.responseReceived') {
        const status = msg.params.response.status;
        const resUrl = msg.params.response.url || '';
        if (status >= 400 && !resUrl.includes('favicon')) pageProblems.push(`http ${status} ${resUrl}`);
      }
    });
    await page.open();
    await page.send('Page.enable');
    await page.send('Runtime.enable');
    await page.send('Network.enable');
    await page.send('Page.navigate', { url });
    let status = '';
    for (let i = 0; i < 60; i++) {
      await new Promise((r) => setTimeout(r, 250));
      const res = await page.send('Runtime.evaluate', {
        expression: 'document.getElementById("status")?.textContent || ""',
        returnByValue: true,
      });
      status = res.result.value || '';
      if (status.startsWith('ready') || status.startsWith('asset failed')) break;
    }
    await new Promise((r) => setTimeout(r, 500));
    const probe = await page.send('Runtime.evaluate', {
      expression: `(() => {
        const s = window.__scene;
        if (!s) return { status: ${JSON.stringify(status)}, missing: true };
        const count = (pred) => {
          let n = 0;
          s.scene.traverse((o) => {
            if (!o.isMesh) return;
            const mats = [].concat(o.material);
            if (mats.some(pred)) n++;
          });
          return n;
        };
        const names = [];
        s.scene.traverse((o) => { if (o.name) names.push(o.name); });
        const grad = s.gradient.image.data;
        s.setMode('unlit');
        const unlitBasic = count((m) => m.isMeshBasicMaterial);
        const unlitToon = count((m) => m.isMeshToonMaterial);
        s.setMode('toon');
        const toonBasic = count((m) => m.isMeshBasicMaterial);
        const toonToon = count((m) => m.isMeshToonMaterial);
        s.setMode(location.search.includes('mode=unlit') ? 'unlit' : 'toon');
        s.renderer.render(s.scene, s.camera);
        const loaded = new Set();
        s.props.traverse((o) => { if (o.userData.kind) loaded.add(o.userData.kind); });
        const aimY = (q) => {
          const x = q.x, y = q.y, z = q.z, w = q.w;
          return 2 * w * (-x) + 2 * (z * y);
        };
        const micDown = {};
        s.props.children.forEach((o) => {
          if (o.userData.kind === 'shotgun_mic') micDown[o.name] = +aimY(o.quaternion).toFixed(3);
        });
        return {
          status,
          shadow: s.renderer.shadowMap.type,
          grad0: grad[0], gradLast: grad[grad.length - 4], nearest: s.gradient.magFilter,
          unlitBasic, unlitToon, toonBasic, toonToon,
          loaded: [...loaded].sort(),
          pits: ['pit-gravel', 'pit-wood', 'pit-sand'].every((n) => names.includes(n)),
          glass: names.includes('glass-outer') && names.includes('glass-inner'),
          water: names.includes('basin-water'),
          micDown,
          meshes: names.length,
        };
      })()`,
      returnByValue: true,
    });
    const info = probe.result.value;
    if (!String(info?.status || status).startsWith('ready')) pageProblems.push(`status ${info?.status || status}`);
    if (info && !info.missing) {
      if (info.shadow !== 0) pageProblems.push(`shadow type ${info.shadow}`);
      if (info.grad0 < 48 || info.grad0 > 96) pageProblems.push(`gradient floor ${info.grad0}`);
      if (info.nearest !== 1003) pageProblems.push(`gradient filter ${info.nearest}`);
      if (info.unlitToon !== 0 || info.unlitBasic < 40) pageProblems.push(`unlit basic ${info.unlitBasic} toon ${info.unlitToon}`);
      if (info.toonBasic !== 0 || info.toonToon < 40) pageProblems.push(`toon basic ${info.toonBasic} toon ${info.toonToon}`);
      if (!info.pits || !info.glass || !info.water) pageProblems.push(`markers pits ${info.pits} glass ${info.glass} water ${info.water}`);
      for (const id of ['mic_gravel', 'mic_wood', 'mic_sand', 'mic_water']) {
        if (!(info.micDown?.[id] < -0.7)) pageProblems.push(`${id} down ${info.micDown?.[id]}`);
      }
      if (Math.abs(info.micDown?.mic_door ?? 1) > 0.35) pageProblems.push(`mic_door down ${info.micDown?.mic_door}`);
      const expect = ['bar_stool', 'cup_mug', 'dining_chair', 'foley_shoe', 'foley_shoe_r', 'jam_jar', 'library_lamp', 'monitor', 'museum_bench', 'pendant_lamp', 'shotgun_mic', 'speaker', 'square_table', 'stage_door', 'study_desk', 'thermos', 'tray', 'water_basin'];
      for (const kind of expect) if (!info.loaded.includes(kind)) pageProblems.push(`missing kind ${kind}`);
    } else pageProblems.push('scene missing');
    for (const p of pageProblems) problems.push(`${name} ${p}`);
    const shot = await page.send('Page.captureScreenshot', { format: 'png' });
    const buf = Buffer.from(shot.data, 'base64');
    writeFileSync(join(shotDir, name), buf);
    writeFileSync(`/opt/cursor/artifacts/foley-stage_${name}`, buf);
    console.log(name, info?.status || status, 'meshes', info?.meshes, 'problems', pageProblems.length);
    await page.send('Target.closeTarget', { targetId }).catch(() => {});
    page.ws.close();
  }
} finally {
  chrome.kill();
  server.kill();
}

if (problems.length) {
  console.log('PROBLEMS');
  for (const p of problems) console.log(p);
  process.exit(1);
}
console.log('runtime ok');
