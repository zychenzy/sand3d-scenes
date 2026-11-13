import * as THREE from 'three';
import { boot, toon, addBox, addCyl, canvasTexture } from './scene_lib.js';

const WALL_T = 0.16;

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rand = mulberry32(20261113);

function roomOf(layout) {
  const { width: W, depth: D, height: H } = layout.meta.room;
  return { W, D, H, xWall: -W / 2, zWall: -D / 2 };
}

function zone(layout, id) {
  return layout.zones.find((z) => z.id === id);
}

function findInst(layout, id) {
  return layout.instances.find((i) => i.id === id);
}

function cacheCanvas(store, key, build) {
  if (!store.has(key)) store.set(key, canvasTexture(build()));
  return store.get(key);
}

const sheets = new Map();
const labels = new Map();

function floorTexture() {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 512;
  const g = c.getContext('2d');
  const boards = 16;
  const bw = c.width / boards;
  for (let i = 0; i < boards; i++) {
    const tone = 118 + (i % 5) * 7 + Math.floor(rand() * 10);
    g.fillStyle = `rgb(${tone + 28}, ${Math.floor(tone * 0.62)}, ${Math.floor(tone * 0.32)})`;
    g.fillRect(i * bw, 0, bw + 0.5, c.height);
    g.fillStyle = `rgba(60, 36, 18, ${0.18 + rand() * 0.12})`;
    g.fillRect(i * bw, 0, 2, c.height);
    if (rand() > 0.45) {
      g.fillStyle = `rgba(90, 58, 30, ${0.25 + rand() * 0.3})`;
      g.beginPath();
      g.ellipse(i * bw + bw * 0.5, rand() * c.height, 7 + rand() * 8, 3 + rand() * 3, rand(), 0, Math.PI * 2);
      g.fill();
    }
  }
  return c;
}

function plasterTexture() {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = '#e6e1d8';
  g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 700; i++) {
    const v = 190 + Math.floor(rand() * 40);
    g.fillStyle = `rgba(${v}, ${v - 6}, ${v - 14}, 0.18)`;
    g.fillRect(rand() * 256, rand() * 256, 2 + rand() * 3, 2 + rand() * 3);
  }
  return c;
}

function tileTexture() {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = '#8d9290';
  g.fillRect(0, 0, 256, 256);
  const n = 4;
  const s = 256 / n;
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      const v = 176 + ((x + y) % 3) * 8;
      g.fillStyle = `rgb(${v}, ${v + 2}, ${v - 4})`;
      g.fillRect(x * s + 3, y * s + 3, s - 6, s - 6);
    }
  }
  return c;
}

function stainTexture() {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = '#ffffff';
  g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 90; i++) {
    g.fillStyle = `rgba(30, 24, 18, ${0.35 + rand() * 0.45})`;
    g.beginPath();
    g.ellipse(rand() * 256, rand() * 256, 1 + rand() * 5, 1 + rand() * 3, rand() * 3, 0, Math.PI * 2);
    g.fill();
  }
  return c;
}

function labelTexture(text) {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 64;
  const g = c.getContext('2d');
  g.fillStyle = '#f4efe4';
  g.fillRect(0, 0, 256, 64);
  g.strokeStyle = '#2c2824';
  g.lineWidth = 4;
  g.strokeRect(3, 3, 250, 58);
  g.fillStyle = '#2c2824';
  g.font = '600 28px sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(text, 128, 34);
  return c;
}

function chalkTexture() {
  const c = document.createElement('canvas');
  c.width = 768;
  c.height = 448;
  const g = c.getContext('2d');
  g.fillStyle = '#243028';
  g.fillRect(0, 0, 768, 448);
  g.strokeStyle = 'rgba(236, 226, 200, 0.16)';
  g.lineWidth = 2;
  for (let i = 0; i < 8; i++) {
    g.beginPath();
    g.moveTo(40, 70 + i * 44);
    g.lineTo(700, 66 + i * 44 + (i % 2) * 4);
    g.stroke();
  }
  g.fillStyle = '#f3ecdf';
  g.font = '600 46px sans-serif';
  g.textAlign = 'left';
  g.fillText('EDITION   30', 46, 72);
  g.font = '28px sans-serif';
  const lines = [
    'BFK Rives  250g     22 × 30',
    'BAT                signed',
    '1 – 12             printed',
    '13 – 20            drying',
    'AP   3',
    'plate   18 × 24 cm   bone black',
  ];
  lines.forEach((line, i) => g.fillText(line, 46, 140 + i * 46));
  return c;
}

function plateTone(g, x, y, w, h) {
  g.fillStyle = '#e4d8c4';
  g.fillRect(x, y, w, h);
  g.strokeStyle = '#cbbda6';
  g.lineWidth = 5;
  g.strokeRect(x, y, w, h);
  g.strokeStyle = '#1c1916';
  g.lineWidth = 1.5;
}

function hatch(g, x, y, w, h, gap, angle) {
  g.save();
  g.beginPath();
  g.rect(x, y, w, h);
  g.clip();
  g.translate(x + w / 2, y + h / 2);
  g.rotate(angle);
  const span = w + h;
  for (let i = -span; i < span; i += gap) {
    g.beginPath();
    g.moveTo(i, -span);
    g.lineTo(i, span);
    g.stroke();
  }
  g.restore();
}

