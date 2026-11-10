/**
 * Layout and orientation checks for the canal-side café.
 * Run from the repo root:
 *   node experiments/outdoor-20261110/canal-side-cafe/test/layout.test.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const sceneDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const layout = JSON.parse(fs.readFileSync(path.join(sceneDir, 'layout.json'), 'utf8'));

// World-axis sizes after glTF node transforms, before prepareAsset height fit.
const NATIVE = {
  simple_chair: { x: 0.4752, y: 0.85, z: 0.501 },
  round_table: { x: 0.4483, y: 0.3761, z: 0.4491 },
  square_table: { x: 1.2, y: 1.184, z: 1.2 },
  museum_bench: { x: 0.418, y: 0.456, z: 1.5 },
  flowerpot: { x: 0.25, y: 0.2067, z: 0.25 },
  cup_mug: { x: 0.0752, y: 0.09, z: 0.0752 },
  jam_jar: { x: 0.094, y: 0.12, z: 0.094 },
  espresso_machine: { x: 0.3522, y: 0.2532, z: 0.2754 },
};

const GROUND_BLOCKERS = new Set(['simple_chair', 'round_table', 'square_table', 'museum_bench', 'flowerpot']);
const FACE_TOL = 22 * Math.PI / 180;
let failed = 0;

function assert(cond, message) {
  if (!cond) {
    failed += 1;
    console.error('FAIL', message);
  }
}

function sizeOf(kind) {
  const spec = layout.assets[kind];
  const n = NATIVE[kind];
  const s = spec.targetHeight / n.y;
  return { x: n.x * s, y: spec.targetHeight, z: n.z * s, scale: s };
}

function footprint(inst) {
  const base = sizeOf(inst.kind);
  let sx = 1;
  let sz = 1;
  if (Array.isArray(inst.scale)) {
    sx = inst.scale[0];
    sz = inst.scale.length === 3 ? inst.scale[2] : inst.scale[0];
  } else if (typeof inst.scale === 'number') {
    sx = sz = inst.scale;
  }
  const hx = (base.x * sx) / 2;
  const hz = (base.z * sz) / 2;
  const rot = inst.rotationY || 0;
  const c = Math.abs(Math.cos(rot));
  const s = Math.abs(Math.sin(rot));
  const ex = hx * c + hz * s;
  const ez = hx * s + hz * c;
  const [x, y, z] = inst.position;
  return { id: inst.id, kind: inst.kind, y, minX: x - ex, maxX: x + ex, minZ: z - ez, maxZ: z + ez };
}

function overlapLen(a0, a1, b0, b1) {
  return Math.min(a1, b1) - Math.max(a0, b0);
}

function overlapAmount(a, b) {
  const ox = overlapLen(a.minX, a.maxX, b.minX, b.maxX);
  const oz = overlapLen(a.minZ, a.maxZ, b.minZ, b.maxZ);
  if (ox <= 0 || oz <= 0) return 0;
  return Math.min(ox, oz);
}

function rectOf(w) {
  return { minX: w.min[0], maxX: w.max[0], minZ: w.min[1], maxZ: w.max[1], id: w.id };
}

function angle(a, b) {
  const dot = a.x * b.x + a.z * b.z;
  const la = Math.hypot(a.x, a.z) || 1;
  const lb = Math.hypot(b.x, b.z) || 1;
  return Math.acos(Math.max(-1, Math.min(1, dot / (la * lb))));
}

function forward(rot) {
  return { x: Math.sin(rot), z: Math.cos(rot) };
}

const byId = Object.fromEntries(layout.instances.map((i) => [i.id, i]));
const feet = layout.instances.filter((i) => GROUND_BLOCKERS.has(i.kind) && i.position[1] < 0.4).map(footprint);
const obstacles = layout.obstacles.map((o) => ({
  id: o.id, minX: o.min[0], maxX: o.max[0], minZ: o.min[1], maxZ: o.max[1],
}));
const walkways = layout.walkways.map(rectOf);

for (const spec of Object.values(layout.assets)) {
  const file = path.join(sceneDir, spec.glb);
  assert(fs.existsSync(file), `missing asset ${spec.glb}`);
  const stat = fs.lstatSync(file);
  if (stat.isSymbolicLink()) {
    assert(fs.existsSync(file), `dangling symlink ${spec.glb}`);
  }
}

const chairs = layout.instances.filter((i) => i.kind === 'simple_chair');
const tables = layout.instances.filter((i) => i.kind === 'round_table' || i.kind === 'square_table');
assert(chairs.length >= 6, `expected at least 6 chairs, got ${chairs.length}`);
assert(tables.length >= 2, `expected at least 2 tables, got ${tables.length}`);
assert(layout.built.bikes.length >= 2, 'expected bicycles');
assert(layout.built.awning && layout.built.bridge && layout.built.stairs && layout.built.waterSteps, 'awning, bridge, stairs, water steps required');

for (const chair of chairs) {
  assert(chair.face === 'table' || chair.face === 'canal', `${chair.id} needs face table|canal`);
  const f = forward(chair.rotationY || 0);
  if (chair.face === 'canal') {
    const ang = angle(f, { x: 0, z: 1 });
    assert(ang <= FACE_TOL, `${chair.id} should face the canal (+Z), off by ${(ang * 180 / Math.PI).toFixed(1)}°`);
  }
  if (chair.at) {
    const table = byId[chair.at];
    assert(table, `${chair.id} points at missing ${chair.at}`);
    const dx = table.position[0] - chair.position[0];
    const dz = table.position[2] - chair.position[2];
    const dist = Math.hypot(dx, dz);
    assert(dist >= 0.6 && dist <= 1.05, `${chair.id} seat distance ${dist.toFixed(2)} m is outside 0.60–1.05`);
    if (chair.face === 'table') {
      const ang = angle(f, { x: dx, z: dz });
      assert(ang <= FACE_TOL, `${chair.id} should face ${chair.at}, off by ${(ang * 180 / Math.PI).toFixed(1)}°`);
    } else {
      assert(dz > 0.2, `${chair.id} is tagged canal-facing but the table is not toward the canal`);
    }
  }
}

const bench = byId.bench_wall;
assert(bench && bench.face === 'canal', 'bench should face the canal');
{
  const along = forward(bench.rotationY || 0);
  assert(Math.abs(along.x) > 0.9, 'bench length should run along the quay');
  assert(bench.position[2] < -4.6, 'bench should sit against the wall, open toward the canal');
}

const blockers = feet.concat(obstacles);
for (const way of walkways) {
  const narrow = Math.min(way.maxX - way.minX, way.maxZ - way.minZ);
  assert(narrow >= 0.68, `${way.id} is narrower than 0.68 m (${narrow.toFixed(2)})`);
  for (const b of blockers) {
    const hit = overlapAmount(way, b);
    assert(hit <= 0.02, `${b.id} blocks ${way.id} by ${hit.toFixed(2)} m`);
  }
}

function touches(a, b) {
  const ox = overlapLen(a.minX, a.maxX, b.minX, b.maxX);
  const oz = overlapLen(a.minZ, a.maxZ, b.minZ, b.maxZ);
  return ox > 0.2 && oz > 0.2;
}
const wayById = Object.fromEntries(walkways.map((w) => [w.id, w]));
assert(touches(wayById.door_apron, wayById.door_to_quay), 'door apron should meet the service path');
assert(touches(wayById.door_to_quay, wayById.quay_path), 'service path should meet the quay path');
assert(touches(wayById.stair_foot, wayById.quay_path), 'stair foot should meet the quay path');

for (let i = 0; i < feet.length; i++) {
  for (let j = i + 1; j < feet.length; j++) {
    const a = feet[i];
    const b = feet[j];
    const hit = overlapAmount(a, b);
    const chairTable = (a.kind === 'simple_chair' && (b.kind === 'round_table' || b.kind === 'square_table'))
      || (b.kind === 'simple_chair' && (a.kind === 'round_table' || a.kind === 'square_table'));
    if (chairTable) {
      assert(hit <= 0.22, `${a.id} tucks into ${b.id} by ${hit.toFixed(2)} m`);
    } else {
      assert(hit <= 0.02, `${a.id} overlaps ${b.id} by ${hit.toFixed(2)} m`);
    }
  }
}

const { waterY, quayY, copingTop, boat, doorHeight } = layout.site;
assert(waterY < quayY - 0.35 && waterY > quayY - 0.85, `water level ${waterY} is not a convincing drop below the quay`);
assert(copingTop > quayY && copingTop < quayY + 0.2, 'coping should read as a low curb');
assert(doorHeight >= 1.95 && doorHeight <= 2.3, 'door height should be human scale');
const keel = boat.position[1] + boat.keel;
const gunwale = boat.position[1] + boat.gunwale;
assert(keel < waterY - 0.15, `keel ${keel.toFixed(2)} should be below the water`);
assert(gunwale > waterY + 0.2, `gunwale ${gunwale.toFixed(2)} should clear the water`);
assert(gunwale < quayY + 0.05, `gunwale ${gunwale.toFixed(2)} should sit at or below the paving`);
assert(boat.position[2] > layout.site.water.z0 + boat.beam * 0.5, 'boat should float over the canal, not the paving');
assert(boat.position[0] - boat.length * 0.5 > layout.site.water.x0, 'boat bow/stern should stay inside the water');

const st = layout.built.stairs;
const stairTop = st.steps * st.rise;
assert(Math.abs(stairTop - layout.site.streetY) < 0.02, `stair rise ${stairTop.toFixed(2)} should meet the street at ${layout.site.streetY}`);

if (failed) {
  console.error(`${failed} check(s) failed`);
  process.exit(1);
}
console.log(`ok — ${chairs.length} chairs, ${tables.length} tables, ${walkways.length} clear paths, water ${waterY} m, gunwale ${gunwale.toFixed(2)} m`);
