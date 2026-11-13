import * as THREE from 'three';
import { boot, toon, addBox, addCyl, makeCutawayShell } from './scene_lib.js';

const aqua = () => toon('#2f8f86');
const aquaDeep = () => toon('#1f6f68');
const wood = () => toon('#6a4632');
const woodMid = () => toon('#8a5a38');
const cream = () => toon('#f6f1e6');
const steel = () => toon('#c5ced6');
const steelDark = () => toon('#8e99a3');
const brass = () => toon('#d7c08a');
const rubber = () => toon('#5c6770');
const ink = () => toon('#3a4248');

const labelCache = new Map();

function labelMat(text, bg, fg) {
  const key = [text, bg, fg].join('|');
  if (labelCache.has(key)) return labelCache.get(key);
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 48;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 128, 48);
  ctx.fillStyle = fg;
  ctx.font = '700 28px Inter, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 64, 26);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  const mat = toon('#ffffff', { map: tex });
  labelCache.set(key, mat);
  return mat;
}

function tileTexture(base, grout, cells) {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = grout;
  ctx.fillRect(0, 0, 128, 128);
  ctx.fillStyle = base;
  const cell = 128 / cells;
  const g = 5;
  for (let i = 0; i < cells; i++) {
    for (let j = 0; j < cells; j++) {
      ctx.fillRect(i * cell + g / 2, j * cell + g / 2, cell - g, cell - g);
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  return tex;
}

function dress(mesh) {
  mesh.castShadow = false;
  mesh.userData.noShadow = true;
  mesh.userData.receiveShadow = true;
  return mesh;
}

function zoneFloor(g, w, d, mat, x, y, z) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, 0.02, d), mat);
  mesh.position.set(x, y, z);
  return dress(mesh), g.add(mesh), mesh;
}

function roundedSlab(g, w, d, thick, mat, x, y, z) {
  const r = Math.min(d, w) / 2;
  const span = Math.max(0.04, Math.abs(w) - Math.min(d, w));
  const alongX = w >= d;
  if (alongX) {
    addBox(g, span, thick, d, mat, x, y, z);
    addCyl(g, r, r, thick, mat, x - span / 2, y, z, 18);
    addCyl(g, r, r, thick, mat, x + span / 2, y, z, 18);
  } else {
    addBox(g, w, thick, span, mat, x, y, z);
    addCyl(g, r, r, thick, mat, x, y, z - span / 2, 18);
    addCyl(g, r, r, thick, mat, x, y, z + span / 2, 18);
  }
}

function hose(g, points, radius, mat) {
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i];
    const b = points[i + 1];
    const mid = a.clone().add(b).multiplyScalar(0.5);
    const dir = b.clone().sub(a);
    const len = Math.max(0.04, dir.length());
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, len, 8), mat);
    mesh.position.copy(mid);
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
    mesh.castShadow = true;
    g.add(mesh);
  }
}

function scissors(g, x, y, z, s = 1) {
  const metal = steel();
  for (const sign of [-1, 1]) {
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.012 * s, 0.008, 0.16 * s), metal);
    blade.position.set(x + sign * 0.01 * s, y, z + 0.04 * s);
    blade.rotation.y = sign * 0.28;
    blade.castShadow = true;
    g.add(blade);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.02 * s, 0.005 * s, 6, 12), metal);
    ring.position.set(x + sign * 0.022 * s, y, z - 0.06 * s);
    ring.castShadow = true;
    g.add(ring);
  }
  addCyl(g, 0.01 * s, 0.01 * s, 0.012, brass(), x, y + 0.006, z + 0.01 * s, 8);
}

function clipper(g, x, y, z) {
  addBox(g, 0.05, 0.032, 0.12, ink(), x, y, z);
  addBox(g, 0.055, 0.012, 0.045, steel(), x, y + 0.008, z + 0.07);
  addCyl(g, 0.012, 0.012, 0.04, brass(), x, y + 0.02, z - 0.02, 8);
}

function comb(g, x, y, z) {
  addBox(g, 0.012, 0.004, 0.16, steel(), x, y, z);
  for (let i = 0; i < 6; i++) {
    addBox(g, 0.008, 0.003, 0.012, steelDark(), x, y, z - 0.05 + i * 0.018);
  }
}

function brush(g, x, y, z) {
  addBox(g, 0.07, 0.012, 0.09, toon('#c46b4a'), x, y, z);
  addBox(g, 0.02, 0.012, 0.08, wood(), x, y, z - 0.08);
}

