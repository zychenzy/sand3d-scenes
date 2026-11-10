/**
 * Neighbourhood skatepark layout and ride-surface math.
 * Units are metres. +X east, +Y up, +Z south.
 *
 * Proportions read from public photos (see refs/SOURCES.md):
 * - shallow oval bowl sunk in a flat deck, round coping, one eased mouth
 * - quarterpipe as a circular transition with rolled shoulders, not a wedge
 * - low manual pad, steel-edged ledge, stair handrail kept off the run-up
 */

export const SLAB = { x0: -8.25, x1: 8.45, z0: -6.28, z1: 6.22 };

export const BOWL = {
  cx: -3.95,
  cz: 0.42,
  ax: 1.55,
  az: 1.12,
  R: 1.68,
  depth: 0.92,
};

export const CHANNEL = {
  /** Outward direction of the roll-in, radians in XZ (0 = east, negative = north). */
  angle: -0.95,
  halfWidth: 0.36,
  shoulder: 0.34,
  /** Surface angle at the mouth, radians. Shallower than the bowl wall. */
  exitTheta: 0.70,
};

export const QP = {
  x0: -2.85,
  x1: -0.95,
  x2: 7.05,
  x3: 8.15,
  zBack: -6.18,
  deckDepth: 1.58,
  R: 1.74,
  /** Full-face angle from horizontal. Steep enough to read as a quarter, not a wedge. */
  theta: 1.34,
};

export const FENCE = { x0: -8.95, x1: 9.2, z0: -7.15, z1: 6.98, h: 1.46 };

export const GATE = { x0: 4.68, x1: 6.72 };

/** Flat lane from the gate to the quarterpipe face. Nothing may stand here. */
export const CORRIDOR = { x0: 4.9, x1: 6.55, z0: null, z1: 6.05 };

export const MANUAL = { x: 1.05, z: 3.42, len: 2.2, wid: 0.56, h: 0.18, along: 'z' };
export const LEDGE = { x: 1.42, z: 0.78, len: 2.45, wid: 0.4, h: 0.38, along: 'x' };
export const STAIR = {
  x: 3.15,
  zTop: 2.28,
  zBottom: 3.92,
  wid: 0.96,
  rise: 0.15,
  steps: 3,
  landing: 0.52,
  railH: 0.74,
  railR: 0.023,
};

export const BENCHES = [
  { id: 'bench_oak', x: -6.7, z: 8.35, rotationY: 0.08, look: [0.15, -1] },
  { id: 'bench_companion', x: -2.35, z: 7.95, rotationY: -0.22, look: [0.25, -1] },
  { id: 'bench_east', x: 10.35, z: 5.35, rotationY: -1.2, look: [-1, -0.35] },
];

export const TREES = [
  { id: 'oak', kind: 'oak', x: -7.7, z: 10.35, scale: 1 },
  { id: 'multi', kind: 'multi', x: -3.15, z: 9.7, scale: 0.9 },
  { id: 'east', kind: 'broad', x: 11.4, z: 4.15, scale: 0.82 },
  { id: 'column', kind: 'column', x: -4.55, z: -10.15, scale: 1.05 },
  { id: 'bg_oak', kind: 'oak', x: 3.55, z: -9.55, scale: 0.7 },
  { id: 'bg_broad', kind: 'broad', x: 12.5, z: -9.15, scale: 0.68 },
];

export const APRON = 0.16;

export function smoothstep(e0, e1, x) {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0 || 1e-6)));
  return t * t * (3 - 2 * t);
}

export function lerp(a, b, t) {
  return a + (b - a) * t;
}

function wrapPi(a) {
  let x = a;
  while (x > Math.PI) x -= Math.PI * 2;
  while (x < -Math.PI) x += Math.PI * 2;
  return x;
}

export function bowlThetaFull() {
  return Math.acos(1 - BOWL.depth / BOWL.R);
}

