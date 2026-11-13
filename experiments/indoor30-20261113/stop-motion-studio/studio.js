import * as THREE from 'three';
import { boot, toon } from './scene_lib.js';

const MATS = new Map();
function M(color, opts) {
  const key = color + '|' + (opts ? JSON.stringify(opts) : '');
  if (!MATS.has(key)) MATS.set(key, toon(color, opts));
  return MATS.get(key);
}

function addBox(g, w, h, d, mat, x, y, z) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  g.add(mesh);
  return mesh;
}

function addCyl(g, rTop, rBot, h, mat, x, y, z, seg = 12) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBot, h, seg), mat);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  g.add(mesh);
  return mesh;
}

function addRod(g, a, b, r, mat, segs = 6) {
  const start = a instanceof THREE.Vector3 ? a.clone() : new THREE.Vector3(...a);
  const end = b instanceof THREE.Vector3 ? b.clone() : new THREE.Vector3(...b);
  const dir = end.clone().sub(start);
  const len = dir.length();
  if (len < 1e-4) return null;
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, segs), mat);
  mesh.position.copy(start).add(end).multiplyScalar(0.5);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  g.add(mesh);
  return mesh;
}

function quiet(mesh) {
  if (!mesh) return mesh;
  mesh.userData.noCast = true;
  mesh.castShadow = false;
  return mesh;
}

function contact(g, x, z, rx, rz, y = 0.012) {
  const mesh = new THREE.Mesh(
    new THREE.CircleGeometry(1, 14),
    new THREE.MeshBasicMaterial({ color: '#2a2724', transparent: true, opacity: 0.16, depthWrite: false })
  );
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set(x, y, z);
  mesh.scale.set(rx, rz, 1);
  mesh.userData.contact = true;
  g.add(mesh);
}

function byId(layout, id) {
  const inst = (layout.instances || []).find((i) => i.id === id);
  if (!inst) throw new Error('missing instance ' + id);
  return inst;
}

function canvasTex(draw, w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d'), w, h);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function woodTexture(roomW, roomD) {
  const tex = canvasTex((g) => {
    const colors = ['#c9a47a', '#bb946c', '#d2ad82', '#c29b72'];
    const plank = 64;
    for (let i = 0; i < 4; i++) {
      g.fillStyle = colors[i];
      g.fillRect(i * plank, 0, plank, 256);
      g.fillStyle = 'rgba(70,46,24,0.45)';
      g.fillRect(i * plank, 0, 2, 256);
      g.strokeStyle = 'rgba(90,58,30,0.22)';
      g.lineWidth = 1;
      const seam = 40 + (i % 2) * 90;
      g.beginPath();
      g.moveTo(i * plank + 4, seam);
      g.lineTo(i * plank + plank - 4, seam);
      g.stroke();
      for (let k = 0; k < 4; k++) {
        g.beginPath();
        const x = i * plank + 10 + k * 12;
        g.moveTo(x, 0);
        g.bezierCurveTo(x + 2, 80, x - 2, 160, x + 1, 256);
        g.stroke();
      }
    }
  }, 256, 256);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  // Four planks across the canvas span 0.64m. One canvas height is 1.45m of board.
  tex.repeat.set(roomW / 0.64, roomD / 1.45);
  return tex;
}

