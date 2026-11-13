import * as THREE from 'three';
import { boot, toon, addBox, addCyl } from './scene_lib.js';

const HIDE = [
  { grain: '#c6a36a', flesh: '#edd7ae', name: 'natural' },
  { grain: '#8d4e2c', flesh: '#c48958', name: 'chestnut' },
  { grain: '#2c2826', flesh: '#5c4a3c', name: 'black' },
  { grain: '#6e2430', flesh: '#b15a58', name: 'oxblood' },
];

let grainTex;

function grain() {
  if (grainTex) return grainTex;
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = '#d8d0c6';
  g.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 1400; i++) {
    const x = (i * 47) % 128;
    const y = (i * 91) % 128;
    const a = 0.05 + (i % 4) * 0.03;
    g.fillStyle = `rgba(50,32,18,${a})`;
    g.fillRect(x, y, 1, 1);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.repeat.set(3, 3);
  grainTex = tex;
  return tex;
}

function grainRepeat(rx, ry) {
  const tex = grain().clone();
  tex.repeat.set(rx, ry);
  tex.needsUpdate = true;
  return tex;
}

function floorTexture(repeat) {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const ctx = c.getContext('2d');
  const planks = 8;
  const ph = 256 / planks;
  for (let i = 0; i < planks; i++) {
    const shade = 158 + (i % 3) * 12;
    ctx.fillStyle = `rgb(${shade + 36}, ${shade - 6}, ${shade - 46})`;
    ctx.fillRect(0, i * ph, 256, ph);
    ctx.fillStyle = 'rgba(70,40,18,0.35)';
    ctx.fillRect(0, i * ph, 256, 1);
    for (let k = 0; k < 16; k++) {
      const x = (i * 53 + k * 29) % 250;
      const y = i * ph + 3 + ((k * 17) % (ph - 6));
      ctx.fillStyle = 'rgba(90,52,24,0.16)';
      ctx.fillRect(x, y, 14, 1);
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  tex.repeat.set(repeat[0], repeat[1]);
  return tex;
}

function labelMaterial(text) {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 64;
  const g = c.getContext('2d');
  g.fillStyle = '#5c3d2a';
  g.fillRect(0, 0, 256, 64);
  g.strokeStyle = '#e6d3b4';
  g.lineWidth = 4;
  g.strokeRect(6, 6, 244, 52);
  g.fillStyle = '#f4ead8';
  g.font = '600 28px sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(text, 128, 34);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return toon('#ffffff', { map: tex });
}

function leatherMat(hex, rx, ry) {
  return toon(hex, { map: grainRepeat(rx, ry) });
}

function addMesh(g, geo, mat, x, y, z) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  g.add(m);
  return m;
}

function spar(g, ax, ay, az, bx, by, bz, r, mat, seg = 8) {
  const a = new THREE.Vector3(ax, ay, az);
  const b = new THREE.Vector3(bx, by, bz);
  const dir = b.clone().sub(a);
  const len = Math.max(dir.length(), 1e-4);
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, seg), mat);
  m.position.copy(a).add(b).multiplyScalar(0.5);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
  m.castShadow = true;
  m.receiveShadow = true;
  g.add(m);
  return m;
}

function offsetAlongNormal(geo, dist) {
  const g = geo.clone();
  const pos = g.attributes.position;
  const norm = g.attributes.normal;
  for (let i = 0; i < pos.count; i++) {
    pos.setXYZ(
      i,
      pos.getX(i) + norm.getX(i) * dist,
      pos.getY(i) + norm.getY(i) * dist,
      pos.getZ(i) + norm.getZ(i) * dist,
    );
  }
  g.computeVertexNormals();
  return g;
}

function hangGeometry(w, h, bulge, seed) {
  const geo = new THREE.PlaneGeometry(w, h, 18, 26);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const u = x / w;
    const t = y / h + 0.5;
    const neck = 0.38 + 0.62 * Math.sin(Math.min(1, t * 1.15) * Math.PI * 0.92);
    const belly = Math.sin(t * Math.PI) * Math.cos(u * Math.PI * 0.8) * bulge;
    const fold = Math.sin(u * Math.PI * (3 + seed) + t * 6) * 0.02 * (0.35 + t);
    const sag = (1 - t) * (1 - t) * (0.08 + seed * 0.015);
    const scallop = Math.sin(u * Math.PI * (2.2 + seed)) * 0.11 * (1 - t) * (1 - t);
    pos.setXYZ(i, x * neck, y - sag + scallop, belly + fold);
  }
  geo.computeVertexNormals();
  return geo;
}

function laidGeometry(w, d, lift) {
  const geo = new THREE.PlaneGeometry(w, d, 16, 12);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const u = x / w;
    const v = z / d;
    const belly = Math.cos(u * Math.PI) * Math.cos(v * Math.PI) * lift;
    const wave = Math.sin(u * 6.5) * Math.cos(v * 4.0) * lift * 0.28;
    const rim = Math.max(Math.abs(u), Math.abs(v)) > 0.46 ? -lift * 0.35 : 0;
    pos.setY(i, Math.max(0.006, belly + wave + rim));
  }
  geo.computeVertexNormals();
  return geo;
}

