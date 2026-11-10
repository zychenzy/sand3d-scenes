import * as THREE from 'three';
import { boot, toon, addBox, addCyl, canvasTexture } from './scene_runtime.js';

function landscapeTexture() {
  return canvasTexture((ctx, w, h) => {
    const sky = ctx.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, '#c8d8ea');
    sky.addColorStop(0.42, '#e4eaf0');
    sky.addColorStop(0.55, '#d5c4a4');
    sky.addColorStop(1, '#8aa05a');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#7a8f4e';
    ctx.beginPath();
    ctx.moveTo(0, h * 0.58);
    ctx.quadraticCurveTo(w * 0.25, h * 0.44, w * 0.5, h * 0.56);
    ctx.quadraticCurveTo(w * 0.72, h * 0.66, w, h * 0.5);
    ctx.lineTo(w, h);
    ctx.lineTo(0, h);
    ctx.fill();
    ctx.fillStyle = '#6a7f42';
    ctx.fillRect(0, h * 0.7, w, h * 0.3);
    ctx.fillStyle = '#cfc8b8';
    for (let i = 0; i < 5; i++) {
      const x = w * (0.08 + i * 0.18);
      ctx.fillRect(x, h * 0.52, 10, h * 0.12);
      ctx.fillStyle = i % 2 ? '#b7c4d4' : '#cfd6de';
      ctx.fillRect(x + 14, h * 0.48, 22, 18);
      ctx.fillStyle = '#cfc8b8';
    }
    ctx.fillStyle = '#5a4a38';
    ctx.fillRect(0, h * 0.78, w, 8);
  }, 1024, 512);
}

function destTexture() {
  return canvasTexture((ctx, w, h) => {
    ctx.fillStyle = '#1e2a36';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#e2b83a';
    ctx.fillRect(0, 0, w, 10);
    ctx.fillRect(0, h - 10, w, 10);
    ctx.fillStyle = '#f4ead8';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '700 64px Georgia, serif';
    ctx.fillText('DINING', w / 2, h * 0.38);
    ctx.font = '500 28px Georgia, serif';
    ctx.fillStyle = '#e2b83a';
    ctx.fillText('COACH  ·  4218', w / 2, h * 0.68);
  }, 640, 220);
}

function menuTexture() {
  return canvasTexture((ctx, w, h) => {
    ctx.fillStyle = '#2a2420';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#e2b83a';
    ctx.fillRect(0, 0, w, 70);
    ctx.fillStyle = '#2a2420';
    ctx.font = '700 36px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillText('TODAY', w / 2, 46);
    ctx.fillStyle = '#f4ead8';
    ctx.font = '600 28px Georgia, serif';
    ['full breakfast', 'rarebit', 'pot of tea', 'coach cake'].forEach((line, i) => {
      ctx.fillText(line, w / 2, 120 + i * 48);
    });
  }, 420, 320);
}

function carpetTexture() {
  return canvasTexture((ctx, w, h) => {
    ctx.fillStyle = '#6e4a3a';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#5a3a2c';
    for (let y = 8; y < h; y += 18) ctx.fillRect(0, y, w, 3);
    ctx.fillStyle = '#c49a3a';
    ctx.fillRect(6, 0, 4, h);
    ctx.fillRect(w - 10, 0, 4, h);
  }, 64, 512);
}

function bulb(g, x, y, z, r = 0.035) {
  const mesh = addCyl(g, r, r, 0.025, toon('#fff1d0', { emissive: '#ffc98a', emissiveIntensity: 1 }), x, y, z, 10, {
    name: 'bulb',
    userData: { bulb: true },
    shadow: false,
  });
  mesh.userData.bulb = true;
  return mesh;
}

function addSuitcase(g, x, y, z, w, h, d, color, ry = 0) {
  const grp = new THREE.Group();
  const leather = toon(color);
  const dark = toon('#3a322c');
  addBox(grp, w, h, d, leather, 0, h / 2, 0);
  addBox(grp, w * 0.55, 0.03, 0.04, dark, 0, h + 0.02, 0);
  addBox(grp, 0.03, h * 0.55, 0.03, dark, -w / 2 + 0.02, h * 0.45, 0);
  addBox(grp, 0.03, h * 0.55, 0.03, dark, w / 2 - 0.02, h * 0.45, 0);
  grp.position.set(x, y, z);
  grp.rotation.y = ry;
  g.add(grp);
  return grp;
}

