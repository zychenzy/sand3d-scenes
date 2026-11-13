import * as THREE from 'three';
import { boot, toon, addBox, addCyl, noCast } from './scene_lib.js';

const labelCache = new Map();
const geoCache = new Map();

const maple = () => toon('#e7d0a4');
const spruce = () => toon('#f0ddb4');
const varnish = () => toon('#c9843a');
const varnishDeep = () => toon('#a86828');
const rib = () => toon('#efd7ae');
const walnut = () => toon('#6b4632');
const walnutDeep = () => toon('#4e3426');
const ebony = () => toon('#3a3128');
const felt = () => toon('#6e2438');
const brass = () => toon('#c6a15e');
const steel = () => toon('#b7c0c6');
const copper = () => toon('#b8734a');
const shavingMat = () => toon('#edd9ae');
const plaster = () => toon('#f4ecdf');
const paper = () => toon('#f7f1e2');
const stringMat = () => toon('#e6dcc8');

const VIOLIN = [
  [-0.18, 0.012], [-0.166, 0.05], [-0.148, 0.086], [-0.122, 0.104],
  [-0.096, 0.098], [-0.072, 0.078], [-0.052, 0.058], [-0.038, 0.082],
  [-0.028, 0.048], [-0.008, 0.044], [0.014, 0.042], [0.032, 0.052],
  [0.046, 0.078], [0.06, 0.054], [0.086, 0.08], [0.112, 0.086],
  [0.138, 0.07], [0.158, 0.044], [0.176, 0.02],
];

const GUITAR = [
  [-0.245, 0.02], [-0.218, 0.095], [-0.182, 0.168], [-0.142, 0.188],
  [-0.098, 0.168], [-0.052, 0.122], [-0.012, 0.108], [0.032, 0.13],
  [0.082, 0.15], [0.128, 0.14], [0.168, 0.105], [0.204, 0.064], [0.228, 0.03],
];

function labelMat(text, bg, fg, cw = 256, ch = 128) {
  const key = [text, bg, fg, cw, ch].join('|');
  if (labelCache.has(key)) return labelCache.get(key);
  const canvas = document.createElement('canvas');
  canvas.width = cw;
  canvas.height = ch;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, cw, ch);
  ctx.fillStyle = fg;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const size = text.length > 12 ? 42 : text.length > 8 ? 56 : 72;
  ctx.font = `700 ${size}px sans-serif`;
  const lines = text.split('\n');
  lines.forEach((line, i) => {
    ctx.fillText(line, cw / 2, ch / 2 + (i - (lines.length - 1) / 2) * (size + 6));
  });
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  tex.needsUpdate = true;
  const mat = toon('#ffffff', { map: tex });
  labelCache.set(key, mat);
  return mat;
}

function smoothClosed(samples, inset) {
  const right = samples.map(([y, w]) => new THREE.Vector2(Math.max(0.01, w - inset), y));
  const left = right.map((p) => new THREE.Vector2(-p.x, p.y)).reverse();
  const pts = right.concat(left);
  pts.push(right[0].clone());
  const curve = new THREE.SplineCurve(pts);
  const out = curve.getPoints(88);
  out.pop();
  return out;
}

function plateShape(samples, inset) {
  return new THREE.Shape(smoothClosed(samples, inset));
}

function extrude(key, shape, depth) {
  if (!geoCache.has(key)) {
    geoCache.set(key, new THREE.ExtrudeGeometry(shape, {
      depth,
      bevelEnabled: false,
      curveSegments: 2,
      steps: 1,
    }));
  }
  return geoCache.get(key);
}

function addMesh(g, geo, mat, x, y, z) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  g.add(m);
  return m;
}

function offsetHole(shape, ox, oy, sx, sy) {
  const pts = shape.getPoints(16).map((p) => new THREE.Vector2(ox + p.x * sx, oy + p.y * sy));
  pts.reverse();
  return new THREE.Path(pts);
}

function fHoleShape() {
  const s = new THREE.Shape();
  s.moveTo(0, -0.05);
  s.bezierCurveTo(0.012, -0.036, 0.014, -0.016, 0.004, -0.002);
  s.bezierCurveTo(-0.006, 0.014, 0.014, 0.03, 0.003, 0.05);
  s.lineTo(-0.004, 0.046);
  s.bezierCurveTo(0.004, 0.026, -0.012, 0.01, -0.003, -0.004);
  s.bezierCurveTo(0.006, -0.02, 0.001, -0.038, -0.004, -0.05);
  s.closePath();
  return s;
}

