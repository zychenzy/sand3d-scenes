/** Measurable layout for the Japanese pond garden. Pure data — no Three.js. */

export const WATER_Y = 0;

/** Irregular koi pond. Waist is the timber-bridge crossing; south lobe is the shallow viewing water. */
export const POND = [
  [0.3, -3.4],
  [1.5, -2.6],
  [2.3, -1.5],
  [1.5, -0.5],
  [2.6, 0.1],
  [2.95, 1.15],
  [2.2, 2.2],
  [0.9, 3.0],
  [-0.8, 3.2],
  [-2.3, 2.7],
  [-3.15, 1.85],
  [-2.4, 0.95],
  [-3.55, 0.4],
  [-3.9, -1.1],
  [-3.2, -2.4],
  [-1.9, -3.3],
  [-0.55, -3.55],
];

export const BRIDGE = {
  west: [-4.35, 0.48],
  east: [3.15, -0.22],
  rise: 1.18,
  width: 1.26,
  padY: 0.14,
  deckEndY: 0.22,
  plankT: 0.04,
  railH: 0.88,
};

export const BENCH = {
  x: 4.35,
  z: 1.85,
  seatH: 0.42,
  seatL: 1.42,
  seatD: 0.42,
};

export const SHELTER = {
  w: 1.9,
  d: 1.5,
  h: 2.06,
  post: 0.07,
};

export const LANTERN = {
  x: -3.55,
  z: 4.02,
  base: [0.66, 0.14, 0.66],
  stemH: 0.38,
  stemR: 0.09,
  chamber: [0.34, 0.3, 0.34],
  roofR: 0.56,
  roofH: 0.18,
  finialH: 0.12,
};

/** Closed tobi-ishi circuit: out across the south shallows and back along the bank. */
export const STONE_LOOP = [
  [-2.55, 3.65],
  [-2.15, 3.15],
  [-1.45, 2.45],
  [-0.5, 1.95],
  [0.45, 1.65],
  [1.35, 1.55],
  [2.05, 1.85],
  [2.45, 2.45],
  [2.15, 3.15],
  [1.35, 3.6],
  [0.2, 3.9],
  [-1.05, 3.95],
  [-2.05, 3.8],
  [-2.55, 3.65],
];

export const PATH_MAIN = [
  [0.35, 7.4],
  [-0.15, 5.6],
  [-1.15, 4.45],
  [-2.55, 3.75],
  [-3.7, 2.7],
  [-4.55, 1.55],
  [-4.75, 0.75],
  [-4.35, 0.48],
];

export const PATH_TEA = [
  [-0.15, 5.6],
  [1.15, 4.65],
  [2.45, 3.55],
  [3.5, 2.6],
  [4.2, 2.05],
];

export const PATH_STONES = [
  [-2.55, 3.75],
  [-2.5, 3.62],
];

export const PLANTS = [
  { id: 'maple-red', kind: 'maple', x: -4.65, z: 4.35, h: 3.7, lean: 0.18, yaw: 0.5, palette: 'red' },
  { id: 'maple-hill', kind: 'maple', x: -1.7, z: -5.15, h: 5.15, lean: -0.06, yaw: 1.1, palette: 'gold' },
  { id: 'maple-east', kind: 'maple', x: 3.85, z: -2.35, h: 2.45, lean: 0.1, yaw: 2.2, palette: 'green' },
  { id: 'pine-back', kind: 'pine', x: 1.15, z: -7.15, h: 6.3, yaw: 0.3 },
  { id: 'pine-west', kind: 'pine', x: -6.55, z: -2.05, h: 4.7, yaw: 0.9 },
  { id: 'pine-left-frame', kind: 'pine', x: -6.4, z: 6.2, h: 3.6, yaw: -0.4 },
  { id: 'pine-right-frame', kind: 'pine', x: 6.7, z: 5.6, h: 3.15, yaw: 2.4 },
  { id: 'willow', kind: 'willow', x: 5.05, z: -4.05, h: 4.5, yaw: 0.7 },
];

export const REEDS = [
  { x: -3.7, z: -0.15, n: 14, h: 1.15 },
  { x: -3.15, z: 1.45, n: 11, h: 0.95 },
  { x: -1.55, z: -2.85, n: 16, h: 1.4 },
  { x: 0.95, z: -2.55, n: 10, h: 0.85 },
  { x: 2.7, z: 0.85, n: 12, h: 1.2 },
  { x: -4.15, z: 0.95, n: 8, h: 0.7 },
];

