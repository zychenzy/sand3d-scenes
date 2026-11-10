import * as THREE from 'three';
import { addBox, addCyl, addSpan, boot, mulberry32, toon } from './scene_lib.js';
import { hedgeClump, looseCanopy, plantBed, sprouts } from './crops.js';

const EXT = 20;
const TEX = 4096;

function soilTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d');
  const rng = mulberry32(41);
  g.fillStyle = '#7a5840';
  g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 900; i++) {
    g.fillStyle = rng() > 0.5 ? 'rgba(48,28,16,0.28)' : 'rgba(168,124,78,0.32)';
    const s = 2 + rng() * 7;
    g.fillRect(rng() * 256, rng() * 256, s, s);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2.2, 2.2);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

let sharedSoil = null;
function soilMat() {
  if (!sharedSoil) sharedSoil = soilTexture();
  return toon('#ffffff', { map: sharedSoil });
}

function woodPair(id) {
  const palette = [
    ['#8d6844', '#6b4e32'],
    ['#94724c', '#705636'],
    ['#7d5c3a', '#5e452c'],
    ['#a07850', '#7a5a38'],
    ['#86603e', '#624832'],
  ];
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h + id.charCodeAt(i) * 13) % palette.length;
  return palette[h];
}

function buildBed(parent, bed) {
  const g = new THREE.Group();
  g.name = bed.id;
  g.position.set(bed.x + bed.w / 2, 0, bed.z + bed.d / 2);
  const [light, dark] = woodPair(bed.id);
  const plank = toon(light);
  const plankDark = toon(dark);
  const t = 0.038;
  const h = bed.h;
  const courses = h < 0.16 ? 1 : 2;
  for (let i = 0; i < courses; i++) {
    const ch = h / courses;
    const y = ch * i + ch / 2;
    const mat = i === 0 ? plankDark : plank;
    const bh = ch * (courses === 1 ? 1 : 0.94);
    addBox(g, bed.w, bh, t, mat, 0, y, -bed.d / 2 + t / 2);
    addBox(g, bed.w, bh, t, mat, 0, y, bed.d / 2 - t / 2);
    addBox(g, t, bh, bed.d - t * 2, mat, -bed.w / 2 + t / 2, y, 0);
    addBox(g, t, bh, bed.d - t * 2, mat, bed.w / 2 - t / 2, y, 0);
  }
  const ph = h + 0.04;
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    addBox(g, 0.05, ph, 0.05, plankDark, sx * (bed.w / 2), ph / 2, sz * (bed.d / 2));
  }
  const soil = addBox(
    g,
    bed.w - t * 2 - 0.015,
    0.045,
    bed.d - t * 2 - 0.015,
    soilMat(),
    0,
    Math.max(0.03, bed.soil - 0.02),
    0
  );
  soil.userData.shadowMode = 'receive';
  plantBed(g, bed);
  parent.add(g);
}

function corrugatedGeometry(w, d, waves) {
  const geo = new THREE.PlaneGeometry(w, d, 8, waves * 8);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const z = pos.getZ(i);
    pos.setY(i, Math.sin((z / d) * Math.PI * 2 * waves) * 0.016);
  }
  geo.computeVertexNormals();
  return geo;
}

