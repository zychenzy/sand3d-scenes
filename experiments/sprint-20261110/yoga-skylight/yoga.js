import * as THREE from 'three';
import { boot, toon, addBox, addCyl } from './scene_lib.js';

const PAL = {
  plaster: '#f3ece3',
  plasterShadow: '#e6d9c8',
  slatA: '#d7b07a',
  slatB: '#c89a62',
  slatC: '#e2c294',
  timber: '#8d5e3c',
  timberDeep: '#6e452c',
  timberLite: '#a86b3e',
  linen: '#f3ead8',
  linenShadow: '#e2d3b8',
  clay: '#c46a58',
  sage: '#6e8f78',
  sand: '#cbb89a',
  cork: '#e2c396',
  corkDeep: '#d2b07a',
  bronze: '#b08a4f',
  glass: '#d7ebe6',
};

const SLAT = {
  colors: [PAL.slatA, PAL.slatB, PAL.slatC, PAL.slatB],
  widths: [0.068, 0.06, 0.082, 0.064, 0.072],
};

function matOf(color, opts) {
  return toon(color, opts);
}

function roofY(sky, z) {
  const pitch = (sky.yRidge - sky.yEave) / (sky.ridgeZ - sky.z0);
  return sky.yRidge - pitch * (z - sky.ridgeZ);
}

function addSlopeBox(g, { x0, x1, zA, yA, zB, yB, thick, mat, cast = true, yDrop = 0 }) {
  const dz = zB - zA;
  const dy = yB - yA;
  const length = Math.hypot(dz, dy) || 0.001;
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(Math.abs(x1 - x0), thick, length), mat);
  mesh.position.set((x0 + x1) / 2, (yA + yB) / 2 - yDrop, (zA + zB) / 2);
  mesh.rotation.x = Math.atan2(-dy, dz);
  mesh.castShadow = cast;
  mesh.receiveShadow = cast;
  if (!cast) mesh.userData.noShadow = true;
  g.add(mesh);
  return mesh;
}

function makePlankMap() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  const tones = ['#e7cba4', '#d8b488', '#f0d6ae', '#c9a67a', '#e2c29c', '#d2ad80'];
  const n = tones.length;
  const pw = canvas.width / n;
  for (let i = 0; i < n; i++) {
    ctx.fillStyle = tones[i];
    ctx.fillRect(i * pw, 0, pw + 1, canvas.height);
    ctx.fillStyle = 'rgba(92, 58, 30, 0.4)';
    ctx.fillRect(i * pw, 0, 4, canvas.height);
    ctx.strokeStyle = 'rgba(120, 74, 38, 0.18)';
    ctx.lineWidth = 1;
    for (let k = 1; k <= 3; k++) {
      const x = i * pw + (pw * k) / 4;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x + 1.5, canvas.height);
      ctx.stroke();
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.repeat.set(7, 2);
  return tex;
}

function addFloor(g, W, D) {
  const mat = matOf('#ffffff', { map: makePlankMap() });
  const floor = addBox(g, W, 0.08, D, mat, 0, -0.04, 0);
  floor.userData.receiveOnly = true;
  floor.name = 'floor';
}

function slatsAlong(g, axis, a0, a1, y0, y1, fixed, depth, skipRanges, mats) {
  let a = a0;
  let i = 0;
  while (a < a1 - 0.03) {
    const w = SLAT.widths[i % SLAT.widths.length];
    const mid = a + w / 2;
    const skipped = skipRanges.some(([s0, s1]) => mid > s0 && mid < s1);
    if (!skipped && a + w <= a1 + 0.001) {
      const mat = mats[i % mats.length];
      const mesh =
        axis === 'x'
          ? addBox(g, w, y1 - y0, depth, mat, mid, (y0 + y1) / 2, fixed)
          : addBox(g, depth, y1 - y0, w, mat, fixed, (y0 + y1) / 2, mid);
      mesh.userData.receiveOnly = true;
    }
    a += w + 0.013;
    i += 1;
  }
}

