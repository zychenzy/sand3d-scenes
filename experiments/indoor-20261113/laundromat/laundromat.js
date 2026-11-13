import * as THREE from 'three';
import { boot, toon, addBox, addCyl, addMesh } from './scene_lib.js';

const CLOTH = ['#d4524a', '#3d7ea6', '#e6d28a', '#6a8f62', '#f3f1ec', '#c46b8a', '#3e4a6b', '#e7e2d4'];
const FONT = '"WenQuanYi Micro Hei", "Droid Sans Fallback", sans-serif';

function canvasTex(draw, w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d'), w, h);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 8;
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  return tex;
}

function floorTexture(repeatX, repeatY) {
  const tones = ['#efe4d2', '#e7d9c4', '#f3e9d8', '#e2d3bc', '#eadfcb', '#f0e6d4'];
  const tex = canvasTex((g, w, h) => {
    const n = 4;
    const cell = w / n;
    g.fillStyle = '#c4b49f';
    g.fillRect(0, 0, w, h);
    for (let y = 0; y < n; y++) {
      for (let x = 0; x < n; x++) {
        g.fillStyle = tones[(x * 3 + y * 2) % tones.length];
        g.fillRect(x * cell + 2, y * cell + 2, cell - 4, cell - 4);
        g.fillStyle = 'rgba(120, 90, 60, 0.07)';
        for (let i = 0; i < 5; i++) {
          const sx = x * cell + 8 + ((i * 41 + x * 17) % (cell - 18));
          const sy = y * cell + 10 + ((i * 29 + y * 13) % (cell - 20));
          g.fillRect(sx, sy, 2, 1);
        }
      }
    }
  }, 256, 256);
  tex.repeat.set(repeatX, repeatY);
  return tex;
}

function wainscotTexture(repeatX, repeatY) {
  const tex = canvasTex((g, w, h) => {
    const cols = 2;
    const rows = 4;
    const cw = w / cols;
    const ch = h / rows;
    g.fillStyle = '#c9bfb0';
    g.fillRect(0, 0, w, h);
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        g.fillStyle = (x + y) % 2 === 0 ? '#f4efe6' : '#ebe4d8';
        g.fillRect(x * cw + 2, y * ch + 2, cw - 4, ch - 4);
      }
    }
  }, 128, 256);
  tex.repeat.set(repeatX, repeatY);
  return tex;
}

function signTexture(lines, bg, fg, accent, aspect = 2) {
  const h = 512;
  const w = Math.max(320, Math.round(h * aspect));
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const g = c.getContext('2d');
  g.fillStyle = bg;
  g.fillRect(0, 0, w, h);
  if (accent) {
    g.fillStyle = accent;
    g.fillRect(0, 0, Math.max(10, w * 0.025), h);
  }
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  const n = lines.length;
  const scale = h / 256;
  lines.forEach((line, i) => {
    const requested = (line.size || (n === 1 ? 92 : i === 0 ? 72 : 48)) * scale;
    const size = Math.min(requested, (h * 0.72) / n);
    g.font = `${line.weight || 700} ${size}px ${FONT}`;
    g.fillStyle = line.color || fg;
    const y = n === 1 ? h / 2 : h * 0.18 + i * ((h * 0.66) / Math.max(n - 1, 1));
    g.fillText(line.text || line, w / 2 + (accent ? w * 0.02 : 0), y);
  });
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

function makeShell(layout) {
  const g = new THREE.Group();
  g.name = 'shell';
  const { width: W, depth: D, height: H } = layout.meta.room;
  const s = layout.shell;
  const wallT = s.wallThickness || 0.14;

  const tileM = 0.42 * 4;
  const floorMat = toon('#ffffff', { map: floorTexture(W / tileM, D / tileM), steps: 4 });
  const floor = addBox(g, W, 0.08, D, floorMat, 0, -0.04, 0, { cast: false });
  floor.name = 'floor';

  const wall = toon(s.wallColor, { steps: 5 });
  const wainscotBack = toon('#ffffff', { map: wainscotTexture((W - 0.2) / 0.6, 1.15 / 0.56), steps: 4 });
  const wainscotLeft = toon('#ffffff', { map: wainscotTexture((D - 0.2) / 0.6, 1.15 / 0.56), steps: 4 });
  const rail = toon(s.railColor, { steps: 3 });
  const glass = toon(s.glassColor, { steps: 3, transparent: true, opacity: 0.35, side: THREE.DoubleSide });

  addBox(g, W, H, wallT, wall, 0, H / 2, -D / 2, { cast: false });
  addBox(g, wallT, H, D, wall, -W / 2, H / 2, 0, { cast: false });
  addBox(g, W - 0.2, 1.15, 0.04, wainscotBack, 0, 0.575, -D / 2 + wallT / 2 + 0.02, { cast: false });
  addBox(g, 0.04, 1.15, D - 0.2, wainscotLeft, -W / 2 + wallT / 2 + 0.02, 0.575, 0, { cast: false });
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

  const ceilLit = toon(s.ceilingColor, { steps: 5, emissive: '#f3ecdf', emissiveIntensity: 0.22 });
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

const slabGeo = new Map();

function roundedSlabGeo(w, d, t) {
  const r = Math.min(0.045, w * 0.18, d * 0.18);
  const key = `${w.toFixed(3)}|${d.toFixed(3)}|${t.toFixed(3)}`;
  if (slabGeo.has(key)) return slabGeo.get(key);
  const shape = new THREE.Shape();
  const x0 = -w / 2;
  const y0 = -d / 2;
  shape.moveTo(x0 + r, y0);
  shape.lineTo(x0 + w - r, y0);
  shape.quadraticCurveTo(x0 + w, y0, x0 + w, y0 + r);
  shape.lineTo(x0 + w, y0 + d - r);
  shape.quadraticCurveTo(x0 + w, y0 + d, x0 + w - r, y0 + d);
  shape.lineTo(x0 + r, y0 + d);
  shape.quadraticCurveTo(x0, y0 + d, x0, y0 + d - r);
  shape.lineTo(x0, y0 + r);
  shape.quadraticCurveTo(x0, y0, x0 + r, y0);
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: Math.max(0.01, t * 0.62),
    bevelEnabled: true,
    bevelThickness: t * 0.22,
    bevelSize: Math.min(0.016, r * 0.55),
    bevelSegments: 2,
    curveSegments: 3,
  });
  geo.translate(0, 0, -t / 2);
  geo.rotateX(-Math.PI / 2);
  slabGeo.set(key, geo);
  return geo;
}

