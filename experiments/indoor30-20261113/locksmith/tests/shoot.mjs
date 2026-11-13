/**
 * Four review shots via Chrome DevTools.
 * Usage: node tests/shoot.mjs [port]
 */
import { writeFileSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const port = Number(process.argv[2] || 8773);
const debugPort = Number(process.argv[3] || 9222);
const shots = [
  ['toon_default.png', ''],
  ['toon_corner.png', 'cam=corner'],
  ['toon_detail.png', 'cam=detail'],
  ['unlit_default.png', 'mode=unlit'],
];

const server = spawn('python3', ['-m', 'http.server', String(port), '--bind', '127.0.0.1'], { cwd: root, stdio: 'ignore' });
const chrome = spawn('google-chrome', [
  '--headless=new',
  '--disable-gpu',
  '--no-sandbox',
  `--remote-debugging-port=${debugPort}`,
  '--user-data-dir=/tmp/chrome-locksmith-shots',
], { stdio: 'ignore' });

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

try {
  await sleep(700);
  const version = await fetch(`http://127.0.0.1:${debugPort}/json/version`).then((r) => r.json());
  const ws = new WebSocket(version.webSocketDebuggerUrl);
  await new Promise((res, rej) => {
    ws.addEventListener('open', res);
    ws.addEventListener('error', () => rej(new Error('cdp failed')));
  });
  let seq = 0;
  const rpc = (method, params = {}, sessionId) => new Promise((resolveRpc, reject) => {
    const id = ++seq;
    const onMsg = (ev) => {
      const data = JSON.parse(ev.data);
      if (data.id !== id) return;
      ws.removeEventListener('message', onMsg);
      if (data.error) reject(new Error(`${method}: ${JSON.stringify(data.error)}`));
      else resolveRpc(data.result);
    };
    ws.addEventListener('message', onMsg);
    const payload = { id, method, params };
    if (sessionId) payload.sessionId = sessionId;
    ws.send(JSON.stringify(payload));
  });
  const { targetId } = await rpc('Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await rpc('Target.attachToTarget', { targetId, flatten: true });
  const call = (method, params) => rpc(method, params, sessionId);
  await call('Page.enable');
  await call('Runtime.enable');
  await call('Emulation.setDeviceMetricsOverride', {
    width: 1440, height: 900, deviceScaleFactor: 1, mobile: false,
  });

  for (const [name, query] of shots) {
    const url = `http://127.0.0.1:${port}/?shot=1${query ? '&' + query : ''}`;
    await call('Page.navigate', { url });
    const deadline = Date.now() + 25000;
    let info = null;
    while (Date.now() < deadline) {
      const result = await call('Runtime.evaluate', {
        expression: `({ ready: !!(window.__scene && window.__scene.ready), status: document.getElementById('status')?.textContent || '', errors: window.__errors || [] })`,
        returnByValue: true,
      });
      info = result.result && result.result.value;
      if (info && info.ready) break;
      await sleep(250);
    }
    if (!info || !info.ready) {
      console.error(name, JSON.stringify(info));
      process.exitCode = 1;
      break;
    }
    await sleep(500);
    const shot = await call('Page.captureScreenshot', { format: 'png' });
    const out = resolve(root, 'shots', name);
    writeFileSync(out, Buffer.from(shot.data, 'base64'));
    console.log(JSON.stringify({ out, status: info.status, errors: info.errors }));
  }
  ws.close();
} finally {
  chrome.kill('SIGKILL');
  server.kill('SIGKILL');
}
