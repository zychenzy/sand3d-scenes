import * as THREE from 'three';
import { toon } from './scene_lib.js';
import {
  WATER_Y, POND, BRIDGE, BENCH, SHELTER, LANTERN, PLANTS, REEDS, IRIS, MOSS, FERNS, BAMBOO,
  BOULDERS, KOI, LILIES, PATH_MAIN, PATH_TEA, PATH_STONES,
  pondSDF, pondDepth, terrainHeight, bridgePoint, bridgeSpan, bridgeAxis, pileSpec,
  steppingStones, stonePlacement, shoreRocks, abutmentRocks, pebbles,
  benchYaw, mulberry32, clamp,
} from './garden_geom.js';

const _mats = new Map();
function mat(color, opts = {}) {
  const key = `${color}|${opts.side || ''}|${opts.opacity ?? ''}|${opts.vertexColors ? 1 : 0}|${opts.flatShading ? 1 : 0}|${opts.depthWrite === false ? 0 : 1}|${opts.transparent ? 1 : 0}`;
  if (!_mats.has(key)) _mats.set(key, toon(color, opts));
  return _mats.get(key);
}

const TIMBER = ['#6b4632', '#7a5340', '#5c3d2c', '#8a6248', '#4e3426'];
const BARK = mat('#5a4032');
const BARK_DARK = mat('#3f2e24');

function add(parent, mesh, { cast = true, receive = true } = {}) {
  if (!cast) mesh.userData.noCast = true;
  if (!receive) mesh.userData.noReceive = true;
  parent.add(mesh);
  return mesh;
}

function asFlat(geo) {
  const out = geo.index ? geo.toNonIndexed() : geo;
  out.computeVertexNormals();
  return out;
}

