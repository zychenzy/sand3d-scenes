import * as THREE from 'three';
import { boot, toon, toonGradient, addBox } from './scene_lib.js';

if (new URLSearchParams(location.search).get('shot') === '1') {
  const hud = document.getElementById('hud');
  if (hud) hud.style.display = 'none';
}

const matCache = new Map();

function M(color, opts = {}) {
  const key = `${color}|${opts.side || ''}|${opts.opacity ?? ''}|${opts.map ? opts.map.uuid : ''}|${opts.emissive || ''}`;
  if (!matCache.has(key)) {
    const m = toon(color, opts);
    if (opts.map) m.map = opts.map;
    if (opts.emissive) {
      m.emissive = new THREE.Color(opts.emissive);
      m.emissiveIntensity = opts.emissiveIntensity ?? 0.45;
    }
    matCache.set(key, m);
  }
  return matCache.get(key);
}

function canvasTex(draw, w = 256, h = 256) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d'), w, h);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 4;
  return tex;
}

const tileMap = canvasTex((g, w, h) => {
  g.fillStyle = '#6e767c';
  g.fillRect(0, 0, w, h);
  for (let y = 0; y < h; y += 16) {
    g.fillStyle = '#555d63';
    g.fillRect(0, y, w, 3);
    const shift = (y / 16) % 2 === 0 ? 0 : 13;
    g.fillStyle = '#626a70';
    for (let x = shift; x < w; x += 26) g.fillRect(x, y + 3, 1.5, 13);
  }
});

const deckMap = canvasTex((g, w, h) => {
  const tones = ['#7a5438', '#704c32', '#815c3c', '#68462e'];
  for (let y = 0; y < h; y += 32) {
    g.fillStyle = tones[((y / 32) | 0) % tones.length];
    g.fillRect(0, y, w, 30);
    g.fillStyle = '#543828';
    g.fillRect(0, y + 30, w, 2);
  }
});
deckMap.repeat.set(1.4, 4);

const waterMap = canvasTex((g, w, h) => {
  g.fillStyle = '#2f4a48';
  g.fillRect(0, 0, w, h);
  g.strokeStyle = '#4d6d66';
  g.lineWidth = 3;
  for (let y = 6; y < h; y += 18) {
    g.beginPath();
    for (let x = 0; x <= w; x += 6) {
      const yy = y + Math.sin(x * 0.07 + y * 0.2) * 3.2;
      if (x === 0) g.moveTo(x, yy);
      else g.lineTo(x, yy);
    }
    g.stroke();
  }
  g.strokeStyle = '#1e3332';
  g.lineWidth = 2;
  for (let y = 16; y < h; y += 24) {
    g.beginPath();
    for (let x = 0; x <= w; x += 8) {
      const yy = y + Math.sin(x * 0.045 + 1.4) * 2.4;
      if (x === 0) g.moveTo(x, yy);
      else g.lineTo(x, yy);
    }
    g.stroke();
  }
});

const TILE = () => M('#d5dbdf', { map: tileMap });
const DECK = () => M('#c4a080', { map: deckMap });
const WATER = () => M('#d5e4df', { map: waterMap });

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

function tag(mesh, opts = {}) {
  if (opts.noCast) mesh.userData.noCast = true;
  if (opts.noReceive) mesh.userData.noReceive = true;
  return mesh;
}

function box(g, w, h, d, material, x, y, z, opts) {
  return tag(addBox(g, w, h, d, material, x, y, z), opts);
}

function limb(g, x0, y0, z0, x1, y1, z1, r0, r1, material, opts) {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const dz = z1 - z0;
  const len = Math.hypot(dx, dy, dz) || 0.001;
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(Math.max(r1, 0.004), Math.max(r0, 0.004), len, 6), material);
  mesh.position.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(dx, dy, dz).normalize());
  g.add(mesh);
  return tag(mesh, opts);
}

function ensureFacing(mesh, up) {
  const geo = mesh.geometry;
  geo.computeVertexNormals();
  const n = geo.getAttribute('normal');
  let s = 0;
  for (let i = 0; i < n.count; i += 3) s += n.getY(i);
  const wrong = up ? s < 0 : s > 0;
  if (!wrong) return;
  if (geo.index) {
    const arr = geo.index.array;
    for (let i = 0; i < arr.length; i += 3) {
      const t = arr[i];
      arr[i] = arr[i + 1];
      arr[i + 1] = t;
    }
    geo.index.needsUpdate = true;
  }
  geo.computeVertexNormals();
}

function shapeMesh(points, y, material, opts) {
  const shape = new THREE.Shape();
  points.forEach(([x, z], i) => (i === 0 ? shape.moveTo(x, z) : shape.lineTo(x, z)));
  const geo = new THREE.ShapeGeometry(shape);
  geo.rotateX(Math.PI / 2);
  const mesh = new THREE.Mesh(geo, material);
  mesh.position.y = y;
  ensureFacing(mesh, true);
  tag(mesh, opts);
  return mesh;
}

function slopeMesh(param, nu, nv, material, up) {
  const positions = [];
  const uvs = [];
  const indices = [];
  for (let j = 0; j <= nv; j++) {
    for (let i = 0; i <= nu; i++) {
      const u = i / nu;
      const v = j / nv;
      const [x, y, z] = param(u, v);
      positions.push(x, y, z);
      uvs.push(x * 0.55, v * 7);
    }
  }
  const row = nu + 1;
  for (let j = 0; j < nv; j++) {
    for (let i = 0; i < nu; i++) {
      const a = j * row + i;
      const b = a + 1;
      const c = a + row;
      const d = c + 1;
      indices.push(a, c, b, b, c, d);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  const mesh = new THREE.Mesh(geo, material);
  ensureFacing(mesh, up);
  return mesh;
}

function wallAlong(g, pts, y0, y1, thick, material) {
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i];
    const b = pts[i + 1];
    const dx = b[0] - a[0];
    const dz = b[1] - a[1];
    const len = Math.hypot(dx, dz);
    if (len < 0.04) continue;
    const mesh = box(g, thick, y1 - y0, len + 0.02, material, (a[0] + b[0]) / 2, (y0 + y1) / 2, (a[1] + b[1]) / 2);
    mesh.rotation.y = Math.atan2(dx, dz);
  }
}

