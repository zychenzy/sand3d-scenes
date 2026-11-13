import * as THREE from 'three';
import { boot, toon, addBox, addCyl, labelTexture } from './scene_lib.js';

// Cedar Lane branch. Public lobby is +Z. Sorting hall is -Z.
// Clerks use work stools on the staff side; the open side of each stool faces +Z.
// The counter, door, and floor change are the staff/public boundary.
// PO boxes are letter-module doors on the public left wall.
// Pigeonholes, trolleys, and the packing desk are the visible workroom.

const MAIL = ['#c4473a', '#2f6d86', '#e2c14a', '#f4efe4', '#3d6b45', '#d7d0c2', '#8d4a62'];
const KRAFT = '#c4a574';

function mats(shell) {
  const wood = toon(shell.woodColor);
  const brass = toon(shell.brassColor);
  const ink = toon(shell.ink);
  const plaster = toon(shell.wallColor);
  const band = toon(shell.redBand);
  return {
    wood,
    woodDark: toon('#4e3424'),
    brass,
    ink,
    plaster,
    band,
    top: toon('#e6dece'),
    glass: toon('#d5e4ea', { transparent: true, opacity: 0.42, side: THREE.DoubleSide }),
    staff: toon(shell.staffFloor),
    lobby: toon(shell.floorColor),
    runner: toon('#243f46'),
    paper: toon('#f3ead8'),
    kraft: toon(KRAFT),
    canvas: toon('#8d8a72'),
    steel: toon('#8e9390'),
    rubber: toon('#3e4240'),
    lamp: toon('#fff4d4', { emissive: 0xfff1cc, emissiveIntensity: 0.85 }),
    slot: toon('#2c3330'),
    leaf: toon('#3f6a40'),
  };
}

function plaque(g, w, h, text, x, y, z, rotY, bg, fg, opts = {}) {
  const map = labelTexture(text, opts.tw || 256, opts.th || 64, {
    bg, fg, px: opts.px || 28, weight: opts.weight || 700, rule: opts.rule,
  });
  const mat = toon('#ffffff', { map, side: THREE.FrontSide });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
  mesh.position.set(x, y, z);
  mesh.rotation.y = rotY || 0;
  if (opts.rotX) mesh.rotation.x = opts.rotX;
  mesh.castShadow = false;
  mesh.receiveShadow = false;
  mesh.userData.castShadow = false;
  mesh.userData.receiveShadow = false;
  if (opts.name) mesh.name = opts.name;
  g.add(mesh);
  return mesh;
}

function makeShell(layout) {
  const g = new THREE.Group();
  g.name = 'shell';
  const { width: W, depth: D, height: H } = layout.meta.room;
  const s = layout.shell;
  const m = mats(s);
  const floor = addBox(g, W, 0.08, D, m.lobby, 0, -0.04, 0, { name: 'floor' });
  floor.receiveShadow = true;

  addBox(g, W, H, 0.14, m.plaster, 0, H / 2, -D / 2, { name: 'back-wall' });
  addBox(g, 0.14, H, D, m.plaster, -W / 2, H / 2, 0, { name: 'left-wall' });

  const dadoH = 1.12;
  addBox(g, W - 0.2, dadoH, 0.04, m.wood, 0, dadoH / 2, -D / 2 + 0.09, { cast: false });
  addBox(g, 0.04, dadoH, D - 0.2, m.wood, -W / 2 + 0.09, dadoH / 2, 0, { cast: false });
  addBox(g, W - 0.16, 0.045, 0.05, m.brass, 0, dadoH + 0.02, -D / 2 + 0.1, { cast: false });
  addBox(g, 0.05, 0.045, D - 0.16, m.brass, -W / 2 + 0.1, dadoH + 0.02, 0, { cast: false });

  const b = layout.build;
  const staffZ = b.counter.z - b.counter.depth / 2;
  const staffDepth = staffZ - (-D / 2 + 0.16);
  const staffCenter = (-D / 2 + 0.16 + staffZ) / 2;
  addBox(g, W - 0.4, 0.012, staffDepth, m.staff, -0.15, 0.008, staffCenter, {
    name: 'staff-floor', cast: false,
  });

  const deckT = 0.14;
  const overhangX = 2.8;
  const overhangZ = 2.4;
  const deckW = W + overhangX;
  const deckD = D + overhangZ;
  const deckX = overhangX / 2;
  const deckZ = overhangZ / 2;
  const soffit = toon(s.ceilingColor, { emissive: 0xf4ecdf, emissiveIntensity: 0.32 });
  addBox(g, deckW, deckT, deckD, soffit, deckX, H - deckT / 2, deckZ, { cast: false, name: 'roof-deck' });
  addBox(g, 0.14, 0.32, deckD, m.woodDark, deckX + deckW / 2 - 0.07, H - 0.24, deckZ, { cast: false, name: 'roof-fascia-x' });
  addBox(g, deckW, 0.32, 0.14, m.woodDark, deckX, H - 0.24, deckZ + deckD / 2 - 0.07, { cast: false, name: 'roof-fascia-z' });
  for (const z of [2.2, -0.15, -2.5]) {
    addBox(g, W - 1.2, 0.045, 0.07, m.wood, -0.2, H - deckT - 0.035, z, { cast: false });
  }

  const clerestoryY = H - 0.72;
  for (let i = 0; i < 5; i++) {
    const x = -3.4 + i * 1.55;
    addBox(g, 1.15, 0.42, 0.04, m.glass, x, clerestoryY, -D / 2 + 0.12, { cast: false });
    addBox(g, 1.22, 0.05, 0.05, m.wood, x, clerestoryY + 0.24, -D / 2 + 0.13, { cast: false });
    addBox(g, 1.22, 0.05, 0.05, m.wood, x, clerestoryY - 0.24, -D / 2 + 0.13, { cast: false });
  }
  return g;
}

