import * as THREE from 'three';
import { boot, toon, addBox, addCyl } from './scene_lib.js';

const PAL = {
  plaster: '#e7dcc8',
  plasterDeep: '#d8ccb6',
  bead: '#5c5348',
  beadLite: '#74685a',
  rail: '#8a6848',
  floorA: '#c9a67c',
  floorB: '#b48b62',
  floorGap: '#8d6b48',
  rubber: '#3c3e44',
  rubberB: '#33353b',
  canvas: '#f1e3c8',
  canvasEdge: '#e4d2b0',
  circle: '#8d342e',
  skirt: '#6e3034',
  skirtBand: '#f4ecdc',
  rope: '#f6f1e6',
  postRed: '#9c342f',
  postBlue: '#2c4c7c',
  postWhite: '#f4f0e6',
  steel: '#6c7278',
  steelLite: '#90969c',
  steelDeep: '#4a5056',
  wood: '#8d6444',
  woodLite: '#a67a52',
  woodDark: '#6a4a32',
  vinylRed: '#a33b34',
  vinylBlue: '#2a4a84',
  gloveBlack: '#2c2e32',
  gloveOx: '#6a3030',
  wrap: '#f3ecdf',
  tape: '#d8d2c8',
  brass: '#c6a15a',
  brassDeep: '#8d6a32',
  clock: '#f7f1e4',
  clockRim: '#2c2e32',
  glass: '#d7e6f0',
  beam: '#5e564c',
  ceil: '#f3e8d8',
  towel: '#e7dfd2',
  bucket: '#c45c2c',
  bottle: '#e7f0f4',
  card: '#6e3034',
  cardBoard: '#efe4d0',
};

function tag(mesh, data) {
  Object.assign(mesh.userData, data);
  return mesh;
}

function canvasTex(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');
  draw(ctx, w, h);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 4;
  tex.needsUpdate = true;
  return tex;
}

function woodTexture() {
  return canvasTex(256, 256, (ctx, w, h) => {
    ctx.fillStyle = PAL.floorA;
    ctx.fillRect(0, 0, w, h);
    const plank = 28;
    for (let x = 0; x < w; x += plank) {
      const alt = (x / plank) % 2 === 0;
      ctx.fillStyle = alt ? '#c9a67c' : '#b48960';
      ctx.fillRect(x, 0, plank - 2, h);
      ctx.fillStyle = PAL.floorGap;
      ctx.fillRect(x + plank - 2, 0, 2, h);
      ctx.strokeStyle = 'rgba(90,60,36,0.18)';
      for (let k = 0; k < 4; k++) {
        ctx.beginPath();
        ctx.moveTo(x + 4 + k * 5, 0);
        ctx.lineTo(x + 6 + k * 5, h);
        ctx.stroke();
      }
    }
  });
}

function beadTexture() {
  return canvasTex(128, 256, (ctx, w, h) => {
    ctx.fillStyle = PAL.bead;
    ctx.fillRect(0, 0, w, h);
    for (let x = 0; x < w; x += 16) {
      ctx.fillStyle = (x / 16) % 2 === 0 ? '#655c50' : '#74685a';
      ctx.fillRect(x, 0, 14, h);
      ctx.fillStyle = 'rgba(30,24,18,0.35)';
      ctx.fillRect(x + 14, 0, 2, h);
    }
  });
}

function rubberTexture() {
  return canvasTex(128, 128, (ctx, w, h) => {
    ctx.fillStyle = PAL.rubber;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = PAL.rubberB;
    ctx.fillRect(4, 4, w - 8, h - 8);
    ctx.strokeStyle = 'rgba(20,20,22,0.45)';
    ctx.strokeRect(2, 2, w - 4, h - 4);
  });
}

