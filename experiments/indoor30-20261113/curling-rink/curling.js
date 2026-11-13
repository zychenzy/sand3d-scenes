import * as THREE from 'three';
import { boot, toon, addBox, addCyl, addSphere } from './scene_lib.js';
import {
  SHEET, STONE, LOUNGE, HALL, frame, lineRects, hacks, racks, rackSlots, playedStones, brushes,
} from './sheet_spec.mjs';

const ICE_Y = 0.021;

function srgb(canvas) {
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  tex.needsUpdate = true;
  return tex;
}

function iceTexture() {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = '#d5e6ec';
  g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 90; i++) {
    const x = (i * 97 + 13) % 256;
    const y = (i * 57 + 29) % 256;
    g.fillStyle = i % 3 === 0 ? 'rgba(80,120,132,0.10)' : 'rgba(255,255,255,0.14)';
    g.beginPath();
    g.arc(x, y, 1.2 + (i % 3), 0, Math.PI * 2);
    g.fill();
  }
  const tex = srgb(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(9, 86);
  return tex;
}

function plankTexture() {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 256;
  const g = c.getContext('2d');
  const rows = ['#c6a36c', '#d2b07a', '#bb9860', '#c9a874', '#b89258'];
  const plank = 32;
  for (let y = 0; y < 256; y += plank) {
    g.fillStyle = rows[(y / plank) % rows.length];
    g.fillRect(0, y, 128, plank - 2);
    g.fillStyle = 'rgba(90,58,28,0.28)';
    g.fillRect(0, y + plank - 2, 128, 2);
  }
  const tex = srgb(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2, 8);
  return tex;
}

function scoreTexture() {
  const c = document.createElement('canvas');
  c.width = 1024;
  c.height = 320;
  const g = c.getContext('2d');
  g.fillStyle = '#1a2420';
  g.fillRect(0, 0, 1024, 320);
  g.strokeStyle = '#e6dcc8';
  g.lineWidth = 8;
  g.strokeRect(16, 16, 992, 288);
  g.fillStyle = '#e6dcc8';
  g.font = '600 34px sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText('SHEET 2', 512, 48);
  const ends = ['1', '2', '3', '4', '5', '6', '7', '8', 'T'];
  const red = ['2', '0', '1', '0', '2', '0', '', '', '5'];
  const yel = ['0', '1', '0', '3', '0', '1', '', '', '5'];
  const x0 = 210;
  const step = 84;
  g.font = '700 42px sans-serif';
  ends.forEach((label, i) => {
    g.fillStyle = '#e6dcc8';
    g.fillText(label, x0 + i * step, 108);
  });
  function row(scores, y, chip) {
    g.fillStyle = chip;
    g.fillRect(78, y - 22, 44, 44);
    g.font = '700 48px sans-serif';
    scores.forEach((value, i) => {
      g.fillStyle = value ? '#f4efe4' : '#6d7a74';
      g.fillText(value || '·', x0 + i * step, y);
    });
  }
  row(red, 176, '#d24b45');
  row(yel, 250, '#e0b12e');
  return srgb(c);
}

function plateTexture() {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = '#1a2420';
  g.fillRect(0, 0, 128, 128);
  g.fillStyle = '#f3ead8';
  g.font = '700 84px Georgia, serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText('2', 64, 70);
  return srgb(c);
}

