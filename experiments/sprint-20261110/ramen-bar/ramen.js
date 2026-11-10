import * as THREE from 'three';
import {
  boot, toon, addBox, addCyl, addContact,
  norenTexture, signTexture, menuTexture, scrollTexture,
} from './scene_lib.js';

const P = {
  plaster: '#f3e2c8',
  tile: '#4a342c',
  grout: '#2a1d18',
  floor: '#6e412c',
  floorB: '#7d4c34',
  floorC: '#5c3424',
  gap: '#3e2418',
  hinoki: '#e7c78e',
  hinokiD: '#c4964e',
  hinokiS: '#a8743a',
  beam: '#3a291f',
  noren: '#c4372c',
  steel: '#9aa1a6',
  steelD: '#5e666c',
  pot: '#2c3338',
  potRim: '#d5dde2',
  bowl: '#f4eee4',
  bowlD: '#e4d8c4',
  noodle: '#f3e6c4',
  noodleD: '#e4d2a4',
  nori: '#1c3a2c',
  pork: '#c46a48',
  porkD: '#8a4030',
  egg: '#f7f1e2',
  yolk: '#e39b2d',
  negi: '#6ea04a',
  corn: '#f0c84a',
  chili: '#a32020',
  stone: '#8d847a',
  stoneD: '#6e675f',
  amber: '#f0b56a',
  paper: '#ffd7a8',
  glow: '#ff9a3c',
  tea: '#c5ddc4',
  soy: '#3a2418',
  white: '#f7f3ea',
};

function addCylX(g, r, len, mat, x, y, z) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, 12), mat);
  m.rotation.z = Math.PI / 2;
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  g.add(m);
  return m;
}

function plane(g, w, h, mat, x, y, z) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  g.add(m);
  return m;
}

function makeShell(layout) {
  const g = new THREE.Group();
  g.name = 'shell';
  const { width: W, depth: D, height: H } = layout.meta.room;
  const floorMat = toon(P.floor);
  const wallMat = toon(P.plaster);
  const beam = toon(P.beam);
  const tile = toon(P.tile);
  const grout = toon(P.grout);

  const floor = new THREE.Mesh(new THREE.BoxGeometry(W, 0.08, D), floorMat);
  floor.position.y = -0.04;
  floor.receiveShadow = true;
  g.add(floor);

  const plankTones = [P.floor, P.floorB, P.floorC, P.floorB];
  for (let i = 0, z = -D / 2 + 0.16; z < 1.28; z += 0.18, i++) {
    addBox(g, W - 0.28, 0.012, 0.155, toon(plankTones[i % 4]), -0.05, 0.006, z);
  }

  const back = new THREE.Mesh(new THREE.BoxGeometry(W, H, 0.12), wallMat);
  back.position.set(0, H / 2, -D / 2);
  back.receiveShadow = true;
  g.add(back);
  const left = new THREE.Mesh(new THREE.BoxGeometry(0.12, H, D), wallMat);
  left.position.set(-W / 2, H / 2, 0);
  left.receiveShadow = true;
  g.add(left);

  addBox(g, W - 0.2, 1.12, 0.04, tile, 0, 0.56, -D / 2 + 0.08);
  addBox(g, 0.04, 1.05, D * 0.72, tile, -W / 2 + 0.09, 0.52, -0.35);
  for (let y = 0.18; y < 1.12; y += 0.18) {
    addBox(g, W - 0.28, 0.012, 0.012, grout, 0, y, -D / 2 + 0.105);
  }
  for (let x = -W / 2 + 0.4; x < W / 2 - 0.2; x += 0.42) {
    addBox(g, 0.012, 1.08, 0.012, grout, x, 0.56, -D / 2 + 0.105);
  }
  addBox(g, W - 0.16, 0.06, 0.08, beam, 0, 1.15, -D / 2 + 0.1);
  addBox(g, 0.06, 0.08, D - 0.3, beam, -W / 2 + 0.1, 0.04, 0);
  addBox(g, W - 0.2, 0.08, 0.06, beam, 0, 0.04, -D / 2 + 0.08);

  const ceil = new THREE.Mesh(new THREE.BoxGeometry(W * 0.86, 0.05, D * 0.48), toon('#f6ead6'));
  ceil.position.set(-0.35, H - 0.04, -D * 0.26);
  ceil.userData.noShadow = true;
  g.add(ceil);
  for (const z of [-2.15, -1.35, -0.55]) {
    const joist = addBox(g, W * 0.78, 0.08, 0.1, beam, -0.25, H - 0.12, z);
    joist.userData.noShadow = true;
  }

  const stones = ['#8d847a', '#7b736a', '#9a9186', '#6e675f'];
  for (let ix = 0; ix < 8; ix++) {
    for (let iz = 0; iz < 4; iz++) {
      const wobble = ((ix * 3 + iz) % 3) * 0.012;
      addBox(
        g,
        0.3,
        0.025,
        0.26,
        toon(stones[(ix + iz) % 4]),
        -3.05 + ix * 0.34,
        0.02 + wobble,
        1.48 + iz * 0.28,
      );
    }
  }
  addBox(g, 3.05, 0.07, 0.09, toon(P.hinokiD), -1.7, 0.045, 1.32);

  addBox(g, 3.3, 0.015, 0.9, toon('#7a2e32'), 0.15, 0.014, 0.82);

  return g;
}

