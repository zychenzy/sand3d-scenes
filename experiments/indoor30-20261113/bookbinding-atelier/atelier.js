import * as THREE from 'three';
import {
  boot, toon, addBox, addCyl, addContact, makeCutawayShell, meshExtent,
} from './scene_lib.js';

const labelCache = new Map();
let grainMap = null;

function S(layout, name) {
  return layout.meta.stations[name];
}

function grain() {
  if (grainMap) return grainMap;
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 32;
  const g = c.getContext('2d');
  for (let x = 0; x < 128; x += 2) {
    const n = (x / 2) % 6;
    g.fillStyle = n === 0 ? '#a8844e' : n === 3 ? '#d2b07a' : '#c4a06a';
    g.fillRect(x, 0, 2, 32);
  }
  grainMap = new THREE.CanvasTexture(c);
  grainMap.wrapS = THREE.RepeatWrapping;
  grainMap.wrapT = THREE.RepeatWrapping;
  grainMap.magFilter = THREE.NearestFilter;
  grainMap.minFilter = THREE.NearestFilter;
  grainMap.colorSpace = THREE.SRGBColorSpace;
  return grainMap;
}

function benchTopMat(repeats) {
  const map = grain().clone();
  map.repeat.set(repeats, 2);
  map.needsUpdate = true;
  return toon('#ffffff', { map });
}

function labelMat(text, bg = '#f4efe4', fg = '#2a1c14', glow = 0.35) {
  const key = `${text}|${bg}|${fg}|${glow}`;
  if (labelCache.has(key)) return labelCache.get(key);
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 256, 64);
  ctx.fillStyle = fg;
  ctx.font = '700 36px ui-sans-serif, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 128, 34);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  const mat = toon('#ffffff', {
    map: tex,
    emissive: glow ? '#fff8ee' : '#000000',
    emissiveIntensity: glow,
  });
  labelCache.set(key, mat);
  return mat;
}

function quiet(mesh) {
  mesh.castShadow = false;
  mesh.userData.noCast = true;
  return mesh;
}

function cylX(g, r, len, mat, x, y, z, seg = 8) {
  const m = addCyl(g, r, r, len, mat, x, y, z, seg);
  m.rotation.z = Math.PI / 2;
  return m;
}

function labeledPlate(g, w, h, text, x, y, z, face) {
  const label = labelMat(text);
  const edge = toon('#f4efe4');
  const geo = face === 'x'
    ? new THREE.BoxGeometry(0.01, h, w)
    : new THREE.BoxGeometry(w, h, 0.01);
  const mats = face === 'x'
    ? [label, edge, edge, edge, edge, edge]
    : [edge, edge, edge, edge, label, edge];
  const m = new THREE.Mesh(geo, mats);
  m.position.set(x, y, z);
  quiet(m);
  g.add(m);
  return m;
}

function floorPlanks(g, W, D) {
  const colors = ['#c4a574', '#b99662', '#c9aa78', '#c0a06c'];
  const step = 0.18;
  const n = Math.floor((D - 0.3) / step);
  for (let i = 0; i < n; i++) {
    const z = -D / 2 + 0.18 + i * step;
    const m = addBox(g, W - 0.24, 0.014, step - 0.008, toon(colors[i % 4]), 0, 0.007, z);
    m.receiveShadow = true;
    quiet(m);
  }
  const edge = toon('#6a4630');
  quiet(addBox(g, W - 0.12, 0.02, 0.06, edge, 0, 0.012, -D / 2 + 0.08));
  quiet(addBox(g, W - 0.12, 0.02, 0.06, edge, 0, 0.012, D / 2 - 0.08));
  quiet(addBox(g, 0.06, 0.02, D - 0.12, edge, -W / 2 + 0.08, 0.012, 0));
}

function wainscot(g, W, D) {
  const wood = toon('#6b4630');
  const dark = toon('#4a3122');
  const h = 0.96;
  const backZ = -D / 2 + 0.09;
  addBox(g, W - 0.2, h, 0.028, wood, 0.1, h / 2, backZ);
  addBox(g, W - 0.16, 0.045, 0.04, dark, 0.1, h - 0.01, backZ + 0.01);
  addBox(g, W - 0.16, 0.08, 0.04, dark, 0.1, 0.04, backZ + 0.01);
  for (let x = -W / 2 + 0.55; x < W / 2 - 0.4; x += 0.95) {
    addBox(g, 0.035, h - 0.16, 0.016, dark, x, h / 2, backZ + 0.02);
  }
  const leftX = -W / 2 + 0.09;
  addBox(g, 0.028, h, D - 0.24, wood, leftX, h / 2, 0.05);
  addBox(g, 0.04, 0.045, D - 0.2, dark, leftX + 0.01, h - 0.01, 0.05);
  addBox(g, 0.04, 0.08, D - 0.2, dark, leftX + 0.01, 0.04, 0.05);
}

