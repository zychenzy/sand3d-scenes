/** Pure placement helpers. No Three.js — shared by the scene and the layout test. */

export function forwardXZ(rotationY) {
  return [Math.sin(rotationY), Math.cos(rotationY)];
}

/** Local XZ on a yaw-rotated display, into world XZ. Y is unchanged. */
export function localToWorld(origin, rotationY, lx, lz) {
  const c = Math.cos(rotationY);
  const s = Math.sin(rotationY);
  return [
    origin[0] + lx * c + lz * s,
    origin[2] - lx * s + lz * c,
  ];
}

/** Top surface Y of each stacked tier. Tiers sit on the floor (y = 0). */
export function tierSurfaces(tiers) {
  const tops = [];
  let y = 0;
  for (const t of tiers) {
    y += t.h;
    tops.push(y);
  }
  return tops;
}

/** Shift a tier back so the fronts stair-step toward local +Z. */
export function tierCenterZ(tiers, index) {
  return -((tiers[0].d - tiers[index].d) / 2);
}

export function facingScore(from, rotationY, to) {
  const [fx, fz] = forwardXZ(rotationY);
  const dx = to[0] - from[0];
  const dz = to[2] - from[2];
  const len = Math.hypot(dx, dz) || 1;
  return (fx * dx + fz * dz) / len;
}

export function surfaceY(inst, asset) {
  const sy = Array.isArray(inst.scale) ? inst.scale[1] : (inst.scale || 1);
  return inst.position[1] + (asset.surface ?? asset.targetHeight) * sy;
}
