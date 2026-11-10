import * as THREE from 'three';
import { boot, toon, addBox, addCyl, applyShading } from './scene_lib.js';

const GREENS = ['#3c6438', '#4a7442', '#314f30', '#567a48', '#2e4a32', '#62844c', '#3f5e36', '#6d8b52', '#355636', '#45683c'];
const ROCKS = ['#b7b2a6', '#8e8a80', '#6e6a62', '#a39c90', '#7a756c', '#c4bfb4'];
const MOSS = ['#4d6a40', '#3e5c38', '#5a7a48'];

const X0 = -16;
const X1 = 16;
const Z0 = -14;
const Z1 = 14;

function mulberry32(a) {
  return function rng() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hash(x, z) {
  const n = Math.sin(x * 127.1 + z * 311.7) * 43758.5453;
  return n - Math.floor(n);
}

function mix(a, b, t) {
  const u = Math.max(0, Math.min(1, t));
  return [
    a[0] + (b[0] - a[0]) * u,
    a[1] + (b[1] - a[1]) * u,
    a[2] + (b[2] - a[2]) * u,
  ];
}

function mark(mesh, cast, receive) {
  mesh.userData.castShadow = cast;
  mesh.userData.receiveShadow = receive;
  mesh.castShadow = cast;
  mesh.receiveShadow = receive;
  return mesh;
}

function addPole(parent, ax, ay, az, bx, by, bz, radius, mat, seg = 6) {
  const dx = bx - ax;
  const dy = by - ay;
  const dz = bz - az;
  const len = Math.hypot(dx, dy, dz) || 0.001;
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, len, seg), mat);
  mesh.position.set((ax + bx) / 2, (ay + by) / 2, (az + bz) / 2);
  mesh.quaternion.setFromUnitVectors(
    new THREE.Vector3(0, 1, 0),
    new THREE.Vector3(dx / len, dy / len, dz / len),
  );
  mark(mesh, true, true);
  parent.add(mesh);
  return mesh;
}

function pointSeg(px, pz, a, b) {
  const dx = b[0] - a[0];
  const dz = b[1] - a[1];
  const l2 = dx * dx + dz * dz || 1e-8;
  let t = ((px - a[0]) * dx + (pz - a[1]) * dz) / l2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (a[0] + dx * t), pz - (a[1] + dz * t));
}

function createSite(layout) {
  const stream = layout.site.stream;
  const pads = layout.site.pads.map((p) => ({ ...p }));

  function closest(x, z) {
    let best = { d: 1e9, x: 0, z: 0 };
    for (let i = 0; i < stream.length - 1; i++) {
      const a = stream[i];
      const b = stream[i + 1];
      const dx = b[0] - a[0];
      const dz = b[1] - a[1];
      const l2 = dx * dx + dz * dz || 1e-8;
      let t = ((x - a[0]) * dx + (z - a[1]) * dz) / l2;
      t = Math.max(0, Math.min(1, t));
      const px = a[0] + dx * t;
      const pz = a[1] + dz * t;
      const d = Math.hypot(x - px, z - pz);
      if (d < best.d) best = { d, x: px, z: pz };
    }
    return best;
  }

  function baseHeight(x, z) {
    const s = closest(x, z);
    let h = 0.18 + Math.max(0, x) * 0.038 + Math.max(0, -x) * 0.022;
    h += Math.sin(x * 0.33 + 0.7) * Math.cos(z * 0.27) * 0.07;
    h += Math.sin(z * 0.15 + x * 0.05) * 0.04;
    const bank = 2.55;
    if (s.d < bank) {
      const u = s.d / bank;
      const bed = -0.34;
      const lip = 0.46;
      if (u < lip) h = bed;
      else {
        const t = (u - lip) / (1 - lip);
        const w = t * t * (3 - 2 * t);
        h = bed * (1 - w) + h * w;
      }
    }
    return h;
  }

  for (const p of pads) p.y = baseHeight(p.x, p.z);

  function ground(x, z) {
    let h = baseHeight(x, z);
    for (const p of pads) {
      const d = Math.hypot(x - p.x, z - p.z);
      const inner = p.r * 0.68;
      if (d <= inner) h = p.y;
      else if (d < p.r) {
        const u = (d - inner) / (p.r - inner);
        const w = u * u * (3 - 2 * u);
        h = p.y * (1 - w) + h * w;
      }
    }
    return h;
  }

  function pathDist(x, z) {
    let best = 1e9;
    const lines = [layout.site.path, ...(layout.site.spurs || [])];
    for (const line of lines) {
      for (let i = 0; i < line.length - 1; i++) {
        best = Math.min(best, pointSeg(x, z, line[i], line[i + 1]));
      }
    }
    return best;
  }

  return { layout, pads, closest, ground, baseHeight, pathDist };
}

