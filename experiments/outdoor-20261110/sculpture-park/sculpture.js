import * as THREE from 'three';
import { mergeGeometries } from './vendor/utils/BufferGeometryUtils.js';
import { boot, toon, tag } from './scene_lib.js';

const WHITE = '#ffffff';

function hash2(ix, iz) {
  let n = Math.imul(ix | 0, 374761393) + Math.imul(iz | 0, 668265263);
  n = (n ^ (n >>> 13)) >>> 0;
  return (n % 10000) / 10000;
}

function vnoise(x, z) {
  const x0 = Math.floor(x);
  const z0 = Math.floor(z);
  const fx = x - x0;
  const fz = z - z0;
  const sx = fx * fx * (3 - 2 * fx);
  const sz = fz * fz * (3 - 2 * fz);
  const a = hash2(x0, z0);
  const b = hash2(x0 + 1, z0);
  const c = hash2(x0, z0 + 1);
  const d = hash2(x0 + 1, z0 + 1);
  return a + (b - a) * sx + (c - a) * sz + (a - b - c + d) * sx * sz;
}

function pointInPoly(x, z, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i][0];
    const zi = poly[i][1];
    const xj = poly[j][0];
    const zj = poly[j][1];
    const intersect = (zi > z) !== (zj > z)
      && x < ((xj - xi) * (z - zi)) / ((zj - zi) || 1e-9) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

function moundHeightAt(mounds, x, z) {
  let h = 0;
  for (const m of mounds) {
    const dx = (x - m.position[0]) / m.radius[0];
    const dz = (z - m.position[2]) / m.radius[2];
    const r2 = dx * dx + dz * dz;
    if (r2 < 1) h += m.radius[1] * Math.sqrt(1 - r2);
  }
  return h;
}

function curveFrom(points, closed) {
  const pts = points.map((p) => new THREE.Vector3(p[0], 0, p[1]));
  let loop = closed;
  if (loop && pts.length > 2 && pts[0].distanceTo(pts[pts.length - 1]) < 1e-3) pts.pop();
  if (pts.length < 2) loop = false;
  return new THREE.CatmullRomCurve3(pts, loop, 'centripetal', 0.45);
}

function flipIndex(geo) {
  const idx = geo.index;
  for (let i = 0; i < idx.count; i += 3) {
    const a = idx.getX(i);
    idx.setX(i, idx.getX(i + 1));
    idx.setX(i + 1, a);
  }
  idx.needsUpdate = true;
}

function orientFlatUp(geo) {
  const pos = geo.attributes.position;
  const idx = geo.index;
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const c = new THREE.Vector3();
  let y = 0;
  const samples = Math.min(6, idx.count / 3);
  for (let s = 0; s < samples; s++) {
    const i = s * 3;
    a.fromBufferAttribute(pos, idx.getX(i));
    b.fromBufferAttribute(pos, idx.getX(i + 1));
    c.fromBufferAttribute(pos, idx.getX(i + 2));
    y += b.sub(a).cross(c.sub(a)).y;
  }
  if (y < 0) flipIndex(geo);
  const normals = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) normals[i * 3 + 1] = 1;
  geo.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
  return geo;
}

function meshFrom(geo, material, opts) {
  return tag(new THREE.Mesh(geo, material), opts);
}

function buildGround(layout) {
  const geo = new THREE.PlaneGeometry(120, 90, 70, 52);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  const dry = new THREE.Color('#8c8f66');
  const mid = new THREE.Color('#738056');
  const rich = new THREE.Color('#5d6a44');
  const loop = layout.path.points;
  const col = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const n = vnoise(x * 0.085, z * 0.085);
    const n2 = vnoise(x * 0.22 + 9.2, z * 0.22 - 3.1);
    col.copy(mid);
    col.lerp(dry, THREE.MathUtils.clamp((n - 0.42) * 1.35, 0, 1) * 0.65);
    col.lerp(rich, THREE.MathUtils.clamp((0.52 - n) * 1.2, 0, 1) * 0.55);
    if (pointInPoly(x, z, loop)) col.lerp(rich, 0.22);
    else col.lerp(dry, 0.16);
    if (z > 7.5) col.lerp(dry, Math.min(0.4, (z - 7.5) / 12));
    const dBasin = Math.hypot(x - 0.2, z + 0.4);
    if (dBasin < 9) col.lerp(rich, (1 - dBasin / 9) * 0.28);
    col.offsetHSL(0, (n2 - 0.5) * 0.04, (n2 - 0.5) * 0.03);
    colors[i * 3] = col.r;
    colors[i * 3 + 1] = col.g;
    colors[i * 3 + 2] = col.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.computeVertexNormals();
  const mat = toon(WHITE, { vertexColors: true });
  return meshFrom(geo, mat, { cast: false, receive: true });
}

function buildMounds(layout) {
  const group = new THREE.Group();
  group.name = 'mounds';
  for (const m of layout.mounds) {
    const geo = new THREE.SphereGeometry(1, 28, 16, 0, Math.PI * 2, 0, Math.PI * 0.5);
    const mesh = meshFrom(geo, toon(m.color), { cast: true, receive: true });
    mesh.scale.set(m.radius[0], m.radius[1], m.radius[2]);
    mesh.position.set(m.position[0], -0.03, m.position[2]);
    mesh.name = m.id;
    group.add(mesh);
  }
  return group;
}

