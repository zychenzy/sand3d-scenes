import { readFileSync, realpathSync, lstatSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { audit } from '../rigging.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const layout = JSON.parse(readFileSync(new URL('../layout.json', import.meta.url), 'utf8'));
const errors = audit(layout);

for (const spec of Object.values(layout.assets)) {
  const link = fileURLToPath(new URL(`../${spec.glb}`, import.meta.url));
  if (!lstatSync(link).isSymbolicLink()) errors.push(`not a symlink: ${spec.glb}`);
  const real = realpathSync(link);
  if (real.startsWith(root)) errors.push(`asset copied into the scene: ${spec.glb}`);
  if (!real.includes('/assets/')) errors.push(`asset path unexpected: ${real}`);
}

const vendorLink = fileURLToPath(new URL('../vendor', import.meta.url));
if (!lstatSync(vendorLink).isSymbolicLink()) errors.push('vendor should be a symlink');
const vendor = realpathSync(fileURLToPath(new URL('../vendor/three.module.js', import.meta.url)));
if (vendor.startsWith(root)) errors.push('three.module.js should stay in the shared gym vendor');

const lib = readFileSync(new URL('../scene_lib.js', import.meta.url), 'utf8');
if (!lib.includes('MeshToonMaterial') || !lib.includes('NearestFilter')) errors.push('toon gradient is not hard-stepped');
if (!lib.includes('MeshBasicMaterial')) errors.push('unlit path is missing');
if (!lib.includes('PCFHardShadowMap')) errors.push('shadows are not hard');
const stops = lib.match(/const stops = \[([^\]]+)\]/);
if (!stops || stops[1].split(',').length !== 4) errors.push('toon ramp should be four stops');

const scene = readFileSync(new URL('../aerial.js', import.meta.url), 'utf8');
if (!/kind === 'silk'/.test(scene) || !scene.includes('buildLyra')) errors.push('scene does not build silks and lyras');
if (/yoga mat|ballet barre|mirror wall/i.test(scene)) errors.push('scene reads as a yoga or dance reskin');

if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}
console.log(`safety ok — ${layout.stations.length} points, ${layout.instances.length} linked props, ${layout.meta.room.height} m clear`);
