import * as THREE from 'three';
import { boot, toon, addBox, addCyl, makeCutawayShell } from './scene_lib.js';

function makeShell(layout) {
  const g = makeCutawayShell(layout, { wainscotH: 0.2 });
  const { width: W, depth: D, height: H } = layout.meta.room;
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
  addBox(g, 1.4, 0.12, 0.22, keys, x, 0.74, z + 0.18);
  for (let i = 0; i < 10; i++) addBox(g, 0.04, 0.08, 0.12, black, x - 0.55 + i * 0.12, 0.79, z + 0.14);
  addBox(g, 1.45, 0.04, 0.55, body, x, 0.95, z); // lid
}

function guitar(g, x, z, rotY) {
  const grp = new THREE.Group();
  const wood = toon('#8a5a32');
  const dark = toon('#3a2a20');
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.2, 0.08, 14), wood);
  body.rotation.x = Math.PI / 2;
  body.position.set(0, 0.55, 0);
  grp.add(body);
  const neck = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.55, 0.05), dark);
  neck.position.set(0, 0.95, 0);
  grp.add(neck);
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.12, 0.04), wood);
  head.position.set(0, 1.26, 0);
  grp.add(head);
  grp.position.set(x, 0, z);
  grp.rotation.y = rotY;
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
  guitar(g, 2.45, -1.55, 0.45);
  stand(g, -2.55, -1.35);
  stand(g, 2.65, -0.55);
  return g;
}

boot({
  makeShell,
  makeProcedural,
  readyText: 'ready — music rehearsal · drag orbit · U unlit · T toon',
});
