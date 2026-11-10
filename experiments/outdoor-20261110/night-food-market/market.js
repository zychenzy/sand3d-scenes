import * as THREE from 'three';
import { boot, toon } from './scene_lib.js';

const mats = new Map();
function mat(color, opts) {
  const key = `${color}|${opts ? JSON.stringify(opts) : ''}`;
  if (!mats.has(key)) mats.set(key, toon(color, opts));
  return mats.get(key);
}

function box(parent, w, h, d, color, x, y, z, rotY = 0, opts = {}) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(color, opts));
  m.position.set(x, y, z);
  if (rotY) m.rotation.y = rotY;
  if (opts.cast === false) m.userData.castShadow = false;
  if (opts.receive === false) m.userData.receiveShadow = false;
  parent.add(m);
  return m;
}

function cyl(parent, rTop, rBot, h, color, x, y, z, seg = 12, opts = {}) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBot, h, seg), mat(color, opts));
  m.position.set(x, y, z);
  if (opts.rotX) m.rotation.x = opts.rotX;
  if (opts.cast === false) m.userData.castShadow = false;
  parent.add(m);
  return m;
}

function tube(parent, a, b, r, color) {
  const dir = new THREE.Vector3().subVectors(b, a);
  const len = dir.length();
  if (len < 1e-4) return null;
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, 6), mat(color));
  m.position.copy(a).add(b).multiplyScalar(0.5);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
  parent.add(m);
  return m;
}

function paintSign(spec) {
  const c = document.createElement('canvas');
  c.width = spec.pxW;
  c.height = spec.pxH;
  const g = c.getContext('2d');
  g.fillStyle = spec.bg;
  g.fillRect(0, 0, c.width, c.height);
  if (spec.border) {
    g.strokeStyle = spec.border;
    g.lineWidth = spec.borderWidth || 14;
    g.strokeRect(12, 12, c.width - 24, c.height - 24);
  }
  const lines = spec.lines;
  const total = lines.reduce((s, ln) => s + ln.px, 0);
  const gap = Math.max(8, (c.height - total) / (lines.length + 1));
  let y = 0;
  lines.forEach((ln) => {
    y += gap + ln.px / 2;
    g.fillStyle = ln.color;
    g.font = `${ln.weight || 700} ${ln.px}px "WenQuanYi Micro Hei", "Droid Sans Fallback", sans-serif`;
    g.textAlign = ln.align || 'center';
    g.textBaseline = 'middle';
    const x = g.textAlign === 'left' ? 36 : c.width / 2;
    g.fillText(ln.text, x, y);
    y += ln.px / 2;
  });
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  tex.needsUpdate = true;
  return tex;
}

function board(parent, w, h, tex, x, y, z, rotY, backColor) {
  const face = toon('#ffffff');
  face.map = tex;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), face);
  m.position.set(x, y, z);
  m.rotation.y = rotY || 0;
  const back = new THREE.Mesh(new THREE.BoxGeometry(w + 0.02, h + 0.02, 0.025), mat(backColor || '#3a2a1c'));
  back.position.set(0, 0, -0.018);
  m.add(back);
  parent.add(m);
  return m;
}

function signLines(lines, opt) {
  return paintSign({
    pxW: opt.pxW || 512,
    pxH: opt.pxH || 280,
    bg: opt.bg,
    border: opt.border || '#e6c98a',
    borderWidth: opt.borderWidth || 16,
    lines: lines.map((text, i) => ({
      text,
      px: opt.px ? opt.px[i] : (lines.length > 2 ? 72 : i === 0 ? 108 : 58),
      color: opt.colors ? opt.colors[i] : opt.fg,
      align: opt.align || 'center',
      weight: 700,
    })),
  });
}

function paperLantern(g, x, y, z, color) {
  const h = 0.32;
  const r = 0.135;
  cyl(g, r, r * 0.9, h, color, x, y, z, 14, { emissive: color, emissiveIntensity: 0.26 });
  cyl(g, r * 0.42, r * 0.42, 0.03, '#3a2c1c', x, y + h * 0.5 + 0.012, z, 8);
  cyl(g, r * 0.38, r * 0.38, 0.025, '#3a2c1c', x, y - h * 0.5, z, 8);
  cyl(g, 0.007, 0.007, 0.14, '#2a241c', x, y + h * 0.5 + 0.09, z, 5);
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI;
    box(g, 0.008, h * 0.82, 0.008, '#6a4a30', x + Math.cos(a) * r * 0.96, y, z + Math.sin(a) * r * 0.96);
  }
}

function bulb(g, x, y, z) {
  cyl(g, 0.04, 0.04, 0.055, '#ffd7a4', x, y, z, 10, { emissive: '#e8b070', emissiveIntensity: 0.4 });
}

