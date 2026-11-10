import * as THREE from 'three';
import { boot, toon, addBox, addCyl, contactMaterial } from './scene_lib.js';

const STONE = ['#d5c7b3', '#cbbba6', '#c0ae98', '#ddd0ba', '#b5a48c', '#a89880'];

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function addGeo(g, geo, mat, x, y, z) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  g.add(m);
  return m;
}

function lathe(g, pts, mat, x, y, z, seg = 20) {
  const geo = new THREE.LatheGeometry(pts.map(([r, h]) => new THREE.Vector2(r, h)), seg);
  return addGeo(g, geo, mat, x, y, z);
}

function addQuad(g, a, b, c, d, mat) {
  const positions = new Float32Array([
    a[0], a[1], a[2], b[0], b[1], b[2], c[0], c[1], c[2],
    a[0], a[1], a[2], c[0], c[1], c[2], d[0], d[1], d[2],
  ]);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.computeVertexNormals();
  return addGeo(g, geo, mat, 0, 0, 0);
}

function hopper(g, cx, cz, y0, y1, w0, d0, w1, d1, mat) {
  const rect = (y, w, d) => ([
    [cx - w / 2, y, cz - d / 2],
    [cx + w / 2, y, cz - d / 2],
    [cx + w / 2, y, cz + d / 2],
    [cx - w / 2, y, cz + d / 2],
  ]);
  const A = rect(y0, w0, d0);
  const B = rect(y1, w1, d1);
  for (let i = 0; i < 4; i++) {
    const j = (i + 1) % 4;
    addQuad(g, A[i], A[j], B[j], B[i], mat);
  }
}

function rectFrame(g, cx, y, cz, w, d, t, h, mat) {
  addBox(g, w, h, t, mat, cx, y, cz - d / 2);
  addBox(g, w, h, t, mat, cx, y, cz + d / 2);
  addBox(g, t, h, d - t, mat, cx - w / 2, y, cz);
  addBox(g, t, h, d - t, mat, cx + w / 2, y, cz);
}

function placeBlock(g, axis, mid, y, fixed, w, h, depth, mat) {
  if (axis === 'x') addBox(g, w, h, depth, mat, mid, y, fixed);
  else addBox(g, depth, h, w, mat, fixed, y, mid);
}

function ashlar(g, axis, a0, a1, y0, y1, fixed, depth) {
  const courses = [0.17, 0.21, 0.15, 0.19, 0.14];
  const mats = STONE.map((c) => toon(c));
  let y = y0;
  let ci = 0;
  let guard = 0;
  while (y < y1 - 0.06 && guard < 12) {
    guard += 1;
    const h = Math.min(courses[ci % courses.length], y1 - y);
    if (h < 0.08) break;
    const stagger = (ci % 2) * 0.24;
    let cursor = a0;
    let i = 0;
    if (stagger > 0.06 && a1 - a0 > stagger + 0.12) {
      const w0 = stagger - 0.012;
      placeBlock(g, axis, cursor + w0 / 2, y + h / 2, fixed, w0, h, depth, mats[(ci + 2) % mats.length]);
      cursor += stagger;
    }
    while (cursor < a1 - 0.1 && i < 40) {
      const pattern = [0.56, 0.38, 0.48, 0.62, 0.34][i % 5];
      const w = Math.min(pattern, a1 - cursor);
      const mat = mats[(ci * 2 + i) % mats.length];
      placeBlock(g, axis, cursor + w / 2, y + h / 2, fixed, w - 0.012, h - 0.008, depth, mat);
      cursor += w;
      i += 1;
    }
    y += h;
    ci += 1;
  }
}

function pave(g, x0, x1, z0, z1, platform) {
  const rand = mulberry32(20261110);
  const tones = ['#f0e4d2', '#dccab2', '#c2ad94', '#a89078', '#8c7560', '#e7d9c6', '#b49a80', '#6f5e4e'];
  const mats = tones.map((c) => toon(c));
  let z = z0;
  let row = 0;
  while (z < z1 - 0.12 && row < 28) {
    const d = 0.26 + rand() * 0.7;
    let x = x0 - rand() * 0.2;
    if (row % 2) x += 0.28 + rand() * 0.55;
    let i = 0;
    while (x < x1 - 0.12 && i < 22) {
      const w = 0.28 + rand() * 1.05;
      const ww = Math.min(w, x1 - x);
      const dd = Math.min(d, z1 - z);
      const cx = x + ww / 2;
      const cz = z + dd / 2;
      const inside = platform
        && cx > platform.x + 0.08 && cx < platform.x + platform.w - 0.08
        && cz > platform.z + 0.08 && cz < platform.z + platform.d - 0.08;
      if (!inside && ww > 0.22 && dd > 0.2) {
        const tone = mats[Math.floor(rand() * mats.length)];
        addBox(g, Math.max(0.12, ww - 0.03), 0.04, Math.max(0.12, dd - 0.028), tone, cx, 0.022, cz);
      }
      x += w + 0.028;
      i += 1;
    }
    z += d + 0.026;
    row += 1;
  }
}

