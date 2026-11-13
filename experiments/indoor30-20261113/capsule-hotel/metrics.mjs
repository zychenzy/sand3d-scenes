/** Dimension and circulation model for the Koya sleeping floor. Metres, Y up. */

export function podBackX(pod) {
  return pod.faceX - pod.interiorLength;
}

export function bayZ(pod, index) {
  return pod.originZ + index * pod.pitch;
}

export function levelSpan(pod, level) {
  if (level === 'lower') return { floor: pod.lowerFloor, ceiling: pod.lowerCeiling };
  return { floor: pod.upperFloor, ceiling: pod.upperCeiling };
}

export function openingBottom(pod, level) {
  const span = levelSpan(pod, level);
  return span.floor + 0.08;
}

export function mattressTop(pod, level) {
  return levelSpan(pod, level).floor + pod.mattressT;
}

export function clearAboveMattress(pod, level) {
  const span = levelSpan(pod, level);
  return span.ceiling - span.floor - pod.mattressT;
}

export function ladderRungs(ladder) {
  return Array.from({ length: ladder.count }, (_, i) => ladder.firstY + i * ladder.spacing);
}

export function ladderOuterX(pod, ladder) {
  return pod.faceX + ladder.xGap + ladder.protrusion;
}

export function ladderCenterZ(pod, bay) {
  const z = bayZ(pod, bay);
  return z + pod.openingW / 2 - 0.04;
}

export function corridorClear(layout) {
  const { pod, ladder, lockers } = layout.meta;
  return lockers.faceX - ladderOuterX(pod, ladder);
}

export function podRecords(layout) {
  const { pod, pods } = layout.meta;
  return pods.map((state) => {
    const span = levelSpan(pod, state.level);
    const z = bayZ(pod, state.bay);
    return {
      ...state,
      z,
      floor: span.floor,
      ceiling: span.ceiling,
      openingY: openingBottom(pod, state.level),
      mattressY: mattressTop(pod, state.level),
      clear: clearAboveMattress(pod, state.level),
    };
  });
}

export function lockerRecords(layout) {
  const L = layout.meta.lockers;
  const out = [];
  for (let c = 0; c < L.cols; c++) {
    for (let r = 0; r < L.rows; r++) {
      const z = L.originZ + c * (L.w + L.gapZ);
      const y = L.baseY + r * (L.h + L.gapY);
      const x = L.faceX + L.d / 2;
      out.push({
        id: `locker_${c}_${r}`,
        col: c,
        row: r,
        position: [x, y, z],
        faceX: L.faceX,
        top: y + L.h,
      });
    }
  }
  return out;
}

export function lampPosition(layout, rec) {
  const { pod } = layout.meta;
  const x = pod.faceX - 0.4;
  const y = rec.floor + 0.36;
  const z = rec.z - pod.interiorWidth / 2 + 0.1;
  return [x, y, z];
}

export function pillowPosition(layout, rec) {
  const { pod } = layout.meta;
  const x = podBackX(pod) + 0.32;
  return [x, rec.mattressY, rec.z + 0.02];
}

export function buildInstances(layout) {
  const instances = [];
  for (const rec of podRecords(layout)) {
    instances.push({
      id: `lamp_${rec.no}`,
      kind: 'reading_lamp',
      role: 'reading-lamp',
      pod: rec.no,
      curtain: rec.curtain,
      position: lampPosition(layout, rec),
      rotationY: 0,
    });
    if (rec.curtain !== 'closed') {
      instances.push({
        id: `pillow_${rec.no}`,
        kind: 'pillow',
        role: 'pillow',
        pod: rec.no,
        position: pillowPosition(layout, rec),
        rotationY: 0,
      });
    }
  }
  for (const locker of lockerRecords(layout)) {
    instances.push({
      id: locker.id,
      kind: 'luggage_locker',
      role: 'locker',
      position: locker.position,
      rotationY: 0,
    });
  }
  const g = layout.meta.groom;
  const counterZ = g.backZ - g.counterD * 0.42;
  instances.push(
    { id: 'vanity_shelf', kind: 'wall_shelf', role: 'groom', position: [-0.55, 1.2, 3.28], rotationY: Math.PI },
    { id: 'vanity_mug', kind: 'cup_mug', role: 'groom', position: [0.18, g.counterH, counterZ], rotationY: 0.4 },
    { id: 'vanity_jar', kind: 'jam_jar', role: 'groom', position: [0.34, g.counterH, counterZ + 0.06], rotationY: -0.3 },
    { id: 'vanity_bottle', kind: 'thermos', role: 'groom', position: [0.92, g.counterH, counterZ], rotationY: 0.5 },
  );
  return instances;
}

