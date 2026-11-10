import * as THREE from 'three';
import { boot, toon, addBox } from './scene_lib.js';
import { derive } from './metrics.mjs';

const SPINES = ['#6e3b2c', '#234237', '#3c3a62', '#7a5c2e', '#5c3140', '#2c4a62', '#4a3b2a', '#8a4e2c', '#35503c', '#6a3a48', '#2e3f55', '#705833', '#3e4a38', '#7d4a3a'];

function wood(layout, key) {
  return toon(layout.shell[key]);
}

function addBooks(g, { x0, x1, y, z, depth = 0.15, gap = 0 }) {
  const end = x1 - gap;
  let x = x0 + 0.015;
  let i = 0;
  while (x < end - 0.03) {
    const bw = 0.026 + ((i * 5 + 1) % 4) * 0.007;
    const bh = 0.20 + ((i * 3 + 2) % 6) * 0.022;
    if (x + bw > end - 0.008) break;
    const m = new THREE.Mesh(new THREE.BoxGeometry(bw, bh, depth), toon(SPINES[(i * 3 + Math.round(y * 10)) % SPINES.length]));
    m.position.set(x + bw / 2, y + bh / 2, z);
    m.userData.noShadow = true;
    g.add(m);
    x += bw + 0.004;
    i++;
  }
}

function addSlope(g, x, y0, z0, y1, z1, thickX, thickPerp, mat) {
  const dy = y1 - y0;
  const dz = z1 - z0;
  const len = Math.hypot(dy, dz);
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(thickX, thickPerp, len), mat);
  mesh.rotation.x = -Math.atan2(dy, dz);
  mesh.position.set(x, (y0 + y1) / 2, (z0 + z1) / 2);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  g.add(mesh);
  return mesh;
}

