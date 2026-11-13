import * as THREE from 'three';
import { boot, toon, addBox, addCyl } from './scene_lib.js';
import { rotationFor } from './orient.js';

const SPINE = ['#6e3b32', '#2f4a44', '#3d3a6a', '#8a6232', '#5a3040', '#2c4660', '#7a4a2a', '#3e5338', '#8d4d3a', '#314e68'];

function plankMap() {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = '#f4f4f4';
  g.fillRect(0, 0, 128, 128);
  let x = 0;
  let i = 0;
  while (x < 128) {
    const w = 18 + (i % 3) * 6;
    g.fillStyle = i % 2 === 0 ? '#ffffff' : '#ececec';
    g.fillRect(x, 0, w, 128);
    g.fillStyle = '#8a8a8a';
    g.fillRect(x, 0, 1, 128);
    x += w;
    i += 1;
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(10, 8);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function labelTexture(text, bg, fg, w = 256, h = 96) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const g = c.getContext('2d');
  g.fillStyle = bg;
  g.fillRect(0, 0, w, h);
  g.fillStyle = fg;
  g.font = `700 ${Math.round(h * 0.46)}px sans-serif`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(text, w / 2, h / 2 + 2);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function clockFace() {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = '#f7f1e6';
  g.beginPath();
  g.arc(128, 128, 126, 0, Math.PI * 2);
  g.fill();
  g.strokeStyle = '#2a2420';
  g.lineWidth = 4;
  g.stroke();
  g.fillStyle = '#8d3a3a';
  g.font = '700 22px sans-serif';
  g.textAlign = 'center';
  g.fillText('KCOM', 128, 78);
  g.fillStyle = '#5c4034';
  g.font = '600 14px sans-serif';
  g.fillText('NEWS', 128, 186);
  for (let i = 0; i < 60; i++) {
    const a = (i / 60) * Math.PI * 2 - Math.PI / 2;
    const inner = i % 5 === 0 ? 96 : 108;
    g.strokeStyle = i % 5 === 0 ? '#1c1916' : '#5c534c';
    g.lineWidth = i % 5 === 0 ? 3 : 1;
    g.beginPath();
    g.moveTo(128 + Math.cos(a) * inner, 128 + Math.sin(a) * inner);
    g.lineTo(128 + Math.cos(a) * 116, 128 + Math.sin(a) * 116);
    g.stroke();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function rundownTexture(title) {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 160;
  const g = c.getContext('2d');
  g.fillStyle = '#12343c';
  g.fillRect(0, 0, 256, 160);
  g.fillStyle = '#d7efe4';
  g.font = '700 18px sans-serif';
  g.fillText(title, 12, 24);
  const rows = ['00  OPEN / THEME', '04  NEWS DESK', '09  GUEST LIVE', '14  WEATHER', '18  COMMUNITY', '22  MUSIC BED'];
  g.font = '600 15px sans-serif';
  rows.forEach((row, i) => {
    g.fillStyle = i === 2 ? '#f0c36a' : '#9fd8c8';
    g.fillText(row, 12, 50 + i * 18);
  });
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function basic(map, color = '#ffffff') {
  const m = new THREE.MeshBasicMaterial({ map, color, toneMapped: false });
  return m;
}

function mark(mesh, opts = {}) {
  if (opts.cast === false) {
    mesh.castShadow = false;
    mesh.userData.noCast = true;
  }
  if (opts.receive === false) {
    mesh.receiveShadow = false;
    mesh.userData.noReceive = true;
  }
  if (opts.skip) mesh.userData.skipShade = true;
  if (opts.name) mesh.name = opts.name;
  return mesh;
}

function armBetween(g, a, b, r, mat) {
  const dir = new THREE.Vector3().subVectors(b, a);
  const len = dir.length();
  if (len < 1e-4) return;
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 0.92, len, 8), mat);
  mesh.position.copy(a).add(b).multiplyScalar(0.5);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
  mesh.castShadow = true;
  g.add(mesh);
}

function makeShell(layout) {
  const g = new THREE.Group();
  g.name = 'shell';
  const { width: W, depth: D, height: H } = layout.meta.room;
  const s = layout.shell;
  const wall = toon(s.wallColor);
  const wood = toon(s.woodColor);
  const woodL = toon(s.woodLight);

  const floor = new THREE.Mesh(
    new THREE.BoxGeometry(W, 0.08, D),
    toon(s.floorColor, { map: plankMap() })
  );
  floor.position.y = -0.04;
  floor.receiveShadow = true;
  floor.castShadow = false;
  floor.userData.noCast = true;
  g.add(floor);

  const back = addBox(g, W, H, 0.12, wall, 0, H / 2, -D / 2, { cast: false });
  back.receiveShadow = true;
  const left = addBox(g, 0.12, H, D, wall, -W / 2, H / 2, 0, { cast: false });
  left.receiveShadow = true;

  addBox(g, W - 0.16, 0.92, 0.05, woodL, 0, 0.46, -D / 2 + 0.08, { cast: false });
  addBox(g, 0.05, 0.92, D - 0.16, woodL, -W / 2 + 0.08, 0.46, 0, { cast: false });
  addBox(g, W - 0.12, 0.08, 0.06, wood, 0, 0.04, -D / 2 + 0.1, { cast: false });
  addBox(g, 0.06, 0.08, D - 0.12, wood, -W / 2 + 0.1, 0.04, 0, { cast: false });
  addBox(g, W - 0.2, 0.045, 0.04, wood, 0, 0.95, -D / 2 + 0.1, { cast: false });
  addBox(g, 0.04, 0.045, D - 0.2, wood, -W / 2 + 0.1, 0.95, 0, { cast: false });

  const ceil = new THREE.Mesh(
    new THREE.BoxGeometry(W * 0.98, 0.08, D * 0.62),
    toon(s.ceilingColor, { emissive: s.ceilingColor, emissiveIntensity: 0.55 })
  );
  ceil.position.set(0.15, H - 0.04, -D * 0.18);
  ceil.castShadow = false;
  ceil.userData.noCast = true;
  g.add(ceil);
  addBox(g, W * 0.98, 0.1, 0.08, wood, 0.15, H - 0.12, D * 0.13, { cast: false });

  const rug = layout.shell;
  const field = toon(rug.rugField, { polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 });
  const edge = toon(rug.rugEdge, { polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 });
  addBox(g, 1.05, 0.012, 1.05, edge, -1.9, 0.008, 0.12, { cast: false });
  addBox(g, 0.88, 0.014, 0.88, field, -1.9, 0.012, 0.12, { cast: false });
  const pr = toon(rug.producerRug, { polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 });
  addBox(g, 2.15, 0.012, 1.7, pr, 2.7, 0.008, -0.95, { cast: false });

  streetWindow(g, layout);
  slats(g, -W / 2 + 0.12, -0.15);
  fabricPanel(g, -2.75, 1.42, -D / 2 + 0.1);
  fabricPanel(g, -1.05, 1.42, -D / 2 + 0.1);
  return g;
}

function streetWindow(g, layout) {
  const s = layout.shell;
  const wood = toon(s.woodColor);
  const glass = toon('#d5e6ee', { transparent: true, opacity: 0.42, side: THREE.DoubleSide, depthWrite: false });
  const x = -4.45;
  const z = -layout.meta.room.depth / 2 + 0.1;
  const y = 1.7;
  addBox(g, 1.22, 1.42, 0.06, wood, x, y, z, { cast: false });
  addBox(g, 1.02, 1.22, 0.02, glass, x, y, z + 0.03, { cast: false, receive: false });
  addBox(g, 0.04, 1.22, 0.04, wood, x, y, z + 0.04, { cast: false });
  addBox(g, 1.02, 0.04, 0.04, wood, x, y, z + 0.04, { cast: false });
}

function slats(g, x, z0) {
  const wood = toon('#c4a27a');
  const dark = toon('#8d5a38');
  for (let i = 0; i < 14; i++) {
    const z = z0 - 0.7 + i * 0.09;
    addBox(g, 0.045, 1.15, 0.035, i % 2 ? wood : dark, x + 0.02, 1.7, z, { cast: false });
  }
  addBox(g, 0.05, 0.04, 1.3, toon('#6e4a30'), x + 0.02, 2.3, z0, { cast: false });
  addBox(g, 0.05, 0.04, 1.3, toon('#6e4a30'), x + 0.02, 1.1, z0, { cast: false });
}

function fabricPanel(g, x, y, z) {
  const wood = toon('#6e4a30');
  addBox(g, 0.78, 0.92, 0.04, wood, x, y, z, { cast: false });
  addBox(g, 0.66, 0.78, 0.02, toon('#8e3d45'), x, y, z + 0.02, { cast: false });
  addBox(g, 0.66, 0.015, 0.012, toon('#f0e2d2'), x, y + 0.12, z + 0.03, { cast: false });
  addBox(g, 0.66, 0.015, 0.012, toon('#f0e2d2'), x, y - 0.12, z + 0.03, { cast: false });
}

function partition(g, layout) {
  const p = layout.built.partition;
  const s = layout.shell;
  const wood = toon(s.woodColor);
  const plaster = toon(s.wallColor);
  const glassMat = toon('#c9ddd6', { transparent: true, opacity: 0.3, side: THREE.DoubleSide, depthWrite: false });
  const x = p.x;
  const [z0, zDoor0] = [p.z0, p.door[0]];
  const zDoor1 = p.door[1];
  const z1 = p.z1;
  const [gy0, gy1] = p.glassY;
  const solidZ = (z0 + zDoor0) / 2;
  const solidD = zDoor0 - z0;
  addBox(g, 0.1, 0.92, solidD, plaster, x, 0.46, solidZ, { cast: false });
  addBox(g, 0.14, 0.045, solidD, wood, x, 0.92, solidZ, { cast: false });

  const glassD = z1 - z0;
  addBox(g, 0.025, gy1 - gy0, glassD, glassMat, x, (gy0 + gy1) / 2, (z0 + z1) / 2, { cast: false, receive: false });
  addBox(g, 0.06, 0.05, glassD + 0.04, wood, x, gy1, (z0 + z1) / 2, { cast: false });
  addBox(g, 0.05, 0.04, glassD, wood, x, gy0, (z0 + z1) / 2, { cast: false });
  for (let z = z0 + 0.35; z < z1; z += 0.72) {
    addBox(g, 0.045, gy1 - gy0, 0.04, wood, x, (gy0 + gy1) / 2, z, { cast: false });
  }
  addBox(g, 0.08, 2.2, 0.08, wood, x, 1.1, z0, { cast: false });
  addBox(g, 0.08, 2.2, 0.08, wood, x, 1.1, zDoor0, { cast: false });
  addBox(g, 0.08, 2.2, 0.08, wood, x, 1.1, zDoor1, { cast: false });
  addBox(g, 0.08, 0.08, zDoor1 - zDoor0, wood, x, 2.16, (zDoor0 + zDoor1) / 2, { cast: false });

  const door = new THREE.Group();
  addBox(door, 0.04, 2.02, 0.8, wood, 0, 1.02, 0.4, { cast: false });
  addBox(door, 0.012, 0.72, 0.58, toon('#a56b42'), 0.02, 0.55, 0.4, { cast: false });
  addBox(door, 0.015, 0.42, 0.32, glassMat, 0.026, 1.45, 0.4, { cast: false, receive: false });
  addCyl(door, 0.012, 0.012, 0.06, toon('#d9d0c4'), 0.04, 1.02, 0.62, 8, { cast: false });
  door.position.set(x + 0.04, 0, zDoor0);
  door.rotation.y = 0.7;
  g.add(door);

  cueStack(g, x - 0.07, 1.72, -1.35);
  const onAir = new THREE.Mesh(
    new THREE.PlaneGeometry(0.42, 0.12),
    basic(labelTexture('ON AIR', '#9d1c22', '#ffe7d0'))
  );
  onAir.position.set(x - 0.05, 2.32, (zDoor0 + zDoor1) / 2);
  onAir.rotation.y = -Math.PI / 2;
  mark(onAir, { skip: true, cast: false, receive: false });
  g.add(onAir);
}

function cueStack(g, x, y, z) {
  addBox(g, 0.06, 0.42, 0.22, toon('#3a322c'), x, y, z, { cast: false });
  const lamps = [
    ['#e0b15a', 0.1],
    ['#e23b3b', 0],
    ['#5c6a72', -0.1],
  ];
  lamps.forEach(([color, dy], i) => {
    const lit = i < 2;
    addBox(
      g, 0.02, 0.055, 0.12,
      toon(color, lit ? { emissive: color, emissiveIntensity: 0.7 } : {}),
      x - 0.03, y + dy, z,
      { cast: false }
    );
  });
}

function swivelChair(g, inst) {
  const chair = new THREE.Group();
  const base = toon('#2a2420');
  const metal = toon('#8a8178');
  const pad = toon('#3e4650');
  const padDark = toon('#2c333b');
  addCyl(chair, 0.04, 0.04, 0.03, metal, 0, 0.045, 0, 10);
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    const leg = addBox(chair, 0.032, 0.016, 0.24, base, Math.sin(a) * 0.12, 0.036, Math.cos(a) * 0.12);
    leg.rotation.y = a;
    addCyl(chair, 0.016, 0.016, 0.018, metal, Math.sin(a) * 0.24, 0.014, Math.cos(a) * 0.24, 8);
  }
  addCyl(chair, 0.026, 0.02, 0.34, metal, 0, 0.22, 0, 10);
  addBox(chair, 0.46, 0.065, 0.42, pad, 0, 0.44, 0.02);
  addBox(chair, 0.4, 0.4, 0.055, padDark, 0, 0.72, -0.16);
  addBox(chair, 0.05, 0.03, 0.2, pad, -0.23, 0.54, 0.02);
  addBox(chair, 0.05, 0.03, 0.2, pad, 0.23, 0.54, 0.02);
  chair.position.set(inst.position[0], inst.position[1], inst.position[2]);
  chair.rotation.y = inst.rotationY || 0;
  g.add(chair);
}

function desk(g, spec, topColor) {
  const [x, , z] = spec.position;
  const [w, h, d] = spec.size;
  const wood = toon('#6b4630');
  const top = toon(topColor || '#a56b42');
  addBox(g, w, 0.045, d, top, x, h - 0.02, z);
  addBox(g, w - 0.08, 0.08, d - 0.08, wood, x, h - 0.08, z);
  const legs = [
    [-w / 2 + 0.06, -d / 2 + 0.06],
    [w / 2 - 0.06, -d / 2 + 0.06],
    [-w / 2 + 0.06, d / 2 - 0.06],
    [w / 2 - 0.06, d / 2 - 0.06],
  ];
  for (const [lx, lz] of legs) {
    addBox(g, 0.06, h - 0.08, 0.06, wood, x + lx, (h - 0.08) / 2, z + lz);
  }
}

function broadcastMixer(g, layout) {
  const spec = layout.built.mixer;
  const ctl = layout.built.controls;
  const grp = new THREE.Group();
  const [w, , d] = spec.size;
  const chassis = toon('#2e333b');
  const plate = toon('#3c424c');
  const well = toon('#1c2026');
  addBox(grp, w, 0.05, d, chassis, 0, 0.025, 0);
  addBox(grp, w - 0.04, 0.012, d - 0.04, plate, 0, 0.052, 0.01);
  addBox(grp, w - 0.08, 0.055, 0.07, chassis, 0, 0.09, -d / 2 + 0.08);

  const [fw, fh, fd] = ctl.faderCap;
  const pitch = 0.1;
  const x0 = -((ctl.channels - 1) * pitch) / 2;
  const travel = [0.012, 0.028, 0.006, 0.04, 0.018, 0.033, 0.01, 0.024];
  const caps = ['#f3efe6', '#f3efe6', '#d24b45', '#f3efe6', '#e0b15a', '#f3efe6', '#f3efe6', '#d24b45'];
  for (let i = 0; i < ctl.channels; i++) {
    const fx = x0 + i * pitch;
    addBox(grp, 0.008, 0.006, 0.11, well, fx, 0.06, 0.06);
    const cap = addBox(grp, fw, fh, fd, toon(caps[i]), fx, 0.074, 0.02 + travel[i], { name: 'fader-cap' });
    cap.name = 'fader-cap';
    addCyl(grp, ctl.knobRadius, ctl.knobRadius * 1.05, ctl.knobHeight, toon('#e7e1d6'), fx, 0.068, -0.08, 10, { name: 'knob-cap' });
    const tick = addBox(grp, 0.002, 0.006, 0.006, toon('#2a2420'), fx, 0.076, -0.08, { cast: false });
    tick.name = 'knob-cap';
    const [bw, bh, bd] = ctl.button;
    addBox(grp, bw, bh, bd, toon(i === 2 ? '#d24b45' : '#ded6cc'), fx - 0.012, 0.064, -0.15, { name: 'cue-key' });
    addBox(grp, bw, bh, bd, toon('#bfd7c8'), fx + 0.012, 0.064, -0.15, { name: 'cue-key' });
    for (let s = 0; s < 4; s++) {
      const col = s === 3 ? '#e07a55' : '#8ee0a8';
      addBox(
        grp, 0.012, 0.008, 0.006,
        toon(col, { emissive: col, emissiveIntensity: 0.55 }),
        fx, 0.078 + s * 0.012, -d / 2 + 0.09,
        { cast: false }
      );
    }
  }

  const screen = new THREE.Mesh(
    new THREE.PlaneGeometry(0.22, 0.055),
    basic(rundownTexture('BOARD'))
  );
  screen.position.set(0.28, 0.1, -d / 2 + 0.1);
  mark(screen, { skip: true, cast: false, receive: false });
  grp.add(screen);

  grp.position.set(spec.position[0], spec.position[1], spec.position[2]);
  g.add(grp);
}

function boomMic(g, mic) {
  const metal = toon('#5e656e');
  const dark = toon('#1c2026');
  const meshTone = toon('#2a3038');
  const base = new THREE.Vector3(...mic.base);
  const cap = new THREE.Vector3(...mic.capsule);
  const mouth = new THREE.Vector3(...mic.mouth);
  const aim = mouth.clone().sub(cap).normalize();

  addBox(g, 0.05, 0.01, 0.06, metal, base.x, base.y + 0.005, base.z);
  const knuckle = base.clone();
  knuckle.y += 0.07;
  armBetween(g, base.clone().setY(base.y + 0.01), knuckle, 0.007, metal);
  addCyl(g, 0.011, 0.011, 0.012, metal, knuckle.x, knuckle.y, knuckle.z, 8);

  const tail = cap.clone().addScaledVector(aim, -0.055);
  const elbow = knuckle.clone().lerp(tail, 0.5);
  elbow.y = Math.max(knuckle.y, tail.y) + 0.02;
  armBetween(g, knuckle, elbow, 0.0065, metal);
  addCyl(g, 0.01, 0.01, 0.01, metal, elbow.x, elbow.y, elbow.z, 8);
  armBetween(g, elbow, tail, 0.0055, metal);

  const body = new THREE.Group();
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.022, 0.078, 14), dark);
  barrel.castShadow = true;
  body.add(barrel);
  const grille = new THREE.Mesh(new THREE.SphereGeometry(0.026, 14, 12), meshTone);
  grille.position.y = 0.046;
  grille.castShadow = true;
  body.add(grille);
  const band = new THREE.Mesh(new THREE.TorusGeometry(0.016, 0.0025, 6, 12), toon('#8d3a3a'));
  band.rotation.x = Math.PI / 2;
  band.position.y = 0.012;
  body.add(band);
  body.position.copy(cap);
  body.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), aim);
  g.add(body);

  const flag = new THREE.Mesh(
    new THREE.PlaneGeometry(0.048, 0.026),
    basic(labelTexture('KCOM', '#1f3a5f', '#f4efe6', 128, 64))
  );
  flag.position.copy(cap).addScaledVector(aim, -0.01);
  flag.position.y -= 0.038;
  flag.lookAt(mouth);
  mark(flag, { skip: true, cast: false, receive: false });
  g.add(flag);
}

