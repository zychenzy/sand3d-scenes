import * as THREE from "three";
import {
  FOCUS,
  ARC,
  STAGE,
  SHED,
  POLES,
  TREES,
  getTiers,
  crestY,
  foreY,
  sampleHeight,
  stoneBlocks,
  riserRuns,
  allSteps,
  pathStones,
  layoutInstances,
  stageLipZ,
} from "./bowl.js";
import {
  toon,
  addBox,
  addCyl,
  tagShadow,
  applyShading,
  bootRenderer,
  loadPrototypes,
  placeInstances,
} from "./scene_lib.js";

const STONE = ["#c8b8a2", "#b3a38d", "#d4c6b2", "#a99682", "#c0b09a"];
const RISER = "#7d7164";
const TIMBER = "#a56b3c";
const TIMBER_DARK = "#6e4528";
const TIMBER_LIGHT = "#c4844c";
const FOLIAGE = ["#3e5834", "#4d6840", "#314a30", "#58744a", "#2c442c", "#46603a"];

function stoneMat(i) {
  return toon(STONE[i % STONE.length]);
}

function makeSkyBackground() {
  const canvas = document.createElement("canvas");
  canvas.width = 4;
  canvas.height = 512;
  const ctx = canvas.getContext("2d");
  const g = ctx.createLinearGradient(0, 0, 0, 512);
  g.addColorStop(0, "#243656");
  g.addColorStop(0.34, "#5c4a68");
  g.addColorStop(0.62, "#c46d58");
  g.addColorStop(1, "#f2c4a0");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 4, 512);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.magFilter = THREE.LinearFilter;
  return tex;
}

function buildTerrain() {
  const width = 68;
  const depth = 60;
  const geo = new THREE.PlaneGeometry(width, depth, 170, 150);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  const base = new THREE.Color("#5a7342");
  const dry = new THREE.Color("#6d7040");
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    pos.setY(i, sampleHeight(x, z));
    const n = 0.84 + 0.16 * (0.5 + 0.5 * Math.sin(x * 0.31 + 0.6) * Math.cos(z * 0.23));
    const patch = 0.5 + 0.5 * Math.sin(x * 0.11 - z * 0.08);
    const c = base.clone().lerp(dry, patch * 0.35).multiplyScalar(n);
    colors[i * 3] = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;
  }
  geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  geo.computeVertexNormals();
  const mesh = new THREE.Mesh(geo, toon("#ffffff", { vertexColors: true }));
  mesh.receiveShadow = true;
  mesh.castShadow = false;
  mesh.name = "terrain";
  return mesh;
}

function buildBowl(group) {
  const capMatCache = STONE.map((c) => toon(c));
  const riserMat = toon(RISER);
  const cheekMat = toon("#9a8b78");
  for (const b of stoneBlocks()) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(b.width * 0.98, b.thick, b.depth), capMatCache[(b.tier + Math.round(b.am * 4)) & 3]);
    mesh.position.set(b.x, b.y - b.thick / 2, b.z);
    mesh.rotation.y = b.yaw;
    tagShadow(mesh);
    group.add(mesh);
  }
  for (const r of riserRuns()) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(r.width * 1.01, r.height, r.depth), riserMat);
    mesh.position.set(r.x, r.y, r.z);
    mesh.rotation.y = r.yaw;
    tagShadow(mesh);
    group.add(mesh);
  }
  const tiers = getTiers();
  for (const t of tiers) {
    for (const sign of [-1, 1]) {
      const am = sign * ARC;
      const rMid = (t.r + t.rOuter) / 2;
      const x = FOCUS.x + Math.sin(am) * rMid;
      const z = FOCUS.z + Math.cos(am) * rMid;
      const ox = FOCUS.x + Math.sin(am + sign * 0.06) * (rMid + 0.15);
      const oz = FOCUS.z + Math.cos(am + sign * 0.06) * (rMid + 0.15);
      const gy = sampleHeight(ox, oz);
      const h = Math.max(0.28, t.y - gy + 0.08);
      const wall = new THREE.Mesh(
        new THREE.BoxGeometry(0.32, h, t.seat + t.tread * 0.85),
        cheekMat,
      );
      wall.position.set(x, t.y - h / 2 + 0.02, z);
      wall.rotation.y = am;
      tagShadow(wall);
      group.add(wall);
    }
  }
}

