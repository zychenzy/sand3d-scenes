import * as THREE from 'three';
import { boot, toon, addBox, addCyl, addCone, contactBlob, editSourceMaterials } from './scene_lib.js';

const BOOKS = ['#6b2e28', '#2c4034', '#3a3358', '#8a6230', '#5a2a38', '#243e58', '#6e4a2c', '#1e3a44', '#7a3a28', '#4a3228'];

function metrics(layout) {
  const { width: W, depth: D, height: H } = layout.meta.room;
  const wallInnerZ = -D / 2 + 0.09;
  const wallInnerX = -W / 2 + 0.09;
  const cx = layout.anchors.fireplace.x;
  const breastD = 0.6;
  const front = wallInnerZ + breastD;
  return { W, D, H, wallInnerZ, wallInnerX, cx, front, T: layout.anchors.table, win: layout.anchors.window };
}

function decoratePrototype(kind, root) {
  if (kind === 'sofa_solid') {
    editSourceMaterials(root, (src) => {
      if ((src.name || '').toLowerCase().includes('fabric')) {
        src.color.set('#8c4c32');
        src.map = null;
      }
    });
  } else if (kind === 'flowerpot') {
    editSourceMaterials(root, (src) => {
      src.color.set('#b25a38');
      src.map = null;
    });
  } else if (kind === 'pendant_lamp') {
    editSourceMaterials(root, (src, obj) => {
      const n = `${obj.name || ''} ${src.name || ''}`.toLowerCase();
      if (n.includes('bulb')) {
        src.color.set('#fff3cc');
        if (!src.emissive) src.emissive = new THREE.Color();
        src.emissive.set('#ffc56a');
        src.emissiveIntensity = 0.9;
      }
    });
  } else if (kind === 'library_lamp') {
    editSourceMaterials(root, (src, obj) => {
      const n = `${obj.name || ''} ${src.name || ''}`.toLowerCase();
      if (n.includes('light') || n.includes('tube') || n.includes('bulb')) {
        src.color.set('#fff6d8');
        if (!src.emissive) src.emissive = new THREE.Color();
        src.emissive.set('#ffd18a');
        src.emissiveIntensity = 0.85;
      }
    });
  }
}

