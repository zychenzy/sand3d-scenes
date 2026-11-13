/**
 * Headless shots: toon default / corner / close, and true unlit.
 * Records console errors and failed network responses.
 *
 *   SCENE_URL=http://127.0.0.1:8871/experiments/indoor-20261113/esports-room/ \
 *   node tools/shoot.mjs
 */
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const sceneDir = resolve(here, '..');
const debugPort = Number(process.env.CHROME_PORT || 9334);
const base = process.env.SCENE_URL || 'http://127.0.0.1:8871/experiments/indoor-20261113/esports-room/';
const artifactDir = process.env.SHOT_DIR || '/opt/cursor/artifacts';
const shotDir = resolve(sceneDir, 'shots');

const shots = [
  ['toon_default', `${base}?hud=0`],
  ['toon_corner', `${base}?hud=0&cam=corner`],
  ['toon_close', `${base}?hud=0&cam=close`],
  ['unlit_default', `${base}?hud=0&mode=unlit`],
];

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function waitFor(url, tries = 50) {
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(url);
      if (res.ok) return;
    } catch { /* chrome still booting */ }
    await sleep(150);
  }
  throw new Error(`no response from ${url}`);
}

function send(ws, method, params = {}) {
  const id = send.next++;
  ws.send(JSON.stringify({ id, method, params }));
  return new Promise((resolveP, rejectP) => {
    send.pending.set(id, { resolve: resolveP, reject: rejectP });
  });
}
send.next = 1;
send.pending = new Map();

async function shot(ws, url) {
  const errors = [];
  const failedNet = [];
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
      failedNet.push(`${msg.params.errorText || 'failed'} ${msg.params.requestId || ''}`);
    }
    if (msg.method === 'Network.responseReceived') {
      const status = msg.params.response?.status;
      const respUrl = msg.params.response?.url || '';
      if (status >= 400 && !respUrl.endsWith('/favicon.ico')) failedNet.push(`${status} ${respUrl}`);
    }
  };
  ws.addEventListener('message', onMessage);
  await send(ws, 'Runtime.enable');
  await send(ws, 'Page.enable');
  await send(ws, 'Network.enable');
  await send(ws, 'Page.navigate', { url });
  let ready = false;
  let pageErrors = [];
  let statusText = '';
  for (let i = 0; i < 80; i++) {
    const result = await send(ws, 'Runtime.evaluate', {
      expression: `({
        ready: !!window.__ready,
        errors: window.__errors || [],
        failed: window.__failed || [],
        status: (document.getElementById('status') || {}).textContent || '',
        mode: (document.getElementById('mode') || {}).textContent || ''
      })`,
      returnByValue: true,
    });
    const value = result.result?.value;
    if (value?.ready) {
      ready = true;
      pageErrors = [...(value.errors || []), ...(value.failed || [])];
      statusText = `${value.status} ${value.mode}`;
      break;
    }
    await sleep(200);
  }
  if (!ready) throw new Error(`scene not ready for ${url} status=${statusText}`);
  await send(ws, 'Runtime.evaluate', {
    expression: 'new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve(true))))',
    awaitPromise: true,
  });
  await sleep(250);
  const frame = await send(ws, 'Page.captureScreenshot', { format: 'png' });
  ws.removeEventListener('message', onMessage);
  return {
    png: Buffer.from(frame.data, 'base64'),
    errors: [...errors, ...pageErrors],
    failedNet,
    statusText,
  };
}

async function main() {
  mkdirSync(artifactDir, { recursive: true });
  mkdirSync(shotDir, { recursive: true });
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
    '--user-data-dir=/tmp/chrome-esports-room',
    'about:blank',
  ], { stdio: 'ignore' });
  try {
    await waitFor(`http://127.0.0.1:${debugPort}/json/version`);
    const list = await (await fetch(`http://127.0.0.1:${debugPort}/json/list`)).json();
    const page = list.find((t) => t.type === 'page');
    if (!page) throw new Error('no chrome page target');
    const ws = new WebSocket(page.webSocketDebuggerUrl);
    await new Promise((resolveP, rejectP) => {
      ws.addEventListener('open', resolveP);
      ws.addEventListener('error', rejectP);
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
    let bad = 0;
    for (const [name, url] of shots) {
      const { png, errors, failedNet, statusText } = await shot(ws, url);
      const sceneFile = `${shotDir}/${name}.png`;
      const artifact = `${artifactDir}/esports-room_${name}.png`;
      writeFileSync(sceneFile, png);
      writeFileSync(artifact, png);
      if (errors.length || failedNet.length) bad += 1;
      report.push({ name, sceneFile, artifact, bytes: png.length, statusText, errors, failedNet });
      console.log(`${name} ${png.length} bytes status=${statusText} errors=${errors.length} net=${failedNet.length}`);
      for (const err of errors) console.log('  ERR', err);
      for (const err of failedNet) console.log('  NET', err);
    }
    writeFileSync(`${artifactDir}/esports-room_shoot.json`, JSON.stringify(report, null, 2));
    ws.close();
    if (bad) process.exitCode = 1;
  } finally {
    chrome.kill('SIGKILL');
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
