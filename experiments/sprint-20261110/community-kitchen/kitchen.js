import * as THREE from 'three';
import { boot, toon, contactDisc } from './scene_lib.js';

function box(g, w, h, d, mat, x, y, z, rotY = 0, extra = {}) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  if (rotY) m.rotation.y = rotY;
  if (extra.noShadow) m.userData.noShadow = true;
  m.castShadow = !extra.noShadow;
  m.receiveShadow = !extra.noShadow;
  g.add(m);
  return m;
}

function cyl(g, rt, rb, h, mat, x, y, z, seg = 16, rotX = 0) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat);
  m.position.set(x, y, z);
  if (rotX) m.rotation.x = rotX;
  m.castShadow = true;
  m.receiveShadow = true;
  g.add(m);
  return m;
}

function put(g, geo, mat, x, y, z, rot, extra = {}) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  if (rot) m.rotation.set(rot[0] || 0, rot[1] || 0, rot[2] || 0);
  if (extra.noShadow) m.userData.noShadow = true;
  m.castShadow = !extra.noShadow;
  m.receiveShadow = !extra.noShadow;
  g.add(m);
  return m;
}

function makeTextures() {
  function canvas(w, h, draw) {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    draw(c.getContext('2d'), w, h);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.wrapS = THREE.RepeatWrapping;
    t.wrapT = THREE.RepeatWrapping;
    t.magFilter = THREE.LinearFilter;
    t.minFilter = THREE.LinearMipmapLinearFilter;
    return t;
  }

  const wood = canvas(512, 256, (ctx, w, h) => {
    ctx.fillStyle = '#c6a36b';
    ctx.fillRect(0, 0, w, h);
    const rows = 6;
    for (let i = 0; i < rows; i++) {
      const y = (i * h) / rows;
      ctx.fillStyle = i % 2 ? '#d2b07a' : '#b99258';
      ctx.fillRect(0, y + 1, w, h / rows - 2);
      ctx.fillStyle = 'rgba(90,60,30,0.18)';
      for (let k = 0; k < 8; k++) {
        const yy = y + 4 + ((i * 17 + k * 23) % (h / rows - 8));
        ctx.fillRect(0, yy, w, 1);
      }
    }
    ctx.fillStyle = '#8a6840';
    for (let i = 0; i <= rows; i++) ctx.fillRect(0, (i * h) / rows - 1, w, 2);
  });
  wood.repeat.set(2.2, 3.4);

  const butcher = canvas(256, 128, (ctx, w, h) => {
    ctx.fillStyle = '#e7c99a';
    ctx.fillRect(0, 0, w, h);
    for (let x = 0; x < w; x += 10) {
      ctx.fillStyle = x % 20 === 0 ? '#d7b07a' : '#f0d7aa';
      ctx.fillRect(x, 0, 8, h);
    }
  });
  butcher.repeat.set(3, 1.2);

  const tile = canvas(256, 256, (ctx, w, h) => {
    const n = 4;
    const grout = 6;
    ctx.fillStyle = '#c9bfb2';
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        ctx.fillStyle = (i + j) % 2 ? '#e7dfd4' : '#ddd4c8';
        ctx.fillRect(i * (w / n) + grout / 2, j * (h / n) + grout / 2, w / n - grout, h / n - grout);
      }
    }
  });
  tile.repeat.set(6, 4);

  const splash = canvas(256, 256, (ctx, w, h) => {
    const n = 8;
    const grout = 4;
    ctx.fillStyle = '#c5cec6';
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        ctx.fillStyle = (i + j) % 2 ? '#f4efe4' : '#ebe4d6';
        ctx.fillRect(i * (w / n) + 2, j * (h / n) + 2, w / n - grout, h / n - grout);
      }
    }
  });
  splash.repeat.set(2.4, 1.1);

  const rug = canvas(256, 256, (ctx, w, h) => {
    ctx.fillStyle = '#6e5344';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#e6d2a8';
    ctx.lineWidth = 10;
    ctx.strokeRect(16, 16, w - 32, h - 32);
    ctx.strokeStyle = '#3d5248';
    ctx.lineWidth = 6;
    ctx.strokeRect(28, 28, w - 56, h - 56);
    ctx.fillStyle = '#8d6a52';
    ctx.fillRect(48, 48, w - 96, h - 96);
  });

  return { wood, butcher, tile, splash, rug };
}

let TEX;
function tex() {
  if (!TEX) TEX = makeTextures();
  return TEX;
}

