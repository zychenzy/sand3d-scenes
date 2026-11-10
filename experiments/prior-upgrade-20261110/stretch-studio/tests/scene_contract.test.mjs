import { readFileSync, lstatSync, realpathSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import assert from 'node:assert/strict';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const repo = resolve(root, '../../..');
const layout = JSON.parse(readFileSync(join(root, 'layout.json'), 'utf8'));

function aabb2(x, z, hw, hd) {
  return { x0: x - hw, x1: x + hw, z0: z - hd, z1: z + hd };
}

function gap(a, b) {
  const gapX = Math.max(a.x0, b.x0) - Math.min(a.x1, b.x1);
  const gapZ = Math.max(a.z0, b.z0) - Math.min(a.z1, b.z1);
  if (gapX < 0 && gapZ < 0) return 0;
  if (gapX < 0) return gapZ;
  if (gapZ < 0) return gapX;
  return Math.hypot(gapX, gapZ);
}

test('scripts parse and do not reference a CDN', () => {
  for (const file of ['stretch.js', 'scene_lib.js', 'index.html']) {
    const text = readFileSync(join(root, file), 'utf8');
    assert.doesNotMatch(text, /https?:\/\//);
  }
  for (const file of ['stretch.js', 'scene_lib.js']) {
    const checked = spawnSync(process.execPath, ['--check', join(root, file)], { encoding: 'utf8' });
    assert.equal(checked.status, 0, checked.stderr);
  }
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
    assert.equal(lstatSync(abs).isSymbolicLink(), true, rel);
    const real = realpathSync(abs);
    const relRepo = relative(repo, real);
    assert.equal(relRepo.startsWith('..'), false, real);
    assert.equal(relative(root, real).startsWith('..'), true, real);
  }
});

test('two zones, six mats, and walking gaps', () => {
  const ids = layout.meta.zones.map((z) => z.id);
  assert.deepEqual(ids, ['practice', 'cubby']);
  assert.equal(layout.mats.length, 6);
  const { w, l } = layout.architecture.mat;
  const boxes = layout.mats.map((m) => ({ id: m.id, box: aabb2(m.x, m.z, w / 2, l / 2) }));
  for (let i = 0; i < boxes.length; i++) {
    for (let j = i + 1; j < boxes.length; j++) {
      const g = gap(boxes[i].box, boxes[j].box);
      assert.ok(g >= 0.55, `${boxes[i].id} to ${boxes[j].id} gap ${g.toFixed(2)}m`);
    }
  }
});

test('instructor mat sits on the platform facing the class', () => {
  const room = layout.meta.room;
  const mat = layout.architecture.mat;
  const platform = layout.architecture.platform;
  const instructor = layout.mats.find((m) => m.id === 'instructor');
  assert.equal(instructor.y, platform.h);
  assert.equal(instructor.head, 1);
  assert.ok(instructor.x - mat.w / 2 > platform.x0);
  assert.ok(instructor.x + mat.w / 2 < platform.x1);
  assert.ok(instructor.z - mat.l / 2 > platform.z0);
  assert.ok(instructor.z + mat.l / 2 < platform.z1);
  for (const m of layout.mats) {
    assert.ok(Math.abs(m.x) + mat.w / 2 < room.width / 2);
    assert.ok(Math.abs(m.z) + mat.l / 2 < room.depth / 2);
  }
  for (const m of layout.mats.filter((row) => row.id !== 'instructor')) {
    assert.equal(m.head, -1);
  }
});

test('mirror, clerestory, cubbies, and benches keep their zones', () => {
  const room = layout.meta.room;
  const mirror = layout.architecture.mirror;
  const clere = layout.architecture.clerestory;
  assert.ok(mirror.x0 > -room.width / 2 && mirror.x1 < room.width / 2);
  assert.ok(mirror.y0 > 0 && mirror.y1 < clere.y0);
  assert.ok(clere.y1 < room.height + 0.05);
  assert.equal(clere.panes, 5);
  const cub = layout.architecture.cubbies;
  const shoes = layout.architecture.shoes;
  const p = layout.architecture.platform;
  const cubAway = cub.x1 < p.x0 || p.x1 < cub.x0 || cub.z1 < p.z0 || p.z1 < cub.z0;
  assert.equal(cubAway, true);
  const shoeAway = shoes.x1 < p.x0 || p.x1 < shoes.x0 || shoes.z1 < p.z0 || p.z1 < shoes.z0;
  assert.equal(shoeAway, true);
  const rest = layout.instances.find((i) => i.id === 'bench_rest');
  const wait = layout.instances.find((i) => i.id === 'bench_wait');
  assert.equal(rest.rotationY, 0);
  assert.equal(wait.rotationY, 0);
  assert.ok(rest.position[0] < -2.5);
  assert.ok(wait.position[0] > 2.5);
});

test('instances are unique, on known assets, and inside the shell', () => {
  const room = layout.meta.room;
  const ids = new Set();
  for (const inst of layout.instances) {
    assert.equal(ids.has(inst.id), false);
    ids.add(inst.id);
    assert.ok(layout.assets[inst.kind], inst.kind);
    assert.ok(inst.position[0] > -room.width / 2 - 0.05 && inst.position[0] < room.width / 2 + 0.05);
    assert.ok(inst.position[2] > -room.depth / 2 - 0.05 && inst.position[2] < room.depth / 2 + 0.05);
    assert.ok(inst.position[1] >= 0 && inst.position[1] < room.height + 0.2);
  }
  assert.ok(layout.cameraPresets.corner && layout.cameraPresets.close);
});
