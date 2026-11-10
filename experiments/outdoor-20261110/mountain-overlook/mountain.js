import * as THREE from 'three';
import { mergeGeometries } from './vendor/utils/BufferGeometryUtils.js';
import { boot, toonGradient } from './scene_lib.js';
import {
  BOULDERS,
  CLIFF_ROCKS,
  DECK,
  FIRE,
  LOGS,
  OUTCROP,
  PATH_KEYS,
  PINES,
  RANGES,
  SHELTER,
  apronSlabs,
  deckWidthAt,
  grassClumps,
  handrails,
  hash,
  heightAt,
  landingPads,
  mulberry32,
  pineRecipe,
  retainers,
  stepStones,
} from './site.js';

function mat(color, opts = {}) {
  return new THREE.MeshToonMaterial({
    color,
    gradientMap: toonGradient,
    vertexColors: !!opts.vertexColors,
    flatShading: !!opts.flat,
    polygonOffset: !!opts.polygonOffset,
    polygonOffsetFactor: opts.polygonOffsetFactor ?? -1.2,
    polygonOffsetUnits: opts.polygonOffsetUnits ?? -1.2,
    transparent: !!opts.transparent,
    opacity: opts.opacity ?? 1,
    depthWrite: opts.depthWrite !== false,
    side: opts.side || THREE.FrontSide,
    fog: opts.fog !== false,
  });
}

const WOOD = ['#c6a36a', '#b89258', '#d2ae74', '#a67c46', '#8d6840', '#cbb184'].map((c) => mat(c));
const STONE = ['#b4a798', '#8f877e', '#c4b6a6', '#6e6861', '#9c9186', '#7a726a'].map((c) => mat(c, { flat: true, polygonOffset: true }));
const BARK = ['#6b4b34', '#5a3e2c', '#7a5640'].map((c) => mat(c));
const LEAF = ['#314838', '#3e5642', '#24362c'].map((c) => mat(c));
const HEATHER = ['#6a7354', '#7d8660', '#596246'].map((c) => mat(c));
const BEAM = mat('#6b4c32');
const STEEL = mat('#5a514a');
const TURF = mat('#5d6a3e');
const SNAG = mat('#7a736c');
const ASH = mat('#4a453f', { flat: true });

function wood(i) {
  return WOOD[Math.abs(i) % WOOD.length];
}
function stone(i) {
  return STONE[Math.abs(i) % STONE.length];
}

function box(w, h, d, material, x, y, z) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function placeStone(parent, s, i) {
  const mesh = box(s.w, s.h, s.d, stone(i + Math.floor(s.x * 3)), s.x, s.y - s.h / 2, s.z);
  mesh.rotation.y = s.rot || 0;
  parent.add(mesh);
  return mesh;
}

function span(parent, ax, ay, az, bx, by, bz, sx, sy, material) {
  const dir = new THREE.Vector3(bx - ax, by - ay, bz - az);
  const len = dir.length();
  if (len < 1e-4) return null;
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, len), material);
  mesh.position.set((ax + bx) / 2, (ay + by) / 2, (az + bz) / 2);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), dir.normalize());
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function baked(mesh) {
  mesh.updateMatrix();
  const g = mesh.geometry.clone();
  g.applyMatrix4(mesh.matrix);
  return g;
}

function mergeParts(parts) {
  if (!parts.length) return null;
  if (parts.length === 1) return parts[0];
  const merged = mergeGeometries(parts);
  for (const g of parts) g.dispose();
  return merged;
}

function buildSky() {
  const geo = new THREE.SphereGeometry(230, 30, 18);
  const pos = geo.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  const c = new THREE.Color();
  const top = new THREE.Color('#7eafd6');
  const mid = new THREE.Color('#d7e6f4');
  const hor = new THREE.Color('#f3c5a0');
  const warm = new THREE.Color('#ffd3ab');
  const below = new THREE.Color('#c48a62');
  const sun = new THREE.Vector3(16, 9.2, 11).normalize();
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i).normalize();
    c.copy(hor);
    c.lerp(mid, THREE.MathUtils.smoothstep(v.y, 0.0, 0.28));
    c.lerp(top, THREE.MathUtils.smoothstep(v.y, 0.18, 0.78));
    if (v.y < 0) c.lerp(below, THREE.MathUtils.clamp(-v.y * 2.2, 0, 1));
    const d = Math.max(0, v.dot(sun));
    c.lerp(warm, d ** 12 * 0.75);
    colors[i * 3] = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const material = new THREE.MeshBasicMaterial({
    vertexColors: true,
    side: THREE.BackSide,
    fog: false,
    depthWrite: false,
  });
  const mesh = new THREE.Mesh(geo, material);
  mesh.userData.forceBasic = true;
  mesh.userData.noCast = true;
  mesh.userData.noReceive = true;
  mesh.renderOrder = -20;
  mesh.name = 'sky';
  return mesh;
}

