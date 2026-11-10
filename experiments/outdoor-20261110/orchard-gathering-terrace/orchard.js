import * as THREE from 'three';
import { mergeGeometries } from './vendor/utils/BufferGeometryUtils.js';
import { boot, toon } from './scene_lib.js';

const STONE = ['#cbbba0', '#b7a58c', '#a89880', '#d5c6ae', '#8f7e6a', '#9c8d78', '#e0d3bf', '#7d6e5c'];
const HONEY = ['#e0d0b4', '#d2c2a4', '#c4b392', '#eadcc6', '#b5a384', '#cfc0a6', '#f0e4d0', '#a89478'];
const TILES = ['#a85a38', '#c46a42', '#8d4632', '#b85a36', '#9a4e30'];

const SPECIES = {
  apple: {
    trunkH: 0.95, trunkR: 0.11, bark: '#6b4632',
    leaf: ['#4e6b34', '#6a8438', '#7d8a3c'],
    fruit: ['#c4472e', '#e0a23a', '#a33b2c'],
    fruitR: 0.055, spread: 1.2, upright: 0.28, leaders: 4,
  },
  pear: {
    trunkH: 1.28, trunkR: 0.095, bark: '#5c4030',
    leaf: ['#5a7438', '#3f5c30', '#6d8440'],
    fruit: ['#d6c45e', '#c6b44a'],
    fruitR: 0.048, spread: 0.72, upright: 0.85, leaders: 3,
  },
  plum: {
    trunkH: 0.78, trunkR: 0.1, bark: '#4e382c',
    leaf: ['#3a5230', '#314628', '#4d6636'],
    fruit: ['#6a3058', '#7a4468'],
    fruitR: 0.038, spread: 1.05, upright: 0.42, leaders: 5,
  },
};

function mulberry32(seed) {
  let a = seed >>> 0;
  return function rand() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shadeHex(hex, amt) {
  const c = new THREE.Color(hex);
  c.offsetHSL(0, 0, amt);
  return '#' + c.getHexString();
}

class Buckets {
  constructor() { this.map = new Map(); }
  add(color, geo, opts = {}) {
    const side = opts.side || 'front';
    const cast = opts.cast === false ? '0' : '1';
    const key = color + '|' + side + '|' + cast;
    if (!this.map.has(key)) this.map.set(key, { color, side, cast: opts.cast !== false, geos: [] });
    this.map.get(key).geos.push(geo);
  }
  flush(parent) {
    for (const b of this.map.values()) {
      const merged = mergeGeometries(b.geos, false);
      for (const g of b.geos) g.dispose();
      if (!merged) {
        console.warn('merge failed', b.color, b.geos.length);
        continue;
      }
      const mesh = new THREE.Mesh(merged, toon(b.color, {
        side: b.side === 'double' ? THREE.DoubleSide : THREE.FrontSide,
      }));
      mesh.castShadow = b.cast;
      mesh.receiveShadow = true;
      if (!b.cast) mesh.userData.noCast = true;
      parent.add(mesh);
    }
    this.map.clear();
  }
}

function putGeo(buckets, color, geo, x, y, z, rx = 0, ry = 0, rz = 0, opts) {
  const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz));
  geo.applyMatrix4(new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), q, new THREE.Vector3(1, 1, 1)));
  buckets.add(color, geo, opts);
}

function putBox(buckets, color, w, h, d, x, y, z, ry = 0, opts) {
  putGeo(buckets, color, new THREE.BoxGeometry(w, h, d), x, y, z, 0, ry, 0, opts);
}

function putSphere(buckets, color, r, x, y, z, sx = 1, sy = 1, sz = 1, q, opts) {
  const geo = new THREE.SphereGeometry(r, 7, 5);
  const quat = q || new THREE.Quaternion();
  geo.applyMatrix4(new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), quat, new THREE.Vector3(sx, sy, sz)));
  buckets.add(color, geo, opts);
}

function putCyl(buckets, color, rBot, rTop, ax, ay, az, bx, by, bz, seg = 7, opts) {
  const dir = new THREE.Vector3(bx - ax, by - ay, bz - az);
  const len = dir.length();
  if (len < 1e-4) return;
  const geo = new THREE.CylinderGeometry(Math.max(0.004, rTop), Math.max(0.004, rBot), len, seg);
  const mid = new THREE.Vector3((ax + bx) / 2, (ay + by) / 2, (az + bz) / 2);
  const quat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.multiplyScalar(1 / len));
  geo.applyMatrix4(new THREE.Matrix4().compose(mid, quat, new THREE.Vector3(1, 1, 1)));
  buckets.add(color, geo, opts);
}

function putCone(buckets, color, r, h, x, y, z) {
  putGeo(buckets, color, new THREE.ConeGeometry(r, h, 5), x, y + h / 2, z, 0, 0, 0);
}

function terraceById(layout, id) {
  return layout.terraces.find((t) => t.id === id);
}

