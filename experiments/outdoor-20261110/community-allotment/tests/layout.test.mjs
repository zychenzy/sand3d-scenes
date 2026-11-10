import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const layout = JSON.parse(fs.readFileSync(path.join(dir, 'layout.json'), 'utf8'));
const html = fs.readFileSync(path.join(dir, 'index.html'), 'utf8');
const lib = fs.readFileSync(path.join(dir, 'scene_lib.js'), 'utf8');

function overlaps(a, b, eps = 0.02) {
  return a.x < b.x + b.w - eps && a.x + a.w > b.x + eps && a.z < b.z + b.d - eps && a.z + a.d > b.z + eps;
}
function inside(inner, outer, eps = 0.02) {
  return inner.x >= outer.x - eps
    && inner.z >= outer.z - eps
    && inner.x + inner.w <= outer.x + outer.w + eps
    && inner.z + inner.d <= outer.z + outer.d + eps;
}
function centerInside(x, z, rect, margin = 0) {
  return x >= rect.x + margin && x <= rect.x + rect.w - margin && z >= rect.z + margin && z <= rect.z + rect.d - margin;
}
function distPointSeg(px, pz, ax, az, bx, bz) {
  const abx = bx - ax;
  const abz = bz - az;
  const len2 = abx * abx + abz * abz || 1;
  let t = ((px - ax) * abx + (pz - az) * abz) / len2;
  t = Math.max(0, Math.min(1, t));
  const dx = px - (ax + abx * t);
  const dz = pz - (az + abz * t);
  return Math.hypot(dx, dz);
}
function forward(rotY) {
  return [Math.sin(rotY), Math.cos(rotY)];
}

const fence = layout.fence;
const fenceRect = { x: fence.minX, z: fence.minZ, w: fence.maxX - fence.minX, d: fence.maxZ - fence.minZ };
const beds = layout.beds;
const paths = layout.paths;
const S = layout.structures;
const apron = paths.find((p) => p.id === 'apron');
const spine = paths.find((p) => p.id === 'spine');

const crops = new Set(beds.map((b) => b.crop));
const stages = new Set(beds.map((b) => b.stage));
assert.ok(crops.size >= 6, `expected >= 6 crops, got ${[...crops].join(',')}`);
assert.ok(stages.size >= 4, `expected >= 4 growth stages, got ${[...stages].join(',')}`);
assert.ok(crops.has('beans') && crops.has('salad') && crops.has('seedling') && crops.has('tomato'));

for (const bed of beds) {
  const reach = Math.min(bed.w, bed.d);
  assert.ok(reach <= 1.85, `${bed.id} is too wide to work (${reach}m)`);
  assert.ok(reach >= 0.55, `${bed.id} is not a bed`);
  assert.ok(bed.h >= 0.1 && bed.h <= 0.36, `${bed.id} height ${bed.h}`);
  assert.ok(bed.soil < bed.h, `${bed.id} soil should sit below the rim`);
  assert.ok(inside(bed, fenceRect, 0.08), `${bed.id} leaves the fence`);
  for (const other of beds) {
    if (other.id <= bed.id) continue;
    assert.ok(!overlaps(bed, other), `${bed.id} overlaps ${other.id}`);
  }
  for (const p of paths) {
    assert.ok(!overlaps(bed, p), `${bed.id} blocks path ${p.id}`);
  }
}

for (const p of paths) {
  assert.ok(Math.min(p.w, p.d) >= 0.95, `${p.id} is narrower than 0.95m`);
}
assert.ok(spine.z + spine.d >= S.gate.z - 0.02, 'spine should reach the gate');