function buildInstrument(kind, opts = {}) {
  const g = new THREE.Group();
  g.name = kind;
  const samples = kind === 'guitar' ? GUITAR : VIOLIN;
  const depth = kind === 'guitar' ? 0.098 : 0.034;
  const bodyMat = opts.varnished ? varnish() : (kind === 'guitar' ? spruce() : rib());
  const edgeMat = opts.varnished ? varnishDeep() : maple();
  const open = !!opts.open;

  if (opts.plate && kind === 'violin') {
    const top = plateShape(VIOLIN, 0);
    for (const side of [-1, 1]) {
      top.holes.push(offsetHole(fHoleShape(), side * 0.04, 0.006, side * 1.7, 1.45));
    }
    addMesh(g, extrude('violin-loose-top', top, 0.008), spruce(), 0, 0, 0);
    const purf = plateShape(VIOLIN, 0.008);
    purf.holes.push(new THREE.Path(smoothClosed(VIOLIN, 0.014).reverse()));
    const purfle = addMesh(g, extrude('violin-purfle', purf, 0.003), toon('#9a704c'), 0, 0, 0.008);
    purfle.castShadow = false;
    purfle.userData.noShadow = true;
    const fMat = toon('#2f241c', { side: THREE.DoubleSide });
    for (const side of [-1, 1]) {
      const hole = addMesh(g, extrude(`fhole-loose-${side}`, fHoleShape(), 0.012), fMat, side * 0.04, 0.006, 0.004);
      hole.scale.set(side * 1.7, 1.45, 1);
      addCyl(g, 0.011, 0.011, 0.01, fMat, side * 0.038, 0.078, 0.012, 8);
      addCyl(g, 0.01, 0.01, 0.01, fMat, side * 0.046, -0.055, 0.012, 8);
    }
    addBox(g, 0.016, 0.16, 0.014, toon('#e7c48a'), -0.02, 0.01, 0.016);
    return g;
  }

  if (open) {
    const ribDepth = kind === 'guitar' ? depth : 0.052;
    const outer = plateShape(samples, 0);
    outer.holes.push(new THREE.Path(smoothClosed(samples, kind === 'guitar' ? 0.018 : 0.016).reverse()));
    const ribs = addMesh(g, extrude(`${kind}-ribs-b`, outer, ribDepth), toon('#f2d7ae'), 0, 0, -ribDepth / 2);
    ribs.castShadow = true;
    const back = plateShape(samples, kind === 'guitar' ? 0.014 : 0.012);
    addMesh(g, extrude(`${kind}-back-b`, back, 0.007), spruce(), 0, 0, -ribDepth / 2 + 0.001);
    const lining = plateShape(samples, kind === 'guitar' ? 0.012 : 0.01);
    lining.holes.push(new THREE.Path(smoothClosed(samples, kind === 'guitar' ? 0.022 : 0.02).reverse()));
    const lip = addMesh(g, extrude(`${kind}-lining-b`, lining, 0.006), toon('#f7e6c4'), 0, 0, ribDepth / 2 - 0.005);
    lip.castShadow = false;
    lip.userData.noShadow = true;
    const blocks = kind === 'guitar'
      ? [[0, -0.2, 0.05, 0.04], [0, 0.18, 0.046, 0.036]]
      : [[0, -0.152, 0.042, 0.032], [0, 0.148, 0.038, 0.03], [-0.078, -0.032, 0.03, 0.026], [0.078, -0.032, 0.03, 0.026], [-0.06, 0.05, 0.028, 0.024], [0.06, 0.05, 0.028, 0.024]];
    for (const [bx, by, bw, bh] of blocks) {
      addBox(g, bw, bh, ribDepth * 0.72, toon('#c49255'), bx, by, -0.002);
    }
    if (kind === 'violin') {
      addCyl(g, 0.006, 0.006, ribDepth * 0.7, toon('#e8d2a4'), 0.02, -0.01, -0.004, 6);
    }
  } else {
    const topShape = plateShape(samples, 0.001);
    if (kind === 'guitar') {
      const hole = new THREE.Path();
      hole.absarc(0, -0.02, 0.046, 0, Math.PI * 2, true);
      topShape.holes.push(hole);
    }
    const shell = plateShape(samples, 0);
    shell.holes.push(new THREE.Path(smoothClosed(samples, 0.008).reverse()));
    addMesh(g, extrude(`${kind}-edge`, shell, depth), edgeMat, 0, 0, -depth / 2);
    const top = addMesh(g, extrude(`${kind}-top-${opts.varnished ? 'v' : 's'}`, topShape, 0.006), bodyMat, 0, 0, depth / 2 - 0.004);
    top.castShadow = true;
    if (kind === 'violin') {
      const fh = extrude('fhole', fHoleShape(), 0.005);
      const fMat = toon('#3a3128', { side: THREE.DoubleSide });
      for (const side of [-1, 1]) {
        const hole = addMesh(g, fh, fMat, side * 0.032, 0.01, depth / 2 + 0.001);
        hole.scale.x = side;
        addCyl(g, 0.006, 0.006, 0.006, ebony(), side * 0.03, 0.058, depth / 2 + 0.006, 8);
        addCyl(g, 0.005, 0.005, 0.006, ebony(), side * 0.034, -0.04, depth / 2 + 0.006, 8);
      }
      addBox(g, 0.05, 0.012, 0.008, maple(), 0, -0.02, depth / 2 + 0.01);
      addBox(g, 0.018, 0.055, 0.01, ebony(), 0, -0.12, depth / 2 + 0.008);
    } else {
      addCyl(g, 0.055, 0.055, 0.004, varnishDeep(), 0, -0.02, depth / 2 + 0.006, 20);
      addBox(g, 0.09, 0.03, 0.012, ebony(), 0, -0.1, depth / 2 + 0.01);
      for (let i = 0; i < 6; i++) {
        addCyl(g, 0.004, 0.004, 0.008, maple(), -0.03 + i * 0.012, -0.1, depth / 2 + 0.018, 6);
      }
    }
  }

  const neckLen = kind === 'guitar' ? 0.46 : 0.145;
  const neckY = (kind === 'guitar' ? 0.228 : 0.176) + neckLen / 2;
  const neckW = kind === 'guitar' ? 0.028 : 0.016;
  const zNeck = (open && kind === 'violin') ? 0.014 : depth * 0.15;
  const zFace = (open && kind === 'violin') ? 0.032 : depth / 2;
  addBox(g, neckW, neckLen, kind === 'guitar' ? 0.02 : 0.014, maple(), 0, neckY, zNeck);
  const boardLen = neckLen + (kind === 'guitar' ? 0.08 : 0.1);
  const boardY = (kind === 'guitar' ? 0.2 : 0.15) + boardLen / 2 - 0.02;
  addBox(
    g,
    kind === 'guitar' ? 0.03 : (open ? 0.014 : 0.016),
    open ? neckLen * 0.72 : boardLen,
    open ? 0.005 : 0.006,
    open ? toon('#5a4638') : ebony(),
    0,
    open ? (kind === 'guitar' ? 0.3 : 0.22) : boardY,
    zFace + 0.006,
  );
  if (kind === 'guitar') {
    for (let i = 0; i < 8; i++) {
      addBox(g, 0.028, 0.003, 0.003, brass(), 0, 0.26 + i * 0.045, depth / 2 + 0.008);
    }
  }

  const nutY = (kind === 'guitar' ? 0.228 : 0.176) + neckLen;
  addBox(g, kind === 'guitar' ? 0.032 : 0.018, 0.008, 0.008, paper(), 0, nutY, zFace + 0.006);
  const headH = kind === 'guitar' ? 0.11 : 0.07;
  addBox(g, kind === 'guitar' ? 0.04 : 0.02, headH, 0.012, maple(), 0, nutY + headH / 2, (open && kind === 'violin') ? 0.012 : depth * 0.1);
  if (kind === 'violin') {
    const scrollR = open ? 0.026 : 0.016;
    const scroll = new THREE.Mesh(new THREE.TorusGeometry(scrollR, open ? 0.008 : 0.0065, 6, 16, Math.PI * 1.5), maple());
    scroll.position.set(0.002, nutY + headH + (open ? 0.01 : 0.004), 0.004);
    scroll.castShadow = true;
    g.add(scroll);
    for (const side of [-1, 1]) {
      addCyl(g, 0.005, 0.006, 0.028, ebony(), side * 0.02, nutY + 0.03, 0.004, 8).rotation.z = Math.PI / 2;
      addCyl(g, 0.005, 0.006, 0.028, ebony(), side * 0.02, nutY + 0.052, 0.004, 8).rotation.z = Math.PI / 2;
    }
  } else {
    for (let i = 0; i < 3; i++) {
      addCyl(g, 0.006, 0.007, 0.012, brass(), -0.012 + (i % 3) * 0.012, nutY + 0.03 + Math.floor(i / 3) * 0.02, 0.012, 8);
      addCyl(g, 0.006, 0.007, 0.012, brass(), -0.012 + i * 0.012, nutY + 0.07, 0.012, 8);
    }
  }

  if (opts.showStrings !== false && !open) {
    const n = kind === 'guitar' ? 6 : 4;
    const span = kind === 'guitar' ? 0.028 : 0.014;
    const y0 = kind === 'guitar' ? -0.1 : -0.12;
    const y1 = nutY;
    for (let i = 0; i < n; i++) {
      const x = -span / 2 + (n === 1 ? 0 : (span * i) / (n - 1));
      const string = addCyl(g, 0.0016, 0.0016, y1 - y0, stringMat(), x, (y0 + y1) / 2, depth / 2 + 0.012, 4);
      string.castShadow = false;
      string.userData.noShadow = true;
    }
  }
  return g;
}

