import { readFileSync, lstatSync, realpathSync, existsSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn, spawnSync } from 'node:child_process';
import test from 'node:test';
import assert from 'node:assert/strict';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const repo = resolve(root, '../../..');
const layout = JSON.parse(readFileSync(join(root, 'layout.json'), 'utf8'));

function aabb(x, z, w, d) {
  return { x0: x - w / 2, x1: x + w / 2, z0: z - d / 2, z1: z + d / 2 };
}

function gap(a, b) {
  const gapX = Math.max(a.x0, b.x0) - Math.min(a.x1, b.x1);
  const gapZ = Math.max(a.z0, b.z0) - Math.min(a.z1, b.z1);
  if (gapX < 0 && gapZ < 0) return 0;
  if (gapX < 0) return gapZ;
  if (gapZ < 0) return gapX;
  return Math.hypot(gapX, gapZ);
}

function outside(point, box, pad) {
  return point[0] < box.x0 - pad || point[0] > box.x1 + pad || point[1] < box.z0 - pad || point[1] > box.z1 + pad;
}

test('scripts parse, stay offline, and implement hard toon plus true unlit', () => {
  for (const file of ['locksmith.js', 'scene_lib.js', 'index.html']) {
    const text = readFileSync(join(root, file), 'utf8');
    assert.doesNotMatch(text, /https?:\/\//);
  }
  const lib = readFileSync(join(root, 'scene_lib.js'), 'utf8');
  const shop = readFileSync(join(root, 'locksmith.js'), 'utf8');
  assert.match(lib, /MeshToonMaterial/);
  assert.match(lib, /MeshBasicMaterial/);
  assert.match(lib, /NearestFilter/);
  assert.match(lib, /NoToneMapping/);
  assert.match(shop, /shop-ceiling/);
  assert.match(shop, /work-stool/);
  assert.match(shop, /parts-cubby/);
  assert.doesNotMatch(shop, /bar_stool|wall_shelf/);
  for (const file of ['locksmith.js', 'scene_lib.js']) {
    const checked = spawnSync(process.execPath, ['--check', join(root, file)], { encoding: 'utf8' });
    assert.equal(checked.status, 0, checked.stderr);
  }
});

test('reused GLBs and three.js are symlinks; the baked padlock stays in this folder', () => {
  const shared = [
    'assets/dining_chair__5e1f7a56da4a.glb',
    'assets/cash_register__870f6ebb115a.glb',
    'assets/pos_terminal__91c277a25bc3.glb',
  ];
  for (const rel of [
    'assets/bar_stool__319fcb56afe8.glb',
    'assets/wall_shelf__8732f5e14a30.glb',
  ]) {
    assert.equal(existsSync(join(root, rel)), false, rel);
  }
  for (const rel of shared) {
    const abs = join(root, rel);
    assert.equal(lstatSync(abs).isSymbolicLink(), true, rel);
    const real = realpathSync(abs);
    assert.equal(relative(repo, real).startsWith('..'), false, real);
    assert.equal(relative(root, real).startsWith('..'), true, real);
    assert.equal(readFileSync(real).subarray(0, 4).toString(), 'glTF', rel);
  }
  const vendorLink = join(root, 'vendor');
  assert.equal(lstatSync(vendorLink).isSymbolicLink(), true);
  const vendorReal = realpathSync(vendorLink);
  assert.equal(relative(root, vendorReal).startsWith('..'), true);
  for (const rel of [
    'vendor/three.module.js',
    'vendor/controls/OrbitControls.js',
    'vendor/loaders/GLTFLoader.js',
    'vendor/utils/BufferGeometryUtils.js',
  ]) {
    assert.equal(existsSync(join(root, rel)), true, rel);
  }
  const pad = join(root, 'assets/padlock__c9f0cf0cbbe6.glb');
  assert.equal(lstatSync(pad).isSymbolicLink(), false);
  assert.equal(readFileSync(pad).subarray(0, 4).toString(), 'glTF');
  assert.ok(existsSync(join(root, 'programs/padlock__c9f0cf0cbbe6.py')));
});

test('target heights stay at shop scale', () => {
  const ranges = {
    dining_chair: [0.84, 0.96],
    cash_register: [0.28, 0.42],
    pos_terminal: [0.14, 0.26],
    padlock: [0.1, 0.14],
  };
  for (const [kind, [lo, hi]] of Object.entries(ranges)) {
    const h = layout.assets[kind].targetHeight;
    assert.ok(h >= lo && h <= hi, `${kind} height ${h}`);
  }
  const room = layout.meta.room;
  assert.ok(room.height >= 2.9 && room.height <= 3.4);
  assert.ok(layout.meta.keyLength >= 0.07 && layout.meta.keyLength <= 0.16);
  assert.ok(layout.anchors.counter.h >= 0.98 && layout.anchors.counter.h <= 1.15);
  assert.ok(layout.anchors.bench.h >= 0.78 && layout.anchors.bench.h <= 0.95);
  assert.ok(layout.anchors.cutter.top >= 0.8 && layout.anchors.cutter.top <= 1.0);
});

test('seats face the work and the register faces the customer', () => {
  const byId = Object.fromEntries(layout.instances.map((item) => [item.id, item]));
  const stools = Object.fromEntries(layout.workStools.map((item) => [item.id, item]));
  const pi = Math.PI;
  for (const id of ['chair_customer_l', 'chair_customer_r']) {
    assert.ok(Math.abs(Math.abs(byId[id].rotationY) - pi) < 0.02, id);
  }
  for (const id of ['stool_cutter', 'stool_bench']) {
    assert.ok(Math.abs(Math.abs(stools[id].rotationY) - pi) < 0.02, id);
    assert.equal(stools[id].footprint[0] < 0.5, true, id);
  }
  assert.ok(Math.abs(byId.register.rotationY) < 0.05);
  assert.equal(layout.assets.bar_stool, undefined);
  assert.equal(layout.assets.wall_shelf, undefined);
  const cubby = layout.anchors.cubby;
  const peg = layout.anchors.pegwall;
  assert.ok(cubby.z < -3.2);
  assert.ok(cubby.x - cubby.w / 2 > peg.x + peg.w / 2);
  assert.ok(cubby.y >= 0.9);
  const counter = layout.anchors.counter;
  const cutter = layout.anchors.cutter;
  const bench = layout.anchors.bench;
  for (const id of ['chair_customer_l', 'chair_customer_r']) {
    assert.ok(byId[id].position[2] > counter.z + counter.d / 2, id);
  }
  assert.ok(stools.stool_cutter.position[2] > cutter.z + cutter.d / 2);
  assert.ok(stools.stool_bench.position[2] > bench.z + bench.d / 2);
  assert.ok(byId.register.position[2] < counter.z);
  assert.ok(byId.register.position[2] > counter.z - counter.d / 2);
  assert.equal(layout.density.padlockCount, layout.instances.filter((i) => i.kind === 'padlock').length);
});

test('floor seats, anchors, and walking routes keep clearance', () => {
  const room = layout.meta.room;
  const anchors = ['counter', 'cutter', 'bench', 'pegwall', 'cart'].map((id) => {
    const a = layout.anchors[id];
    return { id, box: aabb(a.x, a.z, a.w, a.d || 0.06) };
  });
  for (let i = 0; i < anchors.length; i++) {
    for (let j = i + 1; j < anchors.length; j++) {
      const g = gap(anchors[i].box, anchors[j].box);
      assert.ok(g >= 0.4, `${anchors[i].id} to ${anchors[j].id} gap ${g.toFixed(2)}m`);
    }
  }
  const chairSeats = layout.instances.filter((item) => item.mount === 'floor').map((item) => {
    const fp = layout.assets[item.kind].footprint;
    return { id: item.id, box: aabb(item.position[0], item.position[2], fp[0], fp[1]) };
  });
  const stoolSeats = layout.workStools.map((item) => ({
    id: item.id,
    box: aabb(item.position[0], item.position[2], item.footprint[0], item.footprint[1]),
  }));
  const seats = [...chairSeats, ...stoolSeats];
  for (let i = 0; i < seats.length; i++) {
    for (let j = i + 1; j < seats.length; j++) {
      const g = gap(seats[i].box, seats[j].box);
      assert.ok(g >= 0.35, `${seats[i].id} to ${seats[j].id} gap ${g.toFixed(2)}m`);
    }
    for (const anchor of anchors) {
      const g = gap(seats[i].box, anchor.box);
      assert.ok(g >= 0.28, `${seats[i].id} to ${anchor.id} gap ${g.toFixed(2)}m`);
    }
  }
  const solids = [...anchors.map((a) => a.box), ...seats.map((s) => s.box)];
  for (const [name, points] of Object.entries(layout.routes)) {
    for (const point of points) {
      assert.ok(Math.abs(point[0]) < room.width / 2 - 0.3, `${name} x`);
      assert.ok(Math.abs(point[1]) < room.depth / 2 - 0.25, `${name} z`);
      for (const box of solids) assert.equal(outside(point, box, 0.12), true, `${name} ${point}`);
    }
  }
});

test('instances are unique, inside the shell, and every GLB loads as a file', () => {
  const room = layout.meta.room;
  const ids = new Set();
  for (const inst of layout.instances) {
    assert.equal(ids.has(inst.id), false, inst.id);
    ids.add(inst.id);
    const spec = layout.assets[inst.kind];
    assert.ok(spec, inst.kind);
    assert.equal(existsSync(join(root, spec.glb)), true, spec.glb);
    assert.ok(Math.abs(inst.position[0]) < room.width / 2 - 0.12, inst.id);
    assert.ok(Math.abs(inst.position[2]) < room.depth / 2 - 0.12, inst.id);
    assert.ok(inst.position[1] >= 0 && inst.position[1] < room.height, inst.id);
  }
  assert.ok(layout.cameraPresets.corner && layout.cameraPresets.detail);
  assert.ok(layout.density.keyRows * layout.density.keysPerRow >= 28);
  assert.ok(layout.density.cylinderCols * layout.density.cylinderRows >= 12);
  assert.ok(layout.density.mortiseCount >= 4);
  const cam = layout.camera.position;
  const counter = layout.anchors.counter;
  assert.ok(cam[0] > -room.width / 2 + 0.5, 'default camera stays out of the left wall');
  assert.ok(cam[2] > counter.z + counter.d / 2, 'default camera stays on the customer side of the counter');
  const corner = layout.cameraPresets.corner.position;
  assert.ok(corner[0] > counter.x + counter.w / 2 + 0.4, 'corner camera stays in the open aisle');
  assert.ok(corner[2] > counter.z - counter.d, 'corner camera is not behind the back wall');
});

function chromeBin() {
  for (const bin of ['google-chrome', 'google-chrome-stable', 'chromium']) {
    const found = spawnSync('which', [bin], { encoding: 'utf8' });
    if (found.status === 0) return found.stdout.trim();
  }
  return '';
}

test('runtime loads every GLB, reports no errors, and swaps toon and unlit', { timeout: 60000 }, async () => {
  const chrome = chromeBin();
  if (!chrome) return;
  const port = 8766;
  const server = spawn('python3', ['-m', 'http.server', String(port), '--bind', '127.0.0.1'], { cwd: root, stdio: 'ignore' });
  const debugPort = 9334;
  const chromeProc = spawn(chrome, [
    '--headless=new',
    '--disable-gpu',
    '--no-sandbox',
    '--remote-debugging-port=' + debugPort,
    '--user-data-dir=/tmp/chrome-locksmith-test',
  ], { stdio: 'ignore' });
  try {
    let version = null;
    for (let i = 0; i < 30 && !version; i++) {
      await new Promise((r) => setTimeout(r, 200));
      try {
        version = await fetch(`http://127.0.0.1:${debugPort}/json/version`).then((r) => r.json());
      } catch { /* chrome still binding the port */ }
    }
    assert.ok(version && version.webSocketDebuggerUrl, 'chrome devtools did not come up');
    const ws = new WebSocket(version.webSocketDebuggerUrl);
    await new Promise((res, rej) => {
      ws.addEventListener('open', res);
      ws.addEventListener('error', () => rej(new Error('cdp failed')));
    });
    let seq = 0;
    const rpc = (method, params = {}, sessionId) => new Promise((resolve, reject) => {
      const id = ++seq;
      const onMsg = (ev) => {
        const data = JSON.parse(ev.data);
        if (data.id !== id) return;
        ws.removeEventListener('message', onMsg);
        if (data.error) reject(new Error(JSON.stringify(data.error)));
        else resolve(data.result);
      };
      ws.addEventListener('message', onMsg);
      const payload = { id, method, params };
      if (sessionId) payload.sessionId = sessionId;
      ws.send(JSON.stringify(payload));
    });
    const { targetId } = await rpc('Target.createTarget', { url: 'about:blank' });
    const { sessionId } = await rpc('Target.attachToTarget', { targetId, flatten: true });
    const call = (method, params) => rpc(method, params, sessionId);
    await call('Page.enable');
    await call('Runtime.enable');
    await call('Emulation.setDeviceMetricsOverride', { width: 1280, height: 800, deviceScaleFactor: 1, mobile: false });
    await call('Page.navigate', { url: `http://127.0.0.1:${port}/?shot=1` });
    const deadline = Date.now() + 25000;
    let info = null;
    while (Date.now() < deadline) {
      const result = await call('Runtime.evaluate', {
        expression: `(() => {
          const scene = window.__scene;
          if (!scene || !scene.ready) return { ready: false, status: document.getElementById('status')?.textContent || '', errors: window.__errors || [] };
          let keys = 0, cylinders = 0, mortise = 0, toon = 0, basic = 0, other = 0, bigKey = 0, stools = 0, cubby = 0;
          let ceiling = null;
          scene.scene.traverse((o) => {
            if (o.name === 'work-stool' && !o.isMesh) stools += 1;
            if (o.name === 'parts-cubby') cubby += 1;
            if (o.name === 'shop-ceiling' && o.isMesh) {
              if (!o.geometry.boundingBox) o.geometry.computeBoundingBox();
              const bb = o.geometry.boundingBox;
              ceiling = [bb.max.x - bb.min.x, bb.max.y - bb.min.y, bb.max.z - bb.min.z];
            }
            if (o.isMesh && o.name === 'blank-key') {
              keys += 1;
              if (!o.geometry.boundingBox) o.geometry.computeBoundingBox();
              const s = o.geometry.boundingBox.getSize(o.position.clone());
              if (Math.max(s.x, s.y, s.z) > 0.22) bigKey += 1;
            }
            if (!o.isMesh && o.name === 'pin-cylinder') cylinders += 1;
            if (!o.isMesh && o.name === 'mortise-lock') mortise += 1;
            if (!o.isMesh) return;
            const m = Array.isArray(o.material) ? o.material[0] : o.material;
            if (m && m.isMeshToonMaterial) toon += 1;
            else if (m && m.isMeshBasicMaterial) basic += 1;
            else other += 1;
          });
          scene.setMode('unlit');
          let unlitBasic = 0, unlitOther = 0;
          scene.scene.traverse((o) => {
            if (!o.isMesh) return;
            const m = Array.isArray(o.material) ? o.material[0] : o.material;
            if (m && m.isMeshBasicMaterial) unlitBasic += 1;
            else unlitOther += 1;
          });
          scene.setMode('toon');
          return { ready: true, errors: window.__errors || [], keys, cylinders, mortise, toon, basic, other, bigKey, unlitBasic, unlitOther, stools, cubby, ceiling };
        })()`,
        returnByValue: true,
      });
      info = result.result && result.result.value;
      if (info && info.ready) break;
      await new Promise((r) => setTimeout(r, 300));
    }
    assert.ok(info && info.ready, JSON.stringify(info));
    assert.deepEqual(info.errors, []);
    assert.equal(info.stools, 2);
    assert.ok(info.cubby >= 1, `cubby ${info.cubby}`);
    assert.ok(info.ceiling && info.ceiling[0] > 9 && info.ceiling[2] > 7, JSON.stringify(info.ceiling));
    assert.ok(info.keys >= 35, `keys ${info.keys}`);
    assert.ok(info.cylinders >= 12, `cylinders ${info.cylinders}`);
    assert.ok(info.mortise >= 4, `mortise ${info.mortise}`);
    assert.equal(info.bigKey, 0);
    assert.equal(info.basic, 0);
    assert.equal(info.other, 0);
    assert.ok(info.toon > 50);
    assert.equal(info.unlitOther, 0);
    assert.ok(info.unlitBasic > 50);
    ws.close();
  } finally {
    chromeProc.kill('SIGKILL');
    server.kill('SIGKILL');
  }
});