export function pointLights(layout) {
  const lights = [];
  for (const rec of podRecords(layout)) {
    const [x, y, z] = lampPosition(layout, rec);
    const intensity = rec.curtain === 'open' ? 0.1 : rec.curtain === 'half' ? 0.07 : 0.04;
    lights.push({
      id: `pod_${rec.no}`,
      color: '#ffc48a',
      intensity,
      distance: rec.curtain === 'closed' ? 0.55 : 0.85,
      decay: 2,
      position: [x, y + 0.04, z + 0.05],
    });
  }
  const spots = [-2.3, -0.55, 1.15];
  for (let i = 0; i < spots.length; i++) {
    lights.push({
      id: `down_${i}`,
      color: '#ffe6c2',
      intensity: 0.42,
      distance: 3.4,
      decay: 2,
      position: [0.48, 2.36, spots[i]],
    });
  }
  const g = layout.meta.groom;
  lights.push({
    id: 'mirror',
    color: '#fff6ea',
    intensity: 0.22,
    distance: 2.2,
    decay: 2,
    position: [g.sinkX, g.mirrorY, g.backZ - 0.45],
  });
  return lights;
}

export function pathSamples(layout) {
  const c = layout.meta.corridor;
  const samples = [];
  for (let z = c.entryZ; z <= c.standZ; z += 0.25) {
    samples.push([ (c.walkX0 + c.walkX1) / 2, 1.0, z ]);
    samples.push([ c.walkX0 + 0.05, 0.4, z ]);
    samples.push([ c.walkX1 - 0.05, 0.4, z ]);
  }
  return samples;
}

function boxHits(p, box) {
  return p[0] > box.minX && p[0] < box.maxX && p[1] > box.minY && p[1] < box.maxY && p[2] > box.minZ && p[2] < box.maxZ;
}

export function obstacleBoxes(layout) {
  const { pod, ladder, lockers } = layout.meta;
  const boxes = [];
  const outer = ladderOuterX(pod, ladder);
  for (let i = 0; i < pod.bayCount; i++) {
    const z = ladderCenterZ(pod, i);
    boxes.push({
      id: `ladder_${i}`,
      kind: 'ladder',
      minX: pod.faceX + ladder.xGap - 0.02,
      maxX: outer + 0.01,
      minY: 0,
      maxY: pod.upperFloor + ladder.railExtra,
      minZ: z - ladder.width / 2 - 0.01,
      maxZ: z + ladder.width / 2 + 0.01,
    });
  }
  for (const locker of lockerRecords(layout)) {
    boxes.push({
      id: locker.id,
      kind: 'locker',
      minX: lockers.faceX - 0.01,
      maxX: lockers.faceX + lockers.d + 0.01,
      minY: locker.position[1],
      maxY: locker.top,
      minZ: locker.position[2] - lockers.w / 2,
      maxZ: locker.position[2] + lockers.w / 2,
    });
  }
  const g = layout.meta.groom;
  boxes.push({
    id: 'vanity_counter',
    kind: 'counter',
    minX: g.counterX0,
    maxX: g.counterX1,
    minY: 0,
    maxY: g.counterH,
    minZ: g.backZ - g.counterD,
    maxZ: g.backZ,
  });
  return boxes;
}

export function blockedSamples(layout) {
  const boxes = obstacleBoxes(layout);
  const hits = [];
  for (const p of pathSamples(layout)) {
    for (const box of boxes) {
      if (boxHits(p, box)) hits.push({ point: p, id: box.id });
    }
  }
  return hits;
}

export function cameraClear(layout) {
  const boxes = obstacleBoxes(layout);
  const cams = {
    default: layout.camera,
    ...layout.cameraPresets,
  };
  const problems = [];
  for (const [name, cam] of Object.entries(cams)) {
    for (const box of boxes) {
      if (boxHits(cam.position, box)) problems.push(`${name} inside ${box.id}`);
    }
  }
  return problems;
}

export function audit(layout) {
  const { pod, ladder, room, body, groom, corridor } = layout.meta;
  const rungs = ladderRungs(ladder);
  const rise = pod.upperFloor - rungs[rungs.length - 1];
  const open = layout.meta.pods.filter((p) => p.curtain === 'open').length;
  const half = layout.meta.pods.filter((p) => p.curtain === 'half').length;
  const closed = layout.meta.pods.filter((p) => p.curtain === 'closed').length;
  return {
    interiorLength: pod.interiorLength,
    interiorWidth: pod.interiorWidth,
    lowerClear: clearAboveMattress(pod, 'lower'),
    upperClear: clearAboveMattress(pod, 'upper'),
    openingR: pod.openingR,
    openingW: pod.openingW,
    openingH: pod.openingH,
    ladderWidth: ladder.width,
    rungSpacing: ladder.spacing,
    rungCount: ladder.count,
    lastRise: rise,
    railTop: pod.upperFloor + ladder.railExtra,
    corridorClear: corridorClear(layout),
    walkWidth: corridor.walkX1 - corridor.walkX0,
    ceiling: room.height,
    counterH: groom.counterH,
    stature: body.stature,
    approach: bayZ(pod, 0) - pod.pitch / 2 - room.minZ,
    open,
    half,
    closed,
    blocked: blockedSamples(layout),
    cameraProblems: cameraClear(layout),
  };
}
