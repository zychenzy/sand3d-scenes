/**
 * Railway dining car — placement only (no Three.js).
 *
 * Seat front is local +Z (GLB backrest is on -Z).
 * rotationY =  π/2 faces +X; rotationY = -π/2 faces -X.
 * Benches oppose across a table that is long along the carriage (Z).
 * The spine of each table is one pedestal along that length.
 * Window tables are also bracketed to the window wall at each end,
 * clear of the bench footprints. The galley counter is wall-mounted.
 */

const SEAT_SCALE = 1 / 1.08;

export const SEAT = {
  height: 1,
  width: 1.465 * SEAT_SCALE,
  depth: 0.709 * SEAT_SCALE,
};

export const ROOM = {
  width: 3.5,
  depth: 14.6,
  height: 2.48,
  wallInnerX: -1.72,
};

export const SURFACE_Y = 0.76;
export const TABLE_WIDTH = 0.58;

const WINDOW_Z = [-3.6, -1.8, 0, 1.8, 3.6];
const GROUPS = [
  { id: 'a', windows: [-3.6, -1.8], setting: 'set' },
  { id: 'b', windows: [1.8, 3.6], setting: 'mugs' },
];

const SETTINGS = {
  set: [
    { kind: 'flowerpot', along: 0, across: 0, rot: 0.2 },
    { kind: 'cup_mug', along: -1.2, across: 0.08, rot: 0.5 },
    { kind: 'cup_mug', along: 1.15, across: -0.06, rot: 1.4 },
    { kind: 'jam_jar', along: 0.55, across: -0.1, rot: 0.3 },
    { kind: 'cup_mug', along: -0.35, across: 0.1, rot: 2.2 },
  ],
  mugs: [
    { kind: 'cup_mug', along: -0.9, across: 0.06, rot: 0.8 },
    { kind: 'cup_mug', along: 0.7, across: -0.05, rot: 1.9 },
    { kind: 'jam_jar', along: 0.05, across: 0.08, rot: 0.4 },
  ],
  menu: [{ kind: 'cup_mug', along: -0.4, across: 0.05, rot: 1.1 }],
};

export function facingAxis(rotationY) {
  return { x: Math.sin(rotationY), z: Math.cos(rotationY) };
}

function tableForGroup(group) {
  const halfW = SEAT.width / 2;
  const zMin = group.windows[0] - halfW;
  const zMax = group.windows[1] + halfW;
  const overhang = 0.34;
  return {
    id: `table-${group.id}`,
    side: 'window',
    support: 'wall-mounted',
    pedestal: 'long',
    x: -0.64,
    width: TABLE_WIDTH,
    z0: zMin - overhang,
    z1: zMax + overhang,
    surfaceY: SURFACE_Y,
    setting: group.setting,
    brackets: [zMin - overhang + 0.14, zMax + overhang - 0.14],
  };
}

