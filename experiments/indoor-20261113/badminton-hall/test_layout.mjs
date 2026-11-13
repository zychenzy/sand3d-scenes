import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { HALL, expandedCourt } from './court_spec.mjs';

const sceneDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(sceneDir, '../../..');
const layout = JSON.parse(fs.readFileSync(path.join(sceneDir, 'layout.json'), 'utf8'));

function worldAabb(item) {
  const [lx, lz] = item.footprint;
  const hx = lx / 2;
  const hz = lz / 2;
  const rot = item.rotationY || 0;
  const c = Math.cos(rot);
  const s = Math.sin(rot);
  let minX = Infinity;
  let maxX = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;
  for (const [x, z] of [[-hx, -hz], [hx, -hz], [hx, hz], [-hx, hz]]) {
    const wx = item.position[0] + c * x + s * z;
    const wz = item.position[2] - s * x + c * z;
    minX = Math.min(minX, wx);
    maxX = Math.max(maxX, wx);
    minZ = Math.min(minZ, wz);
    maxZ = Math.max(maxZ, wz);
  }
  return { x0: minX, x1: maxX, z0: minZ, z1: maxZ };
}

function overlaps(a, b) {
  return a.x0 < b.x1 - 1e-6 && a.x1 > b.x0 + 1e-6 && a.z0 < b.z1 - 1e-6 && a.z1 > b.z0 + 1e-6;
}

const items = [...layout.instances, ...layout.procedural];

test('reused GLBs and the gym vendor resolve from the repo root', () => {
  const html = fs.readFileSync(path.join(sceneDir, 'index.html'), 'utf8');
  const lib = fs.readFileSync(path.join(sceneDir, 'scene_lib.js'), 'utf8');
  assert.match(html, /\.\.\/\.\.\/\.\.\/gym\/vendor\/three\.module\.js/);
  assert.match(lib, /\.\.\/\.\.\/\.\.\/gym\/vendor\/controls\/OrbitControls\.js/);
  assert.match(lib, /\.\.\/\.\.\/\.\.\/gym\/vendor\/loaders\/GLTFLoader\.js/);
  for (const rel of [
    '../../../gym/vendor/three.module.js',
    '../../../gym/vendor/controls/OrbitControls.js',
    '../../../gym/vendor/loaders/GLTFLoader.js',
  ]) {
    assert.ok(fs.existsSync(path.resolve(sceneDir, rel)), rel);
  }
  assert.equal(Object.keys(layout.assets).length >= 6, true);
  for (const [kind, spec] of Object.entries(layout.assets)) {
    assert.ok(spec.glb.startsWith('../../../'), kind);
    assert.equal(spec.glb.includes('badminton-hall'), false, kind);
    const abs = path.resolve(sceneDir, spec.glb);
    assert.ok(abs.startsWith(repoRoot + path.sep), abs);
    assert.equal(abs.includes(`${path.sep}badminton-hall${path.sep}`), false);
    assert.ok(fs.existsSync(abs), abs);
    assert.ok(spec.targetHeight > 0.15 && spec.targetHeight < 2.2, kind);
  }
});

test('furniture stays outside the legal run-off and the gallery run-off', () => {
  const strict = HALL.centersX.map((cx) => expandedCourt(cx, 0, 0));
  const legal = HALL.centersX.map((cx) => expandedCourt(cx, HALL.minSide, HALL.minBack));
  for (const item of items) {
    const box = worldAabb(item);
    if (item.floorGraphic) {
      for (const court of strict) {
        assert.equal(overlaps(box, court), false, `${item.id} paints over a court`);
      }
      continue;
    }
    for (const court of legal) {
      assert.equal(overlaps(box, court), false, `${item.id} enters the run-off`);
    }
    if (item.position[0] < HALL.galleryInnerX) {
      assert.ok(box.x1 <= HALL.galleryInnerX + 1e-6, `${item.id} crosses the 2 m side run-off`);
    }
  }
});

test('cameras, two courts, and the entry chair face the desk', () => {
  assert.ok(layout.camera.position && layout.camera.target);
  assert.ok(layout.cameraPresets.corner && layout.cameraPresets.close);
  assert.equal(layout.meta.style, 'Toon hard');
  const chair = layout.instances.find((i) => i.id === 'desk_chair');
  const desk = layout.instances.find((i) => i.id === 'sign_in_desk');
  assert.ok(chair.position[0] > desk.position[0]);
  assert.ok(Math.abs(chair.rotationY + Math.PI / 2) < 1e-6);
  const benches = layout.instances.filter((i) => i.kind === 'museum_bench');
  assert.equal(benches.length, 4);
  for (const bench of benches) assert.equal(bench.rotationY, 0);
});
