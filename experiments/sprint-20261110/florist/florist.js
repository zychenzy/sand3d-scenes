import * as THREE from 'three';
import { boot, toon, addBox, addCyl, contact, canvasTexture } from './scene_lib.js';
import { tierSurfaces, tierCenterZ, surfaceY } from './placement.js';
import { addArrangement, addSprig } from './botanicals.js';

const WOOD = '#a87548';
const WOOD_D = '#6b452c';
const PLASTER = '#f4efe6';
const GREEN = '#2c4a3c';
const GREEN_D = '#1c332a';
const BRASS = '#b08d4a';
const KRAFT = '#c6a36a';

function tileTexture() {
  return canvasTexture((g, w, h) => {
    g.fillStyle = '#e4d5c2';
    g.fillRect(0, 0, w, h);
    const n = 4;
    const tw = w / n;
    const th = h / n;
    for (let y = 0; y < n; y++) {
      for (let x = 0; x < n; x++) {
        const shift = ((x * 3 + y * 5) % 7) - 3;
        g.fillStyle = `rgb(${214 + shift}, ${198 + shift}, ${176 + shift})`;
        g.fillRect(x * tw + 3, y * th + 3, tw - 6, th - 6);
      }
    }
  }, 512, 512);
}

function woodTexture() {
  return canvasTexture((g, w, h) => {
    g.fillStyle = '#c4925c';
    g.fillRect(0, 0, w, h);
    g.strokeStyle = '#8d5e36';
    for (let y = 16; y < h; y += 28) {
      g.lineWidth = 3;
      g.beginPath();
      g.moveTo(0, y);
      g.lineTo(w, y + 2);
      g.stroke();
      g.strokeStyle = y % 56 === 16 ? '#d7b48a' : '#a87442';
      g.lineWidth = 1;
      g.beginPath();
      g.moveTo(0, y + 8);
      g.bezierCurveTo(w * 0.3, y + 4, w * 0.6, y + 14, w, y + 6);
      g.stroke();
    }
  }, 256, 256);
}

function signTexture() {
  return canvasTexture((g, w, h) => {
    g.fillStyle = '#1c332a';
    g.fillRect(0, 0, w, h);
    g.strokeStyle = '#b08d4a';
    g.lineWidth = 10;
    g.strokeRect(16, 16, w - 32, h - 32);
    g.fillStyle = '#f6f1e6';
    g.font = '600 168px "Liberation Serif"';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText('BLOOM', w / 2, h * 0.46);
    g.font = '500 42px Inter';
    g.fillStyle = '#d7c39a';
    g.fillText('F L O R I S T', w / 2, h * 0.78);
  }, 1024, 320);
}

function boardTexture() {
  return canvasTexture((g, w, h) => {
    g.fillStyle = '#24382e';
    g.fillRect(0, 0, w, h);
    g.fillStyle = '#f3ecdf';
    g.font = '600 54px "Liberation Serif"';
    g.textAlign = 'left';
    g.fillText('Today', 36, 70);
    g.font = '500 32px "Liberation Mono"';
    const rows = [
      ['garden rose', '18'],
      ['white lily', '16'],
      ['peony', '22'],
      ['tulip', '14'],
      ['sunflower', '12'],
      ['wrapped', '36'],
    ];
    rows.forEach((r, i) => {
      const y = 140 + i * 52;
      g.fillStyle = i % 2 ? '#e7f0e4' : '#f7f3ea';
      g.fillText(r[0], 36, y);
      g.textAlign = 'right';
      g.fillText(r[1], w - 36, y);
      g.textAlign = 'left';
    });
  }, 512, 640);
}

function aframeTexture() {
  return canvasTexture((g, w, h) => {
    g.fillStyle = '#f7f3ea';
    g.fillRect(0, 0, w, h);
    g.fillStyle = '#1c332a';
    g.fillRect(0, 0, w, 70);
    g.fillStyle = '#f7f3ea';
    g.font = '600 40px "Liberation Serif"';
    g.textAlign = 'center';
    g.fillText('TODAY', w / 2, 48);
    g.fillStyle = '#2c4a3c';
    g.font = '500 36px "Liberation Serif"';
    ['roses', 'lilies', 'peonies'].forEach((t, i) => g.fillText(t, w / 2, 140 + i * 64));
  }, 400, 400);
}

function floorTiles(repeatX, repeatY) {
  const tex = tileTexture();
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  return tex;
}

