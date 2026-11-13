import * as THREE from 'three';
import { boot, toon, addBox, addCyl } from './scene_lib.js';
import {
  COACH_FIT,
  HALL,
  PLANKS,
  REELS,
  markings,
  pisteFrames,
  warningZones,
} from './piste_spec.mjs';

const PLASTER = '#f4f0e6';
const PLASTER_HIGH = '#e7efe8';
const WAINSCOT = '#2c4a42';
const STILE = '#3d6156';
const RAIL = '#8a6844';
const BASEBOARD = '#5c4634';
const PISTE_METAL = '#c5c9c2';
const WARN = '#a85c56';
const LINE = '#f3efe4';
const METAL = '#5c656c';
const POCHE = '#4a453f';
const CEIL = '#ebe4d8';
const BEAM = '#ddd4c6';
const GREEN = '#243f38';
const CLOTH = '#f3f0e8';
const BRASS = '#b08a4f';

function srgbTexture(canvas) {
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  tex.needsUpdate = true;
  return tex;
}

function paintFloor(width, depth) {
  const ppm = 96;
  const W = Math.round(width * ppm);
  const H = Math.round(depth * ppm);
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  const plank = PLANKS * ppm;
  const n = Math.ceil(W / plank);
  for (let i = 0; i < n; i += 1) {
    const wobble = ((i * 17) % 11) - 5;
    const r = 198 + wobble;
    const g = 164 + wobble * 0.55;
    const b = 114 + wobble * 0.25;
    ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
    ctx.fillRect(i * plank, 0, plank + 1, H);
    ctx.fillStyle = 'rgba(92, 64, 36, 0.16)';
    ctx.fillRect(i * plank, 0, 1, H);
    const joint = (1.55 * ppm) ;
    const shift = (i % 2) * joint * 0.5;
    ctx.fillStyle = 'rgba(90, 62, 34, 0.12)';
    for (let y = shift; y < H; y += joint) {
      ctx.fillRect(i * plank, y, plank, 1);
    }
  }
  return srgbTexture(canvas);
}

function paintPiste() {
  const across = 96;
  const along = 896;
  const canvas = document.createElement('canvas');
  canvas.width = across;
  canvas.height = along;
  const ctx = canvas.getContext('2d');
  const panel = Math.round((2 / 14) * along);
  for (let i = 0, y = 0; y < along; i += 1, y += panel) {
    const shift = i % 2 === 0 ? 0 : -8;
    ctx.fillStyle = `rgb(${206 + shift}, ${214 + shift}, ${206 + shift})`;
    ctx.fillRect(0, y, across, panel + 1);
  }
  ctx.fillStyle = 'rgba(62, 74, 68, 0.72)';
  for (let y = panel; y < along; y += panel) ctx.fillRect(0, y - 1, across, 2);
  ctx.fillRect(across / 2, 0, 1, along);
  const tex = srgbTexture(canvas);
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  return tex;
}

