import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const sceneDir = path.resolve(here, '..');
const layout = JSON.parse(fs.readFileSync(path.join(sceneDir, 'layout.json'), 'utf8'));
const blob = JSON.stringify(layout);

assert.equal(layout.meta.hull, 'chamfered-octagon');
assert.equal(blob.includes('simple_chair'), false);
assert.equal(blob.includes('dining_table'), false);
assert.equal(blob.includes('sofa_solid'), false);
assert.equal(blob.includes('rug'), false);
assert.equal(layout.meta.table.kind, 'pedestal');
assert.ok(layout.meta.benches.length >= 3);
assert.equal(layout.meta.lockers.length, 4);
assert.equal(layout.meta.lockers.filter((l) => l.open).length, 1);
assert.ok(layout.meta.strips.some((s) => s.where === 'floor'));
assert.ok(layout.meta.strips.some((s) => s.where === 'ceiling'));

function forward(rot) {
  return [Math.sin(rot), Math.cos(rot)];
}

for (const bench of layout.meta.benches) {
  const [fx, fz] = forward(bench.rot);
  const dx = bench.aim[0] - bench.x;
  const dz = bench.aim[1] - bench.z;
  const len = Math.hypot(dx, dz);
  assert.ok(len > 0.2 && len < 2.2, `${bench.id} aim distance ${len.toFixed(2)}`);
  const dot = (fx * dx + fz * dz) / len;
  assert.ok(dot > 0.75, `${bench.id} does not face its aim (dot ${dot.toFixed(2)})`);
}

const mess = layout.meta.benches.filter((b) => b.id.startsWith('mess-'));
assert.equal(mess.length, 2);
for (const bench of mess) {
  assert.ok(Math.abs(bench.z - layout.meta.table.z) < 0.25, 'mess benches share the table');
}

console.log('layout ok — chamfered habitat, benches face the pedestal table');
