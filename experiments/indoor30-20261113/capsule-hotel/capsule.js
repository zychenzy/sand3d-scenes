import * as THREE from 'three';
import { boot, toon, addBox, addCyl, addContact } from './scene_lib.js';
import {
  audit,
  bayZ,
  buildInstances,
  ladderCenterZ,
  ladderOuterX,
  ladderRungs,
  levelSpan,
  lockerRecords,
  mattressTop,
  openingBottom,
  podBackX,
  podRecords,
  pointLights,
} from './metrics.mjs';

const PAL = {
  floor: '#8c8378',
  floorEdge: '#6f675e',
  runner: '#3e4854',
  wall: '#e7e0d4',
  wallDeep: '#d4cdc0',
  ceil: '#f4f0e8',
  soffit: '#e6dfd2',
  shell: '#f6f1e7',
  interior: '#fff8ef',
  platform: '#e6d9c6',
  ink: '#343b4a',
  inkSoft: '#4a5364',
  sill: '#b08960',
  mattress: '#f7f3ea',
  sheet: '#fffdf8',
  duvet: '#e6dcd0',
  throw: '#d7c4b0',
  brass: '#c6a36a',
  leak: '#ffc98a',
  lamp: '#ffb15a',
  steel: '#5e6772',
  steelDark: '#3e4650',
  mirror: '#d5e2ea',
  basin: '#f4f7f8',
  towel: '#cfc6ba',
  wood: '#8d6244',
  number: '#f3ecdf',
  numberInk: '#2c3340',
};

function rr(path, cx, cy, w, h, r, clockwise) {
  const x = cx - w / 2;
  const y = cy - h / 2;
  const rad = Math.min(r, w / 2 - 0.001, h / 2 - 0.001);
  if (!clockwise) {
    path.moveTo(x + rad, y);
    path.lineTo(x + w - rad, y);
    path.absarc(x + w - rad, y + rad, rad, -Math.PI / 2, 0, false);
    path.lineTo(x + w, y + h - rad);
    path.absarc(x + w - rad, y + h - rad, rad, 0, Math.PI / 2, false);
    path.lineTo(x + rad, y + h);
    path.absarc(x + rad, y + h - rad, rad, Math.PI / 2, Math.PI, false);
    path.lineTo(x, y + rad);
    path.absarc(x + rad, y + rad, rad, Math.PI, Math.PI * 1.5, false);
  } else {
    path.moveTo(x + rad, y);
    path.absarc(x + rad, y + rad, rad, -Math.PI / 2, -Math.PI, true);
    path.lineTo(x, y + h - rad);
    path.absarc(x + rad, y + h - rad, rad, Math.PI, Math.PI / 2, true);
    path.lineTo(x + w - rad, y + h);
    path.absarc(x + w - rad, y + h - rad, rad, Math.PI / 2, 0, true);
    path.lineTo(x + w, y + rad);
    path.absarc(x + w - rad, y + rad, rad, 0, -Math.PI / 2, true);
    path.lineTo(x + rad, y);
  }
}

function extrudeYZ(shape, depth) {
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: false,
    curveSegments: 10,
  });
  geo.rotateY(-Math.PI / 2);
  return geo;
}

function addMesh(group, geo, mat, x, y, z, opts = {}) {
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(x, y, z);
  if (opts.rotX) mesh.rotation.x = opts.rotX;
  if (opts.rotY) mesh.rotation.y = opts.rotY;
  if (opts.rotZ) mesh.rotation.z = opts.rotZ;
  mesh.castShadow = opts.castShadow !== false;
  mesh.receiveShadow = opts.receiveShadow !== false;
  if (opts.noCast) mesh.userData.noCast = true;
  if (opts.unshaded) mesh.userData.unshaded = true;
  if (opts.name) mesh.name = opts.name;
  group.add(mesh);
  return mesh;
}

function labelTexture(text) {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 64;
  const g = c.getContext('2d');
  g.fillStyle = PAL.number;
  g.fillRect(0, 0, 128, 64);
  g.strokeStyle = PAL.brass;
  g.lineWidth = 4;
  g.strokeRect(4, 4, 120, 56);
  g.fillStyle = PAL.numberInk;
  g.font = '600 36px Palatino, Georgia, serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(text, 64, 34);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 2;
  return tex;
}

