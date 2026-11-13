import * as THREE from 'three';
import {
  boot, toon, addBox, addCyl, addSphere, srgbTexture, quiet,
} from './scene_lib.js';
import {
  COURT, half, basketCenter, backboardFaceZ, ringCenter, backboardBottomY,
  freeThrow, threePoint, straightMarks, keyRect,
} from './court_spec.mjs';

const MAPLE = ['#e2bc8c', '#e4c094', '#deba8a', '#e6c298', '#e0b88a', '#e3bd90'];
const LINE = '#f7f4ee';
const KEY = '#c75b42';
const WALK = '#6d6256';
const WALK_GROUT = '#5e554b';
const PLASTER = '#f4efe6';
const DADO = '#8d4038';
const DADO_TOP = '#f3e2c4';
const STEEL = '#5e676e';
const STEEL_DARK = '#3e4650';
const PAD = '#d24b3e';
const RIM = '#e25c14';
const GLASS = '#d7e6ec';
const NAVY = '#1e4f86';
const MAROON = '#8d3542';

const WOOD = { minX: -9.5, maxX: 9.5, minZ: -16, maxZ: 16 };

function ballMaterial() {
  if (ballMaterial.mat) return ballMaterial.mat;
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#e36b22';
  ctx.fillRect(0, 0, 256, 128);
  ctx.strokeStyle = '#2a221c';
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.moveTo(128, 4);
  ctx.bezierCurveTo(168, 36, 168, 92, 128, 124);
  ctx.moveTo(128, 4);
  ctx.bezierCurveTo(88, 36, 88, 92, 128, 124);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(8, 64);
  ctx.lineTo(248, 64);
  ctx.stroke();
  ballMaterial.mat = toon('#ffffff', { map: srgbTexture(canvas) });
  return ballMaterial.mat;
}

function addBall(g, x, y, z) {
  const m = addSphere(g, 0.12, ballMaterial(), x, y, z, 18);
  m.userData.noCast = true;
  return m;
}