function tableTools(g, x, y, z) {
  scissors(g, x - 0.08, y, z, 0.85);
  clipper(g, x + 0.08, y, z + 0.02);
  comb(g, x + 0.16, y, z - 0.02);
}

function groomingTable(g, t) {
  const grp = new THREE.Group();
  grp.name = t.id;
  const topY = t.top;
  addCyl(grp, 0.09, 0.11, 0.05, ink(), t.x, 0.035, t.z, 14);
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 + 0.2;
    const reach = Math.min(t.d, t.w) * 0.42;
    const leg = new THREE.Mesh(new THREE.BoxGeometry(reach, 0.032, 0.038), aqua());
    leg.position.set(t.x + Math.cos(a) * reach * 0.45, 0.055, t.z + Math.sin(a) * reach * 0.45);
    leg.rotation.y = -a;
    leg.castShadow = true;
    grp.add(leg);
    addCyl(grp, 0.028, 0.034, 0.028, ink(), t.x + Math.cos(a) * reach, 0.028, t.z + Math.sin(a) * reach, 8);
  }
  addCyl(grp, 0.06, 0.075, topY * 0.52, aqua(), t.x, topY * 0.3, t.z, 14);
  addCyl(grp, 0.034, 0.04, topY * 0.38, steel(), t.x, topY * 0.7, t.z, 12);
  addBox(grp, 0.16, 0.018, 0.07, ink(), t.x + 0.18, 0.07, t.z + 0.1);

  const top = new THREE.Group();
  top.name = `${t.id}-top`;
  roundedSlab(top, t.w, t.d, 0.055, cream(), t.x, topY, t.z);
  addBox(top, t.w * 0.7, 0.07, t.d * 0.62, aquaDeep(), t.x, topY - 0.065, t.z);
  roundedSlab(top, t.w * 0.84, t.d * 0.7, 0.012, toon('#5c6770', { polygonOffset: true }), t.x, topY + 0.032, t.z);
  grp.add(top);

  const ax = t.x + t.arm * (t.w / 2 - 0.08);
  const postTop = topY + 0.5;
  addCyl(grp, 0.022, 0.028, postTop - topY, aqua(), ax, (postTop + topY) / 2, t.z, 10);
  addCyl(grp, 0.04, 0.04, 0.03, brass(), ax, topY + 0.03, t.z, 10);
  const reach = t.w * 0.5;
  const neck = [];
  for (let i = 0; i <= 6; i++) {
    const u = i / 6;
    const ang = u * Math.PI * 0.5;
    neck.push(new THREE.Vector3(
      ax - t.arm * Math.sin(ang) * reach,
      postTop + Math.sin(ang) * 0.05,
      t.z,
    ));
  }
  hose(grp, neck, 0.026, aqua());
  const end = neck[neck.length - 1];
  const drop = end.clone();
  drop.y = topY + 0.36;
  hose(grp, [end, drop], 0.014, steel());
  const loop = new THREE.Mesh(new THREE.TorusGeometry(0.075, 0.012, 8, 20), brass());
  loop.name = `${t.id}-loop`;
  loop.position.set(drop.x, drop.y - 0.08, drop.z);
  loop.castShadow = true;
  grp.add(loop);
  tableTools(grp, t.x - t.arm * 0.12, topY + 0.05, t.z + t.d * 0.18);
  g.add(grp);
}

