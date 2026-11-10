import * as THREE from 'three';
import {
  boot, toon, addBox, addCyl, makeCutawayShell, fillBooks, addContact,
} from './scene_lib.js';
import {
  expandComposition, parseFen, START_FEN, TABLE_H,
} from './chess_data.js';

const IVORY = '#f3eee4';
const EBONY = '#1c1815';
const IVORY_SQ = '#f4e7cb';
const WALNUT_SQ = '#6b3d22';
const FRAME = '#4e301c';
const WOOD = '#6b442c';
const WOOD_DARK = '#4a2e1c';
const BRASS = '#d7b15e';
const GREEN = '#1e4636';
const GREEN_MID = '#2a5a46';
const CREAM = '#f6efe2';
const BURGUNDY = '#7a3038';

const matCache = new Map();
function mat(color, opts) {
  const key = color + JSON.stringify(opts || {});
  if (!matCache.has(key)) matCache.set(key, toon(color, opts));
  return matCache.get(key);
}

const geos = {};
function lathe(key, pts, seg = 14) {
  if (!geos[key]) {
    geos[key] = new THREE.LatheGeometry(pts.map(([x, y]) => new THREE.Vector2(x, y)), seg);
  }
  return geos[key];
}

function knightGeometry() {
  if (geos.knight) return geos.knight;
  const s = new THREE.Shape();
  const pts = [
    [-0.015, 0.000], [0.016, 0.000], [0.017, 0.006], [0.010, 0.011],
    [0.007, 0.024], [0.010, 0.034], [0.018, 0.042], [0.022, 0.048],
    [0.014, 0.051], [0.008, 0.046], [0.007, 0.054], [0.002, 0.062],
    [-0.005, 0.052], [-0.009, 0.040], [-0.013, 0.022], [-0.016, 0.010],
  ];
  s.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) s.lineTo(pts[i][0], pts[i][1]);
  s.closePath();
  const geo = new THREE.ExtrudeGeometry(s, {
    depth: 0.013,
    bevelEnabled: true,
    bevelThickness: 0.0014,
    bevelSize: 0.0012,
    bevelSegments: 1,
    curveSegments: 8,
  });
  geo.translate(0, 0, -0.0065);
  geo.rotateY(-Math.PI / 2);
  geos.knight = geo;
  return geo;
}

function solid(geo, material, parent) {
  const m = new THREE.Mesh(geo, material);
  m.castShadow = true;
  m.receiveShadow = true;
  parent.add(m);
  return m;
}

function makePiece(type, color) {
  const g = new THREE.Group();
  const ivory = color === 'w';
  const body = mat(ivory ? IVORY : EBONY);
  const trim = mat(ivory ? '#c9b89a' : '#3a332c');
  const brass = mat(BRASS);
  addCyl(g, 0.018, 0.019, 0.004, trim, 0, 0.002, 0, 14);

  if (type === 'p') {
    solid(lathe('pawn', [
      [0.000, 0.004], [0.015, 0.004], [0.016, 0.008], [0.012, 0.011],
      [0.007, 0.016], [0.006, 0.026], [0.009, 0.031], [0.012, 0.034],
      [0.008, 0.037], [0.006, 0.040], [0.010, 0.043], [0.012, 0.048],
      [0.008, 0.052], [0.000, 0.053],
    ]), body, g);
  } else if (type === 'r') {
    solid(lathe('rook', [
      [0.000, 0.004], [0.017, 0.004], [0.018, 0.009], [0.013, 0.012],
      [0.012, 0.034], [0.016, 0.038], [0.016, 0.044], [0.011, 0.046],
      [0.000, 0.046],
    ]), body, g);
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2;
      addBox(g, 0.008, 0.009, 0.008, body, Math.cos(a) * 0.009, 0.050, Math.sin(a) * 0.009);
    }
  } else if (type === 'n') {
    solid(knightGeometry(), body, g);
    addCyl(g, 0.004, 0.004, 0.003, trim, 0.004, 0.048, 0.012, 8);
  } else if (type === 'b') {
    solid(lathe('bishop', [
      [0.000, 0.004], [0.016, 0.004], [0.017, 0.008], [0.010, 0.013],
      [0.006, 0.026], [0.008, 0.036], [0.012, 0.044], [0.008, 0.050],
      [0.011, 0.056], [0.008, 0.062], [0.004, 0.066], [0.000, 0.068],
    ]), body, g);
    addBox(g, 0.003, 0.016, 0.006, trim, 0, 0.058, 0.008);
    addCyl(g, 0.0045, 0.0045, 0.004, body, 0, 0.070, 0, 10);
  } else if (type === 'q') {
    solid(lathe('queen', [
      [0.000, 0.004], [0.017, 0.004], [0.018, 0.008], [0.009, 0.014],
      [0.006, 0.030], [0.008, 0.046], [0.013, 0.056], [0.015, 0.062],
      [0.010, 0.066], [0.000, 0.068],
    ]), body, g);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const s = new THREE.Mesh(new THREE.SphereGeometry(0.0042, 8, 6), body);
      s.position.set(Math.cos(a) * 0.009, 0.070, Math.sin(a) * 0.009);
      s.castShadow = true;
      g.add(s);
    }
    addCyl(g, 0.004, 0.004, 0.004, body, 0, 0.076, 0, 8);
  } else if (type === 'k') {
    solid(lathe('king', [
      [0.000, 0.004], [0.018, 0.004], [0.019, 0.009], [0.010, 0.014],
      [0.007, 0.034], [0.009, 0.052], [0.014, 0.062], [0.016, 0.070],
      [0.011, 0.074], [0.000, 0.076],
    ]), body, g);
    addBox(g, 0.004, 0.020, 0.004, brass, 0, 0.086, 0);
    addBox(g, 0.014, 0.004, 0.004, brass, 0, 0.090, 0);
  }
  g.userData.piece = type + color;
  return g;
}

