import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';

const PORT = 9333;
const BASE = process.argv[2] || 'http://127.0.0.1:8765/experiments/indoor-20261113/laundromat/';
const shots = [
  ['toon_default', `${BASE}?shot=1`],
  ['toon_corner', `${BASE}?shot=1&cam=corner`],
  ['toon_close', `${BASE}?shot=1&cam=close`],
  ['unlit_default', `${BASE}?shot=1&mode=unlit`],
];

const chrome = spawn('google-chrome', [
  '--headless=new',
  '--no-sandbox',
  '--disable-gpu',
  '--disable-dev-shm-usage',
  '--use-angle=swiftshader',
  `--remote-debugging-port=${PORT}`,
  '--window-size=1440,900',
  '--user-data-dir=/tmp/laundromat-chrome',
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
await send('Emulation.setDeviceMetricsOverride', {
  width: 1440, height: 900, deviceScaleFactor: 1, mobile: false,
});

mkdirSync('/opt/cursor/artifacts', { recursive: true });
const shotDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'shots');
mkdirSync(shotDir, { recursive: true });

for (const [name, url] of shots) {
  await send('Page.navigate', { url });
  const result = await send('Runtime.evaluate', {
    expression: `new Promise((resolve) => {
      const t0 = Date.now();
      const tick = () => {
        const status = document.getElementById('status')?.textContent || '';
        if (window.__scene && window.__scene.ready) {
          resolve({ ok: true, errors: window.__errors || [], status });
          return;
        }
        if (Date.now() - t0 > 25000) {
          resolve({ ok: false, errors: window.__errors || [], status });
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
  if (logs.length) console.log(logs.join('\n'));
  if (!value || !value.ok) die(name + ' did not become ready');
  if (value.errors && value.errors.length) die(name + ' errors ' + value.errors.join(' | '));
  await delay(700);
  const shot = await send('Page.captureScreenshot', { format: 'png' });
  const buf = Buffer.from(shot.data, 'base64');
  const file = join(shotDir, `${name}.png`);
  writeFileSync(file, buf);
  writeFileSync(`/opt/cursor/artifacts/laundromat_${name}.png`, buf);
  console.log('wrote', file, buf.length);
}

chrome.kill('SIGKILL');
console.log('shots done');
