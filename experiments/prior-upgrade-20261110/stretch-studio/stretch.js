import * as THREE from 'three';
import { boot, toon, addBox, addCyl } from './scene_lib.js';

const PAL = {
  plaster: '#eef3ee',
  plasterDeep: '#dfe8df',
  sage: '#6f8f7c',
  sageDeep: '#4f6d5c',
  sageLite: '#a3b9a8',
  linen: '#f3eee4',
  linenShadow: '#e2d8c6',
  oak: '#c4a06a',
  oakDeep: '#8a623c',
  oakLite: '#d8b888',
  cork: '#e0c08a',
  corkDeep: '#c9a56e',
  terracotta: '#c45a4a',
  sand: '#d4b896',
  mauve: '#8a6e86',
  glass: '#d4e8e2',
  mirror: '#c8d8e0',
  bronze: '#a88858',
};

const SLAT = {
  colors: ['#d7c09a', '#c9ae86', '#e0c9a4', '#c4a878'],
  widths: [0.07, 0.058, 0.08, 0.064, 0.074],
};

function matOf(color, opts) {
  return toon(color, opts);
}

function makePlankMap() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  const tones = ['#e6d0ae', '#d8be96', '#eed8b4', '#cbb28a', '#e2c9a2', '#d2b48c'];
  const n = tones.length;
  const pw = canvas.width / n;
  for (let i = 0; i < n; i++) {
    ctx.fillStyle = tones[i];
    ctx.fillRect(i * pw, 0, pw + 1, canvas.height);
    ctx.fillStyle = 'rgba(92, 62, 32, 0.38)';
    ctx.fillRect(i * pw, 0, 3, canvas.height);
    ctx.strokeStyle = 'rgba(110, 72, 36, 0.16)';
    ctx.lineWidth = 1;
    for (let k = 1; k <= 3; k++) {
      const x = i * pw + (pw * k) / 4;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x + 1.2, canvas.height);
      ctx.stroke();
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.repeat.set(8, 2);
  return tex;
}

function slatsAlong(g, axis, a0, a1, y0, y1, fixed, depth, skipRanges, mats) {
  let a = a0;
  let i = 0;
  while (a < a1 - 0.03) {
    const w = SLAT.widths[i % SLAT.widths.length];
    const mid = a + w / 2;
    const skipped = skipRanges.some(([s0, s1]) => mid > s0 && mid < s1);
    if (!skipped && a + w <= a1 + 0.001) {
      const mesh =
        axis === 'x'
          ? addBox(g, w, y1 - y0, depth, mats[i % mats.length], mid, (y0 + y1) / 2, fixed)
          : addBox(g, depth, y1 - y0, w, mats[i % mats.length], fixed, (y0 + y1) / 2, mid);
      mesh.userData.receiveOnly = true;
    }
    a += w + 0.012;
    i += 1;
  }
}

function addFloor(g, W, D) {
  const mat = matOf('#ffffff', { map: makePlankMap() });
  const floor = addBox(g, W, 0.08, D, mat, 0, -0.04, 0);
  floor.userData.receiveOnly = true;
  floor.name = 'floor';
}