function ribbonStrip(curve, divisions, halfWidthAt, yAt, colorAt, closed) {
  const count = divisions;
  const pts = [];
  for (let i = 0; i <= (closed ? count - 1 : count); i++) {
    const t = i / count;
    const p = curve.getPoint(t);
    const tan = curve.getTangent(t);
    let nx = -tan.z;
    let nz = tan.x;
    const nl = Math.hypot(nx, nz) || 1;
    nx /= nl;
    nz /= nl;
    const y = yAt(p, t);
    const w = halfWidthAt(t);
    pts.push({ x: p.x, y, z: p.z, nx, nz, w, t });
  }
  const n = pts.length;
  const positions = new Float32Array(n * 2 * 3);
  const colors = new Float32Array(n * 2 * 3);
  for (let i = 0; i < n; i++) {
    const p = pts[i];
    const col = colorAt(p.x, p.z, p.t);
    for (let s = 0; s < 2; s++) {
      const sign = s === 0 ? -1 : 1;
      const o = (i * 2 + s) * 3;
      positions[o] = p.x + p.nx * p.w * sign;
      positions[o + 1] = p.y;
      positions[o + 2] = p.z + p.nz * p.w * sign;
      colors[o] = col.r;
      colors[o + 1] = col.g;
      colors[o + 2] = col.b;
    }
  }
  const quads = closed ? n : n - 1;
  const indices = [];
  for (let i = 0; i < quads; i++) {
    const i2 = (i + 1) % n;
    const a = i * 2;
    const b = i * 2 + 1;
    const c = i2 * 2;
    const d = i2 * 2 + 1;
    indices.push(a, c, d, a, d, b);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.setIndex(indices);
  orientFlatUp(geo);
  return geo;
}

function buildPaths(layout, mounds) {
  const group = new THREE.Group();
  const yOf = (p) => Math.max(layout.path.y, moundHeightAt(mounds, p.x, p.z) + 0.03);
  const gravelA = new THREE.Color('#c9bca8');
  const gravelB = new THREE.Color('#b4a690');
  const gravelC = new THREE.Color('#ddd2c0');
  const colorAt = (x, z) => {
    const n = vnoise(x * 0.95, z * 0.95);
    const col = gravelA.clone();
    if (n > 0.55) col.lerp(gravelC, (n - 0.55) * 1.6);
    else col.lerp(gravelB, (0.55 - n) * 1.1);
    return col;
  };
  const addRibbon = (spec, closed) => {
    const curve = curveFrom(spec.points, closed);
    const divs = Math.max(24, spec.points.length * (closed ? 10 : 6));
    const half = spec.width * 0.5;
    const edge = ribbonStrip(curve, divs, () => half + 0.16, (p) => yOf(p) - 0.012, () => new THREE.Color('#746858'), closed);
    const top = ribbonStrip(curve, divs, () => half, yOf, colorAt, closed);
    group.add(meshFrom(edge, toon(WHITE, { vertexColors: true }), { cast: false, receive: true }));
    group.add(meshFrom(top, toon(WHITE, { vertexColors: true }), { cast: false, receive: true }));
  };
  addRibbon(layout.path, true);
  addRibbon(layout.spur, false);
  const apronMat = toon('#c6b9a4');
  const entry = meshFrom(new THREE.CircleGeometry(1, 24), apronMat, { cast: false, receive: true });
  entry.geometry.rotateX(-Math.PI / 2);
  entry.scale.set(2.5, 1, 1.7);
  entry.position.set(layout.path.points[0][0], layout.path.y - 0.004, layout.path.points[0][1]);
  group.add(entry);
  const court = meshFrom(new THREE.CircleGeometry(1, 24), toon('#c2b49e'), { cast: false, receive: true });
  court.geometry.rotateX(-Math.PI / 2);
  court.scale.set(3.8, 1, 3.0);
  const fin = layout.works.fins.position;
  court.position.set(fin[0] + 0.15, layout.path.y - 0.006, fin[2] + 0.1);
  group.add(court);
  return group;
}

function resampleClosed(outline, n) {
  const curve = curveFrom(outline, true);
  const out = [];
  for (let i = 0; i < n; i++) {
    const p = curve.getPoint(i / n);
    out.push([p.x, p.z]);
  }
  return out;
}

function outwardNormals(outline) {
  let area = 0;
  for (let i = 0; i < outline.length; i++) {
    const j = (i + 1) % outline.length;
    area += outline[i][0] * outline[j][1] - outline[j][0] * outline[i][1];
  }
  const sign = area > 0 ? 1 : -1;
  const normals = [];
  const n = outline.length;
  for (let i = 0; i < n; i++) {
    const prev = outline[(i - 1 + n) % n];
    const next = outline[(i + 1) % n];
    const dx = next[0] - prev[0];
    const dz = next[1] - prev[1];
    let nx = dz * sign;
    let nz = -dx * sign;
    const len = Math.hypot(nx, nz) || 1;
    normals.push([nx / len, nz / len]);
  }
  return normals;
}

function buildBasin(layout) {
  const group = new THREE.Group();
  const outline = resampleClosed(layout.basin.outline, 72);
  const y = layout.basin.y;
  const n = outline.length;
  let cx = 0;
  let cz = 0;
  for (const p of outline) {
    cx += p[0];
    cz += p[1];
  }
  cx /= n;
  cz /= n;
  const rings = 14;
  const deep = new THREE.Color('#3a5160');
  const midC = new THREE.Color('#4d6772');
  const shallow = new THREE.Color('#86a09c');
  const positions = [];
  const colors = [];
  positions.push(cx, y, cz);
  colors.push(deep.r, deep.g, deep.b);
  for (let r = 1; r <= rings; r++) {
    const t = r / rings;
    for (let i = 0; i < n; i++) {
      const x = cx + (outline[i][0] - cx) * t;
      const z = cz + (outline[i][1] - cz) * t;
      const ripple = Math.sin(t * Math.PI * 4.2 + i * 0.22) * 0.011 * (0.35 + t);
      positions.push(x, y + ripple, z);
      const col = deep.clone().lerp(midC, Math.min(1, t * 1.25)).lerp(shallow, t ** 1.7);
      colors.push(col.r, col.g, col.b);
    }
  }
  const indices = [];
  for (let i = 0; i < n; i++) {
    const a = 1 + i;
    const b = 1 + ((i + 1) % n);
    indices.push(0, a, b);
  }
  for (let r = 1; r < rings; r++) {
    const base = 1 + (r - 1) * n;
    const next = 1 + r * n;
    for (let i = 0; i < n; i++) {
      const i2 = (i + 1) % n;
      const a = base + i;
      const b = base + i2;
      const c = next + i;
      const d = next + i2;
      indices.push(a, c, d, a, d, b);
    }
  }
  const waterGeo = new THREE.BufferGeometry();
  waterGeo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  waterGeo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  waterGeo.setIndex(indices);
  orientFlatUp(waterGeo);
  group.add(meshFrom(waterGeo, toon(WHITE, { vertexColors: true }), { cast: false, receive: true }));

  const norms = outwardNormals(outline);
  const yTop = layout.basin.copingTop;
  const yBot = -0.02;
  const width = 0.48;
  const cPos = [];
  const cCol = [];
  const cIdx = [];
  const top = new THREE.Color('#d0c9bb');
  const side = new THREE.Color('#b7b0a2');
  const lengths = [0];
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    const last = lengths[lengths.length - 1];
    lengths.push(last + Math.hypot(outline[j][0] - outline[i][0], outline[j][1] - outline[i][1]));
  }
  for (let i = 0; i < n; i++) {
    const x = outline[i][0];
    const z = outline[i][1];
    const ox = x + norms[i][0] * width;
    const oz = z + norms[i][1] * width;
    cPos.push(x, yBot, z, ox, yBot, oz, ox, yTop, oz, x, yTop, z);
    const joint = (lengths[i] % 1.15) < 0.08;
    for (let v = 0; v < 4; v++) {
      const col = (v >= 2 ? top : side).clone();
      if (joint) col.multiplyScalar(0.78);
      cCol.push(col.r, col.g, col.b);
    }
  }
  const quad = (a, b, c, d) => cIdx.push(a, b, c, a, c, d);
  for (let i = 0; i < n; i++) {
    const A = i * 4;
    const B = ((i + 1) % n) * 4;
    quad(A, B, B + 1, A + 1);
    quad(A + 1, B + 1, B + 2, A + 2);
    quad(A + 3, A + 2, B + 2, B + 3);
    quad(A, A + 3, B + 3, B);
  }
  const coping = new THREE.BufferGeometry();
  coping.setAttribute('position', new THREE.Float32BufferAttribute(cPos, 3));
  coping.setAttribute('color', new THREE.Float32BufferAttribute(cCol, 3));
  coping.setIndex(cIdx);
  coping.computeVertexNormals();
  group.add(meshFrom(coping, toon(WHITE, { vertexColors: true, side: THREE.DoubleSide }), { cast: true, receive: true }));

  const rippleMat = toon('#6d8684', {
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
  });
  const ripples = [
    { r: 0.72, arc: 2.1, x: cx + 0.9, z: cz - 0.35, rot: 0.4 },
    { r: 1.35, arc: 1.5, x: cx - 0.55, z: cz + 0.7, rot: 2.2 },
    { r: 0.48, arc: 2.6, x: cx + 1.55, z: cz + 0.15, rot: -0.6 },
  ];
  for (const rip of ripples) {
    const ring = meshFrom(new THREE.TorusGeometry(rip.r, 0.011, 4, 24, rip.arc), rippleMat, { cast: false, receive: false });
    ring.rotation.x = Math.PI / 2;
    ring.rotation.z = rip.rot;
    ring.position.set(rip.x, y + 0.018, rip.z);
    group.add(ring);
  }
  group.userData.outline = outline;
  group.userData.center = [cx, cz];
  return group;
}