function makeShell(layout) {
  const g = new THREE.Group();
  g.name = 'shell';
  const { width: W, depth: D, height: H } = layout.meta.room;
  const s = layout.shell;
  const z = layout.zones;
  const tw = 0.12;
  const wall = toon(s.wallColor);
  const trim = toon(s.woodColor);
  const plaster = toon(s.wallColor);
  const glass = toon(s.windowTint, { transparent: true, opacity: 0.22, side: THREE.DoubleSide, depthWrite: false });
  const ceilMat = toon(s.ceilingColor);
  const edge = toon('#a8844e');

  box(g, W, 0.08, D, edge, 0, -0.04, 0);

  const seam = z.counter.zFront + 0.42;
  const woodMat = toon('#ffffff', { map: tex().wood });
  const tileMat = toon('#ffffff', { map: tex().tile });
  const woodD = D / 2 - seam;
  box(g, W - 0.02, 0.016, woodD, woodMat, 0, 0.008, (seam + D / 2) / 2);
  const tileD = seam - (-D / 2);
  box(g, W - 0.02, 0.02, tileD, tileMat, 0, 0.01, (-D / 2 + seam) / 2);
  box(g, W - 0.4, 0.028, 0.06, trim, 0, 0.02, seam);

  const sinkW = z.windows.sink;
  const leftW = z.windows.left;
  const bz = -D / 2 + tw / 2;
  const lx = -W / 2 + tw / 2;

  // Back wall, punched for the sink window.
  box(g, W, sinkW.y0, tw, plaster, 0, sinkW.y0 / 2, bz);
  box(g, W, H - sinkW.y1, tw, plaster, 0, (H + sinkW.y1) / 2, bz);
  const leftBand = sinkW.x0 - (-W / 2);
  box(g, leftBand, sinkW.y1 - sinkW.y0, tw, plaster, -W / 2 + leftBand / 2, (sinkW.y0 + sinkW.y1) / 2, bz);
  const rightBand = W / 2 - sinkW.x1;
  box(g, rightBand, sinkW.y1 - sinkW.y0, tw, plaster, sinkW.x1 + rightBand / 2, (sinkW.y0 + sinkW.y1) / 2, bz);

  // Left wall, punched for the classroom window.
  box(g, tw, leftW.y0, D, plaster, lx, leftW.y0 / 2, 0);
  box(g, tw, H - leftW.y1, D, plaster, lx, (H + leftW.y1) / 2, 0);
  const backBand = leftW.z0 - (-D / 2);
  box(g, tw, leftW.y1 - leftW.y0, backBand, plaster, lx, (leftW.y0 + leftW.y1) / 2, -D / 2 + backBand / 2);
  const frontBand = D / 2 - leftW.z1;
  box(g, tw, leftW.y1 - leftW.y0, frontBand, plaster, lx, (leftW.y0 + leftW.y1) / 2, leftW.z1 + frontBand / 2);

  // Short return closes the cook line; the classroom side stays open.
  const rz1 = z.rightReturnZ;
  const rz0 = -D / 2;
  const rx = W / 2 - tw / 2;
  box(g, tw, H, rz1 - rz0, plaster, rx, H / 2, (rz0 + rz1) / 2);
  box(g, 0.06, 0.92, rz1 - rz0 - 0.08, trim, rx - 0.07, 0.46, (rz0 + rz1) / 2);

  // Frames, glass, sills, a hint of outside so the openings are not empty.
  const outside = toon('#d5e2ea', { side: THREE.DoubleSide });
  const garden = toon('#c9d7c4', { side: THREE.DoubleSide });
  frameWindowX(g, sinkW, bz + 0.09, trim, glass);
  box(g, sinkW.x1 - sinkW.x0 - 0.12, sinkW.y1 - sinkW.y0 - 0.12, 0.02, outside, (sinkW.x0 + sinkW.x1) / 2, (sinkW.y0 + sinkW.y1) / 2, -D / 2 - 0.02, 0, { noShadow: true });
  box(g, sinkW.x1 - sinkW.x0 + 0.08, 0.04, 0.16, trim, (sinkW.x0 + sinkW.x1) / 2, sinkW.y0 - 0.01, bz + 0.08);

  frameWindowZ(g, leftW, lx + 0.09, trim, glass);
  box(g, 0.02, leftW.y1 - leftW.y0 - 0.12, leftW.z1 - leftW.z0 - 0.12, garden, -W / 2 - 0.02, (leftW.y0 + leftW.y1) / 2, (leftW.z0 + leftW.z1) / 2, 0, { noShadow: true });
  box(g, 0.18, 0.04, leftW.z1 - leftW.z0 + 0.08, trim, lx + 0.08, leftW.y0 - 0.01, (leftW.z0 + leftW.z1) / 2);

  // Wainscot on the classroom left wall, stopping around the window opening.
  const wainscotBack = leftW.z0 + D / 2 - 0.15;
  box(g, 0.04, 0.86, wainscotBack, trim, lx + 0.06, 0.43, (-D / 2 + leftW.z0 - 0.15) / 2);
  box(g, 0.04, 0.86, leftW.z1 - leftW.z0 - 0.08, trim, lx + 0.06, 0.43, (leftW.z0 + leftW.z1) / 2);
  const ceilD = D * 0.64;
  box(g, W * 0.9, 0.08, ceilD, ceilMat, -0.2, H - 0.05, -D * 0.16);
  // Beams over the island, clear of the three pendants.
  box(g, 0.1, 0.14, 3.3, trim, -1.7, H - 0.22, -1.5);
  box(g, 0.1, 0.14, 3.3, trim, 1.7, H - 0.22, -1.5);

  // Baseboard on the left classroom wall and a picture rail.
  box(g, 0.03, 0.08, D - 0.3, trim, lx + 0.07, 0.04, 0.1);
  box(g, 0.03, 0.04, D - 0.4, trim, lx + 0.05, 2.55, 0);

  return g;
}

function frameWindowX(g, hole, z, trim, glass) {
  const w = hole.x1 - hole.x0;
  const h = hole.y1 - hole.y0;
  const cx = (hole.x0 + hole.x1) / 2;
  const cy = (hole.y0 + hole.y1) / 2;
  box(g, w + 0.08, 0.05, 0.06, trim, cx, hole.y1, z);
  box(g, w + 0.08, 0.05, 0.06, trim, cx, hole.y0, z);
  box(g, 0.05, h, 0.06, trim, hole.x0, cy, z);
  box(g, 0.05, h, 0.06, trim, hole.x1, cy, z);
  box(g, 0.035, h - 0.08, 0.04, trim, cx, cy, z + 0.01);
  box(g, w - 0.08, 0.035, 0.04, trim, cx, cy, z + 0.01);
  box(g, w - 0.1, h - 0.1, 0.015, glass, cx, cy, z - 0.01, 0, { noShadow: true });
}

