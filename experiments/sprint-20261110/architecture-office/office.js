import * as THREE from 'three';
import { boot, toon, addBox, addCyl, addPlane, contactShadow, paperTexture } from './scene_lib.js';

const INK = '#1a2330';
const PAPER = '#f3efe4';

function noCast(mesh) {
  mesh.castShadow = false;
  mesh.userData.castShadow = false;
  return mesh;
}

function noReceive(mesh) {
  mesh.receiveShadow = false;
  mesh.userData.receiveShadow = false;
  return mesh;
}

function paintPaper(ctx, w, h) {
  ctx.fillStyle = PAPER;
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 5;
  ctx.strokeRect(26, 26, w - 52, h - 52);
  ctx.lineWidth = 1.5;
  ctx.strokeRect(40, 40, w - 80, h - 80);
}

function titleBlock(ctx, w, h, lines) {
  const bw = Math.min(460, w * 0.48);
  const bh = 156;
  const x = w - 52 - bw;
  const y = h - 52 - bh;
  ctx.fillStyle = '#f7f4ec';
  ctx.fillRect(x, y, bw, bh);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, bw, bh);
  ctx.beginPath();
  ctx.moveTo(x, y + 52);
  ctx.lineTo(x + bw, y + 52);
  ctx.moveTo(x, y + 104);
  ctx.lineTo(x + bw, y + 104);
  ctx.stroke();
  ctx.fillStyle = INK;
  ctx.font = 'bold 30px Liberation Serif, Times New Roman, serif';
  ctx.fillText(lines[0], x + 16, y + 36);
  ctx.font = '22px Liberation Serif, Times New Roman, serif';
  ctx.fillText(lines[1], x + 16, y + 86);
  ctx.font = '18px Liberation Sans, Helvetica, sans-serif';
  ctx.fillText(lines[2], x + 16, y + 136);
  return { x, y, bw, bh };
}

function northArrow(ctx, x, y) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = INK;
  ctx.beginPath();
  ctx.moveTo(0, -40);
  ctx.lineTo(14, 10);
  ctx.lineTo(0, 0);
  ctx.lineTo(-14, 10);
  ctx.closePath();
  ctx.fill();
  ctx.font = 'bold 20px Liberation Sans, Helvetica, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('N', 0, 36);
  ctx.restore();
}

function planTexture() {
  return paperTexture(1024, 1280, (ctx, w, h) => {
    paintPaper(ctx, w, h);
    titleBlock(ctx, w, h, ['NORTH COURTYARD', 'GROUND FLOOR PLAN', 'SCALE 1:100   SHEET A2']);
    northArrow(ctx, 860, 150);
    ctx.save();
    ctx.strokeStyle = INK;
    ctx.fillStyle = INK;
    ctx.lineWidth = 10;
    // U-shaped plan, north (open) at the top of the sheet
    ctx.strokeRect(210, 200, 560, 620);
    ctx.clearRect(360, 188, 250, 28);
    ctx.fillStyle = PAPER;
    ctx.fillRect(360, 190, 250, 24);
    ctx.lineWidth = 8;
    ctx.strokeRect(390, 340, 250, 300);
    ctx.fillStyle = 'rgba(197,201,188,0.55)';
    ctx.fillRect(398, 348, 234, 284);
    ctx.strokeStyle = '#6a7a62';
    ctx.lineWidth = 1;
    for (let i = 0; i < 8; i++) {
      ctx.beginPath();
      ctx.moveTo(410 + i * 28, 360);
      ctx.lineTo(430 + i * 28, 620);
      ctx.stroke();
    }
    ctx.fillStyle = INK;
    ctx.font = '22px Liberation Sans, Helvetica, sans-serif';
    ctx.fillText('COURT', 470, 500);
    ctx.fillText('HALL', 250, 760);
    ctx.fillText('STUDIO', 620, 430);
    // column dots
    ctx.fillStyle = INK;
    [[250, 250], [250, 760], [720, 250], [720, 760], [470, 250]].forEach(([x, y]) => {
      ctx.beginPath();
      ctx.arc(x, y, 7, 0, Math.PI * 2);
      ctx.fill();
    });
    // dimension
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(210, 880);
    ctx.lineTo(770, 880);
    ctx.moveTo(210, 868);
    ctx.lineTo(210, 892);
    ctx.moveTo(770, 868);
    ctx.lineTo(770, 892);
    ctx.stroke();
    ctx.font = '18px Liberation Sans, Helvetica, sans-serif';
    ctx.fillText('24.0 m', 450, 910);
    ctx.restore();
  });
}