function paintFloor() {
  const ppm = 72;
  const w = WOOD.maxX - WOOD.minX;
  const d = WOOD.maxZ - WOOD.minZ;
  const Wpx = Math.round(w * ppm);
  const Hpx = Math.round(d * ppm);
  const canvas = document.createElement('canvas');
  canvas.width = Wpx;
  canvas.height = Hpx;
  const ctx = canvas.getContext('2d');
  const plank = 0.085;
  const n = Math.ceil(w / plank);
  for (let i = 0; i < n; i++) {
    ctx.fillStyle = MAPLE[i % MAPLE.length];
    const x0 = i * plank * ppm;
    ctx.fillRect(x0, 0, Math.ceil(plank * ppm) + 1, Hpx);
  }
  ctx.globalAlpha = 0.35;
  const board = 1.35 * ppm;
  for (let i = 0; i < n; i++) {
    const stagger = (i % 2) * board * 0.5;
    for (let z = -board + stagger; z < Hpx; z += board) {
      ctx.fillStyle = 'rgba(90, 58, 28, 0.16)';
      ctx.fillRect(i * plank * ppm, z, Math.ceil(plank * ppm) + 1, 1);
    }
  }
  ctx.globalAlpha = 1;

  const X = (x) => (x - WOOD.minX) * ppm;
  const Y = (z) => (z - WOOD.minZ) * ppm;

  ctx.fillStyle = KEY;
  for (const sign of [-1, 1]) {
    const k = keyRect(sign);
    ctx.fillRect(X(k.x0), Y(k.z0), (k.x1 - k.x0) * ppm, (k.z1 - k.z0) * ppm);
  }

  ctx.fillStyle = LINE;
  for (const r of straightMarks()) {
    ctx.fillRect(X(r.x0), Y(r.z0), Math.max(1, (r.x1 - r.x0) * ppm), Math.max(1, (r.z1 - r.z0) * ppm));
  }

  ctx.strokeStyle = LINE;
  ctx.lineWidth = COURT.line * ppm;
  const strokeArc = (sign, radiusOuter, a0, a1, dashed) => {
    const b = basketCenter(sign);
    const dir = -sign;
    const r = radiusOuter - COURT.line / 2;
    ctx.beginPath();
    const steps = 48;
    for (let i = 0; i <= steps; i++) {
      const a = a0 + ((a1 - a0) * i) / steps;
      const x = Math.sin(a) * r;
      const z = b.z + dir * Math.cos(a) * r;
      const px = X(x);
      const py = Y(z);
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.setLineDash(dashed ? [0.16 * ppm, 0.16 * ppm] : []);
    ctx.stroke();
    ctx.setLineDash([]);
  };

  for (const sign of [-1, 1]) {
    const tp = threePoint(sign);
    strokeArc(sign, tp.radius, -tp.theta, tp.theta, false);
    strokeArc(sign, COURT.noChargeRadius, -Math.PI / 2, Math.PI / 2, false);
    const ft = freeThrow(sign);
    ctx.beginPath();
    const steps = 40;
    const cZ = ft.centerZ;
    const dir = -sign;
    const r = COURT.freeThrowRadius - COURT.line / 2;
    for (const dashed of [false, true]) {
      ctx.beginPath();
      const a0 = dashed ? Math.PI / 2 : -Math.PI / 2;
      const a1 = dashed ? Math.PI * 1.5 : Math.PI / 2;
      for (let i = 0; i <= steps; i++) {
        const a = a0 + ((a1 - a0) * i) / steps;
        const x = Math.sin(a) * r;
        const z = cZ + dir * Math.cos(a) * r;
        const px = X(x);
        const py = Y(z);
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.setLineDash(dashed ? [0.18 * ppm, 0.2 * ppm] : []);
      ctx.stroke();
    }
    ctx.setLineDash([]);
  }

  // Centre circle, outer radius 1.80.
  ctx.beginPath();
  const cr = COURT.centerRadius - COURT.line / 2;
  const steps = 64;
  for (let i = 0; i <= steps; i++) {
    const a = (i / steps) * Math.PI * 2;
    const px = X(Math.cos(a) * cr);
    const py = Y(Math.sin(a) * cr);
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.stroke();

  // Bench-area ticks on the scorer side, outside the sideline, inside the runoff.
  ctx.fillStyle = LINE;
  for (const z of [2.6, 9.8, -9.8, -2.6]) {
    ctx.fillRect(X(7.5), Y(z - 0.025), 2 * ppm, 0.05 * ppm);
  }

  return srgbTexture(canvas);
}

function paintWalk(width, depth) {
  const ppm = 48;
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(64, Math.round(width * ppm));
  canvas.height = Math.max(64, Math.round(depth * ppm));
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = WALK;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = WALK_GROUT;
  ctx.lineWidth = 2;
  const tile = 0.6 * ppm;
  for (let x = tile; x < canvas.width; x += tile) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, canvas.height);
    ctx.stroke();
  }
  for (let y = tile; y < canvas.height; y += tile) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(canvas.width, y);
    ctx.stroke();
  }
  return srgbTexture(canvas);
}

function backboardTexture() {
  const w = 720;
  const h = 420;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#e7f3f7';
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = '#fbfcfd';
  ctx.lineWidth = Math.round((0.05 / COURT.backboardW) * w);
  const inset = ctx.lineWidth;
  ctx.strokeRect(inset, inset, w - inset * 2, h - inset * 2);
  const tw = (COURT.targetW / COURT.backboardW) * w;
  const th = (COURT.targetH / COURT.backboardH) * h;
  const bottom = (COURT.targetAboveBottom / COURT.backboardH) * h;
  ctx.strokeRect((w - tw) / 2, h - bottom - th, tw, th);
  return srgbTexture(canvas);
}

function scoreTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 384;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#2c3c52';
  ctx.fillRect(0, 0, 1024, 384);
  ctx.fillStyle = '#f7f1e6';
  ctx.font = '600 54px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.fillText('HOME', 220, 120);
  ctx.fillText('GUEST', 804, 120);
  ctx.font = '700 120px Georgia, serif';
  ctx.fillStyle = '#f2c14e';
  ctx.fillText('00', 220, 280);
  ctx.fillText('00', 804, 280);
  ctx.fillStyle = '#f7f4ee';
  ctx.font = '700 92px Georgia, serif';
  ctx.fillText('8:00', 512, 230);
  ctx.font = '500 28px Georgia, serif';
  ctx.fillStyle = '#d7e6ec';
  ctx.fillText('COURT 2', 512, 80);
  return srgbTexture(canvas);
}

function wordTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 320;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#f4efe6';
  ctx.fillRect(0, 0, 1024, 320);
  ctx.fillStyle = '#8d4038';
  ctx.fillRect(0, 0, 18, 320);
  ctx.fillRect(1006, 0, 18, 320);
  ctx.fillStyle = '#1e4f86';
  ctx.font = '650 92px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('COURT 2', 512, 130);
  ctx.font = '500 36px Georgia, serif';
  ctx.fillStyle = '#8d4038';
  ctx.fillText('PRACTICE HALL', 512, 220);
  return srgbTexture(canvas);
}

let blobTex;
function shadowBlob(g, x, z, w, d, opacity = 0.34) {
  if (!blobTex) {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    const grd = ctx.createRadialGradient(64, 64, 8, 64, 64, 62);
    grd.addColorStop(0, 'rgba(0,0,0,0.55)');
    grd.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, 128, 128);
    blobTex = new THREE.CanvasTexture(canvas);
    blobTex.colorSpace = THREE.NoColorSpace;
  }
  const mat = new THREE.MeshBasicMaterial({
    map: blobTex, transparent: true, opacity, depthWrite: false, color: 0x2a241c,
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, d), mat);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set(x, 0.025, z);
  mesh.userData.keepMaterial = true;
  mesh.userData.noCast = true;
  mesh.userData.noReceive = true;
  mesh.renderOrder = 2;
  g.add(mesh);
}

