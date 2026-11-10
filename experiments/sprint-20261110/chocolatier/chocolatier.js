import * as THREE from 'three';
import { boot, toon, addBox, addCyl, contact } from './scene_lib.js';

const FULL = [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1];
const PARTIAL = [1, 1, 1, 0, 1, 0, 1, 1, 0, 1, 1, 0];
const EMPTY = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];

const UNIT = new THREE.SphereGeometry(1, 14, 10);

function canvasTex(w, h, draw, opts = {}) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d'), w, h);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  if (opts.wrap === 'repeat') {
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    if (opts.repeat) tex.repeat.set(opts.repeat[0], opts.repeat[1]);
  }
  tex.needsUpdate = true;
  return tex;
}

let TEX = null;
function textures() {
  if (TEX) return TEX;
  TEX = {
    wood: canvasTex(256, 256, (ctx, w, h) => {
      ctx.fillStyle = '#7a4e30';
      ctx.fillRect(0, 0, w, h);
      const n = 4;
      for (let i = 0; i < n; i++) {
        const y = (i / n) * h;
        const ph = h / n;
        ctx.fillStyle = i % 2 ? '#8d5e38' : '#9a6840';
        ctx.fillRect(0, y + 2, w, ph - 4);
        ctx.fillStyle = 'rgba(50, 24, 10, 0.45)';
        ctx.fillRect(0, y + ph - 3, w, 3);
        ctx.strokeStyle = 'rgba(255, 220, 180, 0.12)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, y + ph * 0.4);
        ctx.bezierCurveTo(w * 0.3, y + ph * 0.2, w * 0.6, y + ph * 0.7, w, y + ph * 0.35);
        ctx.stroke();
      }
    }, { wrap: 'repeat', repeat: [5, 7] }),
    tile: canvasTex(256, 256, (ctx, w, h) => {
      ctx.fillStyle = '#c4b39a';
      ctx.fillRect(0, 0, w, h);
      const n = 4;
      const g = 8;
      const tw = (w - g) / n;
      for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
          ctx.fillStyle = (i + j) % 5 === 0 ? '#e7d7bc' : '#f4eadc';
          ctx.fillRect(g / 2 + j * tw, g / 2 + i * tw, tw - g, tw - g);
        }
      }
    }, { wrap: 'repeat', repeat: [6, 2.6] }),
    marble: canvasTex(512, 256, (ctx, w, h) => {
      ctx.fillStyle = '#f4f1ea';
      ctx.fillRect(0, 0, w, h);
      ctx.lineCap = 'round';
      const veins = [
        ['rgba(130, 126, 120, 0.55)', 3, [[20, 40], [180, 90], [340, 30], [500, 80]]],
        ['rgba(90, 110, 108, 0.28)', 2, [[0, 160], [140, 120], [300, 190], [512, 140]]],
        ['rgba(160, 150, 140, 0.4)', 2, [[40, 200], [200, 210], [380, 150], [500, 200]]],
      ];
      for (const [color, width, pts] of veins) {
        ctx.strokeStyle = color;
        ctx.lineWidth = width;
        ctx.beginPath();
        ctx.moveTo(pts[0][0], pts[0][1]);
        ctx.bezierCurveTo(pts[1][0], pts[1][1], pts[2][0], pts[2][1], pts[3][0], pts[3][1]);
        ctx.stroke();
      }
    }),
    rug: canvasTex(512, 512, (ctx, w, h) => {
      ctx.fillStyle = '#6e3428';
      ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = '#f3e6c8';
      ctx.lineWidth = 28;
      ctx.strokeRect(22, 22, w - 44, h - 44);
      ctx.strokeStyle = '#d4a24a';
      ctx.lineWidth = 8;
      ctx.strokeRect(48, 48, w - 96, h - 96);
    }),
    burlap: canvasTex(128, 128, (ctx, w, h) => {
      ctx.fillStyle = '#b08958';
      ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = 'rgba(90, 55, 24, 0.35)';
      ctx.lineWidth = 2;
      for (let i = 0; i < 8; i++) {
        ctx.beginPath();
        ctx.moveTo(0, i * 16);
        ctx.lineTo(w, i * 16 + 6);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(i * 16, 0);
        ctx.lineTo(i * 16 + 4, h);
        ctx.stroke();
      }
    }, { wrap: 'repeat', repeat: [2, 2] }),
    foil: canvasTex(128, 128, (ctx, w, h) => {
      ctx.fillStyle = '#e2b34a';
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = 'rgba(255, 236, 190, 0.55)';
      ctx.beginPath();
      ctx.moveTo(0, h);
      ctx.lineTo(w, 0);
      ctx.lineTo(w, h * 0.28);
      ctx.lineTo(0, h * 0.72);
      ctx.fill();
    }),
    paper: canvasTex(128, 128, (ctx, w, h) => {
      ctx.fillStyle = '#f3e6cc';
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#7a2430';
      ctx.fillRect(0, h * 0.4, w, h * 0.16);
    }),
    wordmark: canvasTex(1024, 256, (ctx, w, h) => {
      ctx.fillStyle = '#3a2418';
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#e0b44a';
      ctx.fillRect(48, 28, w - 96, 4);
      ctx.fillRect(48, h - 34, w - 96, 4);
      ctx.fillStyle = '#f6efe4';
      ctx.textAlign = 'center';
      ctx.font = '88px "Liberation Serif", serif';
      ctx.fillText('MAISON CACAO', w / 2, 128);
      ctx.fillStyle = '#e0b44a';
      ctx.font = '30px "Liberation Serif", serif';
      ctx.fillText('ATELIER   ·   CHOCOLATIER', w / 2, 188);
    }),
    menu: canvasTex(512, 640, (ctx, w, h) => {
      ctx.fillStyle = '#f4ead8';
      ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = '#3a2418';
      ctx.lineWidth = 12;
      ctx.strokeRect(16, 16, w - 32, h - 32);
      ctx.fillStyle = '#3a2418';
      ctx.textAlign = 'center';
      ctx.font = '58px "Liberation Serif", serif';
      ctx.fillText('ORIGINES', w / 2, 92);
      ctx.fillStyle = '#8a6230';
      ctx.font = '24px "Liberation Serif", serif';
      ctx.fillText('TABLETTE  &  BONBON', w / 2, 136);
      const lines = [
        ['Madagascar 72', '8'],
        ['Equateur 68', '8'],
        ['Maya Mountain', '9'],
        ['Lait caramel', '7'],
        ['Rubis', '9'],
        ['Blanc vanille', '7'],
      ];
      lines.forEach((ln, i) => {
        const y = 214 + i * 64;
        ctx.fillStyle = '#3a2418';
        ctx.font = '34px "Liberation Serif", serif';
        ctx.textAlign = 'left';
        ctx.fillText(ln[0], 48, y);
        ctx.fillStyle = '#8a6230';
        ctx.textAlign = 'right';
        ctx.fillText(ln[1], w - 48, y);
        ctx.strokeStyle = 'rgba(138, 98, 48, 0.45)';
        ctx.beginPath();
        ctx.moveTo(48, y + 16);
        ctx.lineTo(w - 48, y + 16);
        ctx.stroke();
      });
    }),
  };
  return TEX;
}

