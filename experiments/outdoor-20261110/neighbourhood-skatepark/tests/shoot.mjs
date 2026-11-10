import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';

const base = process.argv[2] || 'http://127.0.0.1:8766/experiments/outdoor-20261110/neighbourhood-skatepark/';
const outDir = process.argv[3] || new URL('../shots/', import.meta.url).pathname;
const port = 9333;

const shots = [
  ['toon_default', ''],
  ['toon_corner', '?cam=corner'],
  ['toon_close', '?cam=close'],
  ['unlit_default', '?mode=unlit'],
];

function wait(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

const chrome = spawn('/usr/bin/google-chrome', [
  '--headless=new',
  `--remote-debugging-port=${port}`,
  '--no-sandbox',
  '--disable-dev-shm-usage',
  '--use-gl=angle',
  '--use-angle=swiftshader',
  '--window-size=1280,800',
  '--force-device-scale-factor=1',
  '--hide-scrollbars',
  'about:blank',
], { stdio: 'ignore' });

let nextId = 1;
function cdp(ws, method, params = {}) {
  const id = nextId++;
  return new Promise((resolve, reject) => {
    const onMsg = (ev) => {
      const msg = JSON.parse(ev.data);
      if (msg.id !== id) return;
      ws.removeEventListener('message', onMsg);
      if (msg.error) reject(new Error(JSON.stringify(msg.error)));
      else resolve(msg.result);
    };
    ws.addEventListener('message', onMsg);
    ws.send(JSON.stringify({ id, method, params }));
  });
}

try {
  let wsUrl = '';
  for (let i = 0; i < 40; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/json/version`);
      const json = await res.json();
      wsUrl = json.webSocketDebuggerUrl;
      break;
    } catch {
      await wait(150);
    }
  }
  if (!wsUrl) throw new Error('chrome devtools did not start');
  const list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
  const page = list.find((t) => t.type === 'page') || list[0];
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    ws.addEventListener('open', resolve);
    ws.addEventListener('error', reject);
  });
  await cdp(ws, 'Page.enable');
  await cdp(ws, 'Runtime.enable');
  await cdp(ws, 'Emulation.setDeviceMetricsOverride', {
    width: 1440,
    height: 900,
    deviceScaleFactor: 1,
    mobile: false,
  });
  await mkdir(outDir, { recursive: true });

  for (const [name, query] of shots) {
    const url = base + query;
    await cdp(ws, 'Page.navigate', { url });
    let ready = false;
    let detail = '';
    for (let i = 0; i < 80; i++) {
      await wait(150);
      const result = await cdp(ws, 'Runtime.evaluate', {
        expression: `(() => {
          const s = document.getElementById('status')?.textContent || '';
          return JSON.stringify({ s, ready: !!window.__scene?.ready, err: s.startsWith('error') });
        })()`,
        returnByValue: true,
      });
      const info = JSON.parse(result.result.value);
      detail = info.s;
      if (info.err) throw new Error(`${name}: ${info.s}`);
      if (info.ready) { ready = true; break; }
    }
    if (!ready) throw new Error(`${name} did not become ready (${detail})`);
    await wait(400);
    const shot = await cdp(ws, 'Page.captureScreenshot', { format: 'png' });
    const file = `${outDir.replace(/\/$/, '')}/${name}.png`;
    await writeFile(file, Buffer.from(shot.data, 'base64'));
    console.log(name, detail, file);
  }
  ws.close();
} finally {
  chrome.kill('SIGKILL');
}