function buildRibbon(layout, basinOutline) {
  const group = new THREE.Group();
  const controls = layout.works.meridian.controls.map((p) => new THREE.Vector3(p[0], p[1], p[2]));
  const curve = new THREE.CatmullRomCurve3(controls, false, 'centripetal', 0.4);
  const N = 90;
  const ring = [
    [-1, 0.32], [-0.75, 1], [0.75, 1], [1, 0.32],
    [1, -0.32], [0.75, -1], [-0.75, -1], [-1, -0.32],
  ];
  const C = ring.length;
  const positions = [];
  const colors = [];
  const root = new THREE.Color('#6b442e');
  const crest = new THREE.Color('#c28c54');
  const tip = new THREE.Color('#7a5136');
  const samples = [];
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    const p = curve.getPoint(t);
    const T = curve.getTangent(t).normalize();
    const B = new THREE.Vector3(-T.z, 0, T.x);
    if (B.lengthSq() < 1e-8) B.set(1, 0, 0);
    B.normalize();
    const Nrm = new THREE.Vector3().crossVectors(B, T).normalize();
    const width = (1.08 * (1 - t) + 0.4 * t) * 0.5;
    const thick = (0.2 * (1 - t) + 0.1 * t) * 0.5;
    const base = t < 0.58 ? root.clone().lerp(crest, t / 0.58) : crest.clone().lerp(tip, (t - 0.58) / 0.42);
    samples.push({ p, B, Nrm, width, t });
    for (const [cx, cy] of ring) {
      const pos = p.clone().addScaledVector(B, cx * width).addScaledVector(Nrm, cy * thick);
      positions.push(pos.x, pos.y, pos.z);
      const col = base.clone();
      col.multiplyScalar(cy < 0 ? 0.74 : 1.02 + cy * 0.05);
      colors.push(col.r, col.g, col.b);
    }
  }
  const indices = [];
  for (let i = 0; i < N; i++) {
    for (let c = 0; c < C; c++) {
      const c2 = (c + 1) % C;
      const a = i * C + c;
      const b = i * C + c2;
      const d = (i + 1) * C + c;
      const e = (i + 1) * C + c2;
      indices.push(a, d, e, a, e, b);
    }
  }
  for (let c = 1; c < C - 1; c++) indices.push(0, c + 1, c);
  const last = N * C;
  for (let c = 1; c < C - 1; c++) indices.push(last, last + c, last + c + 1);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  const posAttr = geo.attributes.position;
  const nAttr = geo.attributes.normal;
  let score = 0;
  for (let i = 0; i < N; i += 10) {
    const s = samples[i];
    const vi = i * C + 1;
    const nrm = new THREE.Vector3().fromBufferAttribute(nAttr, vi);
    const outward = new THREE.Vector3().fromBufferAttribute(posAttr, vi).sub(s.p);
    score += nrm.dot(outward);
  }
  if (score < 0) {
    flipIndex(geo);
    geo.computeVertexNormals();
  }
  group.add(meshFrom(geo, toon(WHITE, { vertexColors: true }), { cast: true, receive: true }));

  const rPos = [];
  const rIdx = [];
  const stations = [];
  for (let i = 0; i <= 70; i++) {
    const t = i / 70;
    const p = curve.getPoint(t);
    const inside = pointInPoly(p.x, p.z, basinOutline);
    const T = curve.getTangent(t);
    let bx = -T.z;
    let bz = T.x;
    const bl = Math.hypot(bx, bz) || 1;
    bx /= bl;
    bz /= bl;
    const w = (1.08 * (1 - t) + 0.4 * t) * 0.22;
    stations.push({ inside, x: p.x, z: p.z, bx, bz, w });
  }
  for (let i = 0; i < stations.length - 1; i++) {
    if (!stations[i].inside || !stations[i + 1].inside) continue;
    const a = stations[i];
    const b = stations[i + 1];
    const base = rPos.length / 3;
    const yR = layout.basin.y + 0.018;
    rPos.push(a.x - a.bx * a.w, yR, a.z - a.bz * a.w);
    rPos.push(a.x + a.bx * a.w, yR, a.z + a.bz * a.w);
    rPos.push(b.x - b.bx * b.w, yR, b.z - b.bz * b.w);
    rPos.push(b.x + b.bx * b.w, yR, b.z + b.bz * b.w);
    rIdx.push(base, base + 2, base + 3, base, base + 3, base + 1);
  }
  if (rIdx.length) {
    const rGeo = new THREE.BufferGeometry();
    rGeo.setAttribute('position', new THREE.Float32BufferAttribute(rPos, 3));
    rGeo.setIndex(rIdx);
    orientFlatUp(rGeo);
    const reflection = meshFrom(rGeo, toon('#314854', {
      polygonOffset: true,
      polygonOffsetFactor: -3,
      polygonOffsetUnits: -3,
    }), { cast: false, receive: false });
    group.add(reflection);
  }

  const shape = new THREE.Shape();
  shape.moveTo(-0.95, -0.42);
  shape.bezierCurveTo(-1.15, 0.05, -0.55, 0.62, 0.1, 0.5);
  shape.bezierCurveTo(0.75, 0.38, 1.1, 0.02, 0.82, -0.4);
  shape.bezierCurveTo(0.35, -0.72, -0.25, -0.68, -0.95, -0.42);
  const shoeGeo = new THREE.ExtrudeGeometry(shape, {
    depth: 0.22,
    bevelEnabled: true,
    bevelThickness: 0.04,
    bevelSize: 0.09,
    bevelSegments: 2,
  });
  shoeGeo.rotateX(-Math.PI / 2);
  shoeGeo.computeBoundingBox();
  shoeGeo.translate(0, -shoeGeo.boundingBox.min.y, 0);
  const shoe = meshFrom(shoeGeo, toon('#cfc6b8'), { cast: true, receive: true });
  const rootP = layout.works.meridian.controls[0];
  shoe.position.set(rootP[0], 0, rootP[2]);
  shoe.rotation.y = 0.55;
  group.add(shoe);
  return group;
}

