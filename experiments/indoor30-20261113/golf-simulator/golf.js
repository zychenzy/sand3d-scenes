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

function pine(g, x, ground, h, w) {
  g.beginPath();
  g.moveTo(x, ground);
  g.lineTo(x + w * 0.5, ground - h);
  g.lineTo(x + w, ground);
  g.fill();
}

function roundTree(g, x, ground, h, w) {
  g.beginPath();
  g.ellipse(x + w * 0.5, ground - h * 0.62, w * 0.55, h * 0.42, 0, 0, Math.PI * 2);
  g.fill();
  g.fillRect(x + w * 0.42, ground - h * 0.35, w * 0.16, h * 0.35);
}

function paintHole(kind) {
  return canvasTex((canvas, g) => {
    canvas.width = 1024;
    canvas.height = 768;
    const par3 = kind === 'par3';
    const sky = g.createLinearGradient(0, 0, 0, 420);
    if (par3) {
      sky.addColorStop(0, '#8eb7d4');
      sky.addColorStop(0.65, '#d5e6ea');
      sky.addColorStop(1, '#efe2c4');
    } else {
      sky.addColorStop(0, '#3e86c4');
      sky.addColorStop(0.7, '#b7daf2');
      sky.addColorStop(1, '#d5e7c8');
    }
    g.fillStyle = sky;
    g.fillRect(0, 0, 1024, 768);
    g.fillStyle = par3 ? '#fff1c9' : '#fff6d2';
    g.beginPath();
    g.arc(par3 ? 210 : 820, par3 ? 150 : 92, par3 ? 28 : 36, 0, Math.PI * 2);
    g.fill();

    if (par3) {
      g.fillStyle = '#1e4d38';
      g.beginPath();
      g.moveTo(0, 430);
      g.lineTo(180, 300);
      g.lineTo(340, 390);
      g.lineTo(0, 470);
      g.fill();
      g.fillStyle = '#245c40';
      roundTree(g, 40, 430, 150, 90);
      roundTree(g, 110, 440, 190, 120);
      g.fillStyle = '#163c2c';
      pine(g, 860, 400, 150, 70);
      pine(g, 930, 410, 110, 60);
      g.fillStyle = '#2a6a48';
      pine(g, 800, 415, 90, 50);

      g.fillStyle = '#2f74a4';
      g.fillRect(0, 400, 1024, 368);
      g.fillStyle = '#3e86b6';
      for (let y = 430; y < 760; y += 36) {
        g.fillRect(0, y, 1024, 8);
      }
      g.fillStyle = '#e7d7b0';
      g.beginPath();
      g.moveTo(250, 470);
      g.quadraticCurveTo(520, 430, 790, 500);
      g.lineTo(760, 540);
      g.quadraticCurveTo(500, 490, 280, 530);
      g.fill();
      g.fillStyle = '#3f9a52';
      g.beginPath();
      g.ellipse(620, 500, 150, 58, -0.2, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = '#2f7d40';
      g.beginPath();
      g.ellipse(600, 492, 90, 28, -0.3, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = '#e4d2a4';
      g.beginPath();
      g.ellipse(500, 530, 36, 16, 0.4, 0, Math.PI * 2);
      g.fill();
      g.strokeStyle = '#f4f1e8';
      g.lineWidth = 5;
      g.beginPath();
      g.moveTo(640, 500);
      g.lineTo(640, 430);
      g.stroke();
      g.fillStyle = '#d24b45';
      g.beginPath();
      g.moveTo(640, 430);
      g.lineTo(700, 448);
      g.lineTo(640, 466);
      g.fill();
    } else {
      g.fillStyle = '#8e9a78';
      g.beginPath();
      g.moveTo(0, 360);
      g.lineTo(260, 300);
      g.lineTo(520, 348);
      g.lineTo(780, 280);
      g.lineTo(1024, 340);
      g.lineTo(1024, 400);
      g.lineTo(0, 400);
      g.fill();
      g.fillStyle = '#1f5a34';
      const left = [[30, 200, 70], [90, 250, 80], [160, 160, 60], [240, 220, 74]];
      for (const [x, h, w] of left) pine(g, x, 390, h, w);
      g.fillStyle = '#2f6d40';
      roundTree(g, 300, 395, 170, 110);
      g.fillStyle = '#173f28';
      pine(g, 860, 380, 180, 78);
      pine(g, 940, 390, 130, 64);
      g.fillStyle = '#24633a';
      roundTree(g, 760, 390, 120, 80);

      g.fillStyle = '#d5e3b4';
      g.fillRect(0, 378, 1024, 390);
      g.fillStyle = '#c9d9a6';
      for (let y = 410; y < 760; y += 46) g.fillRect(0, y, 1024, 7);
      g.fillStyle = '#5ea246';
      g.beginPath();
      g.moveTo(470, 768);
      g.lineTo(760, 768);
      g.quadraticCurveTo(700, 640, 560, 540);
      g.quadraticCurveTo(400, 450, 300, 390);
      g.lineTo(230, 410);
      g.quadraticCurveTo(340, 490, 470, 590);
      g.quadraticCurveTo(560, 680, 470, 768);
      g.fill();
      g.strokeStyle = 'rgba(255,255,255,0.28)';
      g.lineWidth = 8;
      g.beginPath();
      g.moveTo(620, 750);
      g.quadraticCurveTo(560, 620, 430, 520);
      g.quadraticCurveTo(340, 450, 280, 400);
      g.stroke();
      g.fillStyle = '#e4d2a2';
      g.beginPath();
      g.ellipse(500, 560, 62, 22, -0.6, 0, Math.PI * 2);
      g.fill();
      g.beginPath();
      g.ellipse(360, 450, 40, 16, 0.4, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = '#3d9850';
      g.beginPath();
      g.ellipse(270, 400, 88, 34, -0.4, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = '#2d7840';
      g.beginPath();
      g.ellipse(258, 394, 46, 14, -0.5, 0, Math.PI * 2);
      g.fill();
      g.strokeStyle = '#f7f7f4';
      g.lineWidth = 5;
      g.beginPath();
      g.moveTo(262, 396);
      g.lineTo(262, 330);
      g.stroke();
      g.fillStyle = '#f4f4f2';
      g.beginPath();
      g.moveTo(262, 330);
      g.lineTo(318, 348);
      g.lineTo(262, 366);
      g.fill();
    }

    g.fillStyle = 'rgba(16, 28, 22, 0.62)';
    g.fillRect(36, 34, 300, 70);
    g.fillStyle = '#f6f1e6';
    g.font = '600 32px sans-serif';
    g.fillText(par3 ? 'PAR 3   ·   168' : 'PAR 4   ·   412', 54, 80);
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
  const carry = bay.hole === 'par3' ? '168' : '214';
  const club = bay.hole === 'par3' ? '7I' : 'DR';
  return canvasTex((canvas, g) => {
    canvas.width = 640;
    canvas.height = 360;
    g.fillStyle = '#0e1c16';
    g.fillRect(0, 0, 640, 360);
    g.fillStyle = '#163528';
    g.fillRect(0, 0, 640, 86);
    g.fillStyle = '#d7f5e2';
    g.font = '700 54px sans-serif';
    g.fillText('BAY ' + bay.label, 28, 60);
    g.fillStyle = '#8dccaa';
    g.font = '600 32px sans-serif';
    g.fillText('CARRY', 28, 150);
    g.fillText('CLUB', 28, 270);
    g.fillStyle = '#f4fff8';
    g.font = '700 84px sans-serif';
    g.fillText(carry, 230, 168);
    g.fillText(club, 230, 292);
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
  sideGallery(g, layout, wood);
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
  const g = new THREE.Group();
  g.rotation.y = Math.atan2(bx - monitor.x, bz - monitor.z);
  root.add(g);
  const rubber = toon('#1a1f22');
  const plinth = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.016, 0.3), rubber);
  plinth.position.set(0, 0.01, 0);
  g.add(plinth);
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.048, 0.24), metal);
  body.position.set(0, 0.042, 0.01);
  g.add(body);
  for (const z of [-0.1, 0.12]) {
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.08, 16, 12), metal);
    cap.scale.set(1, 0.3, 0.55);
    cap.position.set(0, 0.042, z);
    g.add(cap);
  }
  const cowl = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.04, 0.1), toon('#2a3034'));
  cowl.position.set(0, 0.078, -0.04);
  g.add(cowl);
  for (const x of [-0.045, 0.045]) {
    const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.026, 0.03, 14), toon('#12161a'));
    lens.rotation.x = Math.PI / 2;
    lens.position.set(x, 0.05, 0.125);
    g.add(lens);
    const glass = new THREE.Mesh(
      new THREE.CircleGeometry(0.014, 14),
      new THREE.MeshBasicMaterial({ color: '#1f6b86' }),
    );
    glass.position.set(x, 0.05, 0.142);
    glass.userData.keepMaterial = true;
    glass.userData.noCast = true;
    g.add(glass);
  }
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.016, 0.003, 6, 14), brass);
  ring.position.set(0.078, 0.04, 0.02);
  ring.rotation.y = Math.PI / 2;
  g.add(ring);
  for (const [x, z] of [[-0.07, -0.1], [0.07, -0.1], [-0.07, 0.1], [0.07, 0.1]]) {
    const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.014, 0.012, 8), rubber);
    foot.position.set(x, 0.006, z);
    g.add(foot);
  }
  const bezel = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.122, 0.01), toon('#14181c'));
  bezel.position.set(0, 0.112, 0.02);
  bezel.rotation.x = -1.02;
  g.add(bezel);
  const display = new THREE.Mesh(
    new THREE.PlaneGeometry(0.186, 0.108),
    new THREE.MeshBasicMaterial({ map: paintReadout(bay), side: THREE.DoubleSide }),
  );
  display.position.set(0, 0.112, 0.03);
  display.rotation.x = -1.02;
  display.userData.keepMaterial = true;
  display.userData.noCast = true;
  display.name = 'readout-' + bay.id;
  g.add(display);
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

