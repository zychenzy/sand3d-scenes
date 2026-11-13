import * as THREE from 'three';
import { boot, toon, addBox, addCyl } from './scene_lib.js';

const LABEL = ['BAL', 'H/S', 'ESC', 'P/W', 'SCR', 'SPR', 'STM', 'CAN', 'CRN', 'BRG', 'CLK', 'HND', 'MS', 'CAP', 'RCH', 'GS'];

function canvasTex(draw, w, h) {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  draw(canvas.getContext('2d'), w, h);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

function grain(base, line, rows) {
  return canvasTex((g, w, h) => {
    g.fillStyle = base;
    g.fillRect(0, 0, w, h);
    g.strokeStyle = line;
    for (let i = 0; i < rows; i++) {
      const y = (i * 47) % h;
      g.globalAlpha = 0.18 + (i % 4) * 0.06;
      g.lineWidth = 1 + (i % 3);
      g.beginPath();
      g.moveTo(0, y);
      g.bezierCurveTo(w * 0.3, y + 8, w * 0.7, y - 6, w, y + 3);
      g.stroke();
    }
    g.globalAlpha = 1;
  }, 256, 256);
}

const mapleMap = grain('#f0e0c4', '#c4a36a', 70);
const oakMap = grain('#c4894e', '#7a4e28', 48);
const walnutMap = grain('#6a4330', '#3a2418', 40);
mapleMap.repeat.set(1.4, 0.7);
oakMap.repeat.set(1.2, 0.6);
walnutMap.repeat.set(1.6, 0.8);

const plasterMap = canvasTex((g, w, h) => {
  g.fillStyle = '#f3ecdf';
  g.fillRect(0, 0, w, h);
  for (let i = 0; i < 180; i++) {
    g.fillStyle = i % 2 ? 'rgba(90,70,50,0.05)' : 'rgba(255,255,255,0.18)';
    g.fillRect((i * 53) % w, (i * 97) % h, 18, 10);
  }
}, 256, 256);
plasterMap.repeat.set(3, 2);

const maple = toon('#ffffff', { map: mapleMap });
const oak = toon('#ffffff', { map: oakMap });
const walnut = toon('#ffffff', { map: walnutMap });
const walnutDark = toon('#3a261c');
const plaster = toon('#ffffff', { map: plasterMap });
const slate = toon('#3c4a57');
const slateDeep = toon('#2c3844');
const baize = toon('#2f5c48');
const baizeDeep = toon('#234436');
const brass = toon('#c6a15e');
const brassDark = toon('#8a6a32');
const steel = toon('#b7c0c8');
const steelDark = toon('#5c656e');
const ink = toon('#1c1c1c');
const dialWhite = toon('#f6f1e6');
const paper = toon('#f3efe4');
const glassMat = toon('#d5e2ea', { transparent: true, opacity: 0.42, side: THREE.DoubleSide });
const charcoal = toon('#2a2e33');
const strapBrown = toon('#6a4030');
const strapBlack = toon('#1a1c1e');

const labelMat = new Map();
function drawerLabel(text) {
  if (labelMat.has(text)) return labelMat.get(text);
  const map = canvasTex((g, w, h) => {
    g.fillStyle = '#f4ecd8';
    g.fillRect(0, 0, w, h);
    g.strokeStyle = '#c4b48a';
    g.lineWidth = 6;
    g.strokeRect(4, 4, w - 8, h - 8);
    g.fillStyle = '#2a241c';
    g.font = '700 54px Liberation Sans, sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(text, w / 2, h / 2 + 2);
  }, 256, 128);
  const mat = toon('#ffffff', { map });
  labelMat.set(text, mat);
  return mat;
}

let dialMap;
function clockDialMap() {
  if (dialMap) return dialMap;
  dialMap = canvasTex((g, w, h) => {
    g.fillStyle = '#f7f2e8';
    g.beginPath();
    g.arc(w / 2, h / 2, w / 2 - 1, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#1a1a1a';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.font = '700 36px Liberation Sans, sans-serif';
    for (let n = 1; n <= 12; n++) {
      const a = (n / 12) * Math.PI * 2 - Math.PI / 2;
      g.fillText(String(n), w / 2 + Math.cos(a) * (w * 0.34), h / 2 + Math.sin(a) * (h * 0.34));
    }
    for (let i = 0; i < 60; i++) {
      const a = (i / 60) * Math.PI * 2 - Math.PI / 2;
      const inner = i % 5 === 0 ? w * 0.42 : w * 0.45;
      g.strokeStyle = '#1a1a1a';
      g.lineWidth = i % 5 === 0 ? 3 : 1;
      g.beginPath();
      g.moveTo(w / 2 + Math.cos(a) * inner, h / 2 + Math.sin(a) * inner);
      g.lineTo(w / 2 + Math.cos(a) * (w * 0.48), h / 2 + Math.sin(a) * (h * 0.48));
      g.stroke();
    }
  }, 256, 256);
  return dialMap;
}

function receiveOnly(mesh) {
  mesh.userData.noShadow = true;
  mesh.userData.receiveShadow = true;
  return mesh;
}

function flat(mesh) {
  mesh.userData.noShadow = true;
  return mesh;
}

function hand(parent, length, width, clockwiseFrom12, z) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(width, length, 0.005), ink);
  m.geometry.translate(0, length * 0.42, 0);
  m.rotation.z = -clockwiseFrom12;
  m.position.z = z;
  m.userData.noShadow = true;
  parent.add(m);
  return m;
}

