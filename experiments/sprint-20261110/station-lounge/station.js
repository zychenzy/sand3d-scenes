import * as THREE from 'three';
import { boot, toon, addBox, addCyl, canvasTex, vaultMetrics } from './scene_lib.js';

const SANS = '"Liberation Sans", "DejaVu Sans", sans-serif';
const SERIF = '"Liberation Serif", "DejaVu Serif", serif';

function palette(shell) {
  const stone = toon(shell.wallColor, { side: THREE.DoubleSide });
  return {
    stone,
    stoneDark: toon('#d3c4ad', { side: THREE.DoubleSide }),
    wood: toon(shell.woodColor),
    oak: toon(shell.oakColor),
    green: toon(shell.greenColor),
    greenLite: toon(shell.greenLite),
    brass: toon(shell.brassColor),
    iron: toon(shell.ironColor),
    vault: toon(shell.vaultColor, { side: THREE.DoubleSide }),
    vaultAlt: toon(shell.vaultAlt, { side: THREE.DoubleSide }),
    roof: toon(shell.roofColor, { side: THREE.DoubleSide }),
    glass: toon('#d7e6f0', { transparent: true, opacity: 0.2, side: THREE.DoubleSide, depthWrite: false }),
    niche: toon(shell.nicheColor, { side: THREE.DoubleSide }),
    carriage: toon(shell.carriageColor),
    cream: toon('#e7e0d2'),
    sky: toon('#c5d6e4', { side: THREE.DoubleSide }),
    canopy: toon('#24362c'),
    bulb: toon('#ffe0b8', { emissive: '#ffb15e', emissiveIntensity: 1.2 }),
    paper: toon('#f4efe2'),
    navy: toon('#1e3348'),
    oxblood: toon('#6e2e2a'),
    tan: toon('#c2a36a'),
    leaf: toon('#2f5a3c'),
    leaf2: toon('#3e7048'),
    trunk: toon('#5a4030'),
    contact: new THREE.MeshBasicMaterial({
      color: 0x1a140f,
      transparent: true,
      opacity: 0.22,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
    }),
  };
}

function mappedMat(map, glow = 0.4) {
  const m = toon('#ffffff', { map, emissive: '#ffffff', emissiveIntensity: glow });
  m.emissiveMap = map;
  return m;
}

function inst(layout, id) {
  return (layout.instances || []).find((i) => i.id === id);
}

function markCast(root) {
  root.traverse((o) => {
    if (o.isMesh) o.userData.casts = true;
  });
}

function contactDisc(g, mat, x, z, w, d) {
  const mesh = new THREE.Mesh(new THREE.CircleGeometry(0.5, 14), mat);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set(x, 0.016, z);
  mesh.scale.set(w, d, 1);
  mesh.userData.unshaded = true;
  mesh.castShadow = false;
  mesh.receiveShadow = false;
  g.add(mesh);
}

function archHole(zc, hw, sill, spring) {
  const hole = new THREE.Path();
  hole.moveTo(zc + hw, sill);
  hole.lineTo(zc - hw, sill);
  hole.lineTo(zc - hw, spring);
  hole.absarc(zc, spring, hw, Math.PI, 0, true);
  hole.closePath();
  return hole;
}

function extrudeWall(shape, depth) {
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: false,
    curveSegments: 12,
    steps: 1,
  });
  geo.computeVertexNormals();
  return geo;
}

function addLeftWall(g, M, meta) {
  const win = meta.windows;
  const z0 = meta.floor.z0;
  const z1 = meta.floor.z1;
  const shape = new THREE.Shape();
  shape.moveTo(z0, 0);
  shape.lineTo(z1, 0);
  shape.lineTo(z1, meta.springY);
  shape.lineTo(z0, meta.springY);
  shape.closePath();
  for (const zc of win.zs) shape.holes.push(archHole(zc, win.hw, win.sill, win.spring));
  const geo = extrudeWall(shape, 0.32);
  geo.rotateY(-Math.PI / 2);
  const mesh = new THREE.Mesh(geo, M.stone);
  mesh.position.x = meta.innerX;
  mesh.receiveShadow = true;
  g.add(mesh);

  const glassX = meta.innerX - 0.16;
  for (const zc of win.zs) {
    const sg = new THREE.Shape();
    sg.moveTo(-win.hw, win.sill);
    sg.lineTo(-win.hw, win.spring);
    sg.absarc(0, win.spring, win.hw, Math.PI, 0, true);
    sg.lineTo(win.hw, win.sill);
    sg.closePath();
    const glassGeo = new THREE.ShapeGeometry(sg, 12);
    glassGeo.rotateY(-Math.PI / 2);
    const glass = new THREE.Mesh(glassGeo, M.glass);
    glass.position.set(glassX, 0, zc);
    glass.userData.noReceive = true;
    g.add(glass);

    const faceX = meta.innerX + 0.07;
    addBox(g, 0.08, win.spring - win.sill, 0.07, M.iron, faceX, (win.spring + win.sill) / 2 + 0.02, zc);
    addBox(g, 0.06, 0.05, win.hw * 2, M.iron, faceX, win.spring - 0.02, zc);
    addBox(g, 0.16, 0.08, win.hw * 2 + 0.16, M.stoneDark, faceX - 0.02, win.sill, zc);
    const steps = 9;
    for (let i = 0; i <= steps; i++) {
      const a = Math.PI - (Math.PI * i) / steps;
      const z = zc + Math.cos(a) * (win.hw + 0.06);
      const y = win.spring + Math.sin(a) * (win.hw + 0.06);
      const voussoir = addBox(g, 0.1, 0.13, 0.14, i === Math.floor(steps / 2) ? M.stoneDark : M.stone, faceX, y, z);
      voussoir.rotation.x = Math.PI / 2 - a;
    }
    addBox(g, 0.1, win.spring - win.sill, 0.12, M.stone, faceX, (win.spring + win.sill) / 2, zc - win.hw - 0.02);
    addBox(g, 0.1, win.spring - win.sill, 0.12, M.stone, faceX, (win.spring + win.sill) / 2, zc + win.hw + 0.02);
  }

  addBox(g, 0.07, 0.98, (z1 - z0) - 0.2, M.green, meta.innerX + 0.05, 0.49, (z0 + z1) / 2);
  addBox(g, 0.08, 0.06, (z1 - z0) - 0.12, M.oak, meta.innerX + 0.06, 1.0, (z0 + z1) / 2);
  addBox(g, 0.24, 0.14, (z1 - z0) - 0.05, M.stoneDark, meta.innerX + 0.02, meta.springY - 0.02, (z0 + z1) / 2);
}