function frameWindowZ(g, hole, x, trim, glass) {
  const w = hole.z1 - hole.z0;
  const h = hole.y1 - hole.y0;
  const cz = (hole.z0 + hole.z1) / 2;
  const cy = (hole.y0 + hole.y1) / 2;
  box(g, 0.06, 0.05, w + 0.08, trim, x, hole.y1, cz);
  box(g, 0.06, 0.05, w + 0.08, trim, x, hole.y0, cz);
  box(g, 0.06, h, 0.05, trim, x, cy, hole.z0);
  box(g, 0.06, h, 0.05, trim, x, cy, hole.z1);
  box(g, 0.04, h - 0.08, 0.035, trim, x + 0.01, cy, cz);
  box(g, 0.04, 0.035, w - 0.08, trim, x + 0.01, cy, cz);
  box(g, 0.015, h - 0.1, w - 0.1, glass, x - 0.01, cy, cz, 0, { noShadow: true });
}

function shaker(g, w, h, dFace, face, inset, handle, x, y, z, axis) {
  // axis 'z' door faces ±Z (depth is z). axis 'x' faces ±X.
  if (axis === 'z') {
    box(g, w - 0.016, h - 0.016, 0.02, face, x, y, z);
    box(g, w - 0.09, h - 0.1, 0.012, inset, x, y, z + Math.sign(dFace) * 0.012);
    box(g, 0.014, Math.min(0.16, h * 0.28), 0.018, handle, x + w * 0.28, y, z + Math.sign(dFace) * 0.02);
  } else {
    box(g, 0.02, h - 0.016, w - 0.016, face, x, y, z);
    box(g, 0.012, h - 0.1, w - 0.09, inset, x + Math.sign(dFace) * 0.012, y, z);
    box(g, 0.018, Math.min(0.16, h * 0.28), 0.014, handle, x + Math.sign(dFace) * 0.02, y, z + w * 0.28);
  }
}

function makeProcedural(layout) {
  const g = new THREE.Group();
  g.name = 'procedural';
  const s = layout.shell;
  const z = layout.zones;
  const { width: W, depth: D, height: H } = layout.meta.room;
  const island = z.island;
  const counter = z.counter;

  const sage = toon('#3d5248');
  const sageIn = toon('#2c3d36');
  const oak = toon('#6e4e34');
  const oakIn = toon('#5a3f2a');
  const oakDark = toon('#3f2c1e');
  const stone = toon('#d9d2c6');
  const stoneEdge = toon('#b7ad9e');
  const block = toon('#ffffff', { map: tex().butcher });
  const blockEdge = toon('#c9a066');
  const steel = toon('#d5dce2');
  const steelDark = toon('#4a535c');
  const iron = toon('#2c3238');
  const handle = toon('#e7ebef');
  const splash = toon('#ffffff', { map: tex().splash });
  const flame = toon('#5a2a16', { emissive: '#ff8a3a', emissiveIntensity: 0.85 });
  const bulbMat = toon('#fff1d2', { emissive: '#ffd39a', emissiveIntensity: 1.15 });
  const stripMat = toon('#ffe6c2', { emissive: '#ffc98a', emissiveIntensity: 0.7 });
  const soup = toon('#c45a32');
  const cream = toon('#f4efe6');
  const tomato = toon('#c44736');
  const leaf = toon('#2f6b3a');
  const lemon = toon('#e6c84a');
  const onion = toon('#e4c0ae');
  const carrot = toon('#e07a32');
  const bread = toon('#e0b06a');
  const crust = toon('#b88448');
  const oil = toon('#6d7a38');
  const water = toon('#b7c9ce');
  const chalk = toon('#1e3328');
  const towel = toon('#f2efe6');
  const towelBand = toon('#3d5248');
  const rugMat = toon('#ffffff', { map: tex().rug });

  buildCounter(g, counter, z, { sage, sageIn, stone, stoneEdge, splash, steel, steelDark, iron, handle, flame, water, cream, towel, towelBand });
  buildIsland(g, island, { oak, oakIn, oakDark, block, blockEdge, steel, handle, cream, soup, towel, towelBand });
  buildFridge(g, z.fridge, { steel, steelDark, handle, iron });
  // Baker's rack against the left wall, clear of the default camera.
  buildRack(g, -4.96, -2.35, { oak, steel, crust, cream }, Math.PI / 2);
  buildBins(g, 4.62, -3.22, { sage, steelDark, handle });
  buildLesson(g, layout, chalk);
  buildProps(g, layout, { tomato, leaf, lemon, onion, carrot, bread, crust, oil, cream, soup, steel, oak, oakDark });
  buildLights(g, layout, bulbMat, stripMat, H);
  buildHerb(g, layout, leaf);

  // Work mat in the stance in front of the range and sink.
  box(g, 2.35, 0.012, 0.72, rugMat, 0.26, 0.028, -2.7);

  contactDisc(g, island.x, island.z, island.w * 0.46, island.d * 0.48, 0.45);
  contactDisc(g, z.fridge.x, z.fridge.z, 0.48, 0.42, 0.4);
  contactDisc(g, z.tasting.x, z.tasting.z, 0.7, 0.55, 0.35);
  contactDisc(g, -4.58, -3.42, 0.5, 0.32, 0.35);
  contactDisc(g, -4.96, -2.35, 0.32, 0.5, 0.3);
  for (const inst of layout.instances) {
    if (inst.kind === 'bar_stool' || inst.kind === 'dining_chair') {
      contactDisc(g, inst.position[0], inst.position[2], 0.28, 0.28, 0.4);
    }
  }

  // Clock over the pass, between hood and window.
  const clockY = 2.55;
  const clockX = -1.15;
  const clockZ = -D / 2 + 0.16;
  put(g, new THREE.CylinderGeometry(0.14, 0.14, 0.03, 24), cream, clockX, clockY, clockZ, [Math.PI / 2, 0, 0]);
  put(g, new THREE.BoxGeometry(0.012, 0.07, 0.012), iron, clockX, clockY + 0.02, clockZ + 0.02);
  put(g, new THREE.BoxGeometry(0.05, 0.012, 0.012), iron, clockX + 0.02, clockY - 0.01, clockZ + 0.02);

  return g;
}

