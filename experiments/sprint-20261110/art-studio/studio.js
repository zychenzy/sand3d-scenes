import * as THREE from 'three';
import { boot, toon, addBox, addCyl, canvasTexture } from './scene_lib.js';
import * as paint from './paint.js';

const SILL_Y = 0.86;
const HEAD_Y = 2.9;
const WALL_T = 0.16;

const tex = {
  floor: canvasTexture(paint.floorTexture(), true),
  plaster: canvasTexture(paint.plasterTexture(), true),
  cork: canvasTexture(paint.corkTexture(), true),
  tile: canvasTexture(paint.tileTexture(), true),
  cloth: canvasTexture(paint.clothTexture()),
  splatter: canvasTexture(paint.splatterTexture()),
  still: canvasTexture(paint.paintingStillLife()),
  figure: canvasTexture(paint.paintingFigure()),
  window: canvasTexture(paint.paintingWindow()),
};

tex.floor.repeat.set(6, 4.6);
tex.plaster.repeat.set(3.2, 2.2);
tex.cork.repeat.set(2.4, 1.3);
tex.tile.repeat.set(3.05, 1.6);

const sketchTex = {};
function sketch(kind) {
  if (!sketchTex[kind]) sketchTex[kind] = canvasTexture(paint.sketchSheet(kind));
  return sketchTex[kind];
}

const labelTex = {};
function label(text, chip) {
  const key = text + chip;
  if (!labelTex[key]) labelTex[key] = canvasTexture(paint.labelTexture(text, chip));
  return labelTex[key];
}

function roomOf(layout) {
  const { width: W, depth: D, height: H } = layout.meta.room;
  return { W, D, H, xWall: -W / 2, zWall: -D / 2, xIn: -W / 2 + WALL_T / 2, zIn: -D / 2 + WALL_T / 2 };
}

function findInst(layout, id) {
  return layout.instances.find((i) => i.id === id);
}

function zone(layout, id) {
  return (layout.zones || []).find((z) => z.id === id);
}

function makeShell(layout) {
  const g = new THREE.Group();
  g.name = 'shell';
  const { W, D, H, xWall, zWall, xIn, zIn } = roomOf(layout);
  const plaster = toon('#ffffff', { map: tex.plaster });
  const wood = toon('#6a4a32');
  const edge = toon('#8d6848');

  const floorMat = [edge, edge, toon('#ffffff', { map: tex.floor }), edge, edge, edge];
  const floor = new THREE.Mesh(new THREE.BoxGeometry(W, 0.08, D), floorMat);
  floor.position.y = -0.04;
  floor.receiveShadow = true;
  g.add(floor);

  addBox(g, W, H, WALL_T, plaster, 0, H / 2, zWall);
  buildNorthWall(g, layout, plaster);
  addBox(g, W - 0.2, 0.1, 0.04, wood, 0.1, 0.05, zIn + 0.02);
  addBox(g, 0.04, 0.1, D - 0.3, wood, xIn + 0.02, 0.05, 0.1);
  addBox(g, W - 0.4, 0.045, 0.045, wood, 0.15, 2.5, zIn + 0.03);

  const ceil = new THREE.Mesh(new THREE.BoxGeometry(W * 0.78, 0.06, D * 0.72), toon('#f6f1e8'));
  ceil.position.set(-W * 0.08, H - 0.03, -D * 0.1);
  ceil.receiveShadow = true;
  g.add(ceil);

  const beam = toon('#6e5340');
  for (const z of [-2.25, -0.85, 0.28, 1.55]) {
    addBox(g, W * 0.72, 0.16, 0.1, beam, -0.55, H - 0.18, z);
  }

  const sky = new THREE.Mesh(
    new THREE.PlaneGeometry(D * 0.98, H * 1.15),
    new THREE.MeshBasicMaterial({ color: '#eaf4fc', side: THREE.DoubleSide }),
  );
  sky.position.set(xWall - 0.42, H * 0.52, -0.15);
  sky.rotation.y = Math.PI / 2;
  sky.userData.keepBasic = true;
  sky.userData.noShadow = true;
  sky.userData.noReceive = true;
  g.add(sky);

  return g;
}