function addBackWall(g, M, meta, vm) {
  const x0 = meta.floor.x0;
  const x1 = 6.0;
  const shape = new THREE.Shape();
  shape.moveTo(x0, 0);
  shape.lineTo(x1, 0);
  shape.lineTo(x1, meta.springY);
  shape.lineTo(vm.xR, meta.springY);
  const N = 28;
  for (let i = 1; i < N; i++) {
    const x = vm.xR + (vm.xL - vm.xR) * (i / N);
    shape.lineTo(x, vm.yAt(x) - 0.015);
  }
  shape.lineTo(vm.xL, meta.springY);
  shape.lineTo(x0, meta.springY);
  shape.closePath();
  const book = meta.booking;
  const lug = meta.luggage;
  shape.holes.push(archHole((book.xL + book.xR) / 2, (book.xR - book.xL) / 2, book.sill, book.spring));
  shape.holes.push(archHole((lug.xL + lug.xR) / 2, (lug.xR - lug.xL) / 2, lug.sill, lug.spring));
  const geo = extrudeWall(shape, 0.28);
  geo.translate(0, 0, -0.28);
  const mesh = new THREE.Mesh(geo, M.stone);
  mesh.position.z = meta.innerZ;
  g.add(mesh);
}

function vaultStrip(vm, z0, z1, mat, push, segs = 22) {
  const { xL, xR, normalAt } = vm;
  const pos = [];
  const nrm = [];
  const idx = [];
  const cols = segs + 1;
  for (let j = 0; j <= 1; j++) {
    const z = j === 0 ? z0 : z1;
    for (let i = 0; i <= segs; i++) {
      const x = xL + (xR - xL) * (i / segs);
      const n = normalAt(x);
      pos.push(x + n.x * push, n.ySoffit + n.y * push, z);
      nrm.push(-n.x, -n.y, 0);
    }
  }
  for (let i = 0; i < segs; i++) {
    const a = i;
    const b = i + 1;
    const c = cols + i + 1;
    const d = cols + i;
    idx.push(a, d, b, b, d, c);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
  geo.setIndex(idx);
  return new THREE.Mesh(geo, mat);
}

function addRib(g, vm, z, mat) {
  const { xL, xR, normalAt } = vm;
  const segs = 18;
  for (let i = 0; i < segs; i++) {
    const xA = xL + (xR - xL) * (i / segs);
    const xB = xL + (xR - xL) * ((i + 1) / segs);
    const nA = normalAt(xA);
    const nB = normalAt(xB);
    const pA = new THREE.Vector3(xA, nA.ySoffit, z);
    const pB = new THREE.Vector3(xB, nB.ySoffit, z);
    const mid = pA.clone().add(pB).multiplyScalar(0.5);
    const tangent = pB.clone().sub(pA);
    const len = tangent.length();
    if (len < 1e-4) continue;
    tangent.multiplyScalar(1 / len);
    const nM = normalAt((xA + xB) / 2);
    const outward = new THREE.Vector3(nM.x, nM.y, 0).normalize();
    let bin = new THREE.Vector3().crossVectors(tangent, outward);
    if (bin.lengthSq() < 1e-6) bin.set(0, 0, 1);
    bin.normalize();
    const yAxis = new THREE.Vector3().crossVectors(bin, tangent).normalize();
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(len + 0.01, 0.14, 0.09), mat);
    const basis = new THREE.Matrix4().makeBasis(tangent, yAxis, bin);
    mesh.quaternion.setFromRotationMatrix(basis);
    mesh.position.copy(mid).addScaledVector(outward, -0.07);
    g.add(mesh);
  }
}