function addStool(g, spec, m) {
  const grp = new THREE.Group();
  grp.name = spec.id;
  const seat = 0.64;
  addBox(grp, 0.36, 0.045, 0.34, m.wood, 0, seat, 0.01);
  addBox(grp, 0.32, 0.16, 0.028, m.woodDark, 0, seat + 0.08, -0.15);
  for (const [x, z] of [[-0.13, -0.1], [0.13, -0.1], [-0.13, 0.12], [0.13, 0.12]]) {
    addCyl(grp, 0.02, 0.022, seat - 0.02, m.steel, x, (seat - 0.02) / 2, z, 8);
  }
  addCyl(grp, 0.012, 0.012, 0.3, m.steel, 0, 0.28, 0.01, 8, { rotZ: Math.PI / 2 });
  grp.position.set(spec.x, 0, spec.z);
  g.add(grp);
}

function addWaitBench(g, spec, m) {
  const grp = new THREE.Group();
  grp.name = 'wait-bench';
  const y = 0.44;
  for (let i = 0; i < 3; i++) {
    addBox(grp, spec.length, 0.028, 0.08, m.wood, 0, y + i * 0.012, -0.1 + i * 0.1);
  }
  for (const x of [-spec.length / 2 + 0.12, spec.length / 2 - 0.12]) {
    addBox(grp, 0.06, y, 0.32, m.woodDark, x, y / 2, 0);
  }
  grp.position.set(spec.x, 0, spec.z);
  g.add(grp);
}

function addTerminal(g, spec, m) {
  const grp = new THREE.Group();
  grp.name = spec.id;
  addBox(grp, 0.22, 0.05, 0.16, m.top, 0, 0.03, 0);
  addBox(grp, 0.16, 0.018, 0.1, m.ink, 0, 0.06, 0.015);
  for (let row = 0; row < 2; row++) {
    for (let col = 0; col < 3; col++) {
      addBox(grp, 0.02, 0.008, 0.018, m.brass, -0.045 + col * 0.045, 0.074, -0.005 + row * 0.038, { cast: false });
    }
  }
  addBox(grp, 0.028, 0.07, 0.028, m.steel, 0, 0.1, -0.02);
  const screen = new THREE.Group();
  addBox(screen, 0.18, 0.125, 0.02, m.ink, 0, 0, 0);
  addBox(screen, 0.145, 0.092, 0.008, toon('#d7f0e4', { emissive: 0xd7f0e4, emissiveIntensity: 0.7 }), 0, 0.004, -0.012, { cast: false });
  screen.position.set(0, 0.2, -0.015);
  screen.rotation.x = -0.42;
  grp.add(screen);
  grp.position.set(spec.x, spec.y, spec.z);
  g.add(grp);
}

