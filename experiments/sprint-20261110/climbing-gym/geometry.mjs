/** The Quarry — measurable layout (metres, Y up, back wall at −Z). */

export const ROOM = { width: 16.8, depth: 13.8, height: 5.65, wallT: 0.16 };
export const Z_BACK = -6.72;
export const FALL_CLEARANCE = 2.4;
export const AISLE = 1.2;

export const PALETTE = {
  floor: '#9a948b',
  floorLine: '#857f76',
  rubber: '#3c4742',
  wall: '#d5cfc3',
  wallDark: '#2c333a',
  ceiling: '#2a3036',
  beam: '#1b2026',
  seam: '#3f3126',
  matA: '#1e4f8e',
  matB: '#183f74',
  matTop: '#2b64a6',
  matCave: '#245a96',
  matCaveTop: '#3472b0',
  caution: '#e2b423',
  cautionBlk: '#161616',
  wood: '#6b4e32',
  woodLite: '#b08558',
  steel: '#9aa1a8',
  column: '#b7b2a8',
  washer: '#2a241e',
};

export const ROUTES = {
  yellow: { color: '#f2c230', name: 'slab', graded: true },
  green: { color: '#3aaa4a', name: 'arete', graded: true },
  blue: { color: '#2f6fe0', name: 'face', graded: true },
  orange: { color: '#e36a1c', name: 'cave', graded: true },
  pink: { color: '#e43780', name: 'roof', graded: true },
  white: { color: '#f4f1ea', name: 'traverse', graded: true },
  open: { color: '#d08948', name: 'open', graded: false },
  down: { color: '#e6b15a', name: 'downclimb', graded: false },
};

export const KIND = {
  jug: { shape: 'sphere', sx: 0.115, sy: 0.085, sz: 0.095 },
  big: { shape: 'sphere', sx: 0.155, sy: 0.115, sz: 0.125 },
  crimp: { shape: 'box', sx: 0.145, sy: 0.03, sz: 0.048 },
  pinch: { shape: 'pinch', sx: 0.09, sy: 0.11, sz: 0.065 },
  foot: { shape: 'box', sx: 0.065, sy: 0.038, sz: 0.05 },
};

export const SEGMENTS = [
  {
    id: 'slab',
    x0: -6.95,
    x1: -3.75,
    profile: [
      { y: 0.02, z: -4.42 },
      { y: 0.4, z: -4.42 },
      { y: 1.4, z: -4.74 },
      { y: 2.45, z: -5.1 },
      { y: 3.5, z: -5.42 },
      { y: 4.55, z: -5.7 },
    ],
    colors: ['#4a382c', '#f0dcc4', '#d4b48c', '#f6e6d0', '#c6a67a'],
  },
  {
    id: 'arete',
    x0: -3.75,
    x1: -3.15,
    profile: [
      { y: 0.02, z: -4.55 },
      { y: 0.4, z: -4.55 },
      { y: 1.4, z: -4.12 },
      { y: 2.5, z: -3.78 },
      { y: 3.55, z: -3.95 },
      { y: 4.52, z: -4.32 },
    ],
    colors: ['#5a4030', '#f8ead4', '#f0dcc0', '#fff4e4', '#e6cfae'],
  },
  {
    id: 'face',
    x0: -3.15,
    x1: -1.15,
    profile: [
      { y: 0.02, z: -5.02 },
      { y: 0.4, z: -5.02 },
      { y: 1.6, z: -4.94 },
      { y: 2.8, z: -4.88 },
      { y: 3.7, z: -4.86 },
      { y: 4.55, z: -4.9 },
    ],
    colors: ['#4a382c', '#ead8bc', '#d8c0a0', '#f3e4cc', '#cbb28a'],
  },
  {
    id: 'cave',
    x0: -1.15,
    x1: 2.5,
    profile: [
      { y: 0.02, z: -5.02 },
      { y: 0.4, z: -5.02 },
      { y: 1.15, z: -4.48 },
      { y: 1.85, z: -3.78 },
      { y: 2.55, z: -3.12 },
      { y: 3.15, z: -3.52 },
      { y: 3.9, z: -4.18 },
      { y: 4.55, z: -4.72 },
    ],
    colors: ['#4a382c', '#f0dcc4', '#d9c09a', '#c9aa84', '#b99570', '#d8bea0', '#e6d0b4'],
  },
  {
    id: 'steep',
    x0: 2.5,
    x1: 5.05,
    profile: [
      { y: 0.02, z: -4.95 },
      { y: 0.4, z: -4.95 },
      { y: 1.3, z: -4.48 },
      { y: 2.2, z: -4.08 },
      { y: 3.2, z: -3.82 },
    ],
    colors: ['#4a382c', '#ecd8b6', '#d7be9a', '#c4a67c'],
  },
  {
    id: 'down',
    x0: 5.05,
    x1: 6.7,
    profile: [
      { y: 0.02, z: -4.68 },
      { y: 0.4, z: -4.68 },
      { y: 1.5, z: -4.98 },
      { y: 2.6, z: -5.26 },
      { y: 3.75, z: -5.48 },
    ],
    colors: ['#5a4030', '#f0dcc4', '#e0c8a6', '#f6e6d0'],
  },
];

