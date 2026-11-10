import * as THREE from './vendor/three.module.js';
import { boot, toon, addBox, addCyl } from './scene_lib.js';
import {
  backSlopeY,
  centroid,
  edgeFrames,
  groundY,
  mulberry32,
  offsetPoly,
  rimRocks,
  terracePlan,
} from './geom.mjs';
import { layFlat, planarGeometry } from './mesh_plan.js';

const BARK = '#4a382c';
const WOOD = '#6b4a32';
const WOOD_LIT = '#8a6244';
const BOARD = '#5c4636';
const ROOF = '#3a322c';
const STONE = ['#6b665d', '#756f66', '#5c5852', '#7d786f', '#4e534e'];
const LEAF = ['#3e5644', '#31483a', '#4a6250', '#2c4034'];

function stoneMat(t) {
  return toon(STONE[Math.abs(Math.floor(t * 10)) % STONE.length]);
}

function rockGeometry(seed) {
  const geo = new THREE.DodecahedronGeometry(0.5, 0);
  const pos = geo.attributes.position;
  let s = seed + 1;
  for (let i = 0; i < pos.count; i++) {
    s = (s * 16807 + 11) % 2147483647;
    const f = 0.9 + (s % 1000) / 1000 * 0.18;
    pos.setXYZ(i, pos.getX(i) * f, pos.getY(i) * (0.82 + (s % 400) / 400 * 0.2), pos.getZ(i) * f);
  }
  geo.computeVertexNormals();
  return geo;
}

function addRock(g, spec, baseY) {
  const mesh = new THREE.Mesh(rockGeometry(Math.floor(spec.rot * 1000 + spec.x * 17)), stoneMat(spec.shade ?? spec.rot ?? 0.2));
  mesh.scale.set(spec.sx, spec.sy, spec.sz);
  mesh.position.set(spec.x, baseY + spec.sy * 0.4, spec.z);
  mesh.rotation.y = spec.rot || 0;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  g.add(mesh);
  if (spec.moss) {
    const moss = new THREE.Mesh(new THREE.DodecahedronGeometry(0.5, 0), toon('#3e5344'));
    moss.scale.set(spec.sx * 0.45, spec.sy * 0.18, spec.sz * 0.4);
    moss.position.set(spec.x, baseY + spec.sy * 0.78, spec.z);
    moss.userData.noCast = true;
    g.add(moss);
  }
  return mesh;
}

function pipe(g, from, to, r0, r1, mat) {
  const a = new THREE.Vector3(...from);
  const b = new THREE.Vector3(...to);
  const dir = b.clone().sub(a);
  const len = dir.length();
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(r1, r0, len, 8), mat);
  mesh.position.copy(a).add(b).multiplyScalar(0.5);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  g.add(mesh);
  return mesh;
}

function ribbon(g, left, right, mat, name) {
  const positions = [];
  const index = [];
  for (let i = 0; i < left.length; i++) positions.push(left[i][0], left[i][1], left[i][2], right[i][0], right[i][1], right[i][2]);
  for (let i = 0; i < left.length - 1; i++) {
    const a = i * 2;
    index.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setIndex(index);
  geo.computeVertexNormals();
  const mesh = new THREE.Mesh(geo, mat);
  mesh.name = name || 'ribbon';
  g.add(mesh);
  return mesh;
}

function channelRails(points, halfW, sign) {
  const low = [];
  const high = [];
  for (let i = 0; i < points.length; i++) {
    const prev = points[Math.max(0, i - 1)];
    const next = points[Math.min(points.length - 1, i + 1)];
    let dx = next[0] - prev[0];
    let dz = next[2] - prev[2];
    const len = Math.hypot(dx, dz) || 1;
    dx /= len;
    dz /= len;
    const p = points[i];
    const x = p[0] - sign * dz * halfW;
    const z = p[2] + sign * dx * halfW;
    low.push([x, p[1], z]);
    high.push([x, 0.02, z]);
  }
  return { low, high };
}

function paintRadial(geo, cx, cz, inner, outer) {
  const pos = geo.attributes.position;
  const a = new THREE.Color(inner);
  const b = new THREE.Color(outer);
  const colors = new Float32Array(pos.count * 3);
  const c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = -pos.getY(i);
    const t = Math.min(1, Math.hypot(x - cx, z - cz) / 2.35);
    c.copy(a).lerp(b, Math.pow(t, 0.85));
    colors[i * 3] = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
}

function makeSky(g) {
  const geo = new THREE.SphereGeometry(150, 28, 16, 0, Math.PI * 2, 0, Math.PI * 0.55);
  const pos = geo.attributes.position;
  let minY = Infinity;
  let maxY = -Infinity;
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i);
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);
  }
  const cols = new Float32Array(pos.count * 3);
  const zenith = new THREE.Color('#0d1a33');
  const mid = new THREE.Color('#1c3c66');
  const horizon = new THREE.Color('#3c5d86');
  const warm = new THREE.Color('#6a5968');
  const c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const t = (pos.getY(i) - minY) / (maxY - minY || 1);
    if (t < 0.2) c.copy(horizon).lerp(warm, ((0.2 - t) / 0.2) * 0.45);
    else if (t < 0.55) c.copy(horizon).lerp(mid, (t - 0.2) / 0.35);
    else c.copy(mid).lerp(zenith, (t - 0.55) / 0.45);
    cols[i * 3] = c.r;
    cols[i * 3 + 1] = c.g;
    cols[i * 3 + 2] = c.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(cols, 3));
  const sky = new THREE.Mesh(
    geo,
    new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false, depthWrite: false })
  );
  sky.userData.keepMaterial = true;
  sky.frustumCulled = false;
  g.add(sky);

  const moon = new THREE.Mesh(
    new THREE.SphereGeometry(0.62, 18, 14),
    new THREE.MeshBasicMaterial({ color: '#d5deea', fog: false })
  );
  moon.position.set(26, 20, 14);
  moon.userData.keepMaterial = true;
  g.add(moon);
}

