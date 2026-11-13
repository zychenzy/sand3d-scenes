/**
 * Gold Line — 18 m indoor target range.
 * Metres, Y up. Archers stand at larger Z and shoot toward -Z.
 * Distance is the target-side edge of the shooting line to the white
 * face of each butt (World Archery Book 2: 18 m ± 10 cm indoors).
 * The waiting line is 3 m behind that edge. The equipment line is 4 m
 * behind the waiting line. A 3 m line sits in front of the shooting line.
 */

export const RANGE = {
  faceZ: 1.2,
  distance: 18,
  waitingGap: 3,
  equipmentGap: 4,
  lineW: 0.05,
  centerY: 1.3,
  spotGap: 0.42,
  faceD: 0.4,
  /** White-ring front, local Z after prepareAsset at scale 1. */
  faceLocalZ: 0.179,
  buttAnchorZ: 1.021,
  lanePitch: 1.8,
  lanes: [-2.7, -0.9, 0.9, 2.7],
  corridorHalf: 0.4,
  /** Past arrow relief in the faces. Furniture may not enter this Z. */
  corridorZ0: 1.55,
  minAthlete: 0.8,
  quiverSide: 0.82,
  quiverZ: 19.78,
  room: { x0: -5.2, x1: 5.2, z0: -0.28, z1: 28.15, h: 4.85 },
};

export function lines() {
  const shoot = RANGE.faceZ + RANGE.distance;
  const wait = shoot + RANGE.waitingGap;
  const equip = wait + RANGE.equipmentGap;
  const three = shoot - 3;
  return { shoot, wait, equip, three };
}

/** Procedural furniture the scene builder places. Tops stay out of the lanes. */
export const BUILT = {
  prepA: { x: -1.7, z: 24.55, w: 2.3, d: 0.68, y0: 0.45, y1: 0.86 },
  prepB: { x: 1.05, z: 24.55, w: 2.1, d: 0.68, y0: 0.45, y1: 0.86 },
  rack: { x0: -5.08, x1: -4.48, z0: 23.42, z1: 25.82, y0: 0.2, y1: 1.62 },
};

export function pathways() {
  return [
    { id: 'cross', x0: -3.5, x1: 4.65, z0: 22.32, z1: 23.22 },
    { id: 'entrance', x0: 3.9, x1: 5.05, z0: 22.32, z1: 27.95 },
  ];
}

/** Half-extents in X/Z after the instance rotation used in layout.json. */
const FOOT = {
  indoor_butt: [0.46, 0.21, 2.04],
  ground_quiver: [0.16, 0.16, 0.84],
  recurve_walnut: [0.2, 0.06, 1.7],
  recurve_ink: [0.2, 0.06, 1.7],
  recurve_forest: [0.2, 0.06, 1.7],
  recurve_honey: [0.2, 0.06, 1.7],
  hip_quiver: [0.18, 0.18, 0.52],
  museum_bench: [0.78, 0.25, 0.55],
  square_table: [0.52, 0.52, 0.78],
  dining_chair: [0.3, 0.3, 0.9],
  library_lamp: [0.14, 0.14, 0.45],
  thermos: [0.1, 0.1, 0.3],
  cup_mug: [0.07, 0.07, 0.12],
  flowerpot: [0.16, 0.16, 0.45],
  pendant_lamp: [0.22, 0.22, 0.7],
  wall_shelf: [0.2, 0.45, 0.4],
  chalkboard: [0.22, 0.78, 1.2],
};

function overlap(a, b) {
  return a.x0 < b.x1 && a.x1 > b.x0 && a.z0 < b.z1 && a.z1 > b.z0 && a.y0 < b.y1 && a.y1 > b.y0;
}

export function instanceBox(inst) {
  const foot = FOOT[inst.kind];
  if (!foot) return null;
  const [hx, hz, h] = foot;
  const y = inst.position[1];
  return {
    id: inst.id,
    kind: inst.kind,
    x0: inst.position[0] - hx,
    x1: inst.position[0] + hx,
    z0: inst.position[2] - hz,
    z1: inst.position[2] + hz,
    y0: y,
    y1: y + h,
  };
}

