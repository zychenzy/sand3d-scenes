#!/usr/bin/env node
/**
 * Capture toon default / corner / close and unlit default.
 * Usage: node render_shots.mjs http://127.0.0.1:8791
 */
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { setTimeout as delay } from 'node:timers/promises';

const base = process.argv[2] || 'http://127.0.0.1:8791';
const outDir = process.argv[3] || '/opt/cursor/artifacts';
mkdirSync(outDir, { recursive: true });

const shots = [
  ['hotel-lobby_default.png', `${base}/?hud=0`],
  ['hotel-lobby_corner.png', `${base}/?hud=0&cam=corner`],
  ['hotel-lobby_close.png', `${base}/?hud=0&cam=close`],
  ['hotel-lobby_unlit.png', `${base}/?hud=0&mode=unlit`],
];

const chrome = spawn('google-chrome', [
  '--headless=new',
  '--disable-gpu',
  '--use-angle=swiftshader',
  '--enable-webgl',
  '--ignore-gpu-blocklist',
  '--no-sandbox',
  '--remote-debugging-port=9223',
  '--user-data-dir=/tmp/chrome-hotel-lobby',
  '--window-size=1600,1000',
  'about:blank',
], { stdio: 'ignore' });

async function cdp() {
  for (let i = 0; i < 40; i++) {
    try {
      const res = await fetch('http://127.0.0.1:9223/json/version');
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

await cdp();
const tabs = await (await fetch('http://127.0.0.1:9223/json')).json();
const page = tabs.find((t) => t.type === 'page') || tabs[0];
const client = connect(page.webSocketDebuggerUrl);
await client.waitOpen;
await client.send('Page.enable');
await client.send('Runtime.enable');

const errors = [];
for (const [name, url] of shots) {
  await client.send('Page.navigate', { url });
  let ready = false;
  let pageErrors = [];
  for (let i = 0; i < 80; i++) {
    await delay(250);
    const result = await client.send('Runtime.evaluate', {
      expression: 'JSON.stringify({ready: !!window.__ready, errors: window.__errors || [], status: document.getElementById("status")?.textContent || ""})',
      returnByValue: true,
    });
    const info = JSON.parse(result.result.value);
    if (info.ready) {
      ready = true;
      pageErrors = info.errors;
      break;
    }
  }
  if (!ready) errors.push(`${name} never became ready`);
  if (pageErrors.length) errors.push(`${name} errors: ${pageErrors.join(' | ')}`);
  await delay(400);
  const shot = await client.send('Page.captureScreenshot', { format: 'png' });
  const buf = Buffer.from(shot.data, 'base64');
  const file = `${outDir}/${name}`;
  await import('node:fs/promises').then((fs) => fs.writeFile(file, buf));
  console.log('wrote', file, buf.length);
}

client.ws.close();
chrome.kill();
if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}
