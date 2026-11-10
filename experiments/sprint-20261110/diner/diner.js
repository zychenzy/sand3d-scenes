import * as THREE from 'three';
import {
  boot, toon, addBox, addCyl, canvasTexture, makeContactTexture, contactMaterial,
} from './scene_lib.js';

function checkerCanvas(a, b) {
  const S = 256;
  const c = document.createElement('canvas');
  c.width = S;
  c.height = S;
  const g = c.getContext('2d');
  const grout = 10;
  g.fillStyle = '#2a2623';
  g.fillRect(0, 0, S, S);
  const t = S / 2;
  for (let y = 0; y < 2; y++) {
    for (let x = 0; x < 2; x++) {
      g.fillStyle = (x + y) % 2 ? b : a;
      g.fillRect(x * t + grout / 2, y * t + grout / 2, t - grout, t - grout);
    }
  }
  return c;
}

function subwayCanvas(cream, grout) {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = grout;
  g.fillRect(0, 0, 256, 128);
  const brickW = 128;
  const brickH = 64;
  const gap = 8;
  for (let row = 0; row < 2; row++) {
    const off = row % 2 ? brickW / 2 : 0;
    for (let col = -1; col < 3; col++) {
      g.fillStyle = cream;
      g.fillRect(col * brickW + off + gap / 2, row * brickH + gap / 2, brickW - gap, brickH - gap);
    }
  }
  return c;
}

function squareTileCanvas(cream, accent) {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = '#b7aea4';
  g.fillRect(0, 0, 256, 256);
  const n = 4;
  const t = 256 / n;
  const gap = 8;
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      const cherry = (x + y * 3) % 7 === 0;
      g.fillStyle = cherry ? accent : cream;
      g.fillRect(x * t + gap / 2, y * t + gap / 2, t - gap, t - gap);
    }
  }
  return c;
}

function menuCanvas() {
  const c = document.createElement('canvas');
  c.width = 1280;
  c.height = 512;
  const g = c.getContext('2d');
  g.fillStyle = '#241e1c';
  g.fillRect(0, 0, 1280, 512);
  g.fillStyle = '#9d2f33';
  g.fillRect(0, 0, 1280, 96);
  g.fillStyle = '#f6efe4';
  g.font = '700 58px Inter, "Noto Sans Display", sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText('MENU', 640, 50);
  const items = [
    ['BLUE PLATE', '4.25'],
    ['HASH BROWNS', '1.75'],
    ['CHERRY PIE', '1.85'],
    ['DINER COFFEE', '.25'],
    ['MALTED MILK', '1.10'],
    ['GRILLED CHEESE', '2.40'],
  ];
  g.font = '600 36px Inter, "Noto Sans Display", sans-serif';
  items.forEach((row, i) => {
    const col = i < 3 ? 0 : 1;
    const rowi = i % 3;
    const x0 = 70 + col * 640;
    const y = 180 + rowi * 100;
    g.fillStyle = '#f3e6c8';
    g.textAlign = 'left';
    g.fillText(row[0], x0, y);
    g.textAlign = 'right';
    g.fillText(row[1], x0 + 520, y);
  });
  return c;
}

function todayCanvas() {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 640;
  const g = c.getContext('2d');
  g.fillStyle = '#2a2220';
  g.fillRect(0, 0, 512, 640);
  g.fillStyle = '#9d2f33';
  g.fillRect(0, 0, 512, 120);
  g.fillStyle = '#f6efe4';
  g.font = '700 64px Inter, sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText('TODAY', 256, 62);
  g.font = '600 40px Inter, sans-serif';
  g.fillStyle = '#f3e6c8';
  ['cherry pie', 'bottomless', 'coffee', 'hash plate'].forEach((line, i) => {
    g.fillText(line, 256, 210 + i * 90);
  });
  return c;
}

function strokeCall(ctx, color, width, draw) {
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.shadowColor = color;
  ctx.shadowBlur = width * 0.85;
  draw(ctx);
  ctx.shadowBlur = 0;
  ctx.strokeStyle = '#fff8fb';
  ctx.lineWidth = Math.max(4, width * 0.28);
  draw(ctx);
  ctx.restore();
}