function addVault(g, M, meta, vm) {
  const ribs = [meta.vault.z0, ...meta.columns.zs, meta.vault.z1];
  for (let i = 0; i < ribs.length - 1; i++) {
    const mat = i % 2 === 0 ? M.vault : M.vaultAlt;
    g.add(vaultStrip(vm, ribs[i], ribs[i + 1], mat, 0));
    g.add(vaultStrip(vm, ribs[i], ribs[i + 1], M.roof, 0.1));
  }
  for (const z of ribs) addRib(g, vm, z, M.iron);
  const beamLen = meta.vault.z1 - meta.vault.z0;
  const beamZ = (meta.vault.z1 + meta.vault.z0) / 2;
  addBox(g, 0.42, 0.2, beamLen + 0.05, M.iron, meta.columns.x + 0.12, meta.springY + 0.02, beamZ);
}

function addColumn(g, M, x, z) {
  const grp = new THREE.Group();
  addCyl(grp, 0.22, 0.26, 0.14, M.iron, 0, 0.07, 0, 14, { cast: true });
  addCyl(grp, 0.15, 0.18, 0.08, M.brass, 0, 0.18, 0, 14, { cast: true });
  addCyl(grp, 0.105, 0.125, 2.95, M.iron, 0, 1.7, 0, 14, { cast: true });
  addCyl(grp, 0.16, 0.11, 0.14, M.iron, 0, 3.24, 0, 14, { cast: true });
  addBox(grp, 0.38, 0.1, 0.38, M.stoneDark, 0, 3.36, 0, { cast: true });
  grp.position.set(x, 0, z);
  markCast(grp);
  g.add(grp);
  return grp;
}

function addNicheBox(g, M, spec, warm) {
  const { xL, xR, backZ, spring } = spec;
  const innerZ = -4.22;
  const xC = (xL + xR) / 2;
  const width = xR - xL;
  const depth = innerZ - backZ;
  const zC = (innerZ + backZ) / 2;
  const wallH = Math.max(spring + (xR - xL) / 2 + 0.35, 3.15);
  addBox(g, width + 0.2, wallH, 0.08, warm ? M.niche : M.stone, xC, wallH / 2, backZ);
  addBox(g, 0.08, wallH, depth, M.stone, xL - 0.04, wallH / 2, zC);
  addBox(g, 0.08, wallH, depth, M.stone, xR + 0.04, wallH / 2, zC);
  addBox(g, width, 0.08, depth, M.stoneDark, xC, wallH - 0.02, zC);
}

function addBooking(g, M, meta) {
  const b = meta.booking;
  addNicheBox(g, M, b, true);
  const width = b.xR - b.xL - 0.08;
  const xC = (b.xL + b.xR) / 2;
  const zFront = -4.16;
  const zBack = -5.08;
  const zC = (zFront + zBack) / 2;
  const depth = zFront - zBack;
  const top = addBox(g, width, 0.07, depth, M.oak, xC, 1.045, zC, { cast: true });
  addBox(g, width, 0.96, 0.08, M.green, xC, 0.5, zFront - 0.02, { cast: true });
  addBox(g, width - 0.08, 0.04, 0.04, M.brass, xC, 0.16, zFront + 0.01, { cast: true });
  addBox(g, width, 0.045, depth - 0.04, M.wood, xC, 0.08, zC + 0.02);
  const hw = (b.xR - b.xL) / 2;
  const bars = 6;
  for (let i = 0; i < bars; i++) {
    const x = b.xL + 0.16 + i * ((b.xR - b.xL - 0.32) / (bars - 1));
    addBox(g, 0.025, b.spring - b.sill - 0.08, 0.025, M.brass, x, (b.sill + b.spring) / 2 - 0.02, -4.12, { cast: true });
  }
  addBox(g, hw * 2 - 0.2, 0.045, 0.05, M.wood, xC, b.spring + 0.16, -4.12);
  markCast(top);

  const shade = addCyl(g, 0.16, 0.2, 0.1, M.brass, xC, 2.22, -4.7, 14, { cast: true });
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.055, 14, 12), M.bulb);
  bulb.position.set(xC, 2.14, -4.7);
  g.add(bulb);
  const chain = addCyl(g, 0.012, 0.012, 0.85, M.brass, xC, 2.68, -4.7, 6);
  chain.userData.casts = false;
  shade.userData.casts = true;
}

function addLuggageBay(g, M, meta) {
  const b = meta.luggage;
  addNicheBox(g, M, b, true);
  const xC = (b.xL + b.xR) / 2;
  const width = b.xR - b.xL;
  addBox(g, width - 0.15, 0.06, ( -4.22 - b.backZ) - 0.1, M.oak, xC, 0.05, ( -4.22 + b.backZ) / 2);
  addBox(g, width * 0.72, 0.05, 0.38, M.oak, xC, 0.92, -4.42, { cast: true });
  const archZ = b.spring + (b.xR - b.xL) / 2;
  addBox(g, 0.1, archZ - b.sill, 0.1, M.stone, b.xL, (archZ + b.sill) / 2, -4.12);
  addBox(g, 0.1, archZ - b.sill, 0.1, M.stone, b.xR, (archZ + b.sill) / 2, -4.12);
}