function frameGrab() {
  return canvasTex((g, w, h) => {
    g.fillStyle = '#1c2430';
    g.fillRect(0, 0, w, h);
    g.fillStyle = '#6f675c';
    g.fillRect(0, h * 0.62, w, h * 0.38);
    g.fillStyle = '#c48a4a';
    g.fillRect(w * 0.12, h * 0.28, w * 0.2, h * 0.36);
    g.fillStyle = '#8d4a3a';
    g.fillRect(w * 0.38, h * 0.18, w * 0.16, h * 0.46);
    g.fillStyle = '#e4d3b0';
    g.fillRect(w * 0.6, h * 0.32, w * 0.22, h * 0.32);
    g.fillStyle = '#8d3342';
    g.fillRect(w * 0.46, h * 0.5, w * 0.06, h * 0.16);
    g.fillStyle = '#e4b394';
    g.beginPath();
    g.arc(w * 0.49, h * 0.48, w * 0.025, 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = 'rgba(255,220,170,0.35)';
    g.strokeRect(w * 0.08, h * 0.12, w * 0.84, h * 0.7);
    g.fillStyle = '#f3efe6';
    g.font = '600 28px sans-serif';
    g.fillText('0142', 16, 36);
    g.font = '500 16px sans-serif';
    g.fillStyle = '#f0c48a';
    g.fillText('ONION', w - 90, 32);
  }, 512, 288);
}

function dopeSheet() {
  return canvasTex((g, w, h) => {
    g.fillStyle = '#f4efe4';
    g.fillRect(0, 0, w, h);
    g.strokeStyle = '#c8bba6';
    g.lineWidth = 2;
    for (let i = 1; i < 8; i++) {
      g.beginPath();
      g.moveTo(0, (h / 8) * i);
      g.lineTo(w, (h / 8) * i);
      g.stroke();
    }
    g.fillStyle = '#2c2926';
    g.font = '600 22px sans-serif';
    g.fillText('X SHEET  0140-0148', 12, 28);
    g.font = '700 20px sans-serif';
    for (let r = 0; r < 6; r++) {
      for (let c = 0; c < 8; c++) {
        if ((r + c) % 3 === 0) g.fillText('X', 18 + c * 28, 62 + r * 22);
      }
    }
  }, 256, 192);
}

function rulerTex() {
  return canvasTex((g, w, h) => {
    g.fillStyle = '#d9d3c6';
    g.fillRect(0, 0, w, h);
    g.fillStyle = '#2c2926';
    g.strokeStyle = '#2c2926';
    for (let i = 0; i <= 30; i++) {
      const x = 8 + (i / 30) * (w - 16);
      const tall = i % 10 === 0 ? h * 0.72 : i % 5 === 0 ? h * 0.5 : h * 0.32;
      g.fillRect(x, h * 0.12, 2, tall);
    }
    g.font = '600 16px sans-serif';
    g.fillText('30 cm', 12, h - 6);
  }, 600, 48);
}

function cycleCard(step) {
  return canvasTex((g, w, h) => {
    g.fillStyle = '#efe6d4';
    g.fillRect(0, 0, w, h);
    g.strokeStyle = '#2c2926';
    g.lineWidth = 3;
    const poses = [
      [0.5, 0.2],
      [0.42, 0.05],
      [0.58, 0.12],
      [0.36, 0.18],
    ];
    const hip = 78;
    const lift = poses[step % 4][1] * 40;
    g.beginPath();
    g.moveTo(w * 0.5, 28);
    g.lineTo(w * 0.5, hip - lift);
    g.moveTo(w * 0.5, 48);
    g.lineTo(w * poses[step % 4][0], 70);
    g.moveTo(w * 0.5, 48);
    g.lineTo(w * (1 - poses[step % 4][0]), 74);
    g.moveTo(w * 0.5, hip - lift);
    g.lineTo(w * 0.38, h - 16);
    g.moveTo(w * 0.5, hip - lift);
    g.lineTo(w * 0.66, h - 18 + (step % 2) * 8);
    g.stroke();
    g.fillStyle = '#e4b394';
    g.beginPath();
    g.arc(w * 0.5, 22, 10, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#8d3342';
    g.fillRect(w * 0.44, 40, w * 0.12, 28);
    g.fillStyle = '#6b4e38';
    g.font = '600 14px sans-serif';
    g.fillText(String(step + 1).padStart(2, '0'), 8, h - 8);
  }, 160, 120);
}

function heroBoard() {
  return canvasTex((g, w, h) => {
    g.fillStyle = '#f6f1e6';
    g.fillRect(0, 0, w, h);
    g.fillStyle = '#c48a4a';
    g.fillRect(40, 70, 90, 120);
    g.fillStyle = '#8d4a3a';
    g.fillRect(150, 40, 70, 150);
    g.fillStyle = '#e4d3b0';
    g.fillRect(240, 80, 100, 110);
    g.fillStyle = '#8d3342';
    g.fillRect(175, 150, 22, 40);
    g.fillStyle = '#e4b394';
    g.beginPath();
    g.arc(186, 142, 12, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#3f534c';
    g.font = '700 28px sans-serif';
    g.fillText('SC 12  WALK', 24, 36);
  }, 512, 320);
}

function labelTex(text) {
  return canvasTex((g, w, h) => {
    g.fillStyle = '#efe6d2';
    g.fillRect(0, 0, w, h);
    g.fillStyle = '#2c2926';
    g.font = '600 28px sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(text, w / 2, h / 2);
  }, 256, 64);
}

function plane(g, w, h, tex, x, y, z, ry) {
  const mat = toon('#ffffff', { emissive: '#ffffff', emissiveIntensity: 0.25 });
  mat.map = tex;
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
  mesh.position.set(x, y, z);
  mesh.rotation.y = ry;
  mesh.userData.noCast = true;
  mesh.castShadow = false;
  mesh.receiveShadow = true;
  g.add(mesh);
  return mesh;
}

function puppet(opt) {
  const h = opt.h;
  const s = h / 0.18;
  const g = new THREE.Group();
  const skin = M(opt.head || '#e4b394');
  const cloth = M(opt.coat || '#8d3342');
  const wire = M('#a3a8ae');
  const joint = M('#c6a15a');
  const shoe = M('#2c2824');
  const legH = 0.068 * s;
  const torsoH = 0.052 * s;
  const hipY = 0.016 * s + legH;
  const torsoY = hipY + torsoH * 0.45;
  const shoulderY = hipY + torsoH;
  const headR = 0.024 * s;

  addBox(g, 0.02 * s, 0.01 * s, 0.032 * s, shoe, -0.013 * s, 0.005 * s, 0.006 * s);
  addBox(g, 0.02 * s, 0.01 * s, 0.032 * s, shoe, 0.013 * s, 0.005 * s, 0.006 * s);

  if (opt.wire) {
    quiet(addCyl(g, 0.0032 * s, 0.0032 * s, legH, wire, -0.013 * s, 0.012 * s + legH / 2, 0, 6));
    quiet(addCyl(g, 0.0032 * s, 0.0032 * s, legH, wire, 0.013 * s, 0.012 * s + legH / 2, 0, 6));
    addCyl(g, 0.007 * s, 0.007 * s, 0.012 * s, joint, 0, hipY, 0, 8);
    quiet(addBox(g, 0.028 * s, torsoH, 0.012 * s, wire, 0, torsoY, 0));
    const arm = quiet(addCyl(g, 0.0028 * s, 0.0028 * s, 0.055 * s, wire, 0, shoulderY - 0.006 * s, 0, 5));
    arm.rotation.z = Math.PI / 2;
    addCyl(g, 0.005 * s, 0.005 * s, 0.008 * s, joint, -0.028 * s, shoulderY - 0.006 * s, 0, 6);
    addCyl(g, 0.005 * s, 0.005 * s, 0.008 * s, joint, 0.028 * s, shoulderY - 0.006 * s, 0, 6);
  } else {
    addCyl(g, 0.009 * s, 0.007 * s, legH, cloth, -0.013 * s, 0.012 * s + legH / 2, 0, 8);
    addCyl(g, 0.009 * s, 0.007 * s, legH, cloth, 0.013 * s, 0.012 * s + legH / 2, 0, 8);
    addBox(g, 0.052 * s, torsoH + 0.01 * s, 0.03 * s, cloth, 0, torsoY, 0);
    const armL = addCyl(g, 0.007 * s, 0.005 * s, 0.046 * s, cloth, -0.028 * s, torsoY, 0.006 * s, 6);
    armL.rotation.z = 0.45;
    const armR = addCyl(g, 0.007 * s, 0.005 * s, 0.046 * s, cloth, 0.028 * s, torsoY, 0.01 * s, 6);
    armR.rotation.z = -0.55;
    armR.rotation.x = 0.2;
  }

  const head = new THREE.Mesh(new THREE.SphereGeometry(headR, 14, 12), opt.wire ? joint : skin);
  head.position.set(0, shoulderY + headR * 0.7, 0);
  head.castShadow = true;
  head.receiveShadow = true;
  g.add(head);

  if (!opt.wire) {
    const eyeY = head.position.y + headR * 0.08;
    const eyeZ = headR * 0.78;
    for (const ex of [-0.38, 0.38]) {
      const white = new THREE.Mesh(new THREE.SphereGeometry(headR * 0.3, 8, 6), M('#f6f3ec'));
      white.position.set(ex * headR, eyeY, eyeZ);
      g.add(quiet(white));
      const pupil = new THREE.Mesh(new THREE.SphereGeometry(headR * 0.14, 6, 5), M('#1c1a18'));
      pupil.position.set(ex * headR, eyeY, eyeZ + headR * 0.16);
      g.add(quiet(pupil));
    }
    addBox(g, 0.012 * s, 0.008 * s, 0.012 * s, M('#6b3a32'), 0, head.position.y - headR * 0.15, headR * 0.9);
  }
  return g;
}

function pitchedRoof(g, w, depth, rise, mat, x, y, z) {
  const slope = Math.atan2(rise, depth / 2);
  const len = Math.hypot(depth / 2, rise) + 0.008;
  const a = addBox(g, w, 0.012, len, mat, x, y + rise * 0.35, z - depth * 0.22);
  a.rotation.x = -slope;
  quiet(a);
  const b = addBox(g, w, 0.012, len, mat, x, y + rise * 0.35, z + depth * 0.22);
  b.rotation.x = slope;
  quiet(b);
}

function fresnel(s) {
  const g = new THREE.Group();
  const body = addCyl(g, 0.02 * s, 0.026 * s, 0.04 * s, M('#2e3238'), 0, 0, -0.03 * s, 10);
  body.rotation.x = -Math.PI / 2;
  const lens = addCyl(g, 0.018 * s, 0.018 * s, 0.01 * s, M('#fff1d4', { emissive: '#ffe2b0', emissiveIntensity: 0.9 }), 0, 0, -0.055 * s, 10);
  lens.rotation.x = -Math.PI / 2;
  quiet(lens);
  for (const side of [-1, 1]) {
    const door = addBox(g, 0.004 * s, 0.03 * s, 0.02 * s, M('#1e2126'), side * 0.02 * s, 0, -0.06 * s);
    door.rotation.y = side * 0.4;
    quiet(door);
  }
  return g;
}

function buildShell(layout) {
  const g = new THREE.Group();
  g.name = 'shell';
  const { width: W, depth: D, height: H } = layout.meta.room;
  const plaster = M(layout.shell.wallColor);
  const wainscot = M(layout.shell.wainscotColor);
  const trim = M(layout.shell.trimColor);
  const ceil = M(layout.shell.ceilingColor);
  const t = 0.1;

  const floorMat = toon('#ffffff');
  floorMat.map = woodTexture(W, D);
  floorMat.polygonOffset = true;
  floorMat.polygonOffsetFactor = 2;
  floorMat.polygonOffsetUnits = 2;
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(W, D), floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = 0;
  floor.receiveShadow = true;
  floor.userData.noCast = true;
  g.add(floor);

  addBox(g, t, H, D, plaster, -W / 2, H / 2, 0);
  const doorZ = -2.3;
  const doorW = 0.92;
  const doorH = 2.08;
  addBox(g, t, H, (D / 2 + doorZ - doorW / 2), plaster, W / 2, H / 2, (-D / 2 + (doorZ - doorW / 2)) / 2);
  const frontLen = D / 2 - (doorZ + doorW / 2);
  addBox(g, t, H, frontLen, plaster, W / 2, H / 2, (doorZ + doorW / 2 + D / 2) / 2);
  addBox(g, t, H - doorH, doorW + 0.12, plaster, W / 2, doorH + (H - doorH) / 2, doorZ);
  addBox(g, 0.04, doorH - 0.04, doorW - 0.08, M('#f3efe6'), W / 2 - 0.045, doorH / 2, doorZ);
  addBox(g, 0.012, 1.35, 0.07, M('#8d4044'), W / 2 - 0.06, 1.12, doorZ - 0.22);
  addBox(g, 0.012, 1.35, 0.07, M('#8d4044'), W / 2 - 0.06, 1.12, doorZ + 0.22);
  addCyl(g, 0.012, 0.012, 0.08, M('#d9d3c6'), W / 2 - 0.07, 1.02, doorZ + 0.28, 8).rotation.z = Math.PI / 2;

  const winX = -1.25;
  const winW = 1.7;
  const sill = 1.15;
  const winH = 1.22;
  const winTop = sill + winH;
  const backZ = -D / 2;
  const leftLen = winX - winW / 2 - (-W / 2);
  addBox(g, leftLen, H, t, plaster, -W / 2 + leftLen / 2, H / 2, backZ);
  const rightX0 = winX + winW / 2;
  const rightLen = W / 2 - rightX0;
  addBox(g, rightLen, H, t, plaster, rightX0 + rightLen / 2, H / 2, backZ);
  addBox(g, winW, sill, t, plaster, winX, sill / 2, backZ);
  addBox(g, winW, H - winTop, t, plaster, winX, winTop + (H - winTop) / 2, backZ);

  const frame = M('#2a3138');
  addBox(g, winW + 0.08, 0.05, 0.06, frame, winX, sill, backZ + 0.04);
  addBox(g, winW + 0.08, 0.05, 0.06, frame, winX, winTop, backZ + 0.04);
  addBox(g, 0.05, winH, 0.06, frame, winX - winW / 2, sill + winH / 2, backZ + 0.04);
  addBox(g, 0.05, winH, 0.06, frame, winX + winW / 2, sill + winH / 2, backZ + 0.04);
  for (let i = 1; i < 3; i++) {
    quiet(addBox(g, 0.02, winH - 0.06, 0.03, frame, winX - winW / 2 + (winW / 3) * i, sill + winH / 2, backZ + 0.05));
  }
  quiet(addBox(g, winW - 0.08, 0.02, 0.03, frame, winX, sill + winH * 0.55, backZ + 0.05));
  const glass = addBox(g, winW - 0.06, winH - 0.06, 0.01, M('#c5d2de', { transparent: true, opacity: 0.38 }), winX, sill + winH / 2, backZ + 0.03);
  quiet(glass);
  const roller = addCyl(g, 0.035, 0.035, winW - 0.1, M('#3a342e'), winX, winTop - 0.08, backZ + 0.1, 10);
  roller.rotation.z = Math.PI / 2;
  const shadeH = winH * 0.42;
  quiet(addBox(g, winW - 0.12, shadeH, 0.012, M('#2a2e33'), winX, winTop - 0.1 - shadeH / 2, backZ + 0.1));

  const ceiling = addBox(g, W, 0.06, D, ceil, 0, H - 0.03, 0);
  quiet(ceiling);
  for (let i = 0; i < 6; i++) {
    const z = -D / 2 + 0.7 + i * 1.15;
    quiet(addBox(g, W - 0.4, 0.16, 0.1, M('#5a4638'), 0, H - 0.2, z));
  }

  const base = 0.1;
  addBox(g, 0.03, base, D, trim, -W / 2 + 0.07, base / 2, 0);
  addBox(g, 0.03, base, D - 1.2, trim, W / 2 - 0.07, base / 2, 0.4);
  addBox(g, W, base, 0.03, trim, 0, base / 2, -D / 2 + 0.07);
  const railY = 1.05;
  addBox(g, 0.025, 0.04, D, M('#6d7a72'), -W / 2 + 0.08, railY, 0);
  addBox(g, W * 0.72, 0.04, 0.025, M('#6d7a72'), 1.1, railY, -D / 2 + 0.08);
  for (let i = 0; i < 8; i++) {
    const z = -3.2 + i * 0.85;
    addBox(g, 0.02, railY - 0.08, 0.035, M('#4d615a'), -W / 2 + 0.075, (railY - 0.08) / 2 + 0.04, z);
  }

  const mat = addBox(g, 0.9, 0.012, 0.6, M('#3e4440'), 0.62, 0.008, 0.82);
  quiet(mat);
  return g;
}

function buildTable(g, layout) {
  const t = layout.studio.table;
  const wood = M('#c4a574');
  const edge = M('#6b4a32');
  const stage = M('#6e675e');
  const walk = M('#c9bfb0');
  const top = t.top;
  const rim = 0.09;
  const stageY = top - 0.05;
  addBox(g, t.w, 0.045, rim, edge, t.x, top - 0.022, t.z + t.d / 2 - rim / 2);
  addBox(g, t.w, 0.045, rim, edge, t.x, top - 0.022, t.z - t.d / 2 + rim / 2);
  addBox(g, rim, 0.045, t.d - rim * 2, edge, t.x - t.w / 2 + rim / 2, top - 0.022, t.z);
  addBox(g, rim, 0.045, t.d - rim * 2, edge, t.x + t.w / 2 - rim / 2, top - 0.022, t.z);
  const innerW = t.w - rim * 2;
  const innerD = t.d - rim * 2;
  addBox(g, innerW, 0.02, innerD, stage, t.x, stageY - 0.01, t.z);
  addBox(g, innerW - 0.08, 0.012, 0.18, walk, t.x, stageY + 0.006, t.z - innerD / 2 + 0.14);
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const x = t.x + sx * (t.w / 2 - 0.16);
      const z = t.z + sz * (t.d / 2 - 0.14);
      addBox(g, 0.07, top - 0.16, 0.07, wood, x, (top - 0.16) / 2 + 0.06, z);
      addCyl(g, 0.04, 0.04, 0.05, M('#2c3034'), x, 0.03, z, 10);
    }
  }
  addBox(g, t.w - 0.36, 0.02, t.d - 0.32, M('#8d6a48'), t.x, 0.32, t.z);
  addBox(g, 0.28, 0.06, 0.22, M('#3a3834'), t.x - 0.4, 0.36, t.z);
  addBox(g, t.w - 0.2, 0.08, 0.04, wood, t.x, top - 0.08, t.z + t.d / 2 - 0.12);
  addBox(g, t.w - 0.2, 0.08, 0.04, wood, t.x, top - 0.08, t.z - t.d / 2 + 0.12);

  for (let i = 0; i < 8; i++) {
    quiet(addBox(g, 0.012, 0.004, 0.02, M('#2c2926'), t.x - 0.7 + i * 0.2, top + 0.004, t.z + t.d / 2 - 0.05));
  }
  const ruler = plane(g, 0.3, 0.02, rulerTex(), t.x + layout.studio.pencil.x - 0.28, top + 0.012, t.z + t.d / 2 - 0.05, 0);
  ruler.rotation.x = -Math.PI / 2;
  ruler.rotation.z = 0;

  const pencilLen = layout.studio.pencil.len;
  const px = t.x + layout.studio.pencil.x;
  const pz = t.z + t.d / 2 - 0.045;
  const pencil = addCyl(g, 0.004, 0.004, pencilLen, M('#e2b340'), px, top + 0.008, pz, 8);
  pencil.rotation.z = Math.PI / 2;
  quiet(addCyl(g, 0.0042, 0.0042, 0.012, M('#d27a8a'), px + pencilLen / 2 - 0.006, top + 0.008, pz, 8)).rotation.z = Math.PI / 2;
  quiet(addCyl(g, 0.0015, 0.004, 0.018, M('#d7c7a4'), px - pencilLen / 2 + 0.006, top + 0.008, pz, 6)).rotation.z = Math.PI / 2;

  contact(g, t.x, t.z, t.w * 0.46, t.d * 0.46);
  return { stageY, innerW, innerD };
}

function buildMiniature(g, layout, stageY) {
  const t = layout.studio.table;
  const tall = layout.studio.tallestBuilding;
  const houses = [
    { x: -0.62, w: 0.34, d: 0.18, h: 0.34, body: '#c48a4a', roof: '#3e4650', trim: '#f3efe6', awning: '#2f6a52', door: { w: 0.1, h: 0.21, color: '#6b3a32' }, windows: [{ x: -0.09, y: 0.285, w: 0.055, h: 0.045 }, { x: 0.09, y: 0.285, w: 0.055, h: 0.045 }] },
    { x: -0.2, w: 0.28, d: 0.2, h: tall, body: '#8d4a3a', roof: '#3a4048', trim: '#efe6d6', door: { w: 0.07, h: 0.21, color: '#3e342c' }, chimney: true, windows: [{ x: 0, y: 0.27, w: 0.05, h: 0.05 }, { x: 0, y: 0.34, w: 0.05, h: 0.05 }, { x: 0, y: 0.4, w: 0.045, h: 0.04 }] },
    { x: 0.22, w: 0.36, d: 0.18, h: 0.3, body: '#e4d3b0', roof: '#6e5a48', trim: '#fff8ee', awning: '#8d3342', door: { w: 0.09, h: 0.19, color: '#5c4034' }, windows: [{ x: 0.1, y: 0.245, w: 0.08, h: 0.045 }] },
  ];
  const z = t.z - t.d / 2 + 0.28;
  for (const house of houses) {
    const x = t.x + house.x;
    addBox(g, house.w, house.h, house.d, M(house.body), x, stageY + house.h / 2, z);
    pitchedRoof(g, house.w + 0.02, house.d + 0.02, Math.min(0.07, house.h * 0.16), M(house.roof), x, stageY + house.h, z);
    const face = z + house.d / 2 + 0.006;
    if (house.door) {
      addBox(g, house.door.w, house.door.h, 0.012, M(house.door.color), x - house.w * 0.18, stageY + house.door.h / 2, face);
    }
    for (const win of house.windows) {
      addBox(g, win.w + 0.012, win.h + 0.012, 0.012, M(house.trim), x + win.x, stageY + win.y, face);
      quiet(addBox(g, win.w, win.h, 0.008, M('#f6e2bc', { emissive: '#ffd9a2', emissiveIntensity: 0.75 }), x + win.x, stageY + win.y, face + 0.006));
    }
    if (house.awning) {
      const aw = addBox(g, house.w * 0.9, 0.01, 0.09, M(house.awning), x, stageY + (house.door ? house.door.h + 0.03 : house.h * 0.55), face + 0.03);
      aw.rotation.x = 0.4;
      quiet(aw);
    }
    if (house.chimney) {
      addBox(g, 0.04, 0.09, 0.04, M('#5c564e'), x + house.w * 0.28, stageY + house.h + 0.05, z - 0.04);
    }
    quiet(addBox(g, house.w * 0.7, 0.02, 0.012, M('#f4efe4'), x, stageY + house.h * 0.72, face + 0.01));
  }

  const pup = puppet({ h: layout.studio.puppet.h, coat: '#8d3342' });
  const pupX = t.x + layout.studio.puppet.x;
  const pupZ = t.z + 0.08;
  pup.position.set(pupX, stageY + 0.012, pupZ);
  g.add(pup);
  addCyl(g, 0.008, 0.01, 0.008, M('#c6a15a'), pupX, stageY + 0.008, pupZ, 8);
  layout.studio.puppet.world = [pupX, stageY + layout.studio.puppet.h * 0.72, pupZ];

  const lamp = new THREE.Group();
  addCyl(lamp, 0.006, 0.008, 0.14, M('#2e3238'), 0, 0.07, 0, 6);
  quiet(addBox(lamp, 0.03, 0.04, 0.03, M('#f6e2bc', { emissive: '#ffd7a0', emissiveIntensity: 0.8 }), 0, 0.15, 0));
  lamp.position.set(t.x - 0.48, stageY, t.z - 0.15);
  g.add(lamp);

  addBox(g, 0.05, 0.012, 0.035, M('#6b4e38'), t.x + 0.42, stageY + 0.02, t.z - 0.22);
  addBox(g, 0.05, 0.028, 0.008, M('#7a5a40'), t.x + 0.42, stageY + 0.028, t.z - 0.2);
  addBox(g, 0.045, 0.04, 0.04, M('#8a6238'), t.x + 0.55, stageY + 0.02, t.z - 0.35);

  const standH = 0.11;
  for (const spot of [
    { x: t.x - 0.92, z: t.z - 0.05, aim: [t.x + layout.studio.puppet.x, stageY + 0.12, t.z + layout.studio.puppet.z] },
    { x: t.x + 0.7, z: t.z + 0.05, aim: [t.x - 0.05, stageY + 0.16, t.z - 0.35] },
  ]) {
    addCyl(g, 0.012, 0.016, 0.012, M('#2a2e33'), spot.x, stageY + 0.008, spot.z, 8);
    addCyl(g, 0.004, 0.004, standH, M('#3a3e44'), spot.x, stageY + standH / 2, spot.z, 6);
    const head = fresnel(1);
    head.position.set(spot.x, stageY + standH, spot.z);
    head.lookAt(spot.aim[0], spot.aim[1], spot.aim[2]);
    g.add(head);
  }

  const flag = new THREE.Group();
  addCyl(flag, 0.003, 0.003, 0.1, M('#2a2e33'), 0, 0.05, 0, 5);
  quiet(addBox(flag, 0.08, 0.1, 0.006, M('#1e2126'), 0.03, 0.09, 0));
  flag.position.set(t.x - 0.95, stageY, t.z - 0.22);
  flag.rotation.y = -0.6;
  g.add(flag);
  const bounce = quiet(addBox(g, 0.07, 0.09, 0.006, M('#f4f0e6'), t.x + 0.82, stageY + 0.05, t.z - 0.28));
  bounce.rotation.z = 0.5;
  bounce.rotation.y = -0.4;

  const grip = new THREE.Group();
  addCyl(grip, 0.008, 0.01, 0.22, M('#2c3036'), 0, 0.11, 0, 8);
  quiet(addBox(grip, 0.14, 0.18, 0.008, M('#1a1d22'), 0.02, 0.24, 0));
  grip.position.set(t.x + t.w / 2 - 0.1, t.top, t.z + 0.22);
  g.add(grip);
}

function buildRig(g, layout) {
  const t = layout.studio.table;
  const rig = layout.studio.rig;
  const metal = M('#3a4048');
  const dark = M('#2a2e33');
  const brass = M('#b08a4e');
  addBox(g, 0.42, 0.035, 0.32, dark, rig.x, 0.02, rig.z);
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      addCyl(g, 0.02, 0.02, 0.02, M('#1c1e22'), rig.x + sx * 0.16, 0.01, rig.z + sz * 0.11, 8);
    }
  }
  const bag = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 8), M('#3f3832'));
  bag.scale.set(1.3, 0.55, 0.85);
  bag.position.set(rig.x + 0.12, 0.07, rig.z + 0.02);
  bag.castShadow = true;
  bag.receiveShadow = true;
  g.add(bag);
  addCyl(g, 0.028, 0.032, 1.05, metal, rig.x, 0.56, rig.z, 10);
  for (let i = 0; i < 8; i++) {
    quiet(addBox(g, 0.01, 0.012, 0.04, brass, rig.x + 0.03, 0.35 + i * 0.08, rig.z));
  }
  const head = rig.head;
  addRod(g, [rig.x, 1.08, rig.z], head, 0.016, metal, 8);
  addCyl(g, 0.04, 0.04, 0.03, dark, head[0], head[1], head[2], 10);
  const cam = new THREE.Group();
  addBox(cam, 0.07, 0.08, 0.12, M('#2c3138'), 0, 0, -0.02);
  addBox(cam, 0.08, 0.025, 0.05, M('#3a414a'), 0, 0.05, -0.01);
  const lens = addCyl(cam, 0.018, 0.022, 0.07, M('#1c2026'), 0, 0, -0.1, 10);
  lens.rotation.x = -Math.PI / 2;
  quiet(addCyl(cam, 0.012, 0.012, 0.008, M('#8ec8ff', { emissive: '#b7d9ff', emissiveIntensity: 0.4 }), 0, 0, -0.138, 10)).rotation.x = -Math.PI / 2;
  cam.position.set(head[0], head[1], head[2]);
  const aim = layout.studio.puppet.world || [t.x, t.top, t.z];
  cam.lookAt(aim[0], aim[1], aim[2]);
  g.add(cam);
  plane(g, 0.11, 0.028, labelTex('DF 0142'), head[0] + 0.1, head[1] + 0.06, head[2], 0.8);

  const desk = byId(layout, 'frame_desk');
  quiet(addRod(g, [rig.x, 0.04, rig.z], [desk.position[0] + 0.3, 0.03, desk.position[2] - 0.2], 0.008, M('#2a2c30'), 5));
  contact(g, rig.x, rig.z, 0.28, 0.22);
}

