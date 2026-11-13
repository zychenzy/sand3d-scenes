import * as THREE from 'three';
import { boot, toon, addBox, addCyl } from './scene_lib.js';

const LABEL = ['BAL', 'H/S', 'ESC', 'P/W', 'SCR', 'SPR', 'STM', 'CAN', 'CRN', 'BRG', 'CLK', 'HND', 'MS', 'CAP', 'RCH', 'GS'];

function lcg(seed) {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(1664525, s) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function canvasTex(draw, w, h, crisp) {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  draw(canvas.getContext('2d'), w, h);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  if (crisp) {
    tex.wrapS = THREE.ClampToEdgeWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    tex.minFilter = THREE.LinearFilter;
    tex.magFilter = THREE.LinearFilter;
    tex.generateMipmaps = false;
  } else {
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
  }
  return tex;
}

/** Fine longitudinal grain. Strokes stay a few pixels wide so the repeat reads as timber, not stripes. */
function grain(base, line, seed) {
  const rnd = lcg(seed);
  return canvasTex((g, w, h) => {
    g.fillStyle = base;
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 140; i++) {
      const y = (i + 0.5) * (h / 140);
      g.strokeStyle = line;
      g.globalAlpha = 0.15 + rnd() * 0.35;
      g.lineWidth = rnd() < 0.12 ? 2 : 1;
      g.beginPath();
      g.moveTo(0, y);
      for (let x = 0; x <= w; x += 28) g.lineTo(x, y + (rnd() - 0.5) * 2.4);
      g.stroke();
    }
    for (let i = 0; i < 700; i++) {
      g.fillStyle = line;
      g.globalAlpha = 0.1 + rnd() * 0.2;
      g.fillRect(rnd() * w, rnd() * h, 1 + rnd(), 1);
    }
    g.globalAlpha = 1;
  }, 512, 512);
}

const mapleMap = grain('#f0e0c4', '#b08958', 3);
const oakMap = grain('#c4894e', '#6e4524', 5);
const walnutMap = grain('#6a4330', '#2e1c12', 9);
mapleMap.repeat.set(5, 3);
oakMap.repeat.set(4, 2.4);
walnutMap.repeat.set(4, 2.4);

const plasterMap = canvasTex((g, w, h) => {
  const rnd = lcg(21);
  g.fillStyle = '#f3eee6';
  g.fillRect(0, 0, w, h);
  for (let i = 0; i < 2800; i++) {
    const shade = rnd();
    g.fillStyle = shade > 0.55 ? 'rgba(255,252,247,0.45)' : 'rgba(110,92,74,0.07)';
    g.fillRect(rnd() * w, rnd() * h, 1, 1);
  }
}, 256, 256);
plasterMap.repeat.set(10, 6);

function floorTex() {
  const tex = canvasTex((g, w, h) => {
    const n = 8;
    const pw = w / n;
    const bases = ['#c9a56c', '#d7b483', '#c09a62', '#e0c094', '#c6a272', '#d2ae78', '#b8925c', '#dcc09a'];
    for (let i = 0; i < n; i++) {
      const rnd = lcg(40 + i * 13);
      g.fillStyle = bases[i];
      g.fillRect(i * pw, 0, pw, h);
      for (let k = 0; k < 28; k++) {
        const x = i * pw + 4 + rnd() * (pw - 8);
        g.strokeStyle = 'rgba(92,58,28,0.45)';
        g.globalAlpha = 0.2 + rnd() * 0.35;
        g.lineWidth = 1;
        g.beginPath();
        g.moveTo(x, 0);
        for (let y = 0; y <= h; y += 36) g.lineTo(x + (rnd() - 0.5) * 2, y);
        g.stroke();
      }
      g.globalAlpha = 0.7;
      g.fillStyle = '#5c3e28';
      g.fillRect((i + 1) * pw - 1.5, 0, 2, h);
    }
    g.globalAlpha = 1;
  }, 1024, 1024);
  return tex;
}
const floorMap = floorTex();

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

