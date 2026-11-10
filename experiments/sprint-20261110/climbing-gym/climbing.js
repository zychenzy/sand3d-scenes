import * as THREE from 'three';
import { boot, toon, addBox, addCyl } from './scene_lib.js';
import {
  ROOM, PALETTE, ROUTES, KIND, SEGMENTS, allFacets, seamQuads, fangFacets,
  allHolds, holdPose, mats, INSTANCES, LADDER, HANG, LOCKERS, LEGEND,
  SOFFIT, CEILING, TRUSS, COLUMNS, profileZ, segmentById,
} from './geometry.mjs';

function addFacets(g, faces, opts = {}) {
  const byColor = new Map();
  for (const f of faces) {
    if (!byColor.has(f.color)) byColor.set(f.color, []);
    byColor.get(f.color).push(f);
  }
  for (const [color, list] of byColor) {
    const pos = [];
    const nrm = [];
    for (const f of list) {
      const v = f.verts.map((p) => new THREE.Vector3(p[0], p[1], p[2]));
      for (let i = 1; i < v.length - 1; i++) {
        const a = v[0];
        const b = v[i];
        const c = v[i + 1];
        const n = new THREE.Vector3().subVectors(b, a).cross(new THREE.Vector3().subVectors(c, a));
        if (n.lengthSq() < 1e-12) continue;
        n.normalize();
        for (const p of [a, b, c]) {
          pos.push(p.x, p.y, p.z);
          nrm.push(n.x, n.y, n.z);
        }
      }
    }
    if (!pos.length) continue;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
    const mesh = new THREE.Mesh(geo, toon(color));
    mesh.castShadow = !opts.noCast;
    mesh.receiveShadow = true;
    if (opts.noCast) mesh.userData.noCast = true;
    g.add(mesh);
  }
}

function addPole(g, a, b, r, mat, seg = 8) {
  const dir = new THREE.Vector3(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
  const len = dir.length() || 0.001;
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, seg), mat);
  m.position.set((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
  m.castShadow = true;
  m.receiveShadow = true;
  g.add(m);
  return m;
}

function contact(g, x, z, w, d, y, opacity = 0.32) {
  const m = addBox(g, w, 0.006, d, toon('#000'), x, y, z);
  m.userData.shade = 'shadow';
  m.userData.opacity = opacity;
  return m;
}

function orientHold(mesh, pose) {
  const n = new THREE.Vector3(pose.nx, pose.ny, pose.nz).normalize();
  const up = new THREE.Vector3(0, 1, 0);
  const xAxis = new THREE.Vector3().crossVectors(up, n);
  if (xAxis.lengthSq() < 1e-6) xAxis.set(1, 0, 0);
  xAxis.normalize();
  const yAxis = new THREE.Vector3().crossVectors(n, xAxis).normalize();
  mesh.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(xAxis, yAxis, n));
  mesh.position.set(pose.x, pose.y, pose.z);
}

function makeHold(kind, color) {
  const spec = KIND[kind];
  const mat = toon(color);
  if (spec.shape === 'sphere') {
    const m = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 10), mat);
    m.scale.set(spec.sx, spec.sy, spec.sz);
    return m;
  }
  if (spec.shape === 'pinch') {
    const g = new THREE.Group();
    const geo = new THREE.BoxGeometry(0.034, spec.sy, spec.sz);
    const a = new THREE.Mesh(geo, mat);
    a.position.x = -0.028;
    const b = new THREE.Mesh(geo, mat);
    b.position.x = 0.028;
    g.add(a, b);
    return g;
  }
  return new THREE.Mesh(new THREE.BoxGeometry(spec.sx, spec.sy, spec.sz), mat);
}

