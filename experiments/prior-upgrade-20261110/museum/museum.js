import * as THREE from 'three';
import { boot, toon, toonGradient } from './scene_runtime.js';

const geoCache = new Map();

function geoBox(w, h, d) {
  const key = `b|${w.toFixed(3)}|${h.toFixed(3)}|${d.toFixed(3)}`;
  let g = geoCache.get(key);
  if (!g) {
    g = new THREE.BoxGeometry(w, h, d);
    geoCache.set(key, g);
  }
  return g;
}

function addBox(group, w, h, d, color, x, y, z, opts = {}) {
  const mesh = new THREE.Mesh(geoBox(w, h, d), typeof color === 'string' ? toon(color, opts) : color);
  mesh.position.set(x, y, z);
  if (opts.rotY) mesh.rotation.y = opts.rotY;
  if (opts.rotX) mesh.rotation.x = opts.rotX;
  if (opts.rotZ) mesh.rotation.z = opts.rotZ;
  mesh.castShadow = opts.cast !== false;
  mesh.receiveShadow = opts.receive !== false;
  if (opts.name) mesh.name = opts.name;
  group.add(mesh);
  return mesh;
}

function addCyl(group, r, h, color, x, y, z, opts = {}) {
  const seg = opts.seg || 18;
  const rBot = opts.rBot ?? r;
  const key = `c|${r}|${rBot}|${h}|${seg}`;
  let g = geoCache.get(key);
  if (!g) {
    g = new THREE.CylinderGeometry(r, rBot, h, seg);
    geoCache.set(key, g);
  }
  const mesh = new THREE.Mesh(g, typeof color === 'string' ? toon(color, opts) : color);
  mesh.position.set(x, y, z);
  if (opts.rotX) mesh.rotation.x = opts.rotX;
  if (opts.rotZ) mesh.rotation.z = opts.rotZ;
  mesh.castShadow = opts.cast !== false;
  mesh.receiveShadow = opts.receive !== false;
  group.add(mesh);
  return mesh;
}

let contactMat;
function contactMaterial() {
  if (contactMat) return contactMat;
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  const grad = ctx.createRadialGradient(64, 64, 4, 64, 64, 62);
  grad.addColorStop(0, 'rgba(36,22,12,0.48)');
  grad.addColorStop(0.55, 'rgba(36,22,12,0.18)');
  grad.addColorStop(1, 'rgba(36,22,12,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  contactMat = new THREE.MeshBasicMaterial({
    map: tex,
    transparent: true,
    depthWrite: false,
    toneMapped: false,
  });
  return contactMat;
}

function addContact(group, x, z, w, d, y = 0.026) {
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), contactMaterial());
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set(x, y, z);
  mesh.scale.set(w, d, 1);
  mesh.userData.skipShade = true;
  mesh.castShadow = false;
  mesh.receiveShadow = false;
  mesh.renderOrder = 2;
  group.add(mesh);
  return mesh;
}

function glassOpts() {
  return {
    transparent: true,
    opacity: 0.22,
    side: THREE.DoubleSide,
    emissive: '#e7f4ff',
    emissiveIntensity: 0.18,
    depthWrite: false,
    cast: false,
    receive: false,
  };
}

function glassLid(group, s, w, d, y) {
  const gl = glassOpts();
  addBox(group, w - 0.08, 0.012, d - 0.08, s.glass, 0, y, 0, gl);
  addBox(group, w, 0.025, 0.045, s.iron, 0, y + 0.008, -d / 2 + 0.02, { cast: false });
  addBox(group, w, 0.025, 0.045, s.iron, 0, y + 0.008, d / 2 - 0.02, { cast: false });
  addBox(group, 0.045, 0.025, d, s.iron, -w / 2 + 0.02, y + 0.008, 0, { cast: false });
  addBox(group, 0.045, 0.025, d, s.iron, w / 2 - 0.02, y + 0.008, 0, { cast: false });
}

function labelPlate(group, s, x, y, z, rotY, w = 0.28) {
  const g = new THREE.Group();
  addBox(g, w, 0.09, 0.012, s.oakDark, 0, 0, 0, { cast: false });
  addBox(g, w - 0.08, 0.018, 0.01, '#3a3228', 0, 0.018, 0.008, { cast: false, receive: false });
  addBox(g, w - 0.12, 0.01, 0.01, '#6a5a48', 0, -0.012, 0.008, { cast: false, receive: false });
  g.position.set(x, y, z);
  g.rotation.y = rotY || 0;
  group.add(g);
}

