/**
 * Steel-tip lane geometry. WDF Playing and Tournament Rules, rev 20 (2018):
 * bull centre 1.73 m, oche 38 mm high and 610 mm long, 2.37 m from the back
 * of the oche to the board face, published diagonal 2.93 m.
 * Ring radii are the regulation inside/outside wire edges.
 * Shared by the scene and the layout test so the two cannot drift.
 */

export const SPEC = {
  boardDiameter: 0.451,
  boardRadius: 0.2255,
  doubleOuter: 0.170,
  ringWidth: 0.008,
  trebleOuter: 0.1074,
  innerBullDiameter: 0.0127,
  outerBullDiameter: 0.0318,
  bullHeight: 1.73,
  throwDistance: 2.37,
  diagonalPublished: 2.93,
  ocheHeight: 0.038,
  ocheLength: 0.610,
  ocheDepth: 0.04,
  laneCount: 4,
  laneSpacing: 2,
  corridorHalf: 0.66,
  playerDepth: 0.85,
  wallThickness: 0.14,
  backerSize: 0.58,
  backerDepth: 0.02,
  boardThickness: 0.032,
  standHalfX: 0.14,
  standHalfZ: 0.16,
  tableNativeHeight: 1.184,
  tableNativeWidth: 1.2,
  tableHeight: 1.14,
  stoolReach: 0.86,
  stoolRadius: 0.24,
  chairRadius: 0.32,
  numbers: [20, 1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5],
};

export function doubleInner() {
  return SPEC.doubleOuter - SPEC.ringWidth;
}

export function trebleInner() {
  return SPEC.trebleOuter - SPEC.ringWidth;
}

export function diagonalExact() {
  return Math.hypot(SPEC.throwDistance, SPEC.bullHeight);
}

/** Index 0 is the 20, at the top, and it is the darker segment (WDF 4.02). */
export function isDarkSector(index) {
  return index % 2 === 0;
}

export function facingXZ(rotationY) {
  return { x: Math.sin(rotationY), z: Math.cos(rotationY) };
}

export function circleHitsAabb(x, z, radius, box) {
  const cx = Math.min(Math.max(x, box.minX), box.maxX);
  const cz = Math.min(Math.max(z, box.minZ), box.maxZ);
  return (x - cx) ** 2 + (z - cz) ** 2 < radius * radius - 1e-9;
}

export function segmentClearsCircle(ax, az, bx, bz, cx, cz, radius) {
  const dx = bx - ax;
  const dz = bz - az;
  const len2 = dx * dx + dz * dz || 1e-9;
  let t = ((cx - ax) * dx + (cz - az) * dz) / len2;
  t = Math.max(0, Math.min(1, t));
  const px = ax + t * dx;
  const pz = az + t * dz;
  return Math.hypot(px - cx, pz - cz) > radius;
}

/** A view ray may pass over furniture. It is blocked only when it also drops to the top. */
export function sightClears(ax, ay, az, bx, by, bz, cx, cz, radius, topY) {
  const dx = bx - ax;
  const dy = by - ay;
  const dz = bz - az;
  const len2 = dx * dx + dz * dz || 1e-9;
  let t = ((cx - ax) * dx + (cz - az) * dz) / len2;
  t = Math.max(0, Math.min(1, t));
  const px = ax + t * dx;
  const pz = az + t * dz;
  if (Math.hypot(px - cx, pz - cz) > radius) return true;
  return ay + t * dy > topY + 0.18;
}