function squareXZ(file, rank, cell) {
  return [(file - 3.5) * cell, (3.5 - rank) * cell];
}

function fenFor(layout, table) {
  if (table.fen === 'start') return START_FEN;
  if (table.fen === 'featured' || table.fen === 'analysis') {
    const src = layout.composition.tables.find((t) => t.id === table.fen);
    return src.fen === 'start' ? START_FEN : src.fen;
  }
  return table.fen;
}

function addChessClock(parent, x, y, z) {
  const g = new THREE.Group();
  const wood = mat(WOOD);
  const brass = mat(BRASS);
  const face = mat('#f7f4ee');
  const ink = mat('#1a1614');
  addBox(g, 0.122, 0.016, 0.064, wood, 0, 0.008, 0);
  addBox(g, 0.112, 0.008, 0.056, brass, 0, 0.018, 0);
  for (const [sx, up] of [[-0.028, true], [0.028, false]]) {
    const dial = new THREE.Mesh(new THREE.CylinderGeometry(0.020, 0.020, 0.008, 18), face);
    dial.rotation.x = Math.PI / 2;
    dial.position.set(sx, 0.034, 0.018);
    dial.castShadow = true;
    dial.receiveShadow = true;
    g.add(dial);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.020, 0.0024, 6, 16), brass);
    rim.position.set(sx, 0.034, 0.023);
    g.add(rim);
    addBox(g, 0.0022, up ? 0.014 : 0.011, 0.002, ink, sx, 0.034 + (up ? 0.006 : 0.004), 0.025);
    addBox(g, up ? 0.010 : 0.013, 0.0022, 0.002, ink, sx + (up ? 0.004 : 0.005), 0.034, 0.025);
    addCyl(g, 0.008, 0.008, up ? 0.010 : 0.005, ink, sx, up ? 0.030 : 0.026, -0.012, 10);
  }
  g.position.set(x, y, z);
  g.rotation.y = Math.PI / 2;
  parent.add(g);
  return g;
}

