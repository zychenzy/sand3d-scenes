import * as THREE from 'three';
import { boot, toon } from './scene_lib.js';

// Barrel-vault cutaway. Open front (+Z) and open right (+X).
// Metres. Arch springs on the left wall plate and the right colonnade.
const W = 9.4;
const D = 7.6;
const X0 = -4.52;
const SPAN = 9.04;
const SPRING = 2.36;
const RISE = 1.62;
const KNEE = 0.62;
const BACK_Z = -3.72;
const LEFT_X = -4.64;
const RIBS = [-3.66, -1.72, 0.08, 1.88, 3.4];

const BEDS = {
  back: { x0: -4.16, x1: 1.26, z0: -3.5, z1: -2.22, h: 0.52 },
  left: { x0: -4.4, x1: -3.08, z0: -2.02, z1: 0.86, h: 0.46 },
  island: { x0: -2.16, x1: 0.76, z0: -1.68, z1: 0.36, h: 0.5 },
};

const BENCH = { x: 3.22, z: -2.98, len: 2.02, dep: 0.62, surface: 0.93 };

const GEOS = {};
const MATS = {};
let TEX = {};

function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function byId(layout, id) {
  return (layout.instances || []).find((i) => i.id === id);
}

function topY(layout, id) {
  const i = byId(layout, id);
  if (!i) return 0;
  const spec = layout.assets[i.kind];
  const sy = Array.isArray(i.scale) ? (i.scale[1] ?? 1) : (i.scale || 1);
  return i.position[1] + spec.targetHeight * sy;
}

function archHeight(t) {
  return SPRING + Math.sin(Math.PI * t) * RISE;
}

function archPoints(z, n = 16) {
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    pts.push(new THREE.Vector3(X0 + t * SPAN, archHeight(t), z));
  }
  return pts;
}

function canvasTex(canvas, rx = 1, ry = 1) {
  const t = new THREE.CanvasTexture(canvas);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = THREE.RepeatWrapping;
  t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(rx, ry);
  t.anisotropy = 4;
  t.needsUpdate = true;
  return t;
}

function buildTextures() {
  const tile = document.createElement('canvas');
  tile.width = 512;
  tile.height = 512;
  const tg = tile.getContext('2d');
  tg.fillStyle = '#8d6b52';
  tg.fillRect(0, 0, 512, 512);
  const n = 14;
  const s = 512 / n;
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      const v = 150 + ((i * 3 + j * 5) % 5) * 8;
      tg.fillStyle = `rgb(${v + 38}, ${v - 6}, ${v - 42})`;
      tg.fillRect(i * s + 1.5, j * s + 1.5, s - 3, s - 3);
    }
  }

  const brick = document.createElement('canvas');
  brick.width = 128;
  brick.height = 64;
  const bg = brick.getContext('2d');
  bg.fillStyle = '#c9b0a2';
  bg.fillRect(0, 0, 128, 64);
  for (let row = 0; row < 2; row++) {
    const off = row % 2 ? 32 : 0;
    for (let col = -1; col < 3; col++) {
      const shade = 112 + ((row * 2 + col + 4) % 3) * 12;
      bg.fillStyle = `rgb(${shade + 42}, ${shade - 6}, ${shade - 32})`;
      bg.fillRect(col * 64 + off + 2, row * 32 + 2, 58, 26);
    }
  }

  const soil = document.createElement('canvas');
  soil.width = 128;
  soil.height = 128;
  const sg = soil.getContext('2d');
  sg.fillStyle = '#3a2a20';
  sg.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 220; i++) {
    const v = 36 + ((i * 17) % 48);
    sg.fillStyle = `rgb(${v + 18}, ${v}, ${v - 8})`;
    sg.fillRect((i * 47) % 128, (i * 29) % 128, 3, 2);
  }

  const wood = document.createElement('canvas');
  wood.width = 128;
  wood.height = 64;
  const wg = wood.getContext('2d');
  wg.fillStyle = '#7a5236';
  wg.fillRect(0, 0, 128, 64);
  wg.strokeStyle = '#5a3a24';
  wg.lineWidth = 1.4;
  for (let y = 3; y < 64; y += 6) {
    wg.beginPath();
    wg.moveTo(0, y);
    wg.bezierCurveTo(36, y + 2, 84, y - 3, 128, y + 1);
    wg.stroke();
  }

  const rug = document.createElement('canvas');
  rug.width = 256;
  rug.height = 256;
  const rg = rug.getContext('2d');
  rg.fillStyle = '#7a3c38';
  rg.fillRect(0, 0, 256, 256);
  rg.strokeStyle = '#e4c48a';
  rg.lineWidth = 16;
  rg.strokeRect(12, 12, 232, 232);
  rg.strokeStyle = '#5c2c2c';
  rg.lineWidth = 6;
  rg.strokeRect(30, 30, 196, 196);
  rg.strokeStyle = '#c47858';
  rg.beginPath();
  rg.moveTo(128, 48);
  rg.lineTo(208, 128);
  rg.lineTo(128, 208);
  rg.lineTo(48, 128);
  rg.closePath();
  rg.stroke();

  TEX = { tile, brick, soil, wood, rug };
}