function thickSkin(parent, geo, grainHex, fleshHex, rx, ry) {
  const front = addMesh(parent, geo, leatherMat(grainHex, rx, ry), 0, 0, 0);
  const back = addMesh(parent, offsetAlongNormal(geo, -0.012), leatherMat(fleshHex, rx, ry), 0, 0, 0);
  return { front, back };
}

function threadAlong(parent, points, radius, color) {
  const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)));
  const mesh = new THREE.Mesh(
    new THREE.TubeGeometry(curve, Math.max(8, points.length * 4), radius, 5, false),
    toon(color),
  );
  mesh.castShadow = true;
  parent.add(mesh);
  return mesh;
}

function hangHide(parent, x, yTop, z, w, h, tone, seed) {
  const geo = hangGeometry(w, h, 0.11 + seed * 0.015, seed);
  const grp = new THREE.Group();
  grp.name = `hide-${tone.name}`;
  thickSkin(grp, geo, tone.grain, tone.flesh, 3.2, 5.5);
  grp.position.set(x, yTop - h / 2, z);
  grp.rotation.y = Math.PI / 2;
  parent.add(grp);
  return grp;
}

function laidHide(parent, x, y, z, w, d, tone, rot, lift = 0.045) {
  const geo = laidGeometry(w, d, lift);
  const grp = new THREE.Group();
  thickSkin(grp, geo, tone.grain, tone.flesh, 2.4, 2.2);
  grp.position.set(x, y, z);
  grp.rotation.y = rot || 0;
  parent.add(grp);
  return grp;
}

function ringHandle(parent, x, y, z, r, tube, color, tilt) {
  const mesh = new THREE.Mesh(new THREE.TorusGeometry(r, tube, 8, 18), toon(color));
  mesh.position.set(x, y, z);
  mesh.rotation.x = tilt || 0;
  mesh.castShadow = true;
  parent.add(mesh);
  const pipe = new THREE.Mesh(new THREE.TorusGeometry(r, tube * 0.35, 6, 16), toon('#e7d3a8'));
  pipe.position.copy(mesh.position);
  pipe.rotation.copy(mesh.rotation);
  pipe.castShadow = true;
  parent.add(pipe);
  return mesh;
}

function hoboBag(parent, x, y, z, rot, tone) {
  const grp = new THREE.Group();
  grp.name = 'hobo';
  const pts = [
    [0.03, 0], [0.13, 0.012], [0.16, 0.06], [0.155, 0.14], [0.12, 0.24], [0.09, 0.3],
  ].map(([r, py]) => new THREE.Vector2(r, py));
  const body = new THREE.Mesh(new THREE.LatheGeometry(pts, 28), leatherMat(tone.grain, 2.5, 2.5));
  body.scale.set(1.05, 1, 0.62);
  body.castShadow = true;
  body.receiveShadow = true;
  grp.add(body);
  const lip = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.008, 6, 20), toon(tone.flesh));
  lip.scale.set(1.05, 1, 0.62);
  lip.position.y = 0.3;
  lip.rotation.x = Math.PI / 2;
  lip.castShadow = true;
  grp.add(lip);
  threadAlong(grp, [
    [0.14, 0.05, 0.04], [0.12, 0.16, 0.06], [0.06, 0.26, 0.05], [-0.04, 0.28, 0.04],
  ], 0.0035, '#f0e2bc');
  ringHandle(grp, 0.02, 0.38, 0.02, 0.075, 0.011, tone.grain, 0.15);
  ringHandle(grp, -0.01, 0.4, -0.02, 0.068, 0.01, '#4a3428', -0.1);
  grp.position.set(x, y, z);
  grp.rotation.y = rot || 0;
  parent.add(grp);
  return grp;
}

function toteBag(parent, x, y, z, rot, tone) {
  const grp = new THREE.Group();
  grp.name = 'tote';
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(0.34, 0.28, 0.12),
    leatherMat(tone.grain, 2, 2),
  );
  body.position.y = 0.16;
  body.castShadow = true;
  body.receiveShadow = true;
  grp.add(body);
  const belly = new THREE.Mesh(
    new THREE.SphereGeometry(0.16, 18, 12, 0, Math.PI * 2, 0, Math.PI / 2),
    leatherMat(tone.grain, 2, 2),
  );
  belly.scale.set(1.12, 0.55, 0.48);
  belly.position.y = 0.03;
  belly.castShadow = true;
  grp.add(belly);
  addBox(grp, 0.36, 0.012, 0.14, toon(tone.flesh), 0, 0.3, 0);
  for (const sx of [-0.08, 0.08]) {
    const handle = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.01, 8, 16, Math.PI), toon(tone.grain));
    handle.position.set(sx, 0.36, 0);
    handle.rotation.z = Math.PI;
    handle.castShadow = true;
    grp.add(handle);
    const stitch = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.003, 5, 14, Math.PI), toon('#f0e2bc'));
    stitch.position.copy(handle.position);
    stitch.rotation.copy(handle.rotation);
    grp.add(stitch);
  }
  for (const sx of [-0.15, 0.15]) {
    addCyl(grp, 0.012, 0.012, 0.01, toon('#c6a15a'), sx, 0.3, 0.06, 8);
  }
  grp.position.set(x, y, z);
  grp.rotation.y = rot || 0;
  parent.add(grp);
  return grp;
}