function sectionTexture() {
  return paperTexture(900, 1200, (ctx, w, h) => {
    paintPaper(ctx, w, h);
    titleBlock(ctx, w, h, ['NORTH COURTYARD', 'SECTION A–A', 'SCALE 1:100   SHEET A3']);
    ctx.fillStyle = INK;
    ctx.fillRect(120, 780, 660, 18);
    ctx.fillRect(160, 520, 36, 260);
    ctx.fillRect(620, 390, 48, 390);
    ctx.fillRect(196, 640, 424, 22);
    // skylight cut above the court
    ctx.strokeStyle = INK;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(196, 640);
    ctx.lineTo(300, 470);
    ctx.lineTo(520, 470);
    ctx.lineTo(620, 390);
    ctx.stroke();
    ctx.fillStyle = 'rgba(180, 210, 220, 0.45)';
    ctx.fillRect(300, 470, 220, 16);
    // figure
    ctx.strokeStyle = INK;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(430, 700, 14, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(430, 714);
    ctx.lineTo(430, 770);
    ctx.moveTo(430, 730);
    ctx.lineTo(408, 748);
    ctx.moveTo(430, 730);
    ctx.lineTo(452, 744);
    ctx.moveTo(430, 770);
    ctx.lineTo(414, 798);
    ctx.moveTo(430, 770);
    ctx.lineTo(446, 798);
    ctx.stroke();
    ctx.font = '18px Liberation Sans, Helvetica, sans-serif';
    ctx.fillStyle = INK;
    ctx.fillText('COURT', 360, 610);
    ctx.fillText('+4.20', 640, 380);
    ctx.fillText('±0.00', 80, 800);
  });
}

function elevationTexture() {
  return paperTexture(860, 1100, (ctx, w, h) => {
    paintPaper(ctx, w, h);
    titleBlock(ctx, w, h, ['NORTH COURTYARD', 'NORTH ELEVATION', 'SCALE 1:100   SHEET A4']);
    ctx.strokeStyle = INK;
    ctx.lineWidth = 6;
    ctx.strokeRect(120, 260, 620, 560);
    ctx.fillStyle = INK;
    ctx.fillRect(120, 800, 620, 10);
    ctx.lineWidth = 4;
    const windows = [180, 310, 440];
    windows.forEach((x) => {
      ctx.strokeRect(x, 360, 90, 180);
      ctx.beginPath();
      ctx.moveTo(x + 45, 360);
      ctx.lineTo(x + 45, 540);
      ctx.moveTo(x, 450);
      ctx.lineTo(x + 90, 450);
      ctx.stroke();
    });
    ctx.strokeRect(560, 300, 140, 500);
    ctx.strokeRect(590, 560, 80, 240);
    ctx.font = '18px Liberation Sans, Helvetica, sans-serif';
    ctx.fillStyle = INK;
    ctx.fillText('ENTRY', 590, 780);
    ctx.fillText('STUDIO', 580, 280);
  });
}

function workingTexture() {
  return paperTexture(1024, 768, (ctx, w, h) => {
    ctx.fillStyle = '#f6f1e4';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#c9bfa8';
    ctx.lineWidth = 1;
    for (let x = 40; x < w; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 20);
      ctx.lineTo(x, h - 20);
      ctx.stroke();
    }
    for (let y = 30; y < h; y += 40) {
      ctx.beginPath();
      ctx.moveTo(20, y);
      ctx.lineTo(w - 20, y);
      ctx.stroke();
    }
    ctx.strokeStyle = '#b0413a';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(180, 120, 640, 480);
    ctx.strokeRect(300, 220, 280, 260);
    ctx.strokeStyle = INK;
    ctx.lineWidth = 4;
    ctx.strokeRect(180, 120, 420, 480);
    ctx.strokeRect(180, 420, 640, 180);
    ctx.font = 'bold 28px Liberation Sans, Helvetica, sans-serif';
    ctx.fillStyle = '#b0413a';
    ctx.fillText('WORKING  —  DO NOT ISSUE', 200, 80);
    ctx.fillStyle = INK;
    ctx.font = '20px Liberation Serif, Times New Roman, serif';
    ctx.fillText('court shifted 400 mm north', 210, 200);
  });
}

function juniorTexture() {
  return paperTexture(900, 700, (ctx, w, h) => {
    ctx.fillStyle = '#f7f3e8';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#b7ad96';
    ctx.lineWidth = 1;
    for (let x = 30; x < w; x += 36) {
      ctx.beginPath();
      ctx.moveTo(x, 16);
      ctx.lineTo(x, h - 16);
      ctx.stroke();
    }
    ctx.strokeStyle = INK;
    ctx.lineWidth = 4;
    ctx.strokeRect(80, 80, 520, 500);
    ctx.lineWidth = 3;
    ctx.strokeRect(140, 160, 200, 280);
    ctx.strokeStyle = '#b0413a';
    ctx.setLineDash([10, 8]);
    ctx.strokeRect(360, 160, 180, 280);
    ctx.setLineDash([]);
    ctx.fillStyle = INK;
    ctx.font = '22px Liberation Serif, Times New Roman, serif';
    ctx.fillText('east wing — study', 380, 140);
  });
}

function monitorTexture() {
  return paperTexture(1024, 576, (ctx, w, h) => {
    ctx.fillStyle = '#1a4d58';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#123840';
    ctx.fillRect(0, 0, w, 48);
    ctx.fillStyle = '#e7fff6';
    ctx.font = '22px Liberation Sans, Helvetica, sans-serif';
    ctx.fillText('NORTH COURTYARD    plan    1:100', 24, 32);
    ctx.strokeStyle = '#9fd0c8';
    ctx.lineWidth = 4;
    ctx.strokeRect(180, 100, 620, 400);
    ctx.strokeRect(300, 180, 280, 220);
    ctx.fillStyle = '#9fd0c8';
    ctx.font = '18px Liberation Sans, Helvetica, sans-serif';
    ctx.fillText('COURT', 400, 300);
    ctx.fillStyle = '#6a8a98';
    ctx.fillRect(860, 80, 130, 420);
    ctx.fillStyle = '#d5e4ee';
    ctx.fillText('A-WALL', 878, 120);
    ctx.fillText('A-GLAZ', 878, 160);
    ctx.fillText('A-MASS', 878, 200);
  });
}

function matTexture() {
  return paperTexture(512, 384, (ctx, w, h) => {
    ctx.fillStyle = '#2c6a48';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(255,255,255,0.75)';
    ctx.lineWidth = 2;
    for (let x = 0; x <= w; x += 32) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = 0; y <= h; y += 32) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }
    ctx.strokeStyle = '#f4f1ea';
    ctx.lineWidth = 6;
    ctx.strokeRect(8, 8, w - 16, h - 16);
  });
}

function chipTexture() {
  const chips = [
    ['#d9d3c4', 'LIMESTONE'],
    ['#3e4650', 'SLATE'],
    ['#a67c4e', 'OAK'],
    ['#5c3a28', 'WALNUT'],
    ['#b46848', 'COPPER'],
    ['#c4a15a', 'BRASS'],
  ];
  return paperTexture(420, 640, (ctx, w, h) => {
    ctx.fillStyle = '#f7f4ec';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = INK;
    ctx.lineWidth = 4;
    ctx.strokeRect(8, 8, w - 16, h - 16);
    ctx.font = 'bold 22px Liberation Sans, Helvetica, sans-serif';
    ctx.fillStyle = INK;
    ctx.fillText('SAMPLES — CURRENT', 28, 48);
    chips.forEach((c, i) => {
      const y = 80 + i * 88;
      ctx.fillStyle = c[0];
      ctx.fillRect(28, y, 86, 64);
      ctx.strokeStyle = INK;
      ctx.strokeRect(28, y, 86, 64);
      ctx.fillStyle = INK;
      ctx.font = '20px Liberation Sans, Helvetica, sans-serif';
      ctx.fillText(c[1], 130, y + 40);
    });
  });
}

