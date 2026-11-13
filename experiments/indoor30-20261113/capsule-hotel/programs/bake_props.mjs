/**
 * Bake the three props the shared kit does not have:
 * a ceiling reading puck, a soft pillow, and one luggage locker.
 * Geometry is metres. No image textures. Run from the repo root:
 *   node experiments/indoor30-20261113/capsule-hotel/programs/bake_props.mjs
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as THREE from '../../../../cafe/vendor/three.module.js';

const outDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'assets');

function part(name, geometry, color, emissive = [0, 0, 0]) {
  geometry.computeVertexNormals();
  const pos = geometry.attributes.position.array;
  const nor = geometry.attributes.normal.array;
  const idx = geometry.index.array;
  return {
    name,
    position: new Float32Array(pos),
    normal: new Float32Array(nor),
    index: idx instanceof Uint32Array ? Uint32Array.from(idx) : new Uint16Array(idx),
    color,
    emissive,
    indexType: idx instanceof Uint32Array ? 5125 : 5123,
  };
}

function box(name, w, h, d, x, y, z, color, emissive) {
  const geo = new THREE.BoxGeometry(w, h, d);
  geo.translate(x, y, z);
  return part(name, geo, color, emissive);
}

function cyl(name, r, h, x, y, z, color, emissive, rotX = 0) {
  const geo = new THREE.CylinderGeometry(r, r, h, 16);
  if (rotX) geo.rotateX(rotX);
  geo.translate(x, y, z);
  return part(name, geo, color, emissive);
}

function sphere(name, sx, sy, sz, x, y, z, color, emissive) {
  const geo = new THREE.SphereGeometry(1, 28, 18);
  geo.scale(sx, sy, sz);
  geo.translate(x, y, z);
  return part(name, geo, color, emissive);
}

function readingLamp() {
  const brass = [0.77, 0.6, 0.34];
  const shade = [0.98, 0.95, 0.88];
  const bulb = [1, 0.64, 0.28];
  return [
    box('plate', 0.05, 0.07, 0.012, 0, 0.045, 0.006, brass),
    cyl('arm', 0.007, 0.055, 0, 0.05, 0.04, brass, [0, 0, 0], Math.PI / 2),
    sphere('shade', 0.04, 0.028, 0.04, 0, 0.055, 0.07, shade),
    sphere('bulb', 0.016, 0.014, 0.016, 0, 0.048, 0.055, bulb, bulb),
  ];
}

function pillow() {
  const cloth = [0.97, 0.96, 0.93];
  const geo = new THREE.SphereGeometry(1, 32, 20);
  geo.scale(0.16, 0.075, 0.23);
  geo.translate(0, 0.075, 0);
  return [part('pillow', geo, cloth)];
}

function locker() {
  const body = [0.62, 0.64, 0.62];
  const door = [0.94, 0.91, 0.86];
  const metal = [0.72, 0.58, 0.34];
  const w = 0.4;
  const h = 0.46;
  const d = 0.46;
  const t = 0.016;
  return [
    box('back', t, h, w, d / 2 - t / 2, h / 2, 0, body),
    box('top', d, t, w, 0, h - t / 2, 0, body),
    box('bottom', d, t, w, 0, t / 2, 0, body),
    box('left', d, h, t, 0, h / 2, w / 2 - t / 2, body),
    box('right', d, h, t, 0, h / 2, -w / 2 + t / 2, body),
    box('door', 0.012, h - 0.04, w - 0.04, -d / 2 + 0.014, h / 2 + 0.004, 0, door),
    cyl('pull', 0.007, 0.08, -d / 2 + 0.02, h / 2, w * 0.22, metal, [0, 0, 0], Math.PI / 2),
  ];
}

function pad4(bytes) {
  const pad = (4 - (bytes.length % 4)) % 4;
  if (!pad) return bytes;
  const out = new Uint8Array(bytes.length + pad);
  out.set(bytes);
  return out;
}

function encodeGLB(parts) {
  const bufferViews = [];
  const accessors = [];
  const materials = [];
  const meshes = [];
  const nodes = [];
  const bin = [];
  let offset = 0;

  function push(array, target) {
    const bytes = pad4(new Uint8Array(array.buffer, array.byteOffset, array.byteLength));
    const viewIndex = bufferViews.length;
    bufferViews.push({ buffer: 0, byteOffset: offset, byteLength: array.byteLength, target });
    bin.push(bytes);
    offset += bytes.length;
    return viewIndex;
  }

  parts.forEach((mesh, index) => {
    const pos = mesh.position;
    let min = [Infinity, Infinity, Infinity];
    let max = [-Infinity, -Infinity, -Infinity];
    for (let i = 0; i < pos.length; i += 3) {
      for (let k = 0; k < 3; k++) {
        min[k] = Math.min(min[k], pos[i + k]);
        max[k] = Math.max(max[k], pos[i + k]);
      }
    }
    const posView = push(pos, 34962);
    const norView = push(mesh.normal, 34962);
    const idxView = push(mesh.index, 34963);
    const posAcc = accessors.length;
    accessors.push({ bufferView: posView, componentType: 5126, count: pos.length / 3, type: 'VEC3', min, max });
    accessors.push({ bufferView: norView, componentType: 5126, count: mesh.normal.length / 3, type: 'VEC3' });
    accessors.push({ bufferView: idxView, componentType: mesh.indexType, count: mesh.index.length, type: 'SCALAR' });
    const matIndex = materials.length;
    materials.push({
      name: mesh.name,
      pbrMetallicRoughness: {
        baseColorFactor: [...mesh.color, 1],
        metallicFactor: 0.04,
        roughnessFactor: 0.86,
      },
      emissiveFactor: mesh.emissive,
    });
    meshes.push({
      name: mesh.name,
      primitives: [{
        attributes: { POSITION: posAcc, NORMAL: posAcc + 1 },
        indices: posAcc + 2,
        material: matIndex,
      }],
    });
    nodes.push({ name: mesh.name, mesh: index });
  });

  const json = {
    asset: { version: '2.0', generator: 'capsule-hotel-bake' },
    scene: 0,
    scenes: [{ nodes: nodes.map((_, i) => i) }],
    nodes,
    meshes,
    materials,
    accessors,
    bufferViews,
    buffers: [{ byteLength: offset }],
  };
  const jsonText = JSON.stringify(json);
  const raw = new TextEncoder().encode(jsonText);
  const jsonBytes = new Uint8Array((raw.length + 3) & ~3);
  jsonBytes.set(raw);
  jsonBytes.fill(0x20, raw.length);
  const binBytes = new Uint8Array(offset);
  let cursor = 0;
  for (const chunk of bin) {
    binBytes.set(chunk, cursor);
    cursor += chunk.length;
  }
  const total = 12 + 8 + jsonBytes.length + 8 + binBytes.length;
  const out = new Uint8Array(total);
  const view = new DataView(out.buffer);
  view.setUint32(0, 0x46546c67, true);
  view.setUint32(4, 2, true);
  view.setUint32(8, total, true);
  view.setUint32(12, jsonBytes.length, true);
  view.setUint32(16, 0x4e4f534a, true);
  out.set(jsonBytes, 20);
  const binStart = 20 + jsonBytes.length;
  view.setUint32(binStart, binBytes.length, true);
  view.setUint32(binStart + 4, 0x004e4942, true);
  out.set(binBytes, binStart + 8);
  return out;
}

mkdirSync(outDir, { recursive: true });
const files = {
  'reading_lamp.glb': readingLamp(),
  'pillow.glb': pillow(),
  'luggage_locker.glb': locker(),
};
for (const [name, parts] of Object.entries(files)) {
  const glb = encodeGLB(parts);
  const file = join(outDir, name);
  writeFileSync(file, glb);
  console.log(name, glb.length);
}
