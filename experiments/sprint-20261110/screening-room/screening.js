import * as THREE from 'three';
import { boot, toon, addBox, addCyl, slab } from './scene_lib.js';

/**
 * Boutique screening room.
 * Screen wall is -Z. Theatre-chair GLB: backrest at +Z, cushion toward -Z,
 * so rotationY near 0 faces the screen. Do not use π.
 *
 * Two zones: the stepped house (screen, loge, aisles) and a raised entry niche
 * cut into the left wall at the rear cross-aisle.
 */

const H = 3.9;
const INNER_L = -5.5;
const INNER_S = -5.18;
const Z_BACK = 4.22;
const X_OPEN = 5.58;
const STAGE = 0.07;
const DAIS = 0.12;
const T1 = 0.34;
const T2 = 0.62;
const Z_STAGE = -3.4;
const Z_T1 = -0.7;
const Z_T2 = 1.22;
const AISLE = 3.02;

const C = {
  wall: '#322830',
  wallDeep: '#241c22',
  wood: '#5a3c2c',
  woodDark: '#3a281e',
  brass: '#c4a15e',
  brassDark: '#7c5a32',
  drape: '#7c2840',
  drapeDeep: '#4a1424',
  drapeHi: '#9a4460',
  carpet: '#4a3040',
  carpetDeep: '#2e1c28',
  stage: '#241820',
  runner: '#6a3048',
  ceiling: '#161218',
  coffer: '#0e0c10',
  plaster: '#3a3036',
  lamp: '#ffd2a8',
  sky: '#2a3c62',
  skyDeep: '#1a2848',
  land: '#141016',
  ridge: '#2a242c',
};

function mark(mesh, flags) {
  if (!mesh) return mesh;
  if (flags.noCast) mesh.userData.noCast = true;
  if (flags.basic) mesh.userData.shade = 'basic';
  if (flags.noReceive) mesh.userData.noReceive = true;
  return mesh;
}

function makeShell() {
  const g = new THREE.Group();
  g.name = 'shell';
  const wall = toon(C.wall);
  const wallDeep = toon(C.wallDeep);
  const wood = toon(C.wood);
  const woodDark = toon(C.woodDark);
  const ceil = toon(C.ceiling);

  // Wood subfloor, open on +X / +Z so the cutaway reads as a section.
  slab(g, INNER_L - 0.16, X_OPEN, -0.16, 0, INNER_S - 0.16, Z_BACK, woodDark);

  // Screen wall runs into the right-hand return; the house itself stays open past that return.
  slab(g, INNER_L - 0.16, 5.58, 0, H, INNER_S - 0.16, INNER_S, wall);

  // Left wall, broken for the entry opening (z 2.50–3.88, above the rear floor).
  slab(g, INNER_L - 0.16, INNER_L, 0, H, INNER_S - 0.16, 2.5, wall);
  slab(g, INNER_L - 0.16, INNER_L, 0, H, 3.88, Z_BACK, wall);
  slab(g, INNER_L - 0.16, INNER_L, 2.5, H, 2.5, 3.88, wall);
  slab(g, INNER_L - 0.16, INNER_L, 0, T2, 2.5, 3.88, wallDeep);

  // Short return at the screen's right corner so the proscenium has a jamb,
  // then the +X side opens for the cutaway.
  slab(g, 5.42, 5.58, 0, H, INNER_S - 0.16, -3.7, wall);

  // Ceiling stops short of the open right side. It does not cast, so the key
  // light still reaches the house.
  mark(slab(g, INNER_L, 2.7, 3.76, 3.9, INNER_S, 3.35, ceil), { noCast: true });

  // Picture rail and baseboard on the long wall.
  slab(g, INNER_L, INNER_L + 0.05, 3.22, 3.28, -4.6, 2.35, toon(C.brassDark));
  slab(g, INNER_L, INNER_L + 0.06, 0, 0.1, INNER_S, 2.48, woodDark);
  slab(g, INNER_L, INNER_L + 0.06, 0, 0.1, 3.9, Z_BACK, woodDark);

  // Wainscot: left wall, and the screen wall only outside the proscenium.
  slab(g, INNER_L, INNER_L + 0.04, 0.1, 0.82, -4.7, 2.42, wood);
  slab(g, -5.35, -2.95, 0.08, 0.86, INNER_S, INNER_S + 0.05, wood);
  slab(g, 2.95, 5.35, 0.08, 0.86, INNER_S, INNER_S + 0.05, wood);
  slab(g, -2.95, 2.95, 0, 0.16, INNER_S, INNER_S + 0.04, woodDark);

  buildNiche(g);
  return g;
}