function traceDiamond(ctx) {
  ctx.beginPath();
  ctx.moveTo(118, 40);
  ctx.lineTo(168, 128);
  ctx.lineTo(118, 216);
  ctx.lineTo(68, 128);
  ctx.closePath();
  ctx.stroke();
}

function traceDiner(ctx) {
  const y0 = 48;
  const y1 = 208;
  const ym = 128;
  ctx.beginPath();
  ctx.moveTo(210, y0);
  ctx.lineTo(210, y1);
  ctx.moveTo(210, y0);
  ctx.bezierCurveTo(360, y0, 372, y1, 210, y1);
  ctx.moveTo(430, y0);
  ctx.lineTo(430, y1);
  ctx.moveTo(392, y0);
  ctx.lineTo(468, y0);
  ctx.moveTo(392, y1);
  ctx.lineTo(468, y1);
  ctx.moveTo(520, y1);
  ctx.lineTo(520, y0);
  ctx.lineTo(670, y1);
  ctx.lineTo(670, y0);
  ctx.moveTo(730, y0);
  ctx.lineTo(730, y1);
  ctx.moveTo(730, y0);
  ctx.lineTo(860, y0);
  ctx.moveTo(730, ym);
  ctx.lineTo(830, ym);
  ctx.moveTo(730, y1);
  ctx.lineTo(860, y1);
  ctx.moveTo(910, y1);
  ctx.lineTo(910, y0);
  ctx.bezierCurveTo(1040, 46, 1048, 150, 910, 150);
  ctx.moveTo(980, 146);
  ctx.lineTo(1060, y1);
  ctx.stroke();
}

function neonCanvas(coral, accent) {
  const c = document.createElement('canvas');
  c.width = 1120;
  c.height = 256;
  const g = c.getContext('2d');
  g.clearRect(0, 0, 1120, 256);
  strokeCall(g, accent, 16, traceDiamond);
  strokeCall(g, coral, 22, traceDiner);
  return c;
}

function traceOpen(ctx) {
  const y0 = 36;
  const y1 = 124;
  const ym = 80;
  ctx.beginPath();
  ctx.moveTo(36, ym);
  ctx.bezierCurveTo(36, y0, 110, y0, 110, ym);
  ctx.bezierCurveTo(110, y1, 36, y1, 36, ym);
  ctx.moveTo(150, y1);
  ctx.lineTo(150, y0);
  ctx.bezierCurveTo(230, y0, 236, ym + 4, 150, ym);
  ctx.moveTo(168, ym);
  ctx.lineTo(214, y1);
  ctx.moveTo(250, y0);
  ctx.lineTo(250, y1);
  ctx.moveTo(250, y0);
  ctx.lineTo(330, y0);
  ctx.moveTo(250, ym);
  ctx.lineTo(310, ym);
  ctx.moveTo(250, y1);
  ctx.lineTo(330, y1);
  ctx.moveTo(360, y1);
  ctx.lineTo(360, y0);
  ctx.lineTo(450, y1);
  ctx.lineTo(450, y0);
  ctx.stroke();
}

function openCanvas(coral) {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 160;
  const g = c.getContext('2d');
  g.clearRect(0, 0, 512, 160);
  strokeCall(g, coral, 16, traceOpen);
  return c;
}

function makeTextures(shell) {
  const checker = canvasTexture(checkerCanvas(shell.floorA, shell.floorB), { repeat: true });
  const subway = canvasTexture(subwayCanvas(shell.subway, shell.grout), { repeat: true });
  const tiles = canvasTexture(squareTileCanvas('#f4efe6', shell.cherry), { repeat: true });
  const menu = canvasTexture(menuCanvas());
  const today = canvasTexture(todayCanvas());
  const neon = canvasTexture(neonCanvas(shell.neonCoral || '#ff4f73', shell.neonAccent || '#5dffe0'));
  const open = canvasTexture(openCanvas(shell.neonCoral || '#ff4f73'));
  for (const tex of [neon, open]) tex.premultiplyAlpha = false;
  return { checker, subway, tiles, menu, today, neon, open };
}