function drawSheet(kind) {
  const c = document.createElement('canvas');
  c.width = 384;
  c.height = 512;
  const g = c.getContext('2d');
  const papers = {
    roofs: '#f7f1e4',
    bridge: '#f3ead8',
    profile: '#f6f0e6',
    botanical: '#f4efe2',
    hands: '#f8f3e8',
    hatch: '#efe4d0',
    proof: '#f3ecdf',
  };
  g.fillStyle = papers[kind] || '#f6f1e6';
  g.fillRect(0, 0, 384, 512);
  const px = 36;
  const py = 48;
  const pw = 312;
  const ph = 390;
  plateTone(g, px, py, pw, ph);
  g.strokeStyle = '#1c1916';
  g.fillStyle = '#1c1916';
  g.lineWidth = 3.2;
  if (kind === 'roofs') {
    for (let i = 0; i < 7; i++) {
      const bh = 40 + (i % 4) * 28;
      const bx = px + 16 + i * 40;
      g.strokeRect(bx, py + ph - 30 - bh, 34, bh);
      hatch(g, bx + 2, py + ph - 28 - bh, 30, bh - 4, 5, 0.7);
      g.fillRect(bx + 8, py + ph - 70, 6, 10);
      g.fillRect(bx + 18, py + ph - 88, 6, 10);
    }
    g.beginPath();
    g.moveTo(px + 10, py + 70);
    g.lineTo(px + pw - 10, py + 48);
    g.stroke();
  } else if (kind === 'bridge') {
    g.beginPath();
    g.arc(px + pw / 2, py + ph * 0.62, 90, Math.PI, 0);
    g.stroke();
    hatch(g, px + 20, py + ph * 0.55, pw - 40, 70, 6, -0.4);
    for (let i = 0; i < 9; i++) {
      g.beginPath();
      g.moveTo(px + 18, py + ph * 0.72 + i * 12);
      g.bezierCurveTo(px + 100, py + ph * 0.7 + i * 14, px + 200, py + ph * 0.78 + i * 8, px + pw - 16, py + ph * 0.7 + i * 11);
      g.stroke();
    }
    g.strokeRect(px + pw / 2 - 8, py + 80, 16, ph * 0.62 - 80);
  } else if (kind === 'profile') {
    g.beginPath();
    g.moveTo(px + 150, py + 70);
    g.bezierCurveTo(px + 230, py + 80, px + 250, py + 150, px + 210, py + 180);
    g.bezierCurveTo(px + 250, py + 200, px + 230, py + 250, px + 170, py + 270);
    g.bezierCurveTo(px + 120, py + 250, px + 130, py + 180, px + 150, py + 150);
    g.bezierCurveTo(px + 110, py + 120, px + 110, py + 80, px + 150, py + 70);
    g.stroke();
    hatch(g, px + 150, py + 90, 90, 160, 5, 0.6);
    g.beginPath();
    g.arc(px + 188, py + 130, 4, 0, Math.PI * 2);
    g.stroke();
  } else if (kind === 'botanical') {
    g.beginPath();
    g.moveTo(px + pw / 2, py + ph - 30);
    g.quadraticCurveTo(px + pw / 2 + 10, py + 180, px + pw / 2 - 8, py + 60);
    g.stroke();
    const leaves = [[-70, 180, 1], [60, 150, -1], [-50, 110, 0.6], [46, 80, -0.8]];
    for (const [ox, oy, s] of leaves) {
      g.beginPath();
      g.ellipse(px + pw / 2 + ox, py + oy, 46, 16, s, 0, Math.PI * 2);
      g.stroke();
      hatch(g, px + pw / 2 + ox - 40, py + oy - 18, 80, 36, 4, s);
    }
  } else if (kind === 'hands') {
    g.lineWidth = 1.8;
    for (let i = 0; i < 4; i++) {
      g.beginPath();
      g.moveTo(px + 80 + i * 28, py + ph - 40);
      g.quadraticCurveTo(px + 70 + i * 30, py + 160, px + 96 + i * 26, py + 80);
      g.stroke();
    }
    g.strokeRect(px + 70, py + ph - 80, 150, 40);
    hatch(g, px + 74, py + ph - 76, 142, 32, 5, 0.9);
  } else if (kind === 'hatch') {
    hatch(g, px + 16, py + 16, pw - 32, ph - 32, 7, 0.5);
    hatch(g, px + 16, py + 16, pw - 32, ph - 32, 7, -0.5);
    g.strokeRect(px + 70, py + 90, 160, 200);
  } else {
    g.beginPath();
    g.moveTo(px + 20, py + ph * 0.7);
    g.lineTo(px + 90, py + ph * 0.42);
    g.lineTo(px + 150, py + ph * 0.58);
    g.lineTo(px + 230, py + ph * 0.28);
    g.lineTo(px + pw - 16, py + ph * 0.5);
    g.stroke();
    hatch(g, px + 16, py + ph * 0.55, pw - 32, ph * 0.35, 6, 0.15);
  }
  g.fillStyle = '#4a433a';
  g.font = '20px serif';
  g.fillText(kind === 'hatch' ? 'AP' : '2/30', 40, 486);
  return c;
}

const tex = {
  floor: canvasTexture(floorTexture(), true),
  plaster: canvasTexture(plasterTexture(), true),
  tile: canvasTexture(tileTexture(), true),
  stain: canvasTexture(stainTexture()),
  chalk: canvasTexture(chalkTexture()),
};
tex.floor.repeat.set(8, 6);
tex.plaster.repeat.set(3, 2);
tex.tile.repeat.set(3, 2);

function sheet(kind) {
  return cacheCanvas(sheets, kind, () => drawSheet(kind));
}
function label(text) {
  return cacheCanvas(labels, text, () => labelTexture(text));
}

