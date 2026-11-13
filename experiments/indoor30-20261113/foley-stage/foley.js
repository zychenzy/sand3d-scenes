import * as THREE from 'three';
import { boot, toon, addBox, addCyl } from './scene_lib.js';
import { bindLayout, pitRect } from './orient.js';

const CANVAS_MAX = 256;

function canvas(w, h) {
  if (w > CANVAS_MAX || h > CANVAS_MAX) throw new Error('texture too large');
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

function texOf(c, repeatX = 1, repeatY = 1) {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = THREE.RepeatWrapping;
  t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeatX, repeatY);
  t.anisotropy = 4;
  t.needsUpdate = true;
  return t;
}

function floorMap() {
  const c = canvas(128, 64);
  const g = c.getContext('2d');
  g.fillStyle = '#f4efe6';
  g.fillRect(0, 0, 128, 64);
  for (let i = 0, x = 0; x < 128; i++) {
    const w = 30 + (i % 3) * 4;
    g.fillStyle = i % 2 ? '#fffaf3' : '#f3eee6';
    g.fillRect(x, 0, w, 64);
    g.fillStyle = '#c8b49a';
    g.fillRect(x, 0, 2, 64);
    x += w;
  }
  return texOf(c, 22, 16);
}

function gravelMap() {
  const c = canvas(128, 128);
  const g = c.getContext('2d');
  g.fillStyle = '#c2bbb0';
  g.fillRect(0, 0, 128, 128);
  const cols = ['#8d887e', '#6f6a62', '#d5d0c6', '#9a9184', '#7a7268'];
  for (let i = 0; i < 48; i++) {
    const x = (i * 37) % 122 + 3;
    const y = (i * 53) % 122 + 3;
    const r = 2 + (i % 3);
    g.fillStyle = cols[i % cols.length];
    g.beginPath();
    g.ellipse(x, y, r, r * 0.72, i, 0, Math.PI * 2);
    g.fill();
  }
  return texOf(c, 4, 6);
}

function waterMap() {
  const c = canvas(64, 64);
  const g = c.getContext('2d');
  g.fillStyle = '#4ea3ab';
  g.fillRect(0, 0, 64, 64);
  g.strokeStyle = '#e7f4f4';
  g.lineWidth = 2;
  g.beginPath();
  g.ellipse(32, 34, 20, 8, 0.15, 0, Math.PI * 2);
  g.stroke();
  g.beginPath();
  g.ellipse(36, 30, 10, 4, -0.2, 0, Math.PI * 2);
  g.stroke();
  return texOf(c);
}

function sandMap() {
  const c = canvas(128, 128);
  const g = c.getContext('2d');
  g.fillStyle = '#f0d48e';
  g.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 80; i++) {
    g.fillStyle = i % 2 ? '#e4c27a' : '#f7e2b0';
    g.fillRect((i * 17) % 128, (i * 29) % 128, 2, 2);
  }
  g.strokeStyle = '#c4a15a';
  g.lineWidth = 1;
  for (let y = 8; y < 128; y += 14) {
    g.beginPath();
    g.moveTo(0, y);
    g.bezierCurveTo(40, y - 4, 80, y + 5, 128, y - 1);
    g.stroke();
  }
  return texOf(c, 3, 4);
}

function pictureMap(caption) {
  const c = canvas(256, 144);
  const g = c.getContext('2d');
  g.fillStyle = '#8ea4b0';
  g.fillRect(0, 0, 256, 144);
  g.fillStyle = '#c4b49a';
  g.fillRect(0, 96, 256, 48);
  g.fillStyle = '#6d5a48';
  g.fillRect(0, 96, 256, 4);
  g.fillStyle = '#2f3a44';
  g.beginPath();
  g.ellipse(118, 78, 10, 10, 0, 0, Math.PI * 2);
  g.fill();
  g.fillRect(112, 88, 12, 22);
  g.fillRect(100, 92, 14, 4);
  g.fillRect(124, 92, 16, 4);
  g.fillRect(112, 108, 4, 16);
  g.fillRect(120, 108, 4, 18);
  g.fillStyle = '#f4efe6';
  g.font = '700 16px sans-serif';
  g.fillText(caption, 10, 22);
  g.font = '600 12px sans-serif';
  g.fillText('feet  ·  sync', 10, 40);
  return texOf(c, 1, 1);
}

