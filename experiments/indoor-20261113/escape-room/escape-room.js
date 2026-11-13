import * as THREE from 'three';
import { boot, toon, addBox, addCyl } from './scene_lib.js';
import {
  tideChart, keeperSlate, deskLog, entryCard, jarTag, dialFace, seaView, floorRose, mapSheet,
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
  m.emissiveIntensity = 0.08;
  return m;
}

function art(tex, opts = {}) {
  return toon('#ffffff', {
    map: tex,
    emissive: '#ffffff',
    emissiveIntensity: opts.glow ?? 0.55,
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
    const strip = addBox(parent, 0.08, 0.006, len, brass(), mx, 0.022, mz, { shadow: 'none' });
    strip.rotation.y = Math.atan2(x2 - x1, z2 - z1);
  }
}

function contact(parent, x, z, rx, rz) {
  const m = new THREE.Mesh(
    new THREE.CircleGeometry(1, 18),
    toon('#1a120c', {
      transparent: true,
      opacity: 0.22,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
    }),
  );
  m.rotation.x = -Math.PI / 2;
  m.position.set(x, 0.02, z);
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

function panelRun(g, axis, fixed, a0, a1, y, h, inset) {
  const span = a1 - a0;
  const n = Math.max(3, Math.round(span / 0.92));
  const step = span / n;
  const frame = wood('#3e291f');
  const fill = toon('#1b4650');
  for (let i = 0; i < n; i++) {
    const c = a0 + step * (i + 0.5);
    const pw = step - 0.07;
    if (axis === 'x') {
      addBox(g, pw, h, 0.04, frame, c, y, fixed, { shadow: 'receive' });
      addBox(g, pw - 0.1, h - 0.12, 0.02, fill, c, y, fixed + inset, { shadow: 'receive' });
    } else {
      addBox(g, 0.04, h, pw, frame, fixed, y, c, { shadow: 'receive' });
      addBox(g, 0.02, h - 0.12, pw - 0.1, fill, fixed + inset, y, c, { shadow: 'receive' });
    }
  }
}

function makeShell(layout) {
  const g = new THREE.Group();
  g.name = 'shell';
  const { width: W, depth: D, height: H } = layout.meta.room;
  const s = layout.shell;
  const wall = plaster(s.wallColor);
  const oak = wood(s.woodColor);
  const deep = wood(s.woodDeep);
  const brassMat = brass();

  addBox(g, W, 0.08, D, toon(s.floorDark), 0, -0.04, 0, { shadow: 'receive' });
  const n = Math.ceil((D - 0.16) / 0.16);
  for (let i = 0; i < n; i++) {
    const z = -D / 2 + 0.1 + i * 0.16;
    const shade = i % 2 ? s.floorDark : s.floorColor;
    addBox(g, W - 0.24, 0.012, 0.145, toon(shade), 0, 0.006, z, { shadow: 'receive' });
  }
  addBox(g, W - 0.08, 0.02, 0.08, deep, 0, 0.012, -D / 2 + 0.06, { shadow: 'none' });
  addBox(g, W - 0.08, 0.02, 0.08, deep, 0, 0.012, D / 2 - 0.06, { shadow: 'none' });
  addBox(g, 0.08, 0.02, D - 0.08, deep, -W / 2 + 0.06, 0.012, 0, { shadow: 'none' });
  addBox(g, 0.08, 0.02, D - 0.08, deep, W / 2 - 0.06, 0.012, 0, { shadow: 'none' });

  const rug = addBox(g, 2.15, 0.018, 1.7, toon(s.rug), -1.15, 0.016, -0.5, { shadow: 'receive' });
  rug.userData.shadow = 'receive';
  addBox(g, 1.9, 0.008, 1.45, toon('#21786e'), -1.15, 0.028, -0.5, { shadow: 'none' });
  addBox(g, 2.15, 0.006, 0.045, toon(s.rugEdge), -1.15, 0.03, -0.5 + 0.82, { shadow: 'none' });
  addBox(g, 2.15, 0.006, 0.045, toon(s.rugEdge), -1.15, 0.03, -0.5 - 0.82, { shadow: 'none' });

  addBox(g, 1.7, 0.016, 1.35, toon('#3d4c59'), 4.2, 0.014, -2.7, { shadow: 'receive' });

  const back = addBox(g, W, H, 0.14, wall, 0, H / 2, -D / 2, { shadow: 'receive' });
  back.name = 'back-wall';
  const win = { z0: -0.2, z1: 1.65, y0: 0.92, y1: 2.28 };
  const leftX = -W / 2;
  addBox(g, 0.14, win.y0, D, wall, leftX, win.y0 / 2, 0, { shadow: 'receive' });
  addBox(g, 0.14, H - win.y1, D, wall, leftX, (H + win.y1) / 2, 0, { shadow: 'receive' });
  const leftSpan = win.z0 - (-D / 2);
  addBox(g, 0.14, win.y1 - win.y0, leftSpan, wall, leftX, (win.y0 + win.y1) / 2, (-D / 2 + win.z0) / 2, { shadow: 'receive' });
  const rightSpan = D / 2 - win.z1;
  addBox(g, 0.14, win.y1 - win.y0, rightSpan, wall, leftX, (win.y0 + win.y1) / 2, (win.z1 + D / 2) / 2, { shadow: 'receive' });

  const view = new THREE.Mesh(new THREE.PlaneGeometry(win.z1 - win.z0 - 0.08, win.y1 - win.y0 - 0.08), art(seaView(), { glow: 0.72 }));
  view.position.set(leftX - 0.02, (win.y0 + win.y1) / 2, (win.z0 + win.z1) / 2);
  view.rotation.y = Math.PI / 2;
  view.userData.shadow = 'none';
  g.add(view);
  const glass = new THREE.Mesh(
    new THREE.PlaneGeometry(win.z1 - win.z0, win.y1 - win.y0),
    toon('#d5eaf2', { transparent: true, opacity: 0.18, side: THREE.DoubleSide, depthWrite: false }),
  );
  glass.position.set(leftX + 0.08, (win.y0 + win.y1) / 2, (win.z0 + win.z1) / 2);
  glass.rotation.y = Math.PI / 2;
  glass.userData.shadow = 'none';
  g.add(glass);
  addBox(g, 0.08, 0.08, win.z1 - win.z0 + 0.12, oak, leftX + 0.08, win.y0, (win.z0 + win.z1) / 2);
  addBox(g, 0.08, 0.08, win.z1 - win.z0 + 0.12, oak, leftX + 0.08, win.y1, (win.z0 + win.z1) / 2);
  addBox(g, 0.08, win.y1 - win.y0, 0.08, oak, leftX + 0.08, (win.y0 + win.y1) / 2, win.z0);
  addBox(g, 0.08, win.y1 - win.y0, 0.08, oak, leftX + 0.08, (win.y0 + win.y1) / 2, win.z1);
  addBox(g, 0.05, win.y1 - win.y0 - 0.08, 0.045, oak, leftX + 0.09, (win.y0 + win.y1) / 2, (win.z0 + win.z1) / 2);

  const innerB = -D / 2 + 0.08;
  const innerL = -W / 2 + 0.08;
  panelRun(g, 'x', innerB, -W / 2 + 0.4, W / 2 - 0.35, 0.52, 0.86, 0.03);
  panelRun(g, 'z', innerL, -D / 2 + 0.45, win.z0 - 0.15, 0.52, 0.86, 0.03);
  panelRun(g, 'z', innerL, win.z1 + 0.15, D / 2 - 0.4, 0.52, 0.86, 0.03);
  addBox(g, W - 0.3, 0.07, 0.06, oak, 0, 1.02, innerB + 0.02);
  addBox(g, 0.06, 0.07, D - 0.4, oak, innerL + 0.02, 1.02, 0.2);
  addBox(g, W - 0.4, 0.03, 0.04, brassMat, 0, 2.55, innerB + 0.02);
  addBox(g, 0.04, 0.03, D - 0.5, brassMat, innerL + 0.02, 2.55, 0.15);

  const soffit = addBox(g, W * 0.96, 0.08, D * 0.48, plaster(s.ceilingColor), -0.1, H - 0.05, -D * 0.22, { shadow: 'receive' });
  soffit.userData.shadow = 'receive';
  for (const z of [-2.7, -0.6]) {
    addBox(g, W - 1.1, 0.1, 0.12, deep, -0.15, H - 0.16, z, { shadow: 'cast' });
  }
  addBox(g, 0.12, 0.1, 2.4, deep, 0.35, H - 0.18, 1.55, { shadow: 'cast' });

  const buoy = new THREE.Group();
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.07, 10, 24), toon('#f4efe6'));
  buoy.add(ring);
  for (let i = 0; i < 4; i++) {
    const seg = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.075, 8, 8, Math.PI / 2.4), toon(i % 2 ? '#d15a42' : '#f7f3ea'));
    seg.rotation.z = i * (Math.PI / 2);
    buoy.add(seg);
  }
  buoy.position.set(innerL + 0.08, 1.7, 2.55);
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
  const d = 0.4;
  addBox(g, w, h, d, wood(), 0, h / 2, 0);
  addBox(g, w - 0.08, 0.08, 0.05, wood('#3e291f'), 0, 0.04, d / 2 - 0.01);
  addBox(g, w - 0.06, 0.06, 0.04, brass(), 0, h - 0.08, d / 2 + 0.01);

  const door = new THREE.Group();
  const doorW = w - 0.1;
  const doorH = h - 0.28;
  addBox(door, doorW, doorH, 0.04, toon(spec.color), doorW / 2, 0, 0.02, { pick: `dial:${spec.key}` });
  addBox(door, 0.035, 0.12, 0.03, brass(), doorW - 0.08, 0, 0.045);
  const face = dialFace(spec.digit, spec.color);
  const dial = new THREE.Mesh(new THREE.CircleGeometry(0.09, 24), art(face, { glow: 0.35 }));
  dial.position.set(doorW / 2, 0.18, 0.046);
  dial.userData.pick = `dial:${spec.key}`;
  dial.userData.shadow = 'none';
  door.add(dial);
  const plaqueTex = jarTag(spec.name, spec.digit, spec.color);
  const plaque = new THREE.Mesh(new THREE.PlaneGeometry(0.28, 0.12), art(plaqueTex, { glow: 0.4 }));
  plaque.position.set(doorW / 2, doorH / 2 - 0.16, 0.046);
  plaque.userData.shadow = 'none';
  door.add(plaque);
  door.position.set(-w / 2 + 0.05, h / 2 - 0.02, d / 2);
  if (spec.open) door.rotation.y = -0.95;
  g.add(door);
  rig.dials[spec.key] = { tex: face, mesh: dial, digit: spec.digit };

  if (spec.open) {
    addBox(g, w - 0.16, 0.04, d - 0.1, wood('#6b4a34'), 0, 0.78, 0);
    addBox(g, 0.22, 0.03, 0.16, toon('#6e2438'), 0.02, 0.815, 0.02);
    const key = keyMesh();
    key.position.set(0.02, 0.9, 0.02);
    key.rotation.z = 0.4;
    g.add(key);
  }

  g.position.set(x, 0, z);
  parent.add(g);
  return g;
}

