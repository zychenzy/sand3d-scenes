import * as THREE from 'three';
import { boot, toon, addBox, addCyl } from './scene_lib.js';
import {
  BENCHES,
  BOWL,
  FENCE,
  GATE,
  LEDGE,
  MANUAL,
  QP,
  SLAB,
  STAIR,
  TREES,
  buildBowlMesh,
  buildQpMesh,
  groundY,
  qpProfile,
  railEnds,
} from './geometry.js';

const bowlData = buildBowlMesh();
const qpData = buildQpMesh();

function canvasTex(draw, w = 512, h = 512) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d'), w, h);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 4;
  return tex;
}

function concreteMap() {
  return canvasTex((g, w, h) => {
    g.fillStyle = '#d9d3c6';
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 2200; i++) {
      const v = 168 + Math.random() * 50;
      g.fillStyle = `rgba(${v},${v - 6},${v - 16},0.16)`;
      g.fillRect(Math.random() * w, Math.random() * h, 4, 2);
    }
    g.strokeStyle = '#aea698';
    g.lineWidth = 4;
    g.strokeRect(2, 2, w - 4, h - 4);
    g.strokeStyle = 'rgba(130,122,108,0.45)';
    g.lineWidth = 2;
    g.beginPath();
    g.moveTo(0, h / 2);
    g.lineTo(w, h / 2);
    g.moveTo(w / 2, 0);
    g.lineTo(w / 2, h);
    g.stroke();
  });
}

function grassMap() {
  return canvasTex((g, w, h) => {
    g.fillStyle = '#4f6b38';
    g.fillRect(0, 0, w, h);
    const blobs = ['#5e8044', '#3f5c2e', '#6a8a4c', '#466832'];
    for (let i = 0; i < 70; i++) {
      g.fillStyle = blobs[i % blobs.length];
      g.globalAlpha = 0.35;
      g.beginPath();
      g.ellipse(Math.random() * w, Math.random() * h, 30 + Math.random() * 70, 18 + Math.random() * 40, Math.random(), 0, Math.PI * 2);
      g.fill();
    }
    g.globalAlpha = 1;
  });
}

/** ShapeGeometry faces +Z. Laying that plane onto XZ flips the front face down. */
function faceUp(geo) {
  const idx = geo.index;
  for (let i = 0; i < idx.count; i += 3) {
    const b = idx.getX(i + 1);
    const c = idx.getX(i + 2);
    idx.setX(i + 1, c);
    idx.setX(i + 2, b);
  }
  geo.computeVertexNormals();
}

function shapeToGround(shape, yOf) {
  const geo = new THREE.ShapeGeometry(shape, 24);
  const pos = geo.attributes.position;
  const uv = geo.attributes.uv;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getY(i);
    pos.setXYZ(i, x, yOf(x, z), z);
    if (uv) uv.setXY(i, x / 4.5, z / 4.5);
  }
  faceUp(geo);
  return geo;
}

function loopPath(loop) {
  const path = new THREE.Path();
  path.moveTo(loop[0][0], loop[0][1]);
  for (let i = 1; i < loop.length; i++) path.lineTo(loop[i][0], loop[i][1]);
  path.closePath();
  return path;
}

function bufferMesh(data, material) {
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(data.positions, 3));
  geo.setAttribute('normal', new THREE.BufferAttribute(data.normals, 3));
  geo.setIndex(new THREE.BufferAttribute(data.indices, 1));
  const mesh = new THREE.Mesh(geo, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function makeSky() {
  const geo = new THREE.SphereGeometry(78, 28, 16);
  const pos = geo.attributes.position;
  const col = new Float32Array(pos.count * 3);
  const horizon = new THREE.Color('#f2b27a');
  const zenith = new THREE.Color('#7eafd4');
  const sunCol = new THREE.Color('#ffd2a4');
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const h = Math.max(0, y) / 78;
    const c = horizon.clone().lerp(zenith, Math.pow(h, 0.62));
    const sun = Math.max(0, (-x / 78) * 0.65 + (z / 78) * 0.35);
    c.lerp(sunCol, sun * (1 - h) * 0.6);
    col[i * 3] = c.r;
    col[i * 3 + 1] = c.g;
    col[i * 3 + 2] = c.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({
    vertexColors: true,
    side: THREE.BackSide,
    fog: false,
  }));
  mesh.userData.shadeLock = true;
  mesh.castShadow = false;
  mesh.receiveShadow = false;
  return mesh;
}

