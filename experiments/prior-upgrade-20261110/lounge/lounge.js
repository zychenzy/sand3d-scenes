import * as THREE from 'three';
import { boot, toon, addBox, addCyl, addSphere, makeCutawayShell } from './scene_lib.js';

/** Footprint of the baked pool table after targetHeight scaling. Long axis is Z. */
export function tableFootprint(layout) {
  const t = layout.meta.table;
  const [nw, nh, nd] = t.native;
  const s = t.targetHeight / nh;
  const [x, , z] = t.position;
  const halfX = (nw * s) / 2;
  const halfZ = (nd * s) / 2;
  const c = t.cueClearance;
  return {
    s, x, z, halfX, halfZ, top: t.targetHeight, cue: t.cueLength,
    minX: x - halfX, maxX: x + halfX, minZ: z - halfZ, maxZ: z + halfZ,
    clearMinX: x - halfX - c, clearMaxX: x + halfX + c,
    clearMinZ: z - halfZ - c, clearMaxZ: z + halfZ + c,
  };
}

function shellColor(layout, key, fallback) {
  return (layout.shell && layout.shell[key]) || fallback;
}

function decal(mesh) {
  mesh.userData.noCast = true;
  mesh.userData.noReceive = true;
  mesh.castShadow = false;
  mesh.receiveShadow = false;
  return mesh;
}

function woodFloor(g, W, D) {
  const colors = ['#6e4a2e', '#5c3e26', '#7a5334', '#51361f', '#664428', '#5a3c22'];
  const mats = colors.map((c) => toon(c));
  const bw = 0.18;
  const cols = Math.ceil(W / bw);
  const x0 = -W / 2;
  for (let c = 0; c < cols; c++) {
    let z = -D / 2;
    let i = 0;
    const stagger = (c % 2) * 0.42;
    while (z < D / 2 - 0.02) {
      const full = 0.88 + ((c * 5 + i * 3) % 5) * 0.14;
      const len = i === 0 ? Math.max(0.26, full - stagger) : full;
      const z1 = Math.min(z + len, D / 2);
      const h = z1 - z;
      if (h > 0.12) {
        const m = addBox(
          g, bw - 0.012, 0.018, h - 0.01,
          mats[(c + i) % mats.length],
          x0 + c * bw + bw / 2, 0.01, (z + z1) / 2,
        );
        m.userData.noCast = true;
      }
      z = z1;
      i += 1;
      if (i > 22) break;
    }
  }
}

function contact(g, x, z, rx, rz, opacity = 0.34) {
  const m = new THREE.Mesh(
    new THREE.CircleGeometry(1, 18),
    toon('#140e0c', {
      transparent: true, opacity, depthWrite: false,
      polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2,
    }),
  );
  m.rotation.x = -Math.PI / 2;
  m.scale.set(rx, rz, 1);
  m.position.set(x, 0.038, z);
  m.renderOrder = 2;
  decal(m);
  g.add(m);
}

