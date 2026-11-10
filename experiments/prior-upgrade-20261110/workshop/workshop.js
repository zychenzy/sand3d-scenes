import * as THREE from 'three';
import { boot, toon, addBox, addCyl } from './scene_lib.js';

const WOOD = '#8a572e';
const WOOD_LT = '#c9a56c';
const WOOD_DK = '#5a3820';
const IRON = '#3a3632';
const CLAY = '#a78468';
const CLAY_DK = '#7c624f';
const BUFF = '#d7c2a4';
const PORCELAIN = '#f0e6d8';
const STEEL = '#6a7076';

const BRICK_COLORS = ['#8d4b38', '#7b4032', '#9a5640', '#6e382c', '#a15c44', '#814536', '#94513c', '#7a3e2c'];

const PROFILES = {
  bowl: [[0.02, 0], [0.1, 0.012], [0.145, 0.055], [0.155, 0.09], [0.13, 0.1], [0.09, 0.055], [0.035, 0.02], [0.012, 0.016]],
  cup: [[0.03, 0], [0.048, 0.01], [0.055, 0.1], [0.05, 0.112], [0.04, 0.1], [0.034, 0.02], [0.012, 0.014]],
  cylinder: [[0.045, 0], [0.062, 0.012], [0.068, 0.16], [0.06, 0.175], [0.048, 0.16], [0.04, 0.02], [0.015, 0.016]],
  bottle: [[0.035, 0], [0.07, 0.03], [0.09, 0.12], [0.072, 0.2], [0.034, 0.27], [0.04, 0.31], [0.028, 0.32], [0.02, 0.26], [0.045, 0.14], [0.02, 0.03]],
  vase: [[0.04, 0], [0.08, 0.04], [0.1, 0.14], [0.07, 0.24], [0.055, 0.3], [0.062, 0.33], [0.04, 0.325], [0.03, 0.22], [0.05, 0.06], [0.018, 0.02]],
  jar: [[0.05, 0], [0.09, 0.02], [0.11, 0.1], [0.105, 0.2], [0.07, 0.25], [0.078, 0.27], [0.05, 0.26], [0.04, 0.12], [0.02, 0.03]],
  plate: [[0.02, 0], [0.13, 0.008], [0.145, 0.02], [0.12, 0.028], [0.04, 0.012], [0.015, 0.008]],
};

function findInstance(layout, id) {
  const inst = (layout.instances || []).find((item) => item.id === id);
  if (!inst) throw new Error(`missing instance ${id}`);
  return inst;
}

function vessel(kind, color, scale = 1) {
  const pts = PROFILES[kind];
  if (!pts) throw new Error(`unknown vessel ${kind}`);
  const mesh = new THREE.Mesh(
    new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), 18),
    toon(color, { side: THREE.DoubleSide })
  );
  mesh.scale.setScalar(scale);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function mug(color, scale = 1, handleRot = 0) {
  const g = new THREE.Group();
  g.add(vessel('cup', color, 1));
  const handle = new THREE.Mesh(new THREE.TorusGeometry(0.03, 0.007, 6, 12), toon(color));
  handle.position.set(0.058, 0.058, 0);
  handle.rotation.y = Math.PI / 2;
  handle.castShadow = true;
  g.add(handle);
  g.scale.setScalar(scale);
  g.rotation.y = handleRot;
  return g;
}

function contactDisc(parent, x, z, rx, rz, opacity = 0.24) {
  const mesh = new THREE.Mesh(
    new THREE.CircleGeometry(1, 18),
    new THREE.MeshBasicMaterial({
      color: 0x2a211c,
      transparent: true,
      opacity,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
    })
  );
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set(x, 0.012, z);
  mesh.scale.set(rx, rz, 1);
  mesh.userData.keepBasic = true;
  mesh.renderOrder = 3;
  parent.add(mesh);
}

function hash01(n) {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

let sharedBrickMat = null;
function brickMaterial() {
  if (!sharedBrickMat) sharedBrickMat = toon('#ffffff');
  return sharedBrickMat;
}

function addBrickFace(parent, { cx, cy, cz, width, height, depth = 0.04, rotY = 0, brickW = 0.19, brickH = 0.052, gap = 0.008, skip, cast = true }) {
  const stepU = brickW + gap;
  const stepV = brickH + gap;
  const cols = Math.ceil(width / stepU) + 2;
  const rows = Math.max(1, Math.floor((height + 0.001) / stepV));
  const cells = [];
  for (let row = 0; row < rows; row++) {
    const off = row % 2 ? stepU * 0.5 : 0;
    for (let col = -1; col < cols; col++) {
      const u = -width / 2 + brickW / 2 + col * stepU + off;
      if (u < -width / 2 + brickW * 0.3 || u > width / 2 - brickW * 0.3) continue;
      const v = -height / 2 + brickH / 2 + row * stepV;
      if (v > height / 2 - brickH * 0.25) continue;
      if (skip && skip(u, v)) continue;
      cells.push([u, v, row * 13 + col * 5 + Math.round(cx * 10)]);
    }
  }
  if (!cells.length) return;
  const mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(brickW, brickH, depth), brickMaterial(), cells.length);
  mesh.frustumCulled = false;
  mesh.userData.castShadow = cast;
  mesh.receiveShadow = true;
  const dummy = new THREE.Object3D();
  const color = new THREE.Color();
  cells.forEach(([u, v, h], i) => {
    dummy.position.set(u, v, 0);
    dummy.rotation.set(0, 0, 0);
    dummy.scale.set(1, 1, 1);
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
    color.set(BRICK_COLORS[Math.abs(h) % BRICK_COLORS.length]);
    mesh.setColorAt(i, color);
  });
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  const holder = new THREE.Group();
  holder.position.set(cx, cy, cz);
  holder.rotation.y = rotY;
  holder.add(mesh);
  parent.add(holder);
}

function bulb(parent, x, y, z, color = '#ffd2a4') {
  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(0.032, 10, 8),
    toon(color, { emissive: color, emissiveIntensity: 1.35 })
  );
  mesh.position.set(x, y, z);
  mesh.userData.castShadow = false;
  parent.add(mesh);
  return mesh;
}

