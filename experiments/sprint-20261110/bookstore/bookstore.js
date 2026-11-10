import * as THREE from 'three';
import { boot, toon, addBox, addCyl, addContact } from './scene_runtime.js';

const BOOK = [
  '#6e2c2c', '#1e3a32', '#1c2744', '#8a5a2a', '#5a2a3a', '#2c4a62',
  '#4a3424', '#a34b2e', '#35503a', '#c4a574', '#141414', '#7a3e56',
  '#3d4a28', '#8c3d4a',
];

const SHELF_TOPS = [0.085, 0.579, 1.102, 1.624];

const clothCache = new Map();
function cloth(hex) {
  let m = clothCache.get(hex);
  if (!m) {
    m = toon(hex);
    clothCache.set(hex, m);
  }
  return m;
}

const coverCache = new Map();
function coverMat(i) {
  const key = i % 8;
  if (coverCache.has(key)) return coverCache.get(key);
  const bg = BOOK[key % BOOK.length];
  const band = key % 2 ? '#e6d3a4' : '#f4efe4';
  const tex = canvasTex(128, 200, (ctx) => {
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, 128, 200);
    ctx.fillStyle = band;
    ctx.fillRect(18, 28, 92, 8);
    ctx.fillRect(28, 48, 72, 46);
    ctx.strokeStyle = band;
    ctx.lineWidth = 3;
    ctx.strokeRect(8, 8, 112, 184);
    ctx.fillStyle = band;
    ctx.fillRect(22, 150, 84, 6);
    ctx.fillRect(34, 164, 60, 4);
  });
  const m = toon('#ffffff', { map: tex });
  coverCache.set(key, m);
  return m;
}

function canvasTex(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');
  draw(ctx, w, h);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  tex.needsUpdate = true;
  return tex;
}

function hash01(s) {
  let n = 2166136261;
  const str = String(s);
  for (let i = 0; i < str.length; i++) n = Math.imul(n ^ str.charCodeAt(i), 16777619);
  return ((n >>> 0) % 10000) / 10000;
}

function noCast(mesh) {
  mesh.castShadow = false;
  mesh.userData.castShadow = false;
  return mesh;
}

function plane(parent, w, h, mat, x, y, z, rotY = 0) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
  m.position.set(x, y, z);
  m.rotation.y = rotY;
  m.castShadow = false;
  m.userData.castShadow = false;
  parent.add(m);
  return m;
}

function signTexture(title, sub, bg = '#1b2438') {
  return canvasTex(1024, 280, (ctx) => {
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, 1024, 280);
    ctx.strokeStyle = '#c6a15b';
    ctx.lineWidth = 14;
    ctx.strokeRect(18, 18, 988, 244);
    ctx.strokeStyle = '#e6d3a4';
    ctx.lineWidth = 2;
    ctx.strokeRect(32, 32, 960, 216);
    ctx.fillStyle = '#f6efe2';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '600 92px "Noto Serif", Georgia, serif';
    ctx.fillText(title, 512, sub ? 112 : 140);
    if (sub) {
      ctx.font = '400 34px "Noto Serif", Georgia, serif';
      ctx.fillStyle = '#e0c39a';
      ctx.fillText(sub, 512, 196);
    }
  });
}

function plaqueTexture(label, bg = '#1e3a32') {
  return canvasTex(512, 160, (ctx) => {
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, 512, 160);
    ctx.strokeStyle = '#c6a15b';
    ctx.lineWidth = 8;
    ctx.strokeRect(8, 8, 496, 144);
    ctx.fillStyle = '#f6efe2';
    ctx.font = '600 54px "Noto Serif", Georgia, serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, 256, 82);
  });
}

function floorTexture() {
  return canvasTex(1080, 820, (ctx, w, h) => {
    ctx.fillStyle = '#c9a36b';
    ctx.fillRect(0, 0, w, h);
    const planks = 46;
    for (let i = 0; i < planks; i++) {
      const y = (i / planks) * h;
      const ph = h / planks;
      const shade = 188 + ((i * 17) % 5) * 6;
      ctx.fillStyle = `rgb(${shade}, ${shade - 42}, ${shade - 78})`;
      ctx.fillRect(0, y, w, ph - 1);
      ctx.fillStyle = 'rgba(80, 48, 28, 0.28)';
      ctx.fillRect(0, y + ph - 1.5, w, 1.5);
    }
    ctx.strokeStyle = '#5c3a24';
    ctx.lineWidth = 18;
    ctx.strokeRect(16, 16, w - 32, h - 32);
    ctx.strokeStyle = '#e6d3a4';
    ctx.lineWidth = 3;
    ctx.strokeRect(28, 28, w - 56, h - 56);
  });
}

