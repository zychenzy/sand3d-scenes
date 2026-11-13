import * as THREE from 'three';
import { boot, toon, addBox, addCyl, addSphere } from './scene_lib.js';
import {
  TABLE, NET, BALL, BAY, TABLE_X,
  lineRects, netPosts, scorerBenches, baskets, ballCart,
  barrierSegments, glbInstances,
} from './table_spec.mjs';

const PLASTER = '#efe6d8';
const DADO = '#24344a';
const HONOR = '#1a3330';
const POCHE = '#2a261f';
const TIMBER = '#b08968';
const TIMBER_DARK = '#8a5a3c';
const JOIST = '#cbb892';
const CEILING = '#e6dece';
const METAL = '#3a4048';
const NAVY = '#1a3148';
const NAVY_DEEP = '#14283c';
const CAP = '#c4a36a';
const WHITE = '#f4f1ea';
const BLUE = '#1a4e96';

function srgbTexture(canvas, repeatX = 1, repeatY = 1) {
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  tex.anisotropy = 8;
  tex.needsUpdate = true;
  return tex;
}

function paintPlanks(widthM, depthM) {
  const plank = 0.09;
  const ppm = 14;
  const W = Math.round(widthM * ppm);
  const H = Math.round(depthM * ppm);
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  const tones = ['#e2cfb0', '#d7c29f', '#e8d4b4', '#dcc6a4', '#c9b08a', '#e4d0ae', '#d3bc96'];
  const n = Math.ceil(widthM / plank);
  for (let i = 0; i < n; i += 1) {
    const x0 = Math.floor((i * plank / widthM) * W);
    const x1 = Math.floor(((i + 1) * plank / widthM) * W);
    ctx.fillStyle = tones[i % tones.length];
    ctx.fillRect(x0, 0, Math.max(1, x1 - x0), H);
    ctx.fillStyle = 'rgba(90, 62, 36, 0.28)';
    ctx.fillRect(x1 - 1, 0, 1, H);
  }
  for (let y = 0; y < H; y += 18) {
    ctx.fillStyle = `rgba(80, 54, 30, ${0.03 + (y % 54) / 900})`;
    ctx.fillRect(0, y, W, 1);
  }
  return srgbTexture(canvas);
}

function paintRubber(widthM, depthM) {
  const ppm = 48;
  const W = Math.round(widthM * ppm);
  const H = Math.round(depthM * ppm);
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#3e5148';
  ctx.fillRect(0, 0, W, H);
  const tile = 0.5 * ppm;
  ctx.strokeStyle = '#2c3b34';
  ctx.lineWidth = 2;
  for (let x = tile; x < W; x += tile) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, H);
    ctx.stroke();
  }
  for (let y = tile; y < H; y += tile) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(W, y);
    ctx.stroke();
  }
  return srgbTexture(canvas);
}

function paintPlaster() {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#f3eadc';
  ctx.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 80; i += 1) {
    ctx.fillStyle = `rgba(120, 96, 70, ${0.04 + (i % 5) * 0.015})`;
    ctx.fillRect((i * 37) % 128, (i * 19) % 128, 8, 3);
  }
  const tex = srgbTexture(canvas, 4, 3);
  return tex;
}

function netMap() {
  const canvas = document.createElement('canvas');
  canvas.width = 32;
  canvas.height = 32;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, 32, 32);
  ctx.strokeStyle = 'rgba(18, 18, 18, 0.95)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(0, 1.5);
  ctx.lineTo(32, 1.5);
  ctx.moveTo(1.5, 0);
  ctx.lineTo(1.5, 32);
  ctx.stroke();
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  tex.needsUpdate = true;
  return tex;
}

function labelTexture(lines, w, h, bg, fg) {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = fg;
  ctx.lineWidth = 8;
  ctx.strokeRect(16, 16, w - 32, h - 32);
  ctx.fillStyle = fg;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  lines.forEach((line, i) => {
    ctx.font = `${line.weight || 600} ${line.size}px "Liberation Sans", "DejaVu Sans", sans-serif`;
    ctx.fillText(line.text, w / 2, line.y ?? (h * (i + 1)) / (lines.length + 1));
  });
  return srgbTexture(canvas);
}

function addFloor(g, w, d, x, z, texture, tint) {
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, d), toon(tint, { map: texture }));
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set(x, 0, z);
  mesh.receiveShadow = true;
  mesh.userData.noCast = true;
  g.add(mesh);
}

