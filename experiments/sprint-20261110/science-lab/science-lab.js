import * as THREE from 'three';
import { boot, toon, addBox, addCyl, fillBooks } from './scene_lib.js';
import { opticsPoster, solarPoster, cellPoster, moonPoster, floorMap, zoneCard, chalkBoard } from './panels.js';

const state = {
  paused: false,
  prism: 0,
  lens: 'convex',
  featured: 'earth',
  time: 0,
};

const PRISM_YAW = [0.05, 0.42, -0.28];
const SPECTRUM = ['#e24b4b', '#f08a2a', '#f2d14a', '#3aaa62', '#3d7fe0'];

function glow(hex, intensity = 0.9) {
  const m = toon(hex);
  m.emissive = new THREE.Color(hex);
  m.emissiveIntensity = intensity;
  return m;
}

function glass(hex, opacity = 0.5) {
  const m = toon(hex, { transparent: true, opacity, side: THREE.DoubleSide, depthWrite: false });
  m.emissive = new THREE.Color(hex);
  m.emissiveIntensity = 0.22;
  return m;
}

function artMat(tex) {
  const m = toon('#ffffff');
  m.map = tex;
  m.emissive = new THREE.Color('#ffffff');
  m.emissiveMap = tex;
  m.emissiveIntensity = 0.42;
  m.side = THREE.DoubleSide;
  return m;
}

function shadowTex() {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 128;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(64, 64, 6, 64, 64, 62);
  grd.addColorStop(0, 'rgba(0,0,0,0.5)');
  grd.addColorStop(0.5, 'rgba(0,0,0,0.18)');
  grd.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function contact(parent, tex, x, z, rx, rz) {
  const mat = new THREE.MeshBasicMaterial({
    map: tex,
    transparent: true,
    depthWrite: false,
    color: 0x111111,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
  });
  mat.userData.keepBasic = true;
  const m = new THREE.Mesh(new THREE.CircleGeometry(1, 20), mat);
  m.rotation.x = -Math.PI / 2;
  m.position.set(x, 0.034, z);
  m.scale.set(rx, rz, 1);
  m.userData.shadow = 'none';
  m.raycast = () => {};
  parent.add(m);
}

function poster(parent, tex, x, y, z, rotY, w, h) {
  const g = new THREE.Group();
  const frame = new THREE.Mesh(new THREE.BoxGeometry(w + 0.08, h + 0.08, 0.045), toon('#2c2824'));
  frame.userData.shadow = 'cast';
  const face = new THREE.Mesh(new THREE.PlaneGeometry(w, h), artMat(tex));
  face.position.z = 0.03;
  face.userData.shadow = 'receive';
  const lip = new THREE.Mesh(new THREE.BoxGeometry(w + 0.12, 0.035, 0.06), toon('#c6a15b'));
  lip.position.y = -(h + 0.08) / 2;
  g.add(frame, face, lip);
  g.position.set(x, y, z);
  g.rotation.y = rotY;
  parent.add(g);
  return g;
}

function addSphere(g, r, mat, x, y, z) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(r, 14, 10), mat);
  m.position.set(x, y, z);
  g.add(m);
  return m;
}

function foliage(g, x, z, kind, y0 = 0) {
  const stem = toon('#3e5228');
  const leaf = toon('#2f6a3a');
  const leaf2 = toon('#3d7a48');
  if (kind === 'tree') {
    addCyl(g, 0.03, 0.045, 0.48, stem, x, y0 + 0.46, z, 8);
    addSphere(g, 0.2, leaf, x, y0 + 0.82, z);
    addSphere(g, 0.14, leaf2, x + 0.12, y0 + 0.96, z - 0.05);
    addSphere(g, 0.11, leaf, x - 0.1, y0 + 0.9, z + 0.07);
  } else if (kind === 'fern') {
    addCyl(g, 0.015, 0.02, 0.16, stem, x, y0 + 0.26, z, 6);
    addSphere(g, 0.12, toon('#4a8a52'), x, y0 + 0.4, z);
    addSphere(g, 0.08, leaf2, x + 0.07, y0 + 0.48, z + 0.02);
  } else {
    addSphere(g, 0.14, leaf, x, y0 + 0.36, z);
    addSphere(g, 0.1, leaf2, x + 0.08, y0 + 0.46, z - 0.03);
  }
}

function makePrismGeo() {
  const shape = new THREE.Shape();
  const r = 0.16;
  for (let i = 0; i < 3; i++) {
    const a = -Math.PI / 2 + i * (Math.PI * 2 / 3);
    const x = Math.cos(a) * r;
    const y = Math.sin(a) * r;
    if (i === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  const geo = new THREE.ExtrudeGeometry(shape, { depth: 0.26, bevelEnabled: false });
  geo.rotateX(-Math.PI / 2);
  geo.computeBoundingBox();
  geo.translate(0, -geo.boundingBox.min.y, 0);
  return geo;
}

function beamMesh(color) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(1, 0.028, 0.04), glow(color, 0.95));
  m.userData.shadow = 'none';
  return m;
}

