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

function plankFloor() {
  return canvasTex((ctx, w, h) => {
    const cols = ['#c9a56e', '#d4b07a', '#bf9a62', '#dab67e', '#c4a06a', '#b89258', '#d0aa72'];
    const plank = 18;
    for (let x = 0, i = 0; x < w; x += plank, i++) {
      ctx.fillStyle = cols[i % cols.length];
      ctx.fillRect(x, 0, plank - 1, h);
      ctx.fillStyle = 'rgba(70,42,18,0.28)';
      ctx.fillRect(x + plank - 2, 0, 2, h);
      ctx.fillStyle = 'rgba(255,255,255,0.04)';
      for (let y = (i % 2) * 20; y < h; y += 46) ctx.fillRect(x, y, plank - 2, 1);
    }
  }, 256, 256);
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

function mirrorTex() {
  return canvasTex((ctx, w, h) => {
    const g = ctx.createLinearGradient(0, 0, w, h);
    g.addColorStop(0, '#eef3f4');
    g.addColorStop(0.4, '#c5d2d6');
    g.addColorStop(1, '#8fa4ab');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.fillRect(0, 0, w, h * 0.16);
  }, 64, 256);
}

const TEX = {
  navy: weave('#1c2740', '#2a3c5c'),
  charcoal: chalkstripe('#3c4148', '#d5d0c4'),
  herring: herringbone('#6d4e3a', '#3e2c22'),
  tweed: tweed('#5d6244', '#c2ad72', '#2a2e22'),
  flannel: weave('#9aa1a6', '#c5cbcf'),
  canvas: weave('#e6d4b0', '#c9b48a'),
  muslin: weave('#f0e4cc', '#e4d2b0'),
  maple: weave('#e4c48a', '#d2ae72'),
  floor: plankFloor(),
  runner: runnerTex(),
  kraft: kraft(),
  swatch: swatchPage(),
  fitting: labelTex('FITTING'),
  tape: tapeTex(),
  mirror: mirrorTex(),
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
  const floor = new THREE.Mesh(new THREE.BoxGeometry(W, 0.08, D), toon('#ffffff', { map: TEX.floor }));
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

function sleeve(g, side, mat, y) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(0.062, 0.048, 0.5, 10), mat);
  m.position.set(side * 0.26, y - 0.26, 0.02);
  m.rotation.z = side * 0.22;
  m.rotation.x = 0.35;
  m.castShadow = true;
  m.receiveShadow = true;
  g.add(m);
}

function stitches(g, x, y, z, n, dx, dy) {
  const mat = toon('#f7f4ee');
  for (let i = 0; i < n; i++) {
    addBox(g, 0.028, 0.008, 0.01, mat, x + i * dx, y + i * dy, z);
  }
}