function ringCanvasTexture() {
  return canvasTex(1024, 1024, (ctx, w, h) => {
    ctx.fillStyle = PAL.canvas;
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#e0cba8';
    ctx.lineWidth = 28;
    ctx.strokeRect(18, 18, w - 36, h - 36);
    ctx.strokeStyle = '#d8c09a';
    ctx.lineWidth = 8;
    ctx.strokeRect(36, 36, w - 72, h - 72);
    ctx.fillStyle = PAL.circle;
    ctx.beginPath();
    ctx.arc(w / 2, h / 2, 168, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#f4ead8';
    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.arc(w / 2, h / 2, 168, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(w / 2, h / 2, 18, 0, Math.PI * 2);
    ctx.fillStyle = '#f4ead8';
    ctx.fill();
    const corners = [
      [54, 54, PAL.postRed],
      [w - 54, 54, PAL.postWhite],
      [w - 54, h - 54, PAL.postBlue],
      [54, h - 54, '#3a3c40'],
    ];
    for (const [x, y, color] of corners) {
      ctx.fillStyle = color;
      ctx.globalAlpha = 0.85;
      ctx.fillRect(x - 16, y - 16, 32, 32);
      ctx.globalAlpha = 1;
    }
    ctx.strokeStyle = 'rgba(120,90,60,0.22)';
    ctx.lineWidth = 3;
    for (let i = 0; i < 7; i++) {
      ctx.beginPath();
      ctx.moveTo(120 + i * 90, 200 + (i % 3) * 40);
      ctx.lineTo(200 + i * 80, 760 - (i % 2) * 30);
      ctx.stroke();
    }
  });
}

function clockTexture() {
  return canvasTex(512, 512, (ctx, w, h) => {
    ctx.fillStyle = PAL.clock;
    ctx.fillRect(0, 0, w, h);
    const cx = w / 2;
    const cy = h / 2;
    ctx.strokeStyle = '#2a2c30';
    ctx.lineWidth = 10;
    for (let i = 0; i < 60; i++) {
      const a = (i / 60) * Math.PI * 2 - Math.PI / 2;
      const inner = i % 5 === 0 ? 168 : 190;
      ctx.lineWidth = i % 5 === 0 ? 8 : 3;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a) * inner, cy + Math.sin(a) * inner);
      ctx.lineTo(cx + Math.cos(a) * 214, cy + Math.sin(a) * 214);
      ctx.stroke();
    }
    ctx.fillStyle = '#2a2c30';
    ctx.font = '700 54px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const labels = [
      [0, -148, '12'],
      [148, 0, '3'],
      [0, 148, '6'],
      [-148, 0, '9'],
    ];
    for (const [x, y, t] of labels) ctx.fillText(t, cx + x, cy + y + 2);
    ctx.strokeStyle = '#8d342e';
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx, cy - 150);
    ctx.stroke();
    ctx.strokeStyle = '#2a2c30';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + 96, cy + 18);
    ctx.stroke();
    ctx.fillStyle = '#8d342e';
    ctx.beginPath();
    ctx.arc(cx, cy, 10, 0, Math.PI * 2);
    ctx.fill();
  });
}

let shadowMat;
function contactMat() {
  if (!shadowMat) {
    const tex = canvasTex(128, 128, (ctx) => {
      const grd = ctx.createRadialGradient(64, 64, 8, 64, 64, 62);
      grd.addColorStop(0, 'rgba(40,32,24,0.32)');
      grd.addColorStop(0.55, 'rgba(40,32,24,0.12)');
      grd.addColorStop(1, 'rgba(40,32,24,0)');
      ctx.fillStyle = grd;
      ctx.fillRect(0, 0, 128, 128);
    });
    shadowMat = new THREE.MeshBasicMaterial({
      map: tex,
      transparent: true,
      depthWrite: false,
      toneMapped: false,
    });
    shadowMat.polygonOffset = true;
    shadowMat.polygonOffsetFactor = -2;
    shadowMat.polygonOffsetUnits = -2;
  }
  return shadowMat;
}

function addPad(g, w, d, x, y, z) {
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, d), contactMat());
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set(x, y, z);
  mesh.userData.shade = 'decal';
  g.add(mesh);
  return mesh;
}

function addPole(g, ax, ay, az, bx, by, bz, r, mat) {
  const dir = new THREE.Vector3(bx - ax, by - ay, bz - az);
  const len = dir.length() || 0.001;
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, 8), mat);
  m.position.set((ax + bx) / 2, (ay + by) / 2, (az + bz) / 2);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
  m.castShadow = true;
  m.receiveShadow = true;
  g.add(m);
  return m;
}

function ringFrame(layout) {
  const ring = layout.architecture.ring;
  const half = ring.inside / 2 + ring.apron;
  return {
    ring,
    half,
    cx: ring.cx,
    cz: ring.cz,
    ropeHalf: ring.inside / 2,
    deckY: ring.deckY,
  };
}

function makeShell(layout) {
  const g = new THREE.Group();
  g.name = 'shell';
  const { width: W, depth: D, height: H } = layout.meta.room;
  const wallT = layout.architecture.wallT;
  const ceilY = layout.architecture.ceilingY;

  const floor = tag(addBox(g, W, 0.08, D, toon(PAL.floorB), 0, -0.04, 0), { receiveOnly: true });
  floor.name = 'floor';

  const wood = woodTexture();
  wood.repeat.set(W / 1.15, D / 1.15);
  const boards = new THREE.Mesh(new THREE.PlaneGeometry(W - 0.08, D - 0.08), toon('#ffffff', { map: wood }));
  boards.rotation.x = -Math.PI / 2;
  boards.position.y = 0.012;
  tag(boards, { receiveOnly: true });
  boards.name = 'floorboards';
  g.add(boards);

  const plaster = toon(PAL.plaster);
  const back = tag(addBox(g, W, H, wallT, plaster, 0, H / 2, -D / 2), { receiveOnly: true });
  back.name = 'wall-back';
  const left = tag(addBox(g, wallT, H, D, plaster, -W / 2, H / 2, 0), { receiveOnly: true });
  left.name = 'wall-left';

  const bead = beadTexture();
  bead.repeat.set(7, 1);
  const wainscotH = 1.22;
  const beadMat = toon('#ffffff', { map: bead });
  tag(addBox(g, W - 0.2, wainscotH, 0.04, beadMat, 0, wainscotH / 2, -D / 2 + wallT / 2 + 0.02), { receiveOnly: true });
  const beadSide = beadTexture();
  beadSide.repeat.set(6, 1);
  tag(addBox(g, 0.04, wainscotH, D - 0.2, toon('#ffffff', { map: beadSide }), -W / 2 + wallT / 2 + 0.02, wainscotH / 2, 0), {
    receiveOnly: true,
  });
  tag(addBox(g, W - 0.16, 0.06, 0.06, toon(PAL.rail), 0, wainscotH + 0.02, -D / 2 + wallT / 2 + 0.03), { noShadow: true });
  tag(addBox(g, 0.06, 0.06, D - 0.16, toon(PAL.rail), -W / 2 + wallT / 2 + 0.03, wainscotH + 0.02, 0), { noShadow: true });

  addClerestory(g, layout);
  addCeiling(g, layout, ceilY);
  addReturns(g, layout);

  const base = tag(addBox(g, W, 0.08, 0.08, toon(PAL.woodDark), 0, 0.04, -D / 2 + wallT / 2 + 0.02), { receiveOnly: true });
  base.name = 'baseboard-back';
  tag(addBox(g, 0.08, 0.08, D, toon(PAL.woodDark), -W / 2 + wallT / 2 + 0.02, 0.04, 0), { receiveOnly: true });
  return g;
}