const _dir = new THREE.Vector3();
const _mid = new THREE.Vector3();
function placeBeam(mesh, a, b) {
  _dir.subVectors(b, a);
  const len = Math.max(0.02, _dir.length());
  mesh.scale.set(len, 1, 1);
  _mid.copy(a).add(b).multiplyScalar(0.5);
  mesh.position.copy(_mid);
  _dir.multiplyScalar(1 / len);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(1, 0, 0), _dir);
}

const rig = {
  orbits: [],
  sun: null,
  prism: null,
  beams: {},
  focus: null,
  badge: {},
};

function layoutBeams() {
  const origin = new THREE.Vector3(-6.18, 0.9, 1.22);
  const whiteStart = new THREE.Vector3(-6.18, 0.9, 0.48);
  placeBeam(rig.beams.white, whiteStart, origin);
  const yaw = PRISM_YAW[state.prism];
  rig.prism.rotation.y = yaw;
  rig.beams.spectrum.forEach((mesh, i) => {
    const fan = (i - 2) * 0.14 + yaw * 0.45;
    const end = new THREE.Vector3(origin.x + Math.sin(fan) * 0.82, origin.y + (i - 2) * 0.045, origin.z + Math.cos(fan) * 0.72);
    placeBeam(mesh, origin, end);
  });

  const lens = new THREE.Vector3(-4.2, 1.08, 1.52);
  const inlet = lens.clone();
  inlet.z -= 0.62;
  placeBeam(rig.beams.lensIn, inlet, lens);
  if (state.lens === 'convex') {
    const focus = lens.clone();
    focus.z += 0.55;
    rig.focus.position.copy(focus);
    rig.focus.visible = true;
    placeBeam(rig.beams.lensA, lens.clone().add(new THREE.Vector3(-0.1, 0.08, 0.02)), focus);
    placeBeam(rig.beams.lensB, lens.clone().add(new THREE.Vector3(0.1, -0.05, 0.02)), focus);
  } else {
    rig.focus.visible = false;
    placeBeam(rig.beams.lensA, lens, lens.clone().add(new THREE.Vector3(-0.22, 0.1, 0.62)));
    placeBeam(rig.beams.lensB, lens, lens.clone().add(new THREE.Vector3(0.22, -0.08, 0.62)));
  }
}