function buildRanges() {
  const group = new THREE.Group();
  group.name = 'ranges';
  for (const spec of RANGES) {
    const n = 78;
    const positions = [];
    const colors = [];
    const index = [];
    const lit = new THREE.Color(spec.lit);
    const shade = new THREE.Color(spec.shade);
    const snow = new THREE.Color(spec.snow);
    const ridge = (x) => {
      let h = spec.base;
      for (const p of spec.peaks) {
        const d = (x - p.x) / p.w;
        h += p.h * Math.exp(-d * d);
      }
      h += Math.sin(x * spec.jag + spec.phase) * spec.jagAmp;
      h += Math.sin(x * spec.jag * 2.15 + 1.4) * spec.jagAmp * 0.4;
      return h;
    };
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      const x = spec.x0 + t * (spec.x1 - spec.x0);
      const h = ridge(x);
      const east = t;
      const face = shade.clone().lerp(lit, 0.28 + east * 0.72);
      const crest = face.clone();
      if (h > spec.snowLine) crest.lerp(snow, THREE.MathUtils.clamp((h - spec.snowLine) / 2.4, 0, 0.82));
      const foot = face.clone().multiplyScalar(0.78);
      const push = (px, py, pz, col) => {
        positions.push(px, py, pz);
        colors.push(col.r, col.g, col.b);
      };
      push(x, spec.footY, spec.z + spec.foot, foot);
      push(x, spec.footY + h, spec.z, crest);
      push(x, spec.footY + h * 0.9, spec.z - spec.depth, crest.clone().multiplyScalar(0.88));
    }
    for (let i = 0; i < n; i++) {
      const a = i * 3;
      index.push(a, a + 1, a + 3, a + 1, a + 4, a + 3);
      index.push(a + 1, a + 2, a + 4, a + 2, a + 5, a + 4);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geo.setIndex(index);
    geo.computeVertexNormals();
    const mesh = new THREE.Mesh(geo, mat('#ffffff', { vertexColors: true, side: THREE.DoubleSide }));
    mesh.userData.noCast = true;
    mesh.userData.noReceive = true;
    mesh.name = spec.name;
    group.add(mesh);
  }
  return group;
}