function washTub(g, tub) {
  const grp = new THREE.Group();
  grp.name = 'tub';
  const { x, z, w, d, rim } = tub;
  const deck = 0.78;
  addBox(grp, w * 0.92, deck - 0.08, d * 0.9, aquaDeep(), x, (deck - 0.08) / 2 + 0.02, z);
  addBox(grp, 0.04, deck * 0.55, d * 0.55, aqua(), x - w * 0.22, deck * 0.32, z + 0.02);
  addBox(grp, 0.04, deck * 0.55, d * 0.55, aqua(), x + w * 0.18, deck * 0.32, z + 0.02);
  roundedSlab(grp, w, d, 0.06, steel(), x, deck, z);
  const basin = new THREE.Group();
  basin.name = 'tub-rim';
  addBox(basin, 0.04, rim - deck, d * 0.92, steel(), x - w / 2 + 0.04, (rim + deck) / 2, z);
  addBox(basin, 0.04, rim - deck, d * 0.92, steel(), x + w / 2 - 0.04, (rim + deck) / 2, z);
  addBox(basin, w * 0.92, rim - deck, 0.04, steel(), x, (rim + deck) / 2, z - d / 2 + 0.04);
  addBox(basin, w * 0.7, 0.06, 0.05, steelDark(), x, deck + 0.04, z + d / 2 - 0.04);
  addBox(basin, w * 0.7, 0.025, d * 0.62, toon('#aeb8c2'), x, deck + 0.02, z - 0.02);
  grp.add(basin);
  addCyl(grp, 0.02, 0.02, 0.28, steelDark(), x - 0.15, rim + 0.12, z - d / 2 + 0.08, 8);
  addCyl(grp, 0.02, 0.02, 0.22, steelDark(), x + 0.12, rim + 0.08, z - d / 2 + 0.08, 8);
  addBox(grp, 0.32, 0.025, 0.025, steel(), x, rim + 0.24, z - d / 2 + 0.08);
  const sprayer = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.08, 8), steel());
  sprayer.position.set(x + w / 2 - 0.12, rim + 0.02, z + 0.05);
  sprayer.rotation.z = Math.PI / 2;
  sprayer.castShadow = true;
  grp.add(sprayer);
  addCyl(grp, 0.045, 0.05, 0.16, toon('#7eb8c9'), x + w * 0.28, deck + 0.12, z - d * 0.22, 10);
  addCyl(grp, 0.04, 0.045, 0.14, toon('#f0e2c4'), x + w * 0.28, deck + 0.1, z + 0.02, 10);
  g.add(grp);
}

function addRamp(g, ramp) {
  const grp = new THREE.Group();
  grp.name = 'ramp';
  const rise = ramp.y0 - ramp.y1;
  const deck = new THREE.Mesh(new THREE.BoxGeometry(ramp.w, 0.04, ramp.d), toon('#6d7c78'));
  deck.castShadow = true;
  deck.receiveShadow = true;
  grp.add(deck);
  const n = 7;
  for (let i = 0; i < n; i++) {
    const zz = -ramp.d / 2 + ((i + 0.5) * ramp.d) / n;
    const slat = new THREE.Mesh(new THREE.BoxGeometry(ramp.w * 0.82, 0.015, 0.025), cream());
    slat.position.set(0, 0.025, zz);
    slat.castShadow = true;
    grp.add(slat);
  }
  for (const side of [-1, 1]) {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.07, ramp.d), aqua());
    rail.position.set(side * (ramp.w / 2 - 0.02), 0.05, 0);
    rail.castShadow = true;
    grp.add(rail);
  }
  grp.rotation.x = Math.atan2(rise, ramp.d);
  grp.position.set(ramp.x, (ramp.y0 + ramp.y1) / 2, ramp.z);
  g.add(grp);
}

function crate(g, x, y, z, w, h, d, open) {
  const shell = cream();
  const frame = aqua();
  addBox(g, 0.02, h, d, shell, x - w / 2 + 0.01, y + h / 2, z);
  addBox(g, w, 0.025, d, wood(), x, y + 0.02, z);
  addBox(g, w, 0.025, d, frame, x, y + h - 0.015, z);
  addBox(g, w, h, 0.025, shell, x, y + h / 2, z - d / 2 + 0.01);
  addBox(g, w, h, 0.025, shell, x, y + h / 2, z + d / 2 - 0.01);
  addBox(g, w * 0.8, 0.02, d * 0.72, toon('#e7d3b0'), x + 0.03, y + 0.05, z);
  const door = new THREE.Group();
  const bars = 5;
  for (let i = 0; i < bars; i++) {
    const zz = -d + 0.05 + (i * (d - 0.1)) / (bars - 1);
    addCyl(door, 0.007, 0.007, h * 0.72, steel(), 0, h * 0.48, zz, 6);
  }
  addBox(door, 0.018, 0.028, d * 0.92, frame, 0, h * 0.14, -d / 2);
  addBox(door, 0.018, 0.028, d * 0.92, frame, 0, h * 0.84, -d / 2);
  addBox(door, 0.02, 0.04, 0.04, brass(), 0.012, h * 0.48, -0.08);
  door.position.set(x + w / 2, y, z + d / 2);
  if (open) door.rotation.y = -0.7;
  g.add(door);
  if (open) {
    addBox(g, 0.26, 0.05, 0.32, toon('#c46b4a'), x + 0.04, y + 0.09, z);
  }
}

