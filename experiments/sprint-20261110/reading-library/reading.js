import * as THREE from 'three';
import { boot, toon } from './scene_runtime.js';

const geoCache = new Map();

function geoBox(w, h, d) {
  const key = `${w.toFixed(3)}|${h.toFixed(3)}|${d.toFixed(3)}`;
  let g = geoCache.get(key);
  if (!g) {
    g = new THREE.BoxGeometry(w, h, d);
    geoCache.set(key, g);
  }
  return g;
}

function addBox(group, w, h, d, color, x, y, z, opts = {}) {
  const mesh = new THREE.Mesh(geoBox(w, h, d), toon(color, opts));
  mesh.position.set(x, y, z);
  mesh.castShadow = opts.cast !== false;
  mesh.receiveShadow = opts.receive !== false;
  if (opts.name) mesh.name = opts.name;
  group.add(mesh);
  return mesh;
}

function addCyl(group, r, h, color, x, y, z, opts = {}) {
  const seg = opts.seg || 18;
  const key = `c|${r}|${h}|${seg}`;
  let g = geoCache.get(key);
  if (!g) {
    g = new THREE.CylinderGeometry(r, opts.rBot ?? r, h, seg);
    geoCache.set(key, g);
  }
  const mesh = new THREE.Mesh(g, toon(color, opts));
  mesh.position.set(x, y, z);
  if (opts.rotX) mesh.rotation.x = opts.rotX;
  mesh.castShadow = opts.cast !== false;
  mesh.receiveShadow = opts.receive !== false;
  group.add(mesh);
  return mesh;
}

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const SPINES = [
  '#6e2c2c', '#7a3b32', '#5c2424', '#8a3e3a', '#4a2a28',
  '#243e56', '#1e3348', '#2c4a62', '#3a5168', '#1a2c3e',
  '#2e4634', '#3d5a42', '#243828', '#4e6244',
  '#6a4a28', '#7a5a30', '#4a3420', '#5c4630',
  '#cbb892', '#d8c6a4', '#1c1a18', '#4a3058', '#6a3048', '#8a6840',
];
const BANDS = ['#e6d3a4', '#f0e6c8', '#c6a15a', '#d8cfc2', '#1c1a18'];

let contactMat;
function contactMaterial() {
  if (contactMat) return contactMat;
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  const grad = ctx.createRadialGradient(64, 64, 4, 64, 64, 62);
  grad.addColorStop(0, 'rgba(36,22,12,0.50)');
  grad.addColorStop(0.5, 'rgba(36,22,12,0.20)');
  grad.addColorStop(1, 'rgba(36,22,12,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  contactMat = new THREE.MeshBasicMaterial({
    map: tex,
    transparent: true,
    depthWrite: false,
    toneMapped: false,
  });
  return contactMat;
}

function addContact(group, x, z, w, d, y = 0.028) {
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), contactMaterial());
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set(x, y, z);
  mesh.scale.set(w, d, 1);
  mesh.userData.skipShade = true;
  mesh.castShadow = false;
  mesh.receiveShadow = false;
  mesh.renderOrder = 2;
  group.add(mesh);
  return mesh;
}

function book(group, w, h, d, color, x, y, z, rotY = 0) {
  const mesh = addBox(group, w, h, d, color, x, y, z, { cast: false });
  if (rotY) mesh.rotation.y = rotY;
  return mesh;
}

function spineBand(group, w, h, x, y, zFront) {
  addBox(group, w + 0.003, h, 0.006, BANDS[(Math.abs(Math.round(x * 10)) + Math.round(y * 7)) % BANDS.length], x, y, zFront, {
    cast: false,
    receive: false,
  });
}

