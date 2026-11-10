import * as THREE from 'three';
import { mergeGeometries } from './vendor/utils/BufferGeometryUtils.js';
import { boot, toon, addBox, addCyl } from './scene_lib.js';

function mark(mesh, mode) {
  if (mode) mesh.userData.shadowMode = mode;
  return mesh;
}

function palette(layout) {
  const s = layout.shell || {};
  return {
    plaster: toon(s.wallColor || '#f3eee6'),
    plasterDeep: toon('#e6ddd0'),
    ceiling: toon(s.ceilingColor || '#f7f3ec'),
    walnut: toon(s.woodColor || '#6b4632'),
    oak: toon('#8a5a38'),
    beam: toon('#8d6544'),
    dado: toon('#e8d4b4'),
    piano: toon('#2a221c'),
    pianoDark: toon('#161210'),
    keys: toon('#f4f0e6'),
    ebony: toon('#1a1a1a'),
    brass: toon('#b08a52'),
    iron: toon('#3a3836'),
    chrome: toon('#8a8e92'),
    foam: toon('#3a3238'),
    foamWine: toon('#5a3a42'),
    foamDeep: toon('#2a2428'),
    rug: toon(s.accentColor || '#3d5c66'),
    rugEdge: toon('#2a4248'),
    leaf: toon('#3f6a45'),
    leafDeep: toon('#2c4e34'),
    stem: toon('#5a4632'),
    paper: toon('#f3ead4'),
    stave: toon('#2c2a28'),
    folder: [toon('#7a3038'), toon('#2f4a3c'), toon('#3a3a6a'), toon('#7a5a28'), toon('#5a2a3a')],
    drum: toon('#6a2428'),
    drumSkin: toon('#e8dcc4'),
    cymbal: toon('#c4a05a'),
    woodG: toon('#a86a38'),
    woodG2: toon('#8a4e28'),
    cable: toon('#1a1816'),
    glass: toon('#d5e4ee', { transparent: true, opacity: 0.38, side: THREE.DoubleSide }),
    clerestory: toon('#fff1dc', { emissive: '#ffd7a1', emissiveIntensity: 0.85, side: THREE.DoubleSide }),
    bulb: toon('#fff6e8', { emissive: '#ffd9a8', emissiveIntensity: 1.45 }),
    led: toon('#3cff9a', { emissive: '#3cff9a', emissiveIntensity: 1.2 }),
    plaque: toon('#2a3848'),
    cream: toon('#f0e6d4'),
    mixer: toon('#1e2226'),
    gap: toon('#2e2822'),
    planks: ['#e0b56e', '#c9964e', '#d7b07a', '#b68446', '#e8c48a', '#c48a48'].map((c) => toon(c)),
  };
}

function metrics(layout) {
  const { width: W, depth: D, height: H } = layout.meta.room;
  const wallT = 0.16;
  return {
    W, D, H, wallT,
    a: layout.architecture,
    zInner: -D / 2 + wallT / 2,
    xInner: -W / 2 + wallT / 2,
  };
}

function contactTexture() {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 128;
  const ctx = c.getContext('2d');
  const grd = ctx.createRadialGradient(64, 64, 6, 64, 64, 62);
  grd.addColorStop(0, 'rgba(24,16,10,0.55)');
  grd.addColorStop(1, 'rgba(24,16,10,0)');
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function contact(g, tex, x, z, w, d, opacity = 0.32, y = 0.012) {
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(w, d),
    new THREE.MeshBasicMaterial({
      map: tex,
      transparent: true,
      depthWrite: false,
      opacity,
      toneMapped: false,
    }),
  );
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set(x, y, z);
  mesh.userData.keepMaterial = true;
  mesh.userData.shadowMode = 'none';
  mesh.renderOrder = 2;
  g.add(mesh);
  return mesh;
}