function buildArmatureRack(g, layout) {
  const rack = layout.studio.rack;
  const wood = M('#6b4e38');
  const shelf = M('#8a6848');
  addBox(g, 0.06, 1.65, 0.06, wood, rack.x - 0.58, 0.84, rack.z);
  addBox(g, 0.06, 1.65, 0.06, wood, rack.x + 0.58, 0.84, rack.z);
  addBox(g, 1.25, 0.04, 0.28, shelf, rack.x, 0.9, rack.z + 0.02);
  addBox(g, 1.25, 0.04, 0.28, shelf, rack.x, 0.42, rack.z + 0.02);
  const rod = addCyl(g, 0.012, 0.012, 1.16, M('#8d939a'), rack.x, 1.52, rack.z, 8);
  rod.rotation.z = Math.PI / 2;
  for (let i = 0; i < 4; i++) {
    const p = puppet({ h: 0.2, wire: true });
    p.position.set(rack.x - 0.4 + i * 0.26, 0.92, rack.z + 0.02);
    g.add(p);
  }
  for (let i = 0; i < 3; i++) {
    const p = puppet({ h: 0.16, wire: true });
    p.position.set(rack.x - 0.28 + i * 0.28, 1.52 - 0.16, rack.z + 0.04);
    g.add(p);
  }
  for (let i = 0; i < 4; i++) {
    addBox(g, 0.16, 0.1, 0.18, M(i % 2 ? '#7a5a40' : '#5c4636'), rack.x - 0.36 + i * 0.24, 0.49, rack.z + 0.02);
  }
  plane(g, 0.28, 0.06, labelTex('ARMATURES'), rack.x, 1.72, rack.z + 0.16, 0);
  contact(g, rack.x, rack.z, 0.7, 0.2);
}

