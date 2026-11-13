/**
 * Cold-work stained-glass workshop.
 * Pattern light table, vertical sheet racks, copper-foil rolls, a soldering
 * iron under a vent hood, and a framed leaded window. Glass is thin extruded
 * sheet with a streak map — not opaque cubes, and not the hot shop.
 */
import * as THREE from 'three';
import { boot, toon, addBox, addCyl, makeCutawayShell, tagShadow } from './scene_lib.js';

const THICK = 0.011;
const GLASS = {
  ruby: '#c41e3a',
  amber: '#e0942a',
  gold: '#f0c15a',
  deep: '#d9782a',
  emerald: '#1e8a52',
  teal: '#1a8a86',
  cobalt: '#2a4ea6',
  violet: '#6a3a88',
  opal: '#d5e6ee',
  pink: '#e39aaf',
  pale: '#b7d7a4',
};

let streakTex;
let cartoonTex;

function streaks() {
  if (streakTex) return streakTex;
  const c = document.createElement('canvas');
  c.width = 96;
  c.height = 168;
  const g = c.getContext('2d');
  g.fillStyle = '#ffffff';
  g.fillRect(0, 0, 96, 168);
  let s = 19;
  const rnd = () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };
  for (let i = 0; i < 20; i++) {
    const x = rnd() * 96;
    g.strokeStyle = `rgba(30, 32, 40, ${0.08 + rnd() * 0.2})`;
    g.lineWidth = 0.8 + rnd() * 3.2;
    g.beginPath();
    g.moveTo(x, 0);
    g.bezierCurveTo(x + 14, 46, x - 12, 110, x + 3, 168);
    g.stroke();
  }
  for (let i = 0; i < 18; i++) {
    g.fillStyle = `rgba(255,255,255,${0.28 + rnd() * 0.4})`;
    g.beginPath();
    g.arc(rnd() * 96, rnd() * 168, 0.8 + rnd() * 2.1, 0, Math.PI * 2);
    g.fill();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 4;
  streakTex = tex;
  return tex;
}

function cartoon() {
  if (cartoonTex) return cartoonTex;
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = '#f3ead2';
  g.fillRect(0, 0, 256, 256);
  g.strokeStyle = '#3a342e';
  g.lineWidth = 3;
  g.strokeRect(16, 16, 224, 224);
  g.beginPath();
  g.moveTo(28, 176);
  g.quadraticCurveTo(78, 128, 128, 172);
  g.quadraticCurveTo(184, 118, 228, 176);
  g.stroke();
  g.beginPath();
  g.arc(128, 104, 20, 0, Math.PI * 2);
  g.stroke();
  for (let i = 0; i < 8; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 4;
    g.beginPath();
    g.moveTo(128 + Math.cos(a) * 26, 104 + Math.sin(a) * 26);
    g.lineTo(128 + Math.cos(a) * 50, 104 + Math.sin(a) * 50);
    g.stroke();
  }
  g.strokeRect(28, 186, 200, 28);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  cartoonTex = tex;
  return tex;
}

function glassMat(hex, opts = {}) {
  return toon(hex, {
    map: streaks(),
    emissive: hex,
    emissiveIntensity: opts.glow ?? 0.4,
    transparent: true,
    opacity: opts.opacity ?? 0.86,
    depthWrite: opts.depthWrite !== undefined ? opts.depthWrite : true,
    side: opts.side || THREE.DoubleSide,
    polygonOffset: true,
    polygonOffsetFactor: opts.polygonOffsetFactor ?? -2,
    polygonOffsetUnits: opts.polygonOffsetUnits ?? -2,
  });
}

function extrude(shape) {
  return new THREE.ExtrudeGeometry(shape, {
    depth: THICK,
    bevelEnabled: false,
    curveSegments: 8,
    steps: 1,
  });
}

function rectSpan(x0, y0, x1, y1) {
  const s = new THREE.Shape();
  s.moveTo(x0, y0);
  s.lineTo(x1, y0);
  s.lineTo(x1, y1);
  s.lineTo(x0, y1);
  s.closePath();
  return s;
}

