import * as THREE from 'three';
import { boot, toon, addBox, addCyl, makeCutawayShell } from './scene_lib.js';

const walnut = () => toon('#5c3b28');
const walnutDark = () => toon('#3a2618');
const walnutMid = () => toon('#7a5436');
const brass = () => toon('#c6a15e');
const chrome = () => toon('#d5dde4');
const chromeDark = () => toon('#8e99a3');
const leather = () => toon('#6e2430');
const leatherDeep = () => toon('#4c1822');
const plaster = () => toon('#f4eee4');
const green = () => toon('#1d3f38');
const greenDeep = () => toon('#142e29');
const towel = () => toon('#f7f3ea');
const bulbMat = () => toon('#fff4d4', { emissive: '#ffe6b0', emissiveIntensity: 1.15 });

const texCache = new Map();

function canvasTex(key, w, h, draw) {
  if (texCache.has(key)) return texCache.get(key);
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  draw(canvas.getContext('2d'), w, h);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  tex.needsUpdate = true;
  texCache.set(key, tex);
  return tex;
}

function mapped(key, w, h, draw, opts = {}) {
  return toon('#ffffff', { map: canvasTex(key, w, h, draw), ...opts });
}

function quiet(mesh, receive = false) {
  mesh.castShadow = false;
  mesh.userData.noShadow = true;
  mesh.userData.receiveShadow = receive;
  return mesh;
}

function addSphere(g, r, mat, x, y, z, seg = 16) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(r, seg, Math.max(10, Math.round(seg * 0.7))), mat);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  g.add(m);
  return m;
}

function addTorus(g, r, tube, mat, x, y, z) {
  const m = new THREE.Mesh(new THREE.TorusGeometry(r, tube, 8, 22), mat);
  m.rotation.x = Math.PI / 2;
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  g.add(m);
  return m;
}

function contact(g, x, z, rx, rz) {
  const m = new THREE.Mesh(
    new THREE.CircleGeometry(1, 18),
    toon('#1a120e', { transparent: true, opacity: 0.16, depthWrite: false, polygonOffset: true }),
  );
  m.rotation.x = -Math.PI / 2;
  m.position.set(x, 0.03, z);
  m.scale.set(rx, rz, 1);
  g.add(m);
  return quiet(m);
}

function planks(g, W, D) {
  const light = toon('#d4bc9a');
  const dark = toon('#c9b08c');
  const n = Math.ceil((D - 0.08) / 0.16);
  for (let i = 0; i < n; i++) {
    const z = -D / 2 + 0.1 + i * 0.16;
    quiet(addBox(g, W - 0.16, 0.012, 0.145, i % 2 ? dark : light, 0, 0.008, z), true);
  }
}

function checker(g, x0, x1, z0, z1) {
  const size = 0.32;
  const dark = toon('#1b1916');
  const light = toon('#ead8b6');
  const nx = Math.floor((x1 - x0) / size);
  const nz = Math.floor((z1 - z0) / size);
  for (let i = 0; i < nx; i++) {
    for (let j = 0; j < nz; j++) {
      quiet(addBox(
        g, size - 0.012, 0.014, size - 0.012,
        (i + j) % 2 ? dark : light,
        x0 + (i + 0.5) * size, 0.016, z0 + (j + 0.5) * size,
      ), true);
    }
  }
}

function tilePad(g, x0, x1, z0, z1, color) {
  const size = 0.22;
  const mat = toon(color);
  const grout = toon('#c5cdc8');
  const nx = Math.max(1, Math.floor((x1 - x0) / size));
  const nz = Math.max(1, Math.floor((z1 - z0) / size));
  const sx = (x1 - x0) / nx;
  const sz = (z1 - z0) / nz;
  for (let i = 0; i < nx; i++) {
    for (let j = 0; j < nz; j++) {
      quiet(addBox(g, sx - 0.012, 0.012, sz - 0.012, (i + j) % 5 === 0 ? grout : mat, x0 + (i + 0.5) * sx, 0.018, z0 + (j + 0.5) * sz), true);
    }
  }
}

function trim(mesh) {
  mesh.castShadow = false;
  mesh.userData.noShadow = true;
  mesh.userData.receiveShadow = true;
  return mesh;
}

function panels(g, axis, fixed, a0, a1, y, h, outward) {
  const span = a1 - a0;
  const n = Math.max(2, Math.round(span / 0.86));
  const step = span / n;
  for (let i = 0; i < n; i++) {
    const c = a0 + step * (i + 0.5);
    const pw = step - 0.05;
    if (axis === 'x') {
      trim(addBox(g, pw, h, 0.04, green(), c, y, fixed));
      trim(addBox(g, pw - 0.1, h - 0.12, 0.018, greenDeep(), c, y, fixed + outward));
    } else {
      trim(addBox(g, 0.04, h, pw, green(), fixed, y, c));
      trim(addBox(g, 0.018, h - 0.12, pw - 0.1, greenDeep(), fixed + outward, y, c));
    }
  }
}

