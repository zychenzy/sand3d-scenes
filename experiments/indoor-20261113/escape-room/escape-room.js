import * as THREE from 'three';
import { boot, toon, addBox, addCyl } from './scene_lib.js';
import {
  tideChart, chalkSlate, deskLog, jarTag, dialFace, seaView, floorRose, mapSheet, tideStaff,
} from './panels.js';

const ORDER = ['anchor', 'gull', 'lantern'];
const NAMES = { anchor: 'ANCHOR', gull: 'GULL', lantern: 'LANTERN' };

const rig = { gear: null, dials: {} };

function wood(hex = '#5c3d2e') { return toon(hex); }
function brass() { return toon('#c6a15b'); }
function brassDeep() { return toon('#8d6830'); }
function plaster(hex) {
  const m = toon(hex);
  m.emissive = new THREE.Color(hex);
  m.emissiveIntensity = 0.035;
  return m;
}

function art(tex, opts = {}) {
  return toon('#ffffff', {
    map: tex,
    emissive: '#ffffff',
    emissiveIntensity: opts.glow ?? 0.26,
    side: opts.side || THREE.FrontSide,
  });
}

function sheet(parent, tex, x, y, z, w, h, rotY = 0, rotX = 0, framed = true) {
  const g = new THREE.Group();
  const face = new THREE.Mesh(new THREE.PlaneGeometry(w, h), art(tex, { side: THREE.DoubleSide }));
  face.position.z = 0.02;
  face.userData.shadow = 'none';
  g.add(face);
  if (framed) {
    const frame = new THREE.Mesh(new THREE.BoxGeometry(w + 0.045, h + 0.045, 0.016), wood('#3e291f'));
    frame.userData.shadow = 'cast';
    g.add(frame);
  }
  g.position.set(x, y, z);
  g.rotation.order = 'YXZ';
  g.rotation.y = rotY;
  g.rotation.x = rotX;
  parent.add(g);
  return g;
}

function layStrip(parent, points) {
  for (let i = 0; i < points.length - 1; i++) {
    const [x1, z1] = points[i];
    const [x2, z2] = points[i + 1];
    const mx = (x1 + x2) / 2;
    const mz = (z1 + z2) / 2;
    const len = Math.hypot(x2 - x1, z2 - z1);
    const strip = addBox(parent, 0.055, 0.008, len, brass(), mx, 0.036, mz, { shadow: 'none' });
    strip.rotation.y = Math.atan2(x2 - x1, z2 - z1);
  }
}

function contact(parent, x, z, rx, rz) {
  const m = new THREE.Mesh(
    new THREE.CircleGeometry(1, 18),
    toon('#1a120c', {
      transparent: true,
      opacity: 0.2,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
    }),
  );
  m.rotation.x = -Math.PI / 2;
  m.position.set(x, 0.021, z);
  m.scale.set(rx, rz, 1);
  m.userData.shadow = 'none';
  m.raycast = () => {};
  parent.add(m);
}

function foliage(parent, x, z, y0) {
  const stem = toon('#3d5228');
  const a = toon('#2f6b3c');
  const b = toon('#4e8a48');
  addCyl(parent, 0.02, 0.028, 0.22, stem, x, y0 + 0.16, z, 8, { shadow: 'cast' });
  const leaf = (r, c, dx, dy, dz) => {
    const m = new THREE.Mesh(new THREE.SphereGeometry(r, 12, 9), c);
    m.position.set(x + dx, y0 + dy, z + dz);
    parent.add(m);
  };
  leaf(0.16, a, 0, 0.36, 0);
  leaf(0.11, b, 0.1, 0.46, 0.02);
  leaf(0.09, a, -0.08, 0.44, -0.04);
}

function deck(g, W, D) {
  const tones = ['#c6a57e', '#bf9d78', '#c9a984', '#b99674'].map((c) => toon(c));
  const plankW = 0.18;
  const lengths = [1.7, 2.15, 2.45, 1.9];
  let row = 0;
  for (let z = -D / 2 + 0.22; z < D / 2 - 0.18; z += plankW) {
    let x = -W / 2 + 0.2 + (row % 3) * 0.48;
    let i = 0;
    while (x < W / 2 - 0.18) {
      const len = lengths[(row + i) % lengths.length];
      const x1 = Math.min(x + len, W / 2 - 0.16);
      const w = x1 - x;
      if (w > 0.28) {
        addBox(g, w - 0.006, 0.016, plankW - 0.006, tones[(row + i) % tones.length], (x + x1) / 2, 0.008, z, { shadow: 'receive' });
      }
      x = x1;
      i += 1;
    }
    row += 1;
  }
}

function beadRun(g, axis, fixed, a0, a1, y, h) {
  const a = toon('#143f48');
  const b = toon('#1c5560');
  const step = 0.1;
  for (let t = a0; t < a1 - 0.02; t += step) {
    const mat = Math.round(t * 8) % 2 ? a : b;
    if (axis === 'x') addBox(g, 0.072, h, 0.03, mat, t + 0.03, y, fixed, { shadow: 'receive' });
    else addBox(g, 0.03, h, 0.072, mat, fixed, y, t + 0.03, { shadow: 'receive' });
  }
}