function newsClock(g, spec) {
  const [x, y, z] = spec.position;
  const r = spec.radius;
  const bezel = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.045, 40), toon('#5c4034'));
  bezel.rotation.x = Math.PI / 2;
  bezel.position.set(x, y, z);
  bezel.castShadow = true;
  g.add(bezel);
  const rim = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.92, r * 0.92, 0.02, 40), toon('#2a2420'));
  rim.rotation.x = Math.PI / 2;
  rim.position.set(x, y, z + 0.02);
  rim.userData.noCast = true;
  g.add(rim);
  const face = new THREE.Mesh(new THREE.CircleGeometry(r * 0.84, 40), basic(clockFace()));
  face.position.set(x, y, z + 0.034);
  mark(face, { skip: true, cast: false, receive: false });
  g.add(face);

  const hands = new THREE.Group();
  hands.position.set(x, y, z + 0.04);
  const hour = addBox(hands, 0.012, r * 0.42, 0.006, toon('#1c1916'), 0, r * 0.16, 0, { cast: false });
  hour.position.y = r * 0.16;
  const minute = addBox(hands, 0.008, r * 0.62, 0.005, toon('#1c1916'), 0, r * 0.26, 0.002, { cast: false });
  const second = addBox(hands, 0.004, r * 0.7, 0.004, toon('#c43832', { emissive: '#c43832', emissiveIntensity: 0.4 }), 0, r * 0.28, 0.004, { cast: false });
  hour.rotation.z = -5.15;
  const hourPivot = new THREE.Group();
  hourPivot.add(hour);
  hourPivot.rotation.z = -5.15;
  hour.rotation.z = 0;
  hands.add(hourPivot);
  const minPivot = new THREE.Group();
  minute.position.set(0, r * 0.26, 0.002);
  minPivot.add(minute);
  minPivot.rotation.z = -Math.PI / 3;
  hands.add(minPivot);
  const secPivot = new THREE.Group();
  second.position.set(0, r * 0.28, 0.004);
  secPivot.add(second);
  secPivot.rotation.z = -210 * Math.PI / 180;
  hands.add(secPivot);
  g.add(hands);
  addCyl(g, 0.012, 0.012, 0.012, toon('#8d3a3a'), x, y, z + 0.05, 10, { cast: false });
}

