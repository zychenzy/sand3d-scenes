import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const sceneDir = path.resolve(import.meta.dirname, '..');
const repoDir = path.resolve(sceneDir, '../../..');
const layout = JSON.parse(fs.readFileSync(path.join(sceneDir, 'layout.json'), 'utf8'));
const lib = fs.readFileSync(path.join(sceneDir, 'scene_lib.js'), 'utf8');

function rotAabb(x, z, hx, hz, rot = 0) {
  const c = Math.abs(Math.cos(rot));
  const s = Math.abs(Math.sin(rot));
  return {
    minX: x - (hx * c + hz * s),
    maxX: x + (hx * c + hz * s),
    minZ: z - (hx * s + hz * c),
    maxZ: z + (hx * s + hz * c),
  };
}

function distPointRect(px, pz, rect) {
  const dx = px < rect.minX ? rect.minX - px : px > rect.maxX ? px - rect.maxX : 0;
  const dz = pz < rect.minZ ? rect.minZ - pz : pz > rect.maxZ ? pz - rect.maxZ : 0;
  return Math.hypot(dx, dz);
}

function facing(rot) {
  return { x: Math.sin(rot), z: Math.cos(rot) };
}

function blockers() {
  const list = [];
  const skip = new Set(['pendant_lamp', 'library_lamp', 'cash_register', 'pos_terminal', 'monitor']);
  for (const inst of layout.instances) {
    if (skip.has(inst.kind)) continue;
    const spec = layout.assets[inst.kind];
    const [x, , z] = inst.position;
    list.push({ id: inst.id, ...rotAabb(x, z, spec.hx, spec.hz, inst.rotationY || 0) });
  }
  const r = layout.places.reception;
  list.push({ id: 'reception', ...rotAabb(r.x, r.z, r.w / 2, r.d / 2, 0) });
  for (const [i, cab] of layout.places.cabinets.entries()) {
    list.push({ id: `cab${i}`, ...rotAabb(cab.x, cab.z, cab.w / 2, cab.d / 2, 0) });
  }
  for (const [i, vit] of layout.places.vitrines.entries()) {
    list.push({ id: `vit${i}`, ...rotAabb(vit.x, vit.z, vit.w / 2, vit.d / 2, 0) });
  }
  const chair = layout.places.examChair;
  list.push({ id: 'exam-chair', ...rotAabb(chair.x, chair.z, chair.hx, chair.hz, 0) });
  const ph = layout.places.phoropter;
  list.push({ id: 'phoropter', ...rotAabb(ph.x, ph.z, ph.hx, ph.hz, 0) });
  const adj = layout.places.adjust;
  list.push({ id: 'adjust', ...rotAabb(adj.x, adj.z, adj.hx, adj.hz, 0) });
  const wait = layout.places.wait;
  list.push({ id: 'wait', ...rotAabb(wait.x, wait.z, wait.hx, wait.hz, wait.rotY || 0) });
  const room = layout.meta.room;
  const halfD = room.depth / 2;
  const px = layout.places.partitionX;
  const door = layout.places.door;
  list.push({ id: 'part-back', minX: px - 0.08, maxX: px + 0.08, minZ: -halfD, maxZ: door.z0 });
  list.push({ id: 'part-front', minX: px - 0.08, maxX: px + 0.08, minZ: door.z1, maxZ: layout.places.exam.z1 });
  return list;
}

test('shared glbs and vendor are symlinks, not copies', () => {
  const vendor = fs.lstatSync(path.join(sceneDir, 'vendor'));
  assert.equal(vendor.isSymbolicLink(), true);
  const vendorReal = fs.realpathSync(path.join(sceneDir, 'vendor'));
  assert.ok(vendorReal.startsWith(repoDir));
  assert.equal(vendorReal.includes(`${path.sep}optician${path.sep}`), false);
  for (const spec of Object.values(layout.assets)) {
    const link = path.join(sceneDir, spec.glb);
    const st = fs.lstatSync(link);
    assert.equal(st.isSymbolicLink(), true, spec.glb);
    const real = fs.realpathSync(link);
    assert.ok(real.startsWith(repoDir), real);
    assert.equal(real.includes(`${path.sep}optician${path.sep}`), false, real);
    assert.ok(fs.statSync(real).size > 500, real);
  }
});

test('toon is hard-stepped and unlit is basic', () => {
  assert.match(lib, /export const TOON_STOPS = \[0\.42, 0\.64, 0\.82, 1\]/);
  assert.match(lib, /NearestFilter/);
  assert.match(lib, /BasicShadowMap/);
  assert.match(lib, /MeshBasicMaterial/);
  assert.match(lib, /NoToneMapping/);
  const unlit = lib.slice(lib.indexOf('function toUnlitMaterial'), lib.indexOf('export function applyShading'));
  assert.equal(unlit.includes('MeshToonMaterial'), false);
  assert.match(unlit, /MeshBasicMaterial/);
});