function makeTerrain(g, layout) {
  const valley = new THREE.Mesh(new THREE.CircleGeometry(46, 48), toon('#242820'));
  valley.rotation.x = -Math.PI / 2;
  valley.position.y = -1.5;
  valley.receiveShadow = true;
  valley.userData.noCast = true;
  g.add(valley);

  const plan = terracePlan(layout);
  const pave = new THREE.Mesh(layFlat(planarGeometry(plan.outer, plan.holes), 0), toon('#675f54'));
  pave.name = 'terrace';
  pave.receiveShadow = true;
  pave.userData.noCast = true;
  g.add(pave);

  const mossMats = [toon('#3c4a3e'), toon('#445246')];
  [[-4.4, 2.35, 1.15], [2.4, -1.9, 0.95], [3.5, 1.15, 0.8], [-1.4, 3.7, 0.7]].forEach((p, i) => {
    const m = new THREE.Mesh(new THREE.CircleGeometry(p[2], 22), mossMats[i % 2]);
    m.rotation.x = -Math.PI / 2;
    m.position.set(p[0], 0.012, p[1]);
    m.receiveShadow = true;
    m.userData.noCast = true;
    g.add(m);
  });

  const slopeMat = toon('#3d4a42', { side: THREE.DoubleSide });
  const slope = new THREE.BufferGeometry();
  slope.setAttribute(
    'position',
    new THREE.Float32BufferAttribute(
      [
        -12, 0, -3.15, 12, 0, -3.15, 14, 2.15, -8.2,
        -12, 0, -3.15, 14, 2.15, -8.2, -14, 2.15, -8.2,
      ],
      3
    )
  );
  slope.computeVertexNormals();
  const slopeMesh = new THREE.Mesh(slope, slopeMat);
  slopeMesh.receiveShadow = true;
  slopeMesh.userData.noCast = true;
  g.add(slopeMesh);

  addBox(g, 16.5, 0.22, 4.4, toon('#3e453c'), 0.2, -0.75, 7.45);

  const y0 = -0.64;
  const y1 = 0.14;
  const h = y1 - y0;
  const cols = ['#6a655c', '#5e5a52', '#746e64'];
  const spans = [[-6.5, -0.52], [0.86, 4.7]];
  for (const [a, b] of spans) {
    let x = a;
    let i = 0;
    while (x < b - 0.04) {
      const w = Math.min(0.78, b - x);
      addBox(g, w - 0.025, h, 0.28 + (i % 3) * 0.025, toon(cols[i % 3]), x + w / 2, (y0 + y1) / 2, 5.24);
      addBox(g, w - 0.06, 0.022, 0.32, toon('#454038'), x + w / 2, y0 + h * 0.48, 5.4);
      x += w;
      i++;
    }
  }
}

