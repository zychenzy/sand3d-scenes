import * as THREE from 'three';
import { boot, toon, addBox, addCyl, addContact } from './scene_lib.js';

const texCache = new Map();

function canvasTex(key, draw, w, h) {
  if (texCache.has(key)) return texCache.get(key);
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d'), w, h);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  texCache.set(key, tex);
  return tex;
}

function grainMap() {
  return canvasTex('grain', (g, w, h) => {
    g.fillStyle = '#8d6a45';
    g.fillRect(0, 0, w, h);
    g.globalAlpha = 0.16;
    for (let y = 2; y < h; y += 3) {
      g.strokeStyle = y % 6 === 2 ? '#5c4128' : '#c4a078';
      g.beginPath();
      g.moveTo(0, y);
      g.lineTo(w, y + ((y * 3) % 2));
      g.stroke();
    }
    g.globalAlpha = 0.08;
    for (let x = 8; x < w; x += 17) {
      g.strokeStyle = '#6b4e34';
      g.beginPath();
      g.moveTo(x, 0);
      g.lineTo(x + 2, h);
      g.stroke();
    }
  }, 128, 128);
}

function floorMap() {
  const tex = canvasTex('floor', (g, w, h) => {
    g.fillStyle = '#d7d1c4';
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 420; i++) {
      const x = (i * 47) % w;
      const y = (i * 29) % h;
      g.fillStyle = i % 3 === 0 ? '#cfc6b6' : '#e4ddd0';
      g.fillRect(x, y, 2, 2);
    }
  }, 128, 128);
  tex.repeat.set(28, 21);
  return tex;
}

function signTex(title, sub, bg, fg) {
  return canvasTex(`sign:${title}:${sub}`, (g, w, h) => {
    g.fillStyle = bg;
    g.fillRect(0, 0, w, h);
    g.fillStyle = fg;
    g.fillRect(0, 0, 18, h);
    g.fillStyle = '#f7f4ee';
    g.font = `700 ${Math.floor(h * 0.34)}px Georgia, serif`;
    g.textAlign = 'left';
    g.textBaseline = 'middle';
    g.fillText(title, 40, sub ? h * 0.38 : h / 2);
    if (sub) {
      g.font = `500 ${Math.floor(h * 0.2)}px Georgia, serif`;
      g.fillStyle = '#d7e6dc';
      g.fillText(sub, 40, h * 0.72);
    }
  }, 512, 180);
}

function boardTex() {
  return canvasTex('board', (g, w, h) => {
    g.fillStyle = '#f7f4ee';
    g.fillRect(0, 0, w, h);
    g.fillStyle = '#2f6f62';
    g.fillRect(0, 0, w, 70);
    g.fillStyle = '#f7f4ee';
    g.font = '700 36px Georgia, serif';
    g.textAlign = 'left';
    g.fillText('TODAY  ·  OPEN', 24, 46);
    const rows = [
      ['09:20', 'feline consult'],
      ['10:05', 'canine weigh'],
      ['11:00', 'exam 1'],
      ['11:40', 'feline consult'],
    ];
    rows.forEach((row, i) => {
      const y = 120 + i * 78;
      g.fillStyle = i % 2 ? '#e7f0ea' : '#f7f4ee';
      g.fillRect(16, y - 28, w - 32, 64);
      g.fillStyle = '#24343c';
      g.font = '600 32px Georgia, serif';
      g.fillText(row[0], 36, y + 8);
      g.font = '500 28px Georgia, serif';
      g.fillStyle = '#2f6f62';
      g.fillText(row[1], 180, y + 8);
    });
  }, 640, 460);
}

function digitTex() {
  return canvasTex('digits', (g, w, h) => {
    g.fillStyle = '#10241c';
    g.fillRect(0, 0, w, h);
    g.fillStyle = '#b6f2c8';
    g.font = '700 86px ui-monospace, monospace';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText('18.6 kg', w / 2, h / 2);
  }, 320, 120);
}

