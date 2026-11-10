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
  for (const file of ['yoga.js', 'scene_lib.js', 'index.html']) {
    const text = readFileSync(join(root, file), 'utf8');
    assert.doesNotMatch(text, /https?:\/\//);
  }
  for (const file of ['yoga.js', 'scene_lib.js']) {
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

test('two zones, four mats, and walking gaps', () => {
  const ids = layout.meta.zones.map((z) => z.id);
  assert.deepEqual(ids, ['practice', 'changing']);
  assert.equal(layout.mats.length, 4);
  const { w, l } = layout.architecture.mat;
  const boxes = layout.mats.map((m) => ({ id: m.id, box: aabb2(m.x, m.z, w / 2, l / 2) }));
  for (let i = 0; i < boxes.length; i++) {
    for (let j = i + 1; j < boxes.length; j++) {
      const g = gap(boxes[i].box, boxes[j].box);
      assert.ok(g >= 0.6, `${boxes[i].id} to ${boxes[j].id} gap ${g.toFixed(2)}m`);
    }
  }
});

test('instructor mat sits on the platform inside the room', () => {
  const room = layout.meta.room;
  const mat = layout.architecture.mat;
  const platform = layout.architecture.platform;
  const instructor = layout.mats.find((m) => m.id === 'instructor');
  assert.equal(instructor.y, platform.h);
  assert.ok(instructor.x - mat.w / 2 > platform.x0);
  assert.ok(instructor.x + mat.w / 2 < platform.x1);
  assert.ok(instructor.z - mat.l / 2 > platform.z0);
  assert.ok(instructor.z + mat.l / 2 < platform.z1);
  for (const m of layout.mats) {
    assert.ok(Math.abs(m.x) + mat.w / 2 < room.width / 2);
    assert.ok(Math.abs(m.z) + mat.l / 2 < room.depth / 2);
  }
});

test('skylight opening is inside the ceiling footprint and credenza misses the platform', () => {
  const sky = layout.architecture.skylight;
  const ceil = layout.architecture.ceiling;
  assert.ok(sky.x0 > ceil.x0 && sky.x1 < ceil.x1);
  assert.ok(sky.z0 > ceil.z0);
  assert.ok(sky.z0 < sky.ridgeZ && sky.ridgeZ < sky.z1);
  assert.ok(sky.yRidge > sky.yEave && sky.yEave > sky.ySoffit && sky.ySoffit > sky.yBaffle);
  const c = layout.architecture.credenza;
  const p = layout.architecture.platform;
  const separated = c.x1 < p.x0 || p.x1 < c.x0 || c.z1 < p.z0 || p.z1 < c.z0;
  assert.equal(separated, true);
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
