import * as THREE from 'three';
import { boot, toon, addBox, addCyl, canvasTexture } from './scene_runtime.js';

const QUIET = { shadow: false };
const matCache = new Map();

function mat(hex, opts) {
  const key = hex + JSON.stringify(opts || {});
  let m = matCache.get(key);
  if (!m) {
    m = toon(hex, opts);
    matCache.set(key, m);
  }
  return m;
}

const labelCache = new Map();
function lipLabel(text, bg, fg) {
  const key = `${text}|${bg}|${fg}`;
  if (labelCache.has(key)) return labelCache.get(key);
  const tex = canvasTexture((ctx, w, h) => {
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = fg;
    ctx.font = '600 28px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, w / 2, h / 2 + 1);
  }, 128, 32);
  const m = mat('#ffffff', { map: tex });
  labelCache.set(key, m);
  return m;
}

function wordmarkTexture() {
  return canvasTexture((ctx, w, h) => {
    ctx.fillStyle = '#1c2830';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#f3ecdf';
    ctx.fillRect(10, 10, w - 20, h - 20);
    const label = 'LATE CORNER';
    ctx.fillStyle = '#1c2830';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    let size = 40;
    ctx.font = `700 ${size}px sans-serif`;
    while (ctx.measureText(label).width > w - 48 && size > 18) {
      size -= 2;
      ctx.font = `700 ${size}px sans-serif`;
    }
    ctx.fillText(label, w / 2, h / 2 + 1);
  }, 256, 64);
}

function floorTexture() {
  const tex = canvasTexture((ctx, w, h) => {
    ctx.fillStyle = '#cfc6b4';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#c4baa8';
    ctx.fillRect(0, 0, w / 2, h / 2);
    ctx.fillRect(w / 2, h / 2, w / 2, h / 2);
    ctx.strokeStyle = '#a89f8e';
    ctx.lineWidth = 4;
    ctx.strokeRect(2, 2, w / 2 - 3, h / 2 - 3);
    ctx.strokeRect(w / 2 + 1, h / 2 + 1, w / 2 - 3, h / 2 - 3);
  }, 128, 128);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(9, 7);
  return tex;
}

/** Brand-free silhouettes. Neighbors differ in shape, not just hue. */
const DRINKS = [
  { kind: 'bottle', body: '#1f6d64', cap: '#e6d7b0', h: 0.26, r: 0.034 },
  { kind: 'can', body: '#8d312c', band: '#f0e2b8', h: 0.128, r: 0.034 },
  { kind: 'carton', body: '#f3ead8', cap: '#3c6d86', w: 0.07, d: 0.07, h: 0.22 },
  { kind: 'bottle', body: '#c65a28', cap: '#f4f1ea', h: 0.22, r: 0.036 },
  { kind: 'can', body: '#1f4a3a', band: '#d7c27a', h: 0.122, r: 0.033 },
  { kind: 'bottle', body: '#1d3d68', cap: '#c9a24a', h: 0.28, r: 0.032 },
  { kind: 'can', body: '#d8d2c6', band: '#2f5f73', h: 0.13, r: 0.034 },
  { kind: 'carton', body: '#f7f4ee', cap: '#8a3d32', w: 0.068, d: 0.068, h: 0.2 },
];

const SNACKS = [
  { kind: 'bag', body: '#c46a2d', band: '#f4e7c4', w: 0.13, d: 0.04, h: 0.19 },
  { kind: 'cup', body: '#efe6d4', cap: '#b23a2f', h: 0.1, r: 0.046 },
  { kind: 'jar', body: '#7a2e2a', cap: '#d9c27a', h: 0.12, r: 0.038 },
  { kind: 'tub', body: '#e7d3a4', cap: '#6a3a28', h: 0.07, r: 0.05 },
  { kind: 'bag', body: '#2f4a38', band: '#e6d3a0', w: 0.12, d: 0.038, h: 0.17 },
  { kind: 'bar', body: '#6b3a2c', band: '#e7c56a', w: 0.09, d: 0.018, h: 0.04 },
  { kind: 'roll', body: '#d8c7a2', cap: '#8a3d32', h: 0.11, r: 0.028 },
  { kind: 'bag', body: '#a33b3b', band: '#f6f1e6', w: 0.14, d: 0.042, h: 0.2 },
  { kind: 'cup', body: '#f7f1e6', cap: '#1f1f1f', h: 0.09, r: 0.048 },
  { kind: 'twin', body: '#245c45', band: '#e6d3a0', h: 0.11, r: 0.026 },
  { kind: 'jar', body: '#c4552a', cap: '#f4efe6', h: 0.11, r: 0.036 },
  { kind: 'box', body: '#f3ead8', band: '#1c4a4e', w: 0.09, d: 0.04, h: 0.13 },
];