function rect(w, h) {
  return rectSpan(-w / 2, -h / 2, w / 2, h / 2);
}

function disk(cx, cy, r) {
  const s = new THREE.Shape();
  s.absarc(cx, cy, r, 0, Math.PI * 2, false);
  return s;
}

function hill(x0, x1, y0, y1) {
  const s = new THREE.Shape();
  const mid = (x0 + x1) / 2;
  const shoulder = y0 + (y1 - y0) * 0.4;
  s.moveTo(x0, y0);
  s.lineTo(x1, y0);
  s.lineTo(x1, shoulder);
  s.quadraticCurveTo(mid, y1, x0, shoulder);
  s.closePath();
  return s;
}

function petal(cx, cy, a0, r0, r1, spread) {
  const s = new THREE.Shape();
  const p = (r, a) => [cx + Math.cos(a) * r, cy + Math.sin(a) * r];
  const a = p(r0, a0);
  const b = p(r1, a0 - spread);
  const c = p(r1 + (r1 - r0) * 0.12, a0);
  const d = p(r1, a0 + spread);
  s.moveTo(a[0], a[1]);
  s.quadraticCurveTo(b[0], b[1], c[0], c[1]);
  s.quadraticCurveTo(d[0], d[1], a[0], a[1]);
  s.closePath();
  return s;
}

function archSheet(w, h) {
  const s = new THREE.Shape();
  const y0 = -h / 2;
  const shoulder = h / 2 - w * 0.22;
  s.moveTo(-w / 2, y0);
  s.lineTo(w / 2, y0);
  s.lineTo(w / 2, shoulder);
  s.quadraticCurveTo(0, h / 2 + 0.03, -w / 2, shoulder);
  s.closePath();
  return s;
}

function notchSheet(w, h) {
  const s = new THREE.Shape();
  s.moveTo(-w / 2, -h / 2);
  s.lineTo(w / 2, -h / 2);
  s.lineTo(w / 2, h / 2 - 0.02);
  s.lineTo(w * 0.12, h / 2);
  s.lineTo(-w * 0.08, h / 2 - 0.14);
  s.lineTo(-w / 2, h / 2 - 0.04);
  s.closePath();
  return s;
}

function shard() {
  const s = new THREE.Shape();
  s.moveTo(-0.055, -0.028);
  s.lineTo(0.048, -0.04);
  s.lineTo(0.07, 0.012);
  s.lineTo(0.008, 0.055);
  s.lineTo(-0.05, 0.026);
  s.closePath();
  return s;
}

function addUprightGlass(g, shape, hex, z, opts) {
  const mesh = new THREE.Mesh(extrude(shape), glassMat(hex, opts));
  mesh.position.set(0, 0, z - THICK);
  tagShadow(mesh, false);
  mesh.renderOrder = 3;
  g.add(mesh);
  return mesh;
}

function addFlatGlass(g, shape, hex, x, y, z, opts = {}) {
  const mesh = new THREE.Mesh(extrude(shape), glassMat(hex, {
    opacity: opts.opacity ?? 0.78,
    glow: opts.glow ?? 0.26,
    depthWrite: false,
    polygonOffsetFactor: -3,
    polygonOffsetUnits: -3,
  }));
  mesh.rotation.x = Math.PI / 2;
  mesh.position.set(x, y + THICK, z);
  tagShadow(mesh, false);
  mesh.renderOrder = 5;
  g.add(mesh);
  return mesh;
}

function foilRoll(g, shell, x, y, z, rotY) {
  const grp = new THREE.Group();
  grp.name = 'foil-roll';
  const copper = toon(shell.copperColor, { emissive: '#8a4518', emissiveIntensity: 0.16 });
  const core = toon('#efe2c8');
  const roll = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.05, 18), copper);
  roll.rotation.z = Math.PI / 2;
  const hole = new THREE.Mesh(new THREE.CylinderGeometry(0.013, 0.013, 0.056, 12), core);
  hole.rotation.z = Math.PI / 2;
  const tail = new THREE.Mesh(new THREE.BoxGeometry(0.085, 0.003, 0.044), copper);
  tail.position.set(0.068, -0.026, 0);
  tail.rotation.z = -0.5;
  grp.add(roll, hole, tail);
  grp.position.set(x, y + 0.04, z);
  grp.rotation.y = rotY;
  g.add(grp);
  return grp;
}

