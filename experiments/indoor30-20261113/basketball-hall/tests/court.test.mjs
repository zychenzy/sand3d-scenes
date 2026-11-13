import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import {
  COURT, half, basketInset, basketCenter, backboardFaceZ, ringCenter, backboardBottomY,
  freeThrow, threePoint, threePointPoint, noCharge, runoffBounds, intersects,
  straightMarks, throwInMarks, forwardFromYaw, openFromYaw,
} from '../court_spec.mjs';

const dir = path.dirname(fileURLToPath(import.meta.url));
const scene = path.resolve(dir, '..');
const repo = path.resolve(scene, '../../..');
const layout = JSON.parse(fs.readFileSync(path.join(scene, 'layout.json'), 'utf8'));

const NATIVE = {
  simple_chair: { h: 0.85, x: 0.475, z: 0.501 },
  display_bookcase: { h: 2, x: 0.834, z: 0.408 },
  wall_shelf: { h: 0.8, x: 0.701, z: 0.287 },
  thermos: { h: 0.3, x: 0.09, z: 0.21 },
  cup_mug: { h: 0.09, x: 0.075, z: 0.075 },
  flowerpot: { h: 0.207, x: 0.25, z: 0.25 },
};

function footprint(inst) {
  const spec = layout.assets[inst.kind];
  const native = NATIVE[inst.kind];
  const s = spec.targetHeight / native.h;
  let w = native.x * s;
  let d = native.z * s;
  const yaw = Math.abs(inst.rotationY || 0) % Math.PI;
  if (yaw > Math.PI / 4 && yaw < (3 * Math.PI) / 4) [w, d] = [d, w];
  const x = inst.position[0];
  const z = inst.position[2];
  return { x0: x - w / 2, x1: x + w / 2, z0: z - d / 2, z1: z + d / 2, w, d };
}

test('FIBA court constants and constructed ring centre', () => {
  assert.equal(COURT.length, 28);
  assert.equal(COURT.width, 15);
  assert.equal(COURT.line, 0.05);
  assert.equal(COURT.runoff, 2);
  assert.equal(COURT.ringHeight, 3.05);
  assert.equal(COURT.backboardW, 1.8);
  assert.equal(COURT.backboardH, 1.05);
  assert.equal(COURT.threeRadius, 6.75);
  assert.equal(COURT.freeThrowFromEnd, 5.8);
  assert.equal(COURT.laneOuter * 2, 4.9);
  assert.ok(Math.abs(basketInset() - 1.576) < 1e-9);
  assert.equal(backboardBottomY(), 2.9);
  assert.equal(layout.meta.court.length, 28);
  assert.equal(layout.meta.court.width, 15);
  assert.equal(layout.meta.floor.length, 32);
  assert.equal(layout.meta.floor.width, 19);
  assert.ok(layout.meta.court.ceiling >= COURT.clearHeight);
  assert.equal(layout.meta.units, 'metres');
});

