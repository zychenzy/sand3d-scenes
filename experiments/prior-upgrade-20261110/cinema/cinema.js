import * as THREE from 'three';
import { boot, toon, addBox, addCyl, slab } from './scene_lib.js';

/**
 * Small cinema — prior-upgrade of the v1 screening room.
 * Screen on −Z. Theatre-chair GLB: backrest +Z, cushion −Z, occupant faces −Z.
 * rotationY stays near 0 (outer toe-in only). Do not use π.
 *
 * Zones: proscenium, raked house split by a center aisle, rear foyer/concession.
 */

const H = 3.52;
const XL = -5.2;
const XR = 5.18;
const ZS = -4.52;
const ZB = 4.38;
const STAGE = 0.06;
const T0 = 0.1;
const T1 = 0.34;
const T2 = 0.6;
const Z_STAGE = -2.92;
const Z_T1 = -0.52;
const Z_T2 = 1.18;
const Z_FOYER = 2.72;
const AISLE = 0.64;

const C = {
  wall: '#3e363c',
  wallDeep: '#2a2228',
  wood: '#5a3a28',
  woodDark: '#3a2418',
  brass: '#c4a06a',
  brassDark: '#7a5630',
  drape: '#6a2430',
  drapeDeep: '#3e121c',
  drapeHi: '#8a3a48',
  carpet: '#5a3040',
  carpetDeep: '#3a1c28',
  runner: '#7a3850',
  ceiling: '#1a161a',
  coffer: '#121014',
  stage: '#241820',
  lamp: '#ffd2a8',
  sky: '#c45c38',
  skyHi: '#e8a060',
  water: '#2a3048',
  waterHi: '#3a4868',
  sun: '#f4d090',
  exit: '#2a8a48',
};

function mark(mesh, flags) {
  if (!mesh) return mesh;
  if (flags.noCast) mesh.userData.noCast = true;
  if (flags.basic) mesh.userData.shade = 'basic';
  if (flags.noReceive) mesh.userData.noReceive = true;
  return mesh;
}

function lampMat(intensity = 1.1) {
  return toon(C.lamp, { emissive: '#ffb15e', emissiveIntensity: intensity, fog: false });
}

function makeShell() {
  const g = new THREE.Group();
  g.name = 'shell';
  const wall = toon(C.wall);
  const wallDeep = toon(C.wallDeep);
  const wood = toon(C.wood);
  const woodDark = toon(C.woodDark);
  const brass = toon(C.brass);
  const brassDark = toon(C.brassDark);

  // Subfloor, open on +X / +Z so the rake reads as a section.
  slab(g, XL - 0.16, XR, -0.14, 0, ZS - 0.16, ZB, woodDark);

  // Screen wall with a short right-hand return so the proscenium has a jamb.
  slab(g, XL - 0.16, 5.42, 0, H, ZS - 0.16, ZS, wall);
  slab(g, 5.28, 5.42, 0, H, ZS - 0.16, -3.55, wall);

  // Left wall: house run, then a door opening into the foyer, then a rear jamb.
  slab(g, XL - 0.16, XL, 0, H, ZS - 0.16, 3.02, wall);
  slab(g, XL - 0.16, XL, 0, H, 4.08, ZB, wall);
  slab(g, XL - 0.16, XL, 2.48, H, 3.02, 4.08, wall);
  slab(g, XL - 0.16, XL, 0, T2, 3.02, 4.08, wallDeep);

  // House ceiling stops short of the open right side and does not steal the key.
  mark(slab(g, XL, 2.55, 3.38, 3.52, ZS, 2.55, toon(C.ceiling)), { noCast: true });
  mark(slab(g, XL, 4.2, 3.12, 3.24, Z_FOYER, ZB, toon(C.ceiling)), { noCast: true });

  // Arch beam between house and foyer.
  slab(g, XL, 4.35, 2.42, 3.4, Z_FOYER - 0.08, Z_FOYER + 0.08, wallDeep);
  slab(g, XL, 4.4, 2.38, 2.48, Z_FOYER - 0.12, Z_FOYER + 0.12, wood);
  slab(g, XL, 4.42, 2.46, 2.52, Z_FOYER - 0.14, Z_FOYER + 0.14, brass);

  // Baseboard, picture rail, wainscot — screen wall only outside the frame.
  slab(g, XL, XL + 0.05, 3.12, 3.18, -4.2, 2.55, brassDark);
  slab(g, XL, XL + 0.06, 0, 0.1, ZS, 3.0, woodDark);
  slab(g, XL, XL + 0.06, T2, T2 + 0.08, 4.1, ZB, woodDark);
  slab(g, XL, XL + 0.04, 0.1, 0.86, -4.15, 2.55, wood);
  slab(g, -5.05, -2.85, 0.08, 0.88, ZS, ZS + 0.05, wood);
  slab(g, 2.85, 5.2, 0.08, 0.88, ZS, ZS + 0.05, wood);
  slab(g, -2.85, 2.85, 0, 0.14, ZS, ZS + 0.04, woodDark);

  buildFoyerDoor(g, wood, woodDark, brass, brassDark);
  return g;
}