function labelTexture(title, lines) {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 320;
  const g = c.getContext('2d');
  g.fillStyle = '#f3e6d2';
  g.fillRect(0, 0, 512, 320);
  g.strokeStyle = '#6a4328';
  g.lineWidth = 14;
  g.strokeRect(10, 10, 492, 300);
  g.fillStyle = '#3a291e';
  g.font = '700 52px sans-serif';
  g.textAlign = 'left';
  g.textBaseline = 'alphabetic';
  g.fillText(title, 36, 78);
  g.font = '500 34px sans-serif';
  lines.forEach((line, i) => g.fillText(line, 36, 148 + i * 50));
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function claySplat(parent, x, y, z, r, rotY = 0) {
  const splat = new THREE.Mesh(new THREE.CircleGeometry(r, 8), toon('#a87858'));
  splat.position.set(x, y, z);
  splat.rotation.y = rotY;
  splat.userData.castShadow = false;
  parent.add(splat);
}

function lump(parent, x, y, z, rad, color, sx = 1.1, sy = 0.62, sz = 0.95) {
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(rad, 10, 8), toon(color));
  mesh.scale.set(sx, sy, sz);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  parent.add(mesh);
  return mesh;
}

function bucket(parent, x, y, z, body, fill, r = 0.16, h = 0.28) {
  addCyl(parent, r, r * 0.92, h, toon(body), x, y + h / 2, z, 14);
  addCyl(parent, r * 0.78, r * 0.78, 0.02, toon(fill), x, y + h - 0.02, z, 12);
  addCyl(parent, 0.012, 0.012, r * 1.3, toon('#555'), x, y + h + 0.04, z, 6).rotation.z = Math.PI / 2;
}

function lowStool(parent, x, z, rotY) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  g.rotation.y = rotY;
  addCyl(g, 0.155, 0.16, 0.04, toon(WOOD_LT), 0, 0.46, 0, 16);
  addCyl(g, 0.145, 0.145, 0.012, toon('#6e5344'), 0, 0.484, 0, 16);
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    addCyl(g, 0.018, 0.022, 0.44, toon(WOOD_DK), Math.cos(a) * 0.11, 0.22, Math.sin(a) * 0.11, 6);
  }
  addCyl(g, 0.125, 0.125, 0.018, toon(WOOD), 0, 0.14, 0, 14);
  parent.add(g);
  contactDisc(parent, x, z, 0.22, 0.22, 0.22);
}

function splashPan(parent) {
  const pts = [
    [0.05, 0],
    [0.3, 0.005],
    [0.36, 0.04],
    [0.37, 0.11],
    [0.31, 0.125],
    [0.16, 0.05],
    [0.06, 0.03],
  ];
  const mesh = new THREE.Mesh(
    new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), 22),
    toon('#6a645c', { side: THREE.DoubleSide })
  );
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
}

function potteryWheel(parent, x, z, rotY, state) {
  const g = new THREE.Group();
  g.name = `potteryWheel-${state}`;
  g.position.set(x, 0, z);
  g.rotation.y = rotY;
  const iron = toon(IRON);
  addCyl(g, 0.34, 0.36, 0.05, iron, 0, 0.03, 0, 20);
  addCyl(g, 0.07, 0.08, 0.34, iron, 0, 0.22, 0, 10);
  addBox(g, 0.28, 0.16, 0.22, toon('#4a453f'), 0, 0.16, 0.02);
  addBox(g, 0.06, 0.04, 0.02, toon('#c4553a'), 0.1, 0.2, 0.13);
  const pan = new THREE.Group();
  pan.position.y = 0.34;
  splashPan(pan);
  g.add(pan);
  addCyl(g, 0.155, 0.155, 0.028, iron, 0, 0.5, 0, 20);
  addCyl(g, 0.125, 0.125, 0.012, toon('#e7dcc8'), 0, 0.518, 0, 18);
  if (state === 'throwing') {
    const pot = vessel('cylinder', '#b08968', 0.92);
    pot.position.y = 0.53;
    g.add(pot);
    addCyl(g, 0.018, 0.02, 0.012, toon('#d8c8b4'), 0, 0.7, 0, 8);
  } else if (state === 'centering') {
    lump(g, 0, 0.56, 0, 0.07, '#9a7860', 1.05, 0.72, 1.05);
  } else {
    addCyl(g, 0.05, 0.055, 0.03, toon(CLAY), 0.02, 0.545, 0.02, 10);
  }
  addCyl(g, 0.045, 0.05, 0.035, toon('#d2cdc4'), 0.22, 0.5, 0.02, 10);
  const sponge = new THREE.Mesh(new THREE.SphereGeometry(0.028, 8, 6), toon('#d8b45a'));
  sponge.scale.set(1.1, 0.55, 0.8);
  sponge.position.set(0.2, 0.49, 0.08);
  g.add(sponge);
  addBox(g, 0.14, 0.02, 0.08, toon('#2e2c2a'), 0, 0.02, 0.42);
  bucket(g, 0.38, 0, 0.18, '#8a9096', '#7a9aaa', 0.07, 0.12);
  parent.add(g);
  contactDisc(parent, x, z, 0.4, 0.4, 0.28);
}

function pegboard(parent) {
  const g = new THREE.Group();
  g.position.set(-5.02, 1.72, 0.35);
  addBox(g, 0.04, 1.35, 3.55, toon('#c4a06a'), 0, 0, 0);
  for (let i = 0; i < 9; i++) {
    for (let j = 0; j < 5; j++) {
      addCyl(g, 0.008, 0.008, 0.03, toon('#5a4030'), 0.02, -0.5 + j * 0.26, -1.5 + i * 0.36, 6).rotation.z = Math.PI / 2;
    }
  }
  const ribs = [-1.45, -1.1, -0.75, -0.4, 0.45, 0.8, 1.15, 1.5];
  ribs.forEach((z, i) => {
    const rib = addCyl(g, 0.012, 0.016, 0.3, toon(i % 2 ? WOOD_DK : WOOD), 0.05, 0.18 - (i % 3) * 0.04, z, 8);
    rib.rotation.z = 0.18;
    addBox(g, 0.04, 0.09, 0.05, toon('#d8c8b0'), 0.06, 0.34, z);
  });
  for (const z of [-0.12, 0.12, 0.28]) {
    addCyl(g, 0.004, 0.004, 0.24, toon('#222'), 0.06, -0.02, z, 6).rotation.z = Math.PI / 2;
  }
  const sponge = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 6), toon('#e0b84e'));
  sponge.scale.y = 0.5;
  sponge.position.set(0.06, -0.38, 0.4);
  g.add(sponge);
  addBox(g, 0.02, 0.42, 0.28, toon('#c5d0d8'), 0.05, -0.12, -1.7);
  const hung = vessel('bowl', '#c4a27a', 0.7);
  hung.position.set(0.08, -0.22, 1.72);
  g.add(hung);
  parent.add(g);
}

