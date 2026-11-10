import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { SITE, buildSite, measureSite, pointOnDeck } from '../geometry.mjs';

const dir = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const layout = JSON.parse(fs.readFileSync(path.join(dir, 'layout.json'), 'utf8'));

test('site is an L quay around an open basin', () => {
  assert.equal(pointOnDeck(0, -3), true);
  assert.equal(pointOnDeck(-10.4, 4.2), true);
  assert.equal(pointOnDeck(0, 2), false);
  assert.equal(pointOnDeck(-4, 1.2), false);
  assert.ok(SITE.quayX1 > SITE.wallX);
  assert.ok(SITE.quayZ1 > SITE.wallZ);
  assert.ok(SITE.deckY > 1 && SITE.deckY < 1.6);
  assert.ok(SITE.terraceY > SITE.deckY + 0.3);
  assert.ok(SITE.laneY > SITE.terraceY);
});

test('hulls are boats, not boxes, and they differ', () => {
  const group = buildSite();
  const m = measureSite(group);
  assert.equal(m.boats.length, 2);
  const [a, b] = [...m.boats].sort((p, q) => q.length - p.length);
  for (const boat of m.boats) {
    assert.ok(boat.verts > 80, `${boat.name} hull is too simple`);
    assert.ok(boat.length / boat.beam > 2.4, `${boat.name} length/beam ${boat.length / boat.beam}`);
    assert.ok(boat.length / boat.height > 3.2, `${boat.name} length/height`);
    assert.ok(boat.profile.bowBeam < boat.profile.midBeam * 0.35, `${boat.name} bow is not finer than midships`);
    assert.ok(boat.minY < -0.15, `${boat.name} has no draft`);
    assert.ok(boat.maxY > 0.4, `${boat.name} sheer is below the waterline`);
    assert.equal(boat.hitsDeck, false, `${boat.name} hull sits on the quay`);
  }
  assert.ok(a.length - b.length > 1.4);
  assert.ok(m.found.cabin && m.found.cuddy, 'the two boats need different superstructures');
  const dr = a.color.r - b.color.r;
  const dg = a.color.g - b.color.g;
  const db = a.color.b - b.color.b;
  assert.ok(Math.hypot(dr, dg, db) > 0.08, 'hull colours are too similar');
  assert.equal(m.boatsOverlap, false);
});

test('water is a displaced coloured surface, not a flat blue floor', () => {
  const m = measureSite(buildSite());
  assert.ok(m.water, 'missing basin');
  assert.equal(m.water.isBox, false);
  assert.ok(m.water.verts > 400);
  assert.ok(m.water.yRange > 0.03, `wave height ${m.water.yRange}`);
  assert.ok(m.water.yRange < 0.2, 'water is too rough for a calm morning');
  assert.ok(m.water.spread > 0.04, 'water colour does not vary');
  assert.ok(m.water.mean.g > m.water.mean.b * 0.45, 'water reads as pure blue');
  assert.ok(m.found['water-foam']);
  assert.ok(m.found.algae);
  assert.ok(m.found['tide-stain']);
});

test('ladders reach the water, and the working places are present', () => {
  const m = measureSite(buildSite());
  assert.ok(m.ladders.length >= 3);
  for (const ladder of m.ladders) {
    assert.ok(ladder.minY < 0, ladder.name);
    assert.ok(ladder.maxY > SITE.deckY, ladder.name);
  }
  for (const name of ['quay-deck', 'slipway', 'shed', 'cafe', 'terrace', 'lane', 'net', 'rope-coil', 'buoy-cluster', 'boat-a', 'boat-b', 'capstan']) {
    assert.ok(m.found[name], `missing ${name}`);
  }
  assert.ok(m.ropes >= 4);
});

test('bench faces the water and cafe chairs face the table and the harbour', () => {
  const byId = Object.fromEntries(layout.instances.map((i) => [i.id, i]));
  const bench = byId['public-bench'];
  const table = byId['cafe-table'];
  const chairs = [byId['cafe-chair-a'], byId['cafe-chair-b']];
  assert.ok(Math.abs(Math.abs(bench.rotationY) - Math.PI / 2) < 0.05);
  assert.equal(bench.position[1], SITE.deckY);
  assert.ok(pointOnDeck(bench.position[0], bench.position[2]));
  assert.equal(table.position[1], SITE.terraceY);
  for (const chair of chairs) {
    assert.equal(chair.position[1], SITE.terraceY);
    assert.ok(chair.position[2] < table.position[2], 'chair should sit inland of the table');
    assert.ok(Math.abs(chair.rotationY) < 0.4, 'chair rotation 0 faces +Z, toward the table and the water');
  }
  assert.ok(byId['mug-a'].position[1] > table.position[1] + 0.6);
  assert.equal(byId['cafe-pot'].position[1], SITE.terraceY);
});

test('cameras frame the whole quay, a corner and a close detail', () => {
  assert.ok(layout.camera.position[1] > 6);
  assert.ok(layout.cameraPresets.corner.position[1] < 4);
  assert.ok(layout.cameraPresets.corner.position[0] > layout.cameraPresets.corner.target[0]);
  assert.ok(layout.cameraPresets.close.position[1] < 2.4);
  const close = layout.cameraPresets.close;
  const dist = Math.hypot(
    close.position[0] - close.target[0],
    close.position[1] - close.target[1],
    close.position[2] - close.target[2],
  );
  assert.ok(dist < 8 && dist > 2);
});

test('reused GLBs resolve from the scene directory', () => {
  for (const spec of Object.values(layout.assets)) {
    const file = path.resolve(dir, spec.glb);
    assert.ok(fs.existsSync(file), file);
  }
});
