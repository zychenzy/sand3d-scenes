import * as THREE from 'three';
import {
  boot, toon, addBox, addCyl, addSphere, addTorus, addContact, canvasTexture,
} from './scene_lib.js';

const BOLTS = [
  ['#1c2a44', '#2a3d62'],
  ['#2c3136', '#454c54'],
  ['#c4a36a', '#e0c48e'],
  ['#f3efe4', '#e2d9c6'],
  ['#6e2432', '#8d3a4a'],
  ['#1d3b32', '#2f5a4a'],
  ['#8e8a83', '#c2beb4'],
  ['#3d342b', '#5a4c3c'],
  ['#d9c4a4', '#f0e2cc'],
  ['#141c2a', '#24344c'],
  ['#a3543c', '#c47258'],
  ['#efe6d6', '#d8ccb6'],
  ['#4a3c58', '#6a5a7c'],
  ['#1a1a1a', '#333333'],
];

function byId(layout, id) {
  return layout.stations.find((s) => s.id === id);
}

function pivot(parent, st) {
  const g = new THREE.Group();
  g.name = st.id;
  g.position.set(st.position[0], st.position[1] || 0, st.position[2]);
  g.rotation.y = st.rotationY || 0;
  parent.add(g);
  return g;
}

const texCache = new Map();

function paint(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d'), w, h);
  return c;
}

function weave(a, b) {
  const key = `w:${a}:${b}`;
  if (texCache.has(key)) return texCache.get(key);
  const canvas = paint(64, 64, (g) => {
    for (let y = 0; y < 64; y += 2) {
      for (let x = 0; x < 64; x += 2) {
        const twill = ((x + 2 * y) / 2) % 4 === 0;
        g.fillStyle = twill ? a : b;
        g.fillRect(x, y, 2, 2);
      }
    }
  });
  const tex = canvasTexture(canvas, { wrap: true, repeat: [4, 3] });
  texCache.set(key, tex);
  return tex;
}

function planks() {
  if (texCache.has('floor')) return texCache.get('floor');
  const canvas = paint(64, 128, (g) => {
    const tones = ['#c7a56e', '#b99560', '#d0b07a', '#c09a64'];
    for (let x = 0; x < 64; x += 8) {
      g.fillStyle = tones[(x / 8) % tones.length];
      g.fillRect(x, 0, 8, 128);
      g.fillStyle = 'rgba(90,50,20,0.15)';
      g.fillRect(x + 7, 0, 1, 128);
    }
  });
  const tex = canvasTexture(canvas, { wrap: true, repeat: [7, 3], nearest: true });
  texCache.set('floor', tex);
  return tex;
}

function plaster() {
  if (texCache.has('plaster')) return texCache.get('plaster');
  const canvas = paint(128, 128, (g) => {
    g.fillStyle = '#f4ecdf';
    g.fillRect(0, 0, 128, 128);
    for (let i = 0; i < 180; i++) {
      const v = 220 + ((i * 37) % 28);
      g.fillStyle = `rgba(${v},${v - 8},${v - 18},0.35)`;
      g.fillRect((i * 53) % 128, (i * 29) % 128, 3, 2);
    }
  });
  const tex = canvasTexture(canvas, { wrap: true, repeat: [3, 2] });
  texCache.set('plaster', tex);
  return tex;
}

function woodGrain(hex) {
  const key = `wood:${hex}`;
  if (texCache.has(key)) return texCache.get(key);
  const canvas = paint(128, 32, (g) => {
    g.fillStyle = hex;
    g.fillRect(0, 0, 128, 32);
    g.strokeStyle = 'rgba(60,30,10,0.28)';
    for (let y = 2; y < 32; y += 4) {
      g.beginPath();
      g.moveTo(0, y);
      g.bezierCurveTo(30, y + 2, 70, y - 3, 128, y + 1);
      g.stroke();
    }
  });
  const tex = canvasTexture(canvas, { wrap: true, repeat: [2, 1] });
  texCache.set(key, tex);
  return tex;
}

function patternPaper() {
  if (texCache.has('pattern')) return texCache.get('pattern');
  const canvas = paint(512, 512, (g) => {
    g.fillStyle = '#f7f1df';
    g.fillRect(0, 0, 512, 512);
    g.strokeStyle = 'rgba(70,110,160,0.35)';
    g.lineWidth = 1;
    for (let i = 16; i < 512; i += 16) {
      g.beginPath();
      g.moveTo(i, 0); g.lineTo(i, 512); g.stroke();
      g.beginPath();
      g.moveTo(0, i); g.lineTo(512, i); g.stroke();
    }
    g.strokeStyle = '#2a4f86';
    g.lineWidth = 3;
    g.beginPath();
    g.moveTo(150, 70);
    g.lineTo(250, 70);
    g.lineTo(310, 150);
    g.lineTo(300, 250);
    g.lineTo(250, 430);
    g.lineTo(150, 430);
    g.lineTo(110, 250);
    g.lineTo(100, 150);
    g.closePath();
    g.stroke();
    g.strokeStyle = '#1d3a28';
    g.lineWidth = 2;
    g.beginPath();
    g.moveTo(200, 100); g.lineTo(200, 400); g.stroke();
    g.beginPath();
    g.moveTo(190, 110); g.lineTo(200, 100); g.lineTo(210, 110); g.stroke();
    g.fillStyle = '#2a4f86';
    g.font = 'bold 28px sans-serif';
    g.fillText('CUT 2', 40, 48);
    g.font = '18px sans-serif';
    g.fillText('GRAIN', 214, 250);
    g.fillStyle = '#8a3038';
    for (const y of [150, 250, 360]) {
      g.fillRect(96, y, 16, 5);
      g.fillRect(300, y, 16, 5);
    }
  });
  const tex = canvasTexture(canvas);
  texCache.set('pattern', tex);
  return tex;
}