function buildShed(parent, shed, barrel) {
  const g = new THREE.Group();
  g.name = 'shed';
  g.position.set(shed.x + shed.w / 2, 0, shed.z + shed.d / 2);
  const wall = toon('#8b7766');
  const wallAlt = toon('#756656');
  const trim = toon('#5a4638');
  const inner = toon('#4a3e36');
  addBox(g, shed.w - 0.12, shed.eave - 0.12, shed.d - 0.12, inner, 0, shed.eave / 2, 0);
  addBox(g, shed.w, 0.08, shed.d, trim, 0, 0.04, 0);
  const boardH = 0.12;
  const rows = Math.floor((shed.eave - 0.12) / boardH);
  const doorW = 0.66;
  const doorH = 1.68;
  for (let i = 0; i < rows; i++) {
    const y = 0.1 + i * boardH + boardH / 2;
    const mat = i % 2 ? wall : wallAlt;
    const bh = boardH * 0.9;
    addBox(g, shed.w, bh, 0.04, mat, 0, y, -shed.d / 2 + 0.02);
    const sideW = (shed.w - doorW) / 2;
    if (y < doorH) {
      addBox(g, sideW, bh, 0.04, mat, -shed.w / 2 + sideW / 2, y, shed.d / 2 - 0.02);
      addBox(g, sideW, bh, 0.04, mat, shed.w / 2 - sideW / 2, y, shed.d / 2 - 0.02);
    } else {
      addBox(g, shed.w, bh, 0.04, mat, 0, y, shed.d / 2 - 0.02);
    }
    addBox(g, 0.04, bh, shed.d - 0.08, mat, -shed.w / 2 + 0.02, y, 0);
    addBox(g, 0.04, bh, shed.d - 0.08, mat, shed.w / 2 - 0.02, y, 0);
  }
  const door = new THREE.Group();
  addBox(door, doorW - 0.06, doorH, 0.035, toon('#6d5644'), 0, doorH / 2, 0);
  addBox(door, doorW - 0.16, 0.07, 0.012, trim, 0, 0.45, 0.02);
  addBox(door, doorW - 0.16, 0.07, 0.012, trim, 0, 1.2, 0.02);
  addSpan(door, [-doorW / 2 + 0.1, 0.18, 0.03], [doorW / 2 - 0.1, doorH - 0.12, 0.03], 0.012, trim);
  addBox(door, 0.04, 0.08, 0.02, toon('#c2b8a4'), doorW * 0.28, 0.9, 0.03);
  door.position.set(0, 0, shed.d / 2 + 0.01);
  g.add(door);

  const plate = document.createElement('canvas');
  plate.width = 64;
  plate.height = 64;
  const pctx = plate.getContext('2d');
  pctx.fillStyle = '#efe8dc';
  pctx.fillRect(0, 0, 64, 64);
  pctx.fillStyle = '#2a241c';
  pctx.font = '700 42px sans-serif';
  pctx.textAlign = 'center';
  pctx.textBaseline = 'middle';
  pctx.fillText('4', 32, 34);
  const ptex = new THREE.CanvasTexture(plate);
  ptex.colorSpace = THREE.SRGBColorSpace;
  const badge = new THREE.Mesh(new THREE.PlaneGeometry(0.12, 0.12), toon('#ffffff', { map: ptex }));
  badge.position.set(doorW * 0.28, 1.28, shed.d / 2 + 0.04);
  g.add(badge);

  addBox(g, 0.03, 0.32, 0.4, toon('#243038'), shed.w / 2 + 0.015, 1.4, 0.02);
  addBox(g, 0.02, 0.34, 0.03, trim, shed.w / 2 + 0.03, 1.4, 0.02);
  addBox(g, 0.02, 0.03, 0.4, trim, shed.w / 2 + 0.03, 1.4, 0.02);

  const slope = Math.atan2(shed.ridge - shed.eave, shed.w);
  const roof = new THREE.Mesh(
    corrugatedGeometry(shed.w + 0.22, shed.d + 0.26, 7),
    toon('#6d7572')
  );
  roof.position.y = (shed.ridge + shed.eave) / 2 + 0.02;
  roof.rotation.z = -slope;
  g.add(roof);
  parent.add(g);

  const pipeX = shed.x + shed.w + 0.04;
  const pipeZ = barrel.z;
  addSpan(parent, [pipeX, shed.eave - 0.02, pipeZ], [pipeX, barrel.h + 0.02, pipeZ], 0.025, toon('#8d9390'));
  addSpan(parent, [pipeX, barrel.h + 0.02, pipeZ], [barrel.x, barrel.h + 0.04, barrel.z], 0.02, toon('#8d9390'));
}

function buildBarrel(parent, barrel) {
  const g = new THREE.Group();
  g.name = 'barrel';
  g.position.set(barrel.x, 0, barrel.z);
  const body = toon('#1a1c1b');
  const rib = toon('#2c2e2c');
  addCyl(g, barrel.r * 0.9, barrel.r, barrel.h * 0.9, body, 0, barrel.h * 0.46, 0, 18);
  for (let i = 0; i < 5; i++) {
    addCyl(g, barrel.r * 1.05, barrel.r * 1.05, 0.022, rib, 0, 0.1 + i * barrel.h * 0.16, 0, 18);
  }
  addCyl(g, barrel.r * 1.08, barrel.r * 1.02, 0.045, rib, 0, barrel.h - 0.02, 0, 18);
  const water = new THREE.Mesh(
    new THREE.CircleGeometry(barrel.r * 0.84, 20),
    toon('#3f6d66', { side: THREE.DoubleSide })
  );
  water.rotation.x = -Math.PI / 2;
  water.position.y = barrel.h * 0.84;
  water.userData.shadowMode = 'receive';
  g.add(water);
  const glint = new THREE.Mesh(
    new THREE.CircleGeometry(barrel.r * 0.22, 12),
    toon('#4e6e68', { side: THREE.DoubleSide })
  );
  glint.rotation.x = -Math.PI / 2;
  glint.position.set(barrel.r * 0.22, barrel.h * 0.845, -barrel.r * 0.12);
  glint.userData.shadowMode = 'none';
  g.add(glint);
  addSpan(g, [barrel.r * 0.7, 0.2, 0], [barrel.r + 0.07, 0.2, 0], 0.016, toon('#9aa0a4'));
  parent.add(g);
}