function buildMold(kind) {
  const g = new THREE.Group();
  const samples = kind === 'guitar' ? GUITAR : VIOLIN;
  const shape = plateShape(samples, 0.002);
  addMesh(g, extrude(`${kind}-mold`, shape, 0.018), maple(), 0, 0, -0.009);
  const blocks = kind === 'guitar'
    ? [[0, -0.2], [0, 0.18], [-0.12, -0.04], [0.12, -0.04], [-0.1, 0.08], [0.1, 0.08]]
    : [[0, -0.15], [0, 0.15], [-0.07, -0.03], [0.07, -0.03], [-0.055, 0.048], [0.055, 0.048]];
  for (const [bx, by] of blocks) {
    addBox(g, kind === 'guitar' ? 0.04 : 0.028, kind === 'guitar' ? 0.036 : 0.026, 0.04, walnutDeep(), bx, by, 0.016);
  }
  return g;
}

function pinch(parent, x, y, z) {
  const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.0035, 0.0035, 0.05, 6), steel());
  rod.rotation.x = Math.PI / 2;
  rod.position.set(x, y, z);
  rod.castShadow = true;
  parent.add(rod);
  for (const dz of [-0.02, 0.02]) {
    const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.007, 10), walnut());
    disc.rotation.x = Math.PI / 2;
    disc.position.set(x, y, z + dz);
    disc.castShadow = true;
    parent.add(disc);
  }
}