function makeShell(layout) {
  const g = new THREE.Group();
  g.name = 'shell';
  const { width: W, depth: D, height: H } = layout.meta.room;
  const sf = layout.architecture.shopfront;
  const plaster = toon(PLASTER);
  const green = toon(GREEN);
  const greenD = toon(GREEN_D);
  const wood = toon(WOOD);
  const woodD = toon(WOOD_D);
  const brass = toon(BRASS);
  const glassMat = toon('#d5eee4', { transparent: true, opacity: 0.22, side: THREE.DoubleSide, depthWrite: false });
  const sheenMat = toon('#f7fffb', { transparent: true, opacity: 0.14, side: THREE.DoubleSide, depthWrite: false });
  const ceilMat = toon('#f6f1e8', { emissive: '#f3ecdf', emissiveIntensity: 0.42 });

  const floorMat = toon('#e4d5c2', { map: floorTiles(W / 3, D / 3) });
  const floor = new THREE.Mesh(new THREE.BoxGeometry(W, 0.08, D), floorMat);
  floor.position.y = -0.04;
  floor.receiveShadow = true;
  floor.userData.noCast = true;
  g.add(floor);

  const back = addBox(g, W, H, 0.12, plaster, 0, H / 2, -D / 2);
  back.userData.noCast = true;
  const left = addBox(g, 0.12, H, D, plaster, -W / 2, H / 2, 0);
  left.userData.noCast = true;
  addBox(g, 0.12, H, 1.35, plaster, W / 2, H / 2, -D / 2 + 0.68);

  addBox(g, W - 0.2, 0.96, 0.06, green, 0, 0.48, -D / 2 + 0.09);
  addBox(g, 0.06, 0.96, D - 0.3, green, -W / 2 + 0.09, 0.48, -0.05);
  addBox(g, W - 0.2, 0.04, 0.08, woodD, 0, 0.98, -D / 2 + 0.1);
  addBox(g, 0.08, 0.04, D - 0.3, woodD, -W / 2 + 0.1, 0.98, -0.05);
  addBox(g, W - 0.15, 0.1, 0.08, woodD, 0, 0.05, -D / 2 + 0.08);
  addBox(g, 0.08, 0.1, D - 0.2, woodD, -W / 2 + 0.08, 0.05, 0);

  const ceil = new THREE.Mesh(new THREE.BoxGeometry(W * 0.78, 0.06, D * 0.52), ceilMat);
  ceil.position.set(-0.35, H - 0.04, -D * 0.22);
  ceil.userData.noCast = true;
  g.add(ceil);
  addBox(g, 0.08, 0.1, D * 0.52, woodD, W * 0.39 - 0.5, H - 0.1, -D * 0.22);
  addBox(g, 2.6, 0.08, 0.14, woodD, 0.55, H - 0.1, 0.42);

  buildShopfront(g, layout, { glassMat, sheenMat, green, greenD, wood, woodD, brass, plaster });
  buildDisplay(g, layout);
  return g;
}