function paintGround(api) {
  const S = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = S;
  canvas.height = S;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  const img = ctx.createImageData(S, S);
  const data = img.data;
  const trees = api.layout.site.trees;
  for (let py = 0; py < S; py++) {
    const z = Z1 - (py / (S - 1)) * (Z1 - Z0);
    for (let px = 0; px < S; px++) {
      const x = X0 + (px / (S - 1)) * (X1 - X0);
      const s = api.closest(x, z);
      const n = hash(x * 1.7, z * 1.3);
      let col = n > 0.66 ? [90, 116, 72] : n > 0.33 ? [72, 100, 60] : [80, 108, 66];
      let litter = 0;
      for (const t of trees) {
        const reach = (t.r || 0.2) * 7 + 1.1;
        const dd = Math.hypot(x - t.x, z - t.z);
        if (dd < reach) litter = Math.max(litter, 1 - dd / reach);
      }
      if (litter > 0) col = mix(col, [124, 94, 58], litter * 0.72);
      if (s.d < 2.7) {
        const u = 1 - s.d / 2.7;
        const bank = n > 0.55 ? [62, 112, 74] : [108, 94, 70];
        col = mix(col, bank, u * 0.88);
      }
      const pd = api.pathDist(x, z);
      if (pd < 1.45) {
        const u = Math.min(1, (1.45 - pd) / 0.5);
        const gravel = n > 0.5 ? [168, 152, 124] : [148, 132, 108];
        col = mix(col, gravel, u);
      }
      for (const p of api.pads) {
        const dd = Math.hypot(x - p.x, z - p.z);
        if (dd < p.r) {
          const u = 1 - dd / p.r;
          col = mix(col, [138, 126, 108], Math.min(1, u * 1.3) * 0.8);
        }
      }
      const i = (py * S + px) * 4;
      data[i] = col[0];
      data[i + 1] = col[1];
      data[i + 2] = col[2];
      data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  tex.needsUpdate = true;
  return tex;
}

function buildTerrain(api) {
  const segX = 90;
  const segZ = 78;
  const positions = [];
  const uvs = [];
  const indices = [];
  for (let iz = 0; iz <= segZ; iz++) {
    const z = Z0 + (iz / segZ) * (Z1 - Z0);
    for (let ix = 0; ix <= segX; ix++) {
      const x = X0 + (ix / segX) * (X1 - X0);
      positions.push(x, api.ground(x, z), z);
      uvs.push((x - X0) / (X1 - X0), (z - Z0) / (Z1 - Z0));
    }
  }
  const stride = segX + 1;
  for (let iz = 0; iz < segZ; iz++) {
    for (let ix = 0; ix < segX; ix++) {
      const a = iz * stride + ix;
      indices.push(a, a + stride, a + 1, a + 1, a + stride, a + stride + 1);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  const mesh = new THREE.Mesh(geo, toon('#ffffff', { map: paintGround(api) }));
  mark(mesh, false, true);
  mesh.name = 'ground';
  return mesh;
}

function waterY(z) {
  if (z < 0.25) return -0.06;
  if (z < 1.7) {
    const u = (z - 0.25) / 1.45;
    const s = u * u * (3 - 2 * u);
    return -0.05 - 0.16 * s;
  }
  return -0.21;
}

function sampleStream(stream, step) {
  const pts = [];
  for (let i = 0; i < stream.length - 1; i++) {
    const a = stream[i];
    const b = stream[i + 1];
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const n = Math.max(1, Math.round(len / step));
    for (let k = 0; k < n; k++) {
      const t = k / n;
      pts.push({
        x: a[0] + (b[0] - a[0]) * t,
        z: a[1] + (b[1] - a[1]) * t,
        s: i + t,
      });
    }
  }
  const last = stream[stream.length - 1];
  pts.push({ x: last[0], z: last[1], s: stream.length - 1 });
  return pts;
}

function buildWater(api) {
  const g = new THREE.Group();
  g.name = 'water';
  const pts = sampleStream(api.layout.site.stream, 0.42);
  const positions = [];
  const colors = [];
  const indices = [];
  const edge = new THREE.Color('#3d7568');
  const deep = new THREE.Color('#143632');
  const lip = new THREE.Color('#d5d2c6');
  for (let i = 0; i < pts.length; i++) {
    const prev = pts[Math.max(0, i - 1)];
    const next = pts[Math.min(pts.length - 1, i + 1)];
    let tx = next.x - prev.x;
    let tz = next.z - prev.z;
    const len = Math.hypot(tx, tz) || 1;
    tx /= len;
    tz /= len;
    const rx = -tz;
    const rz = tx;
    const w = 1.05 + 0.28 * Math.sin(pts[i].s * 1.25) + 0.1 * Math.sin(pts[i].s * 2.8);
    const y = waterY(pts[i].z) + Math.sin(pts[i].z * 3.1 + pts[i].x * 1.4) * 0.012;
    const drop = pts[i].z > 0.15 && pts[i].z < 1.85;
    const left = edge.clone().lerp(lip, drop ? 0.35 : 0);
    const mid = deep.clone().lerp(lip, drop ? 0.55 : 0.05);
    const push = (ox, oz, col) => {
      positions.push(pts[i].x + ox, y, pts[i].z + oz);
      colors.push(col.r, col.g, col.b);
    };
    push(rx * w, rz * w, left);
    push(0, 0, mid);
    push(-rx * w, -rz * w, left);
  }
  for (let i = 0; i < pts.length - 1; i++) {
    const a = i * 3;
    const b = a + 3;
    indices.push(a, b, a + 1, a + 1, b, b + 1, a + 1, b + 1, a + 2, a + 2, b + 1, b + 2);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  const mesh = new THREE.Mesh(geo, toon('#ffffff', { vertexColors: true, side: THREE.DoubleSide }));
  mark(mesh, false, true);
  g.add(mesh);
  const foam = toon('#efece2');
  pts.forEach((p, i) => {
    const onDrop = p.z > 0.2 && p.z < 1.75;
    const onRiffle = p.z > 4.4 && p.z < 7.2 && i % 3 === 0;
    if (!onDrop && !onRiffle) return;
    if (onDrop && i % 2) return;
    const m = new THREE.Mesh(
      new THREE.BoxGeometry(onDrop ? 0.7 : 0.34, 0.03, onDrop ? 0.2 : 0.14),
      foam,
    );
    m.position.set(p.x + Math.sin(i * 1.7) * 0.28, waterY(p.z) + 0.03, p.z);
    m.rotation.y = i * 0.35;
    mark(m, false, true);
    g.add(m);
  });
  return g;
}

function addRock(parent, x, y, z, sx, sy, sz, color, seed, detail) {
  const mesh = new THREE.Mesh(new THREE.IcosahedronGeometry(1, detail), toon(color));
  mesh.scale.set(sx, sy, sz);
  mesh.position.set(x, y, z);
  mesh.rotation.set(seed, seed * 1.7, seed * 0.4);
  mark(mesh, true, true);
  parent.add(mesh);
  if (seed % 3 === 0 && sy > 0.18) {
    const cap = new THREE.Mesh(new THREE.IcosahedronGeometry(1, 0), toon(MOSS[seed % MOSS.length]));
    cap.scale.set(sx * 0.55, sy * 0.28, sz * 0.5);
    cap.position.set(x, y + sy * 0.72, z);
    mark(cap, false, true);
    parent.add(cap);
  }
  return mesh;
}

function buildRocks(api) {
  const g = new THREE.Group();
  g.name = 'rocks';
  const rng = mulberry32(20261110);
  const pts = sampleStream(api.layout.site.stream, 0.85);
  const bridge = api.layout.site.bridge;
  pts.forEach((p, i) => {
    const onBridge = pointSeg(p.x, p.z, bridge.a, bridge.b) < 0.85 && p.z < -1.2 && p.z > -3.8;
    if (onBridge) return;
    const prev = pts[Math.max(0, i - 1)];
    const next = pts[Math.min(pts.length - 1, i + 1)];
    let tx = next.x - prev.x;
    let tz = next.z - prev.z;
    const len = Math.hypot(tx, tz) || 1;
    tx /= len;
    tz /= len;
    const rx = -tz;
    const rz = tx;
    const sides = i % 5 === 0 ? [-1.35, 0.15, 1.4] : [-1.55, 1.5];
    sides.forEach((side, k) => {
      const jx = (rng() - 0.5) * 0.35;
      const jz = (rng() - 0.5) * 0.35;
      const x = p.x + rx * side + jx;
      const z = p.z + rz * side + jz;
      const inChannel = Math.abs(side) < 0.4;
      const big = !inChannel && rng() > 0.78;
      const sx = inChannel
        ? 0.16 + rng() * 0.2
        : (big ? 0.5 : 0.24) + rng() * (big ? 0.4 : 0.26);
      const sy = sx * (0.45 + rng() * 0.4);
      const sz = sx * (0.7 + rng() * 0.45);
      const bed = api.ground(x, z);
      const y = bed + sy * 0.55;
      addRock(g, x, y, z, sx, sy, sz, ROCKS[(i + k) % ROCKS.length], i + k, big ? 1 : 0);
    });
  });
  const heroes = [
    { x: 0.85, z: 8.4, sx: 1.15, sy: 0.48, sz: 0.9, c: '#c8c2b6' },
    { x: 2.15, z: 5.6, sx: 0.72, sy: 0.46, sz: 0.62, c: '#9a9488' },
    { x: -0.35, z: 6.6, sx: 0.85, sy: 0.55, sz: 0.7, c: '#b0aaa0' },
    { x: 0.55, z: 0.35, sx: 1.35, sy: 0.38, sz: 0.7, c: '#8d887e' },
    { x: -1.15, z: 1.55, sx: 0.7, sy: 0.5, sz: 0.58, c: '#a8a296' },
    { x: -2.55, z: -2.15, sx: 0.78, sy: 0.42, sz: 0.66, c: '#9c968c' },
    { x: 2.15, z: -3.15, sx: 0.7, sy: 0.4, sz: 0.6, c: '#b7b1a5' },
    { x: 3.35, z: 5.35, sx: 0.48, sy: 0.32, sz: 0.4, c: '#8a847a' },
  ];
  heroes.forEach((h, i) => {
    const y = api.ground(h.x, h.z) + h.sy * 0.62;
    addRock(g, h.x, y, h.z, h.sx, h.sy, h.sz, h.c, 40 + i, 1);
  });
  return g;
}

function picnicTable(parent, spec, api) {
  const g = new THREE.Group();
  g.name = spec.id;
  const [x, z] = spec.position;
  g.position.set(x, api.ground(x, z), z);
  g.rotation.y = spec.rotationY;
  const wood = toon('#5c4a38');
  const woodAlt = toon('#4a3c2e');
  const metal = toon('#9aa19c');
  const topY = spec.topHeight;
  const seatY = spec.seatHeight;
  const length = spec.length;
  const plankW = 0.122;
  const gap = 0.014;
  const span = 5 * plankW + 4 * gap;
  for (let i = 0; i < 5; i++) {
    const pz = -span / 2 + plankW / 2 + i * (plankW + gap);
    addBox(g, length, 0.038, plankW, i % 2 ? woodAlt : wood, 0, topY, pz);
  }
  addBox(g, length - 0.1, 0.04, 0.24, wood, 0, seatY, spec.seatZ);
  addBox(g, length - 0.1, 0.04, 0.24, woodAlt, 0, seatY, -spec.seatZ);
  for (const fx of [-0.68, 0.68]) {
    addPole(g, fx, 0.02, -0.86, fx, topY - 0.02, -0.22, 0.03, metal, 8);
    addPole(g, fx, 0.02, 0.86, fx, topY - 0.02, 0.22, 0.03, metal, 8);
    addPole(g, fx, seatY - 0.03, -0.7, fx, seatY - 0.03, 0.7, 0.024, metal, 6);
    addPole(g, fx, 0.16, -0.62, fx, 0.16, 0.62, 0.018, metal, 5);
  }
  addPole(g, -0.7, topY - 0.06, 0, 0.7, topY - 0.06, 0, 0.02, metal, 5);
  parent.add(g);
  return g;
}

function parkGrill(parent, spec, api) {
  const g = new THREE.Group();
  g.name = 'grill';
  const [x, z] = spec.position;
  g.position.set(x, api.ground(x, z), z);
  g.rotation.y = spec.rotationY;
  const steel = toon('#8b9188');
  const dark = toon('#3c423e');
  const soot = toon('#2a2d2b');
  addCyl(g, 0.04, 0.048, 0.84, steel, 0, 0.42, 0, 10);
  addBox(g, 0.5, 0.2, 0.32, steel, 0, 0.96, 0);
  addBox(g, 0.42, 0.045, 0.24, soot, 0, 0.9, 0);
  for (let i = -3; i <= 3; i++) addBox(g, 0.4, 0.012, 0.012, dark, 0, 0.935, i * 0.032);
  const hinge = new THREE.Group();
  hinge.position.set(0, 1.06, -0.16);
  hinge.rotation.x = -0.82;
  const lid = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.035, 0.34), steel);
  lid.position.set(0, 0.02, 0.16);
  mark(lid, true, true);
  hinge.add(lid);
  const handle = new THREE.Mesh(new THREE.TorusGeometry(0.055, 0.012, 6, 10), dark);
  handle.rotation.x = Math.PI / 2;
  handle.position.set(0, 0.07, 0.3);
  mark(handle, true, false);
  hinge.add(handle);
  g.add(hinge);
  parent.add(g);
}

function prepCounter(parent, spec, api) {
  const g = new THREE.Group();
  g.name = 'prep';
  const [x, z] = spec.position;
  g.position.set(x, api.ground(x, z), z);
  g.rotation.y = spec.rotationY;
  const wood = toon('#6b5140');
  const board = toon('#c6a56a');
  const steel = toon('#5c6360');
  for (const [lx, lz] of [[-0.48, -0.16], [0.48, -0.16], [-0.48, 0.16], [0.48, 0.16]]) {
    addCyl(g, 0.035, 0.042, 0.9, wood, lx, 0.45, lz, 6);
  }
  addBox(g, 1.15, 0.05, 0.48, wood, 0, spec.height, 0);
  addBox(g, 0.9, 0.03, 0.34, toon('#5a4636'), 0, 0.48, 0);
  addBox(g, 0.38, 0.025, 0.26, board, -0.18, spec.height + 0.03, 0.02);
  addCyl(g, 0.12, 0.1, 0.22, steel, 0.72, 0.11, 0.42, 8);
  parent.add(g);
}

function timberBridge(parent, spec, api) {
  const g = new THREE.Group();
  g.name = 'bridge';
  const ax = spec.a[0];
  const az = spec.a[1];
  const bx = spec.b[0];
  const bz = spec.b[1];
  const ay = api.ground(ax, az);
  const by = api.ground(bx, bz);
  const dx = bx - ax;
  const dz = bz - az;
  const L = Math.hypot(dx, dz);
  const ux = dx / L;
  const uz = dz / L;
  const rx = -uz;
  const rz = ux;
  const width = spec.width;
  const logC = toon('#3a322b');
  const railC = toon('#5a4634');
  const deckA = ay + 0.2;
  const deckB = by + 0.2;
  for (const side of [-1, 1]) {
    const inset = width * 0.34;
    addPole(
      g,
      ax + rx * side * inset, deckA - 0.1, az + rz * side * inset,
      bx + rx * side * inset, deckB - 0.1, bz + rz * side * inset,
      0.09, logC, 7,
    );
  }
  const nPlanks = Math.round(L / 0.16);
  for (let i = 0; i <= nPlanks; i++) {
    const t = i / nPlanks;
    const y = deckA + (deckB - deckA) * t;
    const x = ax + dx * t;
    const z = az + dz * t;
    const color = i % 5 === 0 ? '#5c6548' : i % 3 === 0 ? '#5a4a3c' : '#4a4036';
    const plank = new THREE.Mesh(new THREE.BoxGeometry(width, 0.045, 0.12), toon(color));
    plank.position.set(x, y, z);
    plank.rotation.y = Math.atan2(-rz, rx);
    mark(plank, true, true);
    g.add(plank);
  }
  for (const side of [-1, 1]) {
    const posts = 5;
    for (let i = 0; i <= posts; i++) {
      const t = i / posts;
      const y = deckA + (deckB - deckA) * t;
      const x = ax + dx * t + rx * side * width * 0.48;
      const z = az + dz * t + rz * side * width * 0.48;
      addCyl(g, 0.045, 0.052, spec.railHeight, railC, x, y + spec.railHeight / 2, z, 6);
    }
    const yRail = spec.railHeight - 0.04;
    addPole(
      g,
      ax + rx * side * width * 0.48, deckA + yRail, az + rz * side * width * 0.48,
      bx + rx * side * width * 0.48, deckB + yRail, bz + rz * side * width * 0.48,
      0.04, railC, 6,
    );
    addPole(
      g,
      ax + rx * side * width * 0.48, deckA + 0.42, az + rz * side * width * 0.48,
      bx + rx * side * width * 0.48, deckB + 0.42, bz + rz * side * width * 0.48,
      0.03, railC, 5,
    );
  }
  parent.add(g);
}

function signTexture(text, mirror = false) {
  const canvas = document.createElement('canvas');
  canvas.width = 768;
  canvas.height = 192;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#a07d58';
  ctx.fillRect(0, 0, 768, 192);
  ctx.strokeStyle = 'rgba(80,52,28,0.15)';
  ctx.lineWidth = 2;
  for (let i = 0; i < 9; i++) {
    ctx.beginPath();
    ctx.moveTo(0, 16 + i * 20);
    ctx.lineTo(768, 12 + i * 20);
    ctx.stroke();
  }
  if (mirror) {
    ctx.translate(768, 0);
    ctx.scale(-1, 1);
  }
  const label = text.replace('←', '').replace('→', '').trim();
  ctx.fillStyle = '#24180f';
  ctx.font = '700 68px Georgia, Times, serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, 384, 100);
  if (text.includes('←')) {
    ctx.beginPath();
    ctx.moveTo(48, 96);
    ctx.lineTo(102, 66);
    ctx.lineTo(102, 126);
    ctx.fill();
  }
  if (text.includes('→')) {
    ctx.beginPath();
    ctx.moveTo(720, 96);
    ctx.lineTo(666, 66);
    ctx.lineTo(666, 126);
    ctx.fill();
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  tex.needsUpdate = true;
  return tex;
}

function trailSign(parent, spec, api) {
  const g = new THREE.Group();
  g.name = 'sign';
  const [x, z] = spec.position;
  g.position.set(x, api.ground(x, z), z);
  g.rotation.y = spec.rotationY;
  const post = toon('#6a5038');
  addCyl(g, 0.07, 0.08, 1.7, post, 0, 0.82, 0, 8);
  spec.boards.forEach((text, i) => {
    const y = 1.5 - i * 0.42;
    const hang = 0.46;
    addBox(g, 1.2, 0.28, 0.04, toon('#6e5438'), hang, y, 0);
    const face = new THREE.Mesh(new THREE.PlaneGeometry(1.12, 0.24), toon('#ffffff', { map: signTexture(text, false) }));
    face.position.set(hang, y, 0.026);
    mark(face, true, false);
    g.add(face);
    const back = new THREE.Mesh(new THREE.PlaneGeometry(1.12, 0.24), toon('#ffffff', { map: signTexture(text, true) }));
    back.position.set(hang, y, -0.026);
    back.rotation.y = Math.PI;
    mark(back, true, false);
    g.add(back);
  });
  parent.add(g);
}

function fallenLog(parent, spec, api) {
  const g = new THREE.Group();
  g.name = spec.id;
  const [x, z] = spec.position;
  const yaw = spec.rotationY;
  const len = spec.length;
  const radius = spec.radius;
  const ox = Math.cos(yaw);
  const oz = -Math.sin(yaw);
  const x1 = x + ox * len * 0.5;
  const z1 = z + oz * len * 0.5;
  const x2 = x - ox * len * 0.5;
  const z2 = z - oz * len * 0.5;
  const ride = spec.role === 'snag' ? radius * 1.15 : radius * 0.55;
  const y1 = api.ground(x1, z1) + ride;
  const y2 = api.ground(x2, z2) + ride;
  const mid = new THREE.Vector3((x1 + x2) / 2, (y1 + y2) / 2, (z1 + z2) / 2);
  const dir = new THREE.Vector3(x2 - x1, y2 - y1, z2 - z1);
  const span = dir.length() || len;
  const bark = toon(spec.role === 'snag' ? '#8d7a64' : '#6e5642');
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.92, radius, span, 8), bark);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
  mesh.position.copy(mid);
  mark(mesh, true, true);
  g.add(mesh);
  const cutMat = toon('#d2b48a');
  for (const end of [1, -1]) {
    const cut = new THREE.Mesh(new THREE.CircleGeometry(radius * 0.9, 8), cutMat);
    const n = dir.clone().normalize().multiplyScalar(end * span * 0.5);
    cut.position.copy(mid).add(n);
    cut.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), dir.clone().normalize().multiplyScalar(end));
    mark(cut, false, true);
    g.add(cut);
  }
  if (spec.role === 'seat') {
    const nub = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.05, 0.28, 5), bark);
    nub.position.set(x + ox * 0.2, (y1 + y2) / 2 + radius * 0.7, z + oz * 0.2);
    nub.rotation.z = 0.7;
    mark(nub, true, false);
    g.add(nub);
    const moss = new THREE.Mesh(new THREE.IcosahedronGeometry(1, 0), toon('#4d6a40'));
    moss.scale.set(radius * 0.7, radius * 0.22, radius * 0.5);
    moss.position.set(x, (y1 + y2) / 2 + radius * 0.7, z);
    mark(moss, false, true);
    g.add(moss);
  }
  parent.add(g);
}

