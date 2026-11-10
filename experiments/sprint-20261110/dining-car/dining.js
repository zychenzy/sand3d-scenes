import * as THREE from 'three';
import { boot, toon, basicMat, addBox, addCyl, contactDisc } from './scene_lib.js';
import { PLAN } from './plan.js';

const H = PLAN.room.height;
const D = PLAN.room.depth;
const HALF_D = D / 2;
const WALL = PLAN.room.wallInnerX;

function mats() {
  return {
    floor: toon('#8d6b4c'),
    carpet: toon('#6e383e'),
    runner: toon('#45262c'),
    runnerEdge: toon('#b08a4e'),
    galleyFloor: toon('#3c444c'),
    wall: toon('#f3ece2'),
    body: toon('#7a2e34'),
    bodyDark: toon('#4c1e24'),
    cream: toon('#e7d3b4'),
    gold: toon('#c6a15a'),
    roof: toon('#2c3138'),
    under: toon('#241f1e'),
    wheel: toon('#16181c'),
    rail: toon('#4a4e52'),
    ballast: toon('#b7b1a6'),
    sleeper: toon('#6a5344'),
    wood: toon('#7b4f34'),
    woodEdge: toon('#4e3428'),
    ped: toon('#4a3024'),
    cleat: toon('#3e291f'),
    metal: toon('#8d8680'),
    brass: toon('#b08a45'),
    shade: toon('#e7c48a', { side: THREE.DoubleSide }),
    bulb: toon('#fff6d8', { emissive: '#ffc56a', emissiveIntensity: 1.6 }),
    heat: toon('#ffb089', { emissive: '#ff7a45', emissiveIntensity: 0.75 }),
    curtain: toon('#8e3d45'),
    pelmet: toon('#efe6d6'),
    glass: basicMat('#c5dced', { transparent: true, opacity: 0.42, side: THREE.DoubleSide, depthWrite: false }),
    linen: toon('#f4efe4'),
    plate: toon('#f7f4ee'),
    napkin: toon('#fbf8f2'),
    menu: toon('#f6f1e6'),
    menuBand: toon('#6e2a32'),
    paper: toon('#e7e2d8'),
    steel: toon('#9aa3ab'),
    steelDark: toon('#6d767e'),
    frame: toon('#efe6d8'),
    luggageDark: toon('#1c140f'),
    ground: toon('#d2cbc0'),
    fascia: toon('#f7f1e8'),
    cut: toon('#2a2422'),
  };
}