function hashString(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

function tintHeight(geo, topHex, bottomHex) {
  geo.computeBoundingBox();
  const minY = geo.boundingBox.min.y;
  const maxY = geo.boundingBox.max.y;
  const top = new THREE.Color(topHex);
  const bottom = new THREE.Color(bottomHex);
  const pos = geo.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) {
    const t = clamp((pos.getY(i) - minY) / (maxY - minY || 1), 0, 1);
    const c = bottom.clone().lerp(top, t * t);
    colors[i * 3] = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  return geo;
}

function rockGeometry(seed, radius, flatness, jagged) {
  const detail = radius > 0.5 ? 1 : 1;
  const geo = new THREE.IcosahedronGeometry(1, detail);
  const pos = geo.attributes.position;
  const rng = mulberry32(seed >>> 0);
  const lobes = [];
  for (let i = 0; i < 6; i++) {
    const v = new THREE.Vector3(rng() * 2 - 1, (rng() * 2 - 1) * 0.55, rng() * 2 - 1).normalize();
    lobes.push({ v, amp: 0.16 + rng() * jagged * 0.85, p: 1.4 + rng() * 2.2 });
  }
  for (let i = 0; i < pos.count; i++) {
    const n = new THREE.Vector3(pos.getX(i), pos.getY(i), pos.getZ(i)).normalize();
    let d = 1;
    for (const L of lobes) {
      const infl = Math.max(0, n.dot(L.v));
      d += Math.pow(infl, L.p) * L.amp;
    }
    pos.setXYZ(i, n.x * d * radius, n.y * d * radius * flatness, n.z * d * radius);
  }
  geo.computeVertexNormals();
  return geo;
}

function placeRock(parent, spec) {
  const radius = spec.radius ?? spec.r ?? 0.2;
  const flatness = spec.flatness ?? 0.62;
  const jagged = spec.jagged ?? 0.4;
  let geo = rockGeometry(spec.seed || 1, radius, flatness, jagged);
  const wet = pondSDF(spec.x, spec.z) < -0.04 || spec.role === 'pebble';
  tintHeight(geo, wet ? '#7a756c' : '#948f86', wet ? '#3a403f' : '#625e57');
  if (jagged > 0.55) geo = asFlat(geo);
  const mesh = new THREE.Mesh(geo, mat('#ffffff', { vertexColors: true }));
  geo.computeBoundingBox();
  const box = geo.boundingBox;
  const height = box.max.y - box.min.y;
  const sdf = pondSDF(spec.x, spec.z);
  let ground;
  let embed;
  if (spec.role === 'pebble') {
    ground = terrainHeight(spec.x, spec.z);
    embed = height * 0.22;
  } else if (sdf < -0.04) {
    ground = WATER_Y;
    embed = height * (spec.id === 'island' ? 0.12 : 0.4);
  } else {
    ground = terrainHeight(spec.x, spec.z);
    embed = height * 0.28;
  }
  mesh.position.set(spec.x, ground - embed - box.min.y, spec.z);
  mesh.rotation.y = spec.yaw || 0;
  if (spec.tilt) mesh.rotation.z = spec.tilt;
  add(parent, mesh, { cast: spec.role !== 'pebble', receive: true });
  if (!spec.id && !wet && (spec.seed % 3 === 0) && radius > 0.28 && radius < 0.45) {
    const cap = new THREE.Mesh(
      new THREE.SphereGeometry(radius * 0.46, 8, 6),
      mat('#4d6844'),
    );
    cap.scale.set(1.15, 0.28, 1);
    cap.position.set(spec.x, mesh.position.y + box.max.y * 0.72, spec.z);
    add(parent, cap, { cast: false });
  }
  return mesh;
}

function stepGeometry(seed, rx, rz, h) {
  const rng = mulberry32(seed);
  const shape = new THREE.Shape();
  const N = 8;
  for (let i = 0; i < N; i++) {
    const a = (i / N) * Math.PI * 2;
    const jag = 0.8 + rng() * 0.28;
    const x = Math.cos(a) * rx * jag;
    const y = Math.sin(a) * rz * jag;
    if (i === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: h,
    bevelEnabled: true,
    bevelThickness: Math.min(0.03, h * 0.25),
    bevelSize: Math.min(rx, rz) * 0.16,
    bevelSegments: 2,
    curveSegments: 1,
  });
  geo.rotateX(-Math.PI / 2);
  geo.computeBoundingBox();
  geo.translate(0, -geo.boundingBox.min.y, 0);
  return geo;
}

function buildSteppingStones(parent) {
  const tones = ['#a39888', '#8a8176', '#6e6860', '#b3a694', '#7a736a'];
  for (const s of steppingStones()) {
    const geo = stepGeometry(s.seed, s.rx, s.rz, s.thickness);
    const place = stonePlacement(s);
    tintHeight(geo, tones[s.i % tones.length], place.inWater ? '#4a514e' : '#6a645c');
    const mesh = new THREE.Mesh(geo, mat('#ffffff', { vertexColors: true }));
    mesh.position.set(s.x, place.y, s.z);
    mesh.rotation.y = s.yaw;
    mesh.name = `step-${s.i}`;
    add(parent, mesh);
  }
}

function terrainColor(x, z) {
  const sdf = pondSDF(x, z);
  const fog = new THREE.Color('#d5dfd6');
  let c;
  if (sdf < 0) {
    const t = clamp(pondDepth(x, z) / 0.5, 0, 1);
    c = new THREE.Color('#7b7368').lerp(new THREE.Color('#1a3336'), t);
    const n = 0.5 + 0.5 * Math.sin(x * 6.7 + z * 2.1) * Math.cos(z * 5.8);
    c.lerp(new THREE.Color('#a39888'), (1 - t) * n * 0.55);
  } else if (sdf < 0.6) {
    c = new THREE.Color('#5c6556').lerp(new THREE.Color('#73845a'), sdf / 0.6);
  } else {
    const g1 = 0.5 + 0.5 * Math.sin(x * 0.42 + z * 0.18);
    const g2 = 0.5 + 0.5 * Math.sin(x * 1.25 - z * 0.77);
    c = new THREE.Color('#5a7046').lerp(new THREE.Color('#7e8d58'), g1 * 0.7);
    c.lerp(new THREE.Color('#3c5136'), g2 * 0.32);
    for (const p of PLANTS) {
      const d = Math.hypot(x - p.x, z - p.z);
      const r = p.h * 0.34;
      if (d < r) c.lerp(new THREE.Color('#314232'), (1 - d / r) * 0.4);
    }
  }
  const dist = Math.hypot(x / 14.2, z / 12.2);
  const fade = clamp((dist - 0.84) / 0.36, 0, 1);
  c.lerp(fog, fade * fade);
  return c;
}

function buildTerrain() {
  const x0 = -16;
  const x1 = 16;
  const z0 = -15;
  const z1 = 13;
  const res = 0.34;
  const nx = Math.round((x1 - x0) / res);
  const nz = Math.round((z1 - z0) / res);
  const positions = [];
  const colors = [];
  const indices = [];
  for (let iz = 0; iz <= nz; iz++) {
    for (let ix = 0; ix <= nx; ix++) {
      const x = x0 + ix * res;
      const z = z0 + iz * res;
      const y = terrainHeight(x, z);
      positions.push(x, y, z);
      const c = terrainColor(x, z);
      colors.push(c.r, c.g, c.b);
    }
  }
  for (let iz = 0; iz < nz; iz++) {
    for (let ix = 0; ix < nx; ix++) {
      const a = iz * (nx + 1) + ix;
      const b = a + 1;
      const c = a + (nx + 1);
      const d = c + 1;
      indices.push(a, c, b, b, c, d);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  const mesh = new THREE.Mesh(geo, mat('#ffffff', { vertexColors: true }));
  mesh.name = 'terrain';
  mesh.userData.noCast = true;
  return mesh;
}

function buildWater() {
  const bb = POND.reduce((a, [x, z]) => ({
    minX: Math.min(a.minX, x), maxX: Math.max(a.maxX, x),
    minZ: Math.min(a.minZ, z), maxZ: Math.max(a.maxZ, z),
  }), { minX: Infinity, maxX: -Infinity, minZ: Infinity, maxZ: -Infinity });
  const res = 0.2;
  const positions = [];
  const colors = [];
  const indices = [];
  const shallow = new THREE.Color('#8eae96');
  const deep = new THREE.Color('#1c4248');
  function pushVert(x, z) {
    const i = positions.length / 3;
    const depth = Math.max(0, -pondSDF(x, z));
    const c = shallow.clone().lerp(deep, clamp(depth / 0.85, 0, 1));
    positions.push(x, WATER_Y, z);
    colors.push(c.r, c.g, c.b);
    return i;
  }
  function tri(ax, az, bx, bz, cx, cz) {
    const abx = bx - ax, abz = bz - az, acx = cx - ax, acz = cz - az;
    const ny = abz * acx - abx * acz;
    if (ny < 0) [bx, cx] = [cx, bx], [bz, cz] = [cz, bz];
    indices.push(pushVert(ax, az), pushVert(bx, bz), pushVert(cx, cz));
  }
  function edge(ax, az, bx, bz) {
    const da = pondSDF(ax, az);
    const db = pondSDF(bx, bz);
    const t = da / (da - db || 1e-6);
    return [ax + (bx - ax) * t, az + (bz - az) * t];
  }
  for (let x = bb.minX - res; x < bb.maxX + res; x += res) {
    for (let z = bb.minZ - res; z < bb.maxZ + res; z += res) {
      const corners = [[x, z], [x + res, z], [x + res, z + res], [x, z + res]];
      const inside = corners.map(([cx, cz]) => pondSDF(cx, cz) <= 0);
      const code = (inside[0] ? 1 : 0) | (inside[1] ? 2 : 0) | (inside[2] ? 4 : 0) | (inside[3] ? 8 : 0);
      if (code === 0) continue;
      if (code === 15) {
        tri(x, z, x + res, z, x + res, z + res);
        tri(x, z, x + res, z + res, x, z + res);
        continue;
      }
      const poly = [];
      for (let i = 0; i < 4; i++) {
        const j = (i + 1) % 4;
        if (inside[i]) poly.push(corners[i]);
        if (inside[i] !== inside[j]) poly.push(edge(...corners[i], ...corners[j]));
      }
      for (let k = 1; k < poly.length - 1; k++) tri(poly[0][0], poly[0][1], poly[k][0], poly[k][1], poly[k + 1][0], poly[k + 1][1]);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  const mesh = new THREE.Mesh(geo, mat('#ffffff', {
    vertexColors: true, transparent: true, opacity: 0.5, depthWrite: false, side: THREE.DoubleSide,
  }));
  mesh.name = 'water';
  mesh.renderOrder = 4;
  mesh.userData.noCast = true;
  mesh.userData.noReceive = true;
  return mesh;
}

export function animateGarden() {
  // Surface detail is lilies, pebbles, and depth color. Animated rings read as targets.
}

function buildLilies(parent) {
  const rng = mulberry32(70);
  for (const clump of LILIES) {
    for (let i = 0; i < clump.n; i++) {
      const a = rng() * Math.PI * 2;
      const rad = rng() * clump.spread;
      const x = clump.x + Math.cos(a) * rad;
      const z = clump.z + Math.sin(a) * rad;
      if (pondSDF(x, z) > -0.08) continue;
      const r = 0.16 + rng() * 0.14;
      const geo = new THREE.CircleGeometry(r, 8);
      const pos = geo.attributes.position;
      pos.setXY(1, pos.getX(1) * 0.22, pos.getY(1) * 0.22);
      geo.rotateX(-Math.PI / 2);
      const pad = new THREE.Mesh(geo, mat(i % 2 ? '#3f6b40' : '#568454', { side: THREE.DoubleSide }));
      pad.position.set(x, WATER_Y + 0.03, z);
      pad.rotation.y = rng() * 6;
      add(parent, pad, { cast: false });
    }
  }
}

function buildKoi(parent) {
  for (const k of KOI) {
    const geo = new THREE.SphereGeometry(0.5, 12, 8);
    const pos = geo.attributes.position;
    const colors = new Float32Array(pos.count * 3);
    const white = new THREE.Color('#f4f1e8');
    const orange = new THREE.Color('#e06a2c');
    const black = new THREE.Color('#2a2422');
    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i);
      const z = pos.getZ(i);
      const x = pos.getX(i);
      let c = orange;
      if (k.kind === 'kohaku') c = Math.sin(z * 4.2) * Math.cos(x * 3.2) > 0.05 && y > -0.15 ? orange : white;
      else if (k.kind === 'showa') {
        c = black;
        if (y > 0.02 && Math.sin(z * 5.5 + x) > 0.1) c = orange;
        if (z > 0.22) c = white;
      } else if (k.kind === 'white') c = z > 0.16 ? orange : white;
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    const body = new THREE.Mesh(geo, mat('#ffffff', { vertexColors: true }));
    body.scale.set(k.len * 0.22, k.len * 0.16, k.len);
    const g = new THREE.Group();
    g.add(body);
    const tail = new THREE.Mesh(
      new THREE.ConeGeometry(k.len * 0.09, k.len * 0.22, 4),
      mat(k.kind === 'showa' ? '#2a2422' : '#f2efe6'),
    );
    tail.rotation.x = Math.PI / 2;
    tail.position.z = -k.len * 0.48;
    g.add(tail);
    g.position.set(k.x, WATER_Y - 0.045, k.z);
    g.rotation.y = k.yaw;
    g.rotation.x = (k.len % 0.1) - 0.04;
    g.name = `koi-${k.kind}`;
    add(parent, g, { cast: false, receive: false });
    g.traverse((o) => {
      if (o.isMesh) {
        o.userData.noCast = true;
        o.userData.noReceive = true;
      }
    });
  }
}

function pathRibbon(points) {
  const curve = new THREE.CatmullRomCurve3(points.map(([x, z]) => new THREE.Vector3(x, 0, z)));
  const n = 48;
  const positions = [];
  const colors = [];
  const indices = [];
  const light = new THREE.Color('#ddd4c6');
  const dark = new THREE.Color('#b7ad9c');
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const p = curve.getPoint(t);
    const tang = curve.getTangent(t);
    const lat = new THREE.Vector3(-tang.z, 0, tang.x).normalize();
    const wl = 0.52 + 0.18 * Math.sin(t * 13.0 + 0.4);
    const wr = 0.5 + 0.16 * Math.sin(t * 17.0 + 2.2);
    const yL = terrainHeight(p.x + lat.x * wl, p.z + lat.z * wl) + 0.035;
    const yR = terrainHeight(p.x - lat.x * wr, p.z - lat.z * wr) + 0.035;
    positions.push(p.x + lat.x * wl, yL, p.z + lat.z * wl);
    positions.push(p.x - lat.x * wr, yR, p.z - lat.z * wr);
    const c = light.clone().lerp(dark, 0.35 + 0.35 * Math.sin(t * 22));
    colors.push(c.r, c.g, c.b, c.r, c.g, c.b);
  }
  for (let i = 0; i < n; i++) {
    const a = i * 2;
    indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  const mesh = new THREE.Mesh(geo, mat('#ffffff', { vertexColors: true, side: THREE.DoubleSide }));
  mesh.name = 'path';
  return mesh;
}

function orientedBox(width, height, a, b, material) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const dz = b.z - a.z;
  const len = Math.hypot(dx, dy, dz);
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, Math.max(len, 0.015)), material);
  mesh.position.set((a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2);
  const dir = new THREE.Vector3(dx, dy, dz);
  if (dir.lengthSq() > 1e-8) {
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), dir.normalize());
  }
  return mesh;
}