function flapBag(parent, x, y, z, rot, tone) {
  const grp = new THREE.Group();
  grp.name = 'flap-bag';
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.2, 0.08), leatherMat(tone.grain, 2, 2));
  body.position.y = 0.12;
  body.castShadow = true;
  grp.add(body);
  const flap = new THREE.Mesh(
    new THREE.SphereGeometry(0.13, 16, 10, 0, Math.PI, 0, Math.PI / 2),
    leatherMat(tone.grain, 2, 2),
  );
  flap.scale.set(1.05, 0.85, 0.55);
  flap.position.set(0, 0.2, 0.02);
  flap.castShadow = true;
  grp.add(flap);
  const edge = new THREE.Mesh(new THREE.TorusGeometry(0.125, 0.006, 6, 14, Math.PI), toon(tone.flesh));
  edge.scale.set(1.05, 0.85, 0.7);
  edge.position.set(0, 0.2, 0.02);
  grp.add(edge);
  const strap = threadAlong(grp, [
    [-0.1, 0.2, -0.02], [-0.16, 0.32, -0.02], [-0.12, 0.42, -0.02],
  ], 0.006, tone.grain);
  strap.castShadow = true;
  addCyl(grp, 0.014, 0.014, 0.008, toon('#d7c07a'), 0, 0.12, 0.045, 8);
  grp.position.set(x, y, z);
  grp.rotation.y = rot || 0;
  parent.add(grp);
  return grp;
}

function coilBelt(parent, x, y, z, color) {
  const pts = [];
  for (let i = 0; i <= 28; i++) {
    const t = i / 28;
    const a = t * Math.PI * 3.2;
    const r = 0.045 + t * 0.07;
    pts.push([Math.cos(a) * r, t * 0.045, Math.sin(a) * r]);
  }
  const mesh = threadAlong(parent, pts, 0.012, color);
  mesh.position.set(x, y, z);
  return mesh;
}

function buckle(parent, x, y, z, scale) {
  const s = scale || 1;
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.028 * s, 0.005 * s, 6, 12), toon('#d7c07a'));
  ring.position.set(x, y, z);
  ring.castShadow = true;
  parent.add(ring);
  addBox(parent, 0.004 * s, 0.04 * s, 0.004 * s, toon('#f0e2bc'), x + 0.004 * s, y, z);
}

function dRing(parent, x, y, z) {
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.02, 0.004, 6, 10, Math.PI), toon('#c6b8a2'));
  ring.position.set(x, y, z);
  ring.rotation.z = Math.PI;
  ring.castShadow = true;
  parent.add(ring);
  addBox(parent, 0.044, 0.006, 0.006, toon('#c6b8a2'), x, y - 0.02, z);
}

function rivet(parent, x, y, z, color) {
  addCyl(parent, 0.012, 0.014, 0.008, toon(color || '#d7c07a'), x, y, z, 8);
  const cap = new THREE.Mesh(new THREE.SphereGeometry(0.01, 8, 6), toon('#f0e2bc'));
  cap.scale.y = 0.45;
  cap.position.set(x, y + 0.006, z);
  cap.castShadow = true;
  parent.add(cap);
}

function clickerPress(g, bench) {
  const iron = toon('#3e444c');
  const steel = toon('#b7bec4');
  const x = bench.x - 0.32;
  const z = bench.z + 0.02;
  const top = bench.h;
  addBox(g, 0.62, 0.035, 0.46, steel, x, top + 0.02, z);
  addBox(g, 0.08, 0.62, 0.08, iron, x - 0.02, top + 0.36, z - 0.16);
  addBox(g, 0.46, 0.07, 0.08, iron, x + 0.16, top + 0.66, z - 0.16);
  const throat = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.038, 8, 12, Math.PI / 2), iron);
  throat.position.set(x + 0.02, top + 0.5, z - 0.16);
  throat.rotation.y = Math.PI / 2;
  throat.rotation.z = Math.PI;
  throat.castShadow = true;
  g.add(throat);
  addCyl(g, 0.045, 0.05, 0.08, steel, x + 0.22, top + 0.1, z, 12);
  spar(g, x + 0.34, top + 0.58, z - 0.16, x + 0.48, top + 0.78, z + 0.02, 0.018, iron, 8);
  const grip = addCyl(g, 0.02, 0.02, 0.1, toon('#6b4632'), x + 0.48, top + 0.78, z + 0.02, 8);
  grip.rotation.z = Math.PI / 2.6;
  const die = dieOutline();
  die.position.set(x + 0.16, top + 0.045, z + 0.02);
  die.rotation.x = -Math.PI / 2;
  g.add(die);
}

