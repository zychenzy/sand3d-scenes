import * as THREE from 'three';
import { boot, toon, addBox, addCyl } from './scene_lib.js';

function byId(layout, id) {
  return (layout.instances || []).find((i) => i.id === id);
}

function palette() {
  const gel = (hex, intensity = 0.55) => toon(hex, { emissive: hex, emissiveIntensity: intensity });
  return {
    wall: toon('#16141a'),
    wallDeep: toon('#0e0c12'),
    batten: toon('#221e26'),
    floor: toon('#141216'),
    floorLine: toon('#0c0a0e'),
    riser: toon('#1e1a20'),
    riserFace: toon('#2a2428'),
    runner: toon('#5a3040'),
    runnerEdge: toon('#3a2028'),
    base: toon('#0a090c'),
    ceiling: toon('#100e12'),
    deckStructure: toon('#3a2a22'),
    fascia: toon('#1a1210'),
    woods: ['#6b4632', '#5a3a28', '#74503a', '#4e3424', '#62402e'].map((c) => toon(c)),
    nosing: toon('#8a6244'),
    tape: gel('#ffbf70', 0.5),
    plaster: toon('#d9cbb4'),
    plaster2: toon('#cbbba2'),
    trim: toon('#5c4030'),
    door: toon('#6e4630'),
    doorBack: toon('#4a301f'),
    knob: toon('#c4a46a'),
    frame: toon('#3a3028'),
    glass: gel('#b7dcea', 0.62),
    mullion: toon('#2a2420'),
    shade: toon('#d5c6ae'),
    rug: toon('#7a3848'),
    rugEdge: toon('#4e2432'),
    picture: toon('#2c3a44'),
    pictureMat: toon('#e6dcc8'),
    velvetA: toon('#6a2434'),
    velvetB: toon('#42141f'),
    velvetC: toon('#8a3344'),
    mask: toon('#0c0a0e'),
    mask2: toon('#161318'),
    metal: toon('#6a6e76'),
    metalDark: toon('#3e424a'),
    gel,
    bulb: gel('#fff1c4', 0.85),
    bulbWarm: gel('#ffb060', 0.7),
    paper: toon('#f4efe4'),
    paper2: toon('#e7d7c0'),
    note: toon('#d46a6a'),
    pinboard: toon('#6d5a42'),
    navy: toon('#1c2744'),
    rust: toon('#7a3a2a'),
    cream: toon('#d9cbb0'),
    forest: toon('#24382c'),
    crate: toon('#8a6844'),
    crateDark: toon('#5a4030'),
    crateInner: toon('#2a1c14'),
    step: toon('#4a3428'),
    stepFace: toon('#2e221c'),
    rail: toon('#3a3438'),
    rubber: toon('#3a343c'),
    contact: toon('#050406', {
      transparent: true,
      opacity: 0.22,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
    }),
    bookA: toon('#6b3038'),
    bookB: toon('#2a3a32'),
    bookC: toon('#3a3a5a'),
    jarA: toon('#6a3038'),
    jarB: toon('#c4b49a'),
    jarC: toon('#2f4a44'),
    brass: toon('#b08a4a'),
  };
}

function contact(g, mat, x, y, z, sx, sz) {
  const m = new THREE.Mesh(new THREE.CircleGeometry(1, 16), mat);
  m.rotation.x = -Math.PI / 2;
  m.position.set(x, y + 0.012, z);
  m.scale.set(sx, sz, 1);
  m.userData.noShadow = true;
  g.add(m);
}

function pipeX(g, mat, x0, x1, y, z, r = 0.03) {
  const len = Math.abs(x1 - x0);
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, 8), mat);
  m.rotation.z = Math.PI / 2;
  m.position.set((x0 + x1) / 2, y, z);
  m.castShadow = true;
  g.add(m);
}

function pipeZ(g, mat, x, y, z0, z1, r = 0.03) {
  const len = Math.abs(z1 - z0);
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, 8), mat);
  m.rotation.x = Math.PI / 2;
  m.position.set(x, y, (z0 + z1) / 2);
  m.castShadow = true;
  g.add(m);
}

