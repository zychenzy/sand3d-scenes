import * as THREE from 'three';
import { mergeGeometries } from './vendor/utils/BufferGeometryUtils.js';
import { boot, toon, basic, addBox, addCyl, rod } from './scene_lib.js';
import {
  layout, terrainHeight, shoreZ, waterLevel, padWeight, pathDistance, fire,
} from './site.mjs';

const UP = new THREE.Vector3(0, 1, 0);

function mulberry32(a) {
  return function rand() {
    a |= 0;
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function quatFromUp(dir) {
  return new THREE.Quaternion().setFromUnitVectors(UP, dir.clone().normalize());
}

function bake(geo, position, quaternion, scale = null) {
  const s = scale || new THREE.Vector3(1, 1, 1);
  geo.applyMatrix4(new THREE.Matrix4().compose(position, quaternion, s));
  return geo;
}

function mergedMesh(geos, mat) {
  if (!geos.length) return null;
  const geo = mergeGeometries(geos, false);
  geo.computeVertexNormals();
  const mesh = new THREE.Mesh(geo, mat);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function smoothstep(t) {
  const x = Math.min(1, Math.max(0, t));
  return x * x * (3 - 2 * x);
}

const COL = {
  grass: new THREE.Color('#3e4f3d'),
  grassDark: new THREE.Color('#2a3a30'),
  moss: new THREE.Color('#4a5a44'),
  duff: new THREE.Color('#5c4e3c'),
  path: new THREE.Color('#4a3c2e'),
  sand: new THREE.Color('#8d7458'),
  wet: new THREE.Color('#5c6e72'),
  gravel: new THREE.Color('#5e5850'),
  ash: new THREE.Color('#2b2825'),
  rock: new THREE.Color('#6d6862'),
};

function terrainColor(x, z) {
  const inland = shoreZ(x) - z;
  const n = Math.sin(x * 2.15 + z * 1.25) * 0.5 + Math.sin(x * 0.65 - z * 2.05) * 0.5;
  const col = new THREE.Color();
  if (inland < 0.12) col.copy(COL.wet);
  else if (inland < 0.7) col.copy(COL.sand);
  else if (inland < 1.45) col.copy(COL.sand).lerp(COL.grass, (inland - 0.7) / 0.75);
  else {
    col.copy(n > 0.2 ? COL.moss : COL.grass);
    if (n < -0.25) col.lerp(COL.grassDark, 0.5);
    col.lerp(COL.duff, padWeight(x, z) * 0.8);
  }
  const fireD = Math.hypot(x - fire.x, z - fire.z);
  if (fireD < 0.4) col.copy(COL.ash);
  else if (fireD < 1.25) col.lerp(COL.gravel, smoothstep(1 - (fireD - 0.4) / 0.85));
  const pd = pathDistance(x, z);
  if (pd < 0.7 && fireD > 1.15 && inland > 0.45) col.lerp(COL.path, smoothstep(1 - pd / 0.7) * 0.9);
  if (Math.hypot(x + 7.6, z + 0.15) < 2.1 && inland > 0.3) col.lerp(COL.rock, 0.5);
  if (Math.hypot(x - 8.1, z - 3.05) < 1.6) col.lerp(COL.rock, 0.35);
  return col;
}

function buildTerrain() {
  const geo = new THREE.PlaneGeometry(42, 38, 160, 140);
  geo.rotateX(-Math.PI / 2);
  geo.translate(0, 0, 1.5);
  const pos = geo.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  const c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    pos.setY(i, terrainHeight(x, z));
    c.copy(terrainColor(x, z));
    colors[i * 3] = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.computeVertexNormals();
  const mesh = new THREE.Mesh(geo, toon('#ffffff', { vertexColors: true }));
  mesh.name = 'terrain';
  mesh.userData.castShadow = false;
  mesh.receiveShadow = true;
  return mesh;
}

function buildWater() {
  const nx = 90;
  const nz = 42;
  const positions = [];
  const colors = [];
  const deep = new THREE.Color('#102433');
  const shallow = new THREE.Color('#6a9098');
  const sheen = new THREE.Color('#9eb0bc');
  const foam = new THREE.Color('#c5cdc4');
  const col = new THREE.Color();
  for (let iz = 0; iz <= nz; iz++) {
    for (let ix = 0; ix <= nx; ix++) {
      const x = -18 + (36 * ix) / nx;
      const shore = shoreZ(x);
      const z0 = shore - 0.45;
      const z1 = 17.5;
      const z = z0 + (z1 - z0) * (iz / nz);
      const depthT = iz / nz;
      const wave = (Math.sin(x * 1.15 + z * 0.42) * 0.03 + Math.sin(x * 0.33 - z * 1.05) * 0.022) * (0.35 + depthT);
      const y = waterLevel + wave;
      positions.push(x, y, z);
      col.copy(shallow).lerp(deep, Math.min(1, depthT * 1.15));
      const streak = x * 0.22 - z * 0.08;
      const band = Math.exp(-(streak * streak) / 6) * depthT;
      col.lerp(sheen, band * 0.28);
      if (iz < 3) col.lerp(foam, 0.62 * (1 - iz / 3));
      colors.push(col.r, col.g, col.b);
    }
  }
  const indices = [];
  const stride = nx + 1;
  for (let iz = 0; iz < nz; iz++) {
    for (let ix = 0; ix < nx; ix++) {
      const a = iz * stride + ix;
      const b = a + 1;
      const c = a + stride;
      const d = c + 1;
      indices.push(a, c, b, b, c, d);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  const mesh = new THREE.Mesh(geo, toon('#ffffff', { vertexColors: true, side: THREE.DoubleSide }));
  mesh.name = 'water';
  mesh.userData.castShadow = false;
  mesh.userData.receiveShadow = false;
  return mesh;
}

function buildSky() {
  const geo = new THREE.SphereGeometry(90, 28, 16);
  const pos = geo.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  const zenith = new THREE.Color('#10182e');
  const horizon = new THREE.Color('#314868');
  const warm = new THREE.Color('#6a514c');
  const below = new THREE.Color('#243656');
  const col = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i) / 90;
    const x = pos.getX(i) / 90;
    const t = Math.min(1, Math.max(0, (y + 0.05) / 0.9));
    if (y < 0) col.copy(below);
    else col.copy(horizon).lerp(zenith, Math.pow(t, 0.8));
    const west = Math.max(0, -x * 0.8 + 0.15);
    const horizonBand = (y - 0.04) / 0.11;
    const band = Math.exp(-(horizonBand * horizonBand)) * west;
    col.lerp(warm, Math.min(0.42, band * 0.5));
    colors[i * 3] = col.r;
    colors[i * 3 + 1] = col.g;
    colors[i * 3 + 2] = col.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const mat = basic('#ffffff', { vertexColors: true, side: THREE.BackSide, fog: false, depthWrite: false });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.name = 'sky';
  mesh.userData.shade = 'fixed';
  mesh.frustumCulled = false;
  const moon = new THREE.Mesh(new THREE.SphereGeometry(1.15, 16, 12), basic('#d5dbe6', { fog: false }));
  moon.position.set(-22, 38, -26);
  moon.userData.shade = 'fixed';
  mesh.add(moon);
  return mesh;
}

function rockMesh(rng, radius, color) {
  const geo = new THREE.DodecahedronGeometry(radius, 0);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    pos.setXYZ(
      i,
      pos.getX(i) * (0.72 + rng() * 0.55),
      pos.getY(i) * (0.5 + rng() * 0.45),
      pos.getZ(i) * (0.72 + rng() * 0.55),
    );
  }
  geo.computeVertexNormals();
  const mesh = new THREE.Mesh(geo, toon(color));
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

const ROCK_COLORS = ['#6a6560', '#5b5854', '#756e66', '#4e5558', '#7a736a'];

function scatterRocks(parent) {
  const rng = mulberry32(20261110);
  const g = new THREE.Group();
  g.name = 'rocks';
  for (let x = -12.5; x <= 12.5; x += 0.78) {
    if (rng() < 0.18) continue;
    const jitter = (rng() - 0.5) * 0.55;
    const z = shoreZ(x) + jitter;
    if (Math.abs(x - layout.dock.x) < 0.85 && Math.abs(z - layout.dock.z) < 1.1) continue;
    const radius = 0.07 + rng() * (rng() < 0.12 ? 0.28 : 0.12);
    const mesh = rockMesh(rng, radius, ROCK_COLORS[(rng() * ROCK_COLORS.length) | 0]);
    const y = terrainHeight(x, z);
    mesh.position.set(x + (rng() - 0.5) * 0.2, y - radius * 0.35, z);
    mesh.rotation.set(rng() * 3, rng() * 6, rng() * 3);
    g.add(mesh);
    if (rng() < 0.28) {
      const r2 = radius * (0.45 + rng() * 0.4);
      const m2 = rockMesh(rng, r2, ROCK_COLORS[(rng() * ROCK_COLORS.length) | 0]);
      m2.position.set(x + 0.18, y - r2 * 0.3, z + 0.12);
      m2.rotation.set(rng() * 2, rng() * 4, rng());
      g.add(m2);
    }
  }
  // A few stones breaking the surface just offshore.
  for (let i = 0; i < 7; i++) {
    const x = -8 + rng() * 16;
    if (Math.abs(x - layout.dock.x) < 1.2) continue;
    const z = shoreZ(x) + 0.35 + rng() * 0.7;
    const radius = 0.1 + rng() * 0.16;
    const mesh = rockMesh(rng, radius, '#3e484e');
    mesh.position.set(x, waterLevel - radius * 0.15, z);
    mesh.rotation.set(rng(), rng(), rng());
    g.add(mesh);
  }
  const boulders = [[-7.4, -0.2, 0.42], [-8.3, 0.55, 0.28], [8.4, 2.7, 0.36], [7.5, 3.4, 0.22]];
  for (const [x, z, radius] of boulders) {
    const mesh = rockMesh(rng, radius, ROCK_COLORS[(rng() * ROCK_COLORS.length) | 0]);
    mesh.position.set(x, terrainHeight(x, z) - radius * 0.25, z);
    mesh.rotation.set(rng(), rng() * 2, rng());
    g.add(mesh);
  }
  parent.add(g);
}

function addReeds(parent) {
  const rng = mulberry32(77);
  const spots = [[-5.2, 0], [5.6, 0.15], [7.1, 0.2], [-8.4, 0.4]];
  const mat = toon('#5a6844');
  for (const [sx, bias] of spots) {
    const geos = [];
    const cx = sx;
    const cz = shoreZ(sx) + bias;
    for (let i = 0; i < 9; i++) {
      const h = 0.32 + rng() * 0.62;
      const px = cx + (rng() - 0.5) * 0.4;
      const pz = cz + (rng() - 0.5) * 0.3;
      const y = terrainHeight(px, pz);
      const geo = new THREE.BoxGeometry(0.012, h, rng() < 0.5 ? 0.045 : 0.02);
      const q = new THREE.Quaternion().setFromEuler(new THREE.Euler((rng() - 0.5) * 0.5, rng() * 6, (rng() - 0.5) * 0.4));
      geos.push(bake(geo, new THREE.Vector3(px, y + h * 0.45, pz), q));
    }
    const mesh = mergedMesh(geos, mat);
    if (mesh) {
      mesh.castShadow = false;
      mesh.userData.castShadow = false;
      parent.add(mesh);
    }
  }
}

function addGrassTufts(parent) {
  const rng = mulberry32(91);
  const geos = [];
  const mat = toon('#4d5c42');
  for (let i = 0; i < 70; i++) {
    const x = -11 + rng() * 22;
    const inland = 0.35 + rng() * 2.4;
    const z = shoreZ(x) - inland;
    if (padWeight(x, z) > 0.72 && rng() < 0.65) continue;
    if (Math.hypot(x - fire.x, z - fire.z) < 1.35) continue;
    const y = terrainHeight(x, z);
    const blades = 2 + (rng() * 2) | 0;
    for (let b = 0; b < blades; b++) {
      const h = 0.12 + rng() * 0.28;
      const geo = new THREE.BoxGeometry(0.012, h, 0.04 + rng() * 0.04);
      const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(0.1, rng() * 3, (rng() - 0.5) * 0.3));
      geos.push(bake(geo, new THREE.Vector3(x + (rng() - 0.5) * 0.08, y + h / 2, z), q));
    }
  }
  const mesh = mergedMesh(geos, mat);
  if (mesh) {
    mesh.name = 'grass';
    mesh.castShadow = false;
    mesh.userData.castShadow = false;
    parent.add(mesh);
  }
}

function buildTree(spec) {
  const rng = mulberry32(spec.seed * 97 + 13);
  const g = new THREE.Group();
  g.name = spec.id;
  g.position.set(spec.x, terrainHeight(spec.x, spec.z), spec.z);
  g.rotation.x = spec.leanX;
  g.rotation.z = spec.leanZ;
  const h = spec.h;
  const profiles = {
    pine: { bare: 0.36, whorls: 7, per: 6, reach: 0.2, droop: 0.32, tufts: true, cedar: false, snag: false },
    spruce: { bare: 0.1, whorls: 9, per: 7, reach: 0.145, droop: 0.48, tufts: true, cedar: false, snag: false },
    cedar: { bare: 0.16, whorls: 6, per: 7, reach: 0.24, droop: 0.95, tufts: false, cedar: true, snag: false },
    sapling: { bare: 0.18, whorls: 3, per: 5, reach: 0.26, droop: 0.28, tufts: true, cedar: false, snag: false },
    snag: { bare: 0.05, whorls: 5, per: 3, reach: 0.13, droop: 0.22, tufts: false, cedar: false, snag: true },
  };
  const profile = profiles[spec.kind];
  const barkHex = spec.kind === 'snag' ? '#6e6860' : (spec.seed % 2 ? '#4a382c' : '#5a4534');
  const needleHex = {
    pine: spec.seed % 3 === 0 ? '#2c4636' : '#34523e',
    spruce: '#1e342a',
    cedar: '#24382e',
    sapling: '#4a5c44',
    snag: '#6e6860',
  }[spec.kind];
  const barkMat = toon(barkHex);
  const leafMat = toon(needleHex);
  const rBase = Math.max(0.02, h * (spec.kind === 'sapling' ? 0.012 : 0.015));
  const trunkH = spec.kind === 'snag' ? h * 0.86 : h * 0.96;
  const rTop = spec.kind === 'snag' ? rBase * 0.42 : rBase * 0.28;
  const barkGeos = [];
  const leafGeos = [];
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBase, trunkH, 7), barkMat);
  trunk.position.y = trunkH / 2;
  trunk.castShadow = true;
  trunk.receiveShadow = true;
  g.add(trunk);
  if (spec.kind === 'snag') {
    barkGeos.push(bake(
      new THREE.CylinderGeometry(rTop * 1.3, rTop * 0.7, 0.16, 5),
      new THREE.Vector3((rng() - 0.5) * 0.05, trunkH + 0.04, (rng() - 0.5) * 0.05),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(0.4, rng(), 0.8)),
    ));
  }
  const wind = 0.18;
  for (let i = 0; i < profile.whorls; i++) {
    const t = profile.whorls === 1 ? 1 : i / (profile.whorls - 1);
    const y = trunkH * (profile.bare + (1 - profile.bare) * (0.15 + 0.85 * t));
    const count = profile.per - (rng() < 0.35 ? 1 : 0);
    const twist = spec.seed * 0.4 + i * 0.73;
    for (let b = 0; b < count; b++) {
      if (rng() < (profile.snag ? 0.25 : 0.08)) continue;
      const ang = twist + (b / count) * Math.PI * 2;
      const side = 1 + Math.cos(ang) * wind;
      const reach = h * profile.reach * (1 - t * 0.72) * (0.75 + rng() * 0.45) * side;
      const len = Math.max(0.18, reach);
      const droop = profile.droop * (0.55 + t * 0.5) * (0.8 + rng() * 0.35);
      const dir = new THREE.Vector3(Math.cos(ang), -droop, Math.sin(ang)).normalize();
      const thick = profile.snag ? 0.025 + (1 - t) * 0.02 : Math.max(0.012, rBase * 0.28 * (1 - t * 0.5));
      const base = new THREE.Vector3(Math.cos(ang) * rBase * 0.6, y, Math.sin(ang) * rBase * 0.6);
      const mid = base.clone().add(dir.clone().multiplyScalar(len * 0.5));
      barkGeos.push(bake(
        new THREE.CylinderGeometry(thick * 0.45, thick, len, 4),
        mid,
        quatFromUp(dir),
      ));
      if (profile.snag) continue;
      const stations = profile.cedar ? 3 : (spec.kind === 'spruce' ? 3 : 2);
      const puff = profile.cedar ? 5 : 4;
      for (let s = 0; s < stations; s++) {
        const along = 0.42 + (s / Math.max(1, stations - 1)) * 0.58;
        const at = base.clone().add(dir.clone().multiplyScalar(len * along));
        const tuft = profile.cedar
          ? Math.min(0.4, Math.max(0.16, len * 0.2))
          : Math.min(0.32, Math.max(0.11, h * (spec.kind === 'spruce' ? 0.02 : 0.026) * (1.15 - t * 0.35)));
        for (let k = 0; k < puff; k++) {
          const fan = dir.clone();
          const spin = ang + k * (profile.cedar ? 0.85 : 1.25) + s * 0.4;
          fan.x += Math.cos(spin) * (profile.cedar ? 0.6 : 0.3);
          fan.y += profile.cedar ? -0.42 - (k % 3) * 0.06 : 0.22 + (k % 2) * 0.16;
          fan.z += Math.sin(spin) * (profile.cedar ? 0.5 : 0.3);
          fan.normalize();
          leafGeos.push(bake(
            new THREE.ConeGeometry(tuft * (profile.cedar ? 0.16 : 0.3), tuft, 5),
            at.clone().add(fan.clone().multiplyScalar(tuft * 0.4)),
            quatFromUp(fan),
          ));
        }
      }
    }
  }
  const bark = mergedMesh(barkGeos, barkMat);
  if (bark) {
    bark.castShadow = false;
    bark.userData.castShadow = false;
    g.add(bark);
  }
  const leaves = mergedMesh(leafGeos, leafMat);
  if (leaves) {
    leaves.castShadow = false;
    leaves.userData.castShadow = false;
    g.add(leaves);
  }
  return g;
}

