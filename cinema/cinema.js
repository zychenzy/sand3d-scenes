import * as THREE from 'three';
import { boot, toon, addBox, addCyl, makeCutawayShell } from './scene_lib.js';

function makeShell(layout) {
  const g = makeCutawayShell(layout, {
    carpet: { w: layout.meta.room.width - 0.6, d: layout.meta.room.depth - 0.5, x: 0, z: 0.1 },
    ceilingW: layout.meta.room.width * 0.92,
    ceilingD: layout.meta.room.depth * 0.78,
    ceilingZ: -0.15,
  });
  const { width: W, depth: D, height: H } = layout.meta.room;
  const s = layout.shell;
  const dark = toon('#1a1216');
  const accent = toon(s.accentColor);
  const gold = toon('#c4a06a');
  // proscenium / screen wall
  addBox(g, 5.4, 2.55, 0.08, dark, 0, 1.55, -D / 2 + 0.16);
  addBox(g, 5.55, 0.1, 0.12, gold, 0, 2.86, -D / 2 + 0.2);
  addBox(g, 0.12, 2.55, 0.12, gold, -2.7, 1.55, -D / 2 + 0.2);
  addBox(g, 0.12, 2.55, 0.12, gold, 2.7, 1.55, -D / 2 + 0.2);
  // curtains
  addBox(g, 0.55, 2.4, 0.06, accent, -2.35, 1.5, -D / 2 + 0.22);
  addBox(g, 0.55, 2.4, 0.06, accent, 2.35, 1.5, -D / 2 + 0.22);
  // aisle lights
  for (const z of [-1.2, 0.2, 1.6, 2.9]) {
    addCyl(g, 0.04, 0.04, 0.03, toon('#e8c48a'), -3.15, 0.04, z, 8);
    addCyl(g, 0.04, 0.04, 0.03, toon('#e8c48a'), 3.15, 0.04, z, 8);
  }
  // exit plaque
  addBox(g, 0.45, 0.16, 0.04, toon('#2a6a3a'), -W / 2 + 0.12, 2.35, 2.4);
  return g;
}

function makeProcedural(layout) {
  const g = new THREE.Group();
  g.name = 'procedural';
  const { depth: D } = layout.meta.room;
  // projection surface
  addBox(g, 4.15, 2.15, 0.04, toon('#1c181c'), 0, 1.55, -D / 2 + 0.2);
  addBox(g, 3.95, 1.95, 0.03, toon('#5a5470'), 0, 1.55, -D / 2 + 0.23);
  addBox(g, 3.55, 1.55, 0.02, toon('#7a7490'), 0, 1.55, -D / 2 + 0.25);
  // slight risers under rear rows (row1 z=1.05, row2 z=2.45)
  addBox(g, 5.2, 0.1, 1.15, toon('#322830'), 0, 0.05, 1.05);
  addBox(g, 5.2, 0.2, 1.15, toon('#322830'), 0, 0.1, 2.45);
  return g;
}

boot({
  makeShell,
  makeProcedural,
  readyText: 'ready — small cinema · drag orbit · U unlit · T toon',
});