function addPlayBoard(parent, layout, table) {
  const g = new THREE.Group();
  g.name = `${table.id}_set`;
  const yaw = table.yaw || 0;
  g.position.set(table.position[0], 0, table.position[2]);
  g.rotation.y = yaw;
  const cell = table.cell || 0.048;
  const shiftX = table.boardShift?.[0] || 0;
  const shiftZ = table.boardShift?.[1] || 0;
  const span = cell * 8;
  const frame = 0.028;
  const wood = mat(FRAME);
  addBox(g, span + frame * 2, 0.02, span + frame * 2, wood, shiftX, TABLE_H + 0.01, shiftZ);
  for (let file = 0; file < 8; file++) {
    for (let rank = 0; rank < 8; rank++) {
      const [sx, sz] = squareXZ(file, rank, cell);
      const dark = (file + rank) % 2 === 0;
      addBox(
        g, cell * 0.96, 0.008, cell * 0.96,
        mat(dark ? WALNUT_SQ : IVORY_SQ),
        sx + shiftX, TABLE_H + 0.02, sz + shiftZ,
      );
    }
  }
  for (const p of parseFen(fenFor(layout, table))) {
    const [sx, sz] = squareXZ(p.file, p.rank, cell);
    const piece = makePiece(p.type, p.color);
    piece.position.set(sx + shiftX, TABLE_H + 0.024, sz + shiftZ);
    piece.rotation.y = p.color === 'w' ? Math.PI : 0;
    g.add(piece);
  }
  if (table.clock) {
    const side = table.clockSide ?? 1;
    addChessClock(g, shiftX + side * (span / 2 + frame + 0.05), TABLE_H, shiftZ + 0.02);
  }
  if (table.captured) {
    table.captured.forEach((p, i) => {
      const piece = makePiece(p.type, p.color);
      piece.position.set(shiftX - span / 2 - frame - 0.04, TABLE_H + 0.004, shiftZ - 0.04 + i * 0.05);
      piece.rotation.y = p.color === 'w' ? Math.PI : 0;
      g.add(piece);
    });
  }
  if (table.id !== 'analysis') {
    const sheetZ = shiftZ + span / 2 + frame + 0.1;
    addBox(g, 0.11, 0.004, 0.12, mat(CREAM), shiftX + 0.02, TABLE_H + 0.004, sheetZ);
    for (let i = 0; i < 4; i++) {
      addBox(g, 0.08, 0.002, 0.003, mat('#2a241c'), shiftX + 0.02, TABLE_H + 0.008, sheetZ - 0.04 + i * 0.022);
    }
  }
  parent.add(g);
}