function tileField(rect, tw, td, gap) {
  const out = [];
  let row = 0;
  for (let z = rect.z0; z < rect.z1 - 0.05; z += td + gap, row++) {
    const shift = (row % 2) * (tw * 0.38);
    for (let x = rect.x0 - tw + (shift % (tw + gap)); x < rect.x1; x += tw + gap) {
      const x0 = Math.max(x, rect.x0);
      const x1 = Math.min(x + tw, rect.x1);
      const z1 = Math.min(z + td, rect.z1);
      if (x1 - x0 < 0.4 || z1 - z < 0.4) continue;
      out.push({ x0, x1, z0: z, z1, row });
    }
  }
  return out;
}

function makeShell() {
  const g = new THREE.Group();
  g.name = 'shell';
  const W = ROOM.width;
  const D = ROOM.depth;
  const H = ROOM.height;
  const t = ROOM.wallT;
  const floor = addBox(g, W, 0.08, D, toon(PALETTE.floor), 0, -0.04, 0);
  floor.userData.noCast = true;
  for (let i = -4; i <= 4; i++) {
    const line = addBox(g, W - 0.6, 0.004, 0.018, toon(PALETTE.floorLine), -0.2, 0.002, i * 1.35);
    line.userData.noCast = true;
  }
  const rubber = addBox(g, SOFFIT.x1 - (-W / 2 + 0.2), 0.018, SOFFIT.z1 - SOFFIT.z0, toon(PALETTE.rubber), ((-W / 2 + 0.2) + SOFFIT.x1) / 2, 0.009, (SOFFIT.z0 + SOFFIT.z1) / 2);
  rubber.userData.noCast = true;

  addBox(g, W, H, t, toon(PALETTE.wall), 0, H / 2, -D / 2);
  addBox(g, t, H, D, toon(PALETTE.wall), -W / 2, H / 2, 0);
  addBox(g, W - 0.4, 1.15, 0.04, toon(PALETTE.wallDark), 0, 0.58, -D / 2 + t * 0.55);
  addBox(g, 0.04, 1.15, D - 0.5, toon(PALETTE.wallDark), -W / 2 + t * 0.55, 0.58, 0.2);
  addBox(g, W - 0.3, 0.1, 0.06, toon(PALETTE.wood), 0, 0.08, -D / 2 + 0.1);
  addBox(g, 0.06, 0.1, D - 0.4, toon(PALETTE.wood), -W / 2 + 0.1, 0.08, 0.1);

  const ceil = addBox(
    g,
    CEILING.x1 - CEILING.x0,
    CEILING.h,
    CEILING.z1 - CEILING.z0,
    toon(PALETTE.ceiling),
    (CEILING.x0 + CEILING.x1) / 2,
    CEILING.y,
    (CEILING.z0 + CEILING.z1) / 2,
  );
  ceil.userData.noCast = true;
  const soffit = addBox(
    g,
    SOFFIT.x1 - SOFFIT.x0,
    SOFFIT.h,
    SOFFIT.z1 - SOFFIT.z0,
    toon('#343b42'),
    (SOFFIT.x0 + SOFFIT.x1) / 2,
    SOFFIT.y,
    (SOFFIT.z0 + SOFFIT.z1) / 2,
  );
  soffit.receiveShadow = true;

  for (const x of [-4.8, -0.2, 4.3]) {
    addBox(g, 0.1, 0.16, CEILING.z1 - CEILING.z0 - 0.3, toon(PALETTE.beam), x, CEILING.y - 0.14, (CEILING.z0 + CEILING.z1) / 2);
  }
  addBox(g, CEILING.x1 - CEILING.x0 - 0.4, 0.12, 0.1, toon(PALETTE.beam), 0, CEILING.y - 0.16, -6.35);

  for (const col of COLUMNS) {
    addBox(g, col.s, H - 0.15, col.s, toon(PALETTE.column), col.x, (H - 0.15) / 2, col.z);
  }
  return g;
}