function addTerrain(g, layout) {
  const land = M('#c2b39c');
  const landMesh = shapeMesh(layout.site.land, layout.site.landY, land);
  landMesh.name = 'land';
  g.add(landMesh);
  const mud = shapeMesh(layout.site.water, -1.02, M('#243432'), { noCast: true });
  g.add(mud);
  const water = shapeMesh(layout.site.water, layout.site.waterY, WATER(), { noCast: true });
  water.name = 'water';
  g.add(water);
  const fs = layout.site.farShore;
  box(
    g,
    fs.x1 - fs.x0,
    0.36,
    fs.z1 - fs.z0,
    M('#b7a892'),
    (fs.x0 + fs.x1) / 2,
    fs.y - 0.1,
    (fs.z0 + fs.z1) / 2,
    { noCast: true }
  );
  for (const line of layout.site.shoreWalls) {
    wallAlong(g, line, -0.58, 0.07, 0.22, M('#a89c8c'));
  }
  const grassCols = ['#6e7b55', '#627252', '#78865e'];
  const patches = [
    [-8.6, 6.6, 2.4, 1.6],
    [-6.4, 3.4, 1.7, 1.2],
    [8.6, 5.2, 2.6, 1.7],
    [9.4, -0.4, 1.8, 1.3],
    [-3.4, 7.4, 1.6, 1.15],
    [4.6, 7.2, 1.8, 1.2],
    [-0.4, -9.6, 3.4, 1.5],
    [5.5, -9.2, 2.8, 1.3],
  ];
  const circle = new THREE.CircleGeometry(1, 18);
  patches.forEach((p, i) => {
    const mesh = new THREE.Mesh(circle, M(grassCols[i % grassCols.length]));
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(p[0], p[1] < -7 ? -0.06 : 0.025, p[1]);
    mesh.scale.set(p[2], p[3], 1);
    tag(mesh, { noCast: true });
    g.add(mesh);
  });
  const hillGeo = new THREE.SphereGeometry(1, 18, 12);
  const h1 = new THREE.Mesh(hillGeo, M('#d4c5b2'));
  h1.position.set(-3, -0.6, -15.2);
  h1.scale.set(16, 2.3, 4.6);
  tag(h1, { noCast: true, noReceive: true });
  g.add(h1);
  const h2 = new THREE.Mesh(hillGeo, M('#cbbca8'));
  h2.position.set(11, -1.1, -16.4);
  h2.scale.set(11, 1.7, 4);
  tag(h2, { noCast: true, noReceive: true });
  g.add(h2);
}

function layPath(g, pts, seed) {
  const rand = mulberry32(seed);
  const colors = [M('#c4b7a4'), M('#b7ab9c'), M('#cbbfae'), M('#aea394')];
  const segs = [];
  let total = 0;
  for (let i = 0; i < pts.length - 1; i++) {
    const len = Math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]);
    segs.push({ a: pts[i], b: pts[i + 1], len, start: total });
    total += len;
  }
  for (let d = 0.28; d < total - 0.15; d += 0.7) {
    const seg = segs.find((s) => d >= s.start && d <= s.start + s.len + 0.001);
    if (!seg || seg.len < 0.001) continue;
    const t = (d - seg.start) / seg.len;
    const x = seg.a[0] + (seg.b[0] - seg.a[0]) * t;
    const z = seg.a[1] + (seg.b[1] - seg.a[1]) * t;
    const dx = seg.b[0] - seg.a[0];
    const dz = seg.b[1] - seg.a[1];
    const yaw = Math.atan2(dx, dz);
    const px = -dz / seg.len;
    const pz = dx / seg.len;
    for (const side of [-1, 1]) {
      const off = side * 0.3 + (rand() - 0.5) * 0.035;
      const mesh = box(g, 0.46, 0.045, 0.58, colors[(rand() * 4) | 0], x + px * off, 0.034, z + pz * off);
      mesh.rotation.y = yaw + (rand() - 0.5) * 0.08;
    }
  }
}

function addSteps(g, steps) {
  const stone = M('#b3a794');
  const stoneD = M('#8f8678');
  const width = steps.x1 - steps.x0;
  const cx = (steps.x0 + steps.x1) / 2;
  for (let i = 1; i <= steps.count; i++) {
    const top = -steps.riser * i;
    const front = steps.zTop - steps.tread * i;
    const back = steps.zTop - steps.tread * (i - 1);
    const depth = back - front;
    const mesh = box(g, width + 0.12, top - (-0.82), depth + 0.04, i % 2 ? stone : stoneD, cx, (top - 0.82) / 2, (front + back) / 2);
    mesh.name = `step_${i}`;
  }
  const lip = box(g, width + 0.08, steps.riser + 0.02, 0.1, stoneD, cx, -steps.riser / 2 + 0.01, steps.zTop + 0.02);
  lip.name = 'step_riser';
  const landFront = steps.zTop - steps.tread * steps.count;
  const landDepth = steps.landing;
  box(
    g,
    width + 0.16,
    -steps.riser * steps.count - (-0.86),
    landDepth,
    stone,
    cx,
    (-steps.riser * steps.count - 0.86) / 2,
    landFront - landDepth / 2
  );
}

