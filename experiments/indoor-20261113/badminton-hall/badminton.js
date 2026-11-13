import * as THREE from 'three';
import { boot, addBox, addCyl } from './scene_lib.js';
import {
  COURT,
  HALL,
  RACKET,
  cableY,
  floorMarkings,
  lightLanes,
  postsFor,
  racketMetrics,
} from './court_spec.mjs';

const easeCloseShadows = typeof location !== 'undefined'
  && new URLSearchParams(location.search).get('cam') === 'close';

const C = {
  lower: '#2c5642',
  upper: '#5f8b74',
  skirt: '#243f34',
  dado: '#1c332b',
  steel: '#2a3138',
  poche: '#141210',
  ceiling: '#b7c9be',
  seam: '#7f978c',
  pad: '#e4d3b4',
  padEdge: '#1c332b',
  mat: '#1f7a45',
  line: '#f4f6f1',
  post: '#f3f4f1',
  base: '#1a1c1b',
  tape: '#f6f6f2',
  net: '#121816',
  housing: '#1c2226',
  diffuser: '#f4f7f1',
  diffuserEmissive: '#e9f3ea',
  cove: '#c4a078',
  coveEmissive: '#ffc98a',
  door: '#274e3c',
  handle: '#c5bba8',
  rubber: '#2a2e2c',
  fascia: '#243f34',
  column: '#2a4d3c',
  navy: '#1b2744',
  frameLight: '#e7e4dc',
  grip: '#8e2d32',
  gripDark: '#1c1c1c',
  cork: '#c6a36a',
  skirtFeather: '#f7f4ec',
  tube: '#f3f1ea',
  tubeBand: '#1d4e8f',
};

function srgb(canvas) {
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  tex.needsUpdate = true;
  return tex;
}

function mat(color, opts = {}) {
  return new THREE.MeshStandardMaterial({
    color,
    map: opts.map || null,
    emissive: opts.emissive ?? 0x000000,
    emissiveIntensity: opts.emissiveIntensity ?? (opts.emissive ? 1 : 0),
    roughness: 1,
    metalness: 0,
    transparent: !!opts.transparent,
    opacity: opts.opacity ?? 1,
    alphaTest: opts.alphaTest ?? 0,
    side: opts.side || THREE.FrontSide,
    depthWrite: opts.depthWrite !== false,
    polygonOffset: !!opts.polygonOffset,
    polygonOffsetFactor: opts.polygonOffsetFactor ?? 0,
    polygonOffsetUnits: opts.polygonOffsetUnits ?? 0,
  });
}

function paintPlanks(width, depth, colors) {
  const ppm = 72;
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(64, Math.round(width * ppm));
  canvas.height = Math.max(64, Math.round(depth * ppm));
  const ctx = canvas.getContext('2d');
  const plank = 0.092;
  const n = Math.ceil(width / plank);
  for (let i = 0; i < n; i++) {
    const x0 = i * plank;
    const x1 = Math.min(width, x0 + plank);
    ctx.fillStyle = colors[i % colors.length];
    const u0 = (x0 / width) * canvas.width;
    const u1 = (x1 / width) * canvas.width;
    ctx.fillRect(u0, 0, Math.max(1, u1 - u0), canvas.height);
    ctx.fillStyle = 'rgba(70, 42, 18, 0.28)';
    ctx.fillRect(u1 - 1.2, 0, 1.4, canvas.height);
  }
  ctx.globalCompositeOperation = 'multiply';
  for (let k = 0; k < 18; k++) {
    ctx.fillStyle = `rgba(90, 60, 30, ${0.04 + (k % 3) * 0.02})`;
    ctx.fillRect((k * 97) % canvas.width, 0, 3, canvas.height);
  }
  ctx.globalCompositeOperation = 'source-over';
  return srgb(canvas);
}

function paintMat() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#218448';
  ctx.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 1400; i++) {
    const g = 70 + ((i * 37) % 50);
    ctx.fillStyle = `rgba(20, ${g}, 40, 0.045)`;
    ctx.fillRect((i * 53) % 512, (i * 97) % 512, 3, 2);
  }
  return srgb(canvas);
}

function netTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, 64, 64);
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 7;
  ctx.strokeRect(0.5, 0.5, 63, 63);
  const tex = srgb(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(COURT.doublesWidth / COURT.mesh, (COURT.netDepth - COURT.tape) / COURT.mesh);
  return tex;
}

function stringTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 160;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, 128, 160);
  ctx.strokeStyle = 'rgba(248, 246, 240, 0.95)';
  ctx.lineWidth = 2;
  for (let x = 6; x < 128; x += 10) {
    ctx.beginPath();
    ctx.moveTo(x, 4);
    ctx.lineTo(x, 156);
    ctx.stroke();
  }
  for (let y = 6; y < 160; y += 10) {
    ctx.beginPath();
    ctx.moveTo(4, y);
    ctx.lineTo(124, y);
    ctx.stroke();
  }
  return srgb(canvas);
}

function paintDeck(width, depth) {
  const ppm = 18;
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(64, Math.round(width * ppm));
  canvas.height = Math.max(64, Math.round(depth * ppm));
  const ctx = canvas.getContext('2d');
  const panels = ['#c5d5cb', '#b7c9be', '#d0ddd4', '#aebfb4'];
  const pw = 1.6 * ppm;
  const ph = 3.2 * ppm;
  for (let y = 0, row = 0; y < canvas.height; y += ph, row++) {
    for (let x = 0, col = 0; x < canvas.width; x += pw, col++) {
      ctx.fillStyle = panels[(row + col) % panels.length];
      ctx.fillRect(x, y, pw + 1, ph + 1);
    }
  }
  ctx.strokeStyle = '#6f877c';
  ctx.lineWidth = 3;
  for (let x = 0; x <= canvas.width; x += pw) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, canvas.height);
    ctx.stroke();
  }
  for (let y = 0; y <= canvas.height; y += ph) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(canvas.width, y);
    ctx.stroke();
  }
  return srgb(canvas);
}

function textPlane(lines, w, h, opts = {}) {
  const canvas = document.createElement('canvas');
  canvas.width = opts.pw || 1024;
  canvas.height = opts.ph || 512;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = opts.bg || '#214a38';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  if (opts.border) {
    ctx.strokeStyle = opts.border;
    ctx.lineWidth = 18;
    ctx.strokeRect(24, 24, canvas.width - 48, canvas.height - 48);
  }
  ctx.fillStyle = opts.fg || '#f4f6f1';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const n = lines.length;
  lines.forEach((line, i) => {
    ctx.font = line.font;
    const y = canvas.height * ((i + 1) / (n + 1));
    ctx.fillText(line.text, canvas.width / 2, y);
  });
  const tex = srgb(canvas);
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat(0xffffff, { map: tex }));
  mesh.userData.noCast = true;
  return mesh;
}

let blobTex;
function shadowBlob(g, x, z, w, d, opacity = 0.32) {
  if (!blobTex) {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    const grd = ctx.createRadialGradient(64, 64, 8, 64, 64, 62);
    grd.addColorStop(0, 'rgba(0,0,0,0.7)');
    grd.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, 128, 128);
    blobTex = new THREE.CanvasTexture(canvas);
    blobTex.colorSpace = THREE.NoColorSpace;
  }
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(w, d),
    new THREE.MeshBasicMaterial({
      map: blobTex,
      transparent: true,
      opacity,
      depthWrite: false,
      color: 0x12100e,
    }),
  );
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set(x, 0.025, z);
  mesh.userData.keepMaterial = true;
  mesh.userData.noCast = true;
  mesh.userData.noReceive = true;
  mesh.renderOrder = 3;
  g.add(mesh);
}

