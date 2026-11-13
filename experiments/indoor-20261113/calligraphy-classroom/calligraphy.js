import * as THREE from 'three';
import { boot, toon, addBox, addCyl, addSphere, addCone } from './scene_lib.js';

const INK = '#1a140f';
const FELT = '#2c4a3c';
const FELT_EDGE = '#1c3328';
const PAPER = '#f3ead4';
const CINNABAR = '#9a3b32';
const CELADON = '#8faa98';
const STONE = '#2c2926';
const BAMBOO = '#e6d3a6';
const WALNUT = '#5c3d28';
const FRAME = '#4a3122';

const texCache = new Map();

function canvasTex(c) {
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  tex.needsUpdate = true;
  return tex;
}

function woodTexture(hex, seed) {
  const key = `${hex}:${seed}`;
  if (texCache.has(key)) return texCache.get(key);
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 64;
  const ctx = c.getContext('2d');
  ctx.fillStyle = hex;
  ctx.fillRect(0, 0, 256, 64);
  const base = new THREE.Color(hex);
  for (let i = 0; i < 40; i++) {
    const y = (i * 19 + seed * 11) % 64;
    const k = 0.72 + ((i * 5 + seed) % 7) * 0.045;
    ctx.strokeStyle = `rgba(${(base.r * 255 * k) | 0},${(base.g * 255 * k) | 0},${(base.b * 255 * k * 0.9) | 0},0.55)`;
    ctx.lineWidth = i % 6 === 0 ? 1.6 : 0.7;
    ctx.beginPath();
    ctx.moveTo(0, y);
    for (let x = 0; x <= 256; x += 18) ctx.lineTo(x, y + Math.sin(x * 0.05 + i + seed) * 1.3);
    ctx.stroke();
  }
  const tex = canvasTex(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  texCache.set(key, tex);
  return tex;
}

function woodMat(hex, rx, ry, seed) {
  const map = woodTexture(hex, seed).clone();
  map.repeat.set(rx, ry);
  map.needsUpdate = true;
  const m = toon(hex);
  m.map = map;
  return m;
}

function quietWood(hex, seed) {
  const key = `quiet:${hex}:${seed}`;
  if (texCache.has(key)) return texCache.get(key);
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 64;
  const ctx = c.getContext('2d');
  ctx.fillStyle = hex;
  ctx.fillRect(0, 0, 256, 64);
  const base = new THREE.Color(hex);
  for (let i = 0; i < 18; i++) {
    const y = (i * 17 + seed * 9) % 64;
    const k = 0.9 + (i % 3) * 0.03;
    ctx.strokeStyle = `rgba(${(base.r * 255 * k) | 0},${(base.g * 255 * k) | 0},${(base.b * 255 * k) | 0},0.16)`;
    ctx.lineWidth = 0.6;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(256, y + 0.4);
    ctx.stroke();
  }
  const tex = canvasTex(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  texCache.set(key, tex);
  return tex;
}

function floorMat(hex, seed) {
  const map = quietWood(hex, seed).clone();
  map.repeat.set(1, 3);
  map.needsUpdate = true;
  const m = toon(hex);
  m.map = map;
  return m;
}

function feltTexture() {
  if (texCache.has('felt')) return texCache.get('felt');
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 128;
  const ctx = c.getContext('2d');
  ctx.fillStyle = FELT;
  ctx.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 1600; i++) {
    const g = 40 + ((i * 17) % 70);
    ctx.fillStyle = `rgba(${g},${g + 18},${g + 8},0.07)`;
    ctx.fillRect((i * 53) % 128, (i * 29) % 128, 2, 2);
  }
  const tex = canvasTex(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  texCache.set('felt', tex);
  return tex;
}

function feltMat() {
  const map = feltTexture().clone();
  map.repeat.set(3, 2);
  map.needsUpdate = true;
  const m = toon(FELT);
  m.map = map;
  return m;
}

const GLYPH = { ren: '\u4eba', yong: '\u6c38', tian: '\u5929' };

function drawGlyph(ctx, kind, cx, cy, px) {
  const ch = GLYPH[kind];
  if (!ch) return;
  ctx.save();
  ctx.fillStyle = INK;
  ctx.font = `${px}px "Noto Serif SC"`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(ch, cx, cy);
  ctx.restore();
}

function drawSeal(ctx, x, y, s) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-0.06);
  ctx.fillStyle = CINNABAR;
  ctx.fillRect(0, 0, s, s);
  ctx.strokeStyle = 'rgba(255, 236, 214, 0.9)';
  ctx.lineWidth = Math.max(1, s * 0.06);
  ctx.strokeRect(s * 0.18, s * 0.18, s * 0.64, s * 0.64);
  ctx.beginPath();
  ctx.moveTo(s * 0.28, s * 0.5);
  ctx.lineTo(s * 0.72, s * 0.5);
  ctx.moveTo(s * 0.5, s * 0.3);
  ctx.lineTo(s * 0.5, s * 0.7);
  ctx.stroke();
  ctx.restore();
}

function paperFibers(ctx, w, h) {
  ctx.fillStyle = PAPER;
  ctx.fillRect(0, 0, w, h);
  for (let i = 0; i < 500; i++) {
    ctx.fillStyle = `rgba(110, 82, 48, ${0.025 + (i % 4) * 0.012})`;
    ctx.fillRect((i * 67) % w, (i * 41) % h, 12, 1);
  }
}

