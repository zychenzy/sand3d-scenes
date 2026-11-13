// World Curling Federation, The Rules of Curling, July 2024, R1.
// Lengths are metres. The sheet centre is the origin. +Z is the near (home) end.

export const SHEET = {
  length: 45.720,
  width: 4.750,
  teeFromCentre: 17.375,
  backFromTee: 1.829,
  hogFromTee: 6.401,
  hogWidth: 0.102,
  lineWidth: 0.013,
  centreBeyondTee: 3.658,
  hackLineLength: 0.457,
  courtesyFromHog: 1.219,
  courtesyLength: 0.152,
  houseRadii: [1.829, 1.219, 0.610, 0.152],
  hackInset: 0.076,
  hackWidth: 0.152,
  hackForward: 0.190,
  hackProud: 0.04,
};

export const STONE = {
  diameter: 0.286,
  height: 0.120,
  maxCircumference: 0.914,
  minHeight: 0.114,
};

export const LOUNGE = {
  floorX0: 3.18,
  floorX1: 6.28,
  floorZ0: 9.20,
  floorZ1: 22.70,
  floorY: 0.18,
  soffitY: 3.22,
  glassX: 3.02,
  doorZ0: 12.55,
  doorZ1: 13.60,
  aisle: 0.80,
};

export const HALL = {
  x0: -3.55,
  x1: 2.88,
  z0: -23.50,
  z1: 25.90,
  roofY: 5.04,
  loungeX1: 6.55,
};

export function frame() {
  const tee = SHEET.teeFromCentre;
  return {
    halfL: SHEET.length / 2,
    halfW: SHEET.width / 2,
    tee,
    centreEnd: tee + SHEET.centreBeyondTee,
    backOutside: tee + SHEET.backFromTee,
    hogInside: tee - SHEET.hogFromTee,
  };
}

export function lineRects() {
  const f = frame();
  const w = SHEET.lineWidth;
  const rects = [
    { id: 'side_l', x0: -f.halfW, x1: -f.halfW + w, z0: -f.halfL, z1: f.halfL },
    { id: 'side_r', x0: f.halfW - w, x1: f.halfW, z0: -f.halfL, z1: f.halfL },
    { id: 'centre', x0: -w / 2, x1: w / 2, z0: -f.centreEnd, z1: f.centreEnd },
  ];
  for (const s of [1, -1]) {
    const tee = s * f.tee;
    rects.push({ id: `tee_${s}`, x0: -f.halfW, x1: f.halfW, z0: tee - w / 2, z1: tee + w / 2 });
    const backOut = s * f.backOutside;
    const backIn = backOut - s * w;
    rects.push({
      id: `back_${s}`,
      x0: -f.halfW,
      x1: f.halfW,
      z0: Math.min(backOut, backIn),
      z1: Math.max(backOut, backIn),
    });
    const hogIn = s * f.hogInside;
    const hogFar = hogIn - s * SHEET.hogWidth;
    rects.push({
      id: `hog_${s}`,
      hog: true,
      x0: -f.halfW,
      x1: f.halfW,
      z0: Math.min(hogIn, hogFar),
      z1: Math.max(hogIn, hogFar),
    });
    const hackEdge = s * f.centreEnd;
    const hackFar = hackEdge + s * w;
    rects.push({
      id: `hackline_${s}`,
      x0: -SHEET.hackLineLength / 2,
      x1: SHEET.hackLineLength / 2,
      z0: Math.min(hackEdge, hackFar),
      z1: Math.max(hackEdge, hackFar),
    });
    const cz = hogIn + s * SHEET.courtesyFromHog;
    rects.push({
      id: `courtesy_${s}_l`,
      x0: -f.halfW,
      x1: -f.halfW + SHEET.courtesyLength,
      z0: cz - w / 2,
      z1: cz + w / 2,
    });
    rects.push({
      id: `courtesy_${s}_r`,
      x0: f.halfW - SHEET.courtesyLength,
      x1: f.halfW,
      z0: cz - w / 2,
      z1: cz + w / 2,
    });
  }
  return rects;
}

export function hacks() {
  const end = frame().centreEnd;
  const boxes = [];
  for (const s of [1, -1]) {
    const back = s * end;
    const front = back - s * SHEET.hackForward;
    for (const side of [1, -1]) {
      const xIn = side * SHEET.hackInset;
      const xOut = side * (SHEET.hackInset + SHEET.hackWidth);
      boxes.push({
        end: s,
        x0: Math.min(xIn, xOut),
        x1: Math.max(xIn, xOut),
        z0: Math.min(front, back),
        z1: Math.max(front, back),
      });
    }
  }
  return boxes;
}

const RACK_PITCH = 0.34;

export function racks() {
  const z = 21.90;
  return [
    { id: 'near_red', color: 'red', x: -1.36, z, spanX: 1.40, spanZ: 0.72, skip: [7, 8] },
    { id: 'near_yellow', color: 'yellow', x: 1.36, z, spanX: 1.40, spanZ: 0.72, skip: [8] },
    { id: 'far_red', color: 'red', x: -1.36, z: -z, spanX: 1.40, spanZ: 0.72, skip: 'all' },
    { id: 'far_yellow', color: 'yellow', x: 1.36, z: -z, spanX: 1.40, spanZ: 0.72, skip: 'all' },
  ];
}

export function rackSlots(rack) {
  if (rack.skip === 'all') return [];
  const skip = new Set(rack.skip || []);
  const slots = [];
  let n = 1;
  for (const row of [-0.5, 0.5]) {
    for (const col of [-1.5, -0.5, 0.5, 1.5]) {
      if (!skip.has(n)) {
        slots.push({
          n,
          color: rack.color,
          x: rack.x + col * RACK_PITCH,
          z: rack.z + row * RACK_PITCH,
        });
      }
      n += 1;
    }
  }
  return slots;
}

export function playedStones() {
  return [
    { id: 'red_7', color: 'red', n: 7, x: 0.22, z: 17.50 },
    { id: 'red_8', color: 'red', n: 8, x: 0.58, z: 13.40 },
    { id: 'yellow_8', color: 'yellow', n: 8, x: -0.68, z: 16.92 },
  ];
}

export function brushes() {
  const stand = (z0, x) => [
    { x, z: z0, yaw: 0.35, lean: 0.12, color: '#c23b3b' },
    { x, z: z0 + 0.20, yaw: -0.25, lean: 0.08, color: '#e0b12e' },
    { x, z: z0 + 0.40, yaw: 0.55, lean: 0.16, color: '#2c3136' },
    { x, z: z0 + 0.60, yaw: 0.05, lean: 0.06, color: '#c23b3b' },
  ];
  return [
    ...stand(21.20, -2.95),
    ...stand(-21.90, -2.95).slice(0, 2),
  ];
}
