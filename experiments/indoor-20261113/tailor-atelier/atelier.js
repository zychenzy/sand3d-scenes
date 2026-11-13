import * as THREE from 'three';
import { boot, toon, addBox, addCyl } from './scene_lib.js';

const WOOD = {
  walnut: '#5c3d2a',
  dark: '#3a2418',
  maple: '#e4c48a',
  mapleDeep: '#c49a62',
  brass: '#b08a4f',
  brassDeep: '#7a5e32',
};

function canvasTex(draw, w = 128, h = 128) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = THREE.RepeatWrapping;
  t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 4;
  t.needsUpdate = true;
  return t;
}

function plankMaps() {
  const w = 512;
  const h = 512;
  const plank = 40;
  const color = document.createElement('canvas');
  color.width = w;
  color.height = h;
  const ctx = color.getContext('2d');
  const cols = ['#c4a06a', '#d2ae76', '#b89258', '#c9a56e', '#d8b27e', '#be9860', '#cdb07a', '#a88450'];
  const height = new Float32Array(w * h);
  ctx.fillStyle = '#b89258';
  ctx.fillRect(0, 0, w, h);
  const boards = Math.ceil(w / plank);
  for (let i = 0; i < boards; i++) {
    const x0 = i * plank;
    ctx.fillStyle = cols[i % cols.length];
    ctx.fillRect(x0, 0, plank, h);
    ctx.fillStyle = 'rgba(255,236,210,0.07)';
    for (let g = 0; g < 5; g++) {
      const gx = x0 + 4 + ((i * 11 + g * 7) % (plank - 8));
      ctx.fillRect(gx, 0, 1, h);
    }
    if (i % 3 === 0) {
      ctx.fillStyle = 'rgba(92,58,28,0.28)';
      ctx.beginPath();
      ctx.ellipse(x0 + plank * 0.45, ((i * 47) % 380) + 40, 5, 8, 0.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = 'rgba(62,36,16,0.55)';
    ctx.fillRect(x0, 0, 2, h);
    ctx.fillStyle = 'rgba(255,244,220,0.16)';
    ctx.fillRect(x0 + 2, 0, 1, h);
    const joint = (i % 2) === 0 ? 0.5 : 0.04;
    ctx.fillStyle = 'rgba(48,28,12,0.7)';
    ctx.fillRect(x0 + 2, Math.floor(joint * h), plank - 3, 3);
    ctx.fillStyle = 'rgba(255,236,210,0.12)';
    ctx.fillRect(x0 + 2, Math.floor(joint * h) + 3, plank - 3, 1);
  }
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = Math.floor(x / plank);
      const local = x - i * plank;
      const joint = (i % 2) === 0 ? 0.5 : 0.04;
      const jy = y / h;
      const dj = Math.min(Math.abs(jy - joint), Math.abs(jy - joint + 1), Math.abs(jy - joint - 1));
      let hh = 0.72 + ((i % 5) - 2) * 0.03;
      hh += Math.sin(y * 0.08 + i) * 0.04;
      if (local < 2) hh = 0.08;
      else if (local < 4) hh = 0.4;
      if (dj < 0.008) hh = 0.06;
      else if (dj < 0.016) hh = Math.min(hh, 0.35);
      height[y * w + x] = hh;
    }
  }
  const normal = document.createElement('canvas');
  normal.width = w;
  normal.height = h;
  const nctx = normal.getContext('2d');
  const img = nctx.createImageData(w, h);
  const data = img.data;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const xm = height[y * w + ((x - 1 + w) % w)];
      const xp = height[y * w + ((x + 1) % w)];
      const ym = height[((y - 1 + h) % h) * w + x];
      const yp = height[((y + 1) % h) * w + x];
      let nx = (xm - xp) * 3.2;
      let ny = (ym - yp) * 3.2;
      let nz = 1;
      const len = Math.hypot(nx, ny, nz) || 1;
      const o = (y * w + x) * 4;
      data[o] = (nx / len * 0.5 + 0.5) * 255;
      data[o + 1] = (ny / len * 0.5 + 0.5) * 255;
      data[o + 2] = (nz / len * 0.5 + 0.5) * 255;
      data[o + 3] = 255;
    }
  }
  nctx.putImageData(img, 0, 0);
  const colorTex = new THREE.CanvasTexture(color);
  colorTex.colorSpace = THREE.SRGBColorSpace;
  colorTex.wrapS = THREE.RepeatWrapping;
  colorTex.wrapT = THREE.RepeatWrapping;
  colorTex.anisotropy = 8;
  colorTex.repeat.set(7.6, 3.5);
  const normalTex = new THREE.CanvasTexture(normal);
  normalTex.colorSpace = THREE.NoColorSpace;
  normalTex.wrapS = THREE.RepeatWrapping;
  normalTex.wrapT = THREE.RepeatWrapping;
  normalTex.anisotropy = 8;
  normalTex.repeat.set(7.6, 3.5);
  return { colorTex, normalTex };
}

function runnerTex() {
  return canvasTex((ctx, w, h) => {
    ctx.fillStyle = '#6e2430';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#4c1822';
    ctx.fillRect(0, 0, 10, h);
    ctx.fillRect(w - 10, 0, 10, h);
    ctx.fillStyle = 'rgba(232, 196, 140, 0.35)';
    ctx.fillRect(14, 0, 3, h);
    ctx.fillRect(w - 17, 0, 3, h);
    ctx.strokeStyle = 'rgba(0,0,0,0.15)';
    ctx.lineWidth = 1;
    for (let y = 0; y < h; y += 4) {
      ctx.beginPath();
      ctx.moveTo(18, y);
      ctx.lineTo(w - 18, y);
      ctx.stroke();
    }
  }, 64, 128);
}

function weave(a, b) {
  return canvasTex((ctx, w, h) => {
    ctx.fillStyle = a;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = b;
    for (let y = 0; y < h; y += 4) ctx.fillRect(0, y, w, 1);
    ctx.fillStyle = 'rgba(255,255,255,0.05)';
    for (let x = 0; x < w; x += 4) ctx.fillRect(x, 0, 1, h);
  });
}

function herringbone(a, b) {
  return canvasTex((ctx, w, h) => {
    ctx.fillStyle = a;
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = b;
    ctx.lineWidth = 2;
    for (let y = -8; y < h + 8; y += 8) {
      for (let x = -16; x < w + 16; x += 16) {
        const o = ((y / 8) % 2) ? 8 : 0;
        ctx.beginPath();
        ctx.moveTo(x + o, y);
        ctx.lineTo(x + o + 8, y + 8);
        ctx.stroke();
      }
    }
  });
}

function chalkstripe(a, line) {
  return canvasTex((ctx, w, h) => {
    ctx.fillStyle = a;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(255,255,255,0.04)';
    for (let y = 0; y < h; y += 3) ctx.fillRect(0, y, w, 1);
    ctx.fillStyle = line;
    for (let x = 6; x < w; x += 14) ctx.fillRect(x, 0, 1, h);
  });
}

function tweed(a, b, c) {
  return canvasTex((ctx, w, h) => {
    ctx.fillStyle = a;
    ctx.fillRect(0, 0, w, h);
    const specks = [b, c, '#d8c89a', a];
    for (let i = 0; i < 280; i++) {
      ctx.fillStyle = specks[i % specks.length];
      ctx.fillRect((i * 37) % w, (i * 19) % h, 2, 2);
    }
  });
}

function kraft() {
  return canvasTex((ctx, w, h) => {
    ctx.fillStyle = '#e6d3a4';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(90,60,30,0.18)';
    ctx.lineWidth = 1;
    for (let x = 16; x < w; x += 16) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = 16; y < h; y += 16) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }
  }, 256, 256);
}