function addShrubs(parent) {
  for (const spec of layout.shrubs) {
    const rng = mulberry32(spec.seed * 17);
    const g = new THREE.Group();
    g.name = spec.id;
    const y = terrainHeight(spec.x, spec.z);
    g.position.set(spec.x, y, spec.z);
    const s = spec.s;
    const colors = { grass: '#556448', mound: '#3c4a38', willow: '#3e533c', fern: '#314233' };
    const mat = toon(colors[spec.kind] || '#3c4a38');
    const geos = [];
    if (spec.kind === 'mound') {
      for (let i = 0; i < 5; i++) {
        const w = (0.28 + rng() * 0.35) * s;
        const h = (0.16 + rng() * 0.18) * s;
        const geo = new THREE.BoxGeometry(w, h, (0.22 + rng() * 0.3) * s);
        const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(rng() * 0.4, rng() * 6, rng() * 0.4));
        geos.push(bake(geo, new THREE.Vector3((rng() - 0.5) * 0.4 * s, h * 0.35, (rng() - 0.5) * 0.4 * s), q));
      }
    } else if (spec.kind === 'willow') {
      const stems = 4 + (rng() * 3) | 0;
      for (let i = 0; i < stems; i++) {
        const h = (0.55 + rng() * 0.7) * s;
        const ang = rng() * Math.PI * 2;
        const lean = 0.25 + rng() * 0.45;
        const dir = new THREE.Vector3(Math.cos(ang) * lean, 1, Math.sin(ang) * lean).normalize();
        geos.push(bake(
          new THREE.CylinderGeometry(0.012, 0.02, h, 4),
          dir.clone().multiplyScalar(h * 0.5),
          quatFromUp(dir),
        ));
        const tip = dir.clone().multiplyScalar(h);
        geos.push(bake(
          new THREE.BoxGeometry(0.22 * s, 0.08 * s, 0.16 * s),
          tip.add(new THREE.Vector3(0, -0.02, 0)),
          new THREE.Quaternion().setFromEuler(new THREE.Euler(0.6, ang, 0)),
        ));
      }
    } else if (spec.kind === 'fern') {
      for (let i = 0; i < 6; i++) {
        const ang = (i / 6) * Math.PI * 2 + rng() * 0.2;
        const len = (0.28 + rng() * 0.18) * s;
        const dir = new THREE.Vector3(Math.cos(ang), 0.35, Math.sin(ang)).normalize();
        geos.push(bake(
          new THREE.BoxGeometry(len, 0.015, len * 0.28),
          dir.clone().multiplyScalar(len * 0.45).add(new THREE.Vector3(0, 0.05, 0)),
          quatFromUp(dir),
        ));
      }
    } else {
      for (let i = 0; i < 7; i++) {
        const h = (0.22 + rng() * 0.38) * s;
        const geo = new THREE.BoxGeometry(0.015, h, 0.06 * s);
        const q = new THREE.Quaternion().setFromEuler(new THREE.Euler((rng() - 0.5) * 0.6, rng() * 6, (rng() - 0.5) * 0.5));
        geos.push(bake(geo, new THREE.Vector3((rng() - 0.5) * 0.35 * s, h / 2, (rng() - 0.5) * 0.35 * s), q));
      }
    }
    const mesh = mergedMesh(geos, mat);
    if (mesh) {
      mesh.castShadow = false;
      mesh.userData.castShadow = false;
      g.add(mesh);
    }
    parent.add(g);
  }
}

