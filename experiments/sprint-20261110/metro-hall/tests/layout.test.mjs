import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const layout = JSON.parse(readFileSync(join(dir, 'layout.json'), 'utf8'));
const indexHtml = readFileSync(join(dir, 'index.html'), 'utf8');
const metro = readFileSync(join(dir, 'metro.js'), 'utf8');

test('room is a concourse, not a closet', () => {
  const { width, depth, height } = layout.meta.room;
  assert.ok(width >= 12 && depth >= 12 && height >= 4);
  assert.deepEqual(layout.meta.zones, ['unpaid concourse', 'paid hall']);
});

test('shared GLBs are referenced, not copied into this folder', () => {
  assert.equal(existsSync(join(dir, 'assets')), false);
  for (const [kind, spec] of Object.entries(layout.assets)) {
    const file = resolve(dir, spec.glb);
    assert.equal(existsSync(file), true, `${kind} missing ${spec.glb}`);
    assert.match(spec.glb, /^\.\.\/\.\.\/\.\.\//);
  }
  assert.equal(existsSync(resolve(dir, '../../../museum/vendor/three.module.js')), true);
});

test('entry html stays offline and points at the shared vendor', () => {
  assert.match(indexHtml, /museum\/vendor\/three\.module\.js/);
  assert.doesNotMatch(indexHtml, /https?:\/\//);
  assert.match(indexHtml, /metro\.js/);
});

test('benches face ±Z and the info bench faces the screen', () => {
  const benches = layout.instances.filter((i) => i.kind === 'museum_bench');
  assert.equal(benches.length, 3);
  for (const b of benches) {
    assert.ok(Math.abs(b.rotationY - Math.PI / 2) < 0.02, b.id);
  }
  const tv = layout.instances.find((i) => i.id === 'info_screen');
  const bench = layout.instances.find((i) => i.id === 'bench_info');
  assert.equal(tv.kind, 'tv');
  assert.ok(Math.abs(tv.rotationY + Math.PI / 2) < 0.02, 'screen turns from local X toward +Z');
  assert.ok(bench.position[2] > tv.position[2], 'bench should sit on the +Z side of the screen');
  assert.ok(Math.abs(bench.position[0] - tv.position[0]) < 0.4);
  const mapBench = layout.instances.find((i) => i.id === 'bench_map');
  assert.ok(mapBench.position[2] < -2, 'map bench stays in the paid hall');
});

test('camera presets and gate-facing notes exist', () => {
  assert.ok(layout.camera.position.length === 3);
  assert.ok(layout.cameraPresets.corner && layout.cameraPresets.close);
  assert.match(metro, /addGates/);
  assert.match(metro, /addStreetStair/);
  assert.match(metro, /addPlatformStair/);
  assert.match(metro, /addColumns/);
  assert.match(metro, /NORTH QUAY/);
});