const labelCache = new Map();
function labelMaterial(text) {
  if (labelCache.has(text)) return labelCache.get(text);
  const map = canvasTex(256, 128, (ctx, w, h) => {
    ctx.fillStyle = '#f7f1e4';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#3a2418';
    ctx.lineWidth = 8;
    ctx.strokeRect(8, 8, w - 16, h - 16);
    ctx.fillStyle = '#3a2418';
    ctx.font = '52px "Liberation Serif", serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, w / 2, h / 2 + 2);
  });
  const mat = toon('#f7f1e4', { map });
  labelCache.set(text, mat);
  return mat;
}

function menuCard(map) {
  const mat = toon('#f4ead8', {
    map,
    side: THREE.DoubleSide,
    emissive: '#fff6ea',
    emissiveIntensity: 0.42,
  });
  mat.emissiveMap = map;
  return mat;
}

function palette() {
  const T = textures();
  return {
    plaster: toon('#f3e6d4'),
    plasterDeep: toon('#e7d8c4'),
    wood: toon('#6b442c'),
    woodDark: toon('#3a2418'),
    woodMid: toon('#5c3a28'),
    woodLight: toon('#a87548'),
    frame: toon('#6a4632'),
    inset: toon('#2e1d16'),
    brass: toon('#c6a15a'),
    brassDark: toon('#8a6a32'),
    marble: toon('#f4f1ea', { map: T.marble }),
    steel: toon('#c5c8cc'),
    steelDark: toon('#5e656b'),
    copper: toon('#b8734a'),
    copperDark: toon('#7a4630'),
    silicone: toon('#d9c7a4'),
    cavity: toon('#2a1c14'),
    dark: toon('#3a2418'),
    milk: toon('#7a4a2c'),
    white: toon('#f6efe6'),
    ruby: toon('#b84d5c'),
    gold: toon('#e0b44a', { map: T.foil }),
    paper: toon('#f3e6cc', { map: T.paper }),
    kraft: toon('#c4a574'),
    berry: toon('#7a2430'),
    burlap: toon('#b08958', { map: T.burlap }),
    leaf: toon('#3f6a3a'),
    leafDark: toon('#2c4a2c'),
    glass: toon('#d5e4ea', { transparent: true, opacity: 0.2, side: THREE.DoubleSide, depthWrite: false }),
    glassShelf: toon('#e7eef2', { transparent: true, opacity: 0.28, side: THREE.DoubleSide, depthWrite: false }),
    bulb: toon('#ffd7a4', { emissive: '#ffb15a', emissiveIntensity: 0.9 }),
    ember: toon('#e07030', { emissive: '#ff7a28', emissiveIntensity: 0.65 }),
    sky: toon('#d5e3ea'),
    rug: toon('#6e3428', { map: T.rug }),
    cocoa: toon('#5a382c'),
    cream: toon('#f7f1e4'),
    menu: menuCard(T.menu),
    sign: toon('#3a2418', { map: T.wordmark }),
    tileSplash: toon('#f4eadc', { map: T.tile }),
    floorWood: toon('#8d5e38', { map: T.wood }),
    floorTile: toon('#f1e6d4', { map: T.tile }),
  };
}

function metrics(layout) {
  const { width: W, depth: D, height: H } = layout.meta.room;
  return {
    W, D, H,
    backZ: -D / 2,
    leftX: -W / 2,
    rightX: W / 2,
    frontZ: D / 2,
    innerBack: -D / 2 + 0.06,
    innerLeft: -W / 2 + 0.06,
    beamBottom: H - 0.24,
    winX0: -1.58,
    winX1: 1.52,
    winY0: 1.22,
    winY1: 2.44,
  };
}

function grp(parent, x, y, z, ry = 0) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  g.rotation.y = ry;
  parent.add(g);
  return g;
}

function addBall(g, rx, ry, rz, mat, x, y, z) {
  const m = new THREE.Mesh(UNIT, mat);
  m.scale.set(rx, ry, rz);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  g.add(m);
  return m;
}

function addCone(g, r, h, mat, x, y, z, opts = {}) {
  const m = new THREE.Mesh(new THREE.ConeGeometry(r, h, opts.seg || 4), mat);
  m.position.set(x, y, z);
  if (opts.rx) m.rotation.x = opts.rx;
  if (opts.ry) m.rotation.y = opts.ry;
  if (opts.rz) m.rotation.z = opts.rz;
  m.castShadow = true;
  m.receiveShadow = true;
  g.add(m);
  return m;
}

function addTorus(g, radius, tube, mat, x, y, z, opts = {}) {
  const m = new THREE.Mesh(new THREE.TorusGeometry(radius, tube, 8, 14, opts.arc || Math.PI * 2), mat);
  m.position.set(x, y, z);
  if (opts.rx) m.rotation.x = opts.rx;
  if (opts.ry) m.rotation.y = opts.ry;
  if (opts.rz) m.rotation.z = opts.rz;
  m.castShadow = true;
  m.receiveShadow = true;
  g.add(m);
  return m;
}

