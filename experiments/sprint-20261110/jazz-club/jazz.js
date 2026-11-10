import * as THREE from 'three';
import { boot, toon, addBox, addCyl } from './scene_lib.js';

function put(parent, mesh) {
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function plankMap() {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 512;
  const g = c.getContext('2d');
  const rows = ['#5a3c2a', '#684632', '#533628', '#61422e', '#4e3426', '#6a4a34', '#573a2c', '#624430'];
  for (let i = 0; i < 8; i++) {
    g.fillStyle = rows[i];
    g.fillRect(0, i * 64, 256, 62);
    g.fillStyle = '#2e1e14';
    g.fillRect(0, i * 64 + 61, 256, 3);
    g.fillStyle = 'rgba(90,60,40,0.35)';
    g.fillRect(40 + (i * 37) % 160, i * 64 + 8, 3, 46);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(4, 6);
  tex.anisotropy = 4;
  return tex;
}

function buildShell(g, layout) {
  const { width: W, depth: D, height: H } = layout.meta.room;
  const s = layout.shell;
  const floorMat = toon('#ffffff', { map: plankMap() });
  const wall = toon(s.wallColor);
  const wood = toon(s.woodColor);
  const ceil = toon(s.ceilingColor);
  const brass = toon(s.brassColor);

  const floor = addBox(g, W, 0.08, D, floorMat, 0, -0.04, 0);
  floor.castShadow = false;

  const back = addBox(g, W, H, 0.16, wall, 0, H / 2, -D / 2);
  const left = addBox(g, 0.16, H, D, wall, -W / 2, H / 2, 0);
  back.castShadow = false;
  left.castShadow = false;

  const stage = layout.meta.stage;
  const cheekEnd = -2.5;
  const cheekDepth = cheekEnd - (-D / 2);
  const cheekZ = (-D / 2 + cheekEnd) / 2;
  const cheek = addBox(g, 0.16, H, cheekDepth, wall, 3.12, H / 2, cheekZ);
  cheek.castShadow = false;

  addBox(g, W - 0.2, 0.92, 0.06, wood, 0, 0.46, -D / 2 + 0.1);
  addBox(g, 0.06, 0.92, D - 0.3, wood, -W / 2 + 0.1, 0.46, 0);
  addBox(g, 0.06, 0.92, cheekDepth - 0.1, wood, 3.02, 0.46, cheekZ);
  addBox(g, W - 0.3, 0.06, 0.08, wood, 0, 0.95, -D / 2 + 0.12);
  addBox(g, 0.08, 0.06, D - 0.4, wood, -W / 2 + 0.12, 0.95, 0);
  addBox(g, W - 0.4, 0.08, 0.1, brass, 0, H - 0.16, -D / 2 + 0.12);
  addBox(g, 0.1, 0.08, D - 0.5, brass, -W / 2 + 0.14, H - 0.16, -0.2);

  const slabD = 5.15;
  const slab = addBox(g, W - 0.5, 0.1, slabD, ceil, -0.15, H - 0.08, -D / 2 + slabD / 2 + 0.05);
  slab.castShadow = false;
  const beamMat = toon('#2a2422');
  for (const z of [1.85, 2.75]) {
    const beam = addBox(g, W - 1.1, 0.12, 0.16, beamMat, -0.2, H - 0.14, z);
    beam.castShadow = false;
  }
  const pipe = put(g, new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 4.4, 8), toon('#1a1818')));
  pipe.rotation.z = Math.PI / 2;
  pipe.position.set(0.15, 3.02, -2.55);

  const runner = addBox(g, 1.02, 0.015, 4.75, toon(s.runnerColor), 0.55, 0.012, 0.8);
  runner.castShadow = false;

  buildStage(g, layout);
  buildDrapes(g, layout);
  buildBar(g, layout);
  buildEntrance(g, layout);
  buildPoster(g, layout);
}

function buildStage(g, layout) {
  const s = layout.shell;
  const st = layout.meta.stage;
  const w = st.x1 - st.x0;
  const d = st.z1 - st.z0;
  const cx = (st.x0 + st.x1) / 2;
  const cz = (st.z0 + st.z1) / 2;
  const wood = toon(s.stageColor);
  const fascia = toon(s.fasciaColor);
  const brass = toon(s.brassColor);
  addBox(g, w, st.h, d, wood, cx, st.h / 2, cz);
  addBox(g, w + 0.04, st.h + 0.01, 0.05, fascia, cx, st.h / 2, st.z1 + 0.01);
  addBox(g, 0.05, st.h + 0.01, d, fascia, st.x0 - 0.01, st.h / 2, cz);
  addBox(g, 0.05, st.h + 0.01, d, fascia, st.x1 + 0.01, st.h / 2, cz);
  addBox(g, w, 0.025, 0.04, brass, cx, st.h + 0.01, st.z1 + 0.01);
  for (let i = 0; i < 6; i++) {
    const z = st.z0 + 0.18 + i * (d - 0.3) / 5;
    const seam = addBox(g, w - 0.3, 0.008, 0.015, fascia, cx, st.h + 0.006, z);
    seam.castShadow = false;
  }
  const treads = [
    { h: 0.24, z: st.z1 + 0.14, d: 0.38 },
    { h: 0.12, z: st.z1 + 0.48, d: 0.34 },
  ];
  for (const t of treads) {
    addBox(g, 0.92, t.h, t.d, wood, 1.15, t.h / 2, t.z);
    addBox(g, 0.92, 0.02, 0.03, brass, 1.15, t.h, t.z + t.d / 2 - 0.01);
  }
  addBox(g, 0.04, 0.24, 0.7, fascia, 1.15 - 0.48, 0.12, st.z1 + 0.32);
  addBox(g, 0.04, 0.24, 0.7, fascia, 1.15 + 0.48, 0.12, st.z1 + 0.32);
}