function addWalls(g, layout) {
  const { width: W, depth: D, height: H } = layout.meta.room;
  const plaster = matOf(PAL.plaster);
  const timber = matOf(PAL.timber);
  const deep = matOf(PAL.timberDeep);
  const slatMats = SLAT.colors.map((c) => matOf(c));
  const backInner = -D / 2 + 0.12;
  const leftInner = -W / 2 + 0.12;

  const back = addBox(g, W, H, 0.12, plaster, 0, H / 2, -D / 2 + 0.06);
  back.userData.receiveOnly = true;
  const left = addBox(g, 0.12, H, D, plaster, -W / 2 + 0.06, H / 2, 0);
  left.userData.receiveOnly = true;

  addBox(g, 0.08, H, 0.08, timber, W / 2 - 0.04, H / 2, backInner - 0.02);
  addBox(g, 0.08, H, 0.08, timber, leftInner - 0.02, H / 2, D / 2 - 0.04);

  const y0 = 0.14;
  const y1 = 2.46;
  slatsAlong(g, 'x', -W / 2 + 0.18, W / 2 - 0.16, y0, y1, backInner + 0.02, 0.026, [], slatMats);
  const niche = layout.architecture.niche;
  slatsAlong(
    g,
    'z',
    -D / 2 + 0.2,
    D / 2 - 0.16,
    y0,
    y1,
    leftInner + 0.02,
    0.026,
    [[niche.z0 - 0.02, niche.z1 + 0.02]],
    slatMats
  );

  addBox(g, W - 0.2, 0.1, 0.04, deep, 0.05, 0.05, backInner + 0.03);
  addBox(g, 0.04, 0.1, niche.z0 + D / 2 - 0.12, deep, leftInner + 0.03, 0.05, (-D / 2 + niche.z0) / 2);
  addBox(g, 0.04, 0.1, D / 2 - niche.z1 - 0.1, deep, leftInner + 0.03, 0.05, (niche.z1 + D / 2) / 2 - 0.02);

  addBox(g, W - 0.24, 0.055, 0.045, timber, 0.04, 2.5, backInner + 0.03);
  addBox(g, 0.045, 0.055, niche.z0 + D / 2 - 0.16, timber, leftInner + 0.034, 2.5, (-D / 2 + niche.z0) / 2);
  addBox(g, 0.045, 0.055, D / 2 - niche.z1 - 0.12, timber, leftInner + 0.034, 2.5, (niche.z1 + D / 2) / 2);
}

function addCeiling(g, layout) {
  const { skylight: sky, ceiling: ceil } = layout.architecture;
  const mat = matOf(layout.shell.ceilingColor);
  const t = 0.08;
  const y = sky.ySoffit + t / 2;
  const northD = sky.z0 - ceil.z0;
  addBox(g, ceil.x1 - ceil.x0, t, northD, mat, (ceil.x0 + ceil.x1) / 2, y, (ceil.z0 + sky.z0) / 2);
  const run = sky.z1 - sky.z0;
  addBox(g, sky.x0 - ceil.x0, t, run, mat, (ceil.x0 + sky.x0) / 2, y, (sky.z0 + sky.z1) / 2);
  addBox(g, ceil.x1 - sky.x1, t, run, mat, (sky.x1 + ceil.x1) / 2, y, (sky.z0 + sky.z1) / 2);

  const timber = matOf(PAL.timber);
  addBox(g, ceil.x1 - ceil.x0, 0.06, 0.08, timber, (ceil.x0 + ceil.x1) / 2, sky.ySoffit - 0.02, sky.z1);
}