function makeShell(layout) {
  const g = new THREE.Group();
  g.name = 'shell';
  const { width: W, depth: D, height: H } = layout.meta.room;
  const s = layout.shell;
  const upper = plaster(s.wallUpper || '#e5eeea');
  const warm = plaster(s.wallColor);
  const oak = wood(s.woodColor);
  const deep = wood(s.woodDeep);
  const brassMat = brass();

  addBox(g, W, 0.08, D, toon('#3a261c'), 0, -0.04, 0, { shadow: 'receive' });
  deck(g, W, D);
  const border = wood('#9a7858');
  addBox(g, W - 0.08, 0.02, 0.08, border, 0, 0.014, -D / 2 + 0.07, { shadow: 'none' });
  addBox(g, W - 0.08, 0.02, 0.08, border, 0, 0.014, D / 2 - 0.07, { shadow: 'none' });
  addBox(g, 0.08, 0.02, D - 0.1, border, -W / 2 + 0.07, 0.014, 0, { shadow: 'none' });
  addBox(g, 0.08, 0.02, D - 0.1, border, W / 2 - 0.07, 0.014, 0, { shadow: 'none' });

  const rug = addBox(g, 2.35, 0.02, 1.85, toon(s.rug), -1.15, 0.02, -0.5, { shadow: 'receive' });
  rug.userData.shadow = 'receive';
  addBox(g, 2.05, 0.006, 1.55, toon('#1a6d64'), -1.15, 0.032, -0.5, { shadow: 'none' });
  const med = new THREE.Mesh(new THREE.CircleGeometry(0.42, 24), toon('#14564f'));
  med.rotation.x = -Math.PI / 2;
  med.position.set(-1.15, 0.036, -0.5);
  med.userData.shadow = 'none';
  g.add(med);
  addBox(g, 2.35, 0.006, 0.05, toon(s.rugEdge), -1.15, 0.034, -0.5 + 0.9, { shadow: 'none' });
  addBox(g, 2.35, 0.006, 0.05, toon(s.rugEdge), -1.15, 0.034, -0.5 - 0.9, { shadow: 'none' });

  const runner = addBox(g, 0.78, 0.012, 4.15, toon('#1a454c'), 0.42, 0.024, 0.35, { shadow: 'receive' });
  runner.userData.shadow = 'receive';
  addBox(g, 0.08, 0.004, 4.15, toon('#c6a15b'), 0.42, 0.032, 0.35, { shadow: 'none' });
  for (const z of [2.4, -1.7]) {
    const cap = new THREE.Mesh(new THREE.CircleGeometry(0.39, 20), toon('#1a454c'));
    cap.rotation.x = -Math.PI / 2;
    cap.position.set(0.42, 0.03, z);
    cap.userData.shadow = 'none';
    g.add(cap);
  }

  addBox(g, 1.85, 0.016, 1.25, toon('#2c3a44'), 4.2, 0.02, -2.85, { shadow: 'receive' });

  const back = addBox(g, W, H, 0.14, upper, 0, H / 2, -D / 2, { shadow: 'receive' });
  back.name = 'back-wall';
  const win = { z0: -0.2, z1: 1.65, y0: 0.95, y1: 2.22 };
  const leftX = -W / 2;
  addBox(g, 0.14, win.y0, D, warm, leftX, win.y0 / 2, 0, { shadow: 'receive' });
  addBox(g, 0.14, H - win.y1, D, upper, leftX, (H + win.y1) / 2, 0, { shadow: 'receive' });
  const leftSpan = win.z0 - (-D / 2);
  addBox(g, 0.14, win.y1 - win.y0, leftSpan, warm, leftX, (win.y0 + win.y1) / 2, (-D / 2 + win.z0) / 2, { shadow: 'receive' });
  const rightSpan = D / 2 - win.z1;
  addBox(g, 0.14, win.y1 - win.y0, rightSpan, warm, leftX, (win.y0 + win.y1) / 2, (win.z1 + D / 2) / 2, { shadow: 'receive' });

  const view = new THREE.Mesh(new THREE.PlaneGeometry(win.z1 - win.z0 - 0.08, win.y1 - win.y0 - 0.08), art(seaView(), { glow: 0.62 }));
  view.position.set(leftX - 0.02, (win.y0 + win.y1) / 2, (win.z0 + win.z1) / 2);
  view.rotation.y = Math.PI / 2;
  view.userData.shadow = 'none';
  g.add(view);
  const glass = new THREE.Mesh(
    new THREE.PlaneGeometry(win.z1 - win.z0, win.y1 - win.y0),
    toon('#d5eaf2', { transparent: true, opacity: 0.16, side: THREE.DoubleSide, depthWrite: false }),
  );
  glass.position.set(leftX + 0.08, (win.y0 + win.y1) / 2, (win.z0 + win.z1) / 2);
  glass.rotation.y = Math.PI / 2;
  glass.userData.shadow = 'none';
  g.add(glass);
  addBox(g, 0.09, 0.08, win.z1 - win.z0 + 0.14, oak, leftX + 0.08, win.y0, (win.z0 + win.z1) / 2, { shadow: 'cast' });
  addBox(g, 0.09, 0.08, win.z1 - win.z0 + 0.14, oak, leftX + 0.08, win.y1, (win.z0 + win.z1) / 2, { shadow: 'cast' });
  addBox(g, 0.09, win.y1 - win.y0, 0.08, oak, leftX + 0.08, (win.y0 + win.y1) / 2, win.z0, { shadow: 'cast' });
  addBox(g, 0.09, win.y1 - win.y0, 0.08, oak, leftX + 0.08, (win.y0 + win.y1) / 2, win.z1, { shadow: 'cast' });
  addBox(g, 0.05, win.y1 - win.y0 - 0.08, 0.045, oak, leftX + 0.1, (win.y0 + win.y1) / 2, (win.z0 + win.z1) / 2, { shadow: 'cast' });
  addBox(g, 0.26, 0.045, win.z1 - win.z0 + 0.06, oak, leftX + 0.22, win.y0 + 0.01, (win.z0 + win.z1) / 2, { shadow: 'cast' });
  addCyl(g, 0.022, 0.022, win.z1 - win.z0, oak, leftX + 0.35, win.y0 + 0.01, (win.z0 + win.z1) / 2, 10, { rotX: Math.PI / 2, shadow: 'cast' });

  const innerB = -D / 2 + 0.09;
  const innerL = -W / 2 + 0.09;
  beadRun(g, 'x', innerB + 0.02, -W / 2 + 0.35, W / 2 - 0.3, 0.5, 0.82);
  beadRun(g, 'z', innerL + 0.02, -D / 2 + 0.35, D / 2 - 0.35, 0.5, 0.82);
  addBox(g, W - 0.25, 0.06, 0.07, oak, 0, 0.96, innerB + 0.03, { shadow: 'cast' });
  addCyl(g, 0.032, 0.032, W - 0.4, oak, 0, 1.02, innerB + 0.05, 12, { rotZ: Math.PI / 2, shadow: 'cast' });
  addBox(g, W - 0.3, 0.025, 0.02, toon('#2a2118'), 0, 0.93, innerB + 0.045, { shadow: 'none' });
  addBox(g, 0.07, 0.06, D - 0.35, oak, innerL + 0.03, 0.96, 0.15, { shadow: 'cast' });
  addCyl(g, 0.032, 0.032, D - 0.55, oak, innerL + 0.05, 1.02, 0.15, 12, { rotX: Math.PI / 2, shadow: 'cast' });
  addBox(g, W - 0.35, 0.035, 0.045, brassMat, 0, 2.48, innerB + 0.02);
  addBox(g, 0.045, 0.035, D - 0.45, brassMat, innerL + 0.02, 2.48, 0.1);
  addBox(g, W - 0.4, 0.7, 0.02, warm, 0, 1.72, innerB + 0.012, { shadow: 'receive' });

  const ceil = plaster(s.ceilingColor || '#f3efe6');
  addBox(g, W, 0.1, D, ceil, 0, H - 0.05, 0, { shadow: 'receive' });
  addBox(g, W + 0.06, 0.18, 0.14, deep, 0, H - 0.12, D / 2 - 0.04, { shadow: 'cast' });
  addBox(g, 0.14, 0.18, D + 0.04, deep, W / 2 - 0.04, H - 0.12, 0, { shadow: 'cast' });

  const rightX = W / 2;
  const rightWall = addBox(g, 0.14, H, D, upper, rightX, H / 2, 0, { shadow: 'receive' });
  rightWall.name = 'right-wall';
  const innerR = rightX - 0.09;
  beadRun(g, 'z', innerR - 0.02, -D / 2 + 0.35, D / 2 - 0.35, 0.5, 0.82);
  addBox(g, 0.06, 0.06, D - 0.4, oak, innerR - 0.02, 0.96, 0.1, { shadow: 'cast' });
  addCyl(g, 0.028, 0.028, D - 0.6, oak, innerR - 0.035, 1.02, 0.1, 12, { rotX: Math.PI / 2, shadow: 'cast' });
  addBox(g, 0.04, 0.035, D - 0.5, brassMat, innerR - 0.015, 2.48, 0.05);
  addBox(g, 0.02, 0.7, D - 0.45, warm, innerR - 0.005, 1.72, 0.05, { shadow: 'receive' });
  addBox(g, 0.16, H, 0.16, deep, rightX - 0.02, H / 2, D / 2 - 0.02, { shadow: 'cast' });
  const beamY = H - 0.22;
  for (const z of [-2.7, -0.7, 1.3]) {
    addBox(g, W - 0.5, 0.16, 0.14, deep, -0.1, beamY, z, { shadow: 'cast' });
  }
  addBox(g, 0.14, 0.16, D - 0.7, deep, -1.15, beamY, 0.1, { shadow: 'cast' });
  addBox(g, 0.14, 0.16, 2.4, deep, 2.35, beamY, -1.4, { shadow: 'cast' });

  const buoy = new THREE.Group();
  const ringB = new THREE.Mesh(new THREE.TorusGeometry(0.26, 0.055, 10, 24), toon('#f4efe6'));
  buoy.add(ringB);
  for (let i = 0; i < 4; i++) {
    const seg = new THREE.Mesh(new THREE.TorusGeometry(0.26, 0.06, 8, 8, Math.PI / 2.4), toon(i % 2 ? '#d15a42' : '#f7f3ea'));
    seg.rotation.z = i * (Math.PI / 2);
    buoy.add(seg);
  }
  buoy.position.set(innerL + 0.1, 1.85, 2.15);
  buoy.rotation.y = Math.PI / 2;
  g.add(buoy);

  return g;
}

