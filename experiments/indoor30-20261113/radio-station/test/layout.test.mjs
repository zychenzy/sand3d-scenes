import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { rotationFor, forwardXZ, norm2 } from '../orient.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const layout = JSON.parse(readFileSync(join(root, 'layout.json'), 'utf8'));

function seatForward(seat) {
  const rot = rotationFor(seat.modelForward, seat.position, seat.lookAt);
  return forwardXZ(rot, seat.modelForward);
}

function inside(px, pz, box) {
  return px > box.min[0] && px < box.max[0] && pz > box.min[1] && pz < box.max[1];
}

function distToBox(px, pz, box) {
  const cx = Math.max(box.min[0], Math.min(px, box.max[0]));
  const cz = Math.max(box.min[1], Math.min(pz, box.max[1]));
  return Math.hypot(px - cx, pz - cz);
}

test('on-air desk and a producer nook, not a music or podcast set', () => {
  const ids = layout.meta.zones.map((z) => z.id);
  assert.deepEqual(ids, ['on-air', 'producer']);
  const { width, depth, height } = layout.meta.room;
  assert.ok(width > 8 && depth > 6 && height > 2.6 && height < 3.6);
  const kinds = Object.keys(layout.assets);
  for (const banned of ['piano_bench', 'guitar_amp', 'marshall_amp', 'sofa_solid', 'coffee_table']) {
    assert.equal(kinds.includes(banned), false, banned);
  }
  assert.equal(layout.built.table, undefined);
});

test('shared GLBs are root references and are not copied here', () => {
  for (const spec of Object.values(layout.assets)) {
    assert.ok(spec.glb.startsWith('../../../'), spec.glb);
    assert.equal(spec.glb.includes('/experiments/'), false, spec.glb);
    assert.equal(existsSync(join(root, spec.glb)), true, spec.glb);
  }
  const local = readdirSync(root);
  assert.equal(local.includes('assets'), false);
  assert.equal(local.includes('vendor'), false);
});

test('host faces the guests, guests face their mics, producer faces the window', () => {
  const seats = Object.fromEntries(layout.instances.filter((i) => i.role === 'seat').map((s) => [s.id, s]));
  assert.equal(Object.keys(seats).length, 4);
  const host = seatForward(seats.host);
  assert.ok(host[1] < -0.9, 'host should face the back wall, the guests, and the news clock');
  for (const id of ['guest_l', 'guest_r']) {
    const fwd = seatForward(seats[id]);
    assert.ok(fwd[1] > 0.7, `${id} should face the host across the desk`);
    const towardHost = norm2(seats.host.position[0] - seats[id].position[0], seats.host.position[2] - seats[id].position[2]);
    assert.ok(fwd[0] * towardHost[0] + fwd[1] * towardHost[1] > 0.9, id);
  }
  const producer = seatForward(seats.producer);
  assert.ok(producer[0] < -0.9, 'producer faces the glass');
  const glassX = layout.built.partition.x;
  assert.ok(seats.host.position[0] < glassX && seats.producer.position[0] > glassX);
});

test('every boom aims back at its seat from in front', () => {
  const seats = Object.fromEntries(layout.instances.filter((i) => i.role === 'seat').map((s) => [s.id, s]));
  assert.equal(layout.mics.length, 4);
  for (const mic of layout.mics) {
    const seat = seats[mic.seat];
    const fwd = seatForward(seat);
    const dx = mic.mouth[0] - mic.capsule[0];
    const dz = mic.mouth[2] - mic.capsule[2];
    const [nx, nz] = norm2(dx, dz);
    const dot = nx * fwd[0] + nz * fwd[1];
    assert.ok(dot < -0.9, `${mic.id} aim ${dot}`);
    const dist = Math.hypot(dx, mic.mouth[1] - mic.capsule[1], dz);
    assert.ok(dist > 0.25 && dist < 0.5, `${mic.id} distance ${dist}`);
    const seatDx = mic.mouth[0] - seat.position[0];
    const seatDz = mic.mouth[2] - seat.position[2];
    assert.ok(Math.hypot(seatDx, seatDz) < 0.42, mic.id);
    assert.ok(mic.base[1] >= 0.7 && mic.base[1] <= 0.8, `${mic.id} clamp is not on a desk`);
  }
});

test('mixer controls stay small and the news clock is on the host sightline', () => {
  const c = layout.built.controls;
  assert.equal(c.channels, 8);
  const dims = [...c.faderCap, c.knobRadius * 2, c.knobHeight, ...c.button];
  assert.ok(Math.max(...dims) <= 0.02, `control larger than 2 cm: ${dims}`);
  const clock = layout.built.clock;
  const host = layout.instances.find((i) => i.id === 'host');
  assert.ok(Math.abs(clock.position[0] - host.position[0]) < 0.2);
  assert.ok(clock.position[2] < host.lookAt[1], 'clock is beyond the guests the host faces');
  assert.ok(clock.radius >= 0.3 && clock.radius <= 0.5);
  assert.ok(layout.built.cues.some((q) => q.id === 'on-air'));
  assert.ok(layout.built.cues.some((q) => q.id === 'record'));
});

test('aisle and producer door stay clear of desks, seats, and the wall', () => {
  const seats = layout.instances.filter((i) => i.role === 'seat');
  const samples = [...layout.paths.aisle, ...layout.paths.toProducer];
  for (const [x, z] of samples) {
    for (const box of layout.obstacles) {
      const d = distToBox(x, z, box);
      assert.ok(d >= layout.paths.clearance, `${x},${z} hits ${box.id} (${d})`);
      assert.equal(inside(x, z, box), false);
    }
    for (const seat of seats) {
      const d = Math.hypot(x - seat.position[0], z - seat.position[2]);
      assert.ok(d > 0.55, `${x},${z} crowded by ${seat.id} (${d})`);
    }
  }
  const door = layout.built.partition.door;
  const crossing = layout.paths.toProducer.find((p) => p[0] > 0.9 && p[0] < 1.3);
  assert.ok(crossing, 'path crosses the partition');
  assert.ok(crossing[1] > door[0] && crossing[1] < door[1]);
});

test('props stay inside the cutaway and the foreground sightline is clear', () => {
  const { width: W, depth: D } = layout.meta.room;
  for (const inst of layout.instances) {
    assert.ok(Math.abs(inst.position[0]) < W / 2 - 0.15, inst.id);
    assert.ok(Math.abs(inst.position[2]) < D / 2 - 0.08, inst.id);
  }
  const tall = layout.instances.filter((inst) => {
    const [x, y, z] = inst.position;
    const h = y + layout.assets[inst.kind].targetHeight;
    return z > 2.15 && x > 0.6 && x < 3.4 && h > 0.7;
  });
  assert.deepEqual(tall.map((t) => t.id), []);
});