function makeHoop(sign) {
  const g = new THREE.Group();
  g.name = sign > 0 ? 'hoop_near' : 'hoop_far';
  const faceZ = backboardFaceZ(sign);
  const ring = ringCenter(sign);
  const bottom = backboardBottomY();
  const glassMap = backboardTexture();
  const glassMat = toon('#f7fbfd', {
    map: glassMap,
    emissive: '#d5e6ee',
    emissiveMap: glassMap,
    emissiveIntensity: 0.55,
    side: THREE.DoubleSide,
  });
  const face = new THREE.Mesh(new THREE.PlaneGeometry(COURT.backboardW, COURT.backboardH), glassMat);
  face.position.set(0, bottom + COURT.backboardH / 2, faceZ);
  if (sign > 0) face.rotation.y = Math.PI;
  face.userData.noCast = true;
  g.add(face);

  const pad = toon(PAD);
  const steel = toon(STEEL);
  const dark = toon(STEEL_DARK);
  const inward = -sign;
  const boardZ = faceZ + sign * 0.03;
  addBox(g, COURT.backboardW + 0.08, 0.055, 0.07, pad, 0, bottom - 0.01, boardZ);
  for (const x of [-COURT.backboardW / 2 - 0.01, COURT.backboardW / 2 + 0.01]) {
    addBox(g, 0.05, 0.42, 0.06, pad, x, bottom + 0.18, boardZ);
  }
  addBox(g, COURT.backboardW + 0.02, 0.04, 0.045, steel, 0, bottom + COURT.backboardH + 0.02, boardZ);

  const wallZ = sign * (half().L + COURT.runoff + 0.08);
  const armY = bottom + COURT.backboardH + 0.06;
  const armZ0 = faceZ + sign * 0.05;
  const armLen = Math.abs(wallZ - armZ0);
  const arm = addBox(g, 0.09, 0.07, armLen, steel, 0, armY, (wallZ + armZ0) / 2);
  arm.userData.noCast = true;
  const sleeve = addBox(g, 0.16, 0.09, 0.55, pad, 0, armY - 0.01, armZ0 + sign * 0.32);
  sleeve.userData.noCast = true;
  addBox(g, 0.28, 0.55, 0.08, dark, 0, armY - 0.18, wallZ - sign * 0.02);
  const brace = addBox(g, 0.05, 0.05, armLen * 0.55, steel, 0, armY - 0.45, wallZ - sign * armLen * 0.28);
  brace.userData.noCast = true;

  const rim = new THREE.Mesh(new THREE.TorusGeometry(COURT.ringInner / 2 + COURT.ringTube / 2, COURT.ringTube / 2, 8, 28), toon(RIM));
  rim.rotation.x = Math.PI / 2;
  rim.position.set(ring.x, ring.y, ring.z);
  rim.name = sign > 0 ? 'ring_near' : 'ring_far';
  g.add(rim);
  const plate = addBox(g, 0.16, 0.035, 0.1, steel, 0, ring.y + 0.02, faceZ + inward * 0.06);
  plate.userData.noCast = true;

  const cord = toon('#f3efe6');
  const n = 12;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const topR = COURT.ringInner / 2 - 0.01;
    const botR = 0.1;
    const len = 0.42;
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, len, 5), cord);
    const mx = Math.cos(a) * ((topR + botR) / 2);
    const mz = Math.sin(a) * ((topR + botR) / 2);
    mesh.position.set(ring.x + mx, ring.y - len / 2, ring.z + mz);
    mesh.rotation.z = Math.cos(a) * 0.28;
    mesh.rotation.x = -Math.sin(a) * 0.28;
    mesh.userData.noCast = true;
    g.add(mesh);
  }
  for (const [drop, rad] of [[0.14, 0.19], [0.27, 0.15], [0.39, 0.11]]) {
    const hoop = new THREE.Mesh(new THREE.TorusGeometry(rad, 0.004, 6, 20), cord);
    hoop.rotation.x = Math.PI / 2;
    hoop.position.set(ring.x, ring.y - drop, ring.z);
    hoop.userData.noCast = true;
    g.add(hoop);
  }
  return g;
}

function makeTeamBench(spec) {
  const g = new THREE.Group();
  g.name = spec.id;
  const pad = toon(spec.color);
  const steel = toon(STEEL);
  const seatY = 0.43;
  const { len, depth } = spec;
  const seat = addBox(g, depth - 0.1, 0.055, len - 0.06, pad, 0.02, seatY, 0);
  seat.userData.noCast = true;
  const nose = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, len - 0.08, 12), pad);
  nose.rotation.x = Math.PI / 2;
  nose.position.set(-depth / 2 + 0.06, seatY, 0);
  nose.userData.noCast = true;
  g.add(nose);
  const back = addBox(g, 0.055, 0.34, len - 0.1, pad, depth / 2 - 0.07, 0.7, 0);
  back.rotation.z = -0.12;
  for (let i = 0; i < 5; i++) {
    const tz = -len / 2 + 0.35 + i * ((len - 0.7) / 4);
    addBox(g, 0.035, seatY - 0.05, 0.035, steel, -depth / 2 + 0.09, (seatY - 0.05) / 2, tz);
    addBox(g, 0.04, 0.86, 0.04, steel, depth / 2 - 0.08, 0.43, tz);
  }
  addBox(g, 0.03, 0.03, len - 0.5, steel, 0.02, 0.14, 0);
  addBox(g, depth - 0.08, 0.025, 0.025, steel, 0, 0.22, 0);
  for (const tz of [-len * 0.32, len * 0.18]) {
    const towel = addBox(g, 0.22, 0.025, 0.36, toon('#f4efe6'), -0.02, seatY + 0.045, tz);
    towel.userData.noCast = true;
  }
  g.position.set(spec.x, 0, spec.z);
  return g;
}