function plankFloor(g, mats, m) {
  const pitch = 0.118;
  const gap = 0.007;
  const x0 = -m.W / 2 + 0.12;
  const x1 = m.W / 2 - 0.08;
  const z0 = -m.D / 2 + 0.12;
  const z1 = m.D / 2 - 0.08;
  mark(addBox(g, x1 - x0, 0.08, z1 - z0, mats.gap, (x0 + x1) / 2, -0.04, (z0 + z1) / 2), 'receive');
  const buckets = mats.planks.map(() => []);
  let i = 0;
  for (let z = z0; z < z1 - 0.02; z += pitch) {
    const depth = Math.min(pitch - gap, z1 - z);
    const geo = new THREE.BoxGeometry(x1 - x0, 0.022, depth);
    geo.translate((x0 + x1) / 2, 0.002, z + depth / 2);
    buckets[i % mats.planks.length].push(geo);
    i += 1;
  }
  buckets.forEach((geos, idx) => {
    if (!geos.length) return;
    const merged = mergeGeometries(geos, false);
    const mesh = new THREE.Mesh(merged, mats.planks[idx]);
    mesh.name = `planks-${idx}`;
    mark(mesh, 'receive');
    g.add(mesh);
    geos.forEach((geo) => geo.dispose());
  });
}

function dais(g, mats, m) {
  const d = m.a.dais;
  const w = d.x1 - d.x0;
  const dep = d.z1 - d.z0;
  const cx = (d.x0 + d.x1) / 2;
  const cz = (d.z0 + d.z1) / 2;
  mark(addBox(g, w, d.h, dep, mats.oak, cx, d.h / 2, cz), 'receive');
  mark(addBox(g, w + 0.04, 0.03, 0.05, mats.walnut, cx, d.h + 0.01, d.z1), 'receive');
  mark(addBox(g, 0.42, 0.07, 0.28, mats.walnut, 0.05, 0.035, d.z1 + 0.12), 'receive');
  mark(addBox(g, w - 0.3, 0.04, 0.08, mats.iron, cx, 0.04, d.z1 - 0.06), 'receive');
}

function foamWall(g, mats, m) {
  const cols = 8;
  const rows = 4;
  const size = 0.48;
  const gap = 0.07;
  const x0 = -3.35;
  const y0 = 1.18;
  const z = m.zInner + 0.09;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (r === 3 && (c === 2 || c === 5)) continue;
      const x = x0 + c * (size + gap);
      const y = y0 + r * (size + gap);
      const mat = (r + c) % 3 === 0 ? mats.foamWine : ((r + c) % 2 ? mats.foam : mats.foamDeep);
      mark(addBox(g, size, size, 0.07, mat, x, y, z), 'none');
      if ((r + c) % 2 === 0) {
        mark(addBox(g, size * 0.55, size * 0.55, 0.06, mat, x, y, z + 0.05), 'none');
      }
    }
  }
}

function bassTraps(g, mats, m) {
  function stack(x, z, rot) {
    const grp = new THREE.Group();
    grp.position.set(x, 0, z);
    grp.rotation.y = rot;
    for (let i = 0; i < 5; i++) {
      const mat = i % 2 ? mats.foamWine : mats.foam;
      mark(addBox(grp, 0.42 - i * 0.02, 0.36, 0.42 - i * 0.02, mat, 0.12, 0.22 + i * 0.38, 0.12), 'cast');
      mark(addBox(grp, 0.38, 0.03, 0.38, mats.foamDeep, 0.12, 0.4 + i * 0.38, 0.12), 'none');
    }
    g.add(grp);
  }
  stack(m.xInner + 0.28, m.zInner + 0.28, Math.PI / 4);
  stack(3.92, m.zInner + 0.26, -Math.PI / 4);
}

function slatDiffuser(g, mats, m) {
  const z0 = -3.35;
  const z1 = -1.55;
  const y0 = 1.18;
  const y1 = 2.72;
  const depths = [0.05, 0.14, 0.08, 0.18, 0.06, 0.16, 0.1, 0.2, 0.07, 0.13, 0.09, 0.17];
  let z = z0;
  depths.forEach((dep, i) => {
    const w = 0.07;
    mark(addBox(g, dep, y1 - y0, w, i % 2 ? mats.walnut : mats.oak, m.xInner + 0.08 + dep / 2, (y0 + y1) / 2, z + w / 2), 'none');
    z += w + 0.035;
  });
  mark(addBox(g, 0.04, 0.04, z1 - z0 + 0.1, mats.walnut, m.xInner + 0.12, y1 + 0.02, (z0 + z1) / 2), 'none');
  mark(addBox(g, 0.04, 0.04, z1 - z0 + 0.1, mats.walnut, m.xInner + 0.12, y0 - 0.02, (z0 + z1) / 2), 'none');
}