export function builtBoxes() {
  const out = [];
  for (const key of ['prepA', 'prepB']) {
    const b = BUILT[key];
    out.push({
      id: key,
      x0: b.x - b.w / 2,
      x1: b.x + b.w / 2,
      z0: b.z - b.d / 2,
      z1: b.z + b.d / 2,
      y0: b.y0,
      y1: b.y1,
    });
  }
  const r = BUILT.rack;
  out.push({ id: 'rack', x0: r.x0, x1: r.x1, z0: r.z0, z1: r.z1, y0: r.y0, y1: r.y1 });
  return out;
}

function corridors() {
  const { shoot } = lines();
  return RANGE.lanes.map((x, i) => ({
    id: `lane_${i + 1}`,
    x0: x - RANGE.corridorHalf,
    x1: x + RANGE.corridorHalf,
    z0: RANGE.corridorZ0,
    z1: shoot,
    y0: 0.05,
    y1: 2.3,
  }));
}

/** Forward is +Z at rotationY 0. */
export function forward(yaw) {
  return { x: Math.sin(yaw), z: Math.cos(yaw) };
}

export function audit(layout) {
  const errors = [];
  const L = lines();
  if (Math.abs(L.shoot - RANGE.faceZ - RANGE.distance) > 1e-9) errors.push('shooting distance');
  if (Math.abs(RANGE.distance - 18) > 1e-9) errors.push('distance is not 18 m');
  if (Math.abs(L.wait - L.shoot - 3) > 1e-9) errors.push('waiting line is not 3 m behind the shooting line');
  if (Math.abs(L.equip - L.wait - 4) > 1e-9) errors.push('equipment line is not 4 m behind the waiting line');
  if (Math.abs(L.three - (L.shoot - 3)) > 1e-9) errors.push('3 m line');
  if (Math.abs(RANGE.buttAnchorZ + RANGE.faceLocalZ - RANGE.faceZ) > 1e-9) errors.push('butt anchor does not put the white face at faceZ');
  if (Math.abs(RANGE.centerY - 1.3) > 1e-9) errors.push('face centre is not 1.30 m');

  for (let i = 1; i < RANGE.lanes.length; i++) {
    const gap = RANGE.lanes[i] - RANGE.lanes[i - 1];
    if (gap + 1e-9 < RANGE.minAthlete) errors.push(`athlete spacing ${gap} < ${RANGE.minAthlete}`);
    if (Math.abs(gap - RANGE.lanePitch) > 1e-9) errors.push('lane pitch drifted');
  }

  const boxes = [];
  const byKind = {};
  for (const inst of layout.instances || []) {
    byKind[inst.kind] = byKind[inst.kind] || [];
    byKind[inst.kind].push(inst);
    const box = instanceBox(inst);
    if (!box) errors.push(`no footprint for ${inst.kind}`);
    else boxes.push(box);
  }

  const butts = byKind.indoor_butt || [];
  if (butts.length !== RANGE.lanes.length) errors.push(`expected ${RANGE.lanes.length} butts, got ${butts.length}`);
  const buttX = butts.map((b) => b.position[0]).sort((a, b) => a - b);
  RANGE.lanes.forEach((x, i) => {
    if (!buttX.length) return;
    if (Math.abs(buttX[i] - x) > 1e-6) errors.push(`butt ${i + 1} x ${buttX[i]} != lane ${x}`);
  });
  for (const b of butts) {
    if (Math.abs(b.position[2] - RANGE.buttAnchorZ) > 1e-6) errors.push(`${b.id} not on the butt line`);
    if (Math.abs(b.position[1]) > 1e-6) errors.push(`${b.id} raised`);
    if (b.rotationY) errors.push(`${b.id} rotated off the shooting axis`);
  }

  const quivers = byKind.ground_quiver || [];
  if (quivers.length !== RANGE.lanes.length) errors.push('one ground quiver per lane');
  for (const q of quivers) {
    const lane = RANGE.lanes.reduce((best, x) => (Math.abs(x - q.position[0]) < Math.abs(best - q.position[0]) ? x : best), RANGE.lanes[0]);
    if (Math.abs(q.position[0] - (lane + RANGE.quiverSide)) > 1e-6) errors.push(`${q.id} not on the lane shoulder`);
    if (!(q.position[2] > L.shoot + RANGE.lineW && q.position[2] < L.wait)) errors.push(`${q.id} not between shooting and waiting lines`);
    const inner = q.position[0] - 0.16;
    if (inner < lane + RANGE.corridorHalf) errors.push(`${q.id} cuts the arrow corridor`);
  }

  const bowKinds = ['recurve_walnut', 'recurve_ink', 'recurve_forest', 'recurve_honey'];
  const bows = (layout.instances || []).filter((i) => bowKinds.includes(i.kind));
  if (bows.length < 4) errors.push('bow rack wants four bows');
  for (const b of bows) {
    if (!(b.position[2] > L.wait && b.position[2] < L.equip)) errors.push(`${b.id} not in the preparation bay`);
    if (b.position[0] > -3.6) errors.push(`${b.id} stands in the cross aisle`);
  }

  for (const q of byKind.hip_quiver || []) {
    if (q.position[2] < L.wait) errors.push(`${q.id} hip quiver is in front of the waiting line`);
    if (q.position[0] > -3.6) errors.push(`${q.id} hip quiver hangs over the aisle`);
  }

  const benches = byKind.museum_bench || [];
  if (benches.length < 2) errors.push('waiting benches missing');
  for (const b of benches) {
    if (b.position[2] < L.equip) errors.push(`${b.id} bench is in front of the equipment line`);
    const yaw = b.rotationY ?? 0;
    // This bench bake is long in local Z. Yaw near ±90° lays that length across the lanes
    // so a sitter looks downrange instead of along the hall.
    if (Math.abs(Math.sin(yaw)) < 0.7) errors.push(`${b.id} runs down the room instead of across it`);
  }

  const table = (byKind.square_table || [])[0];
  const chairs = byKind.dining_chair || [];
  if (!table) errors.push('scoring table missing');
  if (chairs.length < 2) errors.push('scoring chairs missing');
  if (table) {
    if (table.position[2] < L.equip) errors.push('scoring table is in front of the equipment line');
    for (const c of chairs) {
      const dx = table.position[0] - c.position[0];
      const dz = table.position[2] - c.position[2];
      const dist = Math.hypot(dx, dz);
      if (dist < 0.45 || dist > 1.2) errors.push(`${c.id} is not seated at the table (${dist.toFixed(2)} m)`);
      const f = forward(c.rotationY ?? 0);
      const dot = f.x * dx + f.z * dz;
      if (dot < 0.25) errors.push(`${c.id} faces away from the scoring table`);
    }
  }

  const lanes = corridors();
  for (const box of boxes.concat(builtBoxes())) {
    if (box.kind === 'indoor_butt') continue;
    for (const lane of lanes) {
      if (overlap(box, lane)) errors.push(`${box.id} blocks ${lane.id}`);
    }
  }

  for (const path of pathways()) {
    const slab = { ...path, y0: 0.15, y1: 2.05 };
    for (const box of boxes.concat(builtBoxes())) {
      if (box.kind === 'pendant_lamp') continue;
      if (overlap(box, slab)) errors.push(`${box.id} stands in the ${path.id} path`);
    }
  }

  const shared = ['museum_bench', 'square_table', 'dining_chair', 'library_lamp', 'thermos', 'cup_mug', 'flowerpot', 'pendant_lamp', 'wall_shelf', 'chalkboard'];
  for (const kind of shared) {
    const spec = layout.assets?.[kind];
    if (!spec) errors.push(`missing shared asset ${kind}`);
    else if (!String(spec.glb).startsWith('../../../')) errors.push(`${kind} is not a repo-root reference`);
  }
  for (const kind of ['indoor_butt', 'ground_quiver', 'hip_quiver', ...bowKinds]) {
    const spec = layout.assets?.[kind];
    if (!spec) errors.push(`missing baked asset ${kind}`);
    else if (!String(spec.glb).startsWith('./assets/')) errors.push(`${kind} should be a scene-local bake`);
  }

  return errors;
}
