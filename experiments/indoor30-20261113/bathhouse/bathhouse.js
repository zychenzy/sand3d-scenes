import * as THREE from 'three';
import { boot, toon, addBox, addCyl } from './scene_lib.js';

const TILE = 0.1;

function tileTexture() {
  const tiles = 4;
  const tilePx = 48;
  const groutPx = 2;
  const size = tiles * tilePx;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  const palette = ['#d7e0da', '#e4ece7', '#c9d4ce', '#dfe8e3'];
  ctx.fillStyle = '#8d9993';
  ctx.fillRect(0, 0, size, size);
  for (let y = 0; y < tiles; y++) {
    for (let x = 0; x < tiles; x++) {
      ctx.fillStyle = palette[(x * 3 + y * 5) % palette.length];
      ctx.fillRect(x * tilePx + groutPx, y * tilePx + groutPx, tilePx - groutPx * 2, tilePx - groutPx * 2);
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.anisotropy = 8;
  tex.needsUpdate = true;
  return tex;
}

function boardTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 32;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#c9a56e';
  ctx.fillRect(0, 0, 32, 128);
  ctx.fillStyle = '#b89258';
  ctx.fillRect(0, 0, 1, 128);
  ctx.fillStyle = '#d4b27c';
  for (let i = 10; i < 128; i += 22) ctx.fillRect(3, i, 26, 1);
  ctx.fillStyle = '#a67c48';
  ctx.fillRect(31, 0, 1, 128);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.anisotropy = 4;
  tex.needsUpdate = true;
  return tex;
}

function grateTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 32;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#3e4a48';
  ctx.fillRect(0, 0, 32, 64);
  ctx.fillStyle = '#9aa8a4';
  for (let i = 3; i < 64; i += 6) ctx.fillRect(2, i, 28, 2);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.magFilter = THREE.NearestFilter;
  tex.needsUpdate = true;
  return tex;
}

function repeatMap(base, worldU, worldV, cell) {
  const map = base.clone();
  map.repeat.set(worldU / cell, worldV / cell);
  map.needsUpdate = true;
  return map;
}

function makeMats() {
  const tiles = tileTexture();
  const boards = boardTexture();
  const grate = grateTexture();
  const mirrorGlass = mirrorGlassTexture();
  return {
    tiles,
    boards,
    grate,
    mirrorGlass,
    plaster: toon('#f0e6d6'),
    plasterWash: toon('#f4ece0'),
    timberFloor: toon('#ffffff'),
    tile: toon('#ffffff'),
    tileBand: toon('#5f8e93'),
    groutEdge: toon('#7f8c86'),
    lockerCarcass: toon('#8f5a34'),
    lockerDoor: toon('#c4894e'),
    lockerPanel: toon('#d7a66a'),
    lockerStile: toon('#7a4a2c'),
    lockerVoid: toon('#6a4630'),
    benchSeat: toon('#b57944'),
    benchLeg: toon('#6e452c'),
    desk: toon('#9a623c'),
    deskTop: toon('#c48a4e'),
    deskPanel: toon('#b07240'),
    shoe: toon('#a56b3c'),
    shoeVoid: toon('#5c3d28'),
    screen: toon('#6e4a32'),
    screenSlat: toon('#c4a06a'),
    noren: toon('#9c4038'),
    norenBand: toon('#2f4f68'),
    norenCrest: toon('#f4efe4'),
    beam: toon('#c9a36a'),
    beamDark: toon('#8d6238'),
    fascia: toon('#a97848'),
    metal: toon('#b7c0c2'),
    metalDark: toon('#5c6768'),
    bucket: toon('#c4884e'),
    hoop: toon('#8e9896'),
    ceramic: toon('#e7eeea'),
    soap: toon('#e6d3a4'),
    mirrorFrame: toon('#6e4a32'),
    water: toon('#2f8b96', { transparent: true, opacity: 0.94 }),
    coping: toon('#d7b07a'),
    frost: toon('#d5e6ea'),
    clock: toon('#f4efe6'),
    clockFace: toon('#1e3a44'),
    ink: toon('#3a2a24'),
    towel: toon('#efe6d4'),
    towelBand: toon('#8f3e3a'),
    basket: toon('#b07a42'),
    wetSlat: toon('#8d6844'),
    drain: toon('#ffffff'),
    globe: toon('#fff1d4', { emissive: '#ffd7a2', emissiveIntensity: 0.4 }),
    globeWood: toon('#a56b3c'),
    step: toon('#8d5a34'),
    price: toon('#f3ead8'),
    priceInk: toon('#6e2e2a'),
  };
}

function group(parent, name) {
  const g = new THREE.Group();
  g.name = name;
  parent.add(g);
  return g;
}