function catenary(g, x0, z0, x1, z1, y0, y1, sag, samples) {
  const pts = [];
  for (let i = 0; i <= samples; i++) {
    const t = i / samples;
    const x = x0 + (x1 - x0) * t;
    const z = z0 + (z1 - z0) * t;
    const y = y0 + (y1 - y0) * t - Math.sin(Math.PI * t) * sag;
    pts.push(new THREE.Vector3(x, y, z));
  }
  const curve = new THREE.CatmullRomCurve3(pts);
  const mesh = new THREE.Mesh(new THREE.TubeGeometry(curve, samples * 3, 0.008, 5, false), mat('#241c16'));
  g.add(mesh);
  return pts;
}

function crate(g, x, bottom, z, sx, sy, sz, color = '#b06a38') {
  const t = 0.018;
  box(g, sx, t, sz, color, x, bottom + t / 2, z);
  box(g, t, sy, sz, '#8a552c', x - sx / 2 + t / 2, bottom + sy / 2, z);
  box(g, t, sy, sz, '#8a552c', x + sx / 2 - t / 2, bottom + sy / 2, z);
  box(g, sx, sy, t, color, x, bottom + sy / 2, z - sz / 2 + t / 2);
  box(g, sx, sy, t, color, x, bottom + sy / 2, z + sz / 2 - t / 2);
  return bottom + sy;
}

function gasCylinder(g, x, z, color) {
  cyl(g, 0.155, 0.155, 0.68, color, x, 0.34, z, 16);
  cyl(g, 0.168, 0.168, 0.035, '#e4e0d8', x, 0.6, z, 16);
  cyl(g, 0.07, 0.08, 0.07, '#d8dce0', x, 0.72, z, 12);
  cyl(g, 0.02, 0.02, 0.07, '#8d9398', x, 0.79, z, 6);
}

function makeGroundTexture(x0, x1, z0, z1, stalls) {
  const W = 1024;
  const H = 640;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  const width = x1 - x0;
  const depth = z1 - z0;
  function fill(cx, cz, w, d, color) {
    const px = ((cx - w / 2) - x0) / width * W;
    const pw = (w / width) * W;
    const v0 = (cz - d / 2 - z0) / depth;
    const v1 = (cz + d / 2 - z0) / depth;
    const py1 = (1 - v0) * H;
    const py0 = (1 - v1) * H;
    ctx.fillStyle = color;
    ctx.fillRect(px, Math.min(py0, py1), pw, Math.abs(py1 - py0));
  }
  ctx.fillStyle = '#6a645b';
  ctx.fillRect(0, 0, W, H);
  const tones = ['#726c64', '#6e6860', '#767068', '#6a645c'];
  let row = 0;
  for (let z = -0.05; z < z1 - 0.35; z += 0.78) {
    const shift = (row % 2) * 0.36;
    for (let x = -6.8; x < 6.5; x += 0.84) {
      const n = Math.abs(Math.sin(x * 2.3 + z * 1.7 + row));
      fill(x + shift, z, 0.76, 0.68, tones[Math.floor(n * tones.length) % tones.length]);
    }
    row += 1;
  }
  fill(0, -5.05, 13.4, 1.28, '#5a544c');
  fill(0, -5.08, 13.2, 0.08, '#2c2926');
  fill(0, -1.25, 12.6, 1.55, '#746e64');
  for (const s of stalls) {
    fill(s.x, -3.15, s.w * 0.92, 1.85, '#8a7056');
  }
  const img = ctx.getImageData(0, 0, W, H);
  const d = img.data;
  for (let y = 0; y < H; y += 1) {
    for (let x = 0; x < W; x += 1) {
      const i = (y * W + x) * 4;
      const n = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
      const f = (n - Math.floor(n)) * 5 - 2.5;
      d[i] = Math.max(0, Math.min(255, d[i] + f));
      d[i + 1] = Math.max(0, Math.min(255, d[i + 1] + f));
      d[i + 2] = Math.max(0, Math.min(255, d[i + 2] + f * 0.75));
    }
  }
  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  tex.needsUpdate = true;
  return tex;
}

