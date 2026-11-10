import * as THREE from 'three';
import { boot, toon, addBox, addCyl } from './scene_lib.js';

const PAL = {
  pad: '#e7e4dc',
  padDeep: '#d3d0c8',
  joint: '#aeb6be',
  hull: '#b4bcc4',
  hullDark: '#8e98a2',
  floor: '#cfcbc3',
  floorGroove: '#9aa099',
  shell: '#f3f1eb',
  cushion: '#3e7c84',
  cushionDeep: '#2c636a',
  metal: '#c5ccd2',
  led: '#e7f4f8',
  glass: '#d5e6f0',
  cup: '#f4f1ea',
};

const Z0 = -3.22;
const Z1 = 1.52;

function mats() {
  return {
    pad: toon(PAL.pad),
    padDeep: toon(PAL.padDeep),
    joint: toon(PAL.joint),
    hull: toon(PAL.hull),
    hullDark: toon(PAL.hullDark),
    floor: toon(PAL.floor),
    groove: toon(PAL.floorGroove),
    shell: toon(PAL.shell),
    cushion: toon(PAL.cushion),
    cushionDeep: toon(PAL.cushionDeep),
    metal: toon(PAL.metal),
    glass: toon(PAL.glass, { transparent: true, opacity: 0.14, side: THREE.DoubleSide }),
  };
}

function unshaded(mesh) {
  mesh.userData.unshaded = true;
  mesh.castShadow = false;
  mesh.receiveShadow = false;
  return mesh;
}

function labelTexture(text) {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 128;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#e7e4dc';
  ctx.fillRect(0, 0, 512, 128);
  ctx.strokeStyle = '#3e7c84';
  ctx.lineWidth = 8;
  ctx.strokeRect(6, 6, 500, 116);
  ctx.fillStyle = '#3a4550';
  ctx.font = '600 64px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 256, 68);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function placeLabel(parent, text, w, h, x, y, z, rotY) {
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(w, h),
    new THREE.MeshBasicMaterial({ map: labelTexture(text) }),
  );
  mesh.position.set(x, y, z);
  mesh.rotation.y = rotY;
  parent.add(mesh);
  return unshaded(mesh);
}

/** Skin segment. Inner face sits on the chord; thickness grows outward. */
function skin(g, x1, y1, x2, y2, z0, z1, thick, mat) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy) || 0.001;
  const depth = Math.abs(z1 - z0);
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(len + 0.02, thick, depth), mat);
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  let nx = -dy / len;
  let ny = dx / len;
  const toward = nx * (0 - mx) + ny * (1.15 - my);
  if (toward > 0) {
    nx *= -1;
    ny *= -1;
  }
  mesh.position.set(mx + nx * thick * 0.5, my + ny * thick * 0.5, (z0 + z1) / 2);
  mesh.rotation.z = Math.atan2(dy, dx);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  g.add(mesh);
  return { nx: -nx, ny: -ny };
}

function padsOn(g, x1, y1, x2, y2, z0, z1, mat, inset = 0.045) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy) || 0.001;
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  let nx = -dy / len;
  let ny = dx / len;
  if (nx * (0 - mx) + ny * (1.15 - my) < 0) {
    nx *= -1;
    ny *= -1;
  }
  const rot = Math.atan2(dy, dx);
  const bays = [
    [z0 + 0.08, -1.05],
    [-0.85, z1 - 0.08],
  ];
  for (const [a, b] of bays) {
    const depth = Math.abs(b - a);
    if (depth < 0.2) continue;
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(Math.max(0.2, len - 0.08), 0.045, depth - 0.06), mat);
    const cz = (a + b) / 2;
    mesh.position.set(mx + nx * (inset + 0.02), my + ny * (inset + 0.02), cz);
    mesh.rotation.z = rot;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    g.add(mesh);
  }
}