function ticks() {
  if (texCache.has('ticks')) return texCache.get('ticks');
  const canvas = paint(256, 16, (g) => {
    g.fillStyle = '#f3e6c4';
    g.fillRect(0, 0, 256, 16);
    g.fillStyle = '#2a241c';
    for (let x = 4; x < 256; x += 8) {
      const h = x % 32 === 4 ? 12 : 6;
      g.fillRect(x, 2, 1, h);
    }
  });
  const tex = canvasTexture(canvas);
  texCache.set('ticks', tex);
  return tex;
}

function mirrorGlass() {
  if (texCache.has('glass')) return texCache.get('glass');
  const canvas = paint(64, 128, (g) => {
    const grd = g.createLinearGradient(0, 0, 0, 128);
    grd.addColorStop(0, '#e7eef2');
    grd.addColorStop(0.45, '#b7c4cc');
    grd.addColorStop(1, '#8ea0aa');
    g.fillStyle = grd;
    g.fillRect(0, 0, 64, 128);
    g.fillStyle = 'rgba(255,255,255,0.35)';
    g.fillRect(8, 10, 10, 70);
  });
  const tex = canvasTexture(canvas);
  texCache.set('glass', tex);
  return tex;
}

function shears(parent, x, y, z, rotY = 0, scale = 1) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  g.rotation.y = rotY;
  g.scale.setScalar(scale);
  parent.add(g);
  const steel = toon('#d5dbe1');
  const dark = toon('#2c3136');
  const b1 = addBox(g, 0.18, 0.007, 0.016, steel, 0.07, 0, 0.012);
  b1.rotation.y = 0.22;
  const b2 = addBox(g, 0.18, 0.007, 0.016, toon('#c5ccd4'), 0.07, 0.005, -0.012);
  b2.rotation.y = -0.28;
  addCyl(g, 0.012, 0.012, 0.016, dark, 0, 0.01, 0, 8);
  const l1 = addTorus(g, 0.02, 0.0045, dark, -0.034, 0.008, 0.018);
  l1.rotation.x = Math.PI / 2;
  const l2 = addTorus(g, 0.018, 0.0045, dark, -0.03, 0.008, -0.018);
  l2.rotation.x = Math.PI / 2;
  return g;
}

function dressForm(parent, st) {
  const g = pivot(parent, st);
  const jacket = st.variant === 'jacket';
  const cloth = jacket ? '#2a3038' : '#f6efe2';
  const clothMap = weave(cloth, jacket ? '#3d4652' : '#e7dcc8');
  const seam = jacket ? '#d15a3a' : '#c44747';
  const iron = toon('#3a4046');
  addCyl(g, 0.016, 0.018, 0.7, iron, 0, 0.36, 0, 10);
  for (let i = 0; i < 4; i++) {
    const a = i * Math.PI / 2 + 0.5;
    const x = Math.cos(a) * 0.18;
    const z = Math.sin(a) * 0.16;
    const leg = addBox(g, 0.22, 0.02, 0.025, iron, x * 0.55, 0.045, z * 0.55);
    leg.rotation.y = -a;
    addSphere(g, 0.018, toon('#22262a'), x, 0.02, z, 8);
  }
  addCyl(g, 0.045, 0.05, 0.028, toon('#c6a15a'), 0, 0.72, 0, 12);

  const body = new THREE.Group();
  body.position.y = 0.76;
  g.add(body);
  const pts = [
    new THREE.Vector2(0.06, 0),
    new THREE.Vector2(0.15, 0.06),
    new THREE.Vector2(0.175, 0.16),
    new THREE.Vector2(0.1, 0.32),
    new THREE.Vector2(jacket ? 0.145 : 0.128, 0.42),
    new THREE.Vector2(jacket ? 0.16 : 0.15, 0.52),
    new THREE.Vector2(0.08, 0.62),
    new THREE.Vector2(0.042, 0.72),
    new THREE.Vector2(0.036, 0.8),
  ];
  const mesh = new THREE.Mesh(new THREE.LatheGeometry(pts, 24), toon(cloth, { map: clothMap }));
  mesh.scale.set(jacket ? 1.02 : 0.92, 1, 0.62);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  body.add(mesh);

  const shoulder = jacket ? 0.46 : 0.38;
  addBox(body, shoulder, 0.05, 0.1, toon(cloth, { map: clothMap }), 0, 0.6, 0.01);
  addBox(body, 0.1, 0.04, 0.08, toon(cloth, { map: clothMap }), shoulder / 2 - 0.02, 0.58, 0.02);
  addBox(body, 0.1, 0.04, 0.08, toon(cloth, { map: clothMap }), -shoulder / 2 + 0.02, 0.58, 0.02);
  addCyl(body, 0.038, 0.046, 0.1, toon(jacket ? '#3a3030' : '#efd8c4'), 0, 0.76, 0, 12);
  addCyl(body, 0.07, 0.07, 0.02, toon('#c6a15a'), 0, 0.82, 0, 14);
  if (jacket) addBox(body, 0.16, 0.04, 0.08, toon('#1a1e24'), 0, 0.7, 0.06);
  addBox(body, 0.008, 0.48, 0.012, toon(seam), 0, 0.32, jacket ? 0.12 : 0.108);

  const tape = addTorus(body, jacket ? 0.15 : 0.132, 0.007, toon('#f4f4f2'), 0, 0.3, 0);
  tape.scale.set(1, 0.68, 1);
  tape.rotation.x = Math.PI / 2;

  if (jacket) {
    for (const side of [-1, 1]) {
      const sleeve = addCyl(body, 0.055, 0.07, 0.11, toon(cloth, { map: clothMap }), side * (shoulder / 2 + 0.02), 0.52, 0.01, 10);
      sleeve.rotation.z = Math.PI / 2;
    }
    addBox(body, shoulder * 0.7, 0.008, 0.012, toon('#e6d27a'), 0, 0.61, 0.07);
  } else {
    const pin = toon('#c2372f');
    [[0.02, 0.48, 0.12], [-0.05, 0.36, 0.11], [0.07, 0.24, 0.1], [0.0, 0.52, 0.1]].forEach(([x, y, z]) => {
      addSphere(g ? body : body, 0.008, pin, x, y, z, 6);
    });
    addBox(body, 0.16, 0.006, 0.01, toon('#d24b4b'), 0.02, 0.5, 0.115);
  }
  return g;
}

