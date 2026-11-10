import * as THREE from 'three';
import { boot, toon, addBox, addCyl, addSphere } from './scene_lib.js';
import { COURT, frame, floorMarkings, outY } from './court_spec.mjs';

const INK = '#b4232e';
const TIN = '#4e1c22';
const PLASTER = '#f3efe6';
const PLASTER_ABOVE = '#e3ebe7';
const STRUCTURE = '#d4cbbd';
const POCHE = '#2c2824';
const METAL = '#2b2926';
const BRASS = '#b08a4f';
const WALNUT = '#6b4330';
const WALNUT_TOP = '#8d5c3a';
const GALLERY = '#e5dccf';
const GREEN = '#243f3b';

function srgbTexture(canvas) {
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  tex.needsUpdate = true;
  return tex;
}

function paintCourtFloor(frontZ) {
  const Wpx = 2048;
  const Hpx = 3120;
  const canvas = document.createElement('canvas');
  canvas.width = Wpx;
  canvas.height = Hpx;
  const ctx = canvas.getContext('2d');
  const planks = ['#c9a36a', '#d0aa72', '#c29a62', '#d4b07a', '#c6a068', '#bc945c', '#d2ae78'];
  const plankM = 0.09;
  const n = Math.ceil(COURT.width / plankM);
  for (let i = 0; i < n; i++) {
    const x0 = -COURT.width / 2 + i * plankM;
    const x1 = Math.min(COURT.width / 2, x0 + plankM);
    ctx.fillStyle = planks[i % planks.length];
    const u0 = ((x0 + COURT.width / 2) / COURT.width) * Wpx;
    const u1 = ((x1 + COURT.width / 2) / COURT.width) * Wpx;
    ctx.fillRect(u0, 0, Math.max(1, u1 - u0), Hpx);
    ctx.fillStyle = 'rgba(90, 58, 28, 0.28)';
    ctx.fillRect(u1 - 1, 0, 1, Hpx);
  }
  ctx.globalCompositeOperation = 'multiply';
  const edge = ctx.createLinearGradient(0, 0, 48, 0);
  edge.addColorStop(0, 'rgba(40, 24, 12, 0.22)');
  edge.addColorStop(1, 'rgba(40, 24, 12, 0)');
  ctx.fillStyle = edge;
  ctx.fillRect(0, 0, 48, Hpx);
  ctx.save();
  ctx.translate(Wpx, 0);
  ctx.scale(-1, 1);
  ctx.fillRect(0, 0, 48, Hpx);
  ctx.restore();
  const end = ctx.createLinearGradient(0, 0, 0, 56);
  end.addColorStop(0, 'rgba(40, 24, 12, 0.20)');
  end.addColorStop(1, 'rgba(40, 24, 12, 0)');
  ctx.fillStyle = end;
  ctx.fillRect(0, 0, Wpx, 56);
  ctx.save();
  ctx.translate(0, Hpx);
  ctx.scale(1, -1);
  ctx.fillRect(0, 0, Wpx, 56);
  ctx.restore();
  ctx.globalCompositeOperation = 'source-over';
  return srgbTexture(canvas);
}

function paintStone(width, depth) {
  const ppm = 180;
  const Wpx = Math.round(width * ppm);
  const Hpx = Math.round(depth * ppm);
  const canvas = document.createElement('canvas');
  canvas.width = Wpx;
  canvas.height = Hpx;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#b3ada3';
  ctx.fillRect(0, 0, Wpx, Hpx);
  const tile = 0.64 * ppm;
  ctx.strokeStyle = '#8f897f';
  ctx.lineWidth = 2;
  for (let x = tile; x < Wpx; x += tile) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, Hpx);
    ctx.stroke();
  }
  for (let y = tile; y < Hpx; y += tile) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(Wpx, y);
    ctx.stroke();
  }
  return srgbTexture(canvas);
}

function makeSignTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#f4ecdf';
  ctx.fillRect(0, 0, 1024, 512);
  ctx.strokeStyle = '#1c3330';
  ctx.lineWidth = 10;
  ctx.strokeRect(36, 36, 952, 440);
  ctx.lineWidth = 2;
  ctx.strokeRect(52, 52, 920, 408);
  ctx.fillStyle = '#1c3330';
  ctx.font = '600 118px Georgia, "Times New Roman", serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('ASH COURT', 512, 210);
  ctx.font = '400 34px Georgia, "Times New Roman", serif';
  ctx.fillStyle = '#6d4a36';
  ctx.fillText('SINGLES   ·   COURT ONE', 512, 328);
  return srgbTexture(canvas);
}

function makeStringTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 168;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, 128, 168);
  ctx.strokeStyle = 'rgba(244, 238, 226, 0.95)';
  ctx.lineWidth = 2;
  for (let x = 8; x < 128; x += 10) {
    ctx.beginPath();
    ctx.moveTo(x, 6);
    ctx.lineTo(x, 162);
    ctx.stroke();
  }
  for (let y = 8; y < 168; y += 10) {
    ctx.beginPath();
    ctx.moveTo(6, y);
    ctx.lineTo(122, y);
    ctx.stroke();
  }
  const tex = srgbTexture(canvas);
  tex.premultiplyAlpha = false;
  return tex;
}

let blobTex;
function shadowBlob(g, x, z, w, d, opacity = 0.38) {
  if (!blobTex) {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    const grd = ctx.createRadialGradient(64, 64, 10, 64, 64, 62);
    grd.addColorStop(0, 'rgba(0,0,0,0.65)');
    grd.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, 128, 128);
    blobTex = new THREE.CanvasTexture(canvas);
    blobTex.colorSpace = THREE.NoColorSpace;
  }
  const mat = new THREE.MeshBasicMaterial({
    map: blobTex,
    transparent: true,
    opacity,
    depthWrite: false,
    color: 0x16120e,
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, d), mat);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set(x, 0.03, z);
  mesh.userData.keepMaterial = true;
  mesh.userData.noCast = true;
  mesh.userData.noReceive = true;
  mesh.renderOrder = 2;
  g.add(mesh);
}

function addFloorPlane(g, width, depth, x, z, texture, tint, receive = true) {
  const mat = toon(tint, { map: texture });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, depth), mat);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set(x, 0.022, z);
  mesh.receiveShadow = receive;
  mesh.userData.noCast = true;
  if (!receive) mesh.userData.noReceive = true;
  g.add(mesh);
  return mesh;
}

function addOutRibbon(g, x, z0, y0, z1, y1, mat, normalX) {
  const dy = COURT.line;
  const positions = new Float32Array([
    x, y0, z0, x, y1, z1, x, y0 + dy, z0,
    x, y1, z1, x, y1 + dy, z1, x, y0 + dy, z0,
  ]);
  const normals = new Float32Array(18);
  for (let i = 0; i < 6; i += 1) normals[i * 3] = normalX;
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
  const mesh = new THREE.Mesh(geo, mat);
  mesh.userData.noCast = true;
  g.add(mesh);
}