function dressForm(parent, x, z, rot, kind, floorY) {
  const g = new THREE.Group();
  g.position.set(x, floorY, z);
  g.rotation.y = rot;
  parent.add(g);
  const muslin = cloth(TEX.muslin);
  const canvas = cloth(TEX.canvas);
  const walnut = toon(WOOD.dark);
  const brass = toon(WOOD.brass);
  addCyl(g, 0.16, 0.18, 0.04, walnut, 0, 0.02, 0, 16);

  if (kind === 'suit') {
    const navy = cloth(TEX.navy);
    addCyl(g, 0.055, 0.07, 0.14, muslin, 0, 1.6, 0, 12);
    addBox(g, 0.42, 0.16, 0.2, muslin, 0, 1.5, 0);
    addCyl(g, 0.09, 0.07, 0.92, navy, -0.09, 0.5, 0, 10);
    addCyl(g, 0.09, 0.07, 0.92, navy, 0.09, 0.5, 0, 10);
    addBox(g, 0.38, 0.7, 0.16, navy, 0, 1.16, -0.02);
    addBox(g, 0.16, 0.62, 0.03, navy, -0.1, 1.14, 0.08);
    addBox(g, 0.16, 0.62, 0.03, navy, 0.1, 1.14, 0.08);
    sleeve(g, -1, navy, 1.48);
    sleeve(g, 1, navy, 1.48);
    const lapelL = addBox(g, 0.1, 0.26, 0.018, navy, -0.06, 1.38, 0.1);
    lapelL.rotation.z = 0.4;
    const lapelR = addBox(g, 0.1, 0.26, 0.018, navy, 0.06, 1.38, 0.1);
    lapelR.rotation.z = -0.4;
    addCyl(g, 0.018, 0.018, 0.012, brass, 0.02, 1.12, 0.1, 8);
    addCyl(g, 0.018, 0.018, 0.012, brass, 0.02, 0.98, 0.1, 8);
    addBox(g, 0.08, 0.012, 0.02, navy, -0.12, 1.32, 0.1);
    return;
  }

  addCyl(g, 0.015, 0.018, 0.7, brass, 0, 0.39, 0, 8);
  addCyl(g, 0.11, 0.13, 0.16, muslin, 0, 0.86, 0, 14);
  addCyl(g, 0.09, 0.11, 0.18, muslin, 0, 1.04, 0, 14);
  addCyl(g, 0.13, 0.11, 0.22, muslin, 0, 1.24, 0, 14);
  addBox(g, 0.4, 0.08, 0.12, muslin, 0, 1.4, 0);
  addCyl(g, 0.045, 0.06, 0.12, muslin, 0, 1.5, 0, 10);

  if (kind === 'toile') {
    addBox(g, 0.36, 0.62, 0.04, muslin, 0, 1.16, 0.08);
    stitches(g, -0.12, 0.95, 0.11, 8, 0.03, 0.04);
    const blue = toon('#2a4d86');
    addBox(g, 0.008, 0.5, 0.008, blue, 0, 1.16, 0.11);
    addBox(g, 0.28, 0.008, 0.008, blue, 0, 1.22, 0.11);
    for (let i = 0; i < 5; i++) addCyl(g, 0.006, 0.006, 0.03, brass, -0.1 + i * 0.05, 0.9, 0.12, 6);
    return;
  }

  const wool = cloth(TEX.herring);
  addBox(g, 0.36, 0.58, 0.08, wool, 0, 1.16, -0.04);
  addBox(g, 0.16, 0.52, 0.025, wool, -0.1, 1.14, 0.07);
  addBox(g, 0.15, 0.5, 0.02, canvas, 0.12, 1.12, 0.08);
  sleeve(g, -1, wool, 1.38);
  const lapel = addBox(g, 0.09, 0.24, 0.016, wool, -0.05, 1.32, 0.09);
  lapel.rotation.z = 0.45;
  stitches(g, 0.05, 1.0, 0.095, 7, 0.02, 0.035);
  stitches(g, -0.16, 0.9, 0.09, 6, 0.03, 0);
  addCyl(g, 0.012, 0.012, 0.01, toon('#f4f1ea'), -0.1, 1.05, 0.09, 6);
}