function addClerestory(g, layout) {
  const { width: W, depth: D, height: H } = layout.meta.room;
  const wallT = layout.architecture.wallT;
  const y0 = 2.95;
  const y1 = 3.78;
  const glassMat = toon(PAL.glass, { emissive: '#f4f7fb', emissiveIntensity: 0.22, transparent: true, opacity: 0.92 });
  const frame = toon(PAL.woodDark);
  const openings = [
    [-4.6, 1.55],
    [-2.5, 1.55],
    [-0.35, 1.7],
    [1.85, 1.55],
    [4.05, 1.55],
  ];
  for (const [x, w] of openings) {
    const pane = addBox(g, w, y1 - y0, 0.04, glassMat, x, (y0 + y1) / 2, -D / 2 + wallT / 2 + 0.015);
    tag(pane, { noShadow: true, receive: true });
    tag(addBox(g, w + 0.08, 0.05, 0.07, frame, x, y1, -D / 2 + wallT / 2 + 0.02), { noShadow: true });
    tag(addBox(g, w + 0.08, 0.05, 0.07, frame, x, y0, -D / 2 + wallT / 2 + 0.02), { noShadow: true });
  }
  const sideWins = [-3.2, -0.6, 1.8];
  for (const z of sideWins) {
    const pane = addBox(g, 0.04, 1.15, 1.35, glassMat, -W / 2 + wallT / 2 + 0.015, 3.15, z);
    tag(pane, { noShadow: true, receive: true });
    tag(addBox(g, 0.06, 0.05, 1.48, frame, -W / 2 + wallT / 2 + 0.02, 3.75, z), { noShadow: true });
    tag(addBox(g, 0.06, 0.05, 1.48, frame, -W / 2 + wallT / 2 + 0.02, 2.55, z), { noShadow: true });
  }
  void H;
}

function addCeiling(g, layout, ceilY) {
  const { width: W, depth: D } = layout.meta.room;
  const slab = tag(addBox(g, W, 0.08, D, toon(PAL.ceil), 0, ceilY, 0), { receiveOnly: true });
  slab.name = 'ceiling';
  const joist = toon(PAL.beam);
  for (const z of [-4.7, -3.4, -2.1, -0.55, 0.95, 2.35]) {
    const beam = addBox(g, W * 0.7, 0.08, 0.07, joist, -0.9, ceilY - 0.1, z);
    tag(beam, { noShadow: true });
  }
  for (const x of [-4.4, -0.6, 2.4]) {
    tag(addBox(g, 0.12, 0.16, D * 0.62, toon(PAL.steelDeep), x, ceilY - 0.18, -0.7), { noShadow: true });
  }
}

function addReturns(g, layout) {
  const { width: W, depth: D, height: H } = layout.meta.room;
  const wallT = layout.architecture.wallT;
  const ceilY = layout.architecture.ceilingY;
  const ret = 0.78;
  const plaster = toon(PAL.plaster);
  const returns = new THREE.Group();
  returns.name = 'returns';
  const backRight = tag(
    addBox(returns, wallT, H, ret, plaster, W / 2 - wallT / 2, H / 2, -D / 2 + ret / 2),
    { receiveOnly: true }
  );
  backRight.name = 'return-back';
  const frontLeft = tag(
    addBox(returns, ret, H, wallT, plaster, -W / 2 + ret / 2, H / 2, D / 2 - wallT / 2),
    { receiveOnly: true }
  );
  frontLeft.name = 'return-front';
  const bead = beadTexture();
  bead.repeat.set(1, 1);
  tag(
    addBox(returns, wallT + 0.04, 1.22, ret - 0.04, toon('#ffffff', { map: bead }), W / 2 - wallT / 2 - 0.02, 0.61, -D / 2 + ret / 2),
    { receiveOnly: true }
  );
  const beadFront = beadTexture();
  tag(
    addBox(returns, ret - 0.04, 1.22, wallT + 0.04, toon('#ffffff', { map: beadFront }), -W / 2 + ret / 2, 0.61, D / 2 - wallT / 2 - 0.02),
    { receiveOnly: true }
  );
  const fascia = toon(PAL.woodDark);
  tag(addBox(returns, 0.07, 0.14, D, fascia, W / 2 - 0.035, 0.03, 0), { receiveOnly: true });
  tag(addBox(returns, W, 0.14, 0.07, fascia, 0, 0.03, D / 2 - 0.035), { receiveOnly: true });
  tag(addBox(returns, 0.1, 0.1, D, toon(PAL.ceil), W / 2 - 0.05, ceilY - 0.09, 0), { noShadow: true });
  tag(addBox(returns, W, 0.1, 0.1, toon(PAL.ceil), 0, ceilY - 0.09, D / 2 - 0.05), { noShadow: true });
  g.add(returns);
}

