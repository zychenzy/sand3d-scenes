import * as THREE from 'three';
import { boot, toon, addBox, addCyl } from './scene_lib.js';

const PAL = {
  rubberA: '#3a3c40',
  rubberB: '#2e3034',
  oxblood: '#6e2e2c',
  oxbloodDeep: '#542422',
  turfA: '#2a3a32',
  turfB: '#24342c',
  turfLine: '#d8c45a',
  concrete: '#c6c0b6',
  concreteDeep: '#b4aea4',
  wainscot: '#2c2e32',
  steel: '#5a5e64',
  steelLite: '#7a7e84',
  steelDeep: '#3a3e44',
  chrome: '#9aa0a6',
  iron: '#2a2c30',
  plate: '#2e2e32',
  bumperR: '#8a2a28',
  bumperB: '#2a3a6a',
  bumperY: '#c4a03a',
  kb: '#2c2c30',
  db: '#3a3a40',
  wood: '#6a5340',
  woodLite: '#8a6a4a',
  glass: '#d4e0e8',
  mirror: '#c8d4dc',
  caution: '#d4b03a',
  cautionBlk: '#1a1a1c',
  ceil: '#d6d2cc',
  beam: '#4a4e54',
  duct: '#8a9096',
  matEdge: '#1e2428',
  towel: '#e8e0d4',
  towelB: '#c8d0c4',
  cone: '#d45a28',
  med: '#8a3a32',
  medB: '#3a5a48',
  clock: '#1a1c20',
  clockFace: '#f0ece4',
  emissive: '#fff2d2',
};

function addSphere(g, r, mat, x, y, z, seg = 12) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(r, seg, 8), mat);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  g.add(m);
  return m;
}

function addPole(g, ax, ay, az, bx, by, bz, r, mat, seg = 8) {
  const dir = new THREE.Vector3(bx - ax, by - ay, bz - az);
  const len = dir.length() || 0.001;
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, seg), mat);
  m.position.set((ax + bx) / 2, (ay + by) / 2, (az + bz) / 2);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
  m.castShadow = true;
  m.receiveShadow = true;
  g.add(m);
  return m;
}

let shadowMat;
function contactMat() {
  if (!shadowMat) {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    const grd = ctx.createRadialGradient(64, 64, 10, 64, 64, 62);
    grd.addColorStop(0, 'rgba(12,12,14,0.48)');
    grd.addColorStop(0.55, 'rgba(12,12,14,0.18)');
    grd.addColorStop(1, 'rgba(12,12,14,0)');
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, 128, 128);
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    shadowMat = new THREE.MeshBasicMaterial({
      map: tex,
      transparent: true,
      depthWrite: false,
      toneMapped: false,
    });
    shadowMat.polygonOffset = true;
    shadowMat.polygonOffsetFactor = -4;
    shadowMat.polygonOffsetUnits = -4;
  }
  return shadowMat;
}

function addPad(g, w, d, x, y, z) {
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, d), contactMat());
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set(x, y, z);
  mesh.userData.shade = 'decal';
  g.add(mesh);
  return mesh;
}

function addFloor(g, layout) {
  const { width: W, depth: D } = layout.meta.room;
  const floor = addBox(g, W, 0.08, D, toon(PAL.rubberA), 0, -0.04, 0);
  floor.userData.receiveOnly = true;
  floor.name = 'floor';
  const tw = 1.0;
  let row = 0;
  for (let z = -D / 2 + 0.08; z < D / 2 - 0.05; z += tw, row++) {
    let col = 0;
    for (let x = -W / 2 + 0.08; x < W / 2 - 0.05; x += tw, col++) {
      const bagZone = z < -1.15 && x > -3.75 && x < 3.55;
      const alt = (row + col) % 2 === 0;
      const color = bagZone ? (alt ? PAL.oxblood : PAL.oxbloodDeep) : alt ? PAL.rubberA : PAL.rubberB;
      const w = Math.min(tw - 0.018, W / 2 - 0.06 - x);
      const d = Math.min(tw - 0.018, D / 2 - 0.06 - z);
      if (w < 0.25 || d < 0.25) continue;
      const tile = addBox(g, w, 0.012, d, toon(color), x + w / 2, 0.006, z + d / 2);
      tile.userData.receiveOnly = true;
    }
  }
}

