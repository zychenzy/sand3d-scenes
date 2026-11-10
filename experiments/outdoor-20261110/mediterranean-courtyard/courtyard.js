import * as THREE from 'three';
import { mergeGeometries } from './vendor/utils/BufferGeometryUtils.js';
import { boot, toon } from './scene_lib.js';

const P = {
  plaster: '#efe2cc',
  plasterAge: '#e6d3b4',
  plasterPatch: '#dcc4a4',
  stain: '#d2b48c',
  brick: '#a6533c',
  brickDark: '#8a4030',
  stone: '#e2d3b8',
  stoneDark: '#cbb892',
  stoneDeep: '#b7a27e',
  mortar: '#8d7356',
  clay: '#c4623c',
  tile: '#b85a3e',
  tileDark: '#9a4632',
  wood: '#5c3a28',
  blue: '#3f6e84',
  blueDeep: '#2f5568',
  iron: '#3c4148',
  water: '#f4fffc',
  leaf: '#3e5a38',
  leafDark: '#2c4630',
  olive: '#8d986e',
  oliveLite: '#b0b892',
  oliveDark: '#5e6848',
  boug: '#c44778',
  bougDeep: '#8e3058',
  bougLite: '#e7a0b4',
  geranium: '#d24b48',
  geraniumPink: '#e08aa4',
  dust: '#cbb892',
  lane: '#c4ae86',
  cushionA: '#7a403c',
  cushionB: '#3e4d68',
};

function box(parent, w, h, d, color, x, y, z, name, extra) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), toon(color, extra));
  m.position.set(x, y, z);
  if (name) m.name = name;
  if (extra && extra.userData) Object.assign(m.userData, extra.userData);
  parent.add(m);
  return m;
}

function cyl(parent, rTop, rBot, h, color, x, y, z, seg = 10) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBot, h, seg), toon(color));
  m.position.set(x, y, z);
  parent.add(m);
  return m;
}

function canvasTex(draw, w, h, repeatX = 1, repeatY = 1) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d'), w, h);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  tex.anisotropy = 8;
  tex.needsUpdate = true;
  return tex;
}

function azulejoTexture() {
  return canvasTex((g, w, h) => {
    const n = 8;
    const tw = w / n;
    for (let i = 0; i < n; i++) {
      const x = i * tw;
      g.fillStyle = i % 2 === 0 ? '#f4f0e4' : '#f7f3ea';
      g.fillRect(x, 0, tw, h);
      g.fillStyle = '#1f4f86';
      g.beginPath();
      g.moveTo(x + tw * 0.5, h * 0.16);
      g.lineTo(x + tw * 0.82, h * 0.5);
      g.lineTo(x + tw * 0.5, h * 0.84);
      g.lineTo(x + tw * 0.18, h * 0.5);
      g.closePath();
      g.fill();
      g.fillStyle = '#d7a441';
      g.fillRect(x + tw * 0.08, h * 0.1, tw * 0.1, h * 0.1);
      g.fillRect(x + tw * 0.82, h * 0.8, tw * 0.1, h * 0.1);
      g.strokeStyle = '#1a3e68';
      g.lineWidth = 2;
      g.strokeRect(x + 1, 1, tw - 2, h - 2);
    }
  }, 512, 64, 1, 1);
}

function waterTexture() {
  return canvasTex((g, w, h) => {
    const grd = g.createRadialGradient(w * 0.5, h * 0.48, 8, w * 0.5, h * 0.5, w * 0.48);
    grd.addColorStop(0, '#163e44');
    grd.addColorStop(0.45, '#1c6468');
    grd.addColorStop(0.82, '#2f8080');
    grd.addColorStop(1, '#3e9490');
    g.fillStyle = grd;
    g.fillRect(0, 0, w, h);
    g.strokeStyle = 'rgba(210, 232, 226, 0.38)';
    g.lineWidth = 2;
    for (let r = 28; r <= 118; r += 16) {
      g.beginPath();
      g.ellipse(w * 0.5, h * 0.5, r, r * 0.62, 0, 0, Math.PI * 2);
      g.stroke();
    }
    g.strokeStyle = 'rgba(236, 244, 236, 0.45)';
    g.lineWidth = 5;
    g.beginPath();
    g.ellipse(w * 0.42, h * 0.4, 36, 11, -0.5, 0, Math.PI * 2);
    g.stroke();
    g.fillStyle = 'rgba(180, 210, 200, 0.18)';
    g.beginPath();
    g.ellipse(w * 0.62, h * 0.58, 22, 8, 0.4, 0, Math.PI * 2);
    g.fill();
  }, 256, 256);
}

function instancedBoxes(parent, geo, items, color, name, userData) {
  if (!items.length) return null;
  const mesh = new THREE.InstancedMesh(geo, toon(color), items.length);
  const m = new THREE.Matrix4();
  const s = new THREE.Vector3();
  const p = new THREE.Vector3();
  const q = new THREE.Quaternion();
  for (let i = 0; i < items.length; i++) {
    const it = items[i];
    s.set(it.sx ?? 1, it.sy ?? 1, it.sz ?? 1);
    p.set(it.x, it.y, it.z);
    q.set(0, 0, 0, 1);
    if (it.rotY) q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), it.rotY);
    m.compose(p, q, s);
    mesh.setMatrixAt(i, m);
  }
  mesh.instanceMatrix.needsUpdate = true;
  mesh.name = name;
  if (userData) Object.assign(mesh.userData, userData);
  parent.add(mesh);
  return mesh;
}