function makeWisp(phase, rise, baseRot) {
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(0.02, 0.2),
    toon('#f7f3ea', {
      emissive: '#f4efe4',
      emissiveIntensity: 0.4,
      transparent: true,
      opacity: 0.16,
      depthWrite: false,
      side: THREE.DoubleSide,
    }),
  );
  mesh.userData.steam = { phase, rise, baseRot };
  mesh.userData.noShadow = true;
  mesh.renderOrder = 4;
  return mesh;
}

function addWisps(parent, phase, rise) {
  const a = makeWisp(phase, rise, 0.2);
  const b = makeWisp(phase + 0.04, rise, Math.PI / 2);
  parent.add(a, b);
}

function stockPot(g, x, y, z, r, h) {
  addCyl(g, r, r * 0.94, h, toon(P.pot), x, y + h / 2, z, 20);
  addCyl(g, r * 1.05, r * 1.05, 0.018, toon(P.potRim), x, y + h - 0.004, z, 20);
  const lid = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.72, r * 0.78, 0.018, 16), toon('#3a4248'));
  lid.position.set(x - r * 0.15, y + h + 0.02, z - r * 0.28);
  lid.rotation.z = 0.35;
  lid.rotation.x = -0.2;
  lid.castShadow = true;
  g.add(lid);
  addCyl(g, 0.014, 0.01, 0.028, toon(P.potRim), x - r * 0.22, y + h + 0.04, z - r * 0.32, 8);
  const steam = new THREE.Group();
  steam.position.set(x + r * 0.05, y + h + 0.02, z + r * 0.08);
  addWisps(steam, (x + z) * 0.17, 0.34);
  g.add(steam);
}

function bowlSteam(g, x, y, z, phase) {
  const steam = new THREE.Group();
  steam.position.set(x, y, z);
  addWisps(steam, phase, 0.16);
  g.add(steam);
}

function noodleBasket(g, x, y, z, r) {
  const wire = toon('#d5dde2');
  const wireD = toon('#8b949a');
  for (const dy of [0.012, 0.04, 0.068]) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(r, 0.0032, 4, 14), wire);
    ring.rotation.x = Math.PI / 2;
    ring.position.set(x, y + dy, z);
    g.add(ring);
  }
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    addCyl(g, 0.0024, 0.0024, 0.07, wireD, x + Math.cos(a) * r * 0.82, y + 0.038, z + Math.sin(a) * r * 0.82, 4);
  }
  const handle = new THREE.Mesh(new THREE.TorusGeometry(r * 0.42, 0.004, 4, 8, Math.PI), wire);
  handle.rotation.z = Math.PI / 2;
  handle.position.set(x, y + 0.1, z);
  g.add(handle);
}