function cradle(g, x, z, topY, length, width, matWood, matFelt) {
  const grp = new THREE.Group();
  addBox(grp, width + 0.08, 0.035, length + 0.06, matWood, 0, 0.018, 0);
  const ribCount = 7;
  for (let i = 0; i < ribCount; i++) {
    const tz = -length / 2 + (length * i) / (ribCount - 1);
    const arc = new THREE.Mesh(new THREE.TorusGeometry(width * 0.46, 0.02, 6, 14, Math.PI), matFelt);
    arc.rotation.z = Math.PI;
    arc.rotation.y = Math.PI / 2;
    arc.position.set(0, width * 0.42, tz);
    arc.castShadow = true;
    grp.add(arc);
  }
  for (const side of [-1, 1]) {
    addBox(grp, 0.025, 0.07, length, matWood, side * (width * 0.52), 0.055, 0);
  }
  grp.position.set(x, topY, z);
  g.add(grp);
  return grp;
}

function spool(g, x, y, z, gap = 0.05) {
  addCyl(g, 0.004, 0.004, gap + 0.02, steel(), x, y + gap / 2, z, 6);
  addCyl(g, 0.018, 0.018, 0.008, walnut(), x, y, z, 10);
  addCyl(g, 0.018, 0.018, 0.008, walnut(), x, y + gap, z, 10);
  addBox(g, 0.02, 0.006, 0.006, brass(), x, y + gap + 0.01, z);
}

function shaving(g, x, y, z, rx, ry, rz, scale = 1) {
  const curl = new THREE.Mesh(
    new THREE.TorusGeometry(0.022 * scale, 0.0032 * scale, 4, 10, Math.PI * 1.35),
    shavingMat(),
  );
  curl.position.set(x, y, z);
  curl.rotation.set(rx, ry, rz);
  curl.castShadow = false;
  curl.userData.noShadow = true;
  curl.receiveShadow = true;
  g.add(curl);
}

function contact(g, x, z, rx, rz) {
  const m = new THREE.Mesh(
    new THREE.CircleGeometry(1, 18),
    toon('#3a2a1c', { transparent: true, opacity: 0.22, depthWrite: false, polygonOffset: true }),
  );
  m.rotation.x = -Math.PI / 2;
  m.scale.set(rx, rz, 1);
  m.position.set(x, 0.021, z);
  noCast(m);
  g.add(m);
}

function makeShell(layout) {
  const g = new THREE.Group();
  g.name = 'shell';
  const { width: W, depth: D, height: H } = layout.meta.room;
  const s = layout.shell;
  const floorMat = toon('#d4c0a2');
  const seamMat = toon('#cbb89a');
  const wallMat = toon(s.wallColor);
  const wood = toon(s.woodColor);
  const woodDeep = walnutDeep();

  const floor = addBox(g, W, 0.08, D, floorMat, 0, -0.04, 0);
  noCast(floor, true);
  const plankStep = 0.32;
  const plankN = Math.ceil((D - 0.08) / plankStep);
  const plankGeo = new THREE.PlaneGeometry(W - 0.16, plankStep - 0.01);
  const seamGeo = new THREE.PlaneGeometry(W - 0.16, 0.008);
  for (let i = 0; i < plankN; i++) {
    const z = -D / 2 + plankStep * 0.5 + i * plankStep;
    const plank = new THREE.Mesh(plankGeo, floorMat);
    plank.rotation.x = -Math.PI / 2;
    plank.position.set(0, 0.006, z);
    noCast(plank, true);
    g.add(plank);
    const seam = new THREE.Mesh(seamGeo, seamMat);
    seam.rotation.x = -Math.PI / 2;
    seam.position.set(0, 0.007, z + plankStep / 2);
    noCast(seam, true);
    g.add(seam);
  }

  const back = addBox(g, W, H, 0.14, wallMat, 0, H / 2, -D / 2);
  back.castShadow = false;
  back.userData.noShadow = true;
  back.userData.receiveShadow = true;

  const innerL = -W / 2;
  const winZ0 = -2.95;
  const winZ1 = -1.65;
  const winY0 = 1.42;
  const winY1 = 2.62;
  const wallT = 0.14;
  const leftX = innerL;
  addBox(g, wallT, H, (D / 2 + winZ0), wallMat, leftX, H / 2, (-D / 2 + winZ0) / 2);
  addBox(g, wallT, H, (D / 2 - winZ1), wallMat, leftX, H / 2, (winZ1 + D / 2) / 2);
  addBox(g, wallT, winY0, winZ1 - winZ0, wallMat, leftX, winY0 / 2, (winZ0 + winZ1) / 2);
  addBox(g, wallT, H - winY1, winZ1 - winZ0, wallMat, leftX, (H + winY1) / 2, (winZ0 + winZ1) / 2);
  g.children.slice(-4).forEach((mesh) => { mesh.castShadow = false; mesh.userData.noShadow = true; mesh.userData.receiveShadow = true; });

  const winW = winZ1 - winZ0;
  const winH = winY1 - winY0;
  const winC = (winZ0 + winZ1) / 2;
  const winMidY = (winY0 + winY1) / 2;
  const frameX = -5.47;
  const frame = toon('#a07a56');
  const glass = addBox(g, 0.02, winH - 0.1, winW - 0.1, toon('#c5cfc8', {
    transparent: true, opacity: 0.78, emissive: '#d5ddd8', emissiveIntensity: 0.06, side: THREE.DoubleSide, depthWrite: false,
  }), frameX - 0.03, winMidY, winC);
  noCast(glass);
  noCast(addBox(g, 0.04, winH, 0.05, frame, frameX, winMidY, winZ0 + 0.03));
  noCast(addBox(g, 0.04, winH, 0.05, frame, frameX, winMidY, winZ1 - 0.03));
  noCast(addBox(g, 0.04, 0.05, winW, frame, frameX, winY0 + 0.03, winC));
  noCast(addBox(g, 0.04, 0.05, winW, frame, frameX, winY1 - 0.03, winC));
  noCast(addBox(g, 0.028, winH - 0.1, 0.032, frame, frameX + 0.012, winMidY, winC));
  noCast(addBox(g, 0.028, 0.032, winW - 0.1, frame, frameX + 0.012, winMidY, winC));

  const innerB = -D / 2 + 0.08;
  const innerLeft = -W / 2 + 0.08;
  addBox(g, W - 0.4, 0.92, 0.06, wood, -0.2, 0.5, innerB);
  addBox(g, 0.06, 0.92, D - 0.5, wood, innerLeft, 0.5, -0.3);
  addBox(g, W - 0.5, 0.08, 0.05, woodDeep, -0.2, 0.98, innerB + 0.02);
  addBox(g, 0.05, 0.08, D - 0.6, woodDeep, innerLeft + 0.02, 0.98, -0.3);

  const ceil = addBox(g, W * 0.72, 0.08, D * 0.42, toon(s.ceilingColor), -1.1, H - 0.06, -D * 0.22);
  noCast(ceil);
  for (const z of [-3.15, -1.35]) {
    const beam = addBox(g, W * 0.7, 0.1, 0.12, woodDeep, -0.8, H - 0.16, z);
    beam.castShadow = false;
    beam.userData.noShadow = true;
  }

  const runner = addBox(g, 1.15, 0.012, 3.3, toon('#8d6a4c'), -0.15, 0.016, -0.55);
  noCast(runner, true);
  const rug = addBox(g, 2.9, 0.014, 1.7, felt(), 2.7, 0.018, 2.35);
  noCast(rug, true);
  return g;
}