function makeShell(layout) {
  const g = new THREE.Group();
  g.name = 'shell';
  const { W, D, H, xWall, zWall } = roomOf(layout);
  const plasterL = toon('#e7e2d8', { map: tex.plaster });
  const plasterB = toon('#ddd6cc', { map: tex.plaster });
  const plasterR = toon('#d9d2c6', { map: tex.plaster });
  const wain = toon('#6a5e4c');
  const wood = toon('#5c4634');
  const trim = toon('#7a6248');

  const skirt = toon('#5a4030');
  addBox(g, W, 0.08, D, skirt, 0, -0.04, 0);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(W, D), toon('#ffffff', { map: tex.floor }));
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = 0.004;
  floor.receiveShadow = true;
  g.add(floor);

  addBox(g, W, H, WALL_T, plasterB, 0, H / 2, zWall);
  addBox(g, WALL_T, H, D, plasterR, -xWall, H / 2, 0);
  buildLeftWall(g, layout, plasterL);

  const wainH = 1.06;
  const wainT = 0.035;
  addBox(g, W - 0.3, wainH, wainT, wain, 0, wainH / 2, zWall + WALL_T / 2 + 0.01);
  addBox(g, wainT, wainH, D - 0.3, wain, xWall + WALL_T / 2 + 0.01, wainH / 2, 0.1);
  addBox(g, wainT, wainH, D - 0.3, wain, -xWall - WALL_T / 2 - 0.01, wainH / 2, 0.1);
  addBox(g, W - 0.2, 0.08, 0.06, trim, 0, 0.04, zWall + 0.08);
  addBox(g, 0.06, 0.08, D - 0.2, trim, xWall + 0.08, 0.04, 0);
  addBox(g, 0.06, 0.08, D - 0.2, trim, -xWall - 0.08, 0.04, 0);

  addBox(g, 0.28, H, 0.18, plasterL, xWall + 0.22, H / 2, D / 2 - 0.08);
  addBox(g, 0.28, H, 0.18, plasterR, -xWall - 0.22, H / 2, D / 2 - 0.08);

  const soffit = toon('#f3f0ea');
  const soffitMesh = addBox(g, W * 0.86, 0.06, D * 0.58, soffit, -0.2, H - 0.04, -D * 0.22);
  soffitMesh.castShadow = false;
  soffitMesh.userData.noShadow = true;
  for (const z of [-3.3, -1.7, 0.15, 1.65]) {
    addBox(g, W * 0.82, 0.16, 0.1, wood, -0.15, H - 0.22, z);
  }
  addBox(g, W * 0.84, 0.2, 0.14, wood, -0.15, H - 0.24, 0.55);

  const pipe = toon('#4e565c');
  addCyl(g, 0.025, 0.025, W * 0.7, pipe, -0.2, H - 0.38, -2.35, 8, [0, 0, Math.PI / 2]);
  addCyl(g, 0.02, 0.02, 0.7, pipe, -0.85, H - 0.7, -1.35, 8);

  const housing = toon('#2f353b');
  addBox(g, 1.05, 0.06, 0.22, housing, -0.85, 3.22, -1.35);
  const tube = addBox(g, 0.86, 0.03, 0.07, toon('#f4f7ff', { emissive: '#f7f9ff', emissiveIntensity: 0.85 }), -0.85, 3.17, -1.35);
  tube.castShadow = false;

  const sky = new THREE.Mesh(
    new THREE.PlaneGeometry(D * 0.96, H * 1.05),
    new THREE.MeshBasicMaterial({ color: '#d5e3ee', side: THREE.DoubleSide }),
  );
  sky.position.set(xWall - 0.55, H * 0.55, 0.2);
  sky.rotation.y = Math.PI / 2;
  sky.userData.keepBasic = true;
  sky.userData.noShadow = true;
  sky.userData.noReceive = true;
  g.add(sky);

  return g;
}

function buildLeftWall(g, layout, plaster) {
  const { D, H, xWall } = roomOf(layout);
  const sill = 1.88;
  const head = 3.22;
  const bays = [[-3.15, -1.05], [-0.25, 2.25]];
  const z0 = -D / 2;
  const z1 = D / 2;
  const frame = toon('#efeae2');
  const mullion = toon('#d9d3c8');
  addBox(g, WALL_T, sill, D, plaster, xWall, sill / 2, 0);
  addBox(g, WALL_T, H - head, D, plaster, xWall, (H + head) / 2, 0);
  addBox(g, WALL_T, head - sill, bays[0][0] - z0, plaster, xWall, (sill + head) / 2, (z0 + bays[0][0]) / 2);
  addBox(g, WALL_T, head - sill, z1 - bays[1][1], plaster, xWall, (sill + head) / 2, (z1 + bays[1][1]) / 2);
  addBox(g, WALL_T, head - sill, bays[1][0] - bays[0][1], plaster, xWall, (sill + head) / 2, (bays[0][1] + bays[1][0]) / 2);

  bays.forEach(([a, b], index) => {
    const midY = (sill + head) / 2;
    const h = head - sill;
    addBox(g, 0.05, h, 0.05, frame, xWall + 0.02, midY, a);
    addBox(g, 0.05, h, 0.05, frame, xWall + 0.02, midY, b);
    addBox(g, 0.06, 0.05, b - a, frame, xWall + 0.02, head, (a + b) / 2);
    addBox(g, 0.1, 0.06, b - a, frame, xWall + 0.06, sill, (a + b) / 2);
    for (let c = 1; c < 4; c++) {
      const z = a + ((b - a) * c) / 4;
      addBox(g, 0.03, h - 0.08, 0.028, mullion, xWall, midY, z);
    }
    const glass = new THREE.Mesh(
      new THREE.PlaneGeometry(b - a - 0.08, h - 0.1),
      new THREE.MeshBasicMaterial({
        color: '#f4f8fb', transparent: true, opacity: 0.16, side: THREE.DoubleSide, depthWrite: false,
      }),
    );
    glass.position.set(xWall - 0.02, midY, (a + b) / 2);
    glass.rotation.y = Math.PI / 2;
    glass.userData.keepBasic = true;
    glass.userData.noShadow = true;
    glass.userData.noReceive = true;
    g.add(glass);
    if (index === 1) {
      addBox(g, 0.02, h * 0.34, b - a - 0.12, toon('#efe6d4'), xWall + 0.03, head - h * 0.2, (a + b) / 2);
    }
  });

  const radZ = 1.15;
  addBox(g, 0.1, 0.42, 1.15, frame, xWall + 0.12, 0.24, radZ);
  for (let i = 0; i < 8; i++) {
    addBox(g, 0.02, 0.34, 0.012, toon('#f4f1ea'), xWall + 0.16, 0.24, radZ - 0.48 + i * 0.14);
  }
}