function addRunningBond(parent, x0, z0, x1, z1, topY, opts) {
  const L = opts.length;
  const W = opts.width;
  const G = opts.gap;
  const H = opts.height;
  const colors = opts.colors;
  const buckets = colors.map(() => []);
  const y = topY - H / 2;
  let row = 0;
  for (let z = z0 + G * 0.5; z + W <= z1 - G * 0.25 + 1e-4; z += W + G, row++) {
    let x = x0 + G * 0.5;
    let first = (row % 2) ? L * 0.5 : L;
    const emit = (px, len) => {
      if (len < 0.07) return;
      const cx = px + len / 2;
      const cz = z + W / 2;
      if (opts.skip && opts.skip(cx, cz)) return;
      const ci = Math.abs((row * 3 + Math.floor(px * 4)) % colors.length);
      buckets[ci].push({ x: cx, y, z: cz, sx: len / L, sy: 1, sz: 1 });
    };
    emit(x, Math.min(first, x1 - G * 0.5 - x));
    x += first + G;
    while (x + L <= x1 - G * 0.5 + 1e-4) {
      emit(x, L);
      x += L + G;
    }
    if (x1 - G * 0.5 - x > 0.07) emit(x, x1 - G * 0.5 - x);
  }
  const geo = new THREE.BoxGeometry(L, H, W);
  const ud = { noCast: true };
  colors.forEach((color, i) => {
    instancedBoxes(parent, geo, buckets[i], color, opts.name || 'pavers', ud);
  });
  const bed = box(
    parent,
    x1 - x0,
    0.04,
    z1 - z0,
    opts.bed || P.mortar,
    (x0 + x1) / 2,
    topY - H - 0.02,
    (z0 + z1) / 2,
    opts.name ? `${opts.name}-bed` : 'paver-bed',
  );
  bed.userData.noCast = true;
}

function frameBoxes(parent, x0, x1, z0, z1, y, h, t, color, name) {
  const cx = (x0 + x1) / 2;
  const cz = (z0 + z1) / 2;
  const dx = x1 - x0;
  const dz = z1 - z0;
  box(parent, dx, h, t, color, cx, y, z0 + t / 2, name);
  box(parent, dx, h, t, color, cx, y, z1 - t / 2, name);
  box(parent, t, h, dz - t * 2, color, x0 + t / 2, y, cz, name);
  box(parent, t, h, dz - t * 2, color, x1 - t / 2, y, cz, name);
}

function slopeSlab(x0, x1, z0, z1, y00, y10, y11, y01, thick) {
  const top = [
    [x0, y00, z0],
    [x1, y10, z0],
    [x1, y11, z1],
    [x0, y01, z1],
  ];
  const bot = top.map(([x, y, z]) => [x, y - thick, z]);
  const verts = [...top, ...bot].flat();
  const idx = [
    0, 2, 1, 0, 3, 2,
    4, 5, 6, 4, 6, 7,
    0, 1, 5, 0, 5, 4,
    1, 2, 6, 1, 6, 5,
    2, 3, 7, 2, 7, 6,
    3, 0, 4, 3, 4, 7,
  ];
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  return geo;
}

function addRoofTiles(parent, x0, x1, z0, z1, y0, y1, along) {
  const span = along === 'x' ? (x1 - x0) : (z1 - z0);
  const run = along === 'x' ? (z1 - z0) : (x1 - x0);
  const rows = Math.max(3, Math.round(Math.abs(run) / 0.34));
  const cols = Math.max(3, Math.round(Math.abs(span) / 0.28));
  const unit = new THREE.CylinderGeometry(0.075, 0.075, 0.34, 6, 1, false, 0, Math.PI);
  const buckets = [[], []];
  const up = new THREE.Vector3(0, 1, 0);
  for (let r = 0; r < rows; r++) {
    const t = (r + 0.5) / rows;
    const y = y0 + (y1 - y0) * t + 0.07;
    const slope = new THREE.Vector3(
      along === 'x' ? 0 : (x1 - x0),
      y1 - y0,
      along === 'x' ? (z1 - z0) : 0,
    ).normalize();
    const q = new THREE.Quaternion().setFromUnitVectors(up, slope);
    for (let c = 0; c < cols; c++) {
      const u = (c + 0.5) / cols;
      const x = along === 'x' ? x0 + (x1 - x0) * u : x0 + (x1 - x0) * t;
      const z = along === 'x' ? z0 + (z1 - z0) * t : z0 + (z1 - z0) * u;
      const lift = new THREE.Vector3(0, 0.02, 0);
      buckets[(r + c) % 2].push({ x: x + lift.x, y: y + lift.y, z: z + lift.z, q });
    }
  }
  for (let i = 0; i < buckets.length; i++) {
    const items = buckets[i];
    if (!items.length) continue;
    const geos = items.map((it) => {
      const g = unit.clone();
      const m = new THREE.Matrix4();
      m.makeRotationFromQuaternion(it.q);
      m.setPosition(it.x, it.y, it.z);
      g.applyMatrix4(m);
      return g;
    });
    const merged = mergeGeometries(geos);
    const mesh = new THREE.Mesh(merged, toon(i === 0 ? P.tile : P.tileDark));
    mesh.name = 'roof-tiles';
    mesh.userData.noCast = true;
    parent.add(mesh);
  }
  unit.dispose();
}