function makeShell(layout) {
  const g = new THREE.Group();
  g.name = 'shell';
  const s = layout.shell;
  const m = metrics(layout);
  const plaster = toon(s.wallColor);
  const beam = toon(s.woodColor);
  const beamDark = toon(s.woodDark);
  const floorMat = toon(s.floorColor);
  const glass = toon(s.windowTint, {
    transparent: true,
    opacity: 0.3,
    side: THREE.DoubleSide,
    depthWrite: false,
    noCast: true,
  });

  const floor = addBox(g, m.W, 0.08, m.D, floorMat, 0, -0.04, 0);
  floor.userData.noCast = true;

  const plankCols = [s.floorDark, s.floorColor, s.floorLight, '#a67c4e'];
  const plankCount = Math.round(m.D / 0.18);
  for (let i = 0; i < plankCount; i++) {
    const z = -m.D / 2 + 0.09 + i * (m.D / plankCount);
    const plank = addBox(g, m.W - 0.2, 0.012, m.D / plankCount - 0.012, toon(plankCols[i % plankCols.length]), 0, 0.006, z);
    plank.userData.noCast = true;
  }

  // Back wall, then lower beadboard grooves where the fireplace does not cover them.
  addBox(g, m.W, m.H, 0.14, plaster, 0, m.H / 2, -m.D / 2);
  wainscot(g, beam, beamDark, -m.W / 2 + 0.2, m.cx - 1.45, m.wallInnerZ + 0.02, true);
  wainscot(g, beam, beamDark, m.cx + 1.45, m.W / 2 - 0.15, m.wallInnerZ + 0.02, true);
  addBox(g, m.W - 0.3, 0.08, 0.08, beam, 0, 1.08, m.wallInnerZ + 0.04);
  addBox(g, m.W - 0.4, 0.07, 0.08, beamDark, 0, 2.62, m.wallInnerZ + 0.05);

  const win = m.win;
  const xL = -m.W / 2;
  const zSouthLen = win.z0 - (-m.D / 2);
  addBox(g, 0.14, m.H, zSouthLen, plaster, xL, m.H / 2, (-m.D / 2 + win.z0) / 2);
  const zNorthLen = m.D / 2 - win.z1;
  addBox(g, 0.14, m.H, zNorthLen, plaster, xL, m.H / 2, (win.z1 + m.D / 2) / 2);
  const winW = win.z1 - win.z0;
  const winMid = (win.z0 + win.z1) / 2;
  addBox(g, 0.14, win.y0, winW, plaster, xL, win.y0 / 2, winMid);
  addBox(g, 0.14, m.H - win.y1, winW, plaster, xL, (m.H + win.y1) / 2, winMid);
  wainscotZ(g, beam, beamDark, -m.D / 2 + 0.15, win.z0 - 0.05, m.wallInnerX + 0.02);
  wainscotZ(g, beam, beamDark, win.z1 + 0.05, m.D / 2 - 0.15, m.wallInnerX + 0.02);
  addBox(g, 0.08, 1.02, m.D - 0.4, beam, m.wallInnerX + 0.03, 0.51, 0.05);

  // Window: timber frame, mullions, cool glass, tied-back curtains.
  addBox(g, 0.08, win.y1 - win.y0 + 0.12, 0.12, beamDark, xL + 0.04, (win.y0 + win.y1) / 2, win.z0);
  addBox(g, 0.08, win.y1 - win.y0 + 0.12, 0.12, beamDark, xL + 0.04, (win.y0 + win.y1) / 2, win.z1);
  addBox(g, 0.16, 0.1, winW + 0.12, beamDark, xL + 0.08, win.y1, winMid);
  addBox(g, 0.28, 0.08, winW + 0.2, beam, xL + 0.16, win.y0 - 0.02, winMid);
  addBox(g, 0.04, win.y1 - win.y0 - 0.08, winW - 0.08, glass, xL + 0.06, (win.y0 + win.y1) / 2, winMid);
  const cols = 4;
  for (let i = 1; i < cols; i++) {
    const z = win.z0 + (winW * i) / cols;
    addBox(g, 0.05, win.y1 - win.y0 - 0.06, 0.05, beam, xL + 0.09, (win.y0 + win.y1) / 2, z);
  }
  addBox(g, 0.05, 0.05, winW - 0.1, beam, xL + 0.09, win.y0 + (win.y1 - win.y0) * 0.62, winMid);
  curtains(g, xL + 0.18, win);

  // Wood ceiling over the occupied room, open toward the cutaway corner.
  addBox(g, m.W * 0.92, 0.08, m.D * 0.72, toon(s.ceilingColor), -0.2, m.H - 0.05, -m.D * 0.12);
  const beamZs = [-2.85, -1.35, 0.15, 1.55, 2.85];
  for (const z of beamZs) {
    addBox(g, m.W - 0.7, 0.24, 0.16, beamDark, -0.15, m.H - 0.28, z);
  }
  addBox(g, 0.18, 0.28, m.D * 0.7, beam, m.cx, m.H - 0.46, -0.55);
  addBox(g, 0.16, 0.2, m.D - 0.5, beam, m.wallInnerX + 0.12, m.H - 0.22, 0);

  exterior(g, m, s);
  return g;
}

function wainscot(g, wood, groove, x0, x1, z, alongX) {
  if (x1 - x0 < 0.4) return;
  addBox(g, x1 - x0, 1.02, 0.05, wood, (x0 + x1) / 2, 0.51, z);
  const step = 0.32;
  for (let x = x0 + 0.16; x < x1; x += step) {
    addBox(g, 0.018, 0.96, 0.02, groove, x, 0.5, z + 0.03);
  }
  void alongX;
}

function wainscotZ(g, wood, groove, z0, z1, x) {
  if (z1 - z0 < 0.3) return;
  addBox(g, 0.05, 1.02, z1 - z0, wood, x, 0.51, (z0 + z1) / 2);
  for (let z = z0 + 0.16; z < z1; z += 0.32) {
    addBox(g, 0.02, 0.96, 0.018, groove, x + 0.03, 0.5, z);
  }
}

function curtains(g, x, win) {
  const cloth = toon('#6e2430');
  const lining = toon('#c4a07a');
  const midY = (win.y0 + win.y1) / 2 - 0.05;
  const h = (win.y1 - win.y0) * 0.78;
  for (const side of [-1, 1]) {
    const z = side < 0 ? win.z0 + 0.16 : win.z1 - 0.16;
    addBox(g, 0.08, h, 0.22, cloth, x, midY, z);
    addBox(g, 0.06, h * 0.92, 0.1, cloth, x + 0.04, midY - 0.04, z + side * 0.12);
    addBox(g, 0.03, h * 0.7, 0.06, lining, x + 0.07, midY - 0.08, z + side * 0.16);
  }
  addCyl(g, 0.025, 0.025, win.z1 - win.z0 + 0.2, toon('#3e2718'), x - 0.02, win.y1 - 0.02, (win.z0 + win.z1) / 2, 8);
}

