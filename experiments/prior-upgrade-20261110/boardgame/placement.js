/**
 * Axis-aligned layout for The Night Board club room.
 * Pure data — no Three.js — so chair facing and clearances can be tested in node.
 *
 * Dining-chair GLB faces +Z (backrest is local −Z). yaw = atan2(dx, dz)
 * turns that forward toward a target. Display-case mesh opens toward local −Z.
 */

export const ROOM = { width: 10.4, depth: 7.9, height: 3.18 };
export const WALL_T = 0.14;

export const INNER = {
  backZ: -ROOM.depth / 2 + WALL_T / 2,
  leftX: -ROOM.width / 2 + WALL_T / 2,
  frontZ: ROOM.depth / 2,
  rightX: ROOM.width / 2,
};

export const CHAIR = { h: 0.9, nativeH: 1, nativeW: 0.362, nativeD: 0.511 };
export const SEAT_GAP = 0.04;

export const TABLE_NATIVE = {
  long: { kind: 'long_table', w: 1.8, d: 0.938, h: 0.727, top: 0.76 },
  square: { kind: 'square_table', w: 1.2, d: 1.2, h: 1.184, top: 0.75 },
};

export const CASE_TARGET_H = 2.05;
export const CASE_NATIVE = { h: 2.0, minY: -0.025, w: 0.834, d: 0.408 };
export const CASE_SIZE = {
  w: CASE_NATIVE.w * (CASE_TARGET_H / CASE_NATIVE.h),
  d: CASE_NATIVE.d * (CASE_TARGET_H / CASE_NATIVE.h),
  h: CASE_TARGET_H,
};

export const WALL_SHELF = {
  targetH: 0.72,
  nativeH: 0.8,
  nativeMinY: -0.4,
  nativeW: 0.701,
  nativeD: 0.288,
  lowerTop: -0.227,
  upperBottom: 0.228,
  upperTop: 0.25,
  posY: 1.58,
  scaleX: 1.72,
};

export const BOARD = {
  x: INNER.leftX + 0.22,
  z: 0.95,
  targetH: 1.52,
  nativeH: 1.259,
  nativeDepth: 0.434,
  nativeWidth: 1.502,
  yaw: -Math.PI / 2,
};

export const LECTERN = { x: -4.28, z: 2.28, targetH: 0.98, nativeH: 1.2, nativeFoot: 0.665 };
export const DISPLAY = { x: -0.15, z: -3.18, w: 1.55, d: 0.42, h: 0.48 };
export const CRATE = { x: 4.22, z: 2.62, w: 0.86, d: 0.5, h: 0.44 };
export const RETURNS = { x: -4.35, z: 3.28, w: 0.78, d: 0.46, h: 0.4 };

export const PENDANT_H = 0.56;
const PLAY_SHADE = 1.76;

export const TABLES = [
  {
    id: 'campaign',
    shape: 'long',
    x: -2.08,
    z: -1.18,
    scaleXZ: 1,
    game: 'hex',
    shade: PLAY_SHADE,
    rug: { color: '#6a2436', border: '#451828' },
    seats: [
      { side: 's', along: -0.48 },
      { side: 's', along: 0.48 },
      { side: 'n', along: -0.48 },
      { side: 'n', along: 0.48 },
      { side: 'e', along: 0 },
      { side: 'w', along: 0 },
    ],
    pendants: [
      { x: -2.48, z: -1.18 },
      { x: -1.68, z: -1.18 },
    ],
  },
  {
    id: 'checkers',
    shape: 'square',
    x: 2.08,
    z: -1.12,
    scaleXZ: 1.16 / 0.76,
    game: 'checkers',
    shade: PLAY_SHADE,
    rug: { color: '#1e4a3c', border: '#123128' },
    seats: [
      { side: 's', along: 0 },
      { side: 'n', along: 0 },
      { side: 'e', along: 0 },
      { side: 'w', along: 0 },
    ],
    pendants: [{ x: 2.08, z: -1.12 }],
  },
  {
    id: 'cards',
    shape: 'square',
    x: -1.92,
    z: 1.68,
    scaleXZ: 1.14 / 0.76,
    game: 'cards',
    shade: 1.72,
    rug: { color: '#24365a', border: '#17243c' },
    seats: [
      { side: 's', along: 0 },
      { side: 'n', along: 0 },
      { side: 'e', along: 0 },
      { side: 'w', along: 0 },
    ],
    pendants: [{ x: -1.92, z: 1.68 }],
  },
  {
    id: 'go',
    shape: 'square',
    x: 2.18,
    z: 1.74,
    scaleXZ: 1.02 / 0.76,
    game: 'go',
    shade: 1.7,
    rug: { color: '#3e4a28', border: '#2a321c' },
    seats: [
      { side: 's', along: 0 },
      { side: 'n', along: 0 },
    ],
    pendants: [{ x: 2.18, z: 1.74 }],
  },
];

