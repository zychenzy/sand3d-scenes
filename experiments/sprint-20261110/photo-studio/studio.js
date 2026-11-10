import * as THREE from 'three';
import { boot, toon, addBox, addCyl } from './scene_lib.js';

const MATS = new Map();
function M(color, opts) {
  const key = color + '|' + (opts ? JSON.stringify(opts) : '');
  if (!MATS.has(key)) MATS.set(key, toon(color, opts));
  return MATS.get(key);
}

const PAPER_OPTS = { side: THREE.DoubleSide, shadowSide: THREE.DoubleSide };

function markNoCast(root) {
  root.traverse((o) => {
    if (o.isMesh) o.userData.noCast = true;
  });
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

function surface(g, segU, segV, sample, mat, noCast = false) {
  const positions = [];
  const normals = [];
  for (let j = 0; j <= segV; j++) {
    for (let i = 0; i <= segU; i++) {
      const { p, n } = sample(i / segU, j / segV);
      positions.push(p[0], p[1], p[2]);
      const nn = new THREE.Vector3(n[0], n[1], n[2]).normalize();
      normals.push(nn.x, nn.y, nn.z);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  const idx = [];
  const cols = segU + 1;
  for (let j = 0; j < segV; j++) {
    for (let i = 0; i < segU; i++) {
      const a = j * cols + i;
      idx.push(a, a + cols, a + 1, a + 1, a + cols, a + cols + 1);
    }
  }
  // Quad strips are not consistently wound against the analytic normal.
  // DoubleSide flips the normal on a back face, which drops the cove into
  // the darkest toon band even though the authored normal faces the room.
  const ax = positions[idx[0] * 3], ay = positions[idx[0] * 3 + 1], az = positions[idx[0] * 3 + 2];
  const bx = positions[idx[1] * 3], by = positions[idx[1] * 3 + 1], bz = positions[idx[1] * 3 + 2];
  const cx = positions[idx[2] * 3], cy = positions[idx[2] * 3 + 1], cz = positions[idx[2] * 3 + 2];
  const ux = bx - ax, uy = by - ay, uz = bz - az;
  const vx = cx - ax, vy = cy - ay, vz = cz - az;
  const faceDot =
    (uy * vz - uz * vy) * normals[idx[0] * 3] +
    (uz * vx - ux * vz) * normals[idx[0] * 3 + 1] +
    (ux * vy - uy * vx) * normals[idx[0] * 3 + 2];
  if (faceDot < 0) {
    for (let k = 0; k < idx.length; k += 3) {
      const tmp = idx[k];
      idx[k] = idx[k + 1];
      idx[k + 1] = tmp;
    }
  }
  geo.setIndex(idx);
  const mesh = new THREE.Mesh(geo, mat);
  mesh.castShadow = !noCast;
  mesh.receiveShadow = true;
  if (noCast) mesh.userData.noCast = true;
  g.add(mesh);
  return mesh;
}

function contact(g, x, z, rx, rz, color, opacity, y = 0.014) {
  const mesh = new THREE.Mesh(
    new THREE.CircleGeometry(1, 14),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false })
  );
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set(x, y, z);
  mesh.scale.set(rx, rz, 1);
  mesh.userData.contact = true;
  g.add(mesh);
  return mesh;
}

function placeAimed(g, mount, target, obj) {
  obj.position.set(mount[0], mount[1], mount[2]);
  g.add(obj);
  obj.lookAt(target[0], target[1], target[2]);
  return obj;
}

function glowToward(g, mount, target, intensity, distance, color = '#fff1dc') {
  const m = new THREE.Vector3(...mount);
  const t = new THREE.Vector3(...target);
  const p = m.clone().lerp(t, 0.42);
  const pl = new THREE.PointLight(color, intensity, distance, 2);
  pl.position.copy(p);
  g.add(pl);
  return pl;
}

function metrics(layout) {
  const { width: W, depth: D, height: H } = layout.meta.room;
  const s = layout.studio;
  const backZ = -D / 2 + 0.08;
  const leftX = -W / 2 + 0.08;
  const paperZ = backZ + 0.05;
  const paperX = leftX + 0.05;
  const R = s.coveRadius;
  const xRight = s.coveRight;
  const zFront = s.coveFront;
  const paperTop = s.paperTop;
  const cx = paperX + R;
  const cz = paperZ + R;
  return {
    W, D, H, backZ, leftX, paperZ, paperX, R, xRight, zFront, paperTop, cx, cz,
    subjectX: (cx + xRight) / 2,
    subjectZ: (cz + zFront) / 2,
  };
}

function byId(layout, id) {
  const inst = (layout.instances || []).find((i) => i.id === id);
  if (!inst) throw new Error('missing instance ' + id);
  return inst;
}

function trussRun(g, from, to, section = 0.16) {
  const a = new THREE.Vector3(...from);
  const b = new THREE.Vector3(...to);
  const axis = b.clone().sub(a);
  const len = axis.length();
  if (len < 0.05) return;
  axis.normalize();
  const helper = Math.abs(axis.y) > 0.85 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0);
  const side = new THREE.Vector3().crossVectors(axis, helper).normalize();
  const bin = new THREE.Vector3().crossVectors(axis, side).normalize();
  const h = section / 2;
  const corners = [0, 1, 2, 3].map((k) => {
    const sx = k === 0 || k === 3 ? 1 : -1;
    const sy = k === 0 || k === 1 ? 1 : -1;
    return side.clone().multiplyScalar(sx * h).add(bin.clone().multiplyScalar(sy * h));
  });
  const chord = M('#6a717b');
  const brace = M('#41464e');
  for (const c of corners) addRod(g, a.clone().add(c), b.clone().add(c), 0.011, chord, 5);
  const n = Math.max(1, Math.round(len / 0.5));
  for (let i = 0; i <= n; i++) {
    const p = a.clone().lerp(b, i / n);
    for (let k = 0; k < 4; k++) {
      addRod(g, p.clone().add(corners[k]), p.clone().add(corners[(k + 1) % 4]), 0.007, brace, 4);
    }
    if (i < n) {
      const p2 = a.clone().lerp(b, (i + 1) / n);
      addRod(g, p.clone().add(corners[0]), p2.clone().add(corners[2]), 0.006, brace, 4);
      addRod(g, p.clone().add(corners[1]), p2.clone().add(corners[3]), 0.006, brace, 4);
    }
  }
}