function swatchPage() {
  return canvasTex((ctx, w, h) => {
    const cols = ['#1c2740', '#3c4148', '#6a4c38', '#5d6244', '#8e9498', '#c8b48a', '#6e2430', '#2c3338', '#a09078'];
    const cw = w / 3;
    const ch = h / 3;
    cols.forEach((col, i) => {
      ctx.fillStyle = col;
      ctx.fillRect((i % 3) * cw + 4, Math.floor(i / 3) * ch + 4, cw - 8, ch - 8);
    });
  }, 192, 192);
}

function labelTex(text) {
  return canvasTex((ctx, w, h) => {
    ctx.fillStyle = '#3a2418';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#b08a4f';
    ctx.lineWidth = 8;
    ctx.strokeRect(8, 8, w - 16, h - 16);
    ctx.fillStyle = '#f0d7a4';
    ctx.font = '600 72px Georgia, Times New Roman, serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, w / 2, h / 2 + 4);
  }, 512, 128);
}

function tapeTex() {
  return canvasTex((ctx, w, h) => {
    ctx.fillStyle = '#e6c84a';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#1c1c1c';
    for (let y = 0; y < h; y += 8) ctx.fillRect(w * 0.62, y, y % 32 === 0 ? w * 0.3 : w * 0.16, 2);
  }, 32, 256);
}

const FLOOR = plankMaps();

const TEX = {
  navy: weave('#1c2740', '#2a3c5c'),
  charcoal: chalkstripe('#3c4148', '#d5d0c4'),
  herring: herringbone('#6d4e3a', '#3e2c22'),
  tweed: tweed('#5d6244', '#c2ad72', '#2a2e22'),
  flannel: weave('#9aa1a6', '#c5cbcf'),
  canvas: weave('#e6d4b0', '#c9b48a'),
  muslin: weave('#f0e4cc', '#e4d2b0'),
  maple: weave('#e4c48a', '#d2ae72'),
  floor: FLOOR.colorTex,
  floorNormal: FLOOR.normalTex,
  runner: runnerTex(),
  kraft: kraft(),
  swatch: swatchPage(),
  fitting: labelTex('FITTING'),
  tape: tapeTex(),
};

function cloth(tex) {
  return toon('#ffffff', { map: tex });
}

function contact(g, x, z, rx, rz) {
  const m = new THREE.Mesh(
    new THREE.CircleGeometry(1, 18),
    toon('#241810', { transparent: true, opacity: 0.22, depthWrite: false })
  );
  m.rotation.x = -Math.PI / 2;
  m.position.set(x, 0.007, z);
  m.scale.set(rx, rz, 1);
  m.userData.noShadow = true;
  g.add(m);
  return m;
}

function windowBack(g, x0, x1, y0, y1, D) {
  const wood = toon(WOOD.walnut);
  const paneMat = toon('#d5e6f0', { emissive: '#d7e7f2', emissiveIntensity: 0.5 });
  const z = -D / 2 + 0.08;
  const cx = (x0 + x1) / 2;
  const cy = (y0 + y1) / 2;
  const w = x1 - x0;
  const h = y1 - y0;
  const pane = addBox(g, w - 0.1, h - 0.1, 0.015, paneMat, cx, cy, z);
  pane.userData.noShadow = true;
  addBox(g, w, 0.055, 0.05, wood, cx, y0, z + 0.02);
  addBox(g, w, 0.055, 0.05, wood, cx, y1, z + 0.02);
  addBox(g, 0.05, h, 0.05, wood, x0, cy, z + 0.02);
  addBox(g, 0.05, h, 0.05, wood, x1, cy, z + 0.02);
  addBox(g, 0.03, h - 0.12, 0.035, wood, cx, cy, z + 0.03);
  addBox(g, w - 0.12, 0.03, 0.035, wood, cx, cy, z + 0.03);
}

function windowLeft(g, z0, z1, y0, y1, W) {
  const wood = toon(WOOD.walnut);
  const paneMat = toon('#d5e6f0', { emissive: '#d7e7f2', emissiveIntensity: 0.5 });
  const x = -W / 2 + 0.08;
  const cz = (z0 + z1) / 2;
  const cy = (y0 + y1) / 2;
  const d = z1 - z0;
  const h = y1 - y0;
  const pane = addBox(g, 0.015, h - 0.1, d - 0.1, paneMat, x, cy, cz);
  pane.userData.noShadow = true;
  addBox(g, 0.05, 0.055, d, wood, x + 0.02, y0, cz);
  addBox(g, 0.05, 0.055, d, wood, x + 0.02, y1, cz);
  addBox(g, 0.05, h, 0.05, wood, x + 0.02, cy, z0);
  addBox(g, 0.05, h, 0.05, wood, x + 0.02, cy, z1);
  addBox(g, 0.035, h - 0.12, 0.03, wood, x + 0.03, cy, cz);
}

export function makeShell(layout) {
  const g = new THREE.Group();
  g.name = 'shell';
  const { width: W, depth: D, height: H } = layout.meta.room;
  const s = layout.shell;
  const plaster = toon(s.wallColor);
  const wood = toon(s.woodColor);
  const alcoveMat = toon(s.alcoveColor);
  const floorSide = toon(WOOD.mapleDeep);
  const floorTop = toon('#ffffff', {
    map: TEX.floor,
    normalMap: TEX.floorNormal,
    normalScale: new THREE.Vector2(0.7, 0.7),
  });
  const floor = new THREE.Mesh(new THREE.BoxGeometry(W, 0.08, D), [
    floorSide, floorSide, floorTop, floorSide, floorSide, floorSide,
  ]);
  floor.position.y = -0.04;
  floor.receiveShadow = true;
  g.add(floor);

  addBox(g, W - 0.4, 0.01, 0.045, wood, 0, 0.008, -D / 2 + 0.2);
  addBox(g, 0.045, 0.01, D - 0.4, wood, -W / 2 + 0.2, 0.008, 0);

  const back = new THREE.Mesh(new THREE.BoxGeometry(W, H, 0.12), plaster);
  back.position.set(0, H / 2, -D / 2);
  back.receiveShadow = true;
  back.castShadow = false;
  g.add(back);
  const left = new THREE.Mesh(new THREE.BoxGeometry(0.12, H, D), plaster);
  left.position.set(-W / 2, H / 2, 0);
  left.receiveShadow = true;
  g.add(left);

  const dado = 1.05;
  addBox(g, W - 0.2, 0.04, 0.04, wood, 0, dado, -D / 2 + 0.08);
  addBox(g, 0.04, 0.04, 3.6, wood, -W / 2 + 0.08, dado, -2.2);
  for (let x = -5.2; x <= 5.2; x += 1.15) {
    addBox(g, 0.035, dado - 0.04, 0.025, wood, x, dado / 2, -D / 2 + 0.075);
  }
  for (let z = -3.8; z <= -0.4; z += 1.15) {
    addBox(g, 0.025, dado - 0.04, 0.035, wood, -W / 2 + 0.075, dado / 2, z);
  }
  addBox(g, W - 0.3, 0.035, 0.03, wood, 0, 2.82, -D / 2 + 0.08);

  windowBack(g, -0.55, 1.45, 1.82, 2.58, D);
  windowBack(g, 2.75, 4.45, 1.48, 2.42, D);
  windowBack(g, -1.95, -1.15, 1.25, 2.45, D);
  windowLeft(g, -3.45, -0.85, 1.98, 2.68, W);

  const a = layout.zones.alcove;
  const midX = (a.x0 + a.x1) / 2;
  const alcoveW = a.x1 - a.x0;
  addBox(g, alcoveW, 1.05, 0.08, alcoveMat, midX, 0.525, a.z0);
  addBox(g, 0.1, 2.2, 0.22, alcoveMat, a.x1, 1.1, a.doorZ0 + 0.04);
  addBox(g, alcoveW, a.dadoH, 0.08, wood, midX, a.dadoH / 2, a.z1);
  addBox(g, 0.04, H - 0.3, a.z1 - a.z0 - 0.12, alcoveMat, -W / 2 + 0.1, H / 2 - 0.05, (a.z0 + a.z1) / 2);
  addBox(g, alcoveW - 0.16, 0.06, a.z1 - a.z0 - 0.16, toon('#1b2823'), midX, 2.58, (a.z0 + a.z1) / 2);
  addBox(g, 0.08, 0.1, a.z1 - a.doorZ0, wood, a.x1, 2.32, (a.doorZ0 + a.z1) / 2);

  const ceil = addBox(g, W - 0.5, 0.08, D * 0.58, toon(s.ceilingColor), -0.15, H - 0.04, -D * 0.18);
  ceil.castShadow = false;
  addBox(g, W - 1.1, 0.1, 0.08, wood, -0.2, H - 0.16, -2.7);
  addBox(g, W - 1.1, 0.1, 0.08, wood, -0.2, H - 0.16, -0.55);

  return g;
}