function keyMesh() {
  const g = new THREE.Group();
  const bow = new THREE.Mesh(new THREE.TorusGeometry(0.045, 0.012, 8, 16), brass());
  bow.position.y = 0.07;
  const shaft = addBox(g, 0.018, 0.16, 0.012, brass(), 0, -0.02, 0);
  shaft.position.y = -0.01;
  addBox(g, 0.012, 0.028, 0.028, brassDeep(), 0, -0.08, 0.012);
  g.add(bow);
  return g;
}

function cabinet(parent, x, z, spec) {
  const g = new THREE.Group();
  const w = 0.72;
  const h = 1.52;
  const d = 0.42;
  addBox(g, w, h, d, wood('#4a3124'), 0, h / 2, 0);
  addBox(g, w - 0.08, 0.06, 0.05, wood('#2e2018'), 0, 0.04, d / 2);
  addBox(g, w - 0.08, 0.05, 0.04, brass(), 0, h - 0.06, d / 2 + 0.01);

  const door = new THREE.Group();
  const doorW = w - 0.1;
  const doorH = h - 0.26;
  addBox(door, doorW, doorH, 0.04, wood('#5c3d2e'), doorW / 2, 0, 0.012);
  addBox(door, doorW - 0.14, doorH - 0.2, 0.025, toon(spec.color), doorW / 2, -0.02, 0.03, { pick: `dial:${spec.key}` });
  addCyl(door, 0.018, 0.018, 0.11, brass(), doorW - 0.08, 0.02, 0.05, 8);
  const face = dialFace(spec.digit, spec.color);
  const dial = new THREE.Mesh(new THREE.CircleGeometry(0.09, 24), art(face, { glow: 0.32 }));
  dial.position.set(doorW / 2, 0.22, 0.05);
  dial.userData.pick = `dial:${spec.key}`;
  dial.userData.shadow = 'none';
  door.add(dial);
  const plaqueTex = jarTag(spec.name, spec.digit, spec.color);
  const plaque = new THREE.Mesh(new THREE.PlaneGeometry(0.28, 0.11), art(plaqueTex, { glow: 0.3 }));
  plaque.position.set(doorW / 2, doorH / 2 - 0.16, 0.05);
  plaque.userData.shadow = 'none';
  door.add(plaque);
  door.position.set(-w / 2 + 0.05, h / 2 - 0.02, d / 2);
  if (spec.open) door.rotation.y = -0.95;
  g.add(door);
  rig.dials[spec.key] = { tex: face, mesh: dial, digit: spec.digit, color: spec.color };

  if (spec.open) {
    addBox(g, w - 0.18, 0.035, d - 0.12, wood('#6b4a34'), 0, 0.72, -0.02);
    addBox(g, w - 0.18, 0.035, d - 0.12, wood('#6b4a34'), 0, 1.05, -0.02);
    const key = keyMesh();
    key.position.set(0.02, 0.78, 0.02);
    key.rotation.z = 0.35;
    g.add(key);
  }

  g.position.set(x, 0, z);
  parent.add(g);
  return g;
}