export const IRIS = [
  { x: -2.05, z: 2.55, n: 7 },
  { x: 1.95, z: 1.85, n: 6 },
  { x: -3.45, z: -1.55, n: 5 },
];

export const MOSS = [
  { x: -3.6, z: 3.3, rx: 1.5, rz: 1.05 },
  { x: -1.8, z: -4.4, rx: 1.9, rz: 1.25 },
  { x: 0.4, z: 5.3, rx: 1.7, rz: 1.1 },
  { x: 4.6, z: 1.2, rx: 1.15, rz: 0.85 },
  { x: -5.2, z: 0.4, rx: 1.3, rz: 0.9 },
  { x: 2.4, z: -3.6, rx: 1.2, rz: 0.8 },
  { x: -4.2, z: -2.6, rx: 1.05, rz: 0.7 },
];

export const FERNS = [
  { x: -3.5, z: 2.7, n: 5 },
  { x: -2.2, z: -4.6, n: 4 },
  { x: 3.5, z: 1.15, n: 4 },
];

export const BAMBOO = [
  { x: 6.55, z: 0.15, n: 12, h: 3.9 },
  { x: -6.85, z: 1.05, n: 8, h: 3.25 },
];

export const BOULDERS = [
  { id: 'fore-left', x: -2.55, z: 5.15, radius: 0.66, flatness: 0.5, jagged: 0.85, yaw: 0.4, seed: 11 },
  { id: 'fore-right', x: 2.85, z: 4.85, radius: 0.55, flatness: 0.48, jagged: 0.8, yaw: 1.2, seed: 12 },
  { id: 'island', x: -0.9, z: -1.72, radius: 0.78, flatness: 0.66, jagged: 0.7, yaw: 0.8, seed: 13 },
  { id: 'island-small', x: -0.25, z: -1.95, radius: 0.32, flatness: 0.55, jagged: 0.55, yaw: 2.1, seed: 14 },
  { id: 'west-shoulder', x: -5.15, z: 2.35, radius: 0.7, flatness: 0.66, jagged: 0.4, yaw: 0.2, seed: 15 },
];

export const KOI = [
  { x: 0.15, z: 1.2, yaw: 0.7, len: 0.66, kind: 'kohaku' },
  { x: -1.25, z: 1.2, yaw: 2.15, len: 0.52, kind: 'orange' },
  { x: 1.45, z: 1.05, yaw: -0.45, len: 0.58, kind: 'showa' },
  { x: -0.15, z: 1.75, yaw: 1.25, len: 0.4, kind: 'white' },
  { x: 0.75, z: 1.6, yaw: 2.7, len: 0.46, kind: 'kohaku' },
];

export const LILIES = [
  { x: -1.6, z: 1.45, n: 5, spread: 0.7 },
  { x: 0.85, z: -2.15, n: 4, spread: 0.55 },
];

export function lanternHeight() {
  const L = LANTERN;
  return L.base[1] + L.stemH + L.chamber[1] + L.roofH + L.finialH;
}

export function clamp(v, a, b) {
  return Math.max(a, Math.min(b, v));
}

export function lerp(a, b, t) {
  return a + (b - a) * t;
}

export function smoothstep(e0, e1, x) {
  const t = clamp((x - e0) / (e1 - e0 || 1), 0, 1);
  return t * t * (3 - 2 * t);
}

