import * as THREE from 'three';
import { boot, toon, addBox } from './scene_lib.js';
import { buildInstances, INNER, WALL_T } from './placement.js';
import { buildProcedural, plankMaterial } from './games.js';

function makeShell(layout) {
  const g = new THREE.Group();
  g.name = 'shell';
  const { width: W, depth: D, height: H } = layout.meta.room;
  const s = layout.shell;
  const floor = new THREE.Mesh(new THREE.BoxGeometry(W, 0.08, D), plankMaterial());
  floor.position.y = -0.04;
  floor.receiveShadow = true;
  g.add(floor);

  const wallMat = toon(s.wallColor);
  const wood = toon(s.woodColor);
  const wine = toon(s.accentColor);
  const ceilMat = toon(s.ceilingColor);
  const glass = toon(s.windowTint, { transparent: true, opacity: 0.42, side: THREE.DoubleSide });

  const back = new THREE.Mesh(new THREE.BoxGeometry(W, H, WALL_T), wallMat);
  back.position.set(0, H / 2, -D / 2);
  back.receiveShadow = true;
  g.add(back);
  const left = new THREE.Mesh(new THREE.BoxGeometry(WALL_T, H, D), wallMat);
  left.position.set(-W / 2, H / 2, 0);
  left.receiveShadow = true;
  g.add(left);

  addBox(g, W - 0.2, 0.1, 0.04, wood, 0, 0.05, INNER.backZ + 0.01);
  addBox(g, 0.04, 0.1, D - 0.2, wood, INNER.leftX + 0.01, 0.05, 0);

  addBox(g, W - 0.25, 0.92, 0.05, wine, 0, 0.5, INNER.backZ + 0.02);
  addBox(g, 0.05, 0.92, D - 0.35, wine, INNER.leftX + 0.02, 0.5, 0.05);
  addBox(g, W - 0.3, 0.05, 0.04, wood, 0, 2.42, INNER.backZ + 0.025);
  addBox(g, 0.04, 0.05, D - 0.4, wood, INNER.leftX + 0.025, 2.42, 0.15);

  const winW = W * 0.42;
  const win = addBox(g, winW, 0.46, 0.03, glass, 2.55, 2.82, INNER.backZ + 0.03);
  win.userData.castShadow = false;
  for (let x = 1.55; x < 3.7; x += 0.7) {
    addBox(g, 0.045, 0.46, 0.05, wood, x, 2.82, INNER.backZ + 0.04);
  }
  addBox(g, winW, 0.05, 0.06, wood, 2.55, 3.06, INNER.backZ + 0.04);
  addBox(g, winW, 0.05, 0.06, wood, 2.55, 2.58, INNER.backZ + 0.04);

  const ceil = new THREE.Mesh(new THREE.BoxGeometry(W - 0.15, 0.08, 6.2), ceilMat);
  ceil.position.set(0, 3.1, -0.7);
  g.add(ceil);
  for (const z of [-2.55, -0.55, 0.95, 2.35]) {
    addBox(g, W - 0.4, 0.14, 0.12, wood, 0, 2.98, z);
  }
  return g;
}

function decoratePrototype(kind, prepared) {
  if (kind !== 'pendant_lamp') return;
  prepared.traverse((obj) => {
    if (!obj.isMesh) return;
    const n = `${obj.name || ''} ${obj.parent?.name || ''}`.toLowerCase();
    if (!n.includes('bulb') && !n.includes('light_tube')) return;
    const src = Array.isArray(obj.material) ? obj.material[0] : obj.material;
    const m = src.clone();
    m.color = new THREE.Color('#ffe2b0');
    m.emissive = new THREE.Color('#ffb15a');
    m.emissiveIntensity = 1.5;
    obj.material = m;
  });
}

window.__ready = boot({
  makeShell,
  makeProcedural: () => buildProcedural(),
  instances: buildInstances(),
  decoratePrototype,
  readyText: 'ready — the night board · drag orbit · U unlit · T toon',
}).catch((err) => {
  console.error(err);
  const el = document.getElementById('status');
  if (el) el.textContent = `error — ${err.message}`;
  throw err;
});