function addFixture(g, P, spec) {
  const { x, y, z, aim, gel, kind = 'par', intensity = 10 } = spec;
  const root = new THREE.Group();
  root.position.set(x, y, z);
  g.add(root);
  addBox(root, 0.1, 0.045, 0.08, P.metalDark, 0, -0.02, 0);

  const barrel = new THREE.Group();
  root.add(barrel);
  const dir = new THREE.Vector3(aim[0] - x, aim[1] - y, aim[2] - z).normalize();
  barrel.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, -1), dir);

  const len = kind === 'ers' ? 0.32 : 0.15;
  const rad = kind === 'ers' ? 0.05 : 0.078;
  const body = new THREE.Mesh(new THREE.CylinderGeometry(rad * 0.92, rad, len, 10), P.metal);
  body.rotation.x = Math.PI / 2;
  body.position.z = -0.05 - len / 2;
  body.castShadow = true;
  barrel.add(body);
  let lensZ = -0.05 - len;
  if (kind === 'ers') {
    const nose = new THREE.Mesh(new THREE.CylinderGeometry(rad * 0.62, rad * 0.9, 0.1, 10), P.metalDark);
    nose.rotation.x = Math.PI / 2;
    nose.position.z = lensZ - 0.04;
    barrel.add(nose);
    lensZ -= 0.09;
  }
  const lens = new THREE.Mesh(new THREE.CircleGeometry(rad * 0.72, 10), P.gel(gel, 0.7));
  lens.position.z = lensZ - 0.005;
  lens.rotation.y = Math.PI;
  lens.userData.noShadow = true;
  barrel.add(lens);
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(rad * 0.62, rad * 0.62, 0.035, 8), P.metalDark);
  cap.rotation.x = Math.PI / 2;
  cap.position.z = -0.02;
  barrel.add(cap);
  for (const s of [-1, 1]) {
    addBox(barrel, rad * 1.35, 0.01, 0.04, P.metalDark, 0, s * (rad + 0.012), lens.position.z);
    addBox(barrel, 0.01, rad * 1.15, 0.038, P.metalDark, s * (rad + 0.012), 0, lens.position.z);
  }

  const spot = new THREE.SpotLight(gel, intensity, 9.5, kind === 'ers' ? 0.36 : 0.52, 0.62, 2);
  spot.position.set(0, 0, lens.position.z);
  barrel.add(spot);
  const tgt = new THREE.Object3D();
  tgt.position.set(aim[0], aim[1], aim[2]);
  g.add(tgt);
  spot.target = tgt;
}

function pleats(g, mats, x0, x1, y0, y1, z, depth = 0.055) {
  const width = x1 - x0;
  const count = Math.max(5, Math.round(width / 0.1));
  const pw = width / count;
  const h = y1 - y0;
  for (let i = 0; i < count; i++) {
    const edge = i < 2 || i > count - 3;
    const mat = mats[i % mats.length];
    const zOff = (i % 2) * (edge ? 0.07 : 0.04);
    addBox(g, pw * 0.94, h, depth, mat, x0 + pw * (i + 0.5), (y0 + y1) / 2, z + zOff);
  }
}

