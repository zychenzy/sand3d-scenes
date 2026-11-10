import * as THREE from 'three';
import { boot, toon, addBox, addCyl } from './scene_lib.js';

// North Quay concourse. +Z is the open cut (street side / camera). -Z is the
// paid hall and the route map. Model axes for reused GLBs: museum bench is
// long along local Z (backless, sit ±X); rotationY = π/2 turns that length
// onto world X so a side faces ±Z (map, departures screen, or gate line).
// The TV screen faces +Z at rotationY 0, toward the bench placed at greater Z.

const PIT = { x0: 4.4, x1: 5.95, z0: -4.7, z1: -2.45 };
const GATE = { z: -1.55, x0: -2.5, x1: 2.5, cabW: 0.22, cabD: 0.7, cabH: 1.02 };
const STAIR = { x: -6.12, width: 2.28, zNose: 5.18, n: 14, riser: 0.17, tread: 0.29 };

function canvasTex(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d'), w, h);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  tex.needsUpdate = true;
  return tex;
}

function tileTex() {
  return canvasTex(128, 128, (ctx) => {
    ctx.fillStyle = '#cfc8ba';
    ctx.fillRect(0, 0, 128, 128);
    ctx.fillStyle = '#d9d3c6';
    ctx.fillRect(7, 7, 114, 114);
    ctx.fillStyle = '#b3ab9e';
    ctx.fillRect(40, 48, 28, 18);
    ctx.strokeStyle = '#9e978b';
    ctx.lineWidth = 6;
    ctx.strokeRect(3, 3, 122, 122);
  });
}

