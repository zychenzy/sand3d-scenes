import * as THREE from 'three';
import { boot, toon, addBox, addCyl } from './scene_lib.js';

const IRON = '#2c3136';
const IRON_LT = '#4a525a';
const OAK = '#7a4e2c';
const MAPLE = '#e6cba4';
const WALNUT = '#5a3828';
const STEEL = '#8e989e';
const STEEL_DK = '#5c666e';
const PAPER = '#f4efe4';
const PAPER_DK = '#e4d8c4';
const FELT = '#6e675e';
const FELT_LT = '#d9cbb4';
const COPPER = '#c47a45';
const TEAL = '#2f6f6a';
const TEAL_DK = '#1d4548';

let built = null;

function hash01(n) {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

function canvasTex(draw, w = 512, h = 512) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d'), w, h);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function woodTex(light, dark, alongX) {
  return canvasTex((g, w, h) => {
    g.fillStyle = light;
    g.fillRect(0, 0, w, h);
    g.strokeStyle = dark;
    for (let i = 0; i < 42; i++) {
      const t = hash01(i + 3);
      g.globalAlpha = 0.18 + t * 0.45;
      g.lineWidth = 1 + (i % 3);
      g.beginPath();
      if (alongX) {
        const y = (i + 0.5) * (h / 42);
        g.moveTo(0, y);
        g.bezierCurveTo(w * 0.3, y + 6 * Math.sin(i), w * 0.7, y - 4, w, y + 2);
      } else {
        const x = (i + 0.5) * (w / 42);
        g.moveTo(x, 0);
        g.lineTo(x + 3 * Math.sin(i), h);
      }
      g.stroke();
    }
    g.globalAlpha = 1;
  });
}

function inkGlassTex() {
  return canvasTex((g, w, h) => {
    g.fillStyle = '#1a1e1c';
    g.fillRect(0, 0, w, h);
    g.fillStyle = '#101412';
    g.beginPath();
    g.ellipse(280, 240, 150, 90, -0.4, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#2a2620';
    g.beginPath();
    g.ellipse(200, 280, 70, 28, 0.6, 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = '#c47a45';
    g.globalAlpha = 0.55;
    g.lineWidth = 3;
    g.beginPath();
    g.moveTo(150, 200);
    g.bezierCurveTo(220, 160, 300, 250, 360, 190);
    g.stroke();
    g.globalAlpha = 0.35;
    g.strokeStyle = '#8a93a0';
    g.strokeRect(18, 18, w - 36, h - 36);
    g.globalAlpha = 1;
  });
}

function copperTex() {
  return canvasTex((g, w, h) => {
    g.fillStyle = '#c47a45';
    g.fillRect(0, 0, w, h);
    g.fillStyle = '#a8643a';
    for (let i = 0; i < 30; i++) {
      g.fillRect(hash01(i) * w, hash01(i + 2) * h, 40, 2);
    }
    g.strokeStyle = '#2a1c14';
    g.lineWidth = 2;
    g.strokeRect(36, 42, w - 72, h - 84);
    for (let i = 0; i < 16; i++) {
      g.beginPath();
      const y = 70 + i * 18;
      g.moveTo(60, y);
      g.bezierCurveTo(140, y - 16, 240, y + 12, w - 60, y - 4);
      g.stroke();
    }
      g.lineWidth = 2;
      for (let i = 0; i < 22; i++) {
      g.beginPath();
      g.moveTo(80 + i * 8, 200);
      g.lineTo(110 + i * 8, h - 70);
      g.stroke();
    }
  }, 512, 384);
}

function printTex(seed) {
  return canvasTex((g, w, h) => {
    g.fillStyle = seed % 2 ? '#f7f3ea' : '#f3ecdf';
    g.fillRect(0, 0, w, h);
    g.strokeStyle = '#c8bfae';
    g.lineWidth = 6;
    g.strokeRect(28, 34, w - 56, h - 68);
    g.strokeStyle = '#141414';
    g.lineWidth = 4;
    g.lineCap = 'round';
    const shift = (seed % 5) * 8;
    if (seed % 3 === 0) {
      g.beginPath();
      g.moveTo(70, h - 90);
      g.lineTo(w / 2, 80 + shift);
      g.lineTo(w - 70, h - 90);
      g.stroke();
      for (let i = 0; i < 14; i++) {
        g.beginPath();
        g.moveTo(90 + i * 12, h - 100);
        g.lineTo(w / 2 - 40 + i * 4, 140 + i);
        g.stroke();
      }
    } else if (seed % 3 === 1) {
      g.beginPath();
      g.arc(w * 0.42, h * 0.42, 70, 0.4, Math.PI * 1.7);
      g.stroke();
      g.beginPath();
      g.moveTo(w * 0.62, h * 0.38);
      g.quadraticCurveTo(w * 0.78, h * 0.2, w * 0.7, h * 0.55);
      g.stroke();
      for (let i = 0; i < 12; i++) {
        g.beginPath();
        g.moveTo(60, 80 + i * 16);
        g.lineTo(150, 70 + i * 16);
        g.stroke();
      }
    } else {
      for (let i = 0; i < 5; i++) {
        g.strokeRect(70 + i * 28, 80 + (i % 2) * 20, 70, 120 - i * 8);
      }
      g.beginPath();
      g.moveTo(60, h - 80);
      g.bezierCurveTo(140, h - 140, 240, h - 40, w - 60, h - 100);
      g.stroke();
    }
  }, 384, 512);
}

function labelTex(title, sub, bg, fg) {
  return canvasTex((g, w, h) => {
    g.fillStyle = bg;
    g.fillRect(0, 0, w, h);
    g.strokeStyle = fg;
    g.lineWidth = 16;
    g.strokeRect(12, 12, w - 24, h - 24);
    g.fillStyle = fg;
    g.font = '700 64px sans-serif';
    g.textAlign = 'left';
    g.textBaseline = 'alphabetic';
    g.fillText(title, 40, 110);
    g.font = '500 36px sans-serif';
    sub.forEach((line, i) => g.fillText(line, 40, 180 + i * 52));
  }, 512, 320);
}

function mats() {
  if (built) return built;
  const oakMap = woodTex('#c4894e', '#5a3418', true);
  const mapleMap = woodTex('#f2d8b4', '#b88858', true);
  const walnutMap = woodTex('#7a5344', '#3a241c', true);
  built = {
    iron: toon(IRON),
    ironLt: toon(IRON_LT),
    oak: toon(OAK, { map: oakMap }),
    maple: toon(MAPLE, { map: mapleMap }),
    walnut: toon(WALNUT, { map: walnutMap }),
    steel: toon(STEEL),
    steelDk: toon(STEEL_DK),
    paper: toon(PAPER),
    paperDk: toon(PAPER_DK),
    felt: toon(FELT),
    feltLt: toon(FELT_LT),
    copper: toon(COPPER, { map: copperTex() }),
    copperEdge: toon(COPPER),
    teal: toon(TEAL),
    tealDk: toon(TEAL_DK),
    glass: inkGlassTex(),
    plaster: toon('#e6e0d4'),
    dado: toon('#1c2926'),
    panel: toon('#243430'),
    rail: toon('#6b5340'),
    concrete: toon('#ffffff'),
    water: toon('#8eb4c4', { transparent: true, opacity: 0.72 }),
    ferric: toon('#4f6a3c', { transparent: true, opacity: 0.88 }),
    inkWater: toon('#1a1c1e', { transparent: true, opacity: 0.9 }),
    bulb: toon('#ffd7ae', { emissive: '#ffd7ae', emissiveIntensity: 1.45 }),
    coil: toon('#3a241c', { emissive: '#ff5a28', emissiveIntensity: 1.2 }),
    tube: toon('#e7f2ea', { emissive: '#d5efe4', emissiveIntensity: 1.1 }),
    wax: toon('#d89a3a'),
    solvent: toon('#e2c04a'),
    solventBand: toon('#1c1c1c'),
    glove: toon('#d7d2c8'),
    sponge: toon('#d2a24a'),
    bone: toon('#ead7b8'),
  };
  return built;
}

function fp(layout, id) {
  const found = layout.footprints.find((item) => item.id === id);
  if (!found) throw new Error(`missing footprint ${id}`);
  return found;
}

function mid(spec) {
  return [(spec.min[0] + spec.max[0]) / 2, (spec.min[1] + spec.max[1]) / 2];
}

function dims(spec) {
  return [spec.max[0] - spec.min[0], spec.max[1] - spec.min[1]];
}

function contactDisc(parent, x, z, rx, rz, opacity = 0.2) {
  const mesh = new THREE.Mesh(
    new THREE.CircleGeometry(1, 18),
    new THREE.MeshBasicMaterial({
      color: 0x1c1916,
      transparent: true,
      opacity,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
    })
  );
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set(x, 0.016, z);
  mesh.scale.set(rx, rz, 1);
  mesh.userData.keepBasic = true;
  mesh.renderOrder = 3;
  parent.add(mesh);
}

function decal(parent, x, z, rx, rz, color, opacity = 0.45) {
  const mesh = new THREE.Mesh(
    new THREE.CircleGeometry(1, 14),
    new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    })
  );
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set(x, 0.02, z);
  mesh.scale.set(rx, rz, 1);
  mesh.userData.keepBasic = true;
  mesh.renderOrder = 2;
  parent.add(mesh);
}