export function bowlWall(phi) {
  const d = Math.abs(wrapPi(phi - CHANNEL.angle));
  const inner = CHANNEL.halfWidth;
  const outer = inner + CHANNEL.shoulder;
  let blend = 0;
  if (d <= inner) blend = 1;
  else if (d < outer) blend = 1 - smoothstep(inner, outer, d);
  const thetaFull = bowlThetaFull();
  const theta = thetaFull * (1 - blend) + CHANNEL.exitTheta * blend;
  const R = BOWL.depth / (1 - Math.cos(theta));
  return { theta, R, blend, thetaFull };
}

/** t in [0,1] rides the arc. t>1 continues a flat apron past the lip. */
export function bowlSample(phi, t) {
  const wall = bowlWall(phi);
  const c = Math.cos(phi);
  const s = Math.sin(phi);
  const px = BOWL.ax * c;
  const pz = BOWL.az * s;
  let nx = c / BOWL.ax;
  let nz = s / BOWL.az;
  const nl = Math.hypot(nx, nz) || 1;
  nx /= nl;
  nz /= nl;
  const ang = Math.min(Math.max(t, 0), 1) * wall.theta;
  let radial = wall.R * Math.sin(ang);
  let y = -BOWL.depth + wall.R * (1 - Math.cos(ang));
  if (t > 1) {
    radial += (t - 1) * APRON;
    y = 0;
  }
  const horizIn = Math.sin(ang);
  return {
    x: BOWL.cx + px + nx * radial,
    y,
    z: BOWL.cz + pz + nz * radial,
    nx: t > 1 ? 0 : -nx * horizIn,
    ny: t > 1 ? 1 : Math.cos(ang),
    nz: t > 1 ? 0 : -nz * horizIn,
    outX: nx,
    outZ: nz,
    ...wall,
    ang,
  };
}

export function qpProfile(x) {
  let s = 0;
  if (x > QP.x0 && x < QP.x3) {
    if (x < QP.x1) s = smoothstep(QP.x0, QP.x1, x);
    else if (x > QP.x2) s = 1 - smoothstep(QP.x2, QP.x3, x);
    else s = 1;
  }
  const theta = QP.theta * s;
  const R = QP.R;
  const H = R * (1 - Math.cos(theta));
  const horiz = R * Math.sin(theta);
  const zCope = QP.zBack + QP.deckDepth;
  const zBottom = zCope + horiz;
  return { s, theta, R, H, horiz, zCope, zBottom };
}

function pushTri(indices, a, b, c) {
  indices.push(a, b, c);
}

function quad(indices, a, b, c, d) {
  indices.push(a, b, c, a, c, d);
}

export function buildBowlMesh(segA = 72, segR = 16) {
  const positions = [];
  const normals = [];
  const indices = [];
  const rings = [];
  const apronT = 1 + 1; // one apron step of APRON metres
  const steps = segR + 1; // 0..segR arc, then apron

  for (let i = 0; i < segA; i++) {
    const phi = (i / segA) * Math.PI * 2;
    const ring = [];
    for (let j = 0; j <= segR; j++) {
      const t = j / segR;
      const p = bowlSample(phi, t);
      ring.push(positions.length / 3);
      positions.push(p.x, p.y, p.z);
      const nl = Math.hypot(p.nx, p.ny, p.nz) || 1;
      normals.push(p.nx / nl, p.ny / nl, p.nz / nl);
    }
    const pA = bowlSample(phi, apronT);
    ring.push(positions.length / 3);
    positions.push(pA.x, pA.y, pA.z);
    normals.push(0, 1, 0);
    rings.push(ring);
  }

    for (let i = 0; i < segA; i++) {
    const i2 = (i + 1) % segA;
    for (let j = 0; j < steps; j++) {
      const a = rings[i][j];
      const b = rings[i2][j];
      const c = rings[i2][j + 1];
      const d = rings[i][j + 1];
      quad(indices, a, b, c, d);
    }
  }

  const center = positions.length / 3;
  positions.push(BOWL.cx, -BOWL.depth, BOWL.cz);
  normals.push(0, 1, 0);
  for (let i = 0; i < segA; i++) {
    const i2 = (i + 1) % segA;
    pushTri(indices, center, rings[i2][0], rings[i][0]);
  }

  const lip = [];
  const hole = [];
  const copingFlags = [];
  for (let i = 0; i < segA; i++) {
    const phi = (i / segA) * Math.PI * 2;
    const lipP = bowlSample(phi, 1);
    const holeP = bowlSample(phi, 1 + 0.28);
    lip.push(lipP);
    hole.push([holeP.x, holeP.z]);
    copingFlags.push(lipP.blend < 0.22);
  }
  hole.reverse();
  const coping = copingArc(lip, copingFlags);

  return {
    positions: new Float32Array(positions),
    normals: new Float32Array(normals),
    indices: new Uint32Array(indices),
    lip,
    hole,
    coping,
  };
}

