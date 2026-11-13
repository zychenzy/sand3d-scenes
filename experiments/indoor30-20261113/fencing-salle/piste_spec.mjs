/** FIE piste geometry and Salle Montjoie clearances. Metres, Y up. Pure data — no three.js. */

export const PISTE = {
  length: 14,
  width: 1.5,
  onGuard: 2,
  warning: 2,
  line: 0.05,
  dash: 0.12,
  gap: 0.08,
};

export const PLANKS = 0.085;

export const HALL = {
  pisteAX: -2.2,
  pisteBX: 2.2,
  runback: 2,
  wallL: -6.24,
  wallR: 6.58,
  wallFar: -9.15,
  cutZ: 8.75,
  floorFar: -9.2,
  floorNear: 14.0,
  height: 5.08,
  wainscot: 1.18,
  clerestory0: 3.42,
  clerestory1: 4.32,
  soffitY: 3.05,
  soffitX: 4.9,
  soffitZ0: -2.7,
  soffitZ1: 2.05,
  coachBox: { x0: 3.45, x1: 4.2, z0: -0.72, z1: 0.72 },
  scoreMin: 1,
  scoreMax: 5,
};

/** Bell lip above the pommel on the baked weapons. Rack rail top is local y 0.794. */
export const WEAPON_BELL_LIP = 0.179;
export const RACK_RAIL_TOP = 0.794;

/**
 * Coach bay, wall side of piste B. The table sits between the marked coach box
 * and the wall. The stool is on the wall side of the table, looking across it
 * toward the pistes (−X). The diagram is mounted on the right wall.
 */
export const COACH_FIT = {
  table: { x: 5.55, z: 0.15, hx: 0.28, hz: 0.62, top: 0.74 },
  stool: { x: 6.22, z: 0.15, hx: 0.18, hz: 0.18, seat: 0.46 },
  diagram: { x: 6.51, y: 1.52, z: 0.0, w: 1.12, h: 0.74 },
};

export const REELS = [
  { id: "reel_a_far", x: -3.55, z: -6.5 },
  { id: "reel_a_near", x: -3.55, z: 6.5 },
  { id: "reel_b_far", x: 3.55, z: -6.5 },
  { id: "reel_b_near", x: 3.55, z: 6.5 },
];

export function frame(cx, cz = 0) {
  const halfL = PISTE.length / 2;
  const halfW = PISTE.width / 2;
  return {
    cx,
    cz,
    x0: cx - halfW,
    x1: cx + halfW,
    z0: cz - halfL,
    z1: cz + halfL,
  };
}

export function pisteFrames() {
  return [frame(HALL.pisteAX), frame(HALL.pisteBX)];
}

export function innerGap() {
  const [a, b] = pisteFrames();
  return b.x0 - a.x1;
}

export function centerDashes(x0, x1) {
  const { dash, gap } = PISTE;
  const pitch = dash + gap;
  const width = x1 - x0;
  const n = Math.max(1, Math.floor((width + gap) / pitch));
  const used = n * dash + (n - 1) * gap;
  let x = x0 + (width - used) / 2;
  const out = [];
  for (let i = 0; i < n; i += 1) {
    out.push([x, x + dash]);
    x += pitch;
  }
  return out;
}

/** Floor paint in the piste's own plane. Rear-limit lines sit inside the 14 m, on the outer edge. */
export function markings(cx) {
  const f = frame(cx);
  const h = PISTE.line / 2;
  const rects = [];
  for (const z of [-PISTE.onGuard, PISTE.onGuard]) {
    rects.push({ id: "onguard", x0: f.x0, x1: f.x1, z0: z - h, z1: z + h });
  }
  rects.push({ id: "rear", x0: f.x0, x1: f.x1, z0: f.z0, z1: f.z0 + PISTE.line });
  rects.push({ id: "rear", x0: f.x0, x1: f.x1, z0: f.z1 - PISTE.line, z1: f.z1 });
  for (const [a, b] of centerDashes(f.x0, f.x1)) {
    rects.push({ id: "center", x0: a, x1: b, z0: -h, z1: h });
  }
  return rects;
}

export function warningZones(cx) {
  const f = frame(cx);
  return [
    { x0: f.x0, x1: f.x1, z0: f.z0, z1: f.z0 + PISTE.warning },
    { x0: f.x0, x1: f.x1, z0: f.z1 - PISTE.warning, z1: f.z1 },
  ];
}

export function forbiddenZones() {
  const zones = [];
  for (const f of pisteFrames()) {
    zones.push({ id: "piste", x0: f.x0, x1: f.x1, z0: f.z0, z1: f.z1 });
    zones.push({ id: "runback", x0: f.x0, x1: f.x1, z0: f.z0 - HALL.runback, z1: f.z0 });
    zones.push({ id: "runback", x0: f.x0, x1: f.x1, z0: f.z1, z1: f.z1 + HALL.runback });
  }
  const [a, b] = pisteFrames();
  zones.push({
    id: "referee",
    x0: a.x1,
    x1: b.x0,
    z0: a.z0 - HALL.runback,
    z1: a.z1 + HALL.runback,
  });
  const c = HALL.coachBox;
  zones.push({ id: "coach-box", x0: c.x0, x1: c.x1, z0: c.z0, z1: c.z1 });
  return zones;
}

export function overlaps(a, b, pad = 0) {
  return a.x0 < b.x1 - pad && a.x1 > b.x0 + pad && a.z0 < b.z1 - pad && a.z1 > b.z0 + pad;
}

/** Distance from a piste's outer edge to the near face of a score machine. */
export function scoreClearance(box, piste) {
  if (box.x1 <= piste.x0) return piste.x0 - box.x1;
  if (box.x0 >= piste.x1) return box.x0 - piste.x1;
  return 0;
}