function clerestory(g, W) {
  const z0 = 0.4;
  const z1 = 2.65;
  const y0 = 2.05;
  const y1 = 2.78;
  const zc = (z0 + z1) / 2;
  const yc = (y0 + y1) / 2;
  const glass = toon('#b7cfe6', { transparent: true, opacity: 0.28, depthWrite: false });
  const frame = toon('#5c3d28');
  const pane = addBox(g, 0.02, y1 - y0 - 0.08, z1 - z0 - 0.08, glass, -W / 2 + 0.1, yc, zc);
  pane.userData.noReceive = true;
  quiet(pane);
  for (let i = 0; i <= 3; i++) {
    const z = z0 + ((z1 - z0) * i) / 3;
    quiet(addBox(g, 0.04, y1 - y0 + 0.02, 0.045, frame, -W / 2 + 0.11, yc, z));
  }
  quiet(addBox(g, 0.08, 0.05, z1 - z0 + 0.06, frame, -W / 2 + 0.11, y0 - 0.02, zc));
  quiet(addBox(g, 0.06, 0.04, z1 - z0 + 0.06, frame, -W / 2 + 0.1, y1 + 0.01, zc));
}

function ceiling(g, W, D, H) {
  const plaster = toon('#f3eee6');
  const slab = addBox(g, W, 0.07, D, plaster, 0, H - 0.035, 0);
  slab.userData.noReceive = true;
  quiet(slab);
  const beam = toon('#5c3d28');
  const beamY = H - 0.12;
  for (const z of [-3.45, -2.35, -1.25, -0.15, 0.95, 2.05]) {
    quiet(addBox(g, W - 0.36, 0.1, 0.08, beam, 0, beamY, z));
  }
  quiet(addBox(g, W - 0.2, 0.14, 0.1, beam, 0, beamY, -D / 2 + 0.1));
  quiet(addBox(g, W - 0.2, 0.14, 0.1, beam, 0, beamY, D / 2 - 0.1));
  quiet(addBox(g, 0.1, 0.14, D - 0.24, beam, -W / 2 + 0.12, beamY, 0));
  quiet(addBox(g, 0.1, 0.14, D - 0.24, beam, W / 2 - 0.1, beamY, 0));
}

function sectionSkirt(g, W, D) {
  const wood = toon('#5a3c28');
  quiet(addBox(g, W + 0.06, 0.1, 0.05, wood, 0, -0.02, D / 2 + 0.012));
  quiet(addBox(g, 0.05, 0.1, D + 0.06, wood, W / 2 + 0.012, -0.02, 0));
}

function workStool(g, spec) {
  const root = new THREE.Group();
  root.name = spec.id;
  const seatH = spec.seat;
  const wood = toon('#8a5a36');
  const dark = toon('#4e3422');
  addBox(root, 0.38, 0.04, 0.34, wood, 0, seatH - 0.02, 0);
  const ix = 0.14;
  const iz = 0.11;
  const legH = seatH - 0.06;
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      addBox(root, 0.038, legH, 0.038, dark, sx * ix, legH / 2, sz * iz);
    }
  }
  addBox(root, ix * 2, 0.026, 0.026, dark, 0, 0.16, -iz);
  addBox(root, ix * 2, 0.026, 0.026, dark, 0, 0.16, iz);
  addBox(root, 0.026, 0.026, iz * 2, dark, -ix, 0.16, 0);
  addBox(root, 0.026, 0.026, iz * 2, dark, ix, 0.16, 0);
  root.position.set(spec.position[0], spec.position[1], spec.position[2]);
  root.rotation.y = spec.rotationY || 0;
  g.add(root);
  addContact(g, spec.position[0], spec.position[2], 0.4, 0.36, 0.2);
}

function sewingFrame(g, x, z, top) {
  const wood = toon('#6b4a32');
  const dark = toon('#4a3122');
  const cord = toon('#f6f1e6');
  const h = 0.4;
  const half = 0.19;
  addBox(g, 0.032, h, 0.032, wood, x - half, top + h / 2, z);
  addBox(g, 0.032, h, 0.032, wood, x + half, top + h / 2, z);
  addBox(g, 0.44, 0.028, 0.038, dark, x, top + h - 0.02, z);
  addBox(g, 0.42, 0.022, 0.028, wood, x, top + 0.07, z);
  for (let i = 0; i < 5; i++) {
    const cx = x - 0.14 + i * 0.07;
    quiet(addCyl(g, 0.004, 0.004, 0.28, cord, cx, top + 0.22, z, 6));
    addBox(g, 0.018, 0.016, 0.028, dark, cx, top + h - 0.012, z + 0.02);
  }
  for (let i = 0; i < 6; i++) {
    const leaf = addBox(
      g, 0.17, 0.007, 0.11,
      toon(i % 2 ? '#f7f3ea' : '#ebe3d2'),
      x, top + 0.012 + i * 0.009, z + 0.1,
    );
    leaf.rotation.y = (i - 2.5) * 0.02;
    quiet(leaf);
  }
  addBox(g, 0.012, 0.05, 0.012, toon('#7a2e2a'), x + 0.02, top + 0.07, z + 0.1);
}

