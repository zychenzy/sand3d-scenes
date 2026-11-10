/**
 * WSF singles-court markings (millimetres converted to metres).
 * Source: WSF court specification as republished in the Sports Authority of India
 * infrastructure manual, section 11 (see refs/SOURCES.md). Club tin is 480 mm,
 * not the optional 430 mm PSA championship tin.
 *
 * Z runs from the front wall (smaller z) toward the back wall (larger z).
 * X runs from the left wall (negative) to the right wall (positive).
 */

export const COURT = {
  length: 9.75,
  width: 6.4,
  line: 0.05,
  tinTop: 0.48,
  serviceLower: 1.78,
  frontOutLower: 4.57,
  backOutLower: 2.13,
  shortFromBack: 4.26,
  boxInternal: 1.6,
  clearHeight: 5.64,
  doorMaxWidth: 0.9,
  doorMaxHeight: 2.13,
};

/** Perpendicular 50 mm offset of the side-wall out line, in (z, y). */
export function sideLineBand() {
  const dz = COURT.length;
  const dy = COURT.backOutLower - COURT.frontOutLower;
  const len = Math.hypot(dz, dy);
  const nz = -dy / len;
  const ny = dz / len;
  return { dz: nz * COURT.line, dy: ny * COURT.line, length: len };
}

export function outY(z, frontZ, backZ) {
  const t = (z - frontZ) / (backZ - frontZ);
  return COURT.frontOutLower + (COURT.backOutLower - COURT.frontOutLower) * t;
}

export function frame(frontZ) {
  const backZ = frontZ + COURT.length;
  const halfW = COURT.width / 2;
  const shortNear = backZ - COURT.shortFromBack;
  const shortFar = shortNear - COURT.line;
  const boxBackInner = shortNear + COURT.boxInternal;
  const boxBackOuter = boxBackInner + COURT.line;
  return {
    frontZ,
    backZ,
    halfW,
    leftX: -halfW,
    rightX: halfW,
    shortNear,
    shortFar,
    boxBackInner,
    boxBackOuter,
    leftBoxInnerX: -halfW + COURT.boxInternal,
    rightBoxInnerX: halfW - COURT.boxInternal,
  };
}

export function serviceBoxInterior(frontZ, side) {
  const f = frame(frontZ);
  if (side === 'left') {
    return { x0: f.leftX, x1: f.leftBoxInnerX, z0: f.shortNear, z1: f.boxBackInner };
  }
  return { x0: f.rightBoxInnerX, x1: f.rightX, z0: f.shortNear, z1: f.boxBackInner };
}

export function floorMarkings(frontZ) {
  const f = frame(frontZ);
  const L = COURT.line;
  const rects = [
    { id: 'short', x0: f.leftX, x1: f.rightX, z0: f.shortFar, z1: f.shortNear },
    { id: 'half', x0: -L / 2, x1: L / 2, z0: f.shortNear, z1: f.backZ },
    { id: 'box-l-side', x0: f.leftBoxInnerX, x1: f.leftBoxInnerX + L, z0: f.shortNear, z1: f.boxBackOuter },
    { id: 'box-l-back', x0: f.leftX, x1: f.leftBoxInnerX + L, z0: f.boxBackInner, z1: f.boxBackOuter },
    { id: 'box-r-side', x0: f.rightBoxInnerX - L, x1: f.rightBoxInnerX, z0: f.shortNear, z1: f.boxBackOuter },
    { id: 'box-r-back', x0: f.rightBoxInnerX - L, x1: f.rightX, z0: f.boxBackInner, z1: f.boxBackOuter },
  ];
  return { frame: f, rects };
}
