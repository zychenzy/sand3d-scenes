import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const layout = JSON.parse(fs.readFileSync(path.join(root, 'layout.json'), 'utf8'));
const { width: W, depth: D, height: H } = layout.meta.room;

assert.equal(layout.meta.title, 'Afterglow Records');
assert.ok(W > 8 && D > 6 && H > 2.5, 'room has shop scale');

const required = [
  'sofa_solid', 'coffee_table', 'square_table', 'dining_chair', 'library_lamp',
  'speaker', 'guitar_amp', 'pendant_lamp', 'cash_register', 'pos_terminal',
  'bar_stool', 'flowerpot', 'cup_mug', 'museum_plinth', 'piano_bench',
];
for (const kind of required) {
  const spec = layout.assets[kind];
  assert.ok(spec, `missing asset ${kind}`);
  const glb = path.join(root, spec.glb);
  assert.ok(fs.existsSync(glb), `missing glb ${spec.glb}`);
  assert.ok(spec.targetHeight > 0.05 && spec.targetHeight < 2.5, `${kind} height`);
}

const ids = new Set();
for (const inst of layout.instances) {
  assert.ok(layout.assets[inst.kind], `instance ${inst.id} kind`);
  assert.ok(!ids.has(inst.id), `duplicate id ${inst.id}`);
  ids.add(inst.id);
  const [x, y, z] = inst.position;
  assert.ok(Math.abs(x) < W / 2 + 0.35, `${inst.id} x ${x} outside room`);
  assert.ok(Math.abs(z) < D / 2 + 0.35, `${inst.id} z ${z} outside room`);
  assert.ok(y >= -0.01 && y < H, `${inst.id} y ${y}`);
}

assert.ok(ids.has('audition_chair') && ids.has('sofa_lounge'));
assert.ok(ids.has('register') && ids.has('stool_staff') && ids.has('stool_guest'));

const chair = layout.instances.find((i) => i.id === 'audition_chair');
assert.ok(Math.abs(chair.rotationY + Math.PI / 2) < 0.2, 'audition chair faces -X toward the desk');
const sofa = layout.instances.find((i) => i.id === 'sofa_lounge');
assert.ok(Math.abs(sofa.rotationY + Math.PI / 2) < 0.2, 'sofa faces +X toward the listening table');
const guest = layout.instances.find((i) => i.id === 'stool_guest');
const staff = layout.instances.find((i) => i.id === 'stool_staff');
assert.ok(guest.rotationY > 1 && guest.rotationY < 2, 'guest stool faces the counter');
assert.ok(staff.rotationY < -1 && staff.rotationY > -2, 'staff stool faces back across the counter');

assert.ok(layout.cameraPresets.corner && layout.cameraPresets.close);
assert.ok(layout.lights.points.length >= 4, 'evening practicals');
assert.ok(layout.fixtures.bins.length >= 4, 'record bins');
assert.ok(layout.fixtures.covers.length >= 8, 'album wall');
assert.ok(layout.fixtures.bays.length >= 2, 'stock bays');
assert.equal(layout.fixtures.counter.height > 0.9, true);

const notes = layout.meta.notes.join(' ').toLowerCase();
assert.ok(notes.includes('listening') && notes.includes('cashier'));

const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
assert.ok(html.includes('record-store.js'));
assert.ok(html.includes('./vendor/three.module.js'));
assert.ok(fs.existsSync(path.join(root, 'vendor', 'three.module.js')), 'vendor symlink');

console.log(`record-store layout ok — ${layout.instances.length} instances, ${layout.fixtures.bins.length} bins, ${layout.fixtures.covers.length} wall sleeves`);
