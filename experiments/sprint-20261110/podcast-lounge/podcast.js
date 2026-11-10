import * as THREE from 'three';
import { boot, toon, addBox, addCyl } from './scene_lib.js';
import { rotationFor } from './orient.js';

const SPINE = ['#6e3b32', '#2f4a44', '#3d3a6a', '#8a6232', '#5a3040', '#2c4660', '#7a4a2a', '#3e5338', '#6a4a58', '#8d4d3a', '#c4b49a', '#314e68'];

function plankMap() {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 512;
  const g = c.getContext('2d');
  g.fillStyle = '#ffffff';
  g.fillRect(0, 0, 256, 512);
  let x = 0;
  let i = 0;
  while (x < 256) {
    const w = 34 + (i % 3) * 8;
    g.fillStyle = i % 2 === 0 ? '#f3f3f3' : '#ffffff';
    g.fillRect(x, 0, w, 512);
    g.fillStyle = '#6e6e6e';
    g.fillRect(x, 0, 2, 512);
    x += w;
    i += 1;
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(4, 7);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function labelTexture(text, bg, fg) {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 192;
  const g = c.getContext('2d');
  g.fillStyle = bg;
  g.fillRect(0, 0, 512, 192);
  g.fillStyle = fg;
  g.font = '700 108px sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(text, 256, 100);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function waveTexture() {
  const c = document.createElement('canvas');
  c.width = 384;
  c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = '#14161c';
  g.fillRect(0, 0, 384, 128);
  g.strokeStyle = '#2a3140';
  g.lineWidth = 1;
  for (let y = 24; y < 128; y += 24) {
    g.beginPath();
    g.moveTo(0, y);
    g.lineTo(384, y);
    g.stroke();
  }
  g.strokeStyle = '#8ee0a8';
  g.lineWidth = 3;
  g.beginPath();
  for (let x = 0; x < 384; x++) {
    const y = 64 + Math.sin(x * 0.11) * 22 + Math.sin(x * 0.037) * 12;
    if (x === 0) g.moveTo(x, y);
    else g.lineTo(x, y);
  }
  g.stroke();
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function makeShell(layout) {
  const g = new THREE.Group();
  g.name = 'shell';
  const { width: W, depth: D, height: H } = layout.meta.room;
  const s = layout.shell;
  const wall = toon(s.wallColor);
  const felt = toon(s.feltColor);
  const wood = toon(s.woodColor);
  const ceilMat = toon(s.ceilingColor);

  const floor = new THREE.Mesh(
    new THREE.BoxGeometry(W, 0.08, D),
    toon('#ffffff', { map: plankMap() })
  );
  floor.material.color.set(s.floorColor);
  floor.position.y = -0.04;
  floor.receiveShadow = true;
  g.add(floor);

  const back = new THREE.Mesh(new THREE.BoxGeometry(W, H, 0.12), wall);
  back.position.set(0, H / 2, -D / 2);
  back.receiveShadow = true;
  back.castShadow = false;
  g.add(back);
  const left = new THREE.Mesh(new THREE.BoxGeometry(0.12, H, D), wall);
  left.position.set(-W / 2, H / 2, 0);
  left.receiveShadow = true;
  left.castShadow = false;
  g.add(left);

  addBox(g, W - 0.2, 0.92, 0.04, felt, 0, 0.46, -D / 2 + 0.08);
  addBox(g, 0.04, 0.92, D - 0.2, felt, -W / 2 + 0.08, 0.46, 0);
  addBox(g, W - 0.16, 0.1, 0.06, wood, 0, 0.05, -D / 2 + 0.1);
  addBox(g, 0.06, 0.1, D - 0.16, wood, -W / 2 + 0.1, 0.05, 0);

  const ceil = new THREE.Mesh(new THREE.BoxGeometry(W * 0.96, 0.08, D * 0.62), ceilMat);
  ceil.position.set(-0.05, H - 0.04, -D * 0.16);
  ceil.castShadow = false;
  g.add(ceil);
  addBox(g, W * 0.96, 0.1, 0.08, wood, -0.05, H - 0.12, D * 0.15);

  addRug(g, -2.3, -0.75, 3.55, 2.95, s.rugColor, s.rugEdge);
  addRug(g, 2.65, 0.72, 2.7, 2.55, s.controlRug, '#1c1e24');

  acousticWall(g, -W / 2 + 0.12);
  diffuser(g, -D / 2 + 0.16);
  bassTrap(g, -W / 2 + 0.42, -D / 2 + 0.42);
  cloud(g, -2.35, H, -0.95);
  door(g, -W / 2 + 0.1, 2.25);
  onAir(g, -W / 2 + 0.16, 1.72, 0.72);
  framedPrint(g, -W / 2 + 0.13, 2.05, -2.35);
  return g;
}

function addRug(g, x, z, w, d, fill, edge) {
  addBox(g, w + 0.14, 0.012, d + 0.14, toon(edge), x, 0.008, z);
  const rug = addBox(g, w, 0.016, d, toon(fill), x, 0.016, z);
  rug.castShadow = false;
}

function foamTile(g, w, h, x, y, z, color) {
  addBox(g, 0.06, h, w, toon(color), x, y, z);
  const rib = toon('#5a4038');
  for (let i = 0; i < 4; i++) {
    const yy = y - h * 0.3 + i * (h * 0.2);
    addBox(g, 0.014, 0.016, w * 0.78, rib, x + 0.034, yy, z);
  }
}

function acousticWall(g, x) {
  const tiles = [
    [0.56, 0.4, 1.4, -1.58, '#c4a394'],
    [0.48, 0.46, 1.36, -0.98, '#8d6b60'],
    [0.6, 0.38, 1.46, -0.38, '#b08978'],
    [0.44, 0.42, 1.92, -1.42, '#a07b6c'],
    [0.52, 0.36, 1.96, -0.82, '#d0b2a2'],
    [0.4, 0.44, 1.9, -0.22, '#7d5e56'],
  ];
  for (const [w, h, y, z, color] of tiles) foamTile(g, w, h, x, y, z, color);
}

function diffuser(g, z) {
  const wood = toon('#6a4a34');
  const dark = toon('#4a3426');
  const depths = [0.045, 0.1, 0.14, 0.06, 0.12, 0.05, 0.13, 0.08, 0.045, 0.11, 0.07, 0.125, 0.05];
  const x0 = -2.55;
  depths.forEach((d, i) => {
    addBox(g, 0.04, 1.28, d, i % 2 ? wood : dark, x0 + i * 0.072, 1.58, z + d / 2);
  });
  const span = depths.length * 0.072;
  addBox(g, span + 0.06, 0.06, 0.08, wood, x0 + span / 2 - 0.04, 2.26, z + 0.04);
  addBox(g, span + 0.06, 0.06, 0.08, wood, x0 + span / 2 - 0.04, 0.9, z + 0.04);
}

function bassTrap(g, x, z) {
  addBox(g, 0.36, 1.28, 0.36, toon('#6d564c'), x, 0.66, z);
  addBox(g, 0.18, 1.28, 0.18, toon('#4e3c36'), x + 0.12, 0.66, z + 0.12);
  addBox(g, 0.4, 0.04, 0.4, toon('#5c4030'), x, 1.32, z);
}

function cloud(g, x, H, z) {
  const cloth = toon('#3a3844');
  const wood = toon('#5c4030');
  addBox(g, 2.45, 0.045, 1.65, cloth, x, H - 0.42, z);
  addBox(g, 2.55, 0.05, 0.05, wood, x, H - 0.42, z - 0.82);
  addBox(g, 2.55, 0.05, 0.05, wood, x, H - 0.42, z + 0.82);
  addBox(g, 0.05, 0.05, 1.65, wood, x - 1.25, H - 0.42, z);
  addBox(g, 0.05, 0.05, 1.65, wood, x + 1.25, H - 0.42, z);
  for (const [dx, dz] of [[-1.1, -0.7], [1.1, -0.7], [-1.1, 0.7], [1.1, 0.7]]) {
    addCyl(g, 0.008, 0.008, 0.36, wood, x + dx, H - 0.2, z + dz, 6);
  }
}

function door(g, x, hingeZ) {
  const wood = toon('#5a3d2a');
  const panel = toon('#6e4c34');
  const glass = toon('#c5ddd4', { transparent: true, opacity: 0.45 });
  addBox(g, 0.07, 2.18, 0.08, wood, x, 1.09, hingeZ - 0.04);
  addBox(g, 0.07, 2.18, 0.08, wood, x, 1.09, hingeZ + 0.9);
  addBox(g, 0.07, 0.08, 0.98, wood, x, 2.16, hingeZ + 0.43);

  const slab = new THREE.Group();
  addBox(slab, 0.8, 2.02, 0.045, wood, 0.4, 1.02, 0);
  addBox(slab, 0.62, 0.72, 0.012, panel, 0.4, 0.55, 0.026);
  addBox(slab, 0.62, 0.62, 0.012, panel, 0.4, 1.45, 0.026);
  addBox(slab, 0.26, 0.22, 0.01, glass, 0.4, 1.62, 0.03);
  addCyl(slab, 0.012, 0.012, 0.08, toon('#c8c2b8'), 0.68, 1.02, 0.04, 8);
  slab.position.set(x + 0.04, 0, hingeZ);
  slab.rotation.y = -0.42;
  g.add(slab);
}

function onAir(g, x, y, z) {
  addBox(g, 0.04, 0.28, 0.64, toon('#3a241c'), x, y, z);
  const face = new THREE.Mesh(
    new THREE.PlaneGeometry(0.52, 0.18),
    new THREE.MeshBasicMaterial({ map: labelTexture('ON AIR', '#9d1c22', '#ffe7d0'), toneMapped: false })
  );
  face.position.set(x + 0.03, y, z);
  face.rotation.y = Math.PI / 2;
  face.userData.skipShade = true;
  g.add(face);
}

function framedPrint(g, x, y, z) {
  const wood = toon('#5c4030');
  addBox(g, 0.03, 0.62, 0.48, wood, x, y, z);
  addBox(g, 0.012, 0.5, 0.36, toon('#8d4a3a'), x + 0.02, y, z);
  addBox(g, 0.014, 0.16, 0.36, toon('#e4d0b0'), x + 0.026, y + 0.12, z);
  addBox(g, 0.014, 0.1, 0.14, toon('#2f3d4a'), x + 0.03, y - 0.12, z - 0.06);
}

function armBetween(g, a, b, r, mat) {
  const dir = new THREE.Vector3().subVectors(b, a);
  const len = dir.length();
  if (len < 1e-4) return;
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, 8), mat);
  mesh.position.copy(a).add(b).multiplyScalar(0.5);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
  mesh.castShadow = true;
  g.add(mesh);
}

function boomMic(g, mic) {
  const metal = toon('#c5c8cc');
  const black = toon('#17181d');
  const band = toon(mic.band || '#e0b15a');
  const bx = mic.base[0];
  const by = mic.base[1] || 0;
  const bz = mic.base[2];
  const cap = new THREE.Vector3(mic.capsule[0], mic.capsule[1], mic.capsule[2]);
  const mouth = new THREE.Vector3(mic.mouth[0], mic.mouth[1], mic.mouth[2]);
  const aim = mouth.clone().sub(cap).normalize();

  if (by < 0.2) {
    addCyl(g, 0.13, 0.155, 0.03, black, bx, 0.016, bz, 18);
    addCyl(g, 0.016, 0.022, 0.64, metal, bx, 0.34, bz, 10);
    const standTop = new THREE.Vector3(bx, 0.68, bz);
    const elbow = standTop.clone().lerp(cap, 0.45);
    elbow.y = Math.max(elbow.y, cap.y + 0.06);
    armBetween(g, standTop, elbow, 0.013, metal);
    armBetween(g, elbow, cap, 0.01, metal);
    addCyl(g, 0.02, 0.02, 0.02, metal, elbow.x, elbow.y, elbow.z, 8);
  } else {
    addCyl(g, 0.03, 0.036, 0.018, black, bx, by + 0.012, bz, 12);
    const p0 = new THREE.Vector3(bx, by + 0.04, bz);
    armBetween(g, p0, cap, 0.008, metal);
    const grille = new THREE.Mesh(new THREE.SphereGeometry(0.022, 12, 10), toon('#2c3038'));
    grille.position.copy(cap);
    grille.castShadow = true;
    g.add(grille);
    const tag = new THREE.Mesh(new THREE.SphereGeometry(0.01, 8, 6), band);
    tag.position.copy(cap.clone().addScaledVector(aim, -0.03));
    g.add(tag);
    return;
  }

  const body = new THREE.Group();
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.018, 0.14, 12), black);
  stem.castShadow = true;
  body.add(stem);
  const grille = new THREE.Mesh(new THREE.SphereGeometry(0.026, 14, 10), toon('#2c3038'));
  grille.position.y = 0.086;
  grille.castShadow = true;
  body.add(grille);
  const ring = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.018, 12), band);
  ring.position.y = 0.02;
  body.add(ring);
  body.position.copy(cap);
  body.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), aim);
  g.add(body);

  const pop = new THREE.Mesh(new THREE.TorusGeometry(0.048, 0.0045, 8, 18), toon('#e6e0d6'));
  pop.position.copy(cap.clone().addScaledVector(aim, 0.1));
  pop.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), aim);
  pop.castShadow = true;
  g.add(pop);

  const yoke = new THREE.Mesh(new THREE.TorusGeometry(0.036, 0.004, 6, 16), metal);
  yoke.position.copy(cap.clone().addScaledVector(aim, -0.02));
  yoke.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), aim);
  g.add(yoke);
}

