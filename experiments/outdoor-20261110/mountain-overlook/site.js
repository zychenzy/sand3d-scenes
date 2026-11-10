/**
 * Authored site for the mountain overlook.
 * Pure data and math (no THREE) so layout tests can run in node.
 * Units are metres. +Y up, view and layered peaks are -Z, sunrise is +X.
 */

export const VIEW = { x: 0, z: -1 };

export const DECK = {
  cx: 0.15,
  y: 6.05,
  zRoot: 0.42,
  zTip: -8.15,
  widthRoot: 2.62,
  widthTip: 3.55,
  railH: 0.98,
};

export const OUTCROP = {
  x: -6.05,
  z: 7.72,
  radius: 1.58,
  sink: 0.55,
};

export const SHELTER = {
  x: 6.72,
  z: 3.72,
  rotationY: 0.66,
  halfW: 1.38,
  halfD: 1.08,
  padY: 5.42,
  openLocal: { x: 0, z: -1 },
};

export const BENCH = {
  id: 'view_bench',
  position: [0.15, 6.05, -4.5],
  rotationY: Math.PI / 2,
  scale: [1.28, 1, 1],
  /** Seat depth axis. At rotationY = π/2 this maps to world -Z. */
  localFacing: { x: 1, z: 0 },
  halfLength: 0.76,
};

export const CAMERAS = {
  default: {
    fov: 48,
    near: 0.12,
    far: 480,
    position: [3.4, 11.2, 18.2],
    target: [0.15, 5.7, -3.4],
  },
  corner: {
    position: [-6.4, 7.1, -12.2],
    target: [0.4, 6.15, -2.2],
  },
  close: {
    position: [0.28, 7.28, -0.85],
    target: [0.12, 6.42, -8.6],
  },
};

export const PATH_KEYS = [
  { id: 'trailhead', x: 6.55, z: 15.45, y: 0.4, width: 1.75, landing: true },
  { id: 's1', x: 4.95, z: 13.35, y: 0.82, width: 1.2 },
  { id: 's2', x: 2.75, z: 11.75, y: 1.26, width: 1.2 },
  { id: 'land-a', x: 0.45, z: 11.05, y: 1.55, width: 2.15, landing: true },
  { id: 'land-a2', x: -0.65, z: 10.5, y: 1.58, width: 2.15, landing: true },
  { id: 's3', x: -2.05, z: 9.15, y: 2.2, width: 1.2 },
  { id: 's4', x: -3.3, z: 7.8, y: 2.95, width: 1.22 },
  { id: 'land-b', x: -2.35, z: 6.5, y: 3.1, width: 2.2, landing: true },
  { id: 'land-b2', x: -0.85, z: 6.12, y: 3.16, width: 2.05, landing: true },
  { id: 's5', x: 1.15, z: 5.5, y: 3.85, width: 1.2 },
  { id: 's6', x: 2.95, z: 4.5, y: 4.55, width: 1.2 },
  { id: 'land-c', x: 3.15, z: 3.4, y: 4.78, width: 2.05, landing: true },
  { id: 's7', x: 1.8, z: 2.4, y: 5.4, width: 1.25 },
  { id: 'saddle', x: 0.45, z: 1.45, y: 6.05, width: 1.9, landing: true },
  { id: 'threshold', x: 0.15, z: 0.42, y: 6.05, width: 2.35, landing: true },
];

export const SPUR_KEYS = [
  { id: 'spur-saddle', x: 0.45, z: 1.45, y: 6.05, width: 1.5, landing: true },
  { id: 'spur-mid', x: 2.85, z: 1.92, y: 5.74, width: 1.15 },
  { id: 'spur-front', x: 5.42, z: 2.12, y: 5.42, width: 1.6, landing: true },
];

