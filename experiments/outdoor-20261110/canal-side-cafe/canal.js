import * as THREE from 'three';
import { boot, toon, addBox, addCyl } from './scene_lib.js';

const BRICK_W = 1.76;
const BRICK_H = 0.832;

function canvasTex(draw, w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d'), w, h);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 8;
  tex.needsUpdate = true;
  return tex;
}

function brickTexture(palette, mortar) {
  return canvasTex((g, w, h) => {
    g.fillStyle = mortar;
    g.fillRect(0, 0, w, h);
    const bw = 64;
    const bh = 20;
    const gap = 3;
    let row = 0;
    for (let y = 0; y < h + bh; y += bh) {
      const off = (row % 2) * (bw / 2);
      let col = 0;
      for (let x = -bw; x < w + bw; x += bw) {
        const n = Math.abs((x * 3 + row * 17 + col * 5) % palette.length);
        g.fillStyle = palette[n];
        g.fillRect(x + off + gap, y + gap, bw - gap * 2, bh - gap * 2);
        if (((row + col) % 7) === 0) {
          g.fillStyle = 'rgba(60, 28, 22, 0.22)';
          g.fillRect(x + off + 14, y + 7, 10, 3);
        }
        col += 1;
      }
      row += 1;
    }
  }, 512, 256);
}

function waterTexture() {
  return canvasTex((g, w, h) => {
    g.fillStyle = '#4e6154';
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 700; i++) {
      const x = (i * 97) % w;
      const y = (i * 53) % h;
      const n = (i * 17) % 10;
      g.fillStyle = `rgba(${70 + n}, ${90 + n}, ${72}, 0.16)`;
      g.fillRect(x, y, 26, 1);
    }
  }, 512, 256);
}

function repeatMat(tex, rx, ry, tint) {
  const map = tex.clone();
  map.wrapS = map.wrapT = THREE.RepeatWrapping;
  map.repeat.set(rx, ry);
  map.colorSpace = THREE.SRGBColorSpace;
  map.needsUpdate = true;
  return toon(tint, { map });
}

function brickSkin(g, w, h, tex, x, y, z, rotY = 0) {
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(w, h),
    repeatMat(tex, w / BRICK_W, h / BRICK_H, '#f3e7da'),
  );
  mesh.position.set(x, y, z);
  mesh.rotation.y = rotY;
  mesh.receiveShadow = true;
  mesh.castShadow = true;
  g.add(mesh);
  return mesh;
}

function pavingSkin(g, w, d, tex, x, y, z) {
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(w, d),
    repeatMat(tex, w / 1.32, d / 0.66, '#f6ecdf'),
  );
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set(x, y, z);
  mesh.receiveShadow = true;
  mesh.userData.castShadow = false;
  g.add(mesh);
  return mesh;
}

function skyDome() {
  const geo = new THREE.SphereGeometry(46, 24, 14);
  const pos = geo.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  const horizon = new THREE.Color('#f6d7b0');
  const zenith = new THREE.Color('#d5e1ef');
  const col = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i) / 46;
    const t = THREE.MathUtils.clamp((y + 0.05) / 0.85, 0, 1);
    col.copy(horizon).lerp(zenith, Math.pow(t, 0.8));
    colors[i * 3] = col.r;
    colors[i * 3 + 1] = col.g;
    colors[i * 3 + 2] = col.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const mesh = new THREE.Mesh(
    geo,
    new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false }),
  );
  mesh.userData.shading = 'basic';
  return mesh;
}

function makeWallBlock(g, tex, mortar, x0, x1, y0, y1, zFace, depth) {
  const w = x1 - x0;
  const h = y1 - y0;
  const cx = (x0 + x1) / 2;
  const cy = (y0 + y1) / 2;
  addBox(g, w, h, depth, toon(mortar), cx, cy, zFace - depth / 2);
  brickSkin(g, w, h, tex, cx, cy, zFace + 0.012);
}

function signTexture() {
  return canvasTex((g, w, h) => {
    g.fillStyle = '#f4efe4';
    g.fillRect(0, 0, w, h);
    g.strokeStyle = '#6e2430';
    g.lineWidth = 10;
    g.strokeRect(8, 8, w - 16, h - 16);
    g.fillStyle = '#6e2430';
    g.font = '700 92px Georgia, serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText('Café', w / 2, h / 2 + 6);
  }, 512, 220);
}

function waterMesh(layout, tex) {
  const s = layout.site.water;
  const w = s.x1 - s.x0;
  const d = s.z1 - s.z0;
  const geo = new THREE.PlaneGeometry(w, d, 28, 18);
  geo.rotateX(-Math.PI / 2);
  const mesh = new THREE.Mesh(geo, repeatMat(tex, 3.2, 2.2, '#ffffff'));
  mesh.position.set((s.x0 + s.x1) / 2, layout.site.waterY, (s.z0 + s.z1) / 2);
  mesh.receiveShadow = true;
  mesh.userData.castShadow = false;
  mesh.name = 'water';
  return mesh;
}