function buildStairs(group) {
  const tread = toon("#c2b29c");
  const treadAlt = toon("#b09e86");
  const curb = toon("#8a7b6a");
  const steps = allSteps();
  for (const s of steps) {
    const h = s.rise + 0.02;
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(s.width, h, s.run * 0.96),
      s.i % 2 === 0 ? tread : treadAlt,
    );
    mesh.position.set(s.x, s.y - h / 2, s.z);
    mesh.rotation.y = s.yaw;
    tagShadow(mesh);
    group.add(mesh);
    const dirX = Math.sin(s.yaw);
    const dirZ = Math.cos(s.yaw);
    const perpX = dirZ;
    const perpZ = -dirX;
    for (const side of [-1, 1]) {
      const edge = addBox(
        group,
        0.14,
        0.28,
        s.run * 0.96,
        curb,
        s.x + perpX * side * (s.width / 2 + 0.02),
        s.y + 0.06,
        s.z + perpZ * side * (s.width / 2 + 0.02),
      );
      edge.rotation.y = s.yaw;
    }
  }
}

function buildApron(group) {
  const lip = stageLipZ();
  const front = FOCUS.z + getTiers()[0].r - 0.08;
  const depth = front - lip;
  addBox(group, STAGE.w + 1.6, 0.05, depth, toon("#c6b49c"), STAGE.x, 0.03, lip + depth / 2).castShadow = false;
}

function buildStage(group) {
  const { x, z, w, d, y } = STAGE;
  const skirt = toon("#6a432c");
  const post = toon("#7a4e30");
  addBox(group, w, y, d, skirt, x, y / 2, z);
  const planks = 12;
  for (let i = 0; i < planks; i++) {
    const pz = z - d / 2 + ((i + 0.5) * d) / planks;
    const col = i % 2 === 0 ? TIMBER : TIMBER_LIGHT;
    addBox(group, w * 0.96, 0.045, (d / planks) * 0.88, toon(col), x, y + 0.02, pz);
  }
  const frontZ = z + d / 2 - 0.04;
  for (let i = 0; i < 9; i++) {
    const px = x - w / 2 + 0.35 + i * ((w - 0.7) / 8);
    addBox(group, 0.06, y * 0.92, 0.04, toon(i % 2 ? "#5c3a24" : "#7a5134"), px, y * 0.46, frontZ);
  }
  const boardColors = [TIMBER_DARK, "#7d5432", "#8d5e36", "#694028"];
  let cursor = -w * 0.38;
  let bi = 0;
  let screenTop = y + 1.2;
  while (cursor < w * 0.36) {
    const bw = 0.14 + ((bi * 3) % 5) * 0.018;
    const bh = 1.22 + ((bi * 5) % 4) * 0.07;
    screenTop = Math.max(screenTop, y + bh);
    addBox(
      group,
      bw,
      bh,
      0.07,
      toon(boardColors[bi % boardColors.length]),
      x + cursor,
      y + bh / 2,
      z - d / 2 + 0.28,
    );
    cursor += bw + 0.012;
    bi++;
  }
  addBox(group, w * 0.78, 0.07, 0.1, post, x - 0.1, screenTop + 0.02, z - d / 2 + 0.28);
  for (const side of [-1, 1]) {
    const wing = addBox(
      group,
      0.08,
      1.12,
      0.95,
      toon("#6b442c"),
      x + side * (w / 2 - 0.05),
      y + 0.62,
      z + d / 2 - 0.7,
    );
    wing.rotation.y = side * -0.18;
  }
  const stepCount = 4;
  const stepW = 0.82;
  const rise = y / stepCount;
  const run = 0.32;
  const stepX = x + w / 2 + stepW / 2 + 0.04;
  for (let i = 1; i <= stepCount; i++) {
    addBox(
      group,
      stepW,
      rise * i,
      run * 0.94,
      toon(i % 2 ? "#b88958" : "#a06a3a"),
      stepX,
      (rise * i) / 2,
      z + 0.15 - (i - 0.5) * run,
    );
  }
  const stand = new THREE.Group();
  addCyl(stand, 0.015, 0.02, 1.05, toon("#4a4038"), -1.15, y + 0.55, -6.45, 6);
  const desk = addBox(stand, 0.46, 0.02, 0.32, toon("#d8d0c4"), -1.15, y + 1.12, -6.45);
  desk.rotation.x = -0.35;
  group.add(stand);
  addBox(group, 0.95, 0.16, 0.34, toon("#6d4a30"), 1.45, y + 0.1, -7.55);
  addBox(group, 0.22, 0.1, 0.22, toon("#5c4030"), 1.7, y + 0.22, -7.35);
}