function makeShell(layout) {
  const g = new THREE.Group();
  g.name = 'shell';
  const curb = layout.zones.curbZ;
  const x0 = -10;
  const x1 = 10;
  const z0 = -7.5;
  const z1 = curb - 0.06;
  const width = x1 - x0;
  const depth = z1 - z0;
  const geo = new THREE.PlaneGeometry(width, depth, 1, 1);
  geo.rotateX(-Math.PI / 2);
  geo.translate((x0 + x1) / 2, 0, (z0 + z1) / 2);
  const pos = geo.attributes.position;
  const uv = geo.attributes.uv;
  for (let i = 0; i < pos.count; i++) {
    uv.setXY(i, (pos.getX(i) - x0) / width, (pos.getZ(i) - z0) / depth);
  }
  uv.needsUpdate = true;
  const ground = new THREE.Mesh(geo, toon('#ffffff'));
  ground.material.map = makeGroundTexture(x0, x1, z0, z1, layout.stalls);
  ground.userData.castShadow = false;
  g.add(ground);

  const streetDepth = 9.4 - curb;
  const street = new THREE.Mesh(new THREE.PlaneGeometry(20, streetDepth), mat('#3c3a38'));
  street.rotation.x = -Math.PI / 2;
  street.position.set(0, -0.09, curb + streetDepth / 2);
  street.userData.castShadow = false;
  g.add(street);
  for (let i = 0; i < 4; i++) {
    box(g, 0.7, 0.008, 0.08, '#d5d0c6', -2.2 + i * 1.5, -0.084, curb + 1.15, 0, { cast: false });
  }
  box(g, 15.6, 0.09, 0.12, '#8a8276', -0.2, -0.045, curb - 0.02);

  const wallZ = -6.28;
  box(g, 16.4, 4.1, 0.16, '#465066', 0, 2.05, wallZ, 0, { cast: false });
  for (const px of [-6.5, -3.3, -0.1, 3.15, 6.3]) {
    box(g, 0.12, 4.1, 0.08, '#3a4456', px, 2.05, wallZ + 0.1, 0, { cast: false });
  }
  const windows = [
    { x: -4.9, warm: false },
    { x: -1.7, warm: true },
    { x: 1.7, warm: false },
    { x: 4.5, warm: true },
  ];
  for (const w of windows) {
    const opts = w.warm ? { emissive: '#c48a48', emissiveIntensity: 0.2, cast: false } : { cast: false };
    box(g, 0.92, 1.12, 0.04, w.warm ? '#e2b16e' : '#2c384c', w.x, 2.55, wallZ + 0.1, 0, opts);
    box(g, 1.04, 0.045, 0.06, '#2c261e', w.x, 3.14, wallZ + 0.12, 0, { cast: false });
    box(g, 1.04, 0.045, 0.06, '#2c261e', w.x, 1.96, wallZ + 0.12, 0, { cast: false });
  }
  for (let i = 0; i < 8; i++) {
    box(g, 1.28, 0.07, 0.035, i % 2 ? '#6d6556' : '#514a40', 5.85, 0.22 + i * 0.2, wallZ + 0.12, 0, { cast: false });
  }
  box(g, 0.16, 3.3, 1.7, '#465066', -8.15, 1.65, -5.45, 0, { cast: false });

  const wallCopy = layout.copy.wall;
  const wallTex = signLines(wallCopy, { pxW: 256, pxH: 480, bg: '#8a2a32', fg: '#f6e7c4', border: '#e6c98a', px: [150, 150] });
  board(g, 0.42, 0.7, wallTex, -7.15, 2.85, wallZ + 0.16, 0, '#5a2428');
  return g;
}

function fabricAwning(g, stall) {
  const { x, frontZ, w, d, awning, valance, yFront, yBack } = stall;
  const zBack = frontZ - d + 0.06;
  const zFront = frontZ + 0.36;
  const span = zFront - zBack;
  const geo = new THREE.PlaneGeometry(w * 0.98, span, 14, 8);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const px = pos.getX(i);
    const pz = pos.getZ(i);
    const v = (pz + span / 2) / span;
    const u = px / (w * 0.49);
    const sag = (1 - u * u) * (0.04 + 0.028 * v);
    pos.setY(i, yBack + (yFront - yBack) * v - sag);
  }
  geo.computeVertexNormals();
  const cloth = new THREE.Mesh(geo, mat(awning, { side: THREE.DoubleSide }));
  cloth.position.set(x, 0, (zBack + zFront) / 2);
  g.add(cloth);
  const inset = w * 0.46;
  for (const sx of [-1, 1]) {
    cyl(g, 0.028, 0.03, yBack, '#2c3034', x + sx * inset, yBack / 2, zBack, 8);
    cyl(g, 0.026, 0.028, yFront, '#2c3034', x + sx * inset, yFront / 2, zFront, 8);
  }
  box(g, w * 0.94, 0.035, 0.035, '#2c3034', x, yFront, zFront);
  box(g, w * 0.94, 0.03, 0.03, '#2c3034', x, yBack - 0.02, zBack);
  const tabs = 8;
  for (let i = 0; i < tabs; i++) {
    const tx = x - w * 0.44 + (i + 0.5) * ((w * 0.88) / tabs);
    const th = 0.09 + (i % 2) * 0.04;
    box(g, (w * 0.88) / tabs * 0.72, th, 0.012, valance, tx, yFront - th / 2 - 0.01, zFront + 0.02);
  }
  const bulbs = Math.max(4, Math.round(w / 0.48));
  for (let i = 0; i < bulbs; i++) {
    const tx = x - w * 0.38 + (i + 0.5) * ((w * 0.76) / bulbs);
    bulb(g, tx, yFront - 0.1, zFront - 0.08);
  }
  return { zBack, zFront };
}

