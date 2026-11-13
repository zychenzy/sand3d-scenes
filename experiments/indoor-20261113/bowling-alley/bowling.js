import * as THREE from 'three';
import { boot, toon, addBox, addCyl, addSphere } from './scene_lib.js';
import {
  APPROACH_DOTS,
  LANE,
  PLACED,
  approachDotZ,
  boardOffset,
  buildHouse,
  pinLocals,
} from './lane_spec.mjs';

const house = buildHouse();
const DECK = 0.086;

const INK = '#1c140f';
const PIN = '#f3eee4';
const PIN_RED = '#c4312e';
const GUTTER = '#3a342e';
const MAPLE = '#e2b36a';
const WALNUT = '#6e4630';
const WALNUT_DEEP = '#5a3828';
const OXBLOOD = '#7a2430';
const OXBLOOD_DEEP = '#4c1520';
const GOLD = '#e2c27a';
const IVORY = '#f3ecdf';
const POCHE = '#241e1c';
const CREAM = '#f4efe6';
const BLACK = '#1a1714';
const TEAL = '#1a3c42';

const BALLS = ['#c4312e', '#1d3557', '#f2efe6', '#e07a2f', '#1f6b4a', '#1a1a1a', '#6b3fa0', '#d4a017'];

function srgbTexture(canvas, flipY = false) {
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.flipY = flipY;
  tex.anisotropy = 8;
  tex.needsUpdate = true;
  return tex;
}

function mulberry32(seed) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function paintBoards(widthPx, heightPx, palette, edge) {
  const canvas = document.createElement('canvas');
  canvas.width = widthPx;
  canvas.height = heightPx;
  const ctx = canvas.getContext('2d');
  const rand = mulberry32(11);
  const n = 39;
  const bw = widthPx / n;
  for (let i = 0; i < n; i += 1) {
    const edgeBoard = i < 2 || i > 36;
    ctx.fillStyle = edgeBoard ? edge : palette[i % palette.length];
    ctx.fillRect(i * bw, 0, bw + 0.5, heightPx);
    ctx.fillStyle = 'rgba(70, 36, 16, 0.35)';
    ctx.fillRect((i + 1) * bw - 1.2, 0, 1.2, heightPx);
    if (rand() > 0.72) {
      ctx.fillStyle = 'rgba(90, 48, 18, 0.18)';
      const y = rand() * heightPx;
      ctx.fillRect(i * bw + 2, y, bw - 4, 6 + rand() * 30);
    }
  }
  return canvas;
}

function paintLane() {
  const canvas = paintBoards(
    780,
    2048,
    ['#e6b86e', '#d9a55c', '#f0c57c', '#c9924c', '#e8bc78', '#d29c54', '#efc98a'],
    '#c48a44',
  );
  const ctx = canvas.getContext('2d');
  const oil0 = (8 * 0.3048 / LANE.deckRear) * canvas.height;
  const oil1 = (40 * 0.3048 / LANE.deckRear) * canvas.height;
  ctx.save();
  ctx.globalCompositeOperation = 'multiply';
  const grd = ctx.createLinearGradient(0, 0, canvas.width, 0);
  grd.addColorStop(0, 'rgba(255,255,255,1)');
  grd.addColorStop(0.32, 'rgba(120, 72, 30, 0.55)');
  grd.addColorStop(0.5, 'rgba(90, 52, 22, 0.72)');
  grd.addColorStop(0.68, 'rgba(120, 72, 30, 0.55)');
  grd.addColorStop(1, 'rgba(255,255,255,1)');
  ctx.fillStyle = grd;
  ctx.fillRect(0, oil0, canvas.width, oil1 - oil0);
  ctx.restore();
  const deck0 = (LANE.foulToHeadPin - 0.55) / LANE.deckRear;
  ctx.fillStyle = 'rgba(255, 236, 196, 0.28)';
  ctx.fillRect(0, deck0 * canvas.height, canvas.width, canvas.height);
  return srgbTexture(canvas, false);
}

function paintApproach() {
  const canvas = paintBoards(
    780,
    1024,
    ['#b18458', '#966840', '#c4986c', '#7d5436', '#a87448'],
    '#6b4630',
  );
  return srgbTexture(canvas, false);
}