function toolBoard(g, x, z) {
  addBox(g, 0.72, 0.9, 0.04, walnut(), x, 1.72, z);
  addBox(g, 0.66, 0.8, 0.015, toon('#8a6244'), x, 1.72, z + 0.02);
  for (let i = 0; i < 5; i++) {
    addBox(g, 0.018, 0.22, 0.012, steel(), x - 0.24 + i * 0.06, 1.95, z + 0.04);
    addBox(g, 0.04, 0.045, 0.02, walnut(), x - 0.24 + i * 0.06, 1.82, z + 0.045);
  }
  addBox(g, 0.07, 0.035, 0.03, walnut(), x + 0.16, 1.55, z + 0.04);
  addBox(g, 0.04, 0.012, 0.02, steel(), x + 0.16, 1.57, z + 0.05);
  addBox(g, 0.05, 0.03, 0.025, walnut(), x + 0.26, 1.52, z + 0.04);
  const cal = addBox(g, 0.012, 0.16, 0.01, brass(), x - 0.22, 1.48, z + 0.04);
  cal.rotation.z = 0.5;
  const cal2 = addBox(g, 0.012, 0.16, 0.01, brass(), x - 0.1, 1.48, z + 0.04);
  cal2.rotation.z = -0.5;
  addBox(g, 0.08, 0.012, 0.004, steel(), x + 0.18, 1.88, z + 0.04);
  addBox(g, 0.006, 0.28, 0.006, steel(), x + 0.05, 1.5, z + 0.05);
  addCyl(g, 0.01, 0.012, 0.04, walnut(), x + 0.05, 1.32, z + 0.05, 8);
}

function formsRack(g, anchor) {
  const { x, z } = anchor;
  addBox(g, 0.9, 0.05, 0.42, walnut(), x, 0.78, z);
  addBox(g, 0.06, 0.78, 0.06, walnutDeep(), x - 0.38, 0.39, z - 0.16);
  addBox(g, 0.06, 0.78, 0.06, walnutDeep(), x + 0.38, 0.39, z - 0.16);
  addBox(g, 0.06, 0.78, 0.06, walnutDeep(), x - 0.38, 0.39, z + 0.16);
  addBox(g, 0.06, 0.78, 0.06, walnutDeep(), x + 0.38, 0.39, z + 0.16);
  for (let i = 0; i < 3; i++) {
    const mold = buildMold('violin');
    mold.position.set(x - 0.26 + i * 0.26, 1.02, z);
    mold.rotation.y = 0.06 * (i - 1);
    g.add(mold);
  }
  const guitarMold = buildMold('guitar');
  guitarMold.scale.setScalar(0.78);
  guitarMold.position.set(x + 0.05, 0.42, z + 0.55);
  guitarMold.rotation.x = -0.55;
  guitarMold.rotation.y = 0.25;
  g.add(guitarMold);
}