function makeTieBench(spec) {
  const g = new THREE.Group();
  g.name = spec.id;
  const wood = toon(spec.color || '#b8894e');
  const steel = toon(STEEL);
  const seatY = 0.45;
  const { len, depth } = spec;
  const seat = addBox(g, depth, 0.045, len, wood, 0, seatY, 0);
  seat.userData.noCast = true;
  const nose = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, len - 0.06, 10), wood);
  nose.rotation.x = Math.PI / 2;
  nose.position.set(-depth / 2 + 0.02, seatY, 0);
  nose.userData.noCast = true;
  g.add(nose);
  const back = addBox(g, 0.04, 0.26, len - 0.1, wood, depth / 2 - 0.035, seatY + 0.14, 0);
  back.userData.noCast = true;
  for (const tz of [-len * 0.38, -len * 0.12, len * 0.14, len * 0.38]) {
    addBox(g, 0.035, seatY - 0.04, 0.035, steel, -depth / 2 + 0.08, (seatY - 0.04) / 2, tz);
    addBox(g, 0.035, 0.62, 0.035, steel, depth / 2 - 0.05, 0.31, tz);
  }
  addBox(g, 0.025, 0.025, len - 0.4, steel, 0, 0.16, 0);
  g.rotation.y = Math.PI;
  g.position.set(spec.x, 0, spec.z);
  return g;
}

function makeWallPad(spec) {
  const g = new THREE.Group();
  g.name = spec.id;
  const vinyl = toon('#1e4f86');
  const edge = toon('#163e6b');
  const face = addBox(g, spec.d, spec.h, spec.len, vinyl, 0, 0, 0);
  face.userData.noCast = true;
  addBox(g, spec.d * 0.45, spec.h + 0.05, 0.05, edge, spec.d * 0.15, 0, spec.len / 2);
  addBox(g, spec.d * 0.45, spec.h + 0.05, 0.05, edge, spec.d * 0.15, 0, -spec.len / 2);
  addBox(g, spec.d * 0.45, 0.05, spec.len, edge, spec.d * 0.15, spec.h / 2, 0);
  addBox(g, spec.d * 0.45, 0.05, spec.len, edge, spec.d * 0.15, -spec.h / 2, 0);
  const stitch = addBox(g, 0.012, 0.018, spec.len - 0.16, toon('#d5e3f0'), spec.d / 2 + 0.002, 0.04, 0);
  stitch.userData.noCast = true;
  g.position.set(spec.x, spec.y, spec.z);
  return g;
}

function makeBallRack(spec) {
  const g = new THREE.Group();
  g.name = spec.id;
  const steel = toon(STEEL);
  const dark = toon(STEEL_DARK);
  const { w, d, h } = spec;
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      addBox(g, 0.035, h, 0.035, steel, sx * (w / 2 - 0.03), h / 2, sz * (d / 2 - 0.04));
    }
  }
  for (const y of [0.28, 0.62]) {
    const shelf = addBox(g, w - 0.06, 0.02, d - 0.08, dark, 0, y, 0);
    shelf.userData.noCast = true;
    addBox(g, 0.02, 0.02, d, steel, -w / 2 + 0.02, y, 0);
    addBox(g, 0.02, 0.02, d, steel, w / 2 - 0.02, y, 0);
  }
  for (const y of [0.4, 0.74]) {
    for (const z of [-0.42, 0, 0.42]) addBall(g, 0, y, z);
  }
  g.position.set(spec.x, 0, spec.z);
  return g;
}