function buildFoyerDoor(g, wood, woodDark, brass, brassDark) {
  // Casing proud of the house wall.
  slab(g, XL, XL + 0.08, T2, 2.5, 3.0, 3.1, wood);
  slab(g, XL, XL + 0.08, T2, 2.5, 4.0, 4.1, wood);
  slab(g, XL, XL + 0.1, 2.42, 2.56, 3.0, 4.1, wood);
  slab(g, XL, XL + 0.12, 2.54, 2.62, 2.96, 4.14, brass);

  const hinge = new THREE.Group();
  hinge.name = 'exit-door';
  hinge.position.set(XL - 0.02, T2, 3.08);
  hinge.rotation.y = -0.72;
  addBox(hinge, 0.05, 1.78, 0.92, wood, -0.04, 0.9, 0.46);
  addBox(hinge, 0.02, 1.78, 0.04, brassDark, -0.068, 0.9, 0.04);
  addBox(hinge, 0.02, 1.78, 0.04, brassDark, -0.068, 0.9, 0.88);
  addBox(hinge, 0.02, 0.18, 0.05, brass, -0.075, 0.95, 0.78);
  g.add(hinge);

  // Illuminated EXIT over the opening, readable from the aisle.
  const glow = toon(C.exit, { emissive: '#1e7a3c', emissiveIntensity: 1.15, fog: false });
  slab(g, XL + 0.02, XL + 0.08, 2.62, 2.84, 3.28, 3.82, glow);
  for (const z of [3.36, 3.48, 3.6, 3.72]) {
    slab(g, XL + 0.07, XL + 0.09, 2.66, 2.8, z, z + 0.04, toon('#0c2414'));
  }
}

function makeProcedural(layout) {
  const g = new THREE.Group();
  g.name = 'procedural';
  const wood = toon(C.wood);
  const woodDark = toon(C.woodDark);
  const brass = toon(C.brass);
  const brassDark = toon(C.brassDark);
  const carpet = toon(C.carpet);
  const carpetDeep = toon(C.carpetDeep);
  const lamp = lampMat();

  buildRake(g, wood, woodDark, carpet, carpetDeep, brass);
  buildScreen(g, wood, woodDark, brass, brassDark, lamp);
  buildPanels(g);
  buildCeiling(g, lamp, brass);
  buildAisleLights(g, lamp, brassDark);
  buildFoyer(g, wood, woodDark, brass, brassDark, lamp);
  buildProjector(g, woodDark, brass, lamp);

  for (const inst of layout.instances || []) {
    if (inst.kind === 'theatre_chair') {
      contactDisc(g, inst.position[0], inst.position[1] + 0.01, inst.position[2], 0.32, 0.24);
    }
    if (inst.kind === 'speaker') {
      const [x, y, z] = inst.position;
      slab(g, x - 0.28, x + 0.28, STAGE, y - 0.02, z - 0.18, z + 0.18, woodDark);
      slab(g, x - 0.32, x + 0.32, y - 0.04, y - 0.008, z - 0.22, z + 0.22, brass);
      contactDisc(g, x, y + 0.008, z, 0.26, 0.16);
    }
    if (inst.kind === 'cup_mug') {
      contactDisc(g, inst.position[0], inst.position[1] + 0.004, inst.position[2], 0.06, 0.06);
    }
  }
  return g;
}

function nosing(g, x0, x1, z, top, wood, brass) {
  slab(g, x0, x1, top - 0.04, top + 0.008, z - 0.045, z + 0.012, wood);
  slab(g, x0, x1, top - 0.008, top + 0.016, z - 0.06, z - 0.028, brass);
}