/** Left wall is the north window: solid piers and a sill, openings left empty so the key light passes. */
function buildNorthWall(g, layout, plaster) {
  const { D, H, xWall, xIn } = roomOf(layout);
  const frame = toon('#f4f1ea');
  const mullion = toon('#e7e0d4');
  const bays = [
    [-3.22, -1.92],
    [-1.78, -0.48],
    [-0.34, 0.96],
    [1.1, 2.4],
  ];
  const z0 = -D / 2;
  const z1 = D / 2;
  addBox(g, WALL_T, SILL_Y, D, plaster, xWall, SILL_Y / 2, 0);
  addBox(g, WALL_T, H - HEAD_Y, D, plaster, xWall, (H + HEAD_Y) / 2, 0);
  addBox(g, WALL_T, HEAD_Y - SILL_Y, bays[0][0] - z0, plaster, xWall, (SILL_Y + HEAD_Y) / 2, (z0 + bays[0][0]) / 2);
  addBox(g, WALL_T, HEAD_Y - SILL_Y, z1 - bays[3][1], plaster, xWall, (SILL_Y + HEAD_Y) / 2, (z1 + bays[3][1]) / 2);
  for (let i = 0; i < bays.length - 1; i++) {
    const a = bays[i][1];
    const b = bays[i + 1][0];
    addBox(g, WALL_T, HEAD_Y - SILL_Y, b - a, plaster, xWall, (SILL_Y + HEAD_Y) / 2, (a + b) / 2);
  }

  const sillZ0 = bays[0][0];
  const sillZ1 = bays[3][1];
  addBox(g, 0.42, 0.07, sillZ1 - sillZ0, frame, xIn + 0.12, SILL_Y - 0.02, (sillZ0 + sillZ1) / 2);

  bays.forEach(([a, b]) => {
    const midY = (SILL_Y + HEAD_Y) / 2;
    const h = HEAD_Y - SILL_Y;
    addBox(g, 0.045, h, 0.045, frame, xIn + 0.01, midY, a);
    addBox(g, 0.045, h, 0.045, frame, xIn + 0.01, midY, b);
    addBox(g, 0.05, 0.045, b - a, frame, xIn + 0.01, HEAD_Y, (a + b) / 2);
    const cols = 4;
    for (let c = 1; c < cols; c++) {
      const z = a + ((b - a) * c) / cols;
      addBox(g, 0.035, h - 0.06, 0.03, mullion, xWall, midY, z);
    }
    const railY = SILL_Y + h * 0.58;
    addBox(g, 0.03, 0.028, b - a - 0.06, mullion, xWall, railY, (a + b) / 2);
    const glass = new THREE.Mesh(
      new THREE.PlaneGeometry(b - a - 0.08, h - 0.1),
      new THREE.MeshBasicMaterial({
        color: '#f7fbff', transparent: true, opacity: 0.18, side: THREE.DoubleSide, depthWrite: false,
      }),
    );
    glass.position.set(xWall - 0.02, midY, (a + b) / 2);
    glass.rotation.y = Math.PI / 2;
    glass.userData.keepBasic = true;
    glass.userData.noShadow = true;
    glass.userData.noReceive = true;
    g.add(glass);
  });

  // Radiators under the two middle bays — the sill is not an empty slot.
  for (const [a, b] of [bays[1], bays[2]]) {
    const z = (a + b) / 2;
    const span = (b - a) * 0.78;
    addBox(g, 0.1, 0.42, span, frame, xIn + 0.08, 0.24, z);
    for (let i = 0; i < 7; i++) {
      addBox(g, 0.025, 0.36, 0.012, toon('#f7f4ee'), xIn + 0.12, 0.24, z - span / 2 + 0.1 + i * (span - 0.2) / 6);
    }
  }
}