function buildShopfront(g, layout, mats) {
  const { height: H } = layout.meta.room;
  const sf = layout.architecture.shopfront;
  const z = sf.z;
  const x0 = sf.x0;
  const x1 = sf.x1;
  const [d0, d1] = sf.door;
  const span = x1 - x0;
  const mid = (x0 + x1) / 2;
  const { glassMat, sheenMat, green, greenD, wood, woodD, brass, plaster } = mats;

  const stall = (a, b) => {
    if (b - a < 0.08) return;
    const cx = (a + b) / 2;
    const w = b - a;
    addBox(g, w, 0.48, 0.1, green, cx, 0.24, z);
    addBox(g, w, 0.05, 0.14, woodD, cx, 0.5, z + 0.01);
  };
  stall(x0 + 0.06, d0 - 0.02);
  stall(d1 + 0.02, x1 - 0.06);
  addBox(g, 0.1, H, 0.16, greenD, x0, H / 2, z);
  addBox(g, 0.14, H, 0.2, greenD, x1, H / 2, z);
  addBox(g, span, 0.42, 0.1, wood, mid, 2.5, z);
  addBox(g, span, 0.28, 0.12, greenD, mid, H - 0.16, z);

  const panes = [
    [x0 + 0.12, d0 - 0.06],
    [d1 + 0.06, x1 - 0.12],
  ];
  for (const [a, b] of panes) {
    const w = b - a;
    const cx = (a + b) / 2;
    const pane = addBox(g, w, 1.68, 0.03, glassMat, cx, 1.36, z + 0.02);
    pane.userData.noCast = true;
    const sheen = addBox(g, w * 0.7, 0.08, 0.015, sheenMat, cx - w * 0.05, 1.85, z + 0.035);
    sheen.userData.noCast = true;
    const mullions = 3;
    for (let i = 1; i < mullions; i++) {
      addBox(g, 0.045, 1.68, 0.06, woodD, a + (w * i) / mullions, 1.36, z);
    }
  }

  const doorW = d1 - d0;
  const doorCx = (d0 + d1) / 2;
  const hingeX = d0;
  const door = new THREE.Group();
  door.position.set(hingeX, 0, z);
  door.rotation.y = -0.42;
  const panel = addBox(door, doorW, 2.12, 0.045, wood, doorW / 2, 1.06, 0);
  panel.userData.noCast = true;
  const dg = addBox(door, doorW * 0.72, 1.35, 0.02, glassMat, doorW / 2, 1.25, 0.02);
  dg.userData.noCast = true;
  addBox(door, 0.035, 0.28, 0.04, brass, doorW * 0.82, 1.05, 0.04);
  addBox(door, doorW * 0.8, 0.08, 0.02, brass, doorW / 2, 0.18, 0.03);
  g.add(door);
  addBox(g, 0.06, 2.16, 0.08, woodD, d0 - 0.02, 1.08, z);
  addBox(g, 0.06, 2.16, 0.08, woodD, d1 + 0.02, 1.08, z);
  addBox(g, doorW + 0.12, 0.08, 0.1, woodD, doorCx, 2.18, z);
  addBox(g, doorW, 0.025, 0.16, brass, doorCx, 0.015, z + 0.06);

  const signMat = labelMat(signTexture(), THREE.FrontSide);
  const signX = (x0 + d0) / 2;
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(1.85, 0.46), signMat);
  sign.position.set(signX, 1.72, z + 0.055);
  sign.userData.noCast = true;
  g.add(sign);
  const signIn = new THREE.Mesh(new THREE.PlaneGeometry(1.85, 0.46), signMat);
  signIn.position.set(signX, 1.72, z - 0.06);
  signIn.rotation.y = Math.PI;
  signIn.userData.noCast = true;
  g.add(signIn);

  const awning = new THREE.Group();
  awning.position.set(mid, 2.72, z + 0.04);
  awning.rotation.x = 0.42;
  const stripes = 11;
  const stripeW = (span - 0.2) / stripes;
  for (let i = 0; i < stripes; i++) {
    const mat = i % 2 ? toon('#f3efe4') : toon('#3f6b50');
    addBox(awning, stripeW * 0.96, 0.02, 0.78, mat, -span / 2 + 0.15 + stripeW * (i + 0.5), 0, 0.39);
  }
  g.add(awning);
  addBox(g, span, 0.06, 0.08, woodD, mid, 2.74, z + 0.02);

  const walk = addBox(g, span + 0.4, 0.06, 0.95, toon('#c9c5bc'), mid, -0.02, z + 0.55);
  walk.userData.noCast = true;
  addBox(g, span + 0.4, 0.08, 0.06, toon('#b7b2a8'), mid, -0.04, z + 1.0);

  const board = new THREE.Group();
  board.position.set(x1 - 0.55, 0, z + 0.72);
  addBox(board, 0.46, 0.62, 0.02, labelMat(aframeTexture()), 0, 0.48, 0.12);
  board.children[board.children.length - 1].rotation.x = -0.18;
  addBox(board, 0.46, 0.62, 0.02, toon('#e7e1d4'), 0, 0.48, -0.12);
  board.children[board.children.length - 1].rotation.x = 0.18;
  g.add(board);

  const hours = canvasTexture((ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(28,51,42,0.82)';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#f6f1e6';
    ctx.font = '600 36px Inter';
    ctx.textAlign = 'center';
    ctx.fillText('open', w / 2, 48);
    ctx.font = '500 28px Inter';
    ctx.fillText('tue – sun', w / 2, 92);
  }, 320, 140);
  const hoursMat = labelMat(hours);
  hoursMat.transparent = true;
  hoursMat.opacity = 0.94;
  const hoursMesh = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.2), hoursMat);
  hoursMesh.position.set(x0 + 0.55, 1.15, z + 0.04);
  hoursMesh.userData.noCast = true;
  g.add(hoursMesh);

  const boardMesh = new THREE.Mesh(new THREE.PlaneGeometry(0.95, 1.15), labelMat(boardTexture()));
  boardMesh.position.set(-1.55, 1.85, -layout.meta.room.depth / 2 + 0.1);
  boardMesh.userData.noCast = true;
  g.add(boardMesh);
  addBox(g, 1.02, 0.04, 0.04, woodD, -1.55, 2.44, -layout.meta.room.depth / 2 + 0.1);
  addBox(g, 1.02, 0.04, 0.04, woodD, -1.55, 1.26, -layout.meta.room.depth / 2 + 0.1);
}

