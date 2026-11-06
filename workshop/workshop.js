import * as THREE from 'three';
import { boot, toon, addBox, addCyl, makeCutawayShell } from './scene_lib.js';

function makeShell(layout) {
  const g = makeCutawayShell(layout, { wainscotH: 0.7 });
  const { depth: D } = layout.meta.room;
  const wood = toon(layout.shell.woodColor);
  addBox(g, 1.8, 0.04, 0.32, wood, 3.15, 1.15, -D / 2 + 0.22);
  for (let i = 0; i < 6; i++) addCyl(g, 0.07, 0.08, 0.1, toon('#d8c8b0'), 2.55 + (i % 3) * 0.28, 1.26, -D / 2 + 0.22, 10);
  return g;
}

function wheel(g, x, z) {
  const iron = toon('#4a4540');
  const splash = toon('#8a7a68');
  addCyl(g, 0.28, 0.32, 0.14, splash, x, 0.4, z, 16);
  addCyl(g, 0.05, 0.05, 0.55, iron, x, 0.35, z, 8);
  addCyl(g, 0.22, 0.22, 0.04, iron, x, 0.62, z, 16);
  addCyl(g, 0.08, 0.1, 0.12, toon('#c4b09a'), x, 0.7, z, 10); // clay
}

function kiln(g, x, z) {
  const brick = toon('#6a4030');
  addBox(g, 0.85, 1.15, 0.7, brick, x, 0.58, z);
  addBox(g, 0.45, 0.55, 0.06, toon('#2a2420'), x, 0.55, z + 0.38);
  addCyl(g, 0.08, 0.1, 0.25, brick, x, 1.28, z, 8);
}

function makeProcedural(layout) {
  const g = new THREE.Group();
  g.name = 'procedural';
  wheel(g, -2.65, 0.55);
  kiln(g, 3.45, -2.45);
  // ware shelf of pots
  addBox(g, 0.4, 1.2, 0.9, toon('#6a5340'), -3.55, 0.6, -1.65);
  for (let r = 0; r < 3; r++) {
    for (let i = 0; i < 3; i++) addCyl(g, 0.06, 0.07, 0.1, toon('#d2c4b0'), -3.55, 0.28 + r * 0.38, -1.95 + i * 0.28, 10);
  }
  // clay lumps on work table (0.15, 0.85)
  addCyl(g, 0.08, 0.1, 0.08, toon('#c4b09a'), 0.0, 0.8, 0.7, 10);
  addCyl(g, 0.06, 0.07, 0.05, toon('#c4b09a'), 0.35, 0.79, 0.95, 8);
  return g;
}

boot({
  makeShell,
  makeProcedural,
  readyText: 'ready — art / ceramics workshop · drag orbit · U unlit · T toon',
});
