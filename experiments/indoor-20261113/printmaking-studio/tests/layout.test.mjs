import assert from 'node:assert/strict';
import { readFileSync, lstatSync, realpathSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const repo = path.resolve(root, '../../..');
const layout = JSON.parse(readFileSync(path.join(root, 'layout.json'), 'utf8'));
const js = readFileSync(path.join(root, 'studio.js'), 'utf8');
const html = readFileSync(path.join(root, 'index.html'), 'utf8');
const lib = readFileSync(path.join(root, 'scene_lib.js'), 'utf8');

function forward(rot) {
  return [Math.sin(rot), Math.cos(rot)];
}

function fp(id) {
  const found = layout.footprints.find((item) => item.id === id);
  if (!found) throw new Error(`missing footprint ${id}`);
  return found;
}

function center(spec) {
  return [(spec.min[0] + spec.max[0]) / 2, (spec.min[1] + spec.max[1]) / 2];
}

function area(spec) {
  return (spec.max[0] - spec.min[0]) * (spec.max[1] - spec.min[1]);
}

function overlaps(a, b) {
  return a.min[0] < b.max[0] && a.max[0] > b.min[0] && a.min[1] < b.max[1] && a.max[1] > b.min[1];
}

function distToRect(point, spec) {
  const dx = Math.max(spec.min[0] - point[0], 0, point[0] - spec.max[0]);
  const dz = Math.max(spec.min[1] - point[1], 0, point[1] - spec.max[1]);
  return Math.hypot(dx, dz);
}

function anchorXZ(id) {
  const spec = layout.footprints.find((item) => item.id === id);
  if (spec) return center(spec);
  const inst = layout.instances.find((item) => item.id === id);
  if (inst) return [inst.position[0], inst.position[2]];
  throw new Error(`unknown anchor ${id}`);
}

test('room, press, and shop tables are sized for work', () => {
  const { width, depth, height } = layout.meta.room;
  assert.equal(layout.meta.units, 'metres');
  assert.ok(width >= 11 && width <= 13);
  assert.ok(depth >= 8 && depth <= 11);
  assert.ok(height >= 2.9 && height <= 3.5);
  const press = fp('press');
  const ink = fp('ink_table');
  const paper = fp('paper_table');
  assert.ok(press.max[0] - press.min[0] >= 1.8, 'press bed length');
  assert.ok(press.wheel.radius >= 0.38 && press.wheel.radius <= 0.55);
  assert.ok(press.wheel.z > press.max[1] - 0.08, 'star wheel sits on the room side of the bed');
  assert.ok(press.wheel.y - press.wheel.radius > 0.2, 'wheel clears the floor');
  assert.ok(area(ink) >= 2.6, `inking area ${area(ink)}`);
  assert.ok(area(paper) >= 2.2, `paper area ${area(paper)}`);
  assert.ok(Math.min(ink.max[0] - ink.min[0], ink.max[1] - ink.min[1]) >= 1.05);
  assert.ok(Math.min(paper.max[0] - paper.min[0], paper.max[1] - paper.min[1]) >= 1.05);
  assert.ok(ink.top >= 0.88 && ink.top <= 0.98);
  assert.ok(paper.top >= 0.74 && paper.top <= 0.82);
  assert.ok(press.top >= 0.82 && press.top <= 0.96);
  for (const key of ['corner', 'close']) {
    assert.equal(layout.cameraPresets[key].position.length, 3);
    assert.equal(layout.cameraPresets[key].target.length, 3);
  }
});

test('clean paper stays west and wet ink stays east', () => {
  for (const id of ['paper_table', 'flat_a', 'flat_b', 'clean_sink']) {
    assert.ok(fp(id).max[0] < -2, `${id} is not on the clean side`);
  }
  for (const id of ['ink_table', 'dirty_sink', 'acid', 'hot_plate']) {
    assert.ok(fp(id).min[0] > 1.2, `${id} is not on the dirty side`);
  }
  assert.ok(fp('press').min[0] < 0 && fp('press').max[0] > 0);
  assert.ok(fp('clean_sink').max[0] < fp('paper_table').min[0]);
  assert.ok(fp('paper_table').max[0] + 1.0 <= fp('press').min[0]);
  assert.ok(fp('press').max[0] + 1.0 <= fp('ink_table').min[0]);
  assert.ok(fp('press').max[1] + 1.3 <= fp('ink_table').min[1]);
});

test('footprints and the operator bay do not collide', () => {
  const solids = layout.footprints;
  for (let i = 0; i < solids.length; i++) {
    for (let j = i + 1; j < solids.length; j++) {
      assert.equal(overlaps(solids[i], solids[j]), false, `${solids[i].id} hits ${solids[j].id}`);
    }
  }
  for (const bay of layout.keepClear) {
    for (const solid of solids) {
      assert.equal(overlaps(bay, solid), false, `${bay.id} hits ${solid.id}`);
    }
  }
});

test('clean and dirty walks stay 0.28m off the furniture', () => {
  const solids = layout.footprints;
  for (const [name, points] of Object.entries(layout.circulation)) {
    assert.ok(points.length >= 6, name);
    for (const point of points) {
      for (const solid of solids) {
        const gap = distToRect(point, solid);
        assert.ok(gap >= 0.28, `${name} ${point} near ${solid.id} (${gap.toFixed(2)})`);
      }
    }
  }
  for (const point of layout.circulation.clean) {
    assert.ok(distToRect(point, fp('ink_table')) > 0.8);
    assert.ok(distToRect(point, fp('acid')) > 0.8);
  }
  for (const point of layout.circulation.dirty) {
    assert.ok(distToRect(point, fp('paper_table')) > 0.8);
    assert.ok(distToRect(point, fp('clean_sink')) > 0.8);
    assert.ok(point[0] > 1.2);
  }
});

test('seats face their work surface', () => {
  const seated = layout.instances.filter((item) => item.faces);
  assert.ok(seated.length >= 4);
  for (const seat of seated) {
    const from = [seat.position[0], seat.position[2]];
    const [fx, fz] = forward(seat.rotationY);
    const to = anchorXZ(seat.faces);
    const dx = to[0] - from[0];
    const dz = to[1] - from[1];
    const dot = (fx * dx + fz * dz) / Math.hypot(dx, dz);
    assert.ok(dot > 0.85, `${seat.id} faces ${seat.faces} dot=${dot.toFixed(3)}`);
  }
});

test('shared GLBs and vendor are symlinks inside the repo', () => {
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

test('page stays offline and toon-hard, with a real unlit path', () => {
  assert.match(html, /"three": "\.\/vendor\/three\.module\.js"/);
  assert.doesNotMatch(html, /https?:\/\//);
  assert.doesNotMatch(js, /https?:\/\//);
  assert.doesNotMatch(lib, /https?:\/\//);
  assert.match(lib, /MeshToonMaterial/);
  assert.match(lib, /MeshBasicMaterial/);
  assert.match(lib, /gradientMap/);
  assert.match(lib, /shot/);
  assert.match(lib, /mode'\) === 'unlit'|get\('mode'\) === 'unlit'/);
  assert.match(js, /starWheel/);
  assert.match(js, /ferric/);
  assert.match(js, /flatFile/);
  assert.match(js, /dryingLines/);
  assert.match(js, /dryingRack/);
  assert.doesNotMatch(js, /easel/i);
  assert.doesNotMatch(JSON.stringify(layout.assets), /easel/);
});