function varnishNook(g, a) {
  const { x, z, w, d, h } = a;
  addBox(g, w, h, d, walnut(), x, h / 2, z);
  addBox(g, w * 0.86, 0.04, d * 0.9, toon('#8d6848'), x + 0.01, h + 0.02, z);
  addBox(g, 0.04, 0.28, d * 0.92, walnutDeep(), x - w / 2 + 0.02, h + 0.16, z);
  const swatch = addMesh(g, new THREE.PlaneGeometry(0.7, 0.28), labelMat('GROUND   AMBER\nBROWN    RED', '#f3e6c8', '#4a3018', 512, 200), x - w / 2 - 0.01, h + 0.22, z - 0.55);
  swatch.rotation.y = Math.PI / 2;
  noCast(swatch);
  const colors = ['#e6c48a', '#d4923a', '#8a4e28', '#7a2430'];
  colors.forEach((c, i) => {
    addBox(g, 0.02, 0.08, 0.1, toon(c), x - w / 2 + 0.02, 1.22, z - 0.85 + i * 0.16);
  });

  addCyl(g, 0.07, 0.07, 0.1, copper(), x + 0.02, h + 0.07, z + 0.85, 14);
  addCyl(g, 0.045, 0.04, 0.08, toon('#c98448'), x + 0.02, h + 0.12, z + 0.85, 12);
  addCyl(g, 0.006, 0.006, 0.16, walnut(), x + 0.08, h + 0.16, z + 0.78, 6).rotation.z = 0.8;
  addCyl(g, 0.028, 0.034, 0.32, steel(), x - 0.06, h + 0.2, z + 0.35, 12);
  addCyl(g, 0.012, 0.016, 0.12, walnut(), x - 0.06, h + 0.38, z + 0.35, 8);
  const strip = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.004, 4, 12, Math.PI * 1.2), maple());
  strip.position.set(x - 0.02, h + 0.22, z + 0.35);
  strip.rotation.y = Math.PI / 2;
  g.add(strip);

  const rackX = -4.42;
  const rackZ = 1.85;
  addBox(g, 0.04, 1.35, 0.04, walnutDeep(), rackX, 0.68, rackZ - 0.28);
  addBox(g, 0.04, 1.35, 0.04, walnutDeep(), rackX, 0.68, rackZ + 0.28);
  addBox(g, 0.05, 0.04, 0.7, walnut(), rackX, 1.72, rackZ);
  for (const [dz, tint] of [[-0.16, false], [0.18, true]]) {
    const v = buildInstrument('violin', { varnished: tint, showStrings: true });
    v.position.set(rackX + 0.05, 1.28, rackZ + dz);
    v.rotation.y = Math.PI / 2;
    g.add(v);
  }
}

function handoff(g, a) {
  const { x, z, w, d, h } = a;
  addBox(g, w, h - 0.06, d, walnut(), x, (h - 0.06) / 2, z);
  addBox(g, w + 0.06, 0.05, d + 0.06, toon('#8a6246'), x, h - 0.02, z);
  addBox(g, w * 0.72, 0.012, d * 0.55, felt(), x - 0.15, h + 0.01, z);
  const finishedRig = new THREE.Group();
  const finished = buildInstrument('violin', { varnished: true, showStrings: true });
  finished.rotation.x = -Math.PI / 2;
  finishedRig.add(finished);
  finishedRig.rotation.y = 0.5;
  finishedRig.position.set(x - 0.15, h + 0.05, z);
  g.add(finishedRig);
  addBox(g, 0.18, 0.08, 0.46, toon('#4a3428'), x + 0.55, h + 0.05, z + 0.02);
  addCyl(g, 0.012, 0.012, 0.16, walnutDeep(), x + 0.55, h + 0.14, z - 0.12, 8);
  const sign = addMesh(
    g,
    new THREE.PlaneGeometry(0.72, 0.16),
    labelMat('STRING REPAIR', '#f6efe2', '#4a3018', 512, 128),
    x - 0.78,
    h + 0.22,
    z + d / 2 - 0.01,
  );
  noCast(sign);
  const ticket = addMesh(
    g,
    new THREE.PlaneGeometry(0.42, 0.28),
    labelMat('142 VIOLIN\n088 GUITAR', '#f7f1e2', '#3a2818', 512, 320),
    x + 0.72,
    h + 0.2,
    z - 0.02,
  );
  ticket.rotation.x = -0.6;
  noCast(ticket);
  addBox(g, 0.22, 0.008, 0.16, paper(), x + 0.15, h + 0.02, z - 0.12);
}