function addWalls(g, layout) {
  const { width: W, depth: D, height: H } = layout.meta.room;
  const plaster = matOf(PAL.plaster);
  const oak = matOf(PAL.oakDeep);
  const sage = matOf(PAL.sage);
  const slatMats = SLAT.colors.map((c) => matOf(c));
  const cubbies = layout.architecture.cubbies;
  const shoes = layout.architecture.shoes;
  const mirror = layout.architecture.mirror;
  const backInner = -D / 2 + 0.12;
  const leftInner = -W / 2 + 0.12;

  const back = addBox(g, W, H, 0.12, plaster, 0, H / 2, -D / 2 + 0.06);
  back.userData.receiveOnly = true;
  const left = addBox(g, 0.12, H, D, plaster, -W / 2 + 0.06, H / 2, 0);
  left.userData.receiveOnly = true;

  addBox(g, 0.08, H, 0.08, oak, W / 2 - 0.04, H / 2, backInner - 0.02);
  addBox(g, 0.08, H, 0.08, oak, leftInner - 0.02, H / 2, D / 2 - 0.04);

  slatsAlong(g, 'x', -W / 2 + 0.2, mirror.x0 - 0.08, 0.16, 2.42, backInner + 0.02, 0.024, [], slatMats);
  slatsAlong(g, 'x', mirror.x1 + 0.08, W / 2 - 0.18, 0.16, 2.42, backInner + 0.02, 0.024, [], slatMats);
  slatsAlong(
    g,
    'z',
    -D / 2 + 0.2,
    D / 2 - 0.16,
    0.16,
    2.42,
    leftInner + 0.02,
    0.024,
    [
      [cubbies.z0 - 0.04, cubbies.z1 + 0.04],
      [shoes.z0 - 0.04, shoes.z1 + 0.04],
    ],
    slatMats
  );

  addBox(g, W - 0.22, 0.1, 0.04, sage, 0.04, 0.05, backInner + 0.03);
  addBox(g, 0.04, 0.1, D - 0.28, sage, leftInner + 0.03, 0.05, 0);
  addBox(g, W - 0.28, 0.05, 0.04, oak, 0.04, 2.46, backInner + 0.03);
  addBox(g, 0.04, 0.05, D - 0.32, oak, leftInner + 0.034, 2.46, 0);
}

function addCeiling(g, layout) {
  const ceil = layout.architecture.ceiling;
  const plaster = matOf(layout.shell.ceilingColor);
  const oak = matOf(PAL.oakDeep);
  const lite = matOf(PAL.oakLite);
  const t = 0.08;
  const cx = (ceil.x0 + ceil.x1) / 2;
  const cz = (ceil.z0 + ceil.z1) / 2;
  const soffit = addBox(g, ceil.x1 - ceil.x0, t, ceil.z1 - ceil.z0, plaster, cx, ceil.y, cz);
  soffit.userData.receiveOnly = true;
  soffit.name = 'ceiling';

  const beamZs = [-3.15, -1.55, 0.05, 1.12];
  for (const z of beamZs) {
    const beam = addBox(g, ceil.x1 - ceil.x0 - 0.16, 0.12, 0.08, oak, cx, ceil.y - 0.1, z);
    beam.userData.receiveOnly = true;
  }
  addBox(g, 0.08, 0.12, ceil.z1 - ceil.z0 - 0.1, oak, ceil.x0 + 0.18, ceil.y - 0.1, cz);
  addBox(g, 0.08, 0.12, ceil.z1 - ceil.z0 - 0.1, oak, ceil.x1 - 0.18, ceil.y - 0.1, cz);

  const cove = addBox(
    g,
    ceil.x1 - ceil.x0 - 0.3,
    0.03,
    0.04,
    matOf('#fff4e0', { emissive: '#ffe9c4', emissiveIntensity: 0.85 }),
    cx,
    ceil.y - 0.07,
    ceil.z1 - 0.04
  );
  cove.userData.noShadow = true;
  cove.name = 'cove-light';

  addBox(g, ceil.x1 - ceil.x0, 0.05, 0.07, lite, cx, ceil.y - 0.04, ceil.z1);
}

