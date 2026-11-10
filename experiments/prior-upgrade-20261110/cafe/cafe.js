import * as THREE from 'three';
import { boot, toon, addBox, addCyl, canvasTexture } from './scene_runtime.js';

const PASTRY = ['#e2b56a', '#c4783a', '#f0d7a4', '#8a4a2c', '#d8c2a0', '#a85a48', '#e8c98a'];
const SYRUP = ['#5c2a1c', '#c45c26', '#e6c27a', '#3a2418', '#8d3d2a', '#6b3a1e'];

function byId(layout, id) {
  return layout.instances.find((item) => item.id === id);
}

function menuTexture() {
  return canvasTexture((ctx, w, h) => {
    ctx.fillStyle = '#1b2422';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#c6a36a';
    ctx.lineWidth = 10;
    ctx.strokeRect(16, 16, w - 32, h - 32);
    ctx.fillStyle = '#f3eadc';
    ctx.font = '600 48px Georgia, Palatino, serif';
    ctx.fillText('PIKE HOUSE', 36, 78);
    ctx.font = '22px Georgia, Palatino, serif';
    ctx.fillStyle = '#d7c4a2';
    ctx.fillText('espresso  ·  pastry  ·  stay', 38, 112);
    const cols = [
      ['ESPRESSO', 'pike roast', 'oat latte', 'americano'],
      ['POUR', 'ethiopia', 'house filter', 'cocoa'],
      ['FOOD', 'butter croissant', 'berry tart', 'olive bun'],
    ];
    cols.forEach((lines, i) => {
      const x = 36 + i * 155;
      lines.forEach((line, row) => {
        ctx.font = row === 0 ? '600 22px Georgia, serif' : '20px Georgia, serif';
        ctx.fillStyle = row === 0 ? '#f3eadc' : '#d9cbb6';
        ctx.fillText(line, x, 168 + row * 40);
      });
    });
  }, 512, 360);
}

function signTexture() {
  return canvasTexture((ctx, w, h) => {
    ctx.fillStyle = '#1e3932';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#c4a574';
    ctx.fillRect(0, 0, 14, h);
    ctx.fillRect(w - 14, 0, 14, h);
    ctx.fillStyle = '#f4ecdf';
    ctx.font = '600 64px Georgia, Palatino, serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('PIKE HOUSE', w / 2, h / 2 - 10);
    ctx.font = '20px Georgia, serif';
    ctx.fillStyle = '#c6a36a';
    ctx.fillText('COFFEE  ·  1971', w / 2, h / 2 + 42);
  }, 720, 200);
}

function tileTexture() {
  return canvasTexture((ctx, w, h) => {
    ctx.fillStyle = '#1a2e28';
    ctx.fillRect(0, 0, w, h);
    const tones = ['#2a4a40', '#33564a', '#1e3932', '#3d5c52'];
    const n = 6;
    const gap = 6;
    const tw = (w - gap) / n;
    for (let y = 0; y < n; y++) {
      for (let x = 0; x < n; x++) {
        ctx.fillStyle = tones[(x + y * 2) % tones.length];
        ctx.fillRect(gap / 2 + x * tw, gap / 2 + y * tw, tw - gap, tw - gap);
      }
    }
  }, 256, 256);
}

function subwayTexture() {
  return canvasTexture((ctx, w, h) => {
    ctx.fillStyle = '#e7dccb';
    ctx.fillRect(0, 0, w, h);
    const cols = 10;
    const rows = 6;
    const tw = w / cols;
    const th = h / rows;
    for (let y = 0; y < rows; y++) {
      const ox = y % 2 ? tw / 2 : 0;
      for (let x = -1; x < cols + 1; x++) {
        const sage = (x + y) % 7 === 0;
        ctx.fillStyle = sage ? '#9aaa84' : (x + y) % 2 ? '#f4efe6' : '#efe6d8';
        ctx.fillRect(x * tw + ox + 2, y * th + 2, tw - 4, th - 4);
      }
    }
  }, 512, 256);
}

