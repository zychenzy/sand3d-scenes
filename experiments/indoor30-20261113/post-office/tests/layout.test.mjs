import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const repo = resolve(dir, '../../..');
const layout = JSON.parse(readFileSync(join(dir, 'layout.json'), 'utf8'));
const html = readFileSync(join(dir, 'index.html'), 'utf8');
const scene = readFileSync(join(dir, 'post-office.js'), 'utf8');
const lib = readFileSync(join(dir, 'scene_lib.js'), 'utf8');

function dist(a, b) {
  return Math.hypot(a[0] - b[0], a[1] - b[1]);
}

test('room is a branch lobby, not a warehouse or a closet', () => {
  const { width, depth, height } = layout.meta.room;
  assert.ok(width >= 10 && width <= 16, width);
  assert.ok(depth >= 9 && depth <= 14, depth);
  assert.ok(height >= 3.2 && height <= 4.2, height);
  assert.deepEqual(layout.meta.zones, ['public lobby', 'sorting hall']);
  assert.doesNotMatch(layout.meta.title.toLowerCase(), /archive|library/);
});

test('shared bakes and vendor are root references, not copies', () => {
  assert.equal(existsSync(join(dir, 'assets')), false);
  assert.equal(existsSync(join(dir, 'vendor')), false);
  for (const [kind, spec] of Object.entries(layout.assets)) {
    assert.match(spec.glb, /^\.\.\/\.\.\/\.\.\//, kind);
    const file = resolve(dir, spec.glb);
    assert.equal(existsSync(file), true, `${kind} ${spec.glb}`);
    const size = statSync(file).size;
    assert.ok(size > 500 && size < 800_000, `${kind} ${size}`);
    assert.ok(spec.targetHeight > 0.1 && spec.targetHeight < 1.2, kind);
  }
  assert.equal(existsSync(resolve(repo, 'museum/vendor/three.module.js')), true);
});

test('entry stays offline and on the shared vendor', () => {
  assert.match(html, /museum\/vendor\/three\.module\.js/);
  assert.match(html, /post-office\.js/);
  assert.doesNotMatch(html, /https?:\/\//);
  assert.doesNotMatch(scene, /https?:\/\//);
  assert.match(lib, /MeshBasicMaterial/);
  assert.match(lib, /NearestFilter/);
  assert.match(lib, /makeToonGradient\(4\)/);
  assert.match(scene, /addPigeonholes/);
  assert.match(scene, /parcel-scale/);
  assert.match(scene, /po-boxes/);
});

test('clerks face the public and sit on the staff side of the counter', () => {
  const clerks = layout.instances.filter((i) => i.id.startsWith('clerk_'));
  assert.equal(clerks.length, 3);
  const c = layout.build.counter;
  const topStaff = c.z - c.topDepth / 2;
  const half = layout.scale.chairDepth / 2;
  for (const clerk of clerks) {
    assert.equal(clerk.kind, 'dining_chair');
    assert.ok(Math.abs(clerk.rotationY) < 0.05, clerk.id);
    assert.ok(clerk.position[0] > c.x0 && clerk.position[0] < c.x1, clerk.id);
    const front = clerk.position[2] + half;
    assert.ok(front < topStaff - 0.04, `${clerk.id} front ${front} vs top ${topStaff}`);
    assert.equal(clerk.position[1], 0);
  }
  const xs = clerks.map((i) => i.position[0]).sort((a, b) => a - b);
  assert.ok(xs[1] - xs[0] > 1.4 && xs[2] - xs[1] > 1.4);
});

test('pos terminals sit on the counter and face the clerks', () => {
  const terminals = layout.instances.filter((i) => i.kind === 'pos_terminal');
  assert.equal(terminals.length, 3);
  const top = layout.build.counter.top;
  for (const pos of terminals) {
    assert.equal(pos.position[1], top);
    assert.ok(Math.abs(Math.abs(pos.rotationY) - Math.PI) < 0.02, pos.id);
    const clerk = layout.instances.find((i) => i.id === pos.id.replace('pos_', 'clerk_'));
    assert.ok(clerk, pos.id);
    assert.ok(Math.abs(pos.position[0] - clerk.position[0]) < 0.05);
    assert.ok(pos.position[2] < layout.build.counter.z + 0.05);
  }
  assert.equal(layout.assets.pos_terminal.targetHeight, 0.15);
});

test('queue, scale, boxes, and pigeonholes are at operational sizes', () => {
  const q = layout.build.queue;
  assert.ok(q.x1 - q.x0 >= 1.05 && q.x1 - q.x0 <= 1.6);
  assert.equal(layout.scale.queueWidth, Math.round((q.x1 - q.x0) * 100) / 100);
  const platform = layout.build.scale.platform;
  assert.ok(platform[0] >= 0.4 && platform[0] <= 0.7);
  assert.ok(platform[2] >= 0.35 && platform[2] <= 0.6);
  assert.ok(platform[1] < 0.15);
  const door = layout.build.boxes.door;
  assert.ok(Math.max(...door) < 0.2 && Math.min(...door) > 0.08);
  assert.ok(layout.build.boxes.cols >= 8 && layout.build.boxes.rows >= 4);
  const cell = layout.build.pigeon.cell;
  assert.ok(cell[0] < 0.2 && cell[1] < 0.16 && cell[2] < 0.4);
  assert.ok(layout.build.pigeon.cols >= 12 && layout.build.pigeon.rows >= 5);
  assert.ok(layout.scale.counterTop >= 1.0 && layout.scale.counterTop <= 1.12);
});

test('pathways stay clear between clerks, trolleys, bench, and boxes', () => {
  const clerks = layout.instances.filter((i) => i.id.startsWith('clerk_'));
  for (const trolley of layout.build.trolleys) {
    for (const clerk of clerks) {
      const d = dist([clerk.position[0], clerk.position[2]], [trolley.x, trolley.z]);
      assert.ok(d > 1.15, `${clerk.id} ${trolley.id} ${d.toFixed(2)}`);
    }
  }
  const bench = layout.instances.find((i) => i.id === 'bench_wait');
  assert.equal(bench.kind, 'museum_bench');
  assert.ok(Math.abs(bench.rotationY - Math.PI / 2) < 0.02);
  assert.ok(bench.position[2] > layout.build.boxes.z0 + 2.5);
  const desk = layout.instances.find((i) => i.id === 'pack_desk');
  assert.ok(desk.position[2] < -3.8);
  assert.ok(Math.abs(desk.rotationY - Math.PI / 2) < 0.02);
  const pigeonFront = layout.build.pigeon.z + layout.build.pigeon.cell[2] / 2;
  const deskBack = desk.position[2] - 0.4;
  assert.ok(deskBack > pigeonFront, `desk ${deskBack} pigeon ${pigeonFront}`);
});

test('cameras and lights leave the default view open', () => {
  assert.equal(layout.camera.position.length, 3);
  assert.ok(layout.camera.position[0] > 6 && layout.camera.position[2] > 5);
  assert.ok(layout.cameraPresets.corner && layout.cameraPresets.detail);
  assert.ok(layout.lights.shadow.normalBias >= 0.03);
  assert.ok(layout.lights.hemi.intensity >= 0.6);
  assert.ok(layout.lights.key.intensity >= 0.8);
  assert.ok(layout.shell.fogNear >= 16);
});