function addMirror(g, layout) {
  const m = layout.architecture.mirror;
  const oak = matOf(PAL.oakDeep);
  const lite = matOf(PAL.oakLite);
  const glass = matOf(PAL.mirror, { side: THREE.DoubleSide });
  const cx = (m.x0 + m.x1) / 2;
  const cy = (m.y0 + m.y1) / 2;
  const w = m.x1 - m.x0;
  const h = m.y1 - m.y0;

  const pane = addBox(g, w - 0.1, h - 0.1, 0.02, glass, cx, cy, m.z + 0.01);
  pane.userData.receiveOnly = true;
  pane.name = 'mirror-glass';
  addBox(g, w - 0.16, (h - 0.16) * 0.18, 0.004, matOf('#d8e6ec'), cx, m.y1 - 0.22, m.z + 0.022);

  addBox(g, w + 0.12, 0.08, 0.07, oak, cx, m.y1 + 0.02, m.z + 0.02);
  addBox(g, w + 0.12, 0.08, 0.07, oak, cx, m.y0 - 0.02, m.z + 0.02);
  addBox(g, 0.08, h + 0.12, 0.07, oak, m.x0 - 0.02, cy, m.z + 0.02);
  addBox(g, 0.08, h + 0.12, 0.07, oak, m.x1 + 0.02, cy, m.z + 0.02);
  const split = w / 3;
  addBox(g, 0.045, h - 0.08, 0.045, lite, m.x0 + split, cy, m.z + 0.03);
  addBox(g, 0.045, h - 0.08, 0.045, lite, m.x0 + split * 2, cy, m.z + 0.03);

  addBox(g, w + 0.16, 0.04, 0.16, oak, cx, m.y0 - 0.08, m.z + 0.1);
}

function addClerestory(g, layout) {
  const c = layout.architecture.clerestory;
  const oak = matOf(PAL.oakDeep);
  const glass = matOf(PAL.glass, {
    transparent: true,
    opacity: 0.32,
    side: THREE.DoubleSide,
    emissive: '#e8f4ee',
    emissiveIntensity: 0.28,
  });
  const cx = (c.x0 + c.x1) / 2;
  const cy = (c.y0 + c.y1) / 2;
  const w = c.x1 - c.x0;
  const h = c.y1 - c.y0;
  const panes = c.panes || 5;

  addBox(g, w + 0.1, 0.06, 0.07, oak, cx, c.y1 + 0.02, c.z + 0.02);
  addBox(g, w + 0.1, 0.07, 0.12, oak, cx, c.y0 - 0.02, c.z + 0.06);
  addBox(g, 0.06, h + 0.08, 0.07, oak, c.x0, cy, c.z + 0.02);
  addBox(g, 0.06, h + 0.08, 0.07, oak, c.x1, cy, c.z + 0.02);

  const inner = w - 0.12;
  const paneW = inner / panes;
  for (let i = 0; i < panes; i++) {
    const x = c.x0 + 0.06 + paneW * (i + 0.5);
    const pane = addBox(g, paneW - 0.04, h - 0.08, 0.03, glass, x, cy, c.z + 0.01);
    pane.userData.noShadow = true;
    if (i > 0) addBox(g, 0.04, h - 0.04, 0.05, oak, c.x0 + 0.06 + paneW * i, cy, c.z + 0.02);
  }

  addBox(g, w + 0.08, 0.05, 0.1, matOf(PAL.linen), cx, c.y1 + 0.08, c.z + 0.08);
  addBox(g, w + 0.04, 0.09, 0.04, matOf(PAL.linenShadow), cx, c.y1 + 0.02, c.z + 0.1);
}

function addDrapes(g, layout) {
  const m = layout.architecture.mirror;
  const folds = [PAL.linen, PAL.linenShadow, PAL.linen, PAL.sageLite];
  const hang = (x) => {
    for (let i = 0; i < 4; i++) {
      addBox(g, 0.055, 1.72, 0.2, matOf(folds[i]), x + (i % 2) * 0.03, 1.28, m.z + 0.16 + i * 0.02);
    }
    addBox(g, 0.08, 0.05, 0.28, matOf(PAL.oakDeep), x + 0.02, 2.18, m.z + 0.18);
  };
  hang(m.x0 - 0.18);
  hang(m.x1 + 0.12);
}

