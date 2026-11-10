/**
 * Axis-aligned layout for the social boardgame cafe.
 * Pure data — no Three.js — so chair facing and clearances can be tested in node.
 *
 * Chair GLB faces +Z (backrest is -Z). yaw = atan2(dx, dz) turns that forward
 * toward a target. Bookcase mesh opens toward local -Z (back panel is +Z).
 */

export const ROOM = { width: 11.4, depth: 8.6, height: 3.2 };
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
  round: { kind: 'round_table', w: 0.448, d: 0.448, h: 0.376, top: 0.74 },
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
  posY: 1.64,
  scaleX: 1.87,
};

export const BAR = {
  x0: 0.92,
  x1: 4.82,
  depth: 0.68,
  top: 1.06,
  z: -3.81,
};

export const STOOL = { h: 0.75, d: 0.464 };
export const STOOL_GAP = 0.09;

export const BOARD = {
  x: -5.35,
  z: 1.15,
  targetH: 1.5,
  nativeH: 1.259,
  nativeDepth: 0.434,
  nativeWidth: 1.502,
};

export const LECTERN = { x: -4.42, z: 2.22, targetH: 0.98, nativeH: 1.2, nativeFoot: 0.665 };
export const DISPLAY = { x: -3.3, z: -3.4, w: 1.7, d: 0.4, h: 0.46 };
export const CRATE = { x: -2.9, z: 3.42, w: 0.9, d: 0.52, h: 0.44 };

export const PENDANT_H = 0.56;

const PLAY_SHADE = 1.78;
const BAR_SHADE = 2.02;

export const TABLES = [
  {
    id: 'strategy',
    shape: 'long',
    x: -2.35,
    z: -1.55,
    scaleXZ: 1,
    game: 'hex',
    shade: PLAY_SHADE,
    rug: { color: '#6e2434', border: '#4a1824' },
    seats: [
      { side: 's', along: -0.5 },
      { side: 's', along: 0.5 },
      { side: 'n', along: -0.5 },
      { side: 'n', along: 0.5 },
      { side: 'e', along: 0 },
      { side: 'w', along: 0 },
    ],
    pendants: [
      { x: -2.72, z: -1.55 },
      { x: -1.98, z: -1.55 },
    ],
  },
  {
    id: 'track',
    shape: 'square',
    x: 1.75,
    z: -1.22,
    scaleXZ: 1.28 / 0.76,
    game: 'track',
    shade: PLAY_SHADE,
    rug: { color: '#1b4a44', border: '#102e2b' },
    seats: [
      { side: 's', along: 0 },
      { side: 'n', along: 0 },
      { side: 'e', along: 0 },
      { side: 'w', along: 0 },
    ],
    pendants: [{ x: 1.75, z: -1.22 }],
  },
  {
    id: 'cards',
    shape: 'round',
    x: -0.2,
    z: 1.52,
    scaleXZ: 1.22 / 0.882,
    game: 'cards',
    shade: 1.74,
    rug: { color: '#24365f', border: '#16223d' },
    seats: [
      { side: 's', along: 0 },
      { side: 'n', along: 0 },
      { side: 'e', along: 0 },
      { side: 'w', along: 0 },
    ],
    pendants: [{ x: -0.2, z: 1.52 }],
  },
  {
    id: 'duel',
    shape: 'square',
    x: 3.42,
    z: 1.58,
    scaleXZ: 0.98 / 0.76,
    game: 'go',
    shade: 1.72,
    rug: { color: '#3e4a2c', border: '#2a331e' },
    seats: [
      { side: 's', along: 0 },
      { side: 'n', along: 0 },
    ],
    pendants: [{ x: 3.42, z: 1.58 }],
  },
  {
    id: 'teach',
    shape: 'square',
    x: -4.42,
    z: 1.15,
    scaleXZ: 1.06 / 0.76,
    game: 'lesson',
    shade: 1.68,
    rug: { color: '#a56b32', border: '#6e4520' },
    seats: [
      { side: 'e', along: -0.28 },
      { side: 'e', along: 0.28 },
    ],
    pendants: [{ x: -4.42, z: 1.15 }],
  },
];

export const BAR_PENDANTS = [
  { x: 1.6, z: BAR.z, shade: BAR_SHADE },
  { x: 2.95, z: BAR.z, shade: BAR_SHADE },
  { x: 4.25, z: BAR.z, shade: BAR_SHADE },
];

