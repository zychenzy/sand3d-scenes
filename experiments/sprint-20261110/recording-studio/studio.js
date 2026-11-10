import * as THREE from 'three';
import { boot, toon, addCable, retagEmissive, makeCutawayShell } from './scene_lib.js';

const foamA = () => toon('#5c3844');
const foamB = () => toon('#3e4c5a');
const foamDeep = () => toon('#2c343c');
const wood = () => toon('#8d6848');
const woodDark = () => toon('#4a3428');
const metal = () => toon('#3c4148');
const metalDark = () => toon('#23262b');
const black = () => toon('#16181c');
const cloth = () => toon('#2a2428');

function box(g, w, h, d, mat, x, y, z, rotY = 0) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  m.rotation.y = rotY;
  m.castShadow = true;
  m.receiveShadow = true;
  g.add(m);
  return m;
}

function cyl(g, rTop, rBot, h, mat, x, y, z, seg = 12) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBot, h, seg), mat);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  g.add(m);
  return m;
}

function noShadow(m) {
  m.userData.noShadow = true;
  m.castShadow = false;
  m.receiveShadow = false;
  return m;
}

function canvasTex(c) {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  t.needsUpdate = true;
  return t;
}

function makeTextures() {
  const sign = document.createElement('canvas');
  sign.width = 512;
  sign.height = 160;
  const sg = sign.getContext('2d');
  sg.fillStyle = '#7a1820';
  sg.fillRect(0, 0, 512, 160);
  sg.fillStyle = '#f4efe6';
  sg.font = '700 84px sans-serif';
  sg.textAlign = 'center';
  sg.textBaseline = 'middle';
  sg.fillText('ON AIR', 256, 84);

  const arrange = document.createElement('canvas');
  arrange.width = 512;
  arrange.height = 320;
  const ag = arrange.getContext('2d');
  ag.fillStyle = '#10161c';
  ag.fillRect(0, 0, 512, 320);
  ag.fillStyle = '#1c2832';
  ag.fillRect(0, 0, 512, 36);
  ag.fillStyle = '#d5e0e8';
  ag.font = '600 20px sans-serif';
  ag.textAlign = 'left';
  ag.textBaseline = 'middle';
  ag.fillText('VOX   TAKE 14', 16, 18);
  const lanes = ['#2f6f6a', '#8a5a3a', '#3a5278', '#6a3a4a', '#3f6a3a', '#6a6230'];
  const clips = [[28, 90], [140, 48], [210, 130], [360, 70], [40, 150], [250, 100], [400, 60], [80, 40]];
  for (let i = 0; i < 6; i++) {
    const y = 52 + i * 42;
    ag.fillStyle = '#182028';
    ag.fillRect(10, y, 492, 32);
    ag.fillStyle = lanes[i];
    const a = clips[i];
    const b = clips[(i + 3) % clips.length];
    ag.fillRect(a[0], y + 6, a[1], 20);
    ag.globalAlpha = 0.8;
    ag.fillRect(b[0], y + 6, Math.max(28, b[1] - 16), 20);
    ag.globalAlpha = 1;
  }
  ag.fillStyle = '#f2efe6';
  ag.fillRect(268, 44, 2, 260);

  const meters = document.createElement('canvas');
  meters.width = 512;
  meters.height = 320;
  const mg = meters.getContext('2d');
  mg.fillStyle = '#10161c';
  mg.fillRect(0, 0, 512, 320);
  mg.fillStyle = '#1c2832';
  mg.fillRect(0, 0, 512, 36);
  mg.fillStyle = '#d5e0e8';
  mg.font = '600 20px sans-serif';
  mg.textAlign = 'left';
  mg.textBaseline = 'middle';
  mg.fillText('CUE  ·  BOOTH', 16, 18);
  const heights = [0.35, 0.62, 0.48, 0.8, 0.44, 0.7, 0.55, 0.9, 0.38, 0.66, 0.5, 0.74];
  for (let i = 0; i < heights.length; i++) {
    const h = heights[i] * 200;
    mg.fillStyle = i === 7 ? '#c4a15a' : '#2f8f86';
    mg.fillRect(24 + i * 28, 270 - h, 16, h);
  }
  mg.strokeStyle = '#9fd4cc';
  mg.lineWidth = 3;
  mg.beginPath();
  const wave = [40, 18, 55, 8, 30, 62, 22, 48, 12, 36, 28, 16];
  wave.forEach((amp, i) => {
    const x = 300 + i * 16;
    if (i === 0) mg.moveTo(x, 160);
    else mg.lineTo(x, 160 - amp);
  });
  mg.stroke();

  const page = document.createElement('canvas');
  page.width = 256;
  page.height = 320;
  const pg = page.getContext('2d');
  pg.fillStyle = '#efe6d4';
  pg.fillRect(0, 0, 256, 320);
  pg.fillStyle = '#c45a58';
  pg.fillRect(28, 0, 3, 320);
  pg.strokeStyle = '#c9bba6';
  pg.lineWidth = 2;
  for (let y = 36; y < 300; y += 22) {
    pg.beginPath();
    pg.moveTo(44, y);
    pg.lineTo(236, y);
    pg.stroke();
  }
  pg.strokeStyle = '#3a4a6a';
  pg.lineWidth = 2.5;
  pg.beginPath();
  pg.moveTo(52, 70);
  pg.lineTo(180, 78);
  pg.lineTo(90, 110);
  pg.lineTo(200, 130);
  pg.stroke();

  const signTex = canvasTex(sign);
  const arrangeTex = canvasTex(arrange);
  const meterTex = canvasTex(meters);
  return {
    sign: toon('#ffffff', { map: signTex, emissive: '#ff2a2a', emissiveMap: signTex, emissiveIntensity: 0.5 }),
    arrange: toon('#ffffff', { map: arrangeTex, emissive: '#8ee4dc', emissiveMap: arrangeTex, emissiveIntensity: 0.42 }),
    meters: toon('#ffffff', { map: meterTex, emissive: '#8ee4dc', emissiveMap: meterTex, emissiveIntensity: 0.42 }),
    page: toon('#ffffff', { map: canvasTex(page) }),
  };
}

