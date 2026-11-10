import * as THREE from 'three';
import { boot, toon, addBox, addCyl, contactDisc } from './scene_lib.js';

const PAL = {
  floor: '#8a867e',
  seam: '#242220',
  wall: '#d8d4c9',
  inset: '#c9c4b8',
  rib: '#2c343c',
  ribHi: '#5b656f',
  ceil: '#cfccc4',
  hull: '#3e4854',
  hullDark: '#262c33',
  copper: '#c4894a',
  cavity: '#171c21',
  rugA: '#3e524a',
  rugB: '#6c5546',
  glass: '#c5d5df',
  top: '#b08968',
  blanket: '#6e5848',
  pipOk: '#8ea194',
  pipAmber: '#e0a15a',
  readout: '#d9d3c6',
};

function mats() {
  return {
    floor: toon(PAL.floor),
    seam: toon(PAL.seam, { polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -2 }),
    wall: toon(PAL.wall),
    inset: toon(PAL.inset),
    rib: toon(PAL.rib),
    ribHi: toon(PAL.ribHi),
    ceil: toon(PAL.ceil),
    hull: toon(PAL.hull),
    hullDark: toon(PAL.hullDark),
    copper: toon(PAL.copper),
    cavity: toon(PAL.cavity),
    rugA: toon(PAL.rugA),
    rugB: toon(PAL.rugB),
    glass: toon(PAL.glass, { transparent: true, opacity: 0.2, side: THREE.DoubleSide }),
    top: toon(PAL.top),
    blanket: toon(PAL.blanket),
  };
}

function unshaded(mesh) {
  mesh.userData.unshaded = true;
  mesh.castShadow = false;
  mesh.receiveShadow = false;
  return mesh;
}

function labelTexture(text, accent = '#c4894a') {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 128;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#2a3138';
  ctx.fillRect(0, 0, 512, 128);
  ctx.strokeStyle = accent;
  ctx.lineWidth = 10;
  ctx.strokeRect(8, 8, 496, 112);
  ctx.fillStyle = '#e7e1d4';
  ctx.font = '600 72px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 256, 70);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function placeLabel(parent, text, w, h, x, y, z, rotY, accent) {
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(w, h),
    new THREE.MeshBasicMaterial({ map: labelTexture(text, accent) }),
  );
  mesh.position.set(x, y, z);
  mesh.rotation.y = rotY;
  parent.add(mesh);
  return unshaded(mesh);
}

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function ellipse(ctx, x, y, rx, ry, rot) {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2);
  ctx.fill();
}