function exterior(g, m, s) {
  const x = -m.W / 2 - 1.55;
  addBox(g, 3.4, 0.25, m.D + 2, toon('#e6eef4'), x, 0.02, 0.2);
  addBox(g, 2.2, 2.6, 4.2, toon('#d5e2ee'), x - 1.3, 2.3, -0.4);
  addBox(g, 1.6, 3.3, 2.4, toon('#c3d4e4'), x - 1.8, 2.6, 1.6);
  pineTree(g, -m.W / 2 - 0.85, 0.4, 2.3, '#1c4030');
  pineTree(g, -m.W / 2 - 1.15, 1.7, 1.7, '#245038');
  pineTree(g, -m.W / 2 - 0.7, -0.9, 1.45, '#1a3830');
  void s;
}

function pineTree(g, x, z, h, color) {
  addCyl(g, 0.06, 0.09, h * 0.28, toon('#4a3424'), x, h * 0.14, z, 6);
  addCone(g, h * 0.22, h * 0.42, toon(color), x, h * 0.38, z, 8);
  addCone(g, h * 0.17, h * 0.36, toon(color), x, h * 0.62, z, 8);
  addCone(g, h * 0.11, h * 0.28, toon(color), x, h * 0.84, z, 7);
}

function makeProcedural(layout) {
  const g = new THREE.Group();
  g.name = 'procedural';
  const m = metrics(layout);
  const s = layout.shell;
  rugs(g, m, s);
  fireplace(g, m, s);
  bookWall(g, m, s);
  woodStore(g, m, s);
  communalTable(g, m, s);
  nook(g, m, s, layout);
  gear(g, m, s);
  indoorPine(g, layout);
  pendantCords(g, layout, m);
  contacts(g, layout, m);
  return g;
}

function rugs(g, m, s) {
  const edge = toon(s.rugEdge);
  const field = toon(s.rug);
  // Layered communal rug: dark underlay, red field, border, medallion.
  addBox(g, 5.35, 0.012, 4.05, edge, m.T.x, 0.014, 0.28);
  addBox(g, 4.95, 0.012, 3.65, field, m.T.x, 0.022, 0.28);
  addBox(g, 4.55, 0.008, 0.06, edge, m.T.x, 0.03, 0.28 - 1.7);
  addBox(g, 4.55, 0.008, 0.06, edge, m.T.x, 0.03, 0.28 + 1.7);
  addBox(g, 0.06, 0.008, 3.25, edge, m.T.x - 2.25, 0.03, 0.28);
  addBox(g, 0.06, 0.008, 3.25, edge, m.T.x + 2.25, 0.03, 0.28);
  const med = addBox(g, 0.7, 0.008, 0.7, toon('#c4a06a'), m.T.x + 0.1, 0.034, m.T.z);
  med.rotation.y = Math.PI / 4;

  // Hearth rug overlapping the red field's south edge.
  addBox(g, 2.7, 0.014, 1.45, toon('#142824'), m.cx, 0.02, m.front + 1.05);
  addBox(g, 2.35, 0.01, 1.12, toon(s.hearthRug), m.cx, 0.03, m.front + 1.05);
  sheepskin(g, m.cx + 0.2, m.front + 1.18, 0.52, 0.36);

  // Cool wool under the window nook, overlapping the red rug's west edge.
  addBox(g, 3.15, 0.014, 2.7, toon('#241c16'), -3.15, 0.018, 1.55);
  addBox(g, 2.8, 0.01, 2.35, toon(s.nookRug), -3.15, 0.028, 1.55);
  addBox(g, 2.35, 0.008, 0.045, toon('#d7c4a4'), -3.15, 0.036, 1.55 - 1.0);
  addBox(g, 2.35, 0.008, 0.045, toon('#d7c4a4'), -3.15, 0.036, 1.55 + 1.0);

  // Entry mat at the cutaway threshold.
  addBox(g, 1.15, 0.015, 0.62, toon('#4a3428'), 1.35, 0.02, 2.85);
  addBox(g, 0.95, 0.01, 0.42, toon('#6a5344'), 1.35, 0.03, 2.85);
}

function sheepskin(g, x, z, rx, rz) {
  const mat = toon('#c4a078');
  const mesh = new THREE.Mesh(new THREE.CircleGeometry(1, 20), mat);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set(x, 0.04, z);
  mesh.scale.set(rx, rz, 1);
  mesh.receiveShadow = true;
  mesh.userData.noCast = true;
  g.add(mesh);
  const inner = new THREE.Mesh(new THREE.CircleGeometry(1, 18), toon('#a68458'));
  inner.rotation.x = -Math.PI / 2;
  inner.position.set(x + 0.04, 0.045, z - 0.02);
  inner.scale.set(rx * 0.62, rz * 0.62, 1);
  inner.receiveShadow = true;
  inner.userData.noCast = true;
  g.add(inner);
}

