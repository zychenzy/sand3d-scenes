import * as THREE from 'three';
import { boot, toon, addBox, createPlanarMirror, updatePlanarMirror } from './scene_lib.js';

const paintCache = new Map();
function paint(hex, opts) {
  const key = hex + JSON.stringify(opts || {});
  if (!paintCache.has(key)) paintCache.set(key, toon(hex, opts));
  return paintCache.get(key);
}

const C = {
  plaster: '#f4f0e8',
  examWall: '#e5eef1',
  oak: '#c6a36a',
  oakDark: '#a68450',
  trim: '#7a5640',
  lino: '#b7c9c6',
  linoDark: '#8eaaa6',
  felt: '#1f6a72',
  feltDeep: '#163f48',
  steel: '#8d969e',
  steelDark: '#2f3a44',
  bulb: '#fff4d0',
  navy: '#1c3d4c',
  cream: '#f6f1e6',
  tortoise: '#6b3e28',
  black: '#2a2e33',
  olive: '#3c5346',
  coral: '#c46a5c',
  burgundy: '#7a3548',
  crystal: '#e6e1d6',
  navyFrame: '#1d3554',
  amber: '#c9843a',
  vinyl: '#d5e1e6',
  examSeat: '#3f6670',
};

function quiet(mesh, receive = true) {
  if (!mesh) return mesh;
  mesh.castShadow = false;
  mesh.userData.noShadow = true;
  mesh.userData.receiveShadow = receive;
  return mesh;
}