function makeShell(layout) {
  const g = makeCutawayShell(layout, { wainscotH: 1.08, ceiling: false });
  const { width: W, depth: D, height: H } = layout.meta.room;
  const wood = toon(shellColor(layout, 'woodColor', '#4a2e1c'));
  const brass = toon(shellColor(layout, 'brassColor', '#c4a050'));
  const ceilMat = toon(shellColor(layout, 'ceilingColor', '#e8dfd0'));
  const panel = toon('#5a3824');
  const sage = toon(shellColor(layout, 'wallColor', '#4a5c54'));
  const accent = toon(shellColor(layout, 'accentColor', '#2a6a4a'));
  const fp = tableFootprint(layout);

  woodFloor(g, W, D);

  const rugW = fp.halfX * 2 + 0.62;
  const rugD = fp.halfZ * 2 + 0.7;
  const rug = addBox(g, rugW, 0.014, rugD, toon('#1a3a28'), fp.x, 0.024, fp.z);
  rug.userData.noCast = true;
  addBox(g, rugW + 0.08, 0.01, 0.04, brass, fp.x, 0.03, fp.z - rugD / 2);
  addBox(g, rugW + 0.08, 0.01, 0.04, brass, fp.x, 0.03, fp.z + rugD / 2);
  addBox(g, 0.04, 0.01, rugD, brass, fp.x - rugW / 2, 0.03, fp.z);
  addBox(g, 0.04, 0.01, rugD, brass, fp.x + rugW / 2, 0.03, fp.z);

  const bx0 = fp.clearMinX;
  const bx1 = fp.clearMaxX;
  const bz0 = fp.clearMinZ;
  const bz1 = fp.clearMaxZ;
  const bw = bx1 - bx0;
  const bd = bz1 - bz0;
  const strip = (w, d, x, z) => {
    const m = addBox(g, w, 0.008, d, brass, x, 0.027, z);
    m.userData.noCast = true;
    return m;
  };
  strip(bw, 0.026, (bx0 + bx1) / 2, bz0);
  strip(bw, 0.026, (bx0 + bx1) / 2, bz1);
  strip(0.026, bd, bx0, (bz0 + bz1) / 2);
  strip(0.026, bd, bx1, (bz0 + bz1) / 2);
  for (const [x, z] of [[bx0, bz0], [bx1, bz0], [bx0, bz1], [bx1, bz1]]) {
    const dot = addCyl(g, 0.04, 0.04, 0.012, brass, x, 0.03, z, 10);
    dot.userData.noCast = true;
  }

  const recess = toon('#3a2418');
  for (let x = -4.8; x <= 4.8; x += 1.0) {
    addBox(g, 0.78, 0.82, 0.016, panel, x, 0.56, -D / 2 + 0.14);
    addBox(g, 0.54, 0.58, 0.014, recess, x, 0.56, -D / 2 + 0.155);
  }
  for (let z = -3.8; z <= 3.6; z += 1.0) {
    addBox(g, 0.016, 0.82, 0.78, panel, -W / 2 + 0.14, 0.56, z);
    addBox(g, 0.014, 0.58, 0.54, recess, -W / 2 + 0.155, 0.56, z);
  }

  addBox(g, W - 0.2, 0.055, 0.04, wood, 0, 1.1, -D / 2 + 0.15);
  addBox(g, 0.04, 0.055, D - 0.35, wood, -W / 2 + 0.15, 1.1, -0.1);
  addBox(g, W - 0.18, 0.05, 0.04, wood, 0, 2.52, -D / 2 + 0.12);
  addBox(g, 0.04, 0.05, D - 0.45, wood, -W / 2 + 0.12, 2.52, -0.2);
  addBox(g, W - 0.12, 0.07, 0.07, wood, 0, H - 0.06, -D / 2 + 0.08);
  addBox(g, 0.07, 0.07, D - 0.2, wood, -W / 2 + 0.08, H - 0.06, 0);

  const ceil = addBox(g, W - 0.18, 0.08, 7.15, ceilMat, -0.06, H - 0.05, -0.55);
  ceil.userData.noCast = true;
  const beam = toon('#3a2818');
  for (const z of [-3.4, -1.6, 0.35, 2.2]) {
    addBox(g, W - 0.55, 0.13, 0.1, beam, -0.08, H - 0.16, z);
  }
  addBox(g, 0.1, 0.12, 2.45, beam, fp.x, H - 0.2, fp.z);

  const win = layout.anchors.window;
  addBox(g, 2.0, 1.62, 0.05, toon('#1a2740'), win[0], win[1], win[2]);
  addBox(g, 2.16, 0.055, 0.07, wood, win[0], win[1] + 0.84, -D / 2 + 0.16);
  addBox(g, 2.16, 0.055, 0.07, wood, win[0], win[1] - 0.84, -D / 2 + 0.16);
  addBox(g, 0.055, 1.7, 0.07, wood, win[0] - 1.04, win[1], -D / 2 + 0.16);
  addBox(g, 0.055, 1.7, 0.07, wood, win[0] + 1.04, win[1], -D / 2 + 0.16);
  addBox(g, 0.04, 1.56, 0.04, wood, win[0], win[1], -D / 2 + 0.18);
  addBox(g, 1.9, 0.04, 0.04, wood, win[0], win[1], -D / 2 + 0.18);
  addBox(g, 0.26, 1.78, 0.05, accent, win[0] - 1.22, win[1] - 0.04, -D / 2 + 0.2);
  addBox(g, 0.26, 1.78, 0.05, accent, win[0] + 1.22, win[1] - 0.04, -D / 2 + 0.2);
  addBox(g, 2.48, 0.1, 0.07, accent, win[0], win[1] + 0.94, -D / 2 + 0.2);
  addBox(g, 1.65, 0.38, 0.2, wood, win[0], 0.26, -D / 2 + 0.22);

  for (const x of [-2.85, -1.85]) {
    addBox(g, 0.48, 0.62, 0.035, brass, x, 2.02, -D / 2 + 0.14);
    addBox(g, 0.36, 0.48, 0.022, toon('#243830'), x, 2.02, -D / 2 + 0.165);
    const head = addCyl(g, 0.065, 0.065, 0.018, toon('#e4c8a4'), x, 2.12, -D / 2 + 0.19, 12);
    head.rotation.x = Math.PI / 2;
    addBox(g, 0.15, 0.15, 0.018, sage, x, 1.94, -D / 2 + 0.185);
  }

  for (const x of [-4.55, 1.35]) {
    addBox(g, 0.11, H - 0.22, 0.07, wood, x, H / 2 - 0.04, -D / 2 + 0.16);
  }
  return g;
}