function addSkylight(g, layout) {
  const sky = layout.architecture.skylight;
  const { x0, x1, z0, z1, ridgeZ, ySoffit, yBaffle, yEave, yRidge } = sky;
  const yCut = roofY(sky, z1);
  const timber = matOf(PAL.timber);
  const lite = matOf(PAL.timberLite);
  const plaster = matOf('#f6f1e8', { side: THREE.DoubleSide });
  const glassMat = matOf(PAL.glass, {
    transparent: true,
    opacity: 0.28,
    side: THREE.DoubleSide,
    emissive: '#e7f4f1',
    emissiveIntensity: 0.22,
  });

  const spanX = x1 - x0;
  const cx = (x0 + x1) / 2;
  addBox(g, spanX, ySoffit - yBaffle, 0.05, timber, cx, (ySoffit + yBaffle) / 2, z0 + 0.02);
  addBox(g, 0.05, ySoffit - yBaffle, z1 - z0, timber, x0 + 0.02, (ySoffit + yBaffle) / 2, (z0 + z1) / 2);
  addBox(g, 0.05, ySoffit - yBaffle, z1 - z0, timber, x1 - 0.02, (ySoffit + yBaffle) / 2, (z0 + z1) / 2);
  const fascia = addBox(g, spanX, 0.09, 0.06, timber, cx, yCut, z1);
  fascia.name = 'skylight-fascia';
  addBox(g, spanX, 0.045, 0.05, lite, cx, yBaffle, z1 - 0.02);

  addSlopeBox(g, { x0: x0 + 0.06, x1: x1 - 0.06, zA: z0, yA: yEave, zB: ridgeZ, yB: yRidge, thick: 0.02, mat: glassMat, cast: false });
  addSlopeBox(g, { x0: x0 + 0.06, x1: x1 - 0.06, zA: ridgeZ, yA: yRidge, zB: z1 - 0.02, yB: yCut, thick: 0.02, mat: glassMat, cast: false });

  const rafter = (x, zA, yA, zB, yB) => {
    addSlopeBox(g, {
      x0: x - 0.03,
      x1: x + 0.03,
      zA,
      yA,
      zB,
      yB,
      thick: 0.055,
      mat: lite,
      cast: false,
      yDrop: 0.05,
    });
  };
  const barge = (x, side) => {
    const inset = side * 0.03;
    addSlopeBox(g, { x0: x, x1: x + inset, zA: z0, yA: yEave, zB: ridgeZ, yB: yRidge, thick: 0.07, mat: timber, cast: false, yDrop: 0.02 });
    addSlopeBox(g, { x0: x, x1: x + inset, zA: ridgeZ, yA: yRidge, zB: z1 - 0.04, yB: yCut, thick: 0.07, mat: timber, cast: false, yDrop: 0.02 });
  };
  barge(x0, 1);
  barge(x1, -1);
  const count = 5;
  for (let i = 0; i < count; i++) {
    const x = x0 + 0.28 + ((i + 0.5) * (spanX - 0.56)) / count;
    rafter(x, z0, yEave, ridgeZ, yRidge);
    rafter(x, ridgeZ, yRidge, z1 - 0.06, yCut);
  }

  addBox(g, spanX, 0.08, 0.09, timber, cx, yRidge - 0.06, ridgeZ);
  addBox(g, spanX, 0.07, 0.08, timber, cx, yEave - 0.03, z0 + 0.02);

  for (const x of [x0 + spanX * 0.33, x0 + spanX * 0.67]) {
    const h = yRidge - 0.1 - yBaffle;
    addBox(g, 0.045, h, 0.045, timber, x, yBaffle + h / 2, ridgeZ);
  }

  const beamZs = [z0 + (z1 - z0) / 3, z0 + (2 * (z1 - z0)) / 3];
  for (const z of beamZs) {
    const beam = addBox(g, spanX - 0.1, 0.1, 0.07, timber, cx, yBaffle - 0.02, z);
    beam.name = 'baffle-beam';
    beam.userData.receiveOnly = true;
  }
  const slatMat = matOf(PAL.timberLite);
  for (let z = z0 + 0.28; z < z1 - 0.12; z += 0.58) {
    const nearBeam = beamZs.some((bz) => Math.abs(z - bz) < 0.08);
    if (nearBeam) continue;
    const slat = addBox(g, spanX - 0.12, 0.05, 0.04, slatMat, cx, yBaffle, z);
    slat.userData.receiveOnly = true;
  }

  for (const x of [x0, x1]) {
    const shape = new THREE.Shape();
    shape.moveTo(z0, ySoffit);
    shape.lineTo(z0, yEave);
    shape.lineTo(ridgeZ, yRidge);
    shape.lineTo(z1, yCut);
    shape.lineTo(z1, ySoffit);
    shape.closePath();
    const cheek = new THREE.Mesh(new THREE.ShapeGeometry(shape), plaster);
    cheek.rotation.y = -Math.PI / 2;
    cheek.position.set(x, 0, 0);
    cheek.userData.noShadow = true;
    g.add(cheek);
  }

  const grpNote = g;
  grpNote.name = grpNote.name || 'shell';
}