function slabRoller(parent, x, z) {
  const g = new THREE.Group();
  g.name = 'slabRoller';
  g.position.set(x, 0, z);
  const top = 0.82;
  addBox(g, 1.72, 0.06, 0.62, toon(WOOD_LT), 0, top, 0);
  addBox(g, 1.68, 0.04, 0.58, toon('#d8cbb6'), 0, top + 0.04, 0);
  for (const [lx, lz] of [[-0.74, -0.24], [0.74, -0.24], [-0.74, 0.24], [0.74, 0.24]]) {
    addBox(g, 0.06, top, 0.06, toon(WOOD_DK), lx, top / 2, lz);
  }
  addBox(g, 1.7, 0.05, 0.04, toon(IRON), 0, top + 0.16, -0.28);
  addBox(g, 1.7, 0.05, 0.04, toon(IRON), 0, top + 0.16, 0.28);
  addCyl(g, 0.07, 0.07, 1.55, toon(STEEL), 0.05, top + 0.16, 0, 14).rotation.z = Math.PI / 2;
  addCyl(g, 0.02, 0.02, 0.18, toon(IRON), 0.86, top + 0.16, 0.12, 8).rotation.x = Math.PI / 2;
  addCyl(g, 0.035, 0.035, 0.04, toon('#2a2a2a'), 0.86, top + 0.16, 0.22, 10).rotation.x = Math.PI / 2;
  addBox(g, 0.72, 0.012, 0.38, toon('#b08968'), -0.18, top + 0.055, 0.02);
  lump(g, 0.42, top + 0.08, 0.04, 0.07, CLAY_DK, 1.2, 0.55, 0.9);
  addBox(g, 0.22, 0.02, 0.32, toon(WOOD), -0.72, top + 0.06, 0);
  parent.add(g);
  contactDisc(parent, x, z, 0.9, 0.38, 0.2);
}

function reclaimHopper(parent) {
  const g = new THREE.Group();
  g.name = 'reclaimHopper';
  g.position.set(-4.72, 0, -2.05);
  addCyl(g, 0.22, 0.18, 0.55, toon('#6a7178'), 0, 0.52, 0, 12);
  addCyl(g, 0.28, 0.22, 0.16, toon('#5a6066'), 0, 0.86, 0, 12);
  lump(g, 0.02, 0.96, 0.01, 0.12, CLAY_DK, 1.15, 0.55, 1.05);
  addBox(g, 0.08, 0.04, 0.18, toon(IRON), 0.26, 0.42, 0);
  addCyl(g, 0.05, 0.05, 0.06, toon('#3a3a3a'), 0, 0.22, 0, 10);
  parent.add(g);
  contactDisc(parent, -4.72, -2.05, 0.28, 0.24, 0.22);
}

function clayPrep(parent, layout) {
  const g = new THREE.Group();
  g.name = 'clayPrep';
  const table = findInstance(layout, 'wedge_table');
  const s = 0.76 / 1.184;
  const sc = table.scale;
  const w = 1.2 * s * sc[0];
  const d = 1.2 * s * sc[2];
  const tx = table.position[0];
  const tz = table.position[2];
  const top = 0.76;

  addBox(g, w * 0.58, 0.018, d * 0.55, toon('#e6ddcf'), tx + 0.08, top + 0.012, tz + 0.02);
  [[-0.1, 0.04, 0.1], [0.14, -0.05, 0.075], [0.02, 0.1, 0.06]].forEach(([dx, dz, rad], i) => {
    lump(g, tx + 0.08 + dx, top + 0.05, tz + dz, rad, [CLAY_DK, '#8d6d58', '#b08968'][i]);
  });
  const wire = addCyl(g, 0.004, 0.004, 0.32, toon('#222'), tx + 0.24, top + 0.04, tz + 0.06, 4);
  wire.rotation.z = Math.PI / 2;
  addCyl(g, 0.012, 0.012, 0.05, toon(WOOD), tx + 0.1, top + 0.04, tz + 0.06, 6);
  addCyl(g, 0.012, 0.012, 0.05, toon(WOOD), tx + 0.4, top + 0.04, tz + 0.06, 6);

  for (let i = 0; i < 6; i++) {
    addCyl(g, 0.13, 0.13, 0.012, toon(i % 2 ? '#efe6d6' : '#e2d5c2'), tx - w / 2 - 0.2, 0.02 + i * 0.014, tz + 0.08, 14);
  }

  const bags = [
    [-4.95, 0, -3.72],
    [-4.82, 0, -3.4],
    [-4.98, 0, -3.08],
    [-4.88, 0.24, -3.58],
    [-4.86, 0.24, -3.22],
  ];
  bags.forEach(([x, y, z], i) => {
    addBox(g, 0.36, 0.22, 0.26, toon(i % 2 ? '#e4d8c4' : '#d9cbb4'), x, y + 0.11, z);
    addBox(g, 0.37, 0.04, 0.08, toon('#8a4a32'), x, y + 0.16, z);
  });

  const sink = new THREE.Group();
  sink.position.set(-4.95, 0, -0.15);
  addBox(sink, 0.44, 0.72, 0.62, toon('#8e9490'), 0, 0.36, 0);
  addBox(sink, 0.38, 0.05, 0.54, toon('#c5ccc8'), 0.02, 0.74, 0);
  addBox(sink, 0.26, 0.05, 0.36, toon('#7f8c90'), 0.05, 0.77, 0);
  addCyl(sink, 0.012, 0.012, 0.16, toon('#888'), 0.02, 0.92, -0.12, 6);
  addBox(sink, 0.08, 0.02, 0.03, toon('#777'), 0.06, 0.86, -0.12);
  g.add(sink);

  bucket(g, -4.62, 0, -0.95, '#6a7178', '#8d7464', 0.16, 0.28);
  bucket(g, -4.38, 0, -0.62, '#c8c2b8', '#b7c0c6', 0.14, 0.24);

  const hoseCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-4.9, 0.86, -0.28),
    new THREE.Vector3(-4.62, 0.42, -0.55),
    new THREE.Vector3(-4.55, 0.18, -0.78),
    new THREE.Vector3(-4.62, 0.28, -0.95),
  ]);
  const hose = new THREE.Mesh(new THREE.TubeGeometry(hoseCurve, 14, 0.012, 6, false), toon('#2f3438'));
  hose.castShadow = true;
  g.add(hose);

  const boards = new THREE.Group();
  boards.position.set(-4.95, 0, 2.85);
  for (let i = 0; i < 4; i++) {
    const b = addBox(boards, 0.02, 0.72, 0.42, toon(i % 2 ? '#d7c4a2' : WOOD_LT), 0.03 + i * 0.03, 0.4, 0);
    b.rotation.z = -0.18;
    b.rotation.y = 0.04 * i;
  }
  g.add(boards);

  const broom = new THREE.Group();
  broom.position.set(-4.55, 0, 2.35);
  broom.rotation.z = 0.16;
  addCyl(broom, 0.012, 0.014, 1.22, toon(WOOD_LT), 0, 0.68, 0, 6);
  addBox(broom, 0.22, 0.16, 0.05, toon('#c2a15a'), 0, 0.1, 0);
  g.add(broom);

  parent.add(g);
  contactDisc(parent, tx, tz, w * 0.48, d * 0.48, 0.2);
}

