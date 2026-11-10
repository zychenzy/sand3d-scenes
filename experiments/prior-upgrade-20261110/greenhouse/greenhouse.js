import * as THREE from 'three';
import { boot, toon } from './scene_lib.js';

// Even-span ridge-and-gutter cutaway. Open front (+Z) and open right (+X).
// Metres. Ridge runs along Z. Brick knee, pitched glass, right-hand colonnade.
const W = 8.8;
const D = 7.2;
const LEFT_X = -4.4;
const RIGHT_X = 4.4;
const BACK_Z = -3.6;
const KNEE = 0.74;
const EAVE = 2.42;
const RIDGE_Y = 3.62;
const RIDGE_X = 0.0;
const RIBS = [-3.15, -1.55, 0.05, 1.65, 3.15];

const BEDS = {
  back: { x0: -4.05, x1: 1.12, z0: -3.38, z1: -2.16, h: 0.5 },
  left: { x0: -4.22, x1: -2.9, z0: -1.95, z1: 1.48, h: 0.46 },
  island: { x0: -2.12, x1: 0.22, z0: -1.55, z1: 0.42, h: 0.52 },
};

const BENCH = { x: 2.92, z: -2.98, len: 1.92, dep: 0.62, surface: 0.93 };

const GEOS = {};
const MATS = {};
const BRICK_CACHE = {};
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

function slopePoint(side, t, z) {
  const x0 = side === 'left' ? LEFT_X : RIDGE_X;
  const y0 = side === 'left' ? EAVE : RIDGE_Y;
  const x1 = side === 'left' ? RIDGE_X : RIGHT_X;
  const y1 = side === 'left' ? RIDGE_Y : EAVE;
  return new THREE.Vector3(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, z);
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
  tg.fillStyle = '#8a684c';
  tg.fillRect(0, 0, 512, 512);
  const n = 12;
  const s = 512 / n;
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      const v = 148 + ((i * 5 + j * 3) % 6) * 7;
      tg.fillStyle = `rgb(${v + 34}, ${v - 8}, ${v - 40})`;
      tg.fillRect(i * s + 2, j * s + 2, s - 4, s - 4);
    }
  }

  const brick = document.createElement('canvas');
  brick.width = 128;
  brick.height = 64;
  const bg = brick.getContext('2d');
  bg.fillStyle = '#cbb4a4';
  bg.fillRect(0, 0, 128, 64);
  for (let row = 0; row < 2; row++) {
    const off = row % 2 ? 32 : 0;
    for (let col = -1; col < 3; col++) {
      const shade = 108 + ((row * 3 + col + 5) % 3) * 14;
      bg.fillStyle = `rgb(${shade + 48}, ${shade - 4}, ${shade - 28})`;
      bg.fillRect(col * 64 + off + 2, row * 32 + 2, 58, 26);
    }
  }

  const soil = document.createElement('canvas');
  soil.width = 128;
  soil.height = 128;
  const sg = soil.getContext('2d');
  sg.fillStyle = '#3a2a20';
  sg.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 240; i++) {
    const v = 34 + ((i * 19) % 50);
    sg.fillStyle = `rgb(${v + 20}, ${v}, ${v - 10})`;
    sg.fillRect((i * 53) % 128, (i * 31) % 128, 3, 2);
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
  rg.fillStyle = '#4e6a46';
  rg.fillRect(0, 0, 256, 256);
  rg.strokeStyle = '#e2d2a4';
  rg.lineWidth = 14;
  rg.strokeRect(14, 14, 228, 228);
  rg.strokeStyle = '#2f4a32';
  rg.lineWidth = 5;
  rg.strokeRect(32, 32, 192, 192);
  rg.fillStyle = '#c47858';
  rg.beginPath();
  rg.arc(128, 128, 28, 0, Math.PI * 2);
  rg.fill();

  TEX = { tile, brick, soil, wood, rug };
}

