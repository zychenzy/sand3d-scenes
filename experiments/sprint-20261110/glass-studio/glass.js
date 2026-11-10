import * as THREE from 'three';
import { boot, toon, addBox, addCyl, makeCutawayShell } from './scene_lib.js';

const GLASS = {
  cobalt: { body: '#1d4e9c', lip: '#4d82c8', mouth: '#0c2244' },
  amber: { body: '#e39a2e', lip: '#f2c56a', mouth: '#7a4a10' },
  emerald: { body: '#1c8a56', lip: '#49c090', mouth: '#0c3a26' },
  ruby: { body: '#b4233a', lip: '#e15d70', mouth: '#5a101c' },
  milk: { body: '#f3efe6', lip: '#fffcf7', mouth: '#c2b8aa' },
  teal: { body: '#1a7a78', lip: '#46b0ac', mouth: '#0c3332' },
  smoke: { body: '#c5d0d4', lip: '#eef4f6', mouth: '#74848c' },
};

const PROFILES = {
  vase: [[0.02, 0], [0.075, 0.01], [0.1, 0.06], [0.16, 0.18], [0.17, 0.28], [0.12, 0.38], [0.07, 0.46], [0.09, 0.52]],
  bowl: [[0.03, 0], [0.07, 0.012], [0.14, 0.05], [0.2, 0.1], [0.22, 0.15], [0.2, 0.168]],
  bottle: [[0.02, 0], [0.07, 0.01], [0.085, 0.06], [0.1, 0.16], [0.09, 0.24], [0.05, 0.31], [0.055, 0.36]],
  tumbler: [[0.04, 0], [0.05, 0.012], [0.055, 0.08], [0.064, 0.13], [0.062, 0.145]],
  orb: [[0.02, 0], [0.045, 0.015], [0.09, 0.06], [0.12, 0.12], [0.09, 0.18], [0.04, 0.22]],
  pitcher: [[0.02, 0], [0.065, 0.01], [0.09, 0.08], [0.1, 0.16], [0.07, 0.23], [0.075, 0.27]],
};

function flat(color) {
  return toon(color, { polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 });
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

function glowDisc(g, r, thickness, color, emissive, intensity, x, y, z) {
  const m = addCyl(g, r, r, thickness, toon(color, { emissive, emissiveIntensity: intensity }), x, y, z, 24);
  m.rotation.x = Math.PI / 2;
  m.userData.noShadow = true;
  return m;
}

function stain(g, x, z, rx, rz, color) {
  const m = addCyl(g, 1, 1, 0.012, flat(color), x, 0.012, z, 20);
  m.scale.set(rx, 1, rz);
  m.castShadow = false;
  return m;
}

function vessel(g, spec) {
  const tone = GLASS[spec.glass];
  const grp = new THREE.Group();
  grp.name = `glass-${spec.type}-${spec.glass}`;
  const pts = PROFILES[spec.type].map(([r, y]) => new THREE.Vector2(r, y));
  const body = new THREE.Mesh(new THREE.LatheGeometry(pts, 20), toon(tone.body));
  grp.add(body);
  const lipR = pts[pts.length - 1].x;
  const lipY = pts[pts.length - 1].y;
  const mouth = new THREE.Mesh(
    new THREE.CylinderGeometry(lipR * 0.7, lipR * 0.66, 0.012, 16),
    toon(tone.mouth),
  );
  mouth.position.y = lipY - 0.012;
  grp.add(mouth);
  const lip = new THREE.Mesh(new THREE.TorusGeometry(lipR, Math.max(0.006, lipR * 0.08), 6, 18), toon(tone.lip));
  lip.rotation.x = Math.PI / 2;
  lip.position.y = lipY;
  grp.add(lip);
  if (spec.type === 'pitcher') {
    const handle = new THREE.Mesh(new THREE.TorusGeometry(0.055, 0.011, 6, 12, Math.PI), toon(tone.body));
    handle.rotation.y = Math.PI / 2;
    handle.rotation.z = Math.PI;
    handle.position.set(lipR + 0.01, lipY * 0.62, 0);
    grp.add(handle);
    const spout = new THREE.Mesh(new THREE.ConeGeometry(0.028, 0.05, 8), toon(tone.lip));
    spout.rotation.z = Math.PI / 2;
    spout.position.set(-(lipR + 0.02), lipY - 0.01, 0);
    grp.add(spout);
  }
  if (spec.ribs) {
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const rib = new THREE.Mesh(new THREE.BoxGeometry(0.01, lipY * 0.72, 0.012), toon(tone.lip));
      rib.position.set(Math.cos(a) * lipR * 0.92, lipY * 0.42, Math.sin(a) * lipR * 0.92);
      grp.add(rib);
    }
  }
  const sc = spec.scale ?? 1;
  grp.scale.setScalar(sc);
  grp.position.set(spec.x, spec.y, spec.z);
  grp.rotation.y = spec.rot || 0;
  grp.traverse((o) => {
    if (o.isMesh) {
      o.castShadow = true;
      o.receiveShadow = true;
    }
  });
  g.add(grp);
  return grp;
}

