import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { collectIssues } from '../bay_spec.mjs';

const dir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const layout = JSON.parse(fs.readFileSync(path.join(dir, 'layout.json'), 'utf8'));

function loadGlb(file) {
  const data = fs.readFileSync(file);
  let off = 12;
  const chunks = [];
  while (off < data.length) {
    const clen = data.readUInt32LE(off);
    const ctype = data.readUInt32LE(off + 4);
    off += 8;
    chunks.push([ctype, data.subarray(off, off + clen)]);
    off += clen;
  }
  return { json: JSON.parse(chunks[0][1].toString('utf8')), blob: chunks[1][1] };
}

function qrot(q, v) {
  const [x, y, z, w] = q;
  const tx = 2 * (y * v[2] - z * v[1]);
  const ty = 2 * (z * v[0] - x * v[2]);
  const tz = 2 * (x * v[1] - y * v[0]);
  return [
    v[0] + w * tx + (y * tz - z * ty),
    v[1] + w * ty + (z * tx - x * tz),
    v[2] + w * tz + (x * ty - y * tx),
  ];
}

function meshCentroids(glb) {
  const { json, blob } = glb;
  const nodes = json.nodes;
  const parent = nodes.map(() => null);
  nodes.forEach((node, index) => {
    for (const child of node.children || []) parent[child] = index;
  });
  function chain(index) {
    const out = [];
    while (index != null) {
      out.push(index);
      index = parent[index];
    }
    return out;
  }
  function apply(indices, p) {
    for (const index of indices) {
      const node = nodes[index];
      const t = node.translation || [0, 0, 0];
      const r = node.rotation || [0, 0, 0, 1];
      const s = node.scale || [1, 1, 1];
      p = [p[0] * s[0], p[1] * s[1], p[2] * s[2]];
      p = qrot(r, p);
      p = [p[0] + t[0], p[1] + t[1], p[2] + t[2]];
    }
    return p;
  }
  const centroids = {};
  const bounds = [];
  nodes.forEach((node, index) => {
    if (node.mesh == null) return;
    const acc = [];
    for (const prim of json.meshes[node.mesh].primitives) {
      const accessor = json.accessors[prim.attributes.POSITION];
      const view = json.bufferViews[accessor.bufferView];
      const start = (view.byteOffset || 0) + (accessor.byteOffset || 0);
      const stride = view.byteStride || 12;
      for (let i = 0; i < accessor.count; i++) {
        acc.push([
          blob.readFloatLE(start + i * stride),
          blob.readFloatLE(start + i * stride + 4),
          blob.readFloatLE(start + i * stride + 8),
        ]);
      }
    }
    const pts = acc.map((p) => apply(chain(index), p));
    centroids[node.name] = [
      pts.reduce((s, p) => s + p[0], 0) / pts.length,
      pts.reduce((s, p) => s + p[1], 0) / pts.length,
      pts.reduce((s, p) => s + p[2], 0) / pts.length,
    ];
    bounds.push(...pts);
  });
  const mins = [0, 1, 2].map((axis) => Math.min(...bounds.map((p) => p[axis])));
  const maxs = [0, 1, 2].map((axis) => Math.max(...bounds.map((p) => p[axis])));
  return { centroids, mins, maxs };
}

test('two bays, seats, racks, monitors, and paths stay out of the swings', () => {
  const issues = collectIssues(layout, layout.meta.chairFootprint);
  assert.deepEqual(issues, [], issues.join('\n'));
});

test('chair footprint matches the theatre-chair bake', () => {
  const file = path.resolve(dir, layout.assets.theatre_chair.glb);
  const { centroids, mins, maxs } = meshCentroids(loadGlb(file));
  assert.ok(centroids.cushion, 'cushion mesh');
  assert.ok(centroids.back_surface, 'back_surface mesh');
  assert.ok(centroids.cushion[2] < centroids.back_surface[2], 'cushion is -Z of the backrest');
  const scale = layout.assets.theatre_chair.targetHeight / (maxs[1] - mins[1]);
  const hx = ((maxs[0] - mins[0]) * scale) / 2;
  const hz = ((maxs[2] - mins[2]) * scale) / 2;
  assert.ok(Math.abs(hx - layout.meta.chairFootprint.hx) < 0.01, `hx ${hx}`);
  assert.ok(Math.abs(hz - layout.meta.chairFootprint.hz) < 0.01, `hz ${hz}`);
});

test('shared GLBs stay outside this folder and baked clubs stay inside it', () => {
  assert.equal(fs.existsSync(path.join(dir, 'vendor')), false);
  const baked = new Set(['golf_driver', 'golf_iron', 'golf_wedge', 'golf_tee']);
  for (const [kind, spec] of Object.entries(layout.assets)) {
    const abs = path.resolve(dir, spec.glb);
    assert.equal(fs.existsSync(abs), true, spec.glb);
    const rel = path.relative(dir, abs);
    if (baked.has(kind)) {
      assert.equal(rel.startsWith('..'), false, spec.glb);
      assert.ok(fs.statSync(abs).size < 500_000, spec.glb);
    } else {
      assert.equal(rel.startsWith('..'), true, spec.glb);
      assert.equal(spec.glb.includes('indoor30-20261113'), false);
    }
  }
});

test('screens face the seats and the ball sits in a real bay depth', () => {
  for (const bay of layout.meta.bays) {
    const depth = bay.ball[1] - layout.meta.screenZ;
    assert.ok(depth > 3 && depth < 4.2, depth);
    assert.ok(bay.screenW >= 4 && bay.screenH >= 2.4);
    assert.equal(bay.player[0] !== bay.ball[0], true);
  }
  const chairs = layout.instances.filter((item) => item.kind === 'theatre_chair');
  for (const chair of chairs) {
    assert.ok(chair.position[2] > layout.meta.screenZ);
    assert.equal(chair.rotationY, 0);
  }
});