function buildShed(group) {
  const { x, z, w, d, h } = SHED;
  const wall = toon("#7a5436");
  const wallDark = toon("#5e412b");
  const roof = toon("#6a4a32");
  addBox(group, w + 0.4, 0.05, d + 0.5, toon("#b7a48c"), x, 0.03, z);
  addBox(group, w, h, 0.1, wall, x, h / 2, z - d / 2);
  addBox(group, 0.1, h * 0.92, d * 0.72, wallDark, x + w / 2, h * 0.46, z - d * 0.12);
  addBox(group, w, 0.1, d, roof, x, h + 0.02, z - 0.06);
  const crates = [
    { w: 0.72, h: 0.48, d: 0.5, x: -0.55, z: 0.15, c: "#8d623c" },
    { w: 0.5, h: 0.4, d: 0.42, x: 0.25, z: -0.15, c: "#a87244" },
    { w: 0.46, h: 0.34, d: 0.4, x: 0.22, z: -0.12, y: 0.4, c: "#7a5434" },
    { w: 0.62, h: 0.36, d: 0.48, x: -0.15, z: 0.45, c: "#94663a" },
  ];
  for (const c of crates) {
    addBox(group, c.w, c.h, c.d, toon(c.c), x + c.x, (c.y || 0) + c.h / 2, z + c.z);
  }
  const drum = addCyl(group, 0.28, 0.28, 0.22, toon("#4e5550"), x + 0.85, 0.32, z + 0.15, 10);
  drum.rotation.z = Math.PI / 2;
  drum.rotation.y = 0.4;
  addCyl(group, 0.08, 0.08, 0.34, toon("#3e4440"), x + 0.85, 0.32, z + 0.15, 8).rotation.z = Math.PI / 2;
}

function buildPoles(group) {
  const metal = toon("#3c4450");
  const brass = toon("#b8894e");
  for (const p of POLES) {
    const base = sampleHeight(p.x, p.z);
    addBox(group, 0.46, 0.08, 0.46, toon("#9a9186"), p.x, base + 0.04, p.z);
    addCyl(group, 0.055, 0.07, p.h, metal, p.x, base + p.h / 2, p.z, 8);
    const aim = Math.atan2(STAGE.x - p.x, STAGE.z - p.z);
    const armLen = 0.72;
    const ax = p.x + Math.sin(aim) * armLen * 0.5;
    const az = p.z + Math.cos(aim) * armLen * 0.5;
    const arm = addBox(group, 0.08, 0.06, armLen, metal, ax, base + p.h - 0.12, az);
    arm.rotation.y = aim;
    for (const drop of [-0.18, 0.18]) {
      const lx = p.x + Math.sin(aim) * (armLen * 0.72) + Math.cos(aim) * drop;
      const lz = p.z + Math.cos(aim) * (armLen * 0.72) - Math.sin(aim) * drop;
      addBox(group, 0.16, 0.1, 0.22, brass, lx, base + p.h - 0.28, lz);
      const lens = addBox(
        group,
        0.1,
        0.03,
        0.14,
        toon("#ffe0bc", { emissive: "#ffb15a", emissiveIntensity: 0.85 }),
        lx,
        base + p.h - 0.35,
        lz,
      );
      lens.castShadow = false;
    }
  }
}