function addBorder(g, layout) {
  const b = layout.architecture.border;
  const mat = matOf(PAL.oakDeep);
  const t = 0.07;
  const y = 0.012;
  addBox(g, b.x1 - b.x0, 0.012, t, mat, (b.x0 + b.x1) / 2, y, b.z0);
  addBox(g, b.x1 - b.x0, 0.012, t, mat, (b.x0 + b.x1) / 2, y, b.z1);
  addBox(g, t, 0.012, b.z1 - b.z0, mat, b.x0, y, (b.z0 + b.z1) / 2);
  addBox(g, t, 0.012, b.z1 - b.z0, mat, b.x1, y, (b.z0 + b.z1) / 2);
}

function addPlatform(g, layout) {
  const p = layout.architecture.platform;
  const mesh = addBox(
    g,
    p.x1 - p.x0,
    p.h,
    p.z1 - p.z0,
    matOf('#c9a36e'),
    (p.x0 + p.x1) / 2,
    p.h / 2,
    (p.z0 + p.z1) / 2
  );
  mesh.userData.receiveOnly = true;
  mesh.name = 'instructor-platform';
  addBox(
    g,
    p.x1 - p.x0 + 0.02,
    0.026,
    0.045,
    matOf(PAL.oakDeep),
    (p.x0 + p.x1) / 2,
    p.h - 0.012,
    p.z1 + 0.01
  );
}

function addLedge(g, layout) {
  const a = layout.architecture.ledge;
  const wood = matOf(PAL.oakLite);
  addBox(g, a.w, 0.04, a.d, wood, a.x, a.y, a.z);
  addBox(g, 0.035, 0.14, 0.035, matOf(PAL.oakDeep), a.x - a.w * 0.42, a.y - 0.08, a.z);
  addBox(g, 0.035, 0.14, 0.035, matOf(PAL.oakDeep), a.x + a.w * 0.42, a.y - 0.08, a.z);
  addBox(g, 0.2, 0.09, 0.14, matOf(PAL.cork), a.x - 0.85, a.y + 0.065, a.z);
  addBox(g, 0.2, 0.09, 0.14, matOf(PAL.corkDeep), a.x - 0.62, a.y + 0.065, a.z);
}

function addShell(layout) {
  const g = new THREE.Group();
  g.name = 'shell';
  const { width: W, depth: D } = layout.meta.room;
  addFloor(g, W, D);
  addWalls(g, layout);
  addCeiling(g, layout);
  addMirror(g, layout);
  addClerestory(g, layout);
  addDrapes(g, layout);
  addPlatform(g, layout);
  addBorder(g, layout);
  addLedge(g, layout);
  return g;
}

let shadowMat;
function contactMat() {
  if (!shadowMat) {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    const grd = ctx.createRadialGradient(64, 64, 8, 64, 64, 62);
    grd.addColorStop(0, 'rgba(58, 48, 32, 0.4)');
    grd.addColorStop(0.58, 'rgba(58, 48, 32, 0.14)');
    grd.addColorStop(1, 'rgba(58, 48, 32, 0)');
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, 128, 128);
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    shadowMat = new THREE.MeshBasicMaterial({
      map: tex,
      transparent: true,
      depthWrite: false,
      toneMapped: false,
    });
    shadowMat.polygonOffset = true;
    shadowMat.polygonOffsetFactor = -4;
    shadowMat.polygonOffsetUnits = -4;
  }
  return shadowMat;
}

function addPad(g, w, d, x, y, z) {
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, d), contactMat());
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set(x, y, z);
  mesh.userData.shade = 'decal';
  g.add(mesh);
  return mesh;
}