const numberTex = new Map();
function numberTexture(n, hex) {
  const key = `${n}${hex}`;
  if (numberTex.has(key)) return numberTex.get(key);
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = hex;
  g.beginPath();
  g.arc(64, 64, 60, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = '#1c1c1c';
  g.font = '700 72px sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(String(n), 64, 70);
  const tex = srgb(c);
  numberTex.set(key, tex);
  return tex;
}

function makeMats() {
  const iceMap = iceTexture();
  return {
    ice: toon('#ffffff', { map: iceMap }),
    iceEdge: toon('#c5d5dc'),
    apron: toon('#b7c2c6'),
    line: toon('#1b2c44'),
    hog: toon('#1a3f73'),
    blue: toon('#2f74c4'),
    whiteRing: toon('#f4f8f8'),
    red: toon('#d64545'),
    button: toon('#f7f4ef'),
    hole: toon('#1b2c44'),
    hack: toon('#2a2e32'),
    granite: toon('#7c8288'),
    graniteAlt: toon('#8e949a'),
    band: toon('#b4bac0'),
    handleRed: toon('#d24b45'),
    handleYel: toon('#e0b12e'),
    timber: toon('#8d5e3c'),
    timberDark: toon('#5c3b28'),
    board: toon('#f2f5f6'),
    cap: toon('#1b2c44'),
    rubber: toon('#2e3438'),
    wall: toon('#e4eaee'),
    wallFar: toon('#c9d3d8'),
    dado: toon('#c5ced3'),
    steel: toon('#5c656c'),
    steelLite: toon('#d5dbdf'),
    ceiling: toon('#e7eef2'),
    clerestory: toon('#c5d6e2'),
    glass: toon('#c9e0ea', { transparent: true, opacity: 0.14, side: THREE.DoubleSide, depthWrite: false }),
    mullion: toon('#3c4650'),
    loungeWall: toon('#f4eee6'),
    wainscot: toon('#6d4630'),
    soffit: toon('#f7f1e6'),
    rug: toon('#8a3e38'),
    fixture: toon('#f4fbff', { emissive: '#d7f3ff', emissiveIntensity: 0.9 }),
    sconce: toon('#ffe6c2', { emissive: '#ffc98a', emissiveIntensity: 0.85 }),
    plank: toon('#ffffff', { map: plankTexture() }),
    slab: toon('#9aa3a8'),
    ground: toon('#d3dbe0'),
    score: toon('#ffffff', { map: scoreTexture() }),
    plate: toon('#ffffff', { map: plateTexture() }),
    brushPad: toon('#d8d2c6'),
    brushCloth: toon('#cfc6b4'),
  };
}

function disk(parent, radius, mat, x, y, z, role, segs = 64) {
  const mesh = new THREE.Mesh(new THREE.CircleGeometry(radius, segs), mat);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set(x, y, z);
  mesh.userData.role = role;
  mesh.userData.noCast = true;
  mesh.userData.noReceive = true;
  parent.add(mesh);
  return mesh;
}

function ring(parent, inner, outer, mat, x, y, z, role) {
  const mesh = new THREE.Mesh(new THREE.RingGeometry(inner, outer, 72), mat);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set(x, y, z);
  mesh.userData.role = role;
  mesh.userData.noCast = true;
  mesh.userData.noReceive = true;
  parent.add(mesh);
  return mesh;
}

function addStone(parent, mats, x, z, color, n, y) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  const bodyMat = n % 2 ? mats.granite : mats.graniteAlt;
  const body = addCyl(g, STONE.diameter / 2, STONE.diameter / 2, STONE.height, bodyMat, 0, STONE.height / 2, 0, 20, { role: 'stone' });
  body.castShadow = true;
  addCyl(g, STONE.diameter / 2 + 0.002, STONE.diameter / 2 + 0.002, 0.02, mats.band, 0, STONE.height * 0.55, 0, 20, { role: 'stone', noCast: true });
  const handle = color === 'red' ? mats.handleRed : mats.handleYel;
  const hex = color === 'red' ? '#d24b45' : '#e0b12e';
  addCyl(g, 0.012, 0.012, 0.048, handle, 0, STONE.height + 0.024, 0, 10, { role: 'stone' });
  addCyl(g, 0.046, 0.046, 0.016, handle, 0, STONE.height + 0.052, 0, 16, { role: 'stone' });
  const cap = new THREE.Mesh(new THREE.CircleGeometry(0.038, 20), toon('#ffffff', { map: numberTexture(n, hex) }));
  cap.rotation.x = -Math.PI / 2;
  cap.position.y = STONE.height + 0.061;
  cap.userData.role = 'stone';
  cap.userData.noCast = true;
  g.add(cap);
  parent.add(g);
  return g;
}

