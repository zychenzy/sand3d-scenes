// ITTF Laws 2.1–2.2, plus a club bay (10 m × 5 m) from facility guidance.
// Metres. Y up. Table length runs along Z. Three bays along X.

export const TABLE = {
  length: 2.74,
  width: 1.525,
  height: 0.76,
  line: 0.02,
  centerLine: 0.003,
};

export const NET = {
  height: 0.1525,
  overhang: 0.1525,
  postRadius: 0.008,
  bottomGap: 0.004,
  tape: 0.012,
};

export const BALL = { diameter: 0.04 };

export const BAY = {
  length: 10,
  width: 5,
  barrierH: 0.76,
  barrierT: 0.04,
  clearH: 5.05,
  gate: 0.9,
};

export const TABLE_X = [-5, 0, 5];

export const BENCH_RAW = { x: 0.418, y: 0.456, z: 1.5 };
export const BENCH_TARGET_H = 0.45;

export const BASKET_RAW = { w: 0.4, h: 0.346 };
export const BASKET_TARGET_H = 0.4;

export function endClearance() {
  return (BAY.length - TABLE.length) / 2;
}

export function sideClearance() {
  return (BAY.width - TABLE.width) / 2;
}

export function tableBox(cx, cz = 0) {
  return {
    x0: cx - TABLE.width / 2,
    x1: cx + TABLE.width / 2,
    z0: cz - TABLE.length / 2,
    z1: cz + TABLE.length / 2,
    y0: 0,
    y1: TABLE.height,
  };
}

export function bayBox(cx) {
  return {
    x0: cx - BAY.width / 2,
    x1: cx + BAY.width / 2,
    z0: -BAY.length / 2,
    z1: BAY.length / 2,
  };
}

export function lineRects(cx, cz = 0) {
  const { length: L, width: W, line: e, centerLine: c } = TABLE;
  const x0 = cx - W / 2;
  const x1 = cx + W / 2;
  const z0 = cz - L / 2;
  const z1 = cz + L / 2;
  return [
    { id: 'side-w', x0, x1: x0 + e, z0, z1 },
    { id: 'side-e', x0: x1 - e, x1, z0, z1 },
    { id: 'end-n', x0, x1, z0, z1: z0 + e },
    { id: 'end-s', x0, x1, z0: z1 - e, z1 },
    { id: 'center-n', x0: cx - c / 2, x1: cx + c / 2, z0: z0 + e, z1: cz },
    { id: 'center-s', x0: cx - c / 2, x1: cx + c / 2, z0: cz, z1: z1 - e },
  ];
}

export function netPosts(cx, cz = 0) {
  const side = TABLE.width / 2;
  const outer = side + NET.overhang;
  const center = outer - NET.postRadius;
  return {
    topY: TABLE.height + NET.height,
    meshBottomY: TABLE.height + NET.bottomGap,
    tapeBottomY: TABLE.height + NET.height - NET.tape,
    z: cz,
    outerX: [cx - outer, cx + outer],
    centerX: [cx - center, cx + center],
  };
}

export function benchMetrics() {
  const s = BENCH_TARGET_H / BENCH_RAW.y;
  return {
    height: BENCH_TARGET_H,
    depth: BENCH_RAW.x * s,
    length: BENCH_RAW.z * s,
    scale: s,
  };
}

export function scorerBenches() {
  const { depth } = benchMetrics();
  return TABLE_X.map((cx, i) => {
    const innerFace = cx + BAY.width / 2 - BAY.barrierT / 2;
    const x = innerFace - 0.06 - depth / 2;
    return {
      id: `scorer_${i + 1}`,
      kind: 'museum_bench',
      x,
      y: 0,
      z: 0,
      rotationY: 0,
      gaze: [-1, 0],
      tableX: cx,
    };
  });
}

export function approachBox(cx, end) {
  const side = TABLE.width / 2 + 0.15;
  const tableEnd = TABLE.length / 2;
  const wall = BAY.length / 2;
  const z0 = end === 'south' ? tableEnd : -wall;
  const z1 = end === 'south' ? wall : -tableEnd;
  return { x0: cx - side, x1: cx + side, z0, z1 };
}

export function baskets() {
  const s = BASKET_TARGET_H / BASKET_RAW.h;
  const radius = (BASKET_RAW.w * s) / 2;
  return TABLE_X.map((cx, i) => ({
    id: `basket_${i + 1}`,
    kind: 'ball_basket',
    x: cx + BAY.width / 2 - BAY.barrierT / 2 - 0.08 - radius,
    y: 0,
    z: BAY.length / 2 - BAY.barrierT / 2 - 0.08 - radius,
    rotationY: 0.35 * (i - 1),
    radius,
  }));
}

export function ballCart() {
  return { id: 'ball_cart', kind: 'wire_cart', x: 9.42, y: 0, z: 3.05, rotationY: 0.15 };
}

export function paddles() {
  const list = [];
  for (let i = 0; i < 8; i += 1) {
    list.push({
      id: `paddle_${i + 1}`,
      kind: i % 2 ? 'paddle_wood' : 'paddle_red',
      x: 10.3,
      y: 1.2,
      z: -0.2 + i * 0.2,
      rotationY: -Math.PI / 2,
    });
  }
  return list;
}

export function dutyChair() {
  return {
    id: 'duty_chair',
    kind: 'dining_chair',
    x: 9.7,
    y: 0,
    z: -3.72,
    rotationY: Math.PI,
    gaze: [0, -1],
  };
}