function buildCounter(g, c, zones, m) {
  const zBack = c.zFront - c.depth;
  const zc = (c.zFront + zBack) / 2;
  const range = zones.range;
  const sink = zones.sink;
  const r0 = range.x - range.w / 2;
  const r1 = range.x + range.w / 2;
  const toe = 0.1;
  const topT = 0.045;
  const bodyTop = c.h - topT;

  // Carcass segments left and right of the range.
  for (const [x0, x1] of [[c.x0, r0], [r1, c.x1]]) {
    const w = x1 - x0;
    box(g, w, bodyTop - toe, c.depth - 0.04, m.sage, (x0 + x1) / 2, (bodyTop + toe) / 2, zc + 0.01);
    box(g, w - 0.06, toe - 0.01, c.depth - 0.12, m.sageIn, (x0 + x1) / 2, toe / 2, zc + 0.02);
    const doors = Math.max(1, Math.round(w / 0.46));
    const dw = w / doors;
    for (let i = 0; i < doors; i++) {
      const x = x0 + dw * (i + 0.5);
      shaker(g, dw, bodyTop - toe - 0.04, 1, m.sage, m.sageIn, m.handle, x, (bodyTop + toe) / 2 + 0.01, c.zFront + 0.012, 'z');
    }
  }

  // Stone top, broken only by the range.
  slabTop(g, c.x0, r0, zBack, c.zFront, c.h, m.stone, m.stoneEdge);
  slabTop(g, r1, c.x1, zBack, c.zFront, c.h, m.stone, m.stoneEdge);

  // Backsplash up to the shelf line, with a short tile apron under the window.
  const splashTop = zones.shelfY - 0.02;
  const win = zones.windows.sink;
  splashPanel(g, c.x0, r0 - 0.02, c.h, splashTop, zBack + 0.025, m.splash);
  splashPanel(g, r1 + 0.02, win.x0 - 0.02, c.h, splashTop, zBack + 0.025, m.splash);
  splashPanel(g, win.x0, win.x1, c.h, win.y0 - 0.02, zBack + 0.025, m.splash);
  splashPanel(g, win.x1 + 0.02, c.x1, c.h, splashTop, zBack + 0.025, m.splash);

  buildRange(g, range, c, m);
  buildSink(g, sink, c, m);
  buildHood(g, range, c, zones, m);
}

function slabTop(g, x0, x1, z0, z1, h, top, edge) {
  const w = x1 - x0;
  const d = z1 - z0;
  box(g, w, 0.045, d, top, (x0 + x1) / 2, h - 0.022, (z0 + z1) / 2);
  box(g, w, 0.02, 0.025, edge, (x0 + x1) / 2, h - 0.05, z1 - 0.01);
}

function splashPanel(g, x0, x1, y0, y1, z, mat) {
  if (x1 - x0 < 0.08 || y1 - y0 < 0.05) return;
  box(g, x1 - x0, y1 - y0, 0.02, mat, (x0 + x1) / 2, (y0 + y1) / 2, z);
}

function buildRange(g, range, c, m) {
  const zBack = c.zFront - c.depth;
  const w = range.w;
  const x = range.x;
  // Oven carcass.
  box(g, w + 0.04, c.h - 0.1, c.depth, m.steel, x, (c.h - 0.1) / 2 + 0.02, (zBack + c.zFront) / 2);
  box(g, w - 0.12, 0.48, 0.03, m.steelDark, x, 0.42, c.zFront + 0.02);
  box(g, w - 0.28, 0.22, 0.012, toon('#1c2128'), x, 0.46, c.zFront + 0.038);
  box(g, w - 0.22, 0.02, 0.03, m.handle, x, 0.64, c.zFront + 0.04);
  // Cooktop.
  box(g, w + 0.06, 0.045, c.depth + 0.02, m.iron, x, c.h - 0.022, (zBack + c.zFront) / 2);
  box(g, w, 0.1, 0.04, m.steel, x, c.h + 0.05, zBack + 0.04);
  const spots = [[-0.18, -0.1], [0.18, -0.1], [-0.18, 0.12], [0.18, 0.12]];
  for (const [dx, dz] of spots) {
    cyl(g, 0.09, 0.09, 0.012, m.iron, x + dx, c.h + 0.008, (zBack + c.zFront) / 2 + dz, 18);
    box(g, 0.16, 0.008, 0.012, m.steelDark, x + dx, c.h + 0.016, (zBack + c.zFront) / 2 + dz);
    box(g, 0.012, 0.008, 0.16, m.steelDark, x + dx, c.h + 0.016, (zBack + c.zFront) / 2 + dz);
  }
  // Front-left burner lit.
  cyl(g, 0.045, 0.02, 0.03, m.flame, x - 0.18, c.h + 0.03, (zBack + c.zFront) / 2 + 0.12, 10);
  // Knobs.
  for (let i = 0; i < 4; i++) {
    cyl(g, 0.018, 0.018, 0.02, m.handle, x - 0.24 + i * 0.16, c.h - 0.07, c.zFront + 0.02, 8, Math.PI / 2);
  }
}