function addTinCap(g, f, mat) {
  const x0 = f.leftX;
  const x1 = f.rightX;
  const y0 = COURT.tinTop - COURT.line;
  const y1 = COURT.tinTop;
  const zW = f.frontZ + 0.002;
  const zB = f.frontZ + 0.045;
  const zT = f.frontZ + 0.015;
  const V = [
    [x0, y0, zW], [x0, y0, zB], [x0, y1, zT], [x0, y1, zW],
    [x1, y0, zW], [x1, y0, zB], [x1, y1, zT], [x1, y1, zW],
  ];
  const faces = [
    [1, 5, 6], [1, 6, 2],
    [3, 2, 6], [3, 6, 7],
    [0, 4, 5], [0, 5, 1],
    [0, 3, 7], [0, 7, 4],
    [0, 1, 2], [0, 2, 3],
    [5, 4, 7], [5, 7, 6],
  ];
  const positions = new Float32Array(faces.length * 9);
  let p = 0;
  for (const face of faces) {
    for (const idx of face) {
      positions[p++] = V[idx][0];
      positions[p++] = V[idx][1];
      positions[p++] = V[idx][2];
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.computeVertexNormals();
  const mesh = new THREE.Mesh(geo, mat);
  g.add(mesh);
}

function addPane(g, x0, x1, y0, y1, z, mat) {
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(Math.max(0.02, x1 - x0), Math.max(0.02, y1 - y0)), mat);
  mesh.position.set((x0 + x1) / 2, (y0 + y1) / 2, z);
  mesh.userData.keepMaterial = true;
  mesh.userData.noCast = true;
  mesh.renderOrder = 3;
  g.add(mesh);
}

function makeGlassMaterial() {
  const canvas = document.createElement('canvas');
  canvas.width = 32;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  const grd = ctx.createLinearGradient(0, 0, 0, 256);
  grd.addColorStop(0, 'rgba(244, 250, 247, 0.70)');
  grd.addColorStop(0.4, 'rgba(186, 214, 206, 0.22)');
  grd.addColorStop(1, 'rgba(160, 186, 178, 0.38)');
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, 32, 256);
  return new THREE.MeshBasicMaterial({
    map: srgbTexture(canvas),
    color: 0xd7ebe4,
    transparent: true,
    opacity: 0.28,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
}

function addPoint(g, color, intensity, distance, x, y, z) {
  const light = new THREE.PointLight(color, intensity, distance, 2);
  light.position.set(x, y, z);
  g.add(light);
  return light;
}

function makeShell(layout) {
  const g = new THREE.Group();
  g.name = 'shell';
  const C = layout.meta.court;
  const f = frame(C.frontZ);
  const ink = toon(INK, { emissive: '#7a1820', emissiveIntensity: 0.4, side: THREE.DoubleSide });
  const plaster = toon(PLASTER);
  const above = toon(PLASTER_ABOVE);
  const structure = toon(STRUCTURE);
  const gallery = toon(GALLERY);
  const metal = toon(METAL);
  const poche = toon(POCHE);
  const ceil = C.ceilingY;

  const baseMat = [poche, structure, structure, toon('#b7aea2'), poche, structure];
  const courtBase = new THREE.Mesh(new THREE.BoxGeometry(7.02, 0.18, 10.22), baseMat);
  courtBase.position.set(-0.02, -0.082, -0.06);
  courtBase.receiveShadow = true;
  courtBase.userData.noCast = true;
  g.add(courtBase);
  const galleryBase = new THREE.Mesh(new THREE.BoxGeometry(9.16, 0.18, 2.48), baseMat);
  galleryBase.position.set(1.05, -0.082, 6.12);
  galleryBase.receiveShadow = true;
  galleryBase.userData.noCast = true;
  g.add(galleryBase);

  addFloorPlane(g, COURT.width, COURT.length, 0, (f.frontZ + f.backZ) / 2, paintCourtFloor(f.frontZ), '#c9a36e', false);
  const stoneW = C.nicheOuterX - (f.leftX - 0.16);
  const stoneD = C.galleryEndZ - f.backZ;
  addFloorPlane(
    g, stoneW, stoneD,
    (C.nicheOuterX + f.leftX - 0.16) / 2,
    (C.galleryEndZ + f.backZ) / 2,
    paintStone(stoneW, stoneD),
    '#b3ada3',
  );

  for (const rect of floorMarkings(f.frontZ).rects) {
    const line = addBox(
      g, rect.x1 - rect.x0, 0.005, rect.z1 - rect.z0, ink,
      (rect.x0 + rect.x1) / 2, 0.027, (rect.z0 + rect.z1) / 2,
    );
    line.userData.noCast = true;
    line.userData.noReceive = true;
  }

  addBox(g, COURT.width + 0.44, ceil, 0.2, structure, 0, ceil / 2, f.frontZ - 0.11);
  addBox(g, COURT.width + 0.02, 1.78 - COURT.tinTop, 0.012, plaster, 0, (COURT.tinTop + 1.78) / 2, f.frontZ - 0.004);
  addBox(g, COURT.width + 0.02, ceil - (COURT.serviceLower + COURT.line), 0.012, above, 0, (COURT.serviceLower + COURT.line + ceil) / 2, f.frontZ - 0.004);
  addBox(g, COURT.width, 0.43, 0.012, toon(TIN), 0, 0.215, f.frontZ + 0.006);
  addTinCap(g, f, toon(INK));
  for (const x of [-1.05, 1.05]) {
    const seam = addBox(g, 0.008, 0.42, 0.004, toon('#5e2026'), x, 0.21, f.frontZ + 0.014);
    seam.userData.noCast = true;
  }
  const service = addBox(g, COURT.width, COURT.line, 0.008, ink, 0, COURT.serviceLower + COURT.line / 2, f.frontZ + 0.006);
  service.userData.noCast = true;
  const frontOut = addBox(g, COURT.width, COURT.line, 0.016, ink, 0, COURT.frontOutLower + COURT.line / 2, f.frontZ + 0.01);
  frontOut.userData.noCast = true;

  addBox(g, 0.2, ceil, f.backZ - (f.frontZ - 0.2), structure, f.leftX - 0.112, ceil / 2, (f.backZ + f.frontZ - 0.2) / 2);
  addBox(g, 0.014, ceil, f.backZ - f.frontZ + 0.02, plaster, f.leftX - 0.007, ceil / 2, (f.backZ + f.frontZ) / 2 - 0.01);
  addOutRibbon(g, f.leftX + 0.01, f.frontZ, COURT.frontOutLower, f.backZ, COURT.backOutLower, ink, 1);

  addBox(g, 0.2, ceil, C.rightCutZ - (f.frontZ - 0.16), structure, f.rightX + 0.112, ceil / 2, (C.rightCutZ + f.frontZ - 0.16) / 2);
  addBox(g, 0.014, ceil, C.rightCutZ - f.frontZ, plaster, f.rightX + 0.007, ceil / 2, (C.rightCutZ + f.frontZ) / 2);
  addOutRibbon(g, f.rightX - 0.01, f.frontZ, COURT.frontOutLower, C.rightCutZ, outY(C.rightCutZ, f.frontZ, f.backZ), ink, -1);
  addBox(g, 0.24, ceil + 0.02, 0.02, poche, f.rightX + 0.1, ceil / 2, C.rightCutZ + 0.01);

  addBox(g, COURT.width + 0.5, 0.08, f.backZ - (f.frontZ - 0.24), toon('#f6f3ec'), 0, ceil - 0.04, (f.backZ + f.frontZ - 0.24) / 2);
  addBox(g, 0.02, 0.08, f.backZ - f.frontZ, poche, f.rightX + 0.22, ceil - 0.04, (f.backZ + f.frontZ) / 2);

  for (const x of [-1.55, 0, 1.55]) {
    addBox(g, 0.16, 0.028, 6.5, metal, x, ceil - 0.09, -0.15);
    addBox(g, 0.07, 0.012, 6.2, toon('#fff6e4', { emissive: '#fff6e4', emissiveIntensity: 0.85 }), x, ceil - 0.1, -0.15);
    addPoint(g, 0xfff4e6, 0.42, 8.5, x, ceil - 0.45, -0.2);
  }

  const glassMat = makeGlassMaterial();
  addGlassBack(g, f, C, glassMat, metal, ink);

  addBox(g, COURT.width + 0.44, ceil - C.canopyY + 0.04, 0.16, structure, 0, (ceil + C.canopyY) / 2, f.backZ + 0.06);
  addBox(g, COURT.width, ceil - C.canopyY, 0.012, plaster, 0, (ceil + C.canopyY) / 2 + 0.02, f.backZ - 0.004);

  addBox(g, 0.18, C.galleryCeilingY, C.galleryEndZ - f.backZ + 0.04, gallery, f.leftX - 0.09, C.galleryCeilingY / 2, (C.galleryEndZ + f.backZ) / 2);
  addBox(g, 0.08, 0.09, C.galleryEndZ - f.backZ - 0.2, toon(WALNUT), f.leftX + 0.04, 0.045, (C.galleryEndZ + f.backZ) / 2 + 0.1);

  const pierZ = f.backZ + 0.16;
  addBox(g, C.nicheOuterX - f.rightX, C.galleryCeilingY, 0.16, gallery, (C.nicheOuterX + f.rightX) / 2, C.galleryCeilingY / 2, f.backZ + 0.08);
  addBox(g, 1.7, 2.15, 0.02, toon(GREEN), layout.zones.sign.x, 1.26, pierZ + 0.01);
  addBox(g, 0.16, C.galleryCeilingY, 1.35, gallery, C.nicheOuterX - 0.08, C.galleryCeilingY / 2, f.backZ + 0.75);

  addBox(g, C.nicheOuterX - f.leftX + 0.28, 0.1, 1.35, toon('#efe4d4'), (C.nicheOuterX + f.leftX) / 2, C.canopyY + 0.04, f.backZ + 0.62);
  addBox(g, C.nicheOuterX - f.leftX + 0.2, 0.06, 0.08, toon(WALNUT), (C.nicheOuterX + f.leftX) / 2, C.canopyY - 0.02, f.backZ + 1.28);
  addBox(g, C.nicheOuterX - f.leftX + 0.28, 0.1, 1.15, toon('#f3eee4'), (C.nicheOuterX + f.leftX) / 2, C.galleryCeilingY - 0.02, 6.62);
  addBox(g, C.nicheOuterX - f.leftX + 0.28, 0.1, 0.02, poche, (C.nicheOuterX + f.leftX) / 2, C.galleryCeilingY - 0.02, 7.18);

  for (const x of [-1.72, 1.58]) {
    addBox(g, 1.15, 0.02, 0.1, metal, x, C.canopyY - 0.02, 5.55);
    addBox(g, 0.92, 0.012, 0.045, toon('#ffe6c2', { emissive: '#ffe6c2', emissiveIntensity: 0.9 }), x, C.canopyY - 0.03, 5.55);
    addPoint(g, 0xffc896, 0.48, 3.8, x, C.canopyY - 0.2, 5.55);
  }

  return g;
}

function addGlassBack(g, f, C, glassMat, metal, ink) {
  const z = f.backZ;
  const y0 = 0.055;
  const yLine0 = COURT.backOutLower;
  const yLine1 = yLine0 + COURT.line;
  const y1 = C.canopyY - 0.04;
  const hinge = -C.door.width / 2;
  const posts = [f.leftX, -1.72, hinge, C.door.width / 2, 1.72, f.rightX];
  for (const x of posts) {
    const thick = Math.abs(Math.abs(x) - f.halfW) < 0.05 ? 0.07 : 0.046;
    addBox(g, thick, y1 - y0, 0.05, metal, x, (y0 + y1) / 2, z);
  }
  addBox(g, COURT.width + 0.08, 0.05, 0.07, metal, 0, 0.025, z);
  addBox(g, COURT.width + 0.08, 0.05, 0.08, metal, 0, y1, z);
  const rail = addBox(g, COURT.width, COURT.line, 0.02, ink, 0, (yLine0 + yLine1) / 2, z - 0.028);
  rail.userData.noCast = true;

  const openings = [[posts[0], posts[1]], [posts[1], posts[2]], [posts[3], posts[4]], [posts[4], posts[5]]];
  for (const [a, b] of openings) {
    addPane(g, a + 0.04, b - 0.04, y0 + 0.02, yLine0 - 0.012, z, glassMat);
    addPane(g, a + 0.04, b - 0.04, yLine1 + 0.012, y1 - 0.04, z, glassMat);
  }
  addPane(g, posts[2] + 0.04, posts[3] - 0.04, yLine1 + 0.012, y1 - 0.04, z, glassMat);

  const door = new THREE.Group();
  door.name = 'court-door';
  door.position.set(hinge, 0, z);
  door.rotation.y = 0.48;
  const dw = C.door.width;
  const dh = C.door.height;
  addBox(door, dw, 0.04, 0.04, metal, dw / 2, 0.045, 0);
  addBox(door, dw, 0.04, 0.04, metal, dw / 2, dh - 0.02, 0);
  addBox(door, 0.042, dh, 0.04, metal, 0.02, dh / 2, 0);
  addBox(door, 0.042, dh, 0.04, metal, dw - 0.021, dh / 2, 0);
  addPane(door, 0.07, dw - 0.07, 0.09, dh - 0.06, 0, glassMat);
  addBox(door, 0.02, 0.24, 0.018, toon(BRASS), dw - 0.11, 1.02, 0.032);
  g.add(door);
}

function makeRacket(rimHex, gripHex, throatHex) {
  const g = new THREE.Group();
  const rim = toon(rimHex);
  const hoop = new THREE.Mesh(new THREE.TorusGeometry(0.084, 0.0065, 6, 28), rim);
  hoop.scale.set(1.02, 1.32, 1);
  hoop.position.y = 0.49;
  g.add(hoop);
  if (!makeRacket.stringMat) {
    makeRacket.stringMat = toon('#f4eee2', {
      map: makeStringTexture(),
      transparent: true,
      opacity: 1,
      alphaTest: 0.35,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
  }
  const strings = new THREE.Mesh(new THREE.PlaneGeometry(0.132, 0.178), makeRacket.stringMat);
  strings.position.y = 0.495;
  g.add(strings);
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.0052, 0.006, 0.12, 8), rim);
  shaft.position.y = 0.255;
  g.add(shaft);
  const throat = toon(throatHex);
  for (const side of [-1, 1]) {
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.0042, 0.0048, 0.09, 6), throat);
    arm.position.set(side * 0.026, 0.325, 0);
    arm.rotation.z = side * -0.55;
    g.add(arm);
  }
  const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.0115, 0.0125, 0.16, 10), toon(gripHex));
  grip.position.y = 0.1;
  g.add(grip);
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.013, 0.011, 0.014, 10), toon('#1a1a1a'));
  cap.position.y = 0.016;
  g.add(cap);
  g.scale.setScalar(1.12);
  g.traverse((obj) => {
    if (obj.isMesh) {
      obj.castShadow = true;
      obj.receiveShadow = true;
    }
  });
  return g;
}