function exteriorTexture() {
  return canvasTexture((ctx, w, h) => {
    const sky = ctx.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, '#d5e4f2');
    sky.addColorStop(1, '#e7efe6');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#c9b59a';
    ctx.fillRect(0, h * 0.62, w, h * 0.38);
    ctx.fillStyle = '#b7a48c';
    ctx.fillRect(w * 0.1, h * 0.34, w * 0.26, h * 0.3);
    ctx.fillStyle = '#d8d0c4';
    for (let i = 0; i < 4; i++) ctx.fillRect(w * 0.14 + i * 26, h * 0.4, 14, 20);
    ctx.fillStyle = '#6d8f5e';
    ctx.beginPath();
    ctx.arc(w * 0.72, h * 0.5, 64, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#5e7d52';
    ctx.beginPath();
    ctx.arc(w * 0.62, h * 0.56, 44, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#6a5340';
    ctx.fillRect(w * 0.7, h * 0.62, 10, h * 0.16);
  }, 512, 512);
}

function foliage(g, x, y, z, scale, kind) {
  const stem = toon('#4a5a32');
  const leaf = toon(kind === 'herb' ? '#3f7a48' : '#2f6a3c');
  const leaf2 = toon('#245532');
  addCyl(g, 0.012 * scale, 0.016 * scale, 0.16 * scale, stem, x, y + 0.08 * scale, z, 8);
  const a = new THREE.Mesh(new THREE.SphereGeometry(0.11 * scale, 10, 8), leaf);
  a.position.set(x, y + 0.22 * scale, z);
  a.scale.set(1.05, 0.8, 0.95);
  a.castShadow = true;
  g.add(a);
  const b = new THREE.Mesh(new THREE.SphereGeometry(0.08 * scale, 10, 8), leaf2);
  b.position.set(x + 0.06 * scale, y + 0.28 * scale, z - 0.04 * scale);
  b.castShadow = true;
  g.add(b);
  if (kind !== 'herb') {
    const c = new THREE.Mesh(new THREE.SphereGeometry(0.07 * scale, 8, 6), leaf);
    c.position.set(x - 0.05 * scale, y + 0.26 * scale, z + 0.05 * scale);
    c.castShadow = true;
    g.add(c);
  }
}

function croissant(g, x, y, z, rotY) {
  const mesh = new THREE.Mesh(new THREE.TorusGeometry(0.055, 0.018, 8, 14, Math.PI * 1.15), toon('#e2b56a'));
  mesh.position.set(x, y + 0.02, z);
  mesh.rotation.set(1.15, rotY, 0.2);
  mesh.castShadow = true;
  g.add(mesh);
}

function muffin(g, x, y, z, color) {
  addCyl(g, 0.038, 0.05, 0.045, toon(color), x, y + 0.025, z, 10);
  const top = new THREE.Mesh(new THREE.SphereGeometry(0.048, 10, 8), toon(color));
  top.scale.y = 0.55;
  top.position.set(x, y + 0.055, z);
  top.castShadow = true;
  g.add(top);
}

function tart(g, x, y, z, fruit) {
  addCyl(g, 0.045, 0.048, 0.018, toon('#d8b56a'), x, y + 0.01, z, 12);
  addCyl(g, 0.038, 0.038, 0.012, toon(fruit), x, y + 0.024, z, 12);
}

function makeShell(layout) {
  const g = new THREE.Group();
  g.name = 'shell';
  const s = layout.shell;
  const { width: W, depth: D, height: H } = layout.meta.room;
  const x0 = -W / 2;
  const x1 = W / 2;
  const z0 = -D / 2;
  const z1 = D / 2;
  const plaster = toon(s.wallColor);
  const wood = toon(s.wood);
  const woodDark = toon(s.woodDark);
  const woodL = toon(s.woodLight);
  const accent = toon(s.accent);
  const ceilMat = toon(s.ceiling);
  const brass = toon(s.brass);
  const cream = toon(s.cream);

  const floor = addBox(g, W, 0.08, D, toon(s.floorColor), 0, -0.04, 0);
  floor.receiveShadow = true;

  const tones = [s.plankA, s.plankB, s.plankC, '#c9a06a', '#a97844'];
  let pz = z0 + 0.08;
  let pi = 0;
  while (pz < z1 - 0.06) {
    const d = 0.17 + (pi % 3) * 0.015;
    addBox(g, W - 0.14, 0.016, d - 0.012, toon(tones[pi % tones.length]), 0, 0.012, pz + d / 2, { shadow: false });
    pz += d;
    pi += 1;
  }

  const tileMap = tileTexture();
  tileMap.wrapS = THREE.RepeatWrapping;
  tileMap.wrapT = THREE.RepeatWrapping;
  tileMap.repeat.set(5.4, 2.6);
  const tile = new THREE.Mesh(new THREE.BoxGeometry(6.4, 0.024, 2.55), toon('#ffffff', { map: tileMap }));
  tile.position.set(-0.35, 0.03, -2.55);
  tile.receiveShadow = true;
  tile.castShadow = false;
  g.add(tile);
  addBox(g, 6.4, 0.012, 0.04, brass, -0.35, 0.044, -1.28);

  addBox(g, 0.78, 0.014, 4.2, toon('#6e4a34'), 0.52, 0.04, 1.35);
  addBox(g, 0.7, 0.006, 0.06, toon('#e6d2b0'), 0.52, 0.048, -0.55);
  addBox(g, 0.7, 0.006, 0.06, toon('#e6d2b0'), 0.52, 0.048, 3.2);
  addBox(g, 1.05, 0.018, 0.85, toon(s.ink), 0.52, 0.05, 3.45);

  const bw0 = 2.85;
  const bw1 = 5.05;
  const bY0 = 1.12;
  const bY1 = 2.55;
  const backZ = z0 - 0.07;
  addBox(g, bw0 - x0, H, 0.14, plaster, (x0 + bw0) / 2, H / 2, backZ);
  addBox(g, x1 - bw1, H, 0.14, plaster, (bw1 + x1) / 2, H / 2, backZ);
  addBox(g, bw1 - bw0, bY0, 0.14, plaster, (bw0 + bw1) / 2, bY0 / 2, backZ);
  addBox(g, bw1 - bw0, H - bY1, 0.14, plaster, (bw0 + bw1) / 2, (H + bY1) / 2, backZ);

  const winZ0 = 0.42;
  const winZ1 = 2.72;
  const winY0 = 0.86;
  const winY1 = 2.62;
  addBox(g, 0.14, H, winZ0 - z0, plaster, x0 - 0.07, H / 2, (z0 + winZ0) / 2);
  addBox(g, 0.14, H, z1 - winZ1, plaster, x0 - 0.07, H / 2, (winZ1 + z1) / 2);
  addBox(g, 0.14, winY0, winZ1 - winZ0, plaster, x0 - 0.07, winY0 / 2, (winZ0 + winZ1) / 2);
  addBox(g, 0.14, H - winY1, winZ1 - winZ0, plaster, x0 - 0.07, (H + winY1) / 2, (winZ0 + winZ1) / 2);

  const glassMat = toon(s.glass, { transparent: true, opacity: 0.22, side: THREE.DoubleSide, depthWrite: false });
  const glass = addBox(g, 0.02, winY1 - winY0 - 0.08, winZ1 - winZ0 - 0.08, glassMat, x0 + 0.02, (winY0 + winY1) / 2, (winZ0 + winZ1) / 2, { shadow: false });
  glass.userData.noShadow = true;
  const mullion = toon('#f7f1e6');
  for (const z of [1.0, 1.57, 2.14]) addBox(g, 0.05, winY1 - winY0, 0.04, mullion, x0 + 0.04, (winY0 + winY1) / 2, z);
  addBox(g, 0.05, 0.04, winZ1 - winZ0, mullion, x0 + 0.04, 1.95, (winZ0 + winZ1) / 2);
  addBox(g, 0.1, 0.08, winZ1 - winZ0 + 0.16, wood, x0 + 0.02, winY1 + 0.02, (winZ0 + winZ1) / 2);
  addBox(g, 0.08, winY1 - winY0 + 0.08, 0.08, wood, x0 + 0.02, (winY0 + winY1) / 2, winZ0 - 0.02);
  addBox(g, 0.08, winY1 - winY0 + 0.08, 0.08, wood, x0 + 0.02, (winY0 + winY1) / 2, winZ1 + 0.02);
  addBox(g, 0.36, 0.08, winZ1 - winZ0 + 0.2, woodL, x0 + 0.16, 0.8, (winZ0 + winZ1) / 2);

  const outside = new THREE.Mesh(
    new THREE.PlaneGeometry(2.6, 2.2),
    toon('#ffffff', { map: exteriorTexture(), side: THREE.DoubleSide }),
  );
  outside.position.set(x0 - 0.28, 1.68, (winZ0 + winZ1) / 2);
  outside.rotation.y = Math.PI / 2;
  outside.userData.noShadow = true;
  g.add(outside);

  addBox(g, bw1 - bw0 - 0.08, bY1 - bY0 - 0.08, 0.03, glassMat, (bw0 + bw1) / 2, (bY0 + bY1) / 2, z0 + 0.02, { shadow: false });
  for (const x of [3.25, 3.95, 4.65]) addBox(g, 0.05, bY1 - bY0, 0.06, wood, x, (bY0 + bY1) / 2, z0 + 0.06);
  addBox(g, bw1 - bw0 + 0.1, 0.08, 0.28, woodL, (bw0 + bw1) / 2, bY0 - 0.02, z0 + 0.22);
  addBox(g, bw1 - bw0 + 0.16, 0.08, 0.08, wood, (bw0 + bw1) / 2, bY1 + 0.02, z0 + 0.06);
  const backOut = new THREE.Mesh(
    new THREE.PlaneGeometry(2.4, 1.7),
    toon('#ffffff', { map: exteriorTexture() }),
  );
  backOut.position.set((bw0 + bw1) / 2, (bY0 + bY1) / 2, z0 - 0.22);
  backOut.userData.noShadow = true;
  g.add(backOut);

  addBox(g, bw0 - x0 - 0.15, 1.02, 0.06, accent, (x0 + bw0) / 2 + 0.05, 0.51, z0 + 0.05);
  addBox(g, 0.06, 1.02, D - 1.7, accent, x0 + 0.05, 0.51, 0.55);
  addBox(g, W - 0.3, 0.05, 0.05, woodDark, 0, 1.04, z0 + 0.08);
  addBox(g, 0.05, 0.05, D - 1.5, woodDark, x0 + 0.08, 1.04, 0.5);
  addBox(g, W, 0.08, 0.08, woodDark, 0, 0.04, z0 + 0.02);
  addBox(g, 0.08, 0.08, D, woodDark, x0 + 0.02, 0.04, 0);

  for (let i = 0; i < 16; i++) {
    addBox(g, 0.07, 2.35, 0.04, wood, x0 + 0.22 + i * 0.1, 1.42, z0 + 0.16);
  }

  addBox(g, 3.55, 1.12, 0.05, accent, -0.35, 2.18, z0 + 0.09);
  addBox(g, 3.32, 0.92, 0.04, cream, -0.35, 2.18, z0 + 0.12);
  const logo = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.05, 32), accent);
  logo.rotation.x = Math.PI / 2;
  logo.position.set(-2.55, 2.2, z0 + 0.15);
  g.add(logo);
  for (let i = 0; i < 4; i++) addBox(g, 0.5, 0.07, 0.02, accent, -1.15 + i * 0.62, 2.48, z0 + 0.16);

  addBox(g, 0.82, 2.12, 0.06, woodDark, 4.55, 1.08, z0 + 0.05);
  addBox(g, 0.66, 1.88, 0.04, toon('#4a3428'), 4.55, 1.02, z0 + 0.09);
  addBox(g, 0.08, 0.08, 0.08, brass, 4.22, 1.0, z0 + 0.12);

  addBox(g, 0.28, H - 0.2, 0.28, wood, 4.72, H / 2 - 0.05, -1.05);
  addBox(g, 0.32, 0.08, 0.32, woodDark, 4.72, 0.04, -1.05);
  addBox(g, 0.32, 0.1, 0.32, woodDark, 4.72, H - 0.16, -1.05);

  addBox(g, W - 0.3, 0.1, 3.15, ceilMat, 0.05, H - 0.05, -2.25);
  addBox(g, 2.35, 0.1, 3.4, ceilMat, -3.85, H - 0.05, 1.15);
  addBox(g, 6.2, 0.18, 2.7, woodDark, -0.55, 2.72, -2.52);
  addBox(g, 0.16, 0.22, D * 0.55, wood, -1.55, H - 0.28, -1.35);
  addBox(g, 0.16, 0.22, D * 0.48, wood, 2.55, H - 0.28, -1.15);
  addBox(g, 5.6, 0.16, 0.14, wood, 0.45, H - 0.3, -0.72);
  addBox(g, 4.2, 0.14, 0.12, wood, 0.55, H - 0.32, 1.05);
  addBox(g, W - 0.4, 0.05, 0.05, wood, 0, H - 0.08, z0 + 0.05);
  addBox(g, 0.05, 0.05, D * 0.7, wood, x0 + 0.05, H - 0.08, -0.4);

  addBox(g, 2.15, 0.016, 1.55, accent, -1.95, 0.02, 2.28);
  addBox(g, 2.05, 0.016, 1.5, accent, 2.5, 0.02, 2.12);
  addBox(g, 2.05, 0.016, 1.45, accent, 2.55, 0.02, 0.12);

  return g;
}