function paintCarpet() {
  const S = 512;
  const canvas = document.createElement('canvas');
  canvas.width = S;
  canvas.height = S;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#23474c';
  ctx.fillRect(0, 0, S, S);
  ctx.strokeStyle = 'rgba(232, 214, 176, 0.28)';
  ctx.lineWidth = 2;
  const step = S / 2;
  for (let i = 0; i <= 2; i += 1) {
    ctx.beginPath();
    ctx.moveTo(i * step, 0);
    ctx.lineTo(i * step, S);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, i * step);
    ctx.lineTo(S, i * step);
    ctx.stroke();
  }
  ctx.fillStyle = '#a85a42';
  for (let y = 0; y < 2; y += 1) {
    for (let x = 0; x < 2; x += 1) {
      ctx.beginPath();
      ctx.arc(x * step + step / 2, y * step + step / 2, 7, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  const tex = srgbTexture(canvas, true);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

function paintCard(title, lines, bg = '#7a3038') {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 280;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 512, 280);
  ctx.strokeStyle = '#e7d7a4';
  ctx.lineWidth = 12;
  ctx.strokeRect(10, 10, 492, 260);
  ctx.fillStyle = '#f8f1df';
  ctx.textAlign = 'center';
  ctx.font = '700 58px Georgia, serif';
  ctx.fillText(title, 256, 108);
  ctx.font = '500 30px Georgia, serif';
  lines.forEach((line, i) => ctx.fillText(line, 256, 168 + i * 40));
  return srgbTexture(canvas, true);
}

function paintDado() {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#6d4632';
  ctx.fillRect(0, 0, 128, 256);
  for (let x = 0; x < 128; x += 12) {
    ctx.fillStyle = (x / 12) % 2 === 0 ? '#7d5440' : '#5c3a2a';
    ctx.fillRect(x, 0, 9, 256);
    ctx.fillStyle = 'rgba(40, 22, 12, 0.35)';
    ctx.fillRect(x + 8, 0, 2, 256);
  }
  const tex = srgbTexture(canvas, true);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

function paintScore(pairIndex) {
  const canvas = document.createElement('canvas');
  canvas.width = 768;
  canvas.height = 320;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#101614';
  ctx.fillRect(0, 0, 768, 320);
  ctx.strokeStyle = GOLD;
  ctx.lineWidth = 8;
  ctx.strokeRect(10, 10, 748, 300);
  ctx.fillStyle = GOLD;
  ctx.font = '600 28px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.fillText('NORTHLANE', 384, 48);
  const lines = pairIndex === 0
    ? [['1', '148', 'X  X  9  /'], ['2', '167', '9  /  X  8']]
    : [['3', '132', '8  9  /  X'], ['4', '155', 'X  7  /  9']];
  lines.forEach((row, i) => {
    const y = 118 + i * 90;
    ctx.fillStyle = '#d6ff6a';
    ctx.font = '700 42px Georgia, serif';
    ctx.textAlign = 'left';
    ctx.fillText(row[0], 48, y);
    ctx.font = '700 54px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillText(row[1], 250, y);
    ctx.font = '500 32px Georgia, serif';
    ctx.textAlign = 'right';
    ctx.fillStyle = '#f4efe6';
    ctx.fillText(row[2], 720, y);
  });
  return srgbTexture(canvas, true);
}

function paintNumeral(n, fill) {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, 256, 256);
  ctx.fillStyle = fill;
  ctx.font = '700 188px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(String(n), 128, 136);
  return srgbTexture(canvas, true);
}

function paintLobby() {
  const canvas = document.createElement('canvas');
  canvas.width = 768;
  canvas.height = 432;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#121816';
  ctx.fillRect(0, 0, 768, 432);
  ctx.strokeStyle = GOLD;
  ctx.lineWidth = 10;
  ctx.strokeRect(14, 14, 740, 404);
  ctx.fillStyle = GOLD;
  ctx.font = '650 54px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.fillText('NORTHLANE', 384, 78);
  ctx.fillStyle = '#d6ff6a';
  ctx.font = '700 36px Georgia, serif';
  ctx.fillText('1    148     X  X  9', 384, 180);
  ctx.fillText('2    167     9  /  X', 384, 240);
  ctx.fillText('3    132     8  9  /', 384, 300);
  ctx.fillText('4    155     X  7  /', 384, 360);
  return srgbTexture(canvas, true);
}

function paintWord() {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = OXBLOOD;
  ctx.fillRect(0, 0, 1024, 256);
  ctx.strokeStyle = GOLD;
  ctx.lineWidth = 8;
  ctx.strokeRect(16, 16, 992, 224);
  ctx.fillStyle = GOLD;
  ctx.font = '650 92px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('NORTHLANE', 512, 118);
  ctx.font = '500 28px Georgia, serif';
  ctx.fillText('FOUR LANES  ·  OPEN PLAY', 512, 186);
  return srgbTexture(canvas, true);
}

function paintMaskNumber(n) {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 320;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = OXBLOOD_DEEP;
  ctx.fillRect(0, 0, 256, 320);
  ctx.strokeStyle = GOLD;
  ctx.lineWidth = 10;
  ctx.strokeRect(12, 12, 232, 296);
  ctx.fillStyle = GOLD;
  ctx.font = '700 168px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(String(n), 128, 168);
  return srgbTexture(canvas, true);
}

let blobTex;
function shadowBlob(g, x, z, w, d, opacity = 0.32, y = 0.028) {
  if (!blobTex) {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    const grd = ctx.createRadialGradient(64, 64, 8, 64, 64, 62);
    grd.addColorStop(0, 'rgba(0,0,0,0.7)');
    grd.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, 128, 128);
    blobTex = new THREE.CanvasTexture(canvas);
    blobTex.colorSpace = THREE.NoColorSpace;
  }
  const mat = new THREE.MeshBasicMaterial({
    map: blobTex,
    transparent: true,
    opacity,
    depthWrite: false,
    color: 0x120e0c,
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, d), mat);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set(x, y, z);
  mesh.userData.keepMaterial = true;
  mesh.userData.noCast = true;
  mesh.userData.noReceive = true;
  mesh.renderOrder = 2;
  g.add(mesh);
}

function addDeck(g, width, depth, x, z, texture, tint, y = DECK) {
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, depth), toon(tint, { map: texture }));
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set(x, y, z);
  mesh.receiveShadow = true;
  mesh.userData.noCast = true;
  mesh.material.polygonOffset = true;
  mesh.material.polygonOffsetFactor = 1.5;
  mesh.material.polygonOffsetUnits = 2;
  mesh.name = 'deck';
  g.add(mesh);
  return mesh;
}