function fasciaShape(pod, pitch) {
  const shape = new THREE.Shape();
  const top = pod.upperCeiling + 0.06;
  shape.moveTo(-pitch / 2, 0);
  shape.lineTo(pitch / 2, 0);
  shape.lineTo(pitch / 2, top);
  shape.lineTo(-pitch / 2, top);
  shape.lineTo(-pitch / 2, 0);
  for (const level of ['lower', 'upper']) {
    const hole = new THREE.Path();
    const y = openingBottom(pod, level) + pod.openingH / 2;
    rr(hole, 0, y, pod.openingW, pod.openingH, pod.openingR, true);
    shape.holes.push(hole);
  }
  return shape;
}

function rimShape(pod, level) {
  const y = openingBottom(pod, level) + pod.openingH / 2;
  const shape = new THREE.Shape();
  rr(shape, 0, y, pod.openingW + 0.07, pod.openingH + 0.07, pod.openingR + 0.035, false);
  const hole = new THREE.Path();
  rr(hole, 0, y, pod.openingW - 0.01, pod.openingH - 0.01, Math.max(0.08, pod.openingR - 0.01), true);
  shape.holes.push(hole);
  return shape;
}

function mattressGeo(length, width, thick) {
  const shape = new THREE.Shape();
  rr(shape, 0, 0, length, width, 0.07, false);
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: thick,
    bevelEnabled: true,
    bevelThickness: 0.008,
    bevelSize: 0.01,
    bevelSegments: 2,
    curveSegments: 8,
  });
  geo.rotateX(-Math.PI / 2);
  return geo;
}

function makeShell(layout) {
  const g = new THREE.Group();
  g.name = 'shell';
  const room = layout.meta.room;
  const t = room.wallT;
  const width = room.maxX - room.minX;
  const depth = room.maxZ - room.minZ;
  const cx = (room.minX + room.maxX) / 2;
  const cz = (room.minZ + room.maxZ) / 2;
  const floorMat = toon(PAL.floor, { polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 });
  addBox(g, width + 0.4, 0.08, depth + 0.5, floorMat, cx, -0.04, cz, { name: 'floor' });
  addBox(g, width, t, 0.12, toon(PAL.floorEdge), cx, 0.04, room.maxZ - 0.02, { noCast: true });
  addBox(g, t, room.height, depth, toon(PAL.wall), room.minX + t / 2, room.height / 2, cz);
  addBox(g, t, room.height, depth, toon(PAL.wall), room.maxX - t / 2, room.height / 2, cz);
  addBox(g, width, room.height, t, toon(PAL.wallDeep), cx, room.height / 2, room.maxZ - t / 2);
  addBox(g, width, 0.06, depth, toon(PAL.ceil), cx, room.height - 0.03, cz, { noCast: true });
  const groom = layout.meta.groom;
  addBox(
    g,
    width - 0.2,
    room.height - 2.16,
    room.maxZ - groom.z0,
    toon(PAL.soffit),
    cx,
    2.16 + (room.height - 2.16) / 2,
    (groom.z0 + room.maxZ) / 2,
    { name: 'soffit' },
  );
  addEnd(g, layout);
  addBox(g, 0.025, 0.09, depth - 0.3, toon(PAL.floorEdge), room.maxX - t - 0.03, 0.045, cz, { noCast: true, name: 'baseboard' });
  const runnerZ0 = room.minZ + 0.35;
  const runnerZ1 = groom.z0 - 0.05;
  addBox(
    g,
    0.72,
    0.012,
    runnerZ1 - runnerZ0,
    toon(PAL.runner, { polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 }),
    0.52,
    0.006,
    (runnerZ0 + runnerZ1) / 2,
    { name: 'runner', noCast: true },
  );
  return g;
}