function frontSign(g, stall, lines, opt) {
  const tex = signLines(lines, opt);
  const w = opt.signW || Math.min(1.15, stall.w * 0.42);
  board(g, w, 0.34, tex, stall.x + (opt.signX || 0), 1.48, stall.frontZ + 0.2, 0, opt.back || '#3a2718');
}

function banner(g, stall, ch) {
  const tex = signLines([ch], {
    pxW: 256,
    pxH: 512,
    bg: stall.bannerBg,
    fg: stall.bannerFg,
    border: stall.bannerFg,
    px: [168],
  });
  board(g, 0.26, 0.7, tex, stall.x - stall.w * 0.38, 1.58, stall.frontZ + 0.08, 0, stall.bannerBg);
}

function grillKit(g, stall, copy) {
  const top = 0.95;
  const { x, frontZ } = stall;
  box(g, stall.w * 0.62, 0.55, 0.04, '#3e444a', x, 1.45, frontZ - stall.d + 0.42, 0, { cast: false });
  box(g, 0.72, 0.14, 0.36, '#2a2e32', x - 0.05, top + 0.07, frontZ - 0.34);
  box(g, 0.58, 0.045, 0.24, '#c45a28', x - 0.05, top + 0.13, frontZ - 0.34, 0, { emissive: '#d2643a', emissiveIntensity: 0.22 });
  for (let i = 0; i < 8; i++) {
    box(g, 0.64, 0.012, 0.012, '#9aa1a6', x - 0.05, top + 0.17, frontZ - 0.48 + i * 0.04);
  }
  for (let i = 0; i < 5; i++) {
    const sx = x - 0.28 + i * 0.12;
    const grp = new THREE.Group();
    tube(grp, new THREE.Vector3(0, 0, -0.15), new THREE.Vector3(0, 0, 0.15), 0.006, '#c2a06a');
    box(grp, 0.032, 0.03, 0.04, '#7a342c', 0, 0, -0.05);
    box(grp, 0.028, 0.026, 0.034, '#e2c27a', 0, 0, 0.005);
    box(grp, 0.034, 0.03, 0.04, '#8a4030', 0, 0, 0.055);
    grp.position.set(sx, top + 0.24, frontZ - 0.32);
    grp.rotation.x = -0.55;
    g.add(grp);
  }
  tube(g, new THREE.Vector3(x + 0.42, top + 0.02, frontZ - 0.18), new THREE.Vector3(x + 0.68, top + 0.05, frontZ - 0.46), 0.008, '#2a2e32');
  tube(g, new THREE.Vector3(x + 0.46, top + 0.02, frontZ - 0.16), new THREE.Vector3(x + 0.72, top + 0.04, frontZ - 0.44), 0.008, '#2a2e32');
  box(g, 0.32, 0.02, 0.2, '#c4a06a', x + 0.72, top + 0.01, frontZ - 0.3);
  const card = signLines(copy.skewerCard, { pxW: 256, pxH: 128, bg: '#e07a32', fg: '#2a140c', border: '#f2d2a4', px: [58] });
  board(g, 0.22, 0.11, card, x + 0.55, top + 0.12, frontZ - 0.16, -0.4, '#a85a22');
}

function bowlMesh(g, x, y, z, glaze, fill) {
  const pts = [
    new THREE.Vector2(0.018, 0),
    new THREE.Vector2(0.048, 0.01),
    new THREE.Vector2(0.07, 0.04),
    new THREE.Vector2(0.078, 0.06),
    new THREE.Vector2(0.062, 0.055),
    new THREE.Vector2(0.04, 0.03),
    new THREE.Vector2(0.02, 0.012),
  ];
  const m = new THREE.Mesh(new THREE.LatheGeometry(pts, 12), mat(glaze));
  m.position.set(x, y, z);
  g.add(m);
  if (fill) cyl(g, 0.05, 0.05, 0.012, fill, x, y + 0.05, z, 10);
}