function pastryCase(g, layout) {
  const a = layout.meta.anchors.pastry;
  const { x, z, w, d, base, glass: gh } = a;
  const wood = toon(layout.shell.wood);
  const woodL = toon(layout.shell.woodLight);
  const stone = toon(layout.shell.stone);
  const metal = toon('#6a6e72');
  const glassMat = toon(layout.shell.glass, { transparent: true, opacity: 0.28, side: THREE.DoubleSide, depthWrite: false });

  addBox(g, w, base, d, wood, x, base / 2, z);
  addBox(g, w + 0.04, 0.05, d + 0.04, woodL, x, base + 0.02, z);
  addBox(g, 0.04, gh, 0.04, metal, x - w / 2 + 0.03, base + 0.05 + gh / 2, z - d / 2 + 0.03);
  addBox(g, 0.04, gh, 0.04, metal, x + w / 2 - 0.03, base + 0.05 + gh / 2, z - d / 2 + 0.03);
  addBox(g, 0.04, gh, 0.04, metal, x - w / 2 + 0.03, base + 0.05 + gh / 2, z + d / 2 - 0.03);
  addBox(g, 0.04, gh, 0.04, metal, x + w / 2 - 0.03, base + 0.05 + gh / 2, z + d / 2 - 0.03);
  const front = addBox(g, w - 0.08, gh - 0.04, 0.018, glassMat, x, base + 0.04 + gh / 2, z + d / 2 - 0.02, { shadow: false });
  front.renderOrder = 4;
  addBox(g, w - 0.08, gh - 0.04, 0.018, glassMat, x, base + 0.04 + gh / 2, z - d / 2 + 0.02, { shadow: false });
  addBox(g, 0.018, gh - 0.04, d - 0.08, glassMat, x - w / 2 + 0.02, base + 0.04 + gh / 2, z, { shadow: false });
  addBox(g, 0.018, gh - 0.04, d - 0.08, glassMat, x + w / 2 - 0.02, base + 0.04 + gh / 2, z, { shadow: false });
  addBox(g, w, 0.04, d, woodL, x, base + gh + 0.04, z);
  addBox(g, w - 0.16, 0.018, d - 0.16, stone, x, base + 0.12, z);
  addBox(g, w - 0.16, 0.016, d - 0.16, stone, x, base + gh * 0.5, z);

  const strip = addBox(
    g, w - 0.22, 0.018, 0.04,
    toon('#fff1d0', { emissive: '#ffc98a', emissiveIntensity: 1 }),
    x, base + gh + 0.01, z + 0.12,
    { name: 'bulb', userData: { bulb: true }, shadow: false },
  );
  strip.userData.bulb = true;

  const y0 = base + 0.16;
  const y1 = base + gh * 0.5 + 0.03;
  for (let i = 0; i < 6; i++) {
    const px = x - 0.55 + i * 0.22;
    croissant(g, px, y0, z + 0.12, 0.2 + i * 0.15);
    muffin(g, px, y0, z - 0.12, PASTRY[(i + 2) % PASTRY.length]);
    tart(g, px, y1, z + 0.1, i % 2 ? '#6a8a48' : '#a85a48');
    croissant(g, px + 0.04, y1, z - 0.1, -0.3 + i * 0.1);
  }
  addBox(g, 0.22, 0.04, 0.12, wood, x - 0.35, base - 0.02, z + d / 2 + 0.08);
}