function paperTexture(kind) {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 512;
  const ctx = c.getContext('2d');
  paperFibers(ctx, 512, 512);
  if (kind === 'grid' || kind === 'stroke') {
    ctx.strokeStyle = 'rgba(176, 84, 72, 0.42)';
    ctx.lineWidth = 2;
    const m = 48;
    ctx.strokeRect(m, m, 512 - m * 2, 512 - m * 2);
    ctx.beginPath();
    ctx.moveTo(256, m);
    ctx.lineTo(256, 512 - m);
    ctx.moveTo(m, 256);
    ctx.lineTo(512 - m, 256);
    ctx.moveTo(m, m);
    ctx.lineTo(512 - m, 512 - m);
    ctx.moveTo(512 - m, m);
    ctx.lineTo(m, 512 - m);
    ctx.stroke();
  }
  if (kind === 'yong' || kind === 'ren' || kind === 'tian') {
    drawGlyph(ctx, kind, 256, 228, 340);
    drawSeal(ctx, 48, 448, 34);
  }
  return canvasTex(c);
}

function glyphCard(kind) {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 640;
  const ctx = c.getContext('2d');
  paperFibers(ctx, 512, 640);
  drawGlyph(ctx, kind, 256, 300, 380);
  return canvasTex(c);
}

function scrollTexture(kind) {
  const c = document.createElement('canvas');
  c.width = 480;
  c.height = 960;
  const ctx = c.getContext('2d');
  const silk = kind === 'yong' ? '#243044' : '#7c3030';
  ctx.fillStyle = silk;
  ctx.fillRect(0, 0, 480, 960);
  ctx.fillStyle = kind === 'yong' ? '#c4a15a' : '#e6c98a';
  ctx.fillRect(28, 78, 424, 800);
  ctx.fillStyle = PAPER;
  ctx.fillRect(40, 92, 400, 772);
  for (let i = 0; i < 280; i++) {
    ctx.fillStyle = 'rgba(120, 90, 50, 0.045)';
    ctx.fillRect(40 + ((i * 53) % 400), 92 + ((i * 37) % 772), 14, 1);
  }
  drawGlyph(ctx, kind, 240, 390, 300);
  drawSeal(ctx, 78, 740, 46);
  return canvasTex(c);
}

function quiet(mesh) {
  mesh.castShadow = false;
  mesh.userData.castShadow = false;
  return mesh;
}