export const PINES = [
  { x: 3.15, z: 15.15, h: 6.5, seed: 101, kind: 'pine' },
  { x: 9.05, z: 14.55, h: 7.5, seed: 102, kind: 'pine' },
  { x: 10.35, z: 12.05, h: 4.3, seed: 103, kind: 'pine' },
  { x: -0.95, z: 14.7, h: 5.5, seed: 104, kind: 'pine' },
  { x: -4.7, z: 13.35, h: 6.8, seed: 105, kind: 'pine' },
  { x: -8.7, z: 11.15, h: 3.9, seed: 106, kind: 'krumm' },
  { x: -8.15, z: 8.85, h: 2.35, seed: 107, kind: 'krumm' },
  { x: -9.1, z: 6.15, h: 5.6, seed: 108, kind: 'snag' },
  { x: 9.55, z: 8.55, h: 5.15, seed: 109, kind: 'pine' },
  { x: 8.85, z: 5.85, h: 3.35, seed: 110, kind: 'pine' },
  { x: -3.95, z: 4.35, h: 4.65, seed: 111, kind: 'pine' },
  { x: -5.55, z: 3.35, h: 2.55, seed: 112, kind: 'krumm' },
  { x: 10.55, z: 3.85, h: 6.15, seed: 113, kind: 'pine' },
  { x: 4.55, z: 8.95, h: 3.85, seed: 114, kind: 'pine' },
];

export const BOULDERS = [
  { x: -2.35, z: 14.95, sx: 0.72, sy: 0.42, sz: 0.58, rot: 0.4 },
  { x: 10.4, z: 15.35, sx: 0.95, sy: 0.48, sz: 0.7, rot: 1.2 },
  { x: -9.4, z: 4.55, sx: 1.05, sy: 0.55, sz: 0.82, rot: 0.25 },
  { x: 7.55, z: 10.15, sx: 0.48, sy: 0.32, sz: 0.42, rot: 2.1 },
  { x: -4.55, z: 2.55, sx: 0.62, sy: 0.36, sz: 0.5, rot: 0.7 },
];

export const LOGS = [
  { x: -6.4, z: 12.55, rot: 0.55, len: 2.15, r: 0.15 },
  { x: 7.85, z: 7.15, rot: 1.35, len: 1.55, r: 0.11 },
];

export const FIRE = { x: 6.95, z: 1.72, radius: 0.38 };

export const CLIFF_ROCKS = [
  { x: 3.7, z: -1.2, s: 1.05, seed: 1 },
  { x: -3.9, z: -1.45, s: 1.35, seed: 2 },
  { x: 5.35, z: -0.7, s: 0.8, seed: 3 },
  { x: -5.55, z: -0.85, s: 1.0, seed: 4 },
  { x: 1.15, z: -2.55, s: 1.1, seed: 5 },
];

export const RANGES = [
  {
    name: 'foothill',
    z: -21,
    x0: -44,
    x1: 38,
    foot: 7.5,
    depth: 3.6,
    footY: -2.4,
    base: 1.4,
    jag: 0.62,
    jagAmp: 0.48,
    phase: 0.3,
    lit: '#c48b6e',
    shade: '#5c534c',
    snow: '#f3efe8',
    snowLine: 11.5,
    peaks: [
      { x: -24, h: 8.8, w: 7.2 },
      { x: -9.5, h: 12.6, w: 4.6 },
      { x: 0.4, h: 5.4, w: 3.4 },
      { x: 13.5, h: 11.2, w: 6.2 },
      { x: 28, h: 7.6, w: 6.4 },
    ],
  },
  {
    name: 'divide',
    z: -39,
    x0: -48,
    x1: 44,
    foot: 9,
    depth: 4.5,
    footY: -3.2,
    base: 2.2,
    jag: 0.38,
    jagAmp: 0.36,
    phase: 1.1,
    lit: '#b7c0cc',
    shade: '#6d7684',
    snow: '#f7f5f2',
    snowLine: 12,
    peaks: [
      { x: -18, h: 11.5, w: 8.5 },
      { x: 0.2, h: 17.5, w: 6.2 },
      { x: 20, h: 13.4, w: 9 },
    ],
  },
  {
    name: 'horizon',
    z: -60,
    x0: -56,
    x1: 52,
    foot: 10,
    depth: 5,
    footY: -4,
    base: 3.4,
    jag: 0.22,
    jagAmp: 0.22,
    phase: 0.6,
    lit: '#d5dee8',
    shade: '#9aa6b4',
    snow: '#f5f8fb',
    snowLine: 9,
    peaks: [
      { x: -12, h: 10.5, w: 16 },
      { x: 14, h: 8.8, w: 18 },
    ],
  },
];

export function clamp(v, a, b) {
  return Math.max(a, Math.min(b, v));
}

export function lerp(a, b, t) {
  return a + (b - a) * t;
}