function addTurf(g, layout) {
  const t = layout.architecture.turf;
  const w = t.x1 - t.x0;
  const d = t.z1 - t.z0;
  const cx = (t.x0 + t.x1) / 2;
  const cz = (t.z0 + t.z1) / 2;
  const body = addBox(g, w, 0.02, d, toon(PAL.turfA), cx, 0.016, cz);
  body.userData.receiveOnly = true;
  body.name = 'turf';
  for (let i = 0; i < 9; i++) {
    const z = t.z0 + 0.12 + i * ((d - 0.24) / 8);
    const stripe = addBox(g, w - 0.08, 0.004, 0.028, toon(i === 4 ? PAL.turfLine : PAL.turfB), cx, 0.028, z);
    stripe.userData.noShadow = true;
  }
  addBox(g, 0.04, 0.01, d, toon(PAL.turfLine), t.x0 + 0.04, 0.028, cz).userData.noShadow = true;
  addBox(g, 0.04, 0.01, d, toon(PAL.turfLine), t.x1 - 0.04, 0.028, cz).userData.noShadow = true;
}

function addAisle(g, layout) {
  const a = layout.architecture.aisle;
  const w = a.x1 - a.x0;
  const stripe = addBox(g, w, 0.01, a.w, toon(PAL.caution), (a.x0 + a.x1) / 2, 0.02, a.z);
  stripe.userData.noShadow = true;
  const dashes = Math.round(w / 0.42);
  for (let i = 0; i < dashes; i += 2) {
    const x = a.x0 + ((i + 0.5) * w) / dashes;
    addBox(g, w / dashes * 0.72, 0.012, a.w * 0.55, toon(PAL.cautionBlk), x, 0.026, a.z).userData.noShadow = true;
  }
}

function addWalls(g, layout) {
  const { width: W, depth: D, height: H } = layout.meta.room;
  const plaster = toon(PAL.concrete);
  const deep = toon(PAL.concreteDeep);
  const rubber = toon(PAL.wainscot);
  const steel = toon(PAL.steel);

  const back = addBox(g, W, H, 0.14, plaster, 0, H / 2, -D / 2);
  back.userData.receiveOnly = true;
  const left = addBox(g, 0.14, H, D, plaster, -W / 2, H / 2, 0);
  left.userData.receiveOnly = true;

  addBox(g, W - 0.28, 1.18, 0.05, rubber, 0, 0.59, -D / 2 + 0.1);
  addBox(g, 0.05, 1.18, D - 0.28, rubber, -W / 2 + 0.1, 0.59, 0);
  addBox(g, W - 0.2, 0.08, 0.08, steel, 0, 0.04, -D / 2 + 0.12);
  addBox(g, 0.08, 0.08, D - 0.2, steel, -W / 2 + 0.12, 0.04, 0);

  addBox(g, W - 0.4, 0.08, 0.06, toon(PAL.beam), 0, 2.78, -D / 2 + 0.12);
  addBox(g, 0.06, 0.08, D - 0.4, toon(PAL.beam), -W / 2 + 0.12, 2.78, 0);

  const brand = toon(layout.shell.accentColor);
  addBox(g, 2.4, 0.18, 0.04, brand, -4.05, 2.42, -D / 2 + 0.12);
  addBox(g, 0.18, 1.05, 0.04, brand, -W / 2 + 0.12, 1.85, 3.15);

  const m = layout.architecture.mirror;
  const mw = m.x1 - m.x0;
  const mh = m.y1 - m.y0;
  addBox(g, mw + 0.1, mh + 0.1, 0.04, toon(PAL.steelDeep), (m.x0 + m.x1) / 2, (m.y0 + m.y1) / 2, -D / 2 + 0.1);
  const glass = addBox(
    g,
    mw,
    mh,
    0.03,
    toon(PAL.mirror, { transparent: true, opacity: 0.55, side: THREE.DoubleSide }),
    (m.x0 + m.x1) / 2,
    (m.y0 + m.y1) / 2,
    -D / 2 + 0.13
  );
  glass.userData.receiveOnly = true;
  glass.name = 'mirror';
  for (const x of [-1.35, 1.15, 3.55]) {
    addBox(g, 0.04, mh, 0.04, toon(PAL.steelLite), x, (m.y0 + m.y1) / 2, -D / 2 + 0.145);
  }

  const winY = 3.08;
  const winH = 0.38;
  const glassWin = toon(PAL.glass, {
    transparent: true,
    opacity: 0.42,
    side: THREE.DoubleSide,
    emissive: '#e8f0f6',
    emissiveIntensity: 0.28,
  });
  const win = addBox(g, W * 0.78, winH, 0.04, glassWin, 0.35, winY, -D / 2 + 0.1);
  win.userData.noShadow = true;
  for (const x of [-3.2, -1.15, 0.9, 2.95]) {
    addBox(g, 0.05, winH, 0.05, steel, x, winY, -D / 2 + 0.12);
  }
  addBox(g, W * 0.8, 0.05, 0.08, steel, 0.35, winY - winH / 2, -D / 2 + 0.16);
}

