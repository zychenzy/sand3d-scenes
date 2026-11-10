import assert from 'node:assert/strict';
import { existsSync, readFileSync, realpathSync } from 'node:fs';
import { test } from 'node:test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  BENCH,
  BOULDERS,
  CAMERAS,
  DECK,
  FIRE,
  LOGS,
  OUTCROP,
  PATH_KEYS,
  PINES,
  RANGES,
  SHELTER,
  SPUR_KEYS,
  benchFacing,
  deckWidthAt,
  grassClumps,
  heightAt,
  inDeck,
  inShelter,
  luminance,
  nearestPath,
  pineRecipe,
  reversalCount,
  segmentStats,
  shelterOpening,
  shelterOpenDir,
  stepStones,
} from '../site.js';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const layout = JSON.parse(readFileSync(path.join(root, 'layout.json'), 'utf8'));

function dotView(v) {
  return v.x * 0 + v.z * -1;
}

test('main trail climbs to the deck with safe steps and two switchbacks', () => {
  const rows = segmentStats(PATH_KEYS);
  let rise = 0;
  let run = 0;
  for (const row of rows) {
    rise += row.rise;
    run += row.run;
    assert.ok(row.rise >= -1e-6, `${row.from} descends`);
    if (row.kind === 'steps') {
      assert.ok(row.riser <= 0.165, `${row.from} riser ${row.riser.toFixed(3)}`);
      assert.ok(row.going >= 0.3, `${row.from} going ${row.going.toFixed(3)}`);
    } else {
      assert.ok(row.slope <= 0.18, `${row.from} grade ${row.slope.toFixed(3)}`);
    }
  }
  assert.ok(rise > 5, `rise ${rise.toFixed(2)}`);
  assert.ok(run > 18, `run ${run.toFixed(2)}`);
  assert.ok(reversalCount() >= 2, `reversals ${reversalCount()}`);
  const end = PATH_KEYS[PATH_KEYS.length - 1];
  assert.ok(Math.abs(end.y - DECK.y) < 0.03);
  assert.ok(Math.abs(end.x - DECK.cx) < 0.05);
  assert.ok(Math.abs(end.z - DECK.zRoot) < 0.05);
  const minWidth = Math.min(...PATH_KEYS.map((k) => k.width));
  assert.ok(minWidth >= 1.15, `narrow width ${minWidth}`);
  console.log(`trail rise ${rise.toFixed(2)} m over ${run.toFixed(2)} m, reversals ${reversalCount()}, segments ${rows.map((r) => r.kind).join(',')}`);
});

test('walking surface is cut into the terrain, not floating', () => {
  for (const key of [...PATH_KEYS, ...SPUR_KEYS]) {
    const h = heightAt(key.x, key.z);
    assert.ok(Math.abs(h - (key.y - 0.02)) < 0.08, `${key.id} terrain ${h.toFixed(3)} vs path ${key.y}`);
  }
  for (const stone of stepStones()) {
    if (stone.kind !== 'step') continue;
    assert.ok(stone.h + 0.01 >= stone.rise, `step thickness ${stone.h} < rise ${stone.rise}`);
  }
});

test('spur leaves the saddle and arrives outside the shelter opening', () => {
  const saddle = PATH_KEYS.find((k) => k.id === 'saddle');
  const start = SPUR_KEYS[0];
  assert.ok(Math.hypot(start.x - saddle.x, start.z - saddle.z) < 0.05);
  assert.equal(start.y, saddle.y);
  for (const row of segmentStats(SPUR_KEYS)) {
    assert.ok(Math.abs(row.slope) <= 0.2, `spur ${row.from} slope ${row.slope.toFixed(3)}`);
  }
  const end = SPUR_KEYS[SPUR_KEYS.length - 1];
  assert.equal(inShelter(end.x, end.z, 0.05), false);
  const opening = shelterOpening();
  const dist = Math.hypot(end.x - opening.x, end.z - opening.z);
  assert.ok(dist > 0.4 && dist < 1.45, `spur end ${dist.toFixed(2)} m from opening`);
  console.log(`shelter opening at ${opening.x.toFixed(2)}, ${opening.z.toFixed(2)}; spur stands ${dist.toFixed(2)} m out`);
});