function makeTable(spec) {
  const g = new THREE.Group();
  g.name = spec.id;
  const top = toon('#6b422c');
  const edge = toon('#8d5a3a');
  const steel = toon(STEEL);
  addBox(g, spec.d, 0.045, spec.w, edge, 0, spec.h - 0.02, 0);
  const vinyl = addBox(g, spec.d - 0.08, 0.008, spec.w - 0.1, toon('#243044'), 0, spec.h + 0.006, 0);
  vinyl.userData.noCast = true;
  const legH = spec.h - 0.05;
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      addBox(g, 0.05, legH, 0.05, steel, sx * (spec.d / 2 - 0.08), legH / 2, sz * (spec.w / 2 - 0.12));
    }
  }
  addBox(g, 0.03, 0.08, spec.w - 0.2, top, spec.d / 2 - 0.04, spec.h - 0.08, 0);
  const sheet = addBox(g, 0.28, 0.004, 0.4, toon('#f7f4ee'), -0.06, spec.h + 0.012, 0.15);
  sheet.userData.noCast = true;
  g.position.set(spec.x, 0, spec.z);
  return g;
}

function makeCart(spec) {
  const g = new THREE.Group();
  g.name = spec.id;
  const steel = toon(STEEL);
  const dark = toon(STEEL_DARK);
  const w = spec.w;
  const d = spec.d;
  const railY = 0.42;
  addBox(g, w, 0.035, 0.035, steel, 0, railY, -d / 2);
  addBox(g, w, 0.035, 0.035, steel, 0, railY, d / 2);
  addBox(g, 0.035, 0.035, d, steel, -w / 2, railY, 0);
  addBox(g, 0.035, 0.035, d, steel, w / 2, railY, 0);
  addBox(g, w - 0.08, 0.02, d - 0.08, toon('#4a4038'), 0, 0.28, 0);
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      addCyl(g, 0.018, 0.018, 0.22, steel, sx * (w / 2 - 0.04), 0.16, sz * (d / 2 - 0.04), 8);
      const wheel = addCyl(g, 0.055, 0.055, 0.03, dark, sx * (w / 2 - 0.02), 0.055, sz * (d / 2 - 0.02), 12);
      wheel.rotation.z = Math.PI / 2;
    }
  }
  for (let i = 0; i < 7; i++) {
    const x = -w / 2 + 0.08 + i * ((w - 0.16) / 6);
    const rod = addCyl(g, 0.008, 0.008, 0.62, steel, x, railY + 0.31, -d / 2 + 0.02, 6);
    rod.userData.noCast = true;
    const rod2 = addCyl(g, 0.008, 0.008, 0.62, steel, x, railY + 0.31, d / 2 - 0.02, 6);
    rod2.userData.noCast = true;
  }
  addBox(g, w, 0.03, 0.03, steel, 0, railY + 0.62, -d / 2);
  addBox(g, w, 0.03, 0.03, steel, 0, railY + 0.62, d / 2);
  const handle = addCyl(g, 0.016, 0.016, w * 0.7, toon('#c5ccd2'), 0, 0.98, -d / 2 - 0.02, 8);
  handle.rotation.z = Math.PI / 2;
  const cols = [-0.24, 0, 0.24];
  const rows = [-0.16, 0.16];
  for (const x of cols) {
    for (const z of rows) {
      addBall(g, x, 0.42, z);
      addBall(g, x, 0.66, z);
    }
  }
  g.position.set(spec.x, 0, spec.z);
  return g;
}