function rugTexture(fill, border) {
  return canvasTex(512, 320, (ctx, w, h) => {
    ctx.fillStyle = fill;
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = border;
    ctx.lineWidth = 22;
    ctx.strokeRect(16, 16, w - 32, h - 32);
    ctx.strokeStyle = 'rgba(246, 239, 226, 0.55)';
    ctx.lineWidth = 4;
    ctx.strokeRect(34, 34, w - 68, h - 68);
  });
}

const bulbMat = toon('#fff6e4', { emissive: '#ffd8a8', emissiveIntensity: 1.2 });

function makeShell(layout) {
  const g = new THREE.Group();
  g.name = 'shell';
  const { width: W, depth: D, height: H } = layout.meta.room;
  const s = layout.shell;
  const zWall = -D / 2;
  const xWall = -W / 2;
  const win = layout.zones.window;
  const plaster = toon(s.wallColor);
  const wood = toon(s.woodColor);
  const woodD = toon(s.woodDark);
  const ink = toon(s.inkColor);
  const brass = toon(s.brassColor);
  const green = toon(s.accentColor);

  const slab = addBox(g, W, 0.08, D, toon(s.floorColor), 0, -0.04, 0);
  slab.castShadow = false;
  slab.userData.castShadow = false;
  const floorTop = plane(g, W, D, toon('#ffffff', { map: floorTexture() }), 0, 0.004, 0, 0);
  floorTop.rotation.x = -Math.PI / 2;
  floorTop.receiveShadow = true;

  const rug = layout.zones.island;
  const islandRug = plane(
    g, rug.w + 0.7, rug.d + 0.55,
    toon('#ffffff', { map: rugTexture('#6e3034', '#e6d3a4') }),
    rug.x, 0.012, rug.z, 0,
  );
  islandRug.rotation.x = -Math.PI / 2;
  islandRug.receiveShadow = true;

  const runner = plane(
    g, 1.05, 1.85,
    toon('#ffffff', { map: rugTexture('#24362c', '#c6a15b') }),
    0.15, 0.012, 2.35, 0,
  );
  runner.rotation.x = -Math.PI / 2;
  runner.receiveShadow = true;

  const mat = plane(g, 0.85, 0.7, toon('#3a2a22'), 0.15, 0.014, 3.35, 0);
  mat.rotation.x = -Math.PI / 2;

  const wallT = 0.12;
  const y0 = win.sillY;
  const y1 = win.headY;
  const x0 = win.x0;
  const x1 = win.x1;

  addBox(g, W, y0, wallT, plaster, 0, y0 / 2, zWall);
  addBox(g, W, H - y1, wallT, plaster, 0, (y1 + H) / 2, zWall);
  addBox(g, x0 - xWall, y1 - y0, wallT, plaster, (xWall + x0) / 2, (y0 + y1) / 2, zWall);
  addBox(g, W / 2 - x1, y1 - y0, wallT, plaster, (x1 + W / 2) / 2, (y0 + y1) / 2, zWall);
  addBox(g, wallT, H, D, plaster, xWall, H / 2, 0);

  const glass = toon('#e8f3f8', {
    transparent: true, opacity: 0.16, side: THREE.DoubleSide, depthWrite: false,
  });
  const glassMesh = addBox(g, (x1 - x0) - 0.1, (y1 - y0) - 0.1, 0.02, glass, (x0 + x1) / 2, (y0 + y1) / 2 + 0.02, zWall + 0.08);
  glassMesh.castShadow = false;
  glassMesh.userData.castShadow = false;
  glassMesh.userData.role = 'flat';

  const sky = addBox(g, (x1 - x0) - 0.16, (y1 - y0) - 0.12, 0.04, toon('#d4e7f6'), (x0 + x1) / 2, (y0 + y1) / 2 + 0.02, zWall - 0.22);
  sky.castShadow = false;
  sky.userData.castShadow = false;
  sky.userData.role = 'flat';
  for (let x = x0 + 0.16; x < x1 - 0.08; x += 0.14) {
    addBox(g, 0.1, 0.82, 0.025, toon('#d7b07a'), x, 0.54, zWall + 0.11);
  }

  for (let i = 0; i <= 4; i++) {
    const x = x0 + ((x1 - x0) * i) / 4;
    addBox(g, 0.045, y1 - y0, 0.06, woodD, x, (y0 + y1) / 2, zWall + 0.1);
  }
  const transomY = y0 + (y1 - y0) * 0.72;
  addBox(g, x1 - x0, 0.045, 0.06, woodD, (x0 + x1) / 2, transomY, zWall + 0.1);
  addBox(g, x1 - x0 + 0.2, 0.08, 0.34, wood, (x0 + x1) / 2, y0 - 0.02, zWall + 0.22);
  addBox(g, x1 - x0 + 0.16, 0.07, 0.1, woodD, (x0 + x1) / 2, y1, zWall + 0.1);

  addBox(g, 0.22, H, 0.22, wood, x0 - 0.08, H / 2, zWall + 0.16);
  addBox(g, 0.22, H, 0.22, wood, x1 + 0.08, H / 2, zWall + 0.16);
  addBox(g, 0.32, 0.06, 0.32, woodD, x0 - 0.08, H - 0.16, zWall + 0.16);
  addBox(g, 0.32, 0.06, 0.32, woodD, x1 + 0.08, H - 0.16, zWall + 0.16);

  addBox(g, W - 0.2, 0.12, 0.04, woodD, 0, 0.06, zWall + 0.08);
  addBox(g, 0.04, 0.12, D - 0.2, woodD, xWall + 0.08, 0.06, 0);
  addBox(g, 0.06, 0.06, D - 0.3, wood, xWall + 0.08, 2.72, -0.2);
  addBox(g, W - 0.15, 0.1, 0.12, woodD, 0, H - 0.08, zWall + 0.06);
  addBox(g, 0.12, 0.1, D - 0.15, woodD, xWall + 0.06, H - 0.08, -0.1);

  for (const z of [-2.7, -1.2, 0.4, 1.8]) {
    addBox(g, 0.025, 0.78, 1.15, green, xWall + 0.095, 0.52, z);
  }
  addBox(g, x0 - xWall - 0.4, 0.78, 0.03, green, (xWall + x0) / 2, 0.52, zWall + 0.09);
  addBox(g, W / 2 - x1 - 0.45, 0.78, 0.03, green, (x1 + W / 2) / 2 - 0.05, 0.52, zWall + 0.09);

  const ceil = addBox(g, W * 0.72, 0.07, 2.15, toon(s.ceilingColor), -0.55, H - 0.08, -2.85);
  ceil.castShadow = false;
  ceil.userData.castShadow = false;
  for (const z of [-0.55, 1.15]) {
    addBox(g, W * 0.7, 0.14, 0.1, woodD, -0.55, H - 0.32, z);
  }
  addBox(g, 2.3, 0.12, 0.1, woodD, -4.05, H - 0.32, -2.95);
  addBox(g, 2.5, 0.12, 0.1, woodD, 3.55, H - 0.32, -2.95);

  const counter = layout.zones.counter;
  const canopy = addBox(g, counter.w * 0.85, 0.08, 0.72, toon(s.ceilingColor), counter.x + 0.15, 3.28, counter.z);
  canopy.castShadow = false;
  canopy.userData.castShadow = false;

  const hero = toon('#ffffff', { map: signTexture('QUILL & SPINE', 'INDEPENDENT BOOKSELLERS') });
  plane(g, 3.05, 0.4, hero, (x0 + x1) / 2, 2.9, zWall + 0.14, 0);
  plane(g, 0.72, 0.22, toon('#ffffff', { map: plaqueTexture('POETRY') }), -4.05, 2.48, zWall + 0.12, 0);
  plane(g, 0.62, 0.2, toon('#ffffff', { map: plaqueTexture('NEW', '#6e3034') }), 3.35, 2.48, zWall + 0.12, 0);
  plane(g, 0.78, 0.22, toon('#ffffff', { map: plaqueTexture('FICTION') }), xWall + 0.12, 3.18, -1.05, Math.PI / 2);

  for (const [fz, col] of [[-2.15, '#8c3d4a'], [-1.05, '#1e3a32'], [0.05, '#1c2744']]) {
    addBox(g, 0.03, 0.38, 0.5, woodD, xWall + 0.11, 2.55, fz);
    addBox(g, 0.02, 0.3, 0.4, toon(col), xWall + 0.125, 2.55, fz);
  }

  const clockFace = new THREE.Mesh(new THREE.CircleGeometry(0.15, 24), toon('#f6efe2'));
  clockFace.position.set(xWall + 0.13, 2.15, 1.55);
  clockFace.rotation.y = Math.PI / 2;
  clockFace.castShadow = false;
  g.add(clockFace);
  addCyl(g, 0.175, 0.175, 0.03, brass, xWall + 0.11, 2.15, 1.55, 24).rotation.z = Math.PI / 2;
  addBox(g, 0.02, 0.1, 0.016, ink, xWall + 0.17, 2.2, 1.55);
  addBox(g, 0.016, 0.016, 0.07, ink, xWall + 0.17, 2.16, 1.59);

  return g;
}