function makeLattice(w, h, opts) {
  const g = new THREE.Group();
  const frameMat = opts.frame;
  const barMat = opts.bar;
  const t = opts.frameT || 0.055;
  const depth = opts.depth || 0.03;
  const barT = opts.barT || 0.016;
  addBox(g, w, t * 1.35, depth, frameMat, 0, -h / 2 + (t * 1.35) / 2, 0);
  addBox(g, w, t, depth, frameMat, 0, h / 2 - t / 2, 0);
  addBox(g, t, h - t * 2.2, depth, frameMat, -w / 2 + t / 2, 0.02, 0);
  addBox(g, t, h - t * 2.2, depth, frameMat, w / 2 - t / 2, 0.02, 0);
  const iw = w - t * 2;
  const ih = h - t * 2.4;
  const cols = opts.cols || 10;
  const rows = opts.rows || 7;
  const cw = iw / cols;
  const ch = ih / rows;
  const x0 = -iw / 2;
  const y0 = -ih / 2 + 0.01;
  for (let c = 1; c < cols; c++) addBox(g, barT, ih, depth * 0.72, barMat, x0 + c * cw, y0 + ih / 2, 0);
  for (let r = 1; r < rows; r++) addBox(g, iw, barT, depth * 0.72, barMat, 0, y0 + r * ch, 0);
  const med = opts.medallion || 0;
  if (med > 0) {
    const c0 = Math.floor(cols / 2) - Math.floor(med / 2);
    const r0 = Math.floor(rows / 2) - Math.floor(med / 2);
    for (let r = r0; r < r0 + med; r++) {
      for (let c = c0; c < c0 + med; c++) {
        if (r < 0 || c < 0 || r >= rows || c >= cols) continue;
        const cx = x0 + (c + 0.5) * cw;
        const cy = y0 + (r + 0.5) * ch;
        const len = Math.hypot(cw, ch) * 0.9;
        const ang = Math.atan2(ch, cw);
        const d1 = addBox(g, len, barT * 0.8, depth * 0.62, barMat, cx, cy, 0.004);
        d1.rotation.z = ang;
        if ((r + c) % 2 === 0) {
          const d2 = addBox(g, len, barT * 0.8, depth * 0.62, barMat, cx, cy, 0.008);
          d2.rotation.z = -ang;
        }
      }
    }
  }
  return g;
}

function roomOf(layout) {
  const { width: W, depth: D, height: H } = layout.meta.room;
  const wallT = layout.architecture.wallT;
  return {
    W, D, H, wallT,
    backZ: -D / 2,
    leftX: -W / 2,
    backInner: -D / 2 + wallT / 2,
    leftInner: -W / 2 + wallT / 2,
  };
}