function clouds(g, mats, m) {
  const panels = [
    { x: -0.15, z: -1.55, w: 1.85, d: 0.95 },
    { x: -1.95, z: 0.85, w: 1.45, d: 0.85 },
    { x: 1.85, z: 0.85, w: 1.45, d: 0.85 },
  ];
  panels.forEach((p) => {
    mark(addBox(g, p.w, 0.07, p.d, mats.foam, p.x, 3.12, p.z), 'none');
    mark(addBox(g, p.w - 0.08, 0.02, p.d - 0.08, mats.foamDeep, p.x, 3.08, p.z), 'none');
    addCyl(g, 0.008, 0.008, 0.22, mats.iron, p.x - p.w * 0.32, 3.26, p.z, 6);
    addCyl(g, 0.008, 0.008, 0.22, mats.iron, p.x + p.w * 0.32, 3.26, p.z, 6);
  });
}

function clerestory(g, mats, m) {
  const y = 3.08;
  const h = 0.32;
  const z = m.zInner + 0.02;
  for (let i = 0; i < 6; i++) {
    const x = -3.1 + i * 1.05;
    mark(addBox(g, 0.88, h, 0.03, mats.clerestory, x, y, z), 'none');
    mark(addBox(g, 0.05, h + 0.06, 0.05, mats.walnut, x - 0.46, y, z + 0.01), 'none');
  }
  mark(addBox(g, 6.4, 0.04, 0.05, mats.walnut, 0.05, y + h / 2 + 0.02, z + 0.01), 'none');
  mark(addBox(g, 6.4, 0.04, 0.05, mats.walnut, 0.05, y - h / 2 - 0.02, z + 0.01), 'none');
}

function studioDoor(g, mats, m) {
  const door = m.a.door;
  const x = m.xInner + 0.02;
  const cz = (door.z0 + door.z1) / 2;
  const h = door.y1;
  const w = door.z1 - door.z0;
  mark(addBox(g, 0.06, h + 0.08, 0.08, mats.walnut, x + 0.02, h / 2, door.z0), 'none');
  mark(addBox(g, 0.06, h + 0.08, 0.08, mats.walnut, x + 0.02, h / 2, door.z1), 'none');
  mark(addBox(g, 0.06, 0.08, w + 0.12, mats.walnut, x + 0.02, h + 0.04, cz), 'none');
  mark(addBox(g, 0.05, h - 0.04, w - 0.04, mats.cream, x + 0.04, h / 2, cz), 'cast');
  mark(addBox(g, 0.02, 0.42, 0.28, mats.glass, x + 0.07, 1.55, cz), 'none');
  mark(addBox(g, 0.03, 0.46, 0.32, mats.walnut, x + 0.06, 1.55, cz), 'none');
  addCyl(g, 0.018, 0.018, 0.04, mats.brass, x + 0.08, 1.05, door.z1 - 0.12, 8);
  mark(addBox(g, 0.03, 0.12, 0.38, mats.plaque, x + 0.08, 2.28, cz), 'none');
}

function ceiling(g, mats, m) {
  const z0 = m.zInner + 0.08;
  const z1 = 2.15;
  mark(addBox(g, m.W - 0.28, 0.08, z1 - z0, mats.ceiling, -0.08, m.H - 0.04, (z0 + z1) / 2), 'receive');
  for (const x of [-2.15, 0.05, 2.25]) {
    mark(addBox(g, 0.14, 0.16, z1 - z0 - 0.2, mats.beam, x, m.H - 0.16, (z0 + z1) / 2 - 0.04), 'none');
  }
  mark(addBox(g, m.W - 0.18, 0.06, 0.08, mats.walnut, 0, m.H - 0.08, m.zInner + 0.03), 'none');
  mark(addBox(g, 0.08, 0.06, m.D - 0.22, mats.walnut, m.xInner + 0.03, m.H - 0.08, 0.08), 'none');
}