function smallDigitTex() {
  return canvasTex('catdigits', (g, w, h) => {
    g.fillStyle = '#10241c';
    g.fillRect(0, 0, w, h);
    g.fillStyle = '#b6f2c8';
    g.font = '700 48px ui-monospace, monospace';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText('4.2', w / 2, h / 2);
  }, 160, 80);
}

function posterTex() {
  return canvasTex('poster', (g, w, h) => {
    g.fillStyle = '#f4f7f6';
    g.fillRect(0, 0, w, h);
    g.fillStyle = '#2f6f62';
    g.fillRect(0, 0, w, 64);
    g.fillStyle = '#f7f4ee';
    g.font = '700 32px Georgia, serif';
    g.textAlign = 'center';
    g.fillText('VACCINE CARD', w / 2, 42);
    const items = ['distemper', 'rabies', 'lepto', 'bordetella'];
    items.forEach((name, i) => {
      const y = 110 + i * 78;
      g.fillStyle = '#d7e6dc';
      g.fillRect(36, y, 36, 36);
      g.fillStyle = '#24343c';
      g.font = '600 28px Georgia, serif';
      g.textAlign = 'left';
      g.fillText(name, 88, y + 26);
    });
  }, 420, 460);
}

function mat(hex, opts) {
  return toon(hex, opts);
}

function fineWood() {
  const map = grainMap();
  map.repeat.set(8, 3);
  return mat('#8d6a45', { map });
}

function makeShell(layout) {
  const g = new THREE.Group();
  g.name = 'shell';
  const S = layout.shell;
  const room = layout.meta.room;
  const hw = room.width / 2;
  const hd = room.depth / 2;
  const H = room.height;
  const floorMat = mat(S.floor, { map: floorMap() });
  addBox(g, room.width, 0.08, room.depth, floorMat, 0, -0.04, 0, { noCast: true, name: 'floor' });

  const wall = mat(S.wall);
  const wain = mat(S.wainscot);
  const rail = mat(S.rail);
  addBox(g, room.width, H, 0.14, wall, 0, H / 2, -hd + 0.07, { noCast: true, name: 'back-wall' });
  addBox(g, 0.14, H, room.depth, wall, -hw + 0.07, H / 2, 0, { noCast: true, name: 'left-wall' });
  addBox(g, room.width - 0.14, 1.05, 0.02, wain, 0.07, 0.525, -hd + 0.15, { noCast: true });
  addBox(g, 0.02, 1.05, room.depth - 0.14, wain, -hw + 0.16, 0.525, 0.07, { noCast: true });
  addBox(g, room.width - 0.14, 0.04, 0.04, rail, 0.07, 1.07, -hd + 0.16, { noCast: true });
  addBox(g, 0.04, 0.04, room.depth - 0.14, rail, -hw + 0.18, 1.07, 0.07, { noCast: true });
  addBox(g, room.width, 0.08, room.depth, mat(S.ceiling), 0, H - 0.04, 0, { noCast: true, name: 'ceiling' });

  const b = layout.build;
  const runner = mat(S.runner);
  addBox(g, 1.15, 0.012, 5.2, runner, b.portal.cx + 0.45, 0.008, 0.9, { noCast: true, name: 'runner' });
  addBox(g, 2.55, 0.012, 4.15, mat(S.catFloor), -4.25, 0.008, 0.85, { noCast: true, name: 'cat-floor' });
  addBox(g, 3.3, 0.012, 2.7, mat(S.dogMat), 3.55, 0.01, 1.45, { noCast: true, name: 'dog-mat' });

  const portal = b.portal;
  const jambW = 0.08;
  const jambH = portal.h;
  const halfClear = portal.clear / 2;
  const oak = mat(S.oak);
  addBox(g, jambW, jambH, 0.18, oak, portal.cx - halfClear - jambW / 2, jambH / 2, portal.cz, { name: 'jamb-l' });
  addBox(g, jambW, jambH, 0.18, oak, portal.cx + halfClear + jambW / 2, jambH / 2, portal.cz, { name: 'jamb-r' });
  addBox(g, portal.clear + jambW * 2, 0.14, 0.2, oak, portal.cx, portal.h + 0.07, portal.cz, { name: 'header' });
  addBox(g, portal.clear, 0.012, 0.55, mat(S.clay), portal.cx, 0.012, portal.cz + 0.05, { noCast: true, name: 'threshold' });
  addBox(g, portal.clear - 0.12, 0.008, 0.7, mat('#efe6d6'), portal.cx, 0.016, portal.cz - 0.55, { noCast: true, name: 'mat' });

  const exam = b.exam;
  const examWall = mat(S.examWall);
  const segL = exam.doorX0 - exam.wallX0;
  const segR = exam.wallX1 - exam.doorX1;
  addBox(g, segL, 2.55, 0.1, examWall, exam.wallX0 + segL / 2, 1.275, exam.wallZ, { name: 'exam-wall-l' });
  addBox(g, segR, 2.55, 0.1, examWall, exam.doorX1 + segR / 2, 1.275, exam.wallZ, { name: 'exam-wall-r' });
  addBox(g, exam.doorX1 - exam.doorX0, 0.18, 0.1, oak, (exam.doorX0 + exam.doorX1) / 2, 2.46, exam.wallZ);
  addBox(g, 2.9, 2.4, 0.08, examWall, 4.15, 1.2, -hd + 0.12, { noCast: true, name: 'exam-back' });

  return g;
}

