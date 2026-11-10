// Headless screenshots via Chrome DevTools. Waits for window.__ready.
import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { setTimeout as delay } from 'node:timers/promises';

const PORT = 9222;
const shots = [
  ['default', 'http://127.0.0.1:8791/?shot=1', 'shots/toon_default.png'],
  ['corner', 'http://127.0.0.1:8791/?shot=1&cam=corner', 'shots/toon_corner.png'],
  ['close', 'http://127.0.0.1:8791/?shot=1&cam=close', 'shots/toon_close.png'],
  ['unlit', 'http://127.0.0.1:8791/?shot=1&mode=unlit', 'shots/unlit_default.png'],
];

const chrome = spawn('/usr/bin/google-chrome', [
  '--headless=new',
  '--disable-gpu',
  '--use-angle=swiftshader',
  '--enable-unsafe-swiftshader',
  `--remote-debugging-port=${PORT}`,
  '--window-size=1440,900',
  '--force-device-scale-factor=1',
  '--hide-scrollbars',
  '--no-first-run',
  '--no-default-browser-check',
  '--user-data-dir=/tmp/chrome-mo',
  'about:blank',
], { stdio: 'ignore' });

async function version() {
  for (let i = 0; i < 40; i += 1) {
    try {
      const res = await fetch(`http://127.0.0.1:${PORT}/json/version`);
      if (res.ok) return;
    } catch { /* chrome still starting */ }
    await delay(150);
  }
  throw new Error('chrome did not open a debugging port');
}

function cdp(wsUrl) {
  const ws = new WebSocket(wsUrl);
  let next = 1;
  const pending = new Map();
  const logs = [];
  const ready = new Promise((resolve, reject) => {
    ws.addEventListener('open', () => resolve());
    ws.addEventListener('error', () => reject(new Error('cdp socket failed')));
  });
  ws.addEventListener('message', (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.id && pending.has(msg.id)) {
      pending.get(msg.id)(msg);
      pending.delete(msg.id);
    } else if (msg.method === 'Runtime.consoleAPICalled') {
      logs.push(msg.params.args.map((a) => a.value ?? a.description ?? '').join(' '));
    } else if (msg.method === 'Runtime.exceptionThrown') {
      logs.push('EXC ' + (msg.params.exceptionDetails?.exception?.description
        || msg.params.exceptionDetails?.text || 'exception'));
    }
  });
  function send(method, params = {}) {
    const id = next++;
    ws.send(JSON.stringify({ id, method, params }));
    return new Promise((resolve) => pending.set(id, resolve));
  }
  return { ready, send, logs, close: () => ws.close() };
}

await version();
const list = await (await fetch(`http://127.0.0.1:${PORT}/json`)).json();
const page = list.find((t) => t.type === 'page') || list[0];
const client = cdp(page.webSocketDebuggerUrl);
await client.ready;
await client.send('Page.enable');
await client.send('Runtime.enable');
await mkdir('shots', { recursive: true });

for (const [name, url, file] of shots) {
  client.logs.length = 0;
  await client.send('Page.navigate', { url });
  let state = '';
  for (let i = 0; i < 80; i += 1) {
    await delay(150);
    const ev = await client.send('Runtime.evaluate', {
      expression: 'window.__error ? ("ERR " + window.__error) : (window.__ready ? "ready" : "")',
      returnByValue: true,
    });
    state = ev.result?.result?.value || '';
    if (state) break;
  }
  if (state !== 'ready') {
    console.error(name, state || 'timed out', client.logs.slice(-12));
    process.exitCode = 1;
    continue;
  }
  await delay(400);
  const shot = await client.send('Page.captureScreenshot', { format: 'png' });
  const buf = Buffer.from(shot.result.data, 'base64');
  await writeFile(file, buf);
  console.log(name, file, buf.length, client.logs.filter((l) => /error|Error|EXC/i.test(l)).slice(0, 6).join(' | ') || 'ok');
}

client.close();
chrome.kill();