function box(parent, w, h, d, mat, x, y, z, opts = {}) {
  const m = addBox(parent, w, h, d, mat, x, y, z);
  m.name = opts.name || '';
  if (opts.cast === false) m.userData.castShadow = false;
  if (opts.receive === false) m.userData.receiveShadow = false;
  if (opts.rotY) m.rotation.y = opts.rotY;
  return m;
}

function mappedFloor(parent, w, d, mat, map, x, y, z, cellU, cellV) {
  const geo = new THREE.PlaneGeometry(w, d);
  const uv = geo.attributes.uv;
  for (let i = 0; i < uv.count; i++) {
    uv.setXY(i, uv.getX(i) * (w / cellU), uv.getY(i) * (d / cellV));
  }
  geo.rotateX(-Math.PI / 2);
  const material = mat.clone();
  material.map = map.clone();
  material.map.wrapS = material.map.wrapT = THREE.RepeatWrapping;
  material.map.needsUpdate = true;
  const mesh = new THREE.Mesh(geo, material);
  mesh.position.set(x, y + 0.04, z);
  mesh.userData.castShadow = false;
  mesh.name = 'floor';
  parent.add(mesh);
  return mesh;
}

function makeShell(layout) {
  const mats = makeMats();
  const g = group(new THREE.Group(), 'shell');
  const room = layout.room;
  const wash = layout.wash;
  const H = room.h;
  const t = room.wall;
  const timberZ0 = 0.36;
  const timberZ1 = room.z1;
  const timberW = room.x1 - room.x0;

  mappedFloor(
    g, timberW, timberZ1 - timberZ0, mats.timberFloor, mats.boards,
    (room.x0 + room.x1) / 2, layout.levels.timberTop - 0.04, (timberZ0 + timberZ1) / 2,
    0.13, 1.05
  );
  mappedFloor(
    g, wash.x1 - wash.x0, wash.z1 - layout.bath.zBack, mats.tile, mats.tiles,
    0, layout.levels.tileTop - 0.04, (layout.bath.zBack + wash.z1) / 2,
    TILE * 4, TILE * 4
  );

  box(g, wash.x1 - wash.x0, 0.045, 0.025, mats.step, 0, 0.022, 0.36, { cast: false, name: 'riser' });
  box(g, wash.x0 - room.x0, 0.08, 0.22, mats.step, (room.x0 + wash.x0) / 2, -0.04, 0.25, { cast: false, name: 'jog-floor' });
  box(g, room.x1 - wash.x1, 0.08, 0.22, mats.step, (room.x1 + wash.x1) / 2, -0.04, 0.25, { cast: false, name: 'jog-floor' });

  box(g, t, H, room.z1 - wash.z1, mats.plaster, room.x0 - t / 2, H / 2, (wash.z1 + room.z1) / 2, { name: 'wall-left-dry' });
  box(g, t, H, wash.z1 - layout.bath.zBack, mats.plasterWash, wash.x0 - t / 2, H / 2, (layout.bath.zBack + wash.z1) / 2, { name: 'wall-left-wash' });
  box(g, t, H, wash.z1 - layout.bath.zBack, mats.plasterWash, wash.x1 + t / 2, H / 2, (layout.bath.zBack + wash.z1) / 2, { name: 'wall-right-wash' });

  const pierH = H;
  const pierD = 0.14;
  box(g, -1.12 - room.x0, pierH, pierD, mats.plaster, (room.x0 + -1.12) / 2, H / 2, wash.z1 - pierD / 2, { name: 'pier-left' });
  box(g, 2.28 - 1.12, pierH, pierD, mats.plaster, (1.12 + 2.28) / 2, H / 2, wash.z1 - pierD / 2, { name: 'pier-right' });
  box(g, 2.24, 0.16, 0.12, mats.beamDark, 0, layout.opening.head + 0.08, wash.z1 - 0.02, { name: 'lintel' });

  const bath = layout.bath;
  const backZ = bath.zBack;
  box(g, bath.openX0 - wash.x0, H, t, mats.plasterWash, (wash.x0 + bath.openX0) / 2, H / 2, bath.zWall, { name: 'bath-jamb-l' });
  box(g, wash.x1 - bath.openX1, H, t, mats.plasterWash, (bath.openX1 + wash.x1) / 2, H / 2, bath.zWall, { name: 'bath-jamb-r' });
  box(g, bath.openX1 - bath.openX0, H - bath.head, t, mats.plasterWash, 0, (bath.head + H) / 2, bath.zWall, { name: 'bath-header' });
  box(g, bath.openX1 - bath.openX0, bath.sill, t, mats.coping, 0, bath.sill / 2, bath.zWall, { name: 'bath-sill' });
  box(g, wash.x1 - wash.x0, H, t, mats.plasterWash, 0, H / 2, backZ, { name: 'bath-back' });

  const ceilT = 0.05;
  box(g, timberW, ceilT, timberZ1 - timberZ0, mats.plaster, 0, H - ceilT / 2, (timberZ0 + timberZ1) / 2, { cast: false, name: 'ceiling-dry' });
  box(g, wash.x1 - wash.x0, ceilT, wash.z1 - backZ, mats.plasterWash, 0, H - ceilT / 2, (backZ + wash.z1) / 2, { cast: false, name: 'ceiling-wash' });

  for (const z of [1.15, 2.45, 3.75, 5.05]) {
    box(g, timberW - 0.2, 0.1, 0.08, mats.beam, 0, H - 0.16, z, { name: 'beam' });
  }
  for (const z of [-0.7, -2.1, -3.5, -4.8]) {
    box(g, wash.x1 - wash.x0 - 0.16, 0.1, 0.08, mats.beam, 0, H - 0.16, z, { name: 'beam-wash' });
  }

  box(g, 0.07, H, 0.07, mats.fascia, room.x1 - 0.02, H / 2, wash.z1 + 0.02, { name: 'post-jog' });

  g.userData.mats = mats;
  return g;
}

