import { boot } from './scene_runtime.js';
import { bankBounds } from './metrics.mjs';

const QUEUE_POSTS = [
  [-5.05, -4.45], [-5.05, -3.5], [-5.05, -2.55],
  [-4.13, -4.45], [-4.13, -3.5], [-4.13, -2.55],
  [-5.35, -2.15], [-5.72, -1.85],
  [-3.15, 0.2], [-3.15, 1.55], [-3.15, 2.9], [-3.15, 4.35],
];

const QUEUE_BELTS = [
  [0, 1], [1, 2], [3, 4], [4, 5],
  [2, 6], [6, 7],
  [8, 9], [9, 10], [10, 11],
];

function drawRibbon(ctx, w, h, display) {
  ctx.fillStyle = '#f4f8fb';
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#145e6e';
  ctx.fillRect(0, 0, w, Math.round(h * 0.3));
  ctx.fillStyle = '#ffffff';
  ctx.font = `700 ${Math.round(h * 0.17)}px sans-serif`;
  ctx.fillText(display.header, 40, Math.round(h * 0.2));
  const cols = [40, w * 0.34, w * 0.5, w * 0.66];
  display.rows.forEach((row, i) => {
    const parts = row.split(/\s{2,}/);
    const y = Math.round(h * (0.48 + i * 0.16));
    ctx.font = `700 ${Math.round(h * 0.125)}px sans-serif`;
    parts.forEach((part, j) => {
      const status = part === 'BOARDING' || part === 'ON TIME' || part === 'GATE';
      ctx.fillStyle = status ? '#0f6a78' : '#121920';
      ctx.fillText(part, cols[j] || 40, y);
    });
  });
}