function buildBridge(parent) {
  const g = new THREE.Group();
  g.name = 'bridge';
  const span = bridgeSpan();
  const axis = bridgeAxis();
  const yaw = Math.atan2(axis.x, axis.z);
  const N = Math.max(16, Math.round(span / 0.16));
  const lateral = { x: -axis.z, z: axis.x };

  function deck(t, side = 0, lift = 0) {
    const p = bridgePoint(t);
    return {
      x: p.x + lateral.x * side,
      y: p.y + lift,
      z: p.z + lateral.z * side,
      top: p.y + lift,
    };
  }

  for (let i = 0; i < N; i++) {
    const t = (i + 0.5) / N;
    const p = deck(t);
    const plank = new THREE.Mesh(
      new THREE.BoxGeometry(BRIDGE.width, BRIDGE.plankT, (span / N) * 0.9),
      mat(TIMBER[i % TIMBER.length]),
    );
    plank.position.set(p.x, p.y, p.z);
    plank.rotation.y = yaw;
    add(g, plank);
  }

  const sillH = 0.08;
  const sillY = BRIDGE.deckEndY - BRIDGE.plankT / 2 - sillH / 2;
  for (const t of [0, 1]) {
    const p = bridgePoint(t);
    const sill = new THREE.Mesh(new THREE.BoxGeometry(BRIDGE.width + 0.1, sillH, 0.2), mat('#4a3124'));
    sill.position.set(p.x, sillY, p.z);
    sill.rotation.y = yaw;
    add(g, sill);
  }

  for (const side of [-1, 1]) {
    const off = side * (BRIDGE.width / 2 - 0.07);
    for (let i = 0; i < N; i++) {
      const t0 = i / N;
      const t1 = (i + 1) / N;
      const a = deck(t0, off, -BRIDGE.plankT / 2 - 0.045);
      const b = deck(t1, off, -BRIDGE.plankT / 2 - 0.045);
      add(g, orientedBox(0.07, 0.09, a, b, mat('#3f2c22')));
    }
    const edge = side * (BRIDGE.width / 2 + 0.01);
    for (let i = 0; i < N; i++) {
      const t0 = i / N;
      const t1 = (i + 1) / N;
      const a = deck(t0, edge, 0);
      const b = deck(t1, edge, 0);
      add(g, orientedBox(0.025, 0.1, a, b, mat('#5a3b2c')));
    }
  }

  const posts = [];
  const postCount = Math.max(5, Math.round(span / 0.86));
  for (let i = 0; i <= postCount; i++) {
    const t = 0.04 + 0.92 * (i / postCount);
    for (const side of [-1, 1]) {
      const off = side * (BRIDGE.width / 2 - 0.04);
      const p = deck(t, off);
      const postH = BRIDGE.railH;
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.064, postH, 0.064), mat('#5c3c2c'));
      post.position.set(p.x, p.top + postH / 2 - 0.02, p.z);
      add(g, post);
      const cap = new THREE.Mesh(new THREE.SphereGeometry(0.034, 8, 6), mat('#6e4a34'));
      cap.position.set(p.x, p.top + postH, p.z);
      add(g, cap, { cast: false });
      posts.push({ t, side, x: p.x, z: p.z, top: p.top + postH, mid: p.top + postH * 0.46 });
    }
  }
  for (const side of [-1, 1]) {
    const row = posts.filter((p) => p.side === side);
    for (let i = 0; i < row.length - 1; i++) {
      const a = row[i];
      const b = row[i + 1];
      add(g, orientedBox(0.055, 0.05, { x: a.x, y: a.top, z: a.z }, { x: b.x, y: b.top, z: b.z }, mat('#8a6244')));
      add(g, orientedBox(0.04, 0.032, { x: a.x, y: a.mid, z: a.z }, { x: b.x, y: b.mid, z: b.z }, mat('#6a4632')));
    }
  }

  const pile = pileSpec();
  const pileH = pile.top - pile.bottom;
  const pileMesh = new THREE.Mesh(new THREE.BoxGeometry(0.14, pileH, 0.14), mat('#3a2a22'));
  pileMesh.position.set(pile.x, (pile.top + pile.bottom) / 2, pile.z);
  add(g, pileMesh);
  const beam = new THREE.Mesh(new THREE.BoxGeometry(BRIDGE.width * 0.72, 0.08, 0.1), mat('#4a3124'));
  beam.position.set(pile.x, pile.top, pile.z);
  beam.rotation.y = yaw;
  add(g, beam);

  parent.add(g);
}