function labelMap(text) {
  const c = canvas(256, 64);
  const g = c.getContext('2d');
  g.fillStyle = '#f4efe6';
  g.fillRect(0, 0, 256, 64);
  g.fillStyle = '#3a2e24';
  g.font = '700 36px sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(text, 128, 34);
  return texOf(c, 1, 1);
}

function quiet(mesh, flags = {}) {
  mesh.userData.noShadow = !!flags.noShadow;
  if (flags.cast === false) mesh.userData.castShadow = false;
  if (flags.receive === false) mesh.userData.receiveShadow = false;
  mesh.castShadow = flags.cast !== false && !flags.noShadow;
  mesh.receiveShadow = flags.receive !== false && !flags.noShadow;
  return mesh;
}

function rod(g, a, b, radius, mat) {
  const dir = new THREE.Vector3(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
  const len = dir.length() || 0.001;
  const m = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, len, 6), mat);
  m.position.set((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
  m.castShadow = true;
  m.receiveShadow = true;
  g.add(m);
  return m;
}

function slabsAround(room, pits) {
  const x0 = -room.width / 2;
  const x1 = room.width / 2;
  const z0 = -room.depth / 2;
  const z1 = room.depth / 2;
  const rects = pits.map(pitRect);
  const zA = Math.min(...rects.map((r) => r.minZ));
  const zB = Math.max(...rects.map((r) => r.maxZ));
  const slabs = [
    { x: 0, z: (z0 + zA) / 2, w: room.width, d: zA - z0 },
    { x: 0, z: (zB + z1) / 2, w: room.width, d: z1 - zB },
  ];
  const sorted = [...rects].sort((a, b) => a.minX - b.minX);
  let cursor = x0;
  for (const r of sorted) {
    if (r.minX - cursor > 0.02) {
      slabs.push({ x: (cursor + r.minX) / 2, z: (zA + zB) / 2, w: r.minX - cursor, d: zB - zA });
    }
    cursor = r.maxX;
  }
  if (x1 - cursor > 0.02) slabs.push({ x: (cursor + x1) / 2, z: (zA + zB) / 2, w: x1 - cursor, d: zB - zA });
  return slabs;
}

function makeShell(layout) {
  const g = new THREE.Group();
  g.name = 'shell';
  const s = layout.shell;
  const { width: W, depth: D, height: H } = layout.meta.room;
  const wall = toon(s.wall);
  const trim = toon(s.trim);
  const floorMat = toon('#ffffff', { map: floorMap() });
  floorMat.color.set(s.floor);

  const sub = addBox(g, W, 0.08, D, toon(s.floor), 0, -0.28, 0);
  quiet(sub, { cast: false, receive: false });

  for (const slab of slabsAround(layout.meta.room, layout.pits)) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(slab.w, 0.08, slab.d), floorMat);
    mesh.position.set(slab.x, -0.04, slab.z);
    quiet(mesh, { cast: false });
    g.add(mesh);
  }

  const back = addBox(g, W, H, 0.12, wall, 0, H / 2, -D / 2);
  quiet(back, { cast: false });
  const left = addBox(g, 0.12, H, D, wall, -W / 2, H / 2, 0);
  quiet(left, { cast: false });
  addBox(g, W, 0.1, 0.06, trim, 0, 0.05, -D / 2 + 0.08);
  addBox(g, 0.06, 0.1, D, trim, -W / 2 + 0.08, 0.05, 0);

  const soffit = addBox(g, 6.6, 0.08, 2.5, toon(s.ceiling), -4.4, H - 0.06, -4.6);
  quiet(soffit, { noShadow: true });

  baffles(g, layout);
  pits(g, layout);
  controlBooth(g, layout);
  pictureScreen(g, layout);
  shoeRacks(g, layout);
  pipeGrid(g, layout);
  propDressing(g, layout);
  return g;
}

