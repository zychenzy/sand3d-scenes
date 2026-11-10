import * as THREE from 'three';
import { boot, toon, unlit, addBox, addCyl, BOOK_COLORS } from './scene_lib.js';

const MUTED_SHADE = '#2d4f3a';
const WARM_BULB = '#ffe4b5';
const WOOD = '#5c3d2a';
const WOOD_D = '#3d281c';
const WOOD_L = '#8a6244';
const PAGE = '#f3ead6';

function tuneAsset(kind, prepared) {
  prepared.traverse((obj) => {
    if (!obj.isMesh) return;
    const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
    for (const mat of mats) {
      if (!mat || !mat.color) continue;
      const c = mat.color;
      const max = Math.max(c.r, c.g, c.b);
      const min = Math.min(c.r, c.g, c.b);
      if (kind === 'library_lamp') {
        if (c.g > 0.32 && c.g > c.r * 1.12 && c.g > c.b * 1.12) {
          c.set(MUTED_SHADE);
        } else if (max > 0.82 && max - min < 0.1) {
          c.set(WARM_BULB);
          mat.userData.keepUnlit = true;
          obj.userData.keepUnlit = true;
        }
      }
    }
  });
}

function packShelf(grp, width, y, seed) {
  let x = -width / 2 + 0.018;
  const xEnd = width / 2 - 0.018;
  let i = 0;
  while (x < xEnd - 0.028) {
    const r = (seed * 13 + i * 29) % 11;
    if (r === 0 && xEnd - x > 0.17) {
      const n = 2 + (i % 3);
      for (let k = 0; k < n; k++) {
        const bw = 0.14 + (k % 3) * 0.018;
        const bh = 0.026;
        const bd = 0.11 + (k % 2) * 0.015;
        const m = new THREE.Mesh(
          new THREE.BoxGeometry(bw, bh, bd),
          toon(BOOK_COLORS[(i + k + seed) % BOOK_COLORS.length])
        );
        m.position.set(x + bw / 2, y + 0.013 + k * 0.026, 0.05);
        m.castShadow = true;
        m.receiveShadow = true;
        grp.add(m);
      }
      x += 0.175;
    } else {
      const bw = 0.032 + (i % 5) * 0.0055;
      if (x + bw > xEnd) break;
      const bh = 0.185 + ((i + seed) % 7) * 0.018;
      const bd = 0.115 + (i % 3) * 0.016;
      const m = new THREE.Mesh(
        new THREE.BoxGeometry(bw, bh, bd),
        toon(BOOK_COLORS[(i + seed * 3) % BOOK_COLORS.length])
      );
      const pull = ((i + seed) % 9 === 0) ? 0.03 : 0;
      m.position.set(x + bw / 2, y + bh / 2, 0.04 + pull);
      m.castShadow = true;
      m.receiveShadow = true;
      grp.add(m);
      x += bw + 0.0012;
    }
    i++;
  }
}

function tallStack(g, x, z, rotY, opts = {}) {
  const W = opts.width ?? 1.2;
  const H = opts.height ?? 3.42;
  const D = opts.depth ?? 0.44;
  const shelves = opts.shelves ?? 6;
  const seed = opts.seed ?? 1;
  const wood = toon(WOOD);
  const woodD = toon(WOOD_D);
  const woodL = toon(WOOD_L);
  const grp = new THREE.Group();

  addBox(grp, W, H, 0.04, woodD, 0, H / 2, -D / 2 + 0.02);
  addBox(grp, 0.05, H, D, wood, -W / 2 + 0.025, H / 2, 0);
  addBox(grp, 0.05, H, D, wood, W / 2 - 0.025, H / 2, 0);
  addBox(grp, W, 0.08, D + 0.02, woodD, 0, 0.04, 0.01);
  addBox(grp, W + 0.04, 0.07, D + 0.04, wood, 0, H - 0.03, 0.01);
  addBox(grp, W - 0.02, 0.035, 0.05, woodL, 0, H - 0.08, D / 2 - 0.01);

  const innerH = H - 0.18;
  for (let s = 0; s < shelves; s++) {
    const y = 0.1 + s * (innerH / shelves);
    addBox(grp, W - 0.1, 0.028, D - 0.06, woodL, 0, y, 0.01);
    packShelf(grp, W - 0.16, y + 0.014, seed + s * 4);
  }

  grp.position.set(x, 0, z);
  grp.rotation.y = rotY;
  g.add(grp);
  return grp;
}

