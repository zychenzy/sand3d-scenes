/** Shared garden-cinema placement. No Three.js — tests and the scene both import this. */

export function round(n, d = 3) {
  const p = 10 ** d;
  return Math.round(n * p) / p;
}

/** Three.js Y rotation: local +Z maps to (sin θ, 0, cos θ). */
export function worldPoint(local, position, rotationY) {
  const lx = local[0];
  const ly = local[1];
  const lz = local[2];
  const c = Math.cos(rotationY);
  const s = Math.sin(rotationY);
  return [
    position[0] + lx * c + lz * s,
    position[1] + ly,
    position[2] - lx * s + lz * c,
  ];
}

export function expandChairs(site) {
  const { rows, xLeft, xRight, stagger, toe, screenZ, stripes } = site.seating;
  const chairs = [];
  rows.forEach((z, ri) => {
    const bases = [...xLeft, ...xRight];
    bases.forEach((base, i) => {
      const shift = ri % 2 ? stagger * Math.sign(base) : 0;
      const x = base + shift;
      const rotationY = Math.atan2(x, z - screenZ) * toe;
      const side = i < xLeft.length ? 'L' : 'R';
      const idx = i % xLeft.length;
      const pair = Math.floor(i / 2);
      const stripe = stripes[(ri + pair) % stripes.length];
      chairs.push({
        id: `deck_r${ri}_${side}${idx}`,
        position: [round(x), site.lawnY, round(z)],
        rotationY: round(rotationY, 4),
        stripe,
      });
    });
  });
  return chairs;
}

export function footprint(chair, site) {
  const hw = site.chair.halfWidth;
  const hd = site.chair.halfDepth;
  const pts = [
    [-hw, -hd],
    [hw, -hd],
    [-hw, hd],
    [hw, hd],
  ].map(([x, z]) => worldPoint([x, 0, z], chair.position, chair.rotationY));
  const xs = pts.map((p) => p[0]);
  const zs = pts.map((p) => p[2]);
  return {
    minX: Math.min(...xs),
    maxX: Math.max(...xs),
    minZ: Math.min(...zs),
    maxZ: Math.max(...zs),
    minY: chair.position[1],
    maxY: chair.position[1] + site.chair.height,
  };
}

function overlap(a0, a1, b0, b1) {
  return Math.min(a1, b1) - Math.max(a0, b0);
}

function boxesOverlap(a, b, pad = 0.02) {
  return (
    overlap(a.minX, a.maxX, b.minX, b.maxX) > pad &&
    overlap(a.minZ, a.maxZ, b.minZ, b.maxZ) > pad &&
    overlap(a.minY ?? -1, a.maxY ?? 99, b.minY ?? -1, b.maxY ?? 99) > pad
  );
}

function rectToBox(r, minY = 0, maxY = 3) {
  return { minX: r.minX, maxX: r.maxX, minZ: r.minZ, maxZ: r.maxZ, minY, maxY };
}

/** Ray segment origin→end against an AABB. Returns t in [0,1] or null. */
export function segmentHitsAabb(origin, end, box) {
  const min = box.min || box.aabb?.min;
  const max = box.max || box.aabb?.max;
  const bmin = min.length ? min : [box.minX, box.minY, box.minZ];
  const bmax = max.length ? max : [box.maxX, box.maxY, box.maxZ];
  const dir = [0, 1, 2].map((i) => end[i] - origin[i]);
  let tmin = 0;
  let tmax = 1;
  for (let i = 0; i < 3; i++) {
    if (Math.abs(dir[i]) < 1e-9) {
      if (origin[i] < bmin[i] || origin[i] > bmax[i]) return null;
    } else {
      let t1 = (bmin[i] - origin[i]) / dir[i];
      let t2 = (bmax[i] - origin[i]) / dir[i];
      if (t1 > t2) [t1, t2] = [t2, t1];
      tmin = Math.max(tmin, t1);
      tmax = Math.min(tmax, t2);
      if (tmin > tmax) return null;
    }
  }
  return tmin;
}

function boxFromAabb(aabb) {
  return {
    minX: aabb.min[0],
    maxX: aabb.max[0],
    minY: aabb.min[1],
    maxY: aabb.max[1],
    minZ: aabb.min[2],
    maxZ: aabb.max[2],
    min: aabb.min,
    max: aabb.max,
  };
}

