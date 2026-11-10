import * as THREE from 'three';
import { boot, toon, addBox, addCyl, flag } from './scene_lib.js';

/**
 * Small public aquarium hall.
 * Focal zone: one floor-to-soffit planted kelp tank.
 * Second zone: three specimen niches along the left wall.
 * Visitors sit the bench facing the glass; the lectern and niche plaques interpret it.
 * Fish, rock, kelp, glass, and signs are authored geometry. Bench and pots are shared GLBs.
 */

const WALL_T = 0.16;
const swimmers = [];

function roomOf(layout) {
  const { width: W, depth: D, height: H } = layout.meta.room;
  return {
    W,
    D,
    H,
    innerBack: -D / 2 + WALL_T / 2,
    innerLeft: -W / 2 + WALL_T / 2,
  };
}

function plaqueTexture({ title, lines, width = 768, height = 420 }) {
  const c = document.createElement('canvas');
  c.width = width;
  c.height = height;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#f3efe6';
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = '#1c4650';
  ctx.fillRect(0, 0, width, 16);
  ctx.fillRect(0, height - 16, width, 16);
  ctx.fillStyle = '#16343c';
  ctx.font = `700 ${Math.floor(height * 0.13)}px serif`;
  ctx.fillText(title, 40, Math.floor(height * 0.3));
  ctx.font = `${Math.floor(height * 0.072)}px sans-serif`;
  ctx.fillStyle = '#24343c';
  const step = Math.floor(height * 0.12);
  lines.forEach((line, i) => {
    ctx.fillText(line, 40, Math.floor(height * 0.48) + i * step);
  });
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

function habitatTexture() {
  const c = document.createElement('canvas');
  c.width = 384;
  c.height = 768;
  const ctx = c.getContext('2d');
  const bands = [
    ['#9ecfdb', '#16343c', 'SURFACE'],
    ['#2f8a5a', '#f4f1ea', 'CANOPY'],
    ['#1c5844', '#f4f1ea', 'UNDERSTORY'],
    ['#6d583c', '#f4f1ea', 'HOLDFAST'],
  ];
  bands.forEach((b, i) => {
    ctx.fillStyle = b[0];
    ctx.fillRect(0, i * 192, 384, 192);
    ctx.fillStyle = b[1];
    ctx.font = '700 40px sans-serif';
    ctx.fillText(b[2], 28, i * 192 + 110);
  });
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

const FISH = {
  angel: { rx: 0.11, ry: 0.15, tail: 0.16, dorsal: 0.22, anal: 0.2, eye: 0.018 },
  garibaldi: { rx: 0.15, ry: 0.11, tail: 0.07, dorsal: 0.045, anal: 0.04, eye: 0.016 },
  discus: { rx: 0.12, ry: 0.145, tail: 0.045, dorsal: 0.03, anal: 0.03, eye: 0.015 },
  tetra: { rx: 0.09, ry: 0.032, tail: 0.055, dorsal: 0.028, anal: 0.02, eye: 0.009 },
  rockfish: { rx: 0.15, ry: 0.085, tail: 0.055, dorsal: 0.1, anal: 0.04, eye: 0.015 },
  wrasse: { rx: 0.2, ry: 0.05, tail: 0.08, dorsal: 0.04, anal: 0.025, eye: 0.012 },
  needle: { rx: 0.32, ry: 0.014, tail: 0.05, dorsal: 0.012, anal: 0.01, eye: 0.008 },
  ray: { rx: 0.2, ry: 0.16, tail: 0.12, dorsal: 0, anal: 0, eye: 0.012, ray: true },
};

function shapeFrom(pts) {
  const s = new THREE.Shape();
  s.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) s.lineTo(pts[i][0], pts[i][1]);
  s.closePath();
  return s;
}

function ellipsePoints(rx, ry, n = 22) {
  const pts = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    pts.push([Math.cos(a) * rx, Math.sin(a) * ry]);
  }
  return pts;
}

