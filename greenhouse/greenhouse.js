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
  const bed = toon('#6a4a32');
  addBox(g, W - 2.4, 0.16, 0.7, bed, 0.05, 0.09, -D / 2 + 0.62);
  addBox(g, 0.7, 0.16, D - 2.2, bed, -W / 2 + 0.62, 0.09, 0.05);
  return g;
}

function leaf(g, w, h, d, color, x, y, z) {
  addBox(g, w, h, d, toon(color), x, y, z);
}

function plant(g, x, z, kind, color) {
  const stem = toon('#4a5a32');
  if (kind === 'tree') {
    addCyl(g, 0.02, 0.03, 0.55, stem, x, 0.55, z, 8);
    leaf(g, 0.55, 0.38, 0.5, color, x, 1.05, z);
    leaf(g, 0.32, 0.28, 0.3, color, x + 0.14, 1.28, z - 0.08);
    leaf(g, 0.22, 0.18, 0.2, color, x - 0.12, 1.18, z + 0.1);
  } else if (kind === 'bush') {
    addCyl(g, 0.02, 0.025, 0.18, stem, x, 0.42, z, 8);
    addCyl(g, 0.28, 0.32, 0.42, toon(color), x, 0.72, z, 10);
    addCyl(g, 0.18, 0.2, 0.22, toon(color), x + 0.12, 0.88, z - 0.08, 8);
  } else if (kind === 'fern') {
    addCyl(g, 0.015, 0.02, 0.2, stem, x, 0.42, z, 8);
    leaf(g, 0.55, 0.08, 0.22, color, x, 0.62, z);
    leaf(g, 0.48, 0.07, 0.18, color, x, 0.78, z + 0.04);
    leaf(g, 0.38, 0.06, 0.16, color, x + 0.05, 0.92, z - 0.05);
  } else if (kind === 'column') {
    addCyl(g, 0.018, 0.024, 0.7, stem, x, 0.62, z, 8);
    addCyl(g, 0.12, 0.16, 0.7, toon(color), x, 1.15, z, 10);
  } else {
    addCyl(g, 0.018, 0.022, 0.28, stem, x, 0.48, z, 8);
    addCyl(g, 0.16, 0.2, 0.28, toon(color), x, 0.78, z, 10);
    leaf(g, 0.28, 0.12, 0.22, color, x + 0.1, 0.92, z);
  }
}

function makeProcedural(layout) {
  const g = new THREE.Group();
  g.name = 'procedural';
  const greens = ['#2f6a3a', '#3d7a48', '#255a32', '#4a8a52', '#356848', '#2a5a30'];
  const kinds = ['tree', 'bush', 'fern', 'column', 'round', 'tree', 'bush', 'fern', 'column', 'round', 'bush', 'tree', 'fern', 'round'];
  const pots = (layout.instances || []).filter((i) => i.kind === 'flowerpot');
  pots.forEach((p, i) => {
    plant(g, p.position[0], p.position[2], kinds[i % kinds.length], greens[i % greens.length]);
  });
  return g;
}

boot({
  makeShell,
  makeProcedural,
  readyText: 'ready — indoor greenhouse · drag orbit · U unlit · T toon',
});
