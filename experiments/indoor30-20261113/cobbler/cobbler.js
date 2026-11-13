import * as THREE from 'three';
import { boot, toon, addBox, addCyl } from './scene_lib.js';

const oak = () => toon('#8b5a34');
const oakDark = () => toon('#5a3a24');
const oakMid = () => toon('#6e4a30');
const maple = () => toon('#d7b98a');
const iron = () => toon('#5d666e');
const ironDark = () => toon('#3c444a');
const brass = () => toon('#c6a15a');
const sole = () => toon('#e6d2b0');
const stitch = () => toon('#f4efe4');
const plaster = () => toon('#f3eadf');

const papers = new Map();

function paper(text, bg = '#f4efe2', fg = '#2a241c', w = 128, h = 80) {
  const key = [text, bg, fg, w, h].join('|');
  if (papers.has(key)) return papers.get(key);
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = fg;
  ctx.globalAlpha = 0.35;
  ctx.lineWidth = 4;
  ctx.strokeRect(4, 4, w - 8, h - 8);
  ctx.globalAlpha = 1;
  ctx.fillStyle = fg;
  ctx.font = `700 ${Math.floor(h * 0.46)}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, w / 2, h / 2 + 1);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearFilter;
  tex.generateMipmaps = false;
  const mat = toon('#ffffff', { map: tex });
  papers.set(key, mat);
  return mat;
}

function put(parent, mesh) {
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function quiet(mesh, receive = false) {
  mesh.castShadow = false;
  mesh.userData.noShadow = true;
  if (receive) mesh.userData.receiveShadow = true;
  return mesh;
}

function contact(parent, x, z, rx, rz) {
  const m = new THREE.Mesh(
    new THREE.CircleGeometry(1, 16),
    toon('#3a2c22', { transparent: true, opacity: 0.2, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }),
  );
  m.rotation.x = -Math.PI / 2;
  m.position.set(x, 0.021, z);
  m.scale.set(rx, rz, 1);
  quiet(m);
  parent.add(m);
}

function footLast(color, side = 1) {
  const g = new THREE.Group();
  g.name = 'shoe-last';
  const wood = toon(color);
  const plate = toon('#8d949b');
  const solePlate = put(g, new THREE.Mesh(new THREE.BoxGeometry(0.078, 0.016, 0.25), toon('#c9aa78')));
  solePlate.position.set(side * 0.004, 0.014, 0.01);
  const heel = put(g, new THREE.Mesh(new THREE.SphereGeometry(0.042, 12, 8), wood));
  heel.scale.set(0.92, 0.82, 1.0);
  heel.position.set(0, 0.05, -0.09);
  const waist = put(g, new THREE.Mesh(new THREE.SphereGeometry(0.036, 10, 8), wood));
  waist.scale.set(0.78, 0.85, 1.15);
  waist.position.set(side * 0.004, 0.055, -0.02);
  const ball = put(g, new THREE.Mesh(new THREE.SphereGeometry(0.046, 12, 8), wood));
  ball.scale.set(1.02, 0.62, 1.05);
  ball.position.set(side * 0.01, 0.048, 0.055);
  const toe = put(g, new THREE.Mesh(new THREE.SphereGeometry(0.034, 12, 8), wood));
  toe.scale.set(0.86, 0.55, 1.28);
  toe.position.set(side * 0.012, 0.04, 0.125);
  toe.rotation.x = -0.25;
  const instep = put(g, new THREE.Mesh(new THREE.SphereGeometry(0.032, 10, 8), wood));
  instep.scale.set(0.7, 1.2, 1.25);
  instep.position.set(side * 0.006, 0.086, 0.01);
  const ankle = put(g, new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.038, 0.07, 10), wood));
  ankle.position.set(0, 0.1, -0.075);
  const toeIron = put(g, new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.008, 0.04), plate));
  toeIron.position.set(side * 0.01, 0.026, 0.12);
  return g;
}

function weltStitches(g, leatherY) {
  for (const side of [-1, 1]) {
    const band = put(g, new THREE.Mesh(new THREE.BoxGeometry(0.007, 0.007, 0.2), stitch()));
    band.position.set(side * 0.044, leatherY, 0.012);
    band.castShadow = false;
    band.userData.noShadow = true;
  }
  for (let i = 0; i < 11; i++) {
    const z = -0.08 + i * 0.018;
    const half = 0.044;
    for (const side of [-1, 1]) {
      const s = put(g, new THREE.Mesh(new THREE.CylinderGeometry(0.0034, 0.0034, 0.014, 5), stitch()));
      s.rotation.z = Math.PI / 2;
      s.position.set(side * half, leatherY, z);
      s.castShadow = false;
      s.userData.noShadow = true;
    }
  }
}

function oxford(color, opts = {}) {
  const g = new THREE.Group();
  g.name = opts.boot ? 'boot' : 'oxford';
  const leather = toon(color);
  const dark = toon('#2e2824');
  const out = put(g, new THREE.Mesh(new THREE.BoxGeometry(0.086, 0.012, 0.24), sole()));
  out.position.set(0, 0.02, 0.012);
  for (let i = 0; i < 3; i++) {
    const lift = put(g, new THREE.Mesh(new THREE.BoxGeometry(0.068, 0.01, 0.062), i === 2 ? dark : sole()));
    lift.position.set(0, 0.032 + i * 0.011, -0.085);
  }
  const quarter = put(g, new THREE.Mesh(new THREE.SphereGeometry(0.046, 14, 10), leather));
  quarter.scale.set(0.95, 0.78, 1.02);
  quarter.position.set(0, 0.062, -0.05);
  const vamp = put(g, new THREE.Mesh(new THREE.SphereGeometry(0.044, 14, 10), leather));
  vamp.scale.set(1.0, 0.52, 1.2);
  vamp.position.set(0, 0.05, 0.045);
  const cap = put(g, new THREE.Mesh(new THREE.SphereGeometry(0.036, 12, 8), leather));
  cap.scale.set(0.95, 0.48, 1.2);
  cap.position.set(0, 0.044, 0.115);
  const seam = put(g, new THREE.Mesh(new THREE.TorusGeometry(0.034, 0.003, 6, 14, Math.PI), stitch()));
  seam.rotation.y = Math.PI / 2;
  seam.rotation.z = Math.PI / 2;
  seam.position.set(0, 0.05, 0.078);
  const tongue = put(g, new THREE.Mesh(new THREE.BoxGeometry(0.034, 0.05, 0.01), leather));
  tongue.position.set(0, 0.09, 0.02);
  tongue.rotation.x = -0.45;
  for (let i = 0; i < 3; i++) {
    for (const side of [-1, 1]) {
      const eye = put(g, new THREE.Mesh(new THREE.TorusGeometry(0.006, 0.002, 4, 8), brass()));
      eye.position.set(side * 0.018, 0.078 + i * 0.012, 0.01 - i * 0.012);
      eye.rotation.y = side * 0.4;
    }
  }
  const lace = put(g, new THREE.Mesh(new THREE.BoxGeometry(0.028, 0.004, 0.05), toon('#f7f3ea')));
  lace.position.set(0, 0.086, 0.012);
  lace.rotation.x = -0.4;
  weltStitches(g, 0.03);
  if (opts.boot) {
    const shaft = put(g, new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.048, 0.11, 12), leather));
    shaft.position.set(0, 0.14, -0.055);
    const cuff = put(g, new THREE.Mesh(new THREE.TorusGeometry(0.042, 0.006, 6, 12), dark));
    cuff.rotation.x = Math.PI / 2;
    cuff.position.set(0, 0.19, -0.055);
    const pull = put(g, new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.028, 0.006), dark));
    pull.position.set(0, 0.2, -0.09);
  }
  return g;
}

/** One extruded side profile: heel, instep, and a round toe cap. Sole bottom is y=0. */
function clampedUpper(color) {
  const g = new THREE.Group();
  g.name = 'clamped-upper';
  const leather = toon(color);
  const shape = new THREE.Shape();
  shape.moveTo(0.0, 0.0);
  shape.lineTo(0.0, 0.062);
  shape.bezierCurveTo(0.004, 0.088, 0.016, 0.104, 0.032, 0.102);
  shape.bezierCurveTo(0.046, 0.096, 0.058, 0.07, 0.068, 0.05);
  shape.bezierCurveTo(0.082, 0.046, 0.1, 0.055, 0.125, 0.058);
  shape.bezierCurveTo(0.155, 0.05, 0.185, 0.042, 0.21, 0.034);
  shape.bezierCurveTo(0.23, 0.028, 0.248, 0.02, 0.252, 0.014);
  shape.bezierCurveTo(0.258, 0.008, 0.25, 0.002, 0.236, 0.0);
  shape.lineTo(0.0, 0.0);
  const extrude = {
    depth: 0.066,
    bevelEnabled: true,
    bevelThickness: 0.002,
    bevelSize: 0.002,
    bevelSegments: 1,
    curveSegments: 12,
  };
  const upper = put(g, new THREE.Mesh(new THREE.ExtrudeGeometry(shape, extrude), leather));
  upper.geometry.translate(0, 0, -0.033);
  upper.rotation.y = -Math.PI / 2;
  const cap = new THREE.Shape();
  cap.moveTo(0.2, 0.0);
  cap.lineTo(0.2, 0.036);
  cap.bezierCurveTo(0.222, 0.03, 0.242, 0.02, 0.252, 0.014);
  cap.bezierCurveTo(0.258, 0.008, 0.25, 0.002, 0.236, 0.0);
  cap.lineTo(0.2, 0.0);
  const capMesh = put(g, new THREE.Mesh(new THREE.ExtrudeGeometry(cap, extrude), toon('#a86858')));
  capMesh.geometry.translate(0, 0, -0.033);
  capMesh.rotation.y = -Math.PI / 2;
  const soleShape = new THREE.Shape();
  soleShape.moveTo(0.0, 0.0);
  soleShape.lineTo(0.246, 0.0);
  soleShape.lineTo(0.246, 0.01);
  soleShape.lineTo(0.0, 0.01);
  soleShape.lineTo(0.0, 0.0);
  const soleMesh = put(g, new THREE.Mesh(new THREE.ExtrudeGeometry(soleShape, {
    depth: 0.076,
    bevelEnabled: false,
    curveSegments: 6,
  }), sole()));
  soleMesh.geometry.translate(0, 0, -0.038);
  soleMesh.rotation.y = -Math.PI / 2;
  return g;
}

function pegKit(parent, x, y, z) {
  const tray = put(parent, new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.025, 0.12), oakDark()));
  tray.position.set(x, y + 0.02, z);
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 3; j++) {
      const peg = put(parent, new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.007, 0.028, 5), maple()));
      peg.position.set(x - 0.07 + i * 0.045, y + 0.04, z - 0.03 + j * 0.03);
      peg.castShadow = false;
      peg.userData.noShadow = true;
    }
  }
  const wax = put(parent, new THREE.Mesh(new THREE.SphereGeometry(0.028, 10, 8), toon('#d8c07a')));
  wax.scale.set(1.1, 0.55, 0.9);
  wax.position.set(x + 0.16, y + 0.03, z + 0.02);
  const hammer = new THREE.Group();
  const handle = put(hammer, new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.01, 0.16, 6), oak()));
  handle.rotation.z = 0.9;
  const head = put(hammer, new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.028, 0.028), iron()));
  head.position.set(0.02, 0.07, 0);
  hammer.position.set(x - 0.22, y + 0.04, z + 0.04);
  parent.add(hammer);
  const pincer = new THREE.Group();
  const a = put(pincer, new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.14, 0.012), iron()));
  a.rotation.z = 0.35;
  a.position.set(-0.015, 0.04, 0);
  const b = put(pincer, new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.14, 0.012), iron()));
  b.rotation.z = -0.35;
  b.position.set(0.015, 0.04, 0);
  const jaw = put(pincer, new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.02, 0.016), ironDark()));
  jaw.position.set(0, 0.1, 0);
  pincer.position.set(x + 0.28, y + 0.02, z - 0.02);
  pincer.rotation.y = 0.4;
  parent.add(pincer);
}

function toolRail(parent, x, y, z) {
  const rail = put(parent, new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.03, 0.03), oakDark()));
  rail.position.set(x, y, z);
  const tools = [
    { kind: 'awl', dx: -0.42 },
    { kind: 'knife', dx: -0.14 },
    { kind: 'hammer', dx: 0.16 },
    { kind: 'pincer', dx: 0.42 },
  ];
  for (const t of tools) {
    const hook = put(parent, new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.03, 0.02), brass()));
    hook.position.set(x + t.dx, y - 0.02, z + 0.02);
    if (t.kind === 'awl') {
      const shaft = put(parent, new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.002, 0.11, 6), iron()));
      shaft.position.set(x + t.dx, y - 0.1, z + 0.03);
      const grip = put(parent, new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.014, 0.05, 8), oak()));
      grip.position.set(x + t.dx, y - 0.05, z + 0.03);
    } else if (t.kind === 'knife') {
      const blade = put(parent, new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.09, 0.004), toon('#d5dbe2')));
      blade.position.set(x + t.dx, y - 0.09, z + 0.03);
      const grip = put(parent, new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.045, 0.014), oak()));
      grip.position.set(x + t.dx, y - 0.04, z + 0.03);
    } else if (t.kind === 'hammer') {
      const handle = put(parent, new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.01, 0.14, 6), oak()));
      handle.position.set(x + t.dx, y - 0.1, z + 0.03);
      const head = put(parent, new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.026, 0.026), iron()));
      head.position.set(x + t.dx, y - 0.16, z + 0.03);
    } else {
      const a = put(parent, new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.12, 0.01), iron()));
      a.rotation.z = 0.4;
      a.position.set(x + t.dx - 0.012, y - 0.09, z + 0.03);
      const b = put(parent, new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.12, 0.01), iron()));
      b.rotation.z = -0.4;
      b.position.set(x + t.dx + 0.012, y - 0.09, z + 0.03);
    }
  }
}

function repairBench(parent, zone) {
  const g = new THREE.Group();
  g.name = 'repair-bench';
  g.position.set(zone.x, 0, zone.z);
  const { w, d, h } = zone;
  const legH = h - 0.06;
  for (const [x, z] of [[-1, -1], [-1, 1], [1, -1], [1, 1]]) {
    put(g, new THREE.Mesh(new THREE.BoxGeometry(0.08, legH, 0.08), oakDark())).position.set(x * (w / 2 - 0.08), legH / 2, z * (d / 2 - 0.07));
  }
  put(g, new THREE.Mesh(new THREE.BoxGeometry(w - 0.2, 0.028, d - 0.14), oakMid())).position.set(-0.15, 0.22, 0);
  for (let i = 0; i < 3; i++) {
    const y = 0.36 + i * 0.13;
    put(g, new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.11, d - 0.16), oak())).position.set(-w / 2 + 0.4, y, 0.02);
    put(g, new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.06, 0.012), toon('#7a5134'))).position.set(-w / 2 + 0.4, y, d / 2 - 0.02);
    const pull = put(g, new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.02, 8), brass()));
    pull.rotation.x = Math.PI / 2;
    pull.position.set(-w / 2 + 0.4, y, d / 2 + 0.004);
  }
  put(g, new THREE.Mesh(new THREE.BoxGeometry(w, 0.055, d), maple())).position.set(0, h - 0.028, 0);
  put(g, new THREE.Mesh(new THREE.BoxGeometry(w, 0.04, 0.028), oakDark())).position.set(0, h - 0.06, d / 2 - 0.01);
  put(g, new THREE.Mesh(new THREE.BoxGeometry(w * 0.55, 0.018, 0.08), oakDark())).position.set(0.35, h - 0.01, 0.08);
  const post = put(g, new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.022, 0.2, 10), iron()));
  post.position.set(0.62, h + 0.1, 0.02);
  const yoke = put(g, new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.02, 0.05), ironDark()));
  yoke.position.set(0.62, h + 0.2, 0.02);
  const jack = footLast('#e0c79a', 1);
  jack.position.set(0.62, h + 0.22, 0.05);
  jack.rotation.y = 0.35;
  g.add(jack);
  const upper = oxford('#6e2e28');
  upper.position.set(0.12, h + 0.03, 0.08);
  upper.rotation.y = -0.7;
  g.add(upper);
  const spare = footLast('#c8aa7c', -1);
  spare.position.set(-0.15, 0.28, 0.02);
  spare.rotation.y = 1.2;
  g.add(spare);
  pegKit(g, -0.35, h, -0.08);
  toolRail(g, 0.15, h + 0.16, -d / 2 + 0.06);
  parent.add(g);
  contact(parent, zone.x, zone.z, w * 0.46, d * 0.48);
}

function stitchHorse(parent, zone) {
  const g = new THREE.Group();
  g.name = 'stitch-horse';
  g.position.set(zone.x, 0, zone.z);
  g.rotation.y = zone.rot || 0;
  const h = zone.h;
  put(g, new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.06, 0.34), oakDark())).position.set(0, 0.03, 0);
  const beamH = 0.05;
  const beamTop = h + 0.016;
  const beamBottom = beamTop - beamH;
  const postBottom = 0.06;
  const postTop = beamBottom + 0.018;
  const postH = postTop - postBottom;
  const post = put(g, new THREE.Mesh(new THREE.BoxGeometry(0.12, postH, 0.16), oak()));
  post.position.set(0, postBottom + postH / 2, 0.03);
  const beam = put(g, new THREE.Mesh(new THREE.BoxGeometry(0.088, beamH, 0.28), maple()));
  beam.position.set(0, beamBottom + beamH / 2, 0.03);
  const screw = put(g, new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.009, 0.1, 8), iron()));
  screw.rotation.z = Math.PI / 2;
  screw.position.set(-0.06, beamTop - 0.02, -0.1);
  const wheel = put(g, new THREE.Mesh(new THREE.TorusGeometry(0.03, 0.006, 6, 14), brass()));
  wheel.position.set(-0.11, beamTop - 0.02, -0.1);
  const work = clampedUpper('#8a4030');
  work.position.set(0, beamTop, -0.09);
  g.add(work);
  const spool = put(g, new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.028, 10), toon('#f3efe6')));
  spool.rotation.z = Math.PI / 2;
  spool.position.set(-0.07, beamTop + 0.016, -0.1);
  parent.add(g);
  contact(parent, zone.x, zone.z, 0.4, 0.34);
}

function readyPair(parent, stitch) {
  const g = new THREE.Group();
  g.name = 'ready-pair';
  g.position.set(0.85, 0, -0.62);
  const block = put(g, new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.045, 0.18), oakMid()));
  block.position.y = 0.022;
  const a = oxford('#6e2e28');
  a.position.set(-0.05, 0.05, 0);
  a.rotation.y = 0.3;
  g.add(a);
  const b = oxford('#6e2e28');
  b.position.set(0.07, 0.05, 0.02);
  b.rotation.y = -0.15;
  g.add(b);
  parent.add(g);
}

function finisher(parent, zone) {
  const g = new THREE.Group();
  g.name = 'finisher';
  g.position.set(zone.x, 0, zone.z);
  const paint = toon('#3d4c46');
  put(g, new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.05, 0.44), ironDark())).position.set(0, 0.025, 0);
  put(g, new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.08, 0.32), paint)).position.set(-0.02, 0.09, 0);
  const motor = put(g, new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.24, 16), paint));
  motor.rotation.x = Math.PI / 2;
  motor.position.set(-0.04, 0.26, 0);
  const bell = put(g, new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.03, 12), iron()));
  bell.rotation.x = Math.PI / 2;
  bell.position.set(-0.04, 0.26, 0.135);
  put(g, new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 0.72, 12), iron())).position.set(0.04, 0.54, -0.02);
  put(g, new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.065, 0.08), iron())).position.set(0.28, 0.96, -0.02);
  const wheel = put(g, new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.045, 24), toon('#2c3236')));
  wheel.rotation.z = Math.PI / 2;
  wheel.position.set(0.52, 0.9, -0.02);
  const rim = put(g, new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.016, 6, 24), toon('#c4a06a')));
  rim.rotation.y = Math.PI / 2;
  rim.position.set(0.52, 0.9, -0.02);
  const hub = put(g, new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.06, 10), brass()));
  hub.rotation.z = Math.PI / 2;
  hub.position.set(0.52, 0.9, -0.02);
  put(g, new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.016, 0.06), ironDark())).position.set(0.32, 0.74, -0.02);
  const belt = put(g, new THREE.Mesh(new THREE.BoxGeometry(0.016, 0.4, 0.01), toon('#2a241c')));
  belt.position.set(0.08, 0.52, 0.1);
  const shoe = oxford('#5c3318');
  shoe.position.set(0.36, 0.78, 0.05);
  shoe.rotation.y = 0.15;
  shoe.rotation.z = 0.35;
  shoe.rotation.x = -0.4;
  g.add(shoe);
  put(g, new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.016, 0.08), ironDark())).position.set(0.32, 0.016, 0.24);
  const rod = put(g, new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.2, 6), iron()));
  rod.position.set(0.32, 0.11, 0.16);
  parent.add(g);
  contact(parent, zone.x, zone.z, 0.38, 0.32);
}

function ticketRack(parent, zone) {
  const g = new THREE.Group();
  g.name = 'ticket-rack';
  g.position.set(zone.x, zone.y, zone.z);
  put(g, new THREE.Mesh(new THREE.BoxGeometry(zone.w, zone.h, 0.045), oakDark())).position.set(0, zone.h / 2, 0);
  put(g, new THREE.Mesh(new THREE.BoxGeometry(zone.w - 0.06, 0.08, 0.012), paper('TICKETS', '#5c3a28', '#f6f1e6', 256, 64))).position.set(0, zone.h - 0.08, 0.03);
  const nums = ['14', '27', '08', '41', '52', '19', '33', '06', '47', '22', '15', '38', '09', '44', '61', '03', '28', '17', '25', '36'];
  const cols = 4;
  const rows = 5;
  let n = 0;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = -zone.w / 2 + 0.2 + c * ((zone.w - 0.36) / (cols - 1));
      const y = 0.08 + r * 0.155;
      put(g, new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.008, 0.07), oakMid())).position.set(x, y, 0.04);
      if ((r + c) % 9 === 0) continue;
      const card = put(g, new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.11, 0.008), paper(nums[n] || '00', '#f7f3ea', '#1f1a16', 160, 96)));
      card.position.set(x, y + 0.07, 0.08);
      n += 1;
    }
  }
  parent.add(g);
}

function shoeRail(parent, zone) {
  const g = new THREE.Group();
  g.name = 'shoe-rail';
  g.position.set(zone.x, 0, zone.z);
  for (const z of [-zone.d / 2, zone.d / 2]) {
    put(g, new THREE.Mesh(new THREE.BoxGeometry(0.06, zone.h, 0.06), oakDark())).position.set(0, zone.h / 2, z);
  }
  const rod = put(g, new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, zone.d, 8), iron()));
  rod.rotation.x = Math.PI / 2;
  rod.position.set(0, 1.48, 0);
  const colors = ['#6e2e28', '#3a2e28', '#8a5a32', '#5a3828'];
  colors.forEach((color, i) => {
    const z = -zone.d / 2 + 0.22 + i * 0.3;
    const hook = put(g, new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.025, 0.016), brass()));
    hook.position.set(-0.03, 1.5, z);
    const shoe = oxford(color);
    shoe.position.set(-0.06, 1.42, z);
    shoe.rotation.x = 1.15;
    g.add(shoe);
    const tag = put(g, new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.04, 0.005), paper(['18', '24', '31', '07'][i], '#f7f1e4', '#2a241c', 128, 80)));
    tag.position.set(-0.1, 1.22, z);
  });
  parent.add(g);
}

function lastRack(parent, zone) {
  const g = new THREE.Group();
  g.name = 'last-rack';
  g.position.set(zone.x, zone.y, zone.z);
  put(g, new THREE.Mesh(new THREE.BoxGeometry(zone.w, 0.04, 0.08), oakDark())).position.set(0, 0, 0.02);
  put(g, new THREE.Mesh(new THREE.BoxGeometry(zone.w, 0.04, 0.08), oakDark())).position.set(0, 0.42, 0.02);
  const colors = ['#e0c79a', '#c9aa78', '#ddc09a', '#b9966a', '#e6d0aa', '#c4a06e', '#d8bc90', '#b89068'];
  for (let i = 0; i < 8; i++) {
    const row = i < 4 ? 0 : 1;
    const col = i % 4;
    const last = footLast(colors[i], col % 2 === 0 ? 1 : -1);
    last.position.set(-0.78 + col * 0.52, 0.1 + row * 0.4, 0.14);
    last.rotation.y = col % 2 === 0 ? Math.PI / 2 : -Math.PI / 2;
    last.scale.set(1.15, 1.05, 1.4);
    g.add(last);
  }
  parent.add(g);
}

function handoff(parent, zone) {
  const g = new THREE.Group();
  g.name = 'handoff-counter';
  g.position.set(zone.x, 0, zone.z);
  const { w, d, h } = zone;
  for (const x of [-w / 2 + 0.05, w / 2 - 0.05]) {
    put(g, new THREE.Mesh(new THREE.BoxGeometry(0.08, h - 0.08, d - 0.08), oakDark())).position.set(x, (h - 0.08) / 2, 0);
  }
  put(g, new THREE.Mesh(new THREE.BoxGeometry(w - 0.12, 0.08, d - 0.1), oakDark())).position.set(0, 0.05, 0);
  put(g, new THREE.Mesh(new THREE.BoxGeometry(w - 0.16, h * 0.62, 0.045), oakMid())).position.set(0, h * 0.48, d / 2 - 0.04);
  for (let i = 0; i < 4; i++) {
    const x = -w / 2 + 0.38 + i * ((w - 0.7) / 3);
    put(g, new THREE.Mesh(new THREE.BoxGeometry(0.38, h * 0.4, 0.012), toon('#8d6240'))).position.set(x, h * 0.48, d / 2 - 0.01);
  }
  const sign = put(g, new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.08, 0.012), paper('REPAIRS', '#5c3a28', '#f6f1e6', 256, 64)));
  sign.position.set(0.72, h * 0.72, d / 2 + 0.005);
  put(g, new THREE.Mesh(new THREE.BoxGeometry(w * 0.46, h * 0.28, 0.04), oak())).position.set(-0.35, 0.32, -d / 2 + 0.04);
  put(g, new THREE.Mesh(new THREE.BoxGeometry(w + 0.06, 0.05, d + 0.08), maple())).position.set(0, h - 0.02, 0);
  const leather = put(g, new THREE.Mesh(new THREE.BoxGeometry(w * 0.42, 0.012, d * 0.55), toon('#6e3a28')));
  leather.position.set(0.35, h + 0.01, 0.02);
  put(g, new THREE.Mesh(new THREE.BoxGeometry(w - 0.3, 0.025, d - 0.18), oakDark())).position.set(0.1, 0.38, 0);
  const wrappedA = put(g, new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.08, 0.1), paper('12', '#efe6d4', '#5a3a24', 128, 64)));
  wrappedA.position.set(-0.35, 0.45, 0);
  const wrappedB = put(g, new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.07, 0.1), paper('29', '#efe6d4', '#5a3a24', 128, 64)));
  wrappedB.position.set(0.05, 0.44, 0.02);
  const pairL = oxford('#2f2824');
  pairL.position.set(0.42, h + 0.02, 0.02);
  pairL.rotation.y = 0.4;
  g.add(pairL);
  const pairR = oxford('#2f2824');
  pairR.position.set(0.58, h + 0.02, -0.02);
  pairR.rotation.y = 0.55;
  g.add(pairR);
  const bell = put(g, new THREE.Mesh(new THREE.SphereGeometry(0.035, 10, 8, 0, Math.PI * 2, 0, Math.PI / 2), brass()));
  bell.position.set(0.95, h + 0.02, 0.12);
  const spike = put(g, new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.09, 6), brass()));
  spike.position.set(-0.15, h + 0.06, 0.16);
  for (let i = 0; i < 3; i++) {
    const slip = put(g, new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.004, 0.05), paper(['04', '11', '16'][i], '#f7f3ea', '#2a241c', 96, 64)));
    slip.position.set(-0.15, h + 0.02 + i * 0.006, 0.16);
    slip.rotation.y = (i - 1) * 0.15;
  }
  parent.add(g);
  contact(parent, zone.x, zone.z, w * 0.48, d * 0.5);
}

function shopPlant(parent, x, z) {
  const g = new THREE.Group();
  g.name = 'shop-plant';
  g.position.set(x, 0.3, z);
  const leaf = toon('#3f6a45');
  const leafDark = toon('#2f5538');
  for (const [dx, dy, dz, s] of [[0, 0.22, 0, 1], [0.08, 0.34, 0.04, 0.8], [-0.07, 0.3, -0.05, 0.7], [0.02, 0.42, -0.02, 0.55]]) {
    const m = put(g, new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 6), dy > 0.35 ? leafDark : leaf));
    m.scale.set(1.1 * s, 0.7 * s, 0.85 * s);
    m.position.set(dx, dy, dz);
    m.castShadow = false;
    m.userData.noShadow = true;
  }
  parent.add(g);
}

function foreground(parent, zone) {
  const g = new THREE.Group();
  g.name = 'foreground';
  g.position.set(zone.x, 0, zone.z);
  const mat = put(g, new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.012, 0.48), toon('#8a6844')));
  mat.position.set(0, 0.008, 0);
  quiet(mat, true);
  const border = put(g, new THREE.Mesh(new THREE.BoxGeometry(0.74, 0.008, 0.52), toon('#5a3a24')));
  border.position.set(0, 0.004, 0);
  quiet(border, true);
  for (const [x, z] of [[-0.16, -0.1], [0.16, -0.1], [0, 0.12]]) {
    put(g, new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.03, 0.28, 8), oakDark())).position.set(x, 0.15, z);
  }
  put(g, new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.03, 0.28), maple())).position.set(0, 0.3, -0.02);
  const boot = oxford('#4a3028', { boot: true });
  boot.position.set(0.02, 0.33, -0.02);
  boot.rotation.y = -0.6;
  g.add(boot);
  const loose = oxford('#6e2e28');
  loose.position.set(0.28, 0.04, 0.16);
  loose.rotation.z = Math.PI / 2;
  loose.rotation.y = 0.8;
  g.add(loose);
  parent.add(g);
}

function makeShell(layout) {
  const g = new THREE.Group();
  g.name = 'shell';
  const { width: W, depth: D, height: H } = layout.meta.room;
  const s = layout.shell;
  const floorMat = toon(s.floorColor, { polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 });
  const slab = new THREE.Mesh(new THREE.BoxGeometry(W, 0.08, D), toon(s.floorColor));
  slab.position.y = -0.04;
  slab.receiveShadow = true;
  slab.castShadow = false;
  g.add(slab);

  const plankW = W - 0.28;
  const board = 0.22;
  let z = -D / 2 + 0.12;
  while (z < D / 2 - 0.08) {
    const plank = new THREE.Mesh(new THREE.BoxGeometry(plankW, 0.01, board), floorMat);
    plank.position.set(0.05, 0.005, z + board / 2);
    quiet(plank, true);
    g.add(plank);
    z += board;
  }
  const trim = toon(s.trimColor);
  quiet(addBox(g, W - 0.08, 0.02, 0.08, trim, 0, 0.012, -D / 2 + 0.08), true);
  quiet(addBox(g, W - 0.08, 0.02, 0.08, trim, 0, 0.012, D / 2 - 0.08), true);
  quiet(addBox(g, 0.08, 0.02, D - 0.12, trim, -W / 2 + 0.08, 0.012, 0), true);

  const wall = toon(s.wallColor);
  const back = new THREE.Mesh(new THREE.BoxGeometry(W, H, 0.12), wall);
  back.position.set(0, H / 2, -D / 2);
  back.receiveShadow = true;
  back.castShadow = false;
  g.add(back);
  const left = new THREE.Mesh(new THREE.BoxGeometry(0.12, H, D), wall);
  left.position.set(-W / 2, H / 2, 0);
  left.receiveShadow = true;
  left.castShadow = false;
  g.add(left);

  const innerB = -D / 2 + 0.08;
  const innerL = -W / 2 + 0.08;
  const wood = toon(s.woodColor);
  panelRun(g, 'x', innerB, -W / 2 + 0.4, W / 2 - 0.3, 0.52, 0.86);
  panelRun(g, 'z', innerL, -D / 2 + 0.4, D / 2 - 0.35, 0.52, 0.86);
  addBox(g, W - 0.2, 0.08, 0.06, wood, 0, 0.98, innerB);
  addBox(g, 0.06, 0.08, D - 0.2, wood, innerL, 0.98, 0);
  addBox(g, W - 0.16, 0.08, 0.08, oakDark(), 0, H - 0.06, innerB);
  addBox(g, 0.08, 0.08, D - 0.16, oakDark(), innerL, H - 0.06, 0);

  const win = layout.zones.window;
  const pane = addBox(g, win.w, win.h, 0.03, toon('#f7f1e4', { emissive: '#fff4d2', emissiveIntensity: 0.35 }), win.x, win.y, win.z);
  pane.castShadow = false;
  const mullion = toon(s.trimColor);
  addBox(g, win.w + 0.08, 0.05, 0.05, mullion, win.x, win.y + win.h / 2, win.z + 0.02);
  addBox(g, win.w + 0.08, 0.05, 0.05, mullion, win.x, win.y - win.h / 2, win.z + 0.02);
  addBox(g, 0.05, win.h + 0.08, 0.05, mullion, win.x - win.w / 2, win.y, win.z + 0.02);
  addBox(g, 0.05, win.h + 0.08, 0.05, mullion, win.x + win.w / 2, win.y, win.z + 0.02);
  addBox(g, 0.035, win.h, 0.04, mullion, win.x, win.y, win.z + 0.025);

  const lid = addBox(g, W - 0.12, 0.07, D - 0.18, plaster(), -0.04, H - 0.035, -0.04);
  quiet(lid);
  for (const z of [-2.55, -0.55, 1.45]) {
    quiet(addBox(g, W - 1.1, 0.08, 0.12, oak(), -0.2, H - 0.12, z));
  }

  const apron = put(g, new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.7, 0.012), toon('#6e3a28')));
  apron.position.set(innerL + 0.02, 1.15, -1.7);
  const pocket = put(g, new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.16, 0.02), toon('#5a3024')));
  pocket.position.set(innerL + 0.03, 0.95, -1.7);
  const strap = put(g, new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.16, 0.016), oakDark()));
  strap.position.set(innerL + 0.03, 1.52, -1.55);

  return g;
}

function panelRun(g, axis, fixed, a0, a1, y, h) {
  const span = a1 - a0;
  const n = Math.max(3, Math.round(span / 0.95));
  const step = span / n;
  const frame = toon('#5a3a24');
  const inset = toon('#7a5340');
  for (let i = 0; i < n; i++) {
    const c = a0 + step * (i + 0.5);
    const pw = step - 0.07;
    if (axis === 'x') {
      addBox(g, pw, h, 0.04, frame, c, y, fixed);
      addBox(g, pw - 0.1, h - 0.12, 0.016, inset, c, y, fixed + 0.018);
    } else {
      addBox(g, 0.04, h, pw, frame, fixed, y, c);
      addBox(g, 0.016, h - 0.12, pw - 0.1, inset, fixed + 0.018, y, c);
    }
  }
}

function makeProcedural(layout) {
  const g = new THREE.Group();
  g.name = 'procedural';
  const z = layout.zones;
  repairBench(g, z.repair);
  stitchHorse(g, z.stitch);
  readyPair(g, z.stitch);
  finisher(g, z.finisher);
  ticketRack(g, z.tickets);
  shoeRail(g, z.rail);
  lastRack(g, z.lasts);
  handoff(g, z.counter);
  foreground(g, z.foreground);
  const plant = layout.instances.find((item) => item.id === 'plant');
  if (plant) shopPlant(g, plant.position[0], plant.position[2]);
  for (const inst of layout.instances) {
    if (inst.kind === 'dining_chair') contact(g, inst.position[0], inst.position[2], 0.24, 0.24);
    if (inst.kind === 'museum_bench') contact(g, inst.position[0], inst.position[2], 0.85, 0.28);
  }
  return g;
}

boot({
  makeShell,
  makeProcedural,
  readyText: 'ready — cobbler · drag orbit · U unlit · T toon',
});
