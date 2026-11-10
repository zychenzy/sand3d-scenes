import * as THREE from 'three';
import { boot, toon, addBox, addCyl, labelTexture } from './scene_lib.js';

const BINDINGS = ['#7a3030', '#2c3a55', '#2e4636', '#6a4a28', '#4a3050', '#8a4a2a', '#243e44', '#5a3828'];

function spine(hex) {
  return toon(hex, { emissive: hex, emissiveIntensity: 0.32 });
}

if (new URLSearchParams(location.search).has('bare')) {
  const hud = document.getElementById('hud');
  if (hud) hud.style.display = 'none';
}

function paperMat(hex, map, glow = 0.16) {
  return toon(hex, { map: map || null, emissive: hex, emissiveIntensity: glow });
}

let mapTex = null;
function countyMapTexture() {
  if (mapTex) return mapTex;
  const c = document.createElement('canvas');
  c.width = 768;
  c.height = 512;
  const g = c.getContext('2d');
  g.fillStyle = '#f3e6c8';
  g.fillRect(0, 0, 768, 512);
  g.strokeStyle = '#6b4630';
  g.lineWidth = 14;
  g.strokeRect(16, 16, 736, 480);
  g.strokeStyle = '#c6a15b';
  g.lineWidth = 4;
  g.strokeRect(28, 28, 712, 456);
  g.strokeStyle = '#7d8f72';
  g.lineWidth = 2;
  for (let i = 0; i < 18; i++) {
    const x = 70 + (i % 6) * 100;
    const y = 80 + Math.floor(i / 6) * 110;
    g.fillStyle = i % 2 ? '#e7f0df' : '#e8d7b0';
    g.fillRect(x, y, 78, 86);
    g.strokeRect(x, y, 78, 86);
  }
  g.strokeStyle = '#3d6f86';
  g.lineWidth = 8;
  g.beginPath();
  g.moveTo(40, 420);
  g.bezierCurveTo(180, 300, 320, 460, 520, 240);
  g.bezierCurveTo(600, 160, 680, 220, 740, 120);
  g.stroke();
  g.strokeStyle = '#8a6240';
  g.lineWidth = 3;
  g.beginPath();
  g.moveTo(60, 80);
  g.lineTo(400, 250);
  g.lineTo(700, 180);
  g.moveTo(400, 250);
  g.lineTo(360, 430);
  g.stroke();
  g.fillStyle = '#6b4630';
  g.font = '700 42px serif';
  g.textAlign = 'left';
  g.fillText('COUNTY SHEET 14', 48, 64);
  g.font = '600 20px serif';
  g.fillText('SURVEY  1896', 52, 92);
  g.font = '700 16px sans-serif';
  g.fillText('N', 700, 70);
  g.beginPath();
  g.moveTo(706, 78);
  g.lineTo(698, 108);
  g.lineTo(714, 108);
  g.closePath();
  g.fill();
  g.fillRect(560, 450, 150, 6);
  g.font = '16px sans-serif';
  g.fillText('0          1 MILE', 560, 442);
  mapTex = new THREE.CanvasTexture(c);
  mapTex.colorSpace = THREE.SRGBColorSpace;
  mapTex.anisotropy = 4;
  return mapTex;
}

function floorTexture() {
  const c = document.createElement('canvas');
  c.width = 1024;
  c.height = 768;
  const g = c.getContext('2d');
  const cols = 12;
  const rows = 9;
  const tw = 1024 / cols;
  const th = 768 / rows;
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const n = ((x * 5 + y * 3) % 5) * 5;
      g.fillStyle = `rgb(${186 - n}, ${170 - n}, ${146 - n})`;
      g.fillRect(x * tw + 3, y * th + 3, tw - 6, th - 6);
    }
  }
  g.strokeStyle = '#6b4630';
  g.lineWidth = 16;
  g.strokeRect(26, 22, 972, 724);
  g.strokeStyle = '#c6a15b';
  g.lineWidth = 4;
  g.strokeRect(40, 36, 944, 696);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