function addBrush(parent, mats, spec) {
  const g = new THREE.Group();
  g.position.set(spec.x, 0.02, spec.z);
  g.rotation.y = spec.yaw;
  g.rotation.z = spec.lean;
  addCyl(g, 0.014, 0.012, 1.28, toon(spec.color), 0, 0.78, 0, 8, { role: 'brush' });
  addBox(g, 0.22, 0.05, 0.07, mats.brushPad, 0, 0.08, 0, { role: 'brush' });
  addBox(g, 0.24, 0.018, 0.09, mats.brushCloth, 0, 0.048, 0, { role: 'brush' });
  parent.add(g);
}

function addSite(g, mats) {
  const zMid = (HALL.z0 + HALL.z1) / 2;
  addBox(g, 18, 0.08, 58, mats.ground, 1.2, -0.20, zMid, { noCast: true, noReceive: true });
  addBox(g, HALL.loungeX1 - HALL.x0 + 0.2, 0.16, HALL.z1 - HALL.z0 + 0.2, mats.slab, (HALL.x0 + HALL.loungeX1) / 2, -0.08, zMid, { noCast: true, role: 'slab' });
}

function addSideBays(g, mats, xFace, z0, z1) {
  const bay = 2.2;
  for (let z = z0 + 1.1; z < z1 - 0.8; z += bay) {
    const panelD = Math.min(bay - 0.16, z1 - 0.5 - z);
    if (panelD < 0.5) break;
    addBox(g, 0.025, 0.78, panelD, mats.clerestory, xFace + 0.02, 3.46, z + panelD / 2, { noCast: true, noReceive: true });
    addBox(g, 0.05, HALL.roofY - 0.12, 0.10, mats.dado, xFace + 0.035, (HALL.roofY - 0.12) / 2, z, { noCast: true });
  }
}