function ramenBowl(g, x, y, z, spec) {
  const root = new THREE.Group();
  root.position.set(x, y, z);
  root.rotation.y = spec.yaw || 0;
  addCyl(root, 0.08, 0.056, 0.048, toon(P.bowlD), 0, 0.024, 0, 18);
  addCyl(root, 0.086, 0.086, 0.012, toon(P.bowl), 0, 0.046, 0, 18);
  addCyl(root, 0.068, 0.058, 0.014, toon(spec.broth), 0, 0.05, 0, 18);
  const n1 = new THREE.Mesh(new THREE.TorusGeometry(0.038, 0.007, 5, 12), toon(P.noodle));
  n1.rotation.x = Math.PI / 2;
  n1.position.y = 0.056;
  root.add(n1);
  const n2 = new THREE.Mesh(new THREE.TorusGeometry(0.026, 0.006, 5, 10), toon(P.noodleD));
  n2.rotation.x = Math.PI / 2;
  n2.rotation.z = 0.8;
  n2.position.y = 0.064;
  root.add(n2);
  if (spec.nori) {
    const nori = addBox(root, 0.008, 0.045, 0.032, toon(P.nori), -0.04, 0.07, 0.0);
    nori.rotation.z = -0.35;
  }
  if (spec.egg) {
    const egg = new THREE.Mesh(new THREE.SphereGeometry(0.016, 10, 8), toon(P.egg));
    egg.scale.y = 0.62;
    egg.position.set(0.032, 0.06, 0.01);
    root.add(egg);
    const yolk = new THREE.Mesh(new THREE.SphereGeometry(0.008, 8, 6), toon(P.yolk));
    yolk.position.set(0.034, 0.068, 0.012);
    root.add(yolk);
  }
  if (spec.pork) {
    const s1 = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.007, 12), toon(P.pork));
    s1.position.set(0.012, 0.062, -0.028);
    root.add(s1);
    const s2 = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.006, 12), toon(P.porkD));
    s2.position.set(-0.012, 0.066, -0.012);
    root.add(s2);
  }
  if (spec.negi) {
    for (let i = 0; i < 3; i++) {
      addBox(root, 0.016, 0.005, 0.008, toon(P.negi), -0.01 + i * 0.012, 0.066, 0.03);
    }
  }
  if (spec.corn) {
    for (let i = 0; i < 4; i++) {
      const c = new THREE.Mesh(new THREE.SphereGeometry(0.005, 6, 5), toon(P.corn));
      c.position.set(-0.02 + (i % 2) * 0.014, 0.064, 0.02 + Math.floor(i / 2) * 0.01);
      root.add(c);
    }
  }
  if (spec.chili) {
    const oil = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.004, 4, 16), toon(P.chili));
    oil.rotation.x = Math.PI / 2;
    oil.position.y = 0.058;
    root.add(oil);
  }
  root.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  g.add(root);
  if (spec.steam) bowlSteam(g, x, y + 0.08, z, spec.yaw || 0.2);
}

function yunomi(g, x, y, z) {
  addCyl(g, 0.028, 0.022, 0.046, toon(P.white), x, y + 0.023, z, 12);
  addCyl(g, 0.024, 0.018, 0.01, toon(P.tea), x, y + 0.032, z, 10);
}

function chopsticks(g, x, y, z, yaw) {
  const root = new THREE.Group();
  root.position.set(x, y, z);
  root.rotation.y = yaw;
  for (const o of [-0.006, 0.006]) {
    const c = new THREE.Mesh(new THREE.CylinderGeometry(0.0022, 0.0022, 0.2, 4), toon('#f0e2c4'));
    c.rotation.z = Math.PI / 2;
    c.rotation.y = 0.15;
    c.position.set(0, 0.008, o);
    root.add(c);
  }
  addBox(root, 0.04, 0.008, 0.012, toon(P.hinokiD), -0.02, 0.004, 0);
  g.add(root);
}

function bottle(g, x, y, z, h, color, cap) {
  addCyl(g, 0.026, 0.03, h * 0.72, toon(color), x, y + h * 0.36, z, 10);
  addCyl(g, 0.012, 0.02, h * 0.28, toon(color), x, y + h * 0.78, z, 8);
  addCyl(g, 0.016, 0.016, 0.018, toon(cap), x, y + h * 0.96, z, 8);
}

function bowlStack(g, x, y, z, n, yaw = 0) {
  for (let i = 0; i < n; i++) {
    const m = addCyl(g, 0.072, 0.058, 0.016, toon(i % 2 ? P.bowl : P.bowlD), x, y + 0.01 + i * 0.015, z, 12);
    m.rotation.y = yaw + i * 0.2;
  }
}