function buildShell(layout) {
  const g = new THREE.Group();
  g.name = 'shell';
  const s = layout.shell;
  const arch = layout.architecture;
  const p = layout.platform;
  const R = roomOf(layout);
  const plaster = toon(s.wallColor);
  const recess = toon(s.recessColor);
  const wood = toon(s.woodColor);
  const woodMid = toon(s.woodMid);
  const woodLight = toon(s.woodLight);
  const stone = toon(s.stoneColor);
  const stoneDark = toon(s.stoneDark);
  const ceilMat = toon(s.ceilingColor);
  const yard = toon(s.yardColor);
  const floorMat = toon(s.floorColor);
  const lining = toon('#a07850', { side: THREE.DoubleSide });

  addBox(g, R.W + 7, 0.08, R.D + 6.5, yard, 0.3, -0.14, 0.45);
  addBox(g, R.W, 0.1, R.D, floorMat, 0, -0.05, 0);
  pave(g, -3.85, 3.8, -3.15, 3.15, p);

  const { backZ, leftX, backInner, leftInner, wallT, H } = R;
  const tok = arch.tokonoma;
  const tea = arch.teaNiche;
  const tx0 = tok.x - tok.w / 2;
  const tx1 = tok.x + tok.w / 2;
  const nz0 = tea.z - tea.w / 2;
  const nz1 = tea.z + tea.w / 2;

  addBox(g, R.W, tok.sill, wallT, plaster, 0, tok.sill / 2, backZ);
  addBox(g, tx0 - leftX, H - tok.sill, wallT, plaster, (leftX + tx0) / 2, (H + tok.sill) / 2, backZ);
  addBox(g, leftX + R.W - tx1, H - tok.sill, wallT, plaster, (tx1 + leftX + R.W) / 2, (H + tok.sill) / 2, backZ);
  addBox(g, tok.w, H - tok.head, wallT, plaster, tok.x, (H + tok.head) / 2, backZ);

  addBox(g, wallT, H, nz0 - backZ, plaster, leftX, H / 2, (backZ + nz0) / 2);
  addBox(g, wallT, H, R.D / 2 - nz1, plaster, leftX, H / 2, (nz1 + R.D / 2) / 2);
  addBox(g, wallT, H - tea.head, tea.w, plaster, leftX, (H + tea.head) / 2, tea.z);

  const dadoZ = backInner + 0.03;
  ashlar(g, 'x', -3.9, 3.85, 0, tok.sill, dadoZ, 0.05);
  ashlar(g, 'x', -3.9, tx0 - 0.02, tok.sill, arch.dadoH, dadoZ, 0.05);
  ashlar(g, 'x', tx1 + 0.02, 3.85, tok.sill, arch.dadoH, dadoZ, 0.05);
  const dadoX = leftInner + 0.03;
  ashlar(g, 'z', -3.15, nz0 - 0.02, 0, arch.dadoH, dadoX, 0.05);
  ashlar(g, 'z', nz1 + 0.02, 3.15, 0, arch.dadoH, dadoX, 0.05);

  const railY = arch.dadoH + 0.02;
  addBox(g, tx0 + 3.85, 0.045, 0.07, wood, (-3.85 + tx0) / 2, railY, backInner + 0.05);
  addBox(g, 3.85 - tx1, 0.045, 0.07, wood, (tx1 + 3.85) / 2, railY, backInner + 0.05);
  addBox(g, 0.07, 0.045, nz0 + 3.15, wood, leftInner + 0.05, railY, (-3.15 + nz0) / 2);
  addBox(g, 0.07, 0.045, 3.15 - nz1, wood, leftInner + 0.05, railY, (nz1 + 3.15) / 2);

  addBox(g, 0.22, arch.dadoH, 0.22, stoneDark, leftInner + 0.08, arch.dadoH / 2, backInner + 0.08);

  buildTokonoma(g, layout, R, plaster, recess, wood, stone, stoneDark);
  buildTeaNiche(g, layout, R, recess, wood, woodMid, stone);
  buildPlatform(g, layout, stone, stoneDark, wood);
  buildPosts(g, layout, wood, stoneDark);
  buildCeilingAndSkylight(g, layout, R, ceilMat, wood, woodMid, lining);
  buildLattice(g, layout, R, woodMid, woodLight);

  addBox(g, 0.12, H, 0.12, wood, R.W / 2 - 0.06, H / 2, backZ + wallT / 2 + 0.02);
  addBox(g, 0.12, H, 0.12, wood, leftX + wallT / 2 + 0.02, H / 2, R.D / 2 - 0.06);
  return g;
}

function buildTokonoma(g, layout, R, plaster, recess, wood, stone, stoneDark) {
  const tok = layout.architecture.tokonoma;
  const x0 = tok.x - tok.w / 2;
  const x1 = tok.x + tok.w / 2;
  const zBack = R.backInner - tok.depth;
  const zLip = R.backInner + 0.06;
  const grp = new THREE.Group();
  grp.name = 'tokonoma';
  addBox(grp, tok.w, 0.08, zLip - zBack, stone, tok.x, tok.sill - 0.04, (zBack + zLip) / 2);
  addBox(grp, tok.w + 0.08, tok.head - tok.sill, 0.06, recess, tok.x, (tok.head + tok.sill) / 2, zBack);
  addBox(grp, 0.06, tok.head - tok.sill, tok.depth, recess, x0, (tok.head + tok.sill) / 2, R.backInner - tok.depth / 2);
  addBox(grp, 0.06, tok.head - tok.sill, tok.depth, recess, x1, (tok.head + tok.sill) / 2, R.backInner - tok.depth / 2);
  addBox(grp, tok.w, 0.06, tok.depth, plaster, tok.x, tok.head, R.backInner - tok.depth / 2);
  addBox(grp, 0.09, tok.head - tok.sill, 0.1, wood, x0, (tok.head + tok.sill) / 2, R.backInner + 0.04);
  addBox(grp, 0.09, tok.head - tok.sill, 0.1, wood, x1, (tok.head + tok.sill) / 2, R.backInner + 0.04);
  addBox(grp, tok.w + 0.18, 0.1, 0.12, wood, tok.x, tok.head, R.backInner + 0.02);
  addBox(grp, 0.62, 0.05, 0.34, stoneDark, tok.x - 0.28, tok.sill + 0.025, R.backInner - 0.22);
  const scrollZ = zBack + 0.035;
  addBox(grp, 0.5, 1.08, 0.02, wood, tok.x + 0.12, 1.38, scrollZ);
  addBox(grp, 0.42, 0.98, 0.012, toon('#f7f2e7'), tok.x + 0.12, 1.38, scrollZ + 0.012);
  const enso = addGeo(grp, new THREE.TorusGeometry(0.095, 0.01, 8, 64, Math.PI * 1.92), toon('#1c1c1c'), tok.x + 0.12, 1.5, scrollZ + 0.03);
  enso.rotation.z = -Math.PI / 2;
  enso.userData.noCast = true;
  addBox(grp, 0.032, 0.032, 0.008, toon('#7a2e2a'), tok.x + 0.26, 1.08, scrollZ + 0.02);
  g.add(grp);
}