export const STOOL_X = [1.4, 2.15, 2.9, 3.65, 4.4];

export const PLANTS = [
  { id: 'plant_bar', x: 5.22, z: -2.55 },
  { id: 'plant_front', x: -4.55, z: 3.38 },
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

/** Bookcase opening. Local -Z swung by yaw. */
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
const backXs = [-5.05, -4.08, -3.11, -2.14, -1.17];
const leftZs = [-2.7, -1.65, -0.6];

export const CASES = [
  ...backXs.map((x, i) => ({
    id: `case_b${i}`,
    x,
    z: caseZ,
    yaw: Math.PI,
    wall: 'back',
    seed: 11 + i * 5,
  })),
  ...leftZs.map((z, i) => ({
    id: `case_l${i}`,
    x: INNER.leftX + CASE_SIZE.d / 2,
    z,
    yaw: -Math.PI / 2,
    wall: 'left',
    seed: 40 + i * 7,
  })),
];

export const SHELVES = [1.6, 2.95, 4.25].map((x, i) => ({
  id: `backbar_${i}`,
  x,
  z: INNER.backZ + shelfSize().d / 2 - 0.01,
  yaw: 0,
  seed: 80 + i,
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
  const s = BOARD.targetH / BOARD.nativeH;
  const depth = BOARD.nativeDepth * s;
  const width = BOARD.nativeWidth * s;
  return {
    minX: BOARD.x - depth / 2,
    maxX: BOARD.x + depth / 2,
    minZ: BOARD.z - width / 2,
    maxZ: BOARD.z + width / 2,
    depth,
    width,
  };
}

export function lecternAabb() {
  const foot = LECTERN.nativeFoot * (LECTERN.targetH / LECTERN.nativeH);
  return rectAabb({ x: LECTERN.x, z: LECTERN.z, w: foot, d: foot });
}

export function barAabb() {
  return {
    minX: BAR.x0,
    maxX: BAR.x1,
    minZ: BAR.z - BAR.depth / 2,
    maxZ: BAR.z + BAR.depth / 2,
  };
}

export function stoolPos() {
  const z = BAR.z + BAR.depth / 2 + STOOL.d / 2 + STOOL_GAP;
  return STOOL_X.map((x, i) => ({ id: `stool_${i}`, x, z, yaw: Math.PI }));
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
  for (const p of BAR_PENDANTS) list.push({ ...p, id: `bar_${p.x.toFixed(2)}` });
  return list;
}

const MUGS = [
  { id: 'mug_s0', table: 'strategy', ox: 0.78, oz: 0.32 },
  { id: 'mug_s1', table: 'strategy', ox: -0.74, oz: -0.3 },
  { id: 'mug_t0', table: 'track', ox: 0.52, oz: 0.5 },
  { id: 'mug_c0', table: 'cards', ox: 0.38, oz: 0.46 },
  { id: 'mug_c1', table: 'cards', ox: -0.42, oz: -0.4 },
  { id: 'mug_d0', table: 'duel', ox: 0.34, oz: 0.4 },
  { id: 'mug_teach', table: 'teach', ox: 0.3, oz: -0.28 },
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
  for (const st of stoolPos()) {
    out.push({
      id: st.id,
      kind: 'bar_stool',
      position: [st.x, 0, st.z],
      rotationY: st.yaw,
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
  const teach = byId.teach;
  out.push({
    id: 'teach_lamp',
    kind: 'library_lamp',
    position: [teach.x - 0.22, footprint(teach).top, teach.z + 0.18],
    rotationY: -Math.PI / 2,
  });
  out.push({
    id: 'teach_board',
    kind: 'chalkboard',
    position: [BOARD.x, 0, BOARD.z],
    rotationY: 0,
  });
  out.push({
    id: 'teach_lectern',
    kind: 'book_stand',
    position: [LECTERN.x, 0, LECTERN.z],
    rotationY: 0,
  });
  out.push(
    { id: 'espresso', kind: 'espresso_machine', position: [1.28, BAR.top, -3.95], rotationY: Math.PI },
    { id: 'register', kind: 'cash_register', position: [4.48, BAR.top, -3.9], rotationY: 0.15 },
    { id: 'pos', kind: 'pos_terminal', position: [4.12, BAR.top, -3.88], rotationY: 0.4 },
    { id: 'thermos', kind: 'thermos', position: [3.55, BAR.top, -3.98], rotationY: 0.2 },
    { id: 'jar_a', kind: 'jam_jar', position: [3.28, BAR.top, -4.0], rotationY: 0.4 },
    { id: 'jar_b', kind: 'jam_jar', position: [3.12, BAR.top, -3.92], rotationY: -0.3 },
    { id: 'tray', kind: 'tray_napkin', position: [2.55, BAR.top, -3.7], rotationY: 0.1 },
    { id: 'straws', kind: 'straw_holder', position: [3.78, BAR.top, -4.0], rotationY: 0.2 },
    { id: 'bar_mug_a', kind: 'cup_mug', position: [1.85, BAR.top, -3.62], rotationY: 0.6 },
    { id: 'bar_mug_b', kind: 'cup_mug', position: [2.02, BAR.top, -3.7], rotationY: -0.4 },
    { id: 'bar_mug_c', kind: 'cup_mug', position: [2.2, BAR.top, -3.6], rotationY: 1.1 },
  );
  for (const p of PLANTS) {
    out.push({ id: p.id, kind: 'flowerpot', position: [p.x, 0, p.z], rotationY: 0.3 });
  }
  return out;
}

export function validate() {
  const errors = [];
  const seats = allSeats();
  const games = new Set(TABLES.map((t) => t.game));
  if (games.size !== TABLES.length) errors.push('play tables repeat a game');
  if (TABLES.length < 4) errors.push('need at least four play surfaces');

  for (const t of TABLES) {
    if (t.seats.length < 2) errors.push(`${t.id} needs multiple chairs`);
    const fp = footprint(t);
    if (fp.top < 0.7 || fp.top > 0.8) errors.push(`${t.id} top height ${fp.top}`);
    const area = t.shape === 'round' ? Math.PI * (fp.w / 2) ** 2 : fp.w * fp.d;
    const minArea = t.id === 'duel' || t.id === 'teach' ? 0.7 : 1.05;
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
      if (g < 0.7) errors.push(`tables close ${TABLES[i].id} ${TABLES[j].id} ${g.toFixed(2)}`);
    }
  }

  const obstacles = [barAabb(), boardAabb(), lecternAabb(), rectAabb(DISPLAY), rectAabb(CRATE)];
  for (const c of CASES) obstacles.push(caseAabb(c));
  for (const s of seats) {
    const a = chairAabb(s);
    for (const o of obstacles) {
      if (overlap(a, o, 0.02)) errors.push(`${s.id} intersects furniture`);
    }
    if (a.minX < INNER.leftX + 0.05 || a.maxZ > INNER.frontZ - 0.15) {
      errors.push(`${s.id} leaves the room`);
    }
  }
  for (const t of TABLES) {
    if (overlap(tableAabb(t), barAabb()) || overlap(tableAabb(t), boardAabb(), 0.02)) {
      errors.push(`${t.id} intersects bar or board`);
    }
  }

  const stools = stoolPos();
  if (stools.length < 4) errors.push('bar needs several stools');
  for (const st of stools) {
    const fwd = forwardFromYaw(st.yaw);
    const frontZ = BAR.z + BAR.depth / 2;
    const dz = frontZ - st.z;
    const approach = fwd.z * dz;
    if (approach < 0.2 || Math.abs(fwd.x) > 0.2) errors.push(`${st.id} does not face the bar`);
    const stoolBox = rectAabb({ x: st.x, z: st.z, w: STOOL.d, d: STOOL.d });
    const g = gapAxis(stoolBox, barAabb());
    if (g < 0.06 || g > 0.14) errors.push(`${st.id} bar gap ${g.toFixed(3)}`);
    if (st.x < BAR.x0 + 0.2 || st.x > BAR.x1 - 0.2) errors.push(`${st.id} off the bar run`);
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
  if (lowerClear < 0.32) errors.push('backbar shelf clearance tight');

  for (const t of TABLES) {
    const near = t.pendants.some((p) => Math.hypot(p.x - t.x, p.z - t.z) < 0.9);
    if (!near) errors.push(`${t.id} has no pendant pool`);
  }
  if (pendants().length < 8) errors.push('too few pendants');

  const kinds = new Set(buildInstances().map((i) => i.kind));
  for (const k of ['dining_chair', 'long_table', 'square_table', 'round_table', 'display_bookcase', 'bar_stool', 'pendant_lamp']) {
    if (!kinds.has(k)) errors.push(`missing kind ${k}`);
  }
  return errors;
}