export function mulberry32(a) {
  let t = a >>> 0;
  return function rand() {
    t = (t + 0x6d2b79f5) >>> 0;
    let x = t;
    x = Math.imul(x ^ (x >>> 15), x | 1);
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

export function shoelace(poly = POND) {
  let a = 0;
  for (let i = 0; i < poly.length; i++) {
    const [x1, z1] = poly[i];
    const [x2, z2] = poly[(i + 1) % poly.length];
    a += x1 * z2 - x2 * z1;
  }
  return a / 2;
}

export function pondBBox(poly = POND) {
  let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
  for (const [x, z] of poly) {
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
    minZ = Math.min(minZ, z);
    maxZ = Math.max(maxZ, z);
  }
  return { minX, maxX, minZ, maxZ, width: maxX - minX, depth: maxZ - minZ };
}

export function distToSeg(x, z, ax, az, bx, bz) {
  const dx = bx - ax;
  const dz = bz - az;
  const l2 = dx * dx + dz * dz || 1e-8;
  let t = ((x - ax) * dx + (z - az) * dz) / l2;
  t = clamp(t, 0, 1);
  const px = ax + dx * t;
  const pz = az + dz * t;
  return Math.hypot(x - px, z - pz);
}

/** Signed distance, negative inside. */
export function pondSDF(x, z, poly = POND) {
  let minD = Infinity;
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i][0];
    const zi = poly[i][1];
    const xj = poly[j][0];
    const zj = poly[j][1];
    const intersect = zi > z !== zj > z && x < ((xj - xi) * (z - zi)) / (zj - zi || 1e-12) + xi;
    if (intersect) inside = !inside;
    minD = Math.min(minD, distToSeg(x, z, xi, zi, xj, zj));
  }
  return inside ? -minD : minD;
}

export function pondDepth(x, z) {
  const sdf = pondSDF(x, z);
  if (sdf >= 0) return 0;
  const d = -sdf;
  const south = clamp((z + 0.15) / 2.3, 0, 1);
  const maxD = lerp(0.55, 0.18, south);
  const shelf = 1 - Math.exp(-d * 1.25);
  return maxD * shelf;
}

export function pondCentroid(poly = POND) {
  let x = 0;
  let z = 0;
  let a = 0;
  for (let i = 0; i < poly.length; i++) {
    const [x1, z1] = poly[i];
    const [x2, z2] = poly[(i + 1) % poly.length];
    const cr = x1 * z2 - x2 * z1;
    a += cr;
    x += (x1 + x2) * cr;
    z += (z1 + z2) * cr;
  }
  a *= 0.5;
  return { x: x / (6 * a), z: z / (6 * a) };
}

function gauss(x, z, cx, cz, sx, sz) {
  const dx = (x - cx) / sx;
  const dz = (z - cz) / sz;
  return Math.exp(-(dx * dx + dz * dz) * 1.35);
}

export function bridgeSpan() {
  const dx = BRIDGE.east[0] - BRIDGE.west[0];
  const dz = BRIDGE.east[1] - BRIDGE.west[1];
  return Math.hypot(dx, dz);
}

export function bridgeAxis() {
  const dx = BRIDGE.east[0] - BRIDGE.west[0];
  const dz = BRIDGE.east[1] - BRIDGE.west[1];
  const s = Math.hypot(dx, dz) || 1;
  return { x: dx / s, z: dz / s };
}

/** Plank center along the arch. t=0 west, t=1 east. */
export function bridgePoint(t) {
  const ax = BRIDGE.west[0];
  const az = BRIDGE.west[1];
  const bx = BRIDGE.east[0];
  const bz = BRIDGE.east[1];
  const arch = Math.sin(Math.PI * t) * BRIDGE.rise;
  const y = BRIDGE.deckEndY + arch;
  return {
    x: ax + (bx - ax) * t,
    z: az + (bz - az) * t,
    y,
    top: y + BRIDGE.plankT / 2,
  };
}

export function bridgeMid() {
  return bridgePoint(0.5);
}

export function pileSpec() {
  const m = bridgePoint(0.5);
  return {
    x: m.x,
    z: m.z,
    top: m.y - BRIDGE.plankT / 2 - 0.1,
    bottom: -0.32,
  };
}

function onAbutmentPad(x, z) {
  for (const [px, pz] of [BRIDGE.west, BRIDGE.east]) {
    if (Math.hypot(x - px, z - pz) < 0.62) return true;
  }
  return false;
}

