import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  PISTE,
  PLANKS,
  HALL,
  REELS,
  frame,
  pisteFrames,
  innerGap,
  markings,
  warningZones,
  forbiddenZones,
  overlaps,
  scoreClearance,
  centerDashes,
  WEAPON_BELL_LIP,
  RACK_RAIL_TOP,
} from '../piste_spec.mjs';

const dir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const layout = JSON.parse(fs.readFileSync(path.join(dir, 'layout.json'), 'utf8'));

const NATIVE = {
  museum_bench: { size: [0.414, 0.456, 1.5] },
  dining_chair: { size: [0.362, 1.0, 0.511] },
  school_desk: { size: [0.602, 0.7, 0.443] },
  library_lamp: { size: [0.341, 0.451, 0.341] },
  chalkboard: { size: [0.434, 1.258, 1.502] },
  wall_shelf: { size: [0.701, 0.8, 0.287] },
  flowerpot: { size: [0.25, 0.204, 0.25] },
  thermos: { size: [0.085, 0.3, 0.085] },
  pendant_lamp: { size: [0.246, 0.449, 0.246] },
};

function bakedSize(name) {
  const bounds = JSON.parse(fs.readFileSync(path.join(dir, 'assets/baked_bounds.json'), 'utf8'));
  return bounds[name].size;
}

function halfExtents(kind) {
  const spec = layout.assets[kind];
  const native = NATIVE[kind] || { size: bakedSize(spec.glb.split('/').pop()) };
  const scale = spec.targetHeight / native.size[1];
  return [native.size[0] * scale * 0.5, native.size[2] * scale * 0.5];
}

function instanceAabb(inst) {
  const [hx, hz] = halfExtents(inst.kind);
  const rot = inst.rotationY || 0;
  const c = Math.abs(Math.cos(rot));
  const s = Math.abs(Math.sin(rot));
  const ax = hx * c + hz * s;
  const az = hx * s + hz * c;
  const [x, , z] = inst.position;
  return { x0: x - ax, x1: x + ax, z0: z - az, z1: z + az };
}

test('FIE piste is 14 m by 1.50 m with on-guard, warning, and rear-limit lines', () => {
  assert.equal(PISTE.length, 14);
  assert.equal(PISTE.width, 1.5);
  assert.equal(PISTE.onGuard, 2);
  assert.equal(PISTE.warning, 2);
  assert.equal(PISTE.line, 0.05);
  const f = frame(0);
  assert.equal(f.z1 - f.z0, 14);
  assert.equal(f.x1 - f.x0, 1.5);
  const marks = markings(0);
  const onguard = marks.filter((m) => m.id === 'onguard');
  assert.equal(onguard.length, 2);
  for (const line of onguard) {
    const z = (line.z0 + line.z1) / 2;
    assert.ok(Math.abs(Math.abs(z) - 2) < 1e-9);
    assert.ok(Math.abs(line.z1 - line.z0 - 0.05) < 1e-9);
    assert.equal(line.x0, f.x0);
    assert.equal(line.x1, f.x1);
  }
  const rears = marks.filter((m) => m.id === 'rear');
  assert.equal(rears.length, 2);
  assert.equal(Math.min(...rears.map((r) => r.z0)), -7);
  assert.equal(Math.max(...rears.map((r) => r.z1)), 7);
  const dashes = marks.filter((m) => m.id === 'center');
  assert.ok(dashes.length >= 5, 'centre line is broken');
  for (let i = 1; i < dashes.length; i += 1) {
    assert.ok(dashes[i].x0 - dashes[i - 1].x1 > 0.05);
  }
  const zones = warningZones(0);
  assert.equal(zones[0].z0, -7);
  assert.equal(zones[0].z1, -5);
  assert.equal(zones[1].z0, 5);
  assert.equal(zones[1].z1, 7);
  const centered = centerDashes(f.x0, f.x1);
  assert.ok(centered[0][0] >= f.x0 - 1e-9);
  assert.ok(centered.at(-1)[1] <= f.x1 + 1e-9);
});

test('paired pistes keep a referee aisle and 2 m runbacks', () => {
  const [a, b] = pisteFrames();
  assert.equal(a.cx, -b.cx);
  assert.ok(innerGap() >= 2.5, 'referee aisle');
  assert.ok(Math.abs(innerGap() - 2.9) < 1e-9);
  assert.equal(HALL.runback, 2);
  assert.ok(HALL.wallFar <= a.z0 - HALL.runback);
  assert.ok(HALL.floorNear >= a.z1 + HALL.runback);
  assert.ok(PLANKS <= 0.09 && PLANKS >= 0.06);
});

test('furniture stays off the pistes, runbacks, referee aisle, and coach box', () => {
  const zones = forbiddenZones();
  for (const inst of layout.instances) {
    const box = instanceAabb(inst);
    for (const zone of zones) {
      assert.equal(overlaps(box, zone, 0.02), false, `${inst.id} overlaps ${zone.id}`);
    }
  }
  for (const reel of REELS) {
    const box = { x0: reel.x - 0.16, x1: reel.x + 0.16, z0: reel.z - 0.16, z1: reel.z + 0.16 };
    for (const zone of zones) {
      assert.equal(overlaps(box, zone, 0.02), false, `${reel.id} overlaps ${zone.id}`);
    }
  }
});

