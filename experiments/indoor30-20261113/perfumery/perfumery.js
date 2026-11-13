import * as THREE from 'three';
import { boot, toon, addBox, addCyl, makeCutawayShell } from './scene_lib.js';
import { organSlots, familyMarks } from './placement.js';

const WOOD = '#6a4632';
const WOOD_DARK = '#4a3024';
const WOOD_MID = '#7a5340';
const BRASS = '#c6a15e';
const PLASTER = '#f6f1e8';
const PAPER = '#f7f4ec';
const STONE = '#e7e0d6';

const labelCache = new Map();

function labelMat(text, bg, fg, cw = 256, ch = 64, fontScale = 0.42) {
  const key = [text, bg, fg, cw, ch, fontScale].join('|');
  if (labelCache.has(key)) return labelCache.get(key);
  const canvas = document.createElement('canvas');
  canvas.width = cw;
  canvas.height = ch;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, cw, ch);
  ctx.fillStyle = fg;
  ctx.font = `600 ${Math.floor(ch * fontScale)}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, cw / 2, ch / 2 + 2);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 2;
  tex.needsUpdate = true;
  const mat = toon('#ffffff', { map: tex });
  labelCache.set(key, mat);
  return mat;
}

function noShadow(mesh) {
  mesh.castShadow = false;
  mesh.receiveShadow = false;
  mesh.userData.noShadow = true;
  return mesh;
}

function receiveOnly(mesh) {
  mesh.castShadow = false;
  mesh.userData.noShadow = true;
  mesh.userData.receiveShadow = true;
  return mesh;
}

function rotatedBox(g, w, h, d, mat, x, y, z, rotY, cast = true) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  m.rotation.y = rotY;
  if (!cast) receiveOnly(m);
  else {
    m.castShadow = true;
    m.receiveShadow = true;
  }
  g.add(m);
  return m;
}

function contact(g, x, z, rx, rz) {
  const m = new THREE.Mesh(
    new THREE.CircleGeometry(1, 16),
    toon('#2a2118', { transparent: true, opacity: 0.2, depthWrite: false, polygonOffset: true }),
  );
  m.rotation.x = -Math.PI / 2;
  m.position.set(x, 0.021, z);
  m.scale.set(rx, rz, 1);
  g.add(noShadow(m));
}

function dressFloor(g, W, D) {
  const light = toon('#cbb892');
  const dark = toon('#c6b38c');
  const n = Math.ceil((D - 0.2) / 0.18);
  for (let i = 0; i < n; i++) {
    const z = -D / 2 + 0.12 + i * 0.18;
    receiveOnly(addBox(g, W - 0.2, 0.012, 0.16, i % 2 ? dark : light, 0, 0.006, z));
  }
  const border = toon(WOOD_DARK);
  for (const mesh of [
    addBox(g, W - 0.08, 0.02, 0.08, border, 0, 0.012, -D / 2 + 0.06),
    addBox(g, W - 0.08, 0.02, 0.08, border, 0, 0.012, D / 2 - 0.06),
    addBox(g, 0.08, 0.02, D - 0.12, border, -W / 2 + 0.06, 0.012, 0),
    addBox(g, 0.08, 0.02, D - 0.12, border, W / 2 - 0.06, 0.012, 0),
  ]) receiveOnly(mesh);
}

function panelRun(g, axis, fixed, a0, a1, y, h) {
  const span = a1 - a0;
  const n = Math.max(3, Math.round(span / 1.05));
  const step = span / n;
  const frame = toon(WOOD_DARK);
  const inset = toon(WOOD_MID);
  for (let i = 0; i < n; i++) {
    const c = a0 + step * (i + 0.5);
    const pw = step - 0.07;
    if (axis === 'x') {
      addBox(g, pw, h, 0.04, frame, c, y, fixed);
      addBox(g, pw - 0.1, h - 0.12, 0.018, inset, c, y, fixed + 0.02);
    } else {
      addBox(g, 0.04, h, pw, frame, fixed, y, c);
      addBox(g, 0.018, h - 0.12, pw - 0.1, inset, fixed + 0.02, y, c);
    }
  }
}

function makeShell(layout) {
  const g = makeCutawayShell(layout, { ceiling: false, wainscotH: 0 });
  const { width: W, depth: D, height: H } = layout.meta.room;
  const innerL = -W / 2 + 0.08;
  const innerB = -D / 2 + 0.08;
  dressFloor(g, W, D);
  const ao = toon('#3a2c22', { transparent: true, opacity: 0.16, depthWrite: false });
  noShadow(addBox(g, W - 0.2, 0.08, 0.05, ao, 0, 0.04, innerB));
  noShadow(addBox(g, 0.05, 0.08, D - 0.2, ao, innerL, 0.04, 0));
  panelRun(g, 'x', innerB + 0.04, -W / 2 + 0.4, W / 2 - 0.4, 0.5, 0.78);
  panelRun(g, 'z', innerL + 0.04, -D / 2 + 0.4, D / 2 - 0.5, 0.5, 0.78);
  addBox(g, W - 0.24, 0.06, 0.06, toon(WOOD), 0, 0.96, innerB + 0.03);
  addBox(g, 0.06, 0.06, D - 0.24, toon(WOOD), innerL + 0.03, 0.96, 0);
  addBox(g, W - 0.2, 0.08, 0.08, toon(WOOD_DARK), 0, H - 0.06, innerB);
  addBox(g, 0.08, 0.08, D - 0.2, toon(WOOD_DARK), innerL, H - 0.06, 0);
  buildCeiling(g, W, D, H);

  const runner = addBox(g, 0.92, 0.015, 4.3, toon('#8d4d56'), -0.9, 0.018, 1.15);
  receiveOnly(runner);
  receiveOnly(addBox(g, 0.72, 0.01, 4.05, toon('#a8646c'), -0.9, 0.028, 1.15));
  const rug = addBox(g, 2.15, 0.016, 2.15, toon('#3f5c52'), 3.35, 0.018, 1.35);
  receiveOnly(rug);
  receiveOnly(addBox(g, 1.85, 0.01, 1.85, toon('#4e6d62'), 3.35, 0.028, 1.35));
  return g;
}

function buildCeiling(g, W, D, H) {
  const plaster = toon(PLASTER);
  const trim = toon(WOOD_DARK);
  const z0 = -D / 2 + 0.1;
  const z1 = 3.45;
  const x0 = -W / 2 + 0.1;
  const x1 = W / 2 - 0.28;
  const cx = (x0 + x1) / 2;
  const cz = (z0 + z1) / 2;
  const cw = x1 - x0;
  const cd = z1 - z0;
  noShadow(addBox(g, cw, 0.07, cd, plaster, cx, H - 0.045, cz));
  noShadow(addBox(g, cw + 0.06, 0.14, 0.1, trim, cx, H - 0.1, z1));
  noShadow(addBox(g, 0.1, 0.14, cd, trim, x1, H - 0.1, cz));
  for (const z of [-2.2, 0.55]) {
    noShadow(addBox(g, cw - 0.35, 0.09, 0.12, trim, cx - 0.1, H - 0.15, z));
  }
}

function buildOrgan(g, organ) {
  const wood = toon(WOOD);
  const back = toon('#5c3d2e');
  const lip = toon(WOOD_DARK);
  const bays = 8;
  for (const tier of organ.tiers) {
    for (let i = 0; i < bays; i++) {
      const t = ((i + 0.5) / bays) * 2 - 1;
      const ang = Math.PI + t * organ.half;
      const span = (2 * organ.half) / bays;
      const chord = 2 * tier.r * Math.sin(span / 2) * 0.98;
      const x = organ.cx + Math.sin(ang) * tier.r;
      const z = organ.cz + Math.cos(ang) * tier.r;
      const rot = ang + Math.PI;
      rotatedBox(g, chord, 0.04, 0.36, wood, x, tier.y - 0.02, z, rot, false);
      const ox = x + Math.sin(ang) * 0.16;
      const oz = z + Math.cos(ang) * 0.16;
      rotatedBox(g, chord, tier.id === 'high' ? 0.22 : 0.28, 0.03, back, ox, tier.y + 0.1, oz, rot, false);
      const ix = x - Math.sin(ang) * 0.16;
      const iz = z - Math.cos(ang) * 0.16;
      rotatedBox(g, chord * 0.92, 0.035, 0.02, lip, ix, tier.y + 0.01, iz, rot, false);
    }
  }
  for (const t of [-1, -0.34, 0.02, 0.4, 1]) {
    const ang = Math.PI + t * organ.half;
    const r = organ.tiers[1].r + 0.16;
    const x = organ.cx + Math.sin(ang) * r;
    const z = organ.cz + Math.cos(ang) * r;
    const post = addCyl(g, 0.03, 0.034, 1.12, toon(WOOD_DARK), x, 1.28, z, 8);
    post.castShadow = false;
    post.userData.noShadow = true;
  }
  for (const mark of familyMarks(organ)) {
    const [x, y, z] = mark.position;
    const plate = rotatedBox(
      g, 0.28, 0.07, 0.016,
      labelMat(mark.text, '#3e2a20', '#f3e6c8', 256, 64, 0.48),
      x, y - 0.02, z, mark.rotationY, false,
    );
    plate.name = `label-${mark.id}`;
  }
  return organSlots(organ);
}

function buildBench(g, bench) {
  const { x, z, w, d, top } = bench;
  addBox(g, w, 0.05, d, toon(WOOD), x, top - 0.025, z);
  addBox(g, w - 0.08, 0.025, d - 0.08, toon(STONE), x, top + 0.01, z);
  for (const dx of [-w * 0.32, w * 0.32]) {
    addBox(g, 0.08, top - 0.08, d - 0.12, toon(WOOD_DARK), x + dx, (top - 0.08) / 2, z);
  }
  addBox(g, 0.46, 0.16, 0.5, toon(WOOD_MID), x + 0.42, 0.28, z);
  addBox(g, 0.4, 0.012, 0.46, toon(BRASS), x + 0.42, 0.36, z);
  const card = addBox(g, 0.2, 0.008, 0.14, labelMat('No. 14', '#f4efe4', '#3a2a22', 256, 128, 0.46), x + 0.12, top + 0.02, z + 0.1);
  card.rotation.y = -0.2;
  card.name = 'formula-card';

  const rack = new THREE.Group();
  addBox(rack, 0.28, 0.025, 0.1, toon(WOOD_DARK), 0, 0.012, 0);
  for (let i = 0; i < 4; i++) addCyl(rack, 0.012, 0.014, 0.02, toon(BRASS), -0.1 + i * 0.066, 0.028, 0, 8);
  rack.position.set(x - 0.55, top, z - 0.06);
  g.add(rack);

  mixingGlass(g, x - 0.28, z - 0.12);
  mixingGlass(g, x - 0.16, z - 0.16, 0.9);
  alcoholBottle(g, x - 0.32, z + 0.12);
  blotterFan(g, x + 0.05, top + 0.02, z + 0.2);
  mouilletteJar(g, x + 0.38, top, z + 0.16);
  for (let i = 0; i < 3; i++) {
    addCyl(g, 0.012 - i * 0.001, 0.014 - i * 0.001, 0.008, toon(BRASS), x - 0.22 + i * 0.028, top + 0.008, z + 0.02, 10);
  }
}

function mixingGlass(g, x, z, scale = 1) {
  const pts = [[0.01, 0], [0.026, 0.008], [0.032, 0.045], [0.03, 0.062]].map(([r, y]) => new THREE.Vector2(r, y));
  const mesh = new THREE.Mesh(new THREE.LatheGeometry(pts, 16), toon('#d5e4e2'));
  mesh.scale.setScalar(scale);
  mesh.position.set(x, 0.77, z);
  mesh.name = 'mixing-glass';
  g.add(mesh);
  const lip = new THREE.Mesh(new THREE.TorusGeometry(0.03 * scale, 0.003, 6, 14), toon('#f4fffc'));
  lip.rotation.x = Math.PI / 2;
  lip.position.set(x, 0.77 + 0.062 * scale, z);
  g.add(lip);
}

function alcoholBottle(g, x, z) {
  const pts = [[0.012, 0], [0.022, 0.01], [0.024, 0.09], [0.012, 0.11], [0.01, 0.13]].map(([r, y]) => new THREE.Vector2(r, y));
  const mesh = new THREE.Mesh(new THREE.LatheGeometry(pts, 14), toon('#e7eef0'));
  mesh.position.set(x, 0.77, z);
  mesh.name = 'alcohol';
  g.add(mesh);
  addCyl(g, 0.012, 0.012, 0.016, toon('#2e2a28'), x, 0.77 + 0.142, z, 10);
  const tag = addBox(g, 0.03, 0.022, 0.004, labelMat('ALC', '#f7f4ec', '#2a2420', 128, 64, 0.5), x, 0.84, z + 0.025);
  tag.name = 'alcohol-label';
}

function blotterFan(g, x, y, z) {
  const grp = new THREE.Group();
  grp.name = 'blotter-fan';
  for (let i = 0; i < 7; i++) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.002, 0.16), toon(i % 2 ? PAPER : '#efe6d4'));
    m.position.set((i - 3) * 0.016, 0.05, 0.02);
    m.rotation.y = (i - 3) * 0.14;
    m.rotation.x = -1.15;
    noShadow(m);
    m.name = 'blotter';
    grp.add(m);
  }
  addBox(grp, 0.14, 0.012, 0.025, toon(BRASS), 0, 0.008, -0.02);
  grp.position.set(x, y, z);
  g.add(grp);
}

function mouilletteJar(g, x, y, z) {
  addCyl(g, 0.04, 0.036, 0.045, toon('#efe8dc'), x, y + 0.03, z, 14);
  addCyl(g, 0.034, 0.034, 0.01, toon(BRASS), x, y + 0.052, z, 12);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.11, 0.0015), toon(PAPER));
    m.position.set(x + Math.cos(a) * 0.012, y + 0.09, z + Math.sin(a) * 0.012);
    m.rotation.y = a;
    m.rotation.z = Math.cos(a) * 0.08;
    noShadow(m);
    m.name = 'blotter';
    g.add(m);
  }
}

function buildHood(g, bench, H) {
  const { x, z } = bench;
  const y = 2.12;
  noShadow(addBox(g, 1.35, 0.06, 0.72, toon(WOOD_DARK), x, y, z - 0.05));
  noShadow(addBox(g, 1.2, 0.28, 0.08, toon(WOOD), x, y + 0.16, z + 0.28));
  noShadow(addBox(g, 0.08, 0.28, 0.62, toon(WOOD), x - 0.62, y + 0.16, z - 0.02));
  noShadow(addBox(g, 0.08, 0.28, 0.62, toon(WOOD), x + 0.62, y + 0.16, z - 0.02));
  for (let i = 0; i < 7; i++) {
    const slat = addBox(g, 1.15, 0.012, 0.045, toon(BRASS), x, y - 0.02, z - 0.28 + i * 0.09);
    noShadow(slat);
    slat.name = 'vent-slat';
  }
  const glow = addBox(g, 0.9, 0.015, 0.46, toon('#fff1d2', { emissive: '#ffd9a0', emissiveIntensity: 0.7 }), x, y - 0.045, z - 0.02);
  noShadow(glow);
  noShadow(addBox(g, 0.22, H - y - 0.2, 0.22, toon('#d9d3c8'), x, (H + y) / 2 - 0.05, z - 0.05));
  noShadow(addBox(g, 0.28, 0.06, 0.28, toon(BRASS), x, H - 0.16, z - 0.05));
  const plaque = addBox(g, 0.28, 0.07, 0.012, labelMat('EXTRACT', '#3e2a20', '#f3e6c8'), x, y + 0.16, z + 0.33);
  plaque.name = 'hood-plaque';
}

function buildWindow(g, W, D, H) {
  const x = -W / 2 + 0.12;
  const z0 = 0.35;
  const z1 = 2.15;
  addBox(g, 0.08, 1.7, (z1 - z0) + 0.16, toon(WOOD_DARK), x, 1.7, (z0 + z1) / 2);
  addBox(g, 0.04, 1.45, z1 - z0, toon('#d5e2ea'), x + 0.03, 1.65, (z0 + z1) / 2);
  const mullion = toon(WOOD);
  addBox(g, 0.04, 1.5, 0.04, mullion, x + 0.05, 1.65, (z0 + z1) / 2);
  addBox(g, 0.04, 0.04, z1 - z0, mullion, x + 0.05, 1.65, (z0 + z1) / 2);
  const vy = 2.55;
  addBox(g, 0.07, 0.42, 1.15, toon(WOOD_DARK), x, vy, 1.25);
  for (let i = 0; i < 5; i++) {
    const slat = rotatedBox(g, 0.05, 0.012, 1.02, toon(BRASS), x + 0.04, vy - 0.14 + i * 0.07, 1.25, 0);
    slat.rotation.z = -0.5;
    noShadow(slat);
    slat.name = 'vent-slat';
  }
  addBox(g, 0.08, 0.04, 1.5, toon(WOOD), x + 0.16, 1.15, 1.25);
  for (let i = 0; i < 9; i++) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.004, 0.16, 0.012), toon(PAPER));
    m.position.set(x + 0.18, 1.05, 0.65 + i * 0.15);
    m.rotation.z = 0.04 * (i % 2 ? 1 : -1);
    noShadow(m);
    m.name = 'blotter';
    g.add(m);
  }
  addBox(g, 0.28, 0.04, 1.7, toon(WOOD), x + 0.28, 0.92, 1.25);
  for (let i = 0; i < 5; i++) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.004, 0.018), toon(i % 2 ? PAPER : '#efe2c8'));
    m.position.set(x + 0.34, 0.95, 0.6 + i * 0.28);
    m.rotation.y = (i - 2) * 0.05;
    noShadow(m);
    m.name = 'blotter';
    g.add(m);
  }
  void H;
  void D;
}

function buildDrawers(g, drawers) {
  const { x, z, w, d, h } = drawers;
  addBox(g, w, h, d, toon(WOOD), x, h / 2, z);
  addBox(g, w + 0.04, 0.04, d + 0.03, toon(STONE), x, h + 0.02, z);
  const labels = ['MUSK', 'AMBER', 'HERB', 'SPICE', 'BARK', 'SEED'];
  for (let col = 0; col < 2; col++) {
    for (let row = 0; row < 3; row++) {
      const dx = (col - 0.5) * (w * 0.46);
      const dy = 0.18 + row * 0.26;
      addBox(g, w * 0.42, 0.2, 0.02, toon(WOOD_MID), x + dx, dy, z + d / 2);
      const plate = addBox(
        g, 0.16, 0.05, 0.012,
        labelMat(labels[col * 3 + row], '#f3eadc', '#3a271c', 256, 64),
        x + dx, dy, z + d / 2 + 0.016,
      );
      plate.name = `drawer-${labels[col * 3 + row]}`;
      addCyl(g, 0.012, 0.012, 0.02, toon(BRASS), x + dx, dy - 0.02, z + d / 2 + 0.02, 8);
    }
  }
}

function buildBooks(g) {
  const spines = ['#6b3a2a', '#3d4a38', '#5a4030', '#7a4a42', '#2f3d4a', '#6a5438', '#4a3a32', '#8a5a48'];
  for (const x of [3.55, 4.55]) {
    for (const y of [0.48, 0.93, 1.38]) {
      for (let i = 0; i < 8; i++) {
        const bh = 0.2 + (i % 3) * 0.03;
        const m = addBox(g, 0.045, bh, 0.16, toon(spines[(i + Math.round(y)) % spines.length]), x - 0.28 + i * 0.075, y + bh / 2, -3.86);
        m.name = 'formula-book';
      }
    }
  }
  const sign = addBox(g, 0.7, 0.12, 0.02, labelMat('FORMULAE', '#3e2a20', '#f3e6c8', 256, 64), 4.05, 2.05, -4.02);
  sign.name = 'archive-sign';
}

function buildPlant(g, x, z) {
  addCyl(g, 0.012, 0.016, 0.22, toon('#5a6a3a'), x, 0.4, z, 8);
  addBox(g, 0.28, 0.16, 0.22, toon('#3f6a45'), x, 0.58, z);
  addBox(g, 0.18, 0.12, 0.16, toon('#4d7a50'), x + 0.08, 0.66, z + 0.04);
  addBox(g, 0.08, 0.08, 0.08, toon('#e6b04a'), x - 0.06, 0.64, z + 0.08);
}

function makeProcedural(layout) {
  const g = new THREE.Group();
  g.name = 'architecture';
  const { width: W, depth: D, height: H } = layout.meta.room;
  buildOrgan(g, layout.anchors.organ);
  buildBench(g, layout.anchors.bench);
  buildHood(g, layout.anchors.bench, H);
  buildWindow(g, W, D, H);
  buildDrawers(g, layout.anchors.drawers);
  buildBooks(g);
  buildPlant(g, -5.05, 3.45);
  const bench = layout.anchors.bench;
  contact(g, -0.9, -0.55, 0.32, 0.32);
  contact(g, bench.x, bench.z, bench.w * 0.42, bench.d * 0.42);
  contact(g, 3.35, 1.35, 0.55, 0.55);
  contact(g, 3.35, 2.18, 0.28, 0.28);
  contact(g, 3.35, 0.52, 0.28, 0.28);
  contact(g, 3.55, -3.9, 0.4, 0.24);
  contact(g, 4.55, -3.9, 0.4, 0.24);
  contact(g, -4.55, 2.55, 0.32, 0.32);
  contact(g, layout.anchors.drawers.x, layout.anchors.drawers.z, 0.55, 0.28);
  return g;
}

boot({
  makeShell,
  makeProcedural,
  readyText: 'ready — perfumery atelier · drag orbit · U unlit · T toon',
  populate({ layout, place }) {
    const slots = organSlots(layout.anchors.organ);
    for (const slot of slots) {
      const node = place(slot.kind, slot);
      node.name = slot.id;
      node.userData.family = slot.family;
      node.traverse((obj) => {
        if (!obj.isMesh) return;
        obj.castShadow = false;
        obj.userData.noShadow = true;
        obj.userData.receiveShadow = true;
      });
    }
    place('flacon_shoulder', { id: 'hero_flacon', position: [-4.55, 0.9, 2.55], rotationY: 0.4, scale: 1.35 });
    place('flacon_rect', { id: 'table_citrus', position: [3.18, 0.74, 1.28], rotationY: 0.5, scale: 0.85 });
    place('flacon_round', { id: 'table_amber', position: [3.35, 0.74, 1.46], rotationY: -0.4, scale: 0.9 });
    place('flacon_atomizer', { id: 'table_spray', position: [3.52, 0.74, 1.26], rotationY: 1.1, scale: 0.82 });
    const pulls = [
      ['flacon_rect', 1.55, -3.52],
      ['flacon_oval', 1.78, -3.48],
      ['flacon_shoulder', 2.05, -3.54],
      ['flacon_round', 2.28, -3.5],
    ];
    pulls.forEach(([kind, x, z], i) => {
      place(kind, { id: `pull_${i}`, position: [x, 0.96, z], rotationY: 0.3 * i, scale: 0.8 });
    });
  },
});