function packRow(parent, yTop, z0, along, count, seed, opts = {}) {
  const span = opts.span ?? 0.7;
  let cursor = -span / 2;
  const limit = span / 2;
  for (let i = 0; i < count && cursor < limit; i++) {
    const bw = opts.face ? 0.15 : 0.038 + ((i + seed) % 3) * 0.01;
    const bh = opts.face ? 0.23 : 0.2 + ((i * 3 + seed) % 5) * 0.022;
    const bd = opts.face ? 0.032 : 0.15;
    if (cursor + bw > limit) break;
    const mat = opts.face ? coverMat(i + seed) : cloth(BOOK[(i + seed) % BOOK.length]);
    const m = noCast(new THREE.Mesh(
      new THREE.BoxGeometry(opts.alongZ ? bd : bw, bh, opts.alongZ ? bw : bd),
      mat,
    ));
    const center = cursor + (opts.alongZ ? bw : bw) / 2;
    if (along === 'x') m.position.set(center, yTop + bh / 2, z0);
    else m.position.set(z0, yTop + bh / 2, center);
    if (opts.lean && i % 3 === 0) m.rotation.z = (i % 2 ? 0.14 : -0.14);
    parent.add(m);
    cursor += bw + (opts.gap ?? 0.008);
  }
}

function addStacks(parent, yTop, z0, seed) {
  for (let p = 0; p < 3; p++) {
    const x = -0.24 + p * 0.24;
    const n = 3 + ((seed + p) % 3);
    for (let k = 0; k < n; k++) {
      const m = noCast(new THREE.Mesh(
        new THREE.BoxGeometry(0.16, 0.028, 0.12),
        cloth(BOOK[(seed + p + k) % BOOK.length]),
      ));
      m.position.set(x, yTop + 0.02 + k * 0.03, z0);
      m.rotation.y = ((p + k) % 2 ? 0.08 : -0.05);
      parent.add(m);
    }
  }
}