function dieOutline() {
  const s = new THREE.Shape();
  s.moveTo(-0.07, 0);
  s.quadraticCurveTo(-0.09, 0.08, -0.04, 0.14);
  s.quadraticCurveTo(0, 0.17, 0.05, 0.14);
  s.quadraticCurveTo(0.09, 0.08, 0.07, 0);
  s.quadraticCurveTo(0, -0.02, -0.07, 0);
  const hole = new THREE.Path();
  hole.absellipse(0, 0.07, 0.035, 0.045, 0, Math.PI * 2, false, 0);
  s.holes.push(hole);
  const geo = new THREE.ExtrudeGeometry(s, { depth: 0.01, bevelEnabled: true, bevelThickness: 0.002, bevelSize: 0.002, bevelSegments: 1 });
  const mesh = new THREE.Mesh(geo, toon('#9aa3a8'));
  mesh.castShadow = true;
  return mesh;
}

function roundKnife(g, x, y, z, rot) {
  const disc = addCyl(g, 0.045, 0.045, 0.008, toon('#d5dbe0'), x, y, z, 16);
  disc.rotation.x = Math.PI / 2;
  disc.rotation.z = rot || 0;
  spar(g, x, y, z, x + 0.09, y + 0.01, z + 0.02, 0.008, toon('#6b4632'), 6);
}

function maul(g, x, y, z) {
  addCyl(g, 0.035, 0.038, 0.08, toon('#6a5648'), x, y, z, 10);
  addCyl(g, 0.012, 0.012, 0.16, toon('#8a5a38'), x, y + 0.02, z + 0.04, 6).rotation.x = Math.PI / 2.4;
}

function awl(g, x, y, z) {
  addCyl(g, 0.003, 0.008, 0.09, toon('#c5ccd2'), x, y, z, 6);
  addCyl(g, 0.01, 0.012, 0.05, toon('#6b4632'), x, y + 0.06, z, 6);
}

function chisel(g, x, y, z, tines) {
  addBox(g, 0.012, 0.07, 0.008, toon('#d5dbe0'), x, y, z);
  for (let i = 0; i < tines; i++) {
    addBox(g, 0.004, 0.02, 0.004, toon('#eef2f4'), x + (i - (tines - 1) / 2) * 0.008, y + 0.042, z);
  }
  addCyl(g, 0.008, 0.008, 0.06, toon('#8a5a38'), x, y - 0.05, z, 6);
}

function clickerBench(g, bench) {
  const maple = toon('#d7b07a');
  const base = toon('#6a4632');
  const x = bench.x;
  const z = bench.z;
  const h = bench.h;
  addBox(g, bench.w, 0.07, bench.d, maple, x, h - 0.035, z);
  const nose = addCyl(g, 0.035, 0.035, bench.w, maple, x, h - 0.02, z + bench.d / 2, 12);
  nose.rotation.z = Math.PI / 2;
  const legH = h - 0.08;
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      addBox(g, 0.07, legH, 0.07, base, x + sx * (bench.w / 2 - 0.1), legH / 2, z + sz * (bench.d / 2 - 0.08));
    }
  }
  addBox(g, bench.w - 0.24, 0.03, bench.d - 0.16, toon('#7a5236'), x, 0.28, z);
  laidHide(g, x - 0.15, 0.32, z, 0.48, 0.28, HIDE[0], 0.1, 0.04);
  laidHide(g, x + 0.12, 0.34, z, 0.36, 0.22, HIDE[3], -0.2, 0.03);
  clickerPress(g, bench);
  laidHide(g, x + 0.55, h + 0.025, z + 0.08, 0.82, 0.58, HIDE[1], 0.18, 0.09);
  laidHide(g, x + 0.62, h + 0.11, z + 0.12, 0.28, 0.18, HIDE[2], -0.6, 0.03);
  roundKnife(g, x + 0.22, h + 0.05, z + 0.18, 0.4);
  maul(g, x + 0.78, h + 0.06, z - 0.12);
  awl(g, x + 0.9, h + 0.08, z + 0.16);
  const mat = addBox(g, 1.35, 0.01, 0.7, toon('#a67c52', { polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 }), x, 0.006, z + bench.d / 2 + 0.42);
  mat.userData.receiveOnly = true;
}