function buildPinboard(g, layout) {
  const board = zone(layout, 'pinboard');
  const grp = new THREE.Group();
  grp.position.set(board.x, board.y, board.z);
  const cork = toon('#ffffff', { map: tex.cork });
  addBox(grp, board.w, board.h, 0.028, cork, 0, 0, 0);
  const wood = toon('#6b4e38');
  addBox(grp, board.w + 0.07, 0.046, 0.046, wood, 0, board.h / 2 + 0.01, 0.008);
  addBox(grp, board.w + 0.07, 0.046, 0.046, wood, 0, -board.h / 2 - 0.01, 0.008);
  addBox(grp, 0.046, board.h, 0.046, wood, -board.w / 2 - 0.01, 0, 0.008);
  addBox(grp, 0.046, board.h, 0.046, wood, board.w / 2 + 0.01, 0, 0.008);

  const sheets = [
    { k: 'gesture', x: -0.95, y: 0.22, w: 0.46, h: 0.58, r: -0.03, tape: true },
    { k: 'value', x: -0.48, y: 0.34, w: 0.38, h: 0.32, r: 0.04 },
    { k: 'profile', x: -0.55, y: -0.12, w: 0.4, h: 0.5, r: 0.07, tape: true },
    { k: 'window', x: -0.02, y: 0.16, w: 0.48, h: 0.4, r: -0.02 },
    { k: 'hands', x: 0.32, y: 0.3, w: 0.36, h: 0.46, r: 0.05, tape: true },
    { k: 'perspective', x: 0.18, y: -0.22, w: 0.52, h: 0.36, r: -0.04 },
    { k: 'notes', x: 0.78, y: 0.12, w: 0.42, h: 0.5, r: 0.02, tape: true },
    { k: 'color', x: 0.72, y: -0.32, w: 0.38, h: 0.42, r: -0.06 },
  ];
  const paper = toon('#ffffff');
  const tape = toon('#f7f3e8');
  const pin = toon('#2a2a28');
  for (const s of sheets) {
    const sheet = addBox(grp, s.w, s.h, 0.008, paper, s.x, s.y, 0.022, [0, 0, s.r]);
    sheet.material = toon('#ffffff', { map: sketch(s.k) });
    addCyl(grp, 0.011, 0.011, 0.016, pin, s.x, s.y + s.h * 0.42, 0.034, 8);
    if (s.tape) {
      addBox(grp, 0.045, 0.028, 0.006, tape, s.x - s.w * 0.38, s.y + s.h * 0.42, 0.03, [0, 0, s.r]);
      addBox(grp, 0.045, 0.028, 0.006, tape, s.x + s.w * 0.38, s.y + s.h * 0.42, 0.03, [0, 0, s.r]);
    }
  }
  g.add(grp);

  // One study slid off the rail and stayed where it landed.
  const fallen = addBox(g, 0.34, 0.008, 0.42, toon('#ffffff', { map: sketch('bottle') }), board.x + 0.95, 0.012, board.z + 0.28, [-Math.PI / 2 + 0.14, 0.4, 0]);
  fallen.castShadow = false;
}

function buildDrawers(g, layout) {
  const d = zone(layout, 'drawers');
  const wood = toon('#8a6244');
  const woodDark = toon('#5c4030');
  const face = toon('#c4a574');
  addBox(g, 0.04, 0.96, d.d, woodDark, d.x - d.w / 2 + 0.02, 0.48, d.z);
  addBox(g, 0.04, 0.96, d.d, woodDark, d.x + d.w / 2 - 0.02, 0.48, d.z);
  addBox(g, d.w - 0.06, 0.9, 0.04, wood, d.x, 0.48, d.z - d.d / 2 + 0.03);
  addBox(g, d.w, 0.06, d.d, woodDark, d.x, 0.03, d.z);
  addBox(g, d.w + 0.02, 0.045, d.d + 0.03, woodDark, d.x, 0.985, d.z);
  const drawers = [
    { h: 0.22, y: 0.2, label: 'UMBER', chip: '#6a4424', pull: 0 },
    { h: 0.18, y: 0.42, label: 'SIENNA', chip: '#a86830', pull: 0.08 },
    { h: 0.16, y: 0.61, label: 'WHITE', chip: '#efeae0', pull: 0 },
    { h: 0.15, y: 0.78, label: 'BLUE', chip: '#1e3f8f', pull: 0 },
  ];
  for (const dr of drawers) {
    const frontZ = d.z + d.d / 2 + dr.pull;
    addBox(g, d.w - 0.06, dr.h - 0.02, d.d - 0.04, wood, d.x, dr.y, d.z + dr.pull / 2);
    addBox(g, d.w - 0.04, dr.h - 0.035, 0.02, face, d.x, dr.y, frontZ);
    addCyl(g, 0.012, 0.012, 0.11, toon('#b08a4a'), d.x, dr.y, frontZ + 0.02, 8, [Math.PI / 2, 0, 0]);
    const card = addBox(g, 0.16, 0.05, 0.006, toon('#ffffff', { map: label(dr.label, dr.chip) }), d.x + 0.16, dr.y, frontZ + 0.014);
    card.castShadow = false;
  }
  addBox(g, d.w, 0.035, d.d + 0.04, woodDark, d.x, 0.96, d.z);
}

