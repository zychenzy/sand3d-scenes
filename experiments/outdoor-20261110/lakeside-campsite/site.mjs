// Shared site math and layout for the lakeside campsite.
// Positions are metres. +Z is toward the lake (the default camera sits over the water).
// Local -Z on a placed object is its "front" (door, seat facing, bench facing).

export const waterLevel = 0.07;
export const padHeight = 0.5;

export function faceYaw(fromX, fromZ, toX, toZ) {
  const dx = toX - fromX;
  const dz = toZ - fromZ;
  return Math.atan2(-dx, -dz);
}

export function yawForward(yaw) {
  return { x: -Math.sin(yaw), z: -Math.cos(yaw) };
}

export function shoreZ(x) {
  return 1.42
    + Math.sin(x * 0.36 + 0.25) * 1.08
    + Math.sin(x * 1.08 + 1.15) * 0.4
    + Math.cos(x * 0.19) * 0.46;
}

function smooth(t) {
  const x = Math.min(1, Math.max(0, t));
  return x * x * (3 - 2 * x);
}

function disk(x, z, cx, cz, r) {
  const d = Math.hypot(x - cx, z - cz) / r;
  return smooth(1 - d);
}

export function padWeight(x, z) {
  return Math.max(
    disk(x, z, -0.15, -1.05, 3.15),
    disk(x, z, -4.15, -3.75, 2.15),
    disk(x, z, 3.75, -2.6, 1.95),
    disk(x, z, 2.3, 0.12, 1.55),
  );
}

export function terrainHeight(x, z) {
  const inland = shoreZ(x) - z;
  let h;
  if (inland < 0) {
    // Continuous with the beach, then a shallow lake bed (no chasm at the mesh edge).
    h = waterLevel - 0.04 + Math.max(inland, -1.35) * 0.38;
  } else if (inland < 1.05) {
    const t = inland / 1.05;
    h = waterLevel + 0.015 + t * t * 0.4;
  } else {
    h = waterLevel + 0.42 + Math.min(inland - 1.05, 7) * 0.03;
  }
  const n = Math.sin(x * 0.83 + z * 0.37) * 0.045
    + Math.sin(x * 1.85 - z * 1.15) * 0.022
    + Math.sin(x * 0.31 + 1.7) * Math.cos(z * 0.46) * 0.035;
  h += n * (inland > 0.25 ? 1 : 0.2);

  const kx = x + 7.6;
  const kz = z + 0.15;
  h += Math.exp(-(kx * kx + kz * kz) / 5.2) * 0.95;

  const hx = x - 8.1;
  const hz = z - 3.05;
  h += Math.exp(-(hx * hx / 7.5 + hz * hz / 4.6)) * 0.62;

  h += Math.max(0, -z - 5.8) * 0.1;

  const pad = padWeight(x, z);
  h = h * (1 - pad) + padHeight * pad;
  return h;
}

function distToSegment(px, pz, ax, az, bx, bz) {
  const abx = bx - ax;
  const abz = bz - az;
  const len2 = abx * abx + abz * abz || 1e-6;
  let t = ((px - ax) * abx + (pz - az) * abz) / len2;
  t = Math.min(1, Math.max(0, t));
  const qx = ax + abx * t;
  const qz = az + abz * t;
  return Math.hypot(px - qx, pz - qz);
}

export const fire = { x: -0.32, z: -1.02, ringRadius: 0.56 };

const ridge = { id: 'tent-ridge', kind: 'ridge', x: -4.15, z: -3.75 };
const dome = { id: 'tent-dome', kind: 'dome', x: 3.75, z: -2.6 };
ridge.yaw = faceYaw(ridge.x, ridge.z, fire.x, fire.z);
dome.yaw = faceYaw(dome.x, dome.z, fire.x, fire.z);

function seat(id, kind, x, z) {
  return { id, kind, x, z, yaw: faceYaw(x, z, fire.x, fire.z) };
}

const seats = [
  seat('seat-lake', 'log', fire.x + 0.22, fire.z + 1.64),
  seat('seat-west', 'stump', fire.x - 1.5, fire.z - 0.18),
  seat('seat-east', 'log', fire.x + 1.38, fire.z - 0.78),
];

const tableYaw = -0.42;
const table = { id: 'picnic-table', x: 2.28, z: 0.08, yaw: tableYaw };

