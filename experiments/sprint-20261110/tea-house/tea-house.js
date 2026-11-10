import * as THREE from 'three';
import { boot, toon, addBox, addCyl, addSphere, addCone, addTorus } from './scene_lib.js';

const WOOD = '#6b442c';
const WOOD_MID = '#a56b3c';
const WOOD_LIT = '#c4925a';
const FRAME = '#4e3424';
const PLASTER = '#f4efe6';
const INK = '#2a241e';
const INDIGO = '#243246';
const PAPER = '#f4ead4';
const CELADON = '#8eaa96';

function near(color, hex, tol = 0.14) {
  const t = new THREE.Color(hex);
  return Math.abs(color.r - t.r) < tol && Math.abs(color.g - t.g) < tol && Math.abs(color.b - t.b) < tol;
}

function tagMaterials(root, pred, emissive, intensity) {
  root.traverse((obj) => {
    if (!obj.isMesh || !obj.material) return;
    const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
    mats.forEach((m) => {
      if (!m.color || !pred(m.color)) return;
      m.userData.emissive = emissive;
      m.userData.emissiveIntensity = intensity;
    });
  });
}

function tintNeutrals(root, darkHex, lightHex) {
  root.traverse((obj) => {
    if (!obj.isMesh || !obj.material) return;
    const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
    mats.forEach((m) => {
      if (!m.color) return;
      const sat = Math.max(m.color.r, m.color.g, m.color.b) - Math.min(m.color.r, m.color.g, m.color.b);
      if (sat > 0.08) return;
      const l = m.color.r * 0.3 + m.color.g * 0.59 + m.color.b * 0.11;
      m.color.set(l > 0.5 ? lightHex : darkHex);
    });
  });
}

function shortenWorldUp(mesh, factor) {
  const geo = mesh.geometry.clone();
  const attr = geo.attributes.position;
  mesh.updateWorldMatrix(true, false);
  const world = mesh.matrixWorld;
  const inv = world.clone().invert();
  const v = new THREE.Vector3();
  let minY = Infinity;
  for (let i = 0; i < attr.count; i++) {
    v.fromBufferAttribute(attr, i).applyMatrix4(world);
    if (v.y < minY) minY = v.y;
  }
  for (let i = 0; i < attr.count; i++) {
    v.fromBufferAttribute(attr, i).applyMatrix4(world);
    v.y = minY + (v.y - minY) * factor;
    v.applyMatrix4(inv);
    attr.setXYZ(i, v.x, v.y, v.z);
  }
  attr.needsUpdate = true;
  geo.computeBoundingBox();
  geo.computeVertexNormals();
  mesh.geometry = geo;
}

function simplifyChairBack(root) {
  root.updateWorldMatrix(true, true);
  root.traverse((obj) => {
    if (!obj.isMesh) return;
    const n = (obj.name || '').replaceAll('.', '');
    if (n === 'back_bar001' || n === 'back_bar002' || n === 'back_bar003') obj.visible = false;
    if (n === 'back_post' || n === 'back_post001') shortenWorldUp(obj, 0.58);
  });
}

function onBeforeShade(kind, root) {
  if (kind === 'dining_chair') simplifyChairBack(root);
  if (kind === 'bar_counter') {
    root.traverse((obj) => {
      if (!obj.isMesh || !obj.material) return;
      const hex = /top/i.test(obj.name) ? '#e7d8c4' : '#6a5140';
      const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
      mats.forEach((m) => {
        if (m.color) m.color.set(hex);
      });
    });
  }
  if (kind === 'bar_stool') tintNeutrals(root, '#4e463f', '#6a5e52');
  if (kind === 'pendant_lamp') {
    tagMaterials(root, (c) => near(c, '#ad6100', 0.18), '#ff9a3c', 0.72);
    tagMaterials(root, (c) => near(c, '#d9d9d9', 0.12), '#fff1d2', 1.05);
  }
}