function flatMark(g, w, h, map, x, y, z, rx = 0) {
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(w, h),
    toon('#ffffff', { map, transparent: true, alphaTest: 0.35, depthWrite: false }),
  );
  mesh.position.set(x, y, z);
  mesh.rotation.x = rx;
  mesh.userData.noCast = true;
  mesh.userData.noReceive = true;
  g.add(mesh);
  return mesh;
}

function makePin() {
  const pts = [
    new THREE.Vector2(0.01, 0),
    new THREE.Vector2(0.058, 0.015),
    new THREE.Vector2(0.06, 0.07),
    new THREE.Vector2(0.046, 0.14),
    new THREE.Vector2(0.056, 0.2),
    new THREE.Vector2(0.034, 0.255),
    new THREE.Vector2(0.02, 0.292),
    new THREE.Vector2(0.028, 0.33),
    new THREE.Vector2(0.016, 0.362),
    new THREE.Vector2(0.005, 0.381),
  ];
  const group = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.LatheGeometry(pts, 14),
    toon(PIN, { emissive: PIN, emissiveIntensity: 0.18 }),
  );
  group.add(body);
  const stripe = toon(PIN_RED, { emissive: PIN_RED, emissiveIntensity: 0.22 });
  for (const [y, r] of [[0.268, 0.03], [0.302, 0.026]]) {
    const band = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.014, 12), stripe);
    band.position.y = y;
    group.add(band);
  }
  group.name = 'pin';
  return group;
}

function makeBall(hex) {
  const group = new THREE.Group();
  const radius = LANE.ballDiameter / 2;
  group.add(new THREE.Mesh(new THREE.SphereGeometry(radius, 18, 14), toon(hex)));
  const hole = toon('#140e0c');
  for (const [x, z] of [[0.028, 0.016], [-0.028, 0.016], [0, -0.026]]) {
    const h = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.011, 0.028, 8), hole);
    h.position.set(x, radius - 0.008, z);
    group.add(h);
  }
  group.name = 'ball';
  return group;
}

function addArrow(g, x, z, mat) {
  const shaft = addBox(g, 0.026, 0.006, 0.1, mat, x, DECK + 0.006, z + 0.02);
  shaft.userData.noCast = true;
  const head = new THREE.Mesh(new THREE.ConeGeometry(0.032, 0.064, 3), mat);
  head.rotation.x = -Math.PI / 2;
  head.position.set(x, DECK + 0.008, z - 0.05);
  head.userData.noCast = true;
  g.add(head);
}

function addGutter(g, span, mat) {
  const depth = LANE.gutterDepth;
  const len = LANE.deckRear;
  const zc = -len / 2;
  const channel = addBox(g, Math.max(0.04, span.width - 0.01), depth, len, mat, span.cx, DECK - depth / 2 - 0.004, zc);
  channel.userData.noCast = true;
  channel.name = 'gutter';
  const lip = toon('#efd0a0');
  for (const side of [-1, 1]) {
    const edge = addBox(g, 0.012, 0.012, len, lip, span.cx + side * (span.width / 2 - 0.006), DECK + 0.004, zc);
    edge.userData.noCast = true;
  }
}

function addHood(g, pair, ballProto) {
  const x = pair.ballReturn.cx;
  const zc = (PLACED.hood.z0 + PLACED.hood.z1) / 2;
  const depth = PLACED.hood.z1 - PLACED.hood.z0;
  const body = addBox(g, PLACED.hood.width, 0.4, depth, toon(CREAM), x, DECK + 0.2, zc);
  body.name = `return_${pair.index + 1}`;
  addBox(g, PLACED.hood.width + 0.04, 0.045, depth + 0.04, toon('#3a342e'), x, DECK + 0.42, zc);
  addBox(g, 0.045, 0.4, depth, toon(OXBLOOD), x - PLACED.hood.width / 2 + 0.02, DECK + 0.2, zc);
  addBox(g, 0.045, 0.4, depth, toon(OXBLOOD), x + PLACED.hood.width / 2 - 0.02, DECK + 0.2, zc);
  const colors = pair.index === 0 ? [BALLS[0], BALLS[1], BALLS[2]] : [BALLS[3], BALLS[4], BALLS[5]];
  const zs = [PLACED.hood.z0 + 0.22, zc, PLACED.hood.z1 - 0.2];
  colors.forEach((hex, i) => {
    const ball = ballProto[i % ballProto.length].clone(true);
    ball.position.set(x, DECK + 0.44 + LANE.ballDiameter / 2, zs[i]);
    ball.rotation.y = i * 0.6;
    g.add(ball);
  });
  shadowBlob(g, x, zc, PLACED.hood.width * 0.9, depth * 0.85, 0.26, DECK + 0.004);
}