function addHall(g, mats) {
  const wallT = 0.16;
  const sideLen = HALL.z1 - HALL.z0;
  const zMid = (HALL.z0 + HALL.z1) / 2;
  const endW = HALL.x1 - HALL.x0;

  // -X wall runs the full sheet. Clerestory bays are opaque so the shell
  // does not open onto the clear colour.
  addBox(g, wallT, HALL.roofY, sideLen, mats.wall, HALL.x0 + wallT / 2, HALL.roofY / 2, zMid, { noCast: true });
  addBox(g, 0.03, 1.08, sideLen - 0.24, mats.dado, HALL.x0 + wallT + 0.015, 0.54, zMid, { noCast: true });
  addBox(g, 0.05, 0.07, sideLen, mats.steel, HALL.x0 + wallT + 0.02, HALL.roofY - 0.08, zMid, { noCast: true });
  addBox(g, 0.035, 0.045, sideLen - 1.2, mats.mullion, HALL.x0 + wallT + 0.028, 3.02, zMid, { noCast: true });
  addBox(g, 0.035, 0.045, sideLen - 1.2, mats.mullion, HALL.x0 + wallT + 0.028, 3.88, zMid, { noCast: true });
  addSideBays(g, mats, HALL.x0 + wallT, HALL.z0, HALL.z1);

  // Far end wall, with an opaque clerestory instead of a window to nothing.
  addBox(g, endW, HALL.roofY, wallT, mats.wallFar, (HALL.x0 + HALL.x1) / 2, HALL.roofY / 2, HALL.z0 + wallT / 2, { noCast: true });
  addBox(g, endW - 0.8, 0.84, 0.03, mats.clerestory, (HALL.x0 + HALL.x1) / 2, 3.55, HALL.z0 + wallT + 0.02, { noCast: true, noReceive: true });
  addBox(g, endW, 0.08, 0.08, mats.mullion, (HALL.x0 + HALL.x1) / 2, 3.05, HALL.z0 + wallT + 0.02, { noCast: true });
  addBox(g, endW - 0.3, 1.05, 0.03, mats.dado, (HALL.x0 + HALL.x1) / 2, 0.52, HALL.z0 + wallT + 0.02, { noCast: true });

  // Near end wall sits behind the home-end cameras.
  addBox(g, endW, HALL.roofY, wallT, mats.wall, (HALL.x0 + HALL.x1) / 2, HALL.roofY / 2, HALL.z1 - wallT / 2, { noCast: true });
  addBox(g, endW - 0.3, 1.08, 0.03, mats.dado, (HALL.x0 + HALL.x1) / 2, 0.54, HALL.z1 - wallT - 0.02, { noCast: true });
  addBox(g, endW - 1.2, 0.72, 0.025, mats.clerestory, (HALL.x0 + HALL.x1) / 2, 3.46, HALL.z1 - wallT - 0.02, { noCast: true, noReceive: true });
  addBox(g, endW - 0.4, 0.05, 0.04, mats.mullion, (HALL.x0 + HALL.x1) / 2, 3.05, HALL.z1 - wallT - 0.02, { noCast: true });

  // Pocket behind the lounge end glass, so that window looks at a wall.
  const bayZ0 = LOUNGE.floorZ1 + 0.2;
  const bayZ1 = HALL.z1 - wallT;
  const bayX1 = LOUNGE.floorX1 + 0.16;
  const bayLen = bayZ1 - bayZ0;
  addBox(g, bayX1 - HALL.x1, HALL.roofY, wallT, mats.loungeWall, (HALL.x1 + bayX1) / 2, HALL.roofY / 2, HALL.z1 - wallT / 2, { noCast: true });
  addBox(g, 0.12, HALL.roofY, bayLen, mats.loungeWall, bayX1, HALL.roofY / 2, (bayZ0 + bayZ1) / 2, { noCast: true });
  addBox(g, bayX1 - HALL.x1 + 0.12, 0.08, bayLen + 0.08, mats.ceiling, (HALL.x1 + bayX1) / 2, HALL.roofY, (bayZ0 + bayZ1) / 2, { noCast: true, noReceive: true });

  // Narrow +X wall along the far sheet, up to the lounge.
  const farLen = LOUNGE.floorZ0 - HALL.z0;
  addBox(g, wallT, HALL.roofY, farLen, mats.wall, HALL.x1, HALL.roofY / 2, HALL.z0 + farLen / 2, { noCast: true });
  addBox(g, 0.04, 1.05, farLen, mats.dado, HALL.x1 - 0.1, 0.52, HALL.z0 + farLen / 2, { noCast: true });

  // Roof over the whole ice hall, including the home end the cameras stand in.
  addBox(g, endW, 0.08, sideLen, mats.ceiling, (HALL.x0 + HALL.x1) / 2, HALL.roofY, zMid, { noCast: true, noReceive: true });

  // Side boards. Home -X board runs the full sheet; +X board stops where the glass curb continues.
  const boardH = 0.30;
  addBox(g, 0.08, boardH, SHEET.length, mats.board, -2.46, boardH / 2, 0, { role: 'board', noReceive: true });
  addBox(g, 0.08, 0.045, SHEET.length, mats.cap, -2.46, boardH + 0.01, 0, { noCast: true, noReceive: true });
  addBox(g, 0.08, 0.08, SHEET.length, mats.rubber, -2.46, 0.05, 0, { noCast: true, noReceive: true });
  addBox(g, 0.08, boardH, SHEET.length, mats.board, 2.50, boardH / 2, 0, { role: 'board', noReceive: true });
  addBox(g, 0.08, 0.045, SHEET.length, mats.cap, 2.50, boardH + 0.01, 0, { noCast: true, noReceive: true });
  addBox(g, 0.08, 0.08, SHEET.length, mats.rubber, 2.50, 0.05, 0, { noCast: true, noReceive: true });

  for (const s of [1, -1]) {
    const z = s * (frame().halfL + 0.05);
    addBox(g, SHEET.width + 0.16, 0.34, 0.10, mats.board, 0, 0.17, z, { role: 'board', noReceive: true });
    addBox(g, SHEET.width + 0.16, 0.045, 0.11, mats.cap, 0, 0.36, z, { noCast: true, noReceive: true });
    addBox(g, SHEET.width + 0.16, 0.08, 0.10, mats.rubber, 0, 0.05, z, { noCast: true, noReceive: true });
  }

  for (let z = -19.8; z <= 20.2; z += 4.4) {
    addTruss(g, mats, Math.round(z * 10) / 10);
  }
  for (const z of [-15.4, -6.6, 2.2, 11, 19.8]) {
    addBox(g, 3.1, 0.06, 0.16, mats.fixture, 0, 4.48, z, { noCast: true, noReceive: true, role: 'fixture' });
    addBox(g, 3.1, 0.03, 0.08, mats.steel, 0, 4.54, z, { noCast: true });
  }
}