function buildTeaNiche(g, layout, R, recess, wood, woodMid, stone) {
  const tea = layout.architecture.teaNiche;
  const z0 = tea.z - tea.w / 2;
  const z1 = tea.z + tea.w / 2;
  const xBack = R.leftInner - tea.depth;
  const grp = new THREE.Group();
  grp.name = 'tea-niche';
  addBox(grp, 0.05, tea.head, tea.w, recess, xBack, tea.head / 2, tea.z);
  addBox(grp, tea.depth, tea.head, 0.06, stone, R.leftInner - tea.depth / 2, tea.head / 2, z0);
  addBox(grp, tea.depth, tea.head, 0.06, stone, R.leftInner - tea.depth / 2, tea.head / 2, z1);
  addBox(grp, tea.depth, 0.08, tea.w, recess, R.leftInner - tea.depth / 2, tea.head, tea.z);
  addBox(grp, 0.1, tea.head, 0.1, wood, R.leftInner + 0.02, tea.head / 2, z0);
  addBox(grp, 0.1, tea.head, 0.1, wood, R.leftInner + 0.02, tea.head / 2, z1);
  addBox(grp, 0.12, 0.1, tea.w + 0.16, wood, R.leftInner + 0.02, tea.head, tea.z);
  addBox(grp, 0.02, 1.05, 0.7, woodMid, xBack + 0.03, 1.18, tea.z);
  addBox(grp, (-4.06 - xBack), 0.1, tea.w + 0.16, toon(layout.shell.floorColor), (xBack - 4.06) / 2, -0.05, tea.z);
  addBox(grp, -3.86 - xBack, 0.04, tea.w - 0.12, stone, (xBack - 3.86) / 2, 0.022, tea.z);
  const transom = makeLattice(tea.w - 0.18, 0.46, {
    frame: wood, bar: toon(layout.shell.woodLight), cols: 7, rows: 2, medallion: 0, frameT: 0.04, depth: 0.025,
  });
  transom.rotation.y = -Math.PI / 2;
  transom.position.set(R.leftInner + 0.045, tea.head - 0.32, tea.z);
  grp.add(transom);
  g.add(grp);
}

function buildPlatform(g, layout, stone, stoneDark, wood) {
  const p = layout.platform;
  const grp = new THREE.Group();
  grp.name = 'platform';
  const h = p.top - 0.04;
  addBox(grp, p.w, h, p.d, stone, p.x + p.w / 2, 0.04 + h / 2, p.z + p.d / 2);
  const stepH = 0.07;
  addBox(grp, p.w + 0.08, stepH, 0.36, stoneDark, p.x + p.w / 2, 0.04 + stepH / 2, p.z + p.d + 0.18);
  addBox(grp, 0.34, stepH, p.d, stoneDark, p.x + p.w + 0.17, 0.04 + stepH / 2, p.z + p.d / 2);
  const yN = p.top + 0.012;
  addBox(grp, p.w, 0.024, 0.028, wood, p.x + p.w / 2, yN, p.z + 0.014);
  addBox(grp, p.w, 0.024, 0.028, wood, p.x + p.w / 2, yN, p.z + p.d - 0.014);
  addBox(grp, 0.028, 0.024, p.d - 0.056, wood, p.x + 0.014, yN, p.z + p.d / 2);
  addBox(grp, 0.028, 0.024, p.d - 0.056, wood, p.x + p.w - 0.014, yN, p.z + p.d / 2);

  const inset = 0.17;
  const x0 = p.x + inset;
  const x1 = p.x + p.w - inset;
  const z0 = p.z + inset;
  const z1 = p.z + p.d - inset;
  const seamX = x0 + (x1 - x0) * 0.42;
  const seamL = z0 + (z1 - z0) * 0.48;
  const seamR = z0 + (z1 - z0) * 0.67;
  const mats = [
    [x0, seamX, seamL, z1, '#d8c5a0'],
    [x0, seamX, z0, seamL, '#d2be96'],
    [seamX, x1, seamR, z1, '#decaa6'],
    [seamX, x1, z0, seamR, '#cbb892'],
  ];
  const binding = toon(layout.shell.bindingColor);
  for (const [a, b, c, d, rush] of mats) {
    const cx = (a + b) / 2;
    const cz = (c + d) / 2;
    addBox(grp, b - a, 0.01, d - c, binding, cx, p.top + 0.006, cz);
    addBox(grp, b - a - 0.055, 0.012, d - c - 0.055, toon(rush), cx, p.top + 0.012, cz);
  }
  g.add(grp);
}