function buildMaterials() {
  buildTextures();
  const solid = (color, opts) => toon(color, opts);
  MATS.iron = solid('#2c3532');
  MATS.ironThin = solid('#3c4844');
  MATS.coping = solid('#a56b52');
  MATS.edge = solid('#b08968');
  MATS.bark = solid('#6b4a32');
  MATS.barkDark = solid('#4a3424');
  MATS.stem = solid('#3d4a30');
  MATS.vine = solid('#2f4a28');
  MATS.soil = toon('#ffffff', { map: canvasTex(TEX.soil, 2, 2) });
  MATS.wood = toon('#ffffff', { map: canvasTex(TEX.wood, 3, 1) });
  MATS.woodDark = solid('#5a3a28');
  MATS.cushion = solid('#c45c4e');
  MATS.pillow = solid('#a84848');
  MATS.can = solid('#c5ced2');
  MATS.canDark = solid('#8e989c');
  MATS.hose = solid('#2a312c');
  MATS.stoneA = solid('#c4bba8');
  MATS.stoneB = solid('#b3a892');
  MATS.gravel = solid('#9a917f');
  MATS.moss = solid('#3e6a42');
  MATS.flower = {
    coral: solid('#e07a68'),
    cream: solid('#f3e6c4'),
    pink: solid('#d45d78'),
    gold: solid('#e6c36a'),
  };
  MATS.leaf = {};
  ['#1d4a34', '#2d6a45', '#3e7a48', '#6d8f3c', '#245c40', '#2f6f5a', '#4e8a44', '#1b3d2c'].forEach((c) => {
    MATS.leaf[c] = solid(c, { side: THREE.DoubleSide });
  });
  MATS.glass = solid('#e7f4ef', {
    transparent: true,
    opacity: 0.14,
    side: THREE.DoubleSide,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
  });
  MATS.tile = toon('#ffffff', { map: canvasTex(TEX.tile, 1, 1) });
  MATS.rug = toon('#ffffff', { map: canvasTex(TEX.rug, 1, 1) });
  MATS.bulb = solid('#fff4d2', { emissive: '#ffd18a', emissiveIntensity: 1.2 });
  MATS.packet = [solid('#e6d7a4'), solid('#d4654e'), solid('#dfe8d4')];
}

function brickMat(w, h) {
  const repeatX = Math.max(w / 0.42, 1);
  const repeatY = Math.max(h / 0.16, 1);
  return toon('#ffffff', { map: canvasTex(TEX.brick, repeatX, repeatY) });
}

function leafGeo(kind) {
  if (GEOS[kind]) return GEOS[kind];
  const shape = new THREE.Shape();
  if (kind === 'fern') {
    shape.moveTo(0, -0.5);
    shape.bezierCurveTo(0.18, -0.12, 0.2, 0.28, 0, 0.5);
    shape.bezierCurveTo(-0.2, 0.28, -0.18, -0.12, 0, -0.5);
  } else if (kind === 'heart') {
    shape.moveTo(0, -0.45);
    shape.bezierCurveTo(0.2, -0.1, 0.55, 0.02, 0.4, 0.32);
    shape.bezierCurveTo(0.28, 0.5, 0.06, 0.4, 0, 0.18);
    shape.bezierCurveTo(-0.06, 0.4, -0.28, 0.5, -0.4, 0.32);
    shape.bezierCurveTo(-0.55, 0.02, -0.2, -0.1, 0, -0.45);
  } else if (kind === 'strap') {
    shape.moveTo(0, -0.5);
    shape.lineTo(0.09, -0.15);
    shape.lineTo(0.045, 0.38);
    shape.lineTo(0, 0.5);
    shape.lineTo(-0.045, 0.38);
    shape.lineTo(-0.09, -0.15);
    shape.closePath();
  } else {
    shape.moveTo(0, -0.5);
    shape.bezierCurveTo(0.42, -0.18, 0.48, 0.3, 0.02, 0.5);
    shape.bezierCurveTo(-0.44, 0.3, -0.42, -0.18, 0, -0.5);
  }
  const geo = new THREE.ExtrudeGeometry(shape, { depth: 0.028, bevelEnabled: false, curveSegments: 5 });
  geo.translate(0, 0, -0.014);
  geo.computeVertexNormals();
  GEOS[kind] = geo;
  return geo;
}

function box(g, w, h, d, material, x, y, z, shadow = 'both') {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  m.position.set(x, y, z);
  m.userData.shadow = shadow;
  g.add(m);
  return m;
}

function cyl(g, rTop, rBot, h, material, x, y, z, seg = 8, shadow = 'both') {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBot, h, seg), material);
  m.position.set(x, y, z);
  m.userData.shadow = shadow;
  g.add(m);
  return m;
}

function ball(g, r, material, x, y, z, shadow = 'both') {
  if (!GEOS.sphere) GEOS.sphere = new THREE.SphereGeometry(1, 8, 6);
  const m = new THREE.Mesh(GEOS.sphere, material);
  m.scale.setScalar(r);
  m.position.set(x, y, z);
  m.userData.shadow = shadow;
  g.add(m);
  return m;
}

function branch(g, a, b, r, material) {
  const dir = new THREE.Vector3(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
  const len = dir.length();
  if (len < 1e-4) return null;
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.72, r, len, 6), material);
  m.position.set((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
  m.userData.shadow = 'both';
  g.add(m);
  return m;
}

function tube(g, pts, radius, material, segs, shadow = 'both') {
  const curve = new THREE.CatmullRomCurve3(pts);
  const m = new THREE.Mesh(new THREE.TubeGeometry(curve, segs, radius, 5, false), material);
  m.userData.shadow = shadow;
  g.add(m);
  return m;
}

function alignLeaf(mesh, yDir, zHint) {
  const y = yDir.clone().normalize();
  const z = zHint.clone();
  if (Math.abs(z.dot(y)) > 0.96) z.set(0, 0, 1);
  z.addScaledVector(y, -z.dot(y));
  if (z.lengthSq() < 1e-8) z.set(1, 0, 0);
  z.normalize();
  const x = new THREE.Vector3().crossVectors(y, z).normalize();
  mesh.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(x, y, z));
}