function addPier(parent, x, z, walkY, spring, w) {
  const baseH = 0.34;
  const capH = 0.12;
  const shaftH = spring - walkY - baseH - capH;
  box(parent, w + 0.06, baseH, w + 0.06, P.brick, x, walkY + baseH / 2, z, 'pier');
  box(parent, w, shaftH, w, P.plaster, x, walkY + baseH + shaftH / 2, z, 'pier');
  box(parent, w + 0.1, capH, w + 0.1, P.stone, x, spring - capH / 2, z, 'pier');
  box(parent, w * 0.72, baseH * 0.55, w * 0.72, P.brickDark, x, walkY + baseH * 0.28, z, 'pier');
}

function addArch(parent, x, y, z, rotY, radius, tube, top, depth) {
  const shape = new THREE.Shape();
  const hw = radius;
  shape.moveTo(-hw, 0);
  shape.lineTo(-hw, top);
  shape.lineTo(hw, top);
  shape.lineTo(hw, 0);
  shape.absarc(0, 0, hw, 0, Math.PI, false);
  const geo = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments: 14 });
  geo.translate(0, 0, -depth / 2);
  const wall = new THREE.Mesh(geo, toon(P.plaster));
  wall.position.set(x, y, z);
  wall.rotation.y = rotY;
  wall.name = 'arch-wall';
  parent.add(wall);

  const torus = new THREE.Mesh(
    new THREE.TorusGeometry(radius, tube, 8, 20, Math.PI),
    toon(P.brick),
  );
  torus.position.set(x, y, z);
  torus.rotation.y = rotY;
  torus.name = 'arch';
  parent.add(torus);
}