export function buildQpMesh(segsX = 64, segsR = 18) {
  const positions = [];
  const indices = [];
  const deckSegs = 3;
  const stride = segsR + 1 + deckSegs;
  const cols = [];

  for (let i = 0; i <= segsX; i++) {
    const x = lerp(QP.x0, QP.x3, i / segsX);
    const prof = qpProfile(x);
    const col = [];
    for (let j = 0; j <= segsR; j++) {
      const ang = prof.theta * (j / segsR);
      const y = prof.R * (1 - Math.cos(ang));
      const z = prof.zBottom - prof.R * Math.sin(ang);
      col.push(positions.length / 3);
      positions.push(x, y, z);
    }
    for (let k = 1; k <= deckSegs; k++) {
      const z = lerp(prof.zCope, QP.zBack, k / deckSegs);
      col.push(positions.length / 3);
      positions.push(x, prof.H, z);
    }
    cols.push({ col, prof, x });
  }

  for (let i = 0; i < segsX; i++) {
    for (let j = 0; j < stride - 1; j++) {
      const a = cols[i].col[j];
      const b = cols[i + 1].col[j];
      const c = cols[i + 1].col[j + 1];
      const d = cols[i].col[j + 1];
      quad(indices, a, b, c, d);
    }
  }

  for (let i = 0; i < segsX; i++) {
    const A = cols[i];
    const B = cols[i + 1];
    if (A.prof.H < 0.045 && B.prof.H < 0.045) continue;
    const aTop = A.col[stride - 1];
    const bTop = B.col[stride - 1];
    const aBot = positions.length / 3;
    positions.push(A.x, 0, QP.zBack);
    const bBot = positions.length / 3;
    positions.push(B.x, 0, QP.zBack);
    quad(indices, aTop, bTop, bBot, aBot);
  }

  const normals = computeNormals(positions, indices);
  const hole = qpHoleLoop();
  const full = qpProfile((QP.x1 + QP.x2) / 2);
  const coping = {
    x0: QP.x1 + 0.04,
    x1: QP.x2 - 0.04,
    y: full.H,
    z: full.zCope,
  };

  return {
    positions: new Float32Array(positions),
    normals,
    indices: new Uint32Array(indices),
    hole,
    coping,
  };
}

export function qpHoleLoop(segs = 40) {
  const xs = [];
  for (let i = 0; i <= segs; i++) {
    const x = lerp(QP.x0, QP.x3, i / segs);
    const p = qpProfile(x);
    if (p.H >= 0.07) xs.push({ x, p });
  }
  const south = xs.map(({ x, p }) => [x, p.zBottom - 0.05]);
  const north = xs.slice().reverse().map(({ x }) => [x, QP.zBack + 0.04]);
  const loop = south.concat(north);
  if (shoelace(loop) > 0) loop.reverse();
  return loop;
}

