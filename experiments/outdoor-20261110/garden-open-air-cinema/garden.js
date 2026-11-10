import * as THREE from 'three';
import { boot, toon, addBox, addCyl } from './scene_lib.js';
import { analyze, expandChairs } from './placement.js';

const STRIPES = {
  terracotta: ['#c45648', '#f3e6d2'],
  teal: ['#2a6c74', '#f4f1e8'],
  ochre: ['#d19a3c', '#f7f3e6'],
  navy: ['#2c3d5c', '#e5dfd2'],
};

const stripeCache = new Map();
let brickBase = null;
let plankBase = null;

function canvasTex(canvas) {
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function stripeTex(name) {
  if (stripeCache.has(name)) return stripeCache.get(name);
  const colors = STRIPES[name];
  if (!colors) throw new Error(`unknown deckchair stripe ${name}`);
  const c = document.createElement('canvas');
  c.width = 64;
  c.height = 32;
  const g = c.getContext('2d');
  const band = c.width / colors.length / 1;
  for (let i = 0; i < 4; i++) {
    g.fillStyle = colors[i % 2];
    g.fillRect(i * (c.width / 4), 0, c.width / 4 + 1, c.height);
  }
  const tex = canvasTex(c);
  stripeCache.set(name, tex);
  return tex;
}

function brickTexture() {
  if (brickBase) return brickBase;
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 64;
  const g = c.getContext('2d');
  g.fillStyle = '#cbb8a4';
  g.fillRect(0, 0, 128, 64);
  const rows = 4;
  const bh = 64 / rows;
  for (let r = 0; r < rows; r++) {
    const offset = r % 2 ? 16 : 0;
    for (let x = -32; x < 160; x += 32) {
      g.fillStyle = (r + x / 16) % 5 === 0 ? '#6e4038' : (r % 2 ? '#8a5144' : '#7a483c');
      g.fillRect(x + offset + 1, r * bh + 1, 30, bh - 2);
    }
  }
  brickBase = canvasTex(c);
  brickBase.wrapS = brickBase.wrapT = THREE.RepeatWrapping;
  return brickBase;
}

function brickMat(len, h) {
  const tex = brickTexture().clone();
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.repeat.set(Math.max(len / 0.52, 0.5), Math.max(h / 0.17, 0.5));
  tex.needsUpdate = true;
  return toon('#ffffff', { map: tex });
}

function plankTexture() {
  if (plankBase) return plankBase;
  const c = document.createElement('canvas');
  c.width = 64;
  c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = '#6b4a32';
  g.fillRect(0, 0, 64, 128);
  for (let y = 0; y < 128; y += 16) {
    g.fillStyle = y % 32 === 0 ? '#5a3c28' : '#7a5640';
    g.fillRect(0, y, 64, 14);
    g.fillStyle = '#3e2c20';
    g.fillRect(0, y + 14, 64, 2);
  }
  plankBase = canvasTex(c);
  plankBase.wrapS = plankBase.wrapT = THREE.RepeatWrapping;
  return plankBase;
}

function labelTex(line1, line2, bg, fg) {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 160;
  const g = c.getContext('2d');
  g.fillStyle = bg;
  g.fillRect(0, 0, 256, 160);
  g.strokeStyle = fg;
  g.lineWidth = 8;
  g.strokeRect(10, 10, 236, 140);
  g.fillStyle = fg;
  g.textAlign = 'center';
  g.font = '700 46px sans-serif';
  g.fillText(line1, 128, 72);
  g.font = '700 36px sans-serif';
  g.fillText(line2, 128, 118);
  return canvasTex(c);
}

function screenTexture() {
  const w = 640;
  const h = 360;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const g = c.getContext('2d');
  const sky = g.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, '#241c4a');
  sky.addColorStop(0.42, '#5c4578');
  sky.addColorStop(0.62, '#d4896a');
  sky.addColorStop(0.78, '#e7b48a');
  sky.addColorStop(1, '#1d3a44');
  g.fillStyle = sky;
  g.fillRect(0, 0, w, h);
  const sun = g.createRadialGradient(w * 0.72, h * 0.34, 8, w * 0.72, h * 0.34, w * 0.22);
  sun.addColorStop(0, 'rgba(255, 226, 186, 0.95)');
  sun.addColorStop(0.45, 'rgba(232, 156, 112, 0.55)');
  sun.addColorStop(1, 'rgba(232, 156, 112, 0)');
  g.fillStyle = sun;
  g.beginPath();
  g.arc(w * 0.72, h * 0.34, w * 0.22, 0, Math.PI * 2);
  g.fill();
  g.strokeStyle = 'rgba(120, 186, 176, 0.55)';
  g.lineWidth = 16;
  g.beginPath();
  g.arc(w * 0.28, h * 0.58, 120, Math.PI * 0.9, Math.PI * 1.75);
  g.stroke();
  g.strokeStyle = 'rgba(244, 220, 190, 0.35)';
  g.lineWidth = 8;
  g.beginPath();
  g.arc(w * 0.48, h * 0.42, 70, 0.2, 2.4);
  g.stroke();
  g.fillStyle = 'rgba(196, 92, 70, 0.38)';
  g.fillRect(w * 0.08, h * 0.56, w * 0.2, h * 0.07);
  g.fillStyle = 'rgba(64, 108, 132, 0.4)';
  g.fillRect(w * 0.12, h * 0.66, w * 0.14, h * 0.045);
  g.fillStyle = '#1b3a40';
  g.beginPath();
  g.moveTo(0, h);
  g.quadraticCurveTo(w * 0.22, h * 0.62, w * 0.48, h * 0.76);
  g.quadraticCurveTo(w * 0.72, h * 0.9, w, h * 0.64);
  g.lineTo(w, h);
  g.fill();
  g.fillStyle = '#163238';
  g.beginPath();
  g.moveTo(0, h);
  g.quadraticCurveTo(w * 0.3, h * 0.78, w * 0.62, h * 0.86);
  g.quadraticCurveTo(w * 0.82, h * 0.94, w, h * 0.8);
  g.lineTo(w, h);
  g.fill();
  g.fillStyle = 'rgba(236, 214, 170, 0.8)';
  for (let i = 0; i < 18; i++) {
    const x = (i * 97) % w;
    const y = (i * 53) % Math.floor(h * 0.4);
    g.fillRect(x, y, 2, 2);
  }
  return canvasTex(c);
}

function named(mesh, name) {
  mesh.name = name;
  return mesh;
}