function framedPanel(g, w, h, x, y, z, color, axis) {
  const pad = toon(color);
  const frame = black();
  if (axis === 'x') {
    box(g, 0.05, h - 0.06, w - 0.06, pad, x, y, z);
    box(g, 0.07, 0.04, w, frame, x, y + h / 2 - 0.02, z);
    box(g, 0.07, 0.04, w, frame, x, y - h / 2 + 0.02, z);
    box(g, 0.07, h, 0.04, frame, x, y, z - w / 2 + 0.02);
    box(g, 0.07, h, 0.04, frame, x, y, z + w / 2 - 0.02);
  } else {
    box(g, w - 0.06, h - 0.06, 0.05, pad, x, y, z);
    box(g, w, 0.04, 0.07, frame, x, y + h / 2 - 0.02, z);
    box(g, w, 0.04, 0.07, frame, x, y - h / 2 + 0.02, z);
    box(g, 0.04, h, 0.07, frame, x - w / 2 + 0.02, y, z);
    box(g, 0.04, h, 0.07, frame, x + w / 2 - 0.02, y, z);
  }
}

function slatDiffusor(g, x0, x1, y0, y1, z) {
  const mat = wood();
  const n = 12;
  const span = x1 - x0;
  for (let i = 0; i < n; i++) {
    const depth = 0.04 + ((i * 3) % 5) * 0.018;
    const w = (span / n) * 0.46;
    const x = x0 + (i + 0.5) * (span / n);
    box(g, w, y1 - y0, depth, mat, x, (y0 + y1) / 2, z + depth / 2);
  }
  box(g, span, 0.04, 0.08, woodDark(), (x0 + x1) / 2, y1, z + 0.02);
  box(g, span, 0.04, 0.08, woodDark(), (x0 + x1) / 2, y0, z + 0.02);
}

function wedgeField(g, x, z0, z1, y0, y1, along) {
  const a = foamDeep();
  const b = foamA();
  const rows = 5;
  const cols = 6;
  const fh = (y1 - y0) / rows;
  const fw = (z1 - z0) / cols;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if ((r * 2 + c) % 11 === 0) continue;
      const depth = 0.05 + ((r + c * 2) % 3) * 0.03;
      const mat = (r + c) % 2 === 0 ? a : b;
      if (along === 'z') {
        box(g, depth, fh - 0.02, fw - 0.02, mat, x + depth / 2, y0 + (r + 0.5) * fh, z0 + (c + 0.5) * fw);
      } else {
        box(g, fw - 0.02, fh - 0.02, depth, mat, z0 + (c + 0.5) * fw, y0 + (r + 0.5) * fh, x + depth / 2);
      }
    }
  }
}