export const SHELF_PENDANTS = [
  { x: 1.55, z: INNER.backZ + 0.55, shade: 2.05 },
  { x: 3.35, z: INNER.backZ + 0.55, shade: 2.05 },
];

export const PLANTS = [
  { id: 'plant_back', x: 4.78, z: -3.35 },
  { id: 'plant_front', x: -4.85, z: 3.55 },
];

export function chairSize() {
  const s = CHAIR.h / CHAIR.nativeH;
  return { w: CHAIR.nativeW * s, d: CHAIR.nativeD * s, h: CHAIR.h };
}

export function footprint(table) {
  const n = TABLE_NATIVE[table.shape];
  const s = (n.top / n.h) * (table.scaleXZ ?? 1);
  return { w: n.w * s, d: n.d * s, top: n.top, kind: n.kind };
}

export function yawToward(dx, dz) {
  return Math.atan2(dx, dz);
}

export function forwardFromYaw(yaw) {
  return { x: Math.sin(yaw), z: Math.cos(yaw) };
}

export function caseOpenDir(yaw) {
  return { x: -Math.sin(yaw), z: -Math.cos(yaw) };
}

export function caseLocalY(nativeY) {
  const s = CASE_TARGET_H / CASE_NATIVE.h;
  return (nativeY - CASE_NATIVE.minY) * s;
}

export const BAYS = [
  { y: caseLocalY(0.029), next: caseLocalY(0.46) },
  { y: caseLocalY(0.514), next: caseLocalY(0.946) },
  { y: caseLocalY(1.0), next: caseLocalY(1.432) },
  { y: caseLocalY(1.486), next: caseLocalY(1.921) },
].map((b) => ({ y: b.y, clear: b.next - b.y }));

export function shelfWorldY(nativeY) {
  const s = WALL_SHELF.targetH / WALL_SHELF.nativeH;
  return WALL_SHELF.posY + (nativeY - WALL_SHELF.nativeMinY) * s;
}

export function shelfSize() {
  const s = WALL_SHELF.targetH / WALL_SHELF.nativeH;
  return {
    w: WALL_SHELF.nativeW * s * WALL_SHELF.scaleX,
    d: WALL_SHELF.nativeD * s,
    h: WALL_SHELF.targetH,
  };
}

const caseZ = INNER.backZ + CASE_SIZE.d / 2;
const backXs = [-4.62, -3.68, -2.74, -1.8];
const leftZs = [-2.55, -1.52];

export const CASES = [
  ...backXs.map((x, i) => ({
    id: `case_b${i}`,
    x,
    z: caseZ,
    yaw: Math.PI,
    wall: 'back',
    seed: 17 + i * 6,
  })),
  ...leftZs.map((z, i) => ({
    id: `case_l${i}`,
    x: INNER.leftX + CASE_SIZE.d / 2,
    z,
    yaw: -Math.PI / 2,
    wall: 'left',
    seed: 44 + i * 8,
  })),
];

export const SHELVES = [1.45, 2.72, 3.98].map((x, i) => ({
  id: `shelf_${i}`,
  x,
  z: INNER.backZ + shelfSize().d / 2 - 0.01,
  yaw: 0,
  seed: 70 + i,
}));