function addCeiling(g, layout) {
  const c = layout.architecture.ceiling;
  const { height: H } = layout.meta.room;
  const mat = toon(layout.shell.ceilingColor || PAL.ceil);
  const cw = c.x1 - c.x0;
  const cd = c.z1 - c.z0;
  const ceil = addBox(g, cw, 0.08, cd, mat, (c.x0 + c.x1) / 2, c.y, (c.z0 + c.z1) / 2);
  ceil.userData.receiveOnly = true;

  const beam = toon(PAL.beam);
  for (const x of [-4.15, -1.35, 1.45, 3.85]) {
    addBox(g, 0.12, 0.18, cd - 0.2, beam, x, c.y - 0.14, (c.z0 + c.z1) / 2);
  }
  addBox(g, cw - 0.3, 0.14, 0.12, beam, (c.x0 + c.x1) / 2, c.y - 0.16, -2.55);
  addBox(g, cw - 0.3, 0.14, 0.12, beam, (c.x0 + c.x1) / 2, c.y - 0.16, 0.35);

  const duct = toon(PAL.duct);
  addBox(g, 0.42, 0.22, cd * 0.72, duct, -2.65, H - 0.28, -0.85);
  addCyl(g, 0.08, 0.08, 0.16, duct, -2.65, H - 0.42, -2.15, 10);
  addCyl(g, 0.08, 0.08, 0.16, duct, -2.65, H - 0.42, 0.15, 10);

  const bay = toon(PAL.steelDeep);
  const glow = toon(PAL.emissive, { emissive: '#fff1c8', emissiveIntensity: 1.15 });
  const bays = [
    [-2.55, -2.35],
    [-0.1, -2.45],
    [2.35, -2.3],
    [0.05, 0.85],
    [3.85, 0.9],
  ];
  for (const [x, z] of bays) {
    addBox(g, 0.85, 0.05, 0.22, bay, x, H - 0.22, z);
    const lamp = addBox(g, 0.72, 0.03, 0.14, glow, x, H - 0.26, z);
    lamp.userData.noShadow = true;
  }
}