function fillShelf(group, xL, xR, yTop, zFront, rnd, fullness, maxDepth = 0.24) {
  let x = xL + 0.025;
  const limit = xR - 0.02;
  let guard = 0;
  while (x < limit - 0.035 && guard++ < 48) {
    const roll = rnd();
    if (roll > fullness) {
      x += 0.05 + rnd() * 0.09;
      continue;
    }
    if (roll < 0.06 && x < limit - 0.18) {
      const sw = 0.15 + rnd() * 0.05;
      const sd = Math.min(maxDepth, 0.16 + rnd() * 0.04);
      let hy = yTop;
      const n = 2 + (rnd() * 3) | 0;
      for (let i = 0; i < n; i++) {
        const th = 0.022 + rnd() * 0.016;
        book(group, sw, th, sd, SPINES[(i * 5 + (rnd() * 20) | 0) % SPINES.length], x + sw / 2, hy + th / 2, zFront - sd / 2 - 0.02);
        hy += th + 0.003;
      }
      x += sw + 0.02;
      continue;
    }
    if (roll < 0.11 && x < limit - 0.22) {
      const cluster = new THREE.Group();
      cluster.position.set(x, yTop, zFront - 0.12);
      cluster.rotation.z = rnd() < 0.5 ? -0.11 : 0.1;
      let lx = 0;
      const count = 3 + (rnd() * 2) | 0;
      for (let i = 0; i < count; i++) {
        const bw = 0.028 + rnd() * 0.02;
        const bh = 0.2 + rnd() * 0.06;
        const bd = Math.min(maxDepth, 0.14 + rnd() * 0.04);
        const m = new THREE.Mesh(geoBox(bw, bh, bd), toon(SPINES[(i + 4) % SPINES.length]));
        m.position.set(lx + bw / 2, bh / 2, 0);
        m.castShadow = false;
        m.receiveShadow = true;
        cluster.add(m);
        lx += bw + 0.003;
      }
      group.add(cluster);
      x += lx + 0.06;
      continue;
    }
    const bw = 0.018 + rnd() * 0.042;
    const bh = 0.17 + rnd() * 0.12;
    const bd = Math.min(maxDepth, 0.14 + rnd() * 0.08);
    const color = SPINES[(rnd() * SPINES.length) | 0];
    const zc = zFront - bd / 2 - 0.018 - rnd() * 0.03;
    book(group, bw, bh, bd, color, x + bw / 2, yTop + bh / 2, zc);
    if (rnd() < 0.62) spineBand(group, bw * 0.92, 0.012, x + bw / 2, yTop + bh * (0.45 + rnd() * 0.35), zc + bd / 2 + 0.004);
    x += bw + 0.004 + rnd() * 0.006;
  }
}

function shelfBays(arch) {
  const { x0, pilaster, widths } = arch.bays;
  let x = x0 + pilaster;
  return widths.map((w, i) => {
    const bay = { i, x0: x, x1: x + w, cx: x + w / 2, w };
    x += w + pilaster;
    return bay;
  });
}