function makeShell(layout) {
  const g = new THREE.Group();
  g.name = 'shell';
  const plaster = toon(PLASTER);
  const dado = toon(DADO);
  const band = toon(DADO_TOP);
  const steel = toon(STEEL);
  const ceilingY = COURT.ceiling;

  const woodW = WOOD.maxX - WOOD.minX;
  const woodD = WOOD.maxZ - WOOD.minZ;
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(woodW, woodD), toon('#e2ba86', { map: paintFloor() }));
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(0, 0.02, 0);
  quiet(floor);
  g.add(floor);

  const walkW = 3.15;
  const walk = new THREE.Mesh(new THREE.PlaneGeometry(walkW, woodD), toon(WALK, { map: paintWalk(walkW, woodD) }));
  walk.rotation.x = -Math.PI / 2;
  walk.position.set(9.5 + walkW / 2, 0.012, 0);
  quiet(walk);
  g.add(walk);

  const storeW = 2.7;
  const store = new THREE.Mesh(new THREE.PlaneGeometry(storeW, woodD), toon(WALK, { map: paintWalk(storeW, woodD) }));
  store.rotation.x = -Math.PI / 2;
  store.position.set(-9.5 - storeW / 2, 0.012, 0);
  quiet(store);
  g.add(store);

  const nosing = addBox(g, 0.06, 0.025, woodD, toon('#b5884e'), 9.53, 0.028, 0);
  quiet(nosing);
  const nosingL = addBox(g, 0.06, 0.025, woodD, toon('#b5884e'), -9.53, 0.028, 0);
  quiet(nosingL);

  const wallH = ceilingY;
  const endX0 = -12.2;
  const endX1 = 9.55;
  const endW = endX1 - endX0;
  for (const z of [-16.16, 16.16]) {
    quiet(addBox(g, endW, 2.2, 0.16, dado, (endX0 + endX1) / 2, 1.1, z));
    quiet(addBox(g, endW, wallH - 2.28, 0.16, plaster, (endX0 + endX1) / 2, 2.28 + (wallH - 2.28) / 2, z));
    quiet(addBox(g, endW, 0.08, 0.18, band, (endX0 + endX1) / 2, 2.24, z));
  }
  quiet(addBox(g, 0.16, 2.2, woodD + 0.3, dado, -12.22, 1.1, 0));
  quiet(addBox(g, 0.16, wallH - 2.28, woodD + 0.3, plaster, -12.22, 2.28 + (wallH - 2.28) / 2, 0));
  quiet(addBox(g, 0.18, 0.08, woodD + 0.3, band, -12.22, 2.24, 0));

  for (let i = 0; i < 7; i++) {
    const z = -13.2 + i * 4.4;
    const pane = addBox(g, 0.04, 1.15, 2.5, toon('#d5e6ea', { emissive: '#d5e6ea', emissiveIntensity: 0.35 }), -12.1, 5.55, z);
    pane.userData.noCast = true;
    quiet(addBox(g, 0.06, 1.25, 0.06, steel, -12.08, 5.55, z - 1.28));
    quiet(addBox(g, 0.06, 1.25, 0.06, steel, -12.08, 5.55, z + 1.28));
  }

  quiet(addBox(g, 21.6, 0.1, woodD + 0.4, toon('#f7f3ea'), -1.6, ceilingY - 0.05, 0));
  quiet(addBox(g, 0.22, 0.42, woodD + 0.2, toon('#4a453e'), 12.55, 7.15, 0));
  for (const z of [-8, 8]) {
    const post = addBox(g, 0.1, 7.15, 0.1, steel, 12.45, 3.55, z);
    post.userData.noReceive = true;
  }

  for (const z of [-12, -6, 0, 6, 12]) {
    quiet(addBox(g, 20.2, 0.06, 0.08, steel, -1.4, 7.22, z));
    quiet(addBox(g, 20.2, 0.05, 0.06, steel, -1.4, 6.72, z));
    for (const x of [-8, -3, 2, 7]) {
      const diag = addBox(g, 0.04, 0.04, 1.35, steel, x, 6.97, z);
      diag.rotation.x = 0.55;
      quiet(diag);
    }
  }

  const lamps = layout.lights?.points || [];
  for (const p of lamps) {
    const housing = addBox(g, 0.34, 0.08, 1.7, toon('#8a8174'), p.position[0], p.position[1] + 0.08, p.position[2]);
    quiet(housing);
    const glow = addBox(
      g, 0.22, 0.02, 1.5,
      toon('#fff6e4', { emissive: '#fff6e4', emissiveIntensity: 1 }),
      p.position[0], p.position[1] + 0.02, p.position[2],
    );
    glow.userData.noCast = true;
  }

  const wordMat = toon('#f4efe6', { map: wordTexture(), emissive: '#f4efe6', emissiveIntensity: 0.25 });
  const word = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 0.78), wordMat);
  word.position.set(-12.1, 4.05, -1.1);
  word.rotation.y = Math.PI / 2;
  word.userData.noCast = true;
  g.add(word);
  const scoreMap = scoreTexture();
  const scoreMat = toon('#f7f1e6', {
    map: scoreMap,
    emissive: '#f4efe4',
    emissiveMap: scoreMap,
    emissiveIntensity: 0.85,
  });
  const board = new THREE.Mesh(new THREE.PlaneGeometry(2.5, 0.92), scoreMat);
  board.name = 'scoreboard';
  board.position.set(-4.2, 5.2, -16.05);
  board.userData.noCast = true;
  g.add(board);

  return g;
}