const HAND = [
  { route: 'yellow', seg: 'slab', x: -6.4, y: 0.78, kind: 'jug' },
  { route: 'yellow', seg: 'slab', x: -5.9, y: 1.2, kind: 'foot' },
  { route: 'yellow', seg: 'slab', x: -6.25, y: 1.68, kind: 'jug' },
  { route: 'yellow', seg: 'slab', x: -5.5, y: 2.1, kind: 'jug' },
  { route: 'yellow', seg: 'slab', x: -5.95, y: 2.55, kind: 'foot' },
  { route: 'yellow', seg: 'slab', x: -5.25, y: 2.95, kind: 'jug' },
  { route: 'yellow', seg: 'slab', x: -5.7, y: 3.4, kind: 'jug' },
  { route: 'yellow', seg: 'slab', x: -5.1, y: 3.85, kind: 'crimp' },
  { route: 'yellow', seg: 'slab', x: -5.5, y: 4.25, kind: 'jug' },

  { route: 'green', seg: 'arete', x: -3.52, y: 0.78, kind: 'jug' },
  { route: 'green', seg: 'arete', x: -3.38, y: 1.18, kind: 'foot' },
  { route: 'green', seg: 'arete', x: -3.55, y: 1.62, kind: 'jug' },
  { route: 'green', seg: 'arete', x: -3.32, y: 2.08, kind: 'pinch' },
  { route: 'green', seg: 'arete', x: -3.5, y: 2.52, kind: 'jug' },
  { route: 'green', seg: 'arete', x: -3.36, y: 3.02, kind: 'foot' },
  { route: 'green', seg: 'arete', x: -3.48, y: 3.5, kind: 'jug' },
  { route: 'green', seg: 'arete', x: -3.4, y: 4.05, kind: 'jug' },

  { route: 'blue', seg: 'face', x: -2.85, y: 0.88, kind: 'crimp' },
  { route: 'blue', seg: 'face', x: -2.4, y: 1.22, kind: 'foot' },
  { route: 'blue', seg: 'face', x: -2.7, y: 1.68, kind: 'crimp' },
  { route: 'blue', seg: 'face', x: -2.15, y: 2.08, kind: 'foot' },
  { route: 'blue', seg: 'face', x: -2.55, y: 2.52, kind: 'crimp' },
  { route: 'blue', seg: 'face', x: -2.05, y: 2.98, kind: 'pinch' },
  { route: 'blue', seg: 'face', x: -2.45, y: 3.42, kind: 'crimp' },
  { route: 'blue', seg: 'face', x: -2.15, y: 3.9, kind: 'jug' },
  { route: 'blue', seg: 'face', x: -2.6, y: 4.28, kind: 'crimp' },

  { route: 'orange', seg: 'cave', x: -0.85, y: 0.74, kind: 'jug' },
  { route: 'orange', seg: 'cave', x: -0.35, y: 1.08, kind: 'foot' },
  { route: 'orange', seg: 'cave', x: -0.9, y: 1.48, kind: 'big' },
  { route: 'orange', seg: 'cave', x: -0.25, y: 1.78, kind: 'jug' },
  { route: 'orange', seg: 'cave', x: -0.75, y: 2.12, kind: 'jug' },
  { route: 'orange', seg: 'cave', x: -0.15, y: 2.42, kind: 'big' },
  { route: 'orange', seg: 'cave', x: -0.5, y: 1.28, kind: 'foot' },

  { route: 'pink', seg: 'cave', x: 0.15, y: 2.02, kind: 'jug' },
  { route: 'pink', seg: 'cave', x: 1.55, y: 2.22, kind: 'jug' },
  { route: 'pink', seg: 'cave', x: 1.95, y: 1.9, kind: 'big' },
  { route: 'pink', seg: 'cave', x: 0.55, y: 1.58, kind: 'foot' },
  { route: 'pink', seg: 'cave', x: 1.7, y: 1.48, kind: 'foot' },

  { route: 'open', seg: 'steep', x: 3.15, y: 1.15, kind: 'jug' },
  { route: 'open', seg: 'steep', x: 3.75, y: 1.72, kind: 'jug' },
  { route: 'open', seg: 'steep', x: 4.35, y: 2.18, kind: 'crimp' },
  { route: 'open', seg: 'steep', x: 3.4, y: 2.55, kind: 'foot' },
  { route: 'open', seg: 'steep', x: 4.65, y: 2.78, kind: 'jug' },

  { route: 'down', seg: 'down', x: 5.42, y: 0.86, kind: 'big' },
  { route: 'down', seg: 'down', x: 5.78, y: 1.52, kind: 'big' },
  { route: 'down', seg: 'down', x: 5.4, y: 2.16, kind: 'big' },
  { route: 'down', seg: 'down', x: 5.72, y: 2.82, kind: 'big' },
  { route: 'down', seg: 'down', x: 5.48, y: 3.38, kind: 'big' },
];