function buildStacks(group, layout, rnd) {
  const s = layout.shell;
  const b = layout.architecture.bays;
  const bays = shelfBays(layout.architecture);
  const zWall = b.zWall;
  const depth = b.depth;
  const zFront = zWall + depth;
  const zCenter = zWall + depth / 2;
  const x0 = b.x0;
  const x1 = b.x1;
  const span = x1 - x0;
  const surfaces = [];
  for (let i = 0; i < 10; i++) surfaces.push(0.3 + i * 0.332);

  addBox(group, span, 0.1, depth + 0.06, s.oakDark, (x0 + x1) / 2, 0.05, zCenter + 0.02);
  addBox(group, span, 0.08, depth + 0.02, s.oak, (x0 + x1) / 2, 0.14, zCenter);
  addBox(group, span, 0.1, depth + 0.08, s.oakMid, (x0 + x1) / 2, 3.62, zCenter + 0.01);
  addBox(group, span + 0.08, 0.08, depth + 0.14, s.oak, (x0 + x1) / 2, 3.7, zCenter + 0.02);
  addBox(group, span + 0.16, 0.06, 0.1, s.oakDark, (x0 + x1) / 2, 3.76, zFront + 0.02);
  addBox(group, span, 0.62, 0.08, s.plaster, (x0 + x1) / 2, 4.12, zWall + 0.05, { cast: false });
  addBox(group, 0.16, 3.5, depth + 0.04, s.oak, x0 - 0.06, 1.8, zCenter);

  const pilZ = zWall + 0.26;
  let px = x0;
  for (let i = 0; i <= bays.length; i++) {
    addBox(group, 0.22, 3.48, 0.5, s.oak, px + 0.11, 1.82, pilZ);
    addBox(group, 0.3, 0.12, 0.54, s.oakDark, px + 0.11, 0.22, pilZ);
    addBox(group, 0.3, 0.1, 0.54, s.oakLight, px + 0.11, 3.48, pilZ);
    px += 0.22 + (bays[i] ? bays[i].w : 0);
  }

  addBox(group, span - 0.2, 0.035, 0.045, s.brass, (x0 + x1) / 2, 3.4, zFront + 0.03, { cast: false });

  for (const bay of bays) {
    const niche = bay.i === b.nicheBay;
    addBox(group, bay.w - 0.02, 3.28, 0.025, s.shelfBack, bay.cx, 1.78, zWall + 0.02, { cast: false });
    const shelfCount = niche ? 7 : 10;
    const start = niche ? 3 : 0;
    for (let i = start; i < shelfCount; i++) {
      const y = surfaces[i];
      addBox(group, bay.w - 0.04, 0.028, depth - 0.02, s.oakMid, bay.cx, y - 0.014, zCenter + 0.01);
      addBox(group, bay.w - 0.06, 0.018, 0.028, s.oakLight, bay.cx, y + 0.004, zFront - 0.01, { cast: false });
      const fullness = (niche ? 0.78 : 0.9) - i * 0.035 - bay.i * 0.015;
      fillShelf(group, bay.x0 + 0.03, bay.x1 - 0.03, y, zFront, rnd, Math.max(0.45, fullness));
    }
    if (niche) {
      addBox(group, bay.w - 0.06, 0.05, depth - 0.06, s.oakLight, bay.cx, 0.93, zCenter + 0.02);
      addBox(group, bay.w - 0.12, 0.7, 0.03, s.oakDark, bay.cx, 0.55, zWall + 0.05, { cast: false });
      let hy = 0.96;
      for (let i = 0; i < 5; i++) {
        const th = 0.035 + (i % 2) * 0.012;
        book(group, bay.w * 0.42, th, 0.28, SPINES[(i + 8) % SPINES.length], bay.cx - 0.28, hy + th / 2, zFront - 0.2);
        hy += th + 0.004;
      }
      addCyl(group, 0.055, 0.08, s.oakDark, bay.cx + 0.28, 1.0, zFront - 0.2, { seg: 16 });
      const globeGeo = geoCache.get('globe') || geoCache.set('globe', new THREE.SphereGeometry(0.15, 28, 18)).get('globe');
      const globe = new THREE.Mesh(globeGeo, toon('#1e3d5c'));
      globe.position.set(bay.cx + 0.28, 1.2, zFront - 0.2);
      globe.castShadow = true;
      globe.receiveShadow = true;
      group.add(globe);
      addCyl(group, 0.155, 0.012, s.brass, bay.cx + 0.28, 1.2, zFront - 0.2, { seg: 24, rotX: Math.PI / 2, cast: false });
    }
  }

  const ladder = new THREE.Group();
  ladder.position.set(bays[1].cx + 0.15, 0, zFront + 0.62);
  ladder.rotation.x = 0.2;
  addBox(ladder, 0.045, 3.15, 0.04, s.oak, -0.18, 1.58, 0);
  addBox(ladder, 0.045, 3.15, 0.04, s.oak, 0.18, 1.58, 0);
  for (let i = 0; i < 9; i++) addBox(ladder, 0.36, 0.025, 0.035, s.oakMid, 0, 0.32 + i * 0.3, 0);
  addCyl(ladder, 0.04, 0.05, s.oakDark, -0.16, 0.05, 0.02, { seg: 12 });
  addCyl(ladder, 0.04, 0.05, s.oakDark, 0.16, 0.05, 0.02, { seg: 12 });
  group.add(ladder);
  addContact(group, (x0 + x1) / 2, zFront + 0.18, span * 0.92, 0.55, 0.02);
}

