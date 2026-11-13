import * as THREE from 'three';
import { boot, toon, addBox, addCyl, makeCutawayShell } from './scene_lib.js';

const labelCache = new Map();

function labelMat(text, bg, fg, cw = 128, ch = 48, font = 28) {
  const key = [text, bg, fg, cw, ch, font].join('|');
  if (labelCache.has(key)) return labelCache.get(key);
  const canvas = document.createElement('canvas');
  canvas.width = cw;
  canvas.height = ch;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, cw, ch);
  ctx.fillStyle = fg;
  ctx.font = `700 ${font}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, cw / 2, ch / 2 + font * 0.04);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  tex.needsUpdate = true;
  const mat = toon('#ffffff', { map: tex });
  labelCache.set(key, mat);
  return mat;
}

function plate(g, text, w, h, x, y, z, rotY, bg, fg, cw, ch, font) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), labelMat(text, bg, fg, cw, ch, font));
  m.position.set(x, y, z);
  m.rotation.y = rotY || 0;
  m.castShadow = false;
  m.userData.noShadow = true;
  g.add(m);
  return m;
}

function noCast(mesh) {
  mesh.castShadow = false;
  mesh.userData.noShadow = true;
  mesh.userData.receiveShadow = true;
  return mesh;
}

const keyGeoms = new Map();

function houseKeyShape(seed) {
  const s = new THREE.Shape();
  const bowR = 0.02;
  const bladeH = 0.009;
  const shoulder = 0.024;
  const tip = 0.128;
  const cuts = [0.15, 0.9, 0.4, 0.75, 0.3, 0.85].map((v, i) => Math.min(0.95, v + ((seed + i) % 3) * 0.06));
  s.moveTo(shoulder, bladeH);
  const n = cuts.length;
  const span = tip - shoulder - 0.012;
  for (let i = 0; i < n; i++) {
    const x0 = shoulder + (i * span) / n;
    const x1 = x0 + span / n * 0.55;
    const y = bladeH * (1 - cuts[i] * 0.72);
    s.lineTo(x0, bladeH);
    s.lineTo(x0 + 0.002, y);
    s.lineTo(x1, y);
    s.lineTo(x1 + 0.002, bladeH);
  }
  s.lineTo(tip - 0.01, bladeH);
  s.lineTo(tip, 0);
  s.lineTo(tip - 0.01, -bladeH);
  s.lineTo(shoulder, -bladeH);
  const steps = 8;
  for (let i = 0; i <= steps; i++) {
    const a = -Math.PI / 2 - (i / steps) * Math.PI;
    s.lineTo(Math.cos(a) * bowR, Math.sin(a) * bowR);
  }
  s.lineTo(shoulder, bladeH);
  const hole = new THREE.Path();
  hole.absarc(0, 0, bowR * 0.45, 0, Math.PI * 2, true);
  s.holes.push(hole);
  return s;
}

function bladeShape(seed) {
  const s = new THREE.Shape();
  const bh = 0.007;
  const tip = 0.055;
  s.moveTo(0, -bh);
  s.lineTo(tip - 0.008, -bh);
  s.lineTo(tip, 0);
  s.lineTo(tip - 0.008, bh);
  const n = 4;
  for (let i = n - 1; i >= 0; i--) {
    const depth = 0.3 + ((seed + i) % 3) * 0.22;
    const x1 = 0.008 + ((i + 1) * (tip - 0.016)) / n;
    const x0 = 0.008 + (i * (tip - 0.016)) / n;
    const y = bh * (1 - depth * 0.7);
    s.lineTo(x1, bh);
    s.lineTo(x1 - 0.002, y);
    s.lineTo(x0 + 0.003, y);
    s.lineTo(x0, bh);
  }
  s.lineTo(0, bh);
  s.closePath();
  return s;
}

function extruded(shape, depth) {
  const geo = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments: 10 });
  geo.translate(0, 0, -depth / 2);
  return geo;
}

function keyGeometry(seed) {
  const id = `h${seed % 8}`;
  if (!keyGeoms.has(id)) keyGeoms.set(id, extruded(houseKeyShape(seed % 8), 0.0032));
  return keyGeoms.get(id);
}

function bladeGeometry(seed) {
  const id = `b${seed % 4}`;
  if (!keyGeoms.has(id)) keyGeoms.set(id, extruded(bladeShape(seed % 4), 0.0026));
  return keyGeoms.get(id);
}

function addHouseKey(g, seed, mat, x, y, z, rotY, rotZ) {
  const m = new THREE.Mesh(keyGeometry(seed), mat);
  m.name = 'blank-key';
  m.position.set(x, y, z);
  m.rotation.y = rotY || 0;
  m.rotation.z = rotZ || 0;
  m.castShadow = true;
  m.receiveShadow = true;
  g.add(m);
  return m;
}

function addCarKey(g, seed, x, y, z, rotY) {
  const grp = new THREE.Group();
  grp.name = 'blank-key';
  grp.position.set(x, y, z);
  grp.rotation.y = rotY || 0;
  const head = addBox(grp, 0.022, 0.032, 0.008, toon('#2c3136'), 0, -0.014, 0);
  head.name = 'blank-key';
  const btn = addCyl(grp, 0.0032, 0.0032, 0.003, toon('#b94a3a'), 0.003, -0.006, 0.004, 8);
  btn.name = 'blank-key';
  const blade = new THREE.Mesh(bladeGeometry(seed), toon('#d5dbe2'));
  blade.name = 'blank-key';
  blade.rotation.z = -Math.PI / 2;
  blade.position.set(0, -0.038, 0);
  blade.castShadow = true;
  grp.add(blade);
  g.add(grp);
  return grp;
}

function makeShell(layout) {
  const g = makeCutawayShell(layout, { ceiling: false });
  const { width: W, depth: D, height: H } = layout.meta.room;
  const tileA = toon('#d4cbb8');
  const tileB = toon('#c4baa6');
  const tile = 0.46;
  const nx = Math.floor((W - 0.3) / tile);
  const nz = Math.floor((D - 0.3) / tile);
  for (let ix = 0; ix < nx; ix++) {
    for (let iz = 0; iz < nz; iz++) {
      const x = -W / 2 + 0.22 + ix * tile + tile / 2;
      const z = -D / 2 + 0.22 + iz * tile + tile / 2;
      noCast(addBox(g, tile - 0.012, 0.012, tile - 0.012, (ix + iz) % 2 ? tileB : tileA, x, 0.006, z));
    }
  }
  const rail = toon('#2f4a40');
  addBox(g, W - 0.2, 0.045, 0.03, rail, 0, 1.02, -D / 2 + 0.08);
  addBox(g, 0.03, 0.045, D - 0.2, rail, -W / 2 + 0.08, 1.02, 0);
  const base = toon('#6a5e50');
  addBox(g, W - 0.16, 0.08, 0.025, base, 0, 0.05, -D / 2 + 0.08);
  addBox(g, 0.025, 0.08, D - 0.16, base, -W / 2 + 0.08, 0.05, 0);

  const win = layout.anchors.window || { z0: 0.15, z1: 1.7, y0: 0.95, y1: 2.35 };
  const zx = (win.z0 + win.z1) / 2;
  const zy = (win.y0 + win.y1) / 2;
  const zw = win.z1 - win.z0;
  const zh = win.y1 - win.y0;
  const xw = -W / 2 + 0.1;
  addBox(g, 0.02, zh - 0.06, zw - 0.06, toon('#d5e4ee', { transparent: true, opacity: 0.35, side: THREE.DoubleSide }), xw, zy, zx);
  const frame = toon('#3c4650');
  addBox(g, 0.028, zh, 0.035, frame, xw + 0.012, zy, win.z0);
  addBox(g, 0.028, zh, 0.035, frame, xw + 0.012, zy, win.z1);
  addBox(g, 0.028, 0.035, zw, frame, xw + 0.012, win.y0, zx);
  addBox(g, 0.028, 0.035, zw, frame, xw + 0.012, win.y1, zx);
  addBox(g, 0.02, zh - 0.08, 0.022, frame, xw + 0.014, zy, zx);
  plate(g, 'KEYS', 0.42, 0.12, xw + 0.03, zy + 0.28, zx, Math.PI / 2, '#1e2a30', '#f4efe4', 256, 64, 46);

  const soffit = addBox(g, W * 0.72, 0.06, D * 0.42, toon('#f7f3ea'), -0.7, H - 0.08, -D * 0.22);
  soffit.castShadow = false;
  const tubeMat = toon('#fff6e4', { emissive: '#fff1c8', emissiveIntensity: 0.9 });
  const housing = toon('#d9d4c8');
  for (const z of [-2.15, -0.35]) {
    addBox(g, 1.35, 0.04, 0.16, housing, -0.4, H - 0.16, z);
    const tube = addBox(g, 1.2, 0.02, 0.05, tubeMat, -0.4, H - 0.2, z);
    tube.name = 'light_tube';
  }
  return g;
}

function pegwall(g, a, density, brass, nickel) {
  const board = addBox(g, a.w, a.h, 0.018, toon('#7a5340'), a.x, a.y + a.h / 2, a.z);
  board.name = 'pegwall';
  const frame = toon('#3a3028');
  addBox(g, a.w + 0.04, 0.035, 0.03, frame, a.x, a.y + a.h + 0.01, a.z);
  addBox(g, a.w + 0.04, 0.03, 0.03, frame, a.x, a.y - 0.01, a.z);
  addBox(g, 0.03, a.h, 0.03, frame, a.x - a.w / 2, a.y + a.h / 2, a.z);
  addBox(g, 0.03, a.h, 0.03, frame, a.x + a.w / 2, a.y + a.h / 2, a.z);
  plate(g, 'KEY BLANKS', 0.62, 0.1, a.x, a.y + a.h + 0.1, a.z + 0.02, 0, '#2a2420', '#f3eadc', 256, 64, 36);
  const codes = ['KW1', 'SC1', 'Y1', 'M1', 'DE6'];
  const rows = density.keyRows;
  const per = density.keysPerRow;
  const hook = toon('#c5ccd2');
  for (let r = 0; r < rows; r++) {
    const y = a.y + 0.18 + r * ((a.h - 0.28) / Math.max(rows - 1, 1));
    plate(g, codes[r % codes.length], 0.1, 0.04, a.x - a.w / 2 + 0.1, y - 0.02, a.z + 0.02, 0, '#f4efe6', '#2a2420', 128, 48, 28);
    for (let i = 0; i < per; i++) {
      const x = a.x - a.w / 2 + 0.28 + i * ((a.w - 0.42) / Math.max(per - 1, 1));
      const peg = addCyl(g, 0.0035, 0.0035, 0.028, hook, x, y, a.z + 0.02, 6);
      peg.rotation.x = Math.PI / 2;
      const yaw = ((i % 5) - 2) * 0.08;
      if (r === rows - 1 && i % 2 === 0) {
        addCarKey(g, i + r, x, y, a.z + 0.03, yaw);
      } else {
        const mat = (i + r) % 3 === 0 ? nickel : brass;
        addHouseKey(g, r * 3 + i, mat, x, y - 0.002, a.z + 0.03, yaw, -Math.PI / 2 + ((i % 3) - 1) * 0.05);
      }
    }
  }
}

function cutterVise(g, x, y, z, iron, steel, brass) {
  addBox(g, 0.028, 0.032, 0.02, iron, x, y + 0.016, z - 0.012);
  addBox(g, 0.028, 0.032, 0.016, steel, x, y + 0.016, z + 0.012);
  const screw = addCyl(g, 0.005, 0.005, 0.04, steel, x, y + 0.034, z, 8);
  screw.rotation.x = Math.PI / 2;
  addCyl(g, 0.009, 0.009, 0.006, brass, x, y + 0.034, z + 0.024, 8);
}

function keyCutter(g, a, brass, nickel) {
  const grp = new THREE.Group();
  grp.name = 'key-cutter';
  grp.position.set(a.x, a.top, a.z);
  const iron = toon('#7a848c');
  const ironDark = toon('#525b64');
  const steel = toon('#e2e7eb');
  const steelDark = toon('#9aa3ab');
  addBox(grp, 0.46, 0.016, 0.26, ironDark, 0, 0.008, 0);
  addBox(grp, 0.4, 0.032, 0.2, iron, 0, 0.032, 0);
  addBox(grp, 0.34, 0.01, 0.012, steel, -0.01, 0.052, -0.06);
  addBox(grp, 0.34, 0.01, 0.012, steel, -0.01, 0.052, 0.06);
  addBox(grp, 0.18, 0.016, 0.14, ironDark, -0.02, 0.064, 0);
  cutterVise(grp, -0.07, 0.072, -0.028, iron, steel, brass);
  cutterVise(grp, -0.07, 0.072, 0.042, iron, steel, brass);
  addHouseKey(grp, 2, brass, -0.09, 0.088, -0.028, 0, 0);
  addHouseKey(grp, 5, nickel, -0.09, 0.088, 0.042, 0, 0);
  addBox(grp, 0.08, 0.11, 0.08, iron, 0.16, 0.1, 0.02);
  const motor = addCyl(grp, 0.032, 0.032, 0.055, ironDark, 0.16, 0.17, 0.02, 16);
  motor.rotation.z = Math.PI / 2;
  const wheel = addCyl(grp, 0.052, 0.052, 0.008, steel, 0.055, 0.09, 0.042, 28);
  wheel.rotation.x = Math.PI / 2;
  wheel.name = 'cutter-wheel';
  const hub = addCyl(grp, 0.016, 0.016, 0.012, steelDark, 0.055, 0.09, 0.048, 16);
  hub.rotation.x = Math.PI / 2;
  const tracer = addCyl(grp, 0.005, 0.0035, 0.05, toon('#c6a15a'), 0.04, 0.1, -0.028, 8);
  tracer.rotation.z = Math.PI / 2;
  addBox(grp, 0.012, 0.012, 0.14, toon('#2a2e32'), -0.16, 0.08, 0.02);
  addCyl(grp, 0.012, 0.012, 0.016, toon('#c6a15a'), -0.16, 0.08, 0.09, 10);
  addCyl(grp, 0.011, 0.011, 0.01, toon('#c6a15a'), 0.15, 0.12, 0.05, 10);
  addBox(grp, 0.16, 0.01, 0.035, toon('#6d654c'), -0.02, 0.05, 0.11);
  addBox(grp, 0.018, 0.01, 0.012, toon('#c45a3a'), 0.16, 0.046, -0.08);
  g.add(grp);

  const top = a.top;
  const leg = toon('#4a525a');
  for (const [dx, dz] of [[-0.18, -0.12], [0.18, -0.12], [-0.18, 0.12], [0.18, 0.12]]) {
    addBox(g, 0.035, top - 0.02, 0.035, leg, a.x + dx, (top - 0.02) / 2, a.z + dz);
  }
  addBox(g, 0.42, 0.02, 0.28, toon('#3e4650'), a.x, 0.32, a.z);
  addHouseKey(g, 1, brass, a.x - 0.08, 0.34, a.z - 0.04, 0.2, 0.4);
  addHouseKey(g, 4, nickel, a.x + 0.02, 0.34, a.z + 0.02, -0.3, 0.8);
  addHouseKey(g, 6, brass, a.x + 0.1, 0.34, a.z - 0.02, 0.5, 1.1);
  const mat = addBox(g, 0.7, 0.012, 0.55, toon('#4a5148'), a.x, 0.012, a.z + 0.05);
  noCast(mat);
}

function benchVise(g, x, y, z) {
  const iron = toon('#4e565e');
  const steel = toon('#c5ccd2');
  const brass = toon('#c6a15a');
  addBox(g, 0.1, 0.035, 0.06, iron, x, y + 0.02, z);
  addBox(g, 0.055, 0.045, 0.028, iron, x - 0.01, y + 0.05, z - 0.01);
  addBox(g, 0.04, 0.04, 0.02, steel, x + 0.02, y + 0.05, z + 0.012);
  const screw = addCyl(g, 0.008, 0.008, 0.07, steel, x, y + 0.055, z + 0.02, 10);
  screw.rotation.x = Math.PI / 2;
  addCyl(g, 0.016, 0.016, 0.012, brass, x, y + 0.055, z + 0.055, 10);
  addBox(g, 0.03, 0.012, 0.02, steel, x + 0.04, y + 0.04, z - 0.02);
}

function pinCylinder(g, x, y, z) {
  const grp = new THREE.Group();
  grp.name = 'pin-cylinder';
  grp.position.set(x, y, z);
  const shell = addCyl(grp, 0.012, 0.012, 0.036, toon('#c6a15a'), 0, 0.018, 0, 14);
  shell.name = 'pin-cylinder';
  const face = addCyl(grp, 0.009, 0.009, 0.006, toon('#e0c27a'), 0, 0.038, 0, 12);
  face.name = 'pin-cylinder';
  const slot = addBox(grp, 0.0026, 0.004, 0.01, toon('#1c1e22'), 0, 0.042, 0);
  slot.name = 'pin-cylinder';
  const bible = addBox(grp, 0.01, 0.02, 0.012, toon('#8d6a32'), 0.011, 0.02, 0);
  bible.name = 'pin-cylinder';
  g.add(grp);
}

function lockTray(g, x, y, z, cols, rows) {
  const steel = toon('#8a929a');
  const rim = toon('#5c656e');
  addBox(g, 0.34, 0.01, 0.16, steel, x, y, z);
  addBox(g, 0.34, 0.018, 0.008, rim, x, y + 0.012, z - 0.076);
  addBox(g, 0.34, 0.018, 0.008, rim, x, y + 0.012, z + 0.076);
  addBox(g, 0.008, 0.018, 0.16, rim, x - 0.166, y + 0.012, z);
  addBox(g, 0.008, 0.018, 0.16, rim, x + 0.166, y + 0.012, z);
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const cx = x - 0.125 + c * 0.05;
      const cz = z - 0.035 + r * 0.07;
      pinCylinder(g, cx, y + 0.008, cz);
    }
  }
}

function mortiseLock(g, x, y, z, rotY) {
  const grp = new THREE.Group();
  grp.name = 'mortise-lock';
  grp.position.set(x, y, z);
  grp.rotation.y = rotY || 0;
  addBox(grp, 0.016, 0.09, 0.062, toon('#6a727a'), 0, 0.045, 0).name = 'mortise-lock';
  addBox(grp, 0.006, 0.1, 0.02, toon('#d2b56a'), 0.01, 0.05, 0).name = 'mortise-lock';
  const cyl = addCyl(grp, 0.011, 0.011, 0.012, toon('#e0c27a'), 0.014, 0.055, 0, 12);
  cyl.rotation.z = Math.PI / 2;
  cyl.name = 'mortise-lock';
  addBox(grp, 0.01, 0.012, 0.016, toon('#c5ccd2'), 0.018, 0.078, 0).name = 'mortise-lock';
  g.add(grp);
}

function repairBench(g, a, density) {
  const wood = toon('#8a5a3c');
  const woodDark = toon('#5c3b2c');
  const top = toon('#c4b39a');
  const steel = toon('#5c656e');
  addBox(g, a.w, 0.04, a.d, top, a.x, a.h - 0.02, a.z);
  addBox(g, a.w - 0.08, 0.06, a.d - 0.08, wood, a.x, a.h - 0.07, a.z);
  for (const dx of [-a.w / 2 + 0.06, a.w / 2 - 0.06]) {
    for (const dz of [-a.d / 2 + 0.06, a.d / 2 - 0.06]) {
      addBox(g, 0.045, a.h - 0.08, 0.045, woodDark, a.x + dx, (a.h - 0.08) / 2, a.z + dz);
    }
  }
  for (let i = 0; i < 3; i++) {
    const z = a.z - 0.12 + i * 0.12;
    addBox(g, 0.42, 0.1, 0.1, wood, a.x - a.w / 2 + 0.28, 0.28 + i * 0.16, z);
    addBox(g, 0.12, 0.012, 0.012, steel, a.x - a.w / 2 + 0.28, 0.28 + i * 0.16, z + 0.055);
  }
  benchVise(g, a.x + a.w / 2 - 0.16, a.h, a.z + a.d / 2 - 0.12);
  const trayZ = a.z + 0.02;
  lockTray(g, a.x - 0.15, a.h + 0.006, trayZ, density.cylinderCols, density.cylinderRows);
  const mat = addBox(g, 0.22, 0.006, 0.14, toon('#2f4a40'), a.x + 0.42, a.h + 0.004, a.z - 0.08);
  mat.name = 'pinning-mat';
  for (let i = 0; i < 8; i++) {
    const pin = addCyl(g, 0.003, 0.003, 0.016, toon(i % 2 ? '#d5dbe2' : '#e0c27a'), a.x + 0.34 + (i % 4) * 0.018, a.h + 0.014, a.z - 0.12 + Math.floor(i / 4) * 0.03, 6);
    pin.name = 'pin';
  }
  const follower = addCyl(g, 0.006, 0.006, 0.04, toon('#e0c27a'), a.x + 0.48, a.h + 0.012, a.z + 0.08, 8);
  follower.rotation.z = Math.PI / 2;
  follower.name = 'follower';
  addBox(g, 0.004, 0.006, 0.07, toon('#c5ccd2'), a.x + 0.55, a.h + 0.01, a.z + 0.02);
  addBox(g, 0.004, 0.006, 0.07, toon('#c5ccd2'), a.x + 0.558, a.h + 0.01, a.z + 0.02);
  plate(g, 'REKEY', 0.16, 0.04, a.x + 0.15, a.h + 0.03, a.z - a.d / 2 + 0.02, 0, '#f4efe6', '#2a2420', 128, 48, 26);
  for (let i = 0; i < density.mortiseCount; i++) {
    mortiseLock(g, a.x - a.w / 2 + 0.2 + i * 0.1, a.h, a.z - a.d / 2 + 0.08, 0.15 * i);
  }
}

function secureCounter(g, a) {
  const steel = toon('#5c656e');
  const steelDark = toon('#3e4650');
  const top = toon('#d7dde2');
  const wood = toon('#b08960');
  const pedW = 0.46;
  addBox(g, pedW, a.h - 0.05, a.d - 0.06, steel, a.x - a.w / 2 + pedW / 2 + 0.05, (a.h - 0.05) / 2, a.z);
  addBox(g, pedW, a.h - 0.05, a.d - 0.06, steel, a.x + a.w / 2 - pedW / 2 - 0.05, (a.h - 0.05) / 2, a.z);
  const panel = addBox(g, a.w, a.h - 0.08, 0.035, steelDark, a.x, (a.h - 0.08) / 2, a.z + a.d / 2 - 0.03);
  panel.name = 'handoff-counter';
  addBox(g, a.w + 0.06, 0.032, a.d + 0.04, top, a.x, a.h - 0.012, a.z);
  addBox(g, a.w, 0.025, 0.09, wood, a.x, a.h - 0.04, a.z + a.d / 2 + 0.03);
  for (let i = 0; i < 2; i++) {
    const y = 0.28 + i * 0.28;
    addBox(g, pedW - 0.08, 0.12, 0.02, toon('#4a545e'), a.x - a.w / 2 + pedW / 2 + 0.05, y, a.z + a.d / 2 - 0.05);
    addBox(g, 0.08, 0.012, 0.012, toon('#d2d8de'), a.x - a.w / 2 + pedW / 2 + 0.05, y, a.z + a.d / 2);
  }
  const bar = toon('#2c3338');
  const slotHalf = 0.38;
  const y0 = a.h + 0.02;
  const y1 = a.h + 0.46;
  const slotY0 = a.h + 0.01;
  const slotY1 = a.h + 0.1;
  for (let i = 0; i < 17; i++) {
    const x = a.x - a.w / 2 + 0.16 + i * ((a.w - 0.32) / 16);
    const inSlot = Math.abs(x - a.x) < slotHalf;
    if (!inSlot) {
      addBox(g, 0.012, y1 - y0, 0.012, bar, x, (y0 + y1) / 2, a.z + a.d / 2);
    } else {
      addBox(g, 0.012, y1 - slotY1, 0.012, bar, x, (slotY1 + y1) / 2, a.z + a.d / 2);
    }
  }
  addBox(g, a.w - 0.2, 0.02, 0.016, bar, a.x, y1, a.z + a.d / 2);
  addBox(g, slotHalf * 2, 0.012, 0.08, toon('#c5ccd2'), a.x, a.h + 0.01, a.z + a.d / 2 + 0.01);
  plate(g, 'KEYS CUT', 0.55, 0.09, a.x, y1 + 0.08, a.z + a.d / 2 + 0.01, 0, '#1e2a30', '#f4efe4', 256, 64, 40);
  plate(g, 'WHILE YOU WAIT', 0.42, 0.05, a.x, a.h + 0.16, a.z + a.d / 2 + 0.02, 0, '#f4efe6', '#2a2420', 256, 64, 28);
  const bell = addCyl(g, 0.035, 0.04, 0.02, toon('#c6a15a'), a.x + 0.95, a.h + 0.02, a.z + 0.12, 12);
  bell.name = 'service-bell';
  addCyl(g, 0.008, 0.008, 0.012, toon('#8d6a32'), a.x + 0.95, a.h + 0.034, a.z + 0.12, 8);
  addCyl(g, 0.012, 0.012, 0.004, toon('#e0c27a'), a.x + 0.95, a.h + 0.042, a.z + 0.12, 8);
  for (let i = 0; i < 3; i++) {
    addBox(g, 0.045, 0.001, 0.07, toon('#f7f1e4'), a.x - 1.15, a.h + 0.004 + i * 0.004, a.z + 0.08);
  }
  plate(g, '27', 0.06, 0.06, a.x - 1.35, a.h + 0.05, a.z + 0.08, 0, '#f4efe6', '#8a3030', 64, 64, 36);
  addBox(g, 0.36, 0.012, 0.1, toon('#2a3036'), a.x - 1.01, a.h + 0.008, a.z + 0.16);
}

function partsCart(g, a) {
  const steel = toon('#4e565e');
  addBox(g, a.w, 0.025, a.d, toon('#2e353b'), a.x, a.h - 0.012, a.z);
  addBox(g, a.w - 0.04, 0.02, a.d - 0.04, steel, a.x, 0.38, a.z);
  for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    addBox(g, 0.028, a.h - 0.04, 0.028, steel, a.x + dx * (a.w / 2 - 0.03), (a.h - 0.04) / 2, a.z + dz * (a.d / 2 - 0.03));
  }
}

function taskLamp(g, x, y, z) {
  const arm = toon('#3a424a');
  const shade = toon('#5c656e');
  addCyl(g, 0.012, 0.015, 0.02, arm, x, y, z, 8);
  addCyl(g, 0.008, 0.008, 0.22, arm, x, y + 0.12, z, 8);
  addBox(g, 0.16, 0.012, 0.012, arm, x + 0.06, y + 0.22, z);
  const cone = addCyl(g, 0.055, 0.028, 0.045, shade, x + 0.12, y + 0.18, z, 12);
  cone.rotation.z = 0.4;
  const bulb = addCyl(g, 0.012, 0.012, 0.012, toon('#fff6e0', { emissive: '#fff1c4', emissiveIntensity: 1 }), x + 0.14, y + 0.14, z, 8);
  bulb.name = 'light_tube';
}

function makeProcedural(layout) {
  const g = new THREE.Group();
  g.name = 'procedural';
  const brass = toon('#d7b15a');
  const nickel = toon('#d5dbe2');
  pegwall(g, layout.anchors.pegwall, layout.density, brass, nickel);
  keyCutter(g, layout.anchors.cutter, brass, nickel);
  repairBench(g, layout.anchors.bench, layout.density);
  secureCounter(g, layout.anchors.counter);
  partsCart(g, layout.anchors.cart);
  taskLamp(g, layout.anchors.cutter.x - 0.28, layout.anchors.cutter.top, layout.anchors.cutter.z - 0.18);
  taskLamp(g, layout.anchors.bench.x - 0.2, layout.anchors.bench.h, layout.anchors.bench.z - 0.1);
  const bin = addCyl(g, 0.1, 0.09, 0.16, toon('#3a424a'), layout.anchors.cutter.x + 0.42, 0.08, layout.anchors.cutter.z + 0.28, 12);
  bin.name = 'chip-bin';
  for (let i = 0; i < 6; i++) {
    const k = addHouseKey(g, i, i % 2 ? nickel : brass, layout.anchors.counter.x + 0.55 + (i % 3) * 0.035, layout.anchors.counter.h + 0.01, layout.anchors.counter.z + 0.05 + Math.floor(i / 3) * 0.03, 0.4, 0.6 + i);
    k.rotation.x = -Math.PI / 2;
  }
  return g;
}

boot({
  makeShell,
  makeProcedural,
  readyText: 'ready — locksmith · drag orbit · U unlit · T toon',
}).catch((err) => {
  window.__errors = window.__errors || [];
  window.__errors.push(String(err && err.message ? err.message : err));
  const statusEl = document.getElementById('status');
  if (statusEl) statusEl.textContent = window.__errors.join(' | ');
});
