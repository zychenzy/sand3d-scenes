/**
 * Outdoor amphitheatre plan, metres, Y up.
 * Seats are annular stone blocks on grass treads. Angle 0 points +Z
 * (toward the gathering forecourt). The stage sits just upstage of FOCUS,
 * so every block's inner face points at the performance spot.
 * Side stairs run outside the arc so the bowl stays continuous.
 */

export const FOCUS = { x: 0, z: -5.9 };
export const ARC = 1.28;

export const TIER_DEFS = [
  { r: 2.95, seat: 0.58, tread: 0.74, rise: 0.33 },
  { r: 4.4, seat: 0.6, tread: 0.82, rise: 0.35 },
  { r: 5.95, seat: 0.62, tread: 0.9, rise: 0.36 },
  { r: 7.6, seat: 0.64, tread: 0.98, rise: 0.36 },
  { r: 9.35, seat: 0.66, tread: 1.08, rise: 0.35 },
];

export const STAGE = { x: -0.4, z: -7.4, w: 6.4, d: 3.5, y: 0.58 };

export const SHED = { x: 5.45, z: -8.2, w: 3.3, d: 2.4, h: 2.2 };

/** Straight flights just outside the seat arc. y1 is the crest. */
export const FLIGHTS = [
  { id: "L", x0: -5.05, z0: -4.55, x1: -10.85, z1: -2.85, y0: 0.02, width: 1.32 },
  { id: "R", x0: 5.55, z0: -4.35, x1: 11.15, z1: -2.55, y0: 0.02, width: 1.22 },
];

export const PATH_POLYS = [
  [
    [11.15, -2.55],
    [10.7, -0.15],
    [9.35, 2.15],
    [7.15, 4.15],
    [4.7, 5.85],
    [3.15, 6.7],
  ],
  [
    [-10.85, -2.85],
    [-11.12, -0.52],
    [-9.83, 1.58],
    [-8.14, 3.38],
    [-6.14, 4.82],
    [-4.12, 5.74],
    [-2.15, 6.35],
  ],
];

export const POLES = [
  { id: "pole_l", x: -4.9, z: -6.55, h: 5.15 },
  { id: "pole_r", x: 4.25, z: -6.05, h: 4.7 },
];

export const TREES = [
  { kind: "broad", x: -1.5, z: -14.5, h: 11.0, seed: 1 },
  { kind: "broad", x: 2.4, z: -13.5, h: 9.2, seed: 2 },
  { kind: "broad", x: -5.4, z: -13.1, h: 8.5, seed: 3 },
  { kind: "pine", x: -9.4, z: -12.2, h: 12.0, seed: 4 },
  { kind: "column", x: 7.4, z: -12.8, h: 10.4, seed: 5 },
  { kind: "broad", x: 5.0, z: -15.1, h: 8.0, seed: 6 },
  { kind: "pine", x: 11.4, z: -9.2, h: 9.6, seed: 7 },
  { kind: "multi", x: -13.4, z: -1.8, h: 7.2, seed: 8 },
  { kind: "broad", x: 13.6, z: 2.2, h: 7.8, seed: 9 },
  { kind: "multi", x: -7.8, z: 9.2, h: 6.4, seed: 10 },
  { kind: "column", x: 10.2, z: 9.8, h: 7.6, seed: 11 },
  { kind: "shrub", x: -11.2, z: -6.4, h: 1.3, seed: 12 },
  { kind: "shrub", x: 8.6, z: -7.6, h: 1.1, seed: 13 },
  { kind: "shrub", x: -6.6, z: -10.4, h: 1.45, seed: 14 },
  { kind: "shrub", x: 6.6, z: -10.5, h: 1.2, seed: 15 },
  { kind: "shrub", x: 7.6, z: 6.6, h: 0.95, seed: 16 },
  { kind: "shrub", x: -5.4, z: 8.0, h: 1.1, seed: 17 },
  { kind: "shrub", x: 12.2, z: -4.6, h: 1.35, seed: 18 },
  { kind: "shrub", x: -2.8, z: -10.8, h: 1.05, seed: 19 },
];