function buildNiche(g) {
  const wall = toon(C.wall);
  const wood = toon(C.wood);
  const woodDark = toon(C.woodDark);
  const brass = toon(C.brass);
  // Attached vestibule on the left-rear, floor level with the loge (T2).
  slab(g, -7.95, INNER_L, 0, T2, 2.28, 4.1, toon(C.carpetDeep));
  slab(g, -7.95, -7.8, 0, 3.05, 2.28, 4.1, wall);
  slab(g, -7.95, INNER_L - 0.02, 0, 3.05, 2.28, 2.42, wall);
  slab(g, -7.95, INNER_L - 0.02, 0, 3.05, 3.96, 4.1, wall);
  mark(slab(g, -7.9, INNER_L, 2.96, 3.08, 2.32, 4.06, toon(C.ceiling)), { noCast: true });
  // Wood floor inside, runner down the middle.
  slab(g, -7.85, INNER_L + 0.02, T2, T2 + 0.025, 2.46, 3.92, woodDark);
  slab(g, -7.15, -5.7, T2 + 0.02, T2 + 0.04, 2.7, 3.75, toon(C.runner));

  // Casing proud of the house wall, plus an ajar leaf swinging into the niche.
  slab(g, INNER_L, INNER_L + 0.08, T2, 2.58, 2.42, 2.52, wood);
  slab(g, INNER_L, INNER_L + 0.08, T2, 2.58, 3.86, 3.96, wood);
  slab(g, INNER_L, INNER_L + 0.1, 2.46, 2.62, 2.42, 3.96, wood);
  slab(g, INNER_L, INNER_L + 0.12, 2.58, 2.66, 2.36, 4.02, brass);

  const hinge = new THREE.Group();
  hinge.name = 'entry-door';
  hinge.position.set(INNER_L - 0.02, T2, 2.54);
  hinge.rotation.y = -0.78;
  addBox(hinge, 0.045, 1.84, 1.02, wood, -0.04, 0.92, 0.52);
  addBox(hinge, 0.02, 1.84, 0.035, toon(C.brassDark), -0.065, 0.92, 0.04);
  addBox(hinge, 0.02, 1.84, 0.035, toon(C.brassDark), -0.065, 0.92, 1.0);
  addBox(hinge, 0.015, 0.22, 0.05, brass, -0.07, 0.98, 0.86);
  g.add(hinge);

  // Coat rail, three garments, console, framed one-sheet, sconce.
  const rail = addCyl(g, 0.012, 0.012, 1.15, toon(C.brassDark), -7.35, 1.78, 3.15, 8);
  rail.rotation.x = Math.PI / 2;
  coat(g, -7.42, 1.72, 2.85);
  coat(g, -7.42, 1.72, 3.15);
  coat(g, -7.42, 1.72, 3.45);
  slab(g, -7.72, -6.85, T2 + 0.02, T2 + 0.78, 3.55, 3.88, woodDark);
  slab(g, -7.78, -6.8, T2 + 0.78, T2 + 0.84, 3.5, 3.92, wood);
  // Poster on the outer wall.
  slab(g, -7.78, -7.7, 1.35, 2.35, 2.7, 3.35, brass);
  slab(g, -7.76, -7.69, 1.42, 2.28, 2.76, 3.29, toon('#f3ead8'));
  slab(g, -7.75, -7.68, 1.55, 2.18, 2.84, 3.22, toon('#6e2434'));
  slab(g, -7.74, -7.67, 1.95, 2.08, 2.96, 3.12, toon('#f6efe6'));
  sconce(g, -7.78, 2.15, 3.55, 1);
  // House-side sconce just before the opening, so a lamp reads from the aisle.
  sconce(g, INNER_L + 0.02, 2.28, 2.15, 1);
}

function coat(g, x, y, z) {
  const cloth = toon('#2a242c');
  const cloth2 = toon('#3a3040');
  addCyl(g, 0.012, 0.012, 0.08, toon(C.brass), x + 0.04, y + 0.04, z, 6);
  addBox(g, 0.16, 0.08, 0.28, cloth2, x + 0.1, y - 0.06, z);
  addBox(g, 0.14, 0.42, 0.24, cloth, x + 0.1, y - 0.3, z);
}