function buildTerrain() {
  const nx = 128;
  const nz = 168;
  const x0 = -16;
  const x1 = 15.2;
  const z0 = -11;
  const z1 = 18.4;
  const stride = nx + 1;
  const count = stride * (nz + 1);
  const pos = new Float32Array(count * 3);
  let p = 0;
  for (let j = 0; j <= nz; j++) {
    for (let i = 0; i <= nx; i++) {
      const x = x0 + (i / nx) * (x1 - x0);
      const z = z0 + (j / nz) * (z1 - z0);
      pos[p++] = x;
      pos[p++] = heightAt(x, z);
      pos[p++] = z;
    }
  }
  const col = new Float32Array(count * 3);
  const cellX = (x1 - x0) / nx;
  const cellZ = (z1 - z0) / nz;
  const color = new THREE.Color();
  const grasses = ['#7a864c', '#62743e', '#8c9856', '#55683a', '#97a362', '#6d7c46'];
  for (let j = 0; j <= nz; j++) {
    for (let i = 0; i <= nx; i++) {
      const k = j * stride + i;
      const x = pos[k * 3];
      const y = pos[k * 3 + 1];
      const z = pos[k * 3 + 2];
      const yl = pos[(j * stride + Math.max(0, i - 1)) * 3 + 1];
      const yr = pos[(j * stride + Math.min(nx, i + 1)) * 3 + 1];
      const yd = pos[(Math.max(0, j - 1) * stride + i) * 3 + 1];
      const yu = pos[(Math.min(nz, j + 1) * stride + i) * 3 + 1];
      const slope = Math.hypot((yr - yl) / cellX, (yu - yd) / cellZ);
      const n = hash(x * 1.7, z * 1.3);
      const cliffFace = z < 0.25 && slope > 0.65;
      if (slope > 1.2 || cliffFace) {
        color.set(n > 0.55 ? '#a3988e' : '#847b72');
        const band = 0.5 + 0.5 * Math.sin(y * 7.5 + x * 0.35);
        color.lerp(new THREE.Color('#6e675f'), band * 0.35);
      } else {
        color.set(grasses[Math.floor(n * grasses.length) % grasses.length]);
        if (n > 0.84) color.lerp(new THREE.Color('#c4b07a'), 0.28);
      }
      const avg = (yl + yr + yd + yu) / 4;
      const ao = THREE.MathUtils.clamp(1 + (y - avg) * 0.45, 0.78, 1.04);
      color.multiplyScalar(ao);
      col[k * 3] = color.r;
      col[k * 3 + 1] = color.g;
      col[k * 3 + 2] = color.b;
    }
  }
  const idx = [];
  for (let j = 0; j < nz; j++) {
    for (let i = 0; i < nx; i++) {
      const a = j * stride + i;
      // +Z before +X so the heightfield normal points up, not into the hill.
      idx.push(a, a + stride, a + 1, a + 1, a + stride, a + stride + 1);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  const mesh = new THREE.Mesh(geo, mat('#ffffff', { vertexColors: true }));
  mesh.name = 'terrain';

  const skirt = [];
  const skirtY = -8.2;
  const pushSkirt = (ia, ib) => {
    const ax = pos[ia * 3];
    const ay = pos[ia * 3 + 1];
    const az = pos[ia * 3 + 2];
    const bx = pos[ib * 3];
    const by = pos[ib * 3 + 1];
    const bz = pos[ib * 3 + 2];
    const base = skirt.length / 3;
    skirt.push(ax, ay, az, bx, by, bz, ax, skirtY, az, bx, skirtY, bz);
    return base;
  };
  const sIdx = [];
  const edge = (ia, ib) => {
    const base = pushSkirt(ia, ib);
    sIdx.push(base, base + 2, base + 1, base + 1, base + 2, base + 3);
  };
  for (let i = 0; i < nx; i++) edge(i, i + 1);
  for (let i = 0; i < nx; i++) edge(nz * stride + i + 1, nz * stride + i);
  for (let j = 0; j < nz; j++) edge((j + 1) * stride, j * stride);
  for (let j = 0; j < nz; j++) edge(j * stride + nx, (j + 1) * stride + nx);
  const sGeo = new THREE.BufferGeometry();
  sGeo.setAttribute('position', new THREE.Float32BufferAttribute(skirt, 3));
  sGeo.setIndex(sIdx);
  sGeo.computeVertexNormals();
  const sMesh = new THREE.Mesh(sGeo, mat('#4a453f', { flat: true, side: THREE.DoubleSide }));
  sMesh.name = 'skirt';
  const group = new THREE.Group();
  group.add(mesh);
  group.add(sMesh);
  return group;
}

function buildOutcrop() {
  const g = new THREE.Group();
  g.name = 'outcrop';
  const y = heightAt(OUTCROP.x, OUTCROP.z) - OUTCROP.sink;
  g.position.set(OUTCROP.x, y, OUTCROP.z);
  g.rotation.y = 0.42;
  const layers = [
    { y: 0.18, sx: 2.45, sy: 0.4, sz: 1.8, rx: 0.05, ry: 0.12, rz: -0.03 },
    { y: 0.55, sx: 2.1, sy: 0.32, sz: 1.48, rx: -0.04, ry: -0.28, rz: 0.04 },
    { y: 0.92, sx: 1.65, sy: 0.28, sz: 1.22, rx: 0.03, ry: 0.36, rz: -0.02 },
    { y: 1.24, sx: 1.2, sy: 0.24, sz: 0.92, rx: -0.05, ry: -0.12, rz: 0.05 },
    { y: 1.52, sx: 0.72, sy: 0.2, sz: 0.58, rx: 0.06, ry: 0.5, rz: -0.04 },
  ];
  layers.forEach((L, i) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(L.sx, L.sy, L.sz), stone(i));
    mesh.position.y = L.y;
    mesh.rotation.set(L.rx, L.ry, L.rz);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    g.add(mesh);
    const nose = new THREE.Mesh(new THREE.DodecahedronGeometry(0.28 + (i % 3) * 0.06, 0), stone(i + 2));
    nose.scale.set(1.4, 0.55, 0.9);
    nose.position.set(L.sx * 0.28, L.y + 0.05, L.sz * 0.2);
    nose.rotation.set(0.2, i, 0.1);
    nose.castShadow = true;
    nose.receiveShadow = true;
    g.add(nose);
  });
  const lichenMat = mat('#7d8a62', { flat: true });
  for (let i = 0; i < 6; i++) {
    const blob = new THREE.Mesh(new THREE.IcosahedronGeometry(0.16, 0), lichenMat);
    blob.scale.set(1.3, 0.28, 0.9);
    blob.position.set(-0.4 + (i % 3) * 0.35, 0.7 + (i % 4) * 0.22, -0.2 + (i % 2) * 0.3);
    blob.userData.noCast = true;
    g.add(blob);
  }
  let cy = 1.72;
  for (let i = 0; i < 4; i++) {
    const s = 0.22 - i * 0.035;
    const cairn = new THREE.Mesh(new THREE.DodecahedronGeometry(s, 0), stone(i + 1));
    cairn.scale.set(1.15, 0.7, 0.95);
    cairn.position.set(0.08 * (i % 2 === 0 ? 1 : -1), cy, 0.05);
    cairn.rotation.y = i * 0.6;
    cairn.castShadow = true;
    cairn.receiveShadow = true;
    g.add(cairn);
    cy += s * 1.15;
  }
  return g;
}

