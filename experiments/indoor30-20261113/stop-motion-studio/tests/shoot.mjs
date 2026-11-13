import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';

const debugPort = Number(process.env.CHROME_PORT || 9341);
const base = (process.env.SCENE_URL || 'http://127.0.0.1:8796/').replace(/\/$/, '');
const outDir = process.env.SHOT_DIR || new URL('../shots/', import.meta.url).pathname;
const shots = [
  ['toon_default', `${base}/?hud=0&dpr=1`],
  ['toon_corner', `${base}/?hud=0&dpr=1&cam=corner`],
  ['toon_detail', `${base}/?hud=0&dpr=1&cam=detail`],
  ['unlit_default', `${base}/?hud=0&dpr=1&mode=unlit`],
];

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitFor(url, tries = 50) {
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(url);
      if (res.ok) return;
    } catch {
      /* chrome still booting */
    }
    await sleep(150);
  }
  throw new Error(`no response from ${url}`);
}

function send(ws, method, params = {}) {
  const id = send.next++;
  ws.send(JSON.stringify({ id, method, params }));
  return new Promise((resolve, reject) => {
    send.pending.set(id, { resolve, reject });
  });
}
send.next = 1;
send.pending = new Map();

async function shot(ws, url) {
  const errors = [];
  const onMessage = (event) => {
    const msg = JSON.parse(event.data);
    if (msg.id && send.pending.has(msg.id)) {
      const pending = send.pending.get(msg.id);
      send.pending.delete(msg.id);
      if (msg.error) pending.reject(new Error(JSON.stringify(msg.error)));
      else pending.resolve(msg.result || {});
      return;
    }
    if (msg.method === 'Runtime.exceptionThrown') {
      const d = msg.params.exceptionDetails;
      errors.push(d.exception?.description || d.text || 'exception');
    }
    if (msg.method === 'Runtime.consoleAPICalled' && msg.params.type === 'error') {
      errors.push(msg.params.args.map((a) => a.value ?? a.description ?? '').join(' '));
    }
  };
  ws.addEventListener('message', onMessage);
  await send(ws, 'Runtime.enable');
  await send(ws, 'Page.enable');
  await send(ws, 'Page.navigate', { url });
  let ready = false;
  let info = {};
  for (let i = 0; i < 100; i++) {
    const result = await send(ws, 'Runtime.evaluate', {
      expression: `({ ready: !!window.__ready, errors: window.__errors || [], status: (document.getElementById('status')||{}).textContent || '', bounds: window.__bounds || null, scale: window.__scale || null })`,
      returnByValue: true,
    });
    const value = result.result?.value;
    if (value?.ready) {
      ready = true;
      info = value;
      break;
    }
    if (value?.errors?.length && /error:/i.test(value.status || '')) {
      info = value;
      break;
    }
    await sleep(200);
  }
  if (!ready) throw new Error(`scene not ready for ${url}: ${info.status || ''} ${JSON.stringify(info.errors || [])}`);
  await send(ws, 'Runtime.evaluate', {
    expression: 'new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve(true))))',
    awaitPromise: true,
  });
  const frame = await send(ws, 'Page.captureScreenshot', { format: 'png' });
  ws.removeEventListener('message', onMessage);
  return { png: Buffer.from(frame.data, 'base64'), errors: [...errors, ...(info.errors || [])], info };
}

async function main() {
  mkdirSync(outDir, { recursive: true });
  const chrome = spawn('/usr/local/bin/google-chrome', [
    '--headless=new',
    '--no-sandbox',
    '--disable-dev-shm-usage',
    '--disable-gpu',
    '--use-gl=angle',
    '--use-angle=swiftshader',
    '--enable-unsafe-swiftshader',
    `--remote-debugging-port=${debugPort}`,
    '--window-size=1600,1000',
    '--hide-scrollbars',
    '--user-data-dir=/tmp/chrome-stop-motion',
    'about:blank',
  ], { stdio: 'ignore' });
  try {
    await waitFor(`http://127.0.0.1:${debugPort}/json/version`);
    const list = await (await fetch(`http://127.0.0.1:${debugPort}/json/list`)).json();
    const page = list.find((t) => t.type === 'page');
    if (!page) throw new Error('no chrome page target');
    const ws = new WebSocket(page.webSocketDebuggerUrl);
    await new Promise((resolve, reject) => {
      ws.addEventListener('open', resolve);
      ws.addEventListener('error', reject);
    });
    ws.addEventListener('message', (event) => {
      const msg = JSON.parse(event.data);
      if (msg.id && send.pending.has(msg.id)) {
        const pending = send.pending.get(msg.id);
        send.pending.delete(msg.id);
        if (msg.error) pending.reject(new Error(JSON.stringify(msg.error)));
        else pending.resolve(msg.result || {});
      }
    });
    await send(ws, 'Emulation.setDeviceMetricsOverride', {
      width: 1600,
      height: 1000,
      deviceScaleFactor: 1,
      mobile: false,
    });
    const report = [];
    let failed = false;
    for (const [name, url] of shots) {
      const { png, errors, info } = await shot(ws, url);
      const file = `${outDir}/${name}.png`;
      writeFileSync(file, png);
      const bounds = info.bounds;
      const badBounds = !bounds || bounds.max[1] > 6 || bounds.min[1] < -0.25 || bounds.meshes < 80
        || bounds.max.some((n) => !Number.isFinite(n));
      if (badBounds) failed = true;
      if (errors.length) failed = true;
      report.push({ name, file, bytes: png.length, errors, bounds, scale: info.scale });
      console.log(`${name} ${png.length} bytes meshes=${bounds?.meshes} errors=${errors.length}`);
      for (const err of errors) console.log('  ERR', err);
      if (bounds) console.log('  bounds', bounds.min.map((n) => n.toFixed(2)).join(','), '→', bounds.max.map((n) => n.toFixed(2)).join(','));
    }
    writeFileSync(`${outDir}/shoot.json`, JSON.stringify(report, null, 2));
    ws.close();
    if (failed) process.exit(1);
  } finally {
    chrome.kill('SIGKILL');
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