function buildPaths(group) {
  const matA = toon("#d2c0a6");
  const matB = toon("#c0aa90");
  pathStones().forEach((s, i) => {
    const y = sampleHeight(s.x, s.z);
    const mesh = addBox(group, s.w, 0.045, s.d, i % 2 ? matA : matB, s.x, y + 0.03, s.z);
    mesh.rotation.y = s.yaw;
    mesh.castShadow = false;
  });
}

function buildForecourt(group) {
  const y = foreY();
  const shape = new THREE.Shape();
  const cx = 2.05;
  const cz = 7.2;
  const rx = 3.55;
  const rz = 2.2;
  const rot = -0.22;
  const seg = 36;
  for (let i = 0; i <= seg; i++) {
    const a = (i / seg) * Math.PI * 2;
    const lx = Math.cos(a) * rx;
    const lz = Math.sin(a) * rz;
    const wx = cx + lx * Math.cos(rot) - lz * Math.sin(rot);
    const wz = cz + lx * Math.sin(rot) + lz * Math.cos(rot);
    if (i === 0) shape.moveTo(wx, -wz);
    else shape.lineTo(wx, -wz);
  }
  const geo = new THREE.ExtrudeGeometry(shape, { depth: 0.05, bevelEnabled: false });
  geo.rotateX(-Math.PI / 2);
  geo.computeVertexNormals();
  const pad = new THREE.Mesh(geo, toon("#cbb892"));
  pad.position.y = y - 0.02;
  pad.receiveShadow = true;
  pad.castShadow = false;
  group.add(pad);

  const curbMat = toon("#8f8170");
  for (let i = 0; i < 16; i++) {
    const a = -2.5 + (i / 15) * 2.15;
    const lx = Math.cos(a) * (rx + 0.02);
    const lz = Math.sin(a) * (rz + 0.02);
    const wx = cx + lx * Math.cos(rot) - lz * Math.sin(rot);
    const wz = cz + lx * Math.sin(rot) + lz * Math.cos(rot);
    if (wz > cz + 0.2) continue;
    const mesh = addBox(group, 0.42, 0.22, 0.28, curbMat, wx, y + 0.08, wz);
    mesh.rotation.y = a + rot;
  }
}

function foliageColor(seed, i) {
  return FOLIAGE[(seed + i) % FOLIAGE.length];
}

function addCanopyBlob(g, x, y, z, sx, sy, sz, color) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(1, 7, 5), toon(color));
  m.scale.set(sx, sy, sz);
  m.position.set(x, y, z);
  tagShadow(m);
  g.add(m);
  return m;
}

