import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  aabbOverlap,
  bankBounds,
  crossAisle,
  displayAlignment,
  obstacles,
  pathClearance,
  rankClearances,
  windowWalk,
} from '../metrics.mjs';

const dir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const layout = JSON.parse(fs.readFileSync(path.join(dir, 'layout.json'), 'utf8'));
const html = fs.readFileSync(path.join(dir, 'index.html'), 'utf8');
const runtime = fs.readFileSync(path.join(dir, 'scene_runtime.js'), 'utf8');
const gate = fs.readFileSync(path.join(dir, 'gate.js'), 'utf8');

assert.equal(layout.meta.slug, 'airport-gate');
for (const zone of ['gate-podium', 'boarding-queue', 'holdroom-seating', 'charging-ledge', 'apron-slot']) {
  assert.ok(layout.meta.zones.includes(zone), zone);
}
assert.ok(layout.meta.distinctFrom.includes('station-lounge'));
assert.ok(layout.meta.distinctFrom.includes('hotel-lobby'));

const room = layout.meta.room;
assert.ok(room.height >= 3.2 && room.height <= 4.0, 'holdroom height, not a concourse');
assert.ok(room.width >= 12 && room.width <= 16);
assert.ok(layout.meta.apronDepth >= 1.2 && layout.meta.apronDepth <= 2.4, 'apron slot stays shallow');

assert.equal(/https?:\/\//.test(html), false, 'no CDN');
assert.match(html, /\.\.\/\.\.\/\.\.\/workshop\/vendor\/three\.module\.js/);
assert.equal(fs.existsSync(path.resolve(dir, '../../../workshop/vendor/three.module.js')), true);
assert.equal(fs.existsSync(path.join(dir, 'vendor')), false, 'vendor is not copied into this folder');
assert.equal(fs.existsSync(path.join(dir, 'assets')), false, 'shared GLBs are not copied into this folder');

const banned = /sofa|theatre_chair|train_seat|museum_bench|dining_chair|library_lamp|pendant_lamp|pool_table|chalkboard|school_desk/;
assert.equal(banned.test(JSON.stringify(layout.assets)), false, 'rejected station, hotel, cinema, and cafe hero meshes');

for (const [kind, spec] of Object.entries(layout.assets)) {
  const file = path.resolve(dir, spec.glb);
  assert.equal(fs.existsSync(file), true, `${kind} missing ${spec.glb}`);
  const size = fs.statSync(file).size;
  assert.ok(size > 500, `${kind} glb too small`);
  assert.equal(file.includes(`${path.sep}indoor30-20261113${path.sep}`), false, `${kind} must stay a repo-root ref`);
  assert.ok(spec.targetHeight > 0.05 && spec.targetHeight < 1.2, kind);
}

const ids = new Set();
for (const inst of layout.instances) {
  assert.equal(ids.has(inst.id), false, `duplicate ${inst.id}`);
  ids.add(inst.id);
  assert.ok(layout.assets[inst.kind], inst.kind);
  assert.ok(inst.position[1] >= -0.01 && inst.position[1] < 2.4, inst.id);
}

assert.match(runtime, /MeshToonMaterial/);
assert.match(runtime, /MeshBasicMaterial/);
assert.match(runtime, /NearestFilter/);
assert.match(runtime, /PCFHardShadowMap/);
const stops = runtime.match(/const STOPS = \[([^\]]+)\]/);
assert.ok(stops, 'stepped gradient stops');
const stopVals = stops[1].split(',').map((n) => Number(n.trim()));
assert.ok(stopVals[0] >= 90 && stopVals[0] <= 130, 'lifted shadow step, not crushed black');
assert.equal(stopVals.length, 4);
assert.match(gate, /addSeatBank/);
assert.match(gate, /addPodium/);
assert.match(gate, /addScanner/);
assert.match(gate, /addLedge/);
assert.match(runtime, /__errors/);

const seat = layout.seating;
assert.ok(seat.seatHeight >= 0.42 && seat.seatHeight <= 0.48);
assert.ok(seat.backHeight >= 0.9 && seat.backHeight <= 1.05);
assert.ok(seat.pitch >= 0.48 && seat.pitch <= 0.58);
assert.equal(seat.facing, '-X');
assert.ok(Math.abs(seat.rotationY + Math.PI / 2) < 1e-3);

let accessibleBays = 0;
for (const bank of seat.banks) {
  const align = displayAlignment(bank, layout);
  assert.ok(align > 0.92, `${bank.id} alignment ${align.toFixed(3)} — seats must face their ribbon`);
  const display = layout.displays.find((item) => item.id === bank.display);
  assert.ok(display.x < bank.x - 1.2, `${bank.id} ribbon is in front of the bank`);
  assert.equal(display.faces, '+X');
  assert.ok(display.width <= 2.2 && display.height <= 0.7, `${display.id} is a ribbon, not a billboard`);
  if (bank.accessibleBay) accessibleBays += 1;
}
assert.equal(accessibleBays, 1);

for (const gap of rankClearances(layout)) {
  assert.ok(gap.clear >= 1.5, `rank ${gap.from}-${gap.to} clear ${gap.clear.toFixed(2)}`);
}
const aisle = crossAisle(layout);
assert.ok(aisle >= 1.5, `cross aisle ${aisle.toFixed(2)}`);
const walk = windowWalk(layout);
assert.ok(walk >= 1.4, `window walk ${walk.toFixed(2)}`);

assert.ok(layout.podium.h >= 1.0 && layout.podium.h <= 1.12);
assert.ok(layout.ledge.h >= 1.0 && layout.ledge.h <= 1.12);
assert.ok(layout.door.h >= 2.05 && layout.door.h <= 2.35);
assert.ok(layout.door.w >= 1.5, 'gate door is wide enough for the accessible lane');

const seatBoxes = seat.banks.map((bank) => bankBounds(bank, seat));
for (const [name, lane] of Object.entries(layout.lanes)) {
  const width = lane.x1 - lane.x0;
  assert.ok(width + 1e-6 >= lane.minWidth, `${name} width ${width.toFixed(2)}`);
  const rect = { x0: lane.x0, x1: lane.x1, z0: lane.z0, z1: lane.z1 };
  for (const box of seatBoxes) {
    assert.equal(aabbOverlap(rect, box, 0.05), false, `${name} cuts ${box.id}`);
  }
  for (const item of obstacles(layout)) {
    if (item.kind === 'seat') continue;
    if (name === 'standard' && item.id === 'scan-std') continue;
    if (name === 'accessible' && item.id === 'scan-acc') continue;
    assert.equal(aabbOverlap(rect, item, 0.02), false, `${name} overlaps ${item.id}`);
  }
}

for (const route of layout.paths) {
  const result = pathClearance(route, layout);
  assert.ok(
    result.min + 1e-6 >= route.minClear,
    `${route.id} clearance ${result.min.toFixed(2)} at ${result.hit && result.hit.id}`,
  );
}

assert.ok(layout.cameraPresets.corner && layout.cameraPresets.detail && layout.cameraPresets.close);
assert.equal(layout.lights.hemi.ground, '#8d98a2');
assert.ok(layout.lights.key.intensity <= 1.15);
assert.ok(layout.instances.some((item) => item.kind === 'pos_terminal'));
assert.ok(layout.instances.filter((item) => item.kind === 'monitor').length >= 2);
assert.ok(layout.instances.filter((item) => item.kind === 'bar_stool').length >= 3);

console.log(`airport-gate layout ok — ranks ${rankClearances(layout).map((g) => g.clear.toFixed(2)).join('/')} aisle ${aisle.toFixed(2)} window ${walk.toFixed(2)}`);