let tierCache = null;

export function getTiers() {
  if (tierCache) return tierCache;
  let y = 0;
  tierCache = TIER_DEFS.map((t) => {
    y += t.rise;
    return { ...t, y, rOuter: +(t.r + t.seat + t.tread).toFixed(4) };
  });
  return tierCache;
}

export function crestY() {
  const tiers = getTiers();
  return tiers[tiers.length - 1].y;
}

export function outerRadius() {
  const tiers = getTiers();
  return tiers[tiers.length - 1].rOuter;
}

export function foreY() {
  return crestY() + 0.03;
}

export function clamp(v, a, b) {
  return Math.max(a, Math.min(b, v));
}

export function lerp(a, b, t) {
  return a + (b - a) * t;
}

export function smoothstep(e0, e1, x) {
  const t = clamp((x - e0) / (e1 - e0), 0, 1);
  return t * t * (3 - 2 * t);
}

/** Dining-chair look direction at rotationY. Matches reviewed boardgame layout. */
export function lookVector(yaw) {
  return { x: Math.sin(yaw), z: Math.cos(yaw) };
}

export function yawToward(from, to) {
  return Math.atan2(to.x - from.x, to.z - from.z);
}

export function stageLipZ() {
  return STAGE.z + STAGE.d / 2;
}

export function stageAabb(inset = 0) {
  return {
    x0: STAGE.x - STAGE.w / 2 + inset,
    x1: STAGE.x + STAGE.w / 2 - inset,
    z0: STAGE.z - STAGE.d / 2 + inset,
    z1: STAGE.z + STAGE.d / 2 - inset,
  };
}

export function stageContains(x, z, inset = 0) {
  const b = stageAabb(inset);
  return x >= b.x0 && x <= b.x1 && z >= b.z0 && z <= b.z1;
}

export function shedAabb() {
  return {
    x0: SHED.x - SHED.w / 2,
    x1: SHED.x + SHED.w / 2,
    z0: SHED.z - SHED.d / 2,
    z1: SHED.z + SHED.d / 2,
  };
}

export function aabbOverlap(a, b) {
  return a.x0 < b.x1 && a.x1 > b.x0 && a.z0 < b.z1 && a.z1 > b.z0;
}

export function polar(x, z) {
  const dx = x - FOCUS.x;
  const dz = z - FOCUS.z;
  return { r: Math.hypot(dx, dz), ang: Math.atan2(dx, dz) };
}

/** True when a point lies on the seat/tread bowl (not the open stage mouth). */
export function seatingContainment(x, z) {
  const { r, ang } = polar(x, z);
  const tiers = getTiers();
  const inner = tiers[0].r - 0.04;
  const outer = outerRadius() + 0.02;
  const inside = r >= inner && r <= outer && Math.abs(ang) <= ARC - 0.04;
  return { r, ang, inside };
}

function yardMask(x, z) {
  const zIn = smoothstep(-11.3, -10.3, z) * (1 - smoothstep(-4.7, -3.85, z));
  const xIn = smoothstep(-8.4, -6.9, x) * (1 - smoothstep(7.4, 8.8, x));
  return clamp(zIn * xIn, 0, 1);
}

function forecourtMask(x, z) {
  const z0 = FOCUS.z + outerRadius() - 0.35;
  const inZ = smoothstep(z0, z0 + 0.45, z) * (1 - smoothstep(z0 + 3.5, z0 + 4.5, z));
  const inX = smoothstep(-3.4, -1.9, x) * (1 - smoothstep(5.6, 6.8, x));
  return clamp(inZ * inX, 0, 1);
}

