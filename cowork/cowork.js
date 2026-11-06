import * as THREE from 'three';
import { boot, toon, addBox, addCyl, makeCutawayShell } from './scene_lib.js';

function makeShell(layout) {
  const g = makeCutawayShell(layout, { wainscotH: 0.72 });
  const { width: W, depth: D, height: H } = layout.meta.room;
  const s = layout.shell;
  const metal = toon('#6a7278');
  const pin = toon('#d8c8a8');
  addBox(g, 0.04, 1.15, 1.8, pin, -W / 2 + 0.12, 1.85, 1.35);
  addBox(g, 1.6, 0.06, 0.08, metal, 0, 0.55, -D / 2 + 0.18);
  addBox(g, W * 0.7, 0.04, 0.05, metal, 0, H - 0.22, -1.4);
  for (let i = -3; i <= 3; i++) addBox(g, W - 0.5, 0.003, 0.02, toon('#b8c0c8'), 0, 0.002, i * 0.85);
  return g;
}

function makeProcedural(layout) {
  const g = new THREE.Group();
  g.name = 'procedural';
  const cable = toon('#2a2a2e');
  // desk cable drops (layout desks at z=-0.7 and z=1.15, x=-2.6,-0.9,0.9,2.6)
  for (const z of [-0.7, 1.15]) {
    for (const x of [-2.6, -0.9, 0.9, 2.6]) {
      addBox(g, 0.04, 0.02, 0.18, cable, x + 0.22, 0.77, z - 0.12);
    }
  }
  return g;
}

boot({
  makeShell,
  makeProcedural,
  readyText: 'ready — cowork / study · drag orbit · U unlit · T toon',
});