function mixingConsole(g, spec) {
  const [x, , z] = spec.position;
  const rot = rotationFor('posZ', spec.position, spec.lookToward);
  const grp = new THREE.Group();
  const wood = toon('#5c3e2c');
  const chassis = toon('#23222a');
  const metal = toon('#3c3e48');
  const W = 1.62;
  const D = 0.7;
  const H = 0.9;
  addBox(grp, W - 0.06, 0.08, D - 0.06, wood, 0, 0.04, 0);
  addBox(grp, 0.07, H - 0.08, D, wood, -W / 2 + 0.035, H / 2, 0);
  addBox(grp, 0.07, H - 0.08, D, wood, W / 2 - 0.035, H / 2, 0);
  addBox(grp, W - 0.14, 0.62, D - 0.1, chassis, 0, 0.46, 0);
  addBox(grp, W - 0.12, 0.045, D - 0.02, metal, 0, H - 0.02, 0.01);
  addBox(grp, W - 0.18, 0.2, 0.14, chassis, 0, H + 0.08, -D / 2 + 0.12);
  addBox(grp, W - 0.16, 0.035, 0.1, wood, 0, H - 0.06, D / 2 - 0.04);

  const leds = ['#8ee0a8', '#8ee0a8', '#e6c36a', '#e07a55'];
  for (let i = 0; i < 8; i++) {
    const mx = -0.56 + i * 0.16;
    addBox(grp, 0.07, 0.14, 0.016, toon('#101218'), mx, H + 0.1, -D / 2 + 0.19);
    for (let s = 0; s < 4; s++) {
      const col = leds[s];
      addBox(
        grp, 0.046, 0.016, 0.01,
        toon(col, { emissive: col, emissiveIntensity: 0.75 }),
        mx, H + 0.055 + s * 0.028, -D / 2 + 0.2
      );
    }
  }

  const caps = ['#e8d7c0', '#e8d7c0', '#d45448', '#e8d7c0', '#e6c36a', '#e8d7c0', '#e8d7c0', '#d45448', '#e8d7c0', '#e8d7c0'];
  const travel = [0.02, 0.06, 0.1, 0.03, 0.08, 0.01, 0.05, 0.11, 0.04, 0.07];
  for (let i = 0; i < 10; i++) {
    const fx = -0.63 + i * 0.14;
    addBox(grp, 0.01, 0.008, 0.16, toon('#0e0e12'), fx, H + 0.012, 0.02);
    addBox(grp, 0.046, 0.026, 0.03, toon(caps[i]), fx, H + 0.03, -0.05 + travel[i]);
  }
  for (let i = 0; i < 8; i++) {
    addCyl(grp, 0.02, 0.022, 0.02, toon(i === 3 ? '#d45448' : '#ddd6cc'), -0.49 + i * 0.14, H + 0.02, 0.22, 10);
    addBox(grp, 0.004, 0.01, 0.012, toon('#2a2a2a'), -0.49 + i * 0.14, H + 0.032, 0.22);
  }

  const screen = new THREE.Mesh(
    new THREE.PlaneGeometry(0.42, 0.14),
    new THREE.MeshBasicMaterial({ map: waveTexture(), toneMapped: false })
  );
  screen.position.set(0.42, H + 0.1, -D / 2 + 0.2);
  screen.userData.skipShade = true;
  grp.add(screen);

  const tally = new THREE.Mesh(
    new THREE.PlaneGeometry(0.16, 0.06),
    new THREE.MeshBasicMaterial({ map: labelTexture('LIVE', '#9d1c22', '#ffe7d0'), toneMapped: false })
  );
  tally.position.set(-0.62, H + 0.12, -D / 2 + 0.2);
  tally.userData.skipShade = true;
  grp.add(tally);

  grp.position.set(x, 0, z);
  grp.rotation.y = rot;
  g.add(grp);
}

