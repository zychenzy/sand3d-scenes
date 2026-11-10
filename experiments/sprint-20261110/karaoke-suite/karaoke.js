import * as THREE from 'three';
import { boot, toon, addBox, addCyl, addContact } from './scene_lib.js';

const WOOD = '#6b4a34';
const BRASS = '#a8845a';

function makeTexture(w, h, draw) {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  draw(canvas.getContext('2d'), w, h);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  tex.needsUpdate = true;
  return tex;
}

function lyricTexture() {
  return makeTexture(1024, 576, (g) => {
    g.fillStyle = '#1b2636';
    g.fillRect(0, 0, 1024, 576);
    g.fillStyle = '#243246';
    g.fillRect(0, 0, 1024, 86);
    g.fillStyle = '#c46a78';
    g.fillRect(56, 26, 16, 36);
    g.fillStyle = '#f4f0e8';
    g.font = '600 40px sans-serif';
    g.fillText('SUITE  07', 156, 58);
    g.fillStyle = '#e7eef6';
    g.font = '500 84px sans-serif';
    g.fillText('your turn', 120, 292);
    g.fillStyle = '#a9b7c9';
    g.font = '400 34px sans-serif';
    g.fillText('verse two      ·      stay on the note', 120, 368);
    g.fillStyle = '#c46a78';
    g.fillRect(120, 448, 360, 12);
    g.fillStyle = '#31425a';
    g.fillRect(480, 448, 420, 12);
  });
}

function queueTexture() {
  return makeTexture(512, 320, (g) => {
    g.fillStyle = '#1c2430';
    g.fillRect(0, 0, 512, 320);
    g.fillStyle = '#c46a78';
    g.fillRect(0, 0, 512, 8);
    g.fillStyle = '#f4f0e8';
    g.font = '600 36px sans-serif';
    g.fillText('QUEUE', 28, 58);
    g.font = '400 28px sans-serif';
    g.fillStyle = '#d5deea';
    const rows = ['07    room light', '08    hold on', '09    last call'];
    rows.forEach((line, i) => g.fillText(line, 28, 120 + i * 52));
  });
}

function plaqueTexture() {
  return makeTexture(128, 128, (g) => {
    g.fillStyle = '#a8845a';
    g.fillRect(0, 0, 128, 128);
    g.fillStyle = '#2a2018';
    g.font = '700 64px sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText('07', 64, 68);
  });
}

function panel(parent, spec) {
  const grp = new THREE.Group();
  const depth = 0.055;
  addBox(grp, spec.w, spec.h, depth, toon(spec.color), 0, 0, 0);
  addBox(grp, spec.w + 0.028, spec.h + 0.028, 0.016, toon(WOOD), 0, 0, -depth * 0.62);
  grp.position.set(spec.x, spec.y, spec.z);
  grp.rotation.y = spec.rotY || 0;
  parent.add(grp);
}

function cloud(parent, spec) {
  addBox(parent, spec.w, 0.04, spec.d, toon(spec.color), spec.x, spec.y, spec.z);
  addBox(parent, spec.w + 0.03, 0.016, spec.d + 0.03, toon(WOOD), spec.x, spec.y - 0.022, spec.z);
}

function micHead(parent) {
  addCyl(parent, 0.016, 0.018, 0.16, toon('#2a2c30'), 0, 0.08, 0, 12);
  addCyl(parent, 0.02, 0.02, 0.03, toon('#1a1c20'), 0, 0.05, 0, 12);
  addCyl(parent, 0.034, 0.026, 0.07, toon('#3c4148'), 0, 0.19, 0, 14);
  for (let i = 0; i < 3; i++) {
    addCyl(parent, 0.035, 0.035, 0.007, toon('#c5ccd2'), 0, 0.172 + i * 0.014, 0, 14);
  }
  const led = addCyl(parent, 0.005, 0.005, 0.006, toon('#e07060', {
    emissive: '#e07060',
    emissiveIntensity: 0.9,
  }), 0, 0.118, 0.016, 8);
  led.userData.noShadow = true;
}

function tableMic(parent, spec, top) {
  const cradle = addBox(parent, 0.14, 0.025, 0.055, toon('#1c1e22'), spec.x, top + 0.012, spec.z);
  cradle.rotation.y = spec.rotY || 0;
  const outer = new THREE.Group();
  const inner = new THREE.Group();
  micHead(inner);
  inner.rotation.z = spec.tilt ?? -1.2;
  outer.add(inner);
  outer.position.set(spec.x, top + 0.02, spec.z);
  outer.rotation.y = spec.rotY || 0;
  parent.add(outer);
}