function buildLeftWall(group, layout) {
  const s = layout.shell;
  const wall = layout.architecture.leftWall;
  const alcoves = layout.architecture.alcoves;
  const { xOut, xGlass, xIn } = wall;
  const H = layout.meta.room.height;
  const Z0 = -layout.meta.room.depth / 2;
  const Z1 = layout.meta.room.depth / 2;
  const thick = xIn - xOut;
  const xMid = (xOut + xIn) / 2;

  const segs = [];
  let z = Z0;
  for (const alcove of alcoves) {
    if (alcove.z0 > z + 0.02) segs.push({ z0: z, z1: alcove.z0, solid: true });
    segs.push({ z0: alcove.z0, z1: alcove.z1, solid: false, alcove });
    z = alcove.z1;
  }
  if (Z1 - z > 0.02) segs.push({ z0: z, z1: Z1, solid: true });

  addBox(group, 0.04, 3.5, alcoves[2].z1 - alcoves[0].z0, s.sky, xOut - 0.04, 2.0, (alcoves[0].z0 + alcoves[2].z1) / 2, {
    cast: false,
    receive: false,
  });

  for (const seg of segs) {
    const zc = (seg.z0 + seg.z1) / 2;
    const zd = seg.z1 - seg.z0;
    if (seg.solid) {
      addBox(group, thick, H, zd, s.plaster, xMid, H / 2, zc);
      addBox(group, 0.06, 0.16, zd - 0.04, s.oakDark, xIn + 0.02, 0.08, zc);
      addBox(group, 0.05, 0.06, zd - 0.02, s.oak, xIn + 0.025, 1.16, zc);
      addBox(group, 0.04, 0.05, zd - 0.02, s.oakMid, xIn + 0.02, 3.15, zc, { cast: false });
      if (zd > 0.7) {
        const panels = Math.max(1, Math.round(zd / 0.85));
        const pw = (zd - 0.12) / panels;
        for (let i = 0; i < panels; i++) {
          const pz = seg.z0 + 0.06 + pw * (i + 0.5);
          addBox(group, 0.025, 0.82, pw - 0.08, s.plasterShade, xIn + 0.02, 0.68, pz, { cast: false });
          addBox(group, 0.02, 0.02, pw - 0.04, s.oak, xIn + 0.03, 0.26, pz, { cast: false });
          addBox(group, 0.02, 0.02, pw - 0.04, s.oak, xIn + 0.03, 1.08, pz, { cast: false });
        }
      }
      if (zd > 1.4) {
        framePicture(group, s, xIn + 0.035, 2.15, zc - 0.38, 0.62, 0.78);
        framePicture(group, s, xIn + 0.035, 2.28, zc + 0.42, 0.48, 0.62);
      }
      addContact(group, xIn + 0.2, zc, 0.45, Math.max(0.4, zd - 0.1), 0.02);
      continue;
    }
    const a = seg.alcove;
    const head = a.seat ? 3.05 : 3.22;
    const transom = 3.58;
    addBox(group, thick, H - transom, zd, s.plaster, xMid, (H + transom) / 2, zc);
    if (!a.seat) {
      addBox(group, thick, a.sill, zd, s.plasterShade, xMid, a.sill / 2, zc);
      addBox(group, 0.12, 0.05, zd - 0.08, s.oakLight, xIn - 0.02, a.sill + 0.02, zc);
      addBox(group, 0.28, 0.42, zd - 0.28, '#4a4e52', xIn + 0.02, 0.28, zc, { cast: false });
      for (let k = -2; k <= 2; k++) {
        addBox(group, 0.02, 0.32, 0.015, '#2e3236', xIn + 0.12, 0.3, zc + k * (zd * 0.14), { cast: false });
      }
    } else {
      addBox(group, xIn - xGlass - 0.08, 0.4, zd - 0.12, s.oak, (xGlass + xIn) / 2 - 0.02, 0.2, zc);
      addBox(group, xIn - xGlass - 0.16, 0.07, zd - 0.22, s.cushion, (xGlass + xIn) / 2, 0.435, zc, { cast: false });
      addBox(group, 0.22, 0.1, 0.18, '#c46a58', xIn - 0.22, 0.52, zc - 0.42, { cast: false });
      addBox(group, 0.2, 0.1, 0.16, s.rug, xIn - 0.24, 0.52, zc + 0.38, { cast: false });
      book(group, 0.16, 0.03, 0.22, SPINES[1], xIn - 0.28, 0.5, zc + 0.05);
      book(group, 0.15, 0.028, 0.2, SPINES[6], xIn - 0.3, 0.53, zc + 0.08);
    }
    const winBottom = a.seat ? 0.58 : a.sill + 0.06;
    const winH = head - winBottom;
    const glassOpts = {
      transparent: true,
      opacity: 0.2,
      side: THREE.DoubleSide,
      emissive: '#e7f4ff',
      emissiveIntensity: 0.55,
      depthWrite: false,
      cast: false,
      receive: false,
    };
    addBox(group, 0.02, winH, zd - 0.1, s.glass, xGlass, winBottom + winH / 2, zc, glassOpts);
    addBox(group, 0.02, transom - head - 0.06, zd - 0.1, s.glass, xGlass, (head + transom) / 2, zc, glassOpts);
    addBox(group, 0.07, winH + (transom - head), 0.07, s.oak, xIn - 0.02, (winBottom + transom) / 2, seg.z0 + 0.03);
    addBox(group, 0.07, winH + (transom - head), 0.07, s.oak, xIn - 0.02, (winBottom + transom) / 2, seg.z1 - 0.03);
    addBox(group, 0.08, 0.07, zd, s.oak, xIn - 0.01, head + 0.02, zc);
    addBox(group, 0.08, 0.06, zd, s.oakDark, xIn - 0.01, transom, zc);
    const cols = 3;
    for (let c = 1; c < cols; c++) {
      const mz = seg.z0 + (zd * c) / cols;
      addBox(group, 0.045, winH, 0.035, s.oakMid, xGlass + 0.02, winBottom + winH / 2, mz, { cast: true });
    }
    addBox(group, 0.04, 0.04, zd - 0.12, s.oakMid, xGlass + 0.02, winBottom + winH * 0.5, zc, { cast: true });
    if (a.id === 'carrel') addCarrel(group, s, a);
  }
  addSconce(group, s, xIn + 0.04, 1.92, -1.82);
  addSconce(group, s, xIn + 0.04, 1.92, 0.35);
}

