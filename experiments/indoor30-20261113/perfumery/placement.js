/** Shared organ, seat, and path math. No Three.js. */

export const PI = Math.PI;

export function forwardXZ(rotationY) {
  return [Math.sin(rotationY), Math.cos(rotationY)];
}

export function facingDot(position, rotationY, target) {
  const dx = target[0] - position[0];
  const dz = target[2] - position[2];
  const len = Math.hypot(dx, dz) || 1;
  const [fx, fz] = forwardXZ(rotationY);
  return (fx * dx + fz * dz) / len;
}

export function organSlots(organ) {
  const slots = [];
  for (const tier of organ.tiers) {
    const rows = tier.rows || 1;
    const gap = tier.rowGap || 0;
    for (let row = 0; row < rows; row++) {
      const n = tier.count;
      const radius = tier.r + (row - (rows - 1) / 2) * gap;
      const stagger = row % 2 === 1 ? 0.5 : 0;
      for (let i = 0; i < n; i++) {
        const t = n === 1 ? 0 : Math.max(-1, Math.min(1, ((i + stagger) / (n - 1 + stagger)) * 2 - 1));
        const ang = Math.PI + t * organ.half;
        const x = organ.cx + Math.sin(ang) * radius;
        const z = organ.cz + Math.cos(ang) * radius;
        const family = familyAt(t);
        const kind = bottleKind(tier.id, family, i + row * 3);
        const front = row === 0;
        slots.push({
          id: `organ_${tier.id}_r${row}_${i}`,
          kind,
          family,
          tier: tier.id,
          t,
          position: [x, tier.y, z],
          rotationY: ang + Math.PI,
          scale: (front ? 0.96 : 0.86) + (i % 3) * 0.03,
        });
      }
    }
  }
  return slots;
}

export function familyAt(t) {
  if (t < -0.34) return 'citrus';
  if (t < 0.02) return 'floral';
  if (t < 0.4) return 'wood';
  return 'resin';
}

export function bottleKind(tierId, family, i) {
  if (tierId === 'high' && i % 2 === 0) return 'flacon_atomizer';
  if (family === 'citrus') return i % 5 === 0 ? 'flacon_atomizer' : 'flacon_rect';
  if (family === 'floral') return i % 4 === 0 ? 'flacon_atomizer' : 'flacon_shoulder';
  if (family === 'wood') return 'flacon_round';
  return i % 5 === 0 ? 'flacon_atomizer' : 'flacon_oval';
}

export function familyMarks(organ) {
  return [
    { id: 'citrus', t: -0.67, text: 'CITRUS' },
    { id: 'floral', t: -0.16, text: 'FLORAL' },
    { id: 'wood', t: 0.21, text: 'WOOD' },
    { id: 'resin', t: 0.7, text: 'RESIN' },
  ].map((mark) => {
    const ang = Math.PI + mark.t * organ.half;
    const tier = organ.tiers[1];
    return {
      ...mark,
      position: [organ.cx + Math.sin(ang) * (tier.r - 0.2), tier.y + 0.02, organ.cz + Math.cos(ang) * (tier.r - 0.2)],
      rotationY: ang + Math.PI,
    };
  });
}

function distPointRect(px, pz, rect) {
  const dx = Math.abs(px - rect.x) - rect.hw;
  const dz = Math.abs(pz - rect.z) - rect.hd;
  return Math.hypot(Math.max(dx, 0), Math.max(dz, 0));
}

export function obstacleClearance(px, pz, obstacles) {
  let best = Infinity;
  for (const o of obstacles) {
    const d = o.r != null
      ? Math.hypot(px - o.x, pz - o.z) - o.r
      : distPointRect(px, pz, o);
    if (d < best) best = d;
  }
  return best;
}

export function samplePath(points, step = 0.25) {
  const out = [];
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i];
    const b = points[i + 1];
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const n = Math.max(1, Math.ceil(len / step));
    for (let k = 0; k <= n; k++) {
      const t = k / n;
      out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
    }
  }
  return out;
}