function buildRolls(g, layout) {
  const r = zone(layout, 'rolls');
  addBox(g, r.w, 0.22, r.d, toon('#6b4e38'), r.x, 0.11, r.z);
  const papers = ['#f4efe4', '#e7dcc4', '#d7c3a4', '#efe6d4'];
  papers.forEach((c, i) => {
    addCyl(g, 0.045, 0.045, r.w - 0.06, toon(c), r.x, 0.28 + (i % 2) * 0.09, r.z - 0.06 + Math.floor(i / 2) * 0.1, 12, [0, 0, Math.PI / 2]);
  });
}

function buildWash(g, layout) {
  const w = zone(layout, 'wash');
  const cab = toon('#6e5138');
  const counter = toon('#d9d2c4');
  const basin = toon('#b7c6c8');
  const brass = toon('#b08d45');
  const metal = toon('#8d9498');
  addBox(g, w.w, 0.84, w.d, cab, w.x, 0.42, w.z);
  addBox(g, w.w + 0.06, 0.05, w.d + 0.06, counter, w.x, 0.865, w.z);
  // inset basin, slightly left of center so the drainboard has a home
  addBox(g, 0.46, 0.14, 0.34, basin, w.x - 0.12, 0.8, w.z + 0.02);
  addBox(g, 0.4, 0.02, 0.28, toon('#9aadaf'), w.x - 0.12, 0.75, w.z + 0.02);
  // door left closed, door right cracked open
  addBox(g, w.w * 0.46, 0.7, 0.02, toon('#7a5a40'), w.x - w.w * 0.24, 0.4, w.z + w.d / 2 + 0.01);
  const ajar = addBox(g, w.w * 0.44, 0.7, 0.02, toon('#866244'), w.x + w.w * 0.2, 0.4, w.z + w.d / 2 + 0.04, [0, -0.35, 0]);
  ajar.position.x += 0.04;
  addCyl(g, 0.012, 0.012, 0.012, brass, w.x - w.w * 0.1, 0.42, w.z + w.d / 2 + 0.03, 8);
  // splash
  const splash = addBox(g, w.w, 0.46, 0.03, toon('#ffffff', { map: tex.tile }), w.x, 1.12, w.z - w.d / 2 + 0.02);
  splash.receiveShadow = true;
  // faucet: riser, spout toward the room (+Z), two handles
  addCyl(g, 0.016, 0.018, 0.22, brass, w.x - 0.12, 1.0, w.z - 0.08, 10);
  addCyl(g, 0.014, 0.012, 0.2, brass, w.x - 0.12, 1.08, w.z + 0.02, 10, [Math.PI / 2.35, 0, 0]);
  addCyl(g, 0.02, 0.02, 0.03, brass, w.x - 0.22, 0.91, w.z - 0.06, 8);
  addCyl(g, 0.02, 0.02, 0.03, brass, w.x - 0.02, 0.91, w.z - 0.06, 8);
  // drainboard grooves
  for (let i = 0; i < 5; i++) {
    addBox(g, 0.012, 0.008, 0.22, toon('#c4bba8'), w.x + 0.28 + i * 0.04, 0.895, w.z + 0.04);
  }
  addBox(g, 0.08, 0.03, 0.05, toon('#e6d27a'), w.x + 0.22, 0.91, w.z - 0.02);
  addBox(g, 0.1, 0.035, 0.07, toon('#c4553a'), w.x - 0.12, 0.78, w.z + 0.02);
  // towel bar on the left return
  addCyl(g, 0.012, 0.012, 0.36, metal, w.x - w.w / 2 - 0.02, 0.7, w.z, 8);
  addBox(g, 0.08, 0.32, 0.16, toon('#efe6dc'), w.x - w.w / 2 - 0.02, 0.5, w.z, [0, 0, 0.08]);
  // bucket and a rinsed rag
  addCyl(g, 0.13, 0.11, 0.2, metal, w.x + w.w / 2 + 0.22, 0.1, w.z + 0.15, 12);
  addBox(g, 0.16, 0.03, 0.1, toon('#8a3a32'), w.x + w.w / 2 + 0.22, 0.22, w.z + 0.15, [0.4, 0.2, 0]);
}