function ribbonMesh(points, width, yLift, color) {
  const positions = [];
  const indices = [];
  for (let i = 0; i < points.length; i++) {
    const prev = points[Math.max(0, i - 1)];
    const next = points[Math.min(points.length - 1, i + 1)];
    let tx = next[0] - prev[0];
    let tz = next[2] - prev[2];
    const l = Math.hypot(tx, tz) || 1;
    tx /= l;
    tz /= l;
    const px = -tz;
    const pz = tx;
    const y = points[i][1] + yLift;
    const hw = width * 0.5;
    positions.push(points[i][0] + px * hw, y, points[i][2] + pz * hw);
    positions.push(points[i][0] - px * hw, y, points[i][2] - pz * hw);
  }
  for (let i = 0; i < points.length - 1; i++) {
    const a = i * 2;
    indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  const mesh = new THREE.Mesh(geo, toon(color, { side: THREE.DoubleSide }));
  mesh.userData.noCast = true;
  mesh.receiveShadow = true;
  return mesh;
}

function slopeMesh(xIn, xOut, z0, z1, yIn, yOut, color) {
  const positions = new Float32Array([
    xIn, yIn, z0, xOut, yOut, z0, xIn, yIn, z1,
    xOut, yOut, z0, xOut, yOut, z1, xIn, yIn, z1,
  ]);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.computeVertexNormals();
  const mesh = new THREE.Mesh(geo, toon(color, { side: THREE.DoubleSide }));
  mesh.userData.noCast = true;
  mesh.receiveShadow = true;
  return mesh;
}

function addWallSegment(buckets, a, b, base, top, seed, opts = {}) {
  const rand = mulberry32(seed);
  const palette = opts.palette || STONE;
  const dx = b[0] - a[0];
  const dz = b[1] - a[1];
  const len = Math.hypot(dx, dz) || 0.001;
  const ux = dx / len;
  const uz = dz / len;
  const px = -uz;
  const pz = ux;
  const ry = Math.atan2(uz, ux);
  const height = Math.max(0.05, top - base);
  const thick = opts.thick || 0.42;
  let y = 0;
  let course = 0;
  while (y < height - 0.004 && course < 28) {
    const ch = Math.min(0.1 + rand() * 0.06, height - y);
    const coping = !opts.noCoping && y + ch >= height - 0.02;
    let s = 0;
    let guard = 0;
    while (s < len - 0.02 && guard < 100) {
      guard += 1;
      let sw = coping ? 0.4 + rand() * 0.48 : 0.24 + rand() * 0.34;
      if (opts.regular) sw = coping ? 0.52 + rand() * 0.3 : 0.36 + rand() * 0.3;
      if (s + sw > len) sw = len - s;
      if (sw < 0.07) break;
      const mid = s + sw * 0.5;
      const wx = a[0] + ux * mid;
      const wz = a[1] + uz * mid;
      const wy = base + y + ch * 0.5;
      if (opts.skip && opts.skip(wx, wy, wz, sw, ch)) {
        s += Math.max(sw, 0.12);
        continue;
      }
      const sd = (coping ? thick + 0.07 : thick) * (0.94 + rand() * 0.1);
      const j = (rand() - 0.5) * (coping ? 0.015 : 0.04);
      const color = palette[(seed + course * 5 + Math.floor(mid * 3)) % palette.length];
      putGeo(
        buckets, color,
        new THREE.BoxGeometry(sw * (coping ? 1.02 : 0.96), ch * 0.92, sd),
        wx + px * j, wy, wz + pz * j,
        0, ry + (rand() - 0.5) * 0.06, 0,
      );
      if (!coping && course < 2 && rand() > 0.78 && !opts.noRubble) {
        putGeo(
          buckets, palette[(seed + course + 4) % palette.length],
          new THREE.BoxGeometry(0.16 + rand() * 0.16, 0.09, 0.13 + rand() * 0.08),
          wx + px * (thick * 0.75), base + 0.045, wz + pz * (thick * 0.75),
          0, rand() * 2, 0,
        );
      }
      s += sw * 0.9;
    }
    y += ch * 0.97;
    course += 1;
  }
}

function addSteps(buckets, spec) {
  const { x, zWall, y0, y1, width, run, n } = spec;
  const rise = (y1 - y0) / n;
  const depth = run + 0.05;
  for (let i = 0; i < n; i++) {
    const zBack = zWall - 0.06 + (n - 1 - i) * run;
    const zc = zBack + depth * 0.5;
    const top = y0 + rise * (i + 1);
    putBox(buckets, STONE[(i + 3) % STONE.length], width, rise + 0.025, depth, x, top - rise * 0.5, zc);
    putBox(buckets, i % 2 ? '#e4d7c4' : '#efe4d2', width * 0.96, 0.028, depth * 0.94, x, top - 0.012, zc);
  }
}

function addPier(buckets, p) {
  const rand = mulberry32((p.x * 13 + p.z * 7) | 0);
  let y = 0;
  let course = 0;
  while (y < p.h - 0.01 && course < 10) {
    const ch = Math.min(0.14 + rand() * 0.05, p.h - y);
    const shrink = 1 - course * 0.02;
    putBox(
      buckets, STONE[(course + 1) % STONE.length],
      p.w * shrink, ch * 0.93, p.d * shrink,
      p.x + (rand() - 0.5) * 0.02, p.y + y + ch / 2, p.z + (rand() - 0.5) * 0.02,
      (rand() - 0.5) * 0.08,
    );
    y += ch * 0.96;
    course += 1;
  }
}

function addTerrace(buckets, t) {
  const cx = (t.x0 + t.x1) / 2;
  const cz = (t.z0 + t.z1) / 2;
  const w = t.x1 - t.x0;
  const d = t.z1 - t.z0;
  if (t.id !== 'low') {
    const bottom = Math.max(-0.15, t.y - 1.05);
    const h = t.y - 0.07 - bottom;
    putBox(buckets, '#7a5a3e', w + 0.1, h, d + 0.35, cx, bottom + h / 2, cz + 0.08, 0, { cast: false });
  }
  const grass = t.id === 'crest' ? '#8c8a4a' : t.id === 'high' ? '#7c8944' : '#808b46';
  putBox(buckets, grass, w, 0.08, d, cx, t.y - 0.04, cz, 0, { cast: false });
  const rand = mulberry32((t.x0 * 4 + t.z1 * 9) | 0);
  const patches = t.id === 'low' ? 6 : 3;
  for (let i = 0; i < patches; i++) {
    const px = t.x0 + 1 + rand() * (w - 2);
    const pz = t.z0 + 0.7 + rand() * (d - 1.4);
    putBox(
      buckets, rand() > 0.45 ? '#90984c' : '#6c763c',
      1.5 + rand() * 2.4, 0.02, 1.2 + rand() * 1.6,
      px, t.y + 0.012, pz, rand() * 0.5, { cast: false },
    );
  }
}

function hillMesh(hill) {
  const x0 = -18;
  const x1 = 18;
  const zStart = hill.z0;
  const zEnd = hill.z1 - 1.2;
  const nx = 22;
  const nz = 14;
  const positions = [];
  const indices = [];
  const hy = (x, z) => {
    const t = THREE.MathUtils.clamp((hill.z0 - z) / (hill.z0 - hill.z1), 0, 1);
    const base = hill.y0 + t * (hill.y1 - hill.y0);
    const edge = THREE.MathUtils.smoothstep(Math.abs(x), 8.5, 17);
    return base * (1 - edge * 0.7);
  };
  for (let j = 0; j <= nz; j++) {
    for (let i = 0; i <= nx; i++) {
      const x = x0 + ((x1 - x0) * i) / nx;
      const z = zStart + ((zEnd - zStart) * j) / nz;
      positions.push(x, hy(x, z), z);
    }
  }
  for (let j = 0; j < nz; j++) {
    for (let i = 0; i < nx; i++) {
      const a = j * (nx + 1) + i;
      indices.push(a, a + 1, a + nx + 1, a + 1, a + nx + 2, a + nx + 1);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  const mesh = new THREE.Mesh(geo, toon('#c2b184', { side: THREE.DoubleSide }));
  mesh.userData.noCast = true;
  mesh.receiveShadow = true;
  mesh.name = 'hill';
  return mesh;
}

function hillSward(hill) {
  const x0 = -7.4;
  const x1 = 6.8;
  const zStart = hill.z0 - 0.6;
  const zEnd = -20.2;
  const nx = 12;
  const nz = 7;
  const hy = (x, z) => {
    const t = THREE.MathUtils.clamp((hill.z0 - z) / (hill.z0 - hill.z1), 0, 1);
    const base = hill.y0 + t * (hill.y1 - hill.y0);
    const edge = THREE.MathUtils.smoothstep(Math.abs(x), 8.5, 17);
    return base * (1 - edge * 0.7) + 0.035;
  };
  const positions = [];
  const indices = [];
  for (let j = 0; j <= nz; j++) {
    for (let i = 0; i <= nx; i++) {
      const x = x0 + ((x1 - x0) * i) / nx;
      const z = zStart + ((zEnd - zStart) * j) / nz;
      positions.push(x, hy(x, z), z);
    }
  }
  for (let j = 0; j < nz; j++) {
    for (let i = 0; i < nx; i++) {
      const a = j * (nx + 1) + i;
      indices.push(a, a + 1, a + nx + 1, a + 1, a + nx + 2, a + nx + 1);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  const mesh = new THREE.Mesh(geo, toon('#9aa25a', { side: THREE.DoubleSide }));
  mesh.userData.noCast = true;
  mesh.receiveShadow = true;
  mesh.name = 'hill-sward';
  return mesh;
}

function makeSky() {
  const geo = new THREE.SphereGeometry(96, 28, 16);
  const pos = geo.attributes.position;
  const horizon = new THREE.Color('#f6d2a6');
  const zenith = new THREE.Color('#b7c4d4');
  const below = new THREE.Color('#e8c198');
  const colors = [];
  for (let i = 0; i < pos.count; i++) {
    const ny = pos.getY(i) / 96;
    const c = new THREE.Color();
    if (ny >= 0) c.copy(horizon).lerp(zenith, Math.pow(ny, 0.72));
    else c.copy(horizon).lerp(below, Math.min(1, -ny * 1.4));
    colors.push(c.r, c.g, c.b);
  }
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  const mat = new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, depthWrite: false, fog: false });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.userData.keepMaterial = true;
  mesh.frustumCulled = false;
  mesh.name = 'sky';
  return mesh;
}

function foliage(buckets, colors, p, rand, scale, spec) {
  if (p.y < 0.42) return;
  const sparse = !!spec.sparse;
  const n = spec.simple ? 4 : sparse ? 3 : 5;
  for (let i = 0; i < n; i++) {
    const s = (0.16 + rand() * 0.13) * scale;
    const q = new THREE.Quaternion().setFromEuler(new THREE.Euler((rand() - 0.5) * 1.05, rand() * Math.PI * 2, (rand() - 0.5)));
    putSphere(
      buckets, colors[i % colors.length], 1,
      p.x + (rand() - 0.5) * 0.4 * scale,
      p.y + (rand() - 0.4) * 0.2 * scale,
      p.z + (rand() - 0.5) * 0.4 * scale,
      s * 1.25, s * 0.38, s * 0.82,
      q, { side: 'double' },
    );
  }
}

function fruitAt(buckets, sp, p, rand, spec) {
  if (spec.simple && rand() > 0.45) return;
  let count = spec.picked ? (rand() > 0.65 ? 1 : 0) : 1 + (rand() > 0.55 ? 1 : 0);
  if (spec.sparse) count = Math.min(count, 1);
  for (let i = 0; i < count; i++) {
    putSphere(
      buckets, sp.fruit[Math.floor(rand() * sp.fruit.length)], sp.fruitR,
      p.x + (rand() - 0.5) * 0.14,
      p.y - 0.05 - rand() * 0.07,
      p.z + (rand() - 0.5) * 0.14,
    );
  }
}

function addLadder(buckets) {
  const wood = '#8d623c';
  putCyl(buckets, wood, 0.026, 0.02, 0.62, 0.02, 0.12, 0.06, 1.78, -0.02, 5);
  putCyl(buckets, wood, 0.026, 0.02, 0.62, 0.02, 0.4, 0.06, 1.78, 0.26, 5);
  for (let i = 0; i < 6; i++) {
    const t = 0.14 + i * 0.14;
    const y = 0.02 + t * 1.76;
    const x = 0.62 + t * (0.06 - 0.62);
    putCyl(buckets, wood, 0.014, 0.014, x, y, 0.12, x, y, 0.4, 4);
  }
}

function buildTree(spec) {
  const sp = SPECIES[spec.species];
  const rand = mulberry32(spec.seed);
  const sc = spec.scale;
  const g = new THREE.Group();
  g.name = spec.id;
  g.position.set(spec.x, spec.y, spec.z);
  g.userData.kind = 'tree';
  g.userData.baseY = spec.y;
  const buckets = new Buckets();
  const bark = shadeHex(sp.bark, (rand() - 0.5) * 0.06);
  const trunkH = sp.trunkH * sc;
  const r = sp.trunkR * sc;
  putCyl(buckets, bark, r * 1.7, r * 1.15, 0, -0.02, 0, 0, 0.18 * sc, 0, 8);
  const lean = (spec.lean || 0.3) * 0.26 * sc;
  const la = rand() * Math.PI * 2;
  const crotch = new THREE.Vector3(Math.cos(la) * lean, trunkH, Math.sin(la) * lean);
  putCyl(buckets, bark, r * 1.12, r * 0.7, 0, 0.1 * sc, 0, crotch.x, crotch.y, crotch.z, 7);
  const leaders = Math.max(2, sp.leaders + (spec.simple ? -1 : (rand() > 0.62 ? 1 : 0)));
  for (let i = 0; i < leaders; i++) {
    const ang = (i / leaders) * Math.PI * 2 + (rand() - 0.5) * 0.85;
    const dir = new THREE.Vector3(
      Math.cos(ang) * sp.spread,
      0.3 + sp.upright * 0.72 + rand() * 0.28,
      Math.sin(ang) * sp.spread,
    ).normalize();
    const len = (1.25 + rand() * 1.15) * sc * (spec.simple ? 0.84 : 1);
    const end = crotch.clone().add(dir.clone().multiplyScalar(len));
    if (end.y < 0.65 * sc) end.y = 0.65 * sc;
    const r0 = r * (0.4 + rand() * 0.1);
    const r1 = r * 0.16;
    putCyl(buckets, bark, r0, r1, crotch.x, crotch.y, crotch.z, end.x, end.y, end.z, 6);
    const twigs = 2;
    for (let k = 0; k < twigs; k++) {
      const t = 0.5 + k * 0.24;
      const origin = crotch.clone().lerp(end, t);
      const yaw = ang + (k === 0 ? -1 : 1) * (0.4 + rand() * 0.5);
      const dir2 = new THREE.Vector3(Math.cos(yaw), 0.32 + rand() * 0.5, Math.sin(yaw)).normalize();
      const end2 = origin.clone().add(dir2.multiplyScalar(len * (0.26 + rand() * 0.16)));
      if (end2.y < 0.55 * sc) end2.y = 0.55 * sc;
      putCyl(buckets, bark, r1, r1 * 0.45, origin.x, origin.y, origin.z, end2.x, end2.y, end2.z, 5);
      foliage(buckets, sp.leaf, end2, rand, sc, spec);
      fruitAt(buckets, sp, end2, rand, spec);
    }
    foliage(buckets, sp.leaf, end, rand, sc * 1.05, spec);
    foliage(buckets, sp.leaf, crotch.clone().lerp(end, 0.74), rand, sc * 0.8, spec);
    if (!spec.sparse) fruitAt(buckets, sp, end, rand, spec);
  }
  if (!spec.simple) {
    for (let i = 0; i < 4; i++) {
      const a = rand() * Math.PI * 2;
      const rr = r * 2.2 + rand() * 0.25;
      putCone(buckets, rand() > 0.5 ? '#6d7a3a' : '#8a8644', 0.08 + rand() * 0.05, 0.16 + rand() * 0.12, Math.cos(a) * rr, 0, Math.sin(a) * rr);
    }
  }
  if (spec.ladder) addLadder(buckets);
  if (spec.stake) putCyl(buckets, '#6d5236', 0.02, 0.014, 0.16, 0, 0.04, 0.12, Math.max(0.7, trunkH * 0.9), 0.02, 5);
  if (spec.ladder || spec.picked) {
    const nDrop = spec.ladder ? 6 : 3;
    for (let i = 0; i < nDrop; i++) {
      const a = rand() * Math.PI * 2;
      const rr = 0.28 + rand() * 0.85;
      putSphere(buckets, sp.fruit[i % sp.fruit.length], sp.fruitR, Math.cos(a) * rr, sp.fruitR * 0.85, Math.sin(a) * rr);
    }
  }
  buckets.flush(g);
  return g;
}

function addVine(buckets, pts, radius, rand) {
  const curve = new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(p[0], p[1], p[2])));
  buckets.add('#5b3c2a', new THREE.TubeGeometry(curve, 24, radius, 5, false));
  const leafCols = ['#5d7a38', '#6e8a40', '#4f6a32', '#97a84a'];
  for (let t = 0.12; t <= 0.98; t += 0.055) {
    const p = curve.getPoint(t);
    const s = 0.1 + rand() * 0.07;
    const q = new THREE.Quaternion().setFromEuler(new THREE.Euler((rand() - 0.5) * 0.8, rand() * 6, (rand() - 0.5) * 0.6));
    putSphere(
      buckets, leafCols[Math.floor(rand() * leafCols.length)], 1,
      p.x + (rand() - 0.5) * 0.18, p.y - rand() * 0.12, p.z + (rand() - 0.5) * 0.18,
      s * 1.35, s * 0.28, s * 0.95, q, { side: 'double' },
    );
  }
}

function addBunch(buckets, x, y, z, rand) {
  const cols = ['#5c3d72', '#6e4a62', '#4e3458', '#7d8a42'];
  const n = 8 + Math.floor(rand() * 5);
  for (let i = 0; i < n; i++) {
    const a = rand() * Math.PI * 2;
    const rr = rand() * 0.065;
    putSphere(buckets, cols[i % cols.length], 0.016 + rand() * 0.008, x + Math.cos(a) * rr, y - rand() * 0.16, z + Math.sin(a) * rr);
  }
}

function addPergola(parent, layout) {
  const P = layout.pergola;
  const y0 = terraceById(layout, P.terrace).y;
  const buckets = new Buckets();
  const posts = [];
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 0, 1]) posts.push([P.x + sx * P.halfX, P.z + sz * P.halfZ]);
  }
  for (const [px, pz] of posts) {
    putBox(buckets, '#b7a48c', 0.32, 0.08, 0.32, px, y0 + 0.04, pz);
    putCyl(buckets, '#6d5138', 0.085, 0.07, px, y0 + 0.08, pz, px, y0 + P.postH, pz, 8);
  }
  const beamY = y0 + P.postH + 0.06;
  for (const sz of [-1, 1]) {
    putBox(buckets, '#7a5a3c', P.halfX * 2 + 0.28, 0.12, 0.11, P.x, beamY, P.z + sz * P.halfZ);
  }
  const rafterY = beamY + 0.1;
  const span = P.halfX * 2;
  const count = Math.round(span / 0.52);
  for (let i = 0; i <= count; i++) {
    const x = P.x - P.halfX + (span * i) / count;
    const col = i % 3 === 0 ? '#8d6846' : '#6e5036';
    putBox(buckets, col, 0.065, 0.085, P.halfZ * 2 + 0.28, x, rafterY, P.z);
  }
  const rand = mulberry32(77);
  const beamTop = y0 + P.postH + 0.16;
  addVine(buckets, [
    [posts[0][0], y0, posts[0][1]],
    [posts[0][0], y0 + 1.1, posts[0][1]],
    [posts[0][0], beamTop, posts[0][1]],
    [posts[0][0] + 1.3, beamTop + 0.05, posts[0][1] + 0.05],
    [posts[0][0] + 2.8, beamTop - 0.02, posts[0][1]],
  ], 0.028, rand);
  addVine(buckets, [
    [posts[3][0], y0, posts[3][1]],
    [posts[3][0] + 0.05, y0 + 1.3, posts[3][1]],
    [posts[3][0], beamTop, posts[3][1]],
    [posts[3][0] - 1.4, beamTop + 0.08, posts[3][1] + 0.1],
    [posts[3][0] - 2.9, beamTop, posts[3][1] - 0.05],
  ], 0.03, rand);
  addVine(buckets, [
    [P.x - 1.8, beamTop, P.z - 0.2],
    [P.x - 0.7, beamTop - 0.18, P.z + 0.15],
    [P.x + 0.35, beamTop - 0.05, P.z - 0.1],
    [P.x + 1.5, beamTop + 0.04, P.z + 0.12],
    [P.x + 2.4, beamTop - 0.08, P.z - 0.05],
  ], 0.022, rand);
  addVine(buckets, [
    [posts[2][0], y0 + 0.2, posts[2][1]],
    [posts[2][0], beamTop, posts[2][1]],
    [P.x - 1.2, beamTop + 0.02, P.z + 0.4],
    [P.x + 0.2, beamTop - 0.1, P.z + 0.9],
    [P.x + 1.6, beamTop, P.z + 0.5],
  ], 0.02, rand);
  addVine(buckets, [
    [P.x - 2.6, beamTop, P.z - 0.85],
    [P.x - 1.2, beamTop - 0.12, P.z - 0.7],
    [P.x + 0.2, beamTop + 0.02, P.z - 0.95],
    [P.x + 1.6, beamTop - 0.08, P.z - 0.6],
    [P.x + 2.7, beamTop, P.z - 0.8],
  ], 0.02, rand);
  addVine(buckets, [
    [posts[5][0], y0 + 0.15, posts[5][1]],
    [posts[5][0], beamTop, posts[5][1]],
    [P.x + 2.2, beamTop + 0.04, P.z + 0.55],
    [P.x + 0.8, beamTop - 0.1, P.z + 1.05],
    [P.x - 0.6, beamTop, P.z + 0.7],
  ], 0.022, rand);
  const bunches = [
    [P.x - 0.4, 0.28, P.z + 0.05],
    [P.x + 0.7, 0.22, P.z - 0.15],
    [P.x + 1.5, 0.16, P.z + 0.2],
    [P.x - 1.3, 0.18, P.z - 0.25],
    [P.x - 2.1, 0.34, P.z + 0.45],
    [P.x + 2.2, 0.3, P.z - 0.35],
    [P.x + 0.15, 0.36, P.z + 0.7],
    [P.x - 0.9, 0.24, P.z - 0.7],
    [P.x + 1.1, 0.32, P.z + 0.85],
  ];
  for (const b of bunches) addBunch(buckets, b[0], beamTop - b[1], b[2], rand);
  const g = new THREE.Group();
  g.name = 'pergola';
  buckets.flush(g);
  parent.add(g);
}

