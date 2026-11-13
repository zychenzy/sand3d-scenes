import * as THREE from 'three';
import { boot, toon, addBox, addCyl } from './scene_lib.js';
import { RANGE, lines, BUILT } from './range_spec.mjs';

const C = {
  maple: '#e4c89a',
  mapleLine: '#f4efe4',
  wait: '#8d342e',
  three: '#f7f4ee',
  equip: '#2a3330',
  runners: ['#7d9a68', '#6e8eaa', '#c47a55', '#d2b15a'],
  mat: '#2f4a3c',
  plaster: '#f4efe6',
  pad: '#1e4d3e',
  padLite: '#2f6b56',
  rail: '#8d5b34',
  beam: '#d9d2c4',
  ceiling: '#f7f3ea',
  poche: '#24302c',
  net: '#5c6770',
  skirt: '#245444',
  steel: '#3e454c',
  oak: '#8d5b34',
  green: '#1e4a3c',
  paper: '#f7f4ee',
  leather: '#6b3a28',
  brass: '#c6a15a',
  apron: '#cfc6b6',
};

function flat(g, w, d, color, x, z, y) {
  const m = addBox(g, w, 0.004, d, toon(color), x, y, z);
  m.userData.noCast = true;
  m.material.polygonOffset = true;
  m.material.polygonOffsetFactor = -2;
  m.material.polygonOffsetUnits = -2;
  return m;
}

function curtain(g, x0, x1, y0, y1, z, gap, color) {
  const span = x1 - x0;
  const n = Math.max(2, Math.floor(span / gap));
  const geo = new THREE.BoxGeometry(0.016, y1 - y0, 0.01);
  const mesh = new THREE.InstancedMesh(geo, toon(color), n);
  const dummy = new THREE.Object3D();
  const step = span / n;
  for (let i = 0; i < n; i++) {
    dummy.position.set(x0 + (i + 0.5) * step, (y0 + y1) / 2, z);
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
  }
  mesh.instanceMatrix.needsUpdate = true;
  mesh.userData.noCast = true;
  g.add(mesh);
  return mesh;
}

function floorNum(n, tint) {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const ctx = c.getContext('2d');
  ctx.clearRect(0, 0, 256, 256);
  ctx.fillStyle = tint;
  ctx.font = '700 168px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(String(n), 128, 136);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.4), toon('#ffffff', { map: tex, transparent: true }));
  m.rotation.x = -Math.PI / 2;
  m.userData.noCast = true;
  return m;
}

function stuckArrow(g, x, y, zNock) {
  const shaft = addCyl(g, 0.0045, 0.0045, 0.52, toon('#c2a06a'), x, y, zNock - 0.22, 8);
  shaft.rotation.x = Math.PI / 2;
  const point = addCyl(g, 0.007, 0.001, 0.04, toon('#8e969c'), x, y, zNock - 0.5, 6);
  point.rotation.x = Math.PI / 2;
  addBox(g, 0.028, 0.004, 0.07, toon('#e25b2a'), x, y, zNock - 0.02);
  addBox(g, 0.004, 0.028, 0.07, toon('#f2c14e'), x, y, zNock - 0.02);
}

function prepBench(g, spec) {
  const { x, z, w, d } = spec;
  addBox(g, w, 0.046, d, toon(C.oak), x, 0.785, z);
  addBox(g, w - 0.08, 0.1, 0.04, toon(C.green), x, 0.7, z + d / 2 - 0.02);
  addBox(g, 0.04, 0.1, d - 0.06, toon(C.green), x - w / 2 + 0.04, 0.7, z);
  addBox(g, 0.04, 0.1, d - 0.06, toon(C.green), x + w / 2 - 0.04, 0.7, z);
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      addBox(g, 0.06, 0.74, 0.06, toon(C.oak), x + sx * (w / 2 - 0.07), 0.37, z + sz * (d / 2 - 0.07));
    }
  }
  addBox(g, w - 0.16, 0.028, d - 0.16, toon('#a87545'), x, 0.28, z);
  for (let i = 0; i < 3; i++) {
    const dx = (i - 1) * (w / 3.4);
    addBox(g, w / 3.7, 0.11, 0.02, toon(C.paper), x + dx, 0.56, z + d / 2 - 0.01);
    addCyl(g, 0.012, 0.012, 0.016, toon(C.brass), x + dx, 0.56, z + d / 2 + 0.008, 8);
  }
}

function bowRack(g) {
  const r = BUILT.rack;
  const z = (r.z0 + r.z1) / 2;
  const depth = r.z1 - r.z0;
  const x = (r.x0 + r.x1) / 2;
  addBox(g, 0.06, 1.48, depth, toon(C.oak), r.x0 + 0.04, 0.78, z);
  addBox(g, 0.28, 0.05, depth, toon('#6d4528'), x + 0.06, 0.08, z);
  addBox(g, 0.22, 0.045, depth - 0.08, toon(C.green), x + 0.05, 1.18, z);
  for (let i = 0; i < 5; i++) {
    const zz = r.z0 + 0.18 + i * ((depth - 0.36) / 4);
    addBox(g, 0.2, 0.28, 0.035, toon(C.oak), x + 0.04, 0.22, zz);
  }
}

