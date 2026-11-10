import * as THREE from 'three';
import { boot, toon, addBox, addCyl, addMesh, addContact, makeCutawayShell } from './scene_lib.js';

const BIN_COLORS = ['#1f6f6a', '#d26a3a', '#e0b02a', '#3d5f86', '#efe6d2', '#c4512c', '#4e6b52'];

function byId(layout, id) {
  return (layout.instances || []).find((i) => i.id === id);
}

function anchor(layout, name) {
  const a = layout.meta.anchors[name];
  return { x: a[0], z: a[1] };
}

function butcherTexture() {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 32;
  const g = c.getContext('2d');
  for (let x = 0; x < 256; x += 7) {
    const n = (x / 7) % 4;
    g.fillStyle = n === 0 ? '#c9a06a' : n === 1 ? '#a67c52' : n === 2 ? '#d7b48a' : '#b8895a';
    g.fillRect(x, 0, 7, 32);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = THREE.RepeatWrapping;
  t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(5, 1);
  t.magFilter = THREE.NearestFilter;
  t.minFilter = THREE.NearestFilter;
  return t;
}

function pegTexture() {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = '#e4dccb';
  g.fillRect(0, 0, 512, 256);
  g.fillStyle = '#2c3034';
  for (let y = 12; y < 256; y += 16) {
    const shift = (Math.floor(y / 16) % 2) * 0;
    for (let x = 12 + shift; x < 512; x += 16) {
      g.beginPath();
      g.arc(x, y, 2.1, 0, Math.PI * 2);
      g.fill();
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.magFilter = THREE.NearestFilter;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  return t;
}

function place(parent, x, y, z, rotY = 0) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  g.rotation.y = rotY;
  parent.add(g);
  return g;
}

function peg(g, x, y, z) {
  const p = addCyl(g, 0.007, 0.007, 0.045, toon('#ece7dc'), x, y, z, 6);
  p.rotation.x = Math.PI / 2;
  return p;
}

function toolWall(g, layout) {
  const { depth: D } = layout.meta.room;
  const bench = anchor(layout, 'bench');
  const pegZ = -D / 2 + 0.15;
  const ply = toon('#c6a36e');
  const edge = toon('#d5cbb8');
  const face = toon('#e7dece', { map: pegTexture() });
  const boardW = 2.45;
  const boardH = 1.32;
  const boardY = 1.86;
  addBox(g, boardW + 0.18, boardH + 0.16, 0.04, ply, bench.x, boardY, pegZ - 0.02);
  const mats = [edge, edge, edge, edge, face, edge];
  const board = new THREE.Mesh(new THREE.BoxGeometry(boardW, boardH, 0.02), mats);
  board.position.set(bench.x, boardY, pegZ);
  board.castShadow = true;
  board.receiveShadow = true;
  g.add(board);
  addBox(g, boardW + 0.04, 0.035, 0.03, toon('#4a4038'), bench.x, boardY - boardH / 2 - 0.01, pegZ);

  const z = pegZ + 0.045;
  const wood = toon('#8a5a32');
  const steel = toon('#b7bcc2');
  const dark = toon('#2a2e32');
  const orange = toon('#e07a32');

  // Striking tools, left cluster — hung, not a row.
  peg(g, bench.x - 1.02, 2.22, pegZ);
  addCyl(g, 0.013, 0.015, 0.3, wood, bench.x - 1.02, 2.02, z, 6);
  addBox(g, 0.1, 0.038, 0.038, steel, bench.x - 0.99, 2.16, z);

  peg(g, bench.x - 0.78, 1.78, pegZ);
  addCyl(g, 0.016, 0.018, 0.26, wood, bench.x - 0.78, 1.6, z, 6);
  addCyl(g, 0.038, 0.038, 0.07, toon('#1f1f1f'), bench.x - 0.78, 1.74, z, 8);

  peg(g, bench.x - 0.55, 2.08, pegZ);
  const wrench = addBox(g, 0.18, 0.028, 0.01, steel, bench.x - 0.48, 2.02, z);
  wrench.rotation.z = 0.35;
  addBox(g, 0.05, 0.045, 0.012, steel, bench.x - 0.38, 2.08, z);

  // Drivers, loose cluster.
  const handles = ['#c4512c', '#e0b02a', '#1f6f6a', '#3d5f86', '#efe6d2'];
  const driverX = [-0.22, -0.1, 0.0, 0.11, 0.2];
  const driverY = [2.28, 2.05, 2.22, 1.92, 2.14];
  driverX.forEach((dx, i) => {
    const x = bench.x + dx;
    peg(g, x, driverY[i] + 0.06, pegZ);
    addCyl(g, 0.012, 0.014, 0.09, toon(handles[i]), x, driverY[i] - 0.02, z, 6);
    addCyl(g, 0.004, 0.004, 0.16, steel, x, driverY[i] - 0.14, z, 4);
  });
  peg(g, bench.x + 0.02, 1.55, pegZ);
  addBox(g, 0.15, 0.016, 0.01, toon('#b04a32'), bench.x + 0.02, 1.46, z);
  addBox(g, 0.05, 0.028, 0.012, steel, bench.x + 0.08, 1.46, z);

  // Cutting and measuring, right cluster with a gap before it.
  peg(g, bench.x + 0.48, 2.12, pegZ);
  const blade = addBox(g, 0.3, 0.07, 0.008, steel, bench.x + 0.58, 1.98, z);
  blade.rotation.z = -0.2;
  addBox(g, 0.09, 0.05, 0.02, orange, bench.x + 0.4, 1.9, z);

  peg(g, bench.x + 0.42, 1.52, pegZ);
  addBox(g, 0.2, 0.012, 0.008, steel, bench.x + 0.5, 1.46, z);
  addBox(g, 0.012, 0.12, 0.008, steel, bench.x + 0.4, 1.4, z);

  peg(g, bench.x + 0.72, 2.32, pegZ);
  addBox(g, 0.46, 0.03, 0.016, toon('#e0b02a'), bench.x + 0.78, 2.26, z);
  addBox(g, 0.07, 0.02, 0.018, dark, bench.x + 0.78, 2.26, z + 0.004);

  peg(g, bench.x + 0.95, 1.7, pegZ);
  const tape = addCyl(g, 0.038, 0.038, 0.028, orange, bench.x + 0.95, 1.62, z, 10);
  tape.rotation.x = Math.PI / 2;
  addBox(g, 0.05, 0.012, 0.008, steel, bench.x + 1.02, 1.62, z);

  peg(g, bench.x + 0.78, 1.95, pegZ);
  addBox(g, 0.12, 0.018, 0.028, dark, bench.x + 0.78, 1.88, z);
  addCyl(g, 0.014, 0.014, 0.07, dark, bench.x + 0.72, 1.84, z, 6);

  peg(g, bench.x + 1.05, 2.0, pegZ);
  addBox(g, 0.07, 0.16, 0.05, dark, bench.x + 1.05, 1.88, z);
  addBox(g, 0.055, 0.09, 0.052, orange, bench.x + 1.05, 1.9, z + 0.006);
  addCyl(g, 0.012, 0.008, 0.07, dark, bench.x + 1.05, 1.74, z, 6);
}

function standingBench(g, layout) {
  const b = anchor(layout, 'bench');
  const x = b.x;
  const z = b.z;
  const topW = 2.55;
  const topD = 0.66;
  const topY = 0.9;
  const edge = toon('#a67c52');
  const face = toon('#c9a06a', { map: butcherTexture() });
  const top = new THREE.Mesh(new THREE.BoxGeometry(topW, 0.055, topD), [edge, edge, face, edge, edge, edge]);
  top.position.set(x, topY, z);
  top.castShadow = true;
  top.receiveShadow = true;
  g.add(top);
  addBox(g, topW, 0.02, 0.018, toon('#e0b02a'), x, topY - 0.03, z + topD / 2);
  const metal = toon('#3e444a');
  const lx = topW / 2 - 0.08;
  const lz = topD / 2 - 0.07;
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      addBox(g, 0.045, 0.86, 0.045, metal, x + sx * lx, 0.43, z + sz * lz);
    }
  }
  addBox(g, topW - 0.2, 0.02, topD - 0.14, toon('#6a5340'), x, 0.22, z);
  addBox(g, 0.32, 0.14, 0.22, toon('#2f4a6a'), x - 0.55, 0.3, z - 0.02);
  addCyl(g, 0.055, 0.06, 0.16, toon('#8a8f94'), x + 0.45, 0.3, z + 0.04, 10);
  addBox(g, 0.16, 0.05, 0.12, toon('#c4512c'), x + 0.15, 0.26, z - 0.06);

  // Vise on the right end, jaws toward the room.
  const vx = x + topW / 2 - 0.22;
  addBox(g, 0.1, 0.05, 0.12, metal, vx, topY + 0.045, z + 0.06);
  addBox(g, 0.07, 0.07, 0.035, toon('#5c656c'), vx + 0.02, topY + 0.08, z + 0.14);
  addBox(g, 0.07, 0.07, 0.02, toon('#8d9398'), vx + 0.02, topY + 0.08, z + 0.18);
  const screw = addCyl(g, 0.012, 0.012, 0.1, toon('#222'), vx + 0.1, topY + 0.08, z + 0.12, 6);
  screw.rotation.z = Math.PI / 2;

  // Offcut and a gear left on the top, not centered.
  addBox(g, 0.22, 0.02, 0.1, toon('#d7b48a'), x - 0.7, topY + 0.035, z - 0.08);
  addCyl(g, 0.06, 0.06, 0.018, toon('#8d9398'), x - 0.15, topY + 0.04, z + 0.08, 12);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    addBox(
      g, 0.018, 0.018, 0.016, toon('#8d9398'),
      x - 0.15 + Math.cos(a) * 0.07,
      topY + 0.04,
      z + 0.08 + Math.sin(a) * 0.07,
    );
  }
  addContact(g, x, z + 0.1, topW * 0.9, topD + 0.35, 0.22);
}

