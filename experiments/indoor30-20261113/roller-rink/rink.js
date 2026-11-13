import * as THREE from 'three';
import { boot, toon, addBox, addCyl } from './scene_lib.js';

function tag(mesh, mode) {
  mesh.userData.shadowMode = mode;
  return mesh;
}

function palette() {
  const decal = (color) => toon(color, { polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  return {
    plaster: toon('#f3eee6'),
    plasterDeep: toon('#e6dccd'),
    wainscot: toon('#e7d5b8'),
    walnut: toon('#6a4632'),
    frame: toon('#5a3a2a'),
    beam: toon('#7b5840'),
    soffit: toon('#f6f1e8', { emissive: '#f3eadc', emissiveIntensity: 0.55 }),
    vault: toon('#f7f1e6', { side: THREE.DoubleSide }),
    vaultShade: toon('#e7d9c4'),
    rail: toon('#3e4a46'),
    railLight: toon('#d9c7a4'),
    kick: toon('#8d3d45'),
    kickDark: toon('#6e3038'),
    carpet: null,
    maple: null,
    border: decal('#8d3d45'),
    stripe: decal('#f4ead8'),
    lane: decal('#f7f1e4'),
    medallion: decal('#f3e6d0'),
    medallionCore: decal('#8d3d45'),
    chevron: decal('#a24b52'),
    brass: toon('#b08a52'),
    iron: toon('#3a3634'),
    boot: {
      white: toon('#f4f0e8'),
      burgundy: toon('#8d3d45'),
      black: toon('#2a2726'),
      cream: toon('#f0d8b0'),
    },
    wheel: toon('#c45a4a'),
    stop: toon('#6a5344'),
    plate: toon('#c9ccd0'),
    towel: toon('#efe6d4'),
    bag: toon('#3d4a58'),
    leaf: toon('#3f6a45'),
    leafDeep: toon('#2c4c34'),
    potSoil: toon('#4a3428'),
    bulb: toon('#fff6e4', { emissive: '#ffd7a4', emissiveIntensity: 1.15 }),
    globe: toon('#fff4e2', { emissive: '#ffd4a4', emissiveIntensity: 1.05 }),
    cord: toon('#2c2826'),
    rose: toon('#c86b6b', { emissive: '#e7a0a0', emissiveIntensity: 0.7 }),
    amber: toon('#e09a4a', { emissive: '#f0b56a', emissiveIntensity: 0.75 }),
    glass: toon('#fff1dc', { emissive: '#ffe0b4', emissiveIntensity: 0.72, transparent: true, opacity: 0.72, side: THREE.DoubleSide }),
    mirror: toon('#d5d0c6', { emissive: '#f4efe6', emissiveIntensity: 0.22 }),
    mixer: toon('#242220'),
    fader: toon('#cfc6ba'),
    stair: toon('#6e5038'),
    nosing: toon('#5c4030'),
    slab: toon('#8d6248'),
    bench: toon('#c6a36a'),
    lace: toon('#2c2826'),
    size: [toon('#f4f0e8'), toon('#e7b15a'), toon('#8d3d45'), toon('#3d4a58')],
  };
}

function civicSignTexture() {
  const c = document.createElement('canvas');
  c.width = 1024;
  c.height = 256;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#f7f2e8';
  ctx.fillRect(0, 0, 1024, 256);
  ctx.fillStyle = '#8d3d45';
  ctx.fillRect(0, 0, 1024, 16);
  ctx.fillRect(0, 240, 1024, 16);
  ctx.font = '600 46px "Liberation Serif", "DejaVu Serif", serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('CIVIC HALL', 512, 78);
  ctx.fillStyle = '#3c2b22';
  ctx.font = '700 112px "Liberation Serif", "DejaVu Serif", serif';
  ctx.fillText('MAPLE RINK', 512, 170);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  tex.needsUpdate = true;
  return tex;
}

function carpetTexture() {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = '#a85b44';
  g.fillRect(0, 0, 128, 128);
  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 8; x++) {
      const flip = (x + y) % 2 === 0;
      g.fillStyle = flip ? '#b4684e' : '#8f4636';
      const px = x * 16;
      const py = y * 16;
      if (flip) g.fillRect(px + 2, py + 1, 5, 14);
      else g.fillRect(px + 9, py + 1, 5, 14);
      g.fillStyle = flip ? '#c17a5c' : '#7c3c30';
      g.fillRect(flip ? px + 8 : px + 2, py + 3, 4, 10);
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(10, 7.5);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function mapleTexture() {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 64;
  const g = c.getContext('2d');
  const tones = ['#e7c48a', '#d7aa5c', '#efd09a', '#c99648', '#e2bc78', '#f0d4a4'];
  let x = 0;
  let i = 0;
  while (x < 256) {
    const w = 14 + ((i * 17) % 11);
    g.fillStyle = tones[i % tones.length];
    g.fillRect(x, 0, w, 64);
    g.fillStyle = 'rgba(90,50,20,0.08)';
    g.fillRect(x, 8 + ((i * 13) % 30), w, 2);
    x += w;
    i += 1;
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function ellipseShape(a, b, holeA, holeB) {
  const shape = new THREE.Shape();
  shape.absellipse(0, 0, a, b, 0, Math.PI * 2, false, 0);
  if (holeA && holeB) {
    const hole = new THREE.Path();
    hole.absellipse(0, 0, holeA, holeB, 0, Math.PI * 2, true, 0);
    shape.holes.push(hole);
  }
  return shape;
}

function shapeMesh(shape, mat, y, cx, cz) {
  const geo = new THREE.ShapeGeometry(shape, 28);
  geo.rotateX(-Math.PI / 2);
  geo.translate(cx, y, cz);
  const mesh = new THREE.Mesh(geo, mat);
  tag(mesh, 'decal');
  return mesh;
}

function mapleMesh(a, b, mat, y, cx, cz) {
  const geo = new THREE.ShapeGeometry(ellipseShape(a, b), 36);
  geo.rotateX(-Math.PI / 2);
  geo.translate(cx, y, cz);
  const pos = geo.attributes.position;
  const uv = new Float32Array(pos.count * 2);
  for (let i = 0; i < pos.count; i++) {
    uv[i * 2] = pos.getX(i) / 0.18;
    uv[i * 2 + 1] = pos.getZ(i) / 1.4;
  }
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  geo.computeVertexNormals();
  const mesh = new THREE.Mesh(geo, mat);
  tag(mesh, 'receive');
  return mesh;
}

class EllipseArc extends THREE.Curve {
  constructor(cx, cz, a, b, y, t0, t1) {
    super();
    this.cx = cx;
    this.cz = cz;
    this.a = a;
    this.b = b;
    this.y = y;
    this.t0 = t0;
    this.t1 = t1;
  }

  getPoint(t) {
    const a = this.t0 + (this.t1 - this.t0) * t;
    return new THREE.Vector3(
      this.cx + this.a * Math.cos(a),
      this.y,
      this.cz + this.b * Math.sin(a),
    );
  }
}

class ArchCurve extends THREE.Curve {
  constructor(x, halfZ, rise) {
    super();
    this.x = x;
    this.halfZ = halfZ;
    this.rise = rise;
    this.R = (rise * rise + halfZ * halfZ) / (2 * rise);
    this.theta = 2 * Math.asin(halfZ / this.R);
  }

  getPoint(t) {
    const a = -this.theta / 2 + this.theta * t;
    const z = this.R * Math.sin(a);
    const y = this.R * Math.cos(a) - (this.R - this.rise);
    return new THREE.Vector3(this.x, y, z);
  }
}

function vaultHeight(z, halfZ, rise) {
  const R = (rise * rise + halfZ * halfZ) / (2 * rise);
  const limit = halfZ * halfZ;
  const zz = Math.min(z * z, limit * 0.98);
  const inside = R * R - zz;
  return Math.sqrt(Math.max(0, inside)) - (R - rise);
}

function buildVault(g, mats, layout) {
  const v = layout.architecture.vault;
  const rink = layout.architecture.rink;
  const rise = v.rise;
  const halfZ = v.halfZ;
  const length = v.halfX * 2;
  const segs = 30;
  const R = (rise * rise + halfZ * halfZ) / (2 * rise);
  const theta = 2 * Math.asin(halfZ / R);
  const positions = [];
  const indices = [];
  for (let i = 0; i <= segs; i++) {
    const a = -theta / 2 + (theta * i) / segs;
    const z = R * Math.sin(a);
    const y = R * Math.cos(a) - (R - rise);
    positions.push(-length / 2, y, z, length / 2, y, z);
  }
  for (let i = 0; i < segs; i++) {
    const a = i * 2;
    indices.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  const skin = new THREE.Mesh(geo, mats.vault);
  skin.position.set(rink.cx, v.springY, rink.cz);
  tag(skin, 'receive');
  g.add(skin);

  const ribs = 5;
  for (let i = 0; i < ribs; i++) {
    const x = -v.halfX + (length * i) / (ribs - 1);
    const curve = new ArchCurve(0, halfZ, rise);
    const tube = new THREE.Mesh(
      new THREE.TubeGeometry(curve, 40, i === 0 || i === ribs - 1 ? 0.055 : 0.04, 7, false),
      mats.beam,
    );
    tube.position.set(rink.cx + x, v.springY, rink.cz);
    tag(tube, 'cast');
    g.add(tube);
  }
}

function buildShell(layout, mats) {
  const g = new THREE.Group();
  g.name = 'shell';
  const { width: W, depth: D, height: H } = layout.meta.room;
  const t = layout.architecture.wallT;
  const v = layout.architecture.vault;
  const rink = layout.architecture.rink;

  tag(addBox(g, W - 0.04, 0.1, D - 0.04, mats.slab, 0, -0.05, 0), 'receive');
  const carpet = new THREE.Mesh(new THREE.PlaneGeometry(W - 0.28, D - 0.28), mats.carpet);
  carpet.rotation.x = -Math.PI / 2;
  carpet.position.y = 0.002;
  tag(carpet, 'receive');
  g.add(carpet);
  tag(addBox(g, W - 0.12, 0.08, 0.07, mats.nosing, 0, 0.01, D / 2 - 0.08), 'receive');
  tag(addBox(g, 0.07, 0.08, D - 0.2, mats.nosing, W / 2 - 0.1, 0.01, 0.4), 'receive');

  tag(addBox(g, W, H, t, mats.plaster, 0, H / 2, -D / 2), 'cast');
  tag(addBox(g, t, H, D, mats.plaster, -W / 2, H / 2, 0), 'cast');
  const rz1 = layout.architecture.rightWallZ1;
  const rLen = rz1 - (-D / 2);
  tag(addBox(g, t, H, rLen, mats.plaster, W / 2, H / 2, -D / 2 + rLen / 2), 'cast');

  const backIn = -D / 2 + t / 2 + 0.02;
  const leftIn = -W / 2 + t / 2 + 0.02;
  tag(addBox(g, W - 0.5, 1.12, 0.03, mats.wainscot, 0.1, 0.56, backIn), 'none');
  tag(addBox(g, 0.03, 1.12, D - 0.7, mats.wainscot, leftIn, 0.56, 0.15), 'none');
  tag(addBox(g, W - 0.7, 0.06, 0.04, mats.walnut, 0.1, 1.14, backIn + 0.02), 'none');
  tag(addBox(g, 0.04, 0.06, D - 0.9, mats.walnut, leftIn + 0.02, 1.14, 0.15), 'none');
  for (let i = 0; i < 7; i++) {
    const x = -6.4 + i * 1.85;
    tag(addBox(g, 0.05, 1.1, 0.025, mats.frame, x, 0.55, backIn + 0.02), 'none');
  }

  const x0 = rink.cx - v.halfX;
  const x1 = rink.cx + v.halfX;
  const z0 = rink.cz - v.halfZ;
  const z1 = rink.cz + v.halfZ;
  const sy = v.springY;
  tag(addBox(g, x0 + W / 2, 0.08, D, mats.soffit, (-W / 2 + x0) / 2, sy, 0), 'receive');
  tag(addBox(g, W / 2 - x1, 0.08, D, mats.soffit, (W / 2 + x1) / 2, sy, 0), 'receive');
  tag(addBox(g, x1 - x0, 0.08, z0 - (-D / 2), mats.soffit, rink.cx, sy, (-D / 2 + z0) / 2), 'receive');
  tag(addBox(g, x1 - x0, 0.08, D / 2 - z1, mats.soffit, rink.cx, sy, (D / 2 + z1) / 2), 'receive');
  const beamZ = (z0 + z1) / 2;
  const beamLen = (z1 - z0) - 0.2;
  tag(addBox(g, 0.14, 0.18, beamLen, mats.beam, x0, sy - 0.16, beamZ), 'cast');
  tag(addBox(g, 0.14, 0.18, beamLen, mats.beam, x1, sy - 0.16, beamZ), 'cast');

  buildVault(g, mats, layout);

  const clerestoryY = 2.72;
  tag(addBox(g, 7.2, 0.55, 0.04, mats.glass, 0.4, clerestoryY, backIn - 0.01), 'none');
  for (let i = 0; i < 6; i++) {
    tag(addBox(g, 0.05, 0.62, 0.05, mats.walnut, -2.9 + i * 1.35, clerestoryY, backIn + 0.02), 'none');
  }
  tag(addBox(g, 0.04, 0.48, 2.4, mats.glass, leftIn - 0.01, 2.85, -4.3), 'none');

  const slatZ = backIn + 0.04;
  for (let i = 0; i < 9; i++) {
    tag(addBox(g, 0.06, 1.55, 0.04, mats.walnut, 5.15 + i * 0.28, 1.85, slatZ), 'cast');
  }

  dressUpperWalls(g, mats, backIn, leftIn);
  buildCivicSign(g, mats, backIn);
  return g;
}

function framedPanel(g, mats, x, y, z, w, h, face) {
  const rail = 0.028;
  if (face === 'z') {
    tag(addBox(g, w, h, 0.018, mats.plasterDeep, x, y, z), 'none');
    tag(addBox(g, w + rail, rail, 0.028, mats.walnut, x, y + h / 2, z + 0.008), 'none');
    tag(addBox(g, w + rail, rail, 0.028, mats.walnut, x, y - h / 2, z + 0.008), 'none');
    tag(addBox(g, rail, h, 0.028, mats.walnut, x - w / 2, y, z + 0.008), 'none');
    tag(addBox(g, rail, h, 0.028, mats.walnut, x + w / 2, y, z + 0.008), 'none');
  } else {
    tag(addBox(g, 0.018, h, w, mats.plasterDeep, x, y, z), 'none');
    tag(addBox(g, 0.028, rail, w + rail, mats.walnut, x + 0.008, y + h / 2, z), 'none');
    tag(addBox(g, 0.028, rail, w + rail, mats.walnut, x + 0.008, y - h / 2, z), 'none');
    tag(addBox(g, 0.028, h, rail, mats.walnut, x + 0.008, y, z - w / 2), 'none');
    tag(addBox(g, 0.028, h, rail, mats.walnut, x + 0.008, y, z + w / 2), 'none');
  }
}

function dressUpperWalls(g, mats, backIn, leftIn) {
  const y = 1.78;
  const h = 0.92;
  tag(addBox(g, 14.6, 0.035, 0.03, mats.walnut, -0.4, 2.36, backIn + 0.03), 'none');
  tag(addBox(g, 0.03, 0.035, 8.4, mats.walnut, leftIn + 0.03, 2.36, 0.4), 'none');
  framedPanel(g, mats, -4.55, y, backIn + 0.02, 1.85, h, 'z');
  framedPanel(g, mats, -2.35, y, backIn + 0.02, 1.7, h, 'z');
  framedPanel(g, mats, 2.55, y, backIn + 0.02, 1.7, h, 'z');
  framedPanel(g, mats, 4.35, y, backIn + 0.02, 1.15, h, 'z');
  framedPanel(g, mats, leftIn + 0.02, 2.08, -2.15, 0.72, 0.42, 'x');
  framedPanel(g, mats, leftIn + 0.02, 2.08, -1.15, 0.86, 0.42, 'x');
  framedPanel(g, mats, leftIn + 0.02, 2.08, -0.15, 0.7, 0.42, 'x');
  framedPanel(g, mats, leftIn + 0.02, y, 0.85, 1.15, h, 'x');
  framedPanel(g, mats, leftIn + 0.02, y, 2.15, 1.35, h, 'x');
  framedPanel(g, mats, leftIn + 0.02, y, 3.6, 1.25, h, 'x');
  framedPanel(g, mats, leftIn + 0.02, y, 4.85, 0.95, h, 'x');
}

function buildCivicSign(g, mats, backIn) {
  const x = -0.15;
  const y = 1.78;
  const z = backIn + 0.04;
  tag(addBox(g, 2.62, 0.64, 0.04, mats.walnut, x, y, z), 'cast');
  const face = new THREE.Mesh(
    new THREE.PlaneGeometry(2.4, 0.5),
    toon('#f7f2e8', { map: civicSignTexture() }),
  );
  face.position.set(x, y, z + 0.024);
  tag(face, 'none');
  g.add(face);
}

function pointOn(rink, a, b, ang) {
  return [rink.cx + a * Math.cos(ang), rink.cz + b * Math.sin(ang)];
}

function buildRails(g, mats, layout) {
  const rink = layout.architecture.rink;
  const gap0 = rink.gateAngle - rink.gateHalf;
  const gap1 = rink.gateAngle + rink.gateHalf;
  const railMat = mats.rail;
  const heights = [rink.railTop, rink.railMid, 0.1];
  const radii = [0.028, 0.02, 0.016];
  heights.forEach((y, idx) => {
    const curve = new EllipseArc(rink.cx, rink.cz, rink.railA, rink.railB, y, gap1, gap0 + Math.PI * 2);
    const mesh = new THREE.Mesh(new THREE.TubeGeometry(curve, 96, radii[idx], 7, false), railMat);
    tag(mesh, 'cast');
    g.add(mesh);
  });

  const step = 0.34;
  const posts = [];
  for (let a = gap1; a < gap0 + Math.PI * 2 - 0.05; a += step) {
    const ang = a > Math.PI * 2 ? a - Math.PI * 2 : a;
    const [x, z] = pointOn(rink, rink.railA, rink.railB, ang);
    posts.push({ x, z, ang });
    tag(addCyl(g, 0.045, 0.05, rink.railTop, mats.walnut, x, rink.railTop / 2, z, 8), 'cast');
    tag(addCyl(g, 0.07, 0.07, 0.04, mats.kickDark, x, 0.03, z, 8), 'cast');
  }
  for (let i = 0; i < posts.length - 1; i++) {
    const p = posts[i];
    const n = posts[i + 1];
    const dx = n.x - p.x;
    const dz = n.z - p.z;
    const len = Math.hypot(dx, dz);
    if (len < 0.2 || len > 1.6) continue;
    const board = addBox(g, len - 0.06, rink.kick, 0.045, mats.kick, (p.x + n.x) / 2, rink.kick / 2 + 0.02, (p.z + n.z) / 2);
    board.rotation.y = Math.atan2(-dz, dx);
    tag(board, 'cast');
    const cap = addBox(g, len - 0.08, 0.035, 0.055, mats.railLight, (p.x + n.x) / 2, rink.kick + 0.03, (p.z + n.z) / 2);
    cap.rotation.y = board.rotation.y;
    tag(cap, 'cast');
  }

  const [hx, hz] = pointOn(rink, rink.railA, rink.railB, gap1);
  const leaf = new THREE.Group();
  tag(addCyl(leaf, 0.02, 0.02, 0.86, mats.rail, 0.43, rink.railTop, 0, 8).rotateZ(Math.PI / 2), 'cast');
  tag(addCyl(leaf, 0.016, 0.016, 0.86, mats.rail, 0.43, rink.railMid, 0, 8).rotateZ(Math.PI / 2), 'cast');
  tag(addBox(leaf, 0.78, rink.kick, 0.04, mats.kick, 0.42, rink.kick / 2, 0), 'cast');
  tag(addBox(leaf, 0.045, rink.railTop, 0.045, mats.walnut, 0.84, rink.railTop / 2, 0), 'cast');
  leaf.position.set(hx, 0, hz);
  // Local +X maps to (cos θ, -sin θ). Point that outward so the chord stays open.
  const outX = hx - rink.cx;
  const outZ = hz - rink.cz;
  leaf.rotation.y = Math.atan2(-outZ, outX);
  g.add(leaf);

  const threshold = addBox(g, 0.55, 0.025, 1.15, mats.railLight, rink.cx - rink.railA + 0.15, 0.03, rink.cz);
  tag(threshold, 'decal');
}

function buildRinkFloor(g, mats, layout) {
  const rink = layout.architecture.rink;
  g.add(mapleMesh(rink.a, rink.b, mats.maple, 0.02, rink.cx, rink.cz));
  g.add(shapeMesh(ellipseShape(rink.a, rink.b, rink.a - 0.4, rink.b - 0.34), mats.border, 0.028, rink.cx, rink.cz));
  g.add(shapeMesh(ellipseShape(rink.a - 0.4, rink.b - 0.34, rink.a - 0.48, rink.b - 0.4), mats.stripe, 0.03, rink.cx, rink.cz));
  g.add(shapeMesh(ellipseShape(rink.a * 0.62, rink.b * 0.62, rink.a * 0.62 - 0.06, rink.b * 0.62 - 0.05), mats.lane, 0.03, rink.cx, rink.cz));
  g.add(shapeMesh(ellipseShape(0.95, 0.95, 0.72, 0.72), mats.medallion, 0.03, rink.cx, rink.cz));
  g.add(shapeMesh(ellipseShape(0.34, 0.34), mats.medallionCore, 0.032, rink.cx, rink.cz));

  for (let i = 0; i < 4; i++) {
    const ang = -0.4 + i * (Math.PI / 2);
    const [x, z] = pointOn(rink, rink.a * 0.78, rink.b * 0.78, ang);
    const head = Math.atan2(-(rink.a * Math.sin(ang)), rink.b * Math.cos(ang));
    const m = new THREE.Mesh(chevronGeo(), mats.chevron);
    m.position.set(x, 0.034, z);
    m.rotation.x = -Math.PI / 2;
    m.rotation.z = -head + Math.PI / 2;
    tag(m, 'decal');
    g.add(m);
  }
}

function chevronGeo() {
  const s = new THREE.Shape();
  s.moveTo(0, 0.16);
  s.lineTo(0.12, -0.08);
  s.lineTo(0.05, -0.08);
  s.lineTo(0, 0.02);
  s.lineTo(-0.05, -0.08);
  s.lineTo(-0.12, -0.08);
  s.closePath();
  return new THREE.ShapeGeometry(s);
}

function skate(g, mats, x, y, z, rot, name) {
  const boot = mats.boot[name] || mats.boot.white;
  const s = new THREE.Group();
  for (const wx of [-0.048, 0.042]) {
    for (const wz of [-0.034, 0.034]) {
      const w = addCyl(s, 0.032, 0.032, 0.02, mats.wheel, wx, 0.032, wz, 12);
      w.rotation.x = Math.PI / 2;
      tag(w, 'cast');
    }
  }
  tag(addBox(s, 0.2, 0.012, 0.078, mats.plate, -0.004, 0.07, 0), 'cast');
  const stop = addCyl(s, 0.016, 0.02, 0.042, mats.stop, 0.108, 0.04, 0, 10);
  stop.rotation.z = -0.7;
  tag(stop, 'cast');
  tag(addBox(s, 0.21, 0.016, 0.082, boot, -0.006, 0.086, 0), 'cast');
  tag(addBox(s, 0.055, 0.032, 0.074, boot, -0.07, 0.1, 0), 'cast');
  tag(addBox(s, 0.07, 0.04, 0.086, boot, 0.055, 0.108, 0), 'cast');
  tag(addBox(s, 0.11, 0.055, 0.08, boot, 0.01, 0.14, 0), 'cast');
  tag(addBox(s, 0.07, 0.07, 0.072, boot, -0.03, 0.19, 0), 'cast');
  tag(addBox(s, 0.062, 0.016, 0.078, mats.lace, -0.02, 0.232, 0), 'cast');
  tag(addBox(s, 0.09, 0.01, 0.012, mats.lace, 0.02, 0.168, 0), 'cast');
  s.position.set(x, y, z);
  s.rotation.y = rot;
  g.add(s);
  return s;
}

function buildCubbies(g, mats, layout) {
  const spec = layout.architecture.cubbies;
  let z = spec.z0;
  spec.modules.forEach((mod, index) => {
    const cz = z + mod.w / 2;
    const x = spec.xBack + spec.depth / 2;
    tag(addBox(g, spec.depth, mod.h, 0.02, mats.plasterDeep, x, mod.h / 2, cz), 'cast');
    tag(addBox(g, spec.depth, mod.h, 0.035, mats.walnut, x, mod.h / 2, z), 'cast');
    tag(addBox(g, spec.depth, mod.h, 0.035, mats.walnut, x, mod.h / 2, z + mod.w), 'cast');
    tag(addBox(g, spec.depth, 0.04, mod.w, mats.walnut, x, mod.h - 0.02, cz), 'cast');
    tag(addBox(g, spec.depth, 0.05, mod.w, mats.frame, x, 0.04, cz), 'cast');
    const shelfYs = mod.shelves === 2 ? [0.48, 1.05] : [0.55];
    shelfYs.forEach((sy) => {
      if (sy < mod.h - 0.2) tag(addBox(g, spec.depth - 0.04, 0.025, mod.w - 0.06, mats.wainscot, x + 0.01, sy, cz), 'cast');
    });
    const dot = addBox(g, 0.01, 0.04, 0.04, mats.size[index % mats.size.length], x + spec.depth / 2 + 0.006, Math.min(1.02, mod.h - 0.18), z + 0.07);
    tag(dot, 'none');
    mod.hold.forEach((color, n) => {
      const sy = shelfYs[Math.min(n, shelfYs.length - 1)] + 0.014;
      const zz = cz + (n - (mod.hold.length - 1) / 2) * 0.06;
      skate(g, mats, x + 0.02, sy, zz, Math.PI / 2, color);
    });
    if (!mod.hold.length) {
      tag(addBox(g, 0.22, 0.025, 0.16, mats.towel, x + 0.01, 0.58, cz - 0.02), 'cast');
      tag(addBox(g, 0.12, 0.08, 0.1, mats.bag, x + 0.02, 0.62, cz + 0.06), 'cast');
    }
    z += mod.w;
  });
  tag(addBox(g, spec.depth, spec.modules[spec.modules.length - 1] ? 0.04 : 0.04, 0.04, mats.walnut, spec.xBack, 0.02, z), 'none');
}

function buildCounter(g, mats, layout) {
  const c = layout.architecture.counter;
  const w = c.x1 - c.x0;
  const d = c.z1 - c.z0;
  const cx = (c.x0 + c.x1) / 2;
  const cz = (c.z0 + c.z1) / 2;
  tag(addBox(g, w - 0.08, c.h - 0.08, d - 0.08, mats.kick, cx - 0.02, (c.h - 0.08) / 2, cz), 'cast');
  tag(addBox(g, w, 0.045, d, mats.walnut, cx, c.h - 0.022, cz), 'cast');
  tag(addBox(g, 0.025, c.h - 0.1, d - 0.16, mats.frame, c.x1 - 0.02, c.h / 2, cz), 'cast');
  for (let i = 0; i < 4; i++) {
    const block = addBox(g, 0.07, 0.045, 0.07, mats.size[i], c.x1 - 0.08, c.h + 0.03, c.z0 + 0.28 + i * 0.16);
    tag(block, 'cast');
  }
}

function buildBooth(g, mats, layout) {
  const d = layout.architecture.dj;
  const w = d.x1 - d.x0;
  const depth = d.z1 - d.z0;
  const cx = (d.x0 + d.x1) / 2;
  const cz = (d.z0 + d.z1) / 2;
  tag(addBox(g, w, d.rise, depth, mats.stair, cx, d.rise / 2, cz), 'cast');
  tag(addBox(g, w + 0.06, 0.04, 0.06, mats.nosing, cx, d.rise + 0.02, d.z1), 'cast');
  tag(addBox(g, w, d.counterTop - d.rise, 0.08, mats.walnut, cx, (d.counterTop + d.rise) / 2, d.z1 - 0.02), 'cast');
  tag(addBox(g, 0.08, d.counterTop - d.rise, depth, mats.walnut, d.x1 - 0.04, (d.counterTop + d.rise) / 2, cz), 'cast');
  tag(addBox(g, w, 0.045, 1.15, mats.frame, cx, d.counterTop - 0.02, d.z1 - 0.55), 'cast');
  tag(addBox(g, w - 0.3, 0.08, 0.08, mats.kickDark, cx, 2.02, d.z1), 'cast');
  tag(addCyl(g, 0.035, 0.035, 2.0, mats.walnut, d.x0 + 0.04, 1.0, d.z1, 8), 'cast');
  tag(addCyl(g, 0.035, 0.035, 2.0, mats.walnut, d.x1 - 0.04, 1.0, d.z1, 8), 'cast');

  tag(addBox(g, w - 0.5, 0.72, 0.05, mats.walnut, cx, 1.5, d.z0 + 0.08), 'cast');
  tag(addBox(g, w - 0.9, 0.46, 0.02, mats.wainscot, cx, 1.52, d.z0 + 0.11), 'none');

  const mixer = addBox(g, 0.7, 0.045, 0.3, mats.mixer, 6.22, d.counterTop + 0.03, -4.7);
  tag(mixer, 'cast');
  tag(addBox(g, 0.6, 0.012, 0.2, mats.fader, 6.22, d.counterTop + 0.058, -4.68), 'none');
  for (let i = 0; i < 5; i++) {
    tag(addBox(g, 0.016, 0.05, 0.03, mats.kickDark, 6.02 + i * 0.09, d.counterTop + 0.09, -4.66), 'cast');
  }

  const sx = d.x0 - 0.42;
  tag(addBox(g, 0.7, 0.1, 0.36, mats.stair, sx, 0.05, -5.15), 'cast');
  tag(addBox(g, 0.7, 0.1, 0.36, mats.stair, sx + 0.08, 0.15, -5.45), 'cast');
  const p0 = new THREE.Vector3(sx - 0.42, 0.72, -5.02);
  const p1 = new THREE.Vector3(sx - 0.34, 0.96, -5.55);
  tag(addCyl(g, 0.018, 0.018, p0.y, mats.walnut, p0.x, p0.y / 2, p0.z, 8), 'cast');
  tag(addCyl(g, 0.018, 0.018, p1.y - 0.15, mats.walnut, p1.x, (p1.y + 0.15) / 2, p1.z, 8), 'cast');
  const span = p1.clone().sub(p0);
  const hand = addCyl(g, 0.014, 0.014, span.length(), mats.walnut, (p0.x + p1.x) / 2, (p0.y + p1.y) / 2, (p0.z + p1.z) / 2, 8);
  hand.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), span.normalize());
  tag(hand, 'cast');
}

function buildEntry(g, mats, layout) {
  const e = layout.architecture.entry;
  const posts = [e.x0, e.x1];
  posts.forEach((x) => {
    tag(addBox(g, e.post, e.h, e.post, mats.walnut, x, e.h / 2, e.z), 'cast');
    tag(addBox(g, e.post + 0.04, 0.04, e.post + 0.04, mats.brass, x, 0.03, e.z), 'cast');
  });
  tag(addBox(g, e.x1 - e.x0 + e.post, 0.1, e.post + 0.02, mats.walnut, (e.x0 + e.x1) / 2, e.h - 0.05, e.z), 'cast');
  tag(addBox(g, 0.14, 0.14, 0.03, mats.kick, (e.x0 + e.x1) / 2, e.h - 0.28, e.z + 0.07), 'none');

  const leaf = new THREE.Group();
  tag(addBox(leaf, e.leaf, 0.04, 0.04, mats.walnut, e.leaf / 2, 1.15, 0), 'cast');
  tag(addBox(leaf, e.leaf, 0.04, 0.04, mats.walnut, e.leaf / 2, 0.45, 0), 'cast');
  tag(addBox(leaf, 0.04, 0.74, 0.04, mats.walnut, e.leaf - 0.02, 0.8, 0), 'cast');
  tag(addBox(leaf, e.leaf * 0.7, 0.03, 0.03, mats.brass, e.leaf * 0.4, 0.8, 0), 'cast');
  leaf.position.set(e.x0, 0, e.z);
  leaf.rotation.y = -1.25;
  g.add(leaf);

}

function buildLights(g, mats, layout) {
  const rink = layout.architecture.rink;
  const v = layout.architecture.vault;
  const spots = [
    [rink.a * 0.55, 0],
    [-rink.a * 0.55, 0],
    [0, rink.b * 0.62],
    [0, -rink.b * 0.62],
    [rink.a * 0.38, rink.b * 0.42],
    [-rink.a * 0.38, rink.b * 0.42],
    [rink.a * 0.38, -rink.b * 0.42],
    [-rink.a * 0.38, -rink.b * 0.42],
  ];
  spots.forEach(([dx, dz], i) => {
    const x = rink.cx + dx;
    const z = rink.cz + dz;
    const localZ = z - rink.cz;
    const hang = v.springY + vaultHeight(localZ, v.halfZ, v.rise) - 0.05;
    const gy = Math.min(hang - 0.62, 3.42);
    const cordLen = Math.max(0.25, hang - (gy + 0.14));
    tag(addCyl(g, 0.008, 0.008, cordLen, mats.cord, x, gy + 0.14 + cordLen / 2, z, 6), 'none');
    const globe = new THREE.Mesh(new THREE.SphereGeometry(0.15, 16, 12), mats.globe);
    globe.position.set(x, gy, z);
    tag(globe, 'none');
    g.add(globe);
    tag(addCyl(g, 0.04, 0.055, 0.045, mats.cord, x, gy + 0.15, z, 8), 'none');
    if (i < 4) {
      const canMat = i % 2 === 0 ? mats.amber : mats.rose;
      const cx = rink.cx + dx * 0.72;
      const cz = rink.cz + dz * 0.72;
      tag(addCyl(g, 0.07, 0.1, 0.08, mats.iron, cx, gy - 0.28, cz, 10), 'cast');
      tag(addCyl(g, 0.05, 0.05, 0.02, canMat, cx, gy - 0.33, cz, 10), 'none');
    }
  });

  const ballY = 3.42;
  const ballHang = v.springY + v.rise - 0.08;
  tag(addCyl(g, 0.008, 0.008, ballHang - ballY, mats.cord, rink.cx, (ballHang + ballY) / 2, rink.cz, 6), 'none');
  const ball = new THREE.Mesh(new THREE.IcosahedronGeometry(0.24, 1), mats.mirror);
  ball.position.set(rink.cx, ballY, rink.cz);
  tag(ball, 'cast');
  g.add(ball);

  layout.instances.filter((inst) => inst.kind === 'pendant_lamp').forEach((inst) => {
    const x = inst.position[0];
    const y = inst.position[1];
    const z = inst.position[2];
    tag(addCyl(g, 0.05, 0.05, 0.03, mats.bulb, x, y + 0.04, z, 10), 'none');
  });
}

function buildBench(g, mats, x, z, rot, length, depth, seat) {
  const bench = new THREE.Group();
  const leg = 0.05;
  const hx = depth / 2 - 0.05;
  const hz = length / 2 - 0.08;
  for (const sx of [-hx, hx]) {
    for (const sz of [-hz, hz]) {
      tag(addBox(bench, leg, seat - 0.04, leg, mats.walnut, sx, (seat - 0.04) / 2, sz), 'cast');
    }
  }
  tag(addBox(bench, depth - 0.06, 0.06, length - 0.12, mats.frame, 0, seat - 0.08, 0), 'cast');
  tag(addBox(bench, depth, 0.02, length, mats.bench, 0, seat - 0.04, 0), 'cast');
  const slat = (depth - 0.03) / 3;
  for (let i = 0; i < 3; i++) {
    const sx = -depth / 2 + 0.015 + slat / 2 + i * slat;
    tag(addBox(bench, slat - 0.012, 0.02, length - 0.02, mats.bench, sx, seat - 0.01, 0), 'cast');
  }
  bench.position.set(x, 0, z);
  bench.rotation.y = rot;
  g.add(bench);
}

function buildBenches(g, mats, layout) {
  const b = layout.architecture.benches;
  b.lace.forEach((p) => buildBench(g, mats, p.x, p.z, 0, b.laceLength, b.depth, b.seat));
  const s = b.spectator;
  buildBench(g, mats, s.x, s.z, s.rot, s.length, b.depth, b.seat);
}

function buildPlant(g, mats) {
  const x = -6.35;
  const z = 4.35;
  tag(addCyl(g, 0.09, 0.1, 0.05, mats.potSoil, x, 0.28, z, 10), 'cast');
  const leaves = [[0.12, 0.55, 0.02, 0.4], [-0.1, 0.48, -0.04, -0.5], [0.02, 0.62, 0.1, 0.2], [-0.02, 0.42, 0.08, 1.1]];
  leaves.forEach(([dx, h, dz, rot], i) => {
    const leaf = addBox(g, 0.16, 0.05, 0.09, i % 2 ? mats.leafDeep : mats.leaf, x + dx, h, z + dz);
    leaf.rotation.z = rot * 0.25;
    leaf.rotation.y = rot;
    tag(leaf, 'cast');
  });
}

function buildProcedural(layout) {
  const mats = palette();
  mats.carpet = toon('#a85b44', { map: carpetTexture() });
  mats.maple = toon('#e0b56e', { map: mapleTexture() });
  const g = new THREE.Group();
  g.name = 'rink';
  buildRinkFloor(g, mats, layout);
  buildRails(g, mats, layout);
  buildCubbies(g, mats, layout);
  buildCounter(g, mats, layout);
  buildBooth(g, mats, layout);
  buildEntry(g, mats, layout);
  buildLights(g, mats, layout);
  buildPlant(g, mats);
  buildBenches(g, mats, layout);
  const benchSkateY = layout.architecture.benches.seat;
  skate(g, mats, -5.95, benchSkateY, -1.9, -1.15, 'white');
  skate(g, mats, -5.95, benchSkateY, -1.48, -1.35, 'burgundy');
  return g;
}

boot({
  makeShell: (layout) => {
    const mats = palette();
    mats.carpet = toon('#a85b44', { map: carpetTexture() });
    return buildShell(layout, mats);
  },
  makeProcedural: buildProcedural,
  readyText: 'ready — roller rink · drag orbit · U unlit · T toon',
});
