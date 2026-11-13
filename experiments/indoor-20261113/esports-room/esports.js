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
  const pitW = (Math.max(...xs) - Math.min(...xs)) + desk.w + 0.35;
  const pitX = (Math.max(...xs) + Math.min(...xs)) / 2;
  addBox(g, pitW, 0.02, 2.15, toon(s.pitColor), pitX, 0.01, desk.z + 0.15);

  const coach = pit.coach;
  addBox(g, 1.55, 0.018, 4.3, toon(s.runnerColor), coach.x, 0.012, 1.15);

  const litCeil = toon('#f4efe6', { emissive: '#e7dfd2', emissiveIntensity: 0.72 });
  const soffit = addBox(g, W * 0.78, 0.07, D * 0.42, litCeil, -0.55, H - 0.06, -1.85);
  quiet(soffit);
  const fasciaZ = addBox(g, W, 0.1, 0.1, wallMat, 0, H - 0.08, D / 2 - 0.08);
  quiet(fasciaZ);
  const fasciaX = addBox(g, 0.1, 0.1, D, wallMat, W / 2 - 0.08, H - 0.08, 0);
  quiet(fasciaX);
  const pier = addBox(g, 0.16, H, 0.16, wallMat, W / 2 - 0.28, H / 2, D / 2 - 0.28);
  pier.userData.noShadow = true;

  const lampMat = toon('#fff6e8', { emissive: '#fff1d4', emissiveIntensity: 0.55 });
  quiet(addBox(g, 1.8, 0.025, 0.14, lampMat, -1.2, H - 0.12, -1.55));
  quiet(addBox(g, 1.1, 0.025, 0.12, lampMat, coach.x - 0.2, H - 0.12, -0.15));
  return g;
}

function gamingChair(g, x, z, yaw, accent, headsetOn) {
  const grp = new THREE.Group();
  grp.position.set(x, 0, z);
  grp.rotation.y = yaw;
  grp.name = 'chair';
  const shell = toon('#3a4148');
  const seat = toon('#4e5862');
  const lip = toon('#7b868f');
  const stitch = toon(accent);
  const metal = toon('#9aa1a8');
  const caster = toon('#2c3136');
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    const spoke = addBox(grp, 0.26, 0.022, 0.038, metal, Math.sin(a) * 0.13, 0.045, Math.cos(a) * 0.13);
    spoke.rotation.y = -a;
    addCyl(grp, 0.032, 0.032, 0.028, caster, Math.sin(a) * 0.25, 0.02, Math.cos(a) * 0.25, 8);
  }
  addCyl(grp, 0.032, 0.04, 0.26, metal, 0, 0.19, 0, 10);
  addBox(grp, 0.48, 0.07, 0.46, seat, 0, 0.46, 0.02);
  addBox(grp, 0.42, 0.022, 0.05, lip, 0, 0.495, 0.23);
  addBox(grp, 0.055, 0.09, 0.4, stitch, -0.22, 0.5, 0.02);
  addBox(grp, 0.055, 0.09, 0.4, stitch, 0.22, 0.5, 0.02);
  addBox(grp, 0.46, 0.58, 0.07, shell, 0, 0.86, -0.2);
  addBox(grp, 0.07, 0.46, 0.075, stitch, -0.2, 0.84, -0.18);
  addBox(grp, 0.07, 0.46, 0.075, stitch, 0.2, 0.84, -0.18);
  addBox(grp, 0.26, 0.1, 0.08, shell, 0, 1.2, -0.18);
  addBox(grp, 0.045, 0.2, 0.045, metal, -0.26, 0.58, 0.04);
  addBox(grp, 0.045, 0.2, 0.045, metal, 0.26, 0.58, 0.04);
  addBox(grp, 0.055, 0.022, 0.26, toon('#2e343a'), -0.26, 0.69, 0.08);
  addBox(grp, 0.055, 0.022, 0.26, toon('#2e343a'), 0.26, 0.69, 0.08);
  if (headsetOn) headset(grp, 0, 1.28, -0.16, 0.7);
  g.add(grp);
}

function headset(parent, x, y, z, yaw) {
  const h = new THREE.Group();
  h.position.set(x, y, z);
  h.rotation.y = yaw;
  const band = toon('#2c333a');
  const cup = toon('#2f6a62');
  addBox(h, 0.15, 0.012, 0.016, band, 0, 0.09, 0);
  addBox(h, 0.014, 0.07, 0.016, band, -0.07, 0.055, 0);
  addBox(h, 0.014, 0.07, 0.016, band, 0.07, 0.055, 0);
  const left = addCyl(h, 0.04, 0.04, 0.026, cup, -0.082, 0.02, 0, 10);
  left.rotation.z = Math.PI / 2;
  const right = addCyl(h, 0.04, 0.04, 0.026, cup, 0.082, 0.02, 0, 10);
  right.rotation.z = Math.PI / 2;
  parent.add(h);
}