function toolChest(g, layout) {
  const c = anchor(layout, 'chest');
  addBox(g, 0.56, 0.06, 0.46, toon('#2a2a2a'), c.x, 0.05, c.z);
  addBox(g, 0.52, 0.9, 0.42, toon('#c4512c'), c.x, 0.52, c.z);
  const drawers = [0.1, 0.12, 0.14, 0.18, 0.22];
  let y = 0.14;
  drawers.forEach((h, i) => {
    const yy = y + h / 2;
    addBox(g, 0.46, h - 0.016, 0.016, toon(i === 2 ? '#e7d7c0' : '#f3efe6'), c.x, yy, c.z + 0.215);
    const pull = addCyl(g, 0.01, 0.01, 0.08, toon('#d0d4d8'), c.x, yy, c.z + 0.23, 6);
    pull.rotation.x = Math.PI / 2;
    y += h;
  });
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      addCyl(g, 0.028, 0.028, 0.04, toon('#1a1a1a'), c.x + sx * 0.2, 0.03, c.z + sz * 0.16, 8);
    }
  }
  addContact(g, c.x, c.z, 0.62, 0.52, 0.2);
}

function binRack(g, layout) {
  const b = anchor(layout, 'bins');
  const W = 1.18;
  const H = 1.68;
  const D = 0.38;
  const frame = toon('#3a4046');
  const shelfMat = toon('#5c656c');
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      addBox(g, 0.028, H, 0.028, frame, b.x + sx * (W / 2 - 0.02), H / 2, b.z + sz * (D / 2 - 0.02));
    }
  }
  // Cool strip under the second shelf.
  addBox(g, W - 0.12, 0.012, 0.02, toon('#d5e4ff', { emissive: '#d5e4ff', emissiveIntensity: 0.8 }), b.x, 0.7, b.z + D / 2 - 0.02);

  const rows = [0.22, 0.58, 0.94, 1.3];
  const counts = [4, 4, 3, 3];
  rows.forEach((y, r) => {
    addBox(g, W - 0.04, 0.02, D - 0.02, shelfMat, b.x, y, b.z);
    const n = counts[r];
    for (let i = 0; i < n; i++) {
      if (r === 1 && i === 2) continue; // a gap where a bin was taken
      const gap = (W - 0.16) / n;
      const bx = b.x - W / 2 + 0.1 + i * gap + gap * 0.35;
      const pull = (r + i) % 4 === 1 ? 0.07 : 0.0;
      const color = BIN_COLORS[(r * 3 + i * 2) % BIN_COLORS.length];
      addBox(g, 0.22, 0.16, 0.26, toon(color), bx, y + 0.11, b.z + pull);
      addBox(g, 0.16, 0.09, 0.012, toon('#1a1c1e'), bx, y + 0.1, b.z + 0.12 + pull);
      addBox(g, 0.1, 0.022, 0.01, toon('#f7f4ee'), bx, y + 0.15, b.z + 0.132 + pull);
    }
  });
  addBox(g, W - 0.08, 0.022, D - 0.04, shelfMat, b.x, 1.52, b.z);
  addContact(g, b.x, b.z + 0.05, W * 0.9, D + 0.08, 0.2);
}