function mirrorTexture(variant) {
  return mapped('mirror-' + variant, 256, 512, (ctx, w, h) => {
    const sky = ctx.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, '#d5e6ee');
    sky.addColorStop(0.34, '#c4b8a4');
    sky.addColorStop(0.62, '#8d989e');
    sky.addColorStop(1, '#d2c09a');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, h);

    ctx.fillStyle = '#efe4d4';
    ctx.fillRect(0, h * 0.16, w, h * 0.2);

    ctx.save();
    ctx.globalAlpha = 0.72;
    const tile = 32;
    for (let i = 0; i < 8; i++) {
      for (let j = 0; j < 3; j++) {
        ctx.fillStyle = (i + j + variant) % 2 ? '#1b1916' : '#ead8b6';
        ctx.fillRect(i * tile, h * 0.8 + j * 26, tile - 2, 24);
      }
    }
    ctx.restore();

    const cx = w * (0.36 + variant * 0.07);
    const chairTop = h * 0.36;
    ctx.fillStyle = '#d5dde4';
    ctx.fillRect(cx - 5, h * 0.66, 10, h * 0.16);
    ctx.beginPath();
    ctx.ellipse(cx, h * 0.84, 26, 9, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#6e2430';
    ctx.beginPath();
    ctx.roundRect(cx - 34, chairTop, 68, h * 0.26, 16);
    ctx.fill();
    ctx.fillStyle = '#4c1822';
    ctx.beginPath();
    ctx.roundRect(cx - 38, h * 0.6, 76, 18, 8);
    ctx.fill();
    ctx.fillStyle = '#6e2430';
    ctx.beginPath();
    ctx.roundRect(cx - 20, chairTop - 18, 40, 16, 8);
    ctx.fill();

    const bx = cx + 72;
    ctx.fillStyle = '#d7c4a4';
    ctx.beginPath();
    ctx.arc(bx, h * 0.34, 13, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#2a2e33';
    ctx.beginPath();
    ctx.roundRect(bx - 15, h * 0.4, 32, h * 0.26, 6);
    ctx.fill();
    ctx.fillStyle = '#f4efe4';
    ctx.fillRect(bx + 14, h * 0.44, 8, 34);

    ctx.fillStyle = '#e7e1d4';
    ctx.fillRect(18, h * 0.735, w - 36, 12);
    ctx.fillStyle = '#5c3b28';
    ctx.fillRect(18, h * 0.755, w - 36, 8);

    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.fillRect(w * 0.14, 0, 12, h);
    ctx.fillStyle = 'rgba(255, 236, 196, 0.9)';
    for (let i = 0; i < 4; i++) {
      ctx.beginPath();
      ctx.arc(36 + i * 58, 28, 6, 0, Math.PI * 2);
      ctx.fill();
    }
  }, { emissive: '#b7c6cc', emissiveIntensity: 0.08 });
}

function windowTexture() {
  return mapped('window', 384, 320, (ctx, w, h) => {
    const sky = ctx.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, '#d5e6ee');
    sky.addColorStop(0.55, '#e7dcc8');
    sky.addColorStop(1, '#8a9a6a');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#3d6a42';
    ctx.beginPath();
    ctx.arc(w * 0.72, h * 0.62, 70, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#2f5a38';
    ctx.beginPath();
    ctx.arc(w * 0.28, h * 0.7, 54, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.28)';
    ctx.fillRect(0, 0, w, h * 0.22);
  }, { emissive: '#d5e6ee', emissiveIntensity: 0.12 });
}

function hoursCard() {
  return mapped('hours', 320, 420, (ctx, w, h) => {
    ctx.fillStyle = '#f6f0e4';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#1d3f38';
    ctx.lineWidth = 12;
    ctx.strokeRect(14, 14, w - 28, h - 28);
    ctx.fillStyle = '#1d3f38';
    ctx.textAlign = 'center';
    ctx.font = '700 42px Georgia, serif';
    ctx.fillText('HOURS', w / 2, 90);
    ctx.font = '600 32px Georgia, serif';
    ctx.fillText('TUE-FRI', w / 2, 168);
    ctx.fillText('9 TO 7', w / 2, 214);
    ctx.fillText('SAT 8-5', w / 2, 292);
    ctx.fillText('SUN CLOSED', w / 2, 338);
  });
}

