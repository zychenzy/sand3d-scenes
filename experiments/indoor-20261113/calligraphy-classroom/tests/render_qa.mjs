#!/usr/bin/env node
/**
 * Load the classroom, fail on console errors, failed requests, or audit issues,
 * and write the four review shots.
 *
 * Usage: node tests/render_qa.mjs http://127.0.0.1:8937/experiments/indoor-20261113/calligraphy-classroom/
 */
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { setTimeout as delay } from 'node:timers/promises';

const base = (process.argv[2] || 'http://127.0.0.1:8937/experiments/indoor-20261113/calligraphy-classroom/').replace(/\/?$/, '/');
const shotDir = new URL('../shots/', import.meta.url);
const artifactDir = '/opt/cursor/artifacts';
mkdirSync(shotDir, { recursive: true });
mkdirSync(artifactDir, { recursive: true });

const shots = [
  ['toon_default.png', `${base}?hud=0`, 'toon'],
  ['toon_corner.png', `${base}?hud=0&cam=corner`, 'toon'],
  ['toon_close.png', `${base}?hud=0&cam=close`, 'toon'],
  ['unlit_default.png', `${base}?hud=0&mode=unlit`, 'unlit'],
];

const chrome = spawn('google-chrome', [
  '--headless=new',
  '--disable-gpu',
  '--use-angle=swiftshader',
  '--enable-webgl',
  '--ignore-gpu-blocklist',
  '--no-sandbox',
  '--remote-debugging-port=9226',
  '--user-data-dir=/tmp/chrome-calligraphy-classroom',
  '--window-size=1600,1000',
  'about:blank',
], { stdio: 'ignore' });

async function cdp() {
  for (let i = 0; i < 40; i++) {
    try {
      const res = await fetch('http://127.0.0.1:9226/json/version');
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
const tabs = await (await fetch('http://127.0.0.1:9226/json')).json();
const page = tabs.find((t) => t.type === 'page') || tabs[0];
const client = connect(page.webSocketDebuggerUrl);
await client.waitOpen;
await client.send('Page.enable');
await client.send('Runtime.enable');
await client.send('Network.enable');

const errors = [];
const fs = await import('node:fs/promises');

for (const [name, url, expectMode] of shots) {
  const failed = [];
  const remote = [];
  const onMessage = (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.method === 'Network.responseReceived') {
      const { response } = msg.params;
      const reqUrl = response.url || '';
      if (reqUrl.startsWith('data:') || reqUrl.endsWith('/favicon.ico')) return;
      let host = '';
      try { host = new URL(reqUrl).host; } catch { /* ignore */ }
      if (host && host !== '127.0.0.1:8937' && host !== 'localhost:8937') remote.push(reqUrl);
      if (response.status >= 400) failed.push(`${response.status} ${reqUrl}`);
    }
    if (msg.method === 'Runtime.exceptionThrown') {
      const text = msg.params?.exceptionDetails?.exception?.description
        || msg.params?.exceptionDetails?.text
        || 'exception';
      failed.push(text);
    }
  };
  client.ws.addEventListener('message', onMessage);
  await client.send('Page.navigate', { url });
  let ready = false;
  let info = {};
  for (let i = 0; i < 80; i++) {
    await delay(250);
    const result = await client.send('Runtime.evaluate', {
      expression: `JSON.stringify({
        ready: !!window.__ready,
        errors: window.__errors || [],
        audit: window.__audit || null,
        shading: window.__shading || '',
        status: document.getElementById('status')?.textContent || ''
      })`,
      returnByValue: true,
    });
    info = JSON.parse(result.result.value);
    if (info.ready) {
      ready = true;
      break;
    }
  }
  await delay(350);
  client.ws.removeEventListener('message', onMessage);
  if (!ready) errors.push(`${name} never became ready (${info.status || 'no status'})`);
  if (info.errors?.length) errors.push(`${name} errors: ${info.errors.join(' | ')}`);
  if (info.audit?.issues?.length) errors.push(`${name} audit: ${info.audit.issues.join(' | ')}`);
  if (info.shading !== expectMode) errors.push(`${name} shading ${info.shading} wanted ${expectMode}`);
  if (expectMode === 'unlit' && info.audit && info.audit.toonCount !== 0) {
    errors.push(`${name} unlit still has ${info.audit.toonCount} toon materials`);
  }
  if (expectMode === 'toon' && info.audit && info.audit.toonCount < 30) {
    errors.push(`${name} toon count ${info.audit?.toonCount}`);
  }
  if (failed.length) errors.push(`${name} network/runtime: ${failed.slice(0, 6).join(' | ')}`);
  if (remote.length) errors.push(`${name} remote requests: ${remote.slice(0, 4).join(' | ')}`);
  const shot = await client.send('Page.captureScreenshot', { format: 'png' });
  const buf = Buffer.from(shot.data, 'base64');
  const local = new URL(name, shotDir);
  await fs.writeFile(local, buf);
  await fs.writeFile(`${artifactDir}/${name}`, buf);
  console.log('wrote', local.pathname, buf.length, 'shading', info.shading, 'audit', JSON.stringify(info.audit));
}

client.ws.close();
chrome.kill();
if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}