function addLeaf(g, kind, color, x, y, z, opts = {}) {
  const material = MATS.leaf[color] || MATS.leaf['#2d6a45'];
  const mesh = new THREE.Mesh(leafGeo(kind), material);
  mesh.position.set(x, y, z);
  const s = opts.s ?? 0.3;
  mesh.scale.set(s, opts.sy ?? s, s);
  if (opts.dir) {
    alignLeaf(mesh, opts.dir, opts.hint || new THREE.Vector3(0, 1, 0));
    if (opts.roll) mesh.rotateZ(opts.roll);
  } else if (opts.rot) {
    mesh.rotation.set(opts.rot[0], opts.rot[1], opts.rot[2]);
  }
  mesh.userData.shadow = opts.shadow || 'both';
  g.add(mesh);
  return mesh;
}

function vaultGlass(g) {
  const positions = [];
  const n = 12;
  for (let b = 0; b < RIBS.length - 1; b++) {
    for (let i = 0; i < n; i++) {
      const t0 = i / n;
      const t1 = (i + 1) / n;
      const z0 = RIBS[b];
      const z1 = RIBS[b + 1];
      const a = [X0 + t0 * SPAN, archHeight(t0), z0];
      const c = [X0 + t1 * SPAN, archHeight(t1), z0];
      const d = [X0 + t1 * SPAN, archHeight(t1), z1];
      const e = [X0 + t0 * SPAN, archHeight(t0), z1];
      positions.push(...a, ...c, ...d, ...a, ...d, ...e);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.computeVertexNormals();
  const mesh = new THREE.Mesh(geo, MATS.glass);
  mesh.userData.shadow = 'none';
  g.add(mesh);
}

function gableGlass(g) {
  const shape = new THREE.Shape();
  shape.moveTo(X0, KNEE);
  for (let i = 0; i <= 18; i++) {
    const t = i / 18;
    shape.lineTo(X0 + t * SPAN, archHeight(t));
  }
  shape.lineTo(X0 + SPAN, KNEE);
  shape.lineTo(X0, KNEE);
  const mesh = new THREE.Mesh(new THREE.ShapeGeometry(shape, 6), MATS.glass);
  mesh.position.z = BACK_Z;
  mesh.userData.shadow = 'none';
  g.add(mesh);
}

function leftGlass(g) {
  const height = SPRING - KNEE;
  const depth = RIBS[RIBS.length - 1] - RIBS[0];
  const zc = (RIBS[0] + RIBS[RIBS.length - 1]) / 2;
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(depth, height), MATS.glass);
  mesh.position.set(LEFT_X, KNEE + height / 2, zc);
  mesh.rotation.y = Math.PI / 2;
  mesh.userData.shadow = 'none';
  g.add(mesh);
}

function structure(g) {
  RIBS.forEach((z, i) => {
    tube(g, archPoints(z), i % 2 === 0 ? 0.032 : 0.03, MATS.iron, 28);
  });
  for (let b = 0; b < RIBS.length - 1; b++) {
    const z = (RIBS[b] + RIBS[b + 1]) / 2;
    tube(g, archPoints(z, 12), 0.014, MATS.ironThin, 18, 'none');
  }
  const z0 = RIBS[0];
  const z1 = RIBS[RIBS.length - 1];
  const zc = (z0 + z1) / 2;
  const len = z1 - z0;
  [0.5, 0.27, 0.73].forEach((t) => {
    box(g, 0.04, 0.04, len, MATS.iron, X0 + t * SPAN, archHeight(t), zc, t === 0.5 ? 'both' : 'receive');
  });
  // Wall plate and right eave beam.
  box(g, 0.08, 0.08, len + 0.2, MATS.iron, LEFT_X + 0.04, SPRING, zc);
  box(g, 0.07, 0.07, len + 0.2, MATS.iron, X0 + SPAN, SPRING, zc);
  // Right colonnade — the cutaway side, glass omitted.
  RIBS.slice(1).forEach((z) => {
    cyl(g, 0.055, 0.06, SPRING - 0.08, MATS.iron, X0 + SPAN, (SPRING - 0.08) / 2, z, 8);
    cyl(g, 0.09, 0.09, 0.05, MATS.iron, X0 + SPAN, 0.025, z, 8);
    cyl(g, 0.08, 0.07, 0.07, MATS.iron, X0 + SPAN, SPRING - 0.04, z, 8);
  });
  ball(g, 0.055, MATS.iron, 0, archHeight(0.5) + 0.05, RIBS[0], 'cast');

  // Knee walls and corner piers.
  const backLen = SPAN;
  box(g, backLen, KNEE, 0.12, brickMat(backLen, KNEE), 0, KNEE / 2, BACK_Z);
  box(g, backLen, 0.05, 0.16, MATS.coping, 0, KNEE + 0.02, BACK_Z);
  const leftLen = RIBS[RIBS.length - 1] - RIBS[0] + 0.4;
  const leftZ = (RIBS[0] + RIBS[RIBS.length - 1]) / 2;
  box(g, 0.12, KNEE, leftLen, brickMat(leftLen, KNEE), LEFT_X, KNEE / 2, leftZ);
  box(g, 0.16, 0.05, leftLen, MATS.coping, LEFT_X, KNEE + 0.02, leftZ);

  function pier(x, z) {
    box(g, 0.34, SPRING, 0.34, brickMat(0.34, SPRING), x, SPRING / 2, z);
    box(g, 0.42, 0.06, 0.42, MATS.coping, x, SPRING - 0.03, z);
  }
  pier(-4.5, -3.64);
  pier(4.5, -3.64);
  pier(-4.5, 3.48);

  // Mullions.
  for (let z = RIBS[0] + 0.55; z < RIBS[RIBS.length - 1]; z += 0.85) {
    box(g, 0.035, SPRING - KNEE, 0.035, MATS.ironThin, LEFT_X, (SPRING + KNEE) / 2, z);
  }
  box(g, 0.03, 0.03, leftLen, MATS.ironThin, LEFT_X, 1.5, leftZ);
  for (let x = X0 + 0.7; x < X0 + SPAN - 0.4; x += 0.85) {
    const t = (x - X0) / SPAN;
    const h = archHeight(t) - KNEE - 0.06;
    if (h > 0.3) box(g, 0.032, h, 0.032, MATS.ironThin, x, KNEE + h / 2, BACK_Z + 0.02);
  }
  box(g, SPAN - 0.4, 0.03, 0.03, MATS.ironThin, 0, 1.5, BACK_Z + 0.02);

  // Gutter and downpipe at the front-left pier.
  box(g, 0.06, 0.05, leftLen, MATS.canDark, LEFT_X + 0.08, SPRING + 0.05, leftZ, 'cast');
  cyl(g, 0.03, 0.03, SPRING - 0.2, MATS.canDark, -4.32, (SPRING - 0.2) / 2, 3.3, 6, 'cast');
}

function floor(g) {
  const edge = MATS.edge;
  const slab = new THREE.Mesh(new THREE.BoxGeometry(W, 0.08, D), [edge, edge, MATS.tile, edge, edge, edge]);
  slab.position.y = -0.04;
  slab.userData.shadow = 'receive';
  g.add(slab);

  const slabs = [];
  for (let i = 0; i < 8; i++) {
    slabs.push([1.42 + (i % 2 ? 0.035 : -0.02), -1.55 + i * 0.66, i % 2 ? 0.012 : -0.008]);
  }
  slabs.push([0.62, 2.18, 0.01], [-0.12, 2.24, -0.008]);
  slabs.forEach(([x, z, yaw], i) => {
    const w = i >= 8 ? 0.72 : 1.02;
    const d = i >= 8 ? 0.48 : 0.58;
    const m = box(g, w, 0.035, d, i % 2 ? MATS.stoneA : MATS.stoneB, x, 0.026, z, 'both');
    m.rotation.y = yaw;
  });
}

function raisedBed(g, spec) {
  const { x0, x1, z0, z1, h } = spec;
  const t = 0.09;
  const cx = (x0 + x1) / 2;
  const cz = (z0 + z1) / 2;
  const w = x1 - x0;
  const d = z1 - z0;
  const y = h / 2;
  box(g, w, h, t, brickMat(w, h), cx, y, z0 + t / 2);
  box(g, w, h, t, brickMat(w, h), cx, y, z1 - t / 2);
  box(g, t, h, d - t * 2, brickMat(d, h), x0 + t / 2, y, cz);
  box(g, t, h, d - t * 2, brickMat(d, h), x1 - t / 2, y, cz);
  const c = 0.045;
  const cy = h + c / 2 - 0.004;
  box(g, w + 0.03, c, t + 0.03, MATS.coping, cx, cy, z0 + t / 2);
  box(g, w + 0.03, c, t + 0.03, MATS.coping, cx, cy, z1 - t / 2);
  box(g, t + 0.03, c, d - t, MATS.coping, x0 + t / 2, cy, cz);
  box(g, t + 0.03, c, d - t, MATS.coping, x1 - t / 2, cy, cz);
  box(g, w - t * 2 - 0.02, 0.08, d - t * 2 - 0.02, MATS.soil, cx, h - 0.055, cz, 'receive');
  box(g, w + 0.12, 0.018, d + 0.12, MATS.gravel, cx, 0.012, cz, 'receive');
  return h - 0.015;
}

function pottingBench(g) {
  const { x, z, len, dep, surface } = BENCH;
  const topT = 0.05;
  const cy = surface - topT / 2;
  const under = surface - topT;
  box(g, len, topT, dep, MATS.wood, x, cy, z);
  const ix = len / 2 - 0.11;
  const iz = dep / 2 - 0.08;
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      box(g, 0.07, under, 0.07, MATS.woodDark, x + sx * ix, under / 2, z + sz * iz);
      box(g, 0.11, 0.028, 0.11, MATS.woodDark, x + sx * ix, 0.014, z + sz * iz);
    }
  }
  for (let i = 0; i < 4; i++) {
    const zz = z - dep / 2 + 0.1 + i * ((dep - 0.18) / 3);
    box(g, len - 0.3, 0.018, 0.055, MATS.wood, x, 0.28, zz);
  }
  box(g, len - 0.08, 0.08, 0.02, MATS.woodDark, x, under - 0.06, z + dep / 2 - 0.015);
  for (let i = 0; i < 3; i++) {
    const dx = x - 0.64 + i * 0.64;
    box(g, 0.46, 0.16, 0.03, MATS.wood, dx, under - 0.18, z + dep / 2);
    cyl(g, 0.012, 0.012, 0.02, MATS.canDark, dx, under - 0.18, z + dep / 2 + 0.02, 6, 'cast');
  }
  box(g, len, 0.13, 0.025, MATS.woodDark, x, surface + 0.065, z - dep / 2 + 0.02);
  for (let i = 0; i < 3; i++) {
    cyl(g, 0.012, 0.012, 0.07, MATS.iron, x - 0.55 + i * 0.38, surface + 0.08, z - dep / 2 + 0.05, 6, 'cast');
  }
  // Soil tray and a trowel — work in progress, not a bare top.
  box(g, 0.36, 0.035, 0.24, MATS.woodDark, x + 0.15, surface + 0.02, z - 0.08);
  box(g, 0.3, 0.02, 0.18, MATS.soil, x + 0.15, surface + 0.04, z - 0.08, 'receive');
  const trowel = box(g, 0.05, 0.012, 0.22, MATS.can, x - 0.15, surface + 0.02, z + 0.08, 'cast');
  trowel.rotation.y = 0.5;
  MATS.packet.forEach((material, i) => {
    const p = box(g, 0.1, 0.15, 0.008, material, x - 0.72 + i * 0.14, surface + 0.1, z - 0.2, 'cast');
    p.rotation.x = -0.55;
  });

  // Galvanized can and a coiled hose on the floor beside the bench.
  const cx = x - len / 2 - 0.02;
  const cz = z + 0.15;
  cyl(g, 0.1, 0.12, 0.2, MATS.can, cx, 0.12, cz, 10);
  cyl(g, 0.055, 0.07, 0.03, MATS.canDark, cx, 0.235, cz, 8);
  const spout = cyl(g, 0.02, 0.028, 0.22, MATS.canDark, cx + 0.12, 0.2, cz, 6);
  spout.rotation.z = -Math.PI / 2.6;
  const handle = new THREE.Mesh(new THREE.TorusGeometry(0.075, 0.01, 5, 10, Math.PI), MATS.canDark);
  handle.position.set(cx - 0.02, 0.2, cz);
  handle.rotation.y = Math.PI / 2;
  handle.userData.shadow = 'cast';
  g.add(handle);

  const hosePts = [];
  for (let i = 0; i < 22; i++) {
    const a = (i / 22) * Math.PI * 2.15;
    hosePts.push(new THREE.Vector3(cx + 0.28 + Math.cos(a) * 0.22, 0.03 + (i % 4) * 0.008, cz + 0.28 + Math.sin(a) * 0.14));
  }
  tube(g, hosePts, 0.016, MATS.hose, 28);

  // Brackets so the wall shelf reads as hung on the gable, not floating.
  for (const dx of [-0.36, 0.36]) {
    box(g, 0.045, 0.08, 0.2, MATS.woodDark, 3.15 + dx, 1.4, -3.5, 'cast');
    const brace = box(g, 0.03, 0.2, 0.03, MATS.woodDark, 3.15 + dx, 1.32, -3.46, 'cast');
    brace.rotation.x = 0.7;
  }

  // Tap on the back-right pier.
  cyl(g, 0.02, 0.02, 0.16, MATS.can, 4.28, 1.05, -3.48, 6, 'cast');
  const tap = cyl(g, 0.016, 0.016, 0.1, MATS.canDark, 4.22, 1.02, -3.48, 6, 'cast');
  tap.rotation.z = Math.PI / 2;
}

