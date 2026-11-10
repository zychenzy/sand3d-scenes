import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { facingScore, tierSurfaces, tierCenterZ } from '../placement.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const layout = JSON.parse(fs.readFileSync(path.join(root, 'layout.json'), 'utf8'));
const room = layout.meta.room;

function inst(id) {
  return layout.instances.find((i) => i.id === id);
}

test('javascript parses', () => {
  for (const file of ['florist.js', 'botanicals.js', 'scene_lib.js', 'placement.js']) {
    const res = spawnSync(process.execPath, ['--check', path.join(root, file)], { encoding: 'utf8' });
    assert.equal(res.status, 0, res.stderr);
  }
});

test('furniture glbs are symlinks to existing bakes', () => {
  for (const spec of Object.values(layout.assets)) {
    const file = path.join(root, spec.glb);
    const stat = fs.lstatSync(file);
    assert.equal(stat.isSymbolicLink(), true, spec.glb);
    const target = fs.realpathSync(file);
    assert.equal(fs.existsSync(target), true, target);
    assert.ok(fs.statSync(target).size > 500, target);
  }
  const vendor = path.join(root, 'vendor');
  assert.equal(fs.lstatSync(vendor).isSymbolicLink(), true);
  assert.equal(fs.existsSync(path.join(vendor, 'three.module.js')), true);
});

test('zones and cameras', () => {
  for (const id of ['work_table', 'wrap_counter', 'bench_chair', 'wrap_stool', 'window_plinth']) {
    assert.ok(inst(id), id);
  }
  assert.ok(layout.camera.position && layout.camera.target);
  assert.ok(layout.cameraPresets.corner && layout.cameraPresets.close);
  assert.equal(layout.zones.workbench, 'work_table');
  assert.equal(layout.zones.wrapping, 'wrap_counter');
});

test('chair faces the bouquet table and stool faces the counter', () => {
  const chair = inst('bench_chair');
  const table = inst('work_table');
  assert.ok(facingScore(chair.position, chair.rotationY, table.position) > 0.9);
  const stool = inst('wrap_stool');
  const counter = inst('wrap_counter');
  assert.ok(facingScore(stool.position, stool.rotationY, counter.position) > 0.85);
  const gap = Math.hypot(chair.position[0] - table.position[0], chair.position[2] - table.position[2]);
  assert.ok(gap > 0.45 && gap < 1.2, gap);
});

test('shopfront door sits inside the glazed span', () => {
  const sf = layout.architecture.shopfront;
  const [d0, d1] = sf.door;
  assert.ok(d0 > sf.x0 + 0.2 && d1 < sf.x1 - 0.2);
  assert.ok(d1 - d0 > 0.75 && d1 - d0 < 1.05);
  assert.equal(sf.sign, 'BLOOM');
});

test('botanical kinds are varied and implemented', () => {
  const all = [...layout.displayPlants, ...layout.botanicals];
  const ids = all.map((p) => p.id);
  assert.equal(new Set(ids).size, ids.length);
  const counts = {};
  for (const p of all) counts[p.kind] = (counts[p.kind] || 0) + 1;
  const kinds = Object.keys(counts);
  assert.ok(kinds.length >= 12, kinds.join(','));
  for (const [kind, n] of Object.entries(counts)) {
    assert.ok(n <= 2, `${kind} x${n}`);
  }
  const src = fs.readFileSync(path.join(root, 'botanicals.js'), 'utf8');
  const block = src.slice(src.indexOf('const BUILDERS'), src.indexOf('export function addArrangement'));
  for (const kind of kinds) assert.match(block, new RegExp(`\\b${kind}\\b`));
  assert.ok(counts.sunflower === 1);
  assert.ok(counts.wrapped === 2);
  assert.ok(counts.monstera === 1);
});

test('display plants sit on their tier', () => {
  const tiers = layout.architecture.display.tiers;
  const tops = tierSurfaces(tiers);
  assert.equal(tops.length, 3);
  assert.ok(Math.abs(tops[2] - (0.26 + 0.22 + 0.2)) < 1e-6);
  for (const plant of layout.displayPlants) {
    const tier = tiers[plant.tier];
    assert.ok(Math.abs(plant.local[0]) < tier.w / 2 - 0.04, plant.id);
    assert.ok(Math.abs(plant.local[1]) < tier.d / 2 - 0.02, plant.id);
    const cz = tierCenterZ(tiers, plant.tier);
    assert.ok(Math.abs(plant.local[1] + cz) < tiers[0].d / 2 + 0.05);
  }
  const kinds = layout.displayPlants.map((p) => p.kind);
  assert.equal(new Set(kinds).size, kinds.length);
});

test('floor arrangements stay inside the room', () => {
  const { width: W, depth: D, height: H } = room;
  for (const plant of layout.botanicals) {
    const [x, y, z] = plant.position;
    assert.ok(y >= 0 && y < H, plant.id);
    assert.ok(Math.abs(x) < W / 2 - 0.15, plant.id);
    assert.ok(Math.abs(z) < D / 2 - 0.15, plant.id);
  }
});

test('workbench props sit on the table top', () => {
  const table = inst('work_table');
  const asset = layout.assets.square_table;
  const halfX = (0.76 * table.scale[0]) / 2;
  const halfZ = (0.76 * table.scale[2]) / 2;
  for (const id of ['desk_lamp', 'thermos', 'mug', 'jar_stem', 'jar_sprig']) {
    const item = inst(id);
    assert.ok(Math.abs(item.position[0] - table.position[0]) < halfX - 0.02, id);
    assert.ok(Math.abs(item.position[2] - table.position[2]) < halfZ - 0.02, id);
    assert.ok(Math.abs(item.position[1] - asset.targetHeight) < 0.02, id);
  }
  const onBench = layout.botanicals.filter((p) => p.id.startsWith('bench_'));
  assert.ok(onBench.length >= 3);
  for (const plant of onBench) {
    assert.ok(Math.abs(plant.position[0] - table.position[0]) < halfX - 0.02, plant.id);
    assert.ok(Math.abs(plant.position[2] - table.position[2]) < halfZ - 0.02, plant.id);
  }
});