function curtain(g, x0, x1, y0, y1, z, folds, colorA, colorB) {
  const span = Math.abs(x1 - x0);
  const n = Math.max(4, folds);
  const fw = span / n;
  const deepMat = toon(colorA);
  const lightMat = toon(colorB);
  for (let i = 0; i < n; i++) {
    const deep = i % 2 === 0;
    const depth = deep ? 0.11 : 0.055;
    const wave = deep ? 0.045 : -0.02;
    const x = Math.min(x0, x1) + (i + 0.5) * fw;
    addBox(g, fw * 0.92, y1 - y0, depth, deep ? deepMat : lightMat, x, (y0 + y1) / 2, z + wave);
  }
}

function buildDrapes(g, layout) {
  const { width: W, depth: D, height: H } = layout.meta.room;
  const s = layout.shell;
  const st = layout.meta.stage;
  const rod = toon('#2a2424');
  curtain(g, -W / 2 + 0.25, W / 2 - 0.35, 0.08, H - 0.22, -D / 2 + 0.16, 34, s.drapeDeep, s.drapeColor);
  const rodMesh = addCyl(g, 0.025, 0.025, W - 0.7, rod, -0.05, H - 0.2, -D / 2 + 0.12, 8);
  rodMesh.rotation.z = Math.PI / 2;

  const z0 = -4.05;
  const z1 = -1.55;
  const folds = 10;
  const fw = (z1 - z0) / folds;
  for (let i = 0; i < folds; i++) {
    const deep = i % 2 === 0;
    addBox(
      g,
      deep ? 0.1 : 0.05,
      H - 0.45,
      fw * 0.9,
      toon(deep ? s.drapeDeep : s.drapeColor),
      -W / 2 + 0.2 + (deep ? 0.04 : 0),
      (H - 0.45) / 2 + 0.12,
      z0 + (i + 0.5) * fw,
    );
  }

  const legH = H - 0.2;
  addBox(g, 0.42, legH, 0.16, toon(s.drapeDeep), st.x0 + 0.08, legH / 2, st.z1 + 0.02);
  // Stage-left tormentor sits on the audience's right, in front of the default camera.
  // Keep it, but narrow it and set it back off the lip so the deck stays visible.
  addBox(g, 0.16, legH, 0.08, toon(s.drapeColor), st.x1 + 0.1, legH / 2, st.z1 - 0.72);
  for (let i = 0; i < 2; i++) {
    addBox(g, 0.18, legH, 0.08, toon(i ? s.drapeColor : s.drapeDeep), st.x0 + 0.22 + i * 0.1, legH / 2, st.z1 + 0.08);
    addBox(g, 0.08, legH, 0.05, toon(i ? s.drapeDeep : s.drapeColor), st.x1 + 0.02 - i * 0.06, legH / 2, st.z1 - 0.5 - i * 0.1);
  }

  const vx0 = st.x0 + 0.1;
  const vx1 = st.x1 - 0.05;
  const vn = 14;
  const vw = (vx1 - vx0) / vn;
  for (let i = 0; i < vn; i++) {
    const h = 0.42 + (i % 3) * 0.08;
    addBox(g, vw * 0.94, h, 0.1, toon(i % 2 ? s.drapeColor : s.drapeDeep), vx0 + (i + 0.5) * vw, H - 0.18 - h / 2, st.z1 - 0.02);
  }

  const cheekFolds = 5;
  for (let i = 0; i < cheekFolds; i++) {
    const z = -3.95 + i * 0.28;
    const deep = i % 2 === 0;
    addBox(g, deep ? 0.1 : 0.05, H - 0.5, 0.26, toon(deep ? s.drapeDeep : s.drapeColor), 3.0, (H - 0.5) / 2 + 0.1, z);
  }
}