function lyingPress(g, s, bench) {
  const wood = toon('#5c3d28');
  const brass = toon('#c6a15a');
  const x = s.x;
  const z = bench.z + 0.08;
  const top = bench.top;
  const cheekY = top + 0.09;
  addBox(g, 0.62, 0.16, 0.045, wood, x, cheekY, z - 0.1);
  addBox(g, 0.62, 0.16, 0.045, wood, x, cheekY, z + 0.1);
  for (const dx of [-0.2, 0.2]) {
    const screw = addCyl(g, 0.02, 0.02, 0.26, brass, x + dx, cheekY, z, 8);
    screw.rotation.x = Math.PI / 2;
    cylX(g, 0.014, 0.12, wood, x + dx, cheekY, z + 0.16, 6);
    addCyl(g, 0.022, 0.022, 0.03, brass, x + dx - 0.06, cheekY, z + 0.16, 8);
    addCyl(g, 0.022, 0.022, 0.03, brass, x + dx + 0.06, cheekY, z + 0.16, 8);
  }
  addBox(g, 0.32, 0.016, 0.16, toon('#3d5a42'), x, top + 0.01, z);
  addBox(g, 0.26, 0.05, 0.14, toon('#f7f3ea'), x, top + 0.042, z);
  addBox(g, 0.32, 0.016, 0.16, toon('#3d5a42'), x, top + 0.076, z);
  addBox(g, 0.08, 0.05, 0.055, wood, x + 0.06, cheekY + 0.07, z + 0.12);
  quiet(addBox(g, 0.055, 0.012, 0.018, toon('#d5dbe3'), x + 0.06, cheekY, z + 0.05));
}

function benchTools(g, bench) {
  const z = -bench.spanZ / 2 + bench.z - 0.02;
  const railY = 1.58;
  const wood = toon('#4a3122');
  quiet(addBox(g, 1.7, 0.028, 0.028, wood, bench.x - 0.15, railY, z));
  const spots = [-2.85, -2.55, -2.25, -1.95, -1.65];
  const ivory = toon('#f3efe4');
  const steel = toon('#c5ccd2');
  const handle = toon('#6b4a32');
  spots.forEach((x) => {
    const peg = addCyl(g, 0.007, 0.007, 0.035, toon('#f7f1e6'), x, railY - 0.02, z + 0.02, 6);
    peg.rotation.x = Math.PI / 2;
    quiet(peg);
  });
  const folder = addBox(g, 0.012, 0.14, 0.016, ivory, spots[0], railY - 0.1, z + 0.03);
  folder.rotation.z = 0.15;
  quiet(folder);
  const folder2 = addBox(g, 0.012, 0.12, 0.014, ivory, spots[1], railY - 0.09, z + 0.03);
  folder2.rotation.z = -0.2;
  quiet(folder2);
  quiet(addCyl(g, 0.01, 0.012, 0.07, handle, spots[2], railY - 0.06, z + 0.03, 6));
  quiet(addCyl(g, 0.003, 0.003, 0.08, steel, spots[2], railY - 0.14, z + 0.03, 4));
  const knife = addBox(g, 0.012, 0.11, 0.006, steel, spots[3], railY - 0.1, z + 0.03);
  knife.rotation.z = 0.08;
  quiet(knife);
  quiet(addBox(g, 0.02, 0.045, 0.014, handle, spots[3], railY - 0.035, z + 0.03));
  quiet(addCyl(g, 0.012, 0.012, 0.11, handle, spots[4], railY - 0.08, z + 0.03, 6));
  quiet(addBox(g, 0.055, 0.028, 0.028, steel, spots[4], railY - 0.15, z + 0.03));
  const spoolY = railY + 0.06;
  for (const [dx, color] of [[-0.35, '#f4efe4'], [0.0, '#7a2e2a'], [0.28, '#2c3d66']]) {
    const spool = addCyl(g, 0.034, 0.034, 0.028, toon(color), bench.x + dx, spoolY, z + 0.02, 12);
    spool.rotation.x = Math.PI / 2;
    quiet(spool);
  }
}