function makePool(g, layout) {
  const pool = layout.pool;
  const [cx, cz] = centroid(pool.polygon);
  const frames = edgeFrames(pool.polygon);

  const floorGeo = planarGeometry(pool.polygon);
  paintRadial(floorGeo, cx, cz, '#10161a', '#3a4442');
  const floor = new THREE.Mesh(
    layFlat(floorGeo, pool.floorY),
    toon('#ffffff', { vertexColors: true })
  );
  floor.name = 'pool-floor';
  floor.receiveShadow = true;
  floor.userData.noCast = true;
  g.add(floor);

  const waterGeo = planarGeometry(pool.polygon);
  paintRadial(waterGeo, cx, cz, pool.waterDeep, pool.waterShallow);
  const pos = waterGeo.attributes.position;
  const drip = layout.kakehi.to;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = -pos.getY(i);
    const rd = Math.hypot(x - drip[0], z - drip[2]);
    pos.setZ(i, Math.sin(rd * 8.2) * 0.011 * (0.28 + 0.72 * Math.exp(-rd * 0.42)));
  }
  const water = new THREE.Mesh(
    layFlat(waterGeo, pool.waterY),
    toon('#ffffff', { vertexColors: true, transparent: true, opacity: pool.opacity, depthWrite: true })
  );
  water.name = 'water';
  water.userData.noCast = true;
  water.userData.noReceive = true;
  g.add(water);

  const wet = toon('#2a3338');
  const cope = toon('#6e6a62');
  const seatMat = toon('#5a635e');
  const apron = offsetPoly(pool.polygon, pool.paveGap + 0.04);
  const apronMesh = new THREE.Mesh(layFlat(planarGeometry(apron, [pool.polygon]), 0.025), toon('#5e5a52'));
  apronMesh.receiveShadow = true;
  apronMesh.userData.noCast = true;
  apronMesh.name = 'coping-apron';
  g.add(apronMesh);
  for (const f of frames) {
    const lip = f.i === pool.spillEdge ? -0.02 : f.i === pool.entryEdge ? layout.entry.copingY : pool.lipY;
    const wall = addBox(g, f.len * 0.99, lip - pool.floorY, 0.09, wet, f.mx + f.ix * 0.04, (lip + pool.floorY) / 2, f.mz + f.iz * 0.04);
    wall.rotation.y = f.rotY;
    wall.userData.noCast = true;
    const cap = addBox(
      g,
      f.len * 0.98,
      0.08,
      f.i === pool.spillEdge ? 0.5 : 0.42,
      cope,
      f.mx + f.ox * 0.08,
      lip - 0.04,
      f.mz + f.oz * 0.08
    );
    cap.rotation.y = f.rotY;

    if (pool.seatEdges.includes(f.i)) {
      const pieces = f.len > 1.55 ? 2 : 1;
      const piece = (f.len * 0.84) / pieces - 0.05;
      for (let k = 0; k < pieces; k++) {
        const along = (k - (pieces - 1) / 2) * (piece + 0.07);
        const seat = addBox(
          g,
          piece,
          pool.seatY - pool.floorY,
          pool.seatWidth * 0.9,
          seatMat,
          f.mx + f.ux * along + f.ix * (0.12 + pool.seatWidth / 2),
          (pool.seatY + pool.floorY) / 2,
          f.mz + f.uz * along + f.iz * (0.12 + pool.seatWidth / 2)
        );
        seat.rotation.y = f.rotY;
        seat.userData.noCast = true;
      }
    }
  }

  const entry = frames[layout.entry.edge];
  layout.entry.treads.forEach((tread, i) => {
    const x = entry.mx + entry.ix * tread.inset;
    const z = entry.mz + entry.iz * tread.inset;
    const step = addBox(g, 0.78, 0.08, 0.32, toon(i ? '#7a756c' : '#6a6560'), x, tread.top - 0.04, z);
    step.rotation.y = entry.rotY;
  });
  const railX = entry.mx + entry.ox * 0.32;
  const railZ = entry.mz + entry.oz * 0.32;
  addCyl(g, 0.035, 0.04, 0.92, toon(WOOD), railX, 0.46, railZ, 7);
  const railBar = addBox(g, 0.5, 0.04, 0.04, toon(WOOD), railX + entry.ux * 0.24, 0.9, railZ + entry.uz * 0.24);
  railBar.rotation.y = entry.rotY;

  const linePts = pool.polygon.map(([x, z]) => new THREE.Vector3(x, pool.waterY + 0.018, z));
  const curve = new THREE.CatmullRomCurve3(linePts, true, 'catmullrom', 0.12);
  const foam = new THREE.Mesh(
    new THREE.TubeGeometry(curve, 90, 0.012, 4, true),
    toon('#d5ddd4', { transparent: true, opacity: 0.5, depthWrite: false })
  );
  foam.userData.noCast = true;
  foam.userData.noReceive = true;
  g.add(foam);

  [0.28, 0.5, 0.78].forEach((r) => {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(r, 0.007, 4, 28),
      toon('#c5d0ca', { transparent: true, opacity: 0.32, depthWrite: false })
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.set(drip[0], pool.waterY + 0.02, drip[2]);
    ring.userData.noCast = true;
    ring.userData.noReceive = true;
    g.add(ring);
  });

  const spill = frames[pool.spillEdge];
  const cut = layout.drainage.points[layout.drainage.cutFrom];
  ribbon(
    g,
    [
      [spill.mx - spill.ux * 0.28, pool.waterY, spill.mz - spill.uz * 0.28],
      [cut[0] - 0.12, cut[1] + 0.035, cut[2]],
    ],
    [
      [spill.mx + spill.ux * 0.28, pool.waterY, spill.mz + spill.uz * 0.28],
      [cut[0] + 0.12, cut[1] + 0.035, cut[2]],
    ],
    toon('#2f6a66', { transparent: true, opacity: 0.62, depthWrite: false }),
    'spill'
  );
}

function makeChannel(g, layout) {
  const all = layout.drainage.points;
  const cut = all.slice(layout.drainage.cutFrom, layout.drainage.cutTo);
  const half = layout.drainage.halfWidth;
  const left = [];
  const right = [];
  for (let i = 0; i < cut.length; i++) {
    const prev = cut[Math.max(0, i - 1)];
    const next = cut[Math.min(cut.length - 1, i + 1)];
    let dx = next[0] - prev[0];
    let dz = next[2] - prev[2];
    const len = Math.hypot(dx, dz) || 1;
    dx /= len;
    dz /= len;
    const p = cut[i];
    left.push([p[0] - dz * half, p[1] + 0.03, p[2] + dx * half]);
    right.push([p[0] + dz * half, p[1] + 0.03, p[2] - dx * half]);
  }
  const floorL = left.map((p, i) => [p[0], cut[i][1], p[2]]);
  const floorR = right.map((p, i) => [p[0], cut[i][1], p[2]]);
  const floor = ribbon(g, floorL, floorR, toon('#2c342e'), 'channel-floor');
  floor.userData.noCast = true;
  floor.receiveShadow = true;
  const water = ribbon(g, left, right, toon('#1a454c', { transparent: true, opacity: 0.72, depthWrite: true }), 'channel-water');
  water.userData.noCast = true;
  water.userData.noReceive = true;

  for (const sign of [1, -1]) {
    const wall = channelRails(cut, half * 0.96, sign);
    const mesh = ribbon(g, wall.low, wall.high, toon('#3a403c'), 'channel-wall');
    mesh.userData.noCast = true;
  }

  const rand = mulberry32(layout.rockSeed + 9);
  for (let i = 0; i < cut.length; i += 1) {
    for (const sign of [-1, 1]) {
      const prev = cut[Math.max(0, i - 1)];
      const next = cut[Math.min(cut.length - 1, i + 1)];
      let dx = next[0] - prev[0];
      let dz = next[2] - prev[2];
      const len = Math.hypot(dx, dz) || 1;
      dx /= len;
      dz /= len;
      const p = cut[i];
      addRock(
        g,
        {
          x: p[0] + sign * -dz * (half + 0.12) + (rand() - 0.5) * 0.08,
          z: p[2] + sign * dx * (half + 0.12) + (rand() - 0.5) * 0.08,
          sx: 0.16 + rand() * 0.12,
          sy: 0.1 + rand() * 0.08,
          sz: 0.14 + rand() * 0.1,
          rot: rand() * 6,
          shade: rand(),
          moss: rand() > 0.75,
        },
        0
      );
    }
  }

  const a = all[all.length - 2];
  const b = all[all.length - 1];
  for (let s = 0; s < 4; s++) {
    const t = s / 3;
    const y = a[1] + (b[1] - a[1]) * t;
    const x = a[0] + (b[0] - a[0]) * t;
    const z = a[2] + (b[2] - a[2]) * t;
    const sheet = addBox(g, 0.22, 0.012, 0.16, toon('#d5e4e2', { transparent: true, opacity: 0.55, depthWrite: false }), x, y, z);
    sheet.userData.noCast = true;
  }

  const bambooPipe = toon('#c2ae72');
  pipe(g, layout.kakehi.from, layout.kakehi.to, 0.048, 0.036, bambooPipe);
  const from = new THREE.Vector3(...layout.kakehi.from);
  const endV = new THREE.Vector3(...layout.kakehi.to);
  const spoutDir = endV.clone().sub(from).normalize();
  for (const t of [0.34, 0.66]) {
    const node = new THREE.Mesh(new THREE.CylinderGeometry(0.058, 0.058, 0.032, 8), toon('#8d7948'));
    node.position.copy(from).lerp(endV, t);
    node.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), spoutDir);
    node.castShadow = true;
    g.add(node);
  }
  const end = layout.kakehi.to;
  for (let i = 0; i < 3; i++) {
    const drop = new THREE.Mesh(new THREE.SphereGeometry(0.018, 6, 5), toon('#d5e6e4', { transparent: true, opacity: 0.75, depthWrite: false }));
    drop.position.set(end[0], end[1] - 0.06 - i * 0.07, end[2]);
    drop.userData.noCast = true;
    g.add(drop);
  }
}

