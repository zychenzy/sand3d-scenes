import * as THREE from 'three';
import { boot, toon, addBox, addCyl, makeCutawayShell } from './scene_lib.js';

const wood = () => toon('#5c3b2c');
const woodDark = () => toon('#3a271c');
const woodMid = () => toon('#6d4a34');
const woodLight = () => toon('#8a5a38');
const brass = () => toon('#c6a15a');
const steel = () => toon('#8e969e');
const leather = () => toon('#6e3a28');
const velvet = () => toon('#1f6b48');
const plaster = () => toon('#f3eadc');

const labelCache = new Map();

function labelMat(text, bg, fg, cw = 256, ch = 128, font = 72) {
  const key = [text, bg, fg, cw, ch, font].join('|');
  if (labelCache.has(key)) return labelCache.get(key);
  const canvas = document.createElement('canvas');
  canvas.width = cw;
  canvas.height = ch;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, cw, ch);
  ctx.fillStyle = fg;
  ctx.font = `700 ${font}px Inter, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, cw / 2, ch / 2 + font * 0.04);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  const mat = toon('#ffffff', { map: tex });
  labelCache.set(key, mat);
  return mat;
}

function addCylX(g, r, len, mat, x, y, z) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, 10), mat);
  m.rotation.z = Math.PI / 2;
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  g.add(m);
  return m;
}

function flatRing(g, radius, tube, color, x, y, z) {
  const m = new THREE.Mesh(new THREE.TorusGeometry(radius, tube, 8, 18), toon(color));
  m.rotation.x = Math.PI / 2;
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  g.add(m);
  return m;
}

function gem(g, r, color, x, y, z) {
  const m = new THREE.Mesh(new THREE.OctahedronGeometry(r, 0), toon(color));
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  g.add(m);
  return m;
}

function noShadow(mesh) {
  mesh.castShadow = false;
  mesh.userData.noShadow = true;
  return mesh;
}

function dressFloor(g, W, D) {
  const light = toon('#d8bc8c');
  const dark = toon('#c4a06a');
  const n = Math.ceil((D - 0.3) / 0.2);
  for (let i = 0; i < n; i++) {
    const z = -D / 2 + 0.16 + i * 0.2;
    const plank = addBox(g, W - 0.28, 0.012, 0.18, i % 2 ? dark : light, 0, 0.008, z);
    plank.castShadow = false;
    plank.userData.noShadow = true;
    plank.userData.receiveShadow = true;
  }
  const border = toon('#6a4632');
  for (const mesh of [
    addBox(g, W - 0.12, 0.018, 0.1, border, 0, 0.012, -D / 2 + 0.08),
    addBox(g, W - 0.12, 0.018, 0.1, border, 0, 0.012, D / 2 - 0.08),
    addBox(g, 0.1, 0.018, D - 0.16, border, -W / 2 + 0.08, 0.012, 0),
    addBox(g, 0.1, 0.018, D - 0.16, border, W / 2 - 0.08, 0.012, 0),
  ]) {
    mesh.castShadow = false;
    mesh.userData.noShadow = true;
    mesh.userData.receiveShadow = true;
  }
}

function panelRun(g, axis, fixed, a0, a1, y, h) {
  const span = a1 - a0;
  const n = Math.max(3, Math.round(span / 0.92));
  const step = span / n;
  const frame = toon('#4e3428');
  const inset = toon('#6d4a36');
  for (let i = 0; i < n; i++) {
    const c = a0 + step * (i + 0.5);
    const pw = step - 0.06;
    if (axis === 'x') {
      addBox(g, pw, h, 0.045, frame, c, y, fixed);
      addBox(g, pw - 0.1, h - 0.12, 0.02, inset, c, y, fixed + 0.02);
    } else {
      addBox(g, 0.045, h, pw, frame, fixed, y, c);
      addBox(g, 0.02, h - 0.12, pw - 0.1, inset, fixed + 0.02, y, c);
    }
  }
}

function contactDisc(g, x, z, rx, rz) {
  const m = new THREE.Mesh(
    new THREE.CircleGeometry(1, 16),
    toon('#1a120c', { transparent: true, opacity: 0.28, depthWrite: false, polygonOffset: true }),
  );
  m.rotation.x = -Math.PI / 2;
  m.position.set(x, 0.034, z);
  m.scale.set(rx, rz, 1);
  return noShadow(m), g.add(m);
}

function makeShell(layout) {
  const g = makeCutawayShell(layout, { ceiling: false });
  const { width: W, depth: D, height: H } = layout.meta.room;
  const innerL = -W / 2 + 0.08;
  const innerB = -D / 2 + 0.08;
  dressFloor(g, W, D);

  const ao = toon('#2a2118', { transparent: true, opacity: 0.2, depthWrite: false });
  noShadow(addBox(g, W - 0.3, 0.1, 0.07, ao, 0, 0.05, innerB));
  noShadow(addBox(g, 0.07, 0.1, D - 0.3, ao, innerL, 0.05, 0));

  addBox(g, W - 0.36, 0.1, 0.06, woodDark(), 0, 0.06, innerB + 0.02);
  addBox(g, 0.06, 0.1, D - 0.36, woodDark(), innerL + 0.02, 0.06, 0);
  panelRun(g, 'x', innerB + 0.04, -W / 2 + 0.45, W / 2 - 0.55, 0.56, 0.78);
  panelRun(g, 'z', innerL + 0.04, -D / 2 + 0.45, D / 2 - 0.45, 0.56, 0.78);
  addBox(g, W - 0.3, 0.07, 0.07, wood(), 0, 1.02, innerB + 0.03);
  addBox(g, 0.07, 0.07, D - 0.3, wood(), innerL + 0.03, 1.02, 0);
  addBox(g, W - 0.3, 0.035, 0.045, brass(), 0, 2.58, innerB + 0.02);
  addBox(g, 0.045, 0.035, D - 0.3, brass(), innerL + 0.02, 2.58, 0);
  addBox(g, W - 0.2, 0.1, 0.1, woodDark(), 0, H - 0.08, innerB + 0.02);
  addBox(g, 0.1, 0.1, D - 0.2, woodDark(), innerL + 0.02, H - 0.08, 0);

  const soffit = addBox(g, W * 0.92, 0.08, D * 0.42, plaster(), -0.15, H - 0.08, -D * 0.28);
  soffit.castShadow = false;
  for (const z of [-2.55, 0.05, 2.55]) {
    addBox(g, W - 0.7, 0.1, 0.14, woodDark(), -0.1, H - 0.22, z);
  }

  const rug = addBox(g, 8.6, 0.02, 3.2, toon('#5c2030'), -0.05, 0.02, 2.2);
  rug.castShadow = false;
  rug.userData.noShadow = true;
  rug.userData.receiveShadow = true;
  const rugIn = addBox(g, 8.15, 0.012, 2.75, toon('#7a3044'), -0.05, 0.032, 2.2);
  rugIn.castShadow = false;
  rugIn.userData.noShadow = true;
  rugIn.userData.receiveShadow = true;
  const runner = addBox(g, 1.05, 0.018, 1.7, leather(), -0.35, 0.02, -1.9);
  runner.castShadow = false;
  runner.userData.noShadow = true;
  runner.userData.receiveShadow = true;
  return g;
}

function tool(board, mesh) {
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  board.add(mesh);
  return mesh;
}

function hammer(board, x, y, s = 1) {
  addBox(board, 0.045 * s, 0.28 * s, 0.04, toon('#8a4e2c'), x, y, 0.05);
  addBox(board, 0.16 * s, 0.055 * s, 0.05, steel(), x, y + 0.13 * s, 0.06);
}

function pliers(board, x, y) {
  const a = tool(board, new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.3, 0.025), steel()));
  a.position.set(x - 0.02, y, 0.05);
  a.rotation.z = 0.42;
  const b = tool(board, new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.3, 0.025), steel()));
  b.position.set(x + 0.04, y, 0.05);
  b.rotation.z = -0.42;
  addCyl(board, 0.018, 0.018, 0.03, brass(), x + 0.01, y - 0.02, 0.07, 8);
}

function saw(board, x, y) {
  addBox(board, 0.035, 0.24, 0.03, steel(), x, y, 0.05);
  addBox(board, 0.035, 0.24, 0.03, steel(), x + 0.24, y, 0.05);
  addBox(board, 0.28, 0.04, 0.035, steel(), x + 0.12, y + 0.11, 0.05);
  addBox(board, 0.26, 0.018, 0.012, toon('#d5dde4'), x + 0.12, y - 0.1, 0.06);
  addBox(board, 0.12, 0.045, 0.04, toon('#8a4e2c'), x + 0.12, y + 0.16, 0.055);
}

function mandrel(board, x, y) {
  const m = tool(board, new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.038, 0.34, 10), toon('#d7b56a')));
  m.rotation.z = 0.55;
  m.position.set(x, y, 0.05);
}

function files(board, x, y) {
  for (let i = 0; i < 3; i++) {
    const m = tool(board, new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.32, 0.012), steel()));
    m.position.set(x + i * 0.06, y, 0.05);
    m.rotation.z = -0.18 + i * 0.16;
  }
}

function loupe(board, x, y) {
  const rim = tool(board, new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.012, 6, 16), brass()));
  rim.position.set(x, y + 0.06, 0.06);
  const lens = tool(board, new THREE.Mesh(new THREE.CircleGeometry(0.055, 16), toon('#d5f0ea', { transparent: true, opacity: 0.45, side: THREE.DoubleSide })));
  lens.position.set(x, y + 0.06, 0.06);
  addBox(board, 0.03, 0.12, 0.03, toon('#2a2118'), x, y - 0.08, 0.05);
}

function tweezers(board, x, y) {
  const a = tool(board, new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.28, 0.012), steel()));
  a.position.set(x, y, 0.05);
  a.rotation.z = 0.08;
  const b = tool(board, new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.28, 0.012), steel()));
  b.position.set(x + 0.03, y, 0.05);
  b.rotation.z = -0.08;
}

function toolboard(g, x, y, z, w, h, variant) {
  const board = new THREE.Group();
  addBox(board, w + 0.08, h + 0.08, 0.045, woodDark(), 0, 0, -0.01);
  addBox(board, w, h, 0.03, toon('#1c3a32'), 0, 0, 0.012);
  addBox(board, w - 0.08, 0.025, 0.02, brass(), 0, h / 2 - 0.05, 0.03);
  if (variant === 'make') {
    hammer(board, -0.38, 0.08, 1);
    pliers(board, -0.02, 0.12);
    saw(board, 0.22, 0.02);
    mandrel(board, -0.36, -0.22);
    tweezers(board, 0.08, -0.18);
    loupe(board, 0.38, -0.16);
  } else {
    files(board, -0.4, 0.05);
    loupe(board, -0.02, 0.14);
    hammer(board, 0.34, 0.1, 0.85);
    saw(board, 0.12, -0.2);
    pliers(board, -0.34, -0.2);
  }
  board.position.set(x, y, z);
  g.add(board);
}

function workbench(g, b, h, opts) {
  const { x, z, w, d } = b;
  const legH = h - 0.08;
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      addBox(g, 0.075, legH, 0.075, woodDark(), x + sx * (w / 2 - 0.08), legH / 2, z + sz * (d / 2 - 0.07));
    }
  }
  addBox(g, w - 0.22, 0.06, 0.055, wood(), x, 0.16, z);
  addBox(g, 0.055, 0.06, d - 0.18, wood(), x - w / 2 + 0.28, 0.16, z);
  addBox(g, 0.055, 0.06, d - 0.18, wood(), x + w / 2 - 0.28, 0.16, z);
  addBox(g, w - 0.08, 0.11, 0.04, wood(), x, h - 0.15, z + d / 2 - 0.035);
  addBox(g, w - 0.08, 0.11, 0.04, wood(), x, h - 0.15, z - d / 2 + 0.035);

  const notchW = 0.22;
  const notchD = 0.15;
  const backD = d - notchD;
  addBox(g, w, 0.075, backD, woodLight(), x, h - 0.038, z - d / 2 + backD / 2);
  const sideW = (w - notchW) / 2;
  const fz = z + d / 2 - notchD / 2;
  addBox(g, sideW, 0.075, notchD, woodLight(), x - (notchW / 2 + sideW / 2), h - 0.038, fz);
  addBox(g, sideW, 0.075, notchD, woodLight(), x + (notchW / 2 + sideW / 2), h - 0.038, fz);
  addBox(g, Math.min(0.72, w * 0.34), 0.012, d * 0.4, leather(), x - 0.12, h + 0.006, z - 0.02);

  if (opts.pin) {
    addBox(g, 0.09, 0.018, 0.2, toon('#c4a06a'), x - 0.02, h + 0.014, z + d / 2 - 0.04);
    flatRing(g, 0.04, 0.008, '#e3b340', x + 0.08, h + 0.03, z + 0.08);
    gem(g, 0.016, '#2a4e9a', x + 0.08, h + 0.045, z + 0.08);
    addBox(g, 0.2, 0.015, 0.12, woodMid(), x + 0.28, h + 0.01, z - 0.04);
  }
  if (opts.drawers) {
    const dx = x - w / 2 + 0.36;
    for (let i = 0; i < 3; i++) {
      const y = 0.24 + i * 0.155;
      addBox(g, 0.48, 0.12, 0.04, toon(i % 2 ? '#6b4a34' : '#7a553c'), dx, y, z + d / 2 + 0.005);
      addCylX(g, 0.012, 0.1, brass(), dx + 0.12, y, z + d / 2 + 0.04);
    }
  }
  if (opts.vise) {
    const vx = x + w / 2 - 0.2;
    const vz = z + d / 2 - 0.08;
    addBox(g, 0.1, 0.06, 0.08, toon('#5c6368'), vx, h + 0.03, vz);
    addBox(g, 0.035, 0.07, 0.05, steel(), vx - 0.04, h + 0.09, vz + 0.02);
    addBox(g, 0.035, 0.07, 0.05, steel(), vx + 0.04, h + 0.09, vz + 0.02);
    addCylX(g, 0.012, 0.16, brass(), vx, h + 0.1, vz);
  }
  if (opts.motor) {
    const mx = x + w / 2 - 0.32;
    addBox(g, 0.3, 0.09, 0.18, toon('#2e3338'), mx, h + 0.045, z - 0.04);
    const drum = tool(g, new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.065, 0.2, 16), toon('#3a4046')));
    drum.rotation.z = Math.PI / 2;
    drum.position.set(mx - 0.02, h + 0.15, z - 0.02);
    const buff = tool(g, new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.045, 16), toon('#f3ecdf')));
    buff.rotation.z = Math.PI / 2;
    buff.position.set(mx + 0.14, h + 0.15, z - 0.02);
    addBox(g, 0.16, 0.012, 0.1, velvet(), x - 0.15, h + 0.008, z + 0.02);
    for (let i = 0; i < 4; i++) gem(g, 0.02, ['#b4233a', '#2a4e9a', '#1f8a55', '#e3b340'][i], x - 0.24 + i * 0.07, h + 0.03, z + 0.02);
  }
}

function balanceScale(g, x, y, z) {
  addBox(g, 0.18, 0.02, 0.1, toon('#8a6a32'), x, y + 0.01, z);
  addCyl(g, 0.012, 0.016, 0.22, brass(), x, y + 0.13, z, 8);
  addBox(g, 0.3, 0.018, 0.018, brass(), x, y + 0.25, z);
  for (const s of [-1, 1]) {
    addBox(g, 0.008, 0.07, 0.008, brass(), x + s * 0.12, y + 0.21, z);
    addCyl(g, 0.048, 0.04, 0.016, toon('#e6d7a4'), x + s * 0.12, y + 0.17, z, 12);
  }
  addBox(g, 0.025, 0.02, 0.025, toon('#e3b340'), x - 0.12, y + 0.19, z);
}

function materialsChest(g, c) {
  const { x, z, w, d, h } = c;
  addBox(g, w, 0.08, d + 0.02, woodDark(), x, 0.04, z);
  addBox(g, w - 0.04, h - 0.08, d, wood(), x, h / 2 + 0.02, z);
  const labels = [
    ['WAX', '#a33b32', '#f8efe6'],
    ['GEM', '#1f6b48', '#f3f6f4'],
    ['AG', '#d5dde4', '#1c242c'],
    ['AU', '#e6b422', '#2a1c08'],
  ];
  for (let i = 0; i < 4; i++) {
    const y = 0.28 + i * 0.22;
    addBox(g, w - 0.12, 0.17, 0.04, toon(i % 2 ? '#6d4b34' : '#7d5840'), x, y, z + d / 2 + 0.01);
    const lab = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.1, 0.012), labelMat(labels[i][0], labels[i][1], labels[i][2]));
    lab.position.set(x - 0.18, y, z + d / 2 + 0.04);
    lab.castShadow = true;
    g.add(lab);
    addCylX(g, 0.015, 0.12, brass(), x + 0.22, y, z + d / 2 + 0.05);
  }
  addBox(g, w + 0.06, 0.045, d + 0.04, toon('#2c3338'), x, h + 0.02, z);
  balanceScale(g, x - 0.16, h + 0.045, z + 0.02);
  [[0.14, 0.06, '#b4233a'], [0.24, -0.02, '#2a4e9a'], [0.18, 0.12, '#1f8a55'], [0.28, 0.08, '#e3b340']].forEach(
    ([dx, dz, col]) => gem(g, 0.03, col, x + dx, h + 0.08, z + dz),
  );
}

function bust(g, x, y, z, s = 1) {
  const skin = toon('#e6c8ae');
  addCyl(g, 0.075 * s, 0.09 * s, 0.06 * s, woodDark(), x, y + 0.03 * s, z, 10);
  addBox(g, 0.2 * s, 0.08 * s, 0.1 * s, skin, x, y + 0.09 * s, z);
  addCyl(g, 0.045 * s, 0.055 * s, 0.09 * s, skin, x, y + 0.15 * s, z, 10);
  const head = tool(g, new THREE.Mesh(new THREE.SphereGeometry(0.07 * s, 14, 12), skin));
  head.scale.set(1, 1.12, 0.92);
  head.position.set(x, y + 0.24 * s, z);
  flatRing(g, 0.055 * s, 0.008 * s, '#e3b340', x, y + 0.15 * s, z);
  gem(g, 0.016 * s, '#2a4e9a', x, y + 0.11 * s, z + 0.045 * s);
}

function displayCounter(g, c) {
  const { x, z, w, d, h } = c;
  addBox(g, w - 0.12, 0.08, d - 0.1, woodDark(), x, 0.04, z + 0.02);
  addBox(g, w - 0.06, h - 0.12, d - 0.08, wood(), x, (h - 0.12) / 2 + 0.08, z);
  const panelW = (w - 0.28) / 3;
  for (let i = 0; i < 3; i++) {
    const px = x - w / 2 + 0.14 + panelW / 2 + i * panelW;
    addBox(g, panelW - 0.06, h - 0.28, 0.02, toon('#6a4632'), px, h / 2 + 0.02, z + d / 2 + 0.02);
  }
  addBox(g, w + 0.06, 0.06, d + 0.05, woodLight(), x, h + 0.03, z);
  addBox(g, w + 0.02, 0.02, 0.02, brass(), x, 0.09, z + d / 2);

  const gw = w - 0.36;
  const gd = d - 0.26;
  const gh = 0.36;
  const gz = z + 0.04;
  const gy = h + 0.06 + gh / 2;
  addBox(g, gw - 0.06, 0.02, gd - 0.04, velvet(), x, h + 0.08, gz);
  addBox(g, 0.025, gh - 0.02, gd - 0.05, woodDark(), x - gw / 6, gy, gz);
  addBox(g, 0.025, gh - 0.02, gd - 0.05, woodDark(), x + gw / 6, gy, gz);
  const glassMat = toon('#d7f3ee', {
    transparent: true,
    opacity: 0.16,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  for (const mesh of [
    addBox(g, gw, gh, 0.012, glassMat, x, gy, gz + gd / 2),
    addBox(g, gw, gh, 0.012, glassMat, x, gy, gz - gd / 2),
    addBox(g, 0.012, gh, gd, glassMat, x - gw / 2, gy, gz),
    addBox(g, 0.012, gh, gd, glassMat, x + gw / 2, gy, gz),
    addBox(g, gw, 0.012, gd, glassMat, x, h + 0.06 + gh, gz),
  ]) noShadow(mesh);
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) addBox(g, 0.028, gh, 0.028, brass(), x + sx * gw / 2, gy, gz + sz * gd / 2);
  }
  const strip = addBox(
    g, gw - 0.12, 0.015, 0.04,
    toon('#fff3d2', { emissive: '#ffd89a', emissiveIntensity: 0.85 }),
    x, h + gh - 0.01, gz,
  );
  noShadow(strip);

  const y0 = h + 0.1;
  const bay = gw / 3;
  addCyl(g, 0.02, 0.055, 0.11, toon('#efe2d0'), x - bay, y0 + 0.055, gz - 0.04, 10);
  addCyl(g, 0.016, 0.04, 0.09, toon('#efe2d0'), x - bay + 0.16, y0 + 0.045, gz + 0.06, 10);
  ['#e3b340', '#d5dbe0', '#d4896a'].forEach((col, i) => {
    flatRing(g, 0.048 + i * 0.006, 0.01, col, x - bay, y0 + 0.04 + i * 0.026, gz - 0.04);
  });
  gem(g, 0.016, '#b4233a', x - bay, y0 + 0.1, gz - 0.04);
  flatRing(g, 0.05, 0.01, '#e3b340', x - bay + 0.16, y0 + 0.07, gz + 0.06);
  bust(g, x, y0, gz, 0.95);
  flatRing(g, 0.07, 0.012, '#d5dbe0', x + bay - 0.08, y0 + 0.08, gz);
  flatRing(g, 0.055, 0.01, '#e3b340', x + bay + 0.1, y0 + 0.06, gz + 0.02);
  addBox(g, 0.28, 0.015, 0.16, toon('#14382a'), x + bay, y0 + 0.01, gz - 0.06);
  ['#b4233a', '#2a4e9a', '#1f8a55', '#e3b340', '#d5dbe0'].forEach((col, i) => {
    gem(g, 0.022, col, x + bay - 0.1 + i * 0.05, y0 + 0.04, gz - 0.06);
  });
}

function safeBox(g, x, z) {
  addBox(g, 0.62, 1.24, 0.48, toon('#24302c'), x, 0.62, z);
  addBox(g, 0.04, 1.02, 0.4, toon('#31423c'), x + 0.3, 0.66, z);
  const wheel = tool(g, new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.014, 6, 18), brass()));
  wheel.rotation.y = Math.PI / 2;
  wheel.position.set(x + 0.33, 0.78, z);
  addCyl(g, 0.02, 0.02, 0.03, brass(), x + 0.34, 0.78, z, 8);
  addBox(g, 0.012, 0.16, 0.012, brass(), x + 0.33, 0.78, z);
  addBox(g, 0.012, 0.012, 0.16, brass(), x + 0.33, 0.78, z);
  addBox(g, 0.03, 0.1, 0.035, brass(), x + 0.33, 0.5, z + 0.1);
}

function stockCabinet(g, s) {
  const { x, z, w, d, h } = s;
  addBox(g, w, 0.08, d, woodDark(), x, 0.04, z);
  addBox(g, 0.045, h, d, wood(), x - w / 2 + 0.02, h / 2, z);
  addBox(g, 0.045, h, d, wood(), x + w / 2 - 0.02, h / 2, z);
  addBox(g, w, h, 0.04, wood(), x, h / 2, z - d / 2 + 0.02);
  addBox(g, w, 0.05, d, woodMid(), x, h - 0.03, z);
  for (const y of [0.42, 0.88, 1.3]) addBox(g, w - 0.1, 0.03, d - 0.08, woodLight(), x, y, z + 0.02);
  addBox(g, 0.28, 0.05, 0.18, toon('#f3ecdf'), x - 0.22, 0.48, z + 0.02);
  addBox(g, 0.24, 0.045, 0.16, toon('#6e2a3a'), x - 0.2, 0.54, z + 0.03);
  addBox(g, 0.2, 0.04, 0.14, velvet(), x - 0.18, 0.59, z + 0.02);
  const chain = tool(g, new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.018, 8, 16), toon('#d5dbe0')));
  chain.position.set(x + 0.22, 0.56, z + 0.02);
  addBox(g, 0.22, 0.12, 0.16, woodLight(), x - 0.22, 0.97, z + 0.02);
  addBox(g, 0.2, 0.02, 0.16, brass(), x - 0.22, 1.04, z + 0.02);
  addBox(g, 0.18, 0.14, 0.14, toon('#6e2a3a'), x + 0.18, 0.98, z);
  const roll = tool(g, new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.34, 12), toon('#f4efe4')));
  roll.rotation.z = Math.PI / 2;
  roll.position.set(x - 0.12, 1.4, z + 0.02);
  addBox(g, 0.16, 0.1, 0.12, toon('#1a2744'), x + 0.24, 1.38, z);
}

function shopWindow(g, x, z) {
  const grp = new THREE.Group();
  addBox(grp, 1.32, 0.08, 0.08, woodDark(), 0, 0, 0);
  addBox(grp, 1.32, 0.08, 0.08, woodDark(), 0, 1.48, 0);
  addBox(grp, 0.08, 1.48, 0.08, wood(), -0.62, 0.74, 0);
  addBox(grp, 0.08, 1.48, 0.08, wood(), 0.62, 0.74, 0);
  addBox(grp, 0.035, 1.36, 0.03, brass(), 0, 0.74, 0.03);
  addBox(grp, 1.16, 0.035, 0.03, brass(), 0, 0.74, 0.03);
  noShadow(addBox(grp, 1.16, 1.36, 0.015, toon('#d7f3ee', {
    transparent: true, opacity: 0.14, side: THREE.DoubleSide, depthWrite: false,
  }), 0, 0.74, 0.01));
  addBox(grp, 0.14, 1.25, 0.04, toon('#6e2a3a'), -0.78, 0.78, 0.05);
  addBox(grp, 0.14, 1.25, 0.04, toon('#6e2a3a'), 0.78, 0.78, 0.05);
  const rod = tool(grp, new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 1.7, 8), brass()));
  rod.rotation.z = Math.PI / 2;
  rod.position.set(0, 1.52, 0.07);
  bust(grp, 0.12, 0.08, 0.12, 0.62);
  grp.position.set(x, 1.05, z);
  grp.rotation.y = Math.PI / 2;
  g.add(grp);
}

function mirror(g, x, y, z) {
  const frame = tool(g, new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.028, 8, 28), brass()));
  frame.position.set(x, y, z);
  const glass = new THREE.Mesh(
    new THREE.CircleGeometry(0.31, 28),
    toon('#243038', { emissive: '#3d5564', emissiveIntensity: 0.28 }),
  );
  glass.position.set(x, y, z + 0.012);
  noShadow(glass);
  g.add(glass);
}

function plaque(g, x, y, z) {
  addBox(g, 1.15, 0.24, 0.04, woodDark(), x, y, z);
  addBox(g, 1.02, 0.16, 0.015, brass(), x, y, z + 0.02);
  const face = new THREE.Mesh(
    new THREE.PlaneGeometry(0.9, 0.12),
    labelMat('ATELIER', '#c6a15a', '#2a1c08', 512, 128, 78),
  );
  face.position.set(x, y, z + 0.035);
  noShadow(face);
  g.add(face);
}

function trayCart(g, x, z) {
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) addCyl(g, 0.028, 0.028, 0.64, wood(), x + sx * 0.18, 0.32, z + sz * 0.13, 8);
  }
  addBox(g, 0.48, 0.03, 0.34, woodMid(), x, 0.38, z);
  addBox(g, 0.48, 0.03, 0.34, woodLight(), x, 0.66, z);
  addBox(g, 0.32, 0.015, 0.18, velvet(), x, 0.41, z);
  addBox(g, 0.3, 0.015, 0.16, toon('#6e2a3a'), x, 0.69, z);
  gem(g, 0.02, '#e3b340', x - 0.06, 0.44, z);
  gem(g, 0.018, '#2a4e9a', x + 0.06, 0.44, z);
}

function dressPot(g, x, y, z) {
  addCyl(g, 0.018, 0.024, 0.16, toon('#3e5a32'), x, y + 0.08, z, 6);
  [[0, 0.22, 0, 0.14, '#2f6a3a'], [0.08, 0.3, -0.04, 0.1, '#3d7a48'], [-0.07, 0.28, 0.05, 0.1, '#245832'], [0.02, 0.38, 0.02, 0.08, '#347848']].forEach(
    ([dx, dy, dz, r, col]) => {
      const leaf = tool(g, new THREE.Mesh(new THREE.SphereGeometry(r, 8, 6), toon(col)));
      leaf.scale.set(1, 0.72, 0.82);
      leaf.position.set(x + dx, y + dy, z + dz);
    },
  );
}

function caseTrays(g, layout) {
  const inst = (layout.instances || []).find((i) => i.id === 'gem_case');
  if (!inst) return;
  const scale = layout.assets.display_bookcase.targetHeight / 2;
  const ys = [0.029, 0.514, 1.0, 1.486].map((ymax) => (ymax + 0.025) * scale + 0.02);
  const pads = ['#6e2a3a', '#1f6b48', '#1a2744', '#4a3024'];
  const stones = ['#e3b340', '#d5dbe0', '#b4233a', '#2a4e9a', '#1f8a55'];
  ys.forEach((y, i) => {
    addBox(g, 0.2, 0.02, 0.62, toon(pads[i]), inst.position[0] + 0.05, y, inst.position[2]);
    for (let k = 0; k < 4; k++) {
      gem(g, 0.028, stones[(i + k) % stones.length], inst.position[0] + 0.07, y + 0.04, inst.position[2] - 0.22 + k * 0.14);
    }
  });
}

function lampGlows(g, layout) {
  const spec = layout.assets.library_lamp;
  const scale = spec.targetHeight / 0.451;
  for (const inst of layout.instances.filter((i) => i.kind === 'library_lamp')) {
    const off = -0.071 * scale;
    const ox = off * Math.sin(inst.rotationY || 0);
    const oz = off * Math.cos(inst.rotationY || 0);
    const glow = addBox(
      g, 0.22, 0.018, 0.02,
      toon('#fff6e0', { emissive: '#fff1c4', emissiveIntensity: 1 }),
      inst.position[0] + ox, inst.position[1] + 0.373 * scale, inst.position[2] + oz,
    );
    glow.rotation.y = inst.rotationY || 0;
    noShadow(glow);
  }
}

function pendantCords(g, layout) {
  const beamY = layout.meta.room.height - 0.22;
  const h = layout.assets.pendant_lamp.targetHeight;
  for (const inst of layout.instances.filter((i) => i.kind === 'pendant_lamp')) {
    const top = inst.position[1] + h;
    const len = beamY - top;
    if (len > 0.03) addCyl(g, 0.008, 0.008, len, toon('#2a2118'), inst.position[0], top + len / 2, inst.position[2], 6);
    const glow = addBox(
      g, 0.1, 0.04, 0.1,
      toon('#fff1c4', { emissive: '#ffd89a', emissiveIntensity: 0.9 }),
      inst.position[0], inst.position[1] + 0.12, inst.position[2],
    );
    noShadow(glow);
  }
}

function contacts(g, layout) {
  const radii = {
    dining_chair: [0.2, 0.26],
    square_table: [0.4, 0.4],
    display_bookcase: [0.26, 0.46],
    museum_plinth: [0.22, 0.22],
    book_stand: [0.26, 0.3],
    flowerpot: [0.16, 0.16],
  };
  for (const inst of layout.instances) {
    const r = radii[inst.kind];
    if (!r || inst.position[1] > 0.2) continue;
    contactDisc(g, inst.position[0], inst.position[2], r[0], r[1]);
  }
  const a = layout.anchors;
  contactDisc(g, a.benchA.x, a.benchA.z, a.benchA.w * 0.46, a.benchA.d * 0.46);
  contactDisc(g, a.benchB.x, a.benchB.z, a.benchB.w * 0.46, a.benchB.d * 0.46);
  contactDisc(g, a.chest.x, a.chest.z, a.chest.w * 0.48, a.chest.d * 0.48);
  contactDisc(g, a.counter.x, a.counter.z, a.counter.w * 0.48, a.counter.d * 0.48);
  contactDisc(g, a.stock.x, a.stock.z, a.stock.w * 0.46, a.stock.d * 0.46);
  contactDisc(g, a.safe.x, a.safe.z, 0.34, 0.28);
}

function makeProcedural(layout) {
  const g = new THREE.Group();
  g.name = 'procedural';
  const a = layout.anchors;
  const { width: W, depth: D, height: H } = layout.meta.room;
  const innerL = -W / 2 + 0.1;
  const innerB = -D / 2 + 0.06;

  workbench(g, a.benchA, a.benchTop, { pin: true, drawers: true, vise: true });
  workbench(g, a.benchB, a.benchTop, { pin: true, motor: true });
  materialsChest(g, a.chest);
  displayCounter(g, a.counter);
  stockCabinet(g, a.stock);
  safeBox(g, a.safe.x, a.safe.z);
  toolboard(g, a.benchA.x, 1.95, innerB, 1.4, 0.82, 'make');
  toolboard(g, a.benchB.x, 1.9, innerB, 1.25, 0.78, 'set');
  mirror(g, a.chest.x, 2.02, innerB + 0.02);
  plaque(g, a.chest.x, 2.78, innerB + 0.02);
  shopWindow(g, innerL, a.windowZ);
  trayCart(g, 2.9, -1.85);
  caseTrays(g, layout);
  lampGlows(g, layout);
  pendantCords(g, layout);
  contacts(g, layout);

  for (const inst of layout.instances.filter((i) => i.kind === 'flowerpot')) {
    dressPot(g, inst.position[0], inst.position[1] + layout.assets.flowerpot.targetHeight * 0.92, inst.position[2]);
  }

  addBox(g, 0.34, 0.02, 0.24, woodMid(), a.table.x, 0.76, a.table.z);
  addBox(g, 0.28, 0.012, 0.18, velvet(), a.table.x, 0.775, a.table.z);
  flatRing(g, 0.045, 0.009, '#e3b340', a.table.x - 0.04, 0.8, a.table.z);
  gem(g, 0.016, '#b4233a', a.table.x - 0.04, 0.815, a.table.z);
  flatRing(g, 0.04, 0.008, '#d5dbe0', a.table.x + 0.08, 0.795, a.table.z + 0.02);
  const orders = new THREE.Mesh(
    new THREE.BoxGeometry(0.22, 0.008, 0.16),
    labelMat('ORDERS', '#f4efe4', '#2a1c08', 384, 256, 64),
  );
  orders.position.set(a.table.x + 0.02, 0.785, a.table.z - 0.08);
  orders.rotation.x = -0.4;
  orders.castShadow = true;
  g.add(orders);

  bust(g, a.plinth.x, layout.assets.museum_plinth.targetHeight, a.plinth.z, 1.05);
  return g;
}

boot({
  makeShell,
  makeProcedural,
  readyText: 'ready — jeweler atelier · drag orbit · U unlit · T toon',
});