function signTexture() {
  const c = document.createElement('canvas');
  c.width = 2048;
  c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = '#e7d3b4';
  g.fillRect(0, 0, c.width, c.height);
  g.strokeStyle = '#7a2e34';
  g.lineWidth = 10;
  g.strokeRect(18, 18, c.width - 36, c.height - 36);
  g.fillStyle = '#6e2a32';
  g.font = '700 132px "Liberation Serif", "Noto Serif", serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText('DINING  ·  DINING  ·  DINING', c.width / 2, c.height / 2 + 6);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

function addBrace(g, mat, x0, y0, x1, y1, z) {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const len = Math.hypot(dx, dy);
  const m = new THREE.Mesh(new THREE.BoxGeometry(len, 0.012, 0.045), mat);
  m.position.set((x0 + x1) / 2, (y0 + y1) / 2, z);
  m.rotation.z = Math.atan2(dy, dx);
  m.castShadow = true;
  m.receiveShadow = true;
  g.add(m);
}

function addPunchedWall(g, mat, x, thick, z0, z1, sill, head, windows, y0, y1) {
  const zc = (z0 + z1) / 2;
  const span = z1 - z0;
  if (sill > y0) addBox(g, thick, sill - y0, span, mat, x, (y0 + sill) / 2, zc);
  if (y1 > head) addBox(g, thick, y1 - head, span, mat, x, (head + y1) / 2, zc);
  const sorted = [...windows].sort((a, b) => a.z - b.z);
  let cursor = z0;
  for (const win of sorted) {
    const left = win.z - win.w / 2;
    if (left > cursor + 0.02) {
      const w = left - cursor;
      addBox(g, thick, head - sill, w, mat, x, (sill + head) / 2, cursor + w / 2);
    }
    cursor = Math.max(cursor, win.z + win.w / 2);
  }
  if (z1 > cursor + 0.02) {
    const w = z1 - cursor;
    addBox(g, thick, head - sill, w, mat, x, (sill + head) / 2, cursor + w / 2);
  }
}

function addWindowFrame(g, M, win, wallX) {
  const h = win.head - win.sill;
  const cy = (win.sill + win.head) / 2;
  const t = 0.05;
  const glassExtra = { userData: { shade: 'basic', noShadow: true } };
  addBox(g, 0.02, h - t * 2, win.w - t * 2, M.glass, wallX, cy, win.z, glassExtra);
  addBox(g, 0.16, t, win.w + 0.02, M.frame, wallX, win.head - t / 2, win.z);
  addBox(g, 0.16, t, win.w + 0.02, M.frame, wallX, win.sill + t / 2, win.z);
  addBox(g, 0.16, h, t, M.frame, wallX, cy, win.z - win.w / 2 + t / 2);
  addBox(g, 0.16, h, t, M.frame, wallX, cy, win.z + win.w / 2 - t / 2);
  addBox(g, 0.12, h - t * 2, 0.035, M.frame, wallX, cy, win.z);
  addBox(g, 0.12, 0.028, win.w - t * 2, M.frame, wallX, win.sill + h * 0.72, win.z);
  if (win.blind > 0) {
    const bh = h * win.blind;
    addBox(g, 0.01, bh, win.w - 0.12, M.pelmet, wallX + 0.04, win.head - bh / 2 - 0.04, win.z, {
      userData: { noShadow: true },
    });
  }
}

function addCurtains(g, M, win) {
  if (!win.curtain || win.role === 'galley') return;
  const panel = 0.06 + win.curtain * (win.w / 2 - 0.06);
  const h = win.head - win.sill - 0.08;
  const y = (win.sill + win.head) / 2 - 0.01;
  const x = WALL + 0.1;
  addBox(g, 0.018, h, panel, M.curtain, x, y, win.z - win.w / 2 + panel / 2 + 0.03);
  addBox(g, 0.018, h, panel, M.curtain, x, y, win.z + win.w / 2 - panel / 2 - 0.03);
  addBox(g, 0.03, 0.03, win.w + 0.06, M.brass, x, win.head - 0.03, win.z);
  addBox(g, 0.1, 0.055, win.w + 0.1, M.pelmet, x + 0.02, win.head + 0.02, win.z);
}

function addTop(g, M, table) {
  const len = table.z1 - table.z0;
  const cz = (table.z0 + table.z1) / 2;
  addBox(g, table.width + 0.014, 0.014, len + 0.012, M.woodEdge, table.x, table.surfaceY - 0.042, cz);
  addBox(g, table.width, 0.036, len, M.wood, table.x, table.surfaceY - 0.018, cz);
}

function addLongPedestal(g, M, table) {
  const len = (table.z1 - table.z0) * 0.86;
  const cz = (table.z0 + table.z1) / 2;
  const top = table.surfaceY - 0.07;
  addBox(g, 0.12, top - 0.05, len, M.ped, table.x, (top + 0.05) / 2, cz);
  addBox(g, 0.3, 0.05, len, M.ped, table.x, 0.04, cz);
  addBox(g, 0.22, 0.035, len * 0.45, M.ped, table.x, table.surfaceY - 0.065, cz);
}

function addWallMount(g, M, table) {
  const xTable = table.x - table.width / 2;
  for (const z of table.brackets) {
    addBox(g, 0.08, 0.78, 0.06, M.cleat, WALL + 0.05, 0.42, z);
    addBrace(g, M.brass, WALL + 0.06, table.surfaceY - 0.34, xTable, table.surfaceY - 0.05, z);
    const span = xTable - (WALL + 0.08);
    addBox(g, Math.max(span, 0.2), 0.035, 0.07, M.cleat, WALL + 0.08 + span / 2, table.surfaceY - 0.03, z);
  }
}

function dressTable(g, M, table) {
  const cz = (table.z0 + table.z1) / 2;
  if (table.setting === 'set') {
    const len = (table.z1 - table.z0) * 0.72;
    addBox(g, table.width * 0.78, 0.006, len, M.linen, table.x, table.surfaceY + 0.004, cz);
    for (const along of [-1.15, -0.15, 0.85]) {
      addCyl(g, 0.1, 0.09, 0.012, M.plate, table.x, table.surfaceY + 0.012, cz + along, 20);
      addBox(g, 0.07, 0.006, 0.07, M.napkin, table.x, table.surfaceY + 0.02, cz + along);
    }
  }
  if (table.setting === 'mugs') {
    const card = new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.11, 0.16), M.menu);
    card.position.set(table.x - 0.08, table.surfaceY + 0.07, cz + 0.35);
    card.rotation.x = -0.4;
    card.castShadow = true;
    g.add(card);
    addBox(g, table.width * 0.7, 0.004, 0.22, M.paper, table.x, table.surfaceY + 0.004, cz - 0.4);
  }
}