export function smoothstep(edge0, edge1, x) {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

export function hash(x, z) {
  const n = Math.sin(x * 127.1 + z * 311.7) * 43758.5453;
  return n - Math.floor(n);
}

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function rand() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Three.js Y rotation: local (x,z) -> world. */
export function rotateY(x, z, rot) {
  const c = Math.cos(rot);
  const s = Math.sin(rot);
  return { x: x * c + z * s, z: -x * s + z * c };
}

export function deckWidthAt(z) {
  const t = clamp((DECK.zRoot - z) / (DECK.zRoot - DECK.zTip), 0, 1);
  return lerp(DECK.widthRoot, DECK.widthTip, t);
}

export function inDeck(px, pz, pad = 0) {
  if (pz > DECK.zRoot + pad || pz < DECK.zTip - pad) return false;
  return Math.abs(px - DECK.cx) <= deckWidthAt(pz) / 2 + pad;
}

export function inShelter(px, pz, pad = 0) {
  const dx = px - SHELTER.x;
  const dz = pz - SHELTER.z;
  const local = rotateY(dx, dz, -SHELTER.rotationY);
  return Math.abs(local.x) <= SHELTER.halfW + pad && Math.abs(local.z) <= SHELTER.halfD + pad;
}

export function shelterOpenDir() {
  return rotateY(SHELTER.openLocal.x, SHELTER.openLocal.z, SHELTER.rotationY);
}

export function shelterOpening() {
  const p = rotateY(0, -SHELTER.halfD, SHELTER.rotationY);
  return { x: SHELTER.x + p.x, z: SHELTER.z + p.z, y: SHELTER.padY };
}

export function benchFacing() {
  return rotateY(BENCH.localFacing.x, BENCH.localFacing.z, BENCH.rotationY);
}

export function rawHill(x, z) {
  let h = 0.18 + (15.6 - z) * 0.335;
  h += Math.max(0, -x - 1) * 0.07;
  h -= Math.max(0, x - 5) * 0.028;
  h += Math.sin(x * 0.31 + 0.6) * 0.18;
  h += Math.cos(z * 0.23 + x * 0.11) * 0.12;
  const spur = Math.exp(-((x + 9.5) ** 2) / 26 - ((z - 6.5) ** 2) / 36);
  h += spur * 1.55;
  const saddle = Math.exp(-((x - 0.8) ** 2) / 30 - ((z - 1.7) ** 2) / 13);
  h += saddle * 1.25;
  const dx = x - OUTCROP.x;
  const dz = z - OUTCROP.z;
  h += Math.exp(-(dx * dx + dz * dz) / 4.2) * 0.7;
  return Math.max(0.06, h);
}

function nearestOn(keys, x, z) {
  let best = null;
  for (let i = 0; i < keys.length - 1; i++) {
    const a = keys[i];
    const b = keys[i + 1];
    const dx = b.x - a.x;
    const dz = b.z - a.z;
    const len2 = dx * dx + dz * dz || 1e-8;
    const t = clamp(((x - a.x) * dx + (z - a.z) * dz) / len2, 0, 1);
    const px = a.x + dx * t;
    const pz = a.z + dz * t;
    const dist = Math.hypot(x - px, z - pz);
    if (!best || dist < best.dist) {
      best = {
        dist,
        x: px,
        y: a.y + (b.y - a.y) * t,
        z: pz,
        width: lerp(a.width, b.width, t),
        half: lerp(a.width, b.width, t) / 2,
        segment: i,
        which: keys,
      };
    }
  }
  return best;
}

export function nearestPath(x, z) {
  const main = nearestOn(PATH_KEYS, x, z);
  const spur = nearestOn(SPUR_KEYS, x, z);
  return main.dist <= spur.dist ? main : spur;
}

function applyCliff(x, z, h) {
  const t = smoothstep(0.18, -2.8, z);
  if (t <= 0) return h;
  const lateral = smoothstep(-9.5, -3.5, x) * (1 - smoothstep(6.2, 12, x));
  const amount = t * Math.max(lateral, 0.42);
  const drop = -2.2 - Math.max(0, -z) * 0.22;
  let y = lerp(h, Math.min(h, drop), amount);
  if (t > 0.15 && t < 0.92) {
    const ledge = Math.sin(z * 1.55 + x * 0.18);
    y += Math.max(0, ledge) * 0.55;
  }
  return y;
}

function applyTerrace(x, z, h) {
  const d = Math.hypot(x - SHELTER.x, z - SHELTER.z);
  if (d > 2.35) return h;
  const t = smoothstep(2.35, 0.95, d);
  return lerp(h, SHELTER.padY, t * 0.9);
}

function applyOverlook(x, z, h) {
  if (z < 0.36 || z > 1.9) return h;
  if (Math.abs(x - DECK.cx) > 2.35) return h;
  return lerp(h, DECK.y - 0.03, 0.94);
}

function applyPathCut(x, z, h) {
  if (z < -0.05) return h;
  const n = nearestPath(x, z);
  const reach = n.half + 1.12;
  if (n.dist > reach) return h;
  const shelf = n.half + 0.05;
  const carved = n.y - 0.02;
  if (n.dist <= shelf) return carved;
  const u = smoothstep(shelf, reach, n.dist);
  return lerp(carved, h, u);
}

export function heightAt(x, z) {
  let h = rawHill(x, z);
  h = applyCliff(x, z, h);
  h = applyTerrace(x, z, h);
  h = applyOverlook(x, z, h);
  h = applyPathCut(x, z, h);
  return h;
}

export function slopeAt(x, z) {
  const e = 0.35;
  const dx = heightAt(x + e, z) - heightAt(x - e, z);
  const dz = heightAt(x, z + e) - heightAt(x, z - e);
  return Math.hypot(dx, dz) / (2 * e);
}

export function downhill(x, z) {
  const e = 0.45;
  const dx = rawHill(x + e, z) - rawHill(x - e, z);
  const dz = rawHill(x, z + e) - rawHill(x, z - e);
  const len = Math.hypot(dx, dz) || 1;
  return { x: -dx / len, z: -dz / len };
}

export function pathSamples() {
  const out = [];
  const keys = PATH_KEYS;
  for (let i = 0; i < keys.length - 1; i++) {
    const a = keys[i];
    const b = keys[i + 1];
    const dx = b.x - a.x;
    const dz = b.z - a.z;
    const dy = b.y - a.y;
    const run = Math.hypot(dx, dz) || 1e-6;
    const steps = Math.max(1, Math.round(run / 0.38));
    const flat = !!(a.landing && b.landing) && Math.abs(dy) / run < 0.12;
    for (let s = 0; s < steps; s++) {
      const t = s / steps;
      const rise = dy / steps;
      out.push({
        x: a.x + dx * t,
        y: a.y + dy * t,
        z: a.z + dz * t,
        dx: dx / run,
        dz: dz / run,
        width: lerp(a.width, b.width, t),
        rise,
        run,
        segment: i,
        flat,
        landing: flat,
      });
    }
  }
  return out;
}

export function stepStones() {
  const stones = [];
  const samples = pathSamples();
  for (let i = 0; i < samples.length; i++) {
    const s = samples[i];
    if (s.flat) continue;
    const prevY = i === 0 ? s.y : samples[i - 1].y;
    const rise = Math.max(0, s.y - prevY);
    const thick = clamp(Math.max(0.1, rise + 0.07), 0.1, 0.22);
    const jitter = (hash(i + 2.2, s.segment + 0.3) - 0.5) * 0.05;
    const sideX = -s.dz;
    const sideZ = s.dx;
    stones.push({
      x: s.x + sideX * jitter,
      z: s.z + sideZ * jitter,
      y: s.y,
      w: s.width * (0.92 + hash(i, 4) * 0.06),
      d: 0.42 + hash(i, 8) * 0.06,
      h: thick,
      rot: Math.atan2(s.dx, s.dz),
      rise,
      kind: rise > 0.075 ? 'step' : 'paver',
    });
  }
  return stones;
}

export function landingPads() {
  const pads = [];
  for (const key of PATH_KEYS) {
    if (!key.landing) continue;
    if (key.id === 'threshold' || key.id === 'saddle') continue;
    const n = key.width > 2 ? 5 : 3;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + key.x * 0.2;
      const rad = i === 0 ? 0 : Math.min(0.42, key.width * 0.18);
      pads.push({
        x: key.x + Math.cos(a) * rad,
        z: key.z + Math.sin(a) * rad * 0.85,
        y: key.y,
        w: 0.58 + (i % 3) * 0.14,
        d: 0.5 + (i % 2) * 0.12,
        h: 0.12,
        rot: a * 0.35,
      });
    }
  }
  return pads;
}