function addArcade(parent, site) {
  const g = new THREE.Group();
  g.name = 'arcades';
  const { walkY, pierW, spring, ceilingY } = site;
  const south = site.south;
  const west = site.west;
  const tube = 0.08;
  const spacing = south.xs[1] - south.xs[0];
  const archR = (spacing - pierW) / 2;
  const spandrelTop = ceilingY - spring;

  const wallBase = site.laneY ?? -0.16;
  const southH = 4.08 - wallBase;
  box(
    g,
    south.xs[south.xs.length - 1] - west.wallX + 0.5,
    southH,
    south.wallT,
    P.plaster,
    (south.xs[south.xs.length - 1] + west.wallX) / 2 - 0.1,
    wallBase + southH / 2,
    south.wallZ,
    'back-wall',
  );
  const westLen = west.zs[west.zs.length - 1] - south.wallZ + 0.4;
  box(
    g,
    west.wallT,
    southH,
    westLen,
    P.plaster,
    west.wallX,
    wallBase + southH / 2,
    south.wallZ + westLen / 2 - 0.05,
    'back-wall',
  );

  const house = box(
    g,
    5.55,
    1.55,
    south.wallT + 0.04,
    P.plasterAge,
    -4.95,
    4.78,
    south.wallZ - 0.01,
    'house-wall',
  );
  house.userData.noCast = false;
  box(g, 5.7, 0.1, 0.7, P.stoneDark, -4.95, 5.58, south.wallZ - 0.12, 'house-cornice');
  const houseRoof = new THREE.Mesh(
    slopeSlab(-7.85, -2.05, -7.15, -6.15, 5.95, 5.95, 5.55, 5.55, 0.1),
    toon(P.tile, { side: THREE.DoubleSide }),
  );
  houseRoof.name = 'house-roof';
  g.add(houseRoof);
  addRoofTiles(g, -7.7, -2.15, -7.05, -6.25, 5.95, 5.58, 'x');

  const win = new THREE.Group();
  win.position.set(-4.7, 4.85, south.wallZ + south.wallT * 0.5 + 0.02);
  box(win, 0.86, 1.12, 0.06, P.blueDeep, 0, 0, 0, 'window');
  box(win, 0.08, 1.2, 0.08, P.blue, -0.42, 0, 0.03, 'shutter');
  box(win, 0.08, 1.2, 0.08, P.blue, 0.42, 0, 0.03, 'shutter');
  box(win, 0.34, 1.05, 0.04, P.blue, -0.5, 0, 0.05, 'shutter');
  box(win, 0.34, 1.05, 0.04, P.blue, 0.5, 0, 0.05, 'shutter');
  win.children[3].rotation.y = 0.5;
  win.children[4].rotation.y = -0.5;
  g.add(win);

  box(g, 0.92, 2.05, 0.08, P.wood, west.wallX + west.wallT * 0.55, walkY + 1.02, -2.65, 'door');
  box(g, 1.08, 0.08, 0.12, P.stone, west.wallX + 0.28, walkY + 2.08, -2.65, 'lintel');
  box(g, 0.08, 2.05, 0.1, P.stoneDark, west.wallX + 0.28, walkY + 1.02, -3.12, 'jamb');
  box(g, 0.08, 2.05, 0.1, P.stoneDark, west.wallX + 0.28, walkY + 1.02, -2.18, 'jamb');

  for (const x of south.xs) addPier(g, x, south.pierZ, walkY, spring, pierW);
  for (const z of west.zs) {
    if (Math.abs(z - south.pierZ) < 0.05) continue;
    addPier(g, west.pierX, z, walkY, spring, pierW);
  }

  for (let i = 0; i < south.xs.length - 1; i++) {
    const a = south.xs[i];
    const b = south.xs[i + 1];
    addArch(g, (a + b) / 2, spring, south.pierZ, 0, archR, tube, spandrelTop, pierW * 0.92);
  }
  for (let i = 0; i < west.zs.length - 1; i++) {
    const a = west.zs[i];
    const b = west.zs[i + 1];
    addArch(g, west.pierX, spring, (a + b) / 2, Math.PI / 2, archR, tube, spandrelTop, pierW * 0.92);
  }

  const southX0 = west.wallX - 0.2;
  const southX1 = south.xs[south.xs.length - 1] + 0.45;
  const southZ0 = south.wallZ - 0.35;
  const southZ1 = south.pierZ + pierW / 2 + 0.22;
  const eaveY = ceilingY + 0.18;
  const roof = new THREE.Mesh(
    slopeSlab(southX0, southX1, southZ0, southZ1, 4.12, 4.12, eaveY, eaveY, 0.1),
    toon(P.tileDark, { side: THREE.DoubleSide }),
  );
  roof.name = 'arcade-roof';
  g.add(roof);
  addRoofTiles(g, southX0 + 0.1, southX1 - 0.05, southZ0 + 0.08, southZ1 - 0.02, 4.12, ceilingY + 0.2, 'x');
  box(g, southX1 - southX0, 0.08, southZ1 - (south.wallZ + 0.2), P.plasterAge, (southX0 + southX1) / 2, ceilingY + 0.04, (southZ1 + south.wallZ + 0.2) / 2, 'gallery-ceiling');

  const westZ0 = south.pierZ - 0.2;
  const westZ1 = west.zs[west.zs.length - 1] + 0.45;
  const westX0 = west.wallX - 0.35;
  const westX1 = west.pierX + pierW / 2 + 0.22;
  const westRoof = new THREE.Mesh(
    slopeSlab(westX0, westX1, westZ0, westZ1, 4.12, eaveY, eaveY, 4.12, 0.1),
    toon(P.tileDark, { side: THREE.DoubleSide }),
  );
  westRoof.name = 'arcade-roof';
  g.add(westRoof);
  addRoofTiles(g, westX0 + 0.05, westX1 - 0.02, westZ0 + 0.15, westZ1 - 0.05, 4.12, eaveY + 0.04, 'z');
  box(
    g,
    (west.pierX - 0.05) - (west.wallX + 0.2),
    0.08,
    westZ1 - (south.pierZ + 0.15),
    P.plasterAge,
    (west.wallX + west.pierX) / 2,
    ceilingY + 0.04,
    (westZ1 + south.pierZ) / 2 + 0.2,
    'gallery-ceiling',
  );

  const stainH = 0.42;
  box(g, southX1 - southX0 - 0.4, stainH, 0.02, P.stain, (southX0 + southX1) / 2, wallBase + stainH / 2 + 0.16, south.wallZ + south.wallT / 2 + 0.02, 'stain');
  box(g, 0.02, stainH, westLen - 0.5, P.stain, west.wallX + west.wallT / 2 + 0.02, wallBase + stainH / 2 + 0.16, 0.2, 'stain');
  box(g, 1.4, 0.9, 0.025, P.plasterPatch, -3.4, 1.7, south.wallZ + 0.19, 'patch');
  box(g, 0.025, 1.1, 0.8, P.plasterPatch, west.wallX + 0.19, 2.4, 0.8, 'patch');
  box(g, 0.7, 0.08, 0.08, P.stone, -1.6, 2.15, south.wallZ + 0.2, 'string');

  parent.add(g);
  return g;
}