function sandbag(g, x, y, z, rot = 0.4) {
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(0.15, 10, 8), M('#3a342c'));
  mesh.scale.set(1.25, 0.48, 0.82);
  mesh.position.set(x, y, z);
  mesh.rotation.y = rot;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  g.add(mesh);
  addBox(g, 0.22, 0.012, 0.04, M('#2a2622'), x, y + 0.02, z);
  return mesh;
}

function softboxRect(w, h, depth) {
  const g = new THREE.Group();
  const shell = M('#17181b');
  const rim = M('#3c4148');
  const silver = M('#c5cacf');
  const faceMat = M('#fff3e0', { emissive: '#ffe3b8', emissiveIntensity: 0.78, side: THREE.DoubleSide });
  addCyl(g, 0.05, 0.068, 0.045, rim, 0, 0, -0.02, 12);
  const corners = [[w / 2, h / 2], [w / 2, -h / 2], [-w / 2, h / 2], [-w / 2, -h / 2]];
  for (const [x, y] of corners) addRod(g, [0, 0, -0.02], [x, y, -depth], 0.007, shell, 5);
  addBox(g, w * 0.72, h * 0.72, depth * 0.55, shell, 0, 0, -depth * 0.42);
  addBox(g, w * 0.58, h * 0.58, 0.015, silver, 0, 0, -depth * 0.72);
  const face = addBox(g, w * 0.96, h * 0.96, 0.018, faceMat, 0, 0, -depth);
  face.name = 'softbox-face';
  addBox(g, w + 0.03, 0.016, 0.03, shell, 0, h / 2, -depth);
  addBox(g, w + 0.03, 0.016, 0.03, shell, 0, -h / 2, -depth);
  addBox(g, 0.016, h, 0.03, shell, w / 2, 0, -depth);
  addBox(g, 0.016, h, 0.03, shell, -w / 2, 0, -depth);
  const bars = M('#121316');
  for (let i = -1; i <= 1; i++) addBox(g, w * 0.9, 0.007, 0.01, bars, 0, i * h * 0.22, -depth - 0.012);
  for (let i = -1; i <= 1; i++) addBox(g, 0.007, h * 0.9, 0.01, bars, i * w * 0.22, 0, -depth - 0.016);
  markNoCast(g);
  return g;
}

function softboxOcta(diameter, depth) {
  const g = new THREE.Group();
  const shellMat = toon('#17181b', { side: THREE.DoubleSide });
  const cone = new THREE.Mesh(
    new THREE.CylinderGeometry(diameter / 2, diameter * 0.18, depth, 8, 1, true),
    shellMat
  );
  cone.rotation.x = -Math.PI / 2;
  cone.position.z = -depth / 2;
  cone.castShadow = true;
  cone.receiveShadow = true;
  g.add(cone);
  addCyl(g, 0.05, 0.07, 0.04, M('#3c4148'), 0, 0, -0.02, 12);
  const face = new THREE.Mesh(
    new THREE.CircleGeometry(diameter * 0.47, 8),
    M('#fff6ea', { emissive: '#ffe6c0', emissiveIntensity: 0.75, side: THREE.DoubleSide })
  );
  face.position.z = -depth;
  face.rotation.y = Math.PI;
  face.name = 'softbox-face';
  g.add(face);
  const n = 8;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    addRod(
      g,
      [0, 0, -0.02],
      [Math.cos(a) * diameter * 0.48, Math.sin(a) * diameter * 0.48, -depth],
      0.006,
      M('#17181b'),
      4
    );
  }
  markNoCast(g);
  return g;
}

function knuckle(g, pos) {
  addCyl(g, 0.038, 0.038, 0.028, M('#2a2e33'), pos[0], pos[1], pos[2], 10);
  addCyl(g, 0.012, 0.012, 0.05, M('#c5cad0'), pos[0], pos[1], pos[2], 8);
}

function cStand(g, x, z, rotY, columnH) {
  const grp = new THREE.Group();
  grp.position.set(x, 0, z);
  grp.rotation.y = rotY;
  const metal = M('#2c3036');
  const collar = M('#d0d4d8');
  const foot = M('#1a1c1e');
  const legs = [
    { a: 0.2, len: 0.72 },
    { a: 2.35, len: 0.42 },
    { a: 4.0, len: 0.44 },
  ];
  for (const leg of legs) {
    const x1 = Math.sin(leg.a) * leg.len;
    const z1 = Math.cos(leg.a) * leg.len;
    addRod(grp, [0, 0.08, 0], [x1, 0.028, z1], 0.013, metal, 6);
    addBox(grp, 0.055, 0.018, 0.09, foot, x1, 0.012, z1);
  }
  const h1 = Math.min(1.05, columnH * 0.58);
  addCyl(grp, 0.02, 0.022, h1, metal, 0, 0.08 + h1 / 2, 0, 10);
  addCyl(grp, 0.034, 0.036, 0.04, collar, 0, 0.08 + h1, 0, 10);
  const h2 = Math.max(0.25, columnH - h1);
  addCyl(grp, 0.013, 0.015, h2, metal, 0, 0.08 + h1 + h2 / 2, 0, 8);
  addCyl(grp, 0.03, 0.032, 0.035, collar, 0, 0.08 + columnH, 0, 10);
  g.add(grp);
  const la = 0.2;
  const localX = Math.sin(la) * 0.42;
  const localZ = Math.cos(la) * 0.42;
  const wx = x + localX * Math.cos(rotY) + localZ * Math.sin(rotY);
  const wz = z - localX * Math.sin(rotY) + localZ * Math.cos(rotY);
  sandbag(g, wx, 0.09, wz, rotY);
  return { top: [x, 0.08 + columnH, z] };
}

function tripodStand(g, x, z, height) {
  const metal = M('#34383e');
  const collar = M('#d0d4d8');
  for (let i = 0; i < 3; i++) {
    const a = i * (Math.PI * 2 / 3) + 0.4;
    const reach = 0.34;
    const foot = [x + Math.sin(a) * reach, 0.02, z + Math.cos(a) * reach];
    addRod(g, foot, [x, 0.48, z], 0.011, metal, 6);
    addRod(g, [x + Math.sin(a) * reach * 0.45, 0.16, z + Math.cos(a) * reach * 0.45], [x, 0.22, z], 0.006, M('#2a2e33'), 4);
    addCyl(g, 0.02, 0.024, 0.015, M('#1a1c1e'), foot[0], 0.01, foot[2], 8);
  }
  addCyl(g, 0.016, 0.018, height * 0.55, metal, x, 0.48 + height * 0.275, z, 8);
  addCyl(g, 0.028, 0.03, 0.035, collar, x, 0.48 + height * 0.55, z, 8);
  const upper = height * 0.45;
  addCyl(g, 0.011, 0.013, upper, metal, x, 0.48 + height * 0.55 + upper / 2, z, 8);
  return { top: [x, 0.48 + height, z] };
}