function mechanism(parent, x, z, digits, colors) {
  const g = new THREE.Group();
  addBox(g, 1.42, 1.28, 0.06, toon('#24343c'), 0, 1.28, 0, { shadow: 'receive' });
  addBox(g, 1.5, 0.06, 0.08, brass(), 0, 1.9, 0.02);
  addBox(g, 1.5, 0.06, 0.08, brass(), 0, 0.66, 0.02);
  addBox(g, 0.06, 1.28, 0.08, brass(), -0.72, 1.28, 0.02);
  addBox(g, 0.06, 1.28, 0.08, brass(), 0.72, 1.28, 0.02);

  ORDER.forEach((key, i) => {
    const cx = -0.42 + i * 0.42;
    const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.04, 24), brass());
    wheel.rotation.x = Math.PI / 2;
    wheel.position.set(cx, 1.32, 0.06);
    g.add(wheel);
    const face = new THREE.Mesh(new THREE.CircleGeometry(0.1, 24), art(dialFace(digits[key], colors[key]), { glow: 0.45 }));
    face.position.set(cx, 1.32, 0.085);
    face.userData.shadow = 'none';
    g.add(face);
    const tag = new THREE.Mesh(new THREE.PlaneGeometry(0.32, 0.1), art(jarTag(NAMES[key], digits[key], colors[key]), { glow: 0.4 }));
    tag.position.set(cx, 1.68, 0.07);
    tag.userData.shadow = 'none';
    g.add(tag);
    const lever = new THREE.Group();
    addBox(lever, 0.03, 0.22, 0.03, toon('#d7dde2'), 0, 0.08, 0);
    addBox(lever, 0.08, 0.03, 0.05, toon('#e2a23a'), 0, 0.18, 0);
    lever.position.set(cx, 0.86, 0.08);
    lever.rotation.x = i === 2 ? -0.5 : -0.15;
    g.add(lever);
    const gem = new THREE.Mesh(new THREE.SphereGeometry(0.035, 12, 10), toon(colors[key], { emissive: colors[key], emissiveIntensity: 0.8 }));
    gem.position.set(cx, 1.05, 0.08);
    g.add(gem);
  });

  const gear = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.03, 12), brassDeep());
  gear.rotation.x = Math.PI / 2;
  gear.position.set(0.58, 1.05, 0.07);
  g.add(gear);
  rig.gear = gear;
  for (let i = 0; i < 8; i++) {
    const tooth = addBox(g, 0.035, 0.07, 0.03, brass(), 0, 0, 0);
    const a = (i / 8) * Math.PI * 2;
    tooth.position.set(0.58 + Math.cos(a) * 0.18, 1.05 + Math.sin(a) * 0.18, 0.07);
    tooth.userData.tooth = true;
  }

  g.position.set(x, 0, z);
  parent.add(g);
}

