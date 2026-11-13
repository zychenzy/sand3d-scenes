/** Seat and mic yaw shared by the scene and the layout tests. No Three.js. */

export function rotationFor(modelForward, position, lookAt) {
  const dx = lookAt[0] - position[0];
  const dz = lookAt[1] - position[2];
  const yaw = Math.atan2(dx, dz);
  return modelForward === 'negZ' ? yaw + Math.PI : yaw;
}

/** Horizontal forward on the floor. posZ models face +Z at yaw 0. */
export function forwardXZ(rotationY, modelForward) {
  if (modelForward === 'negZ') return [-Math.sin(rotationY), -Math.cos(rotationY)];
  return [Math.sin(rotationY), Math.cos(rotationY)];
}

export function norm2(x, z) {
  const l = Math.hypot(x, z) || 1;
  return [x / l, z / l];
}