function addDecal(parent, w, d, x, z) {
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(w, d),
    new THREE.MeshBasicMaterial({
      map: tex.stain,
      transparent: true,
      depthWrite: false,
      blending: THREE.MultiplyBlending,
    }),
  );
  m.rotation.x = -Math.PI / 2;
  m.rotation.z = rand() * 0.4;
  m.position.set(x, 0.01, z);
  m.userData.keepBasic = true;
  m.userData.noShadow = true;
  m.userData.noReceive = true;
  m.renderOrder = 3;
  parent.add(m);
}

function addSheetMesh(parent, w, h, map, x, y, z, rot) {
  const grp = new THREE.Group();
  grp.position.set(x, y, z);
  if (rot) grp.rotation.set(rot[0] || 0, rot[1] || 0, rot[2] || 0);
  const face = addBox(grp, w, h, 0.004, toon('#f7f1e6', { map }), 0, 0, 0.004);
  face.castShadow = true;
  addBox(grp, w, h, 0.004, toon('#e6dcc8'), 0, 0, -0.002);
  parent.add(grp);
  return grp;
}

function addClip(parent, x, y, z) {
  addBox(parent, 0.035, 0.045, 0.012, toon('#2a2e32'), x, y, z);
}

function buildPress(g, layout) {
  const p = layout.stations.press;
  const grp = new THREE.Group();
  grp.name = 'press';
  grp.position.set(p.x, 0, p.z);
  const iron = toon('#556068');
  const ironDark = toon('#3e474e');
  const steel = toon('#a7b0b6');
  const bedCol = toon('#9aa3aa');
  const brass = toon('#b08a45');
  const feltA = toon('#4e4741');
  const feltB = toon('#cfc4b2');
  const feltC = toon('#8a8176');

  addBox(grp, 1.2, 0.02, 1.15, toon('#6a7076'), 0, 0.01, 0.05);

  for (const z of [-0.48, 0.48]) {
    for (const x of [-0.32, 0.32]) {
      addBox(grp, 0.08, 1.16, 0.08, iron, x, 0.6, z);
    }
    addBox(grp, 0.78, 0.09, 0.09, ironDark, 0, 1.16, z);
    addBox(grp, 0.78, 0.08, 0.1, ironDark, 0, 0.08, z);
    addBox(grp, 0.14, 0.06, 0.22, iron, 0, 0.04, z);
  }
  addBox(grp, 0.1, 0.08, 1.05, ironDark, 0, 1.18, 0);
  addCyl(grp, 0.028, 0.028, 0.1, brass, -0.16, 1.26, 0, 10);
  addCyl(grp, 0.028, 0.028, 0.1, brass, 0.16, 1.26, 0, 10);
  addBox(grp, 0.09, 0.015, 0.015, brass, -0.16, 1.32, 0);
  addBox(grp, 0.09, 0.015, 0.015, brass, 0.16, 1.32, 0);

  addCyl(grp, 0.085, 0.085, 0.82, steel, 0, 0.7, 0, 20, [Math.PI / 2, 0, 0]);
  addCyl(grp, 0.11, 0.11, 0.78, iron, 0, 1.0, 0, 22, [Math.PI / 2, 0, 0]);

  addBox(grp, 2.5, 0.055, 0.08, ironDark, -0.32, 0.74, 0.22);
  addBox(grp, 2.5, 0.055, 0.08, ironDark, -0.32, 0.74, -0.22);
  for (const x of [-1.25, -0.55, 0.25, 0.85]) {
    addBox(grp, 0.06, 0.05, 0.52, iron, x, 0.72, 0);
  }
  addBox(grp, 2.5, 0.045, 0.74, bedCol, -0.32, 0.8, 0);
  addBox(grp, 2.5, 0.012, 0.03, ironDark, -0.32, 0.778, 0.37);
  addBox(grp, 2.5, 0.012, 0.03, ironDark, -0.32, 0.778, -0.37);
  addBox(grp, 0.7, 0.02, 0.62, ironDark, 0, 0.28, 0);
  addBox(grp, 0.42, 0.06, 0.32, toon('#efe6d4'), -0.05, 0.33, 0);
  addBox(grp, 0.38, 0.045, 0.28, toon('#d9d0c2'), 0.02, 0.38, 0.02);

  const wheelZ = 0.62;
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.47, 0.02, 8, 36), iron);
  rim.position.set(0, 1.0, wheelZ);
  rim.castShadow = true;
  grp.add(rim);
  addCyl(grp, 0.07, 0.07, 0.08, ironDark, 0, 1.0, wheelZ, 14, [Math.PI / 2, 0, 0]);
  addCyl(grp, 0.1, 0.1, 0.04, toon('#5c656c'), 0, 1.0, 0.52, 12, [Math.PI / 2, 0, 0]);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + 0.2;
    const len = 0.36;
    addBox(grp, len, 0.032, 0.028, iron, Math.cos(a) * len * 0.5, 1.0 + Math.sin(a) * len * 0.5, wheelZ, [0, 0, a]);
  }
  const ha = -0.85;
  addCyl(grp, 0.02, 0.02, 0.11, brass, Math.cos(ha) * 0.47, 1.0 + Math.sin(ha) * 0.47, wheelZ + 0.07, 8, [Math.PI / 2, 0, 0]);
  addCyl(grp, 0.028, 0.028, 0.04, brass, Math.cos(ha) * 0.47, 1.0 + Math.sin(ha) * 0.47, wheelZ + 0.12, 8, [Math.PI / 2, 0, 0]);

  addBox(grp, 0.85, 0.014, 0.66, feltA, 0.04, 0.832, 0);
  addBox(grp, 0.95, 0.032, 0.66, feltB, 0.0, 0.856, 0);
  addBox(grp, 0.7, 0.012, 0.62, feltC, 0.08, 0.878, 0);
  addBox(grp, 0.22, 0.2, 0.025, feltB, 0.32, 0.74, 0.4, [0.7, 0.15, 0]);

  addBox(grp, 0.36, 0.008, 0.28, toon('#8a5a38'), -0.82, 0.828, 0.02);
  addBox(grp, 0.32, 0.006, 0.24, toon('#d4894e'), -0.82, 0.834, 0.02);
  const proof = new THREE.Mesh(new THREE.PlaneGeometry(0.46, 0.36), toon('#f6f1e6', { map: sheet('proof') }));
  proof.rotation.x = -Math.PI / 2;
  proof.position.set(-0.8, 0.846, 0.02);
  proof.receiveShadow = true;
  grp.add(proof);
  addBox(grp, 0.045, 0.004, 0.028, toon('#e6d7a8'), -0.98, 0.848, 0.16);
  addBox(grp, 0.045, 0.004, 0.028, toon('#e6d7a8'), -0.98, 0.848, -0.12);

  addBox(grp, 0.9, 0.012, 0.7, toon('#2c3136'), 0.05, 0.012, 0.72);
  g.add(grp);
}

