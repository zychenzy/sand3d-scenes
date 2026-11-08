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
  const woodL = toon(s.woodLight);
  const ceilMat = toon(s.ceilingColor);

  const floor = new THREE.Mesh(new THREE.BoxGeometry(W, 0.08, D), floorMat);
  floor.position.y = -0.04;
  floor.receiveShadow = true;
  g.add(floor);
  // tatami-ish strips
  for (let i = -3; i <= 3; i++) {
    addBox(g, W - 0.5, 0.004, 0.03, toon('#c4a574'), 0, 0.002, i * 0.95);
  }

  const back = new THREE.Mesh(new THREE.BoxGeometry(W, H, 0.12), wallMat);
  back.position.set(0, H / 2, -D / 2);
  back.receiveShadow = true;
  g.add(back);
  const left = new THREE.Mesh(new THREE.BoxGeometry(0.12, H, D), wallMat);
  left.position.set(-W / 2, H / 2, 0);
  left.receiveShadow = true;
  g.add(left);

  // dark wood wainscot
  addBox(g, W - 0.3, 0.92, 0.06, wood, 0, 0.46, -D / 2 + 0.1);
  addBox(g, 0.06, 0.92, D - 0.3, wood, -W / 2 + 0.1, 0.46, 0);

  // noren / brand band
  addBox(g, 3.2, 0.55, 0.04, accent, -0.4, 2.35, -D / 2 + 0.1);
  addBox(g, 3.0, 0.08, 0.05, woodL, -0.4, 2.62, -D / 2 + 0.12);

  // window on back right
  const glass = toon(s.windowTint, { transparent: true, opacity: 0.45, side: THREE.DoubleSide });
  addBox(g, 3.4, 1.25, 0.05, glass, 2.2, 1.85, -D / 2 + 0.08);
  addBox(g, 3.5, 0.07, 0.22, woodL, 2.2, 1.18, -D / 2 + 0.22);

  const ceil = new THREE.Mesh(new THREE.BoxGeometry(W * 0.9, 0.08, D * 0.62), ceilMat);
  ceil.position.set(-0.15, H - 0.04, -D * 0.18);
  g.add(ceil);
  return g;
}

function makeProcedural(layout) {
  const g = new THREE.Group();
  g.name = 'procedural';
  const s = layout.shell;
  const wood = toon(s.woodColor);
  const woodL = toon(s.woodLight);
  const accent = toon(s.accentColor);
  const slate = toon('#2b2420');
  const cream = toon('#f3ead8');
  const ceramic = toon('#f4f0e8');

  // sushi / service counter (not a cafe bar clone): lower, darker wood, open kitchen strip
  addBox(g, 4.4, 0.92, 0.72, wood, -0.35, 0.46, -2.55);
  addBox(g, 4.4, 0.05, 0.78, woodL, -0.35, 0.94, -2.55);
  addBox(g, 4.2, 0.04, 0.55, toon('#1f1a16'), -0.35, 0.97, -2.62); // dark service inlay
  // plate stacks
  for (let i = 0; i < 5; i++) {
    addCyl(g, 0.09, 0.09, 0.02, ceramic, -1.7 + i * 0.18, 1.02, -2.45, 14);
    addCyl(g, 0.08, 0.08, 0.02, ceramic, -1.7 + i * 0.18, 1.04, -2.45, 14);
  }
  // soy bottles
  for (const x of [0.55, 0.72, 0.9]) {
    addCyl(g, 0.03, 0.035, 0.16, toon('#1a120e'), x, 1.08, -2.42, 8);
  }

  // vertical menu (not chalkboard cafe)
  addBox(g, 0.55, 1.5, 0.05, slate, 2.55, 2.05, -3.38);
  for (let r = 0; r < 8; r++) addBox(g, 0.38, 0.035, 0.02, cream, 2.55, 2.55 - r * 0.14, -3.34);

  // paper lanterns over booth island + table zone
  for (const [x, z] of [[-3.17, 1.22], [-0.63, 1.22], [-3.17, -0.88], [-0.63, -0.88], [2.55, 1.45], [2.55, -1.15]]) {
    addCyl(g, 0.14, 0.14, 0.28, toon('#e8c56b'), x, 2.35, z, 14);
    addCyl(g, 0.02, 0.02, 0.2, toon('#3a2a1a'), x, 2.55, z, 8);
  }
  return g;
}

boot({
  makeShell,
  makeProcedural,
  readyText: 'ready — Japanese restaurant · drag orbit · U unlit · T toon',
});
