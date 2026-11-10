import { spawn } from 'child_process';
import { mkdirSync, writeFileSync } from 'fs';

const base = process.argv[2] || 'http://127.0.0.1:8791/experiments/outdoor-20261110/garden-open-air-cinema/';
const outDir = process.argv[3] || '/opt/cursor/artifacts';
mkdirSync(outDir, { recursive: true });

const shots = [
  ['garden-open-air-cinema_default.png', `${base}?hud=0`],
  ['garden-open-air-cinema_corner.png', `${base}?hud=0&cam=corner`],
  ['garden-open-air-cinema_close.png', `${base}?hud=0&cam=close`],
  ['garden-open-air-cinema_unlit.png', `${base}?hud=0&mode=unlit`],
];

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

async function waitJson(url) {
  for (let i = 0; i < 40; i++) {
    try {
      const res = await fetch(url);
      if (res.ok) return await res.json();
    } catch { /* chrome still booting */ }
    await sleep(200);
  }
  throw new Error(`no response from ${url}`);
}

const chrome = spawn('/usr/local/bin/google-chrome', [
  '--headless=new',
  '--no-sandbox',
  '--disable-gpu',
  '--use-angle=swiftshader',
  '--enable-unsafe-swiftshader',
  '--remote-debugging-port=9222',
  '--window-size=1600,1000',
  '--user-data-dir=/tmp/chrome-garden-cinema',
  '--allow-file-access-from-files',
  'about:blank',
], { stdio: 'ignore' });

let ws;
try {
  const list = await waitJson('http://127.0.0.1:9222/json/list');
  const page = list.find((t) => t.type === 'page') || list[0];
  ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    ws.addEventListener('open', resolve);
    ws.addEventListener('error', reject);
  });
  let id = 0;
  const pending = new Map();
  ws.addEventListener('message', (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.id && pending.has(msg.id)) {
      pending.get(msg.id)(msg);
      pending.delete(msg.id);
    }
  });
  const send = (method, params = {}) => new Promise((resolve) => {
    const msgId = ++id;
    pending.set(msgId, resolve);
    ws.send(JSON.stringify({ id: msgId, method, params }));
  });

  await send('Page.enable');
  await send('Runtime.enable');
  await send('Emulation.setDeviceMetricsOverride', {
    width: 1600, height: 1000, deviceScaleFactor: 1, mobile: false,
  });

  const reports = [];
  for (const [file, url] of shots) {
    await send('Page.navigate', { url });
    let status = '';
    for (let i = 0; i < 80; i++) {
      const ev = await send('Runtime.evaluate', {
        expression: `document.getElementById('status') ? document.getElementById('status').textContent : ''`,
        returnByValue: true,
      });
      status = ev.result?.result?.value || '';
      if (status.includes('ready') || status.includes('FAILED')) break;
      await sleep(250);
    }
    if (!status.includes('ready') && !status.includes('FAILED')) {
      throw new Error(`scene did not boot for ${url}: ${status}`);
    }
    await sleep(400);
    const shot = await send('Page.captureScreenshot', { format: 'png' });
    const buf = Buffer.from(shot.result.data, 'base64');
    writeFileSync(`${outDir}/${file}`, buf);
    const rep = await send('Runtime.evaluate', {
      expression: `window.__facingReport ? JSON.stringify({ok:window.__facingReport.ok, mesh:{count:window.__facingReport.mesh.count, facing:window.__facingReport.mesh.facing, allFace:window.__facingReport.mesh.allFace, minDot:window.__facingReport.mesh.minDot, flipped:window.__facingReport.mesh.flipped}, rays:window.__facingReport.rays, analyticOk:window.__facingReport.analyticOk, analyticIssues:window.__facingReport.analyticIssues}) : 'null'`,
      returnByValue: true,
    });
    reports.push({ file, status, report: JSON.parse(rep.result.result.value) });
    console.log(file, status, buf.length);
  }
  writeFileSync(`${outDir}/garden-open-air-cinema_report.json`, JSON.stringify(reports, null, 2));
  const bad = reports.filter((r) => !r.report?.ok);
  if (bad.length) {
    console.error(JSON.stringify(bad, null, 2));
    process.exitCode = 1;
  }
} finally {
  try { ws && ws.close(); } catch { /* ignore */ }
  chrome.kill('SIGKILL');
}