function addMailSack(g, x, z, m, tint) {
  addBox(g, 0.46, 0.38, 0.36, m.canvas, x, 0.2, z, { name: 'mail-sack' });
  addBox(g, 0.22, 0.1, 0.16, m.canvas, x, 0.4, z);
  addBox(g, 0.2, 0.016, 0.14, toon(tint), x, 0.32, z + 0.12, { cast: false });
}

function addCounter(g, layout, m) {
  const c = layout.build.counter;
  const grp = new THREE.Group();
  grp.name = 'counter';
  const cx = (c.x0 + c.x1) / 2;
  const span = c.x1 - c.x0;
  addBox(grp, span, c.top - 0.12, c.depth, m.wood, cx, (c.top - 0.12) / 2, c.z);
  addBox(grp, span + 0.04, 0.06, c.topDepth, m.top, cx, c.top - 0.03, c.z);
  addBox(grp, span, 0.035, 0.025, m.brass, cx, c.top + 0.012, c.z + c.topDepth / 2);
  addBox(grp, span, 0.1, 0.04, m.woodDark, cx, 0.08, c.z + c.depth / 2 - 0.02);

  const clerks = layout.build.clerks;
  clerks.forEach((clerk, n) => {
    const x = clerk.x;
    addBox(grp, 0.86, 0.5, 0.025, m.glass, x, 1.4, c.z + c.depth / 2 + 0.02, { cast: false, name: `window-${n}` });
    addBox(grp, 0.92, 0.03, 0.03, m.brass, x, 1.66, c.z + c.depth / 2 + 0.03, { cast: false });
    addBox(grp, 0.92, 0.03, 0.03, m.brass, x, 1.14, c.z + c.depth / 2 + 0.03, { cast: false });
    addBox(grp, 0.03, 0.52, 0.03, m.brass, x - 0.44, 1.4, c.z + c.depth / 2 + 0.03, { cast: false });
    addBox(grp, 0.03, 0.52, 0.03, m.brass, x + 0.44, 1.4, c.z + c.depth / 2 + 0.03, { cast: false });
    addBox(grp, 0.62, 0.045, 0.04, m.slot, x, 1.085, c.z + c.topDepth / 2 + 0.01, { name: `pass-${n}` });
    const num = plaque(grp, 0.28, 0.16, ['A', 'B', 'C'][n], x, 1.82, c.z + 0.28, 0, '#1e3a40', '#f4efe4', { tw: 64, th: 64, px: 36 });
    num.name = `wicket-${n}`;
  });

  addBox(grp, span, 0.16, 0.08, m.band, cx, 2.02, c.z + 0.22, { cast: false });
  plaque(grp, span * 0.62, 0.22, 'CEDAR LANE', cx, 2.28, c.z + 0.24, 0, '#f4ecdf', '#4e3424', { px: 36, name: 'wordmark' });
  plaque(grp, 0.7, 0.18, 'POST', cx + span * 0.36, 2.02, c.z + 0.28, 0, '#8d2e2a', '#f6f1e8', { px: 28, tw: 128, th: 64 });

  const board = plaque(grp, 1.15, 0.28, '04    05    —', cx, 2.58, c.z + 0.2, 0, '#142226', '#f2e6c4', {
    px: 26, tw: 256, th: 64, name: 'now-serving',
  });
  board.position.z = c.z + 0.2;
  g.add(grp);
  return grp;
}

function addBoundary(g, layout, m) {
  const c = layout.build.counter;
  const door = layout.build.staffDoor;
  const { width: W } = layout.meta.room;
  const left = -W / 2 + 0.12;
  const z = c.z;
  addBox(g, door.x0 - left, 2.15, 0.08, m.wood, (left + door.x0) / 2, 1.075, z, { name: 'pier-left' });
  addBox(g, c.x0 - door.x1, 2.15, 0.08, m.wood, (door.x1 + c.x0) / 2, 1.075, z);
  const dx = (door.x0 + door.x1) / 2;
  addBox(g, door.x1 - door.x0 - 0.06, 2.02, 0.05, m.woodDark, dx, 1.02, z + 0.02, { name: 'staff-door' });
  addBox(g, 0.28, 0.42, 0.02, m.glass, dx, 1.45, z + 0.05, { cast: false });
  plaque(g, 0.42, 0.12, 'STAFF', dx, 1.72, z + 0.06, 0, '#1e3a40', '#f4efe4', { tw: 128, th: 48, px: 22 });
  addCyl(g, 0.02, 0.02, 0.04, m.brass, dx + 0.28, 1.0, z + 0.06, 8);
  addBox(g, 0.9, 1.05, 0.08, m.wood, c.x1 + 0.48, 0.54, z, { name: 'parcel-return' });
  addBox(g, c.x1 - left + 0.2, 0.012, 0.06, m.brass, (left + c.x1) / 2, 0.018, z, { cast: false, name: 'threshold' });
}