function alongX(mesh) {
  mesh.rotation.z = Math.PI / 2;
  return mesh;
}

function alongZ(mesh) {
  mesh.rotation.x = Math.PI / 2;
  return mesh;
}

function flatCard(w, t, d, topMat, edgeMat) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, t, d), [edgeMat, edgeMat, topMat, edgeMat, edgeMat, edgeMat]);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function standingSheet(w, h, map) {
  const edge = toon(PAPER_DK);
  const face = toon(PAPER, { map });
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.008), [edge, edge, edge, edge, face, face]);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function bulb(parent, x, y, z, r = 0.035) {
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(r, 10, 8), mats().bulb);
  mesh.position.set(x, y, z);
  mesh.userData.castShadow = false;
  parent.add(mesh);
  return mesh;
}

function starWheel(parent, x, y, z, radius) {
  const g = new THREE.Group();
  g.name = 'star-wheel';
  g.position.set(x, y, z);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(radius, 0.022, 8, 40), mats().iron);
  rim.castShadow = true;
  g.add(rim);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.028, radius * 0.92, 0.02), mats().ironLt);
    spoke.position.set(Math.sin(a) * radius * 0.46, Math.cos(a) * radius * 0.46, 0);
    spoke.rotation.z = -a;
    spoke.castShadow = true;
    g.add(spoke);
  }
  const hub = addCyl(g, 0.07, 0.07, 0.06, mats().iron, 0, 0, 0, 16);
  alongZ(hub);
  const hx = Math.sin(0.55) * radius;
  const hy = Math.cos(0.55) * radius;
  const handle = addCyl(g, 0.02, 0.02, 0.08, mats().iron, hx, hy, 0.05, 8);
  alongZ(handle);
  addCyl(g, 0.028, 0.028, 0.04, toon('#1a1c1e'), hx, hy, 0.09, 8);
  parent.add(g);
}

