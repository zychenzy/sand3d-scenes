import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const layout = JSON.parse(readFileSync(join(root, 'layout.json'), 'utf8'));
const failures = [];
const notes = [];
function check(name, ok, detail = '') {
  if (ok) notes.push(`PASS ${name}`);
  else failures.push(`FAIL ${name}${detail ? ` — ${detail}` : ''}`);
}

const WORDS = new Set(
  '燒烤 GRILL 牛肉麵 NOODLES 茶飲 TEA 蔬果 GREENS 烤 麵 茶 菜 串燒 牛雜湯 乾麵 滷蛋 檸檬茶 紅茶 青草茶 番茄 高麗菜 青蔥 夜 市'.split(/\s+/),
);

function halfExtents(kind, scale = [1, 1, 1]) {
  const asset = layout.assets[kind];
  const [nx, ny, nz] = asset.native;
  const s = asset.targetHeight / ny;
  return { hx: (nx * s * (scale[0] || 1)) / 2, hz: (nz * s * (scale[2] || 1)) / 2 };
}

function worldOf(t, lx, lz) {
  const c = Math.cos(t.rot);
  const s = Math.sin(t.rot);
  return [t.x + lx * c + lz * s, t.z - lx * s + lz * c];
}

function toLocal(t, x, z) {
  const dx = x - t.x;
  const dz = z - t.z;
  const c = Math.cos(t.rot);
  const s = Math.sin(t.rot);
  return [dx * c - dz * s, dx * s + dz * c];
}

function corners(box) {
  const c = Math.cos(box.rot);
  const s = Math.sin(box.rot);
  return [[box.hx, box.hz], [box.hx, -box.hz], [-box.hx, box.hz], [-box.hx, -box.hz]].map(([lx, lz]) => [
    box.x + lx * c + lz * s,
    box.z - lx * s + lz * c,
  ]);
}

function separated(a, b) {
  const axes = [
    [Math.cos(a.rot), -Math.sin(a.rot)],
    [Math.sin(a.rot), Math.cos(a.rot)],
    [Math.cos(b.rot), -Math.sin(b.rot)],
    [Math.sin(b.rot), Math.cos(b.rot)],
  ];
  const ca = corners(a);
  const cb = corners(b);
  for (const [ax, az] of axes) {
    let a0 = Infinity, a1 = -Infinity, b0 = Infinity, b1 = -Infinity;
    for (const [x, z] of ca) {
      const p = x * ax + z * az;
      a0 = Math.min(a0, p); a1 = Math.max(a1, p);
    }
    for (const [x, z] of cb) {
      const p = x * ax + z * az;
      b0 = Math.min(b0, p); b1 = Math.max(b1, p);
    }
    if (a1 < b0 - 1e-4 || b1 < a0 - 1e-4) return true;
  }
  return false;
}

function inside(rect, x, z, pad = 0) {
  return x >= rect.x0 + pad && x <= rect.x1 - pad && z >= rect.z0 + pad && z <= rect.z1 - pad;
}

const ids = layout.stalls.map((s) => s.id);
check('four stalls', ids.length === 4 && new Set(ids).size === 4, ids.join(','));
check('stall kinds', ['grill', 'noodles', 'drinks', 'produce'].every((k) => ids.includes(k)));

const lane = layout.zones.serviceLane;
const aisle = layout.zones.aisle;
const cut = layout.zones.staffCut;
check('service lane width', lane.z1 - lane.z0 >= 1.2, (lane.z1 - lane.z0).toFixed(2));
check('aisle width', aisle.z1 - aisle.z0 >= 1.45, (aisle.z1 - aisle.z0).toFixed(2));
check('staff cut width', cut.x1 - cut.x0 >= 0.85, (cut.x1 - cut.x0).toFixed(2));
check('cut meets lane', Math.abs(cut.z0 - lane.z1) < 1e-6);
check('cut meets aisle', Math.abs(cut.z1 - aisle.z0) < 1e-6);

const spans = layout.stalls.map((s) => ({ id: s.id, x0: s.x - s.w / 2, x1: s.x + s.w / 2 })).sort((a, b) => a.x0 - b.x0);
const gaps = [];
for (let i = 1; i < spans.length; i++) gaps.push({ from: spans[i - 1].id, to: spans[i].id, w: spans[i].x0 - spans[i - 1].x1 });
check('stalls do not overlap', gaps.every((g) => g.w > 0.35), JSON.stringify(gaps));
const wide = gaps.filter((g) => g.w >= 0.85);
check('one staff gap between noodles and drinks', wide.length === 1 && wide[0].from === 'noodles' && wide[0].to === 'drinks');
check('staff cut sits in that gap', cut.x0 >= spans.find((s) => s.id === 'noodles').x1 - 0.02 && cut.x1 <= spans.find((s) => s.id === 'drinks').x0 + 0.02);

for (const s of layout.stalls) {
  check(`${s.id} awning headroom`, s.yFront >= 2.05 && s.yFront <= 2.5 && s.yBack > s.yFront && s.yBack < 2.9);
  check(`${s.id} banner word`, WORDS.has(s.banner), s.banner);
}

const lines = [];
for (const [key, value] of Object.entries(layout.copy)) {
  check(`copy ${key} is text`, Array.isArray(value) && value.length > 0);
  for (const line of value) {
    lines.push(line);
    const tokens = line.split(/\s+/);
    const bad = tokens.filter((tok) => !WORDS.has(tok) && !/^\d{2}$/.test(tok));
    check(`sign “${line}”`, bad.length === 0, bad.join(','));
  }
}
check('at least 4 stall names', ['燒烤', '牛肉麵', '茶飲', '蔬果'].every((w) => lines.includes(w)));