export function buildScenePlan() {
  const tables = GROUPS.map(tableForGroup);
  const seats = [];
  for (const group of GROUPS) {
    const table = tables.find((t) => t.id === `table-${group.id}`);
    for (const z of group.windows) {
      seats.push({
        id: `seat-${group.id}-w-${z}`,
        side: 'window',
        tableId: table.id,
        x: -1.312,
        y: 0,
        z,
        rotationY: Math.PI / 2,
      });
      seats.push({
        id: `seat-${group.id}-a-${z}`,
        side: 'aisle',
        tableId: table.id,
        x: 0.05,
        y: 0,
        z,
        rotationY: -Math.PI / 2,
      });
    }
  }

  const curtains = [0.18, 0.55, 0.12, 0.88, 0.28];
  const blinds = [0, 0.2, 0, 0, 0.16];
  const saloonWindows = WINDOW_Z.map((z, i) => ({
    z,
    w: 1.05,
    sill: 1.08,
    head: 1.9,
    role: 'bay',
    curtain: curtains[i],
    blind: blinds[i],
  }));
  saloonWindows.push({
    z: 6.15,
    w: 0.62,
    sill: 1.08,
    head: 1.9,
    role: 'vestibule',
    curtain: 0.1,
    blind: 0,
  });

  const serviceWindows = [-6.55, -5.9, -5.25].map((z) => ({
    z,
    w: 0.42,
    sill: 1.52,
    head: 1.92,
    role: 'galley',
    curtain: 0,
    blind: 0,
  }));

  const piers = [];
  for (let i = 0; i < WINDOW_Z.length - 1; i++) piers.push((WINDOW_Z[i] + WINDOW_Z[i + 1]) / 2);

  const lamps = [];
  for (const table of tables) {
    const cz = (table.z0 + table.z1) / 2;
    for (const z of [cz - 0.85, cz + 0.85]) {
      lamps.push({
        id: `pend-${table.id}-${z.toFixed(2)}`,
        kind: 'pendant',
        x: table.x,
        y: 1.7,
        z,
        intensity: 8,
        distance: 5.2,
        color: 0xffc48a,
      });
    }
  }
  for (const z of piers) {
    lamps.push({
      id: `sconce-${z.toFixed(2)}`,
      kind: 'sconce',
      x: -1.5,
      y: 1.5,
      z,
      intensity: 1.6,
      distance: 3.4,
      color: 0xffb067,
    });
  }
  lamps.push({
    id: 'galley-hood',
    kind: 'galley',
    x: -1.15,
    y: 1.38,
    z: -5.85,
    intensity: 2.2,
    distance: 3.4,
    color: 0xff8a4a,
  });

  const instances = [];
  for (const seat of seats) {
    instances.push({
      id: seat.id,
      kind: 'train_seat',
      position: [seat.x, seat.y, seat.z],
      rotationY: seat.rotationY,
    });
  }
  for (const table of tables) {
    const cz = (table.z0 + table.z1) / 2;
    for (const z of [cz - 0.85, cz + 0.85]) {
      instances.push({
        id: `lamp-${table.id}-${z.toFixed(2)}`,
        kind: 'pendant_lamp',
        position: [table.x, 1.5, z],
        rotationY: 0.3,
      });
    }
    const limitAlong = (table.z1 - table.z0) / 2 - 0.15;
    const limitAcross = table.width / 2 - 0.08;
    (SETTINGS[table.setting] || []).forEach((prop, n) => {
      const along = Math.max(-limitAlong, Math.min(limitAlong, prop.along));
      const across = Math.max(-limitAcross, Math.min(limitAcross, prop.across));
      instances.push({
        id: `${table.id}-${prop.kind}-${n}`,
        kind: prop.kind,
        position: [table.x + across, table.surfaceY, cz + along],
        rotationY: prop.rot,
      });
    });
  }

  instances.push(
    { id: 'g-thermos', kind: 'thermos', position: [-1.22, 0.92, -6.35], rotationY: 1.15 },
    { id: 'g-jar', kind: 'jam_jar', position: [-1.42, 0.92, -5.7], rotationY: 0.4 },
    { id: 'g-jar-shelf', kind: 'jam_jar', position: [-1.5, 1.46, -6.4], rotationY: 0.2 },
    { id: 'g-can', kind: 'canister', position: [-1.18, 1.46, -5.85], rotationY: 0.6 },
    { id: 'g-mug1', kind: 'cup_mug', position: [-1.02, 0.92, -6.55], rotationY: 0.8 },
    { id: 'g-mug2', kind: 'cup_mug', position: [-0.95, 0.92, -5.45], rotationY: 2.1 },
    { id: 'g-mug3', kind: 'cup_mug', position: [-1.38, 1.46, -5.4], rotationY: 1.0 },
    { id: 'side-jar', kind: 'jam_jar', position: [1.36, 0.4, -2.4], rotationY: 0.5 },
    { id: 'side-mug', kind: 'cup_mug', position: [1.32, 0.4, 2.15], rotationY: 1.2 },
  );

  const counters = [
    {
      id: 'galley-counter',
      support: 'wall-mounted',
      pedestal: 'none',
      x0: ROOM.wallInnerX,
      x1: -0.78,
      z0: -6.95,
      z1: -5.15,
      surfaceY: 0.92,
    },
  ];

  const luggage = [
    { id: 'bag-1', kind: 'case', x: -1.44, bottom: 1.96, z: -3.45, w: 0.32, h: 0.36, d: 0.56, rot: 0.08, color: '#243028' },
    { id: 'bag-2', kind: 'case', x: -1.4, bottom: 1.96, z: -2.15, w: 0.3, h: 0.28, d: 0.5, rot: -0.15, color: '#e2c48a' },
    { id: 'bag-3', kind: 'case', x: -1.46, bottom: 1.96, z: 2.05, w: 0.32, h: 0.38, d: 0.5, rot: 0.05, color: '#6a2428' },
    { id: 'hat-1', kind: 'hat', x: 1.4, bottom: 1.96, z: 0.2, r: 0.16, h: 0.14, rot: 0, color: '#1c2428' },
    { id: 'bag-shelf', kind: 'case', x: 1.38, bottom: 0.4, z: -1.15, w: 0.26, h: 0.42, d: 0.36, rot: 0.6, color: '#3a2a22' },
    { id: 'bag-vest', kind: 'case', x: -1.38, bottom: 0.02, z: 6.2, w: 0.28, h: 0.56, d: 0.4, rot: 0.4, color: '#4a3a2a' },
    { id: 'bag-vest-2', kind: 'case', x: -1.05, bottom: 0.02, z: 6.45, w: 0.24, h: 0.32, d: 0.38, rot: -0.5, color: '#1f3a44' },
  ];

  return {
    room: ROOM,
    seat: SEAT,
    tables,
    seats,
    counters,
    saloonWindows,
    serviceWindows,
    piers,
    lamps,
    instances,
    luggage,
    windowZ: WINDOW_Z,
    racks: {
      window: { xInner: -1.66, depth: 0.36, y: 1.94, z0: -4.4, z1: 4.4, brackets: [-4.2, ...piers, 4.2] },
      aisle: { xInner: 1.62, depth: 0.32, y: 1.98, z0: -4.3, z1: 4.4, brackets: [-3.2, 0, 3.2] },
    },
    zones: {
      galley: { z0: -7.3, z1: -4.78, bulkhead: -4.78 },
      saloon: { z0: -4.78, z1: 5.05 },
      vestibule: { z0: 5.05, z1: 7.3, bulkhead: 5.05 },
    },
  };
}

export const PLAN = buildScenePlan();
