import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';

const debugPort = Number(process.env.CHROME_PORT || 9413);
const base = process.env.SCENE_URL || 'http://127.0.0.1:8771/experiments/indoor-20261113/laundromat/';
const outDir = process.env.SHOT_DIR || '/opt/cursor/artifacts';
const repoShots = new URL('../shots/', import.meta.url).pathname;
const shots = [
  ['toon_default', `${base}?hud=0`],
  ['toon_corner', `${base}?hud=0&cam=corner`],
  ['toon_close', `${base}?hud=0&cam=close`],
  ['unlit_default', `${base}?hud=0&mode=unlit`],
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
  const failedUrls = [];
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
    if (msg.method === 'Network.loadingFailed') {
      failedUrls.push(msg.params.errorText + ' ' + (msg.params.requestId || ''));
    }
    if (msg.method === 'Network.responseReceived') {
      const status = msg.params.response?.status;
      const responseUrl = msg.params.response?.url || '';
      if (status >= 400 && !responseUrl.endsWith('/favicon.ico')) failedUrls.push(`${status} ${responseUrl}`);
    }
  };
  ws.addEventListener('message', onMessage);
  await send(ws, 'Runtime.enable');
  await send(ws, 'Network.enable');
  await send(ws, 'Page.enable');
  await send(ws, 'Page.navigate', { url });
  let ready = false;
  let pageErrors = [];
  let statusText = '';
  for (let i = 0; i < 90; i++) {
    const result = await send(ws, 'Runtime.evaluate', {
      expression: '({ ready: !!window.__ready, errors: window.__errors || [], status: (document.getElementById("status")||{}).textContent || "", placed: window.__scene && window.__scene.placed })',
      returnByValue: true,
    });
    const value = result.result?.value;
    statusText = value?.status || '';
    if (value?.ready) {
      ready = true;
      pageErrors = value.errors || [];
      break;
    }
    if (value?.errors?.length) {
      pageErrors = value.errors;
      break;
    }
    await sleep(200);
  }
  if (!ready) throw new Error(`scene not ready for ${url} status=${statusText} errors=${pageErrors.join(' | ')}`);
  await send(ws, 'Runtime.evaluate', {
    expression: 'new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve(true))))',
    awaitPromise: true,
  });
  await sleep(250);
  const frame = await send(ws, 'Page.captureScreenshot', { format: 'png' });
  ws.removeEventListener('message', onMessage);
  return { png: Buffer.from(frame.data, 'base64'), errors: [...errors, ...pageErrors, ...failedUrls], statusText };
}

async function main() {
  mkdirSync(outDir, { recursive: true });
  mkdirSync(repoShots, { recursive: true });
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
    '--user-data-dir=/tmp/chrome-laundromat-835a',
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
      const { png, errors, statusText } = await shot(ws, url);
      const artifact = `${outDir}/laundromat_${name}.png`;
      const committed = `${repoShots}${name}.png`;
      writeFileSync(artifact, png);
      writeFileSync(committed, png);
      report.push({ name, artifact, committed, bytes: png.length, statusText, errors });
      console.log(`${name} ${png.length} bytes errors=${errors.length} status=${statusText}`);
      for (const err of errors) console.log('  ERR', err);
      if (errors.length || png.length < 20000) failed = true;
    }
    writeFileSync(`${outDir}/laundromat_shoot.json`, JSON.stringify(report, null, 2));
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