function noodleKit(g, stall, copy) {
  const top = 0.95;
  const { x, frontZ } = stall;
  const tex = signLines(copy.noodleMenu, {
    pxW: 512,
    pxH: 512,
    bg: '#f4e4aa',
    fg: '#7a1c1c',
    border: '#c45a28',
    align: 'left',
    px: [78, 78, 78, 78],
    colors: ['#7a1c1c', '#7a1c1c', '#7a1c1c', '#7a1c1c'],
  });
  board(g, 0.92, 0.84, tex, x + 0.82, 1.52, frontZ - stall.d + 0.58, 0.42, '#6a3a28');
  const pot = (px, pz, open) => {
    cyl(g, 0.155, 0.145, 0.2, '#c5c8c6', px, top + 0.1, pz, 16);
    cyl(g, 0.17, 0.17, 0.02, '#9aa0a4', px, top + 0.015, pz, 16);
    box(g, 0.055, 0.012, 0.018, '#33373a', px + 0.175, top + 0.12, pz);
    box(g, 0.055, 0.012, 0.018, '#33373a', px - 0.175, top + 0.12, pz);
    if (open) {
      cyl(g, 0.125, 0.125, 0.025, '#6a341f', px, top + 0.2, pz, 14);
      for (const [dy, rot] of [[0.215, 0.2], [0.232, 1.4]]) {
        const coil = new THREE.Mesh(new THREE.TorusGeometry(0.055, 0.012, 5, 12), mat('#ead7a4'));
        coil.rotation.x = Math.PI / 2;
        coil.rotation.z = rot;
        coil.position.set(px, top + dy, pz);
        g.add(coil);
      }
    } else {
      cyl(g, 0.15, 0.15, 0.02, '#e0e2de', px, top + 0.21, pz, 16);
    }
  };
  pot(x - 0.28, frontZ - 0.36, true);
  pot(x + 0.22, frontZ - 0.42, false);
  for (let i = 0; i < 4; i++) bowlMesh(g, x - 0.72, top + i * 0.018, frontZ - 0.28, '#f4f1ea');
  bowlMesh(g, x + 0.62, top, frontZ - 0.24, '#f7f4ee', '#c4a06a');
  tube(g, new THREE.Vector3(x + 0.55, top + 0.02, frontZ - 0.48), new THREE.Vector3(x + 0.78, top + 0.16, frontZ - 0.22), 0.01, '#c0c4c8');
  cyl(g, 0.045, 0.045, 0.03, '#ddd', x + 0.78, top + 0.18, frontZ - 0.2, 8);
  box(g, 0.08, 0.06, 0.1, '#1c140e', x - 0.95, top + 0.03, frontZ - 0.3);
  cyl(g, 0.006, 0.006, 0.16, '#f2efe6', x - 0.93, top + 0.1, frontZ - 0.28, 4, { rotX: Math.PI / 2 });
  cyl(g, 0.006, 0.006, 0.16, '#f2efe6', x - 0.96, top + 0.1, frontZ - 0.3, 4, { rotX: Math.PI / 2 });
}

function drinkKit(g, stall, copy) {
  const top = 0.95;
  const { x, frontZ } = stall;
  const tex = signLines(copy.drinkMenu, {
    pxW: 512,
    pxH: 420,
    bg: '#f7f1e4',
    fg: '#1e4a3c',
    border: '#2f6a45',
    align: 'left',
    px: [76, 76, 76],
    colors: ['#1e4a3c', '#1e4a3c', '#1e4a3c'],
  });
  board(g, 0.62, 0.5, tex, x - 0.15, 1.55, frontZ - stall.d + 0.5, 0, '#2a4034');
  cyl(g, 0.14, 0.16, 0.34, '#d5d8dc', x + 0.15, top + 0.17, frontZ - 0.36, 16);
  cyl(g, 0.09, 0.1, 0.07, '#9a3030', x + 0.15, top + 0.37, frontZ - 0.36, 12);
  cyl(g, 0.012, 0.012, 0.07, '#8a9096', x + 0.28, top + 0.16, frontZ - 0.36, 6, { rotX: Math.PI / 2 });
  for (let i = 0; i < 5; i++) {
    cyl(g, 0.034, 0.026, 0.09, '#f4efe4', x - 0.55, top + 0.045 + i * 0.07, frontZ - 0.28, 10);
  }
  box(g, 0.28, 0.02, 0.18, '#e7d7b0', x + 0.55, top + 0.01, frontZ - 0.26);
  cyl(g, 0.045, 0.045, 0.025, '#e2b423', x + 0.48, top + 0.03, frontZ - 0.22, 10);
  cyl(g, 0.04, 0.04, 0.022, '#7a9a32', x + 0.6, top + 0.028, frontZ - 0.3, 10);
  const bottles = [['#6a1e1e', 0.16], ['#1e4a3c', 0.2], ['#c4a05a', 0.14], ['#2c241c', 0.18]];
  bottles.forEach((b, i) => {
    cyl(g, 0.035, 0.04, b[1], b[0], x - 0.55 + i * 0.12, 0.78 + b[1] / 2, frontZ - stall.d + 0.62, 8);
  });
}