function runner(g, x, z, w, d) {
  const m = addBox(g, w, 0.012, d, toon('#ffffff', { map: TEX.runner }), x, 0.012, z);
  m.userData.noShadow = true;
  return m;
}

function flatShape(g, builder, mat, x, y, z, rotZ) {
  const shape = new THREE.Shape();
  builder(shape);
  const mesh = new THREE.Mesh(new THREE.ShapeGeometry(shape), mat);
  mesh.rotation.x = -Math.PI / 2;
  mesh.rotation.z = rotZ;
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  g.add(mesh);
  return mesh;
}

function jacketFront(s) {
  s.moveTo(0, 0);
  s.lineTo(0.4, 0.02);
  s.lineTo(0.44, 0.5);
  s.lineTo(0.3, 0.68);
  s.lineTo(0.14, 0.56);
  s.bezierCurveTo(0.06, 0.4, 0.01, 0.26, 0, 0.14);
  s.closePath();
}

function sleevePat(s) {
  s.moveTo(0.06, 0);
  s.lineTo(0.3, 0.03);
  s.lineTo(0.34, 0.38);
  s.lineTo(0.2, 0.64);
  s.lineTo(0.04, 0.56);
  s.lineTo(0, 0.2);
  s.closePath();
}

function trouserPat(s) {
  s.moveTo(0, 0);
  s.lineTo(0.3, 0.01);
  s.lineTo(0.32, 0.72);
  s.lineTo(0.2, 0.9);
  s.lineTo(0.06, 0.86);
  s.lineTo(0.01, 0.46);
  s.closePath();
}

function buildPlatform(g, p) {
  const wood = toon(WOOD.walnut);
  const brass = toon(WOOD.brass);
  addBox(g, p.w, p.h, p.d, wood, p.x, p.h / 2, p.z);
  addBox(g, p.w - 0.22, 0.012, p.d - 0.22, toon('#3e2c28'), p.x, p.h + 0.006, p.z);
  const front = p.z + p.d / 2;
  const tread = 0.26;
  const stepW = 0.92;
  addBox(g, stepW, p.h, tread, wood, p.x - 0.05, p.h / 2, front + tread * 0.5);
  addBox(g, stepW + 0.06, p.h * 0.5, tread, wood, p.x - 0.05, p.h * 0.25, front + tread * 1.5);
  addBox(g, stepW, 0.015, 0.025, brass, p.x - 0.05, p.h, front + tread);
  addBox(g, stepW + 0.06, 0.012, 0.02, brass, p.x - 0.05, p.h * 0.5, front + tread * 2);
  contact(g, p.x, p.z, p.w * 0.48, p.d * 0.46);
}

function addMesh(g, mesh) {
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  g.add(mesh);
  return mesh;
}

function lathe(profile, mat, zScale) {
  const pts = profile.map(([r, y]) => new THREE.Vector2(r, y));
  const mesh = new THREE.Mesh(new THREE.LatheGeometry(pts, 22), mat);
  mesh.scale.z = zScale;
  return mesh;
}

function placeLimb(mesh, ax, ay, az, bx, by, bz) {
  mesh.position.set((ax + bx) / 2, (ay + by) / 2, (az + bz) / 2);
  const dir = new THREE.Vector3(bx - ax, by - ay, bz - az);
  const len = dir.length() || 1e-4;
  mesh.scale.y = len;
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.multiplyScalar(1 / len));
  return mesh;
}

const TORSO = [
  [0.118, 0.00],
  [0.158, 0.16],
  [0.128, 0.34],
  [0.172, 0.52],
  [0.118, 0.66],
  [0.052, 0.76],
  [0.046, 0.90],
];

const JACKET = [
  [0.178, 0.00],
  [0.192, 0.12],
  [0.158, 0.30],
  [0.196, 0.52],
  [0.142, 0.66],
];

function lapelGeometry() {
  const s = new THREE.Shape();
  s.moveTo(0.0, 0.0);
  s.bezierCurveTo(0.012, 0.12, 0.02, 0.22, 0.028, 0.30);
  s.lineTo(0.09, 0.33);
  s.lineTo(0.118, 0.25);
  s.lineTo(0.168, 0.02);
  s.lineTo(0.055, -0.02);
  s.closePath();
  return new THREE.ExtrudeGeometry(s, {
    depth: 0.012,
    bevelEnabled: true,
    bevelThickness: 0.003,
    bevelSize: 0.003,
    bevelSegments: 1,
  });
}

function addLapels(g, mat, y, z) {
  const lapelMat = mat.clone();
  lapelMat.side = THREE.DoubleSide;
  const geo = lapelGeometry();
  const left = new THREE.Mesh(geo, lapelMat);
  left.position.set(-0.015, y, z);
  left.rotation.y = -0.22;
  addMesh(g, left);
  const flipped = geo.clone();
  flipped.scale(-1, 1, 1);
  flipped.computeVertexNormals();
  const right = new THREE.Mesh(flipped, lapelMat);
  right.position.set(0.015, y, z);
  right.rotation.y = 0.22;
  addMesh(g, right);
}

function bentSleeve(g, side, mat, shoulder, pose) {
  const sx = side * shoulder.x;
  const sy = shoulder.y;
  const sz = shoulder.z;
  const cap = new THREE.Mesh(new THREE.SphereGeometry(0.064, 14, 10), mat);
  cap.scale.set(1.2, 0.7, 0.88);
  cap.position.set(sx, sy, sz);
  addMesh(g, cap);
  const ex = side * pose.ex;
  const ey = pose.ey;
  const ez = pose.ez;
  const upper = new THREE.Mesh(new THREE.CylinderGeometry(0.054, 0.042, 1, 14), mat);
  placeLimb(upper, sx, sy - 0.03, sz, ex, ey, ez);
  addMesh(g, upper);
  const elbow = new THREE.Mesh(new THREE.SphereGeometry(0.04, 12, 8), mat);
  elbow.position.set(ex, ey, ez);
  addMesh(g, elbow);
  const wx = side * pose.wx;
  const wy = pose.wy;
  const wz = pose.wz;
  const fore = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.032, 1, 14), mat);
  placeLimb(fore, ex, ey, ez, wx, wy, wz);
  addMesh(g, fore);
  const cuff = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.034, 0.03, 14), mat);
  cuff.position.set(wx, wy + 0.01, wz);
  addMesh(g, cuff);
}

function collar(g, mat, y) {
  const band = new THREE.Mesh(new THREE.TorusGeometry(0.078, 0.015, 8, 20, Math.PI * 1.25), mat);
  band.rotation.x = Math.PI / 2;
  band.rotation.z = Math.PI * 0.95;
  band.position.set(0, y, -0.012);
  addMesh(g, band);
}

