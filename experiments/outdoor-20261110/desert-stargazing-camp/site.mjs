/**
 * Measurable layout for the desert stargazing camp.
 * Pure data and math so orientation tests can run without WebGL.
 * Units are metres. +Z is toward the arriving visitor; mesas sit on -Z.
 */

export const STAR_COUNT = 52;
export const BRIGHT_STAR_COUNT = 6;

export const TENT = { x: -3.72, z: 0.42, hw: 2.2, hd: 1.62 };
export const RUG = { x: -3.78, z: 0.28, hw: 1.85, hd: 1.28 };
export const DECK = { x: 4.42, z: -1.22, hw: 1.7, hd: 1.22 };
export const STEPS = { x: 3.55, z: 0.62, hw: 0.72, hd: 0.78 };
export const SCOPE = { x: 4.28, z: -1.42, yaw: -2.62 };

export const pathPoints = [
  [0.55, 7.55],
  [-0.15, 5.7],
  [-1.15, 3.95],
  [-1.85, 2.45],
  [-1.35, 1.55],
  [0.15, 1.05],
  [1.55, 0.62],
  [2.7, 0.28],
  [3.35, 0.55],
];

export const plants = [
  { id: "ocotillo-dune", kind: "ocotillo", x: -7.35, z: 2.55, scale: 1.15, rot: 0.4 },
  { id: "creosote-dune", kind: "creosote", x: -6.15, z: 4.15, scale: 1.05, rot: 1.2 },
  { id: "agave-dune", kind: "agave", x: -5.35, z: 1.15, scale: 0.95, rot: 0.6 },
  { id: "sage-front", kind: "sage", x: -1.55, z: 6.35, scale: 0.85, rot: 2.1 },
  { id: "sage-front-b", kind: "sage", x: 2.35, z: 6.55, scale: 1.15, rot: 0.2 },
  { id: "yucca-back", kind: "yucca", x: -5.55, z: -1.85, scale: 1.1, rot: 0.8 },
  { id: "creosote-back", kind: "creosote", x: -1.85, z: -2.55, scale: 0.8, rot: 2.4 },
  { id: "barrel-steps", kind: "barrel", x: 2.15, z: 1.95, scale: 0.9, rot: 0.3 },
  { id: "agave-deck", kind: "agave", x: 6.55, z: 0.35, scale: 1.2, rot: 1.7 },
  { id: "cholla-east", kind: "cholla", x: 7.15, z: -2.65, scale: 1.0, rot: 0.9 },
  { id: "ocotillo-mid", kind: "ocotillo", x: 0.85, z: -3.55, scale: 0.82, rot: 1.5 },
  { id: "barrel-wash", kind: "barrel", x: -4.05, z: 4.85, scale: 0.62, rot: 2.2 },
  { id: "cholla-wash", kind: "cholla", x: 1.15, z: 3.55, scale: 0.72, rot: 0.15 },
];

export const rocks = [
  { id: "hoodoo-dune", kind: "hoodoo", x: -6.7, z: -0.35, scale: 1.15, rot: 0.5 },
  { id: "slab-front", kind: "slab", x: -0.85, z: 6.15, scale: 1.3, rot: 0.8 },
  { id: "boulder-path", kind: "boulder", x: 3.15, z: 3.65, scale: 0.85, rot: 1.4 },
  { id: "strata-deck", kind: "strata", x: 6.35, z: -2.55, scale: 1.25, rot: 0.3 },
  { id: "slab-tent", kind: "slab", x: -5.95, z: 0.95, scale: 0.7, rot: 1.9 },
  { id: "boulder-wash", kind: "boulder", x: 0.65, z: 2.45, scale: 0.45, rot: 0.6 },
];