function sconce(g, x, y, z, dir) {
  const brass = toon(C.brass);
  const lamp = toon(C.lamp, { emissive: '#ffb15e', emissiveIntensity: 1.2, fog: false });
  addBox(g, 0.035, 0.16, 0.1, brass, x + dir * 0.02, y, z);
  addBox(g, 0.14, 0.028, 0.028, brass, x + dir * 0.1, y, z);
  addCyl(g, 0.055, 0.034, 0.07, lamp, x + dir * 0.18, y - 0.03, z, 12);
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
  const lamp = toon(C.lamp, { emissive: '#ffb15e', emissiveIntensity: 1.05, fog: false });

  buildFloors(g, wood, woodDark, carpet, carpetDeep, brass);
  buildScreen(g, wood, woodDark, brass, brassDark, lamp);
  buildPanels(g, brassDark);
  buildCeiling(g, lamp, brass);
  buildAisleLights(g, lamp, brassDark);
  buildProps(g, wood, woodDark, brass, lamp);

  for (const inst of layout.instances || []) {
    if (inst.kind === 'theatre_chair') {
      contactDisc(g, inst.position[0], inst.position[1] + 0.012, inst.position[2], 0.34, 0.26);
    }
    if (inst.kind === 'speaker') {
      const [x, y, z] = inst.position;
      slab(g, x - 0.26, x + 0.26, STAGE, y - 0.03, z - 0.18, z + 0.18, woodDark);
      slab(g, x - 0.3, x + 0.3, y - 0.045, y - 0.01, z - 0.22, z + 0.22, brass);
      contactDisc(g, x, y + 0.01, z, 0.28, 0.16);
    }
  }
  return g;
}