function fireplace(g, m, s) {
  const cx = m.cx;
  const front = m.front;
  const breastW = 2.5;
  const breastH = 2.85;
  const stoneCols = ['#6a645c', '#80786f', '#574f48', '#91887e', '#746c64'];
  addBox(g, breastW, breastH, 0.58, toon('#3e3a36'), cx, breastH / 2, m.wallInnerZ + 0.3);
  // Corbelled courses. Skip stones that would fill the firebox.
  let y = 0.12;
  let guard = 0;
  for (let c = 0; y < breastH - 0.08 && guard < 16; c++, guard++) {
    const ch = 0.2 + (c % 3) * 0.04;
    let x = cx - breastW / 2 + 0.06 + (c % 2) * 0.16;
    const end = cx + breastW / 2 - 0.05;
    let i = 0;
    while (x < end && i < 12) {
      const sw = Math.min(0.32 + ((c * 3 + i) % 4) * 0.09, end - x);
      const sy = y + ch / 2;
      const sx = x + sw / 2;
      const opening = sy > 0.32 && sy < 1.22 && Math.abs(sx - cx) < 0.5;
      if (!opening) {
        addBox(g, Math.max(sw - 0.035, 0.08), Math.max(ch - 0.03, 0.08), 0.11, toon(stoneCols[(c + i) % stoneCols.length]), sx, sy, front + 0.03);
      }
      x += sw;
      i++;
    }
    y += ch;
  }
  // Side cheeks so the breast reads as mass from the 3/4 view.
  addBox(g, 0.18, breastH, 0.5, toon('#5c564f'), cx - breastW / 2 + 0.02, breastH / 2, m.wallInnerZ + 0.32);
  addBox(g, 0.18, breastH, 0.5, toon('#675f58'), cx + breastW / 2 - 0.02, breastH / 2, m.wallInnerZ + 0.32);

  addBox(g, 0.96, 0.88, 0.32, toon('#140e0c'), cx, 0.74, front - 0.08);
  addBox(g, 1.12, 0.08, 0.16, toon('#2a241e'), cx, 1.2, front + 0.02);
  addBox(g, 0.08, 0.7, 0.1, toon('#2a241e'), cx - 0.5, 0.72, front + 0.02);
  addBox(g, 0.08, 0.7, 0.1, toon('#2a241e'), cx + 0.5, 0.72, front + 0.02);

  // Hearth slab.
  addBox(g, 2.95, 0.12, 1.28, toon('#4e4944'), cx, 0.08, front + 0.58);
  addBox(g, 2.7, 0.025, 1.05, toon('#6a645c'), cx, 0.145, front + 0.62);

  // Logs, andirons, flames.
  const logMat = toon('#3a2a1c');
  const ember = toon('#ff6a28', { emissive: '#ff4a10', emissiveIntensity: 0.85, noReceive: true, noCast: true });
  const flame = toon('#ffb15a', { emissive: '#ff7a22', emissiveIntensity: 0.95, noReceive: true, noCast: true });
  const flameHot = toon('#ffe08a', { emissive: '#ffb040', emissiveIntensity: 1, noReceive: true, noCast: true });
  for (const [lx, ly] of [[-0.18, 0.28], [0.16, 0.3], [0.0, 0.42]]) {
    const log = addCyl(g, 0.07, 0.08, 0.55, logMat, cx + lx, ly, front - 0.02, 8);
    log.rotation.z = Math.PI / 2;
  }
  addCyl(g, 0.04, 0.045, 0.2, ember, cx, 0.34, front + 0.02, 8);
  addCone(g, 0.16, 0.38, flame, cx - 0.06, 0.62, front + 0.02, 7);
  addCone(g, 0.1, 0.28, flameHot, cx + 0.08, 0.7, front + 0.04, 6);
  addCone(g, 0.07, 0.18, flameHot, cx - 0.12, 0.78, front + 0.01, 6);
  andiron(g, cx - 0.32, front + 0.08);
  andiron(g, cx + 0.32, front + 0.08);

  // Mantel and chimney breast above it.
  addBox(g, 2.85, 0.14, 0.42, toon(s.woodDark), cx, 1.48, front + 0.02);
  addBox(g, 1.7, m.H - 1.62, 0.48, toon('#5a554e'), cx, (m.H + 1.55) / 2, m.wallInnerZ + 0.28);
  candles(g, cx - 0.7, 1.58, front + 0.02);
  candles(g, cx + 0.55, 1.58, front + 0.06);
  bookStack(g, cx + 0.05, 1.56, front - 0.02, 3, 0.18);
  addBox(g, 0.16, 0.2, 0.08, toon('#f3ead8'), cx - 0.25, 1.68, front + 0.04);
  addCyl(g, 0.055, 0.055, 0.02, toon('#f7f1e4'), cx - 0.25, 1.79, front + 0.08, 12);

  // Inglenook posts and collar, framing the fire from the room.
  const postZ = front + 1.18;
  for (const px of [cx - 1.32, cx + 1.32]) {
    addBox(g, 0.16, 2.55, 0.16, toon(s.woodDark), px, 1.28, postZ);
    addBox(g, 0.22, 0.1, 0.22, toon('#2a1c12'), px, 0.06, postZ);
  }
  addBox(g, 2.8, 0.16, 0.18, toon(s.woodColor), cx, 2.52, postZ);

  // Tools and kettle on the hearth.
  const iron = toon('#2c2824');
  addCyl(g, 0.012, 0.012, 0.7, iron, cx + 0.7, 0.5, front + 0.35, 6).rotation.z = 0.18;
  addBox(g, 0.14, 0.04, 0.05, iron, cx + 0.62, 0.84, front + 0.32);
  addCyl(g, 0.1, 0.12, 0.16, toon('#3a3e42'), cx - 0.85, 0.26, front + 0.72, 10);
  addCyl(g, 0.04, 0.05, 0.08, toon('#2a2e32'), cx - 0.78, 0.36, front + 0.78, 8);
  addBox(g, 0.16, 0.03, 0.08, toon('#2a2e32'), cx - 0.7, 0.34, front + 0.7);
}