function buildRocks(parent) {
  for (const r of CLIFF_ROCKS) {
    const y = heightAt(r.x, r.z);
    const mesh = new THREE.Mesh(new THREE.DodecahedronGeometry(0.55, 0), stone(r.seed));
    mesh.scale.set(r.s * 1.15, r.s * 0.72, r.s * 0.9);
    mesh.position.set(r.x, y - r.s * 0.12, r.z + 0.18);
    mesh.rotation.set(r.seed * 0.4, r.seed, r.seed * 0.2);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
  }
  for (const b of BOULDERS) {
    const y = heightAt(b.x, b.z);
    const mesh = new THREE.Mesh(new THREE.DodecahedronGeometry(0.5, 0), stone(Math.round(b.x * 2)));
    mesh.scale.set(b.sx, b.sy, b.sz);
    mesh.position.set(b.x, y - b.sy * 0.2, b.z);
    mesh.rotation.y = b.rot;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
  }
  for (const log of LOGS) {
    const y = heightAt(log.x, log.z);
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(log.r * 0.82, log.r, log.len, 7), BARK[0]);
    mesh.quaternion.setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      new THREE.Vector3(Math.sin(log.rot), 0.05, Math.cos(log.rot)).normalize(),
    );
    mesh.position.set(log.x, y + log.r * 0.35, log.z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
  }
}

function buildPath() {
  const g = new THREE.Group();
  g.name = 'path';
  stepStones().forEach((s, i) => placeStone(g, s, i));
  landingPads().forEach((s, i) => placeStone(g, s, i + 3));
  apronSlabs().forEach((s, i) => placeStone(g, s, i + 1));
  retainers().forEach((s, i) => placeStone(g, s, i + 5));
  const posts = handrails();
  for (let i = 0; i < posts.length; i++) {
    const p = posts[i];
    g.add(box(0.06, 0.82, 0.06, STEEL, p.x, p.y + 0.41, p.z));
    if (i < posts.length - 1) {
      const q = posts[i + 1];
      if (Math.hypot(p.x - q.x, p.z - q.z) < 2.2) {
        span(g, p.x, p.y + 0.78, p.z, q.x, q.y + 0.78, q.z, 0.035, 0.035, STEEL);
      }
    }
  }
  const a = PATH_KEYS[0];
  const b = PATH_KEYS[1];
  const dx = b.x - a.x;
  const dz = b.z - a.z;
  const len = Math.hypot(dx, dz) || 1;
  const side = a.width * 0.5 + 0.42;
  const px = a.x + (-dz / len) * side;
  const pz = a.z + (dx / len) * side;
  const py = heightAt(px, pz);
  g.add(box(0.09, 1.32, 0.09, wood(4), px, py + 0.66, pz));
  const arrow = box(0.34, 0.08, 0.05, wood(1), px, py + 1.18, pz);
  arrow.rotation.y = Math.atan2(dx, dz);
  g.add(arrow);
  return g;
}

