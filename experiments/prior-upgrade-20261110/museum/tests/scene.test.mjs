import assert from 'node:assert/strict';
import { existsSync, lstatSync, readFileSync, realpathSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const layout = JSON.parse(readFileSync(join(root, 'layout.json'), 'utf8'));
const repo = join(root, '../../..');

function rectFor(inst) {
  const asset = layout.assets[inst.kind];
  let hx = asset.hx * (Array.isArray(inst.scale) ? inst.scale[0] : inst.scale || 1);
  let hz = asset.hz * (Array.isArray(inst.scale) ? inst.scale[2] ?? inst.scale[0] : inst.scale || 1);
  const rot = Math.abs(inst.rotationY || 0) % Math.PI;
  if (Math.abs(rot - Math.PI / 2) < 0.35) [hx, hz] = [hz, hx];
  return { x: inst.position[0], z: inst.position[2], hx, hz, id: inst.id };
}

function overlap(a, b, pad = 0.08) {
  return Math.abs(a.x - b.x) < a.hx + b.hx - pad && Math.abs(a.z - b.z) < a.hz + b.hz - pad;
}

test('shared glb symlinks resolve and are not duplicated blobs', () => {
  for (const spec of Object.values(layout.assets)) {
    const path = join(root, spec.glb);
    assert.equal(existsSync(path), true, spec.glb);
    const st = lstatSync(path);
    assert.equal(st.isSymbolicLink(), true, `${spec.glb} should be a symlink`);
    const resolved = realpathSync(path);
    assert.ok(resolved.startsWith(repo), resolved);
    assert.ok(!resolved.includes('prior-upgrade-20261110'), resolved);
    const file = statSync(path);
    assert.equal(file.isFile(), true, spec.glb);
    assert.ok(file.size > 500, spec.glb);
  }
  assert.equal(lstatSync(join(root, 'vendor')).isSymbolicLink(), true);
});

test('room is a tall gallery, not the v1 box', () => {
  assert.ok(layout.meta.room.height >= 4.5);
  assert.ok(layout.meta.room.width >= 13);
  assert.ok(layout.architecture.works.length >= 7);
  assert.ok(layout.architecture.vitrines.length >= 3);
  assert.ok(layout.architecture.plinths.length >= 3);
  assert.ok(layout.architecture.skylight.w >= 8);
  assert.ok(layout.architecture.niche.head >= 2.4);
  assert.ok(layout.architecture.door.head >= 2.5);
});

test('long benches only, facing the picture wall', () => {
  const benches = layout.instances.filter((i) => i.kind === 'museum_bench');
  assert.equal(benches.length, 2);
  const sofas = layout.instances.filter((i) => /sofa|armchair|loveseat/i.test(i.kind));
  assert.equal(sofas.length, 0);
  const kinds = Object.keys(layout.assets);
  assert.ok(!kinds.includes('museum_plinth'));
  assert.ok(!kinds.includes('museum_vitrine'));
  assert.ok(!kinds.includes('display_bookcase'));
  for (const bench of benches) {
    assert.ok(Math.abs((bench.rotationY || 0) - Math.PI / 2) < 0.05, `${bench.id} should run along X`);
    assert.ok(bench.position[2] > 1.6, `${bench.id} sits in the viewing aisle, not against the art`);
  }
  const west = benches.find((b) => b.id === 'bench_west');
  const east = benches.find((b) => b.id === 'bench_east');
  const gap = east.position[0] - west.position[0];
  assert.ok(gap > 3.2, `center aisle between benches ${gap}`);
});

test('glass vitrines and plinths leave a center vista and do not collide with benches', () => {
  const benches = layout.instances.filter((i) => i.kind === 'museum_bench').map(rectFor);
  const blockers = [
    ...layout.architecture.plinths.map((p) => ({ id: p.id, x: p.x, z: p.z, hx: p.w / 2, hz: p.d / 2 })),
    ...layout.architecture.vitrines.map((v) => ({ id: v.id, x: v.x, z: v.z, hx: v.w / 2, hz: v.d / 2 })),
  ];
  for (const b of benches) {
    for (const o of blockers) {
      assert.equal(overlap(b, o), false, `${b.id} overlaps ${o.id}`);
    }
  }
  const aisle = layout.architecture.aisle;
  for (const o of blockers.filter((x) => x.id !== 'niche_bust')) {
    const inVista = o.x + o.hx > aisle.centerX0 && o.x - o.hx < aisle.centerX1;
    assert.equal(inVista, false, `${o.id} blocks the center vista`);
  }
  for (const v of layout.architecture.vitrines) {
    assert.ok(v.h >= 0.9);
    assert.ok(v.w >= 0.9);
    assert.ok(v.kind === 'standing' || v.kind === 'table');
  }
});

test('circulation in front of the picture wall stays walkable', () => {
  const wall = layout.architecture.backWallZ;
  const benches = layout.instances.filter((i) => i.kind === 'museum_bench').map(rectFor);
  for (const b of benches) {
    const front = b.z - b.hz;
    assert.ok(front - wall >= 5.5, `${b.id} viewing distance ${front - wall}`);
  }
  const nearest = layout.architecture.plinths
    .concat(layout.architecture.vitrines)
    .filter((p) => p.id !== 'niche_bust')
    .reduce((m, p) => Math.min(m, p.z + (p.d || p.hz || 0.3)), 9);
  for (const b of benches) {
    const front = b.z - b.hz;
    assert.ok(front - nearest >= 1.2, `${b.id} to nearest object ${front - nearest}`);
  }
});

test('layered gallery lighting is present', () => {
  assert.ok(layout.lights.window);
  assert.ok(layout.lights.key);
  assert.ok(layout.lights.fill);
  assert.ok(layout.lights.points.length >= 8);
  assert.ok(layout.architecture.spots.length >= 5);
});