function addExterior(g, M, meta) {
  addBox(g, 0.08, 6.2, 12, M.sky, -8.15, 3.0, 0, { cast: false, receive: false, noReceive: true });
  addBox(g, 1.05, 0.1, 8.6, M.canopy, -6.95, 3.18, 0, { cast: false });
  addBox(g, 0.12, 0.32, 8.6, M.canopy, -6.48, 3.02, 0, { cast: false });
  const body = addBox(g, 0.72, 2.35, 6.4, M.carriage, -7.2, 1.45, 0, { cast: false });
  body.userData.noReceive = true;
  for (const z of [-2.2, -0.7, 0.8, 2.3]) {
    addBox(g, 0.04, 0.72, 0.95, M.cream, -6.82, 1.7, z, { cast: false });
  }
  addBox(g, 0.04, 0.08, 6.4, M.brass, -6.82, 0.55, 0, { cast: false });
}

function addFloor(g, M, meta) {
  const f = meta.floor;
  const w = f.x1 - f.x0;
  const d = f.z1 - f.z0;
  const cx = (f.x0 + f.x1) / 2;
  const cz = (f.z0 + f.z1) / 2;
  addBox(g, w + 0.08, 0.16, d + 0.08, M.wood, cx, -0.08, cz, { cast: false });
  const map = floorTexture(f);
  const mat = mappedMat(map, 0.18);
  mat.polygonOffset = true;
  mat.polygonOffsetFactor = -1;
  mat.polygonOffsetUnits = -1;
  const plane = new THREE.Mesh(new THREE.PlaneGeometry(w, d), mat);
  plane.rotation.x = -Math.PI / 2;
  plane.position.set(cx, 0.012, cz);
  plane.receiveShadow = true;
  plane.castShadow = false;
  g.add(plane);
}

function floorTexture(f) {
  const W = 1024;
  const H = 726;
  const width = f.x1 - f.x0;
  const depth = f.z1 - f.z0;
  return canvasTex(W, H, (ctx) => {
    ctx.fillStyle = '#b7a48a';
    ctx.fillRect(0, 0, W, H);
    const tile = 0.8;
    function rect(x, z, rw, rd, color) {
      const px = ((x - f.x0) / width) * W;
      const py = ((z - f.z0) / depth) * H;
      const pw = (rw / width) * W;
      const ph = (rd / depth) * H;
      ctx.fillStyle = color;
      ctx.fillRect(px, py, pw, ph);
    }
    for (let x = f.x0; x < f.x1; x += tile) {
      for (let z = f.z0; z < f.z1; z += tile) {
        const ix = Math.floor((x - f.x0) / tile);
        const iz = Math.floor((z - f.z0) / tile);
        rect(x + 0.03, z + 0.03, tile - 0.06, tile - 0.06, (ix + iz) % 2 === 0 ? '#e7d3b0' : '#d7c19a');
      }
    }
    rect(-0.12, f.z0, 1.22, depth, '#7a342e');
    rect(-0.02, f.z0, 0.06, depth, '#e6d3b4');
    rect(0.92, f.z0, 0.06, depth, '#e6d3b4');
    rect(0.15, 3.15, 1.05, 0.85, '#6a3a32');
    rect(0.22, 3.24, 0.91, 0.08, '#e6d3b4');
    rect(-5.6, -4.2, 2.15, 1.7, '#5c4638');
    const m = 0.38;
    rect(f.x0, f.z0, width, m, '#4a3d34');
    rect(f.x0, f.z1 - m, width, m, '#4a3d34');
    rect(f.x0, f.z0, m, depth, '#4a3d34');
    rect(f.x1 - m, f.z0, m, depth, '#4a3d34');
  });
}

function addRadiator(g, M, x, z) {
  const top = addCyl(g, 0.028, 0.028, 1.05, M.iron, x, 0.58, z, 8);
  top.rotation.x = Math.PI / 2;
  const bot = addCyl(g, 0.028, 0.028, 1.05, M.iron, x, 0.16, z, 8);
  bot.rotation.x = Math.PI / 2;
  for (let i = -4; i <= 4; i++) addBox(g, 0.05, 0.46, 0.08, M.iron, x, 0.36, z + i * 0.11);
}