function sewingBench(g, layout) {
  const bench = S(layout, 'sewing');
  const lying = S(layout, 'lying');
  const edge = toon('#8d6844');
  const top = new THREE.Mesh(
    new THREE.BoxGeometry(bench.spanX, 0.05, bench.spanZ),
    [edge, edge, benchTopMat(8), edge, edge, edge],
  );
  top.position.set(bench.x, bench.top - 0.025, bench.z);
  top.name = 'sewing-top';
  top.castShadow = true;
  top.receiveShadow = true;
  g.add(top);
  const legH = bench.top - 0.05;
  const lx = bench.spanX / 2 - 0.08;
  const lz = bench.spanZ / 2 - 0.07;
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      addBox(g, 0.06, legH, 0.06, toon('#5c3d28'), bench.x + sx * lx, legH / 2, bench.z + sz * lz);
    }
  }
  addBox(g, bench.spanX - 0.2, 0.025, 0.08, toon('#4a3122'), bench.x, 0.22, bench.z);
  sewingFrame(g, bench.x - 0.7, bench.z + 0.06, bench.top);
  sewingFrame(g, bench.x - 0.05, bench.z + 0.06, bench.top);
  lyingPress(g, lying, bench);
  benchTools(g, bench);
  addContact(g, bench.x, bench.z + 0.05, bench.spanX * 0.92, bench.spanZ + 0.2, 0.26);
}

function standingPress(g, layout) {
  const s = S(layout, 'press');
  const root = new THREE.Group();
  root.name = 'press-root';
  const wood = toon('#5a3a26');
  const light = toon('#7a5436');
  const brass = toon('#c6a15a');
  addBox(root, s.spanX, 0.1, s.spanZ, wood, s.x, 0.05, s.z);
  const postH = s.h - 0.32;
  const gap = 0.4;
  for (const dx of [-(gap / 2 + 0.04), gap / 2 + 0.04]) {
    addBox(root, 0.07, postH, 0.36, wood, s.x + dx, 0.1 + postH / 2, s.z - 0.02);
  }
  addBox(root, gap + 0.16, 0.08, 0.4, light, s.x, s.h - 0.22, s.z);
  addCyl(root, 0.06, 0.06, 0.58, brass, s.x, s.h - 0.5, s.z + 0.16, 14);
  cylX(root, 0.024, 0.58, light, s.x, s.h - 0.05, s.z + 0.16, 8);
  addCyl(root, 0.042, 0.042, 0.05, brass, s.x - 0.29, s.h - 0.05, s.z + 0.16, 8);
  addCyl(root, 0.042, 0.042, 0.05, brass, s.x + 0.29, s.h - 0.05, s.z + 0.16, 8);
  addBox(root, 0.32, 0.045, 0.34, light, s.x, 0.86, s.z + 0.12);
  addBox(root, 0.28, 0.02, 0.3, toon('#e7d3b0'), s.x, 0.72, s.z + 0.05);
  addBox(root, 0.22, 0.055, 0.24, toon('#f7f3ea'), s.x, 0.758, s.z + 0.05);
  addBox(root, 0.26, 0.016, 0.28, toon('#2c3d66'), s.x, 0.794, s.z + 0.05);
  const lean = addBox(root, 0.02, 0.36, 0.26, toon('#c4a06a'), s.x + 0.28, 0.28, s.z);
  lean.rotation.z = -0.18;
  g.add(root);
  addContact(g, s.x, s.z, s.spanX * 0.95, s.spanZ, 0.28);
}

