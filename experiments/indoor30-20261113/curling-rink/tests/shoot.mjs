#!/usr/bin/env node
// Headless shots. Point it at a server whose root is the sand3d-scenes repo.
//   node tests/shoot.mjs http://127.0.0.1:8796/experiments/indoor30-20261113/curling-rink shots
import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';

const base = (process.argv[2] || 'http://127.0.0.1:8796/experiments/indoor30-20261113/curling-rink').replace(/\/$/, '');
const outDir = process.argv[3] || new URL('../shots/', import.meta.url).pathname;
const shots = [
  ['toon_default', ''],
  ['toon_corner', 'cam=corner'],
  ['toon_detail', 'cam=detail'],
  ['unlit_default', 'mode=unlit'],
];

const chrome = spawn('google-chrome', [
  '--headless=new',
  '--no-sandbox',
  '--disable-dev-shm-usage',
  '--use-gl=angle',
  '--use-angle=swiftshader',
  '--remote-debugging-port=9341',
  '--user-data-dir=/tmp/chrome-curling-rink',
  '--window-size=1440,900',
  'about:blank',
], { stdio: ['ignore', 'pipe', 'pipe'] });

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function jsonGet(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url} ${res.status}`);
  return res.json();
}

async function waitVersion() {
  for (let i = 0; i < 40; i++) {
    try {
      return await jsonGet('http://127.0.0.1:9341/json/version');
    } catch {
      await sleep(150);
    }
  }
  throw new Error('chrome devtools did not open');
}

function cdp(wsUrl) {
  const ws = new WebSocket(wsUrl);
  let id = 0;
  const pending = new Map();
  const events = [];
  const open = new Promise((resolve, reject) => {
    ws.addEventListener('open', resolve);
    ws.addEventListener('error', () => reject(new Error('ws error')));
  });
  ws.addEventListener('message', (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      if (msg.error) reject(new Error(JSON.stringify(msg.error)));
      else resolve(msg.result);
    } else if (msg.method) {
      events.push(msg);
    }
  });
  async function send(method, params = {}) {
    await open;
    const msgId = ++id;
    const result = new Promise((resolve, reject) => pending.set(msgId, { resolve, reject }));
    ws.send(JSON.stringify({ id: msgId, method, params }));
    return result;
  }
  return { send, events, close: () => ws.close() };
}

function flatSample(sample) {
  if (!sample || sample.length < 6) return 'no sample';
  let min = 255;
  let max = 0;
  let sum = 0;
  for (const [r, g, b] of sample) {
    const l = (r + g + b) / 3;
    sum += l;
    min = Math.min(min, l);
    max = Math.max(max, l);
  }
  const mean = sum / sample.length;
  if (max - min < 12) return `flat frame ${mean.toFixed(1)}`;
  if (mean < 28) return `too dark ${mean.toFixed(1)}`;
  if (mean > 242) return `blown out ${mean.toFixed(1)}`;
  return '';
}

async function main() {
  await mkdir(outDir, { recursive: true });
  const version = await waitVersion();
  const browser = cdp(version.webSocketDebuggerUrl);
  const { targetId } = await browser.send('Target.createTarget', { url: 'about:blank' });
  const { webSocketDebuggerUrl } = (await jsonGet('http://127.0.0.1:9341/json/list'))
    .find((t) => t.id === targetId);
  const page = cdp(webSocketDebuggerUrl);
  await page.send('Page.enable');
  await page.send('Runtime.enable');
  await page.send('Emulation.setDeviceMetricsOverride', {
    width: 1440,
    height: 900,
    deviceScaleFactor: 1,
    mobile: false,
  });

  const report = [];
  for (const [name, query] of shots) {
    const q = query ? `?${query}&hud=0` : '?hud=0';
    const url = `${base}/${q}`;
    page.events.length = 0;
    await page.send('Page.navigate', { url });
    let state = null;
    for (let i = 0; i < 80; i++) {
      await sleep(250);
      const ev = await page.send('Runtime.evaluate', {
        expression: `({ready: window.__ready, status: document.getElementById('status')?.textContent || '', errors: window.__errors || [], probe: window.__probe ? window.__probe() : null})`,
        returnByValue: true,
      });
      state = ev.result.value;
      if (state && (state.ready === true || (state.errors && state.errors.length))) break;
    }
    await sleep(500);
    const sampleEv = await page.send('Runtime.evaluate', {
      expression: 'window.__sample ? window.__sample() : null',
      returnByValue: true,
    });
    const sample = sampleEv.result.value;
    const shot = await page.send('Page.captureScreenshot', { format: 'png' });
    const file = `${outDir}/${name}.png`;
    await writeFile(file, Buffer.from(shot.data, 'base64'));
    const consoleErrors = page.events
      .filter((e) => e.method === 'Runtime.exceptionThrown')
      .map((e) => e.params?.exceptionDetails?.text || e.params?.exceptionDetails?.exception?.description || 'exception');
    const flat = flatSample(sample);
    report.push({ name, file, state, consoleErrors, flat, sample });
    console.log(name, state && state.status, 'probe', JSON.stringify(state && state.probe && state.probe.roles), 'flat', flat || 'ok');
  }
  await writeFile(`${outDir}/shoot.json`, JSON.stringify(report.map(({ sample, ...rest }) => rest), null, 2));
  page.close();
  browser.close();
  chrome.kill('SIGKILL');

  const bad = [];
  for (const row of report) {
    const probe = row.state && row.state.probe;
    if (!row.state || row.state.ready !== true) bad.push(`${row.name} not ready`);
    if ((row.state?.errors || []).length) bad.push(`${row.name} errors ${row.state.errors.join('; ')}`);
    if (row.consoleErrors.length) bad.push(`${row.name} console ${row.consoleErrors.join('; ')}`);
    if (row.flat) bad.push(`${row.name} ${row.flat}`);
    if (!probe) {
      bad.push(`${row.name} no probe`);
      continue;
    }
    if ((probe.roles.stone || 0) < 16) bad.push(`${row.name} stones`);
    if ((probe.roles.hack || 0) < 4) bad.push(`${row.name} hacks`);
    if ((probe.roles.house || 0) < 8) bad.push(`${row.name} houses`);
    if ((probe.roles.brush || 0) < 6) bad.push(`${row.name} brushes`);
    if ((probe.roles.scoreboard || 0) < 2) bad.push(`${row.name} scoreboard`);
    if ((probe.roles.ice || 0) < 1) bad.push(`${row.name} ice`);
    if (row.name.startsWith('unlit')) {
      if (probe.mode !== 'unlit') bad.push('unlit mode flag');
      if (probe.toon !== 0) bad.push(`unlit still has ${probe.toon} toon materials`);
      if (probe.basic < 30) bad.push('unlit basic count');
    } else if (probe.toon < probe.basic || probe.toon < 40) {
      bad.push(`${row.name} toon ${probe.toon} basic ${probe.basic}`);
    }
  }
  if (bad.length) {
    console.error(bad.join('\n'));
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  chrome.kill('SIGKILL');
  process.exit(1);
});