function framedPanel(g, P, x, y, z, w, h, axis) {
  const proud = axis === 'z' ? [0, 0, 0.012] : [0.012, 0, 0];
  if (axis === 'z') {
    addBox(g, w - 0.08, h - 0.08, 0.012, P.inset, x, y, z);
    addBox(g, w, 0.04, 0.028, P.frame, x, y + h / 2 - 0.02, z + proud[2]);
    addBox(g, w, 0.04, 0.028, P.frame, x, y - h / 2 + 0.02, z + proud[2]);
    addBox(g, 0.04, h, 0.028, P.frame, x - w / 2 + 0.02, y, z + proud[2]);
    addBox(g, 0.04, h, 0.028, P.frame, x + w / 2 - 0.02, y, z + proud[2]);
  } else {
    addBox(g, 0.012, h - 0.08, w - 0.08, P.inset, x, y, z);
    addBox(g, 0.028, 0.04, w, P.frame, x + proud[0], y + h / 2 - 0.02, z);
    addBox(g, 0.028, 0.04, w, P.frame, x + proud[0], y - h / 2 + 0.02, z);
    addBox(g, 0.028, h, 0.04, P.frame, x + proud[0], y, z - w / 2 + 0.02);
    addBox(g, 0.028, h, 0.04, P.frame, x + proud[0], y, z + w / 2 - 0.02);
  }
}

function runPanels(g, P, axis, x, z, a0, a1, y, h) {
  const pw = 0.66;
  const gap = 0.1;
  const span = a1 - a0;
  const n = Math.max(1, Math.floor(span / (pw + gap)));
  const total = n * pw + (n - 1) * gap;
  let cursor = (a0 + a1) / 2 - total / 2 + pw / 2;
  for (let i = 0; i < n; i++) {
    if (axis === 'z') framedPanel(g, P, cursor, y, z, pw, h, 'z');
    else framedPanel(g, P, x, y, cursor, pw, h, 'x');
    cursor += pw + gap;
  }
}

function makeShell(layout) {
  const g = new THREE.Group();
  g.name = 'shell';
  const P = palette();
  const A = metrics(layout);
  const { W, D, H, backZ, leftX, rightX, frontZ, innerBack, innerLeft } = A;

  const woodDepth = D / 2 + 0.02;
  const wood = new THREE.Mesh(new THREE.BoxGeometry(W, 0.1, woodDepth), P.floorWood);
  wood.position.set(0, -0.05, -D / 2 + woodDepth / 2);
  wood.receiveShadow = true;
  g.add(wood);
  const tileDepth = D / 2 - 0.02;
  const tile = new THREE.Mesh(new THREE.BoxGeometry(W, 0.1, tileDepth), P.floorTile);
  tile.position.set(0, -0.05, frontZ - tileDepth / 2);
  tile.receiveShadow = true;
  g.add(tile);
  addBox(g, W - 0.3, 0.012, 0.07, P.brass, 0, 0.008, 0.02);
  addBox(g, W, 0.1, 0.06, P.woodDark, 0, -0.05, frontZ);
  addBox(g, 0.06, 0.1, D, P.woodDark, rightX, -0.05, 0);

  const shopZ0 = 0.15;
  const shopZ1 = frontZ - 0.35;
  addBox(g, W - 0.7, 0.008, 0.08, P.cocoa, 0, 0.006, shopZ0);
  addBox(g, W - 0.7, 0.008, 0.08, P.cocoa, 0, 0.006, shopZ1);
  addBox(g, 0.08, 0.008, shopZ1 - shopZ0, P.cocoa, -W / 2 + 0.45, 0.006, (shopZ0 + shopZ1) / 2);
  addBox(g, 0.08, 0.008, shopZ1 - shopZ0, P.cocoa, W / 2 - 0.55, 0.006, (shopZ0 + shopZ1) / 2);

  const winW = A.winX1 - A.winX0;
  const winH = A.winY1 - A.winY0;
  addBox(g, W, A.winY0, 0.12, P.plaster, 0, A.winY0 / 2, backZ);
  addBox(g, W, H - A.winY1, 0.12, P.plaster, 0, (A.winY1 + H) / 2, backZ);
  const pierH = winH;
  const pierY = (A.winY0 + A.winY1) / 2;
  addBox(g, A.winX0 - leftX, pierH, 0.12, P.plaster, (leftX + A.winX0) / 2, pierY, backZ);
  addBox(g, rightX - A.winX1, pierH, 0.12, P.plaster, (rightX + A.winX1) / 2, pierY, backZ);
  addBox(g, 0.12, H, D, P.plaster, leftX, H / 2, 0);
  addBox(g, 0.12, H, 1.85, P.plaster, rightX, H / 2, backZ + 0.92);

  addBox(g, winW + 0.3, winH + 0.2, 0.24, P.sky, (A.winX0 + A.winX1) / 2, pierY, backZ - 0.22);
  const glass = addBox(
    g, winW, winH, 0.02, P.glass,
    (A.winX0 + A.winX1) / 2, pierY, innerBack + 0.01,
    { cast: false, receive: false },
  );
  glass.name = 'window';
  addBox(g, winW + 0.12, 0.06, 0.08, P.woodMid, (A.winX0 + A.winX1) / 2, A.winY1 + 0.02, innerBack + 0.02);
  addBox(g, winW + 0.12, 0.06, 0.08, P.woodMid, (A.winX0 + A.winX1) / 2, A.winY0 - 0.02, innerBack + 0.02);
  addBox(g, 0.06, winH, 0.08, P.woodMid, A.winX0, pierY, innerBack + 0.02);
  addBox(g, 0.06, winH, 0.08, P.woodMid, A.winX1, pierY, innerBack + 0.02);
  for (const x of [-0.55, 0.5]) {
    addBox(g, 0.04, winH - 0.08, 0.05, P.woodLight, x, pierY, innerBack + 0.03);
  }
  addBox(g, winW - 0.1, 0.035, 0.04, P.woodLight, (A.winX0 + A.winX1) / 2, A.winY0 + winH * 0.42, innerBack + 0.03);
  addBox(g, winW + 0.28, 0.08, 0.34, P.woodLight, (A.winX0 + A.winX1) / 2, 1.14, innerBack + 0.18);
  addBox(g, winW + 0.1, 0.1, 0.08, P.wood, (A.winX0 + A.winX1) / 2, A.winY1 + 0.1, innerBack + 0.05);

  addBox(g, W - 0.2, 1.02, 0.04, P.woodDark, 0, 0.51, innerBack + 0.04);
  addBox(g, 0.04, 1.02, D - 0.3, P.woodDark, innerLeft + 0.03, 0.51, -0.1);
  runPanels(g, P, 'z', 0, innerBack + 0.055, leftX + 0.4, rightX - 0.5, 0.56, 0.78);
  runPanels(g, P, 'x', innerLeft + 0.045, 0, backZ + 0.45, frontZ - 0.45, 0.56, 0.78);
  addBox(g, W - 0.15, 0.1, 0.06, P.woodMid, 0, 0.05, innerBack + 0.05);
  addBox(g, 0.06, 0.1, D - 0.2, P.woodMid, innerLeft + 0.04, 0.05, 0);
  addBox(g, W - 0.2, 0.035, 0.045, P.brassDark, 0, 1.04, innerBack + 0.05);
  addBox(g, 0.04, 0.035, D - 0.4, P.brassDark, innerLeft + 0.045, 1.04, -0.2);
  addBox(g, W - 0.3, 0.03, 0.04, P.brass, 0, 2.5, innerBack + 0.045);
  addBox(g, 0.035, 0.03, D - 0.5, P.brass, innerLeft + 0.04, 2.5, -0.15);
  addBox(g, W - 0.15, 0.08, 0.1, P.woodMid, 0, H - 0.06, innerBack + 0.02);
  addBox(g, 0.1, 0.08, D - 0.15, P.woodMid, innerLeft + 0.02, H - 0.06, 0);

  const splash = addBox(g, 1.7, 0.85, 0.03, P.tileSplash, 2.35, 1.5, innerBack + 0.07);
  splash.name = 'backsplash';

  const sign = new THREE.Mesh(new THREE.PlaneGeometry(2.15, 0.4), P.sign);
  sign.position.set(-0.05, 2.8, innerBack + 0.09);
  sign.userData.noCast = true;
  g.add(sign);

  const slabDepth = 5.3;
  const ceil = new THREE.Mesh(new THREE.BoxGeometry(W - 0.15, 0.08, slabDepth), P.plasterDeep);
  ceil.position.set(0, H - 0.04, backZ + slabDepth / 2);
  g.add(ceil);
  for (const z of [-3.35, -1.65, 1.05, 2.55]) {
    addBox(g, W - 0.5, 0.16, 0.12, P.woodDark, 0, A.beamBottom + 0.08, z);
  }

  return g;
}

