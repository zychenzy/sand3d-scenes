import * as THREE from 'three';
import {
  boot, toon, addBox, addCyl, addSphere, addLathe, addCapsule, addContact, noCast,
} from './scene_lib.js';

const PAL = {
  wall: '#f3eee6',
  wallDeep: '#e4dcd2',
  floor: '#d2c9bb',
  inset: '#c3b9a9',
  grout: '#b7ad9e',
  ceiling: '#f6f2ea',
  soffit: '#ebe4d8',
  wood: '#6d5344',
  woodDark: '#4a372c',
  metal: '#242424',
  brass: '#b08a52',
  ivory: '#f4f0e8',
  ink: '#1d2430',
  wine: '#7c3144',
  rust: '#b15b3a',
  sage: '#5e6b58',
  camel: '#c6a36a',
  blush: '#d7b2a6',
  curtain: '#c48b86',
  curtainDeep: '#a86e6c',
  glass: '#d5e2e6',
  stone: '#e3dcd2',
  stoneEdge: '#c9bfb2',
  muslin: '#f7f2e8',
  shoe: '#2a2424',
  lining: '#2a2830',
};

const BACK_GARMENTS = [
  { x: -0.98, type: 'dress', color: PAL.ink, hem: 0.98, yaw: 0.05 },
  { x: -0.48, type: 'shirt', color: PAL.ivory, hem: 0.46, yaw: -0.04 },
  { x: 0.05, type: 'coat', color: PAL.wine, hem: 0.82, yaw: 0.03 },
  { x: 0.58, type: 'trousers', color: PAL.camel, hem: 0.92, yaw: -0.05 },
  { x: 1.05, type: 'dress', color: PAL.rust, hem: 0.72, yaw: 0.06 },
];

const SIDE_GARMENTS = [
  { x: -0.68, type: 'dress', color: PAL.blush, hem: 0.8, yaw: -0.04 },
  { x: -0.22, type: 'shirt', color: PAL.sage, hem: 0.44, yaw: 0.05 },
  { x: 0.24, type: 'trousers', color: PAL.ink, hem: 0.88, yaw: -0.03 },
  { x: 0.68, type: 'coat', color: PAL.camel, hem: 0.7, yaw: 0.04 },
];

function pivot(parent, x, y, z, rotY = 0) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  g.rotation.y = rotY;
  parent.add(g);
  return g;
}

function roomFrame(layout) {
  const { width: W, depth: D, height: H } = layout.meta.room;
  const t = 0.12;
  return { W, D, H, t, xL: -W / 2, zB: -D / 2, xIn: -W / 2 + t / 2, zIn: -D / 2 + t / 2 };
}

function bulb(g, x, y, z, r = 0.035) {
  const m = addSphere(g, r, toon('#fff6df', { emissive: '#ffe3b0', emissiveIntensity: 1.15 }), x, y, z, 10);
  m.userData.castShadow = false;
  return m;
}

function trackSpot(g, x, y, z) {
  const can = addCyl(g, 0.045, 0.07, 0.09, toon(PAL.metal), x, y, z, 10);
  can.userData.castShadow = false;
  bulb(g, x, y - 0.055, z, 0.03);
  const pl = new THREE.PointLight(0xffe6c4, 0.16, 4.2, 2);
  pl.position.set(x, y - 0.08, z);
  g.add(pl);
}