function buildMaterials() {
  buildTextures();
  const solid = (color, opts) => toon(color, opts);
  MATS.iron = solid('#2a3330');
  MATS.ironThin = solid('#3a4642');
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
  MATS.terra = solid('#b45a3a');
  MATS.terraDark = solid('#8a3e28');
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
    opacity: 0.16,
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
  const key = `${w.toFixed(2)}x${h.toFixed(2)}`;
  if (BRICK_CACHE[key]) return BRICK_CACHE[key];
  const m = toon('#ffffff', { map: canvasTex(TEX.brick, Math.max(w / 0.42, 1), Math.max(h / 0.16, 1)) });
  BRICK_CACHE[key] = m;
  return m;
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

function ridgeRoof(g) {
  const z0 = RIBS[0];
  const z1 = RIBS[RIBS.length - 1];
  const zc = (z0 + z1) / 2;
  const spanZ = z1 - z0;

  RIBS.forEach((z) => {
    tube(g, [slopePoint('left', 0, z), slopePoint('left', 1, z)], 0.028, MATS.iron, 6);
    tube(g, [slopePoint('right', 0, z), slopePoint('right', 1, z)], 0.028, MATS.iron, 6);
  });
  for (let b = 0; b < RIBS.length - 1; b++) {
    const z = (RIBS[b] + RIBS[b + 1]) / 2;
    tube(g, [slopePoint('left', 0, z), slopePoint('left', 1, z)], 0.014, MATS.ironThin, 5, 'none');
    tube(g, [slopePoint('right', 0, z), slopePoint('right', 1, z)], 0.014, MATS.ironThin, 5, 'none');
  }

  [0.28, 0.62].forEach((t) => {
    const lp = slopePoint('left', t, zc);
    const rp = slopePoint('right', t, zc);
    box(g, 0.04, 0.04, spanZ, MATS.ironThin, lp.x, lp.y, zc, 'receive');
    box(g, 0.04, 0.04, spanZ, MATS.ironThin, rp.x, rp.y, zc, 'receive');
  });
  box(g, 0.09, 0.08, spanZ + 0.18, MATS.iron, RIDGE_X, RIDGE_Y, zc);
  box(g, 0.08, 0.07, spanZ + 0.2, MATS.iron, LEFT_X + 0.04, EAVE, zc);
  box(g, 0.08, 0.07, spanZ + 0.2, MATS.iron, RIGHT_X - 0.04, EAVE, zc);

  box(g, 0.07, 0.05, spanZ, MATS.canDark, LEFT_X + 0.1, EAVE + 0.04, zc, 'cast');
  box(g, 0.07, 0.05, spanZ, MATS.canDark, RIGHT_X - 0.1, EAVE + 0.04, zc, 'cast');

  RIBS.forEach((z, i) => {
    cyl(g, 0.055, 0.06, EAVE - 0.08, MATS.iron, RIGHT_X, (EAVE - 0.08) / 2, z, 8);
    cyl(g, 0.09, 0.09, 0.05, MATS.iron, RIGHT_X, 0.025, z, 8);
    cyl(g, 0.08, 0.07, 0.07, MATS.iron, RIGHT_X, EAVE - 0.04, z, 8);
    if (i % 2 === 0) {
      cyl(g, 0.04, 0.04, RIDGE_Y - EAVE, MATS.ironThin, RIDGE_X, EAVE + (RIDGE_Y - EAVE) / 2, z, 6, 'cast');
    }
  });

  for (let i = 0; i < 9; i++) {
    const z = z0 + 0.22 + i * ((spanZ - 0.44) / 8);
    box(g, 0.018, 0.12, 0.03, MATS.ironThin, RIDGE_X, RIDGE_Y + 0.1, z, 'cast');
  }

  [-1.55, 0.05, 1.65].forEach((z) => {
    box(g, 0.55, 0.04, 0.72, MATS.ironThin, RIDGE_X, RIDGE_Y + 0.16, z, 'cast');
    box(g, 0.5, 0.22, 0.64, MATS.glass, RIDGE_X, RIDGE_Y + 0.28, z, 'none');
  });

  const positions = [];
  const push = (a, b, c) => positions.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z);
  const n = 4;
  for (const side of ['left', 'right']) {
    for (let b = 0; b < RIBS.length - 1; b++) {
      for (let i = 0; i < n; i++) {
        const t0 = i / n;
        const t1 = (i + 1) / n;
        const a = slopePoint(side, t0, RIBS[b]);
        const c = slopePoint(side, t1, RIBS[b]);
        const d = slopePoint(side, t1, RIBS[b + 1]);
        const e = slopePoint(side, t0, RIBS[b + 1]);
        push(a, c, d);
        push(a, d, e);
      }
    }
  }
  const roof = new THREE.BufferGeometry();
  roof.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  roof.computeVertexNormals();
  const roofMesh = new THREE.Mesh(roof, MATS.glass);
  roofMesh.userData.shadow = 'none';
  g.add(roofMesh);

  const gable = new THREE.Shape();
  gable.moveTo(LEFT_X, KNEE);
  gable.lineTo(LEFT_X, EAVE);
  gable.lineTo(RIDGE_X, RIDGE_Y);
  gable.lineTo(RIGHT_X, EAVE);
  gable.lineTo(RIGHT_X, KNEE);
  gable.lineTo(LEFT_X, KNEE);
  const gableMesh = new THREE.Mesh(new THREE.ShapeGeometry(gable, 4), MATS.glass);
  gableMesh.position.z = BACK_Z;
  gableMesh.userData.shadow = 'none';
  g.add(gableMesh);

  const leftH = EAVE - KNEE;
  const leftGlass = new THREE.Mesh(new THREE.PlaneGeometry(spanZ, leftH), MATS.glass);
  leftGlass.position.set(LEFT_X, KNEE + leftH / 2, zc);
  leftGlass.rotation.y = Math.PI / 2;
  leftGlass.userData.shadow = 'none';
  g.add(leftGlass);

  for (let z = z0 + 0.5; z < z1; z += 0.8) {
    box(g, 0.032, leftH, 0.032, MATS.ironThin, LEFT_X, KNEE + leftH / 2, z);
  }
  box(g, 0.028, 0.028, spanZ, MATS.ironThin, LEFT_X, KNEE + leftH * 0.55, zc);
  for (let x = LEFT_X + 0.7; x < RIGHT_X - 0.4; x += 0.85) {
    const side = x < RIDGE_X ? 'left' : 'right';
    const t = x < RIDGE_X
      ? (x - LEFT_X) / (RIDGE_X - LEFT_X)
      : (x - RIDGE_X) / (RIGHT_X - RIDGE_X);
    const p = slopePoint(side, t, BACK_Z);
    const h = p.y - KNEE - 0.04;
    if (h > 0.28) box(g, 0.03, h, 0.03, MATS.ironThin, x, KNEE + h / 2, BACK_Z + 0.02);
  }
  box(g, W - 0.6, 0.028, 0.028, MATS.ironThin, 0, KNEE + leftH * 0.55, BACK_Z + 0.02);

  box(g, W - 0.2, KNEE, 0.12, brickMat(W - 0.2, KNEE), 0, KNEE / 2, BACK_Z);
  box(g, W - 0.2, 0.05, 0.16, MATS.coping, 0, KNEE + 0.02, BACK_Z);
  box(g, 0.12, KNEE, spanZ + 0.35, brickMat(spanZ + 0.35, KNEE), LEFT_X, KNEE / 2, zc);
  box(g, 0.16, 0.05, spanZ + 0.35, MATS.coping, LEFT_X, KNEE + 0.02, zc);

  function pier(x, z) {
    box(g, 0.36, EAVE, 0.36, brickMat(0.36, EAVE), x, EAVE / 2, z);
    box(g, 0.44, 0.06, 0.44, MATS.coping, x, EAVE - 0.03, z);
  }
  pier(LEFT_X + 0.1, BACK_Z + 0.08);
  pier(RIGHT_X - 0.1, BACK_Z + 0.08);
  pier(LEFT_X + 0.1, z1);

  cyl(g, 0.03, 0.03, EAVE - 0.15, MATS.canDark, LEFT_X + 0.22, (EAVE - 0.15) / 2, z1 - 0.12, 6, 'cast');
}