function makeShelter(g, layout) {
  const s = layout.shelter;
  const x0 = s.x;
  const z0 = s.z;
  const x1 = s.x + s.w;
  const z1 = s.z + s.d;
  const cz = (z0 + z1) / 2;
  const post = toon('#3f2e24');
  const board = toon(BOARD);
  const beam = toon('#5a4030');

  const corners = [
    [x0, z0],
    [x0, z1],
    [x1, z0],
    [x1, z1],
  ];
  corners.forEach(([x, z], i) => {
    if (i === 3) addCyl(g, 0.09, 0.1, s.eave, post, x, s.eave / 2, z, 10);
    else addBox(g, 0.12, s.eave, 0.12, post, x, s.eave / 2, z);
  });
  addBox(g, 0.1, s.eave * 0.72, 0.1, post, x0, s.eave * 0.36, cz);
  addBox(g, s.w, 0.1, 0.12, beam, (x0 + x1) / 2, s.eave - 0.02, z0);
  addBox(g, s.w, 0.1, 0.12, beam, (x0 + x1) / 2, s.eave - 0.02, z1);
  addBox(g, 0.12, 0.1, s.d, beam, x0, s.eave - 0.02, cz);
  addBox(g, 0.12, 0.1, s.d, beam, x1, s.eave - 0.02, cz);

  addBox(g, 0.06, s.eave - 0.2, s.d - 0.2, board, x0 + 0.04, (s.eave - 0.2) / 2 + 0.08, cz);
  addBox(g, s.w - 0.2, s.eave - 0.28, 0.06, board, (x0 + x1) / 2, (s.eave - 0.28) / 2 + 0.1, z0 + 0.04);
  addBox(g, s.w - 0.24, s.eave - 0.28, 0.06, board, (x0 + x1) / 2, (s.eave - 0.28) / 2 + 0.1, z1 - 0.04);
  addBox(g, 0.06, s.eave - 0.3, 0.5, board, x1 - 0.02, (s.eave - 0.3) / 2 + 0.12, z0 + 0.28);

  for (let z = z0 + 0.28; z < z1 - 0.2; z += 0.22) {
    addBox(g, 0.02, s.eave - 0.45, 0.025, toon('#3a2c24'), x0 + 0.08, s.eave * 0.48, z);
  }

  const winW = 0.66;
  const winH = 0.48;
  const winY = 1.28;
  const winX = x0 + s.w * 0.42;
  addBox(g, winW + 0.08, winH + 0.08, 0.04, toon('#2c221c'), winX, winY, z0 - 0.01);
  const pane = addBox(g, winW, winH, 0.02, toon('#e7b48a', { emissive: '#c47a3a', emissiveIntensity: 0.45 }), winX, winY, z0 - 0.03);
  pane.userData.noCast = true;

  const plankW = 0.11;
  const gap = 0.012;
  for (let z = z0 + 0.16; z < z1 - 0.12; z += plankW + gap) {
    addBox(g, s.w - 0.28, 0.028, plankW, toon(z % 0.3 < 0.15 ? '#7a5a3c' : '#6a4e36'), (x0 + x1) / 2 - 0.04, s.floor - 0.014, z);
  }
  addBox(g, s.w - 0.4, 0.06, 0.08, toon(WOOD), (x0 + x1) / 2, s.floor - 0.06, z0 + 0.45);
  addBox(g, s.w - 0.4, 0.06, 0.08, toon(WOOD), (x0 + x1) / 2, s.floor - 0.06, z1 - 0.45);

  const seatZ = z0 + 1.35;
  const seatTop = s.floor + s.seatAboveFloor;
  addBox(g, 0.38, 0.045, 1.35, toon('#a67c52'), x0 + 0.36, seatTop, seatZ);
  addBox(g, 0.06, 0.36, 1.3, toon(BOARD), x0 + 0.16, seatTop + 0.16, seatZ);
  for (const dz of [-0.55, 0.55]) {
    addBox(g, 0.06, s.seatAboveFloor, 0.06, toon(WOOD), x0 + 0.22, s.floor + s.seatAboveFloor / 2, seatZ + dz);
    addBox(g, 0.06, s.seatAboveFloor, 0.06, toon(WOOD), x0 + 0.48, s.floor + s.seatAboveFloor / 2, seatZ + dz);
  }

  const stoolX = x0 + 1.35;
  const stoolZ = z0 + 0.48;
  addCyl(g, 0.13, 0.13, 0.035, toon('#c4a06a'), stoolX, s.floor + s.stoolHeight, stoolZ, 10);
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2;
    addCyl(g, 0.015, 0.016, s.stoolHeight, toon(WOOD), stoolX + Math.cos(a) * 0.09, s.floor + s.stoolHeight / 2, stoolZ + Math.sin(a) * 0.09, 5);
  }
  addCyl(g, 0.16, 0.14, 0.1, toon('#6a5a48'), stoolX, s.floor + 0.06, z0 + 0.28, 10);
  addCyl(g, 0.012, 0.012, 0.16, toon('#8a9098'), stoolX, s.floor + 0.28, z0 + 0.2, 6);
  addCyl(g, 0.012, 0.014, 0.14, toon('#8a9098'), stoolX - 0.06, s.floor + 0.22, z0 + 0.22, 6).rotation.z = Math.PI / 2;

  addBox(g, 0.16, 0.03, 0.7, toon(WOOD), x0 + 0.2, s.floor + 1.05, z0 + 0.7);
  addBox(g, 0.22, 0.05, 0.16, toon('#d9d3c8'), x0 + 0.22, s.floor + 1.1, z0 + 0.55);
  addBox(g, 0.22, 0.045, 0.15, toon('#e4ddd2'), x0 + 0.22, s.floor + 1.16, z0 + 0.78);
  addCyl(g, 0.1, 0.09, 0.24, toon('#8a5a38'), stoolX + 0.35, s.floor + 0.12, stoolZ + 0.15, 8);

  const norenY = 1.5;
  addBox(g, 0.015, 0.95, 0.42, toon('#24344e'), x1 + 0.02, norenY, cz - 0.28);
  addBox(g, 0.015, 0.95, 0.42, toon('#2c3e5c'), x1 + 0.02, norenY, cz + 0.32);

  const ridgeX = (x0 + x1) / 2;
  const rise = s.ridge - s.eave;
  const runE = s.w / 2 + 0.48;
  const runW = s.w / 2 + 0.22;
  const roofD = s.d + 0.55;
  function slope(run, sign) {
    const len = Math.hypot(run, rise);
    const angle = Math.atan2(rise, run);
    const mesh = addBox(g, len, 0.06, roofD, toon(ROOF), ridgeX + sign * (run / 2), (s.ridge + s.eave) / 2, cz);
    mesh.rotation.z = -sign * angle;
    return mesh;
  }
  slope(runE, 1);
  slope(runW, -1);
  const gableMat = toon('#4a382e', { side: THREE.DoubleSide });
  for (const z of [z0 + 0.02, z1 - 0.02]) {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute(
      'position',
      new THREE.Float32BufferAttribute(
        [ridgeX - runW, s.eave, z, ridgeX + runE, s.eave, z, ridgeX, s.ridge, z],
        3
      )
    );
    geo.computeVertexNormals();
    const tri = new THREE.Mesh(geo, gableMat);
    tri.userData.noCast = true;
    g.add(tri);
  }
  for (let i = 0; i < 4; i++) {
    const z = z0 + 0.45 + i * 0.55;
    const rafter = addBox(g, runE, 0.05, 0.05, beam, ridgeX + runE / 2, s.eave - 0.08, z);
    rafter.rotation.z = -Math.atan2(rise, runE);
  }

  for (let z = z0 + 0.85; z < z1 - 0.15; z += 0.12) {
    addBox(g, 0.1, 0.03, 0.62, toon(z % 0.24 < 0.12 ? WOOD_LIT : '#7a5a3e'), x1 + 0.32, s.floor, z);
  }
  addBox(g, 0.08, 0.08, s.d * 0.55, toon(WOOD), x1 + 0.08, s.floor - 0.05, cz + 0.2);
  addBox(g, 0.7, 0.06, 0.42, toon('#7a7268'), x1 + 0.7, 0.03, cz + 0.15);
  addBox(g, 0.22, 0.03, 0.08, toon('#c4a574'), x1 + 0.48, s.floor + 0.03, cz + 0.55);
  addBox(g, 0.22, 0.03, 0.08, toon('#b89560'), x1 + 0.5, s.floor + 0.03, cz + 0.66);
}