function poleTexture() {
  const tex = canvasTex('pole', 128, 256, (ctx, w, h) => {
    ctx.fillStyle = '#f4f4f4';
    ctx.fillRect(0, 0, w, h);
    ctx.save();
    ctx.translate(w / 2, h / 2);
    ctx.rotate(-0.7);
    const bands = ['#d4232b', '#f7f7f5', '#1d4e89'];
    for (let i = -8; i < 12; i++) {
      ctx.fillStyle = bands[((i % 3) + 3) % 3];
      ctx.fillRect(-w, i * 28, w * 3, 16);
    }
    ctx.restore();
  });
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  return toon('#ffffff', { map: tex });
}

function priceBoard() {
  return mapped('prices', 512, 640, (ctx, w, h) => {
    ctx.fillStyle = '#f6f0e4';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#1d3f38';
    ctx.lineWidth = 14;
    ctx.strokeRect(16, 16, w - 32, h - 32);
    ctx.fillStyle = '#1d3f38';
    ctx.textAlign = 'center';
    ctx.font = '700 54px Georgia, serif';
    ctx.fillText('KING STREET', w / 2, 100);
    ctx.font = '600 36px Georgia, serif';
    ctx.fillText('BARBERS', w / 2, 152);
    const rows = [['CUT', '28'], ['SHAVE', '20'], ['BEARD', '18']];
    ctx.font = '650 64px Georgia, serif';
    rows.forEach((row, i) => {
      const y = 270 + i * 110;
      ctx.textAlign = 'left';
      ctx.fillText(row[0], 70, y);
      ctx.textAlign = 'right';
      ctx.fillText(row[1], w - 70, y);
    });
  });
}

function signBoard() {
  return mapped('sign', 1024, 192, (ctx, w, h) => {
    ctx.fillStyle = '#1d3f38';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#c6a15e';
    ctx.lineWidth = 10;
    ctx.strokeRect(12, 12, w - 24, h - 24);
    ctx.fillStyle = '#f6f0e4';
    ctx.font = '700 92px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('KING STREET', w / 2, h / 2 + 4);
  });
}

function magCover(hue, title) {
  return mapped('mag-' + title, 256, 320, (ctx, w, h) => {
    ctx.fillStyle = hue;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.fillRect(18, 18, w - 36, 46);
    ctx.fillStyle = '#1a120e';
    ctx.font = '700 28px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillText(title, w / 2, 50);
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.fillRect(18, 180, w - 36, 110);
  });
}

function shopWindow(g, wallX) {
  const x = wallX + 0.05;
  const y = 1.64;
  const z = 0.48;
  const h = 0.82;
  const w = 1.05;
  trim(addBox(g, 0.045, h + 0.08, 0.05, walnut(), x, y, z - w / 2));
  trim(addBox(g, 0.045, h + 0.08, 0.05, walnut(), x, y, z + w / 2));
  trim(addBox(g, 0.045, 0.05, w, walnut(), x, y + h / 2, z));
  trim(addBox(g, 0.045, 0.05, w, walnut(), x, y - h / 2, z));
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(w - 0.08, h - 0.08), windowTexture());
  glass.position.set(x + 0.01, y, z);
  glass.rotation.y = Math.PI / 2;
  g.add(glass);
  trim(addBox(g, 0.02, h - 0.1, 0.02, walnutMid(), x + 0.02, y, z));
  trim(addBox(g, 0.02, 0.02, w - 0.1, walnutMid(), x + 0.02, y + 0.02, z));
  const blind = addCyl(g, 0.035, 0.035, w - 0.12, toon('#f4efe4'), x + 0.03, y + h / 2 - 0.06, z, 12);
  blind.rotation.x = Math.PI / 2;
  const lamp = addBox(g, 0.03, 0.03, 0.42, brass(), x + 0.04, y + h / 2 + 0.08, z);
  quiet(lamp);
  const glow = addBox(g, 0.012, 0.012, 0.32, toon('#fff1c8', { emissive: '#ffe6b0', emissiveIntensity: 1 }), x + 0.055, y + h / 2 + 0.05, z);
  quiet(glow);
}

function ceilingBay(g, H) {
  const plaster = toon('#f4eee4');
  quiet(addBox(g, 8.6, 0.07, 4.7, plaster, -0.45, H - 0.04, -1.05), true);
  trim(addBox(g, 8.6, 0.08, 0.07, walnutDark(), -0.45, H - 0.1, 1.28));
  trim(addBox(g, 8.6, 0.06, 0.06, walnut(), -0.45, H - 0.1, -3.38));
  const cans = [[-2.55, -2.15], [1.35, -2.15], [-3.4, 0.15], [2.4, 0.35]];
  for (const [x, z] of cans) {
    addCyl(g, 0.055, 0.08, 0.05, brass(), x, H - 0.1, z, 14);
    quiet(addCyl(g, 0.04, 0.04, 0.012, toon('#fff1c8', { emissive: '#ffe6b0', emissiveIntensity: 1.15 }), x, H - 0.13, z, 12));
  }
}