function addMat(g, spec, size) {
  const { w, l, t } = size;
  const y = spec.y || 0;
  const body = addBox(g, w, t, l, matOf(spec.color), spec.x, y + t / 2, spec.z);
  body.name = spec.id;
  const edge = matOf(new THREE.Color(spec.color).multiplyScalar(0.78));
  const roll = addCyl(g, t * 0.55, t * 0.55, l * 0.98, edge, spec.x + w / 2 - 0.004, y + t * 0.45, spec.z, 10);
  roll.rotation.x = Math.PI / 2;
  const rollB = addCyl(g, t * 0.55, t * 0.55, l * 0.98, edge, spec.x - w / 2 + 0.004, y + t * 0.45, spec.z, 10);
  rollB.rotation.x = Math.PI / 2;
  const head = (spec.head ?? 1) * (l / 2 - 0.06);
  addBox(
    g,
    w * 0.84,
    0.004,
    0.07,
    matOf(new THREE.Color(spec.color).multiplyScalar(0.7)),
    spec.x,
    y + t + 0.003,
    spec.z + head
  );
  addPad(g, w + 0.16, l + 0.16, spec.x, y + 0.006, spec.z);

  const props = spec.props || [];
  if (props.includes('blocks')) {
    const hz = head - (spec.head ?? 1) * 0.08;
    addBox(g, 0.22, 0.1, 0.15, matOf(PAL.cork), spec.x - 0.12, y + t + 0.05, spec.z + hz);
    addBox(g, 0.22, 0.1, 0.15, matOf(PAL.corkDeep), spec.x + 0.12, y + t + 0.05, spec.z + hz);
    const strap = new THREE.Mesh(new THREE.TorusGeometry(0.075, 0.008, 6, 18), matOf(PAL.mauve));
    strap.rotation.x = Math.PI / 2;
    strap.position.set(spec.x, y + t + 0.012, spec.z + hz - (spec.head ?? 1) * 0.2);
    g.add(strap);
  }
  if (props.includes('blanket')) {
    const tz = -(spec.head ?? 1) * (l / 2 - 0.24);
    addBox(g, 0.4, 0.02, 0.36, matOf(PAL.linen), spec.x, y + t + 0.014, spec.z + tz);
    addBox(g, 0.36, 0.018, 0.32, matOf(PAL.sand), spec.x, y + t + 0.032, spec.z + tz);
  }
  if (props.includes('bolster')) {
    const bx = spec.x + (w / 2 + 0.22);
    const bolster = addCyl(g, 0.11, 0.11, 0.64, matOf(PAL.sand), bx, y + 0.11, spec.z, 16);
    bolster.rotation.z = Math.PI / 2;
    addCyl(g, 0.07, 0.07, 0.02, matOf('#b7a288'), bx - 0.31, y + 0.11, spec.z, 12).rotation.z = Math.PI / 2;
    addCyl(g, 0.07, 0.07, 0.02, matOf('#b7a288'), bx + 0.31, y + 0.11, spec.z, 12).rotation.z = Math.PI / 2;
    addPad(g, 0.8, 0.32, bx, y + 0.008, spec.z);
  }
}