function etchingPress(parent, spec) {
  const g = new THREE.Group();
  g.name = 'press';
  const [cx, cz] = mid(spec);
  const [len, wid] = dims(spec);
  const top = spec.top;
  const m = mats();
  const x0 = cx - len / 2;
  const x1 = cx + len / 2;
  const z0 = cz - wid / 2;
  const z1 = cz + wid / 2;

  for (const [x, z] of [[x0 + 0.12, z0 + 0.08], [x1 - 0.12, z0 + 0.08], [x0 + 0.12, z1 - 0.08], [x1 - 0.12, z1 - 0.08]]) {
    addBox(g, 0.08, top - 0.12, 0.08, m.iron, x, (top - 0.12) / 2, z);
  }
  addBox(g, len - 0.2, 0.06, 0.06, m.oak, cx, 0.22, z0 + 0.1);
  addBox(g, len - 0.2, 0.06, 0.06, m.oak, cx, 0.22, z1 - 0.1);
  addBox(g, len - 0.08, 0.1, 0.08, m.iron, cx, top - 0.08, z0 + 0.05);
  addBox(g, len - 0.08, 0.1, 0.08, m.iron, cx, top - 0.08, z1 - 0.05);
  const bedX = cx + 0.16;
  addBox(g, len * 0.86, 0.07, wid - 0.16, m.oak, bedX, top - 0.055, cz);
  addBox(g, len * 0.82, 0.018, wid - 0.22, m.steelDk, bedX, top - 0.008, cz);

  addBox(g, 0.1, 0.72, 0.1, m.iron, cx, top + 0.28, z0 + 0.08);
  addBox(g, 0.12, 0.78, 0.14, m.iron, cx, top + 0.3, z1 - 0.06);
  const roller = addCyl(g, 0.085, 0.085, wid - 0.22, m.iron, cx, top + 0.12, cz, 20);
  alongZ(roller);
  addCyl(g, 0.07, 0.07, 0.04, m.ironLt, cx, top + 0.62, z0 + 0.08, 12);
  addCyl(g, 0.08, 0.08, 0.045, m.ironLt, cx, top + 0.66, z1 - 0.06, 12);
  addBox(g, 0.16, 0.12, 0.2, m.iron, cx, top + 0.16, z1 + 0.02);

  const wheel = spec.wheel;
  const axle = addCyl(g, 0.035, 0.035, wheel.z - (z1 - 0.02), m.iron, cx, wheel.y, (z1 + wheel.z) / 2, 10);
  alongZ(axle);
  starWheel(g, wheel.x, wheel.y, wheel.z, wheel.radius);

  const stackX = cx + 0.42;
  const plate = flatCard(0.32, 0.006, 0.24, m.copper, m.copperEdge);
  plate.position.set(stackX, top + 0.012, cz + 0.02);
  plate.rotation.y = -0.04;
  g.add(plate);
  const sheet = flatCard(0.5, 0.004, 0.38, toon(PAPER, { map: printTex(3) }), toon(PAPER_DK));
  sheet.position.set(stackX - 0.02, top + 0.02, cz);
  g.add(sheet);
  const felts = [
    [0.62, 0.02, 0.46, m.felt, 0.02],
    [0.58, 0.018, 0.42, m.feltLt, -0.03],
    [0.5, 0.012, 0.36, toon('#3e3a36'), 0.01],
  ];
  felts.forEach(([w, t, d, mat, dx], i) => {
    const felt = addBox(g, w, t, d, mat, stackX + dx, top + 0.04 + i * 0.02, cz - 0.02);
    felt.rotation.y = (i - 1) * 0.05;
  });

  const tray = addBox(g, 0.28, 0.025, 0.16, m.walnut, x1 - 0.22, top + 0.02, z1 - 0.16);
  tray.rotation.y = 0.02;
  addCyl(g, 0.006, 0.006, 0.16, toon('#222'), x1 - 0.28, top + 0.05, z1 - 0.12, 5);
  const scraper = new THREE.Mesh(new THREE.OctahedronGeometry(0.03, 0), toon('#c0c4c8'));
  scraper.scale.set(1.4, 0.35, 0.9);
  scraper.position.set(x1 - 0.16, top + 0.045, z1 - 0.18);
  scraper.castShadow = true;
  g.add(scraper);

  const arm = new THREE.Group();
  addBox(arm, 0.03, 0.34, 0.03, m.iron, cx + 0.1, top + 0.55, z1 - 0.02);
  addBox(arm, 0.36, 0.025, 0.025, m.iron, cx + 0.26, top + 0.7, z1 - 0.02);
  addCyl(arm, 0.07, 0.035, 0.08, toon('#3d4a46'), cx + 0.42, top + 0.64, cz + 0.05, 12);
  bulb(arm, cx + 0.42, top + 0.58, cz + 0.05, 0.025);
  g.add(arm);

  parent.add(g);
  contactDisc(parent, cx, cz, len * 0.42, wid * 0.42, 0.26);
}

function shopTable(parent, spec, { wood, border, name }) {
  const g = new THREE.Group();
  g.name = name;
  const [cx, cz] = mid(spec);
  const [w, d] = dims(spec);
  const top = spec.top;
  const m = mats();
  const woodMat = wood === 'maple' ? m.maple : m.walnut;
  addBox(g, w, 0.05, d, woodMat, cx, top - 0.035, cz);
  addBox(g, w - 0.1, 0.012, d - 0.1, border, cx, top - 0.004, cz);
  const insetX = w / 2 - 0.08;
  const insetZ = d / 2 - 0.08;
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    addBox(g, 0.07, top - 0.08, 0.07, m.oak, cx + sx * insetX, (top - 0.08) / 2, cz + sz * insetZ);
  }
  addBox(g, w - 0.24, 0.025, d - 0.2, m.paperDk, cx, 0.28, cz);
  addBox(g, w - 0.16, 0.06, 0.04, woodMat, cx, top - 0.08, cz - d / 2 + 0.04);
  addBox(g, w - 0.16, 0.06, 0.04, woodMat, cx, top - 0.08, cz + d / 2 - 0.04);
  parent.add(g);
  contactDisc(parent, cx, cz, w * 0.46, d * 0.46, 0.18);
  return { cx, cz, w, d, top };
}

function inkCans(parent, x, y, z) {
  const m = mats();
  const cans = [
    [0, 0, 0.07, 0.11, false],
    [0.16, 0.04, 0.055, 0.09, true],
    [-0.14, -0.06, 0.06, 0.13, false],
  ];
  cans.forEach(([dx, dz, r, h, open]) => {
    addCyl(parent, r, r, h, open ? toon('#1a1a1c') : toon('#2a2420'), x + dx, y + h / 2, z + dz, 12);
    if (!open) addCyl(parent, r * 1.02, r * 1.02, 0.012, m.ironLt, x + dx, y + h + 0.006, z + dz, 12);
    else addCyl(parent, r * 0.72, r * 0.72, 0.01, toon('#0c0c0e'), x + dx, y + h - 0.01, z + dz, 12);
  });
}

function brayer(parent, x, y, z, len, rad, rot) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  g.rotation.y = rot;
  const roller = addCyl(g, rad, rad, len, toon('#1a1c1e'), 0, rad, 0, 14);
  roller.rotation.z = Math.PI / 2;
  addCyl(g, 0.008, 0.008, 0.1, mats().iron, 0, rad + 0.02, rad + 0.04, 6);
  addBox(g, 0.025, 0.012, 0.09, toon('#6b4228'), 0, rad + 0.02, rad + 0.1);
  parent.add(g);
}

