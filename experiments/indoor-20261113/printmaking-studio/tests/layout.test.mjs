import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const layout = JSON.parse(readFileSync(resolve(root, 'layout.json'), 'utf8'));
const html = readFileSync(resolve(root, 'index.html'), 'utf8');
const scene = readFileSync(resolve(root, 'print.js'), 'utf8');

function forward(rot) {
  return [Math.sin(rot), Math.cos(rot)];
}

function rectOf(inst) {
  const asset = layout.assets[inst.kind];
  let sx = 1;
  let sz = 1;
  if (Array.isArray(inst.scale)) {
    sx = inst.scale[0] || 1;
    sz = inst.scale[2] || sx;
  } else if (typeof inst.scale === 'number') {
    sx = sz = inst.scale;
  }
  return {
    id: inst.id,
    cx: inst.position[0],
    cz: inst.position[2],
    hx: (asset.footprint[0] * sx) / 2,
    hz: (asset.footprint[1] * sz) / 2,
    rot: inst.rotationY || 0,
    y: inst.position[1],
  };
}

function zoneRect(z) {
  return { id: z.id, cx: z.x, cz: z.z, hx: z.w / 2, hz: z.d / 2, rot: z.rotY || 0, y: 0 };
}

function overlaps(a, b, allow = 0.05) {
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

function worldAabb(r) {
  const c = Math.cos(r.rot);
  const s = Math.sin(r.rot);
  let minX = Infinity;
  let maxX = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const lx = sx * r.hx;
      const lz = sz * r.hz;
      const x = r.cx + c * lx + s * lz;
      const z = r.cz - s * lx + c * lz;
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minZ = Math.min(minZ, z);
      maxZ = Math.max(maxZ, z);
    }
  }
  return { minX, maxX, minZ, maxZ };
}

function floorRects() {
  const rects = [];
  for (const inst of layout.instances) {
    const r = rectOf(inst);
    if (r.y < 0.2 && Math.max(r.hx, r.hz) > 0.12) rects.push(r);
  }
  for (const z of layout.zones) rects.push(zoneRect(z));
  return rects;
}