function signTexture(text, bg, fg, accent) {
  return canvasTex(1024, 256, (ctx, W, H) => {
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = accent;
    ctx.lineWidth = 22;
    ctx.strokeRect(18, 18, W - 36, H - 36);
    ctx.fillStyle = fg;
    ctx.font = `700 ${Math.floor(H * 0.38)}px ${SANS}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, W / 2, H / 2 + 2);
  });
}

function addSign(g, text, w, h, x, y, z, ry, bg, fg, accent) {
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mappedMat(signTexture(text, bg, fg, accent), 0.45));
  mesh.position.set(x, y, z);
  mesh.rotation.y = ry || 0;
  g.add(mesh);
  return mesh;
}

function clockTexture() {
  const romans = ['XII', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI'];
  return canvasTex(1024, 1024, (ctx) => {
    ctx.fillStyle = '#f6f0e3';
    ctx.beginPath();
    ctx.arc(512, 512, 500, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#1a1a1a';
    ctx.fillStyle = '#1a1a1a';
    for (let i = 0; i < 60; i++) {
      const a = (i / 60) * Math.PI * 2 - Math.PI / 2;
      const inner = i % 5 === 0 ? 400 : 445;
      ctx.lineWidth = i % 5 === 0 ? 14 : 5;
      ctx.beginPath();
      ctx.moveTo(512 + Math.cos(a) * inner, 512 + Math.sin(a) * inner);
      ctx.lineTo(512 + Math.cos(a) * 468, 512 + Math.sin(a) * 468);
      ctx.stroke();
    }
    ctx.font = `700 72px ${SERIF}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2 - Math.PI / 2;
      ctx.fillText(romans[i], 512 + Math.cos(a) * 310, 512 + Math.sin(a) * 310 + 4);
    }
    function hand(turns, len, width) {
      const a = turns * Math.PI * 2 - Math.PI / 2;
      ctx.lineWidth = width;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(512 - Math.cos(a) * 40, 512 - Math.sin(a) * 40);
      ctx.lineTo(512 + Math.cos(a) * len, 512 + Math.sin(a) * len);
      ctx.stroke();
    }
    hand(10 / 12 + 10 / 60 / 12, 240, 26);
    hand(10 / 60, 350, 14);
    ctx.fillStyle = '#8d1f1c';
    ctx.beginPath();
    ctx.arc(512, 512, 22, 0, Math.PI * 2);
    ctx.fill();
  });
}

function timetableTexture() {
  return canvasTex(1280, 720, (ctx, W, H) => {
    ctx.fillStyle = '#f3eee2';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#1e3328';
    ctx.fillRect(0, 0, W, 112);
    ctx.fillStyle = '#f4ecd8';
    ctx.font = `700 58px ${SANS}`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('DEPARTURES', 40, 58);
    ctx.font = `600 28px ${SANS}`;
    ctx.textAlign = 'right';
    ctx.fillText('NORTHGATE', W - 40, 60);
    const cols = [40, 230, 780, 1000];
    ctx.fillStyle = '#2a241e';
    ctx.textAlign = 'left';
    ctx.font = `700 28px ${SANS}`;
    ['TIME', 'TO', 'PLAT.', 'REMARKS'].forEach((h, i) => ctx.fillText(h, cols[i], 156));
    const rows = [
      ['14:05', 'HARBORNE', '2', 'ON TIME'],
      ['14:18', 'WESTFIELD', '1', 'ON TIME'],
      ['14:27', 'KINGSWELL', '3', 'DELAYED'],
      ['14:40', 'PORT MERIDIAN', '1', 'ON TIME'],
      ['14:55', 'ASHDOWN', '2', 'ON TIME'],
      ['15:10', 'CALLOW HALT', '4', 'ON TIME'],
    ];
    rows.forEach((row, i) => {
      const y = 230 + i * 74;
      if (i % 2 === 0) {
        ctx.fillStyle = '#e5d8c0';
        ctx.fillRect(24, y - 32, W - 48, 64);
      }
      ctx.font = `700 36px ${SANS}`;
      ctx.fillStyle = row[3] === 'DELAYED' ? '#8d2420' : '#241c16';
      ctx.textAlign = 'left';
      row.forEach((cell, c) => ctx.fillText(cell, cols[c], y));
    });
  });
}

function alterationsTexture() {
  return canvasTex(1024, 640, (ctx, W, H) => {
    ctx.fillStyle = '#243028';
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = '#d7c49a';
    ctx.lineWidth = 18;
    ctx.strokeRect(16, 16, W - 32, H - 32);
    ctx.fillStyle = '#f4f0e4';
    ctx.textAlign = 'center';
    ctx.font = `700 64px ${SANS}`;
    ctx.fillText('ALTERATIONS', W / 2, 100);
    ctx.font = `500 40px ${SANS}`;
    const lines = ['14:27   KINGSWELL', 'DELAYED   12 MIN', 'NOW PLATFORM  3', '14:55   ASHDOWN', 'EXTRA STOP  —  MILL'];
    lines.forEach((line, i) => ctx.fillText(line, W / 2, 200 + i * 78));
  });
}

function posterTrains() {
  return canvasTex(640, 900, (ctx, W, H) => {
    ctx.fillStyle = '#f4efe4';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#1e3328';
    ctx.fillRect(0, 0, W, 140);
    ctx.fillStyle = '#f4ecd8';
    ctx.font = `700 48px ${SANS}`;
    ctx.textAlign = 'center';
    ctx.fillText('LOCAL TRAINS', W / 2, 88);
    ctx.fillStyle = '#241c16';
    ctx.font = `600 36px ${SANS}`;
    ['HARBORNE', 'WESTFIELD', 'KINGSWELL', 'ASHDOWN', 'CALLOW HALT'].forEach((name, i) => {
      ctx.textAlign = 'left';
      ctx.fillText(name, 48, 230 + i * 110);
      ctx.textAlign = 'right';
      ctx.fillText(['2', '1', '3', '2', '4'][i], W - 48, 230 + i * 110);
    });
  });
}