function flatPaper(parent, w, h, y, kind) {
  const mat = toon(PAPER);
  mat.map = paperTexture(kind);
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = y;
  quiet(mesh);
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function inkstone(parent, x, y, z, scale = 1) {
  const g = new THREE.Group();
  const s = scale;
  const body = toon('#3c3834');
  addBox(g, 0.168 * s, 0.02 * s, 0.116 * s, body, 0, 0.01 * s, 0);
  addBox(g, 0.07 * s, 0.004 * s, 0.09 * s, toon('#564f48'), -0.03 * s, 0.02 * s, -0.004 * s);
  addCyl(g, 0.034 * s, 0.038 * s, 0.012 * s, toon('#1a1612'), 0.04 * s, 0.014 * s, 0.012 * s, 20);
  addCyl(g, 0.02 * s, 0.022 * s, 0.008 * s, toon('#070605'), 0.04 * s, 0.02 * s, 0.012 * s, 16);
  g.position.set(x, y, z);
  parent.add(g);
}

function paperweight(parent, x, y, z) {
  const g = new THREE.Group();
  addSphere(g, 0.026, toon('#5d6b62'), 0, 0.014, 0, 1.45, 0.42, 0.95);
  addSphere(g, 0.011, toon('#3c4c44'), 0.004, 0.028, 0.002, 1, 0.65, 0.9);
  g.position.set(x, y, z);
  parent.add(g);
}

function brush(parent, x, y, z, yaw) {
  const g = new THREE.Group();
  const handle = addCyl(g, 0.0065, 0.008, 0.15, toon(BAMBOO), 0.028, 0.011, 0, 10);
  handle.rotation.z = Math.PI / 2;
  for (const nx of [0.01, 0.055]) {
    const node = addCyl(g, 0.0095, 0.0095, 0.005, toon('#d9c49a'), nx, 0.011, 0, 8);
    node.rotation.z = Math.PI / 2;
  }
  const ferrule = addCyl(g, 0.01, 0.008, 0.02, toon('#8d6234'), -0.055, 0.011, 0, 10);
  ferrule.rotation.z = Math.PI / 2;
  const belly = addCone(g, 0.011, 0.026, toon('#6a4a34'), -0.078, 0.011, 0, 10);
  belly.rotation.z = Math.PI / 2;
  const tip = addCone(g, 0.006, 0.036, toon('#140e0c'), -0.104, 0.011, 0, 8);
  tip.rotation.z = Math.PI / 2;
  g.position.set(x, y, z);
  g.rotation.y = yaw;
  parent.add(g);
}

function brushRest(parent, x, y, z) {
  const g = new THREE.Group();
  addBox(g, 0.064, 0.008, 0.03, toon(CELADON), 0, 0.004, 0);
  addCone(g, 0.011, 0.018, toon('#d7e6de'), -0.016, 0.014, 0, 6);
  addCone(g, 0.009, 0.014, toon('#e4f0e8'), 0.016, 0.012, 0, 6);
  g.position.set(x, y, z);
  parent.add(g);
}

function brushPot(parent, x, y, z) {
  addCyl(parent, 0.028, 0.032, 0.07, toon('#243028'), x, y + 0.035, z, 12);
  addCyl(parent, 0.006, 0.006, 0.16, toon(BAMBOO), x - 0.008, y + 0.1, z, 6);
  addCyl(parent, 0.005, 0.005, 0.14, toon('#1a120e'), x + 0.008, y + 0.09, z + 0.006, 6);
}

function waterDish(parent, x, y, z) {
  addCyl(parent, 0.04, 0.046, 0.018, toon(CELADON), x, y + 0.009, z, 14);
  addCyl(parent, 0.026, 0.026, 0.006, toon('#7f9aa4'), x, y + 0.016, z, 12);
}

function deskKit(parent, surface, kit, variant) {
  const [px, pz, pw, ph] = kit.paper;
  const paper = new THREE.Group();
  paper.position.set(px, 0, pz);
  paper.rotation.y = variant === 1 ? -0.04 : 0.025;
  const kind = variant === 1 ? 'ren' : variant === 3 ? 'stroke' : 'grid';
  if (variant === 2) {
    quiet(addBox(paper, pw, 0.012, ph, toon('#efe4d0'), 0.02, surface + 0.006, 0));
    quiet(addBox(paper, pw * 0.96, 0.004, ph * 0.96, toon(PAPER), -0.01, surface + 0.016, 0.01));
  } else {
    flatPaper(paper, pw, ph, surface + 0.004, kind);
  }
  parent.add(paper);
  inkstone(parent, kit.inkstone[0], surface, kit.inkstone[1], variant === 2 ? 0.92 : 1);
  paperweight(parent, kit.weight[0], surface + 0.004, kit.weight[1]);
  if (variant === 2) brushPot(parent, kit.brush[0], surface, kit.brush[1]);
  else {
    brush(parent, kit.brush[0], surface, kit.brush[1], 0.22);
    brushRest(parent, kit.brush[0] - 0.02, surface, kit.brush[1] + 0.08);
  }
  if (variant === 1) waterDish(parent, -0.42, surface, 0.12);
}

function writingDesk(parent, desk, kit) {
  const g = new THREE.Group();
  g.name = desk.id;
  const { w, d, h, variant } = desk;
  const tones = ['#c9a56e', '#d4b07c', '#b99258', '#c4a068'];
  const tone = tones[variant % tones.length];
  const apron = variant % 2 ? '#6e4a2c' : '#7d5534';
  const leg = '#5a3c28';
  const topT = 0.04;
  const plankGap = 0.008;
  const plankW = (w - plankGap * 2) / 3;
  for (let i = 0; i < 3; i++) {
    const px = -w / 2 + plankW / 2 + i * (plankW + plankGap);
    const hex = i === 1 ? tone : (i === 0 ? '#d8b684' : '#c09a60');
    addBox(g, plankW, topT, d, woodMat(hex, 2.2, 1, variant * 3 + i), px, h - topT / 2, 0);
  }
  addBox(g, w, 0.012, 0.02, woodMat('#8a5a34', 2, 1, 9), 0, h - topT - 0.004, d / 2 - 0.012);
  const apronY = h - topT - 0.07;
  addBox(g, 0.028, 0.12, d - 0.12, woodMat(apron, 1, 1.4, 4), -w / 2 + 0.07, apronY, -0.02);
  addBox(g, 0.028, 0.12, d - 0.12, woodMat(apron, 1, 1.4, 5), w / 2 - 0.07, apronY, -0.02);
  addBox(g, w - 0.2, 0.1, 0.028, woodMat(apron, 2, 1, 6), 0, apronY + 0.01, -d / 2 + 0.07);
  addBox(g, w - 0.28, 0.045, 0.018, toon('#4e3424'), 0, 0.16, d / 2 - 0.1);
  const insetX = w / 2 - 0.09;
  const insetZ = d / 2 - 0.09;
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      addBox(g, 0.055, h - topT - 0.02, 0.055, woodMat(leg, 1, 2, sx + sz + 3), sx * insetX, (h - topT) / 2, sz * insetZ);
      addBox(g, 0.07, 0.028, 0.07, toon('#3e2a1c'), sx * insetX, 0.016, sz * insetZ);
    }
  }
  const feltW = w - 0.28;
  const feltD = d - 0.2;
  addBox(g, feltW + 0.02, 0.008, feltD + 0.02, toon(FELT_EDGE), 0, h + 0.004, 0);
  const felt = addBox(g, feltW, 0.008, feltD, feltMat(), 0, h + 0.01, 0);
  quiet(felt);
  deskKit(g, h + 0.016, kit, variant);
  g.position.set(desk.x, 0, desk.z);
  parent.add(g);
}

function hangingScroll(parent, spec) {
  const g = new THREE.Group();
  g.name = spec.id;
  const mat = toon(PAPER);
  mat.map = scrollTexture(spec.kind);
  const face = new THREE.Mesh(new THREE.PlaneGeometry(spec.w, spec.h), mat);
  quiet(face);
  face.receiveShadow = true;
  g.add(face);
  const rod = addCyl(g, 0.016, 0.016, spec.w + 0.14, woodMat('#5c4030', 1, 2, 2), 0, spec.h / 2 + 0.01, 0.012, 10);
  rod.rotation.z = Math.PI / 2;
  const knobL = addCyl(g, 0.024, 0.024, 0.028, toon('#2a2118'), -(spec.w + 0.16) / 2, spec.h / 2 + 0.01, 0.012, 8);
  knobL.rotation.z = Math.PI / 2;
  const knobR = addCyl(g, 0.024, 0.024, 0.028, toon('#2a2118'), (spec.w + 0.16) / 2, spec.h / 2 + 0.01, 0.012, 8);
  knobR.rotation.z = Math.PI / 2;
  const roller = addCyl(g, 0.014, 0.014, spec.w * 0.72, woodMat('#6a4a30', 1, 2, 3), 0, -spec.h / 2 - 0.012, 0.01, 10);
  roller.rotation.z = Math.PI / 2;
  addCyl(g, 0.004, 0.004, 0.16, toon('#2a241c'), 0, spec.h / 2 + 0.1, 0, 6);
  g.position.set(spec.x, spec.y, spec.z);
  g.rotation.y = spec.rotY || 0;
  parent.add(g);
}