function paintLesson() {
  const canvas = document.createElement('canvas');
  canvas.width = 768;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#f4f0e6';
  ctx.fillRect(0, 0, 768, 512);
  ctx.strokeStyle = '#2c4a42';
  ctx.lineWidth = 8;
  ctx.strokeRect(72, 148, 624, 168);
  ctx.setLineDash([22, 16]);
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(72, 232);
  ctx.lineTo(696, 232);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.lineWidth = 6;
  const xGuard = (metres) => 72 + (624 * (7 + metres)) / 14;
  for (const z of [-2, 2]) {
    const x = xGuard(z);
    ctx.beginPath();
    ctx.moveTo(x, 148);
    ctx.lineTo(x, 316);
    ctx.stroke();
  }
  ctx.fillStyle = '#2c4a42';
  ctx.beginPath();
  ctx.arc(xGuard(-2), 196, 12, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(xGuard(2), 268, 12, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(xGuard(-2) + 18, 200);
  ctx.lineTo(xGuard(2) - 22, 258);
  ctx.stroke();
  ctx.fillStyle = '#2c4a42';
  ctx.font = '600 44px Georgia, "Times New Roman", serif';
  ctx.textAlign = 'center';
  ctx.fillText('DISTANCE', 384, 92);
  ctx.font = '400 28px Georgia, "Times New Roman", serif';
  ctx.fillStyle = '#6d4a36';
  ctx.fillText('ATTAQUE   ·   PARADE 4', 384, 420);
  return srgbTexture(canvas);
}

function paintSign() {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 320;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#f4ecdf';
  ctx.fillRect(0, 0, 1024, 320);
  ctx.strokeStyle = '#243f38';
  ctx.lineWidth = 10;
  ctx.strokeRect(28, 24, 968, 272);
  ctx.lineWidth = 2;
  ctx.strokeRect(44, 40, 936, 240);
  ctx.fillStyle = '#243f38';
  ctx.font = '600 92px Georgia, "Times New Roman", serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('SALLE MONTJOIE', 512, 132);
  ctx.font = '400 28px Georgia, "Times New Roman", serif';
  ctx.fillStyle = '#6d4a36';
  ctx.fillText('CLUB D’ESCRIME  ·  PISTES  I  &  II', 512, 214);
  return srgbTexture(canvas);
}

let blobTex;
function shadowBlob(g, x, z, w, d, opacity = 0.28) {
  if (!blobTex) {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    const grd = ctx.createRadialGradient(64, 64, 8, 64, 64, 62);
    grd.addColorStop(0, 'rgba(0,0,0,0.55)');
    grd.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, 128, 128);
    blobTex = new THREE.CanvasTexture(canvas);
    blobTex.colorSpace = THREE.NoColorSpace;
  }
  const mat = new THREE.MeshBasicMaterial({
    map: blobTex,
    transparent: true,
    opacity,
    depthWrite: false,
    color: 0x2a241c,
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, d), mat);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set(x, 0.03, z);
  mesh.userData.keepMaterial = true;
  mesh.userData.noCast = true;
  mesh.userData.noReceive = true;
  mesh.renderOrder = 2;
  g.add(mesh);
}

function addPlane(g, w, d, mat, x, y, z, receive = true) {
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, d), mat);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set(x, y, z);
  mesh.receiveShadow = receive;
  mesh.userData.noCast = true;
  if (!receive) mesh.userData.noReceive = true;
  g.add(mesh);
  return mesh;
}

function addFloor(g, width, depth, x, z, texture, tint) {
  const mat = toon(tint, { map: texture });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, depth), mat);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set(x, 0.006, z);
  mesh.receiveShadow = true;
  mesh.userData.noCast = true;
  g.add(mesh);
  return mesh;
}

