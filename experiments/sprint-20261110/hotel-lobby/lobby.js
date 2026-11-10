import * as THREE from 'three';
import { boot, toon, addBox, addCyl, addContact } from './scene_lib.js';

const PAL = {
  stone: '#e3d3bf',
  stoneAlt: '#d9c7b0',
  grout: '#b7a58f',
  border: '#a89078',
  wall: '#f3eee6',
  plaster: '#e7d9c6',
  niche: '#d9c8b2',
  walnut: '#5a3b28',
  walnutDeep: '#3a261c',
  brass: '#b08a45',
  brassLite: '#e0c27a',
  rug: '#6e2c34',
  rugEdge: '#c6a15a',
  rugNook: '#243f38',
  rugNookEdge: '#d7c39a',
  ceil: '#f6f0e6',
  coffer: '#e6d9c4',
  beam: '#cbb99a',
  bronze: '#8d6a3f',
  leaf: '#2d6a46',
  leafDeep: '#1b4332',
  stem: '#3e4a2c',
  terracotta: '#a85b3b',
  leather: '#5c4638',
  luggageA: '#6d442c',
  luggageB: '#243246',
  luggageC: '#cbb99a',
  duffel: '#3e4a38',
  tag: '#f3e2a4',
  stoneCol: '#efe6da',
};

function byId(layout, id) {
  return layout.instances.find((i) => i.id === id);
}