function fillCase(parent, inst) {
  const root = new THREE.Group();
  root.position.set(inst.position[0], 0, inst.position[2]);
  root.rotation.y = inst.rotationY || 0;
  const seed = Math.floor(hash01(inst.id) * 20);
  const pattern = inst.pattern || 'full';
  SHELF_TOPS.forEach((yTop, s) => {
    if (pattern === 'stack' && s === 0) addStacks(root, yTop, -0.05, seed);
    else if (pattern === 'face' && s === 1) packRow(root, yTop, -0.12, 'x', 5, seed + s, { face: true, span: 0.72, gap: 0.02 });
    else if (pattern === 'sparse' && s === 3) packRow(root, yTop, -0.06, 'x', 4, seed + s, { span: 0.42 });
    else if (pattern === 'lean' && s === 2) packRow(root, yTop, -0.06, 'x', 8, seed + s, { lean: true });
    else packRow(root, yTop, -0.06, 'x', 18, seed + s + 1);
  });
  parent.add(root);
}

function makeReadingTable(g, zone) {
  const { x, z, w, d, h } = zone;
  const root = new THREE.Group();
  root.position.set(x, 0, z);
  const wood = toon('#6a4a32');
  const top = toon('#d7b07a');
  addBox(root, w, 0.06, d, top, 0, h - 0.03, 0);
  addBox(root, w - 0.1, 0.08, 0.045, wood, 0, h - 0.1, d / 2 - 0.05);
  addBox(root, w - 0.1, 0.08, 0.045, wood, 0, h - 0.1, -(d / 2 - 0.05));
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      addBox(root, 0.06, h - 0.08, 0.06, wood, sx * (w / 2 - 0.1), (h - 0.08) / 2, sz * (d / 2 - 0.08));
    }
  }
  const pages = toon('#f7f1e4');
  const cover = toon('#6e2c2c');
  addBox(root, 0.28, 0.015, 0.2, cover, -0.05, h + 0.01, 0.02);
  const left = addBox(root, 0.13, 0.008, 0.18, pages, -0.12, h + 0.02, 0.02);
  left.rotation.y = 0.15;
  left.rotation.z = 0.08;
  const right = addBox(root, 0.13, 0.008, 0.18, pages, 0.02, h + 0.02, 0.02);
  right.rotation.y = -0.1;
  right.rotation.z = -0.06;
  noCast(addBox(root, 0.18, 0.04, 0.14, cloth('#1c2744'), 0.42, h + 0.03, -0.08));
  g.add(root);
  addContact(g, w * 0.85, d * 0.8, x, z, 0.18);
}

