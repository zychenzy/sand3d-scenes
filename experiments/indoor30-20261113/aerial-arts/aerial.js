import * as THREE from 'three';
import { boot, toon, addBox, addCyl } from './scene_lib.js';

const PAL = {
  plaster: '#e6dfd4',
  plasterDeep: '#d4cbbd',
  wainscot: '#c3b29d',
  ceiling: '#f6f1e7',
  soffit: '#e7dccb',
  trim: '#8a5a38',
  floor: '#c4925a',
  floorDeep: '#a87442',
  floorEdge: '#7b5230',
  line: '#c9842a',
  tape: '#f3ecdf',
  steel: '#646d76',
  steelTop: '#737c86',
  steelBot: '#3c444c',
  metal: '#9aa3ab',
  web: '#a56b32',
  hoop: '#1c1e22',
  matBody: '#16385f',
  matTop: '#4e8fc4',
  matSide: '#102844',
  matPipe: '#8eb4d8',
  wood: '#7a5138',
  woodLite: '#c9a06a',
  frame: '#2c343c',
  cubby: '#6e4a34',
  cubbyDark: '#3a291f',
};

function woodMap() {
  const c = document.createElement('canvas');
  c.width = 1024;
  c.height = 512;
  const g = c.getContext('2d');
  const tones = ['#c99658', '#b78346', '#d4a66a', '#a97440', '#c08a4e', '#cf9b5c'];
  let x = 0;
  let i = 0;
  while (x < 1024) {
    const w = 56 + ((i * 37) % 28);
    g.fillStyle = tones[i % tones.length];
    g.fillRect(x, 0, w, 512);
    g.fillStyle = 'rgba(90, 48, 20, 0.35)';
    g.fillRect(x, 0, 2, 512);
    g.fillStyle = 'rgba(255, 220, 170, 0.15)';
    g.fillRect(x + 8, 0, 2, 512);
    if (i % 3 === 0) {
      g.fillStyle = 'rgba(90, 50, 24, 0.28)';
      g.beginPath();
      g.ellipse(x + w * 0.45, 80 + (i * 47) % 360, 7, 4, 0.4, 0, Math.PI * 2);
      g.fill();
    }
    x += w;
    i += 1;
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(3, 5);
  tex.anisotropy = 4;
  return tex;
}

function quiet(mesh) {
  mesh.userData.noCast = true;
  return mesh;
}

function strap(g, a, b, width, mat) {
  const dir = new THREE.Vector3(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
  const len = dir.length() || 0.001;
  const m = new THREE.Mesh(new THREE.BoxGeometry(width, len, 0.01), mat);
  m.position.set((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
  m.castShadow = true;
  m.receiveShadow = true;
  g.add(m);
  return m;
}

function addRibbon(g, pts, mat) {
  const pos = [];
  const uv = [];
  const idx = [];
  const dirs = pts.map((p, i) => {
    const prev = pts[Math.max(0, i - 1)];
    const next = pts[Math.min(pts.length - 1, i + 1)];
    const tan = new THREE.Vector3(next.x - prev.x, next.y - prev.y, next.z - prev.z);
    if (tan.lengthSq() < 1e-8) tan.set(0, -1, 0);
    tan.normalize();
    const ref = Math.abs(tan.y) > 0.86 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0);
    const side = new THREE.Vector3().crossVectors(tan, ref).normalize();
    const bin = new THREE.Vector3().crossVectors(side, tan).normalize();
    const c = Math.cos(p.twist);
    const s = Math.sin(p.twist);
    return side.multiplyScalar(c).add(bin.multiplyScalar(s));
  });
  pts.forEach((p, i) => {
    const hw = p.w * 0.5;
    const d = dirs[i];
    pos.push(p.x - d.x * hw, p.y - d.y * hw, p.z - d.z * hw);
    pos.push(p.x + d.x * hw, p.y + d.y * hw, p.z + d.z * hw);
    const v = (i / (pts.length - 1)) * 9;
    uv.push(0, v, 1, v);
  });
  for (let i = 0; i < pts.length - 1; i++) {
    const o = i * 2;
    idx.push(o, o + 2, o + 1, o + 1, o + 2, o + 3);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  const mesh = new THREE.Mesh(geo, mat);
  mesh.userData.noShadow = true;
  g.add(mesh);
  return mesh;
}

function silkPath(y0, matTop, phase, side) {
  const yHem = matTop + 0.18;
  const pts = [];
  const n = 110;
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    if (t < 0.8) {
      const u = t / 0.8;
      const gather = Math.min(1, u / 0.07);
      const sway = Math.sin(u * Math.PI * 1.65 + phase) * 0.05;
      const creaseA = Math.exp(-(((u - 0.4) * 13) ** 2));
      const creaseB = Math.exp(-(((u - 0.68) * 11) ** 2));
      pts.push({
        x: side * (0.05 + 0.09 * gather) + side * sway,
        y: y0 + (yHem - y0) * u,
        z: Math.cos(u * Math.PI * 1.4 + phase) * 0.045 + side * 0.02,
        twist: side * 0.3 + u * 0.7 + creaseA * 0.45 + creaseB * 0.35,
        w: (0.11 + 0.5 * gather) * (1 - 0.36 * creaseA - 0.3 * creaseB),
      });
    } else {
      const p = (t - 0.8) / 0.2;
      const ang = side * (0.4 + p * Math.PI * 1.65) + phase * 0.15;
      const rad = 0.06 + p * 0.24;
      pts.push({
        x: side * (0.14 + Math.cos(ang) * rad),
        y: yHem + (matTop + 0.022 - yHem) * Math.min(1, p * 1.2),
        z: Math.sin(ang) * rad * 0.8,
        twist: ang,
        w: 0.46 * (1 - p * 0.12),
      });
    }
  }
  return pts;
}

function iBeamX(g, x0, x1, y, z, arch, mats) {
  const len = x1 - x0;
  const mid = (x0 + x1) / 2;
  const d = arch.beamDepth;
  const f = arch.beamFlange;
  addBox(g, len, 0.02, f, mats.steelTop, mid, y + d / 2 - 0.01, z);
  addBox(g, len, 0.022, f, mats.steelBot, mid, y - d / 2 + 0.011, z);
  const web = addBox(g, len, d - 0.05, arch.beamWeb, mats.steel, mid, y, z);
  web.userData.noCast = true;
}

function iBeamZ(g, z0, z1, y, x, arch, mats) {
  const len = z1 - z0;
  const mid = (z0 + z1) / 2;
  const d = arch.beamDepth;
  const f = arch.beamFlange;
  addBox(g, f, 0.02, len, mats.steelTop, x, y + d / 2 - 0.01, mid);
  addBox(g, f, 0.022, len, mats.steelBot, x, y - d / 2 + 0.011, mid);
  const web = addBox(g, arch.beamWeb, d - 0.05, len, mats.steel, x, y, mid);
  web.userData.noCast = true;
}

function tapeRect(g, x0, x1, z0, z1, y, mat) {
  const t = 0.028;
  quiet(addBox(g, x1 - x0, 0.008, t, mat, (x0 + x1) / 2, y, z0));
  quiet(addBox(g, x1 - x0, 0.008, t, mat, (x0 + x1) / 2, y, z1));
  quiet(addBox(g, t, 0.008, z1 - z0, mat, x0, y, (z0 + z1) / 2));
  quiet(addBox(g, t, 0.008, z1 - z0, mat, x1, y, (z0 + z1) / 2));
}

function makeSign(g, w, h, x, y, z, rotY, draw) {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = Math.round(1024 * (h / w));
  draw(canvas.getContext('2d'), canvas.width, canvas.height);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), toon('#111'));
  mesh.position.set(x, y, z);
  mesh.rotation.y = rotY;
  mesh.userData.shade = 'decal';
  mesh.userData.map = tex;
  mesh.userData.noCast = true;
  g.add(mesh);
  return mesh;
}

function palette(layout) {
  const wood = woodMap();
  return {
    plaster: toon(PAL.plaster),
    plasterDeep: toon(PAL.plasterDeep),
    wainscot: toon(PAL.wainscot),
    ceiling: toon(PAL.ceiling),
    soffit: toon(PAL.soffit),
    trim: toon(PAL.trim),
    floorEdge: toon(PAL.floorEdge),
    floorTop: toon(PAL.floor, { map: wood }),
    line: toon(PAL.line),
    tape: toon(PAL.tape),
    steel: toon(PAL.steel),
    steelTop: toon(PAL.steelTop),
    steelBot: toon(PAL.steelBot),
    metal: toon(PAL.metal),
    web: toon(PAL.web),
    hoop: toon(PAL.hoop),
    matBody: toon(PAL.matBody),
    matTop: toon(PAL.matTop),
    matSide: toon(PAL.matSide),
    matPipe: toon(PAL.matPipe),
    wood: toon(PAL.wood),
    woodLite: toon(PAL.woodLite),
    frame: toon(PAL.frame),
    cubby: toon(PAL.cubby),
    cubbyDark: toon(PAL.cubbyDark),
    layout,
  };
}

function makeShell(layout) {
  const g = new THREE.Group();
  const arch = layout.architecture;
  const o = arch.outer;
  const mats = palette(layout);
  const W = o.x1 - o.x0;
  const D = o.z1 - o.z0;
  const H = o.h;
  const t = arch.wall;
  const innerN = o.z0 + t;
  const innerW = o.x0 + t;
  const innerE = o.x1 - t;

  const floor = new THREE.Mesh(new THREE.BoxGeometry(W, 0.12, D), [
    mats.floorEdge, mats.floorEdge, mats.floorTop, mats.floorEdge, mats.floorEdge, mats.floorEdge,
  ]);
  floor.position.set(0, -0.06, 0);
  floor.userData.noCast = true;
  g.add(floor);

  const ceil = addBox(g, W, 0.16, D, mats.ceiling, 0, H - 0.08, 0);
  ceil.userData.noCast = true;

  addBox(g, W, H, t, mats.plaster, 0, H / 2, o.z0 + t / 2);
  addBox(g, t, H, D, mats.plaster, o.x0 + t / 2, H / 2, 0);
  addBox(g, t, H, D, mats.plaster, o.x1 - t / 2, H / 2, 0);

  const wainY = 0.58;
  quiet(addBox(g, W - t * 2, 1.12, 0.045, mats.wainscot, 0, wainY, innerN + 0.02));
  quiet(addBox(g, 0.045, 1.12, D - 0.4, mats.wainscot, innerW + 0.02, wainY, 0.2));
  quiet(addBox(g, 0.045, 1.12, D - 1.2, mats.wainscot, innerE - 0.02, wainY, -0.4));
  quiet(addBox(g, W - t * 2, 0.06, 0.07, mats.trim, 0, 1.16, innerN + 0.03));
  quiet(addBox(g, 0.07, 0.06, D - 0.5, mats.trim, innerW + 0.03, 1.16, 0.15));
  quiet(addBox(g, 0.07, 0.06, D - 1.3, mats.trim, innerE - 0.03, 1.16, -0.35));
  quiet(addBox(g, W - t * 2, 0.1, 0.06, mats.trim, 0, 0.05, innerN + 0.03));
  quiet(addBox(g, 0.06, 0.1, D - 0.3, mats.trim, innerW + 0.03, 0.05, 0.1));
  quiet(addBox(g, 0.06, 0.1, D - 0.8, mats.trim, innerE - 0.03, 0.05, -0.2));

  const soffitH = (H - 0.1) - arch.soffit.y;
  const soffit = addBox(
    g,
    (arch.soffit.x1 - o.x0),
    soffitH,
    arch.soffit.z1 - arch.soffit.z0,
    mats.soffit,
    (o.x0 + arch.soffit.x1) / 2,
    arch.soffit.y + soffitH / 2,
    (arch.soffit.z0 + arch.soffit.z1) / 2,
  );
  soffit.userData.noCast = true;
  quiet(addBox(g, 0.08, 0.08, arch.soffit.z1 - arch.soffit.z0, mats.trim, arch.soffit.x1 + 0.02, arch.soffit.y, (arch.soffit.z0 + arch.soffit.z1) / 2));

  const can = arch.canopy;
  const canH = (H - 0.1) - can.y;
  const canopy = addBox(
    g,
    o.x1 - can.x0,
    canH,
    can.z1 - can.z0,
    mats.soffit,
    (can.x0 + o.x1) / 2,
    can.y + canH / 2,
    (can.z0 + can.z1) / 2,
  );
  canopy.userData.noCast = true;
  quiet(addBox(g, 0.08, 0.08, can.z1 - can.z0, mats.trim, can.x0 - 0.02, can.y, (can.z0 + can.z1) / 2));

  buildClerestory(g, arch, mats, innerN);
  buildWestWindow(g, arch, mats, innerW);
  return g;
}

function buildClerestory(g, arch, mats, innerN) {
  const y0 = 4.78;
  const y1 = 6.28;
  const x0 = -6.3;
  const x1 = 6.5;
  const cols = 8;
  const gap = (x1 - x0) / cols;
  for (let i = 0; i < cols; i++) {
    const x = x0 + (i + 0.5) * gap;
    const pane = addBox(g, gap - 0.09, y1 - y0 - 0.08, 0.02, mats.frame, x, (y0 + y1) / 2, innerN + 0.03);
    pane.userData.shade = 'emissive';
    pane.userData.color = '#d7e8f6';
    pane.userData.noCast = true;
  }
  quiet(addBox(g, x1 - x0 + 0.1, 0.07, 0.06, mats.frame, (x0 + x1) / 2, y0, innerN + 0.045));
  quiet(addBox(g, x1 - x0 + 0.1, 0.07, 0.06, mats.frame, (x0 + x1) / 2, y1, innerN + 0.045));
  for (let i = 0; i <= cols; i++) {
    quiet(addBox(g, 0.05, y1 - y0 + 0.08, 0.06, mats.frame, x0 + i * gap, (y0 + y1) / 2, innerN + 0.045));
  }
}

function buildWestWindow(g, arch, mats, innerW) {
  const z0 = 0.85;
  const z1 = 2.25;
  const y0 = 1.35;
  const y1 = 2.55;
  const pane = addBox(g, 0.02, y1 - y0, z1 - z0, mats.frame, innerW + 0.04, (y0 + y1) / 2, (z0 + z1) / 2);
  pane.userData.shade = 'emissive';
  pane.userData.color = '#d7e8f6';
  pane.userData.noCast = true;
  quiet(addBox(g, 0.05, 0.05, z1 - z0 + 0.08, mats.frame, innerW + 0.06, y0, (z0 + z1) / 2));
  quiet(addBox(g, 0.05, 0.05, z1 - z0 + 0.08, mats.frame, innerW + 0.06, y1, (z0 + z1) / 2));
  quiet(addBox(g, 0.05, y1 - y0, 0.05, mats.frame, innerW + 0.06, (y0 + y1) / 2, z0));
  quiet(addBox(g, 0.05, y1 - y0, 0.05, mats.frame, innerW + 0.06, (y0 + y1) / 2, z1));
}

function buildBeams(g, arch, mats) {
  const y = arch.beamBottom + arch.beamDepth / 2;
  for (const z of arch.ewZ) iBeamX(g, arch.beamX0, arch.beamX1, y, z, arch, mats);
  const cuts = [...arch.ewZ].sort((a, b) => a - b);
  const stops = [arch.nsZ0, ...cuts];
  for (const x of arch.nsX) {
    for (let i = 0; i < stops.length - 1; i++) {
      const a = stops[i] + (i === 0 ? 0.02 : 0.1);
      const b = stops[i + 1] - 0.1;
      if (b - a < 0.35) continue;
      iBeamZ(g, a, b, y + 0.015, x, arch, mats);
    }
    addBox(g, 0.22, 0.02, 0.22, mats.steelBot, x, arch.beamBottom - 0.012, arch.rigZ);
  }
  for (const z of [arch.ewZ[0], arch.ewZ[arch.ewZ.length - 1]]) {
    addBox(g, 0.03, arch.beamDepth + 0.04, 0.22, mats.steelBot, arch.beamX0 - 0.01, y, z);
    addBox(g, 0.03, arch.beamDepth + 0.04, 0.22, mats.steelBot, arch.beamX1 + 0.01, y, z);
  }
}

function buildPosts(g, arch, mats) {
  for (const post of arch.posts) {
    addBox(g, 0.12, arch.beamBottom, 0.12, mats.steel, post.x, arch.beamBottom / 2, post.z);
    quiet(addBox(g, 0.24, 0.025, 0.24, mats.steelBot, post.x, 0.014, post.z));
    addBox(g, 0.2, 0.02, 0.2, mats.steelTop, post.x, arch.beamBottom - 0.01, post.z);
    const dir = post.x > 0 ? -1 : 1;
    strap(
      g,
      [post.x, arch.beamBottom - 0.04, post.z],
      [post.x + dir * 0.72, arch.beamBottom - 0.62, post.z],
      0.045,
      mats.steel,
    );
  }
}

function buildMat(rig, mat, mats) {
  const h = mat.h;
  const y = mat.lift + h / 2;
  addBox(rig, mat.w, h - 0.05, mat.d, mats.matBody, 0, y - 0.01, 0);
  const top = addBox(rig, mat.w - 0.08, 0.045, mat.d - 0.08, mats.matTop, 0, mat.lift + h - 0.02, 0);
  top.userData.noCast = true;
  quiet(addBox(rig, mat.w - 0.02, 0.02, 0.035, mats.matPipe, 0, mat.lift + h - 0.01, mat.d / 2 - 0.03));
  quiet(addBox(rig, mat.w - 0.02, 0.02, 0.035, mats.matPipe, 0, mat.lift + h - 0.01, -mat.d / 2 + 0.03));
  quiet(addBox(rig, 0.035, 0.02, mat.d - 0.02, mats.matPipe, mat.w / 2 - 0.03, mat.lift + h - 0.01, 0));
  quiet(addBox(rig, 0.035, 0.02, mat.d - 0.02, mats.matPipe, -mat.w / 2 + 0.03, mat.lift + h - 0.01, 0));
  quiet(addBox(rig, 0.012, h * 0.7, mat.d - 0.12, mats.matSide, 0, y, 0));
  addBox(rig, 0.16, 0.035, 0.05, mats.matSide, 0, mat.lift + h * 0.45, mat.d / 2 + 0.01);
}

function buildHanger(rig, arch, mats) {
  const yb = arch.beamBottom;
  addBox(rig, 0.1, 0.018, 0.2, mats.steelBot, 0, yb - 0.02, 0);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.036, 0.006, 8, 18), mats.metal);
  ring.scale.set(1, 1.45, 1);
  ring.position.y = yb - 0.095;
  ring.castShadow = true;
  rig.add(ring);
  const swivel = addCyl(rig, 0.018, 0.018, 0.04, mats.metal, 0, yb - 0.16, 0, 10);
  swivel.userData.noCast = true;
  return yb - 0.19;
}