function canvasTex(draw, w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');
  draw(ctx, w, h);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  tex.needsUpdate = true;
  return tex;
}

function rulesTexture() {
  return canvasTex((ctx, w, h) => {
    ctx.fillStyle = '#1c1812';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#c4a050';
    ctx.lineWidth = 14;
    ctx.strokeRect(12, 12, w - 24, h - 24);
    ctx.fillStyle = '#f3e6c4';
    ctx.textAlign = 'center';
    ctx.font = '600 46px Georgia, "Liberation Serif", serif';
    ctx.fillText('LOUNGE RULES', w / 2, 88);
    ctx.textAlign = 'left';
    ctx.font = '30px Georgia, "Liberation Serif", serif';
    const lines = [
      '1  Cue inside the brass',
      '2  Call the pocket',
      '3  No sitting on rails',
      '4  Winner racks',
      '5  Soft voices after ten',
    ];
    lines.forEach((line, i) => ctx.fillText(line, 42, 170 + i * 68));
  }, 640, 720);
}

function buildCue(len, opts = {}) {
  const g = new THREE.Group();
  const butt = opts.butt || '#6a3a22';
  const shaft = opts.shaft || '#e6d2a2';
  const wrap = opts.wrap || '#1c1c1c';
  const buttLen = len * 0.27;
  const wrapLen = len * 0.07;
  const tipLen = 0.028;
  const ferrule = 0.02;
  const shaftLen = Math.max(0.2, len - buttLen - wrapLen - tipLen - ferrule);
  const parts = [
    [buttLen, 0.013, 0.016, butt],
    [wrapLen, 0.014, 0.014, wrap],
    [shaftLen, 0.007, 0.012, shaft],
    [ferrule, 0.0062, 0.0066, '#f4f1ea'],
    [tipLen, 0.0054, 0.006, '#2f6fe0'],
  ];
  let y = -len / 2;
  for (const [h, rTop, rBot, col] of parts) {
    addCyl(g, rTop, rBot, h, toon(col), 0, y + h / 2, 0, 8);
    y += h;
  }
  return g;
}

function placeCue(parent, from, to, opts) {
  const a = new THREE.Vector3(...from);
  const b = new THREE.Vector3(...to);
  const dir = new THREE.Vector3().subVectors(b, a);
  const len = dir.length();
  const cue = buildCue(len, opts);
  cue.position.copy(a).add(b).multiplyScalar(0.5);
  cue.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
  parent.add(cue);
  return cue;
}