function deskBlock(g, S, spec, topMat, openKnee) {
  const { cx, cz, w, d, h } = spec;
  const topT = 0.045;
  if (openKnee) {
    const legH = h - topT;
    addBox(g, 0.08, legH, d - 0.06, mat(S.oakDeep), cx - w / 2 + 0.06, legH / 2, cz);
    addBox(g, 0.08, legH, d - 0.06, mat(S.oakDeep), cx + w / 2 - 0.06, legH / 2, cz);
    addBox(g, w - 0.2, 0.08, d - 0.1, mat(S.oakDeep), cx, 0.08, cz + 0.02);
  } else {
    const bodyH = h - topT;
    addBox(g, w - 0.08, bodyH - 0.06, d - 0.08, mat(S.oakDeep), cx, (bodyH - 0.06) / 2, cz + 0.02);
  }
  addBox(g, w, topT, d, topMat, cx, h - topT / 2, cz, { name: 'desk-top' });
  addBox(g, w, 0.28, 0.03, mat(S.laminate), cx, h - 0.22, cz + d / 2 - 0.012);
  addBox(g, Math.min(0.7, w * 0.35), 0.18, 0.012, mat(S.sage), cx, h - 0.24, cz + d / 2 + 0.008);
}

function carrierMesh(g, S, spec) {
  const colors = { carrier_perch: S.carrierSage, carrier_cat_floor: S.carrierCream, carrier_dog: S.carrierSlate };
  const body = colors[spec.id] || S.carrierCream;
  const grp = new THREE.Group();
  grp.name = spec.id;
  grp.position.set(spec.x, spec.y, spec.z);
  grp.rotation.y = spec.rot || 0;
  const { w, h, d } = spec;
  addBox(grp, w, h, d, mat(body), 0, h / 2, 0);
  addBox(grp, w * 0.92, h * 0.55, 0.02, mat('#dfe7ea'), 0, h * 0.58, d / 2 + 0.01, { name: 'vent-panel' });
  for (let i = -1; i <= 1; i++) {
    addBox(grp, 0.012, h * 0.42, 0.012, mat(S.navy), i * w * 0.22, h * 0.58, d / 2 + 0.02);
  }
  addBox(grp, w * 0.7, 0.02, 0.08, mat(S.navy), 0, h * 0.32, d / 2 + 0.02);
  if (spec.open) {
    addBox(grp, 0.02, h * 0.72, d * 0.7, mat(body), w / 2 + 0.04, h * 0.4, 0.02, { rotY: 0.7, name: 'door' });
  }
  addCyl(grp, 0.012, 0.012, w * 0.55, mat(S.steel), 0, h + 0.06, 0, 8, { rotZ: Math.PI / 2, name: 'handle' });
  addBox(grp, 0.08, 0.03, 0.05, mat(S.clay), w * 0.28, h * 0.35, d / 2 + 0.03, { name: 'latch' });
  g.add(grp);
}