export const mesas = [
  {
    id: "mitten-left",
    x: -9.4,
    z: -17.5,
    yaw: 0.18,
    tiers: [
      { shape: "cone", rTop: 3.1, rBot: 6.4, h: 2.8, color: "#a56a48" },
      { shape: "box", w: 4.6, d: 3.4, h: 1.45, color: "#c4a078" },
      { shape: "box", w: 4.2, d: 3.15, h: 2.15, color: "#a85a42" },
      { shape: "box", w: 3.9, d: 2.9, h: 1.05, color: "#d2b48a" },
      { shape: "box", w: 3.55, d: 2.65, h: 3.15, color: "#8d4a38" },
      { shape: "box", w: 3.2, d: 2.4, h: 0.7, color: "#e0c8a4" },
    ],
    spire: { dx: 2.55, dz: 0.35, w: 0.72, d: 0.64, h: 4.4, color: "#7a4034" },
  },
  {
    id: "butte-center",
    x: 0.6,
    z: -25.5,
    yaw: -0.12,
    tiers: [
      { shape: "cone", rTop: 4.2, rBot: 7.8, h: 2.6, color: "#8d5a68" },
      { shape: "box", w: 7.4, d: 4.4, h: 1.7, color: "#b88878" },
      { shape: "box", w: 6.8, d: 4.05, h: 2.7, color: "#7d4e5c" },
      { shape: "box", w: 6.3, d: 3.7, h: 0.9, color: "#d0b0a4" },
      { shape: "box", w: 5.9, d: 3.45, h: 3.5, color: "#6a4458" },
      { shape: "box", w: 5.5, d: 3.2, h: 0.55, color: "#c8b4b0" },
    ],
  },
  {
    id: "mesa-right",
    x: 11.2,
    z: -19.2,
    yaw: 0.22,
    tiers: [
      { shape: "cone", rTop: 3.4, rBot: 6.4, h: 2.2, color: "#9a6858" },
      { shape: "box", w: 6.2, d: 3.5, h: 1.45, color: "#c49880" },
      { shape: "box", w: 5.7, d: 3.2, h: 2.35, color: "#8a5048" },
      { shape: "box", w: 5.3, d: 2.95, h: 0.75, color: "#d8c0a4" },
      { shape: "box", w: 4.9, d: 2.7, h: 2.05, color: "#7a4844" },
    ],
  },
  {
    id: "ridge-far",
    x: 1.2,
    z: -36.5,
    yaw: 0.04,
    tiers: [
      { shape: "box", w: 28, d: 3.2, h: 1.6, color: "#6a627c" },
      { shape: "box", w: 22, d: 2.2, h: 1.15, color: "#7c748e" },
      { shape: "box", w: 12, d: 1.6, h: 0.7, color: "#8a849c" },
    ],
  },
];

const TABLE = { x: TENT.x - 0.02, z: TENT.z + 0.02 };

export function tablePoint() {
  return { x: TABLE.x, z: TABLE.z };
}

export function cushions() {
  const seats = [
    { id: "seat-n1", x: TENT.x - 0.72, z: TENT.z - 0.82, color: "#8a3a32", pip: "#e6d2a8" },
    { id: "seat-n2", x: TENT.x + 0.08, z: TENT.z - 0.9, color: "#2f3d55", pip: "#c4a06a" },
    { id: "seat-n3", x: TENT.x + 0.86, z: TENT.z - 0.74, color: "#a85a3a", pip: "#efe4d0" },
    { id: "seat-w1", x: TENT.x - 1.18, z: TENT.z - 0.08, color: "#6a4038", pip: "#d8c4a0" },
    { id: "seat-w2", x: TENT.x - 1.08, z: TENT.z + 0.62, color: "#3d4a3a", pip: "#e2c8a4" },
  ];
  return seats.map((s) => ({ ...s, yaw: yawToward(s.x, s.z, TABLE.x, TABLE.z) }));
}

function smoothstep(e0, e1, x) {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0 || 1e-6)));
  return t * t * (3 - 2 * t);
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function ellipseWeight(x, z, cx, cz, rx, rz) {
  const d = Math.hypot((x - cx) / rx, (z - cz) / rz);
  if (d >= 1) return 0;
  const t = 1 - d;
  return t * t * (3 - 2 * t);
}

/** 1 on the rug, falling to 0 across a short skirt so cushions sit level. */
function rugFlatWeight(x, z) {
  const d = Math.hypot((x - RUG.x) / RUG.hw, (z - RUG.z) / RUG.hd);
  if (d <= 1) return 1;
  if (d >= 1.45) return 0;
  return 1 - smoothstep(1, 1.45, d);
}

/** 1 on the deck footprint. The south side blends less so the stair can climb. */
function deckFlatWeight(x, z) {
  const box = Math.max(Math.abs(x - DECK.x) / DECK.hw, Math.abs(z - DECK.z) / DECK.hd);
  if (box <= 1) return 1;
  const limit = z > DECK.z ? 1.22 : 1.6;
  if (box >= limit) return 0;
  return 1 - smoothstep(1, limit, box);
}