const TRAVERSE_X = [-6.45, -5.8, -5.1, -4.35, -3.92, -3.66, -2.8, -2.1, -1.4, -0.55, 0.4, 1.3, 2.15, 2.95, 3.75, 4.55, 6.02, 6.35];
const TRAVERSE_DY = [0, 0.07, -0.05, 0.1, 0.02, -0.06, 0.08, 0, 0.06, -0.04, 0.09, 0.01, -0.05, 0.07, 0, 0.05, -0.03, 0.04];

function traverseHolds() {
  return TRAVERSE_X.map((x, i) => ({
    route: 'white',
    seg: segmentAt(x).id,
    x,
    y: 0.96 + TRAVERSE_DY[i],
    kind: i % 3 === 2 ? 'foot' : 'jug',
  }));
}

export function segmentById(id) {
  return SEGMENTS.find((s) => s.id === id);
}

export function segmentAt(x) {
  const seg = SEGMENTS.find((s, i) => x >= s.x0 && (x < s.x1 || i === SEGMENTS.length - 1));
  if (!seg) throw new Error(`no segment at x=${x}`);
  return seg;
}

export function profileZ(profile, y) {
  if (y <= profile[0].y) return profile[0].z;
  const last = profile[profile.length - 1];
  if (y >= last.y) return last.z;
  for (let i = 0; i < profile.length - 1; i++) {
    const a = profile[i];
    const b = profile[i + 1];
    if (y >= a.y && y <= b.y) {
      const t = (y - a.y) / (b.y - a.y || 1);
      return a.z + (b.z - a.z) * t;
    }
  }
  return last.z;
}

export function profileFrame(profile, y) {
  let i = 0;
  for (; i < profile.length - 2; i++) {
    if (y <= profile[i + 1].y) break;
  }
  const a = profile[i];
  const b = profile[i + 1];
  const dy = b.y - a.y;
  const dz = b.z - a.z;
  const len = Math.hypot(dy, dz) || 1;
  return { ny: -dz / len, nz: dy / len, i };
}

export function allHolds() {
  return HAND.concat(traverseHolds(), fangHolds());
}

export function holdPose(h) {
  const kind = KIND[h.kind];
  if (h.explicit) {
    const nlen = Math.hypot(h.explicit.nx, h.explicit.ny, h.explicit.nz) || 1;
    return {
      x: h.explicit.x,
      y: h.explicit.y,
      z: h.explicit.z,
      nx: h.explicit.nx / nlen,
      ny: h.explicit.ny / nlen,
      nz: h.explicit.nz / nlen,
      depth: kind.sz,
    };
  }
  const seg = segmentById(h.seg);
  const z = profileZ(seg.profile, h.y);
  const n = profileFrame(seg.profile, h.y);
  const lift = kind.sz * 0.32;
  return {
    x: h.x,
    y: h.y,
    z: z + n.nz * lift,
    nx: 0,
    ny: n.ny,
    nz: n.nz,
    depth: kind.sz,
  };
}

export function surfaceZ(h) {
  if (h.explicit) return h.explicit.z - holdPose(h).nz * (KIND[h.kind].sz * 0.5);
  return profileZ(segmentById(h.seg).profile, h.y);
}

function newell(poly) {
  let nx = 0;
  let ny = 0;
  let nz = 0;
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i];
    const b = poly[(i + 1) % poly.length];
    nx += (a[1] - b[1]) * (a[2] + b[2]);
    ny += (a[2] - b[2]) * (a[0] + b[0]);
    nz += (a[0] - b[0]) * (a[1] + b[1]);
  }
  return [nx, ny, nz];
}

