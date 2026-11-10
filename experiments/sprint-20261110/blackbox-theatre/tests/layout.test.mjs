import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const sceneDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const layout = JSON.parse(readFileSync(join(sceneDir, 'layout.json'), 'utf8'));

function yaw(x, z) {
  const focus = layout.meta.stage.focus;
  const dx = focus[0] - x;
  const dz = focus[2] - z;
  const theta = Math.atan2(-dx, -dz);
  const { toe, toeMax } = layout.meta.house;
  return Math.max(-toeMax, Math.min(toeMax, theta * toe));
}

test('shared GLBs and the vendored renderer resolve from this scene', () => {
  for (const spec of Object.values(layout.assets)) {
    assert.equal(spec.glb.startsWith('../../../'), true, spec.glb);
    assert.equal(existsSync(resolve(sceneDir, spec.glb)), true, spec.glb);
  }
  const html = readFileSync(join(sceneDir, 'index.html'), 'utf8');
  assert.match(html, /cinema\/vendor\/three\.module\.js/);
  assert.equal(existsSync(resolve(sceneDir, '../../../cinema/vendor/three.module.js')), true);
  assert.equal(existsSync(resolve(sceneDir, '../../../cinema/vendor/controls/OrbitControls.js')), true);
  assert.equal(existsSync(resolve(sceneDir, '../../../cinema/vendor/loaders/GLTFLoader.js')), true);
  assert.equal(existsSync(join(sceneDir, 'assets')), false);
});

test('theatre seats sit in the house and toe in toward the stage', () => {
  const { stage, house } = layout.meta;
  const seats = layout.instances.filter((i) => i.kind === 'theatre_chair');
  const expected = [];
  for (const row of house.rows) {
    for (const x of [...house.xsLeft, ...house.xsRight]) expected.push({ x, y: row.y, z: row.z });
  }
  assert.equal(seats.length, expected.length);
  assert.ok(seats.length >= 18);
  for (const e of expected) {
    const seat = seats.find((s) => Math.abs(s.position[0] - e.x) < 1e-3 && Math.abs(s.position[2] - e.z) < 1e-3);
    assert.ok(seat, `missing seat at ${e.x}, ${e.z}`);
    assert.ok(Math.abs(seat.position[1] - e.y) < 1e-3);
    assert.ok(seat.position[2] > stage.z1, `${seat.id} is not downstage of the stage`);
    assert.ok(Math.abs(seat.rotationY - yaw(e.x, e.z)) < 1e-3, `${seat.id} yaw`);
    assert.ok(Math.abs(seat.rotationY) <= house.toeMax + 1e-6);
    const dx = stage.focus[0] - e.x;
    if (dx > 0.2) assert.ok(seat.rotationY < 0, `${seat.id} should toe toward +X`);
    if (dx < -0.2) assert.ok(seat.rotationY > 0, `${seat.id} should toe toward -X`);
  }
  for (let i = 0; i < seats.length; i++) {
    for (let j = i + 1; j < seats.length; j++) {
      const a = seats[i].position;
      const b = seats[j].position;
      const d = Math.hypot(a[0] - b[0], a[2] - b[2]);
      if (Math.abs(a[2] - b[2]) < 1e-3) assert.ok(d > 0.9, `${seats[i].id} overlaps ${seats[j].id}`);
    }
  }
});

test('set chairs face the table and the prep chair faces the desk', () => {
  const table = layout.instances.find((i) => i.id === 'set_table');
  const ds = layout.instances.find((i) => i.id === 'set_chair_ds');
  const us = layout.instances.find((i) => i.id === 'set_chair_us');
  const desk = layout.instances.find((i) => i.id === 'prep_desk');
  const prep = layout.instances.find((i) => i.id === 'prep_chair');
  assert.ok(ds.position[2] > table.position[2]);
  assert.ok(Math.abs(Math.abs(ds.rotationY) - Math.PI) < 0.02);
  assert.ok(us.position[2] < table.position[2]);
  assert.ok(Math.abs(us.rotationY) < 0.02);
  assert.ok(prep.position[0] > desk.position[0]);
  assert.ok(Math.abs(prep.rotationY + Math.PI / 2) < 0.02);
  assert.equal(layout.instances.filter((i) => i.kind === 'library_lamp').length, 2);
  assert.ok(layout.instances.some((i) => i.kind === 'wall_shelf'));
  assert.ok(layout.instances.some((i) => i.kind === 'book_stand'));
});