function boomTo(g, from, to) {
  addRod(g, from, to, 0.012, M('#2c3036'), 6);
  knuckle(g, from);
  knuckle(g, to);
}

function rigLight(g, spec) {
  const stand = spec.kind === 'tripod'
    ? tripodStand(g, spec.base[0], spec.base[1], spec.column)
    : cStand(g, spec.base[0], spec.base[1], spec.rotY || 0, spec.column);
  boomTo(g, stand.top, spec.mount);
  const box = spec.octa
    ? softboxOcta(spec.w, spec.depth)
    : softboxRect(spec.w, spec.h, spec.depth);
  placeAimed(g, spec.mount, spec.aim, box);
  glowToward(g, spec.mount, spec.aim, spec.glow, spec.range, spec.color || '#fff1dc');
}

function buildCove(g, m) {
  const paper = M('#f4f0e8', PAPER_OPTS);
  const { R, cx, cz, paperZ, paperX, xRight, zFront, paperTop } = m;
  surface(g, 26, 12, (u, v) => {
    const phi = v * Math.PI / 2;
    const x = cx + (u - 0.01) * (xRight - cx + 0.02);
    return {
      p: [x, R * (1 - Math.sin(phi)), paperZ + R * (1 - Math.cos(phi))],
      n: [0, Math.sin(phi), Math.cos(phi)],
    };
  }, paper, true);
  surface(g, 18, 12, (u, v) => {
    const phi = v * Math.PI / 2;
    const z = cz + (u - 0.01) * (zFront - cz + 0.02);
    return {
      p: [paperX + R * (1 - Math.cos(phi)), R * (1 - Math.sin(phi)), z],
      n: [Math.cos(phi), Math.sin(phi), 0],
    };
  }, paper, true);
  surface(g, 14, 8, (u, v) => {
    const a = u * Math.PI / 2;
    const y = R + v * (paperTop - R);
    return {
      p: [cx - R * Math.sin(a), y, cz - R * Math.cos(a)],
      n: [Math.sin(a), 0, Math.cos(a)],
    };
  }, paper, true);
  surface(g, 14, 12, (u, v) => {
    const a = u * Math.PI / 2;
    const phi = v * Math.PI / 2;
    const cphi = Math.cos(phi);
    return {
      p: [
        cx - R * Math.sin(a) * cphi,
        R * (1 - Math.sin(phi)),
        cz - R * Math.cos(a) * cphi,
      ],
      n: [Math.sin(a) * cphi, Math.sin(phi), Math.cos(a) * cphi],
    };
  }, paper, true);

  const wallH = paperTop - R + 0.04;
  const backWall = addBox(g, xRight - cx, wallH, 0.03, paper, (cx + xRight) / 2, R + wallH / 2 - 0.02, paperZ - 0.01);
  const sideD = zFront - cz;
  const sideWall = addBox(g, 0.03, wallH, sideD, paper, paperX - 0.01, R + wallH / 2 - 0.02, cz + sideD / 2);
  backWall.userData.noCast = true;
  sideWall.userData.noCast = true;

  const floorW = xRight - cx + 0.08;
  const floorD = zFront - cz + 0.06;
  const floor = addBox(
    g, floorW, 0.018, floorD, paper,
    (cx + xRight) / 2, 0.009,
    (cz + zFront) / 2
  );
  floor.userData.noCast = true;

  const edge = M('#e4dcd0');
  addBox(g, 0.035, paperTop, 0.05, edge, xRight + 0.01, paperTop / 2, paperZ + 0.01);
  addBox(g, xRight - cx, 0.09, 0.035, M('#1c1d20'), (cx + xRight) / 2, 0.045, zFront + 0.02);

  const seam = M('#e3dbd0');
  for (const t of [0.34, 0.67]) {
    const x = cx + (xRight - cx) * t;
    addBox(g, 0.008, paperTop - R, 0.008, seam, x, (paperTop + R) / 2, paperZ + 0.012);
    addBox(g, 0.008, 0.006, zFront - cz, seam, x, 0.02, (cz + zFront) / 2);
  }

  const clamp = M('#222428');
  for (let x = cx + 0.35; x < xRight - 0.1; x += 0.85) {
    addBox(g, 0.06, 0.04, 0.05, clamp, x, paperTop - 0.02, paperZ + 0.02);
    addCyl(g, 0.01, 0.01, 0.02, M('#b7bcc2'), x, paperTop + 0.01, paperZ + 0.03, 6);
  }
}

function buildRails(g, m) {
  const rig = new THREE.Group();
  const steel = M('#5d636c');
  const dark = M('#2a2e33');
  const y = 3.08;
  const z = m.paperZ + 0.2;
  const x0 = m.cx + 0.25;
  const x1 = m.xRight - 0.15;
  const rail = addCyl(rig, 0.018, 0.018, x1 - x0, steel, (x0 + x1) / 2, y, z, 8);
  rail.rotation.z = Math.PI / 2;
  const span = x1 - x0;
  const n = 5;
  for (let i = 0; i <= n; i++) {
    const x = x0 + (span * i) / n;
    addBox(rig, 0.025, 0.08, 0.04, dark, x, y + 0.02, m.paperZ + 0.08);
    addRod(rig, [x, y, z], [x, m.H - 0.12, m.paperZ + 0.02], 0.008, steel, 5);
  }
  const rolls = [
    { t: 0.12, r: 0.11, c: '#f7f4ee', y: 2.78 },
    { t: 0.38, r: 0.135, c: '#8e8a84', y: 2.9 },
    { t: 0.62, r: 0.12, c: '#1d1e22', y: 2.92 },
    { t: 0.86, r: 0.115, c: '#3d5e86', y: 2.9 },
  ];
  for (const roll of rolls) {
    const x = x0 + span * roll.t;
    addBox(rig, 0.08, 0.05, 0.06, dark, x, y - 0.02, z);
    addCyl(rig, 0.016, 0.016, 0.05, steel, x - 0.22, y - 0.08, z + 0.02, 6);
    addCyl(rig, 0.016, 0.016, 0.05, steel, x + 0.22, y - 0.08, z + 0.02, 6);
    const paper = addCyl(rig, roll.r, roll.r, 0.5, M(roll.c), x, roll.y, z + 0.06, 14);
    paper.rotation.z = Math.PI / 2;
    const core = addCyl(rig, 0.04, 0.04, 0.58, M('#c6a67c'), x, roll.y, z + 0.06, 8);
    core.rotation.z = Math.PI / 2;
    addRod(rig, [x - 0.2, y - 0.04, z], [x - 0.2, roll.y, z + 0.06], 0.008, dark, 4);
    addRod(rig, [x + 0.2, y - 0.04, z], [x + 0.2, roll.y, z + 0.06], 0.008, dark, 4);
  }
  const tail = M('#f7f4ee');
  const whiteX = x0 + span * 0.12;
  addBox(rig, 0.5, 0.22, 0.012, tail, whiteX, m.paperTop + 0.08, m.paperZ + 0.03);
  g.add(rig);
  markNoCast(rig);
}