function buildHood(g, range, c, zones, m) {
  const H = 3.12;
  const zBack = c.zFront - c.depth;
  const x = range.x;
  const canopy = toon('#f3f0e8');
  const glow = toon('#ffe6c2', { emissive: '#ffc98a', emissiveIntensity: 0.65 });
  box(g, range.w + 0.16, 0.42, 0.52, canopy, x, 1.72, zBack + 0.32);
  box(g, range.w - 0.1, 0.018, 0.34, glow, x, 1.50, zBack + 0.34, 0, { noShadow: true });
  box(g, 0.28, 0.7, 0.22, m.steel, x, 2.22, zBack + 0.16);
  box(g, 0.2, H - 2.52, 0.16, m.steel, x, (H + 2.52) / 2, zBack + 0.14);
  for (let i = -1; i <= 1; i++) {
    box(g, range.w - 0.2, 0.012, 0.02, m.steelDark, x, 1.56, zBack + 0.28 + i * 0.08);
  }
  void zones;
}

function buildSink(g, sink, c, m) {
  const zBack = c.zFront - c.depth;
  const x = sink.x;
  const zc = zBack + c.depth * 0.58;
  box(g, sink.w, 0.04, 0.46, m.steel, x, c.h + 0.005, zc);
  box(g, sink.w - 0.08, 0.14, 0.36, m.steelDark, x, c.h - 0.06, zc);
  box(g, sink.w - 0.14, 0.02, 0.28, m.water, x, c.h - 0.09, zc);
  // Faucet toward the window.
  const fz = zBack + 0.1;
  cyl(g, 0.016, 0.02, 0.28, m.steel, x, c.h + 0.14, fz, 10);
  put(g, new THREE.TorusGeometry(0.1, 0.012, 6, 14, Math.PI * 0.72), m.steel, x, c.h + 0.26, fz + 0.02, [0, 0, Math.PI]);
  cyl(g, 0.012, 0.012, 0.08, m.steel, x + 0.09, c.h + 0.2, fz + 0.1, 8);
  // Soap and sponge to the right of the basin.
  cyl(g, 0.035, 0.04, 0.12, toon('#7f8f86'), x + sink.w * 0.42, c.h + 0.06, zc + 0.12, 10);
  box(g, 0.08, 0.025, 0.05, toon('#d7c15a'), x + sink.w * 0.28, c.h + 0.02, zc + 0.16);
  // Dish rack just past the sink, still on the stone.
  const rx = x + sink.w * 0.55 + 0.18;
  box(g, 0.32, 0.02, 0.28, m.steelDark, rx, c.h + 0.02, zc);
  for (let i = 0; i < 4; i++) {
    box(g, 0.012, 0.16, 0.2, m.steel, rx - 0.1 + i * 0.07, c.h + 0.1, zc);
  }
  box(g, 0.012, 0.14, 0.16, m.cream, rx - 0.04, c.h + 0.12, zc, 0.15);
  box(g, 0.01, 0.12, 0.15, toon('#c44736'), rx + 0.04, c.h + 0.11, zc, -0.1);
}

function buildIsland(g, isl, m) {
  const oh = isl.overhang;
  const cabW = isl.w - oh * 2;
  const cabD = isl.d - oh * 2;
  const x0 = isl.x - cabW / 2;
  const x1 = isl.x + cabW / 2;
  const z0 = isl.z - cabD / 2;
  const z1 = isl.z + cabD / 2;
  const toe = 0.1;
  const topT = 0.05;
  const bodyTop = isl.h - topT;

  box(g, cabW - 0.08, toe - 0.015, cabD - 0.08, m.oakDark, isl.x, toe / 2, isl.z);
  box(g, cabW, bodyTop - toe, cabD, m.oak, isl.x, (bodyTop + toe) / 2, isl.z);

  // Butcher top with a nosing.
  const blockMat = m.block;
  box(g, isl.w, topT, isl.d, blockMat, isl.x, isl.h - topT / 2, isl.z);
  box(g, isl.w + 0.01, 0.012, 0.02, m.blockEdge, isl.x, isl.h - topT + 0.004, isl.z + isl.d / 2);
  box(g, isl.w + 0.01, 0.012, 0.02, m.blockEdge, isl.x, isl.h - topT + 0.004, isl.z - isl.d / 2);

  // South (class) elevation: doors, a drawer bank, doors.
  const southZ = z1 + 0.012;
  const doorH = (bodyTop - toe) * 0.72;
  const drawerH = (bodyTop - toe) - doorH;
  const cuts = [0.46, 0.46, 0.64, 0.48, 0.56];
  const sum = cuts.reduce((a, b) => a + b, 0);
  const scale = cabW / sum;
  let cursor = x0;
  cuts.forEach((raw, i) => {
    const dw = raw * scale;
    const cx = cursor + dw / 2;
    if (i === 2) {
      const dh = (bodyTop - toe - 0.04) / 3;
      for (let k = 0; k < 3; k++) {
        const y = toe + 0.02 + dh * (k + 0.5);
        box(g, dw - 0.02, dh - 0.016, 0.02, m.oak, cx, y, southZ);
        box(g, dw * 0.4, 0.016, 0.016, m.handle, cx, y, southZ + 0.016);
      }
    } else {
      shaker(g, dw, bodyTop - toe - 0.03, 1, m.oak, m.oakIn, m.handle, cx, (bodyTop + toe) / 2, southZ, 'z');
    }
    cursor += dw;
  });

  // North elevation, teacher side.
  const northZ = z0 - 0.012;
  const nDoors = 4;
  const nd = cabW / nDoors;
  for (let i = 0; i < nDoors; i++) {
    shaker(g, nd, bodyTop - toe - 0.03, -1, m.oak, m.oakIn, m.handle, x0 + nd * (i + 0.5), (bodyTop + toe) / 2, northZ, 'z');
  }

  // East end door + towel.
  shaker(g, cabD * 0.7, bodyTop - toe - 0.03, 1, m.oak, m.oakIn, m.handle, x1 + 0.012, (bodyTop + toe) / 2, isl.z, 'x');
  box(g, 0.02, 0.02, 0.28, m.handle, x1 + 0.04, 0.98, isl.z + 0.02);
  box(g, 0.018, 0.26, 0.16, m.towel, x1 + 0.05, 0.82, isl.z + 0.02);
  box(g, 0.012, 0.045, 0.16, m.towelBand, x1 + 0.06, 0.76, isl.z + 0.02);

  // West end: a shelf tucked under the overhang, visible from the aisle.
  box(g, 0.2, 0.02, cabD - 0.1, m.oak, x0 - 0.02, 0.58, isl.z);
  cyl(g, 0.08, 0.075, 0.09, m.cream, x0 - 0.02, 0.65, isl.z - 0.08, 14);
  cyl(g, 0.09, 0.085, 0.03, m.steel, x0 - 0.01, 0.62, isl.z + 0.1, 14);
}