function addTable(parent, layout) {
  const T = layout.table;
  const y0 = terraceById(layout, T.terrace).y;
  const top = y0 + T.top;
  const buckets = new Buckets();
  const plankH = 0.055;
  const n = 5;
  const gap = 0.012;
  const pw = (T.width - gap * (n - 1)) / n;
  const colors = ['#a67b4e', '#b58858', '#966840', '#c09060', '#8d623e'];
  for (let i = 0; i < n; i++) {
    const z = T.z - T.width / 2 + pw / 2 + i * (pw + gap);
    putBox(buckets, colors[i], T.length, plankH, pw, T.x, top - plankH / 2, z);
  }
  putBox(buckets, '#8d3d38', T.length * 0.7, 0.008, 0.26, T.x - 0.1, top + 0.004, T.z);
  const legH = T.top - plankH;
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      putBox(buckets, '#6a4630', 0.09, legH, 0.09, T.x + sx * (T.length / 2 - 0.28), y0 + legH / 2, T.z + sz * (T.width / 2 - 0.12));
    }
  }
  putBox(buckets, '#6a4630', T.length - 0.8, 0.055, 0.055, T.x, y0 + 0.18, T.z);
  putSphere(buckets, '#8a5a38', 0.15, T.x + 0.05, top + 0.015, T.z, 1.3, 0.4, 1.15);
  putGeo(buckets, '#8a5a38', new THREE.TorusGeometry(0.145, 0.012, 6, 16), T.x + 0.05, top + 0.05, T.z, Math.PI / 2, 0, 0);
  const rand = mulberry32(19);
  for (let i = 0; i < 7; i++) {
    const a = rand() * Math.PI * 2;
    const rr = rand() * 0.08;
    const col = ['#c4472e', '#e0a23a', '#a33b2c', '#d6c45e'][i % 4];
    putSphere(buckets, col, 0.045, T.x + 0.05 + Math.cos(a) * rr, top + 0.07 + (i % 2) * 0.03, T.z + Math.sin(a) * rr);
  }
  putSphere(buckets, '#c4472e', 0.042, T.x - 1.45, top + 0.04, T.z - 0.12);
  putSphere(buckets, '#e0a23a', 0.04, T.x - 1.32, top + 0.04, T.z + 0.05);
  putSphere(buckets, '#6a3058', 0.032, T.x - 1.5, top + 0.03, T.z + 0.12);
  const g = new THREE.Group();
  g.name = 'table';
  buckets.flush(g);
  parent.add(g);
}