const dialCache = new Map();
function clockDialMap(hours, minutes) {
  const key = `${hours}:${minutes}`;
  if (dialCache.has(key)) return dialCache.get(key);
  const map = canvasTex((g, w, h) => {
    const cx = w / 2;
    const cy = h / 2;
    const r = w * 0.46;
    g.fillStyle = '#f6f1e6';
    g.beginPath();
    g.arc(cx, cy, r, 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = '#1c1916';
    g.lineWidth = 14;
    g.beginPath();
    g.arc(cx, cy, r * 0.9, 0, Math.PI * 2);
    g.stroke();
    g.fillStyle = '#1c1916';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.font = '700 84px Liberation Sans, sans-serif';
    for (let n = 1; n <= 12; n++) {
      const a = (n / 12) * Math.PI * 2 - Math.PI / 2;
      g.fillText(String(n), cx + Math.cos(a) * r * 0.66, cy + Math.sin(a) * r * 0.66 + 3);
    }
    for (let i = 0; i < 60; i++) {
      const a = (i / 60) * Math.PI * 2 - Math.PI / 2;
      const major = i % 5 === 0;
      g.strokeStyle = '#1c1916';
      g.lineWidth = major ? 8 : 3;
      const inner = major ? r * 0.76 : r * 0.83;
      g.beginPath();
      g.moveTo(cx + Math.cos(a) * inner, cy + Math.sin(a) * inner);
      g.lineTo(cx + Math.cos(a) * r * 0.88, cy + Math.sin(a) * r * 0.88);
      g.stroke();
    }
    const minuteAngle = (minutes / 60) * Math.PI * 2;
    const hourAngle = ((hours % 12) / 12) * Math.PI * 2 + minuteAngle / 12;
    const paintHand = (angle, len, width) => {
      g.save();
      g.translate(cx, cy);
      g.rotate(angle);
      g.fillStyle = '#141414';
      g.fillRect(-width / 2, 8, width, -len);
      g.restore();
    };
    paintHand(hourAngle, r * 0.46, 18);
    paintHand(minuteAngle, r * 0.7, 11);
    g.fillStyle = '#b8904a';
    g.beginPath();
    g.arc(cx, cy, 14, 0, Math.PI * 2);
    g.fill();
  }, 512, 512, true);
  dialCache.set(key, map);
  return map;
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

function dialFace(parent, radius, z, hours, minutes) {
  const face = new THREE.Mesh(
    new THREE.CircleGeometry(radius, 48),
    toon('#ffffff', { map: clockDialMap(hours, minutes) }),
  );
  face.position.z = z;
  flat(face);
  parent.add(face);
  return face;
}

function roundClock(g, x, y, z, radius, hours, minutes) {
  const grp = new THREE.Group();
  const back = new THREE.Mesh(new THREE.CircleGeometry(radius, 36), walnut);
  back.position.z = -0.015;
  grp.add(back);
  const bezel = new THREE.Mesh(new THREE.TorusGeometry(radius * 0.97, Math.max(0.012, radius * 0.055), 8, 40), brass);
  bezel.position.z = 0.008;
  grp.add(bezel);
  dialFace(grp, radius * 0.88, 0.016, hours, minutes);
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
  addCyl(grp, 0.021, 0.021, 0.004, brass, 0, 0.003, 0, 24);
  addCyl(grp, 0.011, 0.011, 0.003, brassDark, -0.005, 0.006, 0.002, 16);
  addCyl(grp, 0.007, 0.007, 0.003, steel, 0.008, 0.006, -0.004, 14);
  const balance = new THREE.Mesh(new THREE.TorusGeometry(0.006, 0.001, 6, 16), steel);
  balance.rotation.x = Math.PI / 2;
  balance.position.set(0.007, 0.008, 0.004);
  flat(balance);
  grp.add(balance);
  const bridge = addBox(grp, 0.016, 0.002, 0.005, steelDark, -0.002, 0.007, -0.004);
  flat(bridge);
  const stem = addCyl(grp, 0.0022, 0.0022, 0.012, steel, 0.026, 0.004, 0, 8);
  stem.rotation.z = Math.PI / 2;
  grp.position.set(x, y, z);
  g.add(grp);
}

function partsTray(g, x, y, z) {
  const grp = new THREE.Group();
  addBox(grp, 0.16, 0.01, 0.1, walnutDark, 0, 0.005, 0);
  for (let r = 0; r < 2; r++) {
    for (let c = 0; c < 4; c++) {
      const px = -0.06 + c * 0.04;
      const pz = -0.025 + r * 0.05;
      addBox(grp, 0.034, 0.006, 0.04, paper, px, 0.012, pz);
      if ((c + r) % 2 === 0) {
        for (let k = 0; k < 3; k++) {
          const screw = addCyl(grp, 0.0016, 0.0016, 0.002, k === 1 ? brass : steelDark, px - 0.006 + k * 0.006, 0.016, pz, 6);
          flat(screw);
        }
      }
    }
  }
  grp.position.set(x, y, z);
  g.add(grp);
}

function screwdrivers(g, x, y, z) {
  addBox(g, 0.07, 0.018, 0.04, walnut, x, y + 0.01, z);
  const handles = ['#8d2e2e', '#1f3d6e', '#1c1c1c', '#8d2e2e', '#1f3d6e'];
  handles.forEach((color, i) => {
    const h = addCyl(g, 0.004, 0.0045, 0.055, toon(color), x - 0.024 + i * 0.012, y + 0.04, z, 8);
    h.rotation.z = -0.4;
    const blade = addCyl(g, 0.0012, 0.0012, 0.028, steel, x - 0.016 + i * 0.012, y + 0.07, z - 0.006, 6);
    blade.rotation.z = -0.4;
    flat(blade);
  });
}

function oilCups(g, x, y, z) {
  for (let i = 0; i < 3; i++) {
    addCyl(g, 0.007, 0.008, 0.008, brass, x + i * 0.02, y + 0.004, z, 10);
    const oil = addCyl(g, 0.0045, 0.0045, 0.002, toon(i === 1 ? '#d6e07a' : '#e7e2c8'), x + i * 0.02, y + 0.008, z, 8);
    flat(oil);
  }
}

function loupeStand(g, x, y, z) {
  const baseX = x + 0.09;
  addCyl(g, 0.012, 0.014, 0.006, brassDark, baseX, y + 0.003, z, 12);
  addCyl(g, 0.0025, 0.0025, 0.07, brass, baseX, y + 0.04, z, 8);
  const arm = addCyl(g, 0.0032, 0.0032, 0.09, brass, x + 0.045, y + 0.076, z, 8);
  arm.rotation.z = Math.PI / 2;
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.011, 0.0022, 8, 20), ink);
  ring.rotation.x = Math.PI / 2;
  ring.position.set(x, y + 0.074, z);
  g.add(ring);
  const lens = new THREE.Mesh(
    new THREE.CircleGeometry(0.009, 18),
    toon('#e8f3f8', { transparent: true, opacity: 0.78, side: THREE.DoubleSide, emissive: '#d7ebf5', emissiveIntensity: 0.3 }),
  );
  lens.rotation.x = -Math.PI / 2;
  lens.position.set(x, y + 0.075, z);
  flat(lens);
  g.add(lens);
}

