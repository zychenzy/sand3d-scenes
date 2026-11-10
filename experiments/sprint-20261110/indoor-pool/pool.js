import * as THREE from 'three';
import { mergeGeometries } from './vendor/utils/BufferGeometryUtils.js';
import { boot, toon, addBox, addCyl } from './scene_lib.js';

const DADO = 1.42;
const GLASS_TOP = 3.5;

function frameOf(layout) {
  const { width: W, depth: D, height: H } = layout.meta.room;
  const pool = layout.pool;
  const room = { x0: -W / 2, x1: W / 2, z0: -D / 2, z1: D / 2, H, W, D };
  const yDeep = pool.surfaceY - pool.deep;
  const yShallow = pool.surfaceY - pool.shallow;
  const floorY = (z) => {
    const t = (z - pool.z0) / (pool.z1 - pool.z0);
    return yDeep + (yShallow - yDeep) * t;
  };
  const steps = 5;
  const run = 0.3;
  const stair = {
    x0: 1.28,
    x1: 2.4,
    run,
    rise: 0.22,
    steps,
    zNose: pool.z1 - steps * run,
  };
  return {
    room,
    pool,
    niche: layout.niche,
    trusses: layout.trusses,
    floorY,
    yDeep,
    yShallow,
    stair,
  };
}

function roofY(trusses, x) {
  const half = Math.max(Math.abs(trusses.xL), Math.abs(trusses.xR));
  const t = Math.min(1, Math.abs(x) / half);
  return trusses.yRidge + (trusses.yEave - trusses.yRidge) * t;
}

function tileTexture(palette, grout, tiles = 4, tilePx = 40, groutPx = 2) {
  const size = tiles * tilePx;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = grout;
  ctx.fillRect(0, 0, size, size);
  for (let y = 0; y < tiles; y++) {
    for (let x = 0; x < tiles; x++) {
      ctx.fillStyle = palette[(x * 5 + y * 3) % palette.length];
      ctx.fillRect(
        x * tilePx + groutPx,
        y * tilePx + groutPx,
        tilePx - groutPx * 2,
        tilePx - groutPx * 2
      );
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 8;
  tex.needsUpdate = true;
  return tex;
}

function labelTexture(text, sub) {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 160;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#e7f1ec';
  ctx.fillRect(0, 0, 256, 160);
  ctx.strokeStyle = '#173238';
  ctx.lineWidth = 10;
  ctx.strokeRect(7, 7, 242, 146);
  ctx.fillStyle = '#173238';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '700 84px Georgia, Times, serif';
  ctx.fillText(text, 128, 68);
  ctx.font = '600 24px sans-serif';
  ctx.fillText(sub, 128, 122);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

function grateTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#243438';
  ctx.fillRect(0, 0, 64, 64);
  ctx.fillStyle = '#9eb4b0';
  for (let i = 5; i < 64; i += 8) ctx.fillRect(i, 3, 3, 58);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

function makeMats() {
  const poolTex = tileTexture(['#f4f8f7', '#e7efed', '#f7fbfa', '#dfe8e6'], '#c5d2d4');
  const deckTex = tileTexture(['#e7eeea', '#d5dfda', '#f2f6f3', '#cdd8d3'], '#b7c2bb', 4, 48, 3);
  const dadoTex = tileTexture(['#f4faf6', '#e5f0ea', '#f7fbf8', '#dce8e2'], '#c5d5cc', 4, 36, 2);
  const deep = new THREE.Color('#145e68');
  const shallow = new THREE.Color('#3aa4ae');
  return {
    poolTex,
    deckTex,
    dadoTex,
    deep,
    shallow,
    deck: toon('#ffffff', { map: deckTex }),
    wet: toon('#8fa8a2', { map: deckTex }),
    coping: toon('#e4ddd0'),
    concrete: toon('#8e8c86'),
    dado: toon('#ffffff', { map: dadoTex }),
    dadoCap: toon('#7f978e'),
    timber: toon('#c4a36e'),
    timberDark: toon('#8d6840'),
    nicheWood: toon('#a6784c'),
    roof: toon('#e7d3b0', { side: THREE.DoubleSide }),
    rod: toon('#2c3532'),
    mullion: toon('#4d5c57'),
    glass: toon('#d7eef3', { transparent: true, opacity: 0.16, side: THREE.DoubleSide }),
    sky: toon('#b7d4cf'),
    water: null,
    lane: toon('#102e34', { polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }),
    waterline: toon('#0e3e48'),
    metal: toon('#d5dbd8'),
    step: toon('#d8efe8', { map: poolTex }),
    ink: toon('#173238'),
    clock: toon('#f4f7f2'),
    ring: toon('#b85c4c'),
    foam: toon('#d7e6e1'),
    navy: toon('#1b3944'),
    cream: toon('#f3eee4'),
    sage: toon('#c9d5cc'),
    clay: toon('#c56d5c'),
    fixture: toon('#e7fffc', { emissive: '#7dfff4', emissiveIntensity: 0.65 }),
    sconce: toon('#ffe6c4', { emissive: '#ffc98a', emissiveIntensity: 0.8 }),
    mirror: toon('#d5e7ea'),
    grate: toon('#ffffff', { map: grateTexture() }),
  };
}

function floorBandMat(mats, t) {
  const m = toon('#ffffff', { map: mats.poolTex });
  m.color.copy(mats.deep).lerp(mats.shallow, t);
  return m;
}

function wallMat(mats) {
  const m = toon('#1e7c88', { map: mats.poolTex, side: THREE.DoubleSide });
  return m;
}

function group(parent, name) {
  const g = new THREE.Group();
  g.name = name;
  parent.add(g);
  return g;
}

function box(parent, w, h, d, mat, x, y, z, opts = {}) {
  const m = addBox(parent, w, h, d, mat, x, y, z);
  if (opts.cast === false) m.userData.castShadow = false;
  if (opts.receive === false) m.userData.receiveShadow = false;
  if (opts.rotX) m.rotation.x = opts.rotX;
  if (opts.rotY) m.rotation.y = opts.rotY;
  if (opts.rotZ) m.rotation.z = opts.rotZ;
  return m;
}

function addQuad(parent, corners, mat, opts = {}) {
  const u = opts.u ?? 0;
  const v = opts.v ?? 2;
  const span = opts.span ?? 1;
  const pos = new Float32Array(12);
  const uv = new Float32Array(8);
  for (let i = 0; i < 4; i++) {
    const p = corners[i];
    pos[i * 3] = p[0];
    pos[i * 3 + 1] = p[1];
    pos[i * 3 + 2] = p[2];
    uv[i * 2] = p[u] / span;
    uv[i * 2 + 1] = p[v] / span;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  geo.setIndex([0, 1, 2, 0, 2, 3]);
  geo.computeVertexNormals();
  const mesh = new THREE.Mesh(geo, mat);
  if (opts.cast === false) mesh.userData.castShadow = false;
  if (opts.receive === false) mesh.userData.receiveShadow = false;
  parent.add(mesh);
  return mesh;
}

function flatRect(parent, x0, x1, z0, z1, y, mat, span, opts = {}) {
  return addQuad(parent, [
    [x0, y, z0],
    [x0, y, z1],
    [x1, y, z1],
    [x1, y, z0],
  ], mat, { u: 0, v: 2, span, ...opts });
}

function slopedRect(parent, F, x0, x1, z0, z1, mat, lift, span = 1) {
  const y0 = F.floorY(z0) + lift;
  const y1 = F.floorY(z1) + lift;
  return addQuad(parent, [
    [x0, y0, z0],
    [x0, y1, z1],
    [x1, y1, z1],
    [x1, y0, z0],
  ], mat, { u: 0, v: 2, span, cast: false });
}

function beam(parent, p0, p1, thickness, through, mat) {
  const a = new THREE.Vector3(p0[0], p0[1], p0[2]);
  const b = new THREE.Vector3(p1[0], p1[1], p1[2]);
  const dir = b.clone().sub(a);
  const len = dir.length();
  if (len < 1e-4) return null;
  const yAxis = dir.clone().normalize();
  let zRef = new THREE.Vector3(0, 0, 1);
  if (Math.abs(yAxis.dot(zRef)) > 0.85) zRef = new THREE.Vector3(0, 1, 0);
  const xAxis = new THREE.Vector3().crossVectors(zRef, yAxis).normalize();
  const zAxis = new THREE.Vector3().crossVectors(xAxis, yAxis).normalize();
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(thickness, len, through), mat);
  mesh.position.copy(a).add(b).multiplyScalar(0.5);
  mesh.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(xAxis, yAxis, zAxis));
  parent.add(mesh);
  return mesh;
}

function rod(parent, p0, p1, radius, mat) {
  const a = new THREE.Vector3(p0[0], p0[1], p0[2]);
  const b = new THREE.Vector3(p1[0], p1[1], p1[2]);
  const dir = b.clone().sub(a);
  const len = dir.length();
  if (len < 1e-4) return null;
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, len, 6), mat);
  mesh.position.copy(a).add(b).multiplyScalar(0.5);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
  parent.add(mesh);
  return mesh;
}