function buildPosts(g, layout, wood, stone) {
  const p = layout.platform;
  const beamY = layout.architecture.beamY;
  const xs = [p.x - 0.2, p.x + p.w + 0.2];
  const zs = [p.z - 0.2, p.z + p.d + 0.2];
  const postH = beamY - 0.05;
  for (const x of xs) {
    for (const z of zs) {
      addBox(g, 0.16, 0.1, 0.16, stone, x, 0.09, z);
      addBox(g, 0.1, postH, 0.1, wood, x, postH / 2 + 0.04, z);
    }
  }
  const x0 = xs[0];
  const x1 = xs[1];
  const z0 = zs[0];
  const z1 = zs[1];
  const bh = 0.1;
  const bt = 0.08;
  addBox(g, x1 - x0, bh, bt, wood, (x0 + x1) / 2, beamY, z0);
  addBox(g, x1 - x0, bh, bt, wood, (x0 + x1) / 2, beamY, z1);
  addBox(g, bt, bh, z1 - z0 - bt, wood, x0, beamY, (z0 + z1) / 2);
  addBox(g, bt, bh, z1 - z0 - bt, wood, x1, beamY, (z0 + z1) / 2);
}

function buildCeilingAndSkylight(g, layout, R, ceilMat, wood, woodMid, lining) {
  const sky = layout.architecture.skylight;
  const grp = new THREE.Group();
  grp.name = 'skylight';
  const cx0 = -4.08;
  const cx1 = 3.72;
  const cz0 = -3.4;
  const cz1 = 0.62;
  const hx0 = sky.x - sky.ceil[0] / 2;
  const hx1 = sky.x + sky.ceil[0] / 2;
  const hz0 = sky.z - sky.ceil[1] / 2;
  const hz1 = sky.z + sky.ceil[1] / 2;
  const y = sky.ceilY;
  const t = 0.08;
  addBox(grp, cx1 - cx0, t, hz0 - cz0, ceilMat, (cx0 + cx1) / 2, y, (cz0 + hz0) / 2);
  addBox(grp, cx1 - cx0, t, cz1 - hz1, ceilMat, (cx0 + cx1) / 2, y, (hz1 + cz1) / 2);
  addBox(grp, hx0 - cx0, t, hz1 - hz0, ceilMat, (cx0 + hx0) / 2, y, (hz0 + hz1) / 2);
  addBox(grp, cx1 - hx1, t, hz1 - hz0, ceilMat, (hx1 + cx1) / 2, y, (hz0 + hz1) / 2);
  addBox(grp, cx1 - cx0, 0.06, 0.05, wood, (cx0 + cx1) / 2, y - 0.02, cz1);
  addBox(grp, 0.05, 0.06, cz1 - cz0, wood, cx1, y - 0.02, (cz0 + cz1) / 2);

  hopper(grp, sky.x, sky.z, sky.mouthY, sky.ceilY, sky.mouth[0], sky.mouth[1], sky.ceil[0], sky.ceil[1], lining);
  hopper(grp, sky.x, sky.z, sky.ceilY, sky.topY, sky.ceil[0], sky.ceil[1], sky.top[0], sky.top[1], lining);
  rectFrame(grp, sky.x, sky.mouthY, sky.z, sky.mouth[0], sky.mouth[1], 0.07, 0.08, wood);
  rectFrame(grp, sky.x, sky.ceilY, sky.z, sky.ceil[0], sky.ceil[1], 0.07, 0.09, wood);
  rectFrame(grp, sky.x, sky.topY, sky.z, sky.top[0], sky.top[1], 0.06, 0.07, woodMid);

  const slatH = sky.capY - sky.topY - 0.04;
  const slatY = (sky.topY + sky.capY) / 2 - 0.01;
  const step = 0.14;
  for (let x = sky.x - sky.top[0] / 2; x < sky.x + sky.top[0] / 2 - 0.02; x += step) {
    addBox(grp, 0.03, slatH, 0.03, woodMid, x, slatY, sky.z - sky.top[1] / 2);
    addBox(grp, 0.03, slatH, 0.03, woodMid, x, slatY, sky.z + sky.top[1] / 2);
  }
  for (let z = sky.z - sky.top[1] / 2 + step; z < sky.z + sky.top[1] / 2 - step; z += step) {
    addBox(grp, 0.03, slatH, 0.03, woodMid, sky.x - sky.top[0] / 2, slatY, z);
    addBox(grp, 0.03, slatH, 0.03, woodMid, sky.x + sky.top[0] / 2, slatY, z);
  }
  const glow = toon('#fff0d2', { emissive: '#ffc56a', emissiveIntensity: 0.85, side: THREE.DoubleSide });
  const cap = addBox(grp, sky.top[0] + 0.08, 0.04, sky.top[1] + 0.08, glow, sky.x, sky.capY, sky.z);
  cap.userData.noCast = true;
  const well = addBox(grp, sky.top[0] - 0.12, 0.02, sky.top[1] - 0.12, glow, sky.x, sky.topY + 0.02, sky.z);
  well.userData.noCast = true;

  const kumikoY = sky.topY - 0.02;
  const kw = sky.top[0] - 0.08;
  const kd = sky.top[1] - 0.08;
  for (let i = 0; i <= 4; i++) {
    const x = sky.x - kw / 2 + (kw * i) / 4;
    addBox(grp, 0.03, 0.045, kd, wood, x, kumikoY, sky.z);
  }
  for (let j = 0; j <= 3; j++) {
    const z = sky.z - kd / 2 + (kd * j) / 3;
    addBox(grp, kw, 0.045, 0.03, wood, sky.x, kumikoY, z);
  }

  const ring = addGeo(grp, new THREE.TorusGeometry(0.58, 0.018, 8, 36), woodMid, sky.x, sky.mouthY - 0.18, sky.z);
  ring.rotation.x = Math.PI / 2;
  const ringR = 0.58;
  for (const [dx, dz] of [[0.46, 0.35], [-0.46, 0.35], [0.46, -0.35], [-0.46, -0.35]]) {
    const len = Math.hypot(dx, dz);
    addCyl(grp, 0.008, 0.008, 0.2, wood, sky.x + dx * (ringR / len), sky.mouthY - 0.06, sky.z + dz * (ringR / len), 6);
  }
  g.add(grp);
}

