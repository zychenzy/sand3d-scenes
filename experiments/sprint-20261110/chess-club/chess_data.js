/** Placement math shared by the scene and the node test. No Three.js. */

export const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR';
export const TABLE_H = 0.75;
export const CHAIR_DIST = 0.7;

export function parseFen(fen) {
  const rows = String(fen).split(' ')[0].split('/');
  if (rows.length !== 8) throw new Error(`fen needs 8 ranks, got ${rows.length}`);
  const pieces = [];
  rows.forEach((row, r) => {
    let file = 0;
    for (const ch of row) {
      if (ch >= '1' && ch <= '8') {
        file += Number(ch);
      } else {
        const type = ch.toLowerCase();
        if (!'prnbqk'.includes(type)) throw new Error(`bad piece ${ch}`);
        pieces.push({
          type,
          color: ch === ch.toUpperCase() ? 'w' : 'b',
          file,
          rank: 7 - r,
        });
        file += 1;
      }
    }
    if (file !== 8) throw new Error(`rank width ${row}`);
  });
  return pieces;
}

/** Three.js Y rotation: local +Z maps to (sin yaw, cos yaw). */
export function localToWorld(lx, lz, yaw, ox, oz) {
  const c = Math.cos(yaw);
  const s = Math.sin(yaw);
  return [ox + lx * c + lz * s, oz - lx * s + lz * c];
}

/** Yaw whose forward (+Z at 0) points from (x,z) toward (tx,tz). */
export function yawToward(x, z, tx, tz) {
  return Math.atan2(tx - x, tz - z);
}

function seatsFor(table) {
  if (table.seats === 'near') {
    return [-0.36, 0.36].map((lx, i) => ({
      id: `${table.id}_chair_${i}`,
      lx,
      lz: CHAIR_DIST,
      role: 'analysis',
    }));
  }
  return [
    { id: `${table.id}_white`, lx: 0, lz: CHAIR_DIST, role: 'white' },
    { id: `${table.id}_black`, lx: 0, lz: -CHAIR_DIST, role: 'black' },
  ];
}

function pushLook(instances, id, kind, x, z, lookAt, extra = {}) {
  instances.push({
    id,
    kind,
    position: [x, extra.y ?? 0, z],
    rotationY: yawToward(x, z, lookAt[0], lookAt[1]),
    lookAt,
    ...extra,
    y: undefined,
  });
}

/**
 * Expand composition into layout.instances and warm point lights.
 * Chairs always look at a table center (opponents across a board, or the
 * analysis / reading surface).
 */
export function expandComposition(layout) {
  const comp = layout.composition;
  const instances = [];
  const points = [];

  for (const table of comp.tables) {
    const [x, , z] = table.position;
    const yaw = table.yaw || 0;
    instances.push({
      id: `${table.id}_table`,
      kind: 'square_table',
      position: [x, 0, z],
      rotationY: yaw,
    });

    for (const seat of seatsFor(table)) {
      const [wx, wz] = localToWorld(seat.lx, seat.lz, yaw, x, z);
      pushLook(instances, seat.id, 'dining_chair', wx, wz, [x, z], { role: seat.role });
    }

    if (table.pendant) {
      const py = table.pendantY ?? 2.05;
      instances.push({
        id: `${table.id}_pendant`,
        kind: 'pendant_lamp',
        position: [x, py, z],
        rotationY: 0,
      });
      points.push({
        color: 16765194,
        intensity: table.id === 'featured' ? 4.2 : 3.2,
        distance: 5.2,
        decay: 2,
        position: [x, py + 0.16, z],
      });
    }

    if (table.lamp) {
      const [lx, lz] = localToWorld(table.lamp.lx, table.lamp.lz, yaw, x, z);
      instances.push({
        id: `${table.id}_lamp`,
        kind: 'library_lamp',
        position: [lx, TABLE_H, lz],
        rotationY: yaw + (table.lamp.yaw || 0),
      });
      points.push({
        color: 16770480,
        intensity: 2.6,
        distance: 3.6,
        decay: 2,
        position: [lx, TABLE_H + 0.28, lz],
      });
    }

    if (table.mug) {
      const [mx, mz] = localToWorld(table.mug.lx, table.mug.lz, yaw, x, z);
      instances.push({
        id: `${table.id}_mug`,
        kind: 'cup_mug',
        position: [mx, TABLE_H, mz],
        rotationY: table.mug.yaw || 0.5,
      });
    }
  }

  for (const v of comp.viewers || []) {
    const [x, y, z] = v.position;
    pushLook(instances, v.id, 'dining_chair', x, z, v.lookAt, { y, role: 'viewer' });
  }

  if (comp.reading) {
    const [tx, , tz] = comp.reading.table;
    const [cx, , cz] = comp.reading.chair;
    pushLook(instances, 'reading_chair', 'dining_chair', cx, cz, [tx, tz], { role: 'reading' });
  }

  for (const p of comp.props || []) instances.push({ ...p });

  for (const s of comp.sconces || []) {
    // Keep the pool off the plaster. A light sitting on the wall becomes a white disc.
    points.push({
      color: s.color ?? 16760816,
      intensity: 0.55,
      distance: 2.6,
      decay: 2,
      position: [s.position[0], s.position[1] - 0.15, s.position[2] + 0.8],
    });
  }

  if (comp.floorLamp) {
    const [x, , z] = comp.floorLamp.position;
    points.push({
      color: 16765194,
      intensity: 3.2,
      distance: 4.4,
      decay: 2,
      position: [x, 1.55, z],
    });
  }

  layout.instances = instances;
  layout.lights = layout.lights || {};
  layout.lights.points = points;
  return layout;
}