function printer(g, layout) {
  const p = anchor(layout, 'printer');
  const x = p.x;
  const z = p.z;
  const wood = toon('#6d5340');
  const alum = toon('#d5dbe0');
  const dark = toon('#2a2e32');
  const panel = toon('#343a40');

  addBox(g, 0.64, 0.06, 0.5, wood, x, 0.72, z);
  addBox(g, 0.58, 0.58, 0.46, toon('#4a4038'), x, 0.38, z);
  addBox(g, 0.34, 0.4, 0.015, toon('#3a342e'), x - 0.06, 0.38, z + 0.23);
  addCyl(g, 0.012, 0.012, 0.09, toon('#d0d4d8'), x + 0.1, 0.4, z + 0.25, 6);
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      addCyl(g, 0.03, 0.03, 0.045, dark, x + sx * 0.24, 0.04, z + sz * 0.18, 8);
    }
  }

  const y0 = 0.8;
  const s = 0.19;
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      addBox(g, 0.018, 0.46, 0.018, alum, x + sx * s, y0 + 0.22, z + sz * s);
    }
  }
  addBox(g, 0.4, 0.016, 0.4, alum, x, y0, z);
  addBox(g, 0.4, 0.016, 0.4, alum, x, y0 + 0.45, z);
  addBox(g, 0.012, 0.4, 0.36, panel, x - s, y0 + 0.2, z);
  addBox(g, 0.36, 0.4, 0.012, panel, x, y0 + 0.2, z - s);
  // Open front with a thin door frame so the bed reads.
  addBox(g, 0.016, 0.4, 0.016, alum, x - s + 0.01, y0 + 0.2, z + s);
  addBox(g, 0.016, 0.4, 0.016, alum, x + s - 0.01, y0 + 0.2, z + s);

  addBox(g, 0.28, 0.012, 0.28, dark, x, y0 + 0.03, z);
  addBox(
    g, 0.26, 0.008, 0.26,
    toon('#ff8a4a', { emissive: '#ff6a2a', emissiveIntensity: 0.85 }),
    x, y0 + 0.04, z,
  );
  addCyl(g, 0.035, 0.048, 0.055, toon('#e07a32'), x + 0.03, y0 + 0.075, z - 0.02, 8);
  addBox(g, 0.05, 0.02, 0.04, toon('#1f6f6a'), x - 0.05, y0 + 0.05, z + 0.04);

  addBox(g, 0.38, 0.018, 0.02, alum, x, y0 + 0.3, z + 0.02);
  addBox(g, 0.05, 0.06, 0.045, dark, x + 0.05, y0 + 0.25, z + 0.02);
  addCyl(g, 0.008, 0.006, 0.045, dark, x + 0.05, y0 + 0.2, z + 0.02, 6);
  // Bowden tube
  addCyl(g, 0.006, 0.006, 0.22, toon('#dedad2'), x + 0.1, y0 + 0.36, z - 0.06, 5);

  const screen = addBox(g, 0.012, 0.09, 0.11, dark, x + s + 0.03, y0 + 0.28, z + 0.05);
  screen.userData.noCast = true;
  addBox(
    g, 0.008, 0.06, 0.08,
    toon('#12362c', { emissive: '#3dffa0', emissiveIntensity: 0.55 }),
    x + s + 0.038, y0 + 0.28, z + 0.05,
  );
  addBox(
    g, 0.006, 0.012, 0.05,
    toon('#b7f2c8', { emissive: '#b7f2c8', emissiveIntensity: 0.8 }),
    x + s + 0.044, y0 + 0.29, z + 0.05,
  );

  addBox(g, 0.02, 0.14, 0.02, alum, x + s + 0.02, y0 + 0.36, z - 0.1);
  const spool = addCyl(g, 0.07, 0.07, 0.045, toon('#1f6f6a'), x + s + 0.12, y0 + 0.4, z - 0.1, 14);
  spool.rotation.z = Math.PI / 2;
  const hub = addCyl(g, 0.028, 0.028, 0.055, toon('#f2f0ea'), x + s + 0.12, y0 + 0.4, z - 0.1, 10);
  hub.rotation.z = Math.PI / 2;

  addContact(g, x, z, 0.72, 0.58, 0.22);
}