function buildBar(g, layout) {
  const bar = layout.meta.bar;
  const s = layout.shell;
  const top = toon('#5c3b28');
  const body = toon('#3a241c');
  const inset = toon('#241610');
  const brass = toon(s.brassColor);
  const frontX = bar.x + bar.depth / 2;
  addBox(g, bar.depth, bar.height - 0.06, bar.length - 0.06, body, bar.x, (bar.height - 0.06) / 2, bar.z);
  addBox(g, bar.depth + 0.08, 0.07, bar.length, top, bar.x + 0.02, bar.height - 0.02, bar.z);
  const n = 5;
  for (let i = 0; i < n; i++) {
    const z = bar.z - bar.length / 2 + 0.38 + i * ((bar.length - 0.55) / (n - 1));
    addBox(g, 0.025, 0.62, 0.46, toon('#4a3026'), frontX - 0.01, 0.46, z);
    addBox(g, 0.018, 0.46, 0.32, inset, frontX + 0.012, 0.46, z);
  }
  const rail = put(g, new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, bar.length - 0.4, 10), brass));
  rail.rotation.x = Math.PI / 2;
  rail.position.set(frontX + 0.16, 0.24, bar.z);
  for (let i = 0; i < 4; i++) {
    const z = bar.z - 1.2 + i * 0.8;
    addBox(g, 0.16, 0.025, 0.025, brass, frontX + 0.08, 0.24, z);
  }
  const glow = addBox(g, 0.02, 0.02, bar.length - 0.3, toon('#ffb36a', { emissive: '#ffb36a', emissiveIntensity: 1.4 }), frontX + 0.02, bar.height - 0.08, bar.z);
  glow.userData.noShadow = true;

  const shelfX = -5.08;
  addBox(g, 0.28, 0.045, 2.5, top, shelfX, 1.38, bar.z);
  addBox(g, 0.28, 0.045, 2.5, top, shelfX, 1.86, bar.z);
  addBox(g, 0.04, 0.78, 2.15, brass, -5.2, 1.62, bar.z);
  const mirror = addBox(g, 0.02, 0.68, 2.05, toon('#1a2830'), -5.18, 1.62, bar.z);
  mirror.castShadow = false;

  const bottleColors = ['#c47a32', '#2e5a3c', '#6e2430', '#d8c49a', '#1e3c4a', '#8a3e22', '#c4a15a', '#3a4a32'];
  for (let i = 0; i < 8; i++) {
    const z = bar.z - 1.05 + i * 0.3;
    const h = 0.26 + (i % 3) * 0.05;
    bottle(g, shelfX + 0.02, 1.4, z, h, bottleColors[i % bottleColors.length]);
  }
  for (let i = 0; i < 6; i++) {
    const z = bar.z - 0.75 + i * 0.3;
    bottle(g, shelfX + 0.02, 1.885, z, 0.22 + (i % 2) * 0.04, bottleColors[(i + 3) % bottleColors.length]);
  }

  for (let i = 0; i < 4; i++) {
    const z = bar.z - 1.1 + i * 0.7;
    glass(g, frontX - 0.12, bar.height + 0.005, z, 0.09, i % 2 ? '#d8a15a' : '#e6d2b0');
  }
  bottle(g, bar.x + 0.05, bar.height + 0.005, bar.z + 0.4, 0.28, '#6e2430');
  addCyl(g, 0.045, 0.05, 0.16, toon('#c0c4c8'), bar.x - 0.08, bar.height + 0.08, bar.z - 0.55, 10);
  addBox(g, 0.16, 0.012, 0.22, toon('#1c1814'), bar.x + 0.02, bar.height + 0.04, bar.z + 1.15);
}

function bottle(g, x, y, z, h, color) {
  addCyl(g, h * 0.11, h * 0.13, h * 0.72, toon(color), x, y + h * 0.36, z, 8);
  addCyl(g, h * 0.035, h * 0.045, h * 0.28, toon('#2a241c'), x, y + h * 0.86, z, 6);
}

function glass(g, x, y, z, h, color) {
  const m = addCyl(g, h * 0.42, h * 0.36, h, toon(color), x, y + h / 2, z, 10);
  return m;
}

function buildEntrance(g, layout) {
  const s = layout.shell;
  const wood = toon(s.woodColor);
  const brass = toon(s.brassColor);
  const top = toon('#5c3b28');
  addBox(g, 0.46, 1.02, 0.38, wood, -3.55, 0.51, 3.38);
  addBox(g, 0.52, 0.04, 0.44, top, -3.55, 1.04, 3.38);
  const lamp = addCyl(g, 0.06, 0.08, 0.1, toon('#ffd7a8', { emissive: '#ffb56a', emissiveIntensity: 1.6 }), -3.55, 1.14, 3.38, 10);
  lamp.userData.noShadow = true;
  addBox(g, 0.18, 0.02, 0.24, toon('#1a120e'), -3.55, 1.06, 3.32);

  const rail = put(g, new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.7, 8), brass));
  rail.rotation.x = Math.PI / 2;
  rail.position.set(-5.12, 1.55, 3.35);
  for (let i = 0; i < 3; i++) {
    addBox(g, 0.04, 0.08, 0.04, brass, -5.08, 1.5, 3.15 + i * 0.22);
  }
  const mat = addBox(g, 0.9, 0.012, 1.15, toon('#3a2428'), -1.35, 0.01, 3.55);
  mat.castShadow = false;
}