function finMesh(pts, color) {
  const m = new THREE.Mesh(new THREE.ShapeGeometry(shapeFrom(pts)), toon(color, { side: THREE.DoubleSide }));
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

function makeFish(kind, color) {
  const spec = FISH[kind];
  const g = new THREE.Group();
  const finColor = spec.ray ? color : color;
  if (spec.ray) {
    g.add(finMesh([
      [0.28, 0],
      [0.04, 0.15],
      [-0.1, 0.035],
      [-0.26, 0.07],
      [-0.22, 0],
      [-0.26, -0.06],
      [-0.1, -0.03],
      [0.04, -0.15],
    ], color));
  } else {
    const depth = kind === 'tetra' || kind === 'needle' ? 0.02 : 0.04;
    const geo = new THREE.ExtrudeGeometry(shapeFrom(ellipsePoints(spec.rx, spec.ry)), {
      depth,
      bevelEnabled: true,
      bevelThickness: depth * 0.35,
      bevelSize: Math.min(spec.ry, spec.rx) * 0.18,
      bevelSegments: 1,
      curveSegments: 3,
    });
    geo.translate(0, 0, -depth / 2);
    const body = new THREE.Mesh(geo, toon(color));
    body.castShadow = true;
    body.receiveShadow = true;
    g.add(body);
    const tail = spec.tail;
    g.add(finMesh([
      [-spec.rx * 0.72, spec.ry * 0.28],
      [-spec.rx - tail, spec.ry * 0.95],
      [-spec.rx - tail * 0.62, 0],
      [-spec.rx - tail, -spec.ry * 0.9],
      [-spec.rx * 0.72, -spec.ry * 0.28],
    ], finColor));
    if (spec.dorsal > 0.02) {
      g.add(finMesh([
        [spec.rx * 0.2, spec.ry * 0.75],
        [-spec.rx * 0.05, spec.ry + spec.dorsal],
        [-spec.rx * 0.55, spec.ry * 0.45],
      ], finColor));
    }
    if (spec.anal > 0.02) {
      g.add(finMesh([
        [spec.rx * 0.05, -spec.ry * 0.7],
        [-spec.rx * 0.15, -spec.ry - spec.anal],
        [-spec.rx * 0.5, -spec.ry * 0.35],
      ], finColor));
    }
    const eye = new THREE.Mesh(new THREE.SphereGeometry(spec.eye, 8, 6), toon('#f6f3ec'));
    eye.position.set(spec.rx * 0.42, spec.ry * 0.18, depth * 0.55);
    const pupil = new THREE.Mesh(new THREE.SphereGeometry(spec.eye * 0.48, 6, 5), toon('#14181c'));
    pupil.position.z = spec.eye * 0.7;
    eye.add(pupil);
    g.add(eye);
  }
  if (spec.ray) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(spec.eye, 8, 6), toon('#f6f3ec'));
    eye.position.set(0.08, 0.03, 0.01);
    g.add(eye);
  }
  g.userData.kind = kind;
  return g;
}

function addSwimmer(parent, kind, color, x, y, z, rotY, scale, phase, amp) {
  const m = makeFish(kind, color);
  m.position.set(x, y, z);
  m.rotation.y = rotY;
  m.scale.setScalar(scale);
  m.userData.base = {
    x, y, z, rotY, phase, scale,
    amp: amp ?? 0.055,
    yAmp: kind === 'ray' ? 0.008 : 0.02,
  };
  swimmers.push(m);
  parent.add(m);
  return m;
}

function facet(geo) {
  const g = geo.index ? geo.toNonIndexed() : geo;
  g.computeVertexNormals();
  return g;
}

function rock(parent, x, y, z, sx, sy, sz, color, rot, slab) {
  const geo = slab
    ? new THREE.BoxGeometry(1, 1, 1)
    : facet(new THREE.DodecahedronGeometry(0.62, 0));
  const m = new THREE.Mesh(geo, toon(color));
  m.scale.set(sx, sy, sz);
  m.position.set(x, y, z);
  if (rot) m.rotation.set(rot[0], rot[1], rot[2]);
  m.castShadow = true;
  m.receiveShadow = true;
  parent.add(m);
  return m;
}

function bladeGeometry(h, w) {
  const s = new THREE.Shape();
  s.moveTo(0, 0);
  s.bezierCurveTo(w * 0.65, h * 0.18, w * 0.45, h * 0.58, w * 0.04, h);
  s.bezierCurveTo(-w * 0.5, h * 0.7, -w * 0.55, h * 0.22, 0, 0);
  return new THREE.ShapeGeometry(s, 8);
}

function kelp(parent, x, y0, z, h, lean, twist, color) {
  const g = new THREE.Group();
  g.position.set(x, y0, z);
  const blades = 4;
  for (let i = 0; i < blades; i++) {
    const bh = h * (0.72 + (i % 3) * 0.12);
    const bw = 0.11 + (i % 2) * 0.04;
    const blade = new THREE.Mesh(bladeGeometry(bh, bw), toon(color, { side: THREE.DoubleSide }));
    blade.position.y = 0.02;
    blade.rotation.y = twist + i * 0.7;
    blade.rotation.z = lean + (i - 1.5) * 0.12;
    blade.rotation.x = (i % 2 === 0 ? 0.15 : -0.1);
    blade.castShadow = true;
    blade.receiveShadow = true;
    g.add(blade);
  }
  const hold = new THREE.Mesh(new THREE.SphereGeometry(0.055, 6, 5), toon('#3a4a32'));
  hold.scale.set(1.5, 0.55, 1.1);
  hold.position.y = 0.02;
  g.add(hold);
  parent.add(g);
}

