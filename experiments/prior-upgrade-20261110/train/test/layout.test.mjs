import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const layout = JSON.parse(fs.readFileSync(path.join(dir, 'layout.json'), 'utf8'));
const html = fs.readFileSync(path.join(dir, 'index.html'), 'utf8');
const js = fs.readFileSync(path.join(dir, 'train.js'), 'utf8');

assert.equal(layout.meta.slug, 'prior-upgrade-train');
assert.ok(layout.meta.zones.includes('dining-bays'));
assert.ok(layout.meta.zones.includes('galley'));
assert.ok(layout.meta.zones.includes('vestibule'));
assert.equal(layout.meta.circulation, 'center-aisle');
assert.ok(layout.meta.partitionHeight >= 1.15, 'partitions must be seat-back height and meet the floor');
assert.equal(/https?:\/\//.test(html), false);
assert.match(html, /train\/vendor\/three\.module\.js/);

const bannedKind = /square_table|round_table|long_dining|diner_booth/;
assert.equal(bannedKind.test(JSON.stringify(layout.assets)), false, 'no four-leg / diner-booth table assets');
assert.match(js, /addWallTable/);
assert.match(js, /addAisleTable/);
assert.match(js, /addPartition/);
assert.ok(!js.includes('BoxGeometry(0.16, 0.64, 0.62)') === true);

const ids = new Set();
for (const inst of layout.instances) {
  assert.equal(ids.has(inst.id), false, `duplicate ${inst.id}`);
  ids.add(inst.id);
  assert.ok(layout.assets[inst.kind], `missing kind ${inst.kind}`);
  assert.ok(inst.position[1] >= -0.01 && inst.position[1] < 2.5, `${inst.id} height`);
}

for (const [kind, spec] of Object.entries(layout.assets)) {
  const file = path.resolve(dir, spec.glb);
  assert.equal(fs.existsSync(file), true, `${kind} glb missing: ${spec.glb}`);
  assert.equal(file.includes(`${path.sep}prior-upgrade-20261110${path.sep}train${path.sep}assets${path.sep}`), false);
}

function forward(ry) {
  return [Math.sin(ry), Math.cos(ry)];
}

const diningSeats = layout.instances.filter((item) => item.kind === 'train_seat' && item.bay != null);
assert.equal(diningSeats.length, layout.meta.bays * 4, 'four seats per bay (two facing pairs)');

for (const seat of diningSeats) {
  assert.ok(Array.isArray(seat.lookAt), `${seat.id} missing lookAt`);
  const dx = seat.lookAt[0] - seat.position[0];
  const dz = seat.lookAt[1] - seat.position[2];
  const len = Math.hypot(dx, dz);
  assert.ok(len > 0.7 && len < 1.05, `${seat.id} distance ${len.toFixed(2)}`);
  const dir = [dx / len, dz / len];
  const face = forward(seat.rotationY || 0);
  const align = face[0] * dir[0] + face[1] * dir[1];
  assert.ok(align > 0.9, `${seat.id} faces ${align.toFixed(3)} not ${seat.lookAt}`);
}

assert.ok(layout.instances.some((item) => item.kind === 'thermos'));
assert.ok(layout.instances.some((item) => item.kind === 'chalkboard'));
assert.ok(layout.cameraPresets.corner && layout.cameraPresets.close);
assert.ok(js.includes("name: 'bulb'") || js.includes('userData.bulb'));

console.log(`layout ok — ${layout.instances.length} instances, ${Object.keys(layout.assets).length} assets`);