assert.ok(inside(S.shed, apron), 'shed should sit on the apron');
assert.ok(S.shed.eave >= 1.7 && S.shed.eave <= 2.4, 'shed eave out of human scale');
assert.ok(S.shed.ridge > S.shed.eave, 'roof should rise');
for (const bay of S.compost) assert.ok(inside(bay, apron), `compost ${bay.kind} off the apron`);
assert.ok(inside(S.potting, apron), 'potting bench off the apron');
assert.ok(!overlaps(S.shed, S.potting), 'potting bench intersects the shed');
for (const bay of S.compost) {
  assert.ok(!overlaps(bay, S.shed), 'compost intersects the shed');
  assert.ok(!overlaps(bay, S.potting), 'compost intersects the potting bench');
  assert.ok(!overlaps(bay, S.doorClear), 'compost blocks the shed door');
}
assert.ok(!overlaps(S.barrelRect || {
  x: S.barrel.x - S.barrel.r,
  z: S.barrel.z - S.barrel.r,
  w: S.barrel.r * 2,
  d: S.barrel.r * 2,
}, S.shed), 'rain barrel intersects the shed');
assert.ok(centerInside(S.barrel.x, S.barrel.z, apron, S.barrel.r), 'barrel not fully on the apron');
assert.ok(S.barrel.h >= 0.7 && S.barrel.h <= 1.15, 'barrel height');

const shedEast = S.shed.x + S.shed.w;
const barrelWest = S.barrel.x - S.barrel.r;
assert.ok(barrelWest > shedEast - 0.02 && barrelWest - shedEast < 0.45, 'downpipe gap between shed and barrel is wrong');

assert.ok(!overlaps(S.doorClear, S.potting), 'potting bench blocks the door');
for (const bed of beds) assert.ok(!overlaps(bed, S.doorClear), `${bed.id} blocks the shed door`);
for (const tool of S.tools) {
  assert.ok(centerInside(tool.x, tool.z, apron), `${tool.id} is off the apron`);
  assert.ok(!centerInside(tool.x, tool.z, S.doorClear), `${tool.id} stands in the doorway`);
  assert.ok(!centerInside(tool.x, tool.z, S.shed), `${tool.id} is inside the shed`);
}
assert.ok(centerInside(S.can.x, S.can.z, apron), 'watering can is off the apron');

const potSouth = S.potting.z + S.potting.d;
const apronSouth = apron.z + apron.d;
assert.equal(S.potting.rotY, 0, 'potting bench should face south, toward the yard');
assert.ok(apronSouth - potSouth >= 0.7, 'not enough standing room in front of the potting bench');

const pic = S.picnic;
assert.equal(pic.rotY, 0);
assert.ok(pic.top >= 0.7 && pic.top <= 0.8, 'picnic table height');
const table = { x: pic.x - pic.length / 2, z: pic.z - pic.width / 2, w: pic.length, d: pic.width };
assert.ok(!overlaps(table, spine) && !overlaps(table, paths.find((p) => p.id === 'cross')), 'picnic table blocks a main path');
const benchZs = [-pic.benchOffset, pic.benchOffset];
pic.benchFace.forEach((rot, i) => {
  const bz = pic.z + benchZs[i];
  const [fx, fz] = forward(rot);
  const dot = fx * (pic.x - pic.x) + fz * (pic.z - bz);
  assert.ok(dot > 0.2, `picnic bench ${i} does not face the table`);
});

const chairFoot = 0.46;
for (const inst of layout.instances.filter((i) => i.kind === 'dining_chair')) {
  const [fx, fz] = forward(inst.rotationY);
  const dx = pic.x - inst.position[0];
  const dz = pic.z - inst.position[2];
  const len = Math.hypot(dx, dz);
  const dot = (fx * dx + fz * dz) / len;
  assert.ok(dot > 0.75, `${inst.id} does not face the picnic table (dot ${dot.toFixed(2)})`);
  assert.ok(len < 1.7 && len > 0.7, `${inst.id} distance to table ${len.toFixed(2)}`);
  const foot = { x: inst.position[0] - chairFoot / 2, z: inst.position[2] - chairFoot / 2, w: chairFoot, d: chairFoot };
  assert.ok(!overlaps(foot, table, 0), `${inst.id} intersects the table top`);
  for (const bed of beds) assert.ok(!overlaps(foot, bed), `${inst.id} sits in ${bed.id}`);
}