/** Painted limb seen through the port. Flat toon shapes, not a photo. */
function vistaTexture() {
  const w = 1280;
  const h = 512;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#0d1318';
  ctx.fillRect(0, 0, w, h);
  const rng = mulberry32(20261110);
  for (let i = 0; i < 28; i++) {
    const x = rng() * w;
    const y = rng() * h * 0.42;
    const v = 150 + Math.floor(rng() * 80);
    ctx.fillStyle = `rgb(${v},${v},${Math.min(255, v + 14)})`;
    ctx.fillRect(x, y, rng() < 0.2 ? 2 : 1, rng() < 0.2 ? 2 : 1);
  }
  const cx = w * 0.4;
  const cy = h * 1.28;
  const r = h * 1.12;
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.clip();
  const ocean = ctx.createLinearGradient(0, 0, w, h);
  ocean.addColorStop(0, '#1a5278');
  ocean.addColorStop(0.55, '#163e62');
  ocean.addColorStop(1, '#0c2438');
  ctx.fillStyle = ocean;
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#3d6a48';
  ctx.beginPath();
  ctx.moveTo(cx - r * 0.42, cy - r * 0.62);
  ctx.quadraticCurveTo(cx - r * 0.2, cy - r * 0.78, cx - r * 0.02, cy - r * 0.6);
  ctx.quadraticCurveTo(cx - r * 0.12, cy - r * 0.5, cx - r * 0.34, cy - r * 0.52);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#5c6246';
  ctx.beginPath();
  ctx.moveTo(cx + r * 0.05, cy - r * 0.7);
  ctx.quadraticCurveTo(cx + r * 0.22, cy - r * 0.74, cx + r * 0.18, cy - r * 0.58);
  ctx.quadraticCurveTo(cx + r * 0.06, cy - r * 0.56, cx + r * 0.05, cy - r * 0.7);
  ctx.fill();
  ctx.fillStyle = 'rgba(230,236,238,0.8)';
  ellipse(ctx, cx - r * 0.18, cy - r * 0.66, r * 0.1, r * 0.018, -0.2);
  ellipse(ctx, cx + r * 0.08, cy - r * 0.57, r * 0.07, r * 0.012, 0.15);
  ctx.restore();
  ctx.strokeStyle = '#8fb4c6';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(cx, cy, r + 2, Math.PI * 1.14, Math.PI * 1.86);
  ctx.stroke();
  ctx.strokeStyle = '#d5e4ec';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(cx, cy, r + 6, Math.PI * 1.22, Math.PI * 1.78);
  ctx.stroke();
  // solar wing in the black, overlapping the limb so it reads as outside hardware
  ctx.save();
  ctx.translate(w * 0.62, h * 0.2);
  ctx.rotate(-0.22);
  ctx.fillStyle = '#2a3848';
  ctx.fillRect(0, -58, 340, 128);
  ctx.strokeStyle = '#9aafc0';
  ctx.lineWidth = 2;
  for (let i = 1; i < 4; i++) {
    ctx.beginPath();
    ctx.moveTo(0, -58 + i * 32);
    ctx.lineTo(340, -58 + i * 32);
    ctx.stroke();
  }
  for (let i = 1; i < 7; i++) {
    ctx.beginPath();
    ctx.moveTo(i * 48, -58);
    ctx.lineTo(i * 48, 70);
    ctx.stroke();
  }
  ctx.restore();
  ctx.strokeStyle = '#6d7d8c';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(w * 0.7, h * 0.34);
  ctx.lineTo(w * 0.56, h * 0.5);
  ctx.stroke();
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function roundedRectShape(w, h, r) {
  const s = new THREE.Shape();
  const x = -w / 2;
  const y = -h / 2;
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y);
  s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r);
  s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h);
  s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r);
  s.quadraticCurveTo(x, y, x + r, y);
  return s;
}

function roundedRectHole(w, h, r) {
  const p = new THREE.Path();
  const x = -w / 2;
  const y = -h / 2;
  p.moveTo(x + r, y);
  p.quadraticCurveTo(x, y, x, y + r);
  p.lineTo(x, y + h - r);
  p.quadraticCurveTo(x, y + h, x + r, y + h);
  p.lineTo(x + w - r, y + h);
  p.quadraticCurveTo(x + w, y + h, x + w, y + h - r);
  p.lineTo(x + w, y + r);
  p.quadraticCurveTo(x + w, y, x + w - r, y);
  p.lineTo(x + r, y);
  return p;
}

function innerZ(D) {
  return -D / 2 + 0.2;
}

/** Forward cut so the open end sits just past the seats, not a plaza of deck. */
function cutZ() {
  return 2.2;
}

function innerX(W) {
  return -W / 2 + 0.2;
}

function addBackWall(g, m, W, D, H, win) {
  const zIn = innerZ(D);
  const layers = [
    { mat: m.wall, t: 0.05, z: zIn - 0.025 },
    { mat: m.hullDark, t: 0.08, z: zIn - 0.09 },
    { mat: m.hull, t: 0.055, z: zIn - 0.157 },
  ];
  const x0 = -W / 2;
  const x1 = W / 2;
  const winL = win.x - win.width / 2;
  const winR = win.x + win.width / 2;
  const winB = win.sill;
  const winT = win.sill + win.height;
  for (const L of layers) {
    addBox(g, W, winB, L.t, L.mat, 0, winB / 2, L.z);
    addBox(g, W, H - winT, L.t, L.mat, 0, (H + winT) / 2, L.z);
    addBox(g, winL - x0, winT - winB, L.t, L.mat, (x0 + winL) / 2, (winB + winT) / 2, L.z);
    addBox(g, x1 - winR, winT - winB, L.t, L.mat, (winR + x1) / 2, (winB + winT) / 2, L.z);
  }
  return zIn;
}

