import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, realpathSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { audit, RANGE, lines } from '../range_spec.mjs';

const layout = JSON.parse(readFileSync(new URL('../layout.json', import.meta.url), 'utf8'));

test('18 m face, waiting line, equipment line, and lane spacing', () => {
  const L = lines();
  assert.equal(L.shoot - RANGE.faceZ, 18);
  assert.equal(L.wait - L.shoot, 3);
  assert.equal(L.equip - L.wait, 4);
  assert.equal(L.shoot - L.three, 3);
  assert.equal(RANGE.centerY, 1.3);
  assert.ok(RANGE.lanePitch >= RANGE.minAthlete);
  assert.equal(RANGE.buttAnchorZ + RANGE.faceLocalZ, RANGE.faceZ);
});

test('lanes, waiting path, and safety zones', () => {
  const errors = audit(layout);
  assert.deepEqual(errors, [], errors.join('\n'));
});

test('shared meshes and three.js are references, bakes stay local', () => {
  const sceneUrl = new URL('..', import.meta.url);
  const scenePath = fileURLToPath(sceneUrl);
  for (const [kind, spec] of Object.entries(layout.assets)) {
    const real = realpathSync(fileURLToPath(new URL(spec.glb, sceneUrl)));
    if (spec.glb.startsWith('./assets/')) {
      assert.ok(real.startsWith(scenePath), `${kind} bake left the scene`);
      assert.ok(statSync(real).size > 1000, `${kind} bake is empty`);
    } else {
      assert.ok(!real.includes('/experiments/indoor30-20261113/'), `${kind} copied into the batch`);
      assert.ok(real.includes('/assets/'), real);
    }
  }
  const vendor = realpathSync(fileURLToPath(new URL('../../../gym/vendor/three.module.js', sceneUrl)));
  assert.ok(vendor.endsWith('/gym/vendor/three.module.js'), vendor);
  assert.ok(!vendor.includes('/experiments/indoor30-20261113/'));
});