export function naturalHeight(x, z) {
  const { r, ang } = polar(x, z);
  const tiers = getTiers();
  const crest = crestY();
  const outer = outerRadius();
  const inner = tiers[0].r;

  let bowl = 0.015;
  if (r >= inner) {
    bowl = crest;
    for (const t of tiers) {
      if (r < t.r) {
        bowl = t.y - t.rise;
        break;
      }
      if (r < t.rOuter) {
        bowl = t.y;
        break;
      }
    }
  }

  const outside = smoothstep(ARC - 0.02, ARC + 0.58, Math.abs(ang));
  const park =
    0.02 +
    smoothstep(10, 24, Math.hypot(x * 0.85, z + 1.5)) * 0.62 +
    smoothstep(-9.2, -16.5, z) * (1.15 + 0.22 * Math.sin(x * 0.38));

  let y = lerp(bowl, park, outside);
  if (r > outer - 0.25) {
    const beyond = clamp((r - outer) / 5.8, 0, 1);
    const plateau = lerp(crest, park, beyond);
    const grip = clamp((r - (outer - 0.35)) / 0.7, 0, 1);
    y = lerp(y, plateau, grip);
  }
  const fore = forecourtMask(x, z);
  if (fore > 0) y = lerp(y, crest, fore);

  const yard = yardMask(x, z);
  if (yard > 0) y = lerp(y, 0.02, yard);
  return y;
}

export function carveHeight(x, z) {
  const crest = crestY();
  let best = null;
  for (const f of FLIGHTS) {
    const dx = f.x1 - f.x0;
    const dz = f.z1 - f.z0;
    const len2 = dx * dx + dz * dz;
    let t = ((x - f.x0) * dx + (z - f.z0) * dz) / len2;
    if (t < -0.03 || t > 1.03) continue;
    t = clamp(t, 0, 1);
    const px = f.x0 + dx * t;
    const pz = f.z0 + dz * t;
    if (Math.hypot(x - px, z - pz) <= f.width / 2 + 0.1) {
      const y = f.y0 + (crest - f.y0) * t;
      best = best == null ? y : Math.min(best, y);
    }
  }
  return best;
}

export function sampleHeight(x, z) {
  const natural = naturalHeight(x, z);
  const carved = carveHeight(x, z);
  if (carved == null) return natural;
  return Math.min(natural, carved);
}

const BLOCK_PATTERN = [0.96, 0.8, 1.08, 0.88, 1.02, 0.74, 0.92];

export function stoneBlocks() {
  const blocks = [];
  const tiers = getTiers();
  for (let ti = 0; ti < tiers.length; ti++) {
    const t = tiers[ti];
    const r0 = t.r + 0.05;
    const r1 = t.r + t.seat - 0.02;
    const depth = r1 - r0;
    const rMid = (r0 + r1) / 2;
    let a = -ARC;
    let bi = 0;
    while (a < ARC - 0.012) {
      const w = BLOCK_PATTERN[(bi + ti * 2) % BLOCK_PATTERN.length];
      const a1 = Math.min(a + w / rMid, ARC);
      const am = (a + a1) / 2;
      const width = (a1 - a) * rMid;
      blocks.push({
        tier: ti,
        am,
        width,
        depth,
        rMid,
        x: FOCUS.x + Math.sin(am) * rMid,
        z: FOCUS.z + Math.cos(am) * rMid,
        y: t.y + 0.018,
        thick: 0.12,
        yaw: am,
      });
      a = a1;
      bi++;
    }
  }
  return blocks;
}

export function riserRuns() {
  const runs = [];
  const tiers = getTiers();
  for (let ti = 0; ti < tiers.length; ti++) {
    const t = tiers[ti];
    const rMid = t.r + 0.02;
    const depth = 0.2;
    let a = -ARC;
    let i = 0;
    while (a < ARC - 0.01) {
      const w = 1.45;
      const a1 = Math.min(a + w / rMid, ARC);
      const am = (a + a1) / 2;
      runs.push({
        tier: ti,
        am,
        width: (a1 - a) * rMid,
        depth,
        height: t.rise + 0.05,
        x: FOCUS.x + Math.sin(am) * rMid,
        z: FOCUS.z + Math.cos(am) * rMid,
        y: t.y - t.rise / 2 + 0.01,
        yaw: am,
      });
      a = a1;
      i++;
    }
  }
  return runs;
}