function buildPoster(g, layout) {
  const s = layout.shell;
  const frame = toon(s.brassColor);
  const paper = toon('#1c1416');
  addBox(g, 0.04, 0.7, 0.5, frame, 2.98, 1.75, -3.15);
  addBox(g, 0.02, 0.58, 0.38, paper, 2.95, 1.75, -3.15);
  const horn = put(g, new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.22, 8), toon(s.brassColor)));
  horn.rotation.z = Math.PI / 2;
  horn.position.set(2.93, 1.75, -3.15);
  addBox(g, 0.04, 0.55, 0.4, frame, -5.12, 1.7, -1.15);
  addBox(g, 0.02, 0.44, 0.3, paper, -5.08, 1.7, -1.15);
}

function grandOutline() {
  const spine = 0.5;
  const bent = 0.58;
  const length = 1.42;
  const sh = new THREE.Shape();
  sh.moveTo(-spine, 0);
  sh.lineTo(bent, 0);
  sh.lineTo(bent, 0.26);
  sh.bezierCurveTo(bent + 0.02, length * 0.52, bent * 0.42, length * 0.9, 0.02, length);
  sh.bezierCurveTo(-spine * 0.2, length * 1.045, -spine, length * 0.78, -spine, length * 0.6);
  sh.lineTo(-spine, 0);
  return { shape: sh, spine, bent, length };
}

function flatGrand(shape, thickness) {
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: thickness,
    bevelEnabled: false,
    curveSegments: 12,
  });
  geo.rotateX(-Math.PI / 2);
  return geo;
}

function grandPiano(parent, x, y, z, rotY) {
  const grp = new THREE.Group();
  grp.name = 'piano';
  const black = toon('#2a2624', { side: THREE.DoubleSide });
  const gold = toon('#c4a15a');
  const ivory = toon('#f3efe4');
  const ebony = toon('#161616');
  const { shape, spine, length } = grandOutline();
  const caseH = 0.22;
  const caseY = 0.62;

  const rim = put(grp, new THREE.Mesh(flatGrand(shape, caseH), black));
  rim.position.set(0, caseY, 0.02);

  const board = put(grp, new THREE.Mesh(new THREE.BoxGeometry(0.78, 0.018, 0.92), toon('#6a4530')));
  board.position.set(0.0, caseY + 0.08, -0.58);
  const plate = put(grp, new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.012, 0.62), gold));
  plate.position.set(0.06, caseY + 0.1, -0.62);
  for (let i = 0; i < 6; i++) {
    const string = put(grp, new THREE.Mesh(new THREE.BoxGeometry(0.004, 0.004, 0.78), toon('#e4dcc8')));
    string.position.set(-0.08 + i * 0.045, caseY + 0.112, -0.55);
  }

  const keybed = put(grp, new THREE.Mesh(new THREE.BoxGeometry(1.12, 0.07, 0.32), black));
  keybed.position.set(0.02, caseY + 0.02, 0.08);
  const keys = put(grp, new THREE.Mesh(new THREE.BoxGeometry(1.04, 0.028, 0.2), ivory));
  keys.position.set(0.02, caseY + caseH + 0.01, 0.14);
  for (let i = 0; i < 14; i++) {
    if (i % 7 === 2 || i % 7 === 6) continue;
    const bk = put(grp, new THREE.Mesh(new THREE.BoxGeometry(0.038, 0.022, 0.1), ebony));
    bk.position.set(-0.44 + i * 0.072, caseY + caseH + 0.03, 0.09);
  }
  put(grp, new THREE.Mesh(new THREE.BoxGeometry(0.06, caseH, 0.16), black)).position.set(-spine + 0.03, caseY + caseH / 2, 0.06);
  put(grp, new THREE.Mesh(new THREE.BoxGeometry(0.06, caseH, 0.16), black)).position.set(0.52, caseY + caseH / 2, 0.06);

  const lidPivot = new THREE.Group();
  lidPivot.position.set(-spine, caseY + caseH, 0.02);
  lidPivot.rotation.z = 1.05;
  const lid = put(lidPivot, new THREE.Mesh(flatGrand(shape, 0.016), black));
  lid.position.x = spine;
  grp.add(lidPivot);
  tube(grp, [0.22, caseY + caseH - 0.02, -0.62], [-0.02, caseY + caseH + 0.62, -0.62], 0.008, gold);

  const legGeo = new THREE.CylinderGeometry(0.034, 0.046, caseY, 8);
  for (const p of [[-0.36, -0.06], [0.4, -0.06], [-0.02, -length + 0.16]]) {
    const leg = put(grp, new THREE.Mesh(legGeo, black));
    leg.position.set(p[0], caseY / 2, p[1]);
  }
  const lyre = put(grp, new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.18, 0.04), gold));
  lyre.position.set(0.02, 0.26, 0.1);
  for (let i = 0; i < 3; i++) {
    const pedal = put(grp, new THREE.Mesh(new THREE.BoxGeometry(0.028, 0.014, 0.06), gold));
    pedal.position.set(-0.04 + i * 0.045, 0.14, 0.12);
  }
  const desk = put(grp, new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.14, 0.012), toon('#3a342f')));
  desk.position.set(0.02, caseY + caseH + 0.1, -0.02);
  desk.rotation.x = -0.5;

  grp.position.set(x, y, z);
  grp.rotation.y = rotY;
  parent.add(grp);
}