function duct(g, mat, points, radius = 0.055) {
  for (let i = 0; i < points.length - 1; i++) {
    const a = new THREE.Vector3(...points[i]);
    const b = new THREE.Vector3(...points[i + 1]);
    const dir = b.clone().sub(a);
    const len = dir.length();
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, len, 10), mat);
    mesh.position.copy(a).add(b).multiplyScalar(0.5);
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
    mesh.castShadow = true;
    g.add(mesh);
  }
}

function addWindow(g, zone, shell) {
  const grp = new THREE.Group();
  grp.name = 'leaded-window';
  grp.position.set(zone.x, zone.sill, zone.z);
  const { w, h } = zone;
  const wood = toon(shell.woodColor);
  const lead = toon(shell.leadColor);
  const t = 0.068;
  const depth = 0.058;
  addBox(grp, w, t, depth, wood, 0, t / 2, 0);
  addBox(grp, w, t, depth, wood, 0, h - t / 2, 0);
  addBox(grp, t, h - t, depth, wood, -w / 2 + t / 2, h / 2, 0);
  addBox(grp, t, h - t, depth, wood, w / 2 - t / 2, h / 2, 0);
  addBox(grp, 0.09, zone.sill, 0.1, wood, -w / 2 + 0.14, -zone.sill / 2, 0.02);
  addBox(grp, 0.09, zone.sill, 0.1, wood, w / 2 - 0.14, -zone.sill / 2, 0.02);
  addBox(grp, w * 0.72, 0.045, 0.09, wood, 0, 0.02, 0.04);

  const iw = w - t * 2 - 0.02;
  const ih = h - t * 2 - 0.02;
  const glow = addBox(
    grp, iw, ih, 0.018,
    toon('#fff7ea', { emissive: '#fff1d2', emissiveIntensity: 1.2 }),
    0, h / 2, -0.05,
  );
  tagShadow(glow, false);

  const x0 = -iw / 2 + 0.012;
  const x1 = iw / 2 - 0.012;
  const y0 = t + 0.018;
  const y1 = h - t - 0.016;
  const gz = 0.02;
  const gy1 = y0 + 0.18;
  const cols = [GLASS.amber, GLASS.gold, GLASS.deep, GLASS.gold];
  const gw = (x1 - x0) / cols.length;
  cols.forEach((hex, i) => {
    const a = x0 + i * gw + 0.008;
    const b = x0 + (i + 1) * gw - 0.008;
    addUprightGlass(grp, rectSpan(a, y0, b, gy1), hex, gz, { glow: 0.5, opacity: 0.9 });
  });

  const hy0 = gy1 + 0.028;
  const hy1 = hy0 + 0.26;
  const mid = (x0 + x1) / 2;
  addUprightGlass(grp, hill(x0 + 0.01, mid - 0.012, hy0, hy1), GLASS.emerald, gz, { glow: 0.48, opacity: 0.9 });
  addUprightGlass(grp, hill(mid + 0.012, x1 - 0.01, hy0, hy1 + 0.02), GLASS.teal, gz, { glow: 0.48, opacity: 0.9 });

  const cy = hy1 + 0.36;
  const cx = 0;
  addUprightGlass(grp, disk(cx, cy, 0.115), GLASS.ruby, gz + 0.002, { glow: 0.62, opacity: 0.93 });
  const petalColors = [GLASS.gold, GLASS.amber, GLASS.emerald, GLASS.teal, GLASS.cobalt, GLASS.violet, GLASS.pink, GLASS.deep];
  for (let i = 0; i < 8; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 4;
    addUprightGlass(grp, petal(cx, cy, a, 0.15, 0.3, 0.3), petalColors[i], gz, { glow: 0.5, opacity: 0.9 });
  }
  const sy0 = hy1 + 0.03;
  addUprightGlass(grp, rectSpan(x0 + 0.008, sy0, -0.32, y1), GLASS.cobalt, gz, { glow: 0.46, opacity: 0.88 });
  addUprightGlass(grp, rectSpan(0.32, sy0, x1 - 0.008, y1), GLASS.violet, gz, { glow: 0.46, opacity: 0.88 });
  addUprightGlass(grp, rectSpan(-0.3, cy + 0.31, 0.3, y1), GLASS.opal, gz, { glow: 0.42, opacity: 0.8 });

  const lz = 0.034;
  addBox(grp, x1 - x0, 0.026, 0.014, lead, 0, gy1 + 0.012, lz);
  addBox(grp, x1 - x0, 0.026, 0.014, lead, 0, hy1 + 0.01, lz);
  addBox(grp, 0.022, gy1 - y0, 0.014, lead, mid, (y0 + gy1) / 2, lz);
  for (let i = 1; i < cols.length; i++) {
    if (Math.abs(x0 + i * gw - mid) < 0.02) continue;
    addBox(grp, 0.022, gy1 - y0, 0.014, lead, x0 + i * gw, (y0 + gy1) / 2, lz);
  }
  addBox(grp, 0.022, hy1 - hy0, 0.014, lead, mid, (hy0 + hy1) / 2 + 0.01, lz);
  addBox(grp, 0.022, y1 - sy0, 0.014, lead, -0.32, (sy0 + y1) / 2, lz);
  addBox(grp, 0.022, y1 - sy0, 0.014, lead, 0.32, (sy0 + y1) / 2, lz);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.138, 0.012, 8, 28), lead);
  ring.position.set(cx, cy, lz);
  ring.castShadow = false;
  grp.add(ring);
  for (let i = 0; i < 8; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 4;
    const rad = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.15, 0.012), lead);
    rad.position.set(cx + Math.cos(a) * 0.23, cy + Math.sin(a) * 0.23, lz);
    rad.rotation.z = a - Math.PI / 2;
    rad.castShadow = false;
    grp.add(rad);
  }
  g.add(grp);
}