test('lines, free-throw, three-point, and no-charge sit on the rules', () => {
  const { L, W } = half();
  for (const sign of [-1, 1]) {
    const face = backboardFaceZ(sign);
    const ring = ringCenter(sign);
    const basket = basketCenter(sign);
    assert.ok(Math.abs(Math.abs(face) - (L - 1.2)) < 1e-9);
    assert.ok(Math.abs(ring.y - 3.05) < 1e-9);
    assert.ok(Math.abs(ring.z - basket.z) < 1e-9, 'ring centre is over the basket point');
    const nearest = ring.z + sign * (COURT.ringInner / 2);
    assert.ok(Math.abs(Math.abs(face - nearest) - COURT.ringGap) < 1e-9);

    const ft = freeThrow(sign);
    assert.ok(Math.abs(Math.abs(sign * L - ft.farEdge) - 5.8) < 1e-9);
    assert.ok(Math.abs(ft.x1 - ft.x0 - 3.6) < 1e-9);
    assert.ok(Math.abs(ft.farEdge) < Math.abs(ft.baselineEdge));

    const tp = threePoint(sign);
    assert.ok(Math.abs(W - tp.xOuter - 0.9) < 1e-9);
    const join = threePointPoint(sign, tp.theta);
    const dist = Math.hypot(join.x - basket.x, join.z - basket.z);
    assert.ok(Math.abs(dist - 6.75) < 1e-6, dist);
    assert.ok(Math.abs(Math.abs(join.x) - tp.xOuter) < 1e-6);
    assert.ok(Math.abs(join.z) < L);

    const nc = noCharge(sign);
    assert.equal(nc.radius, 1.3);
    assert.ok(Math.abs(Math.abs(nc.zWall - nc.zCourt) - 0.375) < 1e-9);
    assert.ok(Math.abs(Math.abs(sign * L - nc.zWall) - 1.2) < 1e-9);
    assert.ok(Math.abs(Math.abs(sign * L - nc.zCourt) - 1.575) < 1e-9);
  }

  const byId = Object.fromEntries(straightMarks().map((r) => [r.id, r]));
  assert.ok(Math.abs(byId.center.z1 - byId.center.z0 - 0.05) < 1e-9);
  assert.ok(byId.center.x1 > W);
  assert.ok(byId.sideline_pos.x0 === W);
  for (const mark of throwInMarks()) {
    const edge = mark.sign > 0 ? mark.z1 : mark.z0;
    const fromEnd = Math.abs(mark.sign * L - edge);
    assert.ok(Math.abs(fromEnd - 8.325) < 1e-9, mark.id);
    assert.ok(Math.abs(mark.x1 - mark.x0 - 0.15) < 1e-9);
    assert.ok(Math.min(Math.abs(mark.x0), Math.abs(mark.x1)) > W);
  }
});

test('benches face the court and furniture stays out of the 2 m runoff', () => {
  const runoff = runoffBounds();
  assert.deepEqual(runoff, { x0: -9.5, x1: 9.5, z0: -16, z1: 16 });

  for (const bench of layout.zones.benches) {
    assert.equal(bench.seatToward, 'negX');
    assert.ok(bench.len >= 7, 'a practice squad bench, not a stool');
    const front = bench.x - bench.depth / 2;
    const box = {
      x0: bench.x - bench.depth / 2,
      x1: bench.x + bench.depth / 2,
      z0: bench.z - bench.len / 2,
      z1: bench.z + bench.len / 2,
    };
    assert.ok(front >= runoff.x1 - 1e-6, bench.id);
    assert.equal(intersects(box, runoff), false, bench.id);
  }

  const table = layout.zones.table;
  const tableBox = {
    x0: table.x - table.d / 2,
    x1: table.x + table.d / 2,
    z0: table.z - table.w / 2,
    z1: table.z + table.w / 2,
  };
  assert.equal(intersects(tableBox, runoff), false, 'scorer table');
  assert.ok(table.h >= 0.74 && table.h <= 0.8);

  const cart = layout.zones.cart;
  const cartBox = {
    x0: cart.x - cart.w / 2,
    x1: cart.x + cart.w / 2,
    z0: cart.z - cart.d / 2,
    z1: cart.z + cart.d / 2,
  };
  assert.equal(intersects(cartBox, runoff), false, 'ball cart');

  for (const ball of layout.zones.shelfBalls) {
    const box = { x0: ball.x - 0.12, x1: ball.x + 0.12, z0: ball.z - 0.12, z1: ball.z + 0.12 };
    assert.equal(intersects(box, runoff), false, 'shelf ball');
  }
  for (const cone of layout.zones.cones) {
    const box = { x0: cone.x - 0.12, x1: cone.x + 0.12, z0: cone.z - 0.12, z1: cone.z + 0.12 };
    assert.equal(intersects(box, runoff), false, 'cone');
  }

  for (const inst of layout.instances) {
    const box = footprint(inst);
    assert.equal(intersects(box, runoff), false, inst.id);
    if (inst.facing === 'negX') {
      const dir = forwardFromYaw(inst.rotationY);
      assert.ok(dir.x < -0.9, inst.id);
      assert.ok(inst.position[0] > runoff.x1);
    }
    if (inst.openToward === 'posX') {
      const dir = openFromYaw(inst.rotationY);
      assert.ok(dir.x > 0.9, inst.id);
      assert.ok(inst.position[0] < runoff.x0);
    }
    if (inst.sitToward === 'posX') {
      assert.ok(Math.abs(inst.rotationY) < 0.2, inst.id);
      assert.ok(inst.position[0] < runoff.x0);
    }
    if (inst.facing === 'posX') {
      assert.ok(Math.abs(Math.cos(inst.rotationY)) > 0.9, inst.id);
      assert.ok(inst.position[0] < runoff.x0);
    }
  }

  for (const kind of ['museum_bench', 'chalkboard', 'study_desk']) {
    assert.equal(layout.assets[kind], undefined, kind);
    assert.equal(layout.instances.some((i) => i.kind === kind), false, kind);
  }

  const tie = layout.zones.tieBench;
  assert.equal(tie.seatToward, 'posX');
  assert.ok(tie.len >= 2.4, 'tie-up seating is a gym bench, not a 1.5 m museum seat');
  const tieBox = {
    x0: tie.x - tie.depth / 2,
    x1: tie.x + tie.depth / 2,
    z0: tie.z - tie.len / 2,
    z1: tie.z + tie.len / 2,
  };
  assert.equal(intersects(tieBox, runoff), false, 'tie bench');
  assert.ok(tieBox.x1 <= runoff.x0 + 1e-6, 'tie bench faces the court from outside the runoff');

  const pad = layout.zones.wallPad;
  const padBox = {
    x0: pad.x - pad.d / 2,
    x1: pad.x + pad.d / 2,
    z0: pad.z - pad.len / 2,
    z1: pad.z + pad.len / 2,
  };
  assert.equal(intersects(padBox, runoff), false, 'wall pad');
  assert.ok(pad.h >= 1.1 && pad.len >= 1.8);

  const rack = layout.zones.ballRack;
  const rackBox = {
    x0: rack.x - rack.w / 2,
    x1: rack.x + rack.w / 2,
    z0: rack.z - rack.d / 2,
    z1: rack.z + rack.d / 2,
  };
  assert.equal(intersects(rackBox, runoff), false, 'ball rack');

  const home = layout.instances.find((i) => i.id === 'coach_home');
  const away = layout.instances.find((i) => i.id === 'coach_away');
  assert.ok(home.position[2] > 0 && away.position[2] < 0);
  assert.ok(layout.zones.benches[0].z > 0 && layout.zones.benches[1].z < 0);
});

