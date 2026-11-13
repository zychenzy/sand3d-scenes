import * as THREE from 'three';
import { boot, toon, addBox, addCyl, addSphere } from './scene_lib.js';
import { collectIssues } from './bay_spec.mjs';

function canvasTex(draw) {
  const canvas = document.createElement('canvas');
  draw(canvas, canvas.getContext('2d'));
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  tex.needsUpdate = true;
  return tex;
}

function paintHole(kind) {
  return canvasTex((canvas, g) => {
    canvas.width = 1024;
    canvas.height = 768;
    const sky = g.createLinearGradient(0, 0, 0, 430);
    sky.addColorStop(0, '#6eaddc');
    sky.addColorStop(0.7, '#c5e4f6');
    sky.addColorStop(1, '#e7f4ea');
    g.fillStyle = sky;
    g.fillRect(0, 0, 1024, 768);
    g.fillStyle = '#fff3cc';
    g.beginPath();
    g.arc(kind === 'par3' ? 250 : 780, 110, 34, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#2c6840';
    for (let i = 0; i < 16; i++) {
      const x = 20 + i * 64 + (i % 2) * 10;
      const h = 110 + (i % 3) * 26;
      g.beginPath();
      g.moveTo(x, 390);
      g.lineTo(x + 26, 390 - h);
      g.lineTo(x + 52, 390);
      g.fill();
    }
    g.fillStyle = '#74b44c';
    g.fillRect(0, 390, 1024, 378);
    g.fillStyle = '#68a644';
    g.beginPath();
    g.moveTo(120, 768);
    g.lineTo(904, 768);
    g.lineTo(670, 400);
    g.lineTo(354, 400);
    g.closePath();
    g.fill();
    g.fillStyle = 'rgba(255,255,255,0.13)';
    g.beginPath();
    g.moveTo(250, 760);
    g.lineTo(470, 760);
    g.lineTo(500, 448);
    g.lineTo(430, 448);
    g.fill();
    g.fillStyle = '#e6d3a2';
    g.beginPath();
    g.ellipse(kind === 'par3' ? 300 : 360, 590, 78, 30, -0.4, 0, Math.PI * 2);
    g.fill();
    if (kind === 'par3') {
      g.fillStyle = '#3c86b0';
      g.beginPath();
      g.ellipse(720, 575, 100, 38, 0.25, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = 'rgba(255,255,255,0.25)';
      g.beginPath();
      g.ellipse(700, 568, 40, 8, 0.25, 0, Math.PI * 2);
      g.fill();
    } else {
      g.fillStyle = '#e6d3a2';
      g.beginPath();
      g.ellipse(690, 520, 54, 20, 0.5, 0, Math.PI * 2);
      g.fill();
    }
    g.fillStyle = '#3c9648';
    g.beginPath();
    g.ellipse(512, 500, 128, 46, 0, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#2f7a3c';
    g.beginPath();
    g.ellipse(500, 492, 70, 18, -0.2, 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = '#f7f7f4';
    g.lineWidth = 5;
    g.beginPath();
    g.moveTo(512, 500);
    g.lineTo(512, 418);
    g.stroke();
    g.fillStyle = kind === 'par3' ? '#d24b45' : '#f4f4f2';
    g.beginPath();
    g.moveTo(512, 418);
    g.lineTo(572, 436);
    g.lineTo(512, 454);
    g.closePath();
    g.fill();
    g.fillStyle = 'rgba(16, 28, 22, 0.62)';
    g.fillRect(36, 34, 300, 70);
    g.fillStyle = '#f6f1e6';
    g.font = '600 32px sans-serif';
    g.fillText(kind === 'par3' ? 'PAR 3   ·   168' : 'PAR 4   ·   412', 54, 80);
  });
}

function paintMat(label) {
  return canvasTex((canvas, g) => {
    canvas.width = 512;
    canvas.height = 640;
    g.fillStyle = '#3f8d46';
    g.fillRect(0, 0, 512, 640);
    g.fillStyle = '#357a3d';
    for (let x = 0; x < 512; x += 64) g.fillRect(x, 0, 30, 640);
    g.strokeStyle = '#d8e7c8';
    g.lineWidth = 6;
    g.setLineDash([18, 16]);
    g.beginPath();
    g.moveTo(256, 40);
    g.lineTo(256, 600);
    g.stroke();
    g.setLineDash([]);
    const markY = 148;
    g.strokeStyle = '#f4f1e4';
    g.lineWidth = 5;
    g.beginPath();
    g.moveTo(180, markY);
    g.lineTo(332, markY);
    g.moveTo(256, markY - 28);
    g.lineTo(256, markY + 28);
    g.stroke();
    g.fillStyle = 'rgba(255,255,255,0.85)';
    g.font = '700 54px sans-serif';
    g.fillText(label, 196, 560);
  });
}

function paintTurf() {
  return canvasTex((canvas, g) => {
    canvas.width = 256;
    canvas.height = 256;
    g.fillStyle = '#3c7a42';
    g.fillRect(0, 0, 256, 256);
    g.fillStyle = '#458a4b';
    for (let y = 0; y < 256; y += 32) g.fillRect(0, y, 256, 14);
  });
}

function paintGallery() {
  return canvasTex((canvas, g) => {
    canvas.width = 256;
    canvas.height = 256;
    g.fillStyle = '#4a4f55';
    g.fillRect(0, 0, 256, 256);
    g.strokeStyle = '#3a3e44';
    g.lineWidth = 3;
    for (let i = 0; i <= 256; i += 64) {
      g.beginPath();
      g.moveTo(i, 0);
      g.lineTo(i, 256);
      g.moveTo(0, i);
      g.lineTo(256, i);
      g.stroke();
    }
  });
}

function paintReadout(bay) {
  return canvasTex((canvas, g) => {
    canvas.width = 512;
    canvas.height = 288;
    g.fillStyle = '#10241c';
    g.fillRect(0, 0, 512, 288);
    g.strokeStyle = '#1f7a4c';
    g.lineWidth = 8;
    g.strokeRect(10, 10, 492, 268);
    g.fillStyle = '#c8f5d4';
    g.font = '700 40px sans-serif';
    g.fillText('BAY ' + bay.label, 32, 68);
    const rows = bay.hole === 'par3'
      ? [['CARRY', '168'], ['BALL', '124'], ['SPIN', '6840'], ['CLUB', '7I']]
      : [['CARRY', '214'], ['BALL', '148'], ['SPIN', '2460'], ['CLUB', 'DR']];
    rows.forEach((row, i) => {
      g.fillStyle = '#7dbe96';
      g.font = '600 26px sans-serif';
      g.fillText(row[0], 32, 118 + i * 38);
      g.fillStyle = '#f3fff6';
      g.font = '700 28px sans-serif';
      g.fillText(row[1], 210, 118 + i * 38);
    });
    g.strokeStyle = '#e7fff0';
    g.lineWidth = 4;
    g.beginPath();
    g.moveTo(360, 230);
    g.quadraticCurveTo(430, 70, 486, 160);
    g.stroke();
    g.fillStyle = '#ffffff';
    g.beginPath();
    g.arc(486, 160, 6, 0, Math.PI * 2);
    g.fill();
  });
}

function netTexture() {
  return canvasTex((canvas, g) => {
    canvas.width = 128;
    canvas.height = 128;
    g.clearRect(0, 0, 128, 128);
    g.strokeStyle = '#1a2822';
    g.lineWidth = 7;
    g.beginPath();
    for (let i = 4; i < 128; i += 16) {
      g.moveTo(i, 0);
      g.lineTo(i, 128);
      g.moveTo(0, i);
      g.lineTo(128, i);
    }
    g.stroke();
  });
}

function netMaterial(across, up) {
  const tex = netTexture();
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(across / 0.2, up / 0.2);
  const mat = toon('#24342e', {
    map: tex,
    transparent: true,
    alphaTest: 0.45,
    side: THREE.DoubleSide,
  });
  return mat;
}

function markQuiet(mesh) {
  mesh.userData.noCast = true;
  mesh.userData.noReceive = true;
  return mesh;
}

function makeShell(layout) {
  const g = new THREE.Group();
  g.name = 'shell';
  const room = layout.meta.room;
  const s = layout.shell;
  const W = room.maxX - room.minX;
  const D = room.maxZ - room.minZ;
  const H = room.height;
  const t = room.wall;
  const cx = (room.minX + room.maxX) / 2;
  const cz = (room.minZ + room.maxZ) / 2;
  const wall = toon(s.wallColor);
  const dado = toon(s.dadoColor);
  const wood = toon(s.woodColor);
  const dark = toon(s.woodDark);
  const ceilMat = toon(s.ceilingColor);

  const floor = addBox(g, W, 0.08, D, toon('#2c3330'), cx, -0.04, cz);
  floor.userData.noCast = true;
  floor.name = 'slab';

  const screenWall = addBox(g, W, H, t, wall, cx, H / 2, room.minZ + t / 2);
  screenWall.name = 'screen-wall';
  addBox(g, t, H, D, wall, room.minX + t / 2, H / 2, cz);
  addBox(g, t, H, D, wall, room.maxX - t / 2, H / 2, cz);

  const dadoH = 1.12;
  addBox(g, W - 0.2, dadoH, 0.045, dado, cx, dadoH / 2, room.minZ + t + 0.02);
  addBox(g, 0.045, dadoH, D - 0.3, dado, room.minX + t + 0.02, dadoH / 2, cz);
  addBox(g, 0.045, dadoH, D - 0.3, dado, room.maxX - t - 0.02, dadoH / 2, cz);

  const ceil = addBox(g, W - 0.05, 0.08, room.maxZ - room.minZ - 1.35, ceilMat, cx, H - 0.04, (room.minZ + room.maxZ) / 2 - 0.55);
  ceil.userData.noCast = true;
  ceil.userData.noReceive = true;

  for (const z of [-3.45, -1.15, 1.35]) {
    const beam = addBox(g, W - 0.5, 0.16, 0.14, wood, cx, H - 0.22, z);
    beam.userData.noCast = true;
  }

  // Open-end portal, the cutaway frame.
  addBox(g, 0.16, H, 0.16, dark, room.minX + t, H / 2, room.maxZ - 0.1);
  addBox(g, 0.16, H, 0.16, dark, room.maxX - t, H / 2, room.maxZ - 0.1);
  addBox(g, W - 0.2, 0.18, 0.16, dark, cx, H - 0.1, room.maxZ - 0.1);

  for (const x of [-4.55, -1.7, 1.7, 4.55]) {
    const batten = addBox(g, 0.07, H - dadoH - 0.35, 0.05, wood, x, dadoH + (H - dadoH - 0.35) / 2, room.minZ + t + 0.03);
    batten.userData.noCast = true;
  }
  return g;
}

function screenArc(bay, screenZ) {
  const radius = 7.4;
  const theta = bay.screenW / radius;
  const geo = new THREE.CylinderGeometry(radius, radius, bay.screenH, 48, 1, true, Math.PI - theta / 2, theta);
  const map = paintHole(bay.hole);
  // Inside of the arc mirrors U. Flip so the yardage reads left to right.
  map.wrapS = THREE.RepeatWrapping;
  map.repeat.x = -1;
  map.offset.x = 1;
  const mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({
    map,
    side: THREE.DoubleSide,
  }));
  mesh.position.set(bay.cx, bay.screenBottom + bay.screenH / 2, screenZ + radius);
  mesh.userData.keepMaterial = true;
  mesh.userData.noCast = true;
  mesh.userData.noReceive = true;
  mesh.name = 'screen-' + bay.id;
  return { mesh, radius, theta };
}

function endPoint(bay, screenZ, radius, theta, sign) {
  const a = Math.PI + sign * theta / 2;
  return [
    bay.cx + radius * Math.sin(a),
    (screenZ + radius) + radius * Math.cos(a),
  ];
}

function makeProcedural(layout) {
  const g = new THREE.Group();
  g.name = 'architecture';
  const s = layout.shell;
  const meta = layout.meta;
  const room = meta.room;
  const wood = toon(s.woodColor);
  const dark = toon(s.woodDark);
  const metal = toon(s.metal);
  const pad = toon(s.pad);
  const brass = toon(s.brass);
  const innerL = room.minX + room.wall;
  const innerR = room.maxX - room.wall;
  const innerZ = room.minZ + room.wall;
  const span = innerR - innerL;

  const turfTex = paintTurf();
  turfTex.wrapS = THREE.RepeatWrapping;
  turfTex.wrapT = THREE.RepeatWrapping;
  turfTex.repeat.set(8, 5);
  const turf = addBox(
    g,
    span,
    0.02,
    meta.safetyZ - innerZ,
    toon('#3e8446', { map: turfTex }),
    (innerL + innerR) / 2,
    0.012,
    (innerZ + meta.safetyZ) / 2,
  );
  turf.name = 'turf';
  turf.userData.noCast = true;

  const gallTex = paintGallery();
  gallTex.wrapS = THREE.RepeatWrapping;
  gallTex.wrapT = THREE.RepeatWrapping;
  gallTex.repeat.set(8, 4);
  const gallery = addBox(
    g,
    span,
    0.02,
    room.maxZ - meta.safetyZ + 0.04,
    toon('#4a4f55', { map: gallTex }),
    (innerL + innerR) / 2,
    0.012,
    (meta.safetyZ + room.maxZ) / 2,
  );
  gallery.userData.noCast = true;
  gallery.name = 'gallery-floor';

  for (const x0 of [innerL, 0.18]) {
    const x1 = x0 < 0 ? -0.18 : innerR;
    const line = addBox(g, x1 - x0, 0.008, 0.07, toon('#e2b340'), (x0 + x1) / 2, 0.026, meta.safetyZ);
    line.userData.noCast = true;
    line.name = 'safety-line';
  }

  const netH = meta.netSoffit;
  const netZ0 = innerZ + 0.05;
  const netZ1 = meta.safetyZ;
  const ceilZ0 = -3.5;
  const netLen = netZ1 - netZ0;
  const netZ = (netZ0 + netZ1) / 2;
  for (const x of [-6.02, 0, 6.02]) {
    const plane = new THREE.Mesh(new THREE.PlaneGeometry(netLen, netH), netMaterial(netLen, netH));
    plane.rotation.y = Math.PI / 2;
    plane.position.set(x, netH / 2, netZ);
    markQuiet(plane);
    plane.name = x === 0 ? 'net-divider' : 'net-side';
    g.add(plane);
  }
  for (const bay of meta.bays) {
    const width = bay.inner[1] - bay.inner[0] - 0.2;
    const depth = netZ1 - ceilZ0;
    const ceilNet = new THREE.Mesh(new THREE.PlaneGeometry(width, depth), netMaterial(width, depth));
    ceilNet.rotation.x = -Math.PI / 2;
    ceilNet.position.set(bay.cx, meta.netSoffit, (ceilZ0 + netZ1) / 2);
    markQuiet(ceilNet);
    ceilNet.name = 'net-ceiling-' + bay.id;
    g.add(ceilNet);
  }
  for (const z of [-4.7, -2.55, -0.35, 0.82]) {
    const post = addCyl(g, 0.09, 0.1, netH, pad, 0, netH / 2, z, 14);
    post.name = 'divider-post';
    addSphere(g, 0.11, toon('#1d2823'), 0, netH + 0.02, z, 12);
  }

  for (const bay of meta.bays) {
    const { mesh, radius, theta } = screenArc(bay, meta.screenZ);
    g.add(mesh);
    const back = addBox(
      g,
      bay.screenW + 0.35,
      bay.screenH + 0.28,
      0.06,
      metal,
      bay.cx,
      bay.screenBottom + bay.screenH / 2,
      meta.screenZ - 0.12,
    );
    back.userData.noCast = true;
    for (const sign of [-1, 1]) {
      const [x, z] = endPoint(bay, meta.screenZ, radius, theta, sign);
      const post = addCyl(g, 0.055, 0.06, bay.screenBottom + bay.screenH + 0.08, metal, x, (bay.screenBottom + bay.screenH) / 2, z, 12);
      post.name = 'screen-post';
    }
    const valance = addBox(g, bay.screenW + 0.2, 0.16, 0.18, wood, bay.cx, bay.screenBottom + bay.screenH + 0.18, meta.screenZ + 0.08);
    valance.userData.noCast = true;
    const plaque = new THREE.Mesh(
      new THREE.PlaneGeometry(0.72, 0.22),
      new THREE.MeshBasicMaterial({ color: '#ffffff' }),
    );
    plaque.position.set(bay.cx, bay.screenBottom + bay.screenH + 0.18, meta.screenZ + 0.18);
    plaque.userData.keepMaterial = true;
    plaque.userData.noCast = true;
    g.add(plaque);
    const label = canvasTex((canvas, ctx) => {
      canvas.width = 256;
      canvas.height = 80;
      ctx.fillStyle = '#1c2420';
      ctx.fillRect(0, 0, 256, 80);
      ctx.fillStyle = '#e7c27a';
      ctx.font = '700 42px sans-serif';
      ctx.fillText('BAY ' + bay.label, 48, 54);
    });
    plaque.material.map = label;
    plaque.material.needsUpdate = true;

    const [bx, bz] = bay.ball;
    addBox(g, 1.62, 0.028, 1.78, metal, bx, 0.02, bz + 0.28);
    const mat = new THREE.Mesh(new THREE.PlaneGeometry(1.46, 1.6), toon('#4c984c', { map: paintMat(bay.label) }));
    mat.rotation.x = -Math.PI / 2;
    mat.position.set(bx, 0.04, bz + 0.28);
    mat.receiveShadow = true;
    mat.userData.noCast = true;
    mat.name = 'mat-' + bay.id;
    g.add(mat);

    const ball = addSphere(g, 0.021, toon('#f4f7f2'), bx, 0.1, bz, 14);
    ball.name = 'ball-' + bay.id;
    ball.userData.noCast = true;

    const monitor = layout.meta.monitors.find((item) => item.bay === bay.id);
    g.add(launchMonitor(monitor, bay, metal, brass));

    const spot = new THREE.SpotLight('#fff2dc', 5.5, 8.5, 0.48, 0.5, 1.2);
    spot.position.set(bay.cx, 3.15, bz + 0.2);
    spot.target.position.set(bx, 0, bz);
    spot.castShadow = false;
    g.add(spot);
    g.add(spot.target);

    const basketX = bay.cx + (bay.id === 'a' ? -1.45 : 1.45);
    ballBasket(g, basketX, 1.32, metal);
  }

  clubRacks(g, layout, wood, dark);
  serviceCounter(g, wood, dark, brass);
  for (const pot of layout.instances.filter((item) => item.kind === 'flowerpot')) {
    shrub(g, pot.position[0], pot.position[2]);
  }
  return g;
}

function launchMonitor(monitor, bay, metal, brass) {
  const root = new THREE.Group();
  root.name = 'monitor-' + bay.id;
  root.position.set(monitor.x, 0, monitor.z);
  const [bx, bz] = bay.ball;
  const yaw = Math.atan2(bx - monitor.x, bz - monitor.z);
  const g = new THREE.Group();
  g.rotation.y = yaw;
  root.add(g);
  const body = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 16), metal);
  body.scale.set(0.2, 0.072, 0.15);
  body.position.y = 0.078;
  g.add(body);
  const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.13, 0.02, 18), metal);
  foot.position.y = 0.012;
  g.add(foot);
  for (const x of [-0.055, 0.055]) {
    const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.026, 0.02, 16), toon('#12161a'));
    lens.rotation.x = Math.PI / 2;
    lens.position.set(x, 0.082, 0.132);
    g.add(lens);
    const glass = new THREE.Mesh(
      new THREE.CircleGeometry(0.018, 16),
      new THREE.MeshBasicMaterial({ color: '#1f6b86' }),
    );
    glass.position.set(x, 0.082, 0.144);
    glass.userData.keepMaterial = true;
    glass.userData.noCast = true;
    g.add(glass);
  }
  const lip = new THREE.Mesh(new THREE.TorusGeometry(0.018, 0.004, 8, 16), brass);
  lip.position.set(0.09, 0.05, 0);
  lip.rotation.y = Math.PI / 2;
  g.add(lip);
  const display = new THREE.Mesh(
    new THREE.PlaneGeometry(0.24, 0.15),
    new THREE.MeshBasicMaterial({ map: paintReadout(bay), side: THREE.DoubleSide }),
  );
  // Gallery side of the puck. Negative X rotation leans the top back so the face points up at the seats.
  display.position.set(0, 0.16, 0.07);
  display.rotation.x = -0.7;
  display.userData.keepMaterial = true;
  display.userData.noCast = true;
  display.name = 'readout-' + bay.id;
  root.add(display);
  return root;
}