function addHull(g, m) {
  const faces = [
    [[-1.5, 0.1], [-2.02, 0.62]],
    [[-2.02, 0.62], [-2.02, 1.58]],
    [[-2.02, 1.58], [-0.92, 2.32]],
    [[-0.92, 2.32], [0.92, 2.32]],
    [[2.02, 1.05], [2.02, 0.62]],
    [[2.02, 0.62], [1.5, 0.1]],
  ];
  for (const [a, b] of faces) {
    skin(g, a[0], a[1], b[0], b[1], Z0, Z1, 0.12, m.hull);
    padsOn(g, a[0], a[1], b[0], b[1], Z0, Z1, m.pad);
  }
  // section ring at the forward cut — the octagon profile, not a scaffold
  const ring = [
    [[-1.5, 0.1], [-2.02, 0.62]],
    [[-2.02, 0.62], [-2.02, 1.58]],
    [[-2.02, 1.58], [-0.92, 2.32]],
    [[-0.92, 2.32], [0.92, 2.32]],
    [[0.92, 2.32], [2.02, 1.58]],
    [[2.02, 1.58], [2.02, 0.62]],
    [[2.02, 0.62], [1.5, 0.1]],
  ];
  for (const [a, b] of ring) skin(g, a[0], a[1], b[0], b[1], Z1 - 0.02, Z1 + 0.08, 0.07, m.hullDark);

  const floor = addBox(g, 2.9, 0.08, Z1 - Z0, m.floor, 0, 0.05, (Z0 + Z1) / 2);
  floor.receiveShadow = true;
  addBox(g, 3.15, 0.05, Z1 - Z0 + 0.1, m.hull, 0, -0.02, (Z0 + Z1) / 2);
}

function addLeds(g, layout) {
  for (const s of layout.meta.strips) {
    const alongX = s.axis === 'x';
    const recess = addBox(
      g,
      alongX ? s.len : 0.06,
      0.02,
      alongX ? 0.06 : s.len,
      toon(PAL.floorGroove),
      s.x,
      s.y,
      s.z,
    );
    recess.receiveShadow = false;
    const lamp = new THREE.Mesh(
      new THREE.BoxGeometry(alongX ? s.len - 0.04 : 0.032, 0.012, alongX ? 0.032 : s.len - 0.04),
      new THREE.MeshBasicMaterial({ color: s.color }),
    );
    const hang = s.where === 'ceiling' ? -0.04 : 0.02;
    lamp.position.set(s.x, s.y + hang, s.z);
    lamp.name = s.id;
    unshaded(lamp);
    g.add(lamp);
  }
}

function roundedRectShape(w, h, r) {
  const s = new THREE.Shape();
  const x = -w / 2;
  const y = -h / 2;
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y);
  s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r);
  s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h);
  s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r);
  s.quadraticCurveTo(x, y, x + r, y);
  return s;
}

function roundedRectHole(w, h, r) {
  const p = new THREE.Path();
  const x = -w / 2;
  const y = -h / 2;
  p.moveTo(x + r, y);
  p.quadraticCurveTo(x, y, x, y + r);
  p.lineTo(x, y + h - r);
  p.quadraticCurveTo(x, y + h, x + r, y + h);
  p.lineTo(x + w - r, y + h);
  p.quadraticCurveTo(x + w, y + h, x + w, y + h - r);
  p.lineTo(x + w, y + r);
  p.quadraticCurveTo(x + w, y, x + w - r, y);
  p.lineTo(x + r, y);
  return p;
}