function buildFloors(g, wood, woodDark, carpet, carpetDeep, brass) {
  // Stage lip under the screen.
  slab(g, INNER_L + 0.06, 5.35, 0, STAGE, INNER_S + 0.02, Z_STAGE, toon(C.stage));
  nosing(g, INNER_L + 0.2, 5.2, Z_STAGE, STAGE, wood, brass);

  // House floor between stage and the first riser, with the front-row dais on it.
  slab(g, INNER_L + 0.08, 5.4, 0, 0.025, Z_STAGE, Z_T1, carpetDeep);
  slab(g, -2.15, 2.15, 0.025, DAIS, -2.58, -1.36, carpet);
  nosing(g, -2.15, 2.15, -2.58, DAIS, wood, brass);
  slab(g, -2.15, 2.15, DAIS - 0.045, DAIS, -1.4, -1.34, wood);
  slab(g, -2.18, -2.12, 0.025, DAIS, -2.58, -1.36, woodDark);
  slab(g, 2.12, 2.18, 0.025, DAIS, -2.58, -1.36, woodDark);

  // Middle tier, full width, with a single intermediate aisle tread.
  slab(g, INNER_L + 0.06, 5.42, 0, T1, Z_T1, Z_T2, carpet);
  cheek(g, 5.36, 5.46, 0, T1, Z_T1, Z_T2, woodDark);
  nosing(g, INNER_L + 0.1, 5.35, Z_T1, T1, wood, brass);
  // Aisle treads only — the seating fascia stays a single tall face.
  for (const [x0, x1] of [[INNER_L + 0.08, -AISLE], [AISLE, 5.38]]) {
    slab(g, x0, x1, 0, T1 * 0.5, Z_T1 - 0.36, Z_T1, carpetDeep);
    nosing(g, x0, x1, Z_T1 - 0.36, T1 * 0.5, wood, brass);
  }

  // Loge tier and rear cross-aisle, one level.
  slab(g, INNER_L + 0.06, 5.42, 0, T2, Z_T2, Z_BACK - 0.08, carpet);
  cheek(g, 5.36, 5.46, 0, T2, Z_T2, Z_BACK - 0.08, woodDark);
  slab(g, INNER_L + 0.1, 5.4, 0, T2, Z_BACK - 0.12, Z_BACK - 0.02, woodDark);
  nosing(g, INNER_L + 0.1, 5.35, Z_T2, T2, wood, brass);
  for (const [x0, x1] of [[INNER_L + 0.08, -AISLE], [AISLE, 5.38]]) {
    slab(g, x0, x1, T1, T1 + (T2 - T1) * 0.5, Z_T2 - 0.34, Z_T2, carpetDeep);
    nosing(g, x0, x1, Z_T2 - 0.34, T1 + (T2 - T1) * 0.5, wood, brass);
  }

  // Runners: side aisles and the rear cross-aisle from the niche.
  const runner = toon(C.runner, { polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  slab(g, -4.85, -3.85, 0.03, 0.045, Z_STAGE + 0.15, Z_T1 - 0.4, runner);
  slab(g, 3.85, 4.85, 0.03, 0.045, Z_STAGE + 0.15, Z_T1 - 0.4, runner);
  slab(g, -4.85, -3.85, T1 + 0.015, T1 + 0.03, Z_T1 + 0.08, Z_T2 - 0.4, runner);
  slab(g, 3.85, 4.85, T1 + 0.015, T1 + 0.03, Z_T1 + 0.08, Z_T2 - 0.4, runner);
  slab(g, -4.85, -3.55, T2 + 0.015, T2 + 0.03, Z_T2 + 0.08, 3.85, runner);
  slab(g, 3.55, 4.85, T2 + 0.015, T2 + 0.03, Z_T2 + 0.15, 3.85, runner);
  slab(g, -5.2, 4.6, T2 + 0.02, T2 + 0.035, 3.15, 3.72, runner);
}

function cheek(g, x0, x1, y0, y1, z0, z1, mat) {
  slab(g, x0, x1, y0, y1, z0, z1, mat);
}

function nosing(g, x0, x1, z, top, wood, brass) {
  slab(g, x0, x1, top - 0.04, top + 0.008, z - 0.045, z + 0.012, wood);
  slab(g, x0, x1, top - 0.008, top + 0.016, z - 0.06, z - 0.028, brass);
}

function buildScreen(g, wood, woodDark, brass, brassDark, lamp) {
  const zWall = INNER_S + 0.02;
  // Soffit / pelmet bulkhead over the proscenium.
  mark(slab(g, -3.35, 3.35, 3.18, 3.9, INNER_S, -3.55, toon(C.ceiling)), { noCast: true });
  slab(g, -3.15, 3.15, 3.16, 3.2, -3.62, -3.5, lamp);

  // Frame: brass outer, dark reveal, picture with a horizon so it reads as a film frame.
  slab(g, -2.72, 2.72, 0.5, 2.96, zWall, zWall + 0.06, brass);
  slab(g, -2.52, 2.52, 0.66, 2.82, zWall + 0.04, zWall + 0.09, woodDark);
  slab(g, -2.28, 2.28, 0.78, 2.68, zWall + 0.07, zWall + 0.11, toon('#100c10'));
  const imgZ0 = zWall + 0.1;
  const imgZ1 = zWall + 0.125;
  slab(g, -2.22, 2.22, 0.82, 2.64, imgZ0, imgZ1, toon('#0c0c10'));
  slab(g, -2.16, 2.16, 1.02, 2.48, imgZ0 + 0.01, imgZ1 + 0.02, toon(C.sky, { emissive: C.skyDeep, emissiveIntensity: 0.45 }));
  slab(g, -2.16, 2.16, 1.55, 2.2, imgZ0 + 0.02, imgZ1 + 0.03, toon('#3a4e74', { emissive: '#243454', emissiveIntensity: 0.25 }));
  slab(g, -2.16, 2.16, 1.28, 1.42, imgZ0 + 0.03, imgZ1 + 0.045, toon('#c48858', { emissive: '#a86840', emissiveIntensity: 0.35 }));
  slab(g, -2.16, 2.16, 0.98, 1.36, imgZ0 + 0.04, imgZ1 + 0.06, toon(C.land));
  slab(g, -1.4, 0.2, 1.12, 1.48, imgZ0 + 0.05, imgZ1 + 0.07, toon(C.ridge));
  slab(g, 0.35, 1.55, 1.05, 1.4, imgZ0 + 0.05, imgZ1 + 0.07, toon('#1c1820'));
  // Distant windows in the silhouette.
  for (const [x, y] of [[-1.05, 1.28], [-0.7, 1.22], [0.7, 1.2], [1.05, 1.26], [0.55, 1.32]]) {
    slab(g, x, x + 0.06, y, y + 0.05, imgZ1 + 0.06, imgZ1 + 0.075, lamp);
  }
  const moon = new THREE.Mesh(new THREE.CircleGeometry(0.14, 20), toon('#f4e6c4', { emissive: '#f0d8a8', emissiveIntensity: 0.8, fog: false }));
  moon.position.set(1.35, 2.15, imgZ1 + 0.05);
  g.add(moon);

  // Pilasters flanking the frame.
  for (const x of [-2.9, 2.9]) {
    slab(g, x - 0.1, x + 0.1, STAGE, 3.2, -4.78, -4.58, wood);
    slab(g, x - 0.16, x + 0.16, 3.14, 3.26, -4.82, -4.54, brass);
    slab(g, x - 0.15, x + 0.15, STAGE, STAGE + 0.12, -4.84, -4.54, woodDark);
    slab(g, x - 0.13, x + 0.13, STAGE + 0.12, STAGE + 0.18, -4.82, -4.56, brassDark);
  }

  hungDrapes(g, -3.42, -4.72);
  hungDrapes(g, 3.42, -4.72);
  valance(g, -3.85, 3.85, 3.16, -4.62);
}

function hungDrapes(g, x, z) {
  const y0 = STAGE;
  const y1 = 3.12;
  const folds = 8;
  const span = 0.78;
  for (let i = 0; i < folds; i++) {
    const t = i / (folds - 1);
    const xx = x + (t - 0.5) * span;
    const deep = i % 2 === 0;
    const mat = toon(deep ? C.drapeDeep : (i % 3 === 0 ? C.drapeHi : C.drape));
    const h = (y1 - y0) * (deep ? 1 : 0.965);
    addBox(g, 0.08, h, deep ? 0.1 : 0.05, mat, xx, y0 + h / 2, z + (deep ? 0.045 : 0));
  }
  // Tie-back pulls the column in at mid height.
  const band = addCyl(g, 0.02, 0.02, span * 0.92, toon(C.brass), x, y0 + (y1 - y0) * 0.46, z + 0.1, 10);
  band.rotation.z = Math.PI / 2;
  addBox(g, 0.1, 0.08, 0.08, toon(C.brassDark), x, y0 + (y1 - y0) * 0.46, z + 0.12);
}

function valance(g, x0, x1, y, z) {
  const n = 16;
  const span = x1 - x0;
  for (let i = 0; i < n; i++) {
    const t = (i + 0.5) / n;
    const x = x0 + span * t;
    const scallop = 0.14 + 0.22 * Math.sin(t * Math.PI * 5) ** 2;
    const mat = toon(i % 2 ? C.drape : C.drapeDeep);
    addBox(g, span / n + 0.02, scallop, 0.07, mat, x, y - scallop / 2, z);
  }
  slab(g, x0 - 0.08, x1 + 0.08, y, y + 0.1, z - 0.04, z + 0.08, toon(C.woodDark));
  slab(g, x0 - 0.12, x1 + 0.12, y + 0.08, y + 0.13, z - 0.05, z + 0.1, toon(C.brass));
}

function buildPanels(g, brassDark) {
  // Left wall: irregular fabric panels, not a repeated grid. Bottoms sit above the wainscot.
  const left = [
    [-4.4, 2.05, 0.72, 1.35, 0.055, '#3c3452'],
    [-3.5, 1.85, 0.58, 1.7, 0.09, '#5c3048'],
    [-2.6, 2.15, 0.86, 1.15, 0.05, '#2c3a42'],
    [-1.55, 1.78, 0.6, 1.55, 0.075, '#4a3854'],
    [-0.75, 2.2, 0.7, 1.05, 0.05, '#3a3048'],
    [0.15, 1.9, 0.62, 1.45, 0.08, '#5a3a4c'],
    [0.95, 2.12, 0.78, 1.2, 0.05, '#2a343c'],
    [1.8, 1.82, 0.52, 1.5, 0.07, '#463248'],
  ];
  for (const [z, y, w, h, d, color] of left) {
    wallPanelX(g, INNER_L, y, z, w, h, d, color, 1);
  }
  // Screen-wall panels outside the drapes, above the wainscot.
  const screen = [
    [-4.55, 2.15, 0.8, 1.2, 0.06, '#3c3452'],
    [-4.45, 1.25, 0.55, 0.55, 0.045, '#2c3a42'],
    [4.5, 2.2, 0.85, 1.15, 0.07, '#5c3048'],
    [4.4, 1.28, 0.5, 0.5, 0.05, '#3a3048'],
  ];
  for (const [x, y, w, h, d, color] of screen) {
    wallPanelZ(g, INNER_S, x, y, w, h, d, color);
  }
  // One treated panel inside the niche, on the screen-side return.
  wallPanelZ(g, 2.42, -6.7, 1.85, 0.7, 0.9, 0.05, '#3c3452');
}

function wallPanelX(g, xInner, y, z, w, h, d, color, dir) {
  const cx = xInner + dir * (d / 2 + 0.012);
  slab(g, cx - dir * (d / 2 + 0.01), cx - dir * (d / 2), y - h / 2 - 0.03, y + h / 2 + 0.03, z - w / 2 - 0.03, z + w / 2 + 0.03, toon(C.brassDark));
  addBox(g, d, h, w, toon(color), cx, y, z);
  addBox(g, d + 0.012, 0.018, w * 0.62, toon(C.brass), cx + dir * 0.01, y, z);
}

function wallPanelZ(g, zInner, x, y, w, h, d, color) {
  const cz = zInner + d / 2 + 0.012;
  slab(g, x - w / 2 - 0.03, x + w / 2 + 0.03, y - h / 2 - 0.03, y + h / 2 + 0.03, cz - d / 2 - 0.01, cz - d / 2, toon(C.brassDark));
  addBox(g, w, h, d, toon(color), x, y, cz);
  addBox(g, w * 0.62, 0.018, d + 0.012, toon(C.brass), x, y, cz + 0.01);
}

function buildCeiling(g, lamp, brass) {
  // Coffers under the house ceiling, plus hanging baffles (acoustic clouds).
  const coffer = toon(C.coffer);
  const spots = [
    [-1.7, -2.4], [0.1, -2.15], [1.7, -2.5],
    [-1.6, -0.55], [0.15, -0.3], [1.75, -0.7],
    [-1.45, 1.15], [0.2, 1.45],
  ];
  for (const [x, z] of spots) {
    mark(addBox(g, 1.15, 0.045, 0.85, coffer, x, 3.74, z), { noCast: true });
    addCyl(g, 0.065, 0.065, 0.02, lamp, x, 3.7, z, 14);
  }
  const baffles = [
    [-2.35, 0.15, 1.35, '#3c3452'],
    [-1.15, 0.85, 1.05, '#5c3048'],
    [0.95, 0.35, 1.45, '#2c3a42'],
    [1.7, 0.95, 1.15, '#4a3854'],
  ];
  for (const [x, z, len, color] of baffles) {
    addBox(g, 0.04, 0.28, len, toon(color), x, 3.5, z);
    addBox(g, 0.02, 0.02, len, brass, x, 3.64, z);
  }

  // Small brass ring with four shades over the cross aisle between the rows.
  const y = 3.55;
  const x = 0;
  const z = 0.45;
  addCyl(g, 0.05, 0.07, 0.06, brass, x, y, z, 12);
  addCyl(g, 0.015, 0.015, 0.28, toon(C.brassDark), x, y - 0.16, z, 8);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.012, 8, 28), brass);
  ring.rotation.x = Math.PI / 2;
  ring.position.set(x, y - 0.38, z);
  g.add(ring);
  for (const [dx, dz] of [[0.42, 0], [-0.42, 0], [0, 0.26], [0, -0.26]]) {
    addCyl(g, 0.008, 0.008, 0.14, toon(C.brassDark), x + dx, y - 0.5, z + dz, 6);
    addCyl(g, 0.06, 0.038, 0.07, lamp, x + dx, y - 0.62, z + dz, 12);
  }
}