function makeShell(layout) {
  const g = new THREE.Group();
  g.name = 'shell';
  const P = palette();
  const { width: W, depth: D, height: H } = layout.meta.room;
  const house = layout.meta.house;
  const niche = layout.meta.niche;

  const floor = new THREE.Mesh(new THREE.BoxGeometry(W, 0.08, D), P.floor);
  floor.position.y = -0.04;
  floor.receiveShadow = true;
  g.add(floor);

  for (let z = -D / 2 + 0.4; z < D / 2 - 0.3; z += 0.55) {
    addBox(g, W - 0.5, 0.004, 0.018, P.floorLine, -0.2, 0.002, z);
  }

  const back = new THREE.Mesh(new THREE.BoxGeometry(W, H, 0.14), P.wall);
  back.position.set(0, H / 2, -D / 2);
  back.receiveShadow = true;
  g.add(back);
  const left = new THREE.Mesh(new THREE.BoxGeometry(0.14, H, D), P.wall);
  left.position.set(-W / 2, H / 2, 0);
  left.receiveShadow = true;
  g.add(left);

  addBox(g, W - 0.2, 0.08, 0.06, P.base, 0, 0.04, -D / 2 + 0.08);
  addBox(g, 0.06, 0.08, D - 0.2, P.base, -W / 2 + 0.08, 0.04, 0);

  for (let x = -W / 2 + 0.7; x < W / 2 - 0.4; x += 1.15) {
    addBox(g, 0.035, H - 0.3, 0.025, P.batten, x, H / 2, -D / 2 + 0.09);
  }
  for (let z = -D / 2 + 0.8; z < D / 2 - 0.4; z += 1.2) {
    addBox(g, 0.025, H - 0.3, 0.035, P.batten, -W / 2 + 0.09, H / 2, z);
  }
  addBox(g, W - 0.4, 0.05, 0.04, P.metal, 0, 3.25, -D / 2 + 0.1);
  addBox(g, 0.04, 0.05, D - 0.5, P.metal, -W / 2 + 0.1, 3.25, -0.2);

  const ceil = new THREE.Mesh(new THREE.BoxGeometry(W * 0.86, 0.08, D * 0.72), P.ceiling);
  ceil.position.set(-0.35, H - 0.06, -D * 0.16);
  g.add(ceil);

  // ranked house — each row sits fully on its platform
  const riserX0 = house.xsLeft[0] - 0.55;
  const riserX1 = house.xsRight[house.xsRight.length - 1] + 0.55;
  const riserW = riserX1 - riserX0;
  const riserCx = (riserX0 + riserX1) / 2;
  const row1 = house.rows[1];
  const row2 = house.rows[2];
  addBox(g, riserW, row1.y, 1.15, P.riser, riserCx, row1.y / 2, row1.z);
  addBox(g, riserW, 0.04, 0.06, P.riserFace, riserCx, row1.y - 0.02, row1.z - 0.56);
  addBox(g, riserW, row2.y, 1.35, P.riser, riserCx, row2.y / 2, row2.z);
  addBox(g, riserW, 0.04, 0.06, P.riserFace, riserCx, row2.y - 0.02, row2.z - 0.66);

  const aisle = house.aisleX;
  for (const row of house.rows) {
    const y = row.y + 0.012;
    addBox(g, 0.62, 0.012, 1.05, P.runner, aisle, y, row.z);
    addBox(g, 0.08, 0.014, 1.05, P.runnerEdge, aisle - 0.28, y, row.z);
    addBox(g, 0.08, 0.014, 1.05, P.runnerEdge, aisle + 0.28, y, row.z);
  }
  // aisle lights on the riser noses
  for (const row of [row1, row2]) {
    for (const s of [-1, 1]) {
      addBox(g, 0.16, 0.035, 0.03, P.bulbWarm, aisle + s * 0.36, row.y + 0.01, row.z - 0.58);
    }
  }

  // rear rail with an aisle opening
  rail(g, P, riserX0, aisle - 0.42, row2.z + 0.85, 0.62);
  rail(g, P, aisle + 0.42, riserX1, row2.z + 0.85, 0.62);

  // prop niche reads as a bay: low wall you can see over, plus a soffit
  const nw = niche.x1 - niche.x0;
  const nd = niche.z1 - niche.z0;
  addBox(g, nw, 0.025, nd, P.rubber, (niche.x0 + niche.x1) / 2, 0.02, (niche.z0 + niche.z1) / 2);
  const halfW = niche.halfWallX - niche.x0;
  addBox(g, halfW, niche.halfWallH, 0.08, P.wallDeep, niche.x0 + halfW / 2, niche.halfWallH / 2, niche.z1);
  addBox(g, 0.1, niche.headerY, 0.1, P.wallDeep, niche.x1 - 0.06, niche.headerY / 2, niche.z1);
  addBox(g, nw, 0.12, 0.12, P.batten, (niche.x0 + niche.x1) / 2, niche.headerY, niche.z1);
  // pinboard on the left wall, inside the bay
  addBox(g, 0.03, 0.85, 1.15, P.pinboard, -W / 2 + 0.12, 1.55, -4.15);
  addBox(g, 0.02, 0.22, 0.18, P.paper, -W / 2 + 0.14, 1.75, -4.45);
  addBox(g, 0.02, 0.16, 0.22, P.note, -W / 2 + 0.14, 1.42, -4.2);
  addBox(g, 0.02, 0.2, 0.16, P.paper2, -W / 2 + 0.14, 1.68, -3.85);

  // small exit practical on the left wall, downstage of the bay
  addBox(g, 0.04, 0.14, 0.36, P.gel('#2f8a4a', 0.45), -W / 2 + 0.12, 2.15, 2.4);

  return g;
}

