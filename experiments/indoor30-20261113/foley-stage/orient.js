/** Pure layout math shared by the stage and the node tests. No Three.js. */

export function rotationFor(modelForward, position, lookAt) {
  const dx = lookAt[0] - position[0];
  const dz = lookAt[1] - position[2];
  const yaw = Math.atan2(dx, dz);
  return modelForward === 'negZ' ? yaw + Math.PI : yaw;
}

export function forwardXZ(rotationY, modelForward) {
  if (modelForward === 'negZ') return [-Math.sin(rotationY), -Math.cos(rotationY)];
  return [Math.sin(rotationY), Math.cos(rotationY)];
}

export function norm2(x, z) {
  const l = Math.hypot(x, z) || 1;
  return [x / l, z / l];
}

export function rotatedLocal(lx, lz, yaw) {
  const c = Math.cos(yaw);
  const s = Math.sin(yaw);
  return [lx * c + lz * s, -lx * s + lz * c];
}

export function expandShoes(spec) {
  const shoes = [];
  let n = 0;
  const pushPair = (x, y, z, tint, yaw) => {
    shoes.push({
      id: `shoe_${n++}`,
      kind: 'foley_shoe',
      position: [x, y, z - spec.pairGap / 2],
      rotationY: yaw,
      tint,
    });
    shoes.push({
      id: `shoe_${n++}`,
      kind: 'foley_shoe_r',
      position: [x, y, z + spec.pairGap / 2],
      rotationY: yaw,
      tint,
    });
  };
  spec.bays.forEach((bz, bi) => {
    spec.shelves.forEach((y, si) => {
      spec.pairOffsets.forEach((oz, pi) => {
        const tint = spec.tints[(bi * 5 + si * 2 + pi) % spec.tints.length];
        pushPair(spec.x, y, bz + oz, tint, spec.yaw);
      });
    });
  });
  for (const extra of spec.floorPairs || []) {
    const tint = spec.tints[shoes.length % spec.tints.length];
    pushPair(extra.x, extra.y, extra.z, tint, extra.yaw ?? spec.yaw);
  }
  return shoes;
}

export function pitRect(pit) {
  return {
    id: pit.id,
    minX: pit.center[0] - pit.size[0] / 2,
    maxX: pit.center[0] + pit.size[0] / 2,
    minZ: pit.center[1] - pit.size[1] / 2,
    maxZ: pit.center[1] + pit.size[1] / 2,
  };
}

export function rectDist(x, z, rect) {
  const dx = Math.max(rect.minX - x, x - rect.maxX, 0);
  const dz = Math.max(rect.minZ - z, z - rect.maxZ, 0);
  return Math.hypot(dx, dz);
}

export function rectGap(a, b) {
  const dx = Math.max(a.minX - b.maxX, b.minX - a.maxX, 0);
  const dz = Math.max(a.minZ - b.maxZ, b.minZ - a.maxZ, 0);
  return Math.hypot(dx, dz);
}

/** Floor-fit local point, matching prepareAsset('floor') then a Y rotation. */
export function placePoint(entry, local, position, yaw) {
  const cx = (entry.min[0] + entry.max[0]) / 2;
  const cz = (entry.min[2] + entry.max[2]) / 2;
  const scale = entry.targetHeight / (entry.size[1] || 1);
  const x = (local[0] - cx) * scale;
  const y = (local[1] - entry.min[1]) * scale;
  const z = (local[2] - cz) * scale;
  const xz = rotatedLocal(x, z, yaw);
  return [position[0] + xz[0], position[1] + y, position[2] + xz[1]];
}

export function aimInfo(from, to) {
  const d = [to[0] - from[0], to[1] - from[1], to[2] - from[2]];
  const dist = Math.hypot(d[0], d[1], d[2]) || 1;
  return { dist, down: d[1] / dist, dir: d.map((v) => v / dist) };
}

export function luminance(hex) {
  const n = parseInt(hex.slice(1), 16);
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => {
    const s = c / 255;
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2];
}

export function doorLatch(layout, manifest) {
  const door = layout.instances.find((i) => i.kind === 'stage_door');
  const entry = { ...manifest.stage_door, targetHeight: layout.assets.stage_door.targetHeight };
  return placePoint(entry, manifest.stage_door.latch, door.position, door.rotationY || 0);
}

/** Adds shoe rows and suspended mics. Door latch is filled from the bake manifest. */
export function bindLayout(layout, manifest) {
  const latch = doorLatch(layout, manifest);
  layout.door.latch = latch;
  const doorMic = layout.mics.find((m) => m.role === 'door');
  if (doorMic) doorMic.aim = latch;
  for (const shoe of expandShoes(layout.shoes)) layout.instances.push(shoe);
  for (const mic of layout.mics) {
    layout.instances.push({
      id: mic.id,
      kind: 'shotgun_mic',
      position: mic.capsule,
      aim: mic.aim,
    });
  }
  return layout;
}
