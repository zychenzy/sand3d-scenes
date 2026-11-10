import { spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';
import { mkdir, writeFile, copyFile } from 'node:fs/promises';
import path from 'node:path';

const PORT = Number(process.env.CHROME_PORT || 9334);
const BASE = process.env.LODGE_URL || 'http://127.0.0.1:8794/';
const OUT = path.resolve('shots');
const ART = '/opt/cursor/artifacts';

const VIEWS = [
  { name: 'toon_default', query: '?debug=1' },
  { name: 'toon_corner', query: '?cam=corner' },
  { name: 'toon_close', query: '?cam=close' },
  { name: 'unlit_default', query: '?mode=unlit' },
];

function startChrome() {
  return spawn('google-chrome', [
    '--headless=new',
    '--no-sandbox',
    '--disable-dev-shm-usage',
    '--disable-gpu',
    '--use-gl=angle',
    '--use-angle=swiftshader',
    '--enable-unsafe-swiftshader',
    `--remote-debugging-port=${PORT}`,
    '--window-size=1440,900',
    `--user-data-dir=/tmp/chrome-lodge-${PORT}`,
    '--no-first-run',
    'about:blank',
  ], { stdio: 'ignore' });
}

async function version() {
  for (let i = 0; i < 50; i++) {
    try {
      const r = await fetch(`http://127.0.0.1:${PORT}/json/version`);
      if (r.ok) return r.json();
    } catch { /* retry */ }
    await sleep(120);
  }
  throw new Error('Chrome debug port did not open');
}

async function openPage(url) {
  const r = await fetch(`http://127.0.0.1:${PORT}/json/new?${encodeURIComponent(url)}`, { method: 'PUT' });
  if (!r.ok) {
    const r2 = await fetch(`http://127.0.0.1:${PORT}/json/new?${encodeURIComponent(url)}`);
    if (!r2.ok) throw new Error('json/new failed ' + r.status);
    return r2.json();
  }
  return r.json();
}

function cdp(wsUrl) {
  const ws = new WebSocket(wsUrl);
  let seq = 0;
  const pending = new Map();
  const logs = [];
  const net = [];
  ws.addEventListener('message', (ev) => {
    const data = JSON.parse(ev.data);
    if (data.id && pending.has(data.id)) {
      pending.get(data.id)(data);
      pending.delete(data.id);
      return;
    }
    if (data.method === 'Runtime.consoleAPICalled') {
      const text = (data.params.args || []).map((a) => a.value || a.description || '').join(' ');
      logs.push(text);
    } else if (data.method === 'Runtime.exceptionThrown') {
      logs.push('EXC ' + (data.params.exceptionDetails?.text || '') + ' ' + (data.params.exceptionDetails?.exception?.description || ''));
    } else if (data.method === 'Network.loadingFailed') {
      net.push(data.params.errorText + ' ' + data.params.type);
    }
  });
  const ready = new Promise((resolve, reject) => {
    ws.addEventListener('open', resolve);
    ws.addEventListener('error', () => reject(new Error('ws error')));
  });
  async function send(method, params = {}) {
    await ready;
    const id = ++seq;
    const result = new Promise((resolve) => pending.set(id, resolve));
    ws.send(JSON.stringify({ id, method, params }));
    const msg = await result;
    if (msg.error) throw new Error(method + ' ' + JSON.stringify(msg.error));
    return msg.result;
  }
  return { ws, send, logs, net };
}

async function shoot(view) {
  const url = BASE + view.query;
  const page = await openPage(url);
  const client = cdp(page.webSocketDebuggerUrl);
  await client.send('Runtime.enable');
  await client.send('Network.enable');
  await client.send('Page.enable');
  await client.send('Emulation.setDeviceMetricsOverride', {
    width: 1440, height: 900, deviceScaleFactor: 1, mobile: false,
  });
  let state = null;
  for (let i = 0; i < 80; i++) {
    const ev = await client.send('Runtime.evaluate', {
      expression: `({ ready: !!window.__sceneReady, error: window.__sceneError || null, status: document.getElementById('status') && document.getElementById('status').textContent, bounds: window.__bounds || null })`,
      returnByValue: true,
    });
    state = ev.result.value;
    if (state.ready || (state.error && i > 4)) break;
    await sleep(200);
  }
  await sleep(350);
  const shot = await client.send('Page.captureScreenshot', { format: 'png' });
  const buf = Buffer.from(shot.data, 'base64');
  const file = path.join(OUT, `${view.name}.png`);
  await writeFile(file, buf);
  await copyFile(file, path.join(ART, `mountain-lodge_${view.name}.png`));
  client.ws.close();
  try { await fetch(`http://127.0.0.1:${PORT}/json/close/${page.id}`); } catch { /* ok */ }
  return { view: view.name, state, logs: client.logs, net: client.net, bytes: buf.length };
}

const chrome = startChrome();
try {
  await mkdir(OUT, { recursive: true });
  await mkdir(ART, { recursive: true });
  await version();
  const results = [];
  for (const view of VIEWS) results.push(await shoot(view));
  for (const r of results) {
    console.log('\n==', r.view, r.bytes, 'bytes');
    console.log('status:', r.state && r.state.status);
    if (r.state && r.state.error) console.log('ERROR', r.state.error);
    if (r.state && r.state.bounds) console.log(r.state.bounds.join('\n'));
    if (r.logs.length) console.log('console:', r.logs.slice(0, 12).join('\n'));
    if (r.net.length) console.log('netfail:', r.net.join('\n'));
  }
} finally {
  chrome.kill('SIGKILL');
}