function headphones(parent, x, y, z) {
  const g = new THREE.Group();
  const band = toon('#1c1e24');
  const cup = toon('#3a3e48');
  const pad = toon('#6a4038');
  addBox(g, 0.18, 0.018, 0.02, band, 0, 0.1, 0);
  addBox(g, 0.018, 0.08, 0.02, band, -0.08, 0.06, 0);
  addBox(g, 0.018, 0.08, 0.02, band, 0.08, 0.06, 0);
  addBox(g, 0.05, 0.07, 0.028, cup, -0.08, 0.03, 0);
  addBox(g, 0.05, 0.07, 0.028, cup, 0.08, 0.03, 0);
  addBox(g, 0.034, 0.05, 0.01, pad, -0.08, 0.03, 0.016);
  addBox(g, 0.034, 0.05, 0.01, pad, 0.08, 0.03, 0.016);
  g.position.set(x, y, z);
  g.rotation.y = -0.4;
  parent.add(g);
}

function credenza(g, spec) {
  const [x, , z] = spec.position;
  const [w, h, d] = spec.size;
  const wood = toon('#5a3c2a');
  const door = toon('#6b4a34');
  const dark = toon('#2a211c');
  addBox(g, w, h - 0.08, d, wood, x, (h - 0.08) / 2 + 0.06, z);
  addBox(g, w + 0.04, 0.035, d + 0.04, toon('#6d4c34'), x, h - 0.01, z);
  addBox(g, w - 0.08, 0.05, d - 0.04, dark, x, 0.03, z);
  const doorW = (w - 0.7) / 2;
  addBox(g, doorW, h - 0.22, 0.02, door, x + 0.05, h / 2 + 0.02, z + d / 2);
  addBox(g, doorW, h - 0.22, 0.02, door, x + 0.05 + doorW + 0.04, h / 2 + 0.02, z + d / 2);
  addBox(g, 0.01, h - 0.28, 0.012, dark, x + 0.05, h / 2, z + d / 2 + 0.012);
  addCyl(g, 0.012, 0.012, 0.012, toon('#d9d0c4'), x - 0.15, h / 2, z + d / 2 + 0.02, 8);
  addCyl(g, 0.012, 0.012, 0.012, toon('#d9d0c4'), x + 0.55, h / 2, z + d / 2 + 0.02, 8);

  const bayX = x - w / 2 + 0.28;
  for (let i = 0; i < 9; i++) {
    const col = SPINE[i % SPINE.length];
    const lean = i === 7 ? 0.22 : 0;
    const rec = addBox(g, 0.018, 0.3, 0.3, toon(col), bayX + i * 0.03, 0.24, z);
    rec.rotation.z = lean;
    addCyl(g, 0.04, 0.04, 0.012, toon('#e6dcc8'), bayX + i * 0.03, 0.24, z + 0.02, 12);
  }
  for (let i = 0; i < 6; i++) {
    addBox(g, 0.28, 0.035 + (i % 3) * 0.008, 0.22, toon(SPINE[(i + 3) % SPINE.length]), x + 0.72, 0.16 + i * 0.045, z + 0.02);
  }
}