test('score machines sit between 1 m and 5 m off the outer edge and face the aisle', () => {
  const [a, b] = pisteFrames();
  const scoreA = layout.instances.find((i) => i.id === 'score_a');
  const scoreB = layout.instances.find((i) => i.id === 'score_b');
  const boxA = instanceAabb(scoreA);
  const boxB = instanceAabb(scoreB);
  const clearA = scoreClearance(boxA, a);
  const clearB = scoreClearance(boxB, b);
  assert.ok(clearA >= HALL.scoreMin && clearA <= HALL.scoreMax, `piste A clearance ${clearA}`);
  assert.ok(clearB >= HALL.scoreMin && clearB <= HALL.scoreMax, `piste B clearance ${clearB}`);
  assert.ok(boxA.z1 < a.z1, 'score A is beside the strip, not in the near runback');
  assert.ok(boxB.z1 < b.z1);
  assert.ok(Math.abs(scoreA.rotationY - Math.PI / 2) < 0.02);
  assert.ok(Math.abs(scoreB.rotationY + Math.PI / 2) < 0.02);
  assert.ok(scoreA.position[1] > 0.9);
});

test('seats face the pistes and the coach sits on the wall side of the desk', () => {
  const nearL = layout.instances.find((i) => i.id === 'bench_near_l');
  const nearR = layout.instances.find((i) => i.id === 'bench_near_r');
  const side = layout.instances.find((i) => i.id === 'bench_side');
  const chair = layout.instances.find((i) => i.id === 'coach_chair');
  const desk = layout.instances.find((i) => i.id === 'coach_desk');
  for (const bench of [nearL, nearR]) {
    assert.ok(Math.abs(Math.abs(bench.rotationY) - Math.PI / 2) < 0.02, bench.id);
    assert.ok(bench.position[2] > 7);
  }
  assert.equal(side.rotationY, 0);
  assert.ok(side.position[0] > frame(HALL.pisteBX).x1 + 1.2);
  assert.ok(Math.abs(chair.rotationY + Math.PI / 2) < 0.02, 'chair faces -X, toward the pistes');
  assert.ok(chair.position[0] > desk.position[0]);
  assert.ok(Math.abs(chair.position[2] - desk.position[2]) < 0.2);
  assert.ok(Math.abs(desk.rotationY + Math.PI / 2) < 0.02, 'desk open side toward the chair');
  assert.ok(chair.position[0] < HALL.wallR - 0.15);
});

test('armory kit is on the left wall and weapon bells meet the rack rail', () => {
  const rack = layout.instances.find((i) => i.id === 'weapon_rack');
  assert.ok(rack.position[0] < frame(HALL.pisteAX).x0 - 2);
  const weapons = layout.instances.filter((i) => ['foil', 'epee', 'sabre'].includes(i.kind));
  assert.ok(weapons.length >= 7);
  const railWorld = rack.position[1] + RACK_RAIL_TOP;
  for (const w of weapons) {
    assert.ok(w.position[0] < frame(HALL.pisteAX).x0 - 2, w.id);
    assert.ok(Math.abs(w.position[1] + WEAPON_BELL_LIP - railWorld) < 0.03, w.id);
  }
  const masks = layout.instances.filter((i) => i.kind === 'mask');
  assert.ok(masks.length >= 6);
  for (const m of masks) {
    assert.ok(m.position[0] < HALL.wallL + 0.4);
    assert.ok(Math.abs(m.rotationY - Math.PI / 2) < 0.02, 'bib faces into the room');
  }
  const shelf = layout.instances.find((i) => i.id === 'glove_shelf');
  assert.ok(shelf.position[1] > 0.5);
  assert.ok(shelf.position[0] < frame(HALL.pisteAX).x0 - 2);
});

test('shared GLBs are referenced, baked kit stays in this folder, runtime is vendored', () => {
  const html = fs.readFileSync(path.join(dir, 'index.html'), 'utf8');
  const lib = fs.readFileSync(path.join(dir, 'scene_lib.js'), 'utf8');
  assert.match(html, /gym\/vendor\/three\.module\.js/);
  assert.match(lib, /MeshToonMaterial/);
  assert.match(lib, /MeshBasicMaterial/);
  assert.match(lib, /PCFHardShadowMap/);
  assert.match(lib, /NoToneMapping/);
  assert.match(lib, /TOON_STEPS = \[104, 164, 214, 255\]/);
  assert.ok(fs.existsSync(path.resolve(dir, '../../../gym/vendor/three.module.js')));
  assert.ok(fs.existsSync(path.resolve(dir, '../../../gym/vendor/loaders/GLTFLoader.js')));

  for (const spec of Object.values(layout.assets)) {
    const abs = path.resolve(dir, spec.glb);
    assert.ok(fs.existsSync(abs), spec.glb);
    const magic = fs.readFileSync(abs).subarray(0, 4).toString('utf8');
    assert.equal(magic, 'glTF', spec.glb);
    if (spec.glb.startsWith('./assets/')) {
      const stat = fs.statSync(abs);
      assert.ok(stat.size < 80000, spec.glb);
      assert.equal(fs.lstatSync(abs).isSymbolicLink(), false);
    } else {
      assert.ok(spec.glb.startsWith('../../../'), spec.glb);
      assert.ok(!abs.includes(`${path.sep}fencing-salle${path.sep}assets${path.sep}`));
    }
  }
});