function buildLattice(g, layout, R, woodMid, woodLight) {
  const lat = layout.architecture.lattice;
  const panel = makeLattice(lat.w, lat.h, {
    frame: woodMid,
    bar: woodLight,
    cols: 11,
    rows: 8,
    medallion: 4,
  });
  panel.name = 'back-lattice';
  panel.position.set(lat.x, lat.y, R.backInner + 0.07);
  g.add(panel);
}

function sitExtrude(shape, depth) {
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: true,
    bevelThickness: 0.01,
    bevelSize: 0.012,
    bevelSegments: 2,
    curveSegments: 5,
  });
  geo.rotateX(-Math.PI / 2);
  geo.computeBoundingBox();
  const b = geo.boundingBox;
  geo.translate(-(b.min.x + b.max.x) / 2, -b.min.y, -(b.min.z + b.max.z) / 2);
  return geo;
}

function roundedRect(w, d, r) {
  const s = new THREE.Shape();
  const x = -w / 2;
  const y = -d / 2;
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y);
  s.absarc(x + w - r, y + r, r, -Math.PI / 2, 0, false);
  s.lineTo(x + w, y + d - r);
  s.absarc(x + w - r, y + d - r, r, 0, Math.PI / 2, false);
  s.lineTo(x + r, y + d);
  s.absarc(x + r, y + d - r, r, Math.PI / 2, Math.PI, false);
  s.lineTo(x, y + r);
  s.absarc(x + r, y + r, r, Math.PI, Math.PI * 1.5, false);
  return s;
}

function darken(hex, scale) {
  return new THREE.Color(hex).multiplyScalar(scale);
}