function buildDeck() {
  const g = new THREE.Group();
  g.name = 'deck';
  const plankT = 0.05;
  let z = DECK.zRoot - 0.06;
  let i = 0;
  while (z > DECK.zTip + 0.1) {
    const w = deckWidthAt(z) - 0.08;
    const mesh = box(w, plankT, 0.125, wood(i + Math.floor(hash(i, z) * 3)), DECK.cx, DECK.y - plankT / 2, z);
    g.add(mesh);
    z -= 0.149;
    i += 1;
  }

  const zTipB = DECK.zTip + 0.18;
  const zRootB = 1.72;
  const beamY = DECK.y - plankT - 0.2;
  for (const side of [-1, 0, 1]) {
    const insetTip = side === 0 ? 0 : deckWidthAt(zTipB) / 2 - 0.28;
    const insetRoot = side === 0 ? 0 : deckWidthAt(DECK.zRoot) / 2 - 0.2;
    const xTip = DECK.cx + side * insetTip;
    const xRoot = DECK.cx + side * insetRoot;
    span(g, xTip, beamY, zTipB, xRoot, beamY, zRootB, 0.16, 0.4, BEAM);
    if (side !== 0) {
      const xFace = DECK.cx + side * (deckWidthAt(0.3) / 2 - 0.26);
      span(g, xFace, 5.72, 0.28, DECK.cx + side * (deckWidthAt(-3.1) / 2 - 0.3), beamY - 0.05, -3.1, 0.04, 0.035, STEEL);
    }
  }

  for (let jz = DECK.zRoot - 0.3; jz > DECK.zTip + 0.4; jz -= 0.9) {
    const half = deckWidthAt(jz) / 2 - 0.32;
    span(g, DECK.cx - half, DECK.y - plankT - 0.08, jz, DECK.cx + half, DECK.y - plankT - 0.08, jz, 0.07, 0.14, wood(2));
  }

  // Stone courses sit on the overlook, in front of the deck root, not inside the cliff.
  const courses = [
    { y: 5.72, h: 0.34, w: 3.15, d: 0.55, z: 1.55 },
    { y: 6.02, h: 0.22, w: 2.7, d: 0.42, z: 1.22 },
  ];
  courses.forEach((c, idx) => {
    const mesh = box(c.w, c.h, c.d, stone(idx + 2), DECK.cx, c.y, c.z);
    mesh.position.y = heightAt(DECK.cx, c.z) - c.h * 0.5 + 0.06;
    g.add(mesh);
  });

  const zs = [];
  for (let pz = DECK.zRoot; pz > DECK.zTip + 0.25; pz -= 1.12) zs.push(pz);
  zs.push(DECK.zTip + 0.07);
  for (const side of [-1, 1]) {
    const pts = zs.map((pz) => {
      const x = DECK.cx + side * (deckWidthAt(pz) / 2 - 0.05);
      return { x, z: pz };
    });
    for (const p of pts) {
      g.add(box(0.075, DECK.railH, 0.075, wood(3), p.x, DECK.y + DECK.railH / 2, p.z));
    }
    for (let k = 0; k < pts.length - 1; k++) {
      const a = pts[k];
      const b = pts[k + 1];
      const yTop = DECK.y + DECK.railH - 0.03;
      span(g, a.x, yTop, a.z, b.x, yTop, b.z, 0.045, 0.04, wood(1));
      span(g, a.x, DECK.y + 0.46, a.z, b.x, DECK.y + 0.46, b.z, 0.035, 0.03, wood(5));
    }
  }

  const zGlass = DECK.zTip + 0.1;
  const gW = deckWidthAt(zGlass) - 0.18;
  const glassMat = new THREE.MeshBasicMaterial({
    color: '#d7e6f0',
    transparent: true,
    opacity: 0.14,
    depthWrite: false,
    side: THREE.DoubleSide,
    fog: false,
  });
  const glass = new THREE.Mesh(new THREE.BoxGeometry(gW, 0.78, 0.02), glassMat);
  glass.position.set(DECK.cx, DECK.y + 0.46, zGlass);
  glass.userData.forceBasic = true;
  glass.userData.noCast = true;
  glass.userData.noReceive = true;
  glass.renderOrder = 2;
  g.add(glass);
  g.add(box(gW + 0.08, 0.06, 0.07, wood(2), DECK.cx, DECK.y + 0.9, zGlass));
  g.add(box(gW + 0.04, 0.05, 0.06, wood(4), DECK.cx, DECK.y + 0.06, zGlass));

  const rim = [
    { x: -1.72, z: 0.3, w: 0.78, h: 0.36, d: 0.42, rot: 0.08 },
    { x: -2.32, z: 0.52, w: 0.52, h: 0.28, d: 0.36, rot: -0.2 },
    { x: 2.05, z: 0.28, w: 0.74, h: 0.34, d: 0.4, rot: 0.12 },
    { x: 2.58, z: 0.55, w: 0.48, h: 0.26, d: 0.34, rot: 0.3 },
  ];
  for (const r of rim) {
    const mesh = box(r.w, r.h, r.d, stone(Math.round(r.x + 4)), r.x, DECK.y - 0.02 - r.h / 2 + r.h * 0.15, r.z);
    mesh.position.y = heightAt(r.x, r.z) + r.h * 0.35;
    mesh.rotation.y = r.rot;
    g.add(mesh);
  }
  return g;
}