function addWod(g, layout) {
  const { depth: D } = layout.meta.room;
  const x = -layout.meta.room.width / 2 + 0.14;
  addBox(g, 0.05, 1.15, 1.55, toon('#1c2420'), x, 1.85, -3.15);
  addBox(g, 0.06, 0.06, 1.62, toon(PAL.wood), x + 0.01, 2.45, -3.15);
  addBox(g, 0.06, 0.06, 1.62, toon(PAL.wood), x + 0.01, 1.25, -3.15);
  for (let i = 0; i < 7; i++) {
    addBox(g, 0.02, 0.05, 1.22, toon('#d8d0c4'), x + 0.04, 2.28 - i * 0.13, -3.15);
  }
  const clockX = 4.35;
  addCyl(g, 0.22, 0.22, 0.05, toon(PAL.clock), clockX, 2.42, -D / 2 + 0.16, 24).rotation.x = Math.PI / 2;
  addCyl(g, 0.18, 0.18, 0.03, toon(PAL.clockFace), clockX, 2.42, -D / 2 + 0.19, 24).rotation.x = Math.PI / 2;
  addBox(g, 0.02, 0.12, 0.02, toon(PAL.clock), clockX, 2.47, -D / 2 + 0.21);
  addBox(g, 0.09, 0.02, 0.02, toon(PAL.clock), clockX + 0.03, 2.42, -D / 2 + 0.21);
}

function makeShell(layout) {
  const g = new THREE.Group();
  g.name = 'shell';
  addFloor(g, layout);
  addTurf(g, layout);
  addAisle(g, layout);
  addWalls(g, layout);
  addCeiling(g, layout);
  addWod(g, layout);
  return g;
}

function addBagPads(g, layout) {
  for (const inst of layout.instances) {
    if (inst.kind !== 'punching_bag') continue;
    const [x, , z] = inst.position;
    const pad = addBox(g, 1.55, 0.028, 1.55, toon('#242428'), x, 0.02, z + 0.12);
    pad.userData.receiveOnly = true;
    addBox(g, 1.48, 0.006, 1.48, toon('#1a1a1e'), x, 0.036, z + 0.12).userData.noShadow = true;
    addPad(g, 1.85, 1.85, x, 0.008, z + 0.12);
  }
}

function addRack(g, layout) {
  const r = layout.architecture.rack;
  const steel = toon(PAL.steel);
  const deep = toon(PAL.steelDeep);
  const chrome = toon(PAL.chrome);
  const hx = r.spanX / 2;
  const hz = r.spanZ / 2;
  const posts = [
    [r.x - hx, r.z - hz],
    [r.x + hx, r.z - hz],
    [r.x - hx, r.z + hz],
    [r.x + hx, r.z + hz],
  ];
  for (const [x, z] of posts) {
    addBox(g, r.upright, r.uprightH, r.upright, steel, x, r.uprightH / 2, z);
    addBox(g, 0.16, 0.04, 0.16, deep, x, 0.02, z);
  }
  addBox(g, r.spanX + 0.08, 0.06, 0.06, steel, r.x, r.pullupY, r.z - hz);
  addBox(g, r.spanX + 0.08, 0.06, 0.06, steel, r.x, r.pullupY, r.z + hz);
  addCyl(g, 0.016, 0.016, r.spanX + 0.04, chrome, r.x, r.pullupY + 0.05, r.z - hz, 10).rotation.z = Math.PI / 2;
  for (const z of [r.z - hz, r.z + hz]) {
    addBox(g, r.spanX - 0.12, 0.04, 0.05, deep, r.x, r.safetyY, z);
    addBox(g, 0.04, 0.08, 0.14, deep, r.x - hx + 0.08, r.barY, z);
    addBox(g, 0.04, 0.08, 0.14, deep, r.x + hx - 0.08, r.barY, z);
  }
  const barZ = r.z;
  addCyl(g, 0.014, 0.014, 2.05, chrome, r.x + 0.12, r.barY + 0.03, barZ, 12).rotation.z = Math.PI / 2;
  addCyl(g, 0.028, 0.028, 0.12, toon(PAL.iron), r.x + 0.12 - 0.92, r.barY + 0.03, barZ, 10).rotation.z = Math.PI / 2;
  addCyl(g, 0.028, 0.028, 0.12, toon(PAL.iron), r.x + 0.12 + 0.92, r.barY + 0.03, barZ, 10).rotation.z = Math.PI / 2;
  addPlate(g, r.x + 0.12 - 1.05, r.barY + 0.03, barZ, 0.45, PAL.bumperR, true);
  addPlate(g, r.x + 0.12 - 1.12, r.barY + 0.03, barZ, 0.45, PAL.bumperB, true);
  addPlate(g, r.x + 0.12 + 1.05, r.barY + 0.03, barZ, 0.45, PAL.bumperR, true);
  addPlate(g, r.x + 0.12 + 1.12, r.barY + 0.03, barZ, 0.45, PAL.bumperB, true);
  addPad(g, r.spanX + 0.7, r.spanZ + 0.55, r.x + 0.15, 0.008, r.z);
  const plat = addBox(g, r.spanX + 0.55, 0.04, r.spanZ + 0.35, toon('#2a2c30'), r.x + 0.08, 0.022, r.z);
  plat.userData.receiveOnly = true;
  plat.name = 'rack-platform';
}