test('deck cantilevers over the drop and the bench faces the peaks', () => {
  const tip = heightAt(DECK.cx, DECK.zTip);
  assert.ok(tip < DECK.y - 6, `tip ground ${tip.toFixed(2)} is not a drop`);
  assert.ok(DECK.zTip < DECK.zRoot - 6);
  assert.ok(deckWidthAt(DECK.zTip) > deckWidthAt(DECK.zRoot));
  assert.ok(inDeck(BENCH.position[0], BENCH.position[2], -0.35), 'bench hangs off the deck');
  const facing = benchFacing();
  assert.ok(dotView(facing) > 0.95, `bench facing ${facing.x.toFixed(3)}, ${facing.z.toFixed(3)}`);
  const half = deckWidthAt(BENCH.position[2]) / 2;
  assert.ok(half - BENCH.halfLength > 0.55, 'no side passage around the bench');
  const inst = layout.instances.find((i) => i.id === 'view_bench');
  assert.deepEqual(inst.position, BENCH.position);
  assert.ok(Math.abs(inst.rotationY - BENCH.rotationY) < 1e-9);
  assert.deepEqual(inst.scale, BENCH.scale);
  console.log(`cantilever drop ${(DECK.y - tip).toFixed(2)} m; bench facing dot ${dotView(facing).toFixed(3)}`);
});

test('shelter opens toward the view and stays off the trail', () => {
  const open = shelterOpenDir();
  assert.ok(dotView(open) > 0.7, `open dir ${open.x.toFixed(2)}, ${open.z.toFixed(2)}`);
  let minGap = Infinity;
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const p = {
        x: SHELTER.x + (sx * SHELTER.halfW * Math.cos(SHELTER.rotationY) + sz * SHELTER.halfD * Math.sin(SHELTER.rotationY)),
        z: SHELTER.z + (-sx * SHELTER.halfW * Math.sin(SHELTER.rotationY) + sz * SHELTER.halfD * Math.cos(SHELTER.rotationY)),
      };
      const n = nearestPath(p.x, p.z);
      minGap = Math.min(minGap, n.dist - n.half);
    }
  }
  assert.ok(minGap > 0.6, `shelter gap ${minGap.toFixed(2)}`);
  const pad = heightAt(SHELTER.x, SHELTER.z);
  assert.ok(Math.abs(pad - SHELTER.padY) < 0.2, `pad ${pad.toFixed(2)} vs ${SHELTER.padY}`);
  console.log(`shelter open-dot ${dotView(open).toFixed(3)}, trail gap ${minGap.toFixed(2)} m`);
});

test('outcrop, pines, boulders and fire leave the path clear', () => {
  const rock = nearestPath(OUTCROP.x, OUTCROP.z);
  const rockGap = rock.dist - rock.half - OUTCROP.radius;
  assert.ok(rockGap > 0.3, `outcrop overlap ${rockGap.toFixed(2)}`);
  for (const pine of PINES) {
    const n = nearestPath(pine.x, pine.z);
    assert.ok(n.dist - n.half > 0.9, `pine ${pine.seed} clearance ${n.dist - n.half}`);
    assert.equal(inDeck(pine.x, pine.z, 0.4), false);
    assert.equal(inShelter(pine.x, pine.z, 0.2), false);
  }
  for (const b of BOULDERS) {
    const n = nearestPath(b.x, b.z);
    assert.ok(n.dist - n.half > 0.8, `boulder ${b.x}`);
  }
  for (const log of LOGS) {
    const n = nearestPath(log.x, log.z);
    assert.ok(n.dist - n.half > 0.8, `log ${log.x}`);
  }
  assert.equal(inShelter(FIRE.x, FIRE.z, 0.1), false);
  const fire = nearestPath(FIRE.x, FIRE.z);
  assert.ok(fire.dist - fire.half > 0.45, 'fire ring blocks the path');
  console.log(`outcrop stays ${rockGap.toFixed(2)} m clear of the tread`);
});

test('pines are irregular and not repeated cones', () => {
  const heights = PINES.map((p) => p.h);
  const mean = heights.reduce((a, b) => a + b, 0) / heights.length;
  const sd = Math.sqrt(heights.map((h) => (h - mean) ** 2).reduce((a, b) => a + b, 0) / heights.length);
  assert.ok(sd > 1.2, `height sd ${sd.toFixed(2)}`);
  assert.ok(PINES.some((p) => p.kind === 'snag'));
  assert.ok(PINES.filter((p) => p.kind === 'krumm').length >= 2);
  for (const pine of PINES.filter((p) => p.kind === 'pine')) {
    const recipe = pineRecipe(pine);
    const tufts = recipe.branches.flatMap((b) => b.tufts);
    assert.ok(tufts.length >= 8, `${pine.seed} tufts ${tufts.length}`);
    assert.ok(new Set(tufts.map((t) => t.color)).size >= 2);
    const lens = recipe.branches.filter((b) => b.tufts.length).map((b) => b.len);
    const lmean = lens.reduce((a, b) => a + b, 0) / lens.length;
    const lsd = Math.sqrt(lens.map((l) => (l - lmean) ** 2).reduce((a, b) => a + b, 0) / lens.length);
    assert.ok(lsd > 0.12 * lmean, `${pine.seed} branch lengths too even`);
  }
  for (const krumm of PINES.filter((p) => p.kind === 'krumm')) {
    const ups = pineRecipe(krumm).branches.map((b) => b.up);
    assert.ok(Math.max(...ups) < 0.4, 'krummholz has a vertical leader');
  }
  const snag = pineRecipe(PINES.find((p) => p.kind === 'snag'));
  assert.ok(snag.branches.length >= 3);
  assert.ok(snag.branches.every((b) => b.tufts.length === 0));
  console.log(`pine heights sd ${sd.toFixed(2)} m across ${PINES.length} trees`);
});

