#!/usr/bin/env node
// Headless screenshots. Point it at a server whose root is the repo.
//   node tests/shoot.mjs http://127.0.0.1:8796/experiments/indoor30-20261113/golf-simulator shots golf
import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';

const base = (process.argv[2] || 'http://127.0.0.1:8796/experiments/indoor30-20261113/golf-simulator').replace(/\/$/, '');
const outDir = process.argv[3] || new URL('../shots/', import.meta.url).pathname;
const slug = process.argv[4] || '';
const shots = [
  ['toon_default', ''],
  ['toon_corner', 'cam=corner'],
  ['toon_detail', 'cam=detail'],
  ['unlit_default', 'mode=unlit'],
];

const chrome = spawn('google-chrome', [
  '--headless=new',
  '--no-sandbox',
  '--disable-dev-shm-usage',
  '--use-gl=angle',
  '--use-angle=swiftshader',
  '--remote-debugging-port=9347',
  '--user-data-dir=/tmp/chrome-golf-sim',
  '--window-size=1440,900',
  'about:blank',
], { stdio: ['ignore', 'pipe', 'pipe'] });

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function jsonGet(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url} ${res.status}`);
  return res.json();
}

async function waitVersion() {
  for (let i = 0; i < 40; i++) {
    try {
      return await jsonGet('http://127.0.0.1:9347/json/version');
    } catch {
      await sleep(150);
    }
  }
  throw new Error('chrome devtools did not open');
}

function cdp(wsUrl) {
  const ws = new WebSocket(wsUrl);
  let id = 0;
  const pending = new Map();
  const events = [];
  const open = new Promise((resolve, reject) => {
    ws.addEventListener('open', resolve);
    ws.addEventListener('error', () => reject(new Error('ws error')));
  });
  ws.addEventListener('message', (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      if (msg.error) reject(new Error(JSON.stringify(msg.error)));
      else resolve(msg.result);
    } else if (msg.method) events.push(msg);
  });
  async function send(method, params = {}) {
    await open;
    const msgId = ++id;
    const result = new Promise((resolve, reject) => pending.set(msgId, { resolve, reject }));
    ws.send(JSON.stringify({ id: msgId, method, params }));
    return result;
  }
  return { send, events, close: () => ws.close() };
}

async function main() {
  await mkdir(outDir, { recursive: true });
  const version = await waitVersion();
  const browser = cdp(version.webSocketDebuggerUrl);
  const { targetId } = await browser.send('Target.createTarget', { url: 'about:blank' });
  const { webSocketDebuggerUrl } = (await jsonGet('http://127.0.0.1:9347/json/list')).find((t) => t.id === targetId);
  const page = cdp(webSocketDebuggerUrl);
  await page.send('Page.enable');
  await page.send('Runtime.enable');
  await page.send('Emulation.setDeviceMetricsOverride', {
    width: 1440,
    height: 900,
    deviceScaleFactor: 1,
    mobile: false,
  });

  const report = [];
  for (const [name, query] of shots) {
    const q = query ? `?${query}&hud=0` : '?hud=0';
    page.events.length = 0;
    await page.send('Page.navigate', { url: `${base}/${q}` });
    let state = null;
    for (let i = 0; i < 80; i++) {
      await sleep(250);
      const ev = await page.send('Runtime.evaluate', {
        expression: `({
          ready: window.__ready === true,
          status: document.getElementById('status')?.textContent || '',
          errors: window.__errors || [],
          boot: window.__bootError || null,
          audit: window.__audit || null
        })`,
        returnByValue: true,
      });
      state = ev.result.value;
      if (state && (state.ready || state.boot || (state.errors && state.errors.length))) break;
    }
    await sleep(500);
    const shot = await page.send('Page.captureScreenshot', { format: 'png' });
    const file = `${outDir}/${slug ? slug + '_' : ''}${name}.png`;
    await writeFile(file, Buffer.from(shot.data, 'base64'));
    const consoleErrors = page.events
      .filter((e) => e.method === 'Runtime.exceptionThrown')
      .map((e) => e.params?.exceptionDetails?.exception?.description || e.params?.exceptionDetails?.text || 'exception');
    report.push({ name, file, state, consoleErrors });
    console.log(name, state && state.status, 'audit', state && state.audit && state.audit.ok, 'errors', JSON.stringify([...(state?.errors || []), ...consoleErrors]));
  }
  page.close();
  browser.close();
  chrome.kill('SIGKILL');
  const bad = report.filter((r) => !r.state || r.state.ready !== true || (r.state.errors || []).length || r.consoleErrors.length || !r.state.audit?.ok);
  if (bad.length) {
    console.error(JSON.stringify(bad, null, 2));
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  chrome.kill('SIGKILL');
  process.exit(1);
});
