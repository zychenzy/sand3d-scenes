import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  COURT,
  frame,
  floorMarkings,
  serviceBoxInterior,
  sideLineBand,
  outY,
} from './court_spec.mjs';

const dir = path.dirname(fileURLToPath(import.meta.url));
const layout = JSON.parse(fs.readFileSync(path.join(dir, 'layout.json'), 'utf8'));

test('WSF singles constants', () => {
  assert.equal(COURT.length, 9.75);
  assert.equal(COURT.width, 6.4);
  assert.equal(COURT.line, 0.05);
  assert.equal(COURT.tinTop, 0.48);
  assert.equal(COURT.serviceLower, 1.78);
  assert.equal(COURT.frontOutLower, 4.57);
  assert.equal(COURT.backOutLower, 2.13);
  assert.equal(COURT.shortFromBack, 4.26);
  assert.equal(COURT.boxInternal, 1.6);
  assert.equal(COURT.clearHeight, 5.64);
  assert.ok(COURT.doorMaxWidth <= 0.9);
  assert.ok(COURT.doorMaxHeight <= 2.13);
});

test('short line, half-court line, and 1.6 m service boxes', () => {
  const frontZ = -4.9;
  const f = frame(frontZ);
  const { rects } = floorMarkings(frontZ);
  const byId = Object.fromEntries(rects.map((r) => [r.id, r]));

  assert.ok(Math.abs(f.backZ - f.frontZ - COURT.length) < 1e-9);
  assert.ok(Math.abs(f.backZ - byId.short.z1 - 4.26) < 1e-9);
  assert.ok(Math.abs(byId.short.z1 - byId.short.z0 - 0.05) < 1e-9);
  assert.equal(byId.short.x0, f.leftX);
  assert.equal(byId.short.x1, f.rightX);
  assert.ok(byId.short.z1 < f.backZ);
  assert.ok(byId.short.z0 > f.frontZ);

  assert.equal(byId.half.z0, f.shortNear);
  assert.equal(byId.half.z1, f.backZ);
  assert.ok(Math.abs(byId.half.x1 - byId.half.x0 - 0.05) < 1e-9);
  assert.ok(Math.abs((byId.half.x0 + byId.half.x1) / 2) < 1e-9);

  for (const side of ['left', 'right']) {
    const box = serviceBoxInterior(frontZ, side);
    assert.ok(Math.abs(box.x1 - box.x0 - 1.6) < 1e-9, side + ' width');
    assert.ok(Math.abs(box.z1 - box.z0 - 1.6) < 1e-9, side + ' depth');
    assert.equal(box.z0, f.shortNear);
    assert.ok(box.z1 < f.backZ);
    assert.ok(box.z1 > f.shortNear);
    const wall = side === 'left' ? f.leftX : f.rightX;
    assert.ok(box.x0 === wall || box.x1 === wall);
    assert.ok(byId.half.x1 <= box.x0 + 1e-9 || byId.half.x0 >= box.x1 - 1e-9);
  }

  for (const r of rects) {
    assert.ok(r.x0 >= f.leftX - 1e-6 && r.x1 <= f.rightX + 1e-6, r.id + ' x');
    assert.ok(r.z0 >= f.frontZ - 1e-6 && r.z1 <= f.backZ + 1e-6, r.id + ' z');
    assert.ok(r.x1 - r.x0 >= 0.05 - 1e-9);
    assert.ok(r.z1 - r.z0 >= 0.05 - 1e-9);
  }
});

test('side-wall out line joins 4.57 m to 2.13 m at a 50 mm band', () => {
  const f = frame(0);
  assert.equal(outY(f.frontZ, f.frontZ, f.backZ), 4.57);
  assert.equal(outY(f.backZ, f.frontZ, f.backZ), 2.13);
  const mid = (f.frontZ + f.backZ) / 2;
  const midY = outY(mid, f.frontZ, f.backZ);
  assert.ok(midY < 4.57 && midY > 2.13);
  const band = sideLineBand();
  assert.ok(Math.abs(Math.hypot(band.dz, band.dy) - 0.05) < 1e-9);
  assert.ok(band.dy > 0);
});

test('layout matches the court and keeps furniture out of the playing box', () => {
  const court = layout.meta.court;
  assert.equal(court.length, COURT.length);
  assert.equal(court.width, COURT.width);
  assert.ok(court.ceilingY >= COURT.clearHeight);
  assert.ok(court.door.width <= COURT.doorMaxWidth);
  assert.ok(court.door.height <= COURT.doorMaxHeight);
  assert.equal(layout.meta.room.units || layout.meta.units, 'metres');

  const f = frame(court.frontZ);
  const inside = (p) => p[0] > f.leftX + 0.05 && p[0] < f.rightX - 0.05
    && p[2] > f.frontZ + 0.05 && p[2] < f.backZ - 0.05;

  for (const inst of layout.instances) {
    assert.equal(inside(inst.position), false, inst.id + ' sits in the playing court');
  }

  const benchL = layout.instances.find((i) => i.id === 'bench_l');
  const benchR = layout.instances.find((i) => i.id === 'bench_r');
  const chair = layout.instances.find((i) => i.id === 'reception_chair');
  assert.ok(benchL.position[2] > f.backZ && benchR.position[2] > f.backZ);
  assert.ok(Math.abs(Math.abs(benchL.rotationY) - Math.PI / 2) < 1e-3);
  assert.ok(Math.abs(Math.abs(benchR.rotationY) - Math.PI / 2) < 1e-3);
  assert.equal(chair.rotationY, 0);
  assert.ok(chair.position[0] > f.rightX);
  assert.ok(chair.position[2] > f.backZ);

  for (const id of ['desk_lamp', 'desk_plant']) {
    const inst = layout.instances.find((i) => i.id === id);
    assert.ok(inst.position[1] > 0.7, id + ' rests on the desk');
    assert.ok(inst.position[0] > f.rightX);
  }

  assert.ok(layout.zones.desk.x > f.rightX);
  assert.ok(layout.zones.desk.z > f.backZ);
  assert.ok(layout.zones.rack.z > f.backZ);
  assert.ok(layout.zones.rack.x <= f.leftX + 0.05);
});

test('shared GLBs and the vendored renderer resolve from this folder', () => {
  for (const spec of Object.values(layout.assets)) {
    assert.equal(spec.glb.startsWith('assets/'), false, spec.glb);
    assert.ok(fs.existsSync(path.resolve(dir, spec.glb)), spec.glb);
  }
  const html = fs.readFileSync(path.join(dir, 'index.html'), 'utf8');
  assert.match(html, /gym\/vendor\/three\.module\.js/);
  assert.ok(fs.existsSync(path.resolve(dir, '../../../gym/vendor/three.module.js')));
  assert.ok(fs.existsSync(path.resolve(dir, '../../../gym/vendor/loaders/GLTFLoader.js')));
});