function addRacks(g, racks, shell) {
  const palettes = [
    [GLASS.ruby, GLASS.amber, GLASS.emerald, GLASS.cobalt, GLASS.gold, GLASS.violet],
    [GLASS.teal, GLASS.deep, GLASS.pink, GLASS.cobalt, GLASS.pale, GLASS.ruby],
  ];
  racks.forEach((rk, ri) => {
    const grp = new THREE.Group();
    grp.name = `sheet-rack-${ri}`;
    grp.position.set(rk.x, 0, rk.z);
    const wood = toon(shell.woodColor);
    const iron = toon(shell.ironColor);
    addBox(grp, 0.46, 0.055, 0.8, wood, 0.02, 0.028, 0);
    for (const sx of [-0.16, 0.2]) {
      for (const sz of [-0.36, 0.36]) addBox(grp, 0.04, 1.08, 0.04, wood, sx, 0.56, sz);
      addBox(grp, 0.035, 0.035, 0.76, iron, sx, 0.2, 0);
      addBox(grp, 0.035, 0.035, 0.76, iron, sx, 0.96, 0);
    }
    palettes[ri].forEach((hex, i) => {
      const shape = i % 3 === 1 ? archSheet(0.62, 0.8) : i % 3 === 2 ? notchSheet(0.58, 0.74) : rect(0.62, 0.76);
      const mesh = new THREE.Mesh(extrude(shape), glassMat(hex, {
        opacity: 0.72,
        glow: 0.4,
        depthWrite: false,
      }));
      mesh.rotation.y = Math.PI / 2;
      const h = i % 3 === 1 ? 0.4 : 0.38;
      mesh.position.set(-0.14 + i * 0.048, 0.1 + h, -0.26 + i * 0.1);
      tagShadow(mesh, false);
      mesh.renderOrder = 2 + i;
      grp.add(mesh);
    });
    g.add(grp);
  });
}