function addFocalWall(g, M) {
  const x = 0.4;
  const z = -4.08;
  const backplate = addCyl(g, 0.78, 0.78, 0.06, M.wood, x, 4.05, z - 0.08, 28);
  backplate.rotation.x = Math.PI / 2;
  const faceMat = mappedMat(clockTexture(), 0.55);
  faceMat.polygonOffset = true;
  faceMat.polygonOffsetFactor = -2;
  faceMat.polygonOffsetUnits = -2;
  const face = new THREE.Mesh(new THREE.CircleGeometry(0.68, 48), faceMat);
  face.position.set(x, 4.05, z + 0.04);
  g.add(face);
  const bezel = new THREE.Mesh(new THREE.TorusGeometry(0.7, 0.045, 8, 40), M.brass);
  bezel.position.set(x, 4.05, z + 0.055);
  g.add(bezel);

  const boardW = 2.55;
  const boardH = 1.28;
  const by = 1.92;
  addBox(g, boardW + 0.16, boardH + 0.16, 0.08, M.oak, x, by, z - 0.03);
  const sheet = new THREE.Mesh(new THREE.PlaneGeometry(boardW, boardH), mappedMat(timetableTexture(), 0.48));
  sheet.position.set(x, by, z + 0.02);
  g.add(sheet);
  const lamp = addBox(g, 0.7, 0.06, 0.1, M.brass, x, by + boardH / 2 + 0.1, z + 0.05, { cast: true });
  const glow = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.02, 0.04), M.bulb);
  glow.position.set(x, by + boardH / 2 + 0.05, z + 0.08);
  g.add(glow);
  lamp.userData.casts = true;

  addSign(g, 'NORTHGATE', 2.15, 0.32, x, 2.78, z + 0.02, 0, '#1e3328', '#f4ecd8', '#d4b56a');
}

function addWayfinding(g) {
  addSign(g, '←  TICKETS', 0.86, 0.42, -2.25, 1.62, -4.1, 0, '#1e3328', '#f4ecd8', '#d4b56a');
  addSign(g, 'LUGGAGE  →', 0.96, 0.42, 2.55, 1.62, -4.1, 0, '#1e3328', '#f4ecd8', '#d4b56a');
  addSign(g, 'LEFT LUGGAGE', 0.92, 0.22, 4.22, 2.4, -4.06, 0, '#1e3328', '#f4ecd8', '#d4b56a');
  const poster = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.88), mappedMat(posterTrains(), 0.4));
  poster.position.set(-6.05, 1.85, -2.05);
  poster.rotation.y = Math.PI / 2;
  g.add(poster);
  addSign(g, 'TO PLATFORMS', 0.7, 0.28, 5.15, 2.45, 0.2, -Math.PI / 2, '#1e3328', '#f4ecd8', '#d4b56a');
}

function addWainscot(g, M, meta) {
  const z = meta.innerZ + 0.045;
  addBox(g, 9.55, 1.02, 0.05, M.green, -1.5, 0.51, z);
  addBox(g, 0.85, 1.02, 0.05, M.green, 5.45, 0.51, z);
  addBox(g, 9.55, 0.055, 0.06, M.oak, -1.5, 1.04, z + 0.01);
  addBox(g, 0.85, 0.055, 0.06, M.oak, 5.45, 1.04, z + 0.01);
  for (const x of [-0.45, 0.4, 1.25]) {
    addBox(g, 0.62, 0.7, 0.02, M.greenLite, x, 0.5, z + 0.03);
  }
  addBox(g, 0.08, 0.1, 1.55, M.stoneDark, 4.22, 0.08, -4.14);
}

function bayTree(g, M, x, z) {
  addCyl(g, 0.035, 0.045, 0.48, M.trunk, x, 0.58, z, 8, { cast: true });
  addCyl(g, 0.2, 0.04, 0.42, M.leaf, x, 0.98, z, 8, { cast: true });
  addCyl(g, 0.14, 0.02, 0.3, M.leaf2, x + 0.03, 1.25, z - 0.02, 8, { cast: true });
  addCyl(g, 0.08, 0.0, 0.2, M.leaf, x - 0.02, 1.46, z + 0.02, 7, { cast: true });
}

function suitcase(g, M, x, z, w, h, d, mat, rot, y0 = 0) {
  const grp = new THREE.Group();
  addBox(grp, w, h, d, mat, 0, h / 2, 0, { cast: true });
  addBox(grp, w * 0.94, 0.015, d * 0.22, M.cream, 0, h * 0.62, 0);
  const handle = new THREE.Mesh(new THREE.TorusGeometry(Math.min(w, d) * 0.22, 0.012, 6, 12, Math.PI), M.iron);
  handle.position.y = h;
  grp.add(handle);
  grp.position.set(x, y0, z);
  grp.rotation.y = rot;
  markCast(grp);
  g.add(grp);
  contactDisc(g, M.contact, x, z, w * 0.95, d * 0.95);
}