function makeShell(layout) {
  const g = makeCutawayShell(layout, { ceiling: false });
  const { width: W, depth: D, height: H } = layout.meta.room;
  const innerB = -D / 2 + 0.1;
  const innerL = -W / 2 + 0.1;
  planks(g, W, D);
  checker(g, -4.05, 2.15, -3.72, -1.4);
  tilePad(g, -5.12, -2.7, -0.22, 1.28, '#e7efec');

  const rug = toon('#6e2432');
  const rugIn = toon('#8a3a46');
  quiet(addBox(g, 2.55, 0.016, 1.9, rug, 3.45, 0.02, 1.85), true);
  quiet(addBox(g, 2.25, 0.01, 1.6, rugIn, 3.45, 0.03, 1.85), true);
  const run = layout.anchors.runner;
  quiet(addBox(g, run.x1 - run.x0, 0.014, run.z1 - run.z0, toon('#234640'), (run.x0 + run.x1) / 2, 0.022, (run.z0 + run.z1) / 2), true);

  const ao = toon('#2a2118', { transparent: true, opacity: 0.22, depthWrite: false });
  quiet(addBox(g, W - 0.2, 0.08, 0.06, ao, 0, 0.04, innerB));
  quiet(addBox(g, 0.06, 0.08, D - 0.2, ao, innerL, 0.04, 0));

  addBox(g, W - 0.28, 0.1, 0.05, walnutDark(), 0, 0.06, innerB + 0.02);
  addBox(g, 0.05, 0.1, D - 0.28, walnutDark(), innerL + 0.02, 0.06, 0);
  panels(g, 'x', innerB + 0.04, -W / 2 + 0.35, -3.4, 0.62, 0.92, 0.02);
  panels(g, 'x', innerB + 0.04, 2.15, W / 2 - 0.4, 0.62, 0.92, 0.02);
  panels(g, 'z', innerL + 0.04, -D / 2 + 0.4, -0.35, 0.62, 0.92, 0.02);
  panels(g, 'z', innerL + 0.04, 1.4, D / 2 - 0.35, 0.62, 0.92, 0.02);
  trim(addBox(g, 1.7, 0.05, 0.04, brass(), -4.15, 1.16, innerB + 0.03));
  trim(addBox(g, 2.4, 0.05, 0.04, brass(), 3.55, 1.16, innerB + 0.03));
  trim(addBox(g, 0.04, 0.05, D - 0.3, brass(), innerL + 0.03, 1.16, 0));

  shopWindow(g, innerL);
  const hours = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.56), hoursCard());
  hours.position.set(innerL + 0.06, 1.58, 1.72);
  hours.rotation.y = Math.PI / 2;
  g.add(hours);

  const board = new THREE.Mesh(new THREE.PlaneGeometry(0.72, 0.9), priceBoard());
  board.position.set(innerL + 0.06, 1.72, 2.55);
  board.rotation.y = Math.PI / 2;
  g.add(board);

  ceilingBay(g, H);
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(2.7, 0.4), signBoard());
  sign.position.set(-0.7, 2.5, -3.72);
  g.add(sign);
  trim(addBox(g, 6.2, 0.035, 0.04, brass(), -0.7, 2.22, -3.7));
  return g;
}