function labelTexture(text) {
  return paperTexture(512, 96, (ctx, w, h) => {
    ctx.fillStyle = '#f4efe4';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = INK;
    ctx.lineWidth = 4;
    ctx.strokeRect(2, 2, w - 4, h - 4);
    ctx.fillStyle = INK;
    ctx.font = 'bold 48px Liberation Sans, Helvetica, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, w / 2, h / 2 + 2);
  });
}

function signTexture() {
  return paperTexture(1024, 160, (ctx, w, h) => {
    ctx.fillStyle = '#2c3138';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#f4f1ea';
    ctx.font = 'bold 64px Liberation Sans, Helvetica, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('NORTH COURTYARD', w / 2, h / 2 - 16);
    ctx.font = '28px Liberation Sans, Helvetica, sans-serif';
    ctx.fillStyle = '#d7c4a2';
    ctx.fillText('PIN-UP  ·  CURRENT SET', w / 2, h / 2 + 40);
  });
}

function subtractRect(r, h) {
  const ix0 = Math.max(r.x0, h.x0);
  const ix1 = Math.min(r.x1, h.x1);
  const iz0 = Math.max(r.z0, h.z0);
  const iz1 = Math.min(r.z1, h.z1);
  if (ix1 - ix0 < 1e-3 || iz1 - iz0 < 1e-3) return [r];
  const out = [];
  if (iz0 - r.z0 > 0.04) out.push({ x0: r.x0, x1: r.x1, z0: r.z0, z1: iz0 });
  if (r.z1 - iz1 > 0.04) out.push({ x0: r.x0, x1: r.x1, z0: iz1, z1: r.z1 });
  if (ix0 - r.x0 > 0.04) out.push({ x0: r.x0, x1: ix0, z0: iz0, z1: iz1 });
  if (r.x1 - ix1 > 0.04) out.push({ x0: ix1, x1: r.x1, z0: iz0, z1: iz1 });
  return out;
}

function punchHoles(bounds, holes) {
  let rects = [bounds];
  holes.forEach((h) => {
    const next = [];
    rects.forEach((r) => next.push(...subtractRect(r, h)));
    rects = next;
  });
  return rects;
}

function addSlope(g, x0, x1, z0, z1, y0, y1, mat) {
  const dz = z1 - z0;
  const dy = y1 - y0;
  const len = Math.hypot(dz, dy) || 0.01;
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0, 0.045, len), mat);
  mesh.position.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
  mesh.rotation.x = -Math.atan2(dy, dz);
  mesh.castShadow = false;
  mesh.userData.castShadow = false;
  mesh.receiveShadow = true;
  g.add(mesh);
  return mesh;
}

