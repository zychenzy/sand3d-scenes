import * as THREE from 'three';
import { boot, toon, basic, addBox, addOriented, addCyl } from './scene_lib.js';

const STONE = ['#d5cec0', '#c9c2b2', '#ddd6c8', '#b7b1a3'];
const TIMBER = '#8d5b3c';
const TIMBER_DARK = '#6b442c';
const GRASS_COLOR = { sage: '#7e8d52', deep: '#5c6c3c', straw: '#c2b06a', grey: '#8d9470' };

function mulberry32(a) {
  return function rand() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function yawNormal(nx, nz) {
  return Math.atan2(nx, nz);
}

/** KEEP IN SYNC with dune_height() in layout_model.py. */
function duneHeight(x, z, dLand, mounds, dims) {
  const promY = dims.promenadeY;
  const edge = dims.walkEdge;
  if (dLand != null && dLand <= edge) return promY - 0.16;
  let base = 0.4 + 0.1 * Math.sin(x * 0.31 + 1.2) + 0.06 * Math.cos(z * 0.27 + 0.4);
  let extra = 0;
  for (const m of mounds) {
    const dx = (x - m.x) / m.rx;
    const dz = (z - m.z) / m.rz;
    const r2 = dx * dx + dz * dz;
    if (r2 < 1) extra += m.h * (1 - r2) ** 2;
  }
  let h = base + extra;
  if (dLand != null && dLand < edge + 1.7) {
    let t = (dLand - edge) / 1.7;
    t = t * t * (3 - 2 * t);
    h = (promY - 0.02) * (1 - t) + h * t;
  }
  return h;
}

function beachY(dist, toe, shoreDist) {
  const shoreY = 0.055;
  const deepY = -1.15;
  const deepDist = 10.5;
  const span = Math.max(shoreDist, 0.2);
  if (dist <= span) {
    const t = Math.max(0, dist / span);
    return toe + (shoreY - toe) * t ** 0.85;
  }
  const t = Math.min((dist - span) / deepDist, 1);
  return shoreY + (deepY - shoreY) * t ** 1.1;
}

function frameAt(wall, x) {
  if (x <= wall[0].x) return wall[0];
  if (x >= wall[wall.length - 1].x) return wall[wall.length - 1];
  let lo = 0;
  let hi = wall.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (wall[mid].x < x) lo = mid;
    else hi = mid;
  }
  const a = wall[lo];
  const b = wall[hi];
  const t = (x - a.x) / (b.x - a.x || 1);
  const out = {};
  for (const k of ['x', 'z', 'nx', 'nz', 'tx', 'tz', 'beachW', 'toeY', 'shoreX', 'shoreZ']) {
    out[k] = a[k] + (b[k] - a[k]) * t;
  }
  const nl = Math.hypot(out.nx, out.nz) || 1;
  const tl = Math.hypot(out.tx, out.tz) || 1;
  out.nx /= nl;
  out.nz /= nl;
  out.tx /= tl;
  out.tz /= tl;
  return out;
}

function landDist(fr, x, z) {
  return fr.nx * (fr.x - x) + fr.nz * (fr.z - z);
}

function distToPoly(x, z, poly) {
  let best = 1e9;
  for (let i = 0; i < poly.length - 1; i++) {
    const ax = poly[i][0];
    const az = poly[i][1];
    const bx = poly[i + 1][0];
    const bz = poly[i + 1][1];
    const vx = bx - ax;
    const vz = bz - az;
    const l2 = vx * vx + vz * vz || 1;
    let t = ((x - ax) * vx + (z - az) * vz) / l2;
    t = Math.max(0, Math.min(1, t));
    best = Math.min(best, Math.hypot(x - (ax + t * vx), z - (az + t * vz)));
  }
  return best;
}

function flagShadow(mesh, cast) {
  mesh.userData.noCast = !cast;
  mesh.castShadow = cast;
  mesh.receiveShadow = true;
  return mesh;
}

function canvasTex(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.needsUpdate = true;
  return t;
}

function buildSky(g) {
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(96, 28, 16),
    basic('#c5e3f6', { side: THREE.BackSide, fog: false })
  );
  sky.userData.lockMaterial = true;
  sky.userData.noShadow = true;
  g.add(sky);

  const clouds = [
    { p: [-6, 26, -4], s: [4.2, 0.55, 1.6] },
    { p: [12, 28, 1], s: [3.2, 0.45, 1.3] },
    { p: [2, 24, 8], s: [2.6, 0.4, 1.1] },
  ];
  const mat = basic('#f7f6f2', { fog: false });
  for (const c of clouds) {
    const m = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 8), mat);
    m.position.set(c.p[0], c.p[1], c.p[2]);
    m.scale.set(c.s[0], c.s[1], c.s[2]);
    m.userData.lockMaterial = true;
    m.userData.noShadow = true;
    g.add(m);
  }
}

