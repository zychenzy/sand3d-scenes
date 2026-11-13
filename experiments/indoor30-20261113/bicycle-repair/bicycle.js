import * as THREE from 'three';
import { boot, toon, addBox, addCyl, addMesh, rod, addContact } from './scene_lib.js';

const labelCache = new Map();

function labelMat(text, bg, fg, cw = 256, ch = 96, font = 42) {
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
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  tex.needsUpdate = true;
  const mat = toon('#ffffff', { map: tex });
  labelCache.set(key, mat);
  return mat;
}

function concreteTexture() {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = '#c8b79a';
  g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 900; i++) {
    const v = 150 + ((i * 47) % 70);
    g.fillStyle = `rgba(${v},${v - 18},${v - 36},0.18)`;
    g.fillRect((i * 13) % 256, (i * 29) % 256, 3, 2);
  }
  g.strokeStyle = '#a89074';
  g.lineWidth = 3;
  for (let y = 0; y <= 256; y += 64) {
    g.beginPath();
    g.moveTo(0, y);
    g.lineTo(256, y);
    g.stroke();
  }
  for (let x = 0; x <= 256; x += 64) {
    g.beginPath();
    g.moveTo(x, 0);
    g.lineTo(x, 256);
    g.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = THREE.RepeatWrapping;
  t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(6, 5);
  t.magFilter = THREE.NearestFilter;
  t.minFilter = THREE.NearestFilter;
  return t;
}