function addPoBoxes(g, layout, m) {
  const b = layout.build.boxes;
  const grp = new THREE.Group();
  grp.name = 'po-boxes';
  const [dw, dh] = b.door;
  const span = b.cols * dw + (b.cols - 1) * b.gap;
  const zc = b.z0 + span / 2;
  const xc = b.x + b.depth / 2;
  addBox(grp, b.depth, 1.85, span + 0.12, m.ink, xc, 0.98, zc);
  addBox(grp, 0.03, 1.7, span + 0.02, m.brass, b.x + b.depth - 0.01, 1.05, zc, { cast: false });
  for (let col = 0; col < b.cols; col++) {
    for (let row = 0; row < b.rows; row++) {
      const z = b.z0 + dw / 2 + col * (dw + b.gap);
      const y = b.y0 + dh / 2 + row * (dh + b.gap);
      addBox(grp, 0.02, dh - 0.012, dw - 0.01, m.top, b.x + b.depth + 0.012, y, z, { cast: false });
      addCyl(grp, 0.008, 0.008, 0.016, m.brass, b.x + b.depth + 0.028, y, z + dw * 0.28, 6, { rotZ: Math.PI / 2, cast: false });
      if (row === 0) {
        const n = col + 1;
        plaque(grp, dw - 0.03, 0.04, String(100 + n), b.x + b.depth + 0.034, y - dh * 0.22, z, Math.PI / 2, '#efe6d4', '#1e3a40', {
          tw: 64, th: 32, px: 16, depth: 0.006,
        });
      }
    }
  }
  const lockZ0 = b.z0 + span + 0.18;
  for (let i = 0; i < 3; i++) {
    const z = lockZ0 + 0.22 + i * 0.42;
    addBox(grp, b.depth, 1.35, 0.4, m.ink, xc, 0.78, z);
    addBox(grp, 0.02, 0.48, 0.32, m.top, b.x + b.depth + 0.012, 0.48, z, { cast: false });
    addBox(grp, 0.02, 0.48, 0.32, m.top, b.x + b.depth + 0.012, 1.08, z, { cast: false });
    plaque(grp, 0.16, 0.06, `P${i + 1}`, b.x + b.depth + 0.036, 1.28, z, Math.PI / 2, '#1e3a40', '#f4efe4', { tw: 64, th: 32, px: 16, depth: 0.006 });
  }
  plaque(grp, 0.62, 0.14, 'BOXES', b.x + b.depth + 0.04, 1.78, zc, Math.PI / 2, '#6a4630', '#f6f1e8', { px: 22, tw: 128, th: 48, depth: 0.012 });
  g.add(grp);
}