function baffles(g, layout) {
  const s = layout.shell;
  const colors = [s.baffleA, s.baffleB, s.baffleC];
  const backZ = -layout.meta.room.depth / 2 + 0.16;
  const leftX = -layout.meta.room.width / 2 + 0.16;
  const back = [
    [3.15, 3.35, 0.9, 0.7],
    [4.3, 2.55, 0.7, 0.85],
    [5.4, 3.2, 0.75, 0.55],
    [-1.9, 3.45, 0.7, 0.5],
  ];
  back.forEach(([x, y, w, h], i) => {
    const mat = toon(colors[i % colors.length]);
    addBox(g, w, h, 0.06, mat, x, y, backZ);
    addBox(g, w + 0.06, 0.035, 0.04, toon(s.trim), x, y + h / 2, backZ);
    addBox(g, w + 0.06, 0.035, 0.04, toon(s.trim), x, y - h / 2, backZ);
  });
  [[-1.2, 2.7, 1.1], [1.4, 2.7, 1.0], [3.6, 2.7, 0.9]].forEach(([z, y, w], i) => {
    const mat = toon(colors[i % colors.length]);
    addBox(g, 0.06, 0.7, w, mat, leftX, y, z);
    addBox(g, 0.04, 0.035, w + 0.06, toon(s.trim), leftX, y + 0.35, z);
    addBox(g, 0.04, 0.035, w + 0.06, toon(s.trim), leftX, y - 0.35, z);
  });
  const cloth = toon(s.baffleB);
  [[-3.2, 0.4], [-0.6, -0.5], [1.9, 0.7], [3.4, 2.6]].forEach(([x, z], i) => {
    const y = 4.05;
    addBox(g, 0.08, 0.55, 0.9, cloth, x, y, z);
    addBox(g, 0.04, 0.08, 0.96, toon(s.trim), x, y + 0.26, z);
    quiet(addCyl(g, 0.006, 0.006, 0.28, toon(s.pipe), x, 4.36, z, 6), { noShadow: true });
  });
}