function buildCloth(g, item) {
  const fab = toon(item.color, { side: THREE.DoubleSide });
  const hem = item.hem ?? 0.75;
  if (item.type === 'dress') {
    addBox(g, 0.1, 0.07, 0.035, fab, 0, -0.03, 0);
    addLathe(g, [
      [0.145, -hem],
      [0.155, -hem + 0.05],
      [0.11, -hem * 0.55],
      [0.12, -0.26],
      [0.145, -0.12],
      [0.06, -0.02],
    ], fab, 0, 0, 0, 14);
  } else if (item.type === 'coat') {
    const bodyH = Math.max(0.45, hem - 0.08);
    addBox(g, 0.34, 0.14, 0.1, fab, 0, -0.1, 0);
    addBox(g, 0.3, bodyH, 0.075, fab, 0, -0.16 - bodyH / 2, 0);
    addBox(g, 0.12, bodyH * 0.72, 0.02, toon(PAL.lining), 0, -0.22 - bodyH * 0.36, 0.04);
    const sl = addCapsule(g, 0.04, 0.32, fab, -0.2, -0.36, 0);
    sl.rotation.z = 0.18;
    const sr = addCapsule(g, 0.04, 0.32, fab, 0.2, -0.36, 0);
    sr.rotation.z = -0.18;
  } else if (item.type === 'shirt') {
    addBox(g, 0.26, 0.34, 0.07, fab, 0, -0.22, 0);
    addBox(g, 0.1, 0.05, 0.04, fab, 0, -0.04, 0);
    const sl = addCapsule(g, 0.035, 0.22, fab, -0.18, -0.24, 0);
    sl.rotation.z = 0.35;
    const sr = addCapsule(g, 0.035, 0.22, fab, 0.18, -0.24, 0);
    sr.rotation.z = -0.35;
  } else {
    addBox(g, 0.22, 0.08, 0.07, fab, 0, -0.08, 0);
    addCapsule(g, 0.045, hem * 0.62, fab, -0.07, -0.12 - hem * 0.32, 0);
    addCapsule(g, 0.045, hem * 0.62, fab, 0.07, -0.12 - hem * 0.32, 0);
  }
}

function hangGarment(rail, item, barY) {
  const g = new THREE.Group();
  g.position.set(item.x, barY, 0.03);
  g.rotation.y = item.yaw || 0;
  const metal = toon(PAL.metal);
  const hook = new THREE.Mesh(new THREE.TorusGeometry(0.026, 0.005, 6, 12, Math.PI), metal);
  hook.rotation.y = Math.PI / 2;
  hook.position.y = 0.01;
  hook.castShadow = true;
  g.add(hook);
  const sL = addBox(g, 0.15, 0.012, 0.016, metal, -0.06, -0.05, 0);
  sL.rotation.z = 0.48;
  const sR = addBox(g, 0.15, 0.012, 0.016, metal, 0.06, -0.05, 0);
  sR.rotation.z = -0.48;
  addBox(g, 0.035, 0.04, 0.018, metal, 0, -0.065, 0);
  const cloth = new THREE.Group();
  cloth.position.y = -0.07;
  buildCloth(cloth, item);
  g.add(cloth);
  rail.add(g);
}

function clothingRail(parent, spec, garments) {
  const g = pivot(parent, spec.x, 0, spec.z, spec.rot || 0);
  const metal = toon(PAL.metal);
  const brass = toon(PAL.brass);
  const yBar = 1.56;
  const half = spec.length / 2;
  const xL = -half + 0.12;
  const xR = half - 0.12;
  const top = addCyl(g, 0.018, 0.018, spec.length - 0.02, metal, 0, yBar, 0, 12);
  top.rotation.z = Math.PI / 2;
  const bot = addCyl(g, 0.012, 0.012, xR - xL, metal, 0, 0.055, 0, 8);
  bot.rotation.z = Math.PI / 2;
  for (const fx of [xL, xR]) {
    addCyl(g, 0.016, 0.016, yBar - 0.08, metal, fx, (yBar - 0.08) / 2 + 0.05, 0, 8);
    addBox(g, 0.1, 0.018, 0.34, metal, fx, 0.012, 0);
    addCyl(g, 0.028, 0.028, 0.012, brass, fx, 0.022, 0.13, 8);
    addCyl(g, 0.028, 0.028, 0.012, brass, fx, 0.022, -0.13, 8);
  }
  addSphere(g, 0.022, brass, -half + 0.02, yBar, 0, 8);
  addSphere(g, 0.022, brass, half - 0.02, yBar, 0, 8);
  for (const item of garments) hangGarment(g, item, yBar);
  addContact(g, 0, 0.02, 0, spec.length * 0.46, 0.26, 0.9);
  return g;
}