function makeProcedural(layout) {
  const g = new THREE.Group();
  g.name = 'procedural';
  g.add(makeHoop(1));
  g.add(makeHoop(-1));
  for (const bench of layout.zones.benches) {
    g.add(makeTeamBench(bench));
    shadowBlob(g, bench.x, bench.z, bench.depth + 0.3, bench.len * 0.92, 0.32);
  }
  g.add(makeTable(layout.zones.table));
  shadowBlob(g, layout.zones.table.x, layout.zones.table.z, layout.zones.table.d + 0.2, layout.zones.table.w, 0.3);
  g.add(makeCart(layout.zones.cart));
  shadowBlob(g, layout.zones.cart.x, layout.zones.cart.z, layout.zones.cart.w + 0.2, layout.zones.cart.d + 0.25, 0.36);

  for (const ball of layout.zones.looseBalls) addBall(g, ball.x, 0.12, ball.z);

  const tie = layout.zones.tieBench;
  g.add(makeTieBench(tie));
  shadowBlob(g, tie.x, tie.z, tie.depth + 0.15, tie.len * 0.92, 0.28);
  g.add(makeWallPad(layout.zones.wallPad));
  const rack = layout.zones.ballRack;
  g.add(makeBallRack(rack));
  shadowBlob(g, rack.x, rack.z, rack.w + 0.15, rack.d * 0.9, 0.3);

  for (const shelf of layout.zones.shelfBalls) {
    addBall(g, shelf.x, shelf.y, shelf.z);
  }
  const pinny = [NAVY, MAROON, '#f4efe6', NAVY];
  layout.zones.pinnies.forEach((p, i) => {
    const m = addBox(g, 0.28, 0.045, 0.22, toon(pinny[i % pinny.length]), p.x, p.y, p.z);
    m.userData.noCast = true;
  });

  for (const c of layout.zones.cones) {
    const cone = addCyl(g, 0.02, 0.11, 0.32, toon('#e39a2b'), c.x, 0.16, c.z, 10);
    cone.userData.noCast = true;
  }

  const pot = layout.instances.find((i) => i.id === 'entry_plant');
  addSphere(g, 0.11, toon('#2f6a45'), pot.position[0], pot.position[1] + 0.34, pot.position[2], 12);
  addSphere(g, 0.07, toon('#3e7d52'), pot.position[0] + 0.05, pot.position[1] + 0.42, pot.position[2] + 0.03, 10);

  for (const id of ['coach_home', 'coach_away', 'case_a', 'case_b']) {
    const inst = layout.instances.find((i) => i.id === id);
    const wide = id.startsWith('case') ? 0.7 : 0.55;
    shadowBlob(g, inst.position[0], inst.position[2], wide, id.startsWith('coach') ? 0.5 : 0.9, 0.28);
  }
  return g;
}

boot({
  makeShell,
  makeProcedural,
  readyText: 'ready — court 2 practice hall · drag orbit · U unlit · T toon',
});
