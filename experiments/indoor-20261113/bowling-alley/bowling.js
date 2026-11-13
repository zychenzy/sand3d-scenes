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
const GUTTER = '#14110f';
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
    ['#7b5136', '#6a432c', '#8a5c3c', '#5e3b28', '#7a4e32'],
    '#543424',
  );
  return srgbTexture(canvas, false);
}

function paintCarpet() {
  const S = 512;
  const canvas = document.createElement('canvas');
  canvas.width = S;
  canvas.height = S;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = TEAL;
  ctx.fillRect(0, 0, S, S);
  ctx.strokeStyle = '#143238';
  ctx.lineWidth = 2;
  for (let i = 0; i < 18; i += 1) {
    ctx.beginPath();
    ctx.moveTo(0, i * 30);
    ctx.lineTo(S, i * 30 + 8);
    ctx.stroke();
  }
  const step = S / 4;
  const diamond = (cx, cy, r, color) => {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(cx, cy - r);
    ctx.lineTo(cx + r, cy);
    ctx.lineTo(cx, cy + r);
    ctx.lineTo(cx - r, cy);
    ctx.closePath();
    ctx.fill();
  };
  for (let y = 0; y < 4; y += 1) {
    for (let x = 0; x < 4; x += 1) {
      const cx = x * step + step / 2;
      const cy = y * step + step / 2;
      diamond(cx, cy, step * 0.3, '#b24a32');
      diamond(cx, cy, step * 0.12, '#e6d3a1');
    }
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
function shadowBlob(g, x, z, w, d, opacity = 0.4) {
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
  mesh.position.set(x, 0.012, z);
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
  mesh.receiveShadow = false;
  mesh.userData.noCast = true;
  mesh.userData.noReceive = true;
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
    toon(PIN, { emissive: PIN, emissiveIntensity: 0.46 }),
  );
  group.add(body);
  const stripe = toon(PIN_RED, { emissive: PIN_RED, emissiveIntensity: 0.4 });
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
  addBox(g, PLACED.hood.width + 0.04, 0.045, depth + 0.04, toon(BLACK), x, DECK + 0.42, zc);
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
  shadowBlob(g, x, zc, PLACED.hood.width * 0.9, depth * 0.85, 0.28);
}

function addConsole(g, pair, scoreMap) {
  const x = pair.ballReturn.cx;
  const z = PLACED.consoleZ;
  const w = PLACED.consoleWidth;
  const d = PLACED.consoleDepth;
  const h = PLACED.consoleHeight;
  const body = addBox(g, w, h - 0.04, d, toon('#2a2624'), x, (h - 0.04) / 2, z);
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
  const zWall = -LANE.deckRear - 0.28;
  const width = house.total + 0.7;
  addBox(g, width, 3.5, 0.22, toon(POCHE), 0, 1.75, zWall);
  const valance = addBox(g, width, 1.55, 0.16, toon(OXBLOOD), 0, 2.55, zWall + 0.12);
  valance.name = 'masking';
  addBox(g, width, 0.035, 0.18, toon(GOLD), 0, 1.8, zWall + 0.14);
  addBox(g, width, 0.025, 0.18, toon(GOLD), 0, 3.28, zWall + 0.14);
  for (const lane of house.lanes) {
    const plate = new THREE.Mesh(
      new THREE.PlaneGeometry(0.42, 0.52),
      toon(GOLD, { map: paintMaskNumber(lane.number) }),
    );
    plate.position.set(lane.cx, 2.5, zWall + 0.21);
    plate.name = `mask_${lane.number}`;
    g.add(plate);
    const pit = addBox(
      g,
      lane.width * 0.92,
      1.55,
      0.04,
      toon('#0c0a09'),
      lane.cx,
      DECK + 0.78,
      -LANE.deckRear - 0.02,
    );
    pit.userData.noCast = true;
  }
}

function addWalls(g) {
  const plaster = toon(IVORY);
  const wainscot = toon(WALNUT_DEEP);
  const rail = toon(GOLD);
  const h = 3.5;
  const z0 = -LANE.deckRear - 0.4;
  const z1 = LANE.approach;
  const zc = (z0 + z1) / 2;
  const len = z1 - z0;
  const leftX = house.x0 - 0.12;
  addBox(g, 0.16, h, len, plaster, leftX, h / 2, zc);
  addBox(g, 0.02, 1.12, len, wainscot, leftX + 0.09, 0.56, zc);
  addBox(g, 0.04, 0.04, len, rail, leftX + 0.1, 1.14, zc);
  const cutL = addBox(g, 0.16, h, 0.08, toon(POCHE), leftX, h / 2, z1);
  cutL.name = 'cut-left';

  const rightX = house.x1 + 0.12;
  addBox(g, 0.16, h, len, plaster, rightX, h / 2, zc);
  addBox(g, 0.02, 1.12, len, wainscot, rightX - 0.09, 0.56, zc);
  addBox(g, 0.04, 0.04, len, rail, rightX - 0.1, 1.14, zc);
  const cutR = addBox(g, 0.16, h, 0.08, toon(POCHE), rightX, h / 2, z1);
  cutR.name = 'cut-right';

  const bayX = house.x0 - PLACED.bay;
  const bayZ0 = LANE.approach;
  const bayZ1 = PLACED.entryZ - 0.05;
  const bayLen = bayZ1 - bayZ0;
  addBox(g, 0.14, h, bayLen, plaster, bayX, h / 2, (bayZ0 + bayZ1) / 2);
  addBox(g, 0.02, 1.12, bayLen, wainscot, bayX + 0.08, 0.56, (bayZ0 + bayZ1) / 2);
  addBox(g, 0.14, h, 0.08, toon(POCHE), bayX, h / 2, bayZ1);
}

function addSoffit(g) {
  const z0 = LANE.approach - 0.15;
  const z1 = PLACED.entryZ;
  const x0 = house.x0 - 2.3;
  const x1 = house.x1 + 0.85;
  const slab = addBox(g, x1 - x0, 0.12, z1 - z0, toon('#2e2926'), (x0 + x1) / 2, 3.14, (z0 + z1) / 2);
  slab.userData.noCast = true;
  slab.name = 'soffit';
  const fascia = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 0.62), toon(GOLD, { map: paintWord() }));
  fascia.position.set(0.2, 2.55, z1 + 0.02);
  fascia.name = 'wordmark';
  g.add(fascia);
  addBox(g, x1 - x0, 0.12, 0.06, toon(POCHE), (x0 + x1) / 2, 3.14, z1);
}