function queueLane(g) {
  const brass = toon('#c4a06a');
  const ink = toon('#2a2420');
  const rope = toon('#8c3d32');
  function post(x, z) {
    addCyl(g, 0.05, 0.05, 0.02, brass, x, 0.012, z, 10);
    addCyl(g, 0.015, 0.015, 0.84, ink, x, 0.44, z, 8);
    addCyl(g, 0.026, 0.026, 0.035, brass, x, 0.86, z, 8);
  }
  function ropeZ(x, z1, z2) {
    const len = Math.abs(z2 - z1);
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.011, len, 6), rope);
    mesh.rotation.x = Math.PI / 2;
    mesh.position.set(x, 0.7, (z1 + z2) / 2);
    mesh.castShadow = true;
    g.add(mesh);
  }
  function ropeX(z, x1, x2) {
    const len = Math.abs(x2 - x1);
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.011, len, 6), rope);
    mesh.rotation.z = Math.PI / 2;
    mesh.position.set((x1 + x2) / 2, 0.7, z);
    mesh.castShadow = true;
    g.add(mesh);
  }
  const zs = [2.85, 1.85, 0.85, -0.15];
  [0.18, 0.88].forEach((x) => {
    zs.forEach((z) => post(x, z));
    for (let i = 0; i < zs.length - 1; i++) ropeZ(x, zs[i], zs[i + 1]);
  });
  post(-0.55, -0.15);
  ropeX(-0.15, 0.18, -0.55);
}