function cheek(g, x0, x1, y0, y1, z0, z1, mat) {
  slab(g, x0, x1, y0, y1, z0, z1, mat);
}

function buildRake(g, wood, woodDark, carpet, carpetDeep, brass) {
  // Stage lip under the screen.
  slab(g, XL + 0.06, 5.22, 0, STAGE, ZS + 0.04, Z_STAGE, toon(C.stage));
  nosing(g, XL + 0.2, 5.1, Z_STAGE, STAGE, wood, brass);

  // Orchestra floor between stage and first riser, plus the front-row dais.
  slab(g, XL + 0.08, 5.28, 0, 0.022, Z_STAGE, Z_T1, carpetDeep);
  slab(g, -2.55, 2.55, 0.02, T0, -2.22, -1.12, toon(C.carpet));
  nosing(g, -2.55, 2.55, -2.22, T0, wood, brass);
  slab(g, -2.55, 2.55, T0 - 0.04, T0, -1.16, -1.1, wood);
  cheek(g, -2.58, -2.5, 0.02, T0, -2.22, -1.12, woodDark);
  cheek(g, 2.5, 2.58, 0.02, T0, -2.22, -1.12, woodDark);

  // Middle landing.
  slab(g, XL + 0.06, 5.3, 0, T1, Z_T1, Z_T2, carpet);
  cheek(g, 5.22, 5.34, 0, T1, Z_T1, Z_T2, woodDark);
  nosing(g, XL + 0.1, 5.18, Z_T1, T1, wood, brass);

  // Rear landing + foyer floor, one level.
  slab(g, XL + 0.06, 5.3, 0, T2, Z_T2, ZB - 0.06, carpet);
  cheek(g, 5.22, 5.34, 0, T2, Z_T2, ZB - 0.06, woodDark);
  slab(g, XL + 0.1, 5.22, 0, T2, ZB - 0.1, ZB - 0.02, woodDark);
  nosing(g, XL + 0.1, 5.18, Z_T2, T2, wood, brass);

  // Center-aisle and side-aisle treads — the seating fascia stays a tall face.
  const bands = [
    [ -AISLE, AISLE ],
    [ XL + 0.08, -3.52 ],
    [ 3.52, 5.22 ],
  ];
  for (const [x0, x1] of bands) {
    slab(g, x0, x1, 0, T1 * 0.5, Z_T1 - 0.38, Z_T1, carpetDeep);
    nosing(g, x0, x1, Z_T1 - 0.38, T1 * 0.5, wood, brass);
    slab(g, x0, x1, T1, T1 + (T2 - T1) * 0.5, Z_T2 - 0.36, Z_T2, carpetDeep);
    nosing(g, x0, x1, Z_T2 - 0.36, T1 + (T2 - T1) * 0.5, wood, brass);
  }

  const runner = toon(C.runner, { polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  // Center aisle runner, broken at the treads so the steps stay readable.
  slab(g, -0.28, 0.28, 0.028, 0.042, Z_STAGE + 0.12, Z_T1 - 0.42, runner);
  slab(g, -0.28, 0.28, T1 + 0.012, T1 + 0.026, Z_T1 + 0.06, Z_T2 - 0.4, runner);
  slab(g, -0.28, 0.28, T2 + 0.012, T2 + 0.026, Z_T2 + 0.08, 2.55, runner);
  slab(g, -4.85, 4.6, T2 + 0.018, T2 + 0.032, 2.88, 3.42, runner);
  slab(g, -4.7, -3.7, 0.028, 0.042, Z_STAGE + 0.12, Z_T1 - 0.42, runner);
  slab(g, 3.7, 4.7, 0.028, 0.042, Z_STAGE + 0.12, Z_T1 - 0.42, runner);
  slab(g, -4.7, -3.7, T1 + 0.012, T1 + 0.026, Z_T1 + 0.06, Z_T2 - 0.4, runner);
  slab(g, 3.7, 4.7, T1 + 0.012, T1 + 0.026, Z_T1 + 0.06, Z_T2 - 0.4, runner);

  // Rear rail behind the last row, split by the aisle.
  for (const [x0, x1] of [[-3.45, -0.72], [0.72, 3.45]]) {
    slab(g, x0, x1, T2 + 0.72, T2 + 0.76, 2.32, 2.38, brass);
    slab(g, x0, x0 + 0.04, T2, T2 + 0.74, 2.3, 2.4, woodDark);
    slab(g, x1 - 0.04, x1, T2, T2 + 0.74, 2.3, 2.4, woodDark);
  }
}

function buildScreen(g, wood, woodDark, brass, brassDark, lamp) {
  const zWall = ZS + 0.02;
  mark(slab(g, -3.25, 3.25, 3.14, 3.52, ZS, -3.62, toon(C.ceiling)), { noCast: true });
  slab(g, -3.05, 3.05, 3.12, 3.18, -3.7, -3.52, lamp);

  slab(g, -2.68, 2.68, 0.48, 2.92, zWall, zWall + 0.06, brass);
  slab(g, -2.48, 2.48, 0.64, 2.78, zWall + 0.04, zWall + 0.09, woodDark);
  slab(g, -2.24, 2.24, 0.76, 2.64, zWall + 0.07, zWall + 0.11, toon('#100c10'));

  const z0 = zWall + 0.1;
  const z1 = zWall + 0.13;
  slab(g, -2.18, 2.18, 0.8, 2.6, z0, z1, toon('#140c0c'));
  slab(g, -2.12, 2.12, 1.55, 2.52, z0 + 0.01, z1 + 0.02, toon(C.sky, { emissive: '#a04028', emissiveIntensity: 0.4 }));
  slab(g, -2.12, 2.12, 1.85, 2.35, z0 + 0.02, z1 + 0.03, toon(C.skyHi, { emissive: '#c87840', emissiveIntensity: 0.28 }));
  slab(g, -2.12, 2.12, 0.86, 1.62, z0 + 0.02, z1 + 0.03, toon(C.water, { emissive: '#1a2438', emissiveIntensity: 0.22 }));
  slab(g, -2.12, 2.12, 1.48, 1.62, z0 + 0.03, z1 + 0.045, toon(C.waterHi, { emissive: '#2a3858', emissiveIntensity: 0.2 }));
  const sun = new THREE.Mesh(
    new THREE.CircleGeometry(0.22, 22),
    toon(C.sun, { emissive: '#f0c070', emissiveIntensity: 0.85, fog: false }),
  );
  sun.position.set(0.15, 1.92, z1 + 0.05);
  g.add(sun);
  slab(g, -1.55, -0.35, 1.05, 1.32, z0 + 0.04, z1 + 0.06, toon('#1a1820'));
  slab(g, 0.55, 1.65, 0.98, 1.28, z0 + 0.04, z1 + 0.06, toon('#16141c'));

  for (const x of [-2.92, 2.92]) {
    slab(g, x - 0.1, x + 0.1, STAGE, 3.16, -4.42, -4.22, wood);
    slab(g, x - 0.16, x + 0.16, 3.1, 3.24, -4.46, -4.18, brass);
    slab(g, x - 0.15, x + 0.15, STAGE, STAGE + 0.12, -4.48, -4.18, woodDark);
  }

  hungDrapes(g, -3.38, -4.32);
  hungDrapes(g, 3.38, -4.32);
  valance(g, -3.75, 3.75, 3.12, -4.28);
}

function hungDrapes(g, x, z) {
  const y0 = STAGE;
  const y1 = 3.1;
  const folds = 8;
  const span = 0.78;
  for (let i = 0; i < folds; i++) {
    const t = i / (folds - 1);
    const xx = x + (t - 0.5) * span;
    const deep = i % 2 === 0;
    const mat = toon(deep ? C.drapeDeep : (i % 3 === 0 ? C.drapeHi : C.drape));
    const h = (y1 - y0) * (deep ? 1 : 0.96);
    addBox(g, 0.08, h, deep ? 0.1 : 0.05, mat, xx, y0 + h / 2, z + (deep ? 0.045 : 0));
  }
  const band = addCyl(g, 0.02, 0.02, span * 0.9, toon(C.brass), x, y0 + (y1 - y0) * 0.46, z + 0.1, 10);
  band.rotation.z = Math.PI / 2;
  addBox(g, 0.1, 0.08, 0.08, toon(C.brassDark), x, y0 + (y1 - y0) * 0.46, z + 0.12);
}

function valance(g, x0, x1, y, z) {
  const n = 15;
  const span = x1 - x0;
  for (let i = 0; i < n; i++) {
    const t = (i + 0.5) / n;
    const x = x0 + span * t;
    const scallop = 0.12 + 0.2 * Math.sin(t * Math.PI * 5) ** 2;
    addBox(g, span / n + 0.02, scallop, 0.07, toon(i % 2 ? C.drape : C.drapeDeep), x, y - scallop / 2, z);
  }
  slab(g, x0 - 0.08, x1 + 0.08, y, y + 0.1, z - 0.04, z + 0.08, toon(C.woodDark));
  slab(g, x0 - 0.12, x1 + 0.12, y + 0.08, y + 0.13, z - 0.05, z + 0.1, toon(C.brass));
}

function wallPanelX(g, xInner, y, z, w, h, d, color, dir) {
  const cx = xInner + dir * (d / 2 + 0.012);
  slab(g, cx - dir * (d / 2 + 0.01), cx - dir * (d / 2), y - h / 2 - 0.03, y + h / 2 + 0.03, z - w / 2 - 0.03, z + w / 2 + 0.03, toon(C.brassDark));
  addBox(g, d, h, w, toon(color), cx, y, z);
}

function wallPanelZ(g, zInner, x, y, w, h, d, color) {
  const cz = zInner + d / 2 + 0.012;
  slab(g, x - w / 2 - 0.03, x + w / 2 + 0.03, y - h / 2 - 0.03, y + h / 2 + 0.03, cz - d / 2 - 0.01, cz - d / 2, toon(C.brassDark));
  addBox(g, w, h, d, toon(color), x, y, cz);
}

function buildPanels(g) {
  const left = [
    [-3.85, 2.08, 0.7, 1.32, 0.055, '#3c3450'],
    [-2.85, 1.92, 0.55, 1.55, 0.08, '#5a3044'],
    [-1.85, 2.18, 0.82, 1.12, 0.05, '#2c3840'],
    [-0.75, 1.85, 0.58, 1.48, 0.07, '#483850'],
    [0.35, 2.12, 0.72, 1.18, 0.05, '#3a3046'],
    [1.35, 1.95, 0.6, 1.4, 0.075, '#543848'],
  ];
  for (const [z, y, w, h, d, color] of left) {
    wallPanelX(g, XL, y, z, w, h, d, color, 1);
  }
  for (const [x, y, w, h, d, color] of [
    [-4.42, 2.12, 0.78, 1.18, 0.06, '#3c3450'],
    [-4.35, 1.22, 0.52, 0.52, 0.045, '#2c3840'],
    [4.38, 2.18, 0.82, 1.12, 0.07, '#5a3044'],
    [4.28, 1.24, 0.48, 0.5, 0.05, '#3a3046'],
  ]) {
    wallPanelZ(g, ZS, x, y, w, h, d, color);
  }
  sconce(g, XL + 0.02, 2.22, -3.15, 1);
  sconce(g, XL + 0.02, 2.22, -0.15, 1);
  sconce(g, XL + 0.02, 2.22, 2.15, 1);
}

function sconce(g, x, y, z, dir) {
  const brass = toon(C.brass);
  const lamp = lampMat(1.2);
  addBox(g, 0.035, 0.16, 0.1, brass, x + dir * 0.02, y, z);
  addBox(g, 0.14, 0.028, 0.028, brass, x + dir * 0.1, y, z);
  addCyl(g, 0.055, 0.034, 0.07, lamp, x + dir * 0.18, y - 0.03, z, 12);
}

function buildCeiling(g, lamp, brass) {
  const coffer = toon(C.coffer);
  const spots = [
    [-1.55, -2.15], [0, -2.05], [1.55, -2.2],
    [-1.5, -0.25], [0, -0.1], [1.55, -0.3],
    [-1.4, 1.45], [1.4, 1.4],
  ];
  for (const [x, z] of spots) {
    mark(addBox(g, 1.05, 0.04, 0.78, coffer, x, 3.36, z), { noCast: true });
    addCyl(g, 0.06, 0.06, 0.02, lamp, x, 3.32, z, 14);
  }
  for (const [x, z, len, color] of [
    [-2.15, 0.35, 1.25, '#3c3450'],
    [-0.85, 0.85, 1.05, '#5a3044'],
    [1.05, 0.45, 1.35, '#2c3840'],
  ]) {
    addBox(g, 0.04, 0.26, len, toon(color), x, 3.18, z);
    addBox(g, 0.02, 0.02, len, brass, x, 3.32, z);
  }
}

function buildAisleLights(g, lamp, brassDark) {
  const puck = (x, y, z) => {
    addCyl(g, 0.04, 0.045, 0.016, brassDark, x, y, z, 10);
    addCyl(g, 0.026, 0.026, 0.01, lamp, x, y + 0.01, z, 10);
  };
  for (const x of [-0.42, 0.42, -4.15, 4.15]) {
    for (const z of [-2.55, -1.75, -0.95]) puck(x, 0.035, z);
    puck(x, T1 * 0.5 + 0.018, Z_T1 - 0.18);
    for (const z of [-0.15, 0.55]) puck(x, T1 + 0.02, z);
    puck(x, T1 + (T2 - T1) * 0.5 + 0.018, Z_T2 - 0.16);
    for (const z of [1.55, 2.25]) puck(x, T2 + 0.02, z);
  }
  slab(g, -3.35, -0.72, T1 - 0.08, T1 - 0.05, Z_T1 - 0.03, Z_T1 - 0.004, lamp);
  slab(g, 0.72, 3.35, T1 - 0.08, T1 - 0.05, Z_T1 - 0.03, Z_T1 - 0.004, lamp);
  slab(g, -3.35, -0.72, T2 - 0.08, T2 - 0.05, Z_T2 - 0.03, Z_T2 - 0.004, lamp);
  slab(g, 0.72, 3.35, T2 - 0.08, T2 - 0.05, Z_T2 - 0.03, Z_T2 - 0.004, lamp);
  slab(g, -2.4, 2.4, T0 - 0.045, T0 - 0.025, -2.26, -2.23, lamp);
  for (const [x0, x1] of [[-AISLE, AISLE], [XL + 0.1, -3.52], [3.52, 5.1]]) {
    slab(g, x0, x1, T1 * 0.5 - 0.045, T1 * 0.5 - 0.025, Z_T1 - 0.41, Z_T1 - 0.38, lamp);
    slab(g, x0, x1, T1 + (T2 - T1) * 0.5 - 0.045, T1 + (T2 - T1) * 0.5 - 0.025, Z_T2 - 0.39, Z_T2 - 0.36, lamp);
  }
}

function buildFoyer(g, wood, woodDark, brass, brassDark, lamp) {
  // Concession counter on the left, ticket board above, popcorn kettle.
  slab(g, -5.05, -3.55, T2, T2 + 0.92, 3.12, 4.18, woodDark);
  slab(g, -5.08, -3.48, T2 + 0.92, T2 + 0.98, 3.06, 4.22, wood);
  slab(g, -5.0, -3.6, T2, T2 + 0.06, 3.08, 4.2, brassDark);
  const railFront = addCyl(g, 0.02, 0.02, 1.05, brass, -3.56, T2 + 0.16, 3.65, 8);
  railFront.rotation.x = Math.PI / 2;

  slab(g, XL + 0.04, XL + 0.1, 1.85, 2.55, 3.25, 4.05, toon('#1c1814'));
  for (let i = 0; i < 5; i++) {
    slab(g, XL + 0.09, XL + 0.12, 2.4 - i * 0.1, 2.46 - i * 0.1, 3.35, 3.95, toon('#f0e4d0'));
  }

  addCyl(g, 0.16, 0.18, 0.42, toon('#c45c28'), -4.55, T2 + 1.2, 3.45, 12);
  addCyl(g, 0.14, 0.14, 0.08, toon('#2a2a30'), -4.55, T2 + 1.44, 3.45, 12);
  addCyl(g, 0.05, 0.05, 0.16, toon('#4a4a52'), -4.55, T2 + 1.55, 3.45, 8);
  for (const [dx, dz] of [[-0.06, 0.04], [0.05, -0.03], [0.02, 0.07], [-0.04, -0.06], [0.07, 0.02]]) {
    addBox(g, 0.04, 0.035, 0.03, toon('#f0d060'), -4.55 + dx, T2 + 1.64, 3.45 + dz);
  }
  addBox(g, 0.12, 0.16, 0.1, toon('#f2efe6'), -4.15, T2 + 1.06, 3.7);
  addBox(g, 0.12, 0.03, 0.1, toon('#c43c3c'), -4.15, T2 + 1.15, 3.7);
  addBox(g, 0.1, 0.05, 0.02, toon('#f2efe6'), -4.15, T2 + 1.08, 3.64);

  // Coat rail on the foyer return.
  const rail = addCyl(g, 0.012, 0.012, 0.95, brassDark, -4.85, T2 + 1.22, 4.12, 8);
  rail.rotation.x = Math.PI / 2;
  coat(g, -4.85, T2 + 1.16, 3.85);
  coat(g, -4.85, T2 + 1.16, 4.12);

  // Stanchions at the aisle head.
  for (const x of [-0.7, 0.7]) {
    addCyl(g, 0.045, 0.05, 0.04, brass, x, T2 + 0.02, 2.58, 10);
    addCyl(g, 0.018, 0.018, 0.82, brassDark, x, T2 + 0.44, 2.58, 8);
    addCyl(g, 0.04, 0.04, 0.03, brass, x, T2 + 0.86, 2.58, 10);
  }
  const rope = addCyl(g, 0.012, 0.012, 1.35, toon(C.drapeDeep), 0, T2 + 0.78, 2.58, 8);
  rope.rotation.z = Math.PI / 2;

  sconce(g, XL + 0.02, T2 + 1.55, 3.55, 1);
}

function coat(g, x, y, z) {
  addCyl(g, 0.012, 0.012, 0.08, toon(C.brass), x + 0.04, y + 0.04, z, 6);
  addBox(g, 0.16, 0.08, 0.26, toon('#3a3040'), x + 0.1, y - 0.06, z);
  addBox(g, 0.14, 0.4, 0.22, toon('#2a242c'), x + 0.1, y - 0.28, z);
}

function buildProjector(g, woodDark, brass, lamp) {
  const x = 0;
  const y = 3.02;
  const z = 3.05;
  addCyl(g, 0.018, 0.018, 2.4, brass, x, 3.28, 1.9, 8);
  addBox(g, 0.32, 0.18, 0.42, woodDark, x, y, z);
  addCyl(g, 0.07, 0.08, 0.12, brass, x, y, z - 0.26, 12);
  addCyl(g, 0.04, 0.04, 0.04, lamp, x, y, z - 0.32, 12);
}

function contactDisc(g, x, y, z, rx, rz) {
  const m = new THREE.Mesh(
    new THREE.CircleGeometry(1, 18),
    new THREE.MeshBasicMaterial({ color: 0x14080c, transparent: true, opacity: 0.4, depthWrite: false }),
  );
  m.rotation.x = -Math.PI / 2;
  m.scale.set(rx, rz, 1);
  m.position.set(x, y, z);
  m.userData.shade = 'basic';
  m.userData.noCast = true;
  m.renderOrder = 2;
  g.add(m);
}

function auditFacing(props) {
  const rows = [];
  const bad = [];
  for (const seat of props.children) {
    if (!seat.name.startsWith('seat_')) continue;
    let cushion = null;
    let back = null;
    seat.traverse((o) => {
      if (o.name === 'cushion') cushion = o;
      if (o.name === 'back_surface') back = o;
    });
    if (!cushion || !back) {
      bad.push(`${seat.name}: missing cushion/back mesh`);
      continue;
    }
    const cc = new THREE.Box3().setFromObject(cushion).getCenter(new THREE.Vector3());
    const bc = new THREE.Box3().setFromObject(back).getCenter(new THREE.Vector3());
    const dz = cc.z - bc.z;
    const dx = cc.x - bc.x;
    const frontTowardScreen = dz < -0.08 && Math.abs(dz) > Math.abs(dx);
    rows.push({ id: seat.name, dz: +dz.toFixed(3), x: +seat.position.x.toFixed(3) });
    if (!frontTowardScreen) bad.push(`${seat.name} dz=${dz.toFixed(3)} dx=${dx.toFixed(3)}`);
    if (Math.abs(seat.position.x) < 0.85) bad.push(`${seat.name} sits in the center aisle`);
  }
  return { count: rows.length, bad, rows };
}

boot({
  makeShell,
  makeProcedural,
  readyText: 'ready — small cinema · drag orbit · U unlit · T toon',
  after({ props, setStatus }) {
    const report = auditFacing(props);
    window.__facing = report;
    if (report.bad.length) {
      console.error('seat facing', report);
      setStatus(`FACING ERROR — ${report.bad[0]}`);
    } else {
      console.log('seat facing ok', report);
      setStatus(`ready — ${report.count} seats face the screen · center aisle · U unlit · T toon`);
    }
  },
});