function ceilingCloud(g, w, d, x, y, z, rotY) {
  const grp = new THREE.Group();
  box(grp, w, 0.045, d, cloth(), 0, 0, 0);
  box(grp, w, 0.02, 0.03, woodDark(), 0, 0.02, d / 2 - 0.02);
  box(grp, w, 0.02, 0.03, woodDark(), 0, 0.02, -d / 2 + 0.02);
  box(grp, 0.03, 0.02, d, woodDark(), w / 2 - 0.02, 0.02, 0);
  box(grp, 0.03, 0.02, d, woodDark(), -w / 2 + 0.02, 0.02, 0);
  cyl(grp, 0.006, 0.006, 0.32, metal(), -w * 0.28, 0.18, -d * 0.22, 6);
  cyl(grp, 0.006, 0.006, 0.32, metal(), w * 0.28, 0.18, d * 0.22, 6);
  grp.position.set(x, y, z);
  grp.rotation.y = rotY || 0;
  g.add(grp);
}

function acousticTreatment(g, layout) {
  const { width: W, depth: D, height: H } = layout.meta.room;
  const b = layout.zones.booth;
  const backZ = -D / 2 + 0.16;
  const leftX = -W / 2 + 0.16;

  framedPanel(g, 0.72, 1.45, b.x1 + 0.55, 1.55, backZ, '#5c3844', 'z');
  slatDiffusor(g, -0.85, 0.95, 0.85, 2.35, backZ - 0.02);
  framedPanel(g, 0.9, 1.2, 1.7, 1.75, backZ, '#3e4c5a', 'z');
  framedPanel(g, 0.62, 1.65, 2.85, 1.25, backZ, '#4e3542', 'z');
  framedPanel(g, 0.5, 0.72, 3.85, 2.05, backZ, '#3e4c5a', 'z');

  box(g, 0.42, 2.15, 0.42, foamDeep(), W / 2 - 0.7, 1.08, -D / 2 + 0.48);

  framedPanel(g, 0.95, 1.25, leftX, 1.5, -0.15, '#5c3844', 'x');
  framedPanel(g, 0.7, 0.85, leftX, 1.85, 1.15, '#3e4c5a', 'x');
  wedgeField(g, leftX - 0.02, 1.7, 2.85, 0.45, 2.15, 'z');

  box(g, W - 0.4, 0.08, 0.04, woodDark(), 0.2, 0.05, -D / 2 + 0.1);
  box(g, 0.04, 0.08, D - b.z1 - 0.4, woodDark(), -W / 2 + 0.1, 0.05, (b.z1 + D / 2) / 2);

  const dk = layout.zones.desk;
  box(g, dk.w + 0.45, 0.015, 2.15, toon('#5a4636'), dk.x, 0.008, 0.42);
  box(g, dk.w + 0.55, 0.01, 0.04, woodDark(), dk.x, 0.012, 0.42 + 1.05);
  box(g, dk.w + 0.55, 0.01, 0.04, woodDark(), dk.x, 0.012, 0.42 - 1.05);

  ceilingCloud(g, 1.7, 1.05, dk.x + 0.1, H - 0.42, 0.55, -0.08);
  ceilingCloud(g, 1.15, 0.72, dk.x + 0.85, H - 0.34, -0.55, 0.18);

  const lounge = layout.zones.lounge;
  box(g, 2.2, 0.012, 1.45, toon('#3a2c32'), lounge.x, 0.008, lounge.z - 0.15, lounge.rotY);
}

