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

  addRug(g, -2.05, -0.85, 3.9, 2.7, s.rugColor, s.rugEdge);
  addRug(g, 2.35, 0.85, 2.5, 2.3, s.controlRug, '#1c1e24');

  acousticWall(g, -W / 2 + 0.12);
  backFoam(g, -D / 2 + 0.14);
  diffuser(g, -D / 2 + 0.18);
  bassTrap(g, -W / 2 + 0.42, -D / 2 + 0.42);
  cloud(g, -2.05, H, -0.85, 3.2, 2.2);
  cloud(g, 1.9, H, 0.28, 1.9, 1.35);
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

function foamTile(g, w, h, x, y, z, color, axis) {
  const rib = toon('#5c433c');
  if (axis === 'z') {
    addBox(g, w, h, 0.06, toon(color), x, y, z);
    for (let i = 0; i < 4; i++) {
      const yy = y - h * 0.3 + i * (h * 0.2);
      addBox(g, w * 0.78, 0.015, 0.014, rib, x, yy, z + 0.034);
    }
    return;
  }
  addBox(g, 0.06, h, w, toon(color), x, y, z);
  for (let i = 0; i < 4; i++) {
    const yy = y - h * 0.3 + i * (h * 0.2);
    addBox(g, 0.014, 0.015, w * 0.78, rib, x + 0.034, yy, z);
  }
}

function acousticWall(g, x) {
  const tiles = [
    [0.62, 0.48, 1.25, -2.15, '#c4a394'],
    [0.5, 0.55, 1.22, -1.5, '#8d6b60'],
    [0.58, 0.42, 1.32, -0.9, '#b08978'],
    [0.46, 0.5, 1.2, -0.28, '#a07b6c'],
    [0.52, 0.4, 1.18, 0.35, '#7d5e56'],
    [0.48, 0.44, 1.85, -2.05, '#d0b2a2'],
    [0.55, 0.4, 1.9, -1.4, '#c4a394'],
    [0.42, 0.46, 1.88, -0.82, '#8d6b60'],
    [0.5, 0.38, 1.92, -0.22, '#b08978'],
    [0.4, 0.42, 1.86, 0.42, '#a07b6c'],
  ];
  for (const [w, h, y, z, color] of tiles) foamTile(g, w, h, x, y, z, color, 'x');
}

function backFoam(g, z) {
  const tiles = [
    [0.55, 0.42, -3.55, 1.25, '#b08978'],
    [0.48, 0.5, -2.95, 1.22, '#c4a394'],
    [0.52, 0.4, -1.15, 1.28, '#8d6b60'],
    [0.46, 0.48, -0.55, 1.2, '#a07b6c'],
    [0.5, 0.38, -3.4, 1.85, '#d0b2a2'],
    [0.42, 0.44, -2.85, 1.9, '#7d5e56'],
    [0.55, 0.4, -1.05, 1.88, '#c4a394'],
    [0.4, 0.42, -0.48, 1.86, '#b08978'],
    [0.48, 0.5, 3.55, 1.35, '#8d6b60'],
    [0.42, 0.44, 3.95, 1.85, '#c4a394'],
  ];
  for (const [w, h, x, y, color] of tiles) foamTile(g, w, h, x, y, z, color, 'z');
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

function cloud(g, x, H, z, w, d) {
  const cloth = toon('#3a3844');
  const wood = toon('#5c4030');
  addBox(g, w, 0.05, d, cloth, x, H - 0.38, z);
  addBox(g, w + 0.08, 0.045, 0.05, wood, x, H - 0.38, z - d / 2);
  addBox(g, w + 0.08, 0.045, 0.05, wood, x, H - 0.38, z + d / 2);
  addBox(g, 0.05, 0.045, d, wood, x - w / 2, H - 0.38, z);
  addBox(g, 0.05, 0.045, d, wood, x + w / 2, H - 0.38, z);
  const inset = 0.82;
  for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    addCyl(g, 0.008, 0.008, 0.32, wood, x + dx * w * 0.38, H - 0.18, z + dz * d * inset * 0.42, 6);
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
  const metal = toon('#b7bcc4');
  const dark = toon('#3a3e46');
  const meshTone = toon('#d2d7de', { emissive: '#c5ccd4', emissiveIntensity: 0.45 });
  const bandMat = toon('#3e444c');
  const bx = mic.base[0];
  const by = mic.base[1];
  const bz = mic.base[2];
  const cap = new THREE.Vector3(mic.capsule[0], mic.capsule[1], mic.capsule[2]);
  const mouth = new THREE.Vector3(mic.mouth[0], mic.mouth[1], mic.mouth[2]);
  const aim = mouth.clone().sub(cap).normalize();
  const clamp = new THREE.Vector3(bx, by, bz);

  addBox(g, 0.07, 0.018, 0.09, metal, bx, by + 0.01, bz);
  addBox(g, 0.02, 0.045, 0.02, metal, bx, by - 0.012, bz);
  const knuckle = clamp.clone();
  knuckle.y += 0.1;
  armBetween(g, new THREE.Vector3(bx, by + 0.02, bz), knuckle, 0.012, metal);
  const tail = cap.clone().addScaledVector(aim, -0.08);
  const elbow = knuckle.clone().lerp(tail, 0.5);
  elbow.y += 0.12;
  armBetween(g, knuckle, elbow, 0.011, metal);
  armBetween(g, elbow, tail, 0.009, metal);
  addCyl(g, 0.016, 0.016, 0.02, metal, elbow.x, elbow.y, elbow.z, 10);

  const body = new THREE.Group();
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, 0.11, 18), dark);
  barrel.castShadow = true;
  body.add(barrel);
  const head = new THREE.Mesh(new THREE.CylinderGeometry(0.029, 0.028, 0.04, 18), meshTone);
  head.position.y = 0.075;
  head.castShadow = true;
  body.add(head);
  for (let i = 0; i < 3; i++) {
    const stripe = new THREE.Mesh(new THREE.CylinderGeometry(0.0305, 0.0305, 0.005, 18), bandMat);
    stripe.position.y = 0.064 + i * 0.012;
    body.add(stripe);
  }
  body.position.copy(cap);
  body.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), aim);
  g.add(body);

  const popPos = cap.clone().addScaledVector(aim, 0.13);
  const pop = new THREE.Mesh(new THREE.CylinderGeometry(0.058, 0.058, 0.008, 22), toon('#e4ddd2'));
  pop.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), aim);
  pop.position.copy(popPos);
  pop.castShadow = true;
  g.add(pop);
  armBetween(g, cap.clone().addScaledVector(aim, 0.09), popPos, 0.004, metal);
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