function plane(g, w, h, mat, x, y, z, rotY = 0) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
  m.position.set(x, y, z);
  m.rotation.y = rotY;
  m.receiveShadow = true;
  g.add(m);
  return m;
}

function repeated(tex, rx, ry) {
  const map = tex.clone();
  map.wrapS = THREE.RepeatWrapping;
  map.wrapT = THREE.RepeatWrapping;
  map.repeat.set(rx, ry);
  map.needsUpdate = true;
  return map;
}

function addContact(g, mat, x, z, rotY, sizeX, sizeZ) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(sizeX, sizeZ), mat);
  m.rotation.x = -Math.PI / 2;
  m.rotation.y = rotY || 0;
  m.position.set(x, 0.016, z);
  m.renderOrder = 2;
  m.userData.noShadow = true;
  g.add(m);
  return m;
}

function makeShell(layout) {
  const g = new THREE.Group();
  g.name = 'shell';
  const { width: W, depth: D, height: H } = layout.meta.room;
  const s = layout.shell;
  const F = layout.features;
  const tex = makeTextures({ ...s, neonCoral: F.neon.color, neonAccent: F.neon.accent });
  g.userData.tex = tex;

  const wall = toon(s.wallColor);
  const wood = toon(s.wood);
  const cherry = toon(s.cherry);
  const chrome = toon(s.chrome);
  const T = 0.14;

  const floorMap = repeated(tex.checker, W / 1, D / 1);
  const slab = addBox(g, W, 0.08, D, toon('#cfc6b8'), 0, -0.04, 0);
  slab.receiveShadow = true;
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(W - 0.02, D - 0.02), toon('#ffffff', { map: floorMap }));
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = 0.006;
  floor.receiveShadow = true;
  g.add(floor);

  addBox(g, W, H, T, wall, 0, H / 2, -D / 2);
  addBox(g, T, H, D / 2 - F.window.z1, wall, -W / 2, H / 2, (F.window.z1 + D / 2) / 2);
  addBox(g, T, H, F.window.z0 - (-D / 2), wall, -W / 2, H / 2, (-D / 2 + F.window.z0) / 2);
  const winLen = F.window.z1 - F.window.z0;
  const winMid = (F.window.z0 + F.window.z1) / 2;
  addBox(g, T, F.window.y0, winLen, wall, -W / 2, F.window.y0 / 2, winMid);
  addBox(g, T, H - F.window.y1, winLen, wall, -W / 2, (H + F.window.y1) / 2, winMid);
  addBox(g, T, H, D, wall, W / 2, H / 2, 0);

  const railY = F.window.y0 + 0.03;
  addBox(g, W - 0.2, 0.07, 0.05, cherry, 0, railY, -D / 2 + T / 2 + 0.03);
  addBox(g, 0.05, 0.07, D - 0.2, cherry, -W / 2 + T / 2 + 0.03, railY, 0);
  addBox(g, 0.05, 0.07, D - 0.2, cherry, W / 2 - T / 2 - 0.03, railY, 0);
  addBox(g, W - 0.08, 0.08, 0.04, toon('#4a4038'), 0, 0.04, -D / 2 + T / 2 + 0.02);
  addBox(g, 0.04, 0.08, D - 0.08, toon('#4a4038'), -W / 2 + T / 2 + 0.02, 0.04, 0);
  addBox(g, 0.04, 0.08, D - 0.08, toon('#4a4038'), W / 2 - T / 2 - 0.02, 0.04, 0);

  const subH = 1.02;
  const subBack = plane(
    g, W - 0.2, subH,
    toon('#ffffff', { map: repeated(tex.subway, (W - 0.2) / 0.64, subH / 0.32) }),
    0, subH / 2, -D / 2 + T / 2 + 0.012,
  );
  subBack.receiveShadow = true;
  plane(
    g, D - 0.3, subH,
    toon('#ffffff', { map: repeated(tex.subway, (D - 0.3) / 0.64, subH / 0.32) }),
    -W / 2 + T / 2 + 0.012, subH / 2, 0, Math.PI / 2,
  );
  plane(
    g, D - 0.3, subH,
    toon('#ffffff', { map: repeated(tex.subway, (D - 0.3) / 0.64, subH / 0.32) }),
    W / 2 - T / 2 - 0.012, subH / 2, 0, -Math.PI / 2,
  );

  const glassMat = toon(s.windowTint, { transparent: true, opacity: 0.38, side: THREE.DoubleSide, depthWrite: false });
  const glass = plane(
    g, winLen - 0.12, F.window.y1 - F.window.y0 - 0.08,
    glassMat, -W / 2 + 0.02, (F.window.y0 + F.window.y1) / 2, winMid, Math.PI / 2,
  );
  glass.userData.noShadow = true;
  glass.renderOrder = 3;
  const sky = plane(g, winLen + 0.4, 2.2, toon('#d5e4ee'), -W / 2 - 0.45, 1.7, winMid, Math.PI / 2);
  sky.userData.noShadow = true;
  const mullionCount = 4;
  for (let i = 0; i <= mullionCount; i++) {
    const z = F.window.z0 + (winLen * i) / mullionCount;
    const bar = addBox(g, 0.05, F.window.y1 - F.window.y0, 0.045, chrome, -W / 2 + 0.045, (F.window.y0 + F.window.y1) / 2, z);
    bar.castShadow = false;
  }
  addBox(g, 0.05, 0.045, winLen, chrome, -W / 2 + 0.045, (F.window.y0 + F.window.y1) / 2, winMid);
  addBox(g, 0.08, 0.06, winLen + 0.08, wood, -W / 2 + 0.08, F.window.y0 - 0.02, winMid);

  const door = F.door;
  const doorX = -W / 2 + T / 2 + 0.04;
  addBox(g, 0.08, door.height + 0.08, door.width + 0.12, wood, doorX, door.height / 2, door.z);
  addBox(g, 0.05, door.height, door.width, toon('#7a3a32'), doorX + 0.03, door.height / 2, door.z);
  const doorGlass = plane(g, door.width * 0.55, 0.42, glassMat, doorX + 0.07, door.height - 0.48, door.z, Math.PI / 2);
  doorGlass.userData.noShadow = true;
  addBox(g, 0.03, 0.04, 0.08, chrome, doorX + 0.08, 1.05, door.z + door.width * 0.32);

  const ceilZ0 = -D / 2 + 0.08;
  const ceilZ1 = 2.2;
  const ceil = addBox(g, W - 0.28, 0.06, ceilZ1 - ceilZ0, toon(s.ceilingColor), 0, H - 0.03, (ceilZ0 + ceilZ1) / 2);
  ceil.userData.noShadow = true;
  ceil.castShadow = false;

  const border = toon(s.cherry);
  addBox(g, W - 0.4, 0.012, 0.1, border, 0, 0.014, -D / 2 + 0.28);
  addBox(g, 0.1, 0.012, D - 0.5, border, -W / 2 + 0.28, 0.014, 0.1);
  addBox(g, 0.1, 0.012, D - 0.5, border, W / 2 - 0.28, 0.014, 0.1);

  g.userData.finish = { tex, wall, wood, cherry, chrome };
  return g;
}