function buildLantern(parent) {
  const y0 = terrainHeight(LANTERN.x, LANTERN.z);
  const g = new THREE.Group();
  g.name = 'lantern';
  g.position.set(LANTERN.x, y0, LANTERN.z);
  const look = bridgePoint(0.35);
  g.rotation.y = Math.atan2(-(look.x - LANTERN.x), -(look.z - LANTERN.z));
  const stone = mat('#8c877e');
  const dark = mat('#2f3130');
  const [bw, bh, bd] = LANTERN.base;
  let y = bh / 2;
  const base = new THREE.Mesh(new THREE.BoxGeometry(bw, bh, bd), stone);
  base.position.y = y;
  add(g, base);
  y = bh + LANTERN.stemH / 2;
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(LANTERN.stemR * 0.85, LANTERN.stemR, LANTERN.stemH, 8), stone);
  stem.position.y = y;
  add(g, stem);
  y = bh + LANTERN.stemH + LANTERN.chamber[1] / 2;
  const chamber = new THREE.Mesh(new THREE.BoxGeometry(...LANTERN.chamber), stone);
  chamber.position.y = y;
  add(g, chamber);
  for (const [sx, sz] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
    const win = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.15, 0.04), dark);
    win.position.set(sx * 0.16, y, sz * 0.16);
    if (sx !== 0) win.rotation.y = Math.PI / 2;
    add(g, win, { cast: false });
  }
  y = bh + LANTERN.stemH + LANTERN.chamber[1] + LANTERN.roofH / 2;
  const roof = new THREE.Mesh(
    new THREE.CylinderGeometry(LANTERN.roofR * 0.22, LANTERN.roofR, LANTERN.roofH, 6),
    stone,
  );
  roof.position.y = y;
  add(g, roof);
  const brim = new THREE.Mesh(
    new THREE.CylinderGeometry(LANTERN.roofR * 1.05, LANTERN.roofR, 0.03, 6),
    mat('#7d7870'),
  );
  brim.position.y = y - LANTERN.roofH * 0.35;
  add(g, brim);
  const finial = new THREE.Mesh(new THREE.SphereGeometry(0.055, 8, 6), stone);
  finial.position.y = bh + LANTERN.stemH + LANTERN.chamber[1] + LANTERN.roofH + LANTERN.finialH * 0.45;
  finial.scale.y = 1.4;
  add(g, finial);
  parent.add(g);
}