function framePicture(group, s, x, y, z, w, h) {
  addBox(group, 0.03, h, w, s.oakDark, x, y, z, { cast: false });
  addBox(group, 0.012, h - 0.08, w - 0.08, '#d9cbb0', x + 0.02, y, z, { cast: false, receive: false });
}

function addCarrel(group, s, alcove) {
  const zc = (alcove.z0 + alcove.z1) / 2;
  addBox(group, 0.56, 0.06, 1.4, s.oakLight, -5.42, 0.73, zc);
  addBox(group, 0.5, 0.08, 0.08, s.oak, -5.42, 0.66, zc - 0.62);
  addBox(group, 0.5, 0.08, 0.08, s.oak, -5.42, 0.66, zc + 0.62);
  addBox(group, 0.08, 0.66, 1.28, s.oak, -5.62, 0.33, zc);
  addBox(group, 0.06, 0.64, 0.06, s.oakDark, -5.2, 0.32, zc - 0.62);
  addBox(group, 0.06, 0.64, 0.06, s.oakDark, -5.2, 0.32, zc + 0.62);
  book(group, 0.18, 0.03, 0.24, SPINES[3], -5.42, 0.79, zc + 0.35);
}

function addSconce(group, s, x, y, z) {
  addCyl(group, 0.055, 0.025, s.brass, x, y, z, { rotX: Math.PI / 2, cast: false, seg: 16 });
  addBox(group, 0.1, 0.025, 0.025, s.brass, x + 0.06, y, z, { cast: false });
  addCyl(group, 0.055, 0.07, '#f0d7b0', x + 0.12, y - 0.01, z, {
    emissive: '#ffd2a2',
    emissiveIntensity: 0.28,
    cast: false,
    seg: 16,
  });
}

