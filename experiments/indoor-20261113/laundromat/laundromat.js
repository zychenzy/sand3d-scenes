import * as THREE from 'three';
import { boot, toon, addBox, addCyl } from './scene_lib.js';

const CLOTH = ['#d4524a', '#3d7ea6', '#e6d28a', '#6a8f62', '#f3f1ec', '#c46b8a', '#3e4a6b', '#e7e2d4'];
const FONT = '"WenQuanYi Micro Hei", "Droid Sans Fallback", sans-serif';

function tileTexture(repeatX, repeatY) {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = '#7d8b93';
  g.fillRect(0, 0, 128, 128);
  g.fillStyle = '#d3dde2';
  g.fillRect(7, 7, 114, 114);
  g.fillStyle = 'rgba(255,255,255,0.22)';
  g.fillRect(7, 7, 114, 18);
  g.fillStyle = 'rgba(90,110,120,0.08)';
  g.fillRect(70, 40, 40, 60);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  tex.anisotropy = 4;
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  return tex;
}

function signTexture(lines, bg, fg, accent) {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = bg;
  g.fillRect(0, 0, 512, 256);
  if (accent) {
    g.fillStyle = accent;
    g.fillRect(0, 0, 18, 256);
  }
  g.fillStyle = fg;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  const n = lines.length;
  lines.forEach((line, i) => {
    const size = line.size || (n === 1 ? 92 : i === 0 ? 72 : 48);
    g.font = `${line.weight || 700} ${size}px ${FONT}`;
    g.fillStyle = line.color || fg;
    const y = n === 1 ? 128 : 70 + i * (150 / Math.max(n - 1, 1));
    g.fillText(line.text || line, 256 + (accent ? 8 : 0), y);
  });
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function makeShell(layout) {
  const g = new THREE.Group();
  g.name = 'shell';
  const { width: W, depth: D, height: H } = layout.meta.room;
  const s = layout.shell;
  const wallT = s.wallThickness || 0.14;

  const floorMat = toon(s.floorColor, { map: tileTexture(W / 0.6, D / 0.6), steps: 3 });
  const floor = addBox(g, W, 0.08, D, floorMat, 0, -0.04, 0, { cast: false });
  floor.name = 'floor';

  const wall = toon(s.wallColor, { steps: 4 });
  const wainscot = toon(s.wainscotColor, { steps: 4 });
  const rail = toon(s.railColor, { steps: 3 });
  const glass = toon(s.glassColor, { steps: 3, transparent: true, opacity: 0.35, side: THREE.DoubleSide });

  addBox(g, W, H, wallT, wall, 0, H / 2, -D / 2, { cast: false });
  addBox(g, wallT, H, D, wall, -W / 2, H / 2, 0, { cast: false });
  addBox(g, W - 0.2, 1.15, 0.04, wainscot, 0, 0.575, -D / 2 + wallT / 2 + 0.02, { cast: false });
  addBox(g, 0.04, 1.15, D - 0.2, wainscot, -W / 2 + wallT / 2 + 0.02, 0.575, 0, { cast: false });
  addBox(g, W - 0.16, 0.06, 0.06, rail, 0, 1.18, -D / 2 + 0.1, { cast: false });
  addBox(g, 0.06, 0.06, D - 0.16, rail, -W / 2 + 0.1, 1.18, 0, { cast: false });
  addBox(g, W - 0.3, 0.08, 0.08, toon(s.baseboardColor, { steps: 3 }), 0, 0.04, -D / 2 + 0.1, { cast: false });
  addBox(g, 0.08, 0.08, D - 0.3, toon(s.baseboardColor, { steps: 3 }), -W / 2 + 0.1, 0.04, 0, { cast: false });

  const paneW = 0.7;
  for (let i = 0; i < 8; i++) {
    const x = -3.15 + i * 0.86;
    addBox(g, paneW, 0.42, 0.03, glass, x, 2.55, -D / 2 + 0.1, { cast: false });
    addBox(g, 0.045, 0.5, 0.05, rail, x - paneW / 2 - 0.02, 2.55, -D / 2 + 0.11, { cast: false });
  }

  const ceilLit = toon(s.ceilingColor, { steps: 4, emissive: '#e4eef3', emissiveIntensity: 0.55 });
  const ceil = addBox(g, W * 0.98, 0.08, D * 0.62, ceilLit, -0.15, H - 0.05, -D * 0.16, { cast: false });
  ceil.name = 'ceiling';

  const chase = toon(s.chaseColor, { steps: 3 });
  const pipe = toon(s.pipeColor, { steps: 3 });
  addBox(g, 8.6, 0.42, 0.48, chase, -0.9, 2.72, -D / 2 + 0.36, { cast: false });
  for (let i = 0; i < 3; i++) {
    addCyl(g, 0.045, 0.045, 8.2, pipe, 0, 2.55, -D / 2 + 0.22 + i * 0.1, 8, { rot: [0, 0, Math.PI / 2], cast: false });
  }

  const stripe = toon(s.stripeColor, { steps: 3 });
  addBox(g, 0.16, 0.012, 6.4, stripe, -5.35, 0.008, -0.2, { cast: false, receive: false });

  return g;
}

function clothLump(parent, x, y, z, sx, sy, sz, color, rotY) {
  const mesh = addBox(parent, sx, sy, sz, toon(color, { steps: 5 }), x, y, z);
  mesh.rotation.y = rotY || 0;
  mesh.rotation.z = (rotY || 0) * 0.15;
  return mesh;
}

function foldingTable(parent, spec) {
  const g = new THREE.Group();
  g.name = spec.id;
  g.position.set(spec.position[0], 0, spec.position[2]);
  if (spec.rotationY) g.rotation.y = spec.rotationY;
  const [w, h, d] = spec.size;
  const top = toon('#f4f7f8', { steps: 3 });
  const edge = toon('#8aa0a8', { steps: 3 });
  const leg = toon('#5c6970', { steps: 3 });
  addBox(g, w, 0.045, d, top, 0, h, 0);
  addBox(g, w + 0.02, 0.025, 0.02, edge, 0, h - 0.01, d / 2);
  addBox(g, w + 0.02, 0.025, 0.02, edge, 0, h - 0.01, -d / 2);
  const ix = w / 2 - 0.08;
  const iz = d / 2 - 0.08;
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      addBox(g, 0.05, h - 0.04, 0.05, leg, sx * ix, (h - 0.04) / 2, sz * iz);
    }
  }
  addBox(g, w - 0.22, 0.03, 0.04, leg, 0, 0.28, 0);
  addBox(g, w - 0.28, 0.02, d - 0.18, toon('#e7eef1', { steps: 4 }), 0, 0.36, 0);
  parent.add(g);
  return g;
}