function buildDisplay(g, layout) {
  const spec = layout.architecture.display;
  const group = new THREE.Group();
  group.name = 'tiered-display';
  group.position.set(spec.position[0], spec.position[1], spec.position[2]);
  group.rotation.y = spec.rotationY;
  const woodMap = woodTexture();
  woodMap.wrapS = THREE.RepeatWrapping;
  woodMap.wrapT = THREE.RepeatWrapping;
  const plank = toon(WOOD, { map: woodMap });
  const edge = toon(WOOD_D);
  const tops = tierSurfaces(spec.tiers);
  spec.tiers.forEach((t, i) => {
    const cz = tierCenterZ(spec.tiers, i);
    const y = tops[i] - t.h / 2;
    addBox(group, t.w, t.h, t.d, plank, 0, y, cz);
    addBox(group, t.w + 0.04, 0.035, t.d + 0.04, edge, 0, tops[i] - 0.01, cz);
  });
  for (const plant of layout.displayPlants) {
    const top = tops[plant.tier];
    const cz = tierCenterZ(spec.tiers, plant.tier);
    addArrangement(group, {
      ...plant,
      position: [plant.local[0], top, plant.local[1] + cz],
    });
  }
  const card = (x, z, text) => {
    const tex = canvasTexture((ctx, w, h) => {
      ctx.fillStyle = '#f7f3ea';
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#1c332a';
      ctx.font = '600 64px "Liberation Serif"';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(text, w / 2, h / 2);
    }, 256, 160);
    const m = new THREE.Mesh(new THREE.PlaneGeometry(0.12, 0.08), labelMat(tex));
    m.position.set(x, tops[0] + 0.06, z);
    m.rotation.x = -0.4;
    m.userData.noCast = true;
    addCyl(group, 0.006, 0.006, 0.08, toon(BRASS), x, tops[0] + 0.03, z, 6);
    group.add(m);
  };
  card(-0.35, tierCenterZ(spec.tiers, 0) + 0.22, '14');
  card(0.48, tierCenterZ(spec.tiers, 0) + 0.2, '18');
  contact(group, 0, 0.05, 1.15, 0.62);
  g.add(group);
}

function makeProcedural(layout) {
  const g = new THREE.Group();
  g.name = 'procedural';
  const { height: H } = layout.meta.room;

  const runner = addBox(g, 0.95, 0.012, 3.15, toon('#6e8f72'), -1.15, 0.012, 1.15);
  runner.userData.noCast = true;
  const mat = addBox(g, 1.5, 0.012, 1.15, toon('#c4a882'), 1.35, 0.012, -2.25);
  mat.userData.noCast = true;

  for (const plant of layout.botanicals) {
    addArrangement(g, plant);
    if (plant.foot) contact(g, plant.position[0], plant.position[2], plant.foot[0], plant.foot[1]);
  }

  const contacts = {
    wrap_counter: [0.62, 1.75],
    work_table: [0.85, 0.58],
    bench_chair: [0.16, 0.2],
    wrap_stool: [0.22, 0.22],
    window_plinth: [0.32, 0.32],
    house_pot: [0.3, 0.3],
  };
  for (const inst of layout.instances) {
    const foot = contacts[inst.id];
    if (foot) contact(g, inst.position[0], inst.position[2], foot[0], foot[1]);
  }

  addWrapTools(g, layout);
  addBenchClutter(g, layout);
  addPendants(g, layout, H);
  addPegRail(g, layout);
  return g;
}

function labelMat(map, side = THREE.DoubleSide) {
  const m = new THREE.MeshBasicMaterial({ map, side, toneMapped: false });
  m.userData.shade = 'basic';
  return m;
}

function addWrapTools(g, layout) {
  const counter = layout.instances.find((i) => i.id === 'wrap_counter');
  const y = surfaceY(counter, layout.assets.bar_counter);
  const x = counter.position[0];
  const rolls = [
    [x - 0.16, -0.55, '#c6a36a'],
    [x, -0.55, '#f4f1ea'],
    [x + 0.16, -0.55, '#f0cfc8'],
  ];
  for (const [rx, rz, color] of rolls) {
    const roll = addCyl(g, 0.07, 0.07, 0.36, toon(color), rx, y + 0.07, rz, 14);
    roll.rotation.x = Math.PI / 2;
  }
  addBox(g, 0.22, 0.045, 0.16, toon('#f7f4f2'), x + 0.22, y + 0.03, -0.85);
  addBox(g, 0.2, 0.04, 0.15, toon('#f0cfc8'), x + 0.22, y + 0.065, -0.85);
  const shear = toon('#2a2e30');
  addBox(g, 0.11, 0.008, 0.028, shear, x + 0.18, y + 0.02, -0.95);
  addBox(g, 0.11, 0.008, 0.028, shear, x + 0.18, y + 0.028, -0.98);
  addCyl(g, 0.012, 0.012, 0.01, toon(BRASS), x + 0.12, y + 0.03, -0.9, 8);
  addCyl(g, 0.045, 0.045, 0.02, toon('#ded8cc'), x + 0.28, y + 0.03, -0.35, 12);
}