function clothColor(hex, lift) {
  const c = new THREE.Color(hex);
  c.offsetHSL(0, -0.04, lift);
  return c;
}

function softCloth(parent, x, y, z, sx, sy, sz, color, rotY) {
  const mesh = addMesh(parent, new THREE.SphereGeometry(0.5, 14, 10), toon(color, { steps: 5 }), x, y, z);
  mesh.scale.set(sx, sy, sz);
  mesh.rotation.set(0.35, rotY || 0, 0.2);
  return mesh;
}

function foldedGarment(parent, w, d, color, y, yaw) {
  const body = addMesh(
    parent,
    roundedSlabGeo(w, d * 0.92, 0.034),
    toon(color, { steps: 5 }),
    0,
    y,
    -d * 0.04,
    { rot: [0, yaw, 0] }
  );
  addMesh(
    parent,
    roundedSlabGeo(w * 0.94, d * 0.5, 0.014),
    toon(clothColor(color, 0.05), { steps: 5 }),
    0,
    y + 0.01,
    d * 0.34,
    { rot: [0.62, yaw * 0.35, 0] }
  );
  addMesh(
    parent,
    roundedSlabGeo(w * 0.72, 0.018, 0.006),
    toon(clothColor(color, -0.1), { steps: 5 }),
    0,
    y + 0.012,
    d * 0.04,
    { rot: [0, yaw, 0] }
  );
  return body;
}

function foldingTable(parent, spec) {
  const g = new THREE.Group();
  g.name = spec.id;
  g.position.set(spec.position[0], 0, spec.position[2]);
  if (spec.rotationY) g.rotation.y = spec.rotationY;
  const [w, h, d] = spec.size;
  const top = toon('#f7f3ea', { steps: 4 });
  const edge = toon('#8d8478', { steps: 3 });
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
    softCloth(g, -0.06, 0.32, 0.02, 0.34, 0.16, 0.26, CLOTH[0], 0.4);
    softCloth(g, 0.1, 0.36, -0.04, 0.28, 0.14, 0.22, CLOTH[1], -0.6);
    softCloth(g, 0.02, 0.44, 0.04, 0.24, 0.12, 0.2, CLOTH[4], 0.2);
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
  const [bw, bh] = spec.size;
  const tex = signTexture(spec.lines, spec.bg, spec.fg, spec.accent, bw / bh);
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
  const colors = spec.colors || CLOTH;
  const fw = spec.w || 0.28;
  const fd = spec.d || 0.22;
  const count = Math.min(spec.layers || 3, 4);
  let y = 0.028;
  for (let i = 0; i < count; i++) {
    const shrink = 1 - i * 0.035;
    const yaw = (i - 1) * 0.08;
    foldedGarment(g, fw * shrink, fd * (0.96 + (i % 2) * 0.04), colors[i % colors.length], y, yaw);
    y += 0.046;
  }
  parent.add(g);
}