function addBay(g, layout, index) {
  const pod = layout.meta.pod;
  const z = bayZ(pod, index);
  const back = podBackX(pod);
  const face = pod.faceX;
  const length = pod.interiorLength;
  const midX = (back + face) / 2;
  const shellMat = toon(PAL.shell, { side: THREE.DoubleSide });
  const ink = toon(PAL.ink, { side: THREE.DoubleSide });
  const interior = toon(PAL.interior);
  const platform = toon(PAL.platform);

  const fascia = extrudeYZ(fasciaShape(pod, pod.pitch), pod.frameD);
  addMesh(g, fascia, shellMat, face, 0, z, { name: `fascia_${index}` });
  for (const level of ['lower', 'upper']) {
    const rim = extrudeYZ(rimShape(pod, level), 0.018);
    addMesh(g, rim, ink, face + 0.012, 0, z, { name: `rim_${index}_${level}`, noCast: true });
    const span = levelSpan(pod, level);
    const oy = openingBottom(pod, level);
    addBox(g, 0.05, 0.012, 0.22, toon(PAL.inkSoft), face + 0.03, oy + pod.openingH + 0.06, z - 0.12, { noCast: true });
    addBox(g, 0.05, 0.012, 0.22, toon(PAL.inkSoft), face + 0.03, oy + pod.openingH + 0.06, z, { noCast: true });
    addBox(g, 0.05, 0.012, 0.22, toon(PAL.inkSoft), face + 0.03, oy + pod.openingH + 0.06, z + 0.12, { noCast: true });
    addBox(g, 0.07, 0.028, pod.openingW * 0.72, toon(PAL.sill), face + 0.02, oy - 0.01, z, { name: 'sill' });
    addBox(g, length - 0.02, 0.04, pod.interiorWidth, platform, midX, span.floor - 0.02, z);
    addBox(g, 0.04, span.ceiling - span.floor, pod.interiorWidth - 0.04, interior, back + 0.025, (span.floor + span.ceiling) / 2, z);
    const sideH = span.ceiling - span.floor;
    const sideY = (span.floor + span.ceiling) / 2;
    addBox(g, length - 0.08, sideH, 0.03, interior, midX, sideY, z - pod.interiorWidth / 2 + 0.02);
    addBox(g, length - 0.08, sideH, 0.03, interior, midX, sideY, z + pod.interiorWidth / 2 - 0.02);
  }
  addBox(g, length, pod.upperCeiling - pod.lowerCeiling, 0.04, shellMat, midX, (pod.lowerCeiling + pod.upperFloor) / 2, z - pod.interiorWidth / 2);
  addBox(g, length, pod.upperCeiling - pod.lowerCeiling, 0.04, shellMat, midX, (pod.lowerCeiling + pod.upperFloor) / 2, z + pod.interiorWidth / 2);
  addBox(g, length, 0.08, pod.interiorWidth + 0.04, shellMat, midX, (pod.lowerCeiling + pod.upperFloor) / 2, z);
  addBox(g, 0.05, pod.upperCeiling, pod.pitch, shellMat, back - 0.02, pod.upperCeiling / 2, z);
  const pier = (pod.pitch - pod.interiorWidth) / 2;
  addBox(g, 0.08, pod.upperCeiling + 0.06, pier, shellMat, face - 0.02, (pod.upperCeiling + 0.06) / 2, z - pod.pitch / 2 + pier / 2);
  addBox(g, 0.08, pod.upperCeiling + 0.06, pier, shellMat, face - 0.02, (pod.upperCeiling + 0.06) / 2, z + pod.pitch / 2 - pier / 2);
}

function addBedding(g, layout, rec) {
  const pod = layout.meta.pod;
  const length = pod.interiorLength - pod.mattressGap * 2 - 0.08;
  const width = pod.interiorWidth - 0.12;
  const geo = mattressGeo(length, width, pod.mattressT);
  const x = (pod.faceX + podBackX(pod)) / 2 - 0.02;
  addMesh(g, geo, toon(PAL.mattress), x, rec.floor + 0.012, rec.z, { name: `mattress_${rec.no}`, receiveShadow: true });
  const quilt = new THREE.SphereGeometry(1, 18, 12);
  quilt.scale(0.52, 0.07, 0.34);
  addMesh(g, quilt, toon(PAL.duvet), pod.faceX - 0.72, rec.mattressY + 0.06, rec.z, { name: `duvet_${rec.no}` });
  const fold = new THREE.SphereGeometry(1, 16, 12);
  fold.scale(0.16, 0.06, 0.3);
  addMesh(g, fold, toon(PAL.throw), pod.faceX - 0.34, rec.mattressY + 0.07, rec.z + 0.04, { name: `fold_${rec.no}` });
  const sham = new THREE.SphereGeometry(1, 16, 12);
  sham.scale(0.12, 0.055, 0.2);
  addMesh(g, sham, toon(PAL.sheet), podBackX(pod) + 0.46, rec.mattressY + 0.02, rec.z - 0.08, { name: `sham_${rec.no}` });
  addBox(
    g,
    0.1,
    0.028,
    0.055,
    toon(PAL.ink),
    pod.faceX - 0.36,
    rec.floor + 0.2,
    rec.z - pod.interiorWidth / 2 + 0.07,
    { name: `panel_${rec.no}` },
  );
  addCyl(
    g,
    0.008,
    0.008,
    0.008,
    new THREE.MeshBasicMaterial({ color: PAL.lamp }),
    pod.faceX - 0.32,
    rec.floor + 0.22,
    rec.z - pod.interiorWidth / 2 + 0.07,
    8,
    { rotX: Math.PI / 2, unshaded: true, noCast: true },
  );
}