function makeShell(layout) {
  const g = new THREE.Group();
  g.name = 'shell';
  const { width: W, depth: D, height: H } = layout.meta.room;
  const build = layout.build;
  const plaster = toon(layout.shell.wallColor);
  const oak = toon('#c4a574');
  const oakDark = toon('#a88858');
  const conc = toon('#b7b2a8');
  const base = toon(layout.shell.woodColor);
  const soffit = toon(layout.shell.ceilingColor);
  const split = build.floorSplitX;

  const oakW = split - (-W / 2);
  noCast(addBox(g, oakW, 0.08, D, oak, (-W / 2 + split) / 2, -0.04, 0));
  const concW = W / 2 - split;
  noCast(addBox(g, concW, 0.08, D, conc, (split + W / 2) / 2, -0.04, 0));
  noCast(addBox(g, 0.045, 0.012, D, toon('#8d7044'), split, 0.004, 0));

  let seamX = -W / 2 + 0.12;
  let i = 0;
  while (seamX < split - 0.05) {
    noCast(addBox(g, 0.01, 0.006, D - 0.16, i % 5 === 0 ? oakDark : toon('#b89868'), seamX, 0.004, 0));
    seamX += 0.16 + (i % 3) * 0.025;
    i += 1;
  }
  const joint = toon('#9c978e');
  for (let z = -D / 2 + 1.15; z < D / 2 - 0.3; z += 1.4) {
    noCast(addBox(g, concW - 0.12, 0.004, 0.015, joint, (split + W / 2) / 2, 0.004, z));
  }

  const back = noReceive(addBox(g, W, H, 0.14, plaster, 0, H / 2, -D / 2));
  back.castShadow = false;
  back.userData.castShadow = false;
  const door = build.door;
  const wallX = -W / 2;
  const zBack = (-D / 2 + door.z0) / 2;
  const lenBack = door.z0 - (-D / 2);
  noReceive(noCast(addBox(g, 0.14, H, lenBack, plaster, wallX, H / 2, zBack)));
  const zFront = (door.z1 + D / 2) / 2;
  const lenFront = D / 2 - door.z1;
  noReceive(noCast(addBox(g, 0.14, H, lenFront, plaster, wallX, H / 2, zFront)));
  const headerH = H - door.height;
  noReceive(noCast(addBox(g, 0.14, headerH, door.z1 - door.z0, plaster, wallX, door.height + headerH / 2, (door.z0 + door.z1) / 2)));

  // door frame, leaf swung into the room
  const jamb = toon('#4a4036');
  addBox(g, 0.08, door.height, 0.08, jamb, wallX + 0.08, door.height / 2, door.z0);
  addBox(g, 0.08, door.height, 0.08, jamb, wallX + 0.08, door.height / 2, door.z1);
  addBox(g, 0.08, 0.08, door.z1 - door.z0, jamb, wallX + 0.08, door.height, (door.z0 + door.z1) / 2);
  const leaf = new THREE.Group();
  leaf.position.set(wallX + 0.1, 0, door.z0 + 0.02);
  leaf.rotation.y = -1.08;
  addBox(leaf, 0.04, door.height - 0.06, 0.82, toon('#6e543c'), 0.02, (door.height - 0.06) / 2, 0.41);
  addBox(leaf, 0.03, 0.08, 0.03, toon('#c4a15a'), 0.05, 1.02, 0.72);
  g.add(leaf);
  noCast(addBox(g, 0.7, 0.012, 0.46, toon('#4a4038'), wallX + 0.7, 0.008, (door.z0 + door.z1) / 2));

  // baseboards, broken at the door
  addBox(g, W - 0.2, 0.09, 0.025, base, 0, 0.045, -D / 2 + 0.09);
  addBox(g, 0.025, 0.09, lenBack - 0.08, base, wallX + 0.09, 0.045, zBack);
  addBox(g, 0.025, 0.09, Math.max(0.2, lenFront - 0.08), base, wallX + 0.09, 0.045, zFront);

  // homosote pin-up field — no shadow receive, so the sheet linework stays clean
  noReceive(noCast(addBox(g, 9.4, 1.85, 0.02, toon('#ddd4c4'), 0.15, 1.62, -D / 2 + 0.1)));
  noReceive(addBox(g, 9.5, 0.045, 0.04, base, 0.15, 2.56, -D / 2 + 0.11));
  noReceive(addBox(g, 9.5, 0.04, 0.04, base, 0.15, 0.68, -D / 2 + 0.11));

  const ceil = build.ceiling;
  const holes = build.skylights;
  const panels = punchHoles(ceil, holes);
  panels.forEach((r) => {
    const mesh = addBox(g, r.x1 - r.x0, 0.08, r.z1 - r.z0, soffit, (r.x0 + r.x1) / 2, H - 0.05, (r.z0 + r.z1) / 2);
    noReceive(noCast(mesh));
  });

  const zinc = toon('#b7b1a6', { side: THREE.DoubleSide });
  const cheekMat = toon('#efeae2');
  const steel = toon('#2c3138');
  const glassMat = toon('#d7e6ee', {
    transparent: true,
    opacity: 0.3,
    side: THREE.DoubleSide,
    depthWrite: false,
    emissive: '#f5fbff',
    emissiveIntensity: 0.55,
  });
  holes.forEach((hole) => {
    const { x0, x1, z0, z1 } = hole;
    const yBase = H - 0.02;
    const rise = 0.56;
    const yTop = yBase + rise;
    noCast(addBox(g, 0.05, rise, z1 - z0, cheekMat, x0, yBase + rise / 2, (z0 + z1) / 2));
    noCast(addBox(g, 0.05, rise, z1 - z0, cheekMat, x1, yBase + rise / 2, (z0 + z1) / 2));
    noCast(addBox(g, x1 - x0, 0.1, 0.05, cheekMat, (x0 + x1) / 2, yBase + 0.04, z0));
    addSlope(g, x0 + 0.02, x1 - 0.02, z0, z1 - 0.08, yBase + 0.02, yTop, zinc);
    const gh = rise - 0.06;
    const glass = addPlane(g, x1 - x0 - 0.1, gh, glassMat, (x0 + x1) / 2, yBase + gh / 2 + 0.02, z1 - 0.03);
    glass.rotation.x = -0.16;
    noCast(glass);
    for (let k = 1; k <= 3; k++) {
      const x = x0 + ((x1 - x0) * k) / 4;
      addBox(g, 0.028, gh, 0.03, steel, x, yBase + gh / 2, z1 - 0.01);
    }
    addBox(g, x1 - x0 - 0.1, 0.028, 0.03, steel, (x0 + x1) / 2, yBase + gh * 0.62, z1 - 0.01);
    // curb seen from below
    noCast(addBox(g, x1 - x0, 0.06, 0.05, steel, (x0 + x1) / 2, H - 0.1, z0 + 0.02));
    noCast(addBox(g, x1 - x0, 0.06, 0.05, steel, (x0 + x1) / 2, H - 0.1, z1 - 0.02));
  });

  // beams tying the monitors back to the room
  const beam = toon('#6b5038');
  [-2.25, -1.05, 1.15].forEach((z) => {
    const b = addBox(g, 10.2, 0.16, 0.1, beam, -0.1, H - 0.16, z);
    b.castShadow = true;
  });

  // plaster pier at the model-shop corner, under the front beam
  addBox(g, 0.22, H - 0.12, 0.22, plaster, 4.85, (H - 0.12) / 2, 1.15);
  addBox(g, 0.3, 0.04, 0.3, base, 4.85, 0.1, 1.15);
  addBox(g, 0.28, 0.05, 0.28, base, 4.85, H - 0.22, 1.15);

  return g;
}

function setSquare() {
  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  shape.lineTo(0.2, 0);
  shape.lineTo(0, 0.14);
  shape.closePath();
  const mesh = new THREE.Mesh(new THREE.ShapeGeometry(shape), toon('#f7f4ec', { polygonOffset: true }));
  mesh.castShadow = false;
  mesh.userData.castShadow = false;
  return mesh;
}

