/**
 * Writes layout.json. Run from anywhere:
 *   node experiments/indoor-20261113/calligraphy-classroom/tools/make_layout.mjs
 *
 * Chair seat fraction is measured from dining_chair__5e1f7a56da4a.glb:
 * feet at y=0.061 m, seat top at 0.4775 m, back top at 1.061 m, so the
 * seat is 0.4165 of the grounded height. targetHeight 1.05 puts the seat
 * at 0.437 m under a 0.75 m writing top (0.31 m clearance).
 */
import { writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SEAT_FRACTION = 0.4165;
const ROOM = { width: 12.2, depth: 9.6, height: 3.36 };
const T = 0.16;
const innerL = -ROOM.width / 2 + T;
const innerB = -ROOM.depth / 2 + T;

const CHAIR_H = 1.05;
const CHAIR_W = 0.362 * CHAIR_H;
const CHAIR_D = 0.511 * CHAIR_H;
const TABLE_W = 3.15;
const TABLE_D = 0.7;
const TABLE_H = 0.75;
const TUCK = 0.04;
const CHAIR_DZ = TABLE_D / 2 + TUCK + CHAIR_D / 2;

const BC_H = 2.1;
const BC_W = 0.834 * (BC_H / 2);
const BC_D = 0.408 * (BC_H / 2);
const SHELF_H = 0.7;
const SHELF_W = 0.701 * (SHELF_H / 0.8);
const SHELF_D = 0.287 * (SHELF_H / 0.8);
const BENCH_H = 0.46;
const BENCH_W = 0.418 * (BENCH_H / 0.456);
const BENCH_D = 1.5 * (BENCH_H / 0.456);
const POT_H = 0.3;
const POT_W = 0.25 * (POT_H / 0.207);
const STAND_H = 0.78;
const STAND_W = 0.665 * (STAND_H / 1.2);

const rows = [-1.2, 0.95, 3.1];
const banks = [
  { id: 'l', x: -2.7 },
  { id: 'r', x: 1.8 },
];
const us = [-1.02, 0, 1.02];
const variants = {
  l0: ['yong-large', 'yong-full', 'yong-marked'],
  r0: ['yong-start', 'yong-mid', 'yong-full'],
  l1: ['shan', 'shui', 'grid-yong'],
  r1: ['yong-mid', 'cleared', 'yong-marked'],
  l2: ['yong-full', 'grid-yong', 'shan'],
  r2: ['yong-start', 'yong-full', 'shui'],
};

const blocks = [];
const instances = [];
const stations = [];

function block(entry) {
  blocks.push({ rotY: 0, y: 0, ...entry });
}

for (const row of rows) {
  for (const bank of banks) {
    const id = `table_${bank.id}${rows.indexOf(row)}`;
    block({
      id,
      role: 'writing_table',
      x: bank.x,
      z: row,
      w: TABLE_W,
      d: TABLE_D,
      h: TABLE_H,
      color: bank.id === 'l' ? '#a56b3c' : '#8d5a34',
    });
  }
}

const platform = { x: -0.22, z: -3.42, w: 4.7, d: 2.06, h: 0.12 };
const demo = {
  id: 'demo_table',
  role: 'demo_table',
  x: 0.32,
  z: -3.18,
  w: 2.4,
  d: 0.78,
  h: 0.76,
  y: platform.h,
  color: '#6e442c',
};
block(demo);

for (const bank of banks) {
  for (let r = 0; r < rows.length; r++) {
    const tableId = `table_${bank.id}${r}`;
    const table = blocks.find((b) => b.id === tableId);
    for (let s = 0; s < us.length; s++) {
      const id = `seat_${bank.id}${r}_${s}`;
      let extraZ = 0;
      let extraYaw = 0;
      if (id === 'seat_r1_2') extraZ = 0.14;
      if (id === 'seat_l2_0') extraYaw = -0.07;
      const x = table.x + us[s];
      const z = table.z + CHAIR_DZ + extraZ;
      const rot = Math.PI + extraYaw;
      instances.push({
        id,
        kind: 'dining_chair',
        position: [round(x), 0, round(z)],
        rotationY: round(rot, 4),
        faces: 'teaching_wall',
        table: tableId,
      });
      block({
        id,
        role: 'chair',
        x,
        z,
        w: CHAIR_W,
        d: CHAIR_D,
        h: CHAIR_H,
        rotY: rot,
      });
      stations.push({
        id: `st_${bank.id}${r}_${s}`,
        table: tableId,
        x: round(x),
        z: round(table.z + 0.08),
        variant: variants[`${bank.id}${r}`][s],
        yaw: round((s - 1) * 0.03 + (bank.id === 'r' ? 0.02 : -0.01), 3),
      });
    }
  }
}

const teacherZ = demo.z - demo.d / 2 - TUCK - CHAIR_D / 2;
instances.push({
  id: 'seat_teacher',
  kind: 'dining_chair',
  position: [round(demo.x), platform.h, round(teacherZ)],
  rotationY: 0,
  faces: 'class',
  table: 'demo_table',
});
block({
  id: 'seat_teacher',
  role: 'chair',
  x: demo.x,
  z: teacherZ,
  y: platform.h,
  w: CHAIR_W,
  d: CHAIR_D,
  h: CHAIR_H,
  rotY: 0,
});

const caseZs = innerB + BC_D / 2;
for (const [i, x] of [[0, 4.02], [1, 5.12]]) {
  const id = `case_${i}`;
  instances.push({
    id,
    kind: 'display_bookcase',
    position: [x, 0, round(caseZs)],
    rotationY: round(Math.PI, 4),
    tint: i === 0 ? '#6b4630' : '#5c3c2a',
    frontLocal: '-Z',
  });
  block({ id, role: 'bookcase', x, z: caseZs, w: BC_W, d: BC_D, h: BC_H, rotY: Math.PI });
}

const shelfRot = Math.PI / 2;
const shelfX = innerL + SHELF_D / 2;
for (const [i, z, y] of [[0, -4.15, 1.28], [1, -0.18, 1.38], [2, 3.4, 1.32]]) {
  instances.push({
    id: `shelf_${i}`,
    kind: 'wall_shelf',
    position: [round(shelfX), y, z],
    rotationY: round(shelfRot, 4),
    ontop: true,
  });
}

instances.push({
  id: 'teacher_lamp',
  kind: 'library_lamp',
  position: [1.12, round(platform.h + demo.h), -3.32],
  rotationY: -0.4,
  ontop: true,
});

instances.push({
  id: 'model_stand',
  kind: 'book_stand',
  position: [-1.82, platform.h, -3.32],
  rotationY: 0.15,
  tint: '#3a281c',
});
block({
  id: 'model_stand',
  role: 'lectern',
  x: -1.82,
  z: -3.32,
  y: platform.h,
  w: STAND_W,
  d: STAND_W,
  h: STAND_H,
  rotY: 0.15,
});

instances.push({
  id: 'bench_side',
  kind: 'museum_bench',
  position: [-5.42, 0, 1.15],
  rotationY: 0,
  tint: '#6a5038',
});
block({
  id: 'bench_side',
  role: 'bench',
  x: -5.42,
  z: 1.15,
  w: BENCH_W,
  d: BENCH_D,
  h: BENCH_H,
});

instances.push({
  id: 'pot_entry',
  kind: 'flowerpot',
  position: [-5.48, 0, 3.95],
  rotationY: 0.4,
  tint: '#8a4e32',
});
block({
  id: 'pot_entry',
  role: 'pot',
  x: -5.48,
  z: 3.95,
  w: POT_W,
  d: POT_W,
  h: POT_H,
});

instances.push({
  id: 'pot_cabinet',
  kind: 'flowerpot',
  position: [-5.68, 0.8, -3.85],
  rotationY: 0.2,
  tint: '#6e5344',
  ontop: true,
});

block({ id: 'side_cabinet', role: 'cabinet', x: innerL + 0.24, z: -3.35, w: 0.48, d: 1.28, h: 0.8 });
block({ id: 'wash', role: 'wash', x: 4.18, z: -2.92, w: 0.68, d: 0.52, h: 0.78 });
block({ id: 'chest', role: 'chest', x: 5.22, z: -2.92, w: 0.88, d: 0.46, h: 0.66 });
block({ id: 'rack', role: 'drying_rack', x: 4.65, z: 4.12, w: 1.9, d: 0.4, h: 1.72, sheets: 6 });
block({ id: 'screen', role: 'screen', x: 4.65, z: 3.58, w: 1.85, d: 0.07, h: 1.62 });

const layout = {
  meta: {
    title: 'Calligraphy classroom',
    units: 'metres',
    style: 'Toon hard',
    room: ROOM,
    seatFraction: SEAT_FRACTION,
    chairForward: 'local +Z. rotationY 0 faces +Z. Students use π so the seat front faces the teaching wall at -Z.',
    teachingWall: '-Z',
    notes: [
      'Writing tables are long slabs, 0.70 m deep so a seated writer reaches the far edge. Three seats per table leave about a metre of elbow room.',
      `Dining-chair seat top is ${SEAT_FRACTION} of grounded height. At targetHeight ${CHAIR_H} the seat is ${(SEAT_FRACTION * CHAIR_H).toFixed(3)} m; writing tops are ${TABLE_H} m.`,
      'Bookcase opening is the model local -Z. rotationY π turns that opening toward the room (+Z).',
      'Wall-shelf depth is local Z. rotationY π/2 runs the shelf along the left wall and the depth into the room.',
      'One chair (seat_r1_2) is pulled back 0.14 m and still clears the next table. seat_l2_0 is yawed 4 degrees and still faces the wall.',
    ],
  },
  assets: {
    dining_chair: {
      glb: 'assets/dining_chair__5e1f7a56da4a.glb',
      targetHeight: CHAIR_H,
      footprint: [round(CHAIR_W, 3), round(CHAIR_D, 3)],
      frontLocal: '+Z',
    },
    display_bookcase: {
      glb: 'assets/display_bookcase__b68cc93dc444.glb',
      targetHeight: BC_H,
      footprint: [round(BC_W, 3), round(BC_D, 3)],
      frontLocal: '-Z',
    },
    wall_shelf: {
      glb: 'assets/wall_shelf__8732f5e14a30.glb',
      targetHeight: SHELF_H,
      footprint: [round(SHELF_W, 3), round(SHELF_D, 3)],
    },
    library_lamp: {
      glb: 'assets/library_lamp__06accd4e0351.glb',
      targetHeight: 0.38,
      footprint: [0.29, 0.29],
    },
    book_stand: {
      glb: 'assets/book_stand__fb784262748d.glb',
      targetHeight: STAND_H,
      footprint: [round(STAND_W, 3), round(STAND_W, 3)],
    },
    flowerpot: {
      glb: 'assets/flowerpot__4a270f247734.glb',
      targetHeight: POT_H,
      footprint: [round(POT_W, 3), round(POT_W, 3)],
    },
    museum_bench: {
      glb: 'assets/museum_bench__0025f9484fc6.glb',
      targetHeight: BENCH_H,
      footprint: [round(BENCH_W, 3), round(BENCH_D, 3)],
    },
  },
  architecture: {
    wallThickness: T,
    platform,
    windows: [
      { z0: -3.15, z1: -0.85, sill: 0.92, head: 2.46 },
      { z0: 0.4, z1: 2.7, sill: 0.92, head: 2.46 },
    ],
    scrolls: [
      { id: 'hero', x: 0.28, z: innerB + 0.02, w: 1.5, h: 1.68, y: 1.16, motif: 'yong-teach' },
      { id: 'couplet_shan', x: -1.45, z: innerB + 0.02, w: 0.4, h: 1.5, y: 1.22, motif: 'shan' },
      { id: 'couplet_shui', x: 1.95, z: innerB + 0.02, w: 0.4, h: 1.5, y: 1.22, motif: 'shui' },
    ],
    pins: [
      { id: 'pin0', x: -5.15, z: innerB + 0.02, w: 0.34, h: 0.46, y: 1.45, motif: 'yong-mid' },
      { id: 'pin1', x: -4.7, z: innerB + 0.02, w: 0.34, h: 0.46, y: 1.52, motif: 'yong-full' },
      { id: 'pin2', x: -4.25, z: innerB + 0.02, w: 0.34, h: 0.46, y: 1.42, motif: 'shan' },
      { id: 'pin3', x: -3.8, z: innerB + 0.02, w: 0.34, h: 0.46, y: 1.55, motif: 'grid-yong' },
      { id: 'pin4', x: -3.35, z: innerB + 0.02, w: 0.34, h: 0.46, y: 1.46, motif: 'yong-marked' },
    ],
  },
  blocks: blocks.map(roundBlock),
  instances,
  stations,
  circulation: [
    { id: 'center', x: -0.45, z: 0.9, w: 1.05, d: 5.5 },
    { id: 'front', x: -0.2, z: -1.98, w: 6.4, d: 0.46 },
    { id: 'side_left', x: -4.82, z: 0.4, w: 0.72, d: 5.6 },
    { id: 'side_right', x: 3.95, z: 0.55, w: 0.78, d: 3.6 },
    { id: 'row_gap_0', x: -0.45, z: 0.16, w: 6.2, d: 0.5 },
    { id: 'row_gap_1', x: -0.45, z: 2.32, w: 6.2, d: 0.48 },
  ],
  shell: {
    floorColor: '#c49662',
    floorAlt: '#a87548',
    wallColor: '#f3ead8',
    wainscot: '#6b432c',
    woodColor: '#5c3a24',
    woodLight: '#c4925a',
    ceilingColor: '#f7f1e6',
    windowTint: '#d5e4dc',
    clearColor: '#efe6d6',
    fogColor: '#efe6d6',
    fogNear: 16,
    fogFar: 36,
  },
  camera: {
    fov: 38,
    position: [6.7, 3.2, 6.85],
    target: [-0.2, 1.0, -0.55],
  },
  cameraPresets: {
    corner: {
      position: [6.35, 2.45, 3.15],
      target: [0.4, 1.05, -1.55],
    },
    close: {
      position: [2.72, 1.38, 4.42],
      target: [1.8, 0.84, 3.16],
    },
  },
  lights: {
    hemi: { sky: '#fff6ea', ground: '#6a5344', intensity: 0.36 },
    key: {
      color: '#fff8f0',
      intensity: 1.7,
      position: [-1.4, 9.4, 7.2],
      target: [-0.2, 0.7, -1.4],
      shadow: { mapSize: 2048, left: -9, right: 9, top: 9, bottom: -9, near: 1, far: 28, bias: -0.0004, normalBias: 0.032 },
    },
    fill: { color: '#d5e2ea', intensity: 0.16, position: [-7.2, 3.4, 0.2] },
    points: [
      { color: '#ffc58a', intensity: 0.55, position: [0.3, 2.35, -3.15], distance: 4.5 },
      { color: '#ffc58a', intensity: 0.42, position: [-0.45, 2.4, -1.2], distance: 4.2 },
      { color: '#ffc58a', intensity: 0.42, position: [-0.45, 2.4, 0.95], distance: 4.2 },
      { color: '#ffc58a', intensity: 0.38, position: [-0.45, 2.4, 3.1], distance: 4.2 },
      { color: '#ffe0b0', intensity: 0.35, position: [1.12, 1.35, -3.3], distance: 2.4 },
    ],
  },
};

const problems = validate(layout);
if (problems.length) {
  console.error(problems.join('\n'));
  process.exit(1);
}

const out = resolve(dirname(fileURLToPath(import.meta.url)), '../layout.json');
writeFileSync(out, `${JSON.stringify(layout, null, 2)}\n`);
console.log(`wrote ${out}`);
console.log(`chairs ${instances.filter((i) => i.kind === 'dining_chair').length} stations ${stations.length} blocks ${blocks.length}`);
console.log(`seat top ${(SEAT_FRACTION * CHAIR_H).toFixed(3)} table ${TABLE_H} gap ${(TABLE_H - SEAT_FRACTION * CHAIR_H).toFixed(3)}`);
console.log(`chair ${CHAIR_W.toFixed(3)} x ${CHAIR_D.toFixed(3)} chair dz ${CHAIR_DZ.toFixed(3)}`);

function round(n, p = 3) {
  const m = 10 ** p;
  return Math.round(n * m) / m;
}

function roundBlock(b) {
  const o = { ...b };
  for (const k of ['x', 'z', 'w', 'd', 'h', 'y', 'rotY']) if (typeof o[k] === 'number') o[k] = round(o[k], 4);
  return o;
}

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

function validate(doc) {
  const hits = [];
  const { width: W, depth: D } = doc.meta.room;
  const rects = doc.blocks.map(rectOf);
  for (const r of rects) {
    if (Math.abs(r.cx) + r.hx > W / 2 - 0.04) hits.push(`${r.id} outside x`);
    if (Math.abs(r.cz) + r.hz > D / 2 - 0.04) hits.push(`${r.id} outside z`);
  }
  for (let i = 0; i < rects.length; i++) {
    for (let j = i + 1; j < rects.length; j++) {
      if (overlaps(rects[i], rects[j])) hits.push(`${rects[i].id} ∩ ${rects[j].id}`);
    }
  }
  for (const path of doc.circulation) {
    const p = { id: path.id, cx: path.x, cz: path.z, hx: path.w / 2, hz: path.d / 2, rot: 0 };
    for (const r of rects) {
      if (overlaps(p, r, 0.02)) hits.push(`path ${path.id} ∩ ${r.id}`);
    }
  }
  const byId = Object.fromEntries(doc.blocks.map((b) => [b.id, b]));
  for (const inst of doc.instances) {
    if (inst.faces !== 'teaching_wall' && inst.faces !== 'class') continue;
    const [fx, fz] = forward(inst.rotationY || 0);
    const table = byId[inst.table];
    if (!table) {
      hits.push(`${inst.id} missing table`);
      continue;
    }
    if (inst.faces === 'teaching_wall' && fz > -0.9) hits.push(`${inst.id} does not face -Z (${fz.toFixed(2)})`);
    if (inst.faces === 'class' && fz < 0.9) hits.push(`${inst.id} does not face +Z`);
    const toward = (table.x - inst.position[0]) * fx + (table.z - inst.position[2]) * fz;
    if (toward < 0.15) hits.push(`${inst.id} table is not in front (${toward.toFixed(2)})`);
  }
  const seat = doc.meta.seatFraction * doc.assets.dining_chair.targetHeight;
  if (TABLE_H - seat < 0.26 || TABLE_H - seat > 0.36) hits.push(`table/seat gap ${TABLE_H - seat}`);
  return hits;
}