function slopeMesh(side, width, depth, height, sagAmp, mat, eaveY) {
  const segs = 8;
  const w2 = width / 2;
  const positions = [];
  const indices = [];
  for (let i = 0; i <= segs; i++) {
    const t = i / segs;
    const z = -depth / 2 + depth * t;
    const sag = Math.sin(Math.PI * t) * sagAmp;
    positions.push(0, height - sag * 0.3, z);
    positions.push(side * w2 * 0.5, (height + eaveY) * 0.5 - sag, z);
    positions.push(side * w2, eaveY - sag * 0.65, z);
  }
  const row = 3;
  for (let i = 0; i < segs; i++) {
    const a = i * row;
    indices.push(a, a + 1, a + row, a + 1, a + row + 1, a + row);
    indices.push(a + 1, a + 2, a + row + 1, a + 2, a + row + 2, a + row + 1);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  const mesh = new THREE.Mesh(geo, mat);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function endWall(z, door, width, height, mat) {
  const w2 = width / 2;
  const doorW = 0.34;
  const doorH = 1.02;
  const positions = [];
  const indices = [];
  const push = (x, y) => {
    positions.push(x, y, z);
    return positions.length / 3 - 1;
  };
  if (!door) {
    const a = push(-w2, 0.02);
    const b = push(w2, 0.02);
    const c = push(0, height);
    indices.push(a, b, c);
  } else {
    const A = push(-w2, 0.02);
    const B = push(-doorW, 0.02);
    const C = push(-doorW, doorH);
    const D = push(0, height);
    const E = push(doorW, doorH);
    const F = push(doorW, 0.02);
    const G = push(w2, 0.02);
    indices.push(A, B, C, A, C, D, C, E, D, E, F, G, E, G, D);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  const mesh = new THREE.Mesh(geo, mat);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function addRidgeTent(parent, spec) {
  const g = new THREE.Group();
  g.name = spec.id;
  g.position.set(spec.x, terrainHeight(spec.x, spec.z), spec.z);
  g.rotation.y = spec.yaw;
  const W = 2.2;
  const D = 2.65;
  const H = 1.58;
  const canvas = toon('#c6b08a', { side: THREE.DoubleSide });
  const canvasDeep = toon('#ae9674', { side: THREE.DoubleSide });
  const flyMat = toon('#7a5c40', { side: THREE.DoubleSide });
  const poleMat = toon('#5a4632');
  const rope = toon('#cfc8b8');
  const stakeMat = toon('#6b5340');

  addBox(g, W + 0.22, 0.016, D + 0.18, toon('#6a5840'), 0, 0.008, 0);
  g.add(slopeMesh(-1, W, D, H, 0.055, canvas, 0.03));
  g.add(slopeMesh(1, W, D, H, 0.05, canvasDeep, 0.03));
  const flyL = slopeMesh(-1, W * 1.08, D * 0.72, H + 0.08, 0.02, flyMat, 0.48);
  flyL.position.y = 0.045;
  g.add(flyL);
  const flyR = slopeMesh(1, W * 1.08, D * 0.72, H + 0.08, 0.018, flyMat, 0.48);
  flyR.position.y = 0.045;
  g.add(flyR);
  g.add(endWall(-D / 2, true, W, H, canvas));
  g.add(endWall(D / 2, false, W, H, canvasDeep));
  addBox(g, 0.62, 0.72, 0.5, toon('#241e18'), 0, 0.4, -D / 2 + 0.42);

  const hinge = (x, dir) => {
    const hng = new THREE.Group();
    hng.position.set(x, 0, -D / 2);
    hng.rotation.y = dir;
    addBox(hng, 0.34, 0.96, 0.016, canvas, dir * 0.17, 0.5, 0.01);
    g.add(hng);
  };
  hinge(-0.34, 0.95);
  hinge(0.34, -0.95);

  const peakF = new THREE.Vector3(0, H, -D / 2);
  const peakB = new THREE.Vector3(0, H, D / 2);
  rod(g, new THREE.Vector3(-W / 2, 0.03, -D / 2), peakF, 0.016, poleMat);
  rod(g, new THREE.Vector3(W / 2, 0.03, -D / 2), peakF, 0.016, poleMat);
  rod(g, new THREE.Vector3(-W / 2, 0.03, D / 2), peakB, 0.016, poleMat);
  rod(g, new THREE.Vector3(W / 2, 0.03, D / 2), peakB, 0.016, poleMat);
  rod(g, peakF.clone(), peakB.clone(), 0.014, poleMat);
  addCyl(g, 0.012, 0.016, 0.14, poleMat, 0, H + 0.1, -D / 2, 6);
  addCyl(g, 0.012, 0.016, 0.14, poleMat, 0, H + 0.1, D / 2, 6);
  addBox(g, 0.04, 0.03, D, toon('#8d7048'), 0, H + 0.01, 0);

  const guys = [
    [peakF, new THREE.Vector3(0, 0.02, -D / 2 - 0.95)],
    [peakB, new THREE.Vector3(0, 0.02, D / 2 + 0.88)],
    [new THREE.Vector3(-W / 2, 0.2, 0.1), new THREE.Vector3(-W / 2 - 0.72, 0.02, 0.15)],
    [new THREE.Vector3(W / 2, 0.2, -0.05), new THREE.Vector3(W / 2 + 0.7, 0.02, -0.08)],
  ];
  for (const [a, b] of guys) {
    rod(g, a, b, 0.006, rope);
    const stake = addCyl(g, 0.018, 0.012, 0.16, stakeMat, b.x, 0.04, b.z, 5);
    stake.rotation.z = 0.25;
  }

  const pack = new THREE.Group();
  pack.position.set(0.72, 0, -D / 2 - 0.28);
  pack.rotation.y = -0.4;
  addBox(pack, 0.32, 0.46, 0.18, toon('#3d4a38'), 0, 0.28, 0);
  addBox(pack, 0.26, 0.1, 0.08, toon('#314033'), 0, 0.52, 0.04);
  addBox(pack, 0.035, 0.4, 0.02, toon('#2a241e'), -0.1, 0.26, -0.1);
  addBox(pack, 0.035, 0.4, 0.02, toon('#2a241e'), 0.1, 0.26, -0.1);
  g.add(pack);
  const roll = addCyl(g, 0.07, 0.07, 0.42, toon('#3e4a56'), -0.85, 0.08, -D / 2 - 0.15, 8);
  roll.rotation.z = Math.PI / 2;

  parent.add(g);
}

function addDomeTent(parent, spec) {
  const g = new THREE.Group();
  g.name = spec.id;
  g.position.set(spec.x, terrainHeight(spec.x, spec.z), spec.z);
  g.rotation.y = spec.yaw;
  const bodyMat = toon('#667066', { side: THREE.DoubleSide });
  const flyMat = toon('#8d4e38', { side: THREE.DoubleSide });
  const poleMat = toon('#2c312f');
  const rope = toon('#cfc8b8');
  const stakeMat = toon('#6b5340');

  addBox(g, 2.55, 0.015, 2.2, toon('#5e5346'), 0, 0.008, 0.05);
  const body = new THREE.Mesh(new THREE.SphereGeometry(1, 18, 12, 0, Math.PI * 2, 0, Math.PI / 2), bodyMat);
  body.scale.set(1.18, 1.02, 1.02);
  body.position.y = 0.02;
  body.castShadow = true;
  body.receiveShadow = true;
  g.add(body);

  const gap = 0.78;
  const fly = new THREE.Mesh(
    new THREE.SphereGeometry(1, 18, 12, -Math.PI / 2 + gap / 2, Math.PI * 2 - gap, 0, Math.PI / 2),
    flyMat,
  );
  fly.scale.set(1.28, 1.12, 1.12);
  fly.position.y = 0.06;
  fly.castShadow = true;
  fly.receiveShadow = true;
  g.add(fly);

  addBox(g, 0.58, 0.72, 0.05, toon('#161412'), 0, 0.4, -0.98);
  addBox(g, 0.018, 0.68, 0.02, toon('#e4ded2'), 0.16, 0.42, -1.02);
  addCyl(g, 0.055, 0.055, 0.66, bodyMat, -0.42, 0.4, -1.0, 8);

  const arch = (axis) => {
    const pts = [];
    for (let i = 0; i <= 16; i++) {
      const a = Math.PI * (i / 16);
      if (axis === 'x') pts.push(new THREE.Vector3(Math.cos(a) * 1.32, Math.sin(a) * 1.16, 0));
      else pts.push(new THREE.Vector3(0, Math.sin(a) * 1.16, Math.cos(a) * 1.16));
    }
    const tube = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 28, 0.014, 5, false), poleMat);
    tube.castShadow = true;
    g.add(tube);
  };
  arch('x');
  arch('z');

  const pL = new THREE.Vector3(-0.5, 0.92, -0.92);
  const pR = new THREE.Vector3(0.5, 0.92, -0.92);
  const sL = new THREE.Vector3(-0.58, 0.02, -1.72);
  const sR = new THREE.Vector3(0.58, 0.02, -1.72);
  rod(g, pL, sL, 0.012, poleMat);
  rod(g, pR, sR, 0.012, poleMat);
  const clothGeo = new THREE.BufferGeometry();
  clothGeo.setAttribute('position', new THREE.Float32BufferAttribute([
    pL.x, pL.y, pL.z, pR.x, pR.y, pR.z, sR.x, 0.04, sR.z, sL.x, 0.04, sL.z,
  ], 3));
  clothGeo.setIndex([0, 1, 2, 0, 2, 3]);
  clothGeo.computeVertexNormals();
  const cloth = new THREE.Mesh(clothGeo, flyMat);
  cloth.castShadow = true;
  g.add(cloth);
  addBox(g, 0.95, 0.012, 0.72, toon('#6a5a46'), 0, 0.012, -1.32);

  const guys = [[1.15, 0.2, 0.15], [-1.15, 0.2, 0.1], [0.15, 0.2, 1.05], [-0.2, 0.2, -0.2]];
  for (const [x, y, z] of guys) {
    const end = new THREE.Vector3(x * 1.25, 0.02, z * 1.2);
    rod(g, new THREE.Vector3(x, y, z), end, 0.006, rope);
    addCyl(g, 0.016, 0.012, 0.14, stakeMat, end.x, 0.04, end.z, 5);
  }

  const boots = new THREE.Group();
  boots.position.set(-0.85, 0, -1.15);
  addBox(boots, 0.1, 0.1, 0.22, toon('#3a342e'), -0.08, 0.05, 0);
  addBox(boots, 0.1, 0.1, 0.22, toon('#3a342e'), 0.08, 0.05, 0.04);
  g.add(boots);
  parent.add(g);
}

const flames = [];
let fireLight = null;

function addFire(parent) {
  const g = new THREE.Group();
  g.name = 'fire';
  const y = terrainHeight(fire.x, fire.z);
  g.position.set(fire.x, y, fire.z);
  const rng = mulberry32(11);
  for (let i = 0; i < 11; i++) {
    const a = (i / 11) * Math.PI * 2 + (rng() - 0.5) * 0.42;
    const rad = fire.ringRadius * (0.86 + rng() * 0.32);
    const radius = 0.1 + rng() * 0.09;
    const mesh = rockMesh(rng, radius, i % 3 === 0 ? '#6e675e' : '#5a564f');
    mesh.position.set(Math.cos(a) * rad, -radius * 0.28, Math.sin(a) * rad);
    mesh.rotation.set(rng() * 2, rng() * 4, rng());
    g.add(mesh);
  }
  const ash = new THREE.Mesh(new THREE.CircleGeometry(0.42, 16), toon('#2a2724', {
    polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2,
  }));
  ash.rotation.x = -Math.PI / 2;
  ash.position.y = 0.02;
  ash.receiveShadow = true;
  g.add(ash);
  for (let i = 0; i < 3; i++) {
    const log = addCyl(g, 0.045, 0.055, 0.48, toon('#2a241c'), (i - 1) * 0.1, 0.07, (i - 1) * 0.06, 6);
    log.rotation.z = Math.PI / 2;
    log.rotation.y = i * 0.7;
  }
  const flameSpec = [
    { h: 0.26, r: 0.07, c: '#e39a45', x: 0.02, z: 0 },
    { h: 0.16, r: 0.05, c: '#f0d09a', x: -0.05, z: 0.04 },
    { h: 0.12, r: 0.045, c: '#c45c2c', x: 0.05, z: -0.03 },
  ];
  for (const f of flameSpec) {
    const mesh = new THREE.Mesh(new THREE.ConeGeometry(f.r, f.h, 6), basic(f.c, { fog: false }));
    mesh.position.set(f.x, 0.08 + f.h / 2, f.z);
    mesh.userData.shade = 'fixed';
    g.add(mesh);
    flames.push(mesh);
  }
  for (let i = 0; i < 5; i++) {
    const ember = new THREE.Mesh(new THREE.SphereGeometry(0.018, 5, 4), basic('#a34722', { fog: false }));
    ember.position.set((rng() - 0.5) * 0.22, 0.04, (rng() - 0.5) * 0.18);
    ember.userData.shade = 'fixed';
    g.add(ember);
  }
  fireLight = new THREE.PointLight('#ff9440', 0.7, 4.3, 2);
  fireLight.position.set(0, 0.32, 0);
  g.add(fireLight);
  parent.add(g);
}

function addSeats(parent) {
  for (const spec of layout.seats) {
    const g = new THREE.Group();
    g.name = spec.id;
    g.position.set(spec.x, terrainHeight(spec.x, spec.z), spec.z);
    g.rotation.y = spec.yaw;
    if (spec.kind === 'log') {
      const log = addCyl(g, 0.14, 0.16, spec.id === 'seat-lake' ? 1.25 : 0.95, toon('#6b4e36'), 0, 0.12, 0, 8);
      log.rotation.z = Math.PI / 2;
      const end = addCyl(g, 0.135, 0.135, 0.03, toon('#c4a67c'), spec.id === 'seat-lake' ? 0.62 : 0.47, 0.12, 0, 8);
      end.rotation.z = Math.PI / 2;
    } else {
      addCyl(g, 0.2, 0.24, 0.42, toon('#6a4c32'), 0, 0.21, 0, 8);
      addCyl(g, 0.19, 0.19, 0.025, toon('#d2b48a'), 0, 0.43, 0, 8);
    }
    parent.add(g);
  }
}

function makeLantern() {
  const g = new THREE.Group();
  g.name = 'lantern';
  const metal = toon('#3e4448');
  addCyl(g, 0.07, 0.08, 0.03, metal, 0, 0.02, 0, 8);
  const glass = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.14, 0.1), basic('#e6b47a', { transparent: true, opacity: 0.88, fog: false }));
  glass.position.y = 0.11;
  glass.userData.shade = 'fixed';
  g.add(glass);
  addBox(g, 0.012, 0.16, 0.012, metal, -0.06, 0.11, -0.06);
  addBox(g, 0.012, 0.16, 0.012, metal, 0.06, 0.11, -0.06);
  addBox(g, 0.012, 0.16, 0.012, metal, -0.06, 0.11, 0.06);
  addBox(g, 0.012, 0.16, 0.012, metal, 0.06, 0.11, 0.06);
  addBox(g, 0.12, 0.02, 0.12, metal, 0, 0.2, 0);
  addCyl(g, 0.012, 0.02, 0.05, metal, 0, 0.23, 0, 6);
  const handle = new THREE.Mesh(new THREE.TorusGeometry(0.045, 0.006, 5, 10, Math.PI), metal);
  handle.position.y = 0.26;
  handle.rotation.z = Math.PI;
  g.add(handle);
  const light = new THREE.PointLight('#ffc58a', 0.2, 2.5, 2);
  light.position.set(0, 0.12, 0);
  g.add(light);
  return g;
}