function addConsole(g, pair, scoreMap) {
  const x = pair.ballReturn.cx;
  const z = PLACED.consoleZ;
  const w = PLACED.consoleWidth;
  const d = PLACED.consoleDepth;
  const h = PLACED.consoleHeight;
  const body = addBox(g, w, h - 0.04, d, toon('#4a433c'), x, (h - 0.04) / 2, z);
  body.name = `console_${pair.index + 1}`;
  addBox(g, w + 0.03, 0.04, d + 0.03, toon('#8d5a38'), x, h - 0.02, z);
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.78, 0.26), toon('#d6ff6a', {
    map: scoreMap,
    emissive: '#d6ff6a',
    emissiveMap: scoreMap,
    emissiveIntensity: 0.55,
  }));
  screen.position.set(x, h * 0.58, z + d / 2 + 0.012);
  screen.name = `scoreface_${pair.index + 1}`;
  g.add(screen);
  shadowBlob(g, x, z, w, d, 0.32);
}

function addRack(g, ballProto) {
  const x = house.x0 - 2.35;
  const z = 6.15;
  addBox(g, 0.08, 1.35, 1.55, toon(WALNUT_DEEP), x, 0.7, z);
  for (let row = 0; row < 3; row += 1) {
    const y = 0.38 + row * 0.38;
    addBox(g, 0.42, 0.035, 1.48, toon(WALNUT), x + 0.18, y, z);
    for (let col = 0; col < 4; col += 1) {
      const ball = ballProto[(row * 4 + col) % ballProto.length].clone(true);
      ball.position.set(x + 0.2, y + 0.02 + LANE.ballDiameter / 2, z - 0.54 + col * 0.36);
      g.add(ball);
    }
  }
}

function addCubbies(g) {
  const x = house.x1 + 2.72;
  const z = 6.35;
  const cols = 4;
  const rows = 3;
  const cw = 0.34;
  const ch = 0.28;
  const frame = toon(WALNUT_DEEP);
  addBox(g, 0.08, rows * ch + 0.2, cols * cw + 0.16, frame, x, 0.85, z);
  const shoeColors = ['#f4efe6', '#7a2430', '#1a1714', '#c4312e', '#e6d3a1', '#1d3557'];
  let n = 0;
  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const cz = z - ((cols - 1) * cw) / 2 + col * cw;
      const cy = 0.42 + row * ch;
      addBox(g, 0.28, 0.02, cw - 0.04, toon(WALNUT), x - 0.12, cy, cz);
      if ((row + col) % 2 === 0) {
        const leather = toon(shoeColors[n % shoeColors.length]);
        n += 1;
        const shoe = addBox(g, 0.1, 0.06, 0.22, leather, x - 0.16, cy + 0.05, cz);
        shoe.userData.noCast = true;
      }
    }
  }
}

function addMasking(g) {
  const zWall = -LANE.deckRear - 0.36;
  const width = house.total + 0.9;
  const back = addBox(g, width, 3.55, 0.2, toon('#6e6560'), 0, 1.78, zWall);
  back.userData.noCast = true;
  const valance = addBox(g, width, 1.15, 0.18, toon('#9a3340'), 0, 2.72, zWall + 0.16);
  valance.name = 'masking';
  addBox(g, width - 0.2, 0.045, 0.2, toon(GOLD), 0, 2.18, zWall + 0.2);
  addBox(g, width - 0.2, 0.03, 0.2, toon(GOLD), 0, 3.26, zWall + 0.2);
  const hoodLight = toon('#fff1d2', { emissive: '#fff1d2', emissiveIntensity: 0.9 });
  const hood = addBox(g, width - 0.4, 0.035, 0.1, hoodLight, 0, 2.08, zWall + 0.28);
  hood.userData.noCast = true;
  for (const lane of house.lanes) {
    const plate = new THREE.Mesh(
      new THREE.PlaneGeometry(0.64, 0.76),
      toon('#fff6df', {
        map: paintMaskNumber(lane.number),
        emissive: '#e2c27a',
        emissiveIntensity: 0.42,
        emissiveMap: paintMaskNumber(lane.number),
      }),
    );
    plate.position.set(lane.cx, 2.46, zWall + 0.27);
    plate.name = `mask_${lane.number}`;
    g.add(plate);
    const curtain = addBox(
      g,
      lane.width * 0.9,
      1.35,
      0.05,
      toon('#8a837c'),
      lane.cx,
      DECK + 0.72,
      -LANE.deckRear - 0.04,
    );
    curtain.userData.noCast = true;
    for (const side of [-0.28, 0, 0.28]) {
      const fold = addBox(
        g,
        0.035,
        1.32,
        0.02,
        toon(side === 0 ? '#6a6468' : '#a39c96'),
        lane.cx + side,
        DECK + 0.72,
        -LANE.deckRear + 0.01,
      );
      fold.userData.noCast = true;
    }
    const door = addCyl(g, 0.16, 0.16, 0.04, toon('#a08a74'), lane.cx, DECK + 0.28, -LANE.deckRear + 0.02, 16);
    door.rotation.x = Math.PI / 2;
    door.userData.noCast = true;
    const rake = addBox(g, lane.width * 0.82, 0.045, 0.07, toon('#8a8278'), lane.cx, DECK + 0.96, -LANE.foulToHeadPin - 0.48);
    rake.name = `rake_${lane.number}`;
    const sweep = addBox(g, lane.width * 0.62, 0.028, 0.045, toon('#6e665e'), lane.cx, DECK + 0.58, -LANE.foulToHeadPin - 0.7);
    sweep.userData.noCast = true;
    const spot = new THREE.PointLight(0xfff4e2, 1.35, 8, 1.2);
    spot.position.set(lane.cx, 2.15, -17.15);
    g.add(spot);
  }
  const pitWash = new THREE.PointLight(0xffe6c4, 0.9, 10, 1.3);
  pitWash.position.set(0, 1.55, -17.6);
  g.add(pitWash);
}