function seatOnMound(layout, x, z) {
  return moundHeightAt(layout.mounds, x, z);
}

function buildCoil(layout) {
  const spec = layout.works.coil;
  const group = new THREE.Group();
  const y = seatOnMound(layout, spec.position[0], spec.position[2]);
  group.position.set(spec.position[0], y, spec.position[2]);
  const poses = [
    { rot: [0.15, 0.55, 0.22], shift: [0, 0, 0] },
    { rot: [0.7, -0.85, 0.35], shift: [0.28, 0, 0.12] },
    { rot: [1.2, 0.3, -0.15], shift: [-0.08, -0.12, 0.22] },
  ];
  spec.rings.forEach((ring, i) => {
    const geo = new THREE.TorusGeometry(ring.radius, ring.tube, 8, Math.max(18, Math.floor(ring.arc * 16)), ring.arc);
    const mesh = meshFrom(geo, toon(ring.color), { cast: true, receive: true });
    mesh.rotation.set(...poses[i].rot);
    mesh.position.set(...poses[i].shift);
    mesh.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(mesh);
    mesh.position.y += poses[i].shift[1] - box.min.y - (i === 2 ? 0.18 : 0.02);
    group.add(mesh);
  });
  return group;
}

function buildFins(layout) {
  const spec = layout.works.fins;
  const group = new THREE.Group();
  group.position.set(spec.position[0], 0, spec.position[2]);
  const plateShape = [
    [-1.35, -1.55],
    [0.45, -1.75],
    [1.85, -0.55],
    [1.65, 1.05],
    [0.15, 1.35],
    [-1.15, 0.65],
  ];
  const shape = new THREE.Shape();
  shape.moveTo(plateShape[0][0], plateShape[0][1]);
  for (let i = 1; i < plateShape.length; i++) shape.lineTo(plateShape[i][0], plateShape[i][1]);
  shape.closePath();
  const padGeo = new THREE.ShapeGeometry(shape);
  padGeo.rotateX(-Math.PI / 2);
  const pad = meshFrom(padGeo, toon('#4e3d32'), { cast: false, receive: true });
  pad.position.y = 0.025;
  group.add(pad);
  for (const plate of spec.plates) {
    const finShape = new THREE.Shape();
    finShape.moveTo(-plate.wb / 2, 0);
    finShape.lineTo(plate.wb / 2, 0);
    finShape.lineTo(plate.wt / 2, plate.h);
    finShape.lineTo(-plate.wt / 2, plate.h);
    finShape.closePath();
    const geo = new THREE.ExtrudeGeometry(finShape, {
      depth: plate.t,
      bevelEnabled: true,
      bevelThickness: 0.012,
      bevelSize: 0.018,
      bevelSegments: 1,
    });
    geo.translate(0, 0, -plate.t / 2);
    const mesh = meshFrom(geo, toon(plate.color), { cast: true, receive: true });
    mesh.position.set(plate.x, 0, plate.z);
    mesh.rotation.y = plate.rotY;
    mesh.rotation.z = plate.lean;
    group.add(mesh);
  }
  return group;
}