function glassMat() {
  const mat = new THREE.MeshBasicMaterial({
    color: 0xd5e4dc,
    transparent: true,
    opacity: 0.42,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  return mat;
}

function makeShell() {
  const g = new THREE.Group();
  g.name = 'shell';
  const plaster = toon(PLASTER);
  const high = toon(PLASTER_HIGH);
  const wain = toon(WAINSCOT);
  const stile = toon(STILE);
  const rail = toon(RAIL);
  const base = toon(BASEBOARD);
  const metal = toon(METAL);
  const poche = toon(POCHE);
  const ceil = toon(CEIL);
  const beam = toon(BEAM);
  const green = toon(GREEN);
  const copper = toon('#ffffff', { map: paintPiste() });
  const warn = toon(WARN);
  const line = toon(LINE);
  const trim = toon('#c5ccd1');
  const H = HALL.height;
  const x0 = HALL.wallL;
  const x1 = HALL.wallR;
  const z0 = HALL.wallFar;
  const zCut = HALL.cutZ;
  const width = x1 - x0;
  const floorW = width;
  const floorD = HALL.floorNear - HALL.floorFar;
  const floorCx = (x0 + x1) / 2;
  const floorCz = (HALL.floorFar + HALL.floorNear) / 2;

  const lipNear = addBox(g, width + 0.28, 0.1, 0.16, poche, floorCx, -0.05, HALL.cutZ);
  lipNear.userData.noCast = true;
  lipNear.userData.noReceive = true;

  addFloor(g, floorW, floorD, floorCx, floorCz, paintFloor(floorW, floorD), '#d2b48a');

  for (const f of pisteFrames()) {
    addPlane(g, f.x1 - f.x0, f.z1 - f.z0, copper, f.cx, 0.02, 0);
    for (const zone of warningZones(f.cx)) {
      addPlane(
        g, zone.x1 - zone.x0, zone.z1 - zone.z0, warn,
        (zone.x0 + zone.x1) / 2, 0.028, (zone.z0 + zone.z1) / 2,
      );
    }
    for (const rect of markings(f.cx)) {
      addPlane(
        g, rect.x1 - rect.x0, rect.z1 - rect.z0, line,
        (rect.x0 + rect.x1) / 2, 0.036, (rect.z0 + rect.z1) / 2, false,
      );
    }
    for (const side of [-1, 1]) {
      const edge = f.cx + side * (f.x1 - f.x0) / 2;
      const lip = addBox(g, 0.018, 0.01, f.z1 - f.z0, trim, edge, 0.016, 0);
      lip.userData.noCast = true;
    }
  }

  const coach = HALL.coachBox;
  const coachLine = toon('#2f4f46');
  const cW = coach.x1 - coach.x0;
  const cD = coach.z1 - coach.z0;
  for (const [w, d, x, z] of [
    [cW, 0.04, (coach.x0 + coach.x1) / 2, coach.z0],
    [cW, 0.04, (coach.x0 + coach.x1) / 2, coach.z1],
    [0.04, cD, coach.x0, (coach.z0 + coach.z1) / 2],
    [0.04, cD, coach.x1, (coach.z0 + coach.z1) / 2],
  ]) {
    const m = addBox(g, w, 0.004, d, coachLine, x, 0.02, z);
    m.userData.noCast = true;
    m.userData.noReceive = true;
  }

  const wallLen = zCut - z0;
  const wallCz = (z0 + zCut) / 2;
  addBox(g, 0.18, H, wallLen, poche, x0 - 0.09, H / 2, wallCz);
  addBox(g, 0.18, H, wallLen, poche, x1 + 0.09, H / 2, wallCz);
  addBox(g, 0.02, H, wallLen, plaster, x0 + 0.01, H / 2, wallCz);
  addBox(g, 0.02, H, wallLen, plaster, x1 - 0.01, H / 2, wallCz);

  for (const x of [x0 + 0.025, x1 - 0.025]) {
    const face = x < 0 ? 1 : -1;
    addBox(g, 0.03, HALL.wainscot, wallLen, wain, x + face * 0.008, HALL.wainscot / 2, wallCz);
    addBox(g, 0.045, 0.045, wallLen, rail, x + face * 0.012, HALL.wainscot + 0.02, wallCz);
    addBox(g, 0.05, 0.1, wallLen, base, x + face * 0.015, 0.05, wallCz);
    for (let z = z0 + 0.4; z < zCut - 0.2; z += 1.4) {
      addBox(g, 0.025, HALL.wainscot - 0.08, 0.045, stile, x + face * 0.02, HALL.wainscot / 2, z);
    }
  }

  const glass = glassMat();
  for (const x of [x0 + 0.04, x1 - 0.04]) {
    const face = x < 0 ? 1 : -1;
    const sill = addBox(g, 0.04, 0.06, wallLen, metal, x, HALL.clerestory0 - 0.02, wallCz);
    const head = addBox(g, 0.04, 0.06, wallLen, metal, x, HALL.clerestory1 + 0.02, wallCz);
    sill.userData.noCast = true;
    head.userData.noCast = true;
    for (let z = z0 + 0.15; z < zCut; z += 1.4) {
      const bay = Math.min(1.4, zCut - z) - 0.06;
      if (bay < 0.3) continue;
      const pane = new THREE.Mesh(
        new THREE.PlaneGeometry(bay, HALL.clerestory1 - HALL.clerestory0 - 0.04),
        glass,
      );
      pane.position.set(x + face * 0.02, (HALL.clerestory0 + HALL.clerestory1) / 2, z + bay / 2);
      pane.rotation.y = x < 0 ? Math.PI / 2 : -Math.PI / 2;
      pane.userData.keepMaterial = true;
      pane.userData.noCast = true;
      pane.userData.noReceive = true;
      g.add(pane);
      const mullion = addBox(g, 0.035, HALL.clerestory1 - HALL.clerestory0, 0.04, metal, x, (HALL.clerestory0 + HALL.clerestory1) / 2, z);
      mullion.userData.noCast = true;
    }
  }

  const farW = width + 0.2;
  addBox(g, farW, H, 0.18, poche, floorCx, H / 2, z0 - 0.09);
  addBox(g, farW, H, 0.02, plaster, floorCx, H / 2, z0 + 0.01);
  addBox(g, farW, HALL.wainscot, 0.03, wain, floorCx, HALL.wainscot / 2, z0 + 0.03);
  addBox(g, farW, 0.045, 0.04, rail, floorCx, HALL.wainscot + 0.02, z0 + 0.035);
  addBox(g, farW, 0.1, 0.05, base, floorCx, 0.05, z0 + 0.04);

  const doorW = 1.42;
  const doorH = 2.16;
  addBox(g, doorW + 0.16, doorH + 0.1, 0.08, green, 0, doorH / 2, z0 + 0.02);
  addBox(g, doorW, doorH, 0.04, toon('#1e3933'), 0, doorH / 2, z0 + 0.05);
  addBox(g, doorW - 0.16, 0.9, 0.02, toon('#f6f1e6'), 0, 0.62, z0 + 0.07);
  addBox(g, doorW - 0.16, 0.7, 0.02, toon('#f6f1e6'), 0, 1.62, z0 + 0.07);
  const doorGlass = new THREE.Mesh(new THREE.PlaneGeometry(0.36, 0.7), glass);
  doorGlass.position.set(0.28, 1.55, z0 + 0.09);
  doorGlass.userData.keepMaterial = true;
  doorGlass.userData.noCast = true;
  g.add(doorGlass);
  addBox(g, 0.03, 0.16, 0.02, toon(BRASS), -0.55, 1.05, z0 + 0.09);

  const sign = new THREE.Mesh(new THREE.PlaneGeometry(2.5, 0.78), toon('#f4ecdf', { map: paintSign() }));
  sign.position.set(0, 3.05, z0 + 0.05);
  sign.userData.noCast = true;
  g.add(sign);
  addCrest(g, 0, 2.45, z0 + 0.06);

  const ceilLen = zCut - z0 + 0.1;
  const ceilZ = (z0 + zCut) / 2;
  const ceiling = addBox(g, width + 0.2, 0.08, ceilLen, ceil, floorCx, H - 0.04, ceilZ);
  ceiling.userData.noCast = true;
  for (const x of [-2.2, 0, 2.2]) {
    const rib = addBox(g, 0.1, 0.14, ceilLen - 0.4, beam, x, H - 0.14, ceilZ);
    rib.userData.noCast = true;
  }
  for (let z = z0 + 1.2; z < zCut - 0.4; z += 2.8) {
    const tie = addBox(g, width - 0.4, 0.1, 0.08, beam, floorCx, H - 0.16, z);
    tie.userData.noCast = true;
  }
  addBox(g, 0.28, H, 0.14, poche, x0 - 0.04, H / 2, zCut);
  addBox(g, 0.28, H, 0.14, poche, x1 + 0.04, H / 2, zCut);
  const lip = addBox(g, width + 0.2, 0.12, 0.14, poche, floorCx, H - 0.02, zCut);
  lip.userData.noCast = true;

  const soffitD = HALL.soffitZ1 - HALL.soffitZ0;
  const soffitW = x1 - HALL.soffitX;
  const soffit = addBox(
    g, soffitW, 0.08, soffitD, toon('#e7dccb'),
    HALL.soffitX + soffitW / 2, HALL.soffitY, (HALL.soffitZ0 + HALL.soffitZ1) / 2,
  );
  soffit.userData.noCast = true;
  addBox(
    g, 0.06, 0.1, soffitD, rail,
    HALL.soffitX, HALL.soffitY - 0.02, (HALL.soffitZ0 + HALL.soffitZ1) / 2,
  );

  const battenMat = toon('#fff4e2', { emissive: '#fff1d4', emissiveIntensity: 0.7 });
  for (const x of [-2.2, 0, 2.2]) {
    for (const z of [-5.1, -1.7, 1.7, 5.1]) {
      const b = addBox(g, 0.14, 0.025, 2.15, battenMat, x, H - 0.28, z);
      b.userData.noCast = true;
      const glow = new THREE.PointLight(0xfff3e2, 0.18, 6.5, 2);
      glow.position.set(x, H - 0.45, z);
      g.add(glow);
    }
  }

  return g;
}

function addCrest(g, x, y, z) {
  const steel = toon('#c5ccd1');
  const guard = toon('#8d9398');
  for (const tilt of [-0.55, 0.55]) {
    const blade = addBox(g, 0.012, 0.42, 0.008, steel, x, y, z);
    blade.rotation.z = tilt;
    blade.userData.noCast = true;
  }
  addCyl(g, 0.035, 0.035, 0.012, guard, x, y - 0.02, z + 0.01, 10).rotateX(Math.PI / 2);
}

function makeProcedural(layout) {
  const g = new THREE.Group();
  g.name = 'equipment';
  const metal = toon(METAL);
  const wood = toon('#6b4330');
  const cloth = toon(CLOTH);
  const brass = toon(BRASS);
  const green = toon(GREEN);
  const dark = toon('#3a4046');

  for (const inst of layout.instances) {
    if (inst.kind === 'scoring_box') addScoreStand(g, inst, metal, wood);
    if (inst.id.startsWith('bench_near')) addBenchBack(g, inst, wood, true);
    if (inst.id === 'bench_side') addBenchBack(g, inst, wood, false);
  }

  for (const reel of REELS) addReel(g, reel.x, reel.z, metal, green, brass);

  addPegRail(g, metal, brass);
  addLames(g, cloth, metal, brass);
  addShelfGoods(g, cloth, green, brass);
  addCoachBay(g, wood, green);
  return g;
}

function addScoreStand(g, inst, metal, wood) {
  const [x, , z] = inst.position;
  const base = addBox(g, 0.42, 0.04, 0.32, metal, x, 0.02, z);
  base.userData.noCast = false;
  addBox(g, 0.06, 0.98, 0.06, metal, x, 0.52, z);
  addBox(g, 0.5, 0.025, 0.28, wood, x, 1.005, z);
  const towardWall = x < 0 ? -1 : 1;
  const channel = addBox(g, 0.9, 0.012, 0.035, metal, x + towardWall * 0.55, 0.012, z);
  channel.userData.noCast = true;
  shadowBlob(g, x, z, 0.55, 0.42, 0.26);
}

function addBenchBack(g, inst, wood, nearEnd) {
  const [x, , z] = inst.position;
    if (nearEnd) {
    addBox(g, 1.28, 0.36, 0.04, wood, x, 0.62, z + 0.22);
    addBox(g, 1.28, 0.035, 0.05, toon('#8a6844'), x, 0.82, z + 0.22);
  } else {
    addBox(g, 0.045, 0.78, 1.42, wood, x + 0.28, 0.62, z);
    addBox(g, 0.06, 0.04, 1.42, toon('#8a6844'), x + 0.28, 1.02, z);
  }
  shadowBlob(g, x, z, nearEnd ? 1.5 : 0.55, nearEnd ? 0.55 : 1.5, 0.24);
}

function addReel(g, x, z, metal, green, brass) {
  addCyl(g, 0.018, 0.018, 0.85, metal, x, 4.55, z, 8);
  const drum = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.08, 18), green);
  drum.rotation.z = Math.PI / 2;
  drum.position.set(x, 4.05, z);
  g.add(drum);
  for (const side of [-1, 1]) {
    const cheek = new THREE.Mesh(new THREE.CylinderGeometry(0.21, 0.21, 0.016, 18), toon('#8e969c'));
    cheek.rotation.z = Math.PI / 2;
    cheek.position.set(x + side * 0.05, 4.05, z);
    g.add(cheek);
  }
  const cord = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.008, 6, 16), brass);
  cord.rotation.y = Math.PI / 2;
  cord.position.set(x, 4.05, z);
  g.add(cord);
  const tail = addCyl(g, 0.006, 0.006, 0.42, brass, x, 3.78, z, 6);
  tail.userData.noCast = true;
}