export function seatsFor(table) {
  const fp = footprint(table);
  const halfC = chairSize().d / 2;
  const hx = fp.w / 2;
  const hz = fp.d / 2;
  return table.seats.map((seat, i) => {
    let x = table.x;
    let z = table.z;
    let yaw = 0;
    if (seat.side === 's') {
      z += hz + halfC + SEAT_GAP;
      x += seat.along;
      yaw = Math.PI;
    } else if (seat.side === 'n') {
      z -= hz + halfC + SEAT_GAP;
      x += seat.along;
      yaw = 0;
    } else if (seat.side === 'e') {
      x += hx + halfC + SEAT_GAP;
      z += seat.along;
      yaw = -Math.PI / 2;
    } else if (seat.side === 'w') {
      x -= hx + halfC + SEAT_GAP;
      z += seat.along;
      yaw = Math.PI / 2;
    }
    return { id: `${table.id}_c${i}`, x, z, yaw, tableId: table.id, side: seat.side };
  });
}

export function allSeats() {
  return TABLES.flatMap(seatsFor);
}

export function chairAabb(ch) {
  const { w, d } = chairSize();
  const faceZ = Math.abs(Math.cos(ch.yaw)) > 0.5;
  const hx = (faceZ ? w : d) / 2;
  const hz = (faceZ ? d : w) / 2;
  return { minX: ch.x - hx, maxX: ch.x + hx, minZ: ch.z - hz, maxZ: ch.z + hz };
}

export function tableAabb(table) {
  const fp = footprint(table);
  return {
    minX: table.x - fp.w / 2,
    maxX: table.x + fp.w / 2,
    minZ: table.z - fp.d / 2,
    maxZ: table.z + fp.d / 2,
  };
}

export function caseAabb(c) {
  const alongX = Math.abs(Math.cos(c.yaw)) > 0.5;
  const hx = (alongX ? CASE_SIZE.w : CASE_SIZE.d) / 2;
  const hz = (alongX ? CASE_SIZE.d : CASE_SIZE.w) / 2;
  return { minX: c.x - hx, maxX: c.x + hx, minZ: c.z - hz, maxZ: c.z + hz };
}

export function rectAabb(r) {
  return {
    minX: r.x - r.w / 2,
    maxX: r.x + r.w / 2,
    minZ: r.z - r.d / 2,
    maxZ: r.z + r.d / 2,
  };
}

export function overlap(a, b, pad = 0) {
  return a.minX < b.maxX - pad && a.maxX > b.minX + pad && a.minZ < b.maxZ - pad && a.maxZ > b.minZ + pad;
}

export function gapAxis(a, b) {
  const dx = Math.max(0, Math.max(a.minX, b.minX) - Math.min(a.maxX, b.maxX));
  const dz = Math.max(0, Math.max(a.minZ, b.minZ) - Math.min(a.maxZ, b.maxZ));
  if (dx === 0 && dz === 0) return 0;
  if (dx === 0) return dz;
  if (dz === 0) return dx;
  return Math.hypot(dx, dz);
}

export function boardAabb() {
  return {
    minX: INNER.leftX,
    maxX: INNER.leftX + 0.12,
    minZ: BOARD.z - 0.5,
    maxZ: BOARD.z + 0.5,
  };
}

export function lecternAabb() {
  const foot = LECTERN.nativeFoot * (LECTERN.targetH / LECTERN.nativeH);
  return rectAabb({ x: LECTERN.x, z: LECTERN.z, w: foot, d: foot });
}

export function aisleAabb() {
  return { minX: -0.55, maxX: 0.55, minZ: -0.35, maxZ: 0.85 };
}

export function rugFor(table) {
  let minX = Infinity;
  let maxX = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;
  const boxes = [tableAabb(table), ...seatsFor(table).map(chairAabb)];
  for (const b of boxes) {
    minX = Math.min(minX, b.minX);
    maxX = Math.max(maxX, b.maxX);
    minZ = Math.min(minZ, b.minZ);
    maxZ = Math.max(maxZ, b.maxZ);
  }
  const m = 0.08;
  return {
    x: (minX + maxX) / 2,
    z: (minZ + maxZ) / 2,
    w: maxX - minX + m * 2,
    d: maxZ - minZ + m * 2,
    color: table.rug.color,
    border: table.rug.border,
  };
}