function buildStillLife(g, layout) {
  const p = findInst(layout, 'plinth');
  const x = p.position[0];
  const z = p.position[2];
  const top = 0.785;
  // cloth over the stand, one corner hanging toward the easel
  addBox(g, 0.28, 0.02, 0.22, toon('#ffffff', { map: tex.cloth }), x, top, z);
  addBox(g, 0.16, 0.16, 0.02, toon('#e4d8c4'), x + 0.02, top - 0.08, z + 0.1, [0.15, 0, 0]);
  addBox(g, 0.02, 0.14, 0.16, toon('#d9ceba'), x - 0.12, top - 0.06, z);
  // bottle the hero canvas is looking at
  addCyl(g, 0.045, 0.05, 0.16, toon('#6d8a78'), x - 0.02, top + 0.1, z - 0.01, 12);
  addCyl(g, 0.022, 0.024, 0.05, toon('#6d8a78'), x - 0.02, top + 0.2, z - 0.01, 10);
  addBox(g, 0.012, 0.07, 0.012, toon('#d7e6de'), x - 0.045, top + 0.12, z + 0.01);
  addCyl(g, 0.04, 0.04, 0.045, toon('#e2b23a'), x + 0.08, top + 0.04, z + 0.03, 12);
  addCyl(g, 0.012, 0.012, 0.02, toon('#8a6230'), x + 0.08, top + 0.07, z + 0.03, 6);
}

function buildTabletop(g, layout) {
  const t = findInst(layout, 'work_table');
  const x = t.position[0];
  const z = t.position[2];
  const y = 0.766;
  const pal = addCyl(g, 0.15, 0.15, 0.012, toon('#c4a574'), x + 0.03, y, z + 0.24, 20);
  pal.scale.z = 0.72;
  addCyl(g, 0.018, 0.018, 0.014, toon('#3a2a22'), x + 0.12, y + 0.008, z + 0.3, 10);
  const dabs = [
    [-0.04, 0.16, '#b42318'],
    [0.02, 0.2, '#1e3f8f'],
    [0.06, 0.14, '#d39a2a'],
    [-0.02, 0.26, '#efeae0'],
    [0.08, 0.22, '#1c6a4a'],
  ];
  for (const [dx, dz, c] of dabs) {
    addCyl(g, 0.018, 0.016, 0.01, toon(c), x + 0.03 + dx, y + 0.012, z + 0.24 + dz * 0.72, 8);
  }
  addBox(g, 0.14, 0.006, 0.018, toon('#c0c4c8'), x - 0.08, y, z + 0.05, [0, 0.4, 0]);
  addCyl(g, 0.035, 0.032, 0.07, toon('#d8d2c6'), x - 0.28, 0.79, z + 0.34, 10);
}

function buildDeskProps(g, layout) {
  const d = findInst(layout, 'layout_desk');
  const x = d.position[0];
  const z = d.position[2];
  addBox(g, 0.28, 0.02, 0.2, toon('#f4efe4'), x - 0.04, 0.76, z + 0.02);
  addBox(g, 0.26, 0.012, 0.18, toon('#fffaf2'), x - 0.02, 0.778, z + 0.04, [0, -0.2, 0]);
  addBox(g, 0.16, 0.008, 0.012, toon('#2a2622'), x - 0.02, 0.786, z + 0.02);
  addBox(g, 0.1, 0.008, 0.01, toon('#2a2622'), x - 0.01, 0.786, z + 0.05);
  addCyl(g, 0.006, 0.006, 0.16, toon('#d39a2a'), x + 0.16, 0.76, z - 0.04, 6, [0, 0.6, Math.PI / 2]);
}

function buildCloth(g, layout) {
  const clothMat = toon('#ffffff', { map: tex.cloth });
  const easelCloth = addBox(g, 2.35, 0.012, 4.15, clothMat, -1.85, 0.008, 0.05, [0, -0.06, 0]);
  easelCloth.receiveShadow = true;
  const table = findInst(layout, 'work_table');
  addBox(g, 1.9, 0.01, 1.45, clothMat, table.position[0], 0.006, table.position[2], [0, 0.08, 0]);

  const splatMat = new THREE.MeshBasicMaterial({
    map: tex.splatter,
    transparent: true,
    alphaTest: 0.25,
    depthWrite: false,
  });
  const splat = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 3.6), splatMat);
  splat.rotation.x = -Math.PI / 2;
  splat.position.set(-1.9, 0.03, 0.1);
  splat.userData.keepBasic = true;
  splat.userData.noShadow = true;
  splat.userData.noReceive = true;
  splat.renderOrder = 3;
  g.add(splat);
}