function buildShelter() {
  const g = new THREE.Group();
  g.name = 'shelter';
  g.position.set(SHELTER.x, SHELTER.padY, SHELTER.z);
  g.rotation.y = SHELTER.rotationY;
  const halfW = SHELTER.halfW;
  const halfD = SHELTER.halfD;
  const frontH = 2.25;
  const backH = 1.55;
  const roofAt = (z) => {
    const t = (z - (-halfD)) / (halfD * 2);
    return frontH + (backH - frontH) * THREE.MathUtils.clamp(t, 0, 1);
  };

  for (const side of [-1, 1]) {
    const n = 15;
    for (let i = 0; i < n; i++) {
      const t = (i + 0.5) / n;
      const z = -halfD + 0.08 + t * (halfD * 2 - 0.16);
      const h = roofAt(z) - 0.04;
      const plank = box(0.045, h, 0.11, wood(i + (side > 0 ? 2 : 0)), side * (halfW - 0.03), h / 2, z);
      g.add(plank);
    }
    g.add(box(0.1, roofAt(-halfD + 0.02), 0.1, wood(4), side * (halfW - 0.02), roofAt(-halfD + 0.02) / 2, -halfD + 0.04));
    g.add(box(0.1, roofAt(halfD - 0.02), 0.1, wood(4), side * (halfW - 0.02), roofAt(halfD - 0.02) / 2, halfD - 0.04));
  }
  const backN = 16;
  for (let i = 0; i < backN; i++) {
    const t = (i + 0.5) / backN;
    const x = -halfW + 0.12 + t * (halfW * 2 - 0.24);
    const h = backH * (0.94 + (i % 3) * 0.015);
    g.add(box(0.11, h, 0.045, wood(i + 1), x, h / 2, halfD - 0.04));
  }

  const ang = Math.atan2(frontH - backH, halfD * 2);
  const roofLen = halfD * 2 + 0.48;
  const roofW = halfW * 2 + 0.42;
  const roof = new THREE.Mesh(new THREE.BoxGeometry(roofW, 0.055, roofLen), wood(5));
  roof.rotation.x = ang;
  roof.position.set(0, (frontH + backH) / 2 + 0.02, -0.06);
  roof.castShadow = true;
  roof.receiveShadow = true;
  const turf = new THREE.Mesh(new THREE.BoxGeometry(roofW - 0.18, 0.09, roofLen - 0.22), TURF);
  turf.position.y = 0.07;
  turf.castShadow = true;
  turf.receiveShadow = true;
  roof.add(turf);
  const blade = new THREE.BoxGeometry(0.03, 0.22, 0.01);
  blade.translate(0, 0.11, 0);
  for (let i = 0; i < 18; i++) {
    const tuft = new THREE.Mesh(blade, HEATHER[i % 3]);
    tuft.position.set((hash(i, 2) - 0.5) * (roofW - 0.4), 0.16, (hash(i, 5) - 0.5) * (roofLen - 0.4));
    tuft.rotation.x = (hash(i, 1) - 0.4) * 0.5;
    tuft.rotation.z = (hash(i, 3) - 0.5) * 0.4;
    tuft.userData.noCast = true;
    turf.add(tuft);
  }
  g.add(roof);

  g.add(box(halfW * 2 - 0.12, 0.06, halfD * 2 - 0.16, wood(2), 0, 0.04, 0.02));
  g.add(box(2.15, 0.1, 0.42, wood(0), 0, 0.42, halfD - 0.46));
  g.add(box(2.15, 0.32, 0.1, wood(3), 0, 0.2, halfD - 0.28));
  g.add(box(halfW * 2 + 0.05, 0.08, 0.1, wood(1), 0, frontH - 0.02, -halfD + 0.02));

  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      g.add(box(0.32, 0.28, 0.32, stone(sx + sz + 3), sx * (halfW - 0.05), -0.12, sz * (halfD - 0.08)));
    }
  }
  return g;
}