function cartRack(g, spec) {
  const [x, , z] = spec.position;
  const wood = toon('#6b4630');
  const dark = toon('#3a322c');
  addBox(g, 0.28, 0.92, 0.46, wood, x, 0.46, z);
  addBox(g, 0.32, 0.03, 0.5, toon('#8d5a38'), x, 0.93, z);
  for (let col = 0; col < 2; col++) {
    for (let row = 0; row < 5; row++) {
      const cz = z + (col - 0.5) * 0.18;
      const cy = 0.16 + row * 0.15;
      addBox(g, 0.16, 0.01, 0.14, dark, x + 0.02, cy, cz);
      const cart = addBox(
        g, 0.016, 0.055, 0.11,
        toon(SPINE[(col * 5 + row) % SPINE.length]),
        x + 0.16, cy + 0.045, cz
      );
      cart.rotation.z = -0.55;
    }
  }
}

function phoneTable(g, spec) {
  desk(g, { position: spec.position, size: spec.size }, '#c4a27a');
  const [x, , z] = spec.position;
  const y = spec.size[1];
  addBox(g, 0.16, 0.035, 0.1, toon('#2e333b'), x - 0.08, y + 0.02, z);
  addBox(g, 0.045, 0.02, 0.09, toon('#1c2026'), x + 0.02, y + 0.02, z + 0.04);
  addCyl(g, 0.012, 0.012, 0.11, toon('#3a3e46'), x + 0.08, y + 0.07, z - 0.02, 8);
  addBox(g, 0.14, 0.008, 0.18, toon('#f7f1e6'), x + 0.1, y + 0.01, z - 0.02);
}