for (const [kind, spec] of Object.entries(layout.assets)) {
  check(`asset ${kind}`, existsSync(join(root, spec.glb)), spec.glb);
}
check('vendored three', existsSync(join(root, 'vendor/three.module.js')));

const byId = Object.fromEntries(layout.instances.map((i) => [i.id, i]));
const chairBox = halfExtents('dining_chair');
const chairBoxes = [];
const tableBoxes = [];

for (const t of layout.seating) {
  const inst = byId[t.id];
  check(`${t.id} placed`, !!inst && inst.kind === t.kind);
  const scale = inst.scale || [1, 1, 1];
  const ext = halfExtents(t.kind, scale);
  const tableBox = { x: t.x, z: t.z, rot: t.rot, hx: ext.hx, hz: ext.hz };
  tableBoxes.push(tableBox);
  check(`${t.id} on paving not in aisle`, t.z - ext.hz > aisle.z1);
  t.chairs.forEach((pair, i) => {
    const id = `${t.id}_c${i}`;
    const ch = byId[id];
    check(id, !!ch, 'missing chair');
    if (!ch) return;
    const [wx, wz] = worldOf(t, pair[0], pair[1]);
    check(`${id} position`, Math.hypot(ch.position[0] - wx, ch.position[2] - wz) < 2e-3);
    const face = Math.atan2(t.x - ch.position[0], t.z - ch.position[2]);
    const rot = ch.rotationY || 0;
    let delta = Math.atan2(Math.sin(rot - face), Math.cos(rot - face));
    check(`${id} faces ${t.id}`, Math.abs(delta) < 0.08, `delta ${delta.toFixed(3)}`);
    const fwdX = Math.sin(rot);
    const fwdZ = Math.cos(rot);
    const dx = t.x - ch.position[0];
    const dz = t.z - ch.position[2];
    const len = Math.hypot(dx, dz);
    const dot = (fwdX * dx + fwdZ * dz) / len;
    check(`${id} forward dot`, dot > 0.95, dot.toFixed(3));
    const box = { x: ch.position[0], z: ch.position[2], rot, hx: chairBox.hx, hz: chairBox.hz };
    chairBoxes.push(box);
    check(`${id} clear of table`, separated(box, tableBox));
    check(`${id} in front of aisle`, ch.position[2] - chairBox.hz > aisle.z1);
    check(`${id} on ground`, ch.position[1] === 0);
  });
  for (const inst2 of layout.instances.filter((i) => i.on === t.id)) {
    const [lx, lz] = toLocal(t, inst2.position[0], inst2.position[2]);
    check(`${inst2.id} on tabletop`, Math.abs(lx) < ext.hx - 0.02 && Math.abs(lz) < ext.hz - 0.02, `${lx.toFixed(2)},${lz.toFixed(2)}`);
    check(`${inst2.id} at table height`, Math.abs(inst2.position[1] - layout.assets[t.kind].targetHeight) < 0.02);
  }
}

for (let i = 0; i < tableBoxes.length; i++) {
  for (let j = i + 1; j < tableBoxes.length; j++) {
    check(`tables ${i}-${j} apart`, separated(tableBoxes[i], tableBoxes[j]));
  }
}
for (let i = 0; i < chairBoxes.length; i++) {
  for (let j = i + 1; j < chairBoxes.length; j++) {
    if (!separated(chairBoxes[i], chairBoxes[j])) failures.push(`FAIL chairs overlap ${i} ${j}`);
  }
}

for (const inst of layout.instances) {
  const [x, , z] = inst.position;
  const inCut = inside(cut, x, z);
  check(`${inst.id} keeps staff cut`, !inCut);
}

for (const item of layout.storage) {
  if (item.zone === 'hose') continue;
  if (item.zone === 'serviceLane') {
    check(`${item.id} in service lane`, inside(lane, item.x, item.z, 0.05));
    check(`${item.id} not in staff cut`, !inside(cut, item.x, item.z));
  } else if (item.zone === 'vendor') {
    const stall = layout.stalls.find((s) => s.id === item.stall);
    const x0 = stall.x - stall.w / 2 + 0.08;
    const x1 = stall.x + stall.w / 2 - 0.08;
    const z0 = stall.frontZ - stall.d + 0.05;
    const z1 = stall.frontZ - layout.build.counterDepth;
    check(`${item.id} in ${stall.id} back zone`, item.x >= x0 && item.x <= x1 && item.z >= z0 && item.z <= z1, `${item.x},${item.z}`);
  }
}

for (const inst of layout.instances.filter((i) => i.anchor === 'counter')) {
  const stall = layout.stalls.find((s) => s.id === inst.on);
  const [x, y, z] = inst.position;
  const xOk = Math.abs(x - stall.x) < stall.w / 2 - 0.12;
  const zOk = z <= stall.frontZ - 0.05 && z >= stall.frontZ - layout.build.counterDepth + 0.05;
  check(`${inst.id} on ${stall.id} counter`, xOk && zOk && Math.abs(y - layout.build.counterTop) < 1e-6);
}

for (const inst of layout.instances.filter((i) => i.anchor === 'vendor')) {
  const dot = Math.cos(inst.rotationY || 0);
  check(`${inst.id} faces the counter`, dot > 0.9, `cos ${dot.toFixed(3)}`);
}

check('cameras', layout.camera?.position && layout.cameraPresets?.corner && layout.cameraPresets?.close);
check('toon is the documented style', layout.meta.style === 'Toon hard');

if (failures.length) {
  console.error(failures.join('\n'));
  console.error(`\n${failures.length} failed, ${notes.length} passed`);
  process.exit(1);
}
console.log(notes.join('\n'));
console.log(`\n${notes.length} layout/orientation checks passed`);