function finishingCart(g, layout) {
  const c = anchor(layout, 'cart');
  const metal = toon('#5c656c');
  addBox(g, 0.72, 0.04, 0.42, toon('#c4a074'), c.x, 0.78, c.z);
  addBox(g, 0.66, 0.02, 0.36, toon('#6a5340'), c.x, 0.42, c.z);
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      addBox(g, 0.03, 0.74, 0.03, metal, c.x + sx * 0.32, 0.37, c.z + sz * 0.17);
      addCyl(g, 0.028, 0.028, 0.04, toon('#1a1a1a'), c.x + sx * 0.32, 0.03, c.z + sz * 0.17, 8);
    }
  }
  // Prints waiting: a vase and a bracket, not a second printer.
  addCyl(g, 0.04, 0.055, 0.04, toon('#e07a32'), c.x - 0.12, 0.82, c.z + 0.04, 8);
  addCyl(g, 0.028, 0.04, 0.05, toon('#e07a32'), c.x - 0.12, 0.86, c.z + 0.04, 8);
  addCyl(g, 0.045, 0.03, 0.03, toon('#e07a32'), c.x - 0.12, 0.9, c.z + 0.04, 8);
  addBox(g, 0.1, 0.025, 0.06, toon('#3d5f86'), c.x + 0.14, 0.81, c.z - 0.04);
  addBox(g, 0.025, 0.06, 0.05, toon('#3d5f86'), c.x + 0.1, 0.84, c.z - 0.04);
  addBox(g, 0.16, 0.012, 0.1, toon('#2f4a3c'), c.x + 0.02, 0.45, c.z);
  addContact(g, c.x, c.z, 0.7, 0.46, 0.18);
}