function makeProps(layout) {
  const g = new THREE.Group();
  g.name = 'props';
  const s = layout.shell;
  const wood = toon(s.wood);
  const woodDark = toon(s.woodDark);
  const woodL = toon(s.woodLight);
  const stone = toon(s.stone);
  const brass = toon(s.brass);
  const ink = toon(s.ink);
  const metal = toon('#8a8680');
  const cream = toon('#f4ecdf');
  const accent = toon(s.accent);
  const C = layout.meta.anchors.counter;

  addBox(g, 5.65, 0.88, 0.48, wood, -0.85, 0.44, -3.52);
  addBox(g, 5.45, 0.1, 0.34, ink, -0.85, 0.08, -3.54);
  addBox(g, 5.72, 0.05, 0.54, stone, -0.85, 0.91, -3.5);
  const splashMap = subwayTexture();
  splashMap.wrapS = THREE.RepeatWrapping;
  splashMap.wrapT = THREE.RepeatWrapping;
  splashMap.repeat.set(5.5, 1.3);
  const splash = new THREE.Mesh(new THREE.BoxGeometry(5.5, 0.72, 0.04), toon('#ffffff', { map: splashMap }));
  splash.position.set(-0.8, 1.3, -3.72);
  splash.castShadow = true;
  splash.receiveShadow = true;
  g.add(splash);
  addBox(g, 5.6, 0.05, 0.32, wood, -0.8, 1.68, -3.6);
  const strip = addBox(
    g, 3.6, 0.015, 0.04,
    toon('#fff1d0', { emissive: '#ffc98a', emissiveIntensity: 1 }),
    -0.7, 1.64, -3.44,
    { name: 'bulb', userData: { bulb: true }, shadow: false },
  );
  strip.userData.bulb = true;

  const menu = new THREE.Mesh(new THREE.BoxGeometry(1.95, 1.02, 0.04), toon('#ffffff', { map: menuTexture() }));
  menu.position.set(-0.55, 2.18, -3.68);
  menu.castShadow = true;
  g.add(menu);
  addBox(g, 2.08, 0.06, 0.06, wood, -0.55, 2.72, -3.66);
  addBox(g, 2.08, 0.06, 0.06, wood, -0.55, 1.64, -3.66);

  const sign = new THREE.Mesh(
    new THREE.BoxGeometry(1.15, 0.32, 0.03),
    toon('#ffffff', { map: signTexture(), side: THREE.DoubleSide }),
  );
  sign.position.set(-0.55, 2.48, -1.95);
  sign.castShadow = true;
  g.add(sign);
  addCyl(g, 0.008, 0.008, 0.2, brass, -0.55, 2.72, -1.95, 6);

  for (const lx of [-1.55, -0.75, 0.05, 0.75]) {
    addCyl(g, 0.02, 0.02, 0.22, brass, C.x + lx, 0.22, C.z + 0.48, 8);
  }
  addCyl(g, 0.016, 0.016, 2.35, brass, C.x - 0.4, 0.22, C.z + 0.46, 8).rotation.z = Math.PI / 2;

  addBox(g, 1.35, 0.05, 0.52, woodL, 0.35, 1.08, -1.95);
  addBox(g, 0.22, 0.08, 0.16, woodDark, 0.95, 1.1, -2.05);

  pastryCase(g, layout);
  queueLane(g);

  addBox(g, 0.85, 0.04, 0.28, wood, -0.15, 1.07, -2.62);
  SYRUP.forEach((c, i) => {
    const x = -0.42 + i * 0.12;
    addCyl(g, 0.032, 0.036, 0.2 + (i % 2) * 0.03, toon(c), x, 1.2, -2.62, 8);
    addCyl(g, 0.012, 0.016, 0.05, metal, x, 1.34, -2.62, 6);
  });

  const cupMat = cream;
  const sleeve = accent;
  for (let i = 0; i < 8; i++) {
    addCyl(g, 0.042, 0.038, 0.085, cupMat, -1.72, 1.1 + i * 0.085, -2.22, 12);
    if (i % 2 === 0) addCyl(g, 0.046, 0.046, 0.028, sleeve, -1.72, 1.08 + i * 0.085, -2.22, 12);
  }
  for (let i = 0; i < 6; i++) {
    addCyl(g, 0.042, 0.038, 0.085, cupMat, -1.55, 1.1 + i * 0.085, -2.38, 12);
  }
  for (let i = 0; i < 5; i++) {
    addCyl(g, 0.048, 0.048, 0.018, toon('#ddd5c8'), -1.38, 1.08 + i * 0.022, -2.22, 12);
  }
  addBox(g, 0.16, 0.12, 0.12, sleeve, -1.95, 1.12, -2.18);

  addCyl(g, 0.07, 0.08, 0.22, metal, 0.55, 1.16, -2.38, 12);
  addCyl(g, 0.09, 0.045, 0.1, toon('#ded6cc'), 0.55, 1.32, -2.38, 12);
  addBox(g, 0.06, 0.04, 0.08, ink, 0.55, 1.08, -2.3);

  function caddy(x, z) {
    addBox(g, 0.14, 0.1, 0.1, metal, x, 0.79, z);
    addBox(g, 0.12, 0.08, 0.02, cream, x, 0.8, z + 0.02);
  }
  caddy(-3.7, 2.5);
  caddy(-1.65, 2.54);
  caddy(2.62, 2.34);
  caddy(-2.55, 0.3);
  caddy(2.7, 0.28);

  addCyl(g, 0.14, 0.16, 0.48, metal, 3.55, 0.26, -1.55, 12);
  addCyl(g, 0.06, 0.06, 0.12, accent, 1.05, 1.14, -2.18, 10);

  for (const pot of layout.instances.filter((item) => item.kind === 'flowerpot')) {
    const sc = pot.scale || 1;
    const kind = sc < 0.65 ? 'herb' : 'ficus';
    foliage(g, pot.position[0], pot.position[1] + 0.26 * sc, pot.position[2], 1.12 * sc, kind);
  }

  for (const [x, y, z] of [[-1.7, 2.58, -2.55], [-0.55, 2.58, -2.4], [0.55, 2.58, -2.55], [1.55, 2.58, -2.35]]) {
    addCyl(g, 0.045, 0.055, 0.08, ink, x, y, z, 10);
    const bulb = addCyl(g, 0.03, 0.03, 0.02, toon('#fff1d0', { emissive: '#ffc98a' }), x, y - 0.05, z, 8, { name: 'bulb', userData: { bulb: true }, shadow: false });
    bulb.userData.bulb = true;
  }

  for (const z of [0.7, 2.35]) {
    addBox(g, 0.02, 0.16, 0.1, brass, -5.12, 1.78, z);
    addCyl(g, 0.012, 0.012, 0.22, brass, -5.0, 1.78, z, 6).rotation.z = Math.PI / 2;
    addCyl(g, 0.07, 0.05, 0.08, cream, -4.86, 1.74, z, 10);
    const bulb = addCyl(g, 0.035, 0.035, 0.02, toon('#fff1d0', { emissive: '#ffc98a' }), -4.86, 1.69, z, 8, { name: 'bulb', userData: { bulb: true }, shadow: false });
    bulb.userData.bulb = true;
  }

  const lampH = layout.assets.pendant_lamp.targetHeight;
  for (const inst of layout.instances.filter((item) => item.kind === 'pendant_lamp')) {
    const [x, y, z] = inst.position;
    const top = y + lampH;
    const ceiling = z > 0 ? 3.12 : 2.78;
    const span = Math.max(0.05, ceiling - top);
    addCyl(g, 0.006, 0.006, span, ink, x, top + span / 2, z, 6, { shadow: false });
    addCyl(g, 0.045, 0.045, 0.02, woodDark, x, ceiling, z, 10);
    const bulb = addCyl(g, 0.032, 0.032, 0.02, toon('#fff1d0', { emissive: '#ffc98a' }), x, y + 0.06, z, 8, { name: 'bulb', userData: { bulb: true }, shadow: false });
    bulb.userData.bulb = true;
  }

  const face = new THREE.Mesh(new THREE.CircleGeometry(0.16, 20), cream);
  face.position.set(4.95, 2.15, -2.15);
  face.rotation.y = -Math.PI / 2;
  g.add(face);
  addCyl(g, 0.17, 0.17, 0.02, brass, 4.93, 2.15, -2.15, 20).rotation.z = Math.PI / 2;
  const hand = addBox(g, 0.012, 0.1, 0.012, ink, 4.93, 2.18, -2.15);
  hand.rotation.x = 0.45;

  addBox(g, 0.42, 0.32, 0.03, wood, 5.08, 1.72, 1.55);
  addBox(g, 0.34, 0.24, 0.02, toon('#d8c4a4'), 5.08, 1.72, 1.53);
  addBox(g, 0.3, 0.46, 0.03, wood, 5.08, 1.85, -0.35);
  addBox(g, 0.22, 0.38, 0.02, toon('#1e3932'), 5.08, 1.85, -0.33);

  const aFrame = new THREE.Group();
  aFrame.position.set(0.55, 0, 3.35);
  const board = toon('#f6efe2', { map: signTexture() });
  const front = new THREE.Mesh(new THREE.PlaneGeometry(0.52, 0.7), board);
  front.position.set(0, 0.46, 0.08);
  front.rotation.x = -0.22;
  const back = new THREE.Mesh(new THREE.PlaneGeometry(0.52, 0.7), accent);
  back.position.set(0, 0.46, -0.08);
  back.rotation.x = 0.22;
  aFrame.add(front, back);
  g.add(aFrame);

  return g;
}