function cabinetBank(parent, xs, z) {
  const g = new THREE.Group();
  const x0 = xs[0] - 0.46;
  const x1 = xs[xs.length - 1] + 0.46;
  const mid = (x0 + x1) / 2;
  const span = x1 - x0;
  addBox(g, span, 0.08, 0.5, wood('#3a261c'), mid, 0.04, z);
  addBox(g, span + 0.06, 0.07, 0.5, wood('#5c3d2e'), mid, 1.56, z);
  addCyl(g, 0.02, 0.02, span + 0.02, brass(), mid, 1.62, z + 0.2, 10, { rotZ: Math.PI / 2 });
  addBox(g, 0.07, 1.6, 0.5, wood('#3e291f'), x0, 0.8, z);
  addBox(g, 0.07, 1.6, 0.5, wood('#3e291f'), x1, 0.8, z);
  parent.add(g);
}

function mechanism(parent, x, z, digits, colors) {
  const g = new THREE.Group();
  addBox(g, 1.55, 1.42, 0.1, wood('#3e291f'), 0, 1.22, -0.02, { shadow: 'receive' });
  addBox(g, 1.38, 1.2, 0.05, toon('#24343c'), 0, 1.24, 0.02, { shadow: 'receive' });
  addBox(g, 1.62, 0.06, 0.12, brass(), 0, 1.9, 0.02);
  addBox(g, 1.62, 0.06, 0.12, brass(), 0, 0.54, 0.02);
  addBox(g, 0.06, 1.4, 0.12, brass(), -0.78, 1.22, 0.02);
  addBox(g, 0.06, 1.4, 0.12, brass(), 0.78, 1.22, 0.02);
  addBox(g, 1.3, 0.045, 0.16, wood('#6b4632'), 0, 0.62, 0.08);

  ORDER.forEach((key, i) => {
    const cx = -0.42 + i * 0.42;
    const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.045, 24), brass());
    wheel.rotation.x = Math.PI / 2;
    wheel.position.set(cx, 1.32, 0.07);
    g.add(wheel);
    const hub = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.012, 6, 18), brassDeep());
    hub.position.set(cx, 1.32, 0.09);
    g.add(hub);
    const face = new THREE.Mesh(new THREE.CircleGeometry(0.09, 24), art(dialFace(digits[key], colors[key]), { glow: 0.4 }));
    face.position.set(cx, 1.32, 0.1);
    face.userData.shadow = 'none';
    g.add(face);
    const tag = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.09), art(jarTag(NAMES[key], digits[key], colors[key]), { glow: 0.32 }));
    tag.position.set(cx, 1.68, 0.08);
    tag.userData.shadow = 'none';
    g.add(tag);
    const lever = new THREE.Group();
    addCyl(lever, 0.016, 0.016, 0.2, toon('#d7dde2'), 0, 0.08, 0, 8);
    addBox(lever, 0.07, 0.028, 0.045, toon('#e2a23a'), 0, 0.18, 0);
    lever.position.set(cx, 0.78, 0.1);
    lever.rotation.x = i === 2 ? -0.55 : -0.18;
    g.add(lever);
    const gem = new THREE.Mesh(new THREE.SphereGeometry(0.032, 12, 10), toon(colors[key], { emissive: colors[key], emissiveIntensity: 0.65 }));
    gem.position.set(cx, 1.02, 0.09);
    g.add(gem);
  });

  const gear = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.03, 12), brassDeep());
  gear.rotation.x = Math.PI / 2;
  gear.position.set(0.52, 1.02, 0.08);
  g.add(gear);
  rig.gear = gear;
  for (let i = 0; i < 8; i++) {
    const tooth = addBox(g, 0.03, 0.06, 0.028, brass(), 0, 0, 0);
    const a = (i / 8) * Math.PI * 2;
    tooth.position.set(0.52 + Math.cos(a) * 0.17, 1.02 + Math.sin(a) * 0.17, 0.08);
  }

  g.position.set(x, 0, z);
  parent.add(g);
}