function vocalBooth(g, layout, tex) {
  const b = layout.zones.booth;
  const { x0, x1, z0, z1, glassTop, lid, doorW, doorH } = b;
  const frame = black();
  const glassMat = toon('#b7d0dc', {
    transparent: true,
    opacity: 0.2,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const w = x1 - x0;
  const d = z1 - z0;
  const cx = (x0 + x1) / 2;
  const cz = (z0 + z1) / 2;

  box(g, w - 0.12, 0.02, d - 0.12, toon('#2a2428'), cx, 0.012, cz);
  box(g, w + 0.04, 0.07, d + 0.04, toon('#1a1e24'), cx, lid, cz);
  box(g, 0.08, glassTop, d, frame, x0, glassTop / 2, cz);
  box(g, w, glassTop, 0.08, frame, cx, glassTop / 2, z0);

  const pad = toon('#241e22');
  const pad2 = toon('#34282e');
  box(g, 0.85, 1.45, 0.07, pad, x0 + 0.78, 1.15, z0 + 0.12);
  box(g, 0.7, 1.15, 0.09, pad2, cx + 0.15, 1.28, z0 + 0.14);
  box(g, 0.07, 1.35, 0.8, pad2, x0 + 0.12, 1.2, z0 + 0.7);
  box(g, 0.09, 1.05, 0.55, pad, x0 + 0.14, 1.15, z0 + 1.45);
  box(g, 0.28, 1.75, 0.28, foamDeep(), x0 + 0.34, 0.88, z0 + 0.34);

  const hingeX = x1 - 0.16 - doorW;
  const leftW = hingeX - (x0 + 0.08);
  const leftPane = box(g, leftW, glassTop - 0.12, 0.02, glassMat, x0 + 0.08 + leftW / 2, glassTop / 2, z1);
  noShadow(leftPane);
  leftPane.renderOrder = 2;
  const transomH = glassTop - doorH - 0.02;
  const transom = box(g, doorW, transomH, 0.02, glassMat, hingeX + doorW / 2, doorH + transomH / 2, z1);
  noShadow(transom);
  transom.renderOrder = 2;

  box(g, 0.05, glassTop, 0.06, frame, hingeX, glassTop / 2, z1);
  box(g, 0.05, glassTop, 0.06, frame, x0 + 0.06, glassTop / 2, z1);
  box(g, w, 0.06, 0.06, frame, cx, glassTop - 0.02, z1);
  box(g, w, 0.08, 0.08, frame, cx, 0.04, z1);

  const door = new THREE.Group();
  door.position.set(hingeX, 0, z1);
  door.rotation.y = -0.78;
  const pane = box(door, doorW - 0.1, doorH - 0.12, 0.018, glassMat, doorW / 2, doorH / 2, 0);
  noShadow(pane);
  pane.renderOrder = 2;
  box(door, 0.05, doorH, 0.045, frame, 0.03, doorH / 2, 0);
  box(door, 0.05, doorH, 0.045, frame, doorW - 0.03, doorH / 2, 0);
  box(door, doorW, 0.05, 0.045, frame, doorW / 2, doorH - 0.03, 0);
  box(door, doorW, 0.06, 0.045, frame, doorW / 2, 0.03, 0);
  box(door, 0.09, 0.028, 0.045, toon('#c6a56a'), doorW - 0.14, 1.02, 0.03);
  g.add(door);

  const rightH = glassTop - 0.1;
  const mullionZ = z0 + d * 0.48;
  const rearD = mullionZ - z0 - 0.08;
  const frontD = z1 - mullionZ - 0.08;
  const rearPane = box(g, 0.02, rightH, rearD, glassMat, x1, rightH / 2 + 0.04, z0 + 0.08 + rearD / 2);
  const frontPane = box(g, 0.02, rightH, frontD, glassMat, x1, rightH / 2 + 0.04, mullionZ + 0.04 + frontD / 2);
  noShadow(rearPane);
  noShadow(frontPane);
  rearPane.renderOrder = 2;
  frontPane.renderOrder = 2;
  box(g, 0.06, glassTop, 0.05, frame, x1, glassTop / 2, mullionZ);
  box(g, 0.06, glassTop, 0.05, frame, x1, glassTop / 2, z0 + 0.04);
  box(g, 0.06, glassTop, 0.05, frame, x1, glassTop / 2, z1 - 0.04);
  box(g, 0.06, 0.05, d, frame, x1, glassTop - 0.02, cz);
  box(g, 0.08, 0.08, d, frame, x1, 0.04, cz);

  const signX = hingeX + doorW / 2;
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.16), tex.sign);
  sign.position.set(signX, 2.14, z1 + 0.05);
  noShadow(sign);
  g.add(sign);
  const lens = new THREE.Mesh(new THREE.SphereGeometry(0.045, 12, 10), toon('#ff3a3a', { emissive: '#ff2020', emissiveIntensity: 0.8 }));
  lens.position.set(signX + 0.34, 2.16, z1 + 0.06);
  noShadow(lens);
  g.add(lens);

  const can = cyl(g, 0.09, 0.11, 0.08, metalDark(), cx, lid - 0.1, -2.45, 12);
  noShadow(cyl(g, 0.07, 0.07, 0.012, toon('#d5e7ff', { emissive: '#c5dcff', emissiveIntensity: 0.7 }), cx, lid - 0.145, -2.45, 12));
  can.castShadow = true;

  const plate = box(g, 0.04, 0.16, 0.22, metal(), x1 + 0.02, 0.36, -2.55);
  plate.castShadow = true;
  for (let i = 0; i < 4; i++) {
    cyl(g, 0.012, 0.012, 0.03, toon(i % 2 ? '#8a3038' : '#1d2430'), x1 + 0.04, 0.32 + (i % 2) * 0.05, -2.64 + i * 0.045, 8);
  }

  vocalMic(g, cx, -2.28);
  musicStand(g, cx + 0.48, -2.72, tex);
}