function floor(g) {
  const edge = MATS.edge;
  const slab = new THREE.Mesh(new THREE.BoxGeometry(W, 0.08, D), [edge, edge, MATS.tile, edge, edge, edge]);
  slab.position.y = -0.04;
  slab.userData.shadow = 'receive';
  g.add(slab);

  box(g, 1.55, 0.02, 4.55, MATS.gravel, 1.12, 0.012, 0.35, 'receive');
  box(g, 2.4, 0.02, 1.15, MATS.gravel, 0.2, 0.012, 2.15, 'receive');

  const flags = [
    [1.05, -1.35, 0.9, 0.55],
    [1.18, -0.7, 0.95, 0.52],
    [1.08, -0.05, 0.88, 0.5],
    [1.22, 0.58, 0.92, 0.54],
    [1.1, 1.22, 0.9, 0.5],
    [1.2, 1.85, 0.86, 0.48],
    [0.35, 2.18, 0.7, 0.46],
    [-0.45, 2.22, 0.68, 0.46],
  ];
  flags.forEach(([x, z, w, d], i) => {
    const m = box(g, w, 0.032, d, i % 2 ? MATS.stoneA : MATS.stoneB, x, 0.024, z, 'both');
    m.rotation.y = i % 2 ? 0.02 : -0.015;
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

function staging(g) {
  const x0 = -3.55;
  const x1 = -0.35;
  const cx = (x0 + x1) / 2;
  const len = x1 - x0;
  const zBack = -3.42;
  const tiers = [
    { y: 0.52, d: 0.58, z: -3.12 },
    { y: 0.86, d: 0.42, z: -3.26 },
    { y: 1.18, d: 0.3, z: -3.36 },
  ];
  tiers.forEach((tier, i) => {
    box(g, len, 0.04, tier.d, MATS.wood, cx, tier.y, tier.z);
    box(g, 0.05, tier.y, 0.05, MATS.woodDark, x0 + 0.08, tier.y / 2, tier.z + tier.d / 2 - 0.06);
    box(g, 0.05, tier.y, 0.05, MATS.woodDark, x1 - 0.08, tier.y / 2, tier.z + tier.d / 2 - 0.06);
    box(g, 0.05, tier.y, 0.05, MATS.woodDark, cx, tier.y / 2, tier.z - tier.d / 2 + 0.05);
    if (i === 0) {
      box(g, 0.52, 0.035, 0.28, MATS.woodDark, -2.85, tier.y + 0.03, tier.z + 0.04);
      box(g, 0.46, 0.02, 0.22, MATS.soil, -2.85, tier.y + 0.05, tier.z + 0.04, 'receive');
    }
  });
  const trayY = 0.57;
  for (let i = 0; i < 5; i++) {
    const x = -3.25 + i * 0.22;
    cyl(g, 0.055, 0.06, 0.07, MATS.terra, x, trayY + 0.04, -3.05, 8, 'cast');
    seedling(g, x, trayY + 0.07, -3.05);
  }
  for (let i = 0; i < 4; i++) {
    const x = -3.15 + i * 0.55;
    cyl(g, 0.07, 0.08, 0.1, MATS.terraDark, x, 0.92, -3.24, 8, 'cast');
    addLeaf(g, 'broad', i % 2 ? '#2d6a45' : '#3e7a48', x, 1.08, -3.24, {
      s: 0.14, sy: 0.18, rot: [-0.6, i, 0.2], shadow: 'cast',
    });
  }
  for (let i = 0; i < 3; i++) {
    const x = -2.95 + i * 0.7;
    cyl(g, 0.06, 0.07, 0.08, MATS.terra, x, 1.24, -3.34, 8, 'cast');
    addLeaf(g, 'heart', '#4e8a44', x + 0.02, 1.36, -3.34, { s: 0.08, sy: 0.1, rot: [0.3, i, 0.2] });
  }
}

function hangingBasket(g, x, y, z) {
  for (let i = 0; i < 4; i++) {
    cyl(g, 0.006, 0.006, 0.22, MATS.ironThin, x + (i % 2 ? 0.04 : -0.04), y - 0.12 - i * 0.18, z + (i < 2 ? 0.03 : -0.03), 5, 'cast');
  }
  cyl(g, 0.12, 0.08, 0.12, MATS.terra, x, y - 0.92, z, 10);
  cyl(g, 0.07, 0.07, 0.03, MATS.soil, x, y - 0.86, z, 8, 'receive');
  for (let i = 0; i < 6; i++) {
    const yaw = (i / 6) * Math.PI * 2;
    addLeaf(g, 'heart', i % 2 ? '#2d6a45' : '#1d4a34', x + Math.cos(yaw) * 0.12, y - 0.98, z + Math.sin(yaw) * 0.12, {
      s: 0.12,
      sy: 0.2,
      rot: [1.1, yaw, 0.2],
      shadow: 'cast',
    });
  }
  ball(g, 0.03, MATS.flower.pink, x + 0.05, y - 0.78, z, 'receive');
  ball(g, 0.025, MATS.flower.coral, x - 0.04, y - 0.8, z + 0.04, 'receive');
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
    box(g, len - 0.28, 0.018, 0.055, MATS.wood, x, 0.28, zz);
  }
  for (let i = 0; i < 3; i++) {
    const dx = x - 0.58 + i * 0.58;
    box(g, 0.44, 0.16, 0.03, MATS.wood, dx, under - 0.18, z + dep / 2);
    cyl(g, 0.012, 0.012, 0.02, MATS.canDark, dx, under - 0.18, z + dep / 2 + 0.02, 6, 'cast');
  }
  box(g, len, 0.13, 0.025, MATS.woodDark, x, surface + 0.065, z - dep / 2 + 0.02);
  box(g, 0.34, 0.035, 0.22, MATS.woodDark, x + 0.12, surface + 0.02, z - 0.08);
  box(g, 0.28, 0.02, 0.16, MATS.soil, x + 0.12, surface + 0.04, z - 0.08, 'receive');
  const trowel = box(g, 0.05, 0.012, 0.2, MATS.can, x - 0.18, surface + 0.02, z + 0.08, 'cast');
  trowel.rotation.y = 0.45;
  MATS.packet.forEach((material, i) => {
    const p = box(g, 0.1, 0.15, 0.008, material, x - 0.68 + i * 0.14, surface + 0.1, z - 0.2, 'cast');
    p.rotation.x = -0.55;
  });

  const cx = x - len / 2 - 0.04;
  const cz = z + 0.18;
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
    hosePts.push(new THREE.Vector3(cx + 0.26 + Math.cos(a) * 0.2, 0.03 + (i % 4) * 0.008, cz + 0.3 + Math.sin(a) * 0.14));
  }
  tube(g, hosePts, 0.016, MATS.hose, 28);

  for (const dx of [-0.34, 0.34]) {
    box(g, 0.045, 0.08, 0.2, MATS.woodDark, 2.82 + dx, 1.42, -3.4, 'cast');
    const brace = box(g, 0.03, 0.2, 0.03, MATS.woodDark, 2.82 + dx, 1.34, -3.36, 'cast');
    brace.rotation.x = 0.7;
  }
  cyl(g, 0.02, 0.02, 0.16, MATS.can, 4.12, 1.05, -3.42, 6, 'cast');
  const tap = cyl(g, 0.016, 0.016, 0.1, MATS.canDark, 4.06, 1.02, -3.42, 6, 'cast');
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
  cyl(g, 0.085, 0.12, 0.68, MATS.bark, x, y + 0.34, z, 8);
  cyl(g, 0.06, 0.085, 0.58, MATS.bark, x + 0.04, y + 0.92, z - 0.03, 7);
  cyl(g, 0.04, 0.06, 0.4, MATS.barkDark, x - 0.03, y + 1.38, z + 0.02, 6);
  branch(g, [x, y + 1.08, z], [x + 0.52, y + 1.68, z + 0.1], 0.03, MATS.bark);
  branch(g, [x, y + 1.22, z], [x - 0.46, y + 1.82, z - 0.16], 0.026, MATS.bark);
  branch(g, [x, y + 1.32, z], [x + 0.08, y + 1.98, z + 0.4], 0.024, MATS.barkDark);
  branch(g, [x, y + 1.16, z], [x - 0.18, y + 1.86, z + 0.38], 0.024, MATS.bark);
  leafCloud(g, x, y + 1.86, z + 0.04, 0.7, 16, 13, 0.46);
  leafCloud(g, x + 0.2, y + 1.62, z + 0.16, 0.34, 6, 21, 0.34);
}

function shrub(g, x, y, z) {
  for (let i = 0; i < 3; i++) {
    cyl(g, 0.02, 0.03, 0.52 + i * 0.05, MATS.barkDark, x + (i - 1) * 0.07, y + 0.26 + i * 0.02, z + (i % 2 ? 0.04 : -0.03), 5);
  }
  leafCloud(g, x, y + 0.58, z, 0.38, 11, 27, 0.3);
  ball(g, 0.04, MATS.flower.gold, x + 0.08, y + 0.74, z + 0.04, 'receive');
  ball(g, 0.032, MATS.flower.cream, x - 0.1, y + 0.66, z - 0.02, 'receive');
}

function palm(g, x, y, z) {
  cyl(g, 0.038, 0.082, 1.08, MATS.bark, x, y + 0.54, z, 8);
  for (let i = 0; i < 5; i++) cyl(g, 0.085, 0.085, 0.026, MATS.barkDark, x, y + 0.16 + i * 0.15, z, 8);
  const crown = y + 1.08;
  for (let f = 0; f < 8; f++) {
    const yaw = (f / 8) * Math.PI * 2 + 0.15;
    let px = x;
    let py = crown;
    let pz = z;
    for (let s = 0; s < 2; s++) {
      const len = 0.4;
      const dir = new THREE.Vector3(Math.cos(yaw), 0.4 - s * 0.68, Math.sin(yaw)).normalize();
      const nx = px + dir.x * len;
      const ny = py + dir.y * len;
      const nz = pz + dir.z * len;
      branch(g, [px, py, pz], [nx, ny, nz], 0.013, MATS.stem);
      addLeaf(g, 'strap', s === 0 ? '#2f6a3c' : '#7ea14a', (px + nx) / 2, (py + ny) / 2, (pz + nz) / 2, {
        s: 0.58,
        sy: 0.9 - s * 0.16,
        dir,
        hint: new THREE.Vector3(-Math.sin(yaw), 0.45, Math.cos(yaw)),
        roll: 0.12,
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
    const yaw = (f / fronds) * Math.PI * 2 + rand() * 0.28;
    const len = (0.48 + rand() * 0.16) * scale;
    const lift = (0.32 + rand() * 0.1) * scale;
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
      const length = (0.26 + (1 - i / segs) * 0.16) * scale;
      const color = rand() > 0.4 ? '#2f6f5a' : '#3e7a48';
      addLeaf(g, 'fern', color, p.x, p.y, p.z, {
        s: length * 0.42, sy: length, dir: dir.clone().add(side).normalize(),
        hint: new THREE.Vector3(side.x, 0.65, side.z), roll: 0.2,
      });
      addLeaf(g, 'fern', color, p.x, p.y, p.z, {
        s: length * 0.38, sy: length * 0.92, dir: dir.clone().sub(side).normalize(),
        hint: new THREE.Vector3(-side.x, 0.65, -side.z), roll: -0.2,
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
    const wave = Math.sin(t * Math.PI * 3.1) * 0.1;
    const y = y0 + (y1 - y0) * t;
    const x = axis === 'x' ? a : fixed + wave;
    const z = axis === 'z' ? a : fixed + wave;
    pts.push(new THREE.Vector3(x, y, z));
    if (i % 2 === 0 && i > 0) spots.push({ x, y, z, t, i });
  }
  tube(g, pts, 0.012, MATS.vine, 20);
  const facing = axis === 'x' ? new THREE.Vector3(0, 0.35, 1) : new THREE.Vector3(1, 0.35, 0);
  spots.forEach((p) => {
    addLeaf(g, 'heart', p.i % 5 === 0 ? '#4e8a44' : '#1d4a34', p.x, p.y, p.z, {
      s: 0.16 + (p.i % 3) * 0.03, sy: 0.2,
      dir: new THREE.Vector3(0, 1, 0), hint: facing, roll: (p.i % 2 ? 0.4 : -0.3),
    });
    if (p.i % 4 === 0) {
      ball(g, 0.032, p.t > 0.55 ? MATS.flower.pink : MATS.flower.cream, p.x, p.y + 0.06, p.z, 'receive');
    }
  });
}

function bigLeaf(g, x, y, z, scale, seed) {
  const rand = rng(seed);
  cyl(g, 0.03, 0.045, 0.16 * scale, MATS.stem, x, y + 0.08 * scale, z, 6);
  for (let i = 0; i < 6; i++) {
    const yaw = (i / 6) * Math.PI * 2 + rand() * 0.2;
    const len = (0.32 + rand() * 0.12) * scale;
    const dir = new THREE.Vector3(Math.cos(yaw) * 0.85, 0.55 + rand() * 0.2, Math.sin(yaw) * 0.85).normalize();
    branch(g, [x, y + 0.1, z], [x + dir.x * len, y + 0.1 + dir.y * len, z + dir.z * len], 0.012, MATS.stem);
    addLeaf(g, 'broad', i % 2 ? '#1b3d2c' : '#2d6a45', x + dir.x * len * 0.65, y + 0.08 + dir.y * len * 0.65, z + dir.z * len * 0.65, {
      s: 0.4 * scale, sy: 0.6 * scale, dir, hint: new THREE.Vector3(dir.x, 0.2, dir.z), roll: rand() * 0.4,
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
      s: 0.16 + rand() * 0.08, sy: 0.22, rot: [-1.15 - rand() * 0.3, rand() * 6, 0], shadow: 'receive',
    });
  }
}

function moss(g, spec) {
  const y = spec.h + 0.03;
  [[spec.x0 + 0.2, spec.z0 + 0.12], [(spec.x0 + spec.x1) / 2, spec.z1 - 0.08], [spec.x1 - 0.18, spec.z0 + 0.16]]
    .forEach(([x, z]) => ball(g, 0.035, MATS.moss, x, y, z, 'receive'));
}

function sprig(g, x, y, z) {
  cyl(g, 0.006, 0.008, 0.16, MATS.stem, x, y + 0.08, z, 5, 'cast');
  addLeaf(g, 'heart', '#3e7a48', x + 0.03, y + 0.12, z, { s: 0.06, sy: 0.09, rot: [0.4, 0.5, 0.2] });
  addLeaf(g, 'heart', '#2d6a45', x - 0.02, y + 0.15, z + 0.02, { s: 0.05, sy: 0.08, rot: [0.2, 1.2, -0.4] });
  ball(g, 0.025, MATS.flower.coral, x, y + 0.18, z, 'receive');
}

function seedling(g, x, y, z) {
  cyl(g, 0.004, 0.006, 0.1, MATS.stem, x, y + 0.05, z, 4, 'cast');
  addLeaf(g, 'broad', '#6d8f3c', x + 0.02, y + 0.08, z, { s: 0.06, sy: 0.08, rot: [0.6, 0.4, 0.3] });
  addLeaf(g, 'broad', '#4e8a44', x - 0.015, y + 0.09, z, { s: 0.055, sy: 0.07, rot: [0.5, 2.2, -0.2] });
}

function plantedBeds(g) {
  const soils = {};
  Object.entries(BEDS).forEach(([name, spec]) => {
    soils[name] = raisedBed(g, spec);
    groundCover(g, spec, soils[name], name.length * 19);
    moss(g, spec);
  });
  const ib = soils.island;
  const bb = soils.back;
  const lb = soils.left;
  canopy(g, -0.92, ib, -0.72);
  shrub(g, 0.02, ib, 0.08);
  fern(g, -1.62, ib, 0.12, 1.02, 43);
  fern(g, 0.05, ib, -1.12, 0.82, 51);
  spike(g, -0.4, ib, -1.18, MATS.flower.coral, 0.52, 5);
  spike(g, -1.38, ib, -1.08, MATS.flower.gold, 0.4, 4);

  shrub(g, -3.22, bb, -2.86);
  fern(g, -2.05, bb, -2.42, 0.88, 61);
  fern(g, 0.35, bb, -2.5, 0.72, 73);
  bigLeaf(g, -1.18, bb, -2.68, 0.82, 77);
  spike(g, -0.55, bb, -2.82, MATS.flower.pink, 0.58, 6);
  climber(g, { axis: 'x', fixed: -3.32, a0: -1.2, a1: 0.95, y0: bb - 0.02, y1: 2.15 });

  palm(g, -3.48, lb, 0.55);
  bigLeaf(g, -3.62, lb, -0.28, 1, 81);
  fern(g, -3.58, lb, -1.35, 1.05, 91);
  fern(g, -3.5, lb, 1.12, 0.78, 103);
  spike(g, -3.4, lb, 0.05, MATS.flower.gold, 0.42, 4);
  climber(g, { axis: 'z', fixed: -4.14, a0: -1.45, a1: 0.55, y0: lb, y1: 2.02 });
  return soils;
}

function nookDressing(g, layout) {
  const bench = byId(layout, 'nook_bench');
  const chair = byId(layout, 'nook_chair');
  const path = byId(layout, 'path_bench');
  if (bench && chair) {
    const seat = bench.position[1] + layout.assets.museum_bench.targetHeight;
    box(g, 1.18, 0.06, 0.34, MATS.cushion, bench.position[0], seat + 0.03, bench.position[2]);
    const pillow = box(g, 0.28, 0.1, 0.22, MATS.pillow, bench.position[0], seat + 0.1, bench.position[2] - 0.42);
    pillow.rotation.y = 0.22;
    pillow.rotation.z = 0.12;
    const cx = (bench.position[0] + chair.position[0]) / 2;
    box(g, 2.35, 0.018, 1.55, MATS.rug, cx, 0.016, bench.position[2], 'receive');
  }
  if (path) {
    const seat = path.position[1] + layout.assets.museum_bench.targetHeight;
    box(g, 0.34, 0.05, 1.12, MATS.cushion, path.position[0], seat + 0.03, path.position[2]);
  }
}

function potPlants(g, layout) {
  const seed = byId(layout, 'pot_seed');
  const cutting = byId(layout, 'pot_cutting');
  const floorPot = byId(layout, 'pot_floor');
  const vase = byId(layout, 'vase_table');
  if (seed) seedling(g, seed.position[0], topY(layout, 'pot_seed') - 0.02, seed.position[2]);
  if (cutting) seedling(g, cutting.position[0] + 0.01, topY(layout, 'pot_cutting') - 0.01, cutting.position[2]);
  if (floorPot) fern(g, floorPot.position[0], topY(layout, 'pot_floor') - 0.06, floorPot.position[2], 0.6, 97);
  if (vase) sprig(g, vase.position[0], topY(layout, 'vase_table'), vase.position[2]);
}

function makeShell() {
  buildMaterials();
  const g = new THREE.Group();
  g.name = 'shell';
  floor(g);
  ridgeRoof(g);
  return g;
}

function makeProcedural(layout) {
  const g = new THREE.Group();
  g.name = 'procedural';
  plantedBeds(g);
  staging(g);
  pottingBench(g);
  hangingBasket(g, -0.15, RIDGE_Y - 0.08, -1.15);
  hangingBasket(g, 0.12, RIDGE_Y - 0.08, 1.05);
  nookDressing(g, layout);
  potPlants(g, layout);
  addLeaf(g, 'broad', '#8a6238', 1.15, 0.04, 0.55, { s: 0.12, sy: 0.16, rot: [-1.35, 0.4, 0], shadow: 'receive' });
  addLeaf(g, 'broad', '#6a7040', 1.55, 0.04, 1.35, { s: 0.11, sy: 0.15, rot: [-1.3, 1.4, 0], shadow: 'receive' });
  addLeaf(g, 'broad', '#8a6238', 0.55, 0.04, 2.15, { s: 0.1, sy: 0.14, rot: [-1.32, 2.1, 0], shadow: 'receive' });
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
  readyText: 'ready — indoor greenhouse · drag orbit · U unlit · T toon',
});