function addNicheFrame(g, layout) {
  const n = layout.architecture.niche;
  const wood = matOf(PAL.timber);
  const deck = matOf('#d2ae74');
  const cx = (n.x0 + n.x1) / 2;
  const cz = (n.z0 + n.z1) / 2;
  addBox(g, n.x1 - n.x0, n.head, 0.06, wood, cx, n.head / 2, n.z0);
  addBox(g, n.x1 - n.x0, n.head, 0.06, wood, cx, n.head / 2, n.z1);
  addBox(g, n.x1 - n.x0, 0.1, n.z1 - n.z0, wood, cx, n.head + 0.04, cz);
  const platform = addBox(g, n.x1 - n.x0 - 0.02, 0.045, n.z1 - n.z0 - 0.06, deck, cx, 0.022, cz);
  platform.userData.receiveOnly = true;
  addBox(g, 0.08, 0.04, n.z1 - n.z0, matOf(PAL.timberDeep), n.x1 + 0.02, 0.02, cz);
}

function addBorder(g, layout) {
  const b = layout.architecture.border;
  const mat = matOf(PAL.timberDeep);
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
    0.028,
    0.05,
    matOf(PAL.timberDeep),
    (p.x0 + p.x1) / 2,
    p.h - 0.014,
    p.z1 + 0.012
  );
}

function addAltarShelf(g, layout) {
  const a = layout.architecture.altar;
  const wood = matOf(PAL.timberLite);
  addBox(g, a.w, 0.04, a.d, wood, a.x, a.y, a.z);
  addBox(g, 0.04, 0.16, 0.04, matOf(PAL.timber), a.x - a.w * 0.32, a.y - 0.1, a.z);
  addBox(g, 0.04, 0.16, 0.04, matOf(PAL.timber), a.x + a.w * 0.32, a.y - 0.1, a.z);
}

function makeShell(layout) {
  const g = new THREE.Group();
  g.name = 'shell';
  const { width: W, depth: D } = layout.meta.room;
  addFloor(g, W, D);
  addWalls(g, layout);
  addCeiling(g, layout);
  addSkylight(g, layout);
  addNicheFrame(g, layout);
  addPlatform(g, layout);
  addBorder(g, layout);
  addAltarShelf(g, layout);
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
    grd.addColorStop(0, 'rgba(70,42,22,0.42)');
    grd.addColorStop(0.6, 'rgba(70,42,22,0.16)');
    grd.addColorStop(1, 'rgba(70,42,22,0)');
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
  addBox(g, w * 0.84, 0.004, 0.07, matOf(new THREE.Color(spec.color).multiplyScalar(0.7)), spec.x, y + t + 0.003, spec.z + head);
  addPad(g, w + 0.16, l + 0.16, spec.x, y + 0.006, spec.z);

  const props = spec.props || [];
  if (props.includes('blocks')) {
    const hz = head - (spec.head ?? 1) * 0.08;
    addBox(g, 0.22, 0.1, 0.15, matOf(PAL.cork), spec.x - 0.12, y + t + 0.05, spec.z + hz);
    addBox(g, 0.22, 0.1, 0.15, matOf(PAL.corkDeep), spec.x + 0.12, y + t + 0.05, spec.z + hz);
    const strap = new THREE.Mesh(new THREE.TorusGeometry(0.075, 0.008, 6, 18), matOf('#8f6e86'));
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

function addCredenza(g, cred) {
  const { x0, x1, z0, z1, h } = cred;
  const w = x1 - x0;
  const d = z1 - z0;
  const xc = (x0 + x1) / 2;
  const zc = (z0 + z1) / 2;
  const wood = matOf(PAL.timberLite);
  const dark = matOf(PAL.timberDeep);
  const t = 0.03;
  addBox(g, w, 0.07, d, dark, xc, 0.035, zc);
  addBox(g, w + 0.02, 0.034, d + 0.02, wood, xc, h - 0.017, zc);
  addBox(g, w - 0.04, h - 0.12, 0.016, matOf('#6a4330'), xc, 0.08 + (h - 0.12) / 2, z0 + 0.02);
  const left = x0 + t;
  const right = x1 - t;
  const cols = 4;
  const slot = (right - left) / cols;
  addBox(g, t, h - 0.11, d - 0.02, wood, x0 + t / 2, 0.08 + (h - 0.11) / 2, zc);
  addBox(g, t, h - 0.11, d - 0.02, wood, x1 - t / 2, 0.08 + (h - 0.11) / 2, zc);
  for (let i = 1; i < cols; i++) {
    addBox(g, 0.022, h - 0.12, d - 0.04, wood, left + slot * i, 0.085 + (h - 0.12) / 2, zc + 0.01);
  }
  const centers = [];
  for (let i = 0; i < cols; i++) centers.push(left + slot * (i + 0.5));
  const floorY = 0.09;
  const cz = zc + 0.03;

  const roll = (x, hh, color) => {
    addCyl(g, 0.078, 0.078, hh, matOf(color), x, floorY + hh / 2, cz, 16);
    addCyl(g, 0.034, 0.034, 0.016, matOf(PAL.timberDeep), x, floorY + hh + 0.002, cz, 12);
  };
  roll(centers[0] - 0.1, 0.5, PAL.clay);
  roll(centers[0] + 0.1, 0.42, PAL.sage);

  const folds = [PAL.linen, PAL.clay, PAL.sage];
  folds.forEach((c, i) => {
    addBox(g, 0.42, 0.055, 0.28, matOf(c), centers[1], floorY + 0.04 + i * 0.06, cz);
  });

  for (let i = 0; i < 3; i++) {
    addBox(g, 0.2, 0.09, 0.14, matOf(i === 1 ? PAL.cork : PAL.corkDeep), centers[2] - 0.08, floorY + 0.05 + i * 0.095, cz);
  }
  const coil = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.01, 6, 16), matOf('#8f6e86'));
  coil.rotation.x = Math.PI / 2;
  coil.position.set(centers[2] + 0.14, floorY + 0.08, cz);
  g.add(coil);

  const bolster = addCyl(g, 0.1, 0.1, 0.46, matOf(PAL.sand), centers[3], floorY + 0.11, cz, 14);
  bolster.rotation.z = Math.PI / 2;

  addPad(g, w + 0.2, d + 0.24, xc, 0.008, zc + 0.04);
  const hook = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.008, 6, 14), matOf(PAL.sage));
  hook.position.set(x1 + 0.02, 0.62, zc);
  hook.rotation.y = Math.PI / 2;
  g.add(hook);
}

