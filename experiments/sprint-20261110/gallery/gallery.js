import * as THREE from 'three';
import { boot, toon, addBox, addCyl, contactDisc } from './scene_lib.js';

/**
 * Contemporary annex.
 * Cutaway opens to +Z (entry) and +X (east).
 * West alcove | portal | nave | portal | east court.
 * Back wall is -Z. Long benches face a wall; plinths stand off the aisles.
 */

const H = 4.25;
const WALL = '#f3eee6';
const SHADE = '#e4ddd2';
const INK = '#1c1c1c';
const LINER = '#2a2826';
const STONE = '#e7e0d4';

const WORKS = [
  {
    id: 'field',
    title: 'Field Study II',
    x: -6.88, y: 2.0, z: -2.55, rotY: Math.PI / 2,
    w: 1.2, h: 1.66,
    frame: INK,
    ground: '#f4f0e8',
    shapes: [
      { type: 'rect', x: -0.16, y: 0.02, w: 0.52, h: 1.12, color: '#c4a06a' },
      { type: 'rect', x: 0.28, y: -0.18, w: 0.3, h: 0.7, color: '#3d4e5c' },
      { type: 'rect', x: 0.0, y: 0.62, w: 0.92, h: 0.045, color: INK },
    ],
  },
  {
    id: 'circle',
    title: 'Circle, Open',
    x: -3.58, y: 1.92, z: -3.35, rotY: -Math.PI / 2,
    w: 0.86, h: 1.12,
    frame: '#6b5340',
    ground: '#1e1e1c',
    shapes: [
      { type: 'disc', x: 0, y: 0.08, r: 0.28, color: '#f3efe6' },
      { type: 'rect', x: 0, y: -0.38, w: 0.48, h: 0.04, color: '#9a4632' },
    ],
  },
  {
    id: 'alcove-hero',
    title: 'West Triptych',
    x: -5.15, y: 2.05, z: -4.64, rotY: 0,
    w: 1.35, h: 1.15,
    frame: INK,
    ground: '#e7e2d8',
    shapes: [
      { type: 'rect', x: -0.18, y: 0.02, w: 0.48, h: 0.78, color: '#6e7d62' },
      { type: 'rect', x: 0.28, y: -0.08, w: 0.28, h: 0.62, color: '#9a4632' },
      { type: 'rect', x: 0, y: 0.42, w: 1.05, h: 0.04, color: INK },
    ],
  },
  {
    id: 'alcove-l',
    title: 'West, left',
    x: -6.2, y: 1.85, z: -4.64, rotY: 0,
    w: 0.48, h: 0.92,
    frame: '#6b5340',
    frameWidth: 0.035,
    ground: '#1e1e1c',
    shapes: [{ type: 'disc', x: 0, y: 0.04, r: 0.14, color: '#f3efe6' }],
  },
  {
    id: 'alcove-r',
    title: 'West, right',
    x: -4.05, y: 1.78, z: -4.64, rotY: 0,
    w: 0.5, h: 0.78,
    frame: INK,
    frameWidth: 0.035,
    ground: '#c4a06a',
    shapes: [{ type: 'rect', x: 0, y: 0, w: 0.16, h: 0.5, color: '#f6f3ec' }],
  },
  {
    id: 'west-a',
    title: 'Study A',
    x: -6.88, y: 2.15, z: -0.85, rotY: Math.PI / 2,
    w: 0.62, h: 0.78,
    frame: INK,
    frameWidth: 0.035,
    ground: '#d9d3c8',
    shapes: [{ type: 'rect', x: 0, y: 0, w: 0.28, h: 0.42, color: '#3d4e5c' }],
  },
  {
    id: 'west-b',
    title: 'Study B',
    x: -6.88, y: 1.15, z: -0.85, rotY: Math.PI / 2,
    w: 0.62, h: 0.55,
    frame: '#6b5340',
    frameWidth: 0.035,
    ground: '#f4f0e8',
    shapes: [{ type: 'rect', x: 0.08, y: 0, w: 0.12, h: 0.36, color: '#9a4632' }],
  },
  {
    id: 'nave-side',
    title: 'Nave Note',
    x: -3.32, y: 1.95, z: -2.55, rotY: Math.PI / 2,
    w: 0.92, h: 1.2,
    frame: INK,
    ground: '#c9aea8',
    shapes: [
      { type: 'rect', x: -0.12, y: 0, w: 0.22, h: 0.82, color: '#6e3c38' },
      { type: 'disc', x: 0.18, y: 0.12, r: 0.12, color: '#f3efe6' },
    ],
  },
  {
    id: 'court-side',
    title: 'After Still',
    x: 5.85, y: 1.95, z: -4.6, rotY: 0,
    w: 0.58, h: 0.86,
    frame: '#f3eee6',
    frameWidth: 0.035,
    ground: '#2a2826',
    shapes: [{ type: 'rect', x: 0, y: 0.05, w: 0.1, h: 0.55, color: '#c4a06a' }],
  },
  {
    id: 'longroom',
    title: 'Long Room',
    x: -1.35, y: 2.02, z: -4.66, rotY: 0,
    w: 2.08, h: 1.16,
    frame: INK,
    ground: '#d9d3c8',
    shapes: [
      { type: 'rect', x: 0, y: 0.2, w: 1.82, h: 0.26, color: '#3d4e5c' },
      { type: 'rect', x: 0, y: -0.22, w: 1.82, h: 0.2, color: '#c4a06a' },
      { type: 'rect', x: -0.42, y: 0, w: 0.035, h: 0.92, color: INK },
    ],
  },
  {
    id: 'interval',
    title: 'Green Interval',
    x: 0.95, y: 2.08, z: -4.66, rotY: 0,
    w: 0.74, h: 1.56,
    frame: '#6b5340',
    ground: '#3e5344',
    shapes: [
      { type: 'disc', x: 0.08, y: 0.16, r: 0.2, color: '#e6e0d4' },
      { type: 'rect', x: 0, y: -0.55, w: 0.46, h: 0.04, color: INK },
    ],
  },
  {
    id: 'rose',
    title: 'Rose Bar',
    x: 1.9, y: 1.95, z: -3.45, rotY: -Math.PI / 2,
    w: 1.0, h: 1.24,
    frame: INK,
    ground: '#c9aea8',
    shapes: [
      { type: 'rect', x: -0.18, y: -0.08, w: 0.26, h: 0.86, color: '#6e3c38' },
      { type: 'rect', x: 0.2, y: 0.16, w: 0.22, h: 0.52, color: '#f3efe6' },
    ],
  },
  {
    id: 'still',
    title: 'Still Wall',
    x: 4.6, y: 2.02, z: -4.6, rotY: 0,
    w: 1.46, h: 1.46,
    frame: INK,
    frameWidth: 0.04,
    ground: '#f7f4ee',
    shapes: [
      { type: 'rect', x: 0.2, y: 0, w: 0.07, h: 1.12, color: '#9a4632' },
    ],
  },
  {
    id: 'pair-l',
    title: 'Pair, left',
    x: 2.2, y: 1.82, z: -2.95, rotY: Math.PI / 2,
    w: 0.46, h: 0.7,
    frame: INK,
    frameWidth: 0.035,
    ground: '#e6e0d6',
    shapes: [
      { type: 'disc', x: 0, y: 0.02, r: 0.12, color: INK },
    ],
  },
  {
    id: 'pair-r',
    title: 'Pair, right',
    x: 2.2, y: 1.82, z: -2.25, rotY: Math.PI / 2,
    w: 0.46, h: 0.7,
    frame: '#6b5340',
    frameWidth: 0.035,
    ground: INK,
    shapes: [
      { type: 'rect', x: 0, y: 0, w: 0.16, h: 0.42, color: '#c4a06a' },
    ],
  },
];