function headsetStand(parent, x, y, z) {
  addCyl(parent, 0.045, 0.055, 0.015, toon('#9aa1a8'), x, y + 0.01, z, 10);
  addCyl(parent, 0.008, 0.008, 0.16, toon('#9aa1a8'), x, y + 0.09, z, 8);
  headset(parent, x, y + 0.16, z, 0.4);
}

function keyboardMouse(parent, x, z, y) {
  addBox(parent, 0.36, 0.008, 0.22, toon('#2a3038'), x + 0.16, y + 0.004, z + 0.02);
  addBox(parent, 0.42, 0.018, 0.14, toon('#3a4148'), x - 0.02, y + 0.012, z);
  for (let i = 0; i < 8; i++) {
    addBox(parent, 0.035, 0.008, 0.1, toon(i % 3 === 0 ? '#4e5862' : '#2e343a'), x - 0.16 + i * 0.042, y + 0.024, z, );
  }
  addBox(parent, 0.055, 0.02, 0.09, toon('#d7d2c8'), x + 0.22, y + 0.016, z + 0.01);
}

function tower(parent, x, z, accent) {
  addBox(parent, 0.2, 0.44, 0.42, toon('#343b44'), x, 0.22, z);
  addBox(parent, 0.012, 0.32, 0.28, toon('#4a5562'), x + 0.1, 0.24, z + 0.02);
  const led = addBox(parent, 0.012, 0.012, 0.04, toon(accent, { emissive: accent, emissiveIntensity: 0.8 }), x + 0.108, 0.36, z + 0.12);
  quiet(led);
  addCyl(parent, 0.012, 0.012, 0.42, toon('#23282e'), x + 0.02, 0.42, z - 0.12, 6);
}

function station(g, st, desk) {
  const { x } = st;
  const z = desk.z;
  const top = toon('#c8b69a');
  const leg = toon('#2c3238');
  const edge = toon(st.accent);
  addBox(g, desk.w, 0.045, desk.d, top, x, 0.728, z);
  addBox(g, desk.w - 0.04, 0.012, 0.012, edge, x, 0.702, z + desk.d / 2);
  const plate = addPlane(
    g, 0.22, 0.04,
    toon('#2a3036', { map: roleTex(st.role, st.accent), emissive: st.accent, emissiveIntensity: 0.12 }),
    x, 0.69, z + desk.d / 2 + 0.004,
  );
  quiet(plate);
  const ix = desk.w / 2 - 0.08;
  const iz = desk.d / 2 - 0.08;
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) addBox(g, 0.05, 0.7, 0.05, leg, x + sx * ix, 0.35, z + sz * iz);
  }
  addBox(g, desk.w * 0.72, 0.035, 0.14, toon('#b7bdc4'), x, 0.58, z - desk.d / 2 + 0.16);
  addBox(g, 0.03, 0.5, 0.03, toon('#23282e'), x + 0.08, 0.32, z - 0.28);
  keyboardMouse(g, x, z + 0.16, 0.75);
  if (st.headset === 'stand') headsetStand(g, x - 0.48, 0.75, z + 0.08);
  if (st.headset === 'desk') headset(g, x - 0.42, 0.8, z + 0.05, 1.2);
  tower(g, x + 0.42, z - 0.06, st.accent);
  const spineX = x + desk.w / 2 + 0.04;
  const channel = toon('#aeb6bd');
  addBox(g, 0.04, 0.56, 0.045, channel, spineX, 0.3, z + 0.02);
  addBox(g, 0.012, 0.52, 0.016, toon('#2a3036'), spineX, 0.3, z + 0.02);
  addBox(g, 0.04, 0.03, 0.34, channel, spineX, 0.045, z - 0.16);
  if (st.id === 'adc') {
    addBox(g, 0.2, 0.012, 0.26, toon('#f4efe6'), x - 0.28, 0.756, z - 0.12);
    addBox(g, 0.18, 0.008, 0.22, toon('#e7d3a8'), x - 0.28, 0.766, z - 0.1);
  }
  gamingChair(g, x, st.chairZ + (st.chairPull || 0), st.chairYaw, st.accent, st.headset === 'headrest');
}

function coachDesk(g, coach) {
  const { x, deskZ, w, d } = coach;
  addBox(g, w, 0.045, d, toon('#c8b69a'), x, 0.728, deskZ);
  addBox(g, w - 0.06, 0.012, 0.012, toon('#3f6f68'), x, 0.702, deskZ + d / 2);
  const ix = w / 2 - 0.08;
  const iz = d / 2 - 0.08;
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) addBox(g, 0.05, 0.7, 0.05, toon('#2c3238'), x + sx * ix, 0.35, deskZ + sz * iz);
  }
  addBox(g, w * 0.7, 0.035, 0.14, toon('#b7bdc4'), x, 0.58, deskZ - d / 2 + 0.16);
  addBox(g, 0.28, 0.015, 0.36, toon('#f4efe6'), x - 0.28, 0.756, deskZ + 0.08);
  for (let i = 0; i < 4; i++) addBox(g, 0.2, 0.004, 0.008, toon('#8a4e5a'), x - 0.28, 0.768, deskZ - 0.02 + i * 0.05);
  headsetStand(g, x + 0.48, 0.75, deskZ + 0.05);
  gamingChair(g, x, coach.chairZ, coach.yaw, '#3f6f68', false);
}

