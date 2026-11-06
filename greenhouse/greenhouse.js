import * as THREE from 'three';
import { boot, toon, addBox, addCyl, makeCutawayShell } from './scene_lib.js';

function makeShell(layout) {
  const g = makeCutawayShell(layout, {
    glass: true,
    glassOpacity: 0.28,
    ceilingW: layout.meta.room.width * 0.94,
    ceilingD: layout.meta.room.depth * 0.78,
  });
  const { width: W, depth: D } = layout.meta.room;
  addBox(g, 1.4, 0.03, D - 1.8, toon('#c4b888'), 0, 0.02, 0.05);
  const bed = toon('#6a4a32');
  addBox(g, W - 2.4, 0.16, 0.7, bed, 0.05, 0.09, -D / 2 + 0.62);
  addBox(g, 0.7, 0.16, D - 2.2, bed, -W / 2 + 0.62, 0.09, 0.05);
  return g;
}

function canopy(g, x, z, h, color) {
  addCyl(g, 0.016, 0.024, h * 0.32, toon('#4a5a32'), x, 0.4 + h * 0.12, z, 8);
  addCyl(g, h * 0.18, h * 0.22, h * 0.42, toon(color), x, 0.55 + h * 0.38, z, 10);
  addCyl(g, h * 0.12, h * 0.14, h * 0.22, toon(color), x + 0.05, 0.72 + h * 0.28, z - 0.04, 8);
}

function makeProcedural(layout) {
  const g = new THREE.Group();
  g.name = 'procedural';
  const greens = ['#2f6a3a', '#3d7a48', '#255a32', '#4a8a52', '#356848', '#2a5a30'];
  const pots = (layout.instances || []).filter((i) => i.kind === 'flowerpot');
  pots.forEach((p, i) => {
    const h = 0.55 + (i % 4) * 0.14;
    canopy(g, p.position[0], p.position[2], h, greens[i % greens.length]);
  });
  return g;
}

boot({
  makeShell,
  makeProcedural,
  readyText: 'ready — indoor greenhouse · drag orbit · U unlit · T toon',
});
