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
  BAR,
  DISPLAY,
  CRATE,
  LECTERN,
  PENDANT_H,
  pendants,
  rugFor,
  INNER,
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
  quiet(addBox(grp, w * 0.22, h * 0.22, 0.008, mat(color), -w * 0.22, h * 0.7, -d / 2 - 0.008));
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
    if (bi === 0 && seed % 2 === 0) {
      const stackW = 0.28;
      for (let i = 0; i < 4; i++) {
        gameBox(
          parent,
          stackW,
          0.05,
          0.2,
          BOX_COLORS[(seed + i) % BOX_COLORS.length],
          LABEL_COLORS[i % LABEL_COLORS.length],
          -0.3 + stackW / 2,
          bay.y + i * 0.05,
          0.05,
          0
        );
      }
      gameBox(parent, 0.2, Math.min(0.32, bay.clear - 0.03), 0.06, BOX_COLORS[(seed + 3) % BOX_COLORS.length], LABEL_COLORS[2], 0.16, bay.y, 0.06, 0);
      return;
    }
    const pattern = FACE_ROWS[(seed + bi) % FACE_ROWS.length];
    const gap = 0.02;
    const total = pattern.reduce((sum, w) => sum + w, 0) + gap * (pattern.length - 1);
    let x = -total / 2;
    pattern.forEach((w) => {
      const h = Math.min(bay.clear - 0.03, 0.18 + rand() * 0.08);
      const color = BOX_COLORS[Math.floor(rand() * BOX_COLORS.length)];
      const label = LABEL_COLORS[Math.floor(rand() * LABEL_COLORS.length)];
      gameBox(parent, w, h, 0.055, color, label, x + w / 2, bay.y, 0.07, 0);
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

const hexGeo = new THREE.CylinderGeometry(0.044, 0.044, 0.01, 6);

function addHexGame(g, table) {
  const { x, z, top } = { x: table.x, z: table.z, top: footprint(table).top };
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
  for (let i = 0; i < 5; i++) card(g, x + 0.62, top, z - 0.16 + i * 0.08, 0.15, ['#c4493a', '#2f5f9a', '#e0a33a', '#2f6a45', '#7a3a6a'][i], '#f7f1e4');
  for (let i = 0; i < 6; i++) quiet(addBox(g, 0.062, 0.004, 0.09, mat('#1a3a5c'), x - 0.62, top + 0.004 + i * 0.004, z + 0.12));
  die(g, x + 0.58, top, z - 0.32, 0.8);
  die(g, x + 0.64, top, z - 0.32, 1.4);
  quiet(addBox(g, 0.12, 0.006, 0.16, mat('#f7f4ee'), x + 0.55, top + 0.006, z + 0.3));
  for (let i = 0; i < 4; i++) quiet(addBox(g, 0.08, 0.003, 0.006, mat('#2a2a2a'), x + 0.55, top + 0.012, z + 0.25 + i * 0.02));
}

function addTrackGame(g, table) {
  const top = footprint(table).top;
  const { x, z } = table;
  quiet(addBox(g, 0.94, 0.016, 0.94, mat('#f0e2c4'), x, top + 0.008, z));
  quiet(addBox(g, 0.8, 0.01, 0.8, mat('#214840'), x, top + 0.016, z));
  const colors = ['#c4493a', '#e0a33a', '#3d7a4a', '#3a5f8a', '#f4f1ea', '#7a3a6a'];
  const n = 8;
  const span = 0.64;
  const step = span / (n - 1);
  const cells = [];
  for (let i = 0; i < n; i++) cells.push([x - span / 2 + i * step, z - span / 2]);
  for (let i = 1; i < n; i++) cells.push([x + span / 2, z - span / 2 + i * step]);
  for (let i = 1; i < n; i++) cells.push([x + span / 2 - i * step, z + span / 2]);
  for (let i = 1; i < n - 1; i++) cells.push([x - span / 2, z + span / 2 - i * step]);
  cells.forEach((p, i) => quiet(addBox(g, 0.062, 0.01, 0.062, mat(colors[i % colors.length]), p[0], top + 0.026, p[1])));
  quiet(addCyl(g, 0.16, 0.16, 0.012, mat('#e7d7b0'), x, top + 0.028, z, 24));
  quiet(addCyl(g, 0.07, 0.07, 0.01, mat('#8d3a3a'), x, top + 0.038, z, 20));
  const tokenColors = ['#c4493a', '#3a5f8a', '#e0a33a', '#f4f1ea'];
  [2, 9, 16, 22].forEach((idx, k) => {
    const p = cells[idx % cells.length];
    quiet(addCyl(g, 0.02, 0.02, 0.014, mat(tokenColors[k]), p[0], top + 0.04, p[1], 12));
  });
  for (let i = 0; i < 5; i++) quiet(addBox(g, 0.07, 0.004, 0.1, mat('#1e3a5a'), x - 0.5, top + 0.004 + i * 0.005, z - 0.48));
  die(g, x - 0.28, top, z + 0.22, 0.3);
  die(g, x - 0.22, top, z + 0.26, 1.1);
}

function addCardGame(g, table) {
  const top = footprint(table).top;
  const { x, z } = table;
  quiet(addCyl(g, 0.5, 0.5, 0.014, mat('#1e6a42'), x, top + 0.008, z, 36));
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
      const px = x + s.dx * 0.3 + -s.dz * spread;
      const pz = z + s.dz * 0.3 + s.dx * spread;
      card(g, px, top + 0.012, pz, s.yaw + i * 0.14, faces[(i + 2 + si) % faces.length]);
    }
  });
  for (let i = 0; i < 5; i++) card(g, x - 0.18 + i * 0.09, top + 0.014, z, 0, faces[i], '#16241c');
  chips(g, x - 0.22, top + 0.016, z + 0.12, '#c4493a', 6);
  chips(g, x - 0.12, top + 0.016, z + 0.14, '#f4f1ea', 8);
  chips(g, x + 0.22, top + 0.016, z - 0.12, '#2a2a2a', 5);
  chips(g, x + 0.12, top + 0.016, z - 0.14, '#2f5f9a', 7);
  quiet(addCyl(g, 0.018, 0.018, 0.006, mat('#f2efe6'), x + 0.28, top + 0.02, z + 0.02, 12));
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
    [-2, -2, '#1a1a1a'], [1, 2, '#f4f1ea'],
  ];
  for (const [ix, iz, col] of stones) {
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.018, 12, 8), mat(col));
    m.scale.y = 0.42;
    m.position.set(x + ix * step, top + 0.038, z + iz * step);
    quiet(m);
    g.add(m);
  }
  quiet(addCyl(g, 0.055, 0.045, 0.028, mat('#4a3024'), x - 0.4, top + 0.02, z + 0.3, 12));
  quiet(addCyl(g, 0.055, 0.045, 0.028, mat('#4a3024'), x + 0.4, top + 0.02, z - 0.28, 12));
  for (let i = 0; i < 4; i++) {
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.012, 8, 6), mat('#1a1a1a'));
    m.position.set(x - 0.4 + (i - 1.5) * 0.016, top + 0.04, z + 0.3);
    quiet(m);
    g.add(m);
  }
}