function headphones(parent, x, y, z, yaw) {
  const g = new THREE.Group();
  const band = toon('#1c1e24');
  const cup = toon('#3a3e46');
  const pad = toon('#6a4038');
  addBox(g, 0.16, 0.014, 0.016, band, 0, 0.08, 0);
  addBox(g, 0.014, 0.06, 0.016, band, -0.07, 0.05, 0);
  addBox(g, 0.014, 0.06, 0.016, band, 0.07, 0.05, 0);
  addBox(g, 0.04, 0.055, 0.022, cup, -0.07, 0.025, 0);
  addBox(g, 0.04, 0.055, 0.022, cup, 0.07, 0.025, 0);
  addBox(g, 0.026, 0.038, 0.008, pad, -0.07, 0.025, 0.012);
  addBox(g, 0.026, 0.038, 0.008, pad, 0.07, 0.025, 0.012);
  g.position.set(x, y, z);
  g.rotation.y = yaw;
  parent.add(g);
}

function cartDeck(g, x, y, z) {
  const chassis = toon('#2e333b');
  addBox(g, 0.34, 0.09, 0.26, chassis, x, y + 0.045, z);
  for (let i = 0; i < 3; i++) {
    const cx = x - 0.09 + i * 0.09;
    addBox(g, 0.07, 0.045, 0.012, toon('#1c2026'), cx, y + 0.07, z + 0.12);
    addBox(g, 0.06, 0.032, 0.02, toon(SPINE[i + 3]), cx, y + 0.07, z + 0.1);
    addCyl(g, 0.008, 0.008, 0.008, toon(i === 0 ? '#e0b15a' : '#ded6cc'), cx, y + 0.1, z - 0.02, 8, { name: 'cue-key' });
  }
}