function addRack(g, x, z) {
  const rack = new THREE.Group();
  rack.name = 'racket-rack';
  rack.position.set(x, 0, z);
  rack.rotation.y = Math.PI / 2;
  const wood = toon(WALNUT);
  const top = toon(WALNUT_TOP);
  addBox(rack, 0.8, 0.56, 0.34, wood, 0, 0.28, 0.17);
  addBox(rack, 0.84, 0.035, 0.38, top, 0, 0.575, 0.18);
  addBox(rack, 0.8, 0.62, 0.02, wood, 0, 0.9, 0.012);
  addBox(rack, 0.78, 0.02, 0.03, top, 0, 0.6, 0.34);
  const sets = [
    ['#2c3136', '#5c4030', INK],
    ['#2c3136', '#5c4030', '#d8c7a4'],
    ['#1d3330', '#4a3828', BRASS],
  ];
  sets.forEach((colors, i) => {
    const racket = makeRacket(...colors);
    racket.position.set(-0.24 + i * 0.24, 0.6, 0.16);
    racket.rotation.y = -0.08 + i * 0.07;
    racket.rotation.z = -0.03 + i * 0.025;
    rack.add(racket);
  });
  const tray = toon('#4e3428');
  addBox(rack, 0.28, 0.025, 0.12, tray, 0.22, 0.61, 0.28);
  for (let i = 0; i < 4; i += 1) {
    const ball = addSphere(rack, 0.021, toon('#161616'), 0.14 + (i % 2) * 0.05, 0.655, 0.25 + Math.floor(i / 2) * 0.045, 10);
    ball.castShadow = true;
    addSphere(rack, 0.006, toon('#e4c24a'), ball.position.x + 0.01, 0.668, ball.position.z, 6);
  }
  g.add(rack);
}