function screenPanel(parent, {
  x, y = 0, z, w, h, rotY = 0, paper = true, slatEvery = 0.12, postEvery = 0.32,
  frame = FRAME, slat = WOOD_LIT, kick = 0,
}) {
  const g = new THREE.Group();
  const ft = 0.046;
  const fd = 0.042;
  const frameMat = toon(frame);
  const slatMat = toon(slat);
  const base = kick;
  if (base > 0) {
    addBox(g, w + 0.06, base, 0.07, toon(WOOD), 0, base / 2, 0);
    addBox(g, w + 0.1, 0.035, 0.1, toon(INK), 0, 0.02, 0);
  }
  const y0 = base;
  addBox(g, w, ft, fd, frameMat, 0, y0 + ft / 2, 0);
  addBox(g, w, ft, fd, frameMat, 0, y0 + h - ft / 2, 0);
  addBox(g, ft, h, fd, frameMat, -w / 2 + ft / 2, y0 + h / 2, 0);
  addBox(g, ft, h, fd, frameMat, w / 2 - ft / 2, y0 + h / 2, 0);
  if (paper) {
    addBox(
      g, w - ft * 2.1, h - ft * 2.1, 0.008,
      toon(PAPER, { transparent: true, opacity: 0.8, side: THREE.DoubleSide }),
      0, y0 + h / 2, -0.012,
    );
  }
  for (let yy = y0 + ft + slatEvery * 0.55; yy < y0 + h - ft; yy += slatEvery) {
    addBox(g, w - ft * 2.3, 0.012, 0.012, slatMat, 0, yy, 0.012);
  }
  for (let xx = -w / 2 + postEvery; xx < w / 2 - ft; xx += postEvery) {
    addBox(g, 0.016, h - ft * 2, 0.016, frameMat, xx, y0 + h / 2, 0.015);
  }
  g.position.set(x, y, z);
  g.rotation.y = rotY;
  g.name = 'screen';
  parent.add(g);
  return g;
}