function makeIsland(g, zone) {
  const { x, z, w, d, h } = zone;
  const root = new THREE.Group();
  root.position.set(x, 0, z);
  const wood = toon('#6e4e34');
  const top = toon('#e4c79a');
  const ix = w / 2 - 0.16;
  const iz = d / 2 - 0.14;
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      addCyl(root, 0.05, 0.065, h - 0.1, wood, sx * ix, (h - 0.1) / 2, sz * iz, 10);
    }
  }
  addBox(root, w - 0.28, 0.08, 0.05, wood, 0, h - 0.14, d / 2 - 0.1);
  addBox(root, w - 0.28, 0.08, 0.05, wood, 0, h - 0.14, -(d / 2 - 0.1));
  addBox(root, 0.05, 0.08, d - 0.24, wood, w / 2 - 0.14, h - 0.14, 0);
  addBox(root, 0.05, 0.08, d - 0.24, wood, -(w / 2 - 0.14), h - 0.14, 0);
  addBox(root, w, 0.07, d, top, 0, h - 0.035, 0);
  addBox(root, w - 0.5, 0.05, d - 0.34, toon('#c4a574'), 0, 0.3, 0);
  addStacks(root, 0.33, 0.02, 4);
  packRow(root, h, d / 2 - 0.2, 'x', 9, 4, { span: w - 0.35 });
  packRow(root, h, -d / 2 + 0.22, 'x', 6, 2, { span: w - 0.55, face: true, gap: 0.03 });
  addStacks(root, h, 0.02, 5);
  const tent = plane(root, 0.12, 0.08, toon('#ffffff', { map: plaqueTexture('18', '#1b2438') }), 0.35, h + 0.08, 0.18, 0.4);
  tent.rotation.x = -0.5;
  g.add(root);
  addContact(g, w * 0.9, d * 0.85, x, z, 0.2);
}

function makeGondola(g, zone) {
  const { x, z, w, d, h } = zone;
  const root = new THREE.Group();
  root.position.set(x, 0, z);
  const wood = toon('#6b4a32');
  const end = toon('#3e2a1e');
  const shelf = toon('#d2b48a');
  addBox(root, w, 0.08, d, end, 0, 0.04, 0);
  addBox(root, 0.04, h - 0.1, d - 0.1, wood, 0, h / 2, 0);
  addBox(root, w, h - 0.08, 0.045, end, 0, (h - 0.08) / 2 + 0.04, d / 2 - 0.02);
  addBox(root, w, h - 0.08, 0.045, end, 0, (h - 0.08) / 2 + 0.04, -(d / 2 - 0.02));
  const ys = [0.34, 0.64, 0.94];
  for (const y of ys) {
    addBox(root, w / 2 - 0.04, 0.045, d - 0.12, shelf, w / 4, y, 0);
    addBox(root, w / 2 - 0.04, 0.045, d - 0.12, shelf, -w / 4, y, 0);
    const top = y + 0.024;
    packRow(root, top, w / 2 - 0.1, 'z', 28, Math.round(y * 10), { span: d - 0.26, alongZ: true });
    packRow(root, top, -(w / 2 - 0.1), 'z', 28, Math.round(y * 10) + 2, { span: d - 0.26, alongZ: true });
  }
  addBox(root, w + 0.04, 0.05, d + 0.02, wood, 0, h, 0);
  addStacks(root, h + 0.02, 0, 8);
  plane(root, 0.46, 0.16, toon('#ffffff', { map: plaqueTexture('STAFF PICKS', '#6e3034') }), 0, h * 0.62, d / 2 + 0.03, 0);
  g.add(root);
  addContact(g, w * 0.95, d * 0.9, x, z, 0.2);
}