function paneledWainscot(g, W, D, h) {
  const wood = toon(WOOD);
  const inset = toon('#4a3224');
  addBox(g, W - 0.28, 0.08, 0.07, wood, 0, h - 0.04, -D / 2 + 0.11);
  addBox(g, 0.07, 0.08, D - 0.28, wood, -W / 2 + 0.11, h - 0.04, 0);
  addBox(g, W - 0.28, 0.07, 0.07, wood, 0, 0.04, -D / 2 + 0.11);
  addBox(g, 0.07, 0.07, D - 0.28, wood, -W / 2 + 0.11, 0.04, 0);
  for (let i = -4; i <= 4; i++) {
    addBox(g, 0.05, h - 0.1, 0.05, wood, i * 1.15, h / 2, -D / 2 + 0.11);
    addBox(g, 0.95, h - 0.22, 0.02, inset, i * 1.15, h / 2, -D / 2 + 0.09);
  }
  for (let i = -3; i <= 3; i++) {
    addBox(g, 0.05, h - 0.1, 0.05, wood, -W / 2 + 0.11, h / 2, i * 1.05);
    addBox(g, 0.02, h - 0.22, 0.85, inset, -W / 2 + 0.09, h / 2, i * 1.05);
  }
}

function column(g, x, z, H) {
  const wood = toon(WOOD);
  const woodD = toon(WOOD_D);
  addBox(g, 0.28, 0.08, 0.28, woodD, x, 0.04, z);
  addBox(g, 0.2, H - 0.28, 0.2, wood, x, (H - 0.28) / 2 + 0.08, z);
  addBox(g, 0.3, 0.08, 0.3, wood, x, H - 0.12, z);
  addBox(g, 0.22, 0.05, 0.22, woodD, x, H - 0.18, z);
}

function clerestory(g, x, y, z, w, h) {
  const glass = toon('#d8c9a4', { transparent: true, opacity: 0.38, side: THREE.DoubleSide });
  const frame = toon(WOOD_D);
  addBox(g, w, h, 0.04, glass, x, y, z);
  addBox(g, w + 0.08, 0.05, 0.07, frame, x, y + h / 2, z + 0.01);
  addBox(g, w + 0.08, 0.05, 0.07, frame, x, y - h / 2, z + 0.01);
  addBox(g, 0.05, h, 0.07, frame, x - w / 2, y, z + 0.01);
  addBox(g, 0.05, h, 0.07, frame, x + w / 2, y, z + 0.01);
  addBox(g, 0.04, h, 0.05, frame, x, y, z + 0.01);
}

