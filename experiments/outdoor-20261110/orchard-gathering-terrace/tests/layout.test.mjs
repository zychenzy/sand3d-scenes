import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const layout = JSON.parse(readFileSync(join(root, 'layout.json'), 'utf8'));

function terraceAt(z) {
  return layout.terraces.filter((t) => z >= t.z0 - 1e-6 && z <= t.z1 + 1e-6);
}

function hillY(z) {
  const h = layout.hill;
  const t = (h.z0 - z) / (h.z0 - h.z1);
  return h.y0 + t * (h.y1 - h.y0);
}

function distPointSeg(px, pz, a, b) {
  const abx = b[0] - a[0];
  const abz = b[2] - a[2];
  const len2 = abx * abx + abz * abz || 1e-8;
  let t = ((px - a[0]) * abx + (pz - a[2]) * abz) / len2;
  t = Math.max(0, Math.min(1, t));
  const x = a[0] + abx * t;
  const z = a[2] + abz * t;
  return Math.hypot(px - x, pz - z);
}

function pathSamples() {
  const out = [];
  for (const path of layout.paths) {
    const pts = path.points;
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i];
      const b = pts[i + 1];
      const len = Math.hypot(b[0] - a[0], b[2] - a[2]);
      const n = Math.max(1, Math.ceil(len / 0.35));
      for (let k = 0; k <= n; k++) {
        const t = k / n;
        out.push([
          a[0] + (b[0] - a[0]) * t,
          a[1] + (b[1] - a[1]) * t,
          a[2] + (b[2] - a[2]) * t,
          path.width,
        ]);
      }
    }
  }
  return out;
}

function rectDist(px, pz, minx, maxx, minz, maxz) {
  const x = Math.max(minx, Math.min(maxx, px));
  const z = Math.max(minz, Math.min(maxz, pz));
  return Math.hypot(px - x, pz - z);
}

test('layout files and vendored assets resolve', () => {
  for (const file of ['index.html', 'orchard.js', 'scene_lib.js', 'layout.json']) {
    assert.ok(existsSync(join(root, file)), file);
  }
  for (const spec of Object.values(layout.assets)) {
    const path = join(root, spec.glb);
    assert.ok(existsSync(path), spec.glb);
    assert.ok(statSync(path).size > 500, spec.glb + ' empty');
  }
  assert.ok(existsSync(join(root, 'vendor/three.module.js')));
  assert.ok(existsSync(join(root, 'vendor/controls/OrbitControls.js')));
  assert.ok(existsSync(join(root, 'vendor/loaders/GLTFLoader.js')));
});

test('cameras frame the gathering and differ', () => {
  const cams = {
    default: layout.camera,
    corner: layout.cameraPresets.corner,
    close: layout.cameraPresets.close,
  };
  const table = layout.table;
  for (const [name, cam] of Object.entries(cams)) {
    const dx = cam.position[0] - cam.target[0];
    const dy = cam.position[1] - cam.target[1];
    const dz = cam.position[2] - cam.target[2];
    const dist = Math.hypot(dx, dy, dz);
    const toTable = Math.hypot(cam.target[0] - table.x, cam.target[2] - table.z);
    assert.ok(toTable < 8, name + ' target misses the table');
    assert.ok(cam.position[1] > cam.target[1], name + ' camera is below its target');
    if (name === 'default') assert.ok(dist > 16, 'default is not a wide view');
    if (name === 'close') assert.ok(dist < 5, 'close is not close');
    if (name === 'corner') assert.ok(dist > 6 && dist < 18, 'corner distance');
  }
  assert.notDeepEqual(layout.camera.position, layout.cameraPresets.corner.position);
  assert.notDeepEqual(layout.cameraPresets.corner.position, layout.cameraPresets.close.position);
});

test('chairs face the table and sit on the terrace', () => {
  const T = layout.table;
  const mid = terraceById('mid');
  const top = mid.y + T.top;
  const chairs = layout.instances.filter((i) => i.kind === 'dining_chair');
  assert.ok(chairs.length >= 5);
  for (const inst of chairs) {
    assert.equal(inst.position[1], mid.y, inst.id + ' foot height');
    const fx = Math.sin(inst.rotationY);
    const fz = Math.cos(inst.rotationY);
    const hx = T.length / 2;
    const hz = T.width / 2;
    const cx = Math.min(T.x + hx, Math.max(T.x - hx, inst.position[0]));
    const cz = Math.min(T.z + hz, Math.max(T.z - hz, inst.position[2]));
    const dx = cx - inst.position[0];
    const dz = cz - inst.position[2];
    const len = Math.hypot(dx, dz);
    assert.ok(len > 0.25, inst.id + ' is inside the table');
    const dot = (fx * dx + fz * dz) / len;
    assert.ok(dot > 0.8, inst.id + ' faces away from the table, dot ' + dot.toFixed(2));
  }
  const bench = layout.benches[0];
  assert.equal(bench.facesTable, true);
  assert.ok(bench.z < T.z - T.width / 2, 'far bench is not on the uphill side of the table');
  const gap = (T.z - T.width / 2) - (bench.z + bench.width / 2);
  assert.ok(gap > 0.2 && gap < 0.55, 'bench-to-table gap ' + gap.toFixed(2));
  for (const inst of layout.instances) {
    if (!['cup_mug', 'jam_jar', 'tray_napkin', 'thermos'].includes(inst.kind)) continue;
    assert.ok(Math.abs(inst.position[1] - top) < 0.02, inst.id + ' not on the tabletop');
    assert.ok(Math.abs(inst.position[0] - T.x) < T.length / 2 - 0.05, inst.id + ' off the table in x');
    assert.ok(Math.abs(inst.position[2] - T.z) < T.width / 2 - 0.05, inst.id + ' off the table in z');
  }
});