function sideTable(g, spec) {
  const [x, , z] = spec.position;
  const wood = toon('#6a4630');
  const top = toon('#7a5340');
  addCyl(g, 0.2, 0.2, 0.035, top, x, 0.56, z, 20);
  addCyl(g, 0.035, 0.045, 0.5, wood, x, 0.28, z, 10);
  addCyl(g, 0.14, 0.15, 0.03, wood, x, 0.03, z, 16);
}

function bookRow(g, x0, y, z, count, along = 'x') {
  for (let i = 0; i < count; i++) {
    const bw = 0.034 + (i % 4) * 0.008;
    const bh = 0.2 + (i % 5) * 0.03;
    const lean = i % 7 === 0 ? 0.12 : 0;
    const px = along === 'x' ? x0 + i * 0.05 : x0;
    const pz = along === 'z' ? z + i * 0.05 : z;
    const m = addBox(g, along === 'x' ? bw : 0.16, bh, along === 'x' ? 0.16 : bw, toon(SPINE[i % SPINE.length]), px, y + bh / 2, pz);
    if (lean) m.rotation.z = lean;
  }
}

function booksInCase(g, inst) {
  const grp = new THREE.Group();
  const levels = [0.09, 0.55, 1.04, 1.52];
  for (const y0 of levels) {
    let cursor = -0.32;
    let i = 0;
    while (cursor < 0.3) {
      const bw = 0.032 + (i % 4) * 0.01;
      const bh = 0.2 + (i % 5) * 0.028;
      if (y0 + bh > 1.9) break;
      const m = new THREE.Mesh(new THREE.BoxGeometry(bw, bh, 0.16), toon(SPINE[(i + levels.indexOf(y0)) % SPINE.length]));
      m.position.set(cursor + bw / 2, y0 + bh / 2, -0.05);
      m.castShadow = true;
      m.receiveShadow = true;
      grp.add(m);
      cursor += bw + 0.008;
      i += 1;
    }
  }
  grp.position.set(inst.position[0], 0, inst.position[2]);
  grp.rotation.y = inst.rotationY || 0;
  g.add(grp);
}