function buildWall(g) {
  addFacets(g, allFacets());
  const seams = [];
  for (const seg of SEGMENTS) seams.push(...seamQuads(seg).map((verts) => ({ color: PALETTE.seam, verts })));
  addFacets(g, seams, { noCast: true });
  const fang = fangFacets();
  addFacets(g, fang.faces);
}

function buildMats(g) {
  const fields = mats();
  fields.forEach((field, index) => {
    const cave = field.thick > 0.4;
    const tiles = tileField(field, 1.72, 1.18, 0.03);
    tiles.forEach((tile, n) => {
      const body = (n + index) % 2 === 0 ? (cave ? PALETTE.matCave : PALETTE.matA) : (cave ? '#1d527f' : PALETTE.matB);
      const top = cave ? PALETTE.matCaveTop : PALETTE.matTop;
      const w = tile.x1 - tile.x0;
      const d = tile.z1 - tile.z0;
      const cx = (tile.x0 + tile.x1) / 2;
      const cz = (tile.z0 + tile.z1) / 2;
      addBox(g, w, field.thick - 0.04, d, toon(body), cx, field.thick / 2, cz);
      const cap = addBox(g, Math.max(0.2, w - 0.06), 0.035, Math.max(0.2, d - 0.06), toon(top), cx, field.thick - 0.018, cz);
      cap.userData.noCast = true;
    });
    addBox(g, field.x1 - field.x0, field.thick * 0.55, 0.045, toon('#102848'), (field.x0 + field.x1) / 2, field.thick * 0.28, field.z1 - 0.02);
    const stripeZ = field.z1 + 0.14;
    const stripe = addBox(g, field.x1 - field.x0, 0.008, 0.07, toon(PALETTE.caution), (field.x0 + field.x1) / 2, 0.02, stripeZ);
    stripe.userData.noCast = true;
    const span = field.x1 - field.x0;
    const dashes = Math.max(2, Math.round(span / 0.55));
    for (let i = 0; i < dashes; i += 2) {
      const x = field.x0 + ((i + 0.5) * span) / dashes;
      const dash = addBox(g, span / dashes * 0.72, 0.01, 0.045, toon(PALETTE.cautionBlk), x, 0.026, stripeZ);
      dash.userData.noCast = true;
    }
  });
}

function buildHolds(g) {
  const washerMat = toon(PALETTE.washer);
  for (const h of allHolds()) {
    const pose = holdPose(h);
    const spec = KIND[h.kind];
    const color = ROUTES[h.route].color;
    const washer = new THREE.Mesh(new THREE.CylinderGeometry(spec.sx * 0.62, spec.sx * 0.62, 0.01, 10), washerMat);
    washer.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(pose.nx, pose.ny, pose.nz).normalize());
    const back = spec.sz * 0.42;
    washer.position.set(pose.x - pose.nx * back, pose.y - pose.ny * back, pose.z - pose.nz * back);
    washer.castShadow = false;
    washer.receiveShadow = true;
    washer.userData.noCast = true;
    g.add(washer);

    const mesh = makeHold(h.kind, color);
    orientHold(mesh, pose);
    mesh.traverse((o) => {
      if (o.isMesh) {
        o.castShadow = true;
        o.receiveShadow = true;
      }
    });
    g.add(mesh);
  }

  const fields = mats();
  for (const route of Object.keys(ROUTES)) {
    if (!ROUTES[route].graded) continue;
    const first = allHolds().find((h) => h.route === route);
    const seg = segmentById(first.seg);
    const field = fields.find((m) => m.id === seg.id);
    const z = profileZ(seg.profile, 0.4) + 0.28;
    const m = addBox(g, 0.2, 0.012, 0.2, toon(ROUTES[route].color), first.x, field.thick + 0.008, z);
    m.userData.noCast = true;
  }
}

