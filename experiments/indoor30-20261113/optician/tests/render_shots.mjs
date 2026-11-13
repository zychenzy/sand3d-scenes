import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const sceneDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const httpPort = 8797;
const cdpPort = 9357;
const width = 1680;
const height = 1050;
const outDir = process.env.SHOT_DIR || '/opt/cursor/artifacts';
const shotsDir = path.join(sceneDir, 'shots');

const shots = [
  { name: 'optician_toon_default', file: 'toon_default.png', query: 'shot=1&dpr=1' },
  { name: 'optician_toon_corner', file: 'toon_corner.png', query: 'shot=1&dpr=1&cam=corner' },
  { name: 'optician_toon_close', file: 'toon_close.png', query: 'shot=1&dpr=1&cam=close' },
  { name: 'optician_unlit_default', file: 'unlit_default.png', query: 'shot=1&dpr=1&mode=unlit' },
];

function wait(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function waitForHttp() {
  const url = `http://127.0.0.1:${httpPort}/layout.json`;
  for (let i = 0; i < 50; i++) {
    try {
      const res = await fetch(url);
      if (res.ok) return;
    } catch {
      /* booting */
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
      const timer = setTimeout(() => reject(new Error(`cdp timeout ${method}`)), 30000);
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
      /* chrome booting */
    }
    await wait(150);
  }
  throw new Error('chrome devtools did not start');
}

async function shoot(send, logs, query) {
  await send('Page.navigate', { url: `http://127.0.0.1:${httpPort}/?${query}` });
  let state = null;
  for (let i = 0; i < 100; i++) {
    await wait(200);
    const result = await send('Runtime.evaluate', {
      expression: `({ ready: !!window.__shotReady, error: (window.__errors && window.__errors[0]) || null, status: document.getElementById('status')?.textContent || '' })`,
      returnByValue: true,
    });
    state = result.result.value;
    if (state?.error) throw new Error(state.error);
    if (state?.ready) break;
  }
  if (!state?.ready) throw new Error(`scene not ready: ${JSON.stringify(state)}\n${logs.join('\n')}`);
  await wait(400);
  const audit = await send('Runtime.evaluate', {
    expression: `({ audit: window.__audit(), mirror: window.__bounds('mirror-glass'), fit: window.__bounds('chair_fitting'), patient: window.__bounds('exam-chair'), chart: window.__bounds('chart'), phoropter: window.__bounds('phoropter') })`,
    returnByValue: true,
  });
  const info = audit.result.value;
  if (!info?.audit) throw new Error(`audit failed ${JSON.stringify(audit)}`);
  if (info.audit.errors?.length) throw new Error(info.audit.errors.join(' | '));
  if (info.audit.nan) throw new Error(`non-finite meshes ${info.audit.nan}`);
  if (!info.audit.mirrorOK) throw new Error('mirror has no reflection texture');
  if (info.audit.frames < 20) throw new Error(`too few frames ${JSON.stringify(info)}`);
  if (info.audit.meshes < 40) throw new Error(`too few meshes ${info.audit.meshes}`);
  if (query.includes('mode=unlit')) {
    if (info.audit.mode !== 'unlit') throw new Error('unlit shot is not unlit');
    if (info.audit.basic < 10) throw new Error('unlit materials missing');
  } else if (info.audit.toon < 10) {
    throw new Error('toon materials missing');
  }
  const png = await send('Page.captureScreenshot', { format: 'png' });
  return { png: png.data, info };
}

const server = spawn('python3', ['-m', 'http.server', String(httpPort), '--bind', '127.0.0.1'], {
  cwd: sceneDir,
  stdio: 'ignore',
});
const chrome = spawn('google-chrome', [
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
  '--user-data-dir=/tmp/optician-chrome-3',
  '--no-first-run',
  'about:blank',
], { stdio: 'ignore' });

try {
  await waitForHttp();
  const ws = await connectCdp();
  const { send, logs } = cdp(ws);
  await send('Page.enable');
  await send('Runtime.enable');
  await send('Network.enable');
  await send('Network.setCacheDisabled', { cacheDisabled: true });
  await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: false });
  await mkdir(outDir, { recursive: true });
  await mkdir(shotsDir, { recursive: true });
  const report = [];
  for (const shot of shots) {
    const { png, info } = await shoot(send, logs, shot.query);
    const buf = Buffer.from(png, 'base64');
    if (buf.length < 20000) throw new Error(`${shot.name} is only ${buf.length} bytes`);
    const artifact = path.join(outDir, `${shot.name}.png`);
    await writeFile(artifact, buf);
    await writeFile(path.join(shotsDir, shot.file), buf);
    report.push({ shot: shot.name, bytes: buf.length, audit: info.audit, bounds: { mirror: info.mirror, fit: info.fit, patient: info.patient, chart: info.chart, phoropter: info.phoropter } });
    console.log(`wrote ${artifact} (${buf.length} bytes) frames=${info.audit.frames} mode=${info.audit.mode}`);
  }
  await writeFile('/tmp/optician-render-report.json', JSON.stringify({ report, logs }, null, 2));
  const bad = logs.filter((line) => /error|exception/i.test(line) && !/favicon/i.test(line));
  if (bad.length) {
    console.error(bad.join('\n'));
    process.exitCode = 1;
  }
} finally {
  server.kill();
  chrome.kill();
}
