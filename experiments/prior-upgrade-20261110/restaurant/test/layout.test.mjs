import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const layout = JSON.parse(fs.readFileSync(path.join(dir, 'layout.json'), 'utf8'));
const html = fs.readFileSync(path.join(dir, 'index.html'), 'utf8');
const js = fs.readFileSync(path.join(dir, 'restaurant.js'), 'utf8');

assert.equal(layout.meta.slug, 'hinoki-dining');
assert.ok(layout.meta.zones.includes('wall-booths'));
assert.ok(layout.meta.zones.includes('table-dining'));
assert.ok(layout.meta.zones.includes('sushi-pass'));
assert.equal(/https?:\/\//.test(html), false);
assert.match(html, /restaurant\/vendor\/three\.module\.js/);
assert.equal(/shoji|屏风|partition|screen/i.test(js), false);

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
  assert.equal(file.includes(`${path.sep}prior-upgrade-20261110${path.sep}restaurant${path.sep}assets${path.sep}`), false);
}

const chairs = layout.instances.filter((item) => item.kind === 'dining_chair');
const tables = layout.instances.filter((item) => item.kind === 'dining_table');
const booths = layout.instances.filter((item) => item.kind === 'diner_booth');
assert.ok(chairs.length >= 24, `expected ≥24 chairs, got ${chairs.length}`);
assert.equal(tables.length, 3);
assert.equal(booths.length, 3);
assert.equal(chairs.every((chair) => Array.isArray(chair.lookAt)), true);

function forward(ry) {
  return [Math.sin(ry), Math.cos(ry)];
}

for (const chair of chairs) {
  const dx = chair.lookAt[0] - chair.position[0];
  const dz = chair.lookAt[1] - chair.position[2];
  const len = Math.hypot(dx, dz);
  assert.ok(len > 0.55 && len < 1.7, `${chair.id} distance ${len.toFixed(2)}`);
  const dir = [dx / len, dz / len];
  const face = forward(chair.rotationY || 0);
  const align = face[0] * dir[0] + face[1] * dir[1];
  assert.ok(align > 0.9, `${chair.id} faces ${align.toFixed(3)} not ${chair.lookAt}`);
  const nearest = tables
    .map((table) => {
      const hx = 1.28;
      const hz = 0.57;
      const px = Math.min(Math.max(chair.lookAt[0], table.position[0] - hx), table.position[0] + hx);
      const pz = Math.min(Math.max(chair.lookAt[1], table.position[2] - hz), table.position[2] + hz);
      return Math.hypot(px - chair.lookAt[0], pz - chair.lookAt[1]);
    })
    .sort((a, b) => a - b)[0];
  assert.ok(nearest < 0.08, `${chair.id} lookAt is not on a table`);
}

assert.ok(layout.assets.dining_table.fit[0] >= 2.4, 'tables must be enlarged 8-tops');
assert.ok(booths.every((b) => Math.abs(Math.abs(b.rotationY) - Math.PI / 2) < 0.05));
assert.ok(booths.every((b) => b.position[0] < -4.0), 'booths stay on the left wall');
const aisleX = -2.35;
for (const table of tables) {
  assert.ok(table.position[0] > aisleX, `${table.id} should sit east of the aisle`);
}

const runnerClear = chairs.filter((c) => Math.abs(c.position[0] + 2.35) < 0.45);
assert.equal(runnerClear.length, 0, 'chairs should not sit on the circulation runner');

assert.ok(layout.cameraPresets.corner && layout.cameraPresets.close);
assert.match(js, /lantern/);

console.log(`layout ok — ${layout.instances.length} instances, ${chairs.length} chairs, ${tables.length} tables, ${booths.length} booths`);