function framedWork(group, s, work, wallZ, wallX) {
  const g = new THREE.Group();
  const w = work.w;
  const h = work.h;
  const pal = work.palette;
  addBox(g, w + 0.1, h + 0.1, 0.045, work.frame, 0, 0, 0, { cast: true });
  addBox(g, w + 0.06, h + 0.06, 0.02, work.gilt, 0, 0, 0.018, { cast: false });
  addBox(g, w, h, 0.012, work.mat, 0, 0, 0.03, { cast: false });
  const inset = 0.08;
  const cw = w - inset * 2;
  const ch = h - inset * 2;
  addBox(g, cw, ch, 0.01, pal[0], 0, 0, 0.038, { cast: false, receive: false });
  if (pal[1]) addBox(g, cw * 0.38, ch * 0.42, 0.012, pal[1], -cw * 0.16, ch * 0.12, 0.046, { cast: false, receive: false });
  if (pal[2]) addBox(g, cw * 0.48, ch * 0.28, 0.012, pal[2], cw * 0.12, -ch * 0.18, 0.046, { cast: false, receive: false });
  if (pal[3]) addBox(g, cw * 0.22, ch * 0.18, 0.012, pal[3], cw * 0.22, ch * 0.22, 0.05, { cast: false, receive: false });
  if (pal[4]) addCyl(g, Math.min(cw, ch) * 0.1, 0.012, pal[4], -cw * 0.22, -ch * 0.08, 0.05, { seg: 16, rotX: Math.PI / 2, cast: false });
  if (work.wall === 'back') {
    g.position.set(work.x, work.y, wallZ + 0.09);
  } else {
    g.rotation.y = Math.PI / 2;
    g.position.set(wallX + 0.09, work.y, work.z);
  }
  group.add(g);
  const ly = work.y - h / 2 - 0.16;
  if (work.wall === 'back') {
    labelPlate(group, s, work.x, ly, wallZ + 0.12, 0, Math.min(0.42, w * 0.45));
    const railY = 3.62;
    const top = work.y + h / 2;
    addBox(group, 0.006, Math.max(0.08, railY - top - 0.02), 0.006, s.iron, work.x - w * 0.28, (railY + top) / 2, wallZ + 0.12, { cast: false });
    addBox(group, 0.006, Math.max(0.08, railY - top - 0.02), 0.006, s.iron, work.x + w * 0.28, (railY + top) / 2, wallZ + 0.12, { cast: false });
    addCyl(group, 0.032, 0.035, s.brass, work.x, top + 0.12, wallZ + 0.2, { seg: 12, rotX: Math.PI / 2, cast: false });
    addBox(group, 0.16, 0.03, 0.06, s.brass, work.x, top + 0.14, wallZ + 0.26, { cast: false });
    addBox(group, 0.12, 0.022, 0.05, '#f5ead0', work.x, top + 0.135, wallZ + 0.3, {
      emissive: '#ffe6b0',
      emissiveIntensity: 0.55,
      cast: false,
    });
  } else {
    labelPlate(group, s, wallX + 0.12, ly, work.z, Math.PI / 2, Math.min(0.42, w * 0.45));
  }
}

function exhibitionTitle(group, s, x, y, z) {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 192;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#ece4d6';
  ctx.fillRect(0, 0, 1024, 192);
  ctx.fillStyle = '#3a3228';
  ctx.font = '600 64px "Times New Roman", serif';
  ctx.textAlign = 'center';
  ctx.fillText('NORTH HALL', 512, 88);
  ctx.font = '400 28px "Times New Roman", serif';
  ctx.fillStyle = '#6a5a48';
  ctx.fillText('FORMS IN STONE  ·  2026', 512, 140);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  const mat = new THREE.MeshToonMaterial({ map: tex, gradientMap: toonGradient, color: '#ffffff' });
  const mesh = new THREE.Mesh(geoBox(1.85, 0.42, 0.02), mat);
  mesh.position.set(x, y, z);
  mesh.castShadow = false;
  mesh.receiveShadow = true;
  group.add(mesh);
  addBox(group, 1.95, 0.48, 0.03, s.oakDark, x, y, z - 0.02, { cast: false });
}