function produceKit(g, stall, copy) {
  const top = 0.95;
  const { x, frontZ } = stall;
  const prices = copy.producePrices;
  const putCard = (text, cx, cy, cz) => {
    const tex = signLines([text], { pxW: 256, pxH: 128, bg: '#f0e2c0', fg: '#2a1c12', border: '#6a5030', px: [54] });
    board(g, 0.18, 0.09, tex, cx, cy, cz, 0.2, '#6a5030');
  };
  const pile = (cx, bottom, cz, kind) => {
    if (kind === 'cabbage') {
      cyl(g, 0.12, 0.15, 0.2, '#d5e2b0', cx, bottom + 0.1, cz, 8);
      box(g, 0.2, 0.22, 0.04, '#c5d6a0', cx + 0.03, bottom + 0.14, cz + 0.05);
      box(g, 0.16, 0.2, 0.035, '#e7f0c8', cx - 0.04, bottom + 0.16, cz - 0.03);
    } else if (kind === 'tomato') {
      for (const [dx, dz, s] of [[0, 0, 0.07], [0.09, 0.04, 0.05], [-0.07, 0.05, 0.055], [0.03, -0.07, 0.045]]) {
        const m = new THREE.Mesh(new THREE.SphereGeometry(s, 10, 8), mat('#b33a32'));
        m.position.set(cx + dx, bottom + s, cz + dz);
        g.add(m);
      }
    } else if (kind === 'scallion') {
      for (let i = 0; i < 6; i++) {
        cyl(g, 0.008, 0.01, 0.22, '#3e8a40', cx + (i - 2.5) * 0.018, bottom + 0.11, cz, 5);
        cyl(g, 0.01, 0.012, 0.06, '#e6e2d2', cx + (i - 2.5) * 0.018, bottom + 0.03, cz, 5);
      }
    } else if (kind === 'mango') {
      for (const [dx, dz] of [[0, 0], [0.08, 0.04], [-0.06, 0.05]]) {
        const m = new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 8), mat('#e2a03a'));
        m.scale.set(1.3, 0.75, 0.9);
        m.position.set(cx + dx, bottom + 0.04, cz + dz);
        g.add(m);
      }
    }
  };
  const rim = crate(g, x - 0.15, top, frontZ - 0.34, 0.5, 0.16, 0.36, '#c47a3a');
  pile(x - 0.22, rim, frontZ - 0.34, 'cabbage');
  pile(x + 0.05, rim, frontZ - 0.3, 'tomato');
  putCard(prices[0], x + 0.12, rim + 0.12, frontZ - 0.2);
  const g0 = crate(g, x - 0.55, 0, -2.24, 0.46, 0.2, 0.28, '#b56b34');
  pile(x - 0.55, g0, -2.24, 'scallion');
  putCard(prices[2], x - 0.38, g0 + 0.14, -2.14);
  const g1 = crate(g, x + 0.5, 0, -2.24, 0.46, 0.18, 0.28, '#a86430');
  pile(x + 0.5, g1, -2.24, 'mango');
  putCard(prices[1], x + 0.66, g1 + 0.12, -2.14);
  cyl(g, 0.004, 0.004, 0.28, '#888', x + 0.85, 1.55, frontZ - 0.2, 4);
  cyl(g, 0.08, 0.08, 0.025, '#f2f2f0', x + 0.85, 1.4, frontZ - 0.2, 12);
  cyl(g, 0.1, 0.07, 0.025, '#dedad2', x + 0.85, 1.22, frontZ - 0.2, 12);
}

const KITS = { grill: grillKit, noodles: noodleKit, drinks: drinkKit, produce: produceKit };
const FRONT_KEY = { grill: 'grillFront', noodles: 'noodleFront', drinks: 'drinkFront', produce: 'produceFront' };
const FRONT_STYLE = {
  grill: { bg: '#7a2430', fg: '#f6e3a4', border: '#f0d2a0', back: '#4a1820' },
  noodles: { bg: '#f3e2a0', fg: '#7a1e1e', border: '#c45a28', back: '#6a3a28', signX: -0.55, signW: 1.02 },
  drinks: { bg: '#1e4a3c', fg: '#f3ecd4', border: '#e7d7a4', back: '#143028' },
  produce: { bg: '#2a241c', fg: '#f4efe2', border: '#e7d7b0', back: '#3a2c1c' },
};