function lockerRun(parent, mats, spec) {
  const { x0, x1, z0, z1, bays, h } = spec;
  const depth = x1 - x0;
  const length = z1 - z0;
  const bay = length / bays;
  box(parent, depth, h, length, mats.lockerCarcass, (x0 + x1) / 2, h / 2, (z0 + z1) / 2, { name: 'locker-carcass' });
  box(parent, 0.03, 0.05, length + 0.02, mats.lockerStile, x1 + 0.012, h - 0.03, (z0 + z1) / 2, { name: 'locker-crown' });
  box(parent, 0.06, 0.08, length, mats.lockerStile, x1 - 0.01, 0.04, (z0 + z1) / 2, { name: 'locker-plinth' });

  for (let i = 0; i < bays; i++) {
    const z = z0 + bay * (i + 0.5);
    box(parent, 0.025, h - 0.08, 0.03, mats.lockerStile, x1 + 0.016, h / 2 + 0.02, z0 + bay * i, { name: 'stile' });
    const doorH = (h - 0.22) / 2;
    const lowerY = 0.1 + doorH / 2;
    const upperY = 0.12 + doorH + 0.02 + doorH / 2;
    door(parent, mats, x1 + 0.02, lowerY, z, bay - 0.04, doorH - 0.02);
    door(parent, mats, x1 + 0.02, upperY, z, bay - 0.04, doorH - 0.02);
    for (let s = 0; s < 3; s++) {
      box(parent, 0.008, 0.012, 0.09, mats.lockerVoid, x1 + 0.032, upperY + doorH / 2 - 0.06, z - 0.05 + s * 0.05, { name: 'vent' });
    }
    box(parent, 0.01, 0.045, 0.07, mats.price, x1 + 0.034, upperY + 0.02, z, { name: 'number' });
    box(parent, 0.008, 0.02, 0.03, mats.ink, x1 + 0.04, upperY + 0.02, z, { name: 'digit' });
  }
  box(parent, 0.025, h - 0.08, 0.03, mats.lockerStile, x1 + 0.016, h / 2 + 0.02, z1, { name: 'stile-end' });
}

function door(parent, mats, x, y, z, w, h) {
  box(parent, 0.02, h, w, mats.lockerDoor, x, y, z, { name: 'door' });
  box(parent, 0.012, h - 0.08, w - 0.06, mats.lockerPanel, x + 0.012, y, z, { name: 'panel' });
  box(parent, 0.012, 0.018, 0.07, mats.metal, x + 0.02, y, z + w / 2 - 0.05, { name: 'pull' });
}

function bench(parent, mats, x, z, len, depth, seatH) {
  const top = 0.034;
  const leg = 0.042;
  const xs = [x - depth / 2 + 0.07, x + depth / 2 - 0.07];
  const zs = [z - len / 2 + 0.1, z + len / 2 - 0.1];
  for (const lx of xs) {
    for (const lz of zs) {
      box(parent, leg, seatH - top, leg, mats.benchLeg, lx, (seatH - top) / 2, lz, { name: 'bench-leg' });
    }
  }
  const sy = 0.14;
  box(parent, depth - 0.16, 0.028, 0.03, mats.benchLeg, x, sy, zs[0], { name: 'stretcher' });
  box(parent, depth - 0.16, 0.028, 0.03, mats.benchLeg, x, sy, zs[1], { name: 'stretcher' });
  box(parent, 0.03, 0.028, len - 0.28, mats.benchLeg, xs[0], sy, z, { name: 'stretcher' });
  const planks = 3;
  const gap = 0.008;
  const pw = (depth - gap * (planks - 1)) / planks;
  for (let i = 0; i < planks; i++) {
    const px = x - depth / 2 + pw / 2 + i * (pw + gap);
    box(parent, pw, top, len, mats.benchSeat, px, seatH - top / 2, z, { name: 'bench-plank' });
  }
}

