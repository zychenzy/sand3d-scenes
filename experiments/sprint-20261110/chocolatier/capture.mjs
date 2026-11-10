/**
 * Headless screenshots. Serves nothing; point it at an already running scene.
 *   node capture.mjs http://127.0.0.1:8791
 */
import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';

const BASE = (process.argv[2] || 'http://127.0.0.1:8791').replace(/\/$/, '');
const PORT = 9333;
const OUT_DIRS = [
  '/opt/cursor/artifacts',
  new URL('./shots', import.meta.url).pathname,
];
const VIEWS = [
  ['default', `${BASE}/?cam=default`],
  ['corner', `${BASE}/?cam=corner`],
  ['close', `${BASE}/?cam=close`],
  ['unlit', `${BASE}/?mode=unlit`],
];

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

const chrome = spawn('google-chrome', [
  '--headless=new',
  '--no-sandbox',
  '--disable-dev-shm-usage',
  '--disable-gpu',
  '--use-gl=angle',
  '--use-angle=swiftshader',
  '--remote-debugging-port=' + PORT,
  '--user-data-dir=/tmp/chrome-chocolatier',
  '--window-size=1440,900',
  '--hide-scrollbars',
  'about:blank',
], { stdio: 'ignore' });

class Cdp {
  constructor(url) {
    this.ws = new WebSocket(url);
    this.next = 1;
    this.wait = new Map();
    this.ready = new Promise((res, rej) => {
      this.ws.addEventListener('open', res);
      this.ws.addEventListener('error', rej);
    });
    this.ws.addEventListener('message', (ev) => {
      const msg = JSON.parse(ev.data);
      if (msg.id && this.wait.has(msg.id)) {
        const { resolve, reject } = this.wait.get(msg.id);
        this.wait.delete(msg.id);
        if (msg.error) reject(new Error(JSON.stringify(msg.error)));
        else resolve(msg.result);
      }
    });
  }
  async send(method, params = {}) {
    await this.ready;
    const id = this.next++;
    this.ws.send(JSON.stringify({ id, method, params }));
    return new Promise((resolve, reject) => this.wait.set(id, { resolve, reject }));
  }
}

async function connect() {
  for (let i = 0; i < 40; i++) {
    try {
      const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
      const page = list.find((t) => t.type === 'page');
      if (page?.webSocketDebuggerUrl) return new Cdp(page.webSocketDebuggerUrl);
    } catch { /* chrome still booting */ }
    await sleep(200);
  }
  throw new Error('chrome devtools did not open');
}

async function shoot(cdp, url) {
  await cdp.send('Page.enable');
  await cdp.send('Runtime.enable');
  await cdp.send('Page.addScriptToEvaluateOnNewDocument', {
    source: 'window.__errors=[];addEventListener("error",e=>window.__errors.push(String(e.message)));addEventListener("unhandledrejection",e=>window.__errors.push(String(e.reason&&e.reason.message||e.reason)));',
  });
  await cdp.send('Emulation.setDeviceMetricsOverride', {
    width: 1440, height: 900, deviceScaleFactor: 1, mobile: false,
  });
  await cdp.send('Page.navigate', { url });
  let status = '';
  for (let i = 0; i < 50; i++) {
    await sleep(200);
    const ready = await cdp.send('Runtime.evaluate', {
      expression: '({ready: window.__sceneReady === true, status: document.getElementById("status")?.textContent || "", errors: window.__errors || []})',
      returnByValue: true,
    });
    status = ready.result.value.status;
    const pageErrors = ready.result.value.errors || [];
    if (pageErrors.length) throw new Error(pageErrors.join(' | '));
    if (ready.result.value.ready) break;
    if (String(status).startsWith('error:')) throw new Error(status);
  }
  if (!status.startsWith('ready')) throw new Error(`scene not ready: ${status}`);
  await sleep(400);
  const shot = await cdp.send('Page.captureScreenshot', { format: 'png' });
  const logs = await cdp.send('Runtime.evaluate', {
    expression: 'performance.getEntriesByType("resource").filter(r => r.name.includes(".glb") && r.transferSize === 0 && r.decodedBodySize === 0).map(r => r.name)',
    returnByValue: true,
  });
  return { png: Buffer.from(shot.data, 'base64'), status, suspicious: logs.result.value };
}

try {
  const cdp = await connect();
  for (const dir of OUT_DIRS) mkdirSync(dir, { recursive: true });
  for (const [name, url] of VIEWS) {
    const { png, status, suspicious } = await shoot(cdp, url);
    if (suspicious.length) console.log(name, 'empty glb responses', suspicious);
    for (const dir of OUT_DIRS) {
      const file = `${dir}/chocolatier_${name}.png`;
      writeFileSync(file, png);
      console.log(file, png.length, status);
    }
  }
} finally {
  chrome.kill('SIGTERM');
}