function buildGoalpost(g, m) {
  const rig = new THREE.Group();
  const y = 3.18;
  const z = m.zFront + 0.22;
  const xL = m.subjectX - 2.02;
  const xR = m.subjectX + 2.02;
  trussRun(rig, [xL, 0.04, z], [xL, y, z]);
  trussRun(rig, [xR, 0.04, z], [xR, y, z]);
  trussRun(rig, [xL, y, z], [xR, y, z]);
  trussRun(rig, [m.subjectX, y, z], [m.subjectX, y, m.subjectZ - 0.15]);
  const plate = M('#2e3238');
  addBox(rig, 0.32, 0.02, 0.32, plate, xL, 0.01, z);
  addBox(rig, 0.32, 0.02, 0.32, plate, xR, 0.01, z);
  g.add(rig);
  markNoCast(rig);
  sandbag(g, xL + 0.12, 0.09, z + 0.08, 0.2);
  sandbag(g, xR - 0.1, 0.09, z + 0.1, 1.1);
  const aim = [m.subjectX, 1.15, m.subjectZ];
  const mount = [m.subjectX, y - 0.48, m.subjectZ - 0.05];
  addRod(g, [m.subjectX - 0.12, y - 0.08, mount[2]], mount, 0.01, M('#2c3036'), 5);
  addRod(g, [m.subjectX + 0.12, y - 0.08, mount[2]], mount, 0.01, M('#2c3036'), 5);
  placeAimed(g, mount, aim, softboxOcta(0.82, 0.3));
  glowToward(g, mount, aim, 1.15, 5.5, '#fff4e2');
  parCan(g, m.subjectX - 0.85, y - 0.16, z - 0.05, [m.subjectX - 0.2, 1.3, m.subjectZ]);
  parCan(g, m.subjectX + 0.85, y - 0.16, z - 0.05, [m.subjectX + 0.15, 1.2, m.subjectZ]);
}

function parCan(g, x, y, z, aim) {
  const grp = new THREE.Group();
  const body = addCyl(grp, 0.055, 0.078, 0.12, M('#16171a'), 0, 0, -0.06, 10);
  body.rotation.x = -Math.PI / 2;
  const lens = new THREE.Mesh(
    new THREE.CircleGeometry(0.06, 12),
    M('#ffe7c6', { emissive: '#ffd7a2', emissiveIntensity: 0.9, side: THREE.DoubleSide })
  );
  lens.position.z = -0.125;
  lens.rotation.y = Math.PI;
  grp.add(lens);
  addBox(grp, 0.04, 0.03, 0.04, M('#2a2e33'), 0, 0.06, -0.02);
  placeAimed(g, [x, y, z], aim, grp);
  markNoCast(grp);
  glowToward(g, [x, y, z], aim, 0.7, 4.2, '#fff0d2');
}

function buildLights(g, m) {
  const sx = m.subjectX;
  const sz = m.subjectZ;
  rigLight(g, {
    kind: 'cstand',
    base: [sx - 1.55, sz + 0.62],
    rotY: 0.9,
    column: 1.65,
    mount: [sx - 0.72, 2.12, sz + 0.18],
    aim: [sx + 0.05, 1.25, sz],
    w: 0.7,
    h: 0.7,
    depth: 0.32,
    glow: 1.5,
    range: 6.2,
  });
  rigLight(g, {
    kind: 'tripod',
    base: [sx + 1.45, sz + 0.72],
    column: 1.05,
    mount: [sx + 0.78, 1.52, sz + 0.28],
    aim: [sx, 1.15, sz],
    w: 0.52,
    h: 0.52,
    depth: 0.26,
    glow: 0.7,
    range: 5.2,
    color: '#f4f7ff',
  });
  rigLight(g, {
    kind: 'tripod',
    base: [sx + 1.25, sz - 0.62],
    column: 0.95,
    mount: [sx + 0.72, 1.68, sz - 0.38],
    aim: [sx + 0.05, 1.4, sz + 0.05],
    w: 0.24,
    h: 0.72,
    depth: 0.22,
    glow: 0.9,
    range: 4.2,
  });
  const pack = M('#2a2d31');
  const px = sx - 1.7;
  const pz = sz + 0.95;
  addBox(g, 0.28, 0.16, 0.2, pack, px, 0.08, pz);
  addBox(g, 0.22, 0.02, 0.06, M('#3a3e44'), px, 0.17, pz);
  addBox(g, 0.03, 0.02, 0.02, M('#c4473a', { emissive: '#ff5a48', emissiveIntensity: 0.6 }), px + 0.08, 0.175, pz + 0.02);
  addCyl(g, 0.012, 0.012, 0.08, M('#1a1c1e'), px - 0.08, 0.2, pz, 6);
}