function makeShell(layout) {
  const g = new THREE.Group();
  g.name = 'shell';
  const { width: W, depth: D, height: H } = layout.meta.room;
  const s = layout.shell;
  const floor = toon(s.floorColor);
  const wall = toon(s.wallColor);
  wall.emissive = new THREE.Color(s.wallColor);
  wall.emissiveIntensity = 0.08;
  const wood = toon(s.woodColor);
  const slate = toon('#314555');
  const brass = toon('#c6a15b');
  const plaster = toon(s.ceilingColor);
  plaster.emissive = new THREE.Color(s.ceilingColor);
  plaster.emissiveIntensity = 0.28;

  const slab = addBox(g, W, 0.1, D, floor, 0, -0.05, 0, { shadow: 'receive' });
  slab.name = 'floor';

  // Zone floors — inlays, not a tile grid.
  addBox(g, 3.55, 0.025, 5.15, slate, -5.0, 0.012, 0.85, { shadow: 'receive' });
  addBox(g, 3.5, 0.02, 2.35, toon('#d7c4a2'), 0.95, 0.012, 1.45, { shadow: 'receive' });
  for (let i = 0; i < 6; i++) {
    const shade = i % 2 ? '#c9ae86' : '#dfc7a4';
    addBox(g, 3.2, 0.008, 0.28, toon(shade), 0.95, 0.026, 0.55 + i * 0.34, { shadow: 'none' });
  }
  addBox(g, 2.55, 0.025, 4.7, toon('#c5d0c4'), 5.45, 0.012, -2.45, { shadow: 'receive' });
  addBox(g, 2.4, 0.012, 0.08, brass, 0.2, 0.03, 1.55, { shadow: 'none' });
  addBox(g, 0.08, 0.012, 3.3, brass, 0.15, 0.03, -0.2, { shadow: 'none' });
  addBox(g, 2.2, 0.02, 0.42, toon('#8d7a62'), 0.35, 0.016, 4.35, { shadow: 'receive' });

  const back = addBox(g, W, H, 0.14, wall, 0, H / 2, -D / 2, { shadow: 'receive' });
  back.name = 'back-wall';
  const left = addBox(g, 0.14, H, D, wall, -W / 2, H / 2, 0, { shadow: 'receive' });
  left.name = 'left-wall';
  addBox(g, 0.14, H, 4.7, wall, W / 2, H / 2, -2.55, { shadow: 'receive' });

  addBox(g, W - 0.2, 1.02, 0.06, toon('#3d4c59'), 0, 0.51, -D / 2 + 0.1, { shadow: 'receive' });
  addBox(g, 0.06, 1.02, D - 0.2, toon('#3d4c59'), -W / 2 + 0.1, 0.51, 0, { shadow: 'receive' });
  addBox(g, W - 0.3, 0.08, 0.05, wood, 0, 0.04, -D / 2 + 0.12);
  addBox(g, 0.05, 0.08, D - 0.3, wood, -W / 2 + 0.12, 0.04, 0);
  addBox(g, W - 0.5, 0.045, 0.05, wood, 0, 3.22, -D / 2 + 0.12);
  addBox(g, 0.05, 0.045, D - 0.6, wood, -W / 2 + 0.12, 3.22, -0.2);

  // Storage partition with a real doorway.
  addBox(g, 0.14, H, 3.05, toon('#e7eef3'), 4.15, H / 2, -3.375);
  addBox(g, 0.14, H, 0.95, toon('#e7eef3'), 4.15, H / 2, -0.28);
  addBox(g, 0.14, 1.65, 1.1, toon('#e7eef3'), 4.15, 3.025, -1.3);
  addBox(g, 0.18, 0.08, 1.2, wood, 4.08, 2.18, -1.3);
  addBox(g, 0.08, 2.15, 0.08, wood, 4.08, 1.08, -1.85);
  addBox(g, 0.08, 2.15, 0.08, wood, 4.08, 1.08, -0.75);

  const door = new THREE.Group();
  addBox(door, 0.05, 2.02, 0.9, toon('#6d5138'), -0.04, 1.01, 0.45);
  addBox(door, 0.02, 1.55, 0.62, toon('#8a6a48'), -0.07, 1.05, 0.48);
  addCyl(door, 0.02, 0.02, 0.08, brass, -0.09, 1.0, 0.72, 8);
  door.position.set(4.08, 0, -1.85);
  door.rotation.y = -0.62;
  g.add(door);

  // Optics bay screen: low solid wall, open pass, glazed head.
  addBox(g, 0.1, 1.08, 1.4, toon('#d5e0e6'), -3.35, 0.54, 0.45);
  addBox(g, 0.1, 1.08, 1.45, toon('#d5e0e6'), -3.35, 0.54, 2.62);
  addBox(g, 0.04, 0.9, 1.35, glass('#b7d4de', 0.28), -3.35, 1.62, 0.48, { shadow: 'none' });
  addBox(g, 0.04, 0.9, 1.4, glass('#b7d4de', 0.28), -3.35, 1.62, 2.62, { shadow: 'none' });
  addBox(g, 0.28, H, 0.28, toon('#4d4036'), -3.35, H / 2, 3.5);
  addBox(g, 0.4, 0.08, 0.4, toon('#c6a15b'), -3.35, H - 0.12, 3.5);
  addBox(g, 0.22, 2.4, 0.22, toon('#4d4036'), 4.15, 1.2, 0.22);
  addBox(g, 0.34, 0.08, 0.34, toon('#c6a15b'), 4.15, 2.44, 0.22);

  // Lantern over the orrery — beams, not a black lid.
  const beam = toon('#4a4038');
  addBox(g, 2.8, 0.1, 0.12, beam, -0.35, 3.58, -3.55, { shadow: 'cast' });
  addBox(g, 2.8, 0.1, 0.12, beam, -0.35, 3.58, -1.55, { shadow: 'cast' });
  addBox(g, 0.12, 0.1, 2.1, beam, -1.7, 3.58, -2.55, { shadow: 'cast' });
  addBox(g, 0.12, 0.1, 2.1, beam, 1.0, 3.58, -2.55, { shadow: 'cast' });
  const lantern = glow('#fff6e4', 0.55);
  addBox(g, 2.3, 0.04, 1.7, lantern, -0.35, 3.72, -2.55, { shadow: 'none' });

  // Soffits mark the side rooms. Emissive keeps the underside out of pure black.
  addBox(g, 3.6, 0.42, 5.3, plaster, -4.95, 3.6, 0.85, { shadow: 'none' });
  addBox(g, 2.6, 0.5, 4.6, plaster, 5.45, 3.55, -2.5, { shadow: 'none' });
  addBox(g, 4.2, 0.1, 1.4, beam, 0.4, 3.45, 0.15, { shadow: 'cast' });

  // Colored transoms on the back wall.
  const panes = [['#7eb6d4', -3.7], ['#e6c27a', 3.65]];
  for (const [color, x] of panes) {
    addBox(g, 0.9, 0.85, 0.06, toon('#3a342c'), x, 2.72, -4.78);
    addBox(g, 0.72, 0.66, 0.03, glow(color, 0.45), x, 2.72, -4.74, { shadow: 'none' });
    addBox(g, 0.03, 0.66, 0.04, toon('#3a342c'), x, 2.72, -4.72);
  }

  // Track cans under the lantern.
  for (const x of [-1.15, -0.35, 0.45]) {
    addCyl(g, 0.07, 0.1, 0.1, toon('#2a2826'), x, 3.42, -2.55, 10);
    addCyl(g, 0.05, 0.05, 0.03, glow('#fff1d4', 0.8), x, 3.35, -2.55, 10, { shadow: 'none' });
  }
  return g;
}