export function insideEllipse(x, z, cx, cz, rx, rz) {
  return Math.hypot((x - cx) / rx, (z - cz) / rz) <= 1;
}

export function onDeck(x, z) {
  return Math.abs(x - DECK.x) <= DECK.hw && Math.abs(z - DECK.z) <= DECK.hd;
}

export function onSteps(x, z) {
  return Math.abs(x - STEPS.x) <= STEPS.hw && Math.abs(z - STEPS.z) <= STEPS.hd;
}

export function onRug(x, z) {
  return insideEllipse(x, z, RUG.x, RUG.z, RUG.hw, RUG.hd);
}

function macro(x, z) {
  let h = 0.18;
  h += 0.38 * Math.sin(x * 0.105 + 0.55) * Math.cos(z * 0.085 - 0.25);
  h += 0.16 * Math.sin(z * 0.15 + x * 0.035);
  const dx = (x + 6.15) / 3.3;
  const dz = (z - 3.15) / 4.8;
  h += 1.22 * Math.exp(-(dx * dx + dz * dz));
  const dx2 = (x - 2.4) / 4.4;
  const dz2 = (z - 6.7) / 2.8;
  h += 0.48 * Math.exp(-(dx2 * dx2 + dz2 * dz2));
  const wash = z - 0.18 * x - 1.35;
  h -= 0.32 * Math.exp(-(wash * wash) / 2.6);
  const shelf =
    smoothstep(1.4, 3.6, x) * smoothstep(1.8, -0.4, z) * smoothstep(8.8, 5.2, x);
  h += 0.36 * shelf;
  h += 0.18 * smoothstep(-8, -14, z);
  return h;
}

let pathCache = null;
function pathSamples() {
  if (pathCache) return pathCache;
  const pts = [];
  for (let i = 0; i < pathPoints.length - 1; i++) {
    const a = pathPoints[i];
    const b = pathPoints[i + 1];
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const n = Math.max(1, Math.ceil(len / 0.18));
    for (let s = 0; s < n; s++) {
      const t = s / n;
      pts.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
    }
  }
  pts.push(pathPoints[pathPoints.length - 1]);
  pathCache = pts;
  return pts;
}

export function distToPath(x, z) {
  let m = 1e9;
  for (const p of pathSamples()) {
    const d = (x - p[0]) * (x - p[0]) + (z - p[1]) * (z - p[1]);
    if (d < m) m = d;
  }
  return Math.sqrt(m);
}

export function heightAt(x, z) {
  let h = macro(x, z);
  const tentT = rugFlatWeight(x, z);
  h = lerp(h, macro(RUG.x, RUG.z), tentT);
  const deckT = deckFlatWeight(x, z);
  h = lerp(h, macro(DECK.x, DECK.z) + 0.05, deckT);
  const pd = distToPath(x, z);
  const pathT = pd < 1.15 ? smoothstep(1.15, 0.16, pd) * (1 - tentT) * (1 - deckT) : 0;
  h -= 0.04 * pathT;
  const rip = Math.sin(x * 3.15 + z * 0.42) * Math.sin(z * 1.15 + 0.45);
  const ripMask = (1 - tentT) * (1 - deckT) * (1 - Math.min(1, pathT * 1.4));
  h += rip * 0.01 * ripMask;
  return Math.max(0.04, h);
}

function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

function mixHex(a, b, t) {
  const A = hexToRgb(a);
  const B = hexToRgb(b);
  return [
    A[0] + (B[0] - A[0]) * t,
    A[1] + (B[1] - A[1]) * t,
    A[2] + (B[2] - A[2]) * t,
  ];
}