function buildCompost(parent, bay) {
  const g = new THREE.Group();
  g.name = bay.kind;
  g.position.set(bay.x + bay.w / 2, 0, bay.z + bay.d / 2);
  const post = toon('#b08a58');
  const slat = toon('#8d6c44');
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    addBox(g, 0.055, bay.h, 0.055, post, sx * (bay.w / 2 - 0.03), bay.h / 2, sz * (bay.d / 2 - 0.03));
  }
  const n = 5;
  for (let i = 0; i < n; i++) {
    const y = 0.08 + ((bay.h - 0.14) * (i + 0.5)) / n;
    addBox(g, bay.w - 0.08, 0.04, 0.025, slat, 0, y, bay.d / 2 - 0.04);
    addBox(g, bay.w - 0.08, 0.04, 0.025, slat, 0, y, -bay.d / 2 + 0.04);
    addBox(g, 0.025, 0.04, bay.d - 0.1, slat, bay.w / 2 - 0.04, y, 0);
    addBox(g, 0.025, 0.04, bay.d - 0.1, slat, -bay.w / 2 + 0.04, y, 0);
  }
  const heapH = bay.h * bay.fill;
  const col = bay.kind === 'fresh' ? '#5c6434' : '#3a2a1c';
  const mound = new THREE.Mesh(new THREE.SphereGeometry(Math.min(bay.w, bay.d) * 0.34, 10, 8), toon(col));
  mound.scale.set(1.15, 0.45 + bay.fill * 0.35, 0.9);
  mound.position.y = heapH * 0.42;
  g.add(mound);
  const lumpMat = toon(bay.kind === 'fresh' ? '#6a7040' : '#2a2016');
  for (let i = 0; i < 3; i++) {
    const lump = new THREE.Mesh(new THREE.SphereGeometry(0.08 + i * 0.015, 7, 6), lumpMat);
    lump.position.set((i - 1) * 0.12, heapH * 0.55, (i % 2 ? 0.06 : -0.05));
    g.add(lump);
  }
  if (bay.kind === 'fresh') {
    for (let i = 0; i < 4; i++) {
      addSpan(g, [-0.1 + i * 0.06, heapH * 0.4, 0], [-0.02 + i * 0.05, heapH * 0.75, 0.04], 0.008, toon('#8a9a48'));
    }
  }
  parent.add(g);
}

function buildPotting(parent, p) {
  const g = new THREE.Group();
  g.name = 'potting';
  g.position.set(p.x + p.w / 2, 0, p.z + p.d / 2);
  const wood = toon('#9b7348');
  const dark = toon('#6d5134');
  const topT = 0.04;
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    addBox(g, 0.055, p.top - topT, 0.055, wood, sx * (p.w / 2 - 0.05), (p.top - topT) / 2, sz * (p.d / 2 - 0.04));
  }
  addBox(g, p.w, topT, p.d, wood, 0, p.top - topT / 2, 0);
  addBox(g, p.w - 0.08, 0.008, 0.01, dark, 0, p.top + 0.002, -0.06);
  addBox(g, p.w - 0.08, 0.008, 0.01, dark, 0, p.top + 0.002, 0.08);
  addBox(g, p.w - 0.12, 0.02, p.d - 0.08, dark, 0, 0.28, 0);
  addBox(g, p.w, 0.09, 0.028, wood, 0, p.top + 0.04, -p.d / 2 + 0.02);
  const sack = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 6), toon('#8a6a42'));
  sack.scale.set(1.3, 0.55, 0.9);
  sack.position.set(-0.28, 0.34, 0);
  g.add(sack);
  addBox(g, 0.4, 0.035, 0.2, toon('#6a5340'), 0.48, p.top + 0.02, 0.02);
  addBox(g, 0.36, 0.018, 0.16, soilMat('#3a291c'), 0.48, p.top + 0.04, 0.02);
  parent.add(g);
  const cx = p.x + p.w / 2 + 0.48;
  const cz = p.z + p.d / 2 + 0.02;
  sprouts(parent, cx, p.top + 0.05, cz, 6, 'tray');
}