function buildOrrery(g) {
  const root = new THREE.Group();
  root.position.set(-0.35, 0, -2.55);
  const stone = toon('#2a3140');
  const brass = toon('#c6a15b');
  addCyl(root, 1.28, 1.32, 0.14, stone, 0, 0.07, 0, 40);
  addCyl(root, 1.05, 1.05, 0.03, toon('#1b2230'), 0, 0.15, 0, 40);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(1.18, 0.025, 8, 48), brass);
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.16;
  root.add(ring);

  addBox(root, 0.08, 0.7, 0.08, brass, -0.55, 0.5, 0);
  addBox(root, 0.08, 0.7, 0.08, brass, 0.55, 0.5, 0);
  addCyl(root, 0.04, 0.04, 1.2, brass, 0, 0.86, 0, 10, { rotZ: Math.PI / 2 });

  const tilt = new THREE.Group();
  tilt.position.y = 0.86;
  tilt.rotation.x = 0.4;
  root.add(tilt);

  const sun = new THREE.Mesh(new THREE.SphereGeometry(0.13, 24, 16), glow('#ffcc70', 0.85));
  sun.userData.pick = 'sun';
  sun.userData.shadow = 'none';
  tilt.add(sun);
  rig.sun = sun;

  const planets = [
    { id: 'mercury', r: 0.28, size: 0.038, color: '#d5d0c6', rate: 1.35, phase: 0.5 },
    { id: 'venus', r: 0.4, size: 0.05, color: '#ead7a4', rate: 1.05, phase: 1.5 },
    { id: 'earth', r: 0.54, size: 0.055, color: '#3d86c6', rate: 0.82, phase: 2.35, moon: true },
    { id: 'mars', r: 0.68, size: 0.046, color: '#d15a3c', rate: 0.66, phase: 3.7 },
    { id: 'jupiter', r: 0.86, size: 0.082, color: '#e0b888', rate: 0.4, phase: 4.6, band: true },
    { id: 'saturn', r: 1.04, size: 0.07, color: '#f0e0b8', rate: 0.3, phase: 5.5, ring: true },
  ];
  for (const p of planets) {
    const orbitRing = new THREE.Mesh(new THREE.TorusGeometry(p.r, 0.006, 6, 64), toon('#8d7444'));
    orbitRing.rotation.x = Math.PI / 2;
    orbitRing.userData.shadow = 'none';
    tilt.add(orbitRing);

    const pivot = new THREE.Group();
    pivot.userData.rate = p.rate;
    pivot.userData.phase = p.phase;
    tilt.add(pivot);
    const arm = new THREE.Mesh(new THREE.BoxGeometry(p.r - 0.12, 0.012, 0.012), brass);
    arm.position.set(p.r / 2 + 0.04, 0, 0);
    arm.userData.shadow = 'none';
    pivot.add(arm);
    const body = new THREE.Mesh(new THREE.SphereGeometry(p.size, 18, 12), toon(p.color));
    body.position.set(p.r, 0, 0);
    body.userData.pick = `planet:${p.id}`;
    pivot.add(body);
    if (p.band) {
      const band = new THREE.Mesh(new THREE.TorusGeometry(p.size * 1.02, p.size * 0.18, 6, 20), toon('#b8885a'));
      band.rotation.x = Math.PI / 2;
      band.position.copy(body.position);
      pivot.add(band);
    }
    if (p.ring) {
      const sat = new THREE.Mesh(new THREE.TorusGeometry(p.size * 1.55, 0.012, 6, 24), toon('#f4e7c4'));
      sat.rotation.x = 0.7;
      sat.position.copy(body.position);
      pivot.add(sat);
    }
    if (p.moon) {
      const moonPivot = new THREE.Group();
      moonPivot.position.copy(body.position);
      moonPivot.userData.moon = true;
      const moon = new THREE.Mesh(new THREE.SphereGeometry(0.018, 10, 8), toon('#e6e2d8'));
      moon.position.set(0.1, 0.02, 0);
      moonPivot.add(moon);
      pivot.add(moonPivot);
    }
    const pick = new THREE.Mesh(
      new THREE.SphereGeometry(p.size * 2.4, 8, 8),
      new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }),
    );
    pick.material.userData.keepBasic = true;
    pick.position.copy(body.position);
    pick.userData.pick = `planet:${p.id}`;
    pick.userData.shadow = 'none';
    pivot.add(pick);
    const badge = new THREE.Mesh(new THREE.TorusGeometry(p.size * 1.7, 0.008, 6, 24), glow('#ffd27a', 0.7));
    badge.position.copy(body.position);
    badge.rotation.x = Math.PI / 2;
    badge.visible = p.id === state.featured;
    badge.userData.shadow = 'none';
    pivot.add(badge);
    rig.badge[p.id] = badge;
    rig.orbits.push(pivot);
  }
  g.add(root);

  // Armillary moon on the neighboring plinth (plinth GLB is 1.08 tall).
  const arm = new THREE.Group();
  arm.position.set(2.4, 1.2, -3.2);
  arm.name = 'armillary';
  const globe = new THREE.Mesh(new THREE.SphereGeometry(0.16, 20, 14), toon('#d9d3c6'));
  const sea = new THREE.Mesh(new THREE.SphereGeometry(0.162, 16, 12), toon('#7aa0b8'));
  sea.scale.set(1, 0.35, 0.2);
  const hoopA = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.012, 8, 28), brass);
  const hoopB = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.012, 8, 28), brass);
  hoopB.rotation.x = Math.PI / 2;
  const hoopC = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.012, 8, 28), brass);
  hoopC.rotation.y = Math.PI / 2;
  arm.add(globe, sea, hoopA, hoopB, hoopC);
  arm.userData.spin = true;
  rig.armillary = arm;
  g.add(arm);
}