function strut(g, a, b, thickness, mat, name) {
  const A = new THREE.Vector3(...a);
  const B = new THREE.Vector3(...b);
  const dir = B.clone().sub(A);
  const len = Math.max(dir.length(), 0.001);
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(thickness, thickness, len), mat);
  mesh.position.copy(A).add(B).multiplyScalar(0.5);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), dir.normalize());
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  if (name) mesh.name = name;
  g.add(mesh);
  return mesh;
}

function pole(g, a, b, r0, r1, mat, name, segs = 8) {
  const A = new THREE.Vector3(...a);
  const B = new THREE.Vector3(...b);
  const dir = B.clone().sub(A);
  const len = Math.max(dir.length(), 0.001);
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(r1, r0, len, segs), mat);
  mesh.position.copy(A).add(B).multiplyScalar(0.5);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  if (name) mesh.name = name;
  g.add(mesh);
  return mesh;
}

function slingGeometry(width, p0, p1, sag) {
  const seg = 12;
  const pos = [];
  const uv = [];
  const idx = [];
  for (let i = 0; i <= seg; i++) {
    const t = i / seg;
    const z = p0.z + (p1.z - p0.z) * t;
    const y = p0.y + (p1.y - p0.y) * t - Math.sin(Math.PI * t) * sag;
    pos.push(-width / 2, y, z, width / 2, y, z);
    uv.push(0, t, 1, t);
  }
  for (let i = 0; i < seg; i++) {
    const a = i * 2;
    const c = a + 2;
    const d = a + 3;
    idx.push(a, a + 1, d, a, d, c);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  return geo;
}

function makeDeckchair(stripe, spec) {
  const g = new THREE.Group();
  const wood = toon('#6d4b34');
  const dark = toon('#4a3226');
  const fx = spec.frameX;
  const foot = spec.foot;
  const back = spec.back;
  const fg = spec.frontGround;
  const rg = spec.rearGround;
  for (const x of [-fx, fx]) {
    strut(g, [x, fg[1], fg[2]], [x, back[1], back[2]], 0.034, wood, 'frame');
    strut(g, [x, rg[1], rg[2]], [x, foot[1], foot[2]], 0.034, wood, 'frame');
    named(addBox(g, 0.07, 0.04, 0.11, dark, x, 0.02, fg[2]), 'frame');
    named(addBox(g, 0.07, 0.04, 0.11, dark, x, 0.02, rg[2]), 'frame');
  }
  strut(g, [-fx, back[1], back[2]], [fx, back[1], back[2]], 0.028, dark, 'frame');
  strut(g, [-fx, foot[1], foot[2]], [fx, foot[1], foot[2]], 0.028, dark, 'frame');
  strut(g, [-fx, 0.36, -0.2], [fx, 0.36, -0.2], 0.022, dark, 'frame');
  const sling = new THREE.Mesh(
    slingGeometry(fx * 2 - 0.02, { y: back[1] - 0.02, z: back[2] }, { y: foot[1], z: foot[2] }, 0.04),
    toon('#ffffff', { map: stripeTex(stripe), side: THREE.DoubleSide }),
  );
  sling.castShadow = true;
  sling.receiveShadow = true;
  sling.name = 'sling';
  g.add(sling);
  const backM = new THREE.Object3D();
  backM.name = 'backrest';
  backM.position.set(back[0], back[1], back[2]);
  const footM = new THREE.Object3D();
  footM.name = 'foot';
  footM.position.set(foot[0], foot[1], foot[2]);
  g.add(backM, footM);
  return g;
}

function fabricGeometry(w, h) {
  const segX = 28;
  const segY = 14;
  const pos = [];
  const uv = [];
  const idx = [];
  for (let iy = 0; iy <= segY; iy++) {
    const v = iy / segY;
    for (let ix = 0; ix <= segX; ix++) {
      const u = ix / segX;
      const x = -w / 2 + u * w;
      const y = -h / 2 + v * h;
      const edge = Math.sin(Math.PI * u);
      const ySag = edge * (0.055 + (v < 0.08 || v > 0.92 ? 0.06 : 0.02));
      const belly = edge * Math.sin(Math.PI * v) * 0.11;
      pos.push(x, y - ySag, belly);
      uv.push(u, v);
    }
  }
  const row = segX + 1;
  for (let iy = 0; iy < segY; iy++) {
    for (let ix = 0; ix < segX; ix++) {
      const a = iy * row + ix;
      const d = a + row + 1;
      const c = a + row;
      idx.push(a, a + 1, d, a, d, c);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  return geo;
}

function makeScreen(g, site) {
  const sc = site.screen;
  const group = new THREE.Group();
  group.name = 'screen';
  group.position.set(sc.center[0], sc.center[1], sc.center[2]);
  const geo = fabricGeometry(sc.width, sc.height);
  const tex = screenTexture();
  const fabric = new THREE.Mesh(geo, toon('#241e2c', {
    map: tex,
    emissive: '#ffffff',
    emissiveMap: tex,
    emissiveIntensity: 0.68,
    side: THREE.FrontSide,
  }));
  fabric.name = 'screen-fabric';
  fabric.userData.noShadow = true;
  group.add(fabric);
  const backer = new THREE.Mesh(geo.clone(), toon('#d4cbb8', { side: THREE.BackSide }));
  backer.name = 'screen-hem';
  backer.position.z = -0.025;
  backer.userData.noShadow = true;
  group.add(backer);
  g.add(group);

  const metal = toon('#4c5560');
  const steel = toon('#2e343c');
  const guyMat = toon('#2a2624');
  const half = sc.width / 2;
  const topY = sc.center[1] + sc.height / 2 + 0.38;
  for (const s of [-1, 1]) {
    const base = [s * (half + 0.5), site.lawnY, sc.center[2] - 0.06];
    const top = [s * (half + 0.74), topY, sc.center[2] + 0.1];
    pole(g, base, top, 0.055, 0.04, metal, 'screen-mast', 8);
    named(addBox(g, 0.42, 0.04, 0.42, steel, base[0], site.lawnY + 0.02, base[2]), 'screen-mast');
    const guys = [
      [s * (half + 1.7), site.lawnY, sc.center[2] + 0.95],
      [s * (half + 1.15), site.lawnY, sc.center[2] - 0.85],
      [s * (half + 2.05), site.lawnY, sc.center[2] - 0.45],
    ];
    for (const end of guys) {
      const w = pole(g, top, end, 0.006, 0.006, guyMat, 'guy', 4);
      w.userData.noCast = true;
      named(addCyl(g, 0.02, 0.02, 0.05, steel, end[0], site.lawnY + 0.03, end[2], 6), 'guy');
    }
    for (let k = 0; k < 4; k++) {
      const y = sc.center[1] - sc.height / 2 + 0.35 + k * ((sc.height - 0.5) / 3);
      const strap = pole(
        g,
        [s * half, y, sc.center[2] + 0.02],
        [s * (half + 0.48), y + 0.04, sc.center[2] - 0.02],
        0.008, 0.008, steel, 'screen-hem', 4,
      );
      strap.userData.noCast = true;
    }
  }
  const hemMat = toon('#262a30');
  for (const edgeY of [sc.height / 2 - 0.02, -sc.height / 2 + 0.02]) {
    const pts = [];
    for (let i = 0; i <= 16; i++) {
      const u = i / 16;
      const x = -half + u * sc.width;
      const sag = Math.sin(Math.PI * u) * (edgeY > 0 ? 0.08 : 0.05);
      pts.push(new THREE.Vector3(x, edgeY - sag, Math.sin(Math.PI * u) * 0.06));
    }
    const tube = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 24, 0.016, 5, false), hemMat);
    tube.name = 'screen-hem';
    tube.userData.noCast = true;
    group.add(tube);
  }
  return { topY };
}

function makeBooth(g, site) {
  const b = site.booth;
  const [x0, y0, z0] = b.min;
  const [x1, y1, z1] = b.max;
  const cx = (x0 + x1) / 2;
  const cz = (z0 + z1) / 2;
  const planks = plankTexture().clone();
  planks.wrapS = planks.wrapT = THREE.RepeatWrapping;
  planks.repeat.set(2, 4);
  planks.colorSpace = THREE.SRGBColorSpace;
  planks.needsUpdate = true;
  const timber = toon('#ffffff', { map: planks });
  const dark = toon('#3a2e28');
  named(addBox(g, x1 - x0, 0.08, z1 - z0, dark, cx, y0 + 0.04, cz), 'booth');
  named(addBox(g, x1 - x0, (y1 - y0) - 0.28, 0.08, timber, cx, y0 + (y1 - y0) * 0.48, z1 - 0.05), 'booth');
  named(addBox(g, 0.08, (y1 - y0) - 0.28, (z1 - z0) - 0.12, timber, x1 - 0.05, y0 + (y1 - y0) * 0.48, cz), 'booth');
  named(addBox(g, 0.08, (y1 - y0) - 0.28, (z1 - z0) - 0.16, timber, x0 + 0.05, y0 + (y1 - y0) * 0.48, cz + 0.04), 'booth');
  named(addBox(g, 0.045, 1.4, 0.58, toon('#4a3428'), x0 - 0.01, y0 + 0.72, cz - 0.2), 'booth');

  const winW = 0.72;
  const winH = 0.4;
  const winY = 1.58;
  const frontZ = z0 + 0.05;
  const frontH = (y1 - y0) - 0.32;
  const frontTop = y0 + frontH;
  named(addBox(g, (x1 - x0) - 0.16, winY - winH / 2 - y0, 0.08, timber, cx, y0 + (winY - winH / 2 - y0) / 2, frontZ), 'booth');
  const above = frontTop - (winY + winH / 2);
  named(addBox(g, (x1 - x0) - 0.16, Math.max(above, 0.08), 0.08, timber, cx, winY + winH / 2 + above / 2, frontZ), 'booth');
  const sideW = ((x1 - x0) - 0.16 - winW) / 2;
  named(addBox(g, sideW, winH, 0.08, timber, x0 + 0.08 + sideW / 2, winY, frontZ), 'booth');
  named(addBox(g, sideW, winH, 0.08, timber, x1 - 0.08 - sideW / 2, winY, frontZ), 'booth');
  named(addBox(g, winW + 0.1, 0.05, 0.18, toon('#d9d0c2'), cx, winY - winH / 2, frontZ - 0.04), 'booth');

  const roof = named(addBox(g, (x1 - x0) + 0.28, 0.07, (z1 - z0) + 0.28, toon('#3e444c'), cx, y1 - 0.2, cz + 0.02), 'booth');
  roof.rotation.x = -0.14;

  const proj = new THREE.Group();
  proj.name = 'booth';
  proj.position.set(cx, winY, frontZ - 0.62);
  proj.rotation.x = 0.1;
  named(addBox(proj, 0.5, 0.2, 0.52, toon('#3a4148'), 0, 0, 0.06), 'projector');
  const lens = named(addCyl(proj, 0.08, 0.1, 0.26, toon('#1c2026'), 0, 0, -0.36, 12), 'projector');
  lens.rotation.x = -Math.PI / 2;
  const glass = named(addCyl(proj, 0.055, 0.055, 0.03, toon('#d5eef4', { emissive: '#b7e4ee', emissiveIntensity: 0.75 }), 0, 0, -0.5, 12), 'projector');
  glass.rotation.x = -Math.PI / 2;
  glass.userData.noShadow = true;
  g.add(proj);

  const glow = named(addBox(g, 0.45, 0.32, 0.02, toon('#ffc090', { emissive: '#ffb080', emissiveIntensity: 0.5 }), cx, winY, z1 - 0.16), 'lantern');
  glow.userData.noShadow = true;
  named(addBox(g, 0.7, 0.06, 0.4, toon('#cfc4b0'), cx - 0.15, y0 + 0.03, z0 - 0.12), 'booth');
}

function makeCart(g, site) {
  const c = site.cart;
  const y = site.pathTop;
  const cx = (c.min[0] + c.max[0]) / 2;
  const cz = (c.min[2] + c.max[2]) / 2;
  const W = (c.max[0] - c.min[0]) * 0.9;
  const D = (c.max[2] - c.min[2]) * 0.88;
  const grp = new THREE.Group();
  grp.name = 'cart';
  grp.position.set(cx, y, cz);
  const wood = toon('#7a5438');
  const dark = toon('#4a3428');
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const wheel = named(addCyl(grp, 0.15, 0.15, 0.05, toon('#2a2c30'), sx * W * 0.36, 0.15, sz * D * 0.34, 12), 'cart');
      wheel.rotation.z = Math.PI / 2;
      const hub = named(addCyl(grp, 0.045, 0.045, 0.06, toon('#d2c2a4'), sx * W * 0.36, 0.15, sz * D * 0.34, 8), 'cart');
      hub.rotation.z = Math.PI / 2;
    }
  }
  named(addBox(grp, W * 0.84, 0.04, D * 0.72, toon('#6b4632'), 0, 0.4, 0), 'cart');
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      named(addBox(grp, 0.045, 0.58, 0.045, dark, sx * W * 0.38, 0.46, sz * D * 0.36), 'cart');
    }
  }
  named(addBox(grp, W, 0.05, D, wood, 0, 0.76, 0), 'cart');
  named(addBox(grp, W, 0.07, 0.03, dark, 0, 0.86, D / 2 - 0.02), 'cart');
  named(addBox(grp, W, 0.07, 0.03, dark, 0, 0.86, -D / 2 + 0.02), 'cart');
  named(addBox(grp, 0.03, 0.12, D, dark, -W / 2, 0.86, 0), 'cart');
  named(addBox(grp, 0.035, 0.46, 0.035, dark, W * 0.46, 0.95, D * 0.28), 'cart');
  named(addBox(grp, 0.035, 0.46, 0.035, dark, W * 0.46, 0.95, -D * 0.28), 'cart');
  named(addBox(grp, 0.04, 0.04, D * 0.62, toon('#d2c2a4'), W * 0.46, 1.16, 0), 'cart');
  named(addBox(grp, 0.04, 0.62, 0.04, dark, -W * 0.38, 1.12, D * 0.36), 'cart');
  named(addBox(grp, 0.04, 0.62, 0.04, dark, -W * 0.38, 1.12, -D * 0.36), 'cart');
  const awning = named(addBox(grp, W * 1.02, 0.03, D * 0.95, toon('#ffffff', { map: stripeTex('terracotta'), side: THREE.DoubleSide }), -0.02, 1.46, 0), 'cart');
  awning.rotation.z = 0.06;
  const bottles = [[-0.1, 0.1, '#b94a42'], [0.02, 0.16, '#e6c56a'], [0.14, 0.02, '#d7e0da'], [-0.02, -0.14, '#6a8f55']];
  for (const [bx, bz, col] of bottles) {
    named(addCyl(grp, 0.028, 0.034, 0.2, toon(col), bx, 0.885, bz, 8), 'cart');
    named(addCyl(grp, 0.014, 0.014, 0.035, toon('#c4a06a'), bx, 1.0, bz, 6), 'cart');
  }
  named(addBox(grp, 0.02, 0.26, 0.34, toon('#ffffff', { map: labelTex('TEA', 'CORDIAL', '#24342c', '#f3ead7') }), W * 0.5, 0.95, 0), 'cart');
  const flags = ['#c45648', '#f3e6d2', '#2a6c74', '#d19a3c', '#2c3d5c'];
  flags.forEach((col, i) => {
    const p = named(addCyl(grp, 0.001, 0.055, 0.11, toon(col), -0.22 + i * 0.1, 1.36, D * 0.28), 'cart');
    p.rotation.z = Math.PI;
  });
  g.add(grp);
}