function ribbonMesh(positions, indices, material) {
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  const mesh = new THREE.Mesh(geo, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function addBridge(g, b) {
  const p0 = new THREE.Vector3(...b.start);
  const p1 = new THREE.Vector3(...b.end);
  const stone = M('#b0a494');
  const stoneD = M('#8c8276');
  const spanX = p1.x - p0.x;
  const spanZ = p1.z - p0.z;
  const dir = new THREE.Vector3(spanX, 0, spanZ).normalize();
  const side = new THREE.Vector3(-dir.z, 0, dir.x);
  const n = 28;
  const thick = 0.15;
  const halfW = b.width / 2;

  function station(i) {
    const t = i / n;
    const y = b.deckY + Math.sin(Math.PI * t) * b.rise;
    const tan = new THREE.Vector3(spanX, Math.cos(Math.PI * t) * Math.PI * b.rise, spanZ).normalize();
    const up = new THREE.Vector3().crossVectors(side, tan).normalize();
    if (up.y < 0) up.negate();
    return { c: new THREE.Vector3(p0.x + spanX * t, y, p0.z + spanZ * t), up };
  }

  const deckPos = [];
  const deckIdx = [];
  const deckV = [];
  const push = (arr, v) => {
    arr.push(v.x, v.y, v.z);
    return arr.length / 3 - 1;
  };
  for (let i = 0; i <= n; i++) {
    const s = station(i);
    const L = side.clone().multiplyScalar(halfW);
    const top = s.c;
    const bot = s.c.clone().addScaledVector(s.up, -thick);
    deckV.push([
      push(deckPos, top.clone().add(L)),
      push(deckPos, top.clone().sub(L)),
      push(deckPos, bot.clone().add(L)),
      push(deckPos, bot.clone().sub(L)),
    ]);
  }
  for (let i = 0; i < n; i++) {
    const a = deckV[i];
    const c = deckV[i + 1];
    deckIdx.push(a[0], c[0], a[1], a[1], c[0], c[1]);
    deckIdx.push(a[2], a[3], c[2], a[3], c[3], c[2]);
    deckIdx.push(a[0], a[2], c[0], a[2], c[2], c[0]);
    deckIdx.push(a[1], c[1], a[3], a[3], c[1], c[3]);
  }
  const deck = ribbonMesh(deckPos, deckIdx, stone);
  deck.name = 'bridge';
  g.add(deck);

  for (const sign of [-1, 1]) {
    const railPos = [];
    const railIdx = [];
    const railV = [];
    const railH = 0.26;
    const railT = 0.08;
    for (let i = 0; i <= n; i++) {
      const s = station(i);
      const outer = side.clone().multiplyScalar(sign * halfW);
      const inner = side.clone().multiplyScalar(sign * (halfW - railT));
      const top = s.c.clone().add(new THREE.Vector3(0, railH, 0));
      railV.push([
        push(railPos, s.c.clone().add(outer)),
        push(railPos, s.c.clone().add(inner)),
        push(railPos, top.clone().add(outer)),
        push(railPos, top.clone().add(inner)),
      ]);
    }
    for (let i = 0; i < n; i++) {
      const a = railV[i];
      const c = railV[i + 1];
      railIdx.push(a[0], c[0], a[2], a[2], c[0], c[2]);
      railIdx.push(a[1], a[3], c[1], a[3], c[3], c[1]);
      railIdx.push(a[2], c[2], a[3], a[3], c[2], c[3]);
    }
    g.add(ribbonMesh(railPos, railIdx, stoneD));
  }

  for (const p of [p0, p1]) {
    box(g, 0.95, 0.38, 0.72, stoneD, p.x, -0.06, p.z);
  }
}

function addPavilion(g, layout) {
  const p = layout.pavilion;
  const grp = new THREE.Group();
  grp.name = 'pavilion';
  grp.position.set(p.center[0], 0, p.center[1]);
  const timber = M('#5c3c28');
  const timberD = M('#4a3122');
  const wood = M('#7a5438');
  const woodD = M('#6b4932');
  const stone = M('#b7ad9e');
  const [sw, sd] = p.stone;
  box(grp, sw, p.stoneTop, sd, stone, 0, p.stoneTop / 2, 0);
  const deck = box(grp, sw - 0.36, p.deckTop - p.stoneTop, sd - 0.28, DECK(), 0, (p.stoneTop + p.deckTop) / 2, 0);
  deck.name = 'deck';
  const Ex = p.eave[0] / 2;
  const Ez = p.eave[1] / 2;
  const ridgeHalf = Ex - Ez;
  function eaveYAt(ax, az) {
    const onLong = Math.abs(Math.abs(az) - Ez) <= Math.abs(Math.abs(ax) - Ex) + 1e-6;
    const t = onLong ? Math.abs(ax) / Ex : Math.abs(az) / Ez;
    return p.eaveY + p.lift * Math.pow(Math.min(1, t), 1.8);
  }
  function roofY(v, yE) {
    return p.ridgeY * (1 - v) + yE * v - p.sag * Math.sin(Math.PI * v);
  }
  const slopes = [
    (u, v) => {
      const xE = -Ex + u * 2 * Ex;
      const x = (-ridgeHalf + u * 2 * ridgeHalf) * (1 - v) + xE * v;
      return [x, roofY(v, eaveYAt(xE, Ez)), Ez * v];
    },
    (u, v) => {
      const xE = -Ex + u * 2 * Ex;
      const x = (-ridgeHalf + u * 2 * ridgeHalf) * (1 - v) + xE * v;
      return [x, roofY(v, eaveYAt(xE, -Ez)), -Ez * v];
    },
    (u, v) => {
      const zE = -Ez + u * 2 * Ez;
      const x = -ridgeHalf + (-Ex + ridgeHalf) * v;
      return [x, roofY(v, eaveYAt(-Ex, zE)), zE * v];
    },
    (u, v) => {
      const zE = -Ez + u * 2 * Ez;
      const x = ridgeHalf + (Ex - ridgeHalf) * v;
      return [x, roofY(v, eaveYAt(Ex, zE)), zE * v];
    },
  ];
  const tileMat = TILE();
  const soffitMat = M('#7a5236');
  for (const fn of slopes) {
    const top = slopeMesh(fn, 16, 12, tileMat, true);
    grp.add(top);
    const soffit = slopeMesh((u, v) => {
      const q = fn(u, v);
      q[1] -= 0.06;
      return q;
    }, 8, 6, soffitMat, false);
    tag(soffit, { noCast: true });
    grp.add(soffit);
  }
  const roll = M('#7c858b');
  const ridge = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, ridgeHalf * 2, 8), roll);
  ridge.rotation.z = Math.PI / 2;
  ridge.position.set(0, p.ridgeY + 0.06, 0);
  grp.add(ridge);
  limb(grp, ridgeHalf, p.ridgeY + 0.06, 0, ridgeHalf + 0.22, p.ridgeY + 0.24, 0, 0.06, 0.035, roll);
  limb(grp, -ridgeHalf, p.ridgeY + 0.06, 0, -ridgeHalf - 0.22, p.ridgeY + 0.24, 0, 0.06, 0.035, roll);
  const hips = [
    [ridgeHalf, Ex, Ez],
    [ridgeHalf, Ex, -Ez],
    [-ridgeHalf, -Ex, Ez],
    [-ridgeHalf, -Ex, -Ez],
  ];
  for (const [rx, ex, ez] of hips) {
    let prev = null;
    for (let i = 0; i <= 7; i++) {
      const v = i / 7;
      const x = rx + (ex - rx) * v;
      const z = ez * v;
      const y = roofY(v, eaveYAt(ex, ez)) + 0.045;
      if (prev) limb(grp, prev[0], prev[1], prev[2], x, y, z, 0.045, 0.04, roll);
      prev = [x, y, z];
    }
  }
  for (const x of p.postXs) {
    for (const z of p.postZs) {
      box(grp, 0.28, 0.08, 0.28, stone, x, p.deckTop + 0.04, z);
      box(grp, p.postSize, p.postTop - p.deckTop - 0.08, p.postSize, timber, x, (p.postTop + p.deckTop + 0.08) / 2, z);
      box(grp, 0.22, 0.06, 0.22, timberD, x, p.postTop - 0.03, z);
      box(grp, 0.16, 0.05, 0.16, timber, x, p.postTop + 0.02, z);
    }
  }
  const beamY = p.postTop + 0.08;
  for (const z of p.postZs) {
    box(grp, p.postXs[2] - p.postXs[0] + 0.2, p.beam, 0.12, timberD, 0, beamY, z);
  }
  for (const x of p.postXs) {
    box(grp, 0.12, p.beam, p.postZs[1] - p.postZs[0] + 0.12, timberD, x, beamY, 0);
  }
  const rafterMat = M('#6d4a32');
  function eaveRafters(fixed, along, span0, span1, sign) {
    for (let a = span0; a <= span1 + 0.01; a += 0.58) {
      const yE = eaveYAt(fixed === 'x' ? sign * Ex : a, fixed === 'z' ? sign * Ez : a) - 0.1;
      if (fixed === 'z') {
        limb(grp, a, beamY - 0.02, sign * 1.35, a, yE, sign * (Ez + 0.04), 0.03, 0.028, rafterMat, { noCast: true });
      } else {
        limb(grp, sign * 1.35, beamY - 0.02, a, sign * (Ex + 0.04), yE, a, 0.03, 0.028, rafterMat, { noCast: true });
      }
    }
  }
  eaveRafters('z', 'x', -Ex + 0.3, Ex - 0.3, 1);
  eaveRafters('z', 'x', -Ex + 0.3, Ex - 0.3, -1);
  eaveRafters('x', 'z', -Ez + 0.3, Ez - 0.3, 1);
  eaveRafters('x', 'z', -Ez + 0.3, Ez - 0.3, -1);
  const fascia = M('#6a7278');
  const eaveEdge = (x0, z0, x1, z1, steps) => {
    let prev = null;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const x = x0 + (x1 - x0) * t;
      const z = z0 + (z1 - z0) * t;
      const y = eaveYAt(x, z) - 0.03;
      if (prev) limb(grp, prev[0], prev[1], prev[2], x, y, z, 0.04, 0.04, fascia);
      prev = [x, y, z];
    }
  };
  eaveEdge(-Ex, Ez, Ex, Ez, 16);
  eaveEdge(-Ex, -Ez, Ex, -Ez, 16);
  eaveEdge(-Ex, -Ez, -Ex, Ez, 12);
  eaveEdge(Ex, -Ez, Ex, Ez, 12);
  const railZ = -sd / 2 + 0.08;
  for (let x = -sw / 2 + 0.35; x <= sw / 2 - 0.3; x += 0.72) {
    box(grp, 0.06, 0.46, 0.06, timber, x, p.deckTop + 0.23, railZ);
  }
  box(grp, sw - 0.5, 0.05, 0.05, timberD, 0, p.deckTop + 0.44, railZ);
  box(grp, sw - 0.5, 0.035, 0.04, timber, 0, p.deckTop + 0.24, railZ);
  box(grp, 1.7, 0.11, 0.4, stone, 0.15, 0.055, sd / 2 + 0.18);
  const lantern = new THREE.MeshToonMaterial({
    color: '#a34038',
    gradientMap: toonGradient,
    emissive: new THREE.Color('#6a2422'),
    emissiveIntensity: 0.5,
  });
  for (const lp of [[-1.25, -0.3], [1.55, 0.2]]) {
    const lamp = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.08, 0.16, 8), lantern);
    lamp.position.set(lp[0], 2.22, lp[1]);
    tag(lamp, { noCast: true });
    grp.add(lamp);
    box(grp, 0.015, 0.42, 0.015, timberD, lp[0], 2.42, lp[1], { noCast: true });
  }
  g.add(grp);
}

