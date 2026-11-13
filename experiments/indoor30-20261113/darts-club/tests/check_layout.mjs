import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  SPEC,
  plan,
  isDarkSector,
  diagonalExact,
  doubleInner,
  trebleInner,
  facingXZ,
  circleHitsAabb,
  sightClears,
} from "../darts_spec.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const layout = JSON.parse(readFileSync(resolve(root, "layout.json"), "utf8"));
const p = plan(layout.meta.room);
const byId = Object.fromEntries(layout.instances.map((i) => [i.id, i]));

function near(a, b, eps = 1e-3) {
  assert.ok(Math.abs(a - b) <= eps, `${a} !~ ${b}`);
}

test("regulation board and oche numbers", () => {
  const d = layout.meta.darts;
  near(d.bullHeight, 1.73);
  near(d.throwDistance, 2.37);
  near(d.diagonalPublished, 2.93);
  near(d.boardDiameter, 0.451);
  near(d.doubleOuter, 0.17);
  near(d.trebleOuter, 0.1074);
  near(d.ringWidth, 0.008);
  near(d.innerBullDiameter, 0.0127);
  near(d.outerBullDiameter, 0.0318);
  near(d.ocheHeight, 0.038);
  near(d.ocheLength, 0.61);
  near(doubleInner(), 0.162);
  near(trebleInner(), 0.0994);
  near(diagonalExact(), Math.hypot(2.37, 1.73));
  assert.ok(Math.abs(diagonalExact() - 2.93) < 0.005);
  assert.equal(SPEC.numbers[0], 20);
  assert.equal(isDarkSector(0), true);
  assert.equal(isDarkSector(1), false);
  assert.equal(SPEC.numbers.length, 20);
});

test("built anchors match the plan", () => {
  const d = layout.meta.darts;
  near(d.boardFaceZ, p.boardFaceZ);
  near(d.ocheBackZ, p.ocheBackZ);
  near(d.ocheBackZ - d.boardFaceZ, 2.37);
  assert.deepEqual(d.laneCenters, p.centers);
  assert.equal(p.centers.length, 4);
  for (let i = 1; i < p.centers.length; i += 1) {
    assert.ok(p.centers[i] - p.centers[i - 1] >= SPEC.corridorHalf * 2);
  }
});

test("throw corridors stay clear of seats, table, and stands", () => {
  const floor = [
    ...p.stools.map((s) => ({ ...s, r: SPEC.stoolRadius })),
    ...p.chairs.map((c) => ({ ...c, r: SPEC.chairRadius })),
    { id: "high_table", x: p.table.x, z: p.table.z, r: p.table.half },
    ...p.stands.map((s) => ({ ...s, r: Math.hypot(SPEC.standHalfX, SPEC.standHalfZ) })),
    { ...p.shelf, r: 0.4 },
  ];
  for (const item of floor) {
    for (const box of p.boxes) {
      assert.equal(
        circleHitsAabb(item.x, item.z, item.r, box),
        false,
        `${item.id} intersects lane ${box.x}`,
      );
    }
  }
});

test("each lane has a clear throw and a walk behind the oche", () => {
  for (const box of p.boxes) {
    const horiz = p.ocheBackZ - p.boardFaceZ;
    near(horiz, SPEC.throwDistance);
    assert.ok(box.minZ <= p.boardFaceZ + 0.001);
    assert.ok(box.maxZ >= p.ocheBackZ + SPEC.playerDepth - 0.001);
    const walkZ = p.throwEndZ + 0.35;
    assert.equal(circleHitsAabb(box.x, walkZ, 0.2, box), false);
  }
  const walkZ = p.throwEndZ + 0.35;
  assert.ok(walkZ < p.table.z - p.table.half);
  assert.ok(p.chairs.every((c) => c.z > p.throwEndZ || c.x < p.boxes[0].minX - 0.4));
});