function doubleBass(parent, x, y, z, rotY) {
  const grp = new THREE.Group();
  grp.name = 'bass';
  const wood = toon('#8a5430');
  const dark = toon('#3a2418');
  const string = toon('#efe6d4');
  const lower = put(grp, new THREE.Mesh(new THREE.SphereGeometry(0.22, 14, 12), wood));
  lower.scale.set(0.72, 1.15, 0.32);
  lower.position.y = 0.62;
  const upper = put(grp, new THREE.Mesh(new THREE.SphereGeometry(0.15, 12, 10), wood));
  upper.scale.set(0.7, 0.95, 0.34);
  upper.position.y = 1.05;
  const neck = put(grp, new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.52, 0.03), dark));
  neck.position.y = 1.48;
  const board = put(grp, new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.7, 0.012), ebonySafe()));
  board.position.set(0, 1.2, 0.055);
  const scroll = put(grp, new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.12, 0.04), dark));
  scroll.position.set(0.02, 1.8, 0);
  scroll.rotation.z = 0.45;
  const peg = put(grp, new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.016, 0.016), dark));
  peg.position.y = 1.84;
  const pin = put(grp, new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.01, 0.14, 6), dark));
  pin.position.y = 0.07;
  for (const sx of [-0.055, 0.055]) {
    const fh = put(grp, new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.16, 0.01), dark));
    fh.position.set(sx, 0.7, 0.07);
  }
  const bridge = put(grp, new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.05, 0.012), dark));
  bridge.position.set(0, 0.58, 0.075);
  for (let i = 0; i < 4; i++) {
    const s = put(grp, new THREE.Mesh(new THREE.CylinderGeometry(0.002, 0.002, 1.2, 4), string));
    s.position.set(-0.018 + i * 0.012, 1.15, 0.08);
  }
  grp.position.set(x, y, z);
  grp.rotation.y = rotY;
  grp.rotation.z = 0.03;
  parent.add(grp);
}

function ebonySafe() {
  return toon('#1a120e');
}

function drumKit(parent, x, y, z, rotY) {
  const grp = new THREE.Group();
  grp.name = 'drums';
  const shell = toon('#241c1a');
  const head = toon('#f4efe4');
  const brass = toon('#e0c070');
  const metal = toon('#c5ccd0');
  const bd = put(grp, new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.34, 18), shell));
  bd.rotation.x = Math.PI / 2;
  bd.position.set(0, 0.26, 0);
  const bdHead = put(grp, new THREE.Mesh(new THREE.CircleGeometry(0.22, 18), head));
  bdHead.position.set(0, 0.26, 0.172);
  const badge = put(grp, new THREE.Mesh(new THREE.CircleGeometry(0.07, 12), toon('#6e3140')));
  badge.position.set(0, 0.26, 0.178);
  badge.userData.noShadow = true;
  const hoop = put(grp, new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.014, 6, 18), brass));
  hoop.position.set(0, 0.26, 0.16);

  const snare = put(grp, new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.1, 14), toon('#eee6d8')));
  snare.position.set(-0.32, 0.68, 0.16);
  const snareHead = put(grp, new THREE.Mesh(new THREE.CircleGeometry(0.15, 14), head));
  snareHead.rotation.x = -Math.PI / 2;
  snareHead.position.set(-0.32, 0.735, 0.16);
  addCyl(grp, 0.012, 0.014, 0.64, metal, -0.32, 0.32, 0.16, 6);
  const tom = put(grp, new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.12, 12), shell));
  tom.position.set(0.2, 0.72, -0.08);
  const tomHead = put(grp, new THREE.Mesh(new THREE.CircleGeometry(0.12, 12), head));
  tomHead.rotation.x = -Math.PI / 2;
  tomHead.position.set(0.2, 0.785, -0.08);

  cymbal(grp, 0.18, -0.08, 0.98, 0.28, 0.18);
  cymbal(grp, 0.24, 0.28, 1.12, -0.06, -0.22);
  const hat2 = put(grp, new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.012, 14), brass));
  hat2.position.set(-0.08, 0.93, 0.28);
  addCyl(grp, 0.01, 0.01, 0.96, metal, -0.08, 0.48, 0.28, 6);
  addCyl(grp, 0.01, 0.01, 1.08, metal, 0.28, 0.54, -0.06, 6);

  const throne = put(grp, new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.04, 12), toon('#1c1814')));
  throne.position.set(0.02, 0.5, -0.38);
  addCyl(grp, 0.015, 0.02, 0.48, metal, 0.02, 0.24, -0.38, 6);
  const pedal = put(grp, new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.02, 0.16), metal));
  pedal.position.set(0.12, 0.04, 0.22);

  grp.position.set(x, y, z);
  grp.rotation.y = rotY;
  parent.add(grp);
}

