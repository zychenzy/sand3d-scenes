import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { layout, validate, angleErrorDeg } from './site.mjs';

const dir = path.dirname(fileURLToPath(import.meta.url));
const lines = [];
const fail = (msg) => {
  lines.push(`FAIL ${msg}`);
};

const result = validate(layout);
lines.push(`shore range ${result.stats.shoreRange.toFixed(2)} m`);
lines.push(`tree height stddev ${result.stats.hStd.toFixed(2)} m`);
lines.push(`seat gap stddev ${result.stats.gapStd.toFixed(3)} rad`);
lines.push(`picnic-to-fire ${result.stats.tableDist.toFixed(2)} m`);

for (const seat of layout.seats) {
  const err = angleErrorDeg(seat.yaw, seat.x, seat.z, layout.fire.x, layout.fire.z);
  const dist = Math.hypot(seat.x - layout.fire.x, seat.z - layout.fire.z);
  lines.push(`${seat.id} faces fire within ${err.toFixed(2)}° at ${dist.toFixed(2)} m`);
}
for (const tent of layout.tents) {
  const err = angleErrorDeg(tent.yaw, tent.x, tent.z, layout.fire.x, layout.fire.z);
  const dist = Math.hypot(tent.x - layout.fire.x, tent.z - layout.fire.z);
  lines.push(`${tent.id} (${tent.kind}) door toward fire within ${err.toFixed(2)}° at ${dist.toFixed(2)} m`);
}
for (const bench of layout.benches) {
  const err = angleErrorDeg(bench.yaw, bench.x, bench.z, layout.table.x, layout.table.z);
  lines.push(`${bench.id} faces picnic table within ${err.toFixed(2)}°`);
}

for (const err of result.errors) fail(err);

const onDisk = JSON.parse(fs.readFileSync(path.join(dir, 'layout.json'), 'utf8'));
if (JSON.stringify(onDisk) !== JSON.stringify(layout)) {
  fail('layout.json does not match site.mjs');
}

for (const [kind, spec] of Object.entries(layout.assets)) {
  const file = path.join(dir, spec.glb);
  if (!fs.existsSync(file)) fail(`missing ${kind} at ${spec.glb}`);
  else lines.push(`${kind} ${fs.statSync(file).size} bytes`);
}

for (const rel of [
  'vendor/three.module.js',
  'vendor/controls/OrbitControls.js',
  'vendor/loaders/GLTFLoader.js',
  'vendor/utils/BufferGeometryUtils.js',
]) {
  if (!fs.existsSync(path.join(dir, rel))) fail(`missing ${rel}`);
}

for (const shot of ['shots/toon_default.png', 'shots/toon_corner.png', 'shots/toon_close.png', 'shots/unlit_default.png']) {
  const file = path.join(dir, shot);
  if (!fs.existsSync(file)) fail(`missing ${shot}`);
  else {
    const size = fs.statSync(file).size;
    lines.push(`${shot} ${size} bytes`);
    if (size < 80000) fail(`${shot} is too small to be a rendered frame`);
  }
}

const failed = lines.filter((l) => l.startsWith('FAIL'));
console.log(lines.join('\n'));
if (failed.length) {
  console.error(`\n${failed.length} failure(s)`);
  process.exit(1);
}
console.log('\nPASS');