function extinguisher(g, x, z) {
  addCyl(g, 0.065, 0.07, 0.4, toon('#c4312c'), x, 0.26, z, 12);
  addCyl(g, 0.04, 0.045, 0.05, toon('#222'), x, 0.48, z, 8);
  addBox(g, 0.05, 0.07, 0.008, toon('#f4f1ea'), x, 0.28, z + 0.066);
  addBox(g, 0.028, 0.012, 0.01, toon('#c4312c'), x, 0.3, z + 0.072);
  addBox(g, 0.012, 0.04, 0.01, toon('#c4312c'), x, 0.28, z + 0.072);
  const hose = addMesh(g, new THREE.TorusGeometry(0.04, 0.007, 6, 10, Math.PI * 1.2), toon('#1a1a1a'), x + 0.02, 0.34, z);
  hose.rotation.y = Math.PI / 2;
  addContact(g, x, z, 0.2, 0.2, 0.18);
}

function firstAid(g, x, y, z) {
  addBox(g, 0.28, 0.2, 0.06, toon('#f7f4ee'), x, y, z);
  addBox(g, 0.1, 0.028, 0.01, toon('#c4312c'), x, y, z + 0.03);
  addBox(g, 0.028, 0.1, 0.01, toon('#c4312c'), x, y, z + 0.03);
}

function electronicsDressing(g, layout) {
  for (const id of ['elec_desk_a', 'elec_desk_b']) {
    const desk = byId(layout, id);
    const local = place(g, desk.position[0], 0, desk.position[2], desk.rotationY || 0);
    addBox(local, 0.36, 0.008, 0.46, toon('#1e3a5c'), 0.02, 0.772, 0.02);
    // Cable drop behind the monitor.
    addBox(local, 0.012, 0.22, 0.012, toon('#222'), 0.0, 0.66, -0.22);
  }
  const b = byId(layout, 'elec_desk_b');
  const bench = place(g, b.position[0], 0, b.position[2], b.rotationY || 0);
  // Soldering station on the sitter's right of desk B.
  addCyl(bench, 0.028, 0.032, 0.02, toon('#2a2e32'), 0.12, 0.785, 0.12, 8);
  const iron = addCyl(bench, 0.006, 0.006, 0.14, toon('#c9c3b4'), 0.12, 0.86, 0.12, 5);
  iron.rotation.z = 0.5;
  addBox(bench, 0.05, 0.012, 0.035, toon('#3d6a42'), 0.05, 0.782, 0.16);
  const spool = addMesh(bench, new THREE.TorusGeometry(0.028, 0.008, 6, 10), toon('#dedad2'), -0.12, 0.8, 0.14);
  spool.rotation.y = 0.4;
  addBox(bench, 0.1, 0.006, 0.07, toon('#1f6f4a'), -0.02, 0.78, 0.08);
  addBox(bench, 0.02, 0.012, 0.015, toon('#111'), -0.04, 0.786, 0.08);
  addBox(bench, 0.015, 0.01, 0.012, toon('#111'), 0.01, 0.784, 0.09);

  const a = byId(layout, 'elec_desk_a');
  const meter = place(g, a.position[0], 0, a.position[2], a.rotationY || 0);
  addBox(meter, 0.1, 0.03, 0.07, toon('#e07a32'), -0.1, 0.79, 0.12);
  addBox(meter, 0.06, 0.008, 0.035, toon('#102820', { emissive: '#3dffa0', emissiveIntensity: 0.35 }), -0.1, 0.81, 0.12);
  addCyl(meter, 0.008, 0.008, 0.05, toon('#222'), -0.05, 0.79, 0.18, 5);
}

function screenGlows(g, layout) {
  for (const id of ['elec_mon_a', 'elec_mon_b']) {
    const mon = byId(layout, id);
    const local = place(g, mon.position[0], mon.position[1], mon.position[2], mon.rotationY || 0);
    const panel = addMesh(
      local,
      new THREE.PlaneGeometry(0.28, 0.11),
      toon('#0e2a28', { emissive: '#1f8a72', emissiveIntensity: 0.4, side: THREE.DoubleSide }),
      0, 0.13, 0.02,
    );
    panel.userData.noCast = true;
    const bar = addMesh(
      local,
      new THREE.PlaneGeometry(0.16, 0.01),
      toon('#b7f2c8', { emissive: '#c8ffd8', emissiveIntensity: 0.75, side: THREE.DoubleSide }),
      -0.02, 0.15, 0.026,
    );
    bar.userData.noCast = true;
    const bar2 = addMesh(
      local,
      new THREE.PlaneGeometry(0.08, 0.008),
      toon('#e0b02a', { emissive: '#ffe08a', emissiveIntensity: 0.5, side: THREE.DoubleSide }),
      -0.05, 0.11, 0.026,
    );
    bar2.userData.noCast = true;
  }
}