function makeGround() {
  const shape = new THREE.Shape();
  shape.moveTo(-24, -18);
  shape.lineTo(24, -18);
  shape.lineTo(24, 16);
  shape.lineTo(-24, 16);
  shape.closePath();
  const hole = new THREE.Path();
  hole.moveTo(SLAB.x0, SLAB.z1);
  hole.lineTo(SLAB.x1, SLAB.z1);
  hole.lineTo(SLAB.x1, SLAB.z0);
  hole.lineTo(SLAB.x0, SLAB.z0);
  hole.closePath();
  shape.holes.push(hole);
  const geo = shapeToGround(shape, groundY);
  const mesh = new THREE.Mesh(geo, toon('#ffffff', { map: grassMap() }));
  mesh.receiveShadow = true;
  mesh.castShadow = false;
  return mesh;
}

function makeSlab() {
  const shape = new THREE.Shape();
  shape.moveTo(SLAB.x0, SLAB.z0);
  shape.lineTo(SLAB.x1, SLAB.z0);
  shape.lineTo(SLAB.x1, SLAB.z1);
  shape.lineTo(SLAB.x0, SLAB.z1);
  shape.closePath();
  shape.holes.push(loopPath(bowlData.hole));
  shape.holes.push(loopPath(qpData.hole));
  const geo = new THREE.ShapeGeometry(shape);
  const pos = geo.attributes.position;
  const uv = geo.attributes.uv;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getY(i);
    pos.setXYZ(i, x, 0, z);
    if (uv) uv.setXY(i, x / 3.2, z / 3.2);
  }
  faceUp(geo);
  const mesh = new THREE.Mesh(geo, toon('#ffffff', { map: concreteMap() }));
  mesh.receiveShadow = true;
  mesh.castShadow = false;
  const edge = toon('#c2baac');
  const h = 0.14;
  const y = -h / 2;
  const g = new THREE.Group();
  g.add(mesh);
  addBox(g, SLAB.x1 - SLAB.x0, h, 0.1, edge, (SLAB.x0 + SLAB.x1) / 2, y, SLAB.z0);
  addBox(g, SLAB.x1 - SLAB.x0, h, 0.1, edge, (SLAB.x0 + SLAB.x1) / 2, y, SLAB.z1);
  addBox(g, 0.1, h, SLAB.z1 - SLAB.z0, edge, SLAB.x0, y, (SLAB.z0 + SLAB.z1) / 2);
  addBox(g, 0.1, h, SLAB.z1 - SLAB.z0, edge, SLAB.x1, y, (SLAB.z0 + SLAB.z1) / 2);
  return g;
}

function makeBowlAndQuarter() {
  const g = new THREE.Group();
  const concrete = toon('#d8d2c5', {
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
  });
  g.add(bufferMesh(bowlData, concrete));
  g.add(bufferMesh(qpData, toon('#d4cec0')));

  const copeMat = toon('#7a4038');
  const pts = bowlData.coping.map((p) => new THREE.Vector3(
    p.x - p.outX * 0.01,
    0.034,
    p.z - p.outZ * 0.01,
  ));
  const curve = new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0.05);
  const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, pts.length * 2, 0.04, 8, false), copeMat);
  tube.castShadow = true;
  tube.receiveShadow = true;
  g.add(tube);
  for (const end of [pts[0], pts[pts.length - 1]]) {
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 6), copeMat);
    cap.position.copy(end);
    cap.castShadow = true;
    g.add(cap);
  }

  const cope = qpData.coping;
  const len = cope.x1 - cope.x0;
  const qGeo = new THREE.CylinderGeometry(0.042, 0.042, len, 12);
  qGeo.rotateZ(Math.PI / 2);
  const qCope = new THREE.Mesh(qGeo, copeMat);
  qCope.position.set((cope.x0 + cope.x1) / 2, cope.y + 0.012, cope.z + 0.028);
  qCope.castShadow = true;
  qCope.receiveShadow = true;
  g.add(qCope);
  for (const x of [cope.x0, cope.x1]) {
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.042, 8, 6), copeMat);
    cap.position.set(x, cope.y + 0.012, cope.z + 0.028);
    g.add(cap);
  }

  const drain = new THREE.Mesh(new THREE.CircleGeometry(0.09, 12), toon('#3e4348'));
  drain.rotation.x = -Math.PI / 2;
  drain.position.set(BOWL.cx, -BOWL.depth + 0.008, BOWL.cz);
  drain.receiveShadow = true;
  g.add(drain);
  return g;
}