function addWalls(g) {
  const plaster = toon('#f4efe6');
  const rail = toon(GOLD);
  const h = 3.42;
  const z0 = -LANE.deckRear - 0.45;
  const z1 = LANE.approach + 0.15;
  const zc = (z0 + z1) / 2;
  const len = z1 - z0;
  const leftX = house.x0 - 0.16;
  addBox(g, 0.16, h, len, plaster, leftX, h / 2, zc);
  const dadoTex = paintDado();
  dadoTex.repeat.set(len / 1.1, 1);
  const dado = new THREE.Mesh(new THREE.PlaneGeometry(len, 1.08), toon('#ffffff', { map: dadoTex }));
  dado.rotation.y = Math.PI / 2;
  dado.position.set(leftX + 0.09, 0.56, zc);
  dado.userData.noCast = true;
  g.add(dado);
  addBox(g, 0.05, 0.045, len, rail, leftX + 0.11, 1.12, zc);
  addBox(g, 0.04, 0.08, len, toon('#4a3428'), leftX + 0.1, 0.04, zc);
  for (let z = z0 + 1.6; z < z1; z += 3.6) {
    addBox(g, 0.1, h, 0.16, toon('#5c4034'), leftX + 0.12, h / 2, z);
  }
  addBox(g, 0.03, 0.035, len, toon('#c4b49a'), leftX + 0.1, 2.62, zc);
  const cards = [
    [-15.4, 'LEAGUE', ['THURSDAY  7 PM']],
    [-11.2, 'OPEN BOWL', ['WALK-INS WELCOME']],
    [-7.2, 'HOUSE BALLS', ['8 LB  TO  15 LB']],
    [-3.2, 'LANES 1–4', ['NORTHLANE']],
    [0.8, 'SHOE DESK', ['RIGHT OF THE AISLE']],
    [4.15, 'NORTHLANE', ['FOUR LANES']],
    [3.4, 'NO SLIP', ['RENTAL SHOES']],
  ];
  cards.forEach(([z, title, lines], i) => {
    if (i % 2 === 0) {
      const upper = new THREE.Mesh(
        new THREE.PlaneGeometry(1.08, 0.42),
        toon('#fff6df', { map: paintCard(i === 0 ? 'NORTHLANE' : title, i === 0 ? ['FOUR LANES'] : lines, '#5c2830') }),
      );
      upper.rotation.y = Math.PI / 2;
      upper.position.set(leftX + 0.1, 2.58, z);
      upper.userData.noCast = true;
      g.add(upper);
    }
    const frame = addBox(g, 0.02, 0.62, 1.28, toon('#e2c27a'), leftX + 0.07, 1.95, z);
    frame.userData.noCast = true;
    const card = new THREE.Mesh(
      new THREE.PlaneGeometry(1.08, 0.46),
      toon('#fff6df', { map: paintCard(title, lines, i % 2 ? '#6e3038' : '#8d3a42') }),
    );
    card.rotation.y = Math.PI / 2;
    card.position.set(leftX + 0.1, 1.95, z);
    card.userData.noCast = true;
    card.name = `lane_card_${i + 1}`;
    g.add(card);
  });
  const cutL = addBox(g, 0.16, h, 0.08, toon('#3f3834'), leftX, h / 2, z1);
  cutL.name = 'cut-left';

  const rightX = house.x1 + 0.22;
  const knee = 3.15;
  addBox(g, 0.14, knee, len, toon('#6a5344'), rightX, knee / 2, zc);
  addBox(g, 0.06, 1.05, len, toon('#6d4632'), rightX - 0.06, 0.52, zc);
  addBox(g, 0.05, knee - 1.2, len, toon('#f4efe6'), rightX - 0.05, 1.15 + (knee - 1.2) / 2, zc);
  const cap = addBox(g, 0.22, 0.08, len, toon('#3f3834'), rightX, knee + 0.02, zc);
  cap.name = 'cut-right';
  const floorLip = addBox(g, 0.55, 0.04, len, toon('#c4b6a4'), rightX + 0.28, 0.02, zc);
  floorLip.userData.noCast = true;
  const rightDadoTex = paintDado();
  rightDadoTex.repeat.set(len / 1.1, 1);
  const rightDado = new THREE.Mesh(new THREE.PlaneGeometry(len, 1.08), toon('#ffffff', { map: rightDadoTex }));
  rightDado.rotation.y = -Math.PI / 2;
  rightDado.position.set(rightX - 0.11, 0.56, zc);
  rightDado.userData.noCast = true;
  g.add(rightDado);
  addBox(g, 0.04, 0.045, len, rail, rightX - 0.13, 1.12, zc);
  const rightCards = [
    [-16.4, 'LANE 4', ['PINS TO THE LEFT']],
    [-11.6, 'SPARE', ['PICK UP THE TEN']],
    [-6.6, 'STRIKE', ['ALL TEN DOWN']],
    [-1.4, 'OPEN PLAY', ['WALK-INS WELCOME']],
    [2.8, 'NORTHLANE', ['FOUR LANES']],
  ];
  rightCards.forEach(([z, title, lines], i) => {
    const frame = addBox(g, 0.02, 0.58, 1.22, toon('#e2c27a'), rightX - 0.1, 1.92, z);
    frame.userData.noCast = true;
    const card = new THREE.Mesh(
      new THREE.PlaneGeometry(1.02, 0.42),
      toon('#fff6df', { map: paintCard(title, lines, i % 2 ? '#6e3038' : '#8d3a42') }),
    );
    card.rotation.y = -Math.PI / 2;
    card.position.set(rightX - 0.13, 1.92, z);
    card.userData.noCast = true;
    card.name = `right_card_${i + 1}`;
    g.add(card);
  });

  const bayX = house.x0 - PLACED.bay;
  const bayZ0 = LANE.approach;
  const bayZ1 = PLACED.entryZ - 0.05;
  const bayLen = bayZ1 - bayZ0;
  addBox(g, 0.14, h, bayLen, plaster, bayX, h / 2, (bayZ0 + bayZ1) / 2);
  addBox(g, 0.04, 1.08, bayLen, toon('#6d4632'), bayX + 0.08, 0.56, (bayZ0 + bayZ1) / 2);
  addBox(g, 0.14, h, 0.08, toon('#3f3834'), bayX, h / 2, bayZ1);
  const lobby = new THREE.Mesh(new THREE.PlaneGeometry(0.82, 0.44), toon('#121816', { map: paintLobby() }));
  lobby.rotation.y = Math.PI / 2;
  lobby.position.set(-5.22, 1.22, 6.85);
  lobby.userData.noCast = true;
  lobby.name = 'lobby-screen';
  g.add(lobby);
  [['OPEN', ['BOWLING']], ['LEAGUE', ['THU  7PM']]].forEach(([title, lines], i) => {
    const card = new THREE.Mesh(
      new THREE.PlaneGeometry(1.15, 0.5),
      toon('#fff6df', { map: paintCard(title, lines, i ? '#6e3038' : '#8d3a42') }),
    );
    card.rotation.y = Math.PI / 2;
    card.position.set(bayX + 0.1, 2.15, bayZ0 + 1.15 + i * 1.45);
    card.userData.noCast = true;
    g.add(card);
  });
}

