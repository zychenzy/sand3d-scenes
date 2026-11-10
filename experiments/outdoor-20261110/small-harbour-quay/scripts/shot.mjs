import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const url = process.argv[2];
const out = process.argv[3];
const port = Number(process.argv[4] || 9333);
if (!url || !out) {
  console.error('usage: node shot.mjs <url> <outfile> [debugPort]');
  process.exit(1);
}

const chrome = spawn('/usr/bin/google-chrome', [
  '--headless=new',
  '--no-sandbox',
  '--disable-dev-shm-usage',
  '--use-gl=angle',
  '--use-angle=swiftshader',
  '--enable-webgl',
  `--remote-debugging-port=${port}`,
  '--window-size=1600,1000',
  '--hide-scrollbars',
  '--force-color-profile=srgb',
  '--force-device-scale-factor=1',
  'about:blank',
], { stdio: 'ignore' });

async function waitJson(target, method = 'GET') {
  for (let i = 0; i < 60; i++) {
    try {
      const res = await fetch(target, { method });
      if (res.ok) return await res.json();
    } catch {
      /* chrome still booting */
    }
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error(`no debugger at ${target}`);
}

try {
  await waitJson(`http://127.0.0.1:${port}/json/version`);
  const page = await waitJson(`http://127.0.0.1:${port}/json/new?${encodeURIComponent(url)}`, 'PUT');
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    ws.addEventListener('open', resolve);
    ws.addEventListener('error', reject);
  });
  let id = 0;
  const pending = new Map();
  ws.addEventListener('message', (ev) => {
    const msg = JSON.parse(ev.data);
    if (!msg.id || !pending.has(msg.id)) return;
    const { resolve, reject } = pending.get(msg.id);
    pending.delete(msg.id);
    if (msg.error) reject(new Error(JSON.stringify(msg.error)));
    else resolve(msg.result);
  });
  const send = (method, params = {}) => {
    const msgId = ++id;
    return new Promise((resolve, reject) => {
      pending.set(msgId, { resolve, reject });
      ws.send(JSON.stringify({ id: msgId, method, params }));
    });
  };

  await send('Page.enable');
  await send('Runtime.enable');
  await send('Emulation.setDeviceMetricsOverride', {
    width: 1600,
    height: 1000,
    deviceScaleFactor: 1,
    mobile: false,
  });
  const ready = await send('Runtime.evaluate', {
    expression: `new Promise((resolve, reject) => {
      const t0 = performance.now();
      const tick = () => {
        if (window.__error) reject(new Error(String(window.__error).slice(0, 500)));
        else if (window.__ready) resolve('ok');
        else if (performance.now() - t0 > 20000) {
          const status = document.getElementById('status');
          reject(new Error('timeout ' + (status ? status.textContent : '')));
        } else requestAnimationFrame(tick);
      };
      tick();
    })`,
    awaitPromise: true,
    returnByValue: true,
  });
  if (ready.exceptionDetails) {
    throw new Error(JSON.stringify(ready.exceptionDetails).slice(0, 800));
  }
  await send('Runtime.evaluate', {
    expression: 'new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))',
    awaitPromise: true,
  });
  const shot = await send('Page.captureScreenshot', { format: 'png' });
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, Buffer.from(shot.data, 'base64'));
  console.log('wrote', out);
  ws.close();
} finally {
  chrome.kill();
}