/** Sand / rock / path tint. Returned as linear-ish rgb 0..1 (authored sRGB bytes). */
export function colorAt(x, z) {
  const h = heightAt(x, z);
  const eps = 0.4;
  const slope = Math.hypot(heightAt(x + eps, z) - heightAt(x - eps, z), heightAt(x, z + eps) - heightAt(x, z - eps)) / (2 * eps);
  const blot = 0.5 + 0.5 * Math.sin(x * 0.73 + z * 0.41) * Math.sin(z * 0.57 - x * 0.22);
  const pd = distToPath(x, z);
  if (pd < 0.62 && !onRug(x, z) && !onDeck(x, z)) {
    return mixHex("#6e4c32", "#8a6244", blot);
  }
  const shelf = ellipseWeight(x, z, DECK.x, DECK.z, 3.3, 2.7);
  if (shelf > 0.25 || (x > 3.2 && z < 0.4 && slope > 0.42)) {
    const band = 0.5 + 0.5 * Math.sin(h * 22 + x * 0.4);
    return mixHex(band > 0.55 ? "#c48a5c" : "#8d4e3a", "#d7b48a", blot * 0.45);
  }
  if (slope > 0.62) return mixHex("#a85a42", "#d2b48a", blot);
  if (h > 1.05) return mixHex("#e6d2a6", "#f0e0c0", blot * 0.35);
  if (h < 0.08) return mixHex("#7d5a40", "#a07858", blot);
  return mixHex("#c4a06c", "#d8bc8c", blot * 0.55);
}

export function padHeight() {
  return heightAt(TENT.x, TENT.z);
}

export function deckRockY() {
  return heightAt(DECK.x, DECK.z);
}

/** Walking surface of the telescope deck, above the rock shelf. */
export function deckSurfaceY() {
  return deckRockY() + 0.22;
}

export function tableTopY() {
  return padHeight() + 0.22;
}

export function yawToward(x, z, tx, tz) {
  return Math.atan2(tx - x, tz - z);
}

export function pathMarkers() {
  const samples = pathSamples();
  const cum = [0];
  for (let i = 1; i < samples.length; i++) {
    cum.push(cum[i - 1] + Math.hypot(samples[i][0] - samples[i - 1][0], samples[i][1] - samples[i - 1][1]));
  }
  const total = cum[cum.length - 1];
  const out = [];
  const at = (dist) => {
    let i = 1;
    while (i < cum.length - 1 && cum[i] < dist) i++;
    const span = cum[i] - cum[i - 1] || 1e-6;
    const t = (dist - cum[i - 1]) / span;
    const a = samples[i - 1];
    const b = samples[i];
    const x = a[0] + (b[0] - a[0]) * t;
    const z = a[1] + (b[1] - a[1]) * t;
    const tx = (b[0] - a[0]) / span;
    const tz = (b[1] - a[1]) / span;
    return { x, z, tx, tz };
  };
  for (let dist = 1.15; dist < total - 0.7; dist += 1.62) {
    const p = at(dist);
    const side = out.length % 2 === 0 ? 1 : -1;
    const x = p.x - p.tz * side * 0.68;
    const z = p.z + p.tx * side * 0.68;
    if (onRug(x, z) || onDeck(x, z) || onSteps(x, z)) continue;
    out.push({
      id: `marker-${out.length}`,
      x,
      z,
      lamp: out.length % 3 === 0,
      height: out.length % 3 === 0 ? 0.28 : 0.14 + (out.length % 4) * 0.03,
    });
  }
  return out;
}

function rotXAround(p, originY, ang) {
  const y = p[1] - originY;
  const z = p[2];
  const c = Math.cos(ang);
  const s = Math.sin(ang);
  return [p[0], y * c - z * s + originY, y * s + z * c];
}

const ALT = (52 * Math.PI) / 180;
const HEAD_Y = 1.02;
const AXIS_Y = HEAD_Y + 0.22;

function tilt(p) {
  return rotXAround(p, AXIS_Y, -ALT);
}

function seg(name, a, b, radius, color) {
  return { name, a, b, radius, color };
}

/**
 * Fork-mounted catadioptric on a three-leg tripod.
 * Local feet sit on y=0. Local +Z is the tube's ground aim (objective forward).
 * Parts are already tilted to the observing altitude.
 */
