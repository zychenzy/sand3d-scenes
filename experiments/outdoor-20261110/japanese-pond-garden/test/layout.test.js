import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  POND, WATER_Y, BRIDGE, BENCH, SHELTER, LANTERN, PLANTS, REEDS, IRIS, MOSS, FERNS, BAMBOO,
  KOI, BOULDERS, PATH_MAIN, PATH_TEA, PATH_STONES, STONE_LOOP,
  shoelace, pondBBox, pondSDF, pondDepth, pondCentroid, terrainHeight,
  bridgeSpan, bridgeAxis, bridgePoint, bridgeMid, pileSpec,
  steppingStones, stonePlacement, shoreRocks, abutmentRocks, pebbles,
  pathSamples, yawToFace, forwardXZ, benchYaw, lanternHeight,
  minDistToPolyline,
} from '../garden_geom.js';

const layout = JSON.parse(readFileSync(join(dirname(fileURLToPath(import.meta.url)), '../layout.json'), 'utf8'));

function segmentsIntersect(a, b, c, d) {
  const cross = (ax, az, bx, bz) => ax * bz - az * bx;
  const r = [b[0] - a[0], b[1] - a[1]];
  const s = [d[0] - c[0], d[1] - c[1]];
  const den = cross(r[0], r[1], s[0], s[1]);
  if (Math.abs(den) < 1e-9) return false;
  const q = [c[0] - a[0], c[1] - a[1]];
  const t = cross(q[0], q[1], s[0], s[1]) / den;
  const u = cross(q[0], q[1], r[0], r[1]) / den;
  return t > 0.02 && t < 0.98 && u > 0.02 && u < 0.98;
}

test('pond is a simple irregular basin, not a rectangle', () => {
  assert.ok(POND.length >= 12);
  assert.ok(shoelace() > 0, 'pond ring is counter-clockwise');
  let hits = 0;
  for (let i = 0; i < POND.length; i++) {
    for (let j = i + 1; j < POND.length; j++) {
      if ((j + 1) % POND.length === i || (i + 1) % POND.length === j) continue;
      const a = POND[i];
      const b = POND[(i + 1) % POND.length];
      const c = POND[j];
      const d = POND[(j + 1) % POND.length];
      if (segmentsIntersect(a, b, c, d)) hits += 1;
    }
  }
  assert.equal(hits, 0);
  const box = pondBBox();
  const ratio = shoelace() / (box.width * box.depth);
  assert.ok(ratio < 0.78 && ratio > 0.45, `compactness ${ratio}`);
  let axisAligned = 0;
  for (let i = 0; i < POND.length; i++) {
    const a = POND[i];
    const b = POND[(i + 1) % POND.length];
    const dx = Math.abs(b[0] - a[0]);
    const dz = Math.abs(b[1] - a[1]);
    if (Math.min(dx, dz) < 0.04 * Math.hypot(dx, dz)) axisAligned += 1;
  }
  assert.equal(axisAligned, 0);
  const c = pondCentroid();
  assert.ok(pondSDF(c.x, c.z) < -0.8, 'centroid sits in open water');
});

test('terrain is contoured and the pond is cut below the waterline', () => {
  const outside = [];
  for (let x = -12; x <= 12; x += 1) {
    for (let z = -12; z <= 10; z += 1) {
      if (pondSDF(x, z) < 0) {
        assert.ok(terrainHeight(x, z) < WATER_Y + 0.001, `basin floor at ${x},${z}`);
      } else {
        outside.push(terrainHeight(x, z));
      }
    }
  }
  const min = Math.min(...outside);
  const max = Math.max(...outside);
  const mean = outside.reduce((a, b) => a + b, 0) / outside.length;
  const sd = Math.sqrt(outside.reduce((a, b) => a + (b - mean) ** 2, 0) / outside.length);
  assert.ok(max - min > 0.7, `relief ${max - min}`);
  assert.ok(sd > 0.08, `terrain sd ${sd}`);
  assert.equal(layout.meta.room, undefined);
});

