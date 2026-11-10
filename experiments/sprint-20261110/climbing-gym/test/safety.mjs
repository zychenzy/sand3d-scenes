import { readFileSync, realpathSync } from 'fs';
import { fileURLToPath } from 'url';
import { audit } from '../geometry.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const layout = JSON.parse(readFileSync(new URL('../layout.json', import.meta.url), 'utf8'));
const errors = audit(layout);

for (const spec of Object.values(layout.assets)) {
  const url = new URL(`../${spec.glb}`, import.meta.url);
  const real = realpathSync(fileURLToPath(url));
  if (real.includes(`${root}`)) errors.push(`bundled copy instead of symlink: ${spec.glb}`);
  if (!real.includes('/assets/')) errors.push(`asset path unexpected: ${real}`);
}

const vendor = realpathSync(fileURLToPath(new URL('../vendor/three.module.js', import.meta.url)));
if (vendor.includes(root)) errors.push('three.module.js should be the shared gym vendor, not a copy');

if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}
console.log(`safety ok — ${layout.instances.length} props, room ${layout.meta.room.width}×${layout.meta.room.depth}×${layout.meta.room.height} m`);