function pits(g, layout) {
  const s = layout.shell;
  const gravel = gravelMap();
  const sand = sandMap();
  for (const pit of layout.pits) {
    const [cx, cz] = pit.center;
    const [w, d] = pit.size;
    const well = addBox(g, w - 0.08, 0.04, d - 0.08, toon(s.pitWell), cx, -pit.depth, cz);
    quiet(well, { cast: false });
    addBox(g, w + 0.12, 0.045, 0.07, toon(s.rim), cx, 0.02, cz - d / 2);
    addBox(g, w + 0.12, 0.045, 0.07, toon(s.rim), cx, 0.02, cz + d / 2);
    addBox(g, 0.07, 0.045, d, toon(s.rim), cx - w / 2, 0.02, cz);
    addBox(g, 0.07, 0.045, d, toon(s.rim), cx + w / 2, 0.02, cz);
    addBox(g, 0.04, pit.depth, d - 0.1, toon(s.pitWell), cx - w / 2 + 0.04, -pit.depth / 2, cz);
    addBox(g, 0.04, pit.depth, d - 0.1, toon(s.pitWell), cx + w / 2 - 0.04, -pit.depth / 2, cz);
    addBox(g, w - 0.1, pit.depth, 0.04, toon(s.pitWell), cx, -pit.depth / 2, cz - d / 2 + 0.04);
    addBox(g, w - 0.1, pit.depth, 0.04, toon(s.pitWell), cx, -pit.depth / 2, cz + d / 2 - 0.04);

    if (pit.id === 'gravel') {
      const bed = new THREE.Mesh(new THREE.BoxGeometry(w - 0.16, 0.03, d - 0.16), toon('#ffffff', { map: gravel }));
      bed.material.color.set(s.gravel);
      bed.position.set(cx, -pit.depth + 0.03, cz);
      bed.name = 'pit-gravel';
      quiet(bed, { cast: false });
      g.add(bed);
      for (let i = 0; i < 14; i++) {
        const px = cx - w * 0.32 + ((i * 37) % 100) / 100 * w * 0.64;
        const pz = cz - d * 0.32 + ((i * 53) % 100) / 100 * d * 0.64;
        const pebble = addCyl(g, 0.025 + (i % 3) * 0.008, 0.02, 0.02, toon(i % 2 ? '#7a746c' : '#b7b1a6'), px, -pit.depth + 0.05, pz, 6);
        quiet(pebble, { noShadow: true });
      }
    } else if (pit.id === 'wood') {
      const count = 10;
      const pw = (w - 0.2) / count;
      for (let i = 0; i < count; i++) {
        const color = [s.woodA, s.woodB, s.woodC][i % 3];
        const plank = addBox(g, pw - 0.012, 0.035, d - 0.18, toon(color), cx - (w - 0.2) / 2 + pw * (i + 0.5), -pit.depth + 0.035, cz);
        if (i === 4) plank.name = 'pit-wood';
        quiet(plank, { cast: false });
      }
    } else {
      const bed = new THREE.Mesh(new THREE.BoxGeometry(w - 0.16, 0.035, d - 0.16), toon('#ffffff', { map: sand }));
      bed.material.color.set(s.sand);
      bed.position.set(cx, -pit.depth + 0.03, cz);
      bed.name = 'pit-sand';
      quiet(bed, { cast: false });
      g.add(bed);
      const print = addBox(g, 0.1, 0.008, 0.22, toon('#c4a15a'), cx - 0.12, -pit.depth + 0.05, cz + 0.1);
      quiet(print, { noShadow: true });
      const print2 = addBox(g, 0.1, 0.008, 0.22, toon('#c4a15a'), cx + 0.08, -pit.depth + 0.05, cz - 0.15);
      quiet(print2, { noShadow: true });
    }

    const plate = addBox(g, 0.46, 0.1, 0.02, toon('#f4efe6'), cx, 0.1, cz + d / 2 + 0.02);
    const face = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.08), toon('#ffffff', { map: labelMap(pit.label) }));
    face.position.set(cx, 0.1, cz + d / 2 + 0.032);
    quiet(face, { noShadow: true });
    g.add(face);
    quiet(plate, { cast: false });

    const tape = toon(s.tape);
    for (const side of [-1, 1]) {
      const mark = addBox(g, 0.08, 0.006, 0.28, tape, cx + side * (w / 2 + 0.12), 0.008, cz);
      quiet(mark, { noShadow: true });
    }
  }
}