function buildOptics(g) {
  const brass = toon('#c6a15b');
  const ink = toon('#2a3038');
  // Lamp house at the near end of the bench.
  addBox(g, 0.22, 0.16, 0.18, ink, -6.18, 0.9, 0.32);
  addBox(g, 0.06, 0.08, 0.04, glow('#fff6d8', 1), -6.18, 0.9, 0.42, { shadow: 'none' });
  addCyl(g, 0.03, 0.03, 0.35, brass, -6.18, 0.76, 0.32, 8);

  const prism = new THREE.Mesh(makePrismGeo(), glass('#b7e4ee', 0.62));
  prism.position.set(-6.18, 0.76, 1.22);
  prism.userData.pick = 'prism';
  prism.userData.shadow = 'none';
  g.add(prism);
  rig.prism = prism;
  addCyl(g, 0.1, 0.12, 0.03, brass, -6.18, 0.775, 1.22, 12);

  addBox(g, 0.62, 0.42, 0.03, toon('#f7f4ee'), -6.12, 1.05, 2.02);
  addBox(g, 0.68, 0.48, 0.02, ink, -6.12, 1.05, 2.0);

  rig.beams.white = beamMesh('#fff6de');
  rig.beams.spectrum = SPECTRUM.map((c) => beamMesh(c));
  g.add(rig.beams.white, ...rig.beams.spectrum);

  // Lens station, pulled into the bay so the aisle camera can see the rays.
  const stand = new THREE.Group();
  addBox(stand, 0.42, 0.08, 0.42, toon('#4d4036'), 0, 0.04, 0);
  addBox(stand, 0.16, 0.78, 0.16, toon('#6d5138'), 0, 0.47, 0);
  addBox(stand, 0.5, 0.06, 0.34, toon('#e7e2d6'), 0, 0.89, 0);
  addCyl(stand, 0.02, 0.02, 0.22, brass, -0.16, 1.02, -0.28, 8);
  const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.045, 12, 10), glow('#fff4d0', 1));
  lamp.position.set(0, 1.08, -0.28);
  lamp.userData.shadow = 'none';
  stand.add(lamp);
  const lens = new THREE.Mesh(new THREE.SphereGeometry(0.12, 20, 14), glass('#d5f2f6', 0.72));
  lens.scale.set(1, 1, 0.28);
  lens.position.set(0, 1.08, 0);
  lens.userData.pick = 'lens';
  lens.userData.shadow = 'none';
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.125, 0.012, 8, 24), brass);
  rim.position.copy(lens.position);
  stand.add(lens, rim);
  stand.position.set(-4.2, 0, 1.52);
  g.add(stand);

  rig.beams.lensIn = beamMesh('#fff6de');
  rig.beams.lensA = beamMesh('#f2c14a');
  rig.beams.lensB = beamMesh('#f2c14a');
  rig.focus = new THREE.Mesh(new THREE.SphereGeometry(0.035, 10, 8), glow('#fff1c4', 1));
  rig.focus.userData.shadow = 'none';
  g.add(rig.beams.lensIn, rig.beams.lensA, rig.beams.lensB, rig.focus);
  layoutBeams();

  // Center leg under the stretched table.
  addBox(g, 0.08, 0.7, 0.08, toon('#5c4636'), -6.24, 0.35, 1.2);
}