function broadPlant(parent, x, y, z, color) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  for (let i = 0; i < 5; i++) {
    const leaf = new THREE.Mesh(bladeGeometry(0.28 + (i % 3) * 0.06, 0.1), toon(color, { side: THREE.DoubleSide }));
    leaf.rotation.y = i * 1.2;
    leaf.rotation.z = -0.7 - (i % 3) * 0.15;
    leaf.rotation.x = 0.4;
    leaf.castShadow = true;
    g.add(leaf);
  }
  parent.add(g);
}

function driftwood(parent, x, y, z) {
  const mat = toon('#5c4030');
  const a = addCyl(parent, 0.04, 0.055, 0.95, mat, x, y + 0.15, z, 6);
  a.rotation.z = 0.85;
  a.rotation.y = 0.35;
  const b = addCyl(parent, 0.028, 0.04, 0.55, mat, x + 0.42, y + 0.28, z + 0.06, 6);
  b.rotation.z = 0.2;
  b.rotation.y = -0.4;
  const c = addCyl(parent, 0.02, 0.03, 0.32, mat, x - 0.15, y + 0.08, z - 0.04, 5);
  c.rotation.z = 1.2;
}

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function signPlane(parent, w, h, texture, x, y, z, rotY, rotX) {
  const frame = addBox(parent, w + 0.06, h + 0.06, 0.03, toon('#8d7344'), x, y, z);
  frame.rotation.y = rotY;
  frame.rotation.x = rotX || 0;
  const face = new THREE.Mesh(new THREE.PlaneGeometry(w, h), toon('#ffffff', { map: texture }));
  face.position.set(0, 0, 0.02);
  face.castShadow = false;
  face.receiveShadow = false;
  face.userData.noShadow = true;
  frame.add(face);
  return frame;
}

function makeShell(layout) {
  const g = new THREE.Group();
  g.name = 'shell';
  const { W, D, H, innerBack, innerLeft } = roomOf(layout);
  const s = layout.shell || {};
  const floorMat = toon(s.floorColor || '#2c353b');
  const wallMat = toon(s.wallColor || '#24313a');
  const ceilMat = toon(s.ceilingColor || '#141b20');
  const trim = toon(s.trimColor || '#8e9894');
  const skirt = toon('#1a2328');

  const floor = new THREE.Mesh(new THREE.BoxGeometry(W, 0.08, D), floorMat);
  floor.position.y = -0.04;
  floor.receiveShadow = true;
  g.add(floor);

  const back = new THREE.Mesh(new THREE.BoxGeometry(W, H, WALL_T), wallMat);
  back.position.set(0, H / 2, -D / 2);
  back.receiveShadow = true;
  g.add(back);
  const left = new THREE.Mesh(new THREE.BoxGeometry(WALL_T, H, D), wallMat);
  left.position.set(-W / 2, H / 2, 0);
  left.receiveShadow = true;
  g.add(left);

  addBox(g, W - 0.2, 0.12, 0.05, skirt, 0, 0.06, innerBack - 0.01);
  addBox(g, 0.05, 0.12, D - 0.3, skirt, innerLeft - 0.01, 0.06, 0.1);
  addBox(g, W - 1.2, 0.035, 0.045, trim, 0.2, 0.9, innerBack - 0.02);

  const ceil = new THREE.Mesh(new THREE.BoxGeometry(W * 0.94, 0.1, D * 0.62), ceilMat);
  ceil.position.set(-0.15, H - 0.06, -D * 0.16);
  g.add(ceil);

  const soffit = addBox(g, 7.3, 0.42, 1.7, toon('#10161a'), 0, 3.52, innerBack + 0.95);
  soffit.name = 'soffit';
  const spotMat = toon('#c9d5d4');
  const lens = toon('#d7fffb', { emissive: '#c8fff6', emissiveIntensity: 0.85 });
  for (const x of [-2.3, -1.15, 0.05, 1.25, 2.4]) {
    addCyl(g, 0.07, 0.09, 0.16, spotMat, x, 3.22, innerBack + 0.72, 10);
    const cap = addCyl(g, 0.045, 0.045, 0.02, lens, x, 3.13, innerBack + 0.72, 10);
    flag(cap, { noShadow: true });
  }
  return g;
}