function addDesk(g, zone) {
  const wood = toon(WALNUT);
  const top = toon(WALNUT_TOP);
  const x = zone.x;
  const z = zone.z;
  const y = zone.y;
  addBox(g, zone.w, 0.045, zone.d, top, x, y - 0.02, z);
  addBox(g, zone.w - 0.18, 0.008, zone.d - 0.16, toon('#5a302c'), x, y + 0.008, z - 0.02);
  const leg = 0.05;
  const legH = y - 0.044;
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      addBox(
        g, leg, legH, leg, wood,
        x + sx * (zone.w / 2 - 0.08),
        legH / 2,
        z + sz * (zone.d / 2 - 0.08),
      );
    }
  }
  addBox(g, zone.w - 0.2, 0.08, 0.02, wood, x, y - 0.09, z + zone.d / 2 - 0.1);
  addBox(g, zone.w - 0.28, 0.006, 0.008, toon(BRASS), x, y - 0.05, z + zone.d / 2 - 0.084);
  addBox(g, 0.24, 0.018, 0.16, toon('#3d2a24'), x - 0.08, y + 0.02, z + 0.06);
  addBox(g, 0.22, 0.012, 0.15, toon('#6a4a38'), x - 0.08, y + 0.034, z + 0.05);
  addSphere(g, 0.02, toon('#1a1a1a'), x + 0.16, y + 0.03, z + 0.08, 10);
  addSphere(g, 0.005, toon('#e4c24a'), x + 0.168, y + 0.048, z + 0.08, 6);
}

