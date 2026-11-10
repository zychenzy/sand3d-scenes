import * as THREE from 'three';
import { toon, addBox, addCyl } from './scene_lib.js';
import {
  TABLES,
  footprint,
  CASES,
  BAYS,
  SHELVES,
  shelfWorldY,
  WALL_SHELF,
  DISPLAY,
  CRATE,
  RETURNS,
  LECTERN,
  BOARD,
  PENDANT_H,
  pendants,
  rugFor,
  INNER,
  PLANTS,
} from './placement.js';

const cache = new Map();
function mat(color, opts) {
  const key = `${color}|${opts ? JSON.stringify(opts) : ''}`;
  if (!cache.has(key)) cache.set(key, toon(color, opts));
  return cache.get(key);
}

function quiet(mesh) {
  mesh.userData.castShadow = false;
  mesh.castShadow = false;
  return mesh;
}

function mulberry32(a) {
  return function rand() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const BOX_COLORS = ['#7a2e3b', '#1f4d6e', '#e0a33a', '#2f6a45', '#4a3d73', '#c4652a', '#d9d3c5', '#8c3a4a', '#245c62', '#a33b2b', '#3d4a28', '#f0e2c4', '#1e3f4a', '#8a5a2b'];
const LABEL_COLORS = ['#f3e6c8', '#f7f1e4', '#e7d39a', '#d5e2dc', '#e4d4ea', '#f6e1c4'];

function gameBox(parent, w, h, d, color, label, x, y, z, yaw = 0) {
  const grp = new THREE.Group();
  quiet(addBox(grp, w, h, d, mat(color), 0, h / 2, 0));
  quiet(addBox(grp, w * 0.86, h * 0.62, 0.008, mat(label), 0, h * 0.58, -d / 2 - 0.004));
  quiet(addBox(grp, w * 0.62, h * 0.12, 0.008, mat('#2a241c'), 0, h * 0.38, -d / 2 - 0.008));
  quiet(addBox(grp, w * 0.2, h * 0.2, 0.008, mat(color), -w * 0.24, h * 0.7, -d / 2 - 0.008));
  grp.position.set(x, y, z);
  grp.rotation.y = yaw;
  parent.add(grp);
  return grp;
}

const FACE_ROWS = [
  [0.22, 0.2, 0.18],
  [0.26, 0.24],
  [0.18, 0.22, 0.16],
  [0.28, 0.2],
];

function fillCase(parent, seed) {
  const rand = mulberry32(seed);
  BAYS.forEach((bay, bi) => {
    const zFront = -0.06;
    if (bi === 0 && seed % 2 === 0) {
      for (let i = 0; i < 5; i++) {
        gameBox(parent, 0.3, 0.055, 0.22, BOX_COLORS[(seed + i) % BOX_COLORS.length], LABEL_COLORS[i % LABEL_COLORS.length], -0.22, bay.y + i * 0.055, zFront + 0.04, 0);
      }
      gameBox(parent, 0.22, Math.min(0.36, bay.clear - 0.02), 0.08, BOX_COLORS[(seed + 3) % BOX_COLORS.length], LABEL_COLORS[2], 0.16, bay.y, zFront, 0);
      return;
    }
    const pattern = FACE_ROWS[(seed + bi) % FACE_ROWS.length];
    const gap = 0.012;
    const total = pattern.reduce((sum, w) => sum + w, 0) + gap * (pattern.length - 1);
    let x = -total / 2;
    pattern.forEach((w) => {
      const h = Math.min(bay.clear - 0.02, 0.26 + rand() * 0.1);
      const color = BOX_COLORS[Math.floor(rand() * BOX_COLORS.length)];
      const label = LABEL_COLORS[Math.floor(rand() * LABEL_COLORS.length)];
      gameBox(parent, w, h, 0.08, color, label, x + w / 2, bay.y, zFront, 0);
      x += w + gap;
    });
  });
}

function meeple(g, x, y, z, color) {
  quiet(addCyl(g, 0.012, 0.018, 0.036, mat(color), x, y + 0.018, z, 8));
  quiet(addCyl(g, 0.013, 0.013, 0.016, mat(color), x, y + 0.042, z, 8));
}

function card(g, x, y, z, yaw, face, back = '#f4efe6') {
  const grp = new THREE.Group();
  quiet(addBox(grp, 0.058, 0.005, 0.088, mat(back), 0, 0.003, 0));
  quiet(addBox(grp, 0.044, 0.003, 0.04, mat(face), 0, 0.007, -0.014));
  grp.position.set(x, y, z);
  grp.rotation.y = yaw;
  g.add(grp);
}

function die(g, x, y, z, ry = 0.4) {
  const grp = new THREE.Group();
  quiet(addBox(grp, 0.028, 0.028, 0.028, mat('#f7f4ee'), 0, 0.014, 0));
  quiet(addBox(grp, 0.007, 0.004, 0.007, mat('#222222'), 0.006, 0.03, 0.006));
  quiet(addBox(grp, 0.007, 0.004, 0.007, mat('#222222'), -0.006, 0.03, -0.005));
  grp.position.set(x, y, z);
  grp.rotation.set(0.15, ry, 0.2);
  g.add(grp);
}

function chips(g, x, y, z, color, n) {
  for (let i = 0; i < n; i++) quiet(addCyl(g, 0.02, 0.02, 0.007, mat(color), x, y + 0.004 + i * 0.008, z, 12));
}

function checkerMan(g, x, y, z, color, king = false) {
  quiet(addCyl(g, 0.028, 0.03, 0.012, mat(color), x, y + 0.007, z, 14));
  quiet(addCyl(g, 0.022, 0.024, 0.008, mat(color), x, y + 0.016, z, 12));
  if (king) {
    quiet(addCyl(g, 0.026, 0.028, 0.01, mat(color), x, y + 0.026, z, 12));
    quiet(addCyl(g, 0.01, 0.01, 0.008, mat('#d4b060'), x, y + 0.036, z, 8));
  }
}

function addCheckers(g, table) {
  const top = footprint(table).top;
  const { x, z } = table;
  const n = 8;
  const span = 0.72;
  const cell = span / n;
  quiet(addBox(g, span + 0.08, 0.016, span + 0.08, mat('#3a2418'), x, top + 0.008, z));
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      const light = (i + j) % 2 === 0;
      quiet(addBox(g, cell * 0.96, 0.01, cell * 0.96, mat(light ? '#e8d7b4' : '#4a3020'), x + (i - (n - 1) / 2) * cell, top + 0.018, z + (j - (n - 1) / 2) * cell));
    }
  }
  const red = '#b43a32';
  const blk = '#1c1c20';
  const man = (i, j, color, king = false) => {
    checkerMan(g, x + (i - (n - 1) / 2) * cell, top + 0.022, z + (j - (n - 1) / 2) * cell, color, king);
  };
  for (const [i, j] of [[0, 1], [0, 3], [1, 0], [1, 2], [2, 1], [3, 0], [2, 5]]) man(i, j, red);
  man(3, 2, red, true);
  for (const [i, j] of [[5, 6], [6, 5], [6, 7], [7, 4], [7, 6], [5, 4], [4, 7]]) man(i, j, blk);
  man(4, 5, blk, true);
  man(3, 4, red);
  man(4, 3, blk);
  for (let i = 0; i < 3; i++) checkerMan(g, x - 0.48, top + 0.022 + i * 0.012, z + 0.42, red);
  for (let i = 0; i < 2; i++) checkerMan(g, x + 0.48, top + 0.022 + i * 0.012, z - 0.42, blk);
}