function arcBand(innerR, outerR, y0, y1, a0, a1, segs) {
  const positions = [];
  for (let i = 0; i <= segs; i++) {
    const a = a0 + ((a1 - a0) * i) / segs;
    const s = Math.sin(a);
    const c = Math.cos(a);
    positions.push(s * innerR, y0, c * innerR);
    positions.push(s * outerR, y0, c * outerR);
    positions.push(s * outerR, y1, c * outerR);
    positions.push(s * innerR, y1, c * innerR);
  }
  const indices = [];
  const quad = (a, b, c, d) => indices.push(a, b, c, a, c, d);
  for (let i = 0; i < segs; i++) {
    const A = i * 4;
    const B = (i + 1) * 4;
    quad(A, B, B + 1, A + 1);
    quad(A + 1, B + 1, B + 2, A + 2);
    quad(A + 3, A + 2, B + 2, B + 3);
    quad(A, A + 3, B + 3, B);
  }
  indices.push(0, 1, 2, 0, 2, 3);
  const E = segs * 4;
  indices.push(E, E + 3, E + 2, E, E + 2, E + 1);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  const pos = geo.attributes.position;
  const idx = geo.index;
  let bestR = -1;
  let bestDot = 0;
  const va = new THREE.Vector3();
  const vb = new THREE.Vector3();
  const vc = new THREE.Vector3();
  for (let i = 0; i < idx.count; i += 3) {
    va.fromBufferAttribute(pos, idx.getX(i));
    vb.fromBufferAttribute(pos, idx.getX(i + 1));
    vc.fromBufferAttribute(pos, idx.getX(i + 2));
    const mx = (va.x + vb.x + vc.x) / 3;
    const mz = (va.z + vb.z + vc.z) / 3;
    const r = Math.hypot(mx, mz);
    if (r > bestR) {
      bestR = r;
      const ab = vb.clone().sub(va);
      const ac = vc.clone().sub(va);
      const n = ab.cross(ac);
      bestDot = n.x * mx + n.z * mz;
    }
  }
  if (bestDot < 0) {
    flipIndex(geo);
    geo.computeVertexNormals();
  }
  return geo;
}