function buttons(g, mat, ys, z) {
  for (const y of ys) {
    const b = new THREE.Mesh(new THREE.SphereGeometry(0.012, 8, 6), mat);
    b.scale.z = 0.45;
    b.position.set(0.012, y, z);
    addMesh(g, b);
  }
}

function pocketFlap(g, mat, x, y, z) {
  const flap = new THREE.Mesh(new THREE.SphereGeometry(0.045, 10, 8), mat);
  flap.scale.set(1.15, 0.55, 0.22);
  flap.position.set(x, y, z);
  addMesh(g, flap);
}

const WORN_ARM = { ex: 0.30, ey: 1.18, ez: 0.07, wx: 0.27, wy: 0.92, wz: 0.08 };
const HANG_ARM = { ex: 0.25, ey: 1.12, ez: 0.03, wx: 0.23, wy: 0.82, wz: 0.04 };

function jacketBody(g, mat, hemY, arm) {
  const body = lathe(JACKET, mat, 0.66);
  body.position.y = hemY;
  addMesh(g, body);
  const shoulderY = hemY + 0.64;
  bentSleeve(g, -1, mat, { x: 0.175, y: shoulderY, z: 0.02 }, {
    ex: arm.ex, ey: hemY + (arm.ey - 0.82), ez: arm.ez,
    wx: arm.wx, wy: hemY + (arm.wy - 0.82), wz: arm.wz,
  });
  bentSleeve(g, 1, mat, { x: 0.175, y: shoulderY, z: 0.02 }, {
    ex: arm.ex, ey: hemY + (arm.ey - 0.82), ez: arm.ez,
    wx: arm.wx, wy: hemY + (arm.wy - 0.82), wz: arm.wz,
  });
  addLapels(g, mat, hemY + 0.34, 0.105);
  collar(g, mat, hemY + 0.62);
  pocketFlap(g, mat, -0.09, hemY + 0.22, 0.118);
  pocketFlap(g, mat, 0.09, hemY + 0.2, 0.116);
  return body;
}

function stitchRun(g, pts) {
  const mat = toon('#f7f4ee');
  for (const [x, y, z] of pts) {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(0.0035, 0.0035, 0.022, 5), mat);
    m.rotation.z = Math.PI / 2;
    m.position.set(x, y, z);
    addMesh(g, m);
  }
}

function neckCap(g, muslin, brass) {
  addCyl(g, 0.046, 0.052, 0.1, muslin, 0, 1.58, 0, 14);
  const cap = new THREE.Mesh(new THREE.SphereGeometry(0.05, 14, 10), brass);
  cap.scale.y = 0.55;
  cap.position.set(0, 1.65, 0);
  addMesh(g, cap);
}

function trouserSide(g, side, mat, waistY, hemY) {
  const hip = { x: side * 0.09, y: waistY, z: 0.01 };
  const knee = { x: side * 0.105, y: (waistY + hemY) * 0.5 + 0.02, z: 0.02 };
  const hem = { x: side * 0.115, y: hemY + 0.05, z: 0.035 };
  const thigh = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.056, 1, 16), mat);
  placeLimb(thigh, hip.x, hip.y, hip.z, knee.x, knee.y, knee.z);
  addMesh(g, thigh);
  const k = new THREE.Mesh(new THREE.SphereGeometry(0.052, 12, 8), mat);
  k.scale.set(1.05, 0.8, 0.95);
  k.position.set(knee.x, knee.y, knee.z);
  addMesh(g, k);
  const shin = new THREE.Mesh(new THREE.CylinderGeometry(0.054, 0.044, 1, 16), mat);
  placeLimb(shin, knee.x, knee.y, knee.z, hem.x, hem.y, hem.z);
  addMesh(g, shin);
  const cuff = new THREE.Mesh(new THREE.CylinderGeometry(0.048, 0.05, 0.04, 16), mat);
  cuff.position.set(hem.x, hem.y - 0.01, hem.z);
  addMesh(g, cuff);
}

function trousers(g, mat, waistY, hemY) {
  const hip = new THREE.Mesh(new THREE.SphereGeometry(0.155, 16, 12), mat);
  hip.scale.set(1.12, 0.38, 0.78);
  hip.position.set(0, waistY + 0.02, 0.01);
  addMesh(g, hip);
  const band = new THREE.Mesh(new THREE.CylinderGeometry(0.145, 0.15, 0.045, 18), mat);
  band.scale.z = 0.78;
  band.position.set(0, waistY + 0.06, 0.01);
  addMesh(g, band);
  trouserSide(g, -1, mat, waistY, hemY);
  trouserSide(g, 1, mat, waistY, hemY);
}

function formStand(g) {
  const walnut = toon(WOOD.dark);
  const brass = toon(WOOD.brass);
  addCyl(g, 0.16, 0.18, 0.04, walnut, 0, 0.02, 0, 16);
  addCyl(g, 0.016, 0.018, 0.72, brass, 0, 0.4, 0, 10);
  addCyl(g, 0.09, 0.11, 0.04, walnut, 0, 0.76, 0, 12);
}

function dressForm(parent, x, z, rot, kind, floorY) {
  const g = new THREE.Group();
  g.position.set(x, floorY, z);
  g.rotation.y = rot;
  parent.add(g);
  const muslin = cloth(TEX.muslin);
  const canvas = cloth(TEX.canvas);
  const brass = toon(WOOD.brass);
  formStand(g);

  if (kind === 'suit') {
    const navy = cloth(TEX.navy);
    trousers(g, navy, 1.02, 0.08);
    jacketBody(g, navy, 0.8, WORN_ARM);
    neckCap(g, muslin, brass);
    const shirt = new THREE.Shape();
    shirt.moveTo(0, 0);
    shirt.lineTo(0.045, 0.14);
    shirt.lineTo(-0.045, 0.14);
    shirt.closePath();
    const vee = new THREE.Mesh(new THREE.ShapeGeometry(shirt), toon('#f4f1ea'));
    vee.position.set(0, 1.26, 0.118);
    addMesh(g, vee);
    buttons(g, brass, [1.22, 1.08, 0.94], 0.128);
    return;
  }

  neckCap(g, muslin, brass);

  if (kind === 'toile') {
    const torso = lathe(TORSO, muslin, 0.7);
    torso.position.y = 0.78;
    addMesh(g, torso);
    const shL = new THREE.Mesh(new THREE.SphereGeometry(0.07, 14, 10), muslin);
    shL.scale.set(1.25, 0.62, 0.8);
    shL.position.set(-0.16, 1.42, 0.01);
    addMesh(g, shL);
    const shR = shL.clone();
    shR.position.x = 0.16;
    addMesh(g, shR);
    const blue = toon('#2a4d86');
    addCyl(g, 0.004, 0.004, 0.55, blue, 0, 1.18, 0.12, 6);
    const chest = addCyl(g, 0.004, 0.004, 0.28, blue, 0, 1.24, 0.12, 6);
    chest.rotation.z = Math.PI / 2;
    stitchRun(g, [
      [-0.1, 0.95, 0.12], [-0.07, 1.05, 0.125], [-0.04, 1.15, 0.13],
      [0.04, 1.15, 0.13], [0.08, 1.05, 0.125], [0.11, 0.95, 0.12],
    ]);
    for (let i = 0; i < 4; i++) {
      const pin = new THREE.Mesh(new THREE.SphereGeometry(0.008, 6, 5), brass);
      pin.position.set(-0.12 + i * 0.015, 1.02 + i * 0.04, 0.13);
      addMesh(g, pin);
    }
    return;
  }

  const wool = cloth(TEX.herring);
  jacketBody(g, wool, 0.86, WORN_ARM);
  const panel = new THREE.Shape();
  panel.moveTo(0, 0);
  panel.lineTo(0.15, 0.02);
  panel.lineTo(0.14, 0.42);
  panel.lineTo(0.02, 0.46);
  panel.closePath();
  const canvasFront = new THREE.Mesh(
    new THREE.ExtrudeGeometry(panel, { depth: 0.012, bevelEnabled: false }),
    canvas
  );
  canvasFront.position.set(0.01, 0.98, 0.108);
  addMesh(g, canvasFront);
  stitchRun(g, [
    [0.03, 1.05, 0.125], [0.05, 1.14, 0.128], [0.07, 1.23, 0.13], [0.1, 1.32, 0.128],
    [-0.14, 1.28, 0.1], [-0.12, 1.2, 0.105], [-0.1, 1.12, 0.1],
  ]);
}