function bench(id, localZ) {
  const c = Math.cos(tableYaw);
  const s = Math.sin(tableYaw);
  const x = table.x + localZ * s;
  const z = table.z + localZ * c;
  const yaw = localZ > 0 ? tableYaw : tableYaw + Math.PI;
  return { id, x, z, yaw, localZ };
}

const benches = [
  bench('bench-south', 0.62),
  bench('bench-north', -0.62),
];

const dockX = 0.72;
const dockZ = shoreZ(dockX) - 0.22;
const dock = {
  id: 'dock',
  x: dockX,
  z: dockZ,
  yaw: 0.2,
  length: 4.05,
  width: 1.12,
  deckAboveWater: 0.3,
};

const canoeX = -3.55;
const canoeZ = shoreZ(canoeX) - 0.15;
const canoe = {
  id: 'canoe',
  x: canoeX,
  z: canoeZ,
  yaw: -0.62,
  length: 3.55,
};

export const pathSegments = [
  [dock.x + 0.15, dock.z - 0.15, 0.85, 0.45],
  [0.85, 0.45, 0.2, -0.35],
  [0.2, -0.35, fire.x + 0.35, fire.z + 0.85],
  [fire.x - 0.15, fire.z - 0.15, ridge.x + 0.4, ridge.z + 0.55],
  [fire.x + 0.2, fire.z - 0.1, dome.x - 0.45, dome.z + 0.35],
  [0.55, 0.15, table.x - 0.35, table.z - 0.05],
];

export function pathDistance(x, z) {
  let best = Infinity;
  for (const [ax, az, bx, bz] of pathSegments) {
    best = Math.min(best, distToSegment(x, z, ax, az, bx, bz));
  }
  return best;
}

export const pines = [
  { id: 'pine-a', kind: 'pine', x: -6.9, z: -6.4, h: 8.6, leanX: 0.03, leanZ: 0.055, seed: 1 },
  { id: 'spruce-a', kind: 'spruce', x: -3.4, z: -7.7, h: 10.8, leanX: -0.02, leanZ: 0.012, seed: 2 },
  { id: 'pine-b', kind: 'pine', x: -0.5, z: -8.5, h: 7.4, leanX: 0.07, leanZ: -0.03, seed: 3 },
  { id: 'cedar-a', kind: 'cedar', x: 2.35, z: -7.15, h: 6.7, leanX: 0.0, leanZ: 0.045, seed: 4 },
  { id: 'snag-a', kind: 'snag', x: 5.05, z: -6.55, h: 9.2, leanX: 0.1, leanZ: 0.02, seed: 5 },
  { id: 'spruce-b', kind: 'spruce', x: 7.85, z: -5.35, h: 8.7, leanX: -0.045, leanZ: -0.05, seed: 6 },
  { id: 'pine-c', kind: 'pine', x: -9.5, z: -3.5, h: 7.1, leanX: 0.085, leanZ: 0.07, seed: 7 },
  { id: 'cedar-b', kind: 'cedar', x: 9.35, z: -2.45, h: 5.8, leanX: -0.02, leanZ: 0.035, seed: 8 },
  { id: 'pine-d', kind: 'pine', x: -6.2, z: -5.15, h: 5.3, leanX: 0.02, leanZ: -0.065, seed: 9 },
  { id: 'spruce-c', kind: 'spruce', x: 1.15, z: -6.35, h: 9.6, leanX: 0.015, leanZ: 0.05, seed: 10 },
  { id: 'sap-a', kind: 'sapling', x: -6.15, z: -1.85, h: 2.15, leanX: 0.04, leanZ: 0.02, seed: 11 },
  { id: 'sap-b', kind: 'sapling', x: 5.45, z: -4.35, h: 1.65, leanX: -0.05, leanZ: 0.03, seed: 12 },
  { id: 'sap-c', kind: 'sapling', x: -5.15, z: 0.35, h: 1.55, leanX: 0.03, leanZ: -0.025, seed: 13 },
  { id: 'cedar-c', kind: 'cedar', x: 8.55, z: 2.45, h: 4.5, leanX: 0.05, leanZ: -0.04, seed: 14 },
  { id: 'pine-e', kind: 'pine', x: -8.35, z: -8.05, h: 11.5, leanX: -0.03, leanZ: 0.02, seed: 15 },
  { id: 'snag-b', kind: 'snag', x: -1.35, z: -6.15, h: 6.5, leanX: 0.12, leanZ: -0.045, seed: 16 },
  { id: 'pine-f', kind: 'pine', x: -11.2, z: -7.4, h: 8.9, leanX: 0.04, leanZ: -0.02, seed: 31 },
  { id: 'spruce-d', kind: 'spruce', x: -5.15, z: -9.35, h: 9.5, leanX: -0.035, leanZ: 0.04, seed: 32 },
  { id: 'cedar-d', kind: 'cedar', x: 3.9, z: -9.2, h: 7.3, leanX: 0.02, leanZ: -0.035, seed: 33 },
  { id: 'pine-g', kind: 'pine', x: 6.55, z: -8.7, h: 10.2, leanX: 0.055, leanZ: 0.015, seed: 34 },
  { id: 'spruce-e', kind: 'spruce', x: 10.6, z: -4.2, h: 7.9, leanX: -0.05, leanZ: 0.045, seed: 35 },
  { id: 'cedar-e', kind: 'cedar', x: -10.7, z: -5.2, h: 6.2, leanX: 0.03, leanZ: 0.06, seed: 36 },
  { id: 'pine-h', kind: 'pine', x: 0.55, z: -9.9, h: 8.3, leanX: -0.025, leanZ: -0.05, seed: 37 },
];

