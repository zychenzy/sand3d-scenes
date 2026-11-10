#!/usr/bin/env node
/**
 * Headless Chrome screenshots. From the repo root, with the scene already served:
 *   node experiments/outdoor-20261110/riverside-tea-pavilion/tests/render_shots.mjs
 */
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';

const PORT = 9333;
const BASE = process.env.TEA_URL || 'http://127.0.0.1:8773/experiments/outdoor-20261110/riverside-tea-pavilion/';
const OUT = process.env.TEA_OUT || '/tmp/tea-shots';
const shots = [
  ['default', `${BASE}?shot=1`],
  ['corner', `${BASE}?shot=1&cam=corner`],
  ['close', `${BASE}?shot=1&cam=close`],
  ['unlit', `${BASE}?shot=1&mode=unlit`],
];

mkdirSync(OUT, { recursive: true });
mkdirSync('/tmp/chrome-tea-profile', { recursive: true });

const chrome = spawn('google-chrome', [
  '--headless=new',
  '--no-sandbox',
  '--disable-dev-shm-usage',
  '--use-gl=angle',
  '--hide-scrollbars',
  '--window-size=1280,720',
  `--remote-debugging-port=${PORT}`,
  '--user-data-dir=/tmp/chrome-tea-profile',
  '--no-first-run',
  'about:blank',
], { stdio: ['ignore', 'pipe', 'pipe'] });

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

async function waitJson(url) {
  for (let i = 0; i < 40; i++) {
    try {
      const r = await fetch(url);
      if (r.ok) return r.json();
    } catch { /* chrome still booting */ }
    await sleep(200);
  }
  throw new Error(`no response from ${url}`);
}

const pending = new Map();
let socket;
let seq = 0;

function send(method, params = {}) {
  const id = ++seq;
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    socket.send(JSON.stringify({ id, method, params }));
  });
}

async function openPage(url) {
  const created = await (await fetch(`http://127.0.0.1:${PORT}/json/new?${encodeURIComponent(url)}`, { method: 'PUT' })).json();
  socket = new WebSocket(created.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    socket.addEventListener('open', resolve);
    socket.addEventListener('error', reject);
  });
  socket.addEventListener('message', (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      if (msg.error) reject(new Error(JSON.stringify(msg.error)));
      else resolve(msg.result);
    } else if (msg.method === 'Runtime.exceptionThrown') {
      console.error('page exception', msg.params?.exceptionDetails?.exception?.description || msg.params?.exceptionDetails?.text);
    }
  });
  await send('Runtime.enable');
  await send('Page.enable');
  await send('Emulation.setDeviceMetricsOverride', {
    width: 1280, height: 720, deviceScaleFactor: 1, mobile: false,
  });
}

async function waitReady() {
  for (let i = 0; i < 50; i++) {
    const res = await send('Runtime.evaluate', {
      expression: '({ready: Boolean(window.__ready), status: document.getElementById("status")?.textContent || ""})',
      returnByValue: true,
    });
    const v = res.result?.value;
    if (v?.ready) return v;
    if (v?.status?.includes('error')) throw new Error(v.status);
    await sleep(200);
  }
  throw new Error('scene did not become ready');
}

try {
  await waitJson(`http://127.0.0.1:${PORT}/json/version`);
  for (const [name, url] of shots) {
    await openPage(url);
    const info = await waitReady();
    await send('Runtime.evaluate', {
      expression: 'new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))',
      awaitPromise: true,
    });
    const shot = await send('Page.captureScreenshot', { format: 'png' });
    const file = `${OUT}/${name}.png`;
    writeFileSync(file, Buffer.from(shot.data, 'base64'));
    console.log(name, info.status, file);
    socket.close();
    await sleep(150);
  }
} finally {
  chrome.kill('SIGKILL');
}