function addLesson(g, table) {
  const top = footprint(table).top;
  const { x, z } = table;
  quiet(addBox(g, 0.5, 0.014, 0.34, mat('#f6f0e4'), x + 0.06, top + 0.008, z - 0.02));
  const sample = ['#7f9a5c', '#c2a36e', '#6d93b4', '#d9d3c3'];
  for (let i = 0; i < 4; i++) {
    const mesh = new THREE.Mesh(hexGeo, mat(sample[i]));
    mesh.position.set(x - 0.08 + i * 0.1, top + 0.02, z - 0.02);
    quiet(mesh);
    g.add(mesh);
  }
  meeple(g, x - 0.08, top + 0.02, z - 0.02, '#c4493a');
  meeple(g, x + 0.02, top + 0.02, z - 0.02, '#2f5f9a');
  meeple(g, x + 0.22, top + 0.02, z - 0.02, '#e0a33a');
  const arrow = new THREE.Mesh(new THREE.ConeGeometry(0.018, 0.07, 8), mat('#c4493a'));
  arrow.rotation.z = -Math.PI / 2;
  arrow.position.set(x + 0.02, top + 0.06, z + 0.1);
  quiet(arrow);
  g.add(arrow);
  quiet(addBox(g, 0.18, 0.008, 0.24, mat('#f7f4ee'), x - 0.16, top + 0.01, z + 0.16));
  quiet(addBox(g, 0.18, 0.008, 0.24, mat('#f3ecdf'), x + 0.02, top + 0.01, z + 0.16));
  quiet(addBox(g, 0.04, 0.012, 0.24, mat('#6e2c34'), x - 0.07, top + 0.012, z + 0.16));
  for (let i = 0; i < 4; i++) quiet(addBox(g, 0.12, 0.003, 0.006, mat('#2a2a2a'), x - 0.16, top + 0.018, z + 0.1 + i * 0.028));
}

