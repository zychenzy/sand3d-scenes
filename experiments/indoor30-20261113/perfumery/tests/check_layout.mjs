import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { organSlots, facingDot, obstacleClearance, samplePath, familyAt } from '../placement.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const layout = JSON.parse(fs.readFileSync(path.join(root, 'layout.json'), 'utf8'));
const room = layout.meta.room;
const byId = Object.fromEntries(layout.instances.map((item) => [item.id, item]));

test('javascript parses', () => {
  for (const file of ['perfumery.js', 'scene_lib.js', 'placement.js']) {
    const res = spawnSync(process.execPath, ['--check', path.join(root, file)], { encoding: 'utf8' });
    assert.equal(res.status, 0, res.stderr);
  }
});

test('shared assets are symlinks and bakes stay small', () => {
  const vendor = path.join(root, 'vendor');
  assert.equal(fs.lstatSync(vendor).isSymbolicLink(), true);
  assert.equal(fs.existsSync(path.join(vendor, 'three.module.js')), true);
  const realVendor = fs.realpathSync(vendor);
  assert.equal(realVendor.includes(`${path.sep}perfumery${path.sep}`), false);
  for (const [kind, spec] of Object.entries(layout.assets)) {
    const file = path.join(root, spec.glb);
    assert.equal(fs.existsSync(file), true, kind);
    const stat = fs.lstatSync(file);
    if (spec.source === 'shared') {
      assert.equal(stat.isSymbolicLink(), true, kind);
      const real = fs.realpathSync(file);
      assert.equal(real.includes(`${path.sep}perfumery${path.sep}`), false, real);
      assert.ok(fs.statSync(real).size > 500, real);
    } else {
      assert.equal(spec.source, 'baked', kind);
      assert.equal(stat.isSymbolicLink(), false, kind);
      assert.ok(stat.size < 120000, `${kind} ${stat.size}`);
    }
  }
});

test('toon gradient is stepped and unlit is MeshBasicMaterial', () => {
  const src = fs.readFileSync(path.join(root, 'scene_lib.js'), 'utf8');
  assert.match(src, /makeToonGradient\(4\)/);
  assert.match(src, /MeshToonMaterial/);
  assert.match(src, /MeshBasicMaterial/);
  assert.match(src, /52 \+ \(i \/ \(steps - 1\)\) \* 203/);
});

test('room rejects cafe and lab kit', () => {
  const kinds = new Set(layout.instances.map((item) => item.kind));
  for (const banned of ['espresso_machine', 'cup_mug', 'bar_stool', 'bar_counter', 'cash_register', 'chalkboard', 'school_desk']) {
    assert.equal(kinds.has(banned), false, banned);
  }
  const text = fs.readFileSync(path.join(root, 'perfumery.js'), 'utf8');
  assert.equal(/bunsen|erlenmeyer|microscope|espresso/i.test(text), false);
});

test('seats face the work and stay human-scaled', () => {
  const bench = layout.anchors.bench;
  const table = layout.anchors.table;
  assert.ok(facingDot(byId.chair_nose.position, byId.chair_nose.rotationY, [bench.x, 0, bench.z]) > 0.9);
  assert.ok(facingDot(byId.chair_client.position, byId.chair_client.rotationY, [table.x, 0, table.z]) > 0.9);
  assert.ok(facingDot(byId.chair_consult.position, byId.chair_consult.rotationY, [table.x, 0, table.z]) > 0.9);
  assert.ok(layout.assets.dining_chair.targetHeight > 0.85 && layout.assets.dining_chair.targetHeight < 0.98);
  assert.ok(layout.assets.square_table.targetHeight > 0.7 && layout.assets.square_table.targetHeight < 0.8);
  for (const kind of ['flacon_rect', 'flacon_round', 'flacon_shoulder', 'flacon_oval', 'flacon_atomizer']) {
    assert.ok(layout.assets[kind].targetHeight < 0.22, kind);
  }
  assert.ok(layout.assets.balance_scale.targetHeight < 0.28);
  assert.ok(layout.assets.pipette.targetHeight < 0.22);
});