function buildTank(g, layout) {
  const { innerBack } = roomOf(layout);
  const tank = new THREE.Group();
  tank.name = 'kelp-tank';
  tank.position.set(0, 0, innerBack + 0.02);
  g.add(tank);

  const stone = toon('#3c4746');
  const stoneDark = toon('#232b2c');
  const metal = toon('#8e9894');
  const plinthW = 6.55;
  const plinthD = 1.16;
  const plinthH = 0.46;

  addBox(tank, plinthW + 0.08, 0.07, plinthD + 0.08, toon('#161c1e'), 0, 0.035, plinthD / 2);
  addBox(tank, plinthW, plinthH - 0.07, plinthD, stone, 0, 0.07 + (plinthH - 0.07) / 2, plinthD / 2);
  addBox(tank, plinthW - 0.18, 0.045, 0.045, stoneDark, 0, 0.2, plinthD - 0.01);

  const glassW = 5.95;
  const glassH = 2.46;
  const glassD = 0.82;
  const glassBottom = plinthH;
  const glassZ = 0.1;
  const glassCenterZ = glassZ + glassD / 2;
  const glassCenterY = glassBottom + glassH / 2;
  const glassMat = toon('#c5ebe6', {
    transparent: true,
    opacity: 0.16,
    side: THREE.DoubleSide,
    depthWrite: false,
  });

  const front = addBox(tank, glassW, glassH, 0.018, glassMat, 0, glassCenterY, glassZ + glassD);
  const sideL = addBox(tank, 0.018, glassH, glassD, glassMat, -glassW / 2, glassCenterY, glassCenterZ);
  const sideR = addBox(tank, 0.018, glassH, glassD, glassMat, glassW / 2, glassCenterY, glassCenterZ);
  for (const pane of [front, sideL, sideR]) flag(pane, { noShadow: true, noReceive: true, order: 3 });

  addBox(tank, glassW + 0.08, 0.05, 0.05, metal, 0, glassBottom + 0.02, glassZ + glassD + 0.01);
  addBox(tank, glassW + 0.08, 0.05, 0.05, metal, 0, glassBottom + glassH - 0.02, glassZ + glassD + 0.01);
  addBox(tank, 0.05, glassH, 0.05, metal, -glassW / 2, glassCenterY, glassZ + glassD + 0.01);
  addBox(tank, 0.05, glassH, 0.05, metal, glassW / 2, glassCenterY, glassZ + glassD + 0.01);
  addBox(tank, 0.045, glassH - 0.08, 0.04, metal, -1.85, glassCenterY, glassZ + glassD + 0.02);
  addBox(tank, 0.045, glassH - 0.08, 0.04, metal, 1.9, glassCenterY, glassZ + glassD + 0.02);
  addBox(tank, glassW - 0.1, 0.04, 0.04, metal, 0, 2.52, glassZ + glassD + 0.02);

  const backPanel = addBox(
    tank, glassW - 0.28, glassH - 0.28, 0.04,
    toon('#124e58', { emissive: '#1c8a96', emissiveIntensity: 0.42 }),
    0, glassCenterY + 0.04, 0.06,
  );
  backPanel.name = 'tank-back';

  addBox(tank, glassW - 0.35, 0.09, glassD - 0.16, toon('#c6b48a'), 0, glassBottom + 0.045, glassCenterZ);
  const sandTop = glassBottom + 0.09;

  addBox(tank, glassW + 0.28, 0.2, glassD + 0.16, toon('#161c1e'), 0, glassBottom + glassH + 0.08, glassCenterZ - 0.02);
  addBox(tank, glassW + 0.16, 0.035, 0.04, metal, 0, glassBottom + glassH + 0.2, glassZ + glassD + 0.02);
  for (let i = 0; i < 8; i++) {
    addBox(tank, 0.28, 0.012, 0.02, toon('#0e1416'), -2.2 + i * 0.64, glassBottom + glassH + 0.19, glassCenterZ);
  }

  const foam = addBox(tank, glassW - 0.45, 0.03, 0.025, toon('#e7f6f4', { emissive: '#d5fffb', emissiveIntensity: 0.2 }), 0, 2.58, glassZ + glassD - 0.04);
  flag(foam, { noShadow: true, order: 2 });

  rock(tank, -1.9, sandTop + 0.22, 0.28, 0.95, 0.62, 0.58, '#3a4346', [0.2, 0.4, 0.1]);
  rock(tank, -1.45, sandTop + 0.48, 0.36, 0.42, 0.34, 0.36, '#52584e', [0.4, 0.2, 0.3]);
  rock(tank, -2.3, sandTop + 0.12, 0.48, 0.46, 0.28, 0.34, '#2a3134', [0.1, 0.8, 0.2]);
  rock(tank, 0.28, sandTop + 0.28, 0.22, 0.58, 0.7, 0.46, '#454e4c', [0.3, 0.1, 0.05]);
  rock(tank, 1.15, sandTop + 0.24, 0.3, 0.5, 0.58, 0.42, '#3e463f', [0.2, 1.1, 0.15]);
  rock(tank, 0.72, sandTop + 0.58, 0.26, 1.15, 0.22, 0.48, '#5c584c', [0.05, 0.3, 0.08], true);
  rock(tank, 2.15, sandTop + 0.2, 0.24, 0.7, 0.48, 0.5, '#2c3336', [0.4, 0.6, 0.2]);
  rock(tank, 2.45, sandTop + 0.1, 0.5, 0.36, 0.24, 0.3, '#6a6258', [0.2, 0.2, 0.4]);
  rock(tank, -0.35, sandTop + 0.05, 0.62, 0.38, 0.14, 0.28, '#4a453c', [0, 0.5, 0.04], true);
  rock(tank, 0.15, sandTop + 0.1, 0.18, 0.4, 0.26, 0.32, '#1e2628', [0.5, 0.7, 0.1]);

  const rand = mulberry32(20261110);
  const pebbleColors = ['#b7a888', '#8d8474', '#d2c4a4', '#6e6a60'];
  for (let i = 0; i < 16; i++) {
    const px = -2.4 + rand() * 4.8;
    const pz = 0.22 + rand() * 0.55;
    const s = 0.05 + rand() * 0.06;
    rock(tank, px, sandTop + 0.01, pz, s * 1.6, s * 0.7, s * 1.2, pebbleColors[i % pebbleColors.length], [rand(), rand(), rand()], true);
  }

  const kelpSpecs = [
    [-2.35, 0.18, 1.95, -0.16, 0.4, '#1e6840'],
    [-2.0, 0.28, 2.15, 0.1, -0.3, '#2c7a48'],
    [-1.62, 0.16, 1.75, -0.05, 0.8, '#174e32'],
    [-1.25, 0.34, 2.05, 0.18, 0.2, '#347848'],
    [-2.2, 0.5, 1.5, 0.06, -0.5, '#245c38'],
    [1.7, 0.2, 1.55, -0.12, 0.6, '#1f6a44'],
    [2.05, 0.32, 1.8, 0.14, 1.1, '#3d8a45'],
    [2.4, 0.22, 1.35, -0.08, 0.3, '#163f2e'],
    [1.45, 0.4, 1.2, 0.2, -0.4, '#2a6a40'],
  ];
  for (const [x, z, h, lean, twist, color] of kelpSpecs) {
    kelp(tank, x, sandTop, z, h, lean, twist, color);
  }
  broadPlant(tank, 0.05, sandTop, 0.3, '#4e7a38');
  broadPlant(tank, -0.75, sandTop, 0.42, '#3d6a32');
  driftwood(tank, -0.15, sandTop, 0.36);

  for (let i = 0; i < 9; i++) {
    const gx = -0.2 + (rand() - 0.4) * 0.9;
    const gz = 0.48 + rand() * 0.2;
    const blade = new THREE.Mesh(
      bladeGeometry(0.18 + rand() * 0.16, 0.035),
      toon('#2f6a3c', { side: THREE.DoubleSide }),
    );
    blade.position.set(gx, sandTop, gz);
    blade.rotation.y = rand() * 2;
    blade.rotation.z = (rand() - 0.5) * 0.4;
    blade.castShadow = true;
    tank.add(blade);
  }

  const life = [
    ['angel', '#5d7c8c', -1.55, 1.62, 0.55, -0.35, 1.35, 0.4],
    ['angel', '#6e8a58', -1.05, 1.08, 0.66, 0.3, 0.85, 1.7],
    ['garibaldi', '#ef6a28', -0.15, 1.32, 0.64, 0.15, 1.35, 0.2],
    ['garibaldi', '#f2b15a', -1.95, 1.15, 0.58, -0.5, 0.7, 2.4],
    ['discus', '#9a463c', 1.05, 1.42, 0.52, 0.4, 1.05, 1.1],
    ['rockfish', '#3e4c56', 0.72, 0.82, 0.34, -0.15, 1.05, 2.2],
    ['wrasse', '#e2c15a', 0.35, 1.68, 0.58, 2.7, 1.05, 0.8],
    ['needle', '#d5e4e6', -0.55, 2.32, 0.5, 0.1, 1.05, 1.5],
    ['ray', '#7f9aa6', -1.25, 0.62, 0.4, 0.25, 1.15, 0.6],
    ['tetra', '#f7fbfb', 2.05, 1.28, 0.62, 0.25, 0.85, 0.3],
    ['tetra', '#c5d6d8', 2.32, 1.08, 0.5, -0.1, 0.7, 1.4],
    ['tetra', '#f4f7f7', 1.72, 1.46, 0.66, 0.45, 0.75, 2.1],
    ['tetra', '#9ec4c8', 2.15, 1.55, 0.54, 0.05, 0.62, 0.9],
    ['tetra', '#e7eeef', 1.88, 1.02, 0.7, 0.3, 0.72, 1.8],
    ['tetra', '#f7fbfb', 2.48, 1.22, 0.46, -0.3, 0.66, 2.6],
  ];
  for (const [kind, color, x, y, z, rot, scale, phase] of life) {
    const fish = addSwimmer(tank, kind, color, x, y, z, rot, scale, phase);
    if (kind === 'ray') fish.rotation.x = -0.72;
  }

  const pipe = toon('#4e5856');
  const run = addCyl(tank, 0.032, 0.032, 6.3, pipe, 0.1, 3.18, 0.04, 8);
  run.rotation.z = Math.PI / 2;
  addCyl(tank, 0.028, 0.028, 1.9, pipe, 2.85, 1.85, 0.72, 8);
  const valveMat = toon('#c2b48a');
  const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.012, 6, 16), valveMat);
  wheel.position.set(2.7, 0.72, plinthD + 0.02);
  wheel.castShadow = true;
  tank.add(wheel);
  const spokeA = addCyl(tank, 0.01, 0.01, 0.16, valveMat, 2.7, 0.72, plinthD + 0.02, 6);
  spokeA.rotation.z = Math.PI / 2;
  const spokeB = addCyl(tank, 0.01, 0.01, 0.16, valveMat, 2.7, 0.72, plinthD + 0.02, 6);
  spokeB.rotation.x = Math.PI / 2;
  addCyl(tank, 0.02, 0.02, 0.04, toon('#6a5538'), 2.7, 0.72, plinthD + 0.04, 8);

  const title = plaqueTexture({
    title: 'PACIFIC KELP',
    lines: ['Hall tank  ·  cold water'],
    width: 900,
    height: 280,
  });
  signPlane(tank, 1.35, 0.28, title, 0, 0.24, plinthD + 0.03, 0, 0);

  const drain = toon('#1a2124');
  addBox(g, 0.72, 0.012, 0.18, drain, 0.1, 0.008, innerBack + 0.02 + plinthD + 0.22);
  for (let i = 0; i < 5; i++) {
    addBox(g, 0.5, 0.008, 0.012, toon('#8a928e'), 0.1, 0.016, innerBack + 0.02 + plinthD + 0.16 + i * 0.03);
  }
}