function buildLadder(g) {
  const wood = toon(PALETTE.woodLite);
  const metal = toon(PALETTE.steel);
  const x = LADDER.x;
  const half = LADDER.width / 2;
  for (const side of [-1, 1]) {
    addPole(g, [x + side * half, LADDER.y0, LADDER.z0], [x + side * half, LADDER.y1, LADDER.z1], 0.028, wood);
  }
  const rungs = 8;
  for (let i = 0; i <= rungs; i++) {
    const t = i / rungs;
    const y = LADDER.y0 + (LADDER.y1 - LADDER.y0) * t;
    const z = LADDER.z0 + (LADDER.z1 - LADDER.z0) * t;
    addPole(g, [x - half, y, z], [x + half, y, z], 0.018, i % 2 ? wood : metal);
  }
}

function buildLockers(g) {
  const wood = toon(PALETTE.wood);
  const backC = toon('#241c18');
  const { x0, x1, z0, z1, h, bays } = LOCKERS;
  const depth = x1 - x0;
  const bayW = (z1 - z0) / bays;
  const cx = (x0 + x1) / 2;
  addBox(g, 0.04, h, z1 - z0, backC, x0 + 0.02, h / 2, (z0 + z1) / 2);
  const shelfCounts = [4, 3, 4, 3];
  const fills = [
    ['shoe', 'chalk', 'empty', 'pack'],
    ['pack', 'shoe', 'tape'],
    ['empty', 'shoe', 'chalk', 'shoe'],
    ['chalk', 'empty', 'pack'],
  ];
  for (let i = 0; i <= bays; i++) {
    addBox(g, depth, h, 0.04, wood, cx, h / 2, z0 + i * bayW);
  }
  addBox(g, depth, 0.05, z1 - z0, wood, cx, h - 0.025, (z0 + z1) / 2);
  addBox(g, depth, 0.06, z1 - z0, wood, cx, 0.03, (z0 + z1) / 2);
  for (let i = 0; i < bays; i++) {
    const zc = z0 + (i + 0.5) * bayW;
    const n = shelfCounts[i];
    for (let s = 0; s < n; s++) {
      const y = 0.16 + s * ((h - 0.28) / Math.max(1, n - 1));
      addBox(g, depth - 0.02, 0.025, bayW - 0.06, wood, cx + 0.01, y, zc);
      const kind = fills[i][s];
      if (kind === 'shoe') {
        addBox(g, 0.16, 0.07, 0.08, toon(s % 2 ? '#f2c230' : '#2a2a2a'), cx + 0.06, y + 0.05, zc - 0.04);
        addBox(g, 0.16, 0.07, 0.08, toon('#2a2a2a'), cx + 0.06, y + 0.05, zc + 0.06);
      } else if (kind === 'chalk') {
        addCyl(g, 0.045, 0.05, 0.07, toon('#f7f7f4'), cx + 0.08, y + 0.05, zc, 10);
      } else if (kind === 'pack') {
        addBox(g, 0.2, 0.16, 0.12, toon(i % 2 ? '#2f4f6a' : '#6a3a3a'), cx + 0.05, y + 0.1, zc);
      } else if (kind === 'tape') {
        addCyl(g, 0.05, 0.05, 0.035, toon('#e36a1c'), cx + 0.08, y + 0.03, zc, 10);
      }
    }
  }
}

function buildHang(g) {
  const b = HANG.board;
  addBox(g, b.d, b.h, b.w, toon(PALETTE.wood), b.x, b.y, b.z);
  for (let row = 0; row < 2; row++) {
    for (let i = 0; i < 4; i++) {
      const z = b.z - b.w * 0.36 + i * (b.w * 0.24);
      const y = b.y + (row === 0 ? -0.035 : 0.04);
      addBox(g, 0.025, 0.028, row === 0 ? 0.07 : 0.045, toon('#1a1614'), b.x + b.d * 0.45, y, z);
    }
  }
  const bar = addCyl(g, 0.016, 0.016, b.w * 0.8, toon(PALETTE.steel), b.x + 0.08, b.y - 0.16, b.z, 8);
  bar.rotation.x = Math.PI / 2;
  const p = HANG.pad;
  addBox(g, p.w, p.h, p.d, toon('#1a3f6e'), p.x, p.h / 2, p.z);
  addBox(g, p.w - 0.08, 0.02, p.d - 0.08, toon('#2a62a4'), p.x, p.h - 0.01, p.z);
}