function handbuildTable(parent, layout) {
  const hb = layout.procedural.handbuild;
  const [x, z] = hb.position;
  const [w, d] = hb.size;
  const g = new THREE.Group();
  g.name = 'handbuild';
  g.position.set(x, 0, z);
  const top = 0.76;
  addBox(g, w, 0.06, d, toon(WOOD_LT), 0, top, 0);
  addBox(g, w - 0.08, 0.05, d - 0.1, toon(WOOD), 0, 0.34, 0);
  for (const [lx, lz] of [[-w / 2 + 0.08, -d / 2 + 0.08], [w / 2 - 0.08, -d / 2 + 0.08], [-w / 2 + 0.08, d / 2 - 0.08], [w / 2 - 0.08, d / 2 - 0.08]]) {
    addBox(g, 0.06, top, 0.06, toon(WOOD_DK), lx, top / 2, lz);
  }
  addBox(g, 0.55, 0.012, 0.4, toon('#e8ddd0'), -0.08, top + 0.04, -0.35);
  addBox(g, 0.42, 0.01, 0.28, toon('#b08968'), 0.12, top + 0.04, 0.15);
  addBox(g, 0.32, 0.01, 0.22, toon('#c4a27a'), -0.22, top + 0.04, 0.08);
  lump(g, -0.18, top + 0.08, 0.42, 0.08, CLAY, 1.2, 0.5, 0.95);
  lump(g, 0.22, top + 0.07, 0.38, 0.055, CLAY_DK, 1.15, 0.48, 0.9);
  const coil = vessel('bowl', '#c4a27a', 0.85);
  coil.position.set(0.18, top + 0.03, -0.55);
  g.add(coil);
  const mugA = mug('#d2b294', 0.9, 0.4);
  mugA.position.set(-0.22, top + 0.02, -0.62);
  g.add(mugA);
  addCyl(g, 0.07, 0.075, 0.05, toon('#cfd6d2'), 0.28, top + 0.05, -0.22, 12);
  const pin = addCyl(g, 0.018, 0.02, 0.42, toon(WOOD), 0.22, top + 0.05, 0.55, 8);
  pin.rotation.z = Math.PI / 2;
  pin.rotation.y = 0.4;
  addBox(g, 0.12, 0.04, 0.08, toon('#c46a45'), -0.28, top + 0.05, 0.62);
  for (let i = 0; i < 3; i++) {
    const rib = addCyl(g, 0.008, 0.012, 0.16, toon(WOOD_DK), 0.28, top + 0.04, -0.15 + i * 0.08, 6);
    rib.rotation.z = Math.PI / 2;
    rib.rotation.y = 0.2 * i;
  }
  parent.add(g);
  contactDisc(parent, x, z, w * 0.52, d * 0.52, 0.2);
}

function dryingRack(parent, x, z) {
  const g = new THREE.Group();
  g.name = 'dryingRack';
  g.position.set(x, 0, z);
  const postX = [-1.12, -0.28, 0.52, 1.12];
  for (const px of postX) {
    addBox(g, 0.06, 1.92, 0.06, toon(WOOD), px, 0.96, 0);
    addBox(g, 0.06, 1.92, 0.06, toon(WOOD_DK), px, 0.96, -0.22);
  }
  addBox(g, 2.32, 0.06, 0.06, toon(WOOD_DK), 0, 1.9, -0.1);
  addBox(g, 2.32, 0.05, 0.06, toon(WOOD_DK), 0, 0.08, -0.1);
  const shelves = [
    { y: 0.36, boards: [[-1.05, 2.0]] },
    { y: 0.78, boards: [[-0.92, 1.12], [0.68, 0.82]] },
    { y: 1.2, boards: [[-0.62, 1.62]] },
    { y: 1.62, boards: [[-0.7, 0.92]] },
  ];
  for (const shelf of shelves) {
    for (const [cx, len] of shelf.boards) {
      addBox(g, len, 0.025, 0.42, toon(WOOD_LT), cx, shelf.y, -0.04);
    }
  }
  const ware = [
    { y: 0.38, x: -0.92, kind: 'bowl', color: '#c4a27a', s: 1.05 },
    { y: 0.38, x: -0.48, kind: 'cylinder', color: '#a67c5d', s: 0.95 },
    { y: 0.38, x: -0.12, mug: true, color: '#b08968', s: 1, rot: 0.6 },
    { y: 0.38, x: 0.28, kind: 'plate', color: BUFF, s: 1 },
    { y: 0.38, x: 0.68, kind: 'jar', color: '#8d6a52', s: 0.9 },
    { y: 0.38, x: 0.98, kind: 'bowl', color: '#d2b294', s: 0.8 },
    { y: 0.805, x: -0.95, mug: true, color: PORCELAIN, s: 0.95, rot: 1.2 },
    { y: 0.805, x: -0.62, mug: true, color: '#e6d5c3', s: 0.9, rot: -0.4 },
    { y: 0.805, x: -0.32, kind: 'cup', color: '#c9b39a', s: 1 },
    { y: 0.805, x: 0.52, kind: 'vase', color: '#b99678', s: 0.85 },
    { y: 0.805, x: 0.92, kind: 'bowl', color: '#a67d5c', s: 0.9 },
    { y: 1.225, x: -0.88, kind: 'bottle', color: '#cbb296', s: 0.8 },
    { y: 1.225, x: -0.42, kind: 'vase', color: '#9a7358', s: 0.75 },
    { y: 1.225, x: 0.05, kind: 'cylinder', color: BUFF, s: 0.7 },
    { y: 1.645, x: -0.86, kind: 'bowl', color: '#e7d7c4', s: 0.7 },
    { y: 1.645, x: -0.52, kind: 'bowl', color: '#c4a27a', s: 0.62 },
    { y: 1.645, x: -0.2, kind: 'jar', color: '#d8c4aa', s: 0.55 },
  ];
  for (const item of ware) {
    const mesh = item.mug ? mug(item.color, item.s, item.rot || 0) : vessel(item.kind, item.color, item.s);
    mesh.position.set(item.x, item.y, -0.02);
    g.add(mesh);
  }
  const clothA = addBox(g, 0.42, 0.012, 0.36, toon('#d9e2ea'), -0.12, 0.82, -0.02);
  clothA.rotation.z = 0.08;
  clothA.rotation.x = 0.15;
  const clothB = addBox(g, 0.28, 0.01, 0.3, toon('#c5d2dc'), 0.05, 0.8, 0.02);
  clothB.rotation.z = -0.2;
  parent.add(g);
  contactDisc(parent, x, z, 1.22, 0.32, 0.18);
}