function stonePlinth(group, s, p) {
  const g = new THREE.Group();
  g.position.set(p.x, 0, p.z);
  const stone = p.stone || s.stone;
  addBox(g, p.w + 0.12, 0.08, p.d + 0.12, s.stoneDark, 0, 0.04, 0);
  addBox(g, p.w + 0.04, 0.1, p.d + 0.04, stone, 0, 0.12, 0);
  addBox(g, p.w, p.h - 0.28, p.d, stone, 0, 0.12 + (p.h - 0.28) / 2, 0);
  addBox(g, p.w + 0.06, 0.08, p.d + 0.06, s.marble, 0, p.h - 0.04, 0);
  group.add(g);
  addContact(group, p.x, p.z, p.w + 0.45, p.d + 0.45);
  return g;
}

function exhibitFigure(group, s, x, y, z) {
  addCyl(group, 0.09, 0.04, s.bronzeDark, x, y + 0.02, z, { seg: 12 });
  addCyl(group, 0.038, 0.3, s.bronze, x - 0.055, y + 0.19, z, { rBot: 0.045, seg: 10 });
  addCyl(group, 0.038, 0.3, s.bronze, x + 0.055, y + 0.19, z, { rBot: 0.045, seg: 10 });
  addBox(group, 0.18, 0.09, 0.11, s.bronze, x, y + 0.36, z);
  addBox(group, 0.2, 0.3, 0.12, s.bronze, x, y + 0.55, z);
  addBox(group, 0.32, 0.09, 0.12, s.bronze, x, y + 0.68, z);
  addBox(group, 0.055, 0.26, 0.055, s.bronze, x - 0.18, y + 0.52, z + 0.02, { rotZ: 0.28 });
  addBox(group, 0.055, 0.24, 0.055, s.bronze, x + 0.18, y + 0.54, z - 0.02, { rotZ: -0.14 });
  addCyl(group, 0.04, 0.07, s.bronze, x, y + 0.76, z, { seg: 12 });
  addCyl(group, 0.07, 0.11, s.bronzeDark, x, y + 0.86, z, { rBot: 0.05, seg: 12 });
}

function exhibitTorso(group, s, x, y, z) {
  addCyl(group, 0.08, 0.05, s.marble, x, y + 0.03, z, { seg: 14 });
  addBox(group, 0.2, 0.34, 0.14, s.marble, x, y + 0.24, z);
  addBox(group, 0.28, 0.1, 0.12, s.marble, x, y + 0.42, z);
  addCyl(group, 0.05, 0.08, s.marble, x, y + 0.5, z, { seg: 12 });
}

function exhibitSlabs(group, s, x, y, z) {
  addBox(group, 0.08, 0.72, 0.34, s.bronze, x - 0.08, y + 0.36, z, { rotY: 0.25 });
  addBox(group, 0.1, 0.55, 0.28, s.bronzeDark, x + 0.1, y + 0.28, z + 0.04, { rotY: -0.4 });
  addBox(group, 0.22, 0.08, 0.22, s.bronze, x, y + 0.58, z - 0.02, { rotZ: 0.3 });
}

function exhibitBust(group, s, x, y, z) {
  addCyl(group, 0.1, 0.08, s.oakDark, x, y + 0.04, z, { seg: 14 });
  addBox(group, 0.22, 0.16, 0.12, s.marble, x, y + 0.18, z);
  addCyl(group, 0.07, 0.16, s.marble, x, y + 0.34, z, { rBot: 0.08, seg: 14 });
  addCyl(group, 0.085, 0.12, s.marble, x, y + 0.46, z, { rBot: 0.06, seg: 14 });
}

function ceramicVessel(group, s, x, y, z, scale = 1) {
  addCyl(group, 0.07 * scale, 0.04 * scale, s.oakLight, x, y + 0.02 * scale, z, { rBot: 0.08 * scale, seg: 14 });
  addCyl(group, 0.09 * scale, 0.16 * scale, '#8a5a3a', x, y + 0.12 * scale, z, { rBot: 0.07 * scale, seg: 14 });
  addCyl(group, 0.05 * scale, 0.05 * scale, '#6a3a28', x, y + 0.22 * scale, z, { rBot: 0.08 * scale, seg: 12 });
  addCyl(group, 0.06 * scale, 0.03 * scale, '#c4a06a', x, y + 0.255 * scale, z, { seg: 12, cast: false });
}