function hanger(g, y) {
  const wood = toon(WOOD.mapleDeep);
  const brass = toon(WOOD.brass);
  addCyl(g, 0.008, 0.008, 0.08, brass, 0, y + 0.08, 0, 6);
  const h1 = addBox(g, 0.2, 0.012, 0.018, wood, -0.08, y, 0);
  h1.rotation.z = 0.42;
  const h2 = addBox(g, 0.2, 0.012, 0.018, wood, 0.08, y, 0);
  h2.rotation.z = -0.42;
}

function hangJacket(g, x, z, yaw, mat) {
  const grp = new THREE.Group();
  grp.position.set(x, 0, z);
  grp.rotation.y = Math.PI / 2 + yaw;
  g.add(grp);
  hanger(grp, 1.5);
  const body = jacketBody(grp, mat, 0.78, HANG_ARM);
  body.rotation.z = yaw * 0.15;
  return grp;
}

function hangTrousers(g, x, z) {
  const grp = new THREE.Group();
  grp.position.set(x, 0, z);
  grp.rotation.y = Math.PI / 2;
  g.add(grp);
  const brass = toon(WOOD.brass);
  const wood = toon(WOOD.mapleDeep);
  addCyl(grp, 0.008, 0.008, 0.1, brass, 0, 1.55, 0, 6);
  addBox(grp, 0.28, 0.012, 0.012, wood, 0, 1.48, 0);
  const mat = cloth(TEX.flannel);
  trouserSide(grp, -1, mat, 1.46, 0.62);
  trouserSide(grp, 1, mat, 1.46, 0.62);
}

function fillCase(g, x, z, seed) {
  const grp = new THREE.Group();
  grp.position.set(x, 0, z);
  grp.rotation.y = Math.PI;
  g.add(grp);
  const scale = 1.98 / 2;
  const tops = [0.029, 0.514, 1.0, 1.486].map((y) => (y + 0.025) * scale);
  const mats = [
    cloth(TEX.navy), cloth(TEX.charcoal), cloth(TEX.herring), cloth(TEX.tweed),
    cloth(TEX.flannel), toon('#c8b48a'), toon('#6e2430'), toon('#2c3338'),
  ];
  tops.forEach((y, si) => {
    const count = si === 0 ? 6 : 8;
    for (let i = 0; i < count; i++) {
      if (si === 2 && i === 6) continue;
      const bw = 0.05 + ((i + seed) % 3) * 0.012;
      const bh = 0.3 + ((i + si + seed) % 4) * 0.018;
      const bx = -0.3 + i * (si === 0 ? 0.09 : 0.075);
      const m = addBox(grp, bw, bh, 0.18, mats[(i + si * 2 + seed) % mats.length], bx, y + bh / 2 + 0.004, -0.03);
      if (si === 1 && i === 3) m.rotation.z = 0.14;
    }
  });
}

function openBook(g, x, y, z) {
  addBox(g, 0.62, 0.03, 0.4, toon(WOOD.dark), x, y, z);
  const page = toon('#ffffff', { map: TEX.swatch, side: THREE.DoubleSide });
  const left = addBox(g, 0.28, 0.01, 0.34, page, x - 0.15, y + 0.025, z);
  left.rotation.y = -0.06;
  const right = addBox(g, 0.28, 0.01, 0.34, page, x + 0.16, y + 0.025, z);
  right.rotation.y = 0.1;
}

const MIRROR_VERT = `
uniform mat4 textureMatrix;
varying vec4 vMirrorUv;
void main() {
  vMirrorUv = textureMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const MIRROR_FRAG = `
uniform sampler2D tDiffuse;
uniform vec3 silver;
varying vec4 vMirrorUv;
void main() {
  vec4 uv = vMirrorUv;
  vec3 refl = texture2DProj(tDiffuse, uv).rgb;
  vec2 p = uv.xy / max(uv.w, 0.0001);
  float streak = smoothstep(0.07, 0.0, abs(p.x - 0.22));
  vec3 col = mix(silver, refl, 0.9);
  col += vec3(0.16, 0.17, 0.16) * streak;
  gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;

const mirrorGlasses = [];
const _reflectorPos = new THREE.Vector3();
const _cameraPos = new THREE.Vector3();
const _rotation = new THREE.Matrix4();
const _normal = new THREE.Vector3();
const _view = new THREE.Vector3();
const _look = new THREE.Vector3();
const _target = new THREE.Vector3();
const _up = new THREE.Vector3();
const _q = new THREE.Vector4();
const _clip = new THREE.Vector4();

function mirrorMaterial(rt) {
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      tDiffuse: { value: rt.texture },
      textureMatrix: { value: new THREE.Matrix4() },
      silver: { value: new THREE.Color('#d5e2e6') },
    },
    vertexShader: MIRROR_VERT,
    fragmentShader: MIRROR_FRAG,
  });
  mat.userData.keep = true;
  return mat;
}

function mirrorTarget() {
  const rt = new THREE.WebGLRenderTarget(480, 300, {
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
    generateMipmaps: false,
    depthBuffer: true,
  });
  rt.texture.colorSpace = THREE.LinearSRGBColorSpace;
  return rt;
}

function mirrors(g) {
  const frame = toon(WOOD.brass);
  function panel(x, y, z, ry, w, h) {
    const grp = new THREE.Group();
    grp.position.set(x, y, z);
    grp.rotation.y = ry;
    g.add(grp);
    const rt = mirrorTarget();
    const glass = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mirrorMaterial(rt));
    glass.userData.noShadow = true;
    glass.userData.mirror = { rt, virtualCamera: new THREE.PerspectiveCamera() };
    grp.add(glass);
    mirrorGlasses.push(glass);
    addBox(grp, w + 0.05, 0.028, 0.035, frame, 0, h / 2 + 0.01, 0.012);
    addBox(grp, w + 0.05, 0.028, 0.035, frame, 0, -h / 2 - 0.01, 0.012);
    addBox(grp, 0.028, h + 0.05, 0.035, frame, -w / 2 - 0.01, 0, 0.012);
    addBox(grp, 0.028, h + 0.05, 0.035, frame, w / 2 + 0.01, 0, 0.012);
  }
  const y = 1.16;
  const h = 1.7;
  panel(-5.62, y, 1.35, Math.PI / 2, 0.62, h);
  panel(-5.5, y, 0.88, Math.PI / 2 - 0.42, 0.4, h * 0.92);
  panel(-5.5, y, 1.82, Math.PI / 2 + 0.42, 0.4, h * 0.92);
  const light = addCyl(g, 0.018, 0.018, 0.7, toon('#fff1d6', { emissive: '#ffe0b0', emissiveIntensity: 1.1 }), -5.55, 2.12, 1.35, 8);
  light.rotation.z = Math.PI / 2;
  light.userData.noShadow = true;
}