function cueRack(parent, origin, count, seed) {
  const g = new THREE.Group();
  const wood = toon('#5c3b24');
  const dark = toon('#2c1c12');
  const span = 0.1 + count * 0.085;
  addBox(g, 0.05, 1.42, span, wood, 0, 1.05, 0);
  addBox(g, 0.1, 0.045, span + 0.04, dark, 0.04, 1.68, 0);
  addBox(g, 0.16, 0.05, span + 0.04, dark, 0.05, 0.4, 0);
  addBox(g, 0.12, 0.035, span, wood, 0.05, 0.95, 0);
  const woods = [
    { butt: '#6a3a22', shaft: '#e6d2a2', wrap: '#1c1c1c' },
    { butt: '#2a1a12', shaft: '#d8c090', wrap: '#6b1e1e' },
    { butt: '#7a4a28', shaft: '#f0ddb0', wrap: '#14283c' },
    { butt: '#4a2e1c', shaft: '#e2c898', wrap: '#1c1c1c' },
  ];
  for (let i = 0; i < count; i++) {
    const z = -span / 2 + 0.08 + i * 0.085;
    placeCue(
      g,
      [0.07, 0.42, z],
      [0.16, 1.78, z],
      woods[(i + seed) % woods.length],
    );
  }
  g.position.set(origin[0], origin[1], origin[2]);
  parent.add(g);
  return g;
}

function sconce(g, x, y, z) {
  const brass = toon('#b08a45');
  addBox(g, 0.12, 0.2, 0.03, brass, x, y, z);
  addCyl(g, 0.035, 0.055, 0.08, brass, x, y - 0.02, z + 0.05, 8);
  addSphere(g, 0.035, toon('#fff1c8', { emissive: '#ffd898', emissiveIntensity: 1.4 }), x, y - 0.02, z + 0.08, 10);
}

function bottle(g, x, y, z, h, glass) {
  addCyl(g, h * 0.1, h * 0.12, h * 0.7, toon(glass), x, y + h * 0.35, z, 8);
  addCyl(g, h * 0.035, h * 0.07, h * 0.2, toon(glass), x, y + h * 0.78, z, 8);
  addCyl(g, h * 0.04, h * 0.04, 0.03, toon('#f2efe6'), x, y + h * 0.9, z, 8);
}

function stripeBall(g, x, y, z, r, color) {
  addSphere(g, r, toon('#f4f1ea'), x, y, z, 12);
  const band = new THREE.Mesh(
    new THREE.TorusGeometry(r * 0.72, r * 0.28, 8, 14),
    toon(color),
  );
  band.rotation.x = Math.PI / 2;
  band.position.set(x, y, z);
  band.castShadow = true;
  g.add(band);
}

function ballTray(g, x, y, z) {
  const wood = toon('#4a2e1c');
  addBox(g, 0.42, 0.025, 0.16, wood, x, y, z);
  addBox(g, 0.42, 0.03, 0.012, wood, x, y + 0.02, z - 0.074);
  addBox(g, 0.42, 0.03, 0.012, wood, x, y + 0.02, z + 0.074);
  const colors = ['#f4f1ea', '#e2b423', '#1d4e9c', '#c4312a', '#5a2d86', '#111111'];
  colors.forEach((col, i) => {
    addSphere(g, 0.026, toon(col), x - 0.16 + i * 0.062, y + 0.04, z, 12);
  });
  stripeBall(g, x + 0.2, y + 0.04, z, 0.026, '#c4312a');
}

function woodenTriangle(g, x, y, z) {
  const wood = toon('#3a2414');
  const shape = new THREE.Shape();
  shape.moveTo(0, 0.22);
  shape.lineTo(-0.2, -0.16);
  shape.lineTo(0.2, -0.16);
  shape.closePath();
  const hole = new THREE.Path();
  hole.moveTo(0, 0.12);
  hole.lineTo(-0.12, -0.1);
  hole.lineTo(0.12, -0.1);
  hole.closePath();
  shape.holes.push(hole);
  const mesh = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: 0.03, bevelEnabled: false }), wood);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  g.add(mesh);
}