function addCanopy(g) {
  const z0 = 5.15;
  const z1 = 7.7;
  const x0 = house.x0 - PLACED.bay + 0.2;
  const x1 = house.x1 + 0.9;
  const beam = toon('#6d4e36');
  const slat = toon('#b08a62');
  for (const z of [z0, (z0 + z1) / 2, z1]) {
    const b = addBox(g, x1 - x0, 0.07, 0.06, beam, (x0 + x1) / 2, 2.95, z);
    b.userData.noCast = true;
  }
  for (let z = z0 + 0.14; z < z1; z += 0.24) {
    const m = addBox(g, x1 - x0 - 0.08, 0.02, 0.07, slat, (x0 + x1) / 2, 2.88, z);
    m.userData.noCast = true;
  }
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(1.55, 0.42), toon('#fff6df', { map: paintWord() }));
  sign.position.set(house.x0 + 0.06, 1.55, -5.2);
  sign.rotation.y = Math.PI / 2;
  sign.name = 'wordmark';
  g.add(sign);
}

function addEntryWall(g) {
  const z = PLACED.entryZ + 0.04;
  const x0 = house.x0 - PLACED.bay + 0.1;
  const x1 = house.x1 + 0.55;
  const h = 1.28;
  const mid = (x0 + x1) / 2;
  const span = x1 - x0;
  const wall = addBox(g, span, h, 0.14, toon('#f4efe6'), mid, h / 2, z);
  wall.name = 'entry-wall';
  const dadoTex = paintDado();
  dadoTex.repeat.set(span / 1.1, 1);
  const dado = new THREE.Mesh(new THREE.PlaneGeometry(span, 1.05), toon('#ffffff', { map: dadoTex }));
  dado.rotation.y = Math.PI;
  dado.position.set(mid, 0.54, z - 0.08);
  dado.userData.noCast = true;
  g.add(dado);
  addBox(g, span, 0.04, 0.04, toon(GOLD), mid, 1.08, z - 0.09);
  const wingX0 = x0;
  const wingX1 = -0.9;
  const wingTop = 3.05;
  const wingBase = 1.22;
  const wing = addBox(g, wingX1 - wingX0, wingTop - wingBase, 0.14, toon('#f4efe6'), (wingX0 + wingX1) / 2, (wingBase + wingTop) / 2, z);
  wing.name = 'entry-wing';
  [
    [-4.7, 'NORTHLANE', ['FOUR LANES']],
    [-3.15, 'LANE 1', ['LEFT OF THE PAIR']],
    [-1.6, 'HOUSE BALLS', ['RACK ON THE LEFT']],
  ].forEach(([x, title, lines], i) => {
    const frame = addBox(g, 1.15, 0.52, 0.02, toon('#e2c27a'), x, 2.15, z - 0.08);
    frame.userData.noCast = true;
    const card = new THREE.Mesh(
      new THREE.PlaneGeometry(0.98, 0.38),
      toon('#fff6df', { map: paintCard(title, lines, i % 2 ? '#6e3038' : '#8d3a42') }),
    );
    card.rotation.y = Math.PI;
    card.position.set(x, 2.15, z - 0.1);
    card.userData.noCast = true;
    g.add(card);
  });
  const cap = addBox(g, span, 0.08, 0.2, toon('#3f3834'), mid, h + 0.02, z);
  cap.name = 'entry-cut';
  cap.userData.noCast = true;
}