test('organ is a semicircle of mixed silhouettes inside the room', () => {
  const slots = organSlots(layout.anchors.organ);
  assert.ok(slots.length >= 48, slots.length);
  const kinds = new Set(slots.map((slot) => slot.kind));
  assert.ok(kinds.size >= 4, [...kinds].join(','));
  const families = new Set(slots.map((slot) => slot.family));
  for (const family of ['citrus', 'floral', 'wood', 'resin']) assert.ok(families.has(family));
  const halfW = room.width / 2;
  const halfD = room.depth / 2;
  for (const slot of slots) {
    const [x, y, z] = slot.position;
    assert.ok(Math.abs(x) < halfW - 0.35, slot.id);
    assert.ok(Math.abs(z) < halfD - 0.35, slot.id);
    assert.ok(y > 0.7 && y < 1.8, slot.id);
    assert.equal(slot.family, familyAt(slot.t));
    const dot = facingDot(slot.position, slot.rotationY, [layout.anchors.organ.cx, 0, layout.anchors.organ.cz]);
    assert.ok(dot > 0.9, `${slot.id} ${dot}`);
  }
  const low = slots.filter((slot) => slot.tier === 'low');
  const high = slots.filter((slot) => slot.tier === 'high');
  const reach = (slot) => Math.hypot(slot.position[0] - layout.anchors.organ.cx, slot.position[2] - layout.anchors.organ.cz);
  assert.ok(Math.min(...high.map(reach)) > Math.max(...low.map(reach)));
});

test('paths stay clear of seats, bench, organ, and archive', () => {
  const slots = organSlots(layout.anchors.organ);
  const obstacles = [
    { id: 'nose', x: byId.chair_nose.position[0], z: byId.chair_nose.position[2], r: 0.34 },
    { id: 'client', x: byId.chair_client.position[0], z: byId.chair_client.position[2], r: 0.34 },
    { id: 'consult', x: byId.chair_consult.position[0], z: byId.chair_consult.position[2], r: 0.34 },
    { id: 'table', x: layout.anchors.table.x, z: layout.anchors.table.z, r: 0.5 },
    { id: 'bench', ...rect(layout.anchors.bench) },
    { id: 'drawers', ...rect(layout.anchors.drawers) },
    { id: 'plinth', x: layout.anchors.plinth.x, z: layout.anchors.plinth.z, r: 0.32 },
    { id: 'case_a', x: byId.archive_a.position[0], z: byId.archive_a.position[2], hw: 0.42, hd: 0.24 },
    { id: 'case_b', x: byId.archive_b.position[0], z: byId.archive_b.position[2], hw: 0.42, hd: 0.24 },
    ...slots.map((slot) => ({ id: slot.id, x: slot.position[0], z: slot.position[2], r: 0.12 })),
  ];
  for (const [name, points] of Object.entries(layout.anchors.paths)) {
    for (const [x, z] of samplePath(points, 0.2)) {
      const clearance = obstacleClearance(x, z, obstacles);
      assert.ok(clearance > 0.34, `${name} at ${x.toFixed(2)},${z.toFixed(2)} clearance ${clearance.toFixed(2)}`);
      assert.ok(Math.abs(x) < room.width / 2 - 0.3, name);
      assert.ok(Math.abs(z) < room.depth / 2 - 0.2, name);
    }
  }
});

function rect(box) {
  return { x: box.x, z: box.z, hw: box.w / 2, hd: box.d / 2 };
}

test('instances sit in the room and resolve', () => {
  const ids = new Set();
  for (const item of layout.instances) {
    assert.equal(ids.has(item.id), false, item.id);
    ids.add(item.id);
    const [x, y, z] = item.position;
    assert.ok(Math.abs(x) < room.width / 2 - 0.15, item.id);
    assert.ok(Math.abs(z) < room.depth / 2 - 0.15, item.id);
    assert.ok(y >= 0 && y < room.height, item.id);
    assert.ok(layout.assets[item.kind], item.kind);
  }
  assert.ok(layout.cameraPresets.corner && layout.cameraPresets.detail);
  assert.equal(byId.balance.position[1], layout.anchors.bench.top);
  assert.equal(byId.pipette_a.position[1], layout.anchors.bench.top);
});