function dadoTex() {
  const tex = canvasTex(96, 160, (ctx) => {
    ctx.fillStyle = '#f4f0e6';
    ctx.fillRect(0, 0, 96, 160);
    ctx.strokeStyle = '#ddd4c6';
    ctx.lineWidth = 3;
    for (let y = 4; y < 160; y += 32) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(96, y);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.moveTo(48, 0);
    ctx.lineTo(48, 160);
    ctx.stroke();
  });
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

function tactileTex() {
  const tex = canvasTex(128, 128, (ctx) => {
    ctx.fillStyle = '#d2ae3e';
    ctx.fillRect(0, 0, 128, 128);
    ctx.fillStyle = '#e6c65a';
    for (let y = 16; y < 128; y += 32) {
      for (let x = 16; x < 128; x += 32) {
        ctx.beginPath();
        ctx.arc(x, y, 7, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  });
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

function contactTex() {
  return canvasTex(128, 128, (ctx) => {
    const g = ctx.createRadialGradient(64, 64, 8, 64, 64, 62);
    g.addColorStop(0, 'rgba(28,32,36,0.55)');
    g.addColorStop(1, 'rgba(28,32,36,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 128, 128);
  });
}

let _contactMat;
function contactMat() {
  if (_contactMat) return _contactMat;
  _contactMat = toon('#ffffff', { map: contactTex(), transparent: true, opacity: 1, depthWrite: false });
  _contactMat.depthWrite = false;
  return _contactMat;
}

function addContact(g, x, z, sx, sz) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), contactMat());
  m.rotation.x = -Math.PI / 2;
  m.position.set(x, 0.02, z);
  m.scale.set(sx, sz, 1);
  m.userData.shading = 'flat';
  g.add(m);
  return m;
}

function noCast(mesh) {
  mesh.castShadow = false;
  mesh.userData.castShadow = false;
  return mesh;
}

function noShade(mesh) {
  mesh.castShadow = false;
  mesh.receiveShadow = false;
  mesh.userData.castShadow = false;
  mesh.userData.receiveShadow = false;
  return mesh;
}

function addSlope(g, w, h, y0, z0, y1, z1, mat, x) {
  const dy = y1 - y0;
  const dz = z1 - z0;
  const len = Math.hypot(dy, dz) || 0.001;
  const m = addBox(g, w, h, len, mat, x, (y0 + y1) / 2, (z0 + z1) / 2);
  m.rotation.x = Math.atan2(-dy, dz);
  return m;
}

function addFloor(g, w, d, x, z, mat) {
  const geo = new THREE.PlaneGeometry(w, d);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  const uv = geo.attributes.uv;
  for (let i = 0; i < pos.count; i++) {
    uv.setXY(i, (pos.getX(i) + x) / 0.8, (pos.getZ(i) + z) / 0.8);
  }
  uv.needsUpdate = true;
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, 0.004, z);
  m.receiveShadow = true;
  m.userData.castShadow = false;
  g.add(m);
  return m;
}

function framedSign(g, w, h, tex, x, y, z, rotY, frameMat) {
  const grp = new THREE.Group();
  const t = 0.045;
  const d = 0.045;
  noCast(addBox(grp, w + t * 2, t, d, frameMat, 0, h / 2 + t / 2, 0));
  noCast(addBox(grp, w + t * 2, t, d, frameMat, 0, -(h / 2 + t / 2), 0));
  noCast(addBox(grp, t, h, d, frameMat, -(w / 2 + t / 2), 0, 0));
  noCast(addBox(grp, t, h, d, frameMat, w / 2 + t / 2, 0, 0));
  const mat = toon('#ffffff', { map: tex });
  const face = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
  face.position.z = 0.01;
  noShade(face);
  grp.add(face);
  const backFace = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
  backFace.position.z = -0.01;
  backFace.rotation.y = Math.PI;
  noShade(backFace);
  grp.add(backFace);
  grp.position.set(x, y, z);
  grp.rotation.y = rotY;
  g.add(grp);
  return grp;
}

function drawMap(ctx, w, h) {
  ctx.fillStyle = '#1a2330';
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = 'rgba(255,255,255,0.035)';
  ctx.lineWidth = 1;
  for (let x = 0; x < w; x += 40) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
    ctx.stroke();
  }
  for (let y = 0; y < h; y += 40) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }

  const lines = [
    { color: '#e23d3d', pts: [[70, 390], [230, 360], [420, 348], [620, 352], [840, 330], [1060, 360], [1220, 400]] },
    { color: '#1f8a9a', pts: [[560, 50], [590, 160], [620, 352], [670, 500], [700, 650]] },
    { color: '#e0a030', pts: [[80, 600], [260, 520], [450, 430], [620, 352], [860, 250], [1080, 160], [1240, 90]] },
    { color: '#7a5ac4', pts: [[90, 120], [280, 190], [460, 270], [620, 352], [840, 450], [1040, 530], [1230, 610]] },
  ];
  for (const ln of lines) {
    const stroke = (color, width) => {
      ctx.beginPath();
      ctx.moveTo(ln.pts[0][0], ln.pts[0][1]);
      for (let i = 1; i < ln.pts.length; i++) ctx.lineTo(ln.pts[i][0], ln.pts[i][1]);
      ctx.strokeStyle = color;
      ctx.lineWidth = width;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.stroke();
    };
    stroke('rgba(0,0,0,0.45)', 26);
    stroke(ln.color, 16);
  }

  const stops = [
    [230, 360, 'Kiln St', 0, -28],
    [840, 330, 'Orchard', 0, -26],
    [1060, 360, 'Beacon', 10, 32],
    [590, 160, 'Glassworks', 78, -8],
    [700, 650, 'Foundry', 0, -24],
    [260, 520, 'Harbor', -10, 30],
    [1080, 160, 'East Gate', 0, -26],
    [280, 190, 'Ivy Park', 0, -26],
    [1040, 530, 'Dry Dock', 20, 28],
    [70, 390, 'West Span', 54, 8],
    [1220, 400, 'Salt Dock', -46, 26],
  ];
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (const [x, y, label, dx, dy] of stops) {
    ctx.beginPath();
    ctx.arc(x, y, 7, 0, Math.PI * 2);
    ctx.fillStyle = '#f7f4ee';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#14202a';
    ctx.stroke();
    ctx.font = '20px sans-serif';
    const tw = ctx.measureText(label).width;
    ctx.fillStyle = 'rgba(12,16,22,0.78)';
    ctx.fillRect(x + dx - tw / 2 - 7, y + dy - 13, tw + 14, 26);
    ctx.fillStyle = '#f3f6f8';
    ctx.fillText(label, x + dx, y + dy);
  }

  const ix = 620;
  const iy = 352;
  for (const [rad, col] of [[34, '#e23d3d'], [27, '#1f8a9a'], [20, '#e0a030'], [13, '#7a5ac4']]) {
    ctx.beginPath();
    ctx.arc(ix, iy, rad, 0, Math.PI * 2);
    ctx.strokeStyle = col;
    ctx.lineWidth = 4;
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.arc(ix, iy, 5, 0, Math.PI * 2);
  ctx.fillStyle = '#fff';
  ctx.fill();
  ctx.font = 'bold 26px sans-serif';
  const name = 'NORTH QUAY';
  const nw = ctx.measureText(name).width;
  ctx.fillStyle = 'rgba(12,18,24,0.88)';
  ctx.fillRect(ix - nw / 2 - 12, iy - 78, nw + 24, 34);
  ctx.fillStyle = '#fff';
  ctx.fillText(name, ix, iy - 61);
  ctx.font = 'bold 16px sans-serif';
  ctx.fillStyle = '#e23d3d';
  ctx.fillText('YOU ARE HERE', ix, iy + 58);

  ctx.font = '16px sans-serif';
  ctx.textAlign = 'left';
  const legend = [['#e23d3d', 'Red'], ['#1f8a9a', 'Teal'], ['#e0a030', 'Amber'], ['#7a5ac4', 'Violet']];
  legend.forEach((item, i) => {
    const x = 28 + i * 150;
    ctx.fillStyle = item[0];
    ctx.fillRect(x, h - 36, 18, 8);
    ctx.fillStyle = '#d5dde4';
    ctx.fillText(item[1] + ' line', x + 26, h - 30);
  });
}

function drawBoard(ctx, w, h) {
  ctx.fillStyle = '#12181e';
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#14666e';
  ctx.fillRect(0, 0, w, 52);
  ctx.fillStyle = '#f7f4ee';
  ctx.font = 'bold 30px sans-serif';
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.fillText('NORTH QUAY', 22, 26);
  ctx.font = '18px sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText('DEPARTURES', w - 22, 26);
  const rows = [
    ['#e23d3d', 'Red line', 'West Span', '2 min'],
    ['#1f8a9a', 'Teal line', 'Foundry', '5 min'],
    ['#e0a030', 'Amber line', 'Harbor', '7 min'],
    ['#7a5ac4', 'Violet line', 'Ivy Park', '11 min'],
  ];
  rows.forEach((r, i) => {
    const y = 86 + i * 40;
    ctx.fillStyle = i % 2 ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0)';
    ctx.fillRect(0, y - 20, w, 40);
    ctx.fillStyle = r[0];
    ctx.fillRect(22, y - 10, 18, 18);
    ctx.fillStyle = '#e7eef2';
    ctx.font = '22px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(r[1], 54, y);
    ctx.fillStyle = '#9aafba';
    ctx.fillText(r[2], 280, y);
    ctx.fillStyle = '#f0d48a';
    ctx.font = 'bold 24px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(r[3], w - 28, y);
  });
}