function addBench(parent, layout) {
  const B = layout.benches[0];
  const y0 = terraceById(layout, B.terrace).y;
  const buckets = new Buckets();
  const seatY = y0 + 0.46;
  const n = 3;
  const gap = 0.008;
  const pw = (B.width - gap * (n - 1)) / n;
  for (let i = 0; i < n; i++) {
    const z = B.z - B.width / 2 + pw / 2 + i * (pw + gap);
    putBox(buckets, i === 1 ? '#b18456' : '#9a7044', B.length, 0.045, pw, B.x, seatY, z);
  }
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      putBox(buckets, '#5c3e2a', 0.07, 0.46, 0.07, B.x + sx * (B.length / 2 - 0.18), y0 + 0.23, B.z + sz * 0.11);
    }
  }
  const g = new THREE.Group();
  g.name = 'bench';
  buckets.flush(g);
  parent.add(g);
}

function addPress(parent, layout) {
  const P = layout.press;
  const buckets = new Buckets();
  putBox(buckets, '#8d7358', 1.28, 0.22, 0.98, 0, 0.11, 0.02);
  putBox(buckets, '#6b4e34', 1.16, 0.08, 0.07, 0, 0.26, 0.46);
  putBox(buckets, '#6b4e34', 1.16, 0.08, 0.07, 0, 0.26, -0.42);
  putBox(buckets, '#6b4e34', 0.07, 0.08, 0.9, -0.56, 0.26, 0.02);
  putBox(buckets, '#6b4e34', 0.07, 0.08, 0.9, 0.56, 0.26, 0.02);
  putBox(buckets, '#3c342c', 0.07, 1.64, 0.07, -0.52, 1.04, 0.02);
  putBox(buckets, '#3c342c', 0.07, 1.64, 0.07, 0.52, 1.04, 0.02);
  putBox(buckets, '#6a4a32', 1.32, 0.24, 0.3, 0, 1.86, 0.02);
  putCyl(buckets, '#3a332e', 0.038, 0.038, 0, 1.08, 0.02, 0, 1.74, 0.02, 8);
  putCyl(buckets, '#5c4030', 0.1, 0.075, 0, 1.16, 0.02, 0, 1.34, 0.02, 8);
  putBox(buckets, '#5c4030', 0.05, 0.05, 0.7, 0, 1.22, 0.02);
  putBox(buckets, '#6a5038', 0.7, 0.08, 0.56, 0, 1.02, 0.02);
  const rand = mulberry32(44);
  for (let i = 0; i < 18; i++) {
    const a = (i / 18) * Math.PI * 2;
    putBox(buckets, '#b08960', 0.016, 0.36, 0.032, Math.cos(a) * 0.26, 0.46, 0.02 + Math.sin(a) * 0.2, a);
  }
  for (let i = 0; i < 14; i++) {
    putSphere(
      buckets, i % 2 ? '#c4472e' : '#e0a23a', 0.048,
      (rand() - 0.5) * 0.32, 0.42 + rand() * 0.16, 0.02 + (rand() - 0.5) * 0.26,
    );
  }
  const g = new THREE.Group();
  g.name = 'press';
  g.position.set(P.x, P.y, P.z);
  buckets.flush(g);
  parent.add(g);
}