function standingVitrine(group, s, v) {
  const g = new THREE.Group();
  g.position.set(v.x, 0, v.z);
  g.rotation.y = v.rot || 0;
  const w = v.w;
  const d = v.d;
  const h = v.h;
  addBox(g, w + 0.06, 0.16, d + 0.06, s.stoneDark, 0, 0.08, 0);
  addBox(g, w, 0.1, d, s.oak, 0, 0.2, 0);
  const postH = h - 0.28;
  const py = 0.22 + postH / 2;
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      addBox(g, 0.03, postH, 0.03, s.iron, sx * (w / 2 - 0.03), py, sz * (d / 2 - 0.03));
    }
  }
  addBox(g, w - 0.08, 0.02, d - 0.08, s.oakLight, 0, 0.58, 0);
  const gl = glassOpts();
  addBox(g, 0.012, postH - 0.04, d - 0.08, s.glass, -w / 2 + 0.04, py, 0, gl);
  addBox(g, 0.012, postH - 0.04, d - 0.08, s.glass, w / 2 - 0.04, py, 0, gl);
  addBox(g, w - 0.08, postH - 0.04, 0.012, s.glass, 0, py, -d / 2 + 0.04, gl);
  addBox(g, w - 0.08, postH - 0.04, 0.012, s.glass, 0, py, d / 2 - 0.04, gl);
  glassLid(g, s, w, d, h - 0.05);
  ceramicVessel(g, s, -0.16, 0.6, 0.02, 1.05);
  ceramicVessel(g, s, 0.18, 0.6, -0.04, 0.72);
  addCyl(g, 0.05, 0.04, s.bronze, 0.02, 0.62, 0.12, { rBot: 0.07, seg: 12 });
  addCyl(g, 0.035, 0.1, s.bronzeDark, 0.02, 0.7, 0.12, { seg: 10 });
  addCyl(g, 0.025, 0.02, '#f5ead0', 0, h - 0.1, 0, {
    emissive: '#ffe6b0',
    emissiveIntensity: 0.7,
    cast: false,
    seg: 12,
  });
  group.add(g);
  addContact(group, v.x, v.z, w + 0.4, d + 0.4);
  labelPlate(group, s, v.x, 0.42, v.z + d / 2 + 0.02, 0, 0.32);
}