function vocalMic(g, x, z) {
  const metalM = toon('#8e959c');
  const dark = black();
  cyl(g, 0.12, 0.13, 0.03, dark, x, 0.02, z, 16);
  cyl(g, 0.016, 0.016, 1.12, metalM, x, 0.58, z, 8);
  box(g, 0.025, 0.025, 0.26, metalM, x, 1.16, z - 0.1);
  cyl(g, 0.03, 0.034, 0.12, dark, x, 1.18, z - 0.22, 10);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.038, 14, 12), toon('#d5dbe0'));
  head.position.set(x, 1.25, z - 0.22);
  head.castShadow = true;
  g.add(head);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.085, 0.006, 6, 18), metalM);
  ring.position.set(x, 1.2, z - 0.4);
  ring.castShadow = true;
  g.add(ring);
  const gauze = new THREE.Mesh(
    new THREE.CircleGeometry(0.08, 16),
    toon('#e4e8ee', { transparent: true, opacity: 0.38, side: THREE.DoubleSide, depthWrite: false })
  );
  gauze.position.set(x, 1.2, z - 0.4);
  noShadow(gauze);
  gauze.renderOrder = 2;
  g.add(gauze);
  addCable(g, [
    [x, 0.04, z],
    [x + 0.15, 0.03, z - 0.1],
    [x + 0.7, 0.03, -2.55],
    [-1.86, 0.05, -2.55],
    [-1.86, 0.36, -2.55],
  ], 0.008, black());
}

function musicStand(g, x, z, tex) {
  const m = metal();
  cyl(g, 0.1, 0.11, 0.02, black(), x, 0.015, z, 12);
  cyl(g, 0.012, 0.012, 0.95, m, x, 0.5, z, 8);
  box(g, 0.32, 0.02, 0.24, m, x, 1.02, z);
  const sheet = new THREE.Mesh(new THREE.PlaneGeometry(0.26, 0.32), tex.page);
  sheet.position.set(x, 1.16, z - 0.02);
  sheet.rotation.y = Math.PI;
  sheet.rotation.x = 0.4;
  noShadow(sheet);
  g.add(sheet);
}