function dialFace(parent, radius, z, hours, minutes) {
  const face = new THREE.Mesh(new THREE.CircleGeometry(radius, 32), toon('#ffffff', { map: clockDialMap() }));
  face.position.z = z;
  face.userData.noShadow = true;
  parent.add(face);
  const minuteAngle = (minutes / 60) * Math.PI * 2;
  const hourAngle = ((hours % 12) / 12) * Math.PI * 2 + minuteAngle / 12;
  hand(parent, radius * 0.5, radius * 0.06, hourAngle, z + 0.006);
  hand(parent, radius * 0.74, radius * 0.035, minuteAngle, z + 0.01);
  const pin = new THREE.Mesh(new THREE.CircleGeometry(radius * 0.045, 12), brass);
  pin.position.z = z + 0.014;
  pin.userData.noShadow = true;
  parent.add(pin);
}

function roundClock(g, x, y, z, radius, hours, minutes) {
  const grp = new THREE.Group();
  const back = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, 0.06, 28), walnut);
  back.rotation.x = Math.PI / 2;
  grp.add(back);
  const bezel = new THREE.Mesh(new THREE.TorusGeometry(radius * 0.96, 0.018, 8, 28), brass);
  bezel.position.z = 0.03;
  grp.add(bezel);
  dialFace(grp, radius * 0.82, 0.036, hours, minutes);
  grp.position.set(x, y, z);
  g.add(grp);
  return grp;
}

function regulator(g, x, z) {
  const grp = new THREE.Group();
  addBox(grp, 0.42, 1.35, 0.1, walnut, 0, 1.55, 0);
  addBox(grp, 0.32, 0.95, 0.02, glassMat, 0, 1.42, 0.05);
  const rod = addCyl(grp, 0.006, 0.006, 0.7, brassDark, 0, 1.35, 0.055, 8);
  rod.rotation.z = 0.08;
  addCyl(grp, 0.055, 0.055, 0.012, brass, 0.03, 1.02, 0.06, 16);
  const hood = addBox(grp, 0.48, 0.5, 0.16, walnutDark, 0, 2.28, 0);
  hood.position.z = 0.01;
  const face = new THREE.Group();
  face.position.set(0, 2.28, 0.09);
  dialFace(face, 0.16, 0, 10, 10);
  const bezel = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.012, 8, 24), brass);
  bezel.position.z = 0.002;
  face.add(bezel);
  grp.add(face);
  addBox(grp, 0.5, 0.04, 0.18, brassDark, 0, 2.54, 0);
  grp.position.set(x, 0, z);
  g.add(grp);
}