function buildDolly(g, m) {
  const x = m.subjectX;
  const z0 = -0.02;
  const z1 = 1.68;
  const gauge = 0.23;
  const railMat = M('#8d9298');
  const dark = M('#23262b');
  for (const s of [-1, 1]) {
    addBox(g, 0.028, 0.03, z1 - z0, railMat, x + s * gauge, 0.04, (z0 + z1) / 2);
  }
  for (let z = z0 + 0.08; z < z1; z += 0.46) {
    addBox(g, gauge * 2 + 0.12, 0.025, 0.06, M('#6a5344'), x, 0.014, z);
  }
  for (const z of [z0, z1]) {
    for (const s of [-1, 1]) {
      addBox(g, 0.03, 0.07, 0.03, dark, x + s * gauge, 0.07, z);
      addBox(g, 0.035, 0.02, 0.035, M('#c4473a'), x + s * gauge, 0.11, z);
    }
  }
  const zc = 0.84;
  const deckY = 0.2;
  const frame = M('#2c3036');
  addBox(g, 0.04, 0.04, 0.7, frame, x - gauge, 0.15, zc);
  addBox(g, 0.04, 0.04, 0.7, frame, x + gauge, 0.15, zc);
  addBox(g, gauge * 2, 0.035, 0.04, frame, x, 0.15, zc - 0.33);
  addBox(g, gauge * 2, 0.035, 0.04, frame, x, 0.15, zc + 0.33);
  addBox(g, gauge * 2 + 0.08, 0.025, 0.62, M('#3a3e44'), x, deckY, zc);
  const wheelY = 0.1;
  for (const s of [-1, 1]) {
    for (const dz of [-0.28, 0.28]) {
      const w = addCyl(g, 0.045, 0.045, 0.028, dark, x + s * gauge, wheelY, zc + dz, 10);
      w.rotation.z = Math.PI / 2;
      addCyl(g, 0.012, 0.012, 0.06, M('#c5cad0'), x + s * gauge, wheelY, zc + dz, 6).rotation.z = Math.PI / 2;
    }
  }
  addCyl(g, 0.018, 0.02, 0.78, frame, x, deckY + 0.4, zc - 0.02, 8);
  addCyl(g, 0.045, 0.05, 0.04, M('#1e2024'), x, 1.02, zc - 0.02, 10);
  addCyl(g, 0.03, 0.03, 0.05, M('#2a2e33'), x, 1.06, zc - 0.02, 8);
  addRod(g, [x, 1.05, zc - 0.02], [x + 0.28, 0.98, zc + 0.08], 0.008, M('#1a1c1e'), 5);
  addCyl(g, 0.012, 0.014, 0.08, M('#c5cad0'), x + 0.3, 0.98, zc + 0.1, 6);
  cameraBody(g, x, 1.14, zc - 0.02);
  addBox(g, 0.025, 0.62, 0.025, frame, x - 0.16, 0.52, zc + 0.36);
  addBox(g, 0.025, 0.62, 0.025, frame, x + 0.16, 0.52, zc + 0.36);
  addCyl(g, 0.012, 0.012, 0.36, M('#d0d4d8'), x, 0.84, zc + 0.36, 8).rotation.z = Math.PI / 2;
  contact(g, x, zc, 0.42, 0.55, 0x141311, 0.3);
}

function cameraBody(g, x, y, z) {
  const body = M('#1a1c1e');
  const grip = M('#2a2422');
  addBox(g, 0.15, 0.095, 0.08, body, x, y, z);
  addBox(g, 0.045, 0.07, 0.055, grip, x + 0.09, y - 0.01, z + 0.01);
  addBox(g, 0.07, 0.028, 0.04, body, x - 0.01, y + 0.06, z - 0.01);
  addBox(g, 0.04, 0.03, 0.035, body, x, y + 0.055, z + 0.03);
  const lens = addCyl(g, 0.028, 0.032, 0.07, M('#2c3036'), x, y, z - 0.07, 12);
  lens.rotation.x = Math.PI / 2;
  const barrel = addCyl(g, 0.034, 0.03, 0.045, M('#3a3e44'), x, y, z - 0.12, 12);
  barrel.rotation.x = Math.PI / 2;
  const front = addCyl(g, 0.038, 0.038, 0.012, M('#121316'), x, y, z - 0.145, 12);
  front.rotation.x = Math.PI / 2;
  addCyl(g, 0.02, 0.02, 0.008, M('#1a2430'), x, y, z - 0.152, 10).rotation.x = Math.PI / 2;
  addBox(g, 0.07, 0.04, 0.006, M('#243246', { emissive: '#6e8caf', emissiveIntensity: 0.35 }), x, y, z + 0.044);
  addBox(g, 0.012, 0.012, 0.01, M('#ff4a3a', { emissive: '#ff5a48', emissiveIntensity: 0.9 }), x + 0.04, y + 0.05, z - 0.02);
  addBox(g, 0.09, 0.012, 0.025, M('#c5cad0'), x, y + 0.055, z - 0.015);
}