function taskLamp(g, x, y, z) {
  const brass = toon('#c6a15a', { map: woodGrain('#c6a15a') });
  const shadeMat = toon('#f8e7c0', { emissive: '#ffd9a0', emissiveIntensity: 0.85 });
  addCyl(g, 0.035, 0.045, 0.02, brass, x, y + 0.01, z, 10);
  addBox(g, 0.016, 0.22, 0.016, brass, x, y + 0.13, z);
  addBox(g, 0.24, 0.014, 0.014, brass, x - 0.12, y + 0.24, z + 0.02);
  const shade = addCyl(g, 0.09, 0.06, 0.07, shadeMat, x - 0.24, y + 0.2, z + 0.04, 12);
  shade.name = 'bulb';
  const pl = new THREE.PointLight('#ffd2a4', 0.7, 2.6, 2);
  pl.position.set(x - 0.24, y + 0.16, z + 0.04);
  g.add(pl);
}

function cuttingTable(parent, st, layout) {
  const g = pivot(parent, st);
  const w = st.size[0];
  const h = st.size[1];
  const d = st.size[2];
  const maple = toon('#e6cb9a', { map: woodGrain('#e4c496'), bumpMap: woodGrain('#e4c496'), bumpScale: 0.04 });
  const walnut = toon('#5c3d28', { map: woodGrain('#6a4630') });
  const topT = 0.05;
  addBox(g, w, topT, d, maple, 0, h - topT / 2, 0);
  addBox(g, w - 0.08, 0.08, d - 0.08, walnut, 0, h - topT - 0.04, 0);
  const lx = w / 2 - 0.08;
  const lz = d / 2 - 0.08;
  const legH = h - topT;
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      addBox(g, 0.07, legH, 0.07, walnut, sx * lx, legH / 2, sz * lz);
    }
  }
  addBox(g, w - 0.28, 0.03, d - 0.22, toon('#7a5a3c'), 0, 0.28, 0);
  addBox(g, 0.28, 0.05, 0.2, toon('#efe6d4'), -0.7, 0.32, 0.1);
  addBox(g, 0.22, 0.04, 0.16, toon('#1c2a44', { map: weave('#1c2a44', '#2a3d62') }), -0.35, 0.32, -0.15);
  addBox(g, 0.34, 0.06, 0.24, toon('#d8c7a4'), 0.45, 0.33, 0.05);

  const roll = addCyl(g, 0.09, 0.09, 0.7, toon('#1c2a44', { map: weave('#1c2a44', '#2a3d62') }), -1.15, h + 0.09, -0.15, 16);
  roll.rotation.x = Math.PI / 2;
  addCyl(g, 0.095, 0.095, 0.02, toon('#e6d7b8'), -1.15, h + 0.09, 0.2, 12).rotation.x = Math.PI / 2;
  addCyl(g, 0.095, 0.095, 0.02, toon('#e6d7b8'), -1.15, h + 0.09, -0.5, 12).rotation.x = Math.PI / 2;

  const clothGeo = new THREE.PlaneGeometry(1.9, 0.95, 18, 8);
  const pos = clothGeo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const sag = Math.sin((x + 0.95) * 2.2) * 0.012 + Math.cos(y * 3) * 0.006;
    pos.setZ(i, sag);
  }
  clothGeo.computeVertexNormals();
  const cloth = new THREE.Mesh(clothGeo, toon('#1c2a44', { map: weave('#1c2a44', '#31486e'), side: THREE.DoubleSide }));
  cloth.rotation.x = -Math.PI / 2;
  cloth.position.set(-0.05, h + 0.008, -0.05);
  cloth.castShadow = true;
  cloth.receiveShadow = true;
  g.add(cloth);

  addBox(g, 1.02, 0.004, 0.84, toon('#2f6b4f'), 0.82, h + 0.004, 0.1);
  const paper = addBox(g, 0.9, 0.006, 0.72, toon('#f4edd8', { map: patternPaper() }), 0.82, h + 0.01, 0.1);
  paper.receiveShadow = true;

  shears(g, 0.42, h + 0.02, 0.22, 0.6, 1);
  const chalkA = addCyl(g, 0.012, 0.012, 0.07, toon('#3d6fbf'), 0.55, h + 0.02, -0.28, 8);
  chalkA.rotation.z = Math.PI / 2;
  const chalkB = addCyl(g, 0.012, 0.012, 0.06, toon('#f4f4f2'), 0.62, h + 0.02, -0.34, 8);
  chalkB.rotation.z = Math.PI / 2.2;
  const tape = addTorus(g, 0.04, 0.01, toon('#e0b23a'), -0.45, h + 0.02, 0.38);
  tape.rotation.x = Math.PI / 2;
  addBox(g, 0.06, 0.008, 0.012, toon('#ddd'), -0.39, h + 0.02, 0.38);
  const stick = addBox(g, 1.05, 0.012, 0.035, toon('#f3e6c4', { map: ticks() }), 0.15, h + 0.02, -0.62);
  stick.rotation.y = -0.04;
  addSphere(g, 0.045, toon('#b4333a'), -0.85, h + 0.05, 0.42, 12);
  addSphere(g, 0.02, toon('#3d6a32'), -0.85, h + 0.09, 0.42, 8);
  addBox(g, 0.08, 0.02, 0.05, toon('#8d9398'), 1.15, h + 0.02, -0.35);
  addBox(g, 0.08, 0.02, 0.05, toon('#8d9398'), 1.2, h + 0.02, 0.45);

  addContact(parent, st.position[0], st.position[2], w * 0.92, d * 0.92, 0);
  return g;
}