function buildSilk(rig, station, arch, mats) {
  const yKnot = arch.beamBottom - 0.46;
  const matTop = arch.mat.lift + arch.mat.h;
  strap(rig, [0, arch.beamBottom - 0.19, 0], [0, yKnot + 0.08, 0], 0.07, mats.web).userData.noCast = true;
  for (const [dy, sc] of [[0, 1], [-0.04, 0.84], [0.035, 0.72]]) {
    const loop = new THREE.Mesh(new THREE.TorusGeometry(0.05 * sc, 0.016, 8, 16), toon(station.color));
    loop.rotation.x = Math.PI / 2;
    loop.rotation.z = station.phase + dy;
    loop.position.y = yKnot + dy;
    loop.userData.noCast = true;
    rig.add(loop);
  }
  const cloth = toon(station.color, { side: THREE.DoubleSide });
  const deep = toon(station.deep, { side: THREE.DoubleSide });
  addRibbon(rig, silkPath(yKnot - 0.05, matTop, station.phase, 1), cloth);
  addRibbon(rig, silkPath(yKnot - 0.05, matTop, station.phase + 1.2, -1), deep);
}

function tapeBand(rig, radius, centerY, angle, color) {
  const tangent = new THREE.Vector3(-Math.sin(angle), Math.cos(angle), 0).normalize();
  const band = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.024, 0.09, 10), toon(color));
  band.position.set(Math.cos(angle) * radius, centerY + Math.sin(angle) * radius, 0);
  band.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), tangent);
  band.castShadow = true;
  rig.add(band);
}

