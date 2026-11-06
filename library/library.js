import * as THREE from 'three';
import { boot, toon, addBox, addCyl, makeCutawayShell, fillBooks } from './scene_lib.js';

function makeShell(layout) {
  const g = makeCutawayShell(layout, { wainscotH: 0.92, ceilingW: layout.meta.room.width * 0.88, ceilingD: layout.meta.room.depth * 0.7 });
  const s = layout.shell;
  const wood = toon(s.woodColor);
  const { width: W, depth: D } = layout.meta.room;
  addBox(g, W - 0.5, 0.05, 0.06, wood, 0, 2.95, -D / 2 + 0.12);
  addBox(g, 0.06, 0.05, D - 0.5, wood, -W / 2 + 0.12, 2.95, 0);
  for (let i = -4; i <= 4; i++) addBox(g, W - 0.6, 0.004, 0.025, toon('#b8a888'), 0, 0.002, i * 0.72);
  return g;
}

function makeProcedural(layout) {
  const g = new THREE.Group();
  g.name = 'procedural';
  const wood = toon(layout.shell.woodColor);
  const top = toon('#c9a06a');
  // two long communal tables with a clear centre aisle
  for (const z of [-1.15, 1.2]) {
    addBox(g, 5.5, 0.07, 1.18, top, 0, 0.735, z);
    addBox(g, 0.14, 0.7, 1.05, wood, -2.55, 0.35, z);
    addBox(g, 0.14, 0.7, 1.05, wood, 2.55, 0.35, z);
    addBox(g, 5.4, 0.05, 0.16, wood, 0, 0.08, z);
  }
  const backXs = [-4.2, -2.8, -1.4, 0, 1.4, 2.8, 4.2];
  for (const x of backXs) fillBooks(g, x, -3.26, 0, { width: 0.7, perShelf: 8 });
  for (const z of [-1.7, -0.2, 1.3]) fillBooks(g, -4.76, z, Math.PI / 2, { width: 0.7, perShelf: 8 });
  return g;
}

boot({
  makeShell,
  makeProcedural,
  readyText: 'ready — library reading room · drag orbit · U unlit · T toon',
});