function makeShell(layout) {
  const g = new THREE.Group();
  g.name = 'shell';
  const { width: W, depth: D, height: H } = layout.meta.room;
  const s = layout.shell;
  const arch = layout.architecture;
  const win = arch.window;
  const dais = arch.dais;
  const plaster = toon(s.wallColor || PLASTER);
  const floorA = toon(s.floorColor || '#c4a36c');
  const floorB = toon(s.floorAlt || '#b5915c');
  const wood = toon(s.woodColor || WOOD);
  const woodL = toon(s.woodLight || WOOD_LIT);
  const ink = toon(INK);
  const ceilMat = toon(s.ceilingColor || '#f7f2ea');

  const floor = new THREE.Mesh(new THREE.BoxGeometry(W, 0.08, D), floorA);
  floor.position.y = -0.04;
  floor.receiveShadow = true;
  g.add(floor);
  const plankCount = Math.round(D / 0.22);
  for (let i = 0; i < plankCount; i++) {
    const z = -D / 2 + 0.12 + i * (D - 0.2) / plankCount;
    addBox(g, W - 0.18, 0.006, 0.16, i % 2 ? floorB : floorA, 0, 0.004, z);
  }
  addBox(g, W, 0.012, 0.08, ink, 0, 0.006, -D / 2 + 0.08);
  addBox(g, 0.08, 0.012, D, ink, -W / 2 + 0.08, 0.006, 0);

  const wallT = 0.12;
  const backZ = -D / 2;
  const leftX = -W / 2;
  const x0 = win.x0;
  const x1 = win.x1;
  const leftW = x0 - leftX;
  addBox(g, leftW, H, wallT, plaster, leftX + leftW / 2, H / 2, backZ);
  const rightW = W / 2 - x1;
  addBox(g, rightW, H, wallT, plaster, x1 + rightW / 2, H / 2, backZ);
  const winW = x1 - x0;
  const winCx = (x0 + x1) / 2;
  addBox(g, winW, win.sill, wallT, plaster, winCx, win.sill / 2, backZ);
  const headH = H - win.head;
  addBox(g, winW, headH, wallT, plaster, winCx, win.head + headH / 2, backZ);
  addBox(g, wallT, H, D, plaster, leftX, H / 2, 0);

  addBox(g, leftW - 0.08, 0.78, 0.045, wood, leftX + leftW / 2, 0.39, backZ + 0.08);
  addBox(g, rightW - 0.04, 0.78, 0.045, wood, x1 + rightW / 2, 0.39, backZ + 0.08);
  addBox(g, winW, 0.08, 0.16, woodL, winCx, win.sill + 0.02, backZ + 0.12);
  addBox(g, 0.05, 0.86, D - 0.2, wood, leftX + 0.08, 0.43, 0);
  addBox(g, W - 0.15, 0.07, 0.04, ink, 0, 0.045, backZ + 0.09);
  addBox(g, 0.04, 0.07, D - 0.15, ink, leftX + 0.09, 0.045, 0);

  const glass = toon(s.windowTint || '#d5e6dc', { transparent: true, opacity: 0.38, side: THREE.DoubleSide });
  const glassH = win.head - win.sill;
  addBox(g, winW - 0.08, glassH - 0.06, 0.02, glass, winCx, win.sill + glassH / 2, backZ + 0.07);

  const jamb = toon(FRAME);
  addBox(g, 0.07, glassH + 0.12, 0.1, jamb, x0, win.sill + glassH / 2, backZ + 0.1);
  addBox(g, 0.07, glassH + 0.12, 0.1, jamb, x1, win.sill + glassH / 2, backZ + 0.1);
  addBox(g, winW + 0.08, 0.08, 0.1, jamb, winCx, win.head, backZ + 0.1);
  addBox(g, winW + 0.08, 0.06, 0.1, jamb, winCx, win.sill, backZ + 0.1);
  for (let x = x0 + 0.42; x < x1 - 0.2; x += 0.55) {
    addBox(g, 0.035, glassH, 0.06, woodL, x, win.sill + glassH / 2, backZ + 0.12);
  }
  addBox(g, winW, 0.03, 0.05, woodL, winCx, win.sill + glassH * 0.38, backZ + 0.13);
  addBox(g, winW, 0.03, 0.05, woodL, winCx, win.sill + glassH * 0.68, backZ + 0.13);

  const latH = win.head - win.sill - 0.12;
  screenPanel(g, {
    x: winCx, y: win.sill, z: backZ + 0.74, w: winW - 0.16, h: latH,
    slatEvery: 0.13, postEvery: 0.34, paper: true,
  });
  screenPanel(g, {
    x: winCx + 0.1, y: win.sill + 0.16, z: backZ + 1.02, w: winW * 0.56, h: latH * 0.76,
    slatEvery: 0.075, postEvery: 0.18, paper: false, frame: WOOD, slat: WOOD_MID,
  });

  const dx = dais.x + dais.w / 2;
  const dz = dais.z + dais.d / 2;
  addBox(g, dais.w, dais.h, dais.d, toon('#8a5a38'), dx, dais.h / 2, dz);
  addBox(g, dais.w + 0.04, 0.025, 0.045, ink, dx, dais.h - 0.01, dais.z + dais.d);
  addBox(g, 0.045, 0.025, dais.d, ink, dais.x, dais.h - 0.01, dz);
  addBox(g, 0.045, 0.025, dais.d, ink, dais.x + dais.w, dais.h - 0.01, dz);
  addBox(g, 2.02, 0.012, 1.12, toon(INDIGO), arch.table[0], dais.h + 0.008, arch.table[2]);
  addBox(g, 1.15, 0.07, 0.38, toon('#7a5134'), arch.table[0], 0.035, dais.z + dais.d + 0.2);
  addBox(g, 0.85, 0.045, 0.32, toon('#6b452c'), arch.table[0], 0.022, dais.z + dais.d + 0.48);
  addBox(g, 0.78, 0.012, 1.55, toon(INDIGO), arch.table[0], 0.012, dais.z + dais.d + 1.15);

  const cw = W * 0.94;
  const cd = D * 0.7;
  addBox(g, cw, 0.08, cd, ceilMat, -0.15, H - 0.05, -D * 0.16);
  addBox(g, 3.6, 0.1, 0.08, wood, arch.table[0], H - 0.22, arch.table[2] - 0.42);
  addBox(g, 3.6, 0.1, 0.08, wood, arch.table[0], H - 0.22, arch.table[2] + 0.42);
  addBox(g, 0.08, 0.1, 1.05, wood, arch.counter[0], H - 0.28, arch.counter[1]);

  return g;
}