function dressForm(parent, spec, y0) {
  const g = pivot(parent, spec.x, y0, spec.z, spec.rot || 0);
  const metal = toon(PAL.metal);
  const brass = toon(PAL.brass);
  const muslin = toon(PAL.muslin, { side: THREE.DoubleSide });
  addCyl(g, 0.18, 0.2, 0.028, metal, 0, 0.016, 0, 18);
  addCyl(g, 0.012, 0.014, 0.78, metal, 0, 0.42, 0, 8);
  addCyl(g, 0.028, 0.028, 0.02, brass, 0, 0.82, 0, 8);
  addLathe(g, [
    [0.03, 0.84],
    [0.11, 0.92],
    [0.155, 1.04],
    [0.1, 1.16],
    [0.148, 1.3],
    [0.12, 1.4],
    [0.045, 1.5],
  ], muslin, 0, 0, 0, 18);
  addCyl(g, 0.04, 0.046, 0.045, metal, 0, 1.52, 0, 10);
  const ribbon = new THREE.Mesh(new THREE.TorusGeometry(0.118, 0.012, 6, 18), toon(PAL.wine));
  ribbon.position.y = 1.15;
  ribbon.rotation.x = Math.PI / 2;
  ribbon.castShadow = true;
  g.add(ribbon);
  for (const [px, py, pz] of [[0.14, 1.3, 0.04], [-0.1, 1.26, 0.1], [0.04, 1.02, 0.15], [-0.12, 1.08, -0.06]]) {
    addSphere(g, 0.01, brass, px, py, pz, 6);
  }
  addContact(g, 0, 0.02, 0, 0.26, 0.2, 0.85);
}

function hangArm(g, side, mat) {
  const shoulder = new THREE.Vector3(side * 0.17, 1.27, 0.02);
  const dir = new THREE.Vector3(side * 0.2, -1, 0.06).normalize();
  const r = 0.03;
  const cyl = 0.3;
  const arm = addCapsule(g, r, cyl, mat, 0, 0, 0);
  arm.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
  arm.position.copy(shoulder).addScaledVector(dir, (cyl + r * 2) * 0.46);
  addSphere(g, 0.036, mat, shoulder.x, shoulder.y, shoulder.z, 8);
}

function dressedMannequin(parent, spec, y0) {
  const g = pivot(parent, spec.x, y0, spec.z, spec.rot || 0);
  const ivory = toon(PAL.ivory, { side: THREE.DoubleSide });
  const metal = toon(PAL.metal);
  const dress = toon(PAL.rust, { side: THREE.DoubleSide });
  addCyl(g, 0.17, 0.18, 0.02, metal, 0, 0.012, 0, 16);
  addCapsule(g, 0.044, 0.58, ivory, -0.062, 0.38, 0);
  addCapsule(g, 0.044, 0.58, ivory, 0.062, 0.38, 0);
  addBox(g, 0.09, 0.045, 0.15, toon(PAL.shoe), -0.062, 0.03, 0.03);
  addBox(g, 0.09, 0.045, 0.15, toon(PAL.shoe), 0.062, 0.03, 0.03);
  addLathe(g, [
    [0.145, 0.66],
    [0.158, 0.76],
    [0.112, 0.96],
    [0.108, 1.05],
    [0.148, 1.2],
    [0.15, 1.3],
    [0.07, 1.38],
  ], dress, 0, 0, 0, 18);
  const belt = new THREE.Mesh(new THREE.TorusGeometry(0.128, 0.012, 6, 16), toon(PAL.camel));
  belt.position.y = 1.02;
  belt.rotation.x = Math.PI / 2;
  belt.castShadow = true;
  g.add(belt);
  addCyl(g, 0.042, 0.048, 0.12, ivory, 0, 1.44, 0, 10);
  const head = addSphere(g, 0.095, ivory, 0, 1.58, 0, 16);
  head.scale.set(0.96, 1.12, 0.98);
  hangArm(g, -1, ivory);
  hangArm(g, 1, ivory);
  addContact(g, 0, 0.02, 0, 0.24, 0.18, 0.85);
}