const FROZEN = [
  { kind: 'pint', body: '#f4efe6', cap: '#c4552a', h: 0.09, r: 0.04 },
  { kind: 'bar', body: '#2c3d55', band: '#e7d7a8', w: 0.1, d: 0.026, h: 0.038 },
  { kind: 'tub', body: '#e7d3b0', cap: '#5a3a28', h: 0.06, r: 0.042 },
  { kind: 'box', body: '#f7f4ee', band: '#1f4a4e', w: 0.09, d: 0.04, h: 0.12 },
  { kind: 'pint', body: '#d8e4ea', cap: '#2a3a4a', h: 0.08, r: 0.036 },
  { kind: 'roll', body: '#f0d2c0', cap: '#6a3030', h: 0.1, r: 0.024 },
  { kind: 'twin', body: '#8d312c', band: '#f4efe6', h: 0.09, r: 0.024 },
];

function addProduct(parent, spec, x, y, z) {
  const q = QUIET;
  if (spec.kind === 'bottle') {
    addCyl(parent, spec.r * 0.92, spec.r, spec.h * 0.7, mat(spec.body), x, y + spec.h * 0.35, z, 10, q);
    addCyl(parent, spec.r * 0.36, spec.r * 0.48, spec.h * 0.18, mat(spec.body), x, y + spec.h * 0.78, z, 8, q);
    addCyl(parent, spec.r * 0.4, spec.r * 0.4, spec.h * 0.08, mat(spec.cap), x, y + spec.h * 0.9, z, 8, q);
  } else if (spec.kind === 'can') {
    addCyl(parent, spec.r, spec.r, spec.h, mat(spec.body), x, y + spec.h / 2, z, 12, q);
    addCyl(parent, spec.r * 0.97, spec.r * 0.97, spec.h * 0.1, mat(spec.band), x, y + spec.h * 0.72, z, 12, q);
    addCyl(parent, spec.r * 0.72, spec.r * 0.72, 0.006, mat('#e4e7ea'), x, y + spec.h - 0.004, z, 10, q);
  } else if (spec.kind === 'carton') {
    addBox(parent, spec.w, spec.h * 0.8, spec.d, mat(spec.body), x, y + spec.h * 0.4, z, q);
    addBox(parent, spec.w * 0.92, spec.h * 0.16, spec.d * 0.92, mat(spec.cap), x, y + spec.h * 0.88, z, q);
  } else if (spec.kind === 'bag') {
    addBox(parent, spec.w, spec.h * 0.76, spec.d, mat(spec.body), x, y + spec.h * 0.4, z, q);
    addBox(parent, spec.w * 0.5, spec.h * 0.14, spec.d * 0.65, mat(spec.body), x, y + spec.h * 0.86, z, q);
    addBox(parent, spec.w * 0.62, spec.h * 0.07, 0.008, mat(spec.band), x, y + spec.h * 0.5, z + spec.d * 0.45, q);
  } else if (spec.kind === 'cup') {
    addCyl(parent, spec.r * 1.05, spec.r * 0.82, spec.h, mat(spec.body), x, y + spec.h / 2, z, 12, q);
    addCyl(parent, spec.r * 1.02, spec.r * 1.02, 0.01, mat(spec.cap), x, y + spec.h, z, 12, q);
  } else if (spec.kind === 'jar') {
    addCyl(parent, spec.r, spec.r * 0.92, spec.h * 0.75, mat(spec.body), x, y + spec.h * 0.38, z, 10, q);
    addCyl(parent, spec.r * 0.86, spec.r * 0.86, spec.h * 0.16, mat(spec.cap), x, y + spec.h * 0.84, z, 10, q);
  } else if (spec.kind === 'bar') {
    addBox(parent, spec.w, spec.h, spec.d, mat(spec.body), x, y + spec.h / 2, z, q);
    addBox(parent, spec.w * 0.86, spec.h * 0.4, 0.006, mat(spec.band), x, y + spec.h * 0.62, z + spec.d * 0.4, q);
  } else if (spec.kind === 'pint') {
    addCyl(parent, spec.r, spec.r * 0.8, spec.h, mat(spec.body), x, y + spec.h / 2, z, 10, q);
    addCyl(parent, spec.r * 0.62, spec.r * 0.62, 0.012, mat(spec.cap), x, y + spec.h + 0.004, z, 8, q);
  } else if (spec.kind === 'box') {
    addBox(parent, spec.w, spec.h, spec.d, mat(spec.body), x, y + spec.h / 2, z, q);
    addBox(parent, spec.w * 0.7, spec.h * 0.12, 0.006, mat(spec.band), x, y + spec.h * 0.62, z + spec.d * 0.5, q);
  } else if (spec.kind === 'tub') {
    addCyl(parent, spec.r, spec.r * 0.92, spec.h, mat(spec.body), x, y + spec.h / 2, z, 12, q);
    addCyl(parent, spec.r * 0.72, spec.r * 0.72, 0.012, mat(spec.cap), x, y + spec.h, z, 10, q);
  } else if (spec.kind === 'twin') {
    addCyl(parent, spec.r, spec.r, spec.h, mat(spec.body), x - spec.r * 1.05, y + spec.h / 2, z, 10, q);
    addCyl(parent, spec.r, spec.r, spec.h * 0.92, mat(spec.band), x + spec.r * 1.05, y + spec.h * 0.46, z, 10, q);
  } else if (spec.kind === 'roll') {
    addCyl(parent, spec.r, spec.r, spec.h, mat(spec.body), x, y + spec.r, z, 10, { ...q, rotZ: Math.PI / 2 });
    addCyl(parent, spec.r * 0.7, spec.r * 0.7, 0.01, mat(spec.cap), x + spec.h * 0.42, y + spec.r, z, 8, q);
  }
}