function addLightTable(g, zone, shell) {
  const { x, z, top } = zone;
  const wood = toon('#d9c4a2');
  const box = addBox(g, 1.04, 0.05, 0.56, wood, x, top + 0.025, z);
  box.castShadow = true;
  const panel = addBox(
    g, 0.96, 0.014, 0.48,
    toon('#fff8ee', { emissive: '#fff4e0', emissiveIntensity: 1.35 }),
    x, top + 0.054, z,
  );
  tagShadow(panel, false);
  const paper = addBox(
    g, 0.66, 0.004, 0.38,
    toon('#f3ead2', { map: cartoon(), polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 }),
    x - 0.02, top + 0.064, z - 0.01,
  );
  tagShadow(paper, false);

  const y = top + 0.074;
  const see = { opacity: 0.62, glow: 0.48 };
  addFlatGlass(g, rect(0.12, 0.065), GLASS.amber, x - 0.22, y, z + 0.1, see);
  addFlatGlass(g, rect(0.1, 0.06), GLASS.gold, x - 0.08, y, z + 0.1, see);
  addFlatGlass(g, hill(-0.07, 0.065, -0.04, 0.07), GLASS.emerald, x - 0.18, y, z - 0.02, see);
  const sx = x + 0.08;
  const sz = z - 0.02;
  addFlatGlass(g, disk(0, 0, 0.05), GLASS.ruby, sx, y, sz, { glow: 0.55, opacity: 0.7 });
  addFlatGlass(g, petal(0, 0, Math.PI / 2, 0.065, 0.12, 0.32), GLASS.gold, sx, y, sz, see);
  addFlatGlass(g, petal(0, 0, Math.PI, 0.065, 0.12, 0.32), GLASS.cobalt, sx, y, sz, see);
  addFlatGlass(g, petal(0, 0, 0, 0.065, 0.115, 0.3), GLASS.teal, sx, y, sz, see);
  addFlatGlass(g, shard(), GLASS.violet, x + 0.3, y, z + 0.12, see);

  const nail = toon('#3a3632');
  [[-0.34, 0.16], [-0.34, -0.18], [0.28, 0.17], [0.3, -0.16], [-0.02, 0.18]].forEach(([dx, dz], i) => {
    const n = addCyl(g, 0.0045, 0.0035, 0.026, nail, x + dx, y + 0.01, z + dz, 6);
    n.rotation.z = i % 2 ? 0.25 : -0.15;
    n.castShadow = false;
  });

  foilRoll(g, shell, x + 0.9, top, z + 0.32, 0.5);
  foilRoll(g, shell, x + 0.78, top, z + 0.4, -0.4);
}