function cullet(g, bin) {
  const palettes = {
    cobalt: ['#1d4e9c', '#163e86', '#2d62b0', '#0e2858'],
    amber: ['#e39a2e', '#c47a16', '#f0bc62', '#8a5410'],
    mixed: ['#1d4e9c', '#e39a2e', '#1c8a56', '#b4233a', '#1a7a78', '#f3efe6', '#c5d0d4'],
  };
  const colors = palettes[bin.palette];
  const n = bin.palette === 'amber' ? 22 : bin.palette === 'mixed' ? 18 : 20;
  let seed = Math.round((bin.x * 1000) + (bin.z * 100)) >>> 0;
  const rnd = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  for (let i = 0; i < n; i++) {
    const heaped = i % 3 === 0;
    const radius = heaped ? 0.05 + rnd() * 0.04 : 0.036 + rnd() * 0.032;
    const mesh = new THREE.Mesh(
      new THREE.IcosahedronGeometry(radius, 0),
      toon(colors[i % colors.length]),
    );
    mesh.position.set(
      bin.x + (rnd() - 0.5) * bin.hx * (heaped ? 0.85 : 1.2),
      heaped ? bin.h * (0.88 + rnd() * 0.4) : 0.08 + rnd() * (bin.h * 0.72),
      bin.z + (rnd() - 0.5) * bin.hz * (heaped ? 0.85 : 1.25),
    );
    mesh.rotation.set(rnd() * 3, rnd() * 4, rnd() * 2);
    mesh.scale.y = 0.55 + rnd() * 0.7;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    g.add(mesh);
  }
}

function bin(g, b, wood, iron) {
  const t = 0.028;
  addBox(g, b.hx * 2 - 0.02, 0.04, b.hz * 2 - 0.02, wood, b.x, 0.03, b.z);
  addBox(g, t, b.h, b.hz * 2, wood, b.x - b.hx, b.h / 2, b.z);
  addBox(g, t, b.h, b.hz * 2, wood, b.x + b.hx, b.h / 2, b.z);
  addBox(g, b.hx * 2, b.h, t, wood, b.x, b.h / 2, b.z - b.hz);
  addBox(g, b.hx * 2, b.h, t, wood, b.x, b.h / 2, b.z + b.hz);
  addBox(g, b.hx * 2 + 0.02, 0.035, 0.035, iron, b.x, b.h - 0.01, b.z - b.hz);
  addBox(g, b.hx * 2 + 0.02, 0.035, 0.035, iron, b.x, b.h - 0.01, b.z + b.hz);
  cullet(g, b);
}

function fritJar(g, x, y, z, glass, h) {
  const tone = GLASS[glass];
  addCyl(g, h * 0.42, h * 0.46, h * 0.78, toon(tone.body), x, y + h * 0.39, z, 12);
  addCyl(g, h * 0.34, h * 0.34, 0.012, toon(tone.mouth), x, y + h * 0.72, z, 12);
  addCyl(g, h * 0.46, h * 0.46, 0.02, toon('#b7b1a8'), x, y + h * 0.8, z, 12);
  addCyl(g, h * 0.1, h * 0.1, 0.02, toon('#8a8682'), x, y + h * 0.82, z, 8);
}