export function validate(layout) {
  const errors = [];
  if (!layout.instances) errors.push('instances missing — expandComposition first');
  const tables = (layout.composition?.tables || []).map((t) => ({
    id: t.id,
    x: t.position[0],
    z: t.position[2],
  }));

  for (const inst of layout.instances || []) {
    if (!inst.lookAt) continue;
    const x = inst.position[0];
    const z = inst.position[2];
    const yaw = inst.rotationY || 0;
    const fx = Math.sin(yaw);
    const fz = Math.cos(yaw);
    const dx = inst.lookAt[0] - x;
    const dz = inst.lookAt[1] - z;
    const len = Math.hypot(dx, dz) || 1;
    const dot = (fx * dx + fz * dz) / len;
    if (dot < 0.985) errors.push(`${inst.id} not facing target (dot ${dot.toFixed(3)})`);

    if (inst.role === 'white' || inst.role === 'black' || inst.role === 'analysis') {
      const home = tables.find((t) => inst.id.startsWith(t.id));
      if (!home) errors.push(`${inst.id} has no table`);
      else {
        const d = Math.hypot(x - home.x, z - home.z);
        if (d < 0.62 || d > 0.92) errors.push(`${inst.id} seat distance ${d.toFixed(2)} m`);
      }
    }
    if (inst.role === 'viewer') {
      const d = Math.hypot(dx, dz);
      if (d < 0.9) errors.push(`${inst.id} viewer too close to look target (${d.toFixed(2)})`);
    }
  }

  const chairs = (layout.instances || []).filter((i) => i.kind === 'dining_chair');
  for (let i = 0; i < chairs.length; i++) {
    for (let j = i + 1; j < chairs.length; j++) {
      const d = Math.hypot(
        chairs[i].position[0] - chairs[j].position[0],
        chairs[i].position[2] - chairs[j].position[2],
      );
      if (d < 0.5) errors.push(`chairs overlap ${chairs[i].id} & ${chairs[j].id} (${d.toFixed(2)} m)`);
    }
  }

  for (const t of layout.composition?.tables || []) {
    const fen = t.fen === 'start' ? START_FEN : t.fen;
    let pieces = [];
    try {
      pieces = parseFen(fen);
    } catch (err) {
      errors.push(`${t.id} fen: ${err.message}`);
      continue;
    }
    const occ = new Set();
    let wk = 0;
    let bk = 0;
    for (const p of pieces) {
      const key = `${p.file},${p.rank}`;
      if (occ.has(key)) errors.push(`${t.id} two pieces on ${key}`);
      occ.add(key);
      if (p.type === 'k' && p.color === 'w') wk += 1;
      if (p.type === 'k' && p.color === 'b') bk += 1;
      if (p.file < 0 || p.file > 7 || p.rank < 0 || p.rank > 7) errors.push(`${t.id} off board`);
    }
    if (wk !== 1 || bk !== 1) errors.push(`${t.id} expected one king each (w${wk} b${bk})`);
    if (pieces.length < 8) errors.push(`${t.id} board looks empty (${pieces.length})`);
  }

  const roles = new Set((layout.instances || []).map((i) => i.role).filter(Boolean));
  for (const need of ['white', 'black', 'analysis', 'viewer']) {
    if (!roles.has(need)) errors.push(`missing chair role ${need}`);
  }
  return errors;
}