function quay(g, layout, wallTex, paveTex) {
  const site = layout.site;
  const q = site.quay;
  const mortar = layout.shell.mortarColor;
  const stone = layout.shell.stoneColor;
  const pw = q.x1 - q.x0;
  const pd = q.z1 - q.z0;
  addBox(g, pw, 0.16, pd, toon('#6d5142'), (q.x0 + q.x1) / 2, -0.08, (q.z0 + q.z1) / 2);
  pavingSkin(g, pw, pd, paveTex, (q.x0 + q.x1) / 2, 0.012, (q.z0 + q.z1) / 2);

  const faceZ = 0.1;
  addBox(g, pw + 0.4, 1.2, 0.34, toon(mortar), (q.x0 + q.x1) / 2, -0.48, faceZ);
  brickSkin(g, pw + 0.2, 0.62, wallTex, (q.x0 + q.x1) / 2, -0.18, faceZ + 0.2);
  const wet = brickSkin(g, pw + 0.2, 0.22, wallTex, (q.x0 + q.x1) / 2, site.waterY + 0.08, faceZ + 0.205);
  wet.material.color.set('#6a5348');
  const moss = addBox(g, pw + 0.2, 0.07, 0.03, toon('#4d5c40'), (q.x0 + q.x1) / 2, site.waterY + 0.02, faceZ + 0.22);
  moss.userData.castShadow = false;
  addBox(g, pw, 0.1, 0.34, toon(stone), (q.x0 + q.x1) / 2, site.copingTop - 0.05, 0.02);

  const steps = layout.built.waterSteps;
  const sw = steps.x1 - steps.x0;
  const sx = (steps.x0 + steps.x1) / 2;
  steps.treads.forEach((t) => {
    const d = t.z1 - t.z0;
    addBox(g, sw, 0.1, d, toon(stone), sx, t.y - 0.05, (t.z0 + t.z1) / 2);
  });
  addBox(g, 0.12, 0.48, 1.05, toon(mortar), steps.x0, -0.22, 0.55);
  addBox(g, 0.12, 0.48, 1.05, toon(mortar), steps.x1, -0.22, 0.55);
  brickSkin(g, 0.7, 1.05, wallTex, steps.x0 - 0.02, -0.15, 0.55, -Math.PI / 2);
  brickSkin(g, 0.7, 1.05, wallTex, steps.x1 + 0.02, -0.15, 0.55, Math.PI / 2);
}

function nearBank(g, layout) {
  const stone = toon(layout.shell.stoneColor);
  addBox(g, 16.5, 0.28, 1.35, stone, -0.4, -0.05, 7.55);
  addBox(g, 16.2, 0.08, 0.22, toon('#b7b0a2'), -0.4, 0.16, 6.95);
  addCyl(g, 0.07, 0.08, 0.62, toon(layout.shell.ironColor), 2.4, 0.32, 7.15, 10);
}

