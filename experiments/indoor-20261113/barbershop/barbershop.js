import * as THREE from 'three';
import { boot, toon, addBox, addCyl } from './scene_lib.js';

const labelCache = new Map();

function labelMat(text, bg, fg, cw = 512, ch = 256, font = '700 72px Georgia, "Times New Roman", serif') {
  const key = [text, bg, fg, cw, ch, font].join('|');
  if (labelCache.has(key)) return labelCache.get(key);
  const canvas = document.createElement('canvas');
  canvas.width = cw;
  canvas.height = ch;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, cw, ch);
  ctx.fillStyle = fg;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const lines = String(text).split('\n');
  const size = Math.round(Math.min(cw, ch) / (lines.length === 1 ? 3.2 : lines.length * 2.4));
  ctx.font = font.replace(/\d+px/, `${size}px`);
  lines.forEach((line, i) => {
    const y = ch / 2 + (i - (lines.length - 1) / 2) * size * 1.15;
    ctx.fillText(line, cw / 2, y);
  });
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  const mat = toon('#ffffff', { map: tex });
  labelCache.set(key, mat);
  return mat;
}

function paintMenu(ctx, w, h) {
  ctx.fillStyle = '#1c1916';
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = '#c6a15e';
  ctx.lineWidth = 10;
  ctx.strokeRect(18, 18, w - 36, h - 36);
  ctx.fillStyle = '#f3ead7';
  ctx.textAlign = 'center';
  ctx.font = '700 54px Georgia, "Times New Roman", serif';
  ctx.fillText('CROWN', w / 2, 92);
  ctx.font = '600 36px "WenQuanYi Micro Hei", "Droid Sans Fallback", sans-serif';
  ctx.fillText('理发', w / 2, 142);
  ctx.strokeStyle = '#c6a15e';
  ctx.beginPath();
  ctx.moveTo(70, 176);
  ctx.lineTo(w - 70, 176);
  ctx.stroke();
  const rows = [
    ['CUT', '28'],
    ['SHAVE', '22'],
    ['BEARD', '18'],
    ['KIDS', '16'],
    ['HOT TOWEL', '8'],
  ];
  ctx.font = '600 40px Georgia, serif';
  ctx.textAlign = 'left';
  rows.forEach((row, i) => {
    const y = 250 + i * 78;
    ctx.fillStyle = '#f3ead7';
    ctx.fillText(row[0], 64, y);
    ctx.textAlign = 'right';
    ctx.fillText(row[1], w - 64, y);
    ctx.textAlign = 'left';
  });
  ctx.textAlign = 'center';
  ctx.font = '500 28px "WenQuanYi Micro Hei", "Droid Sans Fallback", sans-serif';
  ctx.fillStyle = '#c6a15e';
  ctx.fillText('周二至日  9:00–19:00', w / 2, h - 64);
}

function menuMat() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 768;
  paintMenu(canvas.getContext('2d'), 512, 768);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  const mat = toon('#ffffff', { map: tex });
  return mat;
}

function checkerTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 64;
  const g = canvas.getContext('2d');
  const grout = '#2a241c';
  [['#f4efe6', 0], ['#2a2622', 64]].forEach(([color, x]) => {
    g.fillStyle = grout;
    g.fillRect(x, 0, 64, 64);
    g.fillStyle = color;
    g.fillRect(x + 4, 4, 56, 56);
  });
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;
  tex.repeat.set(9, 15);
  return tex;
}

function subwayTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 64;
  const g = canvas.getContext('2d');
  g.fillStyle = '#c9c1b4';
  g.fillRect(0, 0, 128, 64);
  g.fillStyle = '#f7f3ec';
  g.fillRect(3, 3, 58, 26);
  g.fillRect(67, 3, 58, 26);
  g.fillRect(35, 35, 58, 26);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;
  return tex;
}

function poleTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 256;
  const g = canvas.getContext('2d');
  const colors = ['#c4302b', '#f4f1ea', '#1d4e89'];
  for (let y = 0; y < 256; y++) {
    for (let x = 0; x < 64; x++) {
      const stripe = Math.floor((x + y * 0.55) / 14) % 3;
      g.fillStyle = colors[(stripe + 3) % 3];
      g.fillRect(x, y, 1, 1);
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

function quiet(mesh) {
  mesh.castShadow = false;
  mesh.userData.noShadow = true;
  return mesh;
}

function receiveOnly(mesh) {
  mesh.castShadow = false;
  mesh.userData.noShadow = true;
  mesh.userData.receiveShadow = true;
  return mesh;
}

const walnut = () => toon('#4a3024');
const walnutDeep = () => toon('#2e1d16');
const oak = () => toon('#8d5e3c');
const brass = () => toon('#c6a15e', { band: 'metal', name: 'brass metal' });
const chrome = () => toon('#c5ccd1', { band: 'metal', name: 'steel metal' });
const plaster = () => toon('#f3ecdf');
const green = () => toon('#1e3a34');
const oxblood = () => toon('#7a2e32');
const cream = () => toon('#f6f1e6');
const ink = () => toon('#1c1916');

function makeShell(layout) {
  const g = new THREE.Group();
  g.name = 'shell';
  const { width: W, depth: D, height: H } = layout.meta.room;
  const floor = new THREE.Mesh(
    new THREE.BoxGeometry(W, 0.08, D),
    toon('#ffffff', { map: checkerTexture(), polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 }),
  );
  floor.position.y = -0.04;
  receiveOnly(floor);
  g.add(floor);

  const border = walnut();
  receiveOnly(addBox(g, W - 0.08, 0.012, 0.1, border, 0, 0.006, -D / 2 + 0.08));
  receiveOnly(addBox(g, W - 0.08, 0.012, 0.1, border, 0, 0.006, D / 2 - 0.08));
  receiveOnly(addBox(g, 0.1, 0.012, D - 0.16, border, -W / 2 + 0.08, 0.006, 0));

  const wallMat = plaster();
  const back = addBox(g, W, H, 0.12, wallMat, 0, H / 2, -D / 2);
  back.castShadow = false;
  const left = addBox(g, 0.12, H, D, wallMat, -W / 2, H / 2, 0);
  left.castShadow = false;

  const subTex = subwayTexture();
  subTex.repeat.set(W / 0.28, 1.05 / 0.14);
  const sub = toon('#ffffff', { map: subTex });
  const subSide = subwayTexture();
  subSide.repeat.set(D / 0.28, 1.05 / 0.14);
  const subL = toon('#ffffff', { map: subSide });
  receiveOnly(addBox(g, W - 0.2, 1.05, 0.04, sub, 0, 0.525, -D / 2 + 0.08));
  receiveOnly(addBox(g, 0.04, 1.05, D - 0.2, subL, -W / 2 + 0.08, 0.525, 0));

  addBox(g, W - 0.16, 0.08, 0.06, oak(), 0, 0.04, -D / 2 + 0.09);
  addBox(g, 0.06, 0.08, D - 0.16, oak(), -W / 2 + 0.09, 0.04, 0);
  addBox(g, W - 0.16, 0.06, 0.07, walnut(), 0, 1.08, -D / 2 + 0.08);
  addBox(g, 0.07, 0.06, D - 0.16, walnut(), -W / 2 + 0.08, 1.08, 0);
  addBox(g, W - 0.2, 0.035, 0.045, brass(), 0, 2.55, -D / 2 + 0.07);
  addBox(g, 0.045, 0.035, D - 0.2, brass(), -W / 2 + 0.07, 2.55, 0);

  const soffit = addBox(g, W - 0.4, 0.1, 1.7, cream(), -0.2, H - 0.12, -3.4);
  soffit.castShadow = true;

  const mat = receiveOnly(addBox(g, 1.35, 0.015, 0.8, ink(), 0.35, 0.012, D / 2 - 0.7));
  mat.material = toon('#2c2824');
  return g;
}

function stationBay(g, x, index) {
  const zWall = -4.18;
  addBox(g, 1.12, 1.55, 0.04, green(), x, 1.72, zWall);
  addBox(g, 0.96, 1.22, 0.05, walnut(), x, 1.68, zWall + 0.03);
  addBox(g, 0.84, 0.06, 0.03, brass(), x, 2.24, zWall + 0.06);
  addBox(g, 0.84, 0.06, 0.03, brass(), x, 1.12, zWall + 0.06);
  addBox(g, 0.05, 1.16, 0.03, brass(), x - 0.44, 1.68, zWall + 0.06);
  addBox(g, 0.05, 1.16, 0.03, brass(), x + 0.44, 1.68, zWall + 0.06);
  const glass = addBox(g, 0.74, 1.02, 0.02, toon('#d5e2e8', { emissive: '#8aa4b0', emissiveIntensity: 0.22 }), x, 1.68, zWall + 0.07);
  quiet(glass);

  for (const side of [-1, 1]) {
    for (let i = 0; i < 5; i++) {
      const bulb = addCyl(g, 0.028, 0.028, 0.05, toon('#fff4d4', { emissive: '#ffe2a8', emissiveIntensity: 1.15, name: 'bulb' }), x + side * 0.5, 1.22 + i * 0.23, zWall + 0.1, 10);
      quiet(bulb);
      const cup = addCyl(g, 0.04, 0.034, 0.03, brass(), x + side * 0.5, 1.22 + i * 0.23, zWall + 0.07, 8);
      quiet(cup);
    }
  }

  const plate = addBox(
    g, 0.16, 0.1, 0.02,
    labelMat(String(index + 1), '#1c1916', '#c6a15e', 128, 128, '700 80px Georgia, serif'),
    x, 1.0, zWall + 0.08,
  );
  quiet(plate);

  const cabZ = -4.0;
  addBox(g, 1.16, 0.1, 0.46, walnutDeep(), x, 0.05, cabZ);
  addBox(g, 1.1, 0.74, 0.4, walnut(), x, 0.48, cabZ);
  addBox(g, 1.18, 0.045, 0.48, toon('#d9d4ca'), x, 0.88, cabZ + 0.01);
  for (let i = 0; i < 3; i++) {
    const y = 0.22 + i * 0.22;
    addBox(g, 1.0, 0.16, 0.02, oak(), x, y, cabZ + 0.21);
    addBox(g, 0.08, 0.025, 0.02, brass(), x, y, cabZ + 0.23);
  }

  const cape = addBox(g, 0.42, 0.28, 0.03, oxblood(), x, 1.08, -1.78);
  cape.rotation.x = 0.55;
  const stripe = addBox(g, 0.44, 0.04, 0.01, cream(), x, 1.14, -1.74);
  stripe.rotation.x = 0.55;

  const towel = addBox(g, 0.16, 0.28, 0.05, cream(), x + 0.62, 0.72, cabZ + 0.18);
  towel.rotation.z = 0.08;
  addBox(g, 0.16, 0.05, 0.05, toon('#d7c3a4'), x + 0.62, 0.6, cabZ + 0.18);
}

function barberPole(g, x, z) {
  addCyl(g, 0.16, 0.18, 0.08, walnut(), x, 0.04, z, 16);
  addCyl(g, 0.05, 0.05, 1.7, chrome(), x, 0.95, z, 12);
  const sleeveMat = toon('#ffffff', { map: poleTexture(), emissive: '#ffffff', emissiveIntensity: 0.18 });
  const sleeve = addCyl(g, 0.09, 0.09, 1.35, sleeveMat, x, 1.05, z, 20);
  sleeve.material.side = THREE.DoubleSide;
  addCyl(g, 0.11, 0.11, 0.06, brass(), x, 0.4, z, 14);
  addCyl(g, 0.11, 0.11, 0.06, brass(), x, 1.72, z, 14);
  addCyl(g, 0.07, 0.02, 0.16, brass(), x, 1.84, z, 12);
  const globe = new THREE.Mesh(
    new THREE.SphereGeometry(0.1, 18, 14),
    toon('#f4f7fb', { emissive: '#fff6e4', emissiveIntensity: 0.85, name: 'bulb' }),
  );
  globe.position.set(x, 2.02, z);
  quiet(globe);
  g.add(globe);
}

function reception(g, desk) {
  const { x, z, w, d, h } = desk;
  addBox(g, w, 0.1, d, walnutDeep(), x, 0.05, z);
  addBox(g, w - 0.08, h - 0.16, d - 0.08, walnut(), x, h / 2 - 0.02, z);
  addBox(g, w + 0.06, 0.05, d + 0.06, toon('#e7e0d4'), x, h, z);
  addBox(g, w * 0.42, 0.16, 0.02, oak(), x - w * 0.22, 0.55, z + d / 2);
  addBox(g, w * 0.42, 0.16, 0.02, oak(), x + w * 0.22, 0.55, z + d / 2);
  addBox(g, 0.1, 0.03, 0.02, brass(), x - w * 0.22, 0.55, z + d / 2 + 0.02);
  addBox(g, 0.1, 0.03, 0.02, brass(), x + w * 0.22, 0.55, z + d / 2 + 0.02);
  const sign = addBox(
    g, 0.7, 0.22, 0.02,
    labelMat('DESK\n前台', '#7a2e32', '#f6f1e6', 512, 256, '700 64px "WenQuanYi Micro Hei", Georgia, serif'),
    x, h + 0.16, z + d / 2 - 0.02,
  );
  quiet(sign);
  addBox(g, 0.22, 0.012, 0.16, toon('#f7f1e4'), x + 0.35, h + 0.03, z - 0.05);
  addBox(g, 0.2, 0.008, 0.14, toon('#efe6d4'), x + 0.38, h + 0.04, z - 0.02);
}

function washCorner(g) {
  const x = 4.62;
  const z = -3.45;
  addBox(g, 0.14, 3.22, 2.5, plaster(), 5.13, 1.61, -3.05);
  addBox(g, 0.08, 1.05, 2.3, toon('#f7f3ec'), 5.02, 0.55, -3.05);
  addBox(g, 0.9, 0.86, 0.52, walnut(), x, 0.43, z);
  addBox(g, 0.96, 0.05, 0.58, toon('#e4ecee'), x, 0.88, z);
  addCyl(g, 0.16, 0.14, 0.08, toon('#d5e0e4', { band: 'metal', name: 'steel metal' }), x, 0.9, z + 0.02, 16);
  addCyl(g, 0.012, 0.012, 0.22, chrome(), x + 0.12, 1.05, z - 0.12, 8);
  addCyl(g, 0.012, 0.012, 0.16, chrome(), x + 0.18, 1.12, z - 0.04, 8).rotation.z = Math.PI / 2;
  addBox(g, 0.7, 0.55, 0.03, toon('#d5e2e8', { emissive: '#9eb4be', emissiveIntensity: 0.15 }), x, 1.45, z - 0.24);
  addBox(g, 0.78, 0.63, 0.03, walnut(), x, 1.45, z - 0.26);
  addBox(g, 0.55, 0.04, 0.08, chrome(), x - 0.15, 1.15, z + 0.22);
  addBox(g, 0.16, 0.22, 0.04, cream(), x - 0.28, 1.02, z + 0.22);
  addBox(g, 0.16, 0.2, 0.04, toon('#e7d7c4'), x - 0.08, 1.0, z + 0.22);
  addBox(g, 0.42, 0.55, 0.38, walnutDeep(), x, 0.28, z + 0.85);
  addBox(g, 0.36, 0.08, 0.32, cream(), x, 0.58, z + 0.85);
}

function retailBay(g) {
  const x = -4.78;
  const zc = -2.9;
  const w = 1.85;
  const h = 1.82;
  addBox(g, 0.045, h, w, walnutDeep(), x - 0.16, h / 2, zc);
  addBox(g, 0.05, h, 0.36, walnut(), x + 0.02, h / 2, zc - w / 2);
  addBox(g, 0.05, h, 0.36, walnut(), x + 0.02, h / 2, zc + w / 2);
  for (const y of [0.38, 0.78, 1.16, 1.52]) {
    addBox(g, 0.34, 0.04, w - 0.1, oak(), x, y, zc);
  }
  const tag = addBox(
    g, 0.02, 0.16, 0.7,
    labelMat('GOODS\n用品', '#1e3a34', '#f6f1e6', 512, 160, '700 56px "WenQuanYi Micro Hei", Georgia, serif'),
    x + 0.2, 1.7, zc,
  );
  tag.rotation.y = Math.PI / 2;
  quiet(tag);
}

function waitingDressing(g) {
  for (let i = 0; i < 4; i++) {
    const mag = addBox(g, 0.22, 0.012, 0.3, toon(i % 2 ? '#7a2e32' : '#1e3a34'), -3.15 + (i - 1.5) * 0.05, 0.42 + i * 0.008, 0.18);
    mag.rotation.y = -0.4 + i * 0.15;
    mag.rotation.z = -0.15;
  }
  const stand = new THREE.Group();
  addBox(stand, 0.46, 0.04, 0.32, walnut(), 0, 0.78, 0);
  addBox(stand, 0.04, 0.78, 0.04, walnut(), -0.18, 0.39, -0.1);
  addBox(stand, 0.04, 0.78, 0.04, walnut(), 0.18, 0.39, -0.1);
  addBox(stand, 0.4, 0.28, 0.03, ink(), 0, 0.95, -0.02);
  stand.position.set(-2.35, 0, 1.9);
  stand.rotation.y = -Math.PI / 2;
  g.add(stand);

  const frame = addBox(g, 0.78, 1.12, 0.04, walnut(), 1.62, 1.62, -4.16);
  const board = addBox(g, 0.66, 0.98, 0.02, menuMat(), 1.62, 1.62, -4.12);
  quiet(board);
  frame.castShadow = true;

  const shop = addBox(
    g, 2.4, 0.42, 0.04,
    labelMat('CROWN BARBER\n理发店', '#7a2e32', '#f6f1e6', 1024, 256, '700 72px "WenQuanYi Micro Hei", Georgia, serif'),
    0, 2.72, -4.16,
  );
  quiet(shop);
  addBox(g, 2.55, 0.5, 0.05, walnutDeep(), 0, 2.72, -4.2);
}

function hooksAndBroom(g) {
  addBox(g, 0.08, 0.9, 0.08, walnut(), -4.7, 1.35, 3.55);
  for (let i = 0; i < 3; i++) {
    addBox(g, 0.1, 0.03, 0.08, brass(), -4.62, 1.55 + i * 0.16, 3.55);
  }
  addCyl(g, 0.015, 0.015, 1.15, walnut(), 4.85, 0.58, -4.05, 6);
  addBox(g, 0.28, 0.035, 0.05, oak(), 4.85, 0.08, -4.05);
  addCyl(g, 0.14, 0.16, 0.32, walnutDeep(), -3.55, 0.16, 3.35, 12);
}

function contact(g, x, z, rx, rz) {
  const m = new THREE.Mesh(new THREE.CircleGeometry(1, 18), toon('#1a140f', {
    transparent: true, opacity: 0.22, depthWrite: false, polygonOffset: true,
  }));
  m.rotation.x = -Math.PI / 2;
  m.position.set(x, 0.012, z);
  m.scale.set(rx, rz, 1);
  quiet(m);
  g.add(m);
}

function makeProcedural(layout) {
  const g = new THREE.Group();
  g.name = 'architecture';
  layout.meta.stations.forEach((station, index) => stationBay(g, station.x, index));
  retailBay(g);
  barberPole(g, layout.meta.pole.x, layout.meta.pole.z);
  reception(g, layout.meta.reception);
  washCorner(g);
  waitingDressing(g);
  hooksAndBroom(g);
  for (const station of layout.meta.stations) {
    contact(g, station.x, station.z, 0.42, 0.55);
  }
  contact(g, -4.42, 0.2, 0.32, 0.85);
  contact(g, -1.85, 2.38, 0.22, 0.22);
  return g;
}

boot({
  makeShell,
  makeProcedural,
  readyText: 'Crown Barber — orbit · T toon · U unlit',
});
