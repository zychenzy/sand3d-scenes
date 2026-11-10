import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync, copyFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';

const PORT = 9222;
const BASE = process.argv[2] || 'http://127.0.0.1:8791/experiments/sprint-20261110/bakery/';
const shots = [
  ['default', `${BASE}?shot=1`],
  ['corner', `${BASE}?shot=1&cam=corner`],
  ['close', `${BASE}?shot=1&cam=close`],
  ['unlit', `${BASE}?shot=1&mode=unlit`],
];

const chrome = spawn('google-chrome', [
  '--headless=new',
  '--no-sandbox',
  '--disable-gpu',
  '--disable-dev-shm-usage',
  '--use-angle=swiftshader',
  `--remote-debugging-port=${PORT}`,
  '--window-size=1440,900',
  '--user-data-dir=/tmp/bakery-chrome',
  'about:blank',
], { stdio: 'ignore' });

function die(msg) {
  console.error(msg);
  chrome.kill('SIGKILL');
  process.exit(1);
}

async function listTargets() {
  for (let i = 0; i < 50; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${PORT}/json/list`);
      if (res.ok) {
        const pages = (await res.json()).filter((t) => t.type === 'page' && t.webSocketDebuggerUrl);
        if (pages.length) return pages[0];
      }
    } catch { /* chrome still booting */ }
    await delay(200);
  }
  die('chrome devtools did not open');
}

const target = await listTargets();
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve, reject) => {
  ws.addEventListener('open', resolve);
  ws.addEventListener('error', () => reject(new Error('ws')));
});

let seq = 0;
const pending = new Map();
const logs = [];
ws.addEventListener('message', (ev) => {
  const msg = JSON.parse(ev.data);
  if (msg.id && pending.has(msg.id)) {
    const { resolve, reject } = pending.get(msg.id);
    pending.delete(msg.id);
    if (msg.error) reject(new Error(JSON.stringify(msg.error)));
    else resolve(msg.result);
  } else if (msg.method === 'Runtime.exceptionThrown') {
    logs.push('EXC ' + JSON.stringify(msg.params.exceptionDetails));
  } else if (msg.method === 'Runtime.consoleAPICalled' && msg.params.type === 'error') {
    logs.push('ERR ' + msg.params.args.map((a) => a.value || a.description || '').join(' '));
  }
});

function send(method, params = {}) {
  const id = ++seq;
  ws.send(JSON.stringify({ id, method, params }));
  return new Promise((resolve, reject) => pending.set(id, { resolve, reject }));
}

await send('Runtime.enable');
await send('Page.enable');
await send('Network.enable');
await send('Network.setCacheDisabled', { cacheDisabled: true });
await send('Emulation.setDeviceMetricsOverride', {
  width: 1440, height: 900, deviceScaleFactor: 1, mobile: false,
});

mkdirSync('/opt/cursor/artifacts', { recursive: true });
const shotDir = join(dirname(fileURLToPath(import.meta.url)), 'shots');
mkdirSync(shotDir, { recursive: true });

for (const [name, url] of shots) {
  await send('Page.navigate', { url });
  const result = await send('Runtime.evaluate', {
    expression: `new Promise((resolve) => {
      const t0 = Date.now();
      const tick = () => {
        if (window.__scene && window.__scene.ready) {
          resolve({ ok: true, errors: window.__errors || [], status: document.getElementById('status')?.textContent || '' });
          return;
        }
        if (Date.now() - t0 > 25000) {
          resolve({ ok: false, errors: window.__errors || [], status: document.getElementById('status')?.textContent || '' });
          return;
        }
        setTimeout(tick, 80);
      };
      tick();
    })`,
    awaitPromise: true,
    returnByValue: true,
  });
  const value = result.result.value;
  console.log(name, JSON.stringify(value));
  if (!value || !value.ok) die(name + ' did not become ready');
  if (value.errors && value.errors.length) die(name + ' errors ' + value.errors.join(' | '));
  await delay(400);
  const shot = await send('Page.captureScreenshot', { format: 'png' });
  const buf = Buffer.from(shot.data, 'base64');
  const tmp = `/tmp/bakery_${name}.png`;
  writeFileSync(tmp, buf);
  const artifact = `/opt/cursor/artifacts/bakery_${name}.png`;
  const local = name === 'unlit' ? `${shotDir}/unlit_default.png` : `${shotDir}/toon_${name}.png`;
  for (const dest of [artifact, local]) {
    let last;
    for (let attempt = 0; attempt < 4; attempt++) {
      try {
        copyFileSync(tmp, dest);
        last = null;
        break;
      } catch (err) {
        last = err;
        await delay(250 * (attempt + 1));
      }
    }
    if (last) die('write ' + dest + ' ' + last.message);
  }
  console.log('wrote', artifact, buf.length);
}

if (logs.length) {
  console.log('CONSOLE');
  logs.forEach((l) => console.log(l));
  die('console errors');
}

ws.close();
chrome.kill('SIGKILL');
console.log('capture ok');