function facade(g, layout, tex) {
  const z = layout.site.wallFaceZ;
  const depth = 0.46;
  const mortar = layout.shell.mortarColor;
  const stone = layout.shell.stoneColor;
  const blocks = [
    [-7.35, -5.15, 0, 2.22],
    [-3.7, -0.5, 0, 2.22],
    [-0.5, 0.9, 0, 0.7],
    [0.9, 2.3, 0, 2.22],
    [3.6, 5.45, 0, 2.22],
  ];
  blocks.forEach(([x0, x1, y0, y1]) => makeWallBlock(g, tex, mortar, x0, x1, y0, y1, z, depth));

  const openings = [
    { id: 'door', x: -4.425, w: 1.45, crown: 2.08, sill: 0 },
    { id: 'window', x: 0.2, w: 1.15, crown: 1.92, sill: 0.7 },
    { id: 'cellar', x: 2.95, w: 1.25, crown: 2.02, sill: 0 },
  ];
  openings.forEach((op) => {
    const r = op.w / 2;
    const spring = op.crown - r;
    // One torus ring. Separate voussoir boxes read as shattered bricks up close.
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(r, 0.075, 6, 18, Math.PI),
      toon('#8d4d3c'),
    );
    ring.position.set(op.x, spring, z + 0.05);
    ring.castShadow = true;
    ring.receiveShadow = true;
    g.add(ring);
    const head = 2.2 - op.crown;
    if (head > 0.04) {
      addBox(g, op.w + 0.2, head, depth, toon('#7a4034'), op.x, op.crown + head / 2, z - depth / 2);
      brickSkin(g, op.w + 0.2, head, tex, op.x, op.crown + head / 2, z + 0.012);
    }
    addBox(g, op.w + 0.16, 0.07, 0.1, toon(stone), op.x, spring, z + 0.06);
    if (op.sill > 0) addBox(g, op.w + 0.28, 0.08, 0.12, toon(stone), op.x, op.sill, z + 0.04);
  });

  addBox(g, 12.9, 0.16, 0.58, toon(stone), -0.95, 2.3, z - 0.08);
  addBox(g, 12.85, 0.08, 0.18, toon('#b7aa96'), -0.95, 2.4, z + 0.02);

  // Café door left open against the west jamb. Interior sits behind the opening.
  addBox(g, 0.08, 2.0, 0.9, toon(layout.shell.doorColor), -5.05, 1.0, z - 0.55);
  addBox(g, 1.45, 0.82, 0.5, toon('#4a342c'), -4.4, 0.41, -6.38);
  addBox(g, 1.7, 0.1, 0.62, toon('#5c4030'), -4.4, 0.86, -6.35);
  addBox(g, 1.85, 2.25, 0.12, toon('#3a2c28'), -4.4, 1.12, -6.95);
  addBox(g, 0.1, 2.2, 1.15, toon('#4a382f'), -5.2, 1.1, -6.35);
  addBox(g, 0.1, 2.2, 1.15, toon('#4a382f'), -3.6, 1.1, -6.35);
  addBox(g, 1.7, 0.08, 1.2, toon('#5a4638'), -4.4, 0.04, -6.4);

  // Closed cellar door, paneled, with a dark fanlight behind the arch.
  const dx = 2.95;
  addBox(g, 1.02, 1.35, 0.08, toon(layout.shell.doorColor), dx, 0.7, z + 0.03);
  addBox(g, 0.38, 0.48, 0.03, toon('#8a4038'), dx - 0.24, 0.48, z + 0.07);
  addBox(g, 0.38, 0.48, 0.03, toon('#8a4038'), dx + 0.24, 0.48, z + 0.07);
  addBox(g, 0.38, 0.42, 0.03, toon('#8a4038'), dx - 0.24, 1.12, z + 0.07);
  addBox(g, 0.38, 0.42, 0.03, toon('#8a4038'), dx + 0.24, 1.12, z + 0.07);
  addCyl(g, 0.04, 0.04, 0.05, toon('#d9c27a'), dx + 0.38, 0.95, z + 0.1, 8);

  // Sash window.
  const wx = 0.2;
  addBox(g, 1.02, 0.92, 0.06, toon('#243038'), wx, 1.2, z - 0.02);
  addBox(g, 1.12, 0.06, 0.08, toon('#f3efe6'), wx, 1.68, z + 0.04);
  addBox(g, 1.12, 0.06, 0.08, toon('#f3efe6'), wx, 0.74, z + 0.04);
  addBox(g, 0.06, 0.98, 0.08, toon('#f3efe6'), wx - 0.53, 1.2, z + 0.04);
  addBox(g, 0.06, 0.98, 0.08, toon('#f3efe6'), wx + 0.53, 1.2, z + 0.04);
  addBox(g, 0.045, 0.9, 0.05, toon('#f3efe6'), wx, 1.2, z + 0.05);
  addBox(g, 0.9, 0.045, 0.05, toon('#f3efe6'), wx, 1.2, z + 0.05);

  const sign = new THREE.Mesh(new THREE.PlaneGeometry(0.95, 0.4), toon('#ffffff', { map: signTexture() }));
  sign.position.set(-2.15, 1.45, z + 0.03);
  sign.castShadow = true;
  g.add(sign);

  streetLevel(g, layout, tex);
}

function streetLevel(g, layout, tex) {
  const streetY = layout.site.streetY;
  const stone = toon(layout.shell.stoneColor);
  const iron = toon(layout.shell.ironColor);
  addBox(g, 12.9, 0.12, 1.7, toon('#6a5346'), -0.95, streetY - 0.06, -6.55);
  pavingSkin(g, 12.6, 1.15, tex, -0.95, streetY + 0.005, -6.45);

  // Landing that meets the head of the stair.
  addBox(g, 1.5, 0.12, 0.7, stone, -6.68, streetY - 0.06, -5.95);

  // Railing along the street edge, interrupted for the stair.
  for (let x = -5.7; x <= 4.9; x += 1.05) {
    addCyl(g, 0.035, 0.035, 0.92, iron, x, streetY + 0.46, -5.8, 8);
  }
  addBox(g, 10.7, 0.05, 0.05, iron, -0.4, streetY + 0.9, -5.8);
  addBox(g, 10.7, 0.035, 0.035, iron, -0.4, streetY + 0.48, -5.8);

  // Left gable behind the bikes, right upper floor as the façade edge.
  makeWallBlock(g, tex, layout.shell.mortarColor, -7.3, -3.5, streetY, 4.35, -6.95, 0.4);
  addBox(g, 3.8, 0.7, 0.42, toon('#7a4034'), -5.4, 4.7, -6.95);
  brickSkin(g, 3.6, 0.55, tex, -5.4, 4.65, -6.73);
  addBox(g, 0.5, 0.7, 0.4, toon('#5c4038'), -4.15, 5.15, -6.9);

  makeWallBlock(g, tex, layout.shell.mortarColor, 1.55, 5.45, streetY, 5.05, -6.7, 0.42);
  addBox(g, 3.95, 0.12, 0.5, toon(layout.shell.stoneColor), 3.5, 5.1, -6.7);
  const windows = [2.35, 3.55, 4.7];
  windows.forEach((x) => {
    addBox(g, 0.62, 1.15, 0.06, toon('#243038'), x, 3.55, -6.46);
    addBox(g, 0.72, 0.06, 0.08, toon('#f4f0e8'), x, 4.16, -6.44);
    addBox(g, 0.72, 0.06, 0.08, toon('#f4f0e8'), x, 2.95, -6.44);
    addBox(g, 0.06, 1.25, 0.08, toon('#f4f0e8'), x - 0.34, 3.55, -6.44);
    addBox(g, 0.06, 1.25, 0.08, toon('#f4f0e8'), x + 0.34, 3.55, -6.44);
    addBox(g, 0.04, 1.1, 0.04, toon('#f4f0e8'), x, 3.55, -6.42);
  });
}