function sewTable(parent, st) {
  const g = pivot(parent, st);
  const w = st.size[0];
  const h = st.size[1];
  const d = st.size[2];
  const top = toon('#e7d3b0', { map: woodGrain('#e4c9a2') });
  const leg = toon('#4e555c');
  const topT = 0.04;
  addBox(g, w, topT, d, top, 0, h - topT / 2, 0);
  addBox(g, w - 0.04, 0.045, 0.04, toon('#6a5340'), 0, h - topT - 0.02, d / 2 - 0.04);
  const ix = w / 2 - 0.06;
  const iz = d / 2 - 0.08;
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) addBox(g, 0.04, h - topT, 0.04, leg, sx * ix, (h - topT) / 2, sz * iz);
  }
  addBox(g, w - 0.12, 0.025, 0.04, leg, 0, 0.22, 0);
  const scrap = toon(st.cloth, { map: weave(st.cloth, '#f4efe4') });
  addBox(g, 0.28, 0.008, 0.16, scrap, 0.02, h + 0.028, 0.16);
  addCyl(g, 0.035, 0.02, 0.07, toon('#c44747'), -0.12, h + 0.06, -0.32, 10);
  addCyl(g, 0.03, 0.016, 0.06, toon('#1d4e89'), 0.05, h + 0.055, -0.38, 10);
  taskLamp(g, w / 2 - 0.06, h, -0.15);
  shears(g, -0.18, h + 0.04, -0.42, 1.2, 0.55);
  addContact(parent, st.position[0], st.position[2], w * 0.95, d * 0.95, 0);
  return g;
}