function rodCan(g, x, y, z) {
  const can = toon('#8d8a84');
  addCyl(g, 0.09, 0.1, 0.16, can, x, y + 0.08, z, 12);
  const colors = ['#1d4e9c', '#e39a2e', '#1c8a56', '#b4233a', '#1a7a78', '#c5d0d4', '#f3efe6', '#e39a2e'];
  colors.forEach((c, i) => {
    const a = (i / colors.length) * Math.PI * 2;
    const h = 0.2 + (i % 3) * 0.04;
    addCyl(g, 0.008, 0.008, h, toon(c), x + Math.cos(a) * 0.045, y + 0.14 + h / 2, z + Math.sin(a) * 0.045, 6);
  });
}

function stockShelves(g, layout) {
  const shelves = (layout.instances || []).filter((i) => i.kind === 'wall_shelf');
  const H = layout.assets.wall_shelf.targetHeight;
  shelves.forEach((inst, index) => {
    const sy = Array.isArray(inst.scale) ? inst.scale[1] : (inst.scale || 1);
    const yL = inst.position[1] + 0.21625 * H * sy;
    const yU = inst.position[1] + 0.8125 * H * sy;
    const x = inst.position[0] + 0.05;
    const z = inst.position[2];
    if (index === 0) {
      fritJar(g, x, yL, z - 0.22, 'emerald', 0.12);
      fritJar(g, x, yL, z + 0.02, 'amber', 0.14);
      rodCan(g, x, yL, z + 0.3);
    } else {
      fritJar(g, x, yU, z - 0.2, 'cobalt', 0.13);
      fritJar(g, x, yU, z + 0.02, 'ruby', 0.11);
      fritJar(g, x, yU, z + 0.24, 'teal', 0.15);
      const cane = ['#1d4e9c', '#e39a2e', '#1c8a56', '#c5d0d4', '#b4233a'];
      cane.forEach((c, i) => {
        const caneMesh = addCyl(g, 0.008, 0.008, 0.36, toon(c), x + (i - 2) * 0.018, yL + 0.016, z, 6);
        caneMesh.rotation.x = Math.PI / 2;
      });
    }
  });
}

function barrel(g, b, iron) {
  const wall = toon('#5c564f');
  addCyl(g, b.r, b.r * 1.04, b.h, wall, b.x, b.h / 2, b.z, 16);
  addCyl(g, b.r * 0.92, b.r * 0.92, 0.02, toon(b.band), b.x, b.h * 0.72, b.z, 16);
  addCyl(g, b.r * 0.92, b.r * 0.92, 0.02, toon(b.band), b.x, b.h * 0.28, b.z, 16);
  if (b.open) {
    addCyl(g, b.r * 0.82, b.r * 0.82, 0.02, toon(b.fill), b.x, b.h - 0.02, b.z, 16);
    const lid = addCyl(g, b.r * 0.9, b.r * 0.9, 0.03, toon('#6a645c'), b.x + b.r + 0.04, b.h * 0.45, b.z, 12);
    lid.rotation.z = Math.PI / 2.4;
  } else {
    addCyl(g, b.r * 0.98, b.r * 0.98, 0.04, toon('#6a645c'), b.x, b.h + 0.01, b.z, 16);
  }
  addCyl(g, 0.012, 0.012, 0.08, iron, b.x + b.r * 0.4, b.h * 0.55, b.z + b.r * 0.7, 6);
}