function stairs(g, layout) {
  const st = layout.built.stairs;
  const stone = toon(layout.shell.stoneColor);
  const iron = toon('#6e2430');
  const rail = toon('#f3efe6');
  for (let i = 0; i < st.steps; i++) {
    const zc = st.bottomZ - (i + 0.5) * st.run;
    addBox(g, st.width, st.rise * 0.98, st.run * 0.96, stone, st.x, (i + 0.5) * st.rise, zc);
  }
  const xL = st.x - st.width / 2;
  const xR = st.x + st.width / 2;
  [xL, xR].forEach((x) => {
    addBox(g, 0.06, 0.08, st.steps * st.run, iron, x, 0.18, st.bottomZ - st.steps * st.run * 0.5);
    for (let i = 0; i <= st.steps; i += 2) {
      const z = st.bottomZ - i * st.run;
      const y = i * st.rise;
      addCyl(g, 0.03, 0.03, 0.78, iron, x, y + 0.39, z, 8);
    }
    const z0 = st.bottomZ;
    const z1 = st.bottomZ - st.steps * st.run;
    const y0 = 0.72;
    const y1 = st.steps * st.rise + 0.72;
    const railLen = Math.hypot(z1 - z0, y1 - y0);
    const m = addBox(g, 0.05, 0.05, railLen, rail, x, (y0 + y1) / 2, (z0 + z1) / 2);
    m.rotation.x = Math.atan2(y1 - y0, z0 - z1);
  });
}

function bridge(g, layout, tex) {
  const b = layout.built.bridge;
  const depth = b.thickness;
  const stone = toon(layout.shell.stoneColor);
  const mortar = toon(layout.shell.mortarColor);
  const width = b.radius * 2 + 1.35;
  const shape = new THREE.Shape();
  const base = -0.85;
  const top = b.parapetY - b.springY;
  shape.moveTo(-width / 2, base);
  shape.lineTo(-width / 2, top);
  shape.lineTo(width / 2, top);
  shape.lineTo(width / 2, base);
  shape.lineTo(b.radius, base);
  shape.lineTo(b.radius, 0);
  shape.absarc(0, 0, b.radius, 0, Math.PI, false);
  shape.lineTo(-b.radius, base);
  shape.lineTo(-width / 2, base);
  const geo = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments: 20 });
  geo.translate(0, 0, -depth);
  const mass = new THREE.Mesh(geo, toon('#7a4034'));
  mass.position.set(b.faceX, b.springY, b.centerZ);
  mass.rotation.y = -Math.PI / 2;
  mass.castShadow = true;
  mass.receiveShadow = true;
  g.add(mass);

  const count = 10;
  for (let i = 0; i <= count; i++) {
    const ang = Math.PI - (Math.PI * i) / count;
    const z = b.centerZ + Math.cos(ang) * (b.radius + 0.03);
    const y = b.springY + Math.sin(ang) * (b.radius + 0.03);
    const mid = i === count / 2;
    const m = addBox(g, 0.08, mid ? 0.28 : 0.2, mid ? 0.18 : 0.12, mid ? stone : toon('#9a5642'), b.faceX + 0.05, y, z);
    m.rotation.x = Math.PI / 2 - ang;
  }
  addBox(g, depth + 0.08, 0.14, width * 0.92, stone, b.faceX + depth * 0.45, b.parapetY + 0.06, b.centerZ);
  for (let i = -3; i <= 3; i++) {
    addBox(g, 0.1, 0.36, 0.1, mortar, b.faceX + 0.06, b.parapetY + 0.28, b.centerZ + i * 0.36);
  }
  addBox(g, 0.12, 0.08, width * 0.86, stone, b.faceX + 0.06, b.parapetY + 0.48, b.centerZ);
  addBox(g, depth, 0.16, 0.28, stone, b.faceX + depth * 0.5, b.springY + b.radius + 0.15, b.centerZ - b.radius - 0.15);
  addBox(g, depth, 1.3, 0.55, toon('#6e3a30'), b.faceX + depth * 0.5, 0.4, b.centerZ - b.radius - 0.45);
  addBox(g, depth, 1.3, 0.55, toon('#6e3a30'), b.faceX + depth * 0.5, 0.4, b.centerZ + b.radius + 0.45);
}