function lampBulbs(g, layout) {
  for (const id of ['elec_lamp_a', 'elec_lamp_b']) {
    const lamp = byId(layout, id);
    addMesh(
      g,
      new THREE.SphereGeometry(0.022, 10, 8),
      toon('#fff4d2', { emissive: '#ffd48a', emissiveIntensity: 0.9 }),
      lamp.position[0],
      lamp.position[1] + 0.24,
      lamp.position[2],
    );
  }
  for (const id of ['pend_a', 'pend_b']) {
    const p = byId(layout, id);
    addMesh(
      g,
      new THREE.SphereGeometry(0.045, 10, 8),
      toon('#fff1c4', { emissive: '#ffc56a', emissiveIntensity: 1.15 }),
      p.position[0],
      p.position[1] + 0.08,
      p.position[2],
    );
  }
}

function assemblyDressing(g, layout) {
  const t = byId(layout, 'assembly');
  const x = t.position[0];
  const z = t.position[2];
  const y = 0.772;
  addBox(g, 0.52, 0.008, 0.36, toon('#2f6a45'), x - 0.05, y, z + 0.02);
  // Open chassis, one cheek painted.
  const m = toon('#2a3138');
  addBox(g, 0.26, 0.01, 0.16, m, x - 0.02, y + 0.01, z + 0.02);
  addBox(g, 0.26, 0.07, 0.01, m, x - 0.02, y + 0.04, z - 0.05);
  addBox(g, 0.01, 0.07, 0.16, m, x - 0.15, y + 0.04, z + 0.02);
  addBox(g, 0.01, 0.07, 0.16, toon('#c4512c'), x + 0.11, y + 0.04, z + 0.02);
  addBox(g, 0.14, 0.006, 0.08, toon('#1f6f4a'), x - 0.02, y + 0.02, z + 0.02);
  const driver = addCyl(g, 0.006, 0.008, 0.16, toon('#c4512c'), x + 0.16, y + 0.02, z - 0.06, 5);
  driver.rotation.z = Math.PI / 2;
  driver.rotation.y = 0.4;
  const screws = [[0.08, 0.08], [0.12, 0.02], [0.05, -0.02], [-0.18, 0.1]];
  screws.forEach(([dx, dz], i) => {
    addCyl(g, 0.008, 0.008, 0.006, toon(i === 2 ? '#e0b02a' : '#c5c8cc'), x + dx, y + 0.012, z + dz, 6);
  });
}

function chalkMarks(g, layout) {
  const b = byId(layout, 'board');
  const z = b.position[2] + 0.3;
  const x = b.position[0];
  const y = 1.05;
  const chalk = toon('#f4f1ea');
  const note = toon('#e0b02a');
  addBox(g, 0.55, 0.012, 0.008, chalk, x - 0.15, y + 0.28, z);
  addBox(g, 0.012, 0.32, 0.008, chalk, x - 0.4, y + 0.14, z);
  addBox(g, 0.22, 0.14, 0.008, toon('#e7d7a8'), x + 0.22, y + 0.22, z);
  addBox(g, 0.36, 0.01, 0.008, note, x + 0.05, y - 0.02, z);
  addBox(g, 0.01, 0.16, 0.008, note, x - 0.08, y - 0.08, z);
  addBox(g, 0.18, 0.01, 0.008, chalk, x + 0.28, y - 0.16, z);
}

function shopLights(g, layout) {
  const housing = toon('#2e3338');
  const diff = toon('#fff6dd', { emissive: '#ffe7b0', emissiveIntensity: 0.9 });
  const bench = anchor(layout, 'bench');
  addBox(g, 1.45, 0.06, 0.16, housing, bench.x, 2.72, bench.z + 0.05);
  const d1 = addBox(g, 1.28, 0.015, 0.08, diff, bench.x, 2.685, bench.z + 0.05);
  d1.userData.noCast = true;
  const printer = anchor(layout, 'printer');
  addBox(g, 0.85, 0.05, 0.14, housing, printer.x, 2.68, printer.z);
  const d2 = addBox(g, 0.7, 0.012, 0.07, diff, printer.x, 2.65, printer.z);
  d2.userData.noCast = true;
}