function span(spec, along) {
  if (spec.kind === 'twin') return along === 'x' ? spec.r * 4.6 : spec.r * 2.4;
  if (spec.kind === 'roll') return along === 'x' ? spec.h + 0.02 : spec.r * 2.2;
  if (spec.kind === 'bag' || spec.kind === 'bar' || spec.kind === 'box' || spec.kind === 'carton') {
    const alongDim = along === 'x' ? (spec.w || 0.08) : (spec.d || 0.04);
    return Math.max(0.058, alongDim + 0.014);
  }
  if (spec.r) return spec.r * 2 + 0.016;
  return 0.08;
}

function packLine(parent, catalog, y, along, length, salt, fixed) {
  const end = length / 2 - 0.035;
  let cursor = -length / 2 + 0.035;
  let i = 0;
  while (cursor < end - 0.04 && i < 64) {
    const spec = catalog[(i + salt) % catalog.length];
    const pitch = Math.min(0.16, span(spec, along));
    if (cursor + pitch > end) break;
    const t = cursor + pitch * 0.5;
    addProduct(parent, spec, along === 'x' ? t : fixed, y, along === 'z' ? t : fixed);
    cursor += pitch;
    i += 1;
  }
}

function posterTexture(title, sub, bg, accent) {
  return canvasTexture((ctx, w, h) => {
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = accent;
    ctx.fillRect(0, 0, w, 26);
    ctx.fillRect(16, 58, w - 32, 62);
    ctx.fillStyle = '#f6f1e6';
    ctx.font = '700 22px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(title, w / 2, 36);
    ctx.fillStyle = bg;
    ctx.font = '700 18px sans-serif';
    ctx.fillText(sub, w / 2, 90);
    ctx.fillStyle = '#f6f1e6';
    ctx.font = '600 13px sans-serif';
    ctx.fillText('LATE CORNER', w / 2, h - 18);
  }, 128, 176);
}

function nightCardTexture() {
  return canvasTexture((ctx, w, h) => {
    ctx.fillStyle = '#101722';
    ctx.fillRect(0, 0, w, h);
    const sky = ctx.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, '#1a2740');
    sky.addColorStop(0.55, '#121826');
    sky.addColorStop(1, '#0c1018');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#242018';
    ctx.fillRect(0, h * 0.72, w, h * 0.1);
    ctx.fillStyle = '#1a1e24';
    ctx.fillRect(0, h * 0.82, w, h * 0.18);
    ctx.fillStyle = '#ffc27a';
    ctx.beginPath();
    ctx.arc(w * 0.72, h * 0.3, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255, 194, 122, 0.28)';
    ctx.beginPath();
    ctx.arc(w * 0.72, h * 0.3, 20, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#e6c07a';
    ctx.fillRect(w * 0.16, h * 0.4, 14, 20);
    ctx.fillRect(w * 0.38, h * 0.46, 11, 14);
    ctx.fillStyle = '#8eafc8';
    ctx.fillRect(w * 0.52, h * 0.44, 9, 12);
  }, 128, 160);
}