function andiron(g, x, z) {
  const iron = toon('#2a2622');
  addBox(g, 0.06, 0.22, 0.28, iron, x, 0.22, z);
  addBox(g, 0.16, 0.05, 0.08, iron, x, 0.12, z + 0.08);
  addCyl(g, 0.035, 0.035, 0.04, iron, x, 0.34, z - 0.06, 8);
}

function candles(g, x, y, z) {
  addCyl(g, 0.025, 0.028, 0.12, toon('#f3ead4'), x, y + 0.06, z, 8);
  addCone(g, 0.012, 0.05, toon('#ffd27a', { emissive: '#ffb040', emissiveIntensity: 0.9, noCast: true, noReceive: true }), x, y + 0.15, z, 6);
}

function bookStack(g, x, y, z, n, w) {
  let yy = y;
  for (let i = 0; i < n; i++) {
    const h = 0.035 + (i % 2) * 0.012;
    addBox(g, w, h, 0.24, toon(BOOKS[(i + 2) % BOOKS.length]), x + (i - 1) * 0.01, yy + h / 2, z);
    yy += h;
  }
}

function bookWall(g, m, s) {
  const x0 = m.wallInnerX + 0.28;
  const x1 = m.cx - 1.48;
  const z = m.wallInnerZ + 0.2;
  const w = x1 - x0;
  const cx = (x0 + x1) / 2;
  const wood = toon(s.woodColor);
  addBox(g, w, 1.42, 0.08, wood, cx, 0.78, z);
  addBox(g, 0.07, 1.42, 0.32, toon(s.woodDark), x0, 0.78, z + 0.12);
  addBox(g, 0.07, 1.42, 0.32, toon(s.woodDark), x1, 0.78, z + 0.12);
  addBox(g, w, 0.06, 0.34, wood, cx, 1.48, z + 0.1);
  for (let shelf = 0; shelf < 3; shelf++) {
    const y = 0.28 + shelf * 0.4;
    addBox(g, w - 0.06, 0.04, 0.3, wood, cx, y, z + 0.12);
    const count = Math.max(4, Math.floor((w - 0.2) / 0.1));
    for (let i = 0; i < count; i++) {
      const bw = 0.055 + (i % 3) * 0.012;
      const bh = 0.24 + ((i + shelf) % 4) * 0.028;
      const lean = ((i + shelf) % 5 === 0) ? 0.12 : 0;
      const bx = x0 + 0.12 + i * ((w - 0.24) / count);
      const book = addBox(g, bw, bh, 0.16, toon(BOOKS[(i + shelf * 3) % BOOKS.length]), bx, y + 0.02 + bh / 2, z + 0.18);
      book.rotation.z = lean;
    }
  }
}