function awning(g, layout) {
  const a = layout.built.awning;
  const w = a.x1 - a.x0;
  const d = a.zFront - a.zWall;
  const geo = new THREE.PlaneGeometry(w, d, 10, 6);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const u = (pos.getX(i) / w) + 0.5;
    const v = (pos.getY(i) / d) + 0.5;
    const sag = Math.sin(u * Math.PI) * Math.sin(v * Math.PI) * 0.07;
    pos.setZ(i, sag);
  }
  geo.computeVertexNormals();
  const stripes = canvasTex((ctx, W, H) => {
    const light = '#f4ecdf';
    const stripe = '#a24b38';
    for (let x = 0; x < W; x += 32) {
      ctx.fillStyle = ((x / 32) % 2 === 0) ? light : stripe;
      ctx.fillRect(x, 0, 32, H);
    }
  }, 256, 64);
  const cloth = new THREE.Mesh(geo, toon('#ffffff', { map: stripes, side: THREE.DoubleSide }));
  cloth.position.set((a.x0 + a.x1) / 2, (a.yWall + a.yFront) / 2, (a.zWall + a.zFront) / 2);
  cloth.rotation.x = -Math.PI / 2 + Math.atan2(a.yWall - a.yFront, d);
  // PlaneGeometry faces +Z. After rotation the sheet should span local X (width) and slope from wall to canal.
  cloth.rotation.set(0, 0, 0);
  // Rebuild as a custom quad so the corners land on the wall and the front edge.
  g.remove(cloth);
  const sheet = new THREE.BufferGeometry();
  const cx = (a.x0 + a.x1) / 2;
  const sag = 0.06;
  const yBack = a.yWall;
  const yFront = a.yFront;
  const verts = [];
  const uvs = [];
  const cols = 12;
  const rows = 6;
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      const u = i / (cols - 1);
      const v = j / (rows - 1);
      const x = a.x0 + u * w;
      const z = a.zWall + v * d;
      const y = yBack + (yFront - yBack) * v - Math.sin(u * Math.PI) * Math.sin(v * Math.PI) * sag;
      verts.push(x, y, z);
      uvs.push(u, v);
    }
  }
  const idx = [];
  for (let j = 0; j < rows - 1; j++) {
    for (let i = 0; i < cols - 1; i++) {
      const n = j * cols + i;
      idx.push(n, n + 1, n + cols, n + 1, n + cols + 1, n + cols);
    }
  }
  sheet.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
  sheet.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  sheet.setIndex(idx);
  sheet.computeVertexNormals();
  const mesh = new THREE.Mesh(sheet, toon('#ffffff', { map: stripes, side: THREE.DoubleSide }));
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.name = 'awning';
  g.add(mesh);

  const valance = canvasTex((ctx, W, H) => {
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#f4ecdf';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(W, 0);
    const scallops = 8;
    const sw = W / scallops;
    for (let i = scallops; i >= 0; i--) {
      const x = i * sw;
      ctx.lineTo(x, H * 0.15);
      if (i > 0) ctx.quadraticCurveTo(x - sw / 2, H, x - sw, H * 0.15);
    }
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#a24b38';
    for (let i = 0; i < scallops; i += 2) {
      ctx.fillRect(i * sw, 0, sw, H * 0.22);
    }
  }, 512, 128);
  const van = new THREE.Mesh(
    new THREE.PlaneGeometry(w, 0.28),
    toon('#ffffff', { map: valance, transparent: true, side: THREE.DoubleSide }),
  );
  van.position.set(cx, yFront - 0.12, a.zFront + 0.01);
  van.userData.castShadow = false;
  g.add(van);

  addBox(g, w, 0.06, 0.08, toon(layout.shell.ironColor), cx, a.yWall, a.zWall + 0.04);
  [a.x0 + 0.35, a.x1 - 0.35].forEach((x) => {
    const arm = addBox(g, 0.04, 0.04, d * 0.98, toon(layout.shell.ironColor), x, (yBack + yFront) / 2 - 0.04, (a.zWall + a.zFront) / 2);
    arm.rotation.x = Math.atan2(yBack - yFront, d);
  });
}