function laundryCart(parent, spec) {
  const g = new THREE.Group();
  g.name = spec.id;
  g.position.set(spec.position[0], 0, spec.position[2]);
  if (spec.rotationY) g.rotation.y = spec.rotationY;
  const [w, , d] = spec.size;
  const chrome = toon('#d5dde3', { steps: 3 });
  const dark = toon('#2c3438', { steps: 3 });
  const rimY = 0.62;
  addBox(g, w, 0.025, 0.02, chrome, 0, rimY, d / 2);
  addBox(g, w, 0.025, 0.02, chrome, 0, rimY, -d / 2);
  addBox(g, 0.02, 0.025, d, chrome, w / 2, rimY, 0);
  addBox(g, 0.02, 0.025, d, chrome, -w / 2, rimY, 0);
  addBox(g, w - 0.04, 0.02, d - 0.04, chrome, 0, 0.18, 0);
  for (let i = 0; i < 7; i++) {
    const z = -d / 2 + 0.06 + i * ((d - 0.12) / 6);
    addBox(g, 0.012, rimY - 0.16, 0.012, chrome, -w / 2 + 0.02, 0.18 + (rimY - 0.16) / 2, z);
    addBox(g, 0.012, rimY - 0.16, 0.012, chrome, w / 2 - 0.02, 0.18 + (rimY - 0.16) / 2, z);
  }
  for (let i = 0; i < 5; i++) {
    const x = -w / 2 + 0.08 + i * ((w - 0.16) / 4);
    addBox(g, 0.012, rimY - 0.16, 0.012, chrome, x, 0.18 + (rimY - 0.16) / 2, d / 2 - 0.02);
    addBox(g, 0.012, rimY - 0.16, 0.012, chrome, x, 0.18 + (rimY - 0.16) / 2, -d / 2 + 0.02);
  }
  const corners = [[-1, -1], [1, -1], [-1, 1], [1, 1]];
  for (const [sx, sz] of corners) {
    addCyl(g, 0.035, 0.035, 0.08, dark, sx * (w / 2 - 0.06), 0.08, sz * (d / 2 - 0.08), 10);
    addCyl(g, 0.045, 0.045, 0.03, dark, sx * (w / 2 - 0.06), 0.03, sz * (d / 2 - 0.08), 10);
  }
  addCyl(g, 0.015, 0.015, 0.42, chrome, 0, 0.84, -d / 2 + 0.02, 8);
  addBox(g, w * 0.72, 0.02, 0.02, chrome, 0, 1.02, -d / 2 + 0.02);
  if (spec.load) {
    clothLump(g, -0.08, 0.34, 0.02, 0.28, 0.16, 0.22, CLOTH[0], 0.4);
    clothLump(g, 0.1, 0.38, -0.06, 0.24, 0.14, 0.2, CLOTH[1], -0.5);
    clothLump(g, 0.0, 0.48, 0.05, 0.22, 0.1, 0.18, CLOTH[4], 0.2);
  }
  parent.add(g);
}