function fitting(parent, layout) {
  const platform = byId(layout, 'fitting_platform');
  const g = pivot(parent, platform);
  const [w, h, d] = platform.size;
  addBox(g, w, h, d, toon('#6b4632'), 0, h / 2, 0);
  addBox(g, w - 0.08, 0.02, d - 0.08, toon('#8d3a3a', { map: weave('#7a3030', '#a35050') }), 0, h + 0.005, 0);
  addContact(parent, platform.position[0], platform.position[2], w * 0.96, d * 0.96, 0);

  dressForm(parent, byId(layout, 'form_toile'));
  dressForm(parent, byId(layout, 'form_jacket'));

  const stool = pivot(parent, byId(layout, 'fitting_stool'));
  addCyl(stool, 0.15, 0.15, 0.04, toon('#5c3d28'), 0, 0.46, 0, 14);
  addCyl(stool, 0.035, 0.04, 0.44, toon('#3e342c'), 0, 0.22, 0, 8);
  addBox(stool, 0.22, 0.025, 0.025, toon('#3e342c'), 0, 0.08, 0);
  addBox(stool, 0.025, 0.025, 0.22, toon('#3e342c'), 0, 0.08, 0);

  const mirror = pivot(parent, byId(layout, 'mirror'));
  const wood = toon('#5a3a26', { map: woodGrain('#6a4630') });
  const glassMat = new THREE.MeshBasicMaterial({ map: mirrorGlass(), color: '#d5dee4' });
  function panel(pw, ph, x, z, rot) {
    const p = new THREE.Group();
    p.position.set(x, 0.12 + ph / 2, z);
    p.rotation.y = rot;
    mirror.add(p);
    addBox(p, pw + 0.05, ph + 0.05, 0.04, wood, 0, 0, 0);
    const glass = new THREE.Mesh(new THREE.PlaneGeometry(pw, ph), glassMat);
    glass.position.z = 0.024;
    glass.userData.keepBasic = true;
    glass.userData.noShadow = true;
    p.add(glass);
  }
  panel(0.72, 1.72, 0, 0, 0);
  panel(0.46, 1.6, -0.62, 0.06, 0.4);
  panel(0.46, 1.6, 0.62, 0.06, -0.4);

  const chart = paint(256, 320, (ctx) => {
    ctx.fillStyle = '#f6f0e4';
    ctx.fillRect(0, 0, 256, 320);
    ctx.strokeStyle = '#6a4630';
    ctx.lineWidth = 6;
    ctx.strokeRect(8, 8, 240, 304);
    ctx.fillStyle = '#3a2a22';
    ctx.font = 'bold 28px serif';
    ctx.fillText('MARLOW', 48, 48);
    ctx.font = '16px sans-serif';
    ctx.fillText('chest  96', 36, 110);
    ctx.fillText('waist  82', 36, 150);
    ctx.fillText('hip   100', 36, 190);
    ctx.fillText('back  44', 36, 230);
    ctx.strokeStyle = '#2a3038';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(180, 80);
    ctx.lineTo(160, 120);
    ctx.lineTo(200, 120);
    ctx.lineTo(180, 80);
    ctx.moveTo(180, 120);
    ctx.lineTo(180, 230);
    ctx.stroke();
  });
  const board = addBox(parent, 0.46, 0.62, 0.02, toon('#f6f0e4', { map: canvasTexture(chart) }), -4.42, 1.7, -2.55);
  board.userData.noShadow = false;
}

function fabricRack(parent, st) {
  const g = pivot(parent, st);
  const [w, h, d] = st.size;
  const wood = toon('#6a4630', { map: woodGrain('#6a4630') });
  addBox(g, w, 0.06, d, wood, 0, 0.04, 0);
  addBox(g, w, 0.04, d, wood, 0, h, 0);
  addBox(g, w, 0.035, d - 0.04, wood, 0, 0.95, 0);
  addBox(g, 0.04, h, d, wood, -w / 2 + 0.02, h / 2, 0);
  addBox(g, 0.04, h, d, wood, w / 2 - 0.02, h / 2, 0);
  addBox(g, w, h - 0.1, 0.03, toon('#efe6d4'), 0, h / 2 + 0.02, -d / 2 + 0.03);
  const cubbies = 8;
  const inner = w - 0.1;
  for (let i = 1; i < cubbies; i++) {
    const x = -inner / 2 + (inner / cubbies) * i;
    addBox(g, 0.02, h - 1.05, d - 0.06, wood, x, 0.95 + (h - 1.05) / 2, 0);
  }
  for (let i = 0; i < cubbies; i++) {
    const x = -inner / 2 + inner / cubbies * (i + 0.5);
    const [a, b] = BOLTS[i];
    const radius = 0.11 + (i % 3) * 0.012;
    const bolt = addCyl(g, radius, radius, 0.78, toon(a, { map: weave(a, b) }), x, 1.4, 0.02, 16);
    addCyl(g, radius + 0.01, radius + 0.01, 0.025, toon('#e7dcc4'), x, 1.78, 0.02, 12);
    addCyl(g, radius + 0.01, radius + 0.01, 0.025, toon('#e7dcc4'), x, 1.02, 0.02, 12);
    if (i === 3) bolt.position.z = 0.08;
  }
  for (let i = 0; i < 6; i++) {
    const [a, b] = BOLTS[8 + i];
    const x = -1.9 + i * 0.72;
    const roll = addCyl(g, 0.13, 0.13, 0.52, toon(a, { map: weave(a, b) }), x, 0.48, 0.02, 16);
    roll.rotation.z = Math.PI / 2;
    addCyl(g, 0.14, 0.14, 0.02, toon('#eadcc0'), x - 0.26, 0.48, 0.02, 12).rotation.z = Math.PI / 2;
    addCyl(g, 0.14, 0.14, 0.02, toon('#eadcc0'), x + 0.26, 0.48, 0.02, 12).rotation.z = Math.PI / 2;
  }
  addContact(parent, st.position[0], st.position[2], w * 0.98, d * 0.9, 0);
}