function addSign(g, zone, pierZ) {
  const tex = makeSignTexture();
  const face = toon('#f4ecdf', {
    map: tex,
    emissive: '#fff8ee',
    emissiveMap: tex,
    emissiveIntensity: 0.42,
  });
  const board = addBox(g, zone.w, zone.h, 0.02, face, zone.x, zone.y, pierZ + 0.03);
  board.userData.noCast = true;
  addBox(g, zone.w + 0.06, zone.h + 0.06, 0.018, toon(WALNUT), zone.x, zone.y, pierZ + 0.016);
  addBox(g, 0.72, 0.028, 0.04, toon(BRASS), zone.x, zone.y + zone.h / 2 + 0.08, pierZ + 0.04);
  addBox(
    g, 0.58, 0.012, 0.02,
    toon('#fff1d4', { emissive: '#fff1d4', emissiveIntensity: 1 }),
    zone.x, zone.y + zone.h / 2 + 0.055, pierZ + 0.05,
  );
  addPoint(g, 0xffd2a8, 0.55, 2.8, zone.x, zone.y + 0.15, pierZ + 0.45);
}

function makeProcedural(layout) {
  const g = new THREE.Group();
  g.name = 'procedural';
  const C = layout.meta.court;
  const f = frame(C.frontZ);
  addDesk(g, layout.zones.desk);
  addRack(g, layout.zones.rack.x, layout.zones.rack.z);
  addSign(g, layout.zones.sign, f.backZ + 0.16);
  const pot = layout.instances.find((item) => item.id === 'desk_plant');
  addCyl(g, 0.01, 0.014, 0.14, toon('#3d4a32'), pot.position[0], pot.position[1] + 0.28, pot.position[2], 6);
  addSphere(g, 0.07, toon('#2c5840'), pot.position[0], pot.position[1] + 0.4, pot.position[2], 12);
  addSphere(g, 0.045, toon('#3e6b4c'), pot.position[0] + 0.035, pot.position[1] + 0.45, pot.position[2] + 0.015, 10);
  const lamp = layout.instances.find((item) => item.id === 'desk_lamp');
  addSphere(
    g, 0.028,
    toon('#fff3cc', { emissive: '#fff3cc', emissiveIntensity: 1.15 }),
    lamp.position[0] - 0.01, lamp.position[1] + 0.3, lamp.position[2] + 0.02, 10,
  );
  addPoint(g, 0xffc98a, 0.32, 2.3, lamp.position[0], lamp.position[1] + 0.34, lamp.position[2]);

  for (const inst of layout.instances) {
    if (inst.kind === 'museum_bench') shadowBlob(g, inst.position[0], inst.position[2], 1.7, 0.7, 0.42);
  }
  shadowBlob(g, layout.zones.desk.x, layout.zones.desk.z, 1.45, 0.8, 0.4);
  const chair = layout.instances.find((item) => item.id === 'reception_chair');
  shadowBlob(g, chair.position[0], chair.position[2], 0.55, 0.55, 0.36);
  shadowBlob(g, layout.zones.rack.x + 0.18, layout.zones.rack.z, 0.5, 0.95, 0.36);
  return g;
}

function tuneAsset(kind, root) {
  if (kind !== 'library_lamp') return;
  root.traverse((obj) => {
    if (!obj.isMesh) return;
    const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
    for (const mat of mats) {
      if (!mat || !mat.color || !mat.emissive) continue;
      if (mat.color.g > mat.color.r * 1.15 && mat.color.g > 0.25) {
        mat.emissive.copy(mat.color).multiplyScalar(0.45);
        mat.emissiveIntensity = 1;
      }
    }
  });
}

boot({
  makeShell,
  makeProcedural,
  tuneAsset,
  readyText: 'ready — ash court squash · drag orbit · U unlit · T toon',
});