function makeDeck(g, layout) {
  const d = layout.deck;
  const y = d.y;
  for (let x = d.x0 + 0.08; x < d.x1 - 0.04; x += 0.14) {
    addBox(g, 0.12, 0.03, d.z1 - d.z0 - 0.08, toon(x % 0.28 < 0.14 ? '#7d5c40' : '#6d5138'), x, y, (d.z0 + d.z1) / 2);
  }
  addBox(g, d.x1 - d.x0 - 0.2, 0.07, 0.08, toon(WOOD), (d.x0 + d.x1) / 2, y - 0.05, d.z0 + 0.12);
  addBox(g, d.x1 - d.x0 - 0.2, 0.07, 0.08, toon(WOOD), (d.x0 + d.x1) / 2, y - 0.05, d.z1 - 0.12);
  addRock(g, { x: d.x0 + 0.15, z: d.z0 + 0.2, sx: 0.28, sy: 0.16, sz: 0.24, rot: 0.4, shade: 0.2 }, 0);
  addRock(g, { x: d.x1 - 0.2, z: d.z1 - 0.2, sx: 0.26, sy: 0.14, sz: 0.22, rot: 1.1, shade: 0.6 }, 0);

  const b = layout.bridge;
  for (let z = -b.length / 2 + 0.08; z < b.length / 2 - 0.04; z += 0.13) {
    addBox(g, b.width - 0.06, 0.032, 0.11, toon(z % 0.26 < 0 ? '#866446' : '#6e5038'), b.x, b.deckY, b.z + z);
  }
  addBox(g, 0.08, 0.08, b.length, toon(WOOD), b.x - b.width / 2 + 0.08, b.deckY - 0.05, b.z);
  addBox(g, 0.08, 0.08, b.length, toon(WOOD), b.x + b.width / 2 - 0.08, b.deckY - 0.05, b.z);
  const railX = b.x + b.width / 2 - 0.02;
  addCyl(g, 0.035, 0.04, b.railHeight, toon(WOOD), railX, b.deckY + b.railHeight / 2, b.z - b.length / 2 + 0.12, 6);
  addCyl(g, 0.035, 0.04, b.railHeight, toon(WOOD), railX, b.deckY + b.railHeight / 2, b.z + b.length / 2 - 0.12, 6);
  addBox(g, 0.04, 0.04, b.length - 0.2, toon(WOOD_LIT), railX, b.deckY + b.railHeight, b.z);
  addBox(g, 0.03, 0.03, b.length - 0.2, toon(WOOD), railX, b.deckY + 0.46, b.z);
  addRock(g, { x: b.x, z: b.z - b.length / 2 - 0.05, sx: 0.4, sy: 0.12, sz: 0.32, rot: 0.2, shade: 0.3 }, 0);
  addRock(g, { x: b.x, z: b.z + b.length / 2 + 0.02, sx: 0.42, sy: 0.12, sz: 0.3, rot: 0.8, shade: 0.5 }, 0);

  const stool = layout.viewStool;
  addCyl(g, 0.16, 0.16, 0.04, toon('#c4a06a'), stool.x, d.y + 0.34, stool.z, 10);
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + 0.4;
    addCyl(g, 0.018, 0.02, 0.32, toon(WOOD), stool.x + Math.cos(a) * 0.11, d.y + 0.16, stool.z + Math.sin(a) * 0.11, 5);
  }
  addBox(g, 0.28, 0.02, 0.2, toon('#6b4630'), -0.78, d.y + 0.015, 2.78);

  const steps = layout.steps;
  for (let i = 0; i < steps.count; i++) {
    const top = steps.topY - steps.riser * (i + 1);
    const z = steps.zTop + steps.tread * (i + 0.5);
    addBox(g, steps.width, 0.1, steps.tread - 0.025, toon(i % 2 ? '#6e6a60' : '#7a756c'), steps.x, top - 0.05, z);
    addCyl(g, 0.03, 0.035, steps.railHeight, toon(WOOD), steps.x + steps.width / 2 + 0.02, top + steps.railHeight / 2, z, 6);
  }
  const zA = steps.zTop + steps.tread * 0.5;
  const zB = steps.zTop + steps.tread * (steps.count - 0.5);
  const yA = steps.topY - steps.riser + steps.railHeight;
  const yB = steps.topY - steps.riser * steps.count + steps.railHeight;
  const railLen = Math.hypot(zB - zA, yB - yA);
  const rail = addBox(g, 0.04, 0.04, railLen, toon(WOOD_LIT), steps.x + steps.width / 2 + 0.02, (yA + yB) / 2, (zA + zB) / 2);
  rail.rotation.x = Math.atan2(yA - yB, zB - zA);

  layout.stones.forEach((p, i) => {
    addRock(g, { x: p[0], z: p[1], sx: 0.48 + (i % 3) * 0.06, sy: 0.08, sz: 0.36 + (i % 2) * 0.05, rot: i * 0.7, shade: i / 5 }, 0);
  });
  layout.lowerStones.forEach((p, i) => {
    addRock(g, { x: p[0], z: p[1], sx: 0.42, sy: 0.07, sz: 0.32, rot: i, shade: 0.4 }, -0.64);
  });
}