function hangFolds(g, cloth, x, yBottom, yTop, z0, z1, count, name, overlap = 0.86) {
  const span = Math.max(0.05, z1 - z0);
  const mid = (z0 + z1) / 2;
  addCyl(g, 0.008, 0.008, span + 0.04, toon(PAL.inkSoft), x + 0.012, yTop - 0.01, mid, 8, {
    rotX: Math.PI / 2,
    noCast: true,
    name: `${name}_rail`,
  });
  const pitch = span / count;
  const r = Math.min(0.046, pitch * overlap);
  for (let i = 0; i < count; i++) {
    const z = z0 + pitch * (i + 0.5);
    const hem = 0.016 + (i % 2) * 0.055;
    const h = Math.max(0.14, yTop - 0.028 - yBottom - hem);
    const depth = (i % 2 === 0 ? 0.55 : -0.4) * r;
    addCyl(g, r * 0.9, r, h, cloth, x + depth, yBottom + hem + h / 2, z, 10, { name });
  }
}

function addCurtain(g, layout, rec) {
  const pod = layout.meta.pod;
  const cloth = toon(layout.meta.palette[rec.cloth] || PAL.indigo, { side: THREE.DoubleSide });
  const y0 = openingBottom(pod, rec.level);
  const y1 = y0 + pod.openingH;
  const x = pod.faceX + 0.034;
  const left = rec.z - pod.openingW / 2 + 0.05;
  const right = rec.z + pod.openingW / 2 - 0.05;
  if (rec.curtain === 'open') {
    hangFolds(g, cloth, x, y0, y1, left, left + 0.14, 5, `bunch_${rec.no}`, 1.35);
    return;
  }
  if (rec.curtain === 'half') {
    hangFolds(g, cloth, x, y0, y1, left, rec.z - 0.02, 8, `curtain_${rec.no}`);
  } else {
    hangFolds(g, cloth, x, y0, y1, left, right, 14, `curtain_${rec.no}`);
  }
  const leak = new THREE.Mesh(
    new THREE.BoxGeometry(0.008, 0.02, rec.curtain === 'half' ? 0.28 : 0.55),
    new THREE.MeshBasicMaterial({ color: PAL.leak }),
  );
  leak.position.set(x - 0.01, y0 + 0.02, rec.curtain === 'half' ? left + 0.16 : rec.z);
  leak.userData.unshaded = true;
  leak.userData.noCast = true;
  g.add(leak);
}

function addEnd(g, layout) {
  const room = layout.meta.room;
  const t = room.wallT;
  const z = room.minZ + t / 2;
  const width = room.maxX - room.minX - t * 2;
  const cx = (room.minX + room.maxX) / 2;
  addBox(g, width, room.height, t, toon(PAL.wall), cx, room.height / 2, z, { name: 'end-wall' });
  const doorW = 0.9;
  const doorH = 2.04;
  const doorX = 0.58;
  const face = z + t / 2 + 0.015;
  addBox(g, doorW + 0.1, doorH + 0.08, 0.045, toon(PAL.ink), doorX, 0.04 + doorH / 2, face, { name: 'door-frame' });
  addBox(g, doorW, doorH, 0.038, toon('#c9b79a'), doorX, 0.02 + doorH / 2, face + 0.028, { name: 'entry-door' });
  addBox(g, 0.26, 0.46, 0.012, toon(PAL.mirror, { emissive: '#e7f2f6', emissiveIntensity: 0.22 }), doorX, 1.48, face + 0.05, { noCast: true, name: 'door-lite' });
  addCyl(g, 0.01, 0.01, 0.24, toon(PAL.brass), doorX + doorW / 2 - 0.1, 1.02, face + 0.07, 8, { name: 'door-pull' });
}