function makeShell(layout) {
  const g = new THREE.Group();
  g.name = 'shell';
  const { width: W, depth: D, height: H } = layout.meta.room;
  const s = layout.shell;
  const floorMat = toon(s.floorColor);
  const wallMat = toon(s.wallColor);
  const wood = toon(s.woodColor);
  const woodD = toon(WOOD_D);
  const ceilMat = toon(s.ceilingColor);
  const carpet = toon(s.carpetColor);

  const floor = new THREE.Mesh(new THREE.BoxGeometry(W, 0.08, D), floorMat);
  floor.position.y = -0.04;
  floor.receiveShadow = true;
  g.add(floor);
  for (let i = -6; i <= 6; i++) {
    addBox(g, W - 0.35, 0.004, 0.028, toon('#b08960'), 0, 0.002, i * 0.62);
  }
  addBox(g, 2.55, 0.022, D - 0.7, carpet, 0.1, 0.015, 0.05);

  const back = new THREE.Mesh(new THREE.BoxGeometry(W, H, 0.16), wallMat);
  back.position.set(0, H / 2, -D / 2);
  back.receiveShadow = true;
  g.add(back);
  const left = new THREE.Mesh(new THREE.BoxGeometry(0.16, H, D), wallMat);
  left.position.set(-W / 2, H / 2, 0);
  left.receiveShadow = true;
  g.add(left);

  paneledWainscot(g, W, D, 1.02);
  addBox(g, W - 0.25, 0.07, 0.08, wood, 0, 3.52, -D / 2 + 0.13);
  addBox(g, 0.08, 0.07, D - 0.25, wood, -W / 2 + 0.13, 3.52, 0);
  addBox(g, W - 0.4, 0.05, 0.06, woodD, 0, H - 0.16, -D / 2 + 0.12);
  addBox(g, 0.06, 0.05, D - 0.4, woodD, -W / 2 + 0.12, H - 0.16, 0);

  clerestory(g, -3.15, 3.78, -D / 2 + 0.09, 2.15, 0.58);
  clerestory(g, 0.0, 3.78, -D / 2 + 0.09, 2.15, 0.58);
  clerestory(g, 3.15, 3.78, -D / 2 + 0.09, 2.15, 0.58);

  const glass = toon('#d8c9a4', { transparent: true, opacity: 0.4, side: THREE.DoubleSide });
  addBox(g, 0.05, 1.55, 1.35, glass, -W / 2 + 0.1, 2.35, 3.15);
  addBox(g, 0.08, 0.07, 1.45, wood, -W / 2 + 0.16, 1.54, 3.15);
  addBox(g, 0.06, 1.55, 0.05, woodD, -W / 2 + 0.12, 2.35, 3.15);
  addBox(g, 0.06, 1.55, 0.05, woodD, -W / 2 + 0.12, 2.35, 2.5);
  addBox(g, 0.06, 1.55, 0.05, woodD, -W / 2 + 0.12, 2.35, 3.8);
  addBox(g, 0.05, 0.48, 2.2, wood, -W / 2 + 0.12, 1.28, 2.55);

  const ceil = new THREE.Mesh(new THREE.BoxGeometry(W * 0.92, 0.1, D * 0.72), ceilMat);
  ceil.position.set(-0.12, H - 0.05, -D * 0.12);
  ceil.receiveShadow = true;
  g.add(ceil);
  for (const z of [-2.85, -1.5, -0.15, 1.2, 2.55]) {
    addBox(g, W * 0.86, 0.1, 0.12, wood, -0.1, H - 0.16, z);
  }
  for (const x of [-3.6, -1.2, 1.2, 3.6]) {
    addBox(g, 0.1, 0.08, D * 0.62, wood, x, H - 0.2, -0.55);
  }

  column(g, 4.62, -3.48, 3.58);

  addBox(g, 4.4, 0.05, 0.06, toon('#2a2420'), 0, H - 0.28, -1.5);
  for (const x of [-1.8, -0.6, 0.6, 1.8]) {
    addCyl(g, 0.05, 0.07, 0.09, toon('#2a2420'), x, H - 0.36, -1.5, 10);
    addCyl(g, 0.04, 0.04, 0.03, unlit('#ffe6c0'), x, H - 0.42, -1.5, 10);
  }
  return g;
}

function readingTable(g, x, z, len, depth) {
  const top = toon('#c4a06c');
  const wood = toon(WOOD);
  const woodD = toon(WOOD_D);
  addBox(g, len, 0.07, depth, top, x, 0.745, z);
  addBox(g, len - 0.12, 0.045, 0.08, woodD, x, 0.7, z);
  addBox(g, 0.12, 0.7, depth - 0.12, wood, x - len / 2 + 0.16, 0.35, z);
  addBox(g, 0.12, 0.7, depth - 0.12, wood, x + len / 2 - 0.16, 0.35, z);
  addBox(g, len - 0.4, 0.06, 0.1, wood, x, 0.1, z);
  addBox(g, 0.08, 0.08, depth - 0.15, wood, x - 0.9, 0.1, z);
  addBox(g, 0.08, 0.08, depth - 0.15, wood, x + 0.9, 0.1, z);
}

function openBook(g, x, y, z, rotY, cover) {
  const grp = new THREE.Group();
  const page = toon(PAGE);
  const cov = toon(cover || '#5a2a28');
  const left = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.012, 0.22), page);
  left.position.set(-0.09, 0, 0);
  left.rotation.z = 0.08;
  const right = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.012, 0.22), page);
  right.position.set(0.09, 0, 0);
  right.rotation.z = -0.08;
  const spine = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.02, 0.22), cov);
  spine.position.set(0, -0.004, 0);
  grp.add(left, right, spine);
  addBox(grp, 0.07, 0.001, 0.14, toon('#c4b49a'), -0.08, 0.01, 0);
  grp.position.set(x, y, z);
  grp.rotation.y = rotY;
  grp.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  g.add(grp);
}

function closedBook(g, x, y, z, rotY, col, w = 0.15, h = 0.03, d = 0.2) {
  const m = addBox(g, w, h, d, toon(col), x, y, z);
  m.rotation.y = rotY;
}

