import * as THREE from 'three';
import { mergeGeometries } from './vendor/utils/BufferGeometryUtils.js';
import { boot, toon, addBox, addCyl } from './scene_lib.js';
import { attachPlanarMirror } from './mirror.js';

function mark(mesh, mode) {
  if (mode) mesh.userData.shadowMode = mode;
  return mesh;
}

function palette(layout) {
  const s = layout.shell || {};
  const tape = toon('#c46b74');
  tape.polygonOffset = true;
  tape.polygonOffsetFactor = -2;
  tape.polygonOffsetUnits = -2;
  return {
    plaster: toon(s.wallColor || '#f3eee6'),
    plasterDeep: toon('#e4dccf'),
    ceiling: toon(s.ceilingColor || '#f7f3ec'),
    beam: toon('#8d6544'),
    walnut: toon(s.woodColor || '#6b4632'),
    frame: toon('#5c3b2c'),
    barre: toon('#7a5236'),
    brass: toon('#b08a52'),
    iron: toon('#3a3634'),
    piano: toon('#4a3026'),
    pianoDark: toon('#2c1e18'),
    keys: toon('#f6f3ec'),
    ebony: toon('#1a1a1a'),
    rose: toon(s.accentColor || '#c57d86'),
    roseDeep: toon('#8f4e58'),
    navy: toon('#2a3848'),
    leaf: toon('#3f6a45'),
    leafDeep: toon('#2c4e34'),
    stem: toon('#5a4632'),
    towel: toon('#efe6d4'),
    slipper: toon('#e7b7be'),
    rosin: toon('#d7b15a'),
    shoe: toon('#2e2a28'),
    tray: toon('#c4b49a'),
    rubber: toon('#2a2a2a'),
    joist: toon('#6e4e32'),
    birch: toon('#e6d7b8'),
    slab: toon('#b7a48e'),
    gap: toon('#2e2822'),
    rug: toon('#9a624f'),
    wainscot: toon('#e4d0ae'),
    interior: toon('#f0e0c4'),
    glassBack: toon('#c5d4dc'),
    clerestory: toon('#fff1dc', { emissive: '#ffd7a1', emissiveIntensity: 0.85, side: THREE.DoubleSide }),
    window: toon('#f7f1e6', { emissive: '#ffe7c2', emissiveIntensity: 0.55, side: THREE.DoubleSide }),
    bulb: toon('#fff6e8', { emissive: '#ffd9a8', emissiveIntensity: 1.45 }),
    screen: toon('#0e3a3a', { emissive: '#7dffe8', emissiveIntensity: 1.15 }),
    book: toon('#7a3038'),
    tape,
    planks: ['#e0b56e', '#c9964e', '#d7b07a', '#b68446', '#e8c48a', '#c48a48'].map((c) => toon(c)),
  };
}

function metrics(layout) {
  const { width: W, depth: D, height: H } = layout.meta.room;
  const wallT = 0.16;
  return {
    W, D, H, wallT,
    a: layout.architecture,
    zInner: -D / 2 + wallT / 2,
    xInner: -W / 2 + wallT / 2,
  };
}

function railX(g, mat, x0, x1, y, z, r = 0.022) {
  const mesh = addCyl(g, r, r, x1 - x0, mat, (x0 + x1) / 2, y, z, 14);
  mesh.rotation.z = Math.PI / 2;
  return mesh;
}

function railZ(g, mat, z0, z1, y, x, r = 0.022) {
  const mesh = addCyl(g, r, r, z1 - z0, mat, x, y, (z0 + z1) / 2, 14);
  mesh.rotation.x = Math.PI / 2;
  return mesh;
}

function contactTexture() {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 128;
  const ctx = c.getContext('2d');
  const grd = ctx.createRadialGradient(64, 64, 6, 64, 64, 62);
  grd.addColorStop(0, 'rgba(30,18,10,0.55)');
  grd.addColorStop(1, 'rgba(30,18,10,0)');
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function contact(g, tex, x, z, w, d, opacity = 0.32) {
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(w, d),
    new THREE.MeshBasicMaterial({
      map: tex,
      transparent: true,
      depthWrite: false,
      opacity,
      toneMapped: false,
    }),
  );
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set(x, 0.012, z);
  mesh.userData.keepMaterial = true;
  mesh.userData.shadowMode = 'none';
  mesh.renderOrder = 2;
  g.add(mesh);
  return mesh;
}