function dressingInk(parent, spec) {
  const [cx, cz] = mid(spec);
  const top = spec.top;
  const [, d] = dims(spec);
  inkCans(parent, cx + 0.55, top, cz - d * 0.28);
  brayer(parent, cx - 0.62, top, cz + 0.12, 0.28, 0.055, 0.35);
  brayer(parent, cx - 0.28, top, cz + 0.3, 0.2, 0.04, -0.6);
  brayer(parent, cx + 0.2, top, cz - 0.34, 0.32, 0.06, 1.15);
  brayer(parent, cx + 0.82, top, cz + 0.16, 0.16, 0.034, 0.15);
  addBox(parent, 0.18, 0.006, 0.025, toon('#c8ccd0'), cx - 0.15, top + 0.008, cz + 0.34);
  addBox(parent, 0.14, 0.005, 0.02, toon('#b0b4b8'), cx + 0.05, top + 0.01, cz + 0.36).rotation.y = 0.4;
  const wad = new THREE.Mesh(new THREE.IcosahedronGeometry(0.05, 0), toon('#d9d4cc'));
  wad.scale.set(1.3, 0.7, 1.1);
  wad.position.set(cx - 0.72, top + 0.04, cz - 0.1);
  wad.castShadow = true;
  parent.add(wad);
  const wad2 = wad.clone();
  wad2.position.set(cx - 0.84, top + 0.035, cz + 0.05);
  wad2.rotation.y = 1.1;
  parent.add(wad2);
  const news = addBox(parent, 0.42, 0.012, 0.32, toon('#ddd6c8'), cx + 0.05, top + 0.008, cz - 0.02);
  news.rotation.y = -0.03;
  const plate = flatCard(0.28, 0.006, 0.2, mats().copper, mats().copperEdge);
  plate.position.set(cx + 0.02, top + 0.02, cz - 0.02);
  plate.rotation.y = 0.08;
  parent.add(plate);
  addBox(parent, 0.36, 0.04, 0.28, toon('#cfc6b6'), cx, 0.32, cz - 0.05);
  addBox(parent, 0.22, 0.1, 0.16, toon('#2c2824'), cx + 0.55, 0.36, cz + 0.12);
}

function dressingPaper(parent, spec) {
  const [cx, cz] = mid(spec);
  const top = spec.top;
  for (let i = 0; i < 7; i++) {
    const sheet = addBox(
      parent,
      0.56,
      0.004,
      0.4,
      toon(i % 2 ? PAPER : '#efe6d4'),
      cx - 0.55 + (i - 3) * 0.004,
      top + 0.01 + i * 0.0045,
      cz - 0.12 + (i % 3) * 0.006
    );
    sheet.rotation.y = (i - 3) * 0.01;
  }
  const blank = addBox(parent, 0.62, 0.004, 0.48, mats().paper, cx + 0.15, top + 0.008, cz + 0.05);
  blank.rotation.y = -0.02;
  const proof = flatCard(0.42, 0.004, 0.32, toon(PAPER, { map: printTex(1) }), toon(PAPER_DK));
  proof.position.set(cx + 0.28, top + 0.016, cz - 0.18);
  proof.rotation.y = 0.06;
  parent.add(proof);
  addBox(parent, 0.7, 0.008, 0.03, mats().steel, cx + 0.1, top + 0.012, cz + 0.42);
  addBox(parent, 0.03, 0.008, 0.22, mats().steel, cx - 0.22, top + 0.014, cz + 0.32);
  addBox(parent, 0.14, 0.012, 0.035, mats().bone, cx - 0.15, top + 0.012, cz + 0.22).rotation.y = 0.5;
  addCyl(parent, 0.008, 0.008, 0.02, toon('#222'), cx + 0.02, top + 0.012, cz + 0.16, 6);
  addCyl(parent, 0.008, 0.008, 0.02, toon('#222'), cx + 0.02, top + 0.012, cz - 0.08, 6);
  addBox(parent, 0.4, 0.06, 0.28, toon('#efe8dc'), cx - 0.15, 0.34, cz);
  addBox(parent, 0.28, 0.045, 0.2, toon('#e5dcc8'), cx + 0.45, 0.32, cz + 0.05);
}

function flatFile(parent, spec, { drawers, openIndex, title, pages }) {
  const g = new THREE.Group();
  g.name = spec.id;
  const [cx, cz] = mid(spec);
  const [w, d] = dims(spec);
  const h = spec.top;
  const m = mats();
  addBox(g, w, h, d, m.steelDk, cx, h / 2, cz);
  addBox(g, 0.02, h - 0.04, d - 0.04, m.steel, spec.max[0] - 0.01, h / 2, cz);
  const dh = (h - 0.08) / drawers;
  for (let i = 0; i < drawers; i++) {
    const y = 0.05 + dh * (i + 0.5);
    const pull = i === openIndex ? 0.16 : 0.005;
    addBox(g, 0.018, dh - 0.014, d - 0.06, toon(i % 2 ? '#d9d3c6' : '#cfc6b6'), spec.max[0] + pull, y, cz);
    addBox(g, 0.02, 0.016, 0.1, m.iron, spec.max[0] + pull + 0.012, y, cz + d * 0.28);
    if (i === openIndex) {
      for (let s = 0; s < 3; s++) {
        addBox(
          g,
          0.07,
          0.006,
          d * 0.62,
          toon(s === 1 ? PAPER : '#e7dcc8'),
          spec.max[0] + pull + 0.045,
          y + (s - 1) * 0.012,
          cz
        );
      }
    }
  }
  const tag = new THREE.Mesh(
    new THREE.PlaneGeometry(0.36, 0.1),
    toon('#f4efe4', { map: labelTex(title, pages, '#f4efe4', '#1c2422'), side: THREE.DoubleSide })
  );
  tag.position.set(spec.max[0] + 0.02, h - 0.08, cz);
  tag.rotation.y = Math.PI / 2;
  tag.userData.castShadow = false;
  g.add(tag);
  parent.add(g);
  contactDisc(parent, cx, cz, w * 0.55, d * 0.48, 0.16);
}

function faucet(parent, x, y, z, dir) {
  const m = mats();
  addCyl(parent, 0.02, 0.025, 0.16, m.steel, x, y + 0.08, z, 8);
  const spout = addCyl(parent, 0.012, 0.012, 0.16, m.steel, x + dir * 0.08, y + 0.15, z, 8);
  spout.rotation.z = Math.PI / 2;
  addCyl(parent, 0.01, 0.01, 0.05, m.steel, x + dir * 0.15, y + 0.12, z, 6);
}