export const shrubs = [
  { id: 'shrub-shore-a', kind: 'grass', x: -3.4, z: 1.15, s: 1.15, seed: 21 },
  { id: 'shrub-shore-b', kind: 'willow', x: 4.6, z: 1.55, s: 1.35, seed: 22 },
  { id: 'shrub-shore-c', kind: 'grass', x: 6.4, z: 2.35, s: 0.85, seed: 23 },
  { id: 'shrub-knoll', kind: 'mound', x: -7.9, z: -0.4, s: 1.4, seed: 24 },
  { id: 'shrub-tent', kind: 'mound', x: -5.5, z: -4.6, s: 0.9, seed: 25 },
  { id: 'shrub-dome', kind: 'fern', x: 4.7, z: -1.35, s: 0.8, seed: 26 },
  { id: 'shrub-back', kind: 'mound', x: 0.4, z: -5.4, s: 1.2, seed: 27 },
  { id: 'shrub-head', kind: 'willow', x: 7.6, z: 1.7, s: 1.05, seed: 28 },
];

export const layout = {
  meta: {
    title: 'Lakeside campsite',
    units: 'metres',
    style: 'Toon hard',
    time: 'blue-hour dusk',
    slug: 'lakeside-campsite',
  },
  waterLevel,
  padHeight,
  fire,
  tents: [ridge, dome],
  seats,
  table,
  benches,
  dock,
  canoe,
  pines,
  shrubs,
  pathSegments,
  shell: {
    clearColor: '#1a2744',
    fogColor: '#243656',
    fogNear: 18,
    fogFar: 46,
  },
  camera: {
    fov: 40,
    position: [4.35, 4.55, 12.4],
    target: [0.15, 1.15, -1.15],
  },
  cameraPresets: {
    corner: {
      fov: 42,
      position: [-8.6, 3.15, 7.4],
      target: [0.6, 0.85, -0.7],
    },
    close: {
      fov: 38,
      position: [1.95, 1.72, 2.45],
      target: [-0.2, 0.4, -0.9],
    },
    top: {
      fov: 42,
      position: [0.2, 16.5, 0.4],
      target: [0.2, 0.2, -0.6],
    },
  },
  lights: {
    hemi: { sky: '#a9b8d4', ground: '#3c4658', intensity: 0.72 },
    key: { color: '#c5d2ea', intensity: 0.78, position: [-7.5, 11.5, 6.2], target: [0, 0.4, -1] },
    fill: { color: '#6e6280', intensity: 0.24, position: [7, 4.5, -3] },
    points: [
      { id: 'fire', color: '#ff9440', intensity: 0.72, distance: 4.4, decay: 2, position: [fire.x, padHeight + 0.38, fire.z] },
      { id: 'lantern', color: '#ffc58a', intensity: 0.2, distance: 2.6, decay: 2, position: [2.85, padHeight + 1.05, 0.35] },
    ],
  },
  assets: {
    thermos: { glb: 'assets/thermos__c85ee7b8828b.glb', targetHeight: 0.26 },
    cup_mug: { glb: 'assets/cup_mug__6da6f7f87b8d.glb', targetHeight: 0.09 },
    jam_jar: { glb: 'assets/jam_jar__4e43eb29aa14.glb', targetHeight: 0.12 },
    bucket: { glb: 'assets/flowerpot__4a270f247734.glb', targetHeight: 0.2 },
  },
  tabletop: [
    { id: 'thermos', kind: 'thermos', local: [-0.38, 0.76, 0.02], rotationY: 0.4 },
    { id: 'mug-a', kind: 'cup_mug', local: [0.12, 0.76, -0.12], rotationY: 0.2 },
    { id: 'mug-b', kind: 'cup_mug', local: [0.34, 0.76, 0.1], rotationY: -0.6 },
    { id: 'jar', kind: 'jam_jar', local: [-0.05, 0.76, 0.14], rotationY: 0.8 },
  ],
  groundProps: [
    { id: 'bucket', kind: 'bucket', x: 3.42, z: -0.42, rotationY: 0.5 },
  ],
  acceptance: {
    shots: ['toon default', 'toon corner', 'toon close', 'unlit'],
    must_read: [
      'Two different pitched tents on a worn pad.',
      'Stone ring with seats facing the fire, glow kept local.',
      'Picnic and cooking kit off to the side of the fire.',
      'Short timber landing into the lake.',
      'Uneven shoreline and mixed pines, not a cone grid.',
    ],
  },
};

