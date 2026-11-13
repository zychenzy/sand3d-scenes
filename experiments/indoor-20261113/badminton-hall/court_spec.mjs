/**
 * BWF Laws of Badminton, court and net, plus the club-hall envelope around them.
 * Lengths are metres. Measurements are to the outside of the 40 mm lines.
 * A line forms part of the area it defines, so it lies inside that outside edge.
 * There is no line under the net.
 *
 * Z is the court length, net at z = 0. X is the width. Y is up.
 */

export const COURT = {
  length: 13.4,
  doublesWidth: 6.1,
  singlesWidth: 5.18,
  line: 0.04,
  shortService: 1.98,
  doublesLongFromBack: 0.76,
  diagonal: 14.723,
  netPost: 1.55,
  netCenter: 1.524,
  netDepth: 0.76,
  tape: 0.075,
  post: 0.04,
  mesh: 0.018,
  meshMin: 0.015,
  meshMax: 0.02,
};

export const RACKET = {
  length: 0.67,
  width: 0.23,
  handle: 0.18,
  shaft: 0.225,
  headHeight: 0.265,
  tube: 0.005,
  radius: 0.11,
  limitLength: 0.68,
  limitWidth: 0.23,
};

const halfD = COURT.doublesWidth / 2;
const halfL = COURT.length / 2;
const gap = 2;
const side = 2;
const gallery = 2.35;
const centersX = [-(halfD + gap / 2), halfD + gap / 2];
const outerL = centersX[0] - halfD;
const outerR = centersX[1] + halfD;

export const HALL = {
  centersX,
  halfLength: halfL,
  halfDoubles: halfD,
  halfSingles: COURT.singlesWidth / 2,
  between: gap,
  sideClearance: side,
  backClearance: 2,
  southExtra: 0.2,
  minSide: 1.5,
  minBack: 2,
  galleryWidth: gallery,
  outerLeft: outerL,
  outerRight: outerR,
  westWallX: outerL - side - gallery,
  galleryInnerX: outerL - side,
  eastWallX: outerR + side,
  northWallZ: -halfL - 2,
  southCutZ: halfL + 2 + 0.2,
  // South wall sits behind the default camera so the hall is enclosed.
  southWallZ: 21.2,
  clearHeight: 9.05,
  trussTop: 9.82,
  wallTop: 10.25,
  ceilingY: 10.08,
  dadoY: 2.35,
  soffitY: 3.15,
  lightClear: 0.75,
  battenY: 8.12,
  battenLength: 1.45,
  battenZs: [-6.2, -3.1, 0, 3.1, 6.2],
  trussZs: [-7.7, -4.6, -1.55, 1.55, 4.6, 7.7],
};

export function lightLanes() {
  return [
    (HALL.outerLeft + HALL.galleryInnerX) / 2,
    0,
    (HALL.outerRight + HALL.eastWallX) / 2,
  ];
}

export function cableY(t) {
  const u = (t - 0.5) * 2;
  const sag = COURT.netPost - COURT.netCenter;
  return COURT.netPost - sag * (1 - u * u);
}

export function postsFor(cx) {
  const w = COURT.post;
  return [
    { side: 'W', inner: cx - halfD, outward: -1, centerX: cx - halfD - w / 2 },
    { side: 'E', inner: cx + halfD, outward: 1, centerX: cx + halfD + w / 2 },
  ];
}

export function floorMarkings(cx) {
  const L = COURT.line;
  const zB = halfL;
  const xD = halfD;
  const xS = COURT.singlesWidth / 2;
  const short = COURT.shortService;
  const longBack = zB - COURT.doublesLongFromBack;
  const rects = [];
  const add = (id, x0, x1, z0, z1) => rects.push({ id, x0, x1, z0, z1 });
  add('base-n', cx - xD, cx + xD, -zB, -zB + L);
  add('base-s', cx - xD, cx + xD, zB - L, zB);
  add('dbl-w', cx - xD, cx - xD + L, -zB, zB);
  add('dbl-e', cx + xD - L, cx + xD, -zB, zB);
  add('sgl-w', cx - xS, cx - xS + L, -zB, zB);
  add('sgl-e', cx + xS - L, cx + xS, -zB, zB);
  add('short-n', cx - xD, cx + xD, -(short + L), -short);
  add('short-s', cx - xD, cx + xD, short, short + L);
  add('long-n', cx - xD, cx + xD, -longBack, -longBack + L);
  add('long-s', cx - xD, cx + xD, longBack - L, longBack);
  add('cen-n', cx - L / 2, cx + L / 2, -zB + L, -(short + L));
  add('cen-s', cx - L / 2, cx + L / 2, short + L, zB - L);
  return rects;
}

export function expandedCourt(cx, sidePad, backPad) {
  return {
    x0: cx - halfD - sidePad,
    x1: cx + halfD + sidePad,
    z0: -halfL - backPad,
    z1: halfL + backPad,
  };
}

export function racketMetrics() {
  const { tube, radius } = RACKET;
  const scaleX = (RACKET.width / 2 - tube) / radius;
  const scaleY = (RACKET.headHeight / 2 - tube) / radius;
  const headCenter = RACKET.handle + RACKET.shaft + RACKET.headHeight / 2;
  const top = headCenter + RACKET.headHeight / 2;
  return {
    scaleX,
    scaleY,
    radius,
    tube,
    headCenter,
    top,
    width: 2 * (radius * scaleX + tube),
    length: top,
  };
}