function swatchBoard(g, spec, z) {
  const x = spec.x;
  const y = spec.y;
  addBox(g, spec.w + 0.08, spec.h + 0.08, 0.04, toon(PAL.wood), x, y, z);
  addBox(g, spec.w, spec.h, 0.02, toon('#e8e0d2'), x, y, z + 0.025);
  addBox(g, spec.w + 0.02, 0.018, 0.02, toon(PAL.brass), x, y + spec.h / 2 - 0.04, z + 0.04);
  const chips = [
    [-0.32, 0.32, 0.34, 0.28, PAL.ink],
    [0.02, 0.34, 0.26, 0.24, PAL.ivory],
    [0.32, 0.28, 0.28, 0.36, PAL.wine],
    [-0.34, 0.0, 0.24, 0.26, PAL.sage],
    [-0.02, -0.02, 0.3, 0.22, PAL.camel],
    [0.3, 0.0, 0.22, 0.22, PAL.rust],
    [-0.28, -0.32, 0.36, 0.16, PAL.blush],
    [0.12, -0.34, 0.32, 0.16, '#3a3a3a'],
  ];
  for (const [dx, dy, w, h, c] of chips) {
    addBox(g, w, h, 0.016, toon(c), x + dx, y + dy, z + 0.042);
  }
}

function sampleLedge(g, x, z) {
  const y = 0.5;
  addBox(g, 1.12, 0.04, 0.26, toon(PAL.wood), x, y, z);
  addBox(g, 0.05, 0.18, 0.2, toon(PAL.woodDark), x - 0.42, y - 0.1, z - 0.02);
  addBox(g, 0.05, 0.18, 0.2, toon(PAL.woodDark), x + 0.42, y - 0.1, z - 0.02);
  const rolls = [
    [-0.36, 0.32, 0.068, PAL.wine],
    [-0.14, 0.4, 0.072, PAL.ivory],
    [0.1, 0.28, 0.062, PAL.sage],
    [0.34, 0.36, 0.07, PAL.rust],
  ];
  for (const [dx, h, r, c] of rolls) {
    addCyl(g, r, r, h, toon(c), x + dx, y + 0.02 + h / 2, z, 12);
    addCyl(g, r * 0.5, r * 0.5, 0.016, toon(PAL.woodDark), x + dx, y + 0.02 + h + 0.008, z, 8);
  }
}

function curtainAlongZ(parent, x, z, width, height, yCenter) {
  const folds = 6;
  for (let i = 0; i < folds; i++) {
    const t = i / (folds - 1);
    const lz = (t - 0.5) * width;
    const wave = Math.sin(t * Math.PI * 3.0) * 0.03;
    const col = i % 2 ? PAL.curtain : PAL.curtainDeep;
    addBox(
      parent, 0.024, height, (width / folds) * 1.08,
      toon(col, { side: THREE.DoubleSide }),
      x + wave, yCenter, z + lz,
    );
  }
}

