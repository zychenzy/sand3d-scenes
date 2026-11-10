import { readFileSync } from 'node:fs';
import { evaluate, SLAB } from '../geometry.js';

const report = evaluate();
console.log(report.text);
const layout = JSON.parse(readFileSync(new URL('../layout.json', import.meta.url), 'utf8'));
const failures = [...report.failures];
const cam = layout.camera;
const [cx, cy, cz] = cam.position;
const [tx, ty, tz] = cam.target;
if (!(cz > tz && cx > tx)) failures.push('default camera is not southeast of its target');
if (cy < 4) failures.push('default camera is too low to read the whole site');
if (tx < SLAB.x0 || tx > SLAB.x1 || tz < SLAB.z0 - 2 || tz > SLAB.z1) failures.push('default target misses the concrete');
if (ty < 0 || ty > 2) failures.push('default target is off the riding height');
for (const name of ['corner', 'close']) {
  if (!layout.cameraPresets[name]) failures.push(`missing ${name} camera`);
}
if (!failures.length) console.log('cameras OK');
else {
  for (const f of failures) console.log('FAIL', f);
  process.exit(1);
}
