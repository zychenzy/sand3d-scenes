/** Dome + inward-facing seat plan. Pure data so tests and the scene share one layout. */

export const DOME = {
  cx: -0.6,
  cz: -1.45,
  R: 4.45,
  phiStart: -0.88 * Math.PI,
  phiLength: 1.18 * Math.PI,
};

export const RINGS = [
  {
    id: 'inner',
    r: 1.9,
    y: 0,
    phis: [-2.45, -1.92, -1.38, -0.62, 0.0, 0.55],
  },
  {
    id: 'outer',
    r: 3.38,
    y: 0.14,
    phis: [-2.55, -2.2, -1.85, -1.5, -0.85, -0.5, -0.15, 0.22, 0.58],
  },
];

/** Outer-row step segments. The gap between them is the radial aisle. */
export const STEPS = [
  { phi0: -2.72, phi1: -1.34, r0: 2.92, r1: 3.88 },
  { phi0: -1.01, phi1: 0.76, r0: 2.92, r1: 3.88 },
];

function round4(n) {
  return Math.round(n * 10000) / 10000;
}

/**
 * Theatre-chair GLB faces local -Z (cushion / front) with the backrest at local +Z.
 * rotationY turns that facing onto the projector.
 */
export function seatFromPhi(phi, r, y, center) {
  const cx = center[0];
  const cz = center[1];
  const x = cx - r * Math.cos(phi);
  const z = cz + r * Math.sin(phi);
  const rotationY = Math.atan2(-(cx - x), -(cz - z));
  return { x, y, z, rotationY, phi };
}

export function expandSeats(layout) {
  const kept = (layout.instances || []).filter((inst) => inst.kind !== 'theatre_chair');
  const center = [DOME.cx, DOME.cz];
  const seats = [];
  for (const ring of RINGS) {
    ring.phis.forEach((phi, i) => {
      const s = seatFromPhi(phi, ring.r, ring.y, center);
      seats.push({
        id: `seat_${ring.id}_${i}`,
        kind: 'theatre_chair',
        position: [round4(s.x), round4(s.y), round4(s.z)],
        rotationY: round4(s.rotationY),
        phi,
      });
    });
  }
  layout.instances = kept.concat(seats);
  layout.seatWorld = seats;
  return layout;
}