function addPrism(parent, corners, thickness, mat) {
  const a = new THREE.Vector3(...corners[0]);
  const b = new THREE.Vector3(...corners[1]);
  const d = new THREE.Vector3(...corners[3]);
  const n = new THREE.Vector3().crossVectors(b.clone().sub(a), d.clone().sub(a)).normalize();
  if (n.y < 0) n.negate();
  const o = n.multiplyScalar(thickness);
  const top = corners.map((p) => [p[0] + o.x, p[1] + o.y, p[2] + o.z]);
  addQuad(parent, corners, mat, { span: 2.4, u: 0, v: 2 });
  addQuad(parent, top, mat, { span: 2.4, u: 0, v: 2 });
  for (let i = 0; i < 4; i++) {
    const j = (i + 1) % 4;
    addQuad(parent, [corners[i], corners[j], top[j], top[i]], mat, { span: 2.4, u: 0, v: 1 });
  }
}

function slab(parent, x0, x1, z0, z1, mat) {
  const w = x1 - x0;
  const d = z1 - z0;
  if (w < 0.02 || d < 0.02) return;
  box(parent, w, 0.28, d, mat, (x0 + x1) / 2, -0.13, (z0 + z1) / 2);
}

function buildDeck(g, F, mats) {
  const { room, pool, niche, stair } = F;
  slab(g, room.x0 - 0.16, room.x1, room.z0 - 0.16, pool.z0, mats.concrete);
  slab(g, room.x0 - 0.16, pool.x0, pool.z0, pool.z1, mats.concrete);
  slab(g, pool.x1, room.x1, pool.z0, pool.z1, mats.concrete);
  slab(g, room.x0 - 0.16, room.x1, pool.z1, room.z1, mats.concrete);
  slab(g, niche.x0, room.x0 - 0.02, niche.z0, niche.z1, mats.concrete);

  const y = 0.012;
  const span = 2.48;
  flatRect(g, room.x0, room.x1, room.z0, pool.z0, y, mats.deck, span, { cast: false });
  flatRect(g, room.x0, pool.x0, pool.z0, pool.z1, y, mats.deck, span, { cast: false });
  flatRect(g, pool.x1, room.x1, pool.z0, pool.z1, y, mats.deck, span, { cast: false });
  flatRect(g, room.x0, room.x1, pool.z1, room.z1, y, mats.deck, span, { cast: false });
  flatRect(g, niche.x0 + 0.04, room.x0, niche.z0, niche.z1, y, mats.deck, span, { cast: false });

  const o0 = 0.16;
  const o1 = 0.72;
  const yw = 0.02;
  flatRect(g, pool.x0 - o1, pool.x1 + o1, pool.z0 - o1, pool.z0 - o0, yw, mats.wet, span, { cast: false });
  flatRect(g, pool.x0 - o1, pool.x1 + o1, pool.z1 + o0, pool.z1 + o1, yw, mats.wet, span, { cast: false });
  flatRect(g, pool.x0 - o1, pool.x0 - o0, pool.z0, pool.z1, yw, mats.wet, span, { cast: false });
  flatRect(g, pool.x1 + o0, pool.x1 + o1, pool.z0, pool.z1, yw, mats.wet, span, { cast: false });

  const ch = 0.07;
  const cy = 0.05;
  const cw = 0.26;
  box(g, pool.x1 - pool.x0 + cw, ch, cw, mats.coping, 0, cy, pool.z0);
  box(g, stair.x0 - pool.x0 + cw * 0.4, ch, cw, mats.coping, (pool.x0 + stair.x0) / 2 - 0.02, cy, pool.z1);
  box(g, pool.x1 - stair.x1 + cw * 0.4, ch, cw, mats.coping, (stair.x1 + pool.x1) / 2 + 0.02, cy, pool.z1);
  const sideLen = pool.z1 - pool.z0 - cw;
  box(g, cw, ch, sideLen, mats.coping, pool.x0, cy, (pool.z0 + pool.z1) / 2);
  box(g, cw, ch, sideLen, mats.coping, pool.x1, cy, (pool.z0 + pool.z1) / 2);
}