function cymbal(grp, radius, x, y, z, tilt) {
  const c = put(grp, new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, 0.012, 14), toon('#d4b15a')));
  c.position.set(x, y, z);
  c.rotation.x = tilt;
  c.rotation.z = 0.08;
  return c;
}

function tube(grp, a, b, radius, mat) {
  const dir = new THREE.Vector3(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
  const len = dir.length();
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius * 0.96, len, 8), mat);
  mesh.position.set((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
  return put(grp, mesh);
}

function sweep(grp, points, radii, mat, radial = 12) {
  const pts = points.map((p) => new THREE.Vector3(p[0], p[1], p[2]));
  const tangents = pts.map((_, i) => {
    const prev = pts[Math.max(0, i - 1)];
    const next = pts[Math.min(pts.length - 1, i + 1)];
    return next.clone().sub(prev).normalize();
  });
  const helper = Math.abs(tangents[0].y) < 0.85 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0);
  let normal = new THREE.Vector3().crossVectors(tangents[0], helper).normalize();
  const frames = [];
  for (let i = 0; i < pts.length; i++) {
    if (i > 0) {
      const axis = new THREE.Vector3().crossVectors(tangents[i - 1], tangents[i]);
      const sin = axis.length();
      if (sin > 1e-5) {
        axis.normalize();
        const cos = THREE.MathUtils.clamp(tangents[i - 1].dot(tangents[i]), -1, 1);
        normal.applyAxisAngle(axis, Math.atan2(sin, cos));
      }
    }
    const binormal = new THREE.Vector3().crossVectors(tangents[i], normal).normalize();
    normal.crossVectors(binormal, tangents[i]).normalize();
    frames.push({ n: normal.clone(), b: binormal.clone() });
  }
  const positions = [];
  const indices = [];
  for (let i = 0; i < pts.length; i++) {
    for (let k = 0; k < radial; k++) {
      const a = (k / radial) * Math.PI * 2;
      const c = Math.cos(a);
      const s = Math.sin(a);
      const r = radii[i];
      positions.push(
        pts[i].x + (frames[i].n.x * c + frames[i].b.x * s) * r,
        pts[i].y + (frames[i].n.y * c + frames[i].b.y * s) * r,
        pts[i].z + (frames[i].n.z * c + frames[i].b.z * s) * r,
      );
    }
  }
  for (let i = 0; i < pts.length - 1; i++) {
    for (let k = 0; k < radial; k++) {
      const k2 = (k + 1) % radial;
      const a = i * radial + k;
      const b = i * radial + k2;
      const c = (i + 1) * radial + k;
      const d = (i + 1) * radial + k2;
      indices.push(a, c, b, b, c, d);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return put(grp, new THREE.Mesh(geo, mat));
}

function saxophone(parent, x, y, z, rotY) {
  const grp = new THREE.Group();
  grp.name = 'sax';
  const brass = toon('#e0b45e', { side: THREE.DoubleSide });
  const dark = toon('#8a6a32');
  const black = toon('#1a1814');
  // Straight stack, bow swung out to the side so the J reads in profile,
  // then the bell turns back toward the house.
  const path = [
    [-0.02, 0.84, -0.06],
    [0.0, 0.79, -0.02],
    [0.0, 0.73, 0.012],
    [0.0, 0.62, 0.016],
    [0.0, 0.5, 0.016],
    [0.0, 0.38, 0.012],
    [0.0, 0.26, 0.006],
    [0.0, 0.17, 0.0],
    [-0.035, 0.12, 0.02],
    [-0.08, 0.095, 0.055],
    [-0.115, 0.1, 0.1],
    [-0.125, 0.14, 0.145],
    [-0.09, 0.185, 0.18],
    [-0.03, 0.22, 0.205],
    [0.04, 0.25, 0.225],
    [0.11, 0.275, 0.245],
  ];
  const radii = [
    0.011, 0.012, 0.014,
    0.017, 0.018, 0.018, 0.019, 0.02,
    0.022, 0.024, 0.028, 0.034,
    0.046, 0.062, 0.08, 0.096,
  ];
  sweep(grp, path, radii, brass, 12);

  const tip = new THREE.Vector3(...path[path.length - 1]);
  const prev = new THREE.Vector3(...path[path.length - 2]);
  const bellDir = tip.clone().sub(prev).normalize();
  const rim = put(grp, new THREE.Mesh(new THREE.TorusGeometry(0.084, 0.007, 6, 18), brass));
  rim.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), bellDir);
  rim.position.copy(tip);
  const bore = put(grp, new THREE.Mesh(new THREE.CircleGeometry(0.074, 18), toon('#2a1c12')));
  bore.quaternion.copy(rim.quaternion);
  bore.position.copy(tip).addScaledVector(bellDir, -0.008);
  bore.userData.noShadow = true;

  const neckTip = new THREE.Vector3(...path[0]);
  const neckNext = new THREE.Vector3(...path[1]);
  const neckDir = neckTip.clone().sub(neckNext).normalize();
  const mp = put(grp, new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.013, 0.07, 8), black));
  mp.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), neckDir);
  mp.position.copy(neckTip).addScaledVector(neckDir, 0.03);
  const reed = put(grp, new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.038, 0.004), toon('#c4b49a')));
  reed.quaternion.copy(mp.quaternion);
  reed.position.copy(neckTip).addScaledVector(neckDir, 0.028).add(new THREE.Vector3(0.008, 0, 0.004));

  for (let i = 0; i < 7; i++) {
    const key = put(grp, new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.006, 8), dark));
    key.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(0.75, 0, 0.66).normalize());
    key.position.set(0.018, 0.3 + i * 0.055, 0.02);
  }

  const stand = toon('#b7bdc2');
  const base = put(grp, new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.1, 0.016, 12), stand));
  base.position.set(-0.07, 0.008, 0.05);
  const pole = put(grp, new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.01, 0.16, 8), stand));
  pole.position.set(-0.07, 0.09, 0.05);
  const yoke = put(grp, new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.01, 0.012), stand));
  yoke.position.set(-0.07, 0.1, 0.055);
  for (const side of [-1, 1]) {
    const prong = put(grp, new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.04, 0.01), stand));
    prong.position.set(-0.07 + side * 0.042, 0.118, 0.06);
  }

  grp.position.set(x, y, z);
  grp.rotation.y = rotY;
  parent.add(grp);
}