function notions(parent, st) {
  const g = pivot(parent, st);
  const [depth, height, width] = st.size;
  const wood = toon('#5c3e2c', { map: woodGrain('#6a4630') });
  const face = toon('#7a5640', { map: woodGrain('#8a6248') });
  addBox(g, depth, height, width, wood, 0, height / 2, 0);
  const drawers = 5;
  const dh = (height - 0.08) / drawers;
  for (let i = 0; i < drawers; i++) {
    const y = 0.06 + dh * (i + 0.5);
    const pull = i === 2 ? 0.07 : 0.012;
    addBox(g, 0.02, dh - 0.025, width - 0.06, face, -depth / 2 - pull / 2, y, 0);
    addCyl(g, 0.012, 0.012, 0.04, toon('#c6a15a'), -depth / 2 - pull - 0.01, y, 0, 8).rotation.z = Math.PI / 2;
    addBox(g, 0.008, 0.008, width - 0.08, toon('#2a211c'), -depth / 2 - 0.002, y + dh / 2 - 0.01, 0);
  }
  const cards = ['#1c2a44', '#6e2432', '#c4a36a', '#1d3b32', '#f3efe4', '#a3543c'];
  cards.forEach((color, i) => {
    const card = addBox(g, 0.012, 0.16, 0.1, toon('#f7f3ea'), -0.08 + (i % 3) * 0.06, height + 0.08, -0.18 + Math.floor(i / 3) * 0.22);
    card.rotation.z = -0.08;
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 2; c++) {
        addSphere(g, 0.012, toon(color), -0.09 + (i % 3) * 0.06, height + 0.04 + r * 0.035, -0.2 + Math.floor(i / 3) * 0.22 + c * 0.04, 6);
      }
    }
  });
  shears(g, -depth / 2 - 0.02, height + 0.02, 0.28, 0.4, 0.7);
  addCyl(g, 0.006, 0.006, 0.08, toon('#c6a15a'), 0.02, height + 0.04, -0.32, 6);
  for (let i = 0; i < 3; i++) {
    addBox(g, 0.09, 0.004, 0.06, toon(i === 1 ? '#1c2a44' : '#f4efe4'), 0.02, height + 0.045 + i * 0.006, -0.32);
  }
  for (let i = 0; i < 3; i++) {
    const hang = shears(parent, st.position[0] - depth / 2 - 0.04, 1.55 - i * 0.22, st.position[2] - 0.28 + i * 0.22, 0.2, 0.85);
    hang.rotation.x = Math.PI / 2;
    hang.rotation.z = 0.4 + i * 0.2;
  }
}

function pressing(parent, st) {
  const g = pivot(parent, st);
  const [w, h, d] = st.size;
  const legMat = toon('#d5dadf');
  const pad = toon('#f4f0e6', { map: weave('#f6f2ea', '#e6d8c4') });
  addBox(g, w, 0.05, d * 0.58, pad, 0, h - 0.025, d * 0.16);
  const nose = addCyl(g, w * 0.48, 0.03, d * 0.42, pad, 0, h - 0.025, -d * 0.28, 4);
  nose.rotation.x = Math.PI / 2;
  nose.scale.x = 0.55;
  for (const side of [-1, 1]) {
    const leg = addCyl(g, 0.012, 0.012, h * 0.96, legMat, side * 0.1, h * 0.46, 0.12, 8);
    leg.rotation.z = side * -0.22;
    const rear = addCyl(g, 0.012, 0.012, h * 0.86, legMat, side * 0.08, h * 0.4, -0.18, 8);
    rear.rotation.z = side * 0.18;
    rear.rotation.x = -0.25;
  }
  addBox(g, 0.28, 0.015, 0.015, legMat, 0, 0.16, 0.05);
  const ham = addSphere(g, 0.07, toon('#f6f1e6', { map: weave('#f6f1e6', '#e7d3b0') }), 0.02, h + 0.08, -0.42, 12);
  ham.scale.set(1, 0.7, 1.3);
  addBox(g, 0.08, 0.035, 0.16, toon('#6a4630'), -0.02, h + 0.04, 0.42);
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.02, h + 0.06, 0.28),
    new THREE.Vector3(0.12, h + 0.02, 0.05),
    new THREE.Vector3(0.16, 0.55, -0.15),
    new THREE.Vector3(0.1, 0.2, -0.35),
  ]);
  const cord = new THREE.Mesh(new THREE.TubeGeometry(curve, 16, 0.006, 6, false), toon('#2a2a2a'));
  cord.castShadow = true;
  g.add(cord);
  addContact(parent, st.position[0], st.position[2], 0.7, d * 0.8, st.rotationY || 0);
}

function patternRoll(parent, st) {
  const g = pivot(parent, st);
  addCyl(g, 0.05, 0.05, 0.78, toon('#6a4630'), 0, 0.46, 0, 8);
  addCyl(g, 0.11, 0.11, 0.02, toon('#5c3d28'), 0, 0.86, 0, 12);
  const roll = addCyl(g, 0.1, 0.1, 0.42, toon('#f7f1df', { map: patternPaper() }), 0, 0.62, 0, 16);
  roll.rotation.x = Math.PI / 2;
  addContact(parent, st.position[0], st.position[2], 0.28, 0.28, 0);
}

function scrapBin(parent, st) {
  const g = pivot(parent, st);
  const wood = toon('#6b4e32');
  addBox(g, 0.38, 0.28, 0.38, wood, 0, 0.16, 0);
  addBox(g, 0.32, 0.06, 0.32, toon('#1c2a44', { map: weave('#1c2a44', '#6e2432') }), 0, 0.28, 0);
  addBox(g, 0.14, 0.02, 0.1, toon('#f4efe4'), 0.06, 0.32, 0.04);
  addContact(parent, st.position[0], st.position[2], 0.4, 0.4, 0);
}