function starTexture() {
  const c = document.createElement('canvas');
  c.width = 1024;
  c.height = 1024;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#070b10';
  ctx.fillRect(0, 0, 1024, 1024);
  let s = 20261110;
  const rnd = () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
  for (let i = 0; i < 280; i++) {
    const x = rnd() * 1024;
    const y = rnd() * 1024;
    const v = 170 + Math.floor(rnd() * 80);
    ctx.fillStyle = `rgb(${v},${v},${Math.min(255, v + 18)})`;
    const w = rnd() < 0.08 ? 2 : 1;
    ctx.fillRect(x, y, w, w);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function earthTexture() {
  const w = 1024;
  const h = 512;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');
  const ocean = ctx.createLinearGradient(0, 0, w, 0);
  ocean.addColorStop(0, '#1a4f78');
  ocean.addColorStop(0.45, '#163e66');
  ocean.addColorStop(0.72, '#10283f');
  ocean.addColorStop(1, '#0b1a2a');
  ctx.fillStyle = ocean;
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#3d6d4a';
  ctx.beginPath();
  ctx.moveTo(140, 340);
  ctx.bezierCurveTo(260, 300, 420, 320, 500, 400);
  ctx.bezierCurveTo(420, 500, 220, 490, 140, 340);
  ctx.fill();
  ctx.fillStyle = '#6a7048';
  ctx.beginPath();
  ctx.ellipse(360, 430, 110, 40, -0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(236,242,240,0.7)';
  ctx.beginPath();
  ctx.ellipse(300, 400, 140, 18, -0.1, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(460, 460, 80, 12, 0.25, 0, Math.PI * 2);
  ctx.fill();
  const night = ctx.createLinearGradient(0, 0, w, 0);
  night.addColorStop(0, 'rgba(0,0,0,0.55)');
  night.addColorStop(0.35, 'rgba(0,0,0,0)');
  night.addColorStop(1, 'rgba(0,0,0,0.15)');
  ctx.fillStyle = night;
  ctx.fillRect(0, 0, w, h);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function atmosphereMaterial() {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: THREE.FrontSide,
    blending: THREE.AdditiveBlending,
    uniforms: {
      glowColor: { value: new THREE.Color('#b7e4ff') },
    },
    vertexShader: `
      varying vec3 vNormalW;
      varying vec3 vWorld;
      void main() {
        vec4 w = modelMatrix * vec4(position, 1.0);
        vWorld = w.xyz;
        vNormalW = normalize(mat3(modelMatrix) * normal);
        gl_Position = projectionMatrix * viewMatrix * w;
      }
    `,
    fragmentShader: `
      uniform vec3 glowColor;
      varying vec3 vNormalW;
      varying vec3 vWorld;
      void main() {
        vec3 viewDir = normalize(cameraPosition - vWorld);
        float fres = pow(1.0 - abs(dot(viewDir, normalize(vNormalW))), 1.7);
        gl_FragColor = vec4(glowColor, fres * 1.8);
      }
    `,
  });
}

function addPort(g, m, layout) {
  const win = layout.meta.window;
  const z = Z0 + 0.06;
  const shape = roundedRectShape(win.width + 0.42, win.height + 0.42, 0.18);
  shape.holes.push(roundedRectHole(win.width - 0.08, win.height - 0.06, 0.12));
  const frame = new THREE.Mesh(
    new THREE.ExtrudeGeometry(shape, { depth: 0.12, bevelEnabled: false, curveSegments: 8 }),
    m.joint,
  );
  frame.position.set(win.x, win.y, z);
  g.add(frame);
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(win.width - 0.22, win.height - 0.18), m.glass);
  glass.position.set(win.x, win.y, z - 0.02);
  glass.userData.noCast = true;
  g.add(glass);

  const stars = new THREE.Mesh(
    new THREE.PlaneGeometry(26, 16),
    new THREE.MeshBasicMaterial({ map: starTexture() }),
  );
  stars.position.set(win.x, win.y - 0.2, -20);
  unshaded(stars);
  g.add(stars);

  const earth = new THREE.Mesh(new THREE.SphereGeometry(5.8, 64, 48), new THREE.MeshBasicMaterial({ map: earthTexture() }));
  earth.position.set(-2.8, -4.0, -10.4);
  earth.rotation.y = 0.35;
  unshaded(earth);
  g.add(earth);

  const atmos = new THREE.Mesh(new THREE.SphereGeometry(6.25, 64, 48), atmosphereMaterial());
  atmos.position.copy(earth.position);
  atmos.renderOrder = 2;
  unshaded(atmos);
  g.add(atmos);

  const spill = document.createElement('canvas');
  spill.width = 256;
  spill.height = 256;
  const sctx = spill.getContext('2d');
  const grd = sctx.createRadialGradient(128, 128, 20, 128, 128, 120);
  grd.addColorStop(0, 'rgba(176, 214, 232, 0.72)');
  grd.addColorStop(1, 'rgba(176, 214, 232, 0)');
  sctx.fillStyle = grd;
  sctx.fillRect(0, 0, 256, 256);
  const spillTex = new THREE.CanvasTexture(spill);
  const patch = new THREE.Mesh(
    new THREE.CircleGeometry(1, 28),
    new THREE.MeshBasicMaterial({ map: spillTex, transparent: true, depthWrite: false, color: 0xc5e4f4 }),
  );
  patch.rotation.x = -Math.PI / 2;
  patch.scale.set(1.35, 1.9, 1);
  patch.position.set(0, 0.095, -1.35);
  unshaded(patch);
  g.add(patch);

  const spot = new THREE.SpotLight(0xc5dff0, 7.5, 12, 0.9, 0.5, 1.1);
  spot.position.set(win.x, win.y, -2.7);
  const target = new THREE.Object3D();
  target.position.set(win.x, 0.15, -0.4);
  g.add(spot);
  g.add(target);
  spot.target = target;

  placeLabel(g, 'HAB-03', 0.62, 0.16, win.x, win.y + win.height * 0.5 + 0.2, z + 0.14, 0);
}

function addHandrails(g, m) {
  const portRail = addCyl(g, 0.018, 0.018, 4.05, m.metal, -1.55, 1.95, (Z0 + Z1) / 2 - 0.05, 10);
  portRail.rotation.x = Math.PI / 2;
  for (let z = Z0 + 0.4; z < Z1 - 0.2; z += 1.05) {
    addBox(g, 0.22, 0.02, 0.02, m.metal, -1.72, 1.95, z);
  }
  const stbd = addCyl(g, 0.016, 0.016, 2.2, m.metal, 1.72, 0.95, -0.85, 10);
  stbd.rotation.x = Math.PI / 2;
  addBox(g, 0.16, 0.018, 0.018, m.metal, 1.86, 0.95, -1.7);
  addBox(g, 0.16, 0.018, 0.018, m.metal, 1.86, 0.95, 0.0);
  const lip = addCyl(g, 0.016, 0.016, 1.9, m.metal, -0.05, 0.95, -3.0, 8);
  lip.rotation.z = Math.PI / 2;
}

function addBench(g, m, spec) {
  const grp = new THREE.Group();
  grp.name = spec.id;
  grp.position.set(spec.x, 0, spec.z);
  grp.rotation.y = spec.rot;
  const len = spec.len;
  addBox(grp, len, 0.34, 0.5, m.padDeep, 0, 0.17, 0);
  addBox(grp, len, 0.08, 0.54, m.shell, 0, 0.38, 0.02);
  addBox(grp, len - 0.08, 0.06, 0.46, m.cushion, 0, 0.45, 0.03);
  addBox(grp, len, 0.36, 0.08, m.shell, 0, 0.66, -0.22);
  addBox(grp, len - 0.1, 0.24, 0.045, m.cushionDeep, 0, 0.66, -0.175);
  addBox(grp, 0.08, 0.36, 0.5, m.shell, -len / 2 + 0.02, 0.2, 0);
  addBox(grp, 0.08, 0.36, 0.5, m.shell, len / 2 - 0.02, 0.2, 0);
  g.add(grp);
  return grp;
}

function addTable(g, m, table) {
  const top = new THREE.Mesh(new THREE.CylinderGeometry(0.58, 0.58, 0.07, 40), m.shell);
  top.scale.set(table.sx, 1, table.sz);
  top.position.set(table.x, 0.74, table.z);
  top.castShadow = true;
  top.receiveShadow = true;
  g.add(top);
  const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 0.018, 40), m.cushion);
  rim.scale.set(table.sx, 1, table.sz);
  rim.position.set(table.x, 0.708, table.z);
  g.add(rim);
  addCyl(g, 0.09, 0.13, 0.58, m.metal, table.x, 0.38, table.z, 18);
  addCyl(g, 0.28, 0.3, 0.035, m.metal, table.x, 0.03, table.z, 22);
  for (const [dx, dz] of [[-0.18, -0.08], [0.16, 0.06], [0.02, 0.16]]) {
    addCyl(g, 0.035, 0.04, 0.07, toon(PAL.cup), table.x + dx, 0.81, table.z + dz, 12);
    addCyl(g, 0.037, 0.037, 0.012, m.cushion, table.x + dx, 0.8, table.z + dz, 12);
  }
}