function addCase(g, M, spec) {
  const grp = new THREE.Group();
  grp.position.set(spec.x, 0, spec.z);
  grp.rotation.y = spec.rot || 0;
  const body = toon(spec.color);
  addBox(grp, spec.w, spec.h, spec.d, body, 0, spec.bottom + spec.h / 2, 0);
  addBox(grp, spec.w * 0.94, 0.012, spec.d * 0.96, M.luggageDark, 0, spec.bottom + spec.h * 0.62, 0);
  addBox(grp, spec.w * 0.32, 0.018, 0.02, M.luggageDark, 0, spec.bottom + spec.h + 0.012, 0);
  addBox(grp, 0.02, spec.h * 0.9, spec.d * 1.02, M.luggageDark, -spec.w * 0.22, spec.bottom + spec.h / 2, 0);
  addBox(grp, 0.02, spec.h * 0.9, spec.d * 1.02, M.luggageDark, spec.w * 0.22, spec.bottom + spec.h / 2, 0);
  g.add(grp);
}

function addRack(g, M, rack, toward) {
  const len = rack.z1 - rack.z0;
  const zc = (rack.z0 + rack.z1) / 2;
  const dir = toward < 0 ? -1 : 1;
  for (let i = 0; i < 4; i++) {
    const x = rack.xInner + dir * (0.05 + i * (rack.depth / 4));
    addBox(g, 0.04, 0.022, len, M.frame, x, rack.y, zc);
  }
  const lipX = rack.xInner + dir * (rack.depth - 0.02);
  addBox(g, 0.02, 0.055, len, M.brass, lipX, rack.y + 0.03, zc);
  addBox(g, 0.02, 0.1, len, M.frame, rack.xInner, rack.y + 0.02, zc);
  for (const z of rack.brackets) {
    addBrace(
      g,
      M.metal,
      rack.xInner,
      rack.y - 0.22,
      rack.xInner + dir * rack.depth * 0.85,
      rack.y,
      z,
    );
  }
}

function addSconce(g, M, lamp) {
  addBox(g, 0.03, 0.16, 0.1, M.brass, lamp.x - 0.12, lamp.y, lamp.z);
  addBox(g, 0.16, 0.025, 0.025, M.brass, lamp.x - 0.04, lamp.y, lamp.z);
  const shade = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.038, 0.09, 12, 1, true), M.shade);
  shade.position.set(lamp.x, lamp.y - 0.02, lamp.z);
  shade.castShadow = false;
  g.add(shade);
  addCyl(g, 0.022, 0.022, 0.04, M.bulb, lamp.x, lamp.y - 0.055, lamp.z, 10);
}

function addWheel(g, mat, x, y, z) {
  addCyl(g, 0.3, 0.3, 0.07, mat, x, y, z, 18, { rotZ: Math.PI / 2 });
  addCyl(g, 0.34, 0.34, 0.028, mat, x, y, z, 18, { rotZ: Math.PI / 2 });
}

function addBogie(g, M, z) {
  addBox(g, 1.25, 0.1, 1.45, M.under, 0, -0.38, z);
  for (const dz of [-0.46, 0.46]) {
    addBox(g, 1.55, 0.05, 0.05, M.under, 0, -0.52, z + dz);
    for (const x of [-0.72, 0.72]) addWheel(g, M.wheel, x, -0.52, z + dz);
  }
}