function benchAssembly(g, a) {
  const { x, z, w, d, h } = a;
  addBox(g, w, 0.06, d, toon('#a67c52'), x, h - 0.03, z);
  addBox(g, w - 0.08, 0.08, 0.06, walnutDeep(), x, h - 0.1, z + d / 2 - 0.04);
  for (const side of [-1, 1]) {
    addBox(g, 0.08, h - 0.08, d - 0.08, walnut(), x + side * (w / 2 - 0.08), (h - 0.08) / 2, z);
  }
  addBox(g, w - 0.3, h - 0.16, 0.06, walnutDeep(), x, (h - 0.16) / 2, z - d / 2 + 0.05);
  for (let i = 0; i < 4; i++) {
    const dx = -w / 2 + 0.55 + i * 0.85;
    addBox(g, 0.7, 0.22, 0.04, toon('#7a5438'), x + dx, 0.28 + (i % 2) * 0.26, z + d / 2 - 0.02);
    addCyl(g, 0.012, 0.012, 0.02, brass(), x + dx, 0.28 + (i % 2) * 0.26, z + d / 2 + 0.01, 8);
  }
  for (let i = 0; i < 4; i++) {
    const dx = -1.7 + i * 1.05;
    addBox(g, 0.08, h - 0.12, 0.08, walnutDeep(), x + dx, (h - 0.12) / 2, z);
  }

  cradle(g, a.x - 0.7, a.z, h, 0.52, 0.28, walnut(), toon('#ead7b4'));
  cradle(g, a.x + 1.47, a.z, h, 0.66, 0.34, walnut(), toon('#c4a888'));

  const openRig = new THREE.Group();
  const openViolin = buildInstrument('violin', { open: true, showStrings: false });
  openViolin.rotation.x = -Math.PI / 2;
  openRig.add(openViolin);
  openRig.rotation.y = 2.35;
  openRig.position.set(-1.55, h + 0.1, -3.78);
  g.add(openRig);

  const topRig = new THREE.Group();
  const looseTop = buildInstrument('violin', { plate: true, showStrings: false });
  looseTop.rotation.x = -Math.PI / 2;
  topRig.add(looseTop);
  topRig.rotation.y = 0.2;
  topRig.position.set(-2.12, h + 0.06, -3.42);
  g.add(topRig);
  addCyl(g, 0.004, 0.004, 0.055, spruce(), -2.05, h + 0.04, -3.55, 6);

  const guitarRig = new THREE.Group();
  const guitar = buildInstrument('guitar', { varnished: true, showStrings: true });
  guitar.rotation.x = -Math.PI / 2;
  guitarRig.add(guitar);
  guitarRig.rotation.y = -0.55;
  guitarRig.position.set(0.62, h + 0.1, -3.78);
  g.add(guitarRig);
  addBox(guitar, 0.004, 0.16, 0.004, toon('#3a281c'), 0.05, -0.04, 0.052);
  pinch(guitar, 0.04, -0.02, 0.05);
  pinch(guitar, -0.01, -0.09, 0.05);
  pinch(guitar, 0.07, -0.14, 0.05);

  for (let i = 0; i < 9; i++) {
    spool(g, -2.3 + i * 0.18, h + 0.01, -3.5, 0.045);
  }
  const curls = [
    [-1.9, 0.02, -3.62, 0.4, 0.2, 0.6, 1],
    [-1.75, 0.025, -3.95, 1.1, 0.4, 0.2, 0.8],
    [-1.2, 0.02, -4.02, 0.2, 1.2, 0.5, 1.1],
    [-2.15, 0.02, -3.7, 0.8, 0.5, 1.0, 0.7],
    [0.25, 0.02, -3.6, 0.3, 0.8, 0.4, 1],
    [0.95, 0.02, -4.0, 1.2, 0.2, 0.7, 0.9],
    [1.15, 0.02, -3.58, 0.5, 1.1, 0.3, 0.75],
    [-2.35, 0.012, -3.22, 0.6, 0.3, 1.2, 1.2],
    [-2.15, 0.012, -3.12, 1.0, 0.8, 0.2, 0.9],
    [-1.95, 0.012, -3.28, 0.2, 1.4, 0.6, 0.8],
  ];
  for (const [cx, cy, cz, rx, ry, rz, sc] of curls) {
    shaving(g, cx, h + cy, cz, rx, ry, rz, sc);
  }

  addBox(g, 0.16, 0.035, 0.05, walnut(), -0.95, h + 0.02, -4.02);
  addBox(g, 0.05, 0.008, 0.02, steel(), -0.95, h + 0.04, -4.0);
  addBox(g, 0.22, 0.008, 0.05, steel(), -0.7, h + 0.02, -4.05);
  addCyl(g, 0.008, 0.008, 0.22, steel(), 1.35, h + 0.02, -3.58, 6).rotation.z = Math.PI / 2;
}

function clampCart(g, a) {
  const { x, z } = a;
  addBox(g, 0.62, 0.08, 0.42, walnut(), x, 0.62, z);
  for (const [dx, dz] of [[-0.24, -0.16], [0.24, -0.16], [-0.24, 0.16], [0.24, 0.16]]) {
    addBox(g, 0.05, 0.58, 0.05, walnutDeep(), x + dx, 0.29, z + dz);
    addCyl(g, 0.03, 0.03, 0.03, steel(), x + dx, 0.03, z + dz, 8);
  }
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 2; j++) {
      spool(g, x - 0.18 + i * 0.12, 0.68, z - 0.08 + j * 0.14, 0.05);
    }
  }
}

function plateRack(g, a) {
  const { x, z } = a;
  addBox(g, 0.08, 0.9, 0.5, walnutDeep(), x - 0.28, 0.45, z);
  addBox(g, 0.08, 0.9, 0.5, walnutDeep(), x + 0.28, 0.45, z);
  addBox(g, 0.7, 0.06, 0.5, walnut(), x, 0.9, z);
  for (let i = 0; i < 4; i++) {
    const plate = buildMold(i === 3 ? 'guitar' : 'violin');
    plate.scale.setScalar(i === 3 ? 0.62 : 0.78);
    plate.position.set(x, 0.2 + i * 0.16, z + 0.04);
    plate.rotation.x = Math.PI / 2;
    g.add(plate);
  }
  const tag = addMesh(g, new THREE.PlaneGeometry(0.36, 0.12), labelMat('SPRUCE', '#f4e7c8', '#4a3018', 256, 96), x, 1.02, z + 0.26);
  noCast(tag);
}