function addCrate(parent, c) {
  const buckets = new Buckets();
  const w = 0.62;
  const d = 0.42;
  const h = 0.3;
  const t = 0.022;
  putBox(buckets, '#8d6844', w - 0.04, t, d - 0.04, 0, t / 2, 0);
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      putBox(buckets, '#6b4a30', t, h, t, sx * (w / 2 - t / 2), h / 2, sz * (d / 2 - t / 2));
    }
  }
  for (let i = 0; i < 4; i++) {
    const y = 0.07 + i * 0.055;
    const col = i % 2 ? '#a67b50' : '#8d6840';
    putBox(buckets, col, w, 0.028, t, 0, y, d / 2 - t / 2);
    putBox(buckets, col, w, 0.028, t, 0, y, -d / 2 + t / 2);
    putBox(buckets, col, t, 0.028, d - t * 2, w / 2 - t / 2, y, 0);
    putBox(buckets, col, t, 0.028, d - t * 2, -w / 2 + t / 2, y, 0);
  }
  if (c.fill) {
    const colors = c.fill === 'pear' ? ['#d2c15a', '#c6b44a', '#e4d48a'] : c.fill === 'plum' ? ['#6a3058', '#7a4468'] : ['#c4472e', '#e0a23a', '#a33b2c'];
    const rand = mulberry32((c.seed || Math.round(c.x * 20 + c.z * 13)) >>> 0);
    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < 3; j++) {
        putSphere(buckets, colors[(i + j) % colors.length], 0.042, -0.18 + i * 0.12, 0.12 + ((i + j) % 2) * 0.025, -0.1 + j * 0.09 + (rand() - 0.5) * 0.02);
      }
    }
  }
  const g = new THREE.Group();
  g.position.set(c.x, c.y, c.z);
  g.rotation.y = c.rot || 0;
  g.name = c.id;
  g.userData.kind = 'crate';
  g.userData.baseY = c.y;
  buckets.flush(g);
  parent.add(g);
  if (c.stack > 1) addCrate(parent, { ...c, id: c.id + '-top', y: c.y + 0.31, stack: 1, seed: (c.seed || 3) + 9 });
}