function addRugs(g) {
  for (const t of TABLES) {
    const r = rugFor(t);
    quiet(addBox(g, r.w, 0.012, r.d, mat(r.border), r.x, 0.006, r.z));
    quiet(addBox(g, r.w - 0.1, 0.012, r.d - 0.1, mat(r.color), r.x, 0.012, r.z));
  }
  quiet(addBox(g, 0.9, 0.012, 2.3, mat('#142824'), 0.42, 0.008, -1.7));
  const front = BAR.z + BAR.depth / 2;
  quiet(addBox(g, BAR.x1 - BAR.x0 - 0.5, 0.01, 0.62, mat('#1a3330'), (BAR.x0 + BAR.x1) / 2, 0.008, front + 0.36));
}

function addBar(g) {
  const wood = mat('#4a3022');
  const woodD = mat('#3a2418');
  const door = mat('#6a4630');
  const top = mat('#e6d3b0');
  const brass = mat('#c6a15a');
  const len = BAR.x1 - BAR.x0;
  const cx = (BAR.x0 + BAR.x1) / 2;
  const z = BAR.z;
  const d = BAR.depth;
  addBox(g, len - 0.12, 0.1, d - 0.12, woodD, cx, 0.05, z + 0.02);
  addBox(g, len, 0.78, d - 0.04, wood, cx, 0.5, z);
  const doors = 5;
  const dw = (len - 0.24) / doors;
  const front = z + d / 2;
  for (let i = 0; i < doors; i++) {
    const dx = BAR.x0 + 0.12 + dw * (i + 0.5);
    addBox(g, dw - 0.06, 0.58, 0.02, door, dx, 0.5, front + 0.012);
    addBox(g, 0.03, 0.7, 0.025, woodD, dx - dw / 2, 0.5, front + 0.01);
  }
  addBox(g, len + 0.08, 0.05, d + 0.1, top, cx, BAR.top - 0.025, z + 0.03);
  const rail = addCyl(g, 0.016, 0.016, len - 0.5, brass, cx, 0.2, front + 0.06, 10);
  rail.rotation.z = Math.PI / 2;
  for (let i = 0; i < 5; i++) addBox(g, 0.025, 0.16, 0.025, brass, BAR.x0 + 0.45 + i * 0.72, 0.12, front + 0.05);

  const glass = mat('#d7ebf2', { transparent: true, opacity: 0.38, side: THREE.DoubleSide });
  addBox(g, 0.46, 0.05, 0.32, wood, 2.45, BAR.top + 0.025, -3.78);
  const pastry = addBox(g, 0.42, 0.28, 0.28, glass, 2.45, BAR.top + 0.2, -3.78);
  pastry.userData.castShadow = false;
  quiet(addCyl(g, 0.05, 0.05, 0.04, mat('#e6b25a'), 2.38, BAR.top + 0.08, -3.78, 10));
  quiet(addCyl(g, 0.045, 0.045, 0.035, mat('#8d3a3a'), 2.52, BAR.top + 0.075, -3.8, 10));

  const tile = tileMaterial();
  const splash = new THREE.Mesh(new THREE.PlaneGeometry(len, 0.5), tile);
  splash.position.set(cx, BAR.top + 0.28, INNER.backZ + 0.02);
  quiet(splash);
  g.add(splash);
}