function buildSigns(g) {
  const canvas = document.createElement('canvas');
  canvas.width = 768;
  canvas.height = 1080;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#1b232c';
  ctx.fillRect(0, 0, 768, 1080);
  ctx.fillStyle = '#e2b423';
  ctx.fillRect(48, 56, 120, 10);
  ctx.fillStyle = '#f4efe6';
  ctx.font = '700 68px sans-serif';
  ctx.fillText('THE QUARRY', 48, 150);
  ctx.fillStyle = '#c5cec4';
  ctx.font = '500 30px sans-serif';
  ctx.fillText('boulder hall  ·  4.5 m', 52, 204);
  const rows = [
    ['yellow', 'slab'],
    ['green', 'arete'],
    ['blue', 'face'],
    ['orange', 'cave'],
    ['pink', 'roof'],
    ['white', 'traverse'],
  ];
  rows.forEach((row, i) => {
    const y = 320 + i * 108;
    ctx.fillStyle = ROUTES[row[0]].color;
    ctx.beginPath();
    ctx.arc(100, y - 14, 30, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#f4efe6';
    ctx.font = '700 40px sans-serif';
    ctx.fillText(row[0].toUpperCase(), 156, y);
    ctx.fillStyle = '#b7c2b8';
    ctx.font = '400 28px sans-serif';
    ctx.fillText(row[1], 470, y);
  });
  ctx.fillStyle = '#e2b423';
  ctx.font = '600 26px sans-serif';
  ctx.fillText('Yellow line = stay off the pads', 52, 1000);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(LEGEND.w, LEGEND.h), toon('#111'));
  sign.position.set(LEGEND.x, LEGEND.y, LEGEND.z);
  sign.rotation.y = Math.PI / 2;
  sign.userData.shade = 'decal';
  sign.userData.map = tex;
  g.add(sign);

  const down = document.createElement('canvas');
  down.width = 512;
  down.height = 256;
  const dctx = down.getContext('2d');
  dctx.fillStyle = '#1b232c';
  dctx.fillRect(0, 0, 512, 256);
  dctx.fillStyle = '#e6b15a';
  dctx.font = '700 92px sans-serif';
  dctx.fillText('DOWN', 36, 118);
  dctx.font = '500 36px sans-serif';
  dctx.fillStyle = '#f4efe6';
  dctx.fillText('climb off this slab', 40, 190);
  const dtex = new THREE.CanvasTexture(down);
  dtex.colorSpace = THREE.SRGBColorSpace;
  const dsign = new THREE.Mesh(new THREE.PlaneGeometry(0.72, 0.36), toon('#111'));
  dsign.position.set(5.9, 3.52, -5.22);
  dsign.userData.shade = 'decal';
  dsign.userData.map = dtex;
  g.add(dsign);
}