function guillotine(g, layout) {
  const s = S(layout, 'guillotine');
  const steel = toon('#8d949c');
  const dark = toon('#3c444c');
  const brass = toon('#c6a15a');
  const wood = toon('#5c3d28');
  const bedT = 0.05;
  const bed = addBox(g, s.spanX, bedT, s.spanZ, dark, s.x, s.top - bedT / 2, s.z);
  bed.name = 'guillotine-top';
  const lx = s.spanX / 2 - 0.08;
  const lz = s.spanZ / 2 - 0.08;
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      addBox(g, 0.055, s.top - bedT, 0.055, steel, s.x + sx * lx, (s.top - bedT) / 2, s.z + sz * lz);
    }
  }
  addBox(g, s.spanX - 0.16, 0.02, s.spanZ - 0.16, dark, s.x, 0.32, s.z);
  addBox(g, s.spanX - 0.06, 0.06, 0.022, steel, s.x, s.top + 0.03, s.z - s.spanZ / 2 + 0.035);
  addBox(g, s.spanX * 0.62, 0.03, 0.035, steel, s.x + 0.08, s.top + 0.08, s.z - 0.06);
  addCyl(g, 0.04, 0.04, 0.018, brass, s.x + 0.08, s.top + 0.11, s.z - 0.06, 10);
  addBox(g, 0.4, 0.028, 0.48, toon('#f7f3ea'), s.x + 0.28, s.top + 0.014, s.z + 0.02);
  quiet(addBox(g, 0.38, 0.004, 0.46, toon('#efe4cc'), s.x + 0.28, s.top + 0.03, s.z + 0.02));
  quiet(addBox(g, s.spanX - 0.12, 0.012, 0.016, brass, s.x, s.top + 0.008, s.z + s.spanZ / 2 - 0.03));

  const pivotX = s.x - s.spanX / 2 + 0.08;
  const ang = 1.22;
  const armLen = 0.78;
  addBox(g, 0.1, 0.16, 0.12, dark, pivotX, s.top + 0.08, s.z - 0.02);
  const arm = addBox(g, armLen, 0.07, 0.018, toon('#c5ced6'), 0, 0, 0);
  const midX = pivotX + Math.cos(ang) * armLen * 0.5;
  const midY = s.top + 0.08 + Math.sin(ang) * armLen * 0.5;
  arm.position.set(midX, midY, s.z + 0.02);
  arm.rotation.z = ang;
  const tipX = pivotX + Math.cos(ang) * armLen;
  const tipY = s.top + 0.08 + Math.sin(ang) * armLen;
  addBox(g, 0.08, 0.05, 0.05, wood, tipX, tipY, s.z + 0.02);
  const crateX = s.x + 0.95;
  const crateZ = s.z + 1.2;
  addBox(g, 0.32, 0.16, 0.26, wood, crateX, 0.08, crateZ);
  for (let i = 0; i < 4; i++) {
    const scrap = addBox(
      g, 0.16, 0.004, 0.08, toon('#f4efe4'),
      crateX + (i % 2) * 0.03,
      0.17 + i * 0.006,
      crateZ,
    );
    scrap.rotation.y = (i - 1.5) * 0.2;
    quiet(scrap);
  }
  addContact(g, s.x, s.z, s.spanX * 0.9, s.spanZ * 0.9, 0.24);
}

function paperDrawers(g, layout) {
  const s = S(layout, 'drawers');
  const root = new THREE.Group();
  root.name = 'drawer-root';
  const wood = toon('#5c3d28');
  const face = toon('#6d4a34');
  const brass = toon('#c6a15a');
  addBox(root, s.spanX, s.h, s.spanZ, wood, s.x, s.h / 2, s.z);
  addBox(root, s.spanX + 0.04, 0.035, s.spanZ + 0.03, toon('#4a3122'), s.x, s.h + 0.01, s.z);
  const labels = ['BOARD', 'TISSUE', 'MARBLE', 'END', 'TEXT'];
  const n = labels.length;
  const inner = s.h - 0.14;
  const dh = inner / n;
  const openAt = 2;
  for (let i = 0; i < n; i++) {
    const yy = 0.08 + dh * i + dh / 2;
    const pull = i === openAt ? 0.34 : 0;
    const frontX = s.x + s.spanX / 2 + 0.012 + pull;
    addBox(root, 0.02, dh - 0.016, s.spanZ - 0.1, face, frontX, yy, s.z);
    labeledPlate(root, 0.36, Math.min(0.07, dh * 0.55), labels[i], frontX + 0.014, yy, s.z, 'x');
    const handle = addCyl(root, 0.008, 0.008, 0.16, brass, frontX + 0.02, yy, s.z + 0.18, 6);
    handle.rotation.x = Math.PI / 2;
    if (i === openAt) {
      const deckX = s.x + s.spanX / 2 + pull * 0.42;
      addBox(root, pull * 0.8, 0.016, s.spanZ - 0.16, toon('#efe6d4'), deckX, yy - dh * 0.22, s.z);
      const sheet = addBox(
        root, pull * 0.62, 0.004, s.spanZ * 0.55,
        toon('#f7f3ea'),
        deckX,
        yy + dh * 0.18,
        s.z,
      );
      quiet(sheet);
    }
  }
  const dial = addCyl(root, 0.05, 0.05, 0.016, toon('#f7f1e6'), s.x, s.h * 0.62, s.z + s.spanZ / 2 + 0.012, 16);
  dial.rotation.x = Math.PI / 2;
  quiet(addBox(root, 0.004, 0.028, 0.006, toon('#7a2e2a'), s.x, s.h * 0.64, s.z + s.spanZ / 2 + 0.022));
  g.add(root);
  addContact(g, s.x + 0.05, s.z, s.spanX + 0.2, s.spanZ * 0.9, 0.22);
}

function drape(g, x, y, z) {
  const a = addBox(g, 0.15, 0.005, 0.1, toon('#f4efe4'), x, y + 0.035, z - 0.04);
  a.rotation.x = 0.7;
  quiet(a);
  const b = addBox(g, 0.15, 0.005, 0.1, toon('#efe6d4'), x, y + 0.035, z + 0.04);
  b.rotation.x = -0.7;
  quiet(b);
}

