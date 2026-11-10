import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DOME, RINGS, expandSeats, seatFromPhi } from '../seating.mjs';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const layout = JSON.parse(readFileSync(join(root, 'layout.json'), 'utf8'));

test('dome is a partial shell, not a full sphere', () => {
  assert.ok(DOME.phiLength > Math.PI * 0.75);
  assert.ok(DOME.phiLength < Math.PI * 1.75);
});

test('theatre chairs face the projector and leave the aisles open', () => {
  const seated = expandSeats(structuredClone(layout));
  const chairs = seated.instances.filter((inst) => inst.kind === 'theatre_chair');
  assert.ok(chairs.length >= 12);
  const center = [DOME.cx, DOME.cz];
  let minDist = Infinity;
  for (let i = 0; i < chairs.length; i++) {
    const chair = chairs[i];
    const expected = seatFromPhi(chair.phi, RINGS.find((r) => chair.id.includes(r.id)).r, chair.position[1], center);
    const dx = center[0] - chair.position[0];
    const dz = center[1] - chair.position[2];
    const facing = Math.atan2(-dx, -dz);
    const delta = Math.atan2(Math.sin(chair.rotationY - facing), Math.cos(chair.rotationY - facing));
    assert.ok(Math.abs(delta) < 0.02, `${chair.id} faces ${chair.rotationY}, expected ${facing}`);
    assert.ok(chair.phi >= DOME.phiStart + 0.05 && chair.phi <= DOME.phiStart + DOME.phiLength - 0.05);
    const r = Math.hypot(chair.position[0] - center[0], chair.position[2] - center[1]);
    assert.ok(r > 1.55 && r < DOME.R - 0.7);
    const aisle = Math.atan2(chair.position[0] - center[0], chair.position[2] - center[1]);
    assert.ok(Math.abs(aisle) > 0.7, `${chair.id} sits in the entry aisle`);
    for (let j = i + 1; j < chairs.length; j++) {
      const other = chairs[j];
      const d = Math.hypot(
        chair.position[0] - other.position[0],
        chair.position[1] - other.position[1],
        chair.position[2] - other.position[2],
      );
      minDist = Math.min(minDist, d);
    }
  }
  assert.ok(minDist > 0.9, `chairs overlap, min ${minDist}`);
  const outer = RINGS.find((ring) => ring.id === 'outer').phis;
  const gaps = outer.slice(1).map((phi, i) => phi - outer[i]);
  assert.ok(Math.max(...gaps) > 0.5, 'outer ring needs a radial aisle gap');
});

test('foyer anchors sit outside the dome and inside the room', () => {
  const { width: W, depth: D } = layout.meta.room;
  for (const [name, [x, z]] of Object.entries(layout.anchors)) {
    assert.ok(Math.abs(x) < W / 2 - 0.15, name);
    assert.ok(Math.abs(z) < D / 2 - 0.15, name);
    const dist = Math.hypot(x - DOME.cx, z - DOME.cz);
    assert.ok(dist > DOME.R - 0.05, `${name} is inside the dome bowl`);
  }
});

test('referenced GLBs exist and the page stays offline', () => {
  for (const spec of Object.values(layout.assets)) {
    const path = resolve(root, spec.glb);
    assert.ok(existsSync(path), spec.glb);
  }
  const html = readFileSync(join(root, 'index.html'), 'utf8');
  assert.equal(html.includes('http://'), false);
  assert.equal(html.includes('https://'), false);
  assert.match(html, /cinema\/vendor\/three\.module\.js/);
});

test('seat on the foyer axis would use rotation 0', () => {
  const s = seatFromPhi(Math.PI / 2, 2, 0, [DOME.cx, DOME.cz]);
  assert.ok(Math.abs(s.rotationY) < 1e-6);
  assert.ok(Math.abs(s.x - DOME.cx) < 1e-6);
  assert.ok(s.z > DOME.cz);
});