function makeProcedural(layout) {
  const g = new THREE.Group();
  g.name = 'procedural';
  addRubberLane(g, layout);
  addRing(g, layout);
  addSpeedBags(g, layout);
  addGloveRail(g, layout);
  addTimer(g, layout);
  addBell(g, layout);
  addCard(g, layout);
  addWaterCrate(g, layout);
  addSkipRopes(g, layout);
  addPad(g, 6.3, 6.3, layout.architecture.ring.cx, 0.018, layout.architecture.ring.cz);
  return g;
}

function addRubberLane(g, layout) {
  const fit = layout.architecture.bagFit;
  const scale = fit.targetHeight / fit.nativeHeight;
  // prepareAsset recenters the bake, then rotationY = π/2 swaps the shallow axis onto X.
  const halfDepth = ((fit.nativeZMax - fit.nativeZMin) / 2) * scale;
  const halfAlong = fit.nativeHalfX * scale;
  const front = fit.x + halfDepth;
  const back = fit.x - halfDepth;
  const halfZ = halfAlong;
  const x0 = Math.min(back, front) - 0.18;
  const x1 = Math.max(back, front) + 0.22;
  const z0 = fit.z[0] - halfZ - 0.28;
  const z1 = fit.z[fit.z.length - 1] + halfZ + 0.28;
  const tex = rubberTexture();
  tex.repeat.set((x1 - x0) / 0.85, (z1 - z0) / 0.85);
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0, 0.018, z1 - z0), toon('#ffffff', { map: tex }));
  mesh.position.set((x0 + x1) / 2, 0.02, (z0 + z1) / 2);
  tag(mesh, { receiveOnly: true });
  mesh.name = 'bag-lane';
  g.add(mesh);
}

