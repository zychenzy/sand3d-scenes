import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const layout = JSON.parse(fs.readFileSync(path.join(root, 'layout.json'), 'utf8'));
const { width: W, depth: D, height: H } = layout.meta.room;

const ids = new Set();
for (const inst of layout.instances) {
  assert.ok(!ids.has(inst.id), `duplicate id ${inst.id}`);
  ids.add(inst.id);
  assert.ok(layout.assets[inst.kind], `unknown kind ${inst.kind}`);
  const [x, y, z] = inst.position;
  assert.ok(Math.abs(x) < W / 2 - 0.05, `${inst.id} x out of room`);
  assert.ok(Math.abs(z) < D / 2 - 0.05, `${inst.id} z out of room`);
  assert.ok(y >= 0 && y < H, `${inst.id} y out of room`);
  const file = path.join(root, layout.assets[inst.kind].glb);
  assert.ok(fs.existsSync(file), `missing ${layout.assets[inst.kind].glb}`);
}

assert.equal(layout.instances.find((i) => i.id === 'opt_chair_a').rotationY, -1.5708);
assert.equal(layout.instances.find((i) => i.id === 'stool_s0').rotationY, 3.1416);
assert.equal(layout.instances.find((i) => i.id === 'stool_e').rotationY, -1.5708);
assert.ok(layout.cameraPresets.corner && layout.cameraPresets.close && layout.cameraPresets.optics);

const kinds = new Set(layout.instances.map((i) => i.kind));
for (const need of ['square_table', 'dining_chair', 'bar_stool', 'museum_bench', 'display_bookcase', 'chalkboard', 'pendant_lamp']) {
  assert.ok(kinds.has(need), `missing kind ${need}`);
}

assert.ok(fs.existsSync(path.join(root, 'vendor', 'three.module.js')));
assert.ok(fs.existsSync(path.join(root, 'science-lab.js')));
console.log(`layout ok — ${layout.instances.length} instances, ${Object.keys(layout.assets).length} assets`);
