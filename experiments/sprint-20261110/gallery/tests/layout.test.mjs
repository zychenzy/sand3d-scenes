import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const layout = JSON.parse(readFileSync(resolve(root, 'layout.json'), 'utf8'));

const RAW = {
  museum_bench: { hx: 0.209, hy: 0.456, hz: 0.75 },
  museum_plinth: { hx: 0.342, hy: 1.8, hz: 0.342 },
  museum_vitrine: { hx: 0.406, hy: 0.9, hz: 0.406 },
  display_bookcase: { hx: 0.417, hy: 2.0, hz: 0.204 },
  flowerpot: { hx: 0.125, hy: 0.207, hz: 0.125 },
  library_lamp: { hx: 0.171, hy: 0.451, hz: 0.171 },
};

function footprint(inst) {
  const spec = layout.assets[inst.kind];
  const raw = RAW[inst.kind];
  const height = inst.targetHeight || spec.targetHeight;
  const s = height / raw.hy;
  const sc = inst.scale || [1, 1, 1];
  let hx = raw.hx * s * (sc[0] || 1);
  let hz = raw.hz * s * (sc[2] || 1);
  const rot = inst.rotationY || 0;
  if (Math.abs(Math.sin(rot)) > 0.7) [hx, hz] = [hz, hx];
  return { id: inst.id, kind: inst.kind, x: inst.position[0], y: inst.position[1], z: inst.position[2], hx, hz };
}

test('shared GLBs resolve and are not copied into this scene', () => {
  assert.equal(existsSync(resolve(root, 'assets')), false);
  for (const spec of Object.values(layout.assets)) {
    assert.equal(spec.glb.includes('assets/'), true);
    assert.equal(existsSync(resolve(root, spec.glb)), true);
  }
});

test('benches are long slabs aimed at a wall, and nothing is a sofa', () => {
  const banned = /sofa|armchair|couch|dining_chair|lounge_chair/i;
  for (const inst of layout.instances) assert.equal(banned.test(inst.kind), false);
  const benches = layout.instances.filter((i) => i.kind === 'museum_bench');
  assert.equal(benches.length, 3);
  const alcove = benches.find((b) => b.id === 'bench_alcove');
  assert.ok(Math.abs((alcove.rotationY || 0)) < 0.2);
  assert.ok(alcove.scale[2] > 1.2);
  for (const id of ['bench_nave', 'bench_court']) {
    const b = benches.find((item) => item.id === id);
    assert.ok(Math.abs(b.rotationY - Math.PI / 2) < 0.05);
    assert.ok(b.scale[2] > 1.2);
    assert.ok(b.scale[0] < 1.15);
  }
});

test('plinths, vitrine, and spotlights are placed inside the room without stacking', () => {
  assert.ok(layout.instances.filter((i) => i.kind === 'museum_plinth').length >= 4);
  assert.equal(layout.instances.filter((i) => i.kind === 'museum_vitrine').length, 1);
  assert.ok(layout.lights.spots.length >= 6);
  const room = layout.meta.room;
  const feet = layout.instances.map(footprint);
  for (const f of feet) {
    assert.ok(Math.abs(f.x) + f.hx < room.width / 2 - 0.15, `${f.id} leaves the room in x`);
    assert.ok(Math.abs(f.z) + f.hz < room.depth / 2 - 0.15, `${f.id} leaves the room in z`);
    assert.ok(f.y >= 0 && f.y < room.height, `${f.id} height`);
  }
  const floor = feet.filter((f) => f.y < 0.2);
  for (let i = 0; i < floor.length; i++) {
    for (let j = i + 1; j < floor.length; j++) {
      const a = floor[i];
      const b = floor[j];
      const gapX = Math.abs(a.x - b.x) - a.hx - b.hx;
      const gapZ = Math.abs(a.z - b.z) - a.hz - b.hz;
      const separated = gapX > 0.35 || gapZ > 0.35;
      assert.ok(separated, `${a.id} overlaps ${b.id} (gapX ${gapX.toFixed(2)} gapZ ${gapZ.toFixed(2)})`);
    }
  }
});

test('cameras and offline entry point exist', () => {
  assert.ok(layout.cameraPresets.corner.position.length === 3);
  assert.ok(layout.cameraPresets.close.position.length === 3);
  const html = readFileSync(resolve(root, 'index.html'), 'utf8');
  assert.match(html, /museum\/vendor\/three\.module\.js/);
  assert.doesNotMatch(html, /https?:\/\//);
  const scene = readFileSync(resolve(root, 'gallery.js'), 'utf8');
  assert.equal(/sofa/i.test(scene), false);
});
