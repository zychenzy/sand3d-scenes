#!/usr/bin/env node
/**
 * Load the atelier in headless Chrome, fail on boot errors, write four shots.
 * Usage: node tests/render_shots.mjs http://127.0.0.1:8765
 */
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { setTimeout as delay } from 'node:timers/promises';

const base = process.argv[2] || 'http://127.0.0.1:8765/experiments/indoor30-20261113/bookbinding-atelier/';
const outDir = process.argv[3] || new URL('../shots/', import.meta.url).pathname;
mkdirSync(outDir, { recursive: true });

const shots = [
  ['toon_default.png', `${base}?hud=0&dpr=1`],
  ['toon_corner.png', `${base}?hud=0&dpr=1&cam=corner`],
  ['toon_close.png', `${base}?hud=0&dpr=1&cam=close`],
  ['unlit_default.png', `${base}?hud=0&dpr=1&mode=unlit`],
];

const chrome = spawn('google-chrome', [
  '--headless=new',
  '--disable-gpu',
  '--use-angle=swiftshader',
  '--enable-webgl',
  '--ignore-gpu-blocklist',
  '--no-sandbox',
  '--remote-debugging-port=9337',
  '--user-data-dir=/tmp/chrome-bookbinding-atelier',
  '--window-size=1600,1000',
  'about:blank',
], { stdio: 'ignore' });

async function cdp() {
  for (let i = 0; i < 40; i++) {
    try {
      const res = await fetch('http://127.0.0.1:9337/json/version');
      if (res.ok) return;
    } catch { /* boot */ }
    await delay(150);
  }
  throw new Error('chrome debug port did not open');
}

function connect(wsUrl) {
  const ws = new WebSocket(wsUrl);
  let id = 0;
  const pending = new Map();
  const waitOpen = new Promise((resolve, reject) => {
    ws.addEventListener('open', resolve);
    ws.addEventListener('error', reject);
  });
  ws.addEventListener('message', (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      if (msg.error) reject(new Error(JSON.stringify(msg.error)));
      else resolve(msg.result);
    }
  });
  function send(method, params = {}) {
    const msgId = ++id;
    return new Promise((resolve, reject) => {
      pending.set(msgId, { resolve, reject });
      ws.send(JSON.stringify({ id: msgId, method, params }));
    });
  }
  return { ws, waitOpen, send };
}

const errors = [];
try {
  await cdp();
  const tabs = await (await fetch('http://127.0.0.1:9337/json')).json();
  const page = tabs.find((t) => t.type === 'page') || tabs[0];
  const client = connect(page.webSocketDebuggerUrl);
  await client.waitOpen;
  await client.send('Page.enable');
  await client.send('Runtime.enable');

  for (const [name, url] of shots) {
    await client.send('Page.navigate', { url });
    let info = null;
    for (let i = 0; i < 80; i++) {
      await delay(250);
      const result = await client.send('Runtime.evaluate', {
        expression: `JSON.stringify({
          ready: !!window.__ready,
          errors: window.__errors || [],
          status: document.getElementById('status')?.textContent || '',
          metrics: window.__metrics || null,
          mode: document.getElementById('mode')?.textContent || ''
        })`,
        returnByValue: true,
      });
      info = JSON.parse(result.result.value);
      if (info.ready || (info.errors && info.errors.length)) break;
    }
    if (!info?.ready) errors.push(`${name} never became ready (${info?.status || 'no status'})`);
    if (info?.errors?.length) errors.push(`${name} errors: ${info.errors.join(' | ')}`);
    if (info?.metrics) {
      const m = info.metrics;
      const expect = (key, lo, hi) => {
        const maxY = m[key] && m[key].maxY;
        if (maxY == null || maxY < lo || maxY > hi) errors.push(`${name} ${key} maxY=${maxY} not in ${lo}..${hi}`);
      };
      expect('sewing-top', 0.72, 0.78);
      expect('forward-top', 0.73, 0.8);
      expect('packing-top', 0.7, 0.78);
      expect('guillotine-top', 0.87, 0.94);
      expect('press-root', 1.55, 1.85);
      expect('drawer-root', 0.98, 1.2);
      expect('rack-root', 1.4, 1.7);
      expect('stove-root', 0.7, 1.05);
      if (m.hugeMeshes) errors.push(`${name} huge meshes ${m.hugeMeshes}`);
      if (m.propCount !== 16) errors.push(`${name} propCount ${m.propCount}`);
    }
    if (name.startsWith('unlit') && info?.mode && info.mode !== 'UNLIT') {
      errors.push(`${name} mode is ${info.mode}`);
    }
    if (name.startsWith('toon') && info?.mode && info.mode !== 'TOON') {
      errors.push(`${name} mode is ${info.mode}`);
    }
    await delay(500);
    const shot = await client.send('Page.captureScreenshot', { format: 'png' });
    const buf = Buffer.from(shot.data, 'base64');
    const file = `${outDir}/${name}`;
    await import('node:fs/promises').then((fs) => fs.writeFile(file, buf));
    console.log('wrote', file, buf.length);
    if (buf.length < 20_000) errors.push(`${name} screenshot too small`);
  }
  client.ws.close();
} finally {
  chrome.kill();
}

if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}
console.log('runtime ok');