function tileMaterial() {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 64;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#f3eadc';
  ctx.fillRect(0, 0, 256, 64);
  ctx.strokeStyle = '#c4b49a';
  ctx.lineWidth = 3;
  for (let x = 0; x <= 256; x += 32) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, 64);
    ctx.stroke();
  }
  for (let y = 0; y <= 64; y += 32) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(256, y);
    ctx.stroke();
  }
  ctx.fillStyle = '#1c3f38';
  for (let i = 0; i < 6; i++) ctx.fillRect(8 + i * 42, i % 2 ? 36 : 4, 22, 22);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.repeat.set(5, 1);
  return toon('#ffffff', { map: tex });
}

function bottle(g, x, y, z, h, color) {
  quiet(addCyl(g, h * 0.09, h * 0.11, h * 0.72, mat(color), x, y + h * 0.36, z, 8));
  quiet(addCyl(g, h * 0.035, h * 0.04, h * 0.28, mat('#e7e0d4'), x, y + h * 0.86, z, 6));
}

function addBackbar(g) {
  const lower = shelfWorldY(WALL_SHELF.lowerTop);
  const upper = shelfWorldY(WALL_SHELF.upperTop);
  const colors = ['#7a1e2e', '#1e4a32', '#c4a15a', '#6a2030', '#2a3a28', '#d8d2c6', '#8a3a1a', '#244a62'];
  SHELVES.forEach((s, si) => {
    for (let i = 0; i < 7; i++) {
      const h = 0.18 + ((i + si) % 4) * 0.035;
      bottle(g, s.x - 0.46 + i * 0.15, lower, s.z, h, colors[(i + si) % colors.length]);
    }
    for (let i = 0; i < 4; i++) {
      gameBox(g, 0.2, 0.045, 0.14, BOX_COLORS[(i + si * 3) % BOX_COLORS.length], LABEL_COLORS[i % LABEL_COLORS.length], s.x - 0.36 + i * 0.24, upper, s.z, 0);
    }
  });
}

function addShelves(g) {
  for (const c of CASES) {
    const grp = new THREE.Group();
    grp.position.set(c.x, 0, c.z);
    grp.rotation.y = c.yaw;
    fillCase(grp, c.seed);
    g.add(grp);
  }
  const top = DISPLAY.h;
  addBox(g, DISPLAY.w, DISPLAY.h - 0.04, DISPLAY.d, mat('#5a3a28'), DISPLAY.x, (DISPLAY.h - 0.04) / 2, DISPLAY.z);
  addBox(g, DISPLAY.w + 0.04, 0.04, DISPLAY.d + 0.04, mat('#c2a36e'), DISPLAY.x, top - 0.02, DISPLAY.z);
  for (let i = 0; i < 4; i++) {
    gameBox(
      g,
      0.24,
      0.3,
      0.07,
      BOX_COLORS[i % BOX_COLORS.length],
      LABEL_COLORS[i % LABEL_COLORS.length],
      DISPLAY.x - 0.48 + i * 0.32,
      top,
      DISPLAY.z,
      Math.PI
    );
  }
  addBox(g, CRATE.w, CRATE.h - 0.04, CRATE.d, mat('#6b4630'), CRATE.x, (CRATE.h - 0.04) / 2, CRATE.z);
  addBox(g, CRATE.w + 0.04, 0.04, CRATE.d + 0.04, mat('#d7c4a3'), CRATE.x, CRATE.h - 0.02, CRATE.z);
  for (let i = 0; i < 3; i++) {
    const box = gameBox(g, 0.2, 0.26, 0.07, BOX_COLORS[i + 4], LABEL_COLORS[i], CRATE.x - 0.24 + i * 0.24, CRATE.h, CRATE.z, Math.PI);
    if (i === 2) box.rotation.z = 0.12;
  }
}