function shoeBank(parent, mats, spec) {
  const { x0, x1, z0, z1, h, cols, rows } = spec;
  const depth = x1 - x0;
  const length = z1 - z0;
  box(parent, depth, h, length, mats.shoe, (x0 + x1) / 2, h / 2, (z0 + z1) / 2, { name: 'shoes' });
  const colW = length / cols;
  const rowH = (h - 0.08) / rows;
  for (let c = 0; c < cols; c++) {
    for (let r = 0; r < rows; r++) {
      const z = z0 + colW * (c + 0.5);
      const y = 0.06 + rowH * (r + 0.5);
      box(parent, depth * 0.72, rowH - 0.06, colW - 0.05, mats.shoeVoid, x1 - depth * 0.28, y, z, { name: 'cubby' });
      box(parent, 0.02, 0.035, colW - 0.06, mats.deskTop, x1 + 0.008, y - rowH / 2 + 0.04, z, { name: 'heel-lip' });
    }
    box(parent, 0.02, h, 0.02, mats.lockerStile, x1 + 0.008, h / 2, z0 + colW * c, { name: 'shoe-stile' });
  }
  box(parent, 0.02, h, 0.02, mats.lockerStile, x1 + 0.008, h / 2, z1, { name: 'shoe-stile' });
}

function bandai(parent, mats, layout) {
  const d = layout.desk;
  const p = layout.platform;
  const w = d.x1 - d.x0;
  const dep = d.z1 - d.z0;
  box(parent, p.x1 - p.x0, p.h, p.z1 - p.z0, mats.step, (p.x0 + p.x1) / 2, p.h / 2, (p.z0 + p.z1) / 2, { name: 'platform' });
  box(parent, 0.42, 0.16, 0.28, mats.deskTop, (p.x0 + p.x1) / 2, 0.08, p.z1 + 0.12, { name: 'step' });
  box(parent, w, d.top - 0.04, dep, mats.desk, (d.x0 + d.x1) / 2, (d.top - 0.04) / 2, (d.z0 + d.z1) / 2, { name: 'desk' });
  box(parent, w + 0.06, 0.04, dep + 0.06, mats.deskTop, (d.x0 + d.x1) / 2, d.top - 0.02, (d.z0 + d.z1) / 2, { name: 'desk-top' });
  box(parent, 0.02, 0.42, dep - 0.16, mats.deskPanel, d.x1 + 0.012, 0.62, (d.z0 + d.z1) / 2, { name: 'desk-panel' });
  box(parent, 0.018, 0.22, 0.28, mats.price, d.x1 + 0.03, 0.78, d.z0 + 0.22, { name: 'price' });
  box(parent, 0.01, 0.04, 0.16, mats.priceInk, d.x1 + 0.04, 0.84, d.z0 + 0.22, { name: 'price-rule' });
  box(parent, 0.01, 0.04, 0.1, mats.priceInk, d.x1 + 0.04, 0.74, d.z0 + 0.22, { name: 'price-rule' });
  box(parent, 0.36, 0.08, 0.34, mats.benchSeat, -3.12, p.h + 0.04, 4.74, { name: 'attendant-seat' });
}

function clock(parent, mats, x, y, z) {
  addCyl(parent, 0.16, 0.16, 0.03, mats.clock, x, y, z, 20).rotation.z = Math.PI / 2;
  const face = addCyl(parent, 0.12, 0.12, 0.012, mats.clockFace, x + 0.02, y, z, 20);
  face.rotation.z = Math.PI / 2;
  box(parent, 0.012, 0.08, 0.012, mats.price, x + 0.03, y + 0.02, z, { name: 'hand' });
}

function globe(parent, mats, x, y, z) {
  addCyl(parent, 0.012, 0.012, 0.28, mats.globeWood, x, y + 0.16, z, 6);
  addCyl(parent, 0.1, 0.08, 0.04, mats.globeWood, x, y + 0.04, z, 12);
  const bulb = addCyl(parent, 0.055, 0.055, 0.08, mats.globe, x, y - 0.02, z, 12);
  bulb.name = 'globe';
}