function labelTexture(text, sub, w, h, bg, fg, subFg) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const g = c.getContext('2d');
  g.fillStyle = bg;
  g.fillRect(0, 0, w, h);
  g.strokeStyle = '#b08a45';
  g.lineWidth = Math.max(4, w * 0.012);
  g.strokeRect(18, 18, w - 36, h - 36);
  g.fillStyle = fg;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.font = `600 ${Math.floor(h * 0.34)}px Palatino, Georgia, serif`;
  g.fillText(text, w / 2, sub ? h * 0.42 : h / 2);
  if (sub) {
    g.fillStyle = subFg || '#8a6238';
    g.font = `500 ${Math.floor(h * 0.16)}px Palatino, Georgia, serif`;
    g.fillText(sub, w / 2, h * 0.72);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function artTexture() {
  const c = document.createElement('canvas');
  c.width = 1280;
  c.height = 864;
  const g = c.getContext('2d');
  g.fillStyle = '#1b2836';
  g.fillRect(0, 0, 1280, 864);
  g.fillStyle = '#c9844a';
  g.beginPath();
  g.arc(860, 250, 210, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = '#e6c98a';
  g.beginPath();
  g.arc(900, 230, 120, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = '#d8c4a4';
  g.fillRect(0, 560, 1280, 90);
  g.fillStyle = '#8f3d32';
  g.fillRect(80, 640, 420, 160);
  g.fillStyle = '#2f5c52';
  g.beginPath();
  g.moveTo(160, 640);
  g.quadraticCurveTo(320, 280, 560, 640);
  g.fill();
  g.strokeStyle = '#e7d3a4';
  g.lineWidth = 10;
  g.beginPath();
  g.moveTo(70, 500);
  g.lineTo(1210, 430);
  g.stroke();
  g.fillStyle = '#14343c';
  g.fillRect(980, 470, 180, 280);
  g.fillStyle = '#f2e6d2';
  for (let i = 0; i < 7; i++) g.fillRect(120 + i * 36, 680, 16, 90);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

function sideArtTexture() {
  const c = document.createElement('canvas');
  c.width = 640;
  c.height = 900;
  const g = c.getContext('2d');
  g.fillStyle = '#f3eadc';
  g.fillRect(0, 0, 640, 900);
  g.fillStyle = '#6e2c34';
  g.fillRect(70, 80, 500, 740);
  g.fillStyle = '#e7c98a';
  g.beginPath();
  g.arc(320, 340, 150, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = '#1b2836';
  g.fillRect(180, 520, 280, 18);
  g.fillRect(220, 560, 200, 18);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function framedArt(g, x, y, z, rotY, w, h, tex) {
  const grp = new THREE.Group();
  const frame = toon(PAL.walnutDeep);
  const liner = toon(PAL.brass);
  const canvasMat = toon('#ffffff', {
    map: tex,
    emissive: '#ffffff',
    emissiveMap: tex,
    emissiveIntensity: 0.28,
  });
  addBox(grp, w + 0.14, h + 0.14, 0.06, frame, 0, 0, 0);
  addBox(grp, w + 0.06, h + 0.06, 0.02, liner, 0, 0, 0.03);
  const canvas = new THREE.Mesh(new THREE.PlaneGeometry(w, h), canvasMat);
  canvas.position.z = 0.05;
  canvas.castShadow = false;
  canvas.receiveShadow = false;
  grp.add(canvas);
  grp.position.set(x, y, z);
  grp.rotation.y = rotY;
  g.add(grp);
  return grp;
}

function rug(g, x, z, w, d, fill, edge) {
  const fillMat = toon(fill, { polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 });
  const edgeMat = toon(edge, { polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  addBox(g, w, 0.015, d, fillMat, x, 0.012, z, { noCast: true });
  const t = 0.09;
  addBox(g, w, 0.012, t, edgeMat, x, 0.02, z - d / 2 + t / 2, { noCast: true });
  addBox(g, w, 0.012, t, edgeMat, x, 0.02, z + d / 2 - t / 2, { noCast: true });
  addBox(g, t, 0.012, d - t * 2, edgeMat, x - w / 2 + t / 2, 0.02, z, { noCast: true });
  addBox(g, t, 0.012, d - t * 2, edgeMat, x + w / 2 - t / 2, 0.02, z, { noCast: true });
  const med = new THREE.Mesh(new THREE.CircleGeometry(Math.min(w, d) * 0.14, 22), edgeMat);
  med.rotation.x = -Math.PI / 2;
  med.position.set(x, 0.026, z);
  med.castShadow = false;
  med.receiveShadow = true;
  med.userData.noCast = true;
  g.add(med);
}

function foliage(g, x, y, z, h) {
  const grp = new THREE.Group();
  addCyl(grp, h * 0.02, h * 0.03, h * 0.42, toon(PAL.stem), 0, y + h * 0.2, 0, 6);
  const blobs = [
    [0, 0.55, 0, 0.28, PAL.leaf],
    [0.16, 0.72, 0.05, 0.18, PAL.leafDeep],
    [-0.14, 0.68, -0.06, 0.16, PAL.leaf],
    [0.04, 0.86, -0.02, 0.13, PAL.leafDeep],
    [-0.05, 0.78, 0.12, 0.12, PAL.leaf],
  ];
  for (const [bx, by, bz, r, col] of blobs) {
    const s = new THREE.Mesh(new THREE.SphereGeometry(h * r, 10, 8), toon(col));
    s.position.set(bx * h, y + by * h, bz * h);
    s.castShadow = true;
    s.receiveShadow = true;
    grp.add(s);
  }
  grp.position.set(x, 0, z);
  g.add(grp);
}

function suitcase(parent, x, y, z, rot, w, h, d, color) {
  const grp = new THREE.Group();
  addBox(grp, w, h, d, toon(color), 0, h / 2, 0);
  addBox(grp, w + 0.012, 0.028, d + 0.012, toon(PAL.brassLite), 0, h * 0.62, 0);
  addBox(grp, w * 0.62, 0.012, 0.012, toon('#d9d3cb'), 0, h * 0.62, d / 2 + 0.006);
  addBox(grp, w * 0.34, 0.02, 0.028, toon('#c8c2ba'), 0, h + 0.03, 0);
  addBox(grp, 0.02, 0.07, 0.028, toon('#c8c2ba'), -w * 0.15, h, 0);
  addBox(grp, 0.02, 0.07, 0.028, toon('#c8c2ba'), w * 0.15, h, 0);
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      addCyl(grp, 0.026, 0.026, 0.016, toon('#1a1a1a'), sx * w * 0.36, 0.026, sz * d * 0.32, 8, { rotZ: Math.PI / 2 });
    }
  }
  addBox(grp, 0.07, 0.045, 0.008, toon(PAL.tag), w * 0.22, h * 0.38, d / 2 + 0.01);
  grp.position.set(x, y, z);
  grp.rotation.y = rot;
  parent.add(grp);
}

function duffel(parent, x, z, rot) {
  const grp = new THREE.Group();
  const bag = new THREE.Mesh(new THREE.SphereGeometry(0.2, 16, 12), toon(PAL.duffel));
  bag.scale.set(1.45, 0.68, 0.82);
  bag.position.y = 0.15;
  bag.castShadow = true;
  bag.receiveShadow = true;
  grp.add(bag);
  addBox(grp, 0.42, 0.025, 0.03, toon(PAL.leather), 0, 0.28, 0);
  addBox(grp, 0.03, 0.1, 0.025, toon(PAL.brass), -0.16, 0.22, 0);
  addBox(grp, 0.03, 0.1, 0.025, toon(PAL.brass), 0.16, 0.22, 0);
  grp.position.set(x, 0, z);
  grp.rotation.y = rot;
  parent.add(grp);
}

function luggageCart(g, x, z, rot) {
  const grp = new THREE.Group();
  const brass = toon(PAL.brass);
  const dark = toon('#241c18');
  addBox(grp, 0.84, 0.035, 0.5, brass, 0, 0.28, 0);
  addBox(grp, 0.78, 0.03, 0.44, toon(PAL.rug), 0, 0.31, 0);
  for (const [px, pz] of [[-0.36, -0.2], [0.36, -0.2], [-0.36, 0.2], [0.36, 0.2]]) {
    addCyl(grp, 0.016, 0.016, 0.72, brass, px, 0.58, pz, 8);
  }
  addBox(grp, 0.74, 0.02, 0.02, brass, 0, 0.5, -0.2);
  addBox(grp, 0.74, 0.02, 0.02, brass, 0, 0.5, 0.2);
  addCyl(grp, 0.016, 0.016, 0.9, brass, -0.36, 0.78, -0.32, 8);
  addCyl(grp, 0.016, 0.016, 0.9, brass, 0.36, 0.78, -0.32, 8);
  addCyl(grp, 0.018, 0.018, 0.76, brass, 0, 1.2, -0.32, 8, { rotZ: Math.PI / 2 });
  for (const [px, pz] of [[-0.32, -0.16], [0.32, -0.16], [-0.32, 0.16], [0.32, 0.16]]) {
    addCyl(grp, 0.055, 0.055, 0.03, dark, px, 0.055, pz, 12, { rotZ: Math.PI / 2 });
  }
  suitcase(grp, -0.1, 0.33, 0.02, 0.08, 0.42, 0.58, 0.26, PAL.luggageA);
  suitcase(grp, 0.18, 0.33, -0.02, -0.12, 0.34, 0.46, 0.22, PAL.luggageB);
  suitcase(grp, 0.02, 0.92, 0, 0.2, 0.36, 0.28, 0.2, PAL.luggageC);
  grp.position.set(x, 0, z);
  grp.rotation.y = rot;
  g.add(grp);
}

function bell(g, x, y, z) {
  const base = addCyl(g, 0.07, 0.08, 0.02, toon(PAL.brass), x, y + 0.01, z, 16);
  base.name = 'bell-base';
  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(0.065, 18, 12, 0, Math.PI * 2, 0, Math.PI / 2),
    toon(PAL.brassLite, { emissive: '#8a5a20', emissiveIntensity: 0.18 }),
  );
  dome.position.set(x, y + 0.02, z);
  dome.castShadow = true;
  g.add(dome);
  addCyl(g, 0.012, 0.012, 0.02, toon('#f4efe6'), x, y + 0.09, z, 8);
}

function column(g, x, z, H) {
  addCyl(g, 0.3, 0.34, 0.14, toon(PAL.walnut), x, 0.07, z, 18);
  addCyl(g, 0.2, 0.23, H - 0.55, toon(PAL.stoneCol), x, 0.14 + (H - 0.55) / 2, z, 18);
  addCyl(g, 0.24, 0.2, 0.05, toon(PAL.brass), x, H - 0.34, z, 18);
  addCyl(g, 0.34, 0.28, 0.14, toon(PAL.walnut), x, H - 0.2, z, 18);
  addBox(g, 0.5, 0.08, 0.5, toon(PAL.walnutDeep), x, H - 0.08, z);
}

function clock(g, x, y, z, rotY) {
  const grp = new THREE.Group();
  addCyl(grp, 0.28, 0.28, 0.05, toon(PAL.brass), 0, 0, 0, 24, { rotX: Math.PI / 2 });
  addCyl(grp, 0.22, 0.22, 0.03, toon('#f7f1e6'), 0, 0, 0.03, 24, { rotX: Math.PI / 2 });
  addBox(grp, 0.02, 0.16, 0.01, toon(PAL.walnutDeep), 0, 0.04, 0.05);
  addBox(grp, 0.12, 0.016, 0.01, toon(PAL.walnutDeep), 0.04, 0, 0.05);
  grp.position.set(x, y, z);
  grp.rotation.y = rotY;
  g.add(grp);
}

function makeShell(layout) {
  const g = new THREE.Group();
  g.name = 'shell';
  const { width: W, depth: D, height: H } = layout.meta.room;
  const s = layout.shell;
  const floorMat = toon(s.floorColor);
  const wallMat = toon(s.wallColor);
  const walnut = toon(s.woodColor);
  const deep = toon(s.woodDeep || PAL.walnutDeep);
  const ceilMat = toon(s.ceilingColor);
  const brass = toon(s.brass || PAL.brass);

  const floor = new THREE.Mesh(new THREE.BoxGeometry(W, 0.08, D), floorMat);
  floor.position.y = -0.04;
  floor.receiveShadow = true;
  floor.userData.noCast = true;
  g.add(floor);

  const grout = toon(PAL.grout, { polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 });
  for (let x = -W / 2 + 0.7; x < W / 2 - 0.3; x += 0.9) {
    addBox(g, 0.018, 0.006, D - 0.7, grout, x, 0.004, -0.05, { noCast: true });
  }
  for (let z = -D / 2 + 0.7; z < D / 2 - 0.3; z += 0.9) {
    addBox(g, W - 0.7, 0.006, 0.018, grout, -0.05, 0.004, z, { noCast: true });
  }
  const border = toon(PAL.border, { polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 });
  addBox(g, W - 0.7, 0.008, 0.14, border, -0.1, 0.006, -D / 2 + 0.45, { noCast: true });
  addBox(g, 0.14, 0.008, D - 0.9, border, -W / 2 + 0.45, 0.006, 0.05, { noCast: true });

  const back = new THREE.Mesh(new THREE.BoxGeometry(W, H, 0.14), wallMat);
  back.position.set(0, H / 2, -D / 2);
  back.receiveShadow = true;
  back.castShadow = false;
  g.add(back);
  const left = new THREE.Mesh(new THREE.BoxGeometry(0.14, H, D), wallMat);
  left.position.set(-W / 2, H / 2, 0);
  left.receiveShadow = true;
  left.castShadow = false;
  g.add(left);

  addBox(g, 0.28, H, 0.28, walnut, -W / 2 + 0.08, H / 2, D / 2 - 0.08);
  addBox(g, 0.28, H, 0.28, walnut, W / 2 - 0.08, H / 2, -D / 2 + 0.08);

  const wainH = 1.05;
  addBox(g, W - 0.2, wainH, 0.06, walnut, 0, wainH / 2, -D / 2 + 0.1);
  addBox(g, 0.06, wainH, D - 0.3, walnut, -W / 2 + 0.1, wainH / 2, -0.05);
  addBox(g, W - 0.15, 0.06, 0.08, brass, 0, wainH + 0.02, -D / 2 + 0.12);
  addBox(g, 0.08, 0.06, D - 0.25, brass, -W / 2 + 0.12, wainH + 0.02, -0.05);
  addBox(g, W - 0.2, 0.12, 0.08, deep, 0, 0.06, -D / 2 + 0.1);
  addBox(g, 0.08, 0.12, D - 0.25, deep, -W / 2 + 0.1, 0.06, -0.05);

  const railY = 3.22;
  addBox(g, W - 0.3, 0.05, 0.06, walnut, 0, railY, -D / 2 + 0.12);
  addBox(g, 0.06, 0.05, D - 0.4, walnut, -W / 2 + 0.12, railY, 0);
  addBox(g, W - 0.15, 0.1, 0.12, deep, 0, H - 0.12, -D / 2 + 0.08);
  addBox(g, 0.12, 0.1, D - 0.2, deep, -W / 2 + 0.08, H - 0.12, 0);

  const pilasters = [-6.15, -2.15, 0.35, 3.7, 5.85];
  for (const x of pilasters) {
    addBox(g, 0.16, H - 0.35, 0.1, toon(PAL.plaster), x, (H - 0.35) / 2, -D / 2 + 0.16);
    addBox(g, 0.26, 0.08, 0.14, walnut, x, 1.12, -D / 2 + 0.18);
    addBox(g, 0.24, 0.1, 0.14, walnut, x, H - 0.28, -D / 2 + 0.18);
    addBox(g, 0.28, 0.08, 0.16, deep, x, 0.08, -D / 2 + 0.18);
  }

  const ceilZ0 = -D / 2;
  const ceilZ1 = 3.45;
  const ceilD = ceilZ1 - ceilZ0;
  const ceil = new THREE.Mesh(new THREE.BoxGeometry(W - 0.15, 0.08, ceilD), ceilMat);
  ceil.position.set(-0.05, H - 0.04, (ceilZ0 + ceilZ1) / 2);
  ceil.castShadow = false;
  ceil.receiveShadow = true;
  g.add(ceil);

  const b = layout.build;
  const soffitBottom = H - 0.56;
  addBox(g, b.desk.w + 0.8, 0.48, 2.35, toon(PAL.coffer), b.desk.x, soffitBottom + 0.24, -D / 2 + 1.2);
  addBox(g, b.desk.w + 0.85, 0.04, 0.08, brass, b.desk.x, soffitBottom, -D / 2 + 2.35);
  const cove = toon('#ffd7a4', { emissive: '#ffc27a', emissiveIntensity: 0.9 });
  addBox(g, b.desk.w + 0.5, 0.03, 0.05, cove, b.desk.x, soffitBottom - 0.02, -D / 2 + 2.28, { noCast: true });

  return g;
}

function makeProcedural(layout) {
  const g = new THREE.Group();
  g.name = 'procedural';
  const { width: W, depth: D, height: H } = layout.meta.room;
  const b = layout.build;
  const walnut = toon(PAL.walnut);
  const deep = toon(PAL.walnutDeep);
  const brass = toon(PAL.brass);
  const stone = toon('#f4efe6');
  const stoneEdge = toon('#d9cbb8');

  const hearthTable = byId(layout, 'table_hearth');
  const hearthSofa = byId(layout, 'sofa_hearth');
  rug(
    g,
    b.hearth.x,
    (hearthTable.position[2] + hearthSofa.position[2]) / 2,
    4.2,
    3.05,
    PAL.rug,
    PAL.rugEdge,
  );
  rug(g, b.nook.x, b.nook.z, 2.75, 2.75, PAL.rugNook, PAL.rugNookEdge);
  rug(g, -1.35, 3.55, 1.15, 2.7, '#4a3428', PAL.rugEdge);
  rug(g, 4.35, 4.62, 2.3, 0.85, '#3a2c26', '#b7a48c');
  addBox(g, b.desk.w + 0.4, 0.012, 1.15, toon('#efe4d4', { polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 }), b.desk.x, 0.01, b.desk.z + 0.85, { noCast: true });

  const desk = b.desk;
  addBox(g, desk.w, 0.12, desk.d - 0.06, deep, desk.x, 0.06, desk.z);
  addBox(g, desk.w - 0.08, desk.h - 0.2, desk.d - 0.12, walnut, desk.x, desk.h / 2, desk.z + 0.02);
  addBox(g, desk.w + 0.12, 0.07, desk.d + 0.1, stone, desk.x, desk.h - 0.02, desk.z + 0.02);
  addBox(g, desk.w + 0.14, 0.025, 0.03, brass, desk.x, desk.h - 0.06, desk.z + desk.d / 2 + 0.02);
  const panelW = 0.72;
  const panels = 4;
  const span = desk.w - 0.5;
  for (let i = 0; i < panels; i++) {
    const px = desk.x - span / 2 + (i + 0.5) * (span / panels);
    addBox(g, panelW * 0.78, 0.62, 0.03, toon(PAL.plaster), px, 0.58, desk.z + desk.d / 2 - 0.02);
    addBox(g, panelW * 0.78 + 0.05, 0.04, 0.025, brass, px, 0.28, desk.z + desk.d / 2);
    addBox(g, panelW * 0.78 + 0.05, 0.04, 0.025, brass, px, 0.9, desk.z + desk.d / 2);
  }
  addBox(g, 0.9, 0.08, 0.08, deep, desk.x - desk.w / 2 + 0.15, 0.04, desk.z + 0.55);
  addBox(g, 0.72, 0.72, 0.62, walnut, desk.x - desk.w / 2 + 0.15, 0.4, desk.z + 0.72);
  addBox(g, 0.86, 0.05, 0.74, stoneEdge, desk.x - desk.w / 2 + 0.15, 0.78, desk.z + 0.72);

  const sign = labelTexture('THE MARLOWE', 'RECEPTION', 1024, 320, '#3a261c', '#f3eadc', '#e0c27a');
  const signMesh = new THREE.Mesh(new THREE.PlaneGeometry(2.15, 0.62), toon('#ffffff', { map: sign, emissive: '#ffffff', emissiveMap: sign, emissiveIntensity: 0.22 }));
  signMesh.position.set(desk.x, 2.68, -D / 2 + 0.16);
  g.add(signMesh);

  const cols = 8;
  const rows = 3;
  const cubW = 0.28;
  const cubH = 0.22;
  const gridW = cols * cubW;
  const gridX0 = desk.x - gridW / 2 + cubW / 2;
  const gridY0 = 1.78;
  addBox(g, gridW + 0.16, rows * cubH + 0.16, 0.08, deep, desk.x, gridY0 + cubH, -D / 2 + 0.16);
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const cx = gridX0 + c * cubW;
      const cy = gridY0 + r * cubH;
      addBox(g, cubW - 0.05, cubH - 0.05, 0.04, toon(r === 1 && c % 3 === 0 ? '#c45a3a' : '#efe6da'), cx, cy, -D / 2 + 0.2);
      addCyl(g, 0.012, 0.012, 0.02, brass, cx, cy, -D / 2 + 0.23, 8);
    }
  }

  bell(g, -3.72, desk.h, desk.z + 0.22);
  addBox(g, 0.22, 0.015, 0.1, toon('#f7f1e6'), -3.25, desk.h + 0.01, desk.z + 0.18);
  addBox(g, 0.16, 0.012, 0.08, toon('#f7f1e6'), -3.22, desk.h + 0.02, desk.z + 0.2);

  const artX = b.art.x;
  const artZ = -D / 2 + 0.2;
  addBox(g, 2.7, 2.55, 0.08, toon(PAL.niche), artX, 1.85, artZ);
  const arch = new THREE.Mesh(new THREE.TorusGeometry(1.18, 0.055, 8, 32, Math.PI), brass);
  arch.position.set(artX, 1.62, artZ + 0.06);
  arch.castShadow = true;
  g.add(arch);
  addBox(g, 0.14, 1.62, 0.12, walnut, artX - 1.2, 0.81, artZ + 0.04);
  addBox(g, 0.14, 1.62, 0.12, walnut, artX + 1.2, 0.81, artZ + 0.04);
  addBox(g, 2.7, 0.1, 0.14, walnut, artX, 0.12, artZ + 0.05);
  framedArt(g, artX, 1.95, artZ + 0.08, 0, 1.9, 1.22, artTexture());
  addBox(g, 0.7, 0.045, 0.08, brass, artX, 3.05, artZ + 0.1);
  addBox(g, 0.55, 0.02, 0.04, toon('#fff1d0', { emissive: '#ffd7a0', emissiveIntensity: 1.1 }), artX, 2.98, artZ + 0.14, { noCast: true });
  addBox(g, 0.36, 0.08, 0.02, brass, artX, 1.22, artZ + 0.12);

  framedArt(g, -W / 2 + 0.16, 2.05, -2.55, Math.PI / 2, 0.62, 0.9, sideArtTexture());

  clock(g, -W / 2 + 0.18, 2.75, b.elevator.z, Math.PI / 2);

  const ex = -W / 2 + 0.12;
  const ez = b.elevator.z;
  addBox(g, 0.08, 2.5, 1.85, deep, ex, 1.3, ez);
  addBox(g, 0.05, 2.2, 0.78, toon(PAL.bronze), ex + 0.05, 1.18, ez - 0.4);
  addBox(g, 0.05, 2.2, 0.78, toon('#a07c4c'), ex + 0.05, 1.18, ez + 0.4);
  addBox(g, 0.04, 2.2, 0.02, brass, ex + 0.08, 1.18, ez);
  addBox(g, 0.1, 2.55, 0.08, walnut, ex + 0.04, 1.28, ez - 0.92);
  addBox(g, 0.1, 2.55, 0.08, walnut, ex + 0.04, 1.28, ez + 0.92);
  addBox(g, 0.1, 0.1, 1.9, walnut, ex + 0.04, 2.45, ez);
  addBox(g, 0.03, 0.18, 0.32, toon('#1c1c1c'), ex + 0.1, 2.15, ez);
  addBox(g, 0.01, 0.045, 0.045, toon('#ffe1a8', { emissive: '#ffd27a', emissiveIntensity: 1.3 }), ex + 0.12, 2.18, ez, { noCast: true });

  column(g, b.column.x, b.column.z, H);

  const cofferX = b.hearth.x;
  const cofferZ = (byId(layout, 'table_hearth').position[2] + byId(layout, 'sofa_hearth').position[2]) / 2;
  const cofferW = 3.6;
  const cofferD = 2.5;
  const beamY = H - 0.13;
  const beam = toon(PAL.beam);
  addBox(g, cofferW, 0.1, 0.08, beam, cofferX, beamY, cofferZ - cofferD / 2);
  addBox(g, cofferW, 0.1, 0.08, beam, cofferX, beamY, cofferZ + cofferD / 2);
  addBox(g, 0.08, 0.1, cofferD, beam, cofferX - cofferW / 2, beamY, cofferZ);
  addBox(g, 0.08, 0.1, cofferD, beam, cofferX + cofferW / 2, beamY, cofferZ);
  addBox(g, cofferW, 0.08, 0.06, beam, cofferX, beamY, cofferZ);
  addBox(g, 0.06, 0.08, cofferD, beam, cofferX, beamY, cofferZ);
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    addBox(g, cofferW / 2 - 0.08, 0.025, cofferD / 2 - 0.08, toon(PAL.coffer), cofferX + sx * cofferW / 4, H - 0.095, cofferZ + sz * cofferD / 4, { noCast: true });
  }

  for (const id of ['pend_hearth_a', 'pend_hearth_b', 'pend_nook']) {
    const p = byId(layout, id);
    const top = p.position[1] + 0.5;
    const ceilY = H - 0.08;
    const drop = ceilY - top;
    addCyl(g, 0.012, 0.012, drop, toon('#2a211c'), p.position[0], top + drop / 2, p.position[2], 6);
    addCyl(g, 0.09, 0.09, 0.035, brass, p.position[0], ceilY, p.position[2], 12);
  }

  for (const pot of layout.instances.filter((i) => i.kind === 'flowerpot')) {
    const h = pot.id === 'pot_art' ? 1.15 : pot.id === 'pot_desk' ? 0.28 : pot.id === 'pot_column' ? 0.95 : 0.7;
    const y = pot.position[1] + (pot.id === 'pot_desk' ? 0.22 : 0.28);
    foliage(g, pot.position[0], y, pot.position[2], h);
  }

  luggageCart(g, b.cart.x, b.cart.z, b.cart.rot);
  suitcase(g, -5.45, 0, -2.42, 0.4, 0.36, 0.58, 0.22, PAL.luggageA);
  suitcase(g, -4.7, 0, -2.55, -0.55, 0.46, 0.3, 0.28, PAL.luggageC);
  duffel(g, -5.05, -2.05, 1.1);
  suitcase(g, b.cart.x - 0.95, 0, b.cart.z - 0.15, 0.7, 0.34, 0.52, 0.22, PAL.luggageB);

  const sc = b.sculpture;
  addCyl(g, 0.05, 0.07, 0.28, toon('#8a6a45'), sc.x, 1.16, sc.z, 10);
  addBox(g, 0.22, 0.16, 0.16, toon('#a87848'), sc.x, 1.36, sc.z);
  addCyl(g, 0.1, 0.04, 0.22, toon('#c4a15a'), sc.x + 0.02, 1.52, sc.z, 12);
  const sphere = new THREE.Mesh(new THREE.SphereGeometry(0.09, 14, 12), toon('#8d5a32', { emissive: '#5a3218', emissiveIntensity: 0.12 }));
  sphere.position.set(sc.x - 0.04, 1.66, sc.z + 0.02);
  sphere.castShadow = true;
  g.add(sphere);

  const at = (id) => {
    const p = byId(layout, id).position;
    return [p[0], p[2]];
  };
  const contacts = [
    [...at('sofa_hearth'), 1.05, 0.48, 0.32],
    [...at('chair_hearth_w'), 0.28, 0.28, 0.22],
    [...at('chair_hearth_e'), 0.28, 0.28, 0.22],
    [...at('table_hearth'), 1.05, 0.55, 0.2],
    [...at('table_nook'), 0.55, 0.55, 0.18],
    [...at('chair_nook_s'), 0.28, 0.28, 0.2],
    [...at('chair_nook_n'), 0.28, 0.28, 0.2],
    [...at('chair_nook_w'), 0.28, 0.28, 0.2],
    [b.bench.x, b.bench.z, 0.32, 0.85, 0.22],
    [b.column.x, b.column.z, 0.36, 0.36, 0.26],
    [b.sculpture.x, b.sculpture.z, 0.4, 0.4, 0.24],
    [b.cart.x, b.cart.z, 0.5, 0.38, 0.24],
    [desk.x, desk.z, desk.w * 0.48, desk.d * 0.45, 0.2],
    [...at('table_side'), 0.38, 0.38, 0.16],
  ];
  for (const [x, z, rx, rz, op] of contacts) addContact(g, x, z, rx, rz, op);

  addBox(g, 0.34, 0.02, 0.22, toon('#f4efe6'), b.hearth.x - 0.15, 0.43, b.hearth.z + 0.05, { noCast: true });
  addBox(g, 0.22, 0.012, 0.16, toon('#6e2c34'), b.hearth.x - 0.12, 0.445, b.hearth.z + 0.02, { noCast: true });
  addBox(g, 0.18, 0.01, 0.12, toon('#243f38'), b.hearth.x + 0.12, 0.44, b.hearth.z - 0.08, { noCast: true });
  addBox(g, 0.16, 0.008, 0.11, toon('#1b2836'), b.hearth.x + 0.16, 0.45, b.hearth.z - 0.05, { noCast: true });

  return g;
}

function tuneAsset(kind, root) {
  root.traverse((obj) => {
    if (!obj.isMesh || !obj.material) return;
    const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
    const name = (obj.name || '').toLowerCase();
    for (const m of mats) {
      if (!m || !m.color) continue;
      if (kind === 'pendant_lamp' && name.includes('bulb')) {
        m.color.set('#fff6df');
        m.emissive.set('#ffb15a');
        m.emissiveIntensity = 0.95;
      } else if (kind === 'pendant_lamp' && name.includes('shade')) {
        m.emissive.set('#6a3408');
        m.emissiveIntensity = 0.22;
      } else if (kind === 'library_lamp' && (name.includes('light') || name.includes('tube'))) {
        m.color.set('#fff6dd');
        m.emissive.set('#ffc56a');
        m.emissiveIntensity = 1.2;
      } else if (kind === 'library_lamp' && name.includes('roof')) {
        m.emissive.set('#1d4a28');
        m.emissiveIntensity = 0.35;
      } else if (kind === 'sofa_solid' && m.name && String(m.name).includes('fabric')) {
        m.color.set(PAL.leather);
      } else if (kind === 'flowerpot') {
        m.color.set(PAL.terracotta);
      }
    }
  });
}

boot({
  makeShell,
  makeProcedural,
  tuneAsset,
  readyText: 'ready — The Marlowe lobby · drag orbit · U unlit · T toon',
});