function sagStrip(x0, x1, yTopFn, yBotFn, segs, z, normalZ) {
  const positions = [];
  const normals = [];
  const uvs = [];
  const indices = [];
  for (let i = 0; i <= segs; i++) {
    const t = i / segs;
    const x = x0 + (x1 - x0) * t;
    positions.push(x, yTopFn(t), z, x, yBotFn(t), z);
    normals.push(0, 0, normalZ, 0, 0, normalZ);
    uvs.push(t, 0, t, 1);
    if (i < segs) {
      const a = i * 2;
      indices.push(a, a + 1, a + 2, a + 2, a + 1, a + 3);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  return geo;
}

function addCourt(g, cx, index, lineMat, matMat) {
  const court = addBox(g, COURT.doublesWidth, 0.012, COURT.length, matMat, cx, 0.008, 0);
  court.name = `court-${index}`;
  court.userData.noCast = true;
  for (const r of floorMarkings(cx)) {
    const line = addBox(
      g,
      r.x1 - r.x0,
      0.004,
      r.z1 - r.z0,
      lineMat,
      (r.x0 + r.x1) / 2,
      0.018,
      (r.z0 + r.z1) / 2,
    );
    line.userData.noCast = true;
    line.renderOrder = 2;
  }
}

function addNet(g, cx, index, textures) {
  const net = new THREE.Group();
  net.name = `net-${index}`;
  const posts = postsFor(cx);
  const postMat = mat(C.post);
  const baseMat = mat(C.base);
  const tapeMat = mat(C.tape);
  for (const p of posts) {
    addBox(g, COURT.post, COURT.netPost, COURT.post, postMat, p.centerX, COURT.netPost / 2, 0);
    const baseW = 0.24;
    const baseX = p.inner + p.outward * (COURT.post + baseW / 2);
    addBox(g, baseW, 0.028, 0.46, baseMat, baseX, 0.014, 0);
    const crankX = p.centerX + p.outward * (COURT.post / 2 + 0.016);
    addBox(g, 0.028, 0.045, 0.02, baseMat, crankX, 0.78, 0);
  }
  const x0 = posts[0].inner;
  const x1 = posts[1].inner;
  const segs = 32;
  for (let i = 0; i < segs; i++) {
    const t0 = i / segs;
    const t1 = (i + 1) / segs;
    const tm = (t0 + t1) / 2;
    const x = x0 + (x1 - x0) * tm;
    const y = cableY(tm) - COURT.tape / 2;
    const tape = addBox(g, (x1 - x0) / segs + 0.004, COURT.tape, 0.014, tapeMat, x, y, 0);
    if (easeCloseShadows) tape.userData.noCast = true;
  }
  const meshMat = mat(C.net, {
    map: textures.net,
    alphaTest: 0.45,
    transparent: true,
    side: THREE.DoubleSide,
  });
  const yTop = (t) => cableY(t) - COURT.tape;
  const yBot = (t) => cableY(t) - COURT.netDepth;
  for (const side of [1, -1]) {
    const mesh = new THREE.Mesh(sagStrip(x0, x1, yTop, yBot, 36, side * 0.004, side), meshMat);
    mesh.userData.noReceive = true;
    if (easeCloseShadows) mesh.userData.noCast = true;
    net.add(mesh);
  }
  const hemMat = mat(C.net);
  for (let i = 0; i < segs; i++) {
    const tm = (i + 0.5) / segs;
    const x = x0 + (x1 - x0) * tm;
    const y = yBot(tm) + 0.006;
    const hem = addBox(g, (x1 - x0) / segs + 0.004, 0.012, 0.01, hemMat, x, y, 0);
    hem.userData.noReceive = true;
    if (easeCloseShadows) hem.userData.noCast = true;
  }
  const strapTop = cableY(0.5) - COURT.tape;
  const strapBottom = 0.02;
  const strapH = strapTop - strapBottom;
  addBox(net, 0.02, strapH, 0.008, tapeMat, cx, strapBottom + strapH / 2, 0);
  const anchor = addBox(net, 0.08, 0.008, 0.08, baseMat, cx, 0.02, 0);
  anchor.userData.noCast = true;
  if (easeCloseShadows) {
    net.traverse((obj) => {
      if (obj.isMesh) obj.userData.noCast = true;
    });
  }
  g.add(net);
}

function addTruss(g, z, steel) {
  const x0 = HALL.westWallX + 0.25;
  const x1 = HALL.eastWallX - 0.15;
  const y0 = HALL.clearHeight;
  const y1 = HALL.trussTop;
  const len = x1 - x0;
  const mid = (x0 + x1) / 2;
  const member = (w, h, d, x, y, zz) => {
    const mesh = addBox(g, w, h, d, steel, x, y, zz);
    if (easeCloseShadows) mesh.userData.noCast = true;
    return mesh;
  };
  member(len, 0.07, 0.07, mid, y0, z);
  member(len, 0.07, 0.07, mid, y1, z);
  const n = 8;
  for (let i = 0; i <= n; i++) {
    const x = x0 + (len * i) / n;
    member(0.05, y1 - y0, 0.05, x, (y0 + y1) / 2, z);
    if (i < n) {
      const xB = x0 + (len * (i + 1)) / n;
      const dx = xB - x;
      const dy = y1 - y0;
      const up = i % 2 === 0;
      const diag = member(Math.hypot(dx, dy), 0.032, 0.032, (x + xB) / 2, (y0 + y1) / 2, z);
      diag.rotation.z = Math.atan2(up ? dy : -dy, dx);
    }
  }
}

function addBatten(g, x, z, housingMat, diffuserMat, steel) {
  const y = HALL.battenY;
  const len = HALL.battenLength;
  addBox(g, 0.16, 0.07, len, housingMat, x, y, z);
  const diffuser = addBox(g, 0.1, 0.018, len - 0.08, diffuserMat, x, y - 0.042, z);
  diffuser.userData.noCast = true;
  const stemH = HALL.clearHeight - (y + 0.04);
  addCyl(g, 0.01, 0.01, stemH, steel, x, y + 0.04 + stemH / 2, z, 8);
}

function makeRacket(frameColor, gripColor, strings) {
  const m = racketMetrics();
  const g = new THREE.Group();
  const frame = mat(frameColor);
  const grip = mat(gripColor);
  const stringMat = mat(0xf7f4ee, {
    map: strings,
    transparent: true,
    alphaTest: 0.25,
    side: THREE.DoubleSide,
  });
  addBox(g, 0.028, RACKET.handle, 0.02, grip, 0, RACKET.handle / 2, 0);
  addCyl(g, 0.0042, 0.0055, RACKET.shaft, frame, 0, RACKET.handle + RACKET.shaft / 2, 0, 8);
  const torus = new THREE.Mesh(new THREE.TorusGeometry(m.radius, m.tube, 8, 28), frame);
  torus.scale.set(m.scaleX, m.scaleY, 1);
  torus.position.y = m.headCenter;
  g.add(torus);
  const bed = new THREE.Mesh(new THREE.PlaneGeometry(0.155, 0.19), stringMat);
  bed.position.y = m.headCenter;
  bed.userData.noCast = true;
  g.add(bed);
  addBox(g, 0.016, 0.045, 0.012, frame, -0.028, RACKET.handle + RACKET.shaft - 0.01, 0);
  addBox(g, 0.016, 0.045, 0.012, frame, 0.028, RACKET.handle + RACKET.shaft - 0.01, 0);
  return g;
}

function hangRacket(frame, grip, strings) {
  const inner = makeRacket(frame, grip, strings);
  inner.rotation.z = Math.PI;
  const face = new THREE.Group();
  face.add(inner);
  face.rotation.y = -Math.PI / 2;
  return face;
}

function makeShuttle() {
  const g = new THREE.Group();
  const cork = new THREE.Mesh(new THREE.SphereGeometry(0.013, 10, 8), mat(C.cork));
  cork.scale.set(1, 0.8, 1);
  cork.position.y = 0.01;
  const skirt = new THREE.Mesh(
    new THREE.ConeGeometry(0.032, 0.064, 10, 1, true),
    mat(C.skirtFeather, { side: THREE.DoubleSide }),
  );
  skirt.position.y = 0.048;
  g.add(cork, skirt);
  return g;
}

function makeTube(open) {
  const g = new THREE.Group();
  const body = addCyl(g, 0.034, 0.034, 0.18, mat(C.tube), 0, 0.09, 0, 16);
  body.userData.noReceive = true;
  addCyl(g, 0.035, 0.035, 0.012, mat(C.tubeBand), 0, 0.1, 0, 16);
  if (!open) addCyl(g, 0.034, 0.034, 0.012, mat(C.tube), 0, 0.176, 0, 16);
  return g;
}

function addGear(g, strings) {
  const railY = 1.52;
  const rail = addBox(g, 0.06, 0.04, 1.16, mat('#6b4a32'), -11.36, railY, 0.45);
  rail.name = 'racket-rail';
  const colors = [
    [C.navy, C.grip],
    [C.frameLight, C.gripDark],
    [C.navy, C.grip],
    [C.frameLight, '#243f6b'],
  ];
  colors.forEach((pair, i) => {
    const z = 0.45 - 0.42 + i * 0.28;
    addCyl(g, 0.008, 0.008, 0.1, mat(C.steel), -11.33, railY - 0.02, z, 8);
    const racket = hangRacket(pair[0], pair[1], strings);
    racket.position.set(-11.3, railY - 0.02, z);
    racket.name = `racket-${i + 1}`;
    g.add(racket);
  });

  const lay = makeRacket(C.frameLight, C.gripDark, strings);
  lay.rotation.x = -Math.PI / 2;
  lay.position.set(-11.12, 0.475, 5.55);
  lay.name = 'racket-bench';
  g.add(lay);

  const shelf = [
    { y: 0.539, lx: [-0.28, -0.1, 0.08, 0.26], open: 1 },
    { y: 1.511, lx: [-0.22, 0.0, 0.22], open: 0 },
  ];
  for (const row of shelf) {
    row.lx.forEach((lx, i) => {
      const tube = makeTube(i === row.open);
      tube.position.set(-11.08, row.y, -1.05 + lx);
      g.add(tube);
      if (i === row.open) {
        for (let s = 0; s < 3; s++) {
          const shuttle = makeShuttle();
          shuttle.position.set(-11.02 + (s - 1) * 0.014, row.y + 0.16, -1.05 + lx);
          shuttle.scale.setScalar(0.72);
          g.add(shuttle);
        }
      }
    });
  }
  const grips = ['#8e2d32', '#1d4e8f', '#e6e2d4', '#1c1c1c', '#2f6a3a', '#c47b2b'];
  grips.forEach((color, i) => {
    const roll = addCyl(g, 0.022, 0.022, 0.11, mat(color), 0, 0, 0, 10);
    roll.rotation.x = Math.PI / 2;
    roll.position.set(-10.98, 1.025 + 0.024, -1.05 - 0.28 + i * 0.11);
  });
  const store = textPlane(
    [
      { text: 'SHUTTLES', font: '700 150px Georgia, serif' },
      { text: 'grips on the middle shelf', font: '58px Georgia, serif' },
    ],
    0.78,
    0.26,
    { bg: '#1e3d30', border: '#e7e4dc', fg: '#f4f6f1', pw: 1024, ph: 360 },
  );
  store.position.set(-11.0, 2.16, -1.05);
  store.rotation.y = Math.PI / 2;
  store.name = 'shuttle-sign';
  g.add(store);

  const loose = makeShuttle();
  loose.rotation.x = Math.PI / 2;
  loose.position.set(-4.7, 0.03, 2.15);
  loose.name = 'shuttle-court';
  g.add(loose);

  const deskShuttle = makeShuttle();
  deskShuttle.rotation.z = Math.PI / 2;
  deskShuttle.rotation.y = 0.4;
  deskShuttle.position.set(-11.12, 0.72, 3.92);
  g.add(deskShuttle);
}

function addDoor(g) {
  const hinge = new THREE.Group();
  hinge.name = 'door';
  hinge.position.set(HALL.westWallX, 0, 6.55);
  hinge.rotation.y = 0.72;
  const leaf = addBox(hinge, 0.04, 2.06, 0.96, mat(C.door), 0.02, 1.07, 0.48);
  leaf.name = 'door-leaf';
  addBox(hinge, 0.012, 0.28, 0.016, mat(C.handle), 0.046, 1.05, 0.84);
  g.add(hinge);
}

function addVestibule(g, thick) {
  const x1 = HALL.westWallX - thick;
  const x0 = x1 - 1.7;
  const z0 = 6.4;
  const z1 = 7.7;
  const y1 = 2.85;
  const wall = mat(C.lower);
  const cap = mat(C.upper);
  addBox(g, x1 - x0, 0.08, z1 - z0, mat(C.rubber), (x0 + x1) / 2, 0.04, (z0 + z1) / 2).userData.noReceive = true;
  const parts = [
    addBox(g, 0.12, y1, z1 - z0, wall, x0 + 0.06, y1 / 2, (z0 + z1) / 2),
    addBox(g, x1 - x0, y1, 0.1, wall, (x0 + x1) / 2, y1 / 2, z0 + 0.05),
    addBox(g, x1 - x0, y1, 0.1, wall, (x0 + x1) / 2, y1 / 2, z1 - 0.05),
    addBox(g, x1 - x0, 0.1, z1 - z0, cap, (x0 + x1) / 2, y1 - 0.05, (z0 + z1) / 2),
  ];
  parts.forEach((part) => {
    part.userData.noReceive = true;
    part.userData.noCast = true;
  });
}

function addEastWall(g) {
  const x = HALL.eastWallX - 0.045;
  const padMat = mat(C.pad);
  const edgeMat = mat(C.padEdge);
  [-5.1, -1.7, 1.7, 5.1].forEach((z) => {
    const edge = addBox(g, 0.02, 1.78, 1.04, edgeMat, x + 0.02, 1.12, z);
    const pad = addBox(g, 0.04, 1.58, 0.86, padMat, x - 0.01, 1.12, z);
    edge.userData.noCast = true;
    edge.userData.noReceive = true;
    pad.userData.noCast = true;
    pad.userData.noReceive = true;
  });
  const notice = textPlane(
    [
      { text: 'COURT 2', font: '700 150px Georgia, serif' },
      { text: 'keep the run-off clear', font: '58px Georgia, serif' },
    ],
    0.78,
    0.36,
    { bg: '#1e3d30', border: '#e7e4dc', fg: '#f4f6f1', pw: 1024, ph: 480 },
  );
  notice.position.set(HALL.eastWallX - 0.02, 1.55, 0);
  notice.rotation.y = Math.PI / 2;
  notice.material.side = THREE.DoubleSide;
  notice.name = 'east-notice';
  g.add(notice);
}

function makeShell(layout) {
  const g = new THREE.Group();
  g.name = 'shell';
  const H = HALL;
  const width = H.eastWallX - H.westWallX;
  const depth = H.southWallZ - H.northWallZ;
  const cx = (H.eastWallX + H.westWallX) / 2;
  const cz = (H.southWallZ + H.northWallZ) / 2;

  const hallTimber = paintPlanks(width, depth, ['#c6a36e', '#d2b07a', '#bb955f', '#c9a874', '#b08958', '#d0ae76']);
  const galleryTimber = paintPlanks(H.galleryWidth, depth, ['#b7a48c', '#c2b09a', '#ad9a84', '#c8b59c']);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(width, depth), mat(0xffffff, { map: hallTimber }));
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(cx, 0.002, cz);
  floor.userData.noCast = true;
  floor.name = 'hall-floor';
  g.add(floor);

  const gallery = new THREE.Mesh(
    new THREE.PlaneGeometry(H.galleryWidth, depth),
    mat(0xffffff, { map: galleryTimber }),
  );
  gallery.rotation.x = -Math.PI / 2;
  gallery.position.set((H.westWallX + H.galleryInnerX) / 2, 0.005, cz);
  gallery.userData.noCast = true;
  gallery.name = 'gallery-floor';
  g.add(gallery);

  const rubber = addBox(g, 0.95, 0.008, 1.3, mat(C.rubber), -10.9, 0.009, 6.95);
  rubber.userData.noCast = true;
  rubber.name = 'entry-mat';

  const lineMat = mat(C.line, {
    emissive: 0xd5ddd4,
    emissiveIntensity: 0.16,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -2,
  });
  const matMat = mat(C.mat, { map: paintMat() });
  HALL.centersX.forEach((x, i) => addCourt(g, x, i + 1, lineMat, matMat));

  const netTex = netTexture();
  HALL.centersX.forEach((x, i) => addNet(g, x, i + 1, { net: netTex }));

  const strings = stringTexture();
  addGear(g, strings);

  const lower = mat(C.lower);
  const upper = mat(C.upper);
  const skirt = mat(C.skirt);
  const dado = mat(C.dado);
  const thick = 0.18;

  function bandedWall(x0, x1, z0, z1) {
    const w = Math.abs(x1 - x0);
    const d = Math.abs(z1 - z0);
    const mx = (x0 + x1) / 2;
    const mz = (z0 + z1) / 2;
    const parts = [
      addBox(g, w, 0.08, d, skirt, mx, 0.04, mz),
      addBox(g, w, H.dadoY - 0.08, d, lower, mx, 0.08 + (H.dadoY - 0.08) / 2, mz),
      addBox(g, w, 0.025, d, dado, mx, H.dadoY + 0.012, mz),
      addBox(g, w, H.wallTop - H.dadoY - 0.02, d, upper, mx, H.dadoY + 0.02 + (H.wallTop - H.dadoY - 0.02) / 2, mz),
    ];
    parts.forEach((part) => {
      part.userData.noReceive = true;
    });
  }

  bandedWall(H.eastWallX, H.eastWallX + thick, H.northWallZ, H.southWallZ);
  bandedWall(H.westWallX - thick, H.eastWallX + thick, H.northWallZ - thick, H.northWallZ);
  bandedWall(H.westWallX - thick, H.eastWallX + thick, H.southWallZ, H.southWallZ + thick);
  bandedWall(H.westWallX - thick, H.westWallX, H.northWallZ, 6.55);
  bandedWall(H.westWallX - thick, H.westWallX, 7.51, H.southWallZ);
  const header = [
    addBox(g, thick, 0.2, 0.96, lower, H.westWallX - thick / 2, 2.25, 7.03),
    addBox(g, thick, H.wallTop - 2.35, 0.96, upper, H.westWallX - thick / 2, 2.35 + (H.wallTop - 2.35) / 2, 7.03),
  ];
  header.forEach((part) => {
    part.userData.noReceive = true;
  });

  const lid = addBox(
    g,
    width + 0.36,
    0.18,
    depth + 0.36,
    mat(0xffffff, { map: paintDeck(width, depth) }),
    cx,
    H.ceilingY + 0.09,
    cz,
  );
  lid.userData.noCast = true;
  lid.userData.noReceive = true;
  lid.name = 'ceiling';

  const steel = mat(C.steel);
  for (const z of H.trussZs) addTruss(g, z, steel);
  for (const x of [-8.1, -2.2, 2.6, 7.4]) {
    const purlin = addBox(g, 0.05, 0.05, depth - 0.8, steel, x, H.trussTop, cz);
    if (easeCloseShadows) purlin.userData.noCast = true;
  }

  const housingMat = mat(C.housing);
  const diffuserMat = mat(C.diffuser, { emissive: C.diffuserEmissive, emissiveIntensity: 1.55 });
  for (const x of lightLanes()) {
    for (const z of H.battenZs) addBatten(g, x, z, housingMat, diffuserMat, steel);
  }

  const soffitW = H.galleryInnerX - H.westWallX;
  const soffit = addBox(
    g,
    soffitW,
    0.1,
    depth,
    mat(0xffffff, { map: galleryTimber }),
    (H.westWallX + H.galleryInnerX) / 2,
    H.soffitY + 0.05,
    cz,
  );
  soffit.name = 'soffit';
  addBox(g, 0.08, 0.22, depth, mat(C.fascia), H.galleryInnerX - 0.04, H.soffitY - 0.04, cz);
  const cove = addBox(
    g,
    0.28,
    0.025,
    depth - 0.4,
    mat(C.cove, { emissive: C.coveEmissive, emissiveIntensity: 0.75 }),
    H.galleryInnerX - 0.28,
    H.soffitY - 0.02,
    cz,
  );
  cove.userData.noCast = true;
  cove.name = 'gallery-cove';

  for (const z of [-6.8, -4.6, -2.2, 1.6, 4.8]) {
    addBox(g, 0.08, H.soffitY, 0.08, mat(C.column), -9.16, H.soffitY / 2, z);
    addBox(g, 0.1, 0.04, 0.1, steel, -9.16, 0.02, z);
  }

  addDoor(g);
  addVestibule(g, thick);
  addEastWall(g);

  const sign = textPlane(
    [
      { text: 'SHUTTLE HALL', font: '600 92px Georgia, serif' },
      { text: 'non-marking court shoes', font: '44px Georgia, serif' },
    ],
    0.92,
    0.42,
    { bg: '#1e3d30', border: '#d5ddd4', fg: '#f4f6f1', pw: 1024, ph: 480 },
  );
  sign.position.set(H.westWallX + 0.02, 1.62, 8.15);
  sign.rotation.y = Math.PI / 2;
  sign.name = 'entry-sign';
  g.add(sign);

  HALL.centersX.forEach((x, i) => {
    const numeral = textPlane(
      [{ text: String(i + 1), font: '600 420px Georgia, serif' }],
      1.15,
      1.35,
      { bg: '#315e49', fg: '#f7f8f4', pw: 512, ph: 640 },
    );
    numeral.position.set(x, 4.15, H.northWallZ + 0.02);
    numeral.name = `number-${i + 1}`;
    g.add(numeral);

    const label = textPlane(
      [{ text: `COURT ${i + 1}`, font: '600 150px Georgia, serif' }],
      1.35,
      0.42,
      { bg: '#1f7a45', border: '#f4f6f1', fg: '#f7f8f4', pw: 1024, ph: 320 },
    );
    label.rotation.x = -Math.PI / 2;
    label.position.set(x, 0.022, 7.55);
    label.name = `floor-label-${i + 1}`;
    g.add(label);
  });

  for (const inst of layout.instances) {
    if (inst.position[1] > 1.2) continue;
    const fp = inst.footprint || [0.4, 0.4];
    const span = Math.max(fp[0], fp[1]);
    shadowBlob(g, inst.position[0], inst.position[2], Math.min(fp[0], 0.7) + 0.15, Math.min(span, 1.35) * 0.85);
  }
  shadowBlob(g, -11.34, 0.45, 0.35, 1.2, 0.22);

  return g;
}

function tuneAsset(kind, prepared) {
  if (kind === 'flowerpot') {
    const leafMat = new THREE.MeshStandardMaterial({ color: 0x2f6a3a, roughness: 1 });
    const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.075, 0.2, 7), leafMat);
    leaf.position.y = 0.28;
    const leaf2 = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.14, 6), leafMat);
    leaf2.position.set(0.03, 0.36, 0.01);
    prepared.add(leaf, leaf2);
  }
  if (kind === 'pendant_lamp') {
    prepared.traverse((obj) => {
      if (obj.isMesh && obj.name === 'bulb') {
        obj.material = new THREE.MeshStandardMaterial({
          color: 0xfff1c9,
          emissive: 0xffe2a8,
          emissiveIntensity: 1.4,
          roughness: 0.4,
        });
      }
    });
  }
  if (kind === 'library_lamp') {
    prepared.traverse((obj) => {
      if (obj.isMesh && obj.name === 'light_tube') {
        obj.material = new THREE.MeshStandardMaterial({
          color: 0xfff6e4,
          emissive: 0xffe6b8,
          emissiveIntensity: 0.9,
          roughness: 0.45,
        });
      }
    });
  }
  if (kind === 'gear_case') {
    prepared.traverse((obj) => {
      if (!obj.isMesh) return;
      const n = obj.name || '';
      let color = 0x3d4a38;
      if (n.includes('back')) color = 0x241c16;
      else if (n.includes('shelf') || n.includes('slab')) color = 0x6a4630;
      obj.material = new THREE.MeshStandardMaterial({ color, roughness: 0.8 });
    });
  }
  if (kind === 'chalkboard') {
    prepared.traverse((obj) => {
      const n = obj.name || '';
      if (n === 'end_support' || n === 'far_support' || n.startsWith('foot')) obj.visible = false;
      if (obj.isMesh && obj.visible && n !== 'panel') {
        obj.material = new THREE.MeshStandardMaterial({ color: 0x243028, roughness: 1 });
      }
    });
    const panel = prepared.getObjectByName('panel');
    if (!panel) return;
    const box = new THREE.Box3().setFromObject(panel);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    panel.visible = false;
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 640;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#14241c';
    ctx.fillRect(0, 0, 1024, 640);
    ctx.strokeStyle = '#d9d3c4';
    ctx.lineWidth = 8;
    ctx.strokeRect(28, 28, 968, 584);
    ctx.fillStyle = '#e7e2d4';
    ctx.font = '700 54px Georgia, serif';
    ctx.fillText('CLUB BOARD', 70, 110);
    ctx.font = '600 64px Georgia, serif';
    ctx.fillText('COURT 1', 70, 230);
    ctx.fillText('COURT 2', 560, 230);
    ctx.font = '700 120px Georgia, serif';
    ctx.fillText('21', 90, 390);
    ctx.fillText('18', 580, 390);
    ctx.font = '42px Georgia, serif';
    ctx.fillStyle = '#c9d2c4';
    ctx.fillText('19:00  doubles', 70, 500);
    ctx.fillText('20:00  club', 560, 500);
    const board = new THREE.Mesh(
      new THREE.PlaneGeometry(Math.max(size.z, size.x), Math.max(size.y, 0.4)),
      new THREE.MeshStandardMaterial({ map: srgb(canvas), roughness: 1, side: THREE.DoubleSide }),
    );
    board.position.copy(center);
    board.rotation.y = Math.PI / 2;
    board.name = 'draw-sheet';
    prepared.add(board);
    prepared.updateWorldMatrix(true, true);
    const stand = new THREE.Box3();
    prepared.traverse((obj) => {
      if (obj.isMesh && obj.visible && obj !== board) stand.expandByObject(obj);
    });
    if (stand.min.y > 0.04) {
      const plinth = new THREE.Mesh(
        new THREE.BoxGeometry(0.08, stand.min.y, Math.max(0.4, stand.max.z - stand.min.z)),
        new THREE.MeshStandardMaterial({ color: 0x243028, roughness: 1 }),
      );
      plinth.position.set((stand.min.x + stand.max.x) / 2, stand.min.y / 2, (stand.min.z + stand.max.z) / 2);
      plinth.name = 'board-plinth';
      prepared.add(plinth);
    }
  }
}

boot({
  makeShell,
  tuneAsset,
  readyText: 'two courts · drag orbit · T toon · U unlit',
});