export function apronSlabs() {
  return [
    { x: -0.55, z: 1.2, w: 1.2, d: 0.72, y: DECK.y, h: 0.14, rot: 0.04 },
    { x: 0.72, z: 1.08, w: 1.25, d: 0.78, y: DECK.y, h: 0.14, rot: -0.06 },
    { x: 0.05, z: 0.64, w: 1.45, d: 0.58, y: DECK.y, h: 0.12, rot: 0.02 },
    { x: -0.9, z: 0.68, w: 0.72, d: 0.5, y: DECK.y, h: 0.12, rot: 0.18 },
    { x: 1.02, z: 0.6, w: 0.68, d: 0.48, y: DECK.y, h: 0.12, rot: -0.14 },
  ];
}

export function retainers() {
  const out = [];
  const samples = pathSamples().filter((_, i) => i % 2 === 0);
  samples.forEach((s, i) => {
    if (s.z < 1.15) return;
    const g = downhill(s.x, s.z);
    const px = s.x + g.x * (s.width * 0.5 + 0.2);
    const pz = s.z + g.z * (s.width * 0.5 + 0.2);
    const gy = heightAt(px, pz);
    const gap = s.y - gy;
    if (gap < 0.24) return;
    const courses = Math.min(3, Math.ceil(gap / 0.26));
    for (let c = 0; c < courses; c++) {
      out.push({
        x: px + g.x * c * 0.08,
        z: pz + g.z * c * 0.08,
        y: gy + (c + 1) * Math.min(0.28, gap / courses),
        w: 0.46 + hash(i, c + 1) * 0.14,
        h: Math.min(0.28, gap / courses),
        d: 0.3,
        rot: Math.atan2(g.x, g.z) + (hash(c, i) - 0.5) * 0.15,
      });
    }
  });
  return out;
}