function moldTray(parent, P, x, y, z, ry, mask) {
  const o = grp(parent, x, y, z, ry);
  addBox(o, 0.46, 0.014, 0.3, P.steel, 0, 0.007, 0);
  addBox(o, 0.46, 0.02, 0.012, P.steelDark, 0, 0.02, 0.144);
  addBox(o, 0.46, 0.02, 0.012, P.steelDark, 0, 0.02, -0.144);
  addBox(o, 0.012, 0.02, 0.28, P.steelDark, 0.224, 0.02, 0);
  addBox(o, 0.012, 0.02, 0.28, P.steelDark, -0.224, 0.02, 0);
  if (!mask) return o;
  addBox(o, 0.38, 0.016, 0.22, P.silicone, 0, 0.02, 0);
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 4; c++) {
      const px = -0.12 + c * 0.08;
      const pz = -0.07 + r * 0.07;
      const on = mask[r * 4 + c];
      if (on) addBall(o, 0.026, 0.02, 0.026, P.dark, px, 0.04, pz);
      else addCyl(o, 0.02, 0.018, 0.01, P.cavity, px, 0.028, pz, 8);
    }
  }
  return o;
}

function piece(o, P, spec, y, z) {
  const mat = P[spec.mat];
  const zz = z + (spec.z || 0);
  if (spec.shape === 'square') addBox(o, 0.064, 0.03, 0.05, mat, spec.x, y + 0.015, zz);
  else if (spec.shape === 'dome') addBall(o, 0.03, 0.026, 0.03, mat, spec.x, y + 0.026, zz);
  else if (spec.shape === 'bar') addBox(o, 0.12, 0.02, 0.045, mat, spec.x, y + 0.01, zz);
  else if (spec.shape === 'pyramid') addCone(o, 0.032, 0.05, mat, spec.x, y + 0.025, zz, { ry: 0.5 });
  if (spec.nib) addBall(o, 0.008, 0.005, 0.008, P.gold, spec.x + 0.012, y + 0.04, zz);
}

function standLabel(parent, text, x, y, z) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(0.18, 0.07), labelMaterial(text));
  m.position.set(x, y, z);
  m.userData.noCast = true;
  parent.add(m);
}