function leafCloud(g, x, y, z, radius, count, seed, scale) {
  const rand = rng(seed);
  const colors = ['#1d4a34', '#2d6a45', '#3e7a48', '#6d8f3c', '#245c40'];
  for (let i = 0; i < count; i++) {
    const theta = rand() * Math.PI * 2;
    const phi = Math.acos(2 * rand() - 1);
    const r = radius * (0.48 + rand() * 0.55);
    const s = scale * (0.72 + rand() * 0.5);
    addLeaf(g, 'broad', colors[i % colors.length],
      x + r * Math.sin(phi) * Math.cos(theta),
      y + r * Math.cos(phi) * 0.7,
      z + r * Math.sin(phi) * Math.sin(theta),
      {
        s,
        sy: s * (0.85 + rand() * 0.4),
        rot: [-0.3 - rand() * 1.1, rand() * 6.2, (rand() - 0.5) * 1.1],
        shadow: 'both',
      });
  }
}

function canopy(g, x, y, z) {
  cyl(g, 0.09, 0.125, 0.72, MATS.bark, x, y + 0.36, z, 8);
  cyl(g, 0.065, 0.09, 0.62, MATS.bark, x + 0.03, y + 0.98, z - 0.02, 7);
  cyl(g, 0.045, 0.065, 0.42, MATS.barkDark, x - 0.02, y + 1.46, z + 0.02, 6);
  branch(g, [x, y + 1.15, z], [x + 0.48, y + 1.72, z + 0.12], 0.032, MATS.bark);
  branch(g, [x, y + 1.32, z], [x - 0.42, y + 1.88, z - 0.18], 0.028, MATS.bark);
  branch(g, [x, y + 1.4, z], [x + 0.12, y + 2.05, z + 0.38], 0.026, MATS.barkDark);
  branch(g, [x, y + 1.22, z], [x - 0.12, y + 1.92, z + 0.42], 0.026, MATS.bark);
  leafCloud(g, x - 0.02, y + 1.95, z + 0.02, 0.72, 18, 11, 0.48);
  leafCloud(g, x + 0.22, y + 1.7, z + 0.18, 0.38, 6, 19, 0.36);
  for (let i = 0; i < 5; i++) {
    const yaw = (i / 5) * Math.PI * 2;
    addLeaf(g, 'broad', i % 2 ? '#1d4a34' : '#245c40', x + Math.cos(yaw) * 0.38, y + 1.68, z + Math.sin(yaw) * 0.3, {
      s: 0.46,
      sy: 0.58,
      rot: [-1.22, yaw, 0.08],
      shadow: 'both',
    });
  }
}

