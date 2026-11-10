import * as THREE from 'three';
import { boot, toon, addBox, addCyl, canvasTexture } from './scene_runtime.js';

const CERAMIC = ['#f4efe6', '#efe4d4', '#e8dcc8', '#f7f1e8'];

function norenTexture() {
  return canvasTexture((ctx, w, h) => {
    ctx.fillStyle = '#6b1d1d';
    ctx.fillRect(0, 0, w, h);
    const slit = 18;
    for (let i = 1; i < 4; i++) {
      ctx.fillStyle = '#4a1212';
      ctx.fillRect((w * i) / 4 - slit / 2, 28, slit, h - 36);
    }
    ctx.fillStyle = '#f3ead8';
    ctx.font = '600 92px Georgia, Palatino, serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('檜', w / 2, h / 2 - 18);
    ctx.font = '22px Georgia, serif';
    ctx.fillStyle = '#e8c9a0';
    ctx.fillText('H I N O K I', w / 2, h / 2 + 58);
  }, 768, 280);
}

function menuTexture() {
  return canvasTexture((ctx, w, h) => {
    ctx.fillStyle = '#1c1612';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#c4a06a';
    ctx.lineWidth = 8;
    ctx.strokeRect(16, 16, w - 32, h - 32);
    ctx.fillStyle = '#f3ead8';
    ctx.font = '600 36px Georgia, serif';
    ctx.fillText('献立', 40, 70);
    ctx.font = '20px Georgia, serif';
    ctx.fillStyle = '#d7c4a2';
    const lines = ['maguro  nigiri', 'hotate  gunkan', 'unagi  don', 'yasai  tempura', 'miso  shiru', 'tamago  yaki', 'sake  /  cha'];
    lines.forEach((line, i) => ctx.fillText(line, 40, 120 + i * 42));
  }, 280, 520);
}

function exteriorTexture() {
  return canvasTexture((ctx, w, h) => {
    const sky = ctx.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, '#c5d4c8');
    sky.addColorStop(1, '#e4ddd0');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#8a9a88';
    ctx.fillRect(0, h * 0.58, w, h * 0.42);
    ctx.fillStyle = '#6a5340';
    ctx.fillRect(w * 0.12, h * 0.22, w * 0.22, h * 0.4);
    ctx.fillStyle = '#7a4434';
    ctx.beginPath();
    ctx.moveTo(w * 0.08, h * 0.24);
    ctx.lineTo(w * 0.23, h * 0.1);
    ctx.lineTo(w * 0.38, h * 0.24);
    ctx.fill();
    ctx.fillStyle = '#2f6b3c';
    ctx.beginPath();
    ctx.arc(w * 0.72, h * 0.5, 64, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#245532';
    ctx.beginPath();
    ctx.arc(w * 0.84, h * 0.56, 42, 0, Math.PI * 2);
    ctx.fill();
  }, 512, 512);
}

function foliage(g, x, y, z, scale) {
  const stem = toon('#4a5a32');
  const leaf = toon('#2f6a3c');
  const leaf2 = toon('#245532');
  addCyl(g, 0.012 * scale, 0.016 * scale, 0.16 * scale, stem, x, y + 0.08 * scale, z, 8);
  const a = new THREE.Mesh(new THREE.SphereGeometry(0.12 * scale, 10, 8), leaf);
  a.position.set(x, y + 0.24 * scale, z);
  a.scale.set(1.05, 0.82, 0.95);
  a.castShadow = true;
  g.add(a);
  const b = new THREE.Mesh(new THREE.SphereGeometry(0.08 * scale, 10, 8), leaf2);
  b.position.set(x + 0.06 * scale, y + 0.3 * scale, z - 0.04 * scale);
  b.castShadow = true;
  g.add(b);
  const c = new THREE.Mesh(new THREE.SphereGeometry(0.07 * scale, 8, 6), leaf);
  c.position.set(x - 0.05 * scale, y + 0.28 * scale, z + 0.05 * scale);
  c.castShadow = true;
  g.add(c);
}

function lantern(g, x, y, z) {
  const paper = toon('#e8c56b', { emissive: '#ffc98a', emissiveIntensity: 0.55 });
  const wood = toon('#3a2a1a');
  addCyl(g, 0.012, 0.012, 0.72, wood, x, y + 0.5, z, 6, { shadow: false });
  addCyl(g, 0.145, 0.13, 0.3, paper, x, y, z, 14);
  addCyl(g, 0.12, 0.12, 0.02, wood, x, y + 0.16, z, 12);
  addCyl(g, 0.12, 0.12, 0.02, wood, x, y - 0.16, z, 12);
  const glow = addCyl(g, 0.04, 0.04, 0.04, toon('#fff1d0', { emissive: '#ffc98a', emissiveIntensity: 1 }), x, y, z, 8, {
    name: 'lantern_glow',
    userData: { bulb: true },
    shadow: false,
  });
  glow.userData.bulb = true;
}

