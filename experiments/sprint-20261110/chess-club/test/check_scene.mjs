import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { expandComposition, validate, parseFen, START_FEN } from '../chess_data.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const layout = JSON.parse(readFileSync(join(root, 'layout.json'), 'utf8'));
expandComposition(layout);
const errors = validate(layout);

const room = layout.meta.room;
if (room.width < 8 || room.depth < 6 || room.height < 2.8) errors.push('room too small for a clubhouse');
const door = layout.composition.architecture.doorZ;
if (door[1] - door[0] < 0.75) errors.push('doorway narrower than 0.75 m');

for (const [kind, spec] of Object.entries(layout.assets)) {
  const path = join(root, spec.glb);
  if (!existsSync(path)) errors.push(`missing glb for ${kind}: ${spec.glb}`);
}
for (const rel of ['index.html', 'chess.js', 'scene_lib.js', 'vendor/three.module.js', 'vendor/loaders/GLTFLoader.js']) {
  if (!existsSync(join(root, rel))) errors.push(`missing ${rel}`);
}

const featured = parseFen(layout.composition.tables[0].fen);
const start = parseFen(START_FEN);
if (start.length !== 32) errors.push('start fen is not 32 pieces');
if (featured.length !== 30) errors.push(`featured set should be a knight trade (30), got ${featured.length}`);
const analysis = parseFen(layout.composition.tables.find((t) => t.id === 'analysis').fen);
if (analysis.length < 28) errors.push('analysis board too empty');

const chairs = layout.instances.filter((i) => i.kind === 'dining_chair');
const tables = layout.instances.filter((i) => i.kind === 'square_table');
if (tables.length !== 3) errors.push(`expected 3 tables, got ${tables.length}`);
if (chairs.length < 8) errors.push(`expected player, analysis and viewing chairs, got ${chairs.length}`);

const clocks = layout.composition.tables.filter((t) => t.clock).length;
if (clocks < 3) errors.push('each board needs a chess clock');

if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}
console.log(`ok — ${layout.instances.length} instances, ${chairs.length} chairs, doorway ${(door[1] - door[0]).toFixed(2)} m`);