function plankFloor(g, mats, m) {
  const a = m.a;
  const pitch = 0.118;
  const gap = 0.007;
  const x0 = a.floor.x0;
  const x1 = a.sprungCutX;
  const zStart = a.floor.z0;
  const zEnd = a.floor.z1;
  mark(addBox(g, x1 - x0, 0.02, zEnd - zStart, mats.gap, (x0 + x1) / 2, -0.032, (zStart + zEnd) / 2), 'receive');
  const buckets = mats.planks.map(() => []);
  let i = 0;
  for (let z = zStart; z < zEnd - 0.02; z += pitch) {
    const depth = Math.min(pitch - gap, zEnd - z);
    const geo = new THREE.BoxGeometry(x1 - x0, 0.022, depth);
    geo.translate((x0 + x1) / 2, -0.011, z + depth / 2);
    buckets[i % mats.planks.length].push(geo);
    i += 1;
  }
  buckets.forEach((geos, idx) => {
    if (!geos.length) return;
    const merged = mergeGeometries(geos, false);
    const mesh = new THREE.Mesh(merged, mats.planks[idx]);
    mesh.name = `planks-${idx}`;
    mark(mesh, 'receive');
    g.add(mesh);
    geos.forEach((geo) => geo.dispose());
  });
  mark(addBox(g, x1 - x0, 0.09, 0.05, mats.walnut, (x0 + x1) / 2, -0.045, zEnd + 0.01), 'receive');
  mark(addBox(g, 0.14, 0.02, m.D - 0.2, mats.gap, m.xInner + 0.05, -0.02, 0), 'receive');
}

function sprungCut(g, mats, m) {
  const x0 = m.a.sprungCutX;
  const x1 = m.W / 2 - 0.08;
  const z0 = -m.D / 2 + 0.35;
  const z1 = m.D / 2 - 0.22;
  const zPly = z0 + 1.35;
  const midX = (x0 + x1) / 2;
  mark(addBox(g, x1 - x0, 0.04, z1 - z0, mats.slab, midX, -0.12, (z0 + z1) / 2), 'receive');
  for (let z = z0 + 0.22; z < z1; z += 0.46) {
    mark(addBox(g, x1 - x0 - 0.1, 0.045, 0.04, mats.joist, midX, -0.078, z), 'receive');
    for (let x = x0 + 0.22; x < x1 - 0.05; x += 0.38) {
      addBox(g, 0.055, 0.028, 0.055, mats.rubber, x, -0.042, z);
    }
  }
  const bayW = x1 - x0;
  for (const t of [0.36, 0.7]) {
    addBox(g, 0.045, 0.028, z1 - z0 - 0.16, mats.birch, x0 + bayW * t, -0.02, (z0 + z1) / 2);
  }
  mark(addBox(g, bayW - 0.1, 0.014, zPly - z0, mats.birch, midX, -0.004, (z0 + zPly) / 2), 'receive');
  mark(addBox(g, 0.045, 0.1, z1 - z0, mats.walnut, x0 - 0.01, -0.02, (z0 + z1) / 2), 'receive');
}

function mirrorWall(g, mats, m) {
  const mir = m.a.mirror;
  const cx = (mir.x0 + mir.x1) / 2;
  const cy = (mir.y0 + mir.y1) / 2;
  const mw = mir.x1 - mir.x0;
  const mh = mir.y1 - mir.y0;
  mark(addBox(g, mw - 0.02, mh - 0.02, 0.008, mats.glassBack, cx, cy, mir.z - 0.018), 'none');
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(mw - 0.08, mh - 0.08));
  glass.position.set(cx, cy, mir.z);
  attachPlanarMirror(glass);
  g.add(glass);

  const ft = 0.08;
  const fz = mir.z + 0.035;
  mark(addBox(g, mw + 0.1, ft, 0.05, mats.frame, cx, mir.y1, fz), 'none');
  mark(addBox(g, mw + 0.1, ft, 0.05, mats.frame, cx, mir.y0, fz), 'none');
  mark(addBox(g, ft, mh + 0.02, 0.05, mats.frame, mir.x0, cy, fz), 'none');
  mark(addBox(g, ft, mh + 0.02, 0.05, mats.frame, mir.x1, cy, fz), 'none');
  for (let i = 1; i <= 3; i++) {
    const x = mir.x0 + (mw * i) / 4;
    mark(addBox(g, 0.036, mh - 0.12, 0.04, mats.frame, x, cy, mir.z + 0.04), 'none');
  }

  const n = 7;
  const gap = 0.04;
  const paneW = (mw - gap * (n + 1)) / n;
  const paneY = 3.14;
  const paneH = 0.42;
  mark(addBox(g, mw + 0.08, 0.03, 0.05, mats.walnut, cx, paneY - paneH / 2 - 0.03, m.zInner + 0.02), 'none');
  for (let i = 0; i < n; i++) {
    const x = mir.x0 + gap + paneW / 2 + i * (paneW + gap);
    mark(addBox(g, paneW, paneH, 0.02, mats.clerestory, x, paneY, m.zInner + 0.015), 'none');
    mark(addBox(g, 0.028, paneH + 0.04, 0.04, mats.walnut, x - paneW / 2 - gap / 2, paneY, m.zInner + 0.02), 'none');
  }
  mark(addBox(g, 0.028, paneH + 0.04, 0.04, mats.walnut, mir.x1 + 0.01, paneY, m.zInner + 0.02), 'none');
}

