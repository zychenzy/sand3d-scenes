import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import * as THREE from '../vendor/three.module.js';
import {
  backSlopeY,
  centroid,
  channelLoop,
  distToPoly,
  offsetPoly,
  pointInPoly,
  rimRocks,
  segmentSlopes,
  signedArea,
  terracePlan,
} from '../geom.mjs';
import { layFlat, planarGeometry } from '../mesh_plan.js';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const layout = JSON.parse(readFileSync(join(root, 'layout.json'), 'utf8'));
const pool = layout.pool.polygon;

assert.ok(signedArea(pool) > 12 && signedArea(pool) < 22, 'pool area');
const [cx, cz] = centroid(pool);
assert.ok(pointInPoly(cx, cz, pool), 'centroid inside');

const grown = offsetPoly(pool, layout.pool.paveGap);
assert.ok(signedArea(grown) > signedArea(pool), 'offset grows the pool');
assert.ok(pointInPoly(cx, cz, grown), 'offset still contains the center');
for (const p of pool) {
  assert.ok(distToPoly(p[0], p[1], grown) > layout.pool.paveGap * 0.4, 'offset clears the original edge');
}

const slopes = segmentSlopes(layout.drainage.points);
assert.ok(slopes.every((s) => s.drop > 0), 'drainage drops');
assert.ok(slopes.slice(0, -1).every((s) => s.slope > 0.02 && s.slope < 0.12), 'swale grade');
assert.ok(slopes.at(-1).slope > 0.3, 'cascade');

const plan = terracePlan(layout);
assert.equal(plan.holes.length, 2);
assert.ok(pointInPoly(cx, cz, plan.holes[0]), 'pool hole contains water');
assert.ok(!pointInPoly(cx, cz, plan.holes[1]), 'channel does not swallow the pool');
const cut = layout.drainage.points.slice(layout.drainage.cutFrom, layout.drainage.cutTo);
const mid = cut[Math.floor(cut.length / 2)];
assert.ok(pointInPoly(mid[0], mid[2], plan.holes[1]), 'channel center is cut from the paving');
const channelArea = Math.abs(signedArea(channelLoop(cut, layout.drainage.halfWidth)));
assert.ok(channelArea > 1.2 && channelArea < 6, `channel area ${channelArea}`);

const rocks = rimRocks(pool, {
  seed: layout.rockSeed,
  spillEdge: layout.pool.spillEdge,
  entryEdge: layout.pool.entryEdge,
});
assert.ok(rocks.length >= 24 && rocks.length <= 70, `rim rocks ${rocks.length}`);
assert.ok(Math.max(...rocks.map((r) => r.sy)) < 0.95, 'rim rocks stay below eye line');
const spill = pool[layout.pool.spillEdge];
const spillB = pool[(layout.pool.spillEdge + 1) % pool.length];
const smx = (spill[0] + spillB[0]) / 2;
const smz = (spill[1] + spillB[1]) / 2;
const spillGap = Math.min(...rocks.map((r) => Math.hypot(r.x - smx, r.z - smz)));
assert.ok(spillGap > 0.25, `spill notch ${spillGap}`);

assert.equal(backSlopeY(-1), 0);
assert.ok(backSlopeY(-8.2) > 2);

const geo = layFlat(planarGeometry(plan.outer, plan.holes), 0);
const normals = geo.attributes.normal;
let sum = 0;
for (let i = 0; i < normals.count; i++) sum += normals.getY(i);
assert.ok(sum / normals.count > 0.5, `terrace faces up (${sum / normals.count})`);
assert.ok(geo.attributes.position.count > 12, 'terrace has a hole triangulation');

const water = layFlat(planarGeometry(pool), layout.pool.waterY);
const wp = water.attributes.position;
let minY = Infinity;
let maxY = -Infinity;
for (let i = 0; i < wp.count; i++) {
  minY = Math.min(minY, wp.getY(i));
  maxY = Math.max(maxY, wp.getY(i));
}
assert.ok(Math.abs(minY - layout.pool.waterY) < 1e-6, 'water plane sits at waterY');
assert.ok(maxY < layout.pool.lipY, 'water is below the lip');

void THREE;
console.log('geom checks passed');