function makeCable(g, site) {
  const timber = toon('#4a3c30');
  const cable = toon('#1a1c1e');
  const c = site.cable;
  const z0 = Math.min(c.z0, c.z1);
  const z1 = Math.max(c.z0, c.z1);
  const y = site.pathTop + 0.035;
  named(addBox(g, c.halfWidth * 2.6, 0.065, z1 - z0, timber, c.x, y, (z0 + z1) / 2), 'cable');
  named(addBox(g, 0.045, 0.02, z1 - z0, toon('#cbb892'), c.x, y + 0.04, (z0 + z1) / 2), 'cable');
  for (let z = z0 + 1.4; z < z1 - 0.3; z += 2.5) {
    named(addBox(g, 0.03, 0.03, 0.22, cable, c.x, y + 0.03, z), 'cable');
  }
  const booth = site.booth;
  const drop = pole(
    g,
    [(booth.min[0] + booth.max[0]) / 2, 1.42, booth.min[2] - 0.7],
    [c.x, y + 0.02, z1 - 0.05],
    0.014, 0.014, cable, 'cable', 6,
  );
  drop.userData.noCast = true;
  const lat = site.cableLateral;
  const x0 = Math.min(lat.x0, lat.x1);
  const x1 = Math.max(lat.x0, lat.x1);
  named(addBox(g, x1 - x0, 0.065, lat.halfWidth * 2.4, timber, (x0 + x1) / 2, y, lat.z), 'cable');
  named(addBox(g, 0.06, 0.45, 0.06, toon('#3a4048'), lat.x0, site.lawnY + 0.28, lat.z), 'cable');
  named(addCyl(g, 0.012, 0.012, 0.35, cable, lat.x0, site.lawnY + 0.22, lat.z, 6), 'cable');
}