function buildExedra(layout) {
  const spec = layout.seating.find((s) => s.kind === 'exedra');
  const group = new THREE.Group();
  const R = spec.radius;
  const a = spec.arc;
  const seat = arcBand(R - 0.02, R + 0.36, 0, 0.44, -a, a, 28);
  const back = arcBand(R + 0.375, R + 0.52, 0, 0.9, -a, a, 28);
  group.add(meshFrom(seat, toon('#d7d0c2'), { cast: true, receive: true }));
  group.add(meshFrom(back, toon('#c9c2b4'), { cast: true, receive: true }));
  group.position.set(spec.position[0], spec.position[1], spec.position[2]);
  group.rotation.y = spec.rotationY;
  group.name = 'exedra';
  return group;
}

function trunk(radiusTop, radiusBot, height, color) {
  return meshFrom(new THREE.CylinderGeometry(radiusTop, radiusBot, height, 7), toon(color), { cast: true, receive: true });
}

function blob(sx, sy, sz, color) {
  const m = meshFrom(new THREE.SphereGeometry(1, 8, 6), toon(color), { cast: true, receive: true });
  m.scale.set(sx, sy, sz);
  return m;
}

function darken(hex, amount) {
  return new THREE.Color(hex).multiplyScalar(amount).getStyle();
}

function buildOak(scale, groundY, shade) {
  const g = new THREE.Group();
  const s = scale;
  const k = shade;
  const trunkH = 2.15 * s;
  const stem = trunk(0.1 * s, 0.18 * s, trunkH, darken('#5c4636', k));
  stem.position.y = groundY + trunkH / 2;
  g.add(stem);
  const fork = trunk(0.055 * s, 0.09 * s, 1.25 * s, darken('#554030', k));
  fork.position.set(0.18 * s, groundY + trunkH * 0.78, 0.04 * s);
  fork.rotation.z = -0.55;
  g.add(fork);
  const bits = [
    [0.05, 1.25, 0.05, 1.55, 0.82, 1.35, '#4a5c42'],
    [0.85, 1.0, 0.35, 1.05, 0.68, 0.95, '#567056'],
    [-0.8, 1.05, -0.25, 1.15, 0.7, 1.0, '#3e5340'],
    [0.3, 1.6, -0.5, 0.95, 0.58, 0.85, '#5d7050'],
    [-0.35, 0.72, 0.6, 0.9, 0.55, 0.8, '#445848'],
    [1.0, 0.55, -0.4, 0.72, 0.48, 0.62, '#4e6248'],
    [-0.15, 1.85, 0.2, 0.7, 0.42, 0.6, '#688060'],
  ];
  for (const b of bits) {
    const m = blob(b[3] * s, b[4] * s, b[5] * s, darken(b[6], k));
    m.position.set(b[0] * s, groundY + trunkH * 0.48 + b[1] * s, b[2] * s);
    g.add(m);
  }
  return g;
}

function buildPine(scale, groundY, shade) {
  const g = new THREE.Group();
  const s = scale;
  const trunkH = 1.35 * s;
  const stem = trunk(0.07 * s, 0.12 * s, trunkH, darken('#4a3b30', shade));
  stem.position.y = groundY + trunkH / 2;
  g.add(stem);
  const levels = [
    [1.05, 1.2, 1.4],
    [1.95, 0.98, 1.2],
    [2.75, 0.74, 1.05],
    [3.45, 0.5, 0.9],
    [4.05, 0.28, 0.7],
  ];
  const greens = ['#3a4c3c', '#466048', '#354638', '#516850', '#3e5244'];
  levels.forEach((lv, i) => {
    const cone = meshFrom(new THREE.ConeGeometry(lv[1] * s, lv[2] * s, 8), toon(darken(greens[i], shade)), { cast: true, receive: true });
    cone.position.set((i % 2 === 0 ? 0.08 : -0.06) * s, groundY + lv[0] * s, (i % 3 === 0 ? -0.05 : 0.04) * s);
    g.add(cone);
  });
  return g;
}