function makeShell(layout) {
  const g = new THREE.Group();
  g.name = 'shell';
  const m = metrics(layout);
  const mats = palette(layout);
  const { W, D, H } = m;

  mark(addBox(g, W, H, m.wallT, mats.plaster, 0, H / 2, -D / 2), 'cast');
  mark(addBox(g, m.wallT, H, D, mats.plaster, -W / 2, H / 2, 0), 'cast');
  mark(addBox(g, W - 0.35, 0.95, 0.05, mats.dado, 0, 0.475, m.zInner + 0.09), 'receive');
  mark(addBox(g, 0.05, 0.95, D - 0.35, mats.dado, m.xInner + 0.09, 0.475, 0), 'receive');
  mark(addBox(g, W - 0.3, 0.04, 0.05, mats.walnut, 0, 0.95, m.zInner + 0.11), 'none');
  mark(addBox(g, 0.05, 0.04, D - 0.3, mats.walnut, m.xInner + 0.11, 0.95, 0), 'none');

  plankFloor(g, mats, m);
  dais(g, mats, m);
  const rugW = 6.2;
  const rugD = 3.15;
  mark(addBox(g, rugW, 0.018, rugD, mats.rug, 0.05, 0.012, 1.45), 'receive');
  mark(addBox(g, rugW - 0.18, 0.004, rugD - 0.18, mats.rugEdge, 0.05, 0.022, 1.45), 'receive');
  foamWall(g, mats, m);
  bassTraps(g, mats, m);
  slatDiffuser(g, mats, m);
  clouds(g, mats, m);
  clerestory(g, mats, m);
  studioDoor(g, mats, m);
  ceiling(g, mats, m);
  g.userData.mats = mats;
  g.userData.metrics = m;
  return g;
}

function uprightPiano(g, mats, spec, y0) {
  const grp = new THREE.Group();
  grp.position.set(spec.x, y0, spec.z);
  mark(addBox(grp, 1.48, 1.16, 0.56, mats.piano, 0, 0.64, -0.04));
  mark(addBox(grp, 1.52, 0.05, 0.6, mats.pianoDark, 0, 1.24, -0.04));
  mark(addBox(grp, 1.48, 0.08, 0.56, mats.pianoDark, 0, 0.04, -0.04));
  mark(addBox(grp, 1.44, 0.05, 0.26, mats.pianoDark, 0, 0.72, 0.22));
  for (let i = 0; i < 26; i++) {
    addBox(grp, 0.046, 0.022, 0.2, mats.keys, -0.7 + i * 0.054, 0.78, 0.24);
  }
  const pattern = [1, 1, 0, 1, 1, 1, 0];
  for (let i = 0; i < 22; i++) {
    if (!pattern[i % 7]) continue;
    addBox(grp, 0.028, 0.018, 0.12, mats.ebony, -0.67 + i * 0.054, 0.8, 0.2);
  }
  const desk = mark(addBox(grp, 1.05, 0.28, 0.03, mats.pianoDark, 0, 1.08, 0.08));
  desk.rotation.x = -0.42;
  mark(addBox(grp, 0.26, 0.004, 0.32, mats.paper, -0.1, 1.16, 0.14), 'none');
  mark(addBox(grp, 0.26, 0.004, 0.32, mats.paper, 0.14, 1.165, 0.12), 'none');
  for (const dx of [-0.1, 0.14]) {
    for (const dz of [-0.08, -0.03, 0.02, 0.07]) {
      mark(addBox(grp, 0.2, 0.003, 0.006, mats.stave, dx, 1.17, 0.13 + dz), 'none');
    }
  }
  addCyl(grp, 0.012, 0.012, 0.08, mats.brass, -0.22, 0.04, 0.26, 8);
  addCyl(grp, 0.012, 0.012, 0.08, mats.brass, 0, 0.04, 0.26, 8);
  addCyl(grp, 0.012, 0.012, 0.08, mats.brass, 0.22, 0.04, 0.26, 8);
  addCyl(grp, 0.035, 0.055, 0.05, mats.brass, 0.48, 1.32, -0.08, 10);
  const glow = addCyl(grp, 0.028, 0.028, 0.03, mats.bulb, 0.48, 1.26, -0.08, 8);
  mark(glow, 'none');
  g.add(grp);
}