function buildTerrain(g, layout) {
  const { wall, mounds, path, dimensions: dims } = layout;
  const x0 = -20;
  const x1 = 20;
  const z0 = -1.5;
  const z1 = 13.2;
  const step = 0.5;
  const nx = Math.round((x1 - x0) / step);
  const nz = Math.round((z1 - z0) / step);
  const positions = [];
  const colors = [];
  const indices = [];
  const sand = new THREE.Color('#e6d3a8');
  const grass = new THREE.Color('#8b935c');
  const grassDeep = new THREE.Color('#667243');
  const bed = new THREE.Color('#8d8474');

  function sample(ix, iz) {
    const x = x0 + ix * step;
    const z = z0 + iz * step;
    const fr = frameAt(wall, x);
    let dLand = landDist(fr, x, z);
    let h = duneHeight(x, z, dLand, mounds, dims);
    const dp = distToPoly(x, z, path);
    if (dp < 1.15) h = dims.promenadeY - 0.1;
    else if (dp < 2.45) {
      let t = (dp - 1.15) / 1.3;
      t = t * t * (3 - 2 * t);
      h = (dims.promenadeY - 0.02) * (1 - t) + h * t;
    }
    if (dLand <= dims.walkEdge) h = Math.max(h, dims.promenadeY - 0.09);
    if (onTerrace(x, z, layout)) h = dims.promenadeY - 0.08;
    return { x, z, h, dLand };
  }

  const grid = [];
  for (let iz = 0; iz <= nz; iz++) {
    for (let ix = 0; ix <= nx; ix++) grid.push(sample(ix, iz));
  }
  const vid = (ix, iz) => iz * (nx + 1) + ix;
  for (let iz = 0; iz < nz; iz++) {
    for (let ix = 0; ix < nx; ix++) {
      const a = grid[vid(ix, iz)];
      const b = grid[vid(ix + 1, iz)];
      const c = grid[vid(ix, iz + 1)];
      const d = grid[vid(ix + 1, iz + 1)];
      if (a.dLand < 0.05 && b.dLand < 0.05 && c.dLand < 0.05 && d.dLand < 0.05) continue;
      const base = positions.length / 3;
      for (const p of [a, b, c, d]) {
        positions.push(p.x, p.h, p.z);
        const col = bed.clone();
        if (p.dLand > dims.walkEdge - 0.2) {
          const t = THREE.MathUtils.clamp((p.h - 0.48) / 0.55, 0, 1);
          col.copy(sand).lerp(grass, t);
          if (p.h > 0.95) col.lerp(grassDeep, 0.4);
        }
        colors.push(col.r, col.g, col.b);
      }
      indices.push(base, base + 2, base + 1, base + 1, base + 2, base + 3);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  const mesh = new THREE.Mesh(geo, toon('#ffffff', { vertexColors: true, side: THREE.DoubleSide }));
  flagShadow(mesh, false);
  mesh.name = 'land';
  g.add(mesh);
}

function onTerrace(x, z, layout) {
  const pads = [
    { x: layout.kiosk.position[0], z: layout.kiosk.position[2], r: 2.35 },
    { x: layout.bikes.position[0], z: layout.bikes.position[2], r: 1.7 },
    { x: layout.bin.position[0], z: layout.bin.position[2], r: 0.7 },
  ];
  return pads.some((p) => Math.hypot(x - p.x, z - p.z) < p.r);
}

function buildBeachAndWater(g, layout) {
  const wall = layout.wall;
  const stations = (s) => {
    const w = s.beachW;
    return [0.02, w * 0.22, w * 0.48, w * 0.72, w * 0.9, w + 0.22];
  };
  const dry = new THREE.Color('#e7d4aa');
  const wet = new THREE.Color('#c4a06e');
  const pebble = new THREE.Color('#b7b2a8');

  const cols = wall.length;
  const rows = stations(wall[0]).length;
  const positions = [];
  const colors = [];
  const indices = [];
  for (let i = 0; i < cols; i++) {
    const s = wall[i];
    const ss = stations(s);
    for (let j = 0; j < rows; j++) {
      const dist = ss[j];
      const y = beachY(dist, s.toeY, s.beachW);
      positions.push(s.x + s.nx * dist, y, s.z + s.nz * dist);
      const col = dry.clone();
      const shoreT = s.beachW <= 0.2 ? 1 : dist / s.beachW;
      const wetness = THREE.MathUtils.clamp((shoreT - 0.62) / 0.38, 0, 1);
      col.lerp(wet, wetness);
      const peb = THREE.MathUtils.smoothstep(s.x, 4, -13);
      col.lerp(pebble, peb * (1 - wetness * 0.5) * 0.62);
      colors.push(col.r, col.g, col.b);
    }
  }
  for (let i = 0; i < cols - 1; i++) {
    for (let j = 0; j < rows - 1; j++) {
      const a = i * rows + j;
      indices.push(a, a + rows, a + 1, a + 1, a + rows, a + rows + 1);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  const beach = new THREE.Mesh(geo, toon('#ffffff', { vertexColors: true, side: THREE.DoubleSide }));
  flagShadow(beach, false);
  beach.name = 'beach';
  g.add(beach);
  addWaterSheet(g, wall);
}

function addWaterSheet(g, wall) {
  // Offset along the wall normal folds where the bay bends, so the far edge is a
  // separate x-monotonic curve and each row is a straight lerp between the two.
  const shore = [];
  for (const s of wall) {
    const x = s.x + s.nx * (s.beachW + 0.05);
    const z = s.z + s.nz * (s.beachW + 0.05);
    if (shore.length && x <= shore[shore.length - 1].x + 0.08) continue;
    shore.push({ x, z });
  }
  const n = shore.length;
  const x0 = shore[0].x - 1.2;
  const x1 = shore[n - 1].x + 1.2;
  const rows = 6;
  const bands = [
    new THREE.Color('#e7f7fb'),
    new THREE.Color('#b7e3f4'),
    new THREE.Color('#7ec8e6'),
    new THREE.Color('#4aaad4'),
    new THREE.Color('#318fbe'),
    new THREE.Color('#3c9bc8'),
  ];
  const positions = [];
  const colors = [];
  const indices = [];
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    const fx = x0 + (x1 - x0) * t;
    const fz = -19.2 - Math.sin(t * Math.PI) * 1.6;
    for (let j = 0; j < rows; j++) {
      const u = j / (rows - 1);
      positions.push(shore[i].x + (fx - shore[i].x) * u, 0.045, shore[i].z + (fz - shore[i].z) * u);
      const col = bands[j];
      colors.push(col.r, col.g, col.b);
    }
  }
  for (let i = 0; i < n - 1; i++) {
    for (let j = 0; j < rows - 1; j++) {
      const a = i * rows + j;
      indices.push(a, a + rows, a + 1, a + rows, a + rows + 1, a + 1);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geo.setIndex(indices);
  const normals = new Float32Array(positions.length);
  for (let i = 1; i < normals.length; i += 3) normals[i] = 1;
  geo.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
  const mesh = new THREE.Mesh(
    geo,
    toon('#ffffff', { vertexColors: true, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 })
  );
  mesh.userData.noCast = true;
  mesh.userData.noShadow = true;
  mesh.receiveShadow = false;
  mesh.name = 'water';
  g.add(mesh);
}

function buildWall(g, layout) {
  const { wall, dimensions: dims, steps, boardwalk } = layout;
  const stone = toon('#cfc8b8');
  const stoneDark = toon('#b3ac9e');
  const cap = toon('#e3dccE');
  const algae = toon('#8d9884');
  const joint = toon('#9a9284');
  const stepG = steps.gap;
  const deckG = boardwalk.gap;

  for (let i = 0; i < wall.length - 1; i++) {
    const a = wall[i];
    const b = wall[i + 1];
    const dx = b.x - a.x;
    const dz = b.z - a.z;
    const len = Math.hypot(dx, dz) + 0.05;
    const mx = (a.x + b.x) / 2;
    const mz = (a.z + b.z) / 2;
    const nx = (a.nx + b.nx) / 2;
    const nz = (a.nz + b.nz) / 2;
    const nl = Math.hypot(nx, nz) || 1;
    const nnx = nx / nl;
    const nnz = nz / nl;
    const yaw = yawNormal(nnx, nnz);
    const toe = (a.toeY + b.toeY) / 2;
    const inSteps = mx > stepG.x0 && mx < stepG.x1;
    const inDeck = mx > deckG.x0 && mx < deckG.x1;
    if (inSteps) continue;

    const faceH = dims.promenadeY - toe + 0.06;
    const thick = 0.46;
    const cx = mx - nnx * (thick / 2);
    const cz = mz - nnz * (thick / 2);
    addOriented(g, len, faceH, thick, i % 2 ? stone : stoneDark, cx, toe - 0.03 + faceH / 2, cz, yaw);

    const courses = Math.max(2, Math.round(faceH / 0.34));
    for (let c = 0; c < courses; c++) {
      const y = toe + (c + 0.5) * (faceH / courses);
      const h = faceH / courses - 0.025;
      const proud = 0.012;
      const mat = c === 0 ? algae : c % 2 ? joint : stone;
      addOriented(
        g,
        len * 0.98,
        Math.max(0.05, h),
        0.03,
        mat,
        mx + nnx * proud,
        y,
        mz + nnz * proud,
        yaw,
        { cast: false, noCast: true }
      );
    }

    if (!inDeck) {
      const pT = 0.36;
      const pH = dims.parapetH;
      addOriented(
        g,
        len,
        pH,
        pT,
        stone,
        mx - nnx * (pT / 2),
        dims.promenadeY + pH / 2,
        mz - nnz * (pT / 2),
        yaw
      );
      addOriented(
        g,
        len,
        0.07,
        pT + 0.1,
        cap,
        mx - nnx * (pT / 2),
        dims.promenadeY + pH + 0.035,
        mz - nnz * (pT / 2),
        yaw,
        { cast: false, noCast: true }
      );
    }
  }

  // Short returns so the ends of the paving read as finished walls.
  for (const end of [wall[0], wall[wall.length - 1]]) {
    const yaw = yawNormal(-end.tx, -end.tz);
    const faceH = dims.promenadeY - end.toeY + 0.06;
    const cx = end.x - end.tx * 0.7 - end.nx * 0.2;
    const cz = end.z - end.tz * 0.7 - end.nz * 0.2;
    addOriented(g, 1.5, faceH, 0.42, stoneDark, cx, end.toeY - 0.03 + faceH / 2, cz, yaw);
    addOriented(
      g,
      1.5,
      dims.parapetH,
      0.36,
      stone,
      cx,
      dims.promenadeY + dims.parapetH / 2,
      cz,
      yaw
    );
  }
}

function buildPaving(g, layout) {
  const { wall, dimensions: dims, steps, path } = layout;
  const palette = [toon('#ddd6c8'), toon('#d2cbbd'), toon('#e6e0d4'), toon('#c9c1b2'), toon('#b7ad9c')];
  const stepG = steps.gap;
  let acc = 0.2;
  for (let i = 0; i < wall.length - 1; i++) {
    const a = wall[i];
    const b = wall[i + 1];
    const seg = Math.hypot(b.x - a.x, b.z - a.z);
    acc += seg;
    if (acc < 0.78) continue;
    const len = Math.min(acc - 0.04, 0.86);
    acc = 0;
    const mx = (a.x + b.x) / 2;
    const mz = (a.z + b.z) / 2;
    const yaw = yawNormal(a.nx, a.nz);
    const rows = 5;
    const inner = dims.parapetT + 0.12;
    const span = dims.walkEdge - inner;
    const slabD = span / rows - 0.045;
    for (let r = 0; r < rows; r++) {
      const d = inner + (r + 0.5) * (span / rows);
      if (mx > stepG.x0 && mx < stepG.x1 && d < dims.stepStartD + 0.08) continue;
      const x = a.x - a.nx * d;
      const z = a.z - a.nz * d;
      const worn = Math.abs(mx - steps.x) < 2.4 && r < 2;
      const mat = worn ? palette[4] : palette[(i + r * 3) % 4];
      addOriented(g, len, 0.07, slabD, mat, x, dims.promenadeY - 0.035, z, yaw, { cast: false, noCast: true });
    }
  }

  // Entrance path slabs.
  for (let i = 0; i < path.length - 1; i++) {
    const ax = path[i][0];
    const az = path[i][1];
    const bx = path[i + 1][0];
    const bz = path[i + 1][1];
    const dx = bx - ax;
    const dz = bz - az;
    const seg = Math.hypot(dx, dz);
    const tx = dx / seg;
    const tz = dz / seg;
    const yaw = yawNormal(-tz, tx);
    const n = Math.max(1, Math.round(seg / 0.8));
    for (let k = 0; k < n; k++) {
      const t = (k + 0.5) / n;
      const x = ax + dx * t;
      const z = az + dz * t;
      addOriented(g, seg / n - 0.04, 0.07, 2.05, palette[(i + k) % 4], x, dims.promenadeY - 0.035, z, yaw, {
        cast: false,
        noCast: true,
      });
    }
  }
}

function addSpan(g, a, b, mat) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const dz = b.z - a.z;
  const len = Math.hypot(dx, dy, dz);
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, Math.max(len, 0.05)), mat);
  mesh.position.set((a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2);
  mesh.lookAt(b.x, b.y, b.z);
  mesh.userData.noCast = true;
  mesh.castShadow = false;
  g.add(mesh);
}

function buildSteps(g, layout) {
  const steps = layout.steps;
  const dims = layout.dimensions;
  const dir = new THREE.Vector3(steps.dir[0], 0, steps.dir[1]).normalize();
  const tan = new THREE.Vector3(steps.tangent[0], 0, steps.tangent[1]).normalize();
  const yaw = yawNormal(dir.x, dir.z);
  const stone = toon('#b3aa9c');
  const dark = toon('#6f675c');
  const cap = toon('#fbf6ec');
  const railMat = toon('#6d5340');
  let cursor = new THREE.Vector3(steps.origin[0], 0, steps.origin[2]);
  let y = steps.origin[1];
  const width = steps.width;
  const railPts = [new THREE.Vector3(cursor.x, y, cursor.z)];

  for (const f of steps.flights) {
    if (f.kind === 'flight') {
      for (let i = 0; i < f.risers; i++) {
        y -= f.rise;
        const mid = cursor.clone().addScaledVector(dir, f.tread / 2);
        const bodyH = Math.max(0.25, y - 0.04);
        addOriented(g, width + 0.7, bodyH, f.tread + 0.02, i % 2 ? dark : stone, mid.x, 0.04 + bodyH / 2, mid.z, yaw);
        addOriented(g, width, 0.06, f.tread + 0.045, cap, mid.x, y - 0.03, mid.z, yaw, { cast: false, noCast: true });
        const nose = mid.clone().addScaledVector(dir, -f.tread / 2 + 0.07);
        addOriented(g, width - 0.04, 0.05, 0.14, dark, nose.x, y + 0.018, nose.z, yaw, { cast: false, noCast: true });
        cursor.addScaledVector(dir, f.tread);
      }
    } else {
      const mid = cursor.clone().addScaledVector(dir, f.depth / 2);
      const bodyH = Math.max(0.25, y - 0.04);
      addOriented(g, width + 0.85, bodyH, f.depth, stone, mid.x, 0.04 + bodyH / 2, mid.z, yaw);
      addOriented(g, width + 0.08, 0.06, f.depth + 0.02, cap, mid.x, y - 0.03, mid.z, yaw, { cast: false, noCast: true });
      cursor.addScaledVector(dir, f.depth);
    }
    railPts.push(new THREE.Vector3(cursor.x, y, cursor.z));
  }

  for (const side of [-1, 1]) {
    const pts = railPts.map((p) => new THREE.Vector3(
      p.x + tan.x * side * (width / 2 + 0.02),
      p.y + 0.9,
      p.z + tan.z * side * (width / 2 + 0.02)
    ));
    for (const p of pts) {
      addCyl(g, 0.035, 0.042, 0.9, railMat, p.x, p.y - 0.45, p.z, 6, { cast: false, noCast: true });
    }
    for (let i = 0; i < pts.length - 1; i++) {
      addSpan(g, pts[i], pts[i + 1], railMat);
      addSpan(
        g,
        pts[i].clone().setY(pts[i].y - 0.46),
        pts[i + 1].clone().setY(pts[i + 1].y - 0.46),
        railMat
      );
    }
  }

  // Jambs where the parapet opens onto the stairs.
  for (const side of [-1, 1]) {
    const px = steps.origin[0] + tan.x * side * (width / 2 + 0.08);
    const pz = steps.origin[2] + tan.z * side * (width / 2 + 0.08);
    addOriented(g, 0.42, dims.parapetH + 0.15, 0.7, stone, px, dims.promenadeY + dims.parapetH / 2 - 0.05, pz, yaw);
  }
}

function buildBoardwalk(g, layout) {
  const bw = layout.boardwalk;
  const dims = layout.dimensions;
  const dir = new THREE.Vector3(bw.dir[0], 0, bw.dir[1]).normalize();
  const tan = new THREE.Vector3(bw.tangent[0], 0, bw.tangent[1]).normalize();
  const center = new THREE.Vector3(bw.center[0], dims.promenadeY, bw.center[2]);
  const yaw = yawNormal(dir.x, dir.z);
  const plank = toon('#b88858');
  const plankDark = toon('#9a7044');
  const postMat = toon('#6e4e34');
  const n = 15;
  const plankD = bw.length / n;
  for (let i = 0; i < n; i++) {
    const along = -bw.length / 2 + (i + 0.5) * plankD;
    const p = center.clone().addScaledVector(dir, along);
    addOriented(g, bw.width - 0.06, 0.07, plankD - 0.02, i % 2 ? plankDark : plank, p.x, dims.promenadeY - 0.035, p.z, yaw, {
      cast: false,
      noCast: true,
    });
  }
  for (const side of [-1.15, 0, 1.15]) {
    const p = center.clone().addScaledVector(tan, side);
    addOriented(g, 0.09, 0.12, bw.length - 0.2, postMat, p.x, dims.promenadeY - 0.12, p.z, yaw, { cast: false, noCast: true });
  }
  for (const post of bw.posts) {
    const h = dims.promenadeY - 0.08 - post.groundY;
    addCyl(g, 0.07, 0.08, h, postMat, post.x, post.groundY + h / 2, post.z, 8);
  }

  const railH = 0.92;
  const railY = dims.promenadeY + railH;
  // Seaward rail and two flanks. The landward edge stays open onto the promenade.
  const sea = center.clone().addScaledVector(dir, bw.length / 2 - 0.08);
  addOriented(g, bw.width, 0.06, 0.06, postMat, sea.x, railY, sea.z, yaw, { cast: false, noCast: true });
  addOriented(g, bw.width, 0.045, 0.045, postMat, sea.x, dims.promenadeY + 0.48, sea.z, yaw, { cast: false, noCast: true });
  for (const side of [-1, 1]) {
    const flank = center.clone().addScaledVector(tan, side * (bw.width / 2 - 0.06));
    addOriented(g, 0.06, 0.06, bw.length - 0.15, postMat, flank.x, railY, flank.z, yaw, { cast: false, noCast: true });
    addOriented(g, 0.045, 0.045, bw.length - 0.15, postMat, flank.x, dims.promenadeY + 0.48, flank.z, yaw, {
      cast: false,
      noCast: true,
    });
  }
  const railPosts = [
    [bw.length / 2 - 0.1, bw.width / 2 - 0.08],
    [bw.length / 2 - 0.1, -bw.width / 2 + 0.08],
    [bw.length / 2 - 0.1, 0],
    [0.2, bw.width / 2 - 0.08],
    [0.2, -bw.width / 2 + 0.08],
    [-bw.length / 2 + 0.35, bw.width / 2 - 0.08],
    [-bw.length / 2 + 0.35, -bw.width / 2 + 0.08],
  ];
  for (const [da, dt] of railPosts) {
    const p = center.clone().addScaledVector(dir, da).addScaledVector(tan, dt);
    addCyl(g, 0.045, 0.05, railH, postMat, p.x, dims.promenadeY + railH / 2, p.z, 6, { cast: false, noCast: true });
  }
}

function buildKiosk(g, layout) {
  const k = layout.kiosk;
  const [w, h, d] = k.size;
  const root = new THREE.Group();
  root.position.set(k.position[0], k.position[1], k.position[2]);
  root.rotation.y = k.rotationY;

  const siding = canvasTex(128, 64, (ctx) => {
    for (let i = 0; i < 8; i++) {
      ctx.fillStyle = i % 2 ? '#7a4e34' : '#8f5d3e';
      ctx.fillRect(0, i * 8, 128, 8);
    }
  });
  const wallMat = toon('#ffffff', { map: siding });
  const timber = toon(TIMBER_DARK);
  const roofMat = toon('#6d5648');
  const stripes = canvasTex(128, 32, (ctx) => {
    for (let i = 0; i < 8; i++) {
      ctx.fillStyle = i % 2 ? '#e4b4ae' : '#f4efe6';
      ctx.fillRect(i * 16, 0, 16, 32);
    }
  });
  stripes.wrapS = THREE.RepeatWrapping;
  stripes.repeat.set(2.2, 1);
  const awningMat = toon('#ffffff', { map: stripes });
  const sign = canvasTex(256, 96, (ctx) => {
    ctx.fillStyle = '#f6f1e6';
    ctx.fillRect(0, 0, 256, 96);
    ctx.strokeStyle = '#6b4636';
    ctx.lineWidth = 8;
    ctx.strokeRect(6, 6, 244, 84);
    ctx.fillStyle = '#6b4636';
    ctx.font = '700 44px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('GELATO', 128, 52);
  });
  const menu = canvasTex(128, 160, (ctx) => {
    ctx.fillStyle = '#2c3330';
    ctx.fillRect(0, 0, 128, 160);
    ctx.fillStyle = '#f3ecdf';
    ctx.font = '600 16px sans-serif';
    ctx.fillText('today', 16, 28);
    ctx.font = '15px sans-serif';
    ['lemon', 'pistachio', 'strawberry', 'cocoa'].forEach((line, i) => ctx.fillText(line, 16, 58 + i * 24));
  });

  addBox(root, w + 1.15, 1.2, d + 1.05, toon('#d2cbbd'), 0, -0.57, 0.05);
  addBox(root, w + 1.15, 0.06, d + 1.05, toon('#e6dfd2'), 0, 0.03, 0.05, { cast: false, noCast: true });
  // Back and side walls. The front is an open counter.
  addBox(root, w, 2.16, 0.08, wallMat, 0, 1.12, d / 2 - 0.04);
  addBox(root, 0.08, 2.16, d - 0.1, wallMat, -w / 2 + 0.04, 1.12, 0.05);
  addBox(root, 0.08, 2.16, d - 0.1, wallMat, w / 2 - 0.04, 1.12, 0.05);
  // Counter and side piers framing the hatch.
  addBox(root, w - 0.2, 1.02, 0.42, timber, 0, 0.52, -d / 2 + 0.22);
  addBox(root, 0.16, 1.15, 0.16, timber, -0.78, 1.55, -d / 2 + 0.12);
  addBox(root, 0.16, 1.15, 0.16, timber, 0.78, 1.55, -d / 2 + 0.12);
  addBox(root, 1.7, 0.08, 0.1, timber, 0, 1.95, -d / 2 + 0.08);

  const tubs = ['#d16d78', '#8fb56a', '#e4c45c', '#6b4332'];
  tubs.forEach((col, i) => {
    const tub = addCyl(root, 0.13, 0.12, 0.16, toon(col), -0.48 + i * 0.32, 1.1, -d / 2 + 0.28, 12, { cast: false, noCast: true });
    tub.scale.y = 0.85 + (i % 2) * 0.15;
  });

  const menuBoard = addBox(root, 0.46, 0.58, 0.03, toon('#ffffff', { map: menu }), 0, 0.72, -d / 2 + 0.02, { cast: false, noCast: true });
  menuBoard.material.color.set('#ffffff');

  // Door on the landward side, staff only.
  addBox(root, 0.62, 1.7, 0.04, toon('#3f5c48'), 0.55, 0.9, d / 2 + 0.01, { cast: false, noCast: true });

  const gable = new THREE.Shape();
  gable.moveTo(-d / 2 - 0.35, 2.08);
  gable.lineTo(0.02, 2.72);
  gable.lineTo(d / 2 + 0.18, 2.12);
  gable.closePath();
  const roofGeo = new THREE.ExtrudeGeometry(gable, { depth: w + 0.4, bevelEnabled: false });
  roofGeo.translate(0, 0, -(w + 0.4) / 2);
  const roof = new THREE.Mesh(roofGeo, roofMat);
  roof.rotation.y = -Math.PI / 2;
  roof.castShadow = true;
  roof.receiveShadow = true;
  root.add(roof);

  const awning = addBox(root, w + 0.15, 0.05, 0.85, awningMat, 0, 2.12, -d / 2 - 0.28, { cast: false, noCast: true });
  awning.material.color.set('#ffffff');
  addBox(root, w + 0.15, 0.28, 0.04, awningMat, 0, 1.96, -d / 2 - 0.68, { cast: false, noCast: true });
  const signMesh = addBox(root, 0.92, 0.32, 0.04, toon('#ffffff', { map: sign }), 0, 1.7, -d / 2 - 0.7, { cast: false, noCast: true });
  signMesh.material.color.set('#ffffff');

  g.add(root);
}

function buildBikes(g, layout) {
  const b = layout.bikes;
  const root = new THREE.Group();
  root.position.set(b.position[0], b.position[1], b.position[2]);
  root.rotation.y = b.rotationY;
  const steel = toon('#5c656e');
  addBox(root, 2.5, 1.22, 2.35, toon('#d2cbbd'), 0.05, -0.58, 0.35);
  addBox(root, 2.5, 0.06, 2.35, toon('#e4ddd0'), 0.05, 0.03, 0.35, { cast: false, noCast: true });
  for (let i = 0; i < 3; i++) {
    const x = -0.6 + i * 0.6;
    addCyl(root, 0.03, 0.03, 0.72, steel, x, 0.4, -0.16, 8);
    addCyl(root, 0.03, 0.03, 0.72, steel, x, 0.4, 0.16, 8);
    addBox(root, 0.055, 0.05, 0.38, steel, x, 0.74, 0, { cast: false, noCast: true });
  }
  bike(root, -0.92, '#b55245', 0.72);
  bike(root, 0.92, '#35597a', 0.78);
  g.add(root);
}

function bike(root, x, color, z) {
  const frame = toon(color);
  const dark = toon('#2a3034');
  const grp = new THREE.Group();
  grp.position.set(x, 0, z);
  const wheelGeo = new THREE.CylinderGeometry(0.34, 0.34, 0.05, 18);
  const hubGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.07, 10);
  for (const wz of [-0.46, 0.46]) {
    const wheel = new THREE.Mesh(wheelGeo, dark);
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(0, 0.36, wz);
    wheel.castShadow = true;
    grp.add(wheel);
    const hub = new THREE.Mesh(hubGeo, frame);
    hub.rotation.z = Math.PI / 2;
    hub.position.set(0, 0.36, wz);
    hub.userData.noCast = true;
    grp.add(hub);
  }
  addBox(grp, 0.07, 0.07, 0.72, frame, 0, 0.5, 0);
  addBox(grp, 0.055, 0.28, 0.055, frame, 0, 0.58, 0.16, { cast: false, noCast: true });
  addBox(grp, 0.12, 0.045, 0.2, toon('#e4dece'), 0, 0.74, 0.08, { cast: false, noCast: true });
  addBox(grp, 0.04, 0.04, 0.28, dark, 0, 0.68, 0.38, { cast: false, noCast: true });
  root.add(grp);
}

function buildGrasses(g, layout) {
  const mats = {};
  for (const [name, hex] of Object.entries(GRASS_COLOR)) mats[name] = toon(hex, { side: THREE.DoubleSide });
  for (const spec of layout.grasses) {
    const root = new THREE.Group();
    root.position.set(spec.position[0], spec.position[1], spec.position[2]);
    const rand = mulberry32(spec.seed);
    const mat = mats[spec.kind] || mats.sage;
    for (let i = 0; i < spec.blades; i++) {
    const h = spec.height * (0.55 + rand() * 0.65);
    const w = 0.028 + rand() * 0.028;
      const shape = new THREE.Shape();
      shape.moveTo(-w, 0);
      shape.lineTo(w * 0.55, 0);
      shape.lineTo(w * 0.12, h);
      shape.lineTo(-w * 0.22, h * 0.9);
      const mesh = new THREE.Mesh(new THREE.ShapeGeometry(shape), mat);
      const ang = rand() * Math.PI * 2;
      const rad = rand() * (0.08 + spec.height * 0.12);
      mesh.position.set(Math.cos(ang) * rad, 0, Math.sin(ang) * rad);
      mesh.rotation.y = rand() * Math.PI;
      const lean = spec.lean * (0.55 + rand() * 0.7);
      mesh.rotation.z = lean * (rand() < 0.75 ? 1 : -0.35);
      mesh.rotation.x = (rand() - 0.5) * 0.45;
      mesh.userData.noCast = true;
      root.add(mesh);
    }
    g.add(root);
  }
}

function buildRocks(g, layout) {
  const dry = toon('#a39c90');
  const wet = toon('#7d847c');
  for (const spec of layout.rocks) {
    const geo = new THREE.IcosahedronGeometry(1, 0);
    const pos = geo.attributes.position;
    const rand = mulberry32(spec.seed);
    for (let i = 0; i < pos.count; i++) {
      const n = 0.88 + rand() * 0.2;
      pos.setXYZ(i, pos.getX(i) * n, pos.getY(i) * n * 0.62, pos.getZ(i) * n * (0.9 + rand() * 0.15));
    }
    geo.computeVertexNormals();
    const mesh = new THREE.Mesh(geo, spec.tint === 'wet' ? wet : dry);
    mesh.scale.setScalar(spec.scale * (0.9 + (spec.seed % 5) * 0.04));
    mesh.scale.y *= 0.85;
    mesh.position.set(spec.position[0], spec.position[1], spec.position[2]);
    mesh.rotation.set(spec.seed * 0.2, spec.yaw, spec.seed * 0.15);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    g.add(mesh);
  }
  // A handful of pebbles on the narrow left beach — clustered, not a field.
  const pebbleMat = toon('#aea89e');
  const rand = mulberry32(19);
  for (let i = 0; i < 14; i++) {
    const s = layout.wall[4 + ((i * 3) % 12)];
    const dist = s.beachW * (0.25 + rand() * 0.55);
    const side = (rand() - 0.5) * 0.7;
    const x = s.x + s.nx * dist + s.tx * side;
    const z = s.z + s.nz * dist + s.tz * side;
    const y = beachY(dist, s.toeY, s.beachW);
    const sc = 0.08 + rand() * 0.12;
    const m = new THREE.Mesh(new THREE.DodecahedronGeometry(sc, 0), pebbleMat);
    m.position.set(x, y - sc * 0.3, z);
    m.rotation.y = rand() * 3;
    m.scale.y = 0.55;
    m.userData.noCast = true;
    g.add(m);
  }
}

function buildFoamAndRipples(g, layout) {
  const foam = toon('#f7fbfb');
  const glint = toon('#d7f3ef');
  for (const f of layout.foam) {
    const yaw = yawNormal(f.nx, f.nz);
    const rand = mulberry32(f.seed + 9);
    const bits = 2 + (f.seed % 2);
    for (let k = 0; k < bits; k++) {
      const along = (k - (bits - 1) / 2) * f.length * 0.22;
      const out = 0.02 + rand() * 0.16;
      const patch = addOriented(
        g,
        0.18 + rand() * 0.34,
        0.018,
        0.07 + rand() * 0.1,
        foam,
        f.x + f.tx * along + f.nx * out,
        0.064,
        f.z + f.tz * along + f.nz * out,
        yaw + (rand() - 0.5) * 0.7,
        { cast: false, noCast: true }
      );
      patch.userData.noShadow = true;
    }
  }
  // A few short glints on the shallow water, kept wide and flat so they don't read as debris.
  for (const r of layout.ripples.slice(0, 4)) {
    addOriented(g, r.rx * 0.9, 0.02, r.rz * 0.55, glint, r.x, 0.06, r.z, r.rot, { cast: false, noCast: true });
  }
}

function buildSails(g, layout) {
  const sailMat = toon('#f4f1ea', { side: THREE.DoubleSide });
  const hullMat = toon('#2a3138');
  const mastMat = toon('#c9c3b6');
  for (const s of layout.sails) {
    const root = new THREE.Group();
    root.position.set(s.x, 0, s.z);
    root.rotation.y = s.yaw;
    root.scale.setScalar(s.scale);
    addBox(root, 1.7, 0.22, 0.38, hullMat, 0, 0.1, 0);
    addBox(root, 0.45, 0.16, 0.22, hullMat, 0.95, 0.12, 0, { cast: false, noCast: true });
    addCyl(root, 0.025, 0.03, 2.35, mastMat, -0.05, 1.3, 0, 6, { cast: false, noCast: true });
    const main = new THREE.Shape();
    main.moveTo(0, 0.15);
    main.lineTo(0.15, 2.05);
    main.lineTo(0.95, 0.35);
    const mainMesh = new THREE.Mesh(new THREE.ShapeGeometry(main), sailMat);
    mainMesh.position.set(-0.02, 0, 0.02);
    mainMesh.userData.noCast = true;
    root.add(mainMesh);
    const jib = new THREE.Shape();
    jib.moveTo(0, 0.2);
    jib.lineTo(0.05, 1.45);
    jib.lineTo(-0.55, 0.35);
    const jibMesh = new THREE.Mesh(new THREE.ShapeGeometry(jib), sailMat);
    jibMesh.position.set(0.05, 0, -0.02);
    jibMesh.userData.noCast = true;
    root.add(jibMesh);
    g.add(root);
  }
}

function buildStreetFurniture(g, layout) {
  const dims = layout.dimensions;
  const lampMat = toon('#e4dfd4');
  const dark = toon('#3a4148');
  for (const lamp of layout.lamps) {
    const [x, y, z] = lamp.position;
    addCyl(g, 0.05, 0.06, 2.35, lampMat, x, y + 1.2, z, 8);
    addBox(g, 0.32, 0.08, 0.18, dark, x, y + 2.4, z, { cast: false, noCast: true });
    addBox(g, 0.22, 0.22, 0.08, toon('#d5dbe2'), x, y + 2.22, z, { cast: false, noCast: true });
  }
  const bin = layout.bin;
  addCyl(g, 0.22, 0.24, 0.82, dark, bin.position[0], bin.position[1] + 0.42, bin.position[2], 10);
  addCyl(g, 0.24, 0.24, 0.05, toon('#4a5258'), bin.position[0], bin.position[1] + 0.85, bin.position[2], 10, {
    cast: false,
    noCast: true,
  });
}

function buildPlants(layout) {
  const g = new THREE.Group();
  g.name = 'planters';
  const leaf = toon('#6d7a45', { side: THREE.DoubleSide });
  const bloom = toon('#d7b8be');
  const cream = toon('#f3efe6');
  for (const pot of layout.pots) {
    const [x, y, z] = pot.position;
    const top = y + layout.assets.flowerpot.targetHeight * 0.92;
    if (pot.plant === 'tuft') {
      for (let i = 0; i < 7; i++) {
        const ang = (i / 7) * Math.PI * 2;
        const h = 0.22 + (i % 3) * 0.06;
        const shape = new THREE.Shape();
        shape.moveTo(-0.012, 0);
        shape.lineTo(0.012, 0);
        shape.lineTo(0.004, h);
        const m = new THREE.Mesh(new THREE.ShapeGeometry(shape), leaf);
        m.position.set(x + Math.cos(ang) * 0.05, top, z + Math.sin(ang) * 0.05);
        m.rotation.y = ang;
        m.rotation.z = 0.25 + (i % 2) * 0.2;
        m.userData.noCast = true;
        g.add(m);
      }
    } else {
      addBox(g, 0.16, 0.08, 0.14, leaf, x, top + 0.05, z, { cast: false, noCast: true });
      addBox(g, 0.1, 0.06, 0.1, toon('#5f6b3e'), x + 0.04, top + 0.08, z - 0.03, { cast: false, noCast: true });
      for (const [dx, dz, mat] of [
        [0.02, 0.02, bloom],
        [-0.04, 0.01, cream],
        [0.03, -0.03, bloom],
      ]) {
        const fl = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 6), mat);
        fl.position.set(x + dx, top + 0.12, z + dz);
        fl.userData.noCast = true;
        g.add(fl);
      }
    }
  }
  return g;
}

function makeShell(layout) {
  const g = new THREE.Group();
  g.name = 'promenade';
  buildSky(g);
  buildTerrain(g, layout);
  buildBeachAndWater(g, layout);
  buildWall(g, layout);
  buildPaving(g, layout);
  buildSteps(g, layout);
  buildBoardwalk(g, layout);
  buildKiosk(g, layout);
  buildBikes(g, layout);
  buildGrasses(g, layout);
  buildRocks(g, layout);
  buildFoamAndRipples(g, layout);
  buildSails(g, layout);
  buildStreetFurniture(g, layout);
  return g;
}

boot({
  makeShell,
  makeProcedural: buildPlants,
  readyText: 'ready — seaside promenade · drag orbit · U unlit · T toon',
});