function addWallTable(g, xWall, z, mats) {
  const topW = 0.68;
  const topD = 1.22;
  const topY = 0.73;
  const cx = xWall + topW / 2 + 0.03;
  addBox(g, topW, 0.045, topD, mats.wood, cx, topY, z);
  addBox(g, topW + 0.02, 0.02, topD + 0.02, mats.woodDark, cx, topY - 0.028, z);
  addBox(g, 0.1, 0.035, topD * 0.72, mats.metal, xWall + 0.08, topY - 0.02, z);
  addBox(g, 0.14, 0.64, 0.9, mats.ped, cx - 0.1, 0.32, z);
  addBox(g, 0.26, 0.045, 0.98, mats.ped, cx - 0.08, 0.025, z);
  addBox(g, 0.18, 0.035, 0.86, mats.ped, cx - 0.08, 0.655, z);
}

function addAisleTable(g, x, z, mats) {
  const topW = 0.7;
  const topD = 1.22;
  const topY = 0.73;
  addBox(g, topW, 0.045, topD, mats.wood, x, topY, z);
  addBox(g, topW + 0.02, 0.02, topD + 0.02, mats.woodDark, x, topY - 0.028, z);
  addBox(g, 0.14, 0.64, 0.92, mats.ped, x, 0.32, z);
  addBox(g, 0.28, 0.045, 1.02, mats.ped, x, 0.025, z);
  addBox(g, 0.2, 0.035, 0.88, mats.ped, x, 0.655, z);
}

function addPartition(g, x, z, seatW, h, mats) {
  addBox(g, seatW, h, 0.055, mats.yellow, x, h / 2, z);
  addBox(g, seatW + 0.04, 0.035, 0.08, mats.cap, x, h + 0.015, z);
  const aisleEdge = x > 0 ? x - seatW / 2 - 0.05 : x + seatW / 2 + 0.05;
  addBox(g, 0.09, h, 0.08, mats.yellow, aisleEdge, h / 2, z);
  addCyl(g, 0.018, 0.018, h * 0.55, mats.brass, aisleEdge + (x > 0 ? -0.05 : 0.05), h * 0.45, z, 8);
}