function labelTexture(text, bg, fg, w, h, font) {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = fg;
  ctx.font = `700 ${font}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, w / 2, h / 2 + font * 0.04);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function signPlate(g, text, bg, fg, w, h, x, y, z, rotY, cw, ch, font) {
  const tex = labelTexture(text, bg, fg, cw, ch, font);
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), paint('#ffffff', { map: tex }));
  mesh.position.set(x, y, z);
  mesh.rotation.y = rotY;
  quiet(mesh, false);
  g.add(mesh);
  return mesh;
}

const rimCache = new Map();
function rimPoints(kind, outer) {
  const pts = [];
  const n = 40;
  for (let i = 0; i < n; i++) {
    const t = (i / n) * Math.PI * 2;
    const c = Math.cos(t);
    const s = Math.sin(t);
    let x = c;
    let y = s;
    if (kind === 'round') {
      x *= 0.027;
      y *= 0.023;
    } else if (kind === 'wayfarer') {
      x *= 0.029 * (0.84 + 0.22 * Math.max(s, 0));
      y *= 0.016;
    } else if (kind === 'cateye') {
      x *= 0.031;
      const lift = Math.pow(Math.max(outer * c, 0), 1.2);
      y = s * 0.015 + lift * 0.014;
    } else if (kind === 'aviator') {
      const k = 0.7 + 0.34 * Math.max(-s, 0);
      x *= 0.025 * k;
      y = s * 0.021 - 0.002;
    } else {
      x = Math.sign(c) * Math.pow(Math.abs(c), 0.3) * 0.029;
      y = Math.sign(s) * Math.pow(Math.abs(s), 0.4) * 0.016;
    }
    pts.push(new THREE.Vector3(x, y, 0));
  }
  return pts;
}

function rimGeometry(kind, outer) {
  const key = `${kind}:${outer}`;
  if (rimCache.has(key)) return rimCache.get(key);
  const curve = new THREE.CatmullRomCurve3(rimPoints(kind, outer), true, 'catmullrom', 0.08);
  const geo = new THREE.TubeGeometry(curve, 48, 0.0034, 5, true);
  rimCache.set(key, geo);
  return geo;
}

const lensGeo = new THREE.CircleGeometry(0.02, 18);
const templeGeo = new THREE.BoxGeometry(0.006, 0.007, 0.12);

function eyeglasses(kind, frameColor, lensColor, sun) {
  const g = new THREE.Group();
  g.userData.frame = true;
  g.userData.kindName = kind;
  const frameMat = paint(frameColor);
  const lensMat = paint(lensColor, {
    transparent: true,
    opacity: sun ? 0.62 : 0.28,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  for (const side of [-1, 1]) {
    const rim = new THREE.Mesh(rimGeometry(kind, side), frameMat);
    rim.position.x = side * 0.034;
    rim.castShadow = true;
    g.add(rim);
    const lens = new THREE.Mesh(lensGeo, lensMat);
    lens.position.set(side * 0.034, 0, 0.001);
    lens.scale.set(kind === 'aviator' ? 1.15 : 1.05, kind === 'round' ? 1.05 : 0.85, 1);
    quiet(lens, false);
    g.add(lens);
    const temple = new THREE.Mesh(templeGeo, frameMat);
    temple.position.set(side * 0.058, 0.002, -0.055);
    temple.rotation.y = side * -0.18;
    temple.castShadow = true;
    g.add(temple);
    const pad = new THREE.Mesh(new THREE.SphereGeometry(0.0032, 8, 6), paint('#d9cfc2'));
    pad.position.set(side * 0.01, -0.01, 0.006);
    g.add(pad);
  }
  const bridge = new THREE.Mesh(new THREE.BoxGeometry(0.016, 0.005, 0.005), frameMat);
  bridge.position.y = 0.004;
  g.add(bridge);
  if (kind === 'brow' || kind === 'wayfarer') {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(0.078, 0.008, 0.006), frameMat);
    bar.position.y = 0.02;
    g.add(bar);
  }
  if (kind === 'aviator') {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.004, 0.004), paint('#c2b39a'));
    bar.position.y = 0.02;
    g.add(bar);
  }
  return g;
}

const STOCK = [
  ['round', C.black, '#9bb0be', false],
  ['wayfarer', C.tortoise, '#3a2418', true],
  ['cateye', C.burgundy, '#e7b7a8', false],
  ['aviator', '#b7b1a4', '#6e8c78', true],
  ['brow', C.navyFrame, '#d5dde4', false],
  ['round', C.crystal, '#f4f7f4', false],
  ['wayfarer', C.olive, '#1e2a24', true],
  ['cateye', C.coral, '#f0d2c8', false],
  ['aviator', C.black, '#8a6844', true],
  ['brow', C.tortoise, '#efe6dc', false],
];

function placeFrames(parent, spec) {
  const { x, y, z, rotY = 0, count = 5, tilt = 0.16, gap = 0.15, start = 0, scale = 1 } = spec;
  const row = new THREE.Group();
  for (let i = 0; i < count; i++) {
    const item = STOCK[(start + i) % STOCK.length];
    const frame = eyeglasses(item[0], item[1], item[2], item[3]);
    frame.position.set((i - (count - 1) / 2) * gap, 0.045 * scale, 0);
    frame.rotation.x = tilt;
    frame.scale.setScalar(scale);
    row.add(frame);
  }
  row.position.set(x, y, z);
  row.rotation.y = rotY;
  parent.add(row);
  return row;
}

function contact(g, x, z, rx, rz) {
  const mesh = new THREE.Mesh(
    new THREE.CircleGeometry(1, 16),
    paint('#4a3c32', { transparent: true, opacity: 0.14, depthWrite: false, polygonOffset: true }),
  );
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set(x, 0.03, z);
  mesh.scale.set(rx, rz, 1);
  return quiet(mesh, false), g.add(mesh);
}

function bulb(g, x, y, z) {
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(0.028, 10, 8), new THREE.MeshBasicMaterial({ color: C.bulb }));
  mesh.position.set(x, y, z);
  mesh.userData.keepBasic = true;
  g.add(mesh);
  return mesh;
}

function makeShell(layout) {
  const g = new THREE.Group();
  g.name = 'shell';
  const { width: W, depth: D, height: H } = layout.meta.room;
  const p = layout.places;
  const halfW = W / 2;
  const halfD = D / 2;
  const floor = addBox(g, W, 0.08, D, paint(C.oakDark), 0, -0.04, 0);
  quiet(floor, true);

  let i = 0;
  for (let z = -halfD + 0.12; z < halfD - 0.08; z += 0.18) {
    const inExam = z < p.exam.z1;
    const x1 = inExam ? p.partitionX - 0.08 : halfW - 0.12;
    const x0 = -halfW + 0.14;
    const plank = addBox(g, x1 - x0, 0.012, 0.15, paint(i % 2 ? C.oak : C.oakDark), (x0 + x1) / 2, 0.012, z);
    quiet(plank, true);
    i += 1;
  }
  const lino = addBox(
    g,
    halfW - 0.12 - p.exam.x0,
    0.018,
    p.exam.z1 + halfD - 0.16,
    paint(C.lino),
    (p.exam.x0 + halfW - 0.12) / 2,
    0.02,
    (p.exam.z1 - halfD + 0.1) / 2,
  );
  quiet(lino, true);
  for (let z = p.lane.z0; z < p.lane.z1; z += 0.55) {
    const joint = addBox(g, p.lane.w, 0.004, 0.012, paint(C.linoDark), p.lane.x, 0.032, z);
    quiet(joint, false);
  }
  const mat = addBox(g, 1.15, 0.012, 1.25, paint('#d9c7aa'), -4.7, 0.028, -2.85);
  quiet(mat, true);

  const backRetail = addBox(g, p.partitionX + halfW, H, 0.12, paint(C.plaster), (p.partitionX - halfW) / 2, H / 2, -halfD + 0.06);
  quiet(backRetail, false);
  const backExam = addBox(g, halfW - p.partitionX, H, 0.12, paint(C.examWall), (halfW + p.partitionX) / 2, H / 2, -halfD + 0.06);
  quiet(backExam, false);

  const left = new THREE.Group();
  left.name = 'left-wall';
  left.userData.hideInMirror = true;
  g.add(left);
  const wallX = -halfW + 0.06;
  const mirror = p.mirror;
  const win = p.window;
  const bands = [
    { y0: 0, y1: win.y0, z0: -halfD, z1: halfD },
    { y0: win.y1, y1: H, z0: -halfD, z1: halfD },
    { y0: win.y0, y1: win.y1, z0: -halfD, z1: win.z0 },
    { y0: win.y0, y1: win.y1, z0: win.z1, z1: halfD },
  ];
  for (const b of bands) {
    const mesh = addBox(left, 0.12, b.y1 - b.y0, b.z1 - b.z0, paint(C.plaster), wallX, (b.y0 + b.y1) / 2, (b.z0 + b.z1) / 2);
    quiet(mesh, false);
  }
  const glass = addBox(
    left,
    0.04,
    win.y1 - win.y0,
    win.z1 - win.z0,
    paint('#d5e6ee', { transparent: true, opacity: 0.28, side: THREE.DoubleSide, emissive: '#f7fbfe', emissiveIntensity: 0.45, depthWrite: false }),
    wallX + 0.02,
    (win.y0 + win.y1) / 2,
    (win.z0 + win.z1) / 2,
  );
  quiet(glass, false);
  for (let z = win.z0 + 0.08; z < win.z1; z += 0.52) {
    addBox(left, 0.05, win.y1 - win.y0, 0.045, paint(C.trim), wallX + 0.05, (win.y0 + win.y1) / 2, z);
  }
  addBox(left, 0.06, 0.06, win.z1 - win.z0 + 0.08, paint(C.trim), wallX + 0.05, win.y0, (win.z0 + win.z1) / 2);
  addBox(left, 0.06, 0.06, win.z1 - win.z0 + 0.08, paint(C.trim), wallX + 0.05, win.y1, (win.z0 + win.z1) / 2);

  addBox(g, p.partitionX + halfW - 0.4, 0.78, 0.04, paint(C.trim), (p.partitionX - halfW) / 2 - 0.05, 0.48, -halfD + 0.12);
  addBox(g, 0.04, 0.78, D - 0.5, paint(C.trim), -halfW + 0.12, 0.48, 0.1);
  addBox(g, p.partitionX + halfW - 0.5, 0.06, 0.05, paint(C.oakDark), (p.partitionX - halfW) / 2, 0.92, -halfD + 0.12);

  const px = p.partitionX;
  const door = p.door;
  addBox(g, 0.12, H, -halfD - door.z0, paint(C.examWall), px, H / 2, (-halfD + door.z0) / 2);
  addBox(g, 0.12, H, p.exam.z1 - door.z1, paint(C.examWall), px, H / 2, (door.z1 + p.exam.z1) / 2);
  addBox(g, 0.12, H - door.h, door.z1 - door.z0, paint(C.examWall), px, (H + door.h) / 2, (door.z0 + door.z1) / 2);
  // Shop side of the partition is plaster with the same dado as the retail walls.
  const shopFace = px - 0.09;
  const backLen = Math.abs(-halfD - door.z0) + 0.04;
  const frontLen = Math.abs(p.exam.z1 - door.z1) + 0.02;
  const backZ = (-halfD + door.z0) / 2;
  const frontZ = (door.z1 + p.exam.z1) / 2;
  quiet(addBox(g, 0.035, H, backLen, paint(C.plaster), shopFace, H / 2, backZ), false);
  quiet(addBox(g, 0.035, H, frontLen, paint(C.plaster), shopFace, H / 2, frontZ), false);
  quiet(addBox(g, 0.035, H - door.h - 0.02, door.z1 - door.z0, paint(C.plaster), shopFace, (H + door.h) / 2 + 0.02, (door.z0 + door.z1) / 2), false);
  quiet(addBox(g, 0.045, 0.78, backLen, paint(C.trim), shopFace - 0.02, 0.48, backZ), false);
  quiet(addBox(g, 0.045, 0.78, frontLen, paint(C.trim), shopFace - 0.02, 0.48, frontZ), false);
  addBox(g, 0.16, door.h, 0.06, paint(C.navy), px, door.h / 2, door.z0);
  addBox(g, 0.16, door.h, 0.06, paint(C.navy), px, door.h / 2, door.z1);
  addBox(g, 0.16, 0.08, door.z1 - door.z0, paint(C.navy), px, door.h, (door.z0 + door.z1) / 2);
  const thresh = addBox(g, 0.7, 0.02, door.z1 - door.z0 - 0.08, paint('#d7c4a4'), px + 0.15, 0.03, (door.z0 + door.z1) / 2);
  quiet(thresh, true);
  const header = addBox(g, halfW - px - 0.05, 0.18, 0.12, paint(C.navy), (halfW + px) / 2 + 0.05, 2.48, p.exam.z1);
  quiet(header, false);

  const examCeil = addBox(g, halfW - px - 0.15, 0.08, -p.exam.z1 + halfD - 0.25, paint('#f4f7f8'), (halfW + px) / 2, 2.78, (p.exam.z1 - halfD) / 2);
  quiet(examCeil, false);
  const batten = addBox(g, 0.16, 0.05, 2.4, new THREE.MeshBasicMaterial({ color: '#f3f7fb' }), p.chart.x, 2.7, -2.55);
  batten.userData.keepBasic = true;

  addBox(g, W * 0.62, 0.08, 1.3, paint(layout.shell.ceilingColor), -1.3, H - 0.1, -2.6);
  for (const z of [-3.3, -0.4, 2.2]) {
    const beam = addBox(g, W * 0.55, 0.1, 0.12, paint(C.trim), -1.15, H - 0.22, z);
    quiet(beam, false);
  }
  return g;
}

function cabinet(g, spec, index) {
  const { x, z, w, h, d } = spec;
  const shell = new THREE.Group();
  shell.position.set(x, 0, z);
  const t = 0.045;
  addBox(shell, w, h, t, paint(C.trim), 0, h / 2, -d / 2 + t / 2);
  addBox(shell, t, h, d, paint(C.trim), -w / 2 + t / 2, h / 2, 0);
  addBox(shell, t, h, d, paint(C.trim), w / 2 - t / 2, h / 2, 0);
  addBox(shell, w, t, d, paint(C.trim), 0, t / 2, 0);
  addBox(shell, w, 0.06, d, paint(C.oakDark), 0, h - 0.03, 0);
  addBox(shell, w - 0.12, h - 0.16, 0.02, paint(C.feltDeep), 0, h / 2 + 0.02, -d / 2 + t + 0.02);
  const shelves = [0.46, 0.96, 1.44];
  shelves.forEach((y, s) => {
    addBox(shell, w - 0.12, 0.028, d - 0.1, paint(C.felt), 0, y, 0.03);
    const strip = addBox(shell, w - 0.2, 0.012, 0.02, new THREE.MeshBasicMaterial({ color: '#fff6df' }), 0, y + 0.16, d / 2 - 0.06);
    strip.userData.keepBasic = true;
    placeFrames(shell, {
      x: 0,
      y,
      z: d * 0.08,
      count: 4,
      gap: (w - 0.34) / 3,
      start: index * 3 + s,
      tilt: 0.2,
      scale: 1.45,
    });
  });
  const door = addBox(
    shell,
    w - 0.1,
    h - 0.14,
    0.012,
    paint('#e7f2f6', { transparent: true, opacity: 0.1, side: THREE.DoubleSide, depthWrite: false }),
    0,
    h / 2,
    d / 2 - 0.01,
  );
  quiet(door, false);
  g.add(shell);
  contact(g, x, z + 0.05, w * 0.42, 0.22);
}

function vitrine(g, spec, index) {
  const { x, z, w, d, h } = spec;
  addBox(g, w, 0.08, d, paint(C.trim), x, 0.08, z);
  addBox(g, w - 0.08, 0.7, d - 0.08, paint('#f7f4ee'), x, 0.46, z);
  addBox(g, w - 0.12, 0.025, d - 0.14, paint(C.felt), x, 0.82, z);
  const glassMat = paint('#d5e6ee', { transparent: true, opacity: 0.18, side: THREE.DoubleSide, depthWrite: false });
  quiet(addBox(g, w, h - 0.84, 0.02, glassMat, x, 0.84 + (h - 0.84) / 2, z + d / 2), false);
  quiet(addBox(g, w, h - 0.84, 0.02, glassMat, x, 0.84 + (h - 0.84) / 2, z - d / 2), false);
  quiet(addBox(g, 0.02, h - 0.84, d, glassMat, x - w / 2, 0.84 + (h - 0.84) / 2, z), false);
  quiet(addBox(g, 0.02, h - 0.84, d, glassMat, x + w / 2, 0.84 + (h - 0.84) / 2, z), false);
  placeFrames(g, { x, y: 0.84, z, count: 6, gap: (w - 0.22) / 5, start: 4 + index * 2, tilt: 0.12 });
  const names = ['ROUND  /  BROW', 'SUN  /  METAL'];
  signPlate(g, names[index], '#1f6a72', '#f6f1e6', w * 0.7, 0.06, x, 0.16, z + d / 2 + 0.01, 0, 512, 64, 36);
  contact(g, x, z, w * 0.42, d * 0.4);
}

function fittingMirror(g, layout, mirrors) {
  const m = layout.places.mirror;
  const ledge = layout.places.ledge;
  const frameD = 0.04;
  addBox(g, frameD, m.h + 0.1, m.w + 0.1, paint(C.navy), m.x + 0.02, m.y, m.z);
  const mirror = createPlanarMirror(m.w, m.h);
  mirror.mesh.position.set(m.x + 0.045, m.y, m.z);
  mirror.mesh.rotation.y = Math.PI / 2;
  g.add(mirror.mesh);
  mirrors.push(mirror);
  const inset = 0.02;
  for (const side of [-1, 1]) {
    for (const step of [-0.28, 0, 0.28]) {
      bulb(g, m.x + 0.07, m.y + step, m.z + side * (m.w / 2 + inset));
    }
  }
  addBox(g, ledge.d, 0.05, ledge.w, paint(C.trim), ledge.x, ledge.y, ledge.z);
  addBox(g, ledge.d - 0.04, 0.02, ledge.w - 0.08, paint(C.felt), ledge.x + 0.02, ledge.y + 0.035, ledge.z);
  placeFrames(g, { x: ledge.x + 0.04, y: ledge.y + 0.05, z: ledge.z, rotY: Math.PI / 2, count: 3, gap: 0.22, start: 1, tilt: 0.2 });
  signPlate(g, 'FITTING', '#1c3d4c', '#f6f1e6', 0.42, 0.08, m.x + 0.06, m.y + m.h / 2 + 0.1, m.z, Math.PI / 2, 512, 96, 64);
}

function reception(g, layout) {
  const r = layout.places.reception;
  addBox(g, r.w, r.h - 0.04, r.d, paint(C.trim), r.x, (r.h - 0.04) / 2, r.z);
  addBox(g, r.w + 0.04, 0.045, r.d + 0.06, paint('#e7e2d8'), r.x, r.h, r.z);
  addBox(g, 0.46, 0.16, 0.04, paint(C.navy), r.x + 0.55, 0.72, r.z - r.d / 2 - 0.01);
  signPlate(g, 'APPTS', '#f6f1e6', '#1c3d4c', 0.42, 0.09, r.x + 0.78, r.h + 0.07, r.z + 0.28, 0, 384, 96, 52);
  contact(g, r.x, r.z, r.w * 0.42, r.d * 0.45);
}

function examChair(g, place) {
  const grp = new THREE.Group();
  grp.name = 'exam-chair';
  grp.position.set(place.x, 0, place.z);
  addBox(grp, 0.46, 0.08, 0.48, paint(C.examSeat), 0, 0.5, 0);
  addBox(grp, 0.46, 0.5, 0.08, paint(C.examSeat), 0, 0.78, 0.2);
  addBox(grp, 0.28, 0.16, 0.08, paint('#edf3f5'), 0, 1.12, 0.2);
  addBox(grp, 0.08, 0.08, 0.42, paint(C.steel), -0.28, 0.58, -0.02);
  addBox(grp, 0.08, 0.08, 0.42, paint(C.steel), 0.28, 0.58, -0.02);
  addBox(grp, 0.12, 0.48, 0.12, paint(C.steelDark), 0, 0.24, 0);
  addBox(grp, 0.5, 0.04, 0.5, paint(C.steelDark), 0, 0.04, 0);
  addBox(grp, 0.28, 0.03, 0.22, paint(C.steel), 0, 0.16, -0.34);
  g.add(grp);
  contact(g, place.x, place.z, 0.32, 0.34);
}

function phoropter(g, place) {
  const grp = new THREE.Group();
  grp.name = 'phoropter';
  const y = place.y;
  addBox(grp, 0.08, y, 0.08, paint(C.steelDark), place.x + 0.55, y / 2, place.z + 0.12);
  addBox(grp, 0.62, 0.05, 0.05, paint(C.steel), place.x + 0.28, y, place.z + 0.05);
  addBox(grp, 0.36, 0.22, 0.08, paint(C.steelDark), place.x, y, place.z);
  for (const side of [-1, 1]) {
    const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.04, 20), paint('#1c2228'));
    wheel.rotation.x = Math.PI / 2;
    wheel.position.set(place.x + side * 0.09, y, place.z + 0.03);
    grp.add(wheel);
    const glass = new THREE.Mesh(
      new THREE.CircleGeometry(0.045, 16),
      paint('#c5d5c8', { transparent: true, opacity: 0.45, depthWrite: false, side: THREE.DoubleSide }),
    );
    glass.position.set(place.x + side * 0.09, y, place.z + 0.055);
    quiet(glass, false);
    grp.add(glass);
    const dial = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.02, 10), paint('#d5dbe0'));
    dial.rotation.z = Math.PI / 2;
    dial.position.set(place.x + side * 0.2, y + 0.02, place.z);
    grp.add(dial);
  }
  addBox(grp, 0.22, 0.03, 0.04, paint('#d7dde2'), place.x, y + 0.12, place.z + 0.08);
  g.add(grp);
}

function chart(g, place) {
  const canvas = document.createElement('canvas');
  canvas.width = 460;
  canvas.height = 660;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#f4f1ea';
  ctx.fillRect(0, 0, 460, 660);
  ctx.fillStyle = '#1c2834';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const rows = ['E', 'F P', 'T O Z', 'L P E D', 'P E C F D', 'E D F C Z P', 'F E L O P Z D', 'D E F P O T E C'];
  rows.forEach((row, i) => {
    const font = 92 - i * 9;
    ctx.font = `700 ${font}px sans-serif`;
    ctx.fillText(row, 230, 70 + i * 72);
  });
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  const board = new THREE.Mesh(
    new THREE.PlaneGeometry(place.w, place.h),
    paint('#ffffff', { map: tex, emissive: '#fff8ee', emissiveIntensity: 0.18 }),
  );
  board.name = 'chart';
  board.position.set(place.x, place.y, place.z);
  quiet(board, false);
  g.add(board);
  addBox(g, place.w + 0.06, place.h + 0.06, 0.03, paint(C.steelDark), place.x, place.y, place.z - 0.02);
  const lamp = addBox(g, 0.28, 0.04, 0.1, new THREE.MeshBasicMaterial({ color: '#fff6d8' }), place.x, place.y + place.h / 2 + 0.08, place.z + 0.02);
  lamp.userData.keepBasic = true;
}

function trialLenses(g, layout) {
  const inst = layout.instances.find((item) => item.id === 'trial_case');
  const [x, , z] = inst.position;
  // The case opens +X into the lane. Discs are turned toward the cutaway
  // (about +Z) so the bank reads as lenses, not edge-on ticks on the side panel.
  const face = -0.95;
  for (let s = 0; s < 5; s++) {
    const y = 0.36 + s * 0.26;
    for (let i = 0; i < 6; i++) {
      const lens = new THREE.Mesh(
        new THREE.TorusGeometry(0.042, 0.007, 6, 16),
        paint(i % 2 ? '#e7eef3' : '#c5d8d0'),
      );
      lens.rotation.y = face;
      lens.position.set(x + 0.26, y, z - 0.3 + i * 0.12);
      quiet(lens, false);
      g.add(lens);
    }
  }
  signPlate(g, 'TRIAL LENSES', '#6d5344', '#f6f1e6', 0.7, 0.09, x + 0.34, 1.74, z, face, 640, 96, 42);
}

function toolsOnBench(g) {
  const desk = g; // positions in world
  const y = 0.78;
  const x = -4.7;
  const z = -1.58;
  addBox(desk, 0.34, 0.015, 0.2, paint(C.felt), x, y, z);
  const held = eyeglasses('round', C.black, '#d5dde4', false);
  held.position.set(x - 0.04, y + 0.02, z);
  held.rotation.x = -Math.PI / 2;
  held.rotation.z = 0.4;
  desk.add(held);
  addBox(desk, 0.012, 0.012, 0.09, paint('#c0c6cc'), x + 0.1, y + 0.02, z + 0.02);
  addBox(desk, 0.09, 0.012, 0.06, paint('#d9d3c8'), x + 0.08, y + 0.01, z - 0.05);
  for (let i = 0; i < 4; i++) {
    const screw = new THREE.Mesh(new THREE.SphereGeometry(0.006, 6, 5), paint('#c2b8a4'));
    screw.position.set(x + 0.06 + (i % 2) * 0.02, y + 0.02, z - 0.06 + Math.floor(i / 2) * 0.02);
    desk.add(screw);
  }
}

function foliage(g, x, z) {
  addBox(g, 0.22, 0.16, 0.18, paint('#3e6a45'), x, 0.4, z);
  addBox(g, 0.14, 0.12, 0.12, paint('#2f5a38'), x + 0.06, 0.5, z - 0.04);
}

function topoTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#e7f2f4';
  ctx.fillRect(0, 0, 256, 256);
  const rings = ['#7eb8c4', '#3d7f8c', '#1f4f5c', '#c46a5c'];
  rings.forEach((color, i) => {
    ctx.strokeStyle = color;
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.ellipse(128, 128, 100 - i * 18, 78 - i * 12, 0.2, 0, Math.PI * 2);
    ctx.stroke();
  });
  ctx.fillStyle = '#1c3d4c';
  ctx.font = '700 28px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('K', 128, 28);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function posTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 160;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#e7f0ea';
  ctx.fillRect(0, 0, 256, 160);
  ctx.fillStyle = '#1c3d4c';
  ctx.font = '700 36px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('FIELD', 128, 58);
  ctx.font = '600 28px sans-serif';
  ctx.fillText('RX  00', 128, 108);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

const mirrors = [];

function makeProcedural(layout) {
  const g = new THREE.Group();
  g.name = 'architecture';
  layout.places.cabinets.forEach((spec, i) => cabinet(g, spec, i));
  layout.places.vitrines.forEach((spec, i) => vitrine(g, spec, i));
  fittingMirror(g, layout, mirrors);
  reception(g, layout);
  examChair(g, layout.places.examChair);
  phoropter(g, layout.places.phoropter);
  chart(g, layout.places.chart);
  trialLenses(g, layout);
  toolsOnBench(g);
  const pot = layout.instances.find((item) => item.id === 'pot');
  foliage(g, pot.position[0], pot.position[2]);
  signPlate(
    g,
    'FIELD OPTICIANS',
    '#1c3d4c',
    '#f6f1e6',
    3.1,
    0.22,
    -1.45,
    2.58,
    -4.2,
    0,
    1024,
    80,
    48,
  );
  const door = layout.places.door;
  signPlate(g, 'EXAM', '#1c3d4c', '#f6f1e6', 0.36, 0.1, layout.places.partitionX - 0.08, 1.62, door.z0 - 0.28, -Math.PI / 2, 384, 96, 58);
  for (const id of ['chair_fitting', 'chair_adjust', 'chair_staff', 'chair_consult']) {
    const inst = layout.instances.find((item) => item.id === id);
    contact(g, inst.position[0], inst.position[2], 0.24, 0.24);
  }
  return g;
}

function prepareKind(kind, root) {
  if (kind === 'school_desk') {
    root.traverse((obj) => {
      if (/loop|wire/i.test(obj.name || '')) obj.visible = false;
    });
  }
  if (kind === 'monitor') {
    const tex = topoTexture();
    root.traverse((obj) => {
      if (!obj.isMesh) return;
      if (/screen/i.test(obj.name || '')) {
        obj.userData.keepBasic = true;
        obj.material = new THREE.MeshBasicMaterial({ map: tex, color: 0xffffff });
      }
    });
  }
  if (kind === 'pos_terminal') {
    const tex = posTexture();
    root.traverse((obj) => {
      if (!obj.isMesh) return;
      if (/screen/i.test(obj.name || '')) {
        obj.userData.keepBasic = true;
        obj.material = new THREE.MeshBasicMaterial({ map: tex, color: 0xffffff });
      }
    });
  }
}

boot({
  makeShell,
  makeProcedural,
  prepareKind,
  onFrame: (renderer, scene, camera) => {
    for (const mirror of mirrors) updatePlanarMirror(renderer, scene, camera, mirror);
  },
  readyText: 'Field Opticians — T toon · U unlit',
});