function tuneAsset(kind, prepared) {
  const local = kind.startsWith('recurve') || kind.includes('quiver') || kind === 'indoor_butt';
  if (local) {
    prepared.traverse((o) => {
      if (!o.isMesh) return;
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      mats.forEach((m) => { if (m) m.side = THREE.DoubleSide; });
    });
  }
  if (kind === 'flowerpot') {
    const leafMat = toon('#3f6a42');
    const a = new THREE.Mesh(new THREE.SphereGeometry(0.075, 8, 6), leafMat);
    a.position.set(0, 0.34, 0);
    a.scale.set(1.05, 0.72, 0.9);
    const b = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 6), toon('#2f5534'));
    b.position.set(0.04, 0.4, 0.02);
    prepared.add(a, b);
  }
}

function makeShell() {
  const g = new THREE.Group();
  g.name = 'shell';
  const R = RANGE.room;
  const W = R.x1 - R.x0;
  const D = R.z1 - R.z0;
  const cx = (R.x0 + R.x1) / 2;
  const cz = (R.z0 + R.z1) / 2;
  const H = R.h;

  const apron = addBox(g, W + 3.2, 0.04, D + 2.4, toon('#cfc8ba'), cx + 0.4, -0.06, cz);
  apron.userData.noCast = true;
  apron.receiveShadow = true;

  const floor = addBox(g, W, 0.08, D, toon(C.maple), cx, -0.04, cz);
  floor.userData.noCast = true;

  const L = lines();
  RANGE.lanes.forEach((x, i) => {
    flat(g, 1.12, L.shoot - RANGE.faceZ - 0.05, C.runners[i], x, (RANGE.faceZ + L.shoot) / 2 - 0.02, 0.006);
    flat(g, 0.78, 1.05, C.mat, x, L.shoot + 0.58, 0.01);
    const num = floorNum(i + 1, '#f4efe6');
    num.position.set(x, 0.016, L.shoot + 0.28);
    g.add(num);
  });

  flat(g, 8.6, RANGE.lineW, C.three, 0, L.three + RANGE.lineW / 2, 0.012);
  flat(g, 8.8, RANGE.lineW, C.mapleLine, 0, L.shoot + RANGE.lineW / 2, 0.014);
  flat(g, 8.8, RANGE.lineW, C.wait, 0, L.wait + RANGE.lineW / 2, 0.014);
  for (let i = 0; i < 14; i++) {
    flat(g, 0.42, RANGE.lineW, C.equip, -4.1 + i * 0.62, L.equip + RANGE.lineW / 2, 0.012);
  }

  const t = 0.16;
  const back = addBox(g, W + t * 2, H, t, toon(C.plaster), cx, H / 2, R.z0 - t / 2);
  back.userData.noCast = true;
  const west = addBox(g, t, H, D + t, toon(C.plaster), R.x0 - t / 2, H / 2, cz);
  west.userData.noCast = true;
  const south = addBox(g, W + t, H, t, toon(C.plaster), cx - 0.1, H / 2, R.z1 + t / 2);
  south.userData.noCast = true;

  const cut0 = 0.7;
  const eastA = addBox(g, t, H, cut0 - R.z0, toon(C.plaster), R.x1 + t / 2, H / 2, (R.z0 + cut0) / 2);
  eastA.userData.noCast = true;
  addBox(g, t + 0.02, H, 0.08, toon(C.poche), R.x1 + 0.02, H / 2, cut0);

  addBox(g, W, 0.1, 0.06, toon(C.rail), cx, 0.05, R.z0 + 0.04);
  addBox(g, 0.06, 0.1, D - 0.2, toon(C.rail), R.x0 + 0.04, 0.05, cz);

  function pads(fixed, a0, a1, alongX) {
    const span = a1 - a0;
    const n = Math.max(1, Math.floor(span / 0.92));
    const step = span / n;
    for (let i = 0; i < n; i++) {
      const c = a0 + (i + 0.5) * step;
      const color = toon(i % 2 ? C.pad : '#245743');
      const body = alongX
        ? addBox(g, step - 0.04, 2.05, 0.05, color, c, 1.12, fixed)
        : addBox(g, 0.05, 2.05, step - 0.04, color, fixed, 1.12, c);
      body.userData.noCast = true;
      if (alongX) addBox(g, step - 0.1, 1.92, 0.012, toon(C.padLite), c, 1.12, fixed + 0.03);
      else addBox(g, 0.012, 1.92, step - 0.1, toon(C.padLite), fixed + 0.03, 1.12, c);
    }
  }
  pads(R.x0 + 0.05, 0.2, L.wait - 0.2, false);
  pads(R.z0 + 0.06, R.x0 + 0.4, R.x1 - 0.4, true);
  addBox(g, W - 0.3, 0.06, 0.08, toon(C.rail), cx, 2.18, R.z0 + 0.08);
  addBox(g, 0.08, 0.06, L.wait - 0.4, toon(C.rail), R.x0 + 0.08, 2.18, (0.2 + L.wait) / 2);

  const ceil = addBox(g, W, 0.08, D, toon(C.ceiling), cx, H + 0.02, cz);
  ceil.userData.noCast = true;
  for (let z = 1.6; z < R.z1 - 0.4; z += 3.15) {
    const beam = addBox(g, W - 0.3, 0.16, 0.1, toon(C.beam), cx, H - 0.12, z);
    beam.userData.noCast = true;
  }
  for (const x of [-1.8, 1.8]) {
    for (let z = 2.4; z < 22; z += 3.3) {
      const lamp = addBox(g, 0.16, 0.05, 2.15, toon('#f3ecdf'), x, H - 0.22, z);
      lamp.userData.noCast = true;
      lamp.material.emissive = new THREE.Color('#ffe6c2');
      lamp.material.emissiveIntensity = 0.85;
      const glow = addBox(g, 0.08, 0.012, 1.9, toon('#fff4df'), x, H - 0.26, z);
      glow.userData.noCast = true;
      glow.material.emissive = new THREE.Color('#fff1d4');
      glow.material.emissiveIntensity = 1.1;
    }
  }

  curtain(g, -4.7, 4.7, 0.35, 4.55, 0.4, 0.09, C.net);
  for (let y = 0.7; y < 4.4; y += 0.55) {
    const band = addBox(g, 9.4, 0.012, 0.01, toon('#6a7580'), 0, y, 0.405);
    band.userData.noCast = true;
  }
  const skirt = addBox(g, 9.5, 0.32, 0.04, toon(C.skirt), 0, 0.2, 0.34);
  skirt.userData.noCast = true;
  addBox(g, 9.6, 0.08, 0.1, toon(C.oak), 0, 4.58, 0.4);

  return g;
}