function barberChair(seatY) {
  const g = new THREE.Group();
  addCyl(g, 0.28, 0.32, 0.04, chromeDark(), 0, 0.025, 0, 24);
  addTorus(g, 0.26, 0.015, chrome(), 0, 0.048, 0);
  addCyl(g, 0.032, 0.05, 0.32, chrome(), 0, 0.21, 0, 16);
  addCyl(g, 0.08, 0.036, 0.07, chromeDark(), 0, 0.39, 0, 16);
  const pump = addCyl(g, 0.012, 0.012, 0.16, chromeDark(), 0.15, 0.2, 0.02, 8);
  pump.rotation.z = -1.05;

  addCyl(g, 0.23, 0.23, 0.035, walnutDark(), 0, seatY - 0.055, 0.02, 24);
  const cushion = addSphere(g, 0.22, leather(), 0, seatY - 0.005, 0.03, 28);
  cushion.scale.set(1.1, 0.3, 1.0);
  const roll = addCyl(g, 0.042, 0.042, 0.44, leatherDeep(), 0, seatY - 0.01, 0.2, 16);
  roll.rotation.z = Math.PI / 2;

  const back = new THREE.Group();
  back.name = 'chair-back';
  const pad = addSphere(back, 0.24, leather(), 0, 0.34, 0.02, 28);
  pad.scale.set(0.82, 1.12, 0.32);
  addCyl(back, 0.04, 0.036, 0.36, leather(), -0.16, 0.32, 0.02, 16);
  addCyl(back, 0.04, 0.036, 0.36, leather(), 0.16, 0.32, 0.02, 16);
  for (const by of [0.24, 0.4, 0.54]) quiet(addSphere(back, 0.012, leatherDeep(), 0, by, 0.09, 8));
  addCyl(back, 0.012, 0.012, 0.1, chrome(), 0, 0.64, 0.04, 10);
  const rest = addSphere(back, 0.09, leather(), 0, 0.73, 0.05, 24);
  rest.scale.set(1.28, 0.78, 0.62);
  back.position.set(0, seatY + 0.02, -0.18);
  back.rotation.x = -0.14;
  g.add(back);

  for (const side of [-1, 1]) {
    addCyl(g, 0.013, 0.015, 0.16, chrome(), side * 0.29, seatY + 0.05, 0.02, 10);
    const arm = addCyl(g, 0.028, 0.028, 0.3, leather(), side * 0.31, seatY + 0.17, 0.02, 16);
    arm.rotation.x = Math.PI / 2;
    addSphere(g, 0.03, leather(), side * 0.31, seatY + 0.17, 0.16, 12);
    addSphere(g, 0.028, leatherDeep(), side * 0.31, seatY + 0.17, -0.11, 12);
  }

  const stem = addCyl(g, 0.014, 0.014, 0.26, chrome(), 0, 0.22, 0.3, 8);
  stem.rotation.x = 0.35;
  const foot = addCyl(g, 0.045, 0.045, 0.26, chrome(), 0, 0.16, 0.46, 14);
  foot.rotation.z = Math.PI / 2;
  addBox(g, 0.2, 0.018, 0.07, chromeDark(), 0, 0.145, 0.56);
  return g;
}

function washChair() {
  const g = barberChair(0.5);
  const back = g.getObjectByName('chair-back');
  if (back) back.rotation.x = -0.62;
  const neck = new THREE.Group();
  addBox(neck, 0.22, 0.06, 0.16, leather(), 0, 0.78, -0.42);
  addBox(neck, 0.08, 0.04, 0.1, chrome(), 0, 0.74, -0.34);
  addCyl(neck, 0.035, 0.04, 0.08, leatherDeep(), -0.1, 0.8, -0.48, 10);
  addCyl(neck, 0.035, 0.04, 0.08, leatherDeep(), 0.1, 0.8, -0.48, 10);
  g.add(neck);
  return g;
}

function scissors(g, x, y, z, rot) {
  const s = new THREE.Group();
  const blade = toon('#dfe6ea');
  const handle = toon('#c6a15e');
  for (const sign of [-1, 1]) {
    const b = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.006, 0.014), blade);
    b.position.set(0.06, 0, 0);
    b.rotation.z = sign * 0.18;
    s.add(b);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.02, 0.005, 6, 12), handle);
    ring.position.set(-0.07, 0, sign * 0.01);
    s.add(ring);
  }
  s.position.set(x, y, z);
  s.rotation.y = rot;
  g.add(s);
}

function comb(g, x, y, z, rot) {
  const c = new THREE.Group();
  addBox(c, 0.2, 0.006, 0.014, toon('#f6f1e6'), 0, 0.01, 0);
  addBox(c, 0.16, 0.006, 0.028, toon('#efe6d4'), 0.015, 0.01, 0.012);
  c.position.set(x, y, z);
  c.rotation.y = rot;
  g.add(c);
}

function clipper(g, x, y, z, rot) {
  const s = new THREE.Group();
  addBox(s, 0.038, 0.15, 0.03, toon('#1c1e22'), 0, 0.075, 0);
  addBox(s, 0.046, 0.016, 0.01, chrome(), 0, 0.152, 0.01);
  addBox(s, 0.026, 0.035, 0.018, toon('#c4552a'), 0, 0.04, -0.006);
  s.position.set(x, y, z);
  s.rotation.y = rot;
  g.add(s);
}

function razor(g, x, y, z, rot) {
  const s = new THREE.Group();
  addBox(s, 0.11, 0.012, 0.018, brass(), -0.02, 0, 0);
  const blade = addBox(s, 0.07, 0.004, 0.02, chrome(), 0.06, 0.01, 0);
  blade.rotation.z = 0.5;
  s.position.set(x, y, z);
  s.rotation.y = rot;
  g.add(s);
}

function brush(g, x, y, z) {
  addCyl(g, 0.012, 0.014, 0.09, walnut(), x, y + 0.02, z, 8);
  addCyl(g, 0.028, 0.02, 0.045, toon('#2a241c'), x, y + 0.08, z, 10);
}