function buildLyra(rig, station, arch, mats) {
  const R = station.radius;
  const cy = station.bottom + R;
  const hoop = new THREE.Mesh(new THREE.TorusGeometry(R, 0.03, 16, 72), mats.hoop);
  hoop.position.y = cy;
  hoop.castShadow = true;
  hoop.receiveShadow = true;
  rig.add(hoop);
  for (const angle of [-2.15, -1.57, -1.0, 1.57]) tapeBand(rig, R, cy, angle, station.tape);
  const top = cy + R;
  const carY = arch.beamBottom - 0.19;
  if (station.vStrap) {
    strap(rig, [0, carY, 0], [-0.26, top + 0.02, 0], 0.09, mats.web).userData.noCast = true;
    strap(rig, [0, carY, 0], [0.26, top + 0.02, 0], 0.09, mats.web).userData.noCast = true;
    addBox(rig, 0.08, 0.02, 0.045, mats.metal, -0.26, top + 0.014, 0);
    addBox(rig, 0.08, 0.02, 0.045, mats.metal, 0.26, top + 0.014, 0);
  } else {
    strap(rig, [0, carY, 0], [0, top + 0.03, 0], 0.09, mats.web).userData.noCast = true;
    addBox(rig, 0.09, 0.02, 0.045, mats.metal, 0, top + 0.014, 0);
  }
}