function mesh(geo, mat) {
  const m = new THREE.Mesh(geo, mat);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

function slab(g, x, z0, z1, thick, color, y0 = 0, y1 = H) {
  const h = y1 - y0;
  const zc = (z0 + z1) / 2;
  return addBox(g, thick, h, Math.abs(z1 - z0), toon(color), x, y0 + h / 2, zc);
}

function plaqueTexture(title) {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 64;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#f7f4ee';
  ctx.fillRect(0, 0, 256, 64);
  ctx.fillStyle = '#1c1c1c';
  ctx.font = '600 22px sans-serif';
  ctx.fillText(title, 12, 28);
  ctx.font = '16px sans-serif';
  ctx.fillStyle = '#5c564e';
  ctx.fillText('annex  ·  2026', 12, 50);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function framedWork(g, spec) {
  const grp = new THREE.Group();
  grp.name = spec.id;
  const t = spec.frameWidth ?? 0.048;
  const frame = toon(spec.frame);
  const depth = 0.04;
  const top = mesh(new THREE.BoxGeometry(spec.w + t * 2, t, depth), frame);
  top.position.set(0, spec.h / 2 + t / 2, 0);
  const bot = mesh(new THREE.BoxGeometry(spec.w + t * 2, t, depth), frame);
  bot.position.set(0, -(spec.h / 2 + t / 2), 0);
  const left = mesh(new THREE.BoxGeometry(t, spec.h, depth), frame);
  left.position.set(-(spec.w / 2 + t / 2), 0, 0);
  const right = mesh(new THREE.BoxGeometry(t, spec.h, depth), frame);
  right.position.set(spec.w / 2 + t / 2, 0, 0);
  grp.add(top, bot, left, right);
  const matBoard = mesh(new THREE.BoxGeometry(spec.w - 0.02, spec.h - 0.02, 0.012), toon('#f6f3ec'));
  matBoard.position.z = 0.012;
  const canvas = mesh(new THREE.BoxGeometry(spec.w - 0.12, spec.h - 0.12, 0.012), toon(spec.ground));
  canvas.position.z = 0.02;
  grp.add(matBoard, canvas);
  for (const shape of spec.shapes) {
    let piece;
    if (shape.type === 'disc') {
      piece = mesh(new THREE.CircleGeometry(shape.r, 22), toon(shape.color, { polygonOffset: true }));
      piece.position.set(shape.x, shape.y, 0.034);
    } else {
      piece = mesh(new THREE.BoxGeometry(shape.w, shape.h, 0.01), toon(shape.color, { polygonOffset: true }));
      piece.position.set(shape.x, shape.y, 0.032);
    }
    grp.add(piece);
  }
  const label = mesh(
    new THREE.PlaneGeometry(0.22, 0.055),
    toon('#ffffff', { map: plaqueTexture(spec.title) }),
  );
  label.position.set(spec.w / 2 - 0.12, -(spec.h / 2) - 0.1, 0.02);
  grp.add(label);
  grp.position.set(spec.x, spec.y, spec.z);
  grp.rotation.y = spec.rotY;
  g.add(grp);
  return grp;
}

function sculptureTotem(g, x, y, z) {
  const plaster = toon('#efeae2');
  const oxide = toon('#8c4a32');
  const ink = toon(INK);
  addCyl(g, 0.16, 0.18, 0.05, ink, x, y + 0.025, z, 16);
  addBox(g, 0.2, 0.26, 0.15, plaster, x, y + 0.19, z);
  addBox(g, 0.1, 0.18, 0.2, oxide, x + 0.03, y + 0.4, z);
  addCyl(g, 0.075, 0.095, 0.22, plaster, x - 0.02, y + 0.6, z, 12);
  addBox(g, 0.14, 0.045, 0.08, ink, x, y + 0.73, z);
}

function sculptureArc(g, x, y, z) {
  const metal = toon('#1c1c1c');
  addCyl(g, 0.17, 0.19, 0.035, metal, x, y + 0.018, z, 20);
  addCyl(g, 0.012, 0.012, 0.2, toon('#3a3a38'), x + 0.015, y + 0.13, z, 8);
  const arch = mesh(new THREE.TorusGeometry(0.26, 0.042, 8, 24, Math.PI * 1.22), metal);
  arch.rotation.z = Math.PI * 0.92;
  arch.rotation.y = 0.4;
  arch.position.set(x, y + 0.34, z);
  g.add(arch);
}

function sculptureFigure(g, x, y, z) {
  const plaster = toon('#b3a494');
  const bronze = toon('#8d6238');
  const ink = toon(INK);
  addCyl(g, 0.145, 0.165, 0.04, ink, x, y + 0.02, z, 16);
  addBox(g, 0.1, 0.58, 0.16, plaster, x - 0.06, y + 0.35, z);
  addBox(g, 0.075, 0.44, 0.11, bronze, x + 0.09, y + 0.46, z + 0.04);
  addBox(g, 0.15, 0.022, 0.03, ink, x + 0.02, y + 0.55, z + 0.07);
  const head = mesh(new THREE.SphereGeometry(0.062, 14, 10), bronze);
  head.position.set(x + 0.01, y + 0.7, z + 0.01);
  g.add(head);
}

function sculptureRing(g, x, y, z) {
  const bronze = toon('#a56b3a');
  const steel = toon('#2a2a28');
  addCyl(g, 0.16, 0.19, 0.045, steel, x, y + 0.022, z, 20);
  addCyl(g, 0.012, 0.012, 0.34, steel, x, y + 0.21, z, 8);
  const ring = mesh(new THREE.TorusGeometry(0.32, 0.04, 10, 34), bronze);
  ring.position.set(x, y + 0.412, z);
  ring.rotation.y = 0.6;
  g.add(ring);
  const core = mesh(new THREE.SphereGeometry(0.085, 16, 12), toon('#f7f4ee'));
  core.position.set(x, y + 0.412, z);
  g.add(core);
}

function maquette(g, x, y, z) {
  addCyl(g, 0.08, 0.09, 0.02, toon(INK), x, y + 0.01, z, 12);
  addBox(g, 0.045, 0.18, 0.045, toon('#f4f1ea'), x - 0.02, y + 0.11, z);
  addBox(g, 0.08, 0.05, 0.03, toon('#8c4a32'), x + 0.03, y + 0.07, z + 0.01);
}

function infoDesk(g, x, z) {
  const wood = toon('#6e4e34');
  const top = toon('#8a6848');
  addBox(g, 1.58, 0.055, 0.6, top, x, 0.965, z);
  addBox(g, 1.46, 0.84, 0.48, wood, x, 0.46, z);
  addBox(g, 1.36, 0.07, 0.4, toon(INK), x, 0.04, z);
  addBox(g, 0.16, 0.035, 0.22, toon('#f4f1ea'), x - 0.42, 1.01, z + 0.02);
  addBox(g, 0.15, 0.06, 0.2, toon('#d9d3c8'), x - 0.18, 1.025, z - 0.02);
  addBox(g, 0.18, 0.028, 0.24, toon('#efeae2'), x + 0.08, 1.008, z + 0.04);
  contactDisc(g, x, z, 0.85, 0.38);
}

function stele(g, x, z) {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 680;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#f6f3ec';
  ctx.fillRect(0, 0, 512, 680);
  ctx.fillStyle = '#1c1c1c';
  ctx.font = '600 64px sans-serif';
  ctx.fillText('FIELD', 48, 120);
  ctx.fillText('NOTES', 48, 196);
  ctx.fillStyle = '#6e4e34';
  ctx.fillRect(48, 230, 86, 6);
  ctx.fillStyle = '#3a3834';
  ctx.font = '28px sans-serif';
  const lines = [
    'Annex exhibition',
    '',
    'West bay, nave,',
    'and the east court.',
    '',
    'Walk around the',
    'plinths. Benches',
    'face the wall.',
  ];
  lines.forEach((line, i) => ctx.fillText(line, 48, 300 + i * 40));
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  addCyl(g, 0.028, 0.038, 1.12, toon(INK), x - 0.28, 0.56, z, 8);
  addCyl(g, 0.028, 0.038, 1.12, toon(INK), x + 0.28, 0.56, z, 8);
  addBox(g, 0.72, 0.025, 0.28, toon(INK), x, 0.02, z);
  addBox(g, 0.64, 0.92, 0.02, toon('#f7f4ee'), x, 1.16, z);
  const face = mesh(new THREE.PlaneGeometry(0.58, 0.84), toon('#ffffff', { map: tex }));
  face.position.set(x, 1.16, z + 0.012);
  g.add(face);
  contactDisc(g, x, z, 0.4, 0.2);
}

function foliage(g, x, z) {
  const potTop = 0.34;
  const leaf = toon('#3f6a45');
  const deep = toon('#2c4e34');
  addCyl(g, 0.015, 0.02, 0.16, toon('#3d4a32'), x, potTop + 0.06, z, 6);
  const puffs = [
    [0.0, 0.22, 0.0, 0.11, leaf],
    [0.07, 0.18, 0.04, 0.08, deep],
    [-0.06, 0.17, -0.03, 0.075, leaf],
    [0.02, 0.28, -0.02, 0.07, deep],
    [-0.02, 0.14, 0.06, 0.06, leaf],
  ];
  for (const [dx, dy, dz, r, mat] of puffs) {
    const m = mesh(new THREE.SphereGeometry(r, 8, 6), mat);
    m.scale.y = 0.72;
    m.position.set(x + dx, potTop + dy, z + dz);
    g.add(m);
  }
}

const BOOK_COLORS = ['#6b3a2a', '#2f4a3c', '#3a3a6a', '#7a5a28', '#5a2a3a', '#2a4a6a', '#4a3a28', '#8a4a2a', '#1f1f1f', '#d8d2c6', '#704030', '#35503a'];

function fillCatalog(g, x, z, rotY) {
  const grp = new THREE.Group();
  const shelves = [0.07, 0.43, 0.81, 1.18];
  const widths = [0.034, 0.046, 0.028, 0.04, 0.032, 0.05, 0.036, 0.03];
  shelves.forEach((sy, s) => {
    let cursor = -0.24;
    let i = 0;
    while (cursor < 0.22 && i < 11) {
      const bw = widths[(i + s) % widths.length];
      const bh = 0.2 + ((i * 3 + s) % 5) * 0.016;
      const book = mesh(
        new THREE.BoxGeometry(bw, bh, 0.13),
        toon(BOOK_COLORS[(i * 2 + s * 3) % BOOK_COLORS.length]),
      );
      book.position.set(cursor + bw / 2, sy + bh / 2, -0.03);
      book.rotation.z = ((i % 4) - 1.5) * 0.015;
      grp.add(book);
      cursor += bw + 0.008;
      i += 1;
    }
  });
  for (let n = 0; n < 3; n++) {
    addBox(grp, 0.16, 0.018, 0.11, toon(BOOK_COLORS[n + 4]), 0.1, 0.08 + n * 0.02, -0.04);
  }
  grp.position.set(x, 0, z);
  grp.rotation.y = rotY;
  g.add(grp);
}

function spotHeads(g, layout) {
  const metal = toon('#141414');
  const lensMat = toon('#fff4dc', { emissive: '#ffe2a4', emissiveIntensity: 1.5 });
  for (const s of layout.lights?.spots || []) {
    const [x, y, z] = s.position;
    addCyl(g, 0.012, 0.012, 0.22, metal, x, y + 0.14, z, 8);
    const head = new THREE.Group();
    const body = mesh(new THREE.CylinderGeometry(0.05, 0.075, 0.11, 12), metal);
    body.rotation.x = Math.PI / 2;
    const lens = mesh(new THREE.CircleGeometry(0.042, 14), lensMat);
    lens.position.z = -0.058;
    lens.userData.keepEmissive = true;
    head.add(body, lens);
    head.position.set(x, y, z);
    head.lookAt(s.target[0], s.target[1], s.target[2]);
    g.add(head);
  }
}

function trackRun(g, x0, x1, y, z, step) {
  const metal = toon('#141414');
  const span = Math.abs(x1 - x0);
  addBox(g, span, 0.028, 0.05, metal, (x0 + x1) / 2, y, z);
  for (let x = Math.min(x0, x1); x <= Math.max(x0, x1) + 0.01; x += step) {
    addCyl(g, 0.012, 0.012, 0.18, metal, x, y + 0.1, z, 6);
  }
}

function tracks(g) {
  const metal = toon('#141414');
  addBox(g, 0.05, 0.028, 4.8, metal, -5.45, 4.02, -1.2);
  for (let z = -3.4; z <= 1.0; z += 1.1) addCyl(g, 0.012, 0.012, 0.16, metal, -5.45, 4.12, z, 6);
  trackRun(g, -3.1, 1.5, 4.02, -3.9, 0.9);
  trackRun(g, -3.1, 1.5, 4.02, -1.55, 0.9);
  trackRun(g, 2.6, 6.2, 3.72, -3.55, 0.85);
  trackRun(g, 2.6, 6.2, 3.72, -1.15, 0.85);
}

function piers(g) {
  const spots = [
    [6.72, -1.45],
    [6.55, 1.78],
  ];
  for (const [x, z] of spots) {
    addBox(g, 0.34, 0.1, 0.34, toon(LINER), x, 0.05, z);
    addBox(g, 0.24, H - 0.28, 0.24, toon(STONE), x, (H - 0.08) / 2, z);
    addBox(g, 0.32, 0.08, 0.32, toon(LINER), x, H - 0.12, z);
  }
}

function makeShell(layout) {
  const g = new THREE.Group();
  g.name = 'shell';
  const s = layout.shell;
  const floor = new THREE.Mesh(new THREE.BoxGeometry(14, 0.08, 9.6), toon(s.floorColor));
  floor.position.y = -0.04;
  floor.receiveShadow = true;
  g.add(floor);

  addBox(g, 3.25, 0.028, 5.9, toon(s.floorAlcove), -5.15, 0.016, -1.55);
  addBox(g, 5.05, 0.028, 5.85, toon(s.floorNave), -0.7, 0.016, -1.5);
  addBox(g, 4.4, 0.028, 5.9, toon(s.floorCourt), 4.45, 0.016, -1.5);
  addBox(g, 13.1, 0.03, 2.55, toon(s.floorOak), 0, 0.02, 3.25);
  for (let i = 0; i < 5; i++) {
    addBox(g, 12.6, 0.008, 0.028, toon('#5c3a22'), 0, 0.036, 2.15 + i * 0.48);
  }
  addBox(g, 13.15, 0.02, 0.46, toon(s.thresholdColor), 0, 0.034, 1.78);
  addBox(g, 0.7, 0.016, 1.55, toon('#8d623c'), -3.45, 0.038, -0.92);
  addBox(g, 0.72, 0.016, 2.0, toon('#8d623c'), 2.05, 0.038, -0.85);
  addBox(g, 13.2, 0.012, 0.14, toon('#5e564e'), 0, 0.032, -4.48);

  const back = new THREE.Mesh(new THREE.BoxGeometry(14, H, 0.16), toon(s.wallColor));
  back.position.set(0, H / 2, -4.8);
  back.receiveShadow = true;
  back.castShadow = true;
  g.add(back);
  const left = new THREE.Mesh(new THREE.BoxGeometry(0.16, H, 9.6), toon(s.wallColor));
  left.position.set(-7, H / 2, 0);
  left.receiveShadow = true;
  left.castShadow = true;
  g.add(left);

  addBox(g, 3.15, 3.3, 0.045, toon(s.accentWall), 4.6, 1.85, -4.7);
  addBox(g, 0.16, H, 1.7, toon(s.wallColor), 6.78, H / 2, -3.95);

  const part = s.wallColor;
  slab(g, -3.45, -4.72, -1.7, 0.16, part);
  slab(g, -3.45, -0.15, 1.4, 0.16, part);
  addBox(g, 0.16, H - 2.55, 1.55, toon(part), -3.45, (H + 2.55) / 2, -0.925);
  addBox(g, 0.2, 0.045, 1.55, toon(LINER), -3.45, 2.55, -0.925);

  slab(g, 2.05, -4.72, -1.85, 0.18, part);
  slab(g, 2.05, 0.15, 1.5, 0.18, part);
  addBox(g, 0.18, H - 2.65, 2.0, toon(part), 2.05, (H + 2.65) / 2, -0.85);
  addBox(g, 0.22, 0.05, 2.0, toon(LINER), 2.05, 2.65, -0.85);

  const base = toon('#3a342c');
  addBox(g, 13.5, 0.12, 0.035, base, -0.1, 0.06, -4.69);
  addBox(g, 0.035, 0.12, 9.2, base, -6.9, 0.06, 0.05);
  addBox(g, 0.03, 0.1, 2.9, base, -3.54, 0.05, -3.21);
  addBox(g, 0.03, 0.1, 2.9, base, -3.36, 0.05, -3.21);
  addBox(g, 0.03, 0.1, 2.7, base, 1.94, 0.05, -3.28);
  addBox(g, 0.03, 0.1, 2.7, base, 2.16, 0.05, -3.28);

  addBox(g, 0.18, H - 0.15, 0.07, toon(SHADE), -2.85, H / 2, -4.66);
  addBox(g, 0.16, H - 0.15, 0.07, toon(SHADE), 0.05, H / 2, -4.66);
  addBox(g, 0.16, 2.4, 0.06, toon(SHADE), -6.86, 1.35, -0.2);

  ceiling(g, s);
  piers(g);
  tracks(g);
  spotHeads(g, layout);
  g.traverse((obj) => {
    if (obj.isMesh) obj.userData.noCast = true;
  });
  return g;
}

function ceiling(g, s) {
  const plaster = toon(s.ceilingColor);
  const upstand = toon('#f6f1e8');
  const mull = toon('#2e2a26');
  const glass = toon('#fff6e4', { emissive: '#fff0cc', emissiveIntensity: 0.9 });
  addBox(g, 13.5, 0.12, 1.15, plaster, -0.1, 4.14, -4.05);
  addBox(g, 13.5, 0.12, 3.92, plaster, -0.1, 4.14, -0.06);
  addBox(g, 4.35, 0.12, 1.45, plaster, -4.65, 4.14, -2.75);
  addBox(g, 1.55, 0.12, 1.45, plaster, 1.35, 4.14, -2.75);
  addBox(g, 3.05, 0.26, 0.06, upstand, -0.95, 4.26, -3.48);
  addBox(g, 3.05, 0.26, 0.06, upstand, -0.95, 4.26, -2.02);
  addBox(g, 0.06, 0.26, 1.46, upstand, -2.48, 4.26, -2.75);
  addBox(g, 0.06, 0.26, 1.46, upstand, 0.58, 4.26, -2.75);
  addBox(g, 2.9, 0.035, 1.32, glass, -0.95, 4.4, -2.75);
  addBox(g, 0.035, 0.05, 1.28, mull, -1.75, 4.37, -2.75);
  addBox(g, 0.035, 0.05, 1.28, mull, -0.15, 4.37, -2.75);
  addBox(g, 2.85, 0.05, 0.035, mull, -0.95, 4.37, -3.15);
  addBox(g, 2.85, 0.05, 0.035, mull, -0.95, 4.37, -2.35);
  addBox(g, 4.35, 0.1, 5.5, toon('#ddd6cc'), 4.4, 3.9, -1.45);
  const cove = toon('#ffe7bc', { emissive: '#ffd9a0', emissiveIntensity: 1.15 });
  addBox(g, 3.3, 0.07, 0.1, cove, 4.6, 3.72, -4.52);
  addBox(g, 2.6, 0.05, 0.08, cove, -5.2, 3.95, -4.52);
  addBox(g, 13.15, 0.1, 0.16, toon('#6a5c4c'), -0.1, 4.02, 1.88);
}

function reception(g) {
  const oak = toon('#a56b3c');
  const plaster = toon('#f4f0e8');
  addBox(g, 4.7, 1.12, 0.07, plaster, 0.15, 0.62, 2.48);
  addBox(g, 4.85, 0.07, 0.12, oak, 0.15, 1.2, 2.48);
  addBox(g, 4.85, 0.08, 0.14, oak, 0.15, 0.05, 2.48);
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 160;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#f4f0e8';
  ctx.fillRect(0, 0, 512, 160);
  ctx.fillStyle = '#1c1c1c';
  ctx.font = '600 54px sans-serif';
  ctx.fillText('EDITIONS', 36, 78);
  ctx.font = '24px sans-serif';
  ctx.fillStyle = '#5c564e';
  ctx.fillText('catalogues  ·  the annex shop', 36, 118);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const sign = mesh(new THREE.PlaneGeometry(1.15, 0.36), toon('#ffffff', { map: tex }));
  sign.position.set(0.85, 0.72, 2.53);
  g.add(sign);
  addBox(g, 5.15, 0.04, 0.07, oak, 0.15, 0.028, 2.62);
  addBox(g, 5.15, 0.04, 0.07, oak, 0.15, 0.028, 4.12);
  addBox(g, 0.07, 0.04, 1.5, oak, -2.42, 0.028, 3.37);
  addBox(g, 0.07, 0.04, 1.5, oak, 2.72, 0.028, 3.37);
}

function plinthTop(layout, id, fallback) {
  const inst = (layout.instances || []).find((item) => item.id === id);
  if (!inst) return fallback;
  if (inst.targetHeight) return inst.targetHeight;
  return layout.assets?.[inst.kind]?.targetHeight ?? fallback;
}

function makeProcedural(layout) {
  const g = new THREE.Group();
  g.name = 'procedural';
  for (const spec of WORKS) framedWork(g, spec);
  sculptureTotem(g, -5.25, plinthTop(layout, 'plinth_totem', 1.08), -0.85);
  sculptureArc(g, -1.65, plinthTop(layout, 'plinth_arc', 1.15), -2.65);
  sculptureFigure(g, 0.15, plinthTop(layout, 'plinth_figure', 1.02), -2.4);
  sculptureRing(g, 4.5, plinthTop(layout, 'plinth_ring', 1.12), -2.0);
  const vitrine = (layout.instances || []).find((item) => item.id === 'vitrine');
  if (vitrine) {
    maquette(g, vitrine.position[0], layout.assets.museum_vitrine.targetHeight, vitrine.position[2]);
  }
  reception(g);
  infoDesk(g, 0.7, 3.4);
  stele(g, -0.7, 3.22);
  foliage(g, 2.15, 3.42);
  fillCatalog(g, -1.9, 3.28, Math.PI);
  window.__gallery = {
    zones: ['alcove', 'nave', 'court'],
    works: WORKS.map((w) => w.id),
  };
  return g;
}

function decorateAsset(kind, root) {
  root.traverse((obj) => {
    if (!obj.isMesh) return;
    if (!obj.material) obj.material = new THREE.MeshStandardMaterial({ color: '#6b4f38' });
    const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
    for (const m of mats) {
      if (!m || !m.color) continue;
      if (kind === 'display_bookcase') m.color.set('#6b4f38');
      if (kind === 'flowerpot') m.color.set('#7a5340');
      if (kind === 'library_lamp' && m.color.r > 0.85 && m.color.g > 0.85 && m.color.b > 0.85) {
        m.color.set('#fff6e4');
        m.emissive = new THREE.Color('#ffe6b0');
        m.emissiveIntensity = 1.1;
      }
    }
  });
}

boot({
  makeShell,
  makeProcedural,
  decorateAsset,
  readyText: 'ready — contemporary annex · drag orbit · U unlit · T toon',
});