function buildFire() {
  const g = new THREE.Group();
  g.name = 'fire-ring';
  const y = heightAt(FIRE.x, FIRE.z);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + 0.2;
    const mesh = new THREE.Mesh(new THREE.DodecahedronGeometry(0.13 + (i % 3) * 0.02, 0), stone(i));
    mesh.scale.set(1.2, 0.7, 0.95);
    mesh.position.set(FIRE.x + Math.cos(a) * FIRE.radius, y + 0.05, FIRE.z + Math.sin(a) * FIRE.radius);
    mesh.rotation.y = a;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    g.add(mesh);
  }
  for (let i = 0; i < 3; i++) {
    const log = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.055, 0.48, 6), ASH);
    log.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(Math.cos(i), 0.15, Math.sin(i * 1.7)).normalize());
    log.position.set(FIRE.x + (i - 1) * 0.08, y + 0.08, FIRE.z);
    log.castShadow = true;
    log.receiveShadow = true;
    g.add(log);
  }
  return g;
}

function buildPines(parent) {
  const ico = new THREE.IcosahedronGeometry(1, 0);
  for (const spec of PINES) {
    const recipe = pineRecipe(spec);
    const y0 = heightAt(spec.x, spec.z);
    const group = new THREE.Group();
    group.name = `pine-${spec.seed}`;
    group.position.set(spec.x, y0 - 0.05, spec.z);
    const trunkParts = [];
    const leafParts = [[], [], []];
    for (const seg of recipe.segs) {
      const axis = new THREE.Vector3(seg.nx - seg.x, seg.y1 - seg.y, seg.nz - seg.z);
      const len = Math.max(0.05, axis.length());
      const dir = axis.multiplyScalar(1 / len);
      const geo = new THREE.CylinderGeometry(seg.r1, seg.r0, len, 6);
      const mesh = new THREE.Mesh(geo);
      mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
      mesh.position.set((seg.x + seg.nx) / 2, (seg.y + seg.y1) / 2, (seg.z + seg.nz) / 2);
      trunkParts.push(baked(mesh));
      geo.dispose();
    }
    for (const br of recipe.branches) {
      const dir = new THREE.Vector3(Math.cos(br.ang), br.up, Math.sin(br.ang)).normalize();
      const geo = new THREE.CylinderGeometry(0.015, 0.036, br.len, 5);
      const mesh = new THREE.Mesh(geo);
      mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
      mesh.position.set(dir.x * br.len / 2, br.y + dir.y * br.len / 2, dir.z * br.len / 2);
      trunkParts.push(baked(mesh));
      geo.dispose();
      for (const tf of br.tufts) {
        const tuft = new THREE.Mesh(ico);
        tuft.scale.set(tf.s * tf.sx, tf.s * tf.sy, tf.s * tf.sz);
        tuft.position.set(dir.x * br.len * tf.t, br.y + dir.y * br.len * tf.t, dir.z * br.len * tf.t);
        tuft.rotation.set(tf.rot[0], tf.rot[1], tf.rot[2]);
        leafParts[tf.color % 3].push(baked(tuft));
      }
    }
    const trunkGeo = mergeParts(trunkParts);
    if (trunkGeo) {
      const trunk = new THREE.Mesh(trunkGeo, spec.kind === 'snag' ? SNAG : BARK[spec.seed % BARK.length]);
      trunk.castShadow = true;
      trunk.receiveShadow = true;
      group.add(trunk);
    }
    leafParts.forEach((parts, idx) => {
      const geo = mergeParts(parts);
      if (!geo) return;
      const leaves = new THREE.Mesh(geo, LEAF[idx]);
      leaves.castShadow = true;
      leaves.receiveShadow = true;
      group.add(leaves);
    });
    parent.add(group);
  }
}