function addPlate(g, x, y, z, d, color, onBar = false) {
  const p = addCyl(g, d / 2, d / 2, 0.055, toon(color), x, y, z, 20);
  if (onBar) p.rotation.z = Math.PI / 2;
  addCyl(g, 0.026, 0.026, onBar ? 0.06 : 0.06, toon(PAL.chrome), x, y, z, 10).rotation.z = onBar ? Math.PI / 2 : 0;
  return p;
}

function addPlateTree(g, layout) {
  const t = layout.architecture.plateTree;
  const steel = toon(PAL.steel);
  addCyl(g, 0.04, 0.05, 1.15, steel, t.x, 0.58, t.z, 10);
  addCyl(g, 0.18, 0.18, 0.05, toon(PAL.iron), t.x, 0.03, t.z, 12);
  const arms = [
    { y: 0.32, z: 0.18, c: PAL.bumperR, d: 0.45 },
    { y: 0.32, z: -0.18, c: PAL.bumperB, d: 0.45 },
    { y: 0.62, z: 0.18, c: PAL.bumperY, d: 0.4 },
    { y: 0.62, z: -0.18, c: PAL.bumperR, d: 0.4 },
    { y: 0.9, z: 0.16, c: PAL.bumperB, d: 0.32 },
    { y: 0.9, z: -0.16, c: PAL.bumperY, d: 0.32 },
  ];
  for (const a of arms) {
    addCyl(g, 0.016, 0.016, 0.22, steel, t.x + 0.12, a.y, t.z + a.z * 0.15, 8).rotation.z = Math.PI / 2;
    addPlate(g, t.x + 0.28, a.y, t.z + a.z, a.d, a.c, true);
  }
  addPad(g, 0.7, 0.7, t.x, 0.008, t.z);
}

function addDbRack(g, layout) {
  const d = layout.architecture.dbRack;
  const wood = toon(PAL.wood);
  const steel = toon(PAL.steel);
  const deep = toon(PAL.steelDeep);
  const backX = d.x - d.depth / 2 + 0.03;
  const frontX = d.x + d.depth / 2;
  addBox(g, 0.05, d.h, d.len, deep, backX, d.h / 2, d.z);
  addBox(g, 0.05, d.h, 0.05, steel, frontX - 0.02, d.h / 2, d.z - d.len / 2 + 0.04);
  addBox(g, 0.05, d.h, 0.05, steel, frontX - 0.02, d.h / 2, d.z + d.len / 2 - 0.04);
  addBox(g, d.depth, 0.04, d.len + 0.04, wood, d.x, 0.03, d.z);
  const shelves = [0.32, 0.62, 0.92];
  for (const y of shelves) {
    addBox(g, d.depth - 0.02, 0.03, d.len - 0.08, wood, d.x + 0.01, y, d.z);
  }
  const pairs = 7;
  for (let s = 0; s < 3; s++) {
    for (let i = 0; i < pairs; i++) {
      const z = d.z - d.len / 2 + 0.22 + i * ((d.len - 0.44) / (pairs - 1));
      const y = shelves[s] + 0.075;
      const head = 0.058 + s * 0.014 + (i % 3) * 0.01;
      const col = i % 2 ? PAL.db : PAL.iron;
      const bellX = frontX - 0.02;
      addCyl(g, head, head, 0.085, toon(col), bellX, y, z - 0.1, 10);
      addCyl(g, 0.013, 0.013, 0.24, steel, bellX, y, z, 8);
      addCyl(g, head, head, 0.085, toon(col), bellX, y, z + 0.1, 10);
    }
  }
  addPad(g, d.depth + 0.55, d.len + 0.25, d.x + 0.18, 0.008, d.z);
}

