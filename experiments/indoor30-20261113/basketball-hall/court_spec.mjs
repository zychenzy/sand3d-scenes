/**
 * FIBA court, 2024 Official Basketball Rules (court) and Basketball Equipment.
 * Metres. Inner edges of the boundary lines are the 28 m × 15 m court.
 * Boundary lines are outside that rectangle and are not part of the court.
 *
 * X is the width (sidelines). Z is the length (endlines).
 * sign +1 is the near end (+Z). sign −1 is the far end (−Z).
 * The basket centre used here is the centre of the ring:
 * backboard face 1.200 m in from the endline, plus the 0.151 m ring gap,
 * plus the 0.225 m inner radius → 1.576 m. The rules text rounds that
 * point to 1.575 m.
 */

export const COURT = {
  length: 28,
  width: 15,
  line: 0.05,
  runoff: 2,
  backboardInset: 1.2,
  ringGap: 0.151,
  ringInner: 0.45,
  ringTube: 0.018,
  ringHeight: 3.05,
  backboardW: 1.8,
  backboardH: 1.05,
  targetW: 0.59,
  targetH: 0.45,
  targetAboveBottom: 0.15,
  freeThrowFromEnd: 5.8,
  freeThrowLength: 3.6,
  laneOuter: 2.45,
  centerRadius: 1.8,
  freeThrowRadius: 1.8,
  threeRadius: 6.75,
  threeLane: 0.9,
  noChargeRadius: 1.3,
  noChargeLeg: 0.375,
  throwInFromEnd: 8.325,
  throwInLen: 0.15,
  centerOverhang: 0.15,
  clearHeight: 7,
  ceiling: 7.5,
};

export function half() {
  return { L: COURT.length / 2, W: COURT.width / 2 };
}

export function basketInset() {
  return COURT.backboardInset + COURT.ringGap + COURT.ringInner / 2;
}

export function basketCenter(sign) {
  const { L } = half();
  return { x: 0, z: sign * (L - basketInset()) };
}

export function backboardFaceZ(sign) {
  const { L } = half();
  return sign * (L - COURT.backboardInset);
}

export function ringCenter(sign) {
  const face = backboardFaceZ(sign);
  return {
    x: 0,
    y: COURT.ringHeight,
    z: face - sign * (COURT.ringGap + COURT.ringInner / 2),
  };
}

export function backboardBottomY() {
  return COURT.ringHeight - COURT.targetAboveBottom;
}

export function freeThrow(sign) {
  const { L } = half();
  const farEdge = sign * (L - COURT.freeThrowFromEnd);
  const baselineEdge = farEdge + sign * COURT.line;
  return {
    farEdge,
    baselineEdge,
    x0: -COURT.freeThrowLength / 2,
    x1: COURT.freeThrowLength / 2,
    centerZ: (farEdge + baselineEdge) / 2,
  };
}

export function threePoint(sign) {
  const { W } = half();
  const xOuter = W - COURT.threeLane;
  const theta = Math.asin(xOuter / COURT.threeRadius);
  const b = basketCenter(sign);
  const dir = -sign;
  return {
    radius: COURT.threeRadius,
    xOuter,
    theta,
    basket: b,
    dir,
    joinZ: b.z + dir * Math.cos(theta) * COURT.threeRadius,
  };
}

export function threePointPoint(sign, angle) {
  const t = threePoint(sign);
  return {
    x: Math.sin(angle) * t.radius,
    z: t.basket.z + t.dir * Math.cos(angle) * t.radius,
  };
}

export function noCharge(sign) {
  const face = backboardFaceZ(sign);
  const b = basketCenter(sign);
  return {
    radius: COURT.noChargeRadius,
    xOuter: COURT.noChargeRadius,
    zWall: face,
    zCourt: face - sign * COURT.noChargeLeg,
    basket: b,
    dir: -sign,
  };
}

export function runoffBounds() {
  const { L, W } = half();
  const r = COURT.runoff;
  return { x0: -(W + r), x1: W + r, z0: -(L + r), z1: L + r };
}

export function intersects(a, b) {
  return a.x1 > b.x0 + 1e-6 && a.x0 < b.x1 - 1e-6 && a.z1 > b.z0 + 1e-6 && a.z0 < b.z1 - 1e-6;
}