function foliage(g, x, y, z, kind, tint) {
  const leaf = toon(tint);
  const leaf2 = toon('#2f5a34');
  const stem = toon('#4d5a32');
  if (kind === 'bamboo') {
    for (let i = 0; i < 6; i++) {
      const ox = (i - 2.5) * 0.04;
      const oz = ((i % 3) - 1) * 0.035;
      const h = 1.15 + (i % 3) * 0.12;
      addCyl(g, 0.012, 0.016, h, stem, x + ox, y + h / 2, z + oz, 6);
      addCyl(g, 0.02, 0.02, 0.015, toon('#6d7a45'), x + ox, y + h * 0.45, z + oz, 6);
      addCyl(g, 0.02, 0.02, 0.015, toon('#6d7a45'), x + ox, y + h * 0.72, z + oz, 6);
    }
    addSphere(g, 0.16, leaf, x + 0.08, y + 1.05, z, 1.4, 0.45, 0.7);
    addSphere(g, 0.12, leaf2, x - 0.06, y + 1.18, z + 0.04, 1.2, 0.4, 0.6);
    return;
  }
  if (kind === 'fern') {
    addCyl(g, 0.015, 0.02, 0.28, stem, x, y + 0.16, z, 6);
    for (let i = 0; i < 5; i++) {
      const a = i * 1.2;
      addSphere(g, 0.14, leaf, x + Math.cos(a) * 0.16, y + 0.28 + (i % 2) * 0.08, z + Math.sin(a) * 0.12, 1.3, 0.35, 0.7);
    }
    return;
  }
  if (kind === 'maple') {
    addCyl(g, 0.03, 0.045, 0.55, toon('#5a3a28'), x, y + 0.32, z, 8);
    addSphere(g, 0.28, leaf, x, y + 0.78, z, 1.15, 0.75, 1.05);
    addSphere(g, 0.18, leaf2, x + 0.16, y + 0.92, z - 0.06, 1, 0.8, 1);
    addSphere(g, 0.14, leaf, x - 0.14, y + 0.7, z + 0.1, 1.1, 0.7, 0.9);
    return;
  }
  addCyl(g, 0.02, 0.028, 0.22, stem, x, y + 0.16, z, 6);
  addSphere(g, 0.2, leaf, x, y + 0.42, z, 1.05, 0.85, 1);
  addSphere(g, 0.13, leaf2, x + 0.1, y + 0.52, z - 0.05, 1, 0.8, 1);
}

function teapot(g, x, y, z) {
  const body = toon('#e4d8c8');
  const clay = toon('#b4533a');
  const dark = toon('#3a2c24');
  addSphere(g, 0.075, body, x, y + 0.07, z, 1.15, 0.82, 1);
  addCyl(g, 0.028, 0.034, 0.02, dark, x, y + 0.012, z, 12);
  addTorus(g, 0.045, 0.008, dark, x - 0.07, y + 0.07, z, Math.PI / 2);
  addCone(g, 0.02, 0.07, clay, x + 0.09, y + 0.07, z + 0.01, 8);
  const spout = addCone(g, 0.016, 0.06, clay, x + 0.1, y + 0.09, z, 8);
  spout.rotation.z = -Math.PI / 2.4;
  addSphere(g, 0.04, body, x, y + 0.125, z, 1, 0.45, 1);
  addCyl(g, 0.01, 0.012, 0.02, dark, x, y + 0.15, z, 8);
}

function teaBowl(g, x, y, z, glaze, tea) {
  addCyl(g, 0.028, 0.032, 0.008, toon('#5c4636'), x, y + 0.004, z, 12);
  addCyl(g, 0.052, 0.04, 0.04, toon(glaze), x, y + 0.026, z, 16);
  addCyl(g, 0.04, 0.04, 0.006, toon(tea), x, y + 0.04, z, 12);
}

function kettle(g, x, y, z) {
  const iron = toon('#2c2a28');
  const hot = toon('#ffb15a', { emissive: '#ff9a3a', emissiveIntensity: 0.55 });
  addSphere(g, 0.09, iron, x, y + 0.09, z, 1.05, 0.9, 1);
  addCyl(g, 0.025, 0.04, 0.04, iron, x, y + 0.02, z, 10);
  addTorus(g, 0.07, 0.008, toon('#1a1816'), x, y + 0.16, z, 0);
  addCyl(g, 0.012, 0.012, 0.12, iron, x, y + 0.2, z, 6);
  addSphere(g, 0.018, hot, x + 0.07, y + 0.1, z, 1, 1, 1);
}

function basin(g, x, z) {
  const stone = toon('#8d8a84');
  const water = toon('#6e8c92');
  addCyl(g, 0.22, 0.24, 0.16, stone, x, 0.08, z, 16);
  addCyl(g, 0.16, 0.16, 0.02, water, x, 0.15, z, 14);
  addBox(g, 0.06, 0.72, 0.06, toon(WOOD), x + 0.28, 0.36, z - 0.02);
  addCyl(g, 0.015, 0.018, 0.28, toon('#6a8a48'), x + 0.16, 0.62, z, 6);
  const spout = addCyl(g, 0.012, 0.014, 0.22, toon('#6a8a48'), x + 0.1, 0.58, z, 6);
  spout.rotation.z = Math.PI / 2;
}