function drawFrieze(ctx, w, h) {
  ctx.fillStyle = '#14666e';
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#0d3c42';
  ctx.fillRect(0, h - 12, w, 12);
  const colors = ['#e23d3d', '#1f8a9a', '#e0a030', '#7a5ac4'];
  colors.forEach((c, i) => {
    ctx.fillStyle = c;
    ctx.fillRect(36 + i * 28, h * 0.34, 18, 18);
    ctx.fillRect(w - 54 - i * 28, h * 0.34, 18, 18);
  });
  ctx.fillStyle = '#f7f4ee';
  ctx.font = `bold ${Math.floor(h * 0.5)}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('NORTH QUAY', w / 2, h / 2 + 2);
}

function drawTotem(ctx, w, h) {
  ctx.fillStyle = '#125e66';
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#f6f3ec';
  ctx.fillRect(16, 16, w - 32, h - 32);
  ctx.fillStyle = '#125e66';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = 'bold 48px sans-serif';
  ctx.fillText('NORTH QUAY', w / 2, 78);
  ctx.font = '22px sans-serif';
  ctx.fillStyle = '#5c6a70';
  ctx.fillText('CONCOURSE', w / 2, 118);
  ctx.fillStyle = '#125e66';
  ctx.fillRect(48, 148, w - 96, 3);
  const rows = [['↑', 'TICKETS'], ['←', 'STREET'], ['↓', 'PLATFORMS']];
  rows.forEach((r, i) => {
    const y = 230 + i * 118;
    ctx.fillStyle = '#1a2328';
    ctx.font = 'bold 68px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(r[0], 64, y);
    ctx.font = 'bold 40px sans-serif';
    ctx.fillText(r[1], 160, y - 4);
  });
}

function drawStreet(ctx, w, h) {
  ctx.fillStyle = '#14666e';
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#f7f4ee';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = 'bold 64px sans-serif';
  ctx.fillText('STREET', w / 2, h * 0.42);
  ctx.font = 'bold 36px sans-serif';
  ctx.fillText('WAY OUT  ↑', w / 2, h * 0.74);
}

function drawPlatform(ctx, w, h) {
  ctx.fillStyle = '#1a2328';
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#e2b423';
  ctx.fillRect(0, 0, 18, h);
  ctx.fillStyle = '#f7f4ee';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = 'bold 42px sans-serif';
  ctx.fillText('PLATFORMS', w / 2 + 8, h * 0.38);
  ctx.font = 'bold 36px sans-serif';
  ctx.fillStyle = '#e2b423';
  ctx.fillText('↓', w / 2, h * 0.74);
}

function drawPoster(ctx, w, h) {
  ctx.fillStyle = '#f3efe4';
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#e0a030';
  ctx.fillRect(0, 0, w, 70);
  ctx.fillStyle = '#1a2328';
  ctx.font = 'bold 36px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('AMBER LINE', w / 2, 36);
  ctx.font = '28px sans-serif';
  ctx.fillText('Weekend trains', w / 2, 140);
  ctx.fillText('skip Rookery.', w / 2, 184);
  ctx.font = '22px sans-serif';
  ctx.fillStyle = '#5c564c';
  ctx.fillText('Use East Gate.', w / 2, 250);
}

function drawWheel(ctx, w, h) {
  ctx.fillStyle = '#1d4e89';
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = w * 0.055;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.arc(w * 0.4, h * 0.26, w * 0.09, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(w * 0.35, h * 0.36, w * 0.11, h * 0.2);
  ctx.beginPath();
  ctx.arc(w * 0.32, h * 0.74, w * 0.16, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(w * 0.74, h * 0.78, w * 0.075, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(w * 0.32, h * 0.74);
  ctx.lineTo(w * 0.5, h * 0.5);
  ctx.lineTo(w * 0.74, h * 0.52);
  ctx.lineTo(w * 0.74, h * 0.78);
  ctx.moveTo(w * 0.5, h * 0.5);
  ctx.lineTo(w * 0.4, h * 0.36);
  ctx.stroke();
}

function drawStep(ctx, w, h) {
  ctx.fillStyle = '#e2b423';
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#1a2328';
  ctx.font = 'bold 36px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('MIND THE STEP', w / 2, h / 2);
}

function pal(shell) {
  const s = shell || {};
  return {
    floorMat: null,
    plaster: s.wallColor || '#e7e2d6',
    dado: s.dadoColor || '#f4f0e6',
    band: s.bandColor || '#1c6f78',
    brass: s.brassColor || '#c6a15a',
    skirting: s.skirtingColor || '#6a645c',
    ceiling: s.ceilingColor || '#c5ced6',
    beam: s.beamColor || '#7f8b96',
    metal: s.metalColor || '#5c666e',
    metalDark: s.metalDark || '#1c2228',
    concrete: s.concreteColor || '#c9c3b6',
    safety: s.safetyColor || '#e2b423',
    lamp: s.lampColor || '#fff1cf',
    stone: s.stoneColor || '#b7b1a6',
    runner: s.runnerColor || '#b3ab9e',
  };
}

function makeShell(layout) {
  const g = new THREE.Group();
  g.name = 'shell';
  const { width: W, depth: D, height: H } = layout.meta.room;
  const p = pal(layout.shell);
  const plaster = toon(p.plaster);
  const concrete = toon(p.concrete);
  const edge = toon('#b7b0a4');
  const floorMap = tileTex();
  floorMap.wrapS = THREE.RepeatWrapping;
  floorMap.wrapT = THREE.RepeatWrapping;
  const floorMat = toon('#ffffff', { map: floorMap });

  // Floor slabs leave the platform stair open.
  const xL = PIT.x0;
  const xR = PIT.x1;
  addFloor(g, xL - (-W / 2), D, (-W / 2 + xL) / 2, 0, floorMat);
  addFloor(g, W / 2 - xR, D, (xR + W / 2) / 2, 0, floorMat);
  addFloor(g, xR - xL, D / 2 - PIT.z1, (xL + xR) / 2, (PIT.z1 + D / 2) / 2, floorMat);
  addFloor(g, xR - xL, PIT.z0 - (-D / 2), (xL + xR) / 2, (-D / 2 + PIT.z0) / 2, floorMat);

  noCast(addBox(g, W + 0.3, 0.12, 0.2, edge, 0, -0.06, D / 2));
  noCast(addBox(g, 0.2, 0.12, D, edge, -W / 2, -0.06, 0));
  noCast(addBox(g, W, 0.12, 0.16, edge, 0, -0.06, -D / 2));

  // Back wall.
  const back = addBox(g, W, H, 0.16, plaster, 0, H / 2, -D / 2);
  noCast(back);
  // Left wall, punched for the street portal at the top of the stair.
  const portal = { z0: -0.42, z1: 1.02, y0: STAIR.n * STAIR.riser, y1: 4.58 };
  const zA = (-D / 2 + portal.z0) / 2;
  const dA = portal.z0 - (-D / 2);
  noCast(addBox(g, 0.16, H, dA, plaster, -W / 2, H / 2, zA));
  const zB = (portal.z1 + D / 2) / 2;
  const dB = D / 2 - portal.z1;
  noCast(addBox(g, 0.16, H, dB, plaster, -W / 2, H / 2, zB));
  const zP = (portal.z0 + portal.z1) / 2;
  const dP = portal.z1 - portal.z0;
  noCast(addBox(g, 0.16, portal.y0, dP, plaster, -W / 2, portal.y0 / 2, zP));
  const topH = H - portal.y1;
  noCast(addBox(g, 0.16, topH, dP, plaster, -W / 2, portal.y1 + topH / 2, zP));

  // Right wall stops short so the cutaway reads and the platform stair stays in view.
  const rZ1 = 2.35;
  const rD = rZ1 - (-D / 2);
  noCast(addBox(g, 0.16, H, rD, plaster, W / 2, H / 2, (-D / 2 + rZ1) / 2));

  const dadoSrc = dadoTex();
  function dadoMat(len, hgt) {
    const tex = dadoSrc.clone();
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(Math.max(len / 0.28, 1), Math.max(hgt / 0.16, 1));
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.needsUpdate = true;
    return toon('#ffffff', { map: tex });
  }
  const band = toon(p.band);
  const brass = toon(p.brass);
  const skirt = toon(p.skirting);
  const dadoH = 1.06;
  function dadoRun(len, x, z, rotY) {
    const grp = new THREE.Group();
    const slab = addBox(grp, len, dadoH, 0.04, dadoMat(len, dadoH), 0, dadoH / 2, 0);
    noCast(slab);
    noCast(addBox(grp, len, 0.055, 0.055, band, 0, dadoH + 0.02, 0));
    noCast(addBox(grp, len, 0.02, 0.065, brass, 0, dadoH + 0.055, 0));
    noCast(addBox(grp, len, 0.1, 0.05, skirt, 0, 0.05, 0));
    grp.position.set(x, 0, z);
    grp.rotation.y = rotY;
    g.add(grp);
  }
  dadoRun(W - 0.3, 0, -D / 2 + 0.1, 0);
  dadoRun(D - 0.4, -W / 2 + 0.1, 0.15, Math.PI / 2);
  dadoRun(rD - 0.3, W / 2 - 0.1, (-D / 2 + rZ1) / 2, Math.PI / 2);

  // Coffered ceiling, cut away at the street edge.
  const ceilZ1 = 5.45;
  const ceilD = ceilZ1 - (-D / 2 - 0.08);
  const ceilZ = (-D / 2 - 0.08 + ceilZ1) / 2;
  noShade(addBox(g, W + 0.2, 0.1, ceilD, toon('#d7e0e8'), 0, H - 0.05, ceilZ));
  const beamMat = toon('#5c6974');
  const beamY = H - 0.28;
  for (const z of [-6.15, -4.85, -3.05, -1.55, 0.45, 2.15, 3.85, 5.4]) {
    noShade(addBox(g, W - 0.2, 0.36, 0.12, beamMat, 0, beamY, z));
  }
  for (const x of [-5.6, -3.55, 0.9, 3.55, 6.2]) {
    noShade(addBox(g, 0.12, 0.36, ceilD - 0.2, beamMat, x, beamY, ceilZ));
  }
  // Section edge on the cut.
  noShade(addBox(g, W + 0.05, 0.22, 0.1, toon('#6a7580'), 0, H - 0.16, ceilZ1));
  return g;
}

function makeProcedural(layout) {
  const g = new THREE.Group();
  g.name = 'procedural';
  const { width: W, depth: D, height: H } = layout.meta.room;
  const p = pal(layout.shell);
  const metal = toon(p.metal);
  const metalDark = toon(p.metalDark);
  const concrete = toon(p.concrete);
  const safety = toon(p.safety);
  const plaster = toon(p.plaster);
  const stone = toon(p.stone);
  const band = toon(p.band);
  const brass = toon(p.brass);
  const lampMat = toon(p.lamp, { emissive: p.lamp, emissiveIntensity: 1.15 });
  const houseMat = toon('#667480');
  const glass = toon('#d5dee3', { transparent: true, opacity: 0.82, depthWrite: false, side: THREE.DoubleSide });
  const frameMat = toon('#2a3138');

  // Desire-line runner: off the stair, across to the gate spine, through to the map, then to the platform stair.
  const runner = toon(p.runner);
  noCast(addBox(g, 0.78, 0.012, 4.0, runner, -4.42, 0.012, 3.2));
  noCast(addBox(g, 4.6, 0.012, 0.8, runner, -2.15, 0.014, 1.95));
  noCast(addBox(g, 2.7, 0.012, 8.3, runner, 0.15, 0.012, -1.85));
  noCast(addBox(g, 2.2, 0.012, 0.55, runner, 3.05, 0.014, -2.95));

  addTactile(g, 1.5, 0.42, -4.7, 5.48);
  addTactile(g, GATE.x1 - GATE.x0, 0.4, (GATE.x0 + GATE.x1) / 2, -0.78);
  addTactile(g, PIT.x1 - PIT.x0 - 0.1, 0.38, (PIT.x0 + PIT.x1) / 2, PIT.z1 + 0.32);
  noCast(addBox(g, GATE.x1 - GATE.x0 + 0.2, 0.008, 0.07, safety, (GATE.x0 + GATE.x1) / 2, 0.028, -0.95));

  addStreetStair(g, { metal, metalDark, concrete, safety, glass });
  addPlatformStair(g, { metal, metalDark, concrete, safety, frameMat });
  addColumns(g, { concrete, stone, band, brass, plaster });
  addGates(g, { metal, metalDark, safety, glass, frameMat });
  addCeilingLamps(g, lampMat, houseMat);
  addSignage(g, { frameMat, metal, metalDark, band, safety });
  addMachines(g, { metal, metalDark, safety });
  addBins(g, metalDark);

  // Daylight beyond the street portal.
  const day = toon('#fff6ea', { emissive: '#fff4e2', emissiveIntensity: 0.9 });
  noShade(addBox(g, 0.08, 2.3, 1.7, day, -W / 2 - 1.7, 3.45, 0.3));
  const outside = addBox(g, 1.7, 0.12, 1.7, concrete, -W / 2 - 0.95, STAIR.n * STAIR.riser - 0.06, 0.3);
  noCast(outside);
  noCast(addBox(g, 0.08, 0.9, 1.7, metal, -W / 2 - 1.75, STAIR.n * STAIR.riser + 0.45, 0.3));
  const sky = new THREE.PointLight(0xfff6ea, 0.85, 9, 2);
  sky.position.set(-W / 2 - 1.2, 3.6, 0.3);
  g.add(sky);

  return g;

  function addTactile(group, w, d, x, z) {
    const tex = tactileTex();
    tex.repeat.set(w / 0.32, d / 0.32);
    const m = addBox(group, w, 0.012, d, toon('#ffffff', { map: tex }), x, 0.026, z);
    return noCast(m);
  }
}

function addStreetStair(g, mat) {
  const { x, width, zNose, n, riser, tread } = STAIR;
  const topY = n * riser;
  const zBack = zNose - n * tread;
  const xOuter = x - width / 2;
  const xInner = x + width / 2;
  for (let i = 0; i < n; i++) {
    const top = (i + 1) * riser;
    const z = zNose - tread * i - tread / 2;
    addBox(g, width, riser, tread - 0.012, mat.concrete, x, top - riser / 2, z);
    const nose = addBox(g, width, 0.02, 0.045, mat.safety, x, top + 0.008, z + (tread - 0.012) / 2 - 0.02);
    noCast(nose);
  }
  const landD = 1.78;
  addBox(g, width + 0.16, 0.14, landD, mat.concrete, x - 0.06, topY - 0.07, zBack - landD / 2);
  // Hazard stripes on the approach.
  for (let i = 0; i < 4; i++) {
    noCast(addBox(g, width - 0.08, 0.008, 0.07, i % 2 ? mat.safety : mat.metalDark, x, 0.022, zNose + 0.1 + i * 0.075));
  }
  addSlope(g, 0.08, 0.26, 0.02, zNose, topY - 0.1, zBack, mat.concrete, xOuter + 0.05);
  addSlope(g, 0.08, 0.26, 0.02, zNose, topY - 0.1, zBack, mat.concrete, xInner - 0.05);

  const railY = (base) => base + 0.96;
  addSlope(g, 0.045, 0.04, railY(0), zNose, railY(topY), zBack, mat.metalDark, xInner);
  addSlope(g, 0.045, 0.04, railY(0), zNose, railY(topY), zBack, mat.metalDark, xOuter + 0.04);
  addSlope(g, 0.03, 0.03, 0.42, zNose, topY + 0.42, zBack, mat.metal, xInner);
  for (let i = 0; i <= n; i += 2) {
    const yBase = i === 0 ? 0 : i * riser;
    const z = zNose - Math.min(i, n) * tread;
    const h = 0.96;
    addBox(g, 0.045, h, 0.045, mat.metal, xInner, yBase + h / 2, z);
    addBox(g, 0.045, h, 0.045, mat.metal, xOuter + 0.04, yBase + h / 2, z);
  }
  // Landing rail into the portal.
  const landZ = zBack - 1.15;
  addBox(g, 0.045, 0.04, zBack - landZ, mat.metalDark, xInner, topY + 0.96, (zBack + landZ) / 2);
  addBox(g, 0.05, 1.05, 0.05, mat.metal, xInner, topY + 0.52, landZ);
  addBox(g, 0.05, 1.1, 0.05, mat.metalDark, xInner, 0.55, zNose + 0.02);

  // Portal frame and a pair of glazed leaves, one leaf ajar.
  const y0 = topY;
  const y1 = 4.58;
  const z0 = -0.42;
  const z1 = 1.02;
  const px = -7.4;
  addBox(g, 0.08, y1 - y0, 0.08, mat.metalDark, px, (y0 + y1) / 2, z0);
  addBox(g, 0.08, y1 - y0, 0.08, mat.metalDark, px, (y0 + y1) / 2, z1);
  addBox(g, 0.08, 0.08, z1 - z0, mat.metalDark, px, y1, (z0 + z1) / 2);
  const leafW = (z1 - z0) / 2 - 0.06;
  const leaf = addBox(g, 0.03, y1 - y0 - 0.16, leafW, mat.glass, px + 0.02, (y0 + y1) / 2 - 0.02, z0 + leafW / 2 + 0.04);
  noCast(leaf);
  const ajar = addBox(g, 0.03, y1 - y0 - 0.16, leafW * 0.92, mat.glass, px - 0.16, (y0 + y1) / 2 - 0.02, z1 - leafW / 2);
  ajar.rotation.y = -0.5;
  noCast(ajar);
  addContact(g, x, (zNose + zBack) / 2, width * 0.7, (zNose - zBack) * 0.55);
}

function addPlatformStair(g, mat) {
  const x = (PIT.x0 + PIT.x1) / 2;
  const zTop = PIT.z1;
  const width = PIT.x1 - PIT.x0 - 0.2;
  const n = 6;
  const riser = 0.16;
  const tread = 0.3;
  // Well.
  noShade(addBox(g, PIT.x1 - PIT.x0, 1.35, PIT.z1 - PIT.z0, toon('#14181c'), x, -0.7, (PIT.z0 + PIT.z1) / 2));
  addBox(g, 0.08, 1.4, PIT.z1 - PIT.z0, mat.concrete, PIT.x0, -0.55, (PIT.z0 + PIT.z1) / 2);
  addBox(g, 0.08, 1.4, PIT.z1 - PIT.z0, mat.concrete, PIT.x1, -0.55, (PIT.z0 + PIT.z1) / 2);
  addBox(g, PIT.x1 - PIT.x0, 1.4, 0.08, mat.concrete, x, -0.55, PIT.z0);
  for (let i = 0; i < n; i++) {
    const top = -(i + 1) * riser;
    const z = zTop - tread * i - tread / 2;
    addBox(g, width, riser, tread - 0.01, mat.concrete, x, top - riser / 2, z);
    noCast(addBox(g, width, 0.018, 0.04, mat.safety, x, top + 0.006, z + tread / 2 - 0.02));
  }
  const landZ1 = zTop - n * tread;
  addBox(g, width, 0.08, landZ1 - PIT.z0 - 0.08, toon('#3a4148'), x, -n * riser - 0.04, (landZ1 + PIT.z0) / 2);
  // Rails along the drop, open toward the hall.
  for (const rx of [PIT.x0 + 0.04, PIT.x1 - 0.04]) {
    addBox(g, 0.06, 1.05, 0.06, mat.metalDark, rx, 0.52, zTop + 0.16);
    addBox(g, 0.05, 0.9, 0.05, mat.metal, rx, -0.1, zTop - 0.9);
    addBox(g, 0.045, 0.045, 1.35, mat.metalDark, rx, 1.02, zTop - 0.45);
  }
  addBox(g, width, 0.05, 0.05, mat.metalDark, x, 1.02, zTop + 0.16);
  noCast(addBox(g, width + 0.2, 0.1, 0.1, mat.safety, x, 0.05, zTop + 0.1));
}

function addColumns(g, mat) {
  const spots = [[-3.55, -4.85], [3.55, -4.85], [-3.55, 0.45]];
  const tile = dadoTex();
  tile.repeat.set(4, 18);
  tile.needsUpdate = true;
  const shaftMat = toon('#ffffff', { map: tile });
  for (const [x, z] of spots) {
    addBox(g, 0.9, 0.16, 0.9, mat.stone, x, 0.08, z);
    addBox(g, 0.66, 3.9, 0.66, shaftMat, x, 0.16 + 1.95, z);
    noCast(addBox(g, 0.72, 0.22, 0.72, toon('#1c6f78'), x, 1.22, z));
    noCast(addBox(g, 0.74, 0.025, 0.74, mat.brass, x, 1.35, z));
    addBox(g, 0.86, 0.12, 0.86, mat.stone, x, 4.12, z);
    noCast(addBox(g, 0.78, 0.03, 0.78, toon('#1c6f78'), x, 4.04, z));
    noCast(addBox(g, 0.46, 0.55, 0.46, mat.concrete, x, 4.45, z));
    addContact(g, x, z, 1.15, 1.15);
  }
}

function addGates(g, mat) {
  const { z, x0, x1, cabW, cabD, cabH } = GATE;
  const gaps = [0.51, 0.51, 0.51, 0.51, 0.91, 0.51];
  const flaps = [true, true, false, true, false, true];
  const lamps = ['#3dcf7a', '#e24b4b', '#3dcf7a', '#3dcf7a', '#3aa0e0', '#3dcf7a'];
  const wides = [false, false, false, false, true, false];
  noCast(addBox(g, x1 - x0, 0.02, cabD + 0.45, toon('#3e464c'), (x0 + x1) / 2, 0.016, z));

  let edge = x0;
  const cabXs = [];
  const aisle = [];
  function cabinet(cx) {
    addBox(g, cabW, cabH, cabD, mat.metal, cx, cabH / 2, z);
    addBox(g, cabW + 0.02, 0.05, cabD + 0.03, mat.metalDark, cx, cabH + 0.03, z);
    noCast(addBox(g, cabW + 0.01, 0.05, cabD + 0.02, mat.safety, cx, 0.07, z));
    noCast(addBox(g, cabW + 0.01, 0.04, cabD + 0.02, mat.metalDark, cx, 0.14, z));
    // Glass slot on the unpaid face.
    noCast(addBox(g, cabW * 0.62, 0.28, 0.02, toon('#9fd0c8', { emissive: '#163c3c', emissiveIntensity: 0.45 }), cx, 0.78, z + cabD / 2 + 0.01));
    cabXs.push(cx);
  }
  cabinet(edge + cabW / 2);
  edge += cabW;
  for (let i = 0; i < gaps.length; i++) {
    const center = edge + gaps[i] / 2;
    aisle.push({ center, gap: gaps[i], flap: flaps[i], wide: wides[i], lamp: lamps[i] });
    edge += gaps[i];
    cabinet(edge + cabW / 2);
    edge += cabW;
  }
  cabXs.forEach((cx, i) => {
    const color = lamps[Math.min(i, lamps.length - 1)];
    const lens = addBox(g, 0.07, 0.03, 0.05, toon(color, { emissive: color, emissiveIntensity: 1.2 }), cx, cabH + 0.075, z + cabD / 2 - 0.04);
    noShade(lens);
  });
  const wheel = canvasTex(128, 128, drawWheel);
  for (const a of aisle) {
    if (a.flap) {
      noCast(addBox(g, a.gap - 0.06, 0.62, 0.035, mat.glass, a.center, 0.72, z + 0.02));
      noCast(addBox(g, a.gap - 0.04, 0.07, 0.055, mat.safety, a.center, 1.0, z + 0.04));
    }
    if (a.wide) {
      framedSign(g, 0.16, 0.16, wheel, a.center + a.gap / 2 + 0.02, 0.82, z + cabD / 2 + 0.02, 0, mat.metal);
    }
  }
  // Staff podium at the paid-side end of the line.
  addBox(g, 0.48, 1.08, 0.42, mat.metalDark, x1 + 0.48, 0.54, z);
  noCast(addBox(g, 0.32, 0.16, 0.02, toon('#9fd0c8', { emissive: '#143836', emissiveIntensity: 0.5 }), x1 + 0.48, 0.92, z + 0.22));
  addContact(g, (x0 + x1) / 2, z, (x1 - x0) * 0.55, 1.15);
}

function addCeilingLamps(g, lampMat, houseMat) {
  const fixtures = [
    [-4.7, -5.5, 1.55],
    [-1.3, -5.5, 1.9],
    [2.25, -5.5, 1.7],
    [4.85, -5.5, 1.45],
    [-4.7, -3.95, 1.4],
    [2.25, -3.95, 1.8],
    [-4.7, -0.55, 1.5],
    [-1.3, -0.55, 1.85],
    [2.25, -0.55, 1.6],
    [4.9, -0.4, 1.35],
    [-1.3, 1.3, 1.7],
    [2.3, 1.3, 1.9],
    [4.85, 1.25, 1.4],
    [-6.35, 2.9, 1.15],
    [-4.55, 3.0, 1.45],
    [-1.2, 3.05, 1.8],
    [2.3, 3.0, 1.55],
    [-6.35, 4.55, 1.2],
    [-4.5, 4.6, 1.6],
    [0.1, 4.55, 2.05],
    [3.4, 4.5, 1.5],
  ];
  for (const [x, z, len] of fixtures) {
    noShade(addBox(g, len + 0.08, 0.05, 0.22, houseMat, x, 4.02, z));
    noShade(addBox(g, len, 0.035, 0.14, lampMat, x, 3.97, z));
  }
  // Lower light bridge over the gate line — the bright beat in the rhythm.
  noShade(addBox(g, 5.3, 0.08, 0.72, toon('#6a7680'), 0.0, 3.42, GATE.z - 0.05));
  for (const x of [-1.7, -0.55, 0.6, 1.75]) {
    noShade(addBox(g, 0.92, 0.05, 0.16, lampMat, x, 3.22, -0.95));
    noShade(addBox(g, 1.0, 0.03, 0.22, houseMat, x, 3.26, -0.95));
  }
  for (const x of [-1.6, 1.6]) {
    noCast(addBox(g, 0.04, 0.85, 0.04, toon('#667480'), x, 3.95, GATE.z));
  }
}

function addSignage(g, mat) {
  const mapTex = canvasTex(1280, 704, drawMap);
  const boardTex = canvasTex(1400, 280, drawBoard);
  const friezeTex = canvasTex(1600, 220, drawFrieze);
  const totemTex = canvasTex(640, 900, drawTotem);
  const streetTex = canvasTex(768, 256, drawStreet);
  const platTex = canvasTex(900, 280, drawPlatform);
  const posterTex = canvasTex(640, 420, drawPoster);
  const stepTex = canvasTex(768, 160, drawStep);

  framedSign(g, 5.05, 2.02, mapTex, 0.05, 2.05, -6.84, 0, mat.frameMat);
  framedSign(g, 5.2, 0.46, friezeTex, 0.05, 3.32, -6.82, 0, toon('#0e3c42'));
  addClock(g, 3.25, 2.35, -6.83);

  // Departures hang under the gate bridge, facing the unpaid hall (+Z).
  framedSign(g, 3.5, 0.58, boardTex, -0.85, 2.42, GATE.z + 0.38, 0, mat.frameMat);
  noCast(addBox(g, 0.03, 0.55, 0.03, mat.metal, -2.15, 2.95, GATE.z + 0.38));
  noCast(addBox(g, 0.03, 0.55, 0.03, mat.metal, 0.45, 2.95, GATE.z + 0.38));

  // Wayfinding totem where the stair path turns toward the gates. Faces +Z.
  addBox(g, 0.06, 1.15, 0.06, mat.metal, -3.42, 0.58, 2.85);
  addBox(g, 0.06, 1.15, 0.06, mat.metal, -2.78, 0.58, 2.85);
  framedSign(g, 0.78, 1.42, totemTex, -3.1, 1.28, 2.85, 0, toon('#0e3c42'));
  addContact(g, -3.1, 2.85, 1.0, 0.4);

  // Street sign on the inner left wall, facing +X into the hall.
  framedSign(g, 1.15, 0.42, streetTex, -7.28, 3.95, 0.3, Math.PI / 2, toon('#0e3c42'));
  framedSign(g, 1.35, 0.46, platTex, PIT.x0 - 0.95, 2.05, PIT.z1 + 0.15, 0, mat.frameMat);
  // Service poster on the right wall, seen from inside the hall.
  framedSign(g, 0.7, 0.95, posterTex, 7.28, 1.7, -2.2, -Math.PI / 2, mat.frameMat);
  framedSign(g, 0.85, 0.18, stepTex, -4.95, 1.35, 3.55, Math.PI / 2, mat.frameMat);
}

function addClock(g, x, y, z) {
  const face = new THREE.Mesh(new THREE.CircleGeometry(0.28, 40), toon('#f6f3ea'));
  face.position.set(x, y, z);
  noShade(face);
  g.add(face);
  const rim = new THREE.Mesh(new THREE.RingGeometry(0.28, 0.34, 40), toon('#1c2228'));
  rim.position.set(x, y, z + 0.012);
  noShade(rim);
  g.add(rim);
  const ink = toon('#1c2228');
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const len = i % 3 === 0 ? 0.07 : 0.04;
    const tick = addBox(g, 0.016, len, 0.01, ink, x + Math.sin(a) * 0.22, y + Math.cos(a) * 0.22, z + 0.02);
    tick.rotation.z = -a;
    noShade(tick);
  }
  const hour = addBox(g, 0.03, 0.16, 0.012, ink, x, y, z + 0.03);
  hour.geometry.translate(0, 0.06, 0);
  hour.rotation.z = Math.PI / 3;
  noShade(hour);
  const minute = addBox(g, 0.022, 0.22, 0.012, ink, x, y, z + 0.034);
  minute.geometry.translate(0, 0.09, 0);
  minute.rotation.z = -Math.PI / 3;
  noShade(minute);
}

function addMachines(g, mat) {
  // Screens face +Z, toward people entering from the cutaway.
  for (const x of [5.65, 6.5]) {
    const z = 0.55;
    addBox(g, 0.58, 1.62, 0.4, toon('#2c343c'), x, 0.81, z);
    noCast(addBox(g, 0.58, 0.06, 0.44, mat.metalDark, x, 1.64, z));
    noShade(addBox(g, 0.4, 0.32, 0.02, toon('#b7e0d4', { emissive: '#1a4a46', emissiveIntensity: 0.55 }), x, 1.22, z + 0.21));
    noCast(addBox(g, 0.16, 0.035, 0.02, mat.metalDark, x, 0.78, z + 0.21));
    noShade(addBox(g, 0.07, 0.07, 0.02, toon('#e2b423', { emissive: '#e2b423', emissiveIntensity: 0.45 }), x + 0.12, 0.62, z + 0.21));
    addContact(g, x, z, 0.75, 0.55);
  }
  // Short queue rail in front of the machines.
  for (const x of [5.4, 6.75]) {
    addCyl(g, 0.035, 0.04, 0.95, mat.metal, x, 0.48, 1.15, 10);
  }
  noCast(addBox(g, 1.4, 0.025, 0.025, mat.safety, 6.07, 0.9, 1.15));
  // Plinth under the freestanding departures TV (instance sits on top).
  addBox(g, 1.55, 0.36, 0.42, toon('#2a3138'), 4.55, 0.18, 2.15);
  addContact(g, 4.55, 2.15, 1.7, 0.6);
  // Screen card on the +Z face. The GLB panel is thin in local X; rotationY -π/2 turns that face toward the bench.
  const screen = new THREE.Mesh(
    new THREE.PlaneGeometry(1.42, 0.72),
    toon('#ffffff', { map: canvasTex(1024, 520, drawBoard), side: THREE.DoubleSide })
  );
  screen.position.set(4.55, 1.0, 2.32);
  noShade(screen);
  g.add(screen);
}

function addBins(g, metalDark) {
  for (const [x, z] of [[-4.55, 5.7], [6.85, -0.35]]) {
    addCyl(g, 0.18, 0.2, 0.62, toon('#2c463e'), x, 0.31, z, 16);
    addCyl(g, 0.22, 0.22, 0.05, metalDark, x, 0.64, z, 16);
    noShade(addCyl(g, 0.08, 0.08, 0.03, toon('#c6a15a'), x, 0.68, z, 12));
    addContact(g, x, z, 0.5, 0.5);
  }
}

boot({
  makeShell,
  makeProcedural,
  onProps(props, layout) {
    for (const inst of layout.instances || []) {
      const [x, , z] = inst.position;
      if (inst.kind === 'museum_bench') addContact(props, x, z, 2.05, 0.85);
      if (inst.kind === 'flowerpot') addContact(props, x, z, 0.55, 0.55);
    }
  },
  readyText: 'ready — North Quay concourse · drag orbit · U unlit · T toon',
});