function standMic(parent, spec, floorY) {
  const grp = new THREE.Group();
  addCyl(grp, 0.14, 0.16, 0.028, toon('#1a1c20'), 0, 0.014, 0, 20);
  addCyl(grp, 0.012, 0.015, 0.86, toon('#2a2e34'), 0, 0.46, 0, 10);
  addCyl(grp, 0.022, 0.022, 0.04, toon(BRASS), 0, 0.9, 0, 10);
  const mic = new THREE.Group();
  micHead(mic);
  mic.position.set(0, 0.9, 0);
  mic.rotation.x = 0.62;
  grp.add(mic);
  grp.position.set(spec.x, floorY, spec.z);
  parent.add(grp);
}

function bottle(parent, x, y, z, h, color) {
  addCyl(parent, 0.038, 0.044, h * 0.7, toon(color), x, y + h * 0.35, z, 12);
  addCyl(parent, 0.015, 0.018, h * 0.28, toon(color), x, y + h * 0.7 + h * 0.12, z, 10);
  addCyl(parent, 0.018, 0.016, 0.012, toon('#d8d2c8'), x, y + h * 0.98, z, 8);
}

function makeShell(layout) {
  const g = new THREE.Group();
  g.name = 'shell';
  const { width: W, depth: D, height: H } = layout.meta.room;
  const s = layout.shell;
  const wood = toon(s.woodColor);
  const wall = toon(s.wallColor);
  const dado = toon(s.dadoColor);

  const floor = new THREE.Mesh(new THREE.BoxGeometry(W, 0.08, D), toon(s.floorColor));
  floor.position.y = -0.04;
  floor.receiveShadow = true;
  g.add(floor);
  for (const x of [-3.15, -1.55, 0.05, 1.65, 3.2]) {
    addBox(g, 0.012, 0.004, D - 0.2, toon(s.plankColor), x, 0.004, 0);
  }

  addBox(g, 6.2, 0.012, 2.98, toon(s.carpetEdge), 0, 0.01, 0.42);
  addBox(g, 5.92, 0.014, 2.7, toon(s.carpetColor), 0, 0.018, 0.42);

  const back = new THREE.Mesh(new THREE.BoxGeometry(W, H, 0.14), wall);
  back.position.set(0, H / 2, -D / 2);
  back.receiveShadow = true;
  g.add(back);
  const left = new THREE.Mesh(new THREE.BoxGeometry(0.14, H, D), wall);
  left.position.set(-W / 2, H / 2, 0);
  left.receiveShadow = true;
  g.add(left);

  addBox(g, W - 0.2, 0.82, 0.045, dado, 0, 0.41, -D / 2 + 0.09);
  addBox(g, 0.045, 0.82, 1.7, dado, -W / 2 + 0.09, 0.41, -1.85);
  addBox(g, 0.045, 0.82, 2.55, dado, -W / 2 + 0.09, 0.41, 0.15);
  addBox(g, W - 0.28, 0.045, 0.03, wood, 0, 0.84, -D / 2 + 0.1);
  addBox(g, 0.03, 0.045, 4.2, wood, -W / 2 + 0.1, 0.84, -0.55);
  addBox(g, 0.03, 0.045, 0.28, wood, -W / 2 + 0.1, 0.84, 2.58);
  addBox(g, W - 0.2, 0.09, 0.04, wood, 0, 0.045, -D / 2 + 0.09);
  addBox(g, 0.04, 0.09, 4.15, wood, -W / 2 + 0.09, 0.045, -0.55);
  addBox(g, 0.04, 0.09, 0.35, wood, -W / 2 + 0.09, 0.045, 2.55);
  addBox(g, W - 0.3, 0.035, 0.025, wood, 0, 2.32, -D / 2 + 0.09);
  addBox(g, 0.025, 0.035, D - 0.5, wood, -W / 2 + 0.09, 2.32, -0.1);

  const pier = addBox(g, 0.16, H, 1.28, wall, 3.78, H / 2, -2.16);
  pier.name = 'pier';
  addBox(g, 0.05, 0.09, 1.22, wood, 3.68, 0.045, -2.16);

  const stage = layout.build.stage;
  addBox(g, stage.w, stage.h, stage.d, toon(s.stageColor), stage.x, stage.h / 2, stage.z);
  addBox(g, stage.w - 0.12, 0.012, stage.d - 0.1, toon(s.matColor), stage.x, stage.h + 0.004, stage.z);
  addBox(g, stage.w, 0.012, 0.028, toon(s.brassColor), stage.x, stage.h + 0.002, stage.z + stage.d / 2);

  const soffitZ0 = -D / 2;
  const soffitZ1 = 1.38;
  const soffitD = soffitZ1 - soffitZ0;
  const soffit = new THREE.Mesh(new THREE.BoxGeometry(W, 0.08, soffitD), toon(s.ceilingColor));
  soffit.position.set(0, H - 0.04, (soffitZ0 + soffitZ1) / 2);
  g.add(soffit);

  const inset = 0.55;
  const beam = 0.18;
  const x0 = -W / 2 + inset;
  const x1 = W / 2 - inset;
  const z0 = soffitZ0 + inset;
  const z1 = soffitZ1 - inset;
  const beamY = H - 0.08 - 0.1;
  addBox(g, x1 - x0, 0.2, beam, toon(s.ceilingColor), 0, beamY, z0 + beam / 2);
  addBox(g, x1 - x0, 0.2, beam, toon(s.ceilingColor), 0, beamY, z1 - beam / 2);
  addBox(g, beam, 0.2, z1 - z0 - beam * 2, toon(s.ceilingColor), x0 + beam / 2, beamY, (z0 + z1) / 2);
  addBox(g, beam, 0.2, z1 - z0 - beam * 2, toon(s.ceilingColor), x1 - beam / 2, beamY, (z0 + z1) / 2);

  const coveMat = toon('#e4c59a', { emissive: '#e4c59a', emissiveIntensity: 0.55 });
  const coveY = H - 0.12;
  const innerX0 = x0 + beam + 0.02;
  const innerX1 = x1 - beam - 0.02;
  const innerZ0 = z0 + beam + 0.02;
  const innerZ1 = z1 - beam - 0.02;
  const cove = (w, d, x, z) => {
    const m = addBox(g, w, 0.025, d, coveMat, x, coveY, z);
    m.userData.noShadow = true;
  };
  cove(innerX1 - innerX0, 0.045, 0, innerZ0);
  cove(innerX1 - innerX0, 0.045, 0, innerZ1);
  cove(0.045, innerZ1 - innerZ0, innerX0, (innerZ0 + innerZ1) / 2);
  cove(0.045, innerZ1 - innerZ0, innerX1, (innerZ0 + innerZ1) / 2);

  const door = layout.build.door;
  addBox(g, 0.07, door.h, 0.08, wood, door.x, door.h / 2, door.z - door.w / 2);
  addBox(g, 0.07, door.h, 0.08, wood, door.x, door.h / 2, door.z + door.w / 2);
  addBox(g, 0.07, 0.08, door.w + 0.08, wood, door.x, door.h, door.z);
  addBox(g, 0.04, door.h - 0.08, door.w - 0.06, toon('#3a2c2a'), door.x + 0.03, (door.h - 0.08) / 2 + 0.02, door.z);
  addCyl(g, 0.012, 0.012, 0.08, toon(s.brassColor), door.x + 0.07, 1.05, door.z + door.w * 0.32, 8).rotation.z = Math.PI / 2;
  const plaque = addBox(g, 0.01, 0.16, 0.16, toon('#ffffff', { map: plaqueTexture() }), door.x + 0.055, 1.55, door.z - 0.12);
  plaque.userData.noShadow = true;

  return g;
}