function stitchingPony(g, spec) {
  const root = new THREE.Group();
  root.name = 'stitching-pony';
  root.position.set(spec.x, 0, spec.z);
  root.rotation.y = spec.rot;
  const wood = toon('#8a5a38');
  const dark = toon('#5c3b28');
  const seat = spec.seat;
  addBox(root, 0.28, 0.07, 0.62, wood, 0, seat - 0.03, -0.06);
  const dome = new THREE.Mesh(new THREE.SphereGeometry(0.15, 18, 12, 0, Math.PI * 2, 0, Math.PI / 2), wood);
  dome.scale.set(0.95, 0.42, 1.9);
  dome.position.set(0, seat - 0.01, -0.06);
  dome.castShadow = true;
  root.add(dome);
  const nose = addCyl(root, 0.1, 0.12, 0.16, wood, 0, seat - 0.02, 0.22, 12);
  nose.rotation.x = Math.PI / 2;
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const leg = addBox(root, 0.045, seat - 0.04, 0.045, dark, sx * 0.1, (seat - 0.04) / 2, -0.06 + sz * 0.22);
      leg.rotation.z = sx * -0.08;
      leg.rotation.x = sz * 0.06;
    }
  }
  addBox(root, 0.24, 0.03, 0.04, dark, 0, 0.14, -0.06);
  addBox(root, 0.05, seat + 0.08, 0.05, dark, 0, (seat + 0.08) / 2, 0.28);
  const jawY = spec.jaw;
  const jawWood = toon('#6d4a32');
  const leftJaw = addBox(root, 0.11, 0.16, 0.02, jawWood, -0.045, jawY, 0.3);
  leftJaw.rotation.y = 0.55;
  const rightJaw = addBox(root, 0.11, 0.16, 0.02, jawWood, 0.045, jawY, 0.3);
  rightJaw.rotation.y = -0.55;
  const gusset = hangGeometry(0.1, 0.16, 0.025, 1);
  const gussetGrp = new THREE.Group();
  thickSkin(gussetGrp, gusset, HIDE[1].grain, HIDE[1].flesh, 2, 2);
  gussetGrp.position.set(0, jawY, 0.3);
  root.add(gussetGrp);
  threadAlong(root, [
    [-0.035, jawY - 0.06, 0.32],
    [-0.01, jawY - 0.01, 0.33],
    [0.015, jawY + 0.045, 0.325],
    [0.038, jawY + 0.07, 0.318],
  ], 0.004, '#f6e7c4');
  const screw = addCyl(root, 0.01, 0.01, 0.1, toon('#c6a15a'), 0, jawY, 0.3, 8);
  screw.rotation.x = Math.PI / 2;
  const wing = new THREE.Mesh(new THREE.TorusGeometry(0.028, 0.006, 6, 14), toon('#e2c98a'));
  wing.position.set(0.07, jawY, 0.3);
  wing.rotation.y = Math.PI / 2;
  wing.castShadow = true;
  root.add(wing);
  g.add(root);
}

function ponyTable(g, table) {
  const wood = toon('#7a5236');
  addBox(g, table.w, 0.04, table.d, wood, table.x, table.h - 0.02, table.z);
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      addBox(
        g, 0.035, table.h - 0.04, 0.035, toon('#5c3b28'),
        table.x + sx * (table.w / 2 - 0.04),
        (table.h - 0.04) / 2,
        table.z + sz * (table.d / 2 - 0.04),
      );
    }
  }
  const y = table.h + 0.03;
  for (let i = 0; i < 4; i++) {
    const spool = addCyl(g, 0.018, 0.018, 0.04, toon(['#e6d3a4', '#8d4e2c', '#6e2430', '#2c2826'][i]), table.x - 0.1 + i * 0.05, y + 0.02, table.z + 0.06, 8);
    spool.rotation.z = Math.PI / 2;
  }
  chisel(g, table.x + 0.12, y + 0.06, table.z - 0.06, 2);
  chisel(g, table.x + 0.16, y + 0.07, table.z - 0.02, 4);
  awl(g, table.x - 0.12, y + 0.08, table.z - 0.08);
  const wax = addCyl(g, 0.025, 0.028, 0.03, toon('#e6d39a'), table.x + 0.02, y + 0.015, table.z - 0.08, 10);
  wax.castShadow = true;
}

