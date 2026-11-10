import * as THREE from 'three';
import { boot, toon, addBox, addCyl, canvasTexture } from './scene_runtime.js';

const BOOK = ['#6e3b32', '#2f4a3c', '#3d3a66', '#8a5a2a', '#5c2e3a', '#244a62', '#4a3424', '#7a4a28', '#35503c', '#8d3d32'];
const PASTRY = ['#e2b56a', '#c4783a', '#f0d7a4', '#8a4a2c', '#d8c2a0', '#a85a48'];

function byId(layout, id) {
  return layout.instances.find((item) => item.id === id);
}

function menuTexture() {
  return canvasTexture((ctx, w, h) => {
    ctx.fillStyle = '#1b2422';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#c6a36a';
    ctx.lineWidth = 10;
    ctx.strokeRect(18, 18, w - 36, h - 36);
    ctx.fillStyle = '#f3eadc';
    ctx.font = '600 54px Georgia, Palatino, serif';
    ctx.fillText('ATRIUM', 48, 92);
    ctx.font = '24px Georgia, Palatino, serif';
    ctx.fillStyle = '#d7c4a2';
    ctx.fillText('daylight coffee', 50, 132);
    const cols = [
      ['ESPRESSO', 'ristretto', 'milk  ·  oat', 'filter pour'],
      ['PASTRY', 'morning bun', 'olive cake', 'cocoa tart'],
      ['CUP', 'filter', 'tea', 'cocoa'],
    ];
    cols.forEach((lines, i) => {
      const x = 48 + i * 150;
      lines.forEach((line, row) => {
        ctx.font = row === 0 ? '600 22px Georgia, serif' : '20px Georgia, serif';
        ctx.fillStyle = row === 0 ? '#f3eadc' : '#d9cbb6';
        ctx.fillText(line, x, 200 + row * 42);
      });
    });
  }, 512, 360);
}

function signTexture() {
  return canvasTexture((ctx, w, h) => {
    ctx.fillStyle = '#f4ecdf';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#6d4c38';
    ctx.fillRect(0, 0, 16, h);
    ctx.fillRect(w - 16, 0, 16, h);
    ctx.fillStyle = '#2c2824';
    ctx.font = '600 72px Georgia, Palatino, serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('ATRIUM', w / 2, h / 2 - 8);
    ctx.font = '22px Georgia, serif';
    ctx.fillStyle = '#8a5a3a';
    ctx.fillText('COFFEE  ·  DAYLIGHT', w / 2, h / 2 + 48);
  }, 640, 200);
}

function tileTexture() {
  return canvasTexture((ctx, w, h) => {
    ctx.fillStyle = '#eadcc8';
    ctx.fillRect(0, 0, w, h);
    const tones = ['#b46348', '#a85a42', '#c06d50', '#9a4e38'];
    const n = 4;
    const gap = 8;
    const tw = (w - gap) / n;
    for (let y = 0; y < n; y++) {
      for (let x = 0; x < n; x++) {
        ctx.fillStyle = tones[(x + y * 2) % tones.length];
        ctx.fillRect(gap / 2 + x * tw, gap / 2 + y * tw, tw - gap, tw - gap);
      }
    }
  }, 256, 256);
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
    ctx.fillRect(w * 0.08, h * 0.38, w * 0.28, h * 0.28);
    ctx.fillStyle = '#d8d0c4';
    for (let i = 0; i < 4; i++) ctx.fillRect(w * 0.12 + i * 28, h * 0.44, 16, 22);
    ctx.fillStyle = '#6d8f5e';
    ctx.beginPath();
    ctx.arc(w * 0.72, h * 0.5, 70, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#5e7d52';
    ctx.beginPath();
    ctx.arc(w * 0.62, h * 0.56, 48, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#6a5340';
    ctx.fillRect(w * 0.7, h * 0.62, 10, h * 0.16);
  }, 512, 512);
}