function chochin(g, x, y, z, r, paper, glow, ceilY) {
  const root = new THREE.Group();
  root.position.set(x, y, z);
  const body = new THREE.Mesh(
    new THREE.SphereGeometry(r, 16, 12),
    toon(paper, { emissive: glow, emissiveIntensity: 0.72 }),
  );
  body.scale.set(1, 1.22, 1);
  root.add(body);
  addCyl(root, r * 0.42, r * 0.34, 0.028, toon(P.beam), 0, r * 1.18, 0, 10);
  addCyl(root, r * 0.36, r * 0.42, 0.028, toon(P.beam), 0, -r * 1.12, 0, 10);
  addCyl(root, r + 0.006, r + 0.006, 0.012, toon(P.noren), 0, r * 0.15, 0, 14);
  addCyl(root, 0.006, 0.003, r * 0.55, toon(P.noren), 0, -r * 1.45, 0, 4);
  const cordLen = Math.max(0.05, ceilY - y - r * 1.2);
  addCyl(root, 0.005, 0.005, cordLen, toon('#241810'), 0, r * 1.2 + cordLen / 2, 0, 4);
  root.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  g.add(root);
}

function ladle(g, x, y, z) {
  const cup = new THREE.Mesh(
    new THREE.SphereGeometry(0.032, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.5),
    toon('#8e969c'),
  );
  cup.rotation.x = Math.PI;
  cup.position.set(x, y, z);
  g.add(cup);
  const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.22, 6), toon('#6a7278'));
  handle.position.set(x, y + 0.12, z);
  g.add(handle);
}

function ticket(g, x, y, z) {
  plane(g, 0.08, 0.11, toon('#f4ead4'), x, y, z);
  addBox(g, 0.05, 0.005, 0.004, toon('#2a211c'), x, y + 0.025, z + 0.004);
  addBox(g, 0.042, 0.005, 0.004, toon('#5c4030'), x, y, z + 0.004);
  addBox(g, 0.034, 0.005, 0.004, toon('#2a211c'), x, y - 0.025, z + 0.004);
}

