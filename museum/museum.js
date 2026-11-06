import * as THREE from 'three';
import { boot, toon, addBox, addCyl } from './scene_lib.js';

function framedWork(g, x, y, z, rotY, w, h, color) {
  const frame = toon('#2a2420');
  const canvas = toon(color);
  const grp = new THREE.Group();
  const f = new THREE.Mesh(new THREE.BoxGeometry(w + 0.08, h + 0.08, 0.04), frame);
  f.position.set(0, 0, 0);
  grp.add(f);
  const c = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.03), canvas);
  c.position.set(0, 0, 0.025);
  grp.add(c);
  grp.position.set(x, y, z);
  grp.rotation.y = rotY;
  grp.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  g.add(grp);
}

function makeShell(layout) {
  const g = new THREE.Group();
  g.name = 'shell';
  const { width: W, depth: D, height: H } = layout.meta.room;
  const s = layout.shell;
  const floorMat = toon(s.floorColor);
  const wallMat = toon(s.wallColor);
  const wood = toon(s.woodColor);
  const ceilMat = toon(s.ceilingColor);
  const frame = toon('#2a2a2a');

  const floor = new THREE.Mesh(new THREE.BoxGeometry(W, 0.08, D), floorMat);
  floor.position.y = -0.04;
  floor.receiveShadow = true;
  g.add(floor);
  // stone grid
  for (let i = -5; i <= 5; i++) {
    addBox(g, W - 0.4, 0.004, 0.02, toon('#8a847c'), 0, 0.002, i * 0.85);
  }

  const back = new THREE.Mesh(new THREE.BoxGeometry(W, H, 0.14), wallMat);
  back.position.set(0, H / 2, -D / 2);
  back.receiveShadow = true;
  g.add(back);
  const left = new THREE.Mesh(new THREE.BoxGeometry(0.14, H, D), wallMat);
  left.position.set(-W / 2, H / 2, 0);
  left.receiveShadow = true;
  g.add(left);

  // high picture rail
  addBox(g, W - 0.4, 0.05, 0.06, wood, 0, 3.15, -D / 2 + 0.12);
  addBox(g, 0.06, 0.05, D - 0.4, wood, -W / 2 + 0.12, 3.15, 0);

  const ceil = new THREE.Mesh(new THREE.BoxGeometry(W * 0.88, 0.1, D * 0.7), ceilMat);
  ceil.position.set(-0.1, H - 0.05, -D * 0.12);
  g.add(ceil);

  // track lights
  addBox(g, 6.5, 0.04, 0.05, frame, 0, H - 0.22, -2.4);
  addBox(g, 0.05, 0.04, 5.5, frame, -3.4, H - 0.22, 0.2);
  for (const x of [-2.4, -0.8, 0.8, 2.4]) {
    addCyl(g, 0.06, 0.08, 0.1, frame, x, H - 0.32, -2.4, 10);
    addCyl(g, 0.05, 0.05, 0.04, toon('#f5ead0'), x, H - 0.38, -2.4, 10);
  }
  return g;
}

function makeProcedural(layout) {
  const g = new THREE.Group();
  g.name = 'procedural';
  const s = layout.shell;
  // hanging works — empty-ish gallery, few large pieces
  framedWork(g, -2.6, 2.15, -layout.meta.room.depth / 2 + 0.12, 0, 1.6, 1.15, '#6b4a32');
  framedWork(g, 0.15, 2.2, -layout.meta.room.depth / 2 + 0.12, 0, 1.35, 1.35, '#2f3d4a');
  framedWork(g, 2.7, 2.05, -layout.meta.room.depth / 2 + 0.12, 0, 1.15, 0.95, '#8a5a3a');
  framedWork(g, -layout.meta.room.width / 2 + 0.12, 2.1, -0.4, Math.PI / 2, 1.4, 1.05, '#3d4a38');
  framedWork(g, -layout.meta.room.width / 2 + 0.12, 2.0, 2.2, Math.PI / 2, 1.1, 1.4, '#5a3a42');

  // simple geometric exhibit on a procedural block (HF plinths carry objects conceptually)
  const bronze = toon('#6a5340');
  addCyl(g, 0.12, 0.18, 0.55, bronze, 1.6, 1.55, -0.9, 10);
  addCyl(g, 0.22, 0.16, 0.12, bronze, 1.6, 1.88, -0.9, 12);
  return g;
}

boot({
  makeShell,
  makeProcedural,
  readyText: 'ready — museum gallery · drag orbit · U unlit · T toon',
});
