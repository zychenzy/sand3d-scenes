import assert from 'node:assert/strict';
import { readFileSync, lstatSync, realpathSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const repo = path.resolve(root, '../../..');
const layout = JSON.parse(readFileSync(path.join(root, 'layout.json'), 'utf8'));
const js = readFileSync(path.join(root, 'workshop.js'), 'utf8');
const html = readFileSync(path.join(root, 'index.html'), 'utf8');
const lib = readFileSync(path.join(root, 'scene_lib.js'), 'utf8');

function forward(rot) {
  return [Math.sin(rot), Math.cos(rot)];
}

function anchorXZ(id) {
  if (id === 'glazeBench') return layout.procedural.glazeBench.position;
  if (id === 'handbuild') return layout.procedural.handbuild.position;
  const wheel = layout.procedural.wheels.find((item) => item.id === id);
  if (wheel) return wheel.position;
  const inst = layout.instances.find((item) => item.id === id);
  if (inst) return [inst.position[0], inst.position[2]];
  throw new Error(`unknown anchor ${id}`);
}

function facingDot(from, rot, to) {
  const [fx, fz] = forward(rot);
  const dx = to[0] - from[0];
  const dz = to[1] - from[1];
  return (fx * dx + fz * dz) / Math.hypot(dx, dz);
}

test('room, cameras, and zone anchors are present', () => {
  const { width, depth, height } = layout.meta.room;
  assert.ok(width >= 9 && width <= 12);
  assert.ok(depth >= 7 && depth <= 11);
  assert.ok(height >= 2.8 && height <= 3.6);
  assert.equal(layout.meta.units, 'metres');
  for (const key of ['corner', 'close']) {
    assert.equal(layout.cameraPresets[key].position.length, 3);
    assert.equal(layout.cameraPresets[key].target.length, 3);
  }
  assert.equal(layout.camera.position.length, 3);
  assert.equal(layout.procedural.wheels.length, 3);
  assert.ok(layout.procedural.wheels.some((wheel) => wheel.state === 'throwing'));
  assert.ok(layout.procedural.wheels.some((wheel) => wheel.state === 'idle'));
  for (const key of ['dryingRack', 'kiln', 'glazeBench', 'pier', 'cart', 'slabRoller', 'handbuild', 'rightStub']) {
    assert.ok(layout.procedural[key], key);
  }
});

test('seats face their work surface', () => {
  const seated = [
    ...layout.instances.filter((item) => item.faces),
    ...layout.procedural.throwingStools,
  ];
  assert.ok(seated.length >= 7);
  for (const seat of seated) {
    const from = seat.position.length === 3
      ? [seat.position[0], seat.position[2]]
      : seat.position;
    const dot = facingDot(from, seat.rotationY, anchorXZ(seat.faces));
    assert.ok(dot > 0.85, `${seat.id} faces ${seat.faces} dot=${dot.toFixed(3)}`);
  }
});

test('aisle stays clear between throwing stools and the island', () => {
  const stoolX = Math.max(...layout.procedural.throwingStools.map((s) => s.position[0]));
  const islandX = layout.procedural.handbuild.position[0] - layout.procedural.handbuild.size[0] / 2;
  assert.ok(islandX - stoolX > 1.4, `aisle ${islandX - stoolX}`);
});

test('shared GLBs are symlinks, not copied blobs', () => {
  for (const spec of Object.values(layout.assets)) {
    const link = path.join(root, spec.glb);
    assert.equal(lstatSync(link).isSymbolicLink(), true, spec.glb);
    const real = realpathSync(link);
    assert.equal(real.startsWith(`${root}${path.sep}`), false, real);
    assert.equal(real.startsWith(`${repo}${path.sep}`), true, real);
    assert.equal(lstatSync(real).isFile(), true, real);
  }
  const vendor = path.join(root, 'vendor');
  assert.equal(lstatSync(vendor).isSymbolicLink(), true);
  assert.equal(lstatSync(path.join(realpathSync(vendor), 'three.module.js')).isFile(), true);
});

test('page stays offline: relative vendor, no CDN', () => {
  assert.match(html, /"three": "\.\/vendor\/three\.module\.js"/);
  assert.doesNotMatch(html, /https?:\/\//);
  assert.doesNotMatch(js, /https?:\/\//);
  assert.doesNotMatch(lib, /https?:\/\//);
});

test('kiln glow and contact grounding are authored', () => {
  assert.match(js, /emissive/);
  assert.match(js, /contactDisc/);
  assert.match(js, /slabRoller/);
  assert.match(js, /potteryWheel/);
  assert.match(js, /dryingRack/);
  assert.match(lib, /keepBasic/);
  assert.match(lib, /makeLights/);
});