function makeStreet(g) {
  const concrete = toon('#cfc8ba');
  const steel = toon('#4e555c');
  const hi = toon('#d5dbe0');
  const { x, z, len, wid, h } = MANUAL;
  addBox(g, wid - 0.02, h - 0.012, len - 0.05, concrete, x, (h - 0.012) / 2, z);
  addBox(g, wid + 0.01, 0.016, len, steel, x, h - 0.008, z);

  const L = LEDGE;
  addBox(g, L.len, L.h - 0.016, L.wid - 0.02, concrete, L.x, (L.h - 0.016) / 2, L.z);
  addBox(g, L.len, 0.014, 0.055, steel, L.x, L.h - 0.004, L.z + L.wid / 2 - 0.02);
  addBox(g, L.len, 0.055, 0.012, steel, L.x, L.h - 0.034, L.z + L.wid / 2);
  addBox(g, L.len, 0.01, 0.01, hi, L.x, L.h + 0.004, L.z + L.wid / 2);
  addBox(g, 0.014, 0.05, L.wid, steel, L.x + L.len / 2, L.h - 0.03, L.z);

  const rise = STAIR.rise;
  const treadRun = (STAIR.zBottom - STAIR.zTop - STAIR.landing) / STAIR.steps;
  const stepMat = toon('#c8c2b4');
  for (let i = 0; i < STAIR.steps; i++) {
    const yTop = (i + 1) * rise;
    const zSouth = STAIR.zBottom - i * treadRun;
    const zNorth = zSouth - treadRun;
    addBox(g, STAIR.wid - 0.02, yTop, zSouth - zNorth, stepMat, STAIR.x, yTop / 2, (zSouth + zNorth) / 2);
  }
  const yL = STAIR.steps * rise;
  addBox(g, STAIR.wid - 0.02, yL, STAIR.landing, stepMat, STAIR.x, yL / 2, STAIR.zTop + STAIR.landing / 2);
  const rail = railEnds();
  const post = toon('#8d949b');
  const bar = toon('#c5cacf');
  addCyl(g, STAIR.railR, STAIR.railR, rail.yA, post, rail.x, rail.yA / 2, rail.zA, 8);
  addCyl(g, STAIR.railR, STAIR.railR, STAIR.railH, post, rail.x, yL + STAIR.railH / 2, rail.zB, 8);
  addBox(g, 0.09, 0.012, 0.09, steel, rail.x, 0.006, rail.zA);
  addBox(g, 0.09, 0.012, 0.09, steel, rail.x, yL + 0.006, rail.zB);
  const dy = rail.yB - rail.yA;
  const dz = rail.zB - rail.zA;
  const length = Math.hypot(dy, dz);
  const geo = new THREE.CylinderGeometry(STAIR.railR, STAIR.railR, length, 8);
  const mesh = new THREE.Mesh(geo, bar);
  mesh.position.set(rail.x, (rail.yA + rail.yB) / 2, (rail.zA + rail.zB) / 2);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, dy, dz).normalize());
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  g.add(mesh);
  const ret = new THREE.Mesh(new THREE.CylinderGeometry(STAIR.railR, STAIR.railR, 0.36, 8), bar);
  ret.rotation.x = Math.PI / 2;
  ret.position.set(rail.x, rail.yB, rail.zB - 0.18);
  ret.castShadow = true;
  g.add(ret);
}

function fenceRuns() {
  const { x0, x1, z0, z1 } = FENCE;
  return [
    [[x0, z0], [x1, z0]],
    [[x1, z0], [x1, z1]],
    [[x1, z1], [GATE.x1, z1]],
    [[GATE.x0, z1], [x0, z1]],
    [[x0, z1], [x0, z0]],
  ];
}