function changeMachine(parent, spec) {
  const g = new THREE.Group();
  g.name = spec.id;
  const [x, , z] = spec.position;
  g.position.set(x, 0, z);
  if (spec.rotationY) g.rotation.y = spec.rotationY;
  const [w, h, d] = spec.size;
  const body = toon('#2e363c', { steps: 3 });
  const face = toon('#1b2428', { steps: 3 });
  addBox(g, w, h, d, body, 0, h / 2, 0);
  addBox(g, w * 0.82, h * 0.42, 0.02, face, 0, h * 0.62, d / 2 + 0.005);
  addBox(g, w * 0.55, 0.08, 0.025, toon('#14343c', { steps: 3, emissive: '#1f8ea3', emissiveIntensity: 0.7 }), 0, h * 0.72, d / 2 + 0.02);
  addBox(g, 0.16, 0.045, 0.03, toon('#0e1418', { steps: 3 }), 0, h * 0.48, d / 2 + 0.02);
  addBox(g, w * 0.7, 0.08, 0.06, toon('#c5ccd1', { steps: 3 }), 0, h * 0.28, d / 2 + 0.02);
  addCyl(g, 0.03, 0.03, 0.02, toon('#f0b429', { steps: 3, emissive: '#f0b429', emissiveIntensity: 0.5 }), w * 0.22, h * 0.56, d / 2 + 0.02, 10);
  parent.add(g);
}

function bottleShelf(parent, spec) {
  const g = new THREE.Group();
  g.name = spec.id;
  g.position.set(spec.position[0], 0, spec.position[2]);
  const [w, h, d] = spec.size;
  const steel = toon('#8b98a0', { steps: 3 });
  const back = toon('#d5dee3', { steps: 4 });
  addBox(g, w, h, 0.02, back, 0, h / 2, -d / 2);
  for (const sx of [-1, 1]) addBox(g, 0.03, h, d, steel, sx * (w / 2 - 0.015), h / 2, 0);
  for (const y of spec.boards) addBox(g, w - 0.04, 0.02, d - 0.02, steel, 0, y, 0);
  parent.add(g);
}

function wallSign(parent, spec) {
  const tex = signTexture(spec.lines, spec.bg, spec.fg, spec.accent);
  const mat = toon('#ffffff', { map: tex, steps: 3 });
  const [w, h] = spec.size;
  const mesh = addBox(parent, w, h, 0.03, mat, spec.position[0], spec.position[1], spec.position[2], { cast: false });
  mesh.rotation.y = spec.rotationY || 0;
  mesh.name = spec.id;
}