function tableVitrine(group, s, v, seed) {
  const g = new THREE.Group();
  g.position.set(v.x, 0, v.z);
  g.rotation.y = v.rot || 0;
  const w = v.w;
  const d = v.d;
  const h = v.h;
  addBox(g, w, h - 0.28, d, s.oak, 0, (h - 0.28) / 2, 0);
  addBox(g, w + 0.04, 0.05, d + 0.04, s.oakDark, 0, h - 0.28, 0);
  addBox(g, w - 0.12, 0.04, 0.02, s.oakLight, 0, 0.38, d / 2 + 0.01, { cast: false });
  addBox(g, w - 0.12, 0.04, 0.02, s.oakLight, 0, 0.22, d / 2 + 0.01, { cast: false });
  addBox(g, w - 0.08, 0.015, d - 0.08, s.linen, 0, h - 0.25, 0, { cast: false });
  const hood = 0.24;
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      addBox(g, 0.02, hood, 0.02, s.iron, sx * (w / 2 - 0.03), h - 0.16, sz * (d / 2 - 0.03));
    }
  }
  const gl = glassOpts();
  addBox(g, 0.01, hood - 0.02, d - 0.06, s.glass, -w / 2 + 0.03, h - 0.16, 0, gl);
  addBox(g, 0.01, hood - 0.02, d - 0.06, s.glass, w / 2 - 0.03, h - 0.16, 0, gl);
  addBox(g, w - 0.06, hood - 0.02, 0.01, s.glass, 0, h - 0.16, -d / 2 + 0.03, gl);
  addBox(g, w - 0.06, hood - 0.02, 0.01, s.glass, 0, h - 0.16, d / 2 - 0.03, gl);
  glassLid(g, s, w, d, h - 0.05);
  const y0 = h - 0.24;
  if (seed === 0) {
    ceramicVessel(g, s, -0.38, y0, 0.04, 0.7);
    addBox(g, 0.16, 0.03, 0.22, '#6b3a28', 0.02, y0 + 0.02, 0, { cast: false });
    addBox(g, 0.12, 0.025, 0.16, '#2f3d4a', 0.04, y0 + 0.05, 0.02, { cast: false });
    addCyl(g, 0.045, 0.08, s.bronze, 0.38, y0 + 0.05, -0.06, { rBot: 0.06, seg: 12 });
    addCyl(g, 0.05, 0.02, s.brass, 0.38, y0 + 0.1, -0.06, { seg: 12, cast: false });
  } else {
    addBox(g, 0.7, 0.012, 0.32, '#5a2430', 0, y0 + 0.01, 0, { cast: false });
    for (let i = 0; i < 5; i++) {
      addCyl(g, 0.028, 0.012, s.brass, -0.32 + i * 0.16, y0 + 0.025, 0.04, { seg: 10, cast: false });
    }
    addBox(g, 0.18, 0.02, 0.12, s.bronzeDark, 0.12, y0 + 0.025, -0.08, { cast: false });
    addBox(g, 0.1, 0.04, 0.08, s.oakLight, -0.22, y0 + 0.03, -0.1, { cast: false });
  }
  addCyl(g, 0.02, 0.015, '#f5ead0', 0, h - 0.08, 0, {
    emissive: '#ffe6b0',
    emissiveIntensity: 0.6,
    cast: false,
    seg: 10,
  });
  group.add(g);
  addContact(group, v.x, v.z, w + 0.35, d + 0.35);
  labelPlate(group, s, v.x, 0.72, v.z + d / 2 + 0.03, 0, 0.36);
}

function stanchions(group, s, x, z, radius) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  const n = 4;
  const posts = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + 0.4;
    const px = Math.cos(a) * radius;
    const pz = Math.sin(a) * radius;
    posts.push([px, pz]);
    addCyl(g, 0.028, 0.04, s.iron, px, 0.03, pz, { seg: 10 });
    addCyl(g, 0.016, 0.92, s.iron, px, 0.5, pz, { seg: 10 });
    addCyl(g, 0.03, 0.04, s.brass, px, 0.96, pz, { seg: 10 });
  }
  for (let i = 0; i < n; i++) {
    const a = posts[i];
    const b = posts[(i + 1) % n];
    const mx = (a[0] + b[0]) / 2;
    const mz = (a[1] + b[1]) / 2;
    const dx = b[0] - a[0];
    const dz = b[1] - a[1];
    const len = Math.hypot(dx, dz);
    const rope = addBox(g, 0.03, 0.03, len - 0.04, s.rope, mx, 0.9, mz, { cast: false });
    rope.rotation.y = Math.atan2(dx, dz);
  }
  group.add(g);
}

function lectern(group, s, spec) {
  const g = new THREE.Group();
  g.position.set(spec.x, 0, spec.z);
  g.rotation.y = spec.rot || 0;
  addBox(g, 0.42, 1.02, 0.32, s.oak, 0, 0.51, 0);
  addBox(g, 0.5, 0.05, 0.4, s.oakDark, 0, 1.04, 0.02, { rotX: -0.28 });
  addBox(g, 0.36, 0.01, 0.26, s.linen, 0, 1.08, 0.04, { rotX: -0.28, cast: false });
  addBox(g, 0.22, 0.008, 0.16, '#6b3a28', 0.02, 1.1, 0.05, { rotX: -0.28, cast: false });
  group.add(g);
  addContact(group, spec.x, spec.z, 0.7, 0.55);
}