function ovalTable(g, spec) {
  const [x, , z] = spec.position;
  const rx = spec.radius[0];
  const rz = spec.radius[1];
  const topY = spec.top;
  const wood = toon('#6b4632');
  const topMat = toon('#8b5a3c');
  const top = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 0.05, 40), topMat);
  top.scale.set(rx, 1, rz);
  top.position.set(x, topY - 0.025, z);
  top.castShadow = true;
  top.receiveShadow = true;
  g.add(top);
  const apron = new THREE.Mesh(new THREE.CylinderGeometry(0.94, 0.94, 0.09, 32), wood);
  apron.scale.set(rx, 1, rz);
  apron.position.set(x, topY - 0.09, z);
  apron.castShadow = true;
  g.add(apron);
  addCyl(g, 0.09, 0.11, 0.58, toon('#4a3024'), x, 0.32, z, 14);
  addCyl(g, 0.32, 0.36, 0.04, toon('#4a3024'), x, 0.03, z, 20);
}

function floorLamp(g, x, z) {
  const brass = toon('#c6a15a');
  const shade = toon('#f2c27a', { emissive: '#ffb45a', emissiveIntensity: 0.85 });
  const glow = toon('#ffe0a8', { emissive: '#ffd18a', emissiveIntensity: 1 });
  addCyl(g, 0.18, 0.2, 0.03, brass, x, 0.02, z, 18);
  addCyl(g, 0.018, 0.024, 1.28, brass, x, 0.68, z, 10);
  addCyl(g, 0.14, 0.22, 0.18, shade, x, 1.4, z, 18);
  addCyl(g, 0.08, 0.1, 0.02, glow, x, 1.33, z, 14);
}

function tableLamp(g, x, y, z) {
  const brass = toon('#d4b06a');
  const shade = toon('#f3c98a', { emissive: '#ffc56a', emissiveIntensity: 0.9 });
  const glow = toon('#ffe6b0', { emissive: '#ffd89a', emissiveIntensity: 1 });
  addCyl(g, 0.09, 0.1, 0.025, brass, x, y + 0.015, z, 16);
  addCyl(g, 0.012, 0.016, 0.22, brass, x, y + 0.14, z, 10);
  addCyl(g, 0.07, 0.11, 0.1, shade, x, y + 0.3, z, 16);
  addCyl(g, 0.04, 0.05, 0.015, glow, x, y + 0.26, z, 12);
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

function tableProps(g, top) {
  addBox(g, 0.26, 0.015, 0.2, toon('#f0e6d4'), -2.05, top + 0.01, -0.85);
  addBox(g, 0.2, 0.012, 0.15, toon('#f7f1e6'), -2.05, top + 0.024, -0.85);
  addBox(g, 0.012, 0.012, 0.14, toon('#2a2420'), -1.9, top + 0.03, -0.78);
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
  ovalTable(g, layout.built.table);
  floorLamp(g, layout.built.floorLamp[0], layout.built.floorLamp[2]);
  const shelfLamp = layout.built.tableLamp;
  tableLamp(g, shelfLamp[0], shelfLamp[1], shelfLamp[2]);
  for (const mic of layout.mics) boomMic(g, mic);
  const bookcase = layout.instances.find((i) => i.id === 'case');
  booksInCase(g, bookcase);
  bookRow(g, 1.38, 1.52, -3.02, 8);
  bookRow(g, 1.4, 2.05, -3.02, 7);
  bookRow(g, 2.32, 1.52, -3.02, 8);
  bookRow(g, 2.34, 2.05, -3.02, 6);
  tableProps(g, layout.built.table.top);
  foliage(g, -3.72, 1.62);
  for (const phone of layout.built.phones) headphones(g, phone.position[0], phone.position[1], phone.position[2]);
  pendantDrop(g, layout.built.table.position[0], layout.built.table.position[2]);
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
    if (kind !== 'pendant_lamp') return;
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
      dining_chair: 0.72,
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
      [layout.built.table.position, 2.0],
      [layout.built.floorLamp, 0.5],
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