function spray(g, x, y, z) {
  addCyl(g, 0.028, 0.032, 0.14, toon('#d8efe6'), x, y + 0.07, z, 12);
  addBox(g, 0.03, 0.02, 0.03, toon('#1c1e22'), x, y + 0.15, z);
  addBox(g, 0.04, 0.012, 0.016, chromeDark(), x + 0.02, y + 0.15, z);
}

function barbicide(g, x, y, z) {
  addCyl(g, 0.055, 0.05, 0.09, toon('#1f6f9a'), x, y + 0.045, z, 14);
  addCyl(g, 0.058, 0.058, 0.012, chrome(), x, y + 0.095, z, 14);
  addBox(g, 0.008, 0.07, 0.012, toon('#f3efe4'), x - 0.012, y + 0.08, z);
  addBox(g, 0.008, 0.06, 0.012, toon('#f3efe4'), x + 0.012, y + 0.07, z);
}

function bottle(g, x, y, z, color, h) {
  addCyl(g, 0.028, 0.034, h, toon(color), x, y + h / 2, z, 10);
  addCyl(g, 0.012, 0.014, 0.03, toon('#1c1e22'), x, y + h + 0.012, z, 8);
}

function towelStack(g, x, y, z, n = 3) {
  for (let i = 0; i < n; i++) {
    addBox(g, 0.26, 0.035, 0.16, i % 2 ? towel() : toon('#e7f0ea'), x + (i - 1) * 0.01, y + 0.02 + i * 0.038, z);
  }
}

function cape(g, x, y, z, rot) {
  const c = new THREE.Group();
  addBox(c, 0.32, 0.42, 0.025, toon('#24262c'), 0, -0.16, 0);
  addBox(c, 0.22, 0.28, 0.02, toon('#1a1c22'), 0.04, -0.22, 0.02);
  addBox(c, 0.34, 0.045, 0.03, toon('#f4f1ea'), 0, 0.04, 0.01);
  c.position.set(x, y, z);
  c.rotation.y = rot;
  g.add(c);
}

function station(g, rec, anchors, variant) {
  const { counterFrontZ: frontZ, counterDepth: d, counterTop: top, mirrorBottom, mirrorTop } = anchors;
  const cz = frontZ - d / 2;
  const x = rec.x;
  const my = (mirrorBottom + mirrorTop) / 2;
  const mh = mirrorTop - mirrorBottom;
  const wallZ = -3.78;

  addBox(g, 1.16, mh, 0.02, mirrorTexture(variant), x, my, wallZ);
  addBox(g, 1.26, 0.045, 0.04, brass(), x, mirrorTop + 0.02, wallZ);
  addBox(g, 1.26, 0.045, 0.04, brass(), x, mirrorBottom - 0.02, wallZ);
  addBox(g, 0.045, mh + 0.08, 0.04, brass(), x - 0.6, my, wallZ);
  addBox(g, 0.045, mh + 0.08, 0.04, brass(), x + 0.6, my, wallZ);

  const bulbs = [
    [-0.42, mirrorTop + 0.08], [-0.14, mirrorTop + 0.08], [0.14, mirrorTop + 0.08], [0.42, mirrorTop + 0.08],
    [-0.64, my + 0.28], [-0.64, my - 0.16], [0.64, my + 0.28], [0.64, my - 0.16],
  ];
  for (const [bx, by] of bulbs) {
    const bulb = addSphere(g, 0.038, bulbMat(), x + bx, by, wallZ + 0.05);
    quiet(bulb);
  }

  addBox(g, 1.22, top - 0.12, d - 0.04, walnut(), x, (top - 0.12) / 2 + 0.08, cz);
  addBox(g, 1.3, 0.045, d + 0.04, toon('#e7e1d4'), x, top - 0.02, cz + 0.01);
  for (const dx of [-0.38, 0, 0.38]) {
    trim(addBox(g, 0.32, 0.16, 0.02, walnutMid(), x + dx, 0.42, frontZ + 0.02));
    const pull = addSphere(g, 0.014, brass(), x + dx, 0.42, frontZ + 0.04);
    trim(pull);
  }
  addBox(g, 1.16, 0.08, d - 0.12, walnutDark(), x, 0.04, cz);

  const frontZTool = cz + 0.08;
  addBox(g, 0.42, 0.014, 0.16, walnutMid(), x - 0.02, top + 0.008, frontZTool);
  clipper(g, x - 0.12, top + 0.016, frontZTool, 0.15);
  comb(g, x + 0.04, top + 0.02, frontZTool + 0.02, 0.35);
  scissors(g, x + 0.16, top + 0.028, frontZTool - 0.01, -0.4);
  barbicide(g, x - 0.46, top, cz - 0.08);
  bottle(g, x - 0.3, top, cz - 0.05, '#c4552a', 0.17);
  bottle(g, x + 0.46, top, cz - 0.04, '#1d3f38', 0.15);
  towelStack(g, x + 0.28, top, cz - 0.02, 3);
  if (variant === 0) brush(g, x + 0.08, top + 0.01, cz - 0.08);
  if (variant === 1) razor(g, x - 0.02, top + 0.02, cz - 0.07, 1.1);
  if (variant === 2) spray(g, x - 0.16, top, cz - 0.06);

  const chair = barberChair(anchors.chairSeat);
  chair.position.set(x, 0, rec.z);
  chair.rotation.y = anchors.chairRot;
  chair.name = `station-${rec.id}`;
  g.add(chair);
  contact(g, x, rec.z, 0.42, 0.48);
}