function handLoupe(g, x, y, z) {
  const cone = addCyl(g, 0.006, 0.012, 0.028, ink, x, y + 0.008, z, 12);
  cone.rotation.z = Math.PI / 2;
  cone.rotation.y = 0.5;
  flat(cone);
}

function timingMachine(g, x, y, z) {
  addBox(g, 0.18, 0.07, 0.12, charcoal, x, y + 0.035, z);
  const screenMap = canvasTex((ctx, w, h) => {
    ctx.fillStyle = '#102418';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#7dffb0';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(12, h * 0.62);
    for (let i = 0; i <= 20; i++) {
      const px = 12 + i * ((w - 24) / 20);
      const py = h * 0.62 + Math.sin(i * 0.9) * 22;
      ctx.lineTo(px, py);
    }
    ctx.stroke();
    ctx.fillStyle = '#d8ffe8';
    ctx.font = '700 48px Liberation Sans, sans-serif';
    ctx.fillText('+4 s/d', 16, 48);
    ctx.font = '600 32px Liberation Sans, sans-serif';
    ctx.fillText('2824', 16, h - 18);
  }, 256, 160, true);
  const screen = new THREE.Mesh(
    new THREE.PlaneGeometry(0.14, 0.06),
    toon('#ffffff', { map: screenMap, emissive: '#9dffc4', emissiveIntensity: 0.35 }),
  );
  screen.position.set(x, y + 0.078, z + 0.01);
  screen.rotation.x = -1.05;
  flat(screen);
  g.add(screen);
}