function perchTray(g, S, p) {
  addBox(g, p.w, 0.035, p.d, mat(S.oak), p.cx, p.y, p.cz, { name: 'perch' });
  addBox(g, p.w, 0.04, 0.02, mat(S.oakDeep), p.cx, p.y + 0.03, p.cz + p.d / 2 - 0.01);
  addBox(g, p.w, 0.04, 0.02, mat(S.oakDeep), p.cx, p.y + 0.03, p.cz - p.d / 2 + 0.01);
  addBox(g, 0.02, 0.04, p.d, mat(S.oakDeep), p.cx + p.w / 2 - 0.01, p.y + 0.03, p.cz);
  addBox(g, 0.04, 0.08, 0.28, mat(S.oakDeep), p.cx - p.w / 2, p.y - 0.02, p.cz);
}

function makeProcedural(layout) {
  const g = new THREE.Group();
  g.name = 'procedural';
  const S = layout.shell;
  const b = layout.build;
  const wood = fineWood();

  deskBlock(g, S, b.desk, wood, false);
  deskBlock(g, S, b.access, wood, true);

  const word = signTex('LINDEN', 'veterinary reception', S.sageDeep, '#f7f4ee');
  addBox(g, 1.15, 0.28, 0.02, mat('#ffffff', { map: word }), b.desk.cx + 0.2, 0.72, b.desk.cz + b.desk.d / 2 + 0.02, { noCast: true });

  addBox(g, 2.4, 1.15, 0.12, mat(S.oak), -3.55, 1.85, -4.12);
  for (let i = 0; i < 8; i++) {
    const col = ['#c46a4a', '#2f6f62', '#e2c15a', '#3e5560'][i % 4];
    const colx = -4.5 + (i % 4) * 0.3;
    const rowy = i < 4 ? 1.52 : 1.98;
    addBox(g, 0.22, 0.3, 0.035, mat(col), colx, rowy, -4.05);
  }
  const board = boardTex();
  addBox(g, 0.72, 0.52, 0.02, mat('#ffffff', { map: board }), -1.15, 1.85, -4.14, { noCast: true });

  const screen = b.screen;
  const sz = (screen.z1 - screen.z0) / 2;
  const scz = (screen.z0 + screen.z1) / 2;
  addBox(g, screen.t + 0.04, screen.h, 0.06, mat(S.oak), screen.x, screen.h / 2, screen.z0);
  addBox(g, screen.t + 0.04, screen.h, 0.06, mat(S.oak), screen.x, screen.h / 2, screen.z1);
  addBox(g, screen.t, 0.08, screen.z1 - screen.z0, mat(S.oak), screen.x, screen.h - 0.04, scz);
  addBox(g, screen.t, 0.08, screen.z1 - screen.z0, mat(S.oak), screen.x, 0.12, scz);
  addBox(g, 0.02, screen.h - 0.28, (screen.z1 - screen.z0) - 0.16, mat('#e7f2ec', {
    transparent: true, opacity: 0.42, depthWrite: false,
  }), screen.x, screen.h / 2, scz, { noCast: true, name: 'sight-glass' });
  const catSign = signTex('CATS', 'carriers up', S.sageDeep, '#f7f4ee');
  const dogSign = signTex('DOGS', 'floor side', S.navy, '#f7f4ee');
  addBox(g, 0.62, 0.22, 0.02, mat('#ffffff', { map: catSign }), screen.x + 0.02, 1.62, screen.z0 + 0.15, { rotY: Math.PI / 2, noCast: true });
  addBox(g, 0.56, 0.2, 0.02, mat('#ffffff', { map: dogSign }), 3.05, 1.42, -0.4, { noCast: true });

  b.perches.forEach((p) => perchTray(g, S, p));
  addCyl(g, 0.045, 0.05, 1.42, mat('#c2a06a'), -5.32, 0.71, 0.35, 10, { name: 'sisal' });
  addBox(g, 0.16, 0.04, 0.16, mat(S.oakDeep), -5.32, 1.43, 0.35);

  b.carriers.forEach((c) => carrierMesh(g, S, c));

  const sc = b.scale;
  addBox(g, sc.w, sc.h, sc.d, mat(S.steel), sc.cx, sc.h / 2, sc.cz, { name: 'scale-body' });
  addBox(g, sc.w - 0.08, 0.012, sc.d - 0.08, mat(S.rubber), sc.cx, sc.h + 0.006, sc.cz, { name: 'scale-pad' });
  addBox(g, 0.16, 0.015, 0.55, mat('#efe6d6'), sc.cx, sc.h + 0.016, sc.cz + sc.d / 2 + 0.12, { noCast: true, name: 'scale-lip' });
  addBox(g, 0.08, 0.92, 0.08, mat(S.navy), sc.cx, 0.5, sc.cz - sc.d / 2 - 0.06);
  const digits = digitTex();
  ledPanel(g, 0.42, 0.18, digits, sc.cx, 1.08, sc.cz - sc.d / 2 - 0.04);
  addBox(g, 0.46, 0.16, 0.02, mat('#ffffff', { map: signTex('WEIGH', 'walk on', S.navy, '#f7f4ee') }), sc.cx, 1.32, sc.cz - sc.d / 2 - 0.04, { noCast: true });

  const dogTable = layout.instances.find((i) => i.id === 'dog_table');
  if (dogTable) {
    const [tx, , tz] = dogTable.position;
    addBox(g, 0.42, 0.015, 0.28, mat('#f4efe4'), tx - 0.05, 0.4, tz, { name: 'magazine' });
    addBox(g, 0.36, 0.012, 0.24, mat(S.sage), tx + 0.08, 0.415, tz + 0.04, { name: 'pamphlet' });
  }

  const bowls = b.bowls;
  addCyl(g, 0.11, 0.09, 0.06, mat('#e7eef2'), bowls.cx - 0.1, 0.04, bowls.cz, 16);
  addCyl(g, 0.1, 0.08, 0.055, mat(S.steel), bowls.cx + 0.12, 0.04, bowls.cz, 16);
  addCyl(g, 0.07, 0.07, 0.01, mat('#8ec8d8'), bowls.cx - 0.1, 0.065, bowls.cz, 16, { noCast: true });

  const exam = b.exam;
  const t = exam.table;
  addBox(g, t.w, 0.08, t.d, mat(S.steel), t.cx, t.h - 0.04, t.cz, { name: 'exam-top' });
  addBox(g, t.w - 0.12, 0.012, t.d - 0.1, mat(S.rubber), t.cx, t.h + 0.004, t.cz);
  addBox(g, 0.08, t.h - 0.1, 0.08, mat(S.steel), t.cx - t.w * 0.35, (t.h - 0.1) / 2, t.cz - t.d * 0.28);
  addBox(g, 0.08, t.h - 0.1, 0.08, mat(S.steel), t.cx + t.w * 0.35, (t.h - 0.1) / 2, t.cz + t.d * 0.28);
  addBox(g, 0.7, 0.06, 0.08, mat(S.steel), t.cx, 0.12, t.cz);
  addBox(g, 0.36, 0.08, 0.28, mat('#f4f7f6'), t.cx - 0.28, t.h + 0.05, t.cz);
  addCyl(g, 0.02, 0.02, 0.7, mat(S.navy), t.cx + 0.15, t.h + 0.55, t.cz - 0.15, 8);
  addCyl(g, 0.14, 0.16, 0.06, mat('#f7f4ee', { emissive: '#f4f8ff', emissiveIntensity: 0.7 }), t.cx + 0.15, t.h + 0.92, t.cz - 0.15, 16, { name: 'exam-light' });
  addBox(g, 0.55, 0.08, 0.4, mat(S.steel), 3.15, 0.9, -4.08, { name: 'sink' });
  addCyl(g, 0.16, 0.14, 0.08, mat('#d5dee4'), 3.15, 0.96, -4.08, 16);
  addCyl(g, 0.015, 0.015, 0.22, mat(S.navy), 3.32, 1.15, -4.12, 6);
  const cs = b.catScale;
  addBox(g, cs.w, cs.h, cs.d, mat('#8d9498'), t.cx + 0.28, t.h + cs.h / 2, t.cz + 0.05, { name: 'cat-scale' });
  ledPanel(g, 0.12, 0.05, smallDigitTex(), t.cx + 0.28, t.h + cs.h * 0.72, t.cz + cs.d / 2 + 0.02);
  addBox(g, 0.46, 0.5, 0.02, mat('#ffffff', { map: posterTex() }), 5.15, 1.7, -4.16, { noCast: true });
  const doorW = 0.82;
  const door = addBox(g, doorW, 2.15, 0.04, mat(S.oak), 0, 1.08, 0, { name: 'exam-door' });
  door.geometry.translate(-doorW / 2, 0, 0);
  door.position.set(exam.doorX1 - 0.04, 1.08, exam.wallZ - 0.08);
  door.rotation.y = -0.42;
  addBox(g, 0.46, 0.12, 0.02, mat('#ffffff', { map: signTex('EXAM 1', 'open', S.navy, '#f7f4ee') }), exam.doorX0 + 0.15, 1.7, exam.wallZ + 0.08, { noCast: true });

  const shelf = layout.instances.find((i) => i.id === 'retail_shelf');
  if (shelf) {
    const labels = ['FLEA', 'WORM', 'EAR', 'SHAMPOO'];
    labels.forEach((label, i) => {
      const col = ['#f4efe4', '#d7e6dc', '#e7c9a8', '#c5ced4'][i];
      const y = i < 2 ? 0.28 : 0.9;
      const x = shelf.position[0] + (i % 2 === 0 ? -0.16 : 0.16);
      addBox(g, 0.16, 0.18, 0.12, mat(col), x, y, shelf.position[2] + 0.02);
      addBox(g, 0.12, 0.05, 0.012, mat('#ffffff', { map: signTex(label, '', S.navy, '#f7f4ee') }), x, y + 0.02, shelf.position[2] + 0.08, { noCast: true });
    });
  }

  addCyl(g, 0.012, 0.012, 0.08, mat(S.clay), b.portal.cx + b.portal.clear / 2 + 0.02, 1.25, b.portal.cz - 0.12, 6);
  addBox(g, 0.02, 0.28, 0.06, mat('#6b4e34'), b.portal.cx + b.portal.clear / 2 + 0.08, 1.05, b.portal.cz - 0.12);
  addBox(g, 0.02, 0.22, 0.05, mat(S.navy), b.portal.cx + b.portal.clear / 2 + 0.1, 1.02, b.portal.cz - 0.08);
  addCyl(g, 0.05, 0.05, 0.02, mat(S.clay), -0.55, 1.15, -4.12, 16, { rotX: Math.PI / 2, noCast: true });
  addBox(g, 0.012, 0.08, 0.04, mat(S.navy), -0.55, 1.15, -4.1, { noCast: true });

  addCyl(g, 0.045, 0.05, 0.04, mat(S.clay), -2.15, 1.1, b.desk.cz + b.desk.d / 2 - 0.08, 12, { name: 'bell' });
  addCyl(g, 0.012, 0.012, 0.03, mat(S.navy), -2.15, 1.13, b.desk.cz + b.desk.d / 2 - 0.08, 6);

  const floorKinds = new Set(['simple_chair', 'museum_bench', 'bar_stool', 'coffee_table', 'flowerpot', 'wall_shelf']);
  for (const inst of layout.instances) {
    if (!floorKinds.has(inst.kind) || inst.position[1] > 0.2) continue;
    const spec = layout.assets[inst.kind];
    const native = spec.native;
    const s = spec.targetHeight / native[1];
    const yaw = inst.rotationY || 0;
    const wx = native[0] * s;
    const wz = native[2] * s;
    const c = Math.abs(Math.cos(yaw));
    const sn = Math.abs(Math.sin(yaw));
    const bw = wx * c + wz * sn;
    const bd = wx * sn + wz * c;
    addContact(g, inst.position[0], inst.position[2], bw * 0.42, bd * 0.42, inst.kind === 'flowerpot' ? 0.16 : 0.2);
  }
  b.carriers.filter((c) => c.y < 0.05).forEach((c) => addContact(g, c.x, c.z, 0.28, 0.24, 0.18));
  addContact(g, b.scale.cx, b.scale.cz, 0.55, 0.36, 0.16);

  return g;
}