function buildShell(layout) {
  const g = new THREE.Group();
  g.name = 'shell';
  const { width: W, depth: D, height: H } = layout.meta.room;
  const s = layout.shell;
  const arch = layout.architecture;

  addBox(g, W, 0.1, D, s.floorA, 0, -0.05, 0, { cast: false });
  const planks = Math.round(D / 0.18);
  for (let i = 0; i < planks; i++) {
    const z = -D / 2 + (i + 0.5) * (D / planks);
    const tone = i % 2 === 0 ? s.floorA : s.floorB;
    addBox(g, W - 0.7, 0.012, D / planks - 0.012, tone, 0.05, 0.006, z, { cast: false });
  }
  addBox(g, W, 0.018, 0.28, s.floorBorder, 0, 0.01, -D / 2 + 0.2, { cast: false });
  addBox(g, W, 0.018, 0.22, s.floorBorder, 0, 0.01, D / 2 - 0.16, { cast: false });
  addBox(g, 0.28, 0.018, D, s.floorBorder, -W / 2 + 0.2, 0.01, 0, { cast: false });
  addBox(g, 0.22, 0.018, D, s.floorBorder, W / 2 - 0.16, 0.01, 0, { cast: false });

  const table = arch.tables[0];
  addBox(g, table.hx * 2 + 0.7, 0.012, table.hz * 2 + 1.15, s.rugEdge, table.x, 0.016, table.z, { cast: false });
  addBox(g, table.hx * 2 + 0.42, 0.014, table.hz * 2 + 0.88, s.rug, table.x, 0.022, table.z, { cast: false });
  addBox(g, 2.5, 0.012, 2.15, s.rugEdge, -4.15, 0.016, 1.65, { cast: false });
  addBox(g, 2.22, 0.014, 1.88, '#3d5a4a', -4.15, 0.022, 1.65, { cast: false });

  const backZ = -D / 2 + 0.09;
  addBox(g, W - 0.4, H, 0.16, s.plaster, 0.15, H / 2, backZ, { cast: false });
  addBox(g, arch.bays.x1 - arch.bays.x0, 0.08, 0.08, s.oak, (arch.bays.x0 + arch.bays.x1) / 2, H - 0.08, -D / 2 + 0.18, { cast: false });

  const pier = arch.pier;
  addBox(g, pier.x1 - pier.x0, H, pier.z1 - pier.z0, s.plaster, (pier.x0 + pier.x1) / 2, H / 2, (pier.z0 + pier.z1) / 2);
  addBox(g, pier.x1 - pier.x0 - 0.08, 0.9, 0.04, s.plasterShade, (pier.x0 + pier.x1) / 2, 0.6, pier.z1 + 0.01, { cast: false });
  addBox(g, pier.x1 - pier.x0, 0.08, 0.06, s.oak, (pier.x0 + pier.x1) / 2, 1.12, pier.z1 + 0.02, { cast: false });
  addBox(g, pier.x1 - pier.x0, 0.14, 0.05, s.oakDark, (pier.x0 + pier.x1) / 2, 0.07, pier.z1 + 0.02, { cast: false });
  framePicture(g, s, (pier.x0 + pier.x1) / 2, 2.2, pier.z1 + 0.03, 0.7, 0.9);

  const ceilY = H - 0.05;
  addBox(g, 10.4, 0.08, 5.3, s.ceiling, -1.15, ceilY, -1.85, { cast: false });
  addBox(g, 2.5, 0.08, 2.5, s.ceiling, -5.15, ceilY, 2.05, { cast: false });
  const beamYs = [4.28];
  for (const y of beamYs) {
    for (const z of [-3.55, -2.15, -0.55]) {
      addBox(g, 10.1, 0.2, 0.16, s.beam, -1.2, y, z);
    }
    for (const x of [-4.4, -1.6, 1.5]) {
      addBox(g, 0.16, 0.2, 4.6, s.beam, x, y, -2.05);
    }
  }
  addBox(g, 2.3, 0.16, 0.14, s.beam, -5.2, 4.28, 2.05);

  return g;
}