function orient(poly, outward) {
  const n = newell(poly);
  const dot = n[0] * outward[0] + n[1] * outward[1] + n[2] * outward[2];
  if (dot < 0) poly.reverse();
  return poly;
}

export function segmentFacets(seg, inset = { left: 0, right: 0 }) {
  const x0 = seg.x0;
  const x1 = seg.x1;
  const p = seg.profile;
  const faces = [];
  for (let i = 0; i < p.length - 1; i++) {
    const a = p[i];
    const b = p[i + 1];
    faces.push({
      color: seg.colors[i] || seg.colors[seg.colors.length - 1],
      role: 'front',
      verts: [
        [x0, a.y, a.z],
        [x1, a.y, a.z],
        [x1, b.y, b.z],
        [x0, b.y, b.z],
      ],
    });
  }
  const top = p[p.length - 1];
  const bot = p[0];
  faces.push({
    color: '#c6a67a',
    role: 'top',
    verts: orient(
      [
        [x0, top.y, top.z],
        [x1, top.y, top.z],
        [x1, top.y, Z_BACK],
        [x0, top.y, Z_BACK],
      ],
      [0, 1, 0],
    ),
  });
  faces.push({
    color: '#5a4636',
    role: 'back',
    verts: orient(
      [
        [x0, top.y, Z_BACK],
        [x1, top.y, Z_BACK],
        [x1, bot.y, Z_BACK],
        [x0, bot.y, Z_BACK],
      ],
      [0, 0, -1],
    ),
  });
  const cx0 = x0 + inset.left;
  const cx1 = x1 - inset.right;
  const cap = (x, sign) => {
    const front = p.map((pt) => [x, pt.y, pt.z]);
    const poly = [...front, [x, top.y, Z_BACK], [x, bot.y, Z_BACK]];
    return orient(poly, [sign, 0, 0]);
  };
  faces.push({ color: '#b8956e', role: 'cap', verts: cap(cx0, -1) });
  faces.push({ color: '#b8956e', role: 'cap', verts: cap(cx1, 1) });
  return faces;
}

export function allFacets() {
  const faces = [];
  SEGMENTS.forEach((seg, i) => {
    const inset = {
      left: i === 0 ? 0 : 0.004,
      right: i === SEGMENTS.length - 1 ? 0 : 0.004,
    };
    faces.push(...segmentFacets(seg, inset));
  });
  return faces;
}

export function seamQuads(seg) {
  const quads = [];
  const p = seg.profile;
  for (let i = 1; i < p.length; i++) {
    const f = profileFrame(p, Math.max(p[0].y, p[i].y - 0.02));
    const width = i === p.length - 1 ? 0.045 : 0.026;
    const ty = f.nz;
    const tz = -f.ny;
    const y = p[i].y;
    const z = p[i].z;
    const oy = f.ny * 0.016;
    const oz = f.nz * 0.016;
    quads.push([
      [seg.x0, y - ty * width * 0.5 + oy, z - tz * width * 0.5 + oz],
      [seg.x1, y - ty * width * 0.5 + oy, z - tz * width * 0.5 + oz],
      [seg.x1, y + ty * width * 0.5 + oy, z + tz * width * 0.5 + oz],
      [seg.x0, y + ty * width * 0.5 + oy, z + tz * width * 0.5 + oz],
    ]);
  }
  const span = seg.x1 - seg.x0;
  const columns = Math.max(1, Math.round(span / 1.18));
  for (let k = 1; k < columns; k++) {
    const x = seg.x0 + (span * k) / columns;
    const steps = 7;
    const samples = [];
    for (let s = 0; s <= steps; s++) {
      const y = p[0].y + ((p[p.length - 1].y - p[0].y) * s) / steps;
      const z = profileZ(p, y);
      const f = profileFrame(p, y);
      samples.push([x, y + f.ny * 0.016, z + f.nz * 0.016]);
    }
    const half = 0.015;
    for (let s = 0; s < steps; s++) {
      const a = samples[s];
      const b = samples[s + 1];
      quads.push([
        [a[0] - half, a[1], a[2]],
        [a[0] + half, a[1], a[2]],
        [b[0] + half, b[1], b[2]],
        [b[0] - half, b[1], b[2]],
      ]);
    }
  }
  return quads;
}

/** Blunt volume on the cave underside. Root is buried in the panel; the nose is proud. */
export function fangFrame() {
  const seg = segmentById('cave');
  const y = 2.18;
  const z = profileZ(seg.profile, y);
  const n = profileFrame(seg.profile, y);
  return { x: 0.95, y, z, ny: n.ny, nz: n.nz, ty: n.nz, tz: -n.ny };
}