function pillows(g, sofa) {
  const rot = sofa.rotationY || 0;
  const c = Math.cos(rot);
  const s = Math.sin(rot);
  const colors = ['#6e3344', '#243044'];
  [[0.58, 0.42, 0.16], [-0.58, 0.42, 0.12]].forEach((p, i) => {
    const x = sofa.position[0] + p[0] * c + p[2] * s;
    const z = sofa.position[2] - p[0] * s + p[2] * c;
    const m = addBox(g, 0.32, 0.2, 0.12, toon(colors[i]), x, p[1], z);
    m.rotation.y = rot + (i === 0 ? 0.15 : -0.1);
  });
}

function tableProps(g) {
  addBox(g, 0.26, 0.015, 0.2, toon('#f0e6d4'), -2.15, 0.37, -0.95);
  addBox(g, 0.22, 0.012, 0.16, toon('#f7f1e6'), -2.15, 0.384, -0.95);
  addBox(g, 0.012, 0.012, 0.14, toon('#2a2420'), -2.02, 0.39, -0.9);
}

function speakerStands(g, layout) {
  const wood = toon('#5c4030');
  const cone = toon('#16181c');
  const cap = toon('#d9d3c8');
  for (const id of ['spk_l', 'spk_r']) {
    const inst = layout.instances.find((i) => i.id === id);
    const rot = inst.rotationY || 0;
    const x = inst.position[0];
    const y = inst.position[1];
    const z = inst.position[2];
    addBox(g, 0.16, y - 0.02, 0.14, wood, x, (y - 0.02) / 2, z);
    addBox(g, 0.28, 0.03, 0.22, wood, x, y - 0.01, z);
    const face = new THREE.Group();
    addBox(face, 0.12, 0.12, 0.016, cone, 0, 0.18, 0.18);
    addBox(face, 0.045, 0.045, 0.012, cap, 0, 0.18, 0.192);
    face.position.set(x, y, z);
    face.rotation.y = rot;
    g.add(face);
  }
}