function addSign(g) {
  const c = document.createElement('canvas');
  c.width = 1024;
  c.height = 280;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#1c3f38';
  ctx.fillRect(0, 0, 1024, 280);
  ctx.strokeStyle = '#e6c27a';
  ctx.lineWidth = 14;
  ctx.strokeRect(18, 18, 988, 244);
  ctx.fillStyle = '#f4e6c8';
  ctx.font = '700 92px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('MEEPLE & BEAN', 512, 118);
  ctx.font = '500 36px Georgia, serif';
  ctx.fillStyle = '#e6c27a';
  ctx.fillText('BOARD GAMES   ·   COFFEE', 512, 200);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const panel = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 0.42), toon('#ffffff', { map: tex }));
  panel.position.set(0.08, 1.9, INNER.backZ + 0.05);
  quiet(panel);
  g.add(panel);
  addBox(g, 1.64, 0.06, 0.04, mat('#5a3a28'), 0.08, 2.15, INNER.backZ + 0.04);
  addBox(g, 1.64, 0.06, 0.04, mat('#5a3a28'), 0.08, 1.65, INNER.backZ + 0.04);
  addBox(g, 0.06, 0.56, 0.04, mat('#5a3a28'), -0.71, 1.9, INNER.backZ + 0.04);
  addBox(g, 0.06, 0.56, 0.04, mat('#5a3a28'), 0.87, 1.9, INNER.backZ + 0.04);
  const spot = new THREE.SpotLight('#ffe0b0', 16, 5, 0.45, 0.4, 2);
  spot.position.set(0.08, 2.35, -2.4);
  const target = new THREE.Object3D();
  target.position.set(0.08, 1.9, -4.2);
  g.add(target);
  spot.target = target;
  g.add(spot);
}

function addPoster(g) {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 384;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#f3e6c8';
  ctx.fillRect(0, 0, 256, 384);
  ctx.fillStyle = '#1c3f38';
  ctx.fillRect(18, 18, 220, 348);
  ctx.fillStyle = '#e6c27a';
  ctx.beginPath();
  ctx.arc(128, 150, 36, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(110, 186, 36, 70);
  ctx.fillStyle = '#c4493a';
  ctx.beginPath();
  ctx.arc(78, 250, 22, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#2f5f9a';
  ctx.beginPath();
  ctx.arc(180, 250, 22, 0, Math.PI * 2);
  ctx.fill();
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(0.32, 0.48), toon('#ffffff', { map: tex }));
  mesh.position.set(INNER.leftX + 0.04, 1.55, 0.04);
  mesh.rotation.y = Math.PI / 2;
  quiet(mesh);
  g.add(mesh);
  addBox(g, 0.04, 0.56, 0.4, mat('#5a3a28'), INNER.leftX + 0.03, 1.55, 0.04);
}

function addLightPools(g) {
  const glow = toon('#ffe2b0', { emissive: '#ffb15a', emissiveIntensity: 1.6 });
  for (const p of pendants()) {
    const spot = new THREE.SpotLight('#ffc27a', p.shade > 1.9 ? 18 : 26, 3.6, 0.52, 0.55, 2);
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
    const y1 = 3.04;
    quiet(addCyl(g, 0.007, 0.007, Math.max(0.05, y1 - y0), mat('#2c241c'), p.x, (y0 + y1) / 2, p.z, 6));
    quiet(addCyl(g, 0.04, 0.028, 0.03, mat('#3a3228'), p.x, y1 - 0.012, p.z, 10));
  }
}

function addLecternBook(g) {
  quiet(addBox(g, 0.28, 0.02, 0.36, mat('#f7f4ee'), LECTERN.x, LECTERN.targetH + 0.01, LECTERN.z - 0.04));
  quiet(addBox(g, 0.02, 0.025, 0.36, mat('#6e2c34'), LECTERN.x, LECTERN.targetH + 0.02, LECTERN.z - 0.04));
  for (let i = 0; i < 5; i++) quiet(addBox(g, 0.1, 0.004, 0.008, mat('#2a2a2a'), LECTERN.x - 0.08, LECTERN.targetH + 0.028, LECTERN.z - 0.12 + i * 0.04));
}

export function buildProcedural() {
  const g = new THREE.Group();
  g.name = 'procedural';
  addRugs(g);
  addBar(g);
  addBackbar(g);
  addShelves(g);
  addSign(g);
  addPoster(g);
  addLightPools(g);
  addLecternBook(g);
  const byId = Object.fromEntries(TABLES.map((t) => [t.id, t]));
  addHexGame(g, byId.strategy);
  addTrackGame(g, byId.track);
  addCardGame(g, byId.cards);
  addGo(g, byId.duel);
  addLesson(g, byId.teach);
  return g;
}

export function plankMaterial() {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 512;
  const ctx = c.getContext('2d');
  const colors = ['#8d5e38', '#7a4e2c', '#96643f', '#6b4428', '#a07048'];
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
  tex.repeat.set(3.2, 3.2);
  return toon('#ffffff', { map: tex });
}