function woodSeat(parent, inst) {
  const g = new THREE.Group();
  g.name = inst.id;
  const w = 0.42;
  const d = 0.48;
  const seatH = 0.44;
  const leg = 0.036;
  const wood = woodMat('#c6a36e', 1.2, 2, (inst.position[0] + 3) * 4);
  const dark = woodMat('#5c3e2a', 1, 2, 2);
  const insetX = w / 2 - 0.05;
  const insetZ = d / 2 - 0.05;
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      addBox(g, leg, seatH - 0.02, leg, dark, sx * insetX, (seatH - 0.02) / 2, sz * insetZ);
    }
  }
  addBox(g, 0.018, 0.018, d - 0.16, dark, -insetX, 0.16, 0);
  addBox(g, 0.018, 0.018, d - 0.16, dark, insetX, 0.16, 0);
  addBox(g, w - 0.12, 0.018, 0.018, dark, 0, 0.16, insetZ);
  addBox(g, w, 0.038, d, wood, 0, seatH - 0.02, 0);
  addBox(g, w - 0.03, 0.01, 0.018, woodMat('#d8bc90', 2, 1, 1), 0, seatH - 0.004, d / 2 - 0.012);
  const postH = 0.34;
  addBox(g, 0.03, postH, 0.03, dark, -insetX, seatH + postH / 2 - 0.02, -insetZ);
  addBox(g, 0.03, postH, 0.03, dark, insetX, seatH + postH / 2 - 0.02, -insetZ);
  addBox(g, w - 0.08, 0.09, 0.018, wood, 0, seatH + 0.22, -insetZ);
  const shade = new THREE.Mesh(
    new THREE.CircleGeometry(0.2, 18),
    new THREE.MeshBasicMaterial({ color: 0x1c140e, transparent: true, opacity: 0.16, depthWrite: false }),
  );
  shade.rotation.x = -Math.PI / 2;
  shade.position.y = 0.01;
  shade.userData.noShade = true;
  shade.castShadow = false;
  g.add(shade);
  g.position.set(inst.position[0], inst.position[1], inst.position[2]);
  g.rotation.y = inst.rotationY || 0;
  parent.add(g);
}

function deskLamp(parent, x, y, z) {
  const g = new THREE.Group();
  g.name = 'demo_lamp';
  const wood = woodMat('#6a4630', 1, 1, 3);
  addCyl(g, 0.052, 0.058, 0.014, wood, 0, 0.007, 0, 16);
  addCyl(g, 0.016, 0.026, 0.028, toon('#f0e6d2'), 0, 0.026, 0, 12);
  addCyl(g, 0.007, 0.007, 0.14, wood, 0, 0.11, 0, 8);
  const shade = addCyl(
    g, 0.062, 0.048, 0.08,
    toon('#f4e6cc', { emissive: '#ffd9a8', emissiveIntensity: 0.45 }),
    0, 0.2, 0, 8,
  );
  shade.userData.castShadow = false;
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2;
    addBox(g, 0.004, 0.08, 0.004, toon('#c4a06a'), Math.cos(a) * 0.052, 0.2, Math.sin(a) * 0.052);
  }
  g.position.set(x, y, z);
  parent.add(g);
}

function copyStand(parent, x, y, z) {
  const g = new THREE.Group();
  g.name = 'model_stand';
  const wood = woodMat('#6d4a32', 1, 2, 6);
  const dark = woodMat('#3e2a1c', 1, 2, 7);
  addBox(g, 0.46, 0.028, 0.3, dark, 0, 0.016, 0);
  addBox(g, 0.036, 0.02, 0.32, wood, -0.16, 0.036, 0.01);
  addBox(g, 0.036, 0.02, 0.32, wood, 0.16, 0.036, 0.01);
  addBox(g, 0.026, 0.48, 0.026, wood, -0.15, 0.28, -0.04);
  addBox(g, 0.026, 0.48, 0.026, wood, 0.15, 0.28, -0.04);
  addBox(g, 0.32, 0.022, 0.022, wood, 0, 0.5, -0.04);
  const lectern = new THREE.Group();
  lectern.position.set(0, 0.32, 0.02);
  lectern.rotation.x = -1.02;
  addBox(lectern, 0.34, 0.4, 0.014, wood, 0, 0, 0);
  addBox(lectern, 0.34, 0.018, 0.028, dark, 0, -0.19, 0.012);
  const page = toon(PAPER);
  page.map = glyphCard('yong');
  const sheet = new THREE.Mesh(new THREE.PlaneGeometry(0.28, 0.32), page);
  sheet.position.set(0, 0.01, 0.01);
  quiet(sheet);
  lectern.add(sheet);
  addBox(lectern, 0.3, 0.012, 0.008, toon('#6e3030'), 0, -0.16, 0.012);
  addBox(lectern, 0.012, 0.34, 0.016, toon('#6e3030'), -0.15, 0.01, 0.004);
  addBox(lectern, 0.012, 0.34, 0.016, toon('#6e3030'), 0.15, 0.01, 0.004);
  addBox(lectern, 0.014, 0.34, 0.02, toon('#4a2424'), 0, 0.01, 0);
  g.add(lectern);
  g.position.set(x, y, z);
  parent.add(g);
}