function addFestoon(g, a, b, sag, spacing, bulbMat, wireMat) {
  const pts = [];
  const n = 20;
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const p = new THREE.Vector3().lerpVectors(a, b, t);
    p.y -= Math.sin(Math.PI * t) * sag;
    pts.push(p);
  }
  const curve = new THREE.CatmullRomCurve3(pts);
  const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, n, 0.006, 5, false), wireMat);
  tube.name = 'festoon-wire';
  tube.userData.noShadow = true;
  g.add(tube);
  const count = Math.max(2, Math.round(curve.getLength() / spacing));
  for (let i = 0; i <= count; i++) {
    const p = curve.getPoint(i / count);
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.036, 8, 6), bulbMat);
    bulb.position.copy(p);
    bulb.position.y -= 0.02;
    bulb.name = 'bulb';
    bulb.userData.noShadow = true;
    g.add(bulb);
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.016, 0.028, 6), wireMat);
    cap.position.copy(p);
    cap.position.y += 0.01;
    cap.name = 'bulb';
    cap.userData.noShadow = true;
    g.add(cap);
  }
}

function shadeHex(hex, f) {
  return new THREE.Color(hex).multiplyScalar(f);
}

function shrub(g, x, y, z, s, hex) {
  const col = new THREE.Color(hex);
  const parts = [
    [0, 0.22, 0, 0.34, 0.22, 0.3],
    [0.16, 0.32, -0.08, 0.2, 0.16, 0.18],
    [-0.14, 0.18, 0.1, 0.18, 0.14, 0.16],
    [0.05, 0.4, 0.04, 0.14, 0.12, 0.13],
  ];
  parts.forEach((p, i) => {
    const m = new THREE.Mesh(new THREE.SphereGeometry(1, 7, 5), toon(i === 3 ? shadeHex(hex, 1.18) : col));
    m.scale.set(p[3] * s, p[4] * s, p[5] * s);
    m.position.set(x + p[0] * s, y + p[1] * s, z + p[2] * s);
    m.name = 'plant';
    g.add(m);
  });
}

function canopyLayer(g, x, y, z, rx, ry, rz, hex, spin) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(1, 6, 5), toon(hex));
  m.scale.set(rx, ry, rz);
  m.position.set(x, y, z);
  m.rotation.y = spin;
  m.name = 'plant';
  g.add(m);
  return m;
}