function makeShell(layout) {
  const g = new THREE.Group();
  g.name = 'shell';
  const { width: W, depth: D, height: H } = layout.meta.room;
  const s = layout.shell;
  const x0 = -W / 2;
  const z0 = -D / 2;
  const z1 = D / 2;
  const plaster = toon(s.wallColor);
  const panel = toon(s.panelColor);
  const wood = toon(s.woodColor);
  const woodL = toon(s.woodLight);
  const woodD = toon(s.woodDark);
  const body = toon(s.bodyColor);
  const bodyD = toon(s.bodyDark);
  const roof = toon(s.roofColor);
  const under = toon(s.underColor);
  const frame = toon(s.frameColor);
  const brass = toon(s.brass);
  const ink = toon(s.ink);
  const metal = toon(s.metal);
  const glass = toon(s.windowTint, { transparent: true, opacity: 0.28, side: THREE.DoubleSide, depthWrite: false });

  addBox(g, W, 0.08, D, toon(s.floorColor), 0, -0.04, 0);
  const tones = ['#c9a06a', '#b78a52', '#d0aa74', '#a87844'];
  let pz = z0 + 0.06;
  let pi = 0;
  while (pz < z1 - 0.05) {
    const d = 0.19 + (pi % 3) * 0.012;
    addBox(g, W - 0.18, 0.012, d - 0.01, toon(tones[pi % tones.length]), 0.02, 0.008, pz + d / 2, { shadow: false });
    pz += d;
    pi += 1;
  }
  const carpetMap = carpetTexture();
  carpetMap.wrapS = THREE.RepeatWrapping;
  carpetMap.wrapT = THREE.RepeatWrapping;
  carpetMap.repeat.set(1, 10);
  const runner = new THREE.Mesh(
    new THREE.BoxGeometry(0.64, 0.012, D - 0.5),
    toon('#6e4a3a', { map: carpetMap }),
  );
  runner.position.set(0, 0.016, 0);
  runner.receiveShadow = true;
  runner.castShadow = false;
  g.add(runner);
  addBox(g, 0.66, 0.01, 0.04, brass, 0, 0.022, z0 + 0.28);
  addBox(g, 0.66, 0.01, 0.04, brass, 0, 0.022, z1 - 0.28);

  addBox(g, 0.1, H, D, plaster, x0, H / 2, 0);
  addBox(g, 0.08, H + 0.18, D + 0.16, body, x0 - 0.09, H / 2 - 0.02, 0);
  addBox(g, 0.04, 1.02, D - 0.3, toon(s.wainscot), x0 + 0.08, 0.51, 0);
  addBox(g, 0.05, 0.05, D - 0.2, woodD, x0 + 0.1, 1.04, 0);

  const winH = 0.98;
  const winY = 1.46;
  const land = landscapeTexture();
  const outside = new THREE.Mesh(
    new THREE.PlaneGeometry(D - 1.1, winH + 0.2),
    toon('#ffffff', { map: land, side: THREE.DoubleSide }),
  );
  outside.position.set(x0 - 0.22, winY, 0.05);
  outside.rotation.y = Math.PI / 2;
  outside.userData.noShadow = true;
  g.add(outside);
  addBox(g, 0.03, winH, D - 1.35, glass, x0 + 0.08, winY, 0.08, { shadow: false });
  for (let z = z0 + 1.05; z < z1 - 0.7; z += 1.28) {
    addBox(g, 0.06, winH + 0.1, 0.07, frame, x0 + 0.09, winY, z);
  }
  addBox(g, 0.26, 0.055, D - 1.15, woodL, x0 + 0.22, winY - winH / 2 - 0.04, 0.05);
  addBox(g, 0.08, 0.05, D - 1.15, wood, x0 + 0.12, winY + winH / 2 + 0.04, 0.05);
  const blindZ = [-4.55, -0.05, 3.35];
  for (const z of blindZ) {
    addBox(g, 0.02, 0.42, 0.95, toon('#efe4cc'), x0 + 0.14, winY + 0.22, z, { shadow: false });
  }

  addBox(g, W, H, 0.1, plaster, 0, H / 2, z0);
  addBox(g, W + 0.18, H + 0.16, 0.08, bodyD, 0, H / 2 - 0.02, z0 - 0.09);
  addBox(g, 0.86, 2.05, 0.06, woodD, 0, 1.08, z0 + 0.08);
  addBox(g, 0.72, 1.82, 0.04, toon('#3a4450'), 0, 1.1, z0 + 0.12);
  addBox(g, 0.28, 0.42, 0.03, glass, 0, 1.72, z0 + 0.14, { shadow: false });
  addBox(g, 0.08, 0.08, 0.08, brass, -0.38, 1.05, z0 + 0.16);
  const dest = new THREE.Mesh(
    new THREE.BoxGeometry(0.72, 0.26, 0.03),
    toon('#ffffff', { map: destTexture() }),
  );
  dest.position.set(0, 2.12, z0 + 0.12);
  dest.castShadow = true;
  g.add(dest);

  // Galley marker: window-side stub + header only, so the cutaway still reads the dining bays.
  addBox(g, 1.18, 2.02, 0.08, plaster, -0.82, 1.01, 5.45);
  addBox(g, W * 0.84, 0.22, 0.08, plaster, -W * 0.08, H - 0.12, 5.45);
  addBox(g, 0.62, 0.38, 0.05, woodD, -0.55, 1.38, 5.5);
  addBox(g, 0.52, 0.28, 0.02, glass, -0.55, 1.38, 5.54, { shadow: false });

  addBox(g, W * 0.84, 0.07, D, roof, -W * 0.08, H + 0.02, 0);
  addBox(g, W * 0.88, 0.1, D + 0.18, bodyD, -W * 0.06, H + 0.12, 0);
  addBox(g, 0.7, 0.04, D - 0.8, metal, 0, H - 0.01, 0);
  for (let z = z0 + 1.4; z < z1 - 1.2; z += 1.3) {
    addBox(g, 0.62, 0.03, 0.08, metal, 0, H - 0.04, z);
    addCyl(g, 0.07, 0.07, 0.035, toon('#fff1d0', { emissive: '#ffc98a', emissiveIntensity: 1 }), 0, H - 0.08, z, 12, {
      name: 'bulb',
      userData: { bulb: true },
      shadow: false,
    }).userData.bulb = true;
  }

  addBox(g, 0.44, 0.035, D - 3.2, frame, x0 + 0.4, 1.96, 0.1);
  addBox(g, 0.03, 0.22, D - 3.2, frame, x0 + 0.2, 1.86, 0.1);
  addBox(g, 0.44, 0.035, D - 3.2, frame, 0.92, 1.96, 0.1);
  addBox(g, 0.03, 0.22, D - 3.2, frame, 1.12, 1.86, 0.1);

  addBox(g, 0.08, 0.08, D - 0.4, wood, x0 + 0.08, H - 0.08, 0);
  addBox(g, W * 0.8, 0.05, 0.05, wood, -0.1, H - 0.08, z0 + 0.08);

  addBox(g, W + 0.22, 0.16, D, under, 0, -0.18, 0);
  addBox(g, 0.04, 0.22, D + 0.1, under, x0 - 0.12, -0.12, 0);
  addBox(g, 0.04, 0.22, D + 0.1, under, W / 2 + 0.02, -0.12, 0);
  const wheel = toon('#1a1e24');
  for (const z of [-5.6, -2.1, 2.1, 5.6]) {
    addBox(g, W + 0.3, 0.12, 1.55, under, 0, -0.28, z);
    for (const x of [-0.92, 0.92]) {
      addCyl(g, 0.32, 0.32, 0.14, wheel, x, -0.52, z - 0.42, 18, { rz: Math.PI / 2 });
      addCyl(g, 0.32, 0.32, 0.14, wheel, x, -0.52, z + 0.42, 18, { rz: Math.PI / 2 });
    }
  }
  addCyl(g, 0.08, 0.08, 0.55, metal, 0, 0.55, z0 - 0.22, 10, { rx: Math.PI / 2 });
  addCyl(g, 0.16, 0.16, 0.12, ink, 0, 0.55, z0 - 0.48, 12, { rx: Math.PI / 2 });

  addBox(g, 0.02, H * 0.55, 0.02, metal, W / 2 - 0.02, H * 0.35, z0 + 0.4, { shadow: false });
  addBox(g, 0.02, H * 0.55, 0.02, metal, W / 2 - 0.02, H * 0.35, z1 - 0.4, { shadow: false });

  return g;
}