function addRing(g, layout) {
  const rig = ringFrame(layout);
  const { ring, half, cx, cz, ropeHalf, deckY } = rig;
  const root = new THREE.Group();
  root.name = 'ring';

  const deck = addBox(root, half * 2, 0.1, half * 2, toon(PAL.canvasEdge), cx, deckY - 0.06, cz);
  deck.castShadow = true;
  deck.receiveShadow = true;

  const tex = ringCanvasTexture();
  const canvas = new THREE.Mesh(new THREE.PlaneGeometry(half * 2 - 0.06, half * 2 - 0.06), toon('#ffffff', { map: tex, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 }));
  canvas.rotation.x = -Math.PI / 2;
  canvas.position.set(cx, deckY - 0.006, cz);
  tag(canvas, { receiveOnly: true });
  canvas.name = 'ring-canvas';
  root.add(canvas);

  const skirt = toon(PAL.skirt);
  const band = toon(PAL.skirtBand);
  const skirtH = deckY - 0.22;
  const skirtY = 0.2 + skirtH / 2;
  for (const [w, d, x, z] of [
    [half * 2 + 0.04, 0.025, cx, cz - half],
    [half * 2 + 0.04, 0.025, cx, cz + half],
  ]) {
    addBox(root, w, skirtH, d, skirt, x, skirtY, z);
    addBox(root, w * 0.92, 0.06, d + 0.01, band, x, deckY - 0.16, z);
  }
  for (const [w, d, x, z] of [
    [0.025, half * 2, cx - half, cz],
    [0.025, half * 2, cx + half, cz],
  ]) {
    addBox(root, w, skirtH, d, skirt, x, skirtY, z);
    addBox(root, w + 0.01, 0.06, d * 0.92, band, x, deckY - 0.16, z);
  }

  const signs = [
    [-1, -1, PAL.postRed],
    [1, -1, PAL.postWhite],
    [1, 1, PAL.postBlue],
    [-1, 1, '#3e4248'],
  ];
  const corners = signs.map(([sx, sz, color]) => ({
    x: cx + sx * ropeHalf,
    z: cz + sz * ropeHalf,
    color,
    sx,
    sz,
  }));
  const steel = toon(PAL.steel);
  const pads = new THREE.Group();
  pads.name = 'corner-pads';
  root.add(pads);
  for (const c of corners) {
    addCyl(root, 0.04, 0.045, deckY - 0.04, steel, c.x, (deckY - 0.04) / 2, c.z, 10);
    addCornerCushion(pads, c, deckY, ring);
    const stub = ring.postAbove - (ring.ropeAbove[3] + 0.08);
    addCyl(root, 0.038, 0.038, stub, steel, c.x, deckY + ring.ropeAbove[3] + 0.08 + stub / 2, c.z, 10);
    addBox(root, 0.16, 0.045, 0.16, toon(PAL.steelDeep), c.x, deckY + ring.postAbove, c.z);
  }

  const ropeMat = toon(PAL.rope);
  const ys = ring.ropeAbove.map((h) => deckY + h);
  const ropes = new THREE.Group();
  ropes.name = 'ropes';
  for (let e = 0; e < 4; e++) {
    const a = corners[e];
    const b = corners[(e + 1) % 4];
    const dir = new THREE.Vector3(b.x - a.x, 0, b.z - a.z);
    const len = dir.length();
    dir.multiplyScalar(1 / len);
    for (let i = 0; i < ys.length; i++) {
      const y = ys[i];
      const sag = 0.02 + i * 0.008;
      const start = new THREE.Vector3(a.x, y, a.z).addScaledVector(dir, 0.11);
      const end = new THREE.Vector3(b.x, y, b.z).addScaledVector(dir, -0.11);
      const mid = start.clone().lerp(end, 0.5);
      mid.y -= sag;
      const curve = new THREE.CatmullRomCurve3([start, mid, end]);
      const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 10, ring.ropeRadius, 8, false), ropeMat);
      tag(tube, { noShadow: true });
      ropes.add(tube);
      const buckle = addBox(root, 0.055, 0.04, 0.045, toon(PAL.steelLite), start.x, y, start.z);
      tag(buckle, { noShadow: true });
    }
    for (const t of [0.33, 0.66]) {
      const p = new THREE.Vector3().lerpVectors(
        new THREE.Vector3(a.x, 0, a.z),
        new THREE.Vector3(b.x, 0, b.z),
        t
      );
      const spacer = addCyl(ropes, 0.01, 0.01, ys[3] - ys[0], ropeMat, p.x, (ys[0] + ys[3]) / 2, p.z, 6);
      tag(spacer, { noShadow: true });
    }
  }
  root.add(ropes);

  const yBeam = 0.42;
  addBox(root, ropeHalf * 2, 0.06, 0.06, steel, cx, yBeam, cz - ropeHalf);
  addBox(root, ropeHalf * 2, 0.06, 0.06, steel, cx, yBeam, cz + ropeHalf);
  addBox(root, 0.06, 0.06, ropeHalf * 2, steel, cx - ropeHalf, yBeam, cz);
  addBox(root, 0.06, 0.06, ropeHalf * 2, steel, cx + ropeHalf, yBeam, cz);
  addPole(root, cx - ropeHalf, 0.08, cz - ropeHalf, cx + ropeHalf, yBeam, cz + ropeHalf, 0.025, steel);
  addPole(root, cx + ropeHalf, 0.08, cz - ropeHalf, cx - ropeHalf, yBeam, cz + ropeHalf, 0.025, steel);

  addSteps(root, layout, rig);
  addCornerStools(root, layout, rig);
  g.add(root);
}

function addCornerCushion(pads, c, deckY, ring) {
  const padMat = toon(c.color);
  const pipe = toon(PAL.canvas);
  const armLen = 0.3;
  const armT = 0.13;
  const padBottom = deckY + 0.015;
  const padTop = deckY + ring.ropeAbove[3] + 0.08;
  const padH = padTop - padBottom;
  const y = padBottom + padH / 2;
  const alongX = -c.sx;
  const alongZ = -c.sz;
  const xArmX = c.x + alongX * 0.07;
  const xArmZ = c.z + c.sz * 0.015;
  const zArmX = c.x + c.sx * 0.015;
  const zArmZ = c.z + alongZ * 0.07;
  addBox(pads, armLen, padH, armT, padMat, xArmX, y, xArmZ);
  addBox(pads, armT, padH, armLen, padMat, zArmX, y, zArmZ);
  addCyl(pads, 0.07, 0.07, padH, padMat, c.x + c.sx * 0.04, y, c.z + c.sz * 0.04, 14);
  for (const t of [0.22, 0.78]) {
    const wy = padBottom + padH * t;
    addBox(pads, armLen + 0.012, 0.022, armT + 0.016, pipe, xArmX, wy, xArmZ);
    addBox(pads, armT + 0.016, 0.022, armLen + 0.012, pipe, zArmX, wy, zArmZ);
  }
}

