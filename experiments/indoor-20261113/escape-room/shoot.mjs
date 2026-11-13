import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const debugPort = Number(process.env.CHROME_PORT || 9341);
const base = process.env.SCENE_URL || 'http://127.0.0.1:8813/';
const shotDir = resolve(here, 'shots');
const artifactDir = process.env.SHOT_DIR || '/opt/cursor/artifacts';
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
    } catch {
      /* booting */
    }
    await sleep(150);
  }
  throw new Error(`no response from ${url}`);
}

function send(ws, method, params = {}) {
  const id = send.next++;
  ws.send(JSON.stringify({ id, method, params }));
  return new Promise((resolvePromise, reject) => {
    send.pending.set(id, { resolve: resolvePromise, reject });
  });
}
send.next = 1;
send.pending = new Map();

async function shot(ws, url) {
  const errors = [];
  const failed = [];
  const hosts = new Set();
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
      failed.push(msg.params.errorText || 'loadingFailed');
    }
    if (msg.method === 'Network.responseReceived') {
      const resp = msg.params.response;
      try {
        hosts.add(new URL(resp.url).host);
      } catch {
        hosts.add(resp.url);
      }
      if (resp.status >= 400 && !resp.url.endsWith('/favicon.ico')) failed.push(`${resp.status} ${resp.url}`);
    }
  };
  ws.addEventListener('message', onMessage);
  await send(ws, 'Runtime.enable');
  await send(ws, 'Page.enable');
  await send(ws, 'Network.enable');
  await send(ws, 'Page.navigate', { url });
  let ready = false;
  let pageErrors = [];
  let mode = '';
  for (let i = 0; i < 80; i++) {
    const result = await send(ws, 'Runtime.evaluate', {
      expression: `({
        ready: !!window.__ready,
        errors: window.__errors || [],
        mode: document.getElementById('mode') ? document.getElementById('mode').textContent : '',
        status: (document.getElementById('status') || {}).textContent || ''
      })`,
      returnByValue: true,
    });
    const value = result.result?.value;
    if (value?.ready) {
      ready = true;
      pageErrors = value.errors || [];
      mode = value.mode;
      break;
    }
    await sleep(200);
  }
  if (!ready) throw new Error(`scene not ready for ${url}`);
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
    failed,
    hosts: [...hosts],
    mode,
  };
}

async function main() {
  mkdirSync(shotDir, { recursive: true });
  mkdirSync(artifactDir, { recursive: true });
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
    '--user-data-dir=/tmp/chrome-escape-room',
    'about:blank',
  ], { stdio: 'ignore' });
  let failed = false;
  try {
    await waitFor(`http://127.0.0.1:${debugPort}/json/version`);
    const list = await (await fetch(`http://127.0.0.1:${debugPort}/json/list`)).json();
    const page = list.find((t) => t.type === 'page');
    if (!page) throw new Error('no chrome page target');
    const ws = new WebSocket(page.webSocketDebuggerUrl);
    await new Promise((resolvePromise, reject) => {
      ws.addEventListener('open', resolvePromise);
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
    for (const [name, url] of shots) {
      const result = await shot(ws, url);
      const local = `${shotDir}/${name}.png`;
      const artifact = `${artifactDir}/escape-room_${name}.png`;
      writeFileSync(local, result.png);
      writeFileSync(artifact, result.png);
      const outside = result.hosts.filter((host) => host && !host.startsWith('127.0.0.1'));
      const row = {
        name,
        file: local,
        artifact,
        bytes: result.png.length,
        mode: result.mode,
        errors: result.errors,
        failed: result.failed,
        hosts: result.hosts,
        outside,
      };
      report.push(row);
      console.log(`${name} ${result.png.length} bytes mode=${result.mode} errors=${result.errors.length} net=${result.failed.length} hosts=${result.hosts.join(',')}`);
      for (const err of result.errors) console.log('  ERR', err);
      for (const err of result.failed) console.log('  NET', err);
      if (result.errors.length || result.failed.length || outside.length || result.png.length < 20_000) failed = true;
      const expectUnlit = name.startsWith('unlit');
      if (expectUnlit && result.mode !== 'UNLIT') failed = true;
      if (!expectUnlit && result.mode !== 'TOON') failed = true;
    }
    writeFileSync(`${artifactDir}/escape-room_shoot.json`, JSON.stringify(report, null, 2));
    ws.close();
  } finally {
    chrome.kill('SIGKILL');
  }
  if (failed) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