function shrub(g, x, y, z) {
  const rand = rng(23);
  for (let i = 0; i < 3; i++) {
    const ox = (i - 1) * 0.08;
    const oz = (i % 2 ? 0.05 : -0.04);
    cyl(g, 0.02, 0.032, 0.55 + i * 0.06, MATS.barkDark, x + ox, y + 0.28 + i * 0.02, z + oz, 5);
  }
  leafCloud(g, x, y + 0.62, z, 0.4, 12, 29, 0.32);
  leafCloud(g, x + 0.12, y + 0.48, z - 0.08, 0.22, 5, 31, 0.26);
  if (rand() > 0) {
    ball(g, 0.045, MATS.flower.gold, x + 0.08, y + 0.78, z + 0.05, 'receive');
    ball(g, 0.035, MATS.flower.cream, x - 0.1, y + 0.7, z - 0.02, 'receive');
  }
}

function palm(g, x, y, z) {
  cyl(g, 0.04, 0.085, 1.15, MATS.bark, x, y + 0.58, z, 8);
  for (let i = 0; i < 6; i++) {
    cyl(g, 0.09, 0.09, 0.028, MATS.barkDark, x, y + 0.18 + i * 0.16, z, 8);
  }
  const crown = y + 1.16;
  for (let f = 0; f < 8; f++) {
    const yaw = (f / 8) * Math.PI * 2 + 0.2;
    let px = x;
    let py = crown;
    let pz = z;
    for (let s = 0; s < 2; s++) {
      const len = 0.42;
      const dir = new THREE.Vector3(Math.cos(yaw), 0.42 - s * 0.7, Math.sin(yaw)).normalize();
      const nx = px + dir.x * len;
      const ny = py + dir.y * len;
      const nz = pz + dir.z * len;
      branch(g, [px, py, pz], [nx, ny, nz], 0.014, MATS.stem);
      addLeaf(g, 'strap', s === 0 ? '#2f6a3c' : '#7ea14a', (px + nx) / 2, (py + ny) / 2, (pz + nz) / 2, {
        s: 0.62,
        sy: 0.95 - s * 0.18,
        dir,
        hint: new THREE.Vector3(-Math.sin(yaw), 0.45, Math.cos(yaw)),
        roll: 0.15,
      });
      px = nx;
      py = ny;
      pz = nz;
    }
  }
}