function makeFence(g) {
  const posts = [];
  const wires = [];
  const seen = new Set();
  for (const [a, b] of fenceRuns()) {
    const dx = b[0] - a[0];
    const dz = b[1] - a[1];
    const len = Math.hypot(dx, dz);
    const nPosts = Math.max(1, Math.round(len / 1.8));
    for (let i = 0; i <= nPosts; i++) {
      const x = a[0] + (dx * i) / nPosts;
      const z = a[1] + (dz * i) / nPosts;
      const key = `${x.toFixed(2)},${z.toFixed(2)}`;
      if (seen.has(key)) continue;
      seen.add(key);
      posts.push([x, z]);
    }
    const nWires = Math.max(2, Math.floor(len / 0.11));
    for (let i = 1; i < nWires; i++) {
      wires.push([a[0] + (dx * i) / nWires, a[1] + (dz * i) / nWires]);
    }
    addBox(g, Math.abs(dx) || 0.04, 0.035, Math.abs(dz) || 0.04, toon('#9aa199'), (a[0] + b[0]) / 2, FENCE.h - 0.02, (a[1] + b[1]) / 2);
    addBox(g, Math.abs(dx) || 0.03, 0.025, Math.abs(dz) || 0.03, toon('#8b938a'), (a[0] + b[0]) / 2, FENCE.h * 0.48, (a[1] + b[1]) / 2);
  }
  const postGeo = new THREE.CylinderGeometry(0.04, 0.045, FENCE.h, 6);
  const postMesh = new THREE.InstancedMesh(postGeo, toon('#7f877e'), posts.length);
  const dummy = new THREE.Object3D();
  posts.forEach(([x, z], i) => {
    dummy.position.set(x, FENCE.h / 2 - 0.02, z);
    dummy.updateMatrix();
    postMesh.setMatrixAt(i, dummy.matrix);
  });
  postMesh.castShadow = true;
  postMesh.receiveShadow = true;
  g.add(postMesh);

  const wireGeo = new THREE.CylinderGeometry(0.006, 0.006, FENCE.h - 0.12, 4);
  const wireMesh = new THREE.InstancedMesh(wireGeo, toon('#a3aaa2'), wires.length);
  wires.forEach(([x, z], i) => {
    dummy.position.set(x, (FENCE.h - 0.12) / 2 + 0.04, z);
    dummy.rotation.set(0, 0, 0);
    dummy.updateMatrix();
    wireMesh.setMatrixAt(i, dummy.matrix);
  });
  wireMesh.castShadow = false;
  wireMesh.receiveShadow = true;
  g.add(wireMesh);

  const leafW = (GATE.x1 - GATE.x0) / 2;
  makeGateLeaf(g, GATE.x0, 1, leafW);
  makeGateLeaf(g, GATE.x1, -1, leafW);
}

function makeGateLeaf(g, hingeX, dir, width) {
  const leaf = new THREE.Group();
  const frame = toon('#6f776e');
  const infill = toon('#b7bdb4');
  addBox(leaf, width, 0.04, 0.04, frame, dir * width / 2, FENCE.h - 0.08, 0);
  addBox(leaf, width, 0.04, 0.04, frame, dir * width / 2, 0.12, 0);
  addBox(leaf, 0.04, FENCE.h - 0.16, 0.04, frame, dir * (width - 0.02), FENCE.h / 2, 0);
  addBox(leaf, 0.04, FENCE.h - 0.16, 0.04, frame, 0, FENCE.h / 2, 0);
  for (let i = 1; i < 8; i++) {
    addBox(leaf, 0.012, FENCE.h - 0.28, 0.012, infill, dir * ((width * i) / 8), FENCE.h / 2, 0);
  }
  addBox(leaf, width * 0.92, 0.025, 0.02, frame, dir * width / 2, FENCE.h * 0.55, 0);
  leaf.position.set(hingeX, 0, FENCE.z1);
  leaf.rotation.y = dir * 0.95;
  g.add(leaf);
}

