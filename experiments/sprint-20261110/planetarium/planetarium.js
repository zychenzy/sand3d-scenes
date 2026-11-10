import * as THREE from 'three';
import { boot, toon, addBox, addCyl, fillBooks } from './scene_lib.js';
import { DOME, RINGS, STEPS, expandSeats } from './seating.mjs';

if (new URLSearchParams(location.search).get('hud') === '0') {
  const hud = document.getElementById('hud');
  if (hud) hud.style.display = 'none';
}

const BRASS = '#c6a15e';
const PLASTER = '#d7cec2';
const NAVY = '#141a2c';
const INK = '#2a3144';
const WOOD = '#4a382c';

function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function domePoint(theta, phi, radius) {
  return new THREE.Vector3(
    DOME.cx - radius * Math.cos(phi) * Math.sin(theta),
    radius * Math.cos(theta),
    DOME.cz + radius * Math.sin(phi) * Math.sin(theta),
  );
}

function placeBoxAlong(g, length, thick, mat, pos, tangent) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(thick, length, thick), mat);
  m.position.copy(pos);
  const dir = tangent.clone();
  if (dir.lengthSq() < 1e-8) dir.set(0, 1, 0);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
  m.castShadow = true;
  m.receiveShadow = true;
  g.add(m);
  return m;
}

function addSphere(g, r, mat, x, y, z, seg = 18) {
  const m = new THREE.Mesh(
    new THREE.SphereGeometry(r, seg, Math.max(8, Math.round(seg * 0.6))),
    mat,
  );
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  g.add(m);
  return m;
}