function cabinetRun(g, x, z0, z1) {
  const h = 0.86;
  const d = 0.42;
  const z = (z0 + z1) / 2;
  const len = z1 - z0;
  addBox(g, d, 0.08, len, toon(INK), x, 0.04, z);
  addBox(g, d - 0.02, h - 0.12, len - 0.04, toon(WOOD), x, 0.08 + (h - 0.12) / 2, z);
  addBox(g, d + 0.02, 0.045, len + 0.02, toon('#d9d1c6'), x, h - 0.02, z);
  const doors = 3;
  for (let i = 0; i < doors; i++) {
    const zz = z0 + (i + 0.5) * (len / doors);
    addBox(g, 0.012, h * 0.62, len / doors - 0.04, toon(WOOD_MID), x + d / 2, h * 0.48, zz);
    addCyl(g, 0.012, 0.012, 0.012, toon('#c8b48a'), x + d / 2 + 0.01, h * 0.5, zz + 0.08, 8);
  }
}

function niche(g, x, z) {
  addBox(g, 0.08, 1.35, 1.15, toon(FRAME), x + 0.02, 1.85, z);
  addBox(g, 0.06, 1.15, 0.95, toon('#e7dccb'), x + 0.05, 1.82, z);
  addBox(g, 0.28, 0.045, 0.72, toon(WOOD_LIT), x + 0.16, 1.18, z);
  addBox(g, 0.02, 0.78, 0.42, toon('#f7f1e6'), x + 0.07, 1.95, z);
  addBox(g, 0.015, 0.28, 0.16, toon(INDIGO), x + 0.09, 2.05, z + 0.02);
  addBox(g, 0.012, 0.05, 0.2, toon(WOOD), x + 0.08, 2.32, z);
}

function menuBoard(g, x, y, z) {
  addBox(g, 0.04, 0.92, 0.62, toon('#f3ead8'), x, y, z);
  addBox(g, 0.02, 0.96, 0.66, toon(FRAME), x - 0.01, y, z);
  for (let i = 0; i < 6; i++) {
    const w = 0.28 - (i % 3) * 0.04;
    addBox(g, 0.012, 0.018, w, toon(i === 0 ? '#8a3a2a' : INK), x + 0.02, y + 0.32 - i * 0.12, z - 0.02);
  }
}

function andon(g, x, y, z) {
  const wood = toon('#5a3d28');
  const paper = toon('#f6d7a4', { emissive: '#ffb15c', emissiveIntensity: 0.95 });
  addBox(g, 0.18, 0.018, 0.18, wood, x, y + 0.012, z);
  addBox(g, 0.014, 0.32, 0.014, wood, x - 0.07, y + 0.17, z - 0.07);
  addBox(g, 0.014, 0.32, 0.014, wood, x + 0.07, y + 0.17, z - 0.07);
  addBox(g, 0.014, 0.32, 0.014, wood, x - 0.07, y + 0.17, z + 0.07);
  addBox(g, 0.014, 0.32, 0.014, wood, x + 0.07, y + 0.17, z + 0.07);
  addBox(g, 0.12, 0.24, 0.12, paper, x, y + 0.16, z);
  addBox(g, 0.012, 0.2, 0.012, toon('#8a6238'), x, y + 0.16, z);
  addBox(g, 0.19, 0.02, 0.19, wood, x, y + 0.33, z);
  addCyl(g, 0.008, 0.008, 0.07, wood, x, y + 0.37, z, 6);
}

function lantern(g, x, y, z) {
  addCyl(g, 0.008, 0.008, 0.45, toon(INK), x, y + 0.28, z, 6);
  addCyl(g, 0.15, 0.16, 0.035, toon(FRAME), x, y, z, 12);
  addCyl(
    g, 0.11, 0.13, 0.26,
    toon('#f3d7a4', { emissive: '#ffb45a', emissiveIntensity: 0.9 }),
    x, y + 0.16, z, 14,
  );
  addCyl(g, 0.13, 0.11, 0.04, toon(FRAME), x, y + 0.3, z, 12);
}