export function computeNormals(positions, indices) {
  const n = new Float32Array(positions.length);
  for (let i = 0; i < indices.length; i += 3) {
    const ia = indices[i] * 3;
    const ib = indices[i + 1] * 3;
    const ic = indices[i + 2] * 3;
    const ax = positions[ib] - positions[ia];
    const ay = positions[ib + 1] - positions[ia + 1];
    const az = positions[ib + 2] - positions[ia + 2];
    const bx = positions[ic] - positions[ia];
    const by = positions[ic + 1] - positions[ia + 1];
    const bz = positions[ic + 2] - positions[ia + 2];
    const cx = ay * bz - az * by;
    const cy = az * bx - ax * bz;
    const cz = ax * by - ay * bx;
    n[ia] += cx; n[ia + 1] += cy; n[ia + 2] += cz;
    n[ib] += cx; n[ib + 1] += cy; n[ib + 2] += cz;
    n[ic] += cx; n[ic + 1] += cy; n[ic + 2] += cz;
  }
  for (let i = 0; i < n.length; i += 3) {
    const l = Math.hypot(n[i], n[i + 1], n[i + 2]) || 1;
    n[i] /= l; n[i + 1] /= l; n[i + 2] /= l;
  }
  return n;
}

export function aabbOf(spec) {
  if (spec.along === 'z') {
    return {
      id: 'manual',
      min: [spec.x - spec.wid / 2, 0, spec.z - spec.len / 2],
      max: [spec.x + spec.wid / 2, spec.h, spec.z + spec.len / 2],
    };
  }
  if (spec.along === 'x') {
    return {
      id: 'ledge',
      min: [spec.x - spec.len / 2, 0, spec.z - spec.wid / 2],
      max: [spec.x + spec.len / 2, spec.h, spec.z + spec.wid / 2],
    };
  }
  return null;
}

export function stairAabb() {
  const rail = 0.06;
  return {
    id: 'stair',
    min: [STAIR.x - STAIR.wid / 2, 0, STAIR.zTop],
    max: [STAIR.x + STAIR.wid / 2 + rail, STAIR.steps * STAIR.rise + STAIR.railH, STAIR.zBottom],
  };
}

export function obstacles() {
  return [aabbOf(MANUAL), aabbOf(LEDGE), stairAabb()];
}

export function groundY(x, z) {
  const u = smoothstep(-14.6, -7.25, z);
  const rise = (1 - u) * 0.52;
  const edge = Math.max(0, Math.abs(x) - 16) * 0.02;
  return rise + edge;
}

function copingArc(samples, flags) {
  const n = samples.length;
  const gap = flags.findIndex((f) => !f);
  if (gap < 0) return samples.slice();
  let start = gap;
  while (!flags[start % n]) start++;
  start %= n;
  const arc = [];
  for (let k = 0; k < n; k++) {
    const idx = (start + k) % n;
    if (!flags[idx]) break;
    arc.push(samples[idx]);
  }
  return arc;
}

function shoelace(loop) {
  let a = 0;
  for (let i = 0; i < loop.length; i++) {
    const [x1, z1] = loop[i];
    const [x2, z2] = loop[(i + 1) % loop.length];
    a += x1 * z2 - x2 * z1;
  }
  return a * 0.5;
}

function segmentsIntersect(a, b, c, d) {
  function cross(p, q, r) {
    return (q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0]);
  }
  const c1 = cross(a, b, c);
  const c2 = cross(a, b, d);
  const c3 = cross(c, d, a);
  const c4 = cross(c, d, b);
  return c1 * c2 < 0 && c3 * c4 < 0;
}

function selfIntersects(loop) {
  const n = loop.length;
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      if (Math.abs(i - j) <= 1) continue;
      if (i === 0 && j === n - 1) continue;
      if (segmentsIntersect(loop[i], loop[(i + 1) % n], loop[j], loop[(j + 1) % n])) return true;
    }
  }
  return false;
}

function insideFence(x, z, pad = 0) {
  return x > FENCE.x0 + pad && x < FENCE.x1 - pad && z > FENCE.z0 + pad && z < FENCE.z1 - pad;
}

function outsideFence(x, z, pad = 0) {
  return !insideFence(x, z, -pad);
}

