import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { forwardXZ, yawForFront } from '../facing.js';

const dir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const layout = JSON.parse(fs.readFileSync(path.join(dir, 'layout.json'), 'utf8'));
const html = fs.readFileSync(path.join(dir, 'index.html'), 'utf8');
const js = fs.readFileSync(path.join(dir, 'barbershop.js'), 'utf8');
const lib = fs.readFileSync(path.join(dir, 'scene_lib.js'), 'utf8');

assert.equal(layout.meta.slug, 'barbershop');
assert.equal(/https?:\/\//.test(html), false);
assert.match(html, /vendor\/three\.module\.js/);
assert.match(lib, /MeshToonMaterial/);
assert.match(lib, /MeshBasicMaterial/);
assert.match(lib, /BasicShadowMap/);
assert.match(js, /barberPole|poleTexture/);
assert.equal(/espresso|cup_mug|bar_counter|round_table/.test(JSON.stringify(layout.instances)), false);

const ids = new Set();
for (const inst of layout.instances) {
  assert.equal(ids.has(inst.id), false, `duplicate ${inst.id}`);
  ids.add(inst.id);
  const spec = layout.assets[inst.kind];
  assert.ok(spec, `missing kind ${inst.kind}`);
  const file = path.resolve(dir, spec.glb);
  assert.equal(fs.existsSync(file), true, `${inst.id} glb missing ${spec.glb}`);
  assert.ok(file.startsWith(dir + path.sep), `${spec.glb} escapes the scene folder`);
}

const seats = layout.instances.filter((item) => layout.assets[item.kind].role === 'seat');
assert.ok(seats.length >= 5, `expected waiting plus chairs, got ${seats.length}`);
const chairs = layout.instances.filter((item) => item.kind === 'salon_chair');
assert.equal(chairs.length, 3);
assert.equal(layout.instances.filter((item) => item.kind === 'clipper').length, 3);
assert.equal(layout.instances.filter((item) => item.kind === 'barber_shears').length, 3);

function distToObb(px, pz, box) {
  const dx = px - box.x;
  const dz = pz - box.z;
  const c = Math.cos(box.ry || 0);
  const s = Math.sin(box.ry || 0);
  const lx = c * dx - s * dz;
  const lz = s * dx + c * dz;
  const qx = Math.abs(lx) - box.hx;
  const qz = Math.abs(lz) - box.hz;
  if (qx <= 0 && qz <= 0) return -Math.min(-qx, -qz);
  return Math.hypot(Math.max(qx, 0), Math.max(qz, 0));
}

const solids = [];
for (const inst of layout.instances) {
  const spec = layout.assets[inst.kind];
  if (!spec.footprint) continue;
  if (inst.position[1] > 0.35) continue;
  const [hx, hz] = spec.footprint;
  const scale = Array.isArray(inst.scale) ? inst.scale : [inst.scale || 1, 1, inst.scale || 1];
  solids.push({
    id: inst.id,
    x: inst.position[0],
    z: inst.position[2],
    hx: hx * (scale[0] || 1),
    hz: hz * (scale[2] || scale[0] || 1),
    ry: inst.rotationY || 0,
  });
}
for (const block of layout.meta.blockers) solids.push(block);

for (let i = 0; i < solids.length; i++) {
  for (let j = i + 1; j < solids.length; j++) {
    const a = solids[i];
    const b = solids[j];
    const gap = distToObb(a.x, a.z, b);
    assert.ok(gap > -0.05, `${a.id} overlaps ${b.id} by ${(-gap).toFixed(2)}m`);
  }
}

for (const sample of layout.meta.walkSamples) {
  let nearest = Infinity;
  let who = '';
  for (const box of solids) {
    const d = distToObb(sample[0], sample[1], box);
    if (d < nearest) {
      nearest = d;
      who = box.id;
    }
  }
  assert.ok(nearest >= 0.38, `walk ${sample} is ${nearest.toFixed(2)}m from ${who}`);
}

for (const inst of layout.instances) {
  if (!inst.lookAt) continue;
  const front = layout.assets[inst.kind].front || '+Z';
  if (front === 'radial') {
    const d = Math.hypot(inst.lookAt[0] - inst.position[0], inst.lookAt[1] - inst.position[2]);
    assert.ok(d > 0.55 && d < 1.5, `${inst.id} radial seat distance ${d.toFixed(2)}`);
    continue;
  }
  const dx = inst.lookAt[0] - inst.position[0];
  const dz = inst.lookAt[1] - inst.position[2];
  const len = Math.hypot(dx, dz);
  assert.ok(len > 0.2, `${inst.id} lookAt is on itself`);
  const face = forwardXZ(front, inst.rotationY || 0);
  const align = (face[0] * dx + face[1] * dz) / len;
  assert.ok(align > 0.92, `${inst.id} faces ${align.toFixed(3)} not its lookAt`);
  const expected = yawForFront(front, dx, dz);
  const delta = Math.atan2(Math.sin(expected - (inst.rotationY || 0)), Math.cos(expected - (inst.rotationY || 0)));
  assert.ok(Math.abs(delta) < 0.03, `${inst.id} rotation drifts ${delta.toFixed(3)}`);
}

for (const chair of chairs) {
  assert.ok(chair.lookAt[1] < -3.9, `${chair.id} should look at the mirror wall`);
  assert.ok(Math.abs(chair.lookAt[0] - chair.position[0]) < 0.05, `${chair.id} mirror is not in front`);
  assert.equal(layout.assets.salon_chair.front, '+Z');
}

const bench = layout.instances.find((item) => item.id === 'wait-bench');
assert.ok(bench.lookAt[0] > bench.position[0], 'bench long side faces the magazine table');
const h = layout.assets.salon_chair.targetHeight;
assert.ok(h >= 1.15 && h <= 1.45, 'salon chair proportion');
assert.ok(layout.assets.bar_stool.targetHeight >= 0.6 && layout.assets.bar_stool.targetHeight <= 0.85);
assert.ok(layout.assets.museum_bench.targetHeight >= 0.4 && layout.assets.museum_bench.targetHeight <= 0.55);
assert.ok(layout.cameraPresets.corner && layout.cameraPresets.close);

const room = layout.meta.room;
for (const inst of layout.instances) {
  const [x, y, z] = inst.position;
  assert.ok(Math.abs(x) < room.width / 2 - 0.05, `${inst.id} x outside`);
  assert.ok(Math.abs(z) < room.depth / 2 - 0.05, `${inst.id} z outside`);
  assert.ok(y >= -0.01 && y < room.height, `${inst.id} height`);
}

console.log(`layout ok — ${layout.instances.length} instances, ${chairs.length} salon chairs, walk clear`);