function longcase(g, x, z) {
  const grp = new THREE.Group();
  addBox(grp, 0.52, 0.16, 0.34, walnutDark, 0, 0.08, 0);
  addBox(grp, 0.46, 1.35, 0.28, walnut, 0, 0.82, 0);
  addBox(grp, 0.34, 1.05, 0.02, glassMat, 0, 0.82, 0.13);
  addBox(grp, 0.012, 1.05, 0.02, brassDark, 0, 0.82, 0.145);
  addCyl(grp, 0.008, 0.008, 0.85, brassDark, 0, 0.78, 0.12, 8);
  addCyl(grp, 0.07, 0.07, 0.015, brass, 0.04, 0.4, 0.14, 16);
  addBox(grp, 0.5, 0.42, 0.32, walnutDark, 0, 1.68, 0);
  const face = new THREE.Group();
  face.position.set(0, 1.7, 0.17);
  dialFace(face, 0.15, 0, 8, 20);
  grp.add(face);
  addBox(grp, 0.4, 0.06, 0.36, walnutDark, 0, 1.96, 0);
  addCyl(grp, 0.04, 0.01, 0.1, brass, 0, 2.04, 0, 10);
  grp.position.set(x, 0, z);
  g.add(grp);
}

function mantelClock(g, x, y, z) {
  const grp = new THREE.Group();
  addBox(grp, 0.28, 0.22, 0.12, walnut, 0, 0.12, 0);
  addBox(grp, 0.16, 0.16, 0.13, walnutDark, 0, 0.28, 0);
  const face = new THREE.Group();
  face.position.set(0, 0.28, 0.07);
  dialFace(face, 0.055, 0, 3, 45);
  grp.add(face);
  addBox(grp, 0.2, 0.03, 0.14, brassDark, 0, 0.38, 0);
  grp.position.set(x, y, z);
  g.add(grp);
}

function benchTopGeo(w, d, bite) {
  const hw = w / 2;
  const shape = new THREE.Shape();
  shape.moveTo(-hw, 0);
  shape.lineTo(hw, 0);
  shape.lineTo(hw, d);
  shape.lineTo(bite, d);
  shape.absarc(0, d, bite, 0, Math.PI, true);
  shape.lineTo(-hw, d);
  const geo = new THREE.ExtrudeGeometry(shape, { depth: 0.046, bevelEnabled: false, curveSegments: 18 });
  geo.rotateX(-Math.PI / 2);
  geo.rotateY(Math.PI);
  return geo;
}

function movement(g, x, y, z) {
  const grp = new THREE.Group();
  addCyl(grp, 0.055, 0.055, 0.012, brass, 0, 0.008, 0, 24);
  addCyl(grp, 0.028, 0.028, 0.008, brassDark, -0.012, 0.016, 0.004, 16);
  addCyl(grp, 0.018, 0.018, 0.008, steel, 0.02, 0.016, -0.008, 14);
  const balance = new THREE.Mesh(new THREE.TorusGeometry(0.016, 0.0025, 6, 16), steel);
  balance.rotation.x = Math.PI / 2;
  balance.position.set(0.018, 0.02, 0.012);
  grp.add(balance);
  addBox(grp, 0.04, 0.006, 0.012, steelDark, -0.004, 0.02, -0.01);
  addBox(grp, 0.012, 0.006, 0.03, steelDark, 0.02, 0.02, 0);
  addCyl(grp, 0.006, 0.006, 0.02, steel, 0.058, 0.01, 0, 8).rotation.z = Math.PI / 2;
  grp.position.set(x, y, z);
  g.add(grp);
}

function partsTray(g, x, y, z) {
  const grp = new THREE.Group();
  addBox(grp, 0.28, 0.02, 0.16, walnutDark, 0, 0.01, 0);
  const cols = 4;
  const rows = 2;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const px = -0.105 + c * 0.07;
      const pz = -0.04 + r * 0.08;
      addBox(grp, 0.06, 0.012, 0.06, paper, px, 0.022, pz);
      if ((c + r) % 2 === 0) {
        for (let k = 0; k < 3; k++) {
          const screw = addCyl(grp, 0.004, 0.004, 0.006, k === 1 ? brass : steelDark, px - 0.012 + k * 0.012, 0.03, pz, 6);
          screw.userData.noShadow = true;
        }
      }
    }
  }
  grp.position.set(x, y, z);
  g.add(grp);
}

function screwdrivers(g, x, y, z) {
  const block = addBox(g, 0.1, 0.035, 0.06, walnut, x, y + 0.02, z);
  block.userData.keep = true;
  const handles = ['#8d2e2e', '#1f3d6e', '#1c1c1c', '#8d2e2e', '#1f3d6e'];
  handles.forEach((color, i) => {
    const h = addCyl(g, 0.007, 0.008, 0.09, toon(color), x - 0.032 + i * 0.016, y + 0.07, z, 8);
    h.rotation.z = -0.35;
    h.rotation.x = 0.15;
    const blade = addCyl(g, 0.002, 0.002, 0.04, steel, x - 0.02 + i * 0.016, y + 0.12, z - 0.01, 6);
    blade.rotation.z = -0.35;
    blade.userData.noShadow = true;
  });
}