function buildStation(g, station, arch, mats) {
  const rig = new THREE.Group();
  rig.name = `rig-${station.id}`;
  rig.position.set(station.x, 0, station.z);
  g.add(rig);
  buildMat(rig, arch.mat, mats);
  buildHanger(rig, arch, mats);
  if (station.kind === 'silk') buildSilk(rig, station, arch, mats);
  else buildLyra(rig, station, arch, mats);
  const blob = addBox(rig, 0.55, 0.008, 0.4, toon('#000'), 0, 0.02, 0.15);
  blob.userData.shade = 'shadow';
  blob.userData.opacity = 0.18;
}

function buildCubby(g, cubby, mats) {
  const w = cubby.x1 - cubby.x0;
  const d = cubby.z1 - cubby.z0;
  const cx = (cubby.x0 + cubby.x1) / 2;
  const cz = (cubby.z0 + cubby.z1) / 2;
  addBox(g, 0.04, cubby.h, d, mats.cubbyDark, cubby.x0 + 0.02, cubby.h / 2, cz);
  addBox(g, w, cubby.h, 0.04, mats.cubby, cx, cubby.h / 2, cubby.z0 + 0.02);
  addBox(g, w, cubby.h, 0.04, mats.cubby, cx, cubby.h / 2, cubby.z1 - 0.02);
  addBox(g, w, 0.04, d, mats.cubby, cx, cubby.h - 0.02, cz);
  addBox(g, w, 0.05, d, mats.wood, cx, 0.025, cz);
  const levels = [0.38, 0.82, 1.28, 1.7];
  for (const y of levels) addBox(g, w - 0.02, 0.025, d - 0.06, mats.woodLite, cx + 0.01, y, cz);
  const roll = addCyl(g, 0.09, 0.09, 0.62, toon('#1f7c76'), cx + 0.08, 1.82, cz - 0.15, 16);
  roll.rotation.x = Math.PI / 2;
  for (const [dz, color] of [[-0.45, '#c9842a'], [-0.15, '#e4ddd0'], [0.2, '#a33b45']]) {
    const tape = addCyl(g, 0.055, 0.055, 0.045, toon(color), cx + 0.1, 1.36, cz + dz, 12);
    tape.rotation.z = Math.PI / 2;
  }
  addBox(g, 0.28, 0.06, 0.42, mats.cubbyDark, cx + 0.08, 0.9, cz + 0.15);
  for (const dx of [-0.06, 0, 0.06]) {
    const bin = new THREE.Mesh(new THREE.TorusGeometry(0.028, 0.005, 6, 12), mats.metal);
    bin.position.set(cx + 0.1, 0.98, cz + 0.15 + dx);
    bin.rotation.y = dx;
    bin.userData.noCast = true;
    g.add(bin);
  }
  addCyl(g, 0.045, 0.05, 0.2, toon('#d5d8dc'), cx + 0.08, 0.5, cz - 0.35, 10);
  addCyl(g, 0.045, 0.05, 0.2, toon('#2f4f66'), cx + 0.08, 0.5, cz + 0.15, 10);
}