function dressForm(g, x, z) {
  const cloth = M('#c6ae92');
  const metal = M('#2c3036');
  const cap = M('#d4c4b2');
  addCyl(g, 0.18, 0.2, 0.02, metal, x, 0.012, z, 16);
  addCyl(g, 0.012, 0.015, 0.86, metal, x, 0.44, z, 8);
  const pts = [
    new THREE.Vector2(0.035, 0),
    new THREE.Vector2(0.1, 0.05),
    new THREE.Vector2(0.15, 0.14),
    new THREE.Vector2(0.105, 0.3),
    new THREE.Vector2(0.155, 0.44),
    new THREE.Vector2(0.125, 0.54),
    new THREE.Vector2(0.055, 0.64),
    new THREE.Vector2(0.03, 0.72),
  ];
  const lathe = new THREE.Mesh(new THREE.LatheGeometry(pts, 22), cloth);
  lathe.position.set(x, 0.84, z);
  lathe.castShadow = true;
  lathe.receiveShadow = true;
  g.add(lathe);
  addCyl(g, 0.035, 0.04, 0.08, cap, x, 1.6, z, 10);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.085, 14, 10), cap);
  head.position.set(x, 1.72, z);
  head.scale.set(0.92, 1.05, 0.96);
  head.castShadow = true;
  head.receiveShadow = true;
  g.add(head);
  const shoulder = addCyl(g, 0.035, 0.035, 0.2, cloth, x, 1.46, z, 8);
  shoulder.rotation.z = Math.PI / 2;
  const tape = M('#e0b122', { polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  addBox(g, 0.28, 0.004, 0.025, tape, x, 0.022, z);
  addBox(g, 0.025, 0.004, 0.28, tape, x, 0.023, z);
  contact(g, x, z, 0.24, 0.24, 0xb7b1a6, 0.2, 0.02);
}

function appleBox(g, x, y, z, sx, sy, sz, rot = 0) {
  const grp = new THREE.Group();
  grp.position.set(x, y, z);
  grp.rotation.y = rot;
  const wood = M('#b88858');
  const edge = M('#8a623c');
  addBox(grp, sx, sy, sz, wood, 0, sy / 2, 0);
  addBox(grp, sx * 0.92, 0.012, 0.012, edge, 0, sy * 0.72, sz * 0.48);
  addBox(grp, sx * 0.28, sy * 0.28, 0.02, M('#6a4a30'), 0, sy * 0.55, sz * 0.5 + 0.001);
  g.add(grp);
}

function colorChecker(g, x, z) {
  const stand = M('#2c3036');
  addCyl(g, 0.12, 0.14, 0.015, stand, x, 0.01, z, 10);
  addCyl(g, 0.01, 0.012, 0.7, stand, x, 0.36, z, 6);
  addBox(g, 0.4, 0.3, 0.016, M('#1c1e22'), x, 0.86, z);
  const swatches = ['#6b4c38', '#d08a68', '#6a8eae', '#3e7a4e', '#e4dcc8', '#8b9098', '#e0c15a', '#c44a42', '#31457a', '#f2efe8', '#2a2c30', '#8a5a78'];
  swatches.forEach((c, i) => {
    const col = i % 4;
    const row = Math.floor(i / 4);
    addBox(g, 0.07, 0.06, 0.01, M(c), x - 0.12 + col * 0.08, 0.94 - row * 0.08, z + 0.012);
  });
  addBox(g, 0.16, 0.12, 0.008, M('#b9b7b2'), x + 0.22, 0.7, z);
}

function rollRack(g, x, z) {
  const steel = M('#3a3e44');
  const wood = M('#8a6848');
  addBox(g, 1.15, 0.05, 0.4, wood, x, 0.1, z);
  for (const sx of [-0.46, 0.46]) {
    for (const sz of [-0.14, 0.14]) {
      const w = addCyl(g, 0.04, 0.04, 0.028, M('#1c1c1e'), x + sx, 0.04, z + sz, 8);
      w.rotation.z = Math.PI / 2;
    }
  }
  addBox(g, 0.035, 1.2, 0.035, steel, x - 0.52, 0.7, z + 0.16);
  addBox(g, 0.035, 1.2, 0.035, steel, x + 0.52, 0.7, z + 0.16);
  addBox(g, 1.08, 0.035, 0.035, steel, x, 1.28, z + 0.16);
  const colors = ['#3caa55', '#2a56b8', '#8d8984', '#232528'];
  colors.forEach((c, i) => {
    const rx = x - 0.4 + i * 0.27;
    addCyl(g, 0.1, 0.1, 1.28, M(c), rx, 0.78, z, 12);
    addCyl(g, 0.042, 0.042, 1.36, M('#c6a67c'), rx, 0.78, z, 8);
  });
  contact(g, x, z, 0.62, 0.28, 0x141311, 0.28);
}

function stylingCart(g, x, z) {
  const steel = M('#3a3e44');
  const shelf = M('#4a4038');
  addBox(g, 0.52, 0.02, 0.36, shelf, x, 0.28, z);
  addBox(g, 0.52, 0.02, 0.36, shelf, x, 0.62, z);
  for (const sx of [-0.24, 0.24]) {
    for (const sz of [-0.16, 0.16]) {
      addBox(g, 0.02, 0.7, 0.02, steel, x + sx, 0.35, z + sz);
      const w = addCyl(g, 0.035, 0.035, 0.02, M('#1c1c1e'), x + sx, 0.035, z + sz, 8);
      w.rotation.z = Math.PI / 2;
    }
  }
  addCyl(g, 0.012, 0.012, 0.28, M('#d7dbe0'), x, 0.78, z - 0.12, 8).rotation.z = Math.PI / 2;
  addCyl(g, 0.035, 0.04, 0.09, M('#1e2126'), x - 0.12, 0.66, z, 10).rotation.z = Math.PI / 2;
  addCyl(g, 0.028, 0.03, 0.07, M('#1e2126'), x + 0.08, 0.655, z + 0.04, 10).rotation.z = Math.PI / 2;
  addBox(g, 0.16, 0.04, 0.22, M('#d9cfc2'), x + 0.08, 0.32, z);
  addCyl(g, 0.012, 0.014, 0.55, steel, x + 0.32, 0.55, z, 6);
  addBox(g, 0.1, 0.16, 0.06, M('#2a2e33'), x + 0.32, 0.9, z);
  contact(g, x, z, 0.32, 0.24, 0x141311, 0.26);
}

function pegboard(g, m) {
  const x = (m.xRight + 2.55) / 2;
  const z = m.backZ + 0.04;
  addBox(g, 0.95, 1.15, 0.03, M('#4e545c'), x, 1.45, z);
  const hook = M('#c5cad0');
  const spots = [[-0.28, 1.75], [0.05, 1.82], [0.28, 1.6], [-0.15, 1.35], [0.22, 1.28]];
  for (const [dx, y] of spots) {
    addCyl(g, 0.008, 0.008, 0.06, hook, x + dx, y, z + 0.04, 5).rotation.x = Math.PI / 2;
  }
  const disc = new THREE.Mesh(new THREE.CircleGeometry(0.16, 14), M('#d5d8dc', { side: THREE.DoubleSide }));
  disc.position.set(x - 0.22, 1.45, z + 0.05);
  disc.castShadow = true;
  g.add(disc);
  addBox(g, 0.08, 0.05, 0.04, M('#1c1e22'), x + 0.2, 1.42, z + 0.04);
  addBox(g, 0.05, 0.08, 0.04, M('#1c1e22'), x + 0.28, 1.38, z + 0.04);
}

function changingCorner(g, m) {
  const xRod = -3.52;
  const z0 = 1.38;
  const z1 = 3.02;
  const y = 2.48;
  const rod = addCyl(g, 0.014, 0.014, z1 - z0, M('#b08d4e'), xRod, y, (z0 + z1) / 2, 8);
  rod.rotation.x = Math.PI / 2;
  addBox(g, 0.04, 0.08, 0.04, M('#2c3036'), xRod, y + 0.02, z0);
  addBox(g, 0.04, 0.08, 0.04, M('#2c3036'), xRod, y + 0.02, z1);
  addRod(g, [xRod, y, z0], [m.leftX + 0.05, m.H - 0.15, z0], 0.008, M('#8a7344'), 5);
  addRod(g, [xRod, y, z1], [m.leftX + 0.05, m.H - 0.15, z1], 0.008, M('#8a7344'), 5);
  const cloth = M('#7d3942');
  const fold = M('#9a5360');
  const hem = M('#c4a090');
  const panels = [
    { z: 1.55, w: 0.42 },
    { z: 1.78, w: 0.16 },
    { z: 2.72, w: 0.18 },
    { z: 2.92, w: 0.36 },
  ];
  panels.forEach((p, i) => {
    const h = 2.25;
    addBox(g, 0.025, h, p.w, i % 2 ? fold : cloth, xRod + (i % 2 ? 0.03 : 0), y - 0.06 - h / 2, p.z);
    addBox(g, 0.03, 0.04, p.w, hem, xRod, 0.16, p.z);
    addCyl(g, 0.012, 0.012, 0.02, M('#d7dbe0'), xRod, y - 0.02, p.z, 6);
  });
  const rug = addBox(g, 1.4, 0.015, 1.65, M('#6d3e48'), -4.05, 0.012, 2.22);
  rug.userData.noCast = true;

  const wallZ = 2.15;
  addBox(g, 0.025, 1.2, 0.58, M('#c5d2d8'), m.leftX + 0.03, 1.38, wallZ);
  addBox(g, 0.03, 1.28, 0.04, M('#5c4636'), m.leftX + 0.02, 1.38, wallZ - 0.3);
  addBox(g, 0.03, 1.28, 0.04, M('#5c4636'), m.leftX + 0.02, 1.38, wallZ + 0.3);
  addBox(g, 0.03, 0.04, 0.64, M('#5c4636'), m.leftX + 0.02, 1.98, wallZ);
  addBox(g, 0.03, 0.04, 0.64, M('#5c4636'), m.leftX + 0.02, 0.78, wallZ);

  const rackZ = 2.45;
  const rackX = -4.05;
  addCyl(g, 0.012, 0.012, 0.7, M('#d7dbe0'), rackX, 1.55, rackZ, 8).rotation.x = Math.PI / 2;
  addCyl(g, 0.015, 0.015, 1.62, M('#2c3036'), rackX, 0.81, rackZ - 0.32, 6);
  addCyl(g, 0.015, 0.015, 1.62, M('#2c3036'), rackX, 0.81, rackZ + 0.32, 6);
  garment(g, rackX, 1.5, rackZ - 0.18, '#d9cbb8');
  garment(g, rackX, 1.5, rackZ + 0.02, '#355a62');
  garment(g, rackX, 1.5, rackZ + 0.2, '#c46a3a');

  addBox(g, 0.32, 0.03, 0.46, M('#6a5344'), -4.52, 1.05, 3.22);
  addBox(g, 0.035, 1.05, 0.035, M('#6a5344'), -4.64, 0.52, 3.04);
  addBox(g, 0.035, 1.05, 0.035, M('#6a5344'), -4.4, 0.52, 3.04);
  addBox(g, 0.035, 1.05, 0.035, M('#6a5344'), -4.64, 0.52, 3.4);
  addBox(g, 0.035, 1.05, 0.035, M('#6a5344'), -4.4, 0.52, 3.4);
  addBox(g, 0.26, 0.045, 0.18, M('#efe6d4'), -4.52, 1.1, 3.12);
  addBox(g, 0.24, 0.04, 0.16, M('#355a62'), -4.52, 1.15, 3.22);
  addBox(g, 0.22, 0.035, 0.14, M('#c46a3a'), -4.52, 1.19, 3.32);
}

function garment(g, x, y, z, color) {
  const cloth = M(color);
  addBox(g, 0.26, 0.4, 0.035, cloth, x, y - 0.22, z);
  addBox(g, 0.1, 0.15, 0.035, cloth, x - 0.15, y - 0.1, z);
  addBox(g, 0.1, 0.15, 0.035, cloth, x + 0.15, y - 0.1, z);
  addRod(g, [x - 0.12, y, z], [x, y + 0.06, z], 0.006, M('#d7dbe0'), 4);
  addRod(g, [x + 0.12, y, z], [x, y + 0.06, z], 0.006, M('#d7dbe0'), 4);
  addCyl(g, 0.006, 0.006, 0.07, M('#d7dbe0'), x, y + 0.09, z, 5);
}

function doorAndPower(g, m) {
  const hingeZ = 0.9;
  const door = new THREE.Group();
  door.position.set(m.leftX + 0.02, 0, hingeZ);
  door.rotation.y = 1.2;
  addBox(door, 0.84, 2.02, 0.04, M('#4a4038'), 0.42, 1.02, 0);
  addBox(door, 0.66, 0.78, 0.012, M('#3a322c'), 0.42, 0.58, 0.026);
  addBox(door, 0.66, 0.7, 0.012, M('#3a322c'), 0.42, 1.52, 0.026);
  addCyl(door, 0.016, 0.016, 0.03, M('#d7d3c8'), 0.74, 1.0, 0.03, 8);
  g.add(door);
  const frame = M('#2e2a26');
  addBox(g, 0.06, 2.15, 0.06, frame, m.leftX + 0.04, 1.08, hingeZ + 0.02);
  addBox(g, 0.06, 2.15, 0.06, frame, m.leftX + 0.04, 1.08, hingeZ - 0.9);
  addBox(g, 0.06, 0.06, 0.96, frame, m.leftX + 0.04, 2.14, hingeZ - 0.44);

  const z = 1.2;
  const x = m.leftX + 0.04;
  addBox(g, 0.06, 0.42, 0.32, M('#2a2e33'), x, 1.2, z);
  addBox(g, 0.02, 0.06, 0.06, M('#c4473a'), x + 0.03, 1.3, z - 0.08);
  addBox(g, 0.02, 0.06, 0.06, M('#3a6ac4'), x + 0.03, 1.3, z + 0.02);
  addBox(g, 0.02, 0.06, 0.06, M('#e0b122'), x + 0.03, 1.18, z + 0.08);
  addBox(g, 0.08, 0.04, 0.05, M('#1a1c1e'), x + 0.02, 1.05, z);

  appleBox(g, -4.15, 0, -0.15, 0.52, 0.28, 0.4, 0.15);
  appleBox(g, -4.15, 0.28, -0.15, 0.48, 0.26, 0.36, -0.2);
  appleBox(g, -3.55, 0, 0.15, 0.42, 0.22, 0.5, 1.1);
}

function windowAndSoffit(g, m) {
  const soffit = addBox(g, m.W - 0.3, 0.12, 0.85, M('#2c3036'), -0.15, m.H - 0.1, m.backZ + 0.4);
  soffit.userData.noCast = true;
  addBox(g, m.W - 0.4, 0.08, 0.1, M('#3a3e44'), 0, m.H - 0.08, m.backZ + 0.85);
  const x = 4.32;
  const z = m.backZ + 0.03;
  addBox(g, 0.95, 1.35, 0.04, M('#1c1e22'), x, 2.15, z);
  addBox(g, 0.78, 0.7, 0.02, M('#2a3140'), x, 2.35, z + 0.03);
  addBox(g, 0.8, 0.42, 0.025, M('#3a342c'), x, 1.78, z + 0.04);
  addCyl(g, 0.04, 0.04, 0.85, M('#2a2622'), x, 2.72, z + 0.06, 8).rotation.z = Math.PI / 2;
}

function cable(g, pts, r, color) {
  const curve = new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(...p)));
  const mesh = new THREE.Mesh(new THREE.TubeGeometry(curve, 28, r, 5, false), M(color));
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  g.add(mesh);
}