test('photo refs are links only', () => {
  const refs = fs.readdirSync(path.join(sceneDir, 'refs'));
  for (const name of refs) {
    assert.equal(/\.(png|jpe?g|webp)$/i.test(name), false, name);
  }
  const sources = fs.readFileSync(path.join(sceneDir, 'refs', 'SOURCES.md'), 'utf8');
  assert.match(sources, /https:\/\/commons\.wikimedia\.org\//);
  assert.equal(sources.includes('!['), false);
});

test('chairs, mirror, and exam lane face the work', () => {
  const byId = Object.fromEntries(layout.instances.map((item) => [item.id, item]));
  const mirror = layout.places.mirror;
  const fit = byId.chair_fitting;
  const fitFace = facing(fit.rotationY);
  assert.ok(fitFace.x < -0.95, 'fitting chair faces the left wall');
  assert.ok(mirror.x < fit.position[0] - 0.55);
  assert.ok(mirror.x > fit.position[0] - 1.15);
  assert.ok(mirror.y - mirror.h / 2 < 1.15 && mirror.y + mirror.h / 2 > 1.15);

  const adjust = byId.chair_adjust;
  const desk = layout.places.adjust;
  assert.ok(facing(adjust.rotationY).x < -0.95);
  assert.ok(adjust.position[0] > desk.x + 0.4);
  assert.ok(layout.places.wait.hx <= 0.45 && layout.places.wait.hz <= 0.28);
  assert.equal(layout.assets.museum_bench, undefined);
  assert.equal(layout.assets.school_desk, undefined);

  const staff = byId.chair_staff;
  const reception = layout.places.reception;
  assert.ok(facing(staff.rotationY).z < -0.95);
  assert.ok(staff.position[2] > reception.z + reception.d / 2);

  const consult = byId.chair_consult;
  assert.ok(facing(consult.rotationY).z > 0.95);
  assert.ok(consult.position[2] < reception.z - reception.d / 2 - 0.4);

  const chart = layout.places.chart;
  const patient = layout.places.examChair;
  const phoropter = layout.places.phoropter;
  assert.ok(chart.z < phoropter.z - 1.5);
  assert.ok(phoropter.z < patient.z - 0.25);
  assert.ok(patient.z - chart.z > 2.6 && patient.z - chart.z < 4.2);

  const trial = byId.trial_case;
  assert.ok(Math.abs(trial.rotationY + Math.PI / 2) < 0.02);
  assert.ok(trial.position[0] > layout.places.partitionX);
  assert.ok(trial.position[0] < layout.places.partitionX + 0.55);
});

test('retail and exam stay on their own sides of the partition', () => {
  const px = layout.places.partitionX;
  for (const inst of layout.instances) {
    const x = inst.position[0];
    if (inst.zone === 'exam') assert.ok(x > px, inst.id);
    if (inst.zone === 'retail') assert.ok(x < px - 0.2, inst.id);
  }
  assert.ok(layout.places.chart.x > px);
  assert.ok(layout.places.examChair.x > px);
  assert.ok(layout.places.mirror.x < px);
  for (const cab of layout.places.cabinets) assert.ok(cab.x + cab.w / 2 < px);
});

test('instances sit inside the room and pendants clear heads', () => {
  const { width, depth, height } = layout.meta.room;
  for (const inst of layout.instances) {
    const [x, y, z] = inst.position;
    const spec = layout.assets[inst.kind];
    assert.ok(Math.abs(x) < width / 2 - 0.2, inst.id);
    assert.ok(Math.abs(z) < depth / 2 - 0.15, inst.id);
    assert.ok(y >= 0 && y + (spec.targetHeight || 0) < height + 0.02, inst.id);
    if (inst.kind === 'pendant_lamp') assert.ok(y > 1.9, inst.id);
  }
});

test('walking routes stay clear of furniture and use the exam door', () => {
  const solids = blockers();
  const door = layout.places.door;
  const px = layout.places.partitionX;
  for (const route of layout.routes) {
    const pts = route.points;
    for (let i = 0; i < pts.length - 1; i++) {
      const [x0, z0] = pts[i];
      const [x1, z1] = pts[i + 1];
      for (let s = 0; s <= 12; s++) {
        const t = s / 12;
        const x = x0 + (x1 - x0) * t;
        const z = z0 + (z1 - z0) * t;
        for (const solid of solids) {
          const d = distPointRect(x, z, solid);
          assert.ok(d >= route.clear, `${route.id} comes within ${d.toFixed(2)} of ${solid.id}`);
        }
      }
    }
  }
  const exam = layout.routes.find((route) => route.id === 'street_to_exam');
  const end = exam.points[exam.points.length - 1];
  assert.ok(end[0] > px);
  assert.ok(end[1] > door.z0 && end[1] < door.z1);
});