function addSteps(root, layout, rig) {
  const { half, cx, cz, deckY } = rig;
  const spec = layout.architecture.stairs;
  const count = spec.count;
  const run = spec.run;
  const rise = deckY / count;
  const steps = new THREE.Group();
  steps.name = 'steps';
  const width = spec.width;
  const x = cx + spec.xOffset;
  const apronZ = cz + half;
  for (let i = 0; i < count; i++) {
    const z = apronZ + run * (i + 0.55);
    const top = deckY - i * rise;
    const tread = addBox(steps, width, 0.04, run * 0.92, toon(PAL.woodLite), x, top - 0.02, z);
    tread.castShadow = true;
    const riser = addBox(steps, width - 0.04, Math.max(0.04, rise - 0.045), 0.035, toon(PAL.wood), x, top - rise / 2, z - run * 0.46);
    riser.castShadow = true;
  }
  const railX = x + width / 2 + 0.045;
  const topZ = apronZ + 0.02;
  const topY = deckY + spec.railHeight;
  const bottomZ = apronZ + run * (count - 0.5);
  const bottomY = rise + spec.railHeight;
  const steel = toon(PAL.steel);
  const newelH = topY - (deckY - 0.22);
  const newel = addCyl(steps, 0.022, 0.022, newelH, steel, railX, (topY + deckY - 0.22) / 2, topZ, 8);
  newel.name = 'rail-apron';
  addBox(steps, 0.07, 0.1, 0.1, steel, railX, deckY - 0.06, apronZ);
  addCyl(steps, 0.022, 0.022, bottomY, steel, railX, bottomY / 2, bottomZ, 8);
  addPole(steps, railX, topY, topZ, railX, bottomY, bottomZ, 0.016, steel);
  root.add(steps);
}

function makeStool(color) {
  const s = new THREE.Group();
  const seat = addCyl(s, 0.16, 0.15, 0.07, toon(color), 0, 0.4, 0, 16);
  seat.castShadow = true;
  addCyl(s, 0.04, 0.045, 0.04, toon(PAL.steelDeep), 0, 0.35, 0, 10);
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    const x = Math.cos(a) * 0.11;
    const z = Math.sin(a) * 0.11;
    addPole(s, x * 0.45, 0.34, z * 0.45, x, 0.02, z, 0.012, toon(PAL.woodDark));
  }
  addCyl(s, 0.125, 0.125, 0.012, toon(PAL.steel), 0, 0.08, 0, 12);
  return s;
}

function addCornerStools(root, layout, rig) {
  const { cx, cz, ropeHalf, deckY } = rig;
  const inset = layout.architecture.stools.inset;
  const red = makeStool(PAL.vinylRed);
  red.position.set(cx - ropeHalf + inset, deckY, cz - ropeHalf + inset);
  red.name = 'stool_red';
  root.add(red);
  const blue = makeStool(PAL.vinylBlue);
  blue.position.set(cx + ropeHalf - inset, deckY, cz + ropeHalf - inset);
  blue.name = 'stool_blue';
  root.add(blue);

  const bucket = (x, z) => {
    const b = addCyl(root, 0.09, 0.07, 0.16, toon(PAL.bucket), x, deckY + 0.08, z, 10);
    b.castShadow = true;
  };
  bucket(cx - ropeHalf + inset + 0.28, cz - ropeHalf + 0.28);
  bucket(cx + ropeHalf - 0.28, cz + ropeHalf - inset - 0.22);
  addCyl(root, 0.035, 0.04, 0.16, toon(PAL.bottle), cx - ropeHalf + inset + 0.26, deckY + 0.1, cz - ropeHalf + inset - 0.12, 8);
  addCyl(root, 0.035, 0.04, 0.16, toon(PAL.bottle), cx + ropeHalf - inset - 0.22, deckY + 0.1, cz + ropeHalf - inset + 0.16, 8);

  const coach = makeStool(PAL.vinylRed);
  const spot = layout.architecture.stools.coach;
  coach.position.set(spot.x, 0, spot.z);
  coach.name = 'stool_coach';
  root.add(coach);

  const towel = addBox(root, 0.18, 0.012, 0.28, toon(PAL.towel), cx + ropeHalf + 0.02, deckY + 0.62, cz + ropeHalf - 0.34);
  towel.rotation.z = 0.9;
  towel.rotation.y = 0.2;
  tag(towel, { noShadow: true });
}

function addSpeedBags(g, layout) {
  const { depth: D } = layout.meta.room;
  const wallT = layout.architecture.wallT;
  const backInner = -D / 2 + wallT / 2;
  const depth = layout.architecture.speedDepth;
  const width = layout.architecture.speedWidth;
  const z = backInner + 0.03 + depth / 2;
  const colors = [PAL.vinylRed, PAL.gloveBlack];
  layout.architecture.speed.forEach((spec, i) => {
    const root = new THREE.Group();
    root.name = spec.id;
    const wood = toon(PAL.woodLite);
    const top = addBox(root, width, 0.055, depth, wood, 0, spec.platformY, 0);
    top.castShadow = true;
    const lip = addBox(root, width + 0.02, 0.02, depth + 0.02, toon(PAL.woodDark), 0, spec.platformY - 0.035, 0);
    tag(lip, { noShadow: true });
    addBox(root, 0.05, 0.28, 0.05, toon(PAL.steel), -width / 2 + 0.08, spec.platformY - 0.16, -depth / 2 + 0.06);
    addBox(root, 0.05, 0.28, 0.05, toon(PAL.steel), width / 2 - 0.08, spec.platformY - 0.16, -depth / 2 + 0.06);
    addBox(root, width - 0.08, 0.04, 0.08, toon(PAL.steelDeep), 0, spec.platformY - 0.28, -depth / 2 + 0.02);
    const swivelY = spec.platformY - 0.07;
    addCyl(root, 0.045, 0.045, 0.02, toon(PAL.steelLite), 0, swivelY, 0.02, 10);
    addCyl(root, 0.012, 0.012, 0.08, toon(PAL.steel), 0, swivelY - 0.05, 0.02, 8);
    const bag = new THREE.Mesh(new THREE.SphereGeometry(0.135, 18, 14), toon(colors[i]));
    bag.scale.set(1, 1.28, 1);
    bag.position.set(0, swivelY - 0.26, 0.02);
    bag.castShadow = true;
    bag.receiveShadow = true;
    root.add(bag);
    addCyl(root, 0.07, 0.09, 0.035, toon(PAL.rope), 0, bag.position.y + 0.14, 0.02, 12);
    addCyl(root, 0.018, 0.018, 0.07, toon(PAL.steelLite), 0, swivelY - 0.08, 0.02, 8);
    const mat = addBox(root, 0.72, 0.012, 0.72, toon(PAL.rubberB), 0, 0.026, depth / 2 + 0.42);
    tag(mat, { receiveOnly: true });
    root.position.set(spec.x, 0, z);
    g.add(root);
  });
}