function buildStall(g, stall, copy) {
  const { x, frontZ, w, d, body, top } = stall;
  const counterD = 0.58;
  const counterZ = frontZ - counterD / 2;
  box(g, w * 0.9, 0.9, counterD, body, x, 0.45, counterZ);
  box(g, w * 0.96, 0.05, counterD + 0.05, top, x, 0.925, counterZ);
  box(g, w * 0.72, 0.62, 0.28, '#4a3828', x, 0.36, frontZ - d + 0.22);
  box(g, w * 0.76, 0.04, 0.32, '#6b5038', x, 0.7, frontZ - d + 0.22);
  fabricAwning(g, stall);
  frontSign(g, stall, copy[FRONT_KEY[stall.id]], FRONT_STYLE[stall.id]);
  banner(g, stall, stall.banner);
  KITS[stall.id](g, stall, copy);
}

function placeStorage(g, item) {
  if (item.type === 'gas') gasCylinder(g, item.x, item.z, item.color);
  else if (item.type === 'bin') {
    box(g, 0.42, 0.46, 0.42, item.color, item.x, 0.23, item.z);
    box(g, 0.46, 0.045, 0.46, '#e4e0d8', item.x, 0.48, item.z);
  } else if (item.type === 'crate') {
    let y = 0;
    for (let i = 0; i < (item.count || 1); i++) {
      y = crate(g, item.x + (i % 2) * 0.015, y, item.z, 0.46, 0.2, 0.34, '#a86430');
    }
  } else if (item.type === 'sack') {
    const m = new THREE.Mesh(new THREE.IcosahedronGeometry(0.16, 0), mat('#3e342c'));
    m.scale.set(1.15, 0.7, 0.95);
    m.position.set(item.x, 0.14, item.z);
    g.add(m);
  } else if (item.type === 'bucket') {
    cyl(g, 0.13, 0.1, 0.2, '#7f97a1', item.x, 0.1, item.z, 12);
  } else if (item.type === 'chest') {
    box(g, 0.62, 0.38, 0.38, '#e7e4de', item.x, 0.19, item.z);
    const pivot = new THREE.Group();
    pivot.position.set(item.x, 0.38, item.z - 0.19);
    pivot.rotation.x = -0.45;
    const lid = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.045, 0.38), mat('#d5dee2'));
    lid.position.set(0, 0.02, 0.19);
    pivot.add(lid);
    g.add(pivot);
  } else if (item.type === 'hose') {
    const curve = new THREE.CatmullRomCurve3(item.points.map((p) => new THREE.Vector3(...p)));
    g.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 28, 0.014, 6, false), mat(item.color)));
  }
}

function clump(g, x, y, z, sx, sy, sz, color) {
  const m = new THREE.Mesh(new THREE.IcosahedronGeometry(1, 0), mat(color));
  m.scale.set(sx, sy, sz);
  m.position.set(x, y, z);
  g.add(m);
}

function plants(g, layout) {
  cyl(g, 0.045, 0.08, 1.55, '#5a4030', 7.7, 0.78, -0.15, 8);
  const branch = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.03, 0.7, 6), mat('#5a4030'));
  branch.position.set(8.05, 1.7, -0.05);
  branch.rotation.z = -0.9;
  g.add(branch);
  clump(g, 7.35, 2.15, 0.15, 0.42, 0.3, 0.36, '#1d4030');
  clump(g, 8.05, 2.45, -0.25, 0.34, 0.4, 0.3, '#2c5640');
  clump(g, 7.55, 1.7, 0.35, 0.28, 0.2, 0.24, '#173628');
  clump(g, 7.95, 2.05, 0.2, 0.22, 0.26, 0.2, '#24543a');

  cyl(g, 0.035, 0.055, 1.7, '#4e3828', -7.55, 0.85, -5.55, 7);
  clump(g, -7.55, 2.15, -5.5, 0.28, 0.42, 0.26, '#234838');
  clump(g, -7.4, 2.55, -5.6, 0.22, 0.32, 0.2, '#1a382c');
  clump(g, -7.7, 1.85, -5.4, 0.2, 0.24, 0.18, '#2a5340');

  clump(g, 6.35, 0.22, 3.15, 0.26, 0.14, 0.2, '#24543a');
  clump(g, 6.7, 0.4, 2.55, 0.18, 0.26, 0.16, '#1c3e2e');
  clump(g, 7.05, 0.18, 2.9, 0.16, 0.1, 0.14, '#316348');

  for (const inst of layout.instances) {
    if (inst.kind !== 'flowerpot') continue;
    const [x, , z] = inst.position;
    if (inst.id === 'pot_produce') {
      cyl(g, 0.02, 0.025, 0.28, '#3e6a32', x, 0.48, z, 6);
      clump(g, x, 0.72, z, 0.16, 0.14, 0.14, '#2f6a3a');
      clump(g, x + 0.06, 0.84, z - 0.03, 0.1, 0.1, 0.1, '#3d7a48');
    } else if (inst.id === 'pot_tree') {
      cyl(g, 0.012, 0.018, 0.2, '#4a5a32', x, 0.42, z, 6);
      clump(g, x, 0.58, z, 0.1, 0.08, 0.09, '#2a5a34');
      clump(g, x + 0.05, 0.68, z - 0.02, 0.07, 0.07, 0.06, '#3a6a40');
      clump(g, x - 0.04, 0.64, z + 0.03, 0.06, 0.06, 0.05, '#1e4a30');
    } else {
      cyl(g, 0.012, 0.016, 0.18, '#4a5a32', x, 0.4, z, 5);
      clump(g, x, 0.55, z, 0.12, 0.1, 0.12, '#3a6844');
    }
  }
}