function towelRail(parent, mats, x, y, z) {
  box(parent, 0.03, 0.28, 0.03, mats.benchLeg, x, y - 0.1, z - 0.28, { name: 'rail-post' });
  box(parent, 0.03, 0.28, 0.03, mats.benchLeg, x, y - 0.1, z + 0.28, { name: 'rail-post' });
  addCyl(parent, 0.012, 0.012, 0.62, mats.metal, x, y, z, 8).rotation.x = Math.PI / 2;
  for (let i = 0; i < 4; i++) {
    const tz = z - 0.22 + i * 0.15;
    box(parent, 0.06, 0.22, 0.1, mats.towel, x + 0.02, y - 0.12, tz, { name: 'towel' });
    box(parent, 0.012, 0.04, 0.1, mats.towelBand, x + 0.05, y - 0.08, tz, { name: 'towel-band' });
  }
}

function basket(parent, mats, x, y, z) {
  addCyl(parent, 0.16, 0.13, 0.2, mats.bucket, x, y + 0.1, z, 10);
  addCyl(parent, 0.155, 0.155, 0.012, mats.hoop, x, y + 0.16, z, 10);
}

function screen(parent, mats, spec) {
  const g = new THREE.Group();
  g.position.set(spec.x, 0, spec.z);
  g.rotation.y = spec.rot;
  g.name = 'screen';
  parent.add(g);
  const { w, h, d } = spec;
  // Width along local X so a small yaw still faces the aisle. The contract measures that axis.
  box(g, 0.046, h, d, mats.screen, -w / 2, h / 2, 0, { name: 'screen-post' });
  box(g, 0.046, h, d, mats.screen, w / 2, h / 2, 0, { name: 'screen-post' });
  box(g, w, 0.04, d, mats.screen, 0, h - 0.024, 0, { name: 'screen-rail' });
  box(g, w - 0.07, 0.032, d * 0.75, mats.screen, 0, 0.54, 0, { name: 'screen-rail' });
  box(g, w - 0.09, 0.5, d * 0.62, mats.screenSlat, 0, 0.27, 0, { name: 'screen-panel' });
  const inner = w - 0.12;
  const count = 9;
  const reedH = h - 0.66;
  for (let i = 0; i < count; i++) {
    const x = -inner / 2 + (inner / count) * (i + 0.5);
    box(g, 0.02, reedH, d * 0.4, mats.screenSlat, x, 0.58 + reedH / 2, 0, { cast: false, name: 'reed' });
  }
}

function noren(parent, mats, spec) {
  const xs = spec.centers;
  const span = Math.max(...xs) - Math.min(...xs) + spec.panelW + 0.12;
  const mid = (Math.max(...xs) + Math.min(...xs)) / 2;
  const rod = addCyl(parent, 0.012, 0.012, span, mats.metalDark, mid, spec.rodY, spec.z, 8);
  rod.rotation.z = Math.PI / 2;
  for (const x of xs) {
    const h = spec.rodY - spec.hemY;
    const pw = spec.panelW * 0.94;
    box(parent, pw, h, 0.012, mats.noren, x, spec.hemY + h / 2, spec.z, { name: 'noren' });
    box(parent, pw, 0.055, 0.014, mats.norenBand, x, spec.hemY + 0.03, spec.z + 0.008, { name: 'noren-hem' });
    const crest = addCyl(parent, 0.055, 0.055, 0.008, mats.norenCrest, x, spec.rodY - 0.24, spec.z + 0.012, 14);
    crest.rotation.x = Math.PI / 2;
    crest.name = 'noren-crest';
  }
}

function faucet(parent, mats, x, y, z, dir) {
  const plate = addCyl(parent, 0.042, 0.042, 0.016, mats.metal, x + dir * 0.01, y, z, 14);
  plate.rotation.z = Math.PI / 2;
  plate.name = 'plate';
  const arm = addCyl(parent, 0.011, 0.011, 0.13, mats.metal, x + dir * 0.08, y + 0.01, z, 8);
  arm.rotation.z = Math.PI / 2;
  arm.name = 'spout';
  const elbow = addCyl(parent, 0.014, 0.014, 0.016, mats.metal, x + dir * 0.14, y + 0.01, z, 8);
  elbow.name = 'elbow';
  const drop = addCyl(parent, 0.011, 0.009, 0.05, mats.metal, x + dir * 0.14, y - 0.02, z, 8);
  drop.name = 'drop';
  const tip = addCyl(parent, 0.014, 0.014, 0.01, mats.metalDark, x + dir * 0.14, y - 0.048, z, 8);
  tip.name = 'aerator';
  for (const s of [-1, 1]) {
    const stem = addCyl(parent, 0.008, 0.008, 0.028, mats.metalDark, x + dir * 0.028, y, z + s * 0.05, 6);
    stem.rotation.x = Math.PI / 2;
    stem.name = 'handle';
    const knob = addCyl(parent, 0.016, 0.016, 0.01, mats.metal, x + dir * 0.028, y, z + s * 0.066, 8);
    knob.rotation.x = Math.PI / 2;
    knob.name = 'handle';
  }
}