function makeProcedural() {
  const g = new THREE.Group();
  g.name = 'hall';
  prepBench(g, BUILT.prepA);
  prepBench(g, BUILT.prepB);
  bowRack(g);

  const tubes = [
    [-2.15, 24.48, '#c47a55'],
    [-1.45, 24.62, '#6e8eaa'],
    [-0.75, 24.48, '#d2b15a'],
    [0.55, 24.5, '#7d9a68'],
    [1.25, 24.66, '#c47a55'],
  ];
  for (const [x, z, color] of tubes) {
    const tube = addCyl(g, 0.055, 0.055, 0.58, toon(color), x, 0.36, z, 12);
    tube.rotation.z = Math.PI / 2;
    addCyl(g, 0.058, 0.058, 0.03, toon('#f4efe6'), x + 0.28, 0.36, z, 10).rotation.z = Math.PI / 2;
  }

  const cuff = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.016, 6, 12, Math.PI * 1.15), toon(C.leather));
  cuff.position.set(-1.15, 0.84, 24.42);
  cuff.rotation.set(0.4, 0.5, 0.2);
  g.add(cuff);
  addBox(g, 0.07, 0.012, 0.1, toon('#8a4b32'), -0.55, 0.82, 24.7);
  addBox(g, 0.16, 0.008, 0.012, toon(C.brass), 1.55, 0.83, 24.4);
  addBox(g, 0.012, 0.008, 0.1, toon(C.brass), 1.55, 0.83, 24.46);
  const coil = new THREE.Mesh(new THREE.TorusGeometry(0.045, 0.008, 6, 14), toon('#d7d0c2'));
  coil.position.set(1.85, 0.84, 24.68);
  coil.rotation.x = Math.PI / 2.4;
  g.add(coil);
  addCyl(g, 0.034, 0.038, 0.16, toon('#3c78b4'), 0.95, 0.9, 24.72, 10);
  addCyl(g, 0.02, 0.022, 0.03, toon('#d5d8dc'), 0.95, 1.0, 24.72, 8);
  addBox(g, 0.18, 0.008, 0.24, toon(C.paper), 1.55, 0.815, 24.28);
  addBox(g, 0.16, 0.012, 0.03, toon('#2c3036'), 1.55, 0.825, 24.38);

  stuckArrow(g, 0.98, 1.36, 1.34);
  stuckArrow(g, 0.84, 1.76, 1.32);
  stuckArrow(g, -0.96, 1.28, 1.33);

  return g;
}

boot({
  readyText: 'ready — gold line 18 m · drag orbit · U unlit · T toon',
  makeShell,
  makeProcedural,
  tuneAsset,
}).catch((err) => {
  const status = document.getElementById('status');
  if (status) status.textContent = 'error: ' + (err?.message || err);
});