function rand(seed) {
  let s = seed % 2147483646;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function clump(g, x, y, z, sx, sy, sz, color, seed) {
  const geo = new THREE.IcosahedronGeometry(1, 1);
  const mesh = new THREE.Mesh(geo, toon(color));
  mesh.scale.set(sx, sy, sz);
  mesh.position.set(x, y, z);
  mesh.rotation.y = seed * 6;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  g.add(mesh);
}

function makeTree(kind, x, z, scale, seed) {
  const g = new THREE.Group();
  const r = rand(seed);
  const y0 = groundY(x, z);
  const bark = toon(r() > 0.5 ? '#5c4636' : '#6a5342');
  const greens = ['#3f6a38', '#4e7a40', '#2f552c', '#5b8444', '#3a6234', '#466e3c'];
  const pick = () => greens[Math.floor(r() * greens.length)];

  if (kind === 'column') {
    addCyl(g, 0.1 * scale, 0.16 * scale, 3.1 * scale, bark, 0, y0 + 1.55 * scale, 0, 7);
    for (let i = 0; i < 5; i++) {
      const yy = y0 + (3.1 + i * 0.85) * scale;
      const w = (1.15 - i * 0.16) * scale;
      clump(g, (r() - 0.5) * 0.2, yy, (r() - 0.5) * 0.2, w, 0.7 * scale, w * 0.85, pick(), r());
    }
  } else if (kind === 'multi') {
    for (let i = 0; i < 3; i++) {
      const lean = (i - 1) * 0.35 * scale;
      addCyl(g, 0.06 * scale, 0.1 * scale, 1.7 * scale, bark, lean, y0 + 0.85 * scale, (i - 1) * 0.18 * scale, 6);
      clump(g, lean * 1.4, y0 + 2.15 * scale, (i - 1) * 0.25, 0.9 * scale, 0.55 * scale, 0.8 * scale, pick(), r());
      clump(g, lean * 1.1 + 0.2, y0 + 2.55 * scale, 0.1, 0.55 * scale, 0.4 * scale, 0.5 * scale, pick(), r());
    }
  } else if (kind === 'broad') {
    addCyl(g, 0.12 * scale, 0.2 * scale, 1.7 * scale, bark, 0, y0 + 0.85 * scale, 0, 7);
    addCyl(g, 0.05 * scale, 0.08 * scale, 1.3 * scale, bark, 0.55 * scale, y0 + 1.9 * scale, 0.15 * scale, 5);
    addCyl(g, 0.045 * scale, 0.07 * scale, 1.15 * scale, bark, -0.5 * scale, y0 + 1.75 * scale, -0.2 * scale, 5);
    const crown = [
      [0.1, 2.7, 0.0, 1.7, 0.85, 1.5],
      [1.0, 2.5, 0.3, 1.15, 0.7, 1.05],
      [-0.95, 2.45, -0.2, 1.2, 0.65, 1.0],
      [0.2, 3.15, -0.45, 1.0, 0.6, 0.9],
      [-0.2, 2.35, 0.85, 0.9, 0.5, 0.85],
    ];
    for (const c of crown) clump(g, c[0] * scale, y0 + c[1] * scale, c[2] * scale, c[3] * scale, c[4] * scale, c[5] * scale, pick(), r());
  } else {
    addCyl(g, 0.16 * scale, 0.28 * scale, 2.3 * scale, bark, 0, y0 + 1.15 * scale, 0, 7);
    addCyl(g, 0.07 * scale, 0.11 * scale, 1.6 * scale, bark, 0.7 * scale, y0 + 2.15 * scale, 0.25 * scale, 6);
    addCyl(g, 0.06 * scale, 0.1 * scale, 1.45 * scale, bark, -0.65 * scale, y0 + 2.0 * scale, -0.35 * scale, 6);
    addCyl(g, 0.05 * scale, 0.08 * scale, 1.1 * scale, bark, 0.15 * scale, y0 + 2.5 * scale, -0.7 * scale, 5);
    const crown = [
      [0.15, 3.5, 0.05, 2.1, 1.15, 1.9],
      [1.35, 3.15, 0.45, 1.45, 0.85, 1.3],
      [-1.3, 3.05, -0.25, 1.5, 0.8, 1.35],
      [0.4, 4.15, -0.7, 1.25, 0.75, 1.15],
      [-0.35, 3.9, 0.95, 1.2, 0.7, 1.1],
      [1.5, 3.7, -0.55, 0.9, 0.55, 0.85],
    ];
    for (const c of crown) clump(g, c[0] * scale, y0 + c[1] * scale, c[2] * scale, c[3] * scale, c[4] * scale, c[5] * scale, pick(), r());
  }
  g.position.set(x, 0, z);
  return g;
}

function makeShrub(g, x, z, scale, seed) {
  const r = rand(seed);
  const y = groundY(x, z);
  const colors = ['#3d6634', '#527846', '#2f522c'];
  clump(g, x, y + 0.28 * scale, z, 0.46 * scale, 0.26 * scale, 0.4 * scale, colors[seed % 3], r());
  clump(g, x + 0.22 * scale, y + 0.2 * scale, z + 0.08, 0.28 * scale, 0.18 * scale, 0.24 * scale, colors[(seed + 1) % 3], r());
}

function roofGeometry(w, d, h) {
  const hw = w / 2;
  const hd = d / 2;
  const positions = new Float32Array([
    -hw, 0, hd, hw, 0, hd, hw, h, 0,
    -hw, 0, hd, hw, h, 0, -hw, h, 0,
    -hw, 0, -hd, -hw, h, 0, hw, h, 0,
    -hw, 0, -hd, hw, h, 0, hw, 0, -hd,
    -hw, 0, hd, -hw, h, 0, -hw, 0, -hd,
    hw, 0, -hd, hw, 0, hd, hw, h, 0,
  ]);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.computeVertexNormals();
  return geo;
}

function makeHouse(g, spec) {
  const group = new THREE.Group();
  const y = groundY(spec.x, spec.z);
  addBox(group, spec.w, spec.wall, spec.d, toon(spec.wallColor), 0, spec.wall / 2, 0);
  const roof = new THREE.Mesh(roofGeometry(spec.w + 0.4, spec.d + 0.35, spec.roof), toon(spec.roofColor));
  roof.position.y = spec.wall;
  roof.castShadow = true;
  roof.receiveShadow = true;
  group.add(roof);
  const win = toon('#3a4650');
  const sill = toon('#efe6d8');
  addBox(group, 0.72, 0.9, 0.06, win, -spec.w * 0.22, 1.55, spec.d / 2 + 0.02);
  addBox(group, 0.72, 0.9, 0.06, win, spec.w * 0.24, 1.62, spec.d / 2 + 0.02);
  addBox(group, 0.86, 0.06, 0.08, sill, -spec.w * 0.22, 1.08, spec.d / 2 + 0.03);
  addBox(group, 0.86, 0.06, 0.08, sill, spec.w * 0.24, 1.14, spec.d / 2 + 0.03);
  addBox(group, 0.78, 1.7, 0.07, toon(spec.door || '#5c4032'), spec.doorX || 0, 0.85, spec.d / 2 + 0.03);
  if (spec.chimney) {
    addBox(group, 0.42, 0.9, 0.42, toon('#6e5346'), spec.w * 0.28, spec.wall + spec.roof * 0.35, -0.2);
  }
  group.position.set(spec.x, y, spec.z);
  group.rotation.y = spec.rot || 0;
  g.add(group);
}

function makePath(g) {
  const walk = toon('#d7d0c2');
  const asphalt = toon('#3e4348');
  const curb = toon('#c9c2b4');
  addBox(g, 20, 0.06, 4.4, asphalt, 0, groundY(0, 12) + 0.02, 12.4);
  addBox(g, 22, 0.08, 1.7, walk, 0, groundY(0, 9.5) + 0.05, 9.55);
  addBox(g, 22, 0.1, 0.16, curb, 0, groundY(0, 10.45) + 0.04, 10.42);
  const pathW = GATE.x1 - GATE.x0 - 0.18;
  const pathX = (GATE.x0 + GATE.x1) / 2;
  addBox(g, pathW, 0.08, 8.55 - SLAB.z1, walk, pathX, 0.04, (SLAB.z1 + 8.55) / 2);
}

function signTexture() {
  return canvasTex((g, w, h) => {
    g.fillStyle = '#1e6b45';
    g.fillRect(0, 0, w, h);
    g.strokeStyle = '#f4f1ea';
    g.lineWidth = 10;
    g.strokeRect(12, 12, w - 24, h - 24);
    g.fillStyle = '#f6efe4';
    g.font = '700 54px sans-serif';
    g.textAlign = 'center';
    g.fillText('SKATEPARK', w / 2, 118);
    g.font = '28px sans-serif';
    g.fillText('neighbourhood', w / 2, 168);
  }, 512, 256);
}

function makeSign(g) {
  const x = GATE.x0 - 0.7;
  const z = 7.7;
  const y = groundY(x, z);
  addCyl(g, 0.04, 0.05, 1.35, toon('#5c5348'), x, y + 0.67, z, 6);
  const board = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.58, 0.04), toon('#ffffff', { map: signTexture() }));
  board.position.set(x, y + 1.35, z);
  board.castShadow = true;
  g.add(board);
}