function fittingNiche(parent, n) {
  const g = new THREE.Group();
  g.name = 'fitting-niche';
  parent.add(g);
  const plaster = toon(PAL.wall);
  const wood = toon(PAL.wood);
  const blush = toon('#c9a79e');
  const xMid = (n.x0 + n.x1) / 2;
  const zMid = (n.z0 + n.z1) / 2;
  const innerW = n.x1 - n.x0;
  const innerD = n.z1 - n.z0;
  // North and south walls. East side is the curtained opening toward the room. West is the room wall.
  addBox(g, innerW, n.h, 0.08, plaster, xMid, n.h / 2, n.z0);
  addBox(g, innerW, n.h, 0.08, plaster, xMid, n.h / 2, n.z1);
  noCast(addBox(g, innerW + 0.08, 0.06, innerD, toon(PAL.soffit), xMid, n.h - 0.02, zMid));
  noCast(addBox(g, innerW - 0.16, 0.018, innerD - 0.16, blush, xMid - 0.04, 0.02, zMid));
  noCast(addBox(g, 0.28, 0.012, innerD - 0.2, blush, n.x1 + 0.08, 0.012, zMid));

  addBox(g, 0.07, n.h - 0.08, 0.07, wood, n.x1, (n.h - 0.08) / 2, n.z0 + 0.02);
  addBox(g, 0.07, n.h - 0.08, 0.07, wood, n.x1, (n.h - 0.08) / 2, n.z1 - 0.02);
  addBox(g, 0.08, 0.08, innerD, wood, n.x1, n.h - 0.14, zMid);
  addBox(g, 0.03, 0.16, innerD - 0.12, toon(PAL.curtain), n.x1 + 0.05, n.h - 0.28, zMid);
  const rod = addCyl(g, 0.012, 0.012, innerD - 0.18, toon(PAL.brass), n.x1 + 0.03, n.h - 0.38, zMid, 8);
  rod.rotation.x = Math.PI / 2;

  const openD = innerD - 0.18;
  const gap = 1.05;
  const panelW = (openD - gap) / 2;
  const hem = n.h - 0.5;
  const yCurt = hem / 2 + 0.03;
  curtainAlongZ(g, n.x1 + 0.04, zMid - gap / 2 - panelW / 2, panelW, hem, yCurt);
  curtainAlongZ(g, n.x1 + 0.04, zMid + gap / 2 + panelW / 2, panelW, hem, yCurt);

  // Mirror on the left wall, facing the opening.
  const mx = n.x0 + 0.07;
  addBox(g, 0.03, 1.46, 0.78, wood, mx, 1.22, zMid);
  const glass = addBox(
    g, 0.012, 1.3, 0.64,
    toon(PAL.glass, { emissive: '#f4f8f8', emissiveIntensity: 0.42 }),
    mx + 0.022, 1.22, zMid,
  );
  glass.userData.castShadow = false;
  const streak = addBox(
    g, 0.014, 1.3, 0.012,
    toon('#f7fbfc', { emissive: '#ffffff', emissiveIntensity: 0.6 }),
    mx + 0.03, 1.22, zMid - 0.16,
  );
  streak.userData.castShadow = false;

  const bench = pivot(g, n.x1 - 0.48, 0, zMid - 0.15, 0);
  addBox(bench, 0.42, 0.07, 0.48, toon(PAL.blush), 0, 0.4, 0);
  for (const [lx, lz] of [[-0.14, -0.16], [0.14, -0.16], [-0.14, 0.16], [0.14, 0.16]]) {
    addCyl(bench, 0.018, 0.024, 0.38, toon(PAL.wood), lx, 0.19, lz, 6);
  }
  addContact(bench, 0, 0.02, 0, 0.24, 0.26, 0.65);

  const peg = pivot(g, xMid + 0.05, 1.48, n.z0 + 0.42, -Math.PI / 2);
  addCyl(peg, 0.012, 0.012, 0.12, toon(PAL.brass), 0, 0, 0.05, 6);
  hangGarment(peg, { x: 0, type: 'dress', color: PAL.sage, hem: 0.7, yaw: 0 }, 0);

  addBox(g, 0.05, 0.1, innerD, toon(PAL.wood), n.x1 + 0.02, 0.05, zMid);
  addBox(g, innerW, 0.1, 0.04, toon(PAL.wood), xMid, 0.05, n.z1 + 0.04);
  addContact(g, xMid, 0.02, zMid, innerW * 0.4, innerD * 0.4, 0.4);
}

function platform(g, p) {
  addBox(g, p.w, p.h - 0.025, p.d, toon(PAL.stoneEdge), p.x, (p.h - 0.025) / 2, p.z);
  const cap = addBox(g, p.w + 0.06, 0.028, p.d + 0.06, toon(PAL.stone), p.x, p.h - 0.014, p.z);
  cap.userData.receiveShadow = true;
  const y = p.h + 0.004;
  const brass = toon(PAL.brass);
  addBox(g, p.w - 0.22, 0.006, 0.012, brass, p.x, y, p.z - p.d / 2 + 0.16);
  addBox(g, p.w - 0.22, 0.006, 0.012, brass, p.x, y, p.z + p.d / 2 - 0.16);
  addBox(g, 0.012, 0.006, p.d - 0.32, brass, p.x - p.w / 2 + 0.16, y, p.z);
  addBox(g, 0.012, 0.006, p.d - 0.32, brass, p.x + p.w / 2 - 0.16, y, p.z);
  addContact(g, p.x, 0.015, p.z, p.w * 0.48, p.d * 0.46, 0.7);
}