function clubRacks(g, layout, wood, dark) {
  for (const bayId of ['a', 'b']) {
    const clubs = layout.instances.filter((item) => item.bay === bayId && String(item.kind).startsWith('golf_') && item.kind !== 'golf_tee');
    if (!clubs.length) continue;
    const xs = clubs.map((item) => item.position[0]);
    const zs = clubs.map((item) => item.position[2]);
    const x = xs.reduce((a, b) => a + b, 0) / xs.length;
    const z0 = Math.min(...zs);
    const z1 = Math.max(...zs);
    const side = bayId === 'a' ? -1 : 1;
    const zc = (z0 + z1) / 2;
    const length = z1 - z0 + 0.46;
    const backX = x + side * 0.16;
    const rail = addCyl(g, 0.016, 0.016, length, dark, backX, 1.22, zc, 10);
    rail.rotation.x = Math.PI / 2;
    rail.name = 'rack-' + bayId;
    const brace = addCyl(g, 0.014, 0.014, length, dark, backX - side * 0.02, 0.48, zc, 10);
    brace.rotation.x = Math.PI / 2;
    for (const z of [z0 - 0.16, z1 + 0.16]) {
      addCyl(g, 0.028, 0.034, 1.34, wood, backX, 0.67, z, 10);
    }
    const lip = addBox(g, 0.08, 0.045, length, dark, x - side * 0.08, 0.06, zc);
    lip.userData.noCast = true;
    addBox(g, 0.16, 0.035, length, wood, x, 0.03, zc).userData.noCast = true;
  }
}