function buildShelter(parent) {
  const ground = terrainHeight(BENCH.x, BENCH.z);
  const g = new THREE.Group();
  g.name = 'tea-shelter';
  g.position.set(BENCH.x, ground, BENCH.z);
  g.rotation.y = benchYaw();
  const wood = mat('#8a6244');
  const postMat = mat('#6a4a34');
  const seatY = BENCH.seatH;
  const seat = new THREE.Mesh(new THREE.BoxGeometry(BENCH.seatL, 0.045, BENCH.seatD), wood);
  seat.position.y = seatY;
  add(g, seat);
  const back = new THREE.Mesh(new THREE.BoxGeometry(BENCH.seatL * 0.92, 0.035, 0.04), wood);
  back.position.set(0, seatY + 0.2, BENCH.seatD / 2 - 0.02);
  add(g, back);
  for (const sx of [-1, 1]) {
    const stile = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.2, 0.04), postMat);
    stile.position.set(sx * (BENCH.seatL / 2 - 0.1), seatY + 0.1, BENCH.seatD / 2 - 0.02);
    add(g, stile);
  }
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.06, seatY - 0.02, 0.06), postMat);
      leg.position.set(sx * (BENCH.seatL / 2 - 0.08), (seatY - 0.02) / 2, sz * (BENCH.seatD / 2 - 0.06));
      add(g, leg);
    }
  }
  const hw = SHELTER.w / 2 - SHELTER.post / 2;
  const hd = SHELTER.d / 2 - SHELTER.post / 2;
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(SHELTER.post, SHELTER.h, SHELTER.post), postMat);
      post.position.set(sx * hw, SHELTER.h / 2, sz * hd);
      add(g, post);
    }
  }
  const slatMat = mat('#c2a36a');
  const slats = 8;
  for (let i = 0; i < slats; i++) {
    const x = -SHELTER.w / 2 + 0.12 + i * ((SHELTER.w - 0.2) / (slats - 1));
    const slat = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.03, SHELTER.d + 0.12), slatMat);
    slat.position.set(x, SHELTER.h, 0);
    add(g, slat);
  }
  const beam = new THREE.Mesh(new THREE.BoxGeometry(SHELTER.w + 0.08, 0.05, 0.06), postMat);
  beam.position.set(0, SHELTER.h - 0.02, -hd);
  add(g, beam);
  const beamB = beam.clone();
  beamB.position.z = hd;
  add(g, beamB);

  for (let i = 0; i < 7; i++) {
    const x = -0.72 + i * 0.24;
    const culm = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.014, 1.05, 5), mat('#d2c08a'));
    culm.position.set(x, 0.78, hd + 0.02);
    add(g, culm, { cast: false });
  }
  const rail = new THREE.Mesh(new THREE.BoxGeometry(1.55, 0.03, 0.03), mat('#c6b27a'));
  rail.position.set(0, 1.15, hd + 0.02);
  add(g, rail, { cast: false });

  const basin = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.2, 0.12, 8), mat('#7d7870'));
  basin.position.set(-1.05, 0.28, -0.72);
  add(g, basin);
  const water = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.03, 8), mat('#1e3a3e'));
  water.position.set(-1.05, 0.33, -0.72);
  add(g, water, { cast: false });
  const spoutPost = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.03, 0.7, 6), mat('#c6b36a'));
  spoutPost.position.set(-1.28, 0.4, -0.95);
  add(g, spoutPost);
  const spout = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.02, 0.42, 6), mat('#d2c08a'));
  spout.rotation.z = Math.PI / 2.3;
  spout.position.set(-1.12, 0.62, -0.82);
  add(g, spout);

  const hosta = mat('#3f6a40', { side: THREE.DoubleSide });
  for (let i = 0; i < 6; i++) {
    const leaf = new THREE.Mesh(new THREE.CircleGeometry(0.16, 6), hosta);
    const a = (i / 6) * Math.PI * 2;
    leaf.position.set(-0.85 + Math.cos(a) * 0.18, 0.08, 0.55 + Math.sin(a) * 0.12);
    leaf.rotation.x = -Math.PI / 2.4;
    leaf.rotation.z = a;
    add(g, leaf, { cast: false });
  }
  parent.add(g);
}

function branchMesh(parent, a, b, r0, r1, material) {
  const dir = new THREE.Vector3(b.x - a.x, b.y - a.y, b.z - a.z);
  const len = dir.length();
  if (len < 1e-3) return null;
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(Math.max(r1, 0.008), Math.max(r0, 0.01), len, 5), material);
  mesh.position.copy(a).add(b).multiplyScalar(0.5);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
  add(parent, mesh);
  return mesh;
}

