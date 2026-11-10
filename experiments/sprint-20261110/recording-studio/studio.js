import * as THREE from 'three';
import { boot, toon, addCable, makeCutawayShell } from './scene_lib.js';

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

function quadraticDiffuser(g, x, y, z, cols, rows, cell, axis) {
  const mat = wood();
  const depths = [1, 3, 5, 2, 4, 1, 3, 2, 5, 4, 1, 2];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const depth = 0.025 + depths[(r * 3 + c * 2) % depths.length] * 0.016;
      const py = y + (r - (rows - 1) / 2) * cell;
      if (axis === 'x') {
        const pz = z + (c - (cols - 1) / 2) * cell;
        box(g, depth, cell * 0.78, cell * 0.78, mat, x + depth / 2, py, pz);
      } else {
        const px = x + (c - (cols - 1) / 2) * cell;
        box(g, cell * 0.78, cell * 0.78, depth, mat, px, py, z + depth / 2);
      }
    }
  }
}

function acousticTreatment(g, layout) {
  const { width: W, depth: D, height: H } = layout.meta.room;
  const b = layout.zones.booth;
  const backZ = -D / 2 + 0.16;
  const leftX = -W / 2 + 0.16;
  const cx = (b.x0 + b.x1) / 2;

  quadraticDiffuser(g, -3.35, 1.45, backZ, 5, 6, 0.16, 'z');
  quadraticDiffuser(g, cx, 2.62, backZ, 8, 3, 0.14, 'z');
  framedPanel(g, 0.7, 1.15, 2.85, 1.85, backZ, '#5c3844', 'z');
  slatDiffusor(g, b.x1 + 0.85, 2.55, 0.55, 1.55, backZ);
  box(g, 0.38, 2.2, 0.38, foamDeep(), -W / 2 + 0.48, 1.1, -D / 2 + 0.48);

  framedPanel(g, 0.85, 1.15, leftX, 1.7, -1.55, '#4e3542', 'x');
  quadraticDiffuser(g, leftX, 1.35, 1.55, 4, 5, 0.15, 'x');
  wedgeField(g, leftX - 0.02, 2.15, 3.15, 0.4, 1.9, 'z');

  const wash = box(g, 5.4, 0.05, 0.06, toon('#e8b48a', { emissive: '#ffb060', emissiveIntensity: 0.65 }), cx, 2.78, backZ + 0.02);
  noShadow(wash);
  const sideWash = box(g, 0.05, 0.05, 2.4, toon('#e8b48a', { emissive: '#ffb060', emissiveIntensity: 0.5 }), leftX + 0.02, 2.55, 0.2);
  noShadow(sideWash);

  box(g, W - 0.5, 0.08, 0.04, woodDark(), 0.3, 0.05, -D / 2 + 0.1);
  box(g, 0.04, 0.08, D - 0.5, woodDark(), -W / 2 + 0.1, 0.05, 0.2);

  const dk = layout.zones.desk;
  box(g, dk.w + 0.7, 0.015, 2.35, toon('#5a4636'), dk.x, 0.008, 0.25);
  box(g, dk.w + 0.85, 0.012, 0.045, woodDark(), dk.x, 0.014, 0.25 + 1.15);
  box(g, dk.w + 0.85, 0.012, 0.045, woodDark(), dk.x, 0.014, 0.25 - 1.15);

  ceilingCloud(g, 2.1, 1.15, dk.x, H - 0.48, 0.35, 0);
  ceilingCloud(g, 1.2, 0.7, dk.x - 0.15, H - 0.36, -0.85, 0.08);

  const lounge = layout.zones.lounge;
  box(g, 1.9, 0.012, 1.15, toon('#3a2c32'), lounge.x, 0.008, lounge.z + 0.15, lounge.rotY);
}