function buildFridge(g, f, m) {
  box(g, f.w, 0.08, f.d, m.iron, f.x, 0.04, f.z);
  box(g, f.w, f.h - 0.08, f.d, m.steel, f.x, f.h / 2 + 0.02, f.z);
  const split = f.h * 0.38;
  // Freezer drawer.
  box(g, f.w - 0.06, split - 0.14, 0.02, m.steel, f.x, split / 2 + 0.06, f.z + f.d / 2 + 0.005);
  box(g, 0.22, 0.02, 0.02, m.handle, f.x, split * 0.55, f.z + f.d / 2 + 0.02);
  // French doors.
  const doorH = f.h - split - 0.08;
  const doorY = split + doorH / 2 + 0.02;
  box(g, f.w / 2 - 0.04, doorH, 0.02, toon('#eef2f4'), f.x - f.w / 4, doorY, f.z + f.d / 2 + 0.012);
  box(g, f.w / 2 - 0.04, doorH, 0.02, toon('#e4e9ec'), f.x + f.w / 4, doorY, f.z + f.d / 2 + 0.012);
  box(g, 0.02, 0.32, 0.02, m.handle, f.x - 0.06, doorY - 0.05, f.z + f.d / 2 + 0.03);
  box(g, 0.02, 0.32, 0.02, m.handle, f.x + 0.06, doorY - 0.05, f.z + f.d / 2 + 0.03);
  box(g, f.w - 0.1, 0.04, 0.01, m.steelDark, f.x, f.h - 0.08, f.z + f.d / 2 + 0.02);
}

function buildRack(g, x, z, m, rotY = 0) {
  const rack = new THREE.Group();
  const w = 0.82;
  const d = 0.4;
  const h = 1.58;
  for (const dx of [-w / 2, w / 2]) {
    for (const dz of [-d / 2, d / 2]) {
      box(rack, 0.035, h, 0.035, m.oak, dx, h / 2, dz);
    }
  }
  for (let i = 0; i < 4; i++) {
    const y = 0.18 + i * 0.38;
    box(rack, w, 0.02, d, m.oak, 0, y, 0);
    if (i === 1) box(rack, 0.46, 0.02, 0.32, m.steel, -0.08, y + 0.03, 0);
    if (i === 2) {
      cyl(rack, 0.1, 0.08, 0.08, m.cream, 0.12, y + 0.06, 0, 12);
      box(rack, 0.22, 0.04, 0.12, m.crust, -0.16, y + 0.04, 0.04);
    }
  }
  rack.position.set(x, 0, z);
  rack.rotation.y = rotY;
  g.add(rack);
}

function buildBins(g, x, z, m) {
  box(g, 0.32, 0.48, 0.28, m.sage, x - 0.2, 0.24, z);
  box(g, 0.28, 0.02, 0.24, m.steelDark, x - 0.2, 0.49, z);
  box(g, 0.32, 0.48, 0.28, m.steelDark, x + 0.18, 0.24, z);
  box(g, 0.28, 0.02, 0.24, toon('#3d5248'), x + 0.18, 0.49, z);
}

function buildLesson(g, layout, chalkMat) {
  const board = (layout.instances || []).find((i) => i.id === 'board');
  if (!board) return;
  const [x, , z] = board.position;
  // Writing surface sits on the room side of the freestanding board (faces +X).
  const px = x + 0.02;
  const py = 1.16;
  box(g, 0.02, 0.98, 1.62, chalkMat, px, py, z);
  box(g, 0.03, 1.06, 0.04, toon('#6e4e34'), px + 0.01, py, z - 0.81);
  box(g, 0.03, 1.06, 0.04, toon('#6e4e34'), px + 0.01, py, z + 0.81);
  box(g, 0.03, 0.04, 1.66, toon('#6e4e34'), px + 0.01, py + 0.51, z);
  box(g, 0.03, 0.04, 1.66, toon('#6e4e34'), px + 0.01, py - 0.51, z);
  const c = document.createElement('canvas');
  c.width = 1024;
  c.height = 640;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#1e3328';
  ctx.fillRect(0, 0, 1024, 640);
  ctx.fillStyle = '#f3edd4';
  ctx.font = '64px Georgia, "Liberation Serif", serif';
  ctx.fillText('Community kitchen', 64, 110);
  ctx.font = '36px Georgia, "Liberation Serif", serif';
  ctx.fillStyle = '#d7c48a';
  ctx.fillText('Tuesday class', 64, 168);
  ctx.fillStyle = '#f3edd4';
  ctx.font = '42px Georgia, "Liberation Serif", serif';
  const lines = ['1   Wash', '2   Prep the mise', '3   Cook together', '', 'Today', 'tomato soup', 'rosemary focaccia'];
  lines.forEach((line, i) => ctx.fillText(line, 64, 260 + i * 52));
  const map = new THREE.CanvasTexture(c);
  map.colorSpace = THREE.SRGBColorSpace;
  const panel = new THREE.Mesh(
    new THREE.PlaneGeometry(1.48, 0.86),
    toon('#ffffff', { map }),
  );
  panel.position.set(px + 0.02, py, z);
  panel.rotation.y = Math.PI / 2;
  panel.castShadow = false;
  panel.receiveShadow = false;
  g.add(panel);
}