test('grasses avoid the tread, deck, shelter and outcrop', () => {
  const clumps = grassClumps();
  const heather = clumps.filter((c) => c.type === 'heather');
  assert.ok(clumps.length >= 48, `only ${clumps.length} clumps`);
  assert.ok(heather.length >= 8, `only ${heather.length} heather`);
  for (const cl of clumps) {
    const n = nearestPath(cl.x, cl.z);
    assert.ok(n.dist > n.half + 0.35, `grass on path at ${cl.x.toFixed(2)},${cl.z.toFixed(2)}`);
    assert.equal(inDeck(cl.x, cl.z, 0.2), false);
    assert.equal(inShelter(cl.x, cl.z, 0.3), false);
    assert.ok(Math.hypot(cl.x - OUTCROP.x, cl.z - OUTCROP.z) > OUTCROP.radius);
  }
  console.log(`planted ${clumps.length} clumps, ${heather.length} heather`);
});

test('cameras see the site from safe viewpoints', () => {
  assert.deepEqual(layout.camera.position, CAMERAS.default.position);
  assert.deepEqual(layout.camera.target, CAMERAS.default.target);
  assert.equal(layout.camera.fov, CAMERAS.default.fov);
  assert.deepEqual(layout.cameraPresets.corner.position, CAMERAS.corner.position);
  assert.deepEqual(layout.cameraPresets.corner.target, CAMERAS.corner.target);
  assert.deepEqual(layout.cameraPresets.close.position, CAMERAS.close.position);
  assert.deepEqual(layout.cameraPresets.close.target, CAMERAS.close.target);

  const def = CAMERAS.default;
  assert.ok(def.target[2] < def.position[2], 'default camera looks away from the peaks');
  assert.ok(def.position[1] > heightAt(def.position[0], def.position[2]) + 2);

  const corner = CAMERAS.corner;
  assert.equal(inDeck(corner.position[0], corner.position[2]), false);
  assert.ok(corner.position[2] < 0, 'corner camera is still on the approach side');
  assert.ok(heightAt(corner.position[0], corner.position[2]) < DECK.y - 4, 'corner camera is not over the drop');
  assert.ok(corner.target[2] > corner.position[2], 'corner camera does not look back at the deck');
  assert.ok(corner.position[1] > heightAt(corner.position[0], corner.position[2]) + 1.5);

  const close = CAMERAS.close;
  assert.equal(inDeck(close.position[0], close.position[2]), true);
  const eye = close.position[1] - DECK.y;
  assert.ok(eye > 1.15 && eye < 1.75, `eye height ${eye.toFixed(2)}`);
  assert.ok(close.target[2] < close.position[2]);
  console.log(`close eye height ${eye.toFixed(2)} m above the deck`);
});

test('peak ranges step back and get lighter', () => {
  for (let i = 1; i < RANGES.length; i++) {
    assert.ok(RANGES[i].z < RANGES[i - 1].z);
    assert.ok(luminance(RANGES[i].shade) > luminance(RANGES[i - 1].shade));
  }
  const notch = RANGES[0].peaks.reduce((a, b) => (a.h < b.h ? a : b));
  const dominant = RANGES[1].peaks.reduce((a, b) => (a.h > b.h ? a : b));
  assert.ok(Math.abs(notch.x) < 2, 'near ridge has no notch on the view axis');
  assert.ok(Math.abs(dominant.x) < 2, 'far dominant peak is off the view axis');
  assert.ok(dominant.h > notch.h + 6);
});

test('reused bench glb and vendored three resolve', () => {
  const glb = path.join(root, 'assets/museum_bench__0025f9484fc6.glb');
  assert.ok(existsSync(glb));
  const resolved = realpathSync(glb);
  assert.ok(resolved.includes(`${path.sep}museum${path.sep}assets${path.sep}`));
  const threePath = realpathSync(path.join(root, 'vendor/three.module.js'));
  assert.ok(threePath.includes(`${path.sep}greenhouse${path.sep}vendor${path.sep}`));
  const head = readFileSync(threePath, 'utf8').slice(0, 200);
  assert.match(head, /REVISION = '170'/);
  const html = readFileSync(path.join(root, 'index.html'), 'utf8');
  assert.match(html, /btn-unlit/);
  assert.match(html, /three\.module\.js/);
  assert.match(html, /mountain\.js/);
});