function makeLanterns(g, layout) {
  const paper = (color) => toon('#f0c59a', { emissive: color, emissiveIntensity: 0.55 });
  for (const lan of layout.lanterns) {
    if (lan.type === 'chochin') {
      const grp = new THREE.Group();
      grp.position.set(lan.x, lan.y, lan.z);
      addCyl(grp, 0.008, 0.008, 0.28, toon('#2a241e'), 0, 0.28, 0, 4);
      addCyl(grp, 0.11, 0.1, 0.05, toon('#4a3428'), 0, 0.16, 0, 8);
      const body = addCyl(grp, 0.09, 0.1, 0.28, paper(lan.color), 0, 0, 0, 10);
      body.userData.noCast = true;
      addCyl(grp, 0.1, 0.08, 0.04, toon('#4a3428'), 0, -0.15, 0, 8);
      for (let i = 0; i < 4; i++) {
        const rib = addBox(grp, 0.012, 0.26, 0.012, toon('#5a4030'), Math.cos((i / 4) * Math.PI * 2) * 0.09, 0, Math.sin((i / 4) * Math.PI * 2) * 0.09);
        rib.userData.noCast = true;
      }
      g.add(grp);
    } else if (lan.type === 'toro') {
      addBox(g, 0.42, 0.12, 0.42, toon('#6a655c'), lan.x, 0.06, lan.z);
      addBox(g, 0.16, 0.34, 0.16, toon('#5c5852'), lan.x, 0.29, lan.z);
      addBox(g, 0.28, 0.22, 0.28, toon('#4a463e'), lan.x, 0.58, lan.z);
      const glow = addBox(g, 0.16, 0.12, 0.02, paper(lan.color), lan.x, lan.lightY, lan.z + 0.15);
      glow.userData.noCast = true;
      addBox(g, 0.02, 0.12, 0.16, paper(lan.color), lan.x + 0.15, lan.lightY, lan.z).userData.noCast = true;
      const roof = new THREE.Mesh(new THREE.ConeGeometry(0.26, 0.16, 4), toon('#3a322c'));
      roof.position.set(lan.x, 0.86, lan.z);
      roof.rotation.y = Math.PI / 4;
      roof.castShadow = true;
      g.add(roof);
      addCyl(g, 0.02, 0.03, 0.08, toon('#2e2a26'), lan.x, 0.98, lan.z, 5);
    } else {
      addCyl(g, 0.045, 0.055, 1.15, toon(WOOD), lan.x, lan.y + 0.55, lan.z, 7);
      const body = addCyl(g, 0.07, 0.08, 0.18, paper(lan.color), lan.x, lan.lightY, lan.z, 8);
      body.userData.noCast = true;
      addCyl(g, 0.09, 0.07, 0.04, toon('#3a322c'), lan.x, lan.lightY + 0.1, lan.z, 6);
    }
  }
}