function crumple(parent, spec) {
  const g = new THREE.Group();
  g.position.set(spec.position[0], spec.position[1], spec.position[2]);
  softCloth(g, 0, 0.06, 0, 0.28, 0.12, 0.2, spec.colors?.[0] || CLOTH[2], 0.4);
  softCloth(g, 0.05, 0.1, 0.03, 0.2, 0.1, 0.16, spec.colors?.[1] || CLOTH[5], -0.5);
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
  const tex = signTexture(spec.lines, spec.bg, spec.fg, spec.accent, 0.52 / 0.42);
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
  const tex = signTexture([{ text: '暂停', size: 78 }, { text: 'OUT OF ORDER', size: 42 }], '#f4f1ea', '#8d1f24', '#8d1f24', 0.28 / 0.16);
  const mesh = addBox(parent, 0.28, 0.16, 0.008, toon('#ffffff', { map: tex, steps: 3 }), spec.position[0], spec.position[1], spec.position[2], { cast: false });
  mesh.rotation.y = spec.rotationY || 0;
  mesh.rotation.z = 0.08;
}

function hangTowel(parent, x, y, z, w, h, color, yaw) {
  const mat = toon(color, { steps: 5 });
  addCyl(parent, 0.02, 0.02, w * 0.9, mat, x, y, z, 10, { rot: [0, yaw, Math.PI / 2] });
  addMesh(parent, roundedSlabGeo(w * 0.86, h, 0.012), mat, x, y - h * 0.46, z + 0.03, { rot: [1.35, yaw, 0] });
}

function drapeRack(parent, inst) {
  const x = inst.position[0];
  const z = inst.position[2];
  hangTowel(parent, x - 0.22, 0.7, z, 0.26, 0.32, CLOTH[3], 0.12);
  hangTowel(parent, x + 0.06, 0.68, z + 0.02, 0.22, 0.28, CLOTH[6], -0.18);
  hangTowel(parent, x + 0.28, 0.66, z - 0.02, 0.2, 0.24, CLOTH[4], 0.25);
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

function paintNamed(root, colors) {
  root.traverse((obj) => {
    const hex = colors[obj.name];
    if (!obj.isMesh || !hex) return;
    const src = Array.isArray(obj.material) ? obj.material : [obj.material];
    const next = src.map((m) => {
      const copy = m.clone();
      copy.color = new THREE.Color(hex);
      return copy;
    });
    obj.material = Array.isArray(obj.material) ? next : next[0];
  });
}

function tuneAsset(kind, root) {
  if (kind === 'washer') {
    paintNamed(root, {
      body: '#f3f4f1',
      lid: '#f3f4f1',
      console_body: '#d5dbe0',
      control_inset: '#163044',
      recessed_disk: '#10161c',
      surround: '#141618',
    });
  } else if (kind === 'dryer') {
    paintNamed(root, {
      enamel_cabinet: '#7f8b93',
      'lid.001': '#7f8b93',
      lid_trim: '#555e64',
      control_fascia: '#f3ece1',
      selector: '#e0a15a',
      recessed_glazing: '#6a4636',
      sloping_door_rim: '#efe6d8',
      lower_seam: '#24282b',
    });
  } else if (kind === 'washer_combo') {
    paintNamed(root, {
      'cabinet.001': '#f6f1e6',
      'door.001': '#c5ced6',
    });
  }
}

function washerFace(node) {
  const enamel = toon('#e6eaec', { steps: 3 });
  addBox(node, 0.48, 0.058, 0.03, enamel, 0, 0.84, -0.352);
  addBox(node, 0.14, 0.014, 0.014, toon('#7f9098', { steps: 3 }), 0, 0.84, -0.372);
  addBox(node, 0.5, 0.012, 0.01, toon('#1f6f86', { steps: 3 }), 0, 0.798, -0.348, { cast: false });
}

function dryerFace(node) {
  const hatch = toon('#5d676e', { steps: 3 });
  const slot = toon('#1c2226', { steps: 3 });
  addBox(node, 0.2, 0.15, 0.032, hatch, 0.24, 0.15, -0.412);
  addBox(node, 0.09, 0.014, 0.012, toon('#f0e6d4', { steps: 3 }), 0.24, 0.19, -0.432);
  for (let i = 0; i < 3; i++) {
    addBox(node, 0.13, 0.008, 0.01, slot, 0.24, 0.09 + i * 0.03, -0.43, { cast: false });
  }
  addBox(node, 0.46, 0.018, 0.18, toon('#5a646b', { steps: 3 }), 0, 1.092, -0.08);
  for (let i = 0; i < 6; i++) {
    addBox(node, 0.34, 0.006, 0.012, slot, 0, 1.104, -0.15 + i * 0.028, { cast: false });
  }
}

function comboFace(node) {
  addBox(node, 0.03, 0.052, 0.4, toon('#e6eaec', { steps: 3 }), 0.425, 0.82, 0);
  addBox(node, 0.014, 0.014, 0.12, toon('#7f9098', { steps: 3 }), 0.444, 0.82, 0);
}

function dressInstance(node, inst) {
  if (inst.kind === 'washer') washerFace(node);
  else if (inst.kind === 'dryer') dryerFace(node);
  else if (inst.kind === 'washer_combo') comboFace(node);
}

boot({
  makeShell,
  makeProcedural,
  tuneAsset,
  dressInstance,
  readyText: 'ready — 巷洗 laundromat · drag orbit · U unlit · T toon',
});