function plaqueTexture(title, sub) {
  const c = document.createElement('canvas');
  c.width = 1024;
  c.height = sub ? 320 : 220;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#5c3a24';
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.strokeStyle = '#e6c98a';
  ctx.lineWidth = 14;
  ctx.strokeRect(18, 18, c.width - 36, c.height - 36);
  ctx.fillStyle = '#f6ecd4';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '600 78px "Liberation Serif", Georgia, serif';
  ctx.fillText(title, c.width / 2, sub ? 130 : c.height / 2);
  if (sub) {
    ctx.font = '400 36px "Liberation Serif", Georgia, serif';
    ctx.fillStyle = '#e6c98a';
    ctx.fillText(sub, c.width / 2, 230);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function addPlaque(parent, x, y, z, w, h, title, sub) {
  const tex = plaqueTexture(title, sub);
  const frame = mat(WOOD_DARK);
  addBox(parent, w + 0.06, h + 0.06, 0.03, frame, x, y, z - 0.01);
  const face = new THREE.Mesh(
    new THREE.PlaneGeometry(w, h),
    mat('#ffffff', { map: tex }),
  );
  face.position.set(x, y, z + 0.012);
  face.castShadow = false;
  face.receiveShadow = true;
  parent.add(face);
}

const WHITE_GLYPH = { k: '♔', q: '♕', r: '♖', b: '♗', n: '♘', p: '♙' };
const BLACK_GLYPH = { k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟' };

/** Printed demonstration board. Glyphs stay readable at room scale; tables keep 3D pieces. */
function diagramTexture(fen) {
  const S = 128;
  const c = document.createElement('canvas');
  c.width = S * 8;
  c.height = S * 8;
  const ctx = c.getContext('2d');
  for (let rank = 0; rank < 8; rank++) {
    for (let file = 0; file < 8; file++) {
      const dark = (file + rank) % 2 === 0;
      ctx.fillStyle = dark ? '#6b3d22' : '#f4e7cb';
      ctx.fillRect(file * S, (7 - rank) * S, S, S);
    }
  }
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `700 ${Math.floor(S * 0.78)}px "DejaVu Sans", "Liberation Sans", sans-serif`;
  for (const p of parseFen(fen)) {
    const ch = (p.color === 'w' ? WHITE_GLYPH : BLACK_GLYPH)[p.type];
    const x = p.file * S + S / 2;
    const y = (7 - p.rank) * S + S / 2 + S * 0.06;
    ctx.beginPath();
    ctx.arc(x, y - S * 0.02, S * 0.36, 0, Math.PI * 2);
    ctx.fillStyle = p.color === 'w' ? '#2a2118' : '#f6efe2';
    ctx.fill();
    ctx.fillStyle = p.color === 'w' ? '#f8f3ea' : '#161311';
    ctx.fillText(ch, x, y);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

function addWallBoard(parent, layout, spec) {
  const table = layout.composition.tables.find((t) => t.id === spec.fen);
  const g = new THREE.Group();
  const cell = 0.108;
  const span = cell * 8;
  const frame = 0.05;
  addBox(g, span + frame * 2, span + frame * 2 + 0.22, 0.045, mat(FRAME), 0, 0.08, 0);
  addPlaque(g, 0, span / 2 + 0.14, 0.03, span + frame * 1.1, 0.16, spec.label, '');
  const face = new THREE.Mesh(
    new THREE.PlaneGeometry(span, span),
    toon('#ffffff', { map: diagramTexture(fenFor(layout, table)) }),
  );
  face.position.set(0, 0, 0.03);
  face.castShadow = false;
  face.receiveShadow = true;
  g.add(face);
  g.position.set(spec.position[0], spec.position[1], spec.position[2]);
  parent.add(g);
}

function addWallClock(parent, x, y, z) {
  const g = new THREE.Group();
  const brass = mat(BRASS);
  const face = mat('#f7f3ea');
  const ink = mat('#1c1814');
  addCyl(g, 0.2, 0.2, 0.04, mat(WOOD_DARK), 0, 0, 0, 24);
  const dial = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.02, 24), face);
  dial.rotation.x = Math.PI / 2;
  dial.position.z = 0.02;
  dial.castShadow = true;
  g.add(dial);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.012, 8, 24), brass);
  rim.position.z = 0.032;
  g.add(rim);
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const tick = new THREE.Mesh(new THREE.BoxGeometry(0.01, i % 3 === 0 ? 0.028 : 0.016, 0.006), ink);
    tick.position.set(Math.sin(a) * 0.135, Math.cos(a) * 0.135, 0.034);
    tick.rotation.z = -a;
    g.add(tick);
  }
  addBox(g, 0.008, 0.09, 0.006, ink, 0.02, 0.03, 0.04);
  addBox(g, 0.07, 0.008, 0.006, ink, 0.02, 0, 0.04);
  addCyl(g, 0.012, 0.012, 0.01, brass, 0, 0, 0.046, 10);
  g.position.set(x, y, z);
  parent.add(g);
}

function addWindow(parent, x, y, z, w, h) {
  const grp = new THREE.Group();
  const wood = mat(WOOD_DARK);
  const t = 0.055;
  addBox(grp, w, t, 0.07, wood, 0, h / 2 - t / 2, 0);
  addBox(grp, w, t, 0.07, wood, 0, -h / 2 + t / 2, 0);
  addBox(grp, t, h, 0.07, wood, -w / 2 + t / 2, 0, 0);
  addBox(grp, t, h, 0.07, wood, w / 2 - t / 2, 0, 0);
  addBox(grp, 0.03, h - t * 2, 0.045, wood, 0, 0, 0.01);
  addBox(grp, w - t * 2, 0.03, 0.045, wood, 0, 0.08, 0.01);
  const glass = addBox(
    grp, w - t * 2, h - t * 2, 0.015,
    mat('#b7c9d1', { transparent: true, opacity: 0.32, side: THREE.DoubleSide }),
    0, 0, -0.005,
  );
  glass.castShadow = false;
  addBox(grp, w - 0.08, h - 0.08, 0.02, mat('#1a282e'), 0, 0, -0.03);
  addBox(grp, w + 0.1, 0.045, 0.14, wood, 0, -h / 2 - 0.01, 0.05);
  addBox(grp, 0.08, h * 0.92, 0.03, mat(BURGUNDY), -w / 2 - 0.02, 0.04, 0.05);
  addBox(grp, 0.08, h * 0.92, 0.03, mat(BURGUNDY), w / 2 + 0.02, 0.04, 0.05);
  addBox(grp, w + 0.16, 0.08, 0.05, mat(BURGUNDY), 0, h / 2 + 0.02, 0.05);
  grp.position.set(x, y, z);
  parent.add(grp);
}