function addBenchClutter(g, layout) {
  const table = layout.instances.find((i) => i.id === 'work_table');
  const y = surfaceY(table, layout.assets.square_table) + 0.005;
  const sheet = addBox(g, 0.34, 0.008, 0.26, toon('#d8c4a0'), 1.35, y, -1.9);
  sheet.rotation.y = 0.15;
  for (let i = 0; i < 5; i++) {
    const stem = addCyl(g, 0.004, 0.004, 0.22, toon('#3e5a32'), 1.22 + i * 0.025, y + 0.012, -1.88, 5);
    stem.rotation.z = Math.PI / 2;
    stem.rotation.y = 0.2 + i * 0.05;
  }
  const shear = toon('#2c3032');
  addBox(g, 0.14, 0.008, 0.03, shear, 1.02, y + 0.015, -1.82);
  addBox(g, 0.14, 0.008, 0.03, shear, 1.02, y + 0.024, -1.85);
  const spool = addCyl(g, 0.035, 0.035, 0.045, toon('#c44868'), 0.86, y + 0.04, -1.95, 12);
  spool.rotation.z = Math.PI / 2;
  addCyl(g, 0.012, 0.012, 0.07, toon('#d9d3c8'), 0.86, y + 0.04, -1.95, 8).rotation.z = Math.PI / 2;

  const bin = layout.botanicals.find((b) => b.id === 'trim_bucket');
  if (!bin) {
    addCyl(g, 0.1, 0.09, 0.16, toon('#b7c0c4'), 0.72, 0.08, -2.95, 12);
    for (let i = 0; i < 6; i++) {
      const s = addCyl(g, 0.004, 0.004, 0.12, toon('#4a6a38'), 0.68 + (i % 3) * 0.03, 0.16, -2.98 + Math.floor(i / 3) * 0.03, 4);
      s.rotation.z = (i - 2) * 0.15;
    }
  }

  for (const inst of layout.instances) {
    if (!inst.sprout) continue;
    const asset = layout.assets[inst.kind];
    const rim = inst.position[1] + asset.targetHeight * (Array.isArray(inst.scale) ? inst.scale[1] : 1) * 0.72;
    addSprig(g, inst.sprout, inst.position[0], rim, inst.position[2]);
  }
}

function addPegRail(g, layout) {
  const x = -layout.meta.room.width / 2 + 0.16;
  addBox(g, 0.04, 0.06, 1.35, toon(WOOD_D), x, 1.62, -0.45);
  const colors = ['#c44868', '#f3efe4', '#7a2438', '#3f6b50', '#d8b44a'];
  colors.forEach((c, i) => {
    const z = -1.0 + i * 0.28;
    addCyl(g, 0.012, 0.012, 0.06, toon(WOOD), x + 0.03, 1.58, z, 6).rotation.z = Math.PI / 2;
    const spool = addCyl(g, 0.04, 0.04, 0.05, toon(c), x + 0.06, 1.5, z, 12);
    spool.rotation.z = Math.PI / 2;
  });
}

function addPendants(g, layout, H) {
  const bulbs = toon('#ffd7a8', { emissive: '#ffc98a', emissiveIntensity: 1.15 });
  for (const inst of layout.instances) {
    if (inst.kind !== 'pendant_lamp') continue;
    const h = layout.assets.pendant_lamp.targetHeight;
    const top = inst.position[1] + h;
    addCyl(g, 0.008, 0.008, Math.max(0.05, H - 0.02 - top), toon('#2a2622'), inst.position[0], (top + H - 0.02) / 2, inst.position[2], 6);
    addCyl(g, 0.03, 0.03, 0.02, toon('#3a342e'), inst.position[0], H - 0.03, inst.position[2], 8);
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.035, 10, 8), bulbs);
    bulb.position.set(inst.position[0], inst.position[1] + 0.05, inst.position[2]);
    bulb.userData.noCast = true;
    g.add(bulb);
  }
}

boot({
  makeShell,
  makeProcedural,
  readyText: 'ready — bloom florist · drag orbit · U unlit · T toon',
});