function kilnAlcove(parent, x, z) {
  const g = new THREE.Group();
  g.name = 'kilnAlcove';
  g.position.set(x, 0, z);
  const bodyW = 1.18;
  const bodyD = 1.02;
  const bodyH = 1.32;
  const hearthH = 0.1;
  const bodyY = hearthH + bodyH / 2;
  addBox(g, bodyW + 0.2, hearthH, bodyD + 0.14, toon('#5c342c'), 0, hearthH / 2, 0);
  addBox(g, bodyW - 0.04, bodyH, bodyD - 0.04, toon('#6a3428'), 0, bodyY, 0);

  const doorSkip = (u, v) => {
    const y = v + 0.06;
    if (y < -0.02 && y > -0.56 && Math.abs(u) < 0.25) return true;
    if (y >= -0.02 && y < 0.24) {
      const yy = y + 0.02;
      const half = Math.sqrt(Math.max(0, 0.25 * 0.25 - yy * yy));
      return Math.abs(u) < half - 0.02;
    }
    return false;
  };
  addBrickFace(g, { cx: 0, cy: bodyY, cz: bodyD / 2 + 0.02, width: bodyW, height: bodyH, rotY: 0, skip: doorSkip });
  addBrickFace(g, { cx: bodyW / 2 + 0.02, cy: bodyY, cz: 0, width: bodyD, height: bodyH, rotY: Math.PI / 2 });
  addBrickFace(g, { cx: -bodyW / 2 - 0.02, cy: bodyY, cz: 0, width: bodyD, height: bodyH, rotY: -Math.PI / 2 });
  addBox(g, bodyW + 0.06, 0.06, bodyD + 0.06, toon('#4a4038'), 0, hearthH + 0.04, 0);
  addBox(g, bodyW + 0.08, 0.06, bodyD + 0.08, toon('#2e2a26'), 0, hearthH + bodyH + 0.04, 0);

  const fireMat = toon('#ff6a2a', { emissive: '#ff5a1e', emissiveIntensity: 1.6 });
  const coreMat = toon('#ffb15a', { emissive: '#ffd29a', emissiveIntensity: 1.8 });
  const fire = addBox(g, 0.4, 0.5, 0.06, fireMat, -0.02, 0.72, bodyD / 2 - 0.02);
  fire.userData.castShadow = false;
  const core = addBox(g, 0.22, 0.26, 0.03, coreMat, -0.02, 0.72, bodyD / 2 + 0.005);
  core.userData.castShadow = false;
  addBox(g, 0.55, 0.02, 0.4, toon('#2a2422'), 0, 0.5, 0.08);
  addBox(g, 0.55, 0.02, 0.4, toon('#2a2422'), 0, 0.9, 0.08);
  const innerPot = vessel('bowl', '#5c4034', 0.7);
  innerPot.position.set(0.05, 0.52, 0.08);
  g.add(innerPot);

  const hinge = new THREE.Group();
  hinge.position.set(-0.26, 0.74, bodyD / 2 + 0.06);
  hinge.rotation.y = -0.92;
  addBox(hinge, 0.5, 0.72, 0.045, toon('#2c2926'), 0.25, 0, 0);
  addBox(hinge, 0.5, 0.04, 0.05, toon('#1c1a18'), 0.25, 0.28, 0);
  addBox(hinge, 0.5, 0.04, 0.05, toon('#1c1a18'), 0.25, -0.28, 0);
  const peep = addCyl(hinge, 0.035, 0.035, 0.04, toon('#ffb15a', { emissive: '#ff9a4a', emissiveIntensity: 1.4 }), 0.42, 0.08, 0.03, 10);
  peep.rotation.x = Math.PI / 2;
  peep.userData.castShadow = false;
  g.add(hinge);
  const arch = new THREE.Mesh(new THREE.TorusGeometry(0.26, 0.028, 8, 18, Math.PI), toon('#2a2724'));
  arch.position.set(0, 0.98, bodyD / 2 + 0.07);
  arch.castShadow = true;
  g.add(arch);
  addBox(g, 0.05, 0.7, 0.05, toon('#2a2724'), -0.26, 0.66, bodyD / 2 + 0.06);
  addBox(g, 0.05, 0.7, 0.05, toon('#2a2724'), 0.26, 0.66, bodyD / 2 + 0.05);

  addCyl(g, 0.14, 0.16, 0.68, toon('#7a4636'), 0.16, bodyH + hearthH + 0.36, -0.12, 10);
  addCyl(g, 0.1, 0.12, 0.52, toon('#4a4e52'), 0.16, bodyH + hearthH + 0.92, -0.12, 10);
  addCyl(g, 0.16, 0.16, 0.05, toon(IRON), 0.16, 2.68, -0.12, 10);

  addBox(g, 0.16, 0.22, 0.1, toon('#23262b'), bodyW / 2 + 0.08, 1.12, 0.05);
  const led = new THREE.Mesh(new THREE.SphereGeometry(0.018, 8, 6), toon('#ffb020', { emissive: '#ffb020', emissiveIntensity: 1.5 }));
  led.position.set(bodyW / 2 + 0.14, 1.02, 0.05);
  led.userData.castShadow = false;
  g.add(led);

  [[-0.42, 0.12], [-0.34, 0.14], [-0.26, 0.11]].forEach(([lx, h], i) => {
    const cone = new THREE.Mesh(new THREE.ConeGeometry(0.018, h, 8), toon(i === 1 ? '#f0e2c8' : '#e4d2b8'));
    cone.position.set(lx, hearthH + h / 2, bodyD / 2 + 0.1);
    g.add(cone);
  });

  parent.add(g);
  contactDisc(parent, x, z, 0.78, 0.68, 0.3);

  const cart = new THREE.Group();
  cart.position.set(x - 0.52, 0, z + 1.08);
  for (const [lx, lz] of [[-0.28, -0.2], [0.28, -0.2], [-0.28, 0.2], [0.28, 0.2]]) {
    addBox(cart, 0.035, 0.9, 0.035, toon(STEEL), lx, 0.45, lz);
    const wheel = addCyl(cart, 0.05, 0.05, 0.03, toon('#222'), lx, 0.05, lz + (lz > 0 ? 0.04 : -0.04), 10);
    wheel.rotation.z = Math.PI / 2;
  }
  for (const y of [0.28, 0.55, 0.8]) addBox(cart, 0.62, 0.02, 0.42, toon('#3a3e44'), 0, y, 0);
  const bisque = ['#ead8c6', '#e2cbb8', '#f1e3d4', '#dcc4ae'];
  const b1 = vessel('bowl', bisque[0], 0.85);
  b1.position.set(-0.14, 0.3, 0.02);
  cart.add(b1);
  const b2 = vessel('cup', bisque[1], 0.9);
  b2.position.set(0.12, 0.3, -0.02);
  cart.add(b2);
  const b3 = vessel('cylinder', bisque[2], 0.62);
  b3.position.set(-0.08, 0.57, 0.02);
  cart.add(b3);
  const b4 = vessel('bowl', bisque[3], 0.7);
  b4.position.set(0.12, 0.82, 0);
  cart.add(b4);
  parent.add(cart);

  const pile = new THREE.Group();
  pile.position.set(x + 1.02, 0, z - 0.52);
  [[0, 0.03, 0], [0.22, 0.03, 0.02], [-0.02, 0.09, 0.01], [0.2, 0.09, -0.02], [0.08, 0.15, 0.02]].forEach(([px, py, pz], i) => {
    const b = addBox(pile, 0.2, 0.055, 0.1, toon(BRICK_COLORS[i % BRICK_COLORS.length]), px, py, pz);
    b.rotation.y = i * 0.15;
  });
  parent.add(pile);
}