function makeProcedural(layout) {
  const g = new THREE.Group();
  g.name = 'procedural';
  const b = layout.build;
  const s = layout.shell;
  const screen = b.screen;
  const tex = lyricTexture();
  addBox(g, 5.15, 1.85, 0.04, toon(s.baffleColor), 0, 1.55, screen.z - 0.08);
  addBox(g, screen.w + 0.14, 0.05, 0.05, toon(s.brassColor), screen.x, screen.y + screen.h / 2 + 0.035, screen.z - 0.01);
  addBox(g, screen.w + 0.14, 0.05, 0.05, toon(s.brassColor), screen.x, screen.y - screen.h / 2 - 0.035, screen.z - 0.01);
  addBox(g, 0.05, screen.h + 0.12, 0.05, toon(s.brassColor), screen.x - screen.w / 2 - 0.045, screen.y, screen.z - 0.01);
  addBox(g, 0.05, screen.h + 0.12, 0.05, toon(s.brassColor), screen.x + screen.w / 2 + 0.045, screen.y, screen.z - 0.01);
  const glow = addBox(
    g,
    screen.w + 0.22,
    screen.h + 0.22,
    0.015,
    toon('#8ea0b8', { emissive: '#8ea0b8', emissiveIntensity: 0.22 }),
    screen.x,
    screen.y,
    screen.z - 0.045,
  );
  glow.userData.noShadow = true;
  const face = new THREE.Mesh(
    new THREE.PlaneGeometry(screen.w, screen.h),
    toon('#ffffff', {
      map: tex,
      emissive: '#ffffff',
      emissiveMap: tex,
      emissiveIntensity: 0.5,
      fog: false,
    }),
  );
  face.position.set(screen.x, screen.y, screen.z + 0.04);
  face.userData.noShadow = true;
  g.add(face);

  for (const p of b.panels) panel(g, p);
  for (const c of b.clouds) cloud(g, c);

  for (const inst of layout.instances) {
    if (inst.kind !== 'speaker') continue;
    const [x, , z] = inst.position;
    addBox(g, 1.16, 0.32, 0.42, toon('#2a2422'), x, 0.16, z);
    addBox(g, 1.18, 0.028, 0.44, toon(WOOD), x, 0.334, z);
    addContact(g, x, z, 0.62, 0.28);
  }

  const c = b.credenza;
  addBox(g, c.depth - 0.08, 0.08, c.length - 0.08, toon('#241816'), c.x, 0.04, c.z);
  addBox(g, c.depth - 0.02, c.h - 0.14, c.length - 0.04, toon('#3a2c2a'), c.x, c.h * 0.46, c.z);
  addBox(g, c.depth + 0.04, 0.045, c.length + 0.03, toon(WOOD), c.x, c.h - 0.022, c.z);
  addBox(g, 0.01, c.h * 0.48, 0.012, toon('#241816'), c.x + c.depth / 2, c.h * 0.46, c.z);
  addContact(g, c.x, c.z, c.depth * 0.55, c.length * 0.48);

  bottle(g, c.x + 0.02, c.h, c.z + 0.28, 0.3, '#8a4e2e');
  bottle(g, c.x + 0.1, c.h, c.z + 0.36, 0.24, '#2c4a3c');
  const spines = ['#7d4d58', '#6a5a4c', '#4e3c4a', '#8a6844'];
  spines.forEach((color, i) => {
    addBox(g, 0.03, 0.2, 0.15, toon(color), c.x + 0.04, c.h + 0.1, c.z - 0.05 + i * 0.034);
  });

  const qtex = queueTexture();
  const queue = new THREE.Mesh(
    new THREE.PlaneGeometry(0.42, 0.26),
    toon('#ffffff', { map: qtex, emissive: '#ffffff', emissiveMap: qtex, emissiveIntensity: 0.4, fog: false }),
  );
  queue.position.set(-3.48, 1.0, -2.12);
  queue.rotation.y = Math.PI / 2;
  queue.userData.noShadow = true;
  g.add(queue);

  const sc = b.sconce;
  addBox(g, 0.08, 0.04, 0.1, toon(BRASS), sc.x, sc.y, sc.z);
  addCyl(g, 0.07, 0.05, 0.06, toon('#f0d2a4', { emissive: '#ffd8a8', emissiveIntensity: 0.85 }), sc.x + 0.08, sc.y, sc.z, 12);
  const shade = g.children[g.children.length - 1];
  shade.rotation.z = Math.PI / 2;
  shade.userData.noShadow = true;

  for (const mic of b.mics) {
    if (mic.type === 'stand') standMic(g, mic, b.stage.h);
    else tableMic(g, mic, b.tableTop);
  }
  addContact(g, b.mics[0].x, b.mics[0].z, 0.2, 0.2);

  const tablet = addBox(g, 0.28, 0.012, 0.2, toon('#1c2430'), 0.18, b.tableTop + 0.008, -0.3);
  tablet.userData.noShadow = true;

  addContact(g, 0, -0.32, 1.55, 0.7);
  addContact(g, 0, 1.17, 1.65, 0.55);
  addContact(g, -2.323, -0.46, 0.55, 0.95);
  addContact(g, 2.323, -0.46, 0.55, 0.95);

  return g;
}

boot({
  makeShell,
  makeProcedural,
  readyText: 'ready — karaoke suite · drag orbit · U unlit · T toon',
});