function addPegRail(g, metal, brass) {
  addBox(g, 0.025, 0.025, 2.4, metal, -6.16, 1.73, 2.95);
  for (let z = 1.8; z <= 4.06; z += 0.45) {
    addBox(g, 0.04, 0.012, 0.012, brass, -6.13, 1.73, z);
  }
  addBox(g, 0.025, 0.025, 0.28, metal, -6.16, 1.73, -0.55);
  addBox(g, 0.04, 0.012, 0.012, brass, -6.13, 1.73, -0.55);
}

function addCoachBay(g, wood, green) {
  const table = COACH_FIT.table;
  const stool = COACH_FIT.stool;
  const board = COACH_FIT.diagram;
  const top = toon('#8d6846');
  const leg = toon('#5c4634');
  const paper = toon('#f4f0e6');

  const slab = addBox(g, table.hx * 2, 0.032, table.hz * 2, top, table.x, table.top, table.z);
  slab.userData.noCast = true;
  addBox(g, table.hx * 2 - 0.06, 0.06, table.hz * 2 - 0.06, leg, table.x, table.top - 0.05, table.z);
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      addBox(
        g, 0.045, table.top - 0.04, 0.045, leg,
        table.x + sx * (table.hx - 0.06),
        (table.top - 0.04) / 2,
        table.z + sz * (table.hz - 0.08),
      );
    }
  }
  addBox(g, 0.22, 0.012, 0.16, paper, table.x - 0.02, table.top + 0.022, table.z + 0.08);
  const pencil = addBox(g, 0.012, 0.008, 0.16, toon('#c4a06a'), table.x + 0.14, table.top + 0.02, table.z - 0.06);
  pencil.userData.noCast = true;
  shadowBlob(g, table.x, table.z, table.hx * 2 + 0.1, table.hz * 2 + 0.08, 0.22);

  addBox(g, stool.hx * 2, 0.04, stool.hz * 2, top, stool.x, stool.seat, stool.z);
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      addBox(
        g, 0.032, stool.seat - 0.02, 0.032, leg,
        stool.x + sx * (stool.hx - 0.04),
        (stool.seat - 0.02) / 2,
        stool.z + sz * (stool.hz - 0.04),
      );
    }
  }
  addBox(g, stool.hx * 2 - 0.04, 0.02, 0.028, leg, stool.x, 0.2, stool.z);
  shadowBlob(g, stool.x, stool.z, 0.42, 0.42, 0.2);

  const face = new THREE.Mesh(new THREE.PlaneGeometry(board.w - 0.06, board.h - 0.06), toon('#f4f0e6', { map: paintLesson() }));
  face.position.set(board.x, board.y, board.z);
  face.rotation.y = -Math.PI / 2;
  face.userData.noCast = true;
  g.add(face);
  const frame = toon('#5c4634');
  addBox(g, 0.02, board.h, 0.028, frame, board.x, board.y, board.z - board.w / 2);
  addBox(g, 0.02, board.h, 0.028, frame, board.x, board.y, board.z + board.w / 2);
  addBox(g, 0.02, 0.028, board.w, frame, board.x, board.y + board.h / 2, board.z);
  addBox(g, 0.02, 0.028, board.w, frame, board.x, board.y - board.h / 2, board.z);
  const rail = addBox(g, 0.03, 0.012, board.w + 0.08, green, board.x + 0.01, board.y + board.h / 2 + 0.04, board.z);
  rail.userData.noCast = true;

  const bay = addBox(g, 0.1, 0.025, 0.72, toon('#fff4e2', { emissive: '#fff1d4', emissiveIntensity: 0.7 }), 5.7, HALL.soffitY - 0.14, table.z);
  bay.userData.noCast = true;
}