function buildProps(g, layout, m) {
  const c = layout.zones.counter;
  const isl = layout.zones.island;
  const yC = c.h;
  const yI = isl.h;
  const zBack = c.zFront - c.depth;

  // Island mise: board toward the class, pot toward the teacher.
  box(g, 0.42, 0.02, 0.28, m.oak, isl.x - 0.5, yI + 0.01, isl.z + 0.22);
  put(g, new THREE.SphereGeometry(0.045, 12, 10), m.tomato, isl.x - 0.62, yI + 0.06, isl.z + 0.18);
  put(g, new THREE.SphereGeometry(0.04, 12, 10), m.tomato, isl.x - 0.52, yI + 0.055, isl.z + 0.28);
  box(g, 0.018, 0.012, 0.16, m.steel, isl.x - 0.38, yI + 0.02, isl.z + 0.16, 0.4);
  cyl(g, 0.12, 0.11, 0.14, m.cream, isl.x + 0.05, yI + 0.09, isl.z - 0.18, 16);
  cyl(g, 0.125, 0.125, 0.02, m.cream, isl.x + 0.05, yI + 0.17, isl.z - 0.18, 16);
  cyl(g, 0.022, 0.022, 0.028, m.oakDark, isl.x + 0.05, yI + 0.19, isl.z - 0.18, 8);
  cyl(g, 0.11, 0.11, 0.012, m.soup, isl.x + 0.05, yI + 0.145, isl.z - 0.18, 16);
  box(g, 0.035, 0.05, 0.02, m.steel, isl.x + 0.17, yI + 0.1, isl.z - 0.18);
  box(g, 0.035, 0.05, 0.02, m.steel, isl.x - 0.07, yI + 0.1, isl.z - 0.18);
  box(g, 0.16, 0.012, 0.02, m.oak, isl.x - 0.42, yI + 0.02, isl.z + 0.05, 0.7);
  // Skillet on the class-side corner, clear of the soup pot.
  cyl(g, 0.11, 0.1, 0.04, m.steelDark, isl.x + 0.78, yI + 0.028, isl.z + 0.12, 16);
  box(g, 0.18, 0.016, 0.028, m.oakDark, isl.x + 1.02, yI + 0.04, isl.z + 0.12);
  // Lemons and oil.
  bowl(g, isl.x + 0.55, yI, isl.z - 0.22, 0.09, m.cream);
  put(g, new THREE.SphereGeometry(0.035, 10, 8), m.lemon, isl.x + 0.52, yI + 0.08, isl.z - 0.22);
  put(g, new THREE.SphereGeometry(0.032, 10, 8), m.lemon, isl.x + 0.58, yI + 0.075, isl.z - 0.18);
  cyl(g, 0.035, 0.04, 0.16, m.oil, isl.x + 1.05, yI + 0.08, isl.z - 0.12, 10);
  cyl(g, 0.015, 0.018, 0.04, m.oakDark, isl.x + 1.05, yI + 0.18, isl.z - 0.12, 8);
  // Baguette and a second board off to the side, not lined up with the first.
  put(g, new THREE.CapsuleGeometry(0.026, 0.2, 3, 8), m.bread, isl.x - 0.95, yI + 0.04, isl.z + 0.2, [0, 0.35, Math.PI / 2]);
  put(g, new THREE.SphereGeometry(0.04, 10, 8), m.onion, isl.x - 0.95, yI + 0.05, isl.z + 0.05);
  // Salt cellar.
  cyl(g, 0.03, 0.034, 0.05, m.cream, isl.x + 0.28, yI + 0.03, isl.z + 0.18, 10);

  // One board and mixing bowl per stool, inset from that stool's edge.
  const stations = [
    { x: isl.x - 1.18, z: isl.z + 0.36, accent: 'tomato' },
    { x: isl.x + 0.18, z: isl.z + 0.4, accent: 'leaf' },
    { x: isl.x + 1.05, z: isl.z + 0.34, accent: 'onion' },
    { x: isl.x - 1.22, z: isl.z + 0.05, accent: 'carrot' },
    { x: isl.x + 1.22, z: isl.z - 0.02, accent: 'lemon' },
  ];
  for (const st of stations) stoolStation(g, st.x, yI, st.z, st.accent, m);

  // Prep counter, left of the range.
  box(g, 0.38, 0.018, 0.24, m.oak, -2.85, yC + 0.01, -3.32);
  put(g, new THREE.CapsuleGeometry(0.018, 0.12, 2, 6), m.carrot, -2.95, yC + 0.03, -3.28, [0, 0.8, Math.PI / 2]);
  put(g, new THREE.CapsuleGeometry(0.018, 0.1, 2, 6), m.carrot, -2.88, yC + 0.03, -3.36, [0, 1.1, Math.PI / 2]);
  put(g, new THREE.SphereGeometry(0.04, 10, 8), m.onion, -2.7, yC + 0.05, -3.26);
  put(g, new THREE.SphereGeometry(0.042, 10, 8), m.tomato, -3.3, yC + 0.05, -3.28);
  bowl(g, -1.55, yC, -3.3, 0.1, m.cream);
  put(g, new THREE.SphereGeometry(0.028, 8, 6), m.cream, -1.55, yC + 0.08, -3.3);
  put(g, new THREE.SphereGeometry(0.026, 8, 6), toon('#f7f1dc'), -1.5, yC + 0.075, -3.26);

  // Pot on the back burner, pan on the lit front burner.
  const rx = layout.zones.range.x;
  const zc = (zBack + c.zFront) / 2;
  cyl(g, 0.1, 0.095, 0.09, m.steel, rx + 0.18, yC + 0.06, zc - 0.1, 14);
  cyl(g, 0.05, 0.07, 0.015, m.oakDark, rx + 0.18, yC + 0.11, zc - 0.1, 12);
  cyl(g, 0.1, 0.095, 0.035, m.steel, rx - 0.18, yC + 0.04, zc + 0.12, 14);
  box(g, 0.14, 0.014, 0.028, m.oak, rx - 0.02, yC + 0.05, zc + 0.12);

  // Tasting table: plate and a cut piece of focaccia. Mug is a GLB.
  const t = layout.zones.tasting;
  cyl(g, 0.11, 0.09, 0.016, m.cream, t.x + 0.12, t.h + 0.01, t.z + 0.06, 18);
  box(g, 0.1, 0.025, 0.08, m.bread, t.x + 0.12, t.h + 0.03, t.z + 0.06);
  box(g, 0.1, 0.008, 0.08, m.crust, t.x + 0.12, t.h + 0.044, t.z + 0.06);

  // Pantry shelves get a few bowls so the case is not only jars.
  const pantry = (layout.instances || []).find((i) => i.id === 'pantry');
  if (pantry) {
    bowl(g, pantry.position[0] - 0.14, 1.04, pantry.position[2] + 0.1, 0.08, m.cream);
    cyl(g, 0.09, 0.09, 0.016, m.cream, pantry.position[0] + 0.16, 1.36, pantry.position[2] + 0.1, 14);
    cyl(g, 0.07, 0.07, 0.014, m.cream, pantry.position[0] + 0.16, 1.378, pantry.position[2] + 0.1, 12);
    box(g, 0.14, 0.09, 0.09, toon('#efe6d2'), pantry.position[0] + 0.02, 0.64, pantry.position[2] + 0.08);
  }

  // Rail of tools under the prep shelves.
  box(g, 1.7, 0.015, 0.015, m.steel, -2.45, 1.38, -3.48);
  for (const x of [-3.05, -2.45, -1.9]) {
    cyl(g, 0.012, 0.012, 0.04, m.steel, x, 1.35, -3.48, 6);
    box(g, 0.04, 0.16, 0.012, m.oak, x, 1.24, -3.46);
  }
}