function addConcourseCeiling(g) {
  const z0 = 4.85;
  const z1 = PLACED.entryZ + 0.15;
  const x0 = house.x0 - PLACED.bay + 0.15;
  const x1 = house.x1 + 1.15;
  const mat = toon('#f7f1e6');
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0, z1 - z0), mat);
  ceil.rotation.x = Math.PI / 2;
  ceil.position.set((x0 + x1) / 2, 3.02, (z0 + z1) / 2);
  ceil.userData.noCast = true;
  ceil.name = 'concourse-ceiling';
  g.add(ceil);
  const fascia = addBox(g, Math.min(x1, house.x1 + 0.15) - x0, 0.08, 0.06, toon('#6d4e36'), (x0 + Math.min(x1, house.x1 + 0.15)) / 2, 2.86, z0);
  fascia.userData.noCast = true;
  fascia.name = 'ceiling-fascia';
}

function addTruss(g) {
  const metal = toon('#7a7168');
  const glow = toon('#fff6e4', { emissive: '#fff6e4', emissiveIntensity: 1.2 });
  const zs = [-2.6, -7.4, -12.2, -17.0];
  const roofW = 1.15;
  const roofZ0 = -LANE.deckRear - 0.2;
  const roofZ1 = LANE.approach - 0.3;
  const roof = addBox(
    g,
    roofW,
    0.07,
    roofZ1 - roofZ0,
    toon('#f4efe6'),
    house.x0 + roofW / 2 - 0.05,
    3.38,
    (roofZ0 + roofZ1) / 2,
  );
  roof.userData.noCast = true;
  roof.name = 'ceiling';
  const edge = addBox(g, 0.06, 0.12, roofZ1 - roofZ0, toon('#4a433c'), house.x0 + roofW - 0.02, 3.34, (roofZ0 + roofZ1) / 2);
  edge.name = 'ceiling-cut';
  edge.userData.noCast = true;
  zs.forEach((z) => {
    const beam = addBox(g, house.total + 0.9, 0.06, 0.08, metal, 0.15, 3.22, z);
    beam.userData.noCast = true;
    const tube = addBox(g, house.total - 0.2, 0.055, 0.1, glow, 0.15, 3.12, z);
    tube.userData.noCast = true;
    const spot = new THREE.PointLight(0xfff3dc, 0.42, 12, 1.5);
    spot.position.set(0, 2.7, z);
    g.add(spot);
  });
  const wash = new THREE.PointLight(0xffe7c4, 0.55, 16, 1.4);
  wash.position.set(2.4, 2.8, 3.4);
  g.add(wash);
}