function displayCase(g, P, x, z) {
  const c = grp(g, x, 0, z, 0);
  const W = 2.9;
  const D = 0.7;
  addBox(c, W - 0.14, 0.1, D - 0.1, P.woodDark, 0, 0.05, 0);
  addBox(c, W, 0.6, D, P.wood, 0, 0.4, 0);
  addBox(c, 0.015, 0.56, 0.02, P.woodDark, -0.72, 0.4, D / 2 - 0.01);
  addBox(c, 0.015, 0.56, 0.02, P.woodDark, 0.72, 0.4, D / 2 - 0.01);
  addBox(c, 0.04, 0.04, 0.04, P.brass, -W / 2 + 0.04, 0.08, D / 2 - 0.04);
  addBox(c, 0.04, 0.04, 0.04, P.brass, W / 2 - 0.04, 0.08, D / 2 - 0.04);
  addBox(c, W + 0.06, 0.05, D + 0.05, P.marble, 0, 0.725, 0);
  const deck = 0.75;
  const gh = 0.52;
  const posts = [
    [W / 2 - 0.02, D / 2 - 0.02],
    [W / 2 - 0.02, -D / 2 + 0.02],
    [-W / 2 + 0.02, D / 2 - 0.02],
    [-W / 2 + 0.02, -D / 2 + 0.02],
  ];
  for (const [px, pz] of posts) addBox(c, 0.028, gh, 0.028, P.brass, px, deck + gh / 2, pz);
  addBox(c, W, 0.028, 0.028, P.brass, 0, deck + gh, D / 2 - 0.02);
  addBox(c, W, 0.028, 0.028, P.brass, 0, deck + gh, -D / 2 + 0.02);
  addBox(c, 0.028, 0.028, D, P.brass, W / 2 - 0.02, deck + gh, 0);
  addBox(c, 0.028, 0.028, D, P.brass, -W / 2 + 0.02, deck + gh, 0);
  const gy = deck + gh / 2;
  addBox(c, W - 0.08, gh - 0.05, 0.012, P.glass, 0, gy, D / 2 - 0.03, { cast: false, receive: false });
  addBox(c, 0.012, gh - 0.05, D - 0.1, P.glass, W / 2 - 0.03, gy, 0, { cast: false, receive: false });
  addBox(c, 0.012, gh - 0.05, D - 0.1, P.glass, -W / 2 + 0.03, gy, 0, { cast: false, receive: false });
  addBox(c, W - 0.12, 0.012, D - 0.12, P.glass, 0, deck + gh - 0.03, 0, { cast: false, receive: false });
  addBox(c, W - 0.08, gh - 0.04, 0.02, P.inset, 0, gy, -D / 2 + 0.03);
  addBox(c, W - 0.28, 0.018, D - 0.22, P.cream, 0, deck + 0.18, -0.02);
  addBox(c, W - 0.28, 0.018, D - 0.22, P.cream, 0, deck + 0.36, -0.02);
  addBox(c, W - 0.28, 0.012, 0.012, P.brass, 0, deck + 0.19, (D - 0.22) / 2 - 0.02);
  addBox(c, W - 0.28, 0.012, 0.012, P.brass, 0, deck + 0.37, (D - 0.22) / 2 - 0.02);
  addBox(c, W - 0.4, 0.012, 0.035, P.bulb, 0, deck + gh - 0.07, -0.04, { cast: false, receive: false });

  const deckRow = [
    { x: -1.18, shape: 'square', mat: 'dark', z: 0.02 },
    { x: -1.05, shape: 'square', mat: 'milk', z: -0.03 },
    { x: -0.92, shape: 'square', mat: 'dark', z: 0.03 },
    { x: -0.79, shape: 'square', mat: 'milk', z: 0 },
    { x: -0.66, shape: 'square', mat: 'dark', z: -0.02 },
    { x: -0.28, shape: 'dome', mat: 'ruby', z: 0.02, nib: true },
    { x: -0.14, shape: 'dome', mat: 'ruby', z: -0.02 },
    { x: 0.08, shape: 'bar', mat: 'dark', z: 0.03 },
    { x: 0.26, shape: 'bar', mat: 'milk', z: -0.02 },
    { x: 0.48, shape: 'square', mat: 'white', z: 0.02 },
    { x: 0.62, shape: 'square', mat: 'white', z: -0.03 },
    { x: 0.76, shape: 'square', mat: 'milk', z: 0.01 },
    { x: 0.94, shape: 'pyramid', mat: 'dark', z: 0 },
    { x: 1.08, shape: 'pyramid', mat: 'gold', z: -0.02 },
  ];
  const midRow = [
    { x: -1.05, shape: 'dome', mat: 'dark', z: 0.02, nib: true },
    { x: -0.9, shape: 'dome', mat: 'dark', z: -0.04 },
    { x: -0.75, shape: 'dome', mat: 'milk', z: 0.03 },
    { x: -0.6, shape: 'dome', mat: 'dark', z: 0 },
    { x: -0.42, shape: 'dome', mat: 'ruby', z: -0.02 },
    { x: 0.35, shape: 'dome', mat: 'white', z: 0.02 },
    { x: 0.52, shape: 'dome', mat: 'white', z: -0.03, nib: true },
    { x: 0.7, shape: 'dome', mat: 'milk', z: 0.01 },
  ];
  const topRow = [
    { x: -0.2, shape: 'bar', mat: 'dark', z: 0.02 },
    { x: 0.05, shape: 'bar', mat: 'milk', z: -0.02 },
    { x: 0.35, shape: 'pyramid', mat: 'ruby', z: 0.02 },
    { x: 0.52, shape: 'pyramid', mat: 'dark', z: -0.02 },
    { x: 0.68, shape: 'pyramid', mat: 'gold', z: 0.01 },
    { x: 0.88, shape: 'square', mat: 'white', z: 0 },
    { x: 1.02, shape: 'square', mat: 'white', z: -0.03 },
  ];
  for (const s of deckRow) piece(c, P, s, deck, -0.02);
  for (const s of midRow) piece(c, P, s, deck + 0.2, -0.02);
  for (const s of topRow) piece(c, P, s, deck + 0.38, -0.04);
  standLabel(c, 'NOIR', -0.95, deck + 0.07, 0.16);
  standLabel(c, 'RUBIS', -0.22, deck + 0.07, 0.16);
  standLabel(c, 'LAIT', 0.18, deck + 0.07, 0.16);
  standLabel(c, 'BLANC', 0.72, deck + 0.44, 0.12);
  return c;
}

function marbleIsland(g, P, x, z) {
  const o = grp(g, x, 0, z, 0);
  const hx = 1.2;
  const hz = 0.56;
  for (const [px, pz] of [[-1, -0.4], [1, -0.4], [-1, 0.4], [1, 0.4]]) {
    addBox(o, 0.08, 0.78, 0.08, P.woodDark, px, 0.39, pz);
  }
  addBox(o, hx * 2 - 0.2, 0.1, 0.08, P.woodMid, 0, 0.72, hz - 0.08);
  addBox(o, hx * 2 - 0.2, 0.1, 0.08, P.woodMid, 0, 0.72, -hz + 0.08);
  addBox(o, 0.08, 0.1, hz * 2 - 0.16, P.woodMid, hx - 0.1, 0.72, 0);
  addBox(o, 0.08, 0.1, hz * 2 - 0.16, P.woodMid, -hx + 0.1, 0.72, 0);
  addBox(o, hx * 2 - 0.28, 0.03, hz * 2 - 0.22, P.woodLight, 0, 0.32, 0);
  moldTray(o, P, -0.35, 0.34, 0.02, 0.2, null);
  moldTray(o, P, 0.4, 0.36, -0.02, -0.15, null);
  addBox(o, hx * 2 + 0.08, 0.05, hz * 2 + 0.08, P.woodDark, 0, 0.86, 0);
  addBox(o, hx * 2 + 0.16, 0.055, hz * 2 + 0.12, P.marble, 0, 0.902, 0);
  for (const [px, pz] of [[-hx, -hz], [hx, -hz], [-hx, hz], [hx, hz]]) {
    addBox(o, 0.05, 0.05, 0.05, P.brass, px, 0.86, pz);
  }

  moldTray(o, P, 0.22, 0.93, 0.02, 0.14, PARTIAL);
  addBall(o, 0.09, 0.035, 0.09, P.dark, -0.55, 0.99, 0.18);
  addCyl(o, 0.1, 0.078, 0.07, P.cream, -0.55, 0.97, 0.18, 14);
  addTorus(o, 0.1, 0.008, P.brass, -0.55, 1.005, 0.18, { rx: Math.PI / 2 });
  const shards = [[0.72, 0.22, 0.3], [0.82, 0.18, -0.2], [0.64, 0.28, 0.9], [0.78, 0.12, 1.4], [0.6, 0.26, -0.6]];
  for (const [sx, sz, ry] of shards) {
    const b = addBox(o, 0.06, 0.025, 0.04, P.dark, sx, 0.945, sz);
    b.rotation.y = ry;
  }
  addCyl(o, 0.11, 0.11, 0.008, P.cocoa, 0.35, 0.936, -0.18, 16);
  addCone(o, 0.045, 0.26, P.cream, 0.55, 0.98, -0.22, { rz: Math.PI / 2.3, seg: 10 });
  addCyl(o, 0.012, 0.012, 0.16, P.woodLight, 0.68, 0.96, -0.12, 6, { rz: Math.PI / 2.2 });
  const blade = addBox(o, 0.26, 0.006, 0.04, P.steel, 0.15, 0.938, 0.28);
  blade.rotation.y = -0.6;
  addCyl(o, 0.012, 0.014, 0.1, P.wood, -0.02, 0.94, 0.22, 6, { rz: 1.1, ry: -0.6 });
  addCyl(o, 0.08, 0.09, 0.03, P.steelDark, -0.2, 0.95, 0.3, 12);
  addCyl(o, 0.045, 0.045, 0.012, P.cream, -0.2, 0.97, 0.3, 12);
  addBox(o, 0.22, 0.02, 0.14, P.cream, -0.95, 0.94, -0.05);
  addBox(o, 0.16, 0.02, 0.12, P.white, -0.9, 0.96, -0.02);
  return o;
}

