import * as THREE from 'three';
import { boot, toon, addBox, addCyl, makeCutawayShell } from './scene_lib.js';

function makeShell(layout) {
  const g = makeCutawayShell(layout, { ceiling: false });
  const { width: W, depth: D, height: H } = layout.meta.room;
  addBox(g, W * 0.9, 0.06, D * 0.68, toon('#f4efe6'), -0.1, H - 0.04, -D * 0.1);
  const wood = toon('#d8cbb0');
  for (let i = -5; i <= 5; i++) addBox(g, W - 0.4, 0.006, 0.1, wood, 0, 0.004, i * 0.58);
  const zWall = -D / 2 + 0.12;
  // studio mirror: pale glass + wood frame + vertical bars
  addBox(g, 4.5, 1.95, 0.03, toon('#c5d4dc'), 0.2, 1.52, zWall);
  addBox(g, 3.9, 0.08, 0.01, toon('#e8f0f4'), 0.2, 2.15, zWall + 0.02);
  const frame = toon(layout.shell.woodColor);
  addBox(g, 4.68, 0.07, 0.06, frame, 0.2, 2.52, zWall + 0.02);
  addBox(g, 4.68, 0.07, 0.06, frame, 0.2, 0.52, zWall + 0.02);
  addBox(g, 0.07, 2.07, 0.06, frame, 0.2 - 2.3, 1.52, zWall + 0.02);
  addBox(g, 0.07, 2.07, 0.06, frame, 0.2 + 2.3, 1.52, zWall + 0.02);
  addBox(g, 0.04, 1.95, 0.04, frame, 0.2 - 0.75, 1.52, zWall + 0.02);
  addBox(g, 0.04, 1.95, 0.04, frame, 0.2 + 0.75, 1.52, zWall + 0.02);
  return g;
}

function makeProcedural(layout) {
  const g = new THREE.Group();
  g.name = 'procedural';
  const mats = ['#c45a4a', '#2f7a68', '#c45a4a', '#2f7a68', '#d4a05a', '#3a5a8a'];
  const xs = [-1.55, 0.15, 1.85];
  const zs = [-0.55, 1.35];
  let k = 0;
  for (const z of zs) {
    for (const x of xs) {
      addBox(g, 0.64, 0.018, 1.38, toon(mats[k++ % mats.length]), x, 0.02, z);
      addBox(g, 0.14, 0.09, 0.22, toon('#efe6d0'), x + 0.16, 0.075, z - 0.48);
    }
  }
  addBox(g, 0.3, 0.2, 0.22, toon('#efe6d0'), -3.35, 0.11, -2.45);
  addBox(g, 0.3, 0.2, 0.22, toon('#efe6d0'), -3.35, 0.31, -2.45);
  return g;
}

boot({
  makeShell,
  makeProcedural,
  readyText: 'ready — yoga / stretch studio · drag orbit · U unlit · T toon',
});