function sink(parent, spec, { dirty }) {
  const g = new THREE.Group();
  g.name = spec.id;
  const [cx, cz] = mid(spec);
  const [w, d] = dims(spec);
  const top = spec.top;
  const m = mats();
  const body = dirty ? toon('#4a5258') : m.steel;
  addBox(g, w, top - 0.05, d, body, cx, (top - 0.05) / 2, cz);
  addBox(g, w * 0.96, 0.04, d * 0.96, dirty ? toon('#3a4248') : toon('#d5dbe0'), cx, top - 0.02, cz);
  addBox(g, w * 0.62, 0.1, d * 0.62, dirty ? m.inkWater : toon('#2c3438'), cx + (dirty ? 0.02 : -0.02), top - 0.02, cz);
  if (!dirty) {
    addBox(g, w * 0.5, 0.045, d * 0.42, m.water, cx - 0.02, top + 0.01, cz + 0.02);
    const soak = addBox(g, w * 0.42, 0.004, d * 0.34, m.paper, cx - 0.02, top + 0.04, cz + 0.02);
    soak.rotation.z = -0.04;
    soak.rotation.y = 0.05;
  }
  const dir = dirty ? -1 : 1;
  faucet(g, cx - dir * w * 0.22, top, cz - d * 0.18, dir);
  if (dirty) {
    brayer(g, cx + 0.12, top, cz + 0.12, 0.14, 0.03, 0.8);
    addCyl(g, 0.045, 0.05, 0.14, m.solvent, cx + w * 0.28, top + 0.07, cz - 0.08, 10);
    addCyl(g, 0.045, 0.05, 0.02, m.solventBand, cx + w * 0.28, top + 0.12, cz - 0.08, 10);
    addCyl(g, 0.035, 0.038, 0.1, m.solvent, cx + w * 0.28, top + 0.05, cz + 0.08, 10);
    const glove = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 6), m.glove);
    glove.scale.set(1.4, 0.45, 0.9);
    glove.position.set(cx - 0.1, top + 0.03, cz + 0.16);
    glove.castShadow = true;
    g.add(glove);
  } else {
    const sponge = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 6), m.sponge);
    sponge.scale.set(1.2, 0.55, 0.8);
    sponge.position.set(cx + 0.22, top + 0.03, cz - 0.08);
    sponge.castShadow = true;
    g.add(sponge);
  }
  parent.add(g);
  contactDisc(parent, cx, cz, w * 0.55, d * 0.55, 0.22);
}

function acidHood(parent, spec) {
  const g = new THREE.Group();
  g.name = 'acid-hood';
  const [cx, cz] = mid(spec);
  const [w, d] = dims(spec);
  const deck = spec.top;
  const m = mats();
  addBox(g, w, deck - 0.04, d, m.steelDk, cx, (deck - 0.04) / 2, cz);
  addBox(g, w * 0.78, 0.08, d * 0.62, toon('#3a4038'), cx, deck + 0.02, cz + 0.02);
  addBox(g, w * 0.7, 0.045, d * 0.5, m.ferric, cx, deck + 0.07, cz + 0.02);
  const plate = flatCard(0.22, 0.006, 0.16, m.copper, m.copperEdge);
  plate.position.set(cx - 0.05, deck + 0.1, cz + 0.04);
  plate.rotation.z = -0.35;
  plate.rotation.y = 0.2;
  g.add(plate);
  const hoodY = deck + 0.55;
  const t = 0.03;
  addBox(g, w, t, d, m.steel, cx, deck + 1.05, cz);
  addBox(g, t, 0.7, d, m.steel, cx - w / 2, hoodY, cz);
  addBox(g, t, 0.7, d, m.steel, cx + w / 2, hoodY, cz);
  addBox(g, w, 0.7, t, m.steel, cx, hoodY, cz - d / 2);
  const glass = addBox(g, w - 0.08, 0.48, 0.015, toon('#d5e4ea', { transparent: true, opacity: 0.28, side: THREE.DoubleSide }), cx, deck + 0.48, cz + d / 2);
  glass.userData.castShadow = false;
  addBox(g, w * 0.7, 0.02, 0.08, m.tube, cx, deck + 0.98, cz, 0);
  addCyl(g, 0.04, 0.045, 0.16, toon('#c48a3a'), cx - 0.28, deck + 0.2, cz - 0.12, 8);
  addCyl(g, 0.03, 0.034, 0.12, toon('#6a8f4a'), cx - 0.16, deck + 0.18, cz - 0.16, 8);
  addBox(g, 0.2, 1.15, 0.2, m.steel, cx, deck + 1.62, cz);
  addBox(g, 1.35, 0.14, 0.18, m.steel, cx - 0.7, 3.05, cz);
  parent.add(g);
  contactDisc(parent, cx, cz, w * 0.48, d * 0.48, 0.2);
}

function hotPlate(parent, spec) {
  const g = new THREE.Group();
  g.name = 'hot-plate';
  const [cx, cz] = mid(spec);
  const [w, d] = dims(spec);
  const top = spec.top;
  const m = mats();
  addBox(g, w, top - 0.05, d, m.steel, cx, (top - 0.05) / 2, cz);
  addBox(g, w * 0.92, 0.04, d * 0.9, toon('#2a2c2e'), cx, top - 0.01, cz);
  const coil = addCyl(g, 0.16, 0.16, 0.015, m.coil, cx - 0.08, top + 0.012, cz, 20);
  coil.userData.castShadow = false;
  const plate = flatCard(0.2, 0.006, 0.15, m.copper, m.copperEdge);
  plate.position.set(cx - 0.08, top + 0.025, cz);
  g.add(plate);
  addCyl(g, 0.05, 0.06, 0.012, m.wax, cx - 0.05, top + 0.034, cz + 0.02, 12);
  addCyl(g, 0.006, 0.006, 0.12, toon('#333'), cx + 0.22, top + 0.03, cz + 0.08, 5).rotation.z = 0.6;
  parent.add(g);
  contactDisc(parent, cx, cz, w * 0.48, d * 0.48, 0.18);
}