function tree(g, x, y, z, s, hex, form = 'broad') {
  const h = (form === 'tall' ? 3.15 : 2.35) * s;
  const trunk = toon('#5a3d2c');
  const fork = form === 'tall' ? 0.55 : 0.42;
  pole(g, [x, y, z], [x + 0.02 * s, y + h * fork, z], 0.08 * s, 0.045 * s, trunk, 'plant', 6);
  const arms = form === 'tall'
    ? [[0.22, 0.78, 0.05], [-0.18, 0.7, -0.08], [0.04, 0.92, 0.12]]
    : [[0.55, 0.62, 0.18], [-0.48, 0.58, -0.22], [0.12, 0.78, -0.4], [-0.16, 0.74, 0.36]];
  arms.forEach((t) => {
    pole(
      g,
      [x, y + h * (fork - 0.04), z],
      [x + t[0] * s, y + t[1] * h, z + t[2] * s],
      0.028 * s, 0.014 * s, trunk, 'plant', 5,
    );
  });
  const leaf = new THREE.Color(hex);
  const dark = shadeHex(hex, 0.72);
  if (form === 'tall') {
    canopyLayer(g, x, y + h * 0.66, z, 0.42 * s, 0.16 * s, 0.36 * s, dark, 0.4);
    canopyLayer(g, x + 0.12 * s, y + h * 0.82, z - 0.05 * s, 0.28 * s, 0.18 * s, 0.24 * s, leaf, 1);
    canopyLayer(g, x - 0.1 * s, y + h * 0.9, z + 0.08 * s, 0.18 * s, 0.2 * s, 0.16 * s, shadeHex(hex, 1.1), 0.2);
  } else {
    canopyLayer(g, x + 0.05 * s, y + h * 0.6, z, 0.85 * s, 0.16 * s, 0.62 * s, dark, 0.5);
    canopyLayer(g, x - 0.28 * s, y + h * 0.72, z + 0.12 * s, 0.42 * s, 0.14 * s, 0.34 * s, leaf, 0.8);
    canopyLayer(g, x + 0.32 * s, y + h * 0.7, z - 0.16 * s, 0.38 * s, 0.13 * s, 0.3 * s, shadeHex(hex, 0.88), 0.2);
    canopyLayer(g, x, y + h * 0.84, z - 0.05 * s, 0.3 * s, 0.12 * s, 0.26 * s, shadeHex(hex, 1.08), 1.2);
  }
}

function cypress(g, x, y, z, s) {
  pole(g, [x, y, z], [x, y + 0.35 * s, z], 0.05 * s, 0.035 * s, toon('#4a3828'), 'plant', 5);
  ['#1e3c32', '#2a5242', '#244838'].forEach((col, i) => {
    const cone = new THREE.Mesh(new THREE.ConeGeometry((0.28 - i * 0.06) * s, 0.72 * s, 7), toon(col));
    cone.position.set(x + (i - 1) * 0.02, y + (0.55 + i * 0.42) * s, z);
    cone.name = 'plant';
    g.add(cone);
  });
}

function grass(g, x, y, z, s, hex) {
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2 + 0.4;
    const h = (0.32 + (i % 3) * 0.08) * s;
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.018 * s, h, 0.05 * s), toon(i % 2 ? hex : '#6d8a48'));
    m.position.set(x + Math.cos(a) * 0.08 * s, y + h * 0.45, z + Math.sin(a) * 0.08 * s);
    m.rotation.z = Math.cos(a) * 0.4;
    m.rotation.x = Math.sin(a) * 0.28;
    m.name = 'plant';
    g.add(m);
  }
}

function lavender(g, x, y, z, s) {
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const px = x + Math.cos(a) * 0.07 * s;
    const pz = z + Math.sin(a) * 0.07 * s;
    const h = (0.34 + (i % 3) * 0.07) * s;
    pole(g, [px, y, pz], [px, y + h, pz], 0.008, 0.006, toon('#4a5a34'), 'plant', 4);
    const fl = new THREE.Mesh(new THREE.ConeGeometry(0.028 * s, 0.12 * s, 6), toon(i % 2 ? '#8d7eae' : '#b0a0cc'));
    fl.position.set(px, y + h + 0.04 * s, pz);
    fl.name = 'plant';
    g.add(fl);
  }
}

function daisy(g, x, y, z, s, petal) {
  const stemH = 0.36 * s;
  pole(g, [x, y, z], [x, y + stemH, z], 0.01, 0.008, toon('#3e5a32'), 'plant', 5);
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2;
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.055 * s, 0.012 * s, 0.13 * s), toon(petal));
    m.position.set(x + Math.cos(a) * 0.07 * s, y + stemH, z + Math.sin(a) * 0.07 * s);
    m.rotation.y = -a;
    m.name = 'plant';
    g.add(m);
  }
  const center = new THREE.Mesh(new THREE.SphereGeometry(0.032 * s, 6, 5), toon('#e0b15a'));
  center.position.set(x, y + stemH, z);
  center.name = 'plant';
  g.add(center);
}

function fern(g, x, y, z, s, hex) {
  for (let i = 0; i < 5; i++) {
    const a = -1.1 + i * 0.55;
    const len = 0.42 * s;
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.1 * s, 0.012 * s, len), toon(hex));
    m.position.set(x + Math.sin(a) * 0.08, y + 0.08 * s, z + Math.cos(a) * 0.05);
    m.rotation.x = -0.55 - (i % 2) * 0.15;
    m.rotation.y = a;
    m.name = 'plant';
    g.add(m);
  }
}

function climber(g, x, y, z, dir) {
  let px = x;
  let py = y;
  let pz = z;
  for (let i = 0; i < 8; i++) {
    const nx = px + (dir === 'n' || dir === 's' ? (i % 2 ? 0.1 : -0.08) : 0);
    const nz = pz + (dir === 'e' || dir === 'w' ? (i % 2 ? 0.1 : -0.08) : 0);
    const ny = py + 0.22;
    pole(g, [px, py, pz], [nx, ny, nz], 0.01, 0.008, toon('#3e4a30'), 'plant', 4);
    const leaf = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.018, 0.09), toon(i % 2 ? '#3e6a42' : '#588856'));
    leaf.position.set(nx, ny, nz);
    leaf.rotation.y = i * 0.6;
    leaf.rotation.z = dir === 'w' ? 0.5 : -0.4;
    leaf.name = 'plant';
    g.add(leaf);
    px = nx;
    py = ny;
    pz = nz;
  }
}