function buildIsland(g) {
  const cab = toon('#243f49');
  const door = toon('#2f5562');
  const top = toon('#e7e2d6');
  const edge = toon('#c9c2b2');
  const brass = toon('#c6a15b');
  const ink = toon('#2a3038');
  const cx = 0.95;
  const cz = 1.35;
  const topY = 1.04;

  addBox(g, 2.28, 0.1, 0.92, ink, cx, 0.05, cz);
  addBox(g, 2.36, 0.72, 0.98, cab, cx, 0.5, cz);
  // Door faces, south and north, uneven rhythm.
  const southDoors = [[-0.86, 0.52], [-0.28, 0.52], [0.34, 0.46], [0.9, 0.58]];
  southDoors.forEach(([dx, w]) => {
    addBox(g, w, 0.58, 0.02, door, cx + dx, 0.52, cz + 0.5);
    addCyl(g, 0.015, 0.015, 0.06, brass, cx + dx + w * 0.32, 0.52, cz + 0.53, 6);
  });
  [[-0.7, 0.6], [0.15, 0.7], [0.85, 0.5]].forEach(([dx, w]) => {
    addBox(g, w, 0.56, 0.02, door, cx + dx, 0.52, cz - 0.5);
    addCyl(g, 0.015, 0.015, 0.06, brass, cx + dx - w * 0.28, 0.52, cz - 0.53, 6);
  });
  // Drawer stack on the east end.
  for (let i = 0; i < 3; i++) {
    addBox(g, 0.04, 0.16, 0.7, toon('#1d333c'), cx + 1.16, 0.28 + i * 0.22, cz);
    addCyl(g, 0.012, 0.012, 0.1, brass, cx + 1.19, 0.28 + i * 0.22, cz, 6, { rotZ: Math.PI / 2 });
  }
  addBox(g, 2.55, 0.06, 1.16, top, cx, topY, cz);
  addBox(g, 2.55, 0.025, 0.04, edge, cx, topY - 0.02, cz + 0.56);
  addBox(g, 2.55, 0.025, 0.04, edge, cx, topY - 0.02, cz - 0.56);

  // Sink
  addBox(g, 0.46, 0.05, 0.34, toon('#b7c4c8'), cx + 0.72, topY + 0.01, cz + 0.02);
  addBox(g, 0.34, 0.04, 0.24, toon('#8aa3aa'), cx + 0.72, topY + 0.02, cz + 0.02);
  addCyl(g, 0.02, 0.02, 0.22, brass, cx + 0.72, topY + 0.14, cz - 0.12, 8);
  addCyl(g, 0.018, 0.018, 0.16, brass, cx + 0.8, topY + 0.24, cz - 0.04, 8, { rotZ: Math.PI / 2 });

  // Microscope, eyepiece aimed at the south stools.
  addBox(g, 0.2, 0.035, 0.14, ink, cx - 0.05, topY + 0.03, cz + 0.05);
  addBox(g, 0.04, 0.16, 0.04, ink, cx - 0.02, topY + 0.12, cz - 0.02);
  addCyl(g, 0.028, 0.036, 0.16, brass, cx + 0.02, topY + 0.2, cz + 0.06, 10, { rotX: 0.7 });
  addCyl(g, 0.04, 0.045, 0.03, toon('#d9dde0'), cx + 0.05, topY + 0.08, cz + 0.08, 10);

  // Flasks and a dye rack — classroom colors, not a hazard cabinet.
  addCyl(g, 0.07, 0.035, 0.12, glass('#d5f0f4', 0.55), cx - 0.95, topY + 0.1, cz + 0.12, 10);
  addCyl(g, 0.02, 0.02, 0.08, glass('#d5f0f4', 0.55), cx - 0.95, topY + 0.2, cz + 0.12, 8);
  addCyl(g, 0.055, 0.055, 0.07, glass('#f2d0d4', 0.6), cx - 0.78, topY + 0.1, cz - 0.05, 12);
  addCyl(g, 0.018, 0.02, 0.09, glass('#f2d0d4', 0.6), cx - 0.78, topY + 0.18, cz - 0.05, 8);
  addBox(g, 0.28, 0.03, 0.1, woodTone(), cx - 0.55, topY + 0.03, cz + 0.28);
  const dyes = ['#e24b4b', '#f2d14a', '#3aaa62', '#3d7fe0'];
  dyes.forEach((c, i) => {
    addCyl(g, 0.012, 0.014, 0.1, glass(c, 0.75), cx - 0.66 + i * 0.07, topY + 0.09, cz + 0.28, 8);
  });
  addBox(g, 0.26, 0.015, 0.18, toon('#f4efe4'), cx + 0.28, topY + 0.02, cz + 0.32);
  addBox(g, 0.22, 0.008, 0.14, toon('#2f4a6a'), cx + 0.28, topY + 0.032, cz + 0.32);

  // Back rail of specimen bottles.
  addBox(g, 1.15, 0.04, 0.1, toon('#6d5138'), cx - 0.35, topY + 0.16, cz - 0.42);
  ['#9fd0c8', '#f2d0a8', '#d0c4e8'].forEach((c, i) => {
    addCyl(g, 0.035, 0.04, 0.12, glass(c, 0.7), cx - 0.7 + i * 0.22, topY + 0.24, cz - 0.42, 10);
    addCyl(g, 0.02, 0.02, 0.03, ink, cx - 0.7 + i * 0.22, topY + 0.32, cz - 0.42, 8);
  });

  // Cords for the two pendants.
  addCyl(g, 0.008, 0.008, 0.72, ink, 0.4, 3.4, 1.35, 6);
  addCyl(g, 0.008, 0.008, 0.72, ink, 1.55, 3.4, 1.35, 6);
  addCyl(g, 0.07, 0.025, 0.05, glow('#ffd8a8', 1), 0.4, 2.52, 1.35, 12, { shadow: 'none' });
  addCyl(g, 0.07, 0.025, 0.05, glow('#ffd8a8', 1), 1.55, 2.52, 1.35, 12, { shadow: 'none' });
}