function buildMonitorDressing(g, layout) {
  const mon = byId(layout, 'frame_monitor');
  const desk = byId(layout, 'frame_desk');
  const top = desk.position[1] + layout.assets.study_desk.targetHeight;
  const screen = plane(g, 0.46, 0.26, frameGrab(), mon.position[0] + 0.07, mon.position[1] + 0.22, mon.position[2], Math.PI / 2);
  screen.material.emissiveIntensity = 0.45;
  const keys = addBox(g, 0.12, 0.015, 0.28, M('#2c3138'), mon.position[0] + 0.16, top + 0.01, mon.position[2] - 0.02);
  quiet(keys);
  for (let i = 0; i < 5; i++) {
    quiet(addBox(g, 0.008, 0.006, 0.22, M('#3a414a'), keys.position.x, keys.position.y + 0.01, keys.position.z - 0.08 + i * 0.04));
  }
  const sheet = plane(g, 0.2, 0.26, dopeSheet(), desk.position[0] + 0.02, top + 0.012, desk.position[2] - 0.48, 0);
  sheet.rotation.x = -Math.PI / 2;
  quiet(addBox(g, 0.21, 0.008, 0.28, M('#6b5344'), sheet.position.x, top + 0.004, sheet.position.z));
  contact(g, desk.position[0], desk.position[2], 0.36, 0.7);
  const chair = byId(layout, 'frame_chair');
  contact(g, chair.position[0], chair.position[2], 0.28, 0.28);
}