function sideWindow(g, mats, m) {
  const w = m.a.window;
  const x = m.xInner + 0.02;
  const cx = x;
  const cz = (w.z0 + w.z1) / 2;
  const cy = (w.y0 + w.y1) / 2;
  mark(addBox(g, 0.02, w.y1 - w.y0, w.z1 - w.z0, mats.window, cx, cy, cz), 'none');
  mark(addBox(g, 0.05, 0.045, w.z1 - w.z0 + 0.08, mats.walnut, cx + 0.01, w.y1 + 0.01, cz), 'none');
  mark(addBox(g, 0.05, 0.045, w.z1 - w.z0 + 0.08, mats.walnut, cx + 0.01, w.y0 - 0.01, cz), 'none');
  mark(addBox(g, 0.05, w.y1 - w.y0 + 0.06, 0.045, mats.walnut, cx + 0.01, cy, w.z0), 'none');
  mark(addBox(g, 0.05, w.y1 - w.y0 + 0.06, 0.045, mats.walnut, cx + 0.01, cy, w.z1), 'none');
  mark(addBox(g, 0.04, w.y1 - w.y0, 0.03, mats.walnut, cx + 0.012, cy, cz), 'none');
}

function ceiling(g, mats, m) {
  const z0 = m.zInner + 0.08;
  const z1 = 2.35;
  mark(addBox(g, m.W - 0.28, 0.08, z1 - z0, mats.ceiling, -0.1, m.H - 0.05, (z0 + z1) / 2), 'receive');
  for (const x of [-1.85, 0.9, 3.25]) {
    mark(addBox(g, 0.14, 0.18, z1 - z0 - 0.25, mats.beam, x, m.H - 0.18, (z0 + z1) / 2 - 0.05), 'none');
  }
  mark(addBox(g, m.W - 0.15, 0.07, 0.1, mats.walnut, 0, m.H - 0.08, m.zInner + 0.03), 'none');
  mark(addBox(g, 0.1, 0.07, m.D - 0.25, mats.walnut, m.xInner + 0.03, m.H - 0.08, 0.1), 'none');
}

