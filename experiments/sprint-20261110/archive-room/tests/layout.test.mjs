import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const sceneDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const repoRoot = path.resolve(sceneDir, '../../..');
const layout = JSON.parse(fs.readFileSync(path.join(sceneDir, 'layout.json'), 'utf8'));

const KIND_FP = {
  study_desk: [0.26, 0.7],
  dining_chair: [0.18, 0.22],
  display_bookcase: [0.45, 0.23],
  book_stand: [0.36, 0.36],
  museum_bench: [0.2, 0.7],
  museum_vitrine: [0.32, 0.32],
  flowerpot: [0.2, 0.2],
  wall_shelf: [0.36, 0.16],
  library_lamp: [0.18, 0.18],
  pendant_lamp: [0.22, 0.22],
};

function aabb(x, z, hx, hz, rotY = 0) {
  const c = Math.abs(Math.cos(rotY));
  const s = Math.abs(Math.sin(rotY));
  const wx = hx * c + hz * s;
  const wz = hx * s + hz * c;
  return { minX: x - wx, maxX: x + wx, minZ: z - wz, maxZ: z + wz };
}

function overlaps(a, rect) {
  return a.maxX > rect.min[0] && a.minX < rect.max[0] && a.maxZ > rect.min[1] && a.minZ < rect.max[1];
}

function closestOnRect(px, pz, rect) {
  const x = Math.max(rect.minX, Math.min(rect.maxX, px));
  const z = Math.max(rect.minZ, Math.min(rect.maxZ, pz));
  return [x, z];
}

test('referenced GLBs exist outside this scene directory', () => {
  for (const [kind, spec] of Object.entries(layout.assets)) {
    const abs = path.resolve(sceneDir, spec.glb);
    assert.equal(fs.existsSync(abs), true, kind + ' missing ' + spec.glb);
    assert.equal(abs.startsWith(repoRoot), true, kind);
    assert.equal(abs.includes(path.join('archive-room', 'assets')), false, kind + ' must not copy bulk GLBs');
  }
});

test('record bays match bookcase instances', () => {
  for (const bay of layout.build.recordBays) {
    const inst = layout.instances.find((i) => i.id === bay.id);
    assert.ok(inst, bay.id);
    assert.equal(inst.kind, 'display_bookcase');
    assert.ok(Math.abs(inst.position[0] - bay.x) < 0.02);
    assert.ok(Math.abs(inst.position[2] - bay.z) < 0.02);
    assert.ok(Math.abs((inst.rotationY || 0) - (bay.rotY || 0)) < 0.02);
  }
});

test('floor furniture stays out of the circulation aisles', () => {
  const blocks = [];
  for (const inst of layout.instances) {
    if (inst.position[1] > 0.4) continue;
    const fp = KIND_FP[inst.kind];
    assert.ok(fp, inst.kind);
    const sx = Array.isArray(inst.scale) ? inst.scale[0] : inst.scale || 1;
    const sz = Array.isArray(inst.scale) ? inst.scale[2] ?? inst.scale[0] : inst.scale || 1;
    blocks.push({
      id: inst.id,
      box: aabb(inst.position[0], inst.position[2], fp[0] * sx, fp[1] * sz, inst.rotationY || 0),
    });
  }
  const desk = layout.build.desk;
  blocks.push({ id: 'desk', box: aabb(desk.x, desk.z, desk.w / 2, desk.d / 2, desk.rotY || 0) });
  for (const table of layout.build.tables) {
    blocks.push({ id: table.id, box: aabb(table.x, table.z, table.w / 2, table.d / 2, 0) });
  }
  const trolley = layout.build.trolley;
  blocks.push({
    id: 'trolley',
    box: aabb(trolley.x, trolley.z, trolley.w / 2, trolley.d / 2, trolley.rotY || 0),
  });
  for (const drawer of layout.build.drawers) {
    blocks.push({
      id: drawer.label,
      box: aabb(drawer.x, drawer.z, drawer.w / 2, drawer.d / 2, drawer.rotY || 0),
    });
  }
  for (const aisle of layout.circulation) {
    for (const block of blocks) {
      assert.equal(
        overlaps(block.box, aisle),
        false,
        block.id + ' blocks ' + aisle.name
      );
    }
  }
});