function makeAoMaterial() {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 128;
  const ctx = c.getContext('2d');
  const grd = ctx.createRadialGradient(64, 64, 10, 64, 64, 64);
  grd.addColorStop(0, 'rgba(40,28,18,0.48)');
  grd.addColorStop(0.55, 'rgba(40,28,18,0.18)');
  grd.addColorStop(1, 'rgba(40,28,18,0)');
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const mat = new THREE.MeshBasicMaterial({
    map: tex,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  return mat;
}

function contact(g, mat, x, z, rx, rz, y) {
  const m = new THREE.Mesh(new THREE.CircleGeometry(1, 24), mat);
  m.rotation.x = -Math.PI / 2;
  m.scale.set(rx, rz, 1);
  m.position.set(x, y, z);
  m.userData.keepBasic = true;
  g.add(m);
}

function makeShell(layout) {
  const g = new THREE.Group();
  g.name = 'shell';
  const d = derive(layout);
  const s = layout.shell;
  const plaster = toon(s.wallColor);
  const floorMat = toon(s.floorColor);
  const loftMat = toon(s.loftFloor);
  const ceilMat = toon(s.ceilingColor);
  const dark = toon(s.woodDark);
  const wain = toon(s.wainscot);
  const glass = toon(s.glass, { transparent: true, opacity: 0.28, side: THREE.DoubleSide, depthWrite: false });
  const frame = toon(s.woodColor);
  const wt = 0.14;
  const { minX, maxX, minZ, maxZ, height: H } = d;

  const floor = addBox(g, maxX - minX + 0.3, 0.1, maxZ - minZ + 0.28, floorMat, (minX + maxX) / 2 - 0.05, -0.05, (minZ + maxZ) / 2 + 0.04);
  floor.castShadow = false;

  // Plank seams. Ground boards run east-west; the loft boards run north-south.
  const seam = toon('#b08a62');
  for (let z = minZ + 0.28; z < maxZ - 0.15; z += 0.34) {
    const line = addBox(g, maxX - minX - 0.2, 0.004, 0.012, seam, 0, 0.002, z);
    line.userData.noShadow = true;
    line.castShadow = false;
  }

  function wall(x0, x1, y0, y1, z0, z1) {
    if (x1 - x0 < 0.02 || y1 - y0 < 0.02 || z1 - z0 < 0.02) return;
    addBox(g, x1 - x0, y1 - y0, z1 - z0, plaster, (x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
  }

  // Back wall, cut for the stack window and three clerestory lights.
  const bz0 = minZ - wt;
  const bz1 = minZ;
  const clerestory = layout.meta.carrels.map((c) => {
    const cx = (c.x0 + c.x1) / 2;
    return [cx - 0.36, cx + 0.36];
  });
  wall(minX - wt, maxX, 0, 1.18, bz0, bz1);
  wall(minX - wt, -0.5, 1.18, 2.12, bz0, bz1);
  wall(0.5, maxX, 1.18, 2.12, bz0, bz1);
  wall(minX - wt, maxX, 2.12, 4.58, bz0, bz1);
  let cursor = minX - wt;
  for (const [a, b] of clerestory) {
    wall(cursor, a, 4.58, 5.06, bz0, bz1);
    cursor = b;
  }
  wall(cursor, maxX, 4.58, 5.06, bz0, bz1);
  wall(minX - wt, maxX, 5.06, H, bz0, bz1);

  addWindow(g, { x0: -0.5, x1: 0.5, y0: 1.18, y1: 2.12, z: (bz0 + bz1) / 2, axis: 'z', glass, frame });
  for (const [a, b] of clerestory) {
    addWindow(g, { x0: a, x1: b, y0: 4.58, y1: 5.06, z: (bz0 + bz1) / 2, axis: 'z', glass, frame });
  }

  // Left wall, tall window beside the stair.
  const lx0 = minX - wt;
  const lx1 = minX;
  // In front of the stair, so the wall rail never crosses the glass.
  const winZ0 = 2.72;
  const winZ1 = 3.88;
  const winY0 = 1.05;
  const winY1 = 3.4;
  wall(lx0, lx1, 0, H, minZ - wt, winZ0);
  wall(lx0, lx1, 0, H, winZ1, maxZ);
  wall(lx0, lx1, 0, winY0, winZ0, winZ1);
  wall(lx0, lx1, winY1, H, winZ0, winZ1);
  addWindow(g, { x: (lx0 + lx1) / 2, z0: winZ0, z1: winZ1, y0: winY0, y1: winY1, axis: 'x', glass, frame, mullion: true });

  // Right pier closes the loft. The hall's right side stays open.
  wall(maxX, maxX + wt, 0, H, minZ - wt, d.frontZ + 0.16);

  // Wainscot and baseboard on the solid walls.
  const baseH = 0.1;
  addBox(g, maxX - minX, baseH, 0.025, dark, (minX + maxX) / 2 - 0.1, baseH / 2, minZ + 0.012);
  addBox(g, 0.025, baseH, maxZ - minZ, dark, minX + 0.012, baseH / 2, (minZ + maxZ) / 2);
  addBox(g, -1.02 - minX, 0.82, 0.02, wain, (minX + -1.02) / 2, 0.1 + 0.41, minZ + 0.02);
  addBox(g, maxX - 0.78, 0.82, 0.02, wain, (0.78 + maxX) / 2, 0.1 + 0.41, minZ + 0.02);
  addBox(g, 0.02, 0.82, maxZ - minZ - 0.2, wain, minX + 0.02, 0.1 + 0.41, (minZ + maxZ) / 2);
  addBox(g, maxX - minX, 0.035, 0.035, dark, (minX + maxX) / 2 - 0.2, 0.92, minZ + 0.03);
  addBox(g, 0.035, 0.035, maxZ - minZ, dark, minX + 0.03, 0.92, (minZ + maxZ) / 2);

  // Ceiling: full cover over the loft, partial cover over the communal table.
  addBox(g, maxX - minX + wt + 0.2, 0.08, -0.35 - (minZ - wt), ceilMat, (minX + maxX) / 2, d.ceilingY + 0.04, (minZ - wt - 0.35) / 2);
  addBox(g, 2.2 - (minX - wt), 0.08, 2.35 - -0.35, ceilMat, (minX - wt + 2.2) / 2, d.ceilingY + 0.04, (-0.35 + 2.35) / 2);
  addBox(g, maxX - minX + 0.3, 0.06, 0.08, dark, (minX + maxX) / 2, d.ceilingY, -0.35);
  addBox(g, 0.08, 0.06, 2.7, dark, 2.2, d.ceilingY, 1.0);

  // Loft deck and edge fascia. Joists sit in the procedural group so the soffit reads as structure.
  const deck = addBox(
    g,
    maxX - minX,
    d.deck,
    d.frontZ - minZ,
    loftMat,
    (minX + maxX) / 2,
    d.walkY - d.deck / 2,
    (minZ + d.frontZ) / 2,
  );
  deck.castShadow = true;
  for (let x = minX + 0.22; x < maxX - 0.1; x += 0.3) {
    const line = addBox(g, 0.01, 0.003, d.frontZ - minZ - 0.12, toon('#9a7348'), x, d.walkY + 0.0015, (minZ + d.frontZ) / 2 - 0.02);
    line.userData.noShadow = true;
    line.castShadow = false;
  }
  addBox(g, maxX - minX, d.walkY - d.soffitY, 0.045, dark, (minX + maxX) / 2, (d.walkY + d.soffitY) / 2, d.frontZ + 0.01);

  return g;
}

function addWindow(g, spec) {
  const { glass, frame } = spec;
  const ft = 0.045;
  if (spec.axis === 'z') {
    const { x0, x1, y0, y1, z } = spec;
    addBox(g, x1 - x0, y1 - y0, 0.02, glass, (x0 + x1) / 2, (y0 + y1) / 2, z);
    addBox(g, x1 - x0 + 0.06, ft, 0.06, frame, (x0 + x1) / 2, y1 - ft / 2, z);
    addBox(g, x1 - x0 + 0.06, ft, 0.06, frame, (x0 + x1) / 2, y0 + ft / 2, z);
    addBox(g, ft, y1 - y0, 0.06, frame, x0, (y0 + y1) / 2, z);
    addBox(g, ft, y1 - y0, 0.06, frame, x1, (y0 + y1) / 2, z);
    addBox(g, 0.03, y1 - y0 - 0.08, 0.04, frame, (x0 + x1) / 2, (y0 + y1) / 2, z);
  } else {
    const { x, z0, z1, y0, y1 } = spec;
    addBox(g, 0.02, y1 - y0, z1 - z0, glass, x, (y0 + y1) / 2, (z0 + z1) / 2);
    addBox(g, 0.07, ft, z1 - z0 + 0.06, frame, x, y1 - ft / 2, (z0 + z1) / 2);
    addBox(g, 0.07, ft, z1 - z0 + 0.06, frame, x, y0 + ft / 2, (z0 + z1) / 2);
    addBox(g, 0.07, y1 - y0, ft, frame, x, (y0 + y1) / 2, z0);
    addBox(g, 0.07, y1 - y0, ft, frame, x, (y0 + y1) / 2, z1);
    addBox(g, 0.05, y1 - y0 - 0.1, 0.035, frame, x, (y0 + y1) / 2, (z0 + z1) / 2);
    const midY = y0 + (y1 - y0) * 0.42;
    addBox(g, 0.05, 0.035, z1 - z0 - 0.08, frame, x, midY, (z0 + z1) / 2);
  }
}

function makeProcedural(layout) {
  const g = new THREE.Group();
  g.name = 'procedural';
  const d = derive(layout);
  const s = layout.shell;
  const dark = toon(s.woodDark);
  const oak = toon(s.woodColor);
  const tread = toon(s.stairTread);
  const top = toon(s.deskTop);
  const rail = toon(s.railColor);
  const rug = toon(s.rugColor);
  const leaf = toon('#3e6846');
  const leaf2 = toon('#2f5238');
  const paper = toon('#f3efe4');
  const cushion = toon(s.cushion);

  buildStructure(g, layout, d, dark, oak);
  buildStair(g, d, dark, tread, rail);
  buildGuard(g, d, rail);
  buildStacks(g, layout, d, dark, oak);
  buildCarrels(g, layout, d, dark, oak, top, paper);
  buildTable(g, d, dark, top, rug, paper);
  buildWindowSeat(g, d, oak, cushion, paper);
  buildFoliage(g, layout, leaf, leaf2);
  buildCords(g, layout, d);
  buildCaseBooks(g, layout);
  buildContacts(g, layout, d);
  return g;
}

function buildStructure(g, layout, d, dark, oak) {
  for (const x of d.postXs) {
    addBox(g, 0.14, d.soffitY, 0.14, dark, x, d.soffitY / 2, d.frontZ - 0.06);
    addBox(g, 0.22, 0.08, 0.22, oak, x, d.soffitY - 0.04, d.frontZ - 0.06);
    addBox(g, 0.2, 0.06, 0.2, oak, x, 0.03, d.frontZ - 0.06);
  }
  const joistH = d.walkY - d.deck - d.soffitY;
  for (let x = d.minX + 0.28; x < d.maxX - 0.1; x += 0.74) {
    addBox(g, 0.07, joistH, d.frontZ - d.minZ - 0.12, dark, x, d.soffitY + joistH / 2, (d.minZ + d.frontZ) / 2 - 0.02);
  }
}

function buildStair(g, d, dark, tread, railMat) {
  const width = d.rightX - d.leftX - 0.02;
  const xCenter = (d.leftX + 0.02 + d.rightX) / 2;
  for (let i = 0; i < d.treads; i++) {
    const yTop = (i + 1) * d.rise;
    const zFront = d.bottomZ - i * d.going;
    const zBack = zFront - d.going;
    addBox(g, width, yTop, d.going, dark, xCenter, yTop / 2, (zFront + zBack) / 2);
    addBox(g, width + 0.012, 0.03, d.going + 0.02, tread, xCenter, yTop - 0.015, (zFront + 0.02 + zBack) / 2);
  }
  // Open-side skirt follows the nosing line.
  addSlope(g, d.rightX - 0.015, 0.02, d.bottomZ, d.walkY, d.topZ, 0.03, 0.1, dark);
  // Wall rail and open rail. Balusters only on the open side.
  const yRail0 = d.handrailH;
  const yRail1 = d.walkY + d.handrailH;
  addSlope(g, d.leftX + 0.06, yRail0, d.bottomZ, yRail1, d.topZ, 0.04, 0.04, railMat);
  addSlope(g, d.rightX - 0.05, yRail0, d.bottomZ, yRail1, d.topZ, 0.045, 0.042, railMat);
  for (let i = 0; i < d.treads; i += 1) {
    const z = d.bottomZ - i * d.going - 0.02;
    const yTread = (i + 1) * d.rise;
    const yRail = yRail0 + (yRail1 - yRail0) * ((d.bottomZ - z) / d.run);
    const h = Math.max(0.08, yRail - yTread);
    addBox(g, d.balusterThick, h, d.balusterThick, railMat, d.rightX - 0.05, yTread + h / 2, z);
    if (i % 4 === 0) {
      addBox(g, 0.08, 0.02, 0.04, railMat, d.leftX + 0.05, yRail, z);
    }
  }
  addBox(g, 0.07, 1.08, 0.07, railMat, d.rightX - 0.04, 0.54, d.bottomZ + 0.02);
  addBox(g, 0.08, d.guardH, 0.08, railMat, d.rightX + 0.02, d.walkY + d.guardH / 2, d.topZ + 0.02);
}

function buildGuard(g, d, railMat) {
  const x0 = d.rightX + 0.06;
  const x1 = d.maxX - 0.04;
  const z = d.frontZ + 0.02;
  const yTop = d.walkY + d.guardH;
  addBox(g, x1 - x0, 0.04, 0.045, railMat, (x0 + x1) / 2, yTop, z);
  addBox(g, x1 - x0, 0.025, 0.03, railMat, (x0 + x1) / 2, d.walkY + 0.06, z);
  for (let x = x0 + 0.06; x < x1; x += d.balusterSpacing) {
    addBox(g, d.balusterThick, d.guardH - 0.04, d.balusterThick, railMat, x, d.walkY + d.guardH / 2, z);
  }
  // Return at the right pier so the rail dies into the wall.
  addBox(g, 0.045, 0.04, 0.16, railMat, x1, yTop, z - 0.06);
}

function buildStacks(g, layout, d, dark, oak) {
  const runs = [
    [d.minX + 0.08, -1.02],
    [0.78, d.maxX - 0.06],
  ];
  const depth = 0.32;
  const z0 = d.minZ;
  const z1 = z0 + depth;
  const shelfYs = [0.18, 0.6, 1.02, 1.44, 1.86];
  for (const [x0, x1] of runs) {
    addBox(g, x1 - x0, 0.12, depth, dark, (x0 + x1) / 2, 0.06, (z0 + z1) / 2);
    addBox(g, x1 - x0, 1.9, 0.02, toon('#5a4638'), (x0 + x1) / 2, 1.1, z0 + 0.02);
    const span = x1 - x0;
    const bays = Math.round(span / 0.84);
    for (let i = 0; i <= bays; i++) {
      const x = x0 + (span * i) / bays;
      addBox(g, 0.035, 2.16, depth - 0.01, oak, x, 1.14, (z0 + z1) / 2 + 0.005);
    }
    shelfYs.forEach((y, s) => {
      addBox(g, x1 - x0 - 0.02, 0.028, depth - 0.03, oak, (x0 + x1) / 2, y, (z0 + z1) / 2 + 0.005);
      for (let i = 0; i < bays; i++) {
        const a = x0 + (span * i) / bays + 0.04;
        const b = x0 + (span * (i + 1)) / bays - 0.04;
        const gap = (i + s) % 5 === 0 ? 0.16 : 0;
        addBooks(g, { x0: a, x1: b, y: y + 0.03, z: z1 - 0.1, depth: 0.16, gap });
      }
    });
    addBox(g, x1 - x0, 0.06, depth + 0.02, dark, (x0 + x1) / 2, 2.26, (z0 + z1) / 2);
  }
}

function buildCarrels(g, layout, d, dark, oak, top, paper) {
  const { desk } = d;
  const back = desk.backZ;
  const front = d.deskFrontZ;
  const yTop = d.deskTopY;
  const carrels = layout.meta.carrels;
  carrels.forEach((c, idx) => {
    const x0 = c.x0;
    const x1 = c.x1;
    const deskX0 = c.kind === 'sidebook' ? x0 + 0.46 : x0 + 0.02;
    const deskX1 = x1 - 0.02;
    const mid = (deskX0 + deskX1) / 2;
    // Side partitions stop before the loft walkway.
    if (idx > 0) {
      addBox(g, 0.04, 1.28, d.desk.partitionEndZ - back, oak, x0, d.walkY + 0.64, (back + d.desk.partitionEndZ) / 2);
    }
    addBox(g, deskX1 - deskX0, 0.045, front - back, top, mid, yTop - 0.022, (back + front) / 2);
    addBox(g, 0.04, desk.height - 0.04, 0.5, oak, deskX0 + 0.04, d.walkY + (desk.height - 0.04) / 2, back + 0.28);
    addBox(g, 0.04, desk.height - 0.04, 0.5, oak, deskX1 - 0.04, d.walkY + (desk.height - 0.04) / 2, back + 0.28);
    addBox(g, x1 - x0 - 0.2, 0.04, 0.04, oak, mid, d.walkY + 0.36, back + 0.08);
    // Loose books and a sheet, placed differently in each bay.
    const pileX = deskX0 + 0.22 + (idx % 2) * 0.08;
    addBox(g, 0.22, 0.025, 0.16, toon(SPINES[idx + 2]), pileX, yTop + 0.012, back + 0.16);
    addBox(g, 0.18, 0.02, 0.15, toon(SPINES[idx + 5]), pileX + 0.02, yTop + 0.034, back + 0.15);
    addBox(g, 0.2, 0.004, 0.26, paper, mid + 0.15, yTop + 0.004, front - 0.16);
    addBox(g, 0.16, 0.012, 0.2, toon(SPINES[idx + 8]), mid + 0.22, yTop + 0.02, front - 0.18);
    addBox(g, 0.16, 0.008, 0.2, paper, mid + 0.22, yTop + 0.032, front - 0.18);
    // Open book angled up — a thin wedge approximated by a tilted box.
    const open = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.012, 0.2), paper);
    open.position.set(mid - 0.05, yTop + 0.03, front - 0.22);
    open.rotation.x = -0.45;
    open.castShadow = true;
    g.add(open);

    if (c.kind === 'sidebook') {
      const sx0 = x0 + 0.04;
      const sx1 = x0 + 0.42;
      addBox(g, 0.03, 1.62, 0.28, oak, sx0, d.walkY + 0.81, back + 0.15);
      addBox(g, 0.03, 1.62, 0.28, oak, sx1, d.walkY + 0.81, back + 0.15);
      addBox(g, sx1 - sx0, 0.03, 0.28, oak, (sx0 + sx1) / 2, d.walkY + 1.6, back + 0.15);
      for (const y of [0.34, 0.74, 1.14]) {
        addBox(g, sx1 - sx0 - 0.02, 0.025, 0.26, oak, (sx0 + sx1) / 2, d.walkY + y, back + 0.15);
        addBooks(g, { x0: sx0 + 0.04, x1: sx1 - 0.04, y: d.walkY + y + 0.03, z: back + 0.18, depth: 0.14 });
      }
    } else {
      const shelves = c.kind === 'overhead-low' ? [0.48] : [0.48, 0.86];
      for (const rel of shelves) {
        const y = yTop + rel;
        addBox(g, x1 - x0 - 0.1, 0.028, 0.26, oak, mid, y, back + 0.14);
        addBooks(g, {
          x0: x0 + 0.08,
          x1: x1 - 0.08,
          y: y + 0.03,
          z: back + 0.16,
          depth: 0.15,
          gap: c.kind === 'overhead-low' ? 0.35 : 0.05,
        });
      }
      addBox(g, 0.03, 1.15, 0.26, oak, x0 + 0.06, yTop + 0.55, back + 0.14);
      addBox(g, 0.03, 1.15, 0.26, oak, x1 - 0.06, yTop + 0.55, back + 0.14);
    }
  });
  // Pocket shelf on the stair landing, behind the walkway. Local +Z faces into the room.
  const pocket = new THREE.Group();
  pocket.position.set(d.minX + 0.16, d.walkY, -3.25);
  pocket.rotation.y = Math.PI / 2;
  addBox(pocket, 0.035, 1.35, 0.26, oak, -0.52, 0.68, 0);
  addBox(pocket, 0.035, 1.35, 0.26, oak, 0.52, 0.68, 0);
  addBox(pocket, 1.08, 0.03, 0.26, oak, 0, 1.34, 0);
  for (const y of [0.28, 0.64, 1.0]) {
    addBox(pocket, 1.0, 0.024, 0.24, oak, 0, y, 0);
    addBooks(pocket, { x0: -0.46, x1: 0.46, y: y + 0.03, z: 0.03, depth: 0.13 });
  }
  g.add(pocket);
}

function buildTable(g, d, dark, top, rug, paper) {
  const { table } = d;
  addBox(g, table.w + 0.55, 0.018, table.d + 0.7, rug, table.cx, 0.012, table.cz);
  addBox(g, table.w, 0.055, table.d, top, table.cx, table.top - 0.028, table.cz);
  addBox(g, table.w - 0.12, 0.08, 0.06, dark, table.cx, table.top - 0.1, table.cz - table.d / 2 + 0.06);
  addBox(g, table.w - 0.12, 0.08, 0.06, dark, table.cx, table.top - 0.1, table.cz + table.d / 2 - 0.06);
  const legX = [d.tableLeft + 0.12, d.tableRight - 0.12];
  const legZ = [d.tableNorthZ + 0.1, d.tableSouthZ - 0.1];
  for (const x of legX) {
    for (const z of legZ) addBox(g, 0.09, table.top - 0.06, 0.09, dark, x, (table.top - 0.06) / 2, z);
  }
  addBox(g, table.w - 0.4, 0.05, 0.08, dark, table.cx, 0.1, table.cz);
  addBox(g, 0.24, 0.02, 0.16, toon('#6e3b2c'), table.cx - 0.7, table.top + 0.01, table.cz + 0.12);
  addBox(g, 0.2, 0.018, 0.15, toon('#2c4a62'), table.cx - 0.68, table.top + 0.028, table.cz + 0.1);
  const open = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.01, 0.22), paper);
  open.position.set(table.cx + 0.15, table.top + 0.03, table.cz - 0.08);
  open.rotation.x = -0.4;
  g.add(open);
}