function fern(g, x, y, z, scale, seed) {
  const rand = rng(seed);
  const fronds = 5;
  for (let f = 0; f < fronds; f++) {
    const yaw = (f / fronds) * Math.PI * 2 + rand() * 0.3;
    const len = (0.5 + rand() * 0.16) * scale;
    const lift = (0.34 + rand() * 0.1) * scale;
    const pts = [];
    const segs = 4;
    for (let i = 0; i <= segs; i++) {
      const t = i / segs;
      pts.push(new THREE.Vector3(
        x + Math.cos(yaw) * len * t,
        y + 0.02 * scale + Math.sin(t * Math.PI) * lift,
        z + Math.sin(yaw) * len * t,
      ));
    }
    tube(g, pts, 0.007 * Math.max(scale, 0.45), MATS.stem, 6);
    const side = new THREE.Vector3(-Math.sin(yaw), 0, Math.cos(yaw));
    for (let i = 2; i <= segs; i++) {
      const p = pts[i];
      const prev = pts[i - 1];
      const dir = p.clone().sub(prev).normalize();
      const length = (0.28 + (1 - i / segs) * 0.16) * scale;
      const color = rand() > 0.4 ? '#2f6f5a' : '#3e7a48';
      addLeaf(g, 'fern', color, p.x, p.y, p.z, {
        s: length * 0.42,
        sy: length,
        dir: dir.clone().add(side).normalize(),
        hint: new THREE.Vector3(side.x, 0.65, side.z),
        roll: 0.2,
        shadow: 'both',
      });
      addLeaf(g, 'fern', color, p.x, p.y, p.z, {
        s: length * 0.38,
        sy: length * 0.92,
        dir: dir.clone().sub(side).normalize(),
        hint: new THREE.Vector3(-side.x, 0.65, -side.z),
        roll: -0.2,
        shadow: 'both',
      });
    }
  }
}