function compass(parent, x, y, z) {
  const g = new THREE.Group();
  addCyl(g, 0.16, 0.16, 0.03, brass(), 0, 0.02, 0, 20);
  addCyl(g, 0.11, 0.11, 0.02, toon('#f4efe4'), 0, 0.04, 0, 20);
  const needle = addBox(g, 0.018, 0.01, 0.16, toon('#d15a42'), 0, 0.055, 0);
  needle.rotation.y = 0.2;
  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(0.12, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2),
    toon('#d5eef2', { transparent: true, opacity: 0.35, depthWrite: false, side: THREE.DoubleSide }),
  );
  dome.position.y = 0.045;
  g.add(dome);
  g.position.set(x, y, z);
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

  const rose = new THREE.Mesh(new THREE.CircleGeometry(0.48, 28), art(floorRose(), { glow: 0.25 }));
  rose.rotation.x = -Math.PI / 2;
  rose.position.set(0.4, 0.03, 2.45);
  rose.userData.shadow = 'none';
  g.add(rose);

  layStrip(g, layout.circulation);
  layStrip(g, layout.branch);

  sheet(g, tideChart(digits), a.easel.x, 0.86, a.easel.z + 0.3, 0.5, 0.86, 0, -0.18);
  const lightBar = addBox(g, 0.62, 0.04, 0.08, brass(), a.easel.x, 1.72, a.easel.z + 0.16);
  lightBar.userData.shadow = 'cast';
  addBox(g, 0.5, 0.02, 0.04, toon('#fff4d4', { emissive: '#fff4d4', emissiveIntensity: 0.9 }), a.easel.x, 1.69, a.easel.z + 0.2, { shadow: 'none' });

  sheet(g, keeperSlate(digits), a.slate.x, 0.95, a.slate.z + 0.2, 0.92, 0.6);
  sheet(g, deskLog(digits), -1.45, 0.785, -0.9, 0.36, 0.24, 0.2, -1.48, false);
  sheet(g, entryCard(), a.lectern.x, 1.08, a.lectern.z + 0.16, 0.3, 0.3, 0.5, 0.25);
  sheet(g, mapSheet(), a.table.x - 0.02, 0.77, a.table.z - 0.08, 0.34, 0.24, 0.15, -1.48, false);

  ORDER.forEach((key, i) => {
    const tag = new THREE.Mesh(
      new THREE.PlaneGeometry(0.16, 0.08),
      art(jarTag(NAMES[key], digits[key], colors[key]), { glow: 0.35 }),
    );
    tag.position.set(1.28 + i * 0.27, 0.86, 0.78);
    tag.rotation.x = -0.7;
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
  mechanism(g, a.panel.x, a.panel.z, digits, colors);
  compass(g, a.plinth.x, 0.8, a.plinth.z);

  foliage(g, -4.75, 3.35, 0.32);
  foliage(g, 4.55, 3.25, 0.32);

  addCyl(g, 0.045, 0.05, 0.08, toon('#24343c'), -0.95, 0.8, -0.7, 10);
  addBox(g, 0.012, 0.14, 0.012, toon('#c6a15b'), -0.98, 0.82, -0.66);

  const coil = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.035, 8, 18), toon('#8d5a32'));
  coil.rotation.x = Math.PI / 2;
  coil.position.set(-4.55, 0.05, -0.55);
  g.add(coil);

  return g;
}

function redrawDial(key, digit, color) {
  const slot = rig.dials[key];
  if (!slot) return;
  const image = dialFace(digit, color).image;
  // dialFace returns a texture; paint by replacing the map image via a fresh texture.
  slot.tex = dialFace(digit, color);
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
  const colors = layout.meta.puzzle.colors;
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
      redrawDial(key, slot.digit, api.layout.meta.puzzle.colors[key]);
      api.setStatus(statusFor(api.layout));
      return;
    }
  },
  onFrame(dt) {
    if (rig.gear) rig.gear.rotation.z += dt * 0.35;
  },
});
