import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  APPROACH_DOTS,
  FOOT,
  INCH,
  LANE,
  PLACED,
  aisleRect,
  approachDotZ,
  approachRects,
  boardOffset,
  buildHouse,
  floorFootprints,
  furniturePlan,
  intersects,
  laneRects,
  pinLocals,
  worldPins,
} from './lane_spec.mjs';

const dir = path.dirname(fileURLToPath(import.meta.url));
const layout = JSON.parse(fs.readFileSync(path.join(dir, 'layout.json'), 'utf8'));
const house = buildHouse();

test('USBC lane constants', () => {
  assert.ok(Math.abs(LANE.width - 41.5 * INCH) < 1e-9);
  assert.ok(Math.abs(LANE.foulToHeadPin - 60 * FOOT) < 1e-9);
  assert.ok(Math.abs(LANE.approach - 15 * FOOT) < 1e-9);
  assert.ok(Math.abs(LANE.gutter - 9.25 * INCH) < 1e-9);
  assert.ok(Math.abs(LANE.gutterDepth - 1.875 * INCH) < 1e-9);
  assert.ok(LANE.foulWidth >= (3 / 8) * INCH && LANE.foulWidth <= 1 * INCH);
  assert.ok(Math.abs(LANE.pinSpacing - 12 * INCH) < 1e-9);
  assert.ok(Math.abs(LANE.pinHeight - 15 * INCH) < 1e-9);
  assert.ok(Math.abs(LANE.ballDiameter - 8.5 * INCH) < 1e-9);
  assert.ok(Math.abs(LANE.deckRear - (60 * FOOT + (34 + 3 / 16) * INCH)) < 1e-9);
});

test('ten pins form an equilateral triangle inside the lane', () => {
  const pins = pinLocals();
  assert.equal(pins.length, 10);
  const byN = Object.fromEntries(pins.map((p) => [p.n, p]));
  const dist = (a, b) => Math.hypot(a.x - b.x, a.down - b.down);
  for (const [a, b] of [[1, 2], [2, 4], [4, 7], [1, 3], [7, 8], [8, 9], [9, 10]]) {
    assert.ok(Math.abs(dist(byN[a], byN[b]) - 12 * INCH) < 1e-9, `${a}-${b}`);
  }
  assert.ok(Math.abs(byN[7].down - LANE.backRowRef) < (1 / 16) * INCH);
  const lane = house.lanes[0];
  const world = worldPins(lane);
  const pin7 = world.find((p) => p.n === 7);
  const pin10 = world.find((p) => p.n === 10);
  assert.ok(Math.abs(pin7.x - lane.x0 - 2.75 * INCH) < 1e-9);
  assert.ok(Math.abs(lane.x1 - pin10.x - 2.75 * INCH) < 1e-9);
  for (const pin of world) {
    assert.ok(pin.x > lane.x0 && pin.x < lane.x1);
    assert.ok(pin.z < -LANE.foulToHeadPin + 1e-9);
    assert.ok(pin.z > -LANE.deckRear);
  }
});

test('every lane is flanked by gutters and pairs share a return', () => {
  assert.equal(house.lanes.length, 4);
  assert.equal(house.pairs.length, 2);
  for (const lane of house.lanes) {
    assert.ok(Math.abs(lane.width - LANE.width) < 1e-9);
    assert.ok(Math.abs(lane.leftGutter.x1 - lane.x0) < 1e-9);
    assert.ok(Math.abs(lane.rightGutter.x0 - lane.x1) < 1e-9);
    assert.ok(Math.abs(lane.leftGutter.width - LANE.gutter) < 1e-9);
    assert.ok(Math.abs(lane.rightGutter.width - LANE.gutter) < 1e-9);
  }
  for (const pair of house.pairs) {
    assert.ok(pair.ballReturn.x0 >= pair.laneL.x1);
    assert.ok(pair.ballReturn.x1 <= pair.laneR.x0);
    const hood = {
      x0: pair.ballReturn.cx - PLACED.hood.width / 2,
      x1: pair.ballReturn.cx + PLACED.hood.width / 2,
      z0: PLACED.hood.z0,
      z1: PLACED.hood.z1,
    };
    for (const lane of pair.lanes) {
      const approach = { x0: lane.x0, x1: lane.x1, z0: 0, z1: LANE.approach };
      assert.equal(intersects(hood, approach), false, `hood overlaps approach ${lane.number}`);
    }
    assert.ok(hood.z0 > 0 && hood.z1 < LANE.approach);
  }
});