function buildStack(g, layout) {
  const s = zone(layout, 'stack');
  const boards = [
    [0.62, 0.035, 0.46, '#d7c7a4', 0],
    [0.5, 0.03, 0.4, '#cbb89a', 0.08],
    [0.58, 0.03, 0.36, '#e6dcc8', -0.05],
    [0.42, 0.028, 0.5, '#f3ece0', 0.12],
  ];
  let y = 0.02;
  boards.forEach(([w, h, d, c, rot]) => {
    y += h / 2;
    addBox(g, w, h, d, toon(c), s.x, y, s.z, [0, rot, 0]);
    y += h / 2 + 0.004;
  });
}

function buildLeaners(g, layout) {
  const { xIn, zIn } = roomOf(layout);
  leanCanvas(g, xIn + 0.55, zIn + 0.42, 0.15, -0.32, null);
  leanCanvas(g, xIn + 0.95, zIn + 0.55, -0.08, -0.26, tex.window);
}

function leanCanvas(g, x, z, rotY, lean, map) {
  const grp = new THREE.Group();
  grp.position.set(x, 0, z);
  grp.rotation.order = 'YXZ';
  grp.rotation.y = rotY;
  grp.rotation.x = lean;
  const h = 0.78;
  const w = 0.56;
  addBox(grp, w, h, 0.03, toon(map ? '#ffffff' : '#e6dcc4', map ? { map } : {}), 0, h / 2 + 0.02, 0);
  const bar = toon('#6b4e38');
  addBox(grp, w + 0.04, 0.035, 0.045, bar, 0, 0.04, -0.01);
  addBox(grp, w + 0.04, 0.035, 0.045, bar, 0, h + 0.01, -0.01);
  addBox(grp, 0.035, h, 0.045, bar, -w / 2, h / 2, -0.01);
  addBox(grp, 0.035, h, 0.04, bar, w / 2, h / 2, -0.01);
  g.add(grp);
}

function buildPlant(g, layout) {
  const p = findInst(layout, 'pot');
  const x = p.position[0];
  const z = p.position[2];
  const greens = ['#3f6a44', '#2f5536', '#4e7a4e', '#345e40'];
  const leaves = [
    [0.22, 0.05, 0.08, 0.42, 0.5, 0.1],
    [0.2, -0.08, 0.02, -0.3, 0.9, -0.4],
    [0.18, 0.02, -0.1, 0.8, 0.2, 0.6],
    [0.16, 0.1, 0.06, -0.5, 1.1, 0.2],
    [0.14, -0.04, 0.1, 0.2, 0.4, -0.8],
    [0.15, 0.0, 0.0, 0.1, 1.3, 0.4],
  ];
  leaves.forEach((leaf, i) => {
    const [len, ox, oz, rx, ry, rz] = leaf;
    addBox(g, len, 0.012, len * 0.32, toon(greens[i % greens.length]), x + ox, 0.42 + i * 0.03, z + oz, [rx, ry, rz]);
  });
  addCyl(g, 0.012, 0.016, 0.16, toon('#3d5334'), x, 0.36, z, 6);
}

function makeProcedural(layout) {
  const g = new THREE.Group();
  g.name = 'procedural';
  buildPinboard(g, layout);
  buildDrawers(g, layout);
  buildRolls(g, layout);
  buildWash(g, layout);
  buildStillLife(g, layout);
  buildTabletop(g, layout);
  buildDeskProps(g, layout);
  buildCloth(g, layout);
  buildStack(g, layout);
  buildLeaners(g, layout);
  buildPlant(g, layout);
  // a jar and a brush left on the sill, in the light
  addCyl(g, 0.035, 0.032, 0.07, toon('#1e3f8f'), -4.5, 0.9, 0.35, 10);
  addCyl(g, 0.006, 0.006, 0.18, toon('#6b3a2a'), -4.46, 0.88, 0.55, 6, [0, 0.2, Math.PI / 2]);
  return g;
}