function ceiling(g, layout) {
  const { width: W, depth: D, height: H } = layout.meta.room;
  const steel = toon('#4e555c');
  const panel = toon('#d9d2c4');
  const xs = [-3.5, -1.85, -0.15, 1.7, 3.45];
  const z0 = -D / 2 + 0.35;
  const z1 = 0.15;
  const len = z1 - z0;
  const zc = (z0 + z1) / 2;
  xs.forEach((x) => {
    addBox(g, 0.07, 0.18, len, steel, x, H - 0.2, zc);
  });
  for (let i = 0; i < xs.length - 1; i++) {
    const x = (xs[i] + xs[i + 1]) / 2;
    const w = xs[i + 1] - xs[i] - 0.1;
    addBox(g, w, 0.04, len - 0.08, panel, x, H - 0.08, zc);
  }
  // Beam tying the open corner back to the left wall.
  addBox(g, W - 0.5, 0.1, 0.1, steel, -0.15, H - 0.12, -D / 2 + 0.28);
  const colX = W / 2 - 0.28;
  const colZ = -D / 2 + 0.28;
  addBox(g, 0.12, H, 0.12, steel, colX, H / 2, colZ);
  addBox(g, 0.2, 0.03, 0.2, toon('#2e3338'), colX, 0.02, colZ);
  addBox(g, 0.18, 0.04, 0.18, toon('#2e3338'), colX, H - 0.08, colZ);
}

function windowAndTrim(g, layout) {
  const { width: W, height: H } = layout.meta.room;
  const z0 = -0.15;
  const z1 = 2.85;
  const y0 = 1.92;
  const y1 = 2.8;
  const x = -W / 2 + 0.02;
  const glass = addBox(
    g,
    0.02,
    y1 - y0 - 0.06,
    z1 - z0 - 0.06,
    toon('#c5d4dd', { transparent: true, opacity: 0.45, side: THREE.DoubleSide }),
    x,
    (y0 + y1) / 2,
    (z0 + z1) / 2,
  );
  glass.userData.noCast = true;
  const frame = toon('#3e444a');
  addBox(g, 0.06, 0.05, z1 - z0, frame, -W / 2 + 0.08, y1, (z0 + z1) / 2);
  addBox(g, 0.06, 0.05, z1 - z0, frame, -W / 2 + 0.08, y0, (z0 + z1) / 2);
  addBox(g, 0.06, y1 - y0, 0.05, frame, -W / 2 + 0.08, (y0 + y1) / 2, z0);
  addBox(g, 0.06, y1 - y0, 0.05, frame, -W / 2 + 0.08, (y0 + y1) / 2, z1);
  for (let z = z0 + 0.7; z < z1 - 0.2; z += 0.72) {
    addBox(g, 0.04, y1 - y0, 0.035, frame, -W / 2 + 0.09, (y0 + y1) / 2, z);
  }
  // Blind dropped over the back pane only.
  addBox(g, 0.02, 0.28, 0.62, toon('#efe6d2'), -W / 2 + 0.1, y1 - 0.16, z0 + 0.38);
  // Sill
  addBox(g, 0.1, 0.03, z1 - z0, toon('#d7d0c4'), -W / 2 + 0.12, y0 - 0.01, (z0 + z1) / 2);
  // Conduit along the back wall and a drop near the printer.
  const { depth: D } = layout.meta.room;
  addBox(g, W - 0.8, 0.035, 0.035, frame, -0.2, H - 0.28, -D / 2 + 0.12);
  const printer = anchor(layout, 'printer');
  addBox(g, 0.03, 0.7, 0.03, frame, printer.x + 0.35, H - 0.7, -D / 2 + 0.14);
  // Outlet by the electronics.
  addBox(g, 0.02, 0.1, 0.14, toon('#f4f1ea'), -W / 2 + 0.12, 0.4, -1.0);
  addBox(g, 0.012, 0.025, 0.04, toon('#222'), -W / 2 + 0.135, 0.42, -1.03);
  addBox(g, 0.012, 0.025, 0.04, toon('#222'), -W / 2 + 0.135, 0.42, -0.97);
}