const LEAF_GEO = {
  maple: null,
  simple: null,
};

function leafGeo(kind) {
  if (LEAF_GEO[kind]) return LEAF_GEO[kind];
  const lobes = kind === 'maple' ? 5 : 3;
  const w = kind === 'maple' ? 0.34 : 0.22;
  const h = kind === 'maple' ? 0.3 : 0.26;
  const n = lobes * 2;
  const positions = [0, 0, 0];
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * Math.PI * 2 - Math.PI / 2;
    const r = i % 2 === 0 ? 1 : 0.4;
    positions.push(Math.cos(a) * w * 0.5 * r, Math.sin(a) * h * 0.5 * r, 0);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  const idx = [];
  for (let i = 1; i <= n; i++) idx.push(0, i, i + 1);
  geo.setIndex(idx);
  geo.computeVertexNormals();
  LEAF_GEO[kind] = geo;
  return geo;
}

const PALETTES = {
  red: ['#9a4038', '#7d342e', '#b85a3c', '#8c4038', '#5e6a38'],
  gold: ['#8a8a3c', '#c4a15a', '#6e8438', '#a07a32', '#4e6a34'],
  green: ['#3e6a3c', '#4f7d46', '#2f5532', '#688848', '#3a5a34'],
};

function addLeaf(parent, position, normal, color, kind) {
  const leaf = new THREE.Mesh(leafGeo(kind), mat(color, { side: THREE.DoubleSide }));
  leaf.position.copy(position);
  const n = normal.clone().normalize();
  leaf.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), n);
  leaf.rotateZ(normal.x * 3 + normal.z);
  add(parent, leaf, { cast: false });
}

function buildMaple(parent, spec) {
  const rng = mulberry32(hashString(spec.id));
  const g = new THREE.Group();
  g.name = spec.id;
  g.position.set(spec.x, terrainHeight(spec.x, spec.z), spec.z);
  g.rotation.y = spec.yaw || 0;
  const trunkH = spec.h * 0.46;
  const lean = spec.lean || 0;
  const crown = new THREE.Vector3(lean * spec.h * 0.18, trunkH, 0.04);
  branchMesh(g, new THREE.Vector3(0, 0, 0), crown, spec.h * 0.035, spec.h * 0.02, BARK);
  const colors = PALETTES[spec.palette] || PALETTES.green;
  const arms = spec.palette === 'red' ? 5 : 4;
  for (let i = 0; i < arms; i++) {
    const yaw = (i / arms) * Math.PI * 2 + rng() * 0.4;
    const up = (spec.palette === 'red' ? 0.28 : 0.05) + rng() * 0.38;
    const reach = spec.h * (0.22 + rng() * 0.16);
    const tip = new THREE.Vector3(
      crown.x + Math.cos(yaw) * reach,
      crown.y + up,
      crown.z + Math.sin(yaw) * reach * (0.75 + rng() * 0.4),
    );
    branchMesh(g, crown, tip, spec.h * 0.016, spec.h * 0.008, BARK_DARK);
    const twigs = 2 + (i % 2);
    for (let t = 0; t < twigs; t++) {
      const f = 0.45 + t * 0.28;
      const origin = crown.clone().lerp(tip, f);
      const tw = origin.clone().add(new THREE.Vector3(
        Math.cos(yaw + 1.2) * reach * 0.28,
        0.25 + rng() * 0.35,
        Math.sin(yaw + 0.6) * reach * 0.28,
      ));
      branchMesh(g, origin, tw, spec.h * 0.008, 0.01, BARK_DARK);
      const stations = spec.palette === 'red' ? [origin, tw] : [origin, crown.clone().lerp(tip, 0.55), tw];
      for (const at of stations) {
        const count = spec.palette === 'red' ? 8 : 10;
        for (let L = 0; L < count; L++) {
          const dir = new THREE.Vector3(rng() * 2 - 1, 0.55 + rng() * 0.8, rng() * 2 - 1).normalize();
          const pos = at.clone().add(dir.clone().multiplyScalar(0.1 + rng() * 0.28));
          addLeaf(g, pos, dir, colors[(L + i) % colors.length], 'maple');
        }
      }
    }
  }
  if (spec.palette !== 'red') {
    for (let L = 0; L < 16; L++) {
      const dir = new THREE.Vector3(rng() * 2 - 1, 0.7 + rng() * 0.5, rng() * 2 - 1).normalize();
      addLeaf(g, crown.clone().add(dir.clone().multiplyScalar(0.15 + rng() * 0.35)), dir, colors[L % colors.length], 'maple');
    }
  }
  parent.add(g);
}

function pinePadGeometry(radius, seed) {
  const geo = new THREE.CircleGeometry(radius, 14);
  const pos = geo.attributes.position;
  const rng = mulberry32(seed);
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const rad = Math.hypot(x, y) / (radius || 1);
    const a = Math.atan2(y, x);
    const jag = i === 0 ? 1 : 0.68 + 0.3 * (0.5 + 0.5 * Math.sin(a * 5 + seed)) + rng() * 0.05;
    pos.setXYZ(i, x * jag, y * jag, (1 - rad * rad) * radius * 0.18);
  }
  geo.rotateX(-Math.PI / 2);
  geo.computeVertexNormals();
  return geo;
}