test('shared GLBs and the vendored renderer are root references, not copies', () => {
  for (const file of ['hall.js', 'scene_lib.js', 'index.html']) {
    const text = fs.readFileSync(path.join(scene, file), 'utf8');
    assert.doesNotMatch(text, /https?:\/\//);
  }
  for (const file of ['hall.js', 'scene_lib.js', 'court_spec.mjs']) {
    const checked = spawnSync(process.execPath, ['--check', path.join(scene, file)], { encoding: 'utf8' });
    assert.equal(checked.status, 0, checked.stderr);
  }
  const html = fs.readFileSync(path.join(scene, 'index.html'), 'utf8');
  assert.match(html, /gym\/vendor\/three\.module\.js/);
  assert.match(html, /MeshToon|btn-unlit|btn-toon/);
  const lib = fs.readFileSync(path.join(scene, 'scene_lib.js'), 'utf8');
  assert.match(lib, /MeshToonMaterial/);
  assert.match(lib, /MeshBasicMaterial/);
  assert.match(lib, /NearestFilter/);
  assert.match(lib, /makeToonGradient\(4\)/);

  for (const spec of Object.values(layout.assets)) {
    assert.equal(spec.glb.startsWith('assets/'), false, spec.glb);
    assert.equal(spec.glb.includes('indoor30'), false, spec.glb);
    const abs = path.resolve(scene, spec.glb);
    assert.equal(fs.existsSync(abs), true, spec.glb);
    assert.ok(path.relative(repo, abs).startsWith('..') === false);
    assert.ok(path.relative(scene, abs).startsWith('..'));
    const stat = fs.lstatSync(abs);
    assert.equal(stat.isSymbolicLink(), false);
  }
  assert.ok(fs.existsSync(path.resolve(scene, '../../../gym/vendor/three.module.js')));
  assert.ok(fs.existsSync(path.resolve(scene, '../../../gym/vendor/loaders/GLTFLoader.js')));
  const sceneFiles = fs.readdirSync(scene);
  assert.equal(sceneFiles.includes('vendor'), false);
  assert.equal(sceneFiles.includes('assets'), false);
});