function makeShell() {
  const g = new THREE.Group();
  g.name = 'shell';
  const M = mats();
  const wallX = WALL - 0.05;
  const extX = WALL - 0.14;

  addBox(g, PLAN.room.width, 0.08, D, M.floor, 0, -0.04, 0);
  addBox(g, 10, 0.06, D + 8, M.ground, 0.3, -0.98, 0);
  addBox(g, 2.15, 0.08, D + 3, M.ballast, 0, -0.9, 0);
  for (let z = -HALF_D - 0.4; z <= HALF_D + 0.4; z += 0.8) {
    addBox(g, 1.9, 0.06, 0.16, M.sleeper, 0, -0.86, z);
  }
  addBox(g, 0.045, 0.08, D + 2.4, M.rail, -0.72, -0.8, 0);
  addBox(g, 0.045, 0.08, D + 2.4, M.rail, 0.72, -0.8, 0);

  const saloonZ0 = PLAN.zones.saloon.z0;
  const saloonZ1 = HALF_D;
  addPunchedWall(g, M.wall, wallX, 0.1, saloonZ0, saloonZ1, 1.08, 1.9, PLAN.saloonWindows, 0, H);
  addPunchedWall(
    g,
    M.body,
    extX,
    0.07,
    saloonZ0,
    saloonZ1,
    1.08,
    1.9,
    PLAN.saloonWindows,
    -0.05,
    H + 0.08,
  );
  const galley = PLAN.serviceWindows;
  addPunchedWall(g, M.wall, wallX, 0.1, -HALF_D, saloonZ0, 1.52, 1.92, galley, 0, H);
  addPunchedWall(g, M.body, extX, 0.07, -HALF_D, saloonZ0, 1.52, 1.92, galley, -0.05, H + 0.08);

  for (const win of [...PLAN.saloonWindows, ...PLAN.serviceWindows]) addWindowFrame(g, M, win, wallX - 0.02);

  addBox(g, 0.04, 0.035, D, M.gold, extX - 0.05, 1.02, 0);
  addBox(g, 0.04, 0.03, D, M.gold, extX - 0.05, 2.08, 0);
  addBox(g, 0.12, 0.05, D - 0.4, M.wood, WALL + 0.08, 1.05, 0.15);

  const sign = new THREE.Mesh(
    new THREE.PlaneGeometry(9.4, 0.2),
    basicMat('#ffffff', { map: signTexture(), side: THREE.DoubleSide }),
  );
  sign.position.set(WALL + 0.2, 2.08, 0.05);
  sign.rotation.y = Math.PI / 2;
  sign.scale.x = -1;
  sign.userData.shade = 'basic';
  sign.userData.noShadow = true;
  sign.castShadow = false;
  g.add(sign);

  addBox(g, 0.1, H, 0.1, M.wall, 0, H / 2, -HALF_D);
  addBox(g, PLAN.room.width + 0.2, H + 0.12, 0.08, M.bodyDark, 0, H / 2, -HALF_D - 0.08);
  addBox(g, 0.1, H, 0.1, M.wall, 0, H / 2, HALF_D);
  addBox(g, PLAN.room.width + 0.2, H + 0.12, 0.08, M.body, 0, H / 2, HALF_D + 0.08);
  addGangwayDoor(g, M, -HALF_D + 0.02, 1);
  addGangwayDoor(g, M, HALF_D - 0.02, -1);

  addBox(g, 1.7, 0.07, D, M.fascia, -0.15, H - 0.04, 0);
  for (const z of [-4.78, ...PLAN.piers, 5.05]) {
    addBox(g, 2.3, 0.08, 0.07, M.woodEdge, -0.55, H - 0.1, z);
  }
  addBox(g, 0.55, 0.1, D + 0.3, M.roof, -1.45, H + 0.08, 0);
  addBox(g, 0.38, 0.09, D + 0.2, M.roof, -1.22, H + 0.16, 0);
  addBox(g, 0.24, 0.08, D + 0.1, M.roof, -1.02, H + 0.23, 0);

  addBox(g, 0.08, 0.4, D, M.wall, 1.68, 0.2, 0);
  addBox(g, 0.08, 0.32, D, M.fascia, 1.68, H - 0.16, 0);
  addBox(g, 0.09, 0.025, D, M.cut, 1.68, 0.4, 0);
  addBox(g, 0.09, 0.025, D, M.cut, 1.68, H - 0.32, 0);

  addBox(g, PLAN.room.width + 0.15, 0.14, D, M.under, 0, -0.12, 0);
  addBogie(g, M, -4.15);
  addBogie(g, M, 3.85);
  addBox(g, 0.7, 0.16, 0.28, M.under, 0, -0.22, -HALF_D - 0.16);
  addBox(g, 0.7, 0.16, 0.28, M.under, 0, -0.22, HALF_D + 0.16);
  for (const x of [-0.28, 0.28]) {
    addCyl(g, 0.09, 0.09, 0.1, M.wheel, x, -0.32, -HALF_D - 0.28, 12, { rotX: Math.PI / 2 });
    addCyl(g, 0.09, 0.09, 0.1, M.wheel, x, -0.32, HALF_D + 0.28, 12, { rotX: Math.PI / 2 });
  }

  for (let i = 0; i < 3; i++) {
    addBox(g, 0.26, 0.04, 0.72, M.metal, 1.84 + i * 0.22, -0.08 - i * 0.18, 6.15);
  }
  addCyl(g, 0.02, 0.02, 1.15, M.brass, 1.62, 0.7, 5.7, 8);

  return g;
}