export function fangFacets() {
  const f = fangFrame();
  const embed = -0.18;
  const proud = 0.56;
  const hx = 0.64;
  const ht = 0.4;
  const pt = (x, t, out) => [
    f.x + x,
    f.y + f.ty * t + f.ny * out,
    f.z + f.tz * t + f.nz * out,
  ];
  const root = [pt(-hx, 0, embed), pt(0, -ht, embed), pt(hx, 0, embed), pt(0, ht, embed)];
  const nose = [pt(-hx * 0.46, 0, proud), pt(0, -ht * 0.5, proud), pt(hx * 0.46, 0, proud), pt(0, ht * 0.32, proud)];
  const cols = ['#f6e4cc', '#e7cfae', '#d7b892', '#f3ddc0'];
  const faces = [];
  const pts = root.concat(nose);
  const centroid = pts.reduce((a, p) => [a[0] + p[0], a[1] + p[1], a[2] + p[2]], [0, 0, 0]).map((v) => v / pts.length);
  const push = (verts, color) => {
    const nrm = newell(verts);
    const c = verts.reduce((a, p) => [a[0] + p[0], a[1] + p[1], a[2] + p[2]], [0, 0, 0]).map((v) => v / verts.length);
    const dot = nrm[0] * (c[0] - centroid[0]) + nrm[1] * (c[1] - centroid[1]) + nrm[2] * (c[2] - centroid[2]);
    faces.push({ color, role: 'fang', verts: dot < 0 ? verts.slice().reverse() : verts });
  };
  for (let i = 0; i < 4; i++) push([root[i], nose[i], nose[(i + 1) % 4], root[(i + 1) % 4]], cols[i]);
  push(nose, '#fff1dc');
  push(root, '#c9aa86');
  const apex = nose.reduce((a, p) => (p[2] > a[2] ? p : a), nose[0]);
  const rootZ = Math.max(...root.map((p) => p[2]));
  return { faces, apex, base: root, rootZ, skinZ: f.z, frame: f };
}

function fangHolds() {
  const f = fangFrame();
  const proud = 0.56;
  const jug = KIND.jug.sz * 0.32;
  const place = (x, t) => ({
    x: f.x + x,
    y: f.y + f.ty * t + f.ny * (proud + jug),
    z: f.z + f.tz * t + f.nz * (proud + jug),
    nx: 0,
    ny: f.ny,
    nz: f.nz,
  });
  return [
    { route: 'pink', seg: 'cave', x: f.x, y: f.y, kind: 'jug', explicit: place(0, 0.05) },
    { route: 'pink', seg: 'cave', x: f.x + 0.22, y: f.y, kind: 'foot', explicit: place(0.22, -0.12) },
  ];
}

export function mats() {
  const holds = allHolds();
  const fang = fangFacets();
  return SEGMENTS.map((seg) => {
    const kicker = profileZ(seg.profile, 0.4);
    let far = kicker;
    for (const h of holds) {
      if (h.seg !== seg.id) continue;
      far = Math.max(far, surfaceZ(h));
    }
    if (seg.id === 'cave') far = Math.max(far, fang.apex[2]);
    const thick = far - kicker > 0.6 ? 0.44 : 0.34;
    const zSurf = profileZ(seg.profile, Math.min(thick, seg.profile[seg.profile.length - 1].y));
    const z0 = Math.max(kicker, zSurf) + 0.02;
    const z1 = far + FALL_CLEARANCE;
    return { id: seg.id, x0: seg.x0 + 0.03, x1: seg.x1 - 0.03, z0, z1, thick, far, kicker };
  });
}

export function matAtX(x, matsList = mats()) {
  return matsList.find((m, i) => x >= m.x0 && (x < m.x1 || i === matsList.length - 1));
}

/** World half-extents of catalog meshes after targetHeight scale. Y is height. */
export const NATIVE = {
  museum_bench: { x: 0.418, y: 0.456, z: 1.5 },
  bar_counter: { x: 1.8, y: 0.455, z: 0.886 },
  bar_stool: { x: 0.464, y: 0.75, z: 0.464 },
  simple_chair: { x: 0.475, y: 0.85, z: 0.501 },
  pendant_lamp: { x: 0.246, y: 0.449, z: 0.246 },
  pos_terminal: { x: 0.081, y: 0.061, z: 0.2 },
  wall_shelf: { x: 0.701, y: 0.8, z: 0.287 },
  thermos: { x: 0.089, y: 0.3, z: 0.21 },
  flowerpot: { x: 0.25, y: 0.207, z: 0.25 },
};