function buildInkSlab(g, layout) {
  const table = findInst(layout, 'inking_table');
  const glass = layout.stations.ink.glass;
  const top = layout.stations.ink.top;
  const stone = toon('#b7c2be');
  const edge = toon('#3e4644');
  addBox(g, glass.w, 0.028, glass.d, stone, glass.x, top + 0.016, glass.z);
  addBox(g, glass.w + 0.02, 0.012, 0.015, edge, glass.x, top + 0.02, glass.z + glass.d / 2);
  addBox(g, glass.w + 0.02, 0.012, 0.015, edge, glass.x, top + 0.02, glass.z - glass.d / 2);
  addBox(g, 0.62, 0.006, 0.32, toon('#121416'), glass.x - 0.02, top + 0.034, glass.z + 0.02);
  addBox(g, 0.5, 0.004, 0.03, toon('#3a3e42'), glass.x - 0.02, top + 0.04, glass.z + 0.02);

  addBrayer(g, glass.x - 0.02, top + 0.09, glass.z + 0.02, 0.26, 0.05, 0.35, '#1a1c1e');
  addBrayer(g, glass.x + 0.28, top + 0.07, glass.z - 0.1, 0.16, 0.035, -0.5, '#24282c');
  addBrayer(g, table.position[0] + 0.55, top + 0.065, table.position[2] + 0.28, 0.12, 0.028, 1.1, '#2a2420');

  addBox(g, 0.16, 0.006, 0.012, toon('#c0c4c6'), glass.x + 0.18, top + 0.028, glass.z - 0.08, [0, 0.4, 0]);
  addBox(g, 0.012, 0.006, 0.14, toon('#b8b0a4'), glass.x - 0.28, top + 0.028, glass.z + 0.12, [0, -0.3, 0]);
  addBox(g, 0.1, 0.02, 0.08, toon('#d8d2c6'), glass.x + 0.34, top + 0.03, glass.z + 0.16, [0.4, 0.2, 0.3]);
  addBox(g, 0.16, 0.008, 0.12, toon('#efe6d4'), glass.x - 0.34, top + 0.026, glass.z - 0.02);
  addBox(g, 0.06, 0.004, 0.04, toon('#1a1c1e'), glass.x - 0.3, top + 0.032, glass.z);

  const hx = 2.82;
  const hz = -1.62;
  addBox(g, 0.24, 0.025, 0.2, toon('#2a2e32'), hx, top + 0.02, hz);
  addCyl(g, 0.07, 0.07, 0.008, toon('#5a4038', { emissive: '#6a4030', emissiveIntensity: 0.25 }), hx, top + 0.036, hz, 16);
}

function addBrayer(parent, x, y, z, len, rad, rotY, rubber) {
  const grp = new THREE.Group();
  grp.position.set(x, y, z);
  grp.rotation.y = rotY;
  addCyl(grp, rad, rad, len, toon(rubber), 0, 0, 0, 16, [0, 0, Math.PI / 2]);
  const metal = toon('#8d9498');
  const wood = toon('#8a6244');
  addBox(grp, 0.012, rad * 2.2, 0.012, metal, -len / 2 - 0.01, rad * 0.5, 0);
  addBox(grp, 0.012, rad * 2.2, 0.012, metal, len / 2 + 0.01, rad * 0.5, 0);
  addBox(grp, len + 0.04, 0.012, 0.012, metal, 0, rad * 1.6, 0);
  addCyl(grp, 0.011, 0.012, 0.14, wood, 0, rad * 1.6 + 0.06, 0.03, 8, [0.7, 0, 0]);
  parent.add(grp);
}

function buildPaperTable(g, layout) {
  const t = findInst(layout, 'paper_table');
  const y = 0.76;
  const x = t.position[0];
  const z = t.position[2];
  const steel = toon('#c5cbcf');
  const water = toon('#8aa0a8');
  addBox(g, 0.62, 0.05, 0.46, steel, x - 0.15, y + 0.03, z + 0.02);
  addBox(g, 0.54, 0.02, 0.38, water, x - 0.15, y + 0.045, z + 0.02);
  const sheetsY = [0.008, 0.02, 0.032, 0.044];
  const tones = ['#f7f1e4', '#efe4d0', '#f3eadc', '#e7dcc8'];
  sheetsY.forEach((dy, i) => {
    addBox(g, 0.48, 0.008, 0.36, toon(tones[i]), x - 0.62, y + dy, z - 0.08, [0, -0.04 + i * 0.03, 0]);
  });
  addBox(g, 0.42, 0.008, 0.32, toon('#f7f1e4'), x - 0.55, y + 0.06, z + 0.16, [0, 0.15, 0]);
  addBox(g, 0.18, 0.006, 0.32, toon('#f3eadc'), x - 0.28, y + 0.066, z + 0.2, [0, 0.4, 0]);
  addBox(g, 0.16, 0.008, 0.012, toon('#e6dcc4'), x - 0.5, y + 0.07, z + 0.02, [0, 0.2, 0.4]);

  const gx = x + 0.62;
  const gz = z + 0.08;
  addBox(g, 0.4, 0.035, 0.3, toon('#6b4e38'), gx, y + 0.02, gz);
  addBox(g, 0.36, 0.012, 0.012, toon('#c5cbcf'), gx - 0.16, y + 0.16, gz, [0, 0, 0.7]);
  addBox(g, 0.02, 0.16, 0.02, toon('#8d9498'), gx + 0.16, y + 0.1, gz - 0.12);
  addCyl(g, 0.012, 0.01, 0.16, toon('#d8d2c6'), x + 0.15, y + 0.01, z - 0.28, 6, [0, 0.2, Math.PI / 2]);
}