function addSolder(g, zone, vent, shell) {
  const y = zone.top;
  const ix = zone.ironX;
  const z = zone.z + 0.02;
  addBox(g, 0.32, 0.008, 0.2, toon('#6d5848'), ix, y + 0.004, z);

  const standX = ix - 0.04;
  addCyl(g, 0.05, 0.055, 0.012, toon(shell.ironColor), standX, y + 0.012, z, 16);
  for (let i = 0; i < 4; i++) {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.026 - i * 0.004, 0.0032, 6, 14),
      toon('#5a554f'),
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.set(standX, y + 0.028 + i * 0.011, z);
    ring.castShadow = false;
    g.add(ring);
  }

  const iron = new THREE.Group();
  iron.name = 'soldering-iron';
  const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.016, 0.12, 12), toon('#3a3e42'));
  handle.position.y = 0.05;
  const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.045, 10), toon('#c4652a'));
  grip.position.y = 0.07;
  const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.018, 10), toon('#c9a24a'));
  collar.position.y = -0.018;
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.0042, 0.0042, 0.1, 8), toon('#d5d2cc'));
  shaft.position.y = -0.074;
  const tip = new THREE.Mesh(new THREE.ConeGeometry(0.005, 0.024, 8), toon('#f0ebe4', { emissive: '#e7c39a', emissiveIntensity: 0.35 }));
  tip.position.y = -0.132;
  const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.16, 6), toon('#2c3134'));
  cord.position.set(0.02, 0.12, 0);
  cord.rotation.z = 1.1;
  iron.add(handle, grip, collar, shaft, tip, cord);
  iron.position.set(standX, y + 0.09, z + 0.04);
  iron.rotation.z = -0.85;
  iron.rotation.y = 0.7;
  iron.scale.setScalar(1.35);
  g.add(iron);

  addCyl(g, 0.038, 0.04, 0.012, toon('#8d9396'), ix + 0.14, y + 0.01, z + 0.05, 14);
  addBox(g, 0.046, 0.018, 0.03, toon('#3e8a5e'), ix + 0.14, y + 0.022, z + 0.05);
  const spool = new THREE.Mesh(
    new THREE.TorusGeometry(0.03, 0.01, 8, 16),
    toon('#d5d8dc', { emissive: '#b0b6bc', emissiveIntensity: 0.12 }),
  );
  spool.position.set(ix - 0.16, y + 0.034, z + 0.07);
  spool.rotation.x = Math.PI / 2.4;
  g.add(spool);
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.012, 8), toon('#c4a574'));
  hub.position.copy(spool.position);
  g.add(hub);

  foilRoll(g, shell, ix + 0.18, y, z - 0.08, 0.9);
  foilRoll(g, shell, ix + 0.26, y, z - 0.01, 0.2);

  const frame = toon('#2c4a44');
  for (const dx of [-0.026, 0.026]) {
    const lens = new THREE.Mesh(new THREE.TorusGeometry(0.018, 0.0032, 6, 12), frame);
    lens.position.set(ix - 0.16 + dx, y + 0.02, z - 0.08);
    g.add(lens);
  }
  addBox(g, 0.014, 0.004, 0.004, frame, ix - 0.16, y + 0.02, z - 0.08);

  const metal = toon(shell.ventColor);
  const { x: vx, y: vy, z: vz } = vent;
  addBox(g, 0.66, 0.07, 0.34, metal, vx, vy + 0.18, vz);
  addBox(g, 0.5, 0.1, 0.26, metal, vx, vy + 0.08, vz);
  const mouth = addBox(g, 0.36, 0.016, 0.18, toon('#5c6568'), vx, vy + 0.02, vz);
  tagShadow(mouth, false);
  for (let i = 0; i < 4; i++) {
    addBox(g, 0.48, 0.008, 0.012, toon('#4a5254'), vx, vy + 0.045, vz - 0.09 + i * 0.06);
  }
  addCyl(g, 0.07, 0.07, 0.06, toon('#7e8688'), vx, vy + 0.24, vz, 12);
  duct(g, metal, [
    [vx, vy + 0.28, vz],
    [vx, 2.35, vz - 0.08],
    [vx + 0.02, 2.85, -3.72],
    [vx + 0.02, 3.12, -3.86],
  ]);
}