function buildBasin(g, F, mats) {
  const { pool, stair } = F;
  const breaks = [];
  const n = 8;
  for (let i = 0; i <= n; i++) breaks.push(pool.z0 + ((pool.z1 - pool.z0) * i) / n);
  breaks.push(stair.zNose);
  breaks.sort((a, b) => a - b);
  const zs = breaks.filter((z, i) => i === 0 || z - breaks[i - 1] > 0.02);
  for (let i = 0; i < zs.length - 1; i++) {
    const za = zs[i];
    const zb = zs[i + 1];
    const t = ((za + zb) / 2 - pool.z0) / (pool.z1 - pool.z0);
    const mat = floorBandMat(mats, Math.min(1, Math.max(0, t)));
    const inStair = za >= stair.zNose - 0.001;
    if (!inStair) slopedRect(g, F, pool.x0, pool.x1, za, zb, mat, 0.012);
    else {
      slopedRect(g, F, pool.x0, stair.x0, za, zb, mat, 0.012);
      slopedRect(g, F, stair.x1, pool.x1, za, zb, mat, 0.012);
    }
  }

  const wmat = wallMat(mats);
  const seg = 18;
  for (let i = 0; i < seg; i++) {
    const za = pool.z0 + ((pool.z1 - pool.z0) * i) / seg;
    const zb = pool.z0 + ((pool.z1 - pool.z0) * (i + 1)) / seg;
    for (const x of [pool.x0, pool.x1]) {
      addQuad(g, [
        [x, F.floorY(za), za],
        [x, F.floorY(zb), zb],
        [x, 0, zb],
        [x, 0, za],
      ], wmat, { u: 2, v: 1, span: 1, cast: false });
    }
  }
  addQuad(g, [
    [pool.x0, F.floorY(pool.z0), pool.z0],
    [pool.x1, F.floorY(pool.z0), pool.z0],
    [pool.x1, 0, pool.z0],
    [pool.x0, 0, pool.z0],
  ], wmat, { u: 0, v: 1, span: 1, cast: false });
  addQuad(g, [
    [pool.x0, F.floorY(pool.z1), pool.z1],
    [stair.x0, F.floorY(pool.z1), pool.z1],
    [stair.x0, 0, pool.z1],
    [pool.x0, 0, pool.z1],
  ], wmat, { u: 0, v: 1, span: 1, cast: false });
  addQuad(g, [
    [stair.x1, F.floorY(pool.z1), pool.z1],
    [pool.x1, F.floorY(pool.z1), pool.z1],
    [pool.x1, 0, pool.z1],
    [stair.x1, 0, pool.z1],
  ], wmat, { u: 0, v: 1, span: 1, cast: false });

  const laneW = (pool.x1 - pool.x0) / pool.lanes;
  const centers = [];
  for (let i = 0; i < pool.lanes; i++) centers.push(pool.x0 + laneW * (i + 0.5));
  const zDeepT = pool.z0 + 1.45;
  const zShallowT = pool.z1 - 1.45;
  centers.forEach((x, i) => {
    const zEnd = i === pool.lanes - 1 ? stair.zNose : zShallowT;
    slopedRect(g, F, x - 0.05, x + 0.05, zDeepT, zEnd, mats.lane, 0.028);
    slopedRect(g, F, x - 0.4, x + 0.4, zDeepT - 0.05, zDeepT + 0.05, mats.lane, 0.03);
    if (i !== pool.lanes - 1) {
      slopedRect(g, F, x - 0.4, x + 0.4, zShallowT - 0.05, zShallowT + 0.05, mats.lane, 0.03);
    }
    targetMark(g, F, mats, x, pool.z0 + 0.015, 1);
    if (i !== pool.lanes - 1) targetMark(g, F, mats, x, pool.z1 - 0.015, -1);
  });

  courseLines(g, F, mats);
  const midZ = (pool.z0 + pool.z1) / 2;
  box(g, 0.02, 0.07, pool.z1 - pool.z0, mats.waterline, pool.x0 + 0.012, pool.surfaceY + 0.02, midZ, { cast: false });
  box(g, 0.02, 0.07, pool.z1 - pool.z0, mats.waterline, pool.x1 - 0.012, pool.surfaceY + 0.02, midZ, { cast: false });
  box(g, pool.x1 - pool.x0, 0.07, 0.02, mats.waterline, 0, pool.surfaceY + 0.02, pool.z0 + 0.012, { cast: false });
  box(g, stair.x0 - pool.x0, 0.07, 0.02, mats.waterline, (pool.x0 + stair.x0) / 2, pool.surfaceY + 0.02, pool.z1 - 0.012, { cast: false });
}

function targetMark(g, F, mats, x, z, dir) {
  const y0 = F.floorY(z) + 0.28;
  const y1 = F.pool.surfaceY - 0.16;
  if (y1 - y0 < 0.2) return;
  const zc = z + dir * 0.01;
  box(g, 0.08, y1 - y0, 0.012, mats.lane, x, (y0 + y1) / 2, zc, { cast: false });
  box(g, 0.42, 0.08, 0.012, mats.lane, x, y1 - 0.02, zc, { cast: false });
}