function buildFoliage() {
  const g = new THREE.Group();
  g.name = 'foliage';
  buildPines(g);

  const clumps = grassClumps();
  const blade = new THREE.BoxGeometry(0.035, 1, 0.012);
  blade.translate(0, 0.5, 0);
  const buckets = [[], [], [], [], []];
  const grassMats = ['#7d8a4a', '#62743c', '#c4b07a', '#55683a', '#93a05a'].map((c) => mat(c));
  const flowers = [];
  for (const cl of clumps) {
    if (cl.type === 'heather') {
      const hg = new THREE.Group();
      const y = heightAt(cl.x, cl.z);
      hg.position.set(cl.x, y, cl.z);
      const rng = mulberry32(cl.seed);
      const ico = new THREE.IcosahedronGeometry(0.28, 0);
      for (let i = 0; i < 4; i++) {
        const mesh = new THREE.Mesh(ico, HEATHER[i % 3]);
        const sx = (0.7 + rng() * 0.8) * cl.s;
        const sy = (0.22 + rng() * 0.16) * cl.s;
        const sz = (0.6 + rng() * 0.7) * cl.s;
        mesh.scale.set(sx, sy, sz);
        mesh.position.set((rng() - 0.5) * 0.45 * cl.s, sy * 0.35, (rng() - 0.5) * 0.4 * cl.s);
        mesh.rotation.y = rng() * 6;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        hg.add(mesh);
      }
      g.add(hg);
      continue;
    }
    const rng = mulberry32(cl.seed);
    const y = heightAt(cl.x, cl.z);
    const n = 8 + Math.floor(rng() * 5);
    for (let i = 0; i < n; i++) {
      const ang = rng() * Math.PI * 2;
      const rad = rng() * 0.26 * cl.s;
      buckets[Math.floor(rng() * buckets.length)].push({
        x: cl.x + Math.cos(ang) * rad,
        y,
        z: cl.z + Math.sin(ang) * rad,
        h: (0.2 + rng() * 0.48) * cl.s,
        rot: ang,
        tilt: 0.12 + rng() * 0.5,
        s: 0.75 + rng() * 0.55,
      });
    }
    if (cl.seed % 9 === 0) {
      flowers.push({ x: cl.x, y: y + 0.28 * cl.s, z: cl.z, s: cl.s, seed: cl.seed });
    }
  }
  const dummy = new THREE.Object3D();
  buckets.forEach((items, idx) => {
    if (!items.length) return;
    const mesh = new THREE.InstancedMesh(blade, grassMats[idx], items.length);
    items.forEach((it, i) => {
      dummy.position.set(it.x, it.y, it.z);
      dummy.rotation.set(it.tilt, it.rot, 0);
      dummy.scale.set(it.s, it.h, it.s);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
    mesh.userData.noCast = true;
    g.add(mesh);
  });
  const flowerMat = [mat('#c6a36e'), mat('#a86862')];
  for (const f of flowers) {
    for (let i = 0; i < 3; i++) {
      const mesh = new THREE.Mesh(new THREE.SphereGeometry(0.035, 6, 5), flowerMat[(f.seed + i) % 2]);
      const ang = i * 2.1 + f.seed;
      mesh.position.set(f.x + Math.cos(ang) * 0.08, f.y, f.z + Math.sin(ang) * 0.08);
      mesh.userData.noCast = true;
      g.add(mesh);
    }
  }
  return g;
}

function buildShell() {
  const g = new THREE.Group();
  g.name = 'overlook';
  g.add(buildSky());
  g.add(buildRanges());
  g.add(buildTerrain());
  g.add(buildOutcrop());
  buildRocks(g);
  g.add(buildPath());
  g.add(buildDeck());
  g.add(buildShelter());
  g.add(buildFire());
  return g;
}

boot({
  makeShell: buildShell,
  makeProcedural: buildFoliage,
  readyText: 'ready — mountain overlook · drag orbit · U unlit · T toon',
}).catch((err) => {
  console.error(err);
  const el = document.getElementById('status');
  if (el) el.textContent = `error — ${err && err.message ? err.message : err}`;
  window.__error = String(err && err.stack ? err.stack : err);
});