test('chairs face a work surface', () => {
  const surfaces = [];
  for (const table of layout.build.tables) {
    surfaces.push({
      minX: table.x - table.w / 2,
      maxX: table.x + table.w / 2,
      minZ: table.z - table.d / 2,
      maxZ: table.z + table.d / 2,
    });
  }
  const desk = layout.build.desk;
  surfaces.push({
    minX: desk.x - desk.w / 2,
    maxX: desk.x + desk.w / 2,
    minZ: desk.z - desk.d / 2,
    maxZ: desk.z + desk.d / 2,
  });
  for (const inst of layout.instances) {
    if (inst.kind !== 'study_desk') continue;
    const [x, , z] = inst.position;
    surfaces.push({ minX: x - 0.26, maxX: x + 0.26, minZ: z - 0.7, maxZ: z + 0.7 });
  }
  const chairs = layout.instances.filter((i) => i.kind === 'dining_chair');
  assert.ok(chairs.length >= 6);
  for (const chair of chairs) {
    const [x, , z] = chair.position;
    const rot = chair.rotationY || 0;
    const fx = Math.sin(rot);
    const fz = Math.cos(rot);
    let best = null;
    for (const surface of surfaces) {
      const [cx, cz] = closestOnRect(x, z, surface);
      const dx = cx - x;
      const dz = cz - z;
      const dist = Math.hypot(dx, dz);
      if (dist < 1e-3) continue;
      const dot = (dx / dist) * fx + (dz / dist) * fz;
      if (dot < 0.8) continue;
      if (!best || dist < best.dist) best = { dot, dist };
    }
    assert.ok(best, chair.id + ' does not face a work surface');
    assert.ok(best.dist < 0.45, chair.id + ' is far from its surface ' + best.dist.toFixed(2));
  }
});

test('task lamps sit on a work surface', () => {
  const pads = [];
  for (const table of layout.build.tables) {
    pads.push({
      minX: table.x - table.w / 2,
      maxX: table.x + table.w / 2,
      minZ: table.z - table.d / 2,
      maxZ: table.z + table.d / 2,
    });
  }
  const desk = layout.build.desk;
  pads.push({
    minX: desk.x - desk.w / 2,
    maxX: desk.x + desk.w / 2,
    minZ: desk.z - desk.d / 2,
    maxZ: desk.z + desk.d / 2,
  });
  for (const inst of layout.instances) {
    if (inst.kind !== 'study_desk') continue;
    const [x, , z] = inst.position;
    pads.push({ minX: x - 0.3, maxX: x + 0.3, minZ: z - 0.75, maxZ: z + 0.75 });
  }
  const lamps = layout.instances.filter((i) => i.kind === 'library_lamp');
  assert.ok(lamps.length >= 4);
  for (const lamp of lamps) {
    const [x, y, z] = lamp.position;
    assert.ok(y > 0.7 && y < 0.9, lamp.id + ' height ' + y);
    const on = pads.some((p) => x >= p.minX && x <= p.maxX && z >= p.minZ && z <= p.maxZ);
    assert.equal(on, true, lamp.id + ' is not on a desk or table');
  }
});

test('scene has the archive program', () => {
  assert.ok(layout.build.drawers.length >= 3);
  assert.ok(layout.build.drawers.some((d) => Number.isInteger(d.open)));
  assert.ok(layout.build.tables.length >= 1);
  assert.ok(layout.build.desk);
  assert.ok(layout.build.trolley);
  assert.ok(layout.build.map);
  assert.ok(layout.instances.filter((i) => i.kind === 'display_bookcase').length >= 4);
  const { width, depth, height } = layout.meta.room;
  for (const inst of layout.instances) {
    const [x, y, z] = inst.position;
    assert.ok(y >= 0 && y < height, inst.id);
    assert.ok(Math.abs(x) < width / 2 - 0.05, inst.id + ' x');
    assert.ok(Math.abs(z) < depth / 2 - 0.05, inst.id + ' z');
  }
});