function gloveMesh(color) {
  const g = new THREE.Group();
  const leather = toon(color);
  addCyl(g, 0.04, 0.046, 0.055, leather, 0, -0.02, 0, 10);
  const fist = new THREE.Mesh(new THREE.SphereGeometry(0.052, 12, 10), leather);
  fist.scale.set(1.05, 0.78, 1.22);
  fist.position.set(0, -0.085, 0.008);
  fist.castShadow = true;
  g.add(fist);
  const thumb = new THREE.Mesh(new THREE.SphereGeometry(0.026, 8, 6), leather);
  thumb.position.set(0.038, -0.07, 0.02);
  thumb.castShadow = true;
  g.add(thumb);
  addBox(g, 0.012, 0.045, 0.008, toon(PAL.rope), 0, -0.08, 0.055);
  g.traverse((o) => {
    if (o.isMesh) {
      o.castShadow = true;
      o.receiveShadow = true;
    }
  });
  return g;
}

function addGloveRail(g, layout) {
  const { depth: D } = layout.meta.room;
  const wallT = layout.architecture.wallT;
  const z = -D / 2 + wallT / 2 + 0.06;
  const rail = layout.architecture.gloveRail;
  const root = new THREE.Group();
  root.name = 'glove_rack';
  const board = addBox(root, rail.x1 - rail.x0 + 0.28, 0.42, 0.045, toon(PAL.wood), (rail.x0 + rail.x1) / 2, rail.y - 0.02, z);
  board.castShadow = true;
  const colors = [PAL.vinylRed, PAL.gloveBlack, PAL.gloveOx, PAL.vinylRed, PAL.gloveBlack];
  const n = colors.length;
  for (let i = 0; i < n; i++) {
    const x = rail.x0 + ((rail.x1 - rail.x0) * i) / (n - 1);
    addCyl(root, 0.012, 0.012, 0.11, toon(PAL.woodDark), x, rail.y, z + 0.06, 8).rotation.x = Math.PI / 2;
    const glove = gloveMesh(colors[i]);
    glove.scale.setScalar(1.65);
    glove.position.set(x, rail.y - 0.04, z + 0.12);
    root.add(glove);
  }
  g.add(root);
}

function addTimer(g, layout) {
  const { depth: D } = layout.meta.room;
  const wallT = layout.architecture.wallT;
  const t = layout.architecture.timer;
  const z = -D / 2 + wallT / 2 + 0.04;
  const root = new THREE.Group();
  root.name = 'timer';
  const rim = new THREE.Mesh(new THREE.TorusGeometry(t.r, 0.035, 8, 28), toon(PAL.clockRim));
  rim.position.set(t.x, t.y, z);
  rim.castShadow = true;
  root.add(rim);
  const face = new THREE.Mesh(new THREE.CircleGeometry(t.r - 0.02, 32), toon('#ffffff', { map: clockTexture() }));
  face.position.set(t.x, t.y, z + 0.012);
  tag(face, { noShadow: true, receive: true });
  face.name = 'timer-face';
  root.add(face);
  g.add(root);
}

function addBell(g, layout) {
  const { depth: D } = layout.meta.room;
  const wallT = layout.architecture.wallT;
  const t = layout.architecture.timer;
  const z = -D / 2 + wallT / 2 + 0.08;
  const root = new THREE.Group();
  root.name = 'bell';
  const x = t.x + 0.62;
  const y = t.y - 0.05;
  addBox(root, 0.08, 0.28, 0.04, toon(PAL.woodDark), x, y + 0.05, z - 0.02);
  const bell = new THREE.Mesh(new THREE.SphereGeometry(0.09, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.62), toon(PAL.brass));
  bell.scale.set(1, 0.85, 1);
  bell.rotation.x = Math.PI;
  bell.position.set(x, y - 0.02, z + 0.04);
  bell.castShadow = true;
  root.add(bell);
  addCyl(root, 0.012, 0.012, 0.1, toon(PAL.brassDeep), x, y + 0.02, z + 0.02, 6);
  addBox(root, 0.16, 0.02, 0.04, toon(PAL.wood), x, y + 0.16, z);
  g.add(root);
}