function gearRack(g, spec) {
  const [x, , z] = spec.position;
  const [w, h, d] = spec.size;
  addBox(g, w, h, d, toon('#3a322c'), x, h / 2, z);
  addBox(g, w + 0.02, 0.03, d + 0.02, toon('#2a2420'), x, h - 0.01, z);
  for (let row = 0; row < 6; row++) {
    const y = 0.22 + row * 0.2;
    addBox(g, w - 0.08, 0.14, 0.02, toon(row % 2 ? '#4a4038' : '#2e333b'), x, y, z + d / 2);
    if (row < 4) {
      for (let k = 0; k < 4; k++) {
        addCyl(g, 0.012, 0.013, 0.012, toon('#e7e1d6'), x - 0.18 + k * 0.12, y, z + d / 2 + 0.012, 8, { cast: false });
      }
    } else {
      for (let k = 0; k < 8; k++) {
        addCyl(g, 0.008, 0.008, 0.01, toon('#c5ccd3'), x - 0.24 + k * 0.07, y, z + d / 2 + 0.01, 6, { cast: false });
      }
    }
  }
  addBox(g, 0.03, 0.03, 0.01, toon('#e23b3b', { emissive: '#e23b3b', emissiveIntensity: 0.7 }), x + 0.22, 1.25, z + d / 2 + 0.01, { cast: false });
}