function boat(g, layout) {
  const spec = layout.site.boat;
  const group = new THREE.Group();
  group.name = 'boat';
  group.position.set(spec.position[0], spec.position[1], spec.position[2]);
  group.rotation.y = spec.rotationY;

  const L = spec.length;
  const B = spec.beam;
  const draft = -spec.keel;
  const free = spec.gunwale;
  const stations = [
    { t: -1, b: 0.62, k: 1, s: 1 },
    { t: -0.72, b: 0.9, k: 1, s: 0.92 },
    { t: -0.38, b: 1, k: 0.98, s: 0.9 },
    { t: 0.0, b: 0.98, k: 0.94, s: 0.9 },
    { t: 0.32, b: 0.82, k: 0.8, s: 0.94 },
    { t: 0.62, b: 0.5, k: 0.55, s: 1.02 },
    { t: 0.86, b: 0.2, k: 0.28, s: 1.12 },
    { t: 1, b: 0.02, k: 0.05, s: 1.2 },
  ];
  const rings = stations.map((st) => {
    const x = st.t * L * 0.5;
    const hb = st.b * B * 0.5;
    const yk = -st.k * draft;
    const yg = free * st.s;
    return [
      new THREE.Vector3(x, yk, 0),
      new THREE.Vector3(x, yk * 0.35, hb * 0.72),
      new THREE.Vector3(x, yg * 0.25, hb),
      new THREE.Vector3(x, yg, hb * 0.92),
    ];
  });
  const positions = [];
  const push = (a, b, c) => positions.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z);
  for (let i = 0; i < rings.length - 1; i++) {
    for (let k = 0; k < rings[i].length - 1; k++) {
      const a = rings[i][k];
      const b = rings[i + 1][k];
      const c = rings[i + 1][k + 1];
      const d = rings[i][k + 1];
      const am = a.clone().setZ(-a.z);
      const bm = b.clone().setZ(-b.z);
      const cm = c.clone().setZ(-c.z);
      const dm = d.clone().setZ(-d.z);
      push(a, d, b);
      push(b, d, c);
      push(am, bm, dm);
      push(bm, cm, dm);
    }
  }
  const stern = rings[0];
  const bow = rings[rings.length - 1];
  push(stern[0], stern[1], stern[3]);
  push(stern[0].clone().setZ(0), stern[3].clone().setZ(-stern[3].z), stern[1].clone().setZ(-stern[1].z));
  push(bow[0], bow[3], bow[1]);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.computeVertexNormals();
  const hull = new THREE.Mesh(geo, toon('#f3f0e8', { side: THREE.DoubleSide }));
  hull.castShadow = true;
  hull.receiveShadow = true;
  group.add(hull);
  const railPts = rings.map((ring) => ring[ring.length - 1].clone());
  const railPtsPort = rings.map((ring) => ring[ring.length - 1].clone().setZ(-ring[ring.length - 1].z));
  [railPts, railPtsPort].forEach((pts) => {
    const curve = new THREE.CatmullRomCurve3(pts);
    const rail = new THREE.Mesh(new THREE.TubeGeometry(curve, 20, 0.018, 5, false), toon('#6e432c'));
    rail.castShadow = true;
    group.add(rail);
  });

  const deckZ = [];
  rings.forEach((ring) => {
    const gnw = ring[ring.length - 1];
    deckZ.push(gnw.x, gnw.y - 0.05, gnw.z * 0.2, gnw.x, gnw.y - 0.05, -gnw.z * 0.2);
  });
  // Simple wood deck and thwarts instead of a stitched deck mesh.
  addBox(group, L * 0.62, 0.05, B * 0.62, toon('#8a5a32'), -0.15, free * 0.35, 0);
  addBox(group, 0.28, 0.05, B * 0.7, toon('#a56b3c'), -0.55, free * 0.55, 0);
  addBox(group, 0.28, 0.05, B * 0.55, toon('#a56b3c'), 0.45, free * 0.62, 0);
  addBox(group, 0.08, free * 0.55, B * 0.9, toon('#6a4328'), -L * 0.42, free * 0.55, 0);

  // Low shelter over the stern third, open toward the bow.
  addBox(group, 0.06, 0.48, B * 0.78, toon('#7a4a32'), -L * 0.28, free + 0.28, 0);
  addBox(group, 0.7, 0.05, B * 0.82, toon('#f7f4ee'), -L * 0.36, free + 0.5, 0);
  addBox(group, 0.06, 0.42, 0.06, toon('#7a4a32'), -L * 0.46, free + 0.28, B * 0.32);
  addBox(group, 0.06, 0.42, 0.06, toon('#7a4a32'), -L * 0.46, free + 0.28, -B * 0.32);
  const glass = addBox(group, 0.04, 0.28, B * 0.6, toon('#b7c4c8', { transparent: true, opacity: 0.45 }), -L * 0.22, free + 0.32, 0);
  glass.userData.castShadow = false;

  addCyl(group, 0.03, 0.03, 0.08, toon('#2c3130'), L * 0.42, free + 0.04, 0, 8);
  addCyl(group, 0.03, 0.03, 0.08, toon('#2c3130'), -L * 0.4, free + 0.02, 0, 8);
  g.add(group);
  return group;
}

function rope(g, a, b, sag, color) {
  const pts = [];
  const n = 8;
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const x = a[0] + (b[0] - a[0]) * t;
    const z = a[2] + (b[2] - a[2]) * t;
    const y = a[1] + (b[1] - a[1]) * t - Math.sin(t * Math.PI) * sag;
    pts.push(new THREE.Vector3(x, y, z));
  }
  const curve = new THREE.CatmullRomCurve3(pts);
  const mesh = new THREE.Mesh(new THREE.TubeGeometry(curve, 10, 0.012, 5, false), toon(color));
  mesh.castShadow = true;
  mesh.userData.receiveShadow = false;
  g.add(mesh);
}