function lantern(parent, x, y, z) {
  const g = new THREE.Group();
  addCyl(g, 0.006, 0.006, 0.34, toon('#241c16'), 0, 0.28, 0, 6);
  addCyl(g, 0.13, 0.15, 0.03, woodMat(FRAME, 1, 1, 1), 0, 0, 0, 12);
  const paper = addCyl(
    g, 0.1, 0.12, 0.28,
    toon('#f3d7a8', { emissive: '#ffb15c', emissiveIntensity: 0.85 }),
    0, 0.16, 0, 16,
  );
  paper.userData.castShadow = false;
  addCyl(g, 0.012, 0.012, 0.26, toon('#8a6238'), 0, 0.16, 0, 6);
  addCyl(g, 0.12, 0.1, 0.028, woodMat(FRAME, 1, 1, 2), 0, 0.32, 0, 12);
  addCyl(g, 0.004, 0.01, 0.08, toon(CINNABAR), 0, -0.05, 0, 6);
  g.position.set(x, y, z);
  parent.add(g);
}

function column(parent, x, z, H) {
  addCyl(parent, 0.11, 0.13, 0.08, woodMat('#3e2a1c', 1, 1, 1), x, 0.04, z, 12);
  addCyl(parent, 0.085, 0.1, H - 0.16, woodMat('#6b4630', 1, 3, 2), x, H / 2 - 0.02, z, 14);
  addCyl(parent, 0.13, 0.1, 0.07, woodMat('#4a3224', 1, 1, 3), x, H - 0.08, z, 12);
}

function bamboo(parent, x, y, z) {
  const stem = toon('#4d5a32');
  const leaf = toon('#3f7a45');
  for (let i = 0; i < 5; i++) {
    const ox = (i - 2) * 0.035;
    const oz = ((i % 2) - 0.5) * 0.04;
    const h = 0.85 + (i % 3) * 0.12;
    addCyl(parent, 0.01, 0.014, h, stem, x + ox, y + h / 2, z + oz, 6);
    addCyl(parent, 0.016, 0.016, 0.012, toon('#6d7a45'), x + ox, y + h * 0.45, z + oz, 6);
    addCyl(parent, 0.016, 0.016, 0.012, toon('#6d7a45'), x + ox, y + h * 0.72, z + oz, 6);
  }
  addSphere(parent, 0.14, leaf, x + 0.06, y + 0.95, z, 1.3, 0.4, 0.7);
  addSphere(parent, 0.1, toon('#2f5a34'), x - 0.05, y + 1.05, z + 0.03, 1.1, 0.35, 0.55);
}

function shrub(parent, x, y, z) {
  addCyl(parent, 0.012, 0.016, 0.18, toon('#4a5a32'), x, y + 0.1, z, 6);
  addSphere(parent, 0.16, toon('#3e6a44'), x, y + 0.28, z, 1.1, 0.7, 1);
  addSphere(parent, 0.1, toon('#2f5a34'), x + 0.08, y + 0.36, z - 0.04, 1, 0.75, 0.9);
}

function fillCase(parent, inst, mode) {
  const g = new THREE.Group();
  g.position.set(inst.position[0], inst.position[1], inst.position[2]);
  g.rotation.y = inst.rotationY || 0;
  const shelves = [0.52, 0.98, 1.45];
  if (mode === 'paper') {
    shelves.forEach((y, si) => {
      const stackH = si === 2 ? 0.06 : 0.1;
      addBox(g, 0.42, stackH, 0.22, toon(si === 1 ? '#efe6d4' : '#f7f1e4'), -0.08, y + stackH / 2, -0.02);
      addBox(g, 0.28, 0.008, 0.18, toon('#e7dcc8'), 0.16, y + 0.01, -0.04);
      if (si < 2) {
        for (let i = 0; i < 4; i++) {
          const hex = ['#243044', '#6e3030', '#6b4a30', '#d9cbb6'][i];
          addBox(g, 0.03, 0.22, 0.16, toon(hex), -0.22 + i * 0.05, y + 0.12, 0.02);
        }
      }
    });
  } else {
    brushPot(g, -0.16, shelves[0], -0.02);
    brushPot(g, 0.05, shelves[0], 0.02);
    brushPot(g, 0.22, shelves[0], -0.04);
    for (let i = 0; i < 3; i++) {
      const roll = addCyl(g, 0.03, 0.03, 0.22, toon(i === 1 ? '#243044' : '#6b442c'), -0.18 + i * 0.16, shelves[1] + 0.03, 0, 10);
      roll.rotation.z = Math.PI / 2;
    }
    addBox(g, 0.36, 0.045, 0.2, toon('#f3ead8'), 0, shelves[2] + 0.03, -0.02);
    addBox(g, 0.22, 0.02, 0.16, toon('#efe2cc'), 0.06, shelves[2] + 0.06, 0);
  }
  parent.add(g);
}