function buildPicnic(parent, pic) {
  const g = new THREE.Group();
  g.name = 'picnic';
  g.position.set(pic.x, 0, pic.z);
  g.rotation.y = pic.rotY || 0;
  const wood = toon('#b58b56');
  const dark = toon('#8a663c');
  const L = pic.length;
  const W = pic.width;
  addBox(g, L, 0.045, W, wood, 0, pic.top - 0.022, 0);
  addBox(g, L * 0.98, 0.006, 0.012, dark, 0, pic.top + 0.002, -0.12);
  addBox(g, L * 0.98, 0.006, 0.012, dark, 0, pic.top + 0.002, 0.12);
  const seatY = 0.46;
  addBox(g, L - 0.16, 0.04, 0.28, wood, 0, seatY, -pic.benchOffset);
  addBox(g, L - 0.16, 0.04, 0.28, wood, 0, seatY, pic.benchOffset);
  for (const sx of [-1, 1]) {
    const x = sx * L * 0.36;
    addSpan(g, [x, 0.02, -(pic.benchOffset + 0.12)], [x, pic.top - 0.05, -W * 0.32], 0.032, dark);
    addSpan(g, [x, 0.02, pic.benchOffset + 0.12], [x, pic.top - 0.05, W * 0.32], 0.032, dark);
    addSpan(g, [x, seatY - 0.02, -pic.benchOffset], [x, seatY - 0.02, pic.benchOffset], 0.028, dark);
  }
  addCyl(g, 0.085, 0.065, 0.03, toon('#e4dcc8'), -0.32, pic.top + 0.02, 0.04, 10);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const tom = new THREE.Mesh(new THREE.SphereGeometry(0.016, 6, 5), toon(i % 2 ? '#c44732' : '#a33b2c'));
    tom.position.set(-0.32 + Math.cos(a) * 0.032, pic.top + 0.045, 0.04 + Math.sin(a) * 0.026);
    g.add(tom);
  }
  parent.add(g);
}

function buildColdFrame(parent, cf) {
  const g = new THREE.Group();
  g.name = 'cold-frame';
  g.position.set(cf.x + cf.w / 2, 0, cf.z + cf.d / 2);
  const wood = toon('#7b5b3c');
  addBox(g, cf.w, 0.26, 0.035, wood, 0, 0.13, cf.d / 2 - 0.02);
  addBox(g, cf.w, 0.2, 0.035, wood, 0, 0.1, -cf.d / 2 + 0.02);
  addBox(g, 0.035, 0.24, cf.d, wood, -cf.w / 2 + 0.018, 0.12, 0);
  addBox(g, 0.035, 0.24, cf.d, wood, cf.w / 2 - 0.018, 0.12, 0);
  const soil = addBox(g, cf.w - 0.1, 0.04, cf.d - 0.1, soilMat('#3a291c'), 0, 0.05, 0);
  soil.userData.shadowMode = 'receive';
  const lid = new THREE.Group();
  lid.position.set(0, 0.26, -cf.d / 2 + 0.04);
  lid.rotation.x = -0.62;
  const glass = new THREE.Mesh(
    new THREE.BoxGeometry(cf.w - 0.08, 0.01, cf.d - 0.08),
    toon('#c9e0d4', { transparent: true, opacity: 0.3, side: THREE.DoubleSide, depthWrite: false })
  );
  glass.position.set(0, 0.02, cf.d / 2 - 0.04);
  glass.userData.shadowMode = 'none';
  lid.add(glass);
  addBox(lid, cf.w - 0.05, 0.02, 0.02, wood, 0, 0.02, 0.02);
  addBox(lid, cf.w - 0.05, 0.02, 0.02, wood, 0, 0.02, cf.d - 0.08);
  addBox(lid, 0.02, 0.02, cf.d - 0.08, wood, -cf.w / 2 + 0.04, 0.02, cf.d / 2 - 0.04);
  addBox(lid, 0.02, 0.02, cf.d - 0.08, wood, cf.w / 2 - 0.04, 0.02, cf.d / 2 - 0.04);
  g.add(lid);
  parent.add(g);
  sprouts(g, 0, 0.08, 0, 7, 'cold-frame');
}