function furnace(g, layout) {
  const s = layout.shell;
  const f = layout.zones.furnace;
  const brick = toon(s.brickColor);
  const brickDark = toon(s.brickDark);
  const soot = toon(s.sootColor);
  const iron = toon(s.ironColor);
  const steel = toon(s.steelColor);
  const wall = layout.zones.heatWall;
  addBox(g, wall.w, wall.h, wall.d, brick, wall.x, wall.h / 2, wall.z);
  for (let i = 0; i < 4; i++) {
    addBox(g, wall.w, 0.045, wall.d + 0.02, brickDark, wall.x, 0.28 + i * 0.48, wall.z + 0.01);
  }
  addBox(g, 2.1, 0.55, 0.06, soot, f.x, wall.h - 0.32, wall.z + wall.d / 2 + 0.02);

  const standTop = f.mouthY - f.radius;
  addBox(g, 1.05, 0.05, 0.95, steel, f.x, standTop - 0.02, f.z);
  for (const dx of [-0.4, 0.4]) {
    for (const dz of [-0.32, 0.32]) {
      addBox(g, 0.06, standTop - 0.06, 0.06, iron, f.x + dx, (standTop - 0.06) / 2, f.z + dz);
    }
  }
  addBox(g, 0.9, 0.04, 0.06, iron, f.x, standTop * 0.45, f.z - 0.32);
  addBox(g, 0.9, 0.04, 0.06, iron, f.x, standTop * 0.45, f.z + 0.32);

  const drum = addCyl(g, f.radius, f.radius, f.length, steel, f.x, f.mouthY, f.z, 28);
  drum.rotation.x = Math.PI / 2;
  for (const dz of [-0.22, 0.16]) {
    const band = new THREE.Mesh(new THREE.TorusGeometry(f.radius + 0.012, 0.026, 8, 24), iron);
    band.position.set(f.x, f.mouthY, f.z + dz);
    band.castShadow = true;
    g.add(band);
  }
  const port = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.045, 8, 24), iron);
  port.position.set(f.x, f.mouthY, f.frontZ + 0.03);
  port.castShadow = true;
  g.add(port);
  const lining = new THREE.Mesh(new THREE.TorusGeometry(0.26, 0.04, 8, 22), brickDark);
  lining.position.set(f.x, f.mouthY, f.frontZ + 0.045);
  g.add(lining);
  glowDisc(g, 0.2, 0.04, '#e15a22', '#ff6a28', 0.55, f.x, f.mouthY, f.frontZ + 0.03);
  glowDisc(g, 0.09, 0.025, '#ff9a48', '#ff7a30', 0.7, f.x, f.mouthY, f.frontZ + 0.05);

  addBox(g, 0.34, 1.62, 0.5, brick, f.x - 0.8, 0.81, f.z - 0.12);
  addBox(g, 0.34, 1.62, 0.5, brick, f.x + 0.8, 0.81, f.z - 0.12);
  addBox(g, 1.2, 0.22, 0.62, iron, f.x, f.mouthY + 0.62, f.frontZ - 0.02);
  addBox(g, 0.9, 0.08, 0.4, soot, f.x, f.mouthY + 0.78, f.frontZ + 0.08);

  const flue = addCyl(g, 0.11, 0.13, 1.55, iron, f.x, f.mouthY + f.radius + 0.85, f.z - 0.05, 12);
  flue.castShadow = true;
  addCyl(g, 0.16, 0.16, 0.05, steel, f.x, 3.38, f.z - 0.05, 12);
  addBox(g, 0.7, 0.04, 0.7, soot, f.x, 3.36, f.z - 0.05);

  const rack = layout.zones.colorRack;
  addBox(g, 0.04, rack.h, 0.04, iron, rack.x - rack.w / 2, rack.h / 2, rack.z);
  addBox(g, 0.04, rack.h, 0.04, iron, rack.x + rack.w / 2, rack.h / 2, rack.z);
  for (const y of [0.35, 0.72, 1.08]) addBox(g, rack.w, 0.03, 0.03, steel, rack.x, y, rack.z);
  ['#1d4e9c', '#e39a2e', '#1c8a56', '#b4233a', '#1a7a78'].forEach((c, i) => {
    addCyl(g, 0.014, 0.016, 0.7 + (i % 2) * 0.12, toon(c), rack.x - 0.08 + i * 0.04, 0.48, rack.z + 0.02, 6);
  });
}

function lehr(g, layout) {
  const L = layout.zones.lehr;
  const iron = toon(layout.shell.ironColor);
  const steel = toon(layout.shell.steelColor);
  const body = toon('#3c3a38');
  addBox(g, L.w + 0.08, 0.08, L.d + 0.06, iron, L.x, 0.04, L.z);
  addBox(g, L.w, L.h - 0.08, L.d, body, L.x, 0.08 + (L.h - 0.08) / 2, L.z);
  const front = L.z + L.d / 2;
  addBox(g, L.w * 0.7, L.h * 0.58, 0.04, iron, L.x, 0.5, front + 0.02);
  const slit = addBox(
    g, 0.5, 0.1, 0.03,
    toon('#ffb46a', { emissive: '#ff9a3a', emissiveIntensity: 0.8 }),
    L.x, 0.84, front + 0.045,
  );
  slit.userData.noShadow = true;
  addBox(g, 0.18, 0.028, 0.04, steel, L.x - 0.32, 0.58, front + 0.05);
  addBox(g, 0.18, 0.028, 0.04, steel, L.x + 0.32, 0.58, front + 0.05);
  addBox(g, 1.2, 0.04, 0.3, steel, L.x, L.trayY - 0.02, front + 0.16);
  addBox(g, 0.08, 0.16, 0.04, steel, L.x, L.h + 0.04, L.z);
  addBox(g, 0.22, 0.04, 0.1, toon('#a33b32'), L.x + L.w * 0.32, L.h * 0.55, front + 0.03);
}