function makeShell() {
  const g = new THREE.Group();
  g.name = 'northlane';
  const laneMap = paintLane();
  const approachMap = paintApproach();
  const carpetMap = paintCarpet();
  carpetMap.repeat.set(3.2, 1.4);

  const laneFloorW = house.total + 1.15;
  const laneFloorD = LANE.deckRear + LANE.approach + 0.7;
  const laneFloor = addBox(g, laneFloorW, 0.16, laneFloorD, toon('#c4b6a4'), 0, -0.08, (-LANE.deckRear + LANE.approach) / 2);
  laneFloor.userData.noCast = true;
  laneFloor.receiveShadow = true;
  const concW = house.total + PLACED.bay * 2 + 0.4;
  const concD = PLACED.entryZ - LANE.approach + 0.7;
  const concFloor = addBox(
    g,
    concW,
    0.16,
    concD,
    toon('#c4b6a4'),
    (house.x0 - PLACED.bay + house.x1 + PLACED.bay) / 2,
    -0.08,
    (LANE.approach + PLACED.entryZ) / 2 + 0.1,
  );
  concFloor.userData.noCast = true;
  concFloor.receiveShadow = true;

  for (const lane of house.lanes) {
    const deck = addDeck(g, lane.width, LANE.deckRear, lane.cx, -LANE.deckRear / 2, laneMap, MAPLE);
    deck.name = `lane_${lane.number}`;
  }
  addDeck(g, house.total, LANE.approach, 0, LANE.approach / 2, approachMap, '#ffffff');
  const riser = addBox(g, house.total, DECK - 0.02, 0.04, toon(WALNUT_DEEP), 0, (DECK + 0.02) / 2, LANE.approach);
  riser.userData.noCast = true;

  const carpetW = house.total + PLACED.bay * 2;
  const carpetD = PLACED.entryZ - LANE.approach;
  const carpet = addDeck(
    g,
    carpetW,
    carpetD,
    (house.x0 - PLACED.bay + house.x1 + PLACED.bay) / 2,
    (LANE.approach + PLACED.entryZ) / 2,
    carpetMap,
    '#ffffff',
    0.02,
  );
  carpet.name = 'carpet';

  const gutterMat = toon(GUTTER);
  for (const pair of house.pairs) {
    for (const span of [pair.gutterL, pair.gutterInL, pair.gutterInR, pair.gutterR]) addGutter(g, span, gutterMat);
    const coverLen = LANE.deckRear;
    const cover = addBox(
      g,
      pair.ballReturn.width,
      0.045,
      coverLen,
      toon('#d9d3c8'),
      pair.ballReturn.cx,
      DECK + 0.012,
      -coverLen / 2,
    );
    cover.name = `return_cap_${pair.index + 1}`;
    cover.userData.noCast = true;
    for (let z = -1.6; z > -LANE.deckRear; z -= 1.8) {
      const seam = addBox(g, pair.ballReturn.width, 0.008, 0.015, toon(BLACK), pair.ballReturn.cx, DECK + 0.038, z);
      seam.userData.noCast = true;
    }
  }
  const division = addBox(g, house.division.width, 0.05, LANE.deckRear, toon('#efd0a0'), 0, DECK + 0.02, -LANE.deckRear / 2);
  division.name = 'division';
  division.userData.noCast = true;

  const ink = toon(INK);
  const dotMat = toon('#2a211c');
  for (const lane of house.lanes) {
    const foul = addBox(g, lane.width, 0.008, LANE.foulWidth, ink, lane.cx, DECK + 0.008, 0);
    foul.userData.noCast = true;
    foul.name = `foul_${lane.number}`;
    for (const board of LANE.arrowBoards) {
      addArrow(g, lane.cx + boardOffset(board), -LANE.arrowFromFoul, ink);
    }
    for (const row of APPROACH_DOTS) {
      const z = approachDotZ(row);
      for (const board of LANE.arrowBoards) {
        const dot = addCyl(g, 0.009, 0.009, 0.006, dotMat, lane.cx + boardOffset(board), DECK + 0.006, z, 8);
        dot.userData.noCast = true;
      }
    }
    flatMark(g, 0.42, 0.42, paintNumeral(lane.number, '#3a2418'), lane.cx, DECK + 0.01, 3.96, -Math.PI / 2);
    for (const side of [-1, 1]) {
      const x = side < 0 ? lane.x0 - 0.02 : lane.x1 + 0.02;
      const z0 = -LANE.foulToHeadPin + 0.2;
      const z1 = -LANE.deckRear + 0.02;
      const kick = addBox(g, 0.04, 0.56, z0 - z1, toon('#4e4740'), x, DECK + 0.28, (z0 + z1) / 2);
      const cap = addBox(g, 0.055, 0.022, z0 - z1, toon(MAPLE), x, DECK + 0.57, (z0 + z1) / 2);
      cap.userData.noCast = true;
      kick.name = `kick_${lane.number}`;
    }
  }

  const pinProto = makePin();
  for (const lane of house.lanes) {
    for (const pin of pinLocals()) {
      const node = pinProto.clone(true);
      node.position.set(lane.cx + pin.x, DECK, -LANE.foulToHeadPin - pin.down);
      node.name = `pin_${lane.number}_${pin.n}`;
      g.add(node);
    }
    const spotMat = toon('#5a3a22');
    for (const pin of pinLocals()) {
      const spot = addCyl(g, LANE.pinSpot / 2, LANE.pinSpot / 2, 0.004, spotMat, lane.cx + pin.x, DECK + 0.003, -LANE.foulToHeadPin - pin.down, 10);
      spot.userData.noCast = true;
    }
  }

  const ballProto = BALLS.map((hex) => makeBall(hex));
  for (const pair of house.pairs) {
    addHood(g, pair, ballProto);
    addConsole(g, pair, paintScore(pair.index));
  }

  addMasking(g);
  addWalls(g);
  addCanopy(g);
  addEntryWall(g);
  addConcourseCeiling(g);
  addTruss(g);
  addRack(g, ballProto);
  addCubbies(g);

  for (const x of [house.x0 - 0.22, house.x1 + 0.22]) {
    const shelf = addBox(g, 0.36, 0.06, 0.7, toon(BLACK), x, 1.38, -LANE.deckRear + 0.35);
    shelf.name = 'speaker-shelf';
  }

  for (const lane of house.lanes) shadowBlob(g, lane.cx, PLACED.seatZ, 0.55, 0.5, 0.34);
  shadowBlob(g, house.x0 - 0.62, 5.95, 0.4, 1.35, 0.3);
  for (const z of [5.55, 6.35, 7.15]) shadowBlob(g, house.x1 + 1.07, z, 0.4, 0.4, 0.28);
  shadowBlob(g, house.x1 + 1.85, 6.35, 0.7, 2.2, 0.26);

  return g;
}

function tuneAsset(kind, prepared) {
  if (kind !== 'tv') return;
  prepared.traverse((obj) => {
    if (!obj.isMesh) return;
    if ((obj.name || '').includes('frame')) {
      obj.material = toon('#1a1e24', { emissive: '#d5e4ff', emissiveIntensity: 0.45 });
    }
  });
}

boot({
  makeShell,
  tuneAsset,
  readyText: 'Northlane — drag orbit · U unlit · T toon',
});