function wrapCounter(g, P, x, z) {
  const o = grp(g, x, 0, z, 0);
  addBox(o, 0.5, 0.9, 1.55, P.wood, 0, 0.45, 0);
  addBox(o, 0.56, 0.05, 1.66, P.woodLight, 0, 0.925, 0);
  addBox(o, 0.58, 0.035, 1.7, P.marble, 0, 0.965, 0);
  addBox(o, 0.42, 0.08, 1.4, P.inset, 0, 0.08, 0);
  addBox(o, 0.02, 0.7, 1.5, P.woodDark, -0.26, 0.5, 0);
  for (const pz of [-0.5, 0.15, 0.7]) addBox(o, 0.03, 0.55, 0.03, P.brassDark, -0.27, 0.48, pz);
  const bars = [
    [0.04, 0.22, 0.1, P.gold, P.berry],
    [0.02, 0.46, -0.15, P.paper, P.gold],
    [-0.05, 0.68, 0.25, P.berry, P.gold],
    [0.07, 0.58, 0.05, P.paper, P.woodDark],
  ];
  for (const [bx, bz, ry, body, band] of bars) {
    const stack = grp(o, bx, 1.0, bz, ry);
    addBox(stack, 0.12, 0.045, 0.07, body, 0, 0.025, 0);
    addBox(stack, 0.12, 0.045, 0.07, body, 0, 0.072, 0);
    addBox(stack, 0.026, 0.096, 0.074, band, 0, 0.048, 0);
    addTorus(stack, 0.016, 0.0045, band, 0.02, 0.11, 0.02, { rx: Math.PI / 2 });
    addTorus(stack, 0.016, 0.0045, band, -0.01, 0.105, 0.02, { rx: Math.PI / 2, ry: 0.8 });
  }
  const bag = grp(o, -0.02, 1.0, 0.0, 0.3);
  addBox(bag, 0.16, 0.2, 0.1, P.paper, 0, 0.1, 0);
  addBox(bag, 0.164, 0.028, 0.104, P.berry, 0, 0.15, 0);
  addTorus(bag, 0.028, 0.004, P.kraft, -0.04, 0.2, 0, { rx: Math.PI / 2 });
  addTorus(bag, 0.028, 0.004, P.kraft, 0.04, 0.2, 0, { rx: Math.PI / 2 });
  const bag2 = grp(o, 0.08, 1.0, -0.42, -0.2);
  addBox(bag2, 0.14, 0.16, 0.09, P.kraft, 0, 0.08, 0);
  return o;
}

function temperStation(g, P, x, z) {
  const o = grp(g, x, 0, z, 0);
  addBox(o, 0.78, 0.7, 0.58, P.wood, 0, 0.35, 0);
  addBox(o, 0.84, 0.05, 0.64, P.marble, 0, 0.72, 0);
  addCyl(o, 0.16, 0.14, 0.2, P.copper, -0.12, 0.85, 0.02, 16);
  addCyl(o, 0.17, 0.17, 0.02, P.copperDark, -0.12, 0.96, 0.02, 16);
  addCyl(o, 0.1, 0.11, 0.06, P.dark, -0.12, 0.95, 0.02, 12);
  addTorus(o, 0.1, 0.012, P.copperDark, 0.06, 0.88, 0.02, { arc: Math.PI, ry: Math.PI / 2 });
  addCyl(o, 0.012, 0.012, 0.22, P.woodLight, -0.02, 1.02, 0.08, 6, { rx: 0.7, rz: 0.4 });
  addCyl(o, 0.2, 0.2, 0.012, P.cocoa, 0.18, 0.752, -0.04, 16);
  addBox(o, 0.16, 0.008, 0.05, P.steel, 0.22, 0.76, 0.12);
  addTorus(o, 0.15, 0.012, P.ember, -0.12, 0.755, 0.02, { rx: Math.PI / 2 });
  addCyl(o, 0.05, 0.06, 0.16, P.steelDark, 0.28, 0.82, -0.12, 8);
  return o;
}

function coolingRack(g, P, x, z) {
  const o = grp(g, x, 0, z, 0);
  for (const [px, pz] of [[-0.28, -0.16], [0.28, -0.16], [-0.28, 0.16], [0.28, 0.16]]) {
    addBox(o, 0.025, 1.62, 0.025, P.steelDark, px, 0.81, pz);
  }
  const levels = [0.32, 0.62, 0.94, 1.26, 1.52];
  levels.forEach((y, i) => {
    addBox(o, 0.56, 0.015, 0.015, P.steel, 0, y, -0.16);
    addBox(o, 0.56, 0.015, 0.015, P.steel, 0, y, 0.16);
    if (i === 1) return;
    const pull = i === 2 ? 0.18 : 0;
    const mask = i === 2 ? PARTIAL : i === 4 ? null : i === 3 ? EMPTY : FULL;
    moldTray(o, P, 0, y + 0.01, pull, 0, mask);
  });
  return o;
}