function addPlant(g, spec) {
  const y = spec.y ?? 0.24;
  const s = spec.s ?? 1;
  if (spec.k !== 'climber' && spec.k !== 'grass' && spec.k !== 'daisy') {
    const disc = named(addCyl(g, 0.16 * s, 0.14 * s, 0.035, toon('#5a4030'), spec.x, y + 0.015, spec.z, 8), 'plant');
    disc.userData.noCast = true;
  }
  if (spec.k === 'shrub') shrub(g, spec.x, y, spec.z, s, spec.hex || '#3e6846');
  else if (spec.k === 'tree') tree(g, spec.x, y, spec.z, s, spec.hex || '#346246', spec.form || 'broad');
  else if (spec.k === 'cypress') cypress(g, spec.x, y, spec.z, s);
  else if (spec.k === 'grass') grass(g, spec.x, y, spec.z, s, spec.hex || '#5e8444');
  else if (spec.k === 'lavender') lavender(g, spec.x, y, spec.z, s);
  else if (spec.k === 'daisy') daisy(g, spec.x, y, spec.z, s, spec.hex || '#f4efe4');
  else if (spec.k === 'fern') fern(g, spec.x, y, spec.z, s, spec.hex || '#3f6a44');
  else if (spec.k === 'climber') climber(g, spec.x, y, spec.z, spec.dir || 'n');
}

const PLANTS = [
  { k: 'tree', x: -6.35, z: -7.18, s: 1.2, hex: '#2f5a3c', form: 'broad' },
  { k: 'shrub', x: -5.15, z: -7.2, s: 0.75, hex: '#3e6848' },
  { k: 'fern', x: -4.15, z: -7.12, s: 0.7 },
  { k: 'grass', x: -3.6, z: -7.22, s: 0.7 },
  { k: 'fern', x: 4.05, z: -7.18, s: 0.75 },
  { k: 'shrub', x: 5.15, z: -7.16, s: 0.8, hex: '#345e40' },
  { k: 'tree', x: 6.45, z: -7.2, s: 1.05, hex: '#3a6244', form: 'tall' },
  { k: 'shrub', x: -7.58, z: -6.7, s: 0.9, hex: '#2f5c3e' },
  { k: 'lavender', x: -7.48, z: -5.45, s: 1 },
  { k: 'grass', x: -7.68, z: -4.35, s: 1.15, hex: '#6a8a46' },
  { k: 'daisy', x: -7.5, z: -3.2, s: 0.95, hex: '#f6f1e6' },
  { k: 'fern', x: -7.7, z: -2.05, s: 0.9 },
  { k: 'shrub', x: -7.52, z: -0.85, s: 0.7, hex: '#46704c' },
  { k: 'grass', x: -7.64, z: 0.05, s: 0.85 },
  { k: 'lavender', x: -7.5, z: 2.35, s: 1.05 },
  { k: 'daisy', x: -7.68, z: 3.45, s: 0.9, hex: '#e7b7c0' },
  { k: 'shrub', x: -7.55, z: 4.55, s: 0.85, hex: '#2e5840' },
  { k: 'cypress', x: -7.58, z: 5.85, s: 1.65 },
  { k: 'fern', x: -7.46, z: 6.9, s: 0.7 },
  { k: 'grass', x: 7.58, z: -5.5, s: 1.1 },
  { k: 'shrub', x: 7.68, z: -4.05, s: 0.95, hex: '#3d6a46' },
  { k: 'lavender', x: 7.5, z: -2.55, s: 1 },
  { k: 'daisy', x: 7.7, z: -1.05, s: 0.9, hex: '#f3ead0' },
  { k: 'fern', x: 7.52, z: 0.55, s: 1 },
  { k: 'grass', x: 7.66, z: 2.15, s: 1.2, hex: '#7a9450' },
  { k: 'shrub', x: 7.55, z: 3.55, s: 0.8, hex: '#2c563c' },
  { k: 'lavender', x: 7.68, z: 4.7, s: 0.85 },
  { k: 'daisy', x: -5.4, z: 7.15, s: 0.7, hex: '#f7f3ea' },
  { k: 'lavender', x: -3.8, z: 7.18, s: 0.65 },
  { k: 'grass', x: -2.3, z: 7.1, s: 0.55 },
  { k: 'daisy', x: 2.35, z: 7.16, s: 0.7, hex: '#e8c2c8' },
  { k: 'lavender', x: 4.15, z: 7.12, s: 0.6 },
  { k: 'grass', x: 5.5, z: 7.18, s: 0.55 },
  { k: 'climber', x: -7.92, z: -4.6, y: 0.24, dir: 'w' },
  { k: 'climber', x: -7.92, z: 3.7, y: 0.24, dir: 'w' },
  { k: 'climber', x: 7.92, z: -3.1, y: 0.24, dir: 'e' },
  { k: 'climber', x: 7.92, z: 1.6, y: 0.24, dir: 'e' },
  { k: 'climber', x: -4.7, z: -7.5, y: 0.24, dir: 'n' },
  { k: 'climber', x: 4.7, z: -7.5, y: 0.24, dir: 'n' },
  { k: 'tree', x: -12.4, z: -0.6, s: 1.7, y: 0, hex: '#2a4e36', form: 'broad' },
  { k: 'tree', x: 13.2, z: -8.2, s: 1.55, y: 0, hex: '#314e38', form: 'tall' },
  { k: 'tree', x: -9.8, z: -11.5, s: 1.45, y: 0, hex: '#243f30', form: 'broad' },
  { k: 'tree', x: 9.4, z: -13.2, s: 1.4, y: 0, hex: '#2c5340', form: 'tall' },
  { k: 'shrub', x: 11.4, z: 5.2, s: 1.35, y: 0, hex: '#2c4a36' },
  { k: 'lavender', x: -2.15, z: 10.6, s: 0.85, y: 0 },
  { k: 'grass', x: 2.3, z: 10.8, s: 1.05, y: 0, hex: '#68844a' },
];

function addRect(g, rect, height, top, mat, name) {
  const w = rect.maxX - rect.minX;
  const d = rect.maxZ - rect.minZ;
  const mesh = addBox(
    g, w, height, d, mat,
    (rect.minX + rect.maxX) / 2,
    top - height / 2,
    (rect.minZ + rect.maxZ) / 2,
  );
  mesh.name = name;
  mesh.userData.noCast = true;
  return mesh;
}