function furnishNiche(g, box, kind) {
  const sand = box.floorY;
  if (kind === 'garibaldi') {
    rock(g, box.x - 0.05, sand + 0.1, box.z - 0.08, 0.28, 0.2, 0.22, '#4a453c', [0.2, 0.4, 0.1]);
    kelp(g, box.x + 0.12, sand, box.z + 0.05, 0.7, 0.08, 0.4, '#2c7a48');
    kelp(g, box.x - 0.16, sand, box.z + 0.1, 0.55, -0.1, 0.2, '#1e6840');
    const fish = addSwimmer(g, 'garibaldi', '#e36a2a', box.x + 0.02, sand + 0.38, box.z + 0.02, 0.7, 0.7, 0.4, 0.03);
    fish.rotation.y = 0.9;
  } else if (kind === 'senorita') {
    kelp(g, box.x, sand, box.z - 0.05, 1.05, 0.05, 0.3, '#246848');
    kelp(g, box.x + 0.1, sand, box.z + 0.08, 0.85, -0.12, 1.0, '#3d8a45');
    kelp(g, box.x - 0.12, sand, box.z + 0.02, 0.95, 0.1, -0.4, '#174e32');
    addSwimmer(g, 'wrasse', '#d4b15a', box.x, sand + 0.55, box.z + 0.06, 1.15, 0.72, 1.3, 0.035);
  } else {
    rock(g, box.x - 0.15, sand + 0.06, box.z, 0.42, 0.12, 0.28, '#5c584c', [0.05, 0.3, 0], true);
    rock(g, box.x + 0.22, sand + 0.08, box.z - 0.04, 0.32, 0.16, 0.24, '#3a4346', [0.2, 0.8, 0.1]);
    rock(g, box.x + 0.05, sand + 0.16, box.z + 0.06, 0.22, 0.1, 0.18, '#6a6258', [0, 0.2, 0.1], true);
    const fish = addSwimmer(g, 'rockfish', '#1a2126', box.x - 0.02, sand + 0.2, box.z + 0.08, 0.8, 0.78, 2.2, 0.02);
    fish.rotation.y = 0.85;
  }
}