function buildLedge(g, arch, mats) {
  const z = arch.outer.z0 + arch.wall + 0.12;
  addBox(g, 10.6, 0.06, 0.2, mats.wood, 0.4, 1.08, z);
  const items = [
    [-3.2, '#c9842a'],
    [-1.4, '#e4ddd0'],
    [1.1, '#a33b45'],
    [3.4, '#1f7c76'],
  ];
  for (const [x, color] of items) {
    const tape = addCyl(g, 0.05, 0.05, 0.04, toon(color), x, 1.15, z, 10);
    tape.rotation.x = Math.PI / 2;
  }
}

function buildTrack(g, arch, mats) {
  const spots = [-2.05, 0.95, 3.95];
  for (const x of spots) {
    const head = addBox(g, 0.14, 0.08, 0.1, mats.steelBot, x, arch.beamBottom - 0.08, arch.rigZ);
    head.userData.noCast = true;
    const lens = addCyl(g, 0.04, 0.045, 0.02, mats.metal, x, arch.beamBottom - 0.13, arch.rigZ, 10);
    lens.userData.shade = 'emissive';
    lens.userData.color = '#fff3cf';
  }
  for (const x of [-4.2, 1.2, 6.2]) {
    const head = addBox(g, 0.12, 0.07, 0.09, mats.steelBot, x, arch.beamBottom - 0.08, 0.4);
    head.userData.noCast = true;
    const lens = addCyl(g, 0.035, 0.04, 0.02, mats.metal, x, arch.beamBottom - 0.12, 0.4, 10);
    lens.userData.shade = 'emissive';
    lens.userData.color = '#fff3cf';
  }
}