function addPigeonholes(g, layout, m) {
  const p = layout.build.pigeon;
  const grp = new THREE.Group();
  grp.name = 'pigeonholes';
  const [cw, ch, cd] = p.cell;
  const span = p.cols * cw + (p.cols - 1) * p.gap;
  const stack = p.rows * ch + (p.rows - 1) * p.gap;
  const xMid = p.x0 + span / 2;
  addBox(grp, span + 0.08, 0.06, cd + 0.08, m.wood, xMid, p.y0 - 0.04, p.z, { name: 'sort-ledge' });
  addBox(grp, span + 0.1, stack + 0.08, 0.025, m.woodDark, xMid, p.y0 + stack / 2, p.z - cd / 2);
  for (let col = 0; col < p.cols; col++) {
    const x = p.x0 + cw / 2 + col * (cw + p.gap);
    for (let row = 0; row < p.rows; row++) {
      const y = p.y0 + ch / 2 + row * (ch + p.gap);
      addBox(grp, cw - 0.01, ch - 0.01, cd - 0.02, m.paper, x, y, p.z + 0.01, { cast: false });
      const n = col * 3 + row;
      if (n % 3 !== 0) {
        const color = toon(MAIL[n % MAIL.length]);
        const slipH = ch * 0.72;
        addBox(grp, cw * 0.72, slipH, 0.012, color, x, y - ch * 0.02, p.z + cd * 0.58);
      }
    }
    if (col % 4 === 0) {
      plaque(grp, cw * 0.9, 0.045, `R${col / 4 + 1}`, x, p.y0 - 0.085, p.z + cd * 0.2, 0, '#1e3a40', '#f4efe4', {
        tw: 64, th: 32, px: 16,
      });
    }
  }
  for (let i = 0; i <= p.cols; i++) {
    const x = p.x0 + i * (cw + p.gap) - p.gap / 2;
    addBox(grp, 0.012, stack, cd, m.wood, x, p.y0 + stack / 2, p.z);
  }
  for (let r = 0; r <= p.rows; r++) {
    const y = p.y0 + r * (ch + p.gap) - p.gap / 2;
    addBox(grp, span, 0.012, cd, m.wood, xMid, y, p.z);
  }
  const binY = 0.42;
  for (let i = 0; i < 4; i++) {
    const x = p.x0 + 0.34 + i * 0.66;
    addBox(grp, 0.58, 0.5, cd, m.wood, x, binY, p.z);
    addBox(grp, 0.5, 0.08, cd - 0.06, toon(MAIL[i]), x, 0.28, p.z + 0.01, { cast: false, receive: false });
    addBox(grp, 0.46, 0.045, 0.12, toon(MAIL[(i + 3) % MAIL.length]), x, 0.6, p.z + cd * 0.32, { cast: false, receive: false });
  }
  g.add(grp);
}

function addTrolley(g, spec, m, kind) {
  const grp = new THREE.Group();
  grp.name = spec.id;
  const bedY = 0.42;
  addBox(grp, 0.58, 0.05, 0.86, m.steel, 0, bedY, 0);
  addBox(grp, 0.04, 0.48, 0.86, m.steel, -0.27, bedY + 0.26, 0);
  addBox(grp, 0.04, 0.48, 0.86, m.steel, 0.27, bedY + 0.26, 0);
  addBox(grp, 0.58, 0.48, 0.04, m.steel, 0, bedY + 0.26, -0.41);
  addBox(grp, 0.58, 0.48, 0.04, kind === 'wire' ? m.steel : m.canvas, 0, bedY + 0.22, 0.41);
  if (kind === 'canvas') {
    addBox(grp, 0.5, 0.36, 0.78, m.canvas, 0, bedY + 0.2, 0);
    addBox(grp, 0.22, 0.16, 0.28, m.kraft, -0.1, bedY + 0.46, 0.05);
    addBox(grp, 0.16, 0.12, 0.2, toon('#d7d0c2'), 0.12, bedY + 0.44, -0.12);
  } else {
    for (let i = 0; i < 3; i++) {
      addBox(grp, 0.5, 0.012, 0.78, m.steel, 0, bedY + 0.12 + i * 0.12, 0, { cast: false });
    }
    addBox(grp, 0.28, 0.18, 0.32, m.kraft, 0, bedY + 0.16, 0.08);
    addBox(grp, 0.2, 0.14, 0.22, toon('#8d2e2a'), -0.08, bedY + 0.3, -0.1);
  }
  addBox(grp, 0.04, 0.42, 0.04, m.steel, -0.22, 0.92, 0.4);
  addBox(grp, 0.04, 0.42, 0.04, m.steel, 0.22, 0.92, 0.4);
  addCyl(grp, 0.016, 0.016, 0.52, m.rubber, 0, 1.08, 0.4, 8, { rotZ: Math.PI / 2 });
  for (const [x, z] of [[-0.22, -0.32], [0.22, -0.32], [-0.22, 0.32], [0.22, 0.32]]) {
    addCyl(grp, 0.07, 0.07, 0.04, m.rubber, x, 0.07, z, 12, { rotZ: Math.PI / 2 });
  }
  grp.position.set(spec.x, 0, spec.z);
  grp.rotation.y = spec.rotY || 0;
  g.add(grp);
}