function addWall(g, x0, z0, x1, z1, bounds) {
  const len = Math.hypot(x1 - x0, z1 - z0);
  const h = bounds.wallH;
  const t = bounds.wallT;
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(len, h, t), brickMat(len, h));
  mesh.position.set((x0 + x1) / 2, h / 2, (z0 + z1) / 2);
  mesh.rotation.y = Math.atan2(-(z1 - z0), x1 - x0);
  mesh.name = 'wall';
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  g.add(mesh);
  const coping = new THREE.Mesh(new THREE.BoxGeometry(len + 0.02, bounds.coping, t + 0.1), toon('#d9d0c2'));
  coping.position.set((x0 + x1) / 2, h + bounds.coping / 2, (z0 + z1) / 2);
  coping.rotation.y = mesh.rotation.y;
  coping.name = 'wall';
  coping.castShadow = true;
  coping.receiveShadow = true;
  g.add(coping);
}

function makeShell(layout) {
  const g = new THREE.Group();
  g.name = 'shell';
  const site = layout.site;
  const b = site.bounds;
  const lawn = toon('#3f6b4c');
  const gravel = toon('#c4b59a');
  const soil = toon('#6a4a34');
  const outside = named(addBox(g, 420, 0.16, 420, toon('#31443a'), 0, -0.08, 0), 'ground');
  outside.userData.noCast = true;

  const innerW = b.innerX * 2 - 0.12;
  const innerD = (b.innerZFront - b.innerZBack) - 0.12;
  const lawnMesh = named(addBox(g, innerW, site.lawnY, innerD, lawn, 0, site.lawnY / 2, (b.innerZFront + b.innerZBack) / 2), 'lawn');
  lawnMesh.userData.noCast = true;

  for (const aisle of Object.values(site.aisles)) addRect(g, aisle, 0.05, site.pathTop, gravel, 'path');
  for (const bed of site.beds) addRect(g, bed, 0.1, site.bedTop, soil, 'bed');
  for (const pad of site.pads) addRect(g, pad, 0.05, site.pathTop, gravel, 'path');

  const cx = b.innerX + b.wallT / 2;
  const zBack = b.innerZBack - b.wallT / 2;
  const zFront = b.innerZFront + b.wallT / 2;
  addWall(g, -cx, zBack, -cx, zFront, b);
  addWall(g, cx, zBack, cx, zFront, b);
  addWall(g, -cx, zBack, cx, zBack, b);
  const gate = site.gate.halfWidth;
  addWall(g, -cx, zFront, -gate, zFront, b);
  addWall(g, gate, zFront, cx, zFront, b);

  const stone = toon('#d5cbb8');
  for (const s of [-1, 1]) {
    const px = s * (gate + 0.18);
    named(addBox(g, 0.46, 2.4, 0.5, brickMat(0.5, 2.4), px, 1.2, zFront), 'wall');
    named(addBox(g, 0.56, 0.08, 0.58, stone, px, 2.44, zFront), 'wall');
    const ball = named(addCyl(g, 0.1, 0.12, 0.16, stone, px, 2.56, zFront, 8), 'wall');
    ball.userData.noCast = true;
    const leafZ = zFront + 0.15;
    for (let i = 0; i < 7; i++) {
      const bar = named(addBox(g, 0.018, 1.45, 0.018, toon('#2a3036'), px + s * 0.12, 0.85, leafZ + 0.12 + i * 0.1), 'gate');
      bar.userData.noCast = true;
    }
    named(addBox(g, 0.08, 0.04, 0.72, toon('#2a3036'), px + s * 0.12, 1.55, leafZ + 0.42), 'gate');
    const lamp = named(addBox(g, 0.1, 0.16, 0.1, toon('#ffd2a4', { emissive: '#ffb060', emissiveIntensity: 0.65 }), px, 2.05, zFront - 0.28), 'lantern');
    lamp.userData.noShadow = true;
  }

  named(addBox(g, 2.3, 0.06, 1.15, gravel, 0, 0.04, zFront + 0.85), 'path');
  named(addBox(g, 2.15, 0.08, 0.42, stone, 0, 0.09, zFront + 0.05), 'path');
  named(addBox(g, 1.9, 0.06, 0.55, stone, 0, site.lawnY * 0.5 + 0.02, b.innerZFront - 0.15), 'path');
  named(addBox(g, 1.7, 0.04, 6, gravel, 0, 0.025, zFront + 4.2), 'path');

  const sign = named(addBox(g, 0.7, 0.46, 0.04, toon('#ffffff', { map: labelTex('GARDEN', 'CINEMA', '#f4ecdf', '#3a2a24') }), -1.95, 1.2, b.innerZFront - 0.35), 'sign');
  sign.userData.noCast = true;
  named(addBox(g, 0.06, 1.15, 0.06, toon('#4a3428'), -1.95, 0.58, b.innerZFront - 0.35), 'sign');

  for (const s of [-1, 1]) {
    for (const z of [-4.2, 0.2, 4.4]) {
      if (s < 0 && z > -0.2 && z < 2.2) continue;
      if (s > 0 && z > 4) continue;
      const px = s * (b.innerX - 0.02);
      named(addBox(g, 0.28, 1.15, 0.22, brickMat(0.3, 1.15), px, 0.58, z), 'wall');
    }
  }
  return g;
}

function makeSky() {
  const geo = new THREE.SphereGeometry(80, 24, 16);
  const colors = [];
  const pos = geo.attributes.position;
  const zenith = new THREE.Color('#14182e');
  const mid = new THREE.Color('#3d3a68');
  const peach = new THREE.Color('#e8b08a');
  const rose = new THREE.Color('#c47e78');
  const c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i);
    if (y > 24) c.copy(zenith);
    else if (y > 7) c.copy(mid).lerp(zenith, (y - 7) / 20);
    else if (y > 0.5) c.copy(peach).lerp(mid, (y - 0.5) / 8);
    else c.copy(rose).lerp(peach, THREE.MathUtils.clamp((y + 8) / 10, 0, 1));
    colors.push(c.r, c.g, c.b);
  }
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  const mat = new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false, depthWrite: false });
  const sky = new THREE.Mesh(geo, mat);
  sky.name = 'sky';
  sky.frustumCulled = false;
  sky.renderOrder = -1;
  sky.raycast = () => {};
  return sky;
}