function oilCups(g, x, y, z) {
  for (let i = 0; i < 4; i++) {
    addCyl(g, 0.012, 0.014, 0.012, brass, x + i * 0.032, y + 0.008, z, 10);
    const oil = addCyl(g, 0.008, 0.008, 0.004, toon(i % 2 ? '#d6e07a' : '#e7e2c8'), x + i * 0.032, y + 0.014, z, 8);
    oil.userData.noShadow = true;
  }
}

function loupeStand(g, x, y, z) {
  const baseX = x + 0.2;
  addCyl(g, 0.022, 0.026, 0.01, brassDark, baseX, y + 0.005, z, 12);
  addCyl(g, 0.0045, 0.0045, 0.13, brass, baseX, y + 0.075, z, 8);
  const arm = addCyl(g, 0.0045, 0.0045, 0.2, brass, x + 0.1, y + 0.142, z, 8);
  arm.rotation.z = Math.PI / 2;
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.028, 0.006, 8, 24), ink);
  ring.rotation.x = Math.PI / 2;
  ring.position.set(x, y + 0.136, z);
  g.add(ring);
  const lens = new THREE.Mesh(
    new THREE.CircleGeometry(0.022, 20),
    toon('#e8f3f8', { transparent: true, opacity: 0.78, side: THREE.DoubleSide, emissive: '#d7ebf5', emissiveIntensity: 0.3 }),
  );
  lens.rotation.x = -Math.PI / 2;
  lens.position.set(x, y + 0.137, z);
  lens.userData.noShadow = true;
  g.add(lens);
}

function handLoupe(g, x, y, z) {
  const cone = addCyl(g, 0.014, 0.028, 0.045, ink, x, y + 0.02, z, 14);
  cone.rotation.z = Math.PI / 2;
  cone.rotation.y = 0.4;
  cone.userData.noShadow = true;
}

function timingMachine(g, x, y, z) {
  addBox(g, 0.28, 0.1, 0.2, charcoal, x, y + 0.05, z);
  addBox(g, 0.22, 0.012, 0.14, slateDeep, x, y + 0.104, z - 0.01);
  const screenMap = canvasTex((ctx, w, h) => {
    ctx.fillStyle = '#102418';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#7dffb0';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(10, h * 0.55);
    for (let i = 0; i <= 24; i++) {
      const px = 10 + i * ((w - 20) / 24);
      const py = h * 0.55 + Math.sin(i * 0.85) * 28 + (i % 6 === 0 ? -18 : 0);
      ctx.lineTo(px, py);
    }
    ctx.stroke();
    ctx.fillStyle = '#d8ffe8';
    ctx.font = '700 42px Liberation Sans, sans-serif';
    ctx.fillText('+4 s/d', 18, 52);
    ctx.font = '600 28px Liberation Sans, sans-serif';
    ctx.fillText('2824', 18, h - 24);
  }, 256, 160);
  const screen = new THREE.Mesh(
    new THREE.PlaneGeometry(0.2, 0.09),
    toon('#ffffff', { map: screenMap, emissive: '#9dffc4', emissiveIntensity: 0.35 }),
  );
  screen.position.set(x, y + 0.112, z - 0.008);
  screen.rotation.x = -0.55;
  screen.userData.noShadow = true;
  g.add(screen);
}

function tweezers(g, x, y, z) {
  const a = addBox(g, 0.012, 0.004, 0.12, steel, x, y + 0.006, z);
  a.rotation.y = 0.15;
  a.userData.noShadow = true;
  const b = addBox(g, 0.012, 0.004, 0.12, steel, x + 0.012, y + 0.006, z);
  b.rotation.y = -0.12;
  b.userData.noShadow = true;
}

function dustBlower(g, x, y, z) {
  addCyl(g, 0.022, 0.018, 0.04, toon('#d8d2c8'), x, y + 0.02, z, 12);
  const nozzle = addCyl(g, 0.006, 0.004, 0.04, steelDark, x + 0.03, y + 0.03, z, 8);
  nozzle.rotation.z = Math.PI / 2;
  nozzle.userData.noShadow = true;
}