function addLeftWall(g, m, W, D, H) {
  const xIn = innerX(W);
  const z0 = innerZ(D) + 0.02;
  const z1 = cutZ();
  const depth = z1 - z0;
  const zc = (z0 + z1) / 2;
  const layers = [
    { mat: m.wall, t: 0.05, x: xIn - 0.025 },
    { mat: m.hullDark, t: 0.08, x: xIn - 0.09 },
    { mat: m.hull, t: 0.055, x: xIn - 0.157 },
  ];
  for (const L of layers) addBox(g, L.t, H, depth, L.mat, L.x, H / 2, zc);
  return xIn;
}

function addPort(g, m, D, win) {
  const zIn = innerZ(D);
  const outerW = win.width + 0.28;
  const outerH = win.height + 0.28;
  const holeW = win.width - 0.12;
  const holeH = win.height - 0.1;
  const shape = roundedRectShape(outerW, outerH, 0.16);
  shape.holes.push(roundedRectHole(holeW, holeH, 0.1));
  const frame = new THREE.Mesh(
    new THREE.ExtrudeGeometry(shape, { depth: 0.14, bevelEnabled: false, curveSegments: 8 }),
    m.rib,
  );
  frame.position.set(win.x, win.sill + win.height / 2, zIn - 0.02);
  frame.castShadow = true;
  frame.receiveShadow = true;
  g.add(frame);

  const lipShape = roundedRectShape(holeW + 0.04, holeH + 0.04, 0.1);
  lipShape.holes.push(roundedRectHole(holeW - 0.08, holeH - 0.06, 0.08));
  const lip = new THREE.Mesh(
    new THREE.ExtrudeGeometry(lipShape, { depth: 0.04, bevelEnabled: false, curveSegments: 8 }),
    m.cavity,
  );
  lip.position.set(win.x, win.sill + win.height / 2, zIn + 0.1);
  g.add(lip);

  const glass = new THREE.Mesh(new THREE.PlaneGeometry(holeW - 0.12, holeH - 0.1), m.glass);
  glass.position.set(win.x, win.sill + win.height / 2, zIn + 0.02);
  glass.userData.noCast = true;
  g.add(glass);

  const vista = new THREE.Mesh(
    new THREE.PlaneGeometry(win.width + 0.55, win.height + 0.36),
    new THREE.MeshBasicMaterial({ map: vistaTexture() }),
  );
  vista.position.set(win.x, win.sill + win.height / 2, zIn - 0.28);
  unshaded(vista);
  g.add(vista);

  const boltMat = m.ribHi;
  const cols = 7;
  const rows = 2;
  const bolt = (x, y) => {
    const mesh = addCyl(g, 0.022, 0.022, 0.028, boltMat, x, y, zIn + 0.125, 8);
    mesh.rotation.x = Math.PI / 2;
  };
  for (let i = 0; i < cols; i++) {
    const x = win.x - win.width / 2 + 0.28 + (i * (win.width - 0.56)) / (cols - 1);
    bolt(x, win.sill + 0.08);
    bolt(x, win.sill + win.height - 0.08);
  }
  for (let i = 0; i < rows; i++) {
    const y = win.sill + 0.38 + i * 0.7;
    bolt(win.x - win.width / 2 + 0.08, y);
    bolt(win.x + win.width / 2 - 0.08, y);
  }

  // lean sill, inboard of the glass
  addBox(g, win.width - 0.2, 0.06, 0.16, m.rib, win.x, win.sill - 0.02, zIn + 0.1);
  addBox(g, win.width - 0.36, 0.025, 0.1, m.top, win.x, win.sill + 0.02, zIn + 0.12);
  return zIn;
}