function dryingRack(g, layout) {
  const s = S(layout, 'rack');
  const root = new THREE.Group();
  root.name = 'rack-root';
  const wood = toon('#6b4a32');
  const hx = s.spanX / 2 - 0.03;
  const hz = s.spanZ / 2 - 0.03;
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      addBox(root, 0.038, s.h, 0.038, wood, s.x + sx * hx, s.h / 2, s.z + sz * hz);
    }
  }
  const rods = [0.42, 0.74, 1.04, 1.3];
  rods.forEach((y) => cylX(root, 0.02, s.spanX - 0.12, toon('#8d6844'), s.x, y, s.z, 8));
  const colors = ['#7a2e2a', '#2c3d66', '#3d5a42', '#8a3a3a', '#1e2a44', '#c4a06a', '#4a3122'];
  const stand = (rod, dx, color) => {
    addBox(root, 0.045, 0.2, 0.14, toon(color), s.x + dx, rod + 0.12, s.z);
  };
  stand(rods[0], -0.36, colors[0]);
  stand(rods[0], -0.26, colors[1]);
  stand(rods[0], 0.24, colors[2]);
  stand(rods[1], -0.12, colors[3]);
  stand(rods[1], 0.32, colors[4]);
  drape(root, s.x + 0.08, rods[1], s.z);
  stand(rods[2], -0.3, colors[5]);
  stand(rods[2], 0.16, colors[6]);
  drape(root, s.x - 0.18, rods[3], s.z);
  g.add(root);
  addContact(g, s.x, s.z, s.spanX, s.spanZ + 0.12, 0.22);
}

function forwardingBench(g, layout) {
  const s = S(layout, 'forward');
  const edge = toon('#8d6844');
  const top = new THREE.Mesh(
    new THREE.BoxGeometry(s.spanX, 0.05, s.spanZ),
    [edge, edge, benchTopMat(7), edge, edge, edge],
  );
  top.position.set(s.x, s.top - 0.025, s.z);
  top.name = 'forward-top';
  top.castShadow = true;
  top.receiveShadow = true;
  g.add(top);
  const legH = s.top - 0.05;
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      addBox(
        g, 0.06, legH, 0.06, toon('#5c3d28'),
        s.x + sx * (s.spanX / 2 - 0.08),
        legH / 2,
        s.z + sz * (s.spanZ / 2 - 0.07),
      );
    }
  }
  const sheet = addBox(g, 0.7, 0.004, 0.48, toon('#f7f3ea'), s.x - 0.05, s.top + 0.004, s.z + 0.02);
  sheet.rotation.y = -0.04;
  quiet(sheet);
  addBox(g, 0.2, 0.012, 0.28, toon('#d8c4a0'), s.x - 0.15, s.top + 0.012, s.z);
  addBox(g, 0.16, 0.04, 0.24, toon('#f4efe4'), s.x - 0.15, s.top + 0.038, s.z);
  addBox(g, 0.18, 0.012, 0.26, toon('#7a2e2a'), s.x - 0.15, s.top + 0.064, s.z);
  addCyl(g, 0.055, 0.055, 0.025, toon('#4a4e52'), s.x + 0.28, s.top + 0.016, s.z + 0.08, 12);
  addCyl(g, 0.04, 0.04, 0.02, toon('#3c444c'), s.x + 0.4, s.top + 0.014, s.z - 0.06, 10);
  const folder = addBox(g, 0.14, 0.012, 0.016, toon('#f3efe4'), s.x + 0.15, s.top + 0.01, s.z + 0.16);
  folder.rotation.y = 0.5;
  const brush = addCyl(g, 0.006, 0.006, 0.12, toon('#6b4a32'), s.x - 0.55, s.top + 0.02, s.z + 0.12, 6);
  brush.rotation.z = Math.PI / 2;
  brush.rotation.y = 0.4;
  quiet(addBox(g, 0.28, 0.008, 0.012, toon('#c5ccd2'), s.x + 0.45, s.top + 0.01, s.z + 0.12));
  quiet(addBox(g, 0.012, 0.16, 0.012, toon('#c5ccd2'), s.x + 0.32, s.top + 0.01, s.z + 0.12));
  addContact(g, s.x, s.z, s.spanX * 0.9, s.spanZ + 0.25, 0.24);
}