function tweezers(g, x, y, z) {
  const a = addBox(g, 0.006, 0.002, 0.09, steel, x, y + 0.003, z);
  a.rotation.y = 0.12;
  flat(a);
  const b = addBox(g, 0.006, 0.002, 0.09, steel, x + 0.008, y + 0.003, z);
  b.rotation.y = -0.1;
  flat(b);
}

function pegwood(g, x, y, z) {
  for (let i = 0; i < 4; i++) {
    const stick = addCyl(g, 0.0015, 0.002, 0.07, toon('#e6d2a4'), x + i * 0.008, y + 0.004, z, 6);
    stick.rotation.z = Math.PI / 2;
    stick.rotation.y = -0.4 + i * 0.15;
    flat(stick);
  }
}

function dustBlower(g, x, y, z) {
  addCyl(g, 0.012, 0.01, 0.022, toon('#d8d2c8'), x, y + 0.011, z, 12);
  const nozzle = addCyl(g, 0.003, 0.002, 0.02, steelDark, x + 0.016, y + 0.016, z, 8);
  nozzle.rotation.z = Math.PI / 2;
  flat(nozzle);
}

function serviceTag(g, x, y, z, text, rot) {
  const map = canvasTex((ctx, w, h) => {
    ctx.fillStyle = '#f3ead2';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#8d7044';
    ctx.lineWidth = 10;
    ctx.strokeRect(8, 8, w - 16, h - 16);
    ctx.fillStyle = '#1c1814';
    ctx.font = '700 72px Liberation Sans, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, w / 2, h / 2);
  }, 256, 128, true);
  const tag = new THREE.Mesh(new THREE.PlaneGeometry(0.048, 0.026), toon('#ffffff', { map }));
  tag.rotation.x = -Math.PI / 2;
  tag.rotation.z = rot || 0;
  tag.position.set(x, y, z);
  flat(tag);
  g.add(tag);
}

function wristwatch(g, x, y, z, strap, hours, minutes) {
  const grp = new THREE.Group();
  addBox(grp, 0.016, 0.004, 0.04, strap, -0.026, 0.006, 0);
  addBox(grp, 0.016, 0.004, 0.04, strap, 0.026, 0.006, 0);
  addCyl(grp, 0.018, 0.018, 0.007, steel, 0, 0.009, 0, 20);
  const face = new THREE.Mesh(
    new THREE.CircleGeometry(0.013, 18),
    toon('#ffffff', { map: clockDialMap(hours, minutes) }),
  );
  face.rotation.x = -Math.PI / 2;
  face.position.y = 0.0135;
  flat(face);
  grp.add(face);
  const crown = addCyl(grp, 0.003, 0.003, 0.005, brass, 0.021, 0.009, 0, 8);
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
    const slip = new THREE.Mesh(new THREE.PlaneGeometry(0.09, 0.032), toon('#ffffff', { map }));
    slip.rotation.x = -Math.PI / 2;
    slip.position.set(x + i * 0.02, y + i * 0.004, z + i * 0.07);
    slip.rotation.z = -0.08 + i * 0.05;
    slip.userData.noShadow = true;
    g.add(slip);
  });
}