function buildPine(parent, spec) {
  const rng = mulberry32(hashString(spec.id));
  const g = new THREE.Group();
  g.name = spec.id;
  g.position.set(spec.x, terrainHeight(spec.x, spec.z), spec.z);
  g.rotation.y = spec.yaw || 0;
  const lean = (rng() - 0.5) * 0.55;
  const trunkTop = spec.h * 0.86;
  branchMesh(
    g,
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(lean, trunkTop, (rng() - 0.5) * 0.2),
    spec.h * 0.016,
    spec.h * 0.006,
    mat('#4a382c'),
  );
  const pineMat = mat('#24382c');
  const pineMat2 = mat('#3a5640');
  const tiers = spec.h > 5 ? 4 : 3;
  for (let i = 0; i < tiers; i++) {
    const t = tiers === 1 ? 0 : i / (tiers - 1);
    const y = spec.h * (0.42 + t * 0.46);
    const rad = Math.max(0.42, spec.h * (0.16 - t * 0.05));
    const ax = lean * (y / spec.h) + (rng() - 0.5) * rad * 0.4;
    const az = (rng() - 0.5) * rad * 0.35;
    const tufts = 7;
    for (let k = 0; k < tufts; k++) {
      const h = rad * (0.85 + rng() * 0.55);
      const geo = asFlat(new THREE.ConeGeometry(rad * (0.28 + rng() * 0.14), h, 5));
      const mesh = new THREE.Mesh(geo, k % 2 ? pineMat : pineMat2);
      const a = (k / tufts) * Math.PI * 2 + rng() * 0.4;
      const slide = rad * (0.05 + rng() * 0.62);
      mesh.position.set(ax + Math.cos(a) * slide, y, az + Math.sin(a) * slide * 0.7);
      mesh.rotation.z = (rng() - 0.5) * 0.45;
      mesh.rotation.x = (rng() - 0.5) * 0.4;
      add(g, mesh, { cast: false });
    }
  }
  parent.add(g);
}

function buildWillow(parent, spec) {
  const rng = mulberry32(hashString(spec.id));
  const g = new THREE.Group();
  g.name = spec.id;
  const base = terrainHeight(spec.x, spec.z);
  g.position.set(spec.x, base, spec.z);
  const crown = new THREE.Vector3(0.1, spec.h * 0.78, 0);
  branchMesh(g, new THREE.Vector3(0, 0, 0), crown, 0.09, 0.04, BARK);
  const leafMat = mat('#7ea24a', { side: THREE.DoubleSide });
  for (let c = 0; c < 5; c++) {
    const a = rng() * Math.PI * 2;
    const geo = pinePadGeometry(0.55 + rng() * 0.35, 400 + c);
    const crownPad = new THREE.Mesh(geo, mat('#6e9444', { side: THREE.DoubleSide }));
    crownPad.position.set(Math.cos(a) * 0.35, spec.h * 0.8 + rng() * 0.15, Math.sin(a) * 0.3);
    add(g, crownPad, { cast: false });
  }
  const strands = 16;
  for (let i = 0; i < strands; i++) {
    const a = (i / strands) * Math.PI * 2;
    const reach = 0.7 + rng() * 0.85;
    const p0 = crown.clone().add(new THREE.Vector3(Math.cos(a) * 0.15, 0.05, Math.sin(a) * 0.15));
    const p1 = new THREE.Vector3(Math.cos(a) * reach, spec.h * (0.35 + rng() * 0.2), Math.sin(a) * reach);
    const p2 = new THREE.Vector3(Math.cos(a) * reach * 0.85, 0.55 + rng() * 0.4, Math.sin(a) * reach * 0.9);
    let prev = p0;
    for (let s = 1; s <= 5; s++) {
      const t = s / 5;
      const u = 1 - t;
      const pt = new THREE.Vector3(
        u * u * p0.x + 2 * u * t * p1.x + t * t * p2.x,
        u * u * p0.y + 2 * u * t * p1.y + t * t * p2.y,
        u * u * p0.z + 2 * u * t * p1.z + t * t * p2.z,
      );
      branchMesh(g, prev, pt, 0.012, 0.006, mat('#6a8a48'));
      if (s > 0) {
        for (let L = 0; L < 4; L++) {
          const leaf = new THREE.Mesh(leafGeo('simple'), leafMat);
          leaf.scale.setScalar(1.7);
          leaf.position.copy(pt).add(new THREE.Vector3((rng() - 0.5) * 0.16, (rng() - 0.5) * 0.06, (rng() - 0.5) * 0.16));
          const n = new THREE.Vector3(Math.cos(a) * 0.25, -0.9, Math.sin(a) * 0.25).normalize();
          leaf.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), n);
          add(g, leaf, { cast: false });
        }
      }
      prev = pt;
    }
  }
  parent.add(g);
}

function bladeGeometry(height, width, bend) {
  const geo = new THREE.PlaneGeometry(width, height, 1, 5);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i) + height / 2;
    const t = y / height;
    pos.setZ(i, bend * t * t);
    pos.setX(i, pos.getX(i) * (1 - t * 0.55));
  }
  geo.computeVertexNormals();
  return geo;
}

function buildReeds(parent) {
  REEDS.forEach((clump, idx) => {
    const rng = mulberry32(800 + idx * 11);
    for (let i = 0; i < clump.n; i++) {
      const a = rng() * Math.PI * 2;
      const rad = rng() * 0.28;
      const x = clump.x + Math.cos(a) * rad;
      const z = clump.z + Math.sin(a) * rad;
      const h = clump.h * (0.55 + rng() * 0.6);
      const geo = bladeGeometry(h, 0.035 + rng() * 0.02, (rng() - 0.4) * 0.35);
      const color = rng() > 0.7 ? '#8a7048' : (rng() > 0.4 ? '#6d7c48' : '#4e623c');
      const mesh = new THREE.Mesh(geo, mat(color, { side: THREE.DoubleSide }));
      const sdf = pondSDF(x, z);
      const y = sdf < 0 ? WATER_Y : terrainHeight(x, z);
      mesh.position.set(x, y + h / 2, z);
      mesh.rotation.y = rng() * Math.PI;
      add(parent, mesh, { cast: false });
    }
  });
}