function kennelBank(g, k) {
  const grp = new THREE.Group();
  grp.name = 'kennel-bank';
  const cols = 2;
  const rows = 2;
  const cw = k.d / cols;
  const ch = (k.h - 0.08) / rows;
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const cz = k.z - k.d / 2 + cw * (col + 0.5);
      const cy = 0.06 + ch * row;
      crate(grp, k.x, cy, cz, k.w - 0.04, ch - 0.04, cw - 0.05, row === 0 && col === 0);
    }
  }
  g.add(grp);
}

function standDryer(g, d, kennel) {
  const grp = new THREE.Group();
  grp.name = 'dryer';
  addCyl(grp, 0.18, 0.22, 0.06, ink(), d.x, 0.04, d.z, 16);
  addCyl(grp, 0.032, 0.038, 1.02, aqua(), d.x, 0.58, d.z, 10);
  addCyl(grp, 0.13, 0.15, 0.26, aquaDeep(), d.x, 1.16, d.z, 16);
  const bell = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.18, 12), steel());
  bell.rotation.z = Math.PI / 2;
  bell.position.set(d.x - 0.22, 1.12, d.z);
  bell.castShadow = true;
  grp.add(bell);
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.025, 8, 8), toon('#fff1c4', { emissive: '#ffe3a3', emissiveIntensity: 0.8 }));
  bulb.name = 'bulb';
  bulb.position.set(d.x + 0.08, 1.28, d.z);
  grp.add(bulb);
  const faceX = kennel.x + kennel.w / 2 + 0.02;
  const points = [];
  const steps = 7;
  for (let i = 0; i < steps; i++) {
    const t = i / (steps - 1);
    points.push(new THREE.Vector3(
      d.x + (faceX - d.x) * t,
      1.22 + Math.sin(t * Math.PI) * 0.22 - t * 0.55,
      d.z + (-0.55 - d.z) * t,
    ));
  }
  hose(grp, points, 0.022, toon('#c46b4a'));
  const nozzle = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.1, 10), steel());
  nozzle.position.copy(points[points.length - 1]);
  nozzle.rotation.z = Math.PI / 2;
  nozzle.castShadow = true;
  grp.add(nozzle);
  g.add(grp);
}

function towelCubby(g, c) {
  const grp = new THREE.Group();
  grp.name = 'cubby';
  addBox(grp, c.w, c.h, 0.04, wood(), c.x, c.h / 2, c.z - c.d / 2);
  addBox(grp, 0.04, c.h, c.d, wood(), c.x - c.w / 2, c.h / 2, c.z);
  addBox(grp, 0.04, c.h, c.d, wood(), c.x + c.w / 2, c.h / 2, c.z);
  addBox(grp, c.w, 0.04, c.d, woodMid(), c.x, 0.08, c.z);
  addBox(grp, c.w, 0.035, c.d, woodMid(), c.x, c.h * 0.52, c.z);
  addBox(grp, c.w, 0.04, c.d, wood(), c.x, c.h, c.z);
  const colors = ['#c46b4a', '#f4efe4', '#7d9a78', '#e7d3b0', '#d07a4a', '#f7f1e6'];
  for (let shelf = 0; shelf < 2; shelf++) {
    const y0 = shelf === 0 ? 0.14 : c.h * 0.52 + 0.06;
    for (let i = 0; i < 3; i++) {
      const stack = 4;
      for (let k = 0; k < stack; k++) {
        addBox(
          grp,
          0.28,
          0.035,
          0.22,
          toon(colors[(i + k + shelf) % colors.length]),
          c.x - 0.5 + i * 0.5,
          y0 + k * 0.04,
          c.z + 0.02,
        );
      }
    }
  }
  g.add(grp);
}

function toolBoard(g, b) {
  const grp = new THREE.Group();
  grp.name = `board-${b.x.toFixed(2)}`;
  addBox(grp, b.w, b.h, 0.03, woodMid(), b.x, b.y + b.h / 2, b.z);
  addBox(grp, b.w * 0.92, 0.02, 0.02, brass(), b.x, b.y + b.h - 0.08, b.z + 0.02);
  scissors(grp, b.x - b.w * 0.28, b.y + b.h * 0.45, b.z + 0.04, 1);
  clipper(grp, b.x - 0.02, b.y + b.h * 0.42, b.z + 0.04);
  comb(grp, b.x + b.w * 0.22, b.y + b.h * 0.4, b.z + 0.04);
  brush(grp, b.x + b.w * 0.28, b.y + b.h * 0.28, b.z + 0.04);
  grp.traverse((obj) => {
    if (!obj.isMesh) return;
    obj.castShadow = false;
    obj.userData.noShadow = true;
    obj.userData.receiveShadow = true;
  });
  g.add(grp);
}