function burnishStation(g, bench) {
  const top = toon('#c4a36a');
  const base = toon('#5c3b28');
  const x = bench.x;
  const z = bench.z;
  const h = bench.h;
  addBox(g, bench.w, 0.06, bench.d, top, x, h - 0.03, z);
  const nose = addCyl(g, 0.03, 0.03, bench.w, top, x, h - 0.015, z + bench.d / 2, 12);
  nose.rotation.z = Math.PI / 2;
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      addBox(g, 0.06, h - 0.06, 0.06, base, x + sx * (bench.w / 2 - 0.08), (h - 0.06) / 2, z + sz * (bench.d / 2 - 0.07));
    }
  }
  addBox(g, bench.w - 0.2, 0.025, 0.22, toon('#6b4632'), x, 0.32, z);
  const vx = x + 0.48;
  addBox(g, 0.08, 0.1, 0.16, toon('#4a403c'), vx, h + 0.05, z + 0.08);
  addBox(g, 0.06, 0.16, 0.025, toon('#3e444c'), vx - 0.02, h + 0.14, z + 0.12);
  addBox(g, 0.06, 0.16, 0.025, toon('#3e444c'), vx + 0.04, h + 0.14, z + 0.12);
  const strap = hangGeometry(0.07, 0.28, 0.02, 2);
  const strapGrp = new THREE.Group();
  thickSkin(strapGrp, strap, '#6e2430', '#e7d3a8', 2, 3);
  strapGrp.position.set(vx + 0.01, h + 0.2, z + 0.13);
  g.add(strapGrp);
  addBox(g, 0.008, 0.22, 0.012, toon('#f0d7a4'), vx + 0.045, h + 0.2, z + 0.14);
  const screw = addCyl(g, 0.012, 0.012, 0.08, toon('#c6a15a'), vx + 0.01, h + 0.16, z + 0.18, 8);
  screw.rotation.x = Math.PI / 2;
  const wheel = addCyl(g, 0.09, 0.09, 0.045, toon('#d7c7a4'), x - 0.42, h + 0.1, z - 0.02, 20);
  wheel.rotation.z = Math.PI / 2;
  addCyl(g, 0.02, 0.02, 0.08, toon('#5c3b28'), x - 0.42, h + 0.1, z - 0.02, 8).rotation.z = Math.PI / 2;
  const crank = new THREE.Mesh(new THREE.TorusGeometry(0.04, 0.008, 6, 12), toon('#3e444c'));
  crank.position.set(x - 0.42, h + 0.1, z + 0.08);
  crank.castShadow = true;
  g.add(crank);
  for (let i = 0; i < 3; i++) {
    addCyl(g, 0.018, 0.02, 0.07, toon(['#1d4e8f', '#6e2430', '#1c1a18'][i]), x - 0.12 + i * 0.06, h + 0.04, z - 0.16, 8);
  }
}

function hardwareCabinet(g, cab) {
  const carc = toon('#5c3b28');
  const face = toon('#7a5236');
  addBox(g, cab.w, cab.h, cab.d, carc, cab.x, cab.h / 2, cab.z);
  const labels = ['BUCKLE', 'RIVET', 'SNAP', 'RING'];
  const open = { 1: 0.22, 2: 0.14 };
  const rowH = (cab.h - 0.12) / 4;
  for (let i = 0; i < 4; i++) {
    const pull = open[i] || 0;
    const y = 0.08 + rowH * (i + 0.5);
    const z = cab.z + pull / 2;
    addBox(g, cab.w - 0.06, rowH - 0.025, cab.d - 0.04, face, cab.x, y, z);
    const plate = addMesh(
      g,
      new THREE.PlaneGeometry(0.22, 0.045),
      labelMaterial(labels[i]),
      cab.x - 0.28,
      y,
      z + cab.d / 2 + pull * 0.15,
    );
    plate.position.z = cab.z + cab.d / 2 - 0.02 + pull;
    if (pull) {
      const trayZ = cab.z + cab.d / 2 + pull * 0.35;
      const trayY = y + 0.02;
      if (i === 1) {
        for (let k = 0; k < 5; k++) buckle(g, cab.x - 0.28 + k * 0.1, trayY, trayZ, 0.85);
      } else {
        for (let k = 0; k < 4; k++) {
          dRing(g, cab.x - 0.22 + k * 0.12, trayY, trayZ);
          rivet(g, cab.x - 0.18 + k * 0.12, trayY, trayZ - 0.04, '#c6b8a2');
        }
      }
    }
  }
  hoboBag(g, cab.x + 0.15, cab.h, cab.z + 0.02, -0.4, HIDE[0]);
}

function nicheSamples(g, niche) {
  const plaster = toon('#f3eadf');
  const frame = toon('#4a3024');
  const x = niche.x;
  const z = niche.z;
  const archR = niche.w / 2;
  const spring = niche.h - archR;
  addBox(g, niche.w, spring, 0.06, plaster, x, spring / 2, z);
  const arch = new THREE.Mesh(new THREE.TorusGeometry(archR, 0.045, 8, 18, Math.PI), frame);
  arch.position.set(x, spring, z);
  arch.castShadow = true;
  g.add(arch);
  const glow = addBox(g, niche.w - 0.16, niche.h - 0.28, 0.02, toon('#f6e2c4', { emissive: '#f8e6cc', emissiveIntensity: 0.45 }), x, niche.h * 0.48, z + 0.02);
  glow.userData.noShadow = true;
  addBox(g, niche.w - 0.2, 0.04, 0.22, toon('#6b4632'), x, 1.12, z + 0.16);
  addBox(g, niche.w - 0.2, 0.035, 0.2, toon('#6b4632'), x, 1.62, z + 0.14);
  toteBag(g, x - 0.32, 1.12, z + 0.16, 0.3, HIDE[1]);
  flapBag(g, x + 0.28, 1.12, z + 0.18, -0.4, HIDE[3]);
  hoboBag(g, x + 0.05, 1.62, z + 0.12, 0.5, HIDE[2]);
  for (let i = 0; i < 3; i++) {
    addBox(g, 0.12, 0.018, 0.08, leatherMat(HIDE[i].grain, 2, 2), x - 0.28 + i * 0.16, 1.66, z + 0.2);
  }
}