function bookRow(g, x, y, z, rotY, count) {
  const row = new THREE.Group();
  const widths = Array.from({ length: count }, (_, i) => 0.028 + (i % 3) * 0.008);
  const total = widths.reduce((sum, w) => sum + w, 0) + 0.006 * (count - 1);
  let cursor = -total / 2;
  for (let i = 0; i < count; i++) {
    const bw = widths[i];
    const bh = 0.15 + ((i * 5) % 4) * 0.016;
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(bw, bh, 0.11), toon(BOOK[(i * 3) % BOOK.length]));
    mesh.position.set(cursor + bw / 2, bh / 2, 0);
    if (i % 5 === 0) mesh.rotation.z = 0.1;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    row.add(mesh);
    cursor += bw + 0.006;
  }
  row.position.set(x, y, z);
  row.rotation.y = rotY;
  g.add(row);
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
  const ceilMat = toon(s.ceiling);
  const brass = toon(s.brass);
  const ink = toon(s.ink);

  const floor = addBox(g, W, 0.08, D, toon(s.floorColor), 0, -0.04, 0);
  floor.receiveShadow = true;

  const tones = [s.plankA, s.plankB, s.plankC, '#c9a06a', '#a97844'];
  let pz = z0 + 0.08;
  let pi = 0;
  while (pz < z1 - 0.06) {
    const d = 0.17 + (pi % 3) * 0.015;
    addBox(g, W - 0.12, 0.016, d - 0.012, toon(tones[pi % tones.length]), 0, 0.012, pz + d / 2, { shadow: false });
    pz += d;
    pi += 1;
  }

  const tileMap = tileTexture();
  tileMap.wrapS = THREE.RepeatWrapping;
  tileMap.wrapT = THREE.RepeatWrapping;
  tileMap.repeat.set(4.2, 3.2);
  const tile = new THREE.Mesh(
    new THREE.BoxGeometry(5.7, 0.025, 2.95),
    toon('#ffffff', { map: tileMap }),
  );
  tile.position.set(-1.85, 0.03, -2.32);
  tile.receiveShadow = true;
  tile.castShadow = false;
  g.add(tile);
  addBox(g, 5.7, 0.012, 0.04, brass, -1.85, 0.046, -0.84);

  addBox(g, 0.72, 0.015, 4.05, toon('#6e4a34'), -1.55, 0.04, 1.15);
  addBox(g, 1.15, 0.02, 0.72, ink, -1.55, 0.05, 3.15);

  const back = addBox(g, W, H, 0.14, plaster, 0, H / 2, z0 - 0.07);
  back.receiveShadow = true;
  const right = addBox(g, 0.14, H, D, plaster, x1 + 0.07, H / 2, 0);
  right.receiveShadow = true;

  const winZ0 = 0.48;
  const winZ1 = 2.52;
  const winY0 = 0.9;
  const winY1 = 2.68;
  addBox(g, 0.14, H, winZ0 - z0, plaster, x0 - 0.07, H / 2, (z0 + winZ0) / 2);
  addBox(g, 0.14, H, z1 - winZ1, plaster, x0 - 0.07, H / 2, (winZ1 + z1) / 2);
  addBox(g, 0.14, winY0, winZ1 - winZ0, plaster, x0 - 0.07, winY0 / 2, (winZ0 + winZ1) / 2);
  addBox(g, 0.14, H - winY1, winZ1 - winZ0, plaster, x0 - 0.07, (H + winY1) / 2, (winZ0 + winZ1) / 2);

  const glassMat = toon(s.glass, { transparent: true, opacity: 0.2, side: THREE.DoubleSide, depthWrite: false });
  const glass = addBox(g, 0.02, winY1 - winY0 - 0.08, winZ1 - winZ0 - 0.08, glassMat, x0 + 0.02, (winY0 + winY1) / 2, (winZ0 + winZ1) / 2, { shadow: false });
  glass.userData.noShadow = true;
  const mullion = toon('#f7f1e6');
  for (const z of [1.16, 1.84]) addBox(g, 0.05, winY1 - winY0, 0.04, mullion, x0 + 0.04, (winY0 + winY1) / 2, z);
  addBox(g, 0.05, 0.04, winZ1 - winZ0, mullion, x0 + 0.04, 2.05, (winZ0 + winZ1) / 2);
  addBox(g, 0.1, 0.08, winZ1 - winZ0 + 0.16, wood, x0 + 0.02, winY1 + 0.02, (winZ0 + winZ1) / 2);
  addBox(g, 0.08, winY1 - winY0 + 0.08, 0.08, wood, x0 + 0.02, (winY0 + winY1) / 2, winZ0 - 0.02);
  addBox(g, 0.08, winY1 - winY0 + 0.08, 0.08, wood, x0 + 0.02, (winY0 + winY1) / 2, winZ1 + 0.02);
  addBox(g, 0.36, 0.08, winZ1 - winZ0 + 0.2, wood, x0 + 0.16, 0.8, (winZ0 + winZ1) / 2);

  const outside = new THREE.Mesh(
    new THREE.PlaneGeometry(2.5, 2.15),
    toon('#ffffff', { map: exteriorTexture(), side: THREE.DoubleSide }),
  );
  outside.position.set(x0 - 0.28, 1.7, (winZ0 + winZ1) / 2);
  outside.rotation.y = Math.PI / 2;
  outside.userData.noShadow = true;
  g.add(outside);

  addBox(g, W - 0.2, 0.9, 0.05, wood, 0.1, 0.45, z0 + 0.04);
  addBox(g, 0.05, 0.9, D - 1.6, wood, x0 + 0.04, 0.45, 0.7);
  addBox(g, 0.05, 0.9, D - 0.4, wood, x1 - 0.04, 0.45, -0.1);
  addBox(g, W - 0.3, 0.06, 0.06, woodDark, 0, 0.92, z0 + 0.06);
  addBox(g, 0.06, 0.06, D - 0.5, woodDark, x0 + 0.06, 0.92, 0.4);
  addBox(g, 0.06, 0.06, D - 0.4, woodDark, x1 - 0.06, 0.92, 0);
  addBox(g, W, 0.08, 0.08, woodDark, 0, 0.04, z0 + 0.02);
  addBox(g, 0.08, 0.08, D, woodDark, x0 + 0.02, 0.04, 0);
  addBox(g, 0.08, 0.08, D, woodDark, x1 - 0.02, 0.04, 0);
  addBox(g, W - 0.2, 0.05, 0.05, wood, 0, H - 0.08, z0 + 0.05);
  addBox(g, 0.05, 0.05, D - 0.3, wood, x0 + 0.05, H - 0.08, 0);
  addBox(g, 0.05, 0.05, D - 0.3, wood, x1 - 0.05, H - 0.08, 0);

  addBox(g, 0.9, 2.15, 0.06, woodDark, 3.85, 1.08, z0 + 0.05);
  addBox(g, 0.72, 1.9, 0.04, toon('#4a3428'), 3.85, 1.02, z0 + 0.09);
  addBox(g, 0.08, 0.08, 0.08, brass, 3.48, 1.0, z0 + 0.12);

  const hole = { x0: 0.65, x1: 2.75, z0: 0.15, z1: 1.9 };
  const ceilZ1 = 2.2;
  const slab = (w, d, x, z) => addBox(g, w, 0.08, d, ceilMat, x, H - 0.04, z, { shadow: false });
  slab(W, hole.z0 - z0, 0, (z0 + hole.z0) / 2);
  slab(hole.x0 - x0, ceilZ1 - hole.z0, (x0 + hole.x0) / 2, (hole.z0 + ceilZ1) / 2);
  slab(x1 - hole.x1, ceilZ1 - hole.z0, (hole.x1 + x1) / 2, (hole.z0 + ceilZ1) / 2);
  slab(hole.x1 - hole.x0, ceilZ1 - hole.z1, (hole.x0 + hole.x1) / 2, (hole.z1 + ceilZ1) / 2);

  addBox(g, 5.75, 0.16, 2.45, woodDark, -1.75, 2.7, -2.55);
  addBox(g, W - 0.4, 0.1, 0.12, wood, 0, 3.12, hole.z0);
  addBox(g, W - 0.4, 0.1, 0.12, wood, 0, 3.12, hole.z1);
  addBox(g, 0.12, 0.1, hole.z1 - hole.z0, wood, hole.x0, 3.12, (hole.z0 + hole.z1) / 2);
  addBox(g, 0.12, 0.1, hole.z1 - hole.z0, wood, hole.x1, 3.12, (hole.z0 + hole.z1) / 2);

  const curbY = H + 0.42;
  addBox(g, hole.x1 - hole.x0 + 0.12, 0.84, 0.08, wood, (hole.x0 + hole.x1) / 2, curbY, hole.z0);
  addBox(g, hole.x1 - hole.x0 + 0.12, 0.84, 0.08, wood, (hole.x0 + hole.x1) / 2, curbY, hole.z1);
  addBox(g, 0.08, 0.84, hole.z1 - hole.z0, wood, hole.x0, curbY, (hole.z0 + hole.z1) / 2);
  addBox(g, 0.08, 0.84, hole.z1 - hole.z0, wood, hole.x1, curbY, (hole.z0 + hole.z1) / 2);
  const lanternGlass = toon(s.glass, { transparent: true, opacity: 0.16, side: THREE.DoubleSide, depthWrite: false });
  addBox(g, hole.x1 - hole.x0 - 0.1, 0.7, 0.02, lanternGlass, (hole.x0 + hole.x1) / 2, curbY, hole.z0 + 0.02, { shadow: false });
  addBox(g, hole.x1 - hole.x0 - 0.1, 0.7, 0.02, lanternGlass, (hole.x0 + hole.x1) / 2, curbY, hole.z1 - 0.02, { shadow: false });
  addBox(g, 0.02, 0.7, hole.z1 - hole.z0 - 0.1, lanternGlass, hole.x0 + 0.02, curbY, (hole.z0 + hole.z1) / 2, { shadow: false });
  addBox(g, 0.02, 0.7, hole.z1 - hole.z0 - 0.1, lanternGlass, hole.x1 - 0.02, curbY, (hole.z0 + hole.z1) / 2, { shadow: false });
  const roof = new THREE.Mesh(new THREE.ConeGeometry(1.35, 0.42, 4), toon('#f4efe4', { transparent: true, opacity: 0.34, side: THREE.DoubleSide, depthWrite: false }));
  roof.position.set(1.7, H + 1.02, 1.02);
  roof.rotation.y = Math.PI / 4;
  roof.userData.noShadow = true;
  g.add(roof);
  const peak = [1.7, H + 1.26, 1.02];
  const curb = H + 0.84;
  for (const corner of [[hole.x0, curb, hole.z0], [hole.x1, curb, hole.z0], [hole.x0, curb, hole.z1], [hole.x1, curb, hole.z1]]) {
    const dir = new THREE.Vector3(peak[0] - corner[0], peak[1] - corner[1], peak[2] - corner[2]);
    const len = dir.length();
    const hip = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, len, 6), wood);
    hip.position.set((peak[0] + corner[0]) / 2, (peak[1] + corner[1]) / 2, (peak[2] + corner[2]) / 2);
    hip.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
    hip.castShadow = true;
    g.add(hip);
  }
  addBox(g, 0.07, 0.14, 0.07, brass, 1.7, H + 1.32, 1.02);

  return g;
}