function wristwatch(g, x, y, z, strap) {
  const grp = new THREE.Group();
  const cushion = new THREE.Mesh(new THREE.SphereGeometry(0.09, 16, 10), charcoal);
  cushion.scale.set(1.2, 0.28, 0.85);
  grp.add(cushion);
  addBox(grp, 0.04, 0.014, 0.09, strap, -0.07, 0.035, 0);
  addBox(grp, 0.04, 0.014, 0.09, strap, 0.07, 0.035, 0);
  addCyl(grp, 0.042, 0.042, 0.014, steel, 0, 0.045, 0, 20);
  const face = new THREE.Mesh(new THREE.CircleGeometry(0.03, 18), toon('#ffffff', { map: clockDialMap() }));
  face.rotation.x = -Math.PI / 2;
  face.position.y = 0.054;
  face.userData.noShadow = true;
  grp.add(face);
  const crown = addCyl(grp, 0.008, 0.008, 0.014, brass, 0.05, 0.045, 0, 8);
  crown.rotation.z = Math.PI / 2;
  grp.position.set(x, y, z);
  g.add(grp);
}

function jobSlips(g, x, y, z) {
  const lines = ['7S26  crown', '2824  +4s', '6497  staff'];
  lines.forEach((text, i) => {
    const map = canvasTex((ctx, w, h) => {
      ctx.fillStyle = i === 1 ? '#f7f1dc' : '#efe6d2';
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#2a261e';
      ctx.font = '700 42px Liberation Sans, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(text, w / 2, h / 2);
    }, 256, 96);
    const slip = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 0.06), toon('#ffffff', { map }));
    slip.rotation.x = -Math.PI / 2;
    slip.position.set(x + i * 0.02, y + i * 0.004, z + i * 0.07);
    slip.rotation.z = -0.08 + i * 0.05;
    slip.userData.noShadow = true;
    g.add(slip);
  });
}

function signBoard(g, x, y, z) {
  const map = canvasTex((ctx, w, h) => {
    ctx.fillStyle = '#2c3844';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#c6a15e';
    ctx.lineWidth = 10;
    ctx.strokeRect(12, 12, w - 24, h - 24);
    ctx.fillStyle = '#f4efe4';
    ctx.font = '700 64px Liberation Sans, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('WATCH REPAIR', w / 2, h / 2 + 4);
  }, 512, 160);
  const grp = new THREE.Group();
  addBox(grp, 0.04, 0.36, 1.15, toon('#ffffff', { map }), 0, 0, 0);
  addBox(grp, 0.02, 0.4, 0.03, brassDark, 0.02, 0, -0.52);
  addBox(grp, 0.02, 0.4, 0.03, brassDark, 0.02, 0, 0.52);
  grp.position.set(x, y, z);
  g.add(grp);
}

function contact(g, x, z, rx, rz) {
  const m = new THREE.Mesh(
    new THREE.CircleGeometry(1, 20),
    toon('#1a1612', { transparent: true, opacity: 0.22, depthWrite: false, polygonOffset: true }),
  );
  m.rotation.x = -Math.PI / 2;
  m.scale.set(rx, rz, 1);
  m.position.set(x, 0.025, z);
  return flat(m), g.add(m);
}

