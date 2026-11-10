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
  for (const file of ['gym.js', 'scene_lib.js', 'index.html']) {
    const text = readFileSync(join(root, file), 'utf8');
    assert.doesNotMatch(text, /https?:\/\//);
  }
  for (const file of ['gym.js', 'scene_lib.js']) {
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
    assert.equal(lstatSync(abs).isSymbolicLink() || lstatSync(join(root, 'vendor')).isSymbolicLink(), true, rel);
    const real = realpathSync(abs);
    const relRepo = relative(repo, real);
    assert.equal(relRepo.startsWith('..'), false, real);
    assert.equal(relative(root, real).startsWith('..'), true, real);
  }
});

test('five zones, three bags, three mats, walking and striking gaps', () => {
  const ids = layout.meta.zones.map((z) => z.id);
  assert.deepEqual(ids, ['bags', 'strength', 'floor', 'mats', 'rest']);
  const bags = layout.instances.filter((i) => i.kind === 'punching_bag');
  assert.equal(bags.length, 3);
  for (let i = 0; i < bags.length; i++) {
    for (let j = i + 1; j < bags.length; j++) {
      const dx = bags[i].position[0] - bags[j].position[0];
      const dz = bags[i].position[2] - bags[j].position[2];
      const dist = Math.hypot(dx, dz);
      assert.ok(dist >= 2.2, `bag spacing ${dist.toFixed(2)}m`);
    }
  }
  const aisle = layout.architecture.aisle;
  for (const bag of bags) {
    assert.ok(bag.position[2] + 1.45 < aisle.z, `${bag.id} striking space in front of aisle`);
  }
  assert.equal(layout.mats.length, 3);
  const { w, l } = layout.architecture.mat;
  const boxes = layout.mats.map((m) => ({ id: m.id, box: aabb2(m.x, m.z, w / 2, l / 2) }));
  for (let i = 0; i < boxes.length; i++) {
    for (let j = i + 1; j < boxes.length; j++) {
      const g = gap(boxes[i].box, boxes[j].box);
      assert.ok(g >= 0.55, `${boxes[i].id} to ${boxes[j].id} gap ${g.toFixed(2)}m`);
    }
  }
});

test('squat rack is human scale and faces the floor', () => {
  const rack = layout.architecture.rack;
  assert.ok(rack.uprightH >= 2.2 && rack.uprightH <= 2.45, rack.uprightH);
  assert.ok(rack.spanX >= 1.1 && rack.spanX <= 1.4);
  assert.ok(rack.spanZ >= 1.3 && rack.spanZ <= 1.7);
  assert.ok(rack.x < -3.5, 'rack on left wall');
  const db = layout.architecture.dbRack;
  assert.ok(db.len >= 2.0 && db.h >= 1.0);
  const turf = layout.architecture.turf;
  assert.ok(turf.x1 - turf.x0 >= 3.0);
  assert.ok(turf.z1 - turf.z0 >= 2.8);
});

test('rest benches face the training floor, mat bench faces inward', () => {
  const rest = layout.instances.filter((i) => i.id.startsWith('bench_rest'));
  assert.equal(rest.length, 2);
  for (const b of rest) {
    assert.ok(Math.abs(b.rotationY - Math.PI / 2) < 0.02, 'long axis along +X, sit toward -Z');
    assert.ok(b.position[2] > 3.1, 'rest benches on the open edge');
  }
  const mats = layout.instances.find((i) => i.id === 'bench_mats');
  assert.equal(mats.rotationY, 0);
  assert.ok(mats.position[0] > 4.8);
});

test('instances are unique, on known assets, and inside the shell', () => {
  const room = layout.meta.room;
  const ids = new Set();
  for (const inst of layout.instances) {
    assert.equal(ids.has(inst.id), false, inst.id);
    ids.add(inst.id);
    assert.ok(layout.assets[inst.kind], inst.kind);
    assert.ok(inst.position[0] > -room.width / 2 - 0.08 && inst.position[0] < room.width / 2 + 0.08);
    assert.ok(inst.position[2] > -room.depth / 2 - 0.08 && inst.position[2] < room.depth / 2 + 0.08);
    assert.ok(inst.position[1] >= 0 && inst.position[1] < room.height + 0.2);
  }
  assert.ok(layout.cameraPresets.corner && layout.cameraPresets.close);
  assert.ok((layout.lights.points || []).length >= 4);
});