export function updateMirrors({ renderer, scene, camera }) {
  if (!mirrorGlasses.length || updateMirrors.busy) return;
  updateMirrors.busy = true;
  const prevTarget = renderer.getRenderTarget();
  const prevXr = renderer.xr.enabled;
  const prevShadow = renderer.shadowMap.autoUpdate;
  renderer.xr.enabled = false;
  renderer.shadowMap.autoUpdate = false;
  for (const glass of mirrorGlasses) glass.visible = false;
  for (const glass of mirrorGlasses) {
    glass.updateWorldMatrix(true, false);
    const { rt, virtualCamera } = glass.userData.mirror;
    const h = 300;
    const w = Math.max(240, Math.round(h * camera.aspect));
    if (rt.width !== w || rt.height !== h) rt.setSize(w, h);
    _reflectorPos.setFromMatrixPosition(glass.matrixWorld);
    _cameraPos.setFromMatrixPosition(camera.matrixWorld);
    _rotation.extractRotation(glass.matrixWorld);
    _normal.set(0, 0, 1).applyMatrix4(_rotation);
    _view.subVectors(_reflectorPos, _cameraPos);
    if (_view.dot(_normal) > 0) continue;
    _view.reflect(_normal).negate().add(_reflectorPos);
    _rotation.extractRotation(camera.matrixWorld);
    _look.set(0, 0, -1).applyMatrix4(_rotation).add(_cameraPos);
    _target.subVectors(_reflectorPos, _look);
    _target.reflect(_normal).negate().add(_reflectorPos);
    virtualCamera.position.copy(_view);
    _up.set(0, 1, 0).applyMatrix4(_rotation).reflect(_normal);
    virtualCamera.up.copy(_up);
    virtualCamera.lookAt(_target);
    virtualCamera.far = camera.far;
    virtualCamera.near = camera.near;
    virtualCamera.fov = camera.fov;
    virtualCamera.aspect = camera.aspect;
    virtualCamera.updateMatrixWorld();
    virtualCamera.projectionMatrix.copy(camera.projectionMatrix);
    const textureMatrix = glass.material.uniforms.textureMatrix.value;
    textureMatrix.set(
      0.5, 0.0, 0.0, 0.5,
      0.0, 0.5, 0.0, 0.5,
      0.0, 0.0, 0.5, 0.5,
      0.0, 0.0, 0.0, 1.0
    );
    textureMatrix.multiply(virtualCamera.projectionMatrix);
    textureMatrix.multiply(virtualCamera.matrixWorldInverse);
    textureMatrix.multiply(glass.matrixWorld);
    _clip.set(_normal.x, _normal.y, _normal.z, -_reflectorPos.dot(_normal));
    _clip.applyMatrix4(virtualCamera.matrixWorldInverse);
    const pm = virtualCamera.projectionMatrix;
    const pe = pm.elements;
    _q.set(
      (Math.sign(_clip.x) + pe[8]) / pe[0],
      (Math.sign(_clip.y) + pe[9]) / pe[5],
      -1,
      (1.0 + pe[10]) / pe[14]
    );
    _clip.multiplyScalar(2.0 / _clip.dot(_q));
    pe[2] = _clip.x;
    pe[6] = _clip.y;
    pe[10] = _clip.z + 1.0;
    pe[14] = _clip.w;
    renderer.setRenderTarget(rt);
    renderer.clear();
    renderer.render(scene, virtualCamera);
  }
  for (const glass of mirrorGlasses) glass.visible = true;
  renderer.xr.enabled = prevXr;
  renderer.shadowMap.autoUpdate = prevShadow;
  renderer.setRenderTarget(prevTarget);
  renderer.setViewport(0, 0, renderer.domElement.width, renderer.domElement.height);
  updateMirrors.busy = false;
}

function curtain(g, a) {
  const clothMat = toon('#6e2430');
  const lining = toon('#8a3a42');
  const cz = (a.doorZ0 + a.z1) / 2 + 0.2;
  const rod = addCyl(g, 0.014, 0.014, 1.35, toon(WOOD.brass), a.x1 + 0.08, 2.22, cz, 8);
  rod.rotation.x = Math.PI / 2;
  for (let i = 0; i < 6; i++) {
    const fold = addBox(g, 0.05, 1.62, 0.07, i % 2 ? lining : clothMat, a.x1 + 0.12, 1.28, a.doorZ0 + 0.02 + i * 0.048);
    fold.rotation.y = -0.4 - i * 0.03;
  }
  const tie = new THREE.Mesh(new THREE.TorusGeometry(0.045, 0.008, 6, 12), toon(WOOD.brassDeep));
  tie.rotation.y = Math.PI / 2;
  tie.position.set(a.x1 + 0.16, 1.12, a.doorZ0 + 0.18);
  addMesh(g, tie);
}

function cuttingTable(g, c) {
  const top = toon('#ffffff', { map: TEX.maple });
  const leg = toon(WOOD.walnut);
  addBox(g, c.w, 0.05, c.d, top, c.x, c.h - 0.025, c.z);
  const lx = c.w / 2 - 0.16;
  const lz = c.d / 2 - 0.1;
  for (const sx of [-1, 1]) {
    addBox(g, 0.07, c.h - 0.05, 0.07, leg, c.x + sx * lx, (c.h - 0.05) / 2, c.z - lz);
    addBox(g, 0.07, c.h - 0.05, 0.07, leg, c.x + sx * lx, (c.h - 0.05) / 2, c.z + lz);
    addBox(g, 0.05, 0.08, c.d - 0.18, leg, c.x + sx * lx, 0.22, c.z);
  }
  addBox(g, c.w - 0.36, 0.05, 0.05, leg, c.x, 0.48, c.z);
  addBox(g, c.w - 0.5, 0.02, c.d - 0.32, toon(WOOD.mapleDeep), c.x, 0.46, c.z);
  addBox(g, c.w - 0.42, 0.006, c.d - 0.24, toon('#ffffff', { map: TEX.kraft, side: THREE.DoubleSide }), c.x, c.h + 0.006, c.z);
  const paper = toon('#f6edd4', { side: THREE.DoubleSide });
  const ink = toon('#6a3a2a');
  flatShape(g, jacketFront, paper, c.x - 0.28, c.h + 0.012, c.z - 0.08, 0.18);
  flatShape(g, sleevePat, paper, c.x + 0.32, c.h + 0.012, c.z - 0.22, -0.35);
  flatShape(g, trouserPat, paper, c.x + 0.02, c.h + 0.014, c.z + 0.22, 0.08);
  addBox(g, 0.012, 0.004, 0.42, ink, c.x - 0.12, c.h + 0.018, c.z - 0.02);
  addBox(g, 0.012, 0.004, 0.5, ink, c.x + 0.16, c.h + 0.02, c.z + 0.28);
  addBox(g, 0.04, 0.006, 0.02, ink, c.x - 0.08, c.h + 0.016, c.z + 0.16);
  addBox(g, 0.34, 0.045, 0.26, cloth(TEX.navy), c.x - 0.72, c.h + 0.03, c.z - 0.22);
  addShears(g, c.x + 0.42, c.h + 0.016, c.z + 0.34, 1.15);
  addBox(g, 0.55, 0.008, 0.035, toon(WOOD.brass), c.x - 0.35, c.h + 0.016, c.z + 0.38);
  const pencil = addCyl(g, 0.006, 0.006, 0.18, toon('#c45a28'), c.x + 0.05, c.h + 0.02, c.z - 0.28, 6);
  pencil.rotation.z = Math.PI / 2;
  pencil.rotation.y = 0.4;
  addCyl(g, 0.045, 0.05, 0.03, toon('#2a2c30'), c.x - 0.15, c.h + 0.03, c.z - 0.32, 12);
  addCyl(g, 0.04, 0.045, 0.028, toon('#3a342e'), c.x + 0.48, c.h + 0.028, c.z - 0.34, 12);
  const chalk = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.02, 0.04, 3), toon('#f4f1ea'));
  chalk.position.set(c.x - 0.62, c.h + 0.028, c.z + 0.28);
  chalk.rotation.z = 0.5;
  addMesh(g, chalk);
  const cushion = new THREE.Mesh(new THREE.SphereGeometry(0.04, 12, 8), toon('#8d2434'));
  cushion.scale.y = 0.62;
  cushion.position.set(c.x - 0.55, c.h + 0.03, c.z + 0.12);
  addMesh(g, cushion);
  tracingWheel(g, c.x + 0.72, c.h + 0.016, c.z + 0.08);
  notionTray(g, c.x + 0.78, c.h + 0.016, c.z - 0.28);
  addBox(g, 0.22, 0.012, 0.16, toon('#d7c39a'), c.x - 0.45, 0.48, c.z - 0.12);
  addBox(g, 0.18, 0.012, 0.14, toon('#efe6d4'), c.x - 0.2, 0.49, c.z + 0.08);
  addBox(g, 0.16, 0.02, 0.12, toon('#6e2430'), c.x + 0.15, 0.48, c.z);
  contact(g, c.x, c.z, c.w * 0.48, c.d * 0.48);
}

