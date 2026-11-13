/**
 * Headless Chrome check: the page reaches ready, reports no errors,
 * and Unlit really swaps in MeshBasicMaterial.
 * Optional argv[3] is a directory for the four review shots.
 */
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';

const base = process.argv[2];
const shotDir = process.argv[3];
if (!base) {
  console.error('usage: runtime_browser.mjs <scene-url> [shot-dir]');
  process.exit(2);
}

const chrome = spawn('google-chrome', [
  '--headless=new',
  '--no-sandbox',
  '--disable-gpu',
  '--use-angle=swiftshader',
  '--enable-unsafe-swiftshader',
  '--remote-debugging-port=9223',
  '--user-data-dir=/tmp/leather-chrome-profile',
  '--window-size=1280,720',
  'about:blank',
], { stdio: 'ignore' });

const exceptions = [];

function die(msg) {
  console.error(msg);
  chrome.kill('SIGKILL');
  process.exit(1);
}

async function waitDevtools() {
  for (let i = 0; i < 50; i++) {
    try {
      const res = await fetch('http://127.0.0.1:9223/json/version');
      if (res.ok) return;
    } catch {
      /* chrome still booting */
    }
    await new Promise((r) => setTimeout(r, 120));
  }
  die('devtools port did not open');
}

await waitDevtools();
const pages = await (await fetch('http://127.0.0.1:9223/json')).json();
const page = pages.find((p) => p.type === 'page');
if (!page) die('no chrome page target');
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((resolve, reject) => {
  ws.addEventListener('open', resolve);
  ws.addEventListener('error', () => reject(new Error('devtools websocket failed')));
});

let seq = 0;
const pending = new Map();
ws.addEventListener('message', (ev) => {
  const data = JSON.parse(ev.data);
  if (data.id && pending.has(data.id)) {
    const { resolve, reject } = pending.get(data.id);
    pending.delete(data.id);
    if (data.error) reject(new Error(JSON.stringify(data.error)));
    else resolve(data.result);
    return;
  }
  if (data.method === 'Runtime.exceptionThrown') {
    const details = data.params.exceptionDetails;
    exceptions.push(details.exception?.description || details.text || 'exception');
  }
});

function cdp(method, params = {}) {
  const id = ++seq;
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, params }));
  });
}

await cdp('Page.enable');
await cdp('Runtime.enable');
await cdp('Network.enable');
await cdp('Network.setCacheDisabled', { cacheDisabled: true });

async function evalJson(expression) {
  const result = await cdp('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  if (result.exceptionDetails) {
    die(result.exceptionDetails.text || 'eval failed');
  }
  return JSON.parse(result.result.value);
}

async function open(url) {
  const before = await evalJson('JSON.stringify(location.href)');
  await cdp('Page.navigate', { url });
  for (let i = 0; i < 60; i++) {
    const state = await evalJson(`JSON.stringify({
      ready: !!window.__ready,
      href: location.href,
      status: (document.getElementById('status') || {}).textContent || '',
      errors: window.__errors || [],
      meshes: (window.__scene && window.__scene.meshCount) || 0,
      cam: window.__scene && window.__scene.camera
        ? [window.__scene.camera.position.x, window.__scene.camera.position.y, window.__scene.camera.position.z]
        : null
    })`);
    if (state.href === before) {
      await new Promise((r) => setTimeout(r, 100));
      continue;
    }
    if (state.errors.length) die(`page errors: ${state.errors.join(' | ')}`);
    if (state.status.startsWith('error:')) die(state.status);
    if (state.ready) return state;
    await new Promise((r) => setTimeout(r, 200));
  }
  die(`scene not ready for ${url}`);
}

try {
  const state = await open(`${base}/?hud=0`);
  if (state.meshes < 80) die(`too few meshes: ${state.meshes}`);
  const modes = await evalJson(`(() => {
    const count = (flag) => {
      let n = 0;
      window.__scene.scene.traverse((o) => { if (o.isMesh && o.material && o.material[flag]) n += 1; });
      return n;
    };
    window.__scene.setMode('unlit');
    const unlit = count('isMeshBasicMaterial');
    const toonLeft = count('isMeshToonMaterial');
    window.__scene.setMode('toon');
    const toon = count('isMeshToonMaterial');
    const basicLeft = count('isMeshBasicMaterial');
    return JSON.stringify({ unlit, toonLeft, toon, basicLeft, mode: document.getElementById('mode').textContent });
  })()`);
  if (modes.unlit < 80 || modes.toonLeft !== 0) die(`unlit did not replace toon: ${JSON.stringify(modes)}`);
  if (modes.toon < 80 || modes.basicLeft !== 0) die(`toon did not restore: ${JSON.stringify(modes)}`);
  if (exceptions.length) die(`uncaught: ${exceptions.join(' | ')}`);
  console.log(`runtime ok — ${state.meshes} meshes, unlit ${modes.unlit}, toon ${modes.toon}`);

  if (shotDir) {
    mkdirSync(shotDir, { recursive: true });
    const shots = [
      ['toon_default.png', `${base}/?hud=0&shot=default`],
      ['toon_corner.png', `${base}/?hud=0&cam=corner&shot=corner`],
      ['toon_close.png', `${base}/?hud=0&cam=close&shot=close`],
      ['unlit_default.png', `${base}/?hud=0&mode=unlit&shot=unlit`],
    ];
    for (const [name, url] of shots) {
      const state = await open(url);
      await new Promise((r) => setTimeout(r, 400));
      console.log(`${name} cam ${JSON.stringify(state.cam)} ${state.href}`);
      const shot = await cdp('Page.captureScreenshot', { format: 'png' });
      writeFileSync(`${shotDir}/${name}`, Buffer.from(shot.data, 'base64'));
      console.log(`wrote ${name}`);
    }
  }
} catch (err) {
  die(err.message || String(err));
}

chrome.kill('SIGKILL');
ws.close();
process.exit(0);