function woodTone() {
  return toon('#6d5138');
}

function buildStorage(g) {
  const wood = toon('#6d5138');
  const crate = toon('#8a6844');
  const lid = toon('#6a4c30');
  // Cluster, not a stack grid.
  addBox(g, 0.55, 0.38, 0.42, crate, 4.75, 0.19, -3.45);
  addBox(g, 0.48, 0.04, 0.36, lid, 4.75, 0.4, -3.45);
  addBox(g, 0.32, 0.24, 0.28, toon('#a07a4e'), 4.7, 0.54, -3.4);
  addBox(g, 0.38, 0.28, 0.34, toon('#6e5338'), 5.15, 0.14, -3.15);
  addBox(g, 0.22, 0.16, 0.2, toon('#c4a06a'), 4.55, 0.08, -3.05);
  // Shelf of trays on the right return, heights I control.
  addBox(g, 0.08, 1.55, 0.08, wood, 6.15, 0.78, -3.55);
  addBox(g, 0.08, 1.55, 0.08, wood, 6.15, 0.78, -2.35);
  for (const y of [0.45, 0.95, 1.4]) addBox(g, 0.36, 0.04, 1.28, wood, 6.28, y, -2.95);
  const goods = [
    [6.28, 0.56, -3.35, 0.18, 0.12, 0.16, '#3d7fe0'],
    [6.3, 0.58, -3.05, 0.14, 0.16, 0.14, '#e24b4b'],
    [6.26, 0.52, -2.7, 0.22, 0.08, 0.18, '#f2d14a'],
    [6.3, 1.08, -3.4, 0.12, 0.18, 0.12, '#3aaa62'],
    [6.28, 1.12, -2.85, 0.2, 0.2, 0.16, '#d0c4e8'],
    [6.3, 1.5, -3.2, 0.16, 0.1, 0.22, '#8a6a48'],
    [6.27, 1.52, -2.6, 0.1, 0.14, 0.1, '#7eb6d4'],
  ];
  goods.forEach(([x, y, z, w, h, d, color]) => addBox(g, w, h, d, toon(color), x, y, z));

  // Geode on the storage plinth (plinth top ≈ 1.02).
  const geo = new THREE.Group();
  geo.position.set(5.55, 1.08, -2.45);
  const rock = new THREE.Mesh(new THREE.IcosahedronGeometry(0.16, 0), toon('#5c564e'));
  rock.scale.set(1.1, 0.8, 0.95);
  geo.add(rock);
  const crystalMat = [glow('#d7c4f2', 0.35), glow('#b7e0f4', 0.35), glow('#f2d0e8', 0.3)];
  for (let i = 0; i < 6; i++) {
    const c = new THREE.Mesh(new THREE.ConeGeometry(0.025, 0.1, 5), crystalMat[i % 3]);
    c.position.set((i - 2.5) * 0.04, 0.08, ((i % 3) - 1) * 0.04);
    c.rotation.z = (i - 3) * 0.18;
    geo.add(c);
  }
  g.add(geo);
}

function buildSigns(g) {
  const posts = [
    [-3.7, 3.15, 0, 'Optics', 'bend a beam'],
    [2.85, 2.7, 0, 'Workshop', 'mix a safe dye'],
    [-2.75, -1.4, 0.5, 'Planets', 'name a world'],
    [3.25, 0.15, 0.85, 'Stores', 'shelves and crates'],
  ];
  posts.forEach(([x, z, rot, title, line]) => {
    addCyl(g, 0.028, 0.036, 0.58, toon('#4d4036'), x, 0.29, z, 8);
    poster(g, zoneCard(title, line), x, 0.72, z, rot, 0.46, 0.24);
  });
  const map = new THREE.Mesh(new THREE.CircleGeometry(0.62, 32), artMat(floorMap()));
  map.rotation.set(-Math.PI / 2, 0, 0);
  map.position.set(0.85, 0.04, 4.15);
  map.userData.shadow = 'none';
  g.add(map);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.64, 0.03, 8, 32), toon('#c6a15b'));
  rim.rotation.x = Math.PI / 2;
  rim.position.set(0.85, 0.045, 4.15);
  g.add(rim);
}

