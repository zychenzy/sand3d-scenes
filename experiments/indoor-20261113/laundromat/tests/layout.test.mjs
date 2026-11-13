import assert from 'node:assert/strict';
import { readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const layout = JSON.parse(readFileSync(path.join(root, 'layout.json'), 'utf8'));
const scene = readFileSync(path.join(root, 'laundromat.js'), 'utf8');
const lib = readFileSync(path.join(root, 'scene_lib.js'), 'utf8');
const html = readFileSync(path.join(root, 'index.html'), 'utf8');

function worldForward(rot, axis) {
  let lx = 0;
  let lz = 1;
  if (axis === '-z') lz = -1;
  else if (axis === '+x') { lx = 1; lz = 0; }
  else if (axis === '-x') { lx = -1; lz = 0; }
  const c = Math.cos(rot);
  const s = Math.sin(rot);
  return [lx * c + lz * s, -lx * s + lz * c];
}

function aabbOf(x, z, w, d, rot) {
  const quarter = Math.abs(Math.sin(rot || 0)) > 0.5;
  const ww = quarter ? d : w;
  const dd = quarter ? w : d;
  return { minX: x - ww / 2, maxX: x + ww / 2, minZ: z - dd / 2, maxZ: z + dd / 2 };
}

function blockers() {
  const boxes = [];
  for (const inst of layout.instances) {
    if (inst.blocks === false) continue;
    const spec = layout.assets[inst.kind];
    const [w, d] = spec.foot;
    boxes.push({
      id: inst.id,
      ...aabbOf(inst.position[0], inst.position[2], w, d, inst.rotationY || 0),
    });
  }
  const proc = layout.procedural;
  const groups = [proc.tables, proc.carts, [proc.change], [proc.shelf], [proc.aFrame], [proc.trash]];
  for (const group of groups) {
    for (const item of group) {
      if (item.blocks === false) continue;
      const [w, , d] = item.size;
      boxes.push({
        id: item.id,
        ...aabbOf(item.position[0], item.position[2], w, d, item.rotationY || 0),
      });
    }
  }
  return boxes;
}

test('room, banks, and cameras describe a laundromat', () => {
  const { width, depth, height } = layout.meta.room;
  assert.equal(layout.meta.units, 'metres');
  assert.ok(width >= 12 && width <= 16);
  assert.ok(depth >= 8 && depth <= 12);
  assert.ok(height >= 2.9 && height <= 3.6);
  assert.equal(layout.instances.filter((item) => item.kind === 'washer').length, 8);
  assert.equal(layout.instances.filter((item) => item.kind === 'dryer').length, 6);
  assert.equal(layout.procedural.tables.length, 2);
  assert.ok(layout.procedural.carts.length >= 3);
  assert.equal(layout.instances.filter((item) => item.kind === 'folding_chair').length, 5);
  for (const key of ['corner', 'close']) {
    assert.equal(layout.cameraPresets[key].position.length, 3);
    assert.equal(layout.cameraPresets[key].target.length, 3);
  }
});

test('machines, chairs, and the vendor face the aisle they serve', () => {
  const faced = layout.instances.filter((item) => item.facesAt);
  assert.ok(faced.length >= 8 + 6 + 5);
  for (const item of faced) {
    const axis = layout.assets[item.kind].front;
    const [fx, fz] = worldForward(item.rotationY || 0, axis);
    const dx = item.facesAt[0] - item.position[0];
    const dz = item.facesAt[1] - item.position[2];
    const dot = (fx * dx + fz * dz) / Math.hypot(dx, dz);
    assert.ok(dot > 0.85, `${item.id} front=${axis} dot=${dot.toFixed(3)}`);
  }
});

test('proportions match standing fold tables, waiting seats, and commercial machines', () => {
  assert.equal(layout.assets.washer.targetHeight, 1.02);
  assert.ok(layout.assets.dryer.targetHeight >= 1.02 && layout.assets.dryer.targetHeight <= 1.2);
  assert.ok(layout.assets.vending.targetHeight >= 1.7 && layout.assets.vending.targetHeight <= 2.05);
  assert.ok(layout.assets.folding_chair.targetHeight >= 0.8 && layout.assets.folding_chair.targetHeight <= 0.95);
  const seat = layout.assets.folding_chair.targetHeight * (0.413 / 0.852);
  assert.ok(seat > 0.38 && seat < 0.48, `seat ${seat}`);
  for (const table of layout.procedural.tables) {
    assert.ok(table.size[1] >= 0.88 && table.size[1] <= 0.95, table.id);
    assert.ok(table.size[0] >= 1.8, table.id);
  }
  for (const aisle of layout.procedural.aisles) {
    const spanX = aisle.max[0] - aisle.min[0];
    const spanZ = aisle.max[1] - aisle.min[1];
    assert.ok(Math.min(spanX, spanZ) >= 1.05, `${aisle.id} narrow`);
  }
});

test('blocking footprints stay out of the aisles and off each other', () => {
  const boxes = blockers();
  for (const aisle of layout.procedural.aisles) {
    for (let x = aisle.min[0]; x <= aisle.max[0] + 1e-6; x += 0.25) {
      for (let z = aisle.min[1]; z <= aisle.max[1] + 1e-6; z += 0.25) {
        const hit = boxes.find((box) => x >= box.minX && x <= box.maxX && z >= box.minZ && z <= box.maxZ);
        assert.equal(hit, undefined, `${aisle.id} blocked at ${x.toFixed(2)},${z.toFixed(2)} by ${hit?.id}`);
      }
    }
  }
  for (let i = 0; i < boxes.length; i++) {
    for (let j = i + 1; j < boxes.length; j++) {
      const a = boxes[i];
      const b = boxes[j];
      const overlapX = Math.min(a.maxX, b.maxX) - Math.max(a.minX, b.minX);
      const overlapZ = Math.min(a.maxZ, b.maxZ) - Math.max(a.minZ, b.minZ);
      assert.ok(overlapX < 0.04 || overlapZ < 0.04, `${a.id} overlaps ${b.id} (${overlapX.toFixed(2)}, ${overlapZ.toFixed(2)})`);
    }
  }
});

test('machines sit against the shell without leaving the room', () => {
  const { width, depth } = layout.meta.room;
  const innerL = -width / 2 + 0.02;
  const innerB = -depth / 2 + 0.02;
  const innerR = width / 2 - 0.2;
  const innerF = depth / 2 - 0.2;
  for (const box of blockers()) {
    assert.ok(box.minX >= innerL - 0.02, `${box.id} through left wall`);
    assert.ok(box.minZ >= innerB - 0.02, `${box.id} through back wall`);
    assert.ok(box.maxX <= innerR, `${box.id} out the open right`);
    assert.ok(box.maxZ <= innerF, `${box.id} out the open front`);
  }
});

test('baked assets and vendored three resolve offline', () => {
  for (const spec of Object.values(layout.assets)) {
    const file = path.join(root, spec.glb);
    assert.ok(statSync(file).size > 1000, spec.glb);
  }
  assert.ok(statSync(path.join(root, 'vendor/three.module.js')).size > 1000);
  assert.ok(statSync(path.join(root, 'vendor/controls/OrbitControls.js')).size > 1000);
  const blob = `${scene}\n${lib}\n${html}`;
  assert.equal(/unpkg|jsdelivr|cdnjs|skypack|googleapis/.test(blob), false);
  assert.match(lib, /MeshToonMaterial/);
  assert.match(lib, /MeshBasicMaterial/);
  assert.match(lib, /PCFHardShadowMap/);
  assert.match(lib, /gradientMap/);
  assert.match(lib, /params\.get\('shot'\)/);
  assert.match(scene, /makeProcedural/);
});