function addCutting(g, zone, shell) {
  const { x, z, top } = zone;
  const y = top + 0.01;
  addFlatGlass(g, rect(0.22, 0.14), GLASS.amber, x - 0.06, y, z + 0.02, { opacity: 0.84, glow: 0.3 });
  const score = addBox(g, 0.16, 0.003, 0.004, toon('#4a4038'), x - 0.06, y + 0.02, z + 0.02);
  score.castShadow = false;
  addBox(g, 0.24, 0.008, 0.012, toon('#c5c8cc'), x - 0.02, y + 0.006, z - 0.1);

  const cutter = new THREE.Group();
  cutter.name = 'glass-cutter';
  const ball = new THREE.Mesh(new THREE.SphereGeometry(0.011, 10, 8), toon('#d4b15a'));
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.0038, 0.0046, 0.09, 8), toon('#9aa0a4'));
  neck.rotation.z = Math.PI / 2;
  neck.position.x = 0.05;
  const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.003, 8), toon('#4a4e52'));
  wheel.rotation.x = Math.PI / 2;
  wheel.position.set(0.098, 0, 0);
  cutter.add(ball, neck, wheel);
  cutter.position.set(x - 0.16, y + 0.012, z + 0.1);
  cutter.rotation.y = 0.6;
  g.add(cutter);

  const grip = toon('#b4332a');
  const jaw = toon('#8e9498');
  const left = addBox(g, 0.1, 0.01, 0.012, grip, x + 0.08, y + 0.008, z + 0.08);
  const right = addBox(g, 0.1, 0.01, 0.012, grip, x + 0.1, y + 0.008, z + 0.1);
  left.rotation.y = 0.35;
  right.rotation.y = -0.2;
  addCyl(g, 0.008, 0.008, 0.008, jaw, x + 0.12, y + 0.012, z + 0.09, 8);

  const body = toon('#e4e0d8');
  addBox(g, 0.24, 0.04, 0.18, toon('#cfc8be'), x + 0.16, y + 0.02, z - 0.02);
  const water = addBox(g, 0.12, 0.016, 0.08, toon('#7eb0c8', {
    emissive: '#6aa4bc',
    emissiveIntensity: 0.25,
    transparent: true,
    opacity: 0.8,
    depthWrite: false,
  }), x + 0.12, y + 0.048, z - 0.02);
  tagShadow(water, false);
  addCyl(g, 0.032, 0.036, 0.06, body, x + 0.2, y + 0.07, z - 0.02, 12);
  addCyl(g, 0.01, 0.01, 0.028, toon('#9aa0a4'), x + 0.2, y + 0.11, z - 0.02, 8);
  const shield = new THREE.Mesh(new THREE.TorusGeometry(0.055, 0.005, 6, 12, Math.PI * 0.85), toon('#f2efe8'));
  shield.rotation.y = Math.PI / 2;
  shield.position.set(x + 0.2, y + 0.08, z - 0.02);
  g.add(shield);
}

function addStorage(g, layout, shell) {
  const wood = toon(shell.woodColor);
  const lead = toon(shell.leadColor);
  const binX = -2.62;
  const binZ = -3.58;
  addBox(g, 0.36, 0.018, 0.18, wood, binX, 0.02, binZ);
  addBox(g, 0.016, 0.32, 0.18, wood, binX - 0.17, 0.17, binZ);
  addBox(g, 0.016, 0.32, 0.18, wood, binX + 0.17, 0.17, binZ);
  addBox(g, 0.36, 0.32, 0.016, wood, binX, 0.17, binZ - 0.08);
  addBox(g, 0.36, 0.32, 0.016, wood, binX, 0.17, binZ + 0.08);
  for (let i = 0; i < 7; i++) {
    const h = 0.42 + (i % 3) * 0.06;
    const strip = addBox(g, 0.018, h, 0.045, lead, binX - 0.12 + i * 0.04, 0.04 + h / 2, binZ);
    strip.castShadow = false;
    addBox(g, 0.008, h * 0.92, 0.012, toon('#5a534c'), binX - 0.12 + i * 0.04, 0.05 + h / 2, binZ);
  }

  const cx = -4.28;
  const cz = -2.45;
  addBox(g, 0.42, 0.016, 0.32, wood, cx, 0.02, cz);
  addBox(g, 0.016, 0.16, 0.32, wood, cx - 0.2, 0.09, cz);
  addBox(g, 0.016, 0.16, 0.32, wood, cx + 0.2, 0.09, cz);
  addBox(g, 0.42, 0.16, 0.016, wood, cx, 0.09, cz - 0.15);
  addBox(g, 0.42, 0.16, 0.016, wood, cx, 0.09, cz + 0.15);
  const bits = [
    [GLASS.ruby, -0.08, 0.04],
    [GLASS.cobalt, 0.05, -0.02],
    [GLASS.emerald, 0.02, 0.06],
    [GLASS.amber, -0.02, -0.06],
    [GLASS.gold, 0.1, 0.04],
  ];
  bits.forEach(([hex, dx, dz], i) => {
    const mesh = addFlatGlass(g, shard(), hex, cx + dx, 0.06 + (i % 2) * 0.012, cz + dz, { opacity: 0.8, glow: 0.3 });
    mesh.rotation.z = (i - 2) * 0.25;
  });

  const shelf = layout.zones.shelf;
  foilRoll(g, shell, shelf.x + 0.04, shelf.upper, shelf.z - 0.28, 0.3);
  foilRoll(g, shell, shelf.x + 0.04, shelf.upper, shelf.z, 1.1);
  foilRoll(g, shell, shelf.x + 0.04, shelf.upper + 0.05, shelf.z + 0.22, 0.6);

  const paperMat = toon('#f3ead2', { map: cartoon(), polygonOffset: true });
  const wallZ = -layout.meta.room.depth / 2 + 0.1;
  const a = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.52), paperMat);
  a.position.set(-2.55, 1.62, wallZ);
  tagShadow(a, false);
  g.add(a);
  const b = new THREE.Mesh(new THREE.PlaneGeometry(0.28, 0.34), paperMat.clone());
  b.position.set(-2.05, 1.35, wallZ);
  tagShadow(b, false);
  g.add(b);

  const cart = layout.zones.easelCartoon;
  const board = new THREE.Mesh(new THREE.PlaneGeometry(cart.w, cart.h), paperMat.clone());
  board.position.set(cart.x, cart.y, cart.z + cart.dz);
  board.rotation.y = 0.08;
  tagShadow(board, false);
  g.add(board);
}