function numberPlate(parent, inst, wall) {
  const tex = signTexture(
    [{ text: inst.label, size: 120, weight: 700 }],
    inst.led === '#d04545' ? '#5a1e22' : '#10262c',
    '#f4f1ea',
    inst.led
  );
  const mat = toon('#ffffff', { map: tex, steps: 3 });
  const y = 1.28;
  if (wall === 'back') {
    addBox(parent, 0.32, 0.16, 0.02, mat, inst.position[0], y, wallZ(inst), { cast: false });
  } else {
    const mesh = addBox(parent, 0.32, 0.16, 0.02, mat, wallX(), y, inst.position[2], { cast: false });
    mesh.rotation.y = Math.PI / 2;
  }
  const ledMat = toon(inst.led, { steps: 3, emissive: inst.led, emissiveIntensity: 0.9 });
  if (wall === 'back') addBox(parent, 0.045, 0.045, 0.02, ledMat, inst.position[0] + 0.2, y, wallZ(inst) + 0.01, { cast: false });
  else {
    const led = addBox(parent, 0.045, 0.045, 0.02, ledMat, wallX() + 0.02, y, inst.position[2] + 0.2, { cast: false });
    led.rotation.y = Math.PI / 2;
  }
}

function wallZ() { return -4.68; }
function wallX() { return -7.0; }

function safetyAndDrain(parent, layout) {
  const y = 0.012;
  const line = toon('#e2b423', { steps: 3 });
  addBox(parent, 6.4, 0.008, 0.06, line, -0.87, y, -3.72, { cast: false });
  addBox(parent, 0.06, 0.008, 4.7, line, -5.95, y, 0.0, { cast: false });
  const drain = toon('#1c2428', { steps: 3 });
  addBox(parent, 6.5, 0.006, 0.08, drain, -0.87, 0.01, -3.92, { cast: false });
  const mat = layout.procedural.mat;
  addBox(parent, mat.size[0], 0.015, mat.size[2], toon('#2a3a40', { steps: 4 }), mat.position[0], 0.01, mat.position[2], { cast: false });
}

function foldedStack(parent, spec) {
  const g = new THREE.Group();
  g.position.set(spec.position[0], spec.position[1], spec.position[2]);
  g.rotation.y = spec.rotationY || 0;
  let y = 0.012;
  const colors = spec.colors || CLOTH;
  const fw = spec.w || 0.28;
  const fd = spec.d || 0.22;
  for (let i = 0; i < (spec.layers || 4); i++) {
    const t = 0.022 + (i % 2) * 0.006;
    const dx = ((i % 3) - 1) * 0.006;
    addBox(g, fw, t, fd, toon(colors[i % colors.length], { steps: 5 }), dx, y, (i % 2) * 0.006);
    addBox(g, fw + 0.012, 0.006, fd + 0.012, toon('#c5b7a4', { steps: 5 }), dx, y + t * 0.5, (i % 2) * 0.006);
    y += t + 0.004;
  }
  parent.add(g);
}

function crumple(parent, spec) {
  const g = new THREE.Group();
  g.position.set(spec.position[0], spec.position[1], spec.position[2]);
  clothLump(g, 0, 0.08, 0, 0.26, 0.12, 0.18, spec.colors?.[0] || CLOTH[2], 0.3);
  clothLump(g, 0.06, 0.14, 0.04, 0.18, 0.08, 0.14, spec.colors?.[1] || CLOTH[5], -0.4);
  parent.add(g);
}