function foliage(g, x, z) {
  const leaf = toon('#3d6a42');
  const dark = toon('#2c5234');
  addCyl(g, 0.02, 0.028, 0.22, toon('#4a5a32'), x, 0.4, z, 6);
  addBox(g, 0.28, 0.22, 0.24, leaf, x, 0.58, z);
  addBox(g, 0.18, 0.16, 0.16, dark, x + 0.08, 0.7, z - 0.04);
  addBox(g, 0.14, 0.12, 0.14, leaf, x - 0.08, 0.66, z + 0.06);
}

function pendantDrop(g, x, z) {
  addCyl(g, 0.007, 0.007, 0.42, toon('#2a241c'), x, 2.62, z, 6);
}

function makeProcedural(layout) {
  const g = new THREE.Group();
  g.name = 'procedural';
  mixingConsole(g, layout.built.console);
  speakerStands(g, layout);
  credenza(g, layout.built.credenza);
  sideTable(g, layout.built.sideTable);
  for (const mic of layout.mics) boomMic(g, mic);
  const bookcase = layout.instances.find((i) => i.id === 'case');
  booksInCase(g, bookcase);
  bookRow(g, 1.38, 1.52, -3.02, 8);
  bookRow(g, 1.4, 2.05, -3.02, 7);
  bookRow(g, 2.32, 1.52, -3.02, 8);
  bookRow(g, 2.34, 2.05, -3.02, 6);
  pillows(g, layout.instances.find((i) => i.id === 'hosts'));
  tableProps(g);
  foliage(g, -3.72, 1.62);
  headphones(g, 3.42, 0.78, 0.28);
  pendantDrop(g, -2.1, -0.95);
  addBox(g, 0.18, 0.012, 0.12, toon('#d7c4a4'), -3.22, 0.585, 0.55);
  return g;
}

