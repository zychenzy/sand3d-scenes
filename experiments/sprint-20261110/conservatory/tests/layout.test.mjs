import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const layout = JSON.parse(fs.readFileSync(path.join(root, 'layout.json'), 'utf8'));

test('zones and cameras', () => {
  assert.ok(layout.meta.zones.includes('raised planted beds'));
  assert.ok(layout.meta.zones.includes('potting bench'));
  assert.ok(layout.meta.zones.includes('sitting nook'));
  assert.ok(layout.camera && layout.cameraPresets.corner && layout.cameraPresets.close);
});

test('dining chair faces the tea table', () => {
  const chair = layout.instances.find((i) => i.id === 'nook_chair');
  const table = layout.instances.find((i) => i.id === 'nook_table');
  const fx = Math.sin(chair.rotationY);
  const fz = Math.cos(chair.rotationY);
  const dx = table.position[0] - chair.position[0];
  const dz = table.position[2] - chair.position[2];
  const dot = fx * dx + fz * dz;
  assert.ok(dot > 0.4, `facing dot ${dot}`);
  assert.equal(chair.kind, 'dining_chair');
});

test('pots are a handful of work objects, not a cloned row', () => {
  const pots = layout.instances.filter((i) => i.kind === 'flowerpot');
  assert.ok(pots.length >= 2 && pots.length <= 4, `pot count ${pots.length}`);
  const heights = pots.map((p) => {
    const sy = Array.isArray(p.scale) ? p.scale[1] : (p.scale || 1);
    return layout.assets.flowerpot.targetHeight * sy;
  });
  const unique = new Set(heights.map((h) => h.toFixed(2)));
  assert.ok(unique.size >= 2, 'pots should not share one scale');
  const zs = pots.map((p) => p.position[2]);
  const xs = pots.map((p) => p.position[0]);
  assert.ok(Math.max(...xs) - Math.min(...xs) > 0.3);
  assert.ok(Math.max(...zs) - Math.min(...zs) > 0.4);
});

test('catalog glbs are symlinks into shared scene bakes', () => {
  for (const spec of Object.values(layout.assets)) {
    assert.ok(spec.glb.startsWith('assets/'), spec.glb);
    assert.ok(!spec.glb.includes('..'), spec.glb);
    const p = path.join(root, spec.glb);
    assert.ok(fs.lstatSync(p).isSymbolicLink(), spec.glb);
    const real = fs.realpathSync(p);
    assert.ok(!real.includes(`${path.sep}experiments${path.sep}`), real);
    assert.ok(fs.statSync(p).size > 500, spec.glb);
  }
});

test('scene source builds ribs and varied silhouettes', () => {
  const src = fs.readFileSync(path.join(root, 'conservatory.js'), 'utf8');
  for (const name of ['vaultGlass', 'canopy', 'palm', 'fern', 'climber', 'pottingBench', 'bigLeaf']) {
    assert.ok(src.includes(`function ${name}`), name);
  }
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  assert.equal(/https?:\/\//.test(html), false);
});

test('potting stool sits in front of the back wall', () => {
  const stool = layout.instances.find((i) => i.id === 'potting_stool');
  assert.ok(stool.position[2] > -2.5);
  assert.ok(stool.position[0] > 2);
});