function makeShell(layout) {
  const room = layout.meta.room;
  const g = makeCutawayShell(layout, {
    ceilingW: room.width * 0.98,
    ceilingD: room.depth * 0.62,
    ceilingX: -0.15,
    ceilingZ: -1.35,
  });
  const { width: W, depth: D, height: H } = room;
  const wood = toon(layout.shell.woodColor);
  const trim = toon(layout.shell.trimColor);
  addBox(g, W - 0.16, 0.11, 0.05, wood, 0, 0.055, -D / 2 + 0.1);
  addBox(g, 0.05, 0.11, D - 0.16, wood, -W / 2 + 0.1, 0.055, 0);
  addBox(g, W - 0.28, 0.035, 0.03, trim, 0, 1.02, -D / 2 + 0.09);
  addBox(g, 0.03, 0.035, D - 0.4, trim, -W / 2 + 0.09, 1.02, -0.2);
  const path = layout.zones.path;
  const mat = addBox(
    g, path.w, 0.012, path.d,
    toon(layout.shell.matColor, { polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 }),
    path.x, 0.006, path.z,
  );
  mat.castShadow = false;
  const beamA = addBox(g, W * 0.72, 0.07, 0.08, trim, -0.35, H - 0.18, -2.55);
  const beamB = addBox(g, W * 0.72, 0.07, 0.08, trim, -0.35, H - 0.18, -0.85);
  beamA.userData.noCast = true;
  beamB.userData.noCast = true;
  return g;
}

function makeProcedural(layout) {
  const g = new THREE.Group();
  g.name = 'procedural';
  const shell = layout.shell;
  addWindow(g, layout.zones.window, shell);
  addRacks(g, layout.zones.racks, shell);
  addLightTable(g, layout.zones.lightTable, shell);
  addSolder(g, layout.zones.solder, layout.zones.vent, shell);
  addCutting(g, layout.zones.cutting, shell);
  addStorage(g, layout, shell);
  return g;
}

function decorateAsset(kind, root) {
  root.traverse((obj) => {
    if (!obj.isMesh || !obj.material) return;
    const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
    for (const m of mats) {
      if (!m || !m.color) continue;
      if (kind === 'library_lamp') {
        const lum = m.color.r * 0.25 + m.color.g * 0.6 + m.color.b * 0.15;
        if (lum > 0.72 && m.color.r > 0.7 && m.color.b > 0.7) {
          m.emissive = new THREE.Color('#ffe6c2');
          m.emissiveIntensity = 0.9;
        }
      }
      if (kind === 'pendant_lamp' && m.name && m.name.includes('glass')) {
        m.emissive = new THREE.Color('#ffd7a4');
        m.emissiveIntensity = 0.32;
      }
    }
  });
}

boot({
  makeShell,
  makeProcedural,
  decorateAsset,
  readyText: 'ready — cold stained-glass workshop · drag orbit · U unlit · T toon',
});