test('shared GLBs resolve from the repo root and are not copied here', () => {
  assert.equal(existsSync(resolve(root, 'assets')), false);
  assert.equal(existsSync(resolve(root, 'vendor')), false);
  for (const [kind, spec] of Object.entries(layout.assets)) {
    assert.match(spec.glb, /^\.\.\/\.\.\/\.\.\//, kind);
    assert.equal(existsSync(resolve(root, spec.glb)), true, `${kind} missing ${spec.glb}`);
    assert.ok(spec.footprint[0] > 0.05 && spec.footprint[1] > 0.05, kind);
    assert.ok(spec.targetHeight > 0.05 && spec.targetHeight < 2.4, kind);
  }
});

test('page is offline, toon is the default, and unlit is a real mode', () => {
  assert.match(html, /print\.js/);
  assert.match(html, /workshop\/vendor\/three\.module\.js/);
  assert.doesNotMatch(html, /https?:\/\//);
  assert.match(html, /TOON/);
  assert.match(scene, /MeshToonMaterial|toon\(/);
  assert.match(readFileSync(resolve(root, 'scene_lib.js'), 'utf8'), /MeshBasicMaterial/);
  assert.doesNotMatch(scene, /easel/);
});

test('print stations exist and easels do not', () => {
  const ids = new Set(layout.instances.map((i) => i.id));
  for (const id of ['inking_table', 'paper_table', 'chair_paper', 'stool_ink', 'portfolios', 'edition_board', 'sort_bench']) {
    assert.ok(ids.has(id), id);
  }
  const zones = new Set(layout.zones.map((z) => z.id));
  for (const id of ['pressFoot', 'flatfiles', 'wash', 'rackA', 'rackB', 'cart', 'plateRack', 'homasote']) {
    assert.ok(zones.has(id), id);
  }
  assert.equal(layout.zones.filter((z) => z.id.startsWith('rack')).length, 2);
  assert.ok(!('easel' in layout.assets));
  assert.equal(layout.meta.style, 'Toon hard');
});

test('floor pieces stay inside the room and do not pile up', () => {
  const { width: W, depth: D } = layout.meta.room;
  const rects = floorRects();
  for (const r of rects) {
    const box = worldAabb(r);
    assert.ok(box.minX > -W / 2 - 0.02 && box.maxX < W / 2 + 0.02, `${r.id} x ${box.minX.toFixed(2)}..${box.maxX.toFixed(2)}`);
    assert.ok(box.minZ > -D / 2 - 0.02 && box.maxZ < D / 2 + 0.02, `${r.id} z ${box.minZ.toFixed(2)}..${box.maxZ.toFixed(2)}`);
  }
  const hits = [];
  for (let i = 0; i < rects.length; i++) {
    for (let j = i + 1; j < rects.length; j++) {
      if (overlaps(rects[i], rects[j])) hits.push(`${rects[i].id} ∩ ${rects[j].id}`);
    }
  }
  assert.deepEqual(hits, []);
});

test('crank stance and entry aisle stay clear', () => {
  const rects = floorRects();
  for (const [name, box] of Object.entries(layout.clearance)) {
    const clear = zoneRect({ id: name, ...box });
    const hits = rects.filter((r) => overlaps(r, clear, 0.02)).map((r) => r.id);
    assert.deepEqual(hits, [], `${name} blocked by ${hits.join(', ')}`);
  }
});

test('work faces the surface, and ink stays off the paper path', () => {
  const byId = Object.fromEntries(layout.instances.map((i) => [i.id, i]));
  for (const inst of layout.instances) {
    if (!inst.faces) continue;
    const target = byId[inst.faces];
    const [fx, fz] = forward(inst.rotationY || 0);
    const dx = target.position[0] - inst.position[0];
    const dz = target.position[2] - inst.position[2];
    const len = Math.hypot(dx, dz);
    const dot = (fx * dx + fz * dz) / len;
    assert.ok(dot > 0.85, `${inst.id} → ${inst.faces} dot ${dot.toFixed(3)}`);
    assert.ok(len > 0.7 && len < 1.6, `${inst.id} distance ${len.toFixed(2)}`);
    assert.ok(inst.position[2] > target.position[2], `${inst.id} stands on the near side of ${inst.faces}`);
  }
  assert.ok(Math.abs(byId.portfolios.rotationY - Math.PI) < 0.01);
  assert.ok(Math.abs(byId.edition_board.rotationY + Math.PI / 2) < 0.01);
  assert.ok(Math.abs(byId.lamp_ink.rotationY - Math.PI) < 0.01);

  const press = zoneRect(layout.zones.find((z) => z.id === 'pressFoot'));
  const ink = rectOf(byId.inking_table);
  const gap = ink.cx - ink.hx - (press.cx + press.hx);
  assert.ok(gap >= 0.9, `press-to-slab aisle ${gap.toFixed(2)}`);

  const paper = rectOf(byId.paper_table);
  const wash = zoneRect(layout.zones.find((z) => z.id === 'wash'));
  const files = zoneRect(layout.zones.find((z) => z.id === 'flatfiles'));
  assert.ok(Math.abs(wash.cz - paper.cz) > 3.5, 'wash is not beside the paper table');
  assert.ok(Math.abs(wash.cz - files.cz) > 4, 'wash is not beside the flat files');
  assert.ok(Math.hypot(wash.cx - paper.cx, wash.cz - paper.cz) > 4);
});

test('slab lamps and ink tins sit on the work surface, not the floor', () => {
  const top = layout.stations.ink.top;
  const lamp = find(layout, 'lamp_ink');
  assert.equal(lamp.position[1], top);
  for (const id of ['jar_black', 'jar_sienna', 'jar_prussian', 'jar_umber']) {
    const jar = find(layout, id);
    assert.ok(jar.position[1] > top && jar.position[1] < top + 0.06, id);
  }
  const paperY = find(layout, 'paper_table').position[1];
  assert.equal(paperY, 0);
  for (const id of ['thermos', 'mug_coffee']) {
    assert.equal(find(layout, id).position[1], 0.76, id);
  }
});

function find(doc, id) {
  return doc.instances.find((i) => i.id === id);
}