export function angleErrorDeg(yaw, fromX, fromZ, toX, toZ) {
  const fwd = yawForward(yaw);
  const dx = toX - fromX;
  const dz = toZ - fromZ;
  const len = Math.hypot(dx, dz) || 1e-6;
  const dot = (fwd.x * dx + fwd.z * dz) / len;
  const clamped = Math.min(1, Math.max(-1, dot));
  return Math.acos(clamped) * 180 / Math.PI;
}

export function validate(data = layout) {
  const errors = [];
  const check = (cond, msg) => { if (!cond) errors.push(msg); };

  check(data.tents.length === 2, 'expected exactly two tents');
  const kinds = new Set(data.tents.map((t) => t.kind));
  check(kinds.has('ridge') && kinds.has('dome'), 'tents must be one ridge and one dome');
  const [a, b] = data.tents;
  check(Math.hypot(a.x - b.x, a.z - b.z) > 5, 'tents are too close together');
  for (const t of data.tents) {
    const d = Math.hypot(t.x - data.fire.x, t.z - data.fire.z);
    check(d > 4.0, `${t.id} center is ${d.toFixed(2)}m from the fire; want > 4m`);
    const err = angleErrorDeg(t.yaw, t.x, t.z, data.fire.x, data.fire.z);
    check(err < 8, `${t.id} door yaw misses the fire by ${err.toFixed(1)}°`);
    const foot = terrainHeight(t.x, t.z);
    check(Math.abs(foot - data.padHeight) < 0.04, `${t.id} pad is not level (${foot.toFixed(3)})`);
  }

  check(data.seats.length >= 3, 'need at least three seats facing the fire');
  const seatAngles = [];
  for (const s of data.seats) {
    const d = Math.hypot(s.x - data.fire.x, s.z - data.fire.z);
    check(d > data.fire.ringRadius + 0.7, `${s.id} is inside the stone ring (${d.toFixed(2)}m)`);
    check(d < 2.15, `${s.id} is too far from the fire (${d.toFixed(2)}m)`);
    const err = angleErrorDeg(s.yaw, s.x, s.z, data.fire.x, data.fire.z);
    check(err < 8, `${s.id} does not face the fire (${err.toFixed(1)}°)`);
    seatAngles.push(Math.atan2(s.z - data.fire.z, s.x - data.fire.x));
  }
  seatAngles.sort((p, q) => p - q);
  const gaps = seatAngles.map((ang, i) => {
    const nxt = seatAngles[(i + 1) % seatAngles.length];
    let g = nxt - ang;
    if (g <= 0) g += Math.PI * 2;
    return g;
  });
  const gapMean = gaps.reduce((s, g) => s + g, 0) / gaps.length;
  const gapVar = gaps.reduce((s, g) => s + (g - gapMean) ** 2, 0) / gaps.length;
  check(Math.sqrt(gapVar) > 0.18, 'fire seats are evenly spaced; the ring should be asymmetric');
  check(Math.min(...gaps) > 0.55, 'two fire seats occupy the same side');

  for (const bench of data.benches) {
    const err = angleErrorDeg(bench.yaw, bench.x, bench.z, data.table.x, data.table.z);
    check(err < 12, `${bench.id} does not face the picnic table (${err.toFixed(1)}°)`);
    const d = Math.hypot(bench.x - data.table.x, bench.z - data.table.z);
    check(d > 0.45 && d < 0.9, `${bench.id} distance to table is ${d.toFixed(2)}m`);
  }
  const tableDist = Math.hypot(data.table.x - data.fire.x, data.table.z - data.fire.z);
  check(tableDist > 2.2 && tableDist < 5.5, `picnic zone distance to fire is ${tableDist.toFixed(2)}m`);

  check(data.dock.length >= 3 && data.dock.length <= 5.2, 'dock should be a short landing');
  check(data.dock.deckAboveWater > 0.18 && data.dock.deckAboveWater < 0.5, 'dock deck height');
  const deckY = data.waterLevel + data.dock.deckAboveWater;
  check(deckY > data.waterLevel, 'dock deck must clear the water');
  const bow = yawForward(data.canoe.yaw - Math.PI / 2);
  // Bow is local +X. Rotation.y sends local +X to (cos yaw, -sin yaw).
  const bowDir = { x: Math.cos(data.canoe.yaw), z: -Math.sin(data.canoe.yaw) };
  check(bowDir.z > 0.25, 'canoe bow should point toward the lake (+Z)');
  void bow;

  let zMin = Infinity;
  let zMax = -Infinity;
  for (let x = -8; x <= 8; x += 0.5) {
    const z = shoreZ(x);
    zMin = Math.min(zMin, z);
    zMax = Math.max(zMax, z);
  }
  check(zMax - zMin > 1.5, `shoreline is too straight (range ${ (zMax - zMin).toFixed(2) }m)`);

  const waterProbe = terrainHeight(0, shoreZ(0) + 2);
  check(waterProbe < data.waterLevel - 0.05, 'lake bed is not below the water line');
  const shoreProbe = terrainHeight(0, shoreZ(0) - 0.15);
  check(shoreProbe > data.waterLevel - 0.02 && shoreProbe < data.waterLevel + 0.2, 'water edge height does not meet the lake');

  check(data.pines.length >= 12, 'not enough trees for a layered shore');
  const treeKinds = new Set(data.pines.map((p) => p.kind));
  for (const k of ['pine', 'spruce', 'cedar', 'snag', 'sapling']) {
    check(treeKinds.has(k), `missing tree silhouette: ${k}`);
  }
  const heights = data.pines.map((p) => p.h);
  const hMean = heights.reduce((s, h) => s + h, 0) / heights.length;
  const hStd = Math.sqrt(heights.reduce((s, h) => s + (h - hMean) ** 2, 0) / heights.length);
  check(hStd > 2.2, `tree heights are too uniform (stddev ${hStd.toFixed(2)})`);
  const leaned = data.pines.filter((p) => Math.hypot(p.leanX, p.leanZ) > 0.04).length;
  check(leaned >= 6, 'too many trees stand perfectly upright');
  for (let i = 0; i < data.pines.length; i++) {
    for (let j = i + 1; j < data.pines.length; j++) {
      const d = Math.hypot(data.pines[i].x - data.pines[j].x, data.pines[i].z - data.pines[j].z);
      check(d > 1.35, `${data.pines[i].id} overlaps ${data.pines[j].id} (${d.toFixed(2)}m)`);
    }
  }
  const shrubKinds = new Set(data.shrubs.map((s) => s.kind));
  check(shrubKinds.size >= 3, 'understory kinds are too repetitive');

  check(data.camera && data.cameraPresets.corner && data.cameraPresets.close, 'missing camera presets');
  const cams = [data.camera.position, data.cameraPresets.corner.position, data.cameraPresets.close.position];
  check(new Set(cams.map((p) => p.join(','))).size === 3, 'camera presets are not distinct');

  return { errors, stats: { hStd, shoreRange: zMax - zMin, gapStd: Math.sqrt(gapVar), tableDist } };
}
