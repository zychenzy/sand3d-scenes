import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  FOCUS,
  ARC,
  STAGE,
  SHED,
  getTiers,
  crestY,
  foreY,
  sampleHeight,
  stoneBlocks,
  allSteps,
  pathStones,
  seatingContainment,
  stageContains,
  stageLipZ,
  stageAabb,
  shedAabb,
  aabbOverlap,
  layoutInstances,
  lookVector,
  yawToward,
  POLES,
  TREES,
} from "../bowl.js";

const layout = JSON.parse(
  readFileSync(new URL("../layout.json", import.meta.url), "utf8"),
);

test("layout instances stay in sync with the bowl plan", () => {
  assert.deepEqual(layout.instances, layoutInstances());
});

test("stone tiers rise toward the back and face the stage", () => {
  const tiers = getTiers();
  for (let i = 1; i < tiers.length; i++) {
    assert.ok(tiers[i].y > tiers[i - 1].y);
    assert.ok(tiers[i].r > tiers[i - 1].rOuter - 0.05);
  }
  const blocks = stoneBlocks();
  assert.ok(blocks.length > 40);
  for (const b of blocks) {
    assert.ok(Math.abs(b.am) <= ARC + 1e-6);
    const inwardX = -Math.sin(b.am);
    const inwardZ = -Math.cos(b.am);
    const vx = FOCUS.x - b.x;
    const vz = FOCUS.z - b.z;
    const vlen = Math.hypot(vx, vz);
    const dot = (vx * inwardX + vz * inwardZ) / vlen;
    assert.ok(dot > 0.98, `block tier ${b.tier} faces away from the stage`);
    const inner = {
      x: b.x + inwardX * (b.depth / 2),
      z: b.z + inwardZ * (b.depth / 2),
    };
    const outer = {
      x: b.x - inwardX * (b.depth / 2),
      z: b.z - inwardZ * (b.depth / 2),
    };
    const di = Math.hypot(inner.x - FOCUS.x, inner.z - FOCUS.z);
    const dout = Math.hypot(outer.x - FOCUS.x, outer.z - FOCUS.z);
    assert.ok(di < dout);
  }
});

test("side stairs climb outside the seating arc", () => {
  const steps = allSteps();
  const sides = new Set(steps.map((s) => s.side));
  assert.deepEqual(sides, new Set(["L", "R"]));
  for (const side of sides) {
    const run = steps.filter((s) => s.side === side);
    for (let i = 1; i < run.length; i++) {
      assert.ok(run[i].y > run[i - 1].y);
    }
    assert.ok(run[0].y < 0.25);
    assert.ok(Math.abs(run[run.length - 1].y - crestY()) < 0.02);
    for (const s of run) {
      const c = seatingContainment(s.x, s.z);
      assert.equal(c.inside, false, `${side} step ${s.i} cuts a seat`);
      assert.ok(s.width >= 1.05 && s.width <= 1.6);
      assert.ok(s.rise > 0.1 && s.rise < 0.2);
    }
  }
});

test("paths stay off the stone seats and the stage", () => {
  const stones = pathStones();
  assert.ok(stones.length > 20);
  for (const s of stones) {
    assert.equal(seatingContainment(s.x, s.z).inside, false);
    assert.equal(stageContains(s.x, s.z, -0.3), false);
  }
});

test("stage faces the bowl and the shed stays on the back edge", () => {
  const lip = stageLipZ();
  const tiers = getTiers();
  const firstSeatZ = FOCUS.z + tiers[0].r;
  assert.ok(lip < firstSeatZ, "stage lip is upstage of the front tier");
  assert.ok(STAGE.y > 0.4 && STAGE.y < 0.85);
  assert.ok(STAGE.w > 5 && STAGE.w < 8);
  assert.equal(aabbOverlap(stageAabb(), shedAabb()), false);
  const shed = shedAabb();
  assert.ok(shed.x0 > stageAabb().x1 - 0.2);
  assert.ok(shed.z1 < lip);
  assert.ok(sampleHeight(SHED.x, SHED.z) < 0.2);
});

test("ground heights match the bowl, apron, and forecourt", () => {
  const tiers = getTiers();
  for (const t of tiers) {
    const z = FOCUS.z + (t.r + t.rOuter) / 2;
    const h = sampleHeight(FOCUS.x, z);
    assert.ok(Math.abs(h - t.y) < 0.08, `tier height ${h} != ${t.y}`);
  }
  assert.ok(sampleHeight(0, FOCUS.z + 1.5) < 0.08);
  assert.ok(Math.abs(sampleHeight(2.2, 7.15) - crestY()) < 0.06);
  assert.ok(foreY() > crestY());
});

test("props face their use and sit on the right surface", () => {
  const props = layoutInstances();
  const byId = Object.fromEntries(props.map((p) => [p.id, p]));
  const table = byId.table_gather;
  for (const id of ["chair_a", "chair_b"]) {
    const chair = byId[id];
    const from = { x: chair.position[0], z: chair.position[2] };
    const to = { x: table.position[0], z: table.position[2] };
    const dist = Math.hypot(from.x - to.x, from.z - to.z);
    assert.ok(dist > 0.75 && dist < 1.15);
    const look = lookVector(chair.rotationY);
    const dx = to.x - from.x;
    const dz = to.z - from.z;
    const dot = (look.x * dx + look.z * dz) / Math.hypot(dx, dz);
    assert.ok(dot > 0.95, `${id} does not face the table`);
    assert.equal(seatingContainment(from.x, from.z).inside, false);
  }
  const bench = byId.bench_wait;
  const expected = yawToward(
    { x: bench.position[0], z: bench.position[2] },
    FOCUS,
  ) - Math.PI / 2;
  assert.ok(Math.abs(bench.rotationY - expected) < 0.02);
  for (const id of ["sp_l", "sp_r"]) {
    const sp = byId[id];
    assert.ok(stageContains(sp.position[0], sp.position[2], 0.2));
    assert.equal(sp.position[1], STAGE.y);
    const face = { x: Math.cos(sp.rotationY), z: -Math.sin(sp.rotationY) };
    const dx = 0 - sp.position[0];
    const dz = -1.2 - sp.position[2];
    const dot = (face.x * dx + face.z * dz) / Math.hypot(dx, dz);
    assert.ok(dot > 0.9, `${id} cone should face the bowl`);
  }
  for (const p of props.filter((i) => i.kind === "flowerpot" && i.position[1] > 1)) {
    assert.ok(Math.abs(p.position[1] - foreY()) < 0.001);
  }
});

test("poles and trees are not planted in the seats", () => {
  for (const p of POLES) {
    assert.equal(seatingContainment(p.x, p.z).inside, false);
    assert.ok(p.h > 4 && p.h < 6.2);
  }
  for (const tree of TREES) {
    assert.equal(seatingContainment(tree.x, tree.z).inside, false, tree.kind);
    assert.equal(stageContains(tree.x, tree.z, -0.4), false);
  }
  const kinds = new Set(TREES.map((t) => t.kind));
  assert.ok(kinds.has("broad") && kinds.has("pine") && kinds.has("column") && kinds.has("shrub"));
});