function makeProps(layout) {
  const g = new THREE.Group();
  g.name = 'procedural';
  const s = layout.shell;
  const meta = layout.meta;
  const mats = {
    yellow: toon(s.partitionColor),
    cap: toon(s.partitionCap),
    wood: toon(s.tableWood),
    woodDark: toon(s.woodDark),
    ped: toon(s.tablePed),
    metal: toon(s.metal),
    brass: toon(s.brass),
    cream: toon(s.cream),
    ink: toon(s.ink),
  };
  const bays = meta.bays;
  const pitch = meta.bayPitch;
  const z0 = meta.bay0;
  const seatW = meta.seatWidth;
  const partH = meta.partitionHeight;
  const seatX = meta.seatX;
  const xWall = -layout.meta.room.width / 2;

  for (let i = 0; i <= bays; i++) {
    const z = z0 + i * pitch - pitch / 2;
    addPartition(g, -seatX, z, seatW, partH, mats);
    addPartition(g, seatX, z, seatW, partH, mats);
  }

  for (let i = 0; i < bays; i++) {
    const z = z0 + i * pitch;
    addWallTable(g, xWall + 0.08, z, mats);
    addAisleTable(g, seatX, z, mats);
    addCyl(g, 0.09, 0.11, 0.04, toon('#fff1d0', { emissive: '#ffc98a', emissiveIntensity: 1 }), 0, 1.86, z, 12, {
      name: 'bulb',
      userData: { bulb: true },
      shadow: false,
    }).userData.bulb = true;
  }

  const cases = [
    [-1.02, 1.99, -4.7, 0.38, 0.22, 0.55, '#6a3a28', 0.15],
    [-1.05, 1.99, -1.1, 0.42, 0.18, 0.5, '#2f3a48', -0.1],
    [-0.98, 1.99, 2.4, 0.34, 0.2, 0.48, '#5a4634', 0.2],
    [0.88, 1.99, -3.2, 0.36, 0.16, 0.46, '#3e2a22', 0.05],
    [0.9, 1.99, 1.55, 0.4, 0.2, 0.52, '#4a5560', -0.2],
    [-0.95, 0.0, -7.15, 0.42, 0.28, 0.58, '#5c4030', 0.35],
  ];
  for (const c of cases) addSuitcase(g, ...c);

  addBox(g, 2.2, 0.9, 0.52, toon('#9aa0a6'), -0.2, 0.45, 6.55);
  addBox(g, 2.24, 0.04, 0.56, toon('#d8d2c8'), -0.2, 0.92, 6.55);
  addBox(g, 2.1, 0.04, 0.18, toon('#6a7278'), -0.2, 1.38, 6.78);
  const strip = addBox(g, 1.6, 0.015, 0.04, toon('#fff1d0', { emissive: '#ffc98a', emissiveIntensity: 1 }), -0.35, 1.34, 6.62, {
    name: 'bulb',
    userData: { bulb: true },
    shadow: false,
  });
  strip.userData.bulb = true;
  addBox(g, 0.7, 0.55, 0.08, toon('#6a7278'), 0.85, 0.28, 7.55);
  addCyl(g, 0.07, 0.08, 0.16, toon('#8a8680'), -0.95, 1.08, 6.95, 10);
  addCyl(g, 0.05, 0.03, 0.08, mats.metal, -0.95, 1.2, 6.95, 8);
  const menu = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.42, 0.02), toon('#ffffff', { map: menuTexture() }));
  menu.position.set(-1.18, 1.55, 6.35);
  menu.rotation.y = Math.PI / 2;
  menu.castShadow = true;
  g.add(menu);

  addBox(g, 0.42, 0.72, 0.38, toon('#9aa0a6'), 0.22, 0.36, 4.85);
  addBox(g, 0.44, 0.04, 0.4, mats.wood, 0.22, 0.74, 4.85);
  addCyl(g, 0.04, 0.04, 0.08, mats.metal, 0.05, 0.08, 4.68, 8);
  addCyl(g, 0.04, 0.04, 0.08, mats.metal, 0.38, 0.08, 5.02, 8);
  addBox(g, 0.16, 0.12, 0.22, mats.ink, 0.22, 0.82, 4.85);

  addBox(g, 0.55, 0.02, 1.15, toon('#5a4638'), -0.95, 0.02, -6.9);
  addCyl(g, 0.03, 0.03, 1.35, mats.brass, 0.28, 1.55, -5.7, 8);
  addCyl(g, 0.04, 0.04, 0.05, mats.ink, 0.28, 0.9, -5.7, 8);
  addBox(g, 0.18, 0.22, 0.04, toon('#3a4450'), 1.12, 1.35, -7.85);

  for (const z of [-3.9, -1.3, 1.3, 3.9]) {
    addBox(g, 0.04, 0.12, 0.04, mats.brass, -1.28, 1.72, z);
    addCyl(g, 0.05, 0.035, 0.07, mats.cream, -1.18, 1.66, z, 10);
    bulb(g, -1.18, 1.6, z, 0.028);
  }
  bulb(g, 0, 2.28, -6.7, 0.04);
  bulb(g, 0.15, 2.28, 6.7, 0.04);

  const paper = toon('#efe6d4');
  addBox(g, 0.22, 0.004, 0.28, paper, -0.92, 0.756, -3.95);
  addBox(g, 0.18, 0.004, 0.24, paper, 0.7, 0.756, 1.42);

  function foliage(x, y, z, scale) {
    const leaf = toon('#2f6b3c');
    const leaf2 = toon('#1e4d2b');
    addCyl(g, 0.012 * scale, 0.016 * scale, 0.14 * scale, toon('#3d5c2e'), x, y + 0.08 * scale, z, 8);
    const a = new THREE.Mesh(new THREE.SphereGeometry(0.1 * scale, 10, 8), leaf);
    a.position.set(x, y + 0.2 * scale, z);
    a.scale.set(1.05, 0.8, 0.95);
    a.castShadow = true;
    g.add(a);
    const b = new THREE.Mesh(new THREE.SphereGeometry(0.07 * scale, 8, 6), leaf2);
    b.position.set(x + 0.05 * scale, y + 0.26 * scale, z - 0.03 * scale);
    b.castShadow = true;
    g.add(b);
  }
  foliage(-1.12, 0.2, -7.55, 0.9);
  foliage(1.05, 1.12, 7.55, 0.7);

  return g;
}

function makeLights(layout) {
  const lights = [];
  const add = (color, intensity, distance, x, y, z) => {
    const light = new THREE.PointLight(color, intensity, distance, 2);
    light.position.set(x, y, z);
    lights.push(light);
  };
  const z0 = layout.meta.bay0;
  const pitch = layout.meta.bayPitch;
  for (let i = 0; i < layout.meta.bays; i++) {
    const z = z0 + i * pitch;
    add(0xffc98a, 0.32, 3.4, 0, 2.05, z);
    add(0xffe2b8, 0.16, 2.2, -1.15, 1.62, z);
  }
  add(0xffb36b, 0.4, 3.2, -0.3, 1.32, 6.5);
  add(0xffc98a, 0.28, 2.8, 0, 2.1, -6.7);
  add(0xffe8c8, 0.18, 3.6, 0, 1.8, 0);
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