function addLadder(g, layout, index) {
  const { pod, ladder } = layout.meta;
  const z = ladderCenterZ(pod, index);
  const x = pod.faceX + ladder.xGap + ladder.protrusion / 2;
  const railH = pod.upperFloor + ladder.railExtra - 0.04;
  const steel = toon(PAL.steel);
  const dark = toon(PAL.steelDark);
  const half = ladder.width / 2 - ladder.rail;
  addBox(g, 0.02, railH, ladder.rail, steel, x, 0.04 + railH / 2, z - half, { name: `rail_${index}` });
  addBox(g, 0.02, railH, ladder.rail, steel, x, 0.04 + railH / 2, z + half, { name: `rail_${index}b` });
  for (const y of ladderRungs(ladder)) {
    addCyl(g, ladder.rungD / 2, ladder.rungD / 2, ladder.width - 0.04, dark, x, y, z, 10, { rotX: Math.PI / 2, name: `rung_${index}` });
  }
}

function addNumbers(g, layout) {
  for (const rec of podRecords(layout)) {
    const y = openingBottom(layout.meta.pod, rec.level) + layout.meta.pod.openingH + 0.11;
    const mat = toon('#ffffff', { map: labelTexture(rec.no), emissive: '#ffffff', emissiveMap: labelTexture(rec.no), emissiveIntensity: 0.15 });
    const plate = new THREE.Mesh(new THREE.PlaneGeometry(0.1, 0.05), mat);
    plate.position.set(layout.meta.pod.faceX + 0.03, y, rec.z + layout.meta.pod.openingW / 2 - 0.02);
    plate.userData.noCast = true;
    g.add(plate);
  }
  const lockers = lockerRecords(layout);
  lockers.forEach((locker, i) => {
    const mat = toon('#ffffff', { map: labelTexture(String(i + 1).padStart(2, '0')) });
    const plate = new THREE.Mesh(new THREE.PlaneGeometry(0.07, 0.035), mat);
    plate.position.set(locker.faceX - 0.008, locker.position[1] + 0.34, locker.position[2]);
    plate.rotation.y = -Math.PI / 2;
    plate.userData.noCast = true;
    g.add(plate);
    addContact(g, locker.position[0], locker.position[2], 0.2, 0.16, 0.16);
  });
}

function mirrorTexture() {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 320;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#b7c9d4';
  ctx.fillRect(0, 0, 256, 320);
  ctx.fillStyle = '#e7e0d4';
  ctx.fillRect(0, 36, 78, 188);
  ctx.fillStyle = '#44558f';
  ctx.fillRect(16, 78, 40, 52);
  ctx.fillRect(16, 146, 40, 48);
  ctx.fillStyle = '#e07a45';
  ctx.fillRect(18, 208, 28, 36);
  ctx.fillStyle = '#8c8378';
  ctx.fillRect(0, 214, 256, 106);
  ctx.fillStyle = '#3e4854';
  ctx.fillRect(96, 228, 64, 92);
  ctx.fillStyle = '#d9d3c6';
  ctx.fillRect(188, 70, 52, 140);
  ctx.strokeStyle = 'rgba(255,255,255,0.62)';
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.moveTo(28, 18);
  ctx.lineTo(210, 300);
  ctx.stroke();
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 2;
  return tex;
}

function addBasin(g, x, y, z) {
  const rim = new THREE.TorusGeometry(0.16, 0.018, 8, 28);
  rim.rotateX(Math.PI / 2);
  rim.scale(1.35, 1, 0.78);
  addMesh(g, rim, toon('#8e9c98'), x, y + 0.055, z, { name: 'basin-rim' });
  const bowl = new THREE.SphereGeometry(0.16, 22, 12, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2);
  bowl.scale(1.35, 0.42, 0.78);
  addMesh(g, bowl, toon(PAL.basin), x, y + 0.05, z, { name: 'basin-bowl' });
  addCyl(g, 0.02, 0.014, 0.014, toon(PAL.inkSoft), x, y + 0.018, z, 10, { noCast: true });
}

