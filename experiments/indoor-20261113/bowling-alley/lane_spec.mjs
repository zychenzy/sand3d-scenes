/** USBC tenpin house geometry. Metres, Y up, pins toward −Z, bowlers toward +Z. */

export const INCH = 0.0254;
export const FOOT = 0.3048;

export const LANE = {
  width: 41.5 * INCH,
  boards: 39,
  foulToHeadPin: 60 * FOOT,
  headToPit: (34 + 3 / 16) * INCH,
  approach: 15 * FOOT,
  gutter: 9.25 * INCH,
  gutterDepth: 1.875 * INCH,
  foulWidth: 0.75 * INCH,
  pinSpacing: 12 * INCH,
  pinSpot: 2.25 * INCH,
  pinHeight: 15 * INCH,
  ballDiameter: 8.5 * INCH,
  backRowRef: (31 + 3 / 16) * INCH,
  sevenEdge: 2.75 * INCH,
  arrowFromFoul: 15 * FOOT,
  arrowBoards: [5, 10, 15, 20, 25, 30, 35],
};

LANE.deckRear = LANE.foulToHeadPin + LANE.headToPit;

/** Board 1 is the right-hand edge. Board 20 is the center board. */
export function boardOffset(board) {
  const boardW = LANE.width / LANE.boards;
  return LANE.width / 2 - (board - 0.5) * boardW;
}

export function pinLocals() {
  const s = LANE.pinSpacing;
  const row = (Math.sqrt(3) / 2) * s;
  const rows = [[1], [2, 3], [4, 5, 6], [7, 8, 9, 10]];
  const pins = [];
  rows.forEach((nums, r) => {
    nums.forEach((n, i) => {
      pins.push({
        n,
        x: (i - (nums.length - 1) / 2) * s,
        down: r * row,
      });
    });
  });
  return pins;
}

export function buildHouse() {
  const g = LANE.gutter;
  const w = LANE.width;
  const cap = 0.3;
  const division = 0.22;
  const pairWidth = 4 * g + 2 * w + cap;
  const total = pairWidth * 2 + division;
  const origin = -total / 2;
  const pairs = [];
  for (let p = 0; p < 2; p += 1) {
    let x = origin + p * (pairWidth + division);
    const take = (width) => {
      const span = { x0: x, x1: x + width, cx: x + width / 2, width };
      x += width;
      return span;
    };
    const gutterL = take(g);
    const laneL = take(w);
    const gutterInL = take(g);
    const ballReturn = take(cap);
    const gutterInR = take(g);
    const laneR = take(w);
    const gutterR = take(g);
    const lanes = [
      { number: p * 2 + 1, pair: p, ...laneL, leftGutter: gutterL, rightGutter: gutterInL },
      { number: p * 2 + 2, pair: p, ...laneR, leftGutter: gutterInR, rightGutter: gutterR },
    ];
    pairs.push({
      index: p,
      gutterL,
      laneL,
      gutterInL,
      ballReturn,
      gutterInR,
      laneR,
      gutterR,
      lanes,
      x0: gutterL.x0,
      x1: gutterR.x1,
      cx: (gutterL.x0 + gutterR.x1) / 2,
    });
  }
  return {
    pairs,
    lanes: pairs.flatMap((p) => p.lanes),
    pairWidth,
    division: { x0: pairs[0].x1, x1: pairs[1].x0, cx: (pairs[0].x1 + pairs[1].x0) / 2, width: division },
    x0: origin,
    x1: origin + total,
    total,
    returnCap: cap,
  };
}

export function worldPins(lane) {
  return pinLocals().map((p) => ({
    n: p.n,
    x: lane.cx + p.x,
    z: -LANE.foulToHeadPin - p.down,
  }));
}

/** Approach guide rows, each inside a USBC station band, measured +Z from the foul line. */
export const APPROACH_DOTS = [
  { id: 'foul', feet: 4 / 12, band: [2 / 12, 6 / 12] },
  { id: 'd3', feet: 3, band: [3, 4] },
  { id: 'd6', feet: 6.5, band: [6, 7] },
  { id: 'd9', feet: 9.5, band: [9, 10] },
  { id: 'd12', feet: 11.5, band: [11, 12] },
  { id: 'd15', feet: 14.5, band: [14, 15] },
];

export function approachDotZ(row) {
  return row.feet * FOOT;
}

export const PLACED = {
  seatZ: 5.86,
  consoleZ: 5.0,
  consoleDepth: 0.38,
  consoleWidth: 0.86,
  consoleHeight: 0.74,
  aisle: { z0: 6.5, z1: 8.05 },
  entryZ: 8.32,
  hood: { width: 0.62, z0: 0.28, z1: 1.32, height: 0.5 },
  bay: 3.15,
  chairHalfX: 0.36,
  chairHalfZ: 0.34,
};

function r4(n) {
  return Math.round(n * 10000) / 10000;
}