function viewBench(g, b) {
  const root = pivot(g, b.x, 0, b.z, b.rot || 0);
  addBox(root, 1.1, 0.08, 0.42, toon(PAL.sage), 0, 0.44, 0);
  addBox(root, 1.1, 0.1, 0.06, toon(PAL.ink), 0, 0.52, 0.18);
  const wood = toon(PAL.wood);
  for (const [x, z] of [[-0.46, -0.14], [-0.46, 0.14], [0.46, -0.14], [0.46, 0.14]]) {
    addBox(root, 0.045, 0.4, 0.045, wood, x, 0.2, z);
  }
  addBox(root, 0.34, 0.018, 0.26, toon(PAL.camel), -0.24, 0.49, -0.02);
  addContact(root, 0, 0.02, 0, 0.58, 0.26, 0.85);
}

function hatBoxes(g, x, z) {
  addCyl(g, 0.2, 0.2, 0.16, toon(PAL.ivory), x, 0.08, z, 16);
  addCyl(g, 0.205, 0.205, 0.02, toon(PAL.brass), x, 0.17, z, 16);
  addCyl(g, 0.15, 0.15, 0.13, toon(PAL.ink), x + 0.36, 0.065, z + 0.1, 14);
  addCyl(g, 0.12, 0.12, 0.11, toon(PAL.blush), x + 0.02, 0.08 + 0.16 + 0.055, z - 0.02, 12);
  addContact(g, x + 0.12, 0.02, z + 0.04, 0.42, 0.28, 0.75);
}

function arrangement(g, x, z) {
  const stem = toon('#4f5a40');
  const leaf = toon(PAL.sage);
  const sprigs = [[0, 0, 0.08], [0.05, -0.03, -0.18], [-0.04, 0.04, 0.22]];
  sprigs.forEach(([dx, dz, lean], i) => {
    const s = addCyl(g, 0.007, 0.011, 0.48 + i * 0.06, stem, x + dx, 0.52 + i * 0.02, z + dz, 5);
    s.rotation.z = lean;
    s.rotation.x = dz * 0.6;
    addSphere(g, 0.05, leaf, x + dx + lean * 0.15, 0.78 + i * 0.05, z + dz, 6);
  });
}

function consultProps(g, x, z) {
  const top = 0.76;
  const bolts = [
    [-0.28, -0.12, PAL.wine],
    [-0.12, -0.16, PAL.ivory],
    [-0.2, 0.02, PAL.sage],
  ];
  for (const [dx, dz, c] of bolts) {
    const roll = addCyl(g, 0.06, 0.06, 0.24, toon(c), x + dx, top + 0.06, z + dz, 12);
    roll.rotation.z = Math.PI / 2;
    roll.rotation.y = 0.4;
  }
  for (let i = 0; i < 5; i++) {
    const card = addBox(
      g, 0.11, 0.15, 0.008,
      toon([PAL.ink, PAL.rust, PAL.camel, PAL.blush, PAL.sage][i]),
      x + 0.16 + i * 0.012,
      top + 0.08,
      z + 0.08,
    );
    card.rotation.z = -0.15;
    card.rotation.y = -0.55 + i * 0.18;
  }
  addBox(g, 0.21, 0.012, 0.28, toon(PAL.ink), x + 0.18, top + 0.008, z - 0.16);
  addBox(g, 0.18, 0.006, 0.24, toon(PAL.ivory), x + 0.18, top + 0.016, z - 0.16);
  const tray = addCyl(g, 0.09, 0.09, 0.012, toon(PAL.brass), x - 0.22, top + 0.01, z + 0.16, 12);
  tray.userData.castShadow = false;
  const a = addBox(g, 0.12, 0.006, 0.028, toon(PAL.metal), x - 0.22, top + 0.025, z + 0.16);
  a.rotation.y = 0.5;
  const b = addBox(g, 0.12, 0.006, 0.028, toon(PAL.metal), x - 0.22, top + 0.032, z + 0.16);
  b.rotation.y = -0.35;
}