function addCubbies(g, cub) {
  const { x0, x1, z0, z1, h } = cub;
  const w = x1 - x0;
  const d = z1 - z0;
  const xc = (x0 + x1) / 2;
  const zc = (z0 + z1) / 2;
  const wood = matOf(PAL.oakLite);
  const dark = matOf(PAL.oakDeep);
  const back = matOf('#6e4a32');
  const t = 0.028;

  const bank = new THREE.Group();
  bank.name = 'cubby-bank';
  g.add(bank);

  addBox(bank, w, 0.06, d, dark, xc, 0.03, zc);
  addBox(bank, w + 0.02, 0.04, d + 0.02, wood, xc, h - 0.02, zc);
  addBox(bank, w - 0.04, h - 0.12, 0.018, back, xc, 0.08 + (h - 0.12) / 2, z0 + 0.02);
  addBox(bank, t, h - 0.1, d - 0.02, wood, x0 + t / 2, 0.08 + (h - 0.1) / 2, zc);
  addBox(bank, t, h - 0.1, d - 0.02, wood, x1 - t / 2, 0.08 + (h - 0.1) / 2, zc);

  const cols = 4;
  const rows = 2;
  const innerZ0 = z0 + t;
  const innerZ1 = z1 - t;
  const slot = (innerZ1 - innerZ0) / cols;
  for (let i = 1; i < cols; i++) {
    addBox(bank, w - 0.06, h - 0.12, 0.022, wood, xc, 0.08 + (h - 0.12) / 2, innerZ0 + slot * i);
  }
  const shelfY = 0.08 + (h - 0.12) / 2;
  addBox(bank, w - 0.05, 0.022, d - 0.06, wood, xc, shelfY, zc);

  const roll = (x, y, z, hh, color) => {
    addCyl(bank, 0.075, 0.075, hh, matOf(color), x, y + hh / 2, z, 14);
    addCyl(bank, 0.032, 0.032, 0.014, dark, x, y + hh + 0.002, z, 10);
  };

  const bayZ = (i) => innerZ0 + slot * (i + 0.5);
  const xFront = xc + 0.08;
  roll(xFront, 0.1, bayZ(0), 0.52, PAL.terracotta);
  roll(xFront - 0.16, 0.1, bayZ(0) + 0.1, 0.44, PAL.sage);
  addBox(bank, 0.42, 0.055, 0.28, matOf(PAL.linen), xFront, 0.14, bayZ(1));
  addBox(bank, 0.4, 0.05, 0.26, matOf(PAL.sageLite), xFront, 0.2, bayZ(1));
  addBox(bank, 0.38, 0.05, 0.24, matOf(PAL.sand), xFront, 0.26, bayZ(1));
  for (let i = 0; i < 3; i++) {
    addBox(bank, 0.2, 0.09, 0.14, matOf(i === 1 ? PAL.cork : PAL.corkDeep), xFront - 0.06, 0.15 + i * 0.095, bayZ(2));
  }
  const coil = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.01, 6, 16), matOf(PAL.mauve));
  coil.rotation.x = Math.PI / 2;
  coil.position.set(xFront + 0.14, 0.18, bayZ(2));
  bank.add(coil);
  const bolster = addCyl(bank, 0.1, 0.1, 0.46, matOf(PAL.sand), xFront, 0.2, bayZ(3), 14);
  bolster.rotation.z = Math.PI / 2;

  roll(xFront, shelfY + 0.03, bayZ(0), 0.48, PAL.mauve);
  roll(xFront - 0.14, shelfY + 0.03, bayZ(1), 0.4, '#3a5a8a');
  addBox(bank, 0.38, 0.05, 0.24, matOf(PAL.linenShadow), xFront, shelfY + 0.08, bayZ(2));
  addBox(bank, 0.36, 0.045, 0.22, matOf(PAL.sage), xFront, shelfY + 0.13, bayZ(2));
  for (let i = 0; i < 2; i++) {
    addBox(bank, 0.2, 0.09, 0.14, matOf(PAL.cork), xFront, shelfY + 0.08 + i * 0.1, bayZ(3));
  }

  addPad(g, w + 0.22, d + 0.22, xc, 0.008, zc);
}