function packingTable(g, layout) {
  const s = S(layout, 'packing');
  const edge = toon('#8d6844');
  const top = new THREE.Mesh(
    new THREE.BoxGeometry(s.spanX, 0.045, s.spanZ),
    [edge, edge, benchTopMat(4), edge, edge, edge],
  );
  top.position.set(s.x, s.top - 0.022, s.z);
  top.name = 'packing-top';
  top.castShadow = true;
  top.receiveShadow = true;
  g.add(top);
  const legH = s.top - 0.045;
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      addBox(
        g, 0.05, legH, 0.05, toon('#5c3d28'),
        s.x + sx * (s.spanX / 2 - 0.07),
        legH / 2,
        s.z + sz * (s.spanZ / 2 - 0.06),
      );
    }
  }
  const stack = [
    ['#1e2a44', 0.03],
    ['#7a2e2a', 0.028],
    ['#3d5a42', 0.026],
    ['#8a3a3a', 0.024],
  ];
  let y = s.top;
  stack.forEach(([color, h], i) => {
    addBox(g, 0.16, h, 0.23, toon(color), s.x - 0.18, y + h / 2, s.z - 0.02);
    y += h;
    if (i === 1) quiet(addBox(g, 0.15, 0.004, 0.22, toon('#d4b48a'), s.x - 0.18, y + 0.002, s.z - 0.02));
  });
  addBox(g, 0.035, 0.22, 0.15, toon('#2c3d66'), s.x + 0.16, s.top + 0.11, s.z + 0.04);
  addBox(g, 0.03, 0.2, 0.14, toon('#c4a06a'), s.x + 0.22, s.top + 0.1, s.z + 0.02);
  const tape = addCyl(g, 0.04, 0.04, 0.025, toon('#f4efe4'), s.x + 0.32, s.top + 0.03, s.z - 0.08, 12);
  tape.rotation.z = Math.PI / 2;
  addContact(g, s.x, s.z, s.spanX, s.spanZ + 0.15, 0.2);
}

function leatherAndStove(g, layout) {
  const L = S(layout, 'leather');
  const hides = [
    { dx: -0.28, h: 0.82, w: 0.3, c: '#7a2e2a' },
    { dx: 0.02, h: 0.96, w: 0.26, c: '#c4a06a' },
    { dx: 0.3, h: 0.7, w: 0.24, c: '#2a2624' },
  ];
  addBox(g, 0.78, 0.028, 0.028, toon('#4a3122'), L.x, 2.18, L.z);
  hides.forEach((h) => {
    addBox(g, h.w, h.h, 0.012, toon(h.c), L.x + h.dx, 2.16 - h.h / 2, L.z + 0.02);
    addBox(g, h.w * 0.92, 0.02, 0.016, toon('#4a3122'), L.x + h.dx, 2.14, L.z + 0.028);
  });
  const stamps = new THREE.Group();
  for (let i = 0; i < 8; i++) {
    addCyl(stamps, 0.012, 0.014, 0.045, toon('#c6a15a'), -0.16 + i * 0.045, 0, 0, 6);
  }
  stamps.position.set(L.x + 0.05, 1.42, L.z + 0.04);
  g.add(stamps);
  addBox(g, 0.42, 0.02, 0.06, toon('#5c3d28'), L.x + 0.05, 1.39, L.z + 0.03);

  const s = S(layout, 'stove');
  const root = new THREE.Group();
  root.name = 'stove-root';
  const wood = toon('#6b4a32');
  const iron = toon('#3c444c');
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      addBox(
        root, 0.03, 0.58, 0.03, wood,
        s.x + sx * (s.spanX / 2 - 0.03),
        0.29,
        s.z + sz * (s.spanZ / 2 - 0.03),
      );
    }
  }
  addBox(root, s.spanX, 0.035, s.spanZ, wood, s.x, 0.59, s.z);
  addCyl(root, 0.13, 0.14, 0.16, iron, s.x, 0.7, s.z, 14);
  addCyl(root, 0.12, 0.12, 0.016, toon('#2a2e32'), s.x, 0.785, s.z, 12);
  const coal = addCyl(
    root, 0.06, 0.06, 0.01,
    toon('#ffb15a', { emissive: '#ff9a3c', emissiveIntensity: 0.75 }),
    s.x, 0.778, s.z, 12,
  );
  quiet(coal);
  for (let i = 0; i < 3; i++) {
    const tool = new THREE.Group();
    const bit = addCyl(tool, 0.009, 0.012, 0.06, toon('#c6a15a'), 0.03, 0, 0, 6);
    bit.rotation.z = Math.PI / 2;
    const grip = addCyl(tool, 0.008, 0.008, 0.055, wood, -0.035, 0, 0, 6);
    grip.rotation.z = Math.PI / 2;
    tool.position.set(s.x - 0.05 + i * 0.05, 0.78, s.z);
    tool.rotation.y = -0.5 + i * 0.4;
    root.add(tool);
  }
  g.add(root);
  addContact(g, s.x, s.z, s.spanX + 0.08, s.spanZ + 0.08, 0.2);
}

function ticketsAndSign(g, layout) {
  const { depth: D } = layout.meta.room;
  const z = -D / 2 + 0.11;
  labeledPlate(g, 0.86, 0.16, 'BINDERY', -0.35, 2.22, z + 0.02, 'z');
  ['SEW', 'PRESS', 'CUT'].forEach((word, i) => {
    labeledPlate(g, 0.22, 0.12, word, 0.35 + i * 0.28, 1.72, z + 0.02, 'z');
  });
}