function addAltarObjects(g, layout) {
  const a = layout.architecture.altar;
  const top = a.y + 0.02;
  addCyl(g, 0.11, 0.09, 0.045, matOf(PAL.bronze), a.x - 0.48, top + 0.022, a.z, 18);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.01, 6, 18), matOf('#c6a15c'));
  rim.rotation.x = Math.PI / 2;
  rim.position.set(a.x - 0.48, top + 0.046, a.z);
  g.add(rim);
  addCyl(g, 0.028, 0.03, 0.07, matOf('#f4efe4'), a.x + 0.5, top + 0.035, a.z, 10);
  const flame = addCyl(g, 0.012, 0.004, 0.045, matOf('#ffb15a', { emissive: '#ff9328', emissiveIntensity: 1.7 }), a.x + 0.5, top + 0.09, a.z, 8);
  flame.userData.noShadow = true;
  const light = new THREE.PointLight('#ffb060', 0.32, 2.1, 2);
  light.position.set(a.x + 0.5, top + 0.16, a.z + 0.05);
  g.add(light);
}

function addCurtain(g, niche) {
  const x = niche.x1 + 0.025;
  const y0 = 0.1;
  const y1 = 2.02;
  const rod = addCyl(g, 0.012, 0.012, niche.z1 - niche.z0 + 0.1, matOf(PAL.timberDeep), x, y1 + 0.03, (niche.z0 + niche.z1) / 2, 8);
  rod.rotation.x = Math.PI / 2;
  addBox(g, 0.06, 0.07, niche.z1 - niche.z0 + 0.08, matOf(PAL.timber), x, y1 + 0.07, (niche.z0 + niche.z1) / 2);
  const zBunch = niche.z1 - 0.22;
  for (let i = 0; i < 5; i++) {
    addBox(
      g,
      0.03,
      y1 - y0 - 0.04,
      0.26,
      matOf(i % 2 ? PAL.linen : PAL.linenShadow),
      x + (i % 2) * 0.022,
      (y0 + y1) / 2,
      zBunch - i * 0.055
    );
  }
  addBox(g, 0.04, 0.045, 0.42, matOf('#d9cbb4'), x + 0.02, y0 + 0.04, zBunch - 0.1);
}

