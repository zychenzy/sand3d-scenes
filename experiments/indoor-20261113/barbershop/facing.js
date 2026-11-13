/** Shared seat-facing math for the loader and the layout test. */

export function yawForFront(front, dx, dz) {
  if (front === '-Z') return Math.atan2(-dx, -dz);
  if (front === '+X') return Math.atan2(-dz, dx);
  if (front === '-X') return Math.atan2(dz, -dx);
  if (front === 'radial') return 0;
  return Math.atan2(dx, dz);
}

/** World XZ forward for a model whose local front is `front`, after rotationY. */
export function forwardXZ(front, ry) {
  if (front === 'radial') return null;
  if (front === '-Z') return [-Math.sin(ry), -Math.cos(ry)];
  if (front === '+X') return [Math.cos(ry), -Math.sin(ry)];
  if (front === '-X') return [-Math.cos(ry), Math.sin(ry)];
  return [Math.sin(ry), Math.cos(ry)];
}