function addPicnic(parent) {
  const spec = layout.table;
  const g = new THREE.Group();
  g.name = spec.id;
  g.position.set(spec.x, terrainHeight(spec.x, spec.z), spec.z);
  g.rotation.y = spec.yaw;
  const wood = toon('#8d6a46');
  const dark = toon('#6a4c32');
  for (let i = 0; i < 5; i++) {
    addBox(g, 1.72, 0.032, 0.12, i % 2 ? wood : dark, 0, 0.748, -0.28 + i * 0.14);
  }
  for (const x of [-0.66, 0.66]) {
    rod(g, new THREE.Vector3(x, 0.02, -0.32), new THREE.Vector3(x, 0.73, 0.26), 0.032, dark);
    rod(g, new THREE.Vector3(x, 0.02, 0.32), new THREE.Vector3(x, 0.73, -0.26), 0.032, dark);
    addBox(g, 0.06, 0.04, 0.5, dark, x, 0.34, 0);
  }
  for (const b of layout.benches) {
    const bench = new THREE.Group();
    bench.name = b.id;
    bench.position.set(0, 0, b.localZ);
    bench.rotation.y = b.localZ > 0 ? 0 : Math.PI;
    addBox(bench, 1.58, 0.04, 0.22, wood, 0, 0.45, 0);
    addBox(bench, 0.08, 0.44, 0.08, dark, -0.55, 0.22, 0);
    addBox(bench, 0.08, 0.44, 0.08, dark, 0.55, 0.22, 0);
    g.add(bench);
  }
  const lantern = makeLantern();
  lantern.position.set(0.62, 0.77, -0.16);
  g.add(lantern);
  parent.add(g);
}