function hangingHides(g, spec) {
  const iron = toon('#4a403c');
  const span = spec.z1 - spec.z0;
  const rail = addCyl(g, 0.018, 0.018, span, iron, spec.x, spec.y, (spec.z0 + spec.z1) / 2, 10);
  rail.rotation.x = Math.PI / 2;
  for (const z of [spec.z0 + 0.15, (spec.z0 + spec.z1) / 2, spec.z1 - 0.15]) {
    spar(g, spec.x - 0.16, spec.y, z, spec.x, spec.y, z, 0.012, iron, 6);
  }
  const hides = [
    { z: spec.z0 + 0.42, w: 0.78, h: 1.7, tone: HIDE[0], seed: 0.4 },
    { z: spec.z0 + 1.15, w: 0.7, h: 1.55, tone: HIDE[1], seed: 1.1 },
    { z: spec.z0 + 1.85, w: 0.84, h: 1.68, tone: HIDE[2], seed: 1.8 },
    { z: spec.z1 - 0.35, w: 0.66, h: 1.48, tone: HIDE[3], seed: 2.4 },
  ];
  for (const h of hides) {
    const hook = new THREE.Mesh(new THREE.TorusGeometry(0.03, 0.006, 6, 10), iron);
    hook.position.set(spec.x + 0.02, spec.y - 0.02, h.z);
    hook.rotation.y = Math.PI / 2;
    hook.castShadow = true;
    g.add(hook);
    hangHide(g, spec.x + 0.06, spec.y - 0.04, h.z, h.w, h.h, h.tone, h.seed);
  }
}

function toolPegs(g) {
  const z = -4.16;
  const x0 = -3.55;
  addBox(g, 0.04, 0.62, 0.04, toon('#4a3024'), x0, 1.45, z);
  addBox(g, 0.04, 0.62, 0.04, toon('#4a3024'), x0 + 0.85, 1.45, z);
  addBox(g, 0.9, 0.03, 0.03, toon('#6b4632'), x0 + 0.42, 1.7, z + 0.02);
  roundKnife(g, x0 + 0.12, 1.64, z + 0.08, 0.4);
  maul(g, x0 + 0.32, 1.6, z + 0.08);
  awl(g, x0 + 0.5, 1.66, z + 0.08);
  chisel(g, x0 + 0.68, 1.62, z + 0.08, 4);
}

function offcutBin(g, spec) {
  const wood = toon('#6b4632');
  addBox(g, 0.46, 0.28, 0.36, wood, spec.x, 0.14, spec.z);
  addBox(g, 0.4, 0.02, 0.3, toon('#8a5a38'), spec.x, 0.02, spec.z);
  for (let i = 0; i < 5; i++) {
    const scrap = laidHide(
      g,
      spec.x + ((i % 3) - 1) * 0.08,
      0.28 + (i % 2) * 0.02,
      spec.z + ((i % 2) - 0.5) * 0.06,
      0.16 + (i % 3) * 0.02,
      0.1,
      HIDE[i % 4],
      i * 0.5,
    );
    scrap.rotation.z = (i - 2) * 0.15;
  }
}

function patternRack(g, spec) {
  const wood = toon('#d8c7a6');
  addBox(g, 0.5, 0.04, 0.32, toon('#6b4632'), spec.x, 0.72, spec.z);
  addBox(g, 0.04, 0.72, 0.04, toon('#5c3b28'), spec.x - 0.2, 0.36, spec.z);
  addBox(g, 0.04, 0.72, 0.04, toon('#5c3b28'), spec.x + 0.2, 0.36, spec.z);
  for (let i = 0; i < 3; i++) {
    const card = addMesh(g, new THREE.PlaneGeometry(0.16, 0.22), wood, spec.x - 0.12 + i * 0.12, 0.86, spec.z);
    card.rotation.x = -0.5;
    card.rotation.y = (i - 1) * 0.08;
    const curve = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.004, 4, 10, Math.PI), toon('#8d4e2c'));
    curve.position.set(spec.x - 0.12 + i * 0.12, 0.9, spec.z + 0.02);
    curve.rotation.x = -0.5;
    g.add(curve);
  }
}

function pegSamples(g, spec) {
  addBox(g, 0.7, 0.04, 0.04, toon('#4a3024'), spec.x, spec.y, spec.z);
  flapBag(g, spec.x - 0.18, spec.y - 0.28, spec.z + 0.06, 0.2, HIDE[0]);
  coilBelt(g, spec.x + 0.22, spec.y - 0.12, spec.z + 0.08, '#8d4e2c');
}

function pendantCords(g, layout) {
  const H = layout.meta.room.height;
  const cord = toon('#4a403c');
  for (const inst of layout.instances) {
    if (inst.kind !== 'pendant_lamp') continue;
    const [x, y, z] = inst.position;
    const top = y + layout.assets.pendant_lamp.targetHeight;
    addCyl(g, 0.006, 0.006, Math.max(0.05, H - top), cord, x, (H + top) / 2, z, 6);
  }
}