function addRobe(g, x, y, z) {
  addBox(g, 0.02, 0.05, 0.28, matOf(PAL.timberDeep), x, y, z);
  for (const dz of [-0.08, 0.08]) {
    const peg = addCyl(g, 0.012, 0.012, 0.06, matOf(PAL.timber), x + 0.03, y, z + dz, 8);
    peg.rotation.z = Math.PI / 2;
  }
  addBox(g, 0.02, 0.7, 0.18, matOf(PAL.clay), x + 0.025, y - 0.4, z);
  addBox(g, 0.018, 0.42, 0.07, matOf('#b85d4c'), x + 0.03, y - 0.48, z - 0.1);
  addBox(g, 0.018, 0.42, 0.07, matOf('#b85d4c'), x + 0.03, y - 0.48, z + 0.1);
}

function addMirror(g, x, y, z) {
  const glass = addCyl(g, 0.2, 0.2, 0.012, matOf('#d5e3ea'), x, y, z, 24);
  glass.rotation.z = Math.PI / 2;
  glass.userData.receiveOnly = true;
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.016, 6, 24), matOf(PAL.timber));
  ring.rotation.y = Math.PI / 2;
  ring.position.set(x + 0.012, y, z);
  g.add(ring);
}

function addBasket(g, x, z) {
  addCyl(g, 0.14, 0.12, 0.18, matOf('#c2a078'), x, 0.13, z, 14);
  addCyl(g, 0.1, 0.1, 0.02, matOf('#6e5340'), x, 0.2, z, 12);
  const strap = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.007, 6, 14), matOf('#8f6e86'));
  strap.rotation.x = Math.PI / 2.4;
  strap.position.set(x, 0.22, z);
  g.add(strap);
}

function addFoliage(g, inst, targetHeight) {
  const x = inst.position[0];
  const z = inst.position[2];
  const rim = inst.position[1] + targetHeight * 0.78;
  if (inst.foliage === 'succulent') {
    addCyl(g, 0.055, 0.07, 0.05, matOf('#3f6a48'), x, rim + 0.02, z, 8);
    addCyl(g, 0.035, 0.05, 0.04, matOf('#4e7c56'), x + 0.04, rim + 0.045, z + 0.015, 8);
    addCyl(g, 0.03, 0.04, 0.035, matOf('#2f5a3c'), x - 0.03, rim + 0.04, z - 0.02, 8);
    return;
  }
  if (inst.foliage === 'floor') {
    const stem = matOf('#5a6a42');
    const leafA = matOf('#3e6b4a');
    const leafB = matOf('#4d7d58');
    addCyl(g, 0.012, 0.016, 0.22, stem, x, rim + 0.1, z, 6);
    for (let i = 0; i < 5; i++) {
      const ang = (i / 5) * Math.PI * 2;
      const leaf = addBox(g, 0.14, 0.012, 0.32, i % 2 ? leafA : leafB, x + Math.cos(ang) * 0.06, rim + 0.28, z + Math.sin(ang) * 0.06);
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
    const light = new THREE.PointLight('#ffc98a', 0.7, 4.4, 2);
    light.position.set(x, y + 0.16, z);
    g.add(light);
  }
}

function makeProcedural(layout) {
  const g = new THREE.Group();
  g.name = 'procedural';
  const size = layout.architecture.mat;
  for (const spec of layout.mats) addMat(g, spec, size);
  addCredenza(g, layout.architecture.credenza);
  addAltarObjects(g, layout);
  addCurtain(g, layout.architecture.niche);
  addRobe(g, -4.4, 1.55, -0.02);
  addMirror(g, -4.44, 1.28, 0.62);
  addBasket(g, -3.2, 1.62);
  addBox(g, 0.28, 0.035, 0.2, matOf(PAL.linen), -4.22, 0.525, 1.45);
  addBox(g, 0.24, 0.028, 0.18, matOf(PAL.sage), -4.2, 0.555, 1.46);
  for (const inst of layout.instances) {
    if (!inst.foliage) continue;
    addFoliage(g, inst, layout.assets[inst.kind].targetHeight);
  }
  addPendants(g, layout);
  addPad(g, 0.7, 0.4, -4.1, 0.05, 0.98);
  addPad(g, 0.46, 0.46, 3.9, 0.008, -3.28);
  return g;
}

boot({
  makeShell,
  makeProcedural,
  readyText: 'ready — skylight yoga studio · drag orbit · U unlit · T toon',
});