function addKitchen(parent) {
  const x = 3.4;
  const z = -0.42;
  const g = new THREE.Group();
  g.name = 'kitchen';
  g.position.set(x, terrainHeight(x, z), z);
  g.rotation.y = -0.5;
  const rng = mulberry32(5);
  const r1 = rockMesh(rng, 0.12, '#5c5852');
  r1.position.set(-0.16, -0.02, 0);
  g.add(r1);
  const r2 = rockMesh(rng, 0.1, '#6a645c');
  r2.position.set(0.16, -0.02, 0.02);
  g.add(r2);
  for (let i = 0; i < 4; i++) {
    addBox(g, 0.42, 0.012, 0.018, toon('#4a4038'), 0, 0.12, -0.08 + i * 0.06);
  }
  addCyl(g, 0.11, 0.1, 0.1, toon('#3a4044'), 0, 0.18, 0, 10);
  addCyl(g, 0.1, 0.1, 0.02, toon('#4a5256'), 0.04, 0.24, 0, 10).rotation.z = 0.5;
  const bail = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.006, 4, 10, Math.PI), toon('#2e3236'));
  bail.position.y = 0.22;
  g.add(bail);
  const cooler = new THREE.Group();
  cooler.position.set(0.72, 0, 0.28);
  addBox(cooler, 0.5, 0.32, 0.32, toon('#314038'), 0, 0.16, 0);
  const lid = addBox(cooler, 0.48, 0.035, 0.3, toon('#3e5146'), 0, 0.34, -0.02);
  lid.rotation.x = -0.55;
  addBox(cooler, 0.16, 0.02, 0.04, toon('#c8c2b4'), 0, 0.2, 0.16);
  g.add(cooler);
  parent.add(g);

  const wood = new THREE.Group();
  wood.name = 'woodpile';
  wood.position.set(-5.45, terrainHeight(-5.45, -3.2), -3.2);
  wood.rotation.y = 0.4;
  for (let layer = 0; layer < 3; layer++) {
    const alongX = layer % 2 === 0;
    for (let i = 0; i < 4; i++) {
      const log = addCyl(wood, 0.05, 0.055, 0.7, toon(i % 2 ? '#6a4e36' : '#5a4030'), alongX ? 0 : (i - 1.5) * 0.12, 0.07 + layer * 0.11, alongX ? (i - 1.5) * 0.12 : 0, 6);
      log.rotation.z = alongX ? Math.PI / 2 : 0;
      log.rotation.x = alongX ? 0 : Math.PI / 2;
    }
  }
  parent.add(wood);

  const stump = new THREE.Group();
  stump.position.set(-5.15, terrainHeight(-5.15, -2.15), -2.15);
  addCyl(stump, 0.16, 0.2, 0.38, toon('#6a4e34'), 0, 0.19, 0, 7);
  const axe = new THREE.Group();
  axe.position.set(0.02, 0.4, 0);
  axe.rotation.z = 0.35;
  addCyl(axe, 0.012, 0.014, 0.48, toon('#c2ad8a'), 0, 0.2, 0, 5);
  addBox(axe, 0.14, 0.07, 0.025, toon('#8a9094'), 0.02, 0.42, 0);
  stump.add(axe);
  parent.add(stump);
}