function addShoes(g, sh) {
  const { x0, x1, z0, z1, h } = sh;
  const w = x1 - x0;
  const d = z1 - z0;
  const xc = (x0 + x1) / 2;
  const zc = (z0 + z1) / 2;
  const wood = matOf(PAL.oakLite);
  const dark = matOf(PAL.oakDeep);
  const grp = new THREE.Group();
  grp.name = 'shoe-cubbies';
  g.add(grp);

  addBox(grp, w, 0.05, d, dark, xc, 0.025, zc);
  addBox(grp, w + 0.01, 0.03, d + 0.01, wood, xc, h - 0.015, zc);
  addBox(grp, 0.022, h - 0.08, d - 0.04, wood, x0 + 0.02, 0.08 + (h - 0.08) / 2, zc);
  addBox(grp, 0.022, h - 0.08, d - 0.04, wood, x1 - 0.02, 0.08 + (h - 0.08) / 2, zc);
  addBox(grp, w - 0.05, h - 0.1, 0.016, matOf('#6a4630'), xc, 0.08 + (h - 0.1) / 2, z0 + 0.02);

  const cols = 4;
  const rows = 2;
  const slotZ = (d - 0.08) / cols;
  const slotY = (h - 0.12) / rows;
  for (let i = 1; i < cols; i++) {
    addBox(grp, w - 0.06, h - 0.1, 0.016, wood, xc, 0.08 + (h - 0.1) / 2, z0 + 0.04 + slotZ * i);
  }
  addBox(grp, w - 0.05, 0.016, d - 0.06, wood, xc, 0.08 + slotY, zc);

  const shoeCols = [PAL.linenShadow, PAL.sageDeep, PAL.oakDeep, PAL.mauve];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if ((r + c) % 2 === 0) continue;
      const x = xc + 0.06;
      const y = 0.12 + r * slotY + 0.04;
      const z = z0 + 0.04 + slotZ * (c + 0.5);
      addBox(grp, 0.22, 0.06, 0.1, matOf(shoeCols[c]), x, y, z);
      addBox(grp, 0.08, 0.05, 0.09, matOf(shoeCols[c]), x + 0.12, y - 0.005, z);
    }
  }
  addPad(g, w + 0.18, d + 0.18, xc, 0.008, zc);
}

function addHooks(g, cub) {
  const x = cub.x1 + 0.04;
  const y = cub.h + 0.22;
  addBox(g, 0.03, 0.04, cub.z1 - cub.z0, matOf(PAL.oakDeep), x, y, (cub.z0 + cub.z1) / 2);
  const zs = [-2.85, -2.15, -1.45, -0.75, -0.05];
  zs.forEach((z, i) => {
    const peg = addCyl(g, 0.012, 0.012, 0.07, matOf(PAL.bronze), x + 0.04, y, z, 8);
    peg.rotation.z = Math.PI / 2;
    if (i % 2 === 0) {
      const strap = new THREE.Mesh(new THREE.TorusGeometry(0.08, 0.01, 6, 16), matOf(i === 2 ? PAL.sage : PAL.mauve));
      strap.position.set(x + 0.05, y - 0.12, z);
      strap.rotation.y = Math.PI / 2;
      g.add(strap);
      addBox(g, 0.012, 0.28, 0.04, matOf(i === 0 ? PAL.sageDeep : PAL.terracotta), x + 0.05, y - 0.28, z);
    }
  });
}

function addAltarObjects(g, layout) {
  const a = layout.architecture.ledge;
  const top = a.y + 0.02;
  addCyl(g, 0.1, 0.085, 0.04, matOf(PAL.bronze), a.x - 0.28, top + 0.02, a.z, 16);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.01, 6, 16), matOf('#c6a15c'));
  rim.rotation.x = Math.PI / 2;
  rim.position.set(a.x - 0.28, top + 0.042, a.z);
  g.add(rim);
  addCyl(g, 0.026, 0.028, 0.06, matOf('#f4efe4'), a.x + 0.55, top + 0.03, a.z, 10);
  const flame = addCyl(
    g,
    0.01,
    0.004,
    0.04,
    matOf('#ffb15a', { emissive: '#ff9328', emissiveIntensity: 1.6 }),
    a.x + 0.55,
    top + 0.08,
    a.z,
    8
  );
  flame.userData.noShadow = true;
  const light = new THREE.PointLight('#ffb060', 0.28, 1.8, 2);
  light.position.set(a.x + 0.55, top + 0.14, a.z + 0.04);
  g.add(light);
}