function addTruss(g) {
  const metal = toon('#2a2624');
  const glow = toon('#f7f1e2', { emissive: '#f7f1e2', emissiveIntensity: 1.05 });
  for (const z of [-3.2, -8.1, -13, -17.4]) {
    addBox(g, house.total + 0.4, 0.06, 0.08, metal, 0, 3.32, z);
    const tube = addBox(g, house.total - 0.3, 0.025, 0.05, glow, 0, 3.26, z);
    tube.userData.noCast = true;
    const spot = new THREE.PointLight(0xfff4e2, 0.22, 9, 2);
    spot.position.set(0, 3.05, z);
    g.add(spot);
  }
  for (const pair of house.pairs) {
    const spot = new THREE.PointLight(0xfff8ee, 0.55, 7, 2);
    spot.position.set(pair.cx, 2.7, -17.2);
    g.add(spot);
  }
}

function makeShell() {
  const g = new THREE.Group();
  g.name = 'northlane';
  const laneMap = paintLane();
  const approachMap = paintApproach();
  const carpetMap = paintCarpet();
  carpetMap.repeat.set(8, 3.2);

  const slabW = house.total + PLACED.bay * 2 + 0.8;
  const slabD = LANE.deckRear + PLACED.entryZ + 1.2;
  const slab = addBox(g, slabW, 0.16, slabD, toon(POCHE), (house.x0 - PLACED.bay + house.x1 + PLACED.bay) / 2, -0.08, (-LANE.deckRear + PLACED.entryZ) / 2);
  slab.userData.noCast = true;
  slab.receiveShadow = true;

  for (const lane of house.lanes) {
    const deck = addDeck(g, lane.width, LANE.deckRear, lane.cx, -LANE.deckRear / 2, laneMap, MAPLE);
    deck.name = `lane_${lane.number}`;
  }
  addDeck(g, house.total, LANE.approach, 0, LANE.approach / 2, approachMap, '#7a5136');
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
      const kick = addBox(g, 0.04, 0.58, z0 - z1, toon(BLACK), x, DECK + 0.29, (z0 + z1) / 2);
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
  addSoffit(g);
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
