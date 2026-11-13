import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import {
  audit,
  buildInstances,
  clearAboveMattress,
  corridorClear,
  ladderRungs,
  podBackX,
} from '../metrics.mjs';

const dir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const repo = path.resolve(dir, '../../..');
const layout = JSON.parse(fs.readFileSync(path.join(dir, 'layout.json'), 'utf8'));
const html = fs.readFileSync(path.join(dir, 'index.html'), 'utf8');
const capsule = fs.readFileSync(path.join(dir, 'capsule.js'), 'utf8');
const report = audit(layout);

test('body fits the pod and the opening stays rounded', () => {
  const { pod, body } = layout.meta;
  assert.equal(layout.meta.slug, 'capsule-hotel');
  assert.ok(pod.interiorLength >= body.stature + 0.08, `length ${pod.interiorLength}`);
  assert.ok(pod.interiorLength <= 2.05);
  assert.ok(pod.interiorWidth >= 0.85 && pod.interiorWidth <= 1.1);
  assert.ok(report.lowerClear >= 0.8 && report.lowerClear <= 1.05, `lower ${report.lowerClear}`);
  assert.ok(report.upperClear >= 0.8 && report.upperClear <= 1.05, `upper ${report.upperClear}`);
  assert.ok(pod.openingR >= 0.12);
  assert.ok(pod.openingW < pod.interiorWidth);
  assert.ok(pod.openingH < clearAboveMattress(pod, 'lower') + pod.mattressT);
  assert.ok(podBackX(pod) > layout.meta.room.minX + 0.04);
});

test('ladder rise, width, and handhold match a short climb', () => {
  const { ladder, pod } = layout.meta;
  const rungs = ladderRungs(ladder);
  assert.equal(rungs.length, 4);
  for (let i = 1; i < rungs.length; i++) {
    const step = rungs[i] - rungs[i - 1];
    assert.ok(Math.abs(step - 0.28) < 1e-9, `spacing ${step}`);
  }
  assert.ok(ladder.width >= 0.3 && ladder.width <= 0.42);
  assert.ok(ladder.rungD >= 0.02 && ladder.rungD <= 0.035);
  assert.ok(report.lastRise >= 0.18 && report.lastRise <= 0.29, `rise ${report.lastRise}`);
  assert.ok(report.railTop >= pod.upperFloor + 0.3);
  assert.ok(ladder.protrusion <= 0.22);
});

test('hallway stays narrow and the walking path is clear', () => {
  assert.equal(layout.meta.circulation, 'narrow-hall');
  assert.ok(report.corridorClear >= 0.95 && report.corridorClear <= 1.35, `clear ${report.corridorClear}`);
  assert.ok(report.walkWidth >= 0.95 && report.walkWidth <= 1.25, `walk ${report.walkWidth}`);
  assert.ok(report.ceiling >= 2.3 && report.ceiling <= 2.6);
  assert.ok(report.approach >= 0.7, `approach ${report.approach}`);
  assert.equal(layout.meta.room.height, report.ceiling);
  assert.deepEqual(report.blocked, []);
  assert.deepEqual(report.cameraProblems, []);
  const groom = layout.meta.groom;
  assert.ok(groom.counterH >= 0.84 && groom.counterH <= 0.92);
  const stand = groom.backZ - groom.counterD - layout.meta.corridor.standZ;
  assert.ok(stand >= 0.4, `sink approach ${stand}`);
});

test('pods are a mixed row, not a wall of closed holes', () => {
  assert.equal(layout.meta.pods.length, 8);
  assert.ok(report.open >= 3);
  assert.ok(report.closed >= 2);
  assert.ok(report.half >= 1);
  const cloths = new Set(layout.meta.pods.map((p) => p.cloth));
  assert.ok(cloths.size >= 2);
  const instances = buildInstances(layout);
  const lamps = instances.filter((i) => i.role === 'reading-lamp');
  const pillows = instances.filter((i) => i.role === 'pillow');
  const lockers = instances.filter((i) => i.role === 'locker');
  assert.equal(lamps.length, 8);
  assert.equal(pillows.length, report.open + report.half);
  assert.equal(lockers.length, 12);
  const ids = instances.map((i) => i.id);
  assert.equal(new Set(ids).size, ids.length);
});