function mixingDesk(g, layout, tex) {
  const dsk = layout.zones.desk;
  const grp = new THREE.Group();
  const { w, d, top } = dsk;
  const oak = toon('#7a5640');
  const oakD = woodDark();
  const deck = toon('#262a30');
  const pad = toon('#1c1e22');

  for (const [lx, lz] of [[-w / 2 + 0.08, -d / 2 + 0.1], [w / 2 - 0.08, -d / 2 + 0.1], [-w / 2 + 0.08, d / 2 - 0.12], [w / 2 - 0.08, d / 2 - 0.12]]) {
    box(grp, 0.055, top - 0.04, 0.055, metal(), lx, (top - 0.04) / 2, lz);
  }
  box(grp, 0.05, top - 0.12, d - 0.16, oakD, -w / 2 + 0.03, (top - 0.12) / 2 + 0.02, 0);
  box(grp, 0.05, top - 0.12, d - 0.16, oakD, w / 2 - 0.03, (top - 0.12) / 2 + 0.02, 0);
  box(grp, w - 0.12, 0.08, 0.04, oakD, 0, top * 0.45, -d / 2 + 0.08);
  box(grp, w, 0.045, d, oak, 0, top - 0.02, 0);
  box(grp, w - 0.55, 0.018, 0.62, deck, 0, top + 0.006, -0.02);
  box(grp, w - 0.7, 0.045, 0.12, pad, 0, top + 0.012, d / 2 - 0.12);

  const bridgeZ = -0.2;
  box(grp, w - 0.62, 0.07, 0.08, oakD, 0, top + 0.05, bridgeZ);
  for (let i = 0; i < 10; i++) {
    const x = -0.62 + i * 0.14;
    box(grp, 0.09, 0.05, 0.012, black(), x, top + 0.09, bridgeZ + 0.04);
    const face = box(grp, 0.07, 0.034, 0.008, toon('#e0b15a', { emissive: '#e0b15a', emissiveIntensity: 0.35 }), x, top + 0.09, bridgeZ + 0.048);
    noShadow(face);
    const needle = box(grp, 0.006, 0.026, 0.006, black(), x + ((i % 5) - 2) * 0.008, top + 0.09, bridgeZ + 0.054);
    needle.rotation.z = ((i % 5) - 2) * 0.18;
  }
  const tally = box(grp, 0.045, 0.028, 0.01, toon('#ff3b3b', { emissive: '#ff2020', emissiveIntensity: 0.7 }), 0.78, top + 0.09, bridgeZ + 0.05);
  noShadow(tally);

  const caps = [0.45, 0.72, 0.38, 0.86, 0.55, 0.63, 0.28, 0.78, 0.5, 0.9, 0.42, 0.66, 0.33, 0.74, 0.48, 0.6];
  function fader(x, z, t, hot) {
    box(grp, 0.012, 0.01, 0.09, metalDark(), x, top + 0.012, z);
    const capMat = hot === 'red' ? toon('#8d3034') : hot === 'amber' ? toon('#c4a15a') : black();
    box(grp, 0.028, 0.02, 0.018, capMat, x, top + 0.02 + t * 0.045, z - 0.03 + t * 0.06);
  }
  for (let i = 0; i < 8; i++) fader(-0.78 + i * 0.058, 0.14, caps[i], i === 3 ? 'red' : null);
  for (let i = 0; i < 8; i++) fader(0.32 + i * 0.058, 0.14, caps[i + 8], i === 6 ? 'amber' : null);
  fader(-0.08, 0.14, 0.7, 'red');
  fader(0.02, 0.14, 0.48, null);
  fader(0.12, 0.14, 0.62, null);

  for (let row = 0; row < 2; row++) {
    for (let i = 0; i < 12; i++) {
      const x = -0.7 + i * 0.125;
      const y = top + 0.02;
      const z = -0.02 - row * 0.08;
      cyl(grp, 0.016, 0.018, 0.012, i % 7 === 2 ? toon('#c6a56a') : metalDark(), x, y, z, 8);
    }
  }

  const sheet = new THREE.Mesh(new THREE.PlaneGeometry(0.22, 0.28), tex.page);
  sheet.rotation.x = -Math.PI / 2;
  sheet.position.set(-0.55, top + 0.03, 0.28);
  noShadow(sheet);
  grp.add(sheet);

  headphones(grp, -w / 2 + 0.1, top + 0.02, d / 2 - 0.05, -0.5, true);

  grp.position.set(dsk.x, 0, dsk.z);
  g.add(grp);
}

function headphones(g, x, y, z, rotY, hang) {
  const grp = new THREE.Group();
  const band = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.012, 8, 18, Math.PI), black());
  band.rotation.z = Math.PI;
  band.position.y = 0.04;
  grp.add(band);
  for (const sx of [-1, 1]) {
    const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.048, 0.048, 0.032, 12), toon('#121418'));
    cup.rotation.z = Math.PI / 2;
    cup.position.set(sx * 0.11, 0.0, 0);
    grp.add(cup);
    const ear = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.036, 0.012, 12), cloth());
    ear.rotation.z = Math.PI / 2;
    ear.position.set(sx * 0.11, 0.0, 0.02);
    grp.add(ear);
  }
  grp.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  grp.position.set(x, y, z);
  grp.rotation.y = rotY;
  if (hang) grp.rotation.z = Math.PI;
  g.add(grp);
}

function screenGlow(g, layout, tex) {
  const mats = { mon_l: tex.arrange, mon_r: tex.meters };
  for (const inst of layout.instances) {
    if (!mats[inst.id]) continue;
    const [x, y, z] = inst.position;
    const plane = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.2), mats[inst.id]);
    plane.position.set(x, y + 0.24, z + 0.07);
    plane.rotation.y = inst.rotationY || 0;
    noShadow(plane);
    g.add(plane);
  }
}

