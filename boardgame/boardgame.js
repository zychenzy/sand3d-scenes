import * as THREE from 'three';
import { boot, toon, addBox, addCyl, makeCutawayShell } from './scene_lib.js';

function makeShell(layout) {
  const g = makeCutawayShell(layout, { wainscotH: 0.85 });
  const { width: W, depth: D } = layout.meta.room;
  const wood = toon(layout.shell.woodColor);
  addBox(g, 2.4, 0.04, 0.28, wood, -2.4, 1.55, -D / 2 + 0.2);
  addBox(g, 2.4, 0.04, 0.28, wood, 1.6, 1.55, -D / 2 + 0.2);
  for (let i = 0; i < 8; i++) addBox(g, 0.22, 0.08, 0.16, toon(['#6b2a2a', '#2a4a6b', '#3a6a3a', '#7a5a20'][i % 4]), -3.1 + i * 0.28, 1.64, -D / 2 + 0.2);
  return g;
}

function checker(g, x, z, n, size, c0, c1) {
  const cell = size / n;
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      addBox(g, cell * 0.96, 0.012, cell * 0.96, toon((i + j) % 2 ? c1 : c0), x + (i - (n - 1) / 2) * cell, 0.762, z + (j - (n - 1) / 2) * cell);
    }
  }
}

function makeProcedural(layout) {
  const g = new THREE.Group();
  g.name = 'procedural';
  // boards on the three square tables (positions from layout)
  checker(g, -2.15, -0.35, 8, 0.52, '#f0e6d2', '#4a3020');
  checker(g, 2.15, -0.35, 8, 0.52, '#e8f0e4', '#2f4a38');
  addBox(g, 0.55, 0.01, 0.4, toon('#245a38'), 0.0, 0.762, 1.95);
  for (let i = 0; i < 5; i++) addBox(g, 0.06, 0.004, 0.09, toon('#f4e8d8'), -0.16 + i * 0.07, 0.77, 1.95);
  addCyl(g, 0.08, 0.08, 0.03, toon('#c4a050'), -2.0, 0.78, -0.2, 10);
  return g;
}

boot({
  makeShell,
  makeProcedural,
  readyText: 'ready — board-game room · drag orbit · U unlit · T toon',
});