export function allSteps() {
  const crest = crestY();
  const steps = [];
  for (const f of FLIGHTS) {
    const dx = f.x1 - f.x0;
    const dz = f.z1 - f.z0;
    const dist = Math.hypot(dx, dz);
    const n = Math.max(4, Math.round((crest - f.y0) / 0.15));
    const rise = (crest - f.y0) / n;
    const run = dist / n;
    const yaw = Math.atan2(dx, dz);
    for (let i = 1; i <= n; i++) {
      const tc = (i - 0.5) / n;
      steps.push({
        side: f.id,
        i,
        n,
        x: f.x0 + dx * tc,
        z: f.z0 + dz * tc,
        y: f.y0 + rise * i,
        rise,
        run,
        yaw,
        width: f.width,
      });
    }
  }
  return steps;
}

export function pathStones() {
  const stones = [];
  PATH_POLYS.forEach((pts, pi) => {
    for (let i = 0; i < pts.length - 1; i++) {
      const [x0, z0] = pts[i];
      const [x1, z1] = pts[i + 1];
      const dist = Math.hypot(x1 - x0, z1 - z0);
      const n = Math.max(1, Math.round(dist / 0.7));
      const yaw = Math.atan2(x1 - x0, z1 - z0);
      const dirX = Math.sin(yaw);
      const dirZ = Math.cos(yaw);
      const perpX = dirZ;
      const perpZ = -dirX;
      for (let k = 0; k < n; k++) {
        const t = (k + 0.5) / n;
        const lat = ((k + pi) % 3 - 1) * 0.16;
        stones.push({
          x: x0 + (x1 - x0) * t + perpX * lat,
          z: z0 + (z1 - z0) * t + perpZ * lat,
          yaw: yaw + ((k % 2) === 0 ? 0.06 : -0.07),
          w: 0.58 + ((k + i) % 3) * 0.07,
          d: 0.46 + (k % 2) * 0.05,
          path: pi,
        });
      }
    }
  });
  return stones;
}

function prop(id, kind, x, y, z, rotationY, extra = {}) {
  return {
    id,
    kind,
    position: [round4(x), round4(y), round4(z)],
    rotationY: round4(rotationY),
    ...extra,
  };
}

function round4(n) {
  return Math.round(n * 10000) / 10000;
}

export function layoutInstances() {
  const yPad = foreY();
  const table = { x: 2.82, z: 7.32 };
  const chairA = { x: 2.82, z: 8.26 };
  const chairB = { x: 1.88, z: 7.32 };
  const bench = { x: -0.4, z: 6.42 };
  const benchYaw = yawToward(bench, FOCUS) - Math.PI / 2;
  const spL = { x: -2.55, z: -6.25 };
  const spR = { x: 1.85, z: -6.1 };
  const audience = { x: 0, z: -1.2 };
  return [
    prop("table_gather", "round_table", table.x, yPad, table.z, 0.22),
    prop("chair_a", "dining_chair", chairA.x, yPad, chairA.z, yawToward(chairA, table), { faces: "table_gather" }),
    prop("chair_b", "dining_chair", chairB.x, yPad, chairB.z, yawToward(chairB, table), { faces: "table_gather" }),
    prop("bench_wait", "museum_bench", bench.x, yPad, bench.z, benchYaw, { faces: "stage" }),
    prop("pot_pad_a", "flowerpot", 4.35, yPad, 6.55, 0.4),
    prop("pot_pad_b", "flowerpot", 4.05, yPad, 7.15, -0.6),
    prop("pot_pad_c", "flowerpot", 4.7, yPad, 7.55, 1.1),
    prop("pot_stage_l", "flowerpot", -4.7, 0.02, -5.15, 0.2),
    prop("pot_shed", "flowerpot", 6.85, 0.02, -6.55, -0.4),
    // Speaker cone is local +X, so yaw is the look yaw minus a quarter turn.
    prop("sp_l", "speaker", spL.x, STAGE.y, spL.z, yawToward(spL, audience) - Math.PI / 2, { faces: "audience" }),
    prop("sp_r", "speaker", spR.x, STAGE.y, spR.z, yawToward(spR, audience) - Math.PI / 2, { faces: "audience" }),
  ];
}