function addFoliage(g, inst, targetHeight) {
  const x = inst.position[0];
  const z = inst.position[2];
  const rim = inst.position[1] + targetHeight * 0.78;
  if (inst.foliage === 'succulent') {
    addCyl(g, 0.05, 0.065, 0.045, matOf('#3f6a48'), x, rim + 0.02, z, 8);
    addCyl(g, 0.032, 0.048, 0.038, matOf('#4e7c56'), x + 0.035, rim + 0.04, z + 0.012, 8);
    addCyl(g, 0.028, 0.038, 0.032, matOf('#2f5a3c'), x - 0.028, rim + 0.035, z - 0.018, 8);
    return;
  }
  if (inst.foliage === 'floor') {
    const stem = matOf('#5a6a42');
    const leafA = matOf('#3e6b4a');
    const leafB = matOf('#4d7d58');
    addCyl(g, 0.012, 0.016, 0.22, stem, x, rim + 0.1, z, 6);
    for (let i = 0; i < 5; i++) {
      const ang = (i / 5) * Math.PI * 2;
      const leaf = addBox(
        g,
        0.14,
        0.012,
        0.32,
        i % 2 ? leafA : leafB,
        x + Math.cos(ang) * 0.06,
        rim + 0.28,
        z + Math.sin(ang) * 0.06
      );
      leaf.rotation.y = -ang;
      leaf.rotation.z = Math.cos(ang) * 0.45;
      leaf.rotation.x = Math.sin(ang) * 0.35;
    }
  }
}

function addPendants(g, layout) {
  for (const inst of layout.instances) {
    if (inst.kind !== 'pendant_lamp') continue;
    const [x, y, z] = inst.position;
    const bulb = addCyl(
      g,
      0.045,
      0.045,
      0.05,
      matOf('#ffe1bf', { emissive: '#ffc98a', emissiveIntensity: 1.45 }),
      x,
      y + 0.12,
      z,
      12
    );
    bulb.userData.noShadow = true;
    const light = new THREE.PointLight('#ffc98a', 0.62, 4.2, 2);
    light.position.set(x, y + 0.16, z);
    g.add(light);
  }
}

function addBasket(g, x, z) {
  addCyl(g, 0.13, 0.11, 0.16, matOf('#c2a078'), x, 0.12, z, 14);
  addCyl(g, 0.09, 0.09, 0.02, matOf('#6e5340'), x, 0.18, z, 12);
  const strap = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.007, 6, 14), matOf(PAL.mauve));
  strap.rotation.x = Math.PI / 2.4;
  strap.position.set(x, 0.2, z);
  g.add(strap);
}

function makeProcedural(layout) {
  const g = new THREE.Group();
  g.name = 'procedural';
  const size = layout.architecture.mat;
  for (const spec of layout.mats) addMat(g, spec, size);
  addCubbies(g, layout.architecture.cubbies);
  addShoes(g, layout.architecture.shoes);
  addHooks(g, layout.architecture.cubbies);
  addAltarObjects(g, layout);
  addBasket(g, -3.22, 2.55);
  addBox(g, 0.28, 0.03, 0.2, matOf(PAL.linen), -3.2, 0.475, 0.55);
  addBox(g, 0.24, 0.025, 0.18, matOf(PAL.sage), -3.18, 0.5, 0.56);
  for (const inst of layout.instances) {
    if (!inst.foliage) continue;
    addFoliage(g, inst, layout.assets[inst.kind].targetHeight);
  }
  addPendants(g, layout);
  addPad(g, 0.85, 0.45, -3.18, 0.008, 0.78);
  addPad(g, 0.85, 0.45, 3.28, 0.008, -2.05);
  addPad(g, 0.46, 0.46, 3.88, 0.008, -3.42);
  addPad(g, 0.46, 0.46, -3.92, 0.008, 3.38);
  return g;
}

boot({
  makeShell: addShell,
  makeProcedural,
  readyText: 'ready — clerestory stretch studio · drag orbit · U unlit · T toon',
});