function addShears(g, x, y, z, rot) {
  const grp = new THREE.Group();
  grp.position.set(x, y, z);
  grp.rotation.y = rot;
  g.add(grp);
  const bladeMat = toon('#d5d8dc');
  const bowMat = toon('#1c1e22');
  function blade(angle, lift) {
    const arm = new THREE.Group();
    arm.rotation.y = angle;
    arm.position.y = lift;
    grp.add(arm);
    addBox(arm, 0.22, 0.008, 0.022, bladeMat, 0.13, 0, 0);
  }
  blade(0.18, 0.006);
  blade(-0.22, 0.014);
  addCyl(grp, 0.013, 0.013, 0.02, toon(WOOD.brass), 0, 0.012, 0, 10);
  function bow(z, yOff) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.032, 0.007, 6, 16), bowMat);
    ring.rotation.x = Math.PI / 2;
    ring.position.set(-0.075, yOff, z);
    addMesh(grp, ring);
    const shank = addBox(grp, 0.08, 0.008, 0.012, bowMat, -0.03, yOff, z * 0.35);
    shank.rotation.y = z > 0 ? 0.4 : -0.4;
  }
  bow(0.042, 0.008);
  bow(-0.042, 0.016);
}

function tracingWheel(g, x, y, z) {
  const grp = new THREE.Group();
  grp.position.set(x, y, z);
  grp.rotation.y = 0.4;
  g.add(grp);
  const handle = addCyl(grp, 0.007, 0.007, 0.11, toon(WOOD.walnut), -0.02, 0.012, 0, 8);
  handle.rotation.z = Math.PI / 2;
  const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.008, 16), toon('#d0d4d8'));
  wheel.rotation.z = Math.PI / 2;
  wheel.position.set(0.055, 0.024, 0);
  addMesh(grp, wheel);
  for (let i = 0; i < 8; i++) {
    const tooth = new THREE.Mesh(new THREE.SphereGeometry(0.0035, 5, 4), toon('#9aa0a6'));
    const a = (i / 8) * Math.PI * 2;
    tooth.position.set(0.055, 0.024 + Math.sin(a) * 0.02, Math.cos(a) * 0.02);
    addMesh(grp, tooth);
  }
}

function notionTray(g, x, y, z) {
  const wood = toon(WOOD.walnut);
  addBox(g, 0.2, 0.02, 0.12, wood, x, y + 0.01, z);
  addBox(g, 0.2, 0.025, 0.008, wood, x, y + 0.028, z - 0.056);
  addBox(g, 0.2, 0.025, 0.008, wood, x, y + 0.028, z + 0.056);
  const colors = ['#1c2740', '#6e2430', '#c8b48a', '#3a3e44'];
  colors.forEach((col, i) => {
    const b = new THREE.Mesh(new THREE.SphereGeometry(0.012, 8, 6), toon(col));
    b.scale.y = 0.4;
    b.position.set(x - 0.06 + i * 0.035, y + 0.028, z);
    addMesh(g, b);
  });
}

function sewingBay(g, s) {
  const top = toon(WOOD.maple);
  const leg = toon(WOOD.dark);
  addBox(g, s.w, 0.045, s.d, top, s.x, s.h - 0.02, s.z);
  const lx = s.w / 2 - 0.08;
  const lz = s.d / 2 - 0.08;
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      addBox(g, 0.05, s.h - 0.04, 0.05, leg, s.x + sx * lx, (s.h - 0.04) / 2, s.z + sz * lz);
    }
  }
  addBox(g, s.w - 0.16, 0.04, 0.04, leg, s.x, 0.16, s.z);
  const iron = toon('#2c2e32');
  const brass = toon(WOOD.brass);
  const mx = s.x - 0.18;
  const my = s.h;
  const mz = s.z + 0.02;
  const bed = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.028, 0.16), iron);
  bed.position.set(mx, my + 0.02, mz);
  addMesh(g, bed);
  const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.048, 0.055, 0.16, 14), iron);
  pillar.position.set(mx + 0.14, my + 0.11, mz);
  addMesh(g, pillar);
  const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.28, 14), iron);
  arm.rotation.z = Math.PI / 2;
  arm.position.set(mx + 0.02, my + 0.2, mz);
  addMesh(g, arm);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.05, 14, 10), iron);
  head.scale.set(1.15, 0.75, 0.85);
  head.position.set(mx - 0.1, my + 0.185, mz);
  addMesh(g, head);
  addBox(g, 0.012, 0.07, 0.012, toon('#e6e8ec'), mx - 0.12, my + 0.09, mz + 0.015);
  const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.016, 16), brass);
  wheel.rotation.z = Math.PI / 2;
  wheel.position.set(mx + 0.2, my + 0.14, mz);
  addMesh(g, wheel);
  addCyl(g, 0.01, 0.01, 0.06, brass, mx + 0.05, my + 0.26, mz, 8);
  const spool = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.032, 10), toon('#6e2430'));
  spool.position.set(mx + 0.05, my + 0.3, mz);
  addMesh(g, spool);
  const bulb = addCyl(g, 0.03, 0.036, 0.045, toon('#fff1d6', { emissive: '#ffd8a8', emissiveIntensity: 1.15 }), mx - 0.04, my + 0.3, mz + 0.02, 10);
  bulb.userData.noShadow = true;
  const clothUnder = addBox(g, 0.16, 0.006, 0.1, cloth(TEX.navy), mx - 0.08, my + 0.04, mz + 0.01);
  clothUnder.rotation.y = -0.2;
  addBox(g, 0.16, 0.06, 0.28, toon(WOOD.dark), s.x - 0.15, s.h - 0.08, s.z);
  tailorIron(g, s.x + 0.48, s.h + 0.02, s.z - 0.1);
  addBox(g, 0.18, 0.08, 0.1, toon('#6a3a32'), s.x + 0.42, s.h + 0.06, s.z + 0.14);
  addBox(g, 0.28, 0.018, 0.08, toon(WOOD.mapleDeep), s.x + 0.48, s.h + 0.025, s.z + 0.16);
  const snips = addCyl(g, 0.004, 0.004, 0.08, toon('#d8dbe0'), s.x + 0.22, s.h + 0.02, s.z + 0.16, 5);
  snips.rotation.z = Math.PI / 2;
  snips.rotation.y = 0.8;
  contact(g, s.x, s.z, 0.7, 0.4);
}

