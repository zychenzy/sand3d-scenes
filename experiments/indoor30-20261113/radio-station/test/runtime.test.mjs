import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import http from 'node:http';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const sceneRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const repoRoot = join(sceneRoot, '../../..');
const shotDir = join(sceneRoot, 'shots');
const port = 8873;
const debugPort = 9334;

function get(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    }).on('error', reject);
  });
}

async function waitFor(url) {
  for (let i = 0; i < 50; i++) {
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
    this.problems = [];
  }
  open() {
    return new Promise((resolve, reject) => {
      this.ws.addEventListener('open', resolve);
      this.ws.addEventListener('error', reject);
      this.ws.addEventListener('message', (ev) => {
        const msg = JSON.parse(ev.data);
        if (msg.id && this.pending.has(msg.id)) {
          const { resolve: ok, reject: bad } = this.pending.get(msg.id);
          this.pending.delete(msg.id);
          if (msg.error) bad(new Error(JSON.stringify(msg.error)));
          else ok(msg.result);
        } else if (msg.method === 'Runtime.exceptionThrown') {
          const d = msg.params.exceptionDetails;
          this.problems.push(`exception ${d.text} ${d.exception?.description || ''}`);
        } else if (msg.method === 'Runtime.consoleAPICalled' && msg.params.type === 'error') {
          this.problems.push(`console ${msg.params.args.map((a) => a.value || a.description).join(' ')}`);
        } else if (msg.method === 'Network.loadingFailed') {
          this.problems.push(`net ${msg.params.errorText} ${msg.params.type}`);
        }
      });
    });
  }
  send(method, params = {}) {
    const id = ++this.id;
    this.ws.send(JSON.stringify({ id, method, params }));
    return new Promise((resolve, reject) => this.pending.set(id, { resolve, reject }));
  }
}

test('scene loads, shades, and keeps mixer controls small', { timeout: 120000 }, async () => {
  mkdirSync(shotDir, { recursive: true });
  const server = spawn('python3', ['-m', 'http.server', String(port), '--bind', '127.0.0.1'], {
    cwd: repoRoot,
    stdio: 'ignore',
  });
  const chrome = spawn('google-chrome', [
    '--headless=new',
    '--disable-gpu',
    '--no-sandbox',
    '--remote-debugging-port=' + debugPort,
    '--window-size=1440,900',
    '--user-data-dir=/tmp/chrome-radio-station',
    'about:blank',
  ], { stdio: 'ignore' });

  try {
    await waitFor(`http://127.0.0.1:${port}/experiments/indoor30-20261113/radio-station/layout.json`);
    await waitFor(`http://127.0.0.1:${debugPort}/json/version`);
    const ver = JSON.parse(await get(`http://127.0.0.1:${debugPort}/json/version`));
    const browser = new Cdp(ver.webSocketDebuggerUrl);
    await browser.open();

    const shots = [
      ['', 'toon_default.png', 'TOON'],
      ['?cam=corner', 'toon_corner.png', 'TOON'],
      ['?cam=close', 'toon_close.png', 'TOON'],
      ['?mode=unlit', 'unlit_default.png', 'UNLIT'],
    ];
    const base = `http://127.0.0.1:${port}/experiments/indoor30-20261113/radio-station/`;

    for (const [query, file, mode] of shots) {
      const { targetId } = await browser.send('Target.createTarget', { url: 'about:blank' });
      const list = JSON.parse(await get(`http://127.0.0.1:${debugPort}/json/list`));
      const tab = list.find((t) => t.id === targetId);
      const page = new Cdp(tab.webSocketDebuggerUrl);
      await page.open();
      await page.send('Page.enable');
      await page.send('Runtime.enable');
      await page.send('Network.enable');
      await page.send('Page.navigate', { url: base + query + (query ? '&' : '?') + 'clean=1' });

      let status = '';
      for (let i = 0; i < 50; i++) {
        await new Promise((r) => setTimeout(r, 200));
        const res = await page.send('Runtime.evaluate', {
          expression: 'document.getElementById("status")?.textContent || ""',
          returnByValue: true,
        });
        status = res.result.value || '';
        if (status.startsWith('ready') || status.startsWith('asset failed')) break;
      }
      await new Promise((r) => setTimeout(r, 350));
      const measured = await page.send('Runtime.evaluate', {
        expression: `(() => {
          const api = window.__scene;
          if (!api) return { missing: true };
          let meshes = 0;
          const sizes = [];
          api.scene.updateMatrixWorld(true);
          api.scene.traverse((o) => {
            if (!o.isMesh) return;
            meshes += 1;
            if (o.name !== 'fader-cap' && o.name !== 'knob-cap' && o.name !== 'cue-key') return;
            const geom = o.geometry;
            if (!geom.boundingBox) geom.computeBoundingBox();
            const bb = geom.boundingBox;
            const e = o.matrixWorld.elements;
            const sx = Math.hypot(e[0], e[1], e[2]);
            const sy = Math.hypot(e[4], e[5], e[6]);
            const sz = Math.hypot(e[8], e[9], e[10]);
            sizes.push(Math.max(
              Math.abs((bb.max.x - bb.min.x) * sx),
              Math.abs((bb.max.y - bb.min.y) * sy),
              Math.abs((bb.max.z - bb.min.z) * sz)
            ));
          });
          return {
            meshes,
            mode: document.getElementById('mode').textContent,
            controls: sizes.length,
            maxControl: sizes.reduce((m, v) => Math.max(m, v), 0),
          };
        })()`,
        returnByValue: true,
      });
      if (measured.exceptionDetails) {
        throw new Error(JSON.stringify(measured.exceptionDetails));
      }
      const info = measured.result.value;
      assert.equal(status.startsWith('ready'), true, status);
      assert.equal(info.mode, mode, file);
      assert.ok(info.meshes > 120, `meshes ${info.meshes}`);
      assert.ok(info.controls >= 8, `controls ${info.controls}`);
      assert.ok(info.maxControl < 0.035, `control ${info.maxControl}`);
      assert.deepEqual(page.problems, [], page.problems.join('\n'));

      const shot = await page.send('Page.captureScreenshot', { format: 'png' });
      writeFileSync(join(shotDir, file), Buffer.from(shot.data, 'base64'));
      await page.send('Target.closeTarget', { targetId }).catch(() => {});
      page.ws.close();
    }
  } finally {
    chrome.kill();
    server.kill();
  }
});