export function terrainHeight(x, z) {
  const sdf = pondSDF(x, z);
  let h = 0.16;
  h += 0.09 * Math.sin(x * 0.31 + 0.4) * Math.cos(z * 0.26);
  h += 0.05 * Math.sin(x * 0.85 + z * 0.45);
  h += 1.2 * gauss(x, z, 0.4, -7.4, 6.8, 4.0);
  h += 0.58 * gauss(x, z, -5.6, -0.8, 3.3, 2.5);
  h += 0.4 * gauss(x, z, 5.4, -3.6, 3.5, 2.5);
  h += 0.1 * gauss(x, z, 4.3, 1.8, 2.5, 2.0);
  h += 0.2 * gauss(x, z, 0.1, 6.2, 3.8, 2.3);
  h += 0.28 * gauss(x, z, -6.6, 5.4, 2.8, 2.2);
  h += 0.16 * gauss(x, z, 6.6, 4.6, 2.6, 2.0);

  if (!onAbutmentPad(x, z) && sdf < 0.72) {
    if (sdf < 0) {
      h = WATER_Y - pondDepth(x, z);
    } else {
      const lip = WATER_Y + 0.02;
      const u = smoothstep(0, 0.72, sdf);
      const bank = Math.max(h, WATER_Y + 0.08);
      h = lerp(lip, bank, u);
    }
  }

  let padBlend = 0;
  let padH = h;
  for (const [px, pz] of [BRIDGE.west, BRIDGE.east]) {
    const d = Math.hypot(x - px, z - pz);
    if (d < 1.15) {
      const u = smoothstep(0.62, 1.15, d);
      const influence = 1 - u;
      if (influence > padBlend) {
        padBlend = influence;
        padH = lerp(BRIDGE.padY, h, u);
      }
    }
  }
  if (padBlend > 0) h = padH;
  return h;
}

export function lineFrame(points) {
  const edges = [];
  let total = 0;
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i];
    const b = points[i + 1];
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    edges.push({ a, b, len, start: total });
    total += len;
  }
  return { edges, total };
}

export function polygonFrame(poly = POND) {
  return lineFrame([...poly, poly[0]]);
}

export function pointAt(frame, dist) {
  const d = ((dist % frame.total) + frame.total) % frame.total;
  for (const e of frame.edges) {
    if (d <= e.start + e.len || e === frame.edges[frame.edges.length - 1]) {
      const t = e.len < 1e-6 ? 0 : clamp((d - e.start) / e.len, 0, 1);
      return {
        x: e.a[0] + (e.b[0] - e.a[0]) * t,
        z: e.a[1] + (e.b[1] - e.a[1]) * t,
      };
    }
  }
  const e = frame.edges[0];
  return { x: e.a[0], z: e.a[1] };
}

export function tangentAt(frame, dist) {
  const d = ((dist % frame.total) + frame.total) % frame.total;
  for (const e of frame.edges) {
    if (d <= e.start + e.len || e === frame.edges[frame.edges.length - 1]) {
      const len = e.len || 1;
      return { x: (e.b[0] - e.a[0]) / len, z: (e.b[1] - e.a[1]) / len };
    }
  }
  return { x: 1, z: 0 };
}

/** Outward normal for a CCW ring. Falls back if the ring is clockwise. */
export function outwardNormal(frame, dist) {
  const t = tangentAt(frame, dist);
  const ccw = shoelace() > 0;
  return ccw ? { x: t.z, z: -t.x } : { x: -t.z, z: t.x };
}

export function steppingStones() {
  const frame = lineFrame(STONE_LOOP);
  const spacing = 1.02;
  const n = Math.max(10, Math.round(frame.total / spacing));
  const step = frame.total / n;
  const stones = [];
  for (let i = 0; i < n; i++) {
    const d = i * step;
    const p = pointAt(frame, d);
    const tang = tangentAt(frame, d);
    const rng = mulberry32(1200 + i * 19);
    const lat = rng() * 0.14 - 0.07;
    const x = p.x + -tang.z * lat;
    const z = p.z + tang.x * lat;
    const rx = 0.3 + rng() * 0.12;
    const rz = 0.26 + rng() * 0.11;
    const thickness = 0.12 + rng() * 0.05;
    const expose = 0.09 + rng() * 0.08;
    const yaw = Math.atan2(tang.x, tang.z) + (rng() - 0.5) * 0.5;
    stones.push({ i, x, z, rx, rz, thickness, expose, yaw, seed: 2200 + i * 13 });
  }
  return stones;
}

export function stonePlacement(s) {
  const sdf = pondSDF(s.x, s.z);
  if (sdf < -0.02) {
    const y = -0.015 - (s.i % 3) * 0.008;
    return { y, top: y + s.thickness, inWater: true };
  }
  const ground = terrainHeight(s.x, s.z);
  const y = ground - s.thickness * 0.32;
  return { y, top: y + s.thickness, inWater: false };
}