function addSconce(parent, x, y, z) {
  addBox(parent, 0.07, 0.11, 0.02, mat(BRASS), x, y, z);
  addCyl(parent, 0.012, 0.016, 0.07, mat('#f4efe4', { emissive: '#ffc48a', emissiveIntensity: 0.7 }), x, y - 0.01, z + 0.035, 8);
  const bulb = new THREE.Mesh(
    new THREE.SphereGeometry(0.022, 10, 8),
    mat('#fff1cc', { emissive: '#ffaa55', emissiveIntensity: 1.05 }),
  );
  bulb.position.set(x, y + 0.02, z + 0.05);
  bulb.castShadow = false;
  parent.add(bulb);
}

function addFloorLamp(parent, x, z) {
  const brass = mat(BRASS);
  addCyl(parent, 0.15, 0.17, 0.025, mat(WOOD_DARK), x, 0.012, z, 16);
  addCyl(parent, 0.016, 0.02, 1.32, brass, x, 0.68, z, 8);
  const shade = new THREE.Mesh(
    new THREE.ConeGeometry(0.17, 0.16, 16, 1, true),
    mat('#f0d7a4', { emissive: '#ffb15a', emissiveIntensity: 0.45, side: THREE.DoubleSide }),
  );
  shade.position.set(x, 1.48, z);
  shade.castShadow = true;
  parent.add(shade);
  const bulb = new THREE.Mesh(
    new THREE.SphereGeometry(0.045, 12, 10),
    mat('#fff3d0', { emissive: '#ffaa55', emissiveIntensity: 1.15 }),
  );
  bulb.position.set(x, 1.42, z);
  bulb.castShadow = false;
  parent.add(bulb);
}

function addTrophy(parent, x, y, z, s = 1) {
  const gold = mat('#e2b84a');
  addCyl(parent, 0.038 * s, 0.044 * s, 0.014 * s, gold, x, y + 0.007 * s, z, 12);
  addCyl(parent, 0.01 * s, 0.014 * s, 0.06 * s, gold, x, y + 0.04 * s, z, 8);
  addCyl(parent, 0.03 * s, 0.02 * s, 0.045 * s, gold, x, y + 0.09 * s, z, 12);
  const geo = new THREE.TorusGeometry(0.018 * s, 0.004 * s, 6, 12);
  for (const side of [-1, 1]) {
    const h = new THREE.Mesh(geo, gold);
    h.position.set(x + side * 0.032 * s, y + 0.09 * s, z);
    h.rotation.y = Math.PI / 2;
    h.castShadow = true;
    parent.add(h);
  }
}

function addSideboard(parent, x, z, w) {
  const wood = mat(WOOD);
  const inset = mat('#3e2918');
  const top = mat('#a87444');
  addBox(parent, w, 0.74, 0.42, wood, x, 0.37, z);
  addBox(parent, w + 0.04, 0.045, 0.48, top, x, 0.76, z);
  const doors = 4;
  for (let i = 0; i < doors; i++) {
    const dx = x - w / 2 + (w / doors) * (i + 0.5);
    addBox(parent, w / doors - 0.06, 0.48, 0.018, inset, dx, 0.36, z + 0.21);
    addCyl(parent, 0.012, 0.012, 0.016, mat(BRASS), dx + 0.08, 0.36, z + 0.23, 8);
  }
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      addBox(parent, 0.06, 0.08, 0.06, mat(WOOD_DARK), x + sx * (w / 2 - 0.06), 0.04, z + sz * 0.16);
    }
  }
}

function addRug(parent, x, z, w, d) {
  addBox(parent, w, 0.012, d, mat(GREEN), x, 0.012, z);
  addBox(parent, w - 0.1, 0.004, d - 0.1, mat('#cbb98a'), x, 0.018, z);
  addBox(parent, w - 0.18, 0.006, d - 0.18, mat(GREEN_MID), x, 0.022, z);
}