function dryingLines(parent) {
  const wires = [
    { y: 2.2, z: -4.14 },
    { y: 2.02, z: -4.02 },
  ];
  wires.forEach((wire) => {
    const span = alongX(addCyl(parent, 0.004, 0.004, 3.5, toon('#222'), -2.15, wire.y, wire.z, 6));
    span.userData.castShadow = false;
  });
  const prints = [
    { x: -3.85, w: 0.4, h: 0.5, seed: 1, wire: 0, yaw: 0.03, roll: 0.025 },
    { x: -3.22, w: 0.34, h: 0.28, seed: 2, wire: 1, yaw: -0.07, roll: -0.03 },
    { x: -2.5, w: 0.48, h: 0.62, seed: 3, wire: 0, yaw: 0.02, roll: 0.04 },
    { x: -1.45, w: 0.36, h: 0.46, seed: 4, wire: 0, yaw: -0.04, roll: 0.015 },
    { x: -0.92, w: 0.46, h: 0.34, seed: 5, wire: 1, yaw: 0.08, roll: -0.02 },
    { x: -0.42, w: 0.28, h: 0.42, seed: 6, wire: 0, yaw: -0.03, roll: 0.03 },
  ];
  prints.forEach((p) => {
    const wire = wires[p.wire];
    const sheet = standingSheet(p.w, p.h, printTex(p.seed));
    sheet.position.set(p.x, wire.y - 0.05 - p.h / 2, wire.z + 0.03);
    sheet.rotation.y = p.yaw;
    sheet.rotation.z = p.roll;
    parent.add(sheet);
    addBox(parent, 0.04, 0.03, 0.02, toon('#222'), p.x, wire.y - 0.02, wire.z + 0.01);
  });
}

function dryingRack(parent, spec) {
  const g = new THREE.Group();
  g.name = 'dry-rack';
  const [cx, cz] = mid(spec);
  const [w] = dims(spec);
  const m = mats();
  const h = 1.72;
  addBox(g, 0.04, h, 0.04, m.maple, cx - w / 2, h / 2, cz);
  addBox(g, 0.04, h, 0.04, m.maple, cx + w / 2, h / 2, cz);
  addBox(g, w, 0.04, 0.04, m.maple, cx, h - 0.04, cz);
  addBox(g, w, 0.05, 0.08, m.oak, cx, 0.06, cz);
  const slots = [-0.58, -0.26, 0.02, 0.36, 0.62];
  slots.forEach((dx, i) => {
    addBox(g, 0.02, h - 0.18, 0.02, m.oak, cx + dx, h / 2, cz);
    if (i === 0 || i === 2 || i === 4) {
      const sheet = standingSheet(i === 2 ? 0.3 : 0.38, i === 4 ? 0.58 : 0.46, printTex(i + 2));
      sheet.position.set(cx + dx + 0.01, 0.92 + (i === 4 ? 0.1 : 0), cz + 0.14);
      g.add(sheet);
    }
    if (i === 3) {
      for (let s = 0; s < 5; s++) {
        addBox(g, 0.32, 0.008, 0.22, toon(s % 2 ? '#efe6d4' : PAPER), cx + dx, 0.42 + s * 0.012, cz + 0.04);
      }
    }
  });
  parent.add(g);
  contactDisc(parent, cx, cz, w * 0.48, 0.24, 0.16);
}

function pegboard(parent, x, y, z, rotY) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  g.rotation.y = rotY;
  addBox(g, 0.72, 0.9, 0.025, toon('#c2b49a'), 0, 0, 0);
  const tools = [
    [-0.26, 0.28, 0.16, 0.008],
    [-0.16, 0.22, 0.18, 0.007],
    [-0.06, 0.3, 0.14, 0.009],
    [0.08, 0.18, 0.2, 0.008],
    [0.2, 0.26, 0.15, 0.01],
  ];
  tools.forEach(([tx, ty, len, rad], i) => {
    const needle = addCyl(g, rad, rad * 0.4, len, toon(i % 2 ? '#d0d4d8' : '#8a5a3c'), tx, ty, 0.04, 5);
    needle.rotation.x = Math.PI / 2;
  });
  const scraper = new THREE.Mesh(new THREE.OctahedronGeometry(0.035, 0), toon('#d8dce0'));
  scraper.scale.set(1.5, 0.4, 0.8);
  scraper.position.set(-0.22, -0.12, 0.04);
  scraper.castShadow = true;
  g.add(scraper);
  addCyl(g, 0.012, 0.018, 0.14, toon('#6b4228'), 0.18, -0.16, 0.05, 8).rotation.x = 1.1;
  for (let i = 0; i < 4; i++) {
    const hole = new THREE.Mesh(new THREE.CircleGeometry(0.012, 8), toon('#1c1c1c'));
    hole.position.set(-0.2 + i * 0.13, -0.32, 0.014);
    hole.userData.castShadow = false;
    g.add(hole);
  }
  parent.add(g);
}

function plateRack(parent, spec) {
  const g = new THREE.Group();
  g.name = 'plate-rack';
  const [cx, cz] = mid(spec);
  const m = mats();
  addBox(g, 0.34, 0.04, 0.62, m.oak, cx, 0.04, cz);
  addBox(g, 0.04, 0.42, 0.04, m.oak, cx, 0.24, cz - 0.26);
  addBox(g, 0.04, 0.42, 0.04, m.oak, cx, 0.24, cz + 0.26);
  addBox(g, 0.03, 0.03, 0.56, m.oak, cx, 0.42, cz);
  for (let i = 0; i < 5; i++) {
    const plate = flatCard(0.18, 0.008, 0.24, i % 2 ? m.copper : m.copperEdge, m.copperEdge);
    plate.position.set(cx + 0.02, 0.24, cz - 0.2 + i * 0.1);
    plate.rotation.x = -1.05;
    g.add(plate);
  }
  parent.add(g);
  contactDisc(parent, cx, cz, 0.2, 0.34, 0.16);
}

function feltRolls(parent, spec) {
  const g = new THREE.Group();
  g.name = 'felt-rolls';
  const [cx, cz] = mid(spec);
  addCyl(g, 0.12, 0.12, 0.4, mats().feltLt, cx - 0.06, 0.2, cz - 0.04, 16);
  const b = addCyl(g, 0.1, 0.1, 0.36, mats().felt, cx + 0.08, 0.1, cz + 0.12, 14);
  b.rotation.z = Math.PI / 2;
  b.rotation.y = 0.4;
  parent.add(g);
  contactDisc(parent, cx, cz, 0.28, 0.24, 0.14);
}

function apron(parent, x, y, z, rotY, color) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  g.rotation.y = rotY;
  addBox(g, 0.36, 0.58, 0.018, toon(color), 0, -0.16, 0);
  addBox(g, 0.07, 0.2, 0.016, toon(color), -0.1, 0.2, 0);
  addBox(g, 0.07, 0.2, 0.016, toon(color), 0.1, 0.2, 0);
  parent.add(g);
}