function climber(g, spec) {
  const { axis, fixed, a0, a1, y0, y1 } = spec;
  const posts = 4;
  for (let i = 0; i <= posts; i++) {
    const a = a0 + ((a1 - a0) * i) / posts;
    const x = axis === 'x' ? a : fixed;
    const z = axis === 'z' ? a : fixed;
    cyl(g, 0.012, 0.012, y1 - y0, MATS.woodDark, x, (y0 + y1) / 2, z, 5, 'cast');
  }
  for (let r = 1; r <= 4; r++) {
    const y = y0 + ((y1 - y0) * r) / 5;
    if (axis === 'x') box(g, a1 - a0, 0.018, 0.018, MATS.woodDark, (a0 + a1) / 2, y, fixed, 'cast');
    else box(g, 0.018, 0.018, a1 - a0, MATS.woodDark, fixed, y, (a0 + a1) / 2, 'cast');
  }
  const pts = [];
  const spots = [];
  const steps = 16;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const a = a0 + (a1 - a0) * t;
    const wave = Math.sin(t * Math.PI * 3.2) * 0.1;
    const y = y0 + (y1 - y0) * t;
    const x = axis === 'x' ? a : fixed + wave;
    const z = axis === 'z' ? a : fixed + wave;
    pts.push(new THREE.Vector3(x, y, z));
    if (i % 2 === 0 && i > 0) spots.push({ x, y, z, t, i });
  }
  tube(g, pts, 0.012, MATS.vine, 20);
  const facing = axis === 'x' ? new THREE.Vector3(0, 0.35, 1) : new THREE.Vector3(1, 0.35, 0);
  spots.forEach((p) => {
    const color = p.i % 5 === 0 ? '#4e8a44' : '#1d4a34';
    addLeaf(g, 'heart', color, p.x, p.y, p.z, {
      s: 0.16 + (p.i % 3) * 0.03,
      sy: 0.2,
      dir: new THREE.Vector3(0, 1, 0),
      hint: facing,
      roll: (p.i % 2 ? 0.4 : -0.3),
      shadow: 'both',
    });
    if (p.i % 4 === 0) {
      ball(g, 0.035, p.t > 0.55 ? MATS.flower.pink : MATS.flower.cream, p.x, p.y + 0.06, p.z, 'receive');
    }
  });
}

function bigLeaf(g, x, y, z, scale, seed) {
  const rand = rng(seed);
  cyl(g, 0.03, 0.045, 0.16 * scale, MATS.stem, x, y + 0.08 * scale, z, 6);
  const n = 6;
  for (let i = 0; i < n; i++) {
    const yaw = (i / n) * Math.PI * 2 + rand() * 0.2;
    const len = (0.34 + rand() * 0.12) * scale;
    const dir = new THREE.Vector3(Math.cos(yaw) * 0.85, 0.55 + rand() * 0.2, Math.sin(yaw) * 0.85).normalize();
    branch(g, [x, y + 0.1, z], [x + dir.x * len, y + 0.1 + dir.y * len, z + dir.z * len], 0.012, MATS.stem);
    addLeaf(g, 'broad', i % 2 ? '#1b3d2c' : '#2d6a45', x + dir.x * len * 0.65, y + 0.08 + dir.y * len * 0.65, z + dir.z * len * 0.65, {
      s: 0.42 * scale,
      sy: 0.62 * scale,
      dir,
      hint: new THREE.Vector3(dir.x, 0.2, dir.z),
      roll: rand() * 0.4,
    });
  }
}

function spike(g, x, y, z, material, h, n) {
  cyl(g, 0.008, 0.012, h, MATS.stem, x, y + h / 2, z, 5, 'cast');
  for (let i = 0; i < n; i++) {
    const t = (i + 1) / n;
    ball(g, 0.03 + (1 - t) * 0.015, material, x + (i % 2 ? 0.02 : -0.015), y + h * t, z, 'receive');
  }
}

function groundCover(g, spec, soilY, seed) {
  const rand = rng(seed);
  const inset = 0.22;
  for (let i = 0; i < 5; i++) {
    const x = spec.x0 + inset + rand() * (spec.x1 - spec.x0 - inset * 2);
    const z = spec.z0 + inset + rand() * (spec.z1 - spec.z0 - inset * 2);
    addLeaf(g, 'broad', rand() > 0.5 ? '#1b3d2c' : '#245c40', x, soilY + 0.03, z, {
      s: 0.16 + rand() * 0.08,
      sy: 0.22,
      rot: [-1.15 - rand() * 0.3, rand() * 6, 0],
      shadow: 'receive',
    });
  }
}

function moss(g, spec) {
  const y = spec.h + 0.03;
  const spots = [
    [spec.x0 + 0.2, spec.z0 + 0.12],
    [(spec.x0 + spec.x1) / 2, spec.z1 - 0.08],
    [spec.x1 - 0.18, spec.z0 + 0.16],
  ];
  spots.forEach(([x, z]) => ball(g, 0.035, MATS.moss, x, y, z, 'receive'));
}

function fallenLeaves(g) {
  const spots = [
    [1.2, 0.04, 0.4, 0.4],
    [1.7, 0.04, 1.5, 1.2],
    [0.6, 0.04, 2.4, 2.2],
    [-0.2, 0.04, -0.4, 0.8],
    [2.4, 0.04, -1.6, 1.6],
  ];
  spots.forEach(([x, y, z, yaw]) => {
    addLeaf(g, 'broad', yaw > 1 ? '#8a6238' : '#6a7040', x, y, z, {
      s: 0.12,
      sy: 0.16,
      rot: [-1.35, yaw, 0],
      shadow: 'receive',
    });
  });
}

function sprig(g, x, y, z) {
  cyl(g, 0.006, 0.008, 0.16, MATS.stem, x, y + 0.08, z, 5, 'cast');
  addLeaf(g, 'heart', '#3e7a48', x + 0.03, y + 0.12, z, {
    s: 0.06, sy: 0.09, rot: [0.4, 0.5, 0.2], shadow: 'receive',
  });
  addLeaf(g, 'heart', '#2d6a45', x - 0.02, y + 0.15, z + 0.02, {
    s: 0.05, sy: 0.08, rot: [0.2, 1.2, -0.4], shadow: 'receive',
  });
  ball(g, 0.025, MATS.flower.coral, x, y + 0.18, z, 'receive');
}