export function telescopeParts() {
  const parts = [];
  const footR = 0.56;
  const head = [0, HEAD_Y, 0];
  for (let i = 0; i < 3; i++) {
    const theta = i * ((2 * Math.PI) / 3);
    const foot = [Math.sin(theta) * footR, 0.015, Math.cos(theta) * footR];
    parts.push(seg("tripod-leg", foot, [0, HEAD_Y - 0.03, 0], 0.028, "#1a1c1f"));
    const mid = [
      foot[0] * 0.58,
      foot[1] + (HEAD_Y - foot[1]) * 0.42,
      foot[2] * 0.58,
    ];
    parts.push(seg("spreader-rod", mid, [0, mid[1], 0], 0.01, "#2a2c30"));
  }
  parts.push(seg("tripod-head", [0, HEAD_Y - 0.05, 0], [0, HEAD_Y + 0.03, 0], 0.062, "#2c2f33"));
  parts.push(seg("azimuth-housing", [0, HEAD_Y + 0.03, 0], [0, HEAD_Y + 0.16, 0], 0.048, "#24262a"));
  parts.push(seg("fork-arm", [-0.125, HEAD_Y + 0.12, 0], [-0.125, AXIS_Y, 0], 0.02, "#2a2c30"));
  parts.push(seg("fork-arm", [0.125, HEAD_Y + 0.12, 0], [0.125, AXIS_Y, 0], 0.02, "#2a2c30"));
  parts.push(seg("altitude-knob", [0.125, AXIS_Y, 0], [0.185, AXIS_Y, 0], 0.016, "#c4a15a"));

  const half = 0.36;
  const tubeA = tilt([0, AXIS_Y, -half]);
  const tubeB = tilt([0, AXIS_Y, half]);
  parts.push(seg("optical-tube", tubeA, tubeB, 0.082, "#1c1e22"));
  const dew0 = tilt([0, AXIS_Y, half - 0.02]);
  const dew1 = tilt([0, AXIS_Y, half + 0.1]);
  parts.push(seg("dew-shield", dew0, dew1, 0.098, "#d5d0c8"));
  const cor0 = tilt([0, AXIS_Y, half + 0.07]);
  const cor1 = tilt([0, AXIS_Y, half + 0.09]);
  parts.push(seg("corrector", cor0, cor1, 0.07, "#14181c"));

  const f0 = tilt([0, AXIS_Y + 0.118, -0.02]);
  const f1 = tilt([0, AXIS_Y + 0.118, 0.28]);
  parts.push(seg("finder-tube", f0, f1, 0.02, "#c8c2b8"));
  const ring = (z) => {
    const a = tilt([0, AXIS_Y + 0.118, z]);
    const b = tilt([0, AXIS_Y + 0.118, z + 0.025]);
    parts.push(seg("finder-ring", a, b, 0.032, "#1a1c1f"));
  };
  ring(0.02);
  ring(0.2);

  const focA = tilt([0.082, AXIS_Y, -0.2]);
  const focB = tilt([0.15, AXIS_Y, -0.2]);
  parts.push(seg("focuser", focA, focB, 0.02, "#3a3c40"));
  const knobA = tilt([0.15, AXIS_Y, -0.2]);
  const knobB = tilt([0.15, AXIS_Y + 0.045, -0.2]);
  parts.push(seg("focuser-knob", knobA, knobB, 0.014, "#c4a15a"));

  const vbA = tilt([0, AXIS_Y, -half]);
  const vbB = tilt([0, AXIS_Y, -half - 0.07]);
  parts.push(seg("visual-back", vbA, vbB, 0.028, "#d9d4cc"));
  const eyeA = tilt([0, AXIS_Y, -half - 0.05]);
  const eyeB = tilt([0, AXIS_Y + 0.11, -half - 0.12]);
  parts.push(seg("eyepiece", eyeA, eyeB, 0.02, "#121416"));
  return { parts, head, footR, alt: ALT, axisY: AXIS_Y };
}

export function partDir(p) {
  const d = [p.b[0] - p.a[0], p.b[1] - p.a[1], p.b[2] - p.a[2]];
  const len = Math.hypot(d[0], d[1], d[2]) || 1;
  return { d: d.map((v) => v / len), len };
}

export function scopeWorld(local) {
  const c = Math.cos(SCOPE.yaw);
  const s = Math.sin(SCOPE.yaw);
  const x = local[0] * c + local[2] * s;
  const z = -local[0] * s + local[2] * c;
  return [SCOPE.x + x, deckSurfaceY() + local[1], SCOPE.z + z];
}

export function stoolPose() {
  const local = [0.12, 0, -0.92];
  const [x, , z] = scopeWorld(local);
  return {
    x,
    z,
    yaw: yawToward(x, z, SCOPE.x, SCOPE.z),
    seatY: deckSurfaceY() + 0.46,
  };
}