function compass(parent, x, y, z) {
  const g = new THREE.Group();
  addCyl(g, 0.15, 0.15, 0.028, brass(), 0, 0.02, 0, 20);
  addCyl(g, 0.1, 0.1, 0.018, toon('#f4efe4'), 0, 0.038, 0, 20);
  const needle = addBox(g, 0.016, 0.008, 0.15, toon('#d15a42'), 0, 0.05, 0);
  needle.rotation.y = 0.25;
  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(0.11, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2),
    toon('#d5eef2', { transparent: true, opacity: 0.35, depthWrite: false, side: THREE.DoubleSide }),
  );
  dome.position.y = 0.04;
  g.add(dome);
  g.position.set(x, y, z);
  parent.add(g);
}

function seaChest(parent, x, z, yaw = 0) {
  const g = new THREE.Group();
  const w = 0.86;
  const h = 0.36;
  const d = 0.48;
  addBox(g, w, h, d, wood('#6b4632'), 0, h / 2, 0, { shadow: 'cast' });
  addBox(g, w - 0.1, h - 0.1, 0.02, wood('#3e291f'), 0, h / 2, d / 2 + 0.004);
  const lid = new THREE.Mesh(
    new THREE.SphereGeometry(1, 18, 12, 0, Math.PI * 2, 0, Math.PI / 2),
    wood('#7d5640'),
  );
  lid.scale.set(w / 2, 0.14, d / 2);
  lid.position.y = h;
  lid.userData.shadow = 'cast';
  g.add(lid);
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const cap = new THREE.Mesh(new THREE.SphereGeometry(0.032, 10, 8), brass());
      cap.position.set(sx * (w / 2 - 0.02), 0.05, sz * (d / 2 - 0.02));
      g.add(cap);
    }
  }
  for (const sx of [-0.2, 0.2]) {
    const beck = new THREE.Mesh(new THREE.TorusGeometry(0.055, 0.011, 8, 14), toon('#8d5a32'));
    beck.position.set(sx, h * 0.55, d / 2 + 0.02);
    g.add(beck);
  }
  g.position.set(x, 0, z);
  g.rotation.y = yaw;
  parent.add(g);
}