export function shoreRocks() {
  const frame = polygonFrame(POND);
  const rocks = [];
  const rng = mulberry32(42);
  let d = 0.5;
  while (d < frame.total - 0.3) {
    const p = pointAt(frame, d);
    const nrm = outwardNormal(frame, d);
    const tang = tangentAt(frame, d);
    const nearBridge = [BRIDGE.west, BRIDGE.east].some(([ax, az]) => Math.hypot(p.x - ax, p.z - az) < 1.45);
    const beach = p.z > 1.35;
    if (nearBridge || beach) {
      d += 0.7;
      continue;
    }
    const count = 2 + Math.floor(rng() * 3);
    for (let k = 0; k < count; k++) {
      const along = (rng() - 0.5) * 0.85;
      const inward = rng() < 0.3;
      const out = inward ? -rng() * 0.32 : 0.02 + rng() * 0.58;
      const x = p.x + nrm.x * out + tang.x * along;
      const z = p.z + nrm.z * out + tang.z * along;
      if (Math.hypot(x - LANTERN.x, z - LANTERN.z) < 1.05) continue;
      const radius = (k === 0 ? 0.32 : 0.16) + rng() * 0.26;
      rocks.push({
        x,
        z,
        radius,
        flatness: 0.5 + rng() * 0.38,
        jagged: 0.32 + rng() * 0.6,
        yaw: rng() * Math.PI * 2,
        seed: Math.floor(rng() * 1e9),
        inWater: pondSDF(x, z) < 0,
      });
    }
    d += 1.65 + rng() * 1.45;
  }
  return rocks;
}

export function abutmentRocks() {
  const axis = bridgeAxis();
  const lat = { x: -axis.z, z: axis.x };
  const out = [];
  const ends = [
    ['west', BRIDGE.west, -1],
    ['east', BRIDGE.east, 1],
  ];
  for (const [name, pt, sign] of ends) {
    const rng = mulberry32(name === 'west' ? 17 : 29);
    for (let k = 0; k < 8; k++) {
      const side = k % 2 === 0 ? -1 : 1;
      const along = 0.15 + rng() * 0.55;
      const lateral = (0.78 + rng() * 0.38) * side;
      const x = pt[0] - axis.x * along * sign + lat.x * lateral;
      const z = pt[1] - axis.z * along * sign + lat.z * lateral;
      if (Math.hypot(x - LANTERN.x, z - LANTERN.z) < 1.05) continue;
      out.push({
        role: name,
        x,
        z,
        radius: 0.26 + rng() * 0.28,
        flatness: 0.48 + rng() * 0.3,
        jagged: 0.4 + rng() * 0.45,
        yaw: rng() * Math.PI * 2,
        seed: 400 + k + (name === 'west' ? 0 : 40),
      });
    }
  }
  return out;
}

export function pebbles() {
  const rng = mulberry32(99);
  const out = [];
  for (let i = 0; i < 160 && out.length < 28; i++) {
    const x = -2.2 + rng() * 4.4;
    const z = -0.1 + rng() * 2.5;
    const depth = pondDepth(x, z);
    if (depth < 0.07 || depth > 0.26) continue;
    const onStone = steppingStones().some((s) => Math.hypot(s.x - x, s.z - z) < s.rx + 0.12);
    if (onStone) continue;
    out.push({ x, z, r: 0.05 + rng() * 0.08, seed: 5000 + i });
  }
  return out;
}

export function pathSamples(points, step = 0.28) {
  const samples = [];
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i];
    const b = points[i + 1];
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const n = Math.max(1, Math.ceil(len / step));
    for (let k = 0; k < n; k++) {
      const t = k / n;
      samples.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
    }
  }
  samples.push(points[points.length - 1]);
  return samples;
}

/** rotation.y that aims a local -Z forward axis at a world XZ target. */
export function yawToFace(fromX, fromZ, toX, toZ) {
  return Math.atan2(-(toX - fromX), -(toZ - fromZ));
}

export function forwardXZ(yaw) {
  return [-Math.sin(yaw), -Math.cos(yaw)];
}

export function benchYaw() {
  const m = bridgeMid();
  return yawToFace(BENCH.x, BENCH.z, m.x, m.z);
}

export function minDistToPolyline(x, z, points) {
  let best = Infinity;
  for (let i = 0; i < points.length - 1; i++) {
    best = Math.min(best, distToSeg(x, z, points[i][0], points[i][1], points[i + 1][0], points[i + 1][1]));
  }
  return best;
}