function newspaper(g, M, x, y, z, ry) {
  const map = canvasTex(512, 360, (ctx, W, H) => {
    ctx.fillStyle = '#f7f3ea';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#1e3328';
    ctx.fillRect(0, 0, W, 70);
    ctx.fillStyle = '#f4ecd8';
    ctx.font = `700 42px ${SERIF}`;
    ctx.textAlign = 'center';
    ctx.fillText('NORTHGATE', W / 2, 48);
    ctx.fillStyle = '#2a241e';
    for (let i = 0; i < 7; i++) {
      ctx.fillRect(36, 100 + i * 32, W - 72 - (i % 3) * 40, 12);
    }
  });
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.008, 0.24), mappedMat(map, 0.35));
  mesh.position.set(x, y, z);
  mesh.rotation.y = ry || 0;
  g.add(mesh);
}

function addPendants(g, M, layout, vm) {
  for (const item of layout.instances) {
    if (item.kind !== 'pendant_lamp') continue;
    const spec = layout.assets.pendant_lamp;
    const [x, y, z] = item.position;
    const top = y + spec.targetHeight;
    const soffit = vm.yAt(x) - 0.12;
    if (soffit > top + 0.05) {
      addCyl(g, 0.01, 0.01, soffit - top, M.iron, x, (soffit + top) / 2, z, 6);
    }
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.05, 12, 10), M.bulb);
    bulb.position.set(x, y + 0.08, z);
    g.add(bulb);
  }
}

function addUsedSeats(g, M, layout) {
  const a = inst(layout, 'bench_window_a');
  const hallA = inst(layout, 'bench_hall_a');
  const hallB = inst(layout, 'bench_hall_b');
  const table = inst(layout, 'side_table');
  if (a) {
    addBox(g, 0.46, 0.045, 0.28, M.navy, a.position[0], 0.49, a.position[2] - 0.35, { cast: true });
    addBox(g, 0.16, 0.05, 0.16, M.navy, a.position[0] + 0.12, 0.53, a.position[2] - 0.22, { cast: true });
  }
  if (hallA) newspaper(g, M, hallA.position[0] + 0.35, 0.478, hallA.position[2], 0.4);
  if (hallB) {
    addCyl(g, 0.11, 0.11, 0.015, M.wood, hallB.position[0] + 0.35, 0.485, hallB.position[2], 14);
    addCyl(g, 0.055, 0.062, 0.07, M.wood, hallB.position[0] + 0.35, 0.52, hallB.position[2], 12);
  }
  if (table) newspaper(g, M, table.position[0] - 0.12, table.position[1] + 0.53, table.position[2] + 0.08, -0.3);
}

function addLuggageCluster(g, M) {
  suitcase(g, M, 4.25, -1.7, 0.62, 0.4, 0.42, M.oxblood, 0.45);
  suitcase(g, M, 4.38, -1.62, 0.46, 0.3, 0.32, M.tan, 0.7, 0.4);
  suitcase(g, M, 4.78, -1.42, 0.5, 0.34, 0.28, M.green, -0.35);
  const parcels = [
    [3.95, 1.16, -4.55, 0.28, 0.16, 0.22, 0.2],
    [4.28, 1.14, -4.62, 0.22, 0.12, 0.2, -0.3],
    [4.55, 1.18, -4.5, 0.26, 0.2, 0.18, 0.5],
    [4.05, 0.18, -4.35, 0.34, 0.24, 0.28, 0.15],
    [4.55, 0.16, -4.28, 0.26, 0.18, 0.22, -0.4],
  ];
  parcels.forEach((p, i) => {
    const mat = i % 2 === 0 ? M.tan : M.oak;
    const box = addBox(g, p[3], p[4], p[5], mat, p[0], p[1], p[2], { cast: true });
    box.rotation.y = p[6];
    addBox(g, p[3] * 0.9, 0.012, 0.015, M.cream, p[0], p[1] + 0.02, p[2]);
  });
}

function addUmbrellas(g, M, x, z) {
  addCyl(g, 0.13, 0.16, 0.42, M.iron, x, 0.21, z, 12, { cast: true });
  ['#1c1c1c', '#6e2430', '#1e3348'].forEach((color, i) => {
    const cane = addCyl(g, 0.012, 0.015, 0.82, toon(color), x + (i - 1) * 0.05, 0.72, z, 6, { cast: true });
    cane.rotation.z = -0.18 + i * 0.16;
    cane.rotation.x = (i - 1) * 0.08;
  });
}

function addQueue(g, M) {
  for (const z of [-3.55, -2.45]) {
    addCyl(g, 0.035, 0.04, 0.92, M.brass, -5.72, 0.46, z, 10, { cast: true });
    addCyl(g, 0.07, 0.07, 0.04, M.brass, -5.72, 0.94, z, 10);
    contactDisc(g, M.contact, -5.72, z, 0.22, 0.22);
  }
  const rope = addCyl(g, 0.012, 0.012, 1.05, M.oxblood, -5.72, 0.9, -3.0, 6);
  rope.rotation.x = Math.PI / 2;
}

