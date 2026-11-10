import * as THREE from 'three';
import { boot, toon } from './scene_runtime.js';

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
  const mesh = new THREE.Mesh(geoBox(w, h, d), toon(color, opts));
  mesh.position.set(x, y, z);
  if (opts.rotY) mesh.rotation.y = opts.rotY;
  mesh.castShadow = opts.cast !== false;
  mesh.receiveShadow = opts.receive !== false;
  if (opts.name) mesh.name = opts.name;
  group.add(mesh);
  return mesh;
}

function addCyl(group, r, h, color, x, y, z, opts = {}) {
  const seg = opts.seg || 16;
  const rBot = opts.rBot ?? r;
  const key = `c|${r}|${rBot}|${h}|${seg}`;
  let g = geoCache.get(key);
  if (!g) {
    g = new THREE.CylinderGeometry(r, rBot, h, seg);
    geoCache.set(key, g);
  }
  const mesh = new THREE.Mesh(g, toon(color, opts));
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
  grad.addColorStop(0, 'rgba(28,20,14,0.48)');
  grad.addColorStop(0.55, 'rgba(28,20,14,0.16)');
  grad.addColorStop(1, 'rgba(28,20,14,0)');
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

function addPlant(group, x, y, z, scale = 1, color = '#3d6b44') {
  addCyl(group, 0.016 * scale, 0.16 * scale, '#3a5530', x, y + 0.08 * scale, z, { seg: 8, cast: false });
  addBox(group, 0.22 * scale, 0.16 * scale, 0.18 * scale, color, x, y + 0.22 * scale, z, { cast: false });
  addBox(group, 0.14 * scale, 0.12 * scale, 0.12 * scale, '#2c5536', x + 0.05 * scale, y + 0.32 * scale, z - 0.03 * scale, { cast: false });
}

function notebook(group, x, y, z, rotY, color = '#f4efe4') {
  const m = addBox(group, 0.22, 0.012, 0.16, color, x, y, z, { cast: false });
  m.rotation.y = rotY;
  addBox(group, 0.04, 0.004, 0.15, '#3a4a58', x + Math.cos(rotY) * 0.08, y + 0.008, z + Math.sin(rotY) * 0.02, { cast: false });
}

function lockerBay(group, s, xMid, thick, z0, z1, doorColor) {
  const zc = (z0 + z1) / 2;
  const zd = z1 - z0;
  const H = 2.18;
  addBox(group, thick - 0.02, H, zd - 0.04, s.metalDark, xMid, H / 2, zc);
  addBox(group, 0.04, H + 0.04, zd, s.metal, xMid + thick / 2 - 0.01, H / 2, zc);
  const doors = zd > 1.1 ? 2 : 1;
  const dw = (zd - 0.1) / doors;
  for (let i = 0; i < doors; i++) {
    const dz = z0 + 0.06 + dw * (i + 0.5);
    addBox(group, 0.03, H - 0.16, dw - 0.06, doorColor, xMid + thick / 2 + 0.02, H / 2, dz, { cast: false });
    addBox(group, 0.02, 0.08, 0.05, s.brass, xMid + thick / 2 + 0.05, 1.12, dz + dw * 0.22, { cast: false });
    addBox(group, 0.008, 0.05, 0.09, s.chalk, xMid + thick / 2 + 0.045, 1.85, dz, { cast: false });
    for (let v = 0; v < 3; v++) {
      addBox(group, 0.01, 0.04, dw * 0.28, s.metalDark, xMid + thick / 2 + 0.04, 0.38 + v * 0.12, dz, { cast: false });
    }
  }
  addBox(group, thick + 0.04, 0.06, zd + 0.02, s.metal, xMid, H + 0.03, zc, { cast: false });
  addBox(group, thick + 0.02, 0.08, zd, s.oakDark, xMid, 0.04, zc, { cast: false });
  addContact(group, xMid + 0.28, zc, 0.7, zd + 0.1, 0.02);
}

function buildLockers(group, layout) {
  const s = layout.shell;
  const L = layout.architecture.lockers;
  const thick = L.xIn - L.xOut;
  const xMid = (L.xOut + L.xIn) / 2;
  const doors = [s.metal, '#5c6872', s.metalDark, '#70808c', '#58646e'];
  const gap = 0.06;
  const used = L.bays.reduce((a, b) => a + b, 0) + gap * (L.bays.length - 1);
  let z = L.z0 + (L.z1 - L.z0 - used) * 0.5;
  L.bays.forEach((w, i) => {
    lockerBay(group, s, xMid, thick, z, z + w, doors[i % doors.length]);
    z += w + gap;
  });
  addBox(group, 0.05, 0.9, L.z1 - L.z0, s.plasterShade, L.xIn + 0.03, 0.5, (L.z0 + L.z1) / 2, { cast: false });
}

function buildPinboard(group, layout) {
  const s = layout.shell;
  const p = layout.architecture.pinboard;
  addBox(group, 0.05, p.h, p.w, s.oak, p.x, 1.72, p.z, { cast: false });
  addBox(group, 0.03, p.h - 0.1, p.w - 0.1, s.pin, p.x + 0.03, 1.72, p.z, { cast: false });
  const papers = ['#f4efe4', '#e8dcc4', '#dce8e4', '#f0e4c8', '#e4d4d0'];
  for (let i = 0; i < 7; i++) {
    const pw = 0.22 + (i % 3) * 0.04;
    const ph = 0.16 + (i % 2) * 0.08;
    const py = 1.72 + ((i % 3) - 1) * 0.28;
    const pz = p.z + (i - 3) * 0.16;
    addBox(group, 0.008, ph, pw, papers[i % papers.length], p.x + 0.05, py, pz, { cast: false, receive: false });
  }
}

function addSconce(group, s, x, y, z) {
  addCyl(group, 0.05, 0.022, s.brass, x, y, z, { rotX: Math.PI / 2, cast: false, seg: 14 });
  addBox(group, 0.1, 0.022, 0.022, s.brass, x + 0.05, y, z, { cast: false });
  addCyl(group, 0.05, 0.07, '#f0d7b0', x + 0.12, y - 0.01, z, {
    emissive: '#ffd2a2',
    emissiveIntensity: 0.32,
    cast: false,
    seg: 14,
  });
}

function buildLeftWall(group, layout) {
  const s = layout.shell;
  const { width: W, depth: D, height: H } = layout.meta.room;
  const L = layout.architecture.lockers;
  const xOut = -W / 2;
  const xIn = L.xIn;
  const thick = xIn - xOut;
  const xMid = (xOut + xIn) / 2;

  addBox(group, thick, H, L.z0 - (-D / 2), s.plaster, xMid, H / 2, (L.z0 - D / 2) / 2);
  addBox(group, thick, H, D / 2 - L.z1, s.plaster, xMid, H / 2, (L.z1 + D / 2) / 2);
  addBox(group, thick, H - 2.28, L.z1 - L.z0, s.plaster, xMid, (H + 2.28) / 2, (L.z0 + L.z1) / 2, { cast: false });

  addBox(group, 0.06, 0.14, D - 0.2, s.oakDark, xIn + 0.02, 0.07, 0, { cast: false });
  addBox(group, 0.04, 0.05, D - 0.3, s.oak, xIn + 0.02, 1.12, 0, { cast: false });
  addBox(group, 0.04, 0.05, D - 0.3, s.oakMid, xIn + 0.02, 3.22, 0, { cast: false });

  buildLockers(group, layout);
  buildPinboard(group, layout);
  addSconce(group, s, xIn + 0.04, 2.05, -2.15);
  addSconce(group, s, xIn + 0.04, 2.05, 1.55);

  for (let i = 0; i < 4; i++) {
    addCyl(group, 0.018, 0.12, s.metalDark, xIn + 0.05, 1.55, 3.55 + i * 0.12, { rotX: Math.PI / 2, cast: false, seg: 8 });
  }
  addBox(group, 0.08, 1.95, 0.08, s.oak, xIn + 0.06, 1.05, 3.95);
  addBox(group, 0.04, 1.55, 0.9, s.plasterShade, xIn + 0.04, 1.0, 3.95, { cast: false });
}

function buildBackWall(group, layout) {
  const s = layout.shell;
  const { width: W, depth: D, height: H } = layout.meta.room;
  const zWall = -D / 2;
  const wins = layout.architecture.windows;
  const xL = -W / 2;
  const xR = W / 2;
  const sill = Math.min(...wins.map((w) => w.sill));
  const head = Math.max(...wins.map((w) => w.head));

  addBox(group, W, sill, 0.16, s.plaster, 0, sill / 2, zWall, { cast: false });
  addBox(group, W, H - head, 0.16, s.plaster, 0, (H + head) / 2, zWall, { cast: false });
  addBox(group, wins[0].x0 - xL, head - sill, 0.16, s.plaster, (xL + wins[0].x0) / 2, (sill + head) / 2, zWall, { cast: false });
  addBox(group, xR - wins[wins.length - 1].x1, head - sill, 0.16, s.plaster, (wins[wins.length - 1].x1 + xR) / 2, (sill + head) / 2, zWall, { cast: false });
  for (let i = 0; i < wins.length - 1; i++) {
    const a = wins[i].x1;
    const b = wins[i + 1].x0;
    addBox(group, b - a, head - sill, 0.16, s.plaster, (a + b) / 2, (sill + head) / 2, zWall, { cast: false });
  }

  addBox(group, W - 0.4, 0.16, 0.06, s.oakDark, 0.1, 0.08, zWall + 0.1, { cast: false });
  addBox(group, W - 0.5, 0.05, 0.05, s.oak, 0.1, 1.12, zWall + 0.1, { cast: false });
  addBox(group, W - 0.5, 0.05, 0.05, s.oakMid, 0.1, 3.22, zWall + 0.1, { cast: false });

  const niche = layout.architecture.boardNiche;
  addBox(group, niche.w + 0.16, niche.h + 0.16, 0.06, s.oak, niche.x, 1.55, zWall + 0.12);
  addBox(group, niche.w, niche.h, 0.04, s.slate, niche.x, 1.55, zWall + 0.16, { cast: false });
  addBox(group, niche.w * 0.92, 0.05, 0.1, s.oakDark, niche.x, 0.42, zWall + 0.22);
  for (let i = 0; i < 5; i++) {
    addBox(group, 0.08 + (i % 2) * 0.04, 0.012, 0.012, s.chalk, niche.x - 0.55 + i * 0.22, 0.46, zWall + 0.26, { cast: false });
  }
  addBox(group, 0.55, 0.08, 0.08, s.brass, niche.x, 2.72, zWall + 0.2, {
    emissive: '#ffd2a2',
    emissiveIntensity: 0.35,
    cast: false,
  });
  addBox(group, 1.35, 0.035, 0.04, '#dce8e0', niche.x - 0.15, 2.15, zWall + 0.2, { cast: false, receive: false });
  addBox(group, 0.95, 0.03, 0.03, '#c8d4cc', niche.x + 0.25, 1.95, zWall + 0.2, { cast: false, receive: false });

  const glassOpts = {
    transparent: true,
    opacity: 0.22,
    side: THREE.DoubleSide,
    emissive: '#e7f4ff',
    emissiveIntensity: 0.55,
    depthWrite: false,
    cast: false,
    receive: false,
  };
  addBox(group, 5.0, 2.4, 0.04, s.sky, 3.3, 1.8, zWall - 0.1, { cast: false, receive: false });
  for (const win of wins) {
    const x = (win.x0 + win.x1) / 2;
    const w = win.x1 - win.x0;
    const winH = win.head - win.sill;
    addBox(group, w + 0.16, 0.06, 0.28, s.oakLight, x, win.sill + 0.03, zWall + 0.2);
    addBox(group, w - 0.08, winH, 0.03, s.glass, x, win.sill + winH / 2, zWall + 0.02, glassOpts);
    addBox(group, w + 0.1, 0.07, 0.08, s.oak, x, win.head, zWall + 0.1);
    addBox(group, 0.06, winH + 0.08, 0.08, s.oak, win.x0, win.sill + winH / 2, zWall + 0.1);
    addBox(group, 0.06, winH + 0.08, 0.08, s.oak, win.x1, win.sill + winH / 2, zWall + 0.1);
    const cols = w > 1.3 ? 3 : 2;
    for (let c = 1; c < cols; c++) {
      addBox(group, 0.04, winH, 0.04, s.oakMid, win.x0 + (w * c) / cols, win.sill + winH / 2, zWall + 0.06, { cast: true });
    }
    addBox(group, w - 0.1, 0.035, 0.035, s.oakMid, x, win.sill + winH * 0.5, zWall + 0.06, { cast: true });
    addBox(group, 0.22, 0.36, w - 0.3, '#4a4e52', x, 0.26, zWall + 0.18, { cast: false });
    for (let k = -2; k <= 2; k++) {
      addBox(group, 0.015, 0.28, 0.02, '#2e3236', x + k * (w * 0.12), 0.28, zWall + 0.28, { cast: false });
    }
  }
}

function buildPlanter(group, layout) {
  const s = layout.shell;
  const p = layout.architecture.planter;
  addBox(group, p.w, p.h, p.d, s.oak, p.x, p.h / 2, p.z);
  addBox(group, p.w - 0.08, 0.08, p.d - 0.08, '#4a3a28', p.x, p.h - 0.02, p.z, { cast: false });
  addBox(group, p.w - 0.14, 0.05, p.d - 0.14, '#3a4a32', p.x, p.h + 0.02, p.z, { cast: false });
  addContact(group, p.x, p.z, p.w + 0.25, p.d + 0.25, 0.022);
}

function buildPrinter(group, s, x, z) {
  addBox(group, 0.55, 0.72, 0.48, s.metal, x, 0.36, z);
  addBox(group, 0.5, 0.06, 0.44, s.metalDark, x, 0.76, z);
  addBox(group, 0.42, 0.08, 0.28, '#c8d0d4', x, 0.84, z + 0.02, { cast: false });
  addBox(group, 0.16, 0.04, 0.12, s.accent, x + 0.12, 0.9, z - 0.1, { cast: false });
  addCyl(group, 0.14, 0.42, s.metalDark, x + 0.55, 0.22, z + 0.05, { seg: 14 });
  addContact(group, x, z, 0.85, 0.7, 0.022);
}

function buildShell(layout) {
  const g = new THREE.Group();
  g.name = 'shell';
  const { width: W, depth: D, height: H } = layout.meta.room;
  const s = layout.shell;

  addBox(g, W, 0.1, D, s.floorA, 0, -0.05, 0, { cast: false });
  const planks = Math.round(D / 0.2);
  for (let i = 0; i < planks; i++) {
    const z = -D / 2 + (i + 0.5) * (D / planks);
    addBox(g, W - 0.55, 0.012, D / planks - 0.014, i % 2 ? s.floorB : s.floorA, 0.08, 0.006, z, { cast: false });
  }
  addBox(g, W, 0.016, 0.24, s.floorBorder, 0, 0.01, -D / 2 + 0.18, { cast: false });
  addBox(g, W, 0.016, 0.2, s.floorBorder, 0, 0.01, D / 2 - 0.14, { cast: false });
  addBox(g, 0.24, 0.016, D, s.floorBorder, -W / 2 + 0.18, 0.01, 0, { cast: false });

  addBox(g, 2.05, 0.012, 3.15, s.rugEdge, 2.34, 0.016, 1.12, { cast: false });
  addBox(g, 1.82, 0.014, 2.88, s.rug, 2.34, 0.022, 1.12, { cast: false });
  addBox(g, 2.15, 0.012, 2.05, s.rugEdge, -1.45, 0.016, 2.72, { cast: false });
  addBox(g, 1.92, 0.014, 1.82, s.runner, -1.45, 0.022, 2.72, { cast: false });
  addBox(g, 1.15, 0.012, 6.4, s.rugEdge, 0.55, 0.016, -0.15, { cast: false });
  addBox(g, 0.92, 0.014, 6.15, '#4a5458', 0.55, 0.022, -0.15, { cast: false });
  addBox(g, 2.2, 0.012, 2.05, s.rugEdge, 4.55, 0.016, 2.4, { cast: false });
  addBox(g, 1.95, 0.014, 1.82, '#3a4a42', 4.55, 0.022, 2.4, { cast: false });

  const ceilY = H - 0.05;
  addBox(g, 10.4, 0.08, 5.6, s.ceiling, -0.55, ceilY, -0.85, { cast: false });
  addBox(g, 3.2, 0.08, 2.4, s.ceiling, -4.55, ceilY, 2.35, { cast: false });
  for (const z of [-2.55, -1.15, 0.25, 1.55]) {
    addBox(g, 9.6, 0.12, 0.14, s.beam, -0.4, 3.38, z);
  }
  for (let i = 0; i < 5; i++) {
    const z = -2.35 + i * 0.95;
    addBox(g, 3.4, 0.08, 0.42, s.baffle, -1.15, 3.22, z, { cast: false });
    addBox(g, 2.6, 0.08, 0.42, s.baffle, 2.55, 3.22, z + 0.12, { cast: false });
  }
  addBox(g, 7.4, 0.04, 0.08, s.metalDark, 0.15, 3.42, -1.05);
  addBox(g, 0.08, 0.04, 4.2, s.metalDark, -3.55, 3.42, -0.15);

  return g;
}

function deskDress(group, inst, layout) {
  const rot = inst.rotationY || 0;
  const longAlongX = Math.abs(Math.abs(rot) - Math.PI / 2) < 0.3;
  const [x, , z] = inst.position;
  notebook(group, x + (longAlongX ? -0.22 : 0.08), 0.772, z + (longAlongX ? 0.04 : -0.28), rot + 0.15, inst.cluster === 'focus' ? '#e8dcc4' : '#f4efe4');
  addBox(group, 0.035, 0.015, 0.16, '#2a2a2e', x + (longAlongX ? 0.28 : 0.12), 0.77, z + (longAlongX ? -0.02 : -0.42), { cast: false });
}

function dressInstances(group, layout) {
  const s = layout.shell;
  const { height: H } = layout.meta.room;
  for (const inst of layout.instances) {
    const [x, y, z] = inst.position;
    if (inst.kind === 'dining_chair') addContact(group, x, z, 0.42, 0.5, 0.03);
    if (inst.kind === 'study_desk') {
      const rot = Math.abs(inst.rotationY || 0) % Math.PI;
      const swap = Math.abs(rot - Math.PI / 2) < 0.35;
      addContact(group, x, z, swap ? 1.45 : 0.7, swap ? 0.7 : 1.45, 0.03);
      deskDress(group, inst, layout);
    }
    if (inst.kind === 'square_table') addContact(group, x, z, 1.05, 1.05, 0.03);
    if (inst.kind === 'coffee_table') addContact(group, x, z, 1.15, 0.85, 0.03);
    if (inst.kind === 'book_stand') addContact(group, x, z, 0.7, 0.7, 0.03);
    if (inst.kind === 'museum_bench') addContact(group, x, z, 0.55, 1.4, 0.03);
    if (inst.kind === 'chalkboard') addContact(group, x, z, 2.2, 0.7, 0.022);
    if (inst.kind === 'flowerpot') {
      if (y < 0.05) addContact(group, x, z, 0.36, 0.36, 0.03);
      const greens = ['#3d6b44', '#2f5a38', '#4a7a52', '#355c40'];
      addPlant(group, x, y + 0.24, z, y > 0.5 ? 0.72 : 1, greens[Math.abs(Math.round(x * 3 + z)) % greens.length]);
    }
    if (inst.kind === 'pendant_lamp') {
      addCyl(group, 0.01, H - 0.18 - (y + 0.48), s.oakDark, x, (H - 0.12 + y + 0.48) / 2, z, { cast: false });
    }
    if (inst.kind === 'study_desk') {
      const rot = inst.rotationY || 0;
      const alongX = Math.abs(Math.abs(rot) - Math.PI / 2) < 0.3;
      const dropX = x + (alongX ? 0.18 : 0.12);
      const dropZ = z + (alongX ? -0.04 : -0.22);
      addCyl(group, 0.006, 0.22, '#2a2a2e', dropX, 3.32, dropZ, { cast: false, seg: 6 });
      addBox(group, 0.04, 0.015, 0.12, '#2a2a2e', dropX, 0.77, dropZ, { cast: false });
    }
  }
  addBox(group, 0.28, 0.16, 0.22, '#6a5340', -4.55, 0.82, 2.38, { cast: false });
  addBox(group, 0.22, 0.12, 0.18, '#4a3a2c', -4.42, 0.96, 2.42, { cast: false });
}

function makeShell(layout) {
  return buildShell(layout);
}

function makeProcedural(layout) {
  const g = new THREE.Group();
  g.name = 'procedural';
  const s = layout.shell;
  buildBackWall(g, layout);
  buildLeftWall(g, layout);
  buildPlanter(g, layout);
  buildPrinter(g, s, -4.55, 2.55);
  dressInstances(g, layout);
  return g;
}

function decorateAsset(prepared, kind) {
  if (kind !== 'monitor') return;
  prepared.traverse((obj) => {
    if (!obj.isMesh || !obj.material) return;
    const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
    for (const m of mats) {
      if (!m || !m.color) continue;
      const hex = m.color.getHexString();
      if (hex === '000000' || hex === '282828') {
        m.emissive = new THREE.Color('#6a88a8');
        m.emissiveIntensity = 0.28;
      }
    }
  });
}

boot({
  makeShell,
  makeProcedural,
  decorateAsset,
  readyText: 'ready — cowork / study · drag orbit · U unlit · T toon',
});