function toolCart(g, c) {
  const grp = new THREE.Group();
  grp.name = 'cart';
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      addCyl(grp, 0.015, 0.015, c.h, steel(), c.x + sx * (c.w / 2 - 0.03), c.h / 2, c.z + sz * (c.d / 2 - 0.03), 8);
      addCyl(grp, 0.03, 0.03, 0.02, ink(), c.x + sx * (c.w / 2 - 0.03), 0.03, c.z + sz * (c.d / 2 - 0.03), 8);
    }
  }
  addBox(grp, c.w, 0.03, c.d, aqua(), c.x, 0.48, c.z);
  addBox(grp, c.w, 0.035, c.d, cream(), c.x, c.h, c.z);
  addCyl(grp, 0.04, 0.045, 0.15, toon('#7eb8c9'), c.x - 0.08, c.h + 0.1, c.z, 10);
  addCyl(grp, 0.032, 0.038, 0.12, toon('#f0e2c4'), c.x + 0.08, c.h + 0.08, c.z + 0.03, 10);
  g.add(grp);
}

function handoffCounter(g, c) {
  const grp = new THREE.Group();
  grp.name = 'counter';
  addBox(grp, c.w * 0.96, c.h - 0.1, c.d * 0.55, wood(), c.x, (c.h - 0.1) / 2, c.z + c.d * 0.1);
  addBox(grp, c.w * 0.9, 0.58, 0.035, aqua(), c.x, 0.46, c.z + c.d / 2 - 0.02);
  const top = new THREE.Group();
  top.name = 'counter-top';
  addBox(top, c.w + 0.08, 0.05, c.d + 0.06, woodMid(), c.x, c.h - 0.025, c.z);
  grp.add(top);
  const ledgeZ = c.z + c.d / 2 + 0.08;
  addBox(grp, c.w * 0.48, 0.04, 0.2, cream(), c.x, c.ledge, ledgeZ);
  addBox(grp, 0.24, 0.035, 0.14, toon('#c46b4a'), c.x - 0.2, c.ledge + 0.04, ledgeZ);
  for (const dx of [-0.28, 0, 0.28]) {
    const hook = new THREE.Mesh(new THREE.TorusGeometry(0.028, 0.007, 6, 10, Math.PI), brass());
    hook.position.set(c.x + dx, c.ledge - 0.05, ledgeZ + 0.08);
    hook.rotation.z = Math.PI;
    hook.castShadow = true;
    grp.add(hook);
  }
  const plate = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.09), labelMat('RINSE', '#2f8f86', '#f6f1e6'));
  plate.position.set(c.x + 0.55, 0.52, c.z + c.d / 2 + 0.002);
  plate.castShadow = false;
  plate.userData.noShadow = true;
  grp.add(plate);
  g.add(grp);
}

function addSpindles(g, b) {
  const alongX = b.w >= b.d;
  const span = Math.max(b.w, b.d);
  const n = Math.max(4, Math.round(span / 0.11));
  for (let i = 0; i < n; i++) {
    const t = -span / 2 + ((i + 0.5) * span) / n;
    const x = alongX ? b.x + t : b.x;
    const z = alongX ? b.z : b.z + t;
    addCyl(g, 0.012, 0.012, b.h - 0.1, steel(), x, (b.h - 0.08) / 2 + 0.04, z, 7);
  }
  addBox(g, alongX ? b.w : 0.05, 0.045, alongX ? 0.05 : b.d, wood(), b.x, 0.04, b.z);
  addBox(g, alongX ? b.w : 0.045, 0.032, alongX ? 0.045 : b.d, aqua(), b.x, b.h - 0.02, b.z);
}

function addBarrier(g, b) {
  if (b.id.endsWith('leaf')) {
    const grp = new THREE.Group();
    grp.name = b.id;
    addSpindles(grp, { ...b, x: 0, z: 0 });
    grp.position.set(b.x, 0, b.z);
    g.add(grp);
    return;
  }
  const grp = new THREE.Group();
  grp.name = b.id;
  addSpindles(grp, b);
  g.add(grp);
}

