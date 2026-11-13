// Swing, seat, and path rules for the two-bay simulator.
// Pure data checks. The viewer and the node test both use this module.

export function hypot2(x, z, ox, oz) {
  return Math.hypot(x - ox, z - oz);
}

export function bayById(layout, id) {
  return layout.meta.bays.find((bay) => bay.id === id);
}

export function swingArc(bay) {
  const [px, pz] = bay.player;
  const [bx, bz] = bay.ball;
  const trail = Math.sign(px - bx) || 1;
  return [
    [bx, 0.1, bz],
    [bx + trail * 0.32, 0.48, bz + 0.22],
    [bx + trail * 0.62, 1.28, bz + 0.42],
    [px + trail * 0.42, 2.48, pz + 0.32],
    [bx + trail * 0.22, 1.42, bz + 0.08],
    [bx, 0.11, bz],
    [bx - trail * 0.42, 0.62, bz - 0.12],
    [bx - trail * 0.82, 1.52, bz - 0.02],
  ];
}

export function shotArc(bay, screenZ) {
  const [bx, bz] = bay.ball;
  const pts = [];
  for (let i = 0; i <= 8; i++) {
    const t = i / 8;
    pts.push([
      bx + Math.sin(t * 0.65) * 0.1,
      0.1 + Math.sin(t * Math.PI) * 1.22,
      bz + (screenZ + 0.3 - bz) * t,
    ]);
  }
  return pts;
}

function insideBay(bay, x, z) {
  return x > bay.inner[0] + 0.02 && x < bay.inner[1] - 0.02;
}