function clientJacket(parent, layout) {
  const chair = layout.instances.find((i) => i.id === 'chair_client');
  const g = new THREE.Group();
  g.name = 'client_jacket';
  g.position.set(chair.position[0], 0, chair.position[2]);
  g.rotation.y = chair.rotationY || 0;
  parent.add(g);
  const cloth = toon('#1c2a44', { map: weave('#1c2a44', '#2c4064'), side: THREE.DoubleSide });
  addBox(g, 0.36, 0.46, 0.035, cloth, 0, 0.58, 0.16);
  const left = addBox(g, 0.09, 0.34, 0.07, cloth, -0.2, 0.42, 0.15);
  left.rotation.z = 0.18;
  const right = addBox(g, 0.09, 0.34, 0.07, cloth, 0.2, 0.42, 0.15);
  right.rotation.z = -0.18;
  addBox(g, 0.18, 0.05, 0.02, toon('#c4a36a'), 0, 0.78, 0.18);
}

function threadFrame(parent, st) {
  const g = pivot(parent, st);
  const [w, h, d] = st.size;
  const wood = toon('#5c3e2c');
  addBox(g, w, h, 0.04, wood, 0, h / 2, -d / 2);
  addBox(g, w, h, 0.04, wood, 0, h / 2, d / 2);
  addBox(g, w, 0.04, d, wood, 0, h - 0.02, 0);
  addBox(g, w, 0.04, d, wood, 0, 0.04, 0);
  const colors = ['#b4333a', '#1d4e89', '#e0b23a', '#f4f4f2', '#1c2a44', '#2f6b4f', '#6e2432', '#c4a36a', '#222', '#8d3a4a'];
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 8; col++) {
      const z = -d / 2 + 0.22 + col * 0.28;
      const y = 0.4 + row * 0.32;
      addCyl(g, 0.012, 0.012, 0.08, toon('#c6a15a'), 0, y, z, 6).rotation.z = Math.PI / 2;
      addCyl(g, 0.045, 0.03, 0.07, toon(colors[(row + col) % colors.length]), -0.02, y, z, 10).rotation.z = Math.PI / 2;
    }
  }
}

function shellOf(layout) {
  const g = new THREE.Group();
  g.name = 'shell';
  const { width: W, depth: D, height: H } = layout.meta.room;
  const s = layout.shell;
  const t = 0.14;
  const floorMat = toon(s.floor, { map: planks() });
  const wallMat = toon(s.plaster, { map: plaster() });
  const wood = toon(s.wood, { map: woodGrain(s.wood) });
  const ceilMat = toon(s.ceiling);

  const floor = new THREE.Mesh(new THREE.BoxGeometry(W, 0.08, D), floorMat);
  floor.position.y = -0.04;
  floor.receiveShadow = true;
  floor.userData.noShadow = true;
  g.add(floor);
  addBox(g, W - 0.28, 0.012, 0.08, wood, 0, 0.008, -D / 2 + 0.18);
  addBox(g, W - 0.28, 0.012, 0.08, wood, 0, 0.008, D / 2 - 0.18);
  addBox(g, 0.08, 0.012, D - 0.28, wood, -W / 2 + 0.18, 0.008, 0);
  addBox(g, 0.08, 0.012, D - 0.36, wood, W / 2 - 0.22, 0.008, -0.4);

  addBox(g, W, H, t, wallMat, 0, H / 2, -D / 2);
  addBox(g, t, H, 2.25, wallMat, W / 2, H / 2, -D / 2 + 1.125);

  const openings = [
    { z0: -0.95, z1: 0.5, y0: 0.86, y1: 2.55 },
    { z0: 1.2, z1: 2.5, y0: 0.9, y1: 2.48 },
  ];
  let cursor = -D / 2;
  const piers = [];
  for (const o of openings) {
    if (o.z0 > cursor) piers.push([cursor, o.z0]);
    cursor = o.z1;
  }
  if (cursor < D / 2) piers.push([cursor, D / 2]);
  for (const [a, b] of piers) addBox(g, t, H, b - a, wallMat, -W / 2, H / 2, (a + b) / 2);

  const skyMat = new THREE.MeshBasicMaterial({ color: '#d5e6f4' });
  const trim = toon('#efe6d4');
  for (const o of openings) {
    const span = o.z1 - o.z0;
    const zc = (o.z0 + o.z1) / 2;
    addBox(g, t, o.y0, span, wallMat, -W / 2, o.y0 / 2, zc);
    addBox(g, t, H - o.y1, span, wallMat, -W / 2, o.y1 + (H - o.y1) / 2, zc);
    addBox(g, 0.06, o.y1 - o.y0, 0.06, wood, -W / 2 + 0.02, (o.y0 + o.y1) / 2, o.z0);
    addBox(g, 0.06, o.y1 - o.y0, 0.06, wood, -W / 2 + 0.02, (o.y0 + o.y1) / 2, o.z1);
    addBox(g, 0.06, 0.06, span, wood, -W / 2 + 0.02, o.y0, zc);
    addBox(g, 0.06, 0.06, span, wood, -W / 2 + 0.02, o.y1, zc);
    addBox(g, 0.04, o.y1 - o.y0, 0.03, trim, -W / 2 + 0.05, (o.y0 + o.y1) / 2, zc);
    const mullionCount = 2;
    for (let i = 1; i <= mullionCount; i++) {
      const z = o.z0 + (span * i) / (mullionCount + 1);
      addBox(g, 0.03, o.y1 - o.y0 - 0.08, 0.025, trim, -W / 2 + 0.06, (o.y0 + o.y1) / 2, z);
    }
    addBox(g, 0.02, 0.02, span - 0.1, trim, -W / 2 + 0.06, (o.y0 + o.y1) / 2, zc);
    const glass = new THREE.Mesh(
      new THREE.PlaneGeometry(span - 0.08, o.y1 - o.y0 - 0.08),
      new THREE.MeshBasicMaterial({ color: '#e7f2f8', transparent: true, opacity: 0.28 }),
    );
    glass.position.set(-W / 2 + 0.04, (o.y0 + o.y1) / 2, zc);
    glass.rotation.y = Math.PI / 2;
    glass.userData.keepBasic = true;
    glass.userData.noShadow = true;
    g.add(glass);
    const sky = new THREE.Mesh(new THREE.PlaneGeometry(span + 0.4, o.y1 - o.y0 + 0.5), skyMat);
    sky.position.set(-W / 2 - 0.35, (o.y0 + o.y1) / 2, zc);
    sky.rotation.y = Math.PI / 2;
    sky.userData.keepBasic = true;
    sky.userData.noShadow = true;
    sky.userData.noReceive = true;
    g.add(sky);
    const curtainMat = toon('#f6f1e6', { map: weave('#f8f4ec', '#e6dcc8'), side: THREE.DoubleSide });
    const drop = o.y1 - o.y0 - 0.12;
    for (const side of [-1, 1]) {
      const z = side < 0 ? o.z0 + 0.1 : o.z1 - 0.1;
      const panel = addBox(g, 0.02, drop, 0.22, curtainMat, -W / 2 + 0.11, o.y0 + drop / 2 + 0.02, z);
      panel.rotation.y = side * 0.18;
      addBox(g, 0.025, 0.03, 0.08, toon('#c6a15a'), -W / 2 + 0.13, o.y0 + drop * 0.42, z);
    }
  }

  addBox(g, W - 0.2, 0.78, 0.04, wood, 0, 0.39, -D / 2 + 0.09);
  addBox(g, 0.04, 0.78, D - 0.3, wood, -W / 2 + 0.09, 0.39, 0.1);
  addBox(g, 0.04, 0.78, 2.1, wood, W / 2 - 0.09, 0.39, -D / 2 + 1.1);
  addBox(g, W - 0.15, 0.035, 0.035, toon('#c6a15a'), 0, 2.72, -D / 2 + 0.08);
  addBox(g, 0.03, 0.03, D - 0.4, toon('#c6a15a'), -W / 2 + 0.08, 2.72, 0);

  const ceil = new THREE.Mesh(new THREE.BoxGeometry(W - 0.4, 0.08, D * 0.62), ceilMat);
  ceil.position.set(-0.2, H - 0.05, -D * 0.16);
  ceil.receiveShadow = true;
  g.add(ceil);
  for (const z of [-2.7, -1.15, 0.55]) {
    addBox(g, W - 0.8, 0.1, 0.08, wood, -0.2, H - 0.16, z);
  }

  const name = paint(256, 64, (ctx) => {
    ctx.fillStyle = '#5c3d28';
    ctx.fillRect(0, 0, 256, 64);
    ctx.fillStyle = '#f6f0e4';
    ctx.font = 'bold 36px serif';
    ctx.fillText('ATELIER', 28, 44);
  });
  addBox(g, 0.7, 0.16, 0.02, toon('#f6f0e4', { map: canvasTexture(name) }), -3.15, 2.35, -D / 2 + 0.1);
  return g;
}