function addGaiwan(parent, x, y, z) {
  const cup = M('#f3f0e8');
  const tea = M('#6d7a48');
  const saucer = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.048, 0.01, 12), cup);
  saucer.position.set(x, y + 0.006, z);
  tag(saucer, { noCast: true });
  parent.add(saucer);
  const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.028, 0.038, 12), cup);
  bowl.position.set(x, y + 0.028, z);
  tag(bowl, { noCast: true });
  parent.add(bowl);
  const liquid = new THREE.Mesh(new THREE.CircleGeometry(0.032, 10), tea);
  liquid.rotation.x = -Math.PI / 2;
  liquid.position.set(x, y + 0.042, z);
  tag(liquid, { noCast: true, noReceive: true });
  parent.add(liquid);
}

function addTeapot(parent, x, y, z, color) {
  const mat = M(color);
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.065, 12, 10), mat);
  body.scale.set(1, 0.82, 1);
  body.position.set(x, y + 0.07, z);
  parent.add(body);
  const lid = new THREE.Mesh(new THREE.SphereGeometry(0.04, 10, 8), mat);
  lid.scale.y = 0.45;
  lid.position.set(x, y + 0.115, z);
  parent.add(lid);
  const knob = new THREE.Mesh(new THREE.SphereGeometry(0.012, 8, 6), mat);
  knob.position.set(x, y + 0.132, z);
  parent.add(knob);
  const handle = new THREE.Mesh(new THREE.TorusGeometry(0.04, 0.007, 6, 10, Math.PI), mat);
  handle.position.set(x + 0.07, y + 0.07, z);
  handle.rotation.z = -Math.PI / 2;
  parent.add(handle);
  limb(parent, x - 0.04, y + 0.08, z, x - 0.11, y + 0.1, z - 0.02, 0.012, 0.008, mat, { noCast: true });
}