function placeSetting(g, x, z, rot = 0) {
  const grp = new THREE.Group();
  addCyl(grp, 0.09, 0.09, 0.012, toon(CERAMIC[0]), 0, 0.006, 0, 16);
  addCyl(grp, 0.055, 0.055, 0.01, toon(CERAMIC[2]), 0.12, 0.006, 0.02, 14);
  addBox(grp, 0.16, 0.006, 0.012, toon('#2a2018'), 0.02, 0.01, -0.12);
  addBox(grp, 0.16, 0.006, 0.012, toon('#2a2018'), 0.02, 0.016, -0.1);
  grp.position.set(x, 0.77, z);
  grp.rotation.y = rot;
  grp.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  g.add(grp);
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
  const ceilMat = toon(s.ceiling);
  const accent = toon(s.accent);

  addBox(g, W, 0.08, D, toon(s.floorColor), 0, -0.04, 0);
  const tones = [s.plankA, s.plankB, s.plankC, '#c4a06a', '#a97844'];
  let pz = z0 + 0.06;
  let pi = 0;
  while (pz < z1 - 0.05) {
    const d = 0.16 + (pi % 3) * 0.012;
    addBox(g, W - 0.1, 0.014, d - 0.01, toon(tones[pi % tones.length]), 0, 0.01, pz + d / 2, { shadow: false });
    pz += d;
    pi += 1;
  }

  addBox(g, 1.35, 0.018, D - 1.6, toon(s.runner), -2.35, 0.022, 0.15);
  addBox(g, 1.15, 0.01, D - 1.9, accent, -2.35, 0.03, 0.15);

  addBox(g, 0.14, H, D, plaster, x0 - 0.07, H / 2, 0);

  const winX0 = 1.55;
  const winX1 = 4.95;
  const winY0 = 1.08;
  const winY1 = 2.62;
  addBox(g, winX0 - x0, H, 0.14, plaster, (x0 + winX0) / 2, H / 2, z0 - 0.07);
  addBox(g, x1 - winX1, H, 0.14, plaster, (winX1 + x1) / 2, H / 2, z0 - 0.07);
  addBox(g, winX1 - winX0, winY0, 0.14, plaster, (winX0 + winX1) / 2, winY0 / 2, z0 - 0.07);
  addBox(g, winX1 - winX0, H - winY1, 0.14, plaster, (winX0 + winX1) / 2, (H + winY1) / 2, z0 - 0.07);
  addBox(g, winX1 - winX0 + 0.28, 0.08, 0.28, woodL, (winX0 + winX1) / 2, winY0 - 0.02, z0 + 0.2);
  addBox(g, winX1 - winX0 + 0.2, 0.06, 0.08, wood, (winX0 + winX1) / 2, winY1 + 0.04, z0 + 0.08);
  addBox(g, 0.07, winY1 - winY0 + 0.12, 0.08, wood, winX0 - 0.04, (winY0 + winY1) / 2, z0 + 0.08);
  addBox(g, 0.07, winY1 - winY0 + 0.12, 0.08, wood, winX1 + 0.04, (winY0 + winY1) / 2, z0 + 0.08);
  const glass = toon(s.glass, { transparent: true, opacity: 0.28, side: THREE.DoubleSide, depthWrite: false });
  addBox(g, winX1 - winX0, winY1 - winY0, 0.03, glass, (winX0 + winX1) / 2, (winY0 + winY1) / 2, z0 + 0.02, { shadow: false });
  for (const x of [2.4, 3.25, 4.1]) addBox(g, 0.05, winY1 - winY0, 0.05, woodL, x, (winY0 + winY1) / 2, z0 + 0.06);
  addBox(g, winX1 - winX0, 0.04, 0.05, woodL, (winX0 + winX1) / 2, 1.85, z0 + 0.06);
  const outside = new THREE.Mesh(
    new THREE.PlaneGeometry(winX1 - winX0 + 0.5, winY1 - winY0 + 0.35),
    toon('#ffffff', { map: exteriorTexture(), side: THREE.DoubleSide }),
  );
  outside.position.set((winX0 + winX1) / 2, (winY0 + winY1) / 2, z0 - 0.28);
  outside.userData.noShadow = true;
  g.add(outside);

  addBox(g, W - 0.2, 0.98, 0.06, wood, 0.05, 0.49, z0 + 0.05);
  addBox(g, 0.06, 0.98, D - 0.3, wood, x0 + 0.05, 0.49, 0.05);
  addBox(g, W - 0.3, 0.05, 0.05, woodDark, 0, 0.99, z0 + 0.07);
  addBox(g, 0.05, 0.05, D - 0.4, woodDark, x0 + 0.07, 0.99, 0);
  addBox(g, W, 0.07, 0.08, woodDark, 0, 0.035, z0 + 0.02);
  addBox(g, 0.08, 0.07, D, woodDark, x0 + 0.02, 0.035, 0);
  addBox(g, W - 0.25, 0.08, 0.08, wood, 0, H - 0.1, z0 + 0.06);
  addBox(g, 0.08, 0.08, D - 0.3, wood, x0 + 0.06, H - 0.1, 0);

  for (let i = 0; i < 18; i++) {
    addBox(g, 0.055, 2.15, 0.035, woodDark, x0 + 0.12, 1.55, z0 + 0.55 + i * 0.42);
  }

  addBox(g, W * 0.9, 0.1, D * 0.52, ceilMat, -0.1, H - 0.05, -D * 0.08, { shadow: false });
  addBox(g, W * 0.86, 0.05, 0.12, woodDark, -0.05, H - 0.16, -0.35);
  addBox(g, W * 0.86, 0.05, 0.12, woodDark, -0.05, H - 0.16, -2.05);
  addBox(g, 0.12, 0.05, D * 0.48, woodDark, -1.15, H - 0.16, -D * 0.08);
  addBox(g, 0.12, 0.05, D * 0.48, woodDark, 2.55, H - 0.16, -D * 0.08);
  const cove = addBox(g, W * 0.62, 0.02, 0.06, toon('#fff1d0', { emissive: '#ffc98a', emissiveIntensity: 0.85 }), 0.35, H - 0.22, z0 + 0.22, {
    name: 'bulb',
    userData: { bulb: true },
    shadow: false,
  });
  cove.userData.bulb = true;

  addBox(g, 3.35, 0.62, 0.04, accent, -1.35, 2.38, z0 + 0.09);
  const noren = new THREE.Mesh(new THREE.BoxGeometry(3.15, 0.5, 0.02), toon('#ffffff', { map: norenTexture() }));
  noren.position.set(-1.35, 2.36, z0 + 0.12);
  noren.castShadow = true;
  g.add(noren);
  addBox(g, 3.2, 0.05, 0.05, woodL, -1.35, 2.64, z0 + 0.13);

  return g;
}