function stool(parent, mats, x, z, h, dia) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  g.name = 'stool';
  parent.add(g);
  addCyl(g, dia / 2, dia / 2, 0.03, mats.benchSeat, 0, h - 0.015, 0, 16);
  const r = dia / 2 - 0.04;
  const corners = [[r, r], [r, -r], [-r, r], [-r, -r]];
  for (const [cx, cz] of corners) {
    addCyl(g, 0.014, 0.012, h - 0.03, mats.benchLeg, cx, (h - 0.03) / 2, cz, 6);
  }
  box(g, dia * 0.7, 0.016, 0.016, mats.benchLeg, 0, 0.12, r * 0.7, { name: 'foot' });
  box(g, dia * 0.7, 0.016, 0.016, mats.benchLeg, 0, 0.12, -r * 0.7, { name: 'foot' });
}

function bucket(parent, mats, x, z, h, radius) {
  addCyl(parent, radius, radius * 0.86, h, mats.bucket, x, h / 2 + 0.006, z, 12);
  addCyl(parent, radius + 0.006, radius + 0.006, 0.012, mats.hoop, x, h * 0.72, z, 12);
  addCyl(parent, radius * 0.9, radius * 0.9, 0.01, mats.hoop, x, h * 0.28, z, 12);
  addCyl(parent, radius * 0.72, radius * 0.72, 0.008, mats.ceramic, x, h * 0.55, z, 10);
}