const hexGeo = new THREE.CylinderGeometry(0.044, 0.044, 0.01, 6);

function addHexGame(g, table) {
  const { x, z } = table;
  const top = footprint(table).top;
  const r = 0.048;
  const dx = 1.5 * r;
  const dz = Math.sqrt(3) * r;
  const cols = 10;
  const rows = 6;
  const width = (cols - 1) * dx;
  const depth = (rows - 1) * dz + dz * 0.5;
  quiet(addBox(g, width + 0.18, 0.016, depth + 0.14, mat('#1c3a32'), x, top + 0.008, z));
  const colors = ['#7f9a5c', '#c2a36e', '#6d93b4', '#d9d3c3', '#8d5a4a', '#ded3b0'];
  for (let c = 0; c < cols; c++) {
    for (let row = 0; row < rows; row++) {
      const hx = x - width / 2 + c * dx;
      const hz = z - depth / 2 + row * dz + (c % 2) * (dz * 0.5);
      const mesh = new THREE.Mesh(hexGeo, mat(colors[(c * 3 + row * 5) % colors.length]));
      mesh.position.set(hx, top + 0.02, hz);
      quiet(mesh);
      g.add(mesh);
    }
  }
  const people = [
    [-0.22, -0.06, '#c4493a'], [-0.16, -0.02, '#c4493a'], [-0.2, 0.05, '#c4493a'],
    [0.12, 0.08, '#2f5f9a'], [0.18, 0.02, '#2f5f9a'], [0.1, -0.02, '#2f5f9a'],
    [0.02, -0.12, '#e0a33a'], [-0.02, 0.12, '#f4f1ea'], [0.22, -0.1, '#f4f1ea'],
  ];
  for (const [ox, oz, color] of people) meeple(g, x + ox, top + 0.02, z + oz, color);
  for (let i = 0; i < 5; i++) card(g, x + 0.72, top, z - 0.16 + i * 0.08, 0.15, ['#c4493a', '#2f5f9a', '#e0a33a', '#2f6a45', '#7a3a6a'][i], '#f7f1e4');
  for (let i = 0; i < 6; i++) quiet(addBox(g, 0.062, 0.004, 0.09, mat('#1a3a5c'), x - 0.78, top + 0.004 + i * 0.004, z + 0.12));
  die(g, x + 0.7, top, z - 0.34, 0.8);
  die(g, x + 0.76, top, z - 0.34, 1.4);
  quiet(addBox(g, 0.12, 0.006, 0.16, mat('#f7f4ee'), x + 0.68, top + 0.006, z + 0.32));
  for (let i = 0; i < 4; i++) quiet(addBox(g, 0.08, 0.003, 0.006, mat('#2a2a2a'), x + 0.68, top + 0.012, z + 0.27 + i * 0.02));
}