function signBoard(g, x, y, z) {
  const map = canvasTex((ctx, w, h) => {
    ctx.fillStyle = '#24303a';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#c6a15e';
    ctx.lineWidth = 22;
    ctx.strokeRect(18, 18, w - 36, h - 36);
    ctx.fillStyle = '#f6f1e6';
    ctx.font = '700 108px Liberation Sans, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('WATCH REPAIR', w / 2, h / 2 + 4);
  }, 1280, 280, true);
  addBox(g, 2.05, 0.4, 0.03, walnutDark, x, y, z - 0.02);
  const face = new THREE.Mesh(new THREE.PlaneGeometry(1.92, 0.34), toon('#ffffff', { map }));
  face.position.set(x, y, z);
  flat(face);
  g.add(face);
}

/** Wooden bench stool. Seat sits ~28 cm under a 1.02 m top so the forearms land on the baize. */
function makerStool(g, x, z, seatH) {
  const grp = new THREE.Group();
  addCyl(grp, 0.155, 0.15, 0.04, walnut, 0, seatH, 0, 24);
  addCyl(grp, 0.045, 0.055, 0.035, walnutDark, 0, seatH - 0.035, 0, 16);
  const legH = seatH - 0.05;
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    addCyl(grp, 0.016, 0.02, legH, walnut, Math.cos(a) * 0.085, legH / 2, Math.sin(a) * 0.085, 8);
  }
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.007, 8, 28), brassDark);
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.24;
  grp.add(ring);
  grp.position.set(x, 0, z);
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

  floorMap.repeat.set(W - 0.28, D - 0.28);
  const boards = new THREE.Mesh(new THREE.PlaneGeometry(W - 0.28, D - 0.28), toon('#ffffff', { map: floorMap }));
  boards.rotation.x = -Math.PI / 2;
  boards.position.y = 0.008;
  receiveOnly(boards);
  g.add(boards);
  const border = toon('#6e4c30');
  receiveOnly(addBox(g, W - 0.16, 0.016, 0.08, border, 0, 0.01, innerB + 0.02));
  receiveOnly(addBox(g, W - 0.16, 0.016, 0.08, border, 0, 0.01, D / 2 - 0.06));
  receiveOnly(addBox(g, 0.08, 0.016, D - 0.2, border, innerL + 0.02, 0.01, 0));

  const back = addBox(g, W, H, 0.12, plaster, 0, H / 2, -D / 2);
  receiveOnly(back);
  const left = addBox(g, 0.12, H, D, plaster, -W / 2, H / 2, 0);
  receiveOnly(left);

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
  const fieldX = -1.05;
  const fieldY = 2.08;
  flat(addBox(g, 2.4, 0.7, 0.02, toon('#e7dcc6'), fieldX, fieldY, fieldZ));
  addBox(g, 2.48, 0.035, 0.03, walnut, fieldX, fieldY + 0.365, fieldZ);
  addBox(g, 2.48, 0.035, 0.03, walnut, fieldX, fieldY - 0.365, fieldZ);
  addBox(g, 0.035, 0.77, 0.03, walnut, fieldX - 1.22, fieldY, fieldZ);
  addBox(g, 0.035, 0.77, 0.03, walnut, fieldX + 1.22, fieldY, fieldZ);

  const soffit = addBox(g, W * 0.9, 0.08, 3.5, plaster, -0.2, H - 0.06, -2.05);
  flat(soffit);
  const beamA = addBox(g, W * 0.72, 0.1, 0.12, walnutDark, -0.4, H - 0.18, -3.05);
  flat(beamA);
  const beamB = addBox(g, W * 0.55, 0.08, 0.1, walnutDark, -0.6, H - 0.16, -0.55);
  flat(beamB);

  const ao = toon('#241c16', { transparent: true, opacity: 0.2, depthWrite: false });
  flat(addBox(g, W - 0.3, 0.08, 0.08, ao, 0, 0.04, innerB + 0.04));
  flat(addBox(g, 0.08, 0.08, D - 0.3, ao, innerL + 0.04, 0.04, 0));

  const mat = addBox(g, 0.55, 0.008, 0.55, baizeDeep, -1.2, 0.012, -2.52);
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
  const cx = bench.x - 0.02;
  const cz = bench.z + 0.02;
  addBox(g, 0.52, 0.008, 0.32, baize, cx, top + 0.006, cz);
  addBox(g, 0.16, 0.02, 0.08, toon('#d8c4a4'), bench.x - 0.72, top + 0.016, bench.z - 0.18);

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

  const stool = layout.meta.anchors.stool;
  makerStool(g, stool.x, stool.z, stool.seat);

  const cloth = top + 0.014;
  movement(g, cx - 0.02, cloth, cz - 0.02);
  loupeStand(g, cx - 0.02, cloth, cz - 0.02);
  partsTray(g, cx - 0.16, cloth, cz - 0.05);
  partsTray(g, cx + 0.15, cloth, cz - 0.06);
  screwdrivers(g, cx + 0.14, cloth, cz + 0.07);
  oilCups(g, cx - 0.15, cloth, cz + 0.08);
  handLoupe(g, cx - 0.04, cloth, cz + 0.09);
  tweezers(g, cx + 0.04, cloth, cz + 0.09);
  pegwood(g, cx + 0.06, cloth, cz - 0.1);
  dustBlower(g, cx - 0.08, cloth, cz + 0.09);
  timingMachine(g, bench.x + 0.82, top, bench.z - 0.08);
  serviceTag(g, cx - 0.05, cloth + 0.002, cz + 0.02, '2824', -0.2);
  serviceTag(g, cx + 0.05, cloth + 0.002, cz + 0.04, '7S26', 0.15);
  serviceTag(g, cx + 0.01, cloth + 0.002, cz - 0.09, '6497', 0.1);
  for (let i = 0; i < 4; i++) {
    addCyl(g, 0.016, 0.016, 0.018, i % 2 ? steelDark : brassDark, bench.x - 0.72 + i * 0.045, top + 0.01, bench.z - 0.22, 12);
  }
  addBox(g, 0.02, 0.02, 0.62, walnut, -4.62, 1.78, -2.9);
  for (let i = 0; i < 5; i++) {
    const strap = addBox(g, 0.01, 0.14, 0.028, i % 2 ? strapBrown : strapBlack, -4.6, 1.68, -3.14 + i * 0.12);
    flat(strap);
  }

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
    [-2.02, 2.08, 0.13, 10, 10],
    [-1.58, 2.08, 0.11, 4, 20],
    [-1.08, 2.06, 0.22, 7, 35],
    [-0.55, 2.08, 0.11, 2, 50],
    [-0.12, 2.08, 0.13, 8, 15],
  ];
  const wallZ = -layout.meta.room.depth / 2 + 0.24;
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
  const pad = addBox(g, 0.52, 0.008, 0.1, charcoal, counter.x - 0.22, ct + 0.008, counter.z - 0.02);
  flat(pad);
  const stock = [
    [-0.42, strapBrown, 10, 8],
    [-0.32, strapBlack, 2, 40],
    [-0.22, strapBrown, 7, 15],
    [-0.12, strapBlack, 4, 55],
    [-0.02, strapBrown, 11, 5],
  ];
  for (const [dx, strap, hh, mm] of stock) {
    wristwatch(g, counter.x + dx, ct + 0.012, counter.z - 0.02, strap, hh, mm);
  }
  jobSlips(g, counter.x + 0.48, ct + 0.01, counter.z - 0.06);
  handLoupe(g, counter.x + 0.42, ct, counter.z + 0.1);
  addCyl(g, 0.022, 0.026, 0.016, brass, counter.x - 0.85, ct + 0.012, counter.z + 0.1, 16);
  addCyl(g, 0.006, 0.006, 0.012, brassDark, counter.x - 0.85, ct + 0.024, counter.z + 0.1, 8);

  signBoard(g, -1.15, 1.3, -layout.meta.room.depth / 2 + 0.26);
  addCyl(g, 0.007, 0.007, 0.42, ink, 0.35, 2.9, -2.9, 6);

  contact(g, bench.x, -2.52, 0.22, 0.22);
  contact(g, -1.15, 0.58, 0.22, 0.22);
  contact(g, 0.05, 0.58, 0.22, 0.22);
  contact(g, 1.72, -0.35, 0.85, 0.28);
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