function addReadingPerch(parent, x, z) {
  const wood = mat(WOOD);
  addBox(parent, 0.64, 0.05, 0.44, mat('#c4965c'), x, 0.58, z);
  for (const sx of [-0.26, 0.26]) {
    for (const sz of [-0.16, 0.16]) addBox(parent, 0.045, 0.55, 0.045, wood, x + sx, 0.28, z + sz);
  }
  addBox(parent, 0.22, 0.028, 0.16, mat('#6e3030'), x - 0.1, 0.62, z - 0.02);
  addBox(parent, 0.2, 0.024, 0.15, mat('#243f55'), x - 0.08, 0.646, z);
  addBox(parent, 0.2, 0.008, 0.15, mat(CREAM), x + 0.14, 0.612, z + 0.02);
  addBox(parent, 0.002, 0.006, 0.12, mat('#2a241c'), x + 0.14, 0.618, z + 0.02);
}

function addBench(parent, x, z, len) {
  const wood = mat('#7a5234');
  addBox(parent, len, 0.07, 0.36, wood, x, 0.42, z);
  for (const sx of [-len / 2 + 0.08, len / 2 - 0.08]) {
    addBox(parent, 0.06, 0.4, 0.28, mat(WOOD_DARK), x + sx, 0.2, z);
  }
}