function chartChest(parent, x, z, digits, colors) {
  const g = new THREE.Group();
  const w = 0.98;
  const h = 0.5;
  const d = 0.46;
  addBox(g, w, h, d, wood('#5c3d2e'), 0, h / 2, 0, { shadow: 'cast' });
  const lid = new THREE.Mesh(
    new THREE.SphereGeometry(1, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2),
    wood('#7a5340'),
  );
  lid.scale.set(w / 2, 0.11, d / 2);
  lid.position.y = h;
  g.add(lid);
  ORDER.forEach((key, i) => {
    const dx = -0.3 + i * 0.3;
    addBox(g, 0.24, 0.28, 0.02, wood('#3e291f'), dx, 0.24, d / 2 + 0.006);
    addCyl(g, 0.02, 0.02, 0.03, brass(), dx, 0.24, d / 2 + 0.03, 10);
    const tag = new THREE.Mesh(
      new THREE.PlaneGeometry(0.16, 0.07),
      art(jarTag(NAMES[key], digits[key], colors[key]), { glow: 0.28 }),
    );
    tag.position.set(dx, 0.38, d / 2 + 0.02);
    tag.userData.shadow = 'none';
    g.add(tag);
  });
  g.position.set(x, 0, z);
  parent.add(g);
}

function bollard(parent, x, z) {
  const g = new THREE.Group();
  addCyl(g, 0.18, 0.2, 0.08, wood('#3a261c'), 0, 0.04, 0, 16, { shadow: 'cast' });
  addCyl(g, 0.1, 0.12, 0.46, wood('#6b4632'), 0, 0.3, 0, 16, { shadow: 'cast' });
  addCyl(g, 0.15, 0.11, 0.08, wood('#8a6248'), 0, 0.56, 0, 16, { shadow: 'cast' });
  const rope = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.028, 8, 20), toon('#8d5a32'));
  rope.rotation.x = Math.PI / 2;
  rope.position.y = 0.045;
  rope.userData.shadow = 'cast';
  g.add(rope);
  g.position.set(x, 0, z);
  parent.add(g);
}

function binoculars(parent, x, y, z, yaw) {
  const g = new THREE.Group();
  const body = toon('#243034');
  for (const sx of [-0.055, 0.055]) {
    addCyl(g, 0.042, 0.048, 0.16, body, sx, 0, 0, 12, { rotX: Math.PI / 2 });
    addCyl(g, 0.034, 0.034, 0.028, brass(), sx, 0, 0.09, 10);
    addCyl(g, 0.03, 0.03, 0.02, brassDeep(), sx, 0, -0.08, 10);
  }
  addBox(g, 0.12, 0.03, 0.05, brass(), 0, 0.01, 0);
  const strap = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.008, 6, 14, Math.PI), toon('#6b4632'));
  strap.rotation.x = Math.PI / 2;
  strap.position.set(0, -0.02, -0.02);
  g.add(strap);
  g.position.set(x, y, z);
  g.rotation.y = yaw;
  parent.add(g);
}

function pegRail(parent, x, y, z, yaw) {
  const g = new THREE.Group();
  addCyl(g, 0.028, 0.028, 0.78, wood('#5c3d2e'), 0, 0, 0, 10, { rotZ: Math.PI / 2, shadow: 'cast' });
  for (const sx of [-0.24, 0, 0.24]) {
    addCyl(g, 0.016, 0.012, 0.09, brass(), sx, -0.01, 0.05, 8, { rotX: Math.PI / 2 });
    const knob = new THREE.Mesh(new THREE.SphereGeometry(0.02, 8, 8), brass());
    knob.position.set(sx, -0.01, 0.1);
    g.add(knob);
  }
  g.position.set(x, y, z);
  g.rotation.y = yaw;
  parent.add(g);
}

function porthole(parent, x, y, z) {
  const g = new THREE.Group();
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.032, 10, 28), brass());
  g.add(ring);
  const glass = new THREE.Mesh(new THREE.CircleGeometry(0.21, 28), art(seaView(), { glow: 0.55 }));
  glass.position.z = -0.01;
  glass.userData.shadow = 'none';
  g.add(glass);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const bolt = new THREE.Mesh(new THREE.SphereGeometry(0.016, 8, 8), brassDeep());
    bolt.position.set(Math.cos(a) * 0.24, Math.sin(a) * 0.24, 0.02);
    g.add(bolt);
  }
  g.position.set(x, y, z);
  parent.add(g);
}