const pots = layout.instances.filter((i) => i.kind === 'flowerpot');
assert.ok(pots.length >= 2 && pots.length <= 4, 'pots should be a working cluster, not a field');
for (const pot of pots) {
  assert.ok(Math.abs(pot.position[1] - S.potting.top) < 0.02, `${pot.id} is not on the potting top`);
  assert.ok(centerInside(pot.position[0], pot.position[2], S.potting, 0.08), `${pot.id} misses the bench`);
}
const mug = layout.instances.find((i) => i.kind === 'cup_mug');
assert.ok(mug, 'picnic mug missing');
assert.ok(Math.abs(mug.position[1] - pic.top) < 0.02, 'mug should sit on the picnic top');
assert.ok(centerInside(mug.position[0], mug.position[2], table, 0.05), 'mug misses the table');

const gate = S.gate;
const rad = (gate.openDeg * Math.PI) / 180;
const tip = {
  x: gate.hingeX + Math.cos(rad) * gate.leaf,
  z: gate.z - Math.sin(rad) * gate.leaf,
};
const spineCenter = spine.x + spine.w / 2;
for (let z = gate.z - 0.4; z <= gate.z + 0.05; z += 0.1) {
  const d = distPointSeg(spineCenter, z, gate.hingeX, gate.z, tip.x, tip.z);
  assert.ok(d > 0.45, `open gate blocks the spine centerline at z=${z.toFixed(2)} (clearance ${d.toFixed(2)})`);
}
assert.ok(Math.abs((gate.hingeX + gate.opening) - (spine.x + spine.w)) < 0.08, 'gate opening should match the spine');

const cold = S.coldFrame;
for (const bed of beds) assert.ok(!overlaps(cold, bed), `cold frame overlaps ${bed.id}`);
for (const p of paths) assert.ok(!overlaps(cold, p), `cold frame blocks ${p.id}`);

for (const house of layout.background.houses) {
  const south = house.z + house.d;
  assert.ok(south < fence.minZ - 1.2, `${house.id} is not behind the plot`);
}
for (const tree of [layout.background.apple, layout.background.column, layout.background.broad]) {
  const trunk = { x: tree.x - 0.15, z: tree.z - 0.15, w: 0.3, d: 0.3 };
  for (const bed of beds) assert.ok(!overlaps(trunk, bed), `${tree.id} trunk is in ${bed.id}`);
  for (const p of paths) assert.ok(!overlaps(trunk, p), `${tree.id} trunk blocks ${p.id}`);
}
const neighbor = layout.background.neighbor.bed;
assert.ok(neighbor.x >= fence.maxX - 0.05, 'neighbor plot should read as the next allotment, outside the fence');

const camDist = (pos, target) => Math.hypot(pos[0] - target[0], pos[1] - target[1], pos[2] - target[2]);
const defD = camDist(layout.camera.position, layout.camera.target);
const close = layout.cameraPresets.close;
const closeD = camDist(close.position, close.target);
assert.ok(layout.camera.fov >= 35 && layout.camera.fov <= 55);
assert.ok(defD > 12 && layout.camera.position[1] > 5, 'default camera should show the whole site');
assert.ok(closeD < defD * 0.45, 'close camera is not closer than the default');
assert.ok(close.position[1] > 0.9 && close.position[1] < 1.8, 'close camera should be near eye height');
assert.ok(centerInside(close.position[0], close.position[2], paths.find((p) => p.id === 'mid')), 'close camera should stand on the mid path');
const corner = layout.cameraPresets.corner.position;
assert.ok(corner[0] < fence.minX || corner[2] > fence.maxZ || corner[0] > fence.maxX, 'corner camera should sit outside the fence');

for (const spec of Object.values(layout.assets)) {
  const file = path.join(dir, spec.glb);
  assert.ok(fs.existsSync(file), `missing ${spec.glb}`);
  assert.ok(fs.statSync(file).size > 1000, `${spec.glb} is empty`);
}
assert.match(html, /btn-unlit/);
assert.match(html, /btn-toon/);
assert.match(html, /vendor\/three\.module\.js/);
assert.match(lib, /MeshToonMaterial/);
assert.match(lib, /toUnlitMaterial/);
assert.match(lib, /mode === 'unlit'|get\('mode'\) === 'unlit'/);

console.log('layout.test.mjs ok', {
  crops: [...crops],
  stages: [...stages],
  beds: beds.length,
  paths: paths.map((p) => p.id),
});