function ingredientCart(g, P, x, z) {
  const o = grp(g, x, 0, z, 0.2);
  for (const [px, pz] of [[-0.26, -0.16], [0.26, -0.16], [-0.26, 0.16], [0.26, 0.16]]) {
    addBox(o, 0.04, 0.58, 0.04, P.woodDark, px, 0.32, pz);
    addCyl(o, 0.04, 0.04, 0.03, P.steelDark, px, 0.03, pz, 8);
  }
  addBox(o, 0.62, 0.045, 0.4, P.woodLight, 0, 0.62, 0);
  addBox(o, 0.36, 0.12, 0.24, P.woodMid, 0.06, 0.72, 0);
  const pods = [[0.0, 0.8, 0.02, 0.4], [0.1, 0.82, -0.04, 1.2], [-0.02, 0.84, 0.06, -0.5], [0.14, 0.8, 0.05, 0.8]];
  for (const [px, py, pz, ry] of pods) {
    const pod = addBall(o, 0.045, 0.028, 0.03, P.copper, px, py, pz);
    pod.rotation.y = ry;
  }
  addCyl(o, 0.02, 0.016, 0.16, P.wood, -0.18, 0.7, 0.05, 6, { rz: 0.9 });
  return o;
}

function sack(g, P, x, z, s, ry) {
  const o = grp(g, x, 0, z, ry);
  addBall(o, 0.28 * s, 0.22 * s, 0.24 * s, P.burlap, 0, 0.2 * s, 0);
  addCyl(o, 0.08 * s, 0.1 * s, 0.1 * s, P.burlap, 0, 0.4 * s, 0, 10);
  addTorus(o, 0.09 * s, 0.012 * s, P.woodDark, 0, 0.38 * s, 0, { rx: Math.PI / 2 });
  return o;
}

function crate(g, P, x, z) {
  const o = grp(g, x, 0, z, 0.15);
  addBox(o, 0.52, 0.06, 0.36, P.woodDark, 0, 0.12, 0);
  for (let i = 0; i < 4; i++) addBox(o, 0.52, 0.04, 0.03, P.woodLight, 0, 0.2 + i * 0.06, 0.16);
  for (let i = 0; i < 4; i++) addBox(o, 0.52, 0.04, 0.03, P.wood, 0, 0.2 + i * 0.06, -0.16);
  addBox(o, 0.03, 0.28, 0.36, P.woodMid, -0.25, 0.28, 0);
  addBox(o, 0.03, 0.28, 0.36, P.woodMid, 0.25, 0.28, 0);
  const colors = [P.copper, P.gold, P.leaf, P.copperDark, P.woodLight];
  const spots = [[-0.08, 0.02], [0.06, -0.04], [0.12, 0.06], [-0.12, -0.06], [0.0, 0.08]];
  spots.forEach(([px, pz], i) => {
    const pod = addBall(o, 0.055, 0.034, 0.038, colors[i], px, 0.4, pz);
    pod.rotation.y = i;
    pod.rotation.z = 0.4;
  });
  return o;
}

function foliage(g, P, x, y, z, s) {
  addCyl(g, 0.012 * s, 0.016 * s, 0.1 * s, P.wood, x, y + 0.05 * s, z, 6);
  addBall(g, 0.16 * s, 0.12 * s, 0.14 * s, P.leaf, x, y + 0.16 * s, z);
  addBall(g, 0.1 * s, 0.09 * s, 0.1 * s, P.leafDark, x + 0.08 * s, y + 0.22 * s, z - 0.03 * s);
  addBall(g, 0.08 * s, 0.07 * s, 0.08 * s, P.leaf, x - 0.06 * s, y + 0.2 * s, z + 0.05 * s);
}

function lectern(g, P, x, z) {
  const o = grp(g, x, 0, z, 0);
  addBox(o, 0.38, 0.04, 0.28, P.woodDark, 0, 0.02, 0);
  addBox(o, 0.07, 0.92, 0.07, P.wood, 0, 0.48, 0);
  const tilt = grp(o, 0, 1.18, 0.02, 0);
  tilt.rotation.x = -0.28;
  addBox(tilt, 0.62, 0.78, 0.03, P.woodDark, 0, 0, 0);
  const page = new THREE.Mesh(new THREE.PlaneGeometry(0.54, 0.68), P.menu);
  page.position.z = 0.02;
  page.userData.noCast = true;
  tilt.add(page);
  return o;
}

function partition(g, P, layout, A) {
  const z = layout.anchors.partitionZ;
  const x1 = layout.anchors.partitionX1;
  const x0 = A.innerLeft + 0.02;
  const mid = (x0 + x1) / 2;
  const span = x1 - x0;
  addBox(g, span, 0.98, 0.06, P.wood, mid, 0.49, z);
  addBox(g, span, 0.05, 0.1, P.woodLight, mid, 1.02, z);
  addBox(g, span - 0.08, 1.02, 0.02, P.glass, mid, 1.58, z, { cast: false, receive: false });
  for (let x = x0 + 0.35; x < x1 - 0.1; x += 0.55) {
    addBox(g, 0.035, 1.02, 0.045, P.woodMid, x, 1.56, z);
  }
  addBox(g, span, 0.06, 0.08, P.woodDark, mid, 2.12, z);
  addBox(g, 0.08, 2.16, 0.1, P.woodDark, x1, 1.08, z);
  addBox(g, 0.7, 0.04, 0.32, P.woodLight, mid + 0.2, 1.04, z + 0.02);
  piece(g, P, { x: mid + 0.02, shape: 'dome', mat: 'ruby', nib: true }, 1.06, z + 0.08);
  piece(g, P, { x: mid + 0.16, shape: 'square', mat: 'dark' }, 1.06, z + 0.08);
  piece(g, P, { x: mid + 0.3, shape: 'dome', mat: 'gold' }, 1.06, z + 0.06);
  const menu = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.88), P.menu);
  menu.position.set(-3.7, 1.62, z + 0.05);
  menu.userData.noCast = true;
  g.add(menu);
}