function canvasTex(canvas) {
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function addMeridian(g, phi, radius, mat, thick, segs = 14) {
  for (let i = 0; i < segs; i++) {
    const t0 = (i / segs) * (Math.PI / 2);
    const t1 = ((i + 1) / segs) * (Math.PI / 2);
    const tm = (t0 + t1) / 2;
    const p = domePoint(tm, phi, radius);
    const tangent = new THREE.Vector3(
      -radius * Math.cos(phi) * Math.cos(tm),
      -radius * Math.sin(tm),
      radius * Math.sin(phi) * Math.cos(tm),
    );
    placeBoxAlong(g, radius * (t1 - t0) * 1.05, thick, mat, p, tangent);
  }
}

function addLatitude(g, theta, radius, phi0, phi1, mat, thick, segs = 24) {
  const s = Math.sin(theta);
  if (s < 0.08) return;
  for (let i = 0; i < segs; i++) {
    const a0 = phi0 + ((phi1 - phi0) * i) / segs;
    const a1 = phi0 + ((phi1 - phi0) * (i + 1)) / segs;
    const am = (a0 + a1) / 2;
    const p = domePoint(theta, am, radius);
    const tangent = new THREE.Vector3(radius * Math.sin(am) * s, 0, radius * Math.cos(am) * s);
    placeBoxAlong(g, radius * s * Math.abs(a1 - a0) * 1.05, thick, mat, p, tangent);
  }
}

function makeFloorTexture(W, D) {
  const cw = 1024;
  const ch = Math.round((cw * D) / W);
  const canvas = document.createElement('canvas');
  canvas.width = cw;
  canvas.height = ch;
  const ctx = canvas.getContext('2d');
  const toPx = (x, z) => [((x + W / 2) / W) * cw, ((z + D / 2) / D) * ch];

  ctx.fillStyle = '#b7aa98';
  ctx.fillRect(0, 0, cw, ch);
  ctx.strokeStyle = 'rgba(90, 78, 66, 0.28)';
  ctx.lineWidth = 2;
  for (let x = -W / 2; x <= W / 2; x += 1.2) {
    const [px] = toPx(x, 0);
    ctx.beginPath();
    ctx.moveTo(px, 0);
    ctx.lineTo(px, ch);
    ctx.stroke();
  }
  for (let z = -D / 2; z <= D / 2; z += 1.2) {
    const [, py] = toPx(0, z);
    ctx.beginPath();
    ctx.moveTo(0, py);
    ctx.lineTo(cw, py);
    ctx.stroke();
  }

  const [ccx, ccy] = toPx(DOME.cx, DOME.cz);
  const [erx] = toPx(DOME.cx + DOME.R - 0.15, DOME.cz);
  ctx.fillStyle = '#1c2436';
  ctx.beginPath();
  ctx.arc(ccx, ccy, Math.abs(erx - ccx), 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#3d4a66';
  ctx.beginPath();
  const walk = (r, phi0, phi1) => {
    const steps = 28;
    for (let i = 0; i <= steps; i++) {
      const phi = phi0 + ((phi1 - phi0) * i) / steps;
      const [px, py] = toPx(DOME.cx - r * Math.cos(phi), DOME.cz + r * Math.sin(phi));
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
  };
  walk(2.9, DOME.phiStart, DOME.phiStart + DOME.phiLength);
  walk(2.32, DOME.phiStart + DOME.phiLength, DOME.phiStart);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#c4b49a';
  ctx.beginPath();
  const aisle = [
    [DOME.cx - 0.48, DOME.cz + 1.15],
    [DOME.cx + 0.48, DOME.cz + 1.15],
    [DOME.cx + 0.48, D / 2 - 0.35],
    [DOME.cx - 0.48, D / 2 - 0.35],
  ];
  aisle.forEach(([x, z], i) => {
    const [px, py] = toPx(x, z);
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  });
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#8a7358';
  ctx.lineWidth = 5;
  ctx.stroke();

  ctx.fillStyle = '#4a5874';
  ctx.beginPath();
  const spoke0 = -1.28;
  const spoke1 = -0.96;
  const spokePts = [];
  for (const r of [1.55, 4.05]) {
    spokePts.push([DOME.cx - r * Math.cos(spoke0), DOME.cz + r * Math.sin(spoke0)]);
  }
  for (const r of [4.05, 1.55]) {
    spokePts.push([DOME.cx - r * Math.cos(spoke1), DOME.cz + r * Math.sin(spoke1)]);
  }
  spokePts.forEach(([x, z], i) => {
    const [px, py] = toPx(x, z);
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  });
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = '#c6a15e';
  ctx.lineWidth = 3;
  for (const r of [0.78, DOME.R - 0.2]) {
    const [px, py] = toPx(DOME.cx, DOME.cz);
    const [ex] = toPx(DOME.cx + r, DOME.cz);
    ctx.beginPath();
    ctx.arc(px, py, Math.abs(ex - px), 0, Math.PI * 2);
    ctx.stroke();
  }

  return canvasTex(canvas);
}

function addRingStep(g, spec, mat) {
  const shape = new THREE.Shape();
  const segs = 18;
  const pt = (r, phi) => new THREE.Vector2(
    DOME.cx - r * Math.cos(phi),
    -(DOME.cz + r * Math.sin(phi)),
  );
  const outer = [];
  const inner = [];
  for (let i = 0; i <= segs; i++) {
    const phi = spec.phi0 + ((spec.phi1 - spec.phi0) * i) / segs;
    outer.push(pt(spec.r1, phi));
    inner.push(pt(spec.r0, phi));
  }
  shape.moveTo(outer[0].x, outer[0].y);
  for (let i = 1; i < outer.length; i++) shape.lineTo(outer[i].x, outer[i].y);
  for (let i = inner.length - 1; i >= 0; i--) shape.lineTo(inner[i].x, inner[i].y);
  shape.closePath();
  const geo = new THREE.ExtrudeGeometry(shape, { depth: 0.14, bevelEnabled: false });
  geo.rotateX(-Math.PI / 2);
  const mesh = new THREE.Mesh(geo, mat);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  g.add(mesh);
  return mesh;
}

function makeShell(layout) {
  const g = new THREE.Group();
  g.name = 'shell';
  const { width: W, depth: D, height: H } = layout.meta.room;
  const s = layout.shell;
  const plaster = toon(s.wallColor || PLASTER);
  const brass = toon(s.accentColor || BRASS);
  const wood = toon(s.woodColor || WOOD);
  const ceilMat = toon(s.ceilingColor || '#efe4d4');
  const ink = toon(INK);

  const slab = new THREE.Mesh(new THREE.BoxGeometry(W, 0.08, D), toon(s.floorColor || '#6e675e'));
  slab.position.y = -0.04;
  slab.receiveShadow = true;
  g.add(slab);

  const floor = new THREE.Mesh(new THREE.PlaneGeometry(W, D), toon('#ffffff', { map: makeFloorTexture(W, D) }));
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = 0.004;
  floor.receiveShadow = true;
  g.add(floor);

  const back = new THREE.Mesh(new THREE.BoxGeometry(W, H, 0.14), plaster);
  back.position.set(0, H / 2, -D / 2);
  back.receiveShadow = true;
  back.castShadow = true;
  g.add(back);
  const left = new THREE.Mesh(new THREE.BoxGeometry(0.14, H, D), plaster);
  left.position.set(-W / 2, H / 2, 0);
  left.receiveShadow = true;
  left.castShadow = true;
  g.add(left);

  addBox(g, W - 0.2, 0.08, 0.08, brass, 0, 0.08, -D / 2 + 0.1);
  addBox(g, 0.08, 0.08, D - 0.2, brass, -W / 2 + 0.1, 0.08, 0);
  addBox(g, W - 0.3, 0.06, 0.08, wood, 0, 1.05, -D / 2 + 0.12);
  addBox(g, 0.07, 0.92, 3.3, wood, -W / 2 + 0.1, 0.46, 4.35);
  addBox(g, W * 0.55, 0.05, 0.06, brass, -0.4, H - 0.35, -D / 2 + 0.12);

  const soffit = addBox(g, 7.55, 0.12, 2.28, ceilMat, -1.6, 3.2, 4.36);
  soffit.castShadow = true;
  addBox(g, 7.55, 0.04, 0.06, brass, -1.6, 3.12, 3.25);
  addBox(g, 0.06, 0.16, 2.28, ink, 2.14, 3.2, 4.36);
  addBox(g, 6.6, 0.025, 0.04, brass, -1.5, 3.13, 4.15);
  addBox(g, 6.6, 0.025, 0.04, brass, -1.5, 3.13, 5.05);

  const phi0 = DOME.phiStart;
  const phi1 = DOME.phiStart + DOME.phiLength;
  const innerMat = toon(NAVY, { side: THREE.BackSide });
  const outerMat = toon('#343c50');
  const inner = new THREE.Mesh(new THREE.SphereGeometry(DOME.R - 0.02, 56, 28, phi0, phi1 - phi0, 0, Math.PI / 2), innerMat);
  inner.position.set(DOME.cx, 0, DOME.cz);
  inner.userData.noCast = true;
  inner.userData.noReceive = true;
  g.add(inner);
  const outer = new THREE.Mesh(new THREE.SphereGeometry(DOME.R + 0.05, 48, 24, phi0, phi1 - phi0, 0, Math.PI / 2), outerMat);
  outer.position.set(DOME.cx, 0, DOME.cz);
  outer.userData.noCast = true;
  outer.userData.noReceive = true;
  g.add(outer);

  const rib = toon(BRASS);
  const ribDim = toon('#a68445');
  addMeridian(g, phi0, DOME.R + 0.01, rib, 0.1, 18);
  addMeridian(g, phi1, DOME.R + 0.01, rib, 0.1, 18);
  for (let i = 1; i <= 3; i++) {
    addMeridian(g, phi0 + ((phi1 - phi0) * i) / 4, DOME.R - 0.16, ribDim, 0.028, 14);
  }
  addLatitude(g, 0.48, DOME.R - 0.16, phi0 + 0.04, phi1 - 0.04, rib, 0.026, 20);
  addLatitude(g, 0.95, DOME.R - 0.16, phi0 + 0.04, phi1 - 0.04, ribDim, 0.022, 24);

  for (const step of STEPS) addRingStep(g, step, toon('#2a313f'));

  const spring = 2.28;
  const span = 0.98;
  addCyl(g, 0.12, 0.15, spring, toon('#ece3d6'), DOME.cx - span, spring / 2, 2.92, 12);
  addCyl(g, 0.12, 0.15, spring, toon('#ece3d6'), DOME.cx + span, spring / 2, 2.92, 12);
  addCyl(g, 0.2, 0.2, 0.08, brass, DOME.cx - span, 0.04, 2.92, 12);
  addCyl(g, 0.2, 0.2, 0.08, brass, DOME.cx + span, 0.04, 2.92, 12);
  addCyl(g, 0.16, 0.16, 0.06, brass, DOME.cx - span, spring, 2.92, 12);
  addCyl(g, 0.16, 0.16, 0.06, brass, DOME.cx + span, spring, 2.92, 12);
  const arch = new THREE.Mesh(new THREE.TorusGeometry(span, 0.07, 8, 28, Math.PI), brass);
  arch.position.set(DOME.cx, spring, 2.92);
  arch.castShadow = true;
  arch.receiveShadow = true;
  g.add(arch);
  const key = addSphere(g, 0.07, toon('#fff1c9', { emissive: '#ffe0a0', emissiveIntensity: 0.85 }), DOME.cx, spring + span - 0.02, 2.92, 12);
  key.userData.noCast = true;

  for (const x of [DOME.cx - span, DOME.cx + span]) {
    const cup = addCyl(g, 0.05, 0.08, 0.06, brass, x, 1.72, 2.92 + 0.12, 8);
    cup.rotation.x = Math.PI / 2;
    const bulb = addSphere(g, 0.035, toon('#fff4d2', { emissive: '#ffd9a0', emissiveIntensity: 0.8 }), x, 1.72, 3.02, 8);
    bulb.userData.noCast = true;
  }

  return g;
}

function addStars(g) {
  const rand = rng(20261110);
  const phi0 = DOME.phiStart + 0.08;
  const phi1 = DOME.phiStart + DOME.phiLength - 0.08;
  const colors = ['#f7f1dd', '#ffe1a8', '#d5e4ff', '#fff8ee', '#f0c8a0'];
  const emiss = ['#fff1c8', '#ffd59a', '#e4eeff', '#fff6e0', '#ffc98a'];
  for (let i = 0; i < 70; i++) {
    const phi = phi0 + rand() * (phi1 - phi0);
    const theta = 0.1 + Math.pow(rand(), 0.85) * 0.92;
    const p = domePoint(theta, phi, DOME.R - 0.18);
    const k = i % colors.length;
    const size = rand() < 0.14 ? 0.042 : 0.016 + rand() * 0.016;
    const star = addSphere(
      g,
      size,
      toon(colors[k], { emissive: emiss[k], emissiveIntensity: 0.95 }),
      p.x,
      p.y,
      p.z,
      8,
    );
    star.userData.noCast = true;
  }
  for (let i = 0; i < 34; i++) {
    const phi = phi0 + (i / 33) * (phi1 - phi0);
    const theta = 0.56 + Math.sin(phi * 2.1) * 0.05 + (rand() - 0.5) * 0.07;
    const p = domePoint(theta, phi, DOME.R - 0.2);
    const star = addSphere(
      g,
      0.01 + rand() * 0.01,
      toon('#efe8ff', { emissive: '#dfe6ff', emissiveIntensity: 0.75 }),
      p.x,
      p.y,
      p.z,
      6,
    );
    star.userData.noCast = true;
  }
  const pole = domePoint(0.08, (phi0 + phi1) / 2, DOME.R - 0.16);
  const north = addSphere(g, 0.055, toon('#fff8e8', { emissive: '#fff1c4', emissiveIntensity: 1.1 }), pole.x, pole.y, pole.z, 10);
  north.userData.noCast = true;
}

function addAisleLights(g) {
  const glow = toon('#ffd7a4', { emissive: '#ffb45e', emissiveIntensity: 0.85 });
  const cup = toon('#5c4a32');
  const spots = [];
  for (let z = DOME.cz + 1.35; z <= 5.35; z += 0.95) {
    spots.push([DOME.cx - 0.62, z], [DOME.cx + 0.62, z]);
  }
  for (const phi of [-2.35, -1.7, -1.12, -0.35, 0.25]) {
    const r = 2.58;
    spots.push([DOME.cx - r * Math.cos(phi), DOME.cz + r * Math.sin(phi)]);
  }
  for (const [x, z] of spots) {
    addCyl(g, 0.055, 0.055, 0.02, cup, x, 0.012, z, 8);
    const bulb = addCyl(g, 0.03, 0.03, 0.018, glow, x, 0.028, z, 8);
    bulb.userData.noCast = true;
  }
}

function addProjector(g) {
  const brass = toon(BRASS);
  const iron = toon('#2c313c');
  const glow = toon('#ffe7b0', { emissive: '#ffd48a', emissiveIntensity: 1.1 });
  const x = DOME.cx;
  const z = DOME.cz;
  addCyl(g, 0.5, 0.56, 0.07, brass, x, 0.035, z, 24);
  addCyl(g, 0.4, 0.44, 0.045, iron, x, 0.085, z, 20);
  addCyl(g, 0.1, 0.13, 0.7, iron, x, 0.46, z, 16);
  addCyl(g, 0.58, 0.58, 0.06, brass, x, 0.9, z, 24);
  addBox(g, 0.05, 0.46, 0.05, brass, x - 0.48, 1.13, z);
  addBox(g, 0.05, 0.46, 0.05, brass, x + 0.48, 1.13, z);
  const axle = addCyl(g, 0.032, 0.032, 1.08, brass, x, 1.28, z, 12);
  axle.rotation.z = Math.PI / 2;
  addSphere(g, 0.2, iron, x - 0.2, 1.28, z, 20);
  addSphere(g, 0.2, iron, x + 0.2, 1.28, z, 20);
  for (const sx of [-0.2, 0.2]) {
    for (let k = 0; k < 7; k++) {
      const a = (k / 7) * Math.PI * 2 + 0.3;
      const b = 0.55 + (k % 3) * 0.4;
      const rr = 0.205;
      const dot = addSphere(
        g,
        0.016,
        glow,
        x + sx + Math.cos(a) * Math.sin(b) * rr,
        1.28 + Math.cos(b) * rr,
        z + Math.sin(a) * Math.sin(b) * rr,
        6,
      );
      dot.userData.noCast = true;
    }
  }
  const core = addSphere(g, 0.08, glow, x, 1.28, z, 12);
  core.userData.noCast = true;
  const nose = addCyl(g, 0.045, 0.065, 0.2, brass, x, 1.28, z + 0.28, 12);
  nose.rotation.x = Math.PI / 2;
  const tail = addCyl(g, 0.035, 0.05, 0.14, iron, x, 1.28, z - 0.24, 10);
  tail.rotation.x = Math.PI / 2;
}

function planetTex(paint) {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 128;
  paint(canvas.getContext('2d'));
  return canvasTex(canvas);
}

function addPlanets(g, layout) {
  const jupiterMap = planetTex((ctx) => {
    const bands = ['#c4a27a', '#f0e2c8', '#a87848', '#e6d2b0', '#8d5a38', '#f7efe0', '#b88858', '#d8b48a'];
    bands.forEach((col, i) => {
      ctx.fillStyle = col;
      ctx.fillRect(0, (i * 128) / bands.length, 256, 128 / bands.length + 1);
    });
    ctx.fillStyle = '#a85038';
    ctx.beginPath();
    ctx.ellipse(168, 74, 18, 10, 0.2, 0, Math.PI * 2);
    ctx.fill();
  });
  const earthMap = planetTex((ctx) => {
    ctx.fillStyle = '#2d6ea8';
    ctx.fillRect(0, 0, 256, 128);
    ctx.fillStyle = '#3e8a48';
    for (const [x, y, rx, ry] of [[48, 46, 30, 16], [78, 58, 12, 9], [150, 62, 34, 16], [196, 44, 14, 10], [118, 90, 20, 11]]) {
      ctx.beginPath();
      ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = '#f3f7fb';
    ctx.fillRect(0, 0, 256, 12);
    ctx.fillRect(0, 116, 256, 12);
  });
  const saturnMap = planetTex((ctx) => {
    ctx.fillStyle = '#e7d3a4';
    ctx.fillRect(0, 0, 256, 128);
    ctx.fillStyle = '#c8a56a';
    ctx.fillRect(0, 48, 256, 9);
    ctx.fillRect(0, 78, 256, 6);
    ctx.fillStyle = '#f4e6c4';
    ctx.fillRect(0, 62, 256, 8);
  });

  const byId = Object.fromEntries((layout.instances || []).map((inst) => [inst.id, inst]));
  const saturn = byId.plinth_saturn.position;
  const jupiter = byId.plinth_jupiter.position;
  const orrery = byId.vitrine.position;
  const sY = 1.0 + 0.24;
  const sat = addSphere(g, 0.24, toon('#ffffff', { map: saturnMap }), saturn[0], sY, saturn[2], 24);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.4, 0.018, 6, 40), toon('#f0e0b8'));
  ring.position.set(saturn[0], sY, saturn[2]);
  ring.rotation.x = Math.PI / 2 + 0.55;
  ring.rotation.y = 0.4;
  ring.castShadow = true;
  ring.receiveShadow = true;
  g.add(ring);
  sat.castShadow = true;

  addSphere(g, 0.28, toon('#ffffff', { map: jupiterMap }), jupiter[0], 1.0 + 0.28, jupiter[2], 24);

  const baseY = 0.95;
  const sun = addSphere(g, 0.07, toon('#ffe08a', { emissive: '#ffc56a', emissiveIntensity: 0.9 }), orrery[0], baseY + 0.1, orrery[2], 12);
  sun.userData.noCast = true;
  const orbits = [
    { r: 0.18, planet: 0.035, color: '#c9b8a2', speedPhi: 0.4 },
    { r: 0.3, planet: 0.05, color: '#3d7eb2', speedPhi: 1.7 },
    { r: 0.42, planet: 0.04, color: '#d07a4a', speedPhi: 2.6 },
  ];
  for (const orb of orbits) {
    const hoop = new THREE.Mesh(new THREE.TorusGeometry(orb.r, 0.006, 6, 40), toon('#8d7a58'));
    hoop.position.set(orrery[0], baseY + 0.1, orrery[2]);
    hoop.rotation.x = Math.PI / 2;
    hoop.userData.noCast = true;
    g.add(hoop);
    addSphere(
      g,
      orb.planet,
      toon(orb.color),
      orrery[0] + Math.cos(orb.speedPhi) * orb.r,
      baseY + 0.1,
      orrery[2] + Math.sin(orb.speedPhi) * orb.r,
      10,
    );
  }
}

function addFoyerDressing(g, layout) {
  const byId = Object.fromEntries((layout.instances || []).map((inst) => [inst.id, inst]));
  const wood = toon(WOOD);
  const top = toon('#c4a36e');
  const console = byId.lamp.position;
  addBox(g, 0.46, 0.74, 1.12, wood, -5.18, 0.37, 5.45);
  addBox(g, 0.52, 0.04, 1.2, top, -5.18, 0.76, 5.45);

  const page = toon('#f4efe4');
  const cover = toon('#6a2e3a');
  const book = new THREE.Group();
  const left = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.015, 0.28), page);
  left.position.set(-0.1, 0, 0);
  left.rotation.z = 0.15;
  const right = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.015, 0.28), page);
  right.position.set(0.1, 0, 0);
  right.rotation.z = -0.12;
  book.add(left, right);
  const spine = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.02, 0.28), cover);
  book.add(spine);
  book.position.set(-5.28, 0.775, 5.22);
  book.rotation.y = 0.4;
  g.add(book);

  const rock = new THREE.Mesh(new THREE.IcosahedronGeometry(0.075, 0), toon('#3e3a38'));
  rock.position.set(-4.9, 0.86, 5.72);
  rock.rotation.set(0.5, 0.3, 0.4);
  rock.castShadow = true;
  g.add(rock);

  const lectern = byId.lectern.position;
  const atlas = new THREE.Group();
  const sheet = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.02, 0.24), page);
  sheet.rotation.x = -0.55;
  atlas.add(sheet);
  atlas.position.set(lectern[0], 1.02, lectern[2] + 0.02);
  atlas.rotation.y = 0.9;
  g.add(atlas);

  for (const potId of ['pot_l', 'pot_r']) {
    const p = byId[potId].position;
    const stem = toon('#3e5340');
    const leaf = toon(potId === 'pot_l' ? '#2f6a45' : '#3d7a52');
    addCyl(g, 0.012, 0.016, 0.26, stem, p[0], 0.48, p[2], 6);
    addSphere(g, 0.15, leaf, p[0], 0.7, p[2], 10);
    addSphere(g, 0.1, toon('#4e8a58'), p[0] + 0.08, 0.78, p[2] - 0.04, 8);
  }

  const chartCanvas = document.createElement('canvas');
  chartCanvas.width = 512;
  chartCanvas.height = 512;
  const cctx = chartCanvas.getContext('2d');
  cctx.fillStyle = '#141a2e';
  cctx.fillRect(0, 0, 512, 512);
  cctx.strokeStyle = '#c6a15e';
  cctx.lineWidth = 10;
  cctx.strokeRect(18, 18, 476, 476);
  const rand = rng(11);
  const pts = [];
  for (let i = 0; i < 36; i++) {
    const x = 50 + rand() * 410;
    const y = 50 + rand() * 410;
    pts.push([x, y]);
    cctx.fillStyle = rand() > 0.82 ? '#ffe1a8' : '#f4f0e4';
    cctx.beginPath();
    cctx.arc(x, y, rand() > 0.88 ? 4.5 : 2.2, 0, Math.PI * 2);
    cctx.fill();
  }
  cctx.strokeStyle = 'rgba(198,161,94,0.9)';
  cctx.lineWidth = 2;
  cctx.beginPath();
  for (let i = 0; i < 6; i++) {
    cctx.moveTo(pts[i][0], pts[i][1]);
    cctx.lineTo(pts[i + 1][0], pts[i + 1][1]);
  }
  cctx.moveTo(pts[8][0], pts[8][1]);
  cctx.lineTo(pts[12][0], pts[12][1]);
  cctx.lineTo(pts[15][0], pts[15][1]);
  cctx.stroke();
  const chartMap = canvasTex(chartCanvas);
  addBox(g, 0.04, 1.05, 0.86, toon('#2a241c'), -5.4, 1.7, 2.95);
  const chart = new THREE.Mesh(new THREE.PlaneGeometry(0.78, 0.96), toon('#ffffff', { map: chartMap }));
  chart.position.set(-5.37, 1.7, 2.95);
  chart.rotation.y = Math.PI / 2;
  g.add(chart);

  const phases = [0.05, 0.28, 0.5, 0.74, 1];
  const phaseZ = [3.45, 4.78, 5.12, 5.46, 5.8];
  phases.forEach((phase, i) => {
    const z = phaseZ[i];
    const disc = new THREE.Mesh(new THREE.CircleGeometry(0.09, 22), toon('#f4ecd4'));
    disc.position.set(-5.36, 2.72, z);
    disc.rotation.y = Math.PI / 2;
    g.add(disc);
    if (phase < 0.96) {
      const dark = new THREE.Mesh(new THREE.CircleGeometry(0.086, 22), toon('#222838'));
      dark.position.set(-5.35, 2.72, z + (phase - 0.05) * 0.16);
      dark.rotation.y = Math.PI / 2;
      g.add(dark);
    }
  });

  const signCanvas = document.createElement('canvas');
  signCanvas.width = 640;
  signCanvas.height = 160;
  const sctx = signCanvas.getContext('2d');
  sctx.fillStyle = '#1a2233';
  sctx.fillRect(0, 0, 640, 160);
  sctx.strokeStyle = '#c6a15e';
  sctx.lineWidth = 8;
  sctx.strokeRect(8, 8, 624, 144);
  sctx.fillStyle = '#f6ead2';
  sctx.font = '600 54px sans-serif';
  sctx.textAlign = 'center';
  sctx.textBaseline = 'middle';
  sctx.fillText('STAR CHAMBER', 320, 64);
  sctx.font = '400 22px sans-serif';
  sctx.fillStyle = '#d9c39a';
  sctx.fillText('PLANETARIUM', 320, 112);
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 0.42), toon('#ffffff', { map: canvasTex(signCanvas) }));
  sign.position.set(-0.6, 2.78, 5.15);
  g.add(sign);
  addCyl(g, 0.012, 0.012, 0.42, toon(BRASS), -1.25, 3.0, 5.15, 6);
  addCyl(g, 0.012, 0.012, 0.42, toon(BRASS), 0.05, 3.0, 5.15, 6);

  const books = byId.case.position;
  fillBooks(g, books[0] + 0.2, books[2], Math.PI / 2, { width: 0.72, perShelf: 8, shelves: 4 });
}

function makeProcedural(layout) {
  const g = new THREE.Group();
  g.name = 'procedural';
  addStars(g);
  addAisleLights(g);
  addProjector(g);
  addPlanets(g, layout);
  addFoyerDressing(g, layout);
  return g;
}

boot({
  prepareLayout: expandSeats,
  makeShell,
  makeProcedural,
  readyText: 'ready — star chamber · drag orbit · U unlit · T toon',
});