function corkBoard(g, x, y, z) {
  addBox(g, 0.7, 0.5, 0.03, toon('#6e4a30'), x, y, z, { cast: false });
  addBox(g, 0.62, 0.42, 0.012, toon('#d7b56a'), x, y, z + 0.02, { cast: false });
  const cards = ['#f7f1e6', '#f0c36a', '#e7d0c8', '#d5e6ee'];
  cards.forEach((color, i) => {
    addBox(g, 0.12, 0.09, 0.006, toon(color), x - 0.2 + (i % 4) * 0.14, y + (i % 2 ? 0.08 : -0.08), z + 0.03, { cast: false });
  });
}

function speakerGrille(g, inst) {
  const dx = inst.lookAt[0] - inst.position[0];
  const dz = inst.lookAt[1] - inst.position[2];
  const yaw = Math.atan2(dx, dz);
  const mesh = new THREE.Mesh(new THREE.CircleGeometry(0.04, 16), toon('#e6d9cc'));
  mesh.position.set(
    inst.position[0] + Math.sin(yaw) * 0.07,
    inst.position[1] + 0.08,
    inst.position[2] + Math.cos(yaw) * 0.07
  );
  mesh.rotation.y = yaw;
  mesh.castShadow = false;
  mesh.userData.noCast = true;
  g.add(mesh);
}