function washStation(g, wash) {
  const x = wash.basinX;
  const z = wash.basinZ;
  addBox(g, 0.72, 0.78, 1.2, walnut(), x - 0.06, 0.46, z);
  addBox(g, 0.78, 0.04, 1.26, toon('#f7f7f5'), x, wash.basinRim - 0.02, z);
  addBox(g, 0.02, 0.42, 0.5, walnutMid(), x + 0.3, 0.48, z - 0.28);
  addBox(g, 0.02, 0.42, 0.5, walnutMid(), x + 0.3, 0.48, z + 0.28);
  addSphere(g, 0.016, brass(), x + 0.32, 0.5, z - 0.28);
  addSphere(g, 0.016, brass(), x + 0.32, 0.5, z + 0.28);
  const bowl = addSphere(g, 0.26, toon('#f4f7f6'), x + 0.02, wash.basinRim + 0.02, z);
  bowl.name = 'basin';
  bowl.scale.set(1.15, 0.38, 0.72);
  addTorus(g, 0.24, 0.02, toon('#f7f7f5'), x + 0.02, wash.basinRim + 0.05, z);
  addCyl(g, 0.012, 0.012, 0.16, chrome(), x - 0.08, wash.basinRim + 0.16, z - 0.05, 8);
  const spout = addBox(g, 0.16, 0.02, 0.02, chrome(), x + 0.04, wash.basinRim + 0.22, z - 0.02);
  spout.rotation.z = 0.15;
  addSphere(g, 0.02, toon('#c4552a'), x - 0.16, wash.basinRim + 0.12, z + 0.1);
  addSphere(g, 0.02, toon('#d8e4ee'), x - 0.16, wash.basinRim + 0.12, z - 0.08);
  bottle(g, x - 0.12, wash.basinRim, z + 0.28, '#efe6c8', 0.18);
  bottle(g, x - 0.22, wash.basinRim, z + 0.22, '#7a3a28', 0.14);
  towelStack(g, x - 0.08, wash.basinRim, z - 0.38, 2);
  addCyl(g, 0.16, 0.18, 0.42, chromeDark(), x - 0.28, 0.28, z + 0.62, 12);
  addCyl(g, 0.17, 0.17, 0.03, chrome(), x - 0.28, 0.5, z + 0.62, 12);

  const chair = washChair();
  chair.position.set(wash.x, 0, wash.z);
  chair.rotation.y = wash.rot;
  chair.name = 'wash-chair';
  g.add(chair);
  contact(g, wash.x, wash.z, 0.46, 0.36);

}

function reception(g, desk) {
  const { x, z, top, w, d } = desk;
  addBox(g, w, top - 0.1, d, walnut(), x, (top - 0.1) / 2 + 0.06, z);
  addBox(g, w + 0.06, 0.045, d + 0.06, toon('#e7e1d4'), x, top - 0.02, z);
  addBox(g, w - 0.08, 0.28, 0.016, walnutMid(), x, 0.48, z + d / 2 + 0.01);
  addBox(g, 0.7, 0.22, 0.016, walnutMid(), x + 0.2, 0.78, z + d / 2 + 0.01);
  addSphere(g, 0.014, brass(), x - 0.15, 0.48, z + d / 2 + 0.03);
  addSphere(g, 0.014, brass(), x + 0.2, 0.78, z + d / 2 + 0.03);
  addBox(g, w - 0.2, 0.06, d - 0.16, walnutDark(), x, 0.04, z);
  const book = mapped('book', 256, 160, (ctx, cw, ch) => {
    ctx.fillStyle = '#f6f1e6';
    ctx.fillRect(0, 0, cw, ch);
    ctx.fillStyle = '#1d3f38';
    ctx.font = '600 28px Georgia, serif';
    for (let i = 0; i < 5; i++) ctx.fillRect(24, 28 + i * 24, 180 - (i % 2) * 40, 6);
  });
  const page = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.012, 0.22), book);
  page.position.set(x + 0.15, top + 0.01, z + 0.02);
  page.rotation.y = -0.2;
  g.add(page);
}

