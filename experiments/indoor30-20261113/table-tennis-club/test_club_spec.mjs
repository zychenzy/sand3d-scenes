import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  TABLE, NET, BALL, BAY, TABLE_X,
  endClearance, sideClearance, lineRects, netPosts,
  scorerBenches, baskets, paddles, dutyChair, barrierSegments,
  benchMetrics, layoutReport, glbInstances, tableBox,
} from './table_spec.mjs';

const dir = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(dir, '../../..');
const layout = JSON.parse(fs.readFileSync(path.join(dir, 'layout.json'), 'utf8'));

test('ITTF table, net, and ball', () => {
  assert.equal(TABLE.length, 2.74);
  assert.equal(TABLE.width, 1.525);
  assert.equal(TABLE.height, 0.76);
  assert.equal(TABLE.line, 0.02);
  assert.equal(TABLE.centerLine, 0.003);
  assert.equal(NET.height, 0.1525);
  assert.equal(NET.overhang, 0.1525);
  assert.equal(BALL.diameter, 0.04);
  assert.equal(TABLE_X.length, 3);
});

test('lines stay on the top and use 2 cm edges plus a 3 mm centre line', () => {
  for (const cx of TABLE_X) {
    const box = tableBox(cx);
    for (const r of lineRects(cx)) {
      assert.ok(r.x0 >= box.x0 - 1e-9 && r.x1 <= box.x1 + 1e-9, r.id);
      assert.ok(r.z0 >= box.z0 - 1e-9 && r.z1 <= box.z1 + 1e-9, r.id);
      const w = r.x1 - r.x0;
      const d = r.z1 - r.z0;
      if (r.id.startsWith('center')) assert.ok(Math.abs(w - 0.003) < 1e-9);
      if (r.id.startsWith('side')) assert.ok(Math.abs(w - 0.02) < 1e-9);
      if (r.id.startsWith('end')) assert.ok(Math.abs(d - 0.02) < 1e-9);
      assert.ok(w > 0 && d > 0);
    }
  }
});

test('net posts stand 15.25 cm outside the side line and 15.25 cm above the top', () => {
  for (const cx of TABLE_X) {
    const net = netPosts(cx);
    assert.ok(Math.abs(net.topY - (TABLE.height + 0.1525)) < 1e-9);
    assert.ok(Math.abs(net.outerX[0] - (cx - TABLE.width / 2 - 0.1525)) < 1e-9);
    assert.ok(Math.abs(net.outerX[1] - (cx + TABLE.width / 2 + 0.1525)) < 1e-9);
    assert.ok(net.outerX[1] - net.outerX[0] > TABLE.width);
  }
});

test('club bays give end and side clearance and legal surrounds', () => {
  assert.equal(BAY.length, 10);
  assert.equal(BAY.width, 5);
  assert.ok(Math.abs(endClearance() - 3.63) < 1e-9);
  assert.ok(Math.abs(sideClearance() - 1.7375) < 1e-9);
  assert.ok(endClearance() > 3.5);
  assert.ok(sideClearance() > 1.7);
  assert.ok(BAY.barrierH >= 0.5 && BAY.barrierH <= 1);
  assert.ok(BAY.clearH >= 5);
  assert.deepEqual(layoutReport(), []);
});

test('scorer benches face their own table from the side of the net', () => {
  const benches = scorerBenches();
  assert.equal(benches.length, 3);
  const { depth, length } = benchMetrics();
  for (const b of benches) {
    assert.equal(b.rotationY, 0);
    assert.ok(b.x > b.tableX + TABLE.width / 2);
    assert.ok(Math.abs(b.z) < 0.2);
    const gap = (b.x - depth / 2) - (b.tableX + TABLE.width / 2);
    assert.ok(gap > 1.0, 'side run in front of the bench');
    assert.ok(length < TABLE.length);
    const toX = b.tableX - b.x;
    assert.ok(toX < 0);
    assert.ok(b.gaze[0] < 0 && Math.abs(b.gaze[1]) < 0.2);
  }
});

test('baskets and paddles stay in the gallery off the courts', () => {
  assert.equal(baskets().length, 3);
  const east = TABLE_X[2] + BAY.width / 2;
  for (const basket of baskets()) {
    assert.ok(basket.x - basket.radius > east, basket.id);
    assert.ok(basket.radius < 0.35);
  }
  const blades = paddles();
  assert.ok(blades.length >= 6);
  for (const p of blades) {
    assert.ok(p.x > 7.5 + 0.4, p.id);
    assert.ok(p.y > 1 && p.y < 1.8);
    assert.ok(p.kind === 'paddle_red' || p.kind === 'paddle_wood');
  }
  const chair = dutyChair();
  assert.ok(chair.gaze[1] < 0);
  assert.ok(chair.z < -3);
});

test('barriers enclose three bays and leave a gate on each south end', () => {
  const segs = barrierSegments();
  assert.ok(segs.some((s) => s.id === 'north'));
  assert.ok(segs.some((s) => s.id === 'west'));
  for (const cx of TABLE_X) {
    assert.ok(segs.some((s) => s.id === `south-${cx}-a`));
    assert.ok(segs.some((s) => s.id === `south-${cx}-b`));
    const a = segs.find((s) => s.id === `south-${cx}-a`);
    const b = segs.find((s) => s.id === `south-${cx}-b`);
    const gap = b.x0 - a.x1;
    assert.ok(Math.abs(gap - BAY.gate) < 1e-9);
  }
});