function buildFence(parent, fence, gate) {
  const postMat = toon('#6b5140');
  const wireMat = toon('#667078');
  const board = toon('#8a7564');
  const boardDark = toon('#746252');
  const { minX, maxX, minZ, maxZ } = fence;
  const open0 = gate.hingeX;
  const open1 = gate.hingeX + gate.opening;

  function posts(x0, z0, x1, z1, spacing) {
    const len = Math.hypot(x1 - x0, z1 - z0);
    const n = Math.max(1, Math.round(len / spacing));
    const pts = [];
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      pts.push([x0 + (x1 - x0) * t, z0 + (z1 - z0) * t]);
    }
    return pts;
  }
  const seen = new Set();
  const corners = [
    [minX, minZ, maxX, minZ],
    [maxX, minZ, maxX, maxZ],
    [maxX, maxZ, minX, maxZ],
    [minX, maxZ, minX, minZ],
  ];
  for (const edge of corners) {
    for (const [x, z] of posts(edge[0], edge[1], edge[2], edge[3], 1.7)) {
      if (z === maxZ && x > open0 + 0.05 && x < open1 - 0.05) continue;
      const key = `${x.toFixed(2)},${z.toFixed(2)}`;
      if (seen.has(key)) continue;
      seen.add(key);
      addBox(parent, 0.075, 1.12, 0.075, postMat, x, 0.56, z);
    }
  }
  function wire(x0, z0, x1, z1, y) {
    addSpan(parent, [x0, y, z0], [x1, y, z1], 0.008, wireMat);
  }
  for (const y of [0.32, 0.62, 0.92]) {
    wire(minX, minZ, maxX, minZ, y);
    wire(maxX, minZ, maxX, maxZ, y);
    wire(minX, maxZ, minX, minZ, y);
    wire(minX, maxZ, open0, maxZ, y);
    wire(open1, maxZ, maxX, maxZ, y);
  }
  const rows = 8;
  for (let i = 0; i < rows; i++) {
    const y = 0.12 + i * 0.16;
    addBox(parent, maxX - minX, 0.12, 0.03, i % 2 ? board : boardDark, (minX + maxX) / 2, y, minZ);
  }

  const rad = (gate.openDeg * Math.PI) / 180;
  const leaf = new THREE.Group();
  leaf.name = 'gate';
  leaf.position.set(gate.hingeX, 0, gate.z);
  leaf.rotation.y = rad;
  const pales = 7;
  const paleW = 0.075;
  for (let i = 0; i < pales; i++) {
    const x = 0.04 + i * ((gate.leaf - 0.08) / pales);
    addBox(leaf, paleW, 0.98, 0.02, toon('#8d6a44'), x, 0.52, 0);
  }
  addBox(leaf, gate.leaf - 0.04, 0.055, 0.025, toon('#6a5038'), gate.leaf / 2, 0.28, 0);
  addBox(leaf, gate.leaf - 0.04, 0.055, 0.025, toon('#6a5038'), gate.leaf / 2, 0.78, 0);
  addSpan(leaf, [0.08, 0.2, 0.02], [gate.leaf - 0.08, 0.88, 0.02], 0.012, toon('#6a5038'));
  parent.add(leaf);
  addBox(parent, 0.09, 1.28, 0.09, postMat, open0, 0.64, maxZ);
  addBox(parent, 0.09, 1.28, 0.09, postMat, open1, 0.64, maxZ);
}

function buildSign(parent, sign) {
  const canvas = document.createElement('canvas');
  canvas.width = 640;
  canvas.height = 160;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#efe6d2';
  ctx.fillRect(0, 0, 640, 160);
  ctx.strokeStyle = '#5c4632';
  ctx.lineWidth = 12;
  ctx.strokeRect(8, 8, 624, 144);
  ctx.fillStyle = '#2c3a28';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  let size = 72;
  const label = 'ALLOTMENTS';
  do {
    ctx.font = `700 ${size}px sans-serif`;
    size -= 2;
  } while (ctx.measureText(label).width > 560 && size > 28);
  ctx.fillText(label, 320, 84);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  const board = new THREE.Mesh(new THREE.PlaneGeometry(sign.w, sign.h), toon('#ffffff', { map: tex }));
  board.position.set(sign.x, sign.y, sign.z);
  board.rotation.y = sign.rotY || 0;
  parent.add(board);
  addBox(parent, 0.06, sign.y, 0.06, toon('#6b5140'), sign.x - sign.w * 0.38, sign.y / 2, sign.z);
  addBox(parent, 0.06, sign.y, 0.06, toon('#6b5140'), sign.x + sign.w * 0.38, sign.y / 2, sign.z);
}

function tool(parent, x, z, yaw, blade, lean = -0.22) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  g.rotation.order = 'YXZ';
  g.rotation.y = yaw;
  g.rotation.x = lean;
  addCyl(g, 0.012, 0.015, 1.12, toon('#c6a36e'), 0, 0.66, 0, 6);
  addBox(g, 0.15, 0.22, 0.018, toon(blade), 0, 0.16, 0.01);
  parent.add(g);
}

function wateringCan(parent, x, z) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  const red = toon('#a3473c');
  addCyl(g, 0.085, 0.1, 0.15, red, 0, 0.1, 0, 12);
  addCyl(g, 0.1, 0.09, 0.02, toon('#7d342c'), 0, 0.175, 0, 12);
  const spout = addCyl(g, 0.014, 0.022, 0.16, red, 0.08, 0.16, 0, 6);
  spout.rotation.z = -1.15;
  const handle = new THREE.Mesh(new THREE.TorusGeometry(0.055, 0.008, 6, 12, Math.PI), toon('#6e302c'));
  handle.position.set(-0.01, 0.15, 0);
  handle.rotation.z = Math.PI / 2;
  g.add(handle);
  parent.add(g);
}