function bottle(g, x, y, z, body, cap) {
  addCyl(g, 0.032, 0.04, 0.13, toon(body), x, y + 0.065, z, 10);
  addCyl(g, 0.018, 0.02, 0.035, toon(cap), x, y + 0.145, z, 8);
}

function napkin(g, x, y, z) {
  addBox(g, 0.15, 0.07, 0.1, toon('#c9d0d6'), x, y + 0.035, z);
  addBox(g, 0.12, 0.018, 0.08, toon('#f7f4ee'), x, y + 0.075, z);
}

function placeSettings(g, layout) {
  const yBooth = 0.9;
  const spots = [
    ['booth_a_w', 0.16, 0.22],
    ['booth_a_e', -0.14, -0.18],
    ['booth_b_w', 0.12, -0.2],
    ['booth_b_e', -0.18, 0.16],
  ];
  for (const [id, dx, dz] of spots) {
    const p = layout.instances.find((i) => i.id === id);
    bottle(g, p.position[0] + dx, yBooth, p.position[2] + dz, '#c4232a', '#f6f1e8');
    if (id.endsWith('_w')) napkin(g, p.position[0] - dx * 0.4, yBooth, p.position[2] + 0.28);
  }
  for (const id of ['table_rear', 'table_front']) {
    const p = layout.instances.find((i) => i.id === id);
    const [x, , z] = p.position;
    bottle(g, x + 0.14, 0.75, z + 0.16, '#c4232a', '#f6f1e8');
    bottle(g, x + 0.24, 0.75, z + 0.08, '#e2b000', '#f4f1ea');
    napkin(g, x - 0.18, 0.75, z - 0.14);
    addCyl(g, 0.018, 0.02, 0.07, toon('#f4f1ea'), x - 0.02, 0.785, z + 0.22, 8);
    addCyl(g, 0.018, 0.02, 0.07, toon('#2a2a2a'), x + 0.04, 0.785, z + 0.22, 8);
  }
}