function draftingTable(g, spec, sheetMap) {
  const grp = new THREE.Group();
  grp.position.set(spec.x, 0, spec.z);
  grp.name = `draft-${spec.id}`;
  grp.userData.groundContact = true;
  const steel = toon('#3e4650');
  const birch = toon('#e4d2b0');
  const lino = toon('#d9c6a4');
  const { w, d, frontH, backH } = spec;
  [-1, 1].forEach((sx) => {
    const x = sx * (w / 2 - 0.13);
    addBox(grp, 0.08, 0.035, d * 0.72, steel, x, 0.018, 0.02);
    addBox(grp, 0.04, frontH - 0.02, 0.04, steel, x, frontH / 2, d / 2 - 0.1);
    addBox(grp, 0.04, backH - 0.02, 0.04, steel, x, backH / 2, -d / 2 + 0.1);
    addBox(grp, 0.025, 0.03, d * 0.55, steel, x, 0.36, 0.02);
  });
  addBox(grp, w - 0.36, 0.03, 0.03, steel, 0, 0.34, 0.02);

  const blade = new THREE.Group();
  const slope = Math.atan2(backH - frontH, d - 0.16);
  blade.position.set(0, (frontH + backH) / 2 - 0.015, 0);
  blade.rotation.x = slope;
  addBox(blade, w - 0.05, 0.028, d - 0.12, lino, 0, 0, 0);
  addBox(blade, w - 0.02, 0.018, 0.02, steel, 0, 0.02, (d - 0.12) / 2);
  addBox(blade, w - 0.18, 0.01, 0.036, toon('#d5dbe2'), 0, 0.02, 0.06);
  addBox(blade, 0.028, 0.02, 0.05, steel, -(w / 2 - 0.1), 0.022, 0.06);
  addBox(blade, 0.028, 0.02, 0.05, steel, w / 2 - 0.1, 0.022, 0.06);

  const paperMat = toon('#f7f4ec', { map: sheetMap, polygonOffset: true });
  const paper = addPlane(blade, w * 0.62, (d - 0.22) * 0.72, paperMat, -0.04, 0.02, -0.04);
  paper.rotation.x = -Math.PI / 2;
  noCast(paper);

  const tri = setSquare();
  tri.position.set(w * 0.22, 0.022, 0.1);
  tri.rotation.x = -Math.PI / 2;
  blade.add(tri);
  grp.add(blade);

  addBox(grp, w - 0.08, 0.02, 0.1, birch, 0, backH, -d / 2 + 0.065);
  for (let n = 0; n < 3; n++) {
    const pencil = addCyl(grp, 0.005, 0.005, 0.16, toon(n === 2 ? '#c4a15a' : '#ead9a4'), -w * 0.28 + n * 0.018, backH + 0.02, -d / 2 + 0.06, 6);
    pencil.rotation.z = Math.PI / 2;
    pencil.rotation.y = 0.35;
  }
  addBox(grp, 0.3, 0.008, 0.016, toon('#f4f4f2'), w * 0.16, backH + 0.012, -d / 2 + 0.06);
  g.add(grp);
}

function flatFile(g, spec) {
  const grp = new THREE.Group();
  grp.position.set(spec.x, 0, spec.z);
  grp.name = 'flat-file';
  grp.userData.groundContact = true;
  const face = toon('#d9cdb8');
  const steel = toon('#3e3a36');
  addBox(grp, spec.w + 0.04, 0.05, spec.d + 0.03, steel, 0, 0.025, 0);
  addBox(grp, spec.w, spec.h - 0.05, spec.d, face, 0, spec.h / 2 + 0.02, 0);
  for (let n = 0; n < 5; n++) {
    const y = 0.16 + n * ((spec.h - 0.28) / 4);
    addBox(grp, spec.w * 0.92, 0.008, 0.012, steel, 0, y, spec.d / 2 + 0.002);
    const pull = addCyl(grp, 0.012, 0.012, 0.03, toon('#c4a15a'), spec.w * 0.28, y + 0.045, spec.d / 2 + 0.012, 8);
    pull.rotation.x = Math.PI / 2;
  }
  const roll = addCyl(grp, 0.055, 0.055, 0.72, toon('#f4f0e6'), -0.18, spec.h + 0.06, 0.02, 12);
  roll.rotation.z = Math.PI / 2;
  addCyl(grp, 0.04, 0.04, 0.55, toon('#e7d7b0'), 0.22, spec.h + 0.045, -0.06, 10).rotation.z = Math.PI / 2;
  g.add(grp);
}

function courtyardMassing(parent, y, scale, x = 0) {
  const grp = new THREE.Group();
  grp.position.set(x, y, 0);
  grp.scale.setScalar(scale);
  const foam = toon('#f6f3ec');
  const foam2 = toon('#e4dfd6');
  addBox(grp, 0.82, 0.014, 0.56, toon('#d4cfc5'), 0, 0.007, 0);
  addBox(grp, 0.7, 0.008, 0.46, toon('#ece7de'), 0, 0.016, 0);
  addBox(grp, 0.26, 0.01, 0.2, toon('#c5cbb8'), 0.02, 0.024, 0.02);
  addBox(grp, 0.1, 0.12, 0.4, foam, -0.26, 0.084, 0);
  addBox(grp, 0.5, 0.14, 0.1, foam, -0.02, 0.094, -0.17);
  addBox(grp, 0.12, 0.22, 0.32, foam2, 0.26, 0.134, -0.02);
  addBox(grp, 0.2, 0.07, 0.08, foam, -0.02, 0.058, 0.18);
  addCyl(grp, 0.008, 0.012, 0.04, toon('#6a5438'), 0.04, 0.046, 0.04, 6);
  addCyl(grp, 0.04, 0.012, 0.07, toon('#6d8f5c'), 0.04, 0.09, 0.04, 8);
  addBox(grp, 0.012, 0.034, 0.008, toon('#fbfbfb'), -0.1, 0.042, 0.18);
  parent.add(grp);
  return grp;
}