function addAlterationsBoard(g, layout) {
  const board = inst(layout, 'alterations');
  if (!board) return;
  const ry = board.rotationY || 0;
  const ox = Math.cos(ry);
  const oz = -Math.sin(ry);
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1.25, 0.82), mappedMat(alterationsTexture(), 0.5));
  mesh.position.set(board.position[0] + ox * 0.36, 0.92, board.position[2] + oz * 0.36);
  mesh.rotation.y = Math.PI / 2 - ry;
  mesh.name = 'alterations-text';
  g.add(mesh);
}

function addLecternSheet(g, layout) {
  const lectern = inst(layout, 'lectern');
  if (!lectern) return;
  const map = canvasTex(640, 480, (ctx, W, H) => {
    ctx.fillStyle = '#f6f1e6';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#1e3328';
    ctx.font = `700 54px ${SERIF}`;
    ctx.textAlign = 'center';
    ctx.fillText('POCKET', W / 2, 120);
    ctx.fillText('TIMETABLE', W / 2, 190);
    ctx.font = `500 32px ${SANS}`;
    ctx.fillText('NORTHGATE', W / 2, 280);
    ctx.fillText('WEEKDAYS', W / 2, 340);
  });
  const sheet = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.008, 0.2), mappedMat(map, 0.4));
  sheet.position.set(lectern.position[0], 1.06, lectern.position[2] + 0.04);
  sheet.rotation.y = lectern.rotationY || 0;
  sheet.rotation.x = -0.35;
  g.add(sheet);
}

function freezeShell(g) {
  g.traverse((o) => {
    if (!o.isMesh) return;
    if (!o.userData.casts) o.castShadow = false;
    if (o.userData.noReceive) o.receiveShadow = false;
  });
}

function makeShell(layout) {
  const g = new THREE.Group();
  g.name = 'shell';
  const M = palette(layout.shell);
  const meta = layout.meta;
  const vm = vaultMetrics(meta);
  addFloor(g, M, meta);
  try {
    addLeftWall(g, M, meta);
  } catch (err) {
    console.error('left wall', err);
    window.__errors.push('left wall: ' + err.message);
    addBox(g, 0.28, meta.springY, 8.8, M.stone, meta.innerX, meta.springY / 2, 0);
  }
  try {
    addBackWall(g, M, meta, vm);
  } catch (err) {
    console.error('back wall', err);
    window.__errors.push('back wall: ' + err.message);
    addBox(g, 12.2, meta.springY, 0.28, M.stone, -0.2, meta.springY / 2, meta.innerZ);
  }
  addVault(g, M, meta, vm);
  for (const z of meta.columns.zs) {
    addColumn(g, M, meta.columns.x, z);
    contactDisc(g, M.contact, meta.columns.x, z, 0.55, 0.55);
  }
  addBooking(g, M, meta);
  addLuggageBay(g, M, meta);
  addWainscot(g, M, meta);
  addExterior(g, M, meta);
  addRadiator(g, M, meta.innerX + 0.22, -1.05);
  addRadiator(g, M, meta.innerX + 0.22, 1.05);
  addFocalWall(g, M);
  addWayfinding(g);
  addBox(g, 0.7, meta.springY, 0.28, M.stone, meta.innerX + 0.45, meta.springY / 2, meta.floor.z1 - 0.2);
  freezeShell(g);
  g.userData.vault = vm;
  return g;
}

function makeProcedural(layout) {
  const g = new THREE.Group();
  g.name = 'procedural';
  const M = palette(layout.shell);
  const vm = vaultMetrics(layout.meta);
  addPendants(g, M, layout, vm);
  addUsedSeats(g, M, layout);
  addLuggageCluster(g, M);
  addUmbrellas(g, M, -4.55, 3.45);
  addQueue(g, M);
  addAlterationsBoard(g, layout);
  addLecternSheet(g, layout);
  for (const id of ['flower_front', 'flower_ticket']) {
    const pot = inst(layout, id);
    if (pot) {
      bayTree(g, M, pot.position[0], pot.position[2]);
      contactDisc(g, M.contact, pot.position[0], pot.position[2], 0.42, 0.42);
    }
  }
  contactDisc(g, M.contact, -4.55, 3.45, 0.36, 0.36);
  return g;
}

function addPropContacts(scene, props) {
  const mat = new THREE.MeshBasicMaterial({
    color: 0x1a140f,
    transparent: true,
    opacity: 0.2,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
  });
  const ids = [
    'bench_window_a', 'bench_window_b', 'bench_hall_a', 'bench_hall_b', 'bench_hall_c', 'bench_hall_d',
    'side_table', 'lectern', 'alterations', 'booking_chair', 'flower_front', 'flower_ticket',
  ];
  for (const id of ids) {
    const obj = props.getObjectByName(id);
    if (!obj) continue;
    const box = new THREE.Box3().setFromObject(obj);
    const w = Math.max(0.25, box.max.x - box.min.x);
    const d = Math.max(0.25, box.max.z - box.min.z);
    const c = box.getCenter(new THREE.Vector3());
    contactDisc(scene, mat, c.x, c.z, w * 0.9, d * 0.9);
  }
}

boot({
  makeShell,
  makeProcedural,
  onReady: ({ scene, props }) => addPropContacts(scene, props),
  readyText: 'ready — Northgate waiting hall · drag orbit · U unlit · T toon',
});
