import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { derive, forwardXZ } from '../metrics.mjs';

const root = path.resolve(import.meta.dirname, '..');
const layout = JSON.parse(fs.readFileSync(path.join(root, 'layout.json'), 'utf8'));
const d = derive(layout);

function dist(a, b) {
  return Math.hypot(a[0] - b[0], a[1] - b[1], (a[2] || 0) - (b[2] || 0));
}

test('stair is a comfortable flight that lands on the loft', () => {
  assert.equal(d.topZ, layout.meta.loft.frontZ);
  assert.ok(Math.abs(d.rise * layout.meta.stair.risers - d.walkY) < 1e-9);
  assert.ok(Math.abs(d.bottomZ - (d.topZ + d.run)) < 1e-9);
  assert.ok(d.rise >= 0.15 && d.rise <= 0.185, `rise ${d.rise}`);
  assert.ok(d.rule >= 0.6 && d.rule <= 0.65, `2R+G ${d.rule}`);
  assert.equal(layout.meta.stair.going, 0.27);
  assert.ok(d.stairWidth >= 0.9);
  assert.ok(d.handrailH >= 0.85 && d.handrailH <= 1.0);
  assert.ok(d.guardH >= 1.0);
  assert.ok(d.balusterClear <= 0.1 && d.balusterClear > 0.04, `clear ${d.balusterClear}`);
  assert.ok(d.soffitY >= 2.1, 'headroom under the loft');
  assert.ok(d.bottomZ < d.maxZ - layout.meta.clearance.minApproach, 'approach in front of the first riser');
});

test('stair aisle and loft walkway stay clear', () => {
  const aisle = d.tableLeft - d.rightX;
  assert.ok(aisle >= layout.meta.clearance.minAisle, `aisle ${aisle}`);
  const walkway = d.frontZ - d.desk.partitionEndZ;
  assert.ok(walkway >= layout.meta.clearance.minWalkway, `walkway ${walkway}`);
  for (const x of layout.meta.posts) {
    assert.ok(x > d.rightX + 0.4 && x < d.maxX - 0.4);
  }
  assert.ok(d.postXs[0] >= d.rightX - 0.001);
});

test('chairs face their table or desk and sit in reach', () => {
  const foot = layout.assets.dining_chair.foot;
  const halfD = foot[1] / 2;
  for (const inst of layout.instances) {
    if (inst.kind !== 'dining_chair') continue;
    const [fx, fz] = forwardXZ(inst.rotationY || 0);
    const tx = inst.face[0] - inst.position[0];
    const tz = inst.face[1] - inst.position[2];
    const len = Math.hypot(tx, tz) || 1;
    const dot = fx * (tx / len) + fz * (tz / len);
    assert.ok(dot > 0.75, `${inst.id} faces away dot=${dot.toFixed(2)}`);
    if (inst.role === 'table-chair') {
      const along = inst.position[2] < d.table.cz
        ? d.tableNorthZ - inst.position[2]
        : inst.position[2] - d.tableSouthZ;
      assert.ok(along > halfD * 0.4 && along < 0.55, `${inst.id} pull ${along}`);
      assert.ok(inst.position[0] > d.tableLeft + 0.15 && inst.position[0] < d.tableRight - 0.15);
    }
    if (inst.role === 'carrel-chair') {
      const bay = layout.meta.carrels.find((c) => c.id === inst.bay);
      assert.ok(bay, inst.id);
      assert.ok(inst.position[0] > bay.x0 + 0.2 && inst.position[0] < bay.x1 - 0.2);
      assert.equal(inst.position[1], d.walkY);
      assert.ok(inst.position[2] > d.deskFrontZ, `${inst.id} behind the desk`);
      assert.ok(inst.position[2] + halfD < d.desk.partitionEndZ - 0.2, `${inst.id} blocks the walkway`);
    }
  }
});

test('every carrel has a task lamp on the desk, and lamps have lights', () => {
  for (const bay of layout.meta.carrels) {
    const lamps = layout.instances.filter((i) => i.role === 'task-lamp' && i.bay === bay.id);
    assert.equal(lamps.length, 1, bay.id);
    const lamp = lamps[0];
    assert.ok(Math.abs(lamp.position[1] - d.deskTopY) < 0.02);
    assert.ok(lamp.position[0] > bay.x0 + 0.1 && lamp.position[0] < bay.x1 - 0.1);
    assert.ok(lamp.position[2] > d.desk.backZ + 0.12 && lamp.position[2] < d.deskFrontZ - 0.05);
    const light = layout.lights.points.find((p) => p.id === lamp.id);
    assert.ok(light, `point for ${lamp.id}`);
    assert.ok(dist(light.position, [lamp.position[0], lamp.position[1] + 0.32, lamp.position[2]]) < 0.15);
  }
  const tableLamps = layout.instances.filter((i) => i.role === 'task-lamp' && !i.bay);
  assert.ok(tableLamps.length >= 2);
  for (const lamp of tableLamps) {
    assert.ok(Math.abs(lamp.position[1] - d.table.top) < 0.02);
    assert.ok(lamp.position[0] > d.tableLeft && lamp.position[0] < d.tableRight);
  }
});

test('props stay out of the stair footprint', () => {
  const pad = 0.15;
  for (const inst of layout.instances) {
    const [x, y, z] = inst.position;
    if (y > 0.2) continue;
    const inside = x > d.leftX - pad && x < d.rightX + pad && z > d.topZ - pad && z < d.bottomZ + pad;
    assert.equal(inside, false, `${inst.id} sits in the stair`);
  }
});

test('shared assets are symlinks, not copied GLBs', () => {
  for (const spec of Object.values(layout.assets)) {
    const file = path.join(root, spec.glb);
    const stat = fs.lstatSync(file);
    assert.equal(stat.isSymbolicLink(), true, `${file} mode=${stat.mode} dirname=${import.meta.dirname}`);
    assert.ok(fs.existsSync(file), spec.glb);
    assert.ok(fs.statSync(file).size > 500, spec.glb);
  }
  const vendor = path.join(root, 'vendor', 'three.module.js');
  assert.ok(fs.existsSync(vendor));
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  assert.match(html, /study-loft\.js/);
  assert.doesNotMatch(html, /https?:\/\//);
});