function buildAisleLights(g, lamp, brassDark) {
  const puck = (x, y, z) => {
    addCyl(g, 0.04, 0.045, 0.018, brassDark, x, y, z, 10);
    addCyl(g, 0.028, 0.028, 0.012, lamp, x, y + 0.012, z, 10);
  };
  for (const x of [-4.35, 4.35]) {
    for (const z of [-3.05, -2.15, -1.25]) puck(x, 0.04, z);
    puck(x, T1 * 0.5 + 0.02, Z_T1 - 0.18);
    for (const z of [-0.35, 0.4]) puck(x, T1 + 0.025, z);
    puck(x, T1 + (T2 - T1) * 0.5 + 0.02, Z_T2 - 0.16);
    for (const z of [1.7, 2.55, 3.4]) puck(x, T2 + 0.025, z);
  }
  // Emissive troughs in the seating fascia, plus the aisle stair risers.
  slab(g, -2.85, 2.85, T1 - 0.09, T1 - 0.055, Z_T1 - 0.03, Z_T1 - 0.005, lamp);
  slab(g, -2.85, 2.85, T2 - 0.09, T2 - 0.055, Z_T2 - 0.03, Z_T2 - 0.005, lamp);
  slab(g, -2.05, 2.05, DAIS - 0.05, DAIS - 0.028, -2.62, -2.59, lamp);
  for (const [x0, x1] of [[-5.2, -AISLE], [AISLE, 5.25]]) {
    slab(g, x0, x1, T1 * 0.5 - 0.05, T1 * 0.5 - 0.028, Z_T1 - 0.39, Z_T1 - 0.36, lamp);
    slab(g, x0, x1, T1 + (T2 - T1) * 0.5 - 0.05, T1 + (T2 - T1) * 0.5 - 0.028, Z_T2 - 0.37, Z_T2 - 0.34, lamp);
  }
}