function makeProcedural(layout) {
  const g = new THREE.Group();
  g.name = 'procedural';
  const site = layout.site;
  makeScreen(g, site);
  for (const chair of expandChairs(site)) {
    const node = makeDeckchair(chair.stripe, site.chair);
    node.name = chair.id;
    node.position.set(chair.position[0], chair.position[1], chair.position[2]);
    node.rotation.y = chair.rotationY;
    g.add(node);
  }
  makeBooth(g, site);
  makeCart(g, site);
  makeCable(g, site);

  const bulbMat = toon('#ffd8b0', { emissive: '#ffb15e', emissiveIntensity: 0.9 });
  const wireMat = toon('#241e22');
  const half = site.screen.width / 2;
  const topY = site.screen.center[1] + site.screen.height / 2 + 0.38;
  const mastL = new THREE.Vector3(-(half + 0.74), topY, site.screen.center[2] + 0.1);
  const mastR = new THREE.Vector3(half + 0.74, topY, site.screen.center[2] + 0.1);
  addFestoon(g, mastL, mastR, 0.07, 0.42, bulbMat, wireMat);
  addFestoon(g, new THREE.Vector3(-7.7, 3.2, 4.4), new THREE.Vector3(7.7, 3.2, 4.85), 0.48, 0.46, bulbMat, wireMat);
  const leftSpans = [[-6.8, -2.4], [-2.4, 1.8], [1.8, 6.5]];
  for (const [z0, z1] of leftSpans) {
    addFestoon(g, new THREE.Vector3(-7.85, 2.58, z0), new THREE.Vector3(-7.85, 2.58, z1), 0.16, 0.48, bulbMat, wireMat);
  }
  const rightSpans = [[-6.6, -2.2], [-2.2, 1.6], [1.6, 4.9]];
  for (const [z0, z1] of rightSpans) {
    addFestoon(g, new THREE.Vector3(7.85, 2.58, z0), new THREE.Vector3(7.85, 2.58, z1), 0.16, 0.48, bulbMat, wireMat);
  }
  addFestoon(
    g,
    new THREE.Vector3((site.cart.min[0] + site.cart.max[0]) / 2 - 0.2, site.pathTop + 1.5, site.cart.min[2] + 0.15),
    new THREE.Vector3((site.cart.min[0] + site.cart.max[0]) / 2 - 0.2, site.pathTop + 1.5, site.cart.max[2] - 0.15),
    0.08, 0.28, bulbMat, wireMat,
  );

  PLANTS.forEach((p, i) => {
    addPlant(g, p);
    g.children.forEach((child) => {
      if (child.name === 'plant') child.name = `plant-${i}`;
    });
  });

  for (const inst of layout.instances || []) {
    if (inst.kind !== 'flowerpot') continue;
    addPlant(g, {
      k: inst.scale && inst.scale < 1 ? 'lavender' : 'shrub',
      x: inst.position[0],
      z: inst.position[2],
      y: inst.position[1] + 0.2,
      s: 0.45,
      hex: '#3a6844',
    });
  }

  const speakers = [[-1, -3.85], [1, 3.85]];
  for (const [s, x] of speakers) {
    const sp = named(addBox(g, 0.38, 0.5, 0.3, toon('#2a2e32'), x, site.lawnY + 0.28, site.screen.center[2] + 0.35), 'speaker');
    named(addBox(g, 0.22, 0.22, 0.04, toon('#3a4048'), x, site.lawnY + 0.32, site.screen.center[2] + 0.52), 'speaker');
    sp.userData.noCast = false;
  }
  return g;
}

function labelOf(obj) {
  let o = obj;
  while (o) {
    if (o.name) return o.name;
    o = o.parent;
  }
  return '';
}

function rayClear(scene, position, target) {
  const origin = new THREE.Vector3(...position);
  const end = new THREE.Vector3(...target);
  const dir = end.clone().sub(origin);
  const dist = dir.length();
  dir.normalize();
  const ray = new THREE.Raycaster(origin, dir, 0, dist + 0.2);
  const ignore = /^(festoon-wire|bulb|sky|guy|lantern)$/;
  const hits = ray.intersectObjects(scene.children, true).filter((h) => {
    const name = labelOf(h.object);
    return name && !ignore.test(name);
  });
  const first = hits[0];
  const name = first ? labelOf(first.object) : '';
  const ok = name === 'screen-fabric' || name === 'screen-hem';
  return { ok, name, dist: first ? Number(first.distance.toFixed(2)) : null };
}

function measureChairs(scene, layout) {
  const center = new THREE.Vector3(...layout.site.screen.center);
  const expected = expandChairs(layout.site).length;
  const rows = [];
  scene.updateMatrixWorld(true);
  scene.traverse((o) => {
    if (!o.name || !o.name.startsWith('deck_')) return;
    const back = o.getObjectByName('backrest');
    const foot = o.getObjectByName('foot');
    if (!back || !foot) return;
    const bp = back.getWorldPosition(new THREE.Vector3());
    const fp = foot.getWorldPosition(new THREE.Vector3());
    const look = fp.clone().sub(bp);
    look.y = 0;
    look.normalize();
    const to = center.clone();
    to.y = fp.y;
    const origin = fp.clone();
    origin.y = fp.y;
    const aim = center.clone().sub(origin);
    aim.y = 0;
    aim.normalize();
    const dot = look.dot(aim);
    rows.push({
      id: o.name,
      footZ: Number(fp.z.toFixed(3)),
      backZ: Number(bp.z.toFixed(3)),
      dot: Number(dot.toFixed(3)),
      faces: fp.z < bp.z - 0.2 && dot > 0.9,
    });
  });
  const facing = rows.filter((r) => r.faces).length;
  return {
    count: rows.length,
    expected,
    facing,
    allFace: rows.length === expected && facing === expected,
    minDot: rows.reduce((m, r) => Math.min(m, r.dot), 1),
    flipped: rows.filter((r) => !r.faces).map((r) => r.id),
    rows,
  };
}

async function decorate({ scene, layout }) {
  scene.add(makeSky());
  scene.updateMatrixWorld(true);
  const analytic = analyze(layout);
  const mesh = measureChairs(scene, layout);
  const screenCenter = layout.site.screen.center;
  const rays = {
    default: rayClear(scene, layout.camera.position, screenCenter),
    corner: rayClear(scene, layout.cameraPresets.corner.position, screenCenter),
  };
  const screenClear = rays.default.ok && rays.corner.ok;
  window.__facingReport = {
    ok: analytic.ok && mesh.allFace && screenClear,
    analyticOk: analytic.ok,
    analyticIssues: analytic.issues,
    mesh,
    rays,
  };
  console.log('facing', window.__facingReport.ok, mesh.facing, mesh.count, rays);
  if (!window.__facingReport.ok) {
    return ` · CHECK FAILED mesh ${mesh.facing}/${mesh.count} rays ${rays.default.name}/${rays.corner.name}`;
  }
  return ` · ${mesh.facing}/${mesh.count} chairs face the screen`;
}

boot({
  makeShell,
  makeProcedural,
  decorate,
  readyText: 'ready — garden open-air cinema · drag orbit · U unlit · T toon',
});