export function analyze(layout) {
  const site = layout.site;
  const chairs = expandChairs(site);
  const issues = [];
  const feet = [];
  const prints = chairs.map((chair) => ({ chair, box: footprint(chair, site) }));
  const screen = boxFromAabb(site.screen.aabb);
  const screenCenter = site.screen.center;

  const ids = new Set();
  for (const { chair, box } of prints) {
    if (ids.has(chair.id)) issues.push(`${chair.id} duplicate id`);
    ids.add(chair.id);

    const foot = worldPoint(site.chair.foot, chair.position, chair.rotationY);
    const back = worldPoint(site.chair.back, chair.position, chair.rotationY);
    const fwdX = -Math.sin(chair.rotationY);
    const fwdZ = -Math.cos(chair.rotationY);
    const toX = screenCenter[0] - chair.position[0];
    const toZ = screenCenter[2] - chair.position[2];
    const dot = (fwdX * toX + fwdZ * toZ) / (Math.hypot(toX, toZ) || 1);
    const faces = foot[2] < back[2] - 0.25 && dot > 0.9 && Math.abs(chair.rotationY) < 1.05;
    feet.push({
      id: chair.id,
      stripe: chair.stripe,
      rotationY: chair.rotationY,
      footZ: round(foot[2], 3),
      backZ: round(back[2], 3),
      dot: round(dot, 3),
      faces,
    });
    if (!faces) {
      issues.push(
        `${chair.id} not facing screen (footZ ${foot[2].toFixed(2)} backZ ${back[2].toFixed(2)} dot ${dot.toFixed(2)} yaw ${chair.rotationY.toFixed(2)})`,
      );
    }
    if (!(box.minZ > screen.maxZ + 0.4)) {
      issues.push(`${chair.id} too close to or behind the screen`);
    }
    if (boxesOverlap(box, screen, 0.0)) issues.push(`${chair.id} intersects the screen`);

    for (const [name, aisle] of Object.entries(site.aisles)) {
      const aisleBox = rectToBox(aisle, 0, 2);
      if (boxesOverlap(box, aisleBox, 0.03)) issues.push(`${chair.id} blocks ${name} aisle`);
    }

    const cable = site.cable;
    const cableBox = {
      minX: cable.x - cable.halfWidth,
      maxX: cable.x + cable.halfWidth,
      minZ: Math.min(cable.z0, cable.z1),
      maxZ: Math.max(cable.z0, cable.z1),
      minY: 0,
      maxY: 1.2,
    };
    if (boxesOverlap(box, cableBox, 0.03)) issues.push(`${chair.id} sits on the cable route`);
    if (site.cableLateral) {
      const lat = site.cableLateral;
      const latBox = {
        minX: Math.min(lat.x0, lat.x1),
        maxX: Math.max(lat.x0, lat.x1),
        minZ: lat.z - lat.halfWidth,
        maxZ: lat.z + lat.halfWidth,
        minY: 0,
        maxY: 1.2,
      };
      if (boxesOverlap(box, latBox, 0.03)) issues.push(`${chair.id} sits on the lateral cable`);
    }
  }

  for (let i = 0; i < prints.length; i++) {
    for (let j = i + 1; j < prints.length; j++) {
      if (boxesOverlap(prints[i].box, prints[j].box, 0.04)) {
        issues.push(`${prints[i].chair.id} overlaps ${prints[j].chair.id}`);
      }
    }
  }

  const booth = boxFromAabb(site.booth);
  const cart = boxFromAabb(site.cart);
  for (const { chair, box } of prints) {
    if (boxesOverlap(box, booth, 0.02)) issues.push(`${chair.id} intersects the booth`);
    if (boxesOverlap(box, cart, 0.02)) issues.push(`${chair.id} intersects the drinks cart`);
  }
  if (boxesOverlap(cart, rectToBox(site.aisles.left, 0, 2), 0.02)) {
    issues.push('drinks cart blocks the left through-aisle');
  }
  if (boxesOverlap(cart, rectToBox(site.aisles.center, 0, 2), 0.02)) {
    issues.push('drinks cart blocks the center aisle');
  }
  const cableBox = {
    minX: site.cable.x - site.cable.halfWidth,
    maxX: site.cable.x + site.cable.halfWidth,
    minZ: Math.min(site.cable.z0, site.cable.z1),
    maxZ: Math.max(site.cable.z0, site.cable.z1),
    minY: 0,
    maxY: 0.4,
  };
  if (boxesOverlap(cart, cableBox, 0.02)) issues.push('drinks cart sits on the cable route');

  const rays = [];
  const cameras = [
    ['default', layout.camera.position, screenCenter],
    ['corner', layout.cameraPresets.corner.position, screenCenter],
  ];
  const blockers = [
    ['booth', booth],
    ['cart', cart],
    ...prints.map(({ chair, box }) => [chair.id, box]),
  ];
  for (const [name, origin, end] of cameras) {
    const hits = [];
    for (const [label, box] of blockers) {
      const t = segmentHitsAabb(origin, end, {
        min: [box.minX, box.minY, box.minZ],
        max: [box.maxX, box.maxY, box.maxZ],
      });
      if (t != null && t > 0.01 && t < 0.97) hits.push({ label, t: round(t, 3) });
    }
    hits.sort((a, b) => a.t - b.t);
    if (hits.length) issues.push(`${name} camera ray hits ${hits[0].label} before the screen`);
    rays.push({ name, clear: hits.length === 0, hits: hits.slice(0, 4) });
  }

  const facing = feet.filter((f) => f.faces).length;
  return {
    ok: issues.length === 0,
    chairCount: chairs.length,
    facing,
    minDot: feet.reduce((m, f) => Math.min(m, f.dot), 1),
    issues,
    feet,
    rays,
    chairs,
  };
}
