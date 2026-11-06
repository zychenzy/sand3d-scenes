import * as THREE from 'three';
import { boot, toon, addBox, addCyl, makeCutawayShell } from './scene_lib.js';

function makeShell(layout) {
  const g = makeCutawayShell(layout, {
    wainscotH: 1.05,
    carpet: { w: layout.meta.room.width - 1.4, d: layout.meta.room.depth - 1.3, x: 0.1, z: 0.1 },
  });
  const { width: W, depth: D } = layout.meta.room;
  const s = layout.shell;
  const wood = toon(s.woodColor);
  addBox(g, W - 0.4, 0.08, 0.08, wood, 0, 2.35, -D / 2 + 0.12);
  return g;
}

function makeProcedural(layout) {
  const g = new THREE.Group();
  g.name = 'procedural';
  const wood = toon('#5a3a22');
  // cue rack on left wall
  addBox(g, 0.06, 1.35, 0.55, wood, -4.15, 1.15, -1.55);
  for (let i = 0; i < 4; i++) addCyl(g, 0.015, 0.015, 1.25, toon('#d2b48a'), -4.05, 1.05, -1.75 + i * 0.12, 6);
  // overhead lamp shade over pool
  addBox(g, 1.8, 0.08, 0.45, toon('#3a5a38'), 0, 2.35, -0.35);
  addCyl(g, 0.04, 0.04, 0.2, toon('#c4a050'), 0, 2.48, -0.35, 8);
  return g;
}

boot({
  makeShell,
  makeProcedural,
  readyText: 'ready — billiards lounge · drag orbit · U unlit · T toon',
});