function addTruss(g, mats, z) {
  const y0 = 4.58;
  const y1 = 4.96;
  addBox(g, 6.3, 0.05, 0.05, mats.steel, -0.2, y0, z, { noCast: true });
  addBox(g, 6.3, 0.05, 0.05, mats.steelLite, -0.2, y1, z, { noCast: true });
  for (const x of [-2.8, -1.4, 0, 1.4, 2.6]) {
    addBox(g, 0.04, y1 - y0, 0.04, mats.steel, x, (y0 + y1) / 2, z, { noCast: true });
  }
}

function addIce(g, mats) {
  const f = frame();
  const top = new THREE.Mesh(new THREE.PlaneGeometry(SHEET.width, SHEET.length), mats.ice);
  top.rotation.x = -Math.PI / 2;
  top.position.y = ICE_Y;
  top.userData.role = 'ice';
  top.userData.noCast = true;
  top.userData.noReceive = true;
  g.add(top);
  addBox(g, SHEET.width, ICE_Y, SHEET.length, mats.iceEdge, 0, ICE_Y / 2, 0, { noCast: true, noReceive: true });

  addBox(g, 1.15, 0.012, SHEET.length + 1.2, mats.apron, -2.95, 0.008, 0, { noCast: true, noReceive: true });
  addBox(g, 0.55, 0.012, SHEET.length, mats.apron, 2.74, 0.008, 0, { noCast: true, noReceive: true });
  addBox(g, SHEET.width, 0.012, 0.62, mats.apron, 0, 0.008, f.halfL + 0.36, { noCast: true, noReceive: true });
  addBox(g, SHEET.width, 0.012, 0.58, mats.apron, 0, 0.008, -f.halfL - 0.34, { noCast: true, noReceive: true });
  const walkZ0 = f.halfL + 0.12;
  const walkZ1 = HALL.z1 - 0.2;
  addBox(
    g, HALL.x1 - HALL.x0 - 0.24, 0.016, walkZ1 - walkZ0, mats.apron,
    (HALL.x0 + HALL.x1) / 2, 0.008, (walkZ0 + walkZ1) / 2,
    { noCast: true, noReceive: true },
  );
}

function addHouses(g, mats) {
  const f = frame();
  for (const s of [1, -1]) {
    const z = s * f.tee;
    ring(g, 1.219, 1.829, mats.blue, 0, ICE_Y + 0.003, z, 'house');
    ring(g, 0.610, 1.219, mats.whiteRing, 0, ICE_Y + 0.005, z, 'house');
    disk(g, 0.610, mats.red, 0, ICE_Y + 0.007, z, 'house');
    disk(g, 0.152, mats.button, 0, ICE_Y + 0.009, z, 'house');
    disk(g, 0.018, mats.hole, 0, ICE_Y + 0.011, z, 'house');
    for (const radius of SHEET.houseRadii) {
      ring(g, radius - 0.008, radius, mats.line, 0, ICE_Y + 0.012, z, 'house');
    }
  }
}

function addLines(g, mats) {
  for (const rect of lineRects()) {
    const w = rect.x1 - rect.x0;
    const d = rect.z1 - rect.z0;
    addBox(
      g, w, 0.003, d, rect.hog ? mats.hog : mats.line,
      (rect.x0 + rect.x1) / 2, ICE_Y + 0.014, (rect.z0 + rect.z1) / 2,
      { role: 'line', noCast: true, noReceive: true },
    );
  }
}