export function pendants() {
  const list = [];
  for (const t of TABLES) {
    for (const p of t.pendants) list.push({ ...p, shade: t.shade, id: `${t.id}_${p.x.toFixed(2)}` });
  }
  for (const p of SHELF_PENDANTS) list.push({ ...p, id: `shelf_${p.x.toFixed(2)}` });
  return list;
}

const MUGS = [
  { id: 'mug_hex0', table: 'campaign', ox: 0.82, oz: 0.34 },
  { id: 'mug_hex1', table: 'campaign', ox: -0.78, oz: -0.32 },
  { id: 'mug_ck0', table: 'checkers', ox: 0.48, oz: 0.46 },
  { id: 'mug_cd0', table: 'cards', ox: 0.42, oz: 0.44 },
  { id: 'mug_cd1', table: 'cards', ox: -0.4, oz: -0.38 },
  { id: 'mug_go0', table: 'go', ox: 0.36, oz: 0.38 },
];

export function buildInstances() {
  const out = [];
  for (const t of TABLES) {
    const fp = footprint(t);
    out.push({
      id: t.id,
      kind: fp.kind,
      position: [t.x, 0, t.z],
      rotationY: 0,
      scale: t.scaleXZ === 1 ? undefined : [t.scaleXZ, 1, t.scaleXZ],
    });
    for (const c of seatsFor(t)) {
      out.push({
        id: c.id,
        kind: 'dining_chair',
        position: [c.x, 0, c.z],
        rotationY: c.yaw,
      });
    }
  }
  for (const p of pendants()) {
    out.push({
      id: `pend_${p.id}`,
      kind: 'pendant_lamp',
      position: [p.x, p.shade, p.z],
      rotationY: 0,
    });
  }
  for (const c of CASES) {
    out.push({
      id: c.id,
      kind: 'display_bookcase',
      position: [c.x, 0, c.z],
      rotationY: c.yaw,
    });
  }
  for (const s of SHELVES) {
    out.push({
      id: s.id,
      kind: 'wall_shelf',
      position: [s.x, WALL_SHELF.posY, s.z],
      rotationY: s.yaw,
      scale: [WALL_SHELF.scaleX, 1, 1],
    });
  }
  const byId = Object.fromEntries(TABLES.map((t) => [t.id, t]));
  for (const m of MUGS) {
    const t = byId[m.table];
    out.push({
      id: m.id,
      kind: 'cup_mug',
      position: [t.x + m.ox, footprint(t).top, t.z + m.oz],
      rotationY: m.ox,
    });
  }
  out.push({
    id: 'rules_lectern',
    kind: 'book_stand',
    position: [LECTERN.x, 0, LECTERN.z],
    rotationY: Math.PI / 2,
  });
  for (const p of PLANTS) {
    out.push({ id: p.id, kind: 'flowerpot', position: [p.x, 0, p.z], rotationY: 0.25 });
  }
  return out;
}

