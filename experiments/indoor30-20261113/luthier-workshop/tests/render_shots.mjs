import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const sceneDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const repo = resolve(sceneDir, '../../..');
const httpPort = 8766;
const cdpPort = 9336;
const width = 1440;
const height = 900;
const outDir = process.env.SHOT_DIR || '/opt/cursor/artifacts';
const shotsDir = resolve(sceneDir, 'shots');

const shots = [
  { name: 'luthier-workshop_default', file: 'toon_default.png', query: 'shot=1' },
  { name: 'luthier-workshop_corner', file: 'toon_corner.png', query: 'shot=1&cam=corner' },
  { name: 'luthier-workshop_close', file: 'toon_close.png', query: 'shot=1&cam=close' },
  { name: 'luthier-workshop_unlit', file: 'unlit_default.png', query: 'shot=1&mode=unlit' },
];

function wait(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function waitForHttp() {
  const url = `http://127.0.0.1:${httpPort}/experiments/indoor30-20261113/luthier-workshop/layout.json`;
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
        `exception: ${msg.params.exceptionDetails?.text || ''} ${msg.params.exceptionDetails?.exception?.description || ''}`
      );
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
  return { send, logs };
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
  const url = `http://127.0.0.1:${httpPort}/experiments/indoor30-20261113/luthier-workshop/?${query}`;
  await send('Page.navigate', { url });
  let state = null;
  for (let i = 0; i < 90; i++) {
    await wait(150);
    const result = await send('Runtime.evaluate', {
      expression: `({ ready: !!window.__ready, errors: window.__errors || [], status: document.getElementById('status')?.textContent || '', audit: window.__audit ? window.__audit() : null })`,
      returnByValue: true,
    });
    state = result.result.value;
    if (state?.errors?.length) throw new Error(state.errors.join(' | '));
    if (state?.ready) break;
  }
  if (!state?.ready) throw new Error('scene not ready: ' + JSON.stringify(state) + '\n' + logs.join('\n'));
  if (!state.audit || state.audit.meshes < 120 || state.audit.nan || state.audit.huge) {
    throw new Error('geometry audit failed: ' + JSON.stringify(state.audit));
  }
  if (query.includes('mode=unlit') && state.audit.mode !== 'unlit') {
    throw new Error('unlit shot stayed in ' + state.audit.mode);
  }
  await wait(500);
  const png = await send('Page.captureScreenshot', { format: 'png' });
  return { png: png.data, audit: state.audit, status: state.status };
}

const server = spawn('python3', ['-m', 'http.server', String(httpPort), '--bind', '127.0.0.1'], {
  cwd: repo,
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
    '--user-data-dir=/tmp/luthier-workshop-chrome',
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
    const { png, audit, status } = await shoot(send, logs, shot.query);
    const buf = Buffer.from(png, 'base64');
    const artifact = resolve(outDir, `${shot.name}.png`);
    await writeFile(artifact, buf);
    await writeFile(resolve(shotsDir, shot.file), buf);
    report.push({ shot: shot.name, status, bytes: buf.length, audit });
    console.log(`wrote ${artifact} (${buf.length} bytes) meshes=${audit.meshes}`);
  }
  await writeFile('/tmp/luthier-workshop-render-report.json', JSON.stringify({ report, logs }, null, 2));
  const bad = logs.filter((line) => /error|exception/i.test(line) && !/favicon/i.test(line));
  if (bad.length) {
    console.error(bad.join('\n'));
    process.exitCode = 1;
  }
  ws.close();
} finally {
  server.kill();
  chrome.kill();
}