function addScale(g, layout, m) {
  const s = layout.build.scale;
  const [w, h, d] = s.platform;
  const grp = new THREE.Group();
  grp.name = 'parcel-scale';
  addBox(grp, w + 0.08, 0.04, d + 0.08, m.steel, 0, 0.02, 0);
  addBox(grp, w, h, d, m.top, 0, 0.04 + h / 2, 0, { name: 'scale-platform' });
  addBox(grp, 0.06, 0.86, 0.06, m.steel, w * 0.28, 0.52, -d * 0.15);
  addBox(grp, 0.22, 0.14, 0.05, m.ink, w * 0.28, 0.98, -d * 0.12);
  plaque(grp, 0.18, 0.08, '2.4 kg', w * 0.28, 0.98, -d * 0.08, 0, '#142226', '#d6f0c8', {
    tw: 96, th: 40, px: 18, name: 'scale-readout',
  });
  addBox(grp, 0.26, 0.18, 0.32, m.kraft, -0.04, 0.04 + h + 0.09, 0.02, { name: 'scale-parcel' });
  addBox(grp, 0.26, 0.025, 0.03, m.brass, -0.04, 0.04 + h + 0.19, 0.02, { cast: false });
  grp.position.set(s.x, 0, s.z);
  g.add(grp);
}

function addQueue(g, layout, m) {
  const q = layout.build.queue;
  const grp = new THREE.Group();
  grp.name = 'queue';
  const xs = [q.x0, q.x1];
  const posts = [];
  for (const x of xs) {
    for (const z of q.zPosts) posts.push([x, z]);
  }
  for (const [x, z] of posts) {
    addCyl(grp, 0.045, 0.05, 0.025, m.brass, x, 0.02, z, 10);
    addCyl(grp, 0.018, 0.018, 0.94, m.steel, x, 0.5, z, 8);
    addCyl(grp, 0.04, 0.04, 0.04, m.brass, x, 0.96, z, 10);
  }
  const y = 0.86;
  const belt = (x, z, w, d) => addBox(grp, w, 0.012, d, m.ink, x, y, z, { cast: false });
  for (let i = 0; i < q.zPosts.length - 1; i++) {
    const z0 = q.zPosts[i];
    const z1 = q.zPosts[i + 1];
    const zc = (z0 + z1) / 2;
    const len = z1 - z0;
    belt(q.x0, zc, 0.012, len);
    belt(q.x1, zc, 0.012, len);
  }
  const back = q.zPosts[q.zPosts.length - 1];
  belt((q.x0 + q.x1) / 2, back, q.x1 - q.x0, 0.012);
  plaque(grp, 0.42, 0.16, 'WAIT HERE', (q.x0 + q.x1) / 2, 0.62, q.zPosts[0] - 0.22, 0, '#243f46', '#f4efe4', {
    tw: 192, th: 64, px: 22, name: 'wait-mark',
  });
  addCyl(grp, 0.16, 0.18, 0.9, m.ink, q.x0 - 0.7, 0.45, q.zPosts[1], 12, { name: 'ticket-stand' });
  plaque(grp, 0.22, 0.16, 'TAKE\nA NO.', q.x0 - 0.7, 0.98, q.zPosts[1] + 0.02, 0, '#8d2e2a', '#f6f1e8', {
    tw: 96, th: 80, px: 18,
  });
  g.add(grp);
}

function addPacking(g, layout, m) {
  const p = layout.build.packing;
  const grp = new THREE.Group();
  grp.name = 'packing';
  addBox(grp, 0.22, 0.14, 0.28, m.kraft, p.x - 0.35, 0.84, p.z + 0.05);
  addBox(grp, 0.16, 0.1, 0.18, toon('#d7d0c2'), p.x - 0.05, 0.82, p.z - 0.12);
  addCyl(grp, 0.045, 0.045, 0.07, m.brass, p.x + 0.28, 0.8, p.z + 0.16, 12);
  addBox(grp, 0.12, 0.02, 0.16, m.ink, p.x + 0.42, 0.77, p.z - 0.08, { name: 'stamp-pad' });
  addBox(grp, 0.08, 0.06, 0.08, m.woodDark, p.x + 0.28, 0.8, p.z - 0.18, { name: 'date-stamp' });
  for (let i = 0; i < 4; i++) {
    addBox(grp, 0.16, 0.004, 0.11, toon(MAIL[i]), p.x - 0.55, 0.768 + i * 0.006, p.z + 0.22, { cast: false });
  }
  g.add(grp);
}