function rail(g, P, x0, x1, z, h) {
  const span = x1 - x0;
  const n = Math.max(2, Math.round(span / 1.15));
  for (let i = 0; i <= n; i++) {
    const x = x0 + (span * i) / n;
    addCyl(g, 0.025, 0.028, h, P.rail, x, h / 2, z, 8);
  }
  addBox(g, span, 0.04, 0.04, P.rail, (x0 + x1) / 2, h, z);
}

function makeProcedural(layout) {
  const g = new THREE.Group();
  g.name = 'procedural';
  const P = palette();
  const stage = layout.meta.stage;
  const niche = layout.meta.niche;
  const top = stage.top;
  const sw = stage.x1 - stage.x0;
  const sd = stage.z1 - stage.z0;
  const scx = (stage.x0 + stage.x1) / 2;
  const scz = (stage.z0 + stage.z1) / 2;

  // deck structure sits just under the plank surface
  addBox(g, sw, top - 0.03, sd, P.deckStructure, scx, (top - 0.03) / 2, scz);
  addBox(g, sw, top - 0.02, 0.08, P.fascia, scx, (top - 0.02) / 2, stage.z1 + 0.02);
  const z0 = stage.z0 + 0.06;
  const z1 = stage.z1 - 0.05;
  const boards = 16;
  for (let i = 0; i < boards; i++) {
    const z = z0 + ((i + 0.5) * (z1 - z0)) / boards;
    const mat = P.woods[i % P.woods.length];
    const seam = i % 5 === 2;
    if (seam) {
      addBox(g, sw * 0.46, 0.03, 0.1, mat, stage.x0 + sw * 0.25, top - 0.01, z);
      addBox(g, sw * 0.42, 0.03, 0.1, P.woods[(i + 2) % P.woods.length], stage.x1 - sw * 0.24, top - 0.01, z);
    } else {
      addBox(g, sw - 0.12, 0.03, 0.105, mat, scx, top - 0.01, z);
    }
  }
  addBox(g, sw - 0.04, 0.025, 0.06, P.nosing, scx, top + 0.005, stage.z1 - 0.04);
  addBox(g, sw - 0.2, 0.008, 0.025, P.tape, scx, top + 0.02, stage.z1 - 0.03);

  // stage-right wing and the step unit down to the house
  const wing = { x0: stage.x1, x1: stage.x1 + 1.2, z0: -2.4, z1: stage.z1 };
  addBox(g, wing.x1 - wing.x0, top - 0.03, wing.z1 - wing.z0, P.deckStructure, (wing.x0 + wing.x1) / 2, (top - 0.03) / 2, (wing.z0 + wing.z1) / 2);
  addBox(g, wing.x1 - wing.x0 - 0.06, 0.03, wing.z1 - wing.z0 - 0.06, P.woods[1], (wing.x0 + wing.x1) / 2, top - 0.01, (wing.z0 + wing.z1) / 2);
  addSteps(g, P, wing.x0 + 0.55, wing.x1 - 0.05, stage.z1, top);

  // black backdrop, then the plaster room set in front of it
  addBox(g, sw + 0.2, 3.35, 0.06, P.mask, scx, top + 1.55, stage.z0 + 0.08);
  buildSet(g, P, stage, layout);

  // traveler, teaser, legs
  const curtainBase = top;
  // Left traveler stops short of the prop bay so the wing stays in the cutaway.
  pleats(g, [P.velvetA, P.velvetB, P.velvetC], -1.48, -0.42, curtainBase, 3.45, -1.5);
  pleats(g, [P.velvetA, P.velvetC, P.velvetB], 1.12, 2.9, curtainBase, 3.45, -1.5);
  addBox(g, 0.16, 3.0, 0.2, P.velvetB, -1.4, curtainBase + 1.5, -1.42);
  addBox(g, 0.16, 3.0, 0.2, P.velvetB, 2.78, curtainBase + 1.5, -1.42);
  scallop(g, P, -1.55, 2.95, 3.22, -1.42);
  pleats(g, [P.mask, P.mask2], -1.62, -1.12, curtainBase, 3.25, -2.02, 0.07);
  pleats(g, [P.mask, P.mask2], 2.2, 2.75, curtainBase, 3.25, -2.02, 0.07);

  buildRig(g, P, layout);
  buildNicheDressing(g, P, layout, niche);
  buildContacts(g, P, layout, top);

  // ghost light on the stage-right wing
  addCyl(g, 0.08, 0.1, 0.04, P.metalDark, 3.35, top + 0.02, -2.05, 10);
  addCyl(g, 0.015, 0.015, 0.85, P.metal, 3.35, top + 0.46, -2.05, 8);
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.055, 10, 8), P.bulb);
  bulb.position.set(3.35, top + 0.95, -2.05);
  bulb.userData.noShadow = true;
  g.add(bulb);

  return g;
}

