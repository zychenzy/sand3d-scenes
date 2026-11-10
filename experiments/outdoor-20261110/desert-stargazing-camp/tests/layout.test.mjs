import test from 'node:test';
import assert from 'node:assert/strict';
import * as site from '../site.mjs';
import layout from '../layout.json' with { type: 'json' };

function lum(rgb) {
  return 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
}

function dot(a, b) {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

function norm2(x, z) {
  const l = Math.hypot(x, z) || 1;
  return [x / l, z / l];
}

function dist3(a, b) {
  return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
}

test('terrain is sculpted, not a flat beige floor', () => {
  const stats = site.terrainStats(1);
  assert.ok(stats.range > 0.9, `height range ${stats.range}`);
  assert.ok(stats.min >= 0.03, `terrain dug below the plain (${stats.min})`);
  assert.ok(stats.colorBuckets >= 5, `only ${stats.colorBuckets} sand colors`);
  const crest = lum(site.colorAt(-5.6, 3.6));
  const wash = lum(site.colorAt(0.2, 2.1));
  assert.ok(crest > wash + 0.04, `crest ${crest} should read lighter than the wash ${wash}`);
});

test('rug pad is level enough for seating', () => {
  const pad = site.padFlatness();
  assert.ok(pad.n > 20);
  assert.ok(pad.stdev < 0.01, `pad stdev ${pad.stdev}`);
});

test('cushions face the tea table and stay on the rug', () => {
  const table = site.tablePoint();
  const seats = site.cushions();
  assert.equal(seats.length, 5);
  for (const seat of seats) {
    assert.ok(site.onRug(seat.x, seat.z), seat.id);
    const face = [Math.sin(seat.yaw), Math.cos(seat.yaw)];
    const to = norm2(table.x - seat.x, table.z - seat.z);
    const align = face[0] * to[0] + face[1] * to[1];
    assert.ok(align > 0.75, `${seat.id} faces away from the table (${align})`);
  }
  for (let i = 0; i < seats.length; i++) {
    for (let j = i + 1; j < seats.length; j++) {
      const d = Math.hypot(seats[i].x - seats[j].x, seats[i].z - seats[j].z);
      assert.ok(d > 0.55, 'cushions overlap');
    }
  }
});

test('telescope is a tilted tube on a three-leg tripod', () => {
  const { parts } = site.telescopeParts();
  const count = (name) => parts.filter((p) => p.name === name).length;
  assert.equal(count('tripod-leg'), 3);
  assert.equal(count('spreader-rod'), 3);
  assert.equal(count('fork-arm'), 2);
  assert.equal(count('optical-tube'), 1);
  assert.equal(count('dew-shield'), 1);
  assert.equal(count('finder-tube'), 1);
  assert.equal(count('eyepiece'), 1);
  assert.equal(count('focuser'), 1);

  const legs = parts.filter((p) => p.name === 'tripod-leg');
  const lengths = legs.map((leg) => site.partDir(leg).len);
  const mean = lengths.reduce((a, b) => a + b, 0) / lengths.length;
  for (const len of lengths) assert.ok(Math.abs(len - mean) / mean < 0.08, 'uneven tripod legs');
  for (const leg of legs) {
    assert.ok(leg.b[1] > leg.a[1] + 0.75, 'leg does not rise to the head');
    assert.ok(Math.abs(leg.a[1]) < 0.04, 'foot is not on the deck');
    const world = site.scopeWorld(leg.a);
    assert.ok(site.onDeck(world[0], world[2]), `foot off the deck ${world}`);
    assert.ok(Math.abs(world[1] - site.deckSurfaceY()) < 0.04);
  }
  const angles = legs.map((leg) => Math.atan2(leg.a[0], leg.a[2])).sort((a, b) => a - b);
  const gaps = [angles[1] - angles[0], angles[2] - angles[1], angles[0] + Math.PI * 2 - angles[2]];
  for (const gap of gaps) assert.ok(Math.abs(gap - (Math.PI * 2) / 3) < 0.08, `leg spacing ${gap}`);

  const tube = parts.find((p) => p.name === 'optical-tube');
  const tubeDir = site.partDir(tube);
  assert.ok(tubeDir.len > 0.6 && tubeDir.len < 1.05, tubeDir.len);
  assert.ok(tube.radius > 0.06 && tube.radius < 0.12);
  assert.ok(tubeDir.d[1] > 0.7, 'tube is not aimed up at the sky');
  const dew = parts.find((p) => p.name === 'dew-shield');
  assert.ok(dew.radius > tube.radius, 'dew shield should step out past the tube');
  const finder = parts.find((p) => p.name === 'finder-tube');
  const finderDir = site.partDir(finder);
  assert.ok(dot(finderDir.d, tubeDir.d) > 0.95, 'finder is not parallel to the tube');
  assert.ok(finder.radius < tube.radius * 0.5);

  const dewMid = dew.a.map((v, i) => (v + dew.b[i]) / 2);
  const eye = parts.find((p) => p.name === 'eyepiece');
  const eyeMid = eye.a.map((v, i) => (v + eye.b[i]) / 2);
  const front = dist3(tube.a, dewMid) < dist3(tube.b, dewMid) ? tube.a : tube.b;
  const rear = front === tube.a ? tube.b : tube.a;
  assert.ok(dist3(eyeMid, rear) < dist3(eyeMid, front), 'eyepiece is on the objective end');
});

test('path markers stay low and off the rug and deck', () => {
  const markers = site.pathMarkers();
  assert.ok(markers.length >= 5, markers.length);
  for (const m of markers) {
    assert.ok(m.height <= 0.35, m.id);
    assert.ok(!site.onRug(m.x, m.z) && !site.onDeck(m.x, m.z) && !site.onSteps(m.x, m.z), m.id);
  }
});

test('desert plants are sparse, varied, and out of the way', () => {
  const kinds = new Set(site.plants.map((p) => p.kind));
  assert.ok(kinds.size >= 6, [...kinds].join(','));
  assert.ok(site.plants.length >= 10 && site.plants.length <= 16);
  for (const p of site.plants) {
    assert.ok(!site.onRug(p.x, p.z) && !site.onDeck(p.x, p.z) && !site.onSteps(p.x, p.z), p.id);
    assert.ok(site.distToPath(p.x, p.z) > 0.7, `${p.id} blocks the path`);
  }
  const nn = site.plants.map((p) => {
    let best = Infinity;
    for (const q of site.plants) {
      if (q === p) continue;
      best = Math.min(best, Math.hypot(p.x - q.x, p.z - q.z));
    }
    return best;
  });
  const mean = nn.reduce((a, b) => a + b, 0) / nn.length;
  const stdev = Math.sqrt(nn.reduce((a, b) => a + (b - mean) ** 2, 0) / nn.length);
  assert.ok(stdev > 0.35, `plants are too evenly spaced (stdev ${stdev})`);
});

test('mesas are layered behind the camp', () => {
  assert.ok(site.mesas.length >= 4);
  const zs = site.mesas.map((m) => m.z);
  assert.ok(Math.max(...zs) < -12);
  assert.ok(Math.max(...zs) - Math.min(...zs) > 15, 'mesa layers are stacked on one depth');
  const palettes = new Set(site.mesas.map((m) => m.tiers.map((t) => t.color).join(',')));
  assert.ok(palettes.size >= 3);
});

test('stool faces the telescope and the deck is separate from the tent', () => {
  const stool = site.stoolPose();
  const face = [Math.sin(stool.yaw), Math.cos(stool.yaw)];
  const to = norm2(site.SCOPE.x - stool.x, site.SCOPE.z - stool.z);
  assert.ok(face[0] * to[0] + face[1] * to[1] > 0.9);
  assert.ok(site.onDeck(stool.x, stool.z));
  const apart = Math.hypot(site.TENT.x - site.DECK.x, site.TENT.z - site.DECK.z);
  assert.ok(apart > 6, apart);
});

test('cameras frame the camp, and eyes stay above the ground', () => {
  const cams = site.cameraPresets();
  const tent = [site.TENT.x, 1.3, site.TENT.z];
  const scope = [site.SCOPE.x, site.deckSurfaceY() + 1.05, site.SCOPE.z];
  const mesa = [site.mesas[1].x, 8, site.mesas[1].z];
  assert.ok(site.inFrame(cams.default, tent));
  assert.ok(site.inFrame(cams.default, scope));
  assert.ok(site.inFrame(cams.default, mesa));
  assert.ok(site.inFrame(cams.corner, tent));
  assert.ok(site.inFrame(cams.corner, scope));
  assert.ok(site.inFrame(cams.corner, mesa));
  assert.ok(site.inFrame(cams.close, scope));
  assert.equal(site.inFrame(cams.close, tent), false);
  for (const cam of Object.values(cams)) {
    const ground = site.heightAt(cam.position[0], cam.position[2]);
    assert.ok(cam.position[1] > ground + 0.6, `camera inside the dune at ${cam.position}`);
  }
});

test('stars stay sparse and fall inside the dusk views', () => {
  const stars = site.starPositions();
  assert.equal(stars.length, site.STAR_COUNT + site.BRIGHT_STAR_COUNT);
  assert.ok(stars.length >= 40 && stars.length <= 80);
  for (const p of stars) assert.ok(p[1] > 4, 'star dropped into the horizon glow');
  const cams = site.cameraPresets();
  const inDefault = stars.filter((p) => site.inFrame(cams.default, p)).length;
  const inCorner = stars.filter((p) => site.inFrame(cams.corner, p)).length;
  assert.ok(inDefault >= 10, `only ${inDefault} stars in the default view`);
  assert.ok(inCorner >= 8, `only ${inCorner} stars in the corner view`);
});

test('path is a bend, not a straight aisle', () => {
  const a = site.pathPoints[0];
  const b = site.pathPoints[1];
  const c = site.pathPoints[site.pathPoints.length - 2];
  const d = site.pathPoints[site.pathPoints.length - 1];
  const d1 = Math.atan2(b[0] - a[0], b[1] - a[1]);
  const d2 = Math.atan2(d[0] - c[0], d[1] - c[1]);
  let turn = Math.abs(d1 - d2);
  if (turn > Math.PI) turn = Math.PI * 2 - turn;
  assert.ok(turn > 0.4, turn);
});

test('layout.json matches the measured site', () => {
  const cams = site.cameraPresets();
  assert.deepEqual(layout.camera.position, cams.default.position);
  assert.deepEqual(layout.camera.target, cams.default.target);
  assert.equal(layout.camera.fov, cams.default.fov);
  assert.deepEqual(layout.cameraPresets.corner, cams.corner);
  assert.deepEqual(layout.cameraPresets.close, cams.close);
  assert.equal(layout.instances.length, site.teaInstances().length);
  for (const inst of site.teaInstances()) {
    const found = layout.instances.find((i) => i.id === inst.id);
    assert.ok(found, inst.id);
    assert.equal(found.kind, inst.kind);
    assert.ok(Math.abs(found.position[1] - inst.position[1]) < 1e-6);
  }
});
