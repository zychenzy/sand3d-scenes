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
  ctx.fillStyle = '#e6eef3';
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#1a7384';
  ctx.fillRect(0, 0, w, Math.round(h * 0.22));
  ctx.fillStyle = '#f5fafc';
  ctx.font = `600 ${Math.round(h * 0.11)}px sans-serif`;
  ctx.fillText(display.header, 28, Math.round(h * 0.15));
  ctx.fillStyle = '#1b2830';
  ctx.font = `${Math.round(h * 0.09)}px sans-serif`;
  display.rows.forEach((row, i) => {
    const y = Math.round(h * (0.4 + i * 0.18));
    ctx.fillStyle = row.includes('BOARDING') ? '#1a7384' : '#1b2830';
    ctx.fillText(row, 28, y);
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
    addCeiling(shell, { addBox, mats, H });
    addDoorHead(shell, { addBox, canvasTexture, toon, mats, layout, H });

    for (const bank of layout.seating.banks) addSeatBank(props, bank, layout, { addBox, mats, addContact });
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

  addBox(shell, 1.15, 2.4, 1.35, mats.bridge, west - 0.72, 1.2, door.z, { receive: true });
  addBox(shell, 0.06, door.h - 0.12, door.w * 0.28, mats.shell, west - 0.06, (door.h - 0.12) / 2, door.z - door.w * 0.34);
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
  const { addBox, mats, H } = ctx;
  addBox(shell, 12.6, 0.08, 6.8, mats.ceiling, 0.2, H - 0.08, -1.15, { cast: false });
  for (let z = -4.35; z <= 1.9; z += 0.85) {
    addBox(shell, 12.2, 0.28, 0.05, mats.ceiling, 0.15, H - 0.32, z, { cast: false });
  }
  for (let z = -3.95; z <= 1.5; z += 1.7) {
    addBox(shell, 8.4, 0.03, 0.08, mats.led, 0.2, H - 0.5, z, { cast: false, receive: false });
  }
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
  const { addBox, mats, addContact } = ctx;
  const seating = layout.seating;
  const bounds = bankBounds(bank, seating);
  const seatLen = bank.seats * seating.pitch;
  const beamLen = bounds.z1 - bounds.z0 - 0.06;
  const beamZ = (bounds.z0 + bounds.z1) / 2;
  addBox(props, 0.07, 0.05, beamLen, mats.beam, bank.x + 0.04, 0.2, beamZ);
  const legZs = [bounds.z0 + 0.1, (bounds.z0 + bounds.z0 + seatLen) / 2, bounds.z1 - 0.1];
  for (const lz of legZs) {
    addBox(props, 0.05, 0.2, 0.055, mats.metal, bank.x + 0.04, 0.1, lz);
    addBox(props, 0.32, 0.028, 0.07, mats.metal, bank.x, 0.018, lz);
  }
  for (let i = 0; i < bank.seats; i += 1) {
    const z = bounds.z0 + seating.pitch * (i + 0.5);
    const xBack = bounds.x1 - 0.04;
    addBox(props, 0.36, 0.055, seating.pitch * 0.78, mats.cushion, bank.x - 0.04, seating.seatHeight, z);
    addBox(props, 0.07, 0.045, seating.pitch * 0.72, mats.cushion, bounds.x0 + 0.08, seating.seatHeight - 0.02, z);
    addBox(props, 0.05, 0.4, seating.pitch * 0.8, mats.shell, xBack, 0.7, z);
    addBox(props, 0.04, 0.14, seating.pitch * 0.58, mats.shell, xBack + 0.012, seating.backHeight, z);
    addBox(props, 0.028, 0.16, seating.pitch * 0.68, mats.cushion, xBack - 0.03, 0.6, z);
  }
  for (let i = 0; i <= bank.seats; i += 1) {
    const z = bounds.z0 + seating.pitch * i;
    addBox(props, 0.28, 0.032, 0.038, mats.metal, bank.x - 0.02, 0.63, z);
    addBox(props, 0.032, 0.18, 0.038, mats.metal, bank.x + 0.1, 0.54, z);
    if (bank.armPower && i === 1) {
      addBox(props, 0.045, 0.012, 0.02, mats.led, bank.x - 0.08, 0.652, z, { cast: false });
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
  const tex = canvasTexture((c, w, h) => drawRibbon(c, w, h, display), 1024, 320);
  const face = toon('#e6eef3', { map: tex, emissive: '#d5e4ec', emissiveIntensity: 0.4 });
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