function sideGallery(g, layout, wood) {
  const room = layout.meta.room;
  const t = room.wall;
  for (const x of [room.minX + t + 0.05, room.maxX - t - 0.05]) {
    const rail = addBox(g, 0.055, 0.045, 4.05, wood, x, 1.2, 3.05);
    rail.userData.noCast = true;
    rail.name = 'chair-rail';
  }
  wallCard(g, room.minX + t + 0.06, 1.86, 2.45, Math.PI / 2, 'BAY 01', 'PAR 4');
  wallCard(g, room.maxX - t - 0.06, 1.86, 2.45, -Math.PI / 2, 'BAY 02', 'PAR 3');
}

function wallCard(g, x, y, z, yaw, title, line) {
  const group = new THREE.Group();
  group.position.set(x, y, z);
  group.rotation.y = yaw;
  const frame = addBox(group, 0.72, 0.46, 0.03, toon('#5c3b28'), 0, 0, 0);
  frame.userData.noCast = true;
  const card = new THREE.Mesh(
    new THREE.PlaneGeometry(0.62, 0.36),
    new THREE.MeshBasicMaterial({ color: '#ffffff' }),
  );
  card.position.z = 0.016;
  card.userData.keepMaterial = true;
  card.userData.noCast = true;
  card.material.map = canvasTex((canvas, ctx) => {
    canvas.width = 440;
    canvas.height = 260;
    ctx.fillStyle = '#1c2420';
    ctx.fillRect(0, 0, 440, 260);
    ctx.fillStyle = '#e7c27a';
    ctx.font = '700 64px sans-serif';
    ctx.fillText(title, 36, 110);
    ctx.fillStyle = '#f4efe4';
    ctx.font = '600 42px sans-serif';
    ctx.fillText(line, 36, 180);
  });
  card.material.needsUpdate = true;
  group.add(card);
  g.add(group);
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
  tuneAsset(kind, prepared) {
    if (kind !== 'theatre_chair') return;
    const inner = prepared.children[0];
    inner.scale.x *= 0.6;
    inner.updateWorldMatrix(true, true);
    const box = new THREE.Box3().setFromObject(prepared);
    inner.position.x -= (box.min.x + box.max.x) / 2;
  },
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