function glazeBench(parent, x, z) {
  const g = new THREE.Group();
  g.name = 'glazeBench';
  g.position.set(x, 0, z);
  const top = 1.02;
  addBox(g, 0.66, 0.05, 1.58, toon(WOOD_LT), 0, top, 0);
  addBox(g, 0.62, 0.04, 1.5, toon(WOOD), 0, 0.32, 0);
  for (const [lx, lz] of [[-0.26, -0.7], [0.26, -0.7], [-0.26, 0.7], [0.26, 0.7]]) {
    addBox(g, 0.05, top, 0.05, toon(WOOD_DK), lx, top / 2, lz);
  }
  addBox(g, 0.04, 0.1, 1.5, toon(WOOD), 0.3, top + 0.04, 0);
  const glazes = [
    ['#6f9a86', -0.55],
    ['#24386e', -0.18],
    ['#e2a56a', 0.18],
    ['#2a1c16', 0.52],
  ];
  glazes.forEach(([color, lz], i) => {
    const y = i % 2 === 0 ? top + 0.025 : 0.34;
    bucket(g, i % 2 === 0 ? -0.08 : 0.08, y, lz, '#d8d2c8', color, 0.1, 0.16);
  });
  const dipped = vessel('bowl', '#e2a56a', 0.85);
  dipped.position.set(0.08, top + 0.03, -0.12);
  g.add(dipped);
  for (let i = 0; i < 3; i++) {
    const brush = addCyl(g, 0.006, 0.008, 0.18, toon(i === 1 ? '#6a5344' : WOOD), 0.18, top + 0.04, -0.45 + i * 0.08, 6);
    brush.rotation.z = Math.PI / 2;
    brush.rotation.y = 0.3;
  }
  ['#6f9a86', '#2a1c16', '#24386e', '#c45038', '#e8d2b0'].forEach((color, i) => {
    addBox(g, 0.07, 0.008, 0.07, toon(color), -0.16 + (i % 3) * 0.09, top + 0.03, 0.55 + Math.floor(i / 3) * 0.1);
  });
  const arm = new THREE.Group();
  addCyl(arm, 0.018, 0.02, 0.62, toon(IRON), 0.22, top + 0.32, 0.62, 8);
  addCyl(arm, 0.015, 0.015, 0.48, toon(IRON), 0.0, top + 0.64, 0.4, 8).rotation.z = Math.PI / 2;
  addCyl(arm, 0.09, 0.14, 0.08, toon('#223038'), -0.2, top + 0.58, 0.4, 12);
  bulb(arm, -0.2, top + 0.52, 0.4, '#ffe0b8');
  g.add(arm);
  parent.add(g);
  contactDisc(parent, x, z, 0.4, 0.85, 0.22);
}

function glazeBoard(parent) {
  const g = new THREE.Group();
  g.name = 'glazeBoard';
  g.position.set(3.95, 0, -3.98);
  g.rotation.y = 0;
  addBox(g, 0.08, 1.55, 0.08, toon(WOOD_DK), -0.48, 1.05, 0);
  addBox(g, 0.08, 1.55, 0.08, toon(WOOD_DK), 0.48, 1.05, 0);
  addBox(g, 1.08, 1.05, 0.05, toon('#efe4d4'), 0, 1.35, 0);
  const colors = [
    '#6f9a86', '#2f6d58', '#d5e2d4', '#1e1a18', '#5a3a28', null,
    '#e2b07a', '#f0dcc4', null, '#c45a38', '#24386e', '#7f97c4',
    '#2f5a32', '#8a3038', '#d8c89a', '#6a6a6a', '#f2ece2', '#a84828',
  ];
  colors.forEach((color, i) => {
    if (!color) return;
    addBox(g, 0.12, 0.12, 0.02, toon(color), -0.38 + (i % 6) * 0.16, 1.68 - Math.floor(i / 6) * 0.2, 0.03);
  });
  parent.add(g);
}

function wareCart(parent, x, z) {
  const g = new THREE.Group();
  g.name = 'wareCart';
  g.position.set(x, 0, z);
  addBox(g, 0.58, 0.04, 0.4, toon(WOOD_LT), 0, 0.72, 0);
  addBox(g, 0.54, 0.03, 0.36, toon(WOOD), 0, 0.38, 0);
  for (const [lx, lz] of [[-0.24, -0.15], [0.24, -0.15], [-0.24, 0.15], [0.24, 0.15]]) {
    addBox(g, 0.04, 0.72, 0.04, toon(WOOD_DK), lx, 0.36, lz);
  }
  const bowl = vessel('bowl', '#c4a27a', 0.9);
  bowl.position.set(-0.08, 0.75, 0);
  g.add(bowl);
  addBox(g, 0.1, 0.008, 0.06, toon('#c46a45'), 0.14, 0.748, 0.05);
  parent.add(g);
  contactDisc(parent, x, z, 0.32, 0.24, 0.18);
}