function buildFabDressing(g, layout) {
  const table = byId(layout, 'fab_table');
  const top = table.position[1] + layout.assets.square_table.targetHeight;
  const x = table.position[0];
  const z = table.position[2];
  quiet(addBox(g, 0.46, 0.008, 0.32, M('#2f6a52'), x - 0.15, top + 0.004, z + 0.02));
  for (const [dx, dz, s] of [[0.15, -0.08, 0.034], [0.28, -0.02, 0.028], [0.2, 0.08, 0.03]]) {
    const head = new THREE.Mesh(new THREE.SphereGeometry(s, 12, 10), M('#e0b08e'));
    head.position.set(x + dx, top + s, z + dz);
    head.castShadow = true;
    head.receiveShadow = true;
    g.add(head);
    quiet(addCyl(g, 0.004, 0.004, 0.03, M('#a3a8ae'), x + dx, top + 0.01, z + dz, 5));
    const eye = new THREE.Mesh(new THREE.SphereGeometry(s * 0.16, 6, 5), M('#2c2926'));
    eye.position.set(x + dx + s * 0.3, top + s + s * 0.1, z + dz + s * 0.75);
    g.add(quiet(eye));
  }
  for (let i = 0; i < 4; i++) {
    const tool = addCyl(g, 0.003, 0.003, 0.12, M('#8d939a'), x - 0.42, top + 0.012, z - 0.18 + i * 0.06, 5);
    tool.rotation.z = Math.PI / 2;
    tool.rotation.y = 0.2 * i;
    quiet(tool);
  }
  addBox(g, 0.16, 0.05, 0.1, M('#efe6d4'), x + 0.45, top + 0.025, z + 0.12);
  addBox(g, 0.12, 0.008, 0.1, M('#8d3342'), x - 0.45, top + 0.01, z + 0.18);
  addBox(g, 0.1, 0.008, 0.08, M('#2f4d6e'), x - 0.42, top + 0.02, z + 0.2);
  const bin = addCyl(g, 0.14, 0.12, 0.32, M('#5c6368'), 4.35, 0.16, 0.95, 12);
  bin.castShadow = true;
  contact(g, x, z, 0.8, 0.45);
  contact(g, byId(layout, 'fab_chair').position[0], byId(layout, 'fab_chair').position[2], 0.28, 0.28);

  const board = addBox(g, 0.025, 0.95, 1.4, M('#6e5844'), 4.68, 1.55, z);
  addBox(g, 0.02, 0.04, 1.44, M('#3a342c'), 4.66, 2.0, z);
  addBox(g, 0.02, 0.04, 1.44, M('#3a342c'), 4.66, 1.1, z);
  for (let i = 0; i < 5; i++) {
    const hy = 1.88 - i * 0.15;
    const hz = z - 0.45 + (i % 2) * 0.35;
    const hook = addCyl(g, 0.01, 0.01, 0.06, M('#c6a15a'), 4.62, hy, hz, 6);
    hook.rotation.z = Math.PI / 2;
    const tool = addCyl(g, 0.008, 0.006, 0.16, M('#8d939a'), 4.52, hy - 0.06, hz, 6);
    tool.rotation.z = 0.8;
  }
  addBox(g, 0.04, 0.5, 0.35, M('#efe6d4'), 4.55, 0.3, z + 0.85);
  addBox(g, 0.03, 0.42, 0.28, M('#d7c4a4'), 4.58, 0.26, z + 1.05);
}