function makeCounter(g, zone) {
  const { x, z, w, d, h } = zone;
  const root = new THREE.Group();
  root.position.set(x, 0, z);
  const wood = toon('#5c4030');
  const panel = toon('#1e3a32');
  const top = toon('#e6d0a8');
  const brass = toon('#c6a15b');
  addBox(root, w - 0.06, h - 0.18, d - 0.06, wood, 0, (h - 0.18) / 2 + 0.08, 0.02);
  addBox(root, w * 0.28, h * 0.4, 0.025, panel, -w * 0.22, h * 0.48, d / 2 + 0.01);
  addBox(root, w * 0.22, h * 0.4, 0.025, panel, w * 0.02, h * 0.48, d / 2 + 0.01);
  addBox(root, w + 0.08, 0.06, d + 0.1, top, 0, h - 0.03, 0);
  const rail = addCyl(root, 0.018, 0.018, w * 0.72, brass, 0, 0.14, d / 2 + 0.08, 10);
  rail.rotation.z = Math.PI / 2;
  addBox(root, 0.38, 0.34, d - 0.22, toon('#1a120e'), w / 2 - 0.32, 0.38, 0.02);
  addBox(root, 0.16, 0.22, 0.1, toon('#d8c7a4'), w / 2 - 0.36, 0.32, 0.02);
  addBox(root, 0.16, 0.22, 0.1, toon('#c4a574'), w / 2 - 0.28, 0.34, -0.02);
  for (let i = 0; i < 4; i++) {
    noCast(addBox(root, 0.2, 0.035, 0.14, cloth(BOOK[i + 2]), -0.55 + i * 0.05, h + 0.02 + i * 0.035, 0.08));
  }
  plane(root, 0.42, 0.12, toon('#ffffff', { map: plaqueTexture('PAY HERE', '#1b2438') }), w * 0.28, h * 0.78, d / 2 + 0.04, 0);
  const bell = addCyl(root, 0.045, 0.05, 0.03, brass, 0.72, h + 0.02, -0.08, 12);
  addCyl(root, 0.02, 0.02, 0.04, brass, 0.72, h + 0.05, -0.08, 8);
  bell.castShadow = true;
  g.add(root);
  addContact(g, w * 0.9, d * 0.85, x, z, 0.18);
}

function makeLedge(g, zone, mode) {
  const { x, z, w, d, h } = zone;
  const root = new THREE.Group();
  root.position.set(x, 0, z);
  const wood = toon('#6a4a32');
  const top = toon('#e0c39a');
  addBox(root, w, 0.08, d, wood, 0, 0.04, 0);
  addBox(root, w - 0.08, h - 0.12, 0.04, wood, 0, h / 2, -d / 2 + 0.04);
  addBox(root, 0.04, h - 0.1, d, wood, -w / 2 + 0.02, h / 2, 0);
  addBox(root, 0.04, h - 0.1, d, wood, w / 2 - 0.02, h / 2, 0);
  if (mode === 'angled') {
    addBox(root, w - 0.12, 0.03, d - 0.08, top, 0, h * 0.42, 0.02);
    const rack = new THREE.Group();
    rack.position.set(0, h * 0.72, 0);
    rack.rotation.x = -0.42;
    addBox(rack, w - 0.16, 0.025, 0.2, top, 0, 0, 0);
    packRow(rack, 0.02, 0, 'x', 8, 6, { face: true, span: w - 0.4, gap: 0.02 });
    root.add(rack);
    packRow(root, h * 0.42 + 0.03, 0.02, 'x', 7, 9, { span: w - 0.3 });
  } else {
    addBox(root, w - 0.1, 0.04, d - 0.06, top, 0, h - 0.02, 0);
    packRow(root, h, 0.02, 'x', 6, 4, { face: true, span: w - 0.25, gap: 0.02 });
    addStacks(root, h, -0.08, 2);
  }
  g.add(root);
  addContact(g, w * 0.8, d * 0.8, x, z, 0.16);
}