boot({
  makeShell,
  makeProcedural,
  transformLayout(layout) {
    for (const inst of layout.instances) {
      if (inst.lookAt && inst.modelForward) {
        inst.rotationY = rotationFor(inst.modelForward, inst.position, inst.lookAt);
      }
    }
  },
  preparePrototype(kind, root) {
    if (kind === 'display_bookcase') {
      root.traverse((o) => {
        if (!o.isMesh) return;
        const mats = Array.isArray(o.material) ? o.material : [o.material];
        for (const m of mats) if (m?.color) m.color.set('#6b4a32');
      });
    }
    if (kind !== 'pendant_lamp' && kind !== 'library_lamp') return;
    root.traverse((o) => {
      if (!o.isMesh) return;
      const n = (o.name || '').toLowerCase();
      if (n.includes('bulb') || n.includes('light_tube') || n.includes('tube')) {
        const mats = Array.isArray(o.material) ? o.material : [o.material];
        for (const m of mats) {
          if (!m) continue;
          m.color?.set('#ffe6c2');
          m.userData.glow = { color: '#ffd7a4', intensity: 1 };
        }
      }
    });
  },
  onReady({ props, layout }) {
    const c = document.createElement('canvas');
    c.width = 128;
    c.height = 128;
    const ctx = c.getContext('2d');
    const grd = ctx.createRadialGradient(64, 64, 8, 64, 64, 64);
    grd.addColorStop(0, 'rgba(0,0,0,0.48)');
    grd.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, 128, 128);
    const tex = new THREE.CanvasTexture(c);
    const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false });
    const size = {
      sofa: 2.15,
      dining_chair: 0.72,
      coffee_table: 1.55,
      study_desk: 1.35,
      speaker: 0.85,
      display_bookcase: 1.05,
      flowerpot: 0.48,
    };
    for (const inst of layout.instances) {
      const s = size[inst.kind];
      if (!s) continue;
      const disc = new THREE.Mesh(new THREE.PlaneGeometry(s, s * 0.72), mat);
      disc.rotation.x = -Math.PI / 2;
      disc.position.set(inst.position[0], 0.022, inst.position[2]);
      disc.userData.skipShade = true;
      disc.renderOrder = 2;
      props.add(disc);
    }
    for (const [pos, s] of [
      [layout.built.console.position, 1.9],
      [layout.built.credenza.position, 2.3],
      [layout.built.sideTable.position, 0.55],
    ]) {
      const disc = new THREE.Mesh(new THREE.PlaneGeometry(s, s * 0.62), mat);
      disc.rotation.x = -Math.PI / 2;
      disc.position.set(pos[0], 0.022, pos[2]);
      disc.userData.skipShade = true;
      disc.renderOrder = 2;
      props.add(disc);
    }
  },
  readyText: 'ready — podcast lounge · drag orbit · U unlit · T toon',
});