function hitsAabb(x, z, box, margin) {
  return x >= box.min[0] - margin && x <= box.max[0] + margin
    && z >= box.min[2] - margin && z <= box.max[2] + margin;
}

function stairSlope() {
  const rise = STAIR.steps * STAIR.rise;
  const run = STAIR.zBottom - STAIR.zTop - STAIR.landing;
  return { rise, run, slope: rise / run };
}

/** Round rail parallel to the treads, posts at the low nosing and the landing. */
export function railEnds() {
  const rise = STAIR.steps * STAIR.rise;
  const zA = STAIR.zBottom;
  const zB = STAIR.zTop + STAIR.landing;
  return {
    x: STAIR.x + STAIR.wid / 2 - 0.05,
    zA,
    yA: STAIR.railH,
    zB,
    yB: rise + STAIR.railH,
    slope: rise / (zA - zB),
  };
}

function faceDotNormal(positions, indices, normals) {
  let agree = 0;
  let n = 0;
  for (let i = 0; i < indices.length; i += 3) {
    const ia = indices[i] * 3;
    const ib = indices[i + 1] * 3;
    const ic = indices[i + 2] * 3;
    const ax = positions[ib] - positions[ia];
    const ay = positions[ib + 1] - positions[ia + 1];
    const az = positions[ib + 2] - positions[ia + 2];
    const bx = positions[ic] - positions[ia];
    const by = positions[ic + 1] - positions[ia + 1];
    const bz = positions[ic + 2] - positions[ia + 2];
    const cx = ay * bz - az * by;
    const cy = az * bx - ax * bz;
    const cz = ax * by - ay * bx;
    const dot = cx * normals[ia] + cy * normals[ia + 1] + cz * normals[ia + 2];
    if (Math.abs(dot) < 1e-8) continue;
    n++;
    if (dot > 0) agree++;
  }
  return n ? agree / n : 1;
}

export function corridorZ0() {
  const x = (CORRIDOR.x0 + CORRIDOR.x1) / 2;
  return qpProfile(x).zBottom;
}

