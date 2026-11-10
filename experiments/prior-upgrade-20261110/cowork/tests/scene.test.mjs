import assert from 'node:assert/strict';
import { existsSync, readFileSync, realpathSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const layout = JSON.parse(readFileSync(join(root, 'layout.json'), 'utf8'));
const repo = join(root, '..', '..', '..');

function forward(rotY) {
  return [Math.sin(rotY), Math.cos(rotY)];
}

function rectFor(inst) {
  const asset = layout.assets[inst.kind];
  let hx = asset.hx;
  let hz = asset.hz;
  const rot = Math.abs(inst.rotationY || 0) % Math.PI;
  if (Math.abs(rot - Math.PI / 2) < 0.35) [hx, hz] = [hz, hx];
  return { x: inst.position[0], z: inst.position[2], hx, hz, id: inst.id, top: asset.top };
}

function closestPoint(px, pz, rect) {
  const x = Math.max(rect.x - rect.hx, Math.min(px, rect.x + rect.hx));
  const z = Math.max(rect.z - rect.hz, Math.min(pz, rect.z + rect.hz));
  const dx = x - px;
  const dz = z - pz;
  return { dx, dz, dist: Math.hypot(dx, dz) };
}

test('shared glb and vendor symlinks resolve outside this experiment', () => {
  for (const spec of Object.values(layout.assets)) {
    const path = join(root, spec.glb);
    assert.equal(existsSync(path), true, spec.glb);
    const st = statSync(path);
    assert.equal(st.isFile(), true, spec.glb);
    assert.ok(st.size > 500, spec.glb);
    const real = realpathSync(path);
    assert.ok(!real.includes('prior-upgrade-20261110/cowork/assets/'), `copied blob? ${spec.glb} -> ${real}`);
    assert.ok(real.startsWith(repo), real);
  }
  const vendor = realpathSync(join(root, 'vendor', 'three.module.js'));
  assert.ok(vendor.includes('/cowork/vendor/'), vendor);
});

test('room is a richer cutaway, not the v1 box', () => {
  assert.ok(layout.meta.room.width >= 12);
  assert.ok(layout.meta.room.depth >= 8.4);
  assert.ok(layout.meta.room.height >= 3.4);
  assert.equal(layout.architecture.windows.length, 3);
  assert.ok(layout.architecture.lockers.bays.length >= 5);
  const widths = layout.architecture.lockers.bays;
  assert.equal(new Set(widths).size, widths.length);
  assert.ok(layout.zones.windowDesks && layout.zones.focus && layout.zones.island);
});

test('desk clusters are not an identical grid', () => {
  const desks = layout.instances.filter((i) => i.kind === 'study_desk');
  assert.equal(desks.length, 8);
  const clusters = new Set(desks.map((d) => d.cluster));
  assert.deepEqual([...clusters].sort(), ['focus', 'island', 'window', 'workshop']);
  const xs = desks.map((d) => d.position[0].toFixed(2));
  const zs = desks.map((d) => d.position[2].toFixed(2));
  assert.equal(new Set(xs).size, xs.length);
  assert.equal(new Set(zs).size, zs.length);
  const rots = new Set(desks.map((d) => (d.rotationY || 0).toFixed(3)));
  assert.ok(rots.size >= 2, 'at least two desk orientations');
});

test('every chair faces a nearby table', () => {
  const tables = layout.instances.filter((i) => layout.assets[i.kind]?.top).map(rectFor);
  const chairs = layout.instances.filter((i) => i.kind === 'dining_chair');
  assert.ok(chairs.length >= 14);
  for (const chair of chairs) {
    const [fx, fz] = forward(chair.rotationY || 0);
    let best = -1;
    let bestId = '';
    for (const table of tables) {
      const hit = closestPoint(chair.position[0], chair.position[2], table);
      if (hit.dist > 1.05) continue;
      const dot = hit.dist < 1e-4 ? 1 : (hit.dx / hit.dist) * fx + (hit.dz / hit.dist) * fz;
      if (dot > best) {
        best = dot;
        bestId = table.id;
      }
    }
    assert.ok(best > 0.72, `${chair.id} facing dot ${best.toFixed(2)} toward ${bestId}`);
  }
});

test('declared facing matches rotation', () => {
  const FACE = { '+Z': [0, 1], '-Z': [0, -1], '+X': [1, 0], '-X': [-1, 0] };
  for (const inst of layout.instances) {
    if (!inst.facing || !inst.frontLocal) continue;
    const [fx, fz] = forward(inst.rotationY || 0);
    const [ex, ez] = FACE[inst.facing];
    const dot = fx * ex + fz * ez;
    assert.ok(dot > 0.94, `${inst.id} faces ${inst.facing} but front is ${fx.toFixed(2)},${fz.toFixed(2)}`);
  }
});

test('banker lamps and mugs sit on a table top', () => {
  const tops = layout.instances.filter((i) => layout.assets[i.kind]?.top).map(rectFor);
  for (const kind of ['library_lamp', 'cup_mug']) {
    const items = layout.instances.filter((i) => i.kind === kind);
    assert.ok(items.length >= 6, kind);
    for (const item of items) {
      const host = tops.find((t) => {
        const hit = closestPoint(item.position[0], item.position[2], t);
        return hit.dist < 0.12 && Math.abs(item.position[1] - t.top) < 0.03;
      });
      assert.ok(host, `${item.id} is not on a table top`);
    }
  }
});

test('monitors sit on study desks and face sitters', () => {
  const desks = layout.instances.filter((i) => i.kind === 'study_desk').map(rectFor);
  const mons = layout.instances.filter((i) => i.kind === 'monitor');
  assert.equal(mons.length, 8);
  for (const mon of mons) {
    const host = desks.find((t) => closestPoint(mon.position[0], mon.position[2], t).dist < 0.08);
    assert.ok(host, `${mon.id} not on a desk`);
    assert.ok(Math.abs(mon.position[1] - 0.76) < 0.02, `${mon.id} y`);
    const cluster = host.id.replace('desk_', '');
    const chair = layout.instances.find((i) => i.id === `chair_${cluster}`);
    assert.ok(chair, `missing chair for ${mon.id}`);
    const [mx, mz] = forward(mon.rotationY || 0);
    const dx = chair.position[0] - mon.position[0];
    const dz = chair.position[2] - mon.position[2];
    const dist = Math.hypot(dx, dz) || 1;
    const dot = (dx / dist) * mx + (dz / dist) * mz;
    assert.ok(dot > 0.55, `${mon.id} should face ${chair.id} (dot ${dot.toFixed(2)})`);
  }
});

test('spine aisle stays walkable between workshop and island', () => {
  const ws = layout.instances.find((i) => i.id === 'desk_ws_b');
  const isl = layout.instances.find((i) => i.id === 'desk_isl_a');
  const gap = isl.position[0] - 0.644 - (ws.position[0] + 0.644);
  assert.ok(gap >= 1.15, `spine gap ${gap.toFixed(2)}`);
  const lockerFront = layout.architecture.lockers.xIn;
  const focus = layout.instances.find((i) => i.id === 'desk_focus_a');
  assert.ok(focus.position[0] - 0.216 - lockerFront >= 0.7, 'locker path');
});

test('ids unique and assets stay in the room', () => {
  const ids = layout.instances.map((i) => i.id);
  assert.equal(new Set(ids).size, ids.length);
  const { width: W, depth: D, height: H } = layout.meta.room;
  for (const inst of layout.instances) {
    const [x, y, z] = inst.position;
    assert.ok(y >= -0.001 && y < H, `${inst.id} y`);
    assert.ok(Math.abs(x) < W / 2 - 0.02, `${inst.id} x`);
    assert.ok(Math.abs(z) < D / 2 - 0.02, `${inst.id} z`);
  }
  assert.ok(layout.instances.filter((i) => i.kind === 'flowerpot').length >= 8);
  assert.ok(layout.instances.filter((i) => i.kind === 'pendant_lamp').length >= 4);
});