function addDock(parent) {
  const spec = layout.dock;
  const g = new THREE.Group();
  g.name = spec.id;
  const deckY = waterLevel + spec.deckAboveWater;
  g.position.set(spec.x, deckY, spec.z);
  g.rotation.y = spec.yaw;
  const plankMat = toon('#8d7352');
  const dark = toon('#4a3c2e');
  const wet = toon('#5a4836');
  const geos = [];
  const darkPlanks = [];
  const n = 14;
  const gap = 0.038;
  const plankD = (spec.length - gap * (n - 1)) / n;
  for (let i = 0; i < n; i++) {
    const z = plankD / 2 + i * (plankD + gap);
    const geo = new THREE.BoxGeometry(spec.width - 0.04, 0.04, plankD * 0.92);
    geo.translate(i % 4 === 0 ? 0.012 : 0, 0.02, z);
    (i % 2 ? darkPlanks : geos).push(geo);
  }
  for (const x of [-0.4, 0.4]) {
    const s = new THREE.BoxGeometry(0.07, 0.09, spec.length);
    s.translate(x, -0.05, spec.length / 2);
    geos.push(s);
  }
  for (const z of [0.4, spec.length * 0.5, spec.length - 0.35]) {
    const beam = new THREE.BoxGeometry(spec.width - 0.12, 0.06, 0.07);
    beam.translate(0, -0.08, z);
    geos.push(beam);
  }
  const deck = mergedMesh(geos, plankMat);
  if (deck) g.add(deck);
  const deckDark = mergedMesh(darkPlanks, toon('#6e5840'));
  if (deckDark) g.add(deckDark);

  for (const z of [1.25, spec.length - 0.45]) {
    for (const x of [-0.46, 0.46]) {
      addBox(g, 0.08, 0.78, 0.08, dark, x, -0.4, z);
      addBox(g, 0.09, 0.07, 0.09, wet, x, -(deckY - waterLevel), z);
    }
  }
  rod(
    g,
    new THREE.Vector3(-0.46, 0.1, spec.length - 0.45),
    new THREE.Vector3(0.46, 0.1, spec.length - 0.45),
    0.01,
    toon('#d2cdc2'),
  );
  addBox(g, 0.18, 0.04, 0.06, dark, 0.22, 0.06, spec.length - 0.7);
  const coil = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.016, 6, 14), toon('#d2cdc2'));
  coil.rotation.x = Math.PI / 2;
  coil.position.set(-0.28, 0.055, spec.length - 1.05);
  coil.castShadow = true;
  g.add(coil);
  const paddle = addBox(g, 0.07, 0.025, 1.15, toon('#c4b08a'), -0.15, 0.06, spec.length * 0.45);
  paddle.rotation.y = 0.15;
  addBox(g, 0.16, 0.02, 0.32, toon('#a89068'), -0.22, 0.065, spec.length * 0.45 + 0.5);

  const groundY = terrainHeight(spec.x, spec.z);
  const drop = deckY - groundY;
  if (drop > 0.04) {
    const rampLen = 0.95;
    const ramp = new THREE.Mesh(new THREE.BoxGeometry(spec.width * 0.9, 0.04, rampLen), plankMat);
    ramp.position.set(0, -drop * 0.45, -rampLen * 0.35);
    ramp.rotation.x = -Math.atan2(drop, rampLen);
    ramp.castShadow = true;
    ramp.receiveShadow = true;
    g.add(ramp);
  }
  parent.add(g);
}

