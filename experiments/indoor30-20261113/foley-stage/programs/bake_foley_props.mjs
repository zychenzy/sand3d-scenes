/**
 * Bake the foley props the local Sandflow catalog does not have.
 * sand3d / bake_preferred.py are not installed here, so this writes
 * glTF 2.0 binary directly. Units are metres. Run from anywhere:
 *   node experiments/indoor30-20261113/foley-stage/programs/bake_foley_props.mjs
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const outDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'assets');
mkdirSync(outDir, { recursive: true });

function matIdent() {
  return [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
}
function matMul(a, b) {
  const o = new Array(16).fill(0);
  for (let c = 0; c < 4; c++) {
    for (let r = 0; r < 4; r++) {
      o[c * 4 + r] = a[r] * b[c * 4] + a[4 + r] * b[c * 4 + 1] + a[8 + r] * b[c * 4 + 2] + a[12 + r] * b[c * 4 + 3];
    }
  }
  return o;
}
function matT(x, y, z) {
  const m = matIdent();
  m[12] = x; m[13] = y; m[14] = z;
  return m;
}
function matRx(a) {
  const c = Math.cos(a); const s = Math.sin(a);
  return [1, 0, 0, 0, 0, c, s, 0, 0, -s, c, 0, 0, 0, 0, 1];
}
function matRy(a) {
  const c = Math.cos(a); const s = Math.sin(a);
  return [c, 0, -s, 0, 0, 1, 0, 0, s, 0, c, 0, 0, 0, 0, 1];
}

function apply(m, x, y, z, normal) {
  const rx = m[0] * x + m[4] * y + m[8] * z + (normal ? 0 : m[12]);
  const ry = m[1] * x + m[5] * y + m[9] * z + (normal ? 0 : m[13]);
  const rz = m[2] * x + m[6] * y + m[10] * z + (normal ? 0 : m[14]);
  return [rx, ry, rz];
}

function box(w, h, d) {
  const x = w / 2; const y = h / 2; const z = d / 2;
  const faces = [
    [[x, -y, -z], [x, y, -z], [x, y, z], [x, -y, z], [1, 0, 0]],
    [[-x, -y, z], [-x, y, z], [-x, y, -z], [-x, -y, -z], [-1, 0, 0]],
    [[-x, y, -z], [-x, y, z], [x, y, z], [x, y, -z], [0, 1, 0]],
    [[-x, -y, z], [-x, -y, -z], [x, -y, -z], [x, -y, z], [0, -1, 0]],
    [[-x, -y, z], [x, -y, z], [x, y, z], [-x, y, z], [0, 0, 1]],
    [[x, -y, -z], [-x, -y, -z], [-x, y, -z], [x, y, -z], [0, 0, -1]],
  ];
  const positions = [];
  const normals = [];
  const indices = [];
  for (const f of faces) {
    const n = f[4];
    const base = positions.length / 3;
    for (let i = 0; i < 4; i++) {
      positions.push(...f[i]);
      normals.push(...n);
    }
    indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
  }
  return { positions, normals, indices };
}

function cylinder(rTop, rBot, h, seg = 16) {
  const positions = [];
  const normals = [];
  const indices = [];
  const y0 = -h / 2;
  const y1 = h / 2;
  for (let i = 0; i < seg; i++) {
    const a0 = (i / seg) * Math.PI * 2;
    const a1 = ((i + 1) / seg) * Math.PI * 2;
    const c0 = Math.cos(a0); const s0 = Math.sin(a0);
    const c1 = Math.cos(a1); const s1 = Math.sin(a1);
    const base = positions.length / 3;
    positions.push(rBot * c0, y0, rBot * s0, rTop * c0, y1, rTop * s0, rTop * c1, y1, rTop * s1, rBot * c1, y0, rBot * s1);
    normals.push(c0, 0, s0, c0, 0, s0, c1, 0, s1, c1, 0, s1);
    indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
  }
  const top = positions.length / 3;
  positions.push(0, y1, 0);
  normals.push(0, 1, 0);
  for (let i = 0; i < seg; i++) {
    const a = (i / seg) * Math.PI * 2;
    positions.push(rTop * Math.cos(a), y1, rTop * Math.sin(a));
    normals.push(0, 1, 0);
  }
  for (let i = 0; i < seg; i++) indices.push(top, top + 1 + ((i + 1) % seg), top + 1 + i);
  const bot = positions.length / 3;
  positions.push(0, y0, 0);
  normals.push(0, -1, 0);
  for (let i = 0; i < seg; i++) {
    const a = (i / seg) * Math.PI * 2;
    positions.push(rBot * Math.cos(a), y0, rBot * Math.sin(a));
    normals.push(0, -1, 0);
  }
  for (let i = 0; i < seg; i++) indices.push(bot, bot + 1 + i, bot + 1 + ((i + 1) % seg));
  return { positions, normals, indices };
}

function transformed(mesh, matrix) {
  const positions = [];
  const normals = [];
  for (let i = 0; i < mesh.positions.length; i += 3) {
    positions.push(...apply(matrix, mesh.positions[i], mesh.positions[i + 1], mesh.positions[i + 2], false));
    const n = apply(matrix, mesh.normals[i], mesh.normals[i + 1], mesh.normals[i + 2], true);
    const l = Math.hypot(n[0], n[1], n[2]) || 1;
    normals.push(n[0] / l, n[1] / l, n[2] / l);
  }
  return { positions, normals, indices: mesh.indices.slice() };
}

function part(mesh, matrix, color) {
  return { ...transformed(mesh, matrix), color };
}

function mirrorX(partMesh) {
  const positions = partMesh.positions.slice();
  const normals = partMesh.normals.slice();
  for (let i = 0; i < positions.length; i += 3) {
    positions[i] = -positions[i];
    normals[i] = -normals[i];
  }
  const indices = partMesh.indices.slice();
  for (let i = 0; i < indices.length; i += 3) {
    const t = indices[i + 1];
    indices[i + 1] = indices[i + 2];
    indices[i + 2] = t;
  }
  return { positions, normals, indices, color: partMesh.color };
}

function boundsOf(parts) {
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  for (const p of parts) {
    for (let i = 0; i < p.positions.length; i += 3) {
      for (let k = 0; k < 3; k++) {
        min[k] = Math.min(min[k], p.positions[i + k]);
        max[k] = Math.max(max[k], p.positions[i + k]);
      }
    }
  }
  return { min, max, size: min.map((v, i) => max[i] - v) };
}

function centerOf(partMesh) {
  const b = boundsOf([partMesh]);
  return b.min.map((v, i) => (v + b.max[i]) / 2);
}

function packGlb(nodes) {
  const primitives = [];
  for (const node of nodes) {
    for (const prim of node.parts) primitives.push({ ...prim, node: node.name });
  }
  const binParts = [];
  let byteLength = 0;
  const views = [];
  const accessors = [];
  const materials = [];
  const colorIndex = new Map();
  function align(n) {
    const pad = (4 - (byteLength % 4)) % 4;
    if (pad) {
      binParts.push(Buffer.alloc(pad));
      byteLength += pad;
    }
    return n;
  }
  function pushArray(array, componentType) {
    align(4);
    const offset = byteLength;
    const buf = Buffer.from(array.buffer, array.byteOffset, array.byteLength);
    binParts.push(buf);
    byteLength += buf.length;
    const view = views.length;
    views.push({ buffer: 0, byteOffset: offset, byteLength: buf.length, target: componentType === 5123 ? 34963 : 34962 });
    return view;
  }
  const meshPrims = nodes.map(() => []);
  nodes.forEach((node, ni) => {
    for (const prim of node.parts) {
      const pos = new Float32Array(prim.positions);
      const nrm = new Float32Array(prim.normals);
      const idx = new Uint16Array(prim.indices);
      let pmin = [Infinity, Infinity, Infinity];
      let pmax = [-Infinity, -Infinity, -Infinity];
      for (let i = 0; i < pos.length; i += 3) {
        for (let k = 0; k < 3; k++) {
          pmin[k] = Math.min(pmin[k], pos[i + k]);
          pmax[k] = Math.max(pmax[k], pos[i + k]);
        }
      }
      const pv = pushArray(pos, 5126);
      const nv = pushArray(nrm, 5126);
      const iv = pushArray(idx, 5123);
      const pa = accessors.length;
      accessors.push({ bufferView: pv, componentType: 5126, count: pos.length / 3, type: 'VEC3', min: pmin, max: pmax });
      accessors.push({ bufferView: nv, componentType: 5126, count: nrm.length / 3, type: 'VEC3' });
      accessors.push({ bufferView: iv, componentType: 5123, count: idx.length, type: 'SCALAR' });
      const key = prim.color;
      if (!colorIndex.has(key)) {
        const hex = key.replace('#', '');
        const r = parseInt(hex.slice(0, 2), 16) / 255;
        const g = parseInt(hex.slice(2, 4), 16) / 255;
        const b = parseInt(hex.slice(4, 6), 16) / 255;
        colorIndex.set(key, materials.length);
        materials.push({
          name: key,
          pbrMetallicRoughness: { baseColorFactor: [r, g, b, 1], metallicFactor: 0.06, roughnessFactor: 0.74 },
          doubleSided: false,
        });
      }
      meshPrims[ni].push({
        attributes: { POSITION: pa, NORMAL: pa + 1 },
        indices: pa + 2,
        material: colorIndex.get(key),
      });
    }
  });
  const bin = Buffer.concat(binParts);
  const gltf = {
    asset: { version: '2.0', generator: 'foley-stage bake_foley_props' },
    scene: 0,
    scenes: [{ nodes: nodes.map((_, i) => i) }],
    nodes: nodes.map((n, i) => ({ name: n.name, mesh: i })),
    meshes: meshPrims.map((prims, i) => ({ name: nodes[i].name, primitives: prims })),
    materials,
    accessors,
    bufferViews: views,
    buffers: [{ byteLength: bin.length }],
  };
  let json = JSON.stringify(gltf);
  while (json.length % 4 !== 0) json += ' ';
  const jsonBuf = Buffer.from(json);
  const total = 12 + 8 + jsonBuf.length + 8 + bin.length;
  const header = Buffer.alloc(12);
  header.write('glTF', 0);
  header.writeUInt32LE(2, 4);
  header.writeUInt32LE(total, 8);
  const jh = Buffer.alloc(8);
  jh.writeUInt32LE(jsonBuf.length, 0);
  jh.write('JSON', 4);
  const bh = Buffer.alloc(8);
  bh.writeUInt32LE(bin.length, 0);
  bh.write('BIN\0', 4);
  return Buffer.concat([header, jh, jsonBuf, bh, bin]);
}

function shotgun() {
  const alongZ = matRx(Math.PI / 2);
  const metal = '#4a545c';
  const grille = '#6d7a84';
  const band = '#c2a36a';
  const mount = '#8d97a0';
  const parts = [
    part(cylinder(0.015, 0.015, 0.22, 14), alongZ, metal),
    part(cylinder(0.017, 0.016, 0.05, 14), matMul(matT(0, 0, 0.125), alongZ), grille),
    part(cylinder(0.0162, 0.0162, 0.008, 14), matMul(matT(0, 0, 0.035), alongZ), band),
    part(cylinder(0.016, 0.011, 0.02, 12), matMul(matT(0, 0, -0.118), alongZ), '#3e474e'),
    part(cylinder(0.028, 0.028, 0.012, 16), matMul(matT(0, 0, -0.02), alongZ), mount),
    part(box(0.008, 0.058, 0.01), matT(0, 0, -0.02), mount),
  ];
  return [{ name: 'shotgun_mic', parts }];
}

function shoe() {
  const leather = '#6e4b38';
  const sole = box(0.1, 0.02, 0.29);
  const heel = box(0.092, 0.078, 0.1);
  const quarter = box(0.086, 0.046, 0.1);
  const toe = box(0.078, 0.032, 0.09);
  const parts = [
    part(sole, matT(0, 0.01, 0), leather),
    part(heel, matT(0, 0.02 + 0.039, -0.08), leather),
    part(quarter, matT(0, 0.02 + 0.023, 0.01), leather),
    part(toe, matT(0, 0.02 + 0.016, 0.095), leather),
  ];
  return [{ name: 'foley_shoe', parts }];
}

function basin() {
  const galv = '#8e9aa0';
  const rim = '#6d7b82';
  const innerW = 1.08;
  const innerD = 0.5;
  const t = 0.04;
  const h = 0.26;
  const parts = [
    part(box(innerW, 0.028, innerD), matT(0, 0.014, 0), galv),
    part(box(t, h, innerD + t * 2), matT(-(innerW / 2 + t / 2), h / 2, 0), galv),
    part(box(t, h, innerD + t * 2), matT(innerW / 2 + t / 2, h / 2, 0), galv),
    part(box(innerW, h, t), matT(0, h / 2, -(innerD / 2 + t / 2)), galv),
    part(box(innerW, h, t), matT(0, h / 2, innerD / 2 + t / 2), galv),
    part(box(innerW + t * 2, 0.02, innerD + t * 2), matT(0, h + 0.004, 0), rim),
  ];
  return [{ name: 'water_basin', parts }];
}

function stageDoor() {
  const frame = '#8d6844';
  const slabC = '#c4925a';
  const panel = '#6b4424';
  const metal = '#d5dde2';
  const caster = '#5e686e';
  const open = 0.46;
  const hingeX = -0.42;
  const parts = [];
  parts.push(part(box(0.09, 2.06, 0.14), matT(-0.5, 1.07, 0), frame));
  parts.push(part(box(0.09, 2.06, 0.14), matT(0.5, 1.07, 0), frame));
  parts.push(part(box(1.09, 0.08, 0.14), matT(0, 2.1, 0), frame));
  parts.push(part(box(0.86, 0.04, 0.12), matT(0, 0.08, 0), frame));
  for (const x of [-0.5, 0.5]) {
    for (const z of [-0.035, 0.035]) {
      parts.push(part(cylinder(0.032, 0.032, 0.036, 10), matT(x, 0.018, z), caster));
    }
  }
  const hinge = matMul(matT(hingeX, 0, 0), matMul(matRy(open), matT(-hingeX, 0, 0)));
  parts.push(part(box(0.82, 1.92, 0.042), matMul(hinge, matT(-0.01, 1.08, 0.02)), slabC));
  parts.push(part(box(0.62, 0.72, 0.012), matMul(hinge, matT(-0.01, 0.72, 0.046)), panel));
  parts.push(part(box(0.62, 0.62, 0.012), matMul(hinge, matT(-0.01, 1.55, 0.046)), panel));
  for (const y of [0.35, 1.05, 1.75]) {
    parts.push(part(cylinder(0.012, 0.012, 0.07, 8), matMul(hinge, matT(hingeX, y, 0.02)), metal));
  }
  const latchParts = [
    part(box(0.14, 0.04, 0.028), matMul(hinge, matT(0.3, 1.05, 0.055)), metal),
    part(cylinder(0.014, 0.014, 0.12, 8), matMul(hinge, matMul(matT(0.36, 1.05, 0.1), matRx(Math.PI / 2))), metal),
  ];
  const frameNodes = [{ name: 'stage_door', parts }];
  const latchNode = { name: 'latch', parts: latchParts };
  return [frameNodes[0], latchNode];
}

function summarize(nodes) {
  const all = nodes.flatMap((n) => n.parts);
  const b = boundsOf(all);
  const latch = nodes.find((n) => n.name === 'latch');
  return {
    min: b.min.map((v) => +v.toFixed(4)),
    max: b.max.map((v) => +v.toFixed(4)),
    size: b.size.map((v) => +v.toFixed(4)),
    latch: latch ? centerOf({ positions: latch.parts.flatMap((p) => p.positions) }).map((v) => +v.toFixed(4)) : null,
  };
}

const builds = {
  shotgun_mic: shotgun(),
  foley_shoe: shoe(),
  foley_shoe_r: shoe().map((n) => ({ name: 'foley_shoe_r', parts: n.parts.map(mirrorX) })),
  water_basin: basin(),
  stage_door: stageDoor(),
};

const manifest = {};
for (const [name, nodes] of Object.entries(builds)) {
  const buf = packGlb(nodes);
  writeFileSync(join(outDir, `${name}.glb`), buf);
  manifest[name] = { ...summarize(nodes), bytes: buf.length };
  console.log(name, manifest[name]);
}
writeFileSync(join(outDir, 'manifest.json'), JSON.stringify(manifest, null, 2));