function trashCan(parent, x, z, api) {
  const g = new THREE.Group();
  g.position.set(x, api.ground(x, z), z);
  const body = toon('#3d4a38');
  addCyl(g, 0.26, 0.24, 0.78, body, 0, 0.39, 0, 10);
  addCyl(g, 0.28, 0.28, 0.06, toon('#2c332c'), 0, 0.8, 0, 10);
  parent.add(g);
}

function hardwood(parent, spec, api) {
  const g = new THREE.Group();
  g.position.set(spec.x, api.ground(spec.x, spec.z), spec.z);
  g.rotation.y = spec.yaw || 0;
  g.rotation.z = (spec.lean || 0) * 0.35;
  const rng = mulberry32(spec.seed * 17 + 3);
  const bark = toon(spec.bark || '#5c4636');
  const trunkH = spec.h * (spec.style === 'sapling' ? 0.55 : 0.52);
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(spec.r * 0.55, spec.r, trunkH, 7), bark);
  trunk.position.y = trunkH / 2 - 0.05;
  mark(trunk, true, true);
  g.add(trunk);
  const leaderH = spec.h * 0.26;
  const leader = new THREE.Mesh(new THREE.CylinderGeometry(spec.r * 0.2, spec.r * 0.48, leaderH, 6), bark);
  leader.position.set((spec.lean || 0) * 0.5, trunkH + leaderH * 0.4, 0);
  leader.rotation.z = spec.lean || 0;
  mark(leader, true, true);
  g.add(leader);
  if (spec.r > 0.18) {
    for (let i = 0; i < 3; i++) {
      const flare = new THREE.Mesh(new THREE.ConeGeometry(spec.r * 0.45, spec.r * 1.3, 5), bark);
      const a = i * 2.15 + spec.seed;
      flare.position.set(Math.cos(a) * spec.r * 0.75, spec.r * 0.28, Math.sin(a) * spec.r * 0.75);
      flare.rotation.z = Math.cos(a) * 0.9;
      flare.rotation.x = Math.sin(a) * 0.9;
      mark(flare, true, true);
      g.add(flare);
    }
  }
  const styleN = { broad: 8, tall: 5, split: 6, lean: 6, sapling: 5 };
  const n = styleN[spec.style] || 5;
  for (let i = 0; i < n; i++) {
    const ang = (i / n) * Math.PI * 2 + rng() * 0.55;
    const spread = spec.style === 'broad' ? 1.15 : spec.style === 'sapling' ? 0.7 : 0.55;
    const rad = spread + rng() * (spec.style === 'broad' ? 1.25 : spec.style === 'sapling' ? 0.45 : 0.65);
    const y = spec.h * (0.58 + rng() * 0.36);
    const s = spec.h * (spec.style === 'sapling' ? 0.07 : 0.055) * (0.85 + rng() * 0.7);
    const cx = Math.cos(ang) * rad + (spec.lean || 0) * spec.h * 0.12;
    const cz = Math.sin(ang) * rad * (spec.style === 'tall' ? 0.55 : 0.82);
    if (i < 4 && spec.style !== 'sapling') {
      addPole(g, (spec.lean || 0) * 0.3, y * 0.72, 0, cx * 0.82, y * 0.9, cz * 0.82, spec.r * 0.16 + 0.02, bark, 5);
    }
    const color = i === n - 1 ? '#6e8c54' : GREENS[(spec.seed + i * 3) % GREENS.length];
    const leaf = new THREE.Mesh(new THREE.IcosahedronGeometry(1, 1), toon(color));
    const flat = spec.style === 'sapling' ? 0.32 : 0.42;
    leaf.scale.set(s * (1.05 + rng() * 0.55), s * (flat + rng() * 0.22), s * (0.9 + rng() * 0.5));
    leaf.position.set(cx, y, cz);
    leaf.rotation.set(rng() * 2, rng() * 2, rng());
    mark(leaf, s > spec.h * 0.045, false);
    g.add(leaf);
  }
  parent.add(g);
}

