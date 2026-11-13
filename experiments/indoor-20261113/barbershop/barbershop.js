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

function addSphere(g, r, mat, x, y, z) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(r, 16, 12), mat);
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

function mirrorTexture() {
  return mapped('mirror', 128, 256, (ctx, w, h) => {
    const grd = ctx.createLinearGradient(0, 0, w, 0);
    grd.addColorStop(0, '#8ea0aa');
    grd.addColorStop(0.18, '#d5e2e8');
    grd.addColorStop(0.5, '#b4c4cc');
    grd.addColorStop(0.82, '#d0dee4');
    grd.addColorStop(1, '#7f949e');
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(255,255,255,0.22)';
    ctx.fillRect(18, 0, 10, h);
  }, { emissive: '#8ea0aa', emissiveIntensity: 0.16 });
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

  trim(addBox(g, 0.035, 1.05, 1.35, toon('#f4f7f6'), innerL + 0.045, 1.28, 0.52));
  trim(addBox(g, 0.02, 0.035, 1.42, walnut(), innerL + 0.06, 1.82, 0.52));
  trim(addBox(g, 0.02, 0.035, 1.42, walnut(), innerL + 0.06, 0.74, 0.52));

  const board = new THREE.Mesh(new THREE.PlaneGeometry(0.72, 0.9), priceBoard());
  board.position.set(innerL + 0.06, 1.72, 2.4);
  board.rotation.y = Math.PI / 2;
  g.add(board);

  trim(addBox(g, 6.4, 0.12, 0.16, walnutDark(), -0.95, H - 0.16, -3.25));
  trim(addBox(g, 5.2, 0.1, 0.14, walnut(), -0.7, H - 0.34, -1.15));
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 0.42), signBoard());
  sign.position.set(-0.7, 2.62, -3.55);
  g.add(sign);

  trim(addBox(g, 2.4, 0.1, 0.14, walnutDark(), 3.2, H - 0.22, 1.85));
  return g;
}

function barberChair(seatY) {
  const g = new THREE.Group();
  addCyl(g, 0.3, 0.3, 0.035, chromeDark(), 0, 0.02, 0, 20);
  addTorus(g, 0.27, 0.018, chrome(), 0, 0.04, 0);
  addCyl(g, 0.045, 0.05, 0.4, chrome(), 0, 0.24, 0, 12);
  addTorus(g, 0.2, 0.016, chromeDark(), 0, 0.2, 0);
  const pump = addBox(g, 0.14, 0.02, 0.05, chromeDark(), 0.22, 0.16, -0.02);
  pump.rotation.z = -0.4;

  addBox(g, 0.52, 0.08, 0.5, leatherDeep(), 0, seatY - 0.02, 0.02);
  addBox(g, 0.46, 0.06, 0.44, leather(), 0, seatY + 0.04, 0.03);

  const back = new THREE.Group();
  back.name = 'chair-back';
  addBox(back, 0.44, 0.5, 0.07, leatherDeep(), 0, 0.28, 0);
  addBox(back, 0.18, 0.42, 0.03, leather(), -0.1, 0.3, 0.04);
  addBox(back, 0.18, 0.42, 0.03, leather(), 0.1, 0.3, 0.04);
  addCyl(back, 0.016, 0.016, 0.1, chrome(), 0, 0.52, 0.02, 8);
  const pad = addSphere(back, 0.12, leather(), 0, 0.6, 0.03);
  pad.scale.set(1.2, 0.48, 0.62);
  back.position.set(0, seatY + 0.08, -0.22);
  back.rotation.x = -0.08;
  g.add(back);

  for (const side of [-1, 1]) {
    addBox(g, 0.04, 0.16, 0.04, chromeDark(), side * 0.28, seatY + 0.12, 0.02);
    addBox(g, 0.08, 0.035, 0.28, leather(), side * 0.32, seatY + 0.2, 0.04);
    addBox(g, 0.05, 0.02, 0.22, chrome(), side * 0.32, seatY + 0.175, 0.04);
  }

  addBox(g, 0.05, 0.28, 0.04, chrome(), 0, seatY * 0.45, 0.34);
  addBox(g, 0.28, 0.02, 0.2, chrome(), 0, 0.2, 0.48);
  addBox(g, 0.3, 0.025, 0.06, chromeDark(), 0, 0.22, 0.55);
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
    const b = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.008, 0.016), blade);
    b.position.set(0.05, 0, 0);
    b.rotation.y = sign * 0.22;
    s.add(b);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.018, 0.005, 6, 12), handle);
    ring.position.set(-0.07, 0, sign * 0.012);
    s.add(ring);
  }
  s.position.set(x, y, z);
  s.rotation.y = rot;
  g.add(s);
}

function comb(g, x, y, z, rot) {
  const c = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.008, 0.028), toon('#f3efe4'));
  c.position.set(x, y, z);
  c.rotation.y = rot;
  g.add(c);
}

function clipper(g, x, y, z, rot) {
  const s = new THREE.Group();
  addBox(s, 0.045, 0.1, 0.038, toon('#1c1e22'), 0, 0.05, 0);
  addBox(s, 0.05, 0.02, 0.012, chrome(), 0, 0.1, 0.02);
  addBox(s, 0.03, 0.04, 0.02, toon('#4a4038'), 0, 0.03, -0.01);
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

  addBox(g, 1.16, mh, 0.02, mirrorTexture(), x, my, wallZ);
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

  const trayZ = cz + 0.05;
  addBox(g, 0.5, 0.018, 0.2, walnutMid(), x + 0.02, top + 0.01, trayZ);
  const y = top + 0.028;
  if (variant === 0) {
    scissors(g, x - 0.08, y, trayZ, 0.35);
    comb(g, x + 0.12, y, trayZ + 0.02, -0.2);
    brush(g, x + 0.28, top + 0.02, trayZ);
    barbicide(g, x - 0.28, top, cz - 0.08);
  } else if (variant === 1) {
    clipper(g, x - 0.12, top + 0.02, trayZ, 0.4);
    razor(g, x + 0.06, y, trayZ + 0.02, -0.15);
    spray(g, x + 0.24, top + 0.02, trayZ - 0.02);
    comb(g, x - 0.02, y, trayZ - 0.04, 1.1);
  } else {
    scissors(g, x + 0.08, y, trayZ, -0.4);
    bottle(g, x - 0.34, top, cz - 0.06, '#c4552a', 0.16);
    bottle(g, x - 0.22, top, cz + 0.02, '#1d3f38', 0.12);
    towelStack(g, x + 0.34, top, cz - 0.04, 3);
  }

  const chair = variant === 1 ? barberChair(anchors.chairSeat) : barberChair(anchors.chairSeat);
  if (variant === 1) cape(chair, 0, anchors.chairSeat + 0.42, -0.18, 0);
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
  addCyl(g, 0.16, 0.18, 0.06, brass(), p.x, 0.04, p.z, 14);
  addCyl(g, 0.11, 0.11, 1.35, poleTexture(), p.x, 0.78, p.z, 18);
  const glass = addCyl(g, 0.145, 0.145, 1.28, toon('#d5e6ee', { transparent: true, opacity: 0.18 }), p.x, 0.78, p.z, 18);
  quiet(glass);
  addCyl(g, 0.16, 0.14, 0.08, brass(), p.x, 1.5, p.z, 14);
  const ball = addSphere(g, 0.1, brass(), p.x, 1.66, p.z);
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