const PAINTINGS = {
  easel_hero: 'still',
  easel_back: 'figure',
  easel_front: 'window',
};

function dressEasels(props) {
  props.traverse((node) => {
    if (!PAINTINGS[node.name]) return;
    const map = tex[PAINTINGS[node.name]];
    const canvas = addBox(node, 0.4, 0.56, 0.012, toon('#ffffff', { map }), 0.0, 0.92, 0.36, [-0.2, 0, 0]);
    canvas.castShadow = true;
    if (node.name === 'easel_hero') {
      addBox(node, 0.12, 0.016, 0.08, toon('#8a3a32'), 0.08, 0.44, 0.34, [0, 0.4, 0.1]);
    }
    if (node.name === 'easel_front') {
      addCyl(node, 0.006, 0.005, 0.16, toon('#6b3a2a'), -0.08, 0.5, 0.34, 5, [0.3, 0, 0.4]);
      addCyl(node, 0.005, 0.005, 0.14, toon('#d8c4a0'), 0.02, 0.48, 0.33, 5, [-0.2, 0.4, 0.2]);
    }
  });
}

function dressMugs(props) {
  props.traverse((node) => {
    if (node.userData.dress !== 'brushes') return;
    const handles = ['#6b3a2a', '#d8c4a0', '#2a241c', '#8a5a32', '#c4b49a'];
    handles.forEach((c, i) => {
      addCyl(
        node,
        0.0045,
        0.0055,
        0.16 + (i % 3) * 0.035,
        toon(c),
        (i - 2) * 0.012,
        0.13 + (i % 2) * 0.02,
        (i % 2) * 0.008,
        5,
        [(i - 2) * 0.08, 0, (i - 2) * 0.12],
      );
    });
  });
}

function dressStorage(props) {
  props.traverse((node) => {
    if (node.userData.kind === 'wall_shelf') {
      const m = node.userData.measured || { x: 0.66, y: 0.5, z: 0.28 };
      const wood = toon('#7a5a40');
      addBox(node, 0.02, m.y, m.z, wood, -m.x / 2, m.y / 2, 0);
      addBox(node, 0.02, m.y, m.z, wood, m.x / 2, m.y / 2, 0);
      addBox(node, 0.08, 0.1, m.z * 0.8, wood, -m.x * 0.28, -0.02, 0.02, [0.55, 0, 0]);
      addBox(node, 0.08, 0.1, m.z * 0.8, wood, m.x * 0.28, -0.02, 0.02, [0.55, 0, 0]);
    }
    if (node.name === 'supply_case') {
      const covers = ['#efe6d4', '#2e2a28', '#8d5a45'];
      covers.forEach((c, i) => {
        addBox(node, 0.26, 0.34, 0.028, toon(c), -0.22 + i * 0.2, 0.24, -0.11, [0.06, 0, (i - 1) * 0.05]);
      });
      addCyl(node, 0.05, 0.05, 0.36, toon('#f4efe4'), 0.18, 0.6, -0.08, 10, [0, 0, Math.PI / 2]);
      addCyl(node, 0.04, 0.04, 0.32, toon('#d7c3a4'), 0.18, 0.7, -0.05, 10, [0, 0.2, Math.PI / 2]);
      addBox(node, 0.34, 0.03, 0.24, toon('#efe6d4'), 0.0, 1.58, -0.08);
      addBox(node, 0.3, 0.025, 0.22, toon('#b42318'), 0.02, 1.62, -0.07);
      addBox(node, 0.26, 0.02, 0.2, toon('#1e3f8f'), -0.02, 1.655, -0.06, [0, 0.2, 0]);
    }
    if (node.name === 'pendant') {
      const h = node.userData.measured ? node.userData.measured.y : 0.5;
      addCyl(node, 0.006, 0.006, 3.42 - (node.position.y + h), toon('#2a241c'), 0, h + (3.42 - node.position.y - h) / 2, 0, 6);
      addCyl(node, 0.04, 0.04, 0.02, toon('#f4f1ea'), 0, 3.42 - node.position.y, 0, 10);
    }
  });
}

function onReady({ props }) {
  dressEasels(props);
  dressMugs(props);
  dressStorage(props);
}

boot({
  makeShell,
  makeProcedural,
  onReady,
  readyText: 'ready — north-light studio · drag orbit · U unlit · T toon',
});