function buildNiches(g, layout) {
  const { innerLeft } = roomOf(layout);
  const x0 = innerLeft;
  const niches = [
    {
      z: -2.35, y: 1.58, w: 1.08, h: 1.28, d: 0.5,
      glow: '#146068',
      kind: 'garibaldi',
      title: 'GARIBALDI',
      lines: ['Hypsypops rubicundus', 'Bright damselfish of the kelp.'],
    },
    {
      z: -0.15, y: 1.66, w: 0.82, h: 1.52, d: 0.46,
      glow: '#0e6854',
      kind: 'senorita',
      title: 'SENORITA',
      lines: ['Oxyjulis californica', 'A slender wrasse of the blades.'],
    },
    {
      z: 1.72, y: 1.12, w: 1.38, h: 0.9, d: 0.52,
      glow: '#0c3e48',
      kind: 'rockfish',
      title: 'ROCKFISH',
      lines: ['Sebastes', 'They rest on the stone, not the sand.'],
    },
  ];

  const jamb = toon('#2c3840');
  const lip = toon('#1a242c');
  for (const n of niches) {
    const y0 = n.y - n.h / 2;
    addBox(g, 0.04, n.h - 0.08, n.w - 0.1, toon('#07161c', { emissive: n.glow, emissiveIntensity: 0.45 }), x0 + 0.03, n.y, n.z);
    addBox(g, n.d, 0.06, n.w + 0.1, lip, x0 + n.d / 2, y0, n.z);
    addBox(g, n.d, 0.06, n.w + 0.1, lip, x0 + n.d / 2, n.y + n.h / 2, n.z);
    addBox(g, n.d, n.h, 0.07, jamb, x0 + n.d / 2, n.y, n.z - n.w / 2);
    addBox(g, n.d, n.h, 0.07, jamb, x0 + n.d / 2, n.y, n.z + n.w / 2);
    const fx = x0 + n.d;
    addBox(g, 0.055, 0.07, n.w + 0.14, jamb, fx, n.y + n.h / 2, n.z);
    addBox(g, 0.055, 0.07, n.w + 0.14, jamb, fx, n.y - n.h / 2, n.z);
    addBox(g, 0.055, n.h, 0.07, jamb, fx, n.y, n.z - n.w / 2);
    addBox(g, 0.055, n.h, 0.07, jamb, fx, n.y, n.z + n.w / 2);
    const glass = addBox(
      g, 0.015, n.h - 0.16, n.w - 0.16,
      toon('#b7e0dc', { transparent: true, opacity: 0.18, side: THREE.DoubleSide, depthWrite: false }),
      x0 + n.d - 0.01, n.y, n.z,
    );
    flag(glass, { noShadow: true, noReceive: true, order: 4 });
    const sand = addBox(g, n.d - 0.12, 0.05, n.w - 0.22, toon('#c6b48a'), x0 + n.d * 0.48, y0 + 0.08, n.z);
    furnishNiche(g, {
      x: x0 + n.d * 0.42,
      floorY: y0 + 0.11,
      z: n.z,
    }, n.kind);
    sand.receiveShadow = true;

    const tex = plaqueTexture({ title: n.title, lines: n.lines, width: 768, height: 360 });
    signPlane(g, Math.min(0.72, n.w - 0.08), 0.32, tex, x0 + 0.04, y0 - 0.24, n.z, Math.PI / 2, 0);
  }
}