function vocalBooth(g, layout, tex) {
  const b = layout.zones.booth;
  const { x0, x1, z0, z1, glassTop, lid, doorW, doorH } = b;
  const frame = black();
  const glassMat = toon('#c5dde8', {
    transparent: true,
    opacity: 0.16,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const w = x1 - x0;
  const d = z1 - z0;
  const cx = (x0 + x1) / 2;
  const cz = (z0 + z1) / 2;

  box(g, w - 0.1, 0.02, d - 0.1, toon('#2a2428'), cx, 0.012, cz);
  box(g, w + 0.06, 0.08, d + 0.06, toon('#1a1e24'), cx, lid, cz);
  box(g, 0.08, glassTop, d, frame, x0, glassTop / 2, cz);
  box(g, w, glassTop, 0.08, frame, cx, glassTop / 2, z0);
  const hingeZ = z1 - 0.06;
  const open0 = hingeZ - doorW;
  const rearLen = Math.max(0.2, open0 - z0);
  box(g, 0.08, glassTop, rearLen, frame, x1, glassTop / 2, z0 + rearLen / 2);
  const headerH = Math.max(0.08, glassTop - doorH);
  box(g, 0.08, headerH, doorW, frame, x1, doorH + headerH / 2, open0 + doorW / 2);
  box(g, 0.08, glassTop, 0.1, frame, x1, glassTop / 2, hingeZ + 0.02);

  const pad = toon('#241e22');
  const pad2 = toon('#34282e');
  box(g, 0.9, 1.4, 0.08, pad, cx - 0.55, 1.2, z0 + 0.12);
  box(g, 0.9, 1.4, 0.08, pad2, cx + 0.55, 1.2, z0 + 0.14);
  box(g, 0.08, 1.35, 0.7, pad, x0 + 0.12, 1.15, cz);
  box(g, 0.08, 1.2, 0.55, pad2, x1 - 0.12, 1.2, cz - 0.35);

  const viewH = glassTop - 0.18;
  const viewY = viewH / 2 + 0.12;
  const gap = 0.06;
  const paneW = (w - 0.24 - gap) / 2;
  const leftPane = box(g, paneW, viewH, 0.02, glassMat, cx - gap / 2 - paneW / 2, viewY, z1);
  const rightPane = box(g, paneW, viewH, 0.02, glassMat, cx + gap / 2 + paneW / 2, viewY, z1);
  noShadow(leftPane);
  noShadow(rightPane);
  leftPane.renderOrder = 2;
  rightPane.renderOrder = 2;
  box(g, 0.05, viewH, 0.06, frame, cx, viewY, z1);
  box(g, 0.05, viewH, 0.06, frame, x0 + 0.04, viewY, z1);
  box(g, 0.05, viewH, 0.06, frame, x1 - 0.04, viewY, z1);
  box(g, w, 0.06, 0.07, frame, cx, glassTop - 0.03, z1);
  box(g, w, 0.08, 0.08, frame, cx, 0.05, z1);

  const door = new THREE.Group();
  door.position.set(x1, 0, hingeZ);
  door.rotation.y = -0.72;
  const pane = box(door, 0.02, doorH - 0.12, doorW - 0.1, glassMat, 0.03, doorH / 2, -doorW / 2);
  noShadow(pane);
  pane.renderOrder = 2;
  box(door, 0.05, doorH, 0.05, frame, 0.02, doorH / 2, -0.03);
  box(door, 0.05, doorH, 0.05, frame, 0.02, doorH / 2, -doorW + 0.03);
  box(door, 0.05, 0.05, doorW, frame, 0.02, doorH - 0.03, -doorW / 2);
  box(door, 0.05, 0.06, doorW, frame, 0.02, 0.03, -doorW / 2);
  box(door, 0.04, 0.03, 0.1, toon('#c6a56a'), 0.05, 1.02, -doorW + 0.16);
  g.add(door);

  const sign = new THREE.Mesh(new THREE.PlaneGeometry(0.52, 0.15), tex.sign);
  sign.position.set(cx, 2.12, z1 + 0.06);
  noShadow(sign);
  g.add(sign);
  const lens = new THREE.Mesh(new THREE.SphereGeometry(0.045, 12, 10), toon('#ff3a3a', { emissive: '#ff2020', emissiveIntensity: 0.85 }));
  lens.position.set(cx + 0.4, 2.14, z1 + 0.07);
  noShadow(lens);
  g.add(lens);

  cyl(g, 0.1, 0.12, 0.07, metalDark(), cx, lid - 0.1, cz, 12);
  noShadow(cyl(g, 0.07, 0.07, 0.012, toon('#d5e7ff', { emissive: '#c5dcff', emissiveIntensity: 0.75 }), cx, lid - 0.14, cz, 12));

  const grommet = [x1 + 0.04, 0.34, z0 + 0.42];
  box(g, 0.04, 0.14, 0.22, metal(), grommet[0], grommet[1], grommet[2]);
  vocalMic(g, cx, z1 - 0.62, grommet);
  musicStand(g, cx + 0.42, z0 + 0.7, tex);
}

function vocalMic(g, x, z, grommet) {
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
  const end = grommet || [x + 0.8, 0.34, z];
  addCable(g, [
    [x, 0.04, z],
    [x + 0.25, 0.03, z + 0.05],
    [end[0] - 0.2, 0.03, end[2]],
    end,
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
  const { top } = dsk;
  const oak = toon('#6b4a32');
  const oakD = woodDark();
  const deck = toon('#1c2026');
  const cheek = toon('#4a3428');
  const led = toon('#ffc48a', { emissive: '#ffb060', emissiveIntensity: 0.7 });
  const centerW = 1.2;
  const centerD = 1.05;

  for (const sx of [-1, 1]) {
    box(grp, 0.07, top - 0.08, centerD - 0.08, cheek, sx * (centerW / 2 - 0.02), (top - 0.08) / 2, -0.02);
    box(grp, 0.05, top - 0.06, 0.05, metal(), sx * (centerW / 2 - 0.12), (top - 0.06) / 2, centerD / 2 - 0.12);
    box(grp, 0.05, top - 0.06, 0.05, metal(), sx * (centerW / 2 - 0.12), (top - 0.06) / 2, -centerD / 2 + 0.16);
  }
  box(grp, centerW - 0.08, 0.05, centerD, deck, 0, top - 0.025, -0.02);
  box(grp, centerW - 0.2, 0.02, 0.62, toon('#14181c'), 0, top + 0.008, 0.02);
  box(grp, centerW - 0.28, 0.04, 0.1, toon('#121416'), 0, top + 0.015, centerD / 2 - 0.12);

  const bridgeZ = -0.5;
  const bridgeTop = top + 0.2;
  box(grp, 1.82, 0.16, 0.3, oakD, 0, top + 0.08, bridgeZ);
  box(grp, 1.74, 0.045, 0.36, deck, 0, bridgeTop - 0.02, bridgeZ);
  const strip = box(grp, centerW - 0.16, 0.025, 0.03, led, 0, bridgeTop - 0.08, bridgeZ + 0.12);
  noShadow(strip);
  const frontStrip = box(grp, centerW - 0.3, 0.02, 0.025, led, 0, top + 0.03, centerD / 2 - 0.05);
  noShadow(frontStrip);

  for (let i = 0; i < 12; i++) {
    const x = -0.5 + i * 0.09;
    box(grp, 0.07, 0.04, 0.01, black(), x, bridgeTop + 0.01, bridgeZ + 0.08);
    const face = box(grp, 0.05, 0.026, 0.008, toon('#e0b15a', { emissive: '#e0b15a', emissiveIntensity: 0.4 }), x, bridgeTop + 0.01, bridgeZ + 0.09);
    noShadow(face);
  }

  const caps = [0.42, 0.7, 0.35, 0.88, 0.55, 0.62, 0.28, 0.76, 0.5, 0.84, 0.4, 0.66];
  function fader(x, z, t, hot) {
    box(grp, 0.012, 0.012, 0.1, metalDark(), x, top + 0.02, z);
    const capMat = hot === 'red' ? toon('#8d3034') : hot === 'amber' ? toon('#c4a15a') : black();
    box(grp, 0.03, 0.02, 0.02, capMat, x, top + 0.03 + t * 0.04, z - 0.03 + t * 0.06);
  }
  for (let i = 0; i < 8; i++) fader(-0.42 + i * 0.055, 0.08, caps[i], i === 4 ? 'red' : null);
  fader(0.12, 0.08, 0.72, 'red');
  fader(0.2, 0.08, 0.48, null);
  fader(0.28, 0.08, 0.6, 'amber');
  for (let i = 0; i < 8; i++) {
    cyl(grp, 0.016, 0.018, 0.014, i % 5 === 1 ? toon('#c6a56a') : metalDark(), -0.4 + i * 0.07, top + 0.03, -0.12, 8);
  }

  for (const side of [-1, 1]) {
    const wing = new THREE.Group();
    wing.position.set(side * 0.64, 0, 0.16);
    wing.rotation.y = side * 0.48;
    const ww = 0.96;
    const wd = 0.72;
    const ox = side * 0.44;
    box(wing, 0.06, top - 0.08, wd - 0.08, cheek, ox + side * (ww / 2 - 0.05), (top - 0.08) / 2, 0.06);
    box(wing, ww, 0.05, wd, deck, ox, top - 0.02, 0.08);
    box(wing, ww - 0.14, 0.016, wd * 0.62, toon('#14181c'), ox, top + 0.012, 0.02);
    box(wing, 0.045, top - 0.08, 0.045, metal(), ox - side * 0.28, (top - 0.08) / 2, -0.16);
    box(wing, 0.045, top - 0.08, 0.045, metal(), ox + side * 0.32, (top - 0.08) / 2, 0.28);
    for (let k = 0; k < 5; k++) {
      cyl(wing, 0.016, 0.018, 0.012, metalDark(), ox + side * (-0.28 + k * 0.14), top + 0.028, -0.02, 8);
    }
    const wingLed = box(wing, ww - 0.18, 0.016, 0.02, led, ox, top + 0.02, 0.36);
    wing.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    noShadow(wingLed);
    grp.add(wing);
  }
  const lamp = new THREE.Group();
  cyl(lamp, 0.012, 0.012, 0.22, metalDark(), -0.5, top + 0.12, 0.28, 8);
  box(lamp, 0.16, 0.02, 0.05, black(), -0.42, top + 0.24, 0.28);
  const lampHead = box(lamp, 0.12, 0.012, 0.035, led, -0.42, top + 0.22, 0.28);
  lamp.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  noShadow(lampHead);
  grp.add(lamp);

  const sheet = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 0.26), tex.page);
  sheet.rotation.x = -Math.PI / 2;
  sheet.position.set(-0.28, top + 0.03, 0.32);
  noShadow(sheet);
  grp.add(sheet);
  headphones(grp, -1.02, top + 0.04, 0.38, -0.6, false);

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

function monitorSoffit(g, x, z, topY) {
  const body = toon('#16181c');
  box(g, 1.15, 0.1, 0.52, woodDark(), x, topY - 0.05, z);
  box(g, 0.1, topY - 0.12, 0.42, body, x - 0.48, (topY - 0.12) / 2, z);
  box(g, 0.1, topY - 0.12, 0.42, body, x + 0.48, (topY - 0.12) / 2, z);
  box(g, 1.02, 0.1, 0.05, body, x, topY + 0.07, z - 0.24);
}

function subwoofer(g) {
  box(g, 0.48, 0.4, 0.42, black(), -3.25, 0.2, -1.55);
  box(g, 0.3, 0.3, 0.02, toon('#2a2e32'), -3.25, 0.22, -1.33);
  cyl(g, 0.09, 0.09, 0.02, metalDark(), -3.25, 0.22, -1.32, 12);
}

function wallGuitar(g, x, y, z, tilt) {
  const grp = new THREE.Group();
  const body = toon('#b26a32');
  const dark = toon('#2a2018');
  const lower = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.17, 0.045, 14), body);
  lower.rotation.z = Math.PI / 2;
  grp.add(lower);
  const upper = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.11, 0.04, 12), body);
  upper.rotation.z = Math.PI / 2;
  upper.position.y = 0.2;
  grp.add(upper);
  const neck = new THREE.Mesh(new THREE.BoxGeometry(0.028, 0.48, 0.032), dark);
  neck.position.y = 0.5;
  grp.add(neck);
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.12, 0.028), body);
  head.position.y = 0.8;
  grp.add(head);
  grp.position.set(x, y, z);
  grp.rotation.z = tilt;
  grp.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  g.add(grp);
}