function buildTable(group, layout) {
  const s = layout.shell;
  const t = layout.architecture.tables[0];
  const top = t.top;
  addBox(group, t.hx * 2, 0.07, t.hz * 2, s.oakLight, t.x, top - 0.035, t.z);
  addBox(group, t.hx * 2 - 0.12, 0.1, 0.08, s.oak, t.x, top - 0.12, t.z - t.hz + 0.08);
  addBox(group, t.hx * 2 - 0.12, 0.1, 0.08, s.oak, t.x, top - 0.12, t.z + t.hz - 0.08);
  for (const x of [t.x - t.hx + 0.45, t.x + t.hx - 0.45]) {
    addBox(group, 0.12, 0.66, t.hz * 2 - 0.12, s.oak, x, 0.36, t.z);
    addBox(group, 0.16, 0.08, t.hz * 2, s.oakDark, x, 0.06, t.z);
    addBox(group, 0.2, 0.08, 0.16, s.oakDark, x, 0.34, t.z, { cast: false });
  }
  addBox(group, t.hx * 2 - 1.1, 0.08, 0.1, s.oakDark, t.x, 0.16, t.z);
  addContact(group, t.x, t.z, t.hx * 2 + 0.35, t.hz * 2 + 0.35, 0.03);

  const open = new THREE.Group();
  open.position.set(t.x - 1.25, top, t.z + 0.02);
  addBox(open, 0.22, 0.015, 0.16, '#f4efe4', -0.1, 0.02, 0, { cast: false });
  addBox(open, 0.22, 0.015, 0.16, '#f7f3ea', 0.1, 0.02, 0, { cast: false });
  open.children[0].rotation.y = 0.15;
  open.children[1].rotation.y = -0.18;
  group.add(open);
  book(group, 0.16, 0.035, 0.22, SPINES[4], t.x + 0.2, top + 0.02, t.z + 0.16);
  book(group, 0.15, 0.028, 0.2, SPINES[11], t.x + 0.22, top + 0.05, t.z + 0.18);
  book(group, 0.18, 0.025, 0.24, SPINES[16], t.x + 1.55, top + 0.015, t.z - 0.18);
}

function buildCart(group, layout, cart) {
  const s = layout.shell;
  const g = new THREE.Group();
  g.position.set(cart.x, 0, cart.z);
  g.rotation.y = cart.rot;
  g.scale.setScalar(cart.scale || 1);
  const L = 1.02;
  const D = 0.48;
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    addCyl(g, 0.075, 0.04, '#242424', sx * (L / 2 - 0.02), 0.075, sz * (D / 2 + 0.015), { seg: 16, rotX: Math.PI / 2, cast: false });
    addCyl(g, 0.02, 0.05, s.brass, sx * (L / 2 - 0.02), 0.075, sz * (D / 2 + 0.015), { seg: 10, rotX: Math.PI / 2, cast: false });
    addBox(g, 0.045, 0.78, 0.045, s.oak, sx * (L / 2 - 0.06), 0.52, sz * (D / 2 - 0.05));
  }
  for (const y of [0.36, 0.68]) {
    addBox(g, L - 0.08, 0.028, D - 0.06, s.oakLight, 0, y, 0);
  }
  addBox(g, 0.045, 0.78, 0.045, s.oak, -L / 2 + 0.02, 0.95, -0.16);
  addBox(g, 0.045, 0.78, 0.045, s.oak, -L / 2 + 0.02, 0.95, 0.16);
  addBox(g, 0.05, 0.045, 0.4, s.brass, -L / 2 + 0.02, 1.32, 0);
  const rnd = mulberry32(Math.round((cart.x + 3) * 1000 + cart.z * 100));
  for (const y of [0.38, 0.7]) {
    fillShelf(g, -L / 2 + 0.12, L / 2 - 0.12, y, D / 2 - 0.05, rnd, 0.8, 0.2);
  }
  group.add(g);
  addContact(group, cart.x, cart.z, 1.15 * (cart.scale || 1), 0.7 * (cart.scale || 1), 0.026);
}