export const INSTANCES = [
  { id: 'bench_a', kind: 'museum_bench', position: [-1.85, 0, 1.82], rotationY: Math.PI / 2 },
  { id: 'bench_b', kind: 'museum_bench', position: [0.85, 0, 1.82], rotationY: Math.PI / 2 },
  { id: 'bench_c', kind: 'museum_bench', position: [3.4, 0, 2.12], rotationY: Math.PI / 2 },
  { id: 'counter', kind: 'bar_counter', position: [-4.15, 0, 4.55], rotationY: 0 },
  { id: 'stool_a', kind: 'bar_stool', position: [-5.45, 0, 5.72], rotationY: 0.25 },
  { id: 'stool_b', kind: 'bar_stool', position: [-3.05, 0, 5.66], rotationY: -0.2 },
  { id: 'chair', kind: 'simple_chair', position: [-4.7, 0, 3.02], rotationY: 0 },
  { id: 'pos', kind: 'pos_terminal', position: [-3.15, 1.05, 4.62], rotationY: 0.45 },
  { id: 'thermos_a', kind: 'thermos', position: [-4.75, 1.05, 4.78], rotationY: 0.4 },
  { id: 'thermos_b', kind: 'thermos', position: [-5.2, 1.05, 4.32], rotationY: -0.3 },
  { id: 'plant_counter', kind: 'flowerpot', position: [-5.85, 1.05, 4.22], rotationY: 0.2 },
  { id: 'plant_floor', kind: 'flowerpot', position: [5.25, 0, 2.25], rotationY: 0.4 },
  { id: 'shelf', kind: 'wall_shelf', position: [-8.18, 0.98, 3.35], rotationY: Math.PI / 2 },
  { id: 'pendant_a', kind: 'pendant_lamp', position: [-5.35, 2.62, 4.4], rotationY: 0 },
  { id: 'pendant_b', kind: 'pendant_lamp', position: [-3.15, 2.62, 4.7], rotationY: 0.3 },
];

export const LADDER = { x: 6.28, z0: -4.12, z1: -5.4, y0: 0.4, y1: 3.22, width: 0.5 };
export const HANG = {
  board: { x: -8.24, z: 2.05, y: 1.92, w: 0.78, h: 0.2, d: 0.1 },
  pad: { x: -7.52, z: 2.05, w: 1.15, d: 0.95, h: 0.12 },
};
export const LOCKERS = { x0: -8.26, x1: -7.76, z0: 4.4, z1: 6.42, h: 1.84, bays: 4 };
export const LEGEND = { x: -8.26, z: 0.72, y: 1.72, w: 1.15, h: 1.62 };
export const SOFFIT = { x0: -8.15, x1: -1.65, z0: 2.9, z1: 6.62, y: 3.22, h: 0.1 };
export const CEILING = { x0: -7.5, x1: 7.4, z0: -6.82, z1: -0.3, y: 5.55, h: 0.1 };
export const TRUSS = { x0: -6.3, x1: 6.2, y: 5.08, z: -1.7 };
export const COLUMNS = [
  { x: -7.85, z: -6.42, s: 0.32 },
  { x: 7.5, z: -6.42, s: 0.32 },
];

export const POINT_LIGHTS = [
  { color: '#ffd2a0', intensity: 0.9, distance: 7.5, decay: 2, position: [-5.35, 2.85, 4.4] },
  { color: '#ffd2a0', intensity: 0.9, distance: 7.5, decay: 2, position: [-3.15, 2.85, 4.7] },
  { color: '#fff6e4', intensity: 0.75, distance: 11, decay: 2, position: [-4.6, 4.82, -1.7] },
  { color: '#fff6e4', intensity: 0.95, distance: 12, decay: 2, position: [0.2, 4.72, -1.7] },
  { color: '#fff6e4', intensity: 0.75, distance: 11, decay: 2, position: [4.0, 4.82, -1.7] },
  { color: '#ffe0b8', intensity: 0.55, distance: 9, decay: 2, position: [5.4, 2.35, 1.05] },
];

function aabbOf(inst) {
  const n = NATIVE[inst.kind];
  const s = 1;
  const target = inst.targetHeight;
  const scale = target / n.y;
  const hx = (n.x * scale) / 2;
  const hz = (n.z * scale) / 2;
  const rot = inst.rotationY || 0;
  const c = Math.abs(Math.cos(rot));
  const si = Math.abs(Math.sin(rot));
  const HX = hx * c + hz * si;
  const HZ = hx * si + hz * c;
  const [x, y, z] = inst.position;
  return { id: inst.id, kind: inst.kind, x0: x - HX, x1: x + HX, z0: z - HZ, z1: z + HZ, y0: y, y1: y + target, x, z };
}