function buildWallWorks(g, layout) {
  const { innerBack } = roomOf(layout);
  const frame = addBox(g, 0.62, 1.7, 0.04, toon('#1a2428'), -5.05, 1.85, innerBack + 0.03);
  const face = new THREE.Mesh(new THREE.PlaneGeometry(0.52, 1.58), toon('#ffffff', { map: habitatTexture() }));
  face.position.z = 0.025;
  face.userData.noShadow = true;
  frame.add(face);

  const door = addBox(g, 0.92, 2.15, 0.06, toon('#1c262c'), 4.72, 1.08, innerBack + 0.04);
  addBox(g, 0.72, 1.7, 0.02, toon('#12181c'), 4.72, 1.15, innerBack + 0.075);
  addBox(g, 0.08, 0.16, 0.03, toon('#8d7344'), 4.95, 1.05, innerBack + 0.09);
  const staff = plaqueTexture({ title: 'STAFF', lines: ['Life support'], width: 640, height: 280 });
  signPlane(g, 0.42, 0.2, staff, 4.72, 2.28, innerBack + 0.05, 0, 0);
  door.name = 'staff-door';
}

function buildVisitor(g, layout) {
  const { innerBack } = roomOf(layout);
  const pad = toon('#3a464c');
  const joint = toon('#222a2e');
  const padW = 7.5;
  const padD = 4.35;
  const padZ = -0.2;
  addBox(g, padW, 0.028, padD, pad, 0.05, 0.014, padZ);
  const inset = 0.16;
  addBox(g, padW - inset * 2, 0.008, 0.06, joint, 0.05, 0.03, padZ - padD / 2 + inset);
  addBox(g, padW - inset * 2, 0.008, 0.06, joint, 0.05, 0.03, padZ + padD / 2 - inset);
  addBox(g, 0.06, 0.008, padD - inset * 2, joint, 0.05 - padW / 2 + inset, 0.03, padZ);
  addBox(g, 0.06, 0.008, padD - inset * 2, joint, 0.05 + padW / 2 - inset, 0.03, padZ);
  for (const x of [-2.15, -0.25, 1.7]) {
    addBox(g, 0.018, 0.006, padD - 0.7, joint, x, 0.032, padZ);
  }
  addBox(g, padW - 1.4, 0.006, 0.016, joint, 0.1, 0.032, -1.15);
  addBox(g, padW - 1.8, 0.006, 0.016, joint, -0.2, 0.032, 0.55);

  addBox(g, 1.15, 0.018, 6.6, toon('#313b40'), -4.55, 0.01, 0.15);
  addBox(g, 0.012, 0.006, 6.2, joint, -4.55, 0.022, 0.15);

  addBox(g, 5.4, 0.016, 0.85, toon('#262e32'), 1.3, 0.01, 3.25);
  addBox(g, 4.6, 0.008, 0.08, toon('#8d8474'), 1.3, 0.02, 3.05);
  addBox(g, 4.6, 0.008, 0.08, toon('#8d8474'), 1.3, 0.02, 3.45);
  addBox(g, 0.7, 0.012, 1.35, toon('#2a3338'), 0.15, 0.018, 2.45);

  const post = toon('#2a3336');
  const brass = toon('#b7a06a');
  const rope = toon('#6e6248');
  const railZ = innerBack + 2.15;
  const posts = [-2.65, -0.85, 0.95, 2.7];
  for (const x of posts) {
    addCyl(g, 0.045, 0.05, 0.04, post, x, 0.02, railZ, 8);
    addCyl(g, 0.022, 0.022, 0.9, post, x, 0.49, railZ, 8);
    addCyl(g, 0.035, 0.035, 0.04, brass, x, 0.95, railZ, 8);
  }
  for (let i = 0; i < posts.length - 1; i++) {
    const x1 = posts[i];
    const x2 = posts[i + 1];
    const mid = (x1 + x2) / 2;
    const len = x2 - x1;
    for (const y of [0.78, 0.46]) {
      const bar = addCyl(g, 0.012, 0.012, len - 0.06, rope, mid, y, railZ, 8);
      bar.rotation.z = Math.PI / 2;
    }
  }

  const lecternTex = plaqueTexture({
    title: 'KELP FOREST',
    lines: [
      'Cold Pacific water, mid tank.',
      'Orange garibaldi keep to the blades.',
      'Please stay behind the rail.',
    ],
    width: 860,
    height: 520,
  });
  const lectern = new THREE.Group();
  lectern.position.set(-2.45, 0, -0.55);
  g.add(lectern);
  addBox(lectern, 0.46, 0.06, 0.36, toon('#2a3336'), 0, 0.03, 0);
  addCyl(lectern, 0.035, 0.04, 1.02, toon('#3a4446'), 0, 0.55, 0, 8);
  const panel = signPlane(lectern, 0.78, 0.5, lecternTex, 0, 1.18, 0.02, 0, 0.46);
  panel.name = 'lectern';

  const pylon = new THREE.Group();
  pylon.position.set(5.45, 0, 3.85);
  g.add(pylon);
  addBox(pylon, 0.38, 2.25, 0.38, toon('#1e282e'), 0, 1.125, 0);
  addBox(pylon, 0.5, 0.08, 0.5, toon('#2c3836'), 0, 0.04, 0);
  addBox(pylon, 0.46, 0.06, 0.46, brass, 0, 2.22, 0);
  const way = plaqueTexture({
    title: 'AQUATIC HALL',
    lines: ['Kelp forest ahead', 'Niches along the left wall'],
    width: 800,
    height: 420,
  });
  signPlane(pylon, 0.34, 0.42, way, 0, 1.45, 0.2, 0, 0);
}