function makeLadder(g, x, z) {
  const root = new THREE.Group();
  root.position.set(x, 0, z);
  root.rotation.z = 0.11;
  const wood = toon('#6b4a32');
  addBox(root, 0.035, 2.25, 0.03, wood, -0.16, 1.12, 0);
  addBox(root, 0.035, 2.25, 0.03, wood, 0.16, 1.12, 0);
  for (let i = 0; i < 8; i++) addBox(root, 0.32, 0.022, 0.022, wood, 0, 0.28 + i * 0.25, 0);
  const wheel = toon('#2a2a2a');
  const a = addCyl(root, 0.04, 0.04, 0.03, wheel, -0.16, 0.05, 0, 10);
  const b = addCyl(root, 0.04, 0.04, 0.03, wheel, 0.16, 0.05, 0, 10);
  a.rotation.z = Math.PI / 2;
  b.rotation.z = Math.PI / 2;
  g.add(root);
  addContact(g, 0.55, 0.4, x, z, 0.16);
}

function makeCrate(g, x, z, seed) {
  const root = new THREE.Group();
  root.position.set(x, 0, z);
  const wood = toon('#8a6244');
  addBox(root, 0.42, 0.28, 0.32, wood, 0, 0.14, 0);
  addBox(root, 0.36, 0.2, 0.02, toon('#6a4a32'), 0, 0.16, 0.15);
  for (let i = 0; i < 4; i++) {
    noCast(addBox(root, 0.16, 0.22, 0.04, cloth(BOOK[(seed + i) % BOOK.length]), -0.1 + (i % 3) * 0.08, 0.4, -0.04 + (i % 2) * 0.05));
  }
  g.add(root);
  addContact(g, 0.4, 0.32, x, z, 0.16);
}

function makeBasket(g, x, z) {
  const root = new THREE.Group();
  root.position.set(x, 0, z);
  const cane = toon('#b8894a');
  addBox(root, 0.38, 0.06, 0.26, cane, 0, 0.03, 0);
  addBox(root, 0.38, 0.16, 0.02, cane, 0, 0.12, 0.12);
  addBox(root, 0.38, 0.16, 0.02, cane, 0, 0.12, -0.12);
  addBox(root, 0.02, 0.16, 0.26, cane, -0.18, 0.12, 0);
  addBox(root, 0.02, 0.16, 0.26, cane, 0.18, 0.12, 0);
  addCyl(root, 0.01, 0.01, 0.22, toon('#5c4030'), 0, 0.22, 0, 6).rotation.z = Math.PI / 2;
  for (let i = 0; i < 3; i++) {
    noCast(addBox(root, 0.14, 0.02, 0.1, cloth(BOOK[i + 4]), -0.06 + i * 0.06, 0.08, 0));
  }
  g.add(root);
}

function addFoliage(g, x, y, z, s = 1) {
  const stem = toon('#3d5c2e');
  const a = toon('#2f6a3c');
  const b = toon('#1d4a2c');
  addCyl(g, 0.012 * s, 0.018 * s, 0.16 * s, stem, x, y + 0.1 * s, z, 6);
  const pots = [
    [0, 0.22, 0, 0.11, a],
    [0.06, 0.28, -0.03, 0.08, b],
    [-0.05, 0.26, 0.04, 0.07, a],
    [0.02, 0.33, 0.02, 0.06, b],
  ];
  for (const [dx, dy, dz, r, mat] of pots) {
    const leaf = new THREE.Mesh(new THREE.SphereGeometry(r * s, 8, 6), mat);
    leaf.position.set(x + dx * s, y + dy * s, z + dz * s);
    leaf.castShadow = true;
    g.add(leaf);
  }
}

function hang(g, inst, height, ceilingY) {
  const [x, y, z] = inst.position;
  const top = y + height;
  const cordH = Math.max(0.05, ceilingY - top);
  addCyl(g, 0.006, 0.006, cordH, toon('#2a241c'), x, top + cordH / 2, z, 6);
  addCyl(g, 0.05, 0.05, 0.025, toon('#c6a15b'), x, ceilingY - 0.02, z, 12);
  const bulb = addCyl(g, 0.045, 0.045, 0.035, bulbMat, x, y + 0.12, z, 10);
  bulb.userData.castShadow = false;
}