export function furniturePlan(house = buildHouse()) {
  const chairs = house.lanes.map((lane) => ({
    id: `seat_${lane.number}`,
    kind: 'theatre_chair',
    position: [r4(lane.cx), 0, PLACED.seatZ],
    rotationY: 0,
    faces: '-Z',
  }));
  const monitors = house.pairs.map((pair) => ({
    id: `score_${pair.index + 1}`,
    kind: 'monitor',
    position: [r4(pair.ballReturn.cx), PLACED.consoleHeight, r4(PLACED.consoleZ + 0.06)],
    rotationY: Math.PI,
    faces: '+Z',
  }));
  const bench = {
    id: 'wait_bench',
    kind: 'museum_bench',
    position: [r4(house.x0 - 0.62), 0, 5.95],
    rotationY: 0,
    faces: '±X',
  };
  const counterX = r4(house.x1 + 1.85);
  const counter = {
    id: 'shoe_counter',
    kind: 'bar_counter',
    position: [counterX, 0, 6.35],
    rotationY: Math.PI / 2,
    scale: [0.595, 1, 0.363],
    faces: '-X',
  };
  const stoolZ = [5.55, 6.35, 7.15];
  const stools = stoolZ.map((z, i) => ({
    id: `shoe_stool_${i + 1}`,
    kind: 'bar_stool',
    position: [r4(counterX - 0.78), 0, z],
    rotationY: Math.PI / 2,
    faces: '-X',
  }));
  const register = {
    id: 'shoe_register',
    kind: 'cash_register',
    position: [r4(counterX + 0.02), 1.02, 5.72],
    rotationY: Math.PI / 2,
  };
  const pos = {
    id: 'shoe_pos',
    kind: 'pos_terminal',
    position: [r4(counterX - 0.02), 1.02, 6.95],
    rotationY: -Math.PI / 2,
    faces: '-X',
  };
  const lamp = {
    id: 'shoe_lamp',
    kind: 'library_lamp',
    position: [r4(counterX + 0.04), 1.02, 6.35],
    rotationY: -Math.PI / 2,
  };
  const pendants = [-1.7, 0.15, 2.05].map((x, i) => ({
    id: `pendant_${i + 1}`,
    kind: 'pendant_lamp',
    position: [x, 2.64, 6.55],
    rotationY: 0,
  }));
  const tvs = [
    {
      id: 'tv_lobby',
      kind: 'tv',
      position: [r4(house.x0 - 1.85), 0.86, 6.85],
      rotationY: 0,
      faces: '+X',
    },
  ];
  const speakers = [
    {
      id: 'speaker_l',
      kind: 'speaker',
      position: [r4(house.x0 - 0.22), 1.42, r4(-LANE.deckRear + 0.35)],
      rotationY: Math.PI / 2,
      faces: '-Z',
    },
    {
      id: 'speaker_r',
      kind: 'speaker',
      position: [r4(house.x1 + 0.22), 1.42, r4(-LANE.deckRear + 0.35)],
      rotationY: Math.PI / 2,
      faces: '-Z',
    },
  ];
  return [
    ...chairs,
    ...monitors,
    bench,
    counter,
    ...stools,
    register,
    pos,
    lamp,
    ...pendants,
    ...tvs,
    ...speakers,
  ];
}

export function floorFootprints(house = buildHouse()) {
  const plan = furniturePlan(house);
  const boxes = [];
  for (const item of plan) {
    if (item.kind === 'theatre_chair') {
      boxes.push(boxAround(item, PLACED.chairHalfX, PLACED.chairHalfZ));
    } else if (item.kind === 'museum_bench') {
      boxes.push(boxAround(item, 0.24, 0.78));
    } else if (item.kind === 'bar_counter') {
      boxes.push(boxAround(item, 0.4, 1.25));
    } else if (item.kind === 'bar_stool') {
      boxes.push(boxAround(item, 0.24, 0.24));
    }
  }
  for (const pair of house.pairs) {
    boxes.push({
      id: `console_${pair.index + 1}`,
      x0: pair.ballReturn.cx - PLACED.consoleWidth / 2,
      x1: pair.ballReturn.cx + PLACED.consoleWidth / 2,
      z0: PLACED.consoleZ - PLACED.consoleDepth / 2,
      z1: PLACED.consoleZ + PLACED.consoleDepth / 2,
    });
    boxes.push({
      id: `hood_${pair.index + 1}`,
      x0: pair.ballReturn.cx - PLACED.hood.width / 2,
      x1: pair.ballReturn.cx + PLACED.hood.width / 2,
      z0: PLACED.hood.z0,
      z1: PLACED.hood.z1,
    });
  }
  return boxes;
}

function boxAround(item, hx, hz) {
  return {
    id: item.id,
    x0: item.position[0] - hx,
    x1: item.position[0] + hx,
    z0: item.position[2] - hz,
    z1: item.position[2] + hz,
  };
}

export function intersects(a, b) {
  return a.x0 < b.x1 && a.x1 > b.x0 && a.z0 < b.z1 && a.z1 > b.z0;
}

export function approachRects(house = buildHouse()) {
  return house.lanes.map((lane) => ({
    id: `approach_${lane.number}`,
    x0: lane.x0,
    x1: lane.x1,
    z0: 0,
    z1: LANE.approach,
  }));
}

export function laneRects(house = buildHouse()) {
  return house.lanes.map((lane) => ({
    id: `lane_${lane.number}`,
    x0: lane.x0,
    x1: lane.x1,
    z0: -LANE.deckRear,
    z1: 0,
  }));
}

export function aisleRect(house = buildHouse()) {
  return {
    id: 'aisle',
    x0: house.x0,
    x1: house.x1,
    z0: PLACED.aisle.z0,
    z1: PLACED.aisle.z1,
  };
}
