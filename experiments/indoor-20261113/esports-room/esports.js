import * as THREE from 'three';
import { boot, toon, addBox, addCyl, addPlane, canvasTex, quiet } from './scene_lib.js';

const FONT = 'DejaVu Sans, Liberation Sans, sans-serif';

function eachMat(root, fn) {
  root.traverse((o) => {
    if (!o.isMesh) return;
    const mats = Array.isArray(o.material) ? o.material : [o.material];
    mats.forEach((m) => { if (m) fn(m, o); });
  });
}

function tuneAsset(kind, root) {
  if (kind === 'monitor' || kind === 'tv') {
    eachMat(root, (m) => {
      if (!m.color) return;
      const c = m.color;
      if (c.r < 0.012 && c.g < 0.012 && c.b < 0.012) c.set('#3c434b');
      else if (c.r < 0.05 && c.g < 0.05 && c.b < 0.05) c.set('#2e353c');
    });
  }
  if (kind === 'speaker') {
    eachMat(root, (m) => {
      if (!m.color) return;
      if (m.color.r < 0.08) m.color.set('#6a727c');
    });
  }
  if (kind === 'flowerpot') {
    eachMat(root, (m) => { if (m.color) m.color.set('#a36b4a'); });
  }
  if (kind === 'pendant_lamp') {
    eachMat(root, (m, o) => {
      const n = `${o.name || ''} ${(o.parent && o.parent.name) || ''}`;
      if (!m.color) return;
      if (n.includes('bulb')) {
        m.color.set('#fff6d8');
        m.emissive = new THREE.Color('#ffd7a0');
        m.emissiveIntensity = 1.15;
      } else if (m.color.r < 0.02 && m.color.g < 0.02) {
        m.color.set('#5a4c40');
      }
    });
  }
}

function screenMat(tex) {
  return toon('#f4f7f6', {
    map: tex,
    emissive: '#ffffff',
    emissiveMap: tex,
    emissiveIntensity: 0.28,
    side: THREE.DoubleSide,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
  });
}

