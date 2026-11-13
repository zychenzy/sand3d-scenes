/** Pure layout measurements shared by the holdroom builder and the tests. */

export function bankBounds(bank, seating) {
  const seatLen = bank.seats * seating.pitch;
  const bay = bank.accessibleBay ? seating.bayLength : 0;
  const z0 = bank.z - seatLen / 2;
  const z1 = bank.z + seatLen / 2 + bay;
  const half = seating.depth / 2;
  return {
    id: bank.id,
    kind: 'seat',
    x0: bank.x - half,
    x1: bank.x + half,
    z0,
    z1,
  };
}

export function obstacles(layout) {
  const obs = layout.seating.banks.map((bank) => bankBounds(bank, layout.seating));
  const p = layout.podium;
  obs.push({
    id: 'podium',
    kind: 'podium',
    x0: p.x - p.w / 2,
    x1: p.x + p.w / 2,
    z0: p.z - p.d / 2,
    z1: p.z + p.d / 2,
  });
  const ledge = layout.ledge;
  obs.push({
    id: 'ledge',
    kind: 'ledge',
    x0: ledge.x - ledge.d / 2,
    x1: ledge.x + ledge.d / 2,
    z0: ledge.z0,
    z1: ledge.z1,
  });
  for (const scanner of layout.scanners) {
    const r = scanner.footprint / 2;
    obs.push({
      id: scanner.id,
      kind: 'scanner',
      x0: scanner.x - r,
      x1: scanner.x + r,
      z0: scanner.z - r,
      z1: scanner.z + r,
    });
  }
  return obs;
}

export function forwardXZ(rotationY) {
  return [Math.sin(rotationY), Math.cos(rotationY)];
}

export function displayAlignment(bank, layout) {
  const display = layout.displays.find((item) => item.id === bank.display);
  const dx = display.x - bank.x;
  const dz = display.z - bank.z;
  const len = Math.hypot(dx, dz) || 1;
  const face = forwardXZ(layout.seating.rotationY);
  return (face[0] * dx + face[1] * dz) / len;
}

export function rankClearances(layout) {
  const { depth, banks } = layout.seating;
  const ranks = [...new Set(banks.map((bank) => bank.rank))].sort((a, b) => a - b);
  const gaps = [];
  for (let i = 0; i < ranks.length - 1; i += 1) {
    const back = Math.max(...banks.filter((bank) => bank.rank === ranks[i]).map((bank) => bank.x + depth / 2));
    const front = Math.min(...banks.filter((bank) => bank.rank === ranks[i + 1]).map((bank) => bank.x - depth / 2));
    gaps.push({ from: ranks[i], to: ranks[i + 1], clear: front - back });
  }
  return gaps;
}

export function windowWalk(layout) {
  const innerZ = -layout.meta.room.depth / 2 + layout.shell.wallThickness;
  const south = Math.min(...layout.seating.banks.map((bank) => {
    const seatLen = bank.seats * layout.seating.pitch;
    return bank.z - seatLen / 2;
  }));
  return south - innerZ;
}

export function crossAisle(layout) {
  const { pitch, banks } = layout.seating;
  const south = Math.max(...banks.filter((bank) => bank.z < 0).map((bank) => bank.z + (bank.seats * pitch) / 2));
  const north = Math.min(...banks.filter((bank) => bank.z > 0).map((bank) => bank.z - (bank.seats * pitch) / 2));
  return north - south;
}

export function aabbOverlap(a, b, gap = 0) {
  return a.x0 < b.x1 - gap && a.x1 > b.x0 + gap && a.z0 < b.z1 - gap && a.z1 > b.z0 + gap;
}

function sampleSegment(a, b, step = 0.1) {
  const dx = b[0] - a[0];
  const dz = b[1] - a[1];
  const len = Math.hypot(dx, dz);
  const n = Math.max(1, Math.ceil(len / step));
  const pts = [];
  for (let i = 0; i <= n; i += 1) {
    const t = i / n;
    pts.push([a[0] + dx * t, a[1] + dz * t]);
  }
  return pts;
}

export function distPointAabb(px, pz, box) {
  const cx = Math.min(Math.max(px, box.x0), box.x1);
  const cz = Math.min(Math.max(pz, box.z0), box.z1);
  return Math.hypot(px - cx, pz - cz);
}

export function pathClearance(path, layout) {
  const allow = new Set(path.allow || []);
  const obs = obstacles(layout).filter((item) => !allow.has(item.id));
  let min = Infinity;
  let hit = null;
  const points = [];
  for (let i = 0; i < path.points.length - 1; i += 1) {
    points.push(...sampleSegment(path.points[i], path.points[i + 1]));
  }
  for (const [px, pz] of points) {
    for (const item of obs) {
      const dist = distPointAabb(px, pz, item);
      if (dist < min) {
        min = dist;
        hit = { id: item.id, px, pz, dist };
      }
    }
  }
  return { min, hit };
}