function buildPotFoliage(g, layout) {
  const pots = (layout.instances || []).filter((inst) => inst.kind === 'flowerpot');
  pots.forEach((p, i) => {
    const x = p.position[0];
    const z = p.position[2];
    const y = 0.3;
    if (i === 0) {
      kelp(g, x, y, z, 0.85, 0.12, 0.4, '#245c38');
      broadPlant(g, x + 0.05, y, z - 0.02, '#3d6a32');
    } else {
      broadPlant(g, x, y, z, '#2f6a3c');
      broadPlant(g, x - 0.04, y + 0.05, z + 0.03, '#4e7a38');
      kelp(g, x + 0.02, y, z, 0.55, -0.1, 0.8, '#1e6840');
    }
  });
}

function makeProcedural(layout) {
  const g = new THREE.Group();
  g.name = 'procedural';
  buildTank(g, layout);
  buildNiches(g, layout);
  buildWallWorks(g, layout);
  buildVisitor(g, layout);
  buildPotFoliage(g, layout);
  return g;
}

boot({
  makeShell,
  makeProcedural,
  readyText: 'ready — kelp forest hall · drag orbit · U unlit · T toon',
  onFrame(t) {
    for (const m of swimmers) {
      const b = m.userData.base;
      const w = t * 0.45 + b.phase;
      m.position.x = b.x + Math.sin(w) * b.amp;
      m.position.y = b.y + Math.sin(w * 1.6 + 0.7) * b.yAmp;
      m.rotation.y = b.rotY + Math.sin(w * 0.55) * 0.08;
    }
  },
});