function ledPanel(g, w, h, map, x, y, z) {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(w, h, 0.02),
    new THREE.MeshBasicMaterial({ map, color: 0xffffff }),
  );
  mesh.position.set(x, y, z);
  mesh.userData.unshaded = true;
  mesh.userData.noCast = true;
  mesh.name = 'led';
  g.add(mesh);
  return mesh;
}

function tuneAsset(kind, root, spec) {
  root.traverse((obj) => {
    if (!obj.isMesh || !obj.material) return;
    const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
    const n = (obj.name || '').toLowerCase();
    for (const m of mats) {
      if (kind === 'museum_bench') {
        const vinyl = (obj.name || '').toLowerCase().includes('seat');
        obj.material = new THREE.MeshStandardMaterial({
          color: vinyl ? '#3f6b5c' : '#8d8680',
          roughness: 0.72,
        });
        return;
      }
      if (kind === 'coffee_table' && m.color) m.color.multiplyScalar(0.62);
      if (!m.emissive) continue;
      if (n.includes('bulb') || n === 'light_tube') {
        m.color?.set('#fff1d4');
        m.emissive.set('#ffd7a3');
        m.emissiveIntensity = 0.9;
      } else if (n === 'shade') {
        m.emissive.set('#ffb56a');
        m.emissiveIntensity = 0.22;
      } else if (n === 'vessel' || n === 'rim') {
        m.color?.set('#b56845');
      }
    }
  });
  if (!kind.startsWith('flowerpot')) return;
  const h = spec.targetHeight;
  const leaves = new THREE.Group();
  const cols = ['#2f6f62', '#1f4d44', '#6a8f4e', '#3d7a52'];
  for (let i = 0; i < 5; i++) {
    const leaf = new THREE.Mesh(
      new THREE.SphereGeometry(h * 0.22, 8, 6),
      toon(cols[i % cols.length]),
    );
    const a = (i / 5) * Math.PI * 2;
    leaf.position.set(Math.cos(a) * h * 0.12, h * 0.92 + (i % 2) * h * 0.12, Math.sin(a) * h * 0.12);
    leaf.scale.set(1, 0.72, 0.8);
    leaves.add(leaf);
  }
  root.add(leaves);
}

boot({
  makeShell,
  makeProcedural,
  tuneAsset,
  readyText: 'Linden reception — T toon · U unlit',
});