function hotShopTools(g, layout) {
  const bench = layout.zones.bench;
  const iron = toon(layout.shell.ironColor);
  const steel = toon('#8a8682');
  const wood = toon(layout.shell.woodColor);
  const yR = 0.5;
  const z0 = bench.z - bench.halfZ;
  for (const dx of [-0.2, 0.2]) {
    addBox(g, 0.04, 0.08, 0.04, iron, bench.x + dx, bench.seatY + 0.02, z0 + 0.02);
    spar(g, bench.x + dx, yR, z0, bench.x + dx, yR - 0.04, bench.railTipZ, 0.016, steel, 8);
  }
  const pipeZ0 = bench.z + bench.halfZ - 0.04;
  const pipeZ1 = bench.railTipZ - 0.1;
  spar(g, bench.x, 0.53, pipeZ0, bench.x, 0.53, pipeZ1, 0.014, iron, 8);
  addCyl(g, 0.02, 0.018, 0.08, toon('#6b442c'), bench.x, 0.53, pipeZ0 + 0.02, 8).rotation.x = Math.PI / 2;
  const gather = new THREE.Mesh(
    new THREE.SphereGeometry(0.085, 18, 14),
    toon('#ff7a32', { emissive: '#ff5c18', emissiveIntensity: 0.8 }),
  );
  gather.position.set(bench.x, 0.5, pipeZ1 - 0.04);
  gather.scale.set(1, 0.86, 1.05);
  gather.userData.noShadow = true;
  g.add(gather);
  const neck = addCyl(g, 0.02, 0.04, 0.07, toon('#ff9a48', { emissive: '#ff7a30', emissiveIntensity: 0.55 }), bench.x, 0.52, pipeZ1 + 0.02, 10);
  neck.rotation.x = Math.PI / 2;
  neck.userData.noShadow = true;

  const m = layout.zones.marver;
  const top = m.top + 0.01;
  addBox(g, 0.26, 0.012, 0.18, toon('#d9d0bc'), m.x - 0.16, top, m.z - 0.08);
  addBox(g, 0.28, 0.018, 0.09, wood, m.x + 0.18, top + 0.01, m.z + 0.08);
  addCyl(g, 0.012, 0.014, 0.12, wood, m.x + 0.34, top + 0.02, m.z + 0.08, 6).rotation.z = Math.PI / 2;
  addCyl(g, 0.05, 0.055, 0.05, toon('#6e3030'), m.x + 0.05, top + 0.025, m.z + 0.12, 10);
  spar(g, m.x + 0.08, top + 0.02, m.z - 0.12, m.x + 0.34, top + 0.02, m.z + 0.02, 0.008, steel, 6);
  spar(g, m.x + 0.08, top + 0.02, m.z - 0.02, m.x + 0.32, top + 0.02, m.z - 0.16, 0.008, steel, 6);
  addBox(g, 0.16, 0.008, 0.035, steel, m.x - 0.02, top + 0.01, m.z + 0.16);
  addBox(g, 0.16, 0.008, 0.035, steel, m.x + 0.02, top + 0.015, m.z + 0.2);

  addCyl(g, 0.16, 0.18, 0.28, wood, bench.x - bench.halfX - 0.28, 0.14, bench.z + 0.1, 12);
  addCyl(g, 0.13, 0.13, 0.02, toon('#1c2428'), bench.x - bench.halfX - 0.28, 0.27, bench.z + 0.1, 12);
  const fire = toon('#8e2e28');
  addCyl(g, 0.15, 0.17, 0.32, fire, -2.5, 0.16, -2.4, 12);
  addCyl(g, 0.12, 0.12, 0.02, toon('#e6d3a4'), -2.5, 0.31, -2.4, 12);
}