function samplesOnPlinths(parent, layout) {
  const specs = layout.assets.museum_plinth;
  const pieces = [
    { id: 'plinth_bottle', kind: 'bottle', color: '#6f9a86', scale: 1.5 },
    { id: 'plinth_bowl', kind: 'bowl', color: '#241814', scale: 1.65 },
  ];
  for (const piece of pieces) {
    const inst = findInstance(layout, piece.id);
    const sy = Array.isArray(inst.scale) ? inst.scale[1] : 1;
    const mesh = vessel(piece.kind, piece.color, piece.scale);
    mesh.position.set(inst.position[0], specs.targetHeight * sy, inst.position[2]);
    mesh.rotation.y = inst.rotationY || 0;
    parent.add(mesh);
    contactDisc(parent, inst.position[0], inst.position[2], 0.28 * (Array.isArray(inst.scale) ? inst.scale[0] : 1), 0.28, 0.22);
  }
}

function kilnLog(parent, layout) {
  const pier = layout.procedural.pier;
  const [px, pz] = pier.position;
  const faceX = px + pier.size[0] / 2 + 0.012;
  const tex = labelTexture('KILN LOG', ['bisque    cone 04', 'glaze     cone 6', 'class     thursday']);
  const board = new THREE.Mesh(new THREE.PlaneGeometry(0.46, 0.3), toon('#fff', { map: tex }));
  board.position.set(faceX, 1.58, pz + 0.12);
  board.rotation.y = Math.PI / 2;
  parent.add(board);
  addBox(parent, 0.02, 0.34, 0.5, toon(WOOD), faceX - 0.01, 1.58, pz + 0.12);
}

function foliage(parent, x, y, z, scale = 1) {
  const g = new THREE.Group();
  addCyl(g, 0.02 * scale, 0.03 * scale, 0.16 * scale, toon('#3d5c2e'), x, y + 0.08 * scale, z);
  const leaf = toon('#2f6b3c');
  const s1 = new THREE.Mesh(new THREE.SphereGeometry(0.15 * scale, 10, 8), leaf);
  s1.position.set(x, y + 0.26 * scale, z);
  s1.scale.set(1.1, 0.85, 1);
  g.add(s1);
  const s2 = new THREE.Mesh(new THREE.SphereGeometry(0.1 * scale, 10, 8), toon('#1e4d2b'));
  s2.position.set(x + 0.08 * scale, y + 0.32 * scale, z - 0.04 * scale);
  g.add(s2);
  parent.add(g);
}

function factoryWindow(parent, cx, cz, width, height, sillY) {
  const wood = toon(WOOD);
  const glass = toon('#c5d8e8', { transparent: true, opacity: 0.42, side: THREE.DoubleSide });
  addBox(parent, width, height, 0.04, glass, cx, sillY + height / 2, cz);
  addBox(parent, width + 0.12, 0.07, 0.08, wood, cx, sillY + height, cz);
  addBox(parent, width + 0.12, 0.08, 0.28, toon(WOOD_LT), cx, sillY, cz + 0.12);
  addBox(parent, 0.06, height + 0.08, 0.08, wood, cx - width / 2, sillY + height / 2, cz);
  addBox(parent, 0.06, height + 0.08, 0.08, wood, cx + width / 2, sillY + height / 2, cz);
  addBox(parent, 0.045, height, 0.05, wood, cx, sillY + height / 2, cz + 0.01);
  addBox(parent, width, 0.04, 0.05, wood, cx, sillY + height / 2, cz + 0.01);
}

function makeShell(layout) {
  const g = new THREE.Group();
  g.name = 'shell';
  const { width: W, depth: D, height: H } = layout.meta.room;
  const s = layout.shell;
  const plaster = toon(s.wallColor);
  const wood = toon(s.woodColor);
  const mortar = toon(s.mortar);

  const floor = addBox(g, W, 0.08, D, toon(s.floorColor), 0, -0.04, 0);
  floor.userData.castShadow = false;

  const tileW = 0.84;
  const step = tileW + 0.032;
  const tiles = [];
  for (let x = -W / 2 + 0.52; x < W / 2 - 0.35; x += step) {
    for (let z = -D / 2 + 0.48; z < D / 2 - 0.32; z += step) tiles.push([x, z]);
  }
  const tileMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(tileW, 0.02, tileW), toon('#ffffff'), tiles.length);
  tileMesh.userData.castShadow = false;
  tileMesh.frustumCulled = false;
  const dummy = new THREE.Object3D();
  const tint = new THREE.Color();
  const tones = ['#cbbba6', '#c2b29c', '#d4c4ae', '#b7a790'];
  tiles.forEach(([x, z], i) => {
    dummy.position.set(x, -0.008, z);
    dummy.updateMatrix();
    tileMesh.setMatrixAt(i, dummy.matrix);
    const wheel = Math.min(
      Math.hypot(x + 4.05, z - 1.85),
      Math.hypot(x + 4.05, z - 0.35),
      Math.hypot(x + 4.05, z + 1.15)
    );
    const kiln = Math.hypot(x - 3.72, z + 3.08);
    const worn = x > -0.2 && x < 1.6 && z > -1.2 && z < 3.5 && hash01(i + 4) > 0.42;
    let color = tones[Math.floor(hash01(i + 1) * tones.length)];
    if (kiln < 1.4) color = hash01(i) > 0.5 ? '#8d7468' : '#7d5a48';
    else if (wheel < 0.95) color = hash01(i + 2) > 0.45 ? '#b18462' : '#c49878';
    else if (worn) color = '#a89884';
    tint.set(color);
    tileMesh.setColorAt(i, tint);
  });
  tileMesh.instanceMatrix.needsUpdate = true;
  if (tileMesh.instanceColor) tileMesh.instanceColor.needsUpdate = true;
  g.add(tileMesh);

  const mat = addBox(g, 0.95, 0.012, 1.15, toon('#4e453c'), 0.9, 0.008, 3.55);
  mat.userData.castShadow = false;

  addBox(g, W, H, 0.14, plaster, 0, H / 2, -D / 2);
  addBox(g, 0.14, H, D, plaster, -W / 2, H / 2, 0);
  const stub = layout.procedural.rightStub;
  addBox(g, stub.size[0], stub.size[1], stub.size[2], plaster, stub.position[0], H / 2, stub.position[1]);

  const pier = layout.procedural.pier;
  addBox(g, pier.size[0], pier.size[1], pier.size[2], toon('#efe4d6'), pier.position[0], pier.size[1] / 2, pier.position[1]);

  addBox(g, W - 0.3, 0.98, 0.04, mortar, 0, 0.49, -D / 2 + 0.09);
  addBox(g, 0.04, 0.98, D - 0.35, mortar, -W / 2 + 0.09, 0.49, 0);
  addBrickFace(g, { cx: 0, cy: 0.48, cz: -D / 2 + 0.12, width: W - 0.5, height: 0.92, depth: 0.035, cast: false });
  addBrickFace(g, { cx: -W / 2 + 0.12, cy: 0.48, cz: 0, width: D - 0.55, height: 0.92, depth: 0.035, rotY: Math.PI / 2, cast: false });
  addBox(g, W - 0.25, 0.06, 0.08, wood, 0, 1.0, -D / 2 + 0.12);
  addBox(g, 0.08, 0.06, D - 0.3, wood, -W / 2 + 0.12, 1.0, 0);
  addBox(g, W - 0.4, 0.045, 0.06, wood, 0, 2.52, -D / 2 + 0.1);
  addBox(g, 0.06, 0.045, D - 0.45, wood, -W / 2 + 0.1, 2.52, -0.2);

  factoryWindow(g, -3.15, -D / 2 + 0.1, 2.15, 1.18, 1.52);
  factoryWindow(g, -0.35, -D / 2 + 0.1, 2.15, 1.18, 1.52);
  factoryWindow(g, 2.45, -D / 2 + 0.1, 1.85, 1.18, 1.52);

  const ceil = addBox(g, W * 0.9, 0.08, D * 0.58, toon(s.ceilingColor), -0.12, H - 0.05, -D * 0.18);
  ceil.userData.castShadow = false;
  for (const bz of [-3.35, -1.7, -0.05, 1.55]) {
    addBox(g, W * 0.76, 0.1, 0.12, wood, -0.28, H - 0.16, bz);
  }
  addBox(g, 2.4, 0.03, 1.15, toon('#d7e6f2', { transparent: true, opacity: 0.35, side: THREE.DoubleSide }), -0.4, H - 0.02, -1.7);
  addBox(g, 2.55, 0.05, 0.06, wood, -0.4, H - 0.04, -2.25);
  addBox(g, 2.55, 0.05, 0.06, wood, -0.4, H - 0.04, -1.15);

  for (const z of [-1.15, 0.35, 1.85]) {
    addBox(g, 1.85, 0.04, 0.05, toon('#2a2a2a'), -4.05, H - 0.22, z);
  }

  const grate = new THREE.Group();
  grate.position.set(-2.55, 0.01, 0.35);
  addBox(grate, 0.32, 0.015, 0.32, toon('#3a3e42'), 0, 0, 0);
  for (let i = -2; i <= 2; i++) addBox(grate, 0.28, 0.01, 0.015, toon('#1e2124'), 0, 0.008, i * 0.05);
  g.add(grate);

  claySplat(g, -5.05, 1.15, 1.85, 0.11, Math.PI / 2);
  claySplat(g, -5.05, 0.92, 0.4, 0.07, Math.PI / 2);
  claySplat(g, -5.05, 1.32, -1.05, 0.06, Math.PI / 2);

  return g;
}