function buildSigns(g, arch) {
  const innerN = arch.outer.z0 + arch.wall + 0.04;
  makeSign(g, 2.15, 0.78, 6.05, 3.2, innerN, 0, (ctx, w, h) => {
    ctx.fillStyle = '#1c2430';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#c9842a';
    ctx.fillRect(48, 36, 140, 12);
    ctx.fillStyle = '#f6f1e7';
    ctx.font = '700 120px sans-serif';
    ctx.fillText('SPAN ROOM', 48, 190);
    ctx.font = '500 52px sans-serif';
    ctx.fillStyle = '#d5e0ea';
    ctx.fillText('silks  ·  lyra  ·  wait south of the line', 48, 280);
  });
  makeSign(g, 0.9, 0.42, arch.canopy.x0 - 0.05, 1.85, 0.62, -Math.PI / 2, (ctx, w, h) => {
    ctx.fillStyle = '#1c2430';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#f6f1e7';
    ctx.font = '700 92px sans-serif';
    ctx.fillText('WAIT', 64, 150);
    ctx.font = '500 42px sans-serif';
    ctx.fillStyle = '#d5e0ea';
    ctx.fillText('off the mats', 64, 220);
  });
}

function buildWarmupMarks(g, arch, mats) {
  tapeRect(g, -8.55, -5.72, -3.5, 2.3, 0.02, mats.tape);
  const lineZ = arch.lineZ;
  quiet(addBox(g, arch.beamX1 - arch.beamX0, 0.01, 0.045, mats.line, (arch.beamX0 + arch.beamX1) / 2, 0.02, lineZ));
  const roller = arch.roller;
  const roll = addCyl(g, 0.075, 0.075, 0.9, toon('#4d6d8a'), roller.x, 0.075, roller.z, 16);
  roll.rotation.z = Math.PI / 2;
  const coil = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.018, 8, 18), mats.web);
  coil.position.set(-8.62, 1.55, -3.35);
  coil.rotation.y = Math.PI / 2;
  coil.castShadow = true;
  g.add(coil);
  addBox(g, 0.04, 0.16, 0.08, mats.steelBot, -8.78, 1.55, -3.35);
}