function hose(parent, barrel) {
  const pts = [];
  for (let i = 0; i <= 28; i++) {
    const t = i / 28;
    const ang = t * Math.PI * 4.5;
    const rad = 0.06 + t * 0.16;
    pts.push(new THREE.Vector3(
      barrel.x + 0.55 + Math.cos(ang) * rad,
      0.025,
      barrel.z + 0.72 + Math.sin(ang) * rad * 0.55
    ));
  }
  const mesh = new THREE.Mesh(
    new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 48, 0.012, 5, false),
    toon('#2a3828')
  );
  mesh.userData.shadowMode = 'receive';
  parent.add(mesh);
}

function grassTufts(parent, paths) {
  const rng = mulberry32(11);
  const mat = toon('#5e7a42', { side: THREE.DoubleSide });
  const g = new THREE.Group();
  g.userData.shadowMode = 'receive';
  for (const p of paths) {
    if (!p.tufts) continue;
    const longX = p.w >= p.d;
    const n = Math.floor((longX ? p.w : p.d) / 0.7);
    for (let i = 0; i < n; i++) {
      if (rng() < 0.4) continue;
      const along = (i + rng()) / n;
      const side = rng() > 0.5 ? 1 : -1;
      const x = longX ? p.x + along * p.w : (side > 0 ? p.x + p.w + 0.05 : p.x - 0.05);
      const z = longX ? (side > 0 ? p.z + p.d + 0.05 : p.z - 0.05) : p.z + along * p.d;
      const h = 0.09 + rng() * 0.14;
      for (let b = 0; b < 3; b++) {
        const blade = new THREE.Mesh(new THREE.PlaneGeometry(0.012, h), mat);
        blade.position.set(x + (rng() - 0.5) * 0.05, h / 2, z + (rng() - 0.5) * 0.05);
        blade.rotation.y = rng() * Math.PI;
        g.add(blade);
      }
    }
  }
  parent.add(g);
}