function addPaving(parent, site) {
  const g = new THREE.Group();
  g.name = 'paving';
  const court = site.court;
  const f = site.fountain;
  const margin = 0.5;
  const skipHalfW = f.w / 2 + 0.22;
  const skipHalfD = f.d / 2 + 0.22;
  const plinthW = f.w + margin * 2;
  const plinthD = f.d + margin * 2;

  const ground = box(g, 28, 0.08, 26, P.dust, 0.2, (site.laneY ?? -0.16) - 0.08, 0.4, 'ground');
  ground.userData.noCast = true;
  ground.userData.skyIgnore = true;

  const lane = box(g, 12, 0.05, 3.2, P.lane, 0.8, site.laneY - 0.02, court.z1 + 1.7, 'lane');
  lane.userData.noCast = true;
  lane.userData.skyIgnore = true;
  box(g, court.x1 - court.x0, 0.16, 0.08, P.stoneDark, (court.x0 + court.x1) / 2, site.laneY + 0.08, court.z1, 'threshold');

  addRunningBond(g, court.x0, court.z0, court.x1, court.z1, 0, {
    length: 0.36,
    width: 0.18,
    gap: 0.016,
    height: 0.045,
    colors: ['#c4623c', '#b45334', '#cf7d55', '#a34830'],
    name: 'court-pavers',
    skip: (x, z) => Math.abs(x - f.x) < skipHalfW && Math.abs(z - f.z) < skipHalfD,
  });

  box(g, plinthW, 0.08, plinthD, P.stone, f.x, 0.04, f.z, 'fountain-plinth').userData.noCast = true;
  frameBoxes(
    g,
    f.x - plinthW / 2,
    f.x + plinthW / 2,
    f.z - plinthD / 2,
    f.z + plinthD / 2,
    0.045,
    0.035,
    0.16,
    P.stoneDark,
    'plinth-joint',
  );

  const walk = site.walkY;
  const south = site.south;
  const west = site.west;
  const southNose = court.z0;
  const westNose = court.x0;
  addRunningBond(
    g,
    west.wallX + 0.22,
    south.wallZ + 0.22,
    south.xs[south.xs.length - 1] + 0.35,
    southNose,
    walk,
    {
      length: 0.62,
      width: 0.4,
      gap: 0.02,
      height: 0.05,
      colors: [P.stone, P.stoneDark, '#ddd0b6', P.stone],
      name: 'gallery-pavers',
      bed: P.stoneDeep,
    },
  );
  addRunningBond(
    g,
    west.wallX + 0.22,
    southNose + 0.02,
    westNose,
    west.zs[west.zs.length - 1] + 0.35,
    walk,
    {
      length: 0.62,
      width: 0.4,
      gap: 0.02,
      height: 0.05,
      colors: [P.stone, '#ddd0b6', P.stoneDark, P.stone],
      name: 'gallery-pavers',
      bed: P.stoneDeep,
    },
  );

  const southRun = south.xs[south.xs.length - 1] + 0.35 - (west.wallX + 0.22);
  box(
    g,
    southRun,
    walk,
    0.08,
    P.stoneDark,
    (west.wallX + 0.22 + south.xs[south.xs.length - 1] + 0.35) / 2,
    walk / 2,
    southNose + 0.02,
    'step',
  );
  const westRun = west.zs[west.zs.length - 1] + 0.35 - (southNose + 0.02);
  box(
    g,
    0.08,
    walk,
    westRun,
    P.stoneDark,
    westNose + 0.02,
    walk / 2,
    (southNose + 0.02 + west.zs[west.zs.length - 1] + 0.35) / 2,
    'step',
  );

  parent.add(g);
}

function addFountain(parent, site) {
  const f = site.fountain;
  const g = new THREE.Group();
  g.name = 'fountain';
  g.position.set(f.x, 0, f.z);
  const w = f.w;
  const d = f.d;
  const t = 0.18;
  const courses = [
    { y0: 0.08, y1: 0.24, color: '#9a7d58' },
    { y0: 0.24, y1: 0.4, color: '#c4aa84' },
    { y0: 0.4, y1: 0.5, color: '#e4d4b6' },
  ];
  for (const c of courses) {
    const h = c.y1 - c.y0;
    const y = (c.y0 + c.y1) / 2;
    frameBoxes(g, -w / 2, w / 2, -d / 2, d / 2, y, h, t, c.color, 'basin');
  }
  const tileH = 0.12;
  const tileY = 0.56;
  const tileMat = toon('#ffffff', { map: azulejoTexture() });
  const bands = [
    [w, tileH, t, 0, tileY, -d / 2 + t / 2],
    [w, tileH, t, 0, tileY, d / 2 - t / 2],
    [t, tileH, d - t * 2, -w / 2 + t / 2, tileY, 0],
    [t, tileH, d - t * 2, w / 2 - t / 2, tileY, 0],
  ];
  for (const b of bands) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(b[0], b[1], b[2]), tileMat);
    m.position.set(b[3], b[4], b[5]);
    m.name = 'azulejo';
    g.add(m);
  }
  frameBoxes(g, -w / 2 - 0.04, w / 2 + 0.04, -d / 2 - 0.04, d / 2 + 0.04, 0.66, 0.08, t + 0.06, P.stone, 'coping');

  const innerW = w - t * 2;
  const innerD = d - t * 2;
  box(g, innerW - 0.02, 0.06, innerD - 0.02, '#1a3336', 0, 0.12, 0, 'basin-floor').userData.noCast = true;
  frameBoxes(g, -innerW / 2, innerW / 2, -innerD / 2, innerD / 2, 0.28, 0.28, 0.04, '#3a4038', 'basin-inner');
  frameBoxes(g, -innerW / 2, innerW / 2, -innerD / 2, innerD / 2, 0.48, 0.1, 0.04, P.stone, 'basin-lip');

  const water = new THREE.Mesh(
    new THREE.PlaneGeometry(innerW - 0.1, innerD - 0.1),
    toon(P.water, { map: waterTexture() }),
  );
  water.rotation.x = -Math.PI / 2;
  water.position.y = 0.43;
  water.name = 'water';
  water.userData.noCast = true;
  g.add(water);

  const padGeo = new THREE.CircleGeometry(0.16, 10);
  for (const [px, pz, s] of [[-0.28, 0.12, 1], [0.22, -0.18, 0.8]]) {
    const pad = new THREE.Mesh(padGeo, toon('#3f6a48'));
    pad.rotation.x = -Math.PI / 2;
    pad.position.set(px, 0.445, pz);
    pad.scale.setScalar(s);
    pad.name = 'lily';
    pad.userData.noCast = true;
    g.add(pad);
  }

  box(g, 0.16, 0.28, 0.16, P.stoneDark, 0, 0.28, 0, 'spout');
  const bowlPts = [
    new THREE.Vector2(0.02, 0),
    new THREE.Vector2(0.05, 0.02),
    new THREE.Vector2(0.14, 0.08),
    new THREE.Vector2(0.2, 0.12),
    new THREE.Vector2(0.16, 0.15),
    new THREE.Vector2(0.05, 0.12),
  ];
  const bowl = new THREE.Mesh(new THREE.LatheGeometry(bowlPts, 14), toon(P.stone));
  bowl.position.set(0, 0.4, 0);
  bowl.name = 'spout';
  g.add(bowl);
  const jet = cyl(g, 0.018, 0.012, 0.16, '#d5eeea', 0, 0.5, 0, 6);
  jet.userData.noCast = true;
  jet.name = 'jet';
  for (const dy of [0.02, 0.07, 0.11]) {
    const drop = new THREE.Mesh(new THREE.SphereGeometry(0.018, 6, 6), toon('#e7f6f2'));
    drop.position.set(0.01, 0.43 + dy * 0.2, 0.02);
    drop.userData.noCast = true;
    g.add(drop);
  }

  parent.add(g);
}