export function keyRect(sign) {
  const { L } = half();
  const ft = freeThrow(sign);
  const zEnd = sign * L;
  return {
    x0: -COURT.laneOuter,
    x1: COURT.laneOuter,
    z0: Math.min(zEnd, ft.farEdge),
    z1: Math.max(zEnd, ft.farEdge),
  };
}

/** Straight painted bands. Arcs are sampled separately. */
export function straightMarks() {
  const { L, W } = half();
  const t = COURT.line;
  const rects = [];
  const add = (id, x0, x1, z0, z1) => rects.push({
    id,
    x0: Math.min(x0, x1),
    x1: Math.max(x0, x1),
    z0: Math.min(z0, z1),
    z1: Math.max(z0, z1),
  });

  add('sideline_pos', W, W + t, -(L + t), L + t);
  add('sideline_neg', -(W + t), -W, -(L + t), L + t);
  add('endline_pos', -(W + t), W + t, L, L + t);
  add('endline_neg', -(W + t), W + t, -(L + t), -L);
  add('center', -(W + t + COURT.centerOverhang), W + t + COURT.centerOverhang, -t / 2, t / 2);

  for (const sign of [-1, 1]) {
    const tag = sign > 0 ? 'near' : 'far';
    const ft = freeThrow(sign);
    const zLine0 = Math.min(ft.farEdge, ft.baselineEdge);
    const zLine1 = Math.max(ft.farEdge, ft.baselineEdge);
    add(`ft_${tag}`, ft.x0, ft.x1, zLine0, zLine1);
    add(`lane_pos_${tag}`, COURT.laneOuter - t, COURT.laneOuter, Math.min(sign * L, ft.farEdge), Math.max(sign * L, ft.farEdge));
    add(`lane_neg_${tag}`, -COURT.laneOuter, -(COURT.laneOuter - t), Math.min(sign * L, ft.farEdge), Math.max(sign * L, ft.farEdge));
    const wing = (COURT.laneOuter - COURT.freeThrowLength / 2);
    add(`ft_wing_pos_${tag}`, COURT.freeThrowLength / 2, COURT.freeThrowLength / 2 + wing, zLine0, zLine1);
    add(`ft_wing_neg_${tag}`, -(COURT.freeThrowLength / 2 + wing), -COURT.freeThrowLength / 2, zLine0, zLine1);

    const tp = threePoint(sign);
    const zJoin = tp.joinZ;
    const zBase = sign * L;
    add(`three_pos_${tag}`, tp.xOuter - t, tp.xOuter, Math.min(zJoin, zBase), Math.max(zJoin, zBase));
    add(`three_neg_${tag}`, -tp.xOuter, -(tp.xOuter - t), Math.min(zJoin, zBase), Math.max(zJoin, zBase));

    const nc = noCharge(sign);
    add(`nc_pos_${tag}`, nc.xOuter - t, nc.xOuter, Math.min(nc.zWall, nc.zCourt), Math.max(nc.zWall, nc.zCourt));
    add(`nc_neg_${tag}`, -nc.xOuter, -(nc.xOuter - t), Math.min(nc.zWall, nc.zCourt), Math.max(nc.zWall, nc.zCourt));
  }

  for (const mark of throwInMarks()) add(mark.id, mark.x0, mark.x1, mark.z0, mark.z1);
  return rects;
}

export function throwInMarks() {
  const { L, W } = half();
  const marks = [];
  for (const sign of [-1, 1]) {
    for (const side of [-1, 1]) {
      const zOuter = sign * (L - COURT.throwInFromEnd);
      const zInner = zOuter - sign * COURT.line;
      const x0 = side * (W + COURT.line);
      const x1 = side * (W + COURT.line + COURT.throwInLen);
      const tag = `${sign > 0 ? 'near' : 'far'}_${side > 0 ? 'pos' : 'neg'}`;
      marks.push({
        id: `throw_${tag}`,
        side,
        sign,
        x0: Math.min(x0, x1),
        x1: Math.max(x0, x1),
        z0: Math.min(zOuter, zInner),
        z1: Math.max(zOuter, zInner),
      });
    }
  }
  return marks;
}

/** +Z forward, then yaw about Y. */
export function forwardFromYaw(yaw) {
  return { x: Math.sin(yaw), z: Math.cos(yaw) };
}

/** Bookcase open side is local −Z before yaw. */
export function openFromYaw(yaw) {
  return { x: -Math.sin(yaw), z: -Math.cos(yaw) };
}