export function handrails() {
  const posts = [];
  const samples = pathSamples();
  for (let i = 0; i < samples.length; i += 3) {
    const s = samples[i];
    if (s.z < 1.25 || s.z > 5.6 || s.flat) continue;
    const g = downhill(s.x, s.z);
    const px = s.x + g.x * (s.width * 0.5 + 0.02);
    const pz = s.z + g.z * (s.width * 0.5 + 0.02);
    const gy = heightAt(px, pz);
    if (s.y - gy < 0.48) continue;
    posts.push({ x: px, z: pz, y: s.y, rot: Math.atan2(s.dx, s.dz) });
  }
  return posts;
}

function plantable(x, z) {
  if (z < 0.35 || z > 17.1 || x < -13.5 || x > 13.2) return false;
  if (inDeck(x, z, 0.3)) return false;
  if (Math.abs(x - DECK.cx) < 2.25 && z > 0.25 && z < 1.95) return false;
  if (inShelter(x, z, 0.45)) return false;
  if (Math.hypot(x - SHELTER.x, z - SHELTER.z) < 1.85) return false;
  if (Math.hypot(x - OUTCROP.x, z - OUTCROP.z) < OUTCROP.radius + 0.15) return false;
  const n = nearestPath(x, z);
  if (n && n.dist < n.half + 0.4) return false;
  if (slopeAt(x, z) > 0.92) return false;
  return true;
}

export function grassClumps() {
  const rng = mulberry32(20261110);
  const out = [];
  let guard = 0;
  while (out.length < 72 && guard < 7000) {
    guard += 1;
    const x = -13 + rng() * 26;
    const z = 0.4 + rng() * 16.4;
    if (!plantable(x, z)) continue;
    const type = out.length % 5 === 0 ? 'heather' : 'grass';
    out.push({
      x,
      z,
      s: type === 'heather' ? 0.85 + rng() * 0.7 : 0.7 + rng() * 0.85,
      seed: 3000 + out.length * 19 + Math.floor(rng() * 800),
      type,
    });
  }
  return out;
}