function bollard(g, x, z, y) {
  const iron = toon('#2c3130');
  addCyl(g, 0.07, 0.09, 0.48, iron, x, y + 0.24, z, 10);
  addCyl(g, 0.11, 0.11, 0.06, iron, x, y + 0.5, z, 10);
}

function bike(g, spec) {
  const group = new THREE.Group();
  group.name = spec.id;
  group.position.set(spec.position[0], spec.position[1], spec.position[2]);
  group.rotation.y = spec.rotationY;
  const frame = toon(spec.color);
  const dark = toon('#1b1e22');
  const silver = toon('#c5c8cc');
  const wheel = (x) => {
    const w = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.018, 8, 18), dark);
    w.position.set(x, 0.34, 0);
    w.castShadow = true;
    group.add(w);
    addCyl(group, 0.04, 0.04, 0.06, silver, x, 0.34, 0, 10);
    const fender = new THREE.Mesh(new THREE.TorusGeometry(0.37, 0.012, 6, 14, Math.PI), frame);
    fender.position.set(x, 0.34, 0);
    fender.rotation.z = Math.PI;
    group.add(fender);
  };
  wheel(-0.52);
  wheel(0.52);
  const tube = (x1, y1, x2, y2, r = 0.02) => {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len = Math.hypot(dx, dy);
    const m = addCyl(group, r, r, len, frame, (x1 + x2) / 2, (y1 + y2) / 2, 0, 8);
    m.rotation.z = Math.atan2(dy, dx) - Math.PI / 2;
  };
  tube(-0.52, 0.34, 0.18, 0.72);
  tube(0.18, 0.72, 0.52, 0.34);
  tube(-0.52, 0.34, 0.18, 0.34, 0.016);
  tube(0.18, 0.34, 0.52, 0.34, 0.016);
  tube(0.18, 0.34, 0.18, 0.74, 0.02);
  addBox(group, 0.28, 0.04, 0.1, toon('#6a4030'), 0.16, 0.76, 0);
  addCyl(group, 0.012, 0.012, 0.42, silver, 0.5, 0.72, 0, 6);
  addCyl(group, 0.012, 0.012, 0.36, silver, 0.5, 0.9, 0, 6);
  group.children[group.children.length - 1].rotation.x = Math.PI / 2;
  addBox(group, 0.34, 0.025, 0.12, dark, -0.52, 0.62, 0);
  addCyl(group, 0.015, 0.015, 0.22, silver, 0.18, 0.28, 0, 6);
  group.children[group.children.length - 1].rotation.x = Math.PI / 2;
  g.add(group);
}

function leafBlob(g, w, h, d, color, x, y, z) {
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(1, 7, 6), toon(color));
  mesh.scale.set(w, h, d);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  g.add(mesh);
}

function tree(g, spec) {
  const [x, , z] = spec.position;
  const lean = spec.lean || 0;
  const trunk = toon('#5c4636');
  if (spec.kind === 'multistem') {
    [-0.08, 0.05, 0.12].forEach((dx, i) => {
      const h = 1.5 + i * 0.25;
      const m = addCyl(g, 0.03, 0.05, h, trunk, x + dx, h / 2, z + (i - 1) * 0.05, 7);
      m.rotation.z = lean + dx;
    });
    leafBlob(g, 0.55, 0.42, 0.48, '#3e6a38', x + 0.05, 1.7, z);
    leafBlob(g, 0.38, 0.32, 0.36, '#517840', x + 0.28, 1.95, z - 0.12);
    leafBlob(g, 0.32, 0.28, 0.3, '#2f5530', x - 0.22, 1.85, z + 0.16);
    leafBlob(g, 0.22, 0.18, 0.2, '#6d8a3e', x + 0.1, 2.2, z + 0.05);
  } else {
    const h = 2.15;
    const m = addCyl(g, 0.05, 0.09, h, trunk, x, h / 2, z, 8);
    m.rotation.z = lean;
    addCyl(g, 0.035, 0.05, 0.7, trunk, x + 0.08, h * 0.72, z - 0.04, 6);
    leafBlob(g, 0.72, 0.48, 0.62, '#3f6b39', x + 0.05, 2.25, z);
    leafBlob(g, 0.48, 0.36, 0.42, '#4f7c42', x + 0.32, 2.45, z - 0.12);
    leafBlob(g, 0.4, 0.3, 0.38, '#2e5630', x - 0.28, 2.35, z + 0.18);
    leafBlob(g, 0.28, 0.22, 0.26, '#68873f', x + 0.08, 2.7, z - 0.05);
    leafBlob(g, 0.22, 0.16, 0.2, '#345c34', x - 0.1, 2.15, z - 0.22);
  }
}

