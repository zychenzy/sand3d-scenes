import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const sceneDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const httpPort = 8787;
const cdpPort = 9334;
const width = 1680;
const height = 1050;
const outDir = process.env.SHOT_DIR || '/opt/cursor/artifacts';
const shotsDir = resolve(sceneDir, 'shots');

const shots = [
  { name: 'yoga-skylight_default', file: 'toon_default.png', query: 'shot=1' },
  { name: 'yoga-skylight_corner', file: 'toon_corner.png', query: 'shot=1&cam=corner' },
  { name: 'yoga-skylight_close', file: 'toon_close.png', query: 'shot=1&cam=close' },
  { name: 'yoga-skylight_unlit', file: 'unlit_default.png', query: 'shot=1&mode=unlit' },
];

function wait(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function waitForHttp() {
  const url = `http://127.0.0.1:${httpPort}/layout.json`;
  for (let i = 0; i < 40; i++) {
    try {
      const res = await fetch(url);
      if (res.ok) return;
    } catch {
      /* server still booting */
    }
    await wait(150);
  }
  throw new Error('http server did not start');
}

function cdp(ws) {
  let id = 0;
  const pending = new Map();
  const logs = [];
  ws.addEventListener('message', (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.id && pending.has(msg.id)) {
      pending.get(msg.id)(msg);
      pending.delete(msg.id);
    } else if (msg.method === 'Runtime.consoleAPICalled') {
      const text = (msg.params.args || []).map((a) => a.value ?? a.description ?? '').join(' ');
      logs.push(`${msg.params.type}: ${text}`);
    } else if (msg.method === 'Runtime.exceptionThrown') {
      logs.push(`exception: ${msg.params.exceptionDetails?.text || ''} ${msg.params.exceptionDetails?.exception?.description || ''}`);
    }
  });
  function send(method, params = {}) {
    const msgId = ++id;
    return new Promise((resolvePromise, reject) => {
      const timer = setTimeout(() => reject(new Error(`cdp timeout ${method}`)), 20000);
      pending.set(msgId, (msg) => {
        clearTimeout(timer);
        if (msg.error) reject(new Error(JSON.stringify(msg.error)));
        else resolvePromise(msg.result);
      });
      ws.send(JSON.stringify({ id: msgId, method, params }));
    });
  }
  return { send, logs };
}

async function connectCdp() {
  for (let i = 0; i < 40; i++) {
    try {
      const list = await fetch(`http://127.0.0.1:${cdpPort}/json/list`).then((r) => r.json());
      const page = list.find((t) => t.type === 'page');
      if (page?.webSocketDebuggerUrl) {
        const ws = new WebSocket(page.webSocketDebuggerUrl);
        await new Promise((res, rej) => {
          ws.addEventListener('open', res);
          ws.addEventListener('error', rej);
        });
        return ws;
      }
    } catch {
      /* chrome still booting */
    }
    await wait(150);
  }
  throw new Error('chrome devtools did not start');
}

async function shoot(send, query) {
  const url = `http://127.0.0.1:${httpPort}/?${query}`;
  await send('Page.navigate', { url });
  let state = null;
  for (let i = 0; i < 80; i++) {
    await wait(150);
    const result = await send('Runtime.evaluate', {
      expression: `({ ready: !!window.__ready, error: window.__bootError || null, status: document.getElementById('status')?.textContent || '' })`,
      returnByValue: true,
    });
    state = result.result.value;
    if (state?.error) throw new Error(state.error);
    if (state?.ready) break;
  }
  if (!state?.ready) throw new Error('scene not ready: ' + JSON.stringify(state) + '\n' + logs.join('\n'));
  await wait(400);
  const bounds = await send('Runtime.evaluate', {
    expression: `({
      bench: window.__bounds('bench_niche'),
      shelf: window.__bounds('shelf_niche'),
      potA: window.__bounds('pot_altar'),
      potF: window.__bounds('pot_floor'),
      thermos: window.__bounds('thermos'),
      pendN: window.__bounds('pendant_niche'),
      pendS: window.__bounds('pendant_store'),
      plat: window.__bounds('instructor-platform')
    })`,
    returnByValue: true,
  });
  const png = await send('Page.captureScreenshot', { format: 'png' });
  return { png: png.data, bounds: bounds.result.value, status: state.status };
}

const server = spawn('python3', ['-m', 'http.server', String(httpPort), '--bind', '127.0.0.1'], {
  cwd: sceneDir,
  stdio: 'ignore',
});
const chrome = spawn(
  'google-chrome',
  [
    '--headless=new',
    '--no-sandbox',
    '--disable-dev-shm-usage',
    '--use-gl=angle',
    '--use-angle=swiftshader',
    '--enable-webgl',
    '--ignore-gpu-blocklist',
    '--hide-scrollbars',
    `--window-size=${width},${height}`,
    `--remote-debugging-port=${cdpPort}`,
    '--user-data-dir=/tmp/yoga-chrome-profile',
    '--no-first-run',
    'about:blank',
  ],
  { stdio: 'ignore' }
);

try {
  await waitForHttp();
  const ws = await connectCdp();
  const { send, logs } = cdp(ws);
  await send('Page.enable');
  await send('Runtime.enable');
  await send('Emulation.setDeviceMetricsOverride', {
    width,
    height,
    deviceScaleFactor: 1,
    mobile: false,
  });
  await mkdir(outDir, { recursive: true });
  await mkdir(shotsDir, { recursive: true });
  const report = [];
  for (const shot of shots) {
    const { png, bounds, status } = await shoot(send, shot.query);
    const buf = Buffer.from(png, 'base64');
    const artifact = resolve(outDir, `${shot.name}.png`);
    await writeFile(artifact, buf);
    await writeFile(resolve(shotsDir, shot.file), buf);
    report.push({ shot: shot.name, status, bytes: buf.length, bounds });
    console.log(`wrote ${artifact} (${buf.length} bytes)`);
  }
  await writeFile('/tmp/yoga-render-report.json', JSON.stringify({ report, logs }, null, 2));
  const bad = logs.filter((line) => /error|exception/i.test(line) && !/favicon/i.test(line));
  if (bad.length) {
    console.error(bad.join('\n'));
    process.exitCode = 1;
  }
  ws.close();
} finally {
  server.kill('SIGTERM');
  chrome.kill('SIGTERM');
}