function makeShell(layout) {
  const g = new THREE.Group();
  g.name = 'shell';
  const { width: W, depth: D, height: H } = layout.meta.room;
  const innerL = -W / 2 + 0.08;
  const innerB = -D / 2 + 0.08;

  const slab = addBox(g, W, 0.08, D, toon('#b89662'), 0, -0.04, 0);
  slab.userData.noShadow = true;
  slab.userData.receiveShadow = true;

  const plankColors = [toon('#d2b07a'), toon('#c4a06a'), toon('#dfc08a'), toon('#b99258')];
  const n = Math.ceil((W - 0.3) / 0.18);
  for (let i = 0; i < n; i++) {
    const x = -W / 2 + 0.2 + i * 0.18;
    const plank = addBox(g, 0.17, 0.012, D - 0.28, plankColors[i % plankColors.length], x, 0.006, 0);
    receiveOnly(plank);
  }
  const border = toon('#6e4c30');
  receiveOnly(addBox(g, W - 0.16, 0.016, 0.08, border, 0, 0.01, innerB + 0.02));
  receiveOnly(addBox(g, W - 0.16, 0.016, 0.08, border, 0, 0.01, D / 2 - 0.06));
  receiveOnly(addBox(g, 0.08, 0.016, D - 0.2, border, innerL + 0.02, 0.01, 0));

  const back = addBox(g, W, H, 0.12, plaster, 0, H / 2, -D / 2);
  flat(back);
  const left = addBox(g, 0.12, H, D, plaster, -W / 2, H / 2, 0);
  flat(left);

  const trimZ = innerB + 0.05;
  const trimX = innerL + 0.05;
  flat(addBox(g, W - 0.2, 1.05, 0.035, slate, 0, 0.54, trimZ));
  flat(addBox(g, 0.035, 1.05, D - 0.2, slate, trimX, 0.54, 0));
  addBox(g, W - 0.16, 0.055, 0.045, oak, 0, 1.08, trimZ + 0.012);
  addBox(g, 0.045, 0.055, D - 0.16, oak, trimX + 0.012, 1.08, 0);
  addBox(g, W - 0.2, 0.08, 0.05, walnutDark, 0, 0.05, trimZ);
  addBox(g, 0.05, 0.08, D - 0.2, walnutDark, trimX, 0.05, 0);
  addBox(g, W - 0.3, 0.03, 0.028, brassDark, 0, 2.68, trimZ);
  addBox(g, 0.028, 0.03, D - 0.3, brassDark, trimX, 2.68, 0);

  const fieldZ = trimZ + 0.02;
  flat(addBox(g, 3.15, 1.05, 0.02, toon('#e7dcc6'), -1.15, 2.02, fieldZ));
  addBox(g, 3.22, 0.035, 0.03, walnut, -1.15, 2.56, fieldZ);
  addBox(g, 3.22, 0.035, 0.03, walnut, -1.15, 1.48, fieldZ);
  addBox(g, 0.035, 1.12, 0.03, walnut, -2.76, 2.02, fieldZ);
  addBox(g, 0.035, 1.12, 0.03, walnut, 0.46, 2.02, fieldZ);

  const soffit = addBox(g, W * 0.9, 0.08, 3.5, plaster, -0.2, H - 0.06, -2.05);
  soffit.userData.noShadow = true;
  addBox(g, W * 0.72, 0.1, 0.12, walnutDark, -0.4, H - 0.18, -3.05);
  addBox(g, W * 0.55, 0.08, 0.1, walnutDark, -0.6, H - 0.16, -0.55);

  const ao = toon('#241c16', { transparent: true, opacity: 0.2, depthWrite: false });
  flat(addBox(g, W - 0.3, 0.08, 0.08, ao, 0, 0.04, innerB + 0.04));
  flat(addBox(g, 0.08, 0.08, D - 0.3, ao, innerL + 0.04, 0.04, 0));

  const mat = addBox(g, 0.7, 0.012, 0.7, baizeDeep, -1.2, 0.016, -2.46);
  receiveOnly(mat);
  return g;
}

