import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const layout = JSON.parse(readFileSync(resolve(root, 'layout.json'), 'utf8'));
const html = readFileSync(resolve(root, 'index.html'), 'utf8');
const scene = readFileSync(resolve(root, 'classroom.js'), 'utf8');
const lib = readFileSync(resolve(root, 'scene_lib.js'), 'utf8');

function forward(rot) {
  return [Math.sin(rot), Math.cos(rot)];
}

function rectOf(b) {
  return { id: b.id, cx: b.x, cz: b.z, hx: b.w / 2, hz: b.d / 2, rot: b.rotY || 0 };
}

function overlaps(a, b, allow = 0.04) {
  const axes = [
    [Math.cos(a.rot), -Math.sin(a.rot)],
    [Math.sin(a.rot), Math.cos(a.rot)],
    [Math.cos(b.rot), -Math.sin(b.rot)],
    [Math.sin(b.rot), Math.cos(b.rot)],
  ];
  for (const [ax, az] of axes) {
    const extent = (r) => {
      const lx = Math.abs(Math.cos(r.rot) * ax + -Math.sin(r.rot) * az);
      const lz = Math.abs(Math.sin(r.rot) * ax + Math.cos(r.rot) * az);
      return r.hx * lx + r.hz * lz;
    };
    const delta = Math.abs(a.cx * ax + a.cz * az - (b.cx * ax + b.cz * az));
    if (delta >= extent(a) + extent(b) - allow) return false;
  }
  return true;
}

test('page is offline, vendored, and has a real unlit toggle', () => {
  assert.match(html, /classroom\.js/);
  assert.match(html, /vendor\/three\.module\.js/);
  assert.doesNotMatch(html, /https?:\/\//);
  assert.match(html, /btn-unlit/);
  assert.match(lib, /MeshToonMaterial/);
  assert.match(lib, /MeshBasicMaterial/);
  assert.match(lib, /toUnlitMaterial/);
  assert.match(lib, /PCFHardShadowMap/);
  assert.match(lib, /gradientMap/);
  assert.match(lib, /get\('mode'\) === 'unlit'/);
  assert.match(scene, /onBeforeShade/);
  assert.equal(existsSync(resolve(root, 'vendor/three.module.js')), true);
  assert.equal(existsSync(resolve(root, 'vendor/controls/OrbitControls.js')), true);
});

test('baked assets resolve inside this folder', () => {
  for (const [kind, spec] of Object.entries(layout.assets)) {
    assert.match(spec.glb, /^assets\//, kind);
    assert.equal(existsSync(resolve(root, spec.glb)), true, spec.glb);
    assert.ok(spec.footprint[0] > 0.2 && spec.footprint[1] > 0.2, kind);
  }
});

test('writing tables are long and reachable, and the seat clears the top', () => {
  const tables = layout.blocks.filter((b) => b.role === 'writing_table');
  assert.equal(tables.length, 6);
  const chairH = layout.assets.dining_chair.targetHeight;
  const seat = layout.meta.seatFraction * chairH;
  for (const t of tables) {
    assert.ok(t.w >= 2.6, t.id);
    assert.ok(t.d >= 0.62 && t.d <= 0.82, `${t.id} depth ${t.d}`);
    assert.ok(t.h >= 0.72 && t.h <= 0.78, t.id);
    const gap = t.h - seat;
    assert.ok(gap > 0.26 && gap < 0.36, `${t.id} gap ${gap}`);
  }
  assert.ok(chairH < 1.15 && chairH > 0.95);
});

test('every student chair faces the teaching wall and its own table', () => {
  const byId = Object.fromEntries(layout.blocks.map((b) => [b.id, b]));
  const students = layout.instances.filter((i) => i.faces === 'teaching_wall');
  assert.equal(students.length, 18);
  const perTable = {};
  for (const inst of students) {
    const [fx, fz] = forward(inst.rotationY || 0);
    assert.ok(fz < -0.9, `${inst.id} forward z ${fz}`);
    assert.ok(Math.abs(fx) < 0.2, `${inst.id} yaw`);
    const table = byId[inst.table];
    assert.equal(table.role, 'writing_table');
    const toward = (table.x - inst.position[0]) * fx + (table.z - inst.position[2]) * fz;
    assert.ok(toward > 0.2, `${inst.id} toward ${toward}`);
    assert.ok(inst.position[2] > table.z + 0.3, inst.id);
    assert.ok(Math.abs(inst.position[0] - table.x) < table.w / 2, inst.id);
    perTable[inst.table] = (perTable[inst.table] || 0) + 1;
  }
  for (const t of layout.blocks.filter((b) => b.role === 'writing_table')) {
    assert.equal(perTable[t.id], 3, t.id);
  }
});

test('the teacher faces the class from behind the demonstration table', () => {
  const teacher = layout.instances.find((i) => i.id === 'seat_teacher');
  const demo = layout.blocks.find((b) => b.id === 'demo_table');
  const [, fz] = forward(teacher.rotationY || 0);
  assert.ok(fz > 0.9);
  assert.equal(teacher.faces, 'class');
  assert.ok(teacher.position[2] < demo.z - 0.2);
  assert.ok(Math.abs(teacher.position[0] - demo.x) < 0.4);
  assert.equal(teacher.position[1], demo.y);
});

test('floor pieces stay inside the room, apart, and out of the walkways', () => {
  const { width: W, depth: D } = layout.meta.room;
  const rects = layout.blocks.map(rectOf);
  for (const r of rects) {
    assert.ok(Math.abs(r.cx) + r.hx < W / 2 - 0.03, r.id);
    assert.ok(Math.abs(r.cz) + r.hz < D / 2 - 0.03, r.id);
  }
  const hits = [];
  for (let i = 0; i < rects.length; i++) {
    for (let j = i + 1; j < rects.length; j++) {
      if (overlaps(rects[i], rects[j])) hits.push(`${rects[i].id} ∩ ${rects[j].id}`);
    }
  }
  assert.deepEqual(hits, []);
  const blocked = [];
  for (const path of layout.circulation) {
    const p = { cx: path.x, cz: path.z, hx: path.w / 2, hz: path.d / 2, rot: 0 };
    for (const r of rects) {
      if (overlaps(p, r, 0.02)) blocked.push(`${path.id} ∩ ${r.id}`);
    }
    assert.ok(path.w >= 0.45 && path.d >= 0.4, path.id);
  }
  assert.deepEqual(blocked, []);
  const center = layout.circulation.find((p) => p.id === 'center');
  assert.ok(center.w >= 1.0);
});

test('the room is a calligraphy class, not an empty desk grid', () => {
  const variants = new Set(layout.stations.map((s) => s.variant));
  for (const name of ['yong-start', 'yong-full', 'yong-marked', 'cleared', 'grid-yong', 'shan', 'shui', 'yong-large']) {
    assert.ok(variants.has(name), name);
  }
  assert.equal(layout.stations.length, 18);
  assert.ok(layout.architecture.scrolls.some((s) => s.motif === 'yong-teach'));
  assert.ok(layout.blocks.some((b) => b.role === 'drying_rack' && b.sheets >= 5));
  assert.ok(layout.blocks.some((b) => b.role === 'wash'));
  assert.ok(layout.blocks.some((b) => b.role === 'bookcase'));
  assert.equal(layout.meta.teachingWall, '-Z');
});