function makeProcedural(layout) {
  const g = new THREE.Group();
  g.name = 'procedural';
  const tex = shadowTex();

  buildOrrery(g);
  buildOptics(g);
  buildIsland(g);
  buildStorage(g);
  buildSigns(g);

  poster(g, solarPoster(), -0.55, 2.4, -4.74, 0, 2.2, 1.22);
  poster(g, opticsPoster(), -6.66, 2.12, 1.15, Math.PI / 2, 1.65, 1.12);
  poster(g, moonPoster(), -6.66, 2.32, -2.55, Math.PI / 2, 1.7, 0.58);
  poster(g, cellPoster(), 2.4, 2.55, -4.74, 0, 1.45, 0.9);
  poster(g, chalkBoard(), 2.35, 1.02, -4.05, 0, 1.5, 0.86);

  foliage(g, 2.45, 3.7, 'tree');
  foliage(g, -6.2, 3.65, 'fern');
  foliage(g, 6.15, -0.55, 'bush');
  foliage(g, -4.4, -3.55, 'bush');
  foliage(g, 1.95, 1.58, 'bush', 1.02);

  const books = (layout.instances || []).filter((i) => i.kind === 'display_bookcase');
  books.forEach((b) => fillBooks(g, b.position[0], b.position[2] + 0.28, b.rotationY || 0, { width: 0.68, perShelf: 6 }));

  const radii = {
    dining_chair: [0.22, 0.28],
    bar_stool: [0.24, 0.24],
    museum_bench: [0.7, 0.28],
    flowerpot: [0.2, 0.2],
    book_stand: [0.32, 0.32],
    museum_plinth: [0.28, 0.28],
    museum_vitrine: [0.55, 0.55],
    display_bookcase: [0.4, 0.28],
    chalkboard: [0.35, 0.85],
  };
  for (const inst of layout.instances || []) {
    if (inst.kind === 'library_lamp') {
      addCyl(g, 0.09, 0.11, 0.05, glow('#b7e7a8', 0.7), inst.position[0], inst.position[1] + 0.28, inst.position[2], 12, { shadow: 'none' });
    }
    const r = radii[inst.kind];
    if (!r || inst.position[1] > 0.2) continue;
    let rx = r[0];
    let rz = r[1];
    if (inst.kind === 'museum_bench') {
      rx = 0.78;
      rz = 0.26;
    }
    if (inst.kind === 'chalkboard') {
      const alongX = Math.abs(Math.cos(inst.rotationY || 0)) < 0.5;
      rx = alongX ? 1.05 : 0.4;
      rz = alongX ? 0.4 : 1.05;
    }
    contact(g, tex, inst.position[0], inst.position[2], rx, rz);
  }
  contact(g, tex, 0.95, 1.35, 1.4, 0.75);
  contact(g, tex, -6.24, 1.2, 0.45, 1.05);
  contact(g, tex, -4.2, 1.52, 0.32, 0.28);
  return g;
}

function describe() {
  const planet = state.featured[0].toUpperCase() + state.featured.slice(1);
  const lens = state.lens === 'convex' ? 'gathering lens' : 'spreading lens';
  const spin = state.paused ? 'orrery held' : 'orrery turning';
  return `${planet} · prism ${state.prism + 1}/3 · ${lens} · ${spin}`;
}

function setFeatured(id) {
  state.featured = id;
  Object.entries(rig.badge).forEach(([name, mesh]) => { mesh.visible = name === id; });
}

function onPick(hits) {
  for (const hit of hits) {
    let o = hit.object;
    while (o) {
      if (o.userData && o.userData.pick) {
        const pick = o.userData.pick;
        if (pick === 'prism') state.prism = (state.prism + 1) % PRISM_YAW.length;
        else if (pick === 'lens') state.lens = state.lens === 'convex' ? 'concave' : 'convex';
        else if (pick === 'sun') state.paused = !state.paused;
        else if (pick.startsWith('planet:')) setFeatured(pick.slice(7));
        layoutBeams();
        const detail = document.getElementById('detail');
        if (detail) detail.textContent = describe();
        const status = document.getElementById('status');
        if (status) status.textContent = 'ready — ' + describe();
        return;
      }
      o = o.parent;
    }
  }
}

boot({
  makeShell,
  makeProcedural,
  readyText: 'ready — click the prism, the lens, or a planet',
  onReady(api) {
    api.lab = state;
    api.layoutBeams = layoutBeams;
    const detail = document.getElementById('detail');
    if (detail) detail.textContent = describe();
  },
  onKey(e) {
    if (e.key === 'p' || e.key === 'P') {
      state.paused = !state.paused;
      const detail = document.getElementById('detail');
      if (detail) detail.textContent = describe();
    }
  },
  onPick,
  onFrame(dt) {
    state.time += state.paused ? 0 : dt;
    const t = state.time;
    for (const pivot of rig.orbits) {
      pivot.rotation.y = pivot.userData.phase + t * pivot.userData.rate;
      const moon = pivot.children.find((c) => c.userData && c.userData.moon);
      if (moon) moon.rotation.y = t * 1.6;
    }
    if (rig.sun) {
      const s = 1 + Math.sin(t * 2.1) * 0.05;
      rig.sun.scale.setScalar(s);
      const mat = rig.sun.material;
      if (mat && mat.emissiveIntensity != null) mat.emissiveIntensity = 0.7 + Math.sin(t * 2.1) * 0.2;
    }
    if (rig.armillary) rig.armillary.rotation.y = t * 0.25;
  },
});