function cabinet(parent, spec) {
  const { x, z, w, d, h } = spec;
  const g = new THREE.Group();
  addBox(g, w, 0.08, d, woodMat('#3e2a1c', 1, 2, 1), 0, 0.04, 0);
  addBox(g, w - 0.03, h - 0.16, d - 0.04, woodMat('#7a5436', 1, 2, 2), 0, 0.08 + (h - 0.16) / 2, 0);
  addBox(g, w + 0.02, 0.035, d + 0.02, woodMat('#c4a06a', 1, 2, 3), 0, h - 0.02, 0);
  const drawers = 4;
  for (let i = 0; i < drawers; i++) {
    const zz = -d / 2 + (i + 0.5) * (d / drawers);
    addBox(g, 0.012, h * 0.62, d / drawers - 0.035, woodMat(i % 2 ? '#8d6844' : '#a07848', 1, 1, i), w / 2, h * 0.46, zz);
    addBox(g, 0.016, 0.012, 0.08, toon('#c8b48a'), w / 2 + 0.01, h * 0.46, zz);
  }
  g.position.set(x, 0, z);
  parent.add(g);
}

function paneledRun(g, { along, fixed, horizontal, y0, y1, wood, inset }) {
  const spans = [0.58, 0.92, 0.7, 1.05, 0.64, 0.88, 0.76, 1.02, 0.6];
  const stile = 0.055;
  let cursor = along[0];
  let i = 0;
  while (cursor < along[1] - 0.2) {
    const span = spans[i % spans.length];
    const x1 = Math.min(along[1], cursor + span);
    const mid = (cursor + x1) / 2;
    const len = x1 - cursor - stile;
    if (len > 0.18) {
      if (horizontal) addBox(g, len, y1 - y0, 0.018, inset, mid, (y0 + y1) / 2, fixed);
      else addBox(g, 0.018, y1 - y0, len, inset, fixed, (y0 + y1) / 2, mid);
    }
    if (horizontal) addBox(g, stile, y1 - y0 + 0.04, 0.028, wood, x1, (y0 + y1) / 2, fixed);
    else addBox(g, 0.028, y1 - y0 + 0.04, stile, wood, fixed, (y0 + y1) / 2, x1);
    cursor = x1;
    i += 1;
  }
}