function tailorIron(g, x, y, z) {
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.055, 0.16, 10), toon('#2a2c30'));
  body.rotation.z = Math.PI / 2;
  body.rotation.y = 0.4;
  body.scale.y = 0.72;
  body.position.set(x, y + 0.035, z);
  addMesh(g, body);
  const handle = new THREE.Mesh(new THREE.TorusGeometry(0.032, 0.007, 6, 12, Math.PI), toon('#1a1c1e'));
  handle.rotation.y = 0.4;
  handle.rotation.z = Math.PI;
  handle.position.set(x, y + 0.08, z);
  addMesh(g, handle);
}

function suitRail(g, rail) {
  const brass = toon(WOOD.brass);
  const posts = [rail.z0, (rail.z0 + rail.z1) / 2, rail.z1];
  for (const z of posts) {
    addCyl(g, 0.02, 0.02, rail.barY, brass, rail.x, rail.barY / 2, z, 8);
    addCyl(g, 0.06, 0.07, 0.03, toon(WOOD.dark), rail.x, 0.015, z, 10);
  }
  const bar = addCyl(g, 0.016, 0.016, rail.z1 - rail.z0, brass, rail.x, rail.barY, (rail.z0 + rail.z1) / 2, 8);
  bar.rotation.x = Math.PI / 2;
  const hangX = rail.x + 0.22;
  hangJacket(g, hangX, -3.32, 0.05, cloth(TEX.navy));
  hangJacket(g, hangX, -2.72, -0.08, cloth(TEX.charcoal));
  hangJacket(g, hangX, -2.12, 0.02, cloth(TEX.herring));
  hangJacket(g, hangX, -1.28, 0.1, cloth(TEX.tweed));
  hangTrousers(g, hangX + 0.08, -0.78);
}

function spools(g) {
  const grp = new THREE.Group();
  grp.position.set(4.9, 1.28, -3.98);
  g.add(grp);
  const cols = ['#6e2430', '#1c2740', '#c8b48a', '#3a3e44', '#5d6244'];
  cols.forEach((c, i) => {
    addCyl(grp, 0.032, 0.032, 0.045, toon(c), -0.22 + i * 0.11, 0.675, 0.02, 10);
  });
  addBox(grp, 0.16, 0.04, 0.08, toon('#efe6d4'), -0.12, 0.2, 0.02);
  addBox(grp, 0.26, 0.01, 0.035, toon(WOOD.brass), 0.12, 0.185, 0.02);
}

function sprig(g, x, z) {
  const leaf = toon('#3f6a45');
  const stem = toon('#4d6a38');
  addCyl(g, 0.01, 0.012, 0.22, stem, x, 0.32, z, 6);
  addBox(g, 0.12, 0.05, 0.08, leaf, x + 0.04, 0.46, z);
  addBox(g, 0.08, 0.05, 0.1, leaf, x - 0.03, 0.5, z + 0.03);
}

export function makeProcedural(layout) {
  const g = new THREE.Group();
  g.name = 'procedural';
  const z = layout.zones;
  runner(g, 2.4, 1.75, 0.66, 3.5);
  runner(g, -0.1, -0.6, 5.0, 0.66);
  runner(g, -2.6, 0.85, 0.6, 2.9);
  runner(g, -4.45, -2.0, 0.7, 2.5);
  addBox(g, 1.85, 0.012, 2.35, toon('#4e1e28'), -4.85, 0.014, 1.7);
  const board = addBox(g, 0.78, 0.045, 0.6, toon(WOOD.walnut), -5.1, 0.03, 1.35);
  board.receiveShadow = true;
  addBox(g, 0.68, 0.008, 0.5, toon('#6e2430'), -5.1, 0.056, 1.35);
  addBox(g, 0.78, 0.008, 0.012, toon(WOOD.brass), -5.1, 0.055, 1.35 + 0.3);
  addBox(g, 0.16, 0.035, 0.38, toon(WOOD.walnut), -5.5, 0.9, 2.28);
  const coil = new THREE.Mesh(new THREE.TorusGeometry(0.04, 0.011, 6, 14), toon('#ffffff', { map: TEX.tape }));
  coil.rotation.x = Math.PI / 2;
  coil.position.set(-5.5, 0.94, 2.18);
  addMesh(g, coil);
  const pins = new THREE.Mesh(new THREE.SphereGeometry(0.035, 10, 8), toon('#8d2434'));
  pins.scale.y = 0.6;
  pins.position.set(-5.5, 0.95, 2.36);
  addMesh(g, pins);
  const hook = new THREE.Group();
  hook.position.set(-4.15, 0, 3.02);
  hook.rotation.y = Math.PI;
  g.add(hook);
  hanger(hook, 1.45);
  jacketBody(hook, cloth(TEX.charcoal), 0.72, HANG_ARM);

  buildPlatform(g, z.platform);
  dressForm(g, z.platform.x - 0.55, z.platform.z + 0.05, 0.62, 'baste', z.platform.h);
  dressForm(g, z.platform.x + 0.5, z.platform.z - 0.08, -0.4, 'suit', z.platform.h);
  const rodX = z.platform.x + z.platform.w / 2 - 0.18;
  const rodZ = z.platform.z + z.platform.d / 2 - 0.16;
  addCyl(g, 0.012, 0.012, 1.72, toon(WOOD.brass), rodX, z.platform.h + 0.86, rodZ, 8);
  addBox(g, 0.08, 0.012, 0.012, toon(WOOD.brassDeep), rodX + 0.04, 1.0, rodZ);
  addBox(g, 0.08, 0.012, 0.012, toon(WOOD.brassDeep), rodX + 0.04, 1.5, rodZ);

  cuttingTable(g, z.cutting);
  sewingBay(g, z.sewing);
  suitRail(g, z.rail);
  dressForm(g, z.toile.x, z.toile.z, 0.4, 'toile', 0);

  for (let i = 0; i < z.books.xs.length; i++) fillCase(g, z.books.xs[i], z.books.z, i + 1);
  openBook(g, z.lectern.x, 0.86, z.lectern.z + 0.46);
  mirrors(g);
  curtain(g, z.alcove);
  const plaque = new THREE.Mesh(
    new THREE.PlaneGeometry(0.72, 0.18),
    toon('#ffffff', { map: TEX.fitting })
  );
  plaque.position.set(z.alcove.x1 + 0.06, 2.18, z.alcove.doorZ0 + 0.55);
  plaque.rotation.y = Math.PI / 2;
  plaque.castShadow = false;
  g.add(plaque);
  addBox(g, 0.012, 1.15, 0.035, toon('#ffffff', { map: TEX.tape }), -5.48, 1.15, 2.22);
  spools(g);
  sprig(g, -5.38, 0.72);

  const fan = toon('#ffffff', { map: TEX.swatch, side: THREE.DoubleSide });
  for (let i = 0; i < 5; i++) {
    const card = addBox(g, 0.14, 0.008, 0.2, fan, -5.05 + i * 0.015, 0.78, 2.62);
    card.rotation.y = -0.4 + i * 0.18;
  }

  contact(g, -3.35, -3.82, 0.42, 0.24);
  contact(g, -2.45, -3.82, 0.42, 0.24);
  contact(g, -4.9, 2.58, 0.42, 0.42);
  contact(g, -4.28, 0.98, 0.28, 0.48);
  contact(g, 0.55, 2.62, 0.78, 0.28);
  contact(g, 3.38, -2.48, 0.28, 0.28);
  contact(g, -4.9, 1.93, 0.26, 0.28);
  return g;
}

boot({
  makeShell,
  makeProcedural,
  beforeRender: updateMirrors,
  readyText: 'ready — fitting alcove, platform, cutting table · T toon · U unlit',
});