function buildNightWindow(parent, layout) {
  const { width: W } = layout.meta.room;
  const win = layout.zones.window;
  const cy = (win.y0 + win.y1) / 2;
  const cz = (win.z0 + win.z1) / 2;
  const winH = win.y1 - win.y0;
  const winD = win.z1 - win.z0;
  const card = mat('#ffffff', { map: nightCardTexture() });
  addBox(parent, 0.02, winH, winD, card, -W / 2 + 0.09, cy, cz, { shadow: false, name: 'night-exterior' });
  const glass = mat(layout.shell.nightGlass, {
    transparent: true,
    opacity: 0.38,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  addBox(parent, 0.02, winH, winD, glass, -W / 2 + 0.13, cy, cz, { shadow: false, name: 'night-glass' });
  const streak = mat('#d5eef4', {
    transparent: true,
    opacity: 0.34,
    emissive: '#e7f7fb',
    emissiveIntensity: 0.55,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  addBox(parent, 0.008, winH * 0.62, 0.04, streak, -W / 2 + 0.16, cy + 0.08, cz - 0.42, { shadow: false, name: 'glass-reflect' });
  addBox(parent, 0.008, winH * 0.36, 0.028, streak, -W / 2 + 0.16, cy - 0.12, cz + 0.22, { shadow: false });
  const warm = mat('#ffd2a8', {
    transparent: true,
    opacity: 0.22,
    emissive: '#ffb070',
    emissiveIntensity: 0.4,
    depthWrite: false,
  });
  addBox(parent, 0.008, 0.05, 0.46, warm, -W / 2 + 0.165, win.y0 + 0.34, cz + 0.15, { shadow: false });
  const frame = mat(layout.shell.frameColor);
  addBox(parent, 0.06, winH + 0.08, 0.05, frame, -W / 2 + 0.12, cy, win.z0, QUIET);
  addBox(parent, 0.06, winH + 0.08, 0.05, frame, -W / 2 + 0.12, cy, win.z1, QUIET);
  addBox(parent, 0.06, 0.05, winD, frame, -W / 2 + 0.12, win.y1, cz, QUIET);
  addBox(parent, 0.06, 0.05, winD, frame, -W / 2 + 0.12, win.y0, cz, QUIET);
  addBox(parent, 0.045, winH, 0.04, frame, -W / 2 + 0.14, cy, cz, QUIET);
}

function buildWallDressing(parent, layout) {
  const { width: W, depth: D } = layout.meta.room;
  const header = mat('#1e3d42');
  const rail = mat('#243036');
  addBox(parent, W - 0.55, 0.46, 0.025, header, -0.15, 2.52, -D / 2 + 0.075, QUIET);
  addBox(parent, W - 0.7, 0.07, 0.02, rail, -0.1, 2.16, -D / 2 + 0.09, QUIET);
  const tags = ['COLD', 'SNACK', 'HOT', 'OPEN'];
  tags.forEach((label, i) => {
    const x = -4.15 + i * 2.15;
    addBox(parent, 0.46, 0.07, 0.012, lipLabel(label, '#1c2830', '#f4efe6'), x, 2.16, -D / 2 + 0.11, { shadow: false, name: 'shelf-tag' });
  });
  const late = mat('#ffffff', { map: posterTexture('OPEN LATE', '24 H', '#14343c', '#e7c56a') });
  addBox(parent, 0.02, 0.62, 0.42, late, -W / 2 + 0.1, 2.12, -0.85, { shadow: false, name: 'poster' });
  const pair = mat('#ffffff', { map: posterTexture('2 FOR', 'PAIR', '#3d3228', '#f4efe6') });
  addBox(parent, 0.46, 0.58, 0.02, pair, 3.55, 1.72, -D / 2 + 0.1, { shadow: false, name: 'poster' });
  addBox(parent, 0.045, 0.06, 2.6, mat('#4e585c'), -W / 2 + 0.1, 1.78, -0.7, QUIET);
}

function buildShell(api) {
  const { layout } = api;
  const { width: W, depth: D, height: H } = layout.meta.room;
  const shell = layout.shell;
  const zones = layout.zones;
  const g = new THREE.Group();
  g.name = 'shell';
  const dressing = new THREE.Group();
  dressing.name = 'dressing';

  const floorMat = mat('#ffffff', {
    map: floorTexture(),
    polygonOffset: true,
    polygonOffsetFactor: 1,
    polygonOffsetUnits: 1,
  });
  const floor = new THREE.Mesh(new THREE.BoxGeometry(W, 0.08, D), floorMat);
  floor.position.y = -0.04;
  floor.receiveShadow = true;
  floor.castShadow = false;
  floor.userData.noShadow = true;
  g.add(floor);

  const wall = mat(shell.wallColor);
  const trim = mat(shell.trimColor);
  addBox(g, W, H, 0.12, wall, 0, H / 2, -D / 2);
  addBox(g, 0.12, H, D, wall, -W / 2, H / 2, 0);
  addBox(g, W - 0.2, 0.1, 0.08, trim, 0, 0.1, -D / 2 + 0.1, QUIET);
  addBox(g, 0.08, 0.1, D - 0.2, trim, -W / 2 + 0.1, 0.1, 0, QUIET);
  addBox(g, W - 0.3, 0.08, 0.06, mat(shell.bumperColor), 0, 0.95, -D / 2 + 0.1, QUIET);
  addBox(g, 0.06, 0.08, D * 0.55, mat(shell.bumperColor), -W / 2 + 0.1, 0.95, -D * 0.18, QUIET);

  const ceilMat = mat(shell.ceilingColor, { emissive: '#e6e9ec', emissiveIntensity: 0.5 });
  const soffit = mat('#c5c9ce');
  addBox(g, W - 0.18, 0.07, D - 0.12, ceilMat, -0.04, H - 0.045, -0.02, QUIET);
  addBox(g, W - 0.18, 0.14, 0.05, soffit, -0.04, H - 0.14, D / 2 - 0.1, QUIET);
  addBox(g, 0.05, 0.14, D - 0.2, soffit, W / 2 - 0.12, H - 0.14, -0.02, QUIET);

  buildNightWindow(g, layout);
  buildWallDressing(g, layout);

  const mark = mat('#ffffff', { map: wordmarkTexture() });
  addBox(g, 1.35, 0.22, 0.02, mark, zones.wordmark.x, zones.wordmark.y, -D / 2 + 0.12, { shadow: false, name: 'wordmark' });

  const door = zones.stockDoor;
  addBox(dressing, door.w, door.h, 0.06, mat('#3a4248'), door.x, door.h / 2, -D / 2 + 0.1, QUIET);
  addBox(dressing, 0.08, 0.16, 0.03, mat('#c5ccd0'), door.x + door.w * 0.28, 1.05, -D / 2 + 0.14, QUIET);

  buildFridges(dressing, api, zones.fridges);
  buildGondolas(dressing, zones.gondolas);
  buildWallBay(dressing, zones.wallBay);
  buildHotCounter(dressing, api, zones.hot);
  buildCheckout(dressing, api, zones.checkout);
  buildLedge(dressing, api, zones.ledge);

  return { shell: g, dressing };
}

function buildFridges(parent, api, spec) {
  const pitch = spec.w + spec.gap;
  for (let i = 0; i < spec.count; i++) {
    const x = spec.x0 + spec.w / 2 + i * pitch;
    const freezer = i === spec.count - 1;
    fridge(parent, api, x, spec.z, spec.w, spec.d, spec.h, freezer, i);
  }
}

function fridge(parent, api, x, z, w, d, h, freezer, index) {
  const grp = new THREE.Group();
  grp.position.set(x, 0, z);
  grp.name = freezer ? 'freezer' : `cooler-${index}`;
  const shell = mat(freezer ? '#3a444c' : '#2e383c');
  const kick = mat('#23282c');
  const interior = mat(freezer ? '#f4f7f8' : '#e7f3f5', {
    emissive: freezer ? '#f7fbff' : '#c5eef6',
    emissiveIntensity: 0.42,
  });
  addBox(grp, w, 0.1, d, kick, 0, 0.05, 0);
  addBox(grp, w, h - 0.1, 0.05, shell, 0, 0.1 + (h - 0.1) / 2, -d / 2 + 0.025);
  addBox(grp, 0.045, h - 0.1, d, shell, -w / 2 + 0.022, h / 2, 0);
  addBox(grp, 0.045, h - 0.1, d, shell, w / 2 - 0.022, h / 2, 0);
  addBox(grp, w, 0.06, d, shell, 0, h - 0.03, 0);
  addBox(grp, w - 0.1, h - 0.28, 0.02, interior, 0, h * 0.52, -d / 2 + 0.06, { ...QUIET, name: 'fridge-interior' });

  const shelfYs = [0.34, 0.68, 1.02, 1.36, 1.64];
  const shelfMat = mat('#d5dde0');
  for (const y of shelfYs) {
    addBox(grp, w - 0.12, 0.015, d - 0.16, shelfMat, 0, y, -0.02, QUIET);
  }
  const source = freezer ? FROZEN : DRINKS;
  const catalog = source.map((item) => ({ ...item, h: Math.min(item.h || 0.16, freezer ? 0.11 : 0.2) }));
  shelfYs.forEach((y, s) => {
    packLine(grp, catalog, y + 0.02, 'x', w - 0.2, s * 3 + index, -0.08);
    packLine(grp, catalog, y + 0.02, 'x', w - 0.2, s * 5 + index + 2, 0.08);
  });

  const glass = mat('#d5eef2', {
    transparent: true,
    opacity: 0.18,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  addBox(grp, w - 0.12, h - 0.28, 0.012, glass, 0, 0.14 + (h - 0.28) / 2, d / 2 - 0.02, { shadow: false, name: 'fridge-glass' });
  const frame = mat('#1f262a');
  addBox(grp, 0.035, h - 0.16, 0.03, frame, -w / 2 + 0.05, h / 2, d / 2 - 0.01, QUIET);
  addBox(grp, 0.035, h - 0.16, 0.03, frame, w / 2 - 0.05, h / 2, d / 2 - 0.01, QUIET);
  addBox(grp, w - 0.06, 0.035, 0.03, frame, 0, h - 0.08, d / 2 - 0.01, QUIET);
  addBox(grp, w - 0.06, 0.04, 0.03, frame, 0, 0.2, d / 2 - 0.01, QUIET);
  addBox(grp, 0.02, 0.72, 0.025, mat('#c5ccd0'), w / 2 - 0.1, 1.15, d / 2 + 0.01, QUIET);

  const lamp = addBox(grp, w - 0.2, 0.015, 0.04, mat('#f4fdff', { emissive: '#d8fbff', emissiveIntensity: 0.9 }), 0, h - 0.16, 0.02, { shadow: false, name: 'fridge-lamp' });
  lamp.userData.noShadow = true;
  const pl = new THREE.PointLight(freezer ? 0xf4f7ff : 0xd7f6ff, 0.35, 2.4, 2);
  pl.position.set(x, h - 0.25, z + 0.05);
  api.addLight(pl);

  const tag = freezer ? 'FREEZER' : 'COLD';
  const tagMat = lipLabel(tag, freezer ? '#e7eef2' : '#14343c', freezer ? '#1c2830' : '#e7f6f8');
  addBox(grp, w * 0.55, 0.08, 0.012, tagMat, 0, h + 0.02, d / 2 - 0.02, { shadow: false, name: 'shelf-tag' });

  parent.add(grp);
  api.contact(x, z, w * 0.42, d * 0.42);
}

function buildGondolas(parent, gondolas) {
  gondolas.forEach((spec, index) => gondola(parent, spec, index));
}

function gondola(parent, spec, index) {
  const len = spec.z1 - spec.z0;
  const zc = (spec.z0 + spec.z1) / 2;
  const grp = new THREE.Group();
  grp.position.set(spec.x, 0, zc);
  grp.name = spec.id;
  const frame = mat('#3e4a4e');
  const board = mat('#efe4d2');
  const end = mat(index === 0 ? '#1c4a4e' : '#3d3228');
  const w = spec.w;
  const h = spec.h;
  addBox(grp, w, 0.08, len, mat('#2c3336'), 0, 0.04, 0);
  addBox(grp, 0.04, h, 0.04, frame, -w / 2 + 0.03, h / 2, -len / 2 + 0.03);
  addBox(grp, 0.04, h, 0.04, frame, w / 2 - 0.03, h / 2, -len / 2 + 0.03);
  addBox(grp, 0.04, h, 0.04, frame, -w / 2 + 0.03, h / 2, len / 2 - 0.03);
  addBox(grp, 0.04, h, 0.04, frame, w / 2 - 0.03, h / 2, len / 2 - 0.03);
  addBox(grp, 0.03, h - 0.1, len - 0.08, frame, 0, h / 2, 0, QUIET);
  for (const ez of [-1, 1]) {
    const z = ez * (len / 2 - 0.02);
    addBox(grp, w - 0.08, 0.2, 0.035, end, 0, 0.16, z, QUIET);
    addBox(grp, w - 0.1, 0.14, 0.035, end, 0, h - 0.1, z, QUIET);
  }

  const levels = [0.28, 0.62, 0.96, 1.28];
  for (const y of levels) {
    addBox(grp, w - 0.08, 0.02, len - 0.1, board, 0, y, 0, QUIET);
    const tag = lipLabel(y < 0.7 ? 'SNACK' : 'CUP', '#243036', '#f4efe6');
    addBox(grp, 0.012, 0.045, 0.36, tag, -w / 2 + 0.03, y + 0.05, len * 0.28, { shadow: false, name: 'shelf-tag' });
    addBox(grp, 0.012, 0.045, 0.36, tag, w / 2 - 0.03, y + 0.05, -len * 0.28, { shadow: false, name: 'shelf-tag' });
  }
  const shelfGoods = SNACKS.concat(DRINKS.filter((item) => item.kind !== 'bottle' || item.h <= 0.24)).map((item) => ({
    ...item,
    h: Math.min(item.h || 0.12, 0.2),
  }));
  levels.forEach((y, s) => {
    const salt = s * 4 + index * 7;
    packLine(grp, shelfGoods, y + 0.03, 'z', len - 0.18, salt, -w * 0.16);
    packLine(grp, shelfGoods, y + 0.03, 'z', len - 0.18, salt + 3, -w * 0.34);
    packLine(grp, shelfGoods, y + 0.03, 'z', len - 0.18, salt + 5, w * 0.16);
    packLine(grp, shelfGoods, y + 0.03, 'z', len - 0.18, salt + 8, w * 0.34);
  });
  parent.add(grp);
}

function buildWallBay(parent, spec) {
  const len = spec.z1 - spec.z0;
  const zc = (spec.z0 + spec.z1) / 2;
  const grp = new THREE.Group();
  grp.position.set(spec.x, 0, zc);
  const board = mat('#efe4d2');
  const frame = mat('#3e4a4e');
  addBox(grp, 0.04, spec.h, len, mat('#2a3134'), -spec.d / 2 + 0.02, spec.h / 2, 0, QUIET);
  const levels = [0.32, 0.68, 1.04, 1.38];
  for (const y of levels) addBox(grp, spec.d - 0.06, 0.02, len - 0.08, board, 0.02, y, 0, QUIET);
  const bayGoods = SNACKS.map((item) => ({ ...item, h: Math.min(item.h || 0.12, 0.2) }));
  levels.forEach((y, s) => {
    packLine(grp, bayGoods, y + 0.03, 'z', len - 0.16, s + 2, spec.d * 0.12);
  });
  addBox(grp, 0.03, spec.h, 0.04, frame, spec.d / 2, spec.h / 2, -len / 2, QUIET);
  addBox(grp, 0.03, spec.h, 0.04, frame, spec.d / 2, spec.h / 2, len / 2, QUIET);
  parent.add(grp);
}

function buildHotCounter(parent, api, spec) {
  const w = spec.x1 - spec.x0;
  const xc = (spec.x0 + spec.x1) / 2;
  const grp = new THREE.Group();
  grp.position.set(xc, 0, spec.z);
  const steel = mat('#d0d4d8');
  const dark = mat('#2e3438');
  const wellW = w - 0.18;
  addBox(grp, w, spec.h, spec.d, dark, 0, spec.h / 2, 0);
  addBox(grp, w - 0.06, 0.035, spec.d - 0.05, steel, 0, spec.h + 0.02, 0);
  addBox(grp, wellW, 0.07, 0.34, mat('#f6e2c8', { emissive: '#ffc48a', emissiveIntensity: 0.55 }), 0, spec.h + 0.07, -0.02, QUIET);
  addBox(grp, wellW, 0.14, 0.028, mat('#5c4638'), 0, spec.h + 0.14, -0.16, QUIET);
  for (let row = 0; row < 2; row++) {
    const zz = -0.1 + row * 0.09;
    addCyl(grp, 0.011, 0.011, wellW * 0.9, mat('#8e969c'), 0, spec.h + 0.11, zz, 8, { ...QUIET, rotZ: Math.PI / 2 });
    const dogs = 8;
    for (let k = 0; k < dogs; k++) {
      const hx = -wellW * 0.4 + k * ((wellW * 0.8) / (dogs - 1));
      addCyl(grp, 0.022, 0.022, 0.15, mat(k % 2 ? '#a3532e' : '#d07a42'), hx, spec.h + 0.14, zz, 8, { ...QUIET, rotZ: Math.PI / 2 });
    }
  }
  for (let k = 0; k < 6; k++) {
    const hx = -0.15 + k * 0.16;
    addCyl(grp, 0.024, 0.024, 0.18, mat(k % 2 ? '#8a4030' : '#e08a48'), hx, spec.h + 0.16, 0.08, 8, { ...QUIET, rotX: Math.PI / 2 });
  }
  addBox(grp, 0.34, 0.035, 0.2, mat('#efe6d4'), -0.62, spec.h + 0.1, 0.05, QUIET);
  for (let i = 0; i < 6; i++) {
    addCyl(grp, 0.042, 0.048, 0.032, mat('#f0d7b0'), -0.72 + (i % 3) * 0.1, spec.h + 0.145, 0.01 + Math.floor(i / 3) * 0.08, 8, QUIET);
  }
  const glass = mat('#f4fbff', { transparent: true, opacity: 0.22, side: THREE.DoubleSide, depthWrite: false });
  addBox(grp, wellW, 0.52, 0.012, glass, 0, spec.h + 0.34, spec.d / 2 - 0.028, { shadow: false, name: 'sneeze-glass' });
  addBox(grp, 0.014, 0.52, 0.26, glass, -wellW / 2, spec.h + 0.34, 0.02, { shadow: false });
  addBox(grp, 0.014, 0.52, 0.26, glass, wellW / 2, spec.h + 0.34, 0.02, { shadow: false });
  const hood = mat('#2c3336');
  addBox(grp, wellW + 0.1, 0.055, 0.42, mat('#c5ccd0'), 0, spec.h + 0.66, -0.01, QUIET);
  addBox(grp, wellW + 0.1, 0.1, 0.035, hood, 0, spec.h + 0.58, spec.d / 2 - 0.02, QUIET);
  addBox(grp, 0.035, 0.4, 0.035, hood, -wellW / 2, spec.h + 0.42, spec.d / 2 - 0.02, QUIET);
  addBox(grp, 0.035, 0.4, 0.035, hood, wellW / 2, spec.h + 0.42, spec.d / 2 - 0.02, QUIET);
  for (const hx of [-wellW * 0.28, 0, wellW * 0.28]) {
    const bulb = addCyl(grp, 0.075, 0.045, 0.022, mat('#ffd2a8', { emissive: '#ff8a3a', emissiveIntensity: 0.9 }), hx, spec.h + 0.6, -0.02, 12, { shadow: false, name: 'heat-lamp' });
    bulb.userData.noShadow = true;
  }
  addBox(grp, 0.62, 0.08, 0.012, lipLabel('HOT', '#3a2418', '#ffd8b0'), 0, spec.h + 0.52, spec.d / 2 + 0.01, { shadow: false, name: 'shelf-tag' });
  parent.add(grp);
  const warm = new THREE.PointLight(0xffa25a, 0.7, 3.4, 2);
  warm.position.set(xc, spec.h + 0.55, spec.z + 0.05);
  api.addLight(warm);
  api.contact(xc, spec.z, w * 0.45, spec.d * 0.45);
}

function buildCheckout(parent, api, spec) {
  const w = spec.x1 - spec.x0;
  const len = spec.z1 - spec.z0;
  const xc = (spec.x0 + spec.x1) / 2;
  const zc = (spec.z0 + spec.z1) / 2;
  const grp = new THREE.Group();
  grp.position.set(xc, 0, zc);
  addBox(grp, w, spec.h, len, mat('#243036'), 0, spec.h / 2, 0);
  addBox(grp, w + 0.04, 0.045, len + 0.04, mat('#e6dcc8'), 0, spec.h + 0.02, 0);
  addBox(grp, w * 0.55, 0.012, 0.34, mat('#2a2e30'), -0.05, spec.h + 0.05, len * 0.18, QUIET);
  addBox(grp, 0.04, 0.08, len, mat('#c9a24a'), -w / 2, spec.h * 0.55, 0, QUIET);
  const rackY = spec.h + 0.16;
  for (let i = 0; i < 6; i++) {
    const specBar = SNACKS[(i * 2 + 1) % SNACKS.length];
    const bar = specBar.kind === 'bar' ? specBar : SNACKS.find((item) => item.kind === 'bar');
    addProduct(grp, bar, -w * 0.15 + (i % 3) * 0.1, rackY, len / 2 - 0.22 - Math.floor(i / 3) * 0.08);
  }
  parent.add(grp);
  api.contact(xc, zc, w * 0.55, len * 0.48);
  const matFloor = new THREE.Mesh(
    new THREE.PlaneGeometry(0.9, 1.3),
    mat('#4a5348', { polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 }),
  );
  matFloor.rotation.x = -Math.PI / 2;
  matFloor.position.set(spec.x0 - 0.55, 0.014, zc + 0.2);
  matFloor.userData.noShadow = true;
  matFloor.receiveShadow = false;
  matFloor.castShadow = false;
  parent.add(matFloor);
}

function buildLedge(parent, api, spec) {
  const len = spec.z1 - spec.z0;
  const zc = (spec.z0 + spec.z1) / 2;
  const grp = new THREE.Group();
  grp.position.set(spec.x, 0, zc);
  addBox(grp, spec.d, spec.h, len, mat('#c9b48e'), 0, spec.h / 2, 0);
  addBox(grp, spec.d + 0.04, 0.04, len + 0.04, mat('#e7d7b4'), 0, spec.h + 0.02, 0);
  addBox(grp, spec.d, 0.04, 0.04, mat('#8a6a48'), 0, spec.h * 0.45, -len / 2 + 0.04, QUIET);
  addBox(grp, spec.d, 0.04, 0.04, mat('#8a6a48'), 0, spec.h * 0.45, len / 2 - 0.04, QUIET);
  parent.add(grp);
  api.contact(spec.x, zc, spec.d * 0.45, len * 0.48);
  const lamp = new THREE.PointLight(0xffe1b8, 0.28, 2.4, 2);
  lamp.position.set(spec.x + 0.2, spec.h + 0.7, zc);
  api.addLight(lamp);
  addBox(parent, 0.28, 0.03, 0.1, mat('#f4efe6', { emissive: '#ffe1b8', emissiveIntensity: 0.7 }), spec.x + 0.05, spec.h + 0.62, zc, { shadow: false, name: 'ledge-lamp' });
}

function buildTubes(parent, api) {
  for (const tube of api.layout.zones.lights) {
    addBox(parent, tube.len, 0.05, 0.12, mat('#d9dde2'), tube.x, tube.y, tube.z, QUIET);
    addBox(
      parent,
      tube.len * 0.92,
      0.02,
      0.05,
      mat('#f7fbff', { emissive: tube.warm ? '#ffe1b8' : '#eef7ff', emissiveIntensity: 0.8 }),
      tube.x,
      tube.y - 0.02,
      tube.z,
      { shadow: false, name: 'tube' },
    );
    const pl = new THREE.PointLight(tube.warm ? 0xffe1b8 : 0xe7f1ff, tube.warm ? 0.22 : 0.16, 4.2, 2);
    pl.position.set(tube.x, tube.y - 0.15, tube.z);
    api.addLight(pl);
  }
}

boot({
  build(api) {
    const built = buildShell(api);
    buildTubes(built.dressing, api);
    return built;
  },
});