function washHall(parent, mats, layout) {
  const e = layout.ergo;
  const wash = layout.wash;
  const band = 0.1;
  box(parent, wash.x1 - wash.x0 - 0.08, 0.012, band, mats.tileBand, 0, 0.006, wash.z1 - 0.08, { cast: false, name: 'border' });
  box(parent, wash.x1 - wash.x0 - 0.08, 0.012, band, mats.tileBand, 0, 0.006, layout.bath.zWall + 0.16, { cast: false, name: 'border' });
  box(parent, band, 0.012, wash.z1 - layout.bath.zWall - 0.3, mats.tileBand, wash.x0 + 0.08, 0.006, (wash.z1 + layout.bath.zWall) / 2, { cast: false, name: 'border' });
  box(parent, band, 0.012, wash.z1 - layout.bath.zWall - 0.3, mats.tileBand, wash.x1 - 0.08, 0.006, (wash.z1 + layout.bath.zWall) / 2, { cast: false, name: 'border' });

  const dadoH = 1.52;
  const dadoMatL = mats.tile.clone();
  dadoMatL.map = repeatMap(mats.tiles, dadoH, wash.z1 - wash.z0, TILE * 4);
  const leftDado = box(parent, 0.018, dadoH, wash.z1 - wash.z0 - 0.05, dadoMatL, wash.x0 + 0.02, dadoH / 2, (wash.z0 + wash.z1) / 2, { name: 'dado' });
  leftDado.material = dadoMatL;
  const dadoMatR = mats.tile.clone();
  dadoMatR.map = repeatMap(mats.tiles, dadoH, wash.z1 - wash.z0, TILE * 4);
  const rightDado = box(parent, 0.018, dadoH, wash.z1 - wash.z0 - 0.05, dadoMatR, wash.x1 - 0.02, dadoH / 2, (wash.z0 + wash.z1) / 2, { name: 'dado' });
  rightDado.material = dadoMatR;
  box(parent, 0.03, 0.025, wash.z1 - wash.z0 - 0.04, mats.tileBand, wash.x0 + 0.03, dadoH + 0.01, (wash.z0 + wash.z1) / 2, { name: 'dado-cap' });
  box(parent, 0.03, 0.025, wash.z1 - wash.z0 - 0.04, mats.tileBand, wash.x1 - 0.03, dadoH + 0.01, (wash.z0 + wash.z1) / 2, { name: 'dado-cap' });

  const mirrorW = wash.stationsZ[0] - wash.stationsZ[wash.stationsZ.length - 1] + 0.7;
  const mz = (wash.stationsZ[0] + wash.stationsZ[wash.stationsZ.length - 1]) / 2;
  mirrorBand(parent, mats, wash.x0 + 0.035, mz, mirrorW, 1);
  mirrorBand(parent, mats, wash.x1 - 0.035, mz, mirrorW, -1);

  for (const z of wash.stationsZ) {
    const lx = wash.x0 + e.stoolToWall;
    const rx = wash.x1 - e.stoolToWall;
    stool(parent, mats, lx, z, e.stoolHeight, e.stoolDiameter);
    stool(parent, mats, rx, z, e.stoolHeight, e.stoolDiameter);
    bucket(parent, mats, lx - e.bucketTowardWall, z + e.bucketForward, e.bucketHeight, e.bucketRadius);
    bucket(parent, mats, rx + e.bucketTowardWall, z + e.bucketForward, e.bucketHeight, e.bucketRadius);
    faucet(parent, mats, wash.x0 + 0.02, e.faucetHeight, z, 1);
    faucet(parent, mats, wash.x1 - 0.02, e.faucetHeight, z, -1);
    box(parent, 0.07, 0.014, 0.1, mats.mirrorFrame, wash.x0 + 0.055, 0.68, z + 0.16, { name: 'soap-ledge' });
    box(parent, 0.07, 0.014, 0.1, mats.mirrorFrame, wash.x1 - 0.055, 0.68, z + 0.16, { name: 'soap-ledge' });
    box(parent, 0.05, 0.02, 0.07, mats.soap, wash.x0 + 0.06, 0.697, z + 0.16, { name: 'soap' });
    box(parent, 0.05, 0.02, 0.07, mats.soap, wash.x1 - 0.06, 0.697, z + 0.16, { name: 'soap' });
  }

  const slatZ0 = -4.85;
  const slatZ1 = -0.35;
  for (let z = slatZ0; z <= slatZ1; z += 0.07) {
    box(parent, 0.72, 0.012, 0.028, mats.wetSlat, 0, 0.012, z, { cast: false, name: 'duckboard' });
  }
  const drainMat = mats.drain.clone();
  drainMat.map = repeatMap(mats.grate, 0.12, slatZ1 - slatZ0, 0.2);
  const drain = box(parent, 0.1, 0.008, slatZ1 - slatZ0, drainMat, 0, 0.004, (slatZ0 + slatZ1) / 2, { cast: false, name: 'drain' });
  drain.material = drainMat;

  for (const spec of layout.screens) screen(parent, mats, spec);
  noren(parent, mats, layout.noren);

  const bath = layout.bath;
  box(parent, bath.openX1 - bath.openX0 + 0.5, 0.08, 0.08, mats.coping, 0, bath.waterY + 0.04, bath.zWall - 0.12, { name: 'tub-rim' });
  box(parent, bath.openX1 - bath.openX0 + 0.2, 0.05, bath.zWall - bath.zBack - 0.28, mats.water, 0, bath.waterY, (bath.zWall + bath.zBack) / 2, { cast: false, receive: true, name: 'water' });
  const pocketW = bath.openX1 - bath.openX0 + 0.15;
  const pocketH = 1.15;
  const pocketMat = mats.tile.clone();
  pocketMat.map = repeatMap(mats.tiles, pocketW, pocketH, TILE * 4);
  const pocket = box(parent, pocketW, pocketH, 0.02, pocketMat, 0, 0.95, layout.bath.zBack + 0.08, { name: 'bath-tile' });
  pocket.material = pocketMat;
  box(parent, 0.5, 0.28, 0.02, mats.frost, -0.85, 2.55, bath.zWall + 0.02, { name: 'clerestory' });
  box(parent, 0.5, 0.28, 0.02, mats.frost, 0, 2.55, bath.zWall + 0.02, { name: 'clerestory' });
  box(parent, 0.5, 0.28, 0.02, mats.frost, 0.85, 2.55, bath.zWall + 0.02, { name: 'clerestory' });
}

function mirrorGlassTexture() {
  const w = 512;
  const h = 160;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  const sky = ctx.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, '#e7f4f5');
  sky.addColorStop(0.22, '#d5e7e9');
  sky.addColorStop(0.28, '#e4d3b4');
  sky.addColorStop(0.34, '#d7e6e8');
  sky.addColorStop(0.72, '#c9dddf');
  sky.addColorStop(1, '#e3d4bc');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#b7cdd0';
  for (let i = 0; i < 7; i++) ctx.fillRect(48 + i * 68, 58, 10, 36);
  ctx.save();
  ctx.translate(w * 0.5, h * 0.42);
  ctx.rotate(-0.55);
  const glint = ctx.createLinearGradient(-220, 0, 220, 0);
  glint.addColorStop(0, 'rgba(247,252,252,0)');
  glint.addColorStop(0.38, 'rgba(247,252,252,0.35)');
  glint.addColorStop(0.5, '#f7fcfc');
  glint.addColorStop(0.62, 'rgba(247,252,252,0.35)');
  glint.addColorStop(1, 'rgba(247,252,252,0)');
  ctx.fillStyle = glint;
  ctx.fillRect(-260, -14, 520, 28);
  ctx.restore();
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.needsUpdate = true;
  return tex;
}