function addSteps(g, P, x0, x1, zFront, top) {
  const w = x1 - x0;
  const cx = (x0 + x1) / 2;
  const treads = [
    { h: top, d: 0.24 },
    { h: top * 0.66, d: 0.24 },
    { h: top * 0.33, d: 0.24 },
  ];
  let z = zFront;
  for (const t of treads) {
    z += t.d / 2;
    addBox(g, w, t.h, t.d, P.step, cx, t.h / 2, z);
    addBox(g, w, 0.025, 0.04, P.nosing, cx, t.h, z + t.d / 2 - 0.02);
    z += t.d / 2;
  }
  addCyl(g, 0.02, 0.02, top + 0.55, P.rail, x1 - 0.06, (top + 0.55) / 2, zFront + 0.08, 6);
  addCyl(g, 0.02, 0.02, 0.7, P.rail, x1 - 0.06, 0.85, z - 0.08, 6);
  addBox(g, 0.04, 0.03, z - zFront, P.rail, x1 - 0.06, 0.95, (zFront + z) / 2);
}

function scallop(g, P, x0, x1, yTop, z) {
  const count = Math.round((x1 - x0) / 0.14);
  const pw = (x1 - x0) / count;
  for (let i = 0; i < count; i++) {
    const h = 0.26 + (i % 3) * 0.07;
    const mat = i % 2 ? P.velvetB : P.velvetA;
    addBox(g, pw * 0.92, h, 0.07, mat, x0 + pw * (i + 0.5), yTop + h / 2, z);
  }
}

