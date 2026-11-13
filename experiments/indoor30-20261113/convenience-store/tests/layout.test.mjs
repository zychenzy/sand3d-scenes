import { execSync } from 'child_process';
import { existsSync, readFileSync, realpathSync, statSync } from 'fs';
import { dirname, join, resolve } from 'path';
import { fileURLToPath } from 'url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const repo = resolve(root, '../../..');
const layout = JSON.parse(readFileSync(join(root, 'layout.json'), 'utf8'));
const js = readFileSync(join(root, 'convenience.js'), 'utf8');
const runtime = readFileSync(join(root, 'scene_runtime.js'), 'utf8');
const html = readFileSync(join(root, 'index.html'), 'utf8');
const fails = [];
const check = (cond, msg) => { if (!cond) fails.push(msg); };

execSync('node --check convenience.js', { cwd: root });
execSync('node --check scene_runtime.js', { cwd: root });
execSync('node --check tests/layout.test.mjs', { cwd: root });

const { width: W, depth: D, height: H } = layout.meta.room;
check(W > 8 && D > 7 && H > 2.8 && H < 3.6, 'room scale');
check(layout.zones.fridges.count >= 3, 'glass-door run');
check(layout.zones.gondolas.length >= 2, 'two aisles of gondolas');
check(layout.zones.hot && layout.zones.checkout && layout.zones.ledge && layout.zones.window, 'hot, checkout, ledge, window');

for (const [kind, spec] of Object.entries(layout.assets)) {
  check(spec.glb.startsWith('../../../'), `${kind} must reference a root asset`);
  check(!spec.glb.includes('experiments/indoor30'), `${kind} must not copy into this folder`);
  const path = resolve(root, spec.glb);
  check(existsSync(path), `missing ${kind} ${spec.glb}`);
  if (existsSync(path)) {
    const real = realpathSync(path);
    check(real.startsWith(join(repo, 'cafe') + '/') || real.includes(`${join(repo, 'cafe')}/`), `unexpected asset root ${kind} -> ${real}`);
    check(!real.includes('indoor30-20261113'), `duplicated glb ${kind}`);
    check(statSync(real).size < 800000, `enormous asset ${kind} ${statSync(real).size}`);
  }
  check(spec.targetHeight > 0.08 && spec.targetHeight < 1.2, `height ${kind}`);
}

