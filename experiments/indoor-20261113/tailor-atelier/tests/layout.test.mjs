import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const layout = JSON.parse(readFileSync(resolve(root, 'layout.json'), 'utf8'));
const html = readFileSync(resolve(root, 'index.html'), 'utf8');
const lib = readFileSync(resolve(root, 'scene_lib.js'), 'utf8');
const scene = readFileSync(resolve(root, 'atelier.js'), 'utf8');

function station(id) {
  return layout.stations.find((s) => s.id === id);
}
function instance(id) {
  return layout.instances.find((i) => i.id === id);
}

function forward(rot) {
  return [Math.sin(rot), Math.cos(rot)];
}

// Sitter looks toward local -Z on this dining-chair bake.
function chairLook(rot) {
  return [-Math.sin(rot), -Math.cos(rot)];
}

function rectOfStation(st) {
  return {
    id: st.id,
    cx: st.position[0],
    cz: st.position[2],
    hx: st.size[0] / 2,
    hz: st.size[2] / 2,
    rot: st.rotationY || 0,
    y: st.position[1] || 0,
    standsOn: st.standsOn || null,
    floor: !!st.floor,
  };
}

function rectOfInstance(inst) {
  const asset = layout.assets[inst.kind];
  return {
    id: inst.id,
    cx: inst.position[0],
    cz: inst.position[2],
    hx: asset.footprint[0] / 2,
    hz: asset.footprint[1] / 2,
    rot: inst.rotationY || 0,
    y: inst.position[1],
    standsOn: null,
    floor: inst.position[1] < 0.2,
  };
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

function toLocal(board, x, z) {
  const dx = x - board.position[0];
  const dz = z - board.position[2];
  const c = Math.cos(board.rotationY || 0);
  const s = Math.sin(board.rotationY || 0);
  return [dx * c + dz * s, -dx * s + dz * c];
}

test('vendor, page, and baked assets resolve inside this folder', () => {
  for (const rel of [
    'vendor/three.module.js',
    'vendor/controls/OrbitControls.js',
    'vendor/loaders/GLTFLoader.js',
    'vendor/utils/BufferGeometryUtils.js',
    'index.html',
    'atelier.js',
    'scene_lib.js',
    'layout.json',
  ]) {
    assert.equal(existsSync(resolve(root, rel)), true, rel);
  }
  for (const spec of Object.values(layout.assets)) {
    assert.equal(spec.glb.startsWith('assets/'), true, spec.glb);
    assert.equal(existsSync(resolve(root, spec.glb)), true, spec.glb);
  }
});

test('page is offline toon/unlit with a hard shadow map', () => {
  assert.match(html, /atelier\.js/);
  assert.match(html, /\.\/vendor\/three\.module\.js/);
  assert.doesNotMatch(html, /https?:\/\//);
  assert.match(lib, /MeshToonMaterial/);
  assert.match(lib, /MeshBasicMaterial/);
  assert.match(lib, /BasicShadowMap/);
  assert.match(lib, /NearestFilter/);
  assert.match(scene, /makeShell|shellOf/);
  assert.match(lib, /hud'\) === '0'|shot'\) === '1'/);
});

test('cutting table is cloth-scale and sewing tables are seated height', () => {
  const cut = station('cutting_table');
  assert.ok(cut.size[0] >= 2.4 && cut.size[2] >= 1.2, 'cutting top is large enough to lay cloth');
  assert.ok(cut.size[1] >= 0.88 && cut.size[1] <= 0.98, `standing height ${cut.size[1]}`);
  for (const id of ['sew_table_a', 'sew_table_b']) {
    const t = station(id);
    assert.ok(t.size[1] >= 0.72 && t.size[1] <= 0.8, id);
    assert.ok(t.size[2] >= 1.1, `${id} length`);
  }
  const chair = layout.assets.dining_chair;
  assert.ok(chair.targetHeight >= 0.8 && chair.targetHeight <= 0.95);
});

test('required tailor stations and baked machines exist', () => {
  for (const id of ['cutting_table', 'sew_table_a', 'sew_table_b', 'form_toile', 'form_jacket', 'fabric_rack', 'notions', 'press_board', 'mirror', 'thread_frame']) {
    assert.ok(station(id), id);
  }
  assert.equal(layout.instances.filter((i) => i.kind === 'sewing_machine').length, 2);
  assert.equal(layout.instances.filter((i) => i.kind === 'iron').length, 1);
  assert.equal(layout.stations.filter((s) => s.kind === 'dress_form').length, 2);
  assert.ok(scene.includes('BOLTS'));
  assert.ok(BOLT_COUNT() >= 12);
});

function BOLT_COUNT() {
  const m = scene.match(/BOLTS = \[([\s\S]*?)\];/);
  if (!m) return 0;
  return m[1].split('\n').filter((line) => line.includes('#')).length;
}

test('floor pieces stay in the room and do not pile up', () => {
  const { width: W, depth: D } = layout.meta.room;
  const rects = [];
  for (const st of layout.stations) {
    if (!st.floor) continue;
    const r = rectOfStation(st);
    assert.ok(Math.abs(r.cx) + r.hx < W / 2 - 0.02, `${st.id} x`);
    assert.ok(Math.abs(r.cz) + r.hz < D / 2 - 0.02, `${st.id} z`);
    rects.push(r);
  }
  for (const inst of layout.instances) {
    const r = rectOfInstance(inst);
    if (!r.floor) continue;
    assert.ok(Math.abs(r.cx) + r.hx < W / 2 - 0.02, `${inst.id} x`);
    assert.ok(Math.abs(r.cz) + r.hz < D / 2 - 0.02, `${inst.id} z`);
    rects.push(r);
  }
  const hits = [];
  for (let i = 0; i < rects.length; i++) {
    for (let j = i + 1; j < rects.length; j++) {
      const a = rects[i];
      const b = rects[j];
      if (a.standsOn === b.id || b.standsOn === a.id) continue;
      if (overlaps(a, b)) hits.push(`${a.id} ∩ ${b.id}`);
    }
  }
  assert.deepEqual(hits, []);
});

test('chairs face their work and dress forms face into the room', () => {
  const targets = Object.fromEntries(layout.stations.map((s) => [s.id, s]));
  for (const inst of layout.instances) {
    if (!inst.faces) continue;
    const target = targets[inst.faces];
    const [fx, fz] = chairLook(inst.rotationY || 0);
    const dx = target.position[0] - inst.position[0];
    const dz = target.position[2] - inst.position[2];
    const len = Math.hypot(dx, dz);
    const dot = (fx * dx + fz * dz) / len;
    assert.ok(dot > 0.8, `${inst.id} → ${inst.faces} dot ${dot.toFixed(3)}`);
    assert.ok(len > 0.5 && len < (inst.faceMax || 1.6), `${inst.id} distance ${len.toFixed(2)}`);
  }
  for (const id of ['form_toile', 'form_jacket']) {
    const form = station(id);
    const [fx, fz] = forward(form.rotationY || 0);
    assert.ok(fz > 0.7, `${id} faces +Z, fz ${fz.toFixed(2)}`);
    assert.ok(Math.abs(fx) < 0.7, id);
  }
});

test('machines sit on sewing tables and the iron sits on the board', () => {
  for (const id of ['machine_a', 'machine_b']) {
    const machine = instance(id);
    const table = station(machine.on);
    assert.ok(Math.abs(machine.position[0] - table.position[0]) < table.size[0] / 2 - 0.05, id);
    assert.ok(Math.abs(machine.position[2] - table.position[2]) < table.size[2] / 2 - 0.08, id);
    assert.ok(Math.abs(machine.position[1] - table.size[1]) < 0.02, `${id} height`);
    assert.ok(Math.abs(machine.rotationY || 0) < 0.2, 'needle axis stays along the table');
  }
  const iron = instance('iron_main');
  const board = station(iron.on);
  const [lx, lz] = toLocal(board, iron.position[0], iron.position[2]);
  assert.ok(Math.abs(lx) < board.size[0] / 2, `iron local x ${lx.toFixed(3)}`);
  assert.ok(Math.abs(lz) < board.size[2] / 2 - 0.05, `iron local z ${lz.toFixed(3)}`);
  assert.ok(Math.abs(iron.position[1] - board.size[1]) < 0.03);
  assert.ok(Math.abs((iron.rotationY || 0) - (board.rotationY || 0)) < 0.05);
});

test('forms stand on the platform and the east aisle stays clear', () => {
  const platform = station('fitting_platform');
  for (const id of ['form_toile', 'form_jacket', 'fitting_stool', 'mirror']) {
    const st = station(id);
    assert.equal(st.standsOn, 'fitting_platform');
    const [lx, lz] = toLocal(platform, st.position[0], st.position[2]);
    assert.ok(Math.abs(lx) + st.size[0] / 2 <= platform.size[0] / 2 + 0.02, `${id} x`);
    assert.ok(Math.abs(lz) + st.size[2] / 2 <= platform.size[2] / 2 + 0.02, `${id} z`);
  }
  const table = station('cutting_table');
  const chair = instance('chair_sew_a');
  const chairHalfX = layout.assets.dining_chair.footprint[1] / 2;
  const gap = (chair.position[0] - chairHalfX) - (table.position[0] + table.size[0] / 2);
  assert.ok(gap >= 0.9, `east aisle ${gap.toFixed(2)} m`);
});

test('walk paths miss the furniture', () => {
  const blockers = [
    ...layout.stations.filter((s) => s.floor).map(rectOfStation),
    ...layout.instances.map(rectOfInstance).filter((r) => r.floor),
  ];
  function inside(r, x, z, pad) {
    const dx = x - r.cx;
    const dz = z - r.cz;
    const c = Math.cos(r.rot);
    const s = Math.sin(r.rot);
    const lx = Math.abs(dx * c + dz * s);
    const lz = Math.abs(-dx * s + dz * c);
    return lx <= r.hx + pad && lz <= r.hz + pad;
  }
  const hits = [];
  for (const path of layout.paths) {
    for (let i = 0; i < path.points.length - 1; i++) {
      const [x0, z0] = path.points[i];
      const [x1, z1] = path.points[i + 1];
      const steps = Math.max(2, Math.ceil(Math.hypot(x1 - x0, z1 - z0) / 0.25));
      for (let s = 0; s <= steps; s++) {
        const t = s / steps;
        const x = x0 + (x1 - x0) * t;
        const z = z0 + (z1 - z0) * t;
        for (const r of blockers) {
          if (inside(r, x, z, path.clearance)) hits.push(`${path.id} @ ${x.toFixed(2)},${z.toFixed(2)} hits ${r.id}`);
        }
      }
    }
  }
  assert.deepEqual(hits, []);
});