function makeTrash(g) {
  const x = GATE.x1 + 0.55;
  const z = 7.65;
  const y = groundY(x, z);
  addCyl(g, 0.22, 0.2, 0.62, toon('#2f4a38'), x, y + 0.31, z, 10);
  addCyl(g, 0.24, 0.24, 0.06, toon('#24382c'), x, y + 0.64, z, 10);
}

function skateboard(g, x, y, z, rotY) {
  const grp = new THREE.Group();
  addBox(grp, 0.2, 0.016, 0.8, toon('#c47a3a'), 0, 0.054, 0);
  addBox(grp, 0.16, 0.006, 0.7, toon('#2a2d30'), 0, 0.064, 0);
  for (const tz of [-0.22, 0.22]) {
    addBox(grp, 0.14, 0.02, 0.035, toon('#8a8f94'), 0, 0.04, tz);
    for (const tx of [-0.07, 0.07]) {
      const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.027, 0.027, 0.028, 8), toon('#1c1e20'));
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(tx, 0.027, tz);
      wheel.castShadow = true;
      grp.add(wheel);
    }
  }
  grp.position.set(x, y, z);
  grp.rotation.y = rotY;
  g.add(grp);
}

function makeFlowers(g, x, z, n, seed) {
  const r = rand(seed);
  const colors = ['#c47c7a', '#e4d2a4', '#d7d58a', '#d08a6a'];
  const y = groundY(x, z);
  for (let i = 0; i < n; i++) {
    const fx = x + (r() - 0.5) * 0.8;
    const fz = z + (r() - 0.5) * 0.55;
    addCyl(g, 0.012, 0.015, 0.16, toon('#3e5a32'), fx, y + 0.08, fz, 4);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.045, 6, 5), toon(colors[i % colors.length]));
    head.position.set(fx, y + 0.18, fz);
    head.castShadow = true;
    g.add(head);
  }
}