function addKettle(g, x, z, h = 0.28, color = PAL.kb) {
  addCyl(g, 0.09, 0.105, 0.16, toon(color), x, 0.1, z, 12);
  addCyl(g, 0.04, 0.04, 0.11, toon(color), x, h - 0.04, z, 8);
  const handle = new THREE.Mesh(new THREE.TorusGeometry(0.055, 0.012, 6, 14, Math.PI), toon(color));
  handle.position.set(x, h + 0.02, z);
  handle.rotation.x = Math.PI;
  handle.castShadow = true;
  g.add(handle);
  addPad(g, 0.32, 0.32, x, 0.008, z);
}

function addSpeedBag(g, layout) {
  const s = layout.architecture.speedBag;
  const steel = toon(PAL.steel);
  addBox(g, 0.55, 0.06, 0.55, steel, s.x, s.h, s.z);
  addBox(g, 0.08, s.h, 0.08, steel, s.x + 0.22, s.h / 2, s.z + 0.22);
  addBox(g, 0.08, s.h, 0.08, steel, s.x - 0.22, s.h / 2, s.z - 0.22);
  addCyl(g, 0.015, 0.015, 0.18, toon(PAL.chrome), s.x, s.h - 0.12, s.z, 8);
  addSphere(g, 0.11, toon('#3a2424'), s.x, s.h - 0.32, s.z, 12);
  addPad(g, 0.7, 0.7, s.x, 0.008, s.z);
}

function addMats(g, layout) {
  const size = layout.architecture.mat;
  for (const spec of layout.mats) {
    const { w, l, t } = size;
    const body = addBox(g, w, t, l, toon(spec.color), spec.x, t / 2, spec.z);
    body.name = spec.id;
    const edge = toon(new THREE.Color(spec.color).multiplyScalar(0.65));
    const rollA = addCyl(g, t * 0.55, t * 0.55, l * 0.98, edge, spec.x + w / 2 - 0.004, t * 0.45, spec.z, 10);
    rollA.rotation.x = Math.PI / 2;
    const rollB = addCyl(g, t * 0.55, t * 0.55, l * 0.98, edge, spec.x - w / 2 + 0.004, t * 0.45, spec.z, 10);
    rollB.rotation.x = Math.PI / 2;
    const head = (spec.head ?? -1) * (l / 2 - 0.08);
    addBox(g, w * 0.82, 0.004, 0.07, toon(PAL.matEdge), spec.x, t + 0.003, spec.z + head);
    addPad(g, w + 0.18, l + 0.18, spec.x, 0.007, spec.z);
  }
}

function addPlyo(g, x, z) {
  const sizes = [
    { s: 0.76, h: 0.76, c: PAL.bumperB, dz: 0 },
    { s: 0.61, h: 0.61, c: PAL.oxblood, dz: 0.7 },
    { s: 0.51, h: 0.51, c: PAL.wood, dz: 1.26 },
  ];
  for (const box of sizes) {
    addBox(g, box.s, box.h, box.s, toon(box.c), x, box.h / 2, z + box.dz);
  }
  addPad(g, 0.95, 2.0, x, 0.008, z + 0.63);
}