function trackLights(group, s, layout) {
  const H = layout.meta.room.height;
  const backZ = layout.architecture.backWallZ;
  addBox(group, 10.4, 0.04, 0.05, s.iron, 0.1, H - 0.38, backZ + 1.28);
  addBox(group, 6.8, 0.04, 0.05, s.iron, -0.2, H - 0.38, -0.35);
  const heads = [
    [-4.78, backZ + 1.28],
    [-3.05, backZ + 1.28],
    [0.08, backZ + 1.28],
    [2.82, backZ + 1.28],
    [4.88, backZ + 1.28],
    [-2.12, -0.35],
    [2.42, -0.35],
  ];
  for (const [x, z] of heads) {
    addCyl(group, 0.045, 0.08, s.iron, x, H - 0.46, z, { seg: 12 });
    addCyl(group, 0.04, 0.1, s.iron, x, H - 0.56, z, { rBot: 0.055, seg: 12, rotX: 0.45 });
    addCyl(group, 0.032, 0.03, '#f5ead0', x, H - 0.62, z + 0.04, {
      emissive: '#ffe6b0',
      emissiveIntensity: 0.85,
      cast: false,
      seg: 12,
    });
  }
}

function addPlant(group, x, y, z) {
  addCyl(group, 0.018, 0.2, '#3a5530', x, y + 0.1, z, { seg: 8, cast: false });
  addBox(group, 0.28, 0.2, 0.22, '#3d6b44', x, y + 0.28, z, { cast: false });
  addBox(group, 0.18, 0.16, 0.16, '#2c5536', x + 0.06, y + 0.4, z - 0.04, { cast: false });
  addBox(group, 0.14, 0.12, 0.12, '#4a7a48', x - 0.05, y + 0.36, z + 0.05, { cast: false });
}