function addSeat(g, seat, y) {
  const grp = new THREE.Group();
  grp.name = seat.id;
  grp.position.set(seat.position[0], y, seat.position[1]);
  grp.rotation.y = seat.rotationY || 0;
  const cloth = toon(seat.color);
  const zafuMat = toon(seat.zafu);
  const zab = addGeo(grp, sitExtrude(roundedRect(0.62, 0.58, 0.08), 0.055), cloth, 0, 0, 0);
  zab.castShadow = true;
  lathe(grp, [
    [0.02, 0], [0.15, 0.008], [0.175, 0.045], [0.168, 0.11], [0.11, 0.15], [0.03, 0.168],
  ], zafuMat, 0, 0.062, -0.02, 22);
  const bolster = addCyl(grp, 0.04, 0.04, 0.42, toon(darken(seat.color, 0.82)), 0, 0.05, 0.31, 12);
  bolster.rotation.z = Math.PI / 2;
  const shadow = addGeo(grp, new THREE.CircleGeometry(1, 20), contactMaterial(), 0, 0.004, 0);
  shadow.rotation.x = -Math.PI / 2;
  shadow.scale.set(0.42, 0.38, 1);
  shadow.userData.noCast = true;
  shadow.userData.noReceive = true;
  shadow.renderOrder = 2;
  g.add(grp);
}

function stem(g, x, y, z, h, lean, rot, color) {
  const grp = new THREE.Group();
  grp.position.set(x, y, z);
  grp.rotation.y = rot;
  grp.rotation.z = lean;
  addCyl(grp, 0.004, 0.007, h, toon('#4a5534'), 0, h / 2, 0, 5);
  const leaf = addBox(grp, 0.13, 0.008, 0.042, toon(color), 0.03, h - 0.01, 0);
  leaf.rotation.z = -0.45;
  const leaf2 = addBox(grp, 0.08, 0.008, 0.03, toon(color), -0.015, h * 0.62, 0.01);
  leaf2.rotation.z = 0.35;
  g.add(grp);
}