function buildReviewAndBoards(g, layout) {
  const shelf = byId(layout, 'supply_shelf');
  addBox(g, 0.78, 0.72, 0.028, M('#5c4636'), shelf.position[0], shelf.position[1] + 0.34, -3.955);
  addBox(g, 0.09, 0.05, 0.16, M('#4a3a2e'), shelf.position[0] - 0.26, shelf.position[1] - 0.01, -3.87);
  addBox(g, 0.09, 0.05, 0.16, M('#4a3a2e'), shelf.position[0] + 0.26, shelf.position[1] - 0.01, -3.87);
  const plinth = byId(layout, 'review_plinth');
  const h = layout.assets.museum_plinth.targetHeight;
  const pup = puppet({ h: 0.17, coat: '#2f4d6e', head: '#efc2a4' });
  pup.position.set(plinth.position[0], h, plinth.position[2]);
  pup.rotation.y = 0.4;
  g.add(pup);
  plane(g, 0.16, 0.04, labelTex('REVIEW'), plinth.position[0], h * 0.62, plinth.position[2] + 0.16, 0);
  contact(g, plinth.position[0], plinth.position[2], 0.22, 0.22);

  const easel = byId(layout, 'story_easel');
  plane(g, 0.42, 0.3, heroBoard(), easel.position[0] + 0.16, 1.05, easel.position[2], Math.PI / 2);

  for (let i = 0; i < 6; i++) {
    plane(g, 0.12, 0.09, cycleCard(i), -4.68, 1.62, 2.25 + i * 0.2, Math.PI / 2);
  }
  plane(g, 0.42, 0.05, labelTex('WALK CYCLE'), -4.68, 1.82, 2.75, Math.PI / 2);

  const book = byId(layout, 'parts_case');
  const colors = ['#8d3342', '#2f4d6e', '#c48a4a', '#3f534c', '#6b4e38', '#d7c4a4'];
  for (let row = 0; row < 3; row++) {
    for (let i = 0; i < 6; i++) {
      const bh = 0.16 + (i % 3) * 0.03;
      addBox(
        g,
        0.045,
        bh,
        0.12,
        M(colors[(i + row) % colors.length]),
        book.position[0] - 0.28 + i * 0.1,
        0.28 + row * 0.48,
        book.position[2] + 0.08
      );
    }
  }
  contact(g, book.position[0], book.position[2], 0.45, 0.24);
  const stool = byId(layout, 'animator_stool');
  contact(g, stool.position[0], stool.position[2], 0.24, 0.24);
  const bench = byId(layout, 'director_bench');
  contact(g, bench.position[0], bench.position[2], 0.28, 0.7);

  quiet(addBox(g, 0.08, 0.004, 0.35, M('#d9d3c6'), stool.position[0], 0.01, stool.position[2] + 0.15));
  quiet(addBox(g, 0.28, 0.004, 0.08, M('#d9d3c6'), stool.position[0], 0.012, stool.position[2] + 0.15));
}