test('arrows and approach dots stay on their surfaces', () => {
  assert.deepEqual(LANE.arrowBoards, [5, 10, 15, 20, 25, 30, 35]);
  assert.ok(Math.abs(boardOffset(20)) < 1e-9);
  assert.ok(boardOffset(5) > 0 && boardOffset(35) < 0);
  assert.ok(Math.abs(boardOffset(5)) < LANE.width / 2);
  assert.ok(Math.abs(boardOffset(35)) < LANE.width / 2);
  assert.equal(LANE.arrowFromFoul, 15 * FOOT);
  for (const row of APPROACH_DOTS) {
    const z = approachDotZ(row);
    const [a, b] = row.band;
    assert.ok(z > a * FOOT - 1e-9 && z < b * FOOT + 1e-9, row.id);
    assert.ok(z > 0 && z < LANE.approach);
  }
});

test('approaches, lanes, and the cross aisle stay clear', () => {
  const feet = floorFootprints(house);
  for (const approach of approachRects(house)) {
    for (const foot of feet) {
      assert.equal(intersects(foot, approach), false, `${foot.id} blocks ${approach.id}`);
    }
  }
  for (const lane of laneRects(house)) {
    for (const foot of feet) {
      assert.equal(intersects(foot, lane), false, `${foot.id} sits on ${lane.id}`);
    }
  }
  const aisle = aisleRect(house);
  assert.ok(aisle.z1 - aisle.z0 >= 1.4);
  for (const foot of feet) {
    assert.equal(intersects(foot, aisle), false, `${foot.id} blocks the aisle`);
  }
});

test('layout furniture matches the plan and faces its job', () => {
  const plan = furniturePlan();
  assert.equal(layout.instances.length, plan.length);
  for (const item of plan) {
    const inst = layout.instances.find((row) => row.id === item.id);
    assert.ok(inst, item.id);
    assert.equal(inst.kind, item.kind);
    inst.position.forEach((value, i) => assert.ok(Math.abs(value - item.position[i]) < 1e-6));
    assert.ok(Math.abs((inst.rotationY || 0) - (item.rotationY || 0)) < 1e-6);
  }
  const chairs = layout.instances.filter((row) => row.kind === 'theatre_chair');
  assert.equal(chairs.length, 4);
  for (const chair of chairs) {
    assert.ok(Math.abs(chair.rotationY || 0) < 1e-6, chair.id);
    assert.ok(chair.position[2] > LANE.approach);
    const lane = house.lanes.find((row) => Math.abs(row.cx - chair.position[0]) < 1e-3);
    assert.ok(lane, chair.id);
  }
  for (const monitor of layout.instances.filter((row) => row.kind === 'monitor')) {
    assert.ok(Math.abs(monitor.rotationY - Math.PI) < 1e-6);
    assert.ok(monitor.position[2] > LANE.approach);
  }
  const counter = layout.instances.find((row) => row.id === 'shoe_counter');
  assert.ok(counter.position[0] > house.x1);
  assert.ok(Math.abs(counter.rotationY - Math.PI / 2) < 1e-6);
  for (const stool of layout.instances.filter((row) => row.kind === 'bar_stool')) {
    assert.ok(stool.position[0] > house.x1);
    assert.ok(stool.position[0] < counter.position[0]);
  }
  const bench = layout.instances.find((row) => row.id === 'wait_bench');
  assert.ok(bench.position[0] < house.x0);
});

test('GLBs are existing repo bakes, not copies in this scene', () => {
  const kinds = Object.keys(layout.assets);
  assert.ok(kinds.length >= 8);
  for (const kind of kinds) {
    const spec = layout.assets[kind];
    const abs = path.resolve(dir, spec.glb);
    assert.equal(fs.existsSync(abs), true, spec.glb);
    assert.equal(abs.includes(`${path.sep}bowling-alley${path.sep}`), false, spec.glb);
    assert.ok(spec.targetHeight > 0.1 && spec.targetHeight < 2.2);
  }
  const html = fs.readFileSync(path.join(dir, 'index.html'), 'utf8');
  assert.match(html, /gym\/vendor\/three\.module\.js/);
  assert.equal(fs.existsSync(path.resolve(dir, '../../../gym/vendor/three.module.js')), true);
  assert.equal(html.includes('unpkg') || html.includes('jsdelivr') || html.includes('cdn'), false);
});