function addGangwayDoor(g, M, z, face) {
  const x = 0.12;
  addBox(g, 0.78, 2.05, 0.06, M.woodEdge, x, 1.02, z);
  addBox(g, 0.58, 0.95, 0.04, M.wood, x, 0.62, z + face * 0.02);
  const glassExtra = { userData: { shade: 'basic', noShadow: true } };
  addBox(g, 0.36, 0.48, 0.02, M.glass, x, 1.48, z + face * 0.04, glassExtra);
  addBox(g, 0.04, 0.16, 0.04, M.brass, x + 0.28, 1.0, z + face * 0.05);
}

function makeProcedural() {
  const g = new THREE.Group();
  g.name = 'procedural';
  const M = mats();

  const carpetZ0 = PLAN.zones.saloon.z0 + 0.08;
  const carpetZ1 = PLAN.zones.vestibule.bulkhead - 0.05;
  addBox(g, 3.28, 0.02, carpetZ1 - carpetZ0, M.carpet, -0.02, 0.012, (carpetZ0 + carpetZ1) / 2);
  addBox(g, 0.42, 0.012, carpetZ1 - carpetZ0 - 0.2, M.runner, 0.02, 0.026, (carpetZ0 + carpetZ1) / 2);
  addBox(g, 0.025, 0.012, carpetZ1 - carpetZ0 - 0.2, M.runnerEdge, -0.2, 0.028, (carpetZ0 + carpetZ1) / 2);
  addBox(g, 0.025, 0.012, carpetZ1 - carpetZ0 - 0.2, M.runnerEdge, 0.24, 0.028, (carpetZ0 + carpetZ1) / 2);
  addBox(g, 3.3, 0.018, PLAN.zones.galley.z1 - PLAN.zones.galley.z0, M.galleyFloor, -0.02, 0.012, (PLAN.zones.galley.z0 + PLAN.zones.galley.z1) / 2);

  for (const win of PLAN.saloonWindows) addCurtains(g, M, win);

  for (const table of PLAN.tables) {
    addTop(g, M, table);
    addLongPedestal(g, M, table);
    if (table.brackets) addWallMount(g, M, table);
    dressTable(g, M, table);
    const cz = (table.z0 + table.z1) / 2;
    contactDisc(g, table.x, 0.04, cz, table.width * 0.55, (table.z1 - table.z0) * 0.48);
  }
  addSideboard(g, M);

  for (const seat of PLAN.seats) {
    contactDisc(g, seat.x, 0.04, seat.z, SEAT_FOOT.x, SEAT_FOOT.z);
  }

  addRack(g, M, PLAN.racks.window, 1);
  addRack(g, M, PLAN.racks.aisle, -1);

  for (const spec of PLAN.luggage) {
    if (spec.kind === 'hat') {
      addCyl(g, spec.r, spec.r * 0.92, spec.h, toon(spec.color), spec.x, spec.bottom + spec.h / 2, spec.z, 16);
      addCyl(g, spec.r * 0.35, spec.r * 0.35, 0.02, M.luggageDark, spec.x, spec.bottom + spec.h + 0.01, spec.z, 10);
    } else addCase(g, M, spec);
  }

  for (const lamp of PLAN.lamps) {
    if (lamp.kind === 'sconce') addSconce(g, M, lamp);
    if (lamp.kind === 'pendant') {
      addCyl(g, 0.008, 0.008, 0.62, M.brass, lamp.x, 2.12, lamp.z, 6);
      addCyl(g, 0.055, 0.028, 0.07, M.bulb, lamp.x, 1.38, lamp.z, 12);
    }
    if (lamp.kind === 'galley') {
      addBox(g, 0.7, 0.04, 0.28, M.steelDark, lamp.x, lamp.y + 0.12, lamp.z);
      addCyl(g, 0.08, 0.08, 0.03, M.heat, lamp.x - 0.16, lamp.y + 0.08, lamp.z, 12);
      addCyl(g, 0.08, 0.08, 0.03, M.heat, lamp.x + 0.16, lamp.y + 0.08, lamp.z, 12);
    }
  }

  addGalley(g, M);
  addVestibule(g, M);
  addBulkhead(g, M, PLAN.zones.galley.bulkhead, true);
  addBulkhead(g, M, PLAN.zones.vestibule.bulkhead, false);
  return g;
}