function makeShell(layout) {
  return buildShell(layout);
}

function makeProcedural(layout) {
  const g = new THREE.Group();
  g.name = 'procedural';
  const { stageY } = buildTable(g, layout);
  buildMiniature(g, layout, stageY);
  buildRig(g, layout);
  buildArmatureRack(g, layout);
  buildMonitorDressing(g, layout);
  buildFabDressing(g, layout);
  buildReviewAndBoards(g, layout);
  window.__scale = {
    puppet: layout.studio.puppet.h,
    building: layout.studio.tallestBuilding,
    table: layout.studio.table.top,
    chair: layout.assets.dining_chair.targetHeight,
  };
  return g;
}

const RETINT = {
  display_bookcase: '#8b6244',
  museum_plinth: '#d5d0c6',
  book_stand: '#6e4e36',
};

function decorateAsset(kind, root) {
  root.traverse((o) => {
    if (!o.isMesh || !o.material) return;
    const mats = Array.isArray(o.material) ? o.material : [o.material];
    for (const m of mats) {
      if (!m || !m.color) continue;
      if (RETINT[kind]) m.color.set(RETINT[kind]);
      else if (Math.max(m.color.r, m.color.g, m.color.b) < 0.045) m.color.set('#3c3a38');
      const n = ((o.name || '') + ' ' + ((o.parent && o.parent.name) || '')).toLowerCase();
      if (n.includes('bulb') || n.includes('light_tube')) {
        m.emissive = new THREE.Color('#fff0d0');
        m.emissiveIntensity = 0.85;
      }
    }
  });
  if (kind === 'flowerpot') {
    const box = new THREE.Box3().setFromObject(root);
    const leaf = M('#3f6b45');
    const a = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.28, 7), leaf);
    a.position.y = box.max.y + 0.1;
    a.castShadow = true;
    a.receiveShadow = true;
    root.add(a);
    const b = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.18, 6), M('#4f7d52'));
    b.position.set(0.05, box.max.y + 0.2, 0.02);
    b.castShadow = true;
    b.receiveShadow = true;
    root.add(b);
  }
}

boot({
  makeShell,
  makeProcedural,
  decorateAsset,
  readyText: 'ready — stop-motion stage · drag orbit · T toon · U unlit',
});