function conifer(parent, spec, api) {
  const g = new THREE.Group();
  g.position.set(spec.x, api.ground(spec.x, spec.z), spec.z);
  g.rotation.z = spec.lean || 0;
  const bark = toon(spec.bark || '#3a322c');
  const trunkH = spec.h * 0.34;
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(spec.r * 0.45, spec.r, trunkH, 6), bark);
  trunk.position.y = trunkH * 0.42;
  mark(trunk, true, true);
  g.add(trunk);
  const layers = 6;
  for (let i = 0; i < layers; i++) {
    const t = i / (layers - 1);
    const radius = spec.h * 0.155 * (1.08 - t * 0.8) * (i % 2 ? 0.88 : 1);
    const cone = new THREE.Mesh(
      new THREE.ConeGeometry(radius, spec.h * 0.22, 7),
      toon(i % 2 ? '#2c4a34' : '#3d6244'),
    );
    cone.position.y = spec.h * 0.26 + i * spec.h * 0.11;
    cone.rotation.y = i * 0.5 + (spec.seed || 0);
    mark(cone, true, false);
    g.add(cone);
  }
  parent.add(g);
}

function shrub(parent, x, z, h, seed, api) {
  const g = new THREE.Group();
  g.position.set(x, api.ground(x, z), z);
  const rng = mulberry32(seed);
  const stem = toon('#3e4a32');
  const n = 6;
  for (let i = 0; i < n; i++) {
    const ang = (i / n) * Math.PI * 2 + rng() * 0.4;
    const rad = 0.12 + rng() * 0.34;
    const sx = Math.cos(ang) * rad;
    const sz = Math.sin(ang) * rad;
    addCyl(g, 0.015, 0.022, 0.35 + rng() * 0.2, stem, sx * 0.4, 0.16, sz * 0.4, 4);
    const leaf = new THREE.Mesh(new THREE.IcosahedronGeometry(1, 0), toon(GREENS[(seed + i * 2) % GREENS.length]));
    const s = 0.22 + rng() * 0.16;
    leaf.scale.set(s * (1.1 + rng() * 0.4), s * 0.42, s * (0.8 + rng() * 0.3));
    leaf.position.set(sx, 0.32 + rng() * h * 0.35, sz);
    leaf.rotation.y = ang;
    mark(leaf, false, true);
    g.add(leaf);
  }
  parent.add(g);
}

