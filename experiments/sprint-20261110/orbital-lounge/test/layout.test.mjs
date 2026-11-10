import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const sceneDir = path.resolve(here, '..');
const repoRoot = path.resolve(sceneDir, '../../..');
const layout = JSON.parse(fs.readFileSync(path.join(sceneDir, 'layout.json'), 'utf8'));

function forward(rot, axis) {
  const s = Math.sin(rot);
  const c = Math.cos(rot);
  if (axis === '+Z') return [s, c];
  if (axis === '-Z') return [-s, -c];
  throw new Error(`unknown forward ${axis}`);
}

const ids = new Set();
for (const inst of layout.instances) {
  assert.equal(ids.has(inst.id), false, `duplicate id ${inst.id}`);
  ids.add(inst.id);
  const spec = layout.assets[inst.kind];
  assert.ok(spec, `missing asset kind ${inst.kind}`);
  assert.ok(spec.glb.startsWith('/'), `${inst.id} glb must be site-root absolute`);
  assert.equal(spec.glb.includes('..'), false, spec.glb);
  const file = path.join(repoRoot, spec.glb.slice(1));
  assert.equal(fs.existsSync(file), true, `missing ${file}`);
}

const { width: W, depth: D, height: H } = layout.meta.room;
for (const inst of layout.instances) {
  const [x, y, z] = inst.position;
  assert.ok(Math.abs(x) < W / 2 - 0.05, `${inst.id} x out of module`);
  assert.ok(z > -D / 2 + 0.05 && z < D / 2 - 0.05, `${inst.id} z out of module`);
  assert.ok(y >= 0 && y < H, `${inst.id} y out of module`);
}

let aimed = 0;
for (const inst of layout.instances) {
  if (!inst.aim) continue;
  aimed += 1;
  const spec = layout.assets[inst.kind];
  const [fx, fz] = forward(inst.rotationY || 0, spec.forward);
  const dx = inst.aim[0] - inst.position[0];
  const dz = inst.aim[1] - inst.position[2];
  const len = Math.hypot(dx, dz);
  assert.ok(len > 0.2 && len < 2.4, `${inst.id} aim distance ${len.toFixed(2)}`);
  const dot = (fx * dx + fz * dz) / len;
  assert.ok(dot > 0.75, `${inst.id} faces away from aim (dot ${dot.toFixed(2)})`);
}
assert.ok(aimed >= 6, 'expected conversation and mess seats to declare aim');

const kinds = layout.instances.map((i) => i.kind);
assert.ok(kinds.includes('sofa_solid'));
assert.ok(kinds.includes('coffee_table'));
assert.ok(kinds.includes('dining_table'));
assert.ok(kinds.filter((k) => k === 'simple_chair').length >= 6);
assert.ok(kinds.includes('wall_shelf'));
assert.equal(layout.meta.lockers.length, 4);
assert.equal(layout.meta.lockers.filter((l) => l.open).length, 1);
assert.equal(layout.meta.strips.length, 3);
assert.ok(layout.meta.window.width > 3 && layout.meta.window.width < 5.2);
assert.ok(layout.meta.strips.filter((s) => s.id.startsWith('task-')).length === 2);

const conv = layout.instances.filter((i) => i.id.startsWith('conv-chair'));
const sofa = layout.instances.find((i) => i.id === 'conv-sofa');
const low = layout.instances.find((i) => i.id === 'conv-table');
for (const chair of conv) {
  assert.ok(chair.position[2] > low.position[2], 'conversation chairs sit room-side of the low table');
}
assert.ok(sofa.position[2] < low.position[2], 'sofa sits port-side of the low table, toward the window');

console.log(`layout ok — ${layout.instances.length} instances, ${aimed} aimed seats`);