function addBarrel(parent, b) {
  const buckets = new Buckets();
  putCyl(buckets, '#7a5338', b.r * 0.96, b.r, 0, 0.02, 0, 0, b.h * 0.5, 0, 12);
  putCyl(buckets, '#8a6244', b.r, b.r * 0.96, 0, b.h * 0.5, 0, 0, b.h - 0.02, 0, 12);
  for (const fy of [0.22, 0.78]) {
    putGeo(buckets, '#6a5344', new THREE.TorusGeometry(b.r * 0.99, 0.012, 6, 16), 0, b.h * fy, 0, Math.PI / 2, 0, 0);
  }
  const g = new THREE.Group();
  g.position.set(b.x, b.y, b.z);
  g.name = 'barrel';
  buckets.flush(g);
  parent.add(g);
}

function addBasket(parent, b) {
  const buckets = new Buckets();
  putCyl(buckets, '#c2a06a', b.r * 0.85, b.r, 0, 0.02, 0, 0, b.h * 0.35, 0, 10);
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    putBox(buckets, i % 2 ? '#b8925a' : '#a07c48', 0.012, b.h, 0.02, Math.cos(a) * b.r * 0.92, b.h / 2, Math.sin(a) * b.r * 0.92, a);
  }
  putGeo(buckets, '#8d6840', new THREE.TorusGeometry(b.r, 0.012, 5, 14), 0, b.h, 0, Math.PI / 2, 0, 0);
  const colors = b.fill === 'plum' ? ['#6a3058', '#7a4468'] : ['#c4472e', '#e0a23a', '#d6c45e'];
  const rand = mulberry32((b.x * 10) | 0);
  for (let i = 0; i < 6; i++) {
    putSphere(buckets, colors[i % colors.length], 0.04, (rand() - 0.5) * b.r, b.h * 0.45 + rand() * 0.08, (rand() - 0.5) * b.r);
  }
  const g = new THREE.Group();
  g.position.set(b.x, b.y, b.z);
  g.name = 'basket';
  buckets.flush(g);
  parent.add(g);
}

function addBarrow(parent, b) {
  const buckets = new Buckets();
  putGeo(buckets, '#4a463e', new THREE.CylinderGeometry(0.016, 0.016, 0.2, 6), 0, 0.16, -0.4, 0, 0, Math.PI / 2);
  putGeo(buckets, '#5c5148', new THREE.CylinderGeometry(0.16, 0.16, 0.045, 14), 0, 0.16, -0.4, 0, 0, Math.PI / 2);
  putBox(buckets, '#8d6844', 0.5, 0.04, 0.36, 0.02, 0.34, 0.02);
  putBox(buckets, '#9a7048', 0.5, 0.14, 0.025, 0.02, 0.42, 0.19);
  putBox(buckets, '#8d6840', 0.5, 0.14, 0.025, 0.02, 0.42, -0.15);
  putBox(buckets, '#9a7048', 0.025, 0.14, 0.34, 0.26, 0.42, 0.02);
  putBox(buckets, '#8d6840', 0.025, 0.14, 0.34, -0.22, 0.42, 0.02);
  putBox(buckets, '#5c3e2a', 0.04, 0.28, 0.04, 0.16, 0.14, 0.12);
  putBox(buckets, '#5c3e2a', 0.04, 0.28, 0.04, 0.16, 0.14, -0.1);
  putBox(buckets, '#6b4a30', 0.035, 0.035, 0.82, 0.16, 0.46, 0.42);
  putBox(buckets, '#6b4a30', 0.035, 0.035, 0.82, -0.12, 0.46, 0.42);
  putSphere(buckets, '#c4472e', 0.042, 0.02, 0.4, 0.02);
  putSphere(buckets, '#e0a23a', 0.038, -0.08, 0.39, 0.06);
  const g = new THREE.Group();
  g.position.set(b.x, b.y, b.z);
  g.rotation.y = b.rot || 0;
  g.name = 'barrow';
  buckets.flush(g);
  parent.add(g);
}

function addGable(buckets, S, zFace, sign) {
  const y1 = S.y + S.wallH;
  const rise = S.rise;
  const rand = mulberry32(90 + Math.round(zFace * 8) + sign * 3);
  let y = y1;
  let course = 0;
  while (y < y1 + rise - 0.06 && course < 18) {
    const ch = 0.145;
    const midY = y + ch * 0.5;
    const t = (midY - y1) / rise;
    const half = (S.w / 2) * (1 - t) - 0.02;
    if (half < 0.08) break;
    let x = S.x - half;
    const end = S.x + half;
    let guard = 0;
    while (x < end - 0.04 && guard < 30) {
      guard += 1;
      const sw = Math.min(0.34 + rand() * 0.26, end - x);
      const cx = x + sw / 2;
      const vent = sign > 0 && midY > y1 + rise * 0.3 && midY < y1 + rise * 0.52 && Math.abs(cx - S.x) < 0.36;
      if (vent) putBox(buckets, '#2a2622', Math.min(sw, 0.7), ch * 0.42, 0.08, cx, midY, zFace + sign * 0.1);
      else putBox(buckets, HONEY[(course * 3 + Math.floor(x * 2)) % HONEY.length], sw * 0.96, ch * 0.92, 0.3, cx, midY, zFace);
      x += sw * 0.94;
    }
    y += ch * 0.96;
    course += 1;
  }
}