function addTable(g, t, tableH) {
  const grp = new THREE.Group();
  grp.name = t.id;
  grp.position.set(t.position[0], t.position[1], t.position[2]);
  const s = t.size;
  const top = M('#7a5438');
  const dark = M('#5c3e2a');
  box(grp, s, 0.045, s, top, 0, tableH, 0);
  box(grp, s * 0.55, 0.008, s * 0.34, M('#8d4540'), 0, tableH + 0.026, 0, { noCast: true });
  for (const [x, z, w, d] of [
    [0, s / 2 - 0.03, s - 0.08, 0.03],
    [0, -s / 2 + 0.03, s - 0.08, 0.03],
  ]) {
    box(grp, w, 0.07, d, dark, x, tableH - 0.05, z);
  }
  for (const x of [-1, 1]) {
    box(grp, 0.03, 0.07, s - 0.12, dark, x * (s / 2 - 0.03), tableH - 0.05, 0);
  }
  const inset = s / 2 - 0.08;
  for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    box(grp, 0.055, tableH - 0.04, 0.055, dark, x * inset, (tableH - 0.04) / 2, z * inset);
  }
  if (t.service === 'full') {
    addTeapot(grp, -0.12, tableH + 0.02, 0.02, '#d7ddd4');
    addGaiwan(grp, 0.18, tableH + 0.02, 0.12);
    addGaiwan(grp, 0.16, tableH + 0.02, -0.16);
    addGaiwan(grp, -0.22, tableH + 0.02, -0.14);
  } else if (t.service === 'pot') {
    addTeapot(grp, 0.02, tableH + 0.02, -0.04, '#f4f1ea');
    addGaiwan(grp, -0.16, tableH + 0.02, 0.12);
    addGaiwan(grp, 0.16, tableH + 0.02, 0.1);
  } else {
    addGaiwan(grp, -0.1, tableH + 0.02, 0.06);
    addGaiwan(grp, 0.12, tableH + 0.02, -0.08);
  }
  g.add(grp);
}

function addChair(g, c, seatH) {
  const grp = new THREE.Group();
  grp.name = c.id;
  grp.position.set(c.position[0], c.position[1], c.position[2]);
  grp.rotation.y = c.rotationY;
  const bamboo = M('#a8844a');
  const node = M('#7a5a30');
  const slat = M('#b08a52');
  const feet = [[-0.18, -0.16], [0.18, -0.16], [-0.18, 0.16], [0.18, 0.16]];
  for (const [x, z] of feet) {
    limb(grp, x * 1.08, 0, z * 1.05, x * 0.96, seatH, z * 0.96, 0.018, 0.015, bamboo);
    const ring = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.012, 6), node);
    ring.position.set(x, seatH * 0.45, z);
    grp.add(ring);
  }
  limb(grp, -0.18, 0.12, -0.16, 0.18, 0.12, -0.16, 0.01, 0.01, bamboo, { noCast: true });
  limb(grp, -0.18, 0.12, 0.16, 0.18, 0.12, 0.16, 0.01, 0.01, bamboo, { noCast: true });
  for (let i = 0; i < 5; i++) {
    box(grp, 0.36, 0.012, 0.048, slat, 0, seatH + 0.008, -0.15 + i * 0.075, { noCast: true });
  }
  box(grp, 0.34, 0.018, 0.3, M(c.cushion || '#8d4540'), 0, seatH + 0.02, 0.01, { noCast: true });
  for (const x of [-0.2, 0.2]) {
    limb(grp, x, seatH, -0.16, x, 0.66, 0.16, 0.016, 0.015, bamboo);
    limb(grp, x, 0.66, -0.18, x, 0.66, 0.2, 0.016, 0.016, bamboo);
  }
  limb(grp, -0.16, seatH, 0.16, -0.17, 0.94, 0.25, 0.016, 0.013, bamboo);
  limb(grp, 0.16, seatH, 0.16, 0.17, 0.94, 0.25, 0.016, 0.013, bamboo);
  for (let i = -2; i <= 2; i++) {
    limb(grp, i * 0.07, seatH + 0.02, 0.17, i * 0.07, 0.9, 0.24, 0.008, 0.007, bamboo, { noCast: true });
  }
  let prev = null;
  for (let i = 0; i <= 4; i++) {
    const t = i / 4;
    const pt = [-0.18 + t * 0.36, 0.9 + Math.sin(t * Math.PI) * 0.055, 0.25];
    if (prev) limb(grp, prev[0], prev[1], prev[2], pt[0], pt[1], pt[2], 0.014, 0.014, bamboo);
    prev = pt;
  }
  g.add(grp);
}