function drawIsa(ctx, w, h) {
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = '#1a7384';
  ctx.beginPath();
  ctx.arc(w / 2, h / 2, w * 0.46, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#f4f8fb';
  ctx.fillRect(w * 0.42, h * 0.38, w * 0.16, h * 0.28);
  ctx.beginPath();
  ctx.arc(w * 0.5, h * 0.3, w * 0.08, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(w * 0.28, h * 0.46, w * 0.44, h * 0.07);
}

boot({
  build(api) {
    const { layout, toon, addBox, addCyl, canvasTexture, addContact, THREE } = api;
    const S = layout.shell;
    const room = layout.meta.room;
    const W = room.width;
    const D = room.depth;
    const H = room.height;
    const x0 = -W / 2;
    const x1 = W / 2;
    const z0 = -D / 2;
    const wallT = S.wallThickness;

    const mats = {
      floor: toon(S.floorColor),
      carpet: toon(S.carpetColor),
      wall: toon(S.wallColor),
      base: toon(S.baseColor),
      ceiling: toon(S.ceilingColor),
      metal: toon(S.metalColor),
      shell: toon(S.shellColor),
      cushion: toon(S.cushionColor),
      beam: toon(S.beamColor),
      podium: toon(S.podiumColor),
      top: toon(S.topColor),
      teal: toon(S.tealColor),
      glass: toon(S.glassColor, { transparent: true, opacity: 0.18, side: THREE.DoubleSide, depthWrite: false }),
      apron: toon(S.apronColor),
      fuse: toon(S.fuselageColor),
      bridge: toon(S.bridgeColor),
      dark: toon('#242b32'),
      led: toon('#d7eef2', { emissive: '#b7e0ea', emissiveIntensity: 0.45 }),
      screen: toon('#d5e4ea', { emissive: '#c5d8e2', emissiveIntensity: 0.35 }),
      yellow: toon('#d7b15a'),
      bag: toon('#3d4c5c'),
      plant: toon('#3e6a52'),
    };

    const shell = new THREE.Group();
    shell.name = 'shell';
    const props = new THREE.Group();
    props.name = 'furnishings';

    addBox(shell, W, 0.12, D + layout.meta.apronDepth, mats.floor, 0, -0.06, z0 - layout.meta.apronDepth / 2);
    addBox(shell, W - 0.4, 0.02, 2.4, mats.carpet, 2.45, 0.012, -0.45, { cast: false });

    const innerX0 = x0 + wallT;
    addWalls(shell, { addBox, mats, W, D, H, x0, x1, z0, wallT, door: layout.door, innerX0 });
    addWindow(shell, { addBox, addCyl, mats, W, H, z0, wallT, S, x0, x1 });
    addApron(shell, { addBox, addCyl, mats, THREE, W, H, z0, S, layout, x0, x1 });
    addCeiling(shell, { addBox, mats, H, x0, x1, z0, D });
    addDoorHead(shell, { addBox, canvasTexture, toon, mats, layout, H });
    addBridgeThroat(shell, { addBox, mats, toon, door: layout.door });
    addWallDressing(shell, { addBox, mats, toon, canvasTexture, THREE, W, D, H, x0, x1, door: layout.door });

    for (const bank of layout.seating.banks) addSeatBank(props, bank, layout, { addBox, addCyl, mats, addContact });
    for (const display of layout.displays) addRibbon(props, display, { addBox, THREE, canvasTexture, toon, mats, H });
    addPodium(props, layout.podium, { addBox, addCyl, mats, canvasTexture, toon });
    for (const scanner of layout.scanners) addScanner(props, scanner, { addBox, addCyl, mats });
    addQueue(props, { addBox, addCyl, mats });
    addLedge(props, layout.ledge, { addBox, mats });
    addClutter(props, layout, { addBox, addCyl, mats, canvasTexture, toon, THREE });

    return { shell, props };
  },
}).catch((err) => {
  window.__errors = window.__errors || [];
  window.__errors.push(String(err && err.stack ? err.stack : err));
  const status = document.getElementById('status');
  if (status) status.textContent = 'error — see console';
  console.error(err);
});

function addWalls(shell, ctx) {
  const { addBox, mats, W, D, H, x0, x1, z0, wallT, door, innerX0 } = ctx;
  const west = innerX0 - wallT / 2;
  const east = x1 - wallT / 2;
  const south = z0 + wallT / 2;
  addBox(shell, wallT, H, D, mats.wall, east, H / 2, 0);
  addBox(shell, wallT, 0.14, D, mats.base, east + 0.01, 0.07, 0);

  const doorZ0 = door.z - door.w / 2;
  const doorZ1 = door.z + door.w / 2;
  const southLen = doorZ0 - z0;
  const northLen = (z0 + D) - doorZ1;
  addBox(shell, wallT, H, southLen, mats.wall, west, H / 2, z0 + southLen / 2);
  addBox(shell, wallT, H, northLen, mats.wall, west, H / 2, doorZ1 + northLen / 2);
  const above = H - door.h;
  addBox(shell, wallT, above, door.w, mats.wall, west, door.h + above / 2, door.z);
  addBox(shell, wallT, 0.14, southLen, mats.base, west, 0.07, z0 + southLen / 2);
  addBox(shell, wallT, 0.14, northLen, mats.base, west, 0.07, doorZ1 + northLen / 2);

  addBox(shell, 0.9, H, wallT, mats.wall, x0 + 0.45, H / 2, z0 + D - wallT / 2);
  addBox(shell, 0.9, H, wallT, mats.wall, x1 - 0.45, H / 2, z0 + D - wallT / 2);
  addBox(shell, W, 0.08, 0.08, mats.base, 0, 0.04, z0 + D - 0.04, { cast: false });
}

function addWindow(shell, ctx) {
  const { addBox, mats, W, H, z0, wallT, S, x0, x1 } = ctx;
  const z = z0 + wallT / 2;
  const glassH = S.windowHead - S.sill;
  addBox(shell, W, S.sill, wallT, mats.wall, 0, S.sill / 2, z);
  addBox(shell, W, 0.12, wallT + 0.02, mats.base, 0, 0.06, z + 0.02);
  addBox(shell, W, H - S.windowHead, wallT, mats.wall, 0, (H + S.windowHead) / 2, z);
  addBox(shell, W - 0.3, glassH, 0.03, mats.glass, 0, (S.sill + S.windowHead) / 2, z + 0.03, { cast: false, receive: false });
  for (let x = x0 + 1.6; x < x1 - 0.6; x += 1.8) {
    addBox(shell, 0.06, glassH, 0.07, mats.metal, x, (S.sill + S.windowHead) / 2, z, { cast: false });
  }
  addBox(shell, W, 0.06, 0.08, mats.metal, 0, S.sill, z, { cast: false });
  addBox(shell, W, 0.06, 0.08, mats.metal, 0, S.windowHead, z, { cast: false });
  addBox(shell, 9.6, 0.04, 0.05, mats.metal, 1.3, 1.02, z + 0.12, { cast: false });
  for (let x = -3.6; x <= 6.2; x += 1.8) {
    addBox(shell, 0.04, 1.02, 0.04, mats.metal, x, 0.51, z + 0.12, { cast: false });
  }
}

function addApron(shell, ctx) {
  const { addBox, addCyl, mats, W, H, z0, layout, x0, x1 } = ctx;
  const depth = layout.meta.apronDepth;
  const backZ = z0 - depth;
  addBox(shell, W + 0.4, H, 0.12, mats.apron, 0, H / 2, backZ);
  addBox(shell, 0.12, H, depth, mats.apron, x0 - 0.2, H / 2, z0 - depth / 2);
  addBox(shell, 0.12, H, depth, mats.apron, x1 + 0.2, H / 2, z0 - depth / 2);
  addBox(shell, 7.2, 0.03, 0.08, mats.yellow, 1.2, 0.02, z0 - 1.15, { cast: false, receive: false });

  const r = 1.38;
  const cy = 1.58;
  const cz = -6.72;
  const fuse = addCyl(shell, r, r, 11.2, mats.fuse, 0.4, cy, cz, 28, { rz: Math.PI / 2, receive: true });
  fuse.castShadow = true;
  const yWin = 1.92;
  const near = cz + Math.sqrt(r * r - (yWin - cy) ** 2) + 0.04;
  for (let i = -3; i <= 4; i += 1) {
    addBox(shell, 0.34, 0.26, 0.06, mats.dark, -2.4 + i * 0.95, yWin, near, { cast: false });
  }
  const yLine = 1.22;
  const lineZ = cz + Math.sqrt(Math.max(r * r - (yLine - cy) ** 2, 0.05)) + 0.05;
  addBox(shell, 8.4, 0.08, 0.05, mats.teal, 0.2, yLine, lineZ, { cast: false });

  addBox(shell, 1.5, 1.15, 1.7, mats.bridge, -5.4, 1.7, z0 - 0.95);
  addBox(shell, 0.9, 0.55, 1.3, mats.dark, 3.4, 0.45, z0 - 1.35);
  addCyl(shell, 0.16, 0.16, 0.12, mats.dark, 2.95, 0.16, z0 - 1.15, 12, { rx: Math.PI / 2, cast: false });
  addCyl(shell, 0.16, 0.16, 0.12, mats.dark, 3.85, 0.16, z0 - 1.15, 12, { rx: Math.PI / 2, cast: false });
}

function addCeiling(shell, ctx) {
  const { addBox, mats, H, x0, x1, z0, D } = ctx;
  const span = (x1 - x0) + 0.6;
  const depth = D + 0.3;
  const zc = z0 + D / 2;
  addBox(shell, span, 0.1, depth, mats.ceiling, 0, H - 0.05, zc, { cast: false });
  const zFascia = z0 + D + 0.08;
  addBox(shell, span, 0.38, 0.14, mats.metal, 0, H - 0.26, zFascia, { cast: false });
  for (let z = z0 + 0.85; z <= z0 + D - 0.7; z += 0.95) {
    addBox(shell, span - 0.8, 0.16, 0.04, mats.ceiling, 0, H - 0.2, z, { cast: false });
  }
  for (let z = z0 + 1.3; z <= z0 + D - 1.4; z += 1.7) {
    addBox(shell, span * 0.62, 0.02, 0.06, mats.led, 0.15, H - 0.34, z, { cast: false, receive: false });
  }
}

function addBridgeThroat(shell, ctx) {
  const { addBox, mats, toon, door } = ctx;
  const mouth = door.x - 0.02;
  const length = 2.35;
  const far = mouth - length;
  const mid = mouth - length / 2;
  const innerW = door.w - 0.28;
  const crown = 2.22;
  const rib = toon('#4e585f');
  const liner = toon('#c5d0d8');
  const end = toon('#8b969f');
  addBox(shell, length, 0.05, innerW - 0.08, end, mid, 0.03, door.z, { cast: false });
  addBox(shell, length, 0.014, 0.14, mats.yellow, mid, 0.065, door.z, { cast: false, receive: false });
  addBox(shell, length, crown, 0.06, liner, mid, crown / 2, door.z - innerW / 2, { cast: false });
  addBox(shell, length, crown, 0.06, liner, mid, crown / 2, door.z + innerW / 2, { cast: false });
  addBox(shell, length, 0.07, innerW + 0.1, liner, mid, crown - 0.02, door.z, { cast: false });
  addBox(shell, 0.08, crown, innerW - 0.1, end, far, crown / 2, door.z, { cast: false });
  for (let i = 1; i <= 3; i += 1) {
    const x = mouth - i * 0.52;
    addBox(shell, 0.07, 0.08, innerW + 0.02, rib, x, crown - 0.1, door.z, { cast: false });
    addBox(shell, 0.07, crown - 0.08, 0.07, rib, x, (crown - 0.08) / 2, door.z - innerW / 2 + 0.02, { cast: false });
    addBox(shell, 0.07, crown - 0.08, 0.07, rib, x, (crown - 0.08) / 2, door.z + innerW / 2 - 0.02, { cast: false });
  }
  addBox(shell, 0.12, door.h + 0.06, 0.1, mats.metal, mouth + 0.05, door.h / 2, door.z - door.w / 2, { cast: false });
  addBox(shell, 0.12, door.h + 0.06, 0.1, mats.metal, mouth + 0.05, door.h / 2, door.z + door.w / 2, { cast: false });
  addBox(shell, 0.12, 0.1, door.w + 0.1, mats.metal, mouth + 0.05, door.h + 0.02, door.z, { cast: false });
  addBox(shell, 0.05, door.h - 0.28, 0.28, mats.shell, mouth - 0.2, (door.h - 0.28) / 2, door.z - door.w * 0.36, { cast: false });
  addBox(shell, 1.1, 0.025, 0.1, mats.led, mouth - 0.55, crown - 0.1, door.z, { cast: false, receive: false });
  addBox(shell, 0.7, 0.025, 0.1, mats.led, mouth - 1.5, crown - 0.1, door.z, { cast: false, receive: false });
}

function addWallDressing(shell, ctx) {
  const { addBox, mats, toon, canvasTexture, THREE, x0, x1, door } = ctx;
  const east = x1 - 0.14;
  const west = x0 + 0.16;
  const joint = toon('#7d8b96');
  for (const y of [1.45, 2.05, 3.05]) {
    addBox(shell, 0.02, 0.025, 9.4, joint, east, y, -0.15, { cast: false, receive: false });
  }
  for (let z = -4.4; z <= 4.4; z += 1.7) {
    addBox(shell, 0.02, 2.15, 0.025, joint, east, 2.35, z, { cast: false, receive: false });
  }
  const glazeZ0 = -3.2;
  const glazeZ1 = 2.45;
  const glazeZC = (glazeZ0 + glazeZ1) / 2;
  const glazeL = glazeZ1 - glazeZ0;
  const glazeY = 2.2;
  const glazeH = 1.7;
  const pane = toon('#6e8ea3', { transparent: true, opacity: 0.55, side: THREE.DoubleSide, depthWrite: false });
  addBox(shell, 0.05, glazeH, glazeL, toon('#9aafbf'), east + 0.02, glazeY, glazeZC, { cast: false });
  addBox(shell, 0.02, glazeH - 0.08, glazeL - 0.08, pane, east - 0.03, glazeY, glazeZC, { cast: false, receive: false });
  addBox(shell, 0.03, 0.05, glazeL, mats.metal, east - 0.03, glazeY + glazeH / 2, glazeZC, { cast: false });
  addBox(shell, 0.03, 0.05, glazeL, mats.metal, east - 0.03, glazeY - glazeH / 2, glazeZC, { cast: false });
  for (let z = glazeZ0; z <= glazeZ1; z += 0.95) {
    addBox(shell, 0.035, glazeH, 0.045, mats.metal, east - 0.035, glazeY, z, { cast: false });
  }
  addBox(shell, 0.02, 0.04, 8.6, mats.teal, east - 0.02, 1.32, -0.35, { cast: false });

  for (const y of [1.05, 2.2]) {
    addBox(shell, 0.015, 0.02, 3.3, joint, west, y, -3.55, { cast: false, receive: false });
    addBox(shell, 0.015, 0.02, 3.6, joint, west, y, 1.7, { cast: false, receive: false });
  }
  const tex = canvasTexture((c, w, h) => {
    c.fillStyle = '#f7fafc';
    c.fillRect(0, 0, w, h);
    c.fillStyle = '#145e6e';
    c.fillRect(0, 0, w, 150);
    c.fillStyle = '#ffffff';
    c.font = '700 92px sans-serif';
    c.fillText('GATE B12', 36, 100);
    c.fillStyle = '#142028';
    c.font = '700 48px sans-serif';
    c.fillText('SK 1427   CPH   ON TIME', 36, 230);
    c.fillStyle = '#0f6a78';
    c.fillText('AY 832    HEL   BOARDING', 36, 310);
    c.fillStyle = '#142028';
    c.fillText('BA 456    LHR   15:25', 36, 390);
  }, 1024, 512);
  const plate = toon('#f7fafc', { map: tex, emissive: '#e7eef3', emissiveIntensity: 0.35 });
  addBox(shell, 0.03, 0.78, 1.15, plate, west + 0.02, 1.62, door.z + door.w / 2 + 0.85, { cast: false });
}

function addDoorHead(shell, ctx) {
  const { addBox, canvasTexture, toon, mats, layout } = ctx;
  const door = layout.door;
  const tex = canvasTexture((ctx2, w, h) => {
    ctx2.fillStyle = '#1a7384';
    ctx2.fillRect(0, 0, w, h);
    ctx2.fillStyle = '#f4f8fb';
    ctx2.font = '600 72px sans-serif';
    ctx2.fillText('GATE  B12', 36, 92);
  }, 512, 128);
  const mat = toon('#1a7384', { map: tex, emissive: '#166070', emissiveIntensity: 0.25 });
  addBox(shell, 0.04, 0.26, 1.15, mat, door.x + 0.1, door.h + 0.22, door.z, { cast: false });
  addBox(shell, 0.08, 0.04, 0.7, mats.dark, door.x + 0.16, 2.55, door.z + 0.72, { cast: false });
}

function addSeatBank(props, bank, layout, ctx) {
  const { addBox, addCyl, mats, addContact } = ctx;
  const seating = layout.seating;
  const bounds = bankBounds(bank, seating);
  const seatLen = bank.seats * seating.pitch;
  const beamLen = bounds.z1 - bounds.z0 - 0.06;
  const beamZ = (bounds.z0 + bounds.z1) / 2;
  addBox(props, 0.08, 0.045, beamLen, mats.beam, bank.x, 0.18, beamZ);
  const legZs = [bounds.z0 + 0.12, bounds.z0 + seatLen / 2, bounds.z1 - 0.12];
  for (const lz of legZs) {
    addCyl(props, 0.022, 0.028, 0.16, mats.metal, bank.x - 0.1, 0.08, lz, 10);
    addCyl(props, 0.022, 0.028, 0.16, mats.metal, bank.x + 0.12, 0.08, lz, 10);
    addBox(props, 0.3, 0.018, 0.05, mats.metal, bank.x, 0.012, lz);
  }
  const gap = seating.pitch * 0.18;
  for (let i = 0; i < bank.seats; i += 1) {
    const z = bounds.z0 + seating.pitch * (i + 0.5);
    const backW = seating.pitch - gap;
    addBox(props, 0.36, 0.065, backW * 0.92, mats.cushion, bank.x - 0.1, seating.seatHeight, z);
    const nose = addCyl(props, 0.032, 0.032, backW * 0.84, mats.cushion, bounds.x0 + 0.04, seating.seatHeight - 0.008, z, 12);
    nose.rotation.x = Math.PI / 2;
    const back = addBox(props, 0.038, 0.38, backW * 0.84, mats.shell, bank.x + 0.05, 0.66, z);
    back.rotation.z = -0.32;
    addBox(props, 0.03, 0.1, backW * 0.72, mats.cushion, bank.x + 0.01, 0.52, z);
    const head = addBox(props, 0.036, 0.09, backW * 0.46, mats.shell, bank.x + 0.12, 0.86, z);
    head.rotation.z = -0.28;
    const crown = addCyl(props, 0.02, 0.02, backW * 0.42, mats.shell, bank.x + 0.145, 0.91, z, 10);
    crown.rotation.x = Math.PI / 2;
  }
  for (let i = 0; i <= bank.seats; i += 1) {
    const z = bounds.z0 + seating.pitch * i;
    addBox(props, 0.18, 0.026, 0.03, mats.metal, bank.x - 0.04, 0.56, z);
    addCyl(props, 0.012, 0.014, 0.12, mats.metal, bank.x + 0.04, 0.5, z, 8);
    if (bank.armPower && i === 1) {
      addBox(props, 0.04, 0.01, 0.018, mats.led, bank.x - 0.08, 0.578, z, { cast: false });
    }
  }
  addContact(bank.x, 0.014, bank.z, 0.42, seatLen * 0.42);
  if (bank.accessibleBay) {
    const bayZ = bounds.z0 + seatLen + seating.bayLength / 2;
    addBox(props, 0.7, 0.012, 0.7, mats.teal, bank.x, 0.02, bayZ, { cast: false });
  }
}

function addRibbon(props, display, ctx) {
  const { addBox, THREE, canvasTexture, toon, mats, H } = ctx;
  const tex = canvasTexture((c, w, h) => drawRibbon(c, w, h, display), 2048, 768);
  const face = toon('#f4f8fb', { map: tex, emissive: '#eef3f6', emissiveIntensity: 0.55 });
  const plane = new THREE.Mesh(new THREE.PlaneGeometry(display.width, display.height), face);
  plane.rotation.y = Math.PI / 2;
  plane.position.set(display.x, display.y, display.z);
  plane.castShadow = false;
  plane.receiveShadow = false;
  plane.userData.cast = false;
  props.add(plane);
  const hz = display.width / 2;
  addBox(props, 0.04, 0.04, display.width + 0.08, mats.metal, display.x - 0.03, display.y + display.height / 2 + 0.02, display.z, { cast: false });
  addBox(props, 0.04, 0.04, display.width + 0.08, mats.metal, display.x - 0.03, display.y - display.height / 2 - 0.02, display.z, { cast: false });
  addBox(props, 0.04, display.height, 0.04, mats.metal, display.x - 0.03, display.y, display.z - hz, { cast: false });
  addBox(props, 0.04, display.height, 0.04, mats.metal, display.x - 0.03, display.y, display.z + hz, { cast: false });
  addBox(props, 0.03, display.height + 0.06, display.width + 0.06, mats.dark, display.x - 0.05, display.y, display.z, { cast: false });
  addBox(props, 0.025, H - display.y - display.height / 2, 0.025, mats.metal, display.x, (H + display.y + display.height / 2) / 2, display.z - hz + 0.08, { cast: false });
  addBox(props, 0.025, H - display.y - display.height / 2, 0.025, mats.metal, display.x, (H + display.y + display.height / 2) / 2, display.z + hz - 0.08, { cast: false });
}

function addPodium(props, podium, ctx) {
  const { addBox, addCyl, mats, canvasTexture, toon } = ctx;
  addBox(props, podium.w, podium.h - 0.06, podium.d, mats.podium, podium.x, (podium.h - 0.06) / 2, podium.z);
  addBox(props, podium.w + 0.05, 0.04, podium.d + 0.05, mats.top, podium.x, podium.h - 0.02, podium.z);
  addBox(props, podium.w - 0.1, 0.1, podium.d - 0.12, mats.dark, podium.x, 0.05, podium.z);
  addBox(props, 0.018, 0.07, podium.d * 0.62, mats.teal, podium.x + podium.w / 2 + 0.01, 0.78, podium.z, { cast: false });
  const tex = canvasTexture((c, w, h) => {
    c.fillStyle = '#f4f7f8';
    c.fillRect(0, 0, w, h);
    c.fillStyle = '#1a7384';
    c.fillRect(0, 0, 16, h);
    c.fillStyle = '#1b2830';
    c.font = '600 64px sans-serif';
    c.fillText('B12', 40, 86);
    c.font = '28px sans-serif';
    c.fillText('BOARDING', 40, 132);
  }, 512, 180);
  const plate = toon('#f4f7f8', { map: tex });
  addBox(props, 0.02, 0.28, 0.42, plate, podium.x + podium.w / 2 + 0.02, 0.48, podium.z + 0.15, { cast: false });
  addCyl(props, 0.012, 0.012, 0.22, mats.metal, podium.x + 0.08, podium.h + 0.1, podium.z - 0.35, 8);
  addBox(props, 0.22, 0.02, 0.12, mats.dark, podium.x + 0.02, podium.h + 0.015, podium.z + 0.35, { cast: false });
}

function addScanner(props, scanner, ctx) {
  const { addBox, addCyl, mats } = ctx;
  addCyl(props, 0.18, 0.22, 0.06, mats.dark, scanner.x, 0.03, scanner.z, 16);
  addCyl(props, 0.045, 0.055, 0.86, mats.metal, scanner.x, 0.48, scanner.z, 12);
  addBox(props, 0.32, 0.035, 0.24, mats.top, scanner.x, 0.94, scanner.z);
  addBox(props, 0.012, 0.016, 0.12, mats.led, scanner.x + 0.15, 0.9, scanner.z, { cast: false });
}

function addQueue(props, ctx) {
  const { addBox, addCyl, mats } = ctx;
  for (const [x, z] of QUEUE_POSTS) {
    addCyl(props, 0.045, 0.055, 0.04, mats.dark, x, 0.02, z, 12);
    addCyl(props, 0.018, 0.022, 0.9, mats.dark, x, 0.48, z, 10);
    addCyl(props, 0.032, 0.032, 0.03, mats.metal, x, 0.94, z, 10);
  }
  for (const [a, b] of QUEUE_BELTS) {
    const p = QUEUE_POSTS[a];
    const q = QUEUE_POSTS[b];
    const mx = (p[0] + q[0]) / 2;
    const mz = (p[1] + q[1]) / 2;
    const len = Math.hypot(q[0] - p[0], q[1] - p[1]);
    const yaw = Math.atan2(q[0] - p[0], q[1] - p[1]);
    const belt = addBox(props, 0.025, 0.045, Math.max(len - 0.06, 0.1), mats.teal, mx, 0.86, mz, { cast: false });
    belt.rotation.y = yaw;
  }
}

function addLedge(props, ledge, ctx) {
  const { addBox, mats } = ctx;
  const len = ledge.z1 - ledge.z0;
  const zc = (ledge.z0 + ledge.z1) / 2;
  addBox(props, ledge.d, ledge.h - 0.05, len, mats.podium, ledge.x, (ledge.h - 0.05) / 2, zc);
  addBox(props, ledge.d + 0.04, 0.04, len + 0.02, mats.metal, ledge.x - 0.01, ledge.h - 0.02, zc);
  addBox(props, 0.04, 0.7, len - 0.2, mats.dark, ledge.x + 0.02, 0.4, zc);
  const n = Math.floor(len / 0.8);
  for (let i = 0; i < n; i += 1) {
    const z = ledge.z0 + 0.45 + i * 0.8;
    addBox(props, 0.018, 0.05, 0.09, mats.dark, ledge.x - ledge.d / 2 - 0.01, 0.98, z, { cast: false });
    addBox(props, 0.01, 0.014, 0.014, mats.led, ledge.x - ledge.d / 2 - 0.022, 1.0, z, { cast: false });
  }
  addBox(props, 0.32, 0.015, 0.22, mats.dark, ledge.x - 0.02, ledge.h + 0.01, zc - 0.7, { cast: false });
  addBox(props, 0.3, 0.18, 0.012, mats.screen, ledge.x - 0.08, ledge.h + 0.12, zc - 0.7, { cast: false });
  addBox(props, 0.28, 0.16, 0.12, mats.bag, ledge.x + 0.02, 0.16, ledge.z0 + 0.45);
}

function addClutter(props, layout, ctx) {
  const { addBox, addCyl, mats, canvasTexture, toon, THREE } = ctx;
  const pot = layout.instances.find((item) => item.id === 'planter');
  addCyl(props, 0.016, 0.022, 0.2, mats.plant, pot.position[0], 0.4, pot.position[2], 8, { cast: false });
  addBox(props, 0.22, 0.16, 0.18, mats.plant, pot.position[0], 0.58, pot.position[2], { cast: false });
  addBox(props, 0.14, 0.12, 0.12, toon('#4e7d62'), pot.position[0] + 0.08, 0.7, pot.position[2] - 0.05, { cast: false });
  addBox(props, 0.12, 0.1, 0.1, toon('#2f5a44'), pot.position[0] - 0.07, 0.66, pot.position[2] + 0.04, { cast: false });

  addBox(props, 0.38, 0.28, 0.22, mats.bag, 2.7, 0.16, -2.05);
  addCyl(props, 0.012, 0.012, 0.16, mats.metal, 2.7, 0.36, -2.05, 8, { cast: false });

  addBox(props, 0.46, 0.72, 0.36, mats.metal, 5.55, 0.36, 3.25);
  addBox(props, 0.08, 0.16, 0.16, mats.dark, 5.55, 0.48, 3.25 + 0.19, { cast: false });
  addBox(props, 0.08, 0.16, 0.16, mats.teal, 5.55, 0.48, 3.25 - 0.02, { cast: false });

  const tex = canvasTexture((c, w, h) => drawIsa(c, w, h), 256, 256);
  const mark = new THREE.Mesh(
    new THREE.PlaneGeometry(0.55, 0.55),
    toon('#1a7384', { map: tex, transparent: true }),
  );
  const bay = layout.seating.banks.find((bank) => bank.accessibleBay);
  const bounds = bankBounds(bay, layout.seating);
  const seatLen = bay.seats * layout.seating.pitch;
  mark.rotation.x = -Math.PI / 2;
  mark.position.set(bay.x, 0.03, bounds.z0 + seatLen + layout.seating.bayLength / 2);
  mark.castShadow = false;
  mark.receiveShadow = false;
  mark.userData.cast = false;
  props.add(mark);

  const lane = layout.lanes.accessible;
  addBox(props, 0.06, 0.008, lane.z1 - lane.z0, mats.teal, lane.x0, 0.016, (lane.z0 + lane.z1) / 2, { cast: false, receive: false });
  addBox(props, 0.06, 0.008, lane.z1 - lane.z0, mats.teal, lane.x1, 0.016, (lane.z0 + lane.z1) / 2, { cast: false, receive: false });
  const door = layout.door;
  addBox(props, 0.55, 0.012, door.w * 0.85, mats.yellow, door.x + 0.55, 0.018, door.z, { cast: false, receive: false });
}