function buildSet(g, P, stage, layout) {
  const top = stage.top;
  const flatZ = -4.78;
  const flatH = 2.5;
  const base = top;
  const midY = base + flatH / 2;
  // plaster wall broken by a door (stage left of the table) and a window (stage right)
  const spans = [
    [-1.95, -1.22],
    [-0.4, 0.92],
    [1.88, 2.5],
  ];
  for (const [a, b] of spans) {
    addBox(g, b - a, flatH, 0.08, P.plaster, (a + b) / 2, midY, flatZ);
  }
  // header over the door, sill and header around the window
  addBox(g, 0.82, flatH - 2.02, 0.08, P.plaster, -0.81, base + 2.02 + (flatH - 2.02) / 2, flatZ);
  addBox(g, 0.96, 0.86, 0.08, P.plaster, 1.4, base + 0.43, flatZ);
  addBox(g, 0.96, flatH - 2.18, 0.08, P.plaster2, 1.4, base + 2.18 + (flatH - 2.18) / 2, flatZ);
  addBox(g, 4.45, 0.1, 0.09, P.trim, 0.28, base + 0.05, flatZ);
  // short returns so the flats read as a room corner, not a single billboard
  addBox(g, 0.08, flatH, 0.7, P.plaster, -1.95, midY, flatZ + 0.35);
  addBox(g, 0.08, flatH, 1.15, P.plaster2, 2.5, midY, flatZ + 0.55);

  // door, hinged on the left jamb, open toward the house
  const door = new THREE.Group();
  door.position.set(-1.22, base, flatZ + 0.06);
  door.rotation.y = 0.55;
  const slab = new THREE.Mesh(new THREE.BoxGeometry(0.8, 2.0, 0.045), P.door);
  slab.position.set(0.4, 1.0, 0);
  slab.castShadow = true;
  door.add(slab);
  addBox(door, 0.72, 0.9, 0.02, P.doorBack, 0.4, 1.15, 0.03);
  addCyl(door, 0.025, 0.025, 0.03, P.knob, 0.68, 1.0, 0.04, 8);
  g.add(door);
  addBox(g, 0.06, 2.08, 0.1, P.trim, -1.22, base + 1.04, flatZ + 0.02);
  addBox(g, 0.06, 2.08, 0.1, P.trim, -0.4, base + 1.04, flatZ + 0.02);
  addBox(g, 0.88, 0.08, 0.1, P.trim, -0.81, base + 2.04, flatZ + 0.02);

  // window practical
  addBox(g, 0.78, 0.7, 0.03, P.glass, 1.4, base + 1.52, flatZ + 0.05);
  addBox(g, 0.025, 0.7, 0.04, P.mullion, 1.4, base + 1.52, flatZ + 0.06);
  addBox(g, 0.78, 0.025, 0.04, P.mullion, 1.4, base + 1.52, flatZ + 0.06);
  addBox(g, 0.9, 0.06, 0.1, P.frame, 1.4, base + 1.12, flatZ + 0.04);
  addBox(g, 0.9, 0.06, 0.1, P.frame, 1.4, base + 1.9, flatZ + 0.04);
  addBox(g, 0.06, 0.84, 0.1, P.frame, 0.98, base + 1.51, flatZ + 0.04);
  addBox(g, 0.06, 0.84, 0.1, P.frame, 1.82, base + 1.51, flatZ + 0.04);
  addCyl(g, 0.04, 0.04, 0.78, P.shade, 1.4, base + 1.98, flatZ + 0.1, 10);
  // sill the flowerpot sits on — keep level with sill_pot
  const pot = byId(layout, 'sill_pot');
  if (pot) {
    addBox(g, 0.7, 0.045, 0.28, P.trim, pot.position[0], pot.position[1] - 0.02, pot.position[2]);
  }

  const table = byId(layout, 'set_table');
  if (table) {
    const [tx, ty, tz] = table.position;
    addBox(g, 1.7, 0.02, 1.85, P.rugEdge, tx, ty + 0.012, tz);
    addBox(g, 1.5, 0.02, 1.62, P.rug, tx, ty + 0.02, tz + 0.02);
    // spike tape around the set table
    addBox(g, 0.12, 0.005, 0.025, P.tape, tx - 0.55, top + 0.025, tz - 0.55);
    addBox(g, 0.025, 0.005, 0.12, P.tape, tx - 0.55, top + 0.025, tz - 0.55);
    addBox(g, 0.12, 0.005, 0.025, P.gel('#7eb6ff', 0.35), tx + 0.55, top + 0.025, tz + 0.5);
    const tableTop = ty + layout.assets.square_table.targetHeight;
    addBox(g, 0.16, 0.03, 0.22, P.bookA, tx + 0.28, tableTop + 0.02, tz - 0.12);
    addBox(g, 0.14, 0.025, 0.2, P.bookC, tx + 0.3, tableTop + 0.05, tz - 0.08);
    addBox(g, 0.22, 0.008, 0.16, P.paper, tx - 0.22, tableTop + 0.006, tz + 0.12);
  }

  // picture on the plaster between door and window
  addBox(g, 0.48, 0.36, 0.03, P.trim, 0.28, base + 1.85, flatZ + 0.05);
  addBox(g, 0.38, 0.26, 0.02, P.pictureMat, 0.28, base + 1.85, flatZ + 0.065);
  addBox(g, 0.28, 0.16, 0.015, P.picture, 0.28, base + 1.85, flatZ + 0.075);
}