function aFrame(parent, spec) {
  const g = new THREE.Group();
  g.name = spec.id;
  g.position.set(spec.position[0], 0, spec.position[2]);
  const steel = toon('#5c6970', { steps: 3 });
  addBox(g, 0.04, 0.72, 0.04, steel, -0.22, 0.36, 0.08);
  addBox(g, 0.04, 0.72, 0.04, steel, 0.22, 0.36, 0.08);
  addBox(g, 0.04, 0.72, 0.04, steel, -0.22, 0.36, -0.08);
  addBox(g, 0.04, 0.72, 0.04, steel, 0.22, 0.36, -0.08);
  const tex = signTexture(spec.lines, spec.bg, spec.fg, spec.accent);
  const mat = toon('#ffffff', { map: tex, steps: 3 });
  const board = addBox(g, 0.52, 0.42, 0.02, mat, 0, 0.48, 0, { cast: false });
  board.rotation.x = -0.15;
  parent.add(g);
}

function trashCan(parent, spec) {
  const g = new THREE.Group();
  g.position.set(spec.position[0], 0, spec.position[2]);
  addCyl(g, 0.18, 0.16, 0.42, toon('#2f3832', { steps: 3 }), 0, 0.21, 0, 12);
  addCyl(g, 0.19, 0.19, 0.03, toon('#1c2420', { steps: 3 }), 0, 0.43, 0, 12);
  parent.add(g);
}

function tag(parent, spec) {
  const tex = signTexture([{ text: '暂停', size: 78 }, { text: 'OUT OF ORDER', size: 42 }], '#f4f1ea', '#8d1f24', '#8d1f24');
  const mesh = addBox(parent, 0.28, 0.16, 0.008, toon('#ffffff', { map: tex, steps: 3 }), spec.position[0], spec.position[1], spec.position[2], { cast: false });
  mesh.rotation.y = spec.rotationY || 0;
  mesh.rotation.z = 0.08;
}

function drapeRack(parent, inst) {
  const x = inst.position[0];
  const z = inst.position[2];
  clothLump(parent, x - 0.22, 0.82, z, 0.28, 0.06, 0.22, CLOTH[3], 0.2);
  clothLump(parent, x + 0.05, 0.84, z + 0.04, 0.22, 0.05, 0.26, CLOTH[6], -0.3);
  clothLump(parent, x + 0.28, 0.8, z - 0.02, 0.2, 0.05, 0.18, CLOTH[4], 0.5);
}

function troffers(parent, list) {
  const housing = toon('#e7eef2', { steps: 3 });
  const lamp = toon('#f7fbff', { steps: 3, emissive: '#d7e8ff', emissiveIntensity: 0.55 });
  for (const p of list) {
    addBox(parent, 1.15, 0.06, 0.28, housing, p[0], p[1], p[2], { cast: false });
    addBox(parent, 1.0, 0.02, 0.16, lamp, p[0], p[1] - 0.04, p[2], { cast: false });
  }
}

function makeProcedural(layout) {
  const g = new THREE.Group();
  g.name = 'procedural';
  const p = layout.procedural;
  for (const table of p.tables) foldingTable(g, table);
  for (const cart of p.carts) laundryCart(g, cart);
  changeMachine(g, p.change);
  bottleShelf(g, p.shelf);
  for (const sign of p.signs) wallSign(g, sign);
  aFrame(g, p.aFrame);
  trashCan(g, p.trash);
  tag(g, p.tag);
  safetyAndDrain(g, layout);
  for (const stack of p.stacks) foldedStack(g, stack);
  for (const pile of p.piles) crumple(g, pile);
  troffers(g, p.troffers);
  for (const inst of layout.instances) {
    if (inst.kind === 'washer' || inst.kind === 'washer_combo') numberPlate(g, inst, 'back');
    if (inst.kind === 'dryer') numberPlate(g, inst, 'left');
    if (inst.kind === 'drying_rack') drapeRack(g, inst);
  }
  const ext = p.extinguisher;
  addCyl(g, 0.07, 0.07, 0.42, toon('#c0392b', { steps: 3 }), ext.position[0], 0.7, ext.position[2], 10);
  addBox(g, 0.05, 0.08, 0.05, toon('#222', { steps: 3 }), ext.position[0], 0.95, ext.position[2]);
  return g;
}

boot({
  makeShell,
  makeProcedural,
  readyText: 'ready — 巷洗 laundromat · drag orbit · U unlit · T toon',
});