function makePlants(g, layout) {
  const rand = mulberry32(layout.rockSeed + 3);
  const leafMat = ['#5d7a56', '#6e8b62', '#4a634c', '#7f9a6e'].map((c) => toon(c, { side: THREE.DoubleSide }));
  const reedMat = [toon('#6d7a55', { side: THREE.DoubleSide }), toon('#7d8a62', { side: THREE.DoubleSide }), toon('#5a6848', { side: THREE.DoubleSide })];
  const plume = toon('#c2b48a', { side: THREE.DoubleSide });

  function fan(parent, y, count) {
    for (let i = 0; i < count; i++) {
      const len = 0.55 + rand() * 0.45;
      const geo = new THREE.PlaneGeometry(0.11 + rand() * 0.05, len);
      geo.translate(0, len / 2, 0);
      const mesh = new THREE.Mesh(geo, leafMat[i % leafMat.length]);
      mesh.rotation.order = 'YXZ';
      mesh.rotation.y = (i / count) * Math.PI * 2 + rand() * 0.4;
      mesh.rotation.x = 0.7 + rand() * 0.55;
      mesh.position.y = y;
      mesh.userData.noCast = true;
      parent.add(mesh);
    }
  }

  for (const b of layout.bamboo) {
    const [x, z, h, lean, rot] = b;
    const pivot = new THREE.Group();
    pivot.position.set(x, groundY(z), z);
    pivot.rotation.y = rot;
    pivot.rotation.z = lean;
    addCyl(pivot, 0.03 + h * 0.002, 0.055, h, toon('#73845a'), 0, h / 2, 0, 7);
    const nodes = 5 + Math.floor(h / 1.8);
    for (let i = 1; i < nodes; i++) {
      const ny = (h * i) / nodes;
      addCyl(pivot, 0.048, 0.048, 0.025, toon('#5c6a44'), 0, ny, 0, 7);
      if (i >= nodes - 4) fan(pivot, ny, i === nodes - 1 ? 8 : 6);
    }
    g.add(pivot);
  }

  for (const r of layout.reeds) {
    const [x, z, h, n] = r;
    const clump = new THREE.Group();
    clump.position.set(x, groundY(z), z);
    for (let i = 0; i < n; i++) {
      const bh = h * (0.55 + rand() * 0.5);
      const geo = new THREE.PlaneGeometry(0.022, bh);
      geo.translate(0, bh / 2, 0);
      const blade = new THREE.Mesh(geo, reedMat[i % reedMat.length]);
      const ang = rand() * Math.PI * 2;
      const rad = rand() * 0.2;
      blade.position.set(Math.cos(ang) * rad, 0, Math.sin(ang) * rad);
      blade.rotation.y = rand() * Math.PI;
      blade.rotation.z = (rand() - 0.5) * 0.35;
      blade.userData.noCast = true;
      clump.add(blade);
      if (bh > h * 0.82) {
        const head = new THREE.Mesh(new THREE.PlaneGeometry(0.07, 0.14), plume);
        head.position.set(blade.position.x, bh, blade.position.z);
        head.rotation.y = blade.rotation.y;
        head.userData.noCast = true;
        clump.add(head);
      }
    }
    g.add(clump);
  }

  function fern(x, y, z, scale) {
    const grp = new THREE.Group();
    grp.position.set(x, y, z);
    for (let i = 0; i < 6; i++) {
      const len = 0.26 * scale * (0.75 + (i % 3) * 0.18);
      const geo = new THREE.PlaneGeometry(0.07 * scale, len);
      geo.translate(0, len / 2, 0);
      const mesh = new THREE.Mesh(geo, leafMat[i % leafMat.length]);
      mesh.rotation.y = (i / 6) * Math.PI * 2;
      mesh.rotation.x = 0.45 + (i % 3) * 0.18;
      mesh.userData.noCast = true;
      grp.add(mesh);
    }
    g.add(grp);
  }
  for (const f of layout.ferns) fern(f[0], groundY(f[1]) + 0.02, f[1], f[2]);
  const pot = layout.instances.find((i) => i.kind === 'flowerpot');
  if (pot) fern(pot.position[0], pot.position[1] + 0.26, pot.position[2], 1.45);

  for (const p of layout.pines) {
    const [x, z, scale, lean] = p;
    const y = backSlopeY(z);
    const h = 2.35 * scale;
    const pivot = new THREE.Group();
    pivot.position.set(x, y, z);
    pivot.rotation.z = lean;
    addCyl(pivot, 0.04 * scale, 0.08 * scale, h * 0.55, toon(BARK), lean * 0.15, h * 0.28, 0, 6);
    const crowns = [
      [0.0, 0.48, 0.42, 0.55],
      [0.16, 0.62, 0.32, 0.42],
      [-0.14, 0.7, 0.28, 0.38],
      [0.05, 0.84, 0.2, 0.32],
    ];
    crowns.forEach((c, i) => {
      const cone = new THREE.Mesh(new THREE.ConeGeometry(c[2] * scale, c[3] * scale, 6), toon(LEAF[i % LEAF.length]));
      cone.position.set(c[0] * scale, h * c[1], (i - 1.5) * 0.08 * scale);
      cone.rotation.z = (i - 1.5) * 0.18;
      cone.castShadow = true;
      cone.receiveShadow = true;
      pivot.add(cone);
    });
    g.add(pivot);
  }

  layout.firs.forEach((f, i) => {
    const [x, z, h] = f;
    const y = backSlopeY(z);
    const lean = (i % 2 ? 1 : -1) * (0.03 + (i % 3) * 0.02);
    addCyl(g, h * 0.02, h * 0.035, h * 0.42, toon(BARK), x, y + h * 0.2, z, 6);
    const cones = [
      [0.42, 0.34, 0.26],
      [0.62, 0.32, 0.2],
      [0.82, 0.28, 0.13],
    ];
    cones.forEach((c, k) => {
      const cone = new THREE.Mesh(new THREE.ConeGeometry(h * c[2], h * c[1], 6), toon(LEAF[(i + k) % LEAF.length]));
      cone.position.set(x + lean * h * c[0] * 0.15, y + h * c[0], z);
      cone.castShadow = true;
      cone.receiveShadow = true;
      g.add(cone);
    });
  });
}