test('arched timber bridge crosses open water and lands on the banks', () => {
  const span = bridgeSpan();
  assert.ok(span > 5.5 && span < 9, `span ${span}`);
  const ratio = BRIDGE.rise / span;
  assert.ok(ratio > 0.12 && ratio < 0.24, `rise/span ${ratio}`);
  assert.ok(BRIDGE.width > 1.05 && BRIDGE.width < 1.7);
  assert.ok(BRIDGE.railH > 0.75 && BRIDGE.railH < 1.05);
  const ends = [bridgePoint(0), bridgePoint(1)];
  for (const p of ends) {
    assert.ok(pondSDF(p.x, p.z) > 0.45, `end still in water ${p.x},${p.z}`);
    assert.ok(Math.abs(terrainHeight(p.x, p.z) - BRIDGE.padY) < 0.02);
    assert.ok(Math.abs(p.y - terrainHeight(p.x, p.z)) < 0.12, 'deck meets the bank');
  }
  const mid = bridgeMid();
  assert.ok(pondSDF(mid.x, mid.z) < -1.2);
  assert.ok(mid.y > ends[0].y + 0.9, 'crown is visibly higher than the banks');
  const pile = pileSpec();
  assert.ok(pondSDF(pile.x, pile.z) < -1);
  assert.ok(pile.top < mid.y - 0.05 && pile.bottom < WATER_Y);
});

test('tea bench faces the bridge at seat height and the roof covers it', () => {
  assert.ok(pondSDF(BENCH.x, BENCH.z) > 1);
  assert.ok(BENCH.seatH > 0.38 && BENCH.seatH < 0.5);
  assert.ok(SHELTER.w > BENCH.seatL && SHELTER.d > BENCH.seatD);
  assert.ok(SHELTER.h > 1.8 && SHELTER.h < 2.4);
  assert.ok(SHELTER.post < 0.1, 'posts stay slim');
  const yaw = benchYaw();
  const [fx, fz] = forwardXZ(yaw);
  const m = bridgeMid();
  const dx = m.x - BENCH.x;
  const dz = m.z - BENCH.z;
  const dot = (fx * dx + fz * dz) / Math.hypot(dx, dz);
  assert.ok(dot > 0.85, `bench looks at the bridge (${dot})`);
  const known = yawToFace(0, 0, -1, 0);
  const [kx, kz] = forwardXZ(known);
  assert.ok(Math.abs(kx + 1) < 1e-6 && Math.abs(kz) < 1e-6);
});

test('stepping stones form a closed stride loop that enters the water', () => {
  assert.deepEqual(STONE_LOOP[0], STONE_LOOP[STONE_LOOP.length - 1]);
  const stones = steppingStones();
  assert.ok(stones.length >= 10 && stones.length <= 20);
  const water = stones.filter((s) => pondSDF(s.x, s.z) < -0.05);
  const land = stones.filter((s) => pondSDF(s.x, s.z) > 0.2);
  assert.ok(water.length >= 3, `water stones ${water.length}`);
  assert.ok(land.length >= 4, `land stones ${land.length}`);
  for (let i = 0; i < stones.length; i++) {
    const a = stones[i];
    const b = stones[(i + 1) % stones.length];
    const d = Math.hypot(a.x - b.x, a.z - b.z);
    assert.ok(d > 0.7 && d < 1.35, `stride ${i} is ${d}`);
    assert.ok(d - a.rx - b.rx > -0.02, `stones ${i} overlap`);
    const place = stonePlacement(a);
    if (place.inWater) {
      assert.ok(place.top > 0.08 && place.top < 0.32);
      assert.ok(place.y < WATER_Y + 0.02);
    } else {
      const ground = terrainHeight(a.x, a.z);
      assert.ok(Math.abs(place.y - (ground - a.thickness * 0.32)) < 1e-6);
      assert.ok(place.top > ground && place.y < ground);
    }
  }
});