test("stools face the high table and spectator chairs face the lanes", () => {
  for (const stool of p.stools) {
    const face = facingXZ(stool.rotationY);
    const dx = p.table.x - stool.x;
    const dz = p.table.z - stool.z;
    const len = Math.hypot(dx, dz);
    const dot = (face.x * dx + face.z * dz) / len;
    assert.ok(dot > 0.95, `${stool.id} faces away from the table (${dot})`);
  }
  for (const chair of p.chairs) {
    const face = facingXZ(chair.rotationY);
    assert.ok(face.x > 0.95, `${chair.id} should face +X toward the lanes`);
    assert.ok(chair.x < p.boxes[0].minX, `${chair.id} is inside a lane`);
  }
});

test("default and corner views are not blocked by the table", () => {
  for (const key of ["default", "corner", "close"]) {
    const cam = p.camera[key];
    const clear = sightClears(
      cam.position[0], cam.position[1], cam.position[2],
      cam.target[0], cam.target[1], cam.target[2],
      p.table.x, p.table.z, p.table.half + 0.05, p.table.top,
    );
    assert.equal(clear, true, `${key} camera is blocked by the high table`);
  }
  assert.deepEqual(layout.camera.position, p.camera.default.position);
  assert.deepEqual(layout.camera.target, p.camera.default.target);
  for (const key of ["default", "corner", "close"]) {
    assert.deepEqual(layout.cameraPresets[key].position, p.camera[key].position);
    assert.deepEqual(layout.cameraPresets[key].target, p.camera[key].target);
  }
  assert.deepEqual(layout.cameraPresets.close, layout.cameraPresets.detail);
  for (const chair of p.chairs) {
    const inst = byId[chair.id];
    near(inst.position[0], chair.x);
    near(inst.position[2], chair.z);
  }
  near(byId.lamp.position[0], p.lamp.x);
  near(byId.lamp.position[2], p.lamp.z);
  near(byId.pend_a.position[1], p.pendants[0].y);
  near(byId.pend_b.position[1], p.pendants[1].y);
});

test("layout instances follow the plan and stay off the shared catalog copies", () => {
  const table = byId.high_table;
  near(table.position[0], p.table.x);
  near(table.position[2], p.table.z);
  assert.equal(table.kind, "square_table");
  for (const stool of p.stools) {
    const inst = byId[stool.id];
    near(inst.position[0], stool.x);
    near(inst.position[2], stool.z);
    near(inst.rotationY, stool.rotationY);
    assert.equal(inst.kind, "bar_stool");
  }
  for (const chair of p.chairs) {
    const inst = byId[chair.id];
    near(inst.rotationY, chair.rotationY, 1e-4);
    assert.equal(inst.kind, "dining_chair");
  }
  for (const mug of p.mugs) {
    const inst = byId[mug.id];
    near(inst.position[1], p.table.top);
    assert.ok(Math.hypot(inst.position[0] - p.table.x, inst.position[2] - p.table.z) < p.table.half);
  }
  near(byId.lamp.position[1], p.table.top);
  assert.ok(layout.lights.spots.length === 4);
  layout.lights.spots.forEach((spot, i) => {
    near(spot.target[0], p.centers[i]);
    near(spot.target[1], 1.73);
    near(spot.target[2], p.boardFaceZ);
  });
  const kinds = new Set(layout.instances.map((i) => i.kind));
  assert.equal(kinds.has("pool_table"), false);
  assert.equal(kinds.has("bar_counter"), false);
  for (const spec of Object.values(layout.assets)) {
    assert.ok(spec.glb.startsWith("../../../"), spec.glb);
    const abs = resolve(root, spec.glb);
    assert.equal(existsSync(abs), true, spec.glb);
    assert.equal(abs.includes(`${root}/assets`), false);
  }
  const html = readFileSync(resolve(root, "index.html"), "utf8");
  assert.match(html, /cafe\/vendor\/three\.module\.js/);
  assert.equal(existsSync(resolve(root, "vendor")), false);
  assert.equal(existsSync(resolve(root, "assets")), false);
});