function makeShell() {
  const g = new THREE.Group();
  g.name = 'shell';
  const plaster = paintPlaster();
  addFloor(g, 15, 10, 0, 0, paintPlanks(15, 10), '#ffffff');
  addFloor(g, 3.06, 10.2, 9.03, -0.02, paintRubber(3.06, 10.2), '#ffffff');
  addFloor(g, 18.3, 1.15, 1.4, 5.55, paintRubber(4, 1.15), '#b7aea0');

  const wallMat = toon(PLASTER, { map: plaster });
  const honorMat = toon(HONOR);
  const pocheMat = toon(POCHE);
  const dadoMat = toon(DADO);

  addBox(g, 0.16, 5.05, 10.3, wallMat, -7.6, 2.525, 0.02);
  addBox(g, 0.16, 1.15, 10.24, dadoMat, -7.5, 0.575, 0.02);
  addBox(g, 18.4, 1.15, 0.16, dadoMat, 1.5, 0.575, -5.2);
  addBox(g, 18.4, 2.35, 0.16, honorMat, 1.5, 2.55, -5.2);
  addBox(g, 18.4, 1.2, 0.16, wallMat, 1.5, 4.45, -5.2);
  addBox(g, 0.16, 5.05, 10.2, wallMat, 10.64, 2.525, -0.05);
  addBox(g, 1.28, 5.05, 0.16, wallMat, -7.04, 2.525, 5.1);
  addBox(g, 0.04, 5.05, 0.16, pocheMat, -6.38, 2.525, 5.1);
  addBox(g, 0.16, 5.05, 0.04, pocheMat, 10.64, 2.525, 5.02);

  const ceil = addBox(g, 18.24, 0.14, 10.22, toon(CEILING), 1.52, 5.12, -0.05);
  ceil.userData.noCast = true;
  addBox(g, 18.24, 0.28, 0.06, pocheMat, 1.52, 4.95, 5.04);

  for (let z = -4.375; z <= 4.4; z += 1.25) {
    const joist = addBox(g, 17.6, 0.14, 0.08, toon(JOIST), 1.3, 4.9, z);
    joist.userData.noCast = true;
  }

  const glassMat = new THREE.MeshBasicMaterial({
    color: 0xd7e7ef, transparent: true, opacity: 0.55, depthWrite: false,
  });
  for (const x of [-4.2, 0, 4.2]) {
    const pane = new THREE.Mesh(new THREE.PlaneGeometry(2.35, 0.48), glassMat);
    pane.position.set(x, 4.42, -5.11);
    pane.userData.keepMaterial = true;
    pane.userData.noCast = true;
    g.add(pane);
    addBox(g, 2.5, 0.035, 0.04, toon(TIMBER_DARK), x, 4.66, -5.09);
    addBox(g, 2.5, 0.035, 0.04, toon(TIMBER_DARK), x, 4.18, -5.09);
  }

  const sign = new THREE.Mesh(
    new THREE.PlaneGeometry(3.4, 0.86),
    toon('#f3ecdf', {
      map: labelTexture([
        { text: 'NETTLETON', size: 92, y: 150, weight: 700 },
        { text: 'TABLE TENNIS CLUB', size: 36, y: 250, weight: 500 },
      ], 1024, 420, '#f3ecdf', '#1a3330'),
    }),
  );
  sign.position.set(0, 2.35, -5.08);
  sign.userData.noCast = true;
  g.add(sign);

  for (let i = 0; i < 12; i += 1) {
    addBox(g, 0.07, 1.15, 0.025, toon(i % 2 ? TIMBER : TIMBER_DARK), 10.5, 1.42, -3.38 + i * 0.13);
  }
  addBox(g, 0.08, 0.05, 1.6, toon(CAP), 10.42, 0.92, -2.64);

  return g;
}

function addBarrier(g, seg, frameMat, fabricMat, capMat) {
  const dx = seg.x1 - seg.x0;
  const dz = seg.z1 - seg.z0;
  const len = Math.hypot(dx, dz);
  if (len < 0.12) return;
  const alongX = Math.abs(dx) >= Math.abs(dz);
  const group = new THREE.Group();
  group.position.set((seg.x0 + seg.x1) / 2, 0, (seg.z0 + seg.z1) / 2);
  if (!alongX) group.rotation.y = Math.PI / 2;
  const t = BAY.barrierT;
  const h = BAY.barrierH;
  addBox(group, 0.04, h, t, frameMat, -len / 2, h / 2, 0);
  addBox(group, 0.04, h, t, frameMat, len / 2, h / 2, 0);
  addBox(group, Math.max(0.08, len - 0.06), 0.04, t, frameMat, 0, 0.03, 0);
  addBox(group, Math.max(0.08, len - 0.06), 0.035, t, frameMat, 0, h - 0.028, 0);
  addBox(group, Math.max(0.06, len - 0.08), h - 0.12, 0.012, fabricMat, 0, h * 0.48, 0);
  addBox(group, len + 0.02, 0.02, t + 0.016, capMat, 0, h - 0.01, 0);
  g.add(group);
}

