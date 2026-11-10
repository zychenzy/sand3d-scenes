/** Plan geometry for the mountain hot spring. No Three.js, so tests and the scene share it. */

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function rand() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function signedArea(poly) {
  let a = 0;
  for (let i = 0; i < poly.length; i++) {
    const p = poly[i];
    const q = poly[(i + 1) % poly.length];
    a += p[0] * q[1] - q[0] * p[1];
  }
  return a / 2;
}

export function centroid(poly) {
  let a = 0;
  let cx = 0;
  let cz = 0;
  for (let i = 0; i < poly.length; i++) {
    const p = poly[i];
    const q = poly[(i + 1) % poly.length];
    const c = p[0] * q[1] - q[0] * p[1];
    a += c;
    cx += (p[0] + q[0]) * c;
    cz += (p[1] + q[1]) * c;
  }
  a *= 0.5;
  return [cx / (6 * a), cz / (6 * a)];
}

export function pointInPoly(x, z, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i][0];
    const zi = poly[i][1];
    const xj = poly[j][0];
    const zj = poly[j][1];
    if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi + 0) + xi) inside = !inside;
  }
  return inside;
}

export function distToPoly(x, z, poly) {
  let best = Infinity;
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i];
    const b = poly[(i + 1) % poly.length];
    const dx = b[0] - a[0];
    const dz = b[1] - a[1];
    const l2 = dx * dx + dz * dz || 1;
    let t = ((x - a[0]) * dx + (z - a[1]) * dz) / l2;
    t = Math.max(0, Math.min(1, t));
    best = Math.min(best, Math.hypot(x - (a[0] + t * dx), z - (a[1] + t * dz)));
  }
  return best;
}

/** Positive distance expands a CCW polygon outward. */
export function offsetPoly(poly, dist) {
  const n = poly.length;
  const out = [];
  for (let i = 0; i < n; i++) {
    const prev = poly[(i - 1 + n) % n];
    const curr = poly[i];
    const next = poly[(i + 1) % n];
    let e0x = curr[0] - prev[0];
    let e0z = curr[1] - prev[1];
    let e1x = next[0] - curr[0];
    let e1z = next[1] - curr[1];
    const l0 = Math.hypot(e0x, e0z) || 1;
    const l1 = Math.hypot(e1x, e1z) || 1;
    e0x /= l0;
    e0z /= l0;
    e1x /= l1;
    e1z /= l1;
    const n0x = e0z;
    const n0z = -e0x;
    const n1x = e1z;
    const n1z = -e1x;
    let nx = n0x + n1x;
    let nz = n0z + n1z;
    const l = Math.hypot(nx, nz) || 1;
    nx /= l;
    nz /= l;
    const dot = Math.min(1, Math.max(0.45, nx * n0x + nz * n0z));
    const miter = 1 / dot;
    out.push([curr[0] + nx * dist * miter, curr[1] + nz * dist * miter]);
  }
  return out;
}

export function edgeFrames(poly) {
  const frames = [];
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i];
    const b = poly[(i + 1) % poly.length];
    const dx = b[0] - a[0];
    const dz = b[1] - a[1];
    const len = Math.hypot(dx, dz) || 1;
    const ux = dx / len;
    const uz = dz / len;
    frames.push({
      i,
      ax: a[0],
      az: a[1],
      bx: b[0],
      bz: b[1],
      mx: (a[0] + b[0]) / 2,
      mz: (a[1] + b[1]) / 2,
      len,
      ux,
      uz,
      ix: -uz,
      iz: ux,
      ox: uz,
      oz: -ux,
      rotY: Math.atan2(-dz, dx),
    });
  }
  return frames;
}

/** Closed XZ loop around a drainage polyline. points are [x, y, z]. */
export function channelLoop(points, halfW) {
  const left = [];
  const right = [];
  for (let i = 0; i < points.length; i++) {
    const prev = points[Math.max(0, i - 1)];
    const next = points[Math.min(points.length - 1, i + 1)];
    let dx = next[0] - prev[0];
    let dz = next[2] - prev[2];
    const len = Math.hypot(dx, dz) || 1;
    dx /= len;
    dz /= len;
    const p = points[i];
    left.push([p[0] - dz * halfW, p[2] + dx * halfW]);
    right.push([p[0] + dz * halfW, p[2] - dx * halfW]);
  }
  return left.concat(right.reverse());
}

export function terracePlan(layout) {
  const outer = layout.terrace.polygon;
  const poolHole = offsetPoly(layout.pool.polygon, layout.pool.paveGap);
  const slice = layout.drainage.points.slice(layout.drainage.cutFrom, layout.drainage.cutTo);
  const channelHole = channelLoop(slice, layout.drainage.halfWidth);
  return { outer, holes: [poolHole, channelHole] };
}

export function backSlopeY(z) {
  const z0 = -3.15;
  const z1 = -8.2;
  const y1 = 2.15;
  if (z >= z0) return 0;
  if (z <= z1) return y1;
  return (y1 * (z0 - z)) / (z0 - z1);
}

export function groundY(z) {
  if (z > 5.35) return -0.64;
  return backSlopeY(z);
}

export function rimRocks(poly, opts) {
  const rand = mulberry32(opts.seed);
  const rocks = [];
  const spill = opts.spillEdge;
  const entry = opts.entryEdge;
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i];
    const b = poly[(i + 1) % poly.length];
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const n = i === spill ? 2 : Math.max(2, Math.round(len / (0.46 + rand() * 0.1)));
    for (let s = 0; s <= n; s++) {
      const t = s / n;
      if (i === spill && t > 0.2 && t < 0.8) continue;
      const dx = b[0] - a[0];
      const dz = b[1] - a[1];
      const L = Math.hypot(dx, dz) || 1;
      const ox = dz / L;
      const oz = -dx / L;
      const x = a[0] + dx * t + ox * (0.08 + rand() * 0.1) + (rand() - 0.5) * 0.1;
      const z = a[1] + dz * t + oz * (0.08 + rand() * 0.1) + (rand() - 0.5) * 0.1;
      let sy = 0.28 + rand() * 0.28;
      if (i >= 2 && i <= 4) sy += 0.14 + rand() * 0.16;
      if (i === entry) sy = 0.14 + rand() * 0.08;
      if (i === spill) sy = 0.12 + rand() * 0.06;
      rocks.push({
        x,
        z,
        sx: 0.26 + rand() * 0.32,
        sy,
        sz: 0.22 + rand() * 0.28,
        rot: rand() * Math.PI * 2,
        moss: rand() > 0.64,
        shade: rand(),
      });
    }
  }
  return rocks;
}

export function segmentSlopes(points) {
  const slopes = [];
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i];
    const b = points[i + 1];
    const run = Math.hypot(b[0] - a[0], b[2] - a[2]);
    const drop = a[1] - b[1];
    slopes.push({ drop, run, slope: drop / Math.max(run, 1e-6) });
  }
  return slopes;
}