function woodFloorTexture() {
  const c = document.createElement('canvas');
  c.width = 1024;
  c.height = 1024;
  const ctx = c.getContext('2d');
  const planks = 10;
  const ph = c.height / planks;
  for (let i = 0; i < planks; i++) {
    const tone = 168 + ((i * 37) % 5) * 12;
    ctx.fillStyle = `rgb(${tone},${tone - 8},${tone - 18})`;
    ctx.fillRect(0, i * ph, c.width, ph - 3);
    ctx.fillStyle = 'rgba(70,40,20,0.35)';
    ctx.fillRect(0, i * ph + ph - 3, c.width, 3);
    ctx.strokeStyle = 'rgba(90,55,28,0.28)';
    ctx.lineWidth = 1;
    for (let g = 0; g < 6; g++) {
      const y = i * ph + 8 + g * (ph / 7);
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.bezierCurveTo(200, y + 4, 500, y - 3, c.width, y + 2);
      ctx.stroke();
    }
    if (i % 2 === 0) {
      ctx.fillStyle = 'rgba(60,32,16,0.45)';
      ctx.fillRect(180 + (i * 90) % 500, i * ph + 4, 3, ph - 10);
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 8;
  return tex;
}

/** Raised panels on one face of the analysis screen. x is the proud face. */
function dressScreen(g, x, z0, z1) {
  const mid = (z0 + z1) / 2;
  const span = z1 - z0;
  const rail = mat(WOOD_DARK);
  const field = mat('#8d5a36');
  const t = 0.02;
  addBox(g, t, 2.22, 0.05, rail, x, 1.2, z0 + 0.03);
  addBox(g, t, 2.22, 0.05, rail, x, 1.2, z1 - 0.03);
  addBox(g, t, 0.05, span, rail, x, 0.16, mid);
  addBox(g, t, 0.05, span, rail, x, 1.16, mid);
  addBox(g, t, 0.05, span, rail, x, 2.2, mid);
  addBox(g, t * 0.45, 0.88, span - 0.16, field, x, 0.64, mid);
  addBox(g, t * 0.45, 0.9, span - 0.16, field, x, 1.66, mid);
}

function makeShell(layout) {
  const { width: W, depth: D, height: H } = layout.meta.room;
  const g = makeCutawayShell(layout, {
    wainscotH: 1.02,
    ceilingW: W * 0.96,
    ceilingD: D * 0.74,
    ceilingX: -0.2,
    ceilingZ: -D * 0.1,
  });
  const floor = g.getObjectByName('floor');
  if (floor) {
    const tex = woodFloorTexture();
    tex.repeat.set(W / 1.8, D / 1.8);
    floor.material.map = tex;
    floor.material.color.set('#ffffff');
  }

  const rail = mat('#5a3a24');
  const plasterTrim = mat('#e7dccb');
  addBox(g, W - 0.16, 0.045, 0.06, rail, 0, 1.04, -D / 2 + 0.125);
  addBox(g, 0.06, 0.045, D - 0.16, rail, -W / 2 + 0.125, 1.04, 0);
  addBox(g, W - 0.16, 0.035, 0.05, plasterTrim, 0, 2.7, -D / 2 + 0.12);
  addBox(g, 0.05, 0.035, D - 0.16, plasterTrim, -W / 2 + 0.12, 2.7, 0);
  addBox(g, W - 0.12, 0.08, 0.08, rail, 0, H - 0.1, -D / 2 + 0.12);
  addBox(g, 0.08, 0.08, D - 0.12, rail, -W / 2 + 0.12, H - 0.1, 0);
  addBox(g, W - 0.12, 0.12, 0.07, mat(WOOD_DARK), 0, 0.06, -D / 2 + 0.13);
  addBox(g, 0.07, 0.12, D - 0.12, mat(WOOD_DARK), -W / 2 + 0.13, 0.06, 0);

  const panel = mat('#8d5e3a');
  for (let x = -4.15; x <= 4.15; x += 0.9) {
    addBox(g, 0.62, 0.7, 0.012, panel, x, 0.52, -D / 2 + 0.145);
  }
  for (let z = -3.2; z <= 3.2; z += 0.9) {
    addBox(g, 0.012, 0.7, 0.62, panel, -W / 2 + 0.145, 0.52, z);
  }

  const border = mat(WOOD_DARK);
  const bw = 0.34;
  addBox(g, W - 0.5, 0.006, bw, border, -0.1, 0.008, -D / 2 + 0.28);
  addBox(g, W - 0.5, 0.006, bw, border, 0.1, 0.008, D / 2 - 0.28);
  addBox(g, bw, 0.006, D - 0.5, border, -W / 2 + 0.28, 0.008, 0);
  addBox(g, bw, 0.006, D - 0.5, border, W / 2 - 0.28, 0.008, 0.1);

  const beam = mat('#5c3c26');
  for (const z of [-2.6, -0.75, 1.15]) {
    addBox(g, W - 1.5, 0.16, 0.12, beam, -0.35, H - 0.3, z);
  }
  return g;
}

function makeProcedural(layout) {
  const g = new THREE.Group();
  g.name = 'procedural';
  const { width: W, depth: D, height: H } = layout.meta.room;
  const comp = layout.composition;
  const arch = comp.architecture;
  const backZ = -D / 2 + 0.08;

  const px = arch.partitionX;
  const [door0, door1] = arch.doorZ;
  const wood = mat(WOOD);
  const solid0 = backZ + 0.04;
  const solidDepth = door0 - solid0;
  const solidZ = (solid0 + door0) / 2;
  addBox(g, 0.1, 2.56, solidDepth, wood, px, 1.28, solidZ);
  dressScreen(g, px + 0.062, solid0 + 0.06, door0 - 0.06);
  dressScreen(g, px - 0.062, solid0 + 0.06, door0 - 0.06);
  addBox(g, 0.1, 0.42, door1 - door0, wood, px, 2.32, (door0 + door1) / 2);
  addBox(g, 0.18, 2.56, 0.34, wood, px, 1.28, arch.pierZ);
  addCyl(g, 0.1, 0.11, 2.48, mat('#7a5236'), px + 0.04, 1.24, arch.pierZ, 14);
  addCyl(g, 0.15, 0.15, 0.07, mat(WOOD_DARK), px + 0.04, 0.04, arch.pierZ, 14);
  addCyl(g, 0.16, 0.13, 0.08, mat(WOOD_DARK), px + 0.04, 2.5, arch.pierZ, 14);
  addBox(g, 0.16, 0.08, door1 - door0 + 0.08, mat(WOOD_DARK), px, 2.08, (door0 + door1) / 2);

  addRug(g, 1.15, -0.25, 2.55, 2.9);
  addRug(g, -2.05, 1.62, 2.35, 1.9);
  addRug(g, -3.05, -2.15, 2.35, 2.15);

  for (const table of comp.tables) addPlayBoard(g, layout, table);
  addWallBoard(g, layout, comp.displays.hall);
  addWallBoard(g, layout, comp.displays.nook);
  addPlaque(g, 1.65, 2.5, backZ + 0.06, 1.85, 0.32, 'CITY CHESS CLUB', 'MATCH ROOM  ·  ANALYSIS');
  addWallClock(g, 0.42, 2.15, backZ + 0.05);

  addWindow(g, 3.7, 1.82, backZ + 0.02, 1.25, 1.15);
  addWindow(g, -1.85, 1.9, backZ + 0.02, 0.82, 1.0);

  addSideboard(g, 2.35, -3.42, 3.15);
  addTrophy(g, 1.35, 0.79, -3.42, 1);
  addTrophy(g, 1.85, 0.79, -3.42, 0.82);
  addTrophy(g, 2.35, 0.79, -3.42, 1.15);
  addTrophy(g, 2.9, 0.79, -3.42, 0.7);
  addBox(g, 0.28, 0.035, 0.2, mat('#6e3030'), 3.45, 0.8, -3.42);
  addBox(g, 0.24, 0.03, 0.18, mat('#243f55'), 3.47, 0.832, -3.4);

  for (const s of comp.sconces) addSconce(g, s.position[0], s.position[1], s.position[2]);
  addFloorLamp(g, comp.floorLamp.position[0], comp.floorLamp.position[2]);
  addReadingPerch(g, comp.reading.table[0], comp.reading.table[2]);
  addBench(g, -3.35, 2.95, 1.25);

  const pendantH = layout.assets.pendant_lamp.targetHeight;
  for (const inst of layout.instances) {
    if (inst.kind === 'square_table') addContact(g, inst.position[0], inst.position[2], 1.15, 1.15, inst.rotationY || 0);
    else if (inst.kind === 'dining_chair') addContact(g, inst.position[0], inst.position[2], 0.46, 0.52, inst.rotationY || 0);
    else if (inst.kind === 'flowerpot') addContact(g, inst.position[0], inst.position[2], 0.32, 0.32, 0);
    else if (inst.kind === 'display_bookcase') addContact(g, inst.position[0], inst.position[2], 0.55, 0.95, inst.rotationY || 0);
    else if (inst.kind === 'book_stand') addContact(g, inst.position[0], inst.position[2], 0.75, 0.75, inst.rotationY || 0);
    else if (inst.id && inst.id.endsWith('_pendant')) {
      const top = inst.position[1] + pendantH;
      addCyl(g, 0.006, 0.006, Math.max(0.2, H - 0.16 - top), mat('#2c241c'), inst.position[0], (top + H - 0.16) / 2, inst.position[2], 6);
      const bulb = new THREE.Mesh(
        new THREE.SphereGeometry(0.045, 12, 10),
        mat('#fff1c8', { emissive: '#ffb15a', emissiveIntensity: 1.1 }),
      );
      bulb.position.set(inst.position[0], inst.position[1] + 0.14, inst.position[2]);
      bulb.castShadow = false;
      g.add(bulb);
    } else if (inst.kind === 'library_lamp') {
      const bulb = new THREE.Mesh(
        new THREE.SphereGeometry(0.03, 10, 8),
        mat('#fff6d8', { emissive: '#ffcc88', emissiveIntensity: 1.0 }),
      );
      bulb.position.set(inst.position[0], inst.position[1] + 0.26, inst.position[2] + 0.04);
      bulb.castShadow = false;
      g.add(bulb);
    }
  }

  for (const z of [-3.22, -2.22, -1.22]) {
    fillBooks(g, -4.4, z, Math.PI / 2, { width: 0.72, perShelf: 8, shelves: 4 });
  }
  for (const inst of layout.instances) {
    if (inst.kind !== 'flowerpot') continue;
    const [x, , z] = inst.position;
    addCyl(g, 0.018, 0.028, 0.18, mat('#4a3424'), x, 0.32, z, 6);
    addBox(g, 0.22, 0.14, 0.18, mat('#2f6a3e'), x, 0.46, z);
    addBox(g, 0.14, 0.12, 0.12, mat('#3e7d4c'), x + 0.05, 0.54, z - 0.03);
  }

  addBox(g, 0.22, 0.03, 0.16, mat('#7a3030'), -3.75, 1.04, -0.95);
  addBox(g, 0.18, 0.025, 0.14, mat(CREAM), -3.73, 1.068, -0.93);

  const hooks = mat(BRASS);
  addBox(g, 0.04, 0.5, 0.08, mat(WOOD), -W / 2 + 0.16, 1.45, 1.7);
  for (const dz of [-0.12, 0, 0.12]) addCyl(g, 0.012, 0.012, 0.06, hooks, -W / 2 + 0.2, 1.55, 1.7 + dz, 8);

  return g;
}

boot({
  prepareLayout: expandComposition,
  makeShell,
  makeProcedural,
  readyText: 'ready — chess clubhouse · drag orbit · U unlit · T toon',
});