function makeDressing(g, layout) {
  for (const m of layout.mountains) {
    const geo = new THREE.ConeGeometry(1, 1, 6);
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      if (pos.getY(i) < 0.42) {
        const n = 0.86 + ((i * 13) % 9) * 0.035;
        pos.setX(i, pos.getX(i) * n);
        pos.setZ(i, pos.getZ(i) * (1.08 - (i % 4) * 0.04));
      }
    }
    geo.computeVertexNormals();
    const mesh = new THREE.Mesh(geo, toon(m.color));
    mesh.scale.set(m.rx, m.h, m.rz);
    mesh.position.set(m.x, m.base + m.h / 2, m.z);
    mesh.userData.noCast = true;
    mesh.receiveShadow = true;
    g.add(mesh);
  }

  const rocks = rimRocks(layout.pool.polygon, {
    seed: layout.rockSeed,
    spillEdge: layout.pool.spillEdge,
    entryEdge: layout.pool.entryEdge,
  });
  for (const r of rocks) addRock(g, r, 0);
  for (const a of layout.anchors) addRock(g, a, a.baseY);

  const bucket = layout.bucket;
  const rim = layout.pool.lipY;
  addCyl(g, 0.11, 0.095, bucket.height, toon('#8a5a38'), bucket.x, rim + bucket.height / 2, bucket.z, 10);
  const handle = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.008, 4, 12, Math.PI), toon('#5c3e2c'));
  handle.position.set(bucket.x, rim + bucket.height + 0.01, bucket.z);
  handle.rotation.x = Math.PI;
  g.add(handle);

  const ladle = new THREE.Group();
  ladle.position.set(0.42, 0.24, 1.9);
  ladle.rotation.y = -0.45;
  const ladleHandle = addCyl(ladle, 0.012, 0.012, 0.4, toon(WOOD_LIT), 0, 0, 0, 6);
  ladleHandle.rotation.z = Math.PI / 2;
  addCyl(ladle, 0.04, 0.034, 0.034, toon('#a67c52'), -0.2, 0.008, 0, 8);
  g.add(ladle);

  const steamTex = (() => {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    const grd = ctx.createRadialGradient(32, 74, 4, 32, 68, 34);
    grd.addColorStop(0, 'rgba(232,238,240,0.9)');
    grd.addColorStop(0.55, 'rgba(214,222,226,0.35)');
    grd.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, 64, 128);
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  })();
  const steam = new THREE.Group();
  steam.name = 'steam';
  layout.steam.forEach((w, i) => {
    const mat = new THREE.MeshBasicMaterial({
      map: steamTex,
      transparent: true,
      opacity: w.opacity,
      depthWrite: false,
      side: THREE.DoubleSide,
      fog: true,
    });
    for (const yaw of [0, Math.PI / 2]) {
      const geo = new THREE.PlaneGeometry(w.w, w.h);
      geo.translate(0, w.h / 2, 0);
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(w.x, layout.pool.waterY + 0.04, w.z);
      mesh.rotation.order = 'YXZ';
      mesh.rotation.y = yaw + i * 0.35;
      mesh.rotation.x = 0.22;
      mesh.rotation.z = (i - 1) * 0.18;
      mesh.userData.keepMaterial = true;
      mesh.userData.phase = i * 1.3;
      steam.add(mesh);
    }
  });
  g.add(steam);
}

function makeWorld(layout) {
  const g = new THREE.Group();
  g.name = 'world';
  makeSky(g);
  makeTerrain(g, layout);
  makePool(g, layout);
  makeChannel(g, layout);
  makeShelter(g, layout);
  makeDeck(g, layout);
  makeLanterns(g, layout);
  makePlants(g, layout);
  makeDressing(g, layout);
  return g;
}

boot({
  makeShell: makeWorld,
  readyText: 'ready — mountain hot spring · drag orbit · U unlit · T toon',
  animate(_dt, now) {
    const root = window.__scene?.scene?.getObjectByName('steam');
    if (!root) return;
    const t = now * 0.001;
    root.children.forEach((wisp, i) => {
      wisp.scale.y = 1 + Math.sin(t * 0.65 + (wisp.userData.phase || i)) * 0.05;
    });
  },
  onReady({ scene, layout }) {
    let meshes = 0;
    scene.traverse((o) => {
      if (o.isMesh) meshes += 1;
    });
    window.__metrics = {
      meshes,
      waterY: layout.pool.waterY,
      lipY: layout.pool.lipY,
      floorY: layout.pool.floorY,
    };
  },
});