function controlBooth(g, layout) {
  const s = layout.shell;
  const c = layout.control;
  const [x0, z0] = c.min;
  const [x1, z1] = c.max;
  const wall = toon(s.wall);
  const booth = toon(s.booth);
  const win = c.window;
  const t = 0.1;
  const H = layout.meta.room.height;

  const floor = addBox(g, (x1 - x0) - 0.16, 0.045, (z1 - z0) - 0.16, booth, (x0 + x1) / 2, 0.04, (z0 + z1) / 2);
  quiet(floor, { cast: false });

  addBox(g, x1 - x0, win.y0, t, wall, (x0 + x1) / 2, win.y0 / 2, z1);
  addBox(g, x1 - x0, H - win.y1, t, wall, (x0 + x1) / 2, (win.y1 + H) / 2, z1);
  addBox(g, win.x0 - x0, win.y1 - win.y0, t, wall, (x0 + win.x0) / 2, (win.y0 + win.y1) / 2, z1);
  addBox(g, x1 - win.x1, win.y1 - win.y0, t, wall, (win.x1 + x1) / 2, (win.y0 + win.y1) / 2, z1);
  addBox(g, 0.06, win.y1 - win.y0, 0.08, toon(s.trim), (win.x0 + win.x1) / 2, (win.y0 + win.y1) / 2, z1 + 0.02);

  const glassMat = toon(s.glass, { transparent: true, opacity: 0.2, depthWrite: false });
  c.panes.forEach((z, i) => {
    const pane = new THREE.Mesh(new THREE.PlaneGeometry(win.x1 - win.x0 - 0.08, win.y1 - win.y0 - 0.08), glassMat);
    pane.position.set((win.x0 + win.x1) / 2, (win.y0 + win.y1) / 2, z);
    pane.name = i === 0 ? 'glass-outer' : 'glass-inner';
    pane.userData.noShadow = true;
    g.add(pane);
  });
  const gasket = toon(s.gasket);
  addBox(g, win.x1 - win.x0 + 0.08, 0.035, 0.08, gasket, (win.x0 + win.x1) / 2, win.y0, z1 + 0.02);
  addBox(g, win.x1 - win.x0 + 0.08, 0.035, 0.08, gasket, (win.x0 + win.x1) / 2, win.y1, z1 + 0.02);

  const dz0 = c.door.z0;
  const dz1 = c.door.z1;
  addBox(g, t, H, z0 - dz0 > 0 ? 0.2 : (dz0 - z0), wall, x1, H / 2, (z0 + dz0) / 2);
  addBox(g, t, H, z1 - dz1, wall, x1, H / 2, (dz1 + z1) / 2);
  addBox(g, t, H - 2.15, dz1 - dz0, wall, x1, 2.15 + (H - 2.15) / 2, (dz0 + dz1) / 2);
  const leaf = new THREE.Group();
  addBox(leaf, 0.045, 2.05, 0.86, toon(s.trim), -0.04, 1.05, 0.43);
  addBox(leaf, 0.012, 0.7, 0.62, toon('#a87540'), -0.07, 0.6, 0.43);
  addBox(leaf, 0.012, 0.55, 0.62, toon('#a87540'), -0.07, 1.5, 0.43);
  addBox(leaf, 0.02, 2.02, 0.02, gasket, -0.02, 1.04, 0.02);
  leaf.position.set(x1, 0, dz0);
  leaf.rotation.y = -0.42;
  g.add(leaf);

  const soffit = addBox(g, x1 - x0 - 0.1, 0.08, z1 - z0 - 0.1, toon(s.ceiling), (x0 + x1) / 2, 3.15, (z0 + z1) / 2);
  quiet(soffit, { noShadow: true });

  const mixer = addBox(g, 0.42, 0.05, 0.18, toon('#4e5960'), -4.15, 0.8, -4.22);
  for (let i = 0; i < 7; i++) {
    addBox(g, 0.012, 0.045, 0.012, toon(i === 3 ? '#d7a36a' : '#d9d3c8'), -4.28 + i * 0.045, 0.84, -4.22);
  }
  const sync = new THREE.Mesh(new THREE.PlaneGeometry(0.28, 0.08), toon('#ffffff', {
    map: labelMap('SYNC'),
    emissive: '#e0a050',
    emissiveIntensity: 0.55,
  }));
  sync.position.set(-2.55, 2.4, -3.64);
  quiet(sync, { noShadow: true });
  g.add(sync);
  quiet(mixer, { cast: false });
}

function pictureScreen(g, layout) {
  const sc = layout.built.screen;
  const s = layout.shell;
  const cx = (sc.x0 + sc.x1) / 2;
  const cy = (sc.y0 + sc.y1) / 2;
  const w = sc.x1 - sc.x0;
  const h = sc.y1 - sc.y0;
  addBox(g, w + 0.12, h + 0.12, 0.06, toon(s.trim), cx, cy, sc.z);
  const face = new THREE.Mesh(
    new THREE.PlaneGeometry(w, h),
    toon('#ffffff', { map: pictureMap('PICTURE'), emissive: '#f4efe6', emissiveIntensity: 0.45 })
  );
  face.position.set(cx, cy, sc.z + 0.04);
  face.name = 'picture-screen';
  quiet(face, { noShadow: true });
  g.add(face);
}