function makeProcedural(layout) {
  const g = new THREE.Group();
  g.name = 'procedural';
  const bench = layout.meta.anchors.bench;
  const counter = layout.meta.anchors.counter;
  const cabinet = layout.meta.anchors.cabinet;
  const top = bench.top;

  const topMesh = new THREE.Mesh(benchTopGeo(bench.w, bench.d, bench.bite), maple);
  topMesh.geometry.computeBoundingBox();
  const bb = topMesh.geometry.boundingBox;
  topMesh.geometry.translate(
    bench.x - (bb.max.x + bb.min.x) / 2,
    top - bb.max.y,
    bench.z - (bb.max.z + bb.min.z) / 2,
  );
  g.add(topMesh);

  const frontZ = bench.z + bench.d / 2;
  addBox(g, bench.w, 0.045, 0.045, walnut, bench.x, top + 0.02, bench.z - bench.d / 2 + 0.03);
  addBox(g, 0.62, 0.008, 0.34, baize, bench.x - 0.08, top + 0.006, bench.z + 0.02);
  addBox(g, 0.16, 0.02, 0.08, toon('#d8c4a4'), bench.x - 0.34, top + 0.016, bench.z + 0.16);

  const legY = 0.46;
  for (const [lx, lz] of [[-1.05, -0.22], [1.05, -0.22], [-1.05, 0.18], [1.05, 0.18]]) {
    addBox(g, 0.07, 0.92, 0.07, walnut, bench.x + lx, legY, bench.z + lz);
  }
  addBox(g, 0.08, 0.55, bench.d - 0.12, walnutDark, bench.x - bench.w / 2 + 0.08, 0.55, bench.z);
  addBox(g, 0.08, 0.55, bench.d - 0.12, walnutDark, bench.x + bench.w / 2 - 0.08, 0.55, bench.z);

  for (const side of [-1, 1]) {
    for (let i = 0; i < 3; i++) {
      const z = bench.z - 0.16 + i * 0.16;
      const x = bench.x + side * 0.72;
      addBox(g, 0.42, 0.1, 0.14, oak, x, 0.72 - i * 0.16, z);
      addCyl(g, 0.012, 0.012, 0.02, brass, x, 0.72 - i * 0.16, z + 0.06, 8);
    }
  }

  movement(g, bench.x - 0.06, top, bench.z + 0.02);
  partsTray(g, bench.x - 0.55, top, bench.z + 0.1);
  screwdrivers(g, bench.x + 0.42, top, bench.z + 0.08);
  oilCups(g, bench.x - 0.72, top, bench.z - 0.12);
  loupeStand(g, bench.x - 0.02, top, bench.z + 0.02);
  handLoupe(g, bench.x - 0.28, top, bench.z + 0.2);
  tweezers(g, bench.x - 0.36, top, bench.z - 0.08);
  dustBlower(g, bench.x + 0.28, top, bench.z + 0.16);
  timingMachine(g, bench.x + 0.82, top, bench.z - 0.06);

  const cabX = cabinet.x;
  addBox(g, cabinet.depth, cabinet.h, cabinet.span, walnut, cabX, cabinet.h / 2, cabinet.z);
  addBox(g, 0.02, cabinet.h - 0.06, cabinet.span - 0.04, walnutDark, cabX + cabinet.depth / 2 - 0.01, cabinet.h / 2, cabinet.z);
  const cols = 6;
  const rows = 6;
  const dw = (cabinet.span - 0.1) / cols;
  const dh = (cabinet.h - 0.12) / rows;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const open = (r * 3 + c) % 17 === 0;
      const pull = open ? 0.045 : 0;
      const z = cabinet.z - cabinet.span / 2 + 0.06 + dw * (c + 0.5);
      const y = 0.08 + dh * (r + 0.5);
      const faceX = cabX + cabinet.depth / 2 + pull;
      if (open) addBox(g, 0.05, dh - 0.012, dw - 0.012, ink, cabX + cabinet.depth / 2 - 0.01, y, z);
      addBox(g, 0.02, dh - 0.014, dw - 0.012, oak, faceX, y, z);
      addCyl(g, 0.008, 0.008, 0.016, brass, faceX + 0.012, y, z, 8);
      const label = new THREE.Mesh(new THREE.PlaneGeometry(dw * 0.78, dh * 0.36), drawerLabel(LABEL[(r * cols + c) % LABEL.length]));
      label.position.set(faceX + 0.014, y, z);
      label.rotation.y = Math.PI / 2;
      label.userData.noShadow = true;
      g.add(label);
    }
  }

  const clocks = [
    [-2.25, 2.12, 0.2, 10, 10],
    [-1.7, 1.82, 0.15, 2, 42],
    [-1.05, 2.22, 0.26, 7, 15],
    [-0.4, 1.9, 0.14, 4, 55],
  ];
  const wallZ = -layout.meta.room.depth / 2 + 0.12;
  for (const [x, y, radius, hh, mm] of clocks) roundClock(g, x, y, wallZ, radius, hh, mm);
  regulator(g, 1.15, wallZ + 0.02);
  longcase(g, layout.meta.anchors.longcase.x, layout.meta.anchors.longcase.z);
  mantelClock(g, layout.meta.anchors.pedestal.x, 0.74, layout.meta.anchors.pedestal.z);

  const ct = counter.top;
  addBox(g, counter.w, ct - 0.04, counter.d, oak, counter.x, (ct - 0.04) / 2, counter.z);
  addBox(g, counter.w + 0.04, 0.045, counter.d + 0.04, walnut, counter.x, ct - 0.02, counter.z);
  const pane = addBox(g, counter.w - 0.28, 0.012, counter.d - 0.16, glassMat, counter.x - 0.05, ct + 0.004, counter.z);
  pane.userData.noShadow = true;
  addBox(g, counter.w - 0.16, 0.012, 0.025, brass, counter.x, ct + 0.01, counter.z + counter.d / 2 - 0.03);
  for (let i = 0; i < 3; i++) {
    const dx = counter.x - 0.55 + i * 0.38;
    addBox(g, 0.28, 0.1, 0.5, oak, dx, 0.42, counter.z);
    addCyl(g, 0.012, 0.012, 0.02, brass, dx, 0.42, counter.z + 0.22, 8);
  }
  wristwatch(g, counter.x - 0.55, ct + 0.05, counter.z - 0.02, strapBrown);
  wristwatch(g, counter.x - 0.12, ct + 0.05, counter.z + 0.04, strapBlack);
  wristwatch(g, counter.x + 0.28, ct + 0.05, counter.z - 0.04, strapBrown);
  jobSlips(g, counter.x + 0.62, ct + 0.012, counter.z - 0.08);
  handLoupe(g, counter.x + 0.55, ct, counter.z + 0.12);
  addCyl(g, 0.04, 0.045, 0.03, brass, counter.x - 0.9, ct + 0.02, counter.z + 0.12, 16);
  addCyl(g, 0.012, 0.012, 0.02, brassDark, counter.x - 0.9, ct + 0.04, counter.z + 0.12, 8);

  signBoard(g, -4.7, 2.18, -1.7);
  addCyl(g, 0.007, 0.007, 0.42, ink, -1.2, 2.9, -2.95, 6);

  contact(g, bench.x, -2.46, 0.28, 0.28);
  contact(g, -1.15, 0.58, 0.22, 0.22);
  contact(g, 0.05, 0.58, 0.22, 0.22);
  contact(g, 2.55, 0.75, 0.85, 0.28);
  contact(g, 3.9, 1.45, 0.34, 0.34);
  contact(g, layout.meta.anchors.longcase.x, layout.meta.anchors.longcase.z, 0.28, 0.2);
  contact(g, layout.meta.anchors.pedestal.x, layout.meta.anchors.pedestal.z, 0.36, 0.36);
  contact(g, cabinet.x + 0.1, cabinet.z, 0.28, 0.7);
  return g;
}