test('shore rocks follow the bank and abutments leave a walking gap', () => {
  const rocks = shoreRocks();
  assert.ok(rocks.length >= 12 && rocks.length <= 40);
  const radial = rocks.map((r) => Math.hypot(r.x - pondCentroid().x, r.z - pondCentroid().z));
  const mean = radial.reduce((a, b) => a + b, 0) / radial.length;
  const sd = Math.sqrt(radial.reduce((a, b) => a + (b - mean) ** 2, 0) / radial.length);
  assert.ok(sd > 0.35, 'rocks are not parked on a circle');
  assert.ok(rocks.filter((r) => pondSDF(r.x, r.z) < 0).length >= 3);
  for (const r of rocks) assert.ok(Math.abs(pondSDF(r.x, r.z)) < 1.2);
  for (const name of ['west', 'east']) {
    const pt = BRIDGE[name];
    const own = abutmentRocks().filter((r) => r.role === name);
    assert.ok(own.length >= 3, `${name} abutment rocks ${own.length}`);
    for (const r of own) {
      const d = Math.hypot(r.x - pt[0], r.z - pt[1]);
      assert.ok(d > 0.55 && d < 1.7, `${name} rock distance ${d}`);
    }
  }
});

test('lantern is a human-scale shore object clear of the path', () => {
  const sdf = pondSDF(LANTERN.x, LANTERN.z);
  assert.ok(sdf > 0.35 && sdf < 2.3, `lantern sdf ${sdf}`);
  let bridgeClear = Infinity;
  for (let t = 0; t <= 1; t += 0.02) {
    const p = bridgePoint(t);
    bridgeClear = Math.min(bridgeClear, Math.hypot(p.x - LANTERN.x, p.z - LANTERN.z));
  }
  assert.ok(bridgeClear > BRIDGE.width / 2 + LANTERN.base[0] / 2 + 0.4, `lantern hits the bridge (${bridgeClear})`);
  const h = lanternHeight();
  assert.ok(h > 0.95 && h < 1.4, `lantern height ${h}`);
  assert.ok(minDistToPolyline(LANTERN.x, LANTERN.z, PATH_MAIN) > 0.7);
  let clear = Infinity;
  for (const r of [...shoreRocks(), ...abutmentRocks()]) {
    clear = Math.min(clear, Math.hypot(r.x - LANTERN.x, r.z - LANTERN.z) - r.radius - LANTERN.base[0] / 2);
  }
  assert.ok(clear > 0.15, `lantern/rock gap ${clear}`);
});

test('planting is mixed, rooted, and not a grid of identical trees', () => {
  const kinds = new Set(PLANTS.map((p) => p.kind));
  for (const kind of ['maple', 'pine', 'willow']) assert.ok(kinds.has(kind));
  assert.ok(REEDS.length >= 5 && IRIS.length >= 3 && MOSS.length >= 5 && FERNS.length >= 3 && BAMBOO.length >= 2);
  const maples = PLANTS.filter((p) => p.kind === 'maple');
  const heights = maples.map((p) => p.h);
  assert.ok(Math.max(...heights) - Math.min(...heights) > 1.5);
  const palettes = new Set(maples.map((p) => p.palette));
  assert.ok(palettes.size >= 3);
  for (const p of PLANTS) assert.ok(pondSDF(p.x, p.z) > 0.8, `${p.id} in the water`);
  for (const r of REEDS) assert.ok(Math.abs(pondSDF(r.x, r.z)) < 1, 'reeds leave the shore');
  for (const patch of MOSS) assert.ok(pondSDF(patch.x, patch.z) > 0.2);
  const xs = PLANTS.map((p) => p.x);
  const mean = xs.reduce((a, b) => a + b, 0) / xs.length;
  const varX = xs.reduce((a, b) => a + (b - mean) ** 2, 0) / xs.length;
  assert.ok(varX > 4, 'trees are spread across the site');
});