function addEdges(parent, site) {
  const g = new THREE.Group();
  g.name = 'edges';
  const bench = site.bench;
  const wallT = 0.34;
  const wallH = 1.02;
  const z0 = site.court.z0 + 0.15;
  const z1 = bench.z1 + 0.15;
  box(g, wallT, wallH, z1 - z0, P.stoneDark, bench.x, wallH / 2, (z0 + z1) / 2, 'east-wall');
  box(g, wallT + 0.02, 0.28, z1 - z0, P.brick, bench.x, 0.14, (z0 + z1) / 2, 'east-base');
  const seatD = 0.46;
  const seatX = bench.x - wallT / 2 - seatD / 2 + 0.02;
  box(g, seatD, 0.12, bench.z1 - bench.z0, P.stone, seatX, bench.seatY - 0.06, (bench.z0 + bench.z1) / 2, 'bench');
  box(g, seatD - 0.06, 0.06, 1.25, P.cushionA, seatX - 0.04, bench.seatY + 0.03, bench.z0 + 0.78, 'cushion');
  box(g, seatD - 0.06, 0.06, 1.05, P.cushionB, seatX - 0.04, bench.seatY + 0.03, bench.z1 - 0.72, 'cushion');

  box(
    g,
    site.court.x1 - site.south.xs[site.south.xs.length - 1] - 0.2,
    1.05,
    0.28,
    P.plaster,
    (site.court.x1 + site.south.xs[site.south.xs.length - 1]) / 2,
    0.52,
    site.court.z0 + 0.05,
    'south-garden-wall',
  );

  const posts = [site.entrance.x0, site.entrance.x1];
  for (const x of posts) {
    box(g, 0.28, 0.92, 0.28, P.stone, x, 0.46, site.entrance.z, 'gate-post');
    box(g, 0.34, 0.08, 0.34, P.stoneDark, x, 0.96, site.entrance.z, 'gate-cap');
  }

  const far = new THREE.Group();
  far.name = 'background';
  box(far, 4.2, 4.6, 3.4, P.plasterAge, -11.2, 2.1, 1.2, 'neighbor');
  const neighborRoof = new THREE.Mesh(
    slopeSlab(-13.4, -9.0, -0.6, 3.0, 5.15, 5.15, 4.55, 4.55, 0.12),
    toon(P.tile, { side: THREE.DoubleSide }),
  );
  neighborRoof.name = 'neighbor-roof';
  far.add(neighborRoof);
  box(far, 0.7, 1.1, 0.08, P.blueDeep, -9.15, 2.7, 1.4, 'neighbor-window');
  g.add(far);
  parent.add(g);
}

function makeShell(layout) {
  const root = new THREE.Group();
  root.name = 'site';
  root.userData.audit = { openSky: true, courtCeiling: false };
  addPaving(root, layout.site);
  addArcade(root, layout.site);
  addFountain(root, layout.site);
  addEdges(root, layout.site);
  return root;
}

function clump(parent, x, y, z, sx, sy, sz, color, name) {
  const m = new THREE.Mesh(new THREE.IcosahedronGeometry(0.5, 1), toon(color));
  m.scale.set(sx, sy, sz);
  m.position.set(x, y, z);
  m.name = name || 'foliage';
  m.userData.noReceive = true;
  parent.add(m);
  return m;
}

function limb(parent, x0, y0, z0, x1, y1, z1, r0, r1, color) {
  const a = new THREE.Vector3(x0, y0, z0);
  const b = new THREE.Vector3(x1, y1, z1);
  const dir = b.clone().sub(a);
  const len = dir.length();
  const mid = a.clone().add(b).multiplyScalar(0.5);
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r1, r0, len, 7), toon(color));
  m.position.copy(mid);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
  m.name = 'branch';
  parent.add(m);
  return m;
}