function shoeRacks(g, layout) {
  const s = layout.shell;
  const spec = layout.shoes;
  const wood = toon(s.trim);
  const shelfMat = toon(s.woodA);
  for (const bz of spec.bays) {
    addBox(g, 0.04, 2.05, 0.04, wood, spec.x - 0.16, 1.02, bz - 0.48);
    addBox(g, 0.04, 2.05, 0.04, wood, spec.x - 0.16, 1.02, bz + 0.48);
    for (const y of spec.shelves) {
      const shelf = addBox(g, 0.36, 0.025, 1.05, shelfMat, spec.x - 0.02, y - 0.02, bz);
      quiet(shelf, { cast: false });
    }
  }
  const crate = addBox(g, 0.42, 0.16, 0.36, toon(s.woodB), spec.floorPairs[0].x, 0.08, spec.floorPairs[0].z);
  quiet(crate, { cast: false });
}

function pipeGrid(g, layout) {
  const pipe = toon(layout.shell.pipe);
  const metal = toon(layout.shell.metal);
  addBox(g, 8.2, 0.04, 0.04, pipe, -0.4, 3.56, 0.2);
  addBox(g, 0.04, 0.04, 2.4, pipe, -2.7, 3.56, 0.45);
  addBox(g, 0.04, 0.04, 2.4, pipe, -0.4, 3.56, 0.48);
  addBox(g, 0.04, 0.04, 2.4, pipe, 1.7, 3.56, 0.45);
  for (const mic of layout.mics) {
    if (!mic.suspend) {
      rod(g, mic.anchor, mic.capsule, 0.008, metal);
      continue;
    }
    rod(g, mic.anchor, mic.capsule, 0.008, metal);
    addCyl(g, 0.012, 0.012, 0.04, pipe, mic.anchor[0], mic.anchor[1], mic.anchor[2], 6);
  }
  const talk = layout.mics.find((m) => m.role === 'talkback');
  addBox(g, 0.08, 0.02, 0.1, toon(layout.shell.trim), talk.anchor[0], talk.anchor[1], talk.anchor[2]);
}