function buildBirch(scale, groundY) {
  const g = new THREE.Group();
  const s = scale;
  const h = 3.4 * s;
  const stems = [
    [0, 0, 0.03, 0],
    [0.32, 0.12, -0.05, 0.08],
    [-0.24, -0.08, 0.07, -0.04],
    [0.06, -0.3, -0.02, 0.05],
  ];
  for (const t of stems) {
    const m = trunk(0.04 * s, 0.065 * s, h, '#e4ddd0');
    m.position.set(t[0] * s, groundY + h / 2, t[1] * s);
    m.rotation.z = t[2];
    m.rotation.x = t[3];
    g.add(m);
    for (let k = 0; k < 4; k++) {
      const mark = meshFrom(new THREE.CylinderGeometry(0.05 * s, 0.05 * s, 0.018 * s, 6), toon('#3a342e'), { cast: false, receive: false });
      mark.position.set(t[0] * s, groundY + (0.55 + k * 0.72) * s, t[1] * s);
      g.add(mark);
    }
  }
  const crowns = [
    [0.1, 3.15, 0.0, 0.72, 0.42, 0.58, '#8d9362'],
    [0.5, 2.95, 0.25, 0.5, 0.32, 0.42, '#7e8656'],
    [-0.4, 3.05, -0.18, 0.55, 0.3, 0.4, '#969c6c'],
    [0.15, 3.45, -0.2, 0.4, 0.26, 0.34, '#848c58'],
  ];
  for (const c of crowns) {
    const m = blob(c[3] * s, c[4] * s, c[5] * s, c[6]);
    m.position.set(c[0] * s, groundY + c[1] * s, c[2] * s);
    g.add(m);
  }
  return g;
}

function buildWillow(scale, groundY) {
  const g = new THREE.Group();
  const s = scale;
  const stem = trunk(0.08 * s, 0.14 * s, 1.55 * s, '#5a4638');
  stem.position.set(0.05 * s, groundY + 0.78 * s, 0);
  stem.rotation.z = -0.42;
  g.add(stem);
  const origin = new THREE.Vector3(0.28 * s, groundY + 1.4 * s, 0);
  const drops = [
    [1.7, 0.15],
    [1.35, 0.7],
    [1.85, -0.4],
    [1.15, 0.45],
    [1.5, -0.15],
  ];
  for (const d of drops) {
    const end = origin.clone().add(new THREE.Vector3(d[0] * s, -1.05 * s, d[1] * s));
    const curve = new THREE.CatmullRomCurve3([
      origin.clone(),
      origin.clone().add(new THREE.Vector3(d[0] * 0.4 * s, 0.12 * s, d[1] * 0.35 * s)),
      origin.clone().add(new THREE.Vector3(d[0] * 0.78 * s, -0.4 * s, d[1] * 0.75 * s)),
      end,
    ]);
    const tube = meshFrom(new THREE.TubeGeometry(curve, 7, 0.028 * s, 5, false), toon('#4d5c3e'), { cast: true, receive: false });
    g.add(tube);
    const leaf = blob(0.36 * s, 0.2 * s, 0.26 * s, '#5c6e4a');
    leaf.position.copy(end);
    g.add(leaf);
  }
  return g;
}

function buildShrub(scale, groundY, color) {
  const g = new THREE.Group();
  const parts = [
    [0, 0.48, 0, 1.05, 0.62, 0.9],
    [0.38, 0.34, 0.12, 0.62, 0.46, 0.55],
    [-0.32, 0.38, -0.16, 0.58, 0.42, 0.5],
  ];
  for (const p of parts) {
    const m = blob(p[3] * scale, p[4] * scale, p[5] * scale, color);
    m.position.set(p[0] * scale, groundY + p[1] * scale, p[2] * scale);
    g.add(m);
  }
  return g;
}

function buildPlanting(layout) {
  const group = new THREE.Group();
  const groundY = (x, z) => moundHeightAt(layout.mounds, x, z);
  const place = (obj, spec) => {
    const x = spec.position[0];
    const z = spec.position[2];
    obj.position.x += x;
    obj.position.z += z;
    group.add(obj);
  };
  for (const spec of layout.specimens) {
    const y = groundY(spec.position[0], spec.position[2]);
    let obj;
    if (spec.kind === 'oak') obj = buildOak(spec.scale, y, 1);
    else if (spec.kind === 'pine') obj = buildPine(spec.scale, y, 1);
    else if (spec.kind === 'birch') obj = buildBirch(spec.scale, y);
    else if (spec.kind === 'willow') obj = buildWillow(spec.scale, y);
    else obj = buildShrub(spec.scale, y, spec.color || '#5c6a48');
    obj.name = spec.id;
    place(obj, spec);
  }
  for (const spec of layout.background) {
    const y = groundY(spec.position[0], spec.position[2]);
    const shade = 0.78;
    const obj = spec.kind === 'pine'
      ? buildPine(spec.scale, y, shade)
      : buildOak(spec.scale, y, shade);
    place(obj, spec);
  }
  return group;
}