function buildLowRange(group, layout) {
  const s = layout.shell;
  const r = layout.architecture.lowRange;
  const zc = (r.z0 + r.z1) / 2;
  const len = r.z1 - r.z0;
  const rndRoom = mulberry32(77);
  const rndCam = mulberry32(91);
  addBox(group, r.d, 0.1, len, s.oakDark, r.x, 0.05, zc);
  addBox(group, 0.04, r.h - 0.16, len - 0.1, s.shelfBack, r.x, r.h / 2, zc, { cast: false });
  addBox(group, r.d, r.h, 0.045, s.oak, r.x, r.h / 2, r.z0 + 0.02);
  addBox(group, r.d, r.h, 0.045, s.oak, r.x, r.h / 2, r.z1 - 0.02);
  addBox(group, r.d + 0.04, 0.06, len + 0.02, s.oakMid, r.x, r.h - 0.02, zc);
  const shelves = [0.28, 0.58, 0.88];
  for (const y of shelves) {
    addBox(group, r.d - 0.05, 0.025, len - 0.1, s.oakLight, r.x, y, zc);
  }
  const faceRoom = new THREE.Group();
  faceRoom.position.set(r.x, 0, zc);
  faceRoom.rotation.y = -Math.PI / 2;
  const faceCam = new THREE.Group();
  faceCam.position.set(r.x, 0, zc);
  faceCam.rotation.y = Math.PI / 2;
  for (const y of shelves) {
    fillShelf(faceRoom, -len / 2 + 0.1, len / 2 - 0.1, y, r.d / 2 - 0.03, rndRoom, 0.72, 0.16);
    fillShelf(faceCam, -len / 2 + 0.1, len / 2 - 0.1, y, r.d / 2 - 0.03, rndCam, 0.66, 0.16);
  }
  group.add(faceRoom, faceCam);
  addContact(group, r.x, zc, r.d + 0.25, len + 0.12, 0.026);
}

function addPlant(group, x, y, z) {
  addCyl(group, 0.015, 0.16, '#3a5530', x, y + 0.08, z, { seg: 8, cast: false });
  addBox(group, 0.22, 0.16, 0.18, '#3d6b44', x, y + 0.22, z, { cast: false });
  addBox(group, 0.14, 0.12, 0.12, '#2c5536', x + 0.05, y + 0.32, z - 0.03, { cast: false });
}

function dressInstances(group, layout) {
  const s = layout.shell;
  for (const inst of layout.instances) {
    if (inst.kind === 'dining_chair') addContact(group, inst.position[0], inst.position[2], 0.42, 0.5, 0.03);
    if (inst.kind === 'square_table' || inst.kind === 'school_desk') {
      addContact(group, inst.position[0], inst.position[2], 1.05, 1.05, 0.03);
    }
    if (inst.kind === 'study_desk') addContact(group, inst.position[0], inst.position[2], 0.7, 1.45, 0.03);
    if (inst.kind === 'book_stand') addContact(group, inst.position[0], inst.position[2], 0.7, 0.7, 0.03);
    if (inst.kind === 'flowerpot') {
      if (inst.position[1] < 0.05) addContact(group, inst.position[0], inst.position[2], 0.36, 0.36, 0.03);
      addPlant(group, inst.position[0], inst.position[1] + 0.28, inst.position[2]);
    }
  }
  for (const id of ['pend_a', 'pend_b']) {
    const p = layout.instances.find((i) => i.id === id);
    addCyl(group, 0.012, layout.meta.room.height - 0.2 - (p.position[1] + 0.5), s.oakDark, p.position[0], (layout.meta.room.height - 0.12 + p.position[1] + 0.5) / 2, p.position[2], {
      cast: false,
    });
  }
  const quiet = layout.instances.find((i) => i.id === 'desk_quiet');
  book(group, 0.16, 0.035, 0.22, SPINES[2], quiet.position[0], 0.78, quiet.position[2] + 0.15);
  const index = layout.instances.find((i) => i.id === 'desk_index');
  book(group, 0.2, 0.03, 0.26, SPINES[9], index.position[0], 0.77, index.position[2]);
}

function makeShell(layout) {
  return buildShell(layout);
}

function makeProcedural(layout) {
  const g = new THREE.Group();
  g.name = 'procedural';
  const rnd = mulberry32(20261110);
  buildLeftWall(g, layout);
  buildStacks(g, layout, rnd);
  buildTable(g, layout);
  for (const cart of layout.architecture.carts) buildCart(g, layout, cart);
  buildLowRange(g, layout);
  dressInstances(g, layout);
  const fallen = book(g, 0.26, 0.035, 0.18, SPINES[7], 2.55, 0.03, -2.55);
  fallen.rotation.y = 0.4;
  return g;
}

boot({
  makeShell,
  makeProcedural,
  readyText: 'ready — reading library · drag orbit · U unlit · T toon',
});
