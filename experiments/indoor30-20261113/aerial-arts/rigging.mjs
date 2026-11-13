/** Clearance and rigging checks for the Span Room. Pure: pass a layout object. */

function hypot(a, b) {
  return Math.sqrt(a * a + b * b);
}

export function matRect(station, mat) {
  return {
    id: station.id,
    x0: station.x - mat.w / 2,
    x1: station.x + mat.w / 2,
    z0: station.z - mat.d / 2,
    z1: station.z + mat.d / 2,
  };
}

export function pointRectDistance(px, pz, rect) {
  const dx = Math.max(rect.x0 - px, 0, px - rect.x1);
  const dz = Math.max(rect.z0 - pz, 0, pz - rect.z1);
  return hypot(dx, dz);
}

function footprint(inst, spec) {
  let hx = spec.hx;
  let hz = spec.hz;
  const ang = Math.abs(inst.rotationY || 0) % Math.PI;
  if (Math.abs(ang - Math.PI / 2) < 0.25) {
    const swap = hx;
    hx = hz;
    hz = swap;
  }
  const x = inst.position[0];
  const z = inst.position[2];
  return { id: inst.id, x0: x - hx, x1: x + hx, z0: z - hz, z1: z + hz, y: inst.position[1] };
}

function facing(rotationY) {
  return { x: Math.sin(rotationY || 0), z: Math.cos(rotationY || 0) };
}

function samplePath(path) {
  const pts = [];
  for (let i = 0; i < path.pts.length - 1; i++) {
    const a = path.pts[i];
    const b = path.pts[i + 1];
    const len = hypot(b[0] - a[0], b[1] - a[1]) || 0.001;
    const steps = Math.max(1, Math.ceil(len / 0.2));
    for (let s = 0; s <= steps; s++) {
      const t = s / steps;
      pts.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
    }
  }
  return pts;
}

function insideRect(x, z, rect) {
  return x >= rect.x0 && x <= rect.x1 && z >= rect.z0 && z <= rect.z1;
}