function bike(g, x, z, rot) {
  const grp = new THREE.Group();
  const frame = '#3a3e44';
  const wheel = (wx) => {
    const m = new THREE.Mesh(new THREE.TorusGeometry(0.27, 0.018, 6, 16), mat(frame));
    m.position.set(wx, 0.27, 0);
    grp.add(m);
  };
  wheel(-0.46);
  wheel(0.46);
  tube(grp, new THREE.Vector3(-0.46, 0.27, 0), new THREE.Vector3(-0.05, 0.48, 0), 0.015, frame);
  tube(grp, new THREE.Vector3(-0.05, 0.48, 0), new THREE.Vector3(0.28, 0.27, 0), 0.015, frame);
  tube(grp, new THREE.Vector3(0.28, 0.27, 0), new THREE.Vector3(0.46, 0.27, 0), 0.015, frame);
  tube(grp, new THREE.Vector3(-0.05, 0.48, 0), new THREE.Vector3(-0.02, 0.62, 0), 0.012, frame);
  tube(grp, new THREE.Vector3(0.32, 0.42, 0), new THREE.Vector3(0.46, 0.58, 0), 0.012, frame);
  box(grp, 0.12, 0.03, 0.08, '#6a3a30', -0.02, 0.64, 0);
  grp.position.set(x, 0, z);
  grp.rotation.y = rot;
  g.add(grp);
}

function tableDressing(g, layout) {
  const long = layout.seating.find((t) => t.id === 'table_long');
  const spots = [[0.15, 0.05], [-0.28, -0.12]];
  for (const [lx, lz] of spots) {
    const c = Math.cos(long.rot);
    const s = Math.sin(long.rot);
    const x = long.x + lx * c + lz * s;
    const z = long.z - lx * s + lz * c;
    bowlMesh(g, x, 0.76, z, '#f7f4ee', '#6a341f');
  }
  const c = Math.cos(long.rot);
  const s = Math.sin(long.rot);
  const lx = 0.42;
  const lz = -0.05;
  tube(
    g,
    new THREE.Vector3(long.x + (lx - 0.08) * c + lz * s, 0.78, long.z - (lx - 0.08) * s + lz * c),
    new THREE.Vector3(long.x + (lx + 0.08) * c + lz * s, 0.78, long.z - (lx + 0.08) * s + lz * c),
    0.006,
    '#f4f1ea',
  );
}

function makeProcedural(layout) {
  const g = new THREE.Group();
  g.name = 'procedural';
  for (const stall of layout.stalls) buildStall(g, stall, layout.copy);
  for (const item of layout.storage) placeStorage(g, item);

  const frontWire = catenary(g, -6.7, -2.02, 6.25, -2.02, 2.72, 2.68, 0.16, 18);
  const lanternColors = ['#e7b15a', '#c4493a', '#f0dcb0', '#d36a32', '#e7b15a'];
  [0.08, 0.28, 0.5, 0.72, 0.92].forEach((t, i) => {
    const p = frontWire[Math.round(t * (frontWire.length - 1))];
    paperLantern(g, p.x, p.y - 0.32, p.z + 0.05, lanternColors[i]);
  });
  const social = catenary(g, -5.4, 1.85, 5.0, 0.55, 3.15, 3.05, 0.42, 16);
  ['#c4493a', '#f0dcb0', '#e7b15a', '#c4493a'].forEach((color, i) => {
    const p = social[Math.round((0.18 + i * 0.2) * (social.length - 1))];
    paperLantern(g, p.x, p.y - 0.3, p.z, color);
  });

  plants(g, layout);
  bike(g, -7.55, 2.55, 0.55);
  tableDressing(g, layout);
  return g;
}

boot({
  makeShell,
  makeProcedural,
  readyText: 'ready — night food market · drag orbit · U unlit · T toon',
});