function addHacks(g, mats) {
  for (const h of hacks()) {
    addBox(
      g, h.x1 - h.x0, SHEET.hackProud, h.z1 - h.z0, mats.hack,
      (h.x0 + h.x1) / 2, ICE_Y + SHEET.hackProud / 2, (h.z0 + h.z1) / 2,
      { role: 'hack' },
    );
    addBox(
      g, (h.x1 - h.x0) * 0.78, 0.012, (h.z1 - h.z0) * 0.62, mats.steelLite,
      (h.x0 + h.x1) / 2, ICE_Y + SHEET.hackProud + 0.004, (h.z0 + h.z1) / 2,
      { role: 'hack', noCast: true, noReceive: true },
    );
  }
}

function addRacks(g, mats) {
  for (const rack of racks()) {
    addBox(g, rack.spanX, 0.045, rack.spanZ, mats.timber, rack.x, 0.03, rack.z, { role: 'rack' });
    addBox(g, rack.spanX + 0.04, 0.06, 0.04, mats.timberDark, rack.x, 0.07, rack.z - rack.spanZ / 2, { role: 'rack' });
    addBox(g, rack.spanX + 0.04, 0.06, 0.04, mats.timberDark, rack.x, 0.07, rack.z + rack.spanZ / 2, { role: 'rack' });
    addBox(g, 0.04, 0.08, rack.spanZ, mats.timberDark, rack.x - rack.spanX / 2, 0.06, rack.z, { role: 'rack' });
    addBox(g, 0.04, 0.08, rack.spanZ, mats.timberDark, rack.x + rack.spanX / 2, 0.06, rack.z, { role: 'rack' });
    for (const slot of rackSlots(rack)) {
      addStone(g, mats, slot.x, slot.z, slot.color, slot.n, 0.055);
    }
  }
  for (const stone of playedStones()) {
    addStone(g, mats, stone.x, stone.z, stone.color, stone.n, ICE_Y + 0.002);
  }
}

function addBrushes(g, mats) {
  for (const spec of brushes()) addBrush(g, mats, spec);
  addBox(g, 0.28, 0.08, 0.78, mats.timberDark, -2.95, 0.05, 21.50, { role: 'brush' });
  addBox(g, 0.28, 0.08, 0.42, mats.timberDark, -2.95, 0.05, -21.80, { role: 'brush' });
}

