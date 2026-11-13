/**
 * Headless screenshot via Chrome DevTools.
 * Usage: node tests/capture.mjs <url> <outfile.png> [debugPort]
 */
const url = process.argv[2];
const outFile = process.argv[3];
const port = process.argv[4] || '9222';
if (!url || !outFile) {
  console.error('usage: node tests/capture.mjs <url> <outfile> [port]');
  process.exit(2);
}

const version = await fetch(`http://127.0.0.1:${port}/json/version`).then((r) => r.json());
const ws = new WebSocket(version.webSocketDebuggerUrl);
await new Promise((res, rej) => {
  ws.addEventListener('open', res);
  ws.addEventListener('error', () => rej(new Error('cdp socket failed')));
});

let seq = 0;
function rpc(method, params = {}, sessionId) {
  const id = ++seq;
  return new Promise((resolve, reject) => {
    const onMsg = (ev) => {
      const data = JSON.parse(ev.data);
      if (data.id !== id) return;
      ws.removeEventListener('message', onMsg);
      if (data.error) reject(new Error(`${method}: ${JSON.stringify(data.error)}`));
      else resolve(data.result);
    };
    ws.addEventListener('message', onMsg);
    const payload = { id, method, params };
    if (sessionId) payload.sessionId = sessionId;
    ws.send(JSON.stringify(payload));
  });
}

const { targetId } = await rpc('Target.createTarget', { url: 'about:blank' });
const { sessionId } = await rpc('Target.attachToTarget', { targetId, flatten: true });
const call = (method, params) => rpc(method, params, sessionId);

await call('Page.enable');
await call('Runtime.enable');
await call('Emulation.setDeviceMetricsOverride', {
  width: 1440,
  height: 900,
  deviceScaleFactor: 1,
  mobile: false,
});
await call('Page.navigate', { url });

const deadline = Date.now() + 30000;
let info = null;
while (Date.now() < deadline) {
  const result = await call('Runtime.evaluate', {
    expression: `(() => {
      const scene = window.__scene;
      let toon = 0, basic = 0, other = 0;
      if (scene) scene.scene.traverse((o) => {
        if (!o.isMesh) return;
        const mats = Array.isArray(o.material) ? o.material : [o.material];
        for (const m of mats) {
          if (!m) continue;
          if (m.isMeshToonMaterial) toon += 1;
          else if (m.isMeshBasicMaterial) basic += 1;
          else other += 1;
        }
      });
      return {
        ready: !!(scene && scene.ready),
        status: document.getElementById('status') ? document.getElementById('status').textContent : '',
        errors: window.__bootErrors || [],
        failed: (scene && scene.failed) || [],
        assetSizes: scene && scene.assetSizes,
        meshCount: scene && scene.meshCount,
        toon, basic, other,
      };
    })()`,
    returnByValue: true,
  });
  info = result.result && result.result.value;
  if (info && (info.ready || (info.failed && info.failed.length))) break;
  await new Promise((r) => setTimeout(r, 300));
}
if (!info || !info.ready) {
  console.error(JSON.stringify(info, null, 2));
  process.exit(1);
}
await new Promise((r) => setTimeout(r, 500));
const shot = await call('Page.captureScreenshot', { format: 'png' });
const { writeFileSync } = await import('fs');
writeFileSync(outFile, Buffer.from(shot.data, 'base64'));
console.log(JSON.stringify({ outFile, status: info.status, meshCount: info.meshCount, toon: info.toon, basic: info.basic, other: info.other, assetSizes: info.assetSizes, failed: info.failed }));
await rpc('Target.closeTarget', { targetId });
ws.close();