function addLines(g, cx) {
  const mat = toon(WHITE, { polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  for (const r of lineRects(cx)) {
    const w = r.x1 - r.x0;
    const d = r.z1 - r.z0;
    const mesh = addBox(g, w, 0.0015, d, mat, (r.x0 + r.x1) / 2, TABLE.height + 0.001, (r.z0 + r.z1) / 2);
    mesh.userData.noCast = true;
  }
}

function addNet(g, cx) {
  const net = netPosts(cx);
  const span = net.centerX[1] - net.centerX[0];
  const meshH = net.tapeBottomY - net.meshBottomY;
  const map = netMap();
  map.repeat.set(span / 0.015, meshH / 0.015);
  const mat = toon('#f2f2f2', {
    map, alphaTest: 0.45, side: THREE.DoubleSide,
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(span, meshH), mat);
  mesh.position.set(cx, (net.meshBottomY + net.tapeBottomY) / 2, net.z);
  mesh.userData.noCast = true;
  g.add(mesh);
  addBox(
    g, span, NET.tape, 0.008, toon(WHITE),
    cx, net.tapeBottomY + NET.tape / 2, net.z,
  );
  for (const x of net.centerX) {
    const postH = NET.height + 0.045;
    addCyl(g, NET.postRadius, NET.postRadius, postH, toon('#d5d8dc'), x, TABLE.height - 0.04 + postH / 2, net.z, 12);
    addBox(g, 0.045, 0.012, 0.07, toon(METAL), x > cx ? x - 0.03 : x + 0.03, TABLE.height - 0.008, net.z);
  }
}

function addBall(g, x, y, z, color) {
  const mesh = addSphere(g, BALL.diameter / 2, toon(color), x, y, z, 14);
  mesh.userData.noCast = true;
  return mesh;
}

function fillBasket(g, basket) {
  const spots = [
    [0, 0.045, 0], [0.06, 0.045, 0.04], [-0.05, 0.045, 0.05], [0.02, 0.045, -0.06],
    [-0.06, 0.045, -0.03], [0.08, 0.05, -0.02], [-0.02, 0.08, 0.02], [0.03, 0.085, 0.04],
    [-0.04, 0.082, -0.02], [0, 0.12, 0],
  ];
  for (const [dx, y, dz] of spots) addBall(g, basket.x + dx, y, basket.z + dz, WHITE);
}

function fillCart(g, cart) {
  const colors = [WHITE, WHITE, WHITE, '#e07a32', WHITE];
  let n = 0;
  for (let layer = 0; layer < 3; layer += 1) {
    for (let ix = -1; ix <= 1; ix += 1) {
      for (let iz = -1; iz <= 1; iz += 1) {
        addBall(
          g,
          cart.x + ix * 0.055,
          0.08 + layer * 0.04,
          cart.z + iz * 0.055,
          colors[n % colors.length],
        );
        n += 1;
      }
    }
  }
}

function addScore(g, bench, text) {
  const tex = labelTexture(
    [{ text, size: 120, y: 96, weight: 700 }],
    512, 192, '#14202c', '#f4f1ea',
  );
  const board = new THREE.Mesh(new THREE.PlaneGeometry(0.22, 0.1), toon('#14202c', { map: tex }));
  board.position.set(bench.x - 0.28, 1.02, bench.z + 0.15);
  board.rotation.y = Math.PI / 2;
  board.userData.noCast = true;
  g.add(board);
  addCyl(g, 0.012, 0.012, 1.02, toon(METAL), bench.x - 0.28, 0.51, bench.z + 0.15, 8);
}

function addTableNumber(g, cx, n) {
  const tex = labelTexture(
    [{ text: String(n), size: 220, y: 150, weight: 700 }],
    256, 256, '#1a3148', '#f4f1ea',
  );
  const plate = new THREE.Mesh(new THREE.PlaneGeometry(0.26, 0.26), toon('#1a3148', { map: tex }));
  plate.position.set(cx + 0.72, 0.4, 5.025);
  plate.userData.noCast = true;
  g.add(plate);
}

function makeProcedural() {
  const g = new THREE.Group();
  g.name = 'club';
  const frameMat = toon(METAL);
  const fabricMat = toon(NAVY);
  const capMat = toon(CAP);
  for (const seg of barrierSegments()) addBarrier(g, seg, frameMat, fabricMat, capMat);

  for (const cx of TABLE_X) {
    addLines(g, cx);
    addNet(g, cx);
  }
  addBall(g, -4.85, TABLE.height + BALL.diameter / 2, 0.82, WHITE);
  addBall(g, 0.22, TABLE.height + BALL.diameter / 2, -0.66, WHITE);
  addBall(g, 5.16, TABLE.height + BALL.diameter / 2, 0.48, WHITE);

  const scores = ['11 – 7', '8 – 11', '9 – 6'];
  scorerBenches().forEach((bench, i) => {
    addScore(g, bench, scores[i]);
    addBox(g, 0.22, 0.02, 0.12, toon('#f7f4ee'), bench.x, 0.46, bench.z + 0.52);
  });

  baskets().forEach((basket) => {
    fillBasket(g, basket);
  });
  const cart = ballCart();
  fillCart(g, cart);

  TABLE_X.forEach((cx, i) => addTableNumber(g, cx, i + 1));

  const deskMat = toon(TIMBER);
  const deskTop = toon('#d7b48a');
  addBox(g, 1.16, 0.045, 0.56, deskTop, 9.7, 0.72, -4.42);
  addBox(g, 1.08, 0.04, 0.48, deskMat, 9.7, 0.68, -4.42);
  for (const [dx, dz] of [[-0.5, -0.22], [0.5, -0.22], [-0.5, 0.22], [0.5, 0.22]]) {
    addCyl(g, 0.028, 0.034, 0.66, toon(TIMBER_DARK), 9.7 + dx, 0.33, -4.42 + dz, 10);
  }

  const leaf = toon('#2f6a45');
  const pot = { x: 9.28, z: -4.48 };
  addSphere(g, 0.09, leaf, pot.x, 0.98, pot.z, 12);
  addSphere(g, 0.06, toon('#3d7d52'), pot.x + 0.07, 0.94, pot.z + 0.02, 10);
  addSphere(g, 0.05, toon('#24553a'), pot.x - 0.05, 0.93, pot.z - 0.03, 10);

  for (const cx of TABLE_X) {
    for (const z of [-1.55, 0, 1.55]) {
      const house = addBox(g, 0.18, 0.055, 1.08, toon('#2a3036'), cx, 4.48, z);
      house.userData.noCast = true;
      const glow = addBox(g, 0.1, 0.012, 0.9, toon('#fff6e4', {
        emissive: 0xfff3d4, emissiveIntensity: 1,
      }), cx, 4.448, z);
      glow.userData.noCast = true;
    }
  }

  for (const z of [-1.2, 2.35]) {
    addCyl(g, 0.006, 0.006, 0.85, toon('#c8c2b8'), 9.25, 4.55, z, 6);
  }

  const rules = new THREE.Mesh(
    new THREE.PlaneGeometry(0.42, 0.28),
    toon('#f7f1e6', {
      map: labelTexture([
        { text: 'CLUB NIGHT', size: 42, y: 70, weight: 700 },
        { text: 'WHITE BALLS  ·  40 mm', size: 28, y: 130, weight: 500 },
        { text: 'NET 15.25 cm', size: 28, y: 175, weight: 500 },
      ], 640, 420, '#f7f1e6', '#1a3330'),
    }),
  );
  rules.rotation.x = -Math.PI / 2;
  rules.position.set(9.85, 0.748, -4.28);
  rules.userData.noCast = true;
  g.add(rules);

  return g;
}

function tuneAsset(kind, root) {
  root.traverse((obj) => {
    if (!obj.isMesh || !obj.material) return;
    const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
    for (const m of mats) {
      if (!m.color) continue;
      if (kind === 'ittf_table') {
        if ((obj.name || '').startsWith('half')) m.color.set(BLUE);
        else if (m.color.r < 0.25 && m.color.g < 0.25 && m.color.b < 0.28) m.color.set('#5a616a');
      }
      if (kind === 'wire_cart') m.color.set('#8e959c');
    }
  });
}

boot({
  makeShell,
  makeProcedural,
  tuneAsset,
  instances: () => glbInstances(),
  readyText: 'Nettleton — drag orbit · U unlit · T toon',
});