export function glbInstances() {
  const benches = scorerBenches().map(({ tableX, gaze, ...inst }) => inst);
  const basketInst = baskets().map(({ radius, ...inst }) => inst);
  return [
    ...TABLE_X.map((cx, i) => ({
      id: `table_${i + 1}`,
      kind: 'ittf_table',
      x: cx,
      y: 0,
      z: 0,
      rotationY: 0,
    })),
    ...benches,
    ...basketInst,
    ballCart(),
    ...paddles(),
    dutyChair(),
    { id: 'duty_lamp', kind: 'library_lamp', x: 10.05, y: 0.74, z: -4.42, rotationY: -0.4 },
    { id: 'duty_thermos', kind: 'thermos', x: 9.42, y: 0.74, z: -4.28, rotationY: 0.2 },
    { id: 'duty_mug', kind: 'cup_mug', x: 9.72, y: 0.74, z: -4.12, rotationY: 0.5 },
    { id: 'duty_plant', kind: 'flowerpot', x: 9.28, y: 0.74, z: -4.48, rotationY: 0.2 },
    { id: 'results_board', kind: 'chalkboard', x: 8.22, y: 0, z: -4.62, rotationY: Math.PI / 2 },
    { id: 'shelf_a', kind: 'wall_shelf', x: 10.4, y: 1.22, z: -2.55, rotationY: -Math.PI / 2 },
    { id: 'shelf_b', kind: 'wall_shelf', x: 10.4, y: 1.22, z: -1.7, rotationY: -Math.PI / 2 },
    { id: 'shelf_mug', kind: 'cup_mug', x: 10.22, y: 1.78, z: -2.55, rotationY: 0.8 },
    { id: 'pendant_a', kind: 'pendant_lamp', x: 9.2, y: 3.85, z: -1.2, rotationY: 0 },
    { id: 'pendant_b', kind: 'pendant_lamp', x: 9.35, y: 3.85, z: 2.35, rotationY: 0.4 },
  ];
}

export function barrierSegments() {
  const segs = [];
  const z0 = -BAY.length / 2;
  const z1 = BAY.length / 2;
  const xWest = TABLE_X[0] - BAY.width / 2;
  const xEast = TABLE_X[2] + BAY.width / 2;
  segs.push({ id: 'north', x0: xWest, z0, x1: xEast, z1: z0 });
  segs.push({ id: 'west', x0: xWest, z0, x1: xWest, z1 });
  for (const cx of TABLE_X) {
    const g = BAY.gate / 2;
    segs.push({ id: `south-${cx}-a`, x0: cx - BAY.width / 2, z0: z1, x1: cx - g, z1 });
    segs.push({ id: `south-${cx}-b`, x0: cx + g, z0: z1, x1: cx + BAY.width / 2, z1 });
  }
  for (const x of [-2.5, 2.5]) {
    segs.push({ id: `div-${x}-main`, x0: x, z0, x1: x, z1: 3.45 });
    segs.push({ id: `div-${x}-stub`, x0: x, z0: 4.3, x1: x, z1 });
  }
  segs.push({ id: 'east-main', x0: xEast, z0, x1: xEast, z1: 3.15 });
  segs.push({ id: 'east-stub', x0: xEast, z0: 4.05, x1: xEast, z1 });
  return segs;
}

function overlaps(a, b) {
  return a.x0 < b.x1 && a.x1 > b.x0 && a.z0 < b.z1 && a.z1 > b.z0;
}

export function layoutReport() {
  const issues = [];
  const tables = TABLE_X.map((cx) => tableBox(cx));
  for (let i = 0; i < tables.length; i += 1) {
    for (let j = i + 1; j < tables.length; j += 1) {
      if (overlaps(tables[i], tables[j])) issues.push('tables overlap');
    }
    const bay = bayBox(TABLE_X[i]);
    if (tables[i].x0 < bay.x0 || tables[i].x1 > bay.x1 || tables[i].z0 < bay.z0 || tables[i].z1 > bay.z1) {
      issues.push('table outside bay');
    }
  }
  for (const b of scorerBenches()) {
    const m = benchMetrics();
    const box = { x0: b.x - m.depth / 2, x1: b.x + m.depth / 2, z0: b.z - m.length / 2, z1: b.z + m.length / 2 };
    const table = tableBox(b.tableX);
    if (overlaps(box, table)) issues.push('bench intersects table');
    const bay = bayBox(b.tableX);
    if (box.x0 < bay.x0 || box.x1 > bay.x1) issues.push('bench outside bay');
    const to = [b.tableX - b.x, 0 - b.z];
    const len = Math.hypot(to[0], to[1]) || 1;
    const dot = (b.gaze[0] * to[0] + b.gaze[1] * to[1]) / len;
    if (dot < 0.95) issues.push('bench not facing table');
  }
  for (const basket of baskets()) {
    for (const cx of TABLE_X) {
      if (overlaps(
        { x0: basket.x - 0.05, x1: basket.x + 0.05, z0: basket.z - 0.05, z1: basket.z + 0.05 },
        approachBox(cx, 'south'),
      )) issues.push('basket in south approach');
      if (overlaps(
        { x0: basket.x - basket.radius, x1: basket.x + basket.radius, z0: basket.z - basket.radius, z1: basket.z + basket.radius },
        tableBox(cx),
      )) issues.push('basket on table');
    }
  }
  return issues;
}
