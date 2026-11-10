import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PLAN, SEAT, facingAxis } from '../plan.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function seatBox(seat) {
  const hx = SEAT.depth / 2;
  const hz = SEAT.width / 2;
  return { minX: seat.x - hx, maxX: seat.x + hx, minZ: seat.z - hz, maxZ: seat.z + hz };
}

function tableBox(table) {
  return {
    minX: table.x - table.width / 2,
    maxX: table.x + table.width / 2,
    minZ: table.z0,
    maxZ: table.z1,
  };
}

function overlaps(a, b) {
  return a.minX < b.maxX - 0.01 && a.maxX > b.minX + 0.01 && a.minZ < b.maxZ - 0.01 && a.maxZ > b.minZ + 0.01;
}

test('opposing seats face the table across X', () => {
  for (const seat of PLAN.seats) {
    const table = PLAN.tables.find((t) => t.id === seat.tableId);
    const face = facingAxis(seat.rotationY);
    const toward = table.x - seat.x;
    assert.ok(face.x * toward > 0.2, `${seat.id} faces away from ${table.id}`);
    assert.ok(Math.abs(face.z) < 1e-9);
  }
});

test('each long table has opposing benches and the top misses the benches', () => {
  for (const table of PLAN.tables) {
    const group = PLAN.seats.filter((s) => s.tableId === table.id);
    assert.ok(group.length >= 4, table.id);
    const sides = new Set(group.map((s) => s.side));
    assert.deepEqual(sides, new Set(['window', 'aisle']));
    const box = tableBox(table);
    for (const seat of group) assert.equal(overlaps(seatBox(seat), box), false, `${seat.id} intersects ${table.id}`);
    for (const z of table.brackets) {
      const bracket = { minX: PLAN.room.wallInnerX, maxX: table.x, minZ: z - 0.05, maxZ: z + 0.05 };
      for (const seat of group) {
        assert.equal(overlaps(seatBox(seat), bracket), false, `bracket ${z} hits ${seat.id}`);
      }
    }
  }
});

test('tables are long pedestals or wall-mounted, never four-leg squares', () => {
  for (const table of PLAN.tables) {
    assert.equal(table.pedestal, 'long');
    assert.equal(table.support, 'wall-mounted');
    const length = table.z1 - table.z0;
    assert.ok(length / table.width >= 2.2, `${table.id} aspect ${length / table.width}`);
    assert.ok(table.brackets.length >= 2);
  }
  for (const counter of PLAN.counters) {
    assert.equal(counter.support, 'wall-mounted');
    assert.ok(Math.abs(counter.x0 - PLAN.room.wallInnerX) <= 0.02);
    const length = counter.z1 - counter.z0;
    const depth = counter.x1 - counter.x0;
    assert.ok(length > depth);
  }
});

test('saloon windows are a real rhythm of openings and piers', () => {
  const wins = PLAN.saloonWindows.filter((w) => w.role === 'bay');
  assert.equal(wins.length, PLAN.windowZ.length);
  const sorted = [...wins].sort((a, b) => a.z - b.z);
  for (let i = 0; i < sorted.length; i++) {
    assert.ok(Math.abs(sorted[i].z - PLAN.windowZ[i]) < 0.02);
    assert.ok(sorted[i].w >= 0.9 && sorted[i].w <= 1.3);
    if (i > 0) {
      const gap = (sorted[i].z - sorted[i].w / 2) - (sorted[i - 1].z + sorted[i - 1].w / 2);
      assert.ok(gap >= 0.7, `pier ${gap}`);
    }
  }
  assert.ok(PLAN.serviceWindows.length >= 3);
  const pitch = PLAN.serviceWindows[1].z - PLAN.serviceWindows[0].z;
  const saloonPitch = PLAN.windowZ[1] - PLAN.windowZ[0];
  assert.ok(pitch < saloonPitch * 0.5, 'galley rhythm should be tighter than the saloon');
});

test('two zones, luggage racks, and warm practicals', () => {
  assert.ok(PLAN.zones.galley.z1 <= PLAN.zones.saloon.z0);
  assert.ok(PLAN.zones.vestibule.z0 >= PLAN.zones.saloon.z1);
  for (const z of PLAN.windowZ) {
    assert.ok(z > PLAN.racks.window.z0 && z < PLAN.racks.window.z1);
    assert.ok(z > PLAN.racks.aisle.z0 && z < PLAN.racks.aisle.z1);
  }
  assert.ok(PLAN.racks.window.y > 1.9);
  assert.ok(PLAN.luggage.filter((b) => b.bottom > 1.5).length >= 3);
  assert.ok(PLAN.lamps.filter((l) => l.kind === 'pendant').length >= PLAN.tables.length * 2);
  assert.ok(PLAN.lamps.filter((l) => l.kind === 'sconce').length === PLAN.piers.length);
});

test('instances only use linked GLBs and seats match the plan', () => {
  const layout = JSON.parse(fs.readFileSync(path.join(root, 'layout.json'), 'utf8'));
  const kinds = new Set(Object.keys(layout.assets));
  assert.equal(kinds.has('square_table'), false);
  for (const inst of PLAN.instances) assert.ok(kinds.has(inst.kind), inst.kind);
  const seats = PLAN.instances.filter((i) => i.kind === 'train_seat');
  assert.equal(seats.length, PLAN.seats.length);
  assert.equal(seats.length, 8);
  for (const spec of Object.values(layout.assets)) {
    const abs = path.join(root, spec.glb);
    assert.equal(fs.existsSync(abs), true, spec.glb);
    const stat = fs.statSync(abs);
    assert.ok(stat.size > 1000, spec.glb);
  }
});

test('scene source does not pull a four-leg dining table', () => {
  const src = fs.readFileSync(path.join(root, 'dining.js'), 'utf8');
  assert.equal(src.includes('square_table'), false);
  assert.equal(src.includes('long_dining'), false);
  assert.equal(src.includes('addLongPedestal'), true);
  assert.equal(src.includes('addWallMount'), true);
});