export function pineRecipe(spec) {
  const rng = mulberry32(spec.seed);
  const kind = spec.kind;
  const h = spec.h;
  const leanA = (rng() - 0.5) * 1.05;
  const lean = kind === 'krumm' ? 0.5 + rng() * 0.35 : 0.1 + rng() * 0.22;
  const segs = [];
  let x = 0;
  let z = 0;
  let y = 0;
  const nSeg = kind === 'krumm' ? 3 : 5;
  const trunkH = kind === 'krumm' ? h * 0.4 : kind === 'snag' ? h * 0.82 : h * 0.68;
  for (let i = 0; i < nSeg; i++) {
    const segH = (trunkH / nSeg) * (0.86 + rng() * 0.28);
    const nx = x + Math.cos(leanA) * lean * segH;
    const nz = z + Math.sin(leanA) * lean * segH;
    const r0 = Math.max(0.04, (0.05 + (h / 7) * 0.055) * (1.08 - i / nSeg));
    const taper = kind === 'snag' && i === nSeg - 1 ? 0.42 : 0.84;
    segs.push({ x, y, z, nx, y1: y + segH, nz, r0, r1: Math.max(0.025, r0 * taper) });
    x = nx;
    z = nz;
    y += segH;
  }
  const branches = [];
  if (kind === 'snag') {
    const nb = 4 + Math.floor(rng() * 2);
    for (let i = 0; i < nb; i++) {
      branches.push({
        ang: rng() * Math.PI * 2,
        up: 0.15 + rng() * 0.7,
        len: 0.35 + rng() * 0.85,
        y: trunkH * (0.35 + rng() * 0.5),
        tufts: [],
      });
    }
    return { segs, branches, kind };
  }
  const whorls = kind === 'krumm' ? 3 : 3;
  const gap = rng() * Math.PI * 2;
  for (let w = 0; w < whorls; w++) {
    const t = 0.28 + (w / whorls) * 0.62;
    const baseY = trunkH * (kind === 'krumm' ? 0.32 + w * 0.3 : 0.32 + (w / Math.max(1, whorls - 1)) * 0.6);
    const n = kind === 'krumm' ? 3 : w === 1 ? 3 : 2;
    for (let b = 0; b < n; b++) {
      if (rng() < 0.05) continue;
      const ang = gap + b * (1.25 + rng() * 0.6) + w * 0.45;
      const up = kind === 'krumm' ? 0.02 + rng() * 0.14 : 0.12 + rng() * 0.48;
      const len = (kind === 'krumm' ? h * 0.9 : h * 0.36) * (1.1 - t) * (0.55 + rng() * 0.85);
      const tufts = [];
      const nt = 2;
      for (let f = 0; f < nt; f++) {
        tufts.push({
          t: 0.48 + f * 0.28,
          s: (kind === 'krumm' ? 0.58 : 0.32) * (h / 5.5) * (0.8 + rng() * 0.45),
          sx: 0.85 + rng() * 0.85,
          sy: 0.26 + rng() * 0.28,
          sz: 0.6 + rng() * 0.55,
          rot: [rng() * 2.2, rng() * 6.2, rng() * 2.2],
          color: Math.floor(rng() * 3),
        });
      }
      branches.push({ ang, up, len: Math.max(0.32, len), y: baseY, tufts });
    }
  }
  if (kind === 'pine') {
    const tufts = [0, 1].map((f) => ({
      t: 0.55 + f * 0.3,
      s: 0.42 * (h / 5.5) * (0.9 + rng() * 0.4),
      sx: 0.8 + rng() * 0.4,
      sy: 0.55 + rng() * 0.3,
      sz: 0.75 + rng() * 0.35,
      rot: [rng(), rng() * 4, rng()],
      color: Math.floor(rng() * 3),
    }));
    branches.push({
      ang: leanA + 0.4,
      up: 2.2,
      len: 0.28 + rng() * 0.25,
      y: trunkH * 0.9,
      tufts,
    });
  }
  return { segs, branches, kind };
}

export function segmentStats(keys) {
  const rows = [];
  for (let i = 0; i < keys.length - 1; i++) {
    const a = keys[i];
    const b = keys[i + 1];
    const run = Math.hypot(b.x - a.x, b.z - a.z);
    const rise = b.y - a.y;
    const slope = rise / run;
    let riser = rise;
    let going = run;
    let kind = 'ramp';
    if (a.landing && b.landing && Math.abs(slope) < 0.12) {
      kind = 'landing';
    } else if (slope > 0.18) {
      kind = 'steps';
      const n = Math.max(1, Math.ceil(rise / 0.155));
      riser = rise / n;
      going = run / n;
    }
    rows.push({ i, from: a.id, to: b.id, run, rise, slope, kind, riser, going });
  }
  return rows;
}

export function reversalCount(keys = PATH_KEYS) {
  let flips = 0;
  let prev = 0;
  for (let i = 0; i < keys.length - 1; i++) {
    const dx = keys[i + 1].x - keys[i].x;
    if (Math.abs(dx) < 0.25) continue;
    const s = Math.sign(dx);
    if (prev && s !== prev) flips += 1;
    prev = s;
  }
  return flips;
}

export function luminance(hex) {
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