export function plan(room) {
  const inner = SPEC.wallThickness / 2;
  const backInner = -room.depth / 2 + inner;
  const leftInner = -room.width / 2 + inner;
  const boardFaceZ = backInner + SPEC.backerDepth + SPEC.boardThickness;
  const ocheBackZ = boardFaceZ + SPEC.throwDistance;
  const throwEndZ = ocheBackZ + SPEC.playerDepth;
  const centers = [];
  for (let i = 0; i < SPEC.laneCount; i += 1) {
    centers.push((i - (SPEC.laneCount - 1) / 2) * SPEC.laneSpacing);
  }
  const boxes = centers.map((x) => ({
    x,
    minX: x - SPEC.corridorHalf,
    maxX: x + SPEC.corridorHalf,
    minZ: boardFaceZ,
    maxZ: throwEndZ,
  }));
  const stands = [
    {
      id: "stand_0",
      x: centers[0] - SPEC.corridorHalf - 0.3,
      z: ocheBackZ + 0.2,
      lane: 0,
    },
  ];
  for (let i = 0; i < centers.length - 1; i += 1) {
    stands.push({
      id: `stand_${i + 1}`,
      x: (centers[i] + centers[i + 1]) / 2,
      z: ocheBackZ + 0.2,
      lane: i + 1,
    });
  }
  const tableScale = SPEC.tableHeight / SPEC.tableNativeHeight;
  const tableHalf = (SPEC.tableNativeWidth * tableScale) / 2;
  const table = { x: 1.45, z: 1.55, top: SPEC.tableHeight, half: tableHalf };
  const stools = [
    { id: "stool_n", x: table.x, z: table.z - SPEC.stoolReach, rotationY: 0 },
    { id: "stool_s", x: table.x, z: table.z + SPEC.stoolReach, rotationY: Math.PI },
    { id: "stool_e", x: table.x + SPEC.stoolReach, z: table.z, rotationY: -Math.PI / 2 },
    { id: "stool_w", x: table.x - SPEC.stoolReach, z: table.z, rotationY: Math.PI / 2 },
  ];
  const chairs = [
    { id: "watch_a", x: -4.35, z: 1.15, rotationY: Math.PI / 2 },
    { id: "watch_b", x: -4.35, z: 2.15, rotationY: Math.PI / 2 },
  ];
  const shelf = { id: "shelf", x: leftInner + 0.16, y: 1.38, z: 1.9, rotationY: Math.PI / 2 };
  const lamp = { id: "lamp", x: table.x + 0.36, y: table.top, z: table.z - 0.26, rotationY: -0.4 };
  const mugs = [
    { id: "mug_a", x: table.x + 0.22, y: table.top, z: table.z + 0.12, rotationY: 0.4 },
    { id: "mug_b", x: table.x + 0.3, y: table.top, z: table.z - 0.1, rotationY: -0.6 },
  ];
  const pendants = [
    { id: "pend_a", x: table.x - 0.28, y: 2.42, z: table.z - 0.05, rotationY: 0.2 },
    { id: "pend_b", x: table.x + 0.28, y: 2.42, z: table.z + 0.04, rotationY: -0.3 },
  ];
  const spots = centers.map((x) => ({
    color: "#fff1d4",
    intensity: 9,
    distance: 3.4,
    angle: 0.4,
    penumbra: 0.42,
    decay: 1.6,
    position: [x, 2.74, boardFaceZ + 0.7],
    target: [x, SPEC.bullHeight, boardFaceZ],
  }));
  const camera = {
    default: { position: [-0.7, 1.68, 3.85], target: [-0.35, 1.42, -3.7] },
    corner: { position: [-4.55, 1.66, 3.42], target: [0.55, 1.22, -1.55] },
    close: { position: [-1.0, 1.8, boardFaceZ + 0.92], target: [-1.0, 1.8, boardFaceZ] },
  };
  camera.detail = camera.close;
  return {
    backInner,
    leftInner,
    boardFaceZ,
    ocheBackZ,
    throwEndZ,
    centers,
    boxes,
    stands,
    table,
    stools,
    chairs,
    shelf,
    lamp,
    mugs,
    pendants,
    spots,
    camera,
    bullY: SPEC.bullHeight,
  };
}

export const SCORES = [
  [501, 340],
  [265, 180],
  [121, 85],
  [40, 32],
];

/** Darts stuck in the sisal, offsets in metres from the bull, +Y up. */
export const STUCK = [
  [{ dx: 0.05, dy: -0.09, color: "#c4382e" }],
  [
    { dx: -0.014, dy: 0.102, color: "#c4382e" },
    { dx: 0.001, dy: 0.108, color: "#1f7a48" },
    { dx: 0.014, dy: 0.098, color: "#efe6d2" },
  ],
  [
    { dx: 0.09, dy: 0.02, color: "#24527a" },
    { dx: -0.11, dy: -0.07, color: "#c4382e" },
  ],
  [{ dx: 0.003, dy: 0.004, color: "#efe6d2" }],
];