function addPosts(g, opening) {
  for (const x of [opening.x0, opening.x1]) {
    addCyl(g, 0.04, 0.048, opening.height + 0.06, wood(), x, (opening.height + 0.06) / 2, opening.z, 10);
    addCyl(g, 0.055, 0.055, 0.035, brass(), x, opening.height + 0.04, opening.z, 10);
  }
}

function workStool(parent, seat) {
  const g = new THREE.Group();
  g.name = seat.id;
  g.position.set(seat.position[0], 0, seat.position[2]);
  g.rotation.y = seat.rotationY || 0;
  const seatH = 0.62;
  addCyl(g, 0.19, 0.2, 0.055, toon('#2f8f86'), 0, seatH, 0, 18);
  addCyl(g, 0.16, 0.16, 0.02, toon('#1f6f68'), 0, seatH + 0.03, 0, 16);
  addBox(g, 0.2, 0.07, 0.035, toon('#1f6f68'), 0, seatH + 0.02, -0.15);
  addCyl(g, 0.032, 0.038, seatH - 0.1, steel(), 0, (seatH - 0.1) / 2 + 0.05, 0, 10);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.012, 6, 18), steel());
  ring.rotation.x = Math.PI / 2;
  ring.position.set(0, 0.24, 0);
  ring.castShadow = true;
  g.add(ring);
  addCyl(g, 0.15, 0.17, 0.028, ink(), 0, 0.04, 0, 16);
  parent.add(g);
}

function waitingChair(parent, seat) {
  const g = new THREE.Group();
  g.name = seat.id;
  g.position.set(seat.position[0], 0, seat.position[2]);
  g.rotation.y = seat.rotationY || 0;
  addBox(g, 0.46, 0.06, 0.42, toon('#efe2cc'), 0, 0.46, 0.02);
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      addCyl(g, 0.02, 0.022, 0.44, wood(), sx * 0.18, 0.22, sz * 0.15, 8);
    }
  }
  addBox(g, 0.42, 0.34, 0.04, toon('#2f8f86'), 0, 0.74, -0.18);
  parent.add(g);
}

function contact(g, x, z, rx, rz) {
  const mesh = new THREE.Mesh(
    new THREE.CircleGeometry(1, 16),
    toon('#2a2118', { transparent: true, opacity: 0.22, depthWrite: false, polygonOffset: true }),
  );
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set(x, 0.02, z);
  mesh.scale.set(rx, rz, 1);
  mesh.castShadow = false;
  mesh.userData.noShadow = true;
  g.add(mesh);
}

