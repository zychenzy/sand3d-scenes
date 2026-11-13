import * as THREE from "three";
import { boot, toon, addBox, addCyl } from "./scene_lib.js";
import {
  SPEC,
  SCORES,
  STUCK,
  plan,
  doubleInner,
  trebleInner,
} from "./darts_spec.mjs";

const OAK = ["#c49a68", "#b88b58", "#d0a572", "#a67d4c", "#c9a06e", "#b48350"];
const INK = "#2c2824";
const RED = "#c4382e";
const GREEN = "#1f7a48";
const CREAM = "#f4efe6";
const SISAL = "#e4d3b0";
const BRASS = "#c6a15a";

function decal(mesh) {
  mesh.userData.noCast = true;
  mesh.receiveShadow = true;
  mesh.castShadow = false;
  return mesh;
}

function canvasTexture(canvas) {
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  tex.needsUpdate = true;
  return tex;
}

function drawBoard(canvas) {
  const ctx = canvas.getContext("2d");
  const S = canvas.width;
  const c = S / 2;
  const R = S / 2 - 4;
  const px = (metres) => (metres / SPEC.boardRadius) * R;
  const sector = (r0, r1, a0, a1, color) => {
    ctx.beginPath();
    ctx.arc(c, c, r1, a0, a1, false);
    ctx.arc(c, c, r0, a1, a0, true);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
  };

  ctx.clearRect(0, 0, S, S);
  ctx.beginPath();
  ctx.arc(c, c, R, 0, Math.PI * 2);
  ctx.fillStyle = SISAL;
  ctx.fill();

  const step = (Math.PI * 2) / 20;
  for (let i = 0; i < 20; i += 1) {
    const a0 = -Math.PI / 2 + (i - 0.5) * step;
    const a1 = a0 + step;
    const dark = i % 2 === 0;
    const base = dark ? "#242220" : CREAM;
    const ring = dark ? RED : GREEN;
    sector(px(SPEC.outerBullDiameter / 2), px(doubleInner()), a0, a1, base);
    sector(px(trebleInner()), px(SPEC.trebleOuter), a0, a1, ring);
    sector(px(doubleInner()), px(SPEC.doubleOuter), a0, a1, ring);
  }

  ctx.beginPath();
  ctx.arc(c, c, px(SPEC.outerBullDiameter / 2), 0, Math.PI * 2);
  ctx.fillStyle = GREEN;
  ctx.fill();
  ctx.beginPath();
  ctx.arc(c, c, px(SPEC.innerBullDiameter / 2), 0, Math.PI * 2);
  ctx.fillStyle = RED;
  ctx.fill();

  ctx.strokeStyle = "#3a342c";
  ctx.lineWidth = Math.max(2, px(0.0017));
  for (const radius of [
    SPEC.innerBullDiameter / 2,
    SPEC.outerBullDiameter / 2,
    trebleInner(),
    SPEC.trebleOuter,
    doubleInner(),
    SPEC.doubleOuter,
  ]) {
    ctx.beginPath();
    ctx.arc(c, c, px(radius), 0, Math.PI * 2);
    ctx.stroke();
  }
  for (let i = 0; i < 20; i += 1) {
    const a = -Math.PI / 2 + (i - 0.5) * step;
    ctx.beginPath();
    ctx.moveTo(c + Math.cos(a) * px(SPEC.outerBullDiameter / 2), c + Math.sin(a) * px(SPEC.outerBullDiameter / 2));
    ctx.lineTo(c + Math.cos(a) * px(SPEC.doubleOuter), c + Math.sin(a) * px(SPEC.doubleOuter));
    ctx.stroke();
  }

  ctx.fillStyle = "#1c1914";
  ctx.font = `700 ${Math.round(R * 0.085)}px sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const nr = px((SPEC.doubleOuter + SPEC.boardRadius) * 0.5);
  for (let i = 0; i < 20; i += 1) {
    const ang = -Math.PI / 2 + i * step;
    ctx.save();
    ctx.translate(c + Math.cos(ang) * nr, c + Math.sin(ang) * nr);
    ctx.rotate(ang + Math.PI / 2);
    ctx.fillText(String(SPEC.numbers[i]), 0, 0);
    ctx.restore();
  }
}

function scoreTexture(a, b) {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 640;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#f3ecdc";
  ctx.fillRect(0, 0, 512, 640);
  ctx.fillStyle = "#6a3e32";
  ctx.fillRect(0, 0, 512, 86);
  ctx.fillStyle = "#f6f0e6";
  ctx.font = "700 54px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("501", 256, 44);
  ctx.fillStyle = "#2a241c";
  ctx.font = "700 132px sans-serif";
  ctx.letterSpacing = "14px";
  ctx.lineWidth = 14;
  ctx.strokeStyle = "#f3ecdc";
  ctx.strokeText(String(a), 256, 230);
  ctx.fillText(String(a), 256, 230);
  ctx.strokeText(String(b), 256, 430);
  ctx.fillText(String(b), 256, 430);
  ctx.letterSpacing = "0px";
  ctx.font = "600 36px sans-serif";
  ctx.fillStyle = "#6a5a48";
  ctx.fillText("HOME", 256, 150);
  ctx.fillText("AWAY", 256, 350);
  ctx.strokeStyle = "#c6a15a";
  ctx.lineWidth = 10;
  ctx.strokeRect(16, 16, 480, 608);
  return canvasTexture(canvas);
}

function leagueTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 768;
  canvas.height = 512;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#1d4a38";
  ctx.fillRect(0, 0, 768, 512);
  ctx.fillStyle = "#f3ecdc";
  ctx.font = "700 54px sans-serif";
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText("WEDNESDAY LEAGUE", 48, 70);
  const rows = [
    ["North Wall", "4"],
    ["River Oche", "3"],
    ["Mill Lane", "3"],
    ["Ash Court", "2"],
  ];
  ctx.font = "600 48px sans-serif";
  rows.forEach((row, i) => {
    const y = 170 + i * 78;
    ctx.fillText(row[0], 56, y);
    ctx.textAlign = "right";
    ctx.fillText(row[1], 700, y);
    ctx.textAlign = "left";
  });
  return canvasTexture(canvas);
}

function plaqueTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 640;
  canvas.height = 360;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#f6f0e4";
  ctx.fillRect(0, 0, 640, 360);
  ctx.strokeStyle = "#6a3e32";
  ctx.lineWidth = 12;
  ctx.strokeRect(10, 10, 620, 340);
  ctx.fillStyle = "#2a241c";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = "700 42px sans-serif";
  ctx.fillText("STEEL TIP", 320, 70);
  ctx.font = "600 36px sans-serif";
  ctx.fillText("Bull  1.73 m", 320, 150);
  ctx.fillText("Oche  2.37 m", 320, 210);
  ctx.fillText("Diagonal  2.93 m", 320, 270);
  return canvasTexture(canvas);
}

function makeDart(color) {
  const g = new THREE.Group();
  const point = new THREE.Mesh(new THREE.ConeGeometry(0.003, 0.02, 8), toon("#d9d3c6"));
  point.rotation.x = Math.PI / 2;
  point.position.z = 0.01;
  g.add(point);
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.0045, 0.0055, 0.042, 10), toon(color));
  barrel.rotation.x = Math.PI / 2;
  barrel.position.z = 0.04;
  g.add(barrel);
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.0018, 0.0018, 0.038, 8), toon("#3a342e"));
  shaft.rotation.x = Math.PI / 2;
  shaft.position.z = 0.078;
  g.add(shaft);
  const flight = new THREE.Mesh(new THREE.BoxGeometry(0.034, 0.0022, 0.042), toon(color));
  flight.position.z = 0.112;
  g.add(flight);
  const flight2 = new THREE.Mesh(new THREE.BoxGeometry(0.0022, 0.032, 0.04), toon(color));
  flight2.position.z = 0.112;
  g.add(flight2);
  g.traverse((o) => {
    if (o.isMesh) {
      o.castShadow = true;
      o.receiveShadow = false;
    }
  });
  return g;
}

function woodFloor(g, W, D) {
  const mats = OAK.map((c) => toon(c));
  const bw = 0.16;
  const cols = Math.ceil(W / bw);
  const x0 = -W / 2;
  for (let c = 0; c < cols; c += 1) {
    let z = -D / 2;
    let i = 0;
    const stagger = (c % 2) * 0.42;
    while (z < D / 2 - 0.02) {
      const full = 0.78 + ((c * 3 + i * 5) % 4) * 0.12;
      const len = i === 0 ? Math.max(0.28, full - stagger) : full;
      const z1 = Math.min(z + len, D / 2);
      const h = z1 - z;
      if (h > 0.16) {
        const m = addBox(
          g,
          bw - 0.008,
          0.018,
          h - 0.01,
          mats[(c + i) % mats.length],
          x0 + c * bw + bw / 2,
          0.009,
          (z + z1) / 2,
        );
        m.userData.noCast = true;
      }
      z = z1;
      i += 1;
      if (i > 24) break;
    }
  }
}

function contact(g, x, z, rx, rz) {
  const m = new THREE.Mesh(
    new THREE.CircleGeometry(1, 16),
    toon("#3a3128", {
      transparent: true,
      opacity: 0.12,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
    }),
  );
  m.rotation.x = -Math.PI / 2;
  m.scale.set(rx, rz, 1);
  m.position.set(x, 0.021, z);
  m.renderOrder = 2;
  decal(m);
  g.add(m);
}

function makeRoom(layout) {
  const g = new THREE.Group();
  g.name = "room";
  const { width: W, depth: D, height: H } = layout.meta.room;
  const p = plan(layout.meta.room);
  const plaster = toon("#f2eadf");
  const oak = toon("#8a6244");
  const surround = toon("#243f36");
  const felt = toon("#2c463c");
  const charcoal = toon("#3a3632");
  const brass = toon(BRASS);
  const matCol = toon("#5a665c");
  const stripe = toon("#e7dcc8");
  const red = toon(RED);
  const ceil = toon("#f6f1e8");

  woodFloor(g, W, D);

  const back = addBox(g, W, H, 0.14, plaster, 0, H / 2, -D / 2);
  back.userData.noCast = true;
  back.userData.noReceive = true;
  const left = addBox(g, 0.14, H, D, plaster, -W / 2, H / 2, 0);
  left.userData.noCast = true;
  left.userData.noReceive = true;
  const skirt = addBox(g, W - 0.2, 0.92, 0.03, oak, 0, 0.46, p.backInner + 0.02);
  skirt.userData.noCast = true;
  skirt.userData.noReceive = true;
  const sideSkirt = addBox(g, 0.03, 0.92, D - 0.3, oak, p.leftInner + 0.02, 0.46, 0.2);
  sideSkirt.userData.noCast = true;
  sideSkirt.userData.noReceive = true;

  const span = p.centers[p.centers.length - 1] - p.centers[0] + 1.5;
  const band = addBox(g, span, 1.52, 0.016, surround, 0, 1.72, p.backInner + 0.01);
  band.userData.noCast = true;
  band.userData.noReceive = true;

  const ceilD = p.table.z + 1.7;
  const ceilZ = p.backInner + ceilD / 2;
  const slab = addBox(g, W - 0.3, 0.08, ceilD, ceil, 0, H - 0.06, ceilZ);
  slab.userData.noCast = true;
  slab.userData.noReceive = true;
  for (let i = 0; i < 3; i += 1) {
    const z = p.boardFaceZ + 0.9 + i * 1.15;
    const beam = addBox(g, W - 0.8, 0.1, 0.12, oak, 0, H - 0.16, z);
    beam.userData.noCast = true;
    beam.userData.noReceive = true;
  }

  const glass = toon("#d5e2ea", { transparent: true, opacity: 0.35, side: THREE.DoubleSide });
  const win = addBox(g, 0.04, 0.62, 1.25, glass, p.leftInner + 0.03, 2.15, 3.05);
  win.userData.noCast = true;
  addBox(g, 0.05, 0.08, 1.4, oak, p.leftInner + 0.04, 2.15, 3.05);
  addBox(g, 0.05, 0.78, 0.06, oak, p.leftInner + 0.04, 2.15, 3.05 - 0.66);
  addBox(g, 0.05, 0.78, 0.06, oak, p.leftInner + 0.04, 2.15, 3.05 + 0.66);

  const boardCanvas = document.createElement("canvas");
  boardCanvas.width = 1024;
  boardCanvas.height = 1024;
  drawBoard(boardCanvas);
  const boardMap = canvasTexture(boardCanvas);
  const faceMat = toon("#ffffff", {
    map: boardMap,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
  });

  p.centers.forEach((x, i) => {
    const backer = addBox(
      g,
      SPEC.backerSize,
      SPEC.backerSize,
      SPEC.backerDepth,
      charcoal,
      x,
      SPEC.bullHeight,
      p.backInner + SPEC.backerDepth / 2,
    );
    backer.userData.noCast = true;

    const face = new THREE.Mesh(new THREE.CircleGeometry(SPEC.boardRadius, 72), faceMat);
    face.position.set(x, SPEC.bullHeight, p.boardFaceZ + 0.004);
    face.userData.noCast = true;
    face.name = "board-face";
    g.add(face);

    const rim = new THREE.Mesh(
      new THREE.CylinderGeometry(SPEC.boardRadius + 0.016, SPEC.boardRadius + 0.016, SPEC.boardThickness, 48, 1, true),
      toon("#4a3c2c"),
    );
    rim.rotation.x = Math.PI / 2;
    rim.position.set(x, SPEC.bullHeight, p.boardFaceZ - SPEC.boardThickness / 2);
    rim.userData.noCast = true;
    g.add(rim);

    const bull = new THREE.Object3D();
    bull.position.set(x, SPEC.bullHeight, p.boardFaceZ);
    bull.userData.role = "bull";
    g.add(bull);

    const plate = addBox(g, 0.16, 0.1, 0.012, brass, x, SPEC.bullHeight - 0.4, p.boardFaceZ + 0.006);
    plate.userData.noCast = true;
    const num = document.createElement("canvas");
    num.width = 128;
    num.height = 128;
    const nctx = num.getContext("2d");
    nctx.fillStyle = BRASS;
    nctx.fillRect(0, 0, 128, 128);
    nctx.fillStyle = "#2a2118";
    nctx.font = "700 84px sans-serif";
    nctx.textAlign = "center";
    nctx.textBaseline = "middle";
    nctx.fillText(String(i + 1), 64, 68);
    const numMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(0.12, 0.08),
      toon("#ffffff", { map: canvasTexture(num) }),
    );
    numMesh.position.set(x, SPEC.bullHeight - 0.4, p.boardFaceZ + 0.014);
    numMesh.userData.noCast = true;
    g.add(numMesh);

    for (const dart of STUCK[i]) {
      const d = makeDart(dart.color);
      d.position.set(x + dart.dx, SPEC.bullHeight + dart.dy, p.boardFaceZ + 0.002);
      d.rotation.y = (dart.dx - dart.dy) * 0.35;
      d.scale.setScalar(1.35);
      g.add(d);
    }

    const canY = 2.7;
    const canZ = p.boardFaceZ + 0.62;
    addCyl(g, 0.1, 0.11, 0.12, charcoal, x, canY, canZ, 16);
    const glow = new THREE.Mesh(
      new THREE.CircleGeometry(0.07, 16),
      toon("#fff1d0", { emissive: "#fff1d0", emissiveIntensity: 0.9 }),
    );
    glow.rotation.x = Math.PI / 2;
    glow.position.set(x, canY - 0.05, canZ);
    glow.userData.noCast = true;
    g.add(glow);
    const visor = addBox(g, 0.22, 0.06, 0.04, charcoal, x, canY - 0.02, canZ + 0.1);
    visor.userData.noCast = true;

    [-1, 1].forEach((side) => {
      const wing = addBox(
        g,
        0.03,
        1.7,
        0.42,
        felt,
        x + side * 0.46,
        1.25,
        p.boardFaceZ + 0.22,
      );
      wing.name = "wing";
      wing.userData.noCast = true;
      wing.userData.noReceive = true;
    });

    const mat = addBox(
      g,
      SPEC.corridorHalf * 2,
      0.012,
      p.ocheBackZ - p.boardFaceZ,
      matCol,
      x,
      0.02,
      (p.boardFaceZ + p.ocheBackZ) / 2,
    );
    mat.userData.noCast = true;
    const line = addBox(
      g,
      0.045,
      0.004,
      p.ocheBackZ - p.boardFaceZ - 0.2,
      stripe,
      x,
      0.028,
      (p.boardFaceZ + p.ocheBackZ) / 2 - 0.05,
    );
    line.userData.noCast = true;
    decal(line);

    const oche = addBox(
      g,
      SPEC.ocheLength,
      SPEC.ocheHeight,
      SPEC.ocheDepth,
      oak,
      x,
      SPEC.ocheHeight / 2,
      p.ocheBackZ - SPEC.ocheDepth / 2,
    );
    oche.name = "oche";
    const paint = addBox(
      g,
      SPEC.ocheLength + 0.08,
      0.006,
      0.07,
      red,
      x,
      0.03,
      p.ocheBackZ - 0.045,
    );
    paint.userData.noCast = true;
    paint.userData.noReceive = true;

    const marker = new THREE.Object3D();
    marker.position.set(x, 0, p.ocheBackZ);
    marker.userData.role = "oche";
    g.add(marker);

    contact(g, x, p.ocheBackZ + 0.45, 0.28, 0.18);
  });

  for (let i = 0; i < p.centers.length - 1; i += 1) {
    const x = (p.centers[i] + p.centers[i + 1]) / 2;
    const rail = addBox(
      g,
      0.05,
      0.07,
      p.ocheBackZ - p.boardFaceZ - 0.16,
      oak,
      x,
      0.05,
      (p.boardFaceZ + p.ocheBackZ) / 2 - 0.04,
    );
    rail.name = "divider";
  }

  p.stands.forEach((stand, i) => {
    const [home, away] = SCORES[i];
    addBox(g, 0.28, 0.02, 0.3, oak, stand.x, 0.01, stand.z);
    addBox(g, 0.04, 0.78, 0.04, oak, stand.x, 0.41, stand.z);
    const face = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.52), toon("#ffffff", { map: scoreTexture(home, away) }));
    face.position.set(stand.x, 1.02, stand.z + 0.02);
    face.rotation.x = 0.42;
    face.userData.noCast = true;
    g.add(face);
    addBox(g, 0.28, 0.02, 0.02, oak, stand.x, 0.86, stand.z);
    contact(g, stand.x, stand.z, 0.2, 0.2);
  });

  const league = new THREE.Mesh(new THREE.PlaneGeometry(1.15, 0.76), toon("#ffffff", { map: leagueTexture() }));
  league.position.set(p.leftInner + 0.03, 1.5, -1.4);
  league.rotation.y = Math.PI / 2;
  league.userData.noCast = true;
  g.add(league);
  addBox(g, 0.03, 0.84, 1.23, oak, p.leftInner + 0.02, 1.5, -1.4);

  const plaque = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.36), toon("#ffffff", { map: plaqueTexture() }));
  plaque.position.set(p.leftInner + 0.03, 1.45, 0.15);
  plaque.rotation.y = Math.PI / 2;
  plaque.userData.noCast = true;
  g.add(plaque);

  const caseG = new THREE.Group();
  addBox(caseG, 0.32, 0.035, 0.14, oak, 0, 0.02, 0);
  addBox(caseG, 0.32, 0.03, 0.012, oak, 0, 0.04, 0.064);
  addBox(caseG, 0.32, 0.03, 0.012, oak, 0, 0.04, -0.064);
  for (let i = 0; i < 3; i += 1) {
    const d = makeDart(["#c4382e", "#1f7a48", "#24527a"][i]);
    d.rotation.y = Math.PI / 2;
    d.position.set(-0.05 + i * 0.012, 0.045, 0);
    caseG.add(d);
  }
  caseG.position.set(p.table.x + 0.02, p.table.top, p.table.z - 0.2);
  g.add(caseG);

  contact(g, p.table.x, p.table.z, p.table.half * 0.42, p.table.half * 0.42);

  g.userData.plan = p;
  return g;
}

function checkBuilt(root) {
  const errors = [];
  const bulls = [];
  const oches = [];
  let faces = 0;
  root.updateWorldMatrix(true, true);
  root.traverse((o) => {
    if (o.userData.role === "bull") bulls.push(o.getWorldPosition(new THREE.Vector3()));
    if (o.userData.role === "oche") oches.push(o.getWorldPosition(new THREE.Vector3()));
    if (o.name === "board-face" && o.geometry && o.geometry.parameters) {
      faces += 1;
      const r = o.geometry.parameters.radius;
      if (Math.abs(r - SPEC.boardRadius) > 1e-4) errors.push("board radius " + r);
    }
    if (o.name === "oche" && o.geometry && o.geometry.parameters) {
      const h = o.geometry.parameters.height;
      const w = o.geometry.parameters.width;
      if (Math.abs(h - SPEC.ocheHeight) > 1e-4) errors.push("oche height " + h);
      if (Math.abs(w - SPEC.ocheLength) > 1e-4) errors.push("oche length " + w);
    }
  });
  if (bulls.length !== SPEC.laneCount) errors.push("bull count " + bulls.length);
  if (oches.length !== SPEC.laneCount) errors.push("oche count " + oches.length);
  if (faces !== SPEC.laneCount) errors.push("face count " + faces);
  for (const b of bulls) {
    if (Math.abs(b.y - SPEC.bullHeight) > 0.002) errors.push("bull height " + b.y.toFixed(4));
    const oche = oches.find((o) => Math.abs(o.x - b.x) < 0.02);
    if (!oche) {
      errors.push("no oche for lane " + b.x.toFixed(2));
      continue;
    }
    const horiz = oche.z - b.z;
    if (Math.abs(horiz - SPEC.throwDistance) > 0.002) errors.push("throw " + horiz.toFixed(4));
    if (Math.abs(oche.y) > 0.002) errors.push("oche not at floor");
    const diag = Math.hypot(horiz, b.y - oche.y);
    if (Math.abs(diag - Math.hypot(SPEC.throwDistance, SPEC.bullHeight)) > 0.003) {
      errors.push("diagonal " + diag.toFixed(4));
    }
  }
  const xs = bulls.map((b) => b.x).sort((a, c) => a - c);
  for (let i = 1; i < xs.length; i += 1) {
    if (xs[i] - xs[i - 1] < SPEC.corridorHalf * 2) errors.push("lanes overlap");
  }
  return errors;
}

boot({
  makeRoom,
  checkBuilt,
  readyText: "Oche Hall — four steel-tip lanes · T toon · U unlit",
});