function makeShell() {
  const g = new THREE.Group();
  g.name = 'shell';
  g.add(makeSky());
  g.add(makeGround());
  return g;
}

function makeProcedural() {
  const g = new THREE.Group();
  g.name = 'park';
  g.add(makeSlab());
  g.add(makeBowlAndQuarter());
  makeStreet(g);
  makeFence(g);
  makePath(g);
  makeSign(g);
  makeTrash(g);

  TREES.forEach((t, i) => g.add(makeTree(t.kind, t.x, t.z, t.scale, 40 + i * 17)));
  const shrubs = [
    [-8.4, 7.4, 1.1], [-5.2, 7.55, 0.8], [-3.1, 7.7, 0.7],
    [9.7, 5.4, 0.9], [9.55, 0.4, 0.75],
    [-9.4, -4.2, 1.0], [-9.2, -6.2, 0.7],
    [9.6, -3.5, 0.85],
  ];
  shrubs.forEach((s, i) => makeShrub(g, s[0], s[1], s[2], 90 + i));

  makeHouse(g, { x: -9.4, z: -11.6, w: 7.4, d: 5.5, wall: 3.15, roof: 1.65, wallColor: '#f0e4d2', roofColor: '#8d4c38', chimney: true, rot: 0.06, doorX: -0.4 });
  makeHouse(g, { x: -0.2, z: -12.3, w: 6.2, d: 5.1, wall: 2.9, roof: 1.45, wallColor: '#d5ddd8', roofColor: '#4d5854', rot: -0.08, door: '#3e4a44', doorX: 0.6 });
  makeHouse(g, { x: 7.8, z: -11.15, w: 6.6, d: 5.3, wall: 3.05, roof: 1.7, wallColor: '#e6cbb6', roofColor: '#6a5344', chimney: true, rot: 0.14, doorX: 0.2 });

  const deck = qpProfile((QP.x1 + QP.x2) / 2);
  skateboard(g, 1.7, deck.H, deck.zCope - 0.85, 0.4);
  skateboard(g, -6.2, groundY(-6.2, 7.55), 7.55, 1.1);
  makeFlowers(g, -5.5, 7.85, 7, 12);
  return g;
}

boot({
  makeShell,
  makeProcedural,
  onProps(prototypes, props) {
    const src = prototypes.museum_bench;
    if (!src) return;
    for (const b of BENCHES) {
      const node = src.clone(true);
      node.position.set(b.x, groundY(b.x, b.z), b.z);
      node.rotation.y = b.rotationY;
      node.name = b.id;
      props.add(node);
    }
  },
  readyText: 'ready — neighbourhood skatepark · drag orbit · U unlit · T toon',
}).catch((err) => {
  console.error(err);
  const statusEl = document.getElementById('status');
  if (statusEl) statusEl.textContent = 'error: ' + err.message;
});