function modelTable(g, spec) {
  const grp = new THREE.Group();
  grp.position.set(spec.x, 0, spec.z);
  grp.name = 'model-table';
  grp.userData.groundContact = true;
  const steel = toon('#3e4650');
  const birch = toon('#e6d3b4');
  const edge = toon('#c4a574');
  const { w, d, h } = spec;
  [-1, 1].forEach((sx) => {
    [-1, 1].forEach((sz) => {
      addBox(grp, 0.06, h - 0.04, 0.06, steel, sx * (w / 2 - 0.1), (h - 0.04) / 2, sz * (d / 2 - 0.1));
    });
  });
  addBox(grp, w - 0.24, 0.04, 0.04, steel, 0, 0.28, d / 2 - 0.1);
  addBox(grp, w - 0.24, 0.04, 0.04, steel, 0, 0.28, -d / 2 + 0.1);
  addBox(grp, w - 0.16, 0.02, d - 0.2, toon('#c8b89a'), 0, 0.42, 0);
  // foam sheet stock on the lower shelf
  addBox(grp, 0.42, 0.02, 0.28, toon('#f7f4ee'), -0.35, 0.44, 0.02);
  addBox(grp, 0.36, 0.015, 0.24, toon('#ded8cc'), -0.32, 0.46, 0.04);
  addBox(grp, 0.2, 0.04, 0.16, toon('#d9d3c4'), 0.4, 0.45, -0.08);
  addBox(grp, w, 0.045, d, birch, 0, h - 0.02, 0);
  addBox(grp, w + 0.02, 0.025, 0.025, edge, 0, h - 0.01, d / 2);
  addBox(grp, w + 0.02, 0.025, 0.025, edge, 0, h - 0.01, -d / 2);

  const mat = addPlane(grp, 0.52, 0.36, toon('#2c6a48', { map: matTexture(), polygonOffset: true }), 0.62, h + 0.004, 0.18);
  mat.rotation.x = -Math.PI / 2;
  noCast(mat);

  courtyardMassing(grp, h + 0.005, 1, -0.38);

  // tools along the near edge
  addBox(grp, 0.32, 0.004, 0.018, toon('#d9dde2'), 0.55, h + 0.01, -0.42);
  addBox(grp, 0.14, 0.008, 0.016, toon('#c4a15a'), 0.15, h + 0.012, -0.4);
  addCyl(grp, 0.008, 0.008, 0.09, toon('#6a5344'), 0.28, h + 0.02, -0.38, 8).rotation.z = Math.PI / 2;
  // offcuts, clustered, not a row
  addBox(grp, 0.08, 0.012, 0.05, toon('#f7f4ee'), 0.95, h + 0.012, -0.22);
  addBox(grp, 0.05, 0.02, 0.04, toon('#f7f4ee'), 0.9, h + 0.016, -0.12);
  addBox(grp, 0.06, 0.008, 0.06, toon('#e7e2d8'), 0.98, h + 0.01, -0.08);
  g.add(grp);
}

function hangSheet(g, o) {
  const board = noReceive(addBox(g, o.w + 0.04, o.h + 0.04, 0.01, toon('#f7f6f2'), o.x, o.y, o.z - 0.008));
  const paper = addPlane(g, o.w, o.h, toon(PAPER, { map: o.tex, polygonOffset: true, side: THREE.FrontSide }), o.x, o.y, o.z);
  noReceive(paper);
  if (o.rot) {
    board.rotation.z = o.rot;
    paper.rotation.z = o.rot;
  }
  noCast(paper);
  [-1, 1].forEach((s, idx) => {
    const pin = addCyl(g, 0.009, 0.009, 0.012, toon(idx === 0 ? '#c4483a' : '#2a2a2a'), o.x + s * (o.w * 0.42), o.y + o.h * 0.44, o.z + 0.012, 8);
    pin.rotation.x = Math.PI / 2;
  });
  return paper;
}

function pinup(g, layout) {
  const D = layout.meta.room.depth;
  const z = -D / 2 + 0.16;
  const plan = planTexture();
  const section = sectionTexture();
  const elev = elevationTexture();
  hangSheet(g, { x: -1.2, y: 1.7, w: 0.78, h: 1.05, z, tex: elev });
  hangSheet(g, { x: 0.85, y: 1.68, w: 1.18, h: 1.46, z: z + 0.004, tex: plan });
  hangSheet(g, { x: 2.7, y: 1.66, w: 0.92, h: 1.28, z, tex: section });
  hangSheet(g, { x: 4.05, y: 1.85, w: 0.52, h: 0.66, z, tex: juniorTexture(), rot: 0.03 });

  const traceMat = toon('#f3e6a2', {
    map: plan,
    transparent: true,
    opacity: 0.42,
    depthWrite: false,
  });
  const trace = addPlane(g, 1.02, 1.22, traceMat, 0.9, 1.64, z + 0.02);
  noReceive(noCast(trace));

  const chips = addPlane(g, 0.32, 0.48, toon('#f7f4ec', { map: chipTexture() }), 1.72, 1.15, z + 0.01);
  noCast(chips);

  const sign = addPlane(g, 1.7, 0.26, toon('#2c3138', { map: signTexture(), emissive: '#2c3138', emissiveIntensity: 0.15 }), 0.7, 2.78, z);
  noCast(sign);

  // presentation massing, smaller, on the plinth (placed in world space)
  const presentation = new THREE.Group();
  presentation.position.set(4.02, 1.03, -3.22);
  courtyardMassing(presentation, 0, 0.55);
  g.add(presentation);
}