function makeProcedural(layout) {
  const g = new THREE.Group();
  g.name = 'procedural';
  const arch = layout.architecture;
  const D = layout.meta.room.depth;
  const backZ = -D / 2;
  const { width: W } = layout.meta.room;

  screenPanel(g, {
    x: 2.4, z: -1.92, w: 1.4, h: 1.58, kick: 0.14, paper: true, slatEvery: 0.11, postEvery: 0.28,
  });
  screenPanel(g, {
    x: 4.15, z: -1.92, w: 1.0, h: 1.58, kick: 0.14, paper: true, slatEvery: 0.11, postEvery: 0.28,
  });
  screenPanel(g, {
    x: -W / 2 + 0.28, z: -0.15, w: 1.15, h: 1.7, rotY: Math.PI / 2, kick: 0.08,
    paper: true, slatEvery: 0.12, postEvery: 0.26,
  });

  cabinetRun(g, -4.42, -1.48, -0.12);
  niche(g, -4.68, 0.95);
  menuBoard(g, -4.66, 1.72, -0.85);

  const plants = [
    ['pot_entry_l', 'bamboo', '#3f7a45'],
    ['pot_garden_a', 'maple', '#2f6a3c'],
    ['pot_garden_b', 'fern', '#4d8a52'],
    ['pot_entry_r', 'maple', '#356848'],
    ['pot_bench', 'fern', '#2f6a3c'],
    ['pot_dais', 'shrub', '#3d7a48'],
    ['pot_counter', 'shrub', '#2a5a32'],
    ['pot_sill', 'fern', '#3e7a46'],
    ['pot_ledge', 'shrub', '#4a8a55'],
  ];
  const byId = Object.fromEntries((layout.instances || []).map((i) => [i.id, i]));
  for (const [id, kind, tint] of plants) {
    const p = byId[id];
    if (!p) continue;
    const potH = layout.assets.flowerpot.targetHeight;
    foliage(g, p.position[0], p.position[1] + potH * 0.92, p.position[2], kind, tint);
  }

  const top = arch.tableTop;
  const t = arch.table;
  teapot(g, t[0] - 0.48, top, t[2] + 0.02);
  kettle(g, t[0] - 0.72, top, t[2] - 0.12);
  const bowls = [
    [0.22, 0.16, '#9eb5a2', '#6a4428'],
    [0.38, 0.08, '#f0e6d2', '#c46a32'],
    [0.5, -0.04, '#c46a45', '#4a2a18'],
    [0.34, -0.12, '#2c3a44', '#1a120e'],
    [0.12, 0.02, '#d7c4a4', '#8a5a32'],
    [0.46, 0.16, '#7f9a78', '#5a3a22'],
  ];
  for (const [dx, dz, glaze, tea] of bowls) {
    teaBowl(g, t[0] + dx, top, t[2] + dz, glaze, tea);
  }
  addBox(g, 1.15, 0.008, 0.22, toon('#1e2c3c'), t[0] + 0.05, top + 0.004, t[2] + 0.02);
  addBox(g, 0.16, 0.012, 0.1, toon('#f7f1e6'), t[0] - 0.15, top + 0.01, t[2] - 0.18);
  addBox(g, 0.1, 0.008, 0.07, toon('#f3f6f4'), t[0] + 0.62, top + 0.008, t[2] - 0.16);

  const c = arch.counter;
  andon(g, -1.08, arch.counterTop, c[1] + 0.02);
  kettle(g, c[0] - 0.85, arch.counterTop, c[1] + 0.08);
  addBox(g, 0.36, 0.02, 0.22, toon('#efe6d8'), c[0] - 0.15, arch.counterTop + 0.01, c[1] + 0.05);
  addCyl(g, 0.045, 0.05, 0.03, toon('#d8d2c8'), c[0] + 0.35, arch.counterTop + 0.02, c[1] - 0.15, 14);
  for (let i = 0; i < 4; i++) {
    addCyl(g, 0.055, 0.055, 0.012, toon(i % 2 ? '#f4f0ea' : '#ded6cc'), c[0] + 0.55, arch.counterTop + 0.012 + i * 0.012, c[1] + 0.18, 12);
  }

  basin(g, 4.15, 0.72);
  addBox(g, 0.46, 0.42, 0.46, toon('#6d5844'), 2.55, 0.21, -1.32);
  addBox(g, 0.5, 0.035, 0.5, toon(WOOD_LIT), 2.55, 0.435, -1.32);

  lantern(g, 3.4, 2.05, -1.65);
  lantern(g, -1.35, 2.15, 0.15);
  lantern(g, t[0] + 0.15, 2.22, t[2] - 0.05);

  addBox(g, 0.9, 0.035, 0.035, toon(WOOD_LIT), 3.15, 2.72, backZ + 0.55);

  return g;
}

boot({
  makeShell,
  makeProcedural,
  onBeforeShade,
  readyText: 'ready — tea house · drag orbit · U unlit · T toon',
});