function buildWindowSeat(g, d, oak, cushion, paper) {
  addBox(g, 0.96, 0.44, 0.36, oak, 0.0, 0.22, d.minZ + 0.18);
  addBox(g, 0.88, 0.05, 0.3, cushion, 0.0, 0.46, d.minZ + 0.18);
  addBox(g, 0.18, 0.02, 0.14, paper, -0.2, 0.5, d.minZ + 0.2);
}

function buildFoliage(g, layout, leaf, leaf2) {
  for (const inst of layout.instances) {
    if (inst.kind !== 'flowerpot') continue;
    const [x, y, z] = inst.position;
    const s = inst.scale || 1;
    const h = 0.22 * s;
    addBox(g, 0.16 * s, 0.14 * s, 0.14 * s, leaf, x, y + h + 0.1 * s, z);
    addBox(g, 0.1 * s, 0.1 * s, 0.1 * s, leaf2, x + 0.04 * s, y + h + 0.16 * s, z - 0.02);
  }
}

function buildCords(g, layout, d) {
  const mat = toon('#1c1c1c');
  const pendantH = layout.assets.pendant_lamp.targetHeight;
  for (const inst of layout.instances) {
    if (inst.kind !== 'pendant_lamp') continue;
    const [x, y, z] = inst.position;
    const y0 = y + pendantH;
    const y1 = d.ceilingY;
    addBox(g, 0.012, y1 - y0, 0.012, mat, x, (y0 + y1) / 2, z);
  }
}