function screenPlane(g, inst, tex) {
  const dx = inst.lookAt[0] - inst.position[0];
  const dz = inst.lookAt[1] - inst.position[2];
  const yaw = Math.atan2(dx, dz);
  const fx = Math.sin(yaw);
  const fz = Math.cos(yaw);
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(0.24, 0.14), basic(tex));
  mesh.position.set(inst.position[0] + fx * 0.02, inst.position[1] + 0.16, inst.position[2] + fz * 0.02);
  mesh.rotation.y = yaw;
  mark(mesh, { skip: true, cast: false, receive: false });
  g.add(mesh);
}

function records(g, shelf) {
  const [x, y, z] = shelf.position;
  for (let level = 0; level < 2; level++) {
    const hy = y + (level === 0 ? 0.22 : 0.58);
    for (let i = 0; i < 8; i++) {
      const rec = addBox(
        g, 0.02, 0.2, 0.2,
        toon(SPINE[(i + level * 3) % SPINE.length]),
        x - 0.22 + i * 0.06, hy, z + 0.02
      );
      if (i === 5) rec.rotation.z = 0.18;
    }
  }
}

function stationSign(g, x, y, z) {
  addBox(g, 0.78, 0.22, 0.03, toon('#5c4034'), x, y, z, { cast: false });
  const face = new THREE.Mesh(
    new THREE.PlaneGeometry(0.7, 0.15),
    basic(labelTexture('KCOM  91.3', '#5c4034', '#f7f1e6', 320, 96))
  );
  face.position.set(x, y, z + 0.02);
  mark(face, { skip: true, cast: false, receive: false });
  g.add(face);
}