function buildIris(parent) {
  IRIS.forEach((clump, idx) => {
    const rng = mulberry32(900 + idx);
    for (let i = 0; i < clump.n; i++) {
      const h = 0.45 + rng() * 0.35;
      const geo = bladeGeometry(h, 0.07, (rng() - 0.5) * 0.15);
      const mesh = new THREE.Mesh(geo, mat('#3f6a3a', { side: THREE.DoubleSide }));
      const a = (i / clump.n) * Math.PI * 1.4 - 0.6;
      const x = clump.x + Math.cos(a) * 0.08;
      const z = clump.z + Math.sin(a) * 0.08;
      const y = pondSDF(x, z) < 0 ? WATER_Y : terrainHeight(x, z);
      mesh.position.set(x, y + h / 2, z);
      mesh.rotation.y = a;
      add(parent, mesh, { cast: false });
    }
  });
}

function buildFerns(parent) {
  FERNS.forEach((clump, idx) => {
    const rng = mulberry32(640 + idx);
    for (let f = 0; f < clump.n; f++) {
      const a = (f / clump.n) * Math.PI * 1.6 + rng();
      const x = clump.x + Math.cos(a) * 0.12;
      const z = clump.z + Math.sin(a) * 0.12;
      const h = 0.22 + rng() * 0.16;
      const geo = bladeGeometry(h, 0.045, 0.12 + rng() * 0.1);
      const mesh = new THREE.Mesh(geo, mat('#4e7346', { side: THREE.DoubleSide }));
      mesh.position.set(x, terrainHeight(x, z) + h / 2, z);
      mesh.rotation.y = a;
      add(parent, mesh, { cast: false });
    }
  });
}

function buildMoss(parent) {
  const mossMat = mat('#7d934c', { side: THREE.DoubleSide });
  const mossDeep = mat('#4f6840', { side: THREE.DoubleSide });
  MOSS.forEach((patch, idx) => {
    const rng = mulberry32(3000 + idx * 17);
    const discs = 4;
    for (let d = 0; d < discs; d++) {
      const cx = patch.x + (rng() - 0.5) * patch.rx * 1.1;
      const cz = patch.z + (rng() - 0.5) * patch.rz * 1.1;
      const rx = patch.rx * (0.38 + rng() * 0.22);
      const rz = patch.rz * (0.38 + rng() * 0.22);
      const geo = new THREE.CircleGeometry(1, 16);
      geo.rotateX(-Math.PI / 2);
      geo.scale(rx, 1, rz);
      const mesh = new THREE.Mesh(geo, d % 2 ? mossMat : mossDeep);
      mesh.position.set(cx, terrainHeight(cx, cz) + 0.02, cz);
      mesh.rotation.y = rng() * Math.PI;
      add(parent, mesh, { cast: false });
    }
  });
}

function buildBamboo(parent) {
  BAMBOO.forEach((clump, idx) => {
    const rng = mulberry32(1500 + idx * 3);
    for (let i = 0; i < clump.n; i++) {
      const a = rng() * Math.PI * 2;
      const rad = rng() * 0.85;
      const x = clump.x + Math.cos(a) * rad;
      const z = clump.z + Math.sin(a) * rad;
      const h = clump.h * (0.5 + rng() * 0.55);
      const y0 = terrainHeight(x, z);
      const culm = new THREE.Mesh(new THREE.CylinderGeometry(0.02 + rng() * 0.012, 0.03, h, 6), mat('#c6b56e'));
      culm.position.set(x, y0 + h / 2, z);
      culm.rotation.z = (rng() - 0.5) * 0.12;
      culm.rotation.x = (rng() - 0.5) * 0.1;
      add(parent, culm);
      for (let ny = 0.45; ny < h - 0.2; ny += 0.42) {
        const ring = new THREE.Mesh(new THREE.CylinderGeometry(0.034, 0.034, 0.02, 6), mat('#b09a58'));
        ring.position.set(x, y0 + ny, z);
        add(parent, ring, { cast: false });
      }
      for (let L = 0; L < 5; L++) {
        const leaf = new THREE.Mesh(leafGeo('simple'), mat('#6a8a3e', { side: THREE.DoubleSide }));
        const la = a + L;
        leaf.position.set(x + Math.cos(la) * 0.18, y0 + h - 0.05, z + Math.sin(la) * 0.18);
        leaf.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), new THREE.Vector3(Math.cos(la), 0.35, Math.sin(la)).normalize());
        add(parent, leaf, { cast: false });
      }
    }
  });
}

function buildPlantsGroup() {
  const g = new THREE.Group();
  g.name = 'planting';
  for (const spec of PLANTS) {
    if (spec.kind === 'maple') buildMaple(g, spec);
    else if (spec.kind === 'pine') buildPine(g, spec);
    else if (spec.kind === 'willow') buildWillow(g, spec);
  }
  buildReeds(g);
  buildIris(g);
  buildFerns(g);
  buildMoss(g);
  buildBamboo(g);
  return g;
}

export function buildShell() {
  const g = new THREE.Group();
  g.name = 'garden';
  const terrain = buildTerrain();
  g.add(terrain);
  for (const rock of shoreRocks()) placeRock(g, rock);
  for (const rock of abutmentRocks()) placeRock(g, rock);
  for (const rock of BOULDERS) placeRock(g, rock);
  for (const pebble of pebbles()) placeRock(g, { ...pebble, radius: pebble.r, role: 'pebble', flatness: 0.45, jagged: 0.25 });
  buildSteppingStones(g);
  for (const pts of [PATH_MAIN, PATH_TEA, PATH_STONES]) {
    let length = 0;
    for (let i = 1; i < pts.length; i++) length += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    if (length < 0.45) continue;
    const ribbon = pathRibbon(pts);
    add(g, ribbon, { cast: false });
  }
  buildBridge(g);
  buildLantern(g);
  buildShelter(g);
  buildKoi(g);
  const water = buildWater();
  g.add(water);
  buildLilies(g);
  return g;
}

export function buildPlants() {
  return buildPlantsGroup();
}
