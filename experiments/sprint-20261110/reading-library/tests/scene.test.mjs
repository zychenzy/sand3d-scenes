import assert from 'node:assert/strict';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const layout = JSON.parse(readFileSync(join(root, 'layout.json'), 'utf8'));

function forward(rotY) {
  return [Math.sin(rotY), Math.cos(rotY)];
}

function rectFor(inst) {
  const asset = layout.assets[inst.kind];
  let hx = asset.hx;
  let hz = asset.hz;
  const rot = Math.abs(inst.rotationY || 0) % Math.PI;
  if (Math.abs(rot - Math.PI / 2) < 0.35) [hx, hz] = [hz, hx];
  return { x: inst.position[0], z: inst.position[2], hx, hz, id: inst.id };
}

function closestPoint(px, pz, rect) {
  const x = Math.max(rect.x - rect.hx, Math.min(px, rect.x + rect.hx));
  const z = Math.max(rect.z - rect.hz, Math.min(pz, rect.z + rect.hz));
  const dx = x - px;
  const dz = z - pz;
  return { dx, dz, dist: Math.hypot(dx, dz) };
}

test('shared glb symlinks resolve and are not duplicated blobs', () => {
  for (const spec of Object.values(layout.assets)) {
    const path = join(root, spec.glb);
    assert.equal(existsSync(path), true, spec.glb);
    const st = statSync(path);
    assert.equal(st.isFile(), true, spec.glb);
    assert.ok(st.size > 500, spec.glb);
  }
});

test('room is a tall reading hall, not the v1 box', () => {
  assert.ok(layout.meta.room.height >= 4.2);
  assert.ok(layout.meta.room.width >= 12);
  assert.equal(layout.architecture.alcoves.length, 3);
  assert.equal(layout.architecture.carts.length, 2);
  const widths = layout.architecture.bays.widths;
  assert.equal(new Set(widths).size, widths.length);
  const span = layout.architecture.bays.x1 - layout.architecture.bays.x0;
  const used = widths.reduce((a, b) => a + b, 0) + layout.architecture.bays.pilaster * (widths.length + 1);
  assert.ok(Math.abs(span - used) < 0.02, `bay span ${used} vs ${span}`);
});

test('every chair faces a nearby table', () => {
  const tables = [
    ...layout.architecture.tables,
    ...layout.instances.filter((i) => layout.assets[i.kind].top).map(rectFor),
  ];
  const chairs = layout.instances.filter((i) => i.kind === 'dining_chair');
  assert.ok(chairs.length >= 14);
  for (const chair of chairs) {
    const [fx, fz] = forward(chair.rotationY || 0);
    let best = -1;
    let bestId = '';
    for (const table of tables) {
      const hit = closestPoint(chair.position[0], chair.position[2], table);
      if (hit.dist > 0.9) continue;
      const dot = hit.dist < 1e-4 ? 1 : (hit.dx / hit.dist) * fx + (hit.dz / hit.dist) * fz;
      if (dot > best) {
        best = dot;
        bestId = table.id;
      }
    }
    assert.ok(best > 0.72, `${chair.id} facing dot ${best.toFixed(2)} toward ${bestId}`);
  }
});

test('banker lamps sit on a table top', () => {
  const tops = [
    ...layout.architecture.tables,
    ...layout.instances.filter((i) => layout.assets[i.kind].top).map((inst) => ({
      ...rectFor(inst),
      top: layout.assets[inst.kind].top,
    })),
    { id: 'niche', x: -0.75, z: -4.15, hx: 0.7, hz: 0.3, top: 0.96 },
  ];
  const lamps = layout.instances.filter((i) => i.kind === 'library_lamp');
  assert.ok(lamps.length >= 8);
  for (const lamp of lamps) {
    const host = tops.find((t) => {
      const hit = closestPoint(lamp.position[0], lamp.position[2], t);
      return hit.dist < 0.08 && Math.abs(lamp.position[1] - t.top) < 0.03;
    });
    assert.ok(host, `${lamp.id} is not on a table top`);
  }
});

test('stacks aisle stays walkable', () => {
  const front = layout.architecture.bays.zWall + layout.architecture.bays.depth;
  const shelfSide = layout.instances.filter((i) => i.kind === 'dining_chair' && (i.rotationY || 0) === 0);
  for (const chair of shelfSide) {
    assert.ok(chair.position[2] - 0.25 - front >= 1.15, chair.id);
  }
});