function buildRig(g, P, layout) {
  const y = 4.22;
  pipeX(g, P.metal, -2.5, 3.3, y, 1.25);
  pipeX(g, P.metal, -2.3, 3.0, y, -0.62);
  pipeX(g, P.metal, -1.8, 2.7, y, -2.5);
  pipeX(g, P.metal, -1.6, 2.5, y, -4.15);
  pipeZ(g, P.metal, -1.7, y, -4.4, -0.4);
  pipeZ(g, P.metal, 2.35, y, -4.4, -0.4);
  // drops from the ceiling slab
  for (const [x, z] of [[-1.7, -4.15], [2.35, -4.15], [-1.7, -0.62], [2.35, -0.62], [0.3, 1.25]]) {
    addCyl(g, 0.012, 0.012, 0.36, P.metalDark, x, y + 0.18, z, 6);
  }

  const focus = layout.meta.stage.focus;
  const fixtures = [
    { x: -1.5, y, z: 1.25, aim: [-1.2, 0.45, 0.6], gel: '#ffd2a8', kind: 'par', intensity: 7 },
    { x: 0.35, y, z: 1.25, aim: [0.3, 0.4, 0.2], gel: '#ffe0c0', kind: 'par', intensity: 7 },
    { x: 2.15, y, z: 1.25, aim: [1.7, 0.45, 0.7], gel: '#ffd2a8', kind: 'par', intensity: 6 },
    { x: -0.85, y, z: -0.62, aim: [0.05, 1.05, focus[2]], gel: '#ffb060', kind: 'ers', intensity: 16 },
    { x: 0.4, y, z: -0.62, aim: [0.35, 0.95, -3.35], gel: '#fff0d0', kind: 'ers', intensity: 18 },
    { x: 1.55, y, z: -0.62, aim: [0.7, 1.1, -3.05], gel: '#ff9960', kind: 'par', intensity: 12 },
    { x: -1.25, y, z: -2.5, aim: [-0.1, 1.0, -3.45], gel: '#ffb060', kind: 'par', intensity: 11 },
    { x: -0.15, y, z: -2.5, aim: [0.25, 0.85, -3.5], gel: '#fff6e8', kind: 'ers', intensity: 14 },
    { x: 0.85, y, z: -2.5, aim: [0.45, 1.15, -3.15], gel: '#ff5078', kind: 'par', intensity: 10 },
    { x: 1.85, y, z: -2.5, aim: [1.05, 1.05, -3.55], gel: '#7eb6ff', kind: 'ers', intensity: 9 },
    { x: -0.35, y, z: -4.15, aim: [0.15, 1.45, -2.35], gel: '#6aa8ff', kind: 'ers', intensity: 10 },
    { x: 0.85, y, z: -4.15, aim: [0.4, 1.35, -2.15], gel: '#3ecf88', kind: 'par', intensity: 8 },
    { x: 1.9, y, z: -4.15, aim: [0.65, 1.4, -2.45], gel: '#7eb6ff', kind: 'par', intensity: 9 },
    // niche work light, aimed at the prep desk
    { x: -2.35, y: 2.55, z: -1.7, aim: [-3.3, 0.95, -3.05], gel: '#ffe0b0', kind: 'par', intensity: 22 },
  ];
  for (const f of fixtures) addFixture(g, P, f);
}