function pipeRack(g, layout) {
  const p = layout.zones.pipeRack;
  const iron = toon(layout.shell.ironColor);
  const wood = toon(layout.shell.woodColor);
  addBox(g, 0.5, 0.06, 0.36, wood, p.x, 0.04, p.z);
  addBox(g, 0.05, 1.25, 0.05, iron, p.x - 0.18, 0.66, p.z);
  addBox(g, 0.05, 1.25, 0.05, iron, p.x + 0.18, 0.66, p.z);
  addBox(g, 0.46, 0.04, 0.04, iron, p.x, 1.15, p.z);
  for (let i = 0; i < 4; i++) {
    const x = p.x - 0.15 + i * 0.1;
    spar(g, x, 1.12, p.z, x + 0.05, 0.18, p.z + 0.72, 0.012, toon('#3a3937'), 8);
    addCyl(g, 0.02, 0.016, 0.05, toon('#6b442c'), x + 0.04, 0.2, p.z + 0.7, 6);
  }
}

function storage(g, layout) {
  const wood = toon(layout.shell.woodColor);
  const iron = toon(layout.shell.ironColor);
  const steel = toon(layout.shell.steelColor);
  for (const b of layout.zones.bins) bin(g, b, wood, iron);
  for (const b of layout.zones.barrels) barrel(g, b, iron);
  stockShelves(g, layout);
  pipeRack(g, layout);

  const c = layout.zones.cart;
  addBox(g, c.w, 0.04, c.d, wood, c.x, 0.42, c.z);
  addBox(g, c.w, 0.04, c.d, wood, c.x, 0.78, c.z);
  for (const dx of [-c.w / 2 + 0.04, c.w / 2 - 0.04]) {
    for (const dz of [-c.d / 2 + 0.04, c.d / 2 - 0.04]) {
      addBox(g, 0.035, 0.78, 0.035, iron, c.x + dx, 0.39, c.z + dz);
      addCyl(g, 0.04, 0.04, 0.03, iron, c.x + dx, 0.05, c.z + dz, 8).rotation.z = Math.PI / 2;
    }
  }
  ['#1d4e9c', '#e39a2e', '#1c8a56', '#b4233a', '#1a7a78', '#c5d0d4'].forEach((color, i) => {
    addCyl(g, 0.01, 0.01, 0.36 + (i % 3) * 0.06, toon(color), c.x - 0.18 + i * 0.07, 0.98, c.z, 6);
  });
  addCyl(g, 0.045, 0.05, 0.1, steel, c.x, 0.5, c.z + 0.08, 8);

  const { width: W } = layout.meta.room;
  addBox(g, 0.04, 0.7, 1.1, toon('#4a342c'), -W / 2 + 0.12, 1.45, -2.15);
  spar(g, -W / 2 + 0.16, 1.7, -2.45, -W / 2 + 0.16, 1.15, -2.05, 0.012, iron, 6);
  spar(g, -W / 2 + 0.16, 1.65, -1.9, -W / 2 + 0.2, 1.2, -1.7, 0.01, steel, 6);
  const scoop = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.16, 8), steel);
  scoop.rotation.z = Math.PI / 2.2;
  scoop.position.set(layout.zones.bins[1].x + 0.05, layout.zones.bins[1].h - 0.02, layout.zones.bins[1].z);
  scoop.castShadow = true;
  g.add(scoop);
}

function coldShop(g, layout) {
  const c = layout.zones.cold;
  const wood = toon('#6e4a30');
  const iron = toon(layout.shell.ironColor);
  const steel = toon(layout.shell.steelColor);
  addBox(g, c.w, 0.06, c.d, wood, c.x, c.h - 0.03, c.z);
  for (const dx of [-c.w / 2 + 0.06, c.w / 2 - 0.06]) {
    for (const dz of [-c.d / 2 + 0.06, c.d / 2 - 0.06]) {
      addBox(g, 0.05, c.h - 0.06, 0.05, iron, c.x + dx, (c.h - 0.06) / 2, c.z + dz);
    }
  }
  const wheel = addCyl(g, 0.16, 0.16, 0.04, steel, c.x + 0.12, c.h + 0.16, c.z, 20);
  wheel.rotation.z = Math.PI / 2;
  addBox(g, 0.16, 0.1, 0.14, iron, c.x - 0.22, c.h + 0.05, c.z + 0.05);
  addBox(g, 0.1, 0.03, 0.08, toon('#2f6a3a'), c.x - 0.05, c.h + 0.015, c.z - 0.12);

  const k = layout.zones.crate;
  addBox(g, k.hx * 2, k.h, k.hz * 2, wood, k.x, k.h / 2, k.z);
  addBox(g, k.hx * 1.7, 0.02, k.hz * 1.5, toon('#e6d7b0'), k.x, k.h + 0.005, k.z);
  addBox(g, 0.04, k.h, 0.03, iron, k.x - k.hx, k.h / 2, k.z - k.hz);
  addBox(g, 0.04, k.h, 0.03, iron, k.x + k.hx, k.h / 2, k.z + k.hz);
}