function makeProcedural(layout) {
  const g = new THREE.Group();
  g.name = 'procedural';
  const { width: W, depth: D, height: H } = layout.meta.room;
  const c = layout.anchors.counter;
  const prep = layout.anchors.prep;
  const door = layout.anchors.entrance;
  const len = c.x1 - c.x0;
  const cx = (c.x0 + c.x1) / 2;
  const wood = toon(P.hinoki);
  const woodD = toon(P.hinokiD);
  const woodS = toon(P.hinokiS);
  const steel = toon(P.steel);
  const steelD = toon(P.steelD);
  const beam = toon(P.beam);

  const slabT = 0.055;
  const slabY = c.top - slabT / 2;
  addBox(g, len, slabT, c.depth, wood, cx, slabY, c.z);
  addBox(g, len, 0.02, 0.028, woodD, cx, c.top - 0.012, c.z + c.depth / 2 - 0.014);
  addBox(g, len - 0.08, 0.012, 0.018, toon(P.noren), cx, c.top + 0.004, c.z + c.depth / 2 - 0.05);
  const apronZ = c.z + c.depth / 2 - 0.18;
  addBox(g, len - 0.2, 0.22, 0.035, woodD, cx, c.top - 0.18, apronZ);
  const legZs = [c.z - c.depth / 2 + 0.1, c.z + c.depth / 2 - 0.28];
  for (let i = 0; i < 5; i++) {
    const x = c.x0 + 0.22 + (len - 0.44) * (i / 4);
    for (const zz of legZs) addBox(g, 0.065, c.top - slabT, 0.065, woodS, x, (c.top - slabT) / 2, zz);
  }
  const railZ = c.z + c.depth / 2 - 0.24;
  addCylX(g, 0.018, len - 0.36, toon('#8d9398'), cx, 0.26, railZ);
  for (let i = 0; i < 4; i++) {
    const x = c.x0 + 0.4 + i * ((len - 0.8) / 3);
    addCyl(g, 0.012, 0.012, 0.26, toon('#8d9398'), x, 0.13, railZ, 8);
  }

  const passTop = c.top + 0.1;
  const passZ = -1.22;
  const passD = 0.32;
  const passCx = -0.12;
  const passLen = 3.9;
  addBox(g, passLen, 0.1, passD, woodD, passCx, c.top + 0.05, passZ);
  addBox(g, passLen, 0.1, 0.014, woodS, passCx, c.top + 0.05, passZ + passD / 2);
  addBox(g, passLen + 0.02, 0.018, 0.028, wood, passCx, passTop - 0.008, passZ + passD / 2 + 0.006);
  addBox(g, passLen - 0.16, 0.016, passD - 0.05, steel, passCx, passTop + 0.006, passZ - 0.01);
  const potY = passTop + 0.014;
  const potZ = passZ - 0.01;
  for (const bx of [-1.32, -0.7, -0.12]) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.007, 6, 16), toon('#2a2e32'));
    ring.rotation.x = Math.PI / 2;
    ring.position.set(bx, potY + 0.004, potZ);
    g.add(ring);
  }
  stockPot(g, -1.32, potY, potZ, 0.14, 0.24);
  stockPot(g, -0.7, potY, potZ + 0.01, 0.12, 0.2);
  stockPot(g, -0.12, potY, potZ - 0.01, 0.09, 0.15);
  noodleBasket(g, -1.3, potY + 0.25, potZ + 0.05, 0.085);
  noodleBasket(g, -0.68, potY + 0.21, potZ + 0.05, 0.07);

  const boardY = passTop + 0.02;
  addBox(g, 0.38, 0.016, 0.22, toon('#d8b072'), 0.58, boardY, passZ);
  for (let i = 0; i < 4; i++) addBox(g, 0.012, 0.008, 0.08, toon(P.negi), 0.48 + i * 0.032, boardY + 0.014, passZ + 0.02);
  const slice = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.008, 12), toon(P.pork));
  slice.position.set(0.68, boardY + 0.016, passZ - 0.04);
  g.add(slice);
  addBox(g, 0.15, 0.006, 0.014, toon('#e4e8ea'), 0.46, boardY + 0.012, passZ - 0.05);

  addBox(g, 0.34, 0.012, 0.1, steelD, 1.12, passTop + 0.008, passZ + 0.02);
  for (const [lx, lz] of [[1.02, passZ + 0.01], [1.14, passZ + 0.04], [1.26, passZ]]) {
    const cup = new THREE.Mesh(new THREE.SphereGeometry(0.026, 8, 6, 0, Math.PI * 2, 0, Math.PI * 0.55), toon('#d0d7dc'));
    cup.rotation.z = Math.PI / 2;
    cup.position.set(lx, passTop + 0.03, lz);
    g.add(cup);
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.0045, 0.0045, 0.2, 5), toon('#8e969c'));
    handle.rotation.z = Math.PI / 2;
    handle.position.set(lx + 0.1, passTop + 0.026, lz);
    g.add(handle);
  }

  addBox(g, 0.16, 0.06, 0.12, steelD, 1.62, passTop + 0.02, passZ);
  const faucet = new THREE.Mesh(new THREE.TorusGeometry(0.055, 0.009, 6, 10, Math.PI), toon(P.steel));
  faucet.rotation.z = Math.PI;
  faucet.position.set(1.62, passTop + 0.12, passZ - 0.02);
  g.add(faucet);
  addCyl(g, 0.011, 0.011, 0.1, steel, 1.56, passTop + 0.07, passZ - 0.02, 8);
  const steelX = -0.72;
  const steelZ = potZ;

  const prepLen = prep.x1 - prep.x0;
  const prepCx = (prep.x0 + prep.x1) / 2;
  addBox(g, prepLen, 0.05, prep.depth, woodD, prepCx, prep.top - 0.025, prep.z);
  addBox(g, prepLen, prep.top - 0.08, 0.04, woodS, prepCx, (prep.top - 0.08) / 2, prep.z - prep.depth / 2 + 0.04);
  addBox(g, prepLen - 0.08, 0.03, prep.depth - 0.06, wood, prepCx, 0.42, prep.z);
  bowlStack(g, -1.15, prep.top, prep.z, 6, 0.2);
  bowlStack(g, -0.15, prep.top, prep.z + 0.02, 4, -0.3);
  bowlStack(g, 0.55, 0.45, prep.z, 8, 0.4);
  bowlStack(g, 1.15, 0.45, prep.z - 0.02, 5, 0.1);
  bottle(g, 0.85, prep.top, prep.z + 0.04, 0.2, P.soy, '#111');
  bottle(g, 1.05, prep.top, prep.z - 0.02, 0.16, '#6a2a22', '#c4a15a');
  bottle(g, 1.22, prep.top, prep.z + 0.02, 0.18, '#e8d7a8', '#888');

  addBox(g, 0.62, 1.28, 0.46, steelD, -2.95, 0.64, -2.28);
  addBox(g, 0.5, 0.9, 0.02, toon('#c5ccd1'), -2.95, 0.7, -2.04);
  addBox(g, 0.04, 0.16, 0.02, toon('#2a2e32'), -2.78, 0.7, -2.03);
  addBox(g, 0.66, 1.05, 0.42, woodS, 2.5, 0.525, -2.22);
  addBox(g, 0.5, 0.72, 0.02, woodD, 2.5, 0.58, -2.0);
  addBox(g, 0.012, 0.72, 0.016, beam, 2.5, 0.58, -1.988);
  addBox(g, 0.16, 0.02, 0.02, toon('#d9dde0'), 2.62, 0.62, -1.986);
  for (const y of [0.38, 0.7]) addBox(g, 0.58, 0.025, 0.34, woodD, 2.5, y, -2.2);
  bowlStack(g, 2.38, 1.05, -2.2, 6, 0.3);
  bowlStack(g, 2.62, 0.73, -2.18, 4, -0.2);

  const hoodY = 2.12;
  addBox(g, 2.5, 0.22, 0.5, toon('#2a3034'), steelX, hoodY, steelZ);
  addBox(g, 2.62, 0.035, 0.58, toon('#3c444a'), steelX, hoodY - 0.12, steelZ);
  addBox(g, 1.7, 0.018, 0.08, toon(P.paper, { emissive: P.glow, emissiveIntensity: 0.85 }), steelX, hoodY - 0.15, steelZ + 0.08);
  addBox(g, 0.28, 0.42, 0.22, steelD, steelX + 0.4, hoodY + 0.32, steelZ);
  for (const x of [-1.15, -0.72, -0.28]) ladle(g, x, hoodY - 0.32, steelZ + 0.2);
  addCylX(g, 0.008, 1.05, beam, -0.55, 1.58, -0.9);
  for (const x of [-0.9, -0.55, -0.2]) ticket(g, x, 1.48, -0.88);

  ramenBowl(g, -1.82, c.top, -0.78, { broth: '#a56b32', nori: true, pork: true, negi: true, steam: true, yaw: 0.3 });
  ramenBowl(g, -0.95, c.top, -0.82, { broth: '#c4924a', egg: true, corn: true, negi: true, steam: true, yaw: -0.4 });
  ramenBowl(g, 0.78, c.top, -0.76, { broth: '#a33a28', egg: true, chili: true, pork: true, steam: true, yaw: 0.6 });
  ramenBowl(g, 0.22, passTop, passZ + 0.04, { broth: '#c9843c', nori: true, negi: true, yaw: 0.8 });
  yunomi(g, -1.62, c.top, -0.7);
  yunomi(g, 0.98, c.top, -0.68);
  chopsticks(g, -1.55, c.top, -0.7, 0.5);
  chopsticks(g, -0.7, c.top, -0.72, -0.2);
  chopsticks(g, 1.05, c.top, -0.7, 0.4);
  addBox(g, 0.22, 0.008, 0.16, toon('#e7c98a'), -0.08, c.top + 0.004, -0.78);
  const renge = new THREE.Mesh(new THREE.SphereGeometry(0.02, 8, 6, 0, Math.PI * 2, 0, Math.PI * 0.5), toon('#f4f1ea'));
  renge.position.set(-0.15, c.top + 0.012, -0.86);
  g.add(renge);

  bottle(g, 1.52, c.top, -0.66, 0.14, P.soy, '#111');
  addCyl(g, 0.04, 0.034, 0.02, toon(P.white), 1.48, c.top + 0.012, -0.7, 12);
  for (let i = 0; i < 3; i++) {
    const clove = new THREE.Mesh(new THREE.SphereGeometry(0.008, 6, 5), toon('#f3efe4'));
    clove.position.set(1.46 + (i - 1) * 0.012, c.top + 0.026, -0.7);
    g.add(clove);
  }
  addBox(g, 0.09, 0.032, 0.055, toon('#f3efe4'), 2.05, c.top + 0.018, -0.84);

  const sh = layout.assets.wall_shelf.targetHeight;
  const upper = sh * layout.anchors.shelfFraction.upper;
  const shelfL = layout.instances.find((i) => i.id === 'shelf_l');
  const shelfC = layout.instances.find((i) => i.id === 'shelf_c');
  const shelfR = layout.instances.find((i) => i.id === 'shelf_r');
  bottle(g, shelfL.position[0] - 0.1, shelfL.position[1] + upper, shelfL.position[2], 0.12, P.soy, '#222');
  bottle(g, shelfL.position[0] + 0.12, shelfL.position[1] + upper, shelfL.position[2], 0.1, '#d8c090', '#666');
  bowlStack(g, shelfC.position[0] - 0.08, shelfC.position[1] + upper, shelfC.position[2], 5, 0.2);
  bowlStack(g, shelfR.position[0] + 0.05, shelfR.position[1] + upper, shelfR.position[2], 4, -0.1);

  chochin(g, -2.42, 1.78, 1.42, 0.16, '#e23b2e', '#ff7a3a', 2.52);
  chochin(g, -1.6, 1.95, -0.7, 0.14, P.paper, P.glow, H - 0.16);
  chochin(g, -0.45, 2.02, -0.58, 0.1, '#f0a090', '#ff8a4a', H - 0.16);
  for (const inst of layout.instances) {
    if (inst.kind !== 'pendant_lamp') continue;
    const h = layout.assets.pendant_lamp.targetHeight;
    const [x, y, z] = inst.position;
    const gap = (H - 0.16) - (y + h);
    if (gap > 0.02) addCyl(g, 0.005, 0.005, gap, toon('#241810'), x, y + h + gap / 2, z, 4);
  }

  const postH = 2.52;
  for (const x of [door.x0, door.x1]) {
    const post = addBox(g, 0.1, postH, 0.1, beam, x, postH / 2, door.z);
    post.userData.noShadow = true;
  }
  const header = addBox(g, door.x1 - door.x0 + 0.12, 0.1, 0.1, beam, (door.x0 + door.x1) / 2, 2.58, door.z);
  header.userData.noShadow = true;
  const rod = addCylX(g, 0.018, door.x1 - door.x0 - 0.05, beam, (door.x0 + door.x1) / 2, door.rodY, door.z);
  rod.userData.noShadow = true;
  const norenMats = [
    toon('#ffffff', { map: norenTexture('plain'), side: THREE.DoubleSide }),
    toon('#ffffff', { map: norenTexture('deep'), side: THREE.DoubleSide }),
    toon('#ffffff', { map: norenTexture('mark'), side: THREE.DoubleSide }),
    toon('#ffffff', { map: norenTexture('plain'), side: THREE.DoubleSide }),
    toon('#ffffff', { map: norenTexture('deep'), side: THREE.DoubleSide }),
  ];
  const span = door.x1 - door.x0 - 0.16;
  for (let i = 0; i < 5; i++) {
    const panel = plane(g, span / 5 - 0.03, 1.12, norenMats[i], door.x0 + 0.16 + (i + 0.5) * (span / 5), door.rodY - 0.58, door.z + 0.02);
    panel.userData.noren = { i };
    panel.userData.noShadow = true;
    panel.rotation.z = (i - 2) * 0.01;
  }
  const sign = plane(
    g,
    1.15,
    0.32,
    toon('#ffffff', { map: signTexture() }),
    (door.x0 + door.x1) / 2,
    door.rodY + 0.28,
    door.z + 0.08,
  );
  sign.userData.noShadow = true;
  const signBoard = addBox(g, 1.22, 0.34, 0.04, woodD, (door.x0 + door.x1) / 2, door.rodY + 0.28, door.z + 0.05);
  signBoard.userData.noShadow = true;

  const lattice = new THREE.Group();
  const lw = 1.2;
  const lh = 0.95;
  addBox(lattice, lw, lh, 0.02, toon(P.amber, { emissive: '#e8b56a', emissiveIntensity: 0.08 }), 0, 0, -0.03);
  addBox(lattice, lw + 0.08, 0.05, 0.05, woodD, 0, lh / 2, 0);
  addBox(lattice, lw + 0.08, 0.05, 0.05, woodD, 0, -lh / 2, 0);
  addBox(lattice, 0.05, lh, 0.05, woodD, -lw / 2, 0, 0);
  addBox(lattice, 0.05, lh, 0.05, woodD, lw / 2, 0, 0);
  for (let i = 1; i < 5; i++) addBox(lattice, 0.018, lh - 0.06, 0.03, woodS, -lw / 2 + (lw * i) / 5, 0, 0.015);
  for (let j = 1; j < 4; j++) addBox(lattice, lw - 0.06, 0.018, 0.03, woodS, 0, -lh / 2 + (lh * j) / 4, 0.015);
  lattice.position.set(-W / 2 + 0.16, 1.58, 0.55);
  lattice.rotation.y = Math.PI / 2;
  lattice.traverse((o) => {
    if (o.isMesh) o.userData.noShadow = true;
  });
  g.add(lattice);

  const menu = new THREE.Group();
  addBox(menu, 0.62, 1.05, 0.04, woodD, 0, 0, 0);
  const menuCard = plane(menu, 0.54, 0.92, toon('#ffffff', { map: menuTexture() }), 0, 0, 0.03);
  menuCard.position.z = 0.025;
  menu.position.set(-W / 2 + 0.14, 1.5, -1.55);
  menu.rotation.y = Math.PI / 2;
  g.add(menu);

  const scroll = new THREE.Group();
  addBox(scroll, 0.42, 0.06, 0.04, beam, 0, 0.36, 0);
  addBox(scroll, 0.42, 0.06, 0.04, beam, 0, -0.36, 0);
  plane(scroll, 0.36, 0.66, toon('#ffffff', { map: scrollTexture() }), 0, 0, 0.02);
  scroll.position.set(-0.95, 1.95, -D / 2 + 0.16);
  g.add(scroll);

  const plant = layout.instances.find((i) => i.id === 'plant_window');
  const ph = layout.assets.flowerpot.targetHeight;
  const px = plant.position[0];
  const pz = plant.position[2];
  addCyl(g, 0.02, 0.025, 0.16, toon('#3d5a32'), px, ph + 0.04, pz, 6);
  const leafMat = toon('#2f6b3c');
  const leafMat2 = toon('#1e4a2c');
  for (const [dx, dy, dz, s, mat] of [
    [0, 0.18, 0, 0.16, leafMat],
    [0.1, 0.22, -0.04, 0.12, leafMat2],
    [-0.08, 0.2, 0.06, 0.11, leafMat],
    [0.02, 0.28, 0.02, 0.09, leafMat2],
  ]) {
    const leaf = new THREE.Mesh(new THREE.SphereGeometry(s, 8, 6), mat);
    leaf.position.set(px + dx, ph + dy, pz + dz);
    leaf.scale.y = 0.75;
    g.add(leaf);
  }

  addContact(g, cx, c.z, len * 0.48, c.depth * 0.62);
  addContact(g, prepCx, prep.z, prepLen * 0.48, prep.depth * 0.7);
  for (const inst of layout.instances) {
    if (inst.kind === 'bar_stool') addContact(g, inst.position[0], inst.position[2], 0.3, 0.28);
    if (inst.kind === 'flowerpot') addContact(g, inst.position[0], inst.position[2], 0.2, 0.2);
  }
  addContact(g, -1.22, steelZ, 0.22, 0.2, 0.022);
  addContact(g, -0.58, steelZ, 0.2, 0.18, 0.022);

  return g;
}

function onFrame(t, { scene }) {
  scene.traverse((o) => {
    if (o.userData.steam) {
      const st = o.userData.steam;
      const p = (t * 0.2 + st.phase) % 1;
      const sway = Math.sin(t * 0.65 + st.phase * 6) * 0.01;
      o.position.set(sway, p * st.rise, Math.cos(t * 0.45 + st.phase) * 0.008);
      o.scale.set(0.8, 0.5 + p * 1.45, 1);
      o.rotation.y = st.baseRot + Math.sin(t * 0.35 + st.phase) * 0.25;
      if (o.material) o.material.opacity = 0.15 * (1 - p);
    }
    if (o.userData.noren) {
      const i = o.userData.noren.i;
      o.rotation.x = Math.sin(t * 0.45 + i * 0.7) * 0.018;
    }
  });
}

boot({
  makeShell,
  makeProcedural,
  onFrame,
  readyText: 'ready — ramen bar · stools face the pots · T toon · U unlit',
});