function buildFlatFiles(g, layout) {
  const z = zone(layout, 'flatfiles');
  const oak = toon('#8d6544');
  const dark = toon('#5c4030');
  const face = toon('#c4a574');
  addBox(g, z.w, 0.98, z.d, dark, z.x, 0.49, z.z);
  addBox(g, z.w + 0.04, 0.04, z.d + 0.04, oak, z.x, 1.0, z.z);
  const names = ['BFK', 'SOMERSET', 'ARCHES', 'KOZO', 'NEWS'];
  names.forEach((name, i) => {
    const y = 0.14 + i * 0.17;
    const pull = name === 'ARCHES' ? 0.16 : 0;
    const frontZ = z.z + z.d / 2 + 0.012 + pull;
    addBox(g, z.w - 0.06, 0.145, 0.02, face, z.x, y, frontZ);
    const card = addBox(g, 0.2, 0.045, 0.006, toon('#ffffff', { map: label(name) }), z.x + 0.28, y, frontZ + 0.012);
    card.castShadow = false;
    addCyl(g, 0.008, 0.008, 0.12, toon('#b08a45'), z.x - 0.28, y, frontZ + 0.02, 6, [Math.PI / 2, 0, 0]);
    if (pull) {
      addBox(g, z.w - 0.12, 0.008, pull, toon('#f4efe4'), z.x, y + 0.06, z.z + z.d / 2 + pull / 2);
    }
  });
  addBox(g, 0.42, 0.08, 0.32, toon('#f3efe4'), z.x - 0.2, 1.06, z.z);
  addBox(g, 0.36, 0.06, 0.28, toon('#e7dcc8'), z.x + 0.22, 1.05, z.z + 0.02, [0, 0.06, 0]);
  const ream = addBox(g, 0.16, 0.04, 0.006, toon('#ffffff', { map: label('BFK 250g') }), z.x - 0.2, 1.12, z.z + 0.14);
  ream.castShadow = false;
}

function buildRack(parent, zoneSpec, prints) {
  const g = new THREE.Group();
  g.position.set(zoneSpec.x, 0, zoneSpec.z);
  const wood = toon('#8d6a46');
  const steel = toon('#5a636a');
  const len = zoneSpec.len;
  const half = len / 2;
  for (const x of [-half + 0.05, half - 0.05]) {
    addBox(g, 0.04, 1.78, 0.04, wood, x, 0.91, -0.1);
    addBox(g, 0.04, 1.78, 0.04, wood, x, 0.91, 0.1);
    addBox(g, 0.045, 0.04, 0.26, wood, x, 1.76, 0);
    addBox(g, 0.045, 0.04, 0.26, wood, x, 0.1, 0);
    addCyl(g, 0.03, 0.03, 0.035, toon('#2c3136'), x, 0.035, -0.1, 10);
    addCyl(g, 0.03, 0.03, 0.035, toon('#2c3136'), x, 0.035, 0.1, 10);
  }
  const rods = [1.62, 1.16, 0.7];
  rods.forEach((y) => {
    addCyl(g, 0.011, 0.011, len - 0.1, steel, 0, y, 0.14, 8, [0, 0, Math.PI / 2]);
  });
  prints.forEach((p) => {
    const y = rods[p.rod] - p.h / 2;
    addSheetMesh(g, p.w, p.h, sheet(p.tex), p.x, y, 0.175, [p.curl || 0, 0, p.twist || 0]);
    addClip(g, p.x, rods[p.rod] - 0.01, 0.19);
  });
  parent.add(g);
}

function buildWallPrints(g) {
  const rail = toon('#5a636a');
  addCyl(g, 0.01, 0.01, 1.55, rail, -2.75, 1.78, -4.56, 8, [0, 0, Math.PI / 2]);
  const row = [
    { x: -3.3, w: 0.32, h: 0.4, tex: 'botanical', twist: 0.03 },
    { x: -2.8, w: 0.28, h: 0.36, tex: 'hatch', twist: -0.04 },
    { x: -2.28, w: 0.34, h: 0.44, tex: 'roofs', twist: 0.02 },
  ];
  row.forEach((p) => {
    addSheetMesh(g, p.w, p.h, sheet(p.tex), p.x, 1.78 - p.h / 2, -4.52, [0, 0, p.twist]);
    addClip(g, p.x, 1.76, -4.5);
  });

  addSheetMesh(g, 0.42, 0.56, sheet('bridge'), -6.05, 1.2, 2.35, [0, Math.PI / 2, 0.02]);
  addClip(g, -6.02, 1.46, 2.35);
  addSheetMesh(g, 0.3, 0.38, sheet('profile'), -6.05, 1.35, -3.55, [0, Math.PI / 2, -0.03]);
  addClip(g, -6.02, 1.52, -3.55);
}