function addOlive(parent, x, z) {
  const g = new THREE.Group();
  g.name = 'olive';
  g.position.set(x, 0, z);
  const wood = '#6a5344';
  const woodDark = '#4e3b30';
  limb(g, 0, 0, 0, 0.08, 0.55, 0.04, 0.16, 0.13, wood);
  limb(g, 0.08, 0.55, 0.04, 0.28, 1.15, -0.02, 0.12, 0.08, wood);
  limb(g, 0.28, 1.15, -0.02, 0.95, 1.85, 0.35, 0.07, 0.035, woodDark);
  limb(g, 0.28, 1.15, -0.02, -0.55, 1.75, -0.15, 0.065, 0.03, wood);
  limb(g, 0.28, 1.15, -0.02, 0.15, 2.05, -0.72, 0.055, 0.028, woodDark);
  limb(g, 0.55, 1.5, 0.12, 1.15, 1.55, 0.55, 0.04, 0.02, wood);
  limb(g, -0.15, 1.45, -0.08, -0.85, 1.35, 0.25, 0.035, 0.018, wood);
  const masses = [
    [0.95, 2.05, 0.3, 1.15, 0.48, 0.9, P.olive],
    [0.45, 2.25, -0.15, 0.95, 0.4, 0.8, P.oliveLite],
    [-0.45, 1.95, -0.2, 1.05, 0.42, 0.85, P.oliveDark],
    [0.1, 2.35, -0.65, 0.8, 0.36, 0.7, P.olive],
    [1.2, 1.7, 0.55, 0.7, 0.32, 0.6, P.oliveLite],
    [-0.85, 1.5, 0.2, 0.62, 0.28, 0.55, P.oliveDark],
    [0.2, 1.7, 0.45, 0.7, 0.3, 0.58, P.olive],
    [-0.2, 2.15, 0.25, 0.55, 0.26, 0.5, P.oliveLite],
    [0.7, 2.35, 0.05, 0.5, 0.24, 0.45, P.oliveDark],
    [1.35, 2.0, -0.05, 0.48, 0.22, 0.4, P.olive],
    [-0.15, 1.45, -0.45, 0.58, 0.26, 0.5, P.oliveLite],
    [0.55, 1.35, -0.25, 0.4, 0.2, 0.36, P.oliveDark],
  ];
  for (const m of masses) clump(g, m[0], m[1], m[2], m[3], m[4], m[5], m[6], 'olive-leaf');
  cyl(g, 0.22, 0.26, 0.08, '#6d5a40', 0.02, 0.04, 0.02, 8);
  parent.add(g);
}

function addCitrus(parent, x, z) {
  const g = new THREE.Group();
  g.name = 'citrus';
  g.position.set(x, 0, z);
  const pts = [
    new THREE.Vector2(0.12, 0),
    new THREE.Vector2(0.18, 0.06),
    new THREE.Vector2(0.26, 0.22),
    new THREE.Vector2(0.3, 0.4),
    new THREE.Vector2(0.22, 0.52),
    new THREE.Vector2(0.26, 0.58),
  ];
  const pot = new THREE.Mesh(new THREE.LatheGeometry(pts, 14), toon('#b85a3a'));
  pot.position.y = 0;
  pot.name = 'urn';
  g.add(pot);
  limb(g, 0, 0.58, 0, 0.05, 1.15, 0.02, 0.04, 0.03, '#5c4634');
  limb(g, 0.05, 1.15, 0.02, 0.28, 1.45, 0.12, 0.025, 0.015, '#5c4634');
  limb(g, 0.05, 1.15, 0.02, -0.22, 1.4, -0.08, 0.022, 0.014, '#4a3828');
  clump(g, 0.05, 1.55, 0.02, 0.55, 0.42, 0.5, '#2f6a34', 'citrus-leaf');
  clump(g, 0.28, 1.5, 0.12, 0.38, 0.3, 0.36, '#3e7a40', 'citrus-leaf');
  clump(g, -0.18, 1.42, -0.05, 0.32, 0.28, 0.3, '#255832', 'citrus-leaf');
  for (const [ox, oy, oz] of [[0.12, 1.35, 0.12], [-0.08, 1.48, -0.02], [0.22, 1.58, -0.06]]) {
    const fruit = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 8), toon('#e07a28'));
    fruit.position.set(ox, oy, oz);
    fruit.userData.noReceive = true;
    g.add(fruit);
  }
  parent.add(g);
}

function addBougainvillea(parent, site) {
  const g = new THREE.Group();
  g.name = 'bougainvillea';
  const south = site.south;
  const pierZ = south.pierZ;
  const curves = [
    [
      new THREE.Vector3(-5.15, 3.55, pierZ - 0.1),
      new THREE.Vector3(-3.7, 3.35, pierZ + 0.15),
      new THREE.Vector3(-3.55, 2.55, pierZ + 0.28),
      new THREE.Vector3(-4.15, 1.7, pierZ + 0.2),
      new THREE.Vector3(-5.05, 1.05, pierZ + 0.05),
    ],
    [
      new THREE.Vector3(2.2, 3.45, pierZ),
      new THREE.Vector3(3.05, 3.15, pierZ + 0.2),
      new THREE.Vector3(3.15, 2.35, pierZ + 0.25),
      new THREE.Vector3(2.7, 1.55, pierZ + 0.12),
    ],
  ];
  const colors = [P.boug, P.bougDeep, P.bougLite, P.boug];
  curves.forEach((pts, ci) => {
    const curve = new THREE.CatmullRomCurve3(pts);
    const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 24, 0.018, 5, false), toon(P.leafDark));
    tube.name = 'vine';
    g.add(tube);
    const count = ci === 0 ? 28 : 16;
    for (let i = 0; i < count; i++) {
      const t = i / (count - 1);
      const p = curve.getPoint(t);
      const heavy = t < 0.45 || (t > 0.62 && t < 0.8);
      const n = heavy ? 5 : 2;
      for (let k = 0; k < n; k++) {
        const spread = (heavy ? 0.16 : 0.08) * (0.65 + (k % 3) * 0.2);
        const ox = Math.sin(i * 1.7 + k * 2.2) * spread;
        const oy = Math.cos(i * 1.1 + k) * spread * 0.55;
        const oz = Math.sin(i * 0.9 + k * 1.4) * spread;
        if (k % 2 === 0) {
          clump(g, p.x + ox, p.y + oy - 0.02, p.z + oz, 0.18, 0.07, 0.14, k % 4 === 0 ? P.leafDark : P.leaf, 'bougainvillea');
        }
        clump(
          g,
          p.x + ox * 0.65,
          p.y + oy + 0.03,
          p.z + oz * 0.65,
          0.12 + (k % 3) * 0.03,
          0.09,
          0.12,
          colors[(i + k) % colors.length],
          'bougainvillea',
        );
      }
    }
  });
  parent.add(g);
}