function makeShell(layout) {
  const g = new THREE.Group();
  g.name = 'shell';
  const { width: W, depth: D, height: H } = layout.meta.room;
  const s = layout.shell;
  const plaster = toon(s.wallColor);
  const wainscot = toon(s.wainscotColor);
  const beamMat = toon(s.beamColor);
  const ceilMat = toon(s.ceilingColor);

  const floor = new THREE.Mesh(new THREE.BoxGeometry(W, 0.08, D), toon(s.floorColor, { map: floorTexture(s.floorRepeat || [4, 8]) }));
  floor.position.y = -0.04;
  floor.receiveShadow = true;
  floor.castShadow = false;
  floor.userData.receiveOnly = true;
  g.add(floor);

  addBox(g, W, H, 0.14, plaster, 0, H / 2, -D / 2);
  addBox(g, W - 0.2, 1.02, 0.03, wainscot, 0, 0.51, -D / 2 + 0.08);
  addBox(g, W - 0.2, 0.045, 0.05, toon(s.woodColor), 0, 1.04, -D / 2 + 0.09);

  const win = layout.zones.window;
  const wallT = 0.14;
  const xWall = -W / 2;
  const z0 = win.z - win.w / 2;
  const z1 = win.z + win.w / 2;
  const y0 = win.y - win.h / 2;
  const y1 = win.y + win.h / 2;
  const southLen = D / 2 - z1;
  const northLen = z0 + D / 2;
  addBox(g, wallT, H, southLen, plaster, xWall, H / 2, (D / 2 + z1) / 2);
  addBox(g, wallT, H, northLen, plaster, xWall, H / 2, (-D / 2 + z0) / 2);
  addBox(g, wallT, y0, win.w, plaster, xWall, y0 / 2, win.z);
  addBox(g, wallT, H - y1, win.w, plaster, xWall, (H + y1) / 2, win.z);
  addBox(g, 0.08, 1.02, northLen, wainscot, xWall + 0.1, 0.51, (-D / 2 + z0) / 2);
  addBox(g, 0.08, 1.02, southLen, wainscot, xWall + 0.1, 0.51, (D / 2 + z1) / 2);
  addBox(g, 0.06, Math.min(1.02, y0), win.w, wainscot, xWall + 0.08, Math.min(1.02, y0) / 2, win.z);

  const sky = addBox(
    g, 0.02, win.h - 0.08, win.w - 0.1,
    toon('#d5e4f0', { emissive: '#e4f0f8', emissiveIntensity: 0.62 }),
    xWall - 0.04, win.y, win.z,
  );
  sky.userData.noShadow = true;
  addBox(g, 0.08, win.h, 0.06, toon(s.beamColor), xWall + 0.04, win.y, z0);
  addBox(g, 0.08, win.h, 0.06, toon(s.beamColor), xWall + 0.04, win.y, z1);
  addBox(g, 0.1, 0.06, win.w, toon(s.woodColor), xWall + 0.08, y0, win.z);
  addBox(g, 0.05, win.h - 0.1, 0.035, toon(s.beamColor), xWall + 0.05, win.y, win.z - win.w * 0.22);
  addBox(g, 0.05, win.h - 0.1, 0.035, toon(s.beamColor), xWall + 0.05, win.y, win.z + win.w * 0.18);
  addBox(g, 0.05, 0.035, win.w - 0.12, toon(s.beamColor), xWall + 0.05, win.y, win.z);

  const ceil = addBox(g, W * 0.98, 0.08, D * 0.62, ceilMat, 0, H - 0.04, -D * 0.16);
  ceil.castShadow = false;
  addBox(g, W - 0.8, 0.16, 0.22, beamMat, -0.2, H - 0.28, -0.15);
  addBox(g, 0.16, H - 0.2, 0.16, beamMat, -5.15, (H - 0.2) / 2, 2.55);

  const threshold = addBox(g, W * 0.72, 0.04, 0.12, toon('#4a3024'), -0.4, 0.02, D / 2 - 0.12);
  threshold.userData.receiveOnly = true;
  return g;
}

function makeProcedural(layout) {
  const g = new THREE.Group();
  g.name = 'leathercraft';
  const zones = layout.zones;
  clickerBench(g, zones.clicker);
  stitchingPony(g, zones.pony);
  ponyTable(g, zones.ponyTable);
  burnishStation(g, zones.burnish);
  hardwareCabinet(g, zones.cabinet);
  nicheSamples(g, zones.niche);
  hangingHides(g, zones.hides);
  toolPegs(g);
  offcutBin(g, zones.offcuts);
  patternRack(g, zones.patterns);
  pegSamples(g, zones.samplesPeg);
  pendantCords(g, layout);
  return g;
}

boot({
  makeShell,
  makeProcedural,
  readyText: 'ready — leathercraft atelier · drag orbit · U unlit · T toon',
});