function buildWash(g, layout) {
  const w = zone(layout, 'wash');
  const steel = toon('#c5cbcf');
  const steelDark = toon('#8e979e');
  const cab = toon('#4a5560');
  addBox(g, w.w, 0.88, w.d, cab, w.x, 0.44, w.z);
  addBox(g, w.w + 0.04, 0.045, w.d + 0.04, steel, w.x, 0.9, w.z);
  addBox(g, 0.36, 0.1, 0.42, steelDark, w.x - 0.04, 0.84, w.z - 0.05);
  for (let i = 0; i < 4; i++) {
    addBox(g, 0.28, 0.012, 0.018, toon('#d5d0c4'), w.x - 0.04, 0.8, w.z - 0.18 + i * 0.1);
  }
  const brass = toon('#b08a45');
  addCyl(g, 0.016, 0.016, 0.22, brass, w.x + 0.02, 1.02, w.z - 0.1, 8);
  addCyl(g, 0.014, 0.012, 0.2, brass, w.x - 0.06, 1.1, w.z - 0.02, 8, [0, 0, Math.PI / 2.4]);
  addCyl(g, 0.012, 0.01, 0.22, toon('#6a7278'), w.x - 0.16, 0.95, w.z + 0.15, 8, [0.8, 0.4, 0.6]);
  addBox(g, 0.04, 0.28, 0.16, toon('#8f3a32'), w.x + 0.02, 0.55, w.z - w.d / 2 - 0.02);
  addBox(g, 0.08, 1.15, w.d * 0.15, toon('#3a4046'), w.x - 0.15, 0.58, w.z - w.d / 2);
  const splash = addBox(g, 0.02, 0.7, w.d * 0.8, toon('#ffffff', { map: tex.tile }), w.x + w.w / 2 + 0.01, 1.3, w.z);
  splash.receiveShadow = true;
  addBox(g, w.w + 0.2, 0.08, w.d * 0.55, toon('#3a4046'), w.x - 0.05, 2.28, w.z);
  addBox(g, 0.1, 0.16, 0.14, toon('#c4842a'), w.x - 0.02, 0.96, w.z + 0.4);
  addCyl(g, 0.045, 0.04, 0.16, toon('#c4842a'), w.x + 0.08, 1.02, w.z + 0.48, 10);
  const tag = addBox(g, 0.01, 0.05, 0.1, toon('#ffffff', { map: label('SOLVENT') }), w.x - 0.02, 1.0, w.z + 0.4);
  tag.castShadow = false;
  addCyl(g, 0.12, 0.1, 0.16, toon('#6a7278'), w.x - 0.42, 0.08, w.z + 0.45, 12);
  addBox(g, 0.14, 0.03, 0.1, toon('#8f3a32'), w.x - 0.42, 0.18, w.z + 0.45, [0.4, 0.2, 0]);
}

function buildCart(g, layout) {
  const c = zone(layout, 'cart');
  const steel = toon('#8e979e');
  const dark = toon('#3a4046');
  addBox(g, c.w, 0.04, c.d, dark, c.x, 0.42, c.z);
  addBox(g, 0.04, 0.4, 0.04, dark, c.x - c.w / 2 + 0.03, 0.2, c.z - c.d / 2 + 0.03);
  addBox(g, 0.04, 0.4, 0.04, dark, c.x + c.w / 2 - 0.03, 0.2, c.z - c.d / 2 + 0.03);
  addBox(g, 0.04, 0.4, 0.04, dark, c.x - c.w / 2 + 0.03, 0.2, c.z + c.d / 2 - 0.03);
  addBox(g, 0.04, 0.4, 0.04, dark, c.x + c.w / 2 - 0.03, 0.2, c.z + c.d / 2 - 0.03);
  addBox(g, c.w - 0.08, 0.1, c.d - 0.08, steel, c.x, 0.4, c.z);
  addBox(g, c.w - 0.14, 0.025, c.d - 0.14, toon('#c4923a'), c.x, 0.45, c.z);
  addBox(g, c.w - 0.06, 0.015, c.d - 0.02, steel, c.x, 0.5, c.z - 0.04, [0.5, 0, 0]);
  const tag = addBox(g, 0.006, 0.05, 0.12, toon('#ffffff', { map: label('FeCl3') }), c.x - c.w / 2 - 0.01, 0.32, c.z);
  tag.castShadow = false;
}

function buildPlateRack(g, layout) {
  const r = zone(layout, 'plateRack');
  const wood = toon('#6b4e38');
  addBox(g, 0.035, 0.62, r.d, wood, r.x + 0.08, 0.32, r.z);
  addBox(g, 0.2, 0.025, r.d, wood, r.x, 0.08, r.z);
  const plates = [
    { z: -0.18, h: 0.34, c: '#c4844a', lean: -0.22 },
    { z: 0.02, h: 0.3, c: '#b8734a', lean: -0.16 },
    { z: 0.2, h: 0.32, c: '#2e2a28', lean: -0.26 },
  ];
  plates.forEach((p) => {
    addBox(g, 0.008, p.h, 0.18, toon(p.c), r.x - 0.02, 0.12 + p.h / 2, r.z + p.z, [0, 0, p.lean]);
  });
}

function buildHomasote(g, layout) {
  const h = zone(layout, 'homasote');
  const boards = ['#b7ab98', '#c8bca8', '#b3a794', '#cfc3ae', '#b9ad9a', '#d6cbb6'];
  boards.forEach((c, i) => {
    const y = 0.018 + i * 0.03;
    addBox(g, h.w + 0.012, 0.006, h.d + 0.012, toon('#5c5144'), h.x, y - 0.01, h.z);
    addBox(g, h.w, 0.02, h.d, toon(c), h.x, y, h.z, [0, (i - 2.5) * 0.012, 0]);
  });
  const top = 0.018 + (boards.length - 1) * 0.03 + 0.012;
  const lying = new THREE.Mesh(new THREE.PlaneGeometry(0.46, 0.34), toon('#f7f1e6', { map: sheet('hands') }));
  lying.rotation.x = -Math.PI / 2;
  lying.rotation.z = 0.08;
  lying.position.set(h.x, top + 0.01, h.z);
  lying.receiveShadow = true;
  g.add(lying);
}

function buildBin(g, layout) {
  const b = zone(layout, 'bin');
  addCyl(g, 0.15, 0.13, 0.28, toon('#3a4046'), b.x, 0.14, b.z, 14);
  addBox(g, 0.16, 0.04, 0.12, toon('#d9d2c4'), b.x, 0.3, b.z, [0.6, 0.4, 0.2]);
  addBox(g, 0.1, 0.03, 0.08, toon('#8a8176'), b.x + 0.04, 0.32, b.z + 0.02, [0.3, -0.5, -0.4]);
}