const vendor = realpathSync(resolve(root, '../../../library/vendor/three.module.js'));
check(vendor.includes(`${join('library', 'vendor')}`), `vendor ref ${vendor}`);
check(html.includes('../../../library/vendor/three.module.js'), 'import map');
check(runtime.includes('MeshToonMaterial') && runtime.includes('NearestFilter'), 'hard toon');
check(runtime.includes('MeshBasicMaterial'), 'true unlit');
check(runtime.includes('STOPS'), 'stepped ramp');
for (const banned of ['https://', 'http://', 'cdn.jsdelivr', 'unpkg']) {
  check(!html.includes(banned) && !js.includes(banned) && !runtime.includes(banned), `offline leak ${banned}`);
}
check(js.includes('#e7f3f5') || js.includes('#e7f3f5'.toLowerCase()) || js.includes('e7f3f5'), 'pale fridge interior');
check(!/fridge[^]{0,80}#0{3,6}/i.test(js), 'no black fridge body');
check(js.includes('opacity: 0.18'), 'glass is a door, not a slab');
check(!js.includes('2048') && !js.includes('4096'), 'no enormous canvas');
check(js.includes('128, 128') || js.includes('128, 64') || js.includes('canvasTexture'), 'small canvases only');

const FACE = { '+Z': [0, 1], '-Z': [0, -1], '+X': [1, 0], '-X': [-1, 0] };
function worldFront(rot, local) {
  const sign = local === '-Z' ? -1 : 1;
  return [Math.sin(rot) * sign, Math.cos(rot) * sign];
}
function aabbHit(a, b, pad = 0) {
  return a.min[0] < b.max[0] - pad && a.max[0] > b.min[0] + pad
    && a.min[1] < b.max[1] - pad && a.max[1] > b.min[1] + pad;
}

const ids = new Set();
for (const inst of layout.instances) {
  check(!ids.has(inst.id), `duplicate ${inst.id}`);
  ids.add(inst.id);
  const [x, y, z] = inst.position;
  check(Math.abs(x) < W / 2 - 0.05, `${inst.id} x ${x}`);
  check(Math.abs(z) < D / 2 - 0.08, `${inst.id} z ${z}`);
  check(y >= -0.001 && y < H - 0.2, `${inst.id} y ${y}`);
  check(layout.assets[inst.kind], `${inst.id} kind`);
  if (inst.facing) {
    const [fx, fz] = worldFront(inst.rotationY || 0, inst.frontLocal || '+Z');
    const [ex, ez] = FACE[inst.facing];
    check(fx * ex + fz * ez > 0.95, `${inst.id} should face ${inst.facing}`);
  }
  const radius = layout.footprints[inst.kind].radius;
  for (const aisle of layout.aisles) {
    const box = { min: aisle.min, max: aisle.max };
    const inflated = {
      min: [inst.position[0] - radius, inst.position[2] - radius],
      max: [inst.position[0] + radius, inst.position[2] + radius],
    };
    check(!aabbHit(inflated, box, 0.02), `${inst.id} blocks ${aisle.id}`);
  }
}

function zoneBoxes(z) {
  const boxes = [];
  const f = z.fridges;
  const pitch = f.w + f.gap;
  for (let i = 0; i < f.count; i++) {
    const x = f.x0 + f.w / 2 + i * pitch;
    boxes.push({ id: `fridge-${i}`, min: [x - f.w / 2, f.z - f.d / 2], max: [x + f.w / 2, f.z + f.d / 2] });
  }
  for (const g of z.gondolas) {
    boxes.push({ id: g.id, min: [g.x - g.w / 2, g.z0], max: [g.x + g.w / 2, g.z1] });
  }
  const bay = z.wallBay;
  boxes.push({ id: 'wall', min: [bay.x - bay.d / 2, bay.z0], max: [bay.x + bay.d / 2, bay.z1] });
  const hot = z.hot;
  boxes.push({ id: 'hot', min: [hot.x0, hot.z - hot.d / 2], max: [hot.x1, hot.z + hot.d / 2] });
  const c = z.checkout;
  boxes.push({ id: 'checkout', min: [c.x0, c.z0], max: [c.x1, c.z1] });
  const ledge = z.ledge;
  boxes.push({ id: 'ledge', min: [ledge.x - ledge.d / 2, ledge.z0], max: [ledge.x + ledge.d / 2, ledge.z1] });
  return boxes;
}

const boxes = zoneBoxes(layout.zones);
for (const aisle of layout.aisles) {
  const width = aisle.max[0] - aisle.min[0];
  const depth = aisle.max[1] - aisle.min[1];
  const clear = Math.min(width, depth);
  check(clear + 1e-6 >= aisle.minClear, `${aisle.id} clear ${clear.toFixed(2)} < ${aisle.minClear}`);
  const aisleBox = { min: aisle.min, max: aisle.max };
  for (const box of boxes) {
    check(!aabbHit(box, aisleBox, 0.01), `${box.id} intersects ${aisle.id}`);
  }
}
for (let i = 0; i < boxes.length; i++) {
  for (let j = i + 1; j < boxes.length; j++) {
    check(!aabbHit(boxes[i], boxes[j], 0.02), `${boxes[i].id} overlaps ${boxes[j].id}`);
  }
}

const checkout = layout.zones.checkout;
const byId = Object.fromEntries(layout.instances.map((i) => [i.id, i]));
check(byId.register.position[1] >= checkout.h - 0.02 && byId.register.position[1] < checkout.h + 0.15, 'register on counter');
check(byId.pos.position[1] >= checkout.h - 0.02, 'pos on counter');
check(byId.register.position[0] > checkout.x0 && byId.register.position[0] < checkout.x1, 'register x');
check(byId.clerk_stool.position[0] > checkout.x1 + 0.2, 'clerk on the staff side');
check(byId.ledge_stool_a.position[0] > layout.zones.ledge.x + layout.zones.ledge.d / 2, 'stool on the room side of the ledge');
check(byId.ledge_mug_a.position[1] > layout.zones.ledge.h, 'mug on the ledge');
check(layout.zones.fridges.h > 1.85 && layout.zones.fridges.h < 2.2, 'cooler height');
check(layout.zones.gondolas[0].h > 1.35 && layout.zones.gondolas[0].h < 1.75, 'gondola height');
check(layout.zones.wordmark.h <= 0.28, 'wordmark stays small');

for (const name of ['default', 'corner', 'detail']) {
  const cam = name === 'default' ? layout.camera : layout.cameraPresets[name];
  const [x, y, z] = cam.position;
  check(y > 1.1 && y < H, `${name} camera height`);
  for (const box of boxes) {
    const inside = x > box.min[0] && x < box.max[0] && z > box.min[1] && z < box.max[1] && y < 2.1;
    check(!inside, `${name} camera sits inside ${box.id}`);
  }
}

const shots = ['toon_default.png', 'toon_corner.png', 'toon_detail.png', 'unlit_default.png'];
for (const shot of shots) {
  const path = join(root, 'shots', shot);
  check(existsSync(path), `missing shot ${shot}`);
  if (existsSync(path)) check(statSync(path).size > 20000, `shot too small ${shot}`);
}

if (fails.length) {
  console.error(fails.join('\n'));
  process.exit(1);
}
console.log(`ok — ${layout.instances.length} instances, ${boxes.length} zones, ${layout.aisles.length} aisles`);
