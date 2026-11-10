import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const layout = JSON.parse(fs.readFileSync(path.join(dir, 'layout.json'), 'utf8'));
const html = fs.readFileSync(path.join(dir, 'index.html'), 'utf8');
const cafe = fs.readFileSync(path.join(dir, 'cafe.js'), 'utf8');

const banned = /sofa|couch|banquette|settee/i;

assert.equal(layout.meta.slug, 'prior-upgrade-cafe');
assert.ok(layout.meta.zones.includes('espresso-bar'));
assert.ok(layout.meta.zones.includes('pastry-pickup'));
assert.ok(layout.meta.zones.includes('seating-well'));
assert.equal(banned.test(JSON.stringify(layout)), false);
assert.equal(banned.test(cafe), false);
assert.equal(/https?:\/\//.test(html), false);
assert.match(html, /cafe\/vendor\/three\.module\.js/);

const ids = new Set();
for (const inst of layout.instances) {
  assert.equal(ids.has(inst.id), false, `duplicate ${inst.id}`);
  ids.add(inst.id);
  assert.ok(layout.assets[inst.kind], `missing kind ${inst.kind}`);
  assert.ok(inst.position[1] >= -0.01 && inst.position[1] < 3.2, `${inst.id} height`);
}

for (const [kind, spec] of Object.entries(layout.assets)) {
  const file = path.resolve(dir, spec.glb);
  assert.equal(fs.existsSync(file), true, `${kind} glb missing: ${spec.glb}`);
  assert.equal(file.includes(`${path.sep}prior-upgrade-20261110${path.sep}`), false);
}

const counter = layout.assets.bar_counter;
assert.ok(Array.isArray(counter.fit));
assert.ok(counter.fit[2] <= 0.85, 'counter depth must stay bar-scale');
assert.ok(counter.fit[1] >= 0.95 && counter.fit[1] <= 1.15, 'counter height');
assert.ok(counter.fit[0] >= 2.4, 'counter length');

function forward(ry) {
  return [Math.sin(ry), Math.cos(ry)];
}

const tables = layout.instances.filter((item) => item.kind === 'round_table');
const chairs = layout.instances.filter((item) => item.kind === 'simple_chair');
assert.ok(chairs.length >= 8);
assert.ok(tables.length >= 5);
assert.equal(chairs.every((chair) => Array.isArray(chair.lookAt)), true);

for (const chair of chairs) {
  const dx = chair.lookAt[0] - chair.position[0];
  const dz = chair.lookAt[1] - chair.position[2];
  const len = Math.hypot(dx, dz);
  assert.ok(len > 0.55 && len < 0.8, `${chair.id} distance ${len.toFixed(2)}`);
  const dir = [dx / len, dz / len];
  const face = forward(chair.rotationY || 0);
  const align = face[0] * dir[0] + face[1] * dir[1];
  assert.ok(align > 0.9, `${chair.id} faces ${align.toFixed(3)} not ${chair.lookAt}`);
  const nearest = tables
    .map((table) => ({ id: table.id, d: Math.hypot(table.position[0] - chair.lookAt[0], table.position[2] - chair.lookAt[1]) }))
    .sort((a, b) => a.d - b.d)[0];
  assert.ok(nearest.d < 0.05, `${chair.id} lookAt is not a table`);
}

const stools = layout.instances.filter((item) => item.kind === 'bar_stool');
const bar = layout.instances.find((item) => item.id === 'counter');
assert.ok(stools.length >= 4);
for (const stool of stools) {
  assert.ok(stool.position[2] > bar.position[2] + 0.45, `${stool.id} should sit on the customer side`);
  assert.equal(stool.position[1], 0);
}

assert.ok(layout.instances.some((item) => item.kind === 'espresso_machine' && item.position[1] >= 1));
assert.ok(layout.instances.filter((item) => item.kind === 'cup_mug').length >= 10);
assert.ok(layout.instances.some((item) => item.kind === 'pos_terminal'));
assert.ok(cafe.includes('pastryCase') || cafe.includes('pastry'));
assert.ok(layout.cameraPresets.corner && layout.cameraPresets.close);

console.log(`layout ok — ${layout.instances.length} instances, ${Object.keys(layout.assets).length} assets`);