function lampBulb(g, inst) {
  const [x, y, z] = inst.position;
  const rot = inst.rotationY || 0;
  const lz = -0.05;
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.035, 10, 8), bulbMat);
  bulb.position.set(x + Math.sin(rot) * lz, y + 0.3, z + Math.cos(rot) * lz);
  bulb.userData.castShadow = false;
  g.add(bulb);
}

function makeProcedural(layout) {
  const g = new THREE.Group();
  g.name = 'procedural';
  const zones = layout.zones;
  makeReadingTable(g, zones.readingTable);
  makeIsland(g, zones.island);
  makeGondola(g, zones.gondola);
  makeCounter(g, zones.counter);
  makeLedge(g, zones.poetryLedge, 'flat');
  makeLedge(g, zones.newArrivals, 'angled');
  makeLadder(g, -4.62, 1.28);
  for (const inst of layout.instances) {
    if (inst.kind !== 'museum_bench') continue;
    const [x, , z] = inst.position;
    addBox(g, 1.42, 0.045, 0.32, toon('#8c3a3a'), x, 0.44, z);
    addBox(g, 1.42, 0.26, 0.07, toon('#6e3034'), x, 0.62, z - 0.16);
  }
  makeCrate(g, zones.crate.x, zones.crate.z, 3);
  makeBasket(g, -0.85, 3.25);
  for (const inst of layout.instances) {
    if (inst.kind === 'display_bookcase') fillCase(g, inst);
  }
  const pendH = layout.assets.pendant_lamp.targetHeight;
  for (const inst of layout.instances) {
    if (inst.kind === 'pendant_lamp') hang(g, inst, pendH, 3.42);
    if (inst.kind === 'library_lamp') lampBulb(g, inst);
    if (inst.kind === 'flowerpot') {
      const s = inst.position[1] > 0.5 ? 0.7 : 1.05;
      addFoliage(g, inst.position[0], inst.position[1] + 0.2, inst.position[2], s);
    }
  }
  return g;
}

function addLights(scene, layout) {
  const warm = 0xffd2a4;
  for (const inst of layout.instances) {
    if (inst.kind === 'pendant_lamp') {
      const pl = new THREE.PointLight(warm, 0.48, 5.2, 2);
      pl.position.set(inst.position[0], inst.position[1] + 0.18, inst.position[2]);
      scene.add(pl);
    } else if (inst.kind === 'library_lamp') {
      const rot = inst.rotationY || 0;
      const lz = -0.05;
      const pl = new THREE.PointLight(0xffe2b8, 0.16, 2.2, 2);
      pl.position.set(
        inst.position[0] + Math.sin(rot) * lz,
        inst.position[1] + 0.32,
        inst.position[2] + Math.cos(rot) * lz,
      );
      scene.add(pl);
    }
  }
  const win = layout.zones.window;
  const day = new THREE.PointLight(0xd5e6f6, 0.35, 6.5, 2);
  day.position.set((win.x0 + win.x1) / 2, (win.sillY + win.headY) / 2, -3.55);
  scene.add(day);

  const spotSpecs = [
    { at: [-0.7, 3.25, -0.15], to: [-0.7, 0.8, -0.15], intensity: 2.4 },
    { at: [0.85, 3.15, 0.4], to: [0.85, 0.9, 0.85], intensity: 2.8 },
    { at: [3.5, 3.2, -2.6], to: [3.5, 1.0, -2.9], intensity: 1.8 },
  ];
  for (const spec of spotSpecs) {
    const spot = new THREE.SpotLight(0xfff1d4, spec.intensity, 7.5, 0.42, 0.55, 1);
    spot.position.set(...spec.at);
    spot.target.position.set(...spec.to);
    scene.add(spot, spot.target);
  }
}

boot({
  makeShell,
  makeProcedural,
  addLights,
  readyText: 'ready — Quill & Spine bookshop · drag orbit · U unlit · T toon',
}).catch((err) => {
  console.error(err);
  const statusEl = document.getElementById('status');
  if (statusEl) statusEl.textContent = `boot failed: ${err.message}`;
  window.__bootErrors = window.__bootErrors || [];
  window.__bootErrors.push(String(err && err.stack || err));
});