function makeProcedural(layout) {
  const g = new THREE.Group();
  g.name = 'procedural';
  const p = layout.procedural;
  for (const wheel of p.wheels) {
    potteryWheel(g, wheel.position[0], wheel.position[1], wheel.rotationY, wheel.state);
    bulb(g, wheel.position[0], 2.26, wheel.position[1]);
  }
  for (const stool of p.throwingStools) lowStool(g, stool.position[0], stool.position[1], stool.rotationY);
  pegboard(g);
  bucket(g, -4.55, 0, 1.85, '#8a9094', '#7a9aaa', 0.12, 0.2);
  bucket(g, -4.52, 0, 0.35, '#6a7178', CLAY_DK, 0.13, 0.22);
  slabRoller(g, p.slabRoller.position[0], p.slabRoller.position[1]);
  reclaimHopper(g);
  clayPrep(g, layout);
  handbuildTable(g, layout);
  dryingRack(g, p.dryingRack.position[0], p.dryingRack.position[1]);
  kilnAlcove(g, p.kiln.position[0], p.kiln.position[1]);
  glazeBench(g, p.glazeBench.position[0], p.glazeBench.position[1]);
  glazeBoard(g);
  wareCart(g, p.cart.position[0], p.cart.position[1]);
  samplesOnPlinths(g, layout);
  kilnLog(g, layout);
  const plant = findInstance(layout, 'plant');
  foliage(g, plant.position[0], 0.28, plant.position[2], 1.05);
  foliage(g, -3.15, 1.58, -layout.meta.room.depth / 2 + 0.32, 0.55);
  foliage(g, -0.35, 1.58, -layout.meta.room.depth / 2 + 0.32, 0.48);
  bulb(g, 0.72, 2.28, 1.18);
  bulb(g, 3.85, 2.28, 0.82);
  return g;
}

function makeLights(layout, scene) {
  const warm = 0xffb36a;
  for (const wheel of layout.procedural.wheels) {
    const light = new THREE.PointLight(warm, wheel.state === 'throwing' ? 1.15 : 0.68, 4.2, 2);
    light.position.set(wheel.position[0], 2.1, wheel.position[1]);
    scene.add(light);
  }
  const kiln = layout.procedural.kiln.position;
  const fire = new THREE.PointLight(0xff5518, 1.8, 3.7, 2);
  fire.position.set(kiln[0], 0.78, kiln[1] + 0.55);
  scene.add(fire);

  const bench = layout.procedural.glazeBench.position;
  const task = new THREE.PointLight(0xffd2a2, 0.85, 3.4, 2);
  task.position.set(bench[0] - 0.15, 1.6, bench[1] + 0.35);
  scene.add(task);

  const wedge = new THREE.PointLight(0xffc48a, 0.55, 2.7, 2);
  wedge.position.set(-1.2, 1.1, -2.15);
  scene.add(wedge);

  const island = new THREE.PointLight(0xffd8a8, 0.7, 3.6, 2);
  island.position.set(0.72, 2.15, 1.18);
  scene.add(island);

  const bottle = findInstance(layout, 'plinth_bottle');
  const bowl = findInstance(layout, 'plinth_bowl');
  [
    { pos: [bottle.position[0], 2.9, bottle.position[2] + 0.3], target: [bottle.position[0], 0.85, bottle.position[2]], intensity: 3.8, angle: 0.4 },
    { pos: [bowl.position[0], 2.9, bowl.position[2] + 0.18], target: [bowl.position[0], 0.55, bowl.position[2]], intensity: 3.2, angle: 0.46 },
  ].forEach((spec) => {
    const spot = new THREE.SpotLight(0xfff3dc, spec.intensity, 8, spec.angle, 0.5, 1.5);
    spot.position.set(...spec.pos);
    const target = new THREE.Object3D();
    target.position.set(...spec.target);
    scene.add(target);
    spot.target = target;
    scene.add(spot);
  });
}

boot({
  makeShell,
  makeProcedural,
  makeLights,
  readyText: 'ready — wheelhouse pottery · drag orbit · U unlit · T toon',
});