function micStand(parent, x, y, z, rotY) {
  const grp = new THREE.Group();
  const metal = toon('#9aa0a4');
  const black = toon('#1a1a1a');
  const pole = put(grp, new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.016, 1.2, 8), metal));
  pole.position.y = 0.62;
  const base = put(grp, new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.11, 0.025, 12), metal));
  base.position.y = 0.02;
  const boom = put(grp, new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.42, 6), metal));
  boom.rotation.z = Math.PI / 2;
  boom.position.set(0.12, 1.2, 0);
  const mic = put(grp, new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.02, 0.12, 8), black));
  mic.position.set(0.32, 1.26, 0);
  mic.rotation.z = 0.6;
  grp.position.set(x, y, z);
  grp.rotation.y = rotY;
  parent.add(grp);
}

function stageCans(g, layout) {
  const black = toon('#1a1a1a');
  const gelMat = toon('#ffd7a8', { emissive: '#ffc080', emissiveIntensity: 1.7 });
  for (const s of layout.lights.spots || []) {
    const grp = new THREE.Group();
    const body = put(grp, new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 0.2, 10), black));
    body.position.y = -0.08;
    const gel = put(grp, new THREE.Mesh(new THREE.CircleGeometry(0.065, 10), gelMat));
    gel.rotation.x = Math.PI / 2;
    gel.position.y = -0.18;
    gel.userData.noShadow = true;
    grp.position.set(s.position[0], s.position[1], s.position[2]);
    const dx = s.target[0] - s.position[0];
    const dy = s.target[1] - s.position[1];
    const dz = s.target[2] - s.position[2];
    grp.rotation.x = Math.atan2(Math.hypot(dx, dz), -dy) - Math.PI / 2;
    grp.rotation.y = Math.atan2(dx, dz);
    g.add(grp);
  }
}

function dressTables(g, layout) {
  const brass = toon('#c4a15a');
  const flameMat = toon('#ffd7a8', { emissive: '#ffb060', emissiveIntensity: 2 });
  const tables = (layout.instances || []).filter((i) => i.kind === 'round_table');
  tables.forEach((t, idx) => {
    const [x, , z] = t.position;
    const y = 0.748;
    addCyl(g, 0.045, 0.055, 0.035, brass, x, y + 0.02, z, 8);
    const cup = addCyl(g, 0.028, 0.032, 0.05, toon('#f4efe4', { emissive: '#ffd8b0', emissiveIntensity: 0.35 }), x, y + 0.05, z, 8);
    cup.userData.noShadow = true;
    const flame = put(g, new THREE.Mesh(new THREE.ConeGeometry(0.012, 0.045, 6), flameMat));
    flame.position.set(x, y + 0.1, z);
    flame.userData.noShadow = true;
    glass(g, x - 0.16, y, z + 0.05, 0.08, '#e0b56a');
    glass(g, x + 0.14, y, z - 0.04, 0.08, idx % 2 ? '#d8c8b0' : '#c4843a');
    if (idx === 2) bottle(g, x + 0.02, y, z - 0.16, 0.24, '#4a2030');
    if (idx === 1) glass(g, x + 0.02, y, z + 0.14, 0.06, '#e6d2b0');
  });
}