function seedling(g, x, y, z) {
  cyl(g, 0.004, 0.006, 0.1, MATS.stem, x, y + 0.05, z, 4, 'cast');
  addLeaf(g, 'broad', '#6d8f3c', x + 0.02, y + 0.08, z, { s: 0.06, sy: 0.08, rot: [0.6, 0.4, 0.3], shadow: 'receive' });
  addLeaf(g, 'broad', '#4e8a44', x - 0.015, y + 0.09, z, { s: 0.055, sy: 0.07, rot: [0.5, 2.2, -0.2], shadow: 'receive' });
}

function plantedBeds(g) {
  const soils = {};
  Object.entries(BEDS).forEach(([name, spec]) => {
    soils[name] = raisedBed(g, spec);
    groundCover(g, spec, soils[name], name.length * 17);
    moss(g, spec);
  });
  const ib = soils.island;
  const bb = soils.back;
  const lb = soils.left;
  canopy(g, -0.85, ib, -0.82);
  shrub(g, 0.22, ib, -0.05);
  fern(g, -1.65, ib, 0.02, 1.05, 41);
  fern(g, 0.28, ib, -1.15, 0.85, 53);
  spike(g, -0.35, ib, -1.2, MATS.flower.coral, 0.55, 5);
  spike(g, -1.45, ib, -1.15, MATS.flower.gold, 0.42, 4);
  spike(g, -1.05, ib, -0.28, MATS.flower.cream, 0.28, 4);

  palm(g, -3.45, bb, -2.95);
  fern(g, -2.15, bb, -2.48, 0.9, 67);
  fern(g, 0.45, bb, -2.55, 0.75, 71);
  spike(g, -0.7, bb, -2.85, MATS.flower.pink, 0.62, 6);
  climber(g, { axis: 'x', fixed: -3.38, a0: -1.35, a1: 1.05, y0: bb - 0.02, y1: 2.2 });

  bigLeaf(g, -3.75, lb, -0.35, 1, 83);
  fern(g, -3.72, lb, -1.45, 1.1, 89);
  climber(g, { axis: 'z', fixed: -4.32, a0: -1.55, a1: 0.45, y0: lb, y1: 2.05 });
  return soils;
}

function nookDressing(g, layout) {
  const bench = byId(layout, 'nook_bench');
  const chair = byId(layout, 'nook_chair');
  if (!bench || !chair) return;
  const seat = bench.position[1] + layout.assets.museum_bench.targetHeight;
  box(g, 1.18, 0.06, 0.34, MATS.cushion, bench.position[0], seat + 0.03, bench.position[2]);
  const pillow = box(g, 0.28, 0.1, 0.22, MATS.pillow, bench.position[0], seat + 0.1, bench.position[2] - 0.42);
  pillow.rotation.y = 0.25;
  pillow.rotation.z = 0.15;
  const cx = (bench.position[0] + chair.position[0]) / 2;
  box(g, 2.35, 0.018, 1.6, MATS.rug, cx, 0.016, bench.position[2], 'receive');
}

function potPlants(g, layout) {
  const seed = byId(layout, 'pot_seed');
  const cutting = byId(layout, 'pot_cutting');
  const floorPot = byId(layout, 'pot_floor');
  const vase = byId(layout, 'vase_table');
  if (seed) seedling(g, seed.position[0], topY(layout, 'pot_seed') - 0.02, seed.position[2]);
  if (cutting) seedling(g, cutting.position[0] + 0.01, topY(layout, 'pot_cutting') - 0.01, cutting.position[2]);
  if (floorPot) fern(g, floorPot.position[0], topY(layout, 'pot_floor') - 0.06, floorPot.position[2], 0.62, 97);
  if (vase) sprig(g, vase.position[0], topY(layout, 'vase_table'), vase.position[2]);
}

function makeShell() {
  buildMaterials();
  const g = new THREE.Group();
  g.name = 'shell';
  floor(g);
  structure(g);
  vaultGlass(g);
  gableGlass(g);
  leftGlass(g);
  return g;
}

function makeProcedural(layout) {
  const g = new THREE.Group();
  g.name = 'procedural';
  plantedBeds(g);
  pottingBench(g);
  nookDressing(g, layout);
  potPlants(g, layout);
  fallenLeaves(g);
  return g;
}

function prepareKind(kind, prepared) {
  if (kind !== 'library_lamp' && kind !== 'pendant_lamp') return;
  prepared.traverse((obj) => {
    if (!obj.isMesh) return;
    const n = (obj.name || '').toLowerCase();
    if (!n.includes('bulb') && !n.includes('light_tube')) return;
    const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
    mats.forEach((m) => {
      if (!m) return;
      if (m.color) m.color.set('#fff4d2');
      if (m.emissive && m.emissive.isColor) m.emissive.set('#ffd18a');
      else m.emissive = new THREE.Color('#ffd18a');
      m.emissiveIntensity = 1.15;
    });
    obj.userData.shadow = 'none';
  });
}

boot({
  makeShell,
  makeProcedural,
  prepareKind,
  readyText: 'ready — indoor conservatory · drag orbit · U unlit · T toon',
});