function hangJacket(g, x, z, yaw, mat, len) {
  const grp = new THREE.Group();
  grp.position.set(x, 0, z);
  grp.rotation.y = Math.PI / 2 + yaw;
  g.add(grp);
  const wood = toon(WOOD.mapleDeep);
  const brass = toon(WOOD.brass);
  addCyl(grp, 0.008, 0.008, 0.1, brass, 0, 1.58, 0, 6);
  const h1 = addBox(grp, 0.2, 0.012, 0.02, wood, -0.08, 1.5, 0);
  h1.rotation.z = 0.35;
  const h2 = addBox(grp, 0.2, 0.012, 0.02, wood, 0.08, 1.5, 0);
  h2.rotation.z = -0.35;
  addBox(grp, 0.38, len, 0.1, mat, 0, 1.46 - len / 2, 0);
  addBox(grp, 0.14, len * 0.72, 0.02, mat, -0.1, 1.4 - len * 0.36, 0.06);
  addBox(grp, 0.14, len * 0.72, 0.02, mat, 0.1, 1.4 - len * 0.36, 0.06);
  sleeve(grp, -1, mat, 1.42);
  sleeve(grp, 1, mat, 1.42);
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

function mirrors(g) {
  const glass = toon('#ffffff', { map: TEX.mirror });
  const frame = toon(WOOD.brass);
  function panel(x, z, ry, w) {
    const grp = new THREE.Group();
    grp.position.set(x, 1.18, z);
    grp.rotation.y = ry;
    g.add(grp);
    addBox(grp, w, 1.72, 0.02, glass, 0, 0, 0);
    addBox(grp, w + 0.05, 0.03, 0.04, frame, 0, 0.875, 0.01);
    addBox(grp, w + 0.05, 0.03, 0.04, frame, 0, -0.875, 0.01);
    addBox(grp, 0.03, 1.78, 0.04, frame, -w / 2, 0, 0.01);
    addBox(grp, 0.03, 1.78, 0.04, frame, w / 2, 0, 0.01);
  }
  panel(-5.64, 1.45, Math.PI / 2, 0.58);
  panel(-5.5, 0.95, Math.PI / 2 - 0.38, 0.42);
  panel(-5.5, 1.95, Math.PI / 2 + 0.38, 0.42);
  const light = addCyl(g, 0.02, 0.02, 0.46, toon('#fff1d6', { emissive: '#ffe0b0', emissiveIntensity: 1.1 }), -5.58, 2.16, 1.45, 8);
  light.rotation.z = Math.PI / 2;
  light.userData.noShadow = true;
}

function curtain(g, a) {
  const clothMat = toon('#6e2430');
  const rod = addCyl(g, 0.014, 0.014, 1.15, toon(WOOD.brass), a.x1 + 0.1, 2.2, (a.doorZ0 + a.z1) / 2 - 0.05, 8);
  rod.rotation.x = Math.PI / 2;
  for (let i = 0; i < 4; i++) {
    addBox(g, 0.07, 1.55, 0.09, clothMat, a.x1 + 0.14, 1.28, a.doorZ0 + 0.08 + i * 0.07);
  }
  addCyl(g, 0.012, 0.012, 0.16, toon(WOOD.brassDeep), a.x1 + 0.2, 1.15, a.doorZ0 + 0.22, 6);
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
  const shear = new THREE.Group();
  shear.position.set(c.x + 0.58, c.h + 0.02, c.z + 0.24);
  shear.rotation.y = -0.7;
  g.add(shear);
  const blade = toon('#d8dbe0');
  const handle = toon('#1c1e22');
  const b1 = addBox(shear, 0.3, 0.006, 0.016, blade, 0.08, 0.004, 0.028);
  b1.rotation.y = 0.22;
  const b2 = addBox(shear, 0.3, 0.006, 0.016, blade, 0.08, 0.01, -0.028);
  b2.rotation.y = -0.26;
  addCyl(shear, 0.012, 0.012, 0.02, toon(WOOD.brass), -0.04, 0.008, 0, 8);
  const loopMat = handle;
  const loopA = new THREE.Mesh(new THREE.TorusGeometry(0.038, 0.008, 6, 14), loopMat);
  loopA.rotation.x = Math.PI / 2;
  loopA.position.set(-0.12, 0.01, 0.04);
  loopA.castShadow = true;
  shear.add(loopA);
  const loopB = loopA.clone();
  loopB.position.set(-0.12, 0.01, -0.04);
  shear.add(loopB);
  addBox(g, 0.55, 0.008, 0.035, toon(WOOD.brass), c.x - 0.35, c.h + 0.016, c.z + 0.38);
  addCyl(g, 0.045, 0.05, 0.03, toon('#2a2c30'), c.x - 0.15, c.h + 0.03, c.z - 0.32, 12);
  addCyl(g, 0.04, 0.045, 0.028, toon('#3a342e'), c.x + 0.55, c.h + 0.028, c.z - 0.34, 12);
  addBox(g, 0.07, 0.025, 0.045, toon('#f4f1ea'), c.x + 0.85, c.h + 0.02, c.z + 0.02);
  addCyl(g, 0.04, 0.045, 0.05, toon('#8d2434'), c.x - 0.55, c.h + 0.03, c.z + 0.18, 10);
  addBox(g, 0.22, 0.012, 0.16, toon('#d7c39a'), c.x - 0.45, 0.48, c.z - 0.12);
  addBox(g, 0.18, 0.012, 0.14, toon('#efe6d4'), c.x - 0.2, 0.49, c.z + 0.08);
  addBox(g, 0.16, 0.02, 0.12, toon('#6e2430'), c.x + 0.15, 0.48, c.z);
  contact(g, c.x, c.z, c.w * 0.48, c.d * 0.48);
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
  const iron = toon('#1a1c1e');
  const brass = toon(WOOD.brass);
  const mx = s.x - 0.15;
  const my = s.h;
  const mz = s.z + 0.02;
  addBox(g, 0.46, 0.035, 0.18, iron, mx, my + 0.02, mz);
  addBox(g, 0.09, 0.2, 0.14, iron, mx + 0.14, my + 0.14, mz);
  addBox(g, 0.26, 0.07, 0.1, iron, mx + 0.02, my + 0.23, mz);
  addBox(g, 0.016, 0.09, 0.016, toon('#e6e8ec'), mx - 0.12, my + 0.12, mz + 0.02);
  const wheel = addCyl(g, 0.065, 0.065, 0.018, brass, mx + 0.2, my + 0.15, mz, 14);
  wheel.rotation.z = Math.PI / 2;
  addCyl(g, 0.012, 0.012, 0.07, brass, mx + 0.1, my + 0.3, mz, 8);
  addCyl(g, 0.028, 0.028, 0.03, toon('#6e2430'), mx + 0.1, my + 0.32, mz, 8);
  const bulb = addCyl(g, 0.035, 0.04, 0.05, toon('#fff1d6', { emissive: '#ffd8a8', emissiveIntensity: 1.15 }), mx - 0.05, my + 0.34, mz + 0.02, 10);
  bulb.userData.noShadow = true;
  addBox(g, 0.22, 0.1, 0.12, toon('#6a3a32'), s.x + 0.48, s.h + 0.06, s.z - 0.08);
  addBox(g, 0.34, 0.025, 0.1, toon(WOOD.mapleDeep), s.x + 0.42, s.h + 0.03, s.z + 0.16);
  addBox(g, 0.12, 0.08, 0.16, toon('#2a2c30'), s.x + 0.62, s.h + 0.05, s.z + 0.12);
  contact(g, s.x, s.z, 0.7, 0.4);
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
  hangJacket(g, hangX, -3.32, 0.05, cloth(TEX.navy), 0.74);
  hangJacket(g, hangX, -2.72, -0.08, cloth(TEX.charcoal), 0.7);
  hangJacket(g, hangX, -2.12, 0.02, cloth(TEX.herring), 0.76);
  hangJacket(g, hangX, -1.28, 0.1, cloth(TEX.tweed), 0.66);
  const trousers = new THREE.Group();
  trousers.position.set(hangX, 0, -0.78);
  trousers.rotation.y = Math.PI / 2;
  g.add(trousers);
  addCyl(trousers, 0.008, 0.008, 0.08, brass, 0, 1.56, 0, 6);
  addCyl(g, 0.055, 0.06, 0.78, cloth(TEX.flannel), hangX + 0.06, 1.12, -0.78, 10);
  addCyl(g, 0.055, 0.06, 0.78, cloth(TEX.flannel), hangX + 0.16, 1.12, -0.78, 10);
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
  addBox(g, 1.7, 0.018, 2.15, toon('#5c2430'), -4.6, 0.02, 1.7);

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
  addBox(g, 0.012, 1.35, 0.04, toon('#ffffff', { map: TEX.tape }), -5.42, 1.2, 2.05);
  spools(g);
  sprig(g, -5.38, 0.72);

  const fan = toon('#ffffff', { map: TEX.swatch, side: THREE.DoubleSide });
  for (let i = 0; i < 5; i++) {
    const card = addBox(g, 0.16, 0.01, 0.24, fan, -4.48 + i * 0.02, 0.756, 1.86);
    card.rotation.y = -0.55 + i * 0.22;
  }

  contact(g, -3.35, -3.82, 0.42, 0.24);
  contact(g, -2.45, -3.82, 0.42, 0.24);
  contact(g, -4.68, 2.02, 0.4, 0.4);
  contact(g, -4.5, 1.2, 0.48, 0.28);
  contact(g, 0.55, 2.62, 0.78, 0.28);
  contact(g, 3.38, -2.48, 0.28, 0.28);
  contact(g, -4.68, 2.9, 0.26, 0.28);
  return g;
}

boot({
  makeShell,
  makeProcedural,
  readyText: 'ready — fitting alcove, platform, cutting table · T toon · U unlit',
});