export function teaInstances() {
  const y = tableTopY();
  return [
    { id: "tea_tray", kind: "tray_napkin", position: [TABLE.x + 0.02, y, TABLE.z + 0.02], rotationY: 0.35 },
    { id: "thermos", kind: "thermos", position: [TABLE.x - 0.16, y, TABLE.z + 0.08], rotationY: 0.5 },
    { id: "mug_a", kind: "cup_mug", position: [TABLE.x + 0.16, y, TABLE.z + 0.1], rotationY: 0.7 },
    { id: "mug_b", kind: "cup_mug", position: [TABLE.x + 0.02, y, TABLE.z - 0.14], rotationY: -0.5 },
    { id: "mug_c", kind: "cup_mug", position: [TABLE.x + 0.2, y, TABLE.z - 0.04], rotationY: 1.5 },
  ];
}

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Stars on a shell of radius 60. Most sit over the mesas, high enough to clear the peach horizon and low enough to fall in the default view. */
export function starPositions() {
  const rng = mulberry32(20261110);
  const out = [];
  const push = (n, minElev, maxElev) => {
    for (let i = 0; i < n; i++) {
      const u = rng();
      const theta = u < 0.75 ? -Math.PI / 2 + (rng() - 0.5) * 2.4 : rng() * Math.PI * 2;
      const elev = minElev + rng() * (maxElev - minElev);
      const y = Math.sin(elev);
      const ring = Math.cos(elev);
      out.push([Math.cos(theta) * ring * 60, y * 60, Math.sin(theta) * ring * 60]);
    }
  };
  push(STAR_COUNT, 0.1, 0.38);
  push(BRIGHT_STAR_COUNT, 0.16, 0.46);
  return out;
}

export function cameraPresets() {
  const deckY = deckSurfaceY();
  return {
    default: {
      fov: 46,
      position: [6.6, 3.7, 11.4],
      target: [-0.2, 2.1, -2.2],
    },
    corner: {
      fov: 50,
      position: [-7.4, 4.35, 8.8],
      target: [1.15, 2.15, -6.2],
    },
    close: {
      fov: 36,
      position: [6.85, deckY + 1.28, 1.05],
      target: [SCOPE.x, deckY + 0.78, SCOPE.z],
    },
  };
}

function sub(a, b) {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}
function dot(a, b) {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}
function cross(a, b) {
  return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
}
function norm(a) {
  const l = Math.hypot(a[0], a[1], a[2]) || 1;
  return [a[0] / l, a[1] / l, a[2] / l];
}

/** True when a world point lands inside the camera frustum (Three.js lookAt convention). */
export function inFrame(cam, point, aspect = 1400 / 900, margin = 0.92) {
  const eye = cam.position;
  const forward = norm(sub(cam.target, eye));
  const zaxis = [-forward[0], -forward[1], -forward[2]];
  const xaxis = norm(cross([0, 1, 0], zaxis));
  const yaxis = cross(zaxis, xaxis);
  const v = sub(point, eye);
  const dist = dot(v, forward);
  if (dist < 0.25) return false;
  const x = dot(v, xaxis) / dist;
  const y = dot(v, yaxis) / dist;
  const tan = Math.tan((cam.fov * Math.PI) / 360);
  return Math.abs(x) < tan * aspect * margin && Math.abs(y) < tan * margin;
}

export function terrainStats(step = 1.25) {
  let min = Infinity;
  let max = -Infinity;
  const colors = new Set();
  for (let x = -16; x <= 16; x += step) {
    for (let z = -12; z <= 14; z += step) {
      const h = heightAt(x, z);
      if (h < min) min = h;
      if (h > max) max = h;
      const c = colorAt(x, z).map((v) => Math.round(v * 8));
      colors.add(c.join(","));
    }
  }
  return { min, max, range: max - min, colorBuckets: colors.size };
}

export function padFlatness() {
  const samples = [];
  for (let x = RUG.x - RUG.hw + 0.15; x <= RUG.x + RUG.hw - 0.15; x += 0.3) {
    for (let z = RUG.z - RUG.hd + 0.15; z <= RUG.z + RUG.hd - 0.15; z += 0.3) {
      if (onRug(x, z)) samples.push(heightAt(x, z));
    }
  }
  const mean = samples.reduce((a, b) => a + b, 0) / samples.length;
  const variance = samples.reduce((a, b) => a + (b - mean) ** 2, 0) / samples.length;
  return { mean, stdev: Math.sqrt(variance), n: samples.length };
}