function hangingSlate(parent, x, z, tex) {
  const g = new THREE.Group();
  const w = 1.36;
  const h = 0.92;
  const d = 0.07;
  addBox(g, w, h, d, wood('#4a3426'), 0, 0, 0, { shadow: 'cast' });
  addBox(g, w - 0.1, h - 0.1, 0.02, toon('#16302e'), 0, 0, d / 2);
  const face = new THREE.Mesh(new THREE.PlaneGeometry(w - 0.16, h - 0.16), art(tex, { glow: 0.16 }));
  face.position.z = d / 2 + 0.016;
  face.userData.shadow = 'none';
  g.add(face);
  addBox(g, w + 0.04, 0.055, 0.09, wood('#5c4030'), 0, -h / 2 - 0.01, 0.02, { shadow: 'cast' });
  const chalks = ['#f4efe4', '#1e4e86', '#d15a42', '#e2a23a'];
  chalks.forEach((c, i) => {
    addCyl(g, 0.012, 0.012, 0.09, toon(c), -0.28 + i * 0.16, -h / 2 - 0.01, 0.05, 8, { rotZ: Math.PI / 2 });
  });
  addBox(g, 0.08, 0.06, 0.08, wood('#3e291f'), -0.42, h / 2 - 0.02, -d / 2 - 0.02);
  addBox(g, 0.08, 0.06, 0.08, wood('#3e291f'), 0.42, h / 2 - 0.02, -d / 2 - 0.02);
  g.position.set(x, 1.52, z);
  parent.add(g);
}

function staff(parent, x, z, tex) {
  const g = new THREE.Group();
  addBox(g, 0.18, 1.45, 0.045, wood('#3e291f'), 0, 1.15, 0, { shadow: 'cast' });
  const face = new THREE.Mesh(new THREE.PlaneGeometry(0.14, 1.28), art(tex, { glow: 0.28 }));
  face.position.set(0, 1.16, 0.028);
  face.userData.shadow = 'none';
  g.add(face);
  const cap = new THREE.Mesh(new THREE.SphereGeometry(0.07, 12, 10), brass());
  cap.position.y = 1.92;
  g.add(cap);
  g.position.set(x, 0, z);
  g.rotation.y = Math.PI / 2;
  parent.add(g);
}

function bell(parent, x, y, z) {
  const g = new THREE.Group();
  const mesh = new THREE.Mesh(new THREE.LatheGeometry([
    new THREE.Vector2(0.02, 0),
    new THREE.Vector2(0.09, 0.02),
    new THREE.Vector2(0.12, 0.1),
    new THREE.Vector2(0.06, 0.18),
    new THREE.Vector2(0.02, 0.22),
  ], 18), brass());
  mesh.userData.shadow = 'cast';
  g.add(mesh);
  const clapper = new THREE.Mesh(new THREE.SphereGeometry(0.022, 8, 8), brassDeep());
  clapper.position.y = 0.06;
  g.add(clapper);
  g.position.set(x, y, z);
  parent.add(g);
}

function chartRolls(parent, x, z) {
  const g = new THREE.Group();
  const colors = ['#e7dcc4', '#1e4e86', '#d7c4a2'];
  colors.forEach((c, i) => {
    const x = (i - 1) * 0.14;
    addCyl(g, 0.05, 0.05, 0.46, toon(c), x, 0.05, 0, 14, { rotZ: Math.PI / 2, shadow: 'cast' });
    addCyl(g, 0.054, 0.054, 0.03, brass(), x - 0.23, 0.05, 0, 10, { rotZ: Math.PI / 2 });
    addCyl(g, 0.054, 0.054, 0.03, brass(), x + 0.23, 0.05, 0, 10, { rotZ: Math.PI / 2 });
  });
  g.position.set(x, 0, z);
  parent.add(g);
}