export function audit(layout) {
  const errors = [];
  const arch = layout.architecture;
  const mat = arch.mat;
  const mats = layout.stations.map((s) => matRect(s, mat));
  const room = layout.meta.room;
  if (room.height < 7 || room.width < 16 || room.depth < 12) {
    errors.push(`room too small for an aerial bay: ${room.width}×${room.depth}×${room.height}`);
  }
  if (arch.beamBottom < 6.3) errors.push('rigging beam is too low');
  if (arch.beamDepth < 0.3) errors.push('beam is too shallow to read as structure');
  if (!arch.ewZ.includes(arch.rigZ)) errors.push('rig line is not on an east-west beam');
  if (mat.h < 0.3) errors.push('landing mats are thinner than a crash pad');

  const silks = layout.stations.filter((s) => s.kind === 'silk');
  const lyras = layout.stations.filter((s) => s.kind === 'lyra');
  if (silks.length < 2) errors.push('need two silks');
  if (lyras.length < 2) errors.push('need two lyras');

  for (const s of layout.stations) {
    if (Math.abs(s.z - arch.rigZ) > 0.001) errors.push(`${s.id} is off the rig beam`);
    if (!arch.nsX.includes(s.x)) errors.push(`${s.id} is not under a north-south beam`);
    if (s.x <= arch.soffit.x1) errors.push(`${s.id} hangs inside the warmup soffit`);
    if (s.x >= arch.canopy.x0) errors.push(`${s.id} hangs inside the waiting canopy`);
    const pad = 0.95;
    if (mat.w / 2 < pad || mat.d / 2 < pad) errors.push(`${s.id} mat does not clear the point by ${pad} m`);
    if (s.kind === 'lyra') {
      const matTop = mat.lift + mat.h;
      if (s.bottom < matTop + 0.75) errors.push(`${s.id} hoop is too close to the mat`);
      const top = s.bottom + s.radius * 2;
      if (arch.beamBottom - top < 1.4) errors.push(`${s.id} spanset run is too short`);
      if (s.radius < 0.45 || s.radius > 0.58) errors.push(`${s.id} lyra diameter is off a 1 m hoop`);
    }
  }

  for (let i = 0; i < layout.stations.length; i++) {
    for (let j = i + 1; j < layout.stations.length; j++) {
      const a = layout.stations[i];
      const b = layout.stations[j];
      const d = hypot(a.x - b.x, a.z - b.z);
      if (d < 2.7) errors.push(`${a.id} and ${b.id} are only ${d.toFixed(2)} m apart`);
    }
  }

  const floorProps = [];
  for (const inst of layout.instances) {
    const spec = layout.assets[inst.kind];
    if (!spec) {
      errors.push(`missing asset ${inst.kind}`);
      continue;
    }
    if (spec.floor) floorProps.push(footprint(inst, spec));
    if (spec.on) {
      const host = layout.instances.find((item) => item.id === spec.on);
      const hostSpec = host && layout.assets[host.kind];
      if (!host || !hostSpec) {
        errors.push(`${inst.id} has no host ${spec.on}`);
      } else {
        const dx = Math.abs(inst.position[0] - host.position[0]);
        const dz = Math.abs(inst.position[2] - host.position[2]);
        if (dx > hostSpec.hx - 0.08 || dz > hostSpec.hz - 0.08) {
          errors.push(`${inst.id} sits off ${spec.on}`);
        }
        if (Math.abs(inst.position[1] - hostSpec.targetHeight) > 0.03) {
          errors.push(`${inst.id} is not on the table top`);
        }
      }
    }
  }

  for (const prop of floorProps) {
    for (const rect of mats) {
      const gap = pointRectDistance((prop.x0 + prop.x1) / 2, (prop.z0 + prop.z1) / 2, rect);
      const reach = Math.max(prop.x1 - prop.x0, prop.z1 - prop.z0) / 2;
      const need = prop.id === 'wait_bench' ? 0.85 : 0.5;
      if (gap - reach < need) errors.push(`${prop.id} is inside the landing margin of ${rect.id}`);
    }
  }

  const bench = layout.instances.find((item) => item.id === 'wait_bench');
  if (!bench) errors.push('missing waiting bench');
  else {
    if (bench.position[0] < arch.canopy.x0) errors.push('bench is not under the waiting canopy');
    if (bench.position[2] < arch.lineZ + 0.6) errors.push('bench is not south of the wait line');
    const fp = footprint(bench, layout.assets.museum_bench);
    if (fp.x1 > arch.outer.x1 - arch.wall) errors.push('bench intersects the east wall');
  }

  const chair = layout.instances.find((item) => item.id === 'warmup_chair');
  const table = layout.instances.find((item) => item.id === 'warmup_table');
  if (chair && table) {
    const face = facing(chair.rotationY);
    const dx = table.position[0] - chair.position[0];
    const dz = table.position[2] - chair.position[2];
    const dot = face.x * dx + face.z * dz;
    if (dot < 0.35) errors.push('warmup chair does not face the table');
    if (table.position[0] > arch.soffit.x1 - 0.6) errors.push('warmup table has left the side bay');
  } else errors.push('warmup table or chair missing');

  const shelf = layout.instances.find((item) => item.id === 'grip_shelf');
  if (!shelf || shelf.position[0] > arch.outer.x0 + arch.wall + 0.45) {
    errors.push('grip shelf is not on the west wall');
  }

  for (const inst of layout.instances.filter((item) => item.kind === 'pendant_lamp')) {
    const x = inst.position[0];
    const inWarm = x < arch.soffit.x1 - 0.4;
    const inWait = x > arch.canopy.x0;
    if (!inWarm && !inWait) errors.push(`${inst.id} hangs over the aerial bay`);
    if (inst.position[1] < 2.4) errors.push(`${inst.id} hangs too low`);
  }

  const obstacles = [
    ...arch.posts.map((post) => ({ id: 'post', kind: 'circle', x: post.x, z: post.z, r: post.r })),
    { id: 'cubby', kind: 'rect', ...arch.cubby },
    {
      id: 'roller',
      kind: 'rect',
      x0: arch.roller.x - arch.roller.hx,
      x1: arch.roller.x + arch.roller.hx,
      z0: arch.roller.z - arch.roller.hz,
      z1: arch.roller.z + arch.roller.hz,
    },
  ];

  const wanted = ['approach', 'aisle-west', 'aisle-mid', 'aisle-east', 'warmup', 'back', 'wait'];
  for (const id of wanted) {
    if (!layout.paths.some((path) => path.id === id)) errors.push(`missing path ${id}`);
  }

  for (const path of layout.paths) {
    const half = path.width / 2;
    for (const [x, z] of samplePath(path)) {
      for (const rect of mats) {
        const dist = pointRectDistance(x, z, rect);
        if (dist < half) errors.push(`${path.id} clips ${rect.id}`);
      }
      for (const prop of floorProps) {
        if (prop.id === 'wait_bench' && path.id === 'wait') continue;
        const dist = pointRectDistance(x, z, prop);
        if (dist < half * 0.55) errors.push(`${path.id} runs through ${prop.id}`);
      }
      for (const block of obstacles) {
        let dist = Infinity;
        if (block.kind === 'circle') dist = hypot(x - block.x, z - block.z) - block.r;
        else dist = pointRectDistance(x, z, block);
        if (dist < half * 0.45) errors.push(`${path.id} hits ${block.id}`);
      }
    }
  }

  const cameras = [
    { id: 'default', ...layout.camera },
    ...Object.entries(layout.cameraPresets).map(([id, cam]) => ({ id, ...cam })),
  ];
  const outer = arch.outer;
  const wall = arch.wall;
  for (const cam of cameras) {
    const [x, y, z] = cam.position;
    const inNorth = z < outer.z0 + wall && z > outer.z0 && x > outer.x0 && x < outer.x1;
    const inWest = x < outer.x0 + wall && x > outer.x0 && z > outer.z0 && z < outer.z1;
    const inEast = x > outer.x1 - wall && x < outer.x1 && z > outer.z0 && z < outer.z1;
    if (inNorth || inWest || inEast) errors.push(`${cam.id} camera is inside a wall`);
    if (y < 0.4 || y > outer.h - 0.2) errors.push(`${cam.id} camera height is unusable`);
    const outside = z > outer.z1 - 0.05;
    if (!outside) {
      for (const rect of mats) {
        if (insideRect(x, z, rect) && y < mat.lift + mat.h + 0.4) {
          errors.push(`${cam.id} camera is inside ${rect.id}`);
        }
        if (pointRectDistance(x, z, rect) < 0.34) errors.push(`${cam.id} camera crowds ${rect.id}`);
      }
      for (const s of layout.stations) {
        if (hypot(x - s.x, z - s.z) < 0.7) errors.push(`${cam.id} camera is inside ${s.id}`);
      }
      const inSoffit = x < arch.soffit.x1 && z > arch.soffit.z0 && z < arch.soffit.z1 && y > arch.soffit.y;
      const inCanopy = x > arch.canopy.x0 && z > arch.canopy.z0 && z < arch.canopy.z1 && y > arch.canopy.y;
      if (inSoffit || inCanopy) errors.push(`${cam.id} camera is inside a soffit`);
    }
  }
  if (!(layout.camera.position[2] > outer.z1)) errors.push('default camera should sit outside the cutaway');

  return errors;
}