function addLames(g, cloth, metal, brass) {
  for (const z of [4.55, 5.1, 5.6]) {
    addBox(g, 0.02, 0.07, 0.03, brass, -6.16, 1.78, z);
    addBox(g, 0.015, 0.012, 0.32, metal, -6.1, 1.74, z);
    addBox(g, 0.012, 0.14, 0.012, metal, -6.08, 1.66, z - 0.14);
    addBox(g, 0.012, 0.14, 0.012, metal, -6.08, 1.66, z + 0.14);
    addBox(g, 0.06, 0.5, 0.36, cloth, -6.02, 1.38, z);
    addBox(g, 0.05, 0.07, 0.16, cloth, -6.0, 1.66, z);
  }
}

function addShelfGoods(g, cloth, green, brass) {
  const y0 = 0.98;
  const y1 = 1.28;
  const zs = [2.48, 2.66, 2.84];
  for (const z of zs) {
    addBox(g, 0.07, 0.045, 0.09, cloth, -5.92, y0, z);
    addCyl(g, 0.028, 0.028, 0.02, green, -5.9, y1, z, 10);
    addCyl(g, 0.012, 0.012, 0.03, brass, -5.9, y1 + 0.02, z, 8);
  }
}

function quietShadows(prepared, { cast, receive }) {
  prepared.traverse((obj) => {
    if (!obj.isMesh) return;
    if (cast === false) obj.userData.noCast = true;
    if (receive === false) obj.userData.noReceive = true;
  });
}

function tuneAsset(kind, prepared) {
  if (kind === 'foil' || kind === 'epee' || kind === 'sabre' || kind === 'weapon_rack') {
    quietShadows(prepared, { cast: false, receive: false });
  }
  if (kind === 'mask') quietShadows(prepared, { cast: false, receive: false });
}

const _procedural = makeProcedural;
function makeProceduralWithBlobs(layout) {
  const g = _procedural(layout);
  for (const inst of layout.instances) {
    if (inst.kind === 'museum_bench') continue;
    if (inst.position[1] > 0.2 && inst.kind !== 'weapon_rack' && inst.kind !== 'wall_shelf') continue;
    if (inst.kind === 'foil' || inst.kind === 'epee' || inst.kind === 'sabre' || inst.kind === 'mask') continue;
    const wide = inst.kind === 'weapon_rack';
    shadowBlob(
      g,
      inst.position[0],
      inst.position[2],
      wide ? 1.15 : 0.55,
      wide ? 0.7 : 0.5,
      0.22,
    );
  }
  return g;
}

boot({
  makeShell,
  makeProcedural: makeProceduralWithBlobs,
  tuneAsset,
  readyText: 'ready — drag orbit · U unlit · T toon',
});