function addCanoe(parent) {
  const spec = layout.canoe;
  const outer = new THREE.Group();
  outer.name = spec.id;
  const half = spec.length / 2;
  const sternLocal = new THREE.Vector3(-half, 0, 0);
  const bowLocal = new THREE.Vector3(half, 0, 0);
  const yaw = spec.yaw;
  const c = Math.cos(yaw);
  const s = Math.sin(yaw);
  const world = (v) => new THREE.Vector3(
    spec.x + v.x * c + v.z * s,
    0,
    spec.z - v.x * s + v.z * c,
  );
  const bowW = world(bowLocal);
  const sternW = world(sternLocal);
  const bowH = waterLevel + 0.02;
  const sternH = terrainHeight(sternW.x, sternW.z) + 0.06;
  const pitch = Math.atan2(bowH - sternH, spec.length);
  outer.position.set(spec.x, (bowH + sternH) / 2 + 0.16, spec.z);
  outer.rotation.y = yaw;
  const inner = new THREE.Group();
  inner.rotation.z = pitch;
  inner.rotation.x = 0.05;

  const stations = 16;
  const ring = 7;
  const positions = [];
  for (let i = 0; i <= stations; i++) {
    const t = i / stations;
    const bowt = Math.sin(Math.PI * t);
    const w = 0.42 * Math.pow(Math.max(bowt, 0.001), 0.52);
    const depth = 0.28 * Math.pow(Math.max(bowt, 0.001), 0.4);
    const x = -half + spec.length * t;
    const lift = (t < 0.14 || t > 0.86) ? (1 - bowt) * 0.12 : 0;
    for (let k = 0; k < ring; k++) {
      const u = k / (ring - 1);
      const side = (u - 0.5) * 2;
      const z = side * w;
      const belly = Math.cos(side * Math.PI * 0.5);
      const y = -depth * (0.25 + 0.75 * belly) + lift;
      positions.push(x, y, z);
    }
  }
  const indices = [];
  for (let i = 0; i < stations; i++) {
    for (let k = 0; k < ring - 1; k++) {
      const a = i * ring + k;
      const b = a + 1;
      const c0 = a + ring;
      const d = c0 + 1;
      indices.push(a, c0, b, b, c0, d);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  const hull = new THREE.Mesh(geo, toon('#6e3a32', { side: THREE.DoubleSide }));
  hull.castShadow = true;
  hull.receiveShadow = true;
  inner.add(hull);
  addBox(inner, spec.length * 0.55, 0.02, 0.08, toon('#5a302c'), -0.15, -0.02, 0);
  addBox(inner, spec.length * 0.42, 0.02, 0.08, toon('#5a302c'), 0.35, -0.02, 0);
  addBox(inner, 0.04, 0.025, 0.55, toon('#c2ad8a'), -0.25, 0.0, 0);
  addBox(inner, 0.04, 0.025, 0.5, toon('#c2ad8a'), 0.45, 0.0, 0);
  const paddle = addBox(inner, 1.05, 0.02, 0.07, toon('#d2c2a4'), 0.1, 0.02, 0.12);
  paddle.rotation.y = 0.4;
  outer.add(inner);

  const stakeAt = world(new THREE.Vector3(-half * 0.15, 0, 0.62));
  const stakeY = terrainHeight(stakeAt.x, stakeAt.z);
  addCyl(parent, 0.02, 0.014, 0.16, toon('#6b5340'), stakeAt.x, stakeY + 0.06, stakeAt.z, 5);
  rod(
    parent,
    new THREE.Vector3(sternW.x, Math.max(sternH, waterLevel) + 0.12, sternW.z),
    new THREE.Vector3(stakeAt.x, stakeY + 0.1, stakeAt.z),
    0.008,
    toon('#d2cdc2'),
  );
  parent.add(outer);
}

function addDriftwood(parent) {
  const x = 5.2;
  const z = shoreZ(x) - 0.25;
  const g = new THREE.Group();
  g.position.set(x, terrainHeight(x, z) + 0.06, z);
  g.rotation.y = 0.8;
  const a = addCyl(g, 0.07, 0.09, 1.4, toon('#7a6a56'), 0, 0, 0, 6);
  a.rotation.z = Math.PI / 2;
  a.rotation.y = 0.3;
  const b = addCyl(g, 0.04, 0.06, 0.7, toon('#6a5a48'), 0.45, 0.05, 0.1, 5);
  b.rotation.z = Math.PI / 2.4;
  parent.add(g);
}

function facingError(obj, tx, tz) {
  obj.updateWorldMatrix(true, false);
  const p = new THREE.Vector3();
  obj.getWorldPosition(p);
  const q = new THREE.Quaternion();
  obj.getWorldQuaternion(q);
  const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(q);
  const flat = new THREE.Vector3(fwd.x, 0, fwd.z);
  if (flat.lengthSq() < 1e-6) return 180;
  flat.normalize();
  const to = new THREE.Vector3(tx - p.x, 0, tz - p.z);
  if (to.lengthSq() < 1e-6) return 0;
  to.normalize();
  return Math.acos(Math.min(1, Math.max(-1, flat.dot(to)))) * 180 / Math.PI;
}

boot({
  readyText: 'ready — lakeside campsite · drag orbit · U unlit · T toon',
  build(api) {
    const { content, scene } = api;
    scene.add(buildSky());
    content.add(buildTerrain());
    content.add(buildWater());
    scatterRocks(content);
    addReeds(content);
    addGrassTufts(content);
    for (const spec of layout.pines) content.add(buildTree(spec));
    addShrubs(content);
    for (const spec of layout.tents) {
      if (spec.kind === 'ridge') addRidgeTent(content, spec);
      else addDomeTent(content, spec);
    }
    addFire(content);
    addSeats(content);
    addPicnic(content);
    addKitchen(content);
    addDock(content);
    addCanoe(content);
    addDriftwood(content);
    const fallen = addCyl(content, 0.09, 0.12, 2.1, toon('#5c4a3a'), -7.4, terrainHeight(-7.4, -4.6) + 0.12, -4.6, 6);
    fallen.rotation.z = Math.PI / 2;
    fallen.rotation.y = 0.6;
    return {
      report() {
        content.updateWorldMatrix(true, true);
        const seatErrors = {};
        for (const s of layout.seats) {
          const obj = content.getObjectByName(s.id);
          seatErrors[s.id] = obj ? Number(facingError(obj, fire.x, fire.z).toFixed(2)) : null;
        }
        const tentErrors = {};
        for (const t of layout.tents) {
          const obj = content.getObjectByName(t.id);
          tentErrors[t.id] = obj ? Number(facingError(obj, fire.x, fire.z).toFixed(2)) : null;
        }
        const benchErrors = {};
        for (const b of layout.benches) {
          const obj = content.getObjectByName(b.id);
          benchErrors[b.id] = obj ? Number(facingError(obj, layout.table.x, layout.table.z).toFixed(2)) : null;
        }
        const values = [...Object.values(seatErrors), ...Object.values(tentErrors), ...Object.values(benchErrors)];
        return {
          seatErrors,
          tentErrors,
          benchErrors,
          maxError: Math.max(...values.filter((v) => v != null)),
          treeCount: layout.pines.length,
          treeKinds: [...new Set(layout.pines.map((p) => p.kind))],
        };
      },
    };
  },
  attachAssets(prototypes, ctx) {
    const table = ctx.content.getObjectByName('picnic-table');
    for (const inst of layout.tabletop) {
      const node = prototypes[inst.kind].clone(true);
      ctx.applyShading(node, ctx.shadingMode);
      node.position.set(inst.local[0], inst.local[1], inst.local[2]);
      node.rotation.y = inst.rotationY || 0;
      node.name = inst.id;
      table.add(node);
    }
    for (const inst of layout.groundProps) {
      const node = prototypes[inst.kind].clone(true);
      ctx.applyShading(node, ctx.shadingMode);
      node.position.set(inst.x, terrainHeight(inst.x, inst.z), inst.z);
      node.rotation.y = inst.rotationY || 0;
      node.name = inst.id;
      ctx.props.add(node);
    }
  },
  tick(t) {
    if (fireLight) {
      fireLight.intensity = 0.62 + Math.sin(t * 3.2) * 0.05 + Math.sin(t * 8.1) * 0.025;
    }
    flames.forEach((mesh, i) => {
      const s = 1 + Math.sin(t * (3.4 + i * 0.7) + i) * 0.05;
      mesh.scale.y = s;
    });
  },
});