function buildProps(g, wood, woodDark, brass, lamp) {
  // Rope the niche threshold so the entry reads as its own zone.
  for (const x of [-4.55, -3.7]) {
    addCyl(g, 0.045, 0.05, 0.04, brass, x, T2 + 0.02, 3.05, 10);
    addCyl(g, 0.018, 0.018, 0.86, toon(C.brassDark), x, T2 + 0.46, 3.05, 8);
    addCyl(g, 0.04, 0.04, 0.03, brass, x, T2 + 0.9, 3.05, 10);
  }
  const rope = addCyl(g, 0.012, 0.012, 0.95, toon(C.drapeDeep), -4.12, T2 + 0.78, 3.05, 8);
  rope.rotation.z = Math.PI / 2;

  // Program lectern on the rear cross-aisle, beside the aisle not in the sightline.
  slab(g, -3.35, -3.05, T2, T2 + 0.08, 3.35, 3.7, woodDark);
  slab(g, -3.28, -3.12, T2 + 0.08, T2 + 0.92, 3.48, 3.58, wood);
  slab(g, -3.42, -2.98, T2 + 0.9, T2 + 0.96, 3.32, 3.75, wood);
  slab(g, -3.38, -3.02, T2 + 0.96, T2 + 1.0, 3.36, 3.7, toon('#f3ead8'));

  // Pair of low brass tables in the loge gap — below sightline, between the pairs.
  slab(g, -0.22, 0.22, T2, T2 + 0.42, 2.0, 2.28, toon(C.brassDark));
  addCyl(g, 0.2, 0.2, 0.025, brass, 0, T2 + 0.435, 2.14, 16);
  slab(g, -0.1, 0.1, T2 + 0.448, T2 + 0.462, 2.02, 2.26, toon('#f6efe6'));

  // Vase on the niche console.
  addCyl(g, 0.05, 0.07, 0.16, toon('#6a3040'), -7.15, T2 + 0.92, 3.7, 10);
  addBox(g, 0.1, 0.08, 0.08, toon('#2f6a44'), -7.15, T2 + 1.06, 3.7);
  addBox(g, 0.06, 0.07, 0.06, toon('#3d7a48'), -7.08, T2 + 1.12, 3.66);

}

function contactDisc(g, x, y, z, rx, rz) {
  const m = new THREE.Mesh(
    new THREE.CircleGeometry(1, 18),
    new THREE.MeshBasicMaterial({ color: 0x14080c, transparent: true, opacity: 0.42, depthWrite: false }),
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
    rows.push({ id: seat.name, cushionZ: +cc.z.toFixed(3), backZ: +bc.z.toFixed(3), dz: +dz.toFixed(3) });
    if (!frontTowardScreen) bad.push(`${seat.name} dz=${dz.toFixed(3)} dx=${dx.toFixed(3)}`);
  }
  return { count: rows.length, bad, rows };
}

boot({
  makeShell,
  makeProcedural,
  readyText: 'ready — boutique screening · drag orbit · U unlit · T toon',
  after({ props, setStatus }) {
    const report = auditFacing(props);
    window.__facing = report;
    if (report.bad.length) {
      console.error('seat facing', report);
      setStatus(`FACING ERROR — ${report.bad[0]}`);
    } else {
      console.log('seat facing ok', report);
      setStatus(`ready — ${report.count} seats face the screen · U unlit · T toon`);
    }
  },
});