function buildProcedural(layout) {
  const g = new THREE.Group();
  g.name = 'procedural';
  const R = roomOf(layout);
  const tok = layout.architecture.tokonoma;
  const p = layout.platform;
  for (const seat of layout.seats) {
    if (seat.zone === 'tea') {
      const mat = new THREE.Group();
      mat.position.set(seat.position[0], 0.046, seat.position[1]);
      mat.rotation.y = seat.rotationY || 0;
      addBox(mat, 0.86, 0.012, 0.78, toon('#d9c6a2'), 0, 0.006, 0);
      addBox(mat, 0.9, 0.008, 0.82, toon(layout.shell.bindingColor), 0, 0.001, 0);
      g.add(mat);
      addSeat(g, seat, 0.058);
    } else {
      addSeat(g, seat, p.top + 0.02);
    }
  }

  const vesselY = tok.sill + 0.05;
  const vx = tok.x - 0.28;
  const vz = R.backInner - 0.22;
  lathe(g, [[0.02, 0], [0.075, 0.012], [0.09, 0.04], [0.055, 0.07], [0.02, 0.078]], toon('#3a332e'), vx, vesselY, vz, 18);
  stem(g, vx, vesselY + 0.06, vz, 0.46, 0.22, 0.4, '#3d6a42');
  stem(g, vx, vesselY + 0.06, vz, 0.3, -0.28, 1.5, '#2c5236');
  stem(g, vx + 0.02, vesselY + 0.06, vz, 0.18, 0.08, -0.8, '#4d7a48');

  const table = (layout.instances || []).find((i) => i.id === 'tea_table');
  const pot = (layout.instances || []).find((i) => i.id === 'alcove_pot');
  if (table) {
    const tx = table.position[0];
    const tz = table.position[2];
    const top = table.position[1] + layout.assets.coffee_table.targetHeight;
    const iron = toon('#2e2b28');
    const ironHi = toon('#3d3934');
    addBox(g, 0.34, 0.012, 0.24, toon('#6a4630'), tx + 0.12, top + 0.006, tz + 0.06);
    lathe(g, [[0.01, 0], [0.05, 0.004], [0.056, 0.02], [0.05, 0.04], [0.058, 0.046], [0.02, 0.05]], toon('#f3efe4'), tx + 0.1, top + 0.012, tz - 0.02, 18);
    lathe(g, [[0.01, 0], [0.048, 0.004], [0.054, 0.022], [0.049, 0.04], [0.056, 0.046], [0.018, 0.05]], toon('#e4d2c0'), tx + 0.16, top + 0.012, tz + 0.12, 18);
    const kx = tx - 0.08;
    const kz = tz + 0.04;
    lathe(g, [[0.012, 0], [0.072, 0.01], [0.086, 0.05], [0.078, 0.1], [0.04, 0.132], [0.022, 0.15]], iron, kx, top, kz, 20);
    addCyl(g, 0.028, 0.034, 0.012, ironHi, kx, top + 0.156, kz, 12);
    addCyl(g, 0.008, 0.008, 0.016, ironHi, kx, top + 0.168, kz, 8);
    const handle = addGeo(g, new THREE.TorusGeometry(0.046, 0.007, 6, 18, Math.PI), ironHi, kx, top + 0.105, kz);
    handle.rotation.y = Math.PI / 2;
    const spout = addGeo(g, new THREE.CylinderGeometry(0.01, 0.016, 0.07, 8), iron, kx + 0.062, top + 0.078, kz);
    spout.rotation.z = -0.85;
    addBox(g, 0.1, 0.008, 0.07, toon('#efe6d4'), tx + 0.22, top + 0.008, tz - 0.16);
    addBox(g, 0.08, 0.01, 0.04, toon('#e5d8c4'), tx + 0.22, top + 0.016, tz - 0.15);

    const lx = tx + 0.02;
    const ly = 1.46;
    const lz = tz;
    const arm0 = R.leftInner + 0.04;
    addBox(g, lx - arm0, 0.035, 0.035, toon(layout.shell.woodColor), (arm0 + lx) / 2, 1.78, lz);
    addBox(g, 0.28, 0.03, 0.03, toon(layout.shell.woodColor), lx + 0.12, 1.62, lz);
    const paper = toon('#f4ddb6', { emissive: '#ff9a3c', emissiveIntensity: 0.7, side: THREE.DoubleSide });
    const shade = addGeo(g, new THREE.CylinderGeometry(0.078, 0.082, 0.26, 16, 1, true), paper, lx, ly, lz);
    shade.userData.noCast = true;
    addCyl(g, 0.09, 0.09, 0.022, toon('#5c3d2a'), lx, ly + 0.14, lz, 12);
    addCyl(g, 0.09, 0.09, 0.02, toon('#5c3d2a'), lx, ly - 0.14, lz, 12);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      addCyl(g, 0.006, 0.006, 0.26, toon('#6b4630'), lx + Math.cos(a) * 0.086, ly, lz + Math.sin(a) * 0.086, 5);
    }
    const flame = addGeo(g, new THREE.SphereGeometry(0.028, 10, 8), toon('#ffd7a8', { emissive: '#ff8a2a', emissiveIntensity: 1.15 }));
    flame.position.set(lx, ly, lz);
    flame.userData.noCast = true;
    addCyl(g, 0.004, 0.004, 0.2, toon('#2a241e'), lx, ly + 0.25, lz, 4);
    const lamp = new THREE.PointLight('#ffb066', 4.5, 4.4, 2);
    lamp.position.set(lx, ly - 0.02, lz);
    g.add(lamp);
  }

  if (pot) {
    const rim = pot.position[1] + layout.assets.flowerpot.targetHeight * 0.96;
    addCyl(g, 0.062, 0.07, 0.016, toon('#3e342c'), pot.position[0], rim, pot.position[2], 12);
    stem(g, pot.position[0], rim, pot.position[2], 0.22, 0.35, 0.6, '#3e6a44');
    stem(g, pot.position[0], rim, pot.position[2], 0.14, -0.2, -0.4, '#2f5538');
  }

  const alcove = new THREE.PointLight('#ffe2c4', 1.15, 3.4, 2);
  alcove.position.set(tok.x, 1.7, R.backInner - 0.2);
  g.add(alcove);

  for (const inst of layout.instances || []) {
    if (inst.id === 'tea_table' || inst.id === 'water_flask' || inst.id === 'alcove_pot') {
      const y = inst.id === 'water_flask' ? inst.position[1] + 0.006 : 0.05;
      const rx = inst.id === 'tea_table' ? 0.55 : 0.16;
      const rz = inst.id === 'tea_table' ? 0.48 : 0.16;
      const shadow = addGeo(g, new THREE.CircleGeometry(1, 18), contactMaterial(), inst.position[0], y, inst.position[2]);
      shadow.rotation.x = -Math.PI / 2;
      shadow.scale.set(rx, rz, 1);
      shadow.userData.noCast = true;
      shadow.userData.noReceive = true;
      shadow.renderOrder = 2;
    }
  }
  return g;
}

boot({
  makeShell: buildShell,
  makeProcedural: buildProcedural,
  readyText: 'ready — meditation room · drag orbit · T toon · U unlit',
});