function addRibs(g, m, W, D, H, win) {
  const zIn = innerZ(D);
  const xIn = innerX(W);
  const winL = win.x - win.width / 2;
  const winR = win.x + win.width / 2;
  const midY = win.sill + win.height / 2;
  // back-wall pier ribs, full height, proud of the liner
  for (const x of [-4.05, -3.15, -2.35, 2.95, 3.75, 4.45]) {
    if (x > winL + 0.05 && x < winR - 0.05) continue;
    addBox(g, 0.07, H - 0.04, 0.08, m.rib, x, H / 2, zIn + 0.04);
  }
  // window jambs
  for (const x of [winL - 0.02, winR + 0.02]) {
    addBox(g, 0.09, H - 0.04, 0.1, m.rib, x, H / 2, zIn + 0.05);
  }
  // horizontal belts on the piers, broken by the port
  addBox(g, winL - (-W / 2) - 0.1, 0.07, 0.06, m.rib, (-W / 2 + winL) / 2, 1.02, zIn + 0.05);
  addBox(g, W / 2 - winR - 0.1, 0.07, 0.06, m.rib, (winR + W / 2) / 2, 1.02, zIn + 0.05);
  addBox(g, winL - (-W / 2) - 0.1, 0.06, 0.05, m.ribHi, (-W / 2 + winL) / 2, 2.55, zIn + 0.045);
  addBox(g, W / 2 - winR - 0.1, 0.06, 0.05, m.ribHi, (winR + W / 2) / 2, 2.55, zIn + 0.045);
  // left-wall bay ribs. Locker bank uses the four aft bays.
  for (const z of [-3.6, -2.8, -2.0, -1.2, -0.4, 0.5, 1.45, 2.05]) {
    addBox(g, 0.08, H - 0.04, 0.065, m.rib, xIn + 0.42, H / 2, z);
  }
  addBox(g, 0.06, 0.07, D - 0.3, m.rib, xIn + 0.4, 1.9, 0);
  // ceiling frames over the occupied module, open toward the cut
  const cz0 = -D / 2 + 0.15;
  const cz1 = 1.15;
  const cx0 = -W / 2 + 0.15;
  const cx1 = W / 2 - 0.85;
  for (const z of [-3.15, -1.85, -0.55, 0.75]) {
    addBox(g, cx1 - cx0, 0.08, 0.07, m.rib, (cx0 + cx1) / 2, H - 0.12, z);
  }
  for (const x of [-3.2, -0.55, 2.05]) {
    addBox(g, 0.065, 0.07, cz1 - cz0, m.rib, x, H - 0.11, (cz0 + cz1) / 2);
  }
  void midY;
}

function addCeiling(g, m, W, D, H) {
  const cz0 = -D / 2;
  const cz1 = 1.35;
  const cx0 = -W / 2;
  const cx1 = W / 2 - 0.7;
  const cw = cx1 - cx0;
  const cd = cz1 - cz0;
  const cx = (cx0 + cx1) / 2;
  const cz = (cz0 + cz1) / 2;
  addBox(g, cw, 0.06, cd, m.ceil, cx, H - 0.04, cz);
  addBox(g, cw + 0.12, 0.05, cd + 0.1, m.hull, cx - 0.04, H + 0.025, cz - 0.04);
  addBox(g, cw + 0.2, 0.04, 0.08, m.hullDark, cx, H + 0.06, cz0 + 0.02);
}