function woodStore(g, m, s) {
  const x = m.cx + 2.35;
  const z = m.wallInnerZ + 0.28;
  const wood = toon(s.woodDark);
  addBox(g, 0.08, 1.2, 0.42, wood, x - 0.52, 0.66, z);
  addBox(g, 0.08, 1.2, 0.42, wood, x + 0.52, 0.66, z);
  addBox(g, 1.12, 0.08, 0.42, wood, x, 1.22, z);
  for (let row = 0; row < 3; row++) {
    const y = 0.22 + row * 0.38;
    addBox(g, 1.0, 0.045, 0.38, toon(s.woodColor), x, y, z);
    for (let k = 0; k < 4; k++) {
      const log = addCyl(g, 0.055, 0.065, 0.34, toon(k % 2 ? '#6b4a2e' : '#4e3420'), x - 0.3 + k * 0.2, y + 0.1, z + 0.02, 7);
      log.rotation.z = Math.PI / 2;
      log.rotation.y = (k % 2) * 0.15;
    }
  }
}

function communalTable(g, m, s) {
  const T = m.T;
  const top = toon('#c49662');
  const wood = toon(s.woodColor);
  const dark = toon(s.woodDark);
  addBox(g, T.len, 0.09, T.wid, top, T.x, T.top - 0.045, T.z);
  addBox(g, T.len + 0.06, 0.025, T.wid + 0.06, dark, T.x, T.top - 0.1, T.z);
  // Runner down the middle.
  addBox(g, T.len * 0.72, 0.012, 0.34, toon('#e6d3b4'), T.x + 0.05, T.top + 0.008, T.z);
  // Two trestles and a stretcher.
  for (const dx of [-1.15, 1.15]) {
    const x = T.x + dx;
    addBox(g, 0.12, 0.66, 0.12, dark, x, 0.36, T.z - 0.36);
    addBox(g, 0.12, 0.66, 0.12, dark, x, 0.36, T.z + 0.36);
    addBox(g, 0.1, 0.1, T.wid - 0.12, wood, x, 0.62, T.z);
    addBox(g, 0.08, 0.08, T.wid - 0.2, dark, x, 0.16, T.z);
  }
  addBox(g, 2.2, 0.08, 0.08, dark, T.x, 0.16, T.z);
  // Open book left on the top.
  addBox(g, 0.28, 0.015, 0.2, toon('#f4efe4'), T.x + 1.05, T.top + 0.01, T.z + 0.12);
  addBox(g, 0.26, 0.008, 0.18, toon('#faf6ee'), T.x + 1.05, T.top + 0.02, T.z + 0.12);

  // North bench, cushioned, stopping short of the northeast chair.
  const bz = T.z + T.wid / 2 + 0.3;
  const bx = T.x - 0.42;
  addBox(g, 2.15, 0.08, 0.4, top, bx, 0.46, bz);
  addBox(g, 2.05, 0.06, 0.34, toon('#7a3034'), bx, 0.52, bz);
  for (const dx of [-0.9, 0.9]) {
    addBox(g, 0.1, 0.42, 0.34, dark, bx + dx, 0.22, bz);
  }
  addBox(g, 1.9, 0.06, 0.08, dark, bx, 0.16, bz);
}

function nook(g, m, s, layout) {
  const lamp = layout.instances.find((i) => i.id === 'reading_lamp');
  const wood = toon(s.woodDark);
  const top = toon(s.woodLight);
  // Sill pad over the two piano benches, plus a sheepskin and an open book.
  addBox(g, 0.46, 0.07, 1.85, toon('#e4d2b0'), -4.78, 0.53, 0.55);
  addBox(g, 0.4, 0.035, 0.7, toon('#8a3a32'), -4.78, 0.58, 0.25);
  sheepskin(g, -4.7, 0.95, 0.32, 0.42);
  addBox(g, 0.22, 0.02, 0.16, toon('#f7f1e6'), -4.7, 0.6, 0.85);
  bookStack(g, -4.85, 0.58, 1.35, 4, 0.16);

  // Lamp table on the floor between the window seat and the sofa.
  if (lamp) {
    const lx = lamp.position[0];
    const lz = lamp.position[2];
    const topY = lamp.position[1];
    addBox(g, 0.48, 0.06, 0.4, top, lx, topY - 0.03, lz);
    for (const [dx, dz] of [[-0.18, -0.14], [0.18, -0.14], [-0.18, 0.14], [0.18, 0.14]]) {
      addBox(g, 0.05, topY - 0.06, 0.05, wood, lx + dx, (topY - 0.06) / 2, lz + dz);
    }
  }

  // Throw across the sofa seat, coffee-table books, mug is a GLB.
  addBox(g, 0.55, 0.05, 0.38, toon('#6e2430'), -3.05, 0.48, 2.05);
  bookStack(g, -2.05, 0.31, 1.58, 3, 0.18);
  addBox(g, 0.22, 0.01, 0.15, toon('#f6f0e4'), -1.85, 0.32, 1.82);

  // Corner pine is the flowerpot; a second small stack of split wood by the book wall.
  addCyl(g, 0.16, 0.18, 0.16, toon('#5a4030'), m.wallInnerX + 0.55, 0.1, m.wallInnerZ + 0.7, 10);
}