function addCardGame(g, table) {
  const top = footprint(table).top;
  const { x, z } = table;
  quiet(addBox(g, 0.92, 0.014, 0.92, mat('#1e6a42'), x, top + 0.008, z));
  quiet(addBox(g, 0.78, 0.006, 0.78, mat('#165634'), x, top + 0.016, z));
  const seats = [
    { yaw: 0, dx: 0, dz: 1 },
    { yaw: Math.PI, dx: 0, dz: -1 },
    { yaw: -Math.PI / 2, dx: 1, dz: 0 },
    { yaw: Math.PI / 2, dx: -1, dz: 0 },
  ];
  const faces = ['#c4493a', '#2f5f9a', '#e0a33a', '#7a3a6a', '#2f6a45'];
  seats.forEach((s, si) => {
    for (let i = -2; i <= 2; i++) {
      const spread = i * 0.065;
      const px = x + s.dx * 0.28 + -s.dz * spread;
      const pz = z + s.dz * 0.28 + s.dx * spread;
      card(g, px, top + 0.012, pz, s.yaw + i * 0.14, faces[(i + 2 + si) % faces.length]);
    }
  });
  for (let i = 0; i < 5; i++) card(g, x - 0.16 + i * 0.08, top + 0.014, z, 0, faces[i], '#16241c');
  chips(g, x - 0.22, top + 0.016, z + 0.1, '#c4493a', 6);
  chips(g, x - 0.12, top + 0.016, z + 0.12, '#f4f1ea', 8);
  chips(g, x + 0.22, top + 0.016, z - 0.1, '#2a2a2a', 5);
  chips(g, x + 0.12, top + 0.016, z - 0.12, '#2f5f9a', 7);
  quiet(addCyl(g, 0.018, 0.018, 0.006, mat('#f2efe6'), x + 0.26, top + 0.02, z + 0.02, 12));
}