function changingShell(g, mats, m) {
  const c = m.a.changing;
  const x0 = m.xInner;
  const h = c.ceilingY - 0.04;
  const t = 0.12;
  mark(addBox(g, c.xPart - x0, h, t, mats.plaster, (x0 + c.xPart) / 2, h / 2, c.zBack), 'cast');
  const backLen = c.doorZ0 - c.zBack;
  mark(addBox(g, t, h, backLen, mats.plaster, c.xPart, h / 2, c.zBack + backLen / 2), 'cast');
  const frontLen = c.zFront - c.doorZ1;
  mark(addBox(g, t, h, frontLen, mats.plaster, c.xPart, h / 2, c.doorZ1 + frontLen / 2), 'cast');
  const doorW = c.doorZ1 - c.doorZ0;
  mark(addBox(g, t, h - 2.02, doorW, mats.plaster, c.xPart, 2.02 + (h - 2.02) / 2, (c.doorZ0 + c.doorZ1) / 2), 'cast');
  mark(addBox(g, 0.16, 2.02, 0.06, mats.walnut, c.xPart, 1.01, c.doorZ0));
  mark(addBox(g, 0.16, 2.02, 0.06, mats.walnut, c.xPart, 1.01, c.doorZ1));
  mark(addBox(g, 0.16, 0.07, doorW + 0.06, mats.walnut, c.xPart, 2.02, (c.doorZ0 + c.doorZ1) / 2));

  const soffitT = 0.08;
  mark(addBox(
    g, c.xPart - x0 - 0.02, soffitT, c.zFront - c.zBack,
    mats.plasterDeep,
    (x0 + c.xPart) / 2, c.ceilingY + soffitT / 2, (c.zBack + c.zFront) / 2,
  ), 'receive');
  mark(addBox(g, 0.06, 0.06, c.zFront - c.zBack, mats.walnut, c.xPart - 0.02, c.ceilingY + 0.02, (c.zBack + c.zFront) / 2), 'none');

  mark(addBox(g, 0.025, 0.9, c.zFront - c.zBack - 0.16, mats.wainscot, x0 + 0.02, 0.45, (c.zBack + c.zFront) / 2), 'receive');
  mark(addBox(g, 0.04, 0.035, c.zFront - c.zBack - 0.12, mats.walnut, x0 + 0.03, 0.92, (c.zBack + c.zFront) / 2), 'none');
  mark(addBox(g, c.xPart - x0 - 0.2, 0.9, 0.025, mats.wainscot, (x0 + c.xPart) / 2, 0.45, c.zBack + 0.08), 'receive');
  mark(addBox(g, c.xPart - x0 - 0.16, 0.035, 0.04, mats.walnut, (x0 + c.xPart) / 2, 0.92, c.zBack + 0.09), 'none');

  mark(addBox(g, 1.55, 0.014, 1.85, mats.rug, -4.62, 0.007, 3.2), 'receive');
  mark(addBox(g, 0.1, 0.018, doorW, mats.walnut, c.xPart + 0.02, 0.009, (c.doorZ0 + c.doorZ1) / 2), 'receive');

  const rod = addCyl(g, 0.012, 0.012, doorW + 0.15, mats.iron, c.xPart - 0.08, 1.96, (c.doorZ0 + c.doorZ1) / 2, 8);
  rod.rotation.x = Math.PI / 2;
  for (let i = 0; i < 6; i++) {
    const z = c.doorZ0 + 0.02 + i * 0.055;
    mark(addBox(g, 0.028, 1.7, 0.09, i % 2 ? mats.rose : mats.roseDeep, c.xPart - 0.1 - (i % 2) * 0.025, 1.08, z));
  }
  mark(addBox(g, 0.08, 0.1, 0.06, mats.brass, c.xPart - 0.08, 1.78, c.zFront - 0.28), 'none');
  const sconce = addCyl(g, 0.035, 0.02, 0.05, mats.bulb, c.xPart - 0.12, 1.74, c.zFront - 0.28, 10);
  sconce.rotation.z = Math.PI / 2;
  mark(sconce, 'none');
}

function centerMark(g, mats, m) {
  const x = (m.a.mirror.x0 + m.a.mirror.x1) / 2;
  mark(addBox(g, 0.028, 0.004, 3.15, mats.tape, x, 0.004, -0.85), 'none');
  mark(addBox(g, 1.05, 0.004, 0.028, mats.tape, x, 0.005, -0.4), 'none');
}

function makeShell(layout) {
  const g = new THREE.Group();
  g.name = 'shell';
  const m = metrics(layout);
  const mats = palette(layout);
  const { W, D, H } = m;

  mark(addBox(g, W, H, m.wallT, mats.plaster, 0, H / 2, -D / 2), 'cast');
  mark(addBox(g, m.wallT, H, D, mats.plaster, -W / 2, H / 2, 0), 'cast');

  plankFloor(g, mats, m);
  sprungCut(g, mats, m);
  mirrorWall(g, mats, m);
  sideWindow(g, mats, m);
  ceiling(g, mats, m);
  changingShell(g, mats, m);
  centerMark(g, mats, m);
  g.userData.mats = mats;
  g.userData.metrics = m;
  return g;
}

