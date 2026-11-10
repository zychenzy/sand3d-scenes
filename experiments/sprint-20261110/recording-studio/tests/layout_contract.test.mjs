import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, realpathSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const sceneDir = dirname(dirname(fileURLToPath(import.meta.url)));
const layout = JSON.parse(readFileSync(join(sceneDir, 'layout.json'), 'utf8'));

test('shared GLBs are symlinks outside this scene', () => {
  for (const [kind, spec] of Object.entries(layout.assets)) {
    const real = realpathSync(join(sceneDir, spec.glb));
    assert.ok(!real.startsWith(sceneDir), `${kind} should reference a shared bake, got ${real}`);
    assert.ok(statSync(real).size > 500, kind);
  }
  const three = realpathSync(join(sceneDir, 'vendor/three.module.js'));
  assert.ok(three.includes(`${join('music', 'vendor', 'three.module.js')}`));
});

test('scene files do not request a CDN', () => {
  for (const file of ['index.html', 'studio.js', 'scene_lib.js', 'layout.json']) {
    const text = readFileSync(join(sceneDir, file), 'utf8');
    assert.equal(/https?:\/\//.test(text), false, file);
  }
});

test('booth, desk, and aisle fit the room', () => {
  const { width: W, depth: D, height: H } = layout.meta.room;
  const b = layout.zones.booth;
  const desk = layout.zones.desk;
  assert.ok(b.x0 > -W / 2 - 0.05 && b.x1 < W / 2);
  assert.ok(b.z0 > -D / 2 - 0.05 && b.z1 < 0);
  assert.ok(b.glassTop < H && b.lid < H);
  assert.ok(b.x1 - b.x0 > 2 && b.z1 - b.z0 > 1.6);
  const deskBack = desk.z - desk.d / 2;
  assert.ok(deskBack - b.z1 > 0.7, `aisle ${deskBack - b.z1}`);
  assert.ok(desk.w >= 2.35, 'console is the wide hero');
  assert.ok(Math.abs(desk.x - (b.x0 + b.x1) / 2) < 0.25);
  assert.ok(b.z0 > -D / 2 + 0.12, 'booth back clears the wall');
  assert.ok(desk.x - desk.w / 2 > -W / 2 + 0.2);
  assert.ok(desk.top > 0.7 && desk.top < 0.85);
});

test('engineer chair faces the console and monitors face the chair', () => {
  const desk = layout.zones.desk;
  const byId = Object.fromEntries(layout.instances.map((i) => [i.id, i]));
  const chair = byId.eng_chair;
  const front = desk.z + desk.d / 2;
  assert.equal(chair.kind, 'dining_chair');
  assert.ok(chair.position[2] > front + 0.25);
  assert.ok(Math.abs(chair.position[0] - desk.x) < 0.2);
  assert.ok(Math.abs(Math.abs(chair.rotationY) - Math.PI) < 0.05);
  for (const id of ['mon_l', 'mon_r']) {
    const mon = byId[id];
    assert.equal(mon.rotationY, 0);
    assert.ok(mon.position[1] >= desk.top - 0.001);
    assert.ok(mon.position[2] < desk.z);
    assert.ok(Math.abs(mon.position[0] - desk.x) < desk.w / 2);
  }
  for (const id of ['nf_l', 'nf_r']) {
    const sp = byId[id];
    assert.ok(sp.position[1] > desk.top + 0.12, 'nearfields sit on the bridge');
    assert.ok(Math.abs(sp.position[0] - desk.x) < desk.w / 2);
    assert.ok(sp.position[2] < desk.z);
  }
  const left = byId.main_l;
  const right = byId.main_r;
  const b = layout.zones.booth;
  assert.ok(left.position[0] < b.x0 && right.position[0] > b.x1);
  assert.ok(Math.abs(left.position[0] + right.position[0] - 2 * desk.x) < 0.2);
  assert.ok(left.rotationY < -0.3 && right.rotationY > 0.3);
  assert.ok(left.position[1] > 0.9 && right.position[1] > 0.9);
  assert.ok(left.position[2] > b.z1 && right.position[2] > b.z1, 'mains sit in front of the glass');
  const sofa = byId.sofa;
  assert.ok(sofa.position[2] < -2.4, 'sofa is against the rear wall');
  assert.ok(Math.abs(Math.abs(sofa.rotationY) - Math.PI) < 0.05);
  assert.equal(layout.instances.some((i) => i.kind === 'library_lamp' || i.id === 'desk_lamp'), false);
});

test('vocal bench is inside the booth and racks face the desk', () => {
  const b = layout.zones.booth;
  const bench = layout.instances.find((i) => i.id === 'vocal_bench');
  assert.ok(bench.position[0] > b.x0 + 0.2 && bench.position[0] < b.x1 - 0.2);
  assert.ok(bench.position[2] > b.z0 + 0.2 && bench.position[2] < b.z1 - 0.2);
  assert.equal(layout.zones.racks.length, 2);
  for (const rack of layout.zones.racks) {
    assert.ok(Math.abs(rack.rotY - Math.PI / 2) < 0.05);
    assert.ok(rack.x > b.x1 + 2, 'racks stay clear of the booth');
    assert.ok(Math.abs(rack.z) < layout.meta.room.depth / 2 - 0.4);
  }
  const speakers = layout.instances.filter((i) => i.kind === 'speaker');
  assert.ok(speakers.length >= 4);
});

test('cameras and practical lights exist', () => {
  assert.ok(layout.cameraPresets.corner && layout.cameraPresets.close);
  const ids = layout.lights.points.map((p) => p.id);
  for (const id of ['desk', 'booth', 'tally', 'strip']) assert.ok(ids.includes(id), id);
  assert.ok(layout.lights.spots && layout.lights.spots.length >= 1);
});