function bowl(g, x, y, z, r, mat) {
  cyl(g, r, r * 0.7, r * 0.55, mat, x, y + r * 0.28, z, 14);
}

function stoolStation(g, x, y, z, accent, m) {
  box(g, 0.26, 0.016, 0.18, m.oak, x, y + 0.008, z, 0.08);
  bowl(g, x - 0.02, y + 0.016, z - 0.01, 0.055, m.cream);
  if (accent === 'tomato') {
    put(g, new THREE.SphereGeometry(0.022, 8, 6), m.tomato, x + 0.07, y + 0.03, z + 0.03);
    put(g, new THREE.SphereGeometry(0.018, 8, 6), m.tomato, x + 0.05, y + 0.028, z - 0.04);
  } else if (accent === 'leaf') {
    put(g, new THREE.SphereGeometry(0.02, 8, 6), m.leaf, x + 0.07, y + 0.03, z + 0.02);
    put(g, new THREE.SphereGeometry(0.016, 8, 6), m.leaf, x + 0.05, y + 0.028, z - 0.03);
  } else if (accent === 'onion') {
    put(g, new THREE.SphereGeometry(0.028, 8, 6), m.onion, x + 0.07, y + 0.036, z);
  } else if (accent === 'carrot') {
    put(g, new THREE.CapsuleGeometry(0.012, 0.07, 2, 6), m.carrot, x + 0.06, y + 0.03, z, [0, 0.6, Math.PI / 2]);
  } else {
    put(g, new THREE.SphereGeometry(0.026, 8, 6), m.lemon, x + 0.07, y + 0.034, z + 0.01);
  }
}

function buildLights(g, layout, bulbMat, stripMat) {
  for (const inst of layout.instances) {
    if (inst.kind !== 'pendant_lamp') continue;
    const [x, y, z] = inst.position;
    put(g, new THREE.SphereGeometry(0.05, 12, 10), bulbMat, x, y + 0.1, z);
  }
  // Undercabinet strips in front of the prep shelves and the coffee shelf.
  box(g, 1.85, 0.02, 0.04, stripMat, -2.45, 1.48, -3.46, 0, { noShadow: true });
  box(g, 0.55, 0.02, 0.04, stripMat, 2.58, 1.48, -3.46, 0, { noShadow: true });
}

function buildHerb(g, layout, leaf) {
  for (const inst of layout.instances) {
    if (!inst.foliage) continue;
    const spec = layout.assets[inst.kind];
    const sy = Array.isArray(inst.scale) ? inst.scale[1] : (inst.scale || 1);
    const top = inst.position[1] + (spec?.targetHeight || 0.2) * sy * 0.75;
    herb(g, inst.position[0], top, inst.position[2], inst.foliage, leaf);
  }
}

function herb(g, x, y, z, s, leaf) {
  const deep = toon('#1e4d2b');
  put(g, new THREE.SphereGeometry(0.1 * s, 10, 8), leaf, x, y + 0.08 * s, z);
  put(g, new THREE.SphereGeometry(0.07 * s, 8, 6), deep, x + 0.06 * s, y + 0.12 * s, z - 0.03 * s);
  put(g, new THREE.SphereGeometry(0.06 * s, 8, 6), leaf, x - 0.05 * s, y + 0.1 * s, z + 0.04 * s);
  cyl(g, 0.01 * s, 0.012 * s, 0.08 * s, toon('#3d5c2e'), x, y + 0.02 * s, z, 6);
}

boot({
  makeShell,
  makeProcedural,
  readyText: 'ready — community kitchen · drag orbit · U unlit · T toon',
});