function heroBonbon(g, P, layout) {
  const p = layout.instances.find((i) => i.id === 'plinth');
  const y = layout.assets.plinth.targetHeight;
  const [x, , z] = p.position;
  addCyl(g, 0.11, 0.11, 0.015, P.gold, x, y + 0.01, z, 16);
  addBall(g, 0.09, 0.078, 0.09, P.dark, x, y + 0.09, z);
  addBox(g, 0.1, 0.012, 0.018, P.gold, x, y + 0.1, z);
  addBall(g, 0.014, 0.008, 0.012, P.gold, x + 0.035, y + 0.15, z + 0.02);
}

function pendantDressing(g, P, layout, A) {
  const h = layout.assets.pendant_lamp.targetHeight;
  for (const inst of layout.instances) {
    if (inst.kind !== 'pendant_lamp') continue;
    const [x, y, z] = inst.position;
    const top = y + h;
    const cordH = A.beamBottom - top;
    if (cordH > 0.05) addCyl(g, 0.007, 0.007, cordH, P.brassDark, x, top + cordH / 2, z, 6);
    addBall(g, 0.04, 0.035, 0.04, P.bulb, x, y + 0.05, z);
  }
  const lamp = layout.instances.find((i) => i.id === 'task_lamp');
  if (lamp) {
    const [x, y, z] = lamp.position;
    addBall(g, 0.035, 0.03, 0.04, P.bulb, x, y + 0.24, z + 0.06);
  }
}

function tastingFlight(g, P) {
  addCyl(g, 0.11, 0.11, 0.015, P.cream, -2.7, 0.75, 2.55, 16);
  piece(g, P, { x: -2.76, shape: 'square', mat: 'dark' }, 0.758, 2.52);
  piece(g, P, { x: -2.66, shape: 'dome', mat: 'ruby', nib: true }, 0.758, 2.58);
  piece(g, P, { x: -2.64, shape: 'square', mat: 'milk' }, 0.758, 2.48);
}

function packingGoods(g, P, layout) {
  const t = layout.instances.find((i) => i.id === 'pack_table');
  const y = layout.assets.square_table.targetHeight;
  const [x, , z] = t.position;
  addBox(g, 0.24, 0.1, 0.16, P.kraft, x - 0.22, y + 0.05, z - 0.02);
  addBox(g, 0.2, 0.12, 0.14, P.kraft, x + 0.18, y + 0.06, z + 0.06);
  addBox(g, 0.2, 0.03, 0.14, P.berry, x + 0.18, y + 0.135, z + 0.06);
  moldTray(g, P, x - 0.05, y, z + 0.12, -0.4, PARTIAL);
}

function makeProcedural(layout) {
  const g = new THREE.Group();
  g.name = 'procedural';
  const P = palette();
  const A = metrics(layout);
  const an = layout.anchors;

  marbleIsland(g, P, an.island[0], an.island[1]);
  displayCase(g, P, an.case[0], an.case[1]);
  wrapCounter(g, P, an.counter[0], an.counter[1]);
  temperStation(g, P, an.temper[0], an.temper[1]);
  coolingRack(g, P, an.rack[0], an.rack[1]);
  ingredientCart(g, P, an.cart[0], an.cart[1]);
  crate(g, P, an.crate[0], an.crate[1]);
  sack(g, P, an.sacks[0][0], an.sacks[0][1], 1.05, 0.3);
  sack(g, P, an.sacks[1][0], an.sacks[1][1], 0.82, -0.5);
  partition(g, P, layout, A);
  lectern(g, P, an.lectern[0], an.lectern[1]);
  heroBonbon(g, P, layout);
  pendantDressing(g, P, layout, A);
  tastingFlight(g, P);
  packingGoods(g, P, layout);

  const rug = addBox(g, 1.85, 0.015, 1.85, P.rug, -2.7, 0.012, 2.55);
  rug.userData.noCast = true;
  addBox(g, 0.9, 0.012, 1.35, P.cocoa, 1.65, 0.01, 2.35);
  addBox(g, 0.02, 0.008, 1.2, P.brass, 1.28, 0.018, 2.35);
  addBox(g, 0.02, 0.008, 1.2, P.brass, 2.02, 0.018, 2.35);
  const diamond = addBox(g, 0.55, 0.01, 0.55, P.cocoa, 1.65, 0.008, 3.3);
  diamond.rotation.y = Math.PI / 4;

  addBox(g, 1.7, 0.008, 1.05, P.inset, an.island[0], 0.005, an.island[1]);

  for (const id of ['pot_sill_a', 'pot_sill_b', 'pot_floor']) {
    const inst = layout.instances.find((i) => i.id === id);
    const scale = typeof inst.scale === 'number' ? inst.scale : 1;
    const h = layout.assets.flowerpot.targetHeight * scale;
    foliage(g, P, inst.position[0], inst.position[1] + h * 0.85, inst.position[2], id === 'pot_floor' ? 1.2 : 0.55);
  }

  contact(g, an.island[0], an.island[1], 2.5, 1.25, 0.9);
  contact(g, an.case[0], an.case[1], 3.0, 0.85, 0.75);
  contact(g, an.counter[0], an.counter[1], 0.8, 1.85, 0.7);
  contact(g, an.temper[0], an.temper[1], 0.95, 0.75);
  contact(g, an.rack[0], an.rack[1], 0.7, 0.55);
  contact(g, an.cart[0], an.cart[1], 0.8, 0.6);
  contact(g, an.crate[0], an.crate[1], 0.65, 0.5);
  contact(g, an.sacks[0][0], an.sacks[0][1], 0.6, 0.5);
  contact(g, an.sacks[1][0], an.sacks[1][1], 0.5, 0.42);
  contact(g, -0.75, 2.65, 0.48, 0.48, 0.8);
  contact(g, 3.5, -1.75, 1.35, 1.05, 0.65);
  contact(g, -1.15, -0.55, 0.46, 0.46, 0.7);
  contact(g, 5.02, 2.05, 0.46, 0.46, 0.65);
  contact(g, 5.02, 2.78, 0.46, 0.46, 0.65);
  contact(g, -5.08, -2.72, 0.55, 0.95, 0.55);
  contact(g, -5.08, -1.15, 0.55, 0.95, 0.55);
  contact(g, 3.5, -0.95, 0.42, 0.5, 0.6);

  return g;
}

boot({
  makeShell,
  makeProcedural,
  readyText: 'ready — maison cacao · drag orbit · U unlit · T toon',
}).catch((err) => {
  console.error(err);
  const status = document.getElementById('status');
  if (status) status.textContent = `error: ${err.message}`;
});