function addLobbyFit(g, layout, m) {
  const { depth: D, width: W, height: H } = layout.meta.room;
  const s = layout.shell;
  plaque(g, 0.62, 0.46, 'HOURS\nMON–FRI 9–5\nSAT 9–1', -W / 2 + 0.2, 1.72, 4.35, Math.PI / 2, '#f4ecdf', '#4e3424', {
    tw: 160, th: 128, px: 22, name: 'hours',
  });
  addBox(g, 0.28, 0.36, 0.16, m.ink, -W / 2 + 0.22, 0.7, 3.72, { name: 'drop-box' });
  addBox(g, 0.16, 0.035, 0.04, m.slot, -W / 2 + 0.34, 0.9, 3.72);
  plaque(g, 0.2, 0.08, 'DROP', -W / 2 + 0.36, 0.78, 3.72, Math.PI / 2, '#c6a15a', '#2a2420', { tw: 96, th: 40, px: 16 });

  const clock = new THREE.Group();
  clock.name = 'clock';
  addCyl(clock, 0.2, 0.2, 0.04, m.brass, 0, 0, 0, 20, { rotX: Math.PI / 2 });
  addCyl(clock, 0.16, 0.16, 0.02, m.paper, 0, 0, 0.02, 20, { rotX: Math.PI / 2, cast: false });
  addBox(clock, 0.01, 0.09, 0.008, m.ink, 0, 0.03, 0.04, { cast: false });
  addBox(clock, 0.06, 0.01, 0.008, m.ink, 0.025, 0, 0.04, { cast: false });
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    addBox(clock, 0.01, i % 3 === 0 ? 0.03 : 0.016, 0.006, m.ink, Math.sin(a) * 0.125, Math.cos(a) * 0.125, 0.035, { cast: false });
  }
  clock.position.set(-1.2, 2.22, -5.28);
  g.add(clock);

  addBox(g, 0.22, 0.18, 0.2, m.leaf, -5.55, 0.4, 4.72, { name: 'entry-plant' });
  addBox(g, 0.14, 0.14, 0.14, m.leaf, -5.42, 0.52, 4.64);

  const q = layout.build.queue;
  addBox(g, q.x1 - q.x0 - 0.12, 0.008, q.zPosts[2] - q.zPosts[0] - 0.2, m.runner,
    (q.x0 + q.x1) / 2, 0.012, (q.zPosts[0] + q.zPosts[2]) / 2, { cast: false, name: 'queue-runner' });

  addBox(g, 1.4, 0.06, 0.1, toon(s.ceilingColor, { emissive: 0xfff6e4, emissiveIntensity: 0.55 }),
    -0.7, H - 0.42, -3.5, { cast: false, name: 'sort-lamp' });
  addBox(g, 1.1, 0.06, 0.1, toon(s.ceilingColor, { emissive: 0xfff6e4, emissiveIntensity: 0.55 }),
    2.4, H - 0.42, -4.15, { cast: false, name: 'pack-lamp-bar' });
}

function makeProcedural(layout) {
  const g = new THREE.Group();
  g.name = 'procedural';
  const m = mats(layout.shell);
  addCounter(g, layout, m);
  addBoundary(g, layout, m);
  addPoBoxes(g, layout, m);
  addPigeonholes(g, layout, m);
  addTrolley(g, layout.build.trolleys[0], m, 'canvas');
  addTrolley(g, layout.build.trolleys[1], m, 'wire');
  addScale(g, layout, m);
  addQueue(g, layout, m);
  addPacking(g, layout, m);
  addLobbyFit(g, layout, m);
  for (const clerk of layout.build.clerks) addStool(g, clerk, m);
  addWaitBench(g, layout.build.waitBench, m);
  for (const term of layout.build.terminals) addTerminal(g, term, m);
  addMailSack(g, -1.55, -2.35, m, MAIL[0]);
  addMailSack(g, 0.15, -2.85, m, MAIL[1]);
  return g;
}

boot({
  makeShell,
  makeProcedural,
  readyText: 'ready — Cedar Lane post office · drag orbit · U unlit · T toon',
});