function doubleBarre(g, mats, m) {
  const b = m.a.barre;
  for (const y of b.heights) railX(g, mats.barre, b.x0, b.x1, y, b.z);
  for (let x = b.x0 + 0.35; x <= b.x1 - 0.2; x += 1.22) {
    mark(addBox(g, 0.055, 0.52, 0.02, mats.iron, x, 0.92, m.zInner + 0.012));
    for (const y of b.heights) {
      mark(addBox(g, 0.022, 0.02, b.z - m.zInner - 0.02, mats.brass, x, y, (m.zInner + b.z) / 2));
      addCyl(g, 0.02, 0.02, 0.035, mats.brass, x, y, b.z, 8);
    }
  }
}

function sideBarre(g, mats, m) {
  const b = m.a.sideBarre;
  railZ(g, mats.barre, b.z0, b.z1, b.y, b.x);
  for (let z = b.z0 + 0.28; z <= b.z1 - 0.15; z += 0.95) {
    mark(addBox(g, 0.02, 0.28, 0.06, mats.iron, m.xInner + 0.012, b.y, z));
    mark(addBox(g, b.x - m.xInner - 0.02, 0.02, 0.022, mats.brass, (m.xInner + b.x) / 2, b.y, z));
    addCyl(g, 0.02, 0.02, 0.035, mats.brass, b.x, b.y, z, 8);
  }
}

function uprightPiano(g, mats, m) {
  const p = m.a.piano;
  const grp = new THREE.Group();
  grp.position.set(p.x, 0, p.z);
  mark(addBox(grp, 0.56, 1.14, 1.26, mats.piano, -0.04, 0.63, 0));
  mark(addBox(grp, 0.6, 0.045, 1.32, mats.pianoDark, -0.02, 1.22, 0));
  mark(addBox(grp, 0.56, 0.07, 1.26, mats.pianoDark, -0.04, 0.035, 0));
  mark(addBox(grp, 0.2, 0.045, 1.12, mats.pianoDark, 0.3, 0.7, 0));
  mark(addBox(grp, 0.16, 0.028, 1.06, mats.keys, 0.32, 0.736, 0));
  const pattern = [1, 1, 0, 1, 1, 1, 0];
  for (let i = 0; i < 18; i++) {
    if (!pattern[i % 7]) continue;
    addBox(grp, 0.09, 0.018, 0.026, mats.ebony, 0.28, 0.758, -0.48 + i * 0.056);
  }
  const desk = mark(addBox(grp, 0.02, 0.2, 0.9, mats.pianoDark, 0.16, 1.02, 0));
  desk.rotation.z = -0.42;
  mark(addBox(grp, 0.14, 0.012, 0.2, mats.book, 0.2, 1.08, 0.05), 'none');
  for (const dz of [-0.16, 0, 0.16]) {
    addBox(grp, 0.045, 0.016, 0.055, mats.brass, 0.26, 0.09, dz);
  }
  const lamp = addCyl(grp, 0.045, 0.09, 0.07, mats.brass, 0.02, 1.3, -0.38, 10);
  mark(lamp, 'none');
  const glow = addCyl(grp, 0.03, 0.03, 0.03, mats.bulb, 0.02, 1.25, -0.38, 8);
  mark(glow, 'none');
  g.add(grp);
}

function storageRun(g, mats, m) {
  const s = m.a.storage;
  const widths = s.widths;
  const total = widths.reduce((a, b) => a + b, 0);
  const z0 = s.z0;
  const h = s.h;
  const d = s.d;
  const x = s.x;
  mark(addBox(g, 0.02, h - 0.08, total, mats.interior, x - d / 2 + 0.012, 0.08 + (h - 0.08) / 2, z0 + total / 2), 'receive');
  mark(addBox(g, d, 0.03, total + 0.02, mats.walnut, x, h - 0.015, z0 + total / 2));
  mark(addBox(g, d, 0.045, total + 0.02, mats.walnut, x, 0.055, z0 + total / 2));
  mark(addBox(g, d - 0.06, 0.05, total - 0.04, mats.ebony, x + 0.01, 0.025, z0 + total / 2), 'receive');
  let z = z0;
  mark(addBox(g, d, h - 0.04, 0.02, mats.walnut, x, h / 2, z));
  const cells = [];
  for (const w of widths) {
    const center = z + w / 2;
    cells.push(center);
    z += w;
    mark(addBox(g, d, h - 0.04, 0.018, mats.walnut, x, h / 2, z));
  }
  const xIn = x + 0.02;
  const slipperY = 0.1;
  const slipA = new THREE.Mesh(new THREE.SphereGeometry(0.04, 10, 8), mats.slipper);
  slipA.scale.set(1.7, 0.32, 0.75);
  slipA.position.set(xIn, slipperY, cells[0] - 0.04);
  slipA.rotation.y = 0.4;
  g.add(slipA);
  const slipB = slipA.clone();
  slipB.material = mats.ebony;
  slipB.position.set(xIn, slipperY, cells[0] + 0.05);
  slipB.rotation.y = -0.2;
  g.add(slipB);

  mark(addBox(g, d - 0.06, 0.018, widths[2] - 0.04, mats.walnut, x + 0.01, 0.4, cells[2]));
  const towel = addCyl(g, 0.055, 0.055, widths[2] - 0.08, mats.towel, xIn, 0.47, cells[2], 10);
  towel.rotation.x = Math.PI / 2;

  mark(addBox(g, 0.16, 0.18, 0.11, mats.navy, xIn, 0.2, cells[3]));
  mark(addBox(g, 0.1, 0.012, 0.012, mats.brass, xIn, 0.3, cells[3]), 'none');
  return cells;
}