function serviceCounter(g, wood, dark, brass) {
  const z = 3.98;
  addBox(g, 1.85, 0.06, 0.5, wood, 0, 0.83, z);
  const nose = addCyl(g, 0.035, 0.035, 1.85, wood, 0, 0.8, z + 0.23, 12);
  nose.rotation.z = Math.PI / 2;
  for (const x of [-0.78, 0.78]) {
    addCyl(g, 0.035, 0.045, 0.78, dark, x, 0.39, z - 0.08, 12);
    addCyl(g, 0.035, 0.045, 0.78, dark, x, 0.39, z + 0.12, 12);
  }
  addBox(g, 0.9, 0.025, 0.22, brass, 0.15, 0.865, z);
}

function ballBasket(g, x, z, metal) {
  const pts = [];
  for (let i = 0; i <= 10; i++) {
    const t = i / 10;
    const y = t * 0.26;
    const r = 0.1 + Math.sin(t * Math.PI) * 0.07 + t * 0.02;
    pts.push(new THREE.Vector2(Math.max(0.04, r), y));
  }
  const bowl = new THREE.Mesh(new THREE.LatheGeometry(pts, 18), metal);
  bowl.position.set(x, 0.02, z);
  bowl.name = 'basket';
  g.add(bowl);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.175, 0.012, 8, 20), toon('#c6a15a'));
  rim.rotation.x = Math.PI / 2;
  rim.position.set(x, 0.28, z);
  g.add(rim);
  const balls = [[0, 0], [0.05, 0.03], [-0.04, 0.02], [0.02, -0.04], [-0.03, -0.035]];
  for (const [dx, dz] of balls) {
    const ball = addSphere(g, 0.02, toon('#f7f7f4'), x + dx, 0.12, z + dz, 10);
    ball.userData.noCast = true;
  }
}

function shrub(g, x, z) {
  const leaf = toon('#2f6a3c');
  addSphere(g, 0.11, leaf, x, 0.46, z, 12);
  addSphere(g, 0.08, toon('#3d7d48'), x + 0.07, 0.52, z + 0.02, 10);
  addSphere(g, 0.07, toon('#245633'), x - 0.06, 0.5, z - 0.03, 10);
}

boot({
  makeShell,
  makeProcedural,
  readyText: 'two bays — orbit · T toon · U unlit',
  onReady({ layout }) {
    const issues = collectIssues(layout, layout.meta.chairFootprint);
    window.__audit = { ok: issues.length === 0, issues };
    if (issues.length) console.warn(issues.join('\n'));
  },
}).catch((err) => {
  window.__errors = window.__errors || [];
  window.__errors.push(String(err && err.message || err));
  window.__bootError = String(err && err.message || err);
  const status = document.getElementById('status');
  if (status) status.textContent = window.__bootError;
});
