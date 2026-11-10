import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { rotationFor, forwardXZ, norm2 } from '../orient.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const layout = JSON.parse(readFileSync(join(root, 'layout.json'), 'utf8'));

function seatForward(seat) {
  const rot = rotationFor(seat.modelForward, seat.position, seat.lookAt);
  return forwardXZ(rot, seat.modelForward);
}

test('two zones and a cutaway room', () => {
  assert.equal(layout.meta.zones.length, 2);
  assert.ok(layout.meta.zones.some((z) => z.id === 'conversation'));
  assert.ok(layout.meta.zones.some((z) => z.id === 'control'));
  const { width, depth, height } = layout.meta.room;
  assert.ok(width > 6 && depth > 5 && height > 2.4 && height < 4);
});

test('shared GLBs exist and are not copied into this folder', () => {
  for (const spec of Object.values(layout.assets)) {
    assert.ok(spec.glb.startsWith('../../../'), spec.glb);
    assert.equal(existsSync(join(root, spec.glb)), true, spec.glb);
  }
});

test('every seat faces another seat', () => {
  const seats = layout.instances.filter((i) => i.role === 'seat');
  assert.ok(seats.length >= 4);
  for (const seat of seats) {
    const fwd = seatForward(seat);
    const dx = seat.lookAt[0] - seat.position[0];
    const dz = seat.lookAt[1] - seat.position[2];
    const [nx, nz] = norm2(dx, dz);
    const dot = fwd[0] * nx + fwd[1] * nz;
    assert.ok(dot > 0.98, `${seat.id} faces away from lookAt (${dot})`);
    const near = seats.filter((other) => other.id !== seat.id).some((other) => {
      const ox = other.position[0] - seat.lookAt[0];
      const oz = other.position[2] - seat.lookAt[1];
      return Math.hypot(ox, oz) < 2.1;
    });
    assert.ok(near, `${seat.id} lookAt is not near another seat`);
  }
});

test('every mic points back at its seat from in front', () => {
  const seats = Object.fromEntries(layout.instances.filter((i) => i.role === 'seat').map((s) => [s.id, s]));
  assert.equal(layout.mics.length, 5);
  for (const mic of layout.mics) {
    const seat = seats[mic.seat];
    assert.ok(seat, mic.id);
    const fwd = seatForward(seat);
    const dx = mic.mouth[0] - mic.capsule[0];
    const dz = mic.mouth[2] - mic.capsule[2];
    const [nx, nz] = norm2(dx, dz);
    const dot = nx * fwd[0] + nz * fwd[1];
    assert.ok(dot < -0.75, `${mic.id} is not aimed at the speaker (${dot})`);
    const dist = Math.hypot(dx, mic.mouth[1] - mic.capsule[1], dz);
    assert.ok(dist > 0.22 && dist < 0.6, `${mic.id} capsule distance ${dist}`);
    const seatDx = mic.mouth[0] - seat.position[0];
    const seatDz = mic.mouth[2] - seat.position[2];
    assert.ok(Math.hypot(seatDx, seatDz) < 0.45, `${mic.id} mouth is far from its seat`);
  }
});

test('props stay inside the cutaway', () => {
  const { width: W, depth: D } = layout.meta.room;
  for (const inst of layout.instances) {
    assert.ok(Math.abs(inst.position[0]) < W / 2 - 0.15, inst.id);
    assert.ok(Math.abs(inst.position[2]) < D / 2 - 0.05, inst.id);
  }
});