function shopCard(parent) {
  const tex = labelTex('COPPERPLATE', ['clean paper  west', 'ink / ferric  east', 'bed  24 x 48'], '#f4efe4', '#1c2422');
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(0.48, 0.36), toon('#f4efe4', { map: tex, side: THREE.DoubleSide }));
  mesh.position.set(-5.9, 1.7, 2.15);
  mesh.rotation.y = Math.PI / 2;
  mesh.userData.castShadow = false;
  parent.add(mesh);
}

function factoryWindow(parent, cx, cz, width, height, sillY) {
  const wood = mats().rail;
  const glass = toon('#c5d7e4', { transparent: true, opacity: 0.38, side: THREE.DoubleSide });
  const pane = addBox(parent, width, height, 0.03, glass, cx, sillY + height / 2, cz);
  pane.userData.castShadow = false;
  addBox(parent, width + 0.1, 0.06, 0.07, wood, cx, sillY + height, cz);
  addBox(parent, width + 0.12, 0.07, 0.16, toon(MAPLE), cx, sillY, cz + 0.06);
  addBox(parent, 0.05, height + 0.06, 0.07, wood, cx - width / 2, sillY + height / 2, cz);
  addBox(parent, 0.05, height + 0.06, 0.07, wood, cx + width / 2, sillY + height / 2, cz);
  addBox(parent, 0.035, height, 0.045, wood, cx, sillY + height / 2, cz + 0.01);
  addBox(parent, width, 0.03, 0.04, wood, cx, sillY + height * 0.45, cz + 0.01);
}

function makeShell(layout) {
  const g = new THREE.Group();
  g.name = 'shell';
  const { width: W, depth: D, height: H } = layout.meta.room;
  const m = mats();
  const floor = addBox(g, W, 0.1, D, toon(layout.shell.floorColor), 0, -0.05, 0);
  floor.userData.castShadow = false;

  const tile = 0.9;
  const step = 0.96;
  const tiles = [];
  for (let x = -W / 2 + 0.55; x < W / 2 - 0.4; x += step) {
    for (let z = -D / 2 + 0.5; z < D / 2 - 0.35; z += step) tiles.push([x, z]);
  }
  const tileMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(tile, 0.018, tile), m.concrete, tiles.length);
  tileMesh.userData.castShadow = false;
  tileMesh.frustumCulled = false;
  const dummy = new THREE.Object3D();
  const tint = new THREE.Color();
  const tones = ['#c4c0b6', '#b7b2a8', '#cdc8be', '#aea89e'];
  tiles.forEach(([x, z], i) => {
    dummy.position.set(x, 0.006, z);
    dummy.rotation.y = hash01(i + 9) > 0.82 ? 0.01 : 0;
    dummy.updateMatrix();
    tileMesh.setMatrixAt(i, dummy.matrix);
    const ink = Math.hypot(x - 3.4, z - 2.2);
    const acid = Math.hypot(x - 4.7, z + 3.2);
    const press = Math.hypot(x + 0.05, z + 1.05);
    const soak = Math.hypot(x + 5.4, z - 0.45);
    const dirty = Math.hypot(x - 4.9, z + 1.05);
    let color = tones[Math.floor(hash01(i + 1) * tones.length)];
    if (ink < 1.35) color = hash01(i) > 0.4 ? '#3e4348' : '#4a4f54';
    else if (dirty < 0.85) color = '#2f3438';
    else if (acid < 1.15) color = hash01(i + 4) > 0.5 ? '#5c6858' : '#465246';
    else if (press < 1.5) color = hash01(i + 2) > 0.5 ? '#8a7564' : '#756456';
    else if (soak < 0.8) color = '#7e8a90';
    tint.set(color);
    tileMesh.setColorAt(i, tint);
  });
  tileMesh.instanceMatrix.needsUpdate = true;
  if (tileMesh.instanceColor) tileMesh.instanceColor.needsUpdate = true;
  g.add(tileMesh);

  addBox(g, W, H, 0.14, m.plaster, 0, H / 2, -D / 2);
  addBox(g, 0.14, H, D, m.plaster, -W / 2, H / 2, 0);
  const stub = layout.rightStub;
  addBox(g, stub.size[0], stub.size[1], stub.size[2], m.plaster, stub.position[0], H / 2, stub.position[1]);

  const dadoH = 0.9;
  const backWidths = [1.05, 0.82, 1.2, 0.96, 1.28, 1.02, 0.88, 1.16, 0.94];
  let backX = -5.35;
  backWidths.forEach((pw, i) => {
    addBox(g, pw - 0.045, dadoH, 0.02, i % 2 ? m.panel : m.dado, backX + pw / 2, 0.48, -D / 2 + 0.1);
    backX += pw;
  });
  const leftWidths = [0.95, 1.15, 0.8, 1.05, 1.22, 0.9, 1.1, 0.86];
  let leftZ = -4.2;
  leftWidths.forEach((pw, i) => {
    addBox(g, 0.02, dadoH, pw - 0.045, i % 2 ? m.dado : m.panel, -W / 2 + 0.1, 0.48, leftZ + pw / 2);
    leftZ += pw;
  });
  addBox(g, 0.02, dadoH, 3.5, m.dado, 5.62, 0.48, -2.55);
  addBox(g, W - 0.3, 0.06, 0.08, m.rail, 0, 1.02, -D / 2 + 0.12);
  addBox(g, 0.08, 0.06, D - 0.4, m.rail, -W / 2 + 0.12, 1.02, 0.1);
  addBox(g, W - 0.4, 0.045, 0.06, m.rail, 0, 2.48, -D / 2 + 0.1);

  factoryWindow(g, -3.55, -D / 2 + 0.09, 2.05, 1.15, 1.5);
  factoryWindow(g, -0.85, -D / 2 + 0.09, 1.7, 1.15, 1.5);
  factoryWindow(g, 3.2, -D / 2 + 0.09, 1.35, 1.05, 1.62);

  const ceil = addBox(g, W * 0.62, 0.05, 1.15, toon(layout.shell.ceilingColor), -0.6, H - 0.03, -3.55);
  ceil.userData.castShadow = false;
  for (const bz of [-3.15, -1.85]) {
    const beam = addBox(g, W * 0.62, 0.08, 0.1, m.rail, -0.5, H - 0.14, bz);
    beam.userData.castShadow = false;
  }

  addBox(g, 1.15, 0.015, 0.7, toon('#3a342c'), 0.15, 0.012, 3.95).userData.castShadow = false;
  addBox(g, 0.7, 0.02, 0.42, toon('#6d5c48'), -5.45, 0.018, 1.05).userData.castShadow = false;
  addBox(g, 0.85, 0.018, 0.55, toon('#2a2e30'), 4.7, 0.016, -0.35).userData.castShadow = false;
  const grate = new THREE.Group();
  grate.position.set(4.55, 0.02, -2.15);
  addBox(grate, 0.28, 0.012, 0.28, toon('#3a3e42'), 0, 0, 0);
  for (let i = -2; i <= 2; i++) addBox(grate, 0.24, 0.008, 0.012, toon('#1e2124'), 0, 0.008, i * 0.045);
  g.add(grate);

  decal(g, 3.15, 2.05, 0.55, 0.32, '#1a1c1e', 0.35);
  decal(g, 4.85, -1.2, 0.4, 0.28, '#16181a', 0.4);
  decal(g, -5.35, 0.55, 0.34, 0.22, '#6a7a82', 0.28);
  decal(g, 4.7, -3.15, 0.36, 0.2, '#3d4a32', 0.32);

  shopCard(g);
  return g;
}