test('shared assets are referenced, not copied, and new bakes exist', () => {
  const html = fs.readFileSync(path.join(dir, 'index.html'), 'utf8');
  assert.match(html, /gym\/vendor\/three\.module\.js/);
  assert.equal(html.includes('https://'), false);
  assert.equal(fs.existsSync(path.join(dir, 'vendor')), false);
  for (const spec of Object.values(layout.assets)) {
    const file = path.resolve(dir, spec.glb);
    assert.equal(fs.existsSync(file), true, spec.glb);
    assert.ok(spec.targetHeight > 0);
  }
  const instances = glbInstances();
  assert.equal(instances.filter((i) => i.kind === 'ittf_table').length, 3);
  assert.equal(instances.filter((i) => i.kind === 'museum_bench').length, 3);
  const bench = path.resolve(dir, layout.assets.museum_bench.glb);
  assert.ok(bench.startsWith(path.join(repo, 'museum')));
  assert.ok(!bench.includes(`${path.sep}table-tennis-club${path.sep}assets${path.sep}museum`));
});

test('toon ramp is hard-stepped and unlit is basic material', () => {
  const src = fs.readFileSync(path.join(dir, 'scene_lib.js'), 'utf8');
  assert.match(src, /NearestFilter/);
  assert.match(src, /MeshToonMaterial/);
  assert.match(src, /MeshBasicMaterial/);
  assert.match(src, /PCFHardShadowMap/);
  assert.match(src, /stops = \[112, 168, 214, 255\]/);
  assert.equal(src.includes('MeshLambertMaterial'), false);
  assert.equal(src.includes('cdn'), false);
});

test('baked table proportions are 1.525 by 2.74 by 0.76', () => {
  const buf = fs.readFileSync(path.join(dir, 'assets/ittf_table.glb'));
  const jsonLen = buf.readUInt32LE(12);
  const json = JSON.parse(buf.subarray(20, 20 + jsonLen).toString('utf8'));
  let min = [Infinity, Infinity, Infinity];
  let max = [-Infinity, -Infinity, -Infinity];
  const nodes = json.nodes;
  function mul(a, b) {
    const c = new Array(16).fill(0);
    for (let col = 0; col < 4; col += 1) {
      for (let row = 0; row < 4; row += 1) {
        let s = 0;
        for (let k = 0; k < 4; k += 1) s += a[k * 4 + row] * b[col * 4 + k];
        c[col * 4 + row] = s;
      }
    }
    return c;
  }
  function trs(t = [0, 0, 0], r = [0, 0, 0, 1], s = [1, 1, 1]) {
    const [tx, ty, tz] = t;
    const [x, y, z, w] = r;
    const [sx, sy, sz] = s;
    const n = x * x + y * y + z * z + w * w || 1;
    const s2 = 2 / n;
    const xx = x * x * s2; const yy = y * y * s2; const zz = z * z * s2;
    const xy = x * y * s2; const xz = x * z * s2; const yz = y * z * s2;
    const wx = w * x * s2; const wy = w * y * s2; const wz = w * z * s2;
    return [
      (1 - (yy + zz)) * sx, (xy + wz) * sx, (xz - wy) * sx, 0,
      (xy - wz) * sy, (1 - (xx + zz)) * sy, (yz + wx) * sy, 0,
      (xz + wy) * sz, (yz - wx) * sz, (1 - (xx + yy)) * sz, 0,
      tx, ty, tz, 1,
    ];
  }
  function walk(i, parent) {
    const n = nodes[i];
    const world = mul(parent, trs(n.translation, n.rotation, n.scale));
    if (n.mesh != null) {
      for (const prim of json.meshes[n.mesh].primitives) {
        const a = json.accessors[prim.attributes.POSITION];
        const [x0, y0, z0] = a.min;
        const [x1, y1, z1] = a.max;
        for (const x of [x0, x1]) {
          for (const y of [y0, y1]) {
            for (const z of [z0, z1]) {
              const px = world[0] * x + world[4] * y + world[8] * z + world[12];
              const py = world[1] * x + world[5] * y + world[9] * z + world[13];
              const pz = world[2] * x + world[6] * y + world[10] * z + world[14];
              min = [Math.min(min[0], px), Math.min(min[1], py), Math.min(min[2], pz)];
              max = [Math.max(max[0], px), Math.max(max[1], py), Math.max(max[2], pz)];
            }
          }
        }
      }
    }
    for (const c of n.children || []) walk(c, world);
  }
  const ident = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
  for (const r of json.scenes[0].nodes) walk(r, ident);
  const size = [max[0] - min[0], max[1] - min[1], max[2] - min[2]];
  assert.ok(Math.abs(size[0] - 1.525) < 0.002, 'width ' + size[0]);
  assert.ok(Math.abs(size[1] - 0.76) < 0.002, 'height ' + size[1]);
  assert.ok(Math.abs(size[2] - 2.74) < 0.002, 'length ' + size[2]);
});
