import * as THREE from 'three';
import { boot, toon, addBox, addCyl, makeCutawayShell } from './scene_lib.js';

function makeShell(layout) {
  const g = makeCutawayShell(layout, {
    wainscotH: 1.05,
    carpet: { w: 5.4, d: 4.2, x: 0, z: -0.2 },
  });
  const { width: W, depth: D } = layout.meta.room;
  addBox(g, W - 0.4, 0.08, 0.08, toon(layout.shell.woodColor), 0, 2.35, -D / 2 + 0.12);
  return g;
}

function cue(g, x, y, z, lean = 0.12) {
  const grp = new THREE.Group();
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.018, 1.45, 8), toon('#e0c090'));
  shaft.position.y = 0.72;
  grp.add(shaft);
  const tip = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.012, 0.08, 8), toon('#d8d0c4'));
  tip.position.y = 1.48;
  grp.add(tip);
  grp.position.set(x, y, z);
  grp.rotation.z = lean;
  grp.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  g.add(grp);
}

function makeProcedural(layout) {
  const g = new THREE.Group();
  g.name = 'procedural';
  const wood = toon('#6a4224');
  // floor-standing cue rack, right of table — readable from default cam
  addBox(g, 0.22, 0.08, 0.55, wood, 3.15, 0.06, -1.35);
  addBox(g, 0.06, 1.15, 0.55, wood, 3.22, 0.62, -1.35);
  addBox(g, 0.16, 0.05, 0.5, wood, 3.12, 1.12, -1.35);
  for (let i = 0; i < 5; i++) cue(g, 3.08, 0, -1.55 + i * 0.1, 0.08 + i * 0.015);
  // wall rack leftover as backup identity
  addBox(g, 0.08, 1.2, 0.5, wood, -4.2, 1.2, -1.65);
  for (let i = 0; i < 3; i++) addCyl(g, 0.014, 0.018, 1.35, toon('#e0c090'), -4.08, 1.1, -1.82 + i * 0.12, 6);
  addBox(g, 1.9, 0.1, 0.5, toon('#3a6a40'), 0, 2.32, -0.35);
  addCyl(g, 0.045, 0.045, 0.22, toon('#c4a050'), 0, 2.48, -0.35, 8);
  return g;
}

boot({
  makeShell,
  makeProcedural,
  readyText: 'ready — billiards lounge · drag orbit · U unlit · T toon',
});