function buildShell(layout) {
  const g = new THREE.Group();
  g.name = 'shell';
  const { width: W, depth: D, height: H } = layout.meta.room;
  const s = layout.shell;
  const arch = layout.architecture;
  const backZ = arch.backWallZ;
  const xIn = arch.leftWall.xIn;
  const xOut = arch.leftWall.xOut;

  addBox(g, W, 0.12, D, s.border, 0, -0.06, 0, { cast: false });
  const tile = 0.92;
  const nx = Math.floor((W - 0.5) / tile);
  const nz = Math.floor((D - 0.4) / tile);
  const x0 = -((nx - 1) * tile) / 2;
  const z0 = -((nz - 1) * tile) / 2;
  const tones = [s.floorA, s.floorB, s.floorC];
  for (let ix = 0; ix < nx; ix++) {
    for (let iz = 0; iz < nz; iz++) {
      const tone = tones[(ix + iz * 2) % 3];
      addBox(g, tile - 0.03, 0.02, tile - 0.03, tone, x0 + ix * tile, 0.01, z0 + iz * tile, { cast: false });
    }
  }
  addBox(g, W - 0.2, 0.025, 0.22, s.border, 0.05, 0.018, backZ + 0.22, { cast: false });
  addBox(g, 0.22, 0.025, D - 0.2, s.border, xIn + 0.18, 0.018, 0, { cast: false });
  addBox(g, 0.08, 0.14, D, s.stoneDark, W / 2 - 0.04, 0.05, 0, { cast: false });
  addBox(g, W, 0.14, 0.08, s.stoneDark, 0, 0.05, D / 2 - 0.04, { cast: false });

  addBox(g, W - 0.2, H, 0.16, s.plaster, 0.1, H / 2, backZ, { cast: false });
  addBox(g, W - 0.4, 0.16, 0.08, s.oak, 0.1, 0.08, backZ + 0.1, { cast: false });
  addBox(g, W - 0.5, 0.05, 0.06, s.oakDark, 0.1, 1.12, backZ + 0.11, { cast: false });
  addBox(g, W - 0.55, 0.04, 0.05, s.oak, 0.1, arch.pictureRailY, backZ + 0.12, { cast: false });
  addBox(g, W - 0.4, 0.1, 0.1, s.oakDark, 0.1, arch.corniceY, backZ + 0.08, { cast: false });
  addBox(g, W - 0.6, 0.55, 0.04, s.plasterShade, 0.1, 0.55, backZ + 0.1, { cast: false });

  const niche = arch.niche;
  const door = arch.door;
  const segs = [
    { z0: -D / 2, z1: niche.z0 },
    { z0: niche.z1, z1: door.z0 },
    { z0: door.z1, z1: D / 2 },
  ];
  const thick = xIn - xOut;
  const xMid = (xIn + xOut) / 2;
  for (const seg of segs) {
    const zd = seg.z1 - seg.z0;
    const zc = (seg.z0 + seg.z1) / 2;
    if (zd < 0.05) continue;
    addBox(g, thick, H, zd, s.plaster, xMid, H / 2, zc);
    addBox(g, 0.08, 0.16, zd - 0.04, s.oak, xIn + 0.02, 0.08, zc, { cast: false });
    addBox(g, 0.05, 0.05, zd - 0.06, s.oakDark, xIn + 0.03, 1.12, zc, { cast: false });
    addBox(g, 0.04, 0.04, zd - 0.08, s.oak, xIn + 0.025, arch.pictureRailY, zc, { cast: false });
    addBox(g, 0.08, 0.1, zd, s.oakDark, xIn + 0.02, arch.corniceY, zc, { cast: false });
    addBox(g, 0.03, 0.55, zd - 0.1, s.plasterShade, xIn + 0.03, 0.55, zc, { cast: false });
  }
  addBox(g, thick, H - niche.head, niche.z1 - niche.z0, s.plaster, xMid, (H + niche.head) / 2, (niche.z0 + niche.z1) / 2);
  addBox(g, xIn - niche.xBack, 0.14, niche.z1 - niche.z0, s.stone, (xIn + niche.xBack) / 2, 0.07, (niche.z0 + niche.z1) / 2);
  addBox(g, 0.08, niche.head, niche.z1 - niche.z0, s.plasterDeep, niche.xBack, niche.head / 2, (niche.z0 + niche.z1) / 2, { cast: false });
  addBox(g, xIn - niche.xBack, niche.head, 0.08, s.plasterShade, (xIn + niche.xBack) / 2, niche.head / 2, niche.z0 + 0.04);
  addBox(g, xIn - niche.xBack, niche.head, 0.08, s.plasterShade, (xIn + niche.xBack) / 2, niche.head / 2, niche.z1 - 0.04);
  addBox(g, 0.06, niche.head, 0.06, s.oak, xIn, niche.head / 2, niche.z0 + 0.03);
  addBox(g, 0.06, niche.head, 0.06, s.oak, xIn, niche.head / 2, niche.z1 - 0.03);
  addBox(g, 0.06, 0.06, niche.z1 - niche.z0, s.oakDark, xIn, niche.head, (niche.z0 + niche.z1) / 2);

  addBox(g, thick, H - door.head, door.z1 - door.z0, s.plaster, xMid, (H + door.head) / 2, (door.z0 + door.z1) / 2);
  addBox(g, 0.08, door.head, door.z1 - door.z0, s.nextRoom, door.xBack, door.head / 2, (door.z0 + door.z1) / 2, { cast: false });
  addBox(g, 0.08, door.head, 0.1, s.oakDark, xIn, door.head / 2, door.z0 + 0.05);
  addBox(g, 0.08, door.head, 0.1, s.oakDark, xIn, door.head / 2, door.z1 - 0.05);
  addBox(g, 0.1, 0.1, door.z1 - door.z0, s.oak, xIn, door.head, (door.z0 + door.z1) / 2);
  addBox(g, 0.03, 0.7, 0.55, '#5a3a42', door.xBack + 0.04, 1.85, (door.z0 + door.z1) / 2, { cast: false });

  const sky = arch.skylight;
  addBox(g, 11.6, 0.1, 3.15, s.ceiling, -0.2, H - 0.05, -3.05, { cast: false });
  addBox(g, 11.6, 0.1, 2.55, s.ceiling, -0.2, H - 0.05, 2.15, { cast: false });
  addBox(g, 1.35, 0.1, sky.d + 0.4, s.ceiling, sky.x - sky.w / 2 - 0.55, H - 0.05, sky.z, { cast: false });
  addBox(g, 1.55, 0.1, sky.d + 0.4, s.ceiling, sky.x + sky.w / 2 + 0.65, H - 0.05, sky.z, { cast: false });
  addBox(g, sky.w, 0.42, 0.08, s.plasterShade, sky.x, H - 0.28, sky.z - sky.d / 2, { cast: false });
  addBox(g, sky.w, 0.42, 0.08, s.plasterShade, sky.x, H - 0.28, sky.z + sky.d / 2, { cast: false });
  addBox(g, 0.08, 0.42, sky.d, s.plasterShade, sky.x - sky.w / 2, H - 0.28, sky.z, { cast: false });
  addBox(g, 0.08, 0.42, sky.d, s.plasterShade, sky.x + sky.w / 2, H - 0.28, sky.z, { cast: false });
  addBox(g, sky.w - 0.1, 0.03, sky.d - 0.1, s.glass, sky.x, H - 0.08, sky.z, {
    transparent: true,
    opacity: 0.22,
    emissive: '#e7f4ff',
    emissiveIntensity: 0.7,
    depthWrite: false,
    cast: false,
    receive: false,
  });
  addBox(g, sky.w - 0.2, 0.04, sky.d - 0.2, s.sky, sky.x, H + 0.12, sky.z, {
    emissive: '#c5d8e6',
    emissiveIntensity: 0.55,
    cast: false,
    receive: false,
  });
  for (let i = -3; i <= 3; i++) {
    addBox(g, 0.045, 0.05, sky.d - 0.12, s.oak, sky.x + i * 1.22, H - 0.07, sky.z, { cast: false });
  }
  addBox(g, sky.w - 0.12, 0.05, 0.045, s.oak, sky.x, H - 0.07, sky.z, { cast: false });
  for (const z of [-3.55, -2.35, 0.35, 1.85]) {
    addBox(g, 11.2, 0.16, 0.14, s.beam, -0.15, H - 0.22, z);
  }
  for (const x of [-4.6, -1.6, 1.5, 4.2]) {
    addBox(g, 0.14, 0.16, 6.8, s.beam, x, H - 0.22, -0.55);
  }
  return g;
}