function makeShell(layout) {
  const g = new THREE.Group();
  g.name = 'shell';
  const { width: W, depth: D, height: H } = layout.meta.room;
  const s = layout.shell;
  const arch = layout.architecture;
  const plaster = toon(s.wallColor);
  const ink = toon(INK);
  const backZ = -D / 2;
  const leftX = -W / 2;

  const slab = addBox(g, W, 0.06, D, toon('#b08968'), 0, -0.03, 0);
  slab.name = 'floor';
  const boardW = 0.28;
  const gapX = 0.002;
  const tones = ['#c7a674', '#c9a878', '#c5a472', '#c8a776', '#c6a570'];
  const boards = Math.floor((W - 0.2) / (boardW + gapX));
  for (let i = 0; i < boards; i++) {
    const x = -W / 2 + 0.12 + boardW / 2 + i * (boardW + gapX);
    addBox(g, boardW, 0.016, D - 0.2, floorMat(tones[i % tones.length], i), x, 0.01, 0);
  }

  const wallT = 0.12;
  addBox(g, W, H, wallT, plaster, 0, H / 2, backZ);
  const win = arch.window;
  const winH = win.head - win.sill;
  const winZ = (win.z0 + win.z1) / 2;
  const winD = win.z1 - win.z0;
  const backLen = win.z0 - (-D / 2);
  const frontLen = D / 2 - win.z1;
  const headH = H - win.head;
  addBox(g, wallT, H, backLen, plaster, leftX, H / 2, -D / 2 + backLen / 2);
  addBox(g, wallT, H, frontLen, plaster, leftX, H / 2, win.z1 + frontLen / 2);
  addBox(g, wallT, win.sill, winD, plaster, leftX, win.sill / 2, winZ);
  addBox(g, wallT, headH, winD, plaster, leftX, win.head + headH / 2, winZ);

  const glass = toon(s.windowTint, { transparent: true, opacity: 0.34, side: THREE.DoubleSide });
  addBox(g, 0.02, winH - 0.08, winD - 0.08, glass, leftX + 0.08, win.sill + winH / 2, winZ);
  const jamb = woodMat(FRAME, 1, 2, 1);
  addBox(g, 0.1, winH + 0.12, 0.07, jamb, leftX + 0.1, win.sill + winH / 2, win.z0);
  addBox(g, 0.1, winH + 0.12, 0.07, jamb, leftX + 0.1, win.sill + winH / 2, win.z1);
  addBox(g, 0.1, 0.07, winD, jamb, leftX + 0.1, win.head, winZ);
  addBox(g, 0.12, 0.06, winD, woodMat('#c4a06c', 2, 1, 2), leftX + 0.12, win.sill, winZ);
  const bays = [0.34, 0.48, 0.36, 0.52, 0.4];
  let bz = win.z0;
  for (let i = 0; i < bays.length; i++) {
    bz += bays[i];
    if (bz >= win.z1 - 0.08) break;
    addBox(g, 0.045, winH, 0.03, woodMat('#a67c48', 1, 2, i), leftX + 0.12, win.sill + winH / 2, bz);
  }
  addBox(g, 0.04, 0.028, winD, woodMat('#c4a06c', 2, 1, 3), leftX + 0.13, win.sill + winH * 0.42, winZ);
  addBox(g, 0.04, 0.028, winD, woodMat('#b8925c', 2, 1, 4), leftX + 0.13, win.sill + winH * 0.7, winZ);

  const wood = woodMat('#4a3022', 1, 2, 1);
  const inset = woodMat('#b08960', 1, 2, 2);
  paneledRun(g, {
    along: [-W / 2 + 0.2, W / 2 - 0.2],
    fixed: backZ + 0.09,
    horizontal: true,
    y0: 0.12,
    y1: 0.86,
    wood,
    inset,
  });
  paneledRun(g, {
    along: [-D / 2 + 0.15, D / 2 - 0.15],
    fixed: leftX + 0.09,
    horizontal: false,
    y0: 0.12,
    y1: 0.86,
    wood,
    inset,
  });
  addBox(g, W - 0.2, 0.07, 0.04, ink, 0, 0.9, backZ + 0.1);
  addBox(g, 0.04, 0.07, D - 0.2, ink, leftX + 0.1, 0.9, 0);
  addBox(g, W - 0.15, 0.035, 0.03, ink, 0, 2.58, backZ + 0.09);
  addBox(g, 0.03, 0.035, D - 0.2, ink, leftX + 0.09, 2.58, 0);
  addBox(g, W, 0.08, 0.05, ink, 0, 0.04, backZ + 0.08);
  addBox(g, 0.05, 0.08, D, ink, leftX + 0.04, 0.04, 0);

  const plat = arch.platform;
  const px = plat.minX + plat.w / 2;
  const pz = plat.minZ + plat.d / 2;
  addBox(g, plat.w, plat.h, plat.d, woodMat('#6a4630', 3, 2, 1), px, plat.h / 2, pz);
  addBox(g, plat.w + 0.04, 0.025, 0.05, ink, px, plat.h - 0.01, plat.minZ + plat.d);
  for (let i = 0; i < 8; i++) {
    const zz = plat.minZ + 0.12 + i * ((plat.d - 0.2) / 8);
    addBox(g, plat.w - 0.12, 0.006, 0.08, woodMat(i % 2 ? '#7a5340' : '#8a6248', 2, 1, i), px, plat.h + 0.004, zz);
  }

  const plate = woodMat('#5a3c28', 3, 1, 8);
  const stud = woodMat('#6d4a32', 1, 2, 9);
  addBox(g, W - 0.24, 0.1, 0.06, plate, 0, 2.66, backZ + 0.1);
  addBox(g, 0.06, 0.1, D - 0.3, plate, leftX + 0.1, 2.66, 0);
  const backPosts = [-4.55, -3.35, -2.45, 1.15, 2.55, 3.85, 4.55];
  backPosts.forEach((x, i) => {
    addBox(g, 0.055, 1.68, 0.04, stud, x, 1.78, backZ + 0.1);
    if (i % 2 === 0) addBox(g, 0.07, 0.035, 0.045, plate, x, 2.48, backZ + 0.1);
  });
  [-3.35, -2.35, 2.55, 3.55].forEach((z) => {
    addBox(g, 0.04, 1.68, 0.05, stud, leftX + 0.1, 1.78, z);
  });
  addBox(g, 0.05, 0.08, winD + 0.08, plate, leftX + 0.11, 2.52, winZ);

  const ceil = toon(s.ceilingColor);
  addBox(g, W * 0.72, 0.05, D * 0.62, ceil, -0.55, H - 0.04, -1.15);
  const beamZs = [-3.55, -1.85, 0.15, 2.05];
  beamZs.forEach((z, i) => {
    const reach = i === 0 ? 4.85 : 3.7;
    const len = reach - leftX;
    addBox(g, len, 0.16, 0.11, woodMat('#4e3424', 3, 1, i), leftX + len / 2, H - 0.22, z);
  });
  [-2.15, 0.35, 2.55].forEach((x, i) => {
    addBox(g, 0.09, 0.08, 5.6, woodMat('#6a4630', 1, 3, i + 2), x, H - 0.36, -0.7);
  });

  arch.columns.forEach(([x, z]) => column(g, x, z, H));
  return g;
}