function foliage(g, x, z) {
  addCyl(g, 0.012, 0.016, 0.22, M('#3e5a32'), x, 0.38, z, 6);
  addCyl(g, 0.14, 0.18, 0.2, M('#3f7a45'), x, 0.58, z, 8);
  addCyl(g, 0.09, 0.11, 0.14, M('#2f6a3c'), x + 0.07, 0.7, z - 0.04, 7);
}

function makeShell(layout) {
  const g = new THREE.Group();
  g.name = 'shell';
  const m = metrics(layout);
  const floor = addBox(g, m.W, 0.08, m.D, M('#3e3c39'), 0, -0.04, 0);
  floor.userData.noCast = true;
  const wall = M('#d4cfc6');
  const back = addBox(g, m.W, m.H, 0.14, wall, 0, m.H / 2, -m.D / 2);
  back.userData.noCast = true;
  const left = addBox(g, 0.14, m.H, m.D, wall, -m.W / 2, m.H / 2, 0);
  left.userData.noCast = true;
  const trim = M('#2a2826');
  addBox(g, m.W - 0.2, 0.08, 0.04, trim, 0, 0.05, m.backZ + 0.02);
  addBox(g, 0.04, 0.08, m.D - 0.2, trim, m.leftX + 0.02, 0.05, 0);
  buildCove(g, m);
  windowAndSoffit(g, m);
  return g;
}