function addDeck(g, m, W, D) {
  const z1 = cutZ();
  const z0 = -D / 2;
  const depth = z1 - z0;
  const zc = (z0 + z1) / 2;
  const floor = addBox(g, W, 0.14, depth, m.floor, 0, -0.07, zc);
  floor.receiveShadow = true;
  addBox(g, W - 0.08, 0.1, depth - 0.12, m.hullDark, 0, -0.18, zc - 0.02);
  addBox(g, 0.16, 0.12, depth - 0.5, m.cavity, 0.3, -0.27, zc);
  for (const z of [-2.5, -0.7, 1.15]) {
    addBox(g, W - 0.6, 0.07, 0.06, m.hullDark, 0, -0.25, z);
  }
  // bay seams follow the port-wall ribs, plus one aisle line — not a square tile field
  for (const z of [-2.8, -1.2, 0.5, 1.7]) {
    addBox(g, W - 0.8, 0.012, 0.025, m.seam, -0.1, 0.007, z);
  }
  addBox(g, 0.025, 0.012, depth - 0.7, m.seam, -0.15, 0.007, zc);
  addBox(g, 0.025, 0.012, 2.4, m.seam, 2.55, 0.007, -1.2);
  const hatch = new THREE.Mesh(new THREE.RingGeometry(0.38, 0.48, 28), m.rib);
  hatch.rotation.x = -Math.PI / 2;
  hatch.position.set(-0.55, 0.014, 1.35);
  g.add(hatch);
  const lid = new THREE.Mesh(new THREE.CircleGeometry(0.36, 24), m.inset);
  lid.rotation.x = -Math.PI / 2;
  lid.position.set(-0.55, 0.013, 1.35);
  g.add(lid);
  addBox(g, 0.14, 0.02, 0.035, m.ribHi, -0.55, 0.022, 1.35);
}

function addRails(g, m, W, D, win) {
  const zIn = innerZ(D);
  const xIn = innerX(W);
  const y = win.sill + 0.14;
  const x0 = win.x - win.width / 2 + 0.25;
  const x1 = win.x + win.width / 2 - 0.25;
  addCyl(g, 0.018, 0.018, x1 - x0, m.ribHi, (x0 + x1) / 2, y, zIn + 0.16, 10).rotation.z = Math.PI / 2;
  for (let x = x0 + 0.15; x < x1; x += 0.85) {
    addBox(g, 0.03, 0.03, 0.1, m.rib, x, y, zIn + 0.1);
  }
  // overhead corridor rail clear of locker doors
  const zA = -3.4;
  const zB = 1.7;
  const rail = addCyl(g, 0.02, 0.02, zB - zA, m.ribHi, xIn + 0.55, 2.22, (zA + zB) / 2, 10);
  rail.rotation.x = Math.PI / 2;
  for (let z = zA; z <= zB; z += 1.15) {
    addBox(g, 0.28, 0.03, 0.03, m.rib, xIn + 0.38, 2.22, z);
  }
}

function makeShell(layout) {
  const g = new THREE.Group();
  g.name = 'shell';
  const { width: W, depth: D, height: H } = layout.meta.room;
  const win = layout.meta.window;
  const m = mats();
  addDeck(g, m, W, D);
  addBackWall(g, m, W, D, H, win);
  addLeftWall(g, m, W, D, H);
  addPort(g, m, D, win);
  addRibs(g, m, W, D, H, win);
  addCeiling(g, m, W, D, H);
  addRails(g, m, W, D, win);
  const header = placeLabel(g, 'HAB-03', 0.72, 0.18, win.x, win.sill + win.height + 0.26, innerZ(D) + 0.06, 0);
  header.name = 'module-label';
  return g;
}