function propDressing(g, layout) {
  const s = layout.shell;
  const stairs = layout.built.stairs;
  const [sx, sz] = stairs.center;
  const stepW = stairs.size[0];
  const run = stairs.size[1] / 3;
  for (let i = 0; i < 3; i++) {
    const top = (i + 1) * 0.16;
    addBox(g, stepW, 0.04, run, toon(s.woodA), sx, top - 0.02, sz - stairs.size[1] / 2 + run * (i + 0.5));
  }
  addBox(g, 0.06, 0.5, stairs.size[1], toon(s.trim), sx - stepW / 2, 0.25, sz);
  addBox(g, 0.06, 0.5, stairs.size[1], toon(s.trim), sx + stepW / 2, 0.25, sz);

  const cloth = layout.built.cloth.keep;
  const cx = (cloth.minX + cloth.maxX) / 2;
  const cz = (cloth.minZ + cloth.maxZ) / 2;
  addCyl(g, 0.015, 0.015, 1.45, toon(s.metal), cloth.minX + 0.05, 0.72, cz, 8);
  addCyl(g, 0.015, 0.015, 1.45, toon(s.metal), cloth.maxX - 0.05, 0.72, cz, 8);
  addCyl(g, 0.012, 0.012, cloth.maxX - cloth.minX, toon(s.metal), cx, 1.42, cz, 8).rotation.z = Math.PI / 2;
  const garments = ['#c5d0c4', '#d2c2ae', '#a87850', '#eeeae2'];
  garments.forEach((color, i) => {
    const clothMesh = addBox(g, 0.22, 0.72, 0.04, toon(color), cloth.minX + 0.22 + i * 0.26, 1.02, cz);
    clothMesh.rotation.y = (i - 1.5) * 0.08;
  });

  const th = layout.built.thunder.keep;
  const tx = (th.minX + th.maxX) / 2;
  const tz = (th.minZ + th.maxZ) / 2;
  addBox(g, 0.04, 1.5, 0.04, toon(s.trim), tx, 0.75, th.minZ + 0.04);
  addBox(g, 0.04, 1.5, 0.04, toon(s.trim), tx, 0.75, th.maxZ - 0.04);
  addBox(g, 0.02, 1.35, th.maxZ - th.minZ - 0.1, toon('#c5ced2'), tx + 0.02, 0.85, tz);

  const table = layout.instances.find((i) => i.id === 'prop_table');
  const [px, , pz] = table.position;
  const y = layout.built.tableTop + 0.03;
  addCyl(g, 0.045, 0.02, 0.05, toon('#6e4b38'), px + 0.12, y, pz - 0.12, 8);
  addCyl(g, 0.045, 0.02, 0.05, toon('#6e4b38'), px + 0.2, y, pz - 0.02, 8);
  const keys = new THREE.Mesh(new THREE.TorusGeometry(0.03, 0.006, 6, 10), toon('#c5ced2'));
  keys.position.set(px - 0.18, y, pz + 0.02);
  keys.rotation.x = Math.PI / 2;
  quiet(keys, { noShadow: true });
  g.add(keys);
  for (let i = 0; i < 3; i++) {
    const stalk = addBox(g, 0.012, 0.012, 0.16, toon('#7d9a62'), px - 0.05 + i * 0.02, y, pz + 0.16);
    quiet(stalk, { noShadow: true });
  }
  addBox(g, 0.16, 0.012, 0.12, toon('#f4efe6'), px - 0.16, y, pz + 0.14);
  addBox(g, 0.1, 0.02, 0.08, toon('#d2c2ae'), px + 0.02, y, pz + 0.12);

  const basin = layout.instances.find((i) => i.id === 'basin');
  const water = new THREE.Mesh(
    new THREE.BoxGeometry(0.96, 0.045, 0.4),
    toon('#ffffff', { map: waterMap(), transparent: true, opacity: 0.92 })
  );
  water.material.color.set(s.water);
  water.position.set(basin.position[0], 0.15, basin.position[2]);
  water.rotation.y = basin.rotationY || 0;
  water.name = 'basin-water';
  quiet(water, { cast: false });
  g.add(water);

  const waterMic = layout.mics.find((m) => m.role === 'water');
  addBox(g, 0.28, 0.02, 0.08, toon(s.trim), waterMic.aim[0] + 0.42, 0.02, waterMic.aim[2] + 0.15);
  const face = new THREE.Mesh(new THREE.PlaneGeometry(0.28, 0.07), toon('#ffffff', { map: labelMap('WATER') }));
  face.position.set(waterMic.aim[0], 0.2, waterMic.aim[2] + 0.32);
  quiet(face, { noShadow: true });
  g.add(face);

  const spk = layout.instances.find((i) => i.id === 'cue_speaker');
  addBox(g, 0.28, spk.position[1], 0.22, toon(s.trim), spk.position[0], spk.position[1] / 2, spk.position[2]);

  const mon = layout.instances.find((i) => i.id === 'picture_mon');
  const card = new THREE.Mesh(
    new THREE.PlaneGeometry(0.52, 0.3),
    toon('#ffffff', { map: pictureMap('CUE'), emissive: '#f7f1e8', emissiveIntensity: 0.35, side: THREE.DoubleSide })
  );
  card.position.set(mon.position[0], mon.position[1] + 0.22, mon.position[2] - 0.12);
  card.rotation.y = Math.PI;
  card.name = 'cue-card';
  quiet(card, { noShadow: true });
  g.add(card);
}

boot({
  manifest: './assets/manifest.json',
  transformLayout: bindLayout,
  makeShell,
  readyText: 'ready — foley stage · T toon · U unlit',
});
