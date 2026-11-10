import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const layout = JSON.parse(readFileSync(join(root, 'layout.json'), 'utf8'));

function forward(rotationY, axis) {
  const ry = rotationY || 0;
  const s = Math.sin(ry);
  const c = Math.cos(ry);
  if (axis === '+z') return [s, c];
  if (axis === '-z') return [-s, -c];
  throw new Error(`unknown facing ${axis}`);
}

function dot(a, b) {
  const l = Math.hypot(b[0], b[1]) || 1;
  return (a[0] * b[0] + a[1] * b[1]) / l;
}

function worldFootprint(inst) {
  const asset = layout.assets[inst.kind];
  let x = asset.footprint[0];
  let z = asset.footprint[1];
  const sc = inst.scale;
  if (Array.isArray(sc)) {
    x *= sc[0] ?? 1;
    z *= sc[2] ?? sc[0] ?? 1;
  } else if (typeof sc === 'number') {
    x *= sc;
    z *= sc;
  }
  const ry = Math.abs(inst.rotationY || 0) % Math.PI;
  const swap = ry > Math.PI / 4 && ry < (3 * Math.PI) / 4;
  return swap ? [z, x] : [x, z];
}

function aabbOf(inst) {
  const [w, d] = worldFootprint(inst);
  const [x, , z] = inst.position;
  return { x0: x - w / 2, x1: x + w / 2, z0: z - d / 2, z1: z + d / 2 };
}

function inflate(box, m) {
  return { x0: box.x0 - m, x1: box.x1 + m, z0: box.z0 - m, z1: box.z1 + m };
}

function hits(px, pz, box) {
  return px >= box.x0 && px <= box.x1 && pz >= box.z0 && pz <= box.z1;
}

test('layout is metres and names the terrace', () => {
  assert.equal(layout.meta.units, 'metres');
  assert.match(layout.meta.title, /rooftop/i);
});

test('dining chairs face the table from both long sides', () => {
  const table = layout.instances.find((i) => i.role === 'dining-table');
  const chairs = layout.instances.filter((i) => i.role === 'dining-chair');
  assert.ok(chairs.length >= 4);
  let north = 0;
  let south = 0;
  for (const chair of chairs) {
    const asset = layout.assets[chair.kind];
    const fwd = forward(chair.rotationY, asset.facing);
    const toward = [table.position[0] - chair.position[0], table.position[2] - chair.position[2]];
    const alignment = dot(fwd, toward);
    assert.ok(alignment > 0.8, `${chair.id} alignment ${alignment.toFixed(3)}`);
    if (chair.position[2] > table.position[2]) south += 1;
    if (chair.position[2] < table.position[2]) north += 1;
    const [w, d] = worldFootprint(table);
    const outside =
      Math.abs(chair.position[0] - table.position[0]) > w / 2 + 0.02 ||
      Math.abs(chair.position[2] - table.position[2]) > d / 2 + 0.02;
    assert.ok(outside, `${chair.id} sits inside the tabletop`);
  }
  assert.ok(north >= 1 && south >= 1, 'chairs should face each other across the table');
});

test('lounge sofa faces the skyline and sits in the sunken bay', () => {
  const sofa = layout.instances.find((i) => i.role === 'lounge-sofa');
  const coffee = layout.instances.find((i) => i.role === 'lounge-table');
  const bench = layout.instances.find((i) => i.role === 'lounge-bench');
  const fwd = forward(sofa.rotationY, layout.assets[sofa.kind].facing);
  assert.ok(fwd[1] < -0.85, 'sofa should look toward -Z');
  assert.ok(coffee.position[2] < sofa.position[2] - 0.4, 'coffee table is between sofa and the view');
  assert.equal(sofa.position[1], layout.site.lounge.y);
  assert.equal(coffee.position[1], layout.site.lounge.y);
  assert.equal(bench.position[1], layout.site.lounge.y);
  const bay = layout.site.lounge;
  for (const inst of [sofa, coffee, bench]) {
    const box = aabbOf(inst);
    assert.ok(box.x0 >= bay.x0 - 0.05 && box.x1 <= bay.x1 + 0.05, inst.id);
    assert.ok(box.z0 >= bay.z0 - 0.05 && box.z1 <= bay.z1 + 0.05, inst.id);
  }
});

test('view parapet stays low and the near edge does not wall off the camera', () => {
  assert.ok(layout.site.parapet.viewH <= 0.55);
  assert.ok(layout.site.parapet.entryH <= 0.35);
  assert.ok(layout.site.parapet.sideH >= 0.8);
  assert.ok(layout.site.parapet.railH > layout.site.parapet.viewH);
});