function overlap(a, b) {
  return a.x0 < b.x1 && a.x1 > b.x0 && a.z0 < b.z1 && a.z1 > b.z0;
}

export function audit(layout) {
  const errors = [];
  const halfW = ROOM.width / 2;
  const halfD = ROOM.depth / 2;
  if (layout) {
    const r = layout.meta.room;
    if (r.width !== ROOM.width || r.depth !== ROOM.depth || r.height !== ROOM.height) {
      errors.push('layout room does not match geometry ROOM');
    }
    const byId = Object.fromEntries((layout.instances || []).map((d) => [d.id, d]));
    for (const inst of INSTANCES) {
      const got = byId[inst.id];
      if (!got) {
        errors.push(`layout missing ${inst.id}`);
        continue;
      }
      if (got.kind !== inst.kind) errors.push(`${inst.id} kind`);
      for (let i = 0; i < 3; i++) {
        if (Math.abs(got.position[i] - inst.position[i]) > 1e-3) errors.push(`${inst.id} position`);
      }
      if (Math.abs((got.rotationY || 0) - (inst.rotationY || 0)) > 1e-3) errors.push(`${inst.id} rotation`);
    }
  }
  const targets = layout?.assets || {
    museum_bench: { targetHeight: 0.46 },
    bar_counter: { targetHeight: 1.05 },
    bar_stool: { targetHeight: 0.78 },
    simple_chair: { targetHeight: 0.85 },
    pendant_lamp: { targetHeight: 0.58 },
    pos_terminal: { targetHeight: 0.08 },
    wall_shelf: { targetHeight: 0.86 },
    thermos: { targetHeight: 0.26 },
    flowerpot: { targetHeight: 0.26 },
  };
  const boxes = INSTANCES.map((inst) => aabbOf({ ...inst, targetHeight: targets[inst.kind].targetHeight }));

  const pad = mats();
  const holds = allHolds();
  for (const h of holds) {
    const seg = segmentById(h.seg);
    if (h.x < seg.x0 + 0.05 || h.x > seg.x1 - 0.05) errors.push(`hold ${h.route} x ${h.x} outside ${seg.id}`);
    const top = seg.profile[seg.profile.length - 1].y;
    if (!h.explicit && (h.y < 0.55 || h.y > top - 0.05)) errors.push(`hold ${h.route} y ${h.y} off ${seg.id}`);
    const pose = holdPose(h);
    if (pose.nz < 0.25) errors.push(`hold ${h.route} at ${h.x},${h.y} faces away nz=${pose.nz.toFixed(2)}`);
    const m = matAtX(h.x, pad);
    if (!m) errors.push(`no mat for hold ${h.route}`);
    else if (surfaceZ(h) + FALL_CLEARANCE > m.z1 + 0.02) {
      errors.push(`fall zone short for ${h.route} at x=${h.x}`);
    }
    if (pose.y < (m ? m.thick : 0) + 0.12 && h.kind !== 'foot') errors.push(`hand ${h.route} inside pad`);
  }
  for (let i = 0; i < holds.length; i++) {
    const a = holdPose(holds[i]);
    for (let j = i + 1; j < holds.length; j++) {
      const b = holdPose(holds[j]);
      const d = Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
      if (d < 0.16) errors.push(`holds overlap ${holds[i].route}/${holds[j].route} d=${d.toFixed(2)}`);
    }
  }
  for (const route of Object.keys(ROUTES)) {
    const list = holds.filter((h) => h.route === route);
    if (ROUTES[route].graded && list.length < 6) errors.push(`${route} has ${list.length} holds`);
    if (!ROUTES[route].graded && list.length < 4) errors.push(`${route} thin`);
  }
  const gradedColors = Object.entries(ROUTES).filter(([, v]) => v.graded).map(([, v]) => v.color);
  if (new Set(gradedColors).size !== gradedColors.length) errors.push('route colors not unique');

  const fang = fangFacets();
  const seated = fang.base.every((p) => (p[1] - fang.frame.y) * fang.frame.ny + (p[2] - fang.frame.z) * fang.frame.nz < -0.08);
  if (!seated) errors.push('fang root is not seated in the cave');
  const proud = (fang.apex[1] - fang.frame.y) * fang.frame.ny + (fang.apex[2] - fang.frame.z) * fang.frame.nz;
  if (proud < 0.35) errors.push('fang does not project from the cave');
  for (const h of holds.filter((q) => q.route === 'pink' && !q.explicit)) {
    const n = profileFrame(segmentById(h.seg).profile, h.y);
    if (n.ny > -0.25) errors.push(`pink hold y=${h.y} not on an underside`);
  }
  for (const h of holds.filter((q) => q.route === 'yellow')) {
    const n = profileFrame(segmentById(h.seg).profile, h.y);
    if (n.ny < 0.15) errors.push('yellow hold not on the slab');
  }

  for (const seg of SEGMENTS) {
    const m = pad.find((q) => q.id === seg.id);
    const zWall = profileZ(seg.profile, Math.min(m.thick, 0.4));
    if (zWall > m.z0 + 0.01) errors.push(`mat ${seg.id} cuts the wall`);
    if (seg.profile[seg.profile.length - 1].y > ROOM.height - 0.85) errors.push(`${seg.id} too tall for ceiling`);
    const front = segmentFacets(seg).find((f) => f.role === 'front');
    const n = newell(front.verts);
    if (n[2] <= 0) errors.push(`${seg.id} front winding`);
  }

  const benchBoxes = boxes.filter((b) => b.kind === 'museum_bench');
  for (const b of benchBoxes) {
    let far = -Infinity;
    for (const m of pad) {
      if (b.x1 > m.x0 && b.x0 < m.x1) far = Math.max(far, m.z1);
    }
    if (b.z0 < far + AISLE) errors.push(`${b.id} aisle ${ (b.z0 - far).toFixed(2) }m`);
  }
  const counter = boxes.find((b) => b.id === 'counter');
  for (const b of boxes) {
    if (b.y0 > 0.4 && b.kind !== 'pendant_lamp') continue;
    if (b.kind === 'pendant_lamp' || b.kind === 'pos_terminal' || b.kind === 'thermos' || (b.kind === 'flowerpot' && b.y0 > 0.5)) continue;
    for (const m of pad) {
      if (overlap(b, m)) errors.push(`${b.id} intersects mat ${m.id}`);
    }
    if (b.x0 < -halfW + 0.05 || b.x1 > halfW - 0.05 || b.z0 < -halfD + 0.05 || b.z1 > halfD - 0.2) {
      errors.push(`${b.id} outside room`);
    }
  }
  const chair = boxes.find((b) => b.id === 'chair');
  if (chair.z > counter.z) errors.push('staff chair is on the visitor side of the desk');
  const stools = boxes.filter((b) => b.kind === 'bar_stool');
  for (const s of stools) {
    if (s.z < counter.z) errors.push(`${s.id} is behind the desk`);
    const gap = s.z0 - counter.z1;
    if (gap > 0.45) errors.push(`${s.id} too far from desk`);
  }
  for (const b of benchBoxes) {
    if (overlap(b, counter)) errors.push(`${b.id} hits the desk`);
  }
  if (Math.abs((INSTANCES.find((i) => i.id === 'bench_a').rotationY || 0) - Math.PI / 2) > 1e-3) {
    errors.push('benches are not turned long-axis along the wall');
  }

  const ladderMat = pad.find((m) => m.id === 'down');
  if (LADDER.z0 < ladderMat.z0 || LADDER.z0 > ladderMat.z1) errors.push('ladder foot off the pad');
  if (LADDER.x < 5.05 || LADDER.x > 6.7) errors.push('ladder off the downclimb');
  if (LADDER.y1 > ROOM.height - 1) errors.push('ladder too tall');

  const hangBox = { x0: HANG.pad.x - HANG.pad.w / 2, x1: HANG.pad.x + HANG.pad.w / 2, z0: HANG.pad.z - HANG.pad.d / 2, z1: HANG.pad.z + HANG.pad.d / 2 };
  for (const m of pad) if (overlap(hangBox, m)) errors.push('hangboard pad intersects the fall mats');
  if (HANG.board.y > 2.2) errors.push('hangboard set too high for a warm-up board');

  const lock = { x0: LOCKERS.x0, x1: LOCKERS.x1, z0: LOCKERS.z0, z1: LOCKERS.z1 };
  if (lock.x0 < -halfW + ROOM.wallT * 0.4) errors.push('lockers inside the left wall');
  if (overlap(lock, { x0: counter.x0, x1: counter.x1, z0: counter.z0, z1: counter.z1 })) errors.push('lockers hit the desk');

  if (SOFFIT.y < 2.6) errors.push('reception soffit is head-low');
  const pend = boxes.filter((b) => b.kind === 'pendant_lamp');
  for (const p of pend) {
    if (p.y1 > SOFFIT.y + 0.03) errors.push(`${p.id} pokes the soffit`);
    if (p.x < SOFFIT.x0 || p.x > SOFFIT.x1 || p.z < SOFFIT.z0 || p.z > SOFFIT.z1) errors.push(`${p.id} not under the soffit`);
  }

  return errors;
}