function drumKit(g, mats, spec, y0) {
  const grp = new THREE.Group();
  grp.position.set(spec.x, y0, spec.z);
  const kick = addCyl(grp, 0.26, 0.26, 0.4, mats.drum, 0, 0.28, -0.02, 18);
  kick.rotation.x = Math.PI / 2;
  const head = addCyl(grp, 0.24, 0.24, 0.02, mats.drumSkin, 0, 0.28, 0.19, 16);
  head.rotation.x = Math.PI / 2;
  mark(head, 'none');
  addCyl(grp, 0.16, 0.16, 0.12, mats.drum, 0.22, 0.62, 0.12, 14);
  addCyl(grp, 0.15, 0.15, 0.02, mats.drumSkin, 0.22, 0.69, 0.12, 14);
  addCyl(grp, 0.014, 0.014, 0.55, mats.chrome, 0.22, 0.32, 0.12, 6);
  addCyl(grp, 0.14, 0.14, 0.12, mats.drum, -0.18, 0.78, -0.08, 14);
  addCyl(grp, 0.13, 0.13, 0.02, mats.drumSkin, -0.18, 0.85, -0.08, 14);
  addCyl(grp, 0.014, 0.014, 0.7, mats.chrome, -0.18, 0.4, -0.08, 6);
  const hatA = addCyl(grp, 0.16, 0.16, 0.012, mats.cymbal, -0.38, 0.92, 0.16, 16);
  const hatB = addCyl(grp, 0.15, 0.15, 0.01, mats.cymbal, -0.38, 0.9, 0.16, 16);
  mark(hatA, 'none');
  mark(hatB, 'none');
  addCyl(grp, 0.012, 0.012, 0.9, mats.chrome, -0.38, 0.46, 0.16, 6);
  const ride = addCyl(grp, 0.22, 0.22, 0.012, mats.cymbal, 0.48, 1.08, -0.12, 18);
  mark(ride, 'none');
  addCyl(grp, 0.012, 0.012, 1.05, mats.chrome, 0.48, 0.54, -0.12, 6);
  addCyl(grp, 0.14, 0.14, 0.05, mats.pianoDark, 0.02, 0.52, 0.52, 12);
  addCyl(grp, 0.03, 0.04, 0.48, mats.chrome, 0.02, 0.26, 0.52, 8);
  g.add(grp);
}

function guitarOnStand(g, mats, x, z) {
  const grp = new THREE.Group();
  const wood = mats.woodG;
  const dark = mats.pianoDark;
  const lower = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.21, 0.07, 16), wood);
  lower.rotation.x = Math.PI / 2;
  lower.position.set(0, 0.42, 0);
  grp.add(lower);
  const upper = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.14, 0.06, 16), wood);
  upper.rotation.x = Math.PI / 2;
  upper.position.set(0, 0.66, 0);
  grp.add(upper);
  addBox(grp, 0.15, 0.12, 0.05, wood, 0, 0.54, 0);
  const hole = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.02, 12), dark);
  hole.rotation.x = Math.PI / 2;
  hole.position.set(0, 0.66, 0.03);
  grp.add(hole);
  addBox(grp, 0.042, 0.6, 0.038, dark, 0, 1.05, 0);
  addBox(grp, 0.07, 0.13, 0.032, wood, 0, 1.38, 0);
  addBox(grp, 0.12, 0.025, 0.02, dark, 0, 1.4, 0);
  addCyl(grp, 0.014, 0.014, 0.72, mats.chrome, 0.08, 0.38, 0.02, 6);
  addCyl(grp, 0.014, 0.014, 0.72, mats.chrome, -0.08, 0.38, 0.02, 6);
  addBox(grp, 0.22, 0.02, 0.08, mats.iron, 0, 0.08, 0.04);
  grp.position.set(x, 0.02, z);
  grp.rotation.set(0.12, 0.55, -0.32);
  grp.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  g.add(grp);
}