function addCard(g, layout) {
  const { depth: D } = layout.meta.room;
  const wallT = layout.architecture.wallT;
  const z = -D / 2 + wallT / 2 + 0.035;
  const root = new THREE.Group();
  root.name = 'bout-card';
  addBox(root, 0.78, 0.52, 0.03, toon(PAL.woodDark), -4.15, 1.78, z);
  const tex = canvasTex(512, 320, (ctx, w, h) => {
    ctx.fillStyle = '#efe4d0';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#6e3034';
    ctx.fillRect(18, 18, w - 36, 46);
    ctx.fillStyle = '#2c2e32';
    for (let i = 0; i < 5; i++) {
      ctx.fillRect(36, 88 + i * 40, 440 - (i % 2) * 80, 10);
    }
  });
  const board = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.44), toon('#ffffff', { map: tex }));
  board.position.set(-4.15, 1.78, z + 0.02);
  tag(board, { noShadow: true, receive: true });
  root.add(board);
  g.add(root);
}

function addWaterCrate(g, layout) {
  const w = layout.architecture.water;
  const root = new THREE.Group();
  root.name = 'water_stoop';
  addBox(root, 0.62, 0.42, 0.46, toon(PAL.wood), w.x, 0.21, w.z);
  addBox(root, 0.5, 0.025, 0.34, toon(PAL.woodLite), w.x, 0.43, w.z);
  tag(addBox(root, 0.5, 0.012, 0.34, toon(PAL.rubberB), w.x, 0.012, w.z + 0.55), { receiveOnly: true });
  g.add(root);
}

function addSkipRopes(g, layout) {
  const { width: W } = layout.meta.room;
  const wallT = layout.architecture.wallT;
  const x = -W / 2 + wallT / 2 + 0.05;
  const zs = [-0.12, 2.45];
  const root = new THREE.Group();
  root.name = 'skip_ropes';
  zs.forEach((z, i) => {
    addCyl(root, 0.018, 0.018, 0.08, toon(PAL.steel), x + 0.04, 1.72, z, 8).rotation.z = -Math.PI / 2;
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(x + 0.05, 1.7, z),
      new THREE.Vector3(x + 0.16, 1.35, z - 0.08),
      new THREE.Vector3(x + 0.22, 1.05, z + 0.02),
      new THREE.Vector3(x + 0.12, 0.82, z + 0.1),
      new THREE.Vector3(x + 0.08, 1.05, z - 0.02),
    ]);
    const rope = new THREE.Mesh(new THREE.TubeGeometry(curve, 12, 0.008, 6, false), toon(i ? '#2c4c7c' : PAL.vinylRed));
    tag(rope, { noShadow: true });
    root.add(rope);
    addCyl(root, 0.018, 0.018, 0.11, toon(PAL.woodDark), x + 0.1, 0.95, z + 0.08, 8);
  });
  g.add(root);
}

function onReady({ props, scene }) {
  const g = new THREE.Group();
  g.name = 'grounding';
  for (const id of ['bag_a', 'bag_b', 'bag_c', 'bench_l', 'bench_r', 'stool_coach']) {
    const o = scene.getObjectByName(id);
    if (!o) continue;
    const b = new THREE.Box3().setFromObject(o);
    if (b.isEmpty()) continue;
    const w = Math.min(1.55, Math.max(0.35, b.max.x - b.min.x));
    const d = Math.min(1.7, Math.max(0.35, b.max.z - b.min.z));
    addPad(g, w * 0.8, d * 0.8, (b.min.x + b.max.x) / 2, 0.022, (b.min.z + b.max.z) / 2);
  }
  const shelf = props.getObjectByName('wrap_shelf');
  if (shelf) {
    const b = new THREE.Box3().setFromObject(shelf);
    const yLo = b.min.y + (b.max.y - b.min.y) * 0.3;
    const yHi = b.min.y + (b.max.y - b.min.y) * 0.72;
    const z = (b.min.z + b.max.z) / 2;
    const rolls = [
      [0.12, yLo, PAL.wrap, 0.045],
      [0.28, yLo, PAL.tape, 0.04],
      [0.44, yLo, PAL.wrap, 0.05],
      [0.6, yLo, '#e7d2c4', 0.042],
      [0.2, yHi, PAL.wrap, 0.04],
      [0.4, yHi, '#d8c4b4', 0.046],
      [0.58, yHi, PAL.tape, 0.036],
    ];
    const span = b.max.x - b.min.x;
    for (const [t, y, color, r] of rolls) {
      const roll = addCyl(g, r, r, 0.11, toon(color), b.min.x + span * t, y + r, z, 10);
      roll.rotation.z = Math.PI / 2;
      roll.castShadow = true;
    }
  }
  return g;
}

boot({
  makeShell,
  makeProcedural,
  onReady,
  readyText: 'ready — boxing gym · drag orbit · U unlit · T toon',
});
