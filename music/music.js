import * as THREE from 'three';
import { boot, toon, addBox, addCyl, makeCutawayShell } from './scene_lib.js';

function makeShell(layout) {
  const g = makeCutawayShell(layout, { wainscotH: 0.2 });
  const { width: W, depth: D } = layout.meta.room;
  const foam = toon('#6a5a4a');
  for (let i = 0; i < 6; i++) {
    addBox(g, 0.7, 0.7, 0.08, foam, -2.4 + (i % 3) * 0.85, 1.7 + Math.floor(i / 3) * 0.85, -D / 2 + 0.12);
  }
  addBox(g, 0.08, 0.7, 0.7, foam, -W / 2 + 0.12, 1.7, -0.4);
  addBox(g, 0.08, 0.7, 0.7, foam, -W / 2 + 0.12, 1.7, 0.6);
  return g;
}

function piano(g, x, z) {
  const body = toon('#2a2420');
  const keys = toon('#f4f0e8');
  const black = toon('#1a1a1a');
  addBox(g, 1.45, 0.72, 0.55, body, x, 0.36, z);
  addBox(g, 1.4, 0.12, 0.22, keys, x, 0.74, z + 0.2);
  for (let i = 0; i < 10; i++) addBox(g, 0.04, 0.08, 0.12, black, x - 0.55 + i * 0.12, 0.79, z + 0.16);
  addBox(g, 1.45, 0.05, 0.5, body, x, 1.02, z - 0.02);
  // piano bench tucked at the keyboard
  const seat = toon('#5a4030');
  addBox(g, 1.05, 0.07, 0.32, seat, x, 0.5, z + 0.52);
  addBox(g, 0.06, 0.47, 0.06, seat, x - 0.44, 0.24, z + 0.42);
  addBox(g, 0.06, 0.47, 0.06, seat, x + 0.44, 0.24, z + 0.42);
  addBox(g, 0.06, 0.47, 0.06, seat, x - 0.44, 0.24, z + 0.62);
  addBox(g, 0.06, 0.47, 0.06, seat, x + 0.44, 0.24, z + 0.62);
}

function guitar(g, x, z) {
  const grp = new THREE.Group();
  const wood = toon('#a86a38');
  const dark = toon('#3a2a20');
  const hole = toon('#1a1410');
  const lower = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.22, 0.07, 16), wood);
  lower.rotation.x = Math.PI / 2;
  lower.position.set(0, 0.42, 0);
  grp.add(lower);
  const upper = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.15, 0.06, 16), wood);
  upper.rotation.x = Math.PI / 2;
  upper.position.set(0, 0.68, 0);
  grp.add(upper);
  const waist = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.12, 0.05), wood);
  waist.position.set(0, 0.55, 0);
  grp.add(waist);
  const sound = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.02, 12), hole);
  sound.rotation.x = Math.PI / 2;
  sound.position.set(0, 0.68, 0.03);
  grp.add(sound);
  const neck = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.62, 0.04), dark);
  neck.position.set(0, 1.08, 0);
  grp.add(neck);
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.14, 0.035), wood);
  head.position.set(0, 1.42, 0);
  grp.add(head);
  const peg = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.03, 0.02), dark);
  peg.position.set(0, 1.44, 0);
  grp.add(peg);
  grp.position.set(x, 0.02, z);
  grp.rotation.set(0.15, 0.35, -0.35);
  grp.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  g.add(grp);
}

function stand(g, x, z) {
  const metal = toon('#6a6a70');
  addCyl(g, 0.012, 0.012, 1.15, metal, x, 0.58, z, 8);
  addBox(g, 0.28, 0.01, 0.2, metal, x, 1.18, z + 0.02);
}

function makeProcedural(layout) {
  const g = new THREE.Group();
  g.name = 'procedural';
  piano(g, 0.0, -2.25);
  guitar(g, 2.35, -1.45);
  stand(g, -2.55, -1.35);
  stand(g, 2.55, -0.55);
  return g;
}

boot({
  makeShell,
  makeProcedural,
  readyText: 'ready — music rehearsal · drag orbit · U unlit · T toon',
});