function plantOnPot(g, inst) {
  const [x, y, z] = inst.position;
  const base = y + 0.3;
  if (inst.plant === 'geranium') {
    leafBlob(g, 0.22, 0.12, 0.2, '#3e6a34', x, base + 0.08, z);
    leafBlob(g, 0.1, 0.08, 0.1, '#a24b48', x + 0.08, base + 0.16, z + 0.04);
    leafBlob(g, 0.08, 0.07, 0.08, '#c46a58', x - 0.07, base + 0.14, z - 0.05);
  } else if (inst.plant === 'herb') {
    for (let i = 0; i < 5; i++) {
      const m = addBox(g, 0.03, 0.16 + (i % 3) * 0.04, 0.02, toon('#4a7a3c'), x + (i - 2) * 0.035, base + 0.08, z);
      m.rotation.z = (i - 2) * 0.15;
    }
  } else if (inst.plant === 'shrub') {
    leafBlob(g, 0.28, 0.22, 0.26, '#2f5a32', x, base + 0.16, z);
    leafBlob(g, 0.16, 0.14, 0.16, '#6a8840', x + 0.1, base + 0.28, z - 0.04);
  } else {
    for (let i = 0; i < 4; i++) {
      const m = addBox(g, 0.02, 0.28, 0.015, toon('#5d7a3a'), x + (i - 1.5) * 0.04, base + 0.12, z);
      m.rotation.z = (i - 1.5) * 0.2;
    }
  }
}

function troughPlants(g, layout) {
  const t = layout.built.trough;
  const [x, y, z] = t.position;
  const [w, h, d] = t.size;
  addBox(g, w, h, d, toon('#6a4a32'), x, y + h / 2, z);
  addBox(g, w - 0.08, 0.06, d - 0.08, toon('#3d5a34'), x, y + h - 0.02, z);
  leafBlob(g, 0.22, 0.16, 0.18, '#3e6a38', x - 0.28, y + h + 0.1, z);
  leafBlob(g, 0.16, 0.2, 0.14, '#6d8a3e', x, y + h + 0.16, z + 0.04);
  for (let i = 0; i < 4; i++) {
    addCyl(g, 0.02, 0.025, 0.22, toon('#7a6a9a'), x + 0.22 + i * 0.06, y + h + 0.1, z - 0.04, 6);
  }
  leafBlob(g, 0.12, 0.08, 0.12, '#a24b48', x + 0.18, y + h + 0.2, z + 0.08);
}

function makeShell(layout) {
  const g = new THREE.Group();
  g.name = 'shell';
  const wallTex = brickTexture(
    ['#8a4634', '#7a3e32', '#934e3a', '#6e3a30', '#a15a40', '#5e342c', '#8d5340', '#764438'],
    '#cbb9a4',
  );
  const paveTex = brickTexture(
    ['#7a5344', '#6a4638', '#8a5c48', '#5e4036', '#705042'],
    '#b7a894',
  );
  g.add(skyDome());
  const ground = addBox(g, 40, 0.2, 40, toon('#6a5848'), 0, -1.2, 0);
  ground.userData.castShadow = false;
  g.add(waterMesh(layout, waterTexture()));
  quay(g, layout, wallTex, paveTex);
  nearBank(g, layout);
  facade(g, layout, wallTex);
  stairs(g, layout);
  bridge(g, layout, wallTex);
  return g;
}

function makeProcedural(layout) {
  const g = new THREE.Group();
  g.name = 'procedural';
  awning(g, layout);
  boat(g, layout);
  layout.built.bikes.forEach((b) => bike(g, b));
  layout.built.trees.forEach((t) => tree(g, t));
  layout.instances.filter((i) => i.kind === 'flowerpot').forEach((i) => plantOnPot(g, i));
  troughPlants(g, layout);

  bollard(g, -2.7, -0.02, 0);
  bollard(g, -0.45, -0.02, 0);
  bollard(g, 3.55, -0.02, 0);
  const boatPos = layout.site.boat.position;
  const gun = boatPos[1] + layout.site.boat.gunwale;
  rope(g, [-2.7, 0.5, -0.02], [boatPos[0] - 1.15, gun, boatPos[2] - 0.15], 0.18, '#c2b49a');
  rope(g, [-0.45, 0.5, -0.02], [boatPos[0] + 0.7, gun, boatPos[2] - 0.2], 0.16, '#c2b49a');
  rope(g, [-2.9, -0.05, 0.55], [-0.3, -0.05, 0.55], 0.08, '#d8d2c6');

  // Lamp post on the street, unlit. One vertical, no pool of light.
  const iron = toon(layout.shell.ironColor);
  addCyl(g, 0.04, 0.05, 2.4, iron, -4.7, layout.site.streetY + 1.2, -6.35, 8);
  addCyl(g, 0.16, 0.1, 0.22, toon('#2a3038'), -4.7, layout.site.streetY + 2.45, -6.35, 8);
  return g;
}

boot({
  makeShell,
  makeProcedural,
  readyText: 'ready — canal-side café · drag orbit · U unlit · T toon',
});