function addRoof(buckets, S) {
  const y1 = S.y + S.wallH;
  const rise = S.rise;
  const half = S.w / 2;
  const oh = 0.34;
  const oz = 0.18;
  const n = 12;
  const slopeLen = Math.hypot(half + oh, rise);
  const courseW = (slopeLen / n) * 1.16;
  for (const side of [-1, 1]) {
    const pitch = Math.atan2(rise, half + oh);
    const rz = -side * pitch;
    for (let i = 0; i < n; i++) {
      const t = (i + 0.45) / n;
      const x = S.x + side * t * (half + oh);
      const y = y1 + rise * (1 - t);
      putGeo(buckets, TILES[(i + (side > 0 ? 2 : 0)) % TILES.length], new THREE.BoxGeometry(courseW, 0.04, S.d + oz * 2), x, y, S.z, 0, 0, rz);
    }
    const mx = S.x + side * 0.5 * (half + oh);
    const my = y1 + rise * 0.5;
    putGeo(buckets, '#6b442c', new THREE.BoxGeometry(slopeLen, 0.045, 0.055), mx, my, S.z + S.d / 2 + oz * 0.7, 0, 0, rz);
    putGeo(buckets, '#6b442c', new THREE.BoxGeometry(slopeLen, 0.045, 0.055), mx, my, S.z - S.d / 2 - oz * 0.15, 0, 0, rz);
  }
  putBox(buckets, '#7a4030', 0.18, 0.08, S.d + oz * 2.1, S.x, y1 + rise + 0.03, S.z);
}

function addShed(parent, layout) {
  const S = layout.shed;
  const buckets = new Buckets();
  const x0 = S.x - S.w / 2;
  const x1 = S.x + S.w / 2;
  const z0 = S.z - S.d / 2;
  const z1 = S.z + S.d / 2;
  const y0 = S.y;
  const y1 = S.y + S.wallH;
  const doorW = 0.84;
  const doorH = 1.92;
  const doorZ = S.z + 0.16;
  const wallOpts = { palette: HONEY, thick: 0.32, noCoping: true, noRubble: true, regular: true };
  addWallSegment(buckets, [x0, z0], [x1, z0], y0, y1, 51, wallOpts);
  addWallSegment(buckets, [x0, z1], [x1, z1], y0, y1, 52, wallOpts);
  addWallSegment(buckets, [x0, z0], [x0, z1], y0, y1, 53, wallOpts);
  addWallSegment(buckets, [x1, z0], [x1, z1], y0, y1, 54, {
    ...wallOpts,
    skip(wx, wy, wz) {
      return wy < y0 + doorH && Math.abs(wz - doorZ) < doorW * 0.5;
    },
  });
  addGable(buckets, S, z0, -1);
  addGable(buckets, S, z1, 1);
  addRoof(buckets, S);
  putBox(buckets, '#3a322c', S.w - 0.75, 0.05, S.d - 0.75, S.x, y0 + 0.04, S.z);
  putBox(buckets, '#2c2622', 0.8, 0.32, 0.2, S.x, y1 + S.rise * 0.42, z1 - 0.28);
  putBox(buckets, '#6b4e36', 0.32, 0.04, 1.05, x0 + 0.5, y0 + 1.12, S.z - 0.05);
  putCyl(buckets, '#7a2430', 0.055, 0.045, x0 + 0.5, y0 + 1.14, S.z - 0.28, x0 + 0.5, y0 + 1.3, S.z - 0.28, 8);
  putCyl(buckets, '#c4a15a', 0.05, 0.04, x0 + 0.5, y0 + 1.14, S.z + 0.22, x0 + 0.5, y0 + 1.28, S.z + 0.22, 8);
  putSphere(buckets, '#c2b48a', 0.2, x0 + 0.55, y0 + 0.14, z0 + 0.48, 1.15, 0.65, 0.9);

  const g = new THREE.Group();
  g.name = 'shed';
  buckets.flush(g);

  const door = new THREE.Group();
  door.name = 'shed-door';
  door.userData.facing = S.door;
  door.position.set(x1 + 0.2, y0, doorZ - doorW / 2);
  door.rotation.y = -0.58;
  const doorBuckets = new Buckets();
  for (let i = 0; i < 5; i++) {
    const x = 0.07 + i * (doorW / 5);
    putBox(doorBuckets, i % 2 ? '#7a5434' : '#68462c', doorW / 5 - 0.012, doorH - 0.06, 0.034, x, (doorH - 0.06) / 2, 0.02);
  }
  putBox(doorBuckets, '#4a3424', doorW * 0.72, 0.055, 0.02, doorW * 0.48, doorH * 0.62, 0.045);
  putBox(doorBuckets, '#4a3424', doorW * 0.72, 0.055, 0.02, doorW * 0.48, doorH * 0.38, 0.045);
  putBox(doorBuckets, '#5c5e62', 0.07, 0.035, 0.025, doorW - 0.12, doorH * 0.48, 0.05);
  doorBuckets.flush(door);
  g.add(door);

  const rakeBuckets = new Buckets();
  putCyl(rakeBuckets, '#6b4a30', 0.016, 0.012, x1 + 0.34, y0 + 0.02, doorZ - 0.95, x1 + 0.16, y0 + 1.65, doorZ - 0.78, 5);
  putBox(rakeBuckets, '#5c4030', 0.38, 0.025, 0.06, x1 + 0.18, y0 + 1.58, doorZ - 0.78);
  for (let i = -2; i <= 2; i++) {
    putCyl(rakeBuckets, '#5c4030', 0.006, 0.006, x1 + 0.18 + i * 0.07, y0 + 1.58, doorZ - 0.78, x1 + 0.18 + i * 0.07, y0 + 1.38, doorZ - 0.88, 3);
  }
  const rake = new THREE.Group();
  rake.name = 'rake';
  rakeBuckets.flush(rake);
  g.add(rake);
  parent.add(g);
}

function addHerbs(parent, layout) {
  const buckets = new Buckets();
  layout.instances.filter((i) => i.kind === 'flowerpot').forEach((pot, idx) => {
    const rand = mulberry32(300 + idx * 17);
    const x = pot.position[0];
    const y = pot.position[1] + 0.24;
    const z = pot.position[2];
    for (let s = 0; s < 4; s++) {
      const ox = (rand() - 0.5) * 0.06;
      const oz = (rand() - 0.5) * 0.06;
      putCyl(buckets, '#3f5a30', 0.007, 0.005, x + ox, y, z + oz, x + ox, y + 0.18 + rand() * 0.06, z + oz, 4);
    }
    for (let i = 0; i < 9; i++) {
      const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(-0.8 + rand() * 0.6, rand() * 6, (rand() - 0.5) * 0.4));
      putSphere(
        buckets, i % 2 ? '#4e7a38' : '#6a8a40', 0.075,
        x + (rand() - 0.5) * 0.12, y + 0.1 + rand() * 0.12, z + (rand() - 0.5) * 0.12,
        1.5, 0.32, 0.75, q, { side: 'double' },
      );
    }
  });
  const g = new THREE.Group();
  g.name = 'herbs';
  buckets.flush(g);
  parent.add(g);
}