function soundDeck(g, mats, m) {
  const d = m.a.soundDeck;
  mark(addBox(g, d.w, d.h, d.d, mats.walnut, d.x, d.h / 2, d.z));
  mark(addBox(g, d.w - 0.06, 0.012, 0.008, mats.pianoDark, d.x, d.h * 0.38, d.z + d.d / 2));
  mark(addBox(g, d.w - 0.06, 0.012, 0.008, mats.pianoDark, d.x, d.h * 0.62, d.z + d.d / 2));
  mark(addBox(g, d.w + 0.02, 0.028, d.d + 0.02, mats.pianoDark, d.x, d.h + 0.01, d.z));
  const screen = mark(addBox(g, 0.2, 0.12, 0.012, mats.screen, d.x - 0.06, d.h + 0.1, d.z + 0.04), 'none');
  screen.rotation.x = -0.45;
  mark(addBox(g, 0.05, 0.012, 0.04, mats.iron, d.x + 0.16, d.h + 0.03, d.z - 0.04), 'none');
}

function speakerStand(g, mats, spec) {
  const { x, z, y: h, rotationY } = spec;
  addCyl(g, 0.17, 0.2, 0.03, mats.iron, x, 0.015, z, 16);
  addCyl(g, 0.018, 0.026, h - 0.06, mats.iron, x, h / 2, z, 10);
  mark(addBox(g, 0.22, 0.018, 0.16, mats.iron, x, h - 0.012, z), 'receive');
  for (let i = 0; i < 3; i++) {
    const a = (i * Math.PI * 2) / 3;
    const foot = addBox(g, 0.2, 0.012, 0.026, mats.iron, x + Math.cos(a) * 0.11, 0.012, z + Math.sin(a) * 0.11);
    foot.rotation.y = -a;
  }
  const face = new THREE.Group();
  face.position.set(x, h + 0.34, z);
  face.rotation.y = rotationY;
  const cone = addCyl(face, 0.09, 0.1, 0.02, mats.iron, 0, 0, 0.14, 18);
  cone.rotation.x = Math.PI / 2;
  mark(cone, 'none');
  const cap = addCyl(face, 0.032, 0.032, 0.024, mats.brass, 0, 0, 0.152, 12);
  cap.rotation.x = Math.PI / 2;
  mark(cap, 'none');
  g.add(face);
}

function fig(g, mats, x, z) {
  addCyl(g, 0.016, 0.026, 0.32, mats.stem, x, 0.42, z, 6);
  mark(addBox(g, 0.26, 0.14, 0.2, mats.leaf, x, 0.66, z), 'none');
  mark(addBox(g, 0.16, 0.11, 0.14, mats.leafDeep, x + 0.08, 0.78, z - 0.04), 'none');
  mark(addBox(g, 0.12, 0.09, 0.12, mats.leaf, x - 0.07, 0.74, z + 0.05), 'none');
}

function pendantBulbs(g, mats, layout) {
  for (const inst of layout.instances || []) {
    if (inst.kind !== 'pendant_lamp') continue;
    const [x, y, z] = inst.position;
    const bulb = addCyl(g, 0.045, 0.045, 0.06, mats.bulb, x, y + 0.16, z, 10);
    mark(bulb, 'none');
  }
}