test('gravel paths reach the bridge and the bench without entering the pond', () => {
  for (const [name, pts] of [['main', PATH_MAIN], ['tea', PATH_TEA], ['stones', PATH_STONES]]) {
    for (const [x, z] of pathSamples(pts, 0.2)) {
      assert.ok(pondSDF(x, z) > 0.08, `${name} enters water at ${x},${z}`);
    }
  }
  const end = PATH_MAIN[PATH_MAIN.length - 1];
  assert.ok(Math.hypot(end[0] - BRIDGE.west[0], end[1] - BRIDGE.west[1]) < 0.05);
  const tea = PATH_TEA[PATH_TEA.length - 1];
  assert.ok(Math.hypot(tea[0] - BENCH.x, tea[1] - BENCH.z) < 0.8);
  const spur = PATH_STONES[PATH_STONES.length - 1];
  const nearStone = Math.min(...steppingStones().map((s) => Math.hypot(s.x - spur[0], s.z - spur[1])));
  assert.ok(nearStone < 0.7);
});

test('koi and the mid-pond rock sit in visible water clear of the deck', () => {
  const axis = bridgeAxis();
  for (const k of KOI) {
    assert.ok(pondSDF(k.x, k.z) < -0.4);
    const depth = pondDepth(k.x, k.z);
    assert.ok(depth > 0.12 && depth < 0.5, `${k.kind} depth ${depth}`);
    assert.ok(k.len > 0.35 && k.len < 0.85);
    let best = Infinity;
    for (let t = 0; t <= 1; t += 0.05) {
      const p = bridgePoint(t);
      best = Math.min(best, Math.hypot(p.x - k.x, p.z - k.z));
    }
    assert.ok(best > 0.7, 'koi under the bridge');
    assert.ok(Math.abs(axis.x) + Math.abs(axis.z) > 0);
  }
  const island = BOULDERS.find((b) => b.id === 'island');
  assert.ok(pondSDF(island.x, island.z) < -0.8);
  assert.ok(Math.hypot(island.x - bridgeMid().x, island.z - bridgeMid().z) > 1.2);
});

test('pebbles stay in the shallows', () => {
  const bed = pebbles();
  assert.ok(bed.length >= 12);
  for (const p of bed) {
    const depth = pondDepth(p.x, p.z);
    assert.ok(depth >= 0.07 && depth <= 0.26);
  }
});

test('cameras are side-on to the arch, with a real corner and a low close view', () => {
  const cam = layout.camera;
  const corner = layout.cameraPresets.corner;
  const close = layout.cameraPresets.close;
  const mid = bridgeMid();
  const view = [mid.x - cam.position[0], mid.z - cam.position[2]];
  const vlen = Math.hypot(view[0], view[1]);
  const axis = bridgeAxis();
  const side = Math.abs((view[0] / vlen) * axis.x + (view[1] / vlen) * axis.z);
  assert.ok(side < 0.55, `default view is end-on (${side})`);
  assert.ok(cam.position[2] > mid.z + 6, 'default camera sits on the near bank');
  assert.ok(Math.hypot(cam.target[0] - mid.x, cam.target[2] - mid.z) < 3);
  assert.ok(cam.position[1] > terrainHeight(cam.position[0], cam.position[2]) + 1.5);
  const cView = [corner.target[0] - corner.position[0], corner.target[2] - corner.position[2]];
  const clen = Math.hypot(cView[0], cView[1]);
  const align = (view[0] / vlen) * (cView[0] / clen) + (view[1] / vlen) * (cView[1] / clen);
  assert.ok(align < 0.85, 'corner repeats the default view');
  assert.ok(Math.hypot(corner.position[0] - cam.position[0], corner.position[2] - cam.position[2]) > 6);
  const closeDist = Math.hypot(close.position[0] - LANTERN.x, close.position[2] - LANTERN.z);
  assert.ok(closeDist < 3.2, `close camera misses the lantern (${closeDist})`);
  assert.ok(close.position[1] < 2.1 && close.position[1] > 1.1);
  assert.ok(close.position[1] > terrainHeight(close.position[0], close.position[2]) + 0.6);
  assert.equal(layout.lights.points, undefined);
});