export function evaluate() {
  const failures = [];
  const notes = [];
  const fail = (m) => failures.push(m);
  const note = (m) => notes.push(m);

  const thetaFull = bowlThetaFull();
  note(`bowl depth ${BOWL.depth.toFixed(2)} m, wall angle ${(thetaFull * 180 / Math.PI).toFixed(1)}°, radius ${BOWL.R.toFixed(2)} m`);
  if (thetaFull > 1.35) fail(`bowl wall steeper than a shallow transition (${(thetaFull * 180 / Math.PI).toFixed(1)}°)`);
  if (BOWL.depth > 1.15) fail('bowl is deeper than a neighbourhood shallow bowl');

  const bowl = buildBowlMesh();
  let minY = Infinity;
  let maxY = -Infinity;
  for (let i = 1; i < bowl.positions.length; i += 3) {
    minY = Math.min(minY, bowl.positions[i]);
    maxY = Math.max(maxY, bowl.positions[i]);
  }
  note(`bowl mesh y ${minY.toFixed(3)} .. ${maxY.toFixed(3)}`);
  if (minY < -BOWL.depth - 0.02) fail('bowl mesh goes below the design depth');
  if (maxY > 0.02) fail('bowl mesh rises above the deck');
  if (Math.abs(minY + BOWL.depth) > 0.03) fail('bowl floor does not sit on the design depth');

  let upFacing = 0;
  let checked = 0;
  for (let i = 0; i < bowl.indices.length; i += 3) {
    const ia = bowl.indices[i] * 3;
    const y = bowl.positions[ia + 1];
    if (y > -0.2) continue;
    checked++;
    if (bowl.normals[ia + 1] > 0.2) upFacing++;
  }
  if (checked && upFacing / checked < 0.85) fail('bowl floor normals do not face upward');
  const bowlWinding = faceDotNormal(bowl.positions, bowl.indices, bowl.normals);
  note(`bowl front-face agreement ${(bowlWinding * 100).toFixed(0)}%`);
  if (bowlWinding < 0.8) fail('bowl triangles are wound against their normals and would be culled');

  for (const phi of [0.4, 1.2, 2.2, 3.4, -0.2, CHANNEL.angle]) {
    let prev = 0;
    let prevY = -BOWL.depth;
    for (let j = 1; j <= 16; j++) {
      const a = bowlSample(phi, (j - 1) / 16);
      const b = bowlSample(phi, j / 16);
      const dr = Math.hypot(b.x - a.x, b.z - a.z);
      const slope = Math.atan2(b.y - a.y, dr);
      if (b.y + 1e-4 < prevY) fail(`bowl height dropped along phi ${phi.toFixed(2)}`);
      if (slope + 0.04 < prev) fail(`bowl slope kinked backward at phi ${phi.toFixed(2)}`);
      if (slope - prev > 0.28) fail(`bowl has a box-like kink at phi ${phi.toFixed(2)} (Δ ${(slope - prev).toFixed(2)} rad)`);
      prev = slope;
      prevY = b.y;
    }
    const top = bowlSample(phi, 1);
    if (Math.abs(top.y) > 0.02) fail(`bowl lip not at deck height (y=${top.y.toFixed(3)})`);
  }

  const mouth = [];
  for (let j = 0; j <= 12; j++) mouth.push(bowlSample(CHANNEL.angle, j / 12));
  const mouthEnd = mouth[mouth.length - 1];
  note(`roll-in mouth ends at (${mouthEnd.x.toFixed(2)}, ${mouthEnd.y.toFixed(2)}, ${mouthEnd.z.toFixed(2)}), angle ${(mouthEnd.theta * 180 / Math.PI).toFixed(1)}°`);
  if (mouthEnd.y > 0.02) fail('roll-in does not meet the deck');
  if (mouth[0].y > mouthEnd.y) fail('roll-in does not climb out of the bowl');
  let maxStep = 0;
  for (let i = 1; i < mouth.length; i++) maxStep = Math.max(maxStep, mouth[i].y - mouth[i - 1].y);
  note(`roll-in largest rise between samples ${maxStep.toFixed(3)} m`);
  if (maxStep > 0.22) fail(`roll-in has a step of ${maxStep.toFixed(3)} m`);
  if (mouthEnd.x < SLAB.x0 + 0.4 || mouthEnd.x > SLAB.x1 - 0.4 || mouthEnd.z < SLAB.z0 + 0.4 || mouthEnd.z > SLAB.z1 - 0.4) {
    fail('roll-in exits outside the concrete slab');
  }

  if (selfIntersects(bowl.hole)) fail('bowl slab hole self-intersects');
  if (bowl.coping.length < 24) fail('bowl coping arc is too short');
  let copeJump = 0;
  for (let i = 1; i < bowl.coping.length; i++) {
    copeJump = Math.max(copeJump, Math.hypot(
      bowl.coping[i].x - bowl.coping[i - 1].x,
      bowl.coping[i].z - bowl.coping[i - 1].z,
    ));
  }
  note(`bowl coping samples ${bowl.coping.length}, max step ${copeJump.toFixed(3)} m`);
  if (copeJump > 0.45) fail('bowl coping jumps across the roll-in');
  if (shoelace(bowl.hole) >= 0) fail('bowl hole winding is not clockwise in XZ');

  for (const p of bowl.lip) {
    if (p.x < SLAB.x0 + 0.55 || p.x > SLAB.x1 - 0.55 || p.z < SLAB.z0 + 0.45 || p.z > SLAB.z1 - 0.7) {
      fail(`bowl lip too close to the slab edge at (${p.x.toFixed(2)}, ${p.z.toFixed(2)})`);
      break;
    }
  }

  const qp = buildQpMesh();
  const midX = (QP.x1 + QP.x2) / 2;
  const mid = qpProfile(midX);
  note(`quarter height ${mid.H.toFixed(2)} m, angle ${(mid.theta * 180 / Math.PI).toFixed(1)}°, radius ${mid.R.toFixed(2)} m, flat meet z ${mid.zBottom.toFixed(2)}`);
  if (mid.theta > 1.4) fail('quarterpipe is vertical; it should stay a transition');
  if (mid.H < 0.9 || mid.H > 1.7) fail(`quarter height ${mid.H.toFixed(2)} is outside neighbourhood scale`);
  if (!(mid.zCope < mid.zBottom)) fail('quarterpipe faces the wrong way');

  const zMid = (mid.zBottom + mid.zCope) / 2;
  const sinAng = (mid.zBottom - zMid) / mid.R;
  const ang = Math.asin(Math.min(1, Math.max(0, sinAng)));
  const yArc = mid.R * (1 - Math.cos(ang));
  const yLine = mid.H * 0.5;
  note(`quarter sagitta: arc y ${yArc.toFixed(3)} vs straight ramp y ${yLine.toFixed(3)}`);
  if (Math.abs(yArc - yLine) < 0.12) fail('quarter profile is too close to a straight box ramp');

  let prevSlope = 0;
  for (let j = 1; j <= 12; j++) {
    const aAng = mid.theta * ((j - 1) / 12);
    const bAng = mid.theta * (j / 12);
    const slope = bAng;
    if (slope + 1e-4 < prevSlope) fail('quarter slope is not monotonic');
    prevSlope = slope;
    if (bAng - aAng > 0.25) fail('quarter has a kink');
  }

  let qpUp = 0;
  let qpN = 0;
  for (let i = 0; i < Math.min(qp.indices.length, 4000); i += 3) {
    const ia = qp.indices[i] * 3;
    const y = qp.positions[ia + 1];
    if (y < 0.05 || y > mid.H - 0.05) continue;
    qpN++;
    if (qp.normals[ia + 1] > 0) qpUp++;
  }
  if (qpN && qpUp / qpN < 0.8) fail('quarterpipe normals face away from the riding surface');
  const qpWinding = faceDotNormal(qp.positions, qp.indices, qp.normals);
  note(`quarter front-face agreement ${(qpWinding * 100).toFixed(0)}%`);
  if (qpWinding < 0.75) fail('quarterpipe triangles are wound against their normals');

  if (selfIntersects(qp.hole)) fail('quarterpipe slab hole self-intersects');
  if (shoelace(qp.hole) >= 0) fail('quarterpipe hole winding is not clockwise in XZ');

  const z0 = corridorZ0();
  CORRIDOR.z0 = z0;
  note(`run-up corridor x ${CORRIDOR.x0}..${CORRIDOR.x1}, z ${z0.toFixed(2)}..${CORRIDOR.z1}, length ${(CORRIDOR.z1 - z0).toFixed(2)} m`);
  if (CORRIDOR.z1 - z0 < 6.5) fail('run-up from the gate to the quarter is shorter than 6.5 m');
  const face = qpProfile((CORRIDOR.x0 + CORRIDOR.x1) / 2);
  if (face.s < 0.98) fail('run-up meets a rolled shoulder instead of the quarter face');

  const boxes = obstacles();
  for (let z = z0 + 0.2; z <= CORRIDOR.z1; z += 0.35) {
    for (let x = CORRIDOR.x0; x <= CORRIDOR.x1; x += 0.35) {
      if (x < SLAB.x0 || x > SLAB.x1 || z > SLAB.z1) fail(`corridor leaves the slab at (${x.toFixed(2)}, ${z.toFixed(2)})`);
      for (const box of boxes) {
        if (hitsAabb(x, z, box, 0.35)) fail(`${box.id} blocks the run-up at (${x.toFixed(2)}, ${z.toFixed(2)})`);
      }
      if (Math.hypot(x - mouthEnd.x, z - mouthEnd.z) < 0.7) fail('roll-in spills into the quarter run-up');
    }
  }
  if (failures.length > 40) failures.splice(40);

  for (const box of boxes) {
    if (box.min[1] < -0.001) fail(`${box.id} floats or sinks`);
    if (box.min[0] < SLAB.x0 + 0.3 || box.max[0] > SLAB.x1 - 0.3) fail(`${box.id} is off the concrete`);
  }
  if (MANUAL.h < 0.12 || MANUAL.h > 0.28) fail('manual pad is not a low street pad');
  if (MANUAL.len < MANUAL.h * 8) fail('manual pad is too short to manual');
  if (LEDGE.h < 0.30 || LEDGE.h > 0.55) fail('ledge height is outside a street ledge');
  const { slope, rise, run } = stairSlope();
  note(`stair rise ${rise.toFixed(2)} over run ${run.toFixed(2)} (slope ${slope.toFixed(3)})`);
  if (run < 0.7) fail('stair run is too short');
  const rail = railEnds();
  note(`handrail slope ${rail.slope.toFixed(3)} vs stair ${slope.toFixed(3)}, radius ${(STAIR.railR * 1000).toFixed(0)} mm`);
  if (Math.abs(rail.slope - slope) > 0.03) fail(`handrail slope ${rail.slope.toFixed(3)} diverges from the stair ${slope.toFixed(3)}`);
  if (STAIR.railR < 0.015 || STAIR.railR > 0.035) fail('handrail is not a round street rail');

  if (GATE.x0 < FENCE.x0 || GATE.x1 > FENCE.x1) fail('gate is outside the fence line');
  if (GATE.x0 > CORRIDOR.x0 + 0.05 || GATE.x1 < CORRIDOR.x1 - 0.05) fail('gate does not open onto the run-up');
  const gateWidth = GATE.x1 - GATE.x0;
  note(`gate width ${gateWidth.toFixed(2)} m`);
  if (gateWidth < 1.3) fail('gate is narrower than a skate entry');

  for (const b of BENCHES) {
    if (insideFence(b.x, b.z, 0.15)) fail(`${b.id} sits inside the riding fence`);
    const toParkX = -b.x;
    const toParkZ = -b.z;
    const ll = Math.hypot(b.look[0], b.look[1]) || 1;
    const pl = Math.hypot(toParkX, toParkZ) || 1;
    const dot = (b.look[0] / ll) * (toParkX / pl) + (b.look[1] / ll) * (toParkZ / pl);
    if (dot < 0.45) fail(`${b.id} does not face the park (dot ${dot.toFixed(2)})`);
  }

  for (const t of TREES) {
    if (insideFence(t.x, t.z, 0.05)) fail(`tree ${t.id} trunk is inside the fence`);
  }
  const kinds = new Set(TREES.map((t) => t.kind));
  if (kinds.size < 3) fail('trees use fewer than three silhouettes');

  const deckGap = [];
  for (const p of bowl.lip) {
    if (p.x > QP.x0 && p.x < QP.x3) {
      const q = qpProfile(p.x);
      deckGap.push(p.z - q.zBottom);
    }
  }
  if (deckGap.length) {
    const minGap = Math.min(...deckGap);
    note(`closest bowl-to-quarter gap ${minGap.toFixed(2)} m`);
    if (minGap < 0.35) fail('bowl and quarterpipe intersect');
  }

  for (const [x, z] of bowl.hole) {
    for (const box of boxes) {
      if (hitsAabb(x, z, box, 0.15)) fail('bowl opening hits a street obstacle');
    }
  }

  if (mouthEnd.z > SLAB.z1 - 1 || mouthEnd.x > CORRIDOR.x0 - 0.4) {
    fail('roll-in does not land in the open flat between bowl and obstacles');
  }

  const text = [
    failures.length ? `FAIL ${failures.length}` : 'OK',
    ...notes.map((n) => `  ${n}`),
    ...failures.map((f) => `  FAIL ${f}`),
  ].join('\n');

  return { ok: failures.length === 0, failures, notes, text, corridorZ0: z0, mouthEnd, mid };
}