function makeLights(layout) {
  const lights = [];
  const add = (color, intensity, distance, x, y, z) => {
    const light = new THREE.PointLight(color, intensity, distance, 2);
    light.position.set(x, y, z);
    lights.push(light);
  };
  add(0xffc98a, 0.58, 4.4, -0.7, 1.58, -3.2);
  const pastry = layout.meta.anchors.pastry;
  add(0xffe2b8, 0.45, 2.4, pastry.x, 1.45, pastry.z);
  for (const x of [-1.7, -0.55, 0.55, 1.55]) add(0xffb36b, 0.2, 2.3, x, 2.4, -2.45);
  for (const z of [0.7, 2.35]) add(0xffc98a, 0.3, 2.2, -4.8, 1.72, z);
  for (const inst of layout.instances.filter((item) => item.kind === 'pendant_lamp')) {
    add(0xffc56a, 0.42, 4.8, inst.position[0], inst.position[1] + 0.08, inst.position[2]);
  }
  add(0xffe0b8, 0.22, 3.2, -3.8, 1.9, 1.55);
  return lights;
}

boot({
  readyText: 'ready — Pike House cafe · drag orbit · T toon · U unlit',
  build(api) {
    return {
      shell: makeShell(api.layout),
      props: makeProps(api.layout),
      lights: makeLights(api.layout),
    };
  },
}).catch((err) => {
  console.error(err);
  const status = document.getElementById('status');
  if (status) status.textContent = 'error: ' + err.message;
});
