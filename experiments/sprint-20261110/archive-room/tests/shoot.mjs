import { spawn } from 'node:child_process';
import fs from 'node:fs';
import { setTimeout as delay } from 'node:timers/promises';

const base = process.argv[2];
const outDir = process.argv[3] || '/opt/cursor/artifacts';
if (!base) {
  console.error('usage: node tests/shoot.mjs http://host/path/ /opt/cursor/artifacts');
  process.exit(1);
}
fs.mkdirSync(outDir, { recursive: true });

const shots = [
  ['archive-room_default.png', '?bare=1'],
  ['archive-room_corner.png', '?bare=1&cam=corner'],
  ['archive-room_close.png', '?bare=1&cam=close'],
  ['archive-room_unlit.png', '?bare=1&mode=unlit'],
];

const chrome = spawn('/usr/local/bin/google-chrome', [
  '--headless=new',
  '--no-sandbox',
  '--disable-dev-shm-usage',
  '--use-gl=angle',
  '--use-angle=swiftshader',
  '--remote-debugging-port=9222',
  '--window-size=1440,900',
  '--user-data-dir=/tmp/archive-room-chrome',
  'about:blank',
], { stdio: 'ignore' });

function connect(wsUrl) {
  const ws = new WebSocket(wsUrl);
  const pending = new Map();
  const logs = [];
  let id = 0;
  const ready = new Promise((resolve, reject) => {
    ws.addEventListener('open', () => resolve(ws));
    ws.addEventListener('error', () => reject(new Error('ws error')));
  });
  ws.addEventListener('message', (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.method === 'Runtime.exceptionThrown') logs.push('EXC ' + JSON.stringify(msg.params.exceptionDetails).slice(0, 400));
    if (msg.method === 'Runtime.consoleAPICalled' && msg.params.type === 'error') {
      logs.push('ERR ' + msg.params.args.map((a) => a.value || a.description || '').join(' ').slice(0, 300));
    }
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      if (msg.error) reject(new Error(JSON.stringify(msg.error)));
      else resolve(msg.result);
    }
  });
  function send(method, params = {}) {
    const msgId = ++id;
    ws.send(JSON.stringify({ id: msgId, method, params }));
    return new Promise((resolve, reject) => pending.set(msgId, { resolve, reject }));
  }
  return { ready, send, logs, ws };
}

let session;
try {
  let page = null;
  for (let i = 0; i < 40 && !page; i++) {
    await delay(250);
    try {
      const list = await fetch('http://127.0.0.1:9222/json/list').then((r) => r.json());
      page = list.find((t) => t.type === 'page');
    } catch { /* chrome still booting */ }
  }
  if (!page) throw new Error('no chrome page');
  session = connect(page.webSocketDebuggerUrl);
  await session.ready;
  await session.send('Runtime.enable');
  await session.send('Page.enable');
  await session.send('Emulation.setDeviceMetricsOverride', {
    width: 1440, height: 900, deviceScaleFactor: 1, mobile: false,
  });

  for (const [name, query] of shots) {
    const url = base.replace(/\/?$/, '/') + query;
    await session.send('Page.navigate', { url });
    let ok = false;
    let detail = '';
    for (let i = 0; i < 40; i++) {
      await delay(500);
      const res = await session.send('Runtime.evaluate', {
        expression: 'JSON.stringify({ready: window.__ready === true, failed: (window.__scene && window.__scene.failed) || [], status: (document.getElementById("status")||{}).textContent || ""})',
        returnByValue: true,
      });
      detail = res.result?.value || '';
      const parsed = detail ? JSON.parse(detail) : {};
      if (parsed.ready) { ok = true; break; }
      if (parsed.failed && parsed.failed.length) break;
    }
    if (!ok) {
      console.error('NOT READY', name, detail, session.logs.join('\n'));
      process.exitCode = 1;
      break;
    }
    await delay(400);
    const shot = await session.send('Page.captureScreenshot', { format: 'png' });
    const file = outDir + '/' + name;
    fs.writeFileSync(file, Buffer.from(shot.data, 'base64'));
    console.log('wrote', file, fs.statSync(file).size);
  }
  if (session.logs.length) console.log('CONSOLE\n' + session.logs.join('\n'));
} finally {
  try { session?.ws.close(); } catch { /* ignore */ }
  chrome.kill('SIGKILL');
}