function buildTrees(group) {
  const trunk = toon("#5c4030");
  const trunkDark = toon("#4a3428");
  for (const tree of TREES) {
    const y0 = sampleHeight(tree.x, tree.z);
    const h = tree.h;
    const s = tree.seed;
    if (tree.kind === "shrub") {
      addCanopyBlob(group, tree.x, y0 + h * 0.45, tree.z, h * 0.7, h * 0.42, h * 0.55, foliageColor(s, 0));
      addCanopyBlob(group, tree.x + h * 0.28, y0 + h * 0.38, tree.z - h * 0.1, h * 0.4, h * 0.28, h * 0.36, foliageColor(s, 1));
      addCanopyBlob(group, tree.x - h * 0.22, y0 + h * 0.55, tree.z + h * 0.12, h * 0.32, h * 0.22, h * 0.28, foliageColor(s, 2));
      continue;
    }
    if (tree.kind === "pine") {
      addCyl(group, h * 0.012, h * 0.028, h * 0.34, trunkDark, tree.x, y0 + h * 0.17, tree.z, 6);
      for (let i = 0; i < 4; i++) {
        const cone = new THREE.Mesh(
          new THREE.ConeGeometry(h * (0.22 - i * 0.03), h * 0.28, 7),
          toon(foliageColor(s, i)),
        );
        cone.position.set(tree.x + (i - 1.5) * 0.05, y0 + h * (0.32 + i * 0.15), tree.z);
        tagShadow(cone);
        group.add(cone);
      }
      continue;
    }
    if (tree.kind === "column") {
      addCyl(group, h * 0.015, h * 0.026, h * 0.42, trunk, tree.x, y0 + h * 0.21, tree.z, 6);
      for (let i = 0; i < 4; i++) {
        addCanopyBlob(
          group,
          tree.x + ((i % 2) - 0.5) * h * 0.06,
          y0 + h * (0.4 + i * 0.14),
          tree.z,
          h * 0.16,
          h * 0.18,
          h * 0.14,
          foliageColor(s, i),
        );
      }
      continue;
    }
    if (tree.kind === "multi") {
      addCyl(group, h * 0.018, h * 0.03, h * 0.4, trunk, tree.x - 0.12, y0 + h * 0.18, tree.z, 6);
      addCyl(group, h * 0.014, h * 0.024, h * 0.32, trunkDark, tree.x + 0.18, y0 + h * 0.14, tree.z + 0.08, 6);
      addCanopyBlob(group, tree.x, y0 + h * 0.62, tree.z, h * 0.34, h * 0.2, h * 0.28, foliageColor(s, 0));
      addCanopyBlob(group, tree.x + 0.3, y0 + h * 0.5, tree.z + 0.1, h * 0.22, h * 0.16, h * 0.2, foliageColor(s, 2));
      addCanopyBlob(group, tree.x - 0.22, y0 + h * 0.72, tree.z - 0.08, h * 0.2, h * 0.14, h * 0.18, foliageColor(s, 3));
      continue;
    }
    const lean = ((s % 5) - 2) * 0.08;
    addCyl(group, h * 0.018, h * 0.036, h * 0.4, trunk, tree.x + lean, y0 + h * 0.18, tree.z, 7);
    const blobs = [
      [0.05, 0.58, 0.0, 0.34, 0.18, 0.28],
      [0.28, 0.7, -0.08, 0.22, 0.14, 0.2],
      [-0.24, 0.66, 0.1, 0.2, 0.13, 0.18],
      [0.08, 0.82, 0.06, 0.16, 0.11, 0.15],
      [-0.08, 0.5, -0.16, 0.18, 0.12, 0.16],
    ];
    blobs.forEach((b, i) => {
      addCanopyBlob(
        group,
        tree.x + b[0] * h,
        y0 + b[1] * h,
        tree.z + b[2] * h,
        b[3] * h,
        b[4] * h,
        b[5] * h,
        foliageColor(s, i),
      );
    });
  }
}

function buildRocks(group) {
  const spots = [
    { x: -6.4, z: -4.9, s: 1.1, rot: 0.4 },
    { x: -5.6, z: -5.3, s: 0.7, rot: 1.2 },
    { x: 6.5, z: -4.2, s: 0.85, rot: 0.8 },
    { x: -12.2, z: 1.4, s: 1.3, rot: 2.1 },
    { x: 12.6, z: 4.2, s: 1.0, rot: 0.3 },
  ];
  const mats = [toon("#7d7368"), toon("#6a6158"), toon("#8d8276")];
  spots.forEach((r, i) => {
    const y = sampleHeight(r.x, r.z);
    const mesh = new THREE.Mesh(new THREE.DodecahedronGeometry(0.26 * r.s, 0), mats[i % 3]);
    mesh.scale.set(1.35, 0.62, 1.05);
    mesh.position.set(r.x, y + 0.05 * r.s, r.z);
    mesh.rotation.set(0.2, r.rot, 0.15);
    tagShadow(mesh);
    group.add(mesh);
  });
}