function playerScreen(role, accent) {
  return canvasTex(640, 360, (ctx, w, h) => {
    ctx.fillStyle = '#1c3e44';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#142e33';
    ctx.fillRect(0, 0, w, 48);
    ctx.fillStyle = '#f3ecdf';
    ctx.font = `700 28px ${FONT}`;
    ctx.fillText(role, 22, 34);
    ctx.font = `16px ${FONT}`;
    ctx.fillStyle = '#d5e4e1';
    ctx.fillText('SCRIM  ·  LIVE', 120, 32);
    ctx.fillStyle = accent;
    ctx.fillRect(22, 70, 280, 22);
    ctx.fillStyle = '#0e2428';
    ctx.fillRect(26, 74, 190, 14);
    ctx.fillStyle = '#e7f2ef';
    ctx.fillRect(300, 78, 70, 28);
    ctx.fillRect(382, 78, 70, 28);
    ctx.fillRect(464, 78, 70, 28);
    ctx.fillRect(546, 78, 70, 28);
    ctx.fillStyle = accent;
    ctx.fillRect(300, 78, 70, 6);
    ctx.fillStyle = '#24555c';
    ctx.beginPath();
    ctx.arc(500, 230, 78, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#e7d3a8';
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.moveTo(450, 250);
    ctx.lineTo(500, 190);
    ctx.lineTo(555, 240);
    ctx.stroke();
    ctx.fillStyle = '#f3ecdf';
    ctx.fillRect(40, 250, 18, 70);
    ctx.fillRect(70, 220, 18, 100);
    ctx.fillRect(100, 270, 18, 50);
    ctx.fillStyle = '#c4a574';
    ctx.fillRect(40, 292, 78, 8);
  });
}

function coachScreen() {
  return canvasTex(640, 360, (ctx, w, h) => {
    ctx.fillStyle = '#243044';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#1a2436';
    ctx.fillRect(0, 0, w, 46);
    ctx.fillStyle = '#f3ecdf';
    ctx.font = `700 24px ${FONT}`;
    ctx.fillText('COACH  ·  ROUND TAPE', 18, 32);
    const bars = [0.35, 0.62, 0.48, 0.8, 0.55, 0.7];
    bars.forEach((t, i) => {
      const x = 36 + i * 96;
      ctx.fillStyle = '#31445c';
      ctx.fillRect(x, 80, 70, 220);
      ctx.fillStyle = i === 3 ? '#c4a574' : '#7fbfb4';
      ctx.fillRect(x, 80 + 220 * (1 - t), 70, 220 * t);
    });
    ctx.fillStyle = '#f3ecdf';
    ctx.font = `16px ${FONT}`;
    ctx.fillText('R1  R2  R3  R4  R5  R6', 48, 330);
  });
}

function replayTex() {
  return canvasTex(1024, 576, (ctx, w, h) => {
    ctx.fillStyle = '#1a4548';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#123436';
    ctx.fillRect(0, 0, w, 72);
    ctx.fillStyle = '#f4efe6';
    ctx.font = `700 40px ${FONT}`;
    ctx.fillText('NORTH PIT', 36, 48);
    ctx.font = `22px ${FONT}`;
    ctx.fillStyle = '#d5e6e2';
    ctx.fillText('SCRIM REPLAY', 280, 46);
    ctx.font = `700 36px ${FONT}`;
    ctx.fillStyle = '#f4efe6';
    ctx.fillText('14:22', 860, 50);
    ctx.fillStyle = '#c4a574';
    ctx.fillRect(70, 140, 880, 28);
    ctx.fillRect(70, 270, 880, 28);
    ctx.fillRect(70, 400, 880, 28);
    ctx.fillStyle = '#2f6a62';
    ctx.fillRect(180, 180, 160, 70);
    ctx.fillRect(640, 310, 180, 70);
    ctx.fillStyle = '#8a4e5a';
    ctx.beginPath();
    ctx.arc(520, 300, 46, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#f4efe6';
    ctx.font = `700 28px ${FONT}`;
    ctx.fillText('8', 70, 530);
    ctx.fillText('6', 140, 530);
    ctx.font = `20px ${FONT}`;
    ctx.fillStyle = '#d5e6e2';
    ctx.fillText('PAUSE    01:12:04    BARON PIT', 240, 528);
  });
}

function draftTex() {
  return canvasTex(480, 860, (ctx, w, h) => {
    ctx.fillStyle = '#1c3340';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#f4efe6';
    ctx.font = `700 36px ${FONT}`;
    ctx.fillText('DRAFT', 28, 56);
    ctx.font = `20px ${FONT}`;
    ctx.fillStyle = '#d5e6e2';
    ctx.fillText('BLUE', 28, 100);
    ctx.fillText('RED', 260, 100);
    const blue = ['ASH', 'BRICK', 'NORTH', 'REED', 'JUNO'];
    const red = ['KITE', 'MOOR', 'SALT', 'PELT', 'WREN'];
    blue.forEach((name, i) => {
      ctx.fillStyle = '#3f6f68';
      ctx.fillRect(24, 130 + i * 120, 190, 90);
      ctx.fillStyle = '#f4efe6';
      ctx.font = `700 28px ${FONT}`;
      ctx.fillText(name, 40, 184 + i * 120);
    });
    red.forEach((name, i) => {
      ctx.fillStyle = '#8a4e5a';
      ctx.fillRect(250, 130 + i * 120, 190, 90);
      ctx.fillStyle = '#f4efe6';
      ctx.font = `700 28px ${FONT}`;
      ctx.fillText(name, 268, 184 + i * 120);
    });
  });
}

function roleTex(role, accent) {
  return canvasTex(256, 64, (ctx, w, h) => {
    ctx.fillStyle = '#2a3036';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = accent;
    ctx.fillRect(0, 0, 10, h);
    ctx.fillStyle = '#f4efe6';
    ctx.font = `700 32px ${FONT}`;
    ctx.fillText(role, 24, 44);
  });
}

const ROLES = {
  top: ['TOP', '#c4a574'],
  jg: ['JG', '#3f6f68'],
  mid: ['MID', '#8a4e5a'],
  adc: ['ADC', '#4d6a8a'],
  sup: ['SUP', '#a6846a'],
};

let replayTexture;
let draftTexture;
const screenCache = {};

function textureFor(inst) {
  if (inst.kind === 'tv') {
    if (!draftTexture) draftTexture = draftTex();
    return draftTexture;
  }
  if (inst.screen === 'coach') {
    if (!screenCache.coach) screenCache.coach = coachScreen();
    return screenCache.coach;
  }
  const key = inst.screen || 'mid';
  if (!screenCache[key]) {
    const [role, accent] = ROLES[key] || ROLES.mid;
    screenCache[key] = playerScreen(role, accent);
  }
  return screenCache[key];
}

function stickScreen(node, meshName, texture, face) {
  let mesh = null;
  node.traverse((o) => { if (o.name === meshName) mesh = o; });
  if (!mesh) return;
  node.updateWorldMatrix(true, true);
  const box = new THREE.Box3().setFromObject(mesh);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  const plane = new THREE.Mesh(
    new THREE.PlaneGeometry(Math.max(size.x * 0.86, 0.05), Math.max(size.y * 0.74, 0.05)),
    screenMat(texture),
  );
  quiet(plane);
  if (face === 'negZ') {
    // Wing tips are the near edge of the curve. Keep the image just in front of them.
    plane.position.set(center.x, center.y, box.min.z - 0.012);
    plane.rotation.y = Math.PI;
  } else {
    plane.position.set(center.x, center.y, box.max.z + 0.012);
  }
  node.add(plane);
}

function dressInstance(inst, node) {
  if (inst.kind === 'monitor') stickScreen(node, 'curved_screen', textureFor(inst), 'negZ');
  if (inst.kind === 'wall_shelf' || inst.kind === 'pendant_lamp') {
    node.traverse((o) => { if (o.isMesh) o.userData.noShadow = true; });
  }
}

function makeShell(layout) {
  const g = new THREE.Group();
  g.name = 'shell';
  const { width: W, depth: D, height: H } = layout.meta.room;
  const s = layout.shell;
  const floorMat = toon(s.floorColor);
  const wallMat = toon(s.wallColor);
  const ceilMat = toon(s.ceilingColor);
  const floor = addBox(g, W, 0.08, D, floorMat, 0, -0.04, 0);
  floor.castShadow = false;
  floor.userData.noShadow = true;

  const back = addBox(g, W, H, 0.12, wallMat, 0, H / 2, -D / 2);
  back.castShadow = false;
  back.userData.noShadow = true;
  const left = addBox(g, 0.12, H, D, wallMat, -W / 2, H / 2, 0);
  left.castShadow = false;
  left.userData.noShadow = true;

  const wood = toon(s.wainscotColor);
  addBox(g, W - 0.2, 0.92, 0.04, wood, 0, 0.46, -D / 2 + 0.08);
  addBox(g, 0.04, 0.92, D - 0.2, wood, -W / 2 + 0.08, 0.46, 0);
  const base = toon(s.trimColor);
  addBox(g, W - 0.16, 0.08, 0.03, base, 0, 0.04, -D / 2 + 0.09);
  addBox(g, 0.03, 0.08, D - 0.16, base, -W / 2 + 0.09, 0.04, 0);

  const pit = layout.build;
  const desk = pit.desk;
  const xs = pit.stations.map((st) => st.x);
  const pitW = (Math.max(...xs) - Math.min(...xs)) + desk.w + 0.55;
  const pitX = (Math.max(...xs) + Math.min(...xs)) / 2;
  const carpet = addBox(g, pitW + 1.15, 0.018, 3.45, toon(s.pitColor), pitX + 0.45, 0.012, -0.72);
  carpet.userData.noShadow = true;
  const bind = toon('#8d8478');
  addBox(g, pitW + 1.23, 0.012, 0.04, bind, pitX + 0.45, 0.016, 0.98);
  addBox(g, pitW + 1.23, 0.012, 0.04, bind, pitX + 0.45, 0.016, -2.42);

  const lane = addBox(g, 7.4, 0.006, 1.7, toon('#b7ae9f'), -1.55, 0.005, 2.15);
  lane.userData.noShadow = true;

  const coach = pit.coach;
  const runner = addBox(g, 1.7, 0.016, 3.6, toon(s.runnerColor), coach.x, 0.014, 0.85);
  runner.userData.noShadow = true;

  const litCeil = toon('#f7f2ea', { emissive: '#efe6d8', emissiveIntensity: 0.82 });
  quiet(addBox(g, W, 0.05, D, litCeil, 0, H - 0.025, 0));
  const fasciaZ = addBox(g, W, 0.08, 0.08, wallMat, 0, H - 0.08, D / 2 - 0.06);
  quiet(fasciaZ);
  const fasciaX = addBox(g, 0.08, 0.08, D, wallMat, W / 2 - 0.06, H - 0.08, 0);
  quiet(fasciaX);
  const pier = addBox(g, 0.16, H, 0.16, wallMat, W / 2 - 0.28, H / 2, D / 2 - 0.28);
  pier.userData.noShadow = true;

  const lampMat = toon('#fff6e8', { emissive: '#fff1d4', emissiveIntensity: 0.7 });
  quiet(addBox(g, 2.4, 0.02, 0.1, lampMat, -1.1, H - 0.1, -1.7));
  quiet(addBox(g, 1.35, 0.02, 0.08, lampMat, coach.x - 0.15, H - 0.1, -0.35));
  return g;
}

function gamingChair(g, x, z, yaw, accent, headsetOn) {
  const grp = new THREE.Group();
  grp.position.set(x, 0, z);
  grp.rotation.y = yaw;
  grp.name = 'chair';
  const shell = toon('#2e353d');
  const cushion = toon('#5c6772');
  const bolster = toon(accent);
  const metal = toon('#c5ccd3');
  const dark = toon('#23282e');
  const caster = toon('#1c2126');
  const base = (mesh) => {
    mesh.userData.noShadow = true;
    return mesh;
  };
  base(addCyl(grp, 0.042, 0.048, 0.03, metal, 0, 0.05, 0, 12));
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    const spoke = addBox(grp, 0.022, 0.012, 0.2, metal, Math.sin(a) * 0.1, 0.046, Math.cos(a) * 0.1);
    spoke.rotation.y = -a;
    base(spoke);
    base(addCyl(grp, 0.02, 0.02, 0.018, caster, Math.sin(a) * 0.22, 0.014, Math.cos(a) * 0.22, 8));
  }
  base(addCyl(grp, 0.026, 0.032, 0.2, metal, 0, 0.17, 0, 12));
  base(addCyl(grp, 0.046, 0.046, 0.018, metal, 0, 0.28, 0, 12));
  base(addBox(grp, 0.22, 0.02, 0.16, dark, 0, 0.33, 0.02));

  const seat = new THREE.Group();
  seat.position.set(0, 0.36, 0.02);
  seat.rotation.x = -0.05;
  grp.add(seat);
  addBox(seat, 0.36, 0.048, 0.34, cushion, 0, 0.045, 0);
  const lip = addCyl(seat, 0.024, 0.024, 0.32, cushion, 0, 0.03, 0.15, 12);
  lip.rotation.z = Math.PI / 2;
  const leftBolster = addBox(seat, 0.045, 0.05, 0.28, bolster, -0.18, 0.07, -0.01);
  leftBolster.rotation.z = 0.16;
  const rightBolster = addBox(seat, 0.045, 0.05, 0.28, bolster, 0.18, 0.07, -0.01);
  rightBolster.rotation.z = -0.16;

  const back = new THREE.Group();
  back.position.set(0, 0.44, -0.15);
  back.rotation.x = -0.08;
  grp.add(back);
  addBox(back, 0.24, 0.26, 0.04, shell, 0, 0.13, 0);
  addBox(back, 0.38, 0.15, 0.046, shell, 0, 0.33, 0);
  const leftWing = addBox(back, 0.05, 0.18, 0.038, bolster, -0.195, 0.33, 0.008);
  leftWing.rotation.z = 0.26;
  const rightWing = addBox(back, 0.05, 0.18, 0.038, bolster, 0.195, 0.33, 0.008);
  rightWing.rotation.z = -0.26;
  addBox(back, 0.2, 0.22, 0.024, cushion, 0, 0.14, 0.028);
  addBox(back, 0.3, 0.11, 0.024, cushion, 0, 0.33, 0.03);
  const lumbar = addCyl(back, 0.03, 0.03, 0.18, bolster, 0, 0.13, 0.046, 12);
  lumbar.rotation.z = Math.PI / 2;
  addBox(back, 0.012, 0.08, 0.012, metal, -0.038, 0.46, 0.008);
  addBox(back, 0.012, 0.08, 0.012, metal, 0.038, 0.46, 0.008);
  addBox(back, 0.22, 0.075, 0.048, cushion, 0, 0.54, 0.016);
  addBox(back, 0.14, 0.04, 0.016, bolster, 0, 0.54, 0.038);

  for (const sx of [-1, 1]) {
    addBox(grp, 0.016, 0.12, 0.016, metal, sx * 0.22, 0.48, 0.02);
    addBox(grp, 0.042, 0.016, 0.15, dark, sx * 0.22, 0.55, 0.04);
  }
  if (headsetOn) headset(grp, 0, 1.16, -0.2, 0.4);
  g.add(grp);
}

function headset(parent, x, y, z, yaw) {
  const h = new THREE.Group();
  h.position.set(x, y, z);
  h.rotation.y = yaw;
  const band = toon('#2c333a');
  const cup = toon('#2f6a62');
  const pad = toon('#1c2228');
  for (let i = -2; i <= 2; i++) {
    const a = i * 0.38;
    const seg = addBox(h, 0.042, 0.01, 0.012, band, Math.sin(a) * 0.068, 0.055 + Math.cos(a) * 0.028, 0);
    seg.rotation.z = -a;
  }
  for (const sx of [-1, 1]) {
    addBox(h, 0.01, 0.042, 0.01, band, sx * 0.072, 0.032, 0);
    const ear = addCyl(h, 0.03, 0.034, 0.018, cup, sx * 0.08, 0.016, 0, 12);
    ear.rotation.z = Math.PI / 2;
    const cushion = addCyl(h, 0.024, 0.024, 0.008, pad, sx * 0.092, 0.016, 0, 10);
    cushion.rotation.z = Math.PI / 2;
  }
  parent.add(h);
}

function headsetStand(parent, x, y, z) {
  addCyl(parent, 0.045, 0.055, 0.015, toon('#9aa1a8'), x, y + 0.01, z, 10);
  addCyl(parent, 0.008, 0.008, 0.16, toon('#9aa1a8'), x, y + 0.09, z, 8);
  headset(parent, x, y + 0.16, z, 0.4);
}

const KEY_GEO = new THREE.BoxGeometry(0.016, 0.006, 0.012);

function keycap(parent, mat, x, y, z) {
  const m = new THREE.Mesh(KEY_GEO, mat);
  m.position.set(x, y, z);
  m.castShadow = false;
  m.receiveShadow = true;
  m.userData.noShadow = true;
  parent.add(m);
}

function keyboardMouse(parent, x, z, y) {
  const deck = toon('#2c3238');
  const cap = toon('#e4e8ec');
  const alt = toon('#b7c0c8');
  const space = toon('#f2f4f6');
  addBox(parent, 0.46, 0.005, 0.26, toon('#3a4148'), x + 0.02, y + 0.003, z);
  addBox(parent, 0.32, 0.01, 0.132, deck, x - 0.03, y + 0.008, z - 0.01);
  addBox(parent, 0.3, 0.007, 0.028, toon('#6a5344'), x - 0.03, y + 0.01, z + 0.078);
  const rows = [
    { dz: -0.048, n: 14, stagger: 0 },
    { dz: -0.028, n: 13, stagger: 0.008 },
    { dz: -0.008, n: 12, stagger: 0.016 },
    { dz: 0.012, n: 11, stagger: 0.024 },
  ];
  const pitch = 0.02;
  for (const row of rows) {
    const span = (row.n - 1) * pitch;
    for (let i = 0; i < row.n; i++) {
      keycap(parent, i === 0 || i === row.n - 1 ? alt : cap, x - 0.03 - span / 2 + i * pitch + row.stagger, y + 0.016, z + row.dz);
    }
  }
  keycap(parent, alt, x - 0.15, y + 0.016, z + 0.034);
  const bar = addBox(parent, 0.088, 0.006, 0.012, space, x - 0.03, y + 0.016, z + 0.034);
  bar.castShadow = false;
  bar.userData.noShadow = true;
  keycap(parent, alt, x + 0.08, y + 0.016, z + 0.034);

  addBox(parent, 0.1, 0.004, 0.12, toon('#2a3036'), x + 0.22, y + 0.004, z + 0.005);
  const mouse = new THREE.Mesh(new THREE.SphereGeometry(0.02, 12, 8), toon('#eeeae2'));
  mouse.scale.set(0.8, 0.5, 1.2);
  mouse.position.set(x + 0.22, y + 0.014, z + 0.004);
  mouse.castShadow = true;
  mouse.receiveShadow = true;
  parent.add(mouse);
  addBox(parent, 0.005, 0.004, 0.07, toon('#23282e'), x + 0.15, y + 0.008, z - 0.045);
}

function tower(parent, x, z, accent) {
  const body = toon('#2c333b');
  const front = toon('#46505c');
  addBox(parent, 0.18, 0.018, 0.05, toon('#1c2126'), x, 0.016, z - 0.12);
  addBox(parent, 0.18, 0.018, 0.05, toon('#1c2126'), x, 0.016, z + 0.12);
  addBox(parent, 0.17, 0.38, 0.36, body, x, 0.23, z);
  addBox(parent, 0.012, 0.32, 0.28, front, x + 0.086, 0.24, z + 0.01);
  for (let i = 0; i < 6; i++) {
    const slot = addBox(parent, 0.014, 0.006, 0.2, toon('#1a1f24'), x + 0.094, 0.14 + i * 0.04, z + 0.01);
    slot.castShadow = false;
  }
  addBox(parent, 0.006, 0.3, 0.012, toon('#8d96a0'), x + 0.088, 0.24, z + 0.15);
  const led = addBox(parent, 0.01, 0.01, 0.01, toon(accent, { emissive: accent, emissiveIntensity: 0.7 }), x + 0.092, 0.36, z + 0.12);
  quiet(led);
  addCyl(parent, 0.008, 0.008, 0.01, toon('#d7dbe0'), x + 0.04, 0.425, z + 0.1, 8);
}

function deskFrame(g, x, z, w, d, topY) {
  const metal = toon('#3a424a');
  const foot = toon('#2a3036');
  for (const sx of [-1, 1]) {
    const lx = x + sx * (w / 2 - 0.1);
    addBox(g, 0.05, 0.02, d - 0.06, foot, lx, 0.016, z);
    addBox(g, 0.035, topY - 0.08, 0.035, metal, lx, (topY - 0.06) / 2, z - d / 2 + 0.1);
    addBox(g, 0.035, 0.025, d - 0.14, metal, lx, topY - 0.045, z + 0.02);
  }
  addBox(g, w - 0.28, 0.025, 0.025, metal, x, 0.14, z - d / 2 + 0.1);
  const tray = toon('#c5ccd2');
  const tz = z - d / 2 + 0.2;
  addBox(g, w * 0.62, 0.01, 0.14, tray, x, 0.5, tz);
  addBox(g, w * 0.62, 0.035, 0.01, tray, x, 0.52, tz - 0.065);
  addBox(g, w * 0.62, 0.035, 0.01, tray, x, 0.52, tz + 0.065);
}

function station(g, st, desk) {
  const { x } = st;
  const z = desk.z;
  const topY = 0.75;
  addBox(g, desk.w, 0.026, desk.d, toon('#d2c0a4'), x, topY - 0.013, z);
  addBox(g, desk.w, 0.012, 0.018, toon('#4a4038'), x, topY - 0.03, z + desk.d / 2 - 0.008);
  addBox(g, desk.w - 0.08, 0.008, 0.01, toon(st.accent), x, topY - 0.038, z + desk.d / 2 - 0.006);
  const plate = addPlane(
    g, 0.22, 0.04,
    toon('#2a3036', { map: roleTex(st.role, st.accent), emissive: st.accent, emissiveIntensity: 0.12 }),
    x, 0.66, z + desk.d / 2 + 0.004,
  );
  quiet(plate);
  deskFrame(g, x, z, desk.w, desk.d, topY);
  const grommet = addCyl(g, 0.028, 0.028, 0.008, toon('#2a3036'), x + 0.28, topY + 0.002, z - 0.22, 12);
  grommet.castShadow = false;
  keyboardMouse(g, x - 0.02, z + 0.16, topY);
  if (st.headset === 'stand') headsetStand(g, x - 0.5, topY, z - 0.16);
  if (st.headset === 'desk') headset(g, x - 0.46, topY + 0.04, z + 0.02, 1.1);
  tower(g, x + 0.46, z - 0.02, st.accent);
  const drop = addCyl(g, 0.006, 0.006, 0.48, toon('#23282e'), x + 0.36, 0.28, z - 0.22, 6);
  drop.userData.noShadow = true;
  const run = addBox(g, 0.012, 0.012, 0.18, toon('#23282e'), x + 0.36, 0.045, z - 0.36);
  run.userData.noShadow = true;
  const spineX = x + desk.w / 2 + 0.03;
  const channel = toon('#b7c0c6');
  for (const mesh of [
    addBox(g, 0.028, 0.5, 0.032, channel, spineX, 0.28, z - 0.04),
    addBox(g, 0.01, 0.46, 0.012, toon('#2a3036'), spineX, 0.28, z - 0.02),
    addBox(g, 0.028, 0.02, 0.28, channel, spineX, 0.04, z - 0.2),
  ]) mesh.userData.noShadow = true;
  if (st.id === 'adc') {
    addBox(g, 0.16, 0.008, 0.2, toon('#f4efe6'), x - 0.36, 0.755, z - 0.14);
    addBox(g, 0.14, 0.004, 0.16, toon('#e7d3a8'), x - 0.36, 0.761, z - 0.12);
  }
  if (st.mug) {
    const mx = st.id === 'top' ? 0.48 : st.id === 'mid' ? 0.48 : 0.48;
    addCyl(g, 0.045, 0.045, 0.006, toon('#6a5344'), x + mx, topY + 0.004, z - 0.22, 12);
  }
  gamingChair(g, x, st.chairZ + (st.chairPull || 0), st.chairYaw, st.accent, st.headset === 'headrest');
}

function coachDesk(g, coach) {
  const { x, deskZ, w, d } = coach;
  const topY = 0.75;
  addBox(g, w, 0.026, d, toon('#d2c0a4'), x, topY - 0.013, deskZ);
  addBox(g, w, 0.012, 0.016, toon('#4a4038'), x, topY - 0.03, deskZ + d / 2 - 0.008);
  addBox(g, w - 0.1, 0.008, 0.01, toon('#3f6f68'), x, topY - 0.038, deskZ + d / 2 - 0.006);
  deskFrame(g, x, deskZ, w, d, topY);
  keyboardMouse(g, x + 0.06, deskZ + 0.12, topY);
  addBox(g, 0.26, 0.008, 0.32, toon('#f4efe6'), x - 0.32, topY + 0.004, deskZ + 0.06);
  for (let i = 0; i < 4; i++) addBox(g, 0.18, 0.003, 0.006, toon('#8a4e5a'), x - 0.32, topY + 0.01, deskZ - 0.02 + i * 0.045);
  headsetStand(g, x + 0.5, topY, deskZ - 0.12);
  tower(g, x + 0.48, deskZ - 0.08, '#3f6f68');
  const drop = addCyl(g, 0.006, 0.006, 0.48, toon('#23282e'), x + 0.38, 0.28, deskZ - 0.28, 6);
  drop.castShadow = false;
  gamingChair(g, x, coach.chairZ, coach.yaw, '#3f6f68', false);
}

function bench(g, spec) {
  const { x, z, w, d } = spec;
  const grp = new THREE.Group();
  grp.position.set(x, 0, z);
  const pad = toon('#4a5560');
  const metal = toon('#8d96a0');
  addBox(grp, w, 0.045, d * 0.86, pad, 0, 0.44, -0.01);
  const front = addCyl(grp, 0.02, 0.02, w * 0.92, pad, 0, 0.43, d * 0.32, 10);
  front.rotation.z = Math.PI / 2;
  addBox(grp, w * 0.92, 0.22, 0.035, toon('#3a424a'), 0, 0.58, -d / 2 + 0.04);
  addBox(grp, w * 0.55, 0.012, 0.012, toon('#3f6f68'), 0, 0.66, -d / 2 + 0.055);
  for (const sx of [-1, 1]) {
    const leg = addBox(grp, 0.025, 0.4, 0.025, metal, sx * (w / 2 - 0.08), 0.2, 0);
    leg.rotation.x = 0;
    addBox(grp, 0.03, 0.02, d * 0.7, metal, sx * (w / 2 - 0.08), 0.016, 0);
  }
  g.add(grp);
}

function credenza(g, spec) {
  const { x, z, w, d, h } = spec;
  addBox(g, w, h * 0.42, d, toon('#4a4038'), x, h * 0.21, z);
  addBox(g, w, h * 0.42, d, toon('#3c342e'), x, h * 0.68, z);
  addBox(g, w + 0.02, 0.028, d + 0.02, toon('#d2c0a4'), x, h - 0.01, z);
  addBox(g, w * 0.7, 0.008, 0.012, toon('#c5ccd2'), x, h * 0.32, z + d / 2 + 0.002);
  addBox(g, w * 0.7, 0.008, 0.012, toon('#c5ccd2'), x, h * 0.62, z + d / 2 + 0.002);
}

function acoustic(g, layout) {
  const { depth: D, width: W, height: H } = layout.meta.room;
  const z = -D / 2 + 0.1;
  const felt = [
    [-5.15, 1.72, 0.78, 1.35, '#3f6f68'],
    [-4.15, 1.72, 0.78, 1.35, '#5c6168'],
    [-3.2, 2.15, 0.62, 0.55, '#cbbfae'],
    [1.95, 1.85, 0.7, 1.15, '#5c6168'],
    [4.85, 1.85, 0.85, 1.2, '#3f6f68'],
  ];
  for (const [x, y, w, h, color] of felt) {
    const panel = addBox(g, w, h, 0.055, toon(color), x, y, z + 0.03);
    panel.userData.noShadow = true;
    const frame = addBox(g, w + 0.02, 0.015, 0.02, toon('#4a4038'), x, y - h / 2 - 0.02, z + 0.04);
    frame.userData.noShadow = true;
  }
  slats(g, -5.85, 1.7, z + 0.02, 0.7, 1.45, 0);
  slats(g, 2.85, 1.7, z + 0.02, 0.85, 1.4, 0);
  const xw = -W / 2 + 0.1;
  const trap = addBox(g, 0.12, 1.85, 0.42, toon('#3f6f68'), -W / 2 + 0.16, 1.55, -D / 2 + 0.42);
  trap.userData.noShadow = true;
  const side = addBox(g, 0.055, 1.2, 0.7, toon('#5c6168'), xw + 0.02, 1.9, -1.55);
  side.userData.noShadow = true;
  slats(g, xw + 0.02, 1.75, -3.2, 0.9, 1.25, Math.PI / 2);
  const baffle = toon('#c9beae');
  for (const [bx, bz] of [[-3.3, -1.85], [-1.2, -1.55], [1.15, -1.85]]) {
    quiet(addBox(g, 1.35, 0.08, 0.42, baffle, bx, H - 0.42, bz));
  }
}

function slats(parent, x, y, z, w, h, yaw) {
  const grp = new THREE.Group();
  grp.position.set(x, y, z);
  grp.rotation.y = yaw;
  addBox(grp, w, h, 0.03, toon('#6a5344'), 0, 0, 0);
  const n = 8;
  for (let i = 0; i < n; i++) {
    const sx = -w / 2 + 0.08 + i * ((w - 0.12) / (n - 1));
    addBox(grp, 0.028, h - 0.1, 0.055, toon(i % 2 ? '#c4a882' : '#8d6b4e'), sx, 0, 0.03);
  }
  grp.traverse((o) => { if (o.isMesh) o.userData.noShadow = true; });
  parent.add(grp);
}

function raceway(g, layout) {
  const xs = layout.build.stations.map((st) => st.x);
  const x0 = Math.min(...xs) - 0.35;
  const x1 = layout.build.coach.x + 0.55;
  const z = -2.55;
  const trunk = toon('#d9d4ca');
  addBox(g, x1 - x0, 0.035, 0.07, trunk, (x0 + x1) / 2, 0.028, z);
  addBox(g, x1 - x0, 0.008, 0.012, toon('#8d96a0'), (x0 + x1) / 2, 0.046, z + 0.02);
  addBox(g, 0.08, 0.5, 0.14, toon('#3c4650'), -6.42, 0.36, z);
  for (let i = 0; i < 4; i++) {
    addBox(g, 0.01, 0.028, 0.03, toon(i === 1 ? '#3f6f68' : '#1c2228'), -6.375, 0.24 + i * 0.07, z + 0.02);
  }
  addBox(g, 0.28, 0.04, 0.06, toon('#2a3036'), -5.55, 0.05, z);
  for (let i = 0; i < 4; i++) {
    addBox(g, 0.03, 0.012, 0.012, toon('#1c2228'), -5.66 + i * 0.06, 0.07, z + 0.02);
  }
  const frontZ = 1.16;
  const sideX = -5.52;
  const endX = Math.max(...xs) + 0.4;
  addBox(g, 0.07, 0.032, frontZ - z, trunk, sideX, 0.024, (frontZ + z) / 2);
  addBox(g, endX - sideX, 0.032, 0.07, trunk, (sideX + endX) / 2, 0.024, frontZ);
  const seam = toon('#8d96a0');
  const sideSeam = addBox(g, 0.012, 0.006, frontZ - z - 0.04, seam, sideX, 0.042, (frontZ + z) / 2);
  sideSeam.castShadow = false;
  const frontSeam = addBox(g, endX - sideX - 0.04, 0.006, 0.012, seam, (sideX + endX) / 2, 0.042, frontZ);
  frontSeam.castShadow = false;
  addBox(g, 0.11, 0.018, 0.09, toon('#3c4650'), sideX, 0.044, 0.35);
  addBox(g, 0.12, 0.018, 0.09, toon('#3c4650'), 0.9, 0.044, frontZ);
}

function pitMarks(g, layout) {
  const xs = layout.build.stations.map((st) => st.x);
  const x0 = Math.min(...xs) - 0.5;
  const x1 = Math.max(...xs) + 0.5;
  const mid = (x0 + x1) / 2;
  const tape = toon('#d4cbbd');
  for (const z of [0.18, 0.72]) {
    quiet(addBox(g, x1 - x0, 0.004, 0.04, tape, mid, 0.026, z));
  }
  for (const x of xs) {
    quiet(addBox(g, 0.045, 0.004, 0.58, tape, x, 0.027, 0.45));
  }
}

function speakerStands(g) {
  for (const x of [-3.15, 1.15]) {
    addCyl(g, 0.035, 0.05, 1.0, toon('#3c4650'), x, 0.5, -4.02, 8);
    addCyl(g, 0.16, 0.16, 0.025, toon('#3c4650'), x, 0.02, -4.02, 10);
    addBox(g, 0.28, 0.02, 0.16, toon('#2e343a'), x, 1.01, -4.02);
  }
}

function foliage(g, x, z) {
  addCyl(g, 0.012, 0.016, 0.22, toon('#3d5a32'), x, 0.32, z, 6);
  addBox(g, 0.22, 0.16, 0.18, toon('#3f6a44'), x, 0.5, z);
  addBox(g, 0.14, 0.12, 0.12, toon('#4e7a52'), x + 0.06, 0.58, z - 0.04);
}

function shelfDressing(g) {
  const rack = new THREE.Group();
  headset(rack, -6.16, 1.68, 0.05, 1.2);
  headset(rack, -6.16, 2.06, 0.85, 1.2);
  addBox(rack, 0.12, 0.045, 0.18, toon('#2e343a'), -6.16, 1.67, 0.7);
  rack.traverse((o) => { if (o.isMesh) o.userData.noShadow = true; });
  g.add(rack);
}

function makeProcedural(layout) {
  const g = new THREE.Group();
  g.name = 'procedural';
  const b = layout.build;
  for (const st of b.stations) station(g, st, b.desk);
  coachDesk(g, b.coach);
  bench(g, b.bench);
  credenza(g, b.credenza);
  acoustic(g, layout);
  raceway(g, layout);
  pitMarks(g, layout);
  speakerStands(g);
  foliage(g, b.pot.x, b.pot.z);
  shelfDressing(g);
  if (!replayTexture) replayTexture = replayTex();
  if (!draftTexture) draftTexture = draftTex();
  const frame = toon('#2e343a');
  const r = b.replay;
  addBox(g, r.w + 0.14, r.h + 0.14, 0.07, frame, r.x, r.y, r.z);
  const screen = addPlane(g, r.w, r.h, screenMat(replayTexture), r.x, r.y, r.z + 0.045);
  quiet(screen);
  addBox(g, 0.9, 0.06, 0.025, toon('#c8b69a'), r.x, r.y + r.h / 2 + 0.12, r.z + 0.02);
  const d = b.draft;
  addBox(g, d.w + 0.08, d.h + 0.08, 0.05, frame, d.x, d.y, d.z);
  const draft = addPlane(g, d.w, d.h, screenMat(draftTexture), d.x, d.y, d.z + 0.035);
  quiet(draft);
  return g;
}

boot({
  makeShell,
  makeProcedural,
  tuneAsset,
  dressInstance,
  readyText: 'ready — North Pit · drag orbit · U unlit · T toon',
});