function addGo(g, table) {
  const top = footprint(table).top;
  const { x, z } = table;
  quiet(addBox(g, 0.72, 0.018, 0.72, mat('#c9965a'), x, top + 0.009, z));
  quiet(addBox(g, 0.6, 0.008, 0.6, mat('#e2bc82'), x, top + 0.02, z));
  const n = 9;
  const span = 0.48;
  const step = span / (n - 1);
  for (let i = 0; i < n; i++) {
    const o = -span / 2 + i * step;
    quiet(addBox(g, span, 0.004, 0.006, mat('#3a2a1c'), x, top + 0.028, z + o));
    quiet(addBox(g, 0.006, 0.004, span, mat('#3a2a1c'), x + o, top + 0.028, z));
  }
  const stones = [
    [0, 0, '#1a1a1a'], [1, 0, '#1a1a1a'], [0, 1, '#f4f1ea'], [-1, 0, '#f4f1ea'],
    [2, -1, '#1a1a1a'], [-2, 1, '#f4f1ea'], [1, -2, '#1a1a1a'], [-1, -1, '#f4f1ea'],
    [3, 1, '#1a1a1a'], [-3, 0, '#f4f1ea'], [0, -3, '#1a1a1a'], [2, 2, '#f4f1ea'],
    [-2, -2, '#1a1a1a'], [1, 2, '#f4f1ea'], [3, -2, '#1a1a1a'], [-3, 2, '#f4f1ea'],
  ];
  for (const [ix, iz, col] of stones) {
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.018, 12, 8), mat(col));
    m.scale.y = 0.42;
    m.position.set(x + ix * step, top + 0.038, z + iz * step);
    quiet(m);
    g.add(m);
  }
  quiet(addCyl(g, 0.055, 0.045, 0.028, mat('#4a3024'), x - 0.38, top + 0.02, z + 0.28, 12));
  quiet(addCyl(g, 0.055, 0.045, 0.028, mat('#4a3024'), x + 0.38, top + 0.02, z - 0.26, 12));
  for (let i = 0; i < 4; i++) {
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.012, 8, 6), mat('#1a1a1a'));
    m.position.set(x - 0.38 + (i - 1.5) * 0.016, top + 0.04, z + 0.28);
    quiet(m);
    g.add(m);
  }
}

function addRugs(g) {
  for (const t of TABLES) {
    const r = rugFor(t);
    quiet(addBox(g, r.w, 0.012, r.d, mat(r.border), r.x, 0.006, r.z));
    quiet(addBox(g, r.w - 0.1, 0.012, r.d - 0.1, mat(r.color), r.x, 0.012, r.z));
  }
  quiet(addBox(g, 1.05, 0.01, 2.4, mat('#4a2830'), 0.08, 0.007, -1.55));
}

function addShelves(g) {
  for (const c of CASES) {
    const grp = new THREE.Group();
    grp.position.set(c.x, 0, c.z);
    grp.rotation.y = c.yaw;
    fillCase(grp, c.seed);
    g.add(grp);
  }
  const lower = shelfWorldY(WALL_SHELF.lowerTop);
  const upper = shelfWorldY(WALL_SHELF.upperTop);
  SHELVES.forEach((s, si) => {
    for (let i = 0; i < 5; i++) {
      gameBox(g, 0.2, 0.3, 0.07, BOX_COLORS[(i + si * 2) % BOX_COLORS.length], LABEL_COLORS[i % LABEL_COLORS.length], s.x - 0.42 + i * 0.21, lower, s.z + 0.04, Math.PI);
    }
    for (let i = 0; i < 4; i++) {
      gameBox(g, 0.22, 0.055, 0.16, BOX_COLORS[(i + si * 3 + 4) % BOX_COLORS.length], LABEL_COLORS[(i + 2) % LABEL_COLORS.length], s.x - 0.36 + i * 0.24, upper, s.z + 0.02, Math.PI);
    }
  });

  addBox(g, DISPLAY.w, DISPLAY.h - 0.04, DISPLAY.d, mat('#5a3a28'), DISPLAY.x, (DISPLAY.h - 0.04) / 2, DISPLAY.z);
  addBox(g, DISPLAY.w + 0.04, 0.04, DISPLAY.d + 0.04, mat('#c2a36e'), DISPLAY.x, DISPLAY.h - 0.02, DISPLAY.z);
  for (let i = 0; i < 4; i++) {
    gameBox(g, 0.24, 0.3, 0.07, BOX_COLORS[i % BOX_COLORS.length], LABEL_COLORS[i % LABEL_COLORS.length], DISPLAY.x - 0.48 + i * 0.32, DISPLAY.h, DISPLAY.z, Math.PI);
  }

  addBox(g, CRATE.w, CRATE.h - 0.04, CRATE.d, mat('#6b4630'), CRATE.x, (CRATE.h - 0.04) / 2, CRATE.z);
  addBox(g, CRATE.w + 0.04, 0.04, CRATE.d + 0.04, mat('#d7c4a3'), CRATE.x, CRATE.h - 0.02, CRATE.z);
  for (let i = 0; i < 3; i++) {
    const box = gameBox(g, 0.2, 0.26, 0.07, BOX_COLORS[i + 5], LABEL_COLORS[i], CRATE.x - 0.22 + i * 0.22, CRATE.h, CRATE.z, Math.PI);
    if (i === 2) box.rotation.z = 0.14;
  }

  addBox(g, RETURNS.w, RETURNS.h - 0.04, RETURNS.d, mat('#5a3a24'), RETURNS.x, (RETURNS.h - 0.04) / 2, RETURNS.z);
  addBox(g, RETURNS.w + 0.03, 0.03, RETURNS.d + 0.03, mat('#c8b089'), RETURNS.x, RETURNS.h - 0.02, RETURNS.z);
  for (let i = 0; i < 3; i++) {
    gameBox(g, 0.18, 0.22, 0.06, BOX_COLORS[i + 8], LABEL_COLORS[i], RETURNS.x - 0.2 + i * 0.2, RETURNS.h, RETURNS.z, Math.PI);
  }
}

