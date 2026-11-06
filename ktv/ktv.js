import * as THREE from 'three';
import { boot, toon, addBox, addCyl } from './scene_lib.js';

function makeShell(layout) {
  const g = new THREE.Group();
  g.name = 'shell';
  const { width: W, depth: D, height: H } = layout.meta.room;
  const s = layout.shell;
  const floorMat = toon(s.floorColor);
  const wallMat = toon(s.wallColor);
  const accent = toon(s.accentColor);
  const wood = toon(s.woodColor);
  const ceilMat = toon(s.ceilingColor);
  const carpet = toon(s.carpetColor);

  const floor = new THREE.Mesh(new THREE.BoxGeometry(W, 0.08, D), floorMat);
  floor.position.y = -0.04;
  floor.receiveShadow = true;
  g.add(floor);
  addBox(g, W - 1.2, 0.02, D - 1.1, carpet, 0.1, 0.01, 0.15);

  const back = new THREE.Mesh(new THREE.BoxGeometry(W, H, 0.12), wallMat);
  back.position.set(0, H / 2, -D / 2);
  back.receiveShadow = true;
  g.add(back);
  const left = new THREE.Mesh(new THREE.BoxGeometry(0.12, H, D), wallMat);
  left.position.set(-W / 2, H / 2, 0);
  left.receiveShadow = true;
  g.add(left);

  // padded wall panels
  for (let i = 0; i < 5; i++) {
    addBox(g, 1.15, 1.7, 0.06, accent, -2.15 + i * 1.22, 1.45, -D / 2 + 0.1);
  }
  addBox(g, 0.06, 1.7, D - 0.6, accent, -W / 2 + 0.1, 1.45, 0);

  // TV wall niche
  addBox(g, 2.4, 1.45, 0.08, toon('#1a1218'), 0.15, 1.7, -D / 2 + 0.14);

  const ceil = new THREE.Mesh(new THREE.BoxGeometry(W * 0.92, 0.08, D * 0.7), ceilMat);
  ceil.position.set(0, H - 0.04, -0.2);
  g.add(ceil);
  // cove lighting strip
  addBox(g, W * 0.7, 0.04, 0.06, toon('#e8b4d4'), 0, H - 0.16, -D / 2 + 0.5);
  return g;
}

function makeProcedural(layout) {
  const g = new THREE.Group();
  g.name = 'procedural';
  const wood = toon(layout.shell.woodColor);
  const metal = toon('#4a4a52');
  const glow = toon('#f2c6e0');
  // drink shelf
  addBox(g, 1.1, 0.04, 0.28, wood, -2.55, 1.05, -2.15);
  for (const x of [-2.8, -2.62, -2.44, -2.26]) {
    addCyl(g, 0.035, 0.04, 0.22, toon('#6b2148'), x, 1.18, -2.15, 8);
  }
  // mic stand-ins on table later via cups; two handheld mics
  function mic(x, z) {
    addCyl(g, 0.012, 0.012, 0.22, metal, x, 0.58, z, 8);
    addCyl(g, 0.03, 0.025, 0.08, toon('#2a2a30'), x, 0.72, z, 10);
  }
  mic(-0.15, 0.15);
  mic(0.25, -0.05);
  // stage-ish LED kick
  addBox(g, 2.2, 0.06, 0.12, glow, 0.1, 0.04, -2.05);
  return g;
}

boot({
  makeShell,
  makeProcedural,
  readyText: 'ready — KTV room · drag orbit · U unlit · T toon',
});
