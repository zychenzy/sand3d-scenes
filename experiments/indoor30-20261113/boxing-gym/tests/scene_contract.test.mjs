import { readFileSync, lstatSync, realpathSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import assert from 'node:assert/strict';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const repo = resolve(root, '../../..');
const layout = JSON.parse(readFileSync(join(root, 'layout.json'), 'utf8'));

function aabb(x, z, hx, hz) {
  return { x0: x - hx, x1: x + hx, z0: z - hz, z1: z + hz };
}

function gap(a, b) {
  const gapX = Math.max(a.x0, b.x0) - Math.min(a.x1, b.x1);
  const gapZ = Math.max(a.z0, b.z0) - Math.min(a.z1, b.z1);
  if (gapX < 0 && gapZ < 0) return 0;
  if (gapX < 0) return gapZ;
  if (gapZ < 0) return gapX;
  return Math.hypot(gapX, gapZ);
}

function bagMetrics() {
  const fit = layout.architecture.bagFit;
  const scale = fit.targetHeight / fit.nativeHeight;
  const halfDepth = ((fit.nativeZMax - fit.nativeZMin) / 2) * scale;
  const halfAlong = fit.nativeHalfX * scale;
  return { scale, halfDepth, halfAlong, front: fit.x + halfDepth, back: fit.x - halfDepth };
}

test('scripts parse and do not reference a CDN', () => {
  for (const file of ['boxing.js', 'scene_lib.js', 'index.html']) {
    const text = readFileSync(join(root, file), 'utf8');
    assert.doesNotMatch(text, /https?:\/\//);
    assert.doesNotMatch(text, /unpkg|jsdelivr|skypack|cdn\./i);
  }
  for (const file of ['boxing.js', 'scene_lib.js']) {
    const checked = spawnSync(process.execPath, ['--check', join(root, file)], { encoding: 'utf8' });
    assert.equal(checked.status, 0, checked.stderr);
  }
  const lib = readFileSync(join(root, 'scene_lib.js'), 'utf8');
  assert.match(lib, /NearestFilter/);
  assert.match(lib, /MeshToonMaterial/);
  assert.match(lib, /MeshBasicMaterial/);
  assert.match(lib, /PCFShadowMap/);
  assert.doesNotMatch(lib, /PCFHardShadowMap/);
});

test('shared GLBs and three.js are symlinks outside this scene', () => {
  const files = [
    ...Object.values(layout.assets).map((spec) => spec.glb),
    'vendor/three.module.js',
    'vendor/controls/OrbitControls.js',
    'vendor/loaders/GLTFLoader.js',
    'vendor/utils/BufferGeometryUtils.js',
  ];
  for (const rel of files) {
    const abs = join(root, rel);
    const head = readFileSync(abs).subarray(0, 4);
    if (rel.endsWith('.glb')) assert.equal(head.toString(), 'glTF', rel);
    assert.equal(lstatSync(abs).isSymbolicLink() || lstatSync(join(root, 'vendor')).isSymbolicLink(), true, rel);
    const real = realpathSync(abs);
    const relRepo = relative(repo, real);
    assert.equal(relRepo.startsWith('..'), false, real);
    assert.equal(relative(root, real).startsWith('..'), true, real);
  }
  const html = readFileSync(join(root, 'index.html'), 'utf8');
  assert.match(html, /"three": "\.\/vendor\/three\.module\.js"/);
});

test('zones are a boxing gym, not a weights floor', () => {
  assert.deepEqual(layout.meta.zones.map((z) => z.id), ['ring', 'bags', 'speed', 'stores', 'rest']);
  assert.equal(layout.architecture.rack, undefined);
  assert.equal(layout.architecture.turf, undefined);
  const kinds = new Set(layout.instances.map((i) => i.kind));
  assert.deepEqual([...kinds].sort(), ['cup_mug', 'museum_bench', 'pendant_lamp', 'punching_bag', 'thermos', 'wall_shelf']);
});

test('16 ft ring, four ropes, stools in the corners, canvas kept clear', () => {
  const ring = layout.architecture.ring;
  assert.ok(Math.abs(ring.inside - 4.88) < 0.02, '16 ft inside the ropes');
  assert.ok(ring.apron >= 0.45 && ring.apron <= 0.65);
  assert.ok(ring.deckY >= 0.91 && ring.deckY <= 1.22);
  assert.deepEqual(ring.ropeAbove, [0.46, 0.76, 1.07, 1.37]);
  assert.ok(ring.postAbove > ring.ropeAbove[3]);
  assert.ok(ring.ropeRadius >= 0.012 && ring.ropeRadius <= 0.016);
  const half = ring.inside / 2 + ring.apron;
  const rope = ring.inside / 2;
  const inset = layout.architecture.stools.inset;
  const red = { x: ring.cx - rope + inset, z: ring.cz - rope + inset };
  const blue = { x: ring.cx + rope - inset, z: ring.cz + rope - inset };
  for (const stool of [red, blue]) {
    assert.ok(Math.abs(stool.x - ring.cx) < rope - 0.25);
    assert.ok(Math.abs(stool.z - ring.cz) < rope - 0.25);
    assert.ok(Math.hypot(stool.x - ring.cx, stool.z - ring.cz) > 1.2, 'outside the centre circle');
  }
  const coach = layout.architecture.stools.coach;
  const platform = aabb(ring.cx, ring.cz, half, half);
  const coachBox = aabb(coach.x, coach.z, 0.2, 0.2);
  assert.ok(gap(platform, coachBox) >= 0.5, 'coach stool off the apron');
});

test('heavy-bag line faces the room and leaves a strike lane plus a walk', () => {
  const room = layout.meta.room;
  const fit = layout.architecture.bagFit;
  const { halfDepth, halfAlong, front, back } = bagMetrics();
  const bags = layout.instances.filter((i) => i.kind === 'punching_bag');
  assert.equal(bags.length, 3);
  const inner = -room.width / 2 + layout.architecture.wallT / 2;
  assert.ok(back > inner + 0.08, `bag back ${back.toFixed(2)} clears wall ${inner.toFixed(2)}`);
  for (let i = 0; i < bags.length; i++) {
    assert.equal(bags[i].position[0], fit.x);
    assert.equal(bags[i].rotationY, fit.rotationY);
    assert.ok(Math.abs(bags[i].rotationY - Math.PI / 2) < 1e-6);
    for (let j = i + 1; j < bags.length; j++) {
      const dist = Math.abs(bags[i].position[2] - bags[j].position[2]);
      assert.ok(dist >= fit.minGap, `bag spacing ${dist.toFixed(2)}`);
      assert.ok(dist - 2 * halfAlong >= 0.5, 'bags do not touch');
    }
  }
  const ring = layout.architecture.ring;
  const ringLeft = ring.cx - (ring.inside / 2 + ring.apron);
  const walk = ringLeft - (front + fit.strike);
  assert.ok(walk >= layout.architecture.walkMin, `walk ${walk.toFixed(2)} after a ${fit.strike} m strike`);
  assert.ok(halfDepth > 0.3 && halfDepth < 0.7);
});

test('speed bags, gloves, timer, and benches keep their own floor', () => {
  const room = layout.meta.room;
  const arch = layout.architecture;
  const ring = arch.ring;
  const half = ring.inside / 2 + ring.apron;
  const ringBox = aabb(ring.cx, ring.cz, half, half);
  const backInner = -room.depth / 2 + arch.wallT / 2;
  const z = backInner + 0.03 + arch.speedDepth / 2;
  for (const spec of arch.speed) {
    const platform = aabb(spec.x, z, arch.speedWidth / 2, arch.speedDepth / 2);
    const user = aabb(spec.x, z + arch.speedDepth / 2 + arch.speedUser / 2, 0.4, arch.speedUser / 2);
    assert.ok(gap(platform, ringBox) >= 1.2, spec.id);
    assert.ok(gap(user, ringBox) >= arch.walkMin, `${spec.id} stance`);
    assert.ok(spec.platformY >= 1.55 && spec.platformY <= 1.95);
  }
  const speedRight = arch.speed[1].x + arch.speedWidth / 2;
  assert.ok(arch.gloveRail.x0 > speedRight + 0.45, 'gloves clear of the speed-bag stance');
  assert.ok(arch.timer.y > 2.2 && arch.timer.y < 3.15);
  assert.ok(arch.timer.r >= 0.28 && arch.timer.r <= 0.42);
  const ringFront = ring.cz + half;
  for (const x of arch.benches.x) {
    const bench = layout.instances.find((i) => i.position[0] === x && i.kind === 'museum_bench');
    assert.ok(bench, x);
    assert.equal(bench.rotationY, arch.benches.rotationY);
    assert.ok(bench.position[2] - 0.25 - ringFront >= 1.1, 'ringside walk');
  }
});

test('instances are unique, on known assets, and inside the shell', () => {
  const room = layout.meta.room;
  const ids = new Set();
  for (const inst of layout.instances) {
    assert.equal(ids.has(inst.id), false, inst.id);
    ids.add(inst.id);
    assert.ok(layout.assets[inst.kind], inst.kind);
    assert.ok(inst.position[0] > -room.width / 2 - 0.05 && inst.position[0] < room.width / 2 + 0.05);
    assert.ok(inst.position[2] > -room.depth / 2 - 0.05 && inst.position[2] < room.depth / 2 + 0.05);
    assert.ok(inst.position[1] >= 0 && inst.position[1] < room.height);
  }
  assert.ok(layout.cameraPresets.corner && layout.cameraPresets.detail && layout.cameraPresets.close);
  const interior = (p) =>
    p[0] > -room.width / 2 + 0.35 &&
    p[0] < room.width / 2 - 0.35 &&
    p[2] > -room.depth / 2 + 0.35 &&
    p[2] < room.depth / 2 - 0.35 &&
    p[1] > 1.35 &&
    p[1] < layout.architecture.ceilingY - 0.4;
  assert.equal(interior(layout.camera.position), true, 'default camera is inside the room');
  assert.equal(interior(layout.cameraPresets.corner.position), true, 'corner camera is inside the room');
  assert.ok(layout.camera.target[2] < layout.camera.position[2] - 1.5, 'default camera looks toward the back wall');
  assert.ok(layout.camera.target[0] < layout.camera.position[0] - 1.5);
  assert.ok(layout.cameraPresets.corner.target[2] < layout.cameraPresets.corner.position[2] - 1);
  const detail = layout.cameraPresets.detail.position;
  const ring = layout.architecture.ring;
  const half = ring.inside / 2 + ring.apron;
  const platform = aabb(ring.cx, ring.cz, half, half);
  for (const p of [layout.camera.position, layout.cameraPresets.corner.position]) {
    assert.ok(gap(platform, aabb(p[0], p[2], 0.15, 0.15)) >= 0.4, 'camera stands off the apron');
  }
  assert.ok(gap(platform, aabb(detail[0], detail[2], 0.05, 0.05)) >= 0.45, 'detail camera stands off the apron');
  const backInner = -room.depth / 2 + layout.architecture.wallT / 2;
  assert.ok(detail[2] > backInner + 0.8 && detail[2] < ring.cz - half, 'detail camera is in front of the speed bags');
  assert.equal(layout.lights.points.length, 4);
});

test('stairs match the apron height and the rail meets the apron', () => {
  const ring = layout.architecture.ring;
  const stairs = layout.architecture.stairs;
  const rise = ring.deckY / stairs.count;
  assert.ok(stairs.count >= 6, 'enough treads for a 0.98 m apron');
  assert.ok(rise >= 0.14 && rise <= 0.175, `rise ${rise.toFixed(3)}`);
  assert.ok(stairs.run >= 0.26 && stairs.run <= 0.32, `run ${stairs.run}`);
  const pitch = (Math.atan(rise / stairs.run) * 180) / Math.PI;
  assert.ok(pitch >= 28 && pitch <= 34, `pitch ${pitch.toFixed(1)}`);
  const comfort = 2 * rise + stairs.run;
  assert.ok(comfort >= 0.58 && comfort <= 0.66, `2R+G ${comfort.toFixed(3)}`);
  assert.ok(stairs.railHeight >= 0.85 && stairs.railHeight <= 1.0);
  const apronZ = ring.cz + ring.inside / 2 + ring.apron;
  const bottomZ = apronZ + stairs.run * (stairs.count - 0.5);
  assert.ok(bottomZ < layout.meta.room.depth / 2 - 0.7, 'flight ends before the open edge');
  const src = readFileSync(join(root, 'boxing.js'), 'utf8');
  assert.match(src, /deckY \/ count/);
  assert.match(src, /architecture\.stairs/);
  assert.match(src, /rail-apron/);
  assert.match(src, /addScaledVector\(dir, 0\.11\)/);
  assert.match(src, /addScaledVector\(dir, -0\.11\)/);
  assert.match(src, /addBox\(g, W, 0\.08, D, toon\(PAL\.ceil\), 0, ceilY, 0\)/);
  assert.match(src, /corner-pads/);
});
