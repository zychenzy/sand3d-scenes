import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const debugPort = Number(process.env.CHROME_PORT || 9333);
const base = process.env.SCENE_URL || 'http://127.0.0.1:8773/experiments/indoor-20261113/calligraphy-classroom/';
const sceneDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const shotDir = resolve(sceneDir, 'shots');
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
    } catch { /* booting */ }
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
  let pageErrors = [];
  let status = '';
  for (let i = 0; i < 100; i++) {
    const result = await send(ws, 'Runtime.evaluate', {
      expression: '({ ready: !!window.__ready, errors: window.__errors || [], status: (document.getElementById("status")||{}).textContent || "", hud: (document.getElementById("hud")||{}).style && document.getElementById("hud").style.display })',
      returnByValue: true,
    });
    const value = result.result?.value;
    status = value?.status || '';
    if (value?.ready) {
      ready = true;
      pageErrors = value.errors || [];
      if (value.hud !== 'none') pageErrors.push(`hud visible: ${value.hud}`);
      break;
    }
    await sleep(200);
  }
  if (!ready) throw new Error(`scene not ready for ${url} (${status})`);
  await send(ws, 'Runtime.evaluate', {
    expression: 'new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve(true))))',
    awaitPromise: true,
  });
  await sleep(400);
  const frame = await send(ws, 'Page.captureScreenshot', { format: 'png' });
  ws.removeEventListener('message', onMessage);
  return { png: Buffer.from(frame.data, 'base64'), errors: [...errors, ...pageErrors] };
}

async function main() {
  mkdirSync(shotDir, { recursive: true });
  mkdirSync(artifactDir, { recursive: true });
  const chrome = spawn('/usr/bin/google-chrome', [
    '--headless=new',
    '--no-sandbox',
    '--disable-dev-shm-usage',
    '--use-gl=angle',
    '--use-angle=swiftshader',
    '--enable-unsafe-swiftshader',
    `--remote-debugging-port=${debugPort}`,
    '--window-size=1600,1000',
    '--hide-scrollbars',
    '--user-data-dir=/tmp/chrome-calligraphy',
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
    const failures = [];
    for (const [name, url] of shots) {
      const { png, errors } = await shot(ws, url);
      writeFileSync(resolve(shotDir, `${name}.png`), png);
      writeFileSync(resolve(artifactDir, `calligraphy_${name}.png`), png);
      if (errors.length) failures.push(`${name}: ${errors.join(' | ')}`);
      console.log(`${name} ${png.length} bytes`);
    }
    ws.close();
    if (failures.length) {
      console.error(failures.join('\n'));
      process.exit(1);
    }
  } finally {
    chrome.kill();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