function makeShell(layout) {
  const g = new THREE.Group();
  g.name = 'shell';
  const R = roomFrame(layout);
  const Z = layout.zones;
  const wall = toon(PAL.wall);
  const floor = noCast(addBox(g, R.W, 0.08, R.D, toon(PAL.floor), 0, -0.04, 0));
  floor.userData.receiveShadow = true;
  const back = addBox(g, R.W, R.H, R.t, wall, 0, R.H / 2, R.zB);
  back.userData.castShadow = false;
  const left = addBox(g, R.t, R.H, R.D, wall, R.xL, R.H / 2, 0);
  left.userData.castShadow = false;

  // large-format stone joints, then the clear inset that marks the pause
  const grout = toon(PAL.grout);
  for (const x of [-3.2, -1.6, 0, 1.6, 3.2]) {
    noCast(addBox(g, 0.015, 0.006, R.D - 0.3, grout, x, 0.004, 0));
  }
  for (const z of [-2.4, -0.8, 0.8, 2.4]) {
    noCast(addBox(g, R.W - 0.3, 0.006, 0.015, grout, 0, 0.004, z));
  }
  noCast(addBox(g, 1.7, 0.012, 1.35, toon(PAL.inset), -0.35, 0.008, 0.05));
  const brass = toon(PAL.brass);
  noCast(addBox(g, 1.7, 0.004, 0.012, brass, -0.35, 0.016, 0.05 - 0.67));
  noCast(addBox(g, 1.7, 0.004, 0.012, brass, -0.35, 0.016, 0.05 + 0.67));
  noCast(addBox(g, 0.012, 0.004, 1.35, brass, -0.35 - 0.85, 0.016, 0.05));
  noCast(addBox(g, 0.012, 0.004, 1.35, brass, -0.35 + 0.85, 0.016, 0.05));

  addBox(g, R.W - 0.25, 0.1, 0.045, toon(PAL.wood), 0.05, 0.05, R.zIn + 0.02);
  addBox(g, 0.045, 0.1, R.D - 0.25, toon(PAL.wood), R.xIn + 0.02, 0.05, 0.05);

  // clerestory — a frosted slot. Thin pieces do not cast; hard shadows from them alias on the wall.
  const glass = addBox(
    g, R.W - 1.3, 0.3, 0.025,
    toon('#e7eef0', { emissive: '#d5e4e6', emissiveIntensity: 0.28 }),
    0.3, 2.62, R.zIn + 0.02,
  );
  glass.userData.castShadow = false;
  for (const x of [-2.6, -0.9, 0.8, 2.5]) {
    noCast(addBox(g, 0.04, 0.36, 0.04, toon(PAL.wood), x, 2.62, R.zIn + 0.03));
  }

  // stepped ceiling: lower soffit over the display wall, higher slab over the room
  noCast(addBox(g, R.W - 0.45, 0.22, 1.85, toon(PAL.soffit), 0.05, R.H - 0.11, R.zB + 0.95));
  noCast(addBox(g, R.W - 1.1, 0.08, R.D * 0.62, toon(PAL.ceiling), -0.15, R.H - 0.05, 0.15));
  noCast(addBox(g, 5.4, 0.035, 0.045, toon(PAL.metal), 0.15, R.H - 0.32, -2.45));
  for (const x of [-2.15, -0.45, 0.55, 2.45]) trackSpot(g, x, R.H - 0.4, -2.45);

  platform(g, Z.platform);
  fittingNiche(g, Z.niche);
  return g;
}

function makeProcedural(layout) {
  const g = new THREE.Group();
  g.name = 'procedural';
  const Z = layout.zones;
  const R = roomFrame(layout);
  swatchBoard(g, Z.swatch, R.zIn + 0.05);
  sampleLedge(g, Z.swatch.x, R.zIn + 0.22);
  clothingRail(g, Z.railBack, BACK_GARMENTS);
  clothingRail(g, Z.railSide, SIDE_GARMENTS);
  dressForm(g, Z.dressForm, Z.platform.h);
  dressedMannequin(g, Z.mannequin, Z.platform.h);
  viewBench(g, Z.bench);
  hatBoxes(g, -3.62, -2.28);
  arrangement(g, Z.vase.x, Z.vase.z);
  consultProps(g, Z.consult.x, Z.consult.z);
  // practical glow tucked at the pendant shade
  bulb(g, Z.consult.x, 2.72, Z.consult.z, 0.045);
  return g;
}

boot({
  makeShell,
  makeProcedural,
  readyText: 'ready — fashion showroom · drag orbit · U unlit · T toon',
});