function makeProcedural(layout) {
  const g = new THREE.Group();
  g.name = 'procedural';
  const press = fp(layout, 'press');
  etchingPress(g, press);
  shopTable(g, fp(layout, 'ink_table'), { wood: 'walnut', border: toon('#141816', { map: mats().glass }), name: 'ink-table' });
  dressingInk(g, fp(layout, 'ink_table'));
  shopTable(g, fp(layout, 'paper_table'), { wood: 'maple', border: mats().maple, name: 'paper-table' });
  dressingPaper(g, fp(layout, 'paper_table'));
  flatFile(g, fp(layout, 'flat_a'), { drawers: 8, openIndex: 5, title: 'BFK RIVES', pages: ['white 250g', 'warm 280g'] });
  flatFile(g, fp(layout, 'flat_b'), { drawers: 6, openIndex: 2, title: 'SOMERSET', pages: ['book 175g', 'newsprint'] });
  const [fax, faz] = mid(fp(layout, 'flat_a'));
  addBox(g, 0.32, 0.02, 0.24, mats().paper, fax + 0.05, fp(layout, 'flat_a').top + 0.02, faz);
  const weight = new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 8), toon('#6a6e72'));
  weight.scale.set(1.2, 0.55, 1);
  weight.position.set(fax + 0.05, fp(layout, 'flat_a').top + 0.05, faz);
  weight.castShadow = true;
  g.add(weight);

  sink(g, fp(layout, 'clean_sink'), { dirty: false });
  sink(g, fp(layout, 'dirty_sink'), { dirty: true });
  acidHood(g, fp(layout, 'acid'));
  hotPlate(g, fp(layout, 'hot_plate'));
  dryingLines(g);
  dryingRack(g, fp(layout, 'dry_rack'));
  pegboard(g, 5.6, 1.62, -1.85, -Math.PI / 2);
  plateRack(g, fp(layout, 'plate_rack'));
  feltRolls(g, fp(layout, 'felt'));
  apron(g, 5.6, 1.25, -0.42, -Math.PI / 2, TEAL);
  apron(g, 5.6, 1.18, -1.95, -Math.PI / 2, TEAL_DK);

  const plant = layout.instances.find((item) => item.id === 'plant');
  const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 6), toon('#3d6a40'));
  leaf.position.set(plant.position[0], 0.32, plant.position[2]);
  leaf.scale.set(1.1, 0.8, 1);
  leaf.castShadow = true;
  g.add(leaf);
  return g;
}

function makeLights(layout, scene) {
  const spots = [
    { pos: [-0.05, 2.7, -0.35], target: [0.25, 0.9, -1.05], intensity: 5.2, color: 0xffe2c4, angle: 0.55 },
    { pos: [3.4, 2.55, 2.2], target: [3.4, 0.92, 2.2], intensity: 4.4, color: 0xffd7b0, angle: 0.6 },
    { pos: [-3.35, 2.5, 2.45], target: [-3.35, 0.8, 2.45], intensity: 3.2, color: 0xfff0dc, angle: 0.5 },
  ];
  spots.forEach((spec) => {
    const spot = new THREE.SpotLight(spec.color, spec.intensity, 7.5, spec.angle, 0.45, 1.4);
    spot.position.set(...spec.pos);
    const target = new THREE.Object3D();
    target.position.set(...spec.target);
    scene.add(target);
    spot.target = target;
    scene.add(spot);
  });
  const points = [
    { pos: [-0.05, 2.2, -0.2], color: 0xffc48a, intensity: 0.45, distance: 3.2 },
    { pos: [3.4, 2.05, 2.2], color: 0xffc48a, intensity: 0.4, distance: 3.4 },
    { pos: [-3.35, 1.7, 2.3], color: 0xffe0b8, intensity: 0.35, distance: 2.4 },
    { pos: [4.72, 1.7, -3.15], color: 0xd7efe4, intensity: 0.45, distance: 2.6 },
    { pos: [2.35, 1.15, -2.55], color: 0xff6a3a, intensity: 0.25, distance: 1.5 },
  ];
  points.forEach((p) => {
    const light = new THREE.PointLight(p.color, p.intensity, p.distance, 2);
    light.position.set(...p.pos);
    scene.add(light);
  });
}

boot({
  makeShell,
  makeProcedural,
  makeLights,
  readyText: 'ready — copperplate atelier · drag orbit · U unlit · T toon',
  onReady({ scene }) {
    window.__measure = () => {
      const names = ['press', 'ink-table', 'paper-table', 'flat_a', 'flat_b', 'clean_sink', 'dirty_sink', 'acid-hood', 'hot-plate', 'dry-rack', 'plate-rack', 'star-wheel'];
      const out = {};
      names.forEach((name) => {
        const obj = scene.getObjectByName(name);
        if (!obj) {
          out[name] = null;
          return;
        }
        const box = new THREE.Box3().setFromObject(obj);
        out[name] = {
          min: box.min.toArray().map((n) => Math.round(n * 1000) / 1000),
          max: box.max.toArray().map((n) => Math.round(n * 1000) / 1000),
        };
      });
      return out;
    };
  },
});