function shelfBrackets(g, mats, layout) {
  const shelf = (layout.instances || []).find((i) => i.id === 'shelf_change');
  if (!shelf) return;
  const [x, y, z] = shelf.position;
  for (const dx of [-0.22, 0.22]) {
    mark(addBox(g, 0.035, 0.14, 0.035, mats.walnut, x + dx, y - 0.02, z + 0.02));
    mark(addBox(g, 0.035, 0.025, 0.14, mats.walnut, x + dx, y + 0.01, z + 0.05));
  }
}

function makeProcedural(layout) {
  const g = new THREE.Group();
  g.name = 'procedural';
  const mats = palette(layout);
  const m = metrics(layout);
  const tex = contactTexture();
  doubleBarre(g, mats, m);
  sideBarre(g, mats, m);
  uprightPiano(g, mats, m);
  storageRun(g, mats, m);
  soundDeck(g, mats, m);
  for (const key of ['left', 'right']) {
    const s = m.a.speakers[key];
    speakerStand(g, mats, s);
    contact(g, tex, s.x, s.z, 0.48, 0.48, 0.28);
  }
  const pot = (layout.instances || []).find((i) => i.kind === 'flowerpot');
  if (pot) fig(g, mats, pot.position[0], pot.position[2]);
  pendantBulbs(g, mats, layout);
  shelfBrackets(g, mats, layout);

  const bench = (layout.instances || []).find((i) => i.id === 'bench_change');
  if (bench) {
    mark(addBox(g, 0.28, 0.035, 0.26, mats.towel, bench.position[0], 0.5, bench.position[2] + 0.28), 'none');
    contact(g, tex, bench.position[0], bench.position[2], 0.5, 1.55, 0.35);
  }
  const c = m.a.changing;
  mark(addBox(g, 0.34, 0.035, 0.2, mats.tray, c.xPart + 0.28, 0.03, (c.doorZ0 + c.doorZ1) / 2), 'none');
  mark(addBox(g, 0.1, 0.05, 0.2, mats.shoe, c.xPart + 0.2, 0.07, (c.doorZ0 + c.doorZ1) / 2), 'none');
  mark(addBox(g, 0.1, 0.05, 0.2, mats.shoe, c.xPart + 0.34, 0.07, (c.doorZ0 + c.doorZ1) / 2), 'none');

  const toteZ = c.zFront - 0.55;
  mark(addBox(g, 0.16, 0.22, 0.1, mats.navy, c.xPart - 0.18, 1.28, toteZ));
  mark(addBox(g, 0.012, 0.1, 0.012, mats.brass, c.xPart - 0.22, 1.46, toteZ), 'none');
  mark(addBox(g, 0.012, 0.1, 0.012, mats.brass, c.xPart - 0.14, 1.46, toteZ), 'none');
  mark(addBox(g, 0.1, 0.012, 0.012, mats.brass, c.xPart - 0.18, 1.51, toteZ), 'none');
  mark(addBox(g, 0.04, 0.08, 0.03, mats.iron, c.xPart - 0.07, 1.58, toteZ), 'none');

  addBox(g, 0.09, 0.04, 0.09, mats.rosin, m.a.barre.x1 - 0.35, 0.03, m.a.barre.z + 0.42);
  mark(addBox(g, 0.06, 0.008, 0.06, mats.brass, m.a.barre.x1 - 0.35, 0.054, m.a.barre.z + 0.42), 'none');

  contact(g, tex, m.a.piano.x, m.a.piano.z, 0.7, 1.4, 0.4);
  const pb = (layout.instances || []).find((i) => i.id === 'piano_bench');
  if (pb) contact(g, tex, pb.position[0], pb.position[2], 0.5, 0.95, 0.35);
  contact(g, tex, m.a.soundDeck.x, m.a.soundDeck.z, m.a.soundDeck.w + 0.1, m.a.soundDeck.d + 0.1, 0.4);
  const store = m.a.storage;
  const storeLen = store.widths.reduce((a, b) => a + b, 0);
  contact(g, tex, store.x, store.z0 + storeLen / 2, store.d + 0.08, storeLen + 0.08, 0.32);
  if (pot) contact(g, tex, pot.position[0], pot.position[2], 0.32, 0.32, 0.35);
  return g;
}

boot({
  makeShell,
  makeProcedural,
  readyText: 'ready — dance rehearsal · drag orbit · U unlit · T toon',
});