function papers(g, x, y, z, rotY) {
  addBox(g, 0.18, 0.004, 0.24, toon('#efe6d2'), x, y, z);
  const m = addBox(g, 0.16, 0.003, 0.21, toon('#f7f1e4'), x + 0.02, y + 0.004, z + 0.01);
  m.rotation.y = rotY;
}

function inkwell(g, x, y, z) {
  addCyl(g, 0.025, 0.03, 0.05, toon('#2a2420'), x, y + 0.025, z, 10);
  addCyl(g, 0.012, 0.012, 0.08, toon('#3a3028'), x + 0.04, y + 0.04, z, 6);
}

function lampGlow(g, x, y, z) {
  const disc = new THREE.Mesh(
    new THREE.CylinderGeometry(0.16, 0.2, 0.012, 16),
    unlit('#ffd7a0', { transparent: true, opacity: 0.55, depthWrite: false })
  );
  disc.position.set(x, y, z);
  disc.userData.keepUnlit = true;
  g.add(disc);
  const pool = new THREE.Mesh(
    new THREE.CylinderGeometry(0.32, 0.38, 0.006, 16),
    unlit('#ffecc4', { transparent: true, opacity: 0.22, depthWrite: false })
  );
  pool.position.set(x, 0.786, z);
  pool.userData.keepUnlit = true;
  g.add(pool);
}

function cardCatalog(g, x, z, rotY) {
  const grp = new THREE.Group();
  const wood = toon(WOOD);
  const woodL = toon(WOOD_L);
  const brass = toon('#c4a05a');
  addBox(grp, 1.05, 1.18, 0.46, wood, 0, 0.59, 0);
  addBox(grp, 1.08, 0.05, 0.5, woodL, 0, 1.2, 0);
  for (let r = 0; r < 5; r++) {
    for (let c = 0; c < 4; c++) {
      const dx = -0.36 + c * 0.24;
      const dy = 0.22 + r * 0.2;
      addBox(grp, 0.21, 0.16, 0.03, woodL, dx, dy, 0.24);
      addCyl(grp, 0.012, 0.012, 0.02, brass, dx, dy, 0.26, 8);
    }
  }
  grp.position.set(x, 0, z);
  grp.rotation.y = rotY;
  g.add(grp);
}

function bookCart(g, x, z, rotY) {
  const grp = new THREE.Group();
  const metal = toon('#4a4844');
  const wood = toon(WOOD_L);
  addBox(grp, 0.7, 0.04, 0.42, wood, 0, 0.42, 0);
  addBox(grp, 0.7, 0.04, 0.42, wood, 0, 0.78, 0);
  addBox(grp, 0.04, 0.9, 0.04, metal, -0.32, 0.5, -0.18);
  addBox(grp, 0.04, 0.9, 0.04, metal, 0.32, 0.5, -0.18);
  addBox(grp, 0.04, 0.9, 0.04, metal, -0.32, 0.5, 0.18);
  addBox(grp, 0.04, 0.9, 0.04, metal, 0.32, 0.5, 0.18);
  addCyl(grp, 0.05, 0.05, 0.04, metal, -0.3, 0.05, -0.16, 10);
  addCyl(grp, 0.05, 0.05, 0.04, metal, 0.3, 0.05, -0.16, 10);
  addCyl(grp, 0.05, 0.05, 0.04, metal, -0.3, 0.05, 0.16, 10);
  addCyl(grp, 0.05, 0.05, 0.04, metal, 0.3, 0.05, 0.16, 10);
  packShelf(grp, 0.62, 0.44, 8);
  packShelf(grp, 0.62, 0.8, 11);
  grp.position.set(x, 0, z);
  grp.rotation.y = rotY;
  g.add(grp);
}

function foliage(g, x, z, s = 1) {
  const leaf = toon('#2f5a38');
  const leaf2 = toon('#1e4030');
  addCyl(g, 0.02 * s, 0.03 * s, 0.22 * s, toon('#3d5c2e'), x, 0.28 * s, z, 8);
  const a = new THREE.Mesh(new THREE.SphereGeometry(0.18 * s, 10, 8), leaf);
  a.position.set(x, 0.48 * s, z);
  a.scale.set(1.15, 0.9, 1);
  g.add(a);
  const b = new THREE.Mesh(new THREE.SphereGeometry(0.13 * s, 10, 8), leaf2);
  b.position.set(x + 0.1 * s, 0.55 * s, z - 0.05 * s);
  g.add(b);
  const c = new THREE.Mesh(new THREE.SphereGeometry(0.11 * s, 8, 8), leaf);
  c.position.set(x - 0.08 * s, 0.52 * s, z + 0.06 * s);
  g.add(c);
}