export function validate() {
  const errors = [];
  const seats = allSeats();
  const games = new Set(TABLES.map((t) => t.game));
  if (games.size !== TABLES.length) errors.push('play tables repeat a game');
  if (TABLES.length < 4) errors.push('need at least four play surfaces');
  if (!games.has('checkers')) errors.push('missing a checkers table with pieces');

  for (const t of TABLES) {
    if (t.seats.length < 2) errors.push(`${t.id} needs multiple chairs`);
    const fp = footprint(t);
    if (fp.top < 0.7 || fp.top > 0.8) errors.push(`${t.id} top height ${fp.top}`);
    const area = fp.w * fp.d;
    const minArea = t.id === 'go' ? 0.85 : 1.05;
    if (area < minArea) errors.push(`${t.id} area ${area.toFixed(2)} is small`);
    for (const c of seatsFor(t)) {
      const fwd = forwardFromYaw(c.yaw);
      const dx = t.x - c.x;
      const dz = t.z - c.z;
      const approach = fwd.x * dx + fwd.z * dz;
      const lateral = Math.abs(fwd.z * dx - fwd.x * dz);
      const sideLimit = (c.side === 'e' || c.side === 'w' ? fp.d : fp.w) / 2 + 0.02;
      if (approach < 0.25 || lateral > sideLimit) {
        errors.push(`${c.id} does not face ${t.id} (approach ${approach.toFixed(2)} lateral ${lateral.toFixed(2)})`);
      }
      const gap = gapAxis(chairAabb(c), tableAabb(t));
      if (gap < 0.02 || gap > 0.1) errors.push(`${c.id} gap ${gap.toFixed(3)} to ${t.id}`);
    }
    const rug = rugFor(t);
    if (rug.w < fp.w || rug.d < fp.d) errors.push(`${t.id} rug smaller than table`);
  }

  for (let i = 0; i < seats.length; i++) {
    for (let j = i + 1; j < seats.length; j++) {
      if (overlap(chairAabb(seats[i]), chairAabb(seats[j]), 0.01)) {
        errors.push(`chairs overlap ${seats[i].id} ${seats[j].id}`);
      }
    }
  }

  for (let i = 0; i < TABLES.length; i++) {
    for (let j = i + 1; j < TABLES.length; j++) {
      const g = gapAxis(tableAabb(TABLES[i]), tableAabb(TABLES[j]));
      if (g < 0.75) errors.push(`tables close ${TABLES[i].id} ${TABLES[j].id} ${g.toFixed(2)}`);
    }
  }

  const aisle = aisleAabb();
  for (const t of TABLES) {
    if (overlap(tableAabb(t), aisle, 0.02)) errors.push(`${t.id} blocks the centre aisle`);
  }
  for (const s of seats) {
    if (overlap(chairAabb(s), aisle, 0.02)) errors.push(`${s.id} blocks the centre aisle`);
  }

  const obstacles = [boardAabb(), lecternAabb(), rectAabb(DISPLAY), rectAabb(CRATE), rectAabb(RETURNS)];
  for (const c of CASES) obstacles.push(caseAabb(c));
  for (const s of seats) {
    const a = chairAabb(s);
    for (const o of obstacles) {
      if (overlap(a, o, 0.02)) errors.push(`${s.id} intersects furniture`);
    }
    if (a.minX < INNER.leftX + 0.05 || a.maxZ > INNER.frontZ - 0.12) {
      errors.push(`${s.id} leaves the room`);
    }
  }
  for (const t of TABLES) {
    if (overlap(tableAabb(t), boardAabb(), 0.02) || overlap(tableAabb(t), lecternAabb(), 0.02)) {
      errors.push(`${t.id} intersects the night board`);
    }
  }

  for (const c of CASES) {
    const open = caseOpenDir(c.yaw);
    const into = c.wall === 'back' ? { x: 0, z: 1 } : { x: 1, z: 0 };
    const dot = open.x * into.x + open.z * into.z;
    if (dot < 0.95) errors.push(`${c.id} opens into the wall`);
  }
  for (let i = 0; i < CASES.length; i++) {
    for (let j = i + 1; j < CASES.length; j++) {
      if (overlap(caseAabb(CASES[i]), caseAabb(CASES[j]), 0.02)) {
        errors.push(`cases overlap ${CASES[i].id} ${CASES[j].id}`);
      }
    }
  }

  if (BAYS.some((b) => b.clear < 0.35)) errors.push('bookcase bay shorter than a game box');
  const lowerClear = shelfWorldY(WALL_SHELF.upperBottom) - shelfWorldY(WALL_SHELF.lowerTop);
  if (lowerClear < 0.32) errors.push('wall-shelf clearance tight');

  for (const t of TABLES) {
    const near = t.pendants.some((p) => Math.hypot(p.x - t.x, p.z - t.z) < 0.9);
    if (!near) errors.push(`${t.id} has no pendant pool`);
  }
  if (pendants().length < 6) errors.push('too few pendants');

  const kinds = new Set(buildInstances().map((i) => i.kind));
  for (const k of ['dining_chair', 'long_table', 'square_table', 'display_bookcase', 'pendant_lamp', 'book_stand']) {
    if (!kinds.has(k)) errors.push(`missing kind ${k}`);
  }
  if (CASES.length < 6) errors.push('box wall is too thin');
  return errors;
}