const SEAT_FOOT = { x: 0.62, z: 0.34 };

function addGalley(g, M) {
  const z0 = -6.95;
  const z1 = -5.15;
  const zc = (z0 + z1) / 2;
  const depth = z1 - z0;
  addBox(g, 0.92, 0.08, depth, M.steel, -1.2, 0.88, zc);
  addBox(g, 0.9, 0.72, depth, M.steelDark, -1.22, 0.46, zc);
  addBox(g, 0.06, 0.55, depth, M.steel, -1.68, 1.18, zc);
  addBox(g, 0.32, 0.035, depth - 0.15, M.wood, -1.5, 1.44, zc);
  addBox(g, 0.28, 0.03, 0.7, M.steel, -1.15, 1.02, -4.95);
  for (let i = 0; i < 5; i++) {
    addCyl(g, 0.09, 0.09, 0.012, M.plate, -1.55, 1.47 + i * 0.012, -6.15, 14);
  }
}

function addVestibule(g, M) {
  addBox(g, 0.36, 0.04, 0.9, M.wood, -1.42, 0.85, 6.35);
  addBox(g, 0.36, 0.04, 0.9, M.wood, -1.42, 1.25, 6.35);
  addBox(g, 0.04, 1.25, 0.9, M.woodEdge, -1.62, 0.7, 6.35);
  addCyl(g, 0.025, 0.025, 1.3, M.brass, 0.35, 1.15, 5.55, 8);
}

function addSideboard(g, M) {
  for (const zc of [-2.55, 2.55]) {
    addBox(g, 0.36, 0.36, 2.2, M.woodEdge, 1.4, 0.18, zc);
    addBox(g, 0.4, 0.03, 2.28, M.wood, 1.4, 0.375, zc);
    addBox(g, 0.015, 0.05, 2.28, M.brass, 1.2, 0.42, zc);
  }
  for (let i = 0; i < 4; i++) {
    addCyl(g, 0.08, 0.08, 0.01, M.plate, 1.36, 0.4 + i * 0.01, -3.2, 14);
  }
}

function addBulkhead(g, M, z, withPass) {
  addBox(g, 0.55, 0.95, 0.07, M.wall, -1.4, 0.48, z);
  addBox(g, 0.9, 0.42, 0.07, M.wall, -1.2, H - 0.21, z);
  if (withPass) {
    addBox(g, 0.7, 0.05, 0.08, M.wood, -1.2, 1.0, z + 0.06);
    addBox(g, 0.04, 0.42, 0.05, M.steel, -1.55, 1.22, z);
    addBox(g, 0.04, 0.42, 0.05, M.steel, -0.85, 1.22, z);
  }
  addBox(g, 0.07, 2.05, 0.08, M.woodEdge, -0.35, 1.02, z);
  addBox(g, 0.07, 2.05, 0.08, M.woodEdge, 0.45, 1.02, z);
  addBox(g, 0.87, 0.1, 0.08, M.woodEdge, 0.05, 2.05, z);
  addBox(g, 0.7, H, 0.07, M.wall, 1.25, H / 2, z);
}

boot({
  makeShell: () => makeShell(),
  makeProcedural: () => makeProcedural(),
  instances: () => PLAN.instances,
  extraLights(scene) {
    for (const lamp of PLAN.lamps) {
      const pl = new THREE.PointLight(lamp.color, lamp.intensity, lamp.distance, 2);
      pl.position.set(lamp.x, lamp.y, lamp.z);
      scene.add(pl);
    }
  },
  readyText: 'ready — dining car · galley, saloon, vestibule · T toon · U unlit',
});