function addTufts(parent, layout) {
  const buckets = new Buckets();
  for (const path of layout.paths) {
    const pts = path.points;
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i];
      const b = pts[i + 1];
      const len = Math.hypot(b[0] - a[0], b[2] - a[2]);
      const n = Math.max(1, Math.floor(len / 1.35));
      for (let k = 0; k < n; k++) {
        const t = (k + 0.5) / n;
        const x = a[0] + (b[0] - a[0]) * t;
        const y = a[1] + (b[1] - a[1]) * t;
        const z = a[2] + (b[2] - a[2]) * t;
        let tx = b[0] - a[0];
        let tz = b[2] - a[2];
        const l = Math.hypot(tx, tz) || 1;
        tx /= l;
        tz /= l;
        const side = k % 2 === 0 ? 1 : -1;
        const off = path.width * 0.5 + 0.1;
        putCone(buckets, (i + k) % 2 ? '#6a7438' : '#8d8a46', 0.045 + (k % 3) * 0.012, 0.12 + (k % 4) * 0.045, x - tz * side * off, y, z + tx * side * off);
      }
    }
  }
  const flowers = [[-6.2, 0, 8.4], [-4.4, 0, 9.2], [8.6, 0, 6.2], [9.4, 0, 9.1], [-2.4, 0.7, 1.2], [3.4, 0.7, 1.55]];
  flowers.forEach((p, i) => {
    putSphere(buckets, i % 2 ? '#d4a24a' : '#c45c48', 0.035, p[0], p[1] + 0.1, p[2]);
    putCone(buckets, '#6d7a3c', 0.03, 0.12, p[0], p[1], p[2]);
  });
  const g = new THREE.Group();
  g.name = 'tufts';
  buckets.flush(g);
  parent.add(g);
}

function makeShell(layout) {
  const g = new THREE.Group();
  g.name = 'terrain';
  g.add(makeSky());
  const ground = new Buckets();
  putBox(ground, '#66733a', 48, 0.24, 40, 0, -0.14, -2, 0, { cast: false });
  for (const t of layout.terraces) addTerrace(ground, t);
  for (const t of layout.terraces) {
    if (t.id === 'low') continue;
    const drop = t.id === 'mid' ? 0.02 : t.id === 'high' ? 0.4 : 1.02;
    g.add(slopeMesh(t.x0 + 0.02, t.x0 - 3.2, t.z0 - 0.15, t.z1 + 0.25, t.y - 0.01, drop, '#70803e'));
    g.add(slopeMesh(t.x1 - 0.02, t.x1 + 3.2, t.z0 - 0.15, t.z1 + 0.25, t.y - 0.01, drop, '#6c7a3c'));
  }
  ground.flush(g);
  const stone = new Buckets();
  for (const w of layout.walls) addWallSegment(stone, w.a, w.b, w.base, w.top, w.seed);
  for (const s of layout.steps) addSteps(stone, s);
  for (const p of layout.piers) addPier(stone, p);
  const rocks = [[-8.4, 0.06, 6.4], [9.2, 0.05, 5.8], [-1.6, 0.05, 10.4], [10.2, 0.06, 9.6]];
  rocks.forEach((r, i) => {
    putBox(stone, STONE[i % STONE.length], 0.28 + (i % 3) * 0.08, 0.12, 0.2 + (i % 2) * 0.06, r[0], r[1], r[2], i * 0.4);
  });
  const walls = new THREE.Group();
  walls.name = 'walls';
  stone.flush(walls);
  g.add(walls);
  const paths = new THREE.Group();
  paths.name = 'paths';
  for (const path of layout.paths) {
    paths.add(ribbonMesh(path.points, path.width + 0.38, 0.018, '#8d6a42'));
    paths.add(ribbonMesh(path.points, path.width, 0.032, '#c4a06a'));
  }
  g.add(paths);
  g.add(hillMesh(layout.hill));
  g.add(hillSward(layout.hill));
  return g;
}

function makeProcedural(layout) {
  const g = new THREE.Group();
  g.name = 'procedural';
  const trees = new THREE.Group();
  trees.name = 'trees';
  for (const spec of layout.trees) trees.add(buildTree(spec));
  g.add(trees);
  addPergola(g, layout);
  addTable(g, layout);
  addBench(g, layout);
  addPress(g, layout);
  for (const c of layout.crates) addCrate(g, c);
  for (const b of layout.barrels) addBarrel(g, b);
  for (const b of layout.baskets) addBasket(g, b);
  addBarrow(g, layout.barrow);
  addShed(g, layout);
  addHerbs(g, layout);
  addTufts(g, layout);
  return g;
}

function frameStats(renderer, scene, camera) {
  renderer.render(scene, camera);
  const gl = renderer.getContext();
  const w = renderer.domElement.width;
  const h = renderer.domElement.height;
  const buf = new Uint8Array(w * h * 4);
  gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, buf);
  const step = 8;
  let n = 0;
  let rs = 0;
  let gs = 0;
  let bs = 0;
  let luma = 0;
  let luma2 = 0;
  let blown = 0;
  let black = 0;
  for (let y = 0; y < h; y += step) {
    for (let x = 0; x < w; x += step) {
      const i = (y * w + x) * 4;
      const R = buf[i];
      const G = buf[i + 1];
      const B = buf[i + 2];
      const L = 0.2126 * R + 0.7152 * G + 0.0722 * B;
      rs += R;
      gs += G;
      bs += B;
      luma += L;
      luma2 += L * L;
      n += 1;
      if (R > 248 && G > 248 && B > 248) blown += 1;
      if (L < 8) black += 1;
    }
  }
  const mean = luma / n;
  return {
    mean,
    std: Math.sqrt(Math.max(0, luma2 / n - mean * mean)),
    r: rs / n,
    g: gs / n,
    b: bs / n,
    blown: blown / n,
    black: black / n,
    n,
  };
}

boot({
  makeShell,
  makeProcedural,
  readyText: 'ready — orchard gathering terrace · drag orbit · U unlit · T toon',
  onReady(api) {
    const { scene, layout } = api;
    scene.updateMatrixWorld(true);
    const issues = [];
    let meshes = 0;
    scene.traverse((o) => {
      if (o.isMesh) meshes += 1;
      if (!Number.isFinite(o.position.x + o.position.y + o.position.z)) issues.push('nan ' + (o.name || o.type));
    });
    const trees = [];
    scene.traverse((o) => {
      if (o.userData.kind !== 'tree') return;
      const box = new THREE.Box3().setFromObject(o);
      const base = o.userData.baseY;
      if (box.min.y > base + 0.08) issues.push(o.name + ' floating ' + (box.min.y - base).toFixed(3));
      if (box.min.y < base - 0.12) issues.push(o.name + ' sunk ' + (box.min.y - base).toFixed(3));
      trees.push(o.name);
    });
    for (const inst of layout.instances) {
      if (inst.kind !== 'dining_chair' && inst.kind !== 'flowerpot') continue;
      const obj = scene.getObjectByName(inst.id);
      if (!obj) {
        issues.push('missing ' + inst.id);
        continue;
      }
      const box = new THREE.Box3().setFromObject(obj);
      if (Math.abs(box.min.y - inst.position[1]) > 0.07) {
        issues.push(inst.id + ' feet ' + box.min.y.toFixed(3) + ' expected ' + inst.position[1]);
      }
    }
    window.__audit = { issues, trees: trees.length, meshes };
    window.__frameStats = () => frameStats(api.renderer, api.scene, api.camera);
    if (issues.length) console.warn(issues.join('\n'));
  },
});