function addCounter(g, c) {
  const grp = new THREE.Group();
  grp.name = 'counter';
  grp.position.set(c.position[0], 0, c.position[2]);
  grp.rotation.y = c.rotationY;
  const L = c.length;
  const D = c.depth;
  const H = c.height;
  const timber = M('#5c3c28');
  const top = M('#6e4e36');
  box(grp, L, 0.06, D, top, 0, H - 0.03, 0);
  box(grp, L - 0.06, H - 0.22, 0.04, timber, 0, (H - 0.22) / 2 + 0.02, -D / 2 + 0.04);
  box(grp, 0.04, H - 0.16, D - 0.08, timber, -L / 2 + 0.04, (H - 0.16) / 2, 0);
  box(grp, 0.04, H - 0.16, D - 0.08, timber, L / 2 - 0.04, (H - 0.16) / 2, 0);
  box(grp, L - 0.16, 0.04, D - 0.18, M('#5a4030'), 0, 0.38, 0.02);
  for (const x of [-L / 2 + 0.08, L / 2 - 0.08]) {
    box(grp, 0.06, H - 0.06, 0.06, timber, x, (H - 0.06) / 2, D / 2 - 0.08);
    box(grp, 0.06, H - 0.06, 0.06, timber, x, (H - 0.06) / 2, -D / 2 + 0.08);
  }
  addTeapot(grp, -0.55, H, 0.02, '#d5dbd2');
  const kettle = M('#8a8680');
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.075, 0.16, 10), kettle);
  body.position.set(-0.05, H + 0.1, 0.02);
  grp.add(body);
  limb(grp, -0.05, H + 0.14, 0.02, -0.05, H + 0.2, -0.28, 0.012, 0.008, kettle, { noCast: true });
  const handle = new THREE.Mesh(new THREE.TorusGeometry(0.055, 0.007, 6, 8, Math.PI), kettle);
  handle.rotation.x = Math.PI / 2;
  handle.position.set(-0.05, H + 0.2, 0.02);
  grp.add(handle);
  for (let i = 0; i < 4; i++) addGaiwan(grp, 0.42, H + i * 0.012, -0.02);
  for (let i = 0; i < 5; i++) {
    const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.026, 0.03, 8), M('#f3f0e8'));
    cup.position.set(-0.7 + i * 0.16, 0.42, 0.02);
    tag(cup, { noCast: true });
    grp.add(cup);
  }
  const jar = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.05, 0.11, 10), M('#6b3a2c'));
  jar.position.set(0.72, H + 0.07, 0.04);
  grp.add(jar);
  const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.048, 0.048, 0.02, 10), M('#c2a15a'));
  lid.position.set(0.72, H + 0.135, 0.04);
  grp.add(lid);
  const board = new THREE.Group();
  box(board, 0.46, 0.62, 0.02, M('#efe6d4'), 0, 0, 0, { noCast: true });
  for (let i = 0; i < 4; i++) box(board, 0.32, 0.012, 0.008, M('#8a5a3a'), 0, 0.16 - i * 0.12, 0.012, { noCast: true, noReceive: true });
  board.position.set(0.15, H + 0.42, D / 2 - 0.02);
  board.rotation.x = -0.15;
  grp.add(board);
  for (let i = 0; i < 7; i++) {
    const x = -L / 2 + 0.18 + i * (L - 0.3) / 6;
    limb(grp, x, 0, D / 2 + 0.08, x + (i % 2 ? 0.04 : -0.03), 1.35, D / 2 + 0.1, 0.018, 0.014, M('#7d8a56'));
  }
  limb(grp, -L / 2 + 0.1, 1.28, D / 2 + 0.1, L / 2 - 0.1, 1.28, D / 2 + 0.1, 0.012, 0.012, M('#6a5430'), { noCast: true });
  g.add(grp);
}

const leafGeo = new THREE.ShapeGeometry((() => {
  const s = new THREE.Shape();
  s.moveTo(0, 0.5);
  s.bezierCurveTo(0.11, 0.2, 0.09, -0.22, 0, -0.5);
  s.bezierCurveTo(-0.09, -0.22, -0.11, 0.2, 0, 0.5);
  return s;
})());
const rockGeo = new THREE.DodecahedronGeometry(0.5, 0);

function hangLeaf(g, material, x, y, z, rand, scale) {
  const leaf = new THREE.Mesh(leafGeo, material);
  const w = (0.85 + rand() * 0.45) * scale;
  const h = (0.42 + rand() * 0.28) * scale;
  leaf.scale.set(w, h, 1);
  leaf.position.set(x + (rand() - 0.5) * 0.05, y - h * 0.35, z + (rand() - 0.5) * 0.05);
  leaf.rotation.set((rand() - 0.5) * 0.3, rand() * Math.PI, (rand() - 0.5) * 0.25);
  tag(leaf, { noCast: true, noReceive: true });
  g.add(leaf);
}