function makeProcedural(layout) {
  const g = new THREE.Group();
  g.name = 'procedural';
  const arch = layout.architecture;
  for (const desk of arch.desks) writingDesk(g, desk, arch.kit);

  for (const inst of layout.instances) {
    if (inst.kind === 'wood_seat') woodSeat(g, inst);
  }

  const teacher = arch.teacher;
  const top = teacher.top;
  const [tx, , tz] = teacher.table;
  const surface = top + 0.014;
  const felt = addBox(g, 1.35, 0.01, 0.62, feltMat(), tx + 0.02, surface - 0.006, tz);
  quiet(felt);
  addBox(g, 1.39, 0.008, 0.66, toon(FELT_EDGE), tx + 0.02, surface - 0.012, tz);
  const [ppx, ppz, pw, ph] = teacher.paper;
  const sheet = new THREE.Group();
  sheet.position.set(tx + ppx, 0, tz + ppz);
  flatPaper(sheet, pw, ph, surface + 0.004, 'yong');
  g.add(sheet);
  inkstone(g, tx + teacher.inkstone[0], surface, tz + teacher.inkstone[1], 1.15);
  paperweight(g, tx + teacher.weight[0], surface + 0.002, tz + teacher.weight[1]);
  brush(g, tx + teacher.brush[0], surface, tz + teacher.brush[1], 0.18);
  brush(g, tx + teacher.brush[0] + 0.02, surface, tz + teacher.brush[1] - 0.1, 0.12);
  brushRest(g, tx + 0.36, surface, tz + 0.28);
  waterDish(g, tx + 0.52, surface, tz - 0.18);
  addCyl(g, 0.022, 0.024, 0.016, toon(CINNABAR), tx - 0.58, surface + 0.008, tz - 0.06, 12);
  deskLamp(g, tx + teacher.lamp[0], surface, tz + teacher.lamp[1]);
  const stand = arch.modelBook;
  copyStand(g, stand.position[0], stand.position[1], stand.position[2]);

  for (const spec of arch.scrolls) hangingScroll(g, spec);
  for (const [x, y, z] of arch.lanterns) lantern(g, x, y, z);
  cabinet(g, arch.cabinet);

  const byId = Object.fromEntries(layout.instances.map((i) => [i.id, i]));
  fillCase(g, byId.paper_case, 'paper');
  fillCase(g, byId.brush_case, 'brush');

  const potH = layout.assets.flowerpot.targetHeight;
  bamboo(g, byId.pot_window.position[0], potH * 0.85, byId.pot_window.position[2]);
  shrub(g, byId.pot_entry.position[0], potH * 1.05, byId.pot_entry.position[2]);

  const shelf = byId.wall_shelf.position;
  brushPot(g, shelf[0] - 0.16, 1.57, shelf[2] + 0.08);
  brushPot(g, shelf[0] + 0.16, 1.57, shelf[2] + 0.07);
  const supply = byId.supply_table.position;
  addBox(g, 0.32, 0.045, 0.24, toon('#f4ead8'), supply[0] + 0.08, 0.74 + 0.025, supply[2] + 0.06);
  addBox(g, 0.28, 0.012, 0.2, toon('#efe2cc'), supply[0] + 0.1, 0.74 + 0.054, supply[2] + 0.04);
  brushPot(g, supply[0] - 0.16, 0.74, supply[2] - 0.08);

  return g;
}

function paintMesh(obj, hex) {
  const src = Array.isArray(obj.material) ? obj.material[0] : obj.material;
  const m = src && src.clone ? src.clone() : new THREE.MeshStandardMaterial();
  if (m.color) m.color.set(hex);
  obj.material = m;
}

function onBeforeShade(kind, root) {
  if (kind === 'display_bookcase') {
    root.traverse((obj) => {
      if (!obj.isMesh) return;
      const n = obj.name || '';
      const hex = /back/.test(n) ? '#4a3122' : /shelf|slab/.test(n) ? '#b08450' : '#6a452c';
      paintMesh(obj, hex);
    });
  }
}

function onReady(ctx) {
  ctx.scene.updateMatrixWorld(true);
  const issues = [];
  for (const inst of ctx.layout.instances) {
    const host = inst.procedural ? ctx.procedural : ctx.props;
    if (!host.getObjectByName(inst.id)) issues.push(`missing ${inst.id}`);
  }
  for (const desk of ctx.layout.architecture.desks) {
    if (!ctx.procedural.getObjectByName(desk.id)) issues.push(`missing ${desk.id}`);
  }
  const q = new THREE.Quaternion();
  const forward = new THREE.Vector3();
  for (const inst of ctx.layout.instances) {
    if (inst.kind !== 'wood_seat') continue;
    const obj = ctx.procedural.getObjectByName(inst.id);
    if (!obj) continue;
    forward.set(0, 0, 1).applyQuaternion(obj.getWorldQuaternion(q));
    const want = inst.role === 'teacher' ? 1 : -1;
    const dot = forward.z * want;
    if (dot < 0.96) issues.push(`${inst.id} faces ${forward.z.toFixed(3)}`);
  }
  let toonCount = 0;
  let basicCount = 0;
  let otherCount = 0;
  ctx.scene.traverse((obj) => {
    if (!obj.isMesh || obj.userData.noShade) return;
    const m = Array.isArray(obj.material) ? obj.material[0] : obj.material;
    if (!m) return;
    if (m.isMeshToonMaterial) toonCount += 1;
    else if (m.isMeshBasicMaterial) basicCount += 1;
    else otherCount += 1;
  });
  if (ctx.shadingMode === 'toon' && toonCount < 30) issues.push(`toon count ${toonCount}`);
  if (ctx.shadingMode === 'unlit' && (toonCount > 0 || otherCount > 0)) {
    issues.push(`unlit leaked toon=${toonCount} other=${otherCount}`);
  }
  window.__audit = { issues, toonCount, basicCount, otherCount, shadingMode: ctx.shadingMode };
}

const glyphFace = new FontFace('Noto Serif SC', 'url(./fonts/NotoSerifSC-Regular-subset.woff2)');
glyphFace.load().then(async (face) => {
  document.fonts.add(face);
  await document.fonts.load('120px "Noto Serif SC"', '\u6c38\u4eba\u5929');
  if (!document.fonts.check('120px "Noto Serif SC"', '\u6c38')) {
    throw new Error('Noto Serif SC missing U+6C38');
  }
  boot({
    makeShell,
    makeProcedural,
    onBeforeShade,
    onReady,
    readyText: 'ready — calligraphy classroom · drag orbit · U unlit · T toon',
  });
}).catch((err) => {
  window.__errors = window.__errors || [];
  window.__errors.push(String(err && err.stack || err));
  const statusEl = document.getElementById('status');
  if (statusEl) statusEl.textContent = 'font failed';
});
