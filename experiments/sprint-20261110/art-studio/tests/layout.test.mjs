import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const layout = JSON.parse(readFileSync(resolve(root, 'layout.json'), 'utf8'));
const html = readFileSync(resolve(root, 'index.html'), 'utf8');

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
  return { id: z.id, cx: z.x, cz: z.z, hx: z.w / 2, hz: z.d / 2, rot: z.rotY || 0, y: z.y || 0 };
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

test('shared GLBs resolve and are not copied into the scene folder', () => {
  assert.equal(existsSync(resolve(root, 'assets')), false);
  for (const [kind, spec] of Object.entries(layout.assets)) {
    assert.match(spec.glb, /^\.\.\/\.\.\/\.\.\//, kind);
    const abs = resolve(root, spec.glb);
    assert.equal(existsSync(abs), true, `${kind} missing ${spec.glb}`);
    assert.ok(spec.footprint[0] > 0 && spec.footprint[1] > 0, kind);
  }
});

test('page is offline and does not call a CDN', () => {
  assert.match(html, /studio\.js/);
  assert.match(html, /workshop\/vendor\/three\.module\.js/);
  assert.doesNotMatch(html, /https?:\/\//);
});

test('required stations exist', () => {
  const ids = new Set(layout.instances.map((i) => i.id));
  for (const id of ['easel_back', 'easel_hero', 'easel_front', 'work_table', 'supply_case', 'pigment_shelf', 'layout_desk']) {
    assert.ok(ids.has(id), id);
  }
  const zones = new Set(layout.zones.map((z) => z.id));
  for (const id of ['wash', 'drawers', 'pinboard', 'rolls']) assert.ok(zones.has(id), id);
  const easels = layout.instances.filter((i) => i.kind === 'easel');
  assert.equal(easels.length, 3);
  const xs = easels.map((e) => e.position[0]);
  const zs = easels.map((e) => e.position[2]);
  assert.ok(Math.max(...xs) - Math.min(...xs) > 0.6, 'easels stagger in x instead of sharing a line');
  assert.ok(Math.max(...zs) - Math.min(...zs) > 2.5, 'easels occupy the depth of the bay');
  assert.ok(layout.instances.filter((i) => i.kind === 'jam_jar').length >= 8);
});

test('floor furniture stays inside the room and does not pile up', () => {
  const { width: W, depth: D } = layout.meta.room;
  const rects = [];
  for (const inst of layout.instances) {
    const r = rectOf(inst);
    assert.ok(Math.abs(r.cx) < W / 2 - 0.05, `${inst.id} x ${r.cx}`);
    assert.ok(Math.abs(r.cz) < D / 2 - 0.05, `${inst.id} z ${r.cz}`);
    if (r.y < 0.2 && Math.max(r.hx, r.hz) > 0.12) rects.push(r);
  }
  for (const z of layout.zones) {
    if (z.y) continue;
    const r = zoneRect(z);
    assert.ok(Math.abs(r.cx) < W / 2 - 0.15, z.id);
    assert.ok(Math.abs(r.cz) < D / 2 - 0.08, z.id);
    rects.push(r);
  }
  const hits = [];
  for (let i = 0; i < rects.length; i++) {
    for (let j = i + 1; j < rects.length; j++) {
      if (overlaps(rects[i], rects[j])) hits.push(`${rects[i].id} ∩ ${rects[j].id}`);
    }
  }
  assert.deepEqual(hits, []);
});

test('chairs face their work surface and the easel stool sits in front of the canvas', () => {
  const byId = Object.fromEntries(layout.instances.map((i) => [i.id, i]));
  for (const inst of layout.instances) {
    if (!inst.faces) continue;
    const target = byId[inst.faces];
    const [fx, fz] = forward(inst.rotationY || 0);
    const dx = target.position[0] - inst.position[0];
    const dz = target.position[2] - inst.position[2];
    const len = Math.hypot(dx, dz);
    const dot = (fx * dx + fz * dz) / len;
    assert.ok(dot > 0.8, `${inst.id} → ${inst.faces} dot ${dot.toFixed(3)}`);
    assert.ok(len > 0.45 && len < 1.7, `${inst.id} distance ${len.toFixed(2)}`);
  }
  const stool = byId.stool_easel;
  const easel = byId[stool.beside];
  const [fx, fz] = forward(easel.rotationY || 0);
  const dx = stool.position[0] - easel.position[0];
  const dz = stool.position[2] - easel.position[2];
  const len = Math.hypot(dx, dz);
  const dot = (fx * dx + fz * dz) / len;
  assert.ok(dot > 0.85, `stool in front of canvas dot ${dot.toFixed(3)}`);
  assert.ok(len > 0.65 && len < 1.1, `stool distance ${len.toFixed(2)}`);
});