function addRopes(g, layout) {
  const t = layout.architecture.turf;
  const anchorX = t.x0 + 0.22;
  const anchorZ = t.z0 + 0.18;
  addBox(g, 0.18, 0.12, 0.18, toon(PAL.steelDeep), anchorX, 0.08, anchorZ);
  const rope = toon('#7a5a40');
  for (let i = 0; i < 2; i++) {
    const x = anchorX + 0.08 + i * 0.12;
    let z = anchorZ + 0.15;
    let y = 0.05;
    for (let k = 0; k < 14; k++) {
      const zn = z + 0.14;
      const yn = 0.045 + Math.abs(Math.sin(k * 0.9 + i)) * 0.04;
      addPole(g, x, y, z, x + Math.sin(k * 0.5) * 0.04, yn, zn, 0.018, rope, 6);
      z = zn;
      y = yn;
    }
    addCyl(g, 0.09, 0.09, 0.12, rope, x + 0.02, 0.08, z + 0.08, 10);
  }
}

function addMedBalls(g, x, z) {
  addSphere(g, 0.12, toon(PAL.med), x, 0.12, z, 12);
  addSphere(g, 0.1, toon(PAL.medB), x + 0.22, 0.1, z + 0.08, 12);
  addSphere(g, 0.09, toon('#4a4a38'), x + 0.08, 0.09, z + 0.24, 12);
  addPad(g, 0.7, 0.55, x + 0.1, 0.008, z + 0.1);
}

function addLockers(g, layout) {
  const L = layout.architecture.lockers;
  const metal = toon('#6a6e74');
  const deep = toon('#3a3e44');
  for (let i = 0; i < L.n; i++) {
    const z = L.z - ((L.n - 1) * L.w) / 2 + i * L.w;
    addBox(g, L.d, L.h, L.w - 0.02, metal, L.x, L.h / 2, z);
    addBox(g, 0.02, L.h - 0.12, L.w - 0.08, deep, L.x + L.d / 2 - 0.01, L.h / 2, z);
    addCyl(g, 0.012, 0.012, 0.04, toon(PAL.chrome), L.x + L.d / 2, 1.05, z + 0.08, 8).rotation.z = Math.PI / 2;
    addBox(g, 0.03, 0.08, 0.05, toon('#2a6a3a'), L.x + L.d / 2, 1.55, z);
  }
  addPad(g, L.d + 0.3, L.n * L.w + 0.2, L.x, 0.008, L.z);
}

function addWater(g, layout) {
  const w = layout.architecture.water;
  addBox(g, 0.55, 0.08, 0.42, toon(PAL.woodLite), w.x, w.h, w.z);
  addBox(g, 0.08, w.h, 0.08, toon(PAL.steel), w.x - 0.2, w.h / 2, w.z - 0.14);
  addBox(g, 0.08, w.h, 0.08, toon(PAL.steel), w.x + 0.2, w.h / 2, w.z + 0.14);
  addCyl(g, 0.12, 0.13, 0.42, toon('#8aa0b0', { transparent: true, opacity: 0.55 }), w.x - 0.12, 0.55, w.z - 0.02, 14);
  addCyl(g, 0.13, 0.13, 0.04, toon(PAL.steelLite), w.x - 0.12, 0.78, w.z - 0.02, 12);
  addCyl(g, 0.1, 0.12, 0.38, toon('#6a6e72'), w.x + 0.16, 0.22, w.z + 0.05, 12);
  addPad(g, 0.75, 0.6, w.x, 0.008, w.z);
}

function addCones(g) {
  for (const [x, z] of [
    [-1.55, -0.55],
    [1.65, -0.52],
    [1.68, 2.55],
  ]) {
    addCyl(g, 0.02, 0.08, 0.28, toon(PAL.cone), x, 0.16, z, 10);
    addCyl(g, 0.09, 0.09, 0.03, toon(PAL.cone), x, 0.02, z, 10);
  }
}