function courseLines(g, F, mats) {
  const { pool, stair } = F;
  const ys = [-0.42, -0.84, -1.26, -1.7];
  for (const y of ys) {
    if (y <= F.yDeep + 0.04) continue;
    let zEnd = pool.z1;
    if (y < F.yShallow) {
      const t = (y - F.yDeep) / (F.yShallow - F.yDeep);
      zEnd = pool.z0 + t * (pool.z1 - pool.z0);
    }
    if (zEnd - pool.z0 < 0.25) continue;
    const len = zEnd - pool.z0;
    const zc = (pool.z0 + zEnd) / 2;
    box(g, 0.016, 0.02, len, mats.waterline, pool.x0 + 0.014, y, zc, { cast: false });
    box(g, 0.016, 0.02, len, mats.waterline, pool.x1 - 0.014, y, zc, { cast: false });
    if (y > F.yDeep + 0.05) {
      box(g, pool.x1 - pool.x0, 0.02, 0.016, mats.waterline, 0, y, pool.z0 + 0.014, { cast: false });
    }
    if (y > F.yShallow + 0.02) {
      box(g, stair.x0 - pool.x0, 0.02, 0.016, mats.waterline, (pool.x0 + stair.x0) / 2, y, pool.z1 - 0.014, { cast: false });
    }
  }
}