function bench(g, spec) {
  const { x, z, w, d } = spec;
  const grp = new THREE.Group();
  grp.position.set(x, 0, z);
  addBox(grp, w, 0.08, d, toon('#4e5862'), 0, 0.46, 0);
  addBox(grp, w - 0.1, 0.025, 0.045, toon('#7b868f'), 0, 0.5, -d / 2 + 0.04);
  addBox(grp, w, 0.28, 0.07, toon('#3a4148'), 0, 0.64, d / 2 - 0.04);
  addBox(grp, w * 0.7, 0.04, 0.03, toon('#3f6f68'), 0, 0.7, d / 2 - 0.02);
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      addBox(grp, 0.05, 0.42, 0.05, toon('#6a5344'), sx * (w / 2 - 0.08), 0.21, sz * (d / 2 - 0.06));
    }
  }
  g.add(grp);
}

function credenza(g, spec) {
  const { x, z, w, d, h } = spec;
  addBox(g, w, h, d, toon('#4a4038'), x, h / 2, z);
  addBox(g, w + 0.02, 0.03, d + 0.02, toon('#c8b69a'), x, h - 0.01, z);
  addBox(g, 0.012, h * 0.55, d * 0.7, toon('#2e343a'), x + w / 2 + 0.001, h * 0.42, z);
}

function acoustic(g, layout) {
  const { depth: D, width: W, height: H } = layout.meta.room;
  const z = -D / 2 + 0.1;
  const panels = [
    [-5.55, 1.85, 0.7, 0.9, '#3f6f68'],
    [-5.7, 1.05, 0.42, 0.48, '#5c6168'],
    [-4.85, 1.15, 0.55, 0.7, '#a6846a'],
    [-4.15, 1.9, 0.48, 0.62, '#d4c8b4'],
    [-4.55, 2.45, 0.9, 0.32, '#3f6f68'],
    [1.85, 2.35, 0.7, 0.42, '#a6846a'],
    [2.55, 1.7, 0.48, 0.7, '#5c6168'],
    [4.55, 2.15, 0.8, 0.7, '#3f6f68'],
    [5.45, 1.35, 0.55, 0.55, '#d4c8b4'],
    [4.9, 1.15, 0.4, 0.4, '#a6846a'],
  ];
  for (const [x, y, w, h, color] of panels) {
    const panel = addBox(g, w, h, 0.06, toon(color), x, y, z + 0.03);
    panel.userData.noShadow = true;
  }
  slats(g, 1.55, 1.55, z + 0.02, 1.15, 1.45, 0);
  const xw = -W / 2 + 0.1;
  const trap = addBox(g, 0.1, 1.7, 0.55, toon('#3f6f68'), -W / 2 + 0.18, 1.7, -D / 2 + 0.5);
  trap.userData.noShadow = true;
  const sideA = addBox(g, 0.07, 1.15, 0.42, toon('#5c6168'), xw + 0.02, 2.15, -1.6);
  sideA.userData.noShadow = true;
  const sideB = addBox(g, 0.06, 0.7, 0.5, toon('#a6846a'), xw + 0.02, 1.7, 2.55);
  sideB.userData.noShadow = true;
  slats(g, xw + 0.02, 1.85, -3.15, 1.05, 1.35, Math.PI / 2);
  const cloudMat = toon('#ddd4c6');
  quiet(addBox(g, 2.4, 0.04, 0.9, cloudMat, -2.4, H - 0.28, -1.7));
  quiet(addBox(g, 1.8, 0.04, 0.7, cloudMat, 0.6, H - 0.34, -1.35));
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
  const x0 = Math.min(...xs) - 0.2;
  const x1 = Math.max(...xs) + 0.2;
  const z = -2.48;
  addBox(g, x1 - x0, 0.045, 0.09, toon('#d5d0c6'), (x0 + x1) / 2, 0.03, z);
  for (const x of xs) {
    addBox(g, 0.028, 0.52, 0.028, toon('#2a3036'), x + 0.08, 0.3, -2.28);
  }
  addBox(g, 0.06, 0.55, 0.16, toon('#3c4650'), -6.42, 0.4, z);
  for (let i = 0; i < 4; i++) {
    addBox(g, 0.012, 0.04, 0.04, toon(i === 1 ? '#3f6f68' : '#1c2228'), -6.38, 0.28 + i * 0.08, z);
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