function micStand(g, mats, x, z) {
  addCyl(g, 0.14, 0.16, 0.025, mats.iron, x, 0.02, z, 12);
  addCyl(g, 0.01, 0.012, 1.05, mats.chrome, x, 0.55, z, 8);
  const boom = addCyl(g, 0.008, 0.008, 0.38, mats.chrome, x + 0.12, 1.12, z + 0.08, 6);
  boom.rotation.z = 0.55;
  boom.rotation.x = -0.25;
  const mic = addCyl(g, 0.018, 0.028, 0.1, mats.iron, x + 0.28, 1.22, z + 0.14, 10);
  mic.rotation.z = 1.1;
  mark(mic, 'none');
  addCyl(g, 0.012, 0.012, 0.03, mats.chrome, x + 0.28, 1.22, z + 0.14, 8);
}

function musicStand(g, mats, x, z, rotY = 0) {
  const grp = new THREE.Group();
  addCyl(grp, 0.012, 0.012, 1.18, mats.chrome, 0, 0.62, 0, 8);
  for (let i = 0; i < 3; i++) {
    const a = (i * Math.PI * 2) / 3;
    const leg = addBox(grp, 0.22, 0.012, 0.022, mats.chrome, Math.cos(a) * 0.12, 0.012, Math.sin(a) * 0.12);
    leg.rotation.y = -a;
  }
  const desk = mark(addBox(grp, 0.38, 0.28, 0.012, mats.iron, 0, 1.22, 0.02), 'none');
  desk.rotation.x = -0.28;
  const lip = addBox(grp, 0.38, 0.018, 0.03, mats.iron, 0, 1.08, 0.12);
  mark(lip, 'none');
  mark(addBox(grp, 0.24, 0.002, 0.3, mats.paper, 0, 1.24, 0.04), 'none');
  for (const dy of [-0.06, -0.02, 0.02, 0.06]) {
    mark(addBox(grp, 0.18, 0.003, 0.005, mats.stave, 0, 1.245, 0.04 + dy), 'none');
  }
  grp.position.set(x, 0, z);
  grp.rotation.y = rotY;
  g.add(grp);
}

function speakerStand(g, mats, spec) {
  const { x, z, y: h } = spec;
  addCyl(g, 0.16, 0.19, 0.03, mats.iron, x, 0.016, z, 16);
  addCyl(g, 0.018, 0.024, h - 0.05, mats.chrome, x, h / 2, z, 10);
  mark(addBox(g, 0.22, 0.018, 0.16, mats.iron, x, h - 0.01, z), 'receive');
  for (let i = 0; i < 3; i++) {
    const a = (i * Math.PI * 2) / 3;
    const foot = addBox(g, 0.2, 0.012, 0.024, mats.iron, x + Math.cos(a) * 0.11, 0.012, z + Math.sin(a) * 0.11);
    foot.rotation.y = -a;
  }
}

function mixer(g, mats, x, y, z) {
  mark(addBox(g, 0.42, 0.08, 0.28, mats.mixer, x, y + 0.04, z));
  for (let i = 0; i < 6; i++) {
    addCyl(g, 0.012, 0.012, 0.02, mats.chrome, x - 0.14 + i * 0.055, y + 0.09, z + 0.04, 8);
  }
  mark(addBox(g, 0.12, 0.04, 0.08, mats.led, x + 0.1, y + 0.1, z - 0.04), 'none');
}

function cables(g, mats, m) {
  const y = m.a.dais.h + 0.012;
  addCyl(g, 0.012, 0.012, 1.15, mats.cable, 0.85, y, -2.85, 6).rotation.z = Math.PI / 2;
  addCyl(g, 0.012, 0.012, 0.85, mats.cable, 2.05, y, -3.15, 6).rotation.z = Math.PI / 2;
  mark(addBox(g, 0.16, 0.03, 0.12, mats.iron, 0.15, y + 0.01, -2.28), 'none');
}

function coachTable(g, mats, x, z) {
  mark(addBox(g, 0.58, 0.05, 0.58, mats.oak, x, 0.72, z));
  for (const [dx, dz] of [[-0.22, -0.22], [0.22, -0.22], [-0.22, 0.22], [0.22, 0.22]]) {
    addCyl(g, 0.028, 0.032, 0.7, mats.walnut, x + dx, 0.35, z + dz, 8);
  }
}

