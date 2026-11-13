import { readFileSync, lstatSync, realpathSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import assert from 'node:assert/strict';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const repo = resolve(root, '../../..');
const layout = JSON.parse(readFileSync(join(root, 'layout.json'), 'utf8'));

function aabb(x, z, w, d) {
  return { x0: x - w / 2, x1: x + w / 2, z0: z - d / 2, z1: z + d / 2 };
}

function overlaps(a, b) {
  return a.x0 < b.x1 - 0.02 && a.x1 > b.x0 + 0.02 && a.z0 < b.z1 - 0.02 && a.z1 > b.z0 + 0.02;
}

function near(a, b, tol = 0.05) {
  assert.ok(Math.abs(a - b) <= tol, `${a} vs ${b}`);
}

function footOf(inst) {
  const spec = layout.assets[inst.kind];
  let [w, d] = spec.foot;
  const rot = inst.rotationY || 0;
  if (Math.abs(Math.abs(rot) - Math.PI / 2) < 0.2) [w, d] = [d, w];
  const [x, , z] = inst.position;
  return aabb(x, z, w, d);
}

test('scripts parse and do not reference a CDN', () => {
  for (const file of ['grooming.js', 'scene_lib.js', 'index.html']) {
    const text = readFileSync(join(root, file), 'utf8');
    assert.doesNotMatch(text, /https?:\/\//);
    assert.doesNotMatch(text, /MeshStandardMaterial|MeshPhongMaterial/);
  }
  assert.match(readFileSync(join(root, 'scene_lib.js'), 'utf8'), /MeshToonMaterial/);
  assert.match(readFileSync(join(root, 'scene_lib.js'), 'utf8'), /MeshBasicMaterial/);
  for (const file of ['grooming.js', 'scene_lib.js']) {
    const checked = spawnSync(process.execPath, ['--check', join(root, file)], { encoding: 'utf8' });
    assert.equal(checked.status, 0, checked.stderr);
  }
});

test('shared GLBs and three.js stay outside this scene', () => {
  assert.equal(lstatSync(join(root, 'vendor')).isSymbolicLink(), true);
  const files = [
    ...Object.values(layout.assets).map((spec) => spec.glb),
    'vendor/three.module.js',
    'vendor/controls/OrbitControls.js',
    'vendor/loaders/GLTFLoader.js',
    'vendor/utils/BufferGeometryUtils.js',
  ];
  for (const rel of files) {
    const abs = join(root, rel);
    if (!rel.startsWith('vendor/')) assert.equal(lstatSync(abs).isSymbolicLink(), true, rel);
    const real = realpathSync(abs);
    assert.equal(relative(repo, real).startsWith('..'), false, real);
    assert.equal(relative(root, real).startsWith('..'), true, real);
    assert.ok(readFileSync(abs).length > 500, rel);
  }
});

test('human scale for tables, tub, counter, kennels, and room', () => {
  const room = layout.meta.room;
  assert.ok(room.height >= 2.9 && room.height <= 3.5);
  assert.ok(room.width >= 8 && room.depth >= 7);
  const { tableA, tableB, tub, counter, kennel } = layout.stations;
  for (const table of [tableA, tableB]) {
    assert.ok(table.top >= 0.82 && table.top <= 1.0, table.id);
    assert.ok(table.w >= 1.0 && table.w <= 1.4, table.id);
    assert.ok(table.d >= 0.5 && table.d <= 0.75, table.id);
  }
  assert.ok(tub.rim >= 0.86 && tub.rim <= 1.02);
  assert.ok(tub.w >= 1.1 && tub.w <= 1.6);
  assert.ok(counter.h >= 0.98 && counter.h <= 1.12);
  assert.ok(counter.ledge >= 0.45 && counter.ledge <= 0.65);
  assert.ok(kennel.h >= 1.2 && kennel.h <= 1.7);
  assert.equal(layout.meta.animals, 0);
  assert.ok(layout.assets.dining_chair.targetHeight >= 0.8 && layout.assets.dining_chair.targetHeight <= 0.95);
  assert.ok(layout.assets.simple_chair.targetHeight >= 0.8 && layout.assets.simple_chair.targetHeight <= 0.95);
  assert.ok(layout.assets.museum_bench.targetHeight >= 0.42 && layout.assets.museum_bench.targetHeight <= 0.58);
});

test('gate openings are walkable and aisle rectangles stay at least 0.85 m', () => {
  for (const opening of layout.openings) {
    const width = opening.x1 - opening.x0;
    near(width, opening.width, 0.02);
    assert.ok(width >= 0.85, opening.id);
    assert.ok(opening.height >= 0.68 && opening.height <= 0.88, opening.id);
  }
  for (const aisle of layout.aisles) {
    const w = aisle.x1 - aisle.x0;
    const d = aisle.z1 - aisle.z0;
    assert.ok(Math.min(w, d) >= 0.85, `${aisle.id} ${w.toFixed(2)} x ${d.toFixed(2)}`);
  }
});

test('stations and barriers stay out of the aisles', () => {
  const solids = [
    ...Object.entries(layout.stations).map(([id, s]) => ({ id, box: aabb(s.x, s.z, s.w, s.d) })),
    ...layout.barriers.map((b) => ({ id: b.id, box: aabb(b.x, b.z, b.w, b.d) })),
  ];
  for (const aisle of layout.aisles) {
    const box = { x0: aisle.x0, x1: aisle.x1, z0: aisle.z0, z1: aisle.z1 };
    for (const solid of solids) {
      assert.equal(overlaps(box, solid.box), false, `${aisle.id} hits ${solid.id}`);
    }
  }
});

test('floor instances keep a gap from stations and stay inside the shell', () => {
  const room = layout.meta.room;
  const stations = Object.entries(layout.stations).map(([id, s]) => ({ id, box: aabb(s.x, s.z, s.w, s.d) }));
  const ids = new Set();
  for (const inst of layout.instances) {
    assert.equal(ids.has(inst.id), false, inst.id);
    ids.add(inst.id);
    assert.ok(layout.assets[inst.kind], inst.kind);
    const [x, y, z] = inst.position;
    assert.ok(Math.abs(x) < room.width / 2 - 0.12, inst.id);
    assert.ok(Math.abs(z) < room.depth / 2 - 0.12, inst.id);
    assert.ok(y >= 0 && y < room.height, inst.id);
    if (y > 0.25) continue;
    const foot = footOf(inst);
    for (const station of stations) {
      assert.equal(overlaps(foot, station.box), false, `${inst.id} hits ${station.id}`);
    }
    for (const aisle of layout.aisles) {
      const box = { x0: aisle.x0, x1: aisle.x1, z0: aisle.z0, z1: aisle.z1 };
      assert.equal(overlaps(foot, box), false, `${inst.id} blocks ${aisle.id}`);
    }
  }
});

test('chairs face the workstation they serve', () => {
  const byId = Object.fromEntries(layout.instances.map((inst) => [inst.id, inst]));
  for (const row of layout.facing) {
    const inst = byId[row.id];
    const station = layout.stations[row.station];
    const rot = inst.rotationY || 0;
    if (row.face === 'negZ') {
      near(Math.abs(rot), Math.PI, 0.03);
      assert.ok(inst.position[2] > station.z, row.id);
    } else if (row.face === 'posZ') {
      near(rot, 0, 0.03);
      assert.ok(inst.position[2] < station.z, row.id);
    } else if (row.face === 'posX') {
      near(rot, -Math.PI / 2, 0.03);
      assert.ok(inst.position[0] < station.x, row.id);
    }
  }
});