function addGroom(g, layout) {
  const room = layout.meta.room;
  const groom = layout.meta.groom;
  const counterZ = groom.backZ - groom.counterD / 2;
  const counterW = groom.counterX1 - groom.counterX0;
  const cx = (groom.counterX0 + groom.counterX1) / 2;
  addBox(g, counterW, groom.counterH - 0.04, groom.counterD, toon(PAL.shell), cx, (groom.counterH - 0.04) / 2, counterZ);
  addBox(g, counterW + 0.04, 0.035, groom.counterD + 0.04, toon(PAL.sill), cx, groom.counterH - 0.018, counterZ, { name: 'countertop' });
  addBasin(g, groom.sinkX, groom.counterH, counterZ - 0.14);
  addCyl(g, 0.012, 0.012, 0.2, toon(PAL.brass), groom.sinkX, groom.counterH + 0.14, counterZ + 0.02, 8);
  addCyl(g, 0.01, 0.01, 0.16, toon(PAL.brass), groom.sinkX, groom.counterH + 0.22, counterZ - 0.06, 8, { rotX: Math.PI / 2 });
  const glass = mirrorTexture();
  addBox(g, groom.mirrorW + 0.08, groom.mirrorH + 0.08, 0.035, toon(PAL.ink), groom.sinkX, groom.mirrorY, groom.backZ - room.wallT - 0.02, { noCast: true, name: 'mirror-frame' });
  const mirror = new THREE.Mesh(
    new THREE.PlaneGeometry(groom.mirrorW, groom.mirrorH),
    toon('#ffffff', { map: glass, emissive: '#ffffff', emissiveMap: glass, emissiveIntensity: 0.4, side: THREE.FrontSide }),
  );
  mirror.position.set(groom.sinkX, groom.mirrorY, groom.backZ - room.wallT - 0.045);
  mirror.rotation.y = Math.PI;
  mirror.userData.noCast = true;
  g.add(mirror);
  addBox(g, 0.035, groom.mirrorH + 0.08, 0.03, new THREE.MeshBasicMaterial({ color: '#fff6ea' }), groom.sinkX - groom.mirrorW / 2 - 0.05, groom.mirrorY, groom.backZ - 0.1, { unshaded: true, noCast: true });
  addBox(g, 0.035, groom.mirrorH + 0.08, 0.03, new THREE.MeshBasicMaterial({ color: '#fff6ea' }), groom.sinkX + groom.mirrorW / 2 + 0.05, groom.mirrorY, groom.backZ - 0.1, { unshaded: true, noCast: true });
  addCyl(g, 0.012, 0.012, 0.42, toon(PAL.brass), groom.sinkX + 0.55, groom.counterH + 0.16, counterZ, 8, { rotZ: Math.PI / 2 });
  addBox(g, 0.28, 0.42, 0.02, toon(PAL.towel), groom.sinkX + 0.62, groom.counterH - 0.08, counterZ + 0.02);
  const plaque = toon('#ffffff', { map: labelTexture('QUIET'), emissive: '#ffffff', emissiveMap: labelTexture('QUIET'), emissiveIntensity: 0.12 });
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(0.36, 0.12), plaque);
  sign.position.set(layout.meta.lockers.faceX + layout.meta.lockers.d + 0.02, 1.7, -3.15);
  sign.rotation.y = -Math.PI / 2;
  sign.userData.noCast = true;
  g.add(sign);
}

function addHallLights(g) {
  const fixture = toon(PAL.ceil, { emissive: '#fff1d2', emissiveIntensity: 0.8 });
  for (const z of [-2.3, -0.55, 1.15]) {
    addCyl(g, 0.07, 0.05, 0.03, fixture, 0.48, 2.4, z, 16, { noCast: true, name: 'downlight' });
  }
}

function addSlippers(g, layout) {
  const pod = layout.meta.pod;
  const z = bayZ(pod, 0) - pod.pitch / 2 - 0.12;
  const mat = toon(PAL.throw);
  const geo = new THREE.CapsuleGeometry(0.035, 0.08, 3, 8);
  geo.rotateZ(Math.PI / 2);
  addMesh(g, geo, mat, -0.02, 0.04, z, { name: 'slipper_a' });
  addMesh(g, geo.clone(), mat, -0.02, 0.04, z + 0.1, { name: 'slipper_b' });
}

function makeProcedural(layout) {
  const g = new THREE.Group();
  g.name = 'architecture';
  for (let i = 0; i < layout.meta.pod.bayCount; i++) {
    addBay(g, layout, i);
    addLadder(g, layout, i);
  }
  for (const rec of podRecords(layout)) {
    addBedding(g, layout, rec);
    addCurtain(g, layout, rec);
  }
  addNumbers(g, layout);
  addGroom(g, layout);
  addHallLights(g);
  addSlippers(g, layout);
  return g;
}

boot({
  prepareLayout(layout) {
    layout.instances = buildInstances(layout);
    layout.lights.points = pointLights(layout);
    window.__audit = audit(layout);
  },
  makeShell,
  makeProcedural,
  readyText: 'sleeping floor — drag orbit · U unlit · T toon',
});

window.__ladderOuterX = ladderOuterX;