function speakerStand(g, x, z, topY) {
  const m = metalDark();
  cyl(g, 0.16, 0.18, 0.04, m, x, 0.02, z, 12);
  cyl(g, 0.025, 0.03, topY - 0.06, metal(), x, topY / 2, z, 8);
  box(g, 0.42, 0.025, 0.28, m, x, topY - 0.01, z);
}

function subwoofer(g) {
  box(g, 0.46, 0.42, 0.4, black(), 0.82, 0.21, -3.22);
  box(g, 0.28, 0.28, 0.02, toon('#2a2e32'), 0.82, 0.24, -3.01);
  cyl(g, 0.09, 0.09, 0.02, metalDark(), 0.82, 0.24, -3.0, 12);
}

function equipmentRack(g, spec, variant) {
  const grp = new THREE.Group();
  const W = 0.56;
  const D = 0.48;
  const H = 1.74;
  const side = toon('#1c1e22');
  const face = toon('#2a2e34');
  box(grp, 0.03, H, D, side, -W / 2 + 0.015, H / 2, 0);
  box(grp, 0.03, H, D, side, W / 2 - 0.015, H / 2, 0);
  box(grp, W, 0.04, D, side, 0, 0.08, 0);
  box(grp, W, 0.04, D, side, 0, H - 0.02, 0);
  box(grp, W - 0.04, H - 0.12, 0.03, toon('#14161a'), 0, H / 2, -D / 2 + 0.02);
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      cyl(grp, 0.03, 0.03, 0.05, metalDark(), sx * (W / 2 - 0.06), 0.03, sz * (D / 2 - 0.08), 8);
    }
  }

  const units = variant === 0
    ? [['power', 0.11], ['pre', 0.09], ['comp', 0.09], ['convert', 0.14], ['patch', 0.08], ['meter', 0.1], ['blank', 0.08], ['pre', 0.09]]
    : [['power', 0.11], ['convert', 0.14], ['comp', 0.09], ['patch', 0.08], ['meter', 0.1], ['blank', 0.18], ['pre', 0.09]];
  let y = 0.14;
  const fz = D / 2 - 0.01;
  units.forEach(([kind, h], idx) => {
    const cy = y + h / 2;
    box(grp, W - 0.08, h - 0.008, 0.02, face, 0, cy, fz);
    if (kind === 'power') {
      box(grp, 0.04, 0.025, 0.012, toon('#ff3b3b', { emissive: '#ff2020', emissiveIntensity: 0.55 }), -0.16, cy, fz + 0.016);
      cyl(grp, 0.012, 0.012, 0.012, toon('#3dce6a', { emissive: '#3dce6a', emissiveIntensity: 0.4 }), 0.16, cy, fz + 0.012, 8);
    } else if (kind === 'pre' || kind === 'comp') {
      for (let k = 0; k < 4; k++) {
        cyl(grp, 0.014, 0.016, 0.012, k === 2 ? toon('#c6a56a') : metalDark(), -0.12 + k * 0.07, cy, fz + 0.014, 8);
      }
      const led = toon(idx % 2 ? '#e0b15a' : '#3dce6a', { emissive: idx % 2 ? '#e0b15a' : '#3dce6a', emissiveIntensity: 0.45 });
      cyl(grp, 0.01, 0.01, 0.01, led, 0.16, cy, fz + 0.012, 8);
    } else if (kind === 'convert') {
      const screen = box(grp, 0.16, h * 0.55, 0.01, toon('#16343a', { emissive: '#1c8f88', emissiveIntensity: 0.45 }), -0.08, cy, fz + 0.016);
      noShadow(screen);
      cyl(grp, 0.01, 0.01, 0.01, toon('#3dce6a', { emissive: '#3dce6a', emissiveIntensity: 0.4 }), 0.16, cy + 0.02, fz + 0.012, 8);
      cyl(grp, 0.01, 0.01, 0.01, toon('#e0b15a', { emissive: '#e0b15a', emissiveIntensity: 0.35 }), 0.16, cy - 0.025, fz + 0.012, 8);
    } else if (kind === 'patch') {
      for (let k = 0; k < 10; k++) {
        cyl(grp, 0.008, 0.008, 0.012, metal(), -0.16 + k * 0.034, cy, fz + 0.012, 6);
        if (k % 3 === variant) {
          cyl(grp, 0.006, 0.006, 0.04, toon(k % 2 ? '#8a3038' : '#243048'), -0.16 + k * 0.034, cy - 0.03, fz + 0.02, 6);
        }
      }
    } else if (kind === 'meter') {
      for (let k = 0; k < 6; k++) {
        const mh = 0.02 + ((k * 3 + variant) % 4) * 0.008;
        box(grp, 0.018, mh, 0.008, toon('#e0b15a', { emissive: '#e0b15a', emissiveIntensity: 0.3 }), -0.12 + k * 0.045, cy - 0.01 + mh / 2, fz + 0.014);
      }
    } else {
      for (let k = 0; k < 3; k++) {
        box(grp, W - 0.16, 0.008, 0.008, black(), 0, cy - h * 0.25 + k * (h * 0.22), fz + 0.012);
      }
    }
    y += h;
  });

  grp.position.set(spec.x, 0, spec.z);
  grp.rotation.y = spec.rotY;
  g.add(grp);
}