function addTowels(g) {
  addBox(g, 0.22, 0.06, 0.16, toon(PAL.towel), -5.02, 1.88, 1.42);
  addBox(g, 0.2, 0.05, 0.14, toon(PAL.towelB), -5.02, 1.94, 1.55);
  addBox(g, 0.18, 0.04, 0.14, toon(PAL.towel), -5.02, 1.91, 1.28);
  addBox(g, 0.2, 0.05, 0.14, toon(PAL.towel), -4.98, 1.9, 3.38);
}

function addFoliage(g, inst, targetHeight) {
  const x = inst.position[0];
  const z = inst.position[2];
  const rim = inst.position[1] + targetHeight * 0.78;
  const stem = toon('#4a5a38');
  const leafA = toon('#3e6b4a');
  const leafB = toon('#2f5a3c');
  addCyl(g, 0.014, 0.018, 0.28, stem, x, rim + 0.14, z, 6);
  for (let i = 0; i < 6; i++) {
    const ang = (i / 6) * Math.PI * 2;
    const leaf = addBox(g, 0.16, 0.014, 0.34, i % 2 ? leafA : leafB, x + Math.cos(ang) * 0.07, rim + 0.32, z + Math.sin(ang) * 0.07);
    leaf.rotation.y = -ang;
    leaf.rotation.z = Math.cos(ang) * 0.4;
    leaf.rotation.x = Math.sin(ang) * 0.32;
  }
}

function addPendants(g, layout) {
  for (const inst of layout.instances) {
    if (inst.kind !== 'pendant_lamp') continue;
    const [x, y, z] = inst.position;
    const bulb = addCyl(
      g,
      0.04,
      0.04,
      0.045,
      toon('#ffe1bf', { emissive: '#ffc98a', emissiveIntensity: 1.35 }),
      x,
      y + 0.1,
      z,
      12
    );
    bulb.userData.noShadow = true;
    const light = new THREE.PointLight('#ffc98a', 0.55, 4.2, 2);
    light.position.set(x, y + 0.14, z);
    g.add(light);
  }
}

function addBenchPads(g, layout) {
  for (const inst of layout.instances) {
    if (inst.kind !== 'museum_bench') continue;
    const [x, , z] = inst.position;
    const alongX = Math.abs(inst.rotationY) > 0.5;
    addPad(g, alongX ? 1.75 : 0.55, alongX ? 0.55 : 1.7, x, 0.008, z);
  }
}

function makeProcedural(layout) {
  const g = new THREE.Group();
  g.name = 'procedural';
  addBagPads(g, layout);
  addRack(g, layout);
  addDbRack(g, layout);
  addPlateTree(g, layout);
  addSpeedBag(g, layout);
  addKettle(g, -3.72, 1.42, 0.3, PAL.kb);
  addKettle(g, -3.42, 1.58, 0.26, '#3a2a28');
  addKettle(g, -3.62, 1.78, 0.32, PAL.iron);
  addKettle(g, -3.28, 1.32, 0.24, '#2a3a38');
  addMats(g, layout);
  addPlyo(g, -2.28, 1.55);
  addRopes(g, layout);
  addMedBalls(g, 1.42, 2.28);
  addLockers(g, layout);
  addWater(g, layout);
  addCones(g);
  addTowels(g);
  addBenchPads(g, layout);
  for (const inst of layout.instances) {
    if (!inst.foliage) continue;
    addFoliage(g, inst, layout.assets[inst.kind].targetHeight);
  }
  addPendants(g, layout);
  addPad(g, 0.5, 0.5, 4.95, 0.008, 3.55);
  return g;
}

boot({
  makeShell,
  makeProcedural,
  readyText: 'ready — bag-and-iron gym · drag orbit · U unlit · T toon',
});