function scores(g, mats, layout) {
  const shelf = (layout.instances || []).find((i) => i.id === 'score_shelf');
  if (!shelf) return;
  const [x, y, z] = shelf.position;
  for (let i = 0; i < 7; i++) {
    const mat = mats.folder[i % mats.folder.length];
    mark(addBox(g, 0.04, 0.22 + (i % 3) * 0.03, 0.16, mat, x + 0.06, y + 0.16, z - 0.22 + i * 0.075), 'none');
  }
}

function fig(g, mats, x, z) {
  addCyl(g, 0.016, 0.026, 0.32, mats.stem, x, 0.42, z, 6);
  mark(addBox(g, 0.26, 0.14, 0.2, mats.leaf, x, 0.66, z), 'none');
  mark(addBox(g, 0.16, 0.11, 0.14, mats.leafDeep, x + 0.08, 0.78, z - 0.04), 'none');
  mark(addBox(g, 0.12, 0.09, 0.12, mats.leaf, x - 0.07, 0.74, z + 0.05), 'none');
}

function pendantBulbs(g, mats, layout) {
  for (const inst of layout.instances || []) {
    if (inst.kind !== 'pendant_lamp') continue;
    const [x, y, z] = inst.position;
    mark(addCyl(g, 0.045, 0.045, 0.06, mats.bulb, x, y + 0.14, z, 10), 'none');
  }
}

function makeProcedural(layout) {
  const g = new THREE.Group();
  g.name = 'procedural';
  const mats = palette(layout);
  const m = metrics(layout);
  const tex = contactTexture();
  const yDais = m.a.dais.h;

  uprightPiano(g, mats, m.a.piano, yDais);
  drumKit(g, mats, m.a.drums, yDais);
  guitarOnStand(g, mats, -4.15, -1.35);
  musicStand(g, mats, 1.55, -1.92, -0.22);
  musicStand(g, mats, -1.55, -1.95, 0.22);
  micStand(g, mats, 0.55, -2.42);
  speakerStand(g, mats, m.a.speakers.left);
  speakerStand(g, mats, m.a.speakers.right);
  mixer(g, mats, 2.12, yDais, -3.12);
  cables(g, mats, m);
  coachTable(g, mats, 3.5, 1.22);
  scores(g, mats, layout);
  pendantBulbs(g, mats, layout);

  const pot = (layout.instances || []).find((i) => i.kind === 'flowerpot');
  if (pot) fig(g, mats, pot.position[0], pot.position[2]);

  contact(g, tex, m.a.piano.x, m.a.piano.z, 1.6, 0.85, 0.42, yDais + 0.01);
  const pb = m.a.pianoBench;
  contact(g, tex, pb.x, pb.z, 0.7, 0.45, 0.35, yDais + 0.01);
  contact(g, tex, m.a.drums.x, m.a.drums.z, 1.15, 1.05, 0.38, yDais + 0.01);
  contact(g, tex, m.a.speakers.left.x, m.a.speakers.left.z, 0.5, 0.5, 0.3);
  contact(g, tex, m.a.speakers.right.x, m.a.speakers.right.z, 0.5, 0.5, 0.3);
  for (const ch of m.a.listening.chairs) {
    contact(g, tex, ch.x, m.a.listening.z, 0.42, 0.42, 0.14, 0.026);
  }
  contact(g, tex, m.a.coach.x, m.a.coach.z, 0.42, 0.42, 0.16, 0.026);
  contact(g, tex, 3.5, 1.22, 0.7, 0.7, 0.28);
  contact(g, tex, -4.15, -1.35, 0.45, 0.45, 0.28);
  contact(g, tex, m.a.scoreRack.x, m.a.scoreRack.z, 0.55, 0.45, 0.3);
  if (pot) contact(g, tex, pot.position[0], pot.position[2], 0.32, 0.32, 0.35);
  return g;
}

boot({
  makeShell,
  makeProcedural,
  readyText: 'ready — rehearsal hall · drag orbit · U unlit · T toon',
});