function runnerTexture() {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 512;
  const g = c.getContext('2d');
  g.fillStyle = '#2c4638';
  g.fillRect(0, 0, 128, 512);
  g.strokeStyle = '#1b2e26';
  g.lineWidth = 18;
  g.strokeRect(8, 8, 112, 496);
  g.strokeStyle = '#c6a15b';
  g.lineWidth = 3;
  g.strokeRect(20, 18, 88, 476);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function palette(layout) {
  const s = layout.shell;
  return {
    wood: toon(s.woodColor),
    woodDark: toon(s.woodDark),
    top: toon(s.topColor),
    brass: toon(s.brass),
    green: toon(s.green),
    folder: toon(s.folder),
    box: toon(s.boxColor),
    boxAlt: toon('#b7a48a'),
    metal: toon('#5a564f'),
    metalDark: toon('#2c2a28'),
    plaster: toon(s.wallColor),
    glass: toon(s.glass, {
      transparent: true,
      opacity: 0.34,
      side: THREE.DoubleSide,
      depthWrite: false,
    }),
  };
}

function framed(parent, x, y, z, rotY, w, h, texture, frameMat) {
  const grp = new THREE.Group();
  grp.position.set(x, y, z);
  grp.rotation.y = rotY || 0;
  addBox(grp, w + 0.09, h + 0.09, 0.04, frameMat, 0, 0, 0);
  addBox(grp, w + 0.03, h + 0.03, 0.018, toon('#c6a15b'), 0, 0, 0.02);
  const face = paperMat('#f3e6c8', texture, 0.2);
  addBox(grp, w, h, 0.012, face, 0, 0, 0.034, { noCast: true });
  parent.add(grp);
  return grp;
}

function clerestory(parent, x, y, z, rotY, width, height, wood) {
  const grp = new THREE.Group();
  grp.position.set(x, y, z);
  grp.rotation.y = rotY || 0;
  const glass = toon('#d7e7df', {
    transparent: true,
    opacity: 0.78,
    side: THREE.DoubleSide,
    emissive: '#e7f3ee',
    emissiveIntensity: 0.35,
  });
  addBox(grp, width, height, 0.02, glass, 0, 0, 0, { noCast: true });
  const mullions = Math.max(2, Math.round(width / 0.46));
  for (let i = 0; i <= mullions; i++) {
    const mx = -width / 2 + (width * i) / mullions;
    addBox(grp, 0.04, height + 0.04, 0.05, wood, mx, 0, 0.02);
  }
  addBox(grp, width + 0.06, 0.05, 0.06, wood, 0, height / 2 + 0.01, 0.02);
  addBox(grp, width + 0.06, 0.055, 0.07, wood, 0, -height / 2 - 0.01, 0.025);
  parent.add(grp);
}

function wainscot(parent, x, y, z, rotY, length, height, cols, frame, inset) {
  const grp = new THREE.Group();
  grp.position.set(x, y, z);
  grp.rotation.y = rotY || 0;
  const colW = length / cols;
  for (let i = 0; i < cols; i++) {
    const cx = -length / 2 + colW * (i + 0.5);
    addBox(grp, colW - 0.05, height - 0.08, 0.018, inset, cx, 0, 0.02);
  }
  for (let i = 0; i <= cols; i++) {
    const sx = -length / 2 + colW * i;
    addBox(grp, 0.04, height, 0.04, frame, sx, 0, 0.028);
  }
  addBox(grp, length, 0.045, 0.045, frame, 0, height / 2, 0.03);
  addBox(grp, length, 0.045, 0.045, frame, 0, -height / 2, 0.03);
  parent.add(grp);
}

function makeShell(layout) {
  const g = new THREE.Group();
  g.name = 'shell';
  const { width: W, depth: D, height: H } = layout.meta.room;
  const s = layout.shell;
  const wall = toon(s.wallColor);
  const wood = toon(s.woodColor);
  const woodDark = toon(s.woodDark);
  const brass = toon(s.brass);
  const ceil = toon(s.ceilingColor);
  const map = layout.build.map;

  addBox(g, W, 0.08, D, toon(s.floorColor), 0, -0.04, 0);
  const tileMat = toon(s.floorColor);
  tileMat.map = floorTexture();
  const tiles = new THREE.Mesh(new THREE.PlaneGeometry(W, D), tileMat);
  tiles.rotation.x = -Math.PI / 2;
  tiles.position.y = 0.006;
  tiles.receiveShadow = true;
  g.add(tiles);

  const runnerMat = toon(s.green);
  runnerMat.map = runnerTexture();
  const runner = new THREE.Mesh(new THREE.PlaneGeometry(1.35, 6.35), runnerMat);
  runner.rotation.x = -Math.PI / 2;
  runner.position.set(0.42, 0.015, -0.2);
  runner.receiveShadow = true;
  g.add(runner);

  addBox(g, W, H, 0.14, wall, 0, H / 2, -D / 2);
  addBox(g, 0.14, H, D, wall, -W / 2, H / 2, 0);

  addBox(g, W - 0.3, 0.1, 0.04, woodDark, 0, 0.05, -D / 2 + 0.09);
  addBox(g, 0.04, 0.1, D - 0.3, woodDark, -W / 2 + 0.09, 0.05, 0);
  addBox(g, W - 0.2, 0.03, 0.1, toon('#3a322c'), 0, 0.02, -D / 2 + 0.14, { noCast: true });
  addBox(g, 0.1, 0.03, D - 0.2, toon('#3a322c'), -W / 2 + 0.14, 0.02, 0, { noCast: true });

  addBox(g, W - 0.2, 0.045, 0.05, wood, 0, 1.08, -D / 2 + 0.1);
  addBox(g, 0.05, 0.045, D - 0.2, wood, -W / 2 + 0.1, 1.08, 0);
  addBox(g, W - 0.16, 0.035, 0.04, wood, 0, 2.78, -D / 2 + 0.1);
  addBox(g, 0.04, 0.035, D - 0.16, wood, -W / 2 + 0.1, 2.78, 0);
  addBox(g, W - 0.08, 0.1, 0.12, wood, 0, H - 0.07, -D / 2 + 0.06);
  addBox(g, 0.12, 0.1, D - 0.08, wood, -W / 2 + 0.06, H - 0.07, 0);

  addBox(g, W * 0.7, 0.08, D * 0.46, ceil, -0.85, H - 0.04, -D * 0.24);
  addBox(g, W * 0.82, 0.14, 0.12, wood, -0.35, H - 0.22, -2.4);
  addBox(g, W * 0.82, 0.14, 0.12, wood, -0.35, H - 0.22, 1.4);

  clerestory(g, -3.22, 3.08, -D / 2 + 0.16, 0, 4.15, 0.42, wood);
  clerestory(g, map.x, 3.08, -D / 2 + 0.16, 0, 2.4, 0.42, wood);
  clerestory(g, -W / 2 + 0.16, 2.55, 0.85, Math.PI / 2, 1.05, 0.78, wood);

  wainscot(g, 2.15, 0.52, -D / 2 + 0.16, 0, 3.3, 0.78, 4, wood, woodDark);
  wainscot(g, -W / 2 + 0.16, 0.52, 2.05, Math.PI / 2, 1.05, 0.78, 2, wood, woodDark);

  const bays = layout.build.recordBays.filter((b) => Math.abs(b.rotY) < 0.2);
  const xs = bays.map((b) => b.x).sort((a, b) => a - b);
  for (let i = 0; i < xs.length - 1; i++) {
    const px = (xs[i] + xs[i + 1]) / 2;
    addBox(g, 0.12, 2.55, 0.07, wood, px, 1.32, -D / 2 + 0.12);
  }
  addBox(g, 0.16, 3.15, 0.16, woodDark, -W / 2 + 0.2, 1.58, -D / 2 + 0.18);

  const rad = new THREE.Group();
  rad.position.set(2.05, 0, -4.02);
  addBox(rad, 1.55, 0.07, 0.14, toon('#4e4a46'), 0, 0.08, 0);
  addBox(rad, 1.55, 0.05, 0.1, toon('#4e4a46'), 0, 0.48, 0);
  for (let i = 0; i < 16; i++) {
    addBox(rad, 0.025, 0.34, 0.09, toon('#5c5854'), -0.7 + i * 0.093, 0.28, 0);
  }
  g.add(rad);

  addBox(g, 0.62, 0.05, 0.1, brass, map.x, map.y + map.h / 2 + 0.14, map.z + 0.08);
  const glow = toon('#fff1c4', { emissive: '#fff1c4', emissiveIntensity: 0.85 });
  addBox(g, 0.46, 0.02, 0.05, glow, map.x, map.y + map.h / 2 + 0.1, map.z + 0.1, { noCast: true });
  const picture = new THREE.PointLight(0xffe2b0, 0.85, 3.4, 2);
  picture.position.set(map.x, map.y + 0.15, map.z + 0.55);
  g.add(picture);

  return g;
}

function fillBay(parent, bay, index) {
  const g = new THREE.Group();
  g.position.set(bay.x, 0, bay.z);
  g.rotation.y = bay.rotY || 0;
  g.name = 'records-' + bay.bay;
  // Case back panel faces the room (+Z after centering). Records sit proud of that face.
  const shelves = [0.04, 0.56, 1.08, 1.6];
  const titles = ['DEED', 'MINUTES', 'CENSUS', 'RATE', 'WILL', 'LEASE', 'TAX', 'PLAN'];
  const faceZ = 0.3;
  shelves.forEach((y, s) => {
    const cartons = (index + s) % 3 !== 1;
    if (cartons) {
      let x = -0.34;
      const count = 3 - (s % 2);
      for (let i = 0; i < count; i++) {
        const bw = 0.2 + ((i + s + index) % 2) * 0.05;
        const bh = 0.16 + (i % 2) * 0.04;
        addBox(g, bw, bh, 0.14, spine(i % 2 ? '#9aa196' : '#d2c0a2'), x + bw / 2, y + bh / 2, faceZ);
        const label = titles[(index * 3 + s + i) % titles.length];
        const face = paperMat('#f4ecd8', labelTexture(label, {
          w: 128, h: 64, bg: '#f4ecd8', fg: '#2c241c', font: '700 26px sans-serif',
        }), 0.2);
        addBox(g, bw * 0.82, bh * 0.4, 0.008, face, x + bw / 2, y + bh * 0.55, faceZ + 0.078, { noCast: true });
        x += bw + 0.02;
      }
    } else {
      let x = -0.34;
      for (let i = 0; i < 8; i++) {
        const bw = 0.042 + (i % 3) * 0.01;
        const bh = 0.26 + ((i + s) % 4) * 0.03;
        const lean = i === 6 ? 0.1 : 0;
        addBox(
          g, bw, bh, 0.12,
          spine(BINDINGS[(i + index * 2 + s) % BINDINGS.length]),
          x, y + bh / 2, faceZ,
          { rotZ: lean },
        );
        x += bw + 0.01;
      }
    }
  });
  const plate = paperMat('#e6d3a1', labelTexture('BAY ' + bay.bay, {
    w: 256, h: 96, bg: '#e6d3a1', fg: '#3a2a1c', font: '700 44px serif',
  }), 0.18);
  addBox(g, 0.26, 0.09, 0.018, plate, 0, 2.05, 0.2, { noCast: true });
  parent.add(g);
}

function flatFiles(parent, spec, mats) {
  const g = new THREE.Group();
  g.position.set(spec.x, 0, spec.z);
  g.rotation.y = spec.rotY || 0;
  g.userData.contact = true;
  g.name = 'flatfiles';
  const w = spec.w;
  const d = spec.d;
  const h = spec.h;
  const rows = spec.rows || 6;
  addBox(g, w + 0.04, 0.08, d - 0.06, mats.woodDark, 0, 0.04, 0);
  addBox(g, 0.04, h - 0.1, d, mats.wood, -w / 2 + 0.02, 0.08 + (h - 0.1) / 2, 0);
  addBox(g, 0.04, h - 0.1, d, mats.wood, w / 2 - 0.02, 0.08 + (h - 0.1) / 2, 0);
  addBox(g, w - 0.04, h - 0.12, 0.04, mats.woodDark, 0, 0.08 + (h - 0.12) / 2, -d / 2 + 0.03);
  addBox(g, w + 0.06, 0.05, d + 0.05, mats.wood, 0, h - 0.025, 0.015);
  addBox(g, w, 0.012, 0.025, mats.brass, 0, h - 0.055, d / 2 + 0.02);
  const faceH = (h - 0.18) / rows;
  for (let i = 0; i < rows; i++) {
    const open = spec.open === i;
    const slide = open ? 0.36 : 0;
    const y = 0.11 + faceH * (i + 0.5);
    const drawer = new THREE.Group();
    drawer.position.z = slide;
    addBox(drawer, w - 0.12, faceH - 0.02, d - 0.1, mats.wood, 0, y, -0.02);
    addBox(drawer, w - 0.1, faceH - 0.028, 0.022, mats.woodDark, 0, y, d / 2 - 0.03);
    const face = paperMat('#f3ead4', labelTexture(spec.label + '   ' + (i + 1), {
      w: 320, h: 72, bg: '#f3ead4', fg: '#2a2118', font: '700 28px sans-serif',
    }), 0.16);
    addBox(drawer, Math.min(0.46, w * 0.4), faceH * 0.46, 0.008, face, 0, y, d / 2 + 0.005, { noCast: true });
    addCyl(drawer, 0.012, 0.012, 0.1, mats.brass, -0.18, y, d / 2 + 0.03, 8, { rotZ: Math.PI / 2 });
    addCyl(drawer, 0.012, 0.012, 0.1, mats.brass, 0.18, y, d / 2 + 0.03, 8, { rotZ: Math.PI / 2 });
    if (open) {
      const sheet = paperMat('#f3e6c8', countyMapTexture(), 0.28);
      addBox(drawer, w * 0.62, 0.006, d * 0.46, sheet, 0.02, y + faceH * 0.42, d * 0.08, { noCast: true });
      addBox(drawer, 0.12, 0.03, 0.08, mats.woodDark, -0.16, y + faceH * 0.46, d * 0.22);
    }
    g.add(drawer);
  }
  parent.add(g);
}

function docTable(parent, spec, mats) {
  const g = new THREE.Group();
  g.position.set(spec.x, 0, spec.z);
  g.userData.contact = true;
  g.name = spec.id || 'table';
  const w = spec.w;
  const d = spec.d;
  const top = spec.top || 0.76;
  addBox(g, w, 0.04, d, mats.top, 0, top - 0.02, 0);
  addBox(g, w - 0.06, 0.025, d - 0.06, mats.wood, 0, top - 0.05, 0);
  addBox(g, w - 0.14, 0.08, 0.028, mats.woodDark, 0, top - 0.1, d / 2 - 0.06);
  addBox(g, w - 0.14, 0.08, 0.028, mats.woodDark, 0, top - 0.1, -d / 2 + 0.06);
  addBox(g, 0.028, 0.08, d - 0.14, mats.woodDark, w / 2 - 0.07, top - 0.1, 0);
  addBox(g, 0.028, 0.08, d - 0.14, mats.woodDark, -w / 2 + 0.07, top - 0.1, 0);
  const ix = w / 2 - 0.14;
  const iz = d / 2 - 0.14;
  for (const x of [-ix, ix]) {
    for (const z of [-iz, iz]) {
      addCyl(g, 0.042, 0.055, top - 0.1, mats.wood, x, (top - 0.1) / 2, z, 10);
    }
  }
  addBox(g, w - 0.4, 0.04, 0.04, mats.woodDark, 0, 0.16, 0);
  addBox(g, 0.04, 0.04, d - 0.4, mats.woodDark, 0, 0.16, 0);

  addBox(g, 1.15, 0.008, 0.62, mats.green, -0.15, top + 0.004, 0.02);
  const sheet = paperMat('#f3e6c8', countyMapTexture(), 0.26);
  addBox(g, 0.72, 0.006, 0.48, sheet, -0.2, top + 0.012, 0.02, { rotY: -0.08, noCast: true });
  addBox(g, 0.34, 0.012, 0.26, mats.folder, 0.55, top + 0.01, -0.18);
  addBox(g, 0.3, 0.004, 0.22, paperMat('#f7f1e4', null, 0.12), 0.58, top + 0.02, -0.16, { noCast: true });
  addCyl(g, 0.035, 0.035, 0.42, paperMat('#efe6cf', null, 0.1), 0.85, top + 0.04, 0.22, 10, { rotZ: Math.PI / 2 });
  addBox(g, 0.08, 0.025, 0.06, mats.woodDark, 0.95, top + 0.02, 0.22);
  addBox(g, 0.16, 0.012, 0.012, mats.woodDark, 0.15, top + 0.02, 0.28);
  parent.add(g);
}

function librarianDesk(parent, spec, mats) {
  const g = new THREE.Group();
  g.position.set(spec.x, 0, spec.z);
  g.rotation.y = spec.rotY || 0;
  g.userData.contact = true;
  g.name = 'librarian-desk';
  const hd = spec.d / 2;

  addBox(g, 0.64, 1.0, spec.d - 0.06, mats.wood, -0.42, 0.5, 0);
  addBox(g, 0.7, 0.05, spec.d, mats.top, -0.4, 1.045, 0);
  addBox(g, 0.02, 0.7, spec.d - 0.4, mats.woodDark, -0.74, 0.5, 0);
  addCyl(g, 0.016, 0.016, spec.d - 0.55, mats.brass, -0.8, 0.16, 0, 8, { rotX: Math.PI / 2 });
  addCyl(g, 0.014, 0.014, 0.16, mats.brass, -0.8, 0.08, -hd + 0.4, 8);
  addCyl(g, 0.014, 0.014, 0.16, mats.brass, -0.8, 0.08, hd - 0.4, 8);

  addBox(g, 0.08, 0.72, 0.08, mats.wood, 0.02, 0.36, -hd + 0.2);
  addBox(g, 0.08, 0.72, 0.08, mats.wood, 0.02, 0.36, hd - 0.2);
  addBox(g, 0.08, 0.72, 0.08, mats.wood, 0.66, 0.36, -hd + 0.2);
  addBox(g, 0.08, 0.72, 0.08, mats.wood, 0.66, 0.36, hd - 0.2);
  addBox(g, 0.78, 0.045, spec.d - 0.18, mats.top, 0.32, 0.725, 0);
  addBox(g, 0.7, 0.04, 0.04, mats.woodDark, 0.32, 0.16, 0);

  const paneL = (spec.d - 0.78) / 2;
  const paneZ = 0.39 + paneL / 2;
  for (const z of [-paneZ, paneZ]) {
    const pane = addBox(g, 0.016, 0.5, paneL, mats.glass, -0.7, 1.32, z, { noCast: true });
    pane.renderOrder = 2;
  }
  for (const z of [-hd + 0.06, -0.39, 0.39, hd - 0.06]) {
    addBox(g, 0.03, 0.56, 0.03, mats.brass, -0.7, 1.34, z);
  }
  addBox(g, 0.03, 0.03, spec.d - 0.06, mats.brass, -0.7, 1.58, 0);
  addBox(g, 0.03, 0.03, spec.d - 0.06, mats.brass, -0.7, 1.08, 0);

  const plaque = paperMat('#f4ecd8', labelTexture('ENQUIRIES', {
    w: 512, h: 128, bg: '#f4ecd8', fg: '#3a2a1c', font: '700 64px serif',
  }), 0.2);
  addBox(g, 0.62, 0.16, 0.02, plaque, -0.4, 1.28, hd + 0.012, { noCast: true });

  addBox(g, 0.55, 0.008, 0.7, mats.green, 0.32, 0.752, 0.05);
  addBox(g, 0.22, 0.01, 0.16, paperMat('#f7f1e4', null, 0.12), 0.22, 0.76, 0.15, { noCast: true });
  addBox(g, 0.1, 0.04, 0.08, mats.woodDark, 0.48, 0.77, -0.15);

  function tray(z, word) {
    addBox(g, 0.28, 0.05, 0.2, mats.wood, -0.42, 1.09, z);
    const lab = paperMat('#f4ecd8', labelTexture(word, {
      w: 128, h: 48, bg: '#f4ecd8', font: '700 24px sans-serif',
    }), 0.14);
    addBox(g, 0.16, 0.04, 0.008, lab, -0.42, 1.1, z + 0.1, { noCast: true });
  }
  tray(-0.55, 'IN');
  tray(0.15, 'OUT');

  addCyl(g, 0.045, 0.05, 0.02, mats.brass, -0.42, 1.08, 0.85, 12);
  addCyl(g, 0.028, 0.04, 0.05, mats.brass, -0.42, 1.115, 0.85, 10);

  const catZ = -hd + 0.28;
  addBox(g, 0.46, 0.72, 0.36, mats.woodDark, -0.42, 0.4, catZ);
  for (let i = 0; i < 4; i++) {
    const y = 0.16 + i * 0.16;
    addBox(g, 0.4, 0.12, 0.02, mats.wood, -0.42, y, catZ + 0.18);
    addCyl(g, 0.01, 0.01, 0.08, mats.brass, -0.42, y, catZ + 0.2, 6, { rotZ: Math.PI / 2 });
  }
  parent.add(g);
}

function bookTrolley(parent, spec, mats) {
  const g = new THREE.Group();
  g.position.set(spec.x, 0, spec.z);
  g.rotation.y = spec.rotY || 0;
  g.userData.contact = true;
  g.name = 'trolley';
  const w = spec.w;
  const d = spec.d;
  const corners = [[-1, -1], [1, -1], [-1, 1], [1, 1]];
  for (const [sx, sz] of corners) {
    const x = sx * (w / 2);
    const z = sz * (d / 2);
    const tall = sz > 0;
    const ph = tall ? 1.02 : 0.84;
    addBox(g, 0.035, ph - 0.07, 0.035, mats.wood, x, (ph - 0.07) / 2 + 0.07, z);
    addCyl(g, 0.012, 0.012, 0.05, mats.metal, x, 0.055, z, 8);
    addCyl(g, 0.04, 0.04, 0.02, mats.metalDark, x, 0.04, z, 12, { rotZ: Math.PI / 2 });
  }
  for (const y of [0.2, 0.48, 0.74]) addBox(g, w - 0.02, 0.02, d - 0.04, mats.wood, 0, y, 0);
  addCyl(g, 0.016, 0.016, w + 0.04, mats.brass, 0, 1.04, d / 2, 8, { rotZ: Math.PI / 2 });
  addBox(g, 0.28, 0.12, 0.2, mats.box, -0.04, 0.27, -0.1);
  addBox(g, 0.22, 0.1, 0.16, mats.boxAlt, 0.08, 0.26, 0.16);
  addBox(g, 0.2, 0.16, 0.012, mats.folder, -0.06, 0.58, 0.02, { rotZ: 0.08 });
  addBox(g, 0.18, 0.14, 0.01, toon('#7a3030'), 0.08, 0.56, -0.08, { rotZ: -0.06 });
  addBox(g, 0.26, 0.025, 0.18, mats.folder, 0.02, 0.77, 0.05);
  addCyl(g, 0.03, 0.03, 0.28, paperMat('#efe6cf', null, 0.1), -0.08, 0.79, -0.12, 8, { rotZ: Math.PI / 2 });
  parent.add(g);
}

function dressCarrels(parent, layout, mats) {
  for (const inst of layout.instances) {
    if (inst.kind !== 'study_desk') continue;
    const [x, , z] = inst.position;
    const num = inst.id.endsWith('12') ? '12' : '14';
    const tent = paperMat('#f4ecd8', labelTexture(num, {
      w: 128, h: 128, bg: '#f4ecd8', fg: '#3a2a1c', font: '700 72px serif',
    }), 0.16);
    addBox(parent, 0.1, 0.08, 0.012, tent, x, 0.82, z + 0.28, { noCast: true });
    addBox(parent, 0.32, 0.008, 0.24, mats.folder, x - 0.02, 0.768, z - 0.05);
    addBox(parent, 0.28, 0.004, 0.2, paperMat('#f7f1e4', null, 0.12), x + 0.04, 0.776, z + 0.08, { noCast: true });
  }
}

function indexBoxes(parent, layout) {
  const labels = ['A-C', 'D-F', 'G-M'];
  for (const inst of layout.instances) {
    if (inst.kind !== 'wall_shelf') continue;
    const [x, y, z] = inst.position;
    const grp = new THREE.Group();
    grp.position.set(x, y, z);
    grp.rotation.y = inst.rotationY || 0;
    for (const shelfY of [0.19, 0.68]) {
      labels.forEach((word, i) => {
        const bx = -0.22 + i * 0.2;
        addBox(grp, 0.15, 0.14, 0.11, spine(i % 2 ? '#9aa196' : '#d2c0a2'), bx, shelfY + 0.07, 0.0);
        const face = paperMat('#f4ecd8', labelTexture(word, {
          w: 128, h: 64, bg: '#f4ecd8', font: '700 28px sans-serif',
        }), 0.18);
        addBox(grp, 0.11, 0.045, 0.008, face, bx, shelfY + 0.08, 0.06, { noCast: true });
      });
    }
    parent.add(grp);
  }
}

function foliage(parent, x, z) {
  addCyl(parent, 0.018, 0.026, 0.32, toon('#3e4a32'), x, 0.36, z, 6);
  addBox(parent, 0.26, 0.16, 0.2, toon('#3d6a42'), x, 0.56, z);
  addBox(parent, 0.16, 0.12, 0.14, toon('#2f5a38'), x + 0.05, 0.64, z - 0.03);
}

function charterHood(parent, layout, mats) {
  const inst = layout.instances.find((i) => i.kind === 'museum_vitrine');
  if (!inst) return;
  const [x, , z] = inst.position;
  const h = layout.assets.museum_vitrine.targetHeight;
  addBox(parent, 0.5, 0.015, 0.5, mats.brass, x, h + 0.01, z);
  const pane = addBox(parent, 0.46, 0.36, 0.46, mats.glass, x, h + 0.2, z, { noCast: true });
  pane.renderOrder = 2;
  addBox(parent, 0.48, 0.015, 0.015, mats.brass, x, h + 0.38, z + 0.22);
  addBox(parent, 0.48, 0.015, 0.015, mats.brass, x, h + 0.38, z - 0.22);
  addBox(parent, 0.015, 0.015, 0.48, mats.brass, x + 0.22, h + 0.38, z);
  addBox(parent, 0.015, 0.015, 0.48, mats.brass, x - 0.22, h + 0.38, z);
  const sheet = paperMat('#f3e6c8', countyMapTexture(), 0.22);
  addBox(parent, 0.32, 0.006, 0.24, sheet, x, h + 0.03, z, { noCast: true });
}

function atlasSheet(parent, spec) {
  const g = new THREE.Group();
  g.position.set(spec.x, 1.02, spec.z);
  g.rotation.y = (spec.rotY || 0) + 0.2;
  g.rotation.x = -0.5;
  const sheet = paperMat('#f3e6c8', countyMapTexture(), 0.24);
  addBox(g, 0.46, 0.008, 0.34, sheet, 0, 0, 0, { noCast: true });
  parent.add(g);
}

function pendantCords(parent, layout) {
  const ph = layout.assets.pendant_lamp.targetHeight;
  const cord = toon('#2a241e');
  for (const inst of layout.instances) {
    if (inst.kind !== 'pendant_lamp') continue;
    const [x, y, z] = inst.position;
    const top = y + ph;
    const ceil = 3.4;
    if (ceil - top > 0.04) {
      addCyl(parent, 0.006, 0.006, ceil - top, cord, x, (top + ceil) / 2, z, 6, { noCast: true });
    }
  }
}

function taskLights(parent, layout) {
  for (const inst of layout.instances) {
    if (inst.kind !== 'library_lamp' && inst.kind !== 'pendant_lamp') continue;
    const warm = inst.kind === 'library_lamp';
    const light = new THREE.PointLight(warm ? 0xffc98a : 0xffe0b0, warm ? 0.7 : 0.55, warm ? 2.8 : 4.2, 2);
    const [x, y, z] = inst.position;
    light.position.set(x, y + (warm ? 0.22 : -0.05), z);
    parent.add(light);
  }
}

function makeProcedural(layout) {
  const g = new THREE.Group();
  g.name = 'procedural';
  const mats = palette(layout);
  const build = layout.build;

  build.recordBays.forEach((bay, i) => fillBay(g, bay, i));
  for (const drawer of build.drawers) flatFiles(g, drawer, mats);
  for (const table of build.tables) docTable(g, table, mats);
  librarianDesk(g, build.desk, mats);
  bookTrolley(g, build.trolley, mats);
  dressCarrels(g, layout, mats);
  indexBoxes(g, layout);
  charterHood(g, layout, mats);
  atlasSheet(g, build.atlas);
  pendantCords(g, layout);
  taskLights(g, layout);
  const bayLight = new THREE.PointLight(0xffe4c2, 1.05, 7.5, 2);
  bayLight.position.set(-3.2, 1.85, -2.55);
  g.add(bayLight);
  const sideLight = new THREE.PointLight(0xffe4c2, 0.55, 4.5, 2);
  sideLight.position.set(-4.3, 1.6, 2.4);
  g.add(sideLight);

  for (const inst of layout.instances) {
    if (inst.kind === 'flowerpot') foliage(g, inst.position[0], inst.position[2]);
  }

  const rules = labelTexture('READER RULES\nPencils only\nOne box at a time\nReturn maps to drawers', {
    w: 512,
    h: 640,
    bg: '#f4ecd8',
    fg: '#2a2118',
    font: '600 54px serif',
  });
  framed(g, -5.64, 1.72, 2.05, Math.PI / 2, 0.62, 0.82, rules, mats.wood);
  framed(g, build.map.x, build.map.y, build.map.z, 0, build.map.w, build.map.h, countyMapTexture(), mats.wood);

  return g;
}

boot({
  makeShell,
  makeProcedural,
  readyText: 'ready — archive research room · drag orbit · U unlit · T toon',
});