function hangCords(g, layout) {
  const cord = toon('#2a2424');
  const H = layout.meta.room.height;
  for (const inst of layout.instances || []) {
    if (inst.kind !== 'pendant_lamp') continue;
    const [x, y, z] = inst.position;
    const spec = layout.assets.pendant_lamp;
    const top = y + (spec.targetHeight || 0.42);
    const len = Math.max(0.08, H - 0.12 - top);
    addCyl(g, 0.006, 0.006, len, cord, x, top + len / 2, z, 5);
  }
}

function poolDisc(g, x, z, radius, color, opacity, y) {
  const m = new THREE.Mesh(
    new THREE.CircleGeometry(radius, 20),
    toon(color, {
      transparent: true,
      opacity,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
    }),
  );
  m.rotation.x = -Math.PI / 2;
  m.position.set(x, y, z);
  m.userData.noShadow = true;
  m.receiveShadow = false;
  m.castShadow = false;
  g.add(m);
}

function groundAndPools(g, layout) {
  const stageH = layout.meta.stage.h;
  for (const inst of layout.instances || []) {
    const [x, y, z] = inst.position;
    const onStage = y > 0.2;
    const gy = (onStage ? stageH : 0) + 0.02;
    if (inst.kind === 'round_table') poolDisc(g, x, z, 0.42, '#140e0c', 0.38, gy);
    else if (inst.kind === 'dining_chair' || inst.kind === 'bar_stool') poolDisc(g, x, z, 0.28, '#140e0c', 0.32, gy);
    else if (inst.kind === 'piano_bench') poolDisc(g, x, z, 0.36, '#140e0c', 0.35, gy);
    if (inst.kind === 'pendant_lamp' && !inst.id.startsWith('lamp_bar')) {
      poolDisc(g, x, z, 0.85, '#e8a56a', 0.16, 0.028);
    }
  }
  const st = layout.meta.stage;
  poolDisc(g, (st.x0 + st.x1) / 2, (st.z0 + st.z1) / 2 + 0.15, 1.55, '#e0a060', 0.14, stageH + 0.025);
  const p = layout.meta.instruments.piano.position;
  poolDisc(g, p[0] - 0.35, p[2], 0.7, '#140e0c', 0.4, stageH + 0.03);
  const b = layout.meta.instruments.bass.position;
  poolDisc(g, b[0], b[2], 0.28, '#140e0c', 0.35, stageH + 0.03);
  const d = layout.meta.instruments.drums.position;
  poolDisc(g, d[0], d[2], 0.48, '#140e0c', 0.35, stageH + 0.03);
}

function dressPlant(g, layout) {
  const pot = (layout.instances || []).find((i) => i.kind === 'flowerpot');
  if (!pot) return;
  const [x, , z] = pot.position;
  const leaf = toon('#2f4a38');
  const leaf2 = toon('#3d5c44');
  const a = put(g, new THREE.Mesh(new THREE.SphereGeometry(0.14, 10, 8), leaf));
  a.scale.set(1.05, 0.75, 0.9);
  a.position.set(x, 0.46, z);
  const b = put(g, new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 7), leaf2));
  b.position.set(x + 0.08, 0.52, z - 0.04);
  const c = put(g, new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 7), leaf));
  c.position.set(x - 0.07, 0.5, z + 0.05);
}

function makeShell(layout) {
  const g = new THREE.Group();
  g.name = 'shell';
  buildShell(g, layout);
  return g;
}

function makeProcedural(layout) {
  const g = new THREE.Group();
  g.name = 'procedural';
  const I = layout.meta.instruments;
  grandPiano(g, ...I.piano.position, I.piano.rotationY);
  doubleBass(g, ...I.bass.position, I.bass.rotationY);
  drumKit(g, ...I.drums.position, I.drums.rotationY);
  saxophone(g, ...I.sax.position, I.sax.rotationY);
  micStand(g, ...I.mic.position, I.mic.rotationY);
  stageCans(g, layout);
  dressTables(g, layout);
  hangCords(g, layout);
  groundAndPools(g, layout);
  dressPlant(g, layout);
  return g;
}

function cloneMat(mat) {
  const m = mat.clone();
  return m;
}

function onPrototype(kind, root) {
  root.traverse((o) => {
    if (!o.isMesh || !o.material || Array.isArray(o.material)) return;
    if (kind === 'pendant_lamp') {
      if (/bulb/i.test(o.name)) {
        o.material = cloneMat(o.material);
        o.material.color.set('#fff6e8');
        o.material.emissive = new THREE.Color('#ffc98a');
        o.material.emissiveIntensity = 1.6;
      } else if (/shade/i.test(o.name)) {
        o.material = cloneMat(o.material);
        o.material.color.set('#2c2428');
      }
    } else if (kind === 'bar_stool' && /cushion/i.test(o.name)) {
      o.material = cloneMat(o.material);
      o.material.color.set('#6e3140');
    } else if (kind === 'flowerpot') {
      o.material = cloneMat(o.material);
      o.material.color.set('#3c332e');
    }
  });
}

boot({
  makeShell,
  makeProcedural,
  onPrototype,
  readyText: 'ready — jazz club · drag orbit · U unlit · T toon',
});