function makeShell(layout) {
  const { width: W, depth: D, height: H } = layout.meta.room;
  const g = makeCutawayShell(layout, {
    ceilingW: W - 0.2,
    ceilingD: 5.9,
    ceilingZ: -1.15,
    ceilingX: -0.1,
  });
  const s = layout.shell;
  const brick = toon(s.brickColor);
  const brickDark = toon(s.brickDark);
  const iron = toon(s.ironColor);
  const dado = 0.92;
  addBox(g, W - 0.2, dado, 0.05, brick, 0, dado / 2, -D / 2 + 0.11);
  addBox(g, 0.05, dado, D - 0.3, brick, -W / 2 + 0.11, dado / 2, 0);
  addBox(g, W - 0.2, 0.08, 0.06, brickDark, 0, 0.06, -D / 2 + 0.12);
  addBox(g, 0.06, 0.08, D - 0.3, brickDark, -W / 2 + 0.12, 0.06, 0);

  const plate = layout.zones.steelPlate;
  addBox(g, plate.w, 0.02, plate.d, flat('#4a4642'), plate.x, 0.016, plate.z);
  const path = layout.zones.path;
  addBox(g, path.w, 0.016, path.d, flat('#5c5854'), path.x, 0.012, path.z);
  const pad = layout.zones.pad;
  addBox(g, pad.w, 0.02, pad.d, flat('#d5cbb8'), pad.x, 0.015, pad.z);
  stain(g, -1.3, -2.35, 0.55, 0.32, '#3a332e');
  stain(g, -1.55, -1.9, 0.28, 0.2, '#342e2a');

  addBox(g, W - 0.8, 0.1, 0.1, iron, -0.1, 3.3, -2.7);
  addBox(g, W - 0.8, 0.1, 0.1, iron, -0.1, 3.3, -0.4);
  addBox(g, 0.1, 0.1, 3.2, iron, -4.3, 3.3, -1.6);

  addBox(g, 0.7, 0.32, 0.06, iron, 2.7, 2.72, -D / 2 + 0.16);
  addBox(g, 0.52, 0.16, 0.04, toon('#1a1816'), 2.7, 2.72, -D / 2 + 0.18);
  return g;
}

function makeProcedural(layout) {
  const g = new THREE.Group();
  g.name = 'procedural';
  furnace(g, layout);
  lehr(g, layout);
  hotShopTools(g, layout);
  storage(g, layout);
  coldShop(g, layout);
  for (const piece of layout.zones.pieces) vessel(g, piece);

  const pendants = (layout.instances || []).filter((i) => i.kind === 'pendant_lamp');
  const iron = toon(layout.shell.ironColor);
  const target = layout.assets.pendant_lamp.targetHeight;
  for (const p of pendants) {
    const cap = p.position[1] + target;
    addCyl(g, 0.012, 0.012, Math.max(0.05, 3.4 - cap), iron, p.position[0], (cap + 3.4) / 2, p.position[2], 6);
  }
  return g;
}

function decorateAsset(kind, root) {
  root.traverse((obj) => {
    if (!obj.isMesh) return;
    if (kind === 'museum_plinth') {
      const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
      const next = mats.map((m) => {
        const mat = m || new THREE.MeshStandardMaterial();
        if (mat.color) mat.color.set('#d7cec0');
        return mat;
      });
      obj.material = Array.isArray(obj.material) ? next : next[0];
    }
    if (kind === 'pendant_lamp' && (obj.name || '').toLowerCase().includes('bulb')) {
      const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
      for (const m of mats) {
        if (!m) continue;
        if (m.color) m.color.set('#fff6e6');
        m.emissive = new THREE.Color('#ffd9a0');
        m.emissiveIntensity = 0.9;
      }
    }
  });
}

boot({
  makeShell,
  makeProcedural,
  decorateAsset,
  readyText: 'ready — artisan glass studio · drag orbit · U unlit · T toon',
});