function guitarRack(g) {
  const x = -4.58;
  box(g, 0.06, 0.08, 1.7, wood(), x, 1.62, 0.15);
  box(g, 0.04, 0.55, 0.04, woodDark(), x, 1.3, -0.55);
  box(g, 0.04, 0.55, 0.04, woodDark(), x, 1.3, 0.85);
  wallGuitar(g, x + 0.06, 1.05, -0.35, 0.08);
  wallGuitar(g, x + 0.06, 1.02, 0.35, -0.12);
  wallGuitar(g, x + 0.06, 1.08, 0.95, 0.05);
}

function keyboardStand(g, x, z, rotY) {
  const grp = new THREE.Group();
  const stand = metalDark();
  const keys = toon('#f3efe6');
  box(grp, 0.04, 0.78, 0.04, stand, -0.28, 0.42, -0.12);
  box(grp, 0.04, 0.78, 0.04, stand, 0.28, 0.42, 0.12);
  box(grp, 0.7, 0.03, 0.03, stand, 0, 0.8, 0);
  box(grp, 1.08, 0.07, 0.32, black(), 0, 0.9, 0);
  box(grp, 0.98, 0.02, 0.12, keys, 0, 0.945, 0.06);
  for (let i = 0; i < 12; i++) {
    if (i % 7 === 2 || i % 7 === 5) continue;
    box(grp, 0.018, 0.012, 0.07, black(), -0.42 + i * 0.07, 0.96, 0.02);
  }
  grp.position.set(x, 0, z);
  grp.rotation.y = rotY;
  grp.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  g.add(grp);
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
  const end = [desk.x + 0.85, 0.5, desk.z - 0.2];
  const jacket = black();
  const red = toon('#6e3438');
  const blue = toon('#2a3a52');
  for (let i = 0; i < layout.zones.racks.length; i++) {
    const r = layout.zones.racks[i];
    const start = [r.x - 0.28, 0.14, r.z];
    addCable(g, [
      start,
      [start[0] - 0.15, 0.035, start[2]],
      [2.4, 0.03, -0.15 + i * 0.08],
      [1.5, 0.03, -0.35],
      [end[0] + 0.45, 0.035, end[2] + i * 0.04],
      end,
    ], 0.011, i === 0 ? jacket : blue);
  }
  const grommet = [b.x1 + 0.04, 0.34, b.z0 + 0.42];
  const colors = [jacket, red, blue, jacket];
  colors.forEach((mat, i) => {
    const o = (i - 1.5) * 0.018;
    addCable(g, [
      [grommet[0], grommet[1], grommet[2] + o],
      [grommet[0] + 0.28, 0.03, grommet[2] + o],
      [1.7, 0.03, -1.05 + o],
      [1.35, 0.03, -0.55 + o],
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
      monitorSoffit(g, inst.position[0], inst.position[2], inst.position[1]);
    }
  }
  subwoofer(g);
  guitarRack(g);
  keyboardStand(g, -2.35, 1.35, -1.69);
  layout.zones.racks.forEach((r, i) => equipmentRack(g, r, i));
  cableLooms(g, layout);
  sideTable(g, 4.42, -2.28);
  return g;
}

boot({
  makeShell,
  makeProcedural,
  readyText: 'ready — recording control room · drag orbit · U unlit · T toon',
});