function buildUnderstory(layout, basinOutline) {
  const group = new THREE.Group();
  const mounds = layout.mounds;
  const curve = curveFrom(layout.path.points, true);
  const half = layout.path.width * 0.5;
  const spots = [
    [0.04, 1, 0.55, 0.72],
    [0.065, 1, 0.85, 0.48],
    [0.17, -1, 0.6, 0.62],
    [0.31, 1, 0.7, 0.8],
    [0.345, 1, 0.95, 0.42],
    [0.46, -1, 0.5, 0.58],
    [0.55, 1, 0.75, 0.7],
    [0.6, 1, 0.45, 0.9],
    [0.72, -1, 0.65, 0.5],
    [0.8, 1, 0.8, 0.66],
    [0.9, -1, 0.55, 0.74],
    [0.95, 1, 0.9, 0.4],
  ];
  const bladesA = [];
  const bladesB = [];
  const coneA = new THREE.ConeGeometry(0.028, 1, 4);
  const coneB = new THREE.ConeGeometry(0.022, 1, 3);
  coneA.translate(0, 0.5, 0);
  coneB.translate(0, 0.5, 0);
  const seats = layout.seating.map((s) => s.seatPosition || s.position);
  for (const [t, side, extra, height] of spots) {
    const p = curve.getPoint(t);
    const tan = curve.getTangent(t);
    const nx = -tan.z;
    const nz = tan.x;
    const dist = half + extra;
    const x = p.x + nx * dist * side;
    const z = p.z + nz * dist * side;
    if (pointInPoly(x, z, basinOutline)) continue;
    if (seats.some((s) => Math.hypot(s[0] - x, s[2] - z) < 1.3)) continue;
    const y = moundHeightAt(mounds, x, z);
    const nBlades = 5 + Math.floor(hash2(Math.floor(t * 40), side + 3) * 4);
    for (let i = 0; i < nBlades; i++) {
      const geo = (i % 2 === 0 ? coneA : coneB).clone();
      const h = height * (0.75 + hash2(i, Math.floor(t * 50)) * 0.55);
      const m = new THREE.Matrix4();
      const lean = (hash2(i, 7) - 0.5) * 0.5;
      m.makeRotationZ(lean);
      m.premultiply(new THREE.Matrix4().makeScale(1, h, 1));
      m.premultiply(new THREE.Matrix4().makeRotationY(i * 0.9 + t * 6));
      m.premultiply(new THREE.Matrix4().makeTranslation(
        x + (hash2(i, 2) - 0.5) * 0.28,
        y,
        z + (hash2(i, 5) - 0.5) * 0.28,
      ));
      geo.applyMatrix4(m);
      (i % 2 === 0 ? bladesA : bladesB).push(geo);
    }
  }
  if (bladesA.length) {
    group.add(meshFrom(mergeGeometries(bladesA), toon('#6d7848'), { cast: false, receive: true }));
    group.add(meshFrom(mergeGeometries(bladesB), toon('#8a8a5c'), { cast: false, receive: true }));
  }

  let rx = -3.75;
  let rz = -3.4;
  for (let k = 0; k < 10 && pointInPoly(rx, rz, basinOutline); k++) rz -= 0.18;
  const reeds = [];
  const heads = [];
  const stemGeo = new THREE.CylinderGeometry(0.012, 0.016, 1, 4);
  stemGeo.translate(0, 0.5, 0);
  const headGeo = new THREE.SphereGeometry(0.035, 5, 4);
  for (let i = 0; i < 16; i++) {
    const h = 0.85 + hash2(i, 4) * 0.7;
    const x = rx + (hash2(i, 1) - 0.5) * 1.1;
    const z = rz + (hash2(i, 8) - 0.35) * 0.7;
    if (pointInPoly(x, z, basinOutline)) continue;
    const sg = stemGeo.clone();
    sg.applyMatrix4(new THREE.Matrix4().makeScale(1, h, 1));
    sg.applyMatrix4(new THREE.Matrix4().makeRotationZ((hash2(i, 3) - 0.5) * 0.25));
    sg.applyMatrix4(new THREE.Matrix4().makeTranslation(x, 0, z));
    reeds.push(sg);
    const hg = headGeo.clone();
    hg.translate(x, h * 0.96, z);
    heads.push(hg);
  }
  if (reeds.length) {
    group.add(meshFrom(mergeGeometries(reeds), toon('#5a6844'), { cast: false, receive: true }));
    group.add(meshFrom(mergeGeometries(heads), toon('#6e6848'), { cast: false, receive: false }));
  }

  const willow = layout.specimens.find((s) => s.id === 'willow');
  const rockCols = ['#b7b1a6', '#9a948a', '#c8c2b6'];
  rockCols.forEach((color, i) => {
    const rock = blob(0.28 - i * 0.04, 0.12, 0.22 - i * 0.03, color);
    rock.position.set(willow.position[0] + 0.35 + i * 0.28, 0.06, willow.position[2] + 0.15 - i * 0.12);
    group.add(rock);
  });
  return group;
}

function makeShell(layout) {
  const g = new THREE.Group();
  g.name = 'sculpture-park';
  g.add(buildGround(layout));
  g.add(buildMounds(layout));
  g.add(buildPaths(layout, layout.mounds));
  const basin = buildBasin(layout);
  g.add(basin);
  g.add(buildRibbon(layout, basin.userData.outline));
  g.add(buildCoil(layout));
  g.add(buildFins(layout));
  g.add(buildExedra(layout));
  g.add(buildPlanting(layout));
  g.add(buildUnderstory(layout, basin.userData.outline));
  return g;
}

boot({
  makeShell,
  readyText: 'ready — sculpture park · drag orbit · U unlit · T toon',
});