function addWillow(g, spec) {
  const rand = mulberry32(spec.seed);
  const [x, y, z] = spec.position;
  const trunk = M(spec.bark || '#5a4636');
  const leaves = [
    M(spec.leaf, { side: THREE.DoubleSide }),
    M('#6a7a4e', { side: THREE.DoubleSide }),
    M('#4a5c38', { side: THREE.DoubleSide }),
  ];
  const scale = spec.height / 6;
  let px = x;
  let py = y;
  let pz = z;
  const n = 5;
  for (let i = 0; i < n; i++) {
    const len = spec.height * 0.15;
    const nx = px + spec.lean[0] * len * 0.7;
    const ny = py + len * (0.92 - i * 0.04);
    const nz = pz + spec.lean[1] * len * 0.6;
    limb(g, px, py, pz, nx, ny, nz, 0.11 * (1 - i / n) + 0.028, 0.11 * (1 - (i + 1) / n) + 0.024, trunk);
    px = nx;
    py = ny;
    pz = nz;
  }
  for (let i = 0; i < spec.density; i++) {
    const ang = (i / spec.density) * Math.PI * 2 + rand() * 0.4;
    const reach = spec.height * (0.22 + rand() * 0.16);
    const tip = {
      x: px + Math.cos(ang) * reach * 0.85 + spec.lean[0] * spec.height * 0.18,
      y: py + spec.height * 0.04,
      z: pz + Math.sin(ang) * reach * 0.55 + spec.lean[1] * spec.height * 0.16,
    };
    limb(g, px, py - rand() * 0.2, pz, tip.x, tip.y, tip.z, 0.026, 0.012, trunk);
    const strands = 3 + ((rand() * 3) | 0);
    for (let s = 0; s < strands; s++) {
      let sx = tip.x + (rand() - 0.5) * 0.18;
      let sy = tip.y - rand() * 0.05;
      let sz = tip.z + (rand() - 0.5) * 0.18;
      const segs = 4 + ((rand() * 3) | 0);
      for (let k = 0; k < segs; k++) {
        const fall = spec.height * (0.038 + k * 0.016);
        const nx = sx + spec.lean[0] * 0.05 + (rand() - 0.5) * 0.05;
        const ny = sy - fall;
        const nz = sz + spec.lean[1] * 0.04 + (rand() - 0.5) * 0.05;
        limb(g, sx, sy, sz, nx, ny, nz, 0.008, 0.004, trunk, { noCast: true });
        hangLeaf(g, leaves[(k + s) % 3], nx, ny, nz, rand, scale);
        if (k > 1) hangLeaf(g, leaves[(k + 1) % 3], nx + 0.03, ny - 0.02, nz, rand, scale * 0.85);
        sx = nx;
        sy = ny;
        sz = nz;
      }
    }
  }
}

function addBambooGrove(g, spec) {
  const rand = mulberry32(spec.seed);
  const culm = M('#7f8a58');
  const node = M('#5e6840');
  const leaf = M(spec.leaf, { side: THREE.DoubleSide });
  const gy = spec.groundY || 0;
  for (let i = 0; i < spec.count; i++) {
    const x = spec.origin[0] + (rand() - 0.5) * spec.spread;
    const z = spec.origin[1] + (rand() - 0.5) * spec.spread * 0.75;
    const h = spec.hMin + rand() * (spec.hMax - spec.hMin);
    const lean = (rand() - 0.5) * 0.35;
    const r = 0.02 + rand() * 0.018;
    limb(g, x, gy, z, x + lean, gy + h, z + lean * 0.35, r, r * 0.62, culm, spec.cast ? {} : { noCast: true });
    const nodes = 2 + ((rand() * 3) | 0);
    for (let k = 1; k <= nodes; k++) {
      const t = k / (nodes + 1);
      const ring = new THREE.Mesh(new THREE.CylinderGeometry(r * 1.35, r * 1.35, 0.02, 6), node);
      ring.position.set(x + lean * t, gy + h * t, z + lean * 0.35 * t);
      if (!spec.cast) tag(ring, { noCast: true });
      g.add(ring);
    }
    if (rand() > 0.22) {
      for (let k = 0; k < 5; k++) {
        const card = new THREE.Mesh(leafGeo, leaf);
        card.position.set(x + lean + (rand() - 0.5) * 0.3, gy + h - 0.05 - rand() * 0.25, z + (rand() - 0.5) * 0.3);
        card.scale.set(0.18 + rand() * 0.16, 0.42 + rand() * 0.3, 1);
        card.rotation.set(-0.6 + rand() * 0.4, rand() * 6, (rand() - 0.5) * 0.8);
        tag(card, { noCast: true, noReceive: true });
        g.add(card);
      }
    }
  }
}

function addRocks(g, rocks) {
  const cols = [M('#8b8378'), M('#6a635c'), M('#7d8668'), M('#9a9186')];
  for (const spec of rocks) {
    const rand = mulberry32(spec.seed);
    const n = spec.pieces || 3;
    for (let i = 0; i < n; i++) {
      const mesh = new THREE.Mesh(rockGeo, cols[(spec.seed + i) % cols.length]);
      const sc = spec.scale.map((v, k) => v * (i === 0 ? 1 : 0.4 + rand() * 0.45));
      const ox = i === 0 ? 0 : (rand() - 0.5) * spec.scale[0] * 1.3;
      const oz = i === 0 ? 0 : (rand() - 0.5) * spec.scale[2] * 1.3;
      mesh.scale.set(sc[0], sc[1], sc[2]);
      mesh.position.set(spec.position[0] + ox, spec.position[1] + sc[1] * 0.32, spec.position[2] + oz);
      mesh.rotation.set(rand() * 0.6, spec.rot + rand(), rand() * 0.5);
      g.add(mesh);
    }
  }
}

