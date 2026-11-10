#!/usr/bin/env node
// Headless screenshots. Serves nothing; point it at an already-running scene.
//   node tests/shoot.mjs http://127.0.0.1:8788 /opt/cursor/artifacts indoor-pool
import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';

const base = (process.argv[2] || 'http://127.0.0.1:8788').replace(/\/$/, '');
const outDir = process.argv[3] || '/tmp/indoor-pool-shots';
const slug = process.argv[4] || 'indoor-pool';
const shots = [
  ['toon_default', ''],
  ['toon_corner', 'cam=corner'],
  ['toon_close', 'cam=close'],
  ['unlit_default', 'mode=unlit'],
];

const chrome = spawn('google-chrome', [
  '--headless=new',
  '--no-sandbox',
  '--disable-dev-shm-usage',
  '--use-gl=angle',
  '--use-angle=swiftshader',
  '--remote-debugging-port=9333',
  '--user-data-dir=/tmp/chrome-indoor-pool',
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
      return await jsonGet('http://127.0.0.1:9333/json/version');
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
    } else if (msg.method) {
      events.push(msg);
    }
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
  const { webSocketDebuggerUrl } = (await jsonGet('http://127.0.0.1:9333/json/list'))
    .find((t) => t.id === targetId);
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
    const url = `${base}/${q}`;
    page.events.length = 0;
    await page.send('Page.navigate', { url });
    let state = null;
    for (let i = 0; i < 80; i++) {
      await sleep(250);
      const ev = await page.send('Runtime.evaluate', {
        expression: `({ready: window.__ready, status: document.getElementById('status')?.textContent || '', errors: window.__errors || [], meshes: window.__scene ? window.__scene.scene.children.length : 0})`,
        returnByValue: true,
      });
      state = ev.result.value;
      if (state && (state.ready === true || (state.errors && state.errors.length))) break;
    }
    await sleep(400);
    const shot = await page.send('Page.captureScreenshot', { format: 'png' });
    const file = `${outDir}/${slug}_${name}.png`;
    await writeFile(file, Buffer.from(shot.data, 'base64'));
    const consoleErrors = page.events
      .filter((e) => e.method === 'Runtime.exceptionThrown')
      .map((e) => e.params?.exceptionDetails?.text || e.params?.exceptionDetails?.exception?.description || 'exception');
    report.push({ name, file, state, consoleErrors });
    console.log(name, state && state.status, 'errors', JSON.stringify([...(state?.errors || []), ...consoleErrors]));
  }
  await writeFile(`${outDir}/${slug}_shoot.json`, JSON.stringify(report, null, 2));
  page.close();
  browser.close();
  chrome.kill('SIGKILL');
  const bad = report.filter((r) => !r.state || r.state.ready !== true || (r.state.errors || []).length || r.consoleErrors.length);
  if (bad.length) {
    console.error('SHOT PROBLEMS', JSON.stringify(bad, null, 2));
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  chrome.kill('SIGKILL');
  process.exit(1);
});