function beadScorer(g, x, y, z) {
  const wood = toon('#4a2e1c');
  const brass = toon('#c4a050');
  const dark = toon('#1a140e');
  addBox(g, 1.72, 0.62, 0.06, wood, x, y, z);
  addBox(g, 1.6, 0.03, 0.04, brass, x, y + 0.28, z + 0.04);
  addBox(g, 1.6, 0.03, 0.04, brass, x, y - 0.28, z + 0.04);
  addBox(g, 1.52, 0.42, 0.02, dark, x, y, z + 0.02);
  addCyl(g, 0.01, 0.01, 1.28, brass, x, y + 0.1, z + 0.05, 8).rotation.z = Math.PI / 2;
  addCyl(g, 0.01, 0.01, 1.28, brass, x, y - 0.1, z + 0.05, 8).rotation.z = Math.PI / 2;
  const home = ['#d8c090', '#d8c090', '#d8c090', '#d8c090', '#c4312a', '#c4312a', '#c4312a', '#c4312a', '#c4312a', '#c4312a'];
  const guest = ['#2a6a4a', '#2a6a4a', '#2a6a4a', '#2a6a4a', '#2a6a4a', '#2a6a4a', '#e2b423', '#e2b423', '#e2b423', '#e2b423'];
  home.forEach((col, i) => addSphere(g, 0.028, toon(col), x - 0.55 + i * 0.12, y + 0.1, z + 0.07, 10));
  guest.forEach((col, i) => addSphere(g, 0.028, toon(col), x - 0.55 + i * 0.12, y - 0.1, z + 0.07, 10));
  addBox(g, 0.12, 0.08, 0.03, toon('#f3e6c4'), x - 0.72, y + 0.1, z + 0.06);
  addBox(g, 0.12, 0.08, 0.03, toon('#f3e6c4'), x - 0.72, y - 0.1, z + 0.06);
}

function tableDressing(g, fp) {
  const brass = toon('#c4a050');
  const spots = [-0.78, -0.38, 0.38, 0.78];
  for (const t of spots) {
    const zz = fp.z + t * fp.halfZ;
    for (const side of [-1, 1]) {
      const d = addBox(g, 0.012, 0.03, 0.03, brass, fp.x + side * (fp.halfX + 0.008), fp.top - 0.07, zz);
      d.rotation.z = side * 0.4;
      d.userData.noCast = true;
    }
  }
  placeCue(
    g,
    [fp.x + fp.halfX - 0.07, fp.top + 0.014, fp.z - 1.18],
    [fp.x + fp.halfX - 0.07, fp.top + 0.014, fp.z - 0.05],
    { butt: '#6a3a22', shaft: '#e8d4a6', wrap: '#6b1e1e' },
  );
  addBox(g, 0.028, 0.02, 0.028, toon('#2a5bd0'), fp.x + fp.halfX - 0.1, fp.top + 0.016, fp.z + 0.78);
  addBox(g, 0.026, 0.018, 0.026, toon('#2a5bd0'), fp.x - fp.halfX + 0.1, fp.top + 0.014, fp.z - 0.85);

  const tipZ = fp.maxZ + 0.02;
  const horiz = Math.sqrt(fp.cue * fp.cue - 0.78 * 0.78);
  placeCue(
    g,
    [fp.x + 0.38, 0.04, tipZ + horiz],
    [fp.x + 0.38, fp.top + 0.02, tipZ],
    { butt: '#4a2e1c', shaft: '#f0ddb0', wrap: '#1c1c1c' },
  );
}