function makeProcedural(layout) {
  const g = new THREE.Group();
  g.name = 'procedural';
  const { width: W, depth: D, height: H } = layout.meta.room;
  const s = layout.shell;
  const F = layout.features;
  const C = F.counter;
  const shellTex = makeTextures({ ...s, neonCoral: F.neon.color, neonAccent: F.neon.accent });
  const chrome = toon(s.chrome);
  const cherry = toon(s.cherry);
  const laminate = toon(s.laminate);
  const wood = toon(s.wood);
  const ceramic = toon('#f4f1ea');
  const steel = toon('#c5ccd2');

  const len = C.z1 - C.z0;
  const zc = (C.z0 + C.z1) / 2;
  const baseDepth = C.xBack - C.xFace;
  const baseX = (C.xFace + C.xBack) / 2;
  addBox(g, baseDepth, C.height - 0.05, len, toon('#ddd6ca'), baseX, (C.height - 0.05) / 2, zc);
  const frontH = C.height - 0.1;
  const frontMap = repeated(shellTex.tiles, len / 0.16, frontH / 0.16);
  const front = plane(g, len, frontH, toon('#ffffff', { map: frontMap }), C.xFace - 0.012, frontH / 2 + 0.02, zc, -Math.PI / 2);
  front.receiveShadow = true;
  const topDepth = baseDepth + C.overhang;
  const topX = (C.xFace - C.overhang + C.xBack + 0.04) / 2;
  addBox(g, topDepth, 0.055, len + 0.06, laminate, topX, C.height - 0.025, zc);
  addBox(g, 0.04, 0.07, len + 0.06, chrome, C.xFace - C.overhang, C.height - 0.02, zc);
  addBox(g, 0.03, 0.045, len, cherry, C.xFace - 0.02, 0.9, zc);
  addBox(g, 0.04, 0.1, len - 0.04, toon('#4e342e'), C.xFace + 0.02, 0.05, zc);
  const rail = addCyl(g, 0.026, 0.026, len - 0.4, chrome, C.xFace - 0.28, 0.2, zc, 12);
  rail.rotation.x = Math.PI / 2;
  for (let z = C.z0 + 0.55; z < C.z1 - 0.3; z += 1.2) {
    addBox(g, 0.32, 0.02, 0.02, chrome, C.xFace - 0.16, 0.2, z);
  }

  const pass = F.pass;
  const passLen = pass.z1 - pass.z0;
  const passZ = (pass.z0 + pass.z1) / 2;
  addBox(g, 1.15, 0.05, passLen, steel, 5.55, pass.shelfY, passZ);
  addBox(g, 0.04, 0.08, passLen, chrome, 4.98, pass.shelfY - 0.02, passZ);
  for (const z of [-1.9, -0.95, 0.05]) {
    const lamp = addCyl(g, 0.09, 0.11, 0.06, toon('#2a2422'), 5.35, pass.shelfY - 0.08, z, 14);
    lamp.userData.noShadow = true;
    const glow = addCyl(g, 0.06, 0.06, 0.02, toon('#ffb070', {
      emissive: '#ffb070',
      emissiveIntensity: 0.55,
      unlitColor: '#ffb070',
    }), 5.35, pass.shelfY - 0.12, z, 12);
    glow.userData.noShadow = true;
  }
  for (let i = 0; i < 6; i++) {
    const ticket = plane(g, 0.09, 0.12, toon(i % 2 ? '#f6e7c4' : '#f8f3e8'), 5.02, pass.shelfY - 0.12, pass.z0 + 0.28 + i * 0.48, -Math.PI / 2);
    ticket.rotation.z = (i - 2.5) * 0.05;
    ticket.userData.noShadow = true;
  }
  for (let i = 0; i < 4; i++) {
    addCyl(g, 0.1, 0.1, 0.016, ceramic, 5.15, C.height + 0.01 + i * 0.016, -2.15, 16);
  }
  for (let i = 0; i < 3; i++) {
    addCyl(g, 0.11, 0.105, 0.018, ceramic, 5.55, C.height + 0.012, pass.z0 + 0.4 + i * 0.55, 16);
  }
  addCyl(g, 0.01, 0.01, 0.09, chrome, 5.15, C.height + 0.05, -0.15, 8);
  plane(g, 0.09, 0.07, toon('#f6edd4'), 5.12, C.height + 0.09, -0.15, -Math.PI / 2).userData.noShadow = true;
  plane(g, 0.08, 0.06, toon('#f3e2b0'), 5.18, C.height + 0.085, -0.05, -Math.PI / 2).userData.noShadow = true;

  const pieX = 4.95;
  const pieZ = C.z0 + 0.72;
  const pieY = C.height + 0.22;
  addBox(g, 0.42, 0.04, 0.62, chrome, pieX, C.height + 0.02, pieZ);
  addCyl(g, 0.09, 0.09, 0.05, toon('#e2b56a'), pieX, C.height + 0.07, pieZ - 0.12, 16);
  addCyl(g, 0.07, 0.07, 0.02, cherry, pieX, C.height + 0.1, pieZ - 0.12, 16);
  addCyl(g, 0.09, 0.09, 0.05, toon('#e6c27a'), pieX, C.height + 0.07, pieZ + 0.12, 16);
  addCyl(g, 0.07, 0.07, 0.02, toon('#f0d78a'), pieX, C.height + 0.1, pieZ + 0.12, 16);
  const pieGlass = addBox(g, 0.4, 0.36, 0.58, toon(s.windowTint, {
    transparent: true, opacity: 0.28, side: THREE.DoubleSide, depthWrite: false,
  }), pieX, pieY, pieZ);
  pieGlass.userData.noShadow = true;
  pieGlass.renderOrder = 4;

  const menu = F.menu;
  const menuMat = toon('#ffffff', {
    map: shellTex.menu,
    emissive: '#fff6ea',
    emissiveMap: shellTex.menu,
    emissiveIntensity: 0.22,
    unlitColor: '#ffffff',
    unlitMap: shellTex.menu,
  });
  const menuMesh = plane(g, menu.size[0], menu.size[1], menuMat, menu.position[0], menu.position[1], menu.position[2], -Math.PI / 2);
  menuMesh.receiveShadow = true;
  addBox(g, 0.04, menu.size[1] + 0.08, menu.size[0] + 0.08, wood, menu.position[0] + 0.03, menu.position[1], menu.position[2]);

  const today = plane(g, 0.62, 0.78, toon('#ffffff', { map: shellTex.today }), -W / 2 + 0.12, 1.72, 2.35, Math.PI / 2);
  today.receiveShadow = true;
  addBox(g, 0.03, 0.86, 0.7, wood, -W / 2 + 0.1, 1.72, 2.35);

  const neon = F.neon;
  const [nx, ny, nz] = neon.position;
  addBox(g, neon.size[0] + 0.18, neon.size[1] + 0.16, 0.05, toon('#1c1216'), nx, ny, nz - 0.03);
  const neonMat = toon('#14080c', {
    map: shellTex.neon,
    emissive: '#ffffff',
    emissiveMap: shellTex.neon,
    emissiveIntensity: neon.intensity,
    transparent: true,
    depthWrite: false,
    unlitColor: '#ffffff',
    unlitMap: shellTex.neon,
  });
  const neonMesh = plane(g, neon.size[0], neon.size[1], neonMat, nx, ny, nz + 0.02);
  neonMesh.userData.noShadow = true;
  neonMesh.renderOrder = 4;

  const openMat = toon('#14080c', {
    map: shellTex.open,
    emissive: '#ffffff',
    emissiveMap: shellTex.open,
    emissiveIntensity: 0.34,
    transparent: true,
    depthWrite: false,
    unlitColor: '#ffffff',
    unlitMap: shellTex.open,
  });
  const openSign = plane(g, 0.46, 0.16, openMat, -W / 2 + 0.09, 1.72, -3.35, Math.PI / 2);
  openSign.userData.noShadow = true;

  const fluorLen = 3.2;
  addBox(g, 0.14, 0.05, fluorLen, toon('#d9d4cc'), 5.55, 2.92, -0.4);
  const tube = addBox(g, 0.05, 0.03, fluorLen - 0.15, toon('#fff1d4', {
    emissive: '#fff1d4',
    emissiveIntensity: 0.28,
    unlitColor: '#fff1d4',
  }), 5.55, 2.88, -0.4);
  tube.userData.noShadow = true;

  const pendH = layout.assets.pendant_lamp.targetHeight;
  const cord = toon('#2c2926');
  for (const inst of layout.instances) {
    if (inst.kind !== 'pendant_lamp') continue;
    const y0 = inst.position[1] + pendH * 0.92;
    const y1 = H - 0.06;
    if (y1 > y0 + 0.05) {
      addCyl(g, 0.007, 0.007, y1 - y0, cord, inst.position[0], (y0 + y1) / 2, inst.position[2], 6);
    }
  }

  addBox(g, 0.85, 0.015, 1.35, toon('#6e3032'), -5.85, 0.018, F.door.z);
  addBox(g, 0.04, 0.55, 0.7, wood, -W / 2 + 0.1, 1.45, F.door.z + 0.85);
  for (const dz of [-0.22, 0, 0.22]) {
    addCyl(g, 0.03, 0.03, 0.05, chrome, -W / 2 + 0.14, 1.55, F.door.z + 0.85 + dz, 8).rotation.z = Math.PI / 2;
  }

  placeSettings(g, layout);

  const shadow = contactMaterial(makeContactTexture());
  const footprints = {
    diner_booth: [1.55, 2.32],
    dining_table: [1.95, 1.12],
    dining_chair: [0.42, 0.46],
    bar_stool: [0.48, 0.48],
    flowerpot: [0.28, 0.28],
  };
  for (const inst of layout.instances) {
    const size = footprints[inst.kind];
    if (!size) continue;
    addContact(g, shadow, inst.position[0], inst.position[2], inst.rotationY || 0, size[0], size[1]);
  }
  addContact(g, shadow, baseX, zc, 0, baseDepth + 0.2, len * 0.92);

  return g;
}

function decoratePrototype(kind, root) {
  if (kind !== 'pendant_lamp') return;
  root.traverse((obj) => {
    if (!obj.isMesh) return;
    const named = `${obj.name || ''} ${obj.parent?.name || ''}`;
    if (!/bulb/i.test(named)) return;
    const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
    for (const m of mats) {
      if (!m) continue;
      m.emissive = new THREE.Color('#ffd9a6');
      m.emissiveIntensity = 0.7;
      if (m.color) m.color.set('#fff2d4');
    }
  });
}

boot({
  makeShell,
  makeProcedural,
  decoratePrototype,
  readyText: 'ready — neighborhood diner · drag orbit · U unlit · T toon',
});