function addLockers(g, m, layout) {
  const faceX = -1.9;
  for (const spec of layout.meta.lockers) {
    const z = spec.z;
    const w = 0.56;
    const h = 0.86;
    const y = 1.1;
    addBox(g, 0.14, h - 0.04, w - 0.08, m.padDeep, faceX - 0.08, y, z);
    addBox(g, 0.025, h + 0.02, 0.03, m.joint, faceX + 0.01, y, z - w / 2);
    addBox(g, 0.025, h + 0.02, 0.03, m.joint, faceX + 0.01, y, z + w / 2);
    const pivot = new THREE.Group();
    pivot.position.set(faceX, y, z - (w - 0.08) / 2);
    pivot.rotation.y = spec.open ? -1.2 : 0;
    g.add(pivot);
    const doorW = w - 0.1;
    const doorH = h - 0.06;
    addBox(pivot, 0.02, doorH, doorW, m.pad, 0, 0, doorW / 2);
    addBox(pivot, 0.012, doorH - 0.12, doorW - 0.08, m.shell, 0.012, 0, doorW / 2);
    addCyl(pivot, 0.012, 0.012, 0.14, m.metal, 0.02, -0.08, doorW - 0.08, 8);
    placeLabel(pivot, spec.id, 0.18, 0.05, 0.03, doorH * 0.32, 0.16, Math.PI / 2);
    if (spec.open) {
      addBox(g, 0.08, 0.018, w - 0.18, m.metal, faceX - 0.06, 1.28, z);
      addBox(g, 0.08, 0.018, w - 0.18, m.metal, faceX - 0.06, 0.86, z);
      addBox(g, 0.05, 0.05, 0.26, m.cushionDeep, faceX - 0.05, 0.9, z);
      addCyl(g, 0.028, 0.032, 0.06, toon(PAL.cup), faceX - 0.05, 1.32, z, 10);
    }
  }
  placeLabel(g, 'STOW', 0.38, 0.09, -1.78, 1.62, -2.62, Math.PI / 2);
}

