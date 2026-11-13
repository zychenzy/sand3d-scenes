import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const sceneDir = resolve(dirname(fileURLToPath(import.meta.url)));
const repoRoot = resolve(sceneDir, '../../..');
const httpPort = 8873;
const cdpPort = 9373;
const width = 1680;
const height = 1050;
const outDir = process.env.SHOT_DIR || '/opt/cursor/artifacts';
const shotsDir = resolve(sceneDir, 'shots');
const scenePath = '/experiments/indoor-20261113/badminton-hall/';

const allShots = [
  { name: 'badminton_toon_default', file: 'toon_default.png', query: 'shot=1' },
  { name: 'badminton_toon_corner', file: 'toon_corner.png', query: 'shot=1&cam=corner' },
  { name: 'badminton_toon_close', file: 'toon_close.png', query: 'shot=1&cam=close' },
  { name: 'badminton_unlit_default', file: 'unlit_default.png', query: 'shot=1&mode=unlit' },
];
const shots = process.env.SHOT ? allShots.filter((shot) => shot.file === process.env.SHOT || shot.name === process.env.SHOT) : allShots;

function wait(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function waitForHttp() {
  const url = `http://127.0.0.1:${httpPort}${scenePath}layout.json`;
  for (let i = 0; i < 50; i++) {
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
  const network = [];
  ws.addEventListener('message', (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.id && pending.has(msg.id)) {
      pending.get(msg.id)(msg);
      pending.delete(msg.id);
    } else if (msg.method === 'Runtime.consoleAPICalled') {
      const text = (msg.params.args || []).map((a) => a.value ?? a.description ?? '').join(' ');
      logs.push(`${msg.params.type}: ${text}`);
    } else if (msg.method === 'Runtime.exceptionThrown') {
      logs.push(
        `exception: ${msg.params.exceptionDetails?.text || ''} ${msg.params.exceptionDetails?.exception?.description || ''}`,
      );
    } else if (msg.method === 'Network.responseReceived') {
      const res = msg.params.response;
      network.push({ url: res.url, status: res.status });
    } else if (msg.method === 'Network.loadingFailed') {
      network.push({ url: msg.params.requestId, status: 0, error: msg.params.errorText, failed: true });
    }
  });
  function send(method, params = {}) {
    const msgId = ++id;
    return new Promise((resolvePromise, reject) => {
      const timer = setTimeout(() => reject(new Error(`cdp timeout ${method}`)), 25000);
      pending.set(msgId, (msg) => {
        clearTimeout(timer);
        if (msg.error) reject(new Error(JSON.stringify(msg.error)));
        else resolvePromise(msg.result);
      });
      ws.send(JSON.stringify({ id: msgId, method, params }));
    });
  }
  return { send, logs, network };
}

async function connectCdp() {
  for (let i = 0; i < 50; i++) {
    try {
      const list = await fetch(`http://127.0.0.1:${cdpPort}/json/list`).then((r) => r.json());
      const page = list.find((t) => t.type === 'page');
      if (page?.webSocketDebuggerUrl) {
        const ws = new WebSocket(page.webSocketDebuggerUrl);
        await new Promise((res, rej) => {
          ws.addEventListener('open', res);
          ws.addEventListener('error', rej);
        });
        ws.addEventListener('error', () => {});
        return ws;
      }
    } catch {
      /* chrome still booting */
    }
    await wait(150);
  }
  throw new Error('chrome devtools did not start');
}

async function shoot(send, logs, query) {
  const url = `http://127.0.0.1:${httpPort}${scenePath}?${query}`;
  await send('Page.navigate', { url });
  let state = null;
  for (let i = 0; i < 90; i++) {
    await wait(150);
    const result = await send('Runtime.evaluate', {
      expression: `({ ready: !!window.__ready, error: window.__bootError || null, status: document.getElementById('status')?.textContent || '', mode: document.getElementById('mode')?.textContent || '' })`,
      returnByValue: true,
    });
    state = result.result.value;
    if (state?.error) throw new Error(state.error);
    if (state?.ready) break;
  }
  if (!state?.ready) throw new Error(`scene not ready: ${JSON.stringify(state)}\n${logs.join('\n')}`);
  await wait(500);
  const bounds = await send('Runtime.evaluate', {
    expression: `({
      court1: window.__bounds('court-1'),
      court2: window.__bounds('court-2'),
      net1: window.__bounds('net-1'),
      door: window.__bounds('door'),
      gear: window.__bounds('gear_case'),
      bench: window.__bounds('bench_near')
    })`,
    returnByValue: true,
  });
  const png = await send('Page.captureScreenshot', { format: 'png' });
  return { png: png.data, bounds: bounds.result.value, status: state.status, mode: state.mode };
}

const server = spawn('python3', ['-m', 'http.server', String(httpPort), '--bind', '127.0.0.1'], {
  cwd: repoRoot,
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
    '--user-data-dir=/tmp/badminton-hall-chrome',
    '--no-first-run',
    'about:blank',
  ],
  { stdio: 'ignore' },
);

try {
  await waitForHttp();
  const ws = await connectCdp();
  const { send, logs, network } = cdp(ws);
  await send('Page.enable');
  await send('Runtime.enable');
  await send('Network.enable');
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
    let png, bounds, status, mode;
    let lastErr;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        ({ png, bounds, status, mode } = await shoot(send, logs, shot.query));
        lastErr = null;
        break;
      } catch (err) {
        lastErr = err;
        console.error(`retry ${shot.name} (${attempt + 1}): ${err.message}`);
        await wait(400);
      }
    }
    if (lastErr) throw lastErr;
    const buf = Buffer.from(png, 'base64');
    const artifact = resolve(outDir, `${shot.name}.png`);
    await writeFile(artifact, buf);
    await writeFile(resolve(shotsDir, shot.file), buf);
    report.push({ shot: shot.name, status, mode, bytes: buf.length, bounds });
    console.log(`wrote ${artifact} and shots/${shot.file} (${buf.length} bytes) mode=${mode}`);
  }
  const badNet = network.filter((entry) => {
    const url = entry.url || '';
    if (url.includes('favicon')) return false;
    if (!url.includes('badminton-hall') && !url.includes('/gym/vendor/') && !url.includes('/museum/') && !url.includes('/library/') && !url.includes('/cowork/') && !url.includes('/cafe/')) {
      return false;
    }
    return entry.failed || entry.status >= 400 || entry.status === 0;
  });
  const reportName = shots.length === 1 ? `/tmp/badminton-hall-render-${shots[0].file}.json` : '/tmp/badminton-hall-render-report.json';
  await writeFile(reportName, JSON.stringify({ report, logs, badNet, network: network.slice(-40) }, null, 2));
  const badLogs = logs.filter((line) => /error|exception/i.test(line) && !/favicon/i.test(line));
  if (badLogs.length || badNet.length) {
    console.error(badLogs.join('\n'));
    console.error(JSON.stringify(badNet, null, 2));
    process.exitCode = 1;
  }
  ws.close();
} finally {
  server.kill('SIGTERM');
  chrome.kill('SIGTERM');
}