function makeProcedural(layout) {
  const g = new THREE.Group();
  g.name = 'procedural';
  const s = layout.shell;
  const arch = layout.architecture;
  const backZ = arch.backWallZ;
  const xIn = arch.leftWall.xIn;

  exhibitionTitle(g, s, 0.08, 3.95, backZ + 0.1);
  for (const work of arch.works) framedWork(g, s, work, backZ, xIn);

  for (const p of arch.plinths) {
    stonePlinth(g, s, p);
    const top = p.h;
    if (p.exhibit === 'figure') exhibitFigure(g, s, p.x, top, p.z);
    if (p.exhibit === 'torso') exhibitTorso(g, s, p.x, top, p.z);
    if (p.exhibit === 'slabs') exhibitSlabs(g, s, p.x, top, p.z);
    if (p.exhibit === 'bust') exhibitBust(g, s, p.x, top, p.z);
  }
  const bronze = arch.plinths.find((p) => p.id === 'bronze');
  stanchions(g, s, bronze.x, bronze.z, arch.stanchion.radius);

  for (const v of arch.vitrines) {
    if (v.kind === 'standing') standingVitrine(g, s, v);
    else tableVitrine(g, s, v, v.id === 'vit_table_a' ? 0 : 1);
  }

  lectern(g, s, arch.lectern);
  trackLights(g, s, layout);

  for (const inst of layout.instances) {
    if (inst.kind === 'museum_bench') {
      const sx = Array.isArray(inst.scale) ? inst.scale[0] : 1;
      const sz = Array.isArray(inst.scale) ? inst.scale[2] : 1;
      addContact(g, inst.position[0], inst.position[2], layout.assets.museum_bench.hz * 2 * sz + 0.25, layout.assets.museum_bench.hx * 2 * sx + 0.2);
    }
    if (inst.kind === 'flowerpot') {
      addContact(g, inst.position[0], inst.position[2], 0.4, 0.4);
      addPlant(g, inst.position[0], inst.position[1] + 0.3, inst.position[2]);
    }
    if (inst.kind === 'pendant_lamp') {
      const drop = layout.meta.room.height - 0.18 - (inst.position[1] + 0.48);
      addCyl(g, 0.01, drop, s.iron, inst.position[0], inst.position[1] + 0.48 + drop / 2, inst.position[2], { cast: false, seg: 8 });
    }
  }
  return g;
}

function makeLights(scene, layout) {
  for (const spot of layout.architecture.spots) {
    const sl = new THREE.SpotLight(spot.color, spot.intensity, spot.distance, spot.angle, 0.48, 1.7);
    sl.position.set(...spot.position);
    sl.target.position.set(...spot.target);
    scene.add(sl);
    scene.add(sl.target);
  }
}

boot({
  makeShell: buildShell,
  makeProcedural,
  makeLights,
  readyText: 'ready — north hall gallery · drag orbit · U unlit · T toon',
});