function addLockerBank(g, m, layout) {
  const { width: W } = layout.meta.room;
  const xIn = innerX(W);
  const d = 0.4;
  const h = 1.86;
  const w = 0.74;
  for (const spec of layout.meta.lockers) {
    const z = spec.z;
    const x = xIn + d / 2;
    addBox(g, 0.03, h - 0.12, w - 0.12, m.inset, xIn + 0.045, h / 2, z);
    addBox(g, d - 0.06, h - 0.1, 0.04, m.rib, x - 0.02, h / 2, z - w / 2 + 0.045);
    addBox(g, d - 0.06, h - 0.1, 0.04, m.rib, x - 0.02, h / 2, z + w / 2 - 0.045);
    addBox(g, d - 0.06, 0.045, w - 0.1, m.rib, x - 0.02, h - 0.07, z);
    addBox(g, d - 0.06, 0.05, w - 0.1, m.rib, x - 0.02, 0.045, z);
    const pivot = new THREE.Group();
    pivot.name = `locker-${spec.id}`;
    pivot.position.set(xIn + d, h / 2, z - (w - 0.08) / 2);
    pivot.rotation.y = spec.open ? 1.25 : 0;
    g.add(pivot);
    const doorW = w - 0.09;
    const doorH = h - 0.12;
    addBox(pivot, 0.022, doorH, doorW, m.wall, 0.012, 0, doorW / 2);
    addBox(pivot, 0.012, doorH - 0.34, doorW - 0.14, m.inset, 0.026, -0.02, doorW / 2);
    for (let i = 0; i < 3; i++) {
      addBox(pivot, 0.01, 0.016, doorW * 0.62, m.cavity, 0.03, doorH * 0.36 - i * 0.032, doorW / 2);
    }
    addCyl(pivot, 0.012, 0.012, 0.18, m.ribHi, 0.045, -0.08, doorW - 0.1, 8);
    placeLabel(pivot, spec.id, 0.2, 0.055, 0.04, doorH * 0.32, 0.16, Math.PI / 2, spec.open ? '#8ea194' : '#c4894a');
    if (spec.open) {
      addBox(g, d - 0.12, 0.02, w - 0.18, m.ribHi, x + 0.02, 1.02, z);
      addBox(g, d - 0.14, 0.02, w - 0.18, m.ribHi, x + 0.02, 0.5, z);
      addBox(g, 0.2, 0.06, 0.32, m.blanket, x + 0.04, 0.55, z);
      addBox(g, 0.16, 0.04, 0.2, m.top, x + 0.05, 0.62, z);
    } else {
      // closed bay still has a toe recess so the bank reads as built-in
      addBox(g, 0.02, 0.08, w - 0.12, m.cavity, xIn + d + 0.005, 0.05, z);
    }
  }
  // upper infill panels in the same bay rhythm
  for (const spec of layout.meta.lockers) {
    const z = spec.z;
    if (spec.id === 'L2') {
      addBox(g, 0.28, 0.025, w - 0.16, m.rib, xIn + 0.2, 2.15, z);
      addBox(g, 0.22, 0.1, 0.36, m.blanket, xIn + 0.2, 2.28, z);
      addBox(g, 0.16, 0.08, 0.2, m.inset, xIn + 0.22, 2.48, z);
    } else {
      addBox(g, 0.06, 0.78, w - 0.12, m.inset, xIn + 0.08, 2.36, z);
    }
  }
}

function addGalley(g, m, layout) {
  const { depth: D } = layout.meta.room;
  const zIn = innerZ(D);
  const x = 3.4;
  const z = zIn + 0.28;
  addBox(g, 1.5, 0.1, 0.46, m.hullDark, x, 0.05, z);
  addBox(g, 1.55, 0.74, 0.5, m.rib, x, 0.5, z);
  addBox(g, 1.62, 0.045, 0.56, m.top, x, 0.9, z);
  addBox(g, 1.55, 0.28, 0.03, m.ribHi, x, 1.06, zIn + 0.04);
  // two drawer lines so the carcass is not one blank slab
  addBox(g, 1.35, 0.012, 0.02, m.cavity, x, 0.58, z + 0.25);
  addBox(g, 0.02, 0.5, 0.02, m.cavity, x, 0.48, z + 0.25);
  addCyl(g, 0.015, 0.015, 0.08, m.copper, x - 0.35, 0.42, z + 0.27, 8);
  addCyl(g, 0.015, 0.015, 0.08, m.copper, x + 0.35, 0.72, z + 0.27, 8);
}

function addStatus(g, m, layout) {
  const zIn = innerZ(layout.meta.room.depth);
  const x = -3.15;
  const y = 1.62;
  addBox(g, 0.5, 0.62, 0.04, m.cavity, x, y, zIn + 0.03);
  addBox(g, 0.44, 0.5, 0.02, m.hullDark, x, y, zIn + 0.05);
  for (let i = 0; i < 4; i++) {
    const w = 0.28 - (i % 3) * 0.05;
    addBox(g, w, 0.018, 0.012, toon(PAL.readout), x - 0.04, y + 0.16 - i * 0.09, zIn + 0.065);
  }
  const pips = [PAL.pipOk, PAL.pipOk, PAL.pipAmber];
  pips.forEach((color, i) => {
    const mesh = new THREE.Mesh(
      new THREE.CircleGeometry(0.018, 12),
      new THREE.MeshBasicMaterial({ color }),
    );
    mesh.position.set(x + 0.16, y - 0.16 + i * 0.07, zIn + 0.07);
    unshaded(mesh);
    g.add(mesh);
  });
}