function buildCaseBooks(g, layout) {
  const spec = layout.assets.display_bookcase;
  const scale = spec.targetHeight / 2;
  const width = 0.834 * scale;
  const depth = 0.408 * scale;
  const shelves = [0.24, 0.48, 0.72].map((f) => f * spec.targetHeight);
  for (const inst of layout.instances) {
    if (inst.kind !== 'display_bookcase') continue;
    const grp = new THREE.Group();
    for (const y of shelves) {
      addBooks(grp, { x0: -width / 2 + 0.05, x1: width / 2 - 0.05, y: y + 0.02, z: depth / 2 - 0.11, depth: 0.15 });
    }
    grp.position.set(inst.position[0], 0, inst.position[2]);
    grp.rotation.y = inst.rotationY || 0;
    g.add(grp);
  }
}

function buildContacts(g, layout, d) {
  const mat = makeAoMaterial();
  contact(g, mat, d.table.cx, d.table.cz, d.table.w * 0.46, d.table.d * 0.55, 0.02);
  for (const x of d.postXs) contact(g, mat, x, d.frontZ - 0.06, 0.22, 0.22, 0.02);
  for (const inst of layout.instances) {
    const [x, y, z] = inst.position;
    const ground = y < 0.2;
    const yy = (ground ? 0.02 : y + 0.015);
    if (inst.kind === 'dining_chair') contact(g, mat, x, z, 0.24, 0.28, yy);
    if (inst.kind === 'display_bookcase') contact(g, mat, x, z, 0.34, 0.42, 0.02);
    if (inst.kind === 'book_stand') contact(g, mat, x, z, 0.32, 0.32, 0.02);
    if (inst.kind === 'flowerpot' && ground) contact(g, mat, x, z, 0.16, 0.16, 0.02);
  }
}

boot({
  makeShell,
  makeProcedural,
  readyText: 'ready — quiet study loft · drag orbit · U unlit · T toon',
});