function fern(parent, x, z, seed, api) {
  const g = new THREE.Group();
  g.position.set(x, api.ground(x, z), z);
  const rng = mulberry32(seed);
  const col = toon(rng() > 0.5 ? '#3e6a3a' : '#4f7a46');
  const n = 5;
  for (let i = 0; i < n; i++) {
    const len = 0.48 + rng() * 0.22;
    const frond = new THREE.Mesh(new THREE.ConeGeometry(0.16, len, 4), col);
    const ang = (i / n) * Math.PI * 2 + rng() * 0.25;
    frond.position.set(Math.cos(ang) * 0.06, 0.06, Math.sin(ang) * 0.06);
    frond.rotation.order = 'YXZ';
    frond.rotation.y = ang;
    frond.rotation.x = 0.95 + rng() * 0.2;
    mark(frond, false, true);
    g.add(frond);
  }
  parent.add(g);
}

let siteApi = null;

function makeShell(layout) {
  siteApi = createSite(layout);
  const g = new THREE.Group();
  g.name = 'shell';
  g.add(buildTerrain(siteApi));
  g.add(buildWater(siteApi));
  g.add(buildRocks(siteApi));
  return g;
}

function makeProcedural(layout) {
  const api = siteApi;
  const g = new THREE.Group();
  g.name = 'grove';
  for (const table of layout.site.tables) picnicTable(g, table, api);
  parkGrill(g, layout.site.grill, api);
  prepCounter(g, layout.site.prep, api);
  timberBridge(g, layout.site.bridge, api);
  trailSign(g, layout.site.sign, api);
  for (const log of layout.site.logs) fallenLog(g, log, api);
  trashCan(g, 4.15, 0.35, api);
  for (const tree of layout.site.trees) {
    if (tree.kind === 'conifer') conifer(g, tree, api);
    else hardwood(g, tree, api);
  }
  const shrubs = [
    [-3.8, -3.2, 0.9, 41],
    [-2.2, 1.8, 1.05, 42],
    [-4.8, 5.2, 0.95, 43],
    [0.5, -7.6, 0.85, 44],
    [4.4, -6.9, 0.9, 45],
    [9.4, 6.6, 0.85, 46],
    [11.2, -2.4, 0.95, 47],
    [-6.6, 5.8, 0.9, 48],
    [1.2, 9.4, 0.8, 49],
    [7.6, -6.9, 0.85, 50],
    [-1.9, 5.8, 1.0, 51],
    [5.6, -7.8, 0.8, 52],
  ];
  for (const [x, z, h, seed] of shrubs) shrub(g, x, z, h, seed, api);
  const ferns = [
    [2.55, 6.85, 61],
    [3.55, 6.7, 62],
    [2.15, 7.45, 63],
    [-1.7, 2.4, 64],
    [0.85, 2.9, 65],
    [-2.35, 0.15, 66],
    [2.7, -1.45, 67],
    [3.45, 5.15, 68],
    [-0.15, 7.7, 69],
    [1.7, -3.5, 70],
    [-3.2, -1.2, 71],
    [4.15, 7.15, 72],
  ];
  for (const [x, z, seed] of ferns) fern(g, x, z, seed, api);
  return g;
}

boot({
  makeShell,
  makeProcedural,
  readyText: 'ready — woodland picnic · drag orbit · U unlit · T toon',
  decorate({ prototypes, layout, procedural, shadingMode }) {
    for (const item of layout.site.topItems) {
      const table = procedural.getObjectByName(item.table);
      const proto = prototypes[item.kind];
      if (!table || !proto) throw new Error(`missing ${item.kind} for ${item.id}`);
      const node = proto.clone(true);
      applyShading(node, shadingMode);
      node.position.set(item.local[0], 0.76, item.local[1]);
      node.rotation.y = item.rotationY || 0;
      node.name = item.id;
      table.add(node);
    }
  },
});