function materialLibrary(g, layout) {
  const run = layout.build.shelfRun;
  const grp = new THREE.Group();
  grp.name = 'material-library';
  grp.userData.groundContact = true;
  const oak = toon('#8a6244');
  const oakDark = toon('#6a4832');
  const back = toon('#d9d0c2');
  let z = run.z0;
  const edges = [z];
  layout.build.materialBays.forEach((bay) => {
    z += bay.w;
    edges.push(z);
  });
  const z1 = z;
  const x = run.x;
  const depth = run.depth;
  addBox(grp, 0.012, run.height - 0.2, z1 - run.z0, back, x - depth / 2 + 0.01, run.height / 2, (run.z0 + z1) / 2);
  edges.forEach((ez) => {
    addBox(grp, depth, run.height, 0.028, oakDark, x, run.height / 2, ez);
  });
  const tops = [0.22, 0.62, 1.02, 1.42, 1.82];
  tops.forEach((top) => {
    addBox(grp, depth - 0.02, 0.02, z1 - run.z0 - 0.04, oak, x, top - 0.01, (run.z0 + z1) / 2);
  });

  const bays = layout.build.materialBays.map((bay, i) => ({
    ...bay,
    z0: edges[i],
    z1: edges[i + 1],
    zc: (edges[i] + edges[i + 1]) / 2,
  }));

  const stone = bays[0];
  addBox(grp, 0.28, 0.07, 0.48, toon('#e4dcc8'), x + 0.02, 0.22 + 0.035, stone.zc - 0.08);
  addBox(grp, 0.24, 0.045, 0.36, toon('#3c4450'), x - 0.01, 0.22 + 0.09, stone.zc + 0.08);
  addBox(grp, 0.22, 0.05, 0.3, toon('#cbb892'), x + 0.03, 0.62 + 0.025, stone.zc);

  const timber = bays[1];
  const woods = ['#f0ddb8', '#c49258', '#6a3e28', '#a97848', '#e2c48a'];
  woods.forEach((color, n) => {
    addBox(grp, 0.03, 0.36, 0.16, toon(color), x + 0.03, 1.02 + 0.18, timber.z0 + 0.16 + n * 0.15);
  });

  const masonry = bays[2];
  for (let row = 0; row < 5; row++) {
    const shift = row % 2 === 0 ? 0 : 0.05;
    for (let col = 0; col < 3; col++) {
      addBox(
        grp, 0.1, 0.055, 0.2,
        toon(row % 2 ? '#7d3e30' : '#b85a40'),
        x + 0.03,
        0.22 + 0.028 + row * 0.055,
        masonry.z0 + 0.16 + col * 0.18 + shift,
      );
    }
  }
  addBox(grp, 0.26, 0.016, 0.2, toon('#e4d2b0'), x + depth / 2 + 0.06, 0.92, masonry.zc);
  addBox(grp, 0.1, 0.045, 0.18, toon('#a34a32'), x + depth / 2 + 0.07, 0.95, masonry.zc);

  const metal = bays[3];
  [['#d5d8dc', 0.1], ['#c45a3a', 0.24], ['#d4b15a', 0.38], ['#2a2e32', 0.52]].forEach(([color, dz]) => {
    addBox(grp, 0.012, 0.4, 0.18, toon(color), x + 0.05, 1.02 + 0.2, metal.z0 + dz);
  });

  const cloth = bays[4];
  const rod = addCyl(grp, 0.01, 0.01, cloth.z1 - cloth.z0 - 0.1, toon('#3e4650'), x + depth / 2 - 0.02, 1.4, cloth.zc, 8);
  rod.rotation.x = Math.PI / 2;
  ['#efe4d0', '#a84838', '#31446e', '#6d6848'].forEach((color, n) => {
    const sw = addPlane(grp, 0.14, 0.32, toon(color, { side: THREE.DoubleSide }), x + depth / 2 + 0.01, 1.22, cloth.z0 + 0.14 + n * 0.15);
    sw.rotation.y = Math.PI / 2;
  });
  ['#d5e6ee', '#e7eee8'].forEach((color, n) => {
    addBox(grp, 0.012, 0.22, 0.14, toon(color, { transparent: true, opacity: 0.5, side: THREE.DoubleSide, depthWrite: false }), x - 0.02, 0.62 + 0.11, cloth.z0 + 0.18 + n * 0.22);
  });

  const names = ['STONE', 'TIMBER', 'MASONRY', 'METAL', 'TEXTILE'];
  bays.forEach((bay, i) => {
    const plate = addPlane(grp, bay.w - 0.1, 0.09, toon('#f4efe4', { map: labelTexture(names[i]) }), x + depth / 2 + 0.01, 0.48, bay.zc);
    plate.rotation.y = Math.PI / 2;
    noReceive(noCast(plate));
  });

  g.add(grp);
}

function binders(g, layout) {
  const inst = layout.instances.find((i) => i.id === 'binder_case');
  const grp = new THREE.Group();
  grp.position.set(inst.position[0], inst.position[1], inst.position[2]);
  grp.rotation.y = inst.rotationY;
  const colors = ['#6b4a32', '#c4b49a', '#8d4a38', '#3e4a44', '#a67c4e', '#d8d0c4', '#5c5348', '#7a3a32', '#4a5a48', '#b08968'];
  const shelves = [
    { y: 0.06, n: 8 },
    { y: 0.56, n: 7 },
    { y: 1.06, n: 8 },
    { y: 1.56, n: 6 },
  ];
  shelves.forEach((sh, s) => {
    for (let n = 0; n < sh.n; n++) {
      const bw = 0.05 + (n % 3) * 0.012;
      const bh = 0.26 + ((n + s) % 4) * 0.028;
      const span = 0.66;
      const x = -span / 2 + n * (span / Math.max(sh.n - 1, 1));
      addBox(grp, bw, bh, 0.16, toon(colors[(n + s * 2) % colors.length]), x, sh.y + bh / 2, -0.02);
    }
  });
  g.add(grp);
}

function leafBall(g, r, color, x, y, z) {
  const mesh = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 1), toon(color));
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  g.add(mesh);
  return mesh;
}

function foliage(g, x, z, kind) {
  const stem = toon('#4a5a32');
  if (kind === 'fig') {
    addCyl(g, 0.02, 0.03, 0.62, stem, x, 0.52, z, 8);
    leafBall(g, 0.2, '#3d6a45', x, 0.98, z);
    leafBall(g, 0.14, '#4e7a52', x + 0.12, 1.12, z - 0.06);
    leafBall(g, 0.1, '#2f5a38', x - 0.1, 1.06, z + 0.08);
  } else {
    addCyl(g, 0.015, 0.02, 0.26, stem, x, 0.38, z, 6);
    leafBall(g, 0.14, '#3f6a44', x, 0.68, z);
    leafBall(g, 0.08, '#4e7a52', x + 0.07, 0.8, z - 0.04);
  }
}

function sampleRackDressing(g, layout) {
  const inst = layout.instances.find((i) => i.id === 'sample_rack');
  const grp = new THREE.Group();
  grp.position.set(inst.position[0], 0, inst.position[2]);
  grp.rotation.y = inst.rotationY;
  // local shelf tops at targetHeight 1.02 (see GAP): lower 0.22, upper 0.83
  addBox(grp, 0.22, 0.03, 0.14, toon('#d9d3c4'), -0.18, 0.24, 0.02);
  addBox(grp, 0.16, 0.045, 0.12, toon('#3e4650'), 0.05, 0.25, 0);
  addBox(grp, 0.12, 0.02, 0.1, toon('#a67c4e'), 0.22, 0.23, -0.02);
  addBox(grp, 0.14, 0.16, 0.012, toon('#5c3a28'), -0.16, 0.92, 0);
  addBox(grp, 0.12, 0.18, 0.01, toon('#c4a15a'), 0.02, 0.93, 0.02);
  addBox(grp, 0.1, 0.14, 0.008, toon('#b46848'), 0.18, 0.91, -0.02);
  g.add(grp);
}