function makeProps(layout) {
  const g = new THREE.Group();
  g.name = 'props';
  const s = layout.shell;
  const wood = toon(s.wood);
  const woodDark = toon(s.woodDark);
  const woodL = toon(s.woodLight);
  const ink = toon(s.ink);
  const ceramic = toon('#f4f0e8');
  const metal = toon('#6a6e72');

  addBox(g, 4.35, 0.9, 0.7, wood, -0.7, 0.45, -3.82);
  addBox(g, 4.2, 0.08, 0.18, woodDark, -0.7, 0.08, -3.5);
  addBox(g, 4.45, 0.05, 0.78, woodL, -0.7, 0.92, -3.82);
  addBox(g, 4.15, 0.035, 0.52, ink, -0.7, 0.96, -3.9);
  addBox(g, 4.2, 0.7, 0.04, toon('#3a2a22'), -0.7, 1.28, -4.12);
  const strip = addBox(g, 3.6, 0.015, 0.04, toon('#fff1d0', { emissive: '#ffc98a', emissiveIntensity: 1 }), -0.55, 1.62, -4.05, {
    name: 'bulb',
    userData: { bulb: true },
    shadow: false,
  });
  strip.userData.bulb = true;
  addBox(g, 3.8, 0.04, 0.22, wood, -0.55, 1.66, -4.08);

  for (let i = 0; i < 7; i++) {
    addCyl(g, 0.085, 0.085, 0.016, ceramic, -1.85 + i * 0.17, 1.0, -3.62, 14);
    addCyl(g, 0.075, 0.075, 0.014, ceramic, -1.85 + i * 0.17, 1.02, -3.62, 14);
  }
  for (const x of [0.15, 0.32, 0.5, 0.68]) {
    addCyl(g, 0.028, 0.032, 0.15, toon('#1a120e'), x, 1.06, -3.58, 8);
    addCyl(g, 0.01, 0.014, 0.04, metal, x, 1.16, -3.58, 6);
  }
  addCyl(g, 0.07, 0.08, 0.12, toon('#6b1d1d'), 1.15, 1.04, -3.58, 10);
  addCyl(g, 0.06, 0.05, 0.04, ceramic, 1.15, 1.12, -3.58, 10);
  for (let i = 0; i < 4; i++) {
    addCyl(g, 0.05, 0.055, 0.035, toon('#d8c4a0'), 1.55 + i * 0.14, 1.0, -3.6, 12);
  }
  addBox(g, 0.55, 0.04, 0.28, woodL, 2.35, 0.99, -3.58);
  addBox(g, 0.22, 0.08, 0.16, toon('#3a2420'), 2.28, 1.06, -3.55);
  addBox(g, 0.16, 0.05, 0.12, ceramic, 2.48, 1.04, -3.52);

  const menu = new THREE.Mesh(new THREE.BoxGeometry(0.55, 1.42, 0.04), toon('#ffffff', { map: menuTexture() }));
  menu.position.set(5.28, 2.05, -4.22);
  menu.castShadow = true;
  g.add(menu);
  addBox(g, 0.62, 0.05, 0.06, wood, 5.28, 2.78, -4.2);
  addBox(g, 0.62, 0.05, 0.06, wood, 5.28, 1.32, -4.2);

  addBox(g, 0.72, 0.88, 0.42, woodDark, 4.45, 0.44, -3.15);
  addBox(g, 0.76, 0.04, 0.46, woodL, 4.45, 0.9, -3.15);
  addBox(g, 0.28, 0.22, 0.18, ink, 4.38, 1.04, -3.12);
  addCyl(g, 0.05, 0.05, 0.1, ceramic, 4.58, 0.97, -3.05, 10);
  addCyl(g, 0.11, 0.12, 0.42, metal, 4.85, 0.22, 3.05, 12);

  for (const t of layout.instances.filter((item) => item.kind === 'dining_table')) {
    const [tx, , tz] = t.position;
    placeSetting(g, tx - 0.55, tz + 0.22, 0.2);
    placeSetting(g, tx + 0.12, tz - 0.18, -0.4);
    placeSetting(g, tx + 0.62, tz + 0.12, 0.7);
    addBox(g, 0.16, 0.08, 0.12, metal, tx + 0.08, 0.81, tz + 0.02);
    addBox(g, 0.12, 0.06, 0.02, toon('#f4efe4'), tx + 0.08, 0.82, tz + 0.04);
  }

  for (const booth of layout.instances.filter((item) => item.kind === 'diner_booth')) {
    lantern(g, booth.position[0], 2.32, booth.position[2]);
  }

  for (const pot of layout.instances.filter((item) => item.kind === 'flowerpot')) {
    const sc = pot.scale || 1;
    foliage(g, pot.position[0], pot.position[1] + 0.22 * sc, pot.position[2], 1.1 * sc);
  }

  addBox(g, 0.42, 0.28, 0.03, wood, 4.72, 1.72, 1.15);
  addBox(g, 0.34, 0.22, 0.02, toon('#c46a4a'), 4.72, 1.72, 1.13);
  addBox(g, 0.36, 0.48, 0.03, wood, 4.72, 1.85, -0.85);
  addBox(g, 0.28, 0.4, 0.02, toon('#6b1d1d'), 4.72, 1.85, -0.83);

  addBox(g, 0.18, 0.012, 0.14, toon('#6e3b32'), 4.2, 0.02, 3.35);
  addBox(g, 0.15, 0.012, 0.12, toon('#2f4a3c'), 4.22, 0.034, 3.33);

  return g;
}

function makeLights(layout) {
  const lights = [];
  const add = (color, intensity, distance, x, y, z) => {
    const light = new THREE.PointLight(color, intensity, distance, 2);
    light.position.set(x, y, z);
    lights.push(light);
  };
  add(0xffc98a, 0.48, 4.4, -0.6, 1.55, -3.5);
  for (const booth of layout.instances.filter((item) => item.kind === 'diner_booth')) {
    add(0xffb36b, 0.32, 2.6, booth.position[0], 2.15, booth.position[2]);
  }
  for (const t of layout.instances.filter((item) => item.kind === 'dining_table')) {
    add(0xffc98a, 0.22, 2.4, t.position[0], 2.15, t.position[2]);
  }
  add(0xd5e6f6, 0.22, 5.0, 2.7, 1.9, -3.6);
  return lights;
}

boot({
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