function lampGlows(g, layout) {
  const glowMat = toon('#fff1c4', { emissive: '#ffe0a0', emissiveIntensity: 0.85 });
  for (const inst of layout.instances) {
    if (inst.kind !== 'library_lamp') continue;
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.045, 10, 8), glowMat);
    m.position.set(inst.position[0], inst.position[1] + 0.27, inst.position[2] + 0.06);
    quiet(m);
    g.add(m);
  }
  for (const inst of layout.instances) {
    if (inst.kind !== 'pendant_lamp') continue;
    const spec = layout.assets.pendant_lamp;
    const y0 = inst.position[1] + spec.targetHeight;
    const y1 = layout.meta.room.height - 0.08;
    if (y1 <= y0 + 0.05) continue;
    const cord = addCyl(g, 0.006, 0.006, y1 - y0, toon('#2c2826'), inst.position[0], (y0 + y1) / 2, inst.position[2], 6);
    quiet(cord);
    const bulb = new THREE.Mesh(
      new THREE.SphereGeometry(0.035, 10, 8),
      toon('#fff6dc', { emissive: '#ffe6b0', emissiveIntensity: 0.8 }),
    );
    bulb.position.set(inst.position[0], inst.position[1] + spec.targetHeight * 0.45, inst.position[2]);
    quiet(bulb);
    g.add(bulb);
  }
}

function foliage(g, inst) {
  const x = inst.position[0];
  const z = inst.position[2];
  quiet(addCyl(g, 0.012, 0.018, 0.14, toon('#3d5c32'), x, 0.4, z, 6));
  const a = new THREE.Mesh(new THREE.SphereGeometry(0.13, 10, 8), toon('#2f5a38'));
  a.position.set(x, 0.54, z);
  g.add(a);
  const b = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 7), toon('#1e4030'));
  b.position.set(x + 0.05, 0.62, z - 0.03);
  g.add(b);
}

function contactsForSeats(g, layout) {
  const footprints = {
    dining_chair: [0.42, 0.48],
    flowerpot: [0.28, 0.28],
  };
  for (const inst of layout.instances) {
    const base = footprints[inst.kind];
    if (!base || inst.position[1] > 0.2) continue;
    addContact(g, inst.position[0], inst.position[2], base[0], base[1], 0.22);
  }
}

function makeShell(layout) {
  const { width: W, depth: D, height: H } = layout.meta.room;
  const g = makeCutawayShell(layout, {
    leftOpening: { z0: 0.4, z1: 2.65, y0: 2.05, y1: 2.78 },
  });
  floorPlanks(g, W, D);
  sectionSkirt(g, W, D);
  wainscot(g, W, D);
  clerestory(g, W);
  ceiling(g, W, D, H);
  return g;
}

function makeProcedural(layout) {
  const g = new THREE.Group();
  g.name = 'procedural';
  sewingBench(g, layout);
  standingPress(g, layout);
  guillotine(g, layout);
  paperDrawers(g, layout);
  dryingRack(g, layout);
  forwardingBench(g, layout);
  packingTable(g, layout);
  leatherAndStove(g, layout);
  ticketsAndSign(g, layout);
  lampGlows(g, layout);
  for (const stool of layout.meta.workStools) workStool(g, stool);
  foliage(g, layout.instances.find((i) => i.id === 'plant'));
  contactsForSeats(g, layout);
  return g;
}

function measure(scene) {
  const names = [
    'sewing-top', 'guillotine-top', 'forward-top', 'packing-top',
    'press-root', 'drawer-root', 'rack-root', 'stove-root',
  ];
  const out = {};
  for (const name of names) {
    const obj = scene.getObjectByName(name);
    out[name] = obj ? meshExtent(obj) : null;
  }
  let huge = 0;
  scene.traverse((obj) => {
    if (!obj.isMesh) return;
    const box = new THREE.Box3().setFromObject(obj);
    const size = box.getSize(new THREE.Vector3());
    if (size.x > 11 || size.y > 3.5 || size.z > 8.2) huge += 1;
  });
  out.hugeMeshes = huge;
  out.propCount = scene.getObjectByName('props')?.children.length || 0;
  return out;
}

boot({
  makeShell,
  makeProcedural,
  measure,
  readyText: 'ready — bookbinding atelier · drag orbit · U unlit · T toon',
}).catch((err) => {
  console.error(err);
  window.__errors = window.__errors || [];
  window.__errors.push(String(err && err.message ? err.message : err));
  const status = document.getElementById('status');
  if (status) status.textContent = `error: ${err.message || err}`;
});