function cableLooms(g, layout) {
  const desk = layout.zones.desk;
  const b = layout.zones.booth;
  const end = [desk.x + desk.w / 2 - 0.02, 0.48, desk.z - 0.15];
  const jacket = black();
  const red = toon('#6e3438');
  const blue = toon('#2a3a52');
  for (let i = 0; i < layout.zones.racks.length; i++) {
    const r = layout.zones.racks[i];
    const start = [r.x - 0.28, 0.14, r.z];
    addCable(g, [
      start,
      [start[0] - 0.15, 0.035, start[2]],
      [1.4, 0.03, -0.95 + i * 0.08],
      [0.1, 0.03, -0.7],
      [end[0] + 0.45, 0.035, end[2] + i * 0.04],
      end,
    ], 0.011, i === 0 ? jacket : blue);
  }
  const grommet = [b.x1 + 0.04, 0.36, -2.55];
  const colors = [jacket, red, blue, jacket];
  colors.forEach((mat, i) => {
    const o = (i - 1.5) * 0.018;
    addCable(g, [
      [grommet[0], grommet[1], grommet[2] + o],
      [grommet[0] + 0.25, 0.03, grommet[2] + o],
      [-1.15, 0.03, -1.15 + o],
      [-1.55, 0.03, -0.62 + o * 0.5],
      [end[0] + 0.08, 0.08, end[2] - 0.08 + o],
      [end[0] - 0.05, 0.62, end[2] - 0.05],
    ], 0.006, mat);
  });
}

function sideTable(g, x, z) {
  const top = 0.46;
  box(g, 0.42, 0.035, 0.42, wood(), x, top - 0.015, z);
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    cyl(g, 0.018, 0.02, top - 0.04, woodDark(), x + sx * 0.16, (top - 0.04) / 2, z + sz * 0.16, 8);
  }
}

function makeShell(layout) {
  const { width: W, depth: D } = layout.meta.room;
  const g = makeCutawayShell(layout, {
    ceilingW: W * 0.94,
    ceilingD: D * 0.74,
    ceilingZ: -0.4,
    ceilingX: -0.15,
  });
  acousticTreatment(g, layout);
  return g;
}

function makeProcedural(layout) {
  const g = new THREE.Group();
  g.name = 'procedural';
  const tex = makeTextures();
  vocalBooth(g, layout, tex);
  mixingDesk(g, layout, tex);
  screenGlow(g, layout, tex);
  for (const inst of layout.instances) {
    if (inst.id === 'main_l' || inst.id === 'main_r') {
      speakerStand(g, inst.position[0], inst.position[2], inst.position[1]);
    }
  }
  subwoofer(g);
  layout.zones.racks.forEach((r, i) => equipmentRack(g, r, i));
  cableLooms(g, layout);
  sideTable(g, 0.95, 2.15);
  return g;
}

boot({
  makeShell,
  makeProcedural,
  decorate({ props }) {
    retagEmissive(
      props,
      (color) => color.g > 0.28 && color.g > color.r * 1.2 && color.g > color.b * 1.05,
      '#d8ff9a',
      0.4
    );
  },
  readyText: 'ready — recording control room · drag orbit · U unlit · T toon',
});