function mirrorMaterial(map) {
  return toon('#6a8082', {
    emissive: '#ffffff',
    emissiveIntensity: 1,
    map,
    emissiveMap: map,
  });
}

function mirrorBand(parent, mats, x, z, length, dir) {
  const eH = 0.46;
  const y = 1.22;
  const span = Math.abs(length);
  box(parent, 0.03, eH + 0.06, span + 0.06, mats.mirrorFrame, x + dir * 0.01, y, z, { name: 'mirror-frame' });
  const geo = new THREE.PlaneGeometry(span, eH);
  const glass = new THREE.Mesh(geo, mirrorMaterial(mats.mirrorGlass));
  glass.position.set(x + dir * 0.04, y, z);
  glass.rotation.y = dir > 0 ? Math.PI / 2 : -Math.PI / 2;
  glass.name = 'mirror';
  glass.userData.castShadow = false;
  glass.userData.receiveShadow = false;
  parent.add(glass);
}

function makeProcedural(layout) {
  const root = new THREE.Group();
  root.name = 'procedural';
  const mats = makeMats();
  const e = layout.ergo;
  lockerRun(root, mats, layout.lockers);
  const face = layout.lockers.x1;
  const benchX = face + e.kneeGap + e.benchDepth / 2;
  bench(root, mats, benchX, layout.bench.z, layout.bench.length, e.benchDepth, e.benchSeat);
  shoeBank(root, mats, layout.shoes);
  bandai(root, mats, layout);
  clock(root, mats, layout.room.x0 + 0.05, 2.45, 2.3);
  globe(root, mats, -0.45, 2.72, 4.7);
  globe(root, mats, -1.05, 2.72, 2.15);
  globe(root, mats, 0, 2.75, -1.7);
  globe(root, mats, 0, 2.75, -3.7);
  towelRail(root, mats, -2.15, 1.58, 0.85);
  basket(root, mats, -1.95, 0.045, 0.5);
  basket(root, mats, -1.58, 0.045, 0.5);
  washHall(root, mats, layout);

  const entryBoards = group(root, 'entry-boards');
  for (let z = 4.22; z < 5.12; z += 0.14) {
    box(entryBoards, 0.016, 1.15, 0.11, mats.beam, layout.room.x0 + 0.02, 1.7, z, { name: 'wainscot' });
  }
  return root;
}

function liftCrushed(root) {
  root.traverse((obj) => {
    if (!obj.isMesh || !obj.material) return;
    const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
    for (const m of mats) {
      if (!m.color) continue;
      const max = Math.max(m.color.r, m.color.g, m.color.b);
      if (max < 0.03) m.color.setRGB(0.075, 0.048, 0.038);
    }
  });
}

function decoratePrototype(_kind, prepared) {
  liftCrushed(prepared);
}

function audit(scene) {
  const issues = [];
  let meshes = 0;
  scene.traverse((obj) => {
    if (!obj.isMesh) return;
    meshes += 1;
    const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
    obj.geometry.computeBoundingBox();
    const size = new THREE.Vector3();
    obj.geometry.boundingBox.getSize(size);
    const world = obj.getWorldScale(new THREE.Vector3());
    const maxDim = Math.max(size.x * world.x, size.y * world.y, size.z * world.z);
    let uvSpan = 1;
    const uv = obj.geometry.attributes && obj.geometry.attributes.uv;
    if (uv) {
      for (let i = 0; i < uv.count; i++) uvSpan = Math.max(uvSpan, uv.getX(i), uv.getY(i));
    }
    for (const m of mats) {
      if (!m) continue;
      if (m.map && m.map.wrapS === THREE.RepeatWrapping && maxDim > 1.2) {
        const reps = Math.max(m.map.repeat.x, m.map.repeat.y) * uvSpan;
        const metres = maxDim / Math.max(reps, 1e-3);
        if (metres > 0.5) issues.push(`giant-map:${obj.name || 'mesh'}:${metres.toFixed(2)}m`);
      }
      if (m.color && Math.max(m.color.r, m.color.g, m.color.b) < 0.015) {
        issues.push(`crushed:${obj.name || 'mesh'}`);
      }
    }
  });
  return { meshes, issues };
}

boot({
  makeShell,
  makeProcedural,
  decoratePrototype,
  readyText: 'ready — changing hall · U unlit · T toon',
  onReady({ scene }) {
    const report = audit(scene);
    window.__audit = report;
    if (report.issues.length) window.__errors.push(...report.issues);
  },
});