const ticketMap = canvasTex((ctx, w, h) => {
  ctx.fillStyle = '#243028';
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#f3ecdc';
  ctx.font = '700 48px Liberation Sans, sans-serif';
    ctx.fillText('BENCH JOBS', 48, 64);
  ctx.font = '600 36px Liberation Sans, sans-serif';
  const rows = ['7S26   crown', '2824   +4 s/d', '6497   staff', 'pocket  staff', '6200   ready'];
  rows.forEach((row, i) => ctx.fillText(row, 36, 130 + i * 52));
}, 512, 420);

function decoratePrototype(kind, prepared) {
  if (kind === 'flowerpot') {
    const leaf = toon('#3e6b46');
    const a = new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 8), leaf);
    a.position.set(0, 0.36, 0);
    const b = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), toon('#2f5538'));
    b.position.set(0.06, 0.46, -0.02);
    prepared.add(a, b);
  }
  if (kind === 'book_stand') {
    const book = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.035, 0.24), paper);
    book.position.set(0, 1.0, 0.04);
    book.rotation.x = -0.42;
    const title = canvasTex((ctx, w, h) => {
      ctx.fillStyle = '#f4efe4';
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#2a241c';
      ctx.font = '700 42px Liberation Sans, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('CALIBRES', w / 2, h / 2);
    }, 256, 128);
    const page = new THREE.Mesh(new THREE.PlaneGeometry(0.28, 0.16), toon('#ffffff', { map: title }));
    page.position.set(0, 1.02, 0.05);
    page.rotation.x = -0.42;
    page.userData.noShadow = true;
    prepared.add(book, page);
  }
  if (kind === 'chalkboard') {
    const board = new THREE.Mesh(new THREE.PlaneGeometry(0.92, 0.7), toon('#ffffff', { map: ticketMap }));
    board.position.set(0.28, 0.76, 0);
    board.rotation.y = Math.PI / 2;
    board.userData.noShadow = true;
    prepared.add(board);
  }
}

boot({
  makeShell,
  makeProcedural,
  decoratePrototype,
  readyText: 'ready — watch repair · drag orbit · U unlit · T toon',
});