function addSign(g) {
  const c = document.createElement('canvas');
  c.width = 1024;
  c.height = 280;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#6a2436';
  ctx.fillRect(0, 0, 1024, 280);
  ctx.strokeStyle = '#e6c27a';
  ctx.lineWidth = 14;
  ctx.strokeRect(18, 18, 988, 244);
  ctx.fillStyle = '#f4e6c8';
  ctx.font = '700 88px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('THE NIGHT BOARD', 512, 118);
  ctx.font = '500 34px Georgia, serif';
  ctx.fillStyle = '#e6c27a';
  ctx.fillText('PLAY  ·  PIECES  ·  BOXES', 512, 200);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const panel = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 0.46), toon('#ffffff', { map: tex }));
  panel.position.set(2.55, 2.42, INNER.backZ + 0.05);
  quiet(panel);
  g.add(panel);
  addBox(g, 1.84, 0.06, 0.04, mat('#4e3324'), 2.55, 2.68, INNER.backZ + 0.04);
  addBox(g, 1.84, 0.06, 0.04, mat('#4e3324'), 2.55, 2.16, INNER.backZ + 0.04);
  const spot = new THREE.SpotLight('#ffe0b0', 14, 5, 0.42, 0.4, 2);
  spot.position.set(2.55, 2.85, -2.2);
  const target = new THREE.Object3D();
  target.position.set(2.55, 2.42, INNER.backZ);
  g.add(target);
  spot.target = target;
  g.add(spot);
}

function addNightBoardCard(g) {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 768;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#24362a';
  ctx.fillRect(0, 0, 512, 768);
  ctx.fillStyle = '#e6c27a';
  ctx.font = '700 42px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.fillText('CLUB NIGHT', 256, 70);
  const rows = ['Hex campaign  ·  table 1', 'Checkers ladder  ·  table 2', 'Open cards  ·  table 3', 'Go teaching  ·  table 4', 'Box returns by the door'];
  ctx.font = '500 28px Georgia, serif';
  ctx.textAlign = 'left';
  ctx.fillStyle = '#f4e6c8';
  rows.forEach((line, i) => {
    ctx.fillRect(48, 140 + i * 110, 416, 4);
    ctx.fillText(line, 56, 190 + i * 110);
  });
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(0.95, 1.42), toon('#ffffff', { map: tex }));
  mesh.position.set(INNER.leftX + 0.09, 1.55, BOARD.z);
  mesh.rotation.y = Math.PI / 2;
  quiet(mesh);
  g.add(mesh);
}