function contact(g, x, z, w, d, opacity) {
  const m = addBox(g, w, 0.006, d, toon('#000'), x, 0.016, z);
  m.userData.shade = 'shadow';
  m.userData.opacity = opacity;
  return m;
}

function buildContacts(g, layout) {
  for (const inst of layout.instances) {
    const spec = layout.assets[inst.kind];
    if (!spec || !spec.floor) continue;
    const w = spec.hx * 2 * 0.85;
    const d = spec.hz * 2 * 0.85;
    contact(g, inst.position[0], inst.position[2], Math.max(w, 0.2), Math.max(d, 0.2), inst.kind === 'museum_bench' ? 0.26 : 0.2);
  }
}

function makeProcedural(layout) {
  const g = new THREE.Group();
  const arch = layout.architecture;
  const mats = palette(layout);
  buildBeams(g, arch, mats);
  buildPosts(g, arch, mats);
  for (const station of layout.stations) buildStation(g, station, arch, mats);
  buildCubby(g, arch.cubby, mats);
  buildLedge(g, arch, mats);
  buildTrack(g, arch, mats);
  buildSigns(g, arch);
  buildWarmupMarks(g, arch, mats);
  buildContacts(g, layout);
  const shelf = layout.instances.find((item) => item.id === 'grip_shelf');
  if (shelf) {
    addBox(g, 0.16, 0.05, 0.28, toon('#c9842a'), shelf.position[0] + 0.12, shelf.position[1] + 0.28, shelf.position[2] - 0.12);
    addBox(g, 0.12, 0.08, 0.2, toon('#1f7c76'), shelf.position[0] + 0.12, shelf.position[1] + 0.72, shelf.position[2] + 0.1);
  }
  return g;
}

boot({
  makeShell,
  makeProcedural,
  readyText: 'ready — span room · silks & lyra · drag orbit · U unlit · T toon',
  onReady({ scene, layout }) {
    window.__rigCheck = () => {
      const errors = [];
      for (const station of layout.stations) {
        const obj = scene.getObjectByName(`rig-${station.id}`);
        if (!obj) {
          errors.push(`missing rig ${station.id}`);
          continue;
        }
        const p = new THREE.Vector3();
        obj.getWorldPosition(p);
        if (Math.abs(p.x - station.x) > 0.02 || Math.abs(p.z - station.z) > 0.02) {
          errors.push(`misaligned ${station.id}`);
        }
      }
      return errors;
    };
  },
});