function easelSheet(g, layout) {
  const easel = layout.instances.find((i) => i.id === 'easel_trace');
  const eg = new THREE.Group();
  eg.position.set(easel.position[0], 0, easel.position[2]);
  eg.rotation.y = easel.rotationY;
  const sheet = addPlane(eg, 0.46, 0.62, toon(PAPER, { map: elevationTexture(), polygonOffset: true, side: THREE.DoubleSide }), 0, 0.98, 0.2);
  noReceive(noCast(sheet));
  g.add(eg);
}

function screenPlane(g) {
  const screen = addPlane(g, 0.58, 0.3, toon('#1c4a55', {
    map: monitorTexture(),
    emissive: '#12323c',
    emissiveIntensity: 0.35,
    polygonOffset: true,
    side: THREE.DoubleSide,
  }), -1.15, 1.04, 3.16);
  noReceive(noCast(screen));
}

function rollsAndHat(g, layout) {
  const { depth: D, width: W, height: H } = { ...layout.meta.room };
  const door = layout.build.door;
  // trace-roll crate beside the flat file
  const crate = new THREE.Group();
  crate.position.set(1.52, 0, -1.42);
  crate.userData.groundContact = true;
  const wood = toon('#8a6244');
  addBox(crate, 0.42, 0.28, 0.32, wood, 0, 0.14, 0);
  addBox(crate, 0.36, 0.22, 0.26, toon('#6a4832'), 0, 0.16, 0);
  [ -0.08, 0.04, 0.12 ].forEach((x, n) => {
    const roll = addCyl(crate, 0.045 - n * 0.006, 0.045 - n * 0.006, 0.34, toon(n === 1 ? '#f4f0e6' : '#e7dcc4'), x, 0.32, 0, 10);
    roll.rotation.x = Math.PI / 2;
  });
  g.add(crate);

  const bin = new THREE.Group();
  bin.position.set(-1.55, 0, 0.62);
  bin.userData.groundContact = true;
  addCyl(bin, 0.14, 0.12, 0.32, toon('#3e4650'), 0, 0.16, 0, 12);
  g.add(bin);

  // peg and site hat by the entry
  addCyl(g, 0.012, 0.012, 0.16, toon('#6a5438'), -W / 2 + 0.16, 1.55, door.z0 - 0.35, 8).rotation.z = Math.PI / 2;
  const hat = new THREE.Group();
  hat.position.set(-W / 2 + 0.28, 1.48, door.z0 - 0.35);
  addCyl(hat, 0.11, 0.11, 0.012, toon('#e2b33a'), 0, 0, 0, 16);
  addCyl(hat, 0.07, 0.08, 0.07, toon('#e2b33a'), 0, 0.04, 0, 12);
  g.add(hat);

  const pend = layout.instances.find((i) => i.id === 'pend_model');
  const capY = pend.position[1] + 0.52;
  addCyl(g, 0.006, 0.006, Math.max(0.2, H - capY - 0.06), toon('#1c1c1c'), pend.position[0], (H - 0.02 + capY) / 2, pend.position[2], 6);

  // floor north arrow in the crit approach
  const brass = toon('#b08a45');
  noCast(addBox(g, 0.018, 0.006, 0.26, brass, -1.7, 0.006, -1.2));
  const head = new THREE.Mesh(new THREE.CircleGeometry(0.06, 3), brass);
  head.rotation.x = -Math.PI / 2;
  head.rotation.z = Math.PI;
  head.position.set(-1.7, 0.008, -1.38);
  head.scale.set(0.7, 1.1, 1);
  noCast(head);
  g.add(head);
  void D;
}

function makeProcedural(layout) {
  const g = new THREE.Group();
  g.name = 'procedural';
  const sheets = { senior: workingTexture(), junior: juniorTexture() };
  layout.build.drafting.forEach((spec) => draftingTable(g, spec, sheets[spec.id]));
  modelTable(g, layout.build.modelTable);
  flatFile(g, layout.build.flatFile);
  pinup(g, layout);
  materialLibrary(g, layout);
  binders(g, layout);
  sampleRackDressing(g, layout);
  easelSheet(g, layout);
  screenPlane(g);
  rollsAndHat(g, layout);
  layout.instances.filter((i) => i.kind === 'flowerpot').forEach((pot, idx) => {
    foliage(g, pot.position[0], pot.position[2], idx === 0 ? 'fig' : 'shrub');
  });
  return g;
}

function decorate(kind, root) {
  const paint = (color) => {
    root.traverse((o) => {
      if (!o.isMesh) return;
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      mats.forEach((m) => {
        if (m && m.color) m.color.set(color);
      });
    });
  };
  if (kind === 'display_bookcase') paint('#8a5a38');
  if (kind === 'museum_plinth') paint('#e4ddd2');
  if (kind === 'library_lamp' || kind === 'pendant_lamp') {
    root.traverse((o) => {
      if (!o.isMesh) return;
      const n = o.name || '';
      const p = (o.parent && o.parent.name) || '';
      const hit = n === 'light_tube' || p === 'light_tube' || n === 'bulb' || p === 'bulb' || p === 'bulb_group';
      if (!hit) return;
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      mats.forEach((m) => {
        if (!m || !m.color) return;
        m.color.set('#fff6d8');
        m.emissive = new THREE.Color('#ffe3a8');
        m.emissiveIntensity = 1.2;
        m.userData.lamp = true;
      });
    });
  }
}

function afterScene({ scene, procedural, props }) {
  const contacts = new THREE.Group();
  contacts.name = 'contacts';
  procedural.traverse((obj) => {
    if (obj.userData && obj.userData.groundContact) contactShadow(contacts, obj, { opacity: 0.2 });
  });
  props.children.forEach((child) => {
    contactShadow(contacts, child, { opacity: child.userData.kind === 'flowerpot' ? 0.16 : 0.2 });
  });
  scene.add(contacts);
}

boot({
  makeShell,
  makeProcedural,
  decorate,
  afterScene,
  readyText: 'ready — architecture studio · drag orbit · U unlit · T toon',
});