function terraceById(id) {
  return layout.terraces.find((t) => t.id === id);
}

test('trees are mixed, planted, and not a clone grid', () => {
  const trees = layout.trees;
  const seeds = new Set(trees.map((t) => t.seed));
  assert.equal(seeds.size, trees.length);
  const species = new Set(trees.map((t) => t.species));
  assert.deepEqual(species, new Set(['apple', 'pear', 'plum']));
  for (const sp of ['apple', 'pear', 'plum']) {
    assert.ok(trees.filter((t) => t.species === sp).length >= 4, sp);
  }
  for (let i = 0; i < trees.length; i++) {
    for (let j = i + 1; j < trees.length; j++) {
      const d = Math.hypot(trees[i].x - trees[j].x, trees[i].z - trees[j].z);
      assert.ok(d > 1.7, trees[i].id + ' overlaps ' + trees[j].id + ' (' + d.toFixed(2) + 'm)');
    }
  }
  const planted = trees.filter((t) => !t.hill);
  for (const t of planted) {
    const hosts = layout.terraces.filter((ter) => t.x >= ter.x0 && t.x <= ter.x1 && t.z >= ter.z0 && t.z <= ter.z1);
    assert.ok(hosts.length === 1, t.id + ' is not on exactly one terrace');
    assert.equal(t.y, hosts[0].y, t.id + ' base does not match terrace height');
  }
  for (const t of trees.filter((tr) => tr.hill)) {
    assert.ok(Math.abs(t.y - hillY(t.z)) < 0.05, t.id + ' is off the hill surface');
  }
  const scales = trees.map((t) => t.scale);
  const mean = scales.reduce((s, v) => s + v, 0) / scales.length;
  const variance = scales.reduce((s, v) => s + (v - mean) ** 2, 0) / scales.length;
  assert.ok(Math.sqrt(variance) > 0.12, 'tree scales are too uniform');
  const zs = trees.map((t) => t.z).sort((a, b) => a - b);
  let run = 1;
  let worst = 1;
  for (let i = 1; i < zs.length; i++) {
    run = Math.abs(zs[i] - zs[i - 1]) < 0.3 ? run + 1 : 1;
    worst = Math.max(worst, run);
  }
  assert.ok(worst < 4, 'too many trees share a row');
});

test('path climbs the terraces and stays clear', () => {
  const samples = pathSamples();
  assert.ok(samples[0][2] > samples[samples.length - 1][2], 'path does not run uphill');
  for (const s of samples) {
    const hosts = terraceAt(s[2]).filter((t) => Math.abs(t.y - s[1]) < 0.001);
    assert.ok(hosts.length >= 1, 'path point off its terrace ' + s.join(','));
  }
  const shed = layout.shed;
  const sx0 = shed.x - shed.w / 2;
  const sx1 = shed.x + shed.w / 2;
  const sz0 = shed.z - shed.d / 2;
  const sz1 = shed.z + shed.d / 2;
  const table = layout.table;
  const press = layout.press;
  const posts = [];
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 0, 1]) posts.push([layout.pergola.x + sx * layout.pergola.halfX, layout.pergola.z + sz * layout.pergola.halfZ]);
  }
  let nearestTree = Infinity;
  for (const s of samples) {
    for (const tree of layout.trees) {
      nearestTree = Math.min(nearestTree, Math.hypot(s[0] - tree.x, s[2] - tree.z));
    }
    const shedD = rectDist(s[0], s[2], sx0, sx1, sz0, sz1);
    assert.ok(shedD > 0.45, 'path clips the shed ' + shedD.toFixed(2));
    const tableD = rectDist(s[0], s[2], table.x - table.length / 2, table.x + table.length / 2, table.z - table.width / 2, table.z + table.width / 2);
    assert.ok(tableD > 0.7, 'path clips the table');
    const pressD = rectDist(s[0], s[2], press.x - 0.7, press.x + 0.7, press.z - 0.55, press.z + 0.55);
    assert.ok(pressD > 0.45, 'path clips the press');
    for (const post of posts) {
      assert.ok(Math.hypot(s[0] - post[0], s[2] - post[1]) > 0.65, 'path clips a pergola post');
    }
  }
  assert.ok(nearestTree > 1.05, 'a tree stands in the path (' + nearestTree.toFixed(2) + 'm)');
  assert.equal(layout.shed.door, '+x');
  assert.ok(layout.shed.x < layout.table.x - 3, 'shed is not on the edge away from the table');
  assert.equal(layout.press.facing, '+z');
});

test('steps sit in the gaps of the retaining walls', () => {
  const walls = layout.walls;
  for (const step of layout.steps) {
    const span = step.width / 2;
    const candidates = walls.filter((w) => Math.abs(w.a[1] - step.zWall) < 0.7 || Math.abs(w.b[1] - step.zWall) < 0.7);
    const endsLeft = [];
    const endsRight = [];
    for (const w of candidates) {
      const xs = [w.a[0], w.b[0]].sort((a, b) => a - b);
      if (xs[1] < step.x) endsLeft.push(xs[1]);
      if (xs[0] > step.x) endsRight.push(xs[0]);
    }
    const left = Math.max(...endsLeft);
    const right = Math.min(...endsRight);
    assert.ok(Number.isFinite(left) && Number.isFinite(right), step.id + ' opening not found');
    assert.ok(step.x - span > left - 0.02, step.id + ' overlaps the left wall');
    assert.ok(step.x + span < right + 0.02, step.id + ' overlaps the right wall');
    assert.ok(step.y1 > step.y0, step.id);
  }
  for (const w of layout.walls) assert.ok(w.top > w.base + 0.2, w.id + ' is not a low wall');
});
