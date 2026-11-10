import { spawn } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import http from 'node:http';

const port = 9222;
const shots = [
  ['http://127.0.0.1:8788/experiments/sprint-20261110/podcast-lounge/', '/opt/cursor/artifacts/podcast-lounge_toon_default.png'],
  ['http://127.0.0.1:8788/experiments/sprint-20261110/podcast-lounge/?cam=corner', '/opt/cursor/artifacts/podcast-lounge_toon_corner.png'],
  ['http://127.0.0.1:8788/experiments/sprint-20261110/podcast-lounge/?cam=close', '/opt/cursor/artifacts/podcast-lounge_toon_close.png'],
  ['http://127.0.0.1:8788/experiments/sprint-20261110/podcast-lounge/?mode=unlit', '/opt/cursor/artifacts/podcast-lounge_unlit_default.png'],
];

function get(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let d = '';
      res.on('data', (c) => { d += c; });
      res.on('end', () => resolve(d));
    }).on('error', reject);
  });
}

async function waitFor(url) {
  for (let i = 0; i < 40; i++) {
    try {
      await get(url);
      return;
    } catch {
      await new Promise((r) => setTimeout(r, 150));
    }
  }
  throw new Error(`timeout ${url}`);
}

class Cdp {
  constructor(wsUrl) {
    this.ws = new WebSocket(wsUrl);
    this.id = 0;
    this.pending = new Map();
    this.events = [];
    this.ws.onmessage = (ev) => {
      const msg = JSON.parse(ev.data);
      if (msg.id && this.pending.has(msg.id)) {
        const { resolve, reject } = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        if (msg.error) reject(new Error(JSON.stringify(msg.error)));
        else resolve(msg.result);
      } else if (msg.method) this.events.push(msg);
    };
  }
  open() {
    return new Promise((resolve, reject) => {
      this.ws.onopen = resolve;
      this.ws.onerror = reject;
    });
  }
  send(method, params = {}) {
    const id = ++this.id;
    this.ws.send(JSON.stringify({ id, method, params }));
    return new Promise((resolve, reject) => this.pending.set(id, { resolve, reject }));
  }
}

const chrome = spawn('google-chrome', [
  '--headless=new',
  '--disable-gpu',
  '--no-sandbox',
  '--remote-debugging-port=9222',
  '--window-size=1440,900',
  '--user-data-dir=/tmp/chrome-podcast-lounge',
  'about:blank',
], { stdio: 'ignore' });

await waitFor(`http://127.0.0.1:${port}/json/version`);
const ver = JSON.parse(await get(`http://127.0.0.1:${port}/json/version`));
const cdp = new Cdp(ver.webSocketDebuggerUrl);
await cdp.open();

const problems = [];
for (const [url, file] of shots) {
  const { targetId } = await cdp.send('Target.createTarget', { url: 'about:blank' });
  const { webSocketDebuggerUrl } = (JSON.parse(await get(`http://127.0.0.1:${port}/json/list`))).find((t) => t.id === targetId);
  const page = new Cdp(webSocketDebuggerUrl);
  await page.open();
  await page.send('Page.enable');
  await page.send('Runtime.enable');
  await page.send('Network.enable');
  page.ws.addEventListener('message', (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.method === 'Runtime.exceptionThrown') {
      problems.push(`${url} exception ${msg.params.exceptionDetails.text} ${msg.params.exceptionDetails.exception?.description || ''}`);
    }
    if (msg.method === 'Runtime.consoleAPICalled' && msg.params.type === 'error') {
      problems.push(`${url} console ${msg.params.args.map((a) => a.value || a.description).join(' ')}`);
    }
    if (msg.method === 'Network.loadingFailed') {
      problems.push(`${url} net ${msg.params.errorText} ${msg.params.type}`);
    }
  });
  await page.send('Page.navigate', { url });
  let status = '';
  for (let i = 0; i < 40; i++) {
    await new Promise((r) => setTimeout(r, 250));
    const res = await page.send('Runtime.evaluate', {
      expression: 'document.getElementById("status")?.textContent || ""',
      returnByValue: true,
    });
    status = res.result.value || '';
    if (status.startsWith('ready') || status.startsWith('asset failed')) break;
  }
  await new Promise((r) => setTimeout(r, 400));
  const shot = await page.send('Page.captureScreenshot', { format: 'png' });
  writeFileSync(file, Buffer.from(shot.data, 'base64'));
  console.log(file, status);
  await page.send('Target.closeTarget', { targetId }).catch(() => {});
  page.ws.close();
}

console.log('PROBLEMS');
for (const p of problems) console.log(p);
chrome.kill();
process.exit(problems.length ? 1 : 0);