function flyerStack(g, x, z) {
  for (let i = 0; i < 4; i++) {
    addBox(g, 0.28, 0.012, 0.2, toon(i % 2 ? '#f7f1e6' : '#e7d0c8'), x, 0.02 + i * 0.014, z, { cast: false });
  }
}

function cable(g) {
  addBox(g, 0.35, 0.008, 0.016, toon('#4a4038'), -1.15, 0.01, -0.7, { cast: false });
}

function makeProcedural(layout) {
  const g = new THREE.Group();
  g.name = 'procedural';
  partition(g, layout);
  for (const inst of layout.instances) {
    if (inst.role === 'seat') swivelChair(g, inst);
  }
  desk(g, layout.built.desk, '#a56b42');
  desk(g, layout.built.producerDesk, '#8d5a38');
  broadcastMixer(g, layout);
  cartDeck(g, -2.9, 0.74, -1.68);
  for (const mic of layout.mics) boomMic(g, mic);
  newsClock(g, layout.built.clock);
  cartRack(g, layout.built.cartRack);
  phoneTable(g, layout.built.phoneTable);
  gearRack(g, layout.built.rack);
  corkBoard(g, 4.15, 1.7, -3.72);
  stationSign(g, -3.55, 2.42, -layout.meta.room.depth / 2 + 0.1);
  flyerStack(g, -2.55, 1.55);
  cable(g);
  headphones(g, -1.62, 0.78, -0.95, 0.4);
  headphones(g, -2.15, 0.78, -1.88, 1.2);
  headphones(g, 2.35, 0.78, -0.62, -1.4);
  const hostMon = layout.instances.find((i) => i.id === 'mon_host');
  const p1 = layout.instances.find((i) => i.id === 'mon_prod_l');
  const p2 = layout.instances.find((i) => i.id === 'mon_prod_r');
  screenPlane(g, hostMon, rundownTexture('ON AIR'));
  screenPlane(g, p1, rundownTexture('CUE'));
  screenPlane(g, p2, rundownTexture('PROD'));
  for (const id of ['spk_l', 'spk_r']) speakerGrille(g, layout.instances.find((i) => i.id === id));
  for (const id of ['shelf_l', 'shelf_r']) records(g, layout.instances.find((i) => i.id === id));
  addBox(g, 0.22, 0.01, 0.16, toon('#f7f1e6'), -1.7, 0.75, -0.88);
  addBox(g, 0.16, 0.008, 0.12, toon('#e7d0c8'), -1.68, 0.758, -0.86);
  return g;
}

boot({
  makeShell,
  makeProcedural,
  transformLayout(layout) {
    for (const inst of layout.instances) {
      if (inst.lookAt && inst.modelForward) {
        inst.rotationY = rotationFor(inst.modelForward, inst.position, inst.lookAt);
      }
    }
  },
  preparePrototype(kind, root) {
    root.traverse((o) => {
      if (!o.isMesh) return;
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      for (const m of mats) {
        if (!m?.color) continue;
        if (kind === 'monitor' && (o.name || '').includes('curved_screen')) {
          m.color.set('#16343c');
          m.userData.glow = { color: '#1d4a52', intensity: 0.45 };
        } else if (kind === 'monitor' && m.color.r < 0.05 && m.color.g < 0.05 && m.color.b < 0.05) {
          m.color.set('#4a4e55');
        } else if (kind === 'speaker' && m.color.r < 0.05) {
          m.color.set('#3a3e46');
        } else if (kind === 'pendant_lamp' && (o.name || '').includes('bulb')) {
          m.color.set('#ffe6c2');
          m.userData.glow = { color: '#ffd7a4', intensity: 0.9 };
        }
      }
    });
  },
  readyText: 'ready — KCOM on air · drag orbit · U unlit · T toon',
});