function wallClock(g, x, y, z) {
  const wood = toon(WOOD_D);
  const face = toon('#f0e6d2');
  addCyl(g, 0.16, 0.16, 0.05, wood, x, y, z, 20);
  addCyl(g, 0.13, 0.13, 0.04, face, x, y, z + 0.02, 20);
  addBox(g, 0.015, 0.09, 0.01, toon('#2a2420'), x, y + 0.02, z + 0.04);
  addBox(g, 0.06, 0.012, 0.01, toon('#2a2420'), x + 0.02, y, z + 0.04);
}

function makeProcedural(layout) {
  const g = new THREE.Group();
  g.name = 'procedural';

  const backXs = [-4.34, -3.1, -1.86, -0.62, 0.62, 1.86, 3.1, 4.34];
  backXs.forEach((x, i) => tallStack(g, x, -3.82, 0, { seed: i + 2, width: 1.2, height: 3.42 }));
  [-2.55, -1.31, -0.07].forEach((z, i) => {
    tallStack(g, -5.12, z, Math.PI / 2, { seed: 20 + i, width: 1.2, height: 3.42 });
  });
  tallStack(g, -5.12, 1.22, Math.PI / 2, { seed: 30, width: 1.05, height: 2.35, shelves: 4 });

  readingTable(g, 0, -1.5, 6.05, 1.08);
  readingTable(g, 0, 1.72, 6.05, 1.08);

  const lampSpots = [];
  for (const z of [-1.5, 1.72]) {
    for (const x of [-1.9, -0.63, 0.63, 1.9]) lampSpots.push([x, z]);
  }
  lampSpots.push([-4.05, 2.72]);
  for (const [x, z] of lampSpots) lampGlow(g, x, 1.08, z);

  openBook(g, -1.55, 0.79, -1.28, 0.2, '#5a2a28');
  openBook(g, 0.85, 0.79, -1.68, -0.35, '#2f3d4a');
  openBook(g, -0.35, 0.79, 1.95, 0.4, '#4a2a38');
  openBook(g, 1.55, 0.79, 1.5, -0.15, '#35503a');
  openBook(g, -4.0, 0.78, 2.95, 1.1, '#3a3a6a');

  closedBook(g, -2.15, 0.8, -1.62, 0.3, '#6b3a2a', 0.16, 0.035, 0.22);
  closedBook(g, -2.15, 0.835, -1.62, 0.18, '#2f4a3c', 0.15, 0.03, 0.2);
  closedBook(g, 2.05, 0.8, 1.9, -0.4, '#3a3a6a', 0.17, 0.032, 0.21);
  closedBook(g, 0.2, 0.8, -1.35, 0.5, '#7a5a28', 0.14, 0.028, 0.19);
  closedBook(g, -1.1, 0.8, 1.55, -0.2, '#5a2a3a', 0.15, 0.03, 0.2);

  papers(g, 1.2, 0.785, -1.35, 0.12);
  papers(g, -2.4, 0.785, 1.85, -0.2);
  papers(g, -3.85, 0.775, 2.55, 0.4);
  inkwell(g, -1.25, 0.78, -1.55);
  inkwell(g, 0.45, 0.78, 1.55);
  addCyl(g, 0.035, 0.03, 0.08, toon('#f5f0e6'), 2.25, 0.83, -1.35, 12);
  addCyl(g, 0.035, 0.03, 0.08, toon('#f5f0e6'), -0.85, 0.83, 1.9, 12);

  cardCatalog(g, -4.35, 3.55, 0.08);
  bookCart(g, -0.55, 3.42, -0.45);

  foliage(g, 4.95, -3.55, 1.2);
  foliage(g, -4.95, 3.78, 0.95);
  foliage(g, 4.95, 3.72, 0.85);

  const clock = new THREE.Group();
  wallClock(clock, 0, 0, 0);
  clock.position.set(-layout.meta.room.width / 2 + 0.14, 2.55, 3.15);
  clock.rotation.y = Math.PI / 2;
  g.add(clock);

  return g;
}

boot({
  makeShell,
  makeProcedural,
  tuneAsset,
  readyText: 'ready — library reading room (prior-upgrade) · drag orbit · U unlit · T toon',
});
