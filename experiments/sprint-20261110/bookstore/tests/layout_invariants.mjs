import { execSync } from 'child_process';
import { existsSync, readFileSync, realpathSync } from 'fs';
import { dirname, join, resolve } from 'path';
import { fileURLToPath } from 'url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const layout = JSON.parse(readFileSync(join(root, 'layout.json'), 'utf8'));
const fails = [];
const check = (cond, msg) => { if (!cond) fails.push(msg); };

execSync('node --check bookstore.js', { cwd: root });
execSync('node --check scene_runtime.js', { cwd: root });

const { width: W, depth: D } = layout.meta.room;
const byId = Object.fromEntries(layout.instances.map((i) => [i.id, i]));
const zones = layout.zones;

check(layout.meta.room.height > 3, 'room height');
check(zones.window && zones.readingTable && zones.island && zones.counter && zones.gondola, 'zones');

for (const [kind, spec] of Object.entries(layout.assets)) {
  const path = join(root, spec.glb);
  check(existsSync(path), `missing glb ${kind}: ${spec.glb}`);
  check(!spec.glb.startsWith('http'), `remote glb ${kind}`);
  check(spec.targetHeight > 0.05 && spec.targetHeight < 3, `height ${kind}`);
  if (existsSync(path)) {
    const real = realpathSync(path);
    check(!real.includes(`${join('experiments', 'sprint-20261110', 'bookstore')}${kind}`), `copied bulk? ${kind}`);
    check(real.includes('/library/') || real.includes('/cafe/') || real.includes('/museum/'), `unexpected realpath ${kind} -> ${real}`);
  }
}

const vendor = realpathSync(join(root, 'vendor', 'three.module.js'));
check(vendor.includes('/library/vendor/'), `vendor should symlink to library, got ${vendor}`);

const FACE = { '+Z': [0, 1], '-Z': [0, -1], '+X': [1, 0], '-X': [-1, 0] };
function worldFront(rot, local) {
  const sign = local === '-Z' ? -1 : 1;
  return [Math.sin(rot) * sign, Math.cos(rot) * sign];
}

for (const inst of layout.instances) {
  const [x, y, z] = inst.position;
  check(y >= -0.001 && y < layout.meta.room.height, `${inst.id} y ${y}`);
  check(Math.abs(x) < W / 2 - 0.05, `${inst.id} x out of room ${x}`);
  check(Math.abs(z) < D / 2 - 0.05, `${inst.id} z out of room ${z}`);
  if (inst.facing && inst.frontLocal) {
    const [fx, fz] = worldFront(inst.rotationY || 0, inst.frontLocal);
    const [ex, ez] = FACE[inst.facing];
    const dot = fx * ex + fz * ez;
    check(dot > 0.94, `${inst.id} faces ${inst.facing} but front is ${fx.toFixed(2)},${fz.toFixed(2)}`);
  }
}

const cases = layout.instances.filter((i) => i.kind === 'display_bookcase');
check(cases.length >= 8, 'bookcase count');
for (let i = 0; i < cases.length; i++) {
  for (let j = i + 1; j < cases.length; j++) {
    const dx = cases[i].position[0] - cases[j].position[0];
    const dz = cases[i].position[2] - cases[j].position[2];
    const dist = Math.hypot(dx, dz);
    check(dist > 0.95, `cases ${cases[i].id} and ${cases[j].id} too close (${dist.toFixed(2)})`);
  }
}

check(byId.win_bench_l && byId.win_bench_r, 'window benches');
for (const id of ['win_bench_l', 'win_bench_r']) {
  const rot = byId[id].rotationY;
  check(Math.abs(rot - Math.PI / 2) < 0.05, `${id} should run along the window`);
}
check(byId.win_chair_l.position[2] > zones.readingTable.z + 0.4, 'left window chair in front of table');
check(byId.win_chair_r.position[2] > zones.readingTable.z + 0.4, 'right window chair in front of table');
check(byId.win_chair_l.position[2] > byId.win_bench_l.position[2] + 0.8, 'chairs in front of benches');

function inside(inst, zone, pad = 0.05) {
  const [x, , z] = inst.position;
  return Math.abs(x - zone.x) < zone.w / 2 - pad && Math.abs(z - zone.z) < zone.d / 2 - pad;
}
check(inside(byId.register, zones.counter, 0.02), 'register on counter');
check(inside(byId.pos, zones.counter, 0.02), 'pos on counter');
check(inside(byId.lamp_till, zones.counter, 0.0), 'till lamp on counter');
check(inside(byId.lamp_win_l, zones.readingTable, 0), 'window lamp on table');
check(inside(byId.lamp_win_r, zones.readingTable, 0), 'window lamp r on table');
check(inside(byId.lamp_island, zones.island, 0), 'island lamp on island');
check(byId.staff_chair.position[2] < zones.counter.z - zones.counter.d / 2, 'staff chair on the shop side of the counter');
check(byId.feature_stand.kind === 'book_stand', 'lectern');
check(layout.instances.filter((i) => i.kind === 'pendant_lamp').every((i) => i.position[1] > 2.4), 'pendants hang');
check(layout.instances.filter((i) => i.kind === 'library_lamp').length >= 4, 'banker lamps');

const ids = new Set(layout.instances.map((i) => i.id));
check(ids.size === layout.instances.length, 'duplicate ids');

if (fails.length) {
  console.error(fails.join('\n'));
  process.exit(1);
}
console.log(`ok — ${layout.instances.length} instances, ${Object.keys(layout.assets).length} assets`);