function makeShell(layout) {
  const g = makeCutawayShell(layout);
  const { width: W, depth: D, height: H } = layout.meta.room;
  const innerB = -D / 2 + 0.08;
  const innerL = -W / 2 + 0.08;

  const reception = tileTexture('#f3e6d2', '#d9c7aa', 2);
  reception.repeat.set(8, 3);
  const wet = tileTexture('#d5e4de', '#b7c9c2', 2);
  wet.repeat.set(3, 3);
  zoneFloor(g, W - 0.3, D - 0.3, toon('#dcc6a4'), 0, 0.012, -0.15);
  zoneFloor(g, W - 0.4, 3.45, toon('#ffffff', { map: reception }), 0, 0.016, 2.85);
  zoneFloor(g, 4.3, 3.5, toon('#ffffff', { map: wet }), 3.55, 0.018, -2.55);

  dress(addBox(g, W - 0.35, 0.08, 0.06, wood(), 0, 0.05, innerB));
  dress(addBox(g, 0.06, 0.08, D - 0.35, wood(), innerL, 0.05, 0));

  const dado = woodMid();
  dress(addBox(g, W - 0.28, 0.92, 0.045, dado, 0, 0.5, innerB + 0.015));
  dress(addBox(g, 0.045, 0.92, D - 0.28, dado, innerL + 0.015, 0.5, 0));
  dress(addBox(g, W - 0.24, 0.05, 0.04, wood(), 0, 0.98, innerB + 0.03));
  dress(addBox(g, 0.04, 0.05, D - 0.24, wood(), innerL + 0.03, 0.98, 0));
  const wetTiles = toon('#e7f0ec');
  dress(addBox(g, 3.4, 1.05, 0.03, wetTiles, 3.7, 0.58, innerB + 0.03));
  dress(addBox(g, W - 0.5, 0.02, 0.025, brass(), 0, 2.42, innerB + 0.02));
  dress(addBox(g, 0.025, 0.02, D - 0.5, brass(), innerL + 0.02, 2.42, 0));

  const deckW = W + 2.6;
  const deckD = D + 3.6;
  const deckX = -W / 2 + deckW / 2;
  const deckZ = -D / 2 + deckD / 2;
  const deck = addBox(
    g, deckW, 0.14, deckD,
    toon(layout.shell.ceilingColor || '#f7f3ea', { emissive: '#f3eadc', emissiveIntensity: 0.22 }),
    deckX, H - 0.04, deckZ,
  );
  deck.name = 'roof-deck';
  deck.castShadow = false;
  deck.userData.noShadow = true;
  deck.receiveShadow = false;
  const fascia = (mesh) => {
    mesh.castShadow = false;
    mesh.userData.noShadow = true;
    mesh.receiveShadow = false;
    return mesh;
  };
  fascia(addBox(g, deckW + 0.08, 0.22, 0.18, wood(), deckX, H - 0.12, -D / 2 + deckD));
  fascia(addBox(g, 0.18, 0.22, deckD + 0.08, wood(), -W / 2 + deckW, H - 0.12, deckZ));
  const returnWall = addBox(g, 0.12, H, 5.8, toon(layout.shell.wallColor || '#f6f1e8'), W / 2 - 0.06, H / 2, -D / 2 + 2.9);
  returnWall.name = 'right-return';
  returnWall.castShadow = false;
  returnWall.userData.noShadow = true;
  returnWall.userData.receiveShadow = true;
  for (const z of [-1.55, 1.15]) {
    addBox(g, W - 1.6, 0.08, 0.12, wood(), -0.35, H - 0.2, z);
  }
  const pier = layout.stations.pier;
  addBox(g, pier.w, pier.h, pier.d, toon('#f7f1e6'), pier.x, pier.h / 2, pier.z);
  addBox(g, pier.w + 0.02, 1.15, pier.d * 0.55, wetTiles, pier.x - 0.02, 0.62, pier.z - 0.3);
  return g;
}

function makeProcedural(layout) {
  const g = new THREE.Group();
  g.name = 'salon';
  const s = layout.stations;
  groomingTable(g, s.tableA);
  groomingTable(g, s.tableB);
  washTub(g, s.tub);
  addRamp(g, s.ramp);
  kennelBank(g, s.kennel);
  standDryer(g, s.dryer, s.kennel);
  towelCubby(g, s.cubby);
  toolBoard(g, s.boardA);
  toolBoard(g, s.boardB);
  toolCart(g, s.cart);
  handoffCounter(g, s.counter);
  for (const seat of layout.seats || []) {
    if (seat.kind === 'stool') workStool(g, seat);
    else waitingChair(g, seat);
  }
  for (const barrier of layout.barriers) addBarrier(g, barrier);
  for (const opening of layout.openings) addPosts(g, opening);

  contact(g, s.tableA.x, s.tableA.z, 0.55, 0.32);
  contact(g, s.tableB.x, s.tableB.z, 0.5, 0.3);
  contact(g, s.tub.x, s.tub.z, 0.7, 0.4);
  contact(g, s.kennel.x, s.kennel.z, 0.4, 0.8);
  contact(g, s.counter.x, s.counter.z, 1.15, 0.4);
  for (const seat of layout.seats || []) {
    contact(g, seat.position[0], seat.position[2], seat.kind === 'stool' ? 0.22 : 0.26, seat.kind === 'stool' ? 0.22 : 0.26);
  }

  const matA = addBox(g, 0.7, 0.012, 0.5, toon('#c46b4a'), s.tableA.x, 0.02, -1.72);
  dress(matA);
  const matB = addBox(g, 0.7, 0.012, 0.5, toon('#7d9a78'), s.tableB.x, 0.02, -1.72);
  dress(matB);
  const grate = addBox(g, 0.42, 0.01, 0.16, steelDark(), s.tub.x, 0.022, s.tub.z + s.tub.d / 2 + 0.35);
  dress(grate);
  return g;
}

boot({
  makeShell,
  makeProcedural,
  readyText: 'ready — grooming salon · T toon · U unlit',
});