function pole(g, p) {
  addCyl(g, 0.11, 0.13, 0.05, brass(), p.x, 0.03, p.z, 14);
  addCyl(g, 0.07, 0.07, 1.28, poleTexture(), p.x, 0.72, p.z, 18);
  const glass = addCyl(g, 0.09, 0.09, 1.2, toon('#d5e6ee', { transparent: true, opacity: 0.18 }), p.x, 0.72, p.z, 18);
  quiet(glass);
  addCyl(g, 0.11, 0.09, 0.06, brass(), p.x, 1.4, p.z, 14);
  const ball = addSphere(g, 0.07, brass(), p.x, 1.52, p.z);
  ball.name = 'pole';
}

function linen(g) {
  addBox(g, 0.58, 1.28, 0.4, walnut(), -4.2, 0.66, -3.5);
  addBox(g, 0.24, 0.42, 0.016, walnutMid(), -4.2 - 0.12, 0.85, -3.28);
  addBox(g, 0.24, 0.42, 0.016, walnutMid(), -4.2 + 0.12, 0.85, -3.28);
  addSphere(g, 0.012, brass(), -4.2 - 0.02, 0.85, -3.26);
  addSphere(g, 0.012, brass(), -4.2 + 0.02, 0.85, -3.26);
  towelStack(g, -4.2, 1.3, -3.48, 4);
  addBox(g, 0.08, 0.04, 0.04, brass(), -3.72, 1.45, -3.74);
  addBox(g, 0.08, 0.04, 0.04, brass(), -3.72, 1.28, -3.74);
  cape(g, -3.72, 1.42, -3.68, 0.4);
}

function foliage(g, x, z) {
  addCyl(g, 0.02, 0.028, 0.22, toon('#3d4a2c'), x, 0.42, z, 7);
  addSphere(g, 0.16, toon('#2f6a3e'), x, 0.64, z);
  addSphere(g, 0.11, toon('#3e7a48'), x + 0.09, 0.58, z + 0.05);
  addSphere(g, 0.09, toon('#245833'), x - 0.07, 0.55, z - 0.04);
}

function cushions(g) {
  // Sofa bounds from the bake: seat toward x=3.72, back toward x=4.58, cushion line near y=0.36.
  const pads = [
    [3.92, 0.33, 1.68, '#6e2430'],
    [3.92, 0.33, 2.02, '#1d3f38'],
    [4.1, 0.42, 1.85, '#c6a15e'],
  ];
  for (const [x, y, z, color] of pads) {
    addBox(g, 0.2, 0.07, 0.26, toon(color), x, y, z);
  }
}

function magazines(g, coffee) {
  const [x, , z] = coffee.position;
  const y = 0.405;
  const covers = [
    [magCover('#6e2430', 'FADE'), 0.12, 0.02, -0.15],
    [magCover('#1d3f38', 'EDGE'), -0.08, 0.008, 0.12],
    [magCover('#1c1e22', 'CLIP'), 0.02, -0.06, 0.02],
  ];
  covers.forEach(([mat, dx, dz, rot], i) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.012, 0.32), mat);
    m.position.set(x + dx, y + i * 0.004, z + dz);
    m.rotation.y = rot;
    g.add(m);
  });
}

function makeProcedural(layout) {
  const g = new THREE.Group();
  g.name = 'procedural';
  const a = layout.anchors;
  a.stations.forEach((rec, i) => station(g, rec, a, i));
  washStation(g, a.wash);
  reception(g, a.reception);
  pole(g, a.pole);
  linen(g);
  const pot = layout.instances.find((item) => item.id === 'pot');
  foliage(g, pot.position[0], pot.position[2]);
  cushions(g);
  const shelf = layout.instances.find((item) => item.id === 'shelf');
  bottle(g, shelf.position[0] + 0.12, shelf.position[1] + 0.2, shelf.position[2] - 0.1, '#7a3030', 0.12);
  bottle(g, shelf.position[0] + 0.12, shelf.position[1] + 0.2, shelf.position[2] + 0.1, '#efe6c8', 0.1);
  bottle(g, shelf.position[0] + 0.12, shelf.position[1] + 0.46, shelf.position[2], '#1d3f38', 0.11);
  magazines(g, layout.instances.find((item) => item.id === 'coffee'));
  contact(g, 4.15, 1.85, 0.48, 0.32);
  contact(g, 2.85, 1.85, 0.42, 0.32);
  contact(g, -4.72, 2.4, 0.22, 0.55);
  return g;
}

boot({
  makeShell,
  makeProcedural,
  readyText: 'ready — King Street barbershop · drag orbit · U unlit · T toon',
});