test('shared kit is referenced in place and baked props stay small', () => {
  assert.match(html, /cafe\/vendor\/three\.module\.js/);
  assert.equal(/https?:\/\//.test(html), false);
  assert.equal(fs.existsSync(path.join(dir, 'vendor')), false);
  const banned = /sofa|train_seat|pendant_lamp|bar_counter|pool_table/;
  assert.equal(banned.test(JSON.stringify(layout.assets)), false);
  for (const [kind, spec] of Object.entries(layout.assets)) {
    assert.equal(spec.glb.startsWith('http'), false, kind);
    const file = path.resolve(dir, spec.glb);
    assert.equal(fs.existsSync(file), true, spec.glb);
    const rel = path.relative(repo, file);
    const size = fs.statSync(file).size;
    if (spec.baked) {
      assert.equal(rel.startsWith(`experiments${path.sep}indoor30-20261113${path.sep}capsule-hotel${path.sep}assets`), true, rel);
      assert.ok(size < 120000, `${kind} ${size}`);
      const magic = fs.readFileSync(file).subarray(0, 4).toString('utf8');
      assert.equal(magic, 'glTF');
    } else {
      assert.equal(rel.includes(`${path.sep}capsule-hotel${path.sep}`), false, rel);
      assert.ok(size < 400000, `${kind} enormous ${size}`);
    }
  }
  assert.match(capsule, /MeshToonMaterial|toon\(/);
  assert.match(fs.readFileSync(path.join(dir, 'scene_lib.js'), 'utf8'), /MeshBasicMaterial/);
  assert.equal(corridorClear(layout) > 0.9, true);
});

test('browser render loads, stays in toon by default, and is not a black frame', async () => {
  const { spawn } = await import('node:child_process');
  const { setTimeout: delay } = await import('node:timers/promises');
  const port = 8873;
  const server = spawn('python3', ['-m', 'http.server', String(port), '--bind', '127.0.0.1'], {
    cwd: repo,
    stdio: 'ignore',
  });
  const chrome = spawn('google-chrome', [
    '--headless=new',
    '--disable-gpu',
    '--use-angle=swiftshader',
    '--enable-webgl',
    '--ignore-gpu-blocklist',
    '--no-sandbox',
    '--remote-debugging-port=9334',
    '--user-data-dir=/tmp/chrome-capsule-hotel-test',
    '--window-size=1280,800',
    'about:blank',
  ], { stdio: 'ignore' });
  try {
    let version;
    for (let i = 0; i < 40; i++) {
      try {
        const res = await fetch('http://127.0.0.1:9334/json/version');
        if (res.ok) { version = await res.json(); break; }
      } catch { /* boot */ }
      await delay(150);
    }
    assert.ok(version, 'chrome debug port');
    const tabs = await (await fetch('http://127.0.0.1:9334/json')).json();
    const page = tabs.find((t) => t.type === 'page') || tabs[0];
    const ws = new WebSocket(page.webSocketDebuggerUrl);
    await new Promise((resolve, reject) => {
      ws.addEventListener('open', resolve);
      ws.addEventListener('error', reject);
    });
    let id = 0;
    const pending = new Map();
    ws.addEventListener('message', (ev) => {
      const msg = JSON.parse(ev.data);
      if (msg.id && pending.has(msg.id)) {
        const { resolve, reject } = pending.get(msg.id);
        pending.delete(msg.id);
        if (msg.error) reject(new Error(JSON.stringify(msg.error)));
        else resolve(msg.result);
      }
    });
    const send = (method, params = {}) => new Promise((resolve, reject) => {
      const msgId = ++id;
      pending.set(msgId, { resolve, reject });
      ws.send(JSON.stringify({ id: msgId, method, params }));
    });
    await send('Page.enable');
    await send('Runtime.enable');
    const base = `http://127.0.0.1:${port}/experiments/indoor30-20261113/capsule-hotel/`;
    for (const [label, url] of [['toon', `${base}?hud=0`], ['unlit', `${base}?hud=0&mode=unlit`]]) {
      await send('Page.navigate', { url });
      let info = null;
      for (let i = 0; i < 80; i++) {
        await delay(200);
        const result = await send('Runtime.evaluate', {
          expression: `JSON.stringify({
            ready: !!window.__ready,
            errors: window.__errors || [],
            loaded: window.__loaded || [],
            mode: window.__mode || '',
            clear: window.__audit && window.__audit.corridorClear
          })`,
          returnByValue: true,
        });
        info = JSON.parse(result.result.value);
        if (info.ready) break;
      }
      assert.equal(info.ready, true, `${label} not ready ${JSON.stringify(info)}`);
      assert.deepEqual(info.errors, [], `${label} errors`);
      assert.equal(info.loaded.length, Object.keys(layout.assets).length, label);
      assert.equal(info.mode, label === 'unlit' ? 'unlit' : 'toon');
      assert.ok(info.clear >= 0.95 && info.clear <= 1.35);
      const sample = await send('Runtime.evaluate', {
        expression: `(() => {
          const gl = document.getElementById('c').getContext('webgl2') || document.getElementById('c').getContext('webgl');
          const w = gl.drawingBufferWidth, h = gl.drawingBufferHeight;
          const px = new Uint8Array(w * h * 4);
          gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, px);
          let sum = 0, sum2 = 0, dark = 0, n = 0;
          for (let y = 0; y < h; y += 16) {
            for (let x = 0; x < w; x += 16) {
              const i = (y * w + x) * 4;
              const l = (px[i] + px[i + 1] + px[i + 2]) / 3;
              sum += l; sum2 += l * l; n += 1;
              if (l < 14) dark += 1;
            }
          }
          const mean = sum / n;
          return JSON.stringify({ mean, variance: sum2 / n - mean * mean, dark: dark / n });
        })()`,
        returnByValue: true,
      });
      const pix = JSON.parse(sample.result.value);
      assert.ok(pix.mean > 35 && pix.mean < 220, `${label} mean ${pix.mean}`);
      assert.ok(pix.variance > 250, `${label} flat ${pix.variance}`);
      assert.ok(pix.dark < 0.55, `${label} crushed ${pix.dark}`);
    }
    ws.close();
  } finally {
    chrome.kill();
    server.kill();
  }
});