function neckBlanks(g, layout) {
  const inst = layout.instances.find((item) => item.id === 'neck_cabinet');
  if (!inst) return;
  const [x, , z] = inst.position;
  const levels = [0.51, 0.97, 1.43];
  levels.forEach((y, si) => {
    for (let i = 0; i < 4; i++) {
      const blank = addBox(g, 0.035, 0.42, 0.05, i % 2 ? maple() : ebony(), x - 0.12 + i * 0.08, y + 0.22, z + 0.04);
      blank.rotation.z = 0.04 * (i - 1.5);
      blank.rotation.y = inst.rotationY;
    }
    if (si === 0) {
      addBox(g, 0.28, 0.06, 0.16, toon('#c4a574'), x, y + 0.04, z + 0.05);
    }
  });
}

function foliage(g, layout) {
  const pot = layout.instances.find((item) => item.id === 'pot_window');
  if (!pot) return;
  const [x, , z] = pot.position;
  addCyl(g, 0.02, 0.028, 0.22, toon('#4a5a32'), x, 0.38, z, 6);
  addBox(g, 0.28, 0.16, 0.22, toon('#3f6a40'), x, 0.55, z);
  addBox(g, 0.16, 0.12, 0.16, toon('#2f5534'), x + 0.06, 0.66, z - 0.04);
}

function pendantCords(g, layout) {
  for (const inst of layout.instances) {
    if (inst.kind !== 'pendant_lamp') continue;
    const [x, y, z] = inst.position;
    const h = layout.meta.room.height - 0.12 - (y + 0.5);
    if (h > 0.05) {
      const cord = addCyl(g, 0.006, 0.006, h, toon('#5c5146'), x, y + 0.5 + h / 2, z, 6);
      cord.castShadow = false;
      cord.userData.noShadow = true;
    }
  }
}

function hangRail(g) {
  addBox(g, 3.7, 0.04, 0.04, walnutDeep(), -0.85, 2.58, -4.16);
  const spots = [
    ['violin', -2.45, 2.05, false],
    ['violin', -1.75, 2.05, true],
    ['violin', -1.05, 2.08, false],
    ['guitar', -0.15, 1.72, true],
    ['guitar', 0.85, 1.72, false],
  ];
  for (const [kind, x, y, warmed] of spots) {
    addCyl(g, 0.012, 0.012, 0.04, brass(), x, 2.52, -4.12, 8);
    const inst = buildInstrument(kind, { varnished: warmed, showStrings: true });
    if (kind === 'violin' && x < -1.4) inst.scale.setScalar(x === -1.75 ? 1.08 : 1);
    inst.position.set(x, y, -4.12);
    inst.rotation.z = x % 0.7 > 0.3 ? 0.04 : -0.03;
    g.add(inst);
  }
}

function makeProcedural(layout) {
  const g = new THREE.Group();
  g.name = 'procedural';
  const a = layout.anchors;
  benchAssembly(g, { ...a.bench, violin: a.violinCradle, guitar: a.guitarCradle });
  hangRail(g);
  toolBoard(g, 1.85, -4.16);
  formsRack(g, a.forms);
  varnishNook(g, a.varnish);
  handoff(g, a.handoff);
  clampCart(g, a.clampCart);
  plateRack(g, a.plateRack);
  neckBlanks(g, layout);
  foliage(g, layout);
  pendantCords(g, layout);

  contact(g, -1.45, -2.95, 0.32, 0.28);
  contact(g, 1.42, 1.5, 0.32, 0.28);
  contact(g, 4.35, 2.2, 0.32, 0.28);
  contact(g, a.bench.x, a.bench.z, a.bench.w * 0.48, a.bench.d * 0.48);
  contact(g, a.handoff.x, a.handoff.z, a.handoff.w * 0.48, a.handoff.d * 0.46);
  contact(g, a.cabinet.x, a.cabinet.z, 0.48, 0.28);
  contact(g, a.forms.x, a.forms.z, 0.5, 0.32);
  contact(g, a.clampCart.x, a.clampCart.z, 0.38, 0.28);
  contact(g, a.varnish.x, a.varnish.z, 0.32, a.varnish.d * 0.48);
  contact(g, -5.05, 2.6, 0.22, 0.2);

  const jarNotes = [
    ['jar_spirit', 'SPIRIT'],
    ['jar_oil', 'OIL'],
    ['jar_ground', 'GROUND'],
    ['jar_amber', 'AMBER'],
    ['jar_bench', 'HIDE'],
  ];
  for (const inst of layout.instances) {
    const note = jarNotes.find(([id]) => id === inst.id);
    if (!note) continue;
    const [x, y, z] = inst.position;
    const card = addMesh(g, new THREE.PlaneGeometry(0.07, 0.035), labelMat(note[1], '#f6efe2', '#4a3018', 256, 128), x + 0.02, y + 0.07, z);
    card.rotation.y = inst.id === 'jar_bench' ? 0 : Math.PI / 2;
    noCast(card);
  }
  return g;
}

boot({
  makeShell,
  makeProcedural,
  readyText: 'ready — string repair · drag orbit · U unlit · T toon',
});