function buildPlant(g, layout) {
  const p = findInst(layout, 'plant');
  const greens = ['#3d5c45', '#2f4a38', '#4e6e52', '#34543e'];
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2;
    addBox(
      g,
      0.06,
      0.28 + (i % 3) * 0.06,
      0.012,
      toon(greens[i % greens.length]),
      p.position[0] + Math.cos(a) * 0.05,
      0.46 + (i % 3) * 0.02,
      p.position[2] + Math.sin(a) * 0.05,
      [0.15 * (i % 2 ? 1 : -1), a, 0.2],
    );
  }
}

function makeProcedural(layout) {
  const g = new THREE.Group();
  g.name = 'procedural';
  buildPress(g, layout);
  buildInkSlab(g, layout);
  buildPaperTable(g, layout);
  buildFlatFiles(g, layout);
  buildRack(g, zone(layout, 'rackA'), [
    { x: -0.68, rod: 0, w: 0.42, h: 0.52, tex: 'roofs', twist: 0.04, curl: 0.05 },
    { x: -0.2, rod: 0, w: 0.38, h: 0.48, tex: 'bridge', twist: -0.03 },
    { x: 0.28, rod: 0, w: 0.4, h: 0.54, tex: 'profile', twist: 0.02, curl: -0.04 },
    { x: 0.68, rod: 0, w: 0.32, h: 0.44, tex: 'botanical', twist: 0.05 },
    { x: -0.48, rod: 1, w: 0.4, h: 0.42, tex: 'hands', twist: -0.04, curl: 0.04 },
    { x: 0.05, rod: 1, w: 0.36, h: 0.4, tex: 'hatch', twist: 0.03 },
    { x: 0.5, rod: 1, w: 0.34, h: 0.4, tex: 'proof', twist: -0.02 },
    { x: -0.15, rod: 2, w: 0.46, h: 0.32, tex: 'roofs', twist: 0.02 },
  ]);
  buildRack(g, zone(layout, 'rackB'), [
    { x: -0.48, rod: 0, w: 0.4, h: 0.5, tex: 'botanical', twist: -0.03, curl: 0.04 },
    { x: 0.02, rod: 0, w: 0.36, h: 0.46, tex: 'profile', twist: 0.04 },
    { x: 0.46, rod: 0, w: 0.32, h: 0.42, tex: 'bridge', twist: -0.02 },
    { x: -0.22, rod: 1, w: 0.42, h: 0.38, tex: 'hands', twist: 0.03 },
    { x: 0.28, rod: 1, w: 0.34, h: 0.4, tex: 'hatch', twist: -0.04 },
  ]);
  buildWallPrints(g);
  buildWash(g, layout);
  buildCart(g, layout);
  buildPlateRack(g, layout);
  buildHomasote(g, layout);
  buildBin(g, layout);
  buildPlant(g, layout);
  addDecal(g, 1.6, 1.3, -1.1, -1.15);
  addDecal(g, 1.1, 0.9, 2.2, -1.2);
  return g;
}

function dressBookcase(node) {
  const H = 1.95;
  const tones = ['#2a2622', '#f4efe6', '#7a2e2a', '#c4a574', '#1c2830', '#8a5a32'];
  [0.27, 0.51, 0.75].forEach((fy, si) => {
    for (let i = 0; i < 3; i++) {
      const y = fy * H + 0.04 + (i % 2) * 0.02;
      addBox(node, 0.22, 0.045, 0.22, toon(tones[(si * 2 + i) % tones.length]), -0.24 + i * 0.22, y, -0.08, [0, (i - 1) * 0.06, 0]);
    }
  });
  addBox(node, 0.34, 0.07, 0.24, toon('#f3efe4'), -0.12, H + 0.04, -0.04);
  addBox(node, 0.28, 0.055, 0.22, toon('#7a2e2a'), 0.16, H + 0.035, -0.02, [0, 0.08, 0]);
  addBox(node, 0.28, 0.36, 0.02, toon('#2a2622'), 0.22, 0.42, -0.22, [0.15, 0.4, 0]);
}

function dressBoard(node) {
  const card = new THREE.Mesh(
    new THREE.BoxGeometry(0.02, 0.95, 1.5),
    new THREE.MeshBasicMaterial({ map: tex.chalk }),
  );
  card.position.set(0.14, 0.98, 0);
  card.userData.keepBasic = true;
  card.userData.noShadow = true;
  card.castShadow = false;
  node.add(card);
}

function dressShelf(node) {
  const m = node.userData.measured || { x: 0.55, y: 0.62, z: 0.22 };
  const wood = toon('#6e5138');
  addBox(node, 0.02, m.y * 0.9, m.z * 0.85, wood, -m.x / 2, m.y * 0.45, 0);
  addBox(node, 0.02, m.y * 0.9, m.z * 0.85, wood, m.x / 2, m.y * 0.45, 0);
}

function dressPendant(node) {
  const top = 3.62 - node.position.y;
  const shade = node.userData.measured ? node.userData.measured.y : 0.46;
  addCyl(node, 0.006, 0.006, Math.max(0.2, top - shade), toon('#2a241c'), 0, shade + (top - shade) / 2, 0, 6);
  addCyl(node, 0.04, 0.04, 0.02, toon('#efeae2'), 0, top, 0, 10);
}

function dressMugs(props) {
  props.traverse((node) => {
    if (node.userData.dress !== 'brushes') return;
    const sticks = ['#6b3a2a', '#d8c4a0', '#2a241c', '#8a8176'];
    sticks.forEach((c, i) => {
      addCyl(node, 0.004, 0.005, 0.14 + (i % 2) * 0.03, toon(c), (i - 1.5) * 0.012, 0.12, 0, 5, [(i - 1.5) * 0.1, 0, 0.2]);
    });
  });
}

function onReady({ props }) {
  props.traverse((node) => {
    if (node.name === 'portfolios') dressBookcase(node);
    if (node.name === 'edition_board') dressBoard(node);
    if (node.name === 'shelf_wash') dressShelf(node);
    if (node.name === 'pendant_ink') dressPendant(node);
  });
  dressMugs(props);
}

boot({
  makeShell,
  makeProcedural,
  onReady,
  readyText: 'ready — etching studio · drag orbit · U unlit · T toon',
});