function addLounge(g, mats) {
  const L = LOUNGE;
  const xMid = (L.floorX0 + L.floorX1) / 2;
  const zMid = (L.floorZ0 + L.floorZ1) / 2;
  const floorW = L.floorX1 - L.floorX0;
  const floorD = L.floorZ1 - L.floorZ0;
  addBox(g, floorW, 0.16, floorD, mats.slab, xMid, 0.08, zMid, { noCast: true });
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(floorW, floorD), mats.plank);
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(xMid, L.floorY, zMid);
  floor.userData.role = 'lounge';
  floor.userData.noCast = true;
  g.add(floor);

  addBox(g, 2.05, 0.012, 2.35, mats.rug, 5.15, L.floorY + 0.008, 11.15, { noCast: true, role: 'lounge' });

  // Back wall and end walls up to the high roof, with a low warm soffit inside.
  // End walls overlap the ice-hall wall so the corner does not open onto the background.
  const endX0 = HALL.x1 - 0.04;
  const endX1 = L.floorX1 + 0.16;
  const endSpan = endX1 - endX0;
  const endX = (endX0 + endX1) / 2;
  addBox(g, 0.16, HALL.roofY, floorD + 0.16, mats.loungeWall, L.floorX1 + 0.08, HALL.roofY / 2, zMid, { noCast: true });
  addBox(g, 0.08, 0.94, floorD, mats.wainscot, L.floorX1 - 0.02, L.floorY + 0.47, zMid, { noCast: true });
  addBox(g, endSpan, HALL.roofY, 0.16, mats.loungeWall, endX, HALL.roofY / 2, L.floorZ0 - 0.08, { noCast: true });
  addBox(g, endSpan, HALL.roofY, 0.16, mats.loungeWall, endX, HALL.roofY / 2, L.floorZ1 + 0.08, { noCast: true });
  addBox(g, 0.9, 0.7, 0.04, mats.glass, 4.7, 1.7, L.floorZ1 + 0.02, { noCast: true, noReceive: true });
  addBox(g, 1.02, 0.08, 0.06, mats.mullion, 4.7, 2.08, L.floorZ1 + 0.04, { noCast: true });
  addBox(g, 1.02, 0.08, 0.06, mats.mullion, 4.7, 1.32, L.floorZ1 + 0.04, { noCast: true });
  addBox(g, floorW, 0.08, floorD, mats.soffit, xMid, L.soffitY, zMid, { noCast: true, noReceive: true });
  const roofW = L.floorX1 - HALL.x1 + 0.4;
  addBox(g, roofW, 0.08, floorD + 0.4, mats.ceiling, HALL.x1 - 0.2 + roofW / 2, HALL.roofY, zMid, { noCast: true, noReceive: true });

  addGlass(g, mats, L.floorZ0, L.doorZ0);
  addGlass(g, mats, L.doorZ1, L.floorZ1);
  addBox(g, 0.08, 2.25, 0.08, mats.mullion, L.glassX, 1.28, L.doorZ0, { role: 'lounge' });
  addBox(g, 0.08, 2.25, 0.08, mats.mullion, L.glassX, 1.28, L.doorZ1, { role: 'lounge' });
  addBox(g, 0.08, 0.08, L.doorZ1 - L.doorZ0, mats.mullion, L.glassX, 2.38, (L.doorZ0 + L.doorZ1) / 2, { noCast: true });

  addBox(g, 0.28, 0.08, 0.42, mats.timber, 2.78, 0.06, L.doorZ0 + 0.15, { role: 'lounge' });
  addBox(g, 0.28, 0.08, 0.42, mats.timber, 2.92, 0.14, L.doorZ0 + 0.15, { role: 'lounge' });

  addBox(g, 0.36, 0.045, 0.9, mats.timber, 6.05, 1.02, 14.70, { role: 'lounge' });
  for (const z of [10.15, 10.45, 10.75, 11.05]) {
    addCyl(g, 0.02, 0.02, 0.06, mats.steel, 6.18, 1.55, z, 8, { role: 'lounge', noCast: true });
  }
  addBox(g, 0.08, 0.22, 0.16, mats.sconce, 6.16, 1.85, 15.8, { noCast: true, role: 'fixture' });
  addBox(g, 0.08, 0.22, 0.16, mats.sconce, 6.16, 1.85, 19.4, { noCast: true, role: 'fixture' });
}

function addGlass(g, mats, z0, z1) {
  const step = 1.4;
  let z = z0;
  while (z < z1 - 0.04) {
    const nz = Math.min(z1, z + step);
    const mid = (z + nz) / 2;
    const span = nz - z - 0.06;
    if (span > 0.05) {
      addBox(g, 0.02, 2.05, span, mats.glass, LOUNGE.glassX, 1.32, mid, { noCast: true, noReceive: true, role: 'glass' });
    }
    addBox(g, 0.055, 2.2, 0.055, mats.mullion, LOUNGE.glassX, 1.28, nz, { role: 'lounge' });
    z = nz;
  }
}

function addBoardFace(g, mats, s, z, rotY) {
  const board = new THREE.Mesh(new THREE.PlaneGeometry(s.w, s.h), mats.score);
  board.position.set(s.x, s.y, z);
  board.rotation.y = rotY;
  board.userData.role = 'scoreboard';
  board.userData.noCast = true;
  board.userData.noReceive = true;
  g.add(board);
}