function gear(g, m, s) {
  const zWall = m.wallInnerZ;
  const wood = toon(s.woodColor);
  const dark = toon(s.woodDark);
  // Mudroom bench in front of the pegs.
  const bx = 3.35;
  const bz = -3.22;
  addBox(g, 1.85, 0.09, 0.42, wood, bx, 0.46, bz);
  for (const dx of [-0.75, 0.75]) {
    addBox(g, 0.1, 0.42, 0.36, dark, bx + dx, 0.22, bz);
  }
  addBox(g, 1.6, 0.07, 0.08, dark, bx, 0.18, bz);
  addBox(g, 0.7, 0.04, 0.32, toon('#2e3a4a'), bx - 0.35, 0.52, bz);
  // Pack on the bench end.
  addBox(g, 0.32, 0.38, 0.22, toon('#3e4a34'), bx + 0.62, 0.7, bz);
  addBox(g, 0.26, 0.1, 0.08, toon('#2a3424'), bx + 0.62, 0.92, bz + 0.08);

  const coats = [
    { x: 2.45, color: '#7a3030', h: 0.95 },
    { x: 3.05, color: '#243044', h: 1.05 },
    { x: 3.65, color: '#3e4a32', h: 0.88 },
    { x: 4.25, color: '#e4d5c0', h: 0.98 },
  ];
  for (const c of coats) coat(g, c.x, zWall + 0.12, 1.78, c.color, c.h);
  // Peg rail.
  addBox(g, 2.3, 0.06, 0.08, dark, 3.35, 1.82, zWall + 0.08);

  // Boots kicked off, not a parade line.
  hikingBoot(g, 2.7, -2.85, 0.5);
  hikingBoot(g, 2.88, -2.78, 0.7);
  hikingBoot(g, 3.45, -2.7, -0.4);
  hikingBoot(g, 3.62, -2.8, -0.15);
  hikingBoot(g, 4.05, -2.75, 1.1);
  hikingBoot(g, 4.2, -2.62, 0.9);

  // Skis and poles at the right end of the gear wall.
  ski(g, 4.72, -3.45, 0.16, '#e4dcc8', '#c44a32');
  const pole = addCyl(g, 0.012, 0.012, 1.35, toon('#8a9298'), 4.55, 0.7, -3.35, 6);
  pole.rotation.x = 0.12;
  pole.rotation.z = -0.08;
  addCyl(g, 0.035, 0.02, 0.04, toon('#c4a05a'), 4.55, 1.38, -3.28, 8);

  // Basket and a lantern on the floor.
  addCyl(g, 0.16, 0.14, 0.2, toon('#6a4a2c'), 2.35, 0.12, -2.95, 10);
  addCyl(g, 0.17, 0.17, 0.03, toon('#5a3c22'), 2.35, 0.23, -2.95, 10);
  const lantern = toon('#f0b45a', { emissive: '#ffb050', emissiveIntensity: 0.75, noReceive: true });
  addBox(g, 0.14, 0.2, 0.14, toon('#2a241c'), 4.55, 0.2, -2.95);
  addBox(g, 0.09, 0.12, 0.04, lantern, 4.55, 0.2, -2.86);
  addCyl(g, 0.015, 0.015, 0.08, toon('#2a241c'), 4.55, 0.34, -2.95, 6);

  // Gloves and a folded cap on the wall shelf.
  addBox(g, 0.06, 0.16, 0.14, dark, 1.64, 1.38, -3.62);
  addBox(g, 0.06, 0.16, 0.14, dark, 2.0, 1.38, -3.62);
  addBox(g, 0.16, 0.05, 0.1, toon('#243044'), 1.68, 1.72, -3.5);
  addBox(g, 0.14, 0.045, 0.09, toon('#7a3030'), 1.86, 1.7, -3.48);
  addCyl(g, 0.07, 0.08, 0.05, toon('#3e4a32'), 2.02, 1.7, -3.5, 8);
}