function makeProcedural(layout) {
  const g = new THREE.Group();
  g.name = 'puzzle';
  const digits = layout.meta.puzzle.digits;
  const colors = layout.meta.puzzle.colors;
  const a = layout.anchors;

  for (const inst of layout.instances) {
    if (inst.contact) contact(g, inst.position[0], inst.position[2], inst.contact[0], inst.contact[1]);
  }

  const rose = new THREE.Mesh(new THREE.CircleGeometry(0.42, 28), art(floorRose(), { glow: 0.2 }));
  rose.rotation.x = -Math.PI / 2;
  rose.position.set(0.42, 0.034, 1.62);
  rose.userData.shadow = 'none';
  g.add(rose);

  layStrip(g, layout.circulation);
  layStrip(g, layout.branch);

  sheet(g, tideChart(digits), a.easel.x, 0.92, a.easel.z + 0.28, 0.52, 0.9, 0, -0.16);
  const lightBar = addBox(g, 0.64, 0.045, 0.08, brass(), a.easel.x, 1.78, a.easel.z + 0.12, { shadow: 'cast' });
  lightBar.userData.shadow = 'cast';
  addBox(g, 0.5, 0.018, 0.04, toon('#fff4d4', { emissive: '#fff4d4', emissiveIntensity: 0.85 }), a.easel.x, 1.75, a.easel.z + 0.17, { shadow: 'none' });

  hangingSlate(g, a.slate.x, -3.76, chalkSlate(digits));
  sheet(g, deskLog(digits), -1.42, 0.785, -0.95, 0.34, 0.22, 0.15, -1.48, false);
  sheet(g, mapSheet(), a.table.x, 0.745, a.table.z - 0.02, 0.32, 0.22, 0.1, -1.5, false);
  sheet(g, mapSheet(), -3.15, 1.72, -3.78, 0.78, 0.48, 0, 0, true);

  ORDER.forEach((key, i) => {
    const tag = new THREE.Mesh(
      new THREE.PlaneGeometry(0.15, 0.075),
      art(jarTag(NAMES[key], digits[key], colors[key]), { glow: 0.28 }),
    );
    tag.position.set(a.table.x - 0.22 + i * 0.22, 0.86, a.table.z + 0.22);
    tag.rotation.x = -0.85;
    tag.userData.shadow = 'none';
    g.add(tag);
  });

  ORDER.forEach((key, i) => {
    cabinet(g, a.cabinets[i], a.cabinetZ, {
      key,
      name: NAMES[key],
      color: colors[key],
      digit: digits[key],
      open: key === 'lantern',
    });
  });
  cabinetBank(g, a.cabinets, a.cabinetZ);
  mechanism(g, a.panel.x, a.panel.z, digits, colors);
  compass(g, a.table.x + 0.22, 0.78, a.table.z + 0.08);
  bell(g, a.plinth.x, 0.8, a.plinth.z);

  porthole(g, -4.45, 1.78, -3.76);
  staff(g, -5.12, -2.85, tideStaff(digits));
  pegRail(g, -5.12, 1.48, 3.25, Math.PI / 2);
  binoculars(g, -4.92, 1.04, 0.85, 0.7);

  seaChest(g, 2.72, 1.05, 0.35);
  bollard(g, -0.95, 1.82);
  chartChest(g, -2.35, -2.55, digits, colors);
  chartRolls(g, -2.95, -1.85);

  foliage(g, -4.75, 3.35, 0.32);
  foliage(g, 4.55, 3.25, 0.32);

  addCyl(g, 0.04, 0.045, 0.07, toon('#24343c'), -0.95, 0.8, -0.72, 10);
  addBox(g, 0.012, 0.12, 0.012, brass(), -0.98, 0.84, -0.68);

  const coil = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.03, 8, 16), toon('#8d5a32'));
  coil.rotation.x = Math.PI / 2;
  coil.position.set(2.05, 0.05, 2.45);
  g.add(coil);

  return g;
}

function redrawDial(key, digit) {
  const slot = rig.dials[key];
  if (!slot) return;
  slot.tex = dialFace(digit, slot.color || '#888888');
  const apply = (mat) => {
    if (!mat) return;
    mat.map = slot.tex;
    if (mat.emissiveMap !== undefined) mat.emissiveMap = slot.tex;
    mat.needsUpdate = true;
  };
  apply(slot.mesh.material);
}

function statusFor(layout) {
  const digits = layout.meta.puzzle.digits;
  const matched = ORDER.every((key) => rig.dials[key] && rig.dials[key].digit === digits[key]);
  const line = ORDER.map((key) => `${NAMES[key]} ${rig.dials[key] ? rig.dials[key].digit : '?'}`).join(' · ');
  return matched ? `${line} — the lantern door is open` : `${line} — the chart still disagrees`;
}

boot({
  makeShell,
  makeProcedural,
  readyText: 'Tide Lock — chart, slate, and wheels agree · T toon · U unlit',
  onReady(api) {
    const el = document.getElementById('status');
    if (el) el.textContent = statusFor(api.layout);
    ORDER.forEach((key) => {
      if (rig.dials[key]) rig.dials[key].color = api.layout.meta.puzzle.colors[key];
    });
    const stand = api.props.getObjectByName('slate');
    if (stand) stand.visible = false;
  },
  onPick(hits, api) {
    for (const hit of hits) {
      let node = hit.object;
      let pick = null;
      while (node && !pick) {
        pick = node.userData && node.userData.pick;
        node = node.parent;
      }
      if (!pick || !pick.startsWith('dial:')) continue;
      const key = pick.slice(5);
      const slot = rig.dials[key];
      if (!slot) return;
      slot.digit = (slot.digit + 1) % 10;
      slot.color = api.layout.meta.puzzle.colors[key];
      redrawDial(key, slot.digit);
      api.setStatus(statusFor(api.layout));
      return;
    }
  },
  onFrame(dt) {
    if (rig.gear) rig.gear.rotation.z += dt * 0.35;
  },
});