function addLightPools(g) {
  const glow = toon('#ffe2b0', { emissive: '#ffb15a', emissiveIntensity: 1.6 });
  for (const p of pendants()) {
    const spot = new THREE.SpotLight('#ffc27a', p.shade > 1.9 ? 16 : 24, 3.5, 0.5, 0.55, 2);
    spot.position.set(p.x, p.shade + 0.05, p.z);
    const target = new THREE.Object3D();
    target.position.set(p.x, 0.7, p.z);
    g.add(target);
    spot.target = target;
    g.add(spot);
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.032, 12, 8), glow);
    bulb.position.set(p.x, p.shade + 0.05, p.z);
    bulb.userData.castShadow = false;
    g.add(bulb);
    const y0 = p.shade + PENDANT_H;
    const y1 = 3.06;
    quiet(addCyl(g, 0.007, 0.007, Math.max(0.05, y1 - y0), mat('#2c241c'), p.x, (y0 + y1) / 2, p.z, 6));
    quiet(addCyl(g, 0.04, 0.028, 0.03, mat('#3a3228'), p.x, y1 - 0.012, p.z, 10));
  }
}

function addLecternBook(g) {
  quiet(addBox(g, 0.28, 0.02, 0.36, mat('#f7f4ee'), LECTERN.x + 0.04, LECTERN.targetH + 0.01, LECTERN.z));
  quiet(addBox(g, 0.02, 0.025, 0.36, mat('#6e2c34'), LECTERN.x + 0.04, LECTERN.targetH + 0.02, LECTERN.z));
  for (let i = 0; i < 5; i++) quiet(addBox(g, 0.1, 0.004, 0.008, mat('#2a2a2a'), LECTERN.x - 0.04, LECTERN.targetH + 0.028, LECTERN.z - 0.1 + i * 0.04));
}

function addFoliage(g) {
  for (const p of PLANTS) {
    addCyl(g, 0.025, 0.03, 0.2, mat('#4a5a32'), p.x, 0.42, p.z, 8);
    const leaf = mat('#3d6a42');
    const leaf2 = mat('#2f5a36');
    const s1 = new THREE.Mesh(new THREE.SphereGeometry(0.18, 10, 8), leaf);
    s1.position.set(p.x, 0.68, p.z);
    s1.scale.set(1.15, 0.9, 1);
    g.add(s1);
    const s2 = new THREE.Mesh(new THREE.SphereGeometry(0.14, 10, 8), leaf2);
    s2.position.set(p.x + 0.1, 0.78, p.z - 0.05);
    g.add(s2);
    const s3 = new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 8), leaf);
    s3.position.set(p.x - 0.08, 0.74, p.z + 0.06);
    g.add(s3);
  }
}

function addPegs(g) {
  const wood = mat('#4e3324');
  addBox(g, 0.06, 0.08, 1.15, wood, INNER.leftX + 0.08, 1.55, 2.85);
  for (let i = 0; i < 5; i++) {
    addCyl(g, 0.018, 0.014, 0.08, wood, INNER.leftX + 0.12, 1.52, 2.45 + i * 0.2, 8);
  }
}

export function buildProcedural() {
  const g = new THREE.Group();
  g.name = 'procedural';
  addRugs(g);
  addShelves(g);
  addSign(g);
  addNightBoardCard(g);
  addLightPools(g);
  addLecternBook(g);
  addFoliage(g);
  addPegs(g);
  const byId = Object.fromEntries(TABLES.map((t) => [t.id, t]));
  addHexGame(g, byId.campaign);
  addCheckers(g, byId.checkers);
  addCardGame(g, byId.cards);
  addGo(g, byId.go);
  return g;
}

export function plankMaterial() {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 512;
  const ctx = c.getContext('2d');
  const colors = ['#8a5a36', '#7a4c2c', '#96633f', '#6b4428', '#a07048'];
  for (let y = 0; y < 512; y += 36) {
    ctx.fillStyle = colors[(y / 36) % colors.length];
    ctx.fillRect(0, y, 512, 34);
    ctx.fillStyle = 'rgba(40,18,8,0.35)';
    ctx.fillRect(0, y + 34, 512, 2);
    ctx.strokeStyle = 'rgba(40,18,8,0.4)';
    ctx.beginPath();
    const shift = (y / 36) % 2 ? 90 : 10;
    for (let x = shift; x < 512; x += 170) {
      ctx.moveTo(x, y);
      ctx.lineTo(x, y + 34);
    }
    ctx.stroke();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(3.0, 2.6);
  return toon('#ffffff', { map: tex });
}