function paintGround(layout) {
  const c = document.createElement('canvas');
  c.width = c.height = TEX;
  const ctx = c.getContext('2d');
  const rng = mulberry32(20261110);
  ctx.fillStyle = '#6c8450';
  ctx.fillRect(0, 0, TEX, TEX);
  for (let i = 0; i < 9000; i++) {
    ctx.fillStyle = rng() > 0.55 ? 'rgba(52,74,40,0.22)' : 'rgba(156,170,96,0.16)';
    const s = 3 + rng() * 16;
    ctx.fillRect(rng() * TEX, rng() * TEX, s, s * (0.45 + rng() * 0.8));
  }
  const px = (x) => ((x + EXT) / (2 * EXT)) * TEX;
  const py = (z) => ((z + EXT) / (2 * EXT)) * TEX;
  function fillRect(x, z, w, d) {
    ctx.fillRect(px(x), py(z), (w / (2 * EXT)) * TEX, (d / (2 * EXT)) * TEX);
  }
  for (const p of layout.paths) {
    if (p.surface === 'gravel') continue;
    ctx.fillStyle = '#c4ae86';
    fillRect(p.x, p.z, p.w, p.d);
    ctx.fillStyle = 'rgba(92,70,44,0.18)';
    const inset = 0.18;
    if (p.w > 0.5 && p.d > 0.5) fillRect(p.x + inset, p.z + inset, p.w - inset * 2, p.d - inset * 2);
  }
  for (const p of layout.paths) {
    if (p.surface !== 'gravel') continue;
    ctx.fillStyle = '#b7b1a4';
    fillRect(p.x, p.z, p.w, p.d);
  }
  for (const p of layout.paths) {
    if (!p.worn) continue;
    ctx.fillStyle = 'rgba(110,86,58,0.38)';
    const mx = p.w > p.d ? 0.28 : 0.18;
    const mz = p.d > p.w ? 0.22 : 0.16;
    fillRect(p.x + mx, p.z + mz, Math.max(0.2, p.w - mx * 2), Math.max(0.2, p.d - mz * 2));
  }
  const b = layout.structures.barrel;
  const dampX = px(b.x);
  const dampY = py(b.z + 0.15);
  const grad = ctx.createRadialGradient(dampX, dampY, 4, dampX, dampY, 70);
  grad.addColorStop(0, 'rgba(48,58,42,0.45)');
  grad.addColorStop(1, 'rgba(48,58,42,0)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.ellipse(dampX, dampY, 78, 48, 0, 0, Math.PI * 2);
  ctx.fill();
  for (const p of layout.paths) {
    if (p.surface === 'gravel') continue;
    ctx.strokeStyle = 'rgba(90,70,46,0.45)';
    ctx.lineWidth = 3;
    ctx.strokeRect(px(p.x), py(p.z), (p.w / (2 * EXT)) * TEX, (p.d / (2 * EXT)) * TEX);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

function makeShell(layout) {
  const g = new THREE.Group();
  g.name = 'shell';
  const far = new THREE.Mesh(
    new THREE.PlaneGeometry(180, 180),
    toon('#6c8450')
  );
  far.rotation.x = -Math.PI / 2;
  far.position.y = -0.02;
  far.userData.shadowMode = 'receive';
  far.name = 'ground-far';
  g.add(far);

  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(EXT * 2, EXT * 2),
    toon('#ffffff', { map: paintGround(layout) })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = 0;
  ground.userData.shadowMode = 'receive';
  ground.name = 'ground';
  g.add(ground);

  const skyC = document.createElement('canvas');
  skyC.width = 16;
  skyC.height = 256;
  const sg = skyC.getContext('2d');
  const skyGrad = sg.createLinearGradient(0, 0, 0, 256);
  skyGrad.addColorStop(0, '#f2e6cf');
  skyGrad.addColorStop(0.42, '#d5e4f4');
  skyGrad.addColorStop(1, '#8eafd0');
  sg.fillStyle = skyGrad;
  sg.fillRect(0, 0, 16, 256);
  const skyTex = new THREE.CanvasTexture(skyC);
  skyTex.colorSpace = THREE.SRGBColorSpace;
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(72, 28, 16),
    new THREE.MeshBasicMaterial({ map: skyTex, side: THREE.BackSide, fog: false, depthWrite: false })
  );
  sky.userData.forceBasic = true;
  sky.userData.shadowMode = 'none';
  sky.name = 'sky';
  g.add(sky);
  return g;
}

function house(parent, h) {
  const g = new THREE.Group();
  g.position.set(h.x + h.w / 2, 0, h.z + h.d / 2);
  g.userData.shadowMode = 'none';
  const wall = toon(h.wall);
  addBox(g, h.w, h.eave, h.d, wall, 0, h.eave / 2, 0);
  const rise = h.ridge - h.eave;
  const slope = Math.atan2(rise, h.d / 2);
  const run = Math.hypot(h.d / 2, rise);
  for (const sz of [-1, 1]) {
    const plane = addBox(g, h.w + 0.3, 0.08, run, toon(h.roof), 0, h.eave + rise / 2, sz * (h.d / 4));
    plane.rotation.x = sz * slope;
  }
  addBox(g, 0.38, 1.15, 0.38, toon('#7a6c66'), h.w * 0.22, h.ridge + 0.35, 0);
  addBox(g, 0.46, 0.08, 0.46, toon('#5c534e'), h.w * 0.22, h.ridge + 0.9, 0);
  const win = toon('#3e4a54');
  for (const sx of [-0.28, 0.22]) {
    addBox(g, 0.46, 0.62, 0.04, win, sx * h.w, h.eave * 0.72, h.d / 2 + 0.01);
    addBox(g, 0.46, 0.5, 0.04, win, sx * h.w, h.eave * 0.38, h.d / 2 + 0.01);
  }
  parent.add(g);
}

function appleTree(parent, tree) {
  const g = new THREE.Group();
  g.position.set(tree.x, 0, tree.z);
  const bark = toon('#6b4e38');
  const trunk = addCyl(g, 0.065, 0.095, 1.2, bark, 0.04, 0.6, 0, 7);
  trunk.rotation.z = 0.12;
  trunk.rotation.x = -0.05;
  addSpan(g, [0.05, 1.05, 0], [-0.75, 1.85, 0.35], 0.04, bark);
  addSpan(g, [0.02, 0.95, 0], [0.62, 2.05, -0.28], 0.036, bark);
  addSpan(g, [0, 0.85, 0], [0.1, 1.65, 0.72], 0.03, bark);
  looseCanopy(g, -0.55, 2.05, 0.22, {
    id: `${tree.id}-a`, radius: 0.9, height: 0.7, leaf: 0.26, leaves: 14, clumps: 3,
    colors: ['#4a7a3e', '#5d8c48', '#345e32', '#6d9850'],
  });
  looseCanopy(g, 0.48, 2.15, -0.12, {
    id: `${tree.id}-b`, radius: 0.75, height: 0.6, leaf: 0.24, leaves: 12, clumps: 3,
    colors: ['#3d6834', '#6b9450', '#2c5130'],
  });
  looseCanopy(g, 0.05, 1.75, 0.4, {
    id: `${tree.id}-c`, radius: 0.6, height: 0.45, leaf: 0.22, leaves: 10, clumps: 2,
    colors: ['#547e42', '#3a6234', '#6a8a44'],
  });
  for (let i = 0; i < 6; i++) {
    const apple = new THREE.Mesh(new THREE.SphereGeometry(0.042, 7, 6), toon(i % 2 ? '#c45c38' : '#9a4030'));
    apple.position.set(-0.45 + (i % 3) * 0.4, 1.65 + (i % 2) * 0.4, -0.1 + (i % 3) * 0.22);
    g.add(apple);
  }
  parent.add(g);
}

function columnTree(parent, tree) {
  const g = new THREE.Group();
  g.position.set(tree.x, 0, tree.z);
  addCyl(g, 0.035, 0.07, 2.35, toon('#5c4636'), 0, 1.15, 0, 6);
  looseCanopy(g, 0, 1.85, 0, {
    id: `${tree.id}-crown`,
    radius: 0.42,
    height: 1.55,
    leaf: 0.28,
    leaves: 14,
    clumps: 8,
    colors: ['#243e2c', '#34563a', '#1c3326', '#4e7042', '#2a4634'],
  });
  parent.add(g);
}

function neighborPlot(parent, plot) {
  const g = new THREE.Group();
  g.userData.shadowMode = 'none';
  buildBed(g, plot.bed);
  const shed = plot.shed;
  addBox(g, shed.w, shed.h, shed.d, toon('#7d6a58'), shed.x + shed.w / 2, shed.h / 2, shed.z + shed.d / 2);
  addBox(g, shed.w + 0.12, 0.06, shed.d + 0.12, toon('#6a7270'), shed.x + shed.w / 2, shed.h + 0.03, shed.z + shed.d / 2);
  parent.add(g);
}

function makeProcedural(layout) {
  const g = new THREE.Group();
  g.name = 'procedural';
  for (const bed of layout.beds) buildBed(g, bed);
  const s = layout.structures;
  buildShed(g, s.shed, s.barrel);
  buildBarrel(g, s.barrel);
  for (const bay of s.compost) buildCompost(g, bay);
  buildPotting(g, s.potting);
  buildPicnic(g, s.picnic);
  buildColdFrame(g, s.coldFrame);
  buildFence(g, layout.fence, s.gate);
  buildSign(g, s.sign);
  for (const t of s.tools) tool(g, t.x, t.z, t.yaw || 0, t.blade, t.lean);
  wateringCan(g, s.can.x, s.can.z);
  hose(g, s.barrel);
  grassTufts(g, layout.paths);

  const bg = new THREE.Group();
  bg.name = 'background';
  bg.userData.shadowMode = 'none';
  for (const h of layout.background.houses) house(bg, h);
  g.add(bg);
  for (let x = -10.4; x <= 9.2; x += 0.58) {
    const n = Math.round(x * 10);
    const height = 1.15 + Math.sin(x * 0.7) * 0.22;
    hedgeClump(bg, x + ((n % 3) - 1) * 0.06, 0.85 + (n % 2) * 0.18, -7.2, height, `hedge-${n}`);
  }
  appleTree(g, layout.background.apple);
  columnTree(g, layout.background.column);
  const broad = layout.background.broad;
  const bark = toon('#5a4534');
  addCyl(g, 0.07, 0.12, 2.15, bark, broad.x, 1.05, broad.z, 6);
  addSpan(g, [broad.x, 1.65, broad.z], [broad.x - 0.55, 2.45, broad.z + 0.22], 0.028, bark);
  addSpan(g, [broad.x, 1.75, broad.z], [broad.x + 0.5, 2.55, broad.z - 0.18], 0.024, bark);
  looseCanopy(g, broad.x - 0.28, 2.55, broad.z + 0.08, {
    id: 'broad-a', radius: 0.85, height: 0.6, leaf: 0.26, leaves: 12, clumps: 3,
    colors: ['#4a743c', '#5e8a46', '#314f30', '#6a944c'],
  });
  looseCanopy(g, broad.x + 0.22, 2.7, broad.z - 0.06, {
    id: 'broad-b', radius: 0.75, height: 0.55, leaf: 0.24, leaves: 10, clumps: 2,
    colors: ['#3d6834', '#5e8a46', '#2c5130'],
  });
  neighborPlot(g, layout.background.neighbor);

  const potH = layout.assets.flowerpot.targetHeight;
  for (const inst of layout.instances) {
    if (inst.kind !== 'flowerpot') continue;
    const sproutY = inst.position[1] + potH * (inst.scale || 1) * 0.72;
    sprouts(g, inst.position[0], sproutY, inst.position[2], 4, inst.id);
  }
  return g;
}

boot({
  makeShell,
  makeProcedural,
  readyText: 'ready — community allotment · drag orbit · U unlit · T toon',
});