function makeProcedural(layout) {
  const g = new THREE.Group();
  g.name = 'procedural';
  const fp = tableFootprint(layout);
  const { height: H } = layout.meta.room;
  const a = layout.anchors;
  const wood = toon('#5c3b24');
  const dark = toon('#2a1c12');
  const brass = toon('#c4a050');
  const green = toon('#1e4a34');
  const glow = toon('#fff1cc', { emissive: '#ffd898', emissiveIntensity: 1.35 });

  const ly = 1.74;
  const shadeL = 2.12;
  const shadeW = 0.92;
  addBox(g, shadeW, 0.045, shadeL, green, fp.x, ly + 0.16, fp.z);
  const innerTop = toon('#fff0d0', { emissive: '#ffd090', emissiveIntensity: 0.9, side: THREE.BackSide });
  addBox(g, shadeW - 0.08, 0.02, shadeL - 0.08, innerTop, fp.x, ly + 0.13, fp.z);
  addBox(g, 0.045, 0.3, shadeL, green, fp.x - shadeW / 2, ly, fp.z);
  addBox(g, 0.045, 0.3, shadeL, green, fp.x + shadeW / 2, ly, fp.z);
  addBox(g, shadeW, 0.3, 0.045, green, fp.x, ly, fp.z - shadeL / 2);
  addBox(g, shadeW, 0.3, 0.045, green, fp.x, ly, fp.z + shadeL / 2);
  const lipMat = toon('#fff3d4', { emissive: '#ffc878', emissiveIntensity: 1.15, side: THREE.DoubleSide });
  const glowPlane = new THREE.Mesh(new THREE.PlaneGeometry(shadeW - 0.16, shadeL - 0.16), lipMat);
  glowPlane.rotation.x = Math.PI / 2;
  glowPlane.position.set(fp.x, ly - 0.16, fp.z);
  glowPlane.userData.noCast = true;
  g.add(glowPlane);
  addBox(g, shadeW + 0.06, 0.025, 0.035, brass, fp.x, ly - 0.15, fp.z - shadeL / 2);
  addBox(g, shadeW + 0.06, 0.025, 0.035, brass, fp.x, ly - 0.15, fp.z + shadeL / 2);
  addBox(g, 0.035, 0.025, shadeL + 0.04, brass, fp.x - shadeW / 2, ly - 0.15, fp.z);
  addBox(g, 0.035, 0.025, shadeL + 0.04, brass, fp.x + shadeW / 2, ly - 0.15, fp.z);
  for (const dz of [-0.66, 0, 0.66]) {
    addSphere(g, 0.04, glow, fp.x, ly + 0.02, fp.z + dz, 10);
    addCyl(g, 0.018, 0.018, 0.04, brass, fp.x, ly + 0.12, fp.z + dz, 6);
  }
  for (const dz of [-0.7, 0.7]) {
    addCyl(g, 0.012, 0.012, H - 0.22 - (ly + 0.18), brass, fp.x, (H - 0.2 + ly + 0.18) / 2, fp.z + dz, 6);
  }
  addCyl(g, 0.26, 0.26, 0.03, toon('#f3efe6'), fp.x, H - 0.12, fp.z, 20);
  addCyl(g, 0.08, 0.1, 0.04, brass, fp.x, H - 0.18, fp.z, 10);

  tableDressing(g, fp);

  cueRack(g, a.rackA, 6, 0);
  cueRack(g, a.rackB, 5, 2);

  const stand = a.cueStand;
  addBox(g, 0.28, 0.05, 0.22, wood, stand[0], 0.04, stand[2]);
  addBox(g, 0.04, 0.7, 0.22, wood, stand[0] + 0.1, 0.38, stand[2]);
  for (let i = 0; i < 3; i++) {
    placeCue(
      g,
      [stand[0] - 0.02, 0.06, stand[2] - 0.06 + i * 0.06],
      [stand[0] + 0.06, 1.5, stand[2] - 0.06 + i * 0.06],
      { butt: '#5a341c', shaft: '#ead6ae', wrap: '#1a1a1a' },
    );
  }

  beadScorer(g, a.beads[0], a.beads[1], a.beads[2]);
  sconce(g, a.beads[0] - 1.05, a.beads[1] + 0.18, a.beads[2] + 0.02);
  sconce(g, a.beads[0] + 1.05, a.beads[1] + 0.18, a.beads[2] + 0.02);
  woodenTriangle(g, a.triangle[0], a.triangle[1], a.triangle[2] + 0.02);

  const rules = a.rules;
  addBox(g, 0.06, 0.95, 0.7, wood, rules[0], rules[1], rules[2]);
  const rulesMap = rulesTexture();
  const rulesMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(0.58, 0.78),
    toon('#ffffff', { map: rulesMap, emissive: '#ffffff', emissiveMap: rulesMap, emissiveIntensity: 0.38 }),
  );
  rulesMesh.position.set(rules[0] + 0.04, rules[1], rules[2]);
  rulesMesh.rotation.y = Math.PI / 2;
  rulesMesh.userData.noCast = true;
  g.add(rulesMesh);

  addBox(g, 0.04, 0.82, 2.05, toon('#1a2428'), -5.26, 1.7, 2.95);
  addBox(g, 0.03, 0.9, 2.18, brass, -5.28, 1.7, 2.95);
  addBox(g, 0.16, 0.04, 2.1, wood, -5.14, 1.4, 2.95);
  addBox(g, 0.16, 0.04, 2.1, wood, -5.14, 1.9, 2.95);
  const bottleColors = ['#6a8a4a', '#c4a05a', '#8a3030', '#d8d2c4', '#3a5a48', '#a87840'];
  for (let i = 0; i < 8; i++) {
    const z = 2.1 + i * 0.23;
    bottle(g, -5.14, 1.42, z, 0.28 + (i % 3) * 0.04, bottleColors[i % bottleColors.length]);
    if (i % 2 === 0) bottle(g, -5.14, 1.92, z + 0.08, 0.22, bottleColors[(i + 2) % bottleColors.length]);
  }
  bottle(g, -4.55, 1.05, 2.25, 0.26, '#6a8a4a');
  bottle(g, -4.68, 1.05, 3.7, 0.3, '#c4a05a');

  const mat = addBox(g, 0.88, 0.012, 2.05, toon('#1c1a18'), -3.85, 0.028, 2.95);
  mat.userData.noCast = true;
  addCyl(g, 0.025, 0.025, 1.8, brass, -4.12, 0.16, 2.95, 8).rotation.x = Math.PI / 2;
  addCyl(g, 0.02, 0.02, 0.16, brass, -4.12, 0.08, 2.1, 6);
  addCyl(g, 0.02, 0.02, 0.16, brass, -4.12, 0.08, 3.8, 6);

  for (const inst of layout.instances) {
    if (inst.kind !== 'pendant_lamp') continue;
    const [x, y, z] = inst.position;
    const cap = y + (layout.assets.pendant_lamp.targetHeight || 0.44);
    addCyl(g, 0.006, 0.006, Math.max(0.05, H - 0.12 - cap), toon('#222'), x, (cap + H - 0.12) / 2, z, 5);
  }

  const cons = a.console;
  addBox(g, 1.5, 0.72, 0.34, wood, cons[0], 0.36, cons[2]);
  addBox(g, 1.55, 0.04, 0.38, dark, cons[0], 0.74, cons[2]);
  addBox(g, 0.06, 0.68, 0.06, dark, cons[0] - 0.66, 0.34, cons[2] - 0.1);
  addBox(g, 0.06, 0.68, 0.06, dark, cons[0] + 0.66, 0.34, cons[2] - 0.1);
  ballTray(g, cons[0] - 0.2, 0.78, cons[2]);
  addCyl(g, 0.05, 0.06, 0.08, toon('#2a5bd0'), cons[0] + 0.42, 0.8, cons[2], 8);
  addCyl(g, 0.05, 0.06, 0.08, toon('#2a5bd0'), cons[0] + 0.54, 0.8, cons[2], 8);

  const foliage = toon('#2f6a3c');
  const foliage2 = toon('#3e7a48');
  for (const inst of layout.instances) {
    if (inst.kind !== 'flowerpot') continue;
    const [x, y, z] = inst.position;
    const top = y + (layout.assets.flowerpot.targetHeight || 0.24);
    addSphere(g, 0.14, foliage, x, top + 0.12, z, 10);
    addSphere(g, 0.09, foliage2, x + 0.06, top + 0.08, z + 0.04, 8);
  }

  contact(g, fp.x, fp.z, fp.halfX * 0.72, fp.halfZ * 0.72, 0.28);
  const radii = {
    bar_stool: [0.22, 0.22],
    sofa_solid: [0.78, 0.48],
    dining_chair: [0.18, 0.2],
    coffee_table: [0.28, 0.42],
    flowerpot: [0.12, 0.12],
    bar_counter: [0.55, 1.05],
  };
  for (const inst of layout.instances) {
    const r = radii[inst.kind];
    if (!r || inst.position[1] > 0.2) continue;
    contact(g, inst.position[0], inst.position[2], r[0], r[1], inst.kind === 'bar_counter' ? 0.22 : 0.3);
  }

  return g;
}

boot({
  makeShell,
  makeProcedural,
  readyText: 'ready — billiards lounge · drag orbit · U unlit · T toon',
});