function makeProps(layout) {
  const g = new THREE.Group();
  g.name = 'props';
  const s = layout.shell;
  const wood = toon(s.wood);
  const woodDark = toon(s.woodDark);
  const stone = toon(s.stone);
  const brass = toon(s.brass);
  const ink = toon(s.ink);
  const metal = toon('#8a8680');
  const cream = toon('#f4ecdf');
  const glassMat = toon(s.glass, { transparent: true, opacity: 0.28, side: THREE.DoubleSide, depthWrite: false });

  const counter = byId(layout, 'counter');
  const cx = counter.position[0];
  const cz = counter.position[2];

  addBox(g, 5.55, 0.86, 0.46, wood, -1.4, 0.43, -3.48);
  addBox(g, 5.35, 0.1, 0.34, ink, -1.4, 0.08, -3.5);
  addBox(g, 5.62, 0.05, 0.52, stone, -1.4, 0.9, -3.46);
  const splashMap = tileTexture();
  splashMap.wrapS = THREE.RepeatWrapping;
  splashMap.wrapT = THREE.RepeatWrapping;
  splashMap.repeat.set(6, 1.4);
  const splash = new THREE.Mesh(new THREE.BoxGeometry(5.4, 0.7, 0.04), toon('#ffffff', { map: splashMap }));
  splash.position.set(-1.35, 1.28, -3.68);
  splash.castShadow = true;
  splash.receiveShadow = true;
  g.add(splash);
  addBox(g, 5.5, 0.05, 0.32, wood, -1.35, 1.66, -3.58);
  const strip = addBox(g, 3.4, 0.015, 0.04, toon('#fff1d0', { emissive: '#ffc98a', emissiveIntensity: 1 }), -1.2, 1.62, -3.44, { name: 'bulb', userData: { bulb: true }, shadow: false });
  strip.userData.bulb = true;

  const menu = new THREE.Mesh(new THREE.BoxGeometry(1.85, 0.98, 0.04), toon('#ffffff', { map: menuTexture() }));
  menu.position.set(-1.15, 2.12, -3.64);
  menu.castShadow = true;
  g.add(menu);
  addBox(g, 1.98, 0.06, 0.06, wood, -1.15, 2.64, -3.62);
  addBox(g, 1.98, 0.06, 0.06, wood, -1.15, 1.6, -3.62);

  const signMap = signTexture();
  const sign = new THREE.Mesh(
    new THREE.BoxGeometry(0.86, 0.28, 0.03),
    toon('#ffffff', { map: signMap, side: THREE.DoubleSide }),
  );
  sign.position.set(-1.15, 2.42, -1.26);
  sign.castShadow = true;
  g.add(sign);
  addCyl(g, 0.008, 0.008, 0.18, brass, -1.15, 2.64, -1.26, 6);

  for (const lx of [-1.5, -0.7, 0.1, 0.7]) {
    addCyl(g, 0.02, 0.02, 0.22, brass, cx + lx, 0.22, cz + 0.46, 8);
  }
  addCyl(g, 0.016, 0.016, 2.2, brass, cx - 0.35, 0.22, cz + 0.44, 8).rotation.z = Math.PI / 2;

  addBox(g, 1.15, 0.012, 0.28, ink, cx + 0.15, 1.058, cz + 0.08);

  const px = cx - 1.55;
  const pz = cz + 0.02;
  addBox(g, 0.52, 0.06, 0.36, wood, px, 1.08, pz);
  addBox(g, 0.5, 0.32, 0.015, glassMat, px, 1.27, pz + 0.17, { shadow: false });
  addBox(g, 0.5, 0.32, 0.015, glassMat, px, 1.27, pz - 0.17, { shadow: false });
  addBox(g, 0.015, 0.32, 0.34, glassMat, px - 0.25, 1.27, pz, { shadow: false });
  addBox(g, 0.015, 0.32, 0.34, glassMat, px + 0.25, 1.27, pz, { shadow: false });
  addBox(g, 0.52, 0.025, 0.36, wood, px, 1.44, pz);
  addBox(g, 0.42, 0.015, 0.26, stone, px, 1.16, pz);
  const pastries = [
    [ -0.14, 1.2, 0.04, 0.07, 0 ],
    [ -0.02, 1.21, -0.05, 0.055, 1 ],
    [ 0.1, 1.19, 0.05, 0.06, 2 ],
    [ -0.1, 1.32, -0.02, 0.05, 3 ],
    [ 0.06, 1.33, 0.06, 0.045, 4 ],
  ];
  for (const [ox, oy, oz, r, ci] of pastries) {
    addCyl(g, r, r * 0.92, 0.045, toon(PASTRY[ci]), px + ox, oy, pz + oz, 10);
  }
  addCyl(g, 0.012, 0.012, 0.08, brass, px + 0.12, 1.2, pz - 0.06, 6);
  addCyl(g, 0.06, 0.06, 0.012, stone, px + 0.12, 1.245, pz - 0.06, 10);

  addCyl(g, 0.07, 0.08, 0.22, metal, cx + 0.55, 1.16, cz + 0.1, 12);
  addCyl(g, 0.09, 0.045, 0.1, toon('#ded6cc'), cx + 0.55, 1.32, cz + 0.1, 12);
  addBox(g, 0.06, 0.04, 0.08, ink, cx + 0.55, 1.08, cz + 0.16);
  addCyl(g, 0.045, 0.05, 0.1, metal, cx + 0.78, 1.1, cz + 0.12, 10);
  addBox(g, 0.16, 0.08, 0.12, woodDark, cx + 0.78, 1.1, cz - 0.02);

  const syrup = ['#5c2a1c', '#c45c26', '#e6c27a', '#3a2418', '#8d3d2a'];
  syrup.forEach((color, i) => {
    const x = -2.15 + i * 0.09;
    addCyl(g, 0.028, 0.032, 0.16 + (i % 2) * 0.03, toon(color), x, 1.04, -3.46, 8);
    addCyl(g, 0.01, 0.014, 0.045, metal, x, 1.15, -3.46, 6);
  });
  addBox(g, 0.5, 0.015, 0.14, wood, -1.97, 0.95, -3.46);

  for (let i = 0; i < 5; i++) {
    addCyl(g, 0.038, 0.034, 0.07, cream, cx - 0.08, 1.1 + i * 0.07, cz + 0.16, 10);
    if (i % 2 === 0) addCyl(g, 0.04, 0.04, 0.02, toon('#6d4c38'), cx - 0.08, 1.09 + i * 0.07, cz + 0.16, 10);
  }

  const platY = 0.14;
  addBox(g, 2.15, platY, 2.78, wood, -3.48, platY / 2, 1.58);
  addBox(g, 2.05, 0.012, 1.15, toon('#8a4a46'), -3.5, platY + 0.008, 1.7);
  addBox(g, 1.9, 0.008, 1.0, toon('#c4a574'), -3.5, platY + 0.016, 1.7);
  addBox(g, 0.32, 0.07, 2.7, woodDark, -2.28, 0.035, 1.58);
  addBox(g, 0.32, 0.015, 2.7, brass, -2.28, 0.075, 1.58);

  bookRow(g, -4.42, 0.84, 0.95, Math.PI / 2, 6);
  bookRow(g, -4.4, 0.84, 1.85, Math.PI / 2, 5);
  bookRow(g, -4.46, 1.36, -0.05, Math.PI / 2, 4);
  bookRow(g, 4.4, 0.05, 1.5, Math.PI / 2, 6);
  bookRow(g, 4.4, 0.47, 1.5, Math.PI / 2, 7);
  bookRow(g, 4.4, 0.89, 1.5, Math.PI / 2, 6);
  bookRow(g, 4.4, 1.31, 1.5, Math.PI / 2, 5);
  bookRow(g, -3.95, 0.88, 1.38, 0.3, 3);

  for (const pot of layout.instances.filter((item) => item.kind === 'flowerpot')) {
    const sc = pot.scale || 1;
    const kind = sc < 0.6 ? 'herb' : 'ficus';
    foliage(g, pot.position[0], pot.position[1] + 0.28 * sc, pot.position[2], 1.15 * sc, kind);
  }

  const hang = { x: 2.32, y: 3.05, z: 1.42 };
  addCyl(g, 0.004, 0.004, 0.45, brass, hang.x, hang.y - 0.1, hang.z, 4, { shadow: false });
  addCyl(g, 0.08, 0.06, 0.1, toon('#8d4a3a'), hang.x, hang.y - 0.38, hang.z, 10);
  foliage(g, hang.x, hang.y - 0.32, hang.z, 0.85, 'herb');

  addCyl(g, 0.006, 0.006, 1.35, ink, 1.65, 3.12, 0.95, 6, { shadow: false });
  addCyl(g, 0.006, 0.006, 0.38, ink, 3.15, 3.06, -0.55, 6, { shadow: false });

  for (const [x, y, z] of [[-3.15, 2.55, -2.55], [-1.9, 2.55, -2.4], [-0.85, 2.55, -2.6], [0.2, 2.55, -2.35]]) {
    addCyl(g, 0.045, 0.055, 0.08, ink, x, y, z, 10);
    const bulb = addCyl(g, 0.03, 0.03, 0.02, toon('#fff1d0', { emissive: '#ffc98a' }), x, y - 0.05, z, 8, { name: 'bulb', userData: { bulb: true }, shadow: false });
    bulb.userData.bulb = true;
  }

  for (const z of [0.32, 2.64]) {
    addBox(g, 0.02, 0.16, 0.1, brass, -4.66, 1.78, z);
    addCyl(g, 0.012, 0.012, 0.22, brass, -4.54, 1.78, z, 6).rotation.z = Math.PI / 2;
    addCyl(g, 0.07, 0.05, 0.08, cream, -4.4, 1.74, z, 10);
    const bulb = addCyl(g, 0.035, 0.035, 0.02, toon('#fff1d0', { emissive: '#ffc98a' }), -4.4, 1.69, z, 8, { name: 'bulb', userData: { bulb: true }, shadow: false });
    bulb.userData.bulb = true;
  }

  const face = new THREE.Mesh(new THREE.CircleGeometry(0.16, 20), cream);
  face.position.set(4.62, 2.15, -1.55);
  face.rotation.y = -Math.PI / 2;
  g.add(face);
  addCyl(g, 0.17, 0.17, 0.02, brass, 4.6, 2.15, -1.55, 20).rotation.z = Math.PI / 2;
  const hand = addBox(g, 0.012, 0.1, 0.012, ink, 4.6, 2.18, -1.55);
  hand.rotation.x = 0.4;

  addBox(g, 0.46, 0.32, 0.03, wood, 4.64, 1.7, 2.35);
  addBox(g, 0.38, 0.24, 0.02, toon('#d8c4a4'), 4.64, 1.7, 2.33);
  addBox(g, 0.34, 0.46, 0.03, wood, 4.64, 1.85, -2.15);
  addBox(g, 0.26, 0.38, 0.02, toon('#c46a4a'), 4.64, 1.85, -2.13);

  addBox(g, 0.18, 0.012, 0.14, toon(BOOK[2]), -4.18, 0.2, 2.68);
  addBox(g, 0.15, 0.012, 0.12, toon(BOOK[5]), -4.16, 0.214, 2.66);

  return g;
}

function makeLights() {
  const lights = [];
  const add = (color, intensity, distance, x, y, z) => {
    const light = new THREE.PointLight(color, intensity, distance, 2);
    light.position.set(x, y, z);
    lights.push(light);
  };
  add(0xffc98a, 0.55, 4.2, -1.2, 1.55, -3.2);
  add(0xffe2b8, 0.28, 5.5, 1.7, 3.7, 1.0);
  for (const x of [-3.15, -1.9, -0.85, 0.2]) add(0xffb36b, 0.18, 2.2, x, 2.35, -2.45);
  for (const z of [0.32, 2.64]) add(0xffc98a, 0.32, 2.3, -4.35, 1.72, z);
  return lights;
}

boot({
  build(api) {
    return {
      shell: makeShell(api.layout),
      props: makeProps(api.layout),
      lights: makeLights(),
    };
  },
}).catch((err) => {
  console.error(err);
  const status = document.getElementById('status');
  if (status) status.textContent = 'error: ' + err.message;
});