export function collectIssues(layout, chairHalf) {
  const issues = [];
  const { radius, apex, groundHalf, monitorTop } = layout.meta.swing;
  const { screenZ, netSoffit, safetyZ, dividerX } = layout.meta;
  const bays = layout.meta.bays;
  if (bays.length !== 2) issues.push(`expected 2 bays, found ${bays.length}`);

  for (const bay of bays) {
    const [px, pz] = bay.player;
    const [bx, bz] = bay.ball;
    const reachLo = px - radius;
    const reachHi = px + radius;
    if (reachLo < bay.inner[0] || reachHi > bay.inner[1]) {
      issues.push(`${bay.id} swing cylinder crosses the bay net (${reachLo.toFixed(2)}..${reachHi.toFixed(2)} vs ${bay.inner})`);
    }
    if (reachLo < dividerX && reachHi > dividerX) {
      issues.push(`${bay.id} swing cylinder crosses the divider`);
    }
    const other = bays.find((item) => item.id !== bay.id);
    if (hypot2(px, pz, other.player[0], other.player[1]) < radius * 2 + 0.4) {
      issues.push(`${bay.id} swing overlaps the other bay`);
    }
    if (bz <= screenZ + 2.4) issues.push(`${bay.id} ball is too close to the screen`);
    if (bz - screenZ > 4.4) issues.push(`${bay.id} ball is too far from the screen`);
    if (bz >= pz) issues.push(`${bay.id} ball is not screen-ward of the player`);
    if (pz + radius > safetyZ - 0.25) {
      issues.push(`${bay.id} swing reaches the gallery line`);
    }
    if (apex >= netSoffit - 0.12) issues.push(`${bay.id} swing apex meets the ceiling net`);

    for (const [x, y, z] of swingArc(bay)) {
      if (!insideBay(bay, x, z)) issues.push(`${bay.id} club path leaves the bay at ${x.toFixed(2)},${z.toFixed(2)}`);
      if (y < 0.04 || y > netSoffit - 0.08) issues.push(`${bay.id} club path height ${y.toFixed(2)} is outside the cage`);
      if (hypot2(x, z, px, pz) > radius + 0.02) {
        issues.push(`${bay.id} club path escapes the swing cylinder`);
      }
      if ((bay.player[0] < dividerX && x > dividerX - 0.05) || (bay.player[0] > dividerX && x < dividerX + 0.05)) {
        issues.push(`${bay.id} club path crosses the divider`);
      }
    }

    for (const [x, y, z] of shotArc(bay, screenZ)) {
      if (!insideBay(bay, x, z)) issues.push(`${bay.id} ball flight leaves the bay`);
      if (z <= screenZ + 0.12 || z > bz + 0.05) issues.push(`${bay.id} ball flight is outside the screen-to-tee span`);
      if (y < 0.05 || y > 2.4) issues.push(`${bay.id} ball flight height ${y.toFixed(2)}`);
      if (hypot2(x, z, other.player[0], other.player[1]) < radius) {
        issues.push(`${bay.id} ball flight enters the other swing`);
      }
    }
  }

  const monitors = layout.meta.monitors || [];
  if (monitors.length !== bays.length) issues.push('each bay needs one launch monitor');
  for (const monitor of monitors) {
    const bay = bayById(layout, monitor.bay);
    if (!bay) {
      issues.push(`monitor ${monitor.id} has no bay`);
      continue;
    }
    const [bx, bz] = bay.ball;
    if (Math.abs(monitor.x - bx) < groundHalf + 0.28) {
      issues.push(`${monitor.id} sits in the clubhead corridor`);
    }
    if (monitor.top > monitorTop) issues.push(`${monitor.id} is tall enough to catch a club`);
    if (monitor.z >= bz - 0.05) issues.push(`${monitor.id} is not on the screen side of the ball`);
    if (!insideBay(bay, monitor.x, monitor.z)) issues.push(`${monitor.id} is outside its bay`);
    for (const [x, , z] of swingArc(bay)) {
      if (hypot2(x, z, monitor.x, monitor.z) < 0.34) {
        issues.push(`${monitor.id} intersects the club path`);
      }
    }
  }

  const hx = chairHalf.hx;
  const hz = chairHalf.hz;
  const chairs = (layout.instances || []).filter((item) => item.kind === 'theatre_chair');
  if (chairs.length < 6) issues.push(`expected a chair row in each bay, found ${chairs.length}`);
  for (const bay of bays) {
    const mine = chairs.filter((item) => item.bay === bay.id);
    if (mine.length < 3) issues.push(`${bay.id} needs three seats facing the screen`);
  }
  for (const chair of chairs) {
    const yaw = chair.rotationY || 0;
    if (Math.abs(yaw) > 0.2) issues.push(`${chair.id} rotationY ${yaw} does not face the screen`);
    if (chair.position[2] - hz < safetyZ + 0.35) {
      issues.push(`${chair.id} front lip crosses the safety line`);
    }
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        const x = chair.position[0] + sx * hx;
        const z = chair.position[2] + sz * hz;
        for (const bay of bays) {
          if (hypot2(x, z, bay.player[0], bay.player[1]) < radius + 0.2) {
            issues.push(`${chair.id} footprint enters ${bay.id} swing`);
          }
        }
      }
    }
  }

  const clubs = (layout.instances || []).filter((item) => String(item.kind).startsWith('golf_') && item.kind !== 'golf_tee');
  for (const bay of bays) {
    const mine = clubs.filter((item) => item.bay === bay.id);
    const kinds = new Set(mine.map((item) => item.kind));
    if (mine.length < 3) issues.push(`${bay.id} rack is short`);
    if (!kinds.has('golf_driver') || !kinds.has('golf_iron')) {
      issues.push(`${bay.id} rack needs a driver and an iron`);
    }
  }
  for (const club of clubs) {
    for (const bay of bays) {
      if (hypot2(club.position[0], club.position[2], bay.player[0], bay.player[1]) < radius + 0.25) {
        issues.push(`${club.id} stands inside ${bay.id} swing`);
      }
    }
  }

  for (const item of layout.instances || []) {
    if (item.kind === 'pendant_lamp') continue;
    if (item.kind === 'golf_tee') {
      const home = bayById(layout, item.bay);
      if (home && hypot2(item.position[0], item.position[2], home.ball[0], home.ball[1]) < 0.2) continue;
    }
    for (const bay of bays) {
      if (hypot2(item.position[0], item.position[2], bay.player[0], bay.player[1]) < radius + 0.2) {
        issues.push(`${item.id} is inside ${bay.id} swing`);
      }
    }
  }

  for (const path of layout.meta.paths || []) {
    for (const [x, z] of path.pts) {
      for (const bay of bays) {
        if (hypot2(x, z, bay.player[0], bay.player[1]) < radius + 0.3) {
          issues.push(`path ${path.id} crosses ${bay.id} swing`);
        }
      }
      if (z < safetyZ) issues.push(`path ${path.id} steps over the safety line`);
    }
  }

  return issues;
}
