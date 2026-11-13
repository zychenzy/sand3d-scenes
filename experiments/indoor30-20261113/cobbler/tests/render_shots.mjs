import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const sceneDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const repoRoot = resolve(sceneDir, '../../..');
const httpPort = 8796;
const cdpPort = 9346;
const width = 1680;
const height = 1050;
const shotsDir = resolve(sceneDir, 'shots');
const outDir = process.env.SHOT_DIR || '/opt/cursor/artifacts';

const shots = [
  { name: 'cobbler_default', file: 'toon_default.png', query: 'hud=0', expect: 'toon' },
  { name: 'cobbler_corner', file: 'toon_corner.png', query: 'hud=0&cam=corner', expect: 'toon' },
  { name: 'cobbler_close', file: 'toon_close.png', query: 'hud=0&cam=close', expect: 'toon' },
  { name: 'cobbler_unlit', file: 'unlit_default.png', query: 'hud=0&mode=unlit', expect: 'unlit' },
];

const page = `http://127.0.0.1:${httpPort}/experiments/indoor30-20261113/cobbler/`;

function wait(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function waitForHttp() {
  const url = `http://127.0.0.1:${httpPort}/experiments/indoor30-20261113/cobbler/layout.json`;
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
      const pageTarget = list.find((t) => t.type === 'page');
      if (pageTarget?.webSocketDebuggerUrl) {
        const ws = new WebSocket(pageTarget.webSocketDebuggerUrl);
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
  await send('Page.navigate', { url: `${page}?${query}` });
  let state = null;
  for (let i = 0; i < 80; i++) {
    await wait(150);
    const result = await send('Runtime.evaluate', {
      expression: `({
        ready: !!window.__ready,
        failures: window.__failures || [],
        errors: window.__errors || [],
        status: document.getElementById('status')?.textContent || '',
        kinds: window.__materialKinds ? window.__materialKinds() : null,
        bounds: {
          bench: window.__bounds && window.__bounds('repair-bench'),
          horse: window.__bounds && window.__bounds('stitch-horse'),
          finisher: window.__bounds && window.__bounds('finisher'),
          counter: window.__bounds && window.__bounds('handoff-counter'),
          lasts: window.__bounds && window.__bounds('last-rack'),
          tickets: window.__bounds && window.__bounds('ticket-rack'),
          rail: window.__bounds && window.__bounds('shoe-rail'),
          foreground: window.__bounds && window.__bounds('foreground')
        }
      })`,
      returnByValue: true,
    });
    state = result.result.value;
    if (state?.errors?.length) throw new Error(state.errors.join(' | '));
    if (state?.ready) break;
  }
  if (!state?.ready) throw new Error('scene not ready: ' + JSON.stringify(state));
  await wait(500);
  const png = await send('Page.captureScreenshot', { format: 'png' });
  return { png: png.data, state };
}

function checkState(shot, state) {
  const problems = [];
  if (state.failures?.length) problems.push(`loads: ${state.failures.join(', ')}`);
  const kinds = state.kinds || {};
  const toon = kinds.MeshToonMaterial || 0;
  const basic = kinds.MeshBasicMaterial || 0;
  if (shot.expect === 'toon') {
    if (toon < 40) problems.push(`toon materials ${toon}`);
    if (basic !== 0) problems.push(`default has MeshBasicMaterial x${basic}`);
  } else {
    if (basic < 40) problems.push(`unlit MeshBasicMaterial ${basic}`);
    if (toon !== 0) problems.push(`unlit still has MeshToonMaterial x${toon}`);
  }
  const b = state.bounds || {};
  for (const name of ['bench', 'horse', 'finisher', 'counter', 'lasts', 'tickets', 'rail', 'foreground']) {
    if (!b[name]) problems.push(`missing bounds ${name}`);
  }
  if (b.bench && (b.bench.size[1] < 0.7 || b.bench.size[1] > 1.5)) problems.push(`bench height ${b.bench.size[1]}`);
  if (b.counter && (b.counter.size[1] < 0.95 || b.counter.size[1] > 1.25)) problems.push(`counter height ${b.counter.size[1]}`);
  if (b.finisher && (b.finisher.size[1] < 0.9 || b.finisher.size[1] > 1.5)) problems.push(`finisher height ${b.finisher.size[1]}`);
  if (b.finisher && b.finisher.size[0] > 1.3) problems.push(`finisher footprint ${b.finisher.size[0]}`);
  if (b.lasts && b.lasts.size[1] < 0.4) problems.push('last rack is flat');
  if (b.foreground && b.foreground.size[1] < 0.25) problems.push('foreground is empty');
  return problems;
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
    '--user-data-dir=/tmp/cobbler-chrome-profile',
    '--no-first-run',
    'about:blank',
  ],
  { stdio: 'ignore' },
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
  let failed = false;
  for (const shot of shots) {
    const { png, state } = await shoot(send, shot.query);
    const problems = checkState(shot, state);
    const buf = Buffer.from(png, 'base64');
    if (buf.length < 20000) problems.push(`shot too small ${buf.length}`);
    await writeFile(resolve(shotsDir, shot.file), buf);
    await writeFile(resolve(outDir, `${shot.name}.png`), buf);
    report.push({
      shot: shot.name,
      bytes: buf.length,
      kinds: state.kinds,
      problems,
      bounds: state.bounds,
    });
    console.log(`${shot.file} ${buf.length} bytes ${problems.length ? problems.join('; ') : 'ok'}`);
    if (problems.length) failed = true;
  }
  const badLogs = logs.filter((line) => /error|exception/i.test(line) && !/favicon/i.test(line));
  if (badLogs.length) {
    console.error(badLogs.join('\n'));
    failed = true;
  }
  await writeFile('/tmp/cobbler-render-report.json', JSON.stringify({ report, logs: badLogs }, null, 2));
  ws.close();
  if (failed) process.exitCode = 1;
} finally {
  server.kill('SIGTERM');
  chrome.kill('SIGTERM');
}