function plantForPot(group, x, y, z, kind) {
  const stem = toon("#3f4a30");
  if (kind === "spike") {
    for (const [ox, oz, lean] of [[-0.06, 0.02, -0.15], [0.02, -0.02, 0.05], [0.08, 0.04, 0.18]]) {
      const blade = addBox(group, 0.045, 0.62, 0.16, toon("#4a6638"), x + ox, y + 0.38, z + oz);
      blade.rotation.z = lean;
      blade.rotation.y = oz * 4;
    }
  } else if (kind === "mound") {
    addCanopyBlob(group, x, y + 0.22, z, 0.26, 0.14, 0.22, "#3f5c34");
    addCanopyBlob(group, x + 0.1, y + 0.28, z - 0.06, 0.16, 0.1, 0.14, "#567246");
    addCanopyBlob(group, x - 0.08, y + 0.2, z + 0.08, 0.12, 0.08, 0.12, "#2f4a30");
  } else {
    addCyl(group, 0.012, 0.018, 0.36, stem, x, y + 0.22, z, 5);
    addBox(group, 0.22, 0.05, 0.1, toon("#5a7848"), x + 0.06, y + 0.34, z);
    addBox(group, 0.18, 0.045, 0.09, toon("#3e5c36"), x - 0.04, y + 0.46, z + 0.02);
    addBox(group, 0.14, 0.04, 0.08, toon("#6a8450"), x + 0.02, y + 0.56, z - 0.02);
  }
}

const POT_KINDS = ["spike", "mound", "tuft", "mound", "spike"];

async function main() {
  const statusEl = document.getElementById("status");
  const setStatus = (t) => {
    if (statusEl) statusEl.textContent = t;
  };
  let shadingMode = "toon";
  const params = new URLSearchParams(location.search);
  if (params.get("hud") === "0") {
    const hud = document.getElementById("hud");
    if (hud) hud.style.display = "none";
  }

  setStatus("loading layout…");
  const layout = await fetch("./layout.json").then((r) => r.json());
  layout.instances = layoutInstances();

  const canvas = document.getElementById("c");
  const { renderer, scene, camera, controls } = bootRenderer({ canvas, layout, shadingMode });
  scene.background = makeSkyBackground();
  const built = new THREE.Group();
  built.name = "built";
  built.add(buildTerrain());
  buildBowl(built);
  buildStairs(built);
  buildApron(built);
  buildStage(built);
  buildShed(built);
  buildPoles(built);
  buildPaths(built);
  buildForecourt(built);
  buildTrees(built);
  buildRocks(built);
  scene.add(built);
  applyShading(built, shadingMode);

  setStatus("loading props…");
  const prototypes = await loadPrototypes(layout, shadingMode);
  const props = placeInstances(layout, prototypes, shadingMode);
  scene.add(props);

  const plants = new THREE.Group();
  plants.name = "pot-plants";
  layout.instances
    .filter((i) => i.kind === "flowerpot")
    .forEach((inst, idx) => {
      const spec = layout.assets.flowerpot;
      plantForPot(plants, inst.position[0], inst.position[1] + spec.targetHeight * 0.92, inst.position[2], POT_KINDS[idx % POT_KINDS.length]);
    });
  scene.add(plants);
  applyShading(plants, shadingMode);

  setStatus("ready — outdoor amphitheatre · drag orbit · U unlit · T toon");

  function setMode(mode) {
    shadingMode = mode;
    applyShading(built, mode);
    applyShading(props, mode);
    applyShading(plants, mode);
    const modeEl = document.getElementById("mode");
    if (modeEl) modeEl.textContent = mode.toUpperCase();
  }

  if (params.get("mode") === "unlit") setMode("unlit");
  const camKey = params.get("cam");
  if (camKey && layout.cameraPresets?.[camKey]) {
    const p = layout.cameraPresets[camKey];
    camera.position.set(...p.position);
    controls.target.set(...p.target);
    controls.update();
  }

  window.addEventListener("keydown", (e) => {
    if (e.key === "u" || e.key === "U") setMode("unlit");
    if (e.key === "t" || e.key === "T") setMode("toon");
  });
  document.getElementById("btn-toon")?.addEventListener("click", () => setMode("toon"));
  document.getElementById("btn-unlit")?.addEventListener("click", () => setMode("unlit"));
  window.addEventListener("resize", () => {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
  });

  window.__scene = { renderer, scene, camera, controls, setMode, layout, ready: true };

  function tick() {
    controls.update();
    renderer.render(scene, camera);
    requestAnimationFrame(tick);
  }
  tick();
}

main().catch((err) => {
  console.error(err);
  const statusEl = document.getElementById("status");
  if (statusEl) statusEl.textContent = "error: " + err.message;
});