function addGalley(g, m) {
  addBox(g, 0.38, 0.82, 0.9, m.padDeep, 1.7, 0.41, -2.55);
  addBox(g, 0.035, 0.72, 0.4, m.shell, 1.5, 0.46, -2.75);
  addBox(g, 0.035, 0.72, 0.38, m.shell, 1.5, 0.46, -2.32);
  addBox(g, 0.42, 0.035, 0.94, m.shell, 1.68, 0.84, -2.55);
  addCyl(g, 0.045, 0.055, 0.2, m.metal, 1.5, 0.96, -2.7, 10);
  addCyl(g, 0.04, 0.045, 0.14, m.cushion, 1.5, 0.93, -2.38, 10);
  placeLabel(g, 'GALLEY', 0.42, 0.1, 1.46, 0.62, -2.55, -Math.PI / 2);
}

function addPlant(g, m) {
  addCyl(g, 0.08, 0.1, 0.12, m.padDeep, 1.5, 0.92, -2.55, 12);
  addCyl(g, 0.01, 0.014, 0.16, toon('#3e5344'), 1.5, 1.06, -2.55, 8);
  addBox(g, 0.16, 0.1, 0.14, toon('#3f6b48'), 1.5, 1.16, -2.55);
}

function makeShell(layout) {
  const g = new THREE.Group();
  g.name = 'shell';
  const m = mats();
  addHull(g, m);
  addPort(g, m, layout);
  addHandrails(g, m);
  addLeds(g, layout);
  return g;
}

function makeProcedural(layout) {
  const g = new THREE.Group();
  g.name = 'procedural';
  const m = mats();
  for (const bench of layout.meta.benches) addBench(g, m, bench);
  addTable(g, m, layout.meta.table);
  addLockers(g, m, layout);
  addGalley(g, m);
  addPlant(g, m);
  placeLabel(g, 'MESS', 0.4, 0.1, 0, 0.16, -0.15, 0);
  return g;
}

boot({
  makeShell,
  makeProcedural,
  readyText: 'ready — orbital mess · drag orbit · U unlit · T toon',
});