function addStrips(g, layout) {
  const housing = toon(PAL.rib);
  const cap = toon(PAL.copper);
  for (const s of layout.meta.strips) {
    const alongX = s.axis === 'x';
    const len = s.len;
    const hw = alongX ? len : 0.09;
    const hd = alongX ? 0.09 : len;
    addBox(g, hw, 0.05, hd, housing, s.x, s.y, s.z);
    addBox(g, alongX ? 0.06 : 0.07, 0.055, alongX ? 0.07 : 0.06, cap, s.x - (alongX ? len / 2 : 0), s.y, s.z);
    addBox(g, alongX ? 0.06 : 0.07, 0.055, alongX ? 0.07 : 0.06, cap, s.x + (alongX ? len / 2 : 0), s.y, s.z);
    const emitter = new THREE.Mesh(
      new THREE.BoxGeometry(alongX ? len - 0.12 : 0.028, 0.012, alongX ? 0.028 : len - 0.12),
      new THREE.MeshBasicMaterial({ color: s.color }),
    );
    emitter.position.set(s.x, s.y - 0.028, s.z);
    emitter.name = s.id;
    unshaded(emitter);
    g.add(emitter);
  }
}

function addRugs(g, m) {
  addBox(g, 2.35, 0.015, 2.9, m.rugA, -1.95, 0.012, -0.78);
  addBox(g, 2.55, 0.015, 3.3, m.rugB, 1.15, 0.012, -1.15);
}

function addPlant(g, layout) {
  const pot = (layout.instances || []).find((i) => i.id === 'galley-plant');
  if (!pot) return;
  const [x, , z] = pot.position;
  const stem = toon('#3e5344');
  const leaf = toon('#3f6b48');
  const leafD = toon('#2f5538');
  addCyl(g, 0.012, 0.016, 0.22, stem, x, 0.42, z, 8);
  addBox(g, 0.28, 0.16, 0.24, leaf, x, 0.58, z);
  addBox(g, 0.16, 0.12, 0.16, leafD, x + 0.08, 0.68, z - 0.04);
  addBox(g, 0.12, 0.1, 0.12, leaf, x - 0.08, 0.64, z + 0.05);
}

const CONTACT = {
  sofa_solid: [0.78, 0.42],
  simple_chair: [0.28, 0.28],
  coffee_table: [0.4, 0.68],
  dining_table: [0.96, 0.48],
  museum_bench: [0.2, 0.7],
  flowerpot: [0.18, 0.18],
};

function addContacts(g, layout) {
  for (const inst of layout.instances || []) {
    const base = CONTACT[inst.kind];
    if (!base) continue;
    const rot = Math.abs(inst.rotationY || 0) % Math.PI;
    const swap = Math.abs(rot - Math.PI / 2) < 0.35;
    const rx = swap ? base[1] : base[0];
    const rz = swap ? base[0] : base[1];
    contactDisc(g, inst.position[0], inst.position[2], rx, rz);
  }
  contactDisc(g, 3.4, innerZ(layout.meta.room.depth) + 0.28, 0.8, 0.3);
}

function makeProcedural(layout) {
  const g = new THREE.Group();
  g.name = 'procedural';
  const m = mats();
  addRugs(g, m);
  addLockerBank(g, m, layout);
  addGalley(g, m, layout);
  addStatus(g, m, layout);
  addStrips(g, layout);
  addPlant(g, layout);
  addContacts(g, layout);
  return g;
}

boot({
  makeShell,
  makeProcedural,
  readyText: 'ready — orbital mess · drag orbit · U unlit · T toon',
});