function pegTexture() {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = '#a33b32';
  g.fillRect(0, 0, 256, 256);
  g.fillStyle = '#6e241e';
  for (let y = 10; y < 256; y += 16) {
    for (let x = 10; x < 256; x += 16) {
      g.beginPath();
      g.arc(x, y, 2.2, 0, Math.PI * 2);
      g.fill();
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.magFilter = THREE.NearestFilter;
  t.minFilter = THREE.NearestFilter;
  return t;
}

function woodTexture() {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 32;
  const g = c.getContext('2d');
  for (let x = 0; x < 128; x += 4) {
    const n = (x / 4) % 5;
    g.fillStyle = ['#8a5a32', '#a06b3e', '#6e4528', '#b07a48', '#7a4e2c'][n];
    g.fillRect(x, 0, 4, 32);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = THREE.RepeatWrapping;
  t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(4, 1);
  t.magFilter = THREE.NearestFilter;
  t.minFilter = THREE.NearestFilter;
  return t;
}

function rubberTexture() {
  const c = document.createElement('canvas');
  c.width = 64;
  c.height = 64;
  const g = c.getContext('2d');
  g.fillStyle = '#2a2e32';
  g.fillRect(0, 0, 64, 64);
  g.strokeStyle = '#3c4248';
  g.lineWidth = 2;
  for (let i = -64; i < 128; i += 10) {
    g.beginPath();
    g.moveTo(i, 0);
    g.lineTo(i + 64, 64);
    g.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = THREE.RepeatWrapping;
  t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(8, 6);
  t.magFilter = THREE.NearestFilter;
  t.minFilter = THREE.NearestFilter;
  return t;
}

function dress(mesh) {
  mesh.castShadow = false;
  mesh.userData.noCast = true;
  mesh.receiveShadow = true;
  return mesh;
}

function makeShell(layout) {
  const g = new THREE.Group();
  g.name = 'shell';
  const { width: W, depth: D, height: H } = layout.meta.room;
  const s = layout.shell;
  const plaster = toon(s.wallColor);
  const floorMat = toon('#ffffff', { map: concreteTexture() });
  const floor = new THREE.Mesh(new THREE.BoxGeometry(W, 0.08, D), floorMat);
  floor.position.y = -0.04;
  floor.receiveShadow = true;
  floor.userData.noCast = true;
  g.add(floor);

  const back = addBox(g, W, H, 0.12, plaster, 0, H / 2, -D / 2);
  back.castShadow = false;
  back.receiveShadow = false;
  back.userData.noCast = true;
  back.userData.noReceive = true;
  const left = addBox(g, 0.12, H, D, plaster, -W / 2, H / 2, 0);
  left.castShadow = false;
  left.receiveShadow = false;
  left.userData.noCast = true;
  left.userData.noReceive = true;

  const wood = toon('#5c3d28');
  addBox(g, W - 0.2, 0.08, 0.06, wood, 0, 0.05, -D / 2 + 0.1);
  addBox(g, 0.06, 0.08, D - 0.2, wood, -W / 2 + 0.1, 0.05, 0);
  addBox(g, W - 0.24, 0.55, 0.04, toon('#efe4d2'), 0, 0.4, -D / 2 + 0.1);
  addBox(g, 0.04, 0.55, D - 0.24, toon('#efe4d2'), -W / 2 + 0.1, 0.4, 0);
  addBox(g, W - 0.2, 0.06, 0.05, wood, 0, 0.7, -D / 2 + 0.09);
  addBox(g, 0.05, 0.06, D - 0.2, wood, -W / 2 + 0.09, 0.7, 0);

  const joist = toon('#6b4a32');
  for (let i = 0; i < 6; i++) {
    const z = -D / 2 + 0.7 + i * 0.85;
    const beam = addBox(g, W - 0.5, 0.08, 0.1, joist, -0.15, H - 0.08, z);
    beam.castShadow = false;
    beam.userData.noCast = true;
  }
  const soffit = addBox(g, W * 0.72, 0.06, 1.4, toon(s.ceilingColor), -0.4, H - 0.14, -1.6);
  soffit.castShadow = false;
  soffit.userData.noCast = true;

  const tubeMat = toon('#fff6df', { emissive: '#fff1c2', emissiveIntensity: 0.9 });
  for (const [x, z] of [[-1.6, -2.6], [2.4, 1.3]]) {
    const tube = addCyl(g, 0.045, 0.045, 1.35, tubeMat, x, H - 0.28, z, 12);
    tube.rotation.z = Math.PI / 2;
    tube.name = 'light_tube';
    const housing = addBox(g, 1.5, 0.06, 0.16, toon('#2c3136'), x, H - 0.22, z);
    housing.userData.noCast = true;
  }
  return g;
}

function floorZones(g, layout) {
  const mat = layout.anchors.mat;
  const runner = layout.anchors.runner;
  const rubber = toon('#ffffff', { map: rubberTexture() });
  const pad = addBox(
    g,
    mat.x1 - mat.x0,
    0.012,
    mat.z1 - mat.z0,
    rubber,
    (mat.x0 + mat.x1) / 2,
    0.008,
    (mat.z0 + mat.z1) / 2,
  );
  dress(pad);
  const yellow = toon('#e2b033');
  const mx = (mat.x0 + mat.x1) / 2;
  const mz = (mat.z0 + mat.z1) / 2;
  const mw = mat.x1 - mat.x0;
  const md = mat.z1 - mat.z0;
  for (const mesh of [
    addBox(g, mw, 0.016, 0.045, yellow, mx, 0.012, mat.z0 + 0.02),
    addBox(g, mw, 0.016, 0.045, yellow, mx, 0.012, mat.z1 - 0.02),
    addBox(g, 0.045, 0.016, md, yellow, mat.x0 + 0.02, 0.012, mz),
    addBox(g, 0.045, 0.016, md, yellow, mat.x1 - 0.02, 0.012, mz),
  ]) dress(mesh);

  const walk = toon('#e06a28');
  const rw = runner.x1 - runner.x0;
  const rd = runner.z1 - runner.z0;
  const cx = (runner.x0 + runner.x1) / 2;
  const cz = (runner.z0 + runner.z1) / 2;
  dress(addBox(g, rw, 0.016, rd, walk, cx, 0.01, cz));
  const stripe = toon('#f3e6cf');
  dress(addBox(g, 0.08, 0.018, rd - 0.3, stripe, cx, 0.016, cz));
  const edge = toon('#6a3d22');
  dress(addBox(g, 0.045, 0.022, rd, edge, runner.x0, 0.014, cz));
  dress(addBox(g, 0.045, 0.022, rd, edge, runner.x1, 0.014, cz));
}

function pegboard(g, layout) {
  const bench = layout.anchors.bench;
  const z = bench.z - bench.d / 2 - 0.04;
  const face = toon('#ffffff', { map: pegTexture() });
  const board = addBox(g, bench.w - 0.08, 1.22, 0.03, face, bench.x, 1.82, z);
  board.name = 'pegboard';
  addBox(g, bench.w, 0.06, 0.05, toon('#4a2c24'), bench.x, 1.18, z);
  addBox(g, bench.w, 0.06, 0.05, toon('#4a2c24'), bench.x, 2.46, z);
  const sign = addBox(g, 2.4, 0.28, 0.03, labelMat('BICYCLE REPAIR', '#1d3d34', '#f4efe4', 640, 128, 64), bench.x, 2.7, z + 0.02);
  sign.name = 'shop_sign';

  const steel = toon('#c5ccd2');
  const dark = toon('#2a2e32');
  const wood = toon('#8a5a32');
  const orange = toon('#e07a32');
  const y0 = 1.45;
  const x0 = bench.x - bench.w / 2 + 0.28;

  // Cone wrenches, hung in pairs.
  for (let i = 0; i < 4; i++) {
    const x = x0 + i * 0.16;
    rod(g, [x, 2.22, z], [x, 2.22, z + 0.05], 0.006, steel);
    addBox(g, 0.012, 0.22, 0.028, steel, x, 2.08, z + 0.04);
    addCyl(g, 0.016, 0.016, 0.01, dark, x, 1.98, z + 0.04, 8);
  }

  // Hex keys on a rail.
  rod(g, [x0 + 0.85, 2.18, z + 0.02], [x0 + 1.55, 2.18, z + 0.02], 0.008, dark);
  for (let i = 0; i < 6; i++) {
    const x = x0 + 0.92 + i * 0.1;
    rod(g, [x, 2.18, z + 0.03], [x, 1.96 - i * 0.012, z + 0.03], 0.005 + i * 0.001, steel);
    rod(g, [x, 1.96 - i * 0.012, z + 0.03], [x + 0.045, 1.96 - i * 0.012, z + 0.03], 0.005, steel);
  }

  // Tire levers.
  for (let i = 0; i < 3; i++) {
    const x = x0 + 1.75 + i * 0.12;
    const lever = addMesh(g, new THREE.TorusGeometry(0.07, 0.008, 6, 10, Math.PI * 0.7), orange, x, 2.05, z + 0.04);
    lever.rotation.y = Math.PI / 2;
    lever.rotation.z = -0.4;
    addBox(g, 0.018, 0.16, 0.012, orange, x, 1.9, z + 0.04);
  }

  // Cable cutters.
  rod(g, [x0 + 2.25, 2.15, z + 0.02], [x0 + 2.25, 1.92, z + 0.05], 0.008, dark);
  rod(g, [x0 + 2.25, 2.15, z + 0.02], [x0 + 2.4, 1.9, z + 0.05], 0.008, wood);
  rod(g, [x0 + 2.25, 2.15, z + 0.02], [x0 + 2.1, 1.9, z + 0.05], 0.008, wood);
  addCyl(g, 0.012, 0.012, 0.02, steel, x0 + 2.25, 2.15, z + 0.04, 8).rotation.x = Math.PI / 2;

  // Spoke wrench and pedal wrench.
  addBox(g, 0.09, 0.02, 0.012, steel, x0 + 0.35, 1.62, z + 0.04);
  addBox(g, 0.16, 0.018, 0.01, orange, x0 + 0.7, 1.58, z + 0.04);
  addCyl(g, 0.014, 0.014, 0.012, dark, x0 + 0.78, 1.58, z + 0.045, 8);

  // Hanging inner tubes.
  for (let i = 0; i < 3; i++) {
    const x = x0 + 1.15 + i * 0.22;
    const tube = addMesh(g, new THREE.TorusGeometry(0.07, 0.012, 8, 16), toon('#1a1c1e'), x, 1.62, z + 0.05);
    tube.rotation.y = Math.PI / 2;
  }
}

function workbench(g, layout) {
  const b = layout.anchors.bench;
  const top = toon('#ffffff', { map: woodTexture() });
  addBox(g, b.w, 0.06, b.d, top, b.x, b.h - 0.03, b.z);
  const apron = toon('#5c3a24');
  addBox(g, b.w, 0.14, 0.04, apron, b.x, b.h - 0.13, b.z + b.d / 2 - 0.02);
  // Legs and a lower shelf.
  const leg = toon('#3e2a1c');
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      addBox(g, 0.08, b.h - 0.08, 0.08, leg, b.x + sx * (b.w / 2 - 0.08), (b.h - 0.08) / 2, b.z + sz * (b.d / 2 - 0.08));
    }
  }
  addBox(g, b.w - 0.2, 0.04, b.d - 0.16, toon('#6e4a30'), b.x, 0.22, b.z);
  // Three drawers.
  for (let i = 0; i < 3; i++) {
    const x = b.x - 0.7 + i * 0.55;
    addBox(g, 0.46, 0.12, 0.04, toon(i === 1 ? '#7a5234' : '#6a452c'), x, b.h - 0.28, b.z + b.d / 2);
    addCyl(g, 0.012, 0.012, 0.08, toon('#c9ccd0'), x, b.h - 0.28, b.z + b.d / 2 + 0.03, 8).rotation.x = Math.PI / 2;
  }
  // Vise at the right end.
  const vx = b.x + b.w / 2 - 0.18;
  const vz = b.z + 0.05;
  addBox(g, 0.16, 0.08, 0.1, toon('#4e565c'), vx, b.h + 0.04, vz);
  addBox(g, 0.04, 0.1, 0.08, toon('#3a4146'), vx - 0.06, b.h + 0.1, vz);
  addBox(g, 0.04, 0.1, 0.08, toon('#3a4146'), vx + 0.06, b.h + 0.1, vz);
  rod(g, [vx + 0.08, b.h + 0.1, vz], [vx + 0.22, b.h + 0.1, vz + 0.12], 0.012, toon('#c5ccd2'));
  // Parts tray and a rag.
  addBox(g, 0.28, 0.025, 0.18, toon('#d7d2c6'), b.x - 0.85, b.h + 0.02, b.z - 0.05);
  addBox(g, 0.22, 0.008, 0.14, toon('#3d6f62'), b.x - 0.2, b.h + 0.01, b.z + 0.08);
  addContact(g, b.x, b.z, b.w * 0.7, b.d * 0.7, 0.22);
}

function repairStand(g, layout) {
  const s = layout.anchors.stand;
  const c = layout.anchors.clamp;
  const steel = toon('#5c6770');
  const orange = toon('#e07a32');
  const dark = toon('#2c3136');
  const feet = [
    [s.x - 0.28, s.z + 0.08],
    [s.x + 0.28, s.z + 0.08],
    [s.x, s.z + 0.34],
  ];
  for (const [x, z] of feet) {
    rod(g, [s.x, 0.08, s.z], [x, 0.02, z], 0.02, steel, 10);
    addCyl(g, 0.035, 0.04, 0.02, dark, x, 0.02, z, 10);
  }
  const rise = 1.32;
  addCyl(g, 0.035, 0.04, rise - 0.04, steel, s.x, rise / 2, s.z, 12);
  rod(g, [s.x, rise, s.z], [c.x, rise, c.z], 0.016, steel, 10);
  rod(g, [c.x, rise, c.z], [c.x, c.y + 0.02, c.z], 0.016, steel, 8);
  addCyl(g, 0.028, 0.028, 0.05, orange, c.x, c.y, c.z + 0.055, 10);
  addBox(g, 0.05, 0.1, 0.028, orange, c.x, c.y, c.z + 0.034);
  addBox(g, 0.05, 0.1, 0.028, orange, c.x, c.y, c.z - 0.034);
  addCyl(g, 0.01, 0.01, 0.11, dark, c.x, c.y, c.z, 8).rotation.x = Math.PI / 2;
  addContact(g, s.x, s.z, 0.62, 0.62, 0.16);
}

function truingStand(g, layout) {
  const t = layout.anchors.truing;
  const steel = toon('#4a5560');
  const wood = toon('#6a4630');
  addBox(g, 0.46, 0.04, 0.28, wood, t.x, 0.04, t.z);
  addCyl(g, 0.018, 0.02, 1.2, steel, t.x - 0.16, 0.64, t.z, 10);
  addCyl(g, 0.018, 0.02, 1.2, steel, t.x + 0.16, 0.64, t.z, 10);
  rod(g, [t.x - 0.16, 1.22, t.z], [t.x + 0.16, 1.22, t.z], 0.012, steel);
  rod(g, [t.x - 0.16, 0.9, t.z], [t.x - 0.02, 1.18, t.z], 0.008, toon('#c5ccd2'));
  rod(g, [t.x + 0.16, 0.9, t.z], [t.x + 0.02, 1.18, t.z], 0.008, toon('#c5ccd2'));
  addBox(g, 0.14, 0.02, 0.06, toon('#e07a32'), t.x, 1.21, t.z);
  addContact(g, t.x, t.z, 0.5, 0.36, 0.22);
}

function tireRack(g, layout) {
  const r = layout.anchors.rack;
  const wood = toon('#6d4a32');
  const dark = toon('#3e2a1c');
  const x = r.x;
  addBox(g, 0.08, 0.16, r.z1 - r.z0 + 0.2, dark, x - 0.12, 0.08, (r.z0 + r.z1) / 2);
  addBox(g, 0.08, 0.16, r.z1 - r.z0 + 0.2, dark, x + 0.12, 0.08, (r.z0 + r.z1) / 2);
  // Uprights and a top rail so the row reads as a rack, not loose wheels.
  for (const z of [r.z0 - 0.12, r.z1 + 0.12]) {
    addBox(g, 0.06, 1.15, 0.06, wood, x, 0.7, z);
  }
  addBox(g, 0.05, 0.05, r.z1 - r.z0 + 0.4, wood, x, 1.25, (r.z0 + r.z1) / 2);
  addContact(g, x, (r.z0 + r.z1) / 2, 0.4, r.z1 - r.z0 + 0.3, 0.2);
}

function partsBins(g, layout) {
  const b = layout.anchors.bins;
  const frame = toon('#3a4148');
  addBox(g, b.w, 0.05, b.d, frame, b.x, 0.08, b.z);
  addBox(g, 0.04, b.h, 0.04, frame, b.x - b.w / 2, b.h / 2, b.z);
  addBox(g, 0.04, b.h, 0.04, frame, b.x + b.w / 2, b.h / 2, b.z);
  const colors = ['#e0b02a', '#d26a3a', '#3d6f9a', '#3d6b4e', '#e07a32', '#d7d2c6', '#1f6f6a', '#c4512c'];
  const names = ['700x32', 'TUBE', 'CABLE', 'CHAIN', 'BB', 'SPOKE', 'PAD', 'SPD'];
  for (let row = 0; row < 2; row++) {
    for (let col = 0; col < 4; col++) {
      const i = row * 4 + col;
      const x = b.x - b.w / 2 + 0.24 + col * 0.42;
      const y = 0.38 + row * 0.62;
      const pulled = i === 5 ? 0.1 : 0;
      bin(g, x, y, b.z + pulled, colors[i], names[i]);
    }
  }
  addBox(g, b.w - 0.08, 0.22, 0.04, labelMat('PARTS', '#243028', '#f3ecdf', 512, 96, 54), b.x, b.h - 0.16, b.z + b.d / 2);
  addContact(g, b.x, b.z, b.w * 0.8, b.d, 0.22);
}

function bin(g, x, y, z, color, text) {
  const body = toon(color);
  const w = 0.34;
  const h = 0.18;
  const d = 0.28;
  const t = 0.014;
  addBox(g, w, t, d, body, x, y - h / 2, z);
  addBox(g, t, h, d, body, x - w / 2, y, z);
  addBox(g, t, h, d, body, x + w / 2, y, z);
  addBox(g, w - t * 2, h, t, body, x, y, z - d / 2);
  const tag = addBox(g, w - 0.04, h * 0.62, t, labelMat(text, '#f6f1e6', '#1b1e22', 256, 128, 54), x, y - h * 0.12, z + d / 2);
  tag.userData.noCast = true;
}

function serviceCounter(g, layout) {
  const c = layout.anchors.counter;
  const wood = toon('#5c3a24');
  const face = toon('#6d4a32');
  const top = toon('#2f6b5c');
  addBox(g, c.w, 0.08, c.d, top, c.x, c.h - 0.04, c.z);
  // Rounded front lip.
  const lip = addCyl(g, 0.035, 0.035, c.w, toon('#24584c'), c.x, c.h - 0.02, c.z + c.d / 2, 12);
  lip.rotation.z = Math.PI / 2;
  addBox(g, c.w - 0.08, c.h - 0.2, c.d - 0.08, face, c.x, (c.h - 0.2) / 2 + 0.04, c.z);
  // Toe kick.
  addBox(g, c.w - 0.16, 0.1, c.d - 0.16, toon('#2a2118'), c.x, 0.05, c.z + 0.02);
  // Drawers toward the customer (+Z).
  for (let i = 0; i < 3; i++) {
    const x = c.x - 0.7 + i * 0.7;
    addBox(g, 0.58, 0.18, 0.03, wood, x, 0.48, c.z + c.d / 2 - 0.02);
    addCyl(g, 0.014, 0.014, 0.12, toon('#d4d0c6'), x, 0.48, c.z + c.d / 2 + 0.02, 8).rotation.x = Math.PI / 2;
  }
  // Brass foot rail on the customer side.
  rod(g, [c.x - c.w / 2 + 0.08, 0.18, c.z + c.d / 2 + 0.06], [c.x + c.w / 2 - 0.08, 0.18, c.z + c.d / 2 + 0.06], 0.016, toon('#c6a15a'), 10);
  // Work-order pad.
  const pad = addBox(g, 0.28, 0.008, 0.2, labelMat('TUNE  42', '#f7f1e4', '#2a241c', 256, 160, 48), c.x - 0.55, c.h + 0.01, c.z + 0.05);
  pad.userData.noCast = true;
  addBox(g, 0.04, 0.015, 0.04, toon('#c4512c'), c.x - 0.42, c.h + 0.02, c.z - 0.02);
  addContact(g, c.x, c.z, c.w * 0.85, c.d * 0.8, 0.26);
}

function makeProcedural(layout) {
  const g = new THREE.Group();
  floorZones(g, layout);
  pegboard(g, layout);
  workbench(g, layout);
  repairStand(g, layout);
  truingStand(g, layout);
  tireRack(g, layout);
  partsBins(g, layout);
  serviceCounter(g, layout);
  for (const inst of layout.instances) {
    if (inst.kind === 'dining_chair' || inst.kind === 'bar_stool') {
      addContact(g, inst.position[0], inst.position[2], 0.36, 0.36, 0.14);
    }
  }
  return g;
}

boot({
  makeShell,
  makeProcedural,
  readyText: 'ready — bicycle repair · T toon · U unlit',
});