function makeProcedural(layout) {
  const g = new THREE.Group();
  g.name = 'procedural';
  const m = metrics(layout);
  buildRails(g, m);
  buildGoalpost(g, m);
  buildLights(g, m);
  buildDolly(g, m);
  dressForm(g, m.subjectX, m.subjectZ);
  colorChecker(g, m.subjectX + 0.72, 0.42);
  rollRack(g, 3.15, -3.22);
  stylingCart(g, 2.15, -1.45);
  pegboard(g, m);
  changingCorner(g, m);
  doorAndPower(g, m);
  appleBox(g, m.subjectX + 0.95, 0, m.subjectZ + 0.35, 0.48, 0.24, 0.36, 0.3);

  const desk = byId(layout, 'edit_desk');
  const dx = desk.position[0];
  const dz = desk.position[2];
  const rug = addBox(g, 2.35, 0.016, 1.75, M('#5c4638'), 3.5, 0.012, 0.95);
  rug.userData.noCast = true;
  addBox(g, 0.12, 0.014, 0.34, M('#2a2c30'), dx + 0.16, 0.774, dz - 0.12);
  addBox(g, 0.05, 0.012, 0.08, M('#3a3e44'), dx + 0.16, 0.774, dz + 0.18);
  contact(g, dx, dz, 0.4, 0.7, 0x141311, 0.22, 0.026);
  contact(g, dx + 0.45, dz, 0.22, 0.26, 0x141311, 0.22, 0.026);

  const plant = byId(layout, 'plant');
  foliage(g, plant.position[0], plant.position[2]);
  contact(g, plant.position[0], plant.position[2], 0.18, 0.18, 0x141311, 0.26);

  const key = [m.subjectX - 1.55, m.subjectZ + 0.62];
  cable(g, [
    [m.leftX + 0.08, 0.9, 1.2],
    [m.leftX + 0.25, 0.04, 0.7],
    [-3.6, 0.03, 0.15],
    [key[0] - 0.1, 0.03, key[1] + 0.2],
    [key[0], 0.2, key[1]],
  ], 0.012, '#23262b');
  cable(g, [
    [key[0], 0.18, key[1]],
    [key[0] + 0.2, 0.9, key[1] - 0.1],
    [m.subjectX - 0.72, 1.7, m.subjectZ + 0.18],
  ], 0.008, '#1a1c1e');

  const sx = m.subjectX;
  contact(g, sx - 1.55, m.subjectZ + 0.62, 0.38, 0.38, 0xb7b1a6, 0.18, 0.02);
  contact(g, sx + 1.45, m.subjectZ + 0.72, 0.32, 0.32, 0xb7b1a6, 0.18, 0.02);
  contact(g, sx + 1.25, m.subjectZ - 0.62, 0.28, 0.28, 0xb7b1a6, 0.16, 0.02);
  return g;
}

function decorateAsset(kind, root) {
  root.traverse((obj) => {
    if (!obj.isMesh) return;
    const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
    const name = obj.name || '';
    for (const mat of mats) {
      if (!mat || !mat.color) continue;
      if (name.includes('light_tube')) {
        mat.emissive = new THREE.Color('#fff1c4');
        mat.emissiveIntensity = 0.9;
      }
      if (name.includes('curved_screen')) {
        mat.color.set('#6e8caf');
        mat.emissive = new THREE.Color('#9eb6d4');
        mat.emissiveIntensity = 0.42;
      }
    }
  });
  if (kind === 'flowerpot') {
    root.traverse((obj) => {
      if (obj.isMesh) obj.castShadow = true;
    });
  }
}

boot({
  makeShell,
  makeProcedural,
  decorateAsset,
  readyText: 'ready — photography studio · drag orbit · U unlit · T toon',
});