test('pergola is timber-scaled and covers the table', () => {
  const p = layout.site.pergola;
  assert.ok(p.post <= 0.14 && p.beamH <= 0.16 && p.rafter <= 0.06);
  assert.ok(p.pitch >= 0.3, 'rafters are spaced so their shadows stay parallel stripes');
  const table = layout.instances.find((i) => i.role === 'dining-table');
  const [x, , z] = table.position;
  assert.ok(x > p.x0 && x < p.x1 && z > p.z0 && z < p.z1);
});

test('path clears stair, planters, beds, and furniture', () => {
  const obstacles = [];
  const stair = layout.site.stair;
  obstacles.push({ name: 'stair', ...inflate(stair, 0.05) });
  for (const b of [...layout.site.planters, ...layout.site.beds]) {
    obstacles.push({ name: b.id, ...inflate(b, 0.02) });
  }
  for (const inst of layout.instances) {
    if (inst.role === 'tabletop') continue;
    obstacles.push({ name: inst.id, ...inflate(aabbOf(inst), 0.05) });
  }
  const pts = layout.site.path;
  for (let i = 0; i < pts.length - 1; i++) {
    const [x0, z0] = pts[i];
    const [x1, z1] = pts[i + 1];
    const steps = Math.ceil(Math.hypot(x1 - x0, z1 - z0) / 0.25);
    for (let s = 0; s <= steps; s++) {
      const t = s / steps;
      const x = x0 + (x1 - x0) * t;
      const z = z0 + (z1 - z0) * t;
      for (const box of obstacles) {
        assert.ok(!hits(x, z, box), `path hits ${box.name} at ${x.toFixed(2)},${z.toFixed(2)}`);
      }
    }
  }
});

test('city silhouette frames a lower center and sits behind the terrace', () => {
  const deck = layout.site.deck;
  let saddle = 0;
  let towers = 0;
  for (const b of layout.site.city) {
    const nearFace = b.z + b.d / 2;
    assert.ok(nearFace < deck.z0 - 1.2, `${b.id} crowds the parapet`);
    if (Math.abs(b.x) < 1.6 && b.h < 5) saddle += 1;
    if (Math.abs(b.x) > 4 && b.h > 7) towers += 1;
  }
  assert.ok(saddle >= 1, 'center skyline should dip');
  assert.ok(towers >= 2, 'taller masses belong at the sides');
});

test('vegetation kinds are mixed and the tree is off the view axis', () => {
  const kinds = new Set(layout.site.plants.map((p) => p.kind));
  for (const need of ['olive', 'fig', 'grass', 'plume', 'shrub', 'rosemary', 'basil', 'thyme', 'salvia', 'fern', 'vine']) {
    assert.ok(kinds.has(need), need);
  }
  const olive = layout.site.plants.find((p) => p.kind === 'olive');
  assert.ok(olive.x < -4, 'olive should frame the side, not sit in the view');
});

test('golden-hour key is low and warm, with no spot lights', () => {
  const key = layout.lights.key;
  assert.ok(key.position[1] > 4 && key.position[1] < 9);
  assert.ok(key.intensity > layout.lights.fill.intensity);
  assert.equal(layout.lights.points, undefined);
  assert.ok(key.color.startsWith('#ff') || key.color.startsWith('#f'));
});

test('cameras and shading hooks exist', () => {
  assert.ok(layout.camera.position[1] > 2);
  assert.ok(layout.cameraPresets.corner && layout.cameraPresets.close);
  const close = layout.cameraPresets.close.position;
  const def = layout.camera.position;
  const dist = (p, t) => Math.hypot(p[0] - t[0], p[1] - t[1], p[2] - t[2]);
  assert.ok(dist(close, layout.cameraPresets.close.target) < dist(def, layout.camera.target));
  const html = readFileSync(join(root, 'index.html'), 'utf8');
  assert.match(html, /Unlit/);
  const lib = readFileSync(join(root, 'scene_lib.js'), 'utf8');
  assert.match(lib, /toUnlitMaterial/);
  assert.match(lib, /get\('mode'\) === 'unlit'/);
  assert.match(lib, /MeshToonMaterial/);
});

test('reused GLBs resolve through relative symlinks', () => {
  for (const spec of Object.values(layout.assets)) {
    const path = join(root, spec.glb);
    assert.ok(existsSync(path), spec.glb);
  }
  assert.ok(existsSync(join(root, 'vendor/three.module.js')));
});