function addGeranium(parent, x, y, z, scale, variant) {
  const s = scale;
  if (variant === 'rosemary') {
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      limb(
        parent,
        x,
        y,
        z,
        x + Math.cos(a) * 0.08 * s,
        y + 0.28 * s,
        z + Math.sin(a) * 0.08 * s,
        0.012 * s,
        0.006 * s,
        '#6d7348',
      );
      clump(
        parent,
        x + Math.cos(a) * 0.1 * s,
        y + 0.3 * s,
        z + Math.sin(a) * 0.1 * s,
        0.08 * s,
        0.16 * s,
        0.08 * s,
        i % 2 ? '#8a9470' : '#6e784c',
        'rosemary',
      );
    }
    return;
  }
  const flower = variant === 'pink' ? [P.geraniumPink, '#f0c0cc', '#c45b78'] : [P.geranium, '#e07a55', '#a83238'];
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + 0.4;
    clump(
      parent,
      x + Math.cos(a) * 0.14 * s,
      y + 0.08 * s,
      z + Math.sin(a) * 0.14 * s,
      0.18 * s,
      0.05 * s,
      0.1 * s,
      i % 2 ? '#3f6a3c' : '#2e5234',
      'geranium',
    );
  }
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2;
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.045 * s, 7, 7), toon(flower[i % flower.length]));
    m.position.set(x + Math.cos(a) * 0.06 * s, y + 0.16 * s + (i % 3) * 0.03 * s, z + Math.sin(a) * 0.06 * s);
    m.name = 'geranium';
    m.userData.noReceive = true;
    parent.add(m);
  }
}

function addUrn(parent, x, y, z, scale, plant) {
  const s = scale;
  const pts = [
    new THREE.Vector2(0.1 * s, 0),
    new THREE.Vector2(0.15 * s, 0.05 * s),
    new THREE.Vector2(0.22 * s, 0.2 * s),
    new THREE.Vector2(0.26 * s, 0.36 * s),
    new THREE.Vector2(0.19 * s, 0.46 * s),
    new THREE.Vector2(0.24 * s, 0.52 * s),
  ];
  const pot = new THREE.Mesh(new THREE.LatheGeometry(pts, 14), toon('#b85a3a'));
  pot.position.set(x, y, z);
  pot.name = 'urn';
  parent.add(pot);
  const lip = new THREE.Mesh(
    new THREE.TorusGeometry(0.23 * s, 0.025 * s, 6, 14),
    toon('#9a4632'),
  );
  lip.rotation.x = Math.PI / 2;
  lip.position.set(x, y + 0.5 * s, z);
  parent.add(lip);
  addGeranium(parent, x, y + 0.5 * s, z, 0.95 * s, plant || 'red');
}

function makeProcedural(layout) {
  const g = new THREE.Group();
  g.name = 'planting';
  const site = layout.site;
  addOlive(g, site.olive.x, site.olive.z);
  addCitrus(g, site.citrus.x, site.citrus.z);
  addBougainvillea(g, site);
  for (const urn of layout.urns || []) {
    addUrn(g, urn.position[0], urn.position[1], urn.position[2], urn.scale || 1, urn.plant);
  }
  for (const inst of layout.instances || []) {
    if (!inst.plant) continue;
    const sy = Array.isArray(inst.scale) ? inst.scale[1] : (inst.scale || 1);
    const height = (layout.assets[inst.kind]?.targetHeight || 0.34) * sy;
    addGeranium(g, inst.position[0], inst.position[1] + height * 0.92, inst.position[2], 0.85 * sy, inst.plant);
  }
  const petal = new THREE.CircleGeometry(0.035, 5);
  const petalMat = toon(P.boug);
  for (let i = 0; i < 7; i++) {
    const m = new THREE.Mesh(petal, petalMat);
    m.rotation.x = -Math.PI / 2;
    m.position.set(-4.4 + i * 0.22, 0.185, -3.85 + (i % 3) * 0.08);
    m.userData.noCast = true;
    m.userData.noReceive = true;
    g.add(m);
  }
  return g;
}

boot({
  makeShell,
  makeProcedural,
  readyText: 'ready — open-sky courtyard · drag orbit · U unlit · T toon',
});
