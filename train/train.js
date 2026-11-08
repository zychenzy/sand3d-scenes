import * as THREE from 'three';
import { boot, toon, addBox, addCyl } from './scene_lib.js';

function makeShell(layout) {
  const g = new THREE.Group();
  g.name = 'shell';
  const { width: W, depth: D, height: H } = layout.meta.room;
  const s = layout.shell;
  const floorMat = toon(s.floorColor);
  const wallMat = toon(s.wallColor);
  const roofMat = toon(s.roofColor);
  const bodyMat = toon(s.bodyColor);
  const bodyD = toon(s.bodyDark);
  const wood = toon(s.woodColor);
  const woodL = toon(s.woodLight);
  const glass = toon(s.windowTint, { transparent: true, opacity: 0.42, side: THREE.DoubleSide });
  const frame = toon(s.frameColor);
  const under = toon(s.underColor);
  const wheel = toon('#1a1e24');

  // floor
  const floor = new THREE.Mesh(new THREE.BoxGeometry(W, 0.08, D), floorMat);
  floor.position.y = -0.04;
  floor.receiveShadow = true;
  g.add(floor);
  // aisle strip
  addBox(g, 0.62, 0.01, D - 0.4, toon(s.aisleColor), 0, 0.005, 0);

  // far long wall (window wall) at -X
  const far = new THREE.Mesh(new THREE.BoxGeometry(0.1, H, D), wallMat);
  far.position.set(-W / 2, H / 2, 0);
  far.receiveShadow = true;
  g.add(far);
  // exterior body skin
  addBox(g, 0.08, H + 0.15, D + 0.12, bodyMat, -W / 2 - 0.08, H / 2 - 0.02, 0);

  // far end wall at -Z (keep); drop +Z near/front end wall for perspective
  const end = new THREE.Mesh(new THREE.BoxGeometry(W, H, 0.1), wallMat);
  end.position.set(0, H / 2, -D / 2);
  end.receiveShadow = true;
  g.add(end);
  addBox(g, W + 0.16, H + 0.15, 0.08, bodyD, 0, H / 2 - 0.02, -D / 2 - 0.08);

  // long-side window band along far wall
  const winH = 0.95, winY = 1.42;
  addBox(g, 0.04, winH, D - 1.4, glass, -W / 2 + 0.06, winY, 0.15);
  // window posts
  for (let z = -D / 2 + 1.1; z < D / 2 - 0.6; z += 1.3) {
    addBox(g, 0.06, winH + 0.08, 0.07, frame, -W / 2 + 0.07, winY, z);
  }
  // sill
  addBox(g, 0.22, 0.06, D - 1.2, woodL, -W / 2 + 0.2, winY - winH / 2 - 0.04, 0.1);

  // partial roof / ceiling (cutaway on +X)
  addBox(g, W * 0.82, 0.08, D, roofMat, -W * 0.08, H + 0.02, 0);
  addBox(g, W * 0.86, 0.1, D + 0.16, bodyD, -W * 0.06, H + 0.12, 0);

  // luggage racks along far wall
  addBox(g, 0.42, 0.04, D - 1.6, frame, -W / 2 + 0.38, 1.92, 0);
  addBox(g, 0.04, 0.22, D - 1.6, frame, -W / 2 + 0.18, 1.82, 0);

  // underframe + bogies so it reads as a coach, not a room
  addBox(g, W + 0.2, 0.16, D, under, 0, -0.18, 0);
  for (const z of [-5.4, -2.0, 2.0, 5.4]) {
    addBox(g, W + 0.28, 0.12, 1.6, under, 0, -0.28, z);
    for (const x of [-0.85, 0.85]) {
      addCyl(g, 0.32, 0.32, 0.14, wheel, x, -0.52, z - 0.45, 18);
      addCyl(g, 0.32, 0.32, 0.14, wheel, x, -0.52, z + 0.45, 18);
    }
  }
  return g;
}

function makeProcedural(layout) {
  const g = new THREE.Group();
  g.name = 'procedural';
  const s = layout.shell;
  const yellow = toon(s.partitionColor);
  const metal = toon('#6a7278');
  const { depth: D } = layout.meta.room;
  const bays = layout.meta.bays;
  const pitch = layout.meta.bayPitch;
  const z0 = layout.meta.bay0;
  const seatW = layout.meta.seatWidth; // X extent of a seat/partition (must match)
  const partH = layout.meta.partitionHeight;

  // yellow floor-reaching partitions, as wide as the seat backs
  for (let i = 0; i <= bays; i++) {
    const z = z0 + i * pitch - pitch / 2;
    if (z < -D / 2 + 0.4 || z > D / 2 - 0.2) continue;
    // window side
    addBox(g, seatW, partH, 0.07, yellow, -0.72, partH / 2, z);
    // aisle / cutaway side
    addBox(g, seatW, partH, 0.07, yellow, 0.72, partH / 2, z);
  }

  // Railway dining tables: one long central pedestal (not four free legs).
  const tableWood = toon('#7a5741');
  const tablePed = toon('#5c4030');
  function addCoachTable(x, z) {
    const topW = 1.04; // across the seat pair (X)
    const topD = 0.86; // between facing seats (Z)
    const topY = 0.725;
    addBox(g, topW, 0.05, topD, tableWood, x, topY, z);
    // one long central pedestal running the table length (Z), not four legs
    addBox(g, 0.16, 0.64, 0.62, tablePed, x, 0.34, z);
    addBox(g, 0.26, 0.05, 0.70, tablePed, x, 0.025, z); // foot
    addBox(g, 0.22, 0.04, 0.66, tablePed, x, 0.675, z); // capital
  }
  for (let i = 0; i < bays; i++) {
    const z = z0 + i * pitch;
    addCoachTable(-0.72, z);
    addCoachTable(0.72, z);
  }

  // overhead aisle lights
  for (let i = 0; i < bays; i++) {
    const z = z0 + i * pitch;
    addCyl(g, 0.07, 0.07, 0.04, toon('#f4e6c4'), 0, 2.18, z, 12);
    addBox(g, 0.7, 0.03, 0.08, metal, 0, 2.22, z);
  }
  return g;
}

boot({
  makeShell,
  makeProcedural,
  readyText: 'ready — train dining coach · drag orbit · U unlit · T toon',
});