function buildWater(g, F, mats) {
  const { pool } = F;
  const inset = 0.05;
  const w = pool.x1 - pool.x0 - inset * 2;
  const d = pool.z1 - pool.z0 - inset * 2;
  const geo = new THREE.PlaneGeometry(w, d, 36, 42);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const wave = Math.sin(x * 1.55 + z * 0.48) * 0.01 + Math.sin(z * 2.05 - x * 0.35) * 0.006;
    pos.setY(i, wave);
  }
  geo.computeVertexNormals();
  geo.translate((pool.x0 + pool.x1) / 2, pool.surfaceY, (pool.z0 + pool.z1) / 2);
  const mat = toon('#2f9aab', {
    transparent: true,
    opacity: pool.waterOpacity ?? 0.4,
    side: THREE.DoubleSide,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.userData.castShadow = false;
  mesh.userData.receiveShadow = false;
  mesh.name = 'water';
  g.add(mesh);
}

function buildRopes(g, F, mats) {
  const { pool } = F;
  const laneW = (pool.x1 - pool.x0) / pool.lanes;
  const xs = [pool.x0 + 0.16];
  for (let i = 1; i < pool.lanes; i++) xs.push(pool.x0 + i * laneW);
  xs.push(pool.x1 - 0.16);
  const accents = [mats.sage, mats.clay, mats.cream, mats.sage];
  const zA = pool.z0 + 0.18;
  const zB = pool.z1 - 0.18;
  xs.forEach((x, ri) => {
    const buckets = [[], []];
    let i = 0;
    for (let z = zA; z <= zB; z += 0.28) {
      const radius = i % 2 ? 0.05 : 0.044;
      const geo = new THREE.SphereGeometry(radius, 8, 6);
      geo.translate(x, pool.surfaceY + 0.012 + (i % 3) * 0.002, z);
      buckets[i % 2].push(geo);
      i++;
    }
    [mats.cream, accents[ri % accents.length]].forEach((mat, k) => {
      if (!buckets[k].length) return;
      const mesh = new THREE.Mesh(mergeGeometries(buckets[k]), mat);
      mesh.userData.castShadow = true;
      g.add(mesh);
    });
    const cable = new THREE.Mesh(
      new THREE.CylinderGeometry(0.008, 0.008, zB - zA, 6),
      mats.rod
    );
    cable.rotation.x = Math.PI / 2;
    cable.position.set(x, pool.surfaceY + 0.004, (zA + zB) / 2);
    cable.userData.castShadow = false;
    g.add(cable);
    box(g, 0.08, 0.08, 0.06, mats.metal, x, pool.surfaceY, pool.z0 + 0.04, { cast: false });
    box(g, 0.08, 0.08, 0.06, mats.metal, x, pool.surfaceY, pool.z1 - 0.04, { cast: false });
  });
}

function buildStairs(g, F, mats) {
  const { pool, stair, floorY } = F;
  for (let i = 0; i < stair.steps; i++) {
    const zBack = pool.z1 - i * stair.run + 0.015;
    const zFront = pool.z1 - (i + 1) * stair.run;
    const yTop = pool.surfaceY - 0.06 - i * stair.rise;
    const yBot = Math.min(floorY(zFront), floorY(zBack)) - 0.18;
    const h = yTop - yBot;
    const depth = Math.abs(zBack - zFront);
    box(
      g,
      stair.x1 - stair.x0,
      h,
      depth,
      mats.step,
      (stair.x0 + stair.x1) / 2,
      yBot + h / 2,
      (zFront + zBack) / 2
    );
    box(
      g,
      stair.x1 - stair.x0,
      0.022,
      0.04,
      mats.coping,
      (stair.x0 + stair.x1) / 2,
      yTop - 0.01,
      zFront + 0.01,
      { cast: false }
    );
  }
  const topZ = pool.z1 + 0.24;
  const botZ = stair.zNose + 0.08;
  const topY = 0.86;
  const botY = pool.surfaceY - 0.06 - (stair.steps - 1) * stair.rise + 0.58;
  for (const x of [stair.x0 + 0.07, stair.x1 - 0.07]) {
    rod(g, [x, topY, topZ], [x, botY, botZ], 0.018, mats.metal);
    rod(g, [x, 0.02, topZ], [x, topY, topZ], 0.016, mats.metal);
    rod(g, [x, botY - 0.5, botZ], [x, botY, botZ], 0.016, mats.metal);
  }
}

function buildLadder(g, F, mats) {
  const { pool, floorY } = F;
  const x = pool.x0 + 0.58;
  const z = pool.z0 + 0.2;
  const y0 = floorY(pool.z0) + 0.18;
  const y1 = 0.7;
  for (const dx of [-0.16, 0.16]) {
    rod(g, [x + dx, y0, z], [x + dx, y1, z], 0.018, mats.metal);
    rod(g, [x + dx, 0.02, pool.z0 - 0.22], [x + dx, y1, pool.z0 - 0.22], 0.018, mats.metal);
    rod(g, [x + dx, y1 - 0.04, pool.z0 - 0.22], [x + dx, y1 - 0.04, z], 0.016, mats.metal);
  }
  for (let y = y0 + 0.28; y < -0.05; y += 0.28) {
    rod(g, [x - 0.16, y, z], [x + 0.16, y, z], 0.012, mats.metal);
  }
}

function addMullionRun(g, mats, axis, fixed, a0, a1, y0, y1, inward) {
  const step = 1.16;
  for (let a = a0; a <= a1 + 0.01; a += step) {
    if (a < a0 - 0.02 || a > a1 + 0.02) continue;
    if (axis === 'x') {
      box(g, 0.045, y1 - y0, 0.055, mats.mullion, a, (y0 + y1) / 2, fixed + inward * 0.03);
    } else {
      box(g, 0.055, y1 - y0, 0.045, mats.mullion, fixed + inward * 0.03, (y0 + y1) / 2, a);
    }
  }
  const ym = y0 + (y1 - y0) * 0.48;
  if (axis === 'x') {
    box(g, a1 - a0, 0.04, 0.05, mats.mullion, (a0 + a1) / 2, ym, fixed + inward * 0.03);
  } else {
    box(g, 0.05, 0.04, a1 - a0, mats.mullion, fixed + inward * 0.03, ym, (a0 + a1) / 2);
  }
}

function addGlassRun(g, mats, axis, fixed, a0, a1, y0, y1) {
  const step = 1.16;
  for (let a = a0 + 0.04; a < a1 - 0.05; a += step) {
    const a2 = Math.min(a + step - 0.08, a1 - 0.04);
    if (a2 - a < 0.18) continue;
    const corners = axis === 'x'
      ? [[a, y0, fixed], [a2, y0, fixed], [a2, y1, fixed], [a, y1, fixed]]
      : [[fixed, y0, a], [fixed, y0, a2], [fixed, y1, a2], [fixed, y1, a]];
    addQuad(g, corners, mats.glass, {
      u: axis === 'x' ? 0 : 2,
      v: 1,
      span: 1.4,
      cast: false,
      receive: false,
    });
  }
}

function buildWalls(g, F, mats) {
  const { room, niche } = F;
  const door = { x0: 2.25, x1: 3.35, h: 2.16 };
  const segs = [[room.x0, door.x0], [door.x1, room.x1]];
  for (const [a, b] of segs) {
    box(g, b - a, DADO, 0.12, mats.dado, (a + b) / 2, DADO / 2, room.z0 - 0.06);
    box(g, b - a, 0.06, 0.08, mats.dadoCap, (a + b) / 2, DADO, room.z0 - 0.02);
    box(g, b - a, 0.07, 0.14, mats.timber, (a + b) / 2, DADO + 0.02, room.z0 + 0.05);
    addGlassRun(g, mats, 'x', room.z0 - 0.02, a, b, DADO + 0.08, GLASS_TOP);
    addMullionRun(g, mats, 'x', room.z0, a, b, DADO + 0.06, GLASS_TOP, 1);
  }
  box(g, 0.08, door.h, 0.1, mats.timberDark, door.x0, door.h / 2, room.z0 + 0.02);
  box(g, 0.08, door.h, 0.1, mats.timberDark, door.x1, door.h / 2, room.z0 + 0.02);
  box(g, door.x1 - door.x0, 0.08, 0.1, mats.timberDark, (door.x0 + door.x1) / 2, door.h, room.z0 + 0.02);
  box(g, door.x1 - door.x0 - 0.12, door.h - 0.1, 0.04, mats.ink, (door.x0 + door.x1) / 2, door.h / 2 - 0.02, room.z0 + 0.04, { cast: false });
  addGlassRun(g, mats, 'x', room.z0 - 0.01, door.x0 + 0.08, door.x1 - 0.08, door.h * 0.62, door.h - 0.12);
  addGlassRun(g, mats, 'x', room.z0 - 0.02, door.x0, door.x1, door.h + 0.06, GLASS_TOP);

  const leftSegs = [[room.z0, niche.z0], [niche.z1, room.z1]];
  for (const [a, b] of leftSegs) {
    box(g, 0.12, DADO, b - a, mats.dado, room.x0 - 0.06, DADO / 2, (a + b) / 2);
    box(g, 0.08, 0.06, b - a, mats.dadoCap, room.x0 - 0.02, DADO, (a + b) / 2);
    box(g, 0.14, 0.07, b - a, mats.timber, room.x0 + 0.04, DADO + 0.02, (a + b) / 2);
    addGlassRun(g, mats, 'z', room.x0 - 0.02, a, b, DADO + 0.08, GLASS_TOP);
    addMullionRun(g, mats, 'z', room.x0, a, b, DADO + 0.06, GLASS_TOP, 1);
  }
  addGlassRun(g, mats, 'z', room.x0 - 0.02, niche.z0, niche.z1, niche.h + 0.08, GLASS_TOP);
  addMullionRun(g, mats, 'z', room.x0, niche.z0, niche.z1, niche.h + 0.06, GLASS_TOP, 1);
  box(g, room.x1 - room.x0, 0.08, 0.1, mats.timber, 0, GLASS_TOP + 0.02, room.z0 + 0.02);

  const z = room.z0 + 0.05;
  const T = F.trusses;
  addQuad(g, [
    [T.xL, GLASS_TOP, z],
    [T.xL, T.yEave, z],
    [0, T.yRidge, z],
    [0, GLASS_TOP, z],
  ], mats.glass, { cast: false, receive: false, u: 0, v: 1, span: 1.4 });
  addQuad(g, [
    [0, GLASS_TOP, z],
    [0, T.yRidge, z],
    [T.xR, T.yEave, z],
    [T.xR, GLASS_TOP, z],
  ], mats.glass, { cast: false, receive: false, u: 0, v: 1, span: 1.4 });
  beam(g, [T.xL, T.yEave, z], [0, T.yRidge, z], 0.08, 0.06, mats.timber);
  beam(g, [0, T.yRidge, z], [T.xR, T.yEave, z], 0.08, 0.06, mats.timber);

  addQuad(g, [
    [room.x0 - 1.4, -0.2, room.z0 - 0.55],
    [room.x1 + 0.6, -0.2, room.z0 - 0.55],
    [room.x1 + 0.6, room.H + 0.2, room.z0 - 0.55],
    [room.x0 - 1.4, room.H + 0.2, room.z0 - 0.55],
  ], mats.sky, { cast: false, receive: false, span: 4 });
  addQuad(g, [
    [F.niche.x0 - 0.45, -0.2, room.z0 - 0.2],
    [F.niche.x0 - 0.45, -0.2, room.z1 + 0.2],
    [F.niche.x0 - 0.45, room.H, room.z1 + 0.2],
    [F.niche.x0 - 0.45, room.H, room.z0 - 0.2],
  ], mats.sky, { cast: false, receive: false, span: 4 });
}

function buildNiche(g, F, mats) {
  const { niche, room, trusses: T } = F;
  const xIn = T.xL + 0.02;
  box(g, 0.1, niche.h, niche.z1 - niche.z0, mats.dado, niche.x0, niche.h / 2, (niche.z0 + niche.z1) / 2);
  const depth = xIn - niche.x0;
  box(g, depth, niche.h, 0.1, mats.dado, (niche.x0 + xIn) / 2, niche.h / 2, niche.z0);
  box(g, depth, niche.h, 0.1, mats.dado, (niche.x0 + xIn) / 2, niche.h / 2, niche.z1);
  for (let z = niche.z0 + 0.16; z < niche.z1 - 0.1; z += 0.16) {
    box(g, 0.018, niche.h - 0.28, 0.07, mats.nicheWood, niche.x0 + 0.07, niche.h / 2, z, { cast: false });
  }
  beam(g, [T.xL, niche.h, niche.z0], [T.xL, niche.h, niche.z1], 0.12, 0.1, mats.timber);
  box(
    g,
    room.x0 - niche.x0,
    0.05,
    niche.z1 - niche.z0,
    mats.timberDark,
    (niche.x0 + room.x0) / 2,
    niche.h + 0.02,
    (niche.z0 + niche.z1) / 2
  );
  for (let z = niche.z0 + 0.12; z < niche.z1 - 0.05; z += 0.2) {
    beam(g, [niche.x0 + 0.1, niche.h - 0.08, z], [room.x0 - 0.04, niche.h - 0.08, z], 0.035, 0.09, mats.nicheWood);
  }
  for (let i = 0; i < 7; i++) {
    box(g, 0.045, 1.55, 0.04, mats.nicheWood, room.x0 + 0.18 + i * 0.1, 0.78, niche.z1 + 0.04);
  }
}

function buildRoof(g, F, mats) {
  const { room, trusses: T } = F;
  for (const z of T.z) {
    // Posts stay on the glazed side. The +X side is the cutaway, so those posts are omitted.
    box(g, 0.14, T.yBot, 0.14, mats.timber, T.xL, T.yBot / 2, z);
    const xL = T.xL;
    const xR = T.xR;
    const yb = T.yBot;
    beam(g, [xL, yb, z], [xR, yb, z], 0.09, 0.07, mats.timber);
    const yL = roofY(T, xL) - 0.08;
    const yR = roofY(T, xR) - 0.08;
    const yM = roofY(T, 0) - 0.08;
    beam(g, [xL, yL, z], [0, yM, z], 0.08, 0.07, mats.timber);
    beam(g, [0, yM, z], [xR, yR, z], 0.08, 0.07, mats.timber);
    beam(g, [0, yb, z], [0, yM, z], 0.07, 0.06, mats.timber);
    const qL = xL * 0.48;
    const qR = xR * 0.48;
    beam(g, [qL, yb, z], [qL, roofY(T, qL) - 0.08, z], 0.05, 0.045, mats.timber);
    beam(g, [qR, yb, z], [qR, roofY(T, qR) - 0.08, z], 0.05, 0.045, mats.timber);
    rod(g, [xL, yL, z], [qL, yb, z], 0.015, mats.rod);
    rod(g, [qL, yb, z], [0, yM, z], 0.015, mats.rod);
    rod(g, [0, yM, z], [qR, yb, z], 0.015, mats.rod);
    rod(g, [qR, yb, z], [xR, yR, z], 0.015, mats.rod);
  }
  beam(
    g,
    [0, T.yRidge - 0.11, room.z0 + 0.15],
    [0, T.yRidge - 0.11, room.z1 - 0.45],
    0.1,
    0.08,
    mats.timber
  );
  beam(g, [T.xL, T.yBot, T.z[0]], [T.xL, T.yBot, T.z[T.z.length - 1]], 0.1, 0.08, mats.timber);
  beam(g, [T.xR, T.yBot, T.z[0]], [T.xR, T.yBot, T.z[T.z.length - 1]], 0.1, 0.08, mats.timber);
  beam(g, [T.xR, T.yEave - 0.06, T.z[0]], [T.xR, T.yEave - 0.06, T.z[T.z.length - 1]], 0.08, 0.07, mats.timber);
  for (const x of [-3.15, -1.55, 1.55, 3.15]) {
    const y = roofY(T, x) - 0.18;
    beam(g, [x, y, T.roofCutZ + 0.15], [x, y, room.z1 - 0.4], 0.05, 0.07, mats.timber);
  }
  const z0 = room.z0 - 0.15;
  const z1 = T.roofCutZ;
  const xCut = T.roofCutX;
  addPrism(g, [
    [room.x0 - 0.05, roofY(T, room.x0), z0],
    [0, roofY(T, 0), z0],
    [0, roofY(T, 0), z1],
    [room.x0 - 0.05, roofY(T, room.x0), z1],
  ], 0.05, mats.roof);
  addPrism(g, [
    [0, roofY(T, 0), z0],
    [xCut, roofY(T, xCut), z0],
    [xCut, roofY(T, xCut), z1],
    [0, roofY(T, 0), z1],
  ], 0.05, mats.roof);
}

function buildFixtures(g, F, mats) {
  const { pool } = F;
  const spots = [
    [pool.x0 + 0.06, -0.62, -3.2],
    [pool.x0 + 0.06, -0.62, 0.4],
    [pool.x1 - 0.06, -0.55, -2.2],
    [pool.x1 - 0.06, -0.5, 1.6],
  ];
  for (const [x, y, z] of spots) {
    box(g, 0.04, 0.08, 0.42, mats.fixture, x, y, z, { cast: false, receive: false });
  }
  box(g, 0.12, 0.08, 0.12, mats.sconce, F.niche.x0 + 0.12, 1.85, 1.8, { cast: false, receive: false });
}

function buildMarkers(g, F, mats) {
  const { pool, room } = F;
  flatPlaque(g, '1.2', 'METRES', 1.02, 5.25, 0.5, 0.32);
  flatPlaque(g, '1.9', 'METRES', 3.15, -6.45, 0.5, 0.32);
  wallPlaque(g, '1.9', 'METRES', 0.15, 0.78, room.z0 + 0.06, 0, 0.52, 0.34);
  const laneW = (pool.x1 - pool.x0) / pool.lanes;
  for (let i = 0; i < pool.lanes; i++) {
    const x = pool.x0 + laneW * (i + 0.5);
    flatPlaque(g, String(i + 1), 'LANE', x, pool.z0 - 0.48, 0.28, 0.2);
  }
  const face = new THREE.Mesh(new THREE.CircleGeometry(0.3, 28), mats.clock);
  face.position.set(-1.65, 0.82, room.z0 + 0.07);
  face.userData.castShadow = false;
  g.add(face);
  const rim = new THREE.Mesh(new THREE.RingGeometry(0.3, 0.36, 28), mats.ink);
  rim.position.set(-1.65, 0.82, room.z0 + 0.075);
  rim.userData.castShadow = false;
  g.add(rim);
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const len = i % 3 === 0 ? 0.07 : 0.04;
    box(
      g,
      0.018,
      len,
      0.01,
      mats.ink,
      -1.65 + Math.sin(a) * 0.24,
      0.82 + Math.cos(a) * 0.24,
      room.z0 + 0.08,
      { cast: false, rotZ: -a }
    );
  }
  const hands = new THREE.Group();
  hands.position.set(-1.65, 0.82, room.z0 + 0.09);
  const minutePivot = new THREE.Group();
  minutePivot.rotation.z = 0.7;
  box(minutePivot, 0.016, 0.2, 0.008, mats.ink, 0, 0.1, 0, { cast: false });
  hands.add(minutePivot);
  const hourPivot = new THREE.Group();
  hourPivot.rotation.z = -1.05;
  box(hourPivot, 0.022, 0.13, 0.008, mats.ink, 0, 0.065, 0, { cast: false });
  hands.add(hourPivot);
  g.add(hands);
  box(g, 0.04, 0.04, 0.012, mats.ring, -1.65, 0.82, room.z0 + 0.095, { cast: false });

  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.032, 8, 18), mats.ring);
  ring.rotation.y = Math.PI / 2;
  ring.position.set(room.x0 + 0.08, 1.12, -2.35);
  g.add(ring);
  const ring2 = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.018, 6, 14), mats.cream);
  ring2.rotation.y = Math.PI / 2;
  ring2.position.set(room.x0 + 0.09, 1.12, -2.35);
  ring2.userData.castShadow = false;
  g.add(ring2);
}