function buildLights(g) {
  const beam = addCyl(g, 0.045, 0.045, TRUSS.x1 - TRUSS.x0, toon(PALETTE.beam), (TRUSS.x0 + TRUSS.x1) / 2, TRUSS.y, TRUSS.z, 8);
  beam.rotation.z = Math.PI / 2;
  for (const x of [-5.4, -4.6, -2.2, 0.2, 2.4, 4.0, 5.6]) {
    addCyl(g, 0.015, 0.015, 0.42, toon(PALETTE.steel), x, TRUSS.y + 0.22, TRUSS.z, 6);
    const head = addBox(g, 0.16, 0.07, 0.1, toon('#2a3036'), x, TRUSS.y - 0.08, TRUSS.z);
    head.userData.noCast = true;
    const lamp = addCyl(g, 0.04, 0.05, 0.03, toon('#fff1c9'), x, TRUSS.y - 0.13, TRUSS.z, 10);
    lamp.userData.shade = 'emissive';
    lamp.userData.color = '#fff3cf';
  }
  for (const id of ['pendant_a', 'pendant_b']) {
    const p = INSTANCES.find((i) => i.id === id);
    const bulb = addCyl(g, 0.045, 0.05, 0.07, toon('#fff1c9'), p.position[0], p.position[1] + 0.14, p.position[2], 10);
    bulb.userData.shade = 'emissive';
    bulb.userData.color = '#ffe1a8';
    addCyl(g, 0.008, 0.008, SOFFIT.y - (p.position[1] + 0.58), toon('#1a1a1a'), p.position[0], (SOFFIT.y + p.position[1] + 0.58) / 2, p.position[2], 6);
  }
  const stand = [5.4, 1.05];
  addCyl(g, 0.04, 0.06, 0.08, toon('#2c3136'), stand[0], 0.04, stand[1], 8);
  addCyl(g, 0.02, 0.02, 2.22, toon(PALETTE.steel), stand[0], 1.15, stand[1], 8);
  const head = addBox(g, 0.16, 0.1, 0.16, toon('#2c3136'), stand[0], 2.28, stand[1] - 0.06);
  head.userData.noCast = true;
  const face = addBox(g, 0.1, 0.08, 0.02, toon('#ffe1a8'), stand[0], 2.28, stand[1] - 0.15);
  face.userData.shade = 'emissive';
  face.userData.color = '#ffe1a8';
}

function buildBenches(g) {
  const steel = toon('#c5cbd4');
  const wood = toon('#8a623c');
  for (const inst of INSTANCES.filter((i) => i.kind === 'museum_bench')) {
    const [x, , z] = inst.position;
    addBox(g, 1.28, 0.035, 0.04, wood, x, 0.86, z + 0.16);
    addBox(g, 0.035, 0.4, 0.035, steel, x - 0.58, 0.66, z + 0.16);
    addBox(g, 0.035, 0.4, 0.035, steel, x + 0.58, 0.66, z + 0.16);
    contact(g, x, z, 1.35, 0.38, 0.012, 0.28);
  }
}

function buildSmallProps(g) {
  const counter = INSTANCES.find((i) => i.id === 'counter');
  contact(g, counter.position[0], counter.position[2], 3.7, 1.7, 0.03, 0.26);
  for (const id of ['stool_a', 'stool_b', 'chair']) {
    const p = INSTANCES.find((i) => i.id === id);
    contact(g, p.position[0], p.position[2], 0.42, 0.42, 0.02, 0.3);
  }
  const plant = INSTANCES.find((i) => i.id === 'plant_floor');
  contact(g, plant.position[0], plant.position[2], 0.36, 0.36, 0.012, 0.28);
  addCyl(g, 0.1, 0.11, 0.16, toon('#f4f4f1'), 1.85, 0.08, 1.48, 12);
  addCyl(g, 0.045, 0.05, 0.04, toon('#d7d4cc'), 1.85, 0.17, 1.48, 10);
  addBox(g, 0.28, 0.012, 0.16, toon('#e8e4dc'), -0.2, 0.47, 1.95);
}

function makeProcedural() {
  const g = new THREE.Group();
  g.name = 'procedural';
  buildWall(g);
  buildMats(g);
  buildHolds(g);
  buildLadder(g);
  buildLockers(g);
  buildHang(g);
  buildSigns(g);
  buildLights(g);
  buildBenches(g);
  buildSmallProps(g);
  return g;
}

boot({
  makeShell,
  makeProcedural,
  readyText: 'ready — the quarry · bouldering · drag orbit · U unlit · T toon',
});
