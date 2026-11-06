import * as THREE from 'three';
import { boot, toon, addBox, addCyl, makeCutawayShell } from './scene_lib.js';

function makeShell(layout) {
  const g = makeCutawayShell(layout, { ceiling: false });
  const { width: W, depth: D, height: H } = layout.meta.room;
  addBox(g, W * 0.9, 0.06, D * 0.68, toon('#f4efe6'), -0.1, H - 0.04, -D * 0.1);
  const wood = toon('#d8cbb0');
  for (let i = -5; i <= 5; i++) addBox(g, W - 0.4, 0.006, 0.1, wood, 0, 0.004, i * 0.58);
  addBox(g, 4.4, 1.9, 0.03, toon('#d8e2e8'), 0.35, 1.55, -D / 2 + 0.12);
  addBox(g, 4.55, 0.05, 0.05, toon(layout.shell.woodColor), 0.35, 2.52, -D / 2 + 0.14);
  addBox(g, 4.55, 0.05, 0.05, toon(layout.shell.woodColor), 0.35, 0.58, -D / 2 + 0.14);
  return g;
}

function makeProcedural(layout) {
  const g = new THREE.Group();
  g.name = 'procedural';
  const mats = ['#c45a4a', '#2f7a68', '#c45a4a', '#2f7a68', '#d4a05a', '#3a5a8a'];
  const xs = [-1.65, 0.05, 1.75];
  const zs = [-0.85, 1.2];
  let k = 0;
  for (const z of zs) {
    for (const x of xs) {
      addBox(g, 0.66, 0.018, 1.52, toon(mats[k++ % mats.length]), x, 0.02, z);
      addBox(g, 0.14, 0.09, 0.22, toon('#efe6d0'), x + 0.18, 0.075, z - 0.55);
    }
  }
  addBox(g, 0.3, 0.2, 0.22, toon('#efe6d0'), -3.25, 0.11, -2.35);
  addBox(g, 0.3, 0.2, 0.22, toon('#efe6d0'), -3.25, 0.31, -2.35);
  return g;
}

boot({
  makeShell,
  makeProcedural,
  readyText: 'ready — yoga / stretch studio · drag orbit · U unlit · T toon',
});