function flatPlaque(parent, text, sub, x, z, w, h) {
  const mat = toon('#ffffff', {
    map: labelTexture(text, sub),
    polygonOffset: true,
    polygonOffsetFactor: -4,
    polygonOffsetUnits: -4,
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set(x, 0.022, z);
  mesh.userData.castShadow = false;
  parent.add(mesh);
}

function wallPlaque(parent, text, sub, x, y, z, rotY, w, h) {
  const mat = toon('#ffffff', { map: labelTexture(text, sub) });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
  mesh.position.set(x, y, z);
  mesh.rotation.y = rotY;
  mesh.userData.castShadow = false;
  parent.add(mesh);
}

function buildArchitecture(parent, layout) {
  const F = frameOf(layout);
  const mats = makeMats();
  buildDeck(group(parent, 'deck'), F, mats);
  buildBasin(group(parent, 'basin'), F, mats);
  buildWater(group(parent, 'water'), F, mats);
  buildRopes(group(parent, 'ropes'), F, mats);
  buildStairs(group(parent, 'stairs'), F, mats);
  buildLadder(group(parent, 'ladder'), F, mats);
  buildWalls(group(parent, 'walls'), F, mats);
  buildNiche(group(parent, 'niche'), F, mats);
  buildRoof(group(parent, 'roof'), F, mats);
  buildFixtures(group(parent, 'fixtures'), F, mats);
  buildMarkers(group(parent, 'markers'), F, mats);
  parent.userData.frame = F;
}

function hangTowel(parent, x, y, z, h, color) {
  const cloth = toon(color);
  addBox(parent, 0.07, 0.035, 0.3, cloth, x + 0.04, y, z);
  addBox(parent, 0.02, h, 0.28, cloth, x + 0.05, y - h / 2, z + 0.01);
}

function towelStack(parent, x, y, z, rotY) {
  const grp = new THREE.Group();
  ['#1b3944', '#f3eee4', '#c9d5cc'].forEach((c, i) => {
    const m = addBox(grp, 0.34, 0.038, 0.36, toon(c), 0, i * 0.038, 0);
    m.rotation.y = (i - 1) * 0.05;
  });
  grp.position.set(x, y, z);
  grp.rotation.y = rotY;
  parent.add(grp);
}

function drape(parent, x, y, z, rotY) {
  const grp = new THREE.Group();
  const cloth = toon('#f3eee4');
  addBox(grp, 0.38, 0.025, 0.42, cloth, 0, 0, 0);
  addBox(grp, 0.36, 0.3, 0.02, cloth, 0, -0.15, 0.2);
  grp.position.set(x, y, z);
  grp.rotation.y = rotY;
  parent.add(grp);
}

function foliage(parent, x, z, seed) {
  const stem = addCyl(parent, 0.018, 0.026, 0.16, toon('#3d5344'), x, 0.3, z, 7);
  stem.userData.castShadow = true;
  const cols = ['#2c6b58', '#3d7d64', '#245848', '#4e9074'];
  const blobs = [
    [0, 0.46, 0, 0.2, 0.14, 0.18],
    [0.07, 0.56, -0.03, 0.14, 0.11, 0.13],
    [-0.06, 0.52, 0.05, 0.13, 0.1, 0.12],
  ];
  blobs.forEach((b, i) => {
    const m = addBox(parent, b[3], b[4], b[5], toon(cols[(i + seed) % cols.length]), x + b[0], b[1], z + b[2]);
    m.rotation.y = seed + i * 0.6;
  });
}

function leanBoard(parent, x, z, color, tilt) {
  const grp = new THREE.Group();
  grp.position.set(x, 0, z);
  grp.rotation.x = tilt;
  addBox(grp, 0.4, 0.56, 0.03, toon(color), 0, 0.28, 0);
  parent.add(grp);
}

function buildDressing(parent, layout) {
  const F = frameOf(layout);
  const { niche, room } = F;
  hangTowel(parent, niche.x0 + 0.08, 1.58, 1.55, 0.62, '#1b3944');
  hangTowel(parent, niche.x0 + 0.08, 1.58, 1.92, 0.78, '#f3eee4');
  hangTowel(parent, niche.x0 + 0.08, 1.58, 2.28, 0.5, '#c56d5c');
  for (const z of [1.55, 1.92, 2.28]) {
    const peg = addCyl(parent, 0.012, 0.012, 0.11, toon('#d5dbd8'), niche.x0 + 0.08, 1.6, z, 8);
    peg.rotation.z = Math.PI / 2;
  }
  const mirror = new THREE.Mesh(new THREE.PlaneGeometry(0.46, 0.62), toon('#d5e7ea'));
  mirror.position.set(niche.x0 + 0.08, 1.28, 2.55);
  mirror.rotation.y = Math.PI / 2;
  mirror.userData.castShadow = false;
  parent.add(mirror);
  box(parent, 0.03, 0.7, 0.54, toon('#8d6840'), niche.x0 + 0.065, 1.28, 2.55, { cast: false });

  const grate = new THREE.Mesh(new THREE.PlaneGeometry(0.36, 0.36), toon('#ffffff', { map: grateTexture() }));
  grate.rotation.x = -Math.PI / 2;
  grate.position.set(-5.15, 0.02, 1.35);
  grate.userData.castShadow = false;
  parent.add(grate);

  const sandals = new THREE.Group();
  addBox(sandals, 0.1, 0.028, 0.24, toon('#cbb89a'), -0.07, 0.02, 0);
  addBox(sandals, 0.1, 0.028, 0.24, toon('#cbb89a'), 0.07, 0.02, 0);
  sandals.position.set(-5.15, 0, 2.45);
  sandals.rotation.y = 0.4;
  parent.add(sandals);

  towelStack(parent, -1.55, 0.48, 6.45, 1.5708);
  drape(parent, 0.45, 0.49, 5.95, 1.48);
  towelStack(parent, -5.62, 0.48, 2.35, 0.1);

  for (const inst of layout.instances || []) {
    if (inst.kind === 'flowerpot') {
      foliage(parent, inst.position[0], inst.position[2], inst.position[0] < -3.7 ? 0 : 1);
    }
  }

  leanBoard(parent, -3.72, -6.95, '#d7e6e1', -0.26);
  leanBoard(parent, -3.22, -7.0, '#2a6f7c', -0.32);
  leanBoard(parent, -2.72, -6.93, '#d5ddd4', -0.2);

  box(parent, 0.62, 0.32, 0.42, toon('#8d6840'), 3.85, 0.16, -6.5);
  box(parent, 0.66, 0.04, 0.46, toon('#c4a36e'), 3.85, 0.34, -6.5);
  const roller = addCyl(parent, 0.07, 0.07, 0.55, toon('#d7e6e1'), 3.85, 0.44, -6.5, 10);
  roller.rotation.z = Math.PI / 2;

  const pole = addCyl(parent, 0.018, 0.02, 2.35, toon('#d7c7a4'), room.x0 + 0.42, 1.05, -6.7, 8);
  pole.rotation.z = 0.22;
  pole.rotation.x = 0.08;

  box(parent, 0.16, 0.08, 0.16, toon('#4d5c57'), -2.05, 3.64, 6.8, { cast: false });
  box(parent, 0.16, 0.08, 0.16, toon('#4d5c57'), 1.65, 3.64, 4.8, { cast: false });

  const shelfStack = new THREE.Group();
  addBox(shelfStack, 0.28, 0.035, 0.22, toon('#1b3944'), 0, 0.42, 0);
  addBox(shelfStack, 0.26, 0.035, 0.2, toon('#f3eee4'), 0.02, 0.46, 0.01);
  addBox(shelfStack, 0.24, 0.03, 0.18, toon('#c9d5cc'), 0, 0.78, 0);
  shelfStack.position.set(-5.48, 0, 1.05);
  parent.add(shelfStack);
}

function decoratePrototype(kind, root) {
  if (kind !== 'pendant_lamp') return;
  root.traverse((obj) => {
    if (!obj.isMesh || obj.name !== 'bulb') return;
    const m = obj.material.clone();
    m.color = new THREE.Color('#fff2d4');
    m.emissive = new THREE.Color('#ffc98a');
    m.emissiveIntensity = 0.9;
    obj.material = m;
  });
}

boot({
  makeShell: (layout) => {
    const g = new THREE.Group();
    g.name = 'shell';
    buildArchitecture(g, layout);
    return g;
  },
  makeProcedural: (layout) => {
    const g = new THREE.Group();
    g.name = 'procedural';
    buildDressing(g, layout);
    return g;
  },
  decoratePrototype,
  readyText: 'ready — indoor swimming hall · drag orbit · U unlit · T toon',
});
