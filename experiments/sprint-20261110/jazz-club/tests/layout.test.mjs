import assert from 'node:assert/strict';
import { readFileSync, lstatSync, realpathSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const layout = JSON.parse(readFileSync(join(root, 'layout.json'), 'utf8'));

function forward(rotationY) {
  return [Math.sin(rotationY), Math.cos(rotationY)];
}

function dot(a, b) {
  return a[0] * b[0] + a[1] * b[1];
}

function norm(x, z) {
  const l = Math.hypot(x, z) || 1;
  return [x / l, z / l];
}

const byId = Object.fromEntries(layout.instances.map((i) => [i.id, i]));

test('assets are symlinks to shared GLBs, not copies', () => {
  for (const spec of Object.values(layout.assets)) {
    const path = join(root, spec.glb);
    const st = lstatSync(path);
    assert.equal(st.isSymbolicLink(), true, spec.glb);
    const real = statSync(path);
    assert.equal(real.isFile(), true, spec.glb);
    assert.ok(real.size > 1000, spec.glb);
    assert.equal(realpathSync(path).includes('/jazz-club/'), false, spec.glb);
  }
});

test('instances reference known kinds and stay inside the room', () => {
  const { width, depth, height } = layout.meta.room;
  const ids = new Set();
  for (const inst of layout.instances) {
    assert.ok(layout.assets[inst.kind], inst.id);
    assert.equal(ids.has(inst.id), false, inst.id);
    ids.add(inst.id);
    const [x, y, z] = inst.position;
    assert.ok(x > -width / 2 + 0.2 && x < width / 2 - 0.2, inst.id + ' x');
    assert.ok(z > -depth / 2 + 0.2 && z < depth / 2 - 0.2, inst.id + ' z');
    assert.ok(y >= 0 && y < height - 0.2, inst.id + ' y');
  }
});

test('audience and side chairs face their table and the stage', () => {
  for (const inst of layout.instances) {
    if (inst.role !== 'audience' && inst.role !== 'side') continue;
    const table = byId[inst.at];
    assert.ok(table, inst.id);
    const f = forward(inst.rotationY || 0);
    const toTable = norm(table.position[0] - inst.position[0], table.position[2] - inst.position[2]);
    const dist = Math.hypot(table.position[0] - inst.position[0], table.position[2] - inst.position[2]);
    assert.ok(dist > 0.55 && dist < 0.95, inst.id + ' dist ' + dist.toFixed(3));
    assert.ok(dot(f, toTable) > 0.75, inst.id + ' table ' + dot(f, toTable).toFixed(3));
    const stage = dot(f, [0, -1]);
    if (inst.role === 'audience') assert.ok(stage > 0.85, inst.id + ' stage ' + stage.toFixed(3));
    else assert.ok(stage > 0.15, inst.id + ' stage ' + stage.toFixed(3));
  }
});

test('bar stools face the bar and the bench faces the keyboard', () => {
  const bar = layout.meta.bar;
  for (const inst of layout.instances.filter((i) => i.role === 'bar')) {
    const f = forward(inst.rotationY || 0);
    assert.ok(dot(f, [-1, 0]) > 0.8, inst.id);
    assert.ok(inst.position[0] > bar.x + bar.depth / 2, inst.id);
    assert.ok(Math.abs(inst.position[2] - bar.z) < bar.length / 2, inst.id);
  }
  const bench = byId.bench;
  const piano = layout.meta.instruments.piano.position;
  const f = forward(bench.rotationY || 0);
  const toKeys = norm(piano[0] - bench.position[0], piano[2] - bench.position[2]);
  assert.ok(dot(f, toKeys) > 0.8);
  assert.equal(bench.position[1], layout.meta.stage.h);
});

test('stage holds the band and the bar stays on the left wall', () => {
  const st = layout.meta.stage;
  for (const [name, inst] of Object.entries(layout.meta.instruments)) {
    const [x, y, z] = inst.position;
    assert.equal(y, st.h, name);
    assert.ok(x > st.x0 + 0.05 && x < st.x1 - 0.05, name);
    assert.ok(z > st.z0 + 0.05 && z < st.z1 - 0.05, name);
  }
  const bar = layout.meta.bar;
  assert.ok(bar.x < -3.5);
  assert.ok(bar.height > 1 && bar.height < 1.2);
  assert.ok(bar.length > 2.5);
  const tables = layout.instances.filter((i) => i.kind === 'round_table');
  assert.equal(tables.length, 4);
  const zs = tables.map((t) => t.position[2]);
  const xs = tables.map((t) => t.position[0]);
  assert.ok(Math.max(...zs) - Math.min(...zs) > 2);
  assert.ok(Math.max(...xs) - Math.min(...xs) > 3);
});

test('cameras, spots and local entry do not need a CDN', () => {
  assert.ok(layout.cameraPresets.corner && layout.cameraPresets.close);
  assert.ok(layout.lights.spots.length >= 3);
  assert.ok(layout.lights.points.length >= 4);
  const html = readFileSync(join(root, 'index.html'), 'utf8');
  const js = readFileSync(join(root, 'jazz.js'), 'utf8');
  const lib = readFileSync(join(root, 'scene_lib.js'), 'utf8');
  for (const src of [html, js, lib]) {
    assert.equal(/https?:\/\//.test(src), false);
    assert.equal(/cdn/i.test(src), false);
  }
});