function buildNicheDressing(g, P, layout, niche) {
  // costume rack against the back of the bay, tall enough to clear the half-wall
  const rx = -4.5;
  const rz = -2.15;
  addCyl(g, 0.025, 0.03, 1.7, P.metal, rx - 0.55, 0.85, rz, 8);
  addCyl(g, 0.025, 0.03, 1.7, P.metal, rx + 0.55, 0.85, rz, 8);
  pipeX(g, P.metal, rx - 0.55, rx + 0.55, 1.62, rz, 0.018);
  const cloth = [P.navy, P.rust, P.cream, P.forest, P.velvetA];
  cloth.forEach((mat, i) => {
    const x = rx - 0.42 + i * 0.22;
    addBox(g, 0.18, 0.72, 0.06, mat, x, 1.18, rz + (i % 2) * 0.03);
    addCyl(g, 0.012, 0.012, 0.08, P.metalDark, x, 1.56, rz, 6);
  });

  // crate stack under crate_mug, plus one crate by the doorway
  const mug = byId(layout, 'crate_mug');
  if (mug) {
    const [x, , z] = mug.position;
    addBox(g, 0.5, 0.32, 0.4, P.crate, x, 0.16, z);
    addBox(g, 0.44, 0.28, 0.34, P.crateDark, x + 0.03, 0.46, z + 0.02);
    addBox(g, 0.38, 0.22, 0.3, P.crate, x - 0.02, 0.71, z - 0.01);
    addBox(g, 0.28, 0.04, 0.22, P.crateInner, x - 0.02, 0.8, z - 0.01);
  }
  addBox(g, 0.42, 0.28, 0.34, P.crateDark, -4.15, 0.14, -4.45);
  addBox(g, 0.34, 0.06, 0.26, P.crateInner, -4.15, 0.26, -4.45);

  const desk = byId(layout, 'prep_desk');
  if (desk) {
    const topY = desk.position[1] + layout.assets.study_desk.targetHeight;
    const x = desk.position[0];
    const z = desk.position[2];
    addBox(g, 0.2, 0.006, 0.28, P.paper, x + 0.02, topY + 0.006, z + 0.42);
    addBox(g, 0.16, 0.006, 0.22, P.paper2, x - 0.04, topY + 0.012, z + 0.48);
    const roll = new THREE.Mesh(new THREE.TorusGeometry(0.045, 0.016, 6, 10), P.tape);
    roll.rotation.x = Math.PI / 2;
    roll.position.set(x + 0.08, topY + 0.03, z + 0.15);
    roll.userData.noShadow = true;
    g.add(roll);
    const roll2 = new THREE.Mesh(new THREE.TorusGeometry(0.04, 0.014, 6, 10), P.mask);
    roll2.rotation.y = 0.6;
    roll2.position.set(x - 0.08, topY + 0.03, z + 0.18);
    g.add(roll2);
  }

  const stand = byId(layout, 'prep_stand');
  if (stand) {
    const y = stand.position[1] + layout.assets.book_stand.targetHeight;
    const page = new THREE.Group();
    page.position.set(stand.position[0], y + 0.02, stand.position[2]);
    page.rotation.y = stand.rotationY || 0;
    page.rotation.x = -0.35;
    const sheet = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.01, 0.36), P.paper);
    sheet.castShadow = true;
    page.add(sheet);
    addBox(page, 0.22, 0.012, 0.02, P.note, 0, 0.01, -0.08);
    g.add(page);
  }

  const shelf = byId(layout, 'prep_shelf');
  if (shelf) {
    const y = shelf.position[1];
    const x = shelf.position[0] + 0.02;
    const z = shelf.position[2];
    const jars = [
      [z - 0.16, y + 0.08, 0.05, P.jarA],
      [z - 0.02, y + 0.08, 0.07, P.jarB],
      [z + 0.12, y + 0.08, 0.045, P.jarC],
      [z - 0.08, y + 0.34, 0.05, P.jarB],
      [z + 0.08, y + 0.34, 0.06, P.jarA],
    ];
    for (const [jz, jy, r, mat] of jars) {
      addCyl(g, r, r * 0.85, r * 1.6, mat, x, jy, jz, 8);
    }
  }

  // cable coil on the rubber floor
  const coil = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.018, 6, 14), P.mask);
  coil.rotation.x = Math.PI / 2;
  coil.position.set(-3.55, 0.04, -3.05);
  g.add(coil);

  // clamp-lamp bulb under the niche header, matching the point light
  addBox(g, 0.08, 0.06, 0.1, P.metalDark, -3.5, 2.22, -2.7);
  const work = new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 8), P.bulb);
  work.position.set(-3.5, 2.1, -2.7);
  work.userData.noShadow = true;
  g.add(work);
}

function buildContacts(g, P, layout, top) {
  for (const inst of layout.instances) {
    if (inst.kind === 'theatre_chair') {
      contact(g, P.contact, inst.position[0], inst.position[1], inst.position[2] + 0.05, 0.34, 0.28);
    } else if (inst.kind === 'dining_chair') {
      contact(g, P.contact, inst.position[0], inst.position[1], inst.position[2], 0.22, 0.22);
    } else if (inst.kind === 'square_table' || inst.kind === 'study_desk') {
      contact(g, P.contact, inst.position[0], inst.position[1], inst.position[2], 0.42, 0.36);
    }
  }
  // stage lip shadow
  const stage = layout.meta.stage;
  addBox(g, stage.x1 - stage.x0, 0.02, 0.08, P.contact, (stage.x0 + stage.x1) / 2, 0.01, stage.z1 + 0.08);
}

boot({
  makeShell,
  makeProcedural,
  readyText: 'ready — blackbox theatre · drag orbit · U unlit · T toon',
}).catch((err) => {
  console.error(err);
  window.__sceneErrors = window.__sceneErrors || [];
  window.__sceneErrors.push(String(err && err.message ? err.message : err));
  const status = document.getElementById('status');
  if (status) status.textContent = `error — ${err.message || err}`;
});