function coat(g, x, z, y, color, h) {
  const cloth = toon(color);
  addCyl(g, 0.018, 0.018, 0.1, toon('#3e2718'), x, y, z + 0.06, 6);
  addBox(g, 0.36, 0.1, 0.14, cloth, x, y - 0.12, z + 0.12);
  addBox(g, 0.3, h * 0.62, 0.1, cloth, x, y - 0.18 - h * 0.31, z + 0.12);
  addBox(g, 0.09, h * 0.42, 0.08, cloth, x - 0.18, y - 0.28, z + 0.13);
  addBox(g, 0.09, h * 0.42, 0.08, cloth, x + 0.18, y - 0.28, z + 0.13);
}

function hikingBoot(g, x, z, yaw) {
  const grp = new THREE.Group();
  const leather = toon('#2e241c');
  const cuff = toon('#5a4030');
  addBox(grp, 0.1, 0.07, 0.26, leather, 0, 0.045, 0.03);
  addBox(grp, 0.09, 0.2, 0.11, leather, 0, 0.16, -0.05);
  addCyl(grp, 0.045, 0.05, 0.05, cuff, 0, 0.28, -0.05, 8);
  grp.position.set(x, 0, z);
  grp.rotation.y = yaw;
  grp.traverse((o) => {
    if (o.isMesh) {
      o.castShadow = true;
      o.receiveShadow = true;
    }
  });
  g.add(grp);
}

function ski(g, x, z, lean, base, stripe) {
  const grp = new THREE.Group();
  addBox(grp, 0.09, 1.55, 0.025, toon(base), 0, 0.78, 0);
  addBox(grp, 0.09, 1.45, 0.02, toon(stripe), 0.035, 0.78, 0.015);
  grp.position.set(x, 0, z);
  grp.rotation.z = lean;
  grp.rotation.x = 0.08;
  grp.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  g.add(grp);
}

function indoorPine(g, layout) {
  const pot = layout.instances.find((i) => i.id === 'pot');
  if (!pot) return;
  const x = pot.position[0];
  const z = pot.position[2];
  const y = 0.32;
  addCone(g, 0.22, 0.32, toon('#1d4a34'), x, y + 0.2, z, 8);
  addCone(g, 0.16, 0.28, toon('#2c6844'), x, y + 0.4, z, 8);
  addCone(g, 0.1, 0.22, toon('#3d7a50'), x + 0.02, y + 0.58, z, 7);
}

function pendantCords(g, layout, m) {
  const spec = layout.assets.pendant_lamp;
  const dark = toon('#2a2118');
  for (const inst of layout.instances) {
    if (inst.kind !== 'pendant_lamp') continue;
    const y0 = inst.position[1] + spec.targetHeight;
    const y1 = m.H - 0.12;
    if (y1 <= y0) continue;
    addCyl(g, 0.008, 0.008, y1 - y0, dark, inst.position[0], (y0 + y1) / 2, inst.position[2], 6);
    // Visible warm bulb just under the shade.
    addCyl(
      g,
      0.045,
      0.05,
      0.06,
      toon('#fff1c4', { emissive: '#ffc56a', emissiveIntensity: 1, noCast: true, noReceive: true }),
      inst.position[0],
      inst.position[1] + 0.08,
      inst.position[2],
      10,
    );
  }
}

function contacts(g, layout, m) {
  for (const inst of layout.instances) {
    if (inst.kind === 'dining_chair') contactBlob(g, inst.position[0], inst.position[2], 0.26, 0.26, 0.32);
    if (inst.kind === 'sofa_solid') contactBlob(g, inst.position[0], inst.position[2], 0.7, 0.55, 0.3);
    if (inst.kind === 'coffee_table') contactBlob(g, inst.position[0], inst.position[2], 0.55, 0.4, 0.26);
    if (inst.kind === 'piano_bench') contactBlob(g, inst.position[0], inst.position[2], 0.38, 0.28, 0.28);
    if (inst.kind === 'flowerpot') contactBlob(g, inst.position[0], inst.position[2], 0.16, 0.16, 0.3);
  }
  contactBlob(g, m.T.x - 1.15, m.T.z, 0.35, 0.45, 0.22);
  contactBlob(g, m.T.x + 1.15, m.T.z, 0.35, 0.45, 0.22);
  contactBlob(g, m.T.x - 0.42, m.T.z + m.T.wid / 2 + 0.3, 0.9, 0.28, 0.22);
  contactBlob(g, 3.35, -3.22, 0.8, 0.28, 0.24);
}

boot({
  makeShell,
  makeProcedural,
  decoratePrototype,
  readyText: 'ready — alpine lodge · drag orbit · U unlit · T toon',
});