function addScoreboards(g, mats, layout) {
  const signs = layout.signage;
  for (const key of ['near', 'far']) {
    const s = signs[key];
    addBoardFace(g, mats, s, s.z + 0.012, 0);
    addBoardFace(g, mats, s, s.z - 0.012, Math.PI);
    addBox(g, s.w + 0.05, 0.03, 0.04, mats.timberDark, s.x, s.y + s.h / 2, s.z, { noCast: true, noReceive: true, role: 'scoreboard' });
    addBox(g, s.w + 0.05, 0.03, 0.04, mats.timberDark, s.x, s.y - s.h / 2, s.z, { noCast: true, noReceive: true, role: 'scoreboard' });
    addBox(g, 0.03, s.h, 0.04, mats.timberDark, s.x - s.w / 2, s.y, s.z, { noCast: true, noReceive: true, role: 'scoreboard' });
    addBox(g, 0.03, s.h, 0.04, mats.timberDark, s.x + s.w / 2, s.y, s.z, { noCast: true, noReceive: true, role: 'scoreboard' });
  }
  const near = signs.near;
  const drop = HALL.roofY - (near.y + near.h / 2);
  addCyl(g, 0.01, 0.01, drop, mats.steel, near.x - near.w * 0.42, near.y + near.h / 2 + drop / 2, near.z, 8, { noCast: true, noReceive: true });
  addCyl(g, 0.01, 0.01, drop, mats.steel, near.x + near.w * 0.42, near.y + near.h / 2 + drop / 2, near.z, 8, { noCast: true, noReceive: true });
  const plate = signs.plate;
  const p = new THREE.Mesh(new THREE.PlaneGeometry(plate.w, plate.h), mats.plate);
  p.position.set(plate.x, plate.y, plate.z);
  p.rotation.y = Math.PI / 2;
  p.userData.role = 'plate';
  p.userData.noCast = true;
  g.add(p);
}

function addBlobs(g, layout) {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  const grd = ctx.createRadialGradient(64, 64, 8, 64, 64, 62);
  grd.addColorStop(0, 'rgba(0,0,0,0.55)');
  grd.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.NoColorSpace;
  const mat = new THREE.MeshBasicMaterial({
    map: tex, transparent: true, opacity: 0.32, depthWrite: false, color: 0x1a1612,
  });
  function blob(x, z, w, d, y) {
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, d), mat);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(x, y, z);
    mesh.userData.keepMaterial = true;
    mesh.userData.noCast = true;
    mesh.userData.noReceive = true;
    mesh.renderOrder = 2;
    g.add(mesh);
  }
  for (const rack of racks()) blob(rack.x, rack.z, rack.spanX * 0.9, rack.spanZ * 0.85, ICE_Y + 0.004);
  for (const stone of playedStones()) blob(stone.x, stone.z, 0.34, 0.30, ICE_Y + 0.004);
  for (const inst of layout.instances || []) {
    if (inst.position[1] > 0.5) continue;
    const [fw, fd] = inst.footprint || [0.4, 0.4];
    const swap = Math.abs(Math.sin(inst.rotationY || 0)) > 0.5;
    blob(inst.position[0], inst.position[2], (swap ? fd : fw) * 0.85, (swap ? fw : fd) * 0.8, inst.position[1] + 0.008);
  }
}

export function addShrub(prepared) {
  const leaf = ['#2f6a3c', '#3d7d48', '#245433'];
  const spots = [[0, 0.50, 0, 0.16], [0.08, 0.60, 0.04, 0.12], [-0.07, 0.58, -0.03, 0.11]];
  for (let i = 0; i < spots.length; i++) {
    const [x, y, z, r] = spots[i];
    addSphere(prepared, r, toon(leaf[i]), x, y, z, 12, { noCast: true });
  }
}

export function makeWorld(layout) {
  const g = new THREE.Group();
  g.name = 'curling';
  const mats = makeMats();
  addSite(g, mats);
  addHall(g, mats);
  addIce(g, mats);
  addHouses(g, mats);
  addLines(g, mats);
  addHacks(g, mats);
  addRacks(g, mats);
  addBrushes(g, mats);
  addLounge(g, mats, layout);
  addScoreboards(g, mats, layout);
  addBlobs(g, layout);
  return g;
}

boot({
  readyText: 'ready — sheet 2 · drag orbit · U unlit · T toon',
  makeShell: makeWorld,
  decoratePrototype(kind, prepared) {
    if (kind === 'flowerpot') addShrub(prepared);
  },
});