function floorFinish(g, layout) {
  const { width: W, depth: D } = layout.meta.room;
  const joint = toon('#aea89e');
  const xs = [-3.1, -0.9, 1.35, 3.2];
  xs.forEach((x) => addBox(g, 0.012, 0.006, D - 0.4, joint, x, 0.004, -0.1));
  const zs = [-2.2, -0.35, 1.55];
  zs.forEach((z) => addBox(g, W - 0.5, 0.006, 0.012, joint, -0.1, 0.004, z));

  const bench = anchor(layout, 'bench');
  const table = byId(layout, 'assembly');
  addBox(g, 2.7, 0.01, 1.15, toon('#3a3d40'), bench.x, 0.008, bench.z + 0.28);
  addBox(g, 1.55, 0.01, 1.35, toon('#2c3a38'), -3.7, 0.008, -1.05);
  addBox(g, 2.5, 0.008, 2.35, toon('#9a958c'), table.position[0], 0.006, table.position[2]);

  const yellow = toon('#e0b02a');
  // Dashed keep-clear along the open right aisle.
  for (let i = 0; i < 6; i++) {
    addBox(g, 0.08, 0.008, 0.42, yellow, 2.15, 0.01, 0.55 + i * 0.52);
  }
  // Stand line in front of the hand bench.
  addBox(g, 2.3, 0.008, 0.06, yellow, bench.x, 0.01, bench.z + 0.72);

  const printer = anchor(layout, 'printer');
  addBox(g, 0.1, 0.03, 0.55, toon('#3a4046'), printer.x + 0.05, 0.018, printer.z + 0.48);
}

function groundCatalog(g, layout) {
  const footprints = {
    study_desk: [0.45, 1.3],
    dining_chair: [0.4, 0.46],
    square_table: [0.82, 0.82],
    bar_stool: [0.38, 0.38],
    chalkboard: [0.48, 1.72],
    flowerpot: [0.28, 0.28],
  };
  for (const inst of layout.instances || []) {
    const base = footprints[inst.kind];
    if (!base) continue;
    let w = base[0];
    let d = base[1];
    if (Array.isArray(inst.scale)) {
      w *= inst.scale[0] || 1;
      d *= inst.scale[2] || inst.scale[0] || 1;
    }
    const rot = Math.abs(inst.rotationY || 0);
    const folded = Math.min(rot % Math.PI, Math.PI - (rot % Math.PI));
    if (folded > Math.PI / 4) [w, d] = [d, w];
    addContact(g, inst.position[0], inst.position[2], w * 0.96, d * 0.96, 0.2);
  }
}

function trash(g, x, z) {
  addCyl(g, 0.16, 0.14, 0.38, toon('#3a4046'), x, 0.19, z, 12);
  addCyl(g, 0.17, 0.17, 0.03, toon('#2a2e32'), x, 0.39, z, 12);
  addContact(g, x, z, 0.32, 0.32, 0.16);
}

function makeShell(layout) {
  const g = makeCutawayShell(layout, {
    ceiling: false,
    wainscotH: 0.14,
    leftOpening: { z0: -0.15, z1: 2.85, y0: 1.92, y1: 2.8 },
  });
  ceiling(g, layout);
  windowAndTrim(g, layout);
  floorFinish(g, layout);
  const { width: W, depth: D } = layout.meta.room;
  firstAid(g, -W / 2 + 0.12, 1.45, -D / 2 + 0.55);
  return g;
}

function makeProcedural(layout) {
  const g = new THREE.Group();
  g.name = 'procedural';
  const { width: W, depth: D } = layout.meta.room;
  toolWall(g, layout);
  standingBench(g, layout);
  toolChest(g, layout);
  binRack(g, layout);
  printer(g, layout);
  finishingCart(g, layout);
  extinguisher(g, -W / 2 + 0.38, -D / 2 + 0.42);
  electronicsDressing(g, layout);
  screenGlows(g, layout);
  lampBulbs(g, layout);
  assemblyDressing(g, layout);
  chalkMarks(g, layout);
  shopLights(g, layout);
  groundCatalog(g, layout);
  trash(g, W / 2 - 0.55, D / 2 - 0.7);
  const pot = byId(layout, 'plant');
  addCyl(g, 0.018, 0.024, 0.16, toon('#3e5334'), pot.position[0], 0.36, pot.position[2], 6);
  addBox(g, 0.22, 0.16, 0.18, toon('#3d6a42'), pot.position[0], 0.5, pot.position[2]);
  addBox(g, 0.14, 0.12, 0.12, toon('#2c5536'), pot.position[0] + 0.06, 0.58, pot.position[2] - 0.03);
  // Spools and a loose lead on the bin crown — jars are catalog instances.
  const bins = anchor(layout, 'bins');
  const s1 = addCyl(g, 0.07, 0.07, 0.04, toon('#e07a32'), bins.x - 0.22, 1.61, bins.z - 0.02, 12);
  s1.rotation.z = Math.PI / 2;
  const s2 = addCyl(g, 0.055, 0.055, 0.035, toon('#f2f0ea'), bins.x + 0.08, 1.6, bins.z + 0.02, 12);
  s2.rotation.x = Math.PI / 2;
  return g;
}

boot({
  makeShell,
  makeProcedural,
  readyText: 'ready — maker workshop · drag orbit · U unlit · T toon',
}).catch((err) => {
  console.error(err);
  const s = document.getElementById('status');
  if (s) s.textContent = `error: ${err.message || err}`;
});