function makeProcedural(layout) {
  const g = new THREE.Group();
  g.name = 'atelier';
  cuttingTable(g, byId(layout, 'cutting_table'), layout);
  sewTable(g, byId(layout, 'sew_table_a'));
  sewTable(g, byId(layout, 'sew_table_b'));
  fitting(g, layout);
  fabricRack(g, byId(layout, 'fabric_rack'));
  notions(g, byId(layout, 'notions'));
  pressing(g, byId(layout, 'press_board'));
  patternRoll(g, byId(layout, 'pattern_roll'));
  clientJacket(g, layout);
  scrapBin(g, byId(layout, 'scrap_bin'));
  threadFrame(g, byId(layout, 'thread_frame'));

  for (const id of ['pendant_table', 'pendant_fit']) {
    const inst = layout.instances.find((i) => i.id === id);
    addCyl(g, 0.008, 0.008, 0.42, toon('#2a241c'), inst.position[0], inst.position[1] + 0.62, inst.position[2], 6);
    const bulb = addSphere(g, 0.05, toon('#fff4dc', { emissive: '#fff1c9', emissiveIntensity: 1.3 }), inst.position[0], inst.position[1] + 0.18, inst.position[2], 10);
    bulb.name = 'bulb';
    const pl = new THREE.PointLight('#ffd7a8', id === 'pendant_table' ? 0.85 : 0.45, 4.5, 2);
    pl.position.set(inst.position[0], inst.position[1] + 0.05, inst.position[2]);
    g.add(pl);
  }

  for (const id of ['form_toile', 'form_jacket', 'fitting_stool']) {
    const st = byId(layout, id);
    addContact(g, st.position[0], st.position[2], st.size[0] * 0.85, st.size[2] * 0.85, st.rotationY || 0);
  }
  return g;
}

boot({
  makeShell: shellOf,
  makeProcedural,
  readyText: 'ready — orbit · T toon · U unlit',
});
