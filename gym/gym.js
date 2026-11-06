import * as THREE from 'three';
import { boot, toon, addBox, addCyl, makeCutawayShell } from './scene_lib.js';

function makeShell(layout) {
  const g = makeCutawayShell(layout, {
    carpet: { w: layout.meta.room.width - 0.8, d: layout.meta.room.depth - 1.6, x: 0, z: -0.55 },
  });
  const { depth: D } = layout.meta.room;
  addBox(g, 4.8, 1.95, 0.04, toon('#d8e0e6'), 0.15, 1.55, -D / 2 + 0.12);
  addBox(g, 4.95, 0.06, 0.05, toon('#2a2a2c'), 0.15, 2.55, -D / 2 + 0.14);
  return g;
}

function kettle(g, x, z, h = 0.28) {
  addCyl(g, 0.1, 0.12, 0.16, toon('#3a3a42'), x, 0.1, z, 10);
  addCyl(g, 0.045, 0.045, 0.12, toon('#3a3a42'), x, 0.24, z, 8);
}

function makeProcedural(layout) {
  const g = new THREE.Group();
  g.name = 'procedural';
  const metal = toon('#7a7a82');
  addBox(g, 0.34, 0.85, 1.85, metal, -3.55, 0.42, 0.15);
  for (let i = 0; i < 6; i++) {
    const z = -0.65 + i * 0.28;
    const y = i % 2 ? 0.62 : 0.38;
    addCyl(g, 0.045, 0.045, 0.3, toon('#2e2e34'), -3.55, y, z, 8);
    addCyl(g, 0.1, 0.1, 0.07, toon('#4a4a52'), -3.55, y, z - 0.15, 10);
    addCyl(g, 0.1, 0.1, 0.07, toon('#4a4a52'), -3.55, y, z + 0.15, 10);
  }
  kettle(g, -2.35, 1.45);
  kettle(g, -2.05, 1.55);
  kettle(g, -2.45, 1.75);
  for (const [x, z] of [[-2.15, -1.85], [0.15, -2.05], [2.35, -1.75]]) {
    addBox(g, 1.15, 0.012, 1.15, toon('#2a2a30'), x, 0.018, z);
  }
  return g;
}

boot({
  makeShell,
  makeProcedural,
  readyText: 'ready — gym / training · drag orbit · U unlit · T toon',
});