function addReeds(g, clump) {
  const rand = mulberry32(clump.seed);
  const stem = M('#6d7a52');
  const head = M('#8a8058');
  const n = 8 + ((rand() * 5) | 0);
  for (let i = 0; i < n; i++) {
    const x = clump.position[0] + (rand() - 0.5) * 0.55;
    const z = clump.position[1] + (rand() - 0.5) * 0.4;
    const h = 0.45 + rand() * 0.7;
    limb(g, x, -0.05, z, x + (rand() - 0.5) * 0.08, h, z + (rand() - 0.5) * 0.08, 0.008, 0.004, stem, { noCast: true });
    const tip = new THREE.Mesh(new THREE.ConeGeometry(0.02, 0.08, 5), head);
    tip.position.set(x, h + 0.03, z);
    tip.rotation.z = (rand() - 0.5) * 0.4;
    tag(tip, { noCast: true, noReceive: true });
    g.add(tip);
  }
}

function addPlanterPlant(g, inst, index) {
  const x = inst.position[0];
  const z = inst.position[2];
  if (index === 0) {
    const culm = M('#7f8a58');
    for (let i = 0; i < 5; i++) {
      const ox = (i - 2) * 0.045;
      const h = 0.45 + (i % 3) * 0.12;
      limb(g, x + ox, 0.22, z, x + ox + 0.03, 0.22 + h, z + (i % 2 ? 0.04 : -0.02), 0.01, 0.007, culm, { noCast: true });
    }
  } else {
    const cols = [M('#4e6240', { side: THREE.DoubleSide }), M('#62784c', { side: THREE.DoubleSide }), M('#3e5236', { side: THREE.DoubleSide })];
    const rand = mulberry32(31);
    for (let i = 0; i < 7; i++) {
      const leaf = new THREE.Mesh(leafGeo, cols[i % 3]);
      const h = 0.22 + rand() * 0.2;
      leaf.scale.set(0.12 + rand() * 0.06, h, 1);
      leaf.position.set(x + (rand() - 0.5) * 0.14, 0.28 + h * 0.35, z + (rand() - 0.5) * 0.14);
      leaf.rotation.set((rand() - 0.5) * 0.4, rand() * 6, (rand() - 0.5) * 0.5);
      tag(leaf, { noCast: true, noReceive: true });
      g.add(leaf);
    }
  }
}

function addPebbles(g, layout) {
  const rand = mulberry32(41);
  const cols = [M('#8d857a'), M('#6e6860'), M('#7a756c')];
  const line = layout.site.water;
  for (let i = 0; i < 28; i++) {
    const p = line[(rand() * line.length) | 0];
    const mesh = new THREE.Mesh(rockGeo, cols[i % 3]);
    const s = 0.08 + rand() * 0.1;
    mesh.scale.set(s * (1 + rand()), s * 0.45, s * (1 + rand()));
    mesh.position.set(p[0] + (rand() - 0.5) * 0.35, layout.site.waterY + 0.04, p[1] + (rand() - 0.5) * 0.25);
    mesh.rotation.y = rand() * 6;
    tag(mesh, { noCast: true });
    g.add(mesh);
  }
}

function build(layout) {
  const g = new THREE.Group();
  g.name = 'site';
  addTerrain(g, layout);
  layPath(g, layout.paths.main, 3);
  layPath(g, layout.paths.side, 7);
  addSteps(g, layout.steps);
  addPavilion(g, layout);
  addBridge(g, layout.bridge);
  const seatH = layout.furniture.seatHeight;
  const tableH = layout.furniture.tableHeight;
  for (const t of layout.furniture.tables) addTable(g, t, tableH);
  for (const c of layout.furniture.chairs) addChair(g, c, seatH);
  addCounter(g, layout.furniture.counter);
  for (const tree of layout.trees) addWillow(g, tree);
  for (const grove of layout.bamboo) addBambooGrove(g, grove);
  addRocks(g, layout.rocks);
  for (const clump of layout.reeds) addReeds(g, clump);
  layout.instances.filter((i) => i.kind === 'flowerpot').forEach((p, i) => addPlanterPlant(g, p, i));
  addPebbles(g, layout);
  const edge = [
    [4.6, -0.42, -3.35, 0.7, 0.38, 0.55],
    [1.7, -0.28, -3.05, 0.48, 0.3, 0.42],
    [0.6, -0.28, -2.45, 0.5, 0.3, 0.4],
    [6.6, -0.38, -3.7, 0.6, 0.32, 0.5],
    [-0.6, -0.3, -2.85, 0.36, 0.22, 0.34],
  ];
  edge.forEach((r, i) => {
    const mesh = new THREE.Mesh(rockGeo, M(i % 2 ? '#7a746c' : '#8e877c'));
    mesh.scale.set(r[3], r[4], r[5]);
    mesh.position.set(r[0], r[1] + r[4] * 0.2, r[2]);
    mesh.rotation.y = i * 0.7;
    g.add(mesh);
  });
  const pads = [[-2.4, -3.4], [4.8, -4.2], [-7.3, 0.4]];
  pads.forEach((p, i) => {
    const pad = new THREE.Mesh(new THREE.CircleGeometry(0.16 + i * 0.03, 8), M('#4d6244'));
    pad.rotation.x = -Math.PI / 2;
    pad.position.set(p[0], layout.site.waterY + 0.015, p[1]);
    pad.scale.y = 0.72;
    tag(pad, { noCast: true, noReceive: true });
    g.add(pad);
  });
  return g;
}

boot({
  makeShell: () => new THREE.Group(),
  makeProcedural: (layout) => build(layout),
  readyText: 'ready — riverside tea pavilion · drag orbit · U unlit · T toon',
});
