import * as THREE from 'three';
import { boot, toon, addBox, addCyl, addPlane } from './scene_lib.js';

window.__errors = window.__errors || [];
window.addEventListener('error', (e) => window.__errors.push(String(e.message || e.error || e)));

const INK = '#1c140f';
const PAPER = '#f4ecdc';
const FELT = '#1c3930';
const FELT_B = '#24342c';
const CINNABAR = '#b13a32';
const CELADON = '#8eaea0';
const WOOD = '#6b442c';
const WOOD_DEEP = '#4e3122';
const WOOD_LIT = '#c4925a';
const STONE = '#2c2926';
const BRASS = '#b08a4e';

const texCache = new Map();

function canvasTex(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  t.needsUpdate = true;
  return t;
}

function feltMap() {
  return canvasTex(128, 128, (g, w, h) => {
    g.fillStyle = '#1b3830';
    g.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 3) {
      g.strokeStyle = y % 6 === 0 ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.12)';
      g.beginPath();
      g.moveTo(0, y);
      g.lineTo(w, y);
      g.stroke();
    }
    for (let x = 0; x < w; x += 4) {
      g.strokeStyle = 'rgba(0,0,0,0.08)';
      g.beginPath();
      g.moveTo(x, 0);
      g.lineTo(x, h);
      g.stroke();
    }
  });
}

function ribbon(ctx, pts, width) {
  if (pts.length < 2) return;
  const left = [];
  const right = [];
  for (let i = 0; i < pts.length; i++) {
    const a = pts[Math.max(0, i - 1)];
    const b = pts[Math.min(pts.length - 1, i + 1)];
    let dx = b[0] - a[0];
    let dy = b[1] - a[1];
    const len = Math.hypot(dx, dy) || 1;
    dx /= len;
    dy /= len;
    const t = i / (pts.length - 1);
    const taper = Math.sin(Math.PI * t) ** 0.55;
    const w = width * (0.22 + 0.78 * taper);
    left.push([pts[i][0] - dy * w, pts[i][1] + dx * w]);
    right.push([pts[i][0] + dy * w, pts[i][1] - dx * w]);
  }
  ctx.beginPath();
  ctx.moveTo(left[0][0], left[0][1]);
  for (let i = 1; i < left.length; i++) ctx.lineTo(left[i][0], left[i][1]);
  for (let i = right.length - 1; i >= 0; i--) ctx.lineTo(right[i][0], right[i][1]);
  ctx.closePath();
  ctx.fill();
}

function stroke(ctx, pts, width, x, y, w, h) {
  const px = pts.map((p) => [x + p[0] * w, y + (1 - p[1]) * h]);
  ribbon(ctx, px, width * Math.min(w, h));
}

const YONG = [
  { n: 1, w: 0.07, pts: [[0.46, 0.93], [0.56, 0.86], [0.5, 0.8]] },
  { n: 2, w: 0.055, pts: [[0.16, 0.74], [0.46, 0.76], [0.8, 0.72]] },
  { n: 3, w: 0.05, pts: [[0.4, 0.74], [0.39, 0.5], [0.36, 0.28]] },
  { n: 4, w: 0.045, pts: [[0.36, 0.3], [0.28, 0.22], [0.18, 0.25]] },
  { n: 5, w: 0.04, pts: [[0.4, 0.58], [0.56, 0.64], [0.7, 0.6]] },
  { n: 6, w: 0.042, pts: [[0.4, 0.55], [0.26, 0.44], [0.12, 0.36]] },
  { n: 7, w: 0.05, pts: [[0.38, 0.46], [0.2, 0.26], [0.06, 0.1]] },
  { n: 8, w: 0.058, pts: [[0.42, 0.4], [0.6, 0.24], [0.8, 0.08], [0.9, 0.06]] },
];

const SHAN = [
  { w: 0.055, pts: [[0.28, 0.72], [0.22, 0.22]] },
  { w: 0.06, pts: [[0.5, 0.92], [0.5, 0.18]] },
  { w: 0.055, pts: [[0.74, 0.7], [0.8, 0.22]] },
  { w: 0.05, pts: [[0.12, 0.2], [0.5, 0.16], [0.9, 0.18]] },
];

const SHUI = [
  { w: 0.05, pts: [[0.48, 0.9], [0.46, 0.55], [0.4, 0.28], [0.3, 0.2]] },
  { w: 0.045, pts: [[0.46, 0.62], [0.28, 0.5], [0.12, 0.32]] },
  { w: 0.04, pts: [[0.5, 0.48], [0.66, 0.36], [0.58, 0.22]] },
  { w: 0.055, pts: [[0.52, 0.42], [0.72, 0.22], [0.88, 0.1]] },
];

function strokesFor(motif) {
  if (motif.startsWith('shan')) return { set: SHAN, count: SHAN.length };
  if (motif.startsWith('shui')) return { set: SHUI, count: SHUI.length };
  if (motif === 'yong-start') return { set: YONG, count: 3 };
  if (motif === 'yong-mid') return { set: YONG, count: 5 };
  if (motif === 'cleared') return { set: YONG, count: 0 };
  return { set: YONG, count: YONG.length };
}

function paperTexture(motif) {
  if (texCache.has(motif)) return texCache.get(motif);
  const teach = motif === 'yong-teach';
  const grid = motif.startsWith('grid');
  const tex = canvasTex(teach ? 640 : 512, teach ? 800 : 512, (g, w, h) => {
    g.fillStyle = PAPER;
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 900; i++) {
      g.strokeStyle = `rgba(120, 86, 48, ${Math.random() * 0.07})`;
      g.beginPath();
      const x = Math.random() * w;
      const y = Math.random() * h;
      g.moveTo(x, y);
      g.lineTo(x + Math.random() * 22, y + Math.random() * 2);
      g.stroke();
    }
    const margin = Math.round(Math.min(w, h) * 0.1);
    if (grid) {
      g.strokeStyle = 'rgba(176, 64, 56, 0.45)';
      g.lineWidth = 2;
      g.strokeRect(margin, margin, w - margin * 2, h - margin * 2);
      g.beginPath();
      g.moveTo(w / 2, margin);
      g.lineTo(w / 2, h - margin);
      g.moveTo(margin, h / 2);
      g.lineTo(w - margin, h / 2);
      g.moveTo(margin, margin);
      g.lineTo(w - margin, h - margin);
      g.moveTo(w - margin, margin);
      g.lineTo(margin, h - margin);
      g.stroke();
    }
    const spec = strokesFor(motif);
    g.fillStyle = motif === 'yong-start' || motif === 'yong-mid' ? '#3a3128' : INK;
    spec.set.slice(0, spec.count).forEach((s) => {
      stroke(g, s.pts, s.w, margin, margin, w - margin * 2, h - margin * 2);
    });
    if (teach) {
      g.font = 'bold 28px sans-serif';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      spec.set.forEach((s) => {
        const p = s.pts[0];
        const x = margin + p[0] * (w - margin * 2);
        const y = margin + (1 - p[1]) * (h - margin * 2);
        g.fillStyle = CINNABAR;
        g.beginPath();
        g.arc(x - 18, y - 16, 14, 0, Math.PI * 2);
        g.fill();
        g.fillStyle = '#f6efe6';
        g.fillText(String(s.n), x - 18, y - 15);
      });
    }
    if (motif === 'yong-marked' || motif === 'yong-full') {
      g.strokeStyle = CINNABAR;
      g.lineWidth = 4;
      g.beginPath();
      g.arc(w * 0.78, h * 0.78, motif === 'yong-marked' ? 36 : 22, 0, Math.PI * 2);
      g.stroke();
    }
    if (motif === 'yong-large' || motif === 'yong-full' || teach) {
      g.fillStyle = CINNABAR;
      const s = Math.round(Math.min(w, h) * 0.1);
      g.fillRect(w - margin - s, h - margin - s, s, s);
      g.globalCompositeOperation = 'destination-out';
      g.fillStyle = '#fff';
      g.fillRect(w - margin - s + 6, h - margin - s + 6, s - 12, s - 12);
      g.globalCompositeOperation = 'source-over';
      g.strokeStyle = 'rgba(255,255,255,0.85)';
      g.lineWidth = 3;
      g.strokeRect(w - margin - s + 10, h - margin - s + 10, s - 20, s - 20);
    }
  });
  texCache.set(motif, tex);
  return tex;
}

function landscapeTexture() {
  return canvasTex(256, 512, (g, w, h) => {
    g.fillStyle = '#f3ead8';
    g.fillRect(0, 0, w, h);
    g.fillStyle = INK;
    stroke(g, [[0.05, 0.42], [0.28, 0.62], [0.4, 0.48], [0.55, 0.7], [0.78, 0.5], [0.95, 0.58]], 0.03, 10, 20, w - 20, h * 0.55);
    stroke(g, [[0.1, 0.28], [0.35, 0.4], [0.6, 0.3], [0.9, 0.38]], 0.02, 10, h * 0.35, w - 20, h * 0.4);
    g.fillStyle = 'rgba(28,20,15,0.85)';
    for (let i = 0; i < 5; i++) {
      g.fillRect(30 + i * 18, h * 0.72, 8, 18 + (i % 3) * 10);
    }
  });
}

const FELT_TEX = { current: null };
function feltMaterial(hex) {
  if (!FELT_TEX.current) FELT_TEX.current = feltMap();
  return toon(hex, { map: FELT_TEX.current });
}

function writingTable(parent, block) {
  const g = new THREE.Group();
  g.name = block.id;
  g.position.set(block.x, block.y || 0, block.z);
  const topT = 0.05;
  const h = block.h;
  const wood = block.color || WOOD_LIT;
  addBox(g, block.w, topT, block.d, toon(wood), 0, h - topT / 2, 0);
  addBox(g, block.w - 0.06, 0.018, block.d - 0.05, toon(WOOD_DEEP), 0, h - topT - 0.008, 0);
  const legH = h - topT;
  const ix = block.w / 2 - 0.14;
  const iz = block.d / 2 - 0.1;
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      addBox(g, 0.07, legH, 0.07, toon(WOOD_DEEP), sx * ix, legH / 2, sz * iz);
    }
  }
  addBox(g, block.w - 0.4, 0.04, 0.045, toon(WOOD_DEEP), 0, 0.14, 0);
  parent.add(g);
}

function sheet(parent, x, y, z, w, h, motif, yaw = 0, rotX = -Math.PI / 2) {
  const grp = new THREE.Group();
  grp.position.set(x, y, z);
  grp.rotation.y = yaw;
  const mat = toon(PAPER, { map: paperTexture(motif), side: THREE.DoubleSide });
  const plane = addPlane(grp, w, h, mat, 0, 0, 0);
  plane.rotation.x = rotX;
  plane.castShadow = false;
  parent.add(grp);
  return grp;
}

function felt(parent, x, y, z, w, d, hex = FELT) {
  addBox(parent, w, 0.008, d, feltMaterial(hex), x, y + 0.004, z);
}

function inkstone(parent, x, y, z, s = 1) {
  addBox(parent, 0.16 * s, 0.028 * s, 0.11 * s, toon(STONE), x, y + 0.016 * s, z);
  addCyl(parent, 0.034 * s, 0.03 * s, 0.01 * s, toon('#141210'), x + 0.02 * s, y + 0.03 * s, z, 14);
  addBox(parent, 0.018 * s, 0.012 * s, 0.07 * s, toon('#1a1614'), x - 0.05 * s, y + 0.032 * s, z + 0.01 * s);
}

function waterDish(parent, x, y, z) {
  addCyl(parent, 0.046, 0.038, 0.02, toon(CELADON), x, y + 0.012, z, 16);
  addCyl(parent, 0.03, 0.03, 0.008, toon('#1a1814'), x, y + 0.02, z, 14);
}

function weight(parent, x, y, z) {
  addBox(parent, 0.09, 0.012, 0.02, toon(BRASS), x, y + 0.012, z);
}

function sealBox(parent, x, y, z) {
  addCyl(parent, 0.026, 0.03, 0.02, toon(CINNABAR), x, y + 0.012, z, 12);
  addCyl(parent, 0.02, 0.02, 0.006, toon('#f0d2c8'), x, y + 0.024, z, 12);
}

function lyingBrush(parent, x, y, z, yaw, scale = 1, wet = true) {
  const spin = new THREE.Group();
  const lay = new THREE.Group();
  lay.rotation.z = Math.PI / 2;
  spin.add(lay);
  addCyl(lay, 0.007 * scale, 0.008 * scale, 0.16 * scale, toon('#c4a36c'), 0, -0.01 * scale, 0, 8);
  addCyl(lay, 0.009 * scale, 0.009 * scale, 0.016 * scale, toon('#241c18'), 0, 0.08 * scale, 0, 8);
  addCyl(lay, 0.004 * scale, 0.011 * scale, 0.05 * scale, toon(wet ? '#16120e' : '#4a4036'), 0, 0.11 * scale, 0, 8);
  spin.rotation.y = yaw;
  spin.position.set(x, y + 0.014 * scale, z);
  parent.add(spin);
}

function brushPot(parent, x, y, z, n = 3) {
  addCyl(parent, 0.04, 0.034, 0.09, toon('#6e3a32'), x, y + 0.048, z, 12);
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const g = new THREE.Group();
    addCyl(g, 0.005, 0.006, 0.16, toon('#c4a36c'), 0, 0.08, 0, 6);
    addCyl(g, 0.004, 0.009, 0.04, toon('#2a221c'), 0, 0.17, 0, 6);
    g.position.set(x + Math.cos(a) * 0.012, y + 0.05, z + Math.sin(a) * 0.012);
    g.rotation.z = Math.cos(a) * 0.12;
    g.rotation.x = Math.sin(a) * 0.1;
    parent.add(g);
  }
}

function dressStation(parent, st, top) {
  const large = st.variant === 'yong-large';
  const feltW = large ? 0.78 : 0.5;
  const feltD = large ? 0.4 : 0.32;
  const hex = st.variant === 'cleared' ? FELT_B : (st.variant.startsWith('grid') ? '#18342e' : FELT);
  felt(parent, st.x, top, st.z, feltW, feltD, hex);
  if (st.variant === 'cleared') {
    brushPot(parent, st.x + 0.22, top, st.z - 0.02, 2);
    return;
  }
  sheet(parent, st.x - (large ? 0.02 : 0), top + 0.012, st.z, large ? 0.46 : 0.3, large ? 0.32 : 0.24, st.variant, st.yaw || 0);
  inkstone(parent, st.x + (large ? 0.32 : 0.2), top, st.z - 0.02, large ? 1.15 : 1);
  waterDish(parent, st.x + (large ? 0.32 : 0.2), top, st.z + 0.1);
  if (st.variant !== 'yong-start') weight(parent, st.x - 0.16, top, st.z + 0.1);
  if (st.variant === 'shan' || st.variant === 'shui') brushPot(parent, st.x - 0.22, top, st.z - 0.06, 3);
  else lyingBrush(parent, st.x + 0.02, top, st.z + 0.12, (st.yaw || 0) + 0.4, large ? 1.25 : 1, st.variant !== 'yong-mid');
  if (st.variant === 'yong-marked' || st.variant === 'yong-full') sealBox(parent, st.x + 0.16, top, st.z + 0.12);
}

function scroll(parent, spec) {
  const y = spec.y + spec.h / 2;
  const rod = toon(WOOD_DEEP);
  addCyl(parent, 0.018, 0.018, spec.w + 0.08, rod, spec.x, spec.y + spec.h + 0.02, spec.z, 10).rotation.z = Math.PI / 2;
  addCyl(parent, 0.016, 0.016, spec.w + 0.04, rod, spec.x, spec.y - 0.02, spec.z, 10).rotation.z = Math.PI / 2;
  const silk = spec.motif === 'yong-teach' ? '#6e2e38' : '#243246';
  addPlane(parent, spec.w + 0.06, spec.h + 0.04, toon(silk), spec.x, y, spec.z - 0.008);
  const plane = addPlane(parent, spec.w, spec.h, toon(PAPER, { map: paperTexture(spec.motif) }), spec.x, y, spec.z);
  plane.castShadow = false;
  addBox(parent, 0.012, 0.08, 0.012, toon(CINNABAR), spec.x, spec.y - 0.08, spec.z);
}

function pin(parent, spec) {
  addBox(parent, spec.w + 0.03, spec.h + 0.03, 0.012, toon(WOOD), spec.x, spec.y + spec.h / 2, spec.z - 0.01);
  const plane = addPlane(
    parent,
    spec.w,
    spec.h,
    toon(PAPER, { map: paperTexture(spec.motif) }),
    spec.x,
    spec.y + spec.h / 2,
    spec.z,
  );
  plane.castShadow = false;
  addCyl(parent, 0.012, 0.012, 0.012, toon(CINNABAR), spec.x, spec.y + spec.h - 0.02, spec.z + 0.01, 8);
}

function lantern(parent, x, y, z) {
  const g = new THREE.Group();
  addCyl(g, 0.006, 0.006, 0.42, toon(WOOD_DEEP), 0, 0.36, 0, 6);
  addCyl(g, 0.16, 0.16, 0.02, toon(WOOD_DEEP), 0, 0.16, 0, 6);
  addCyl(g, 0.15, 0.15, 0.02, toon(WOOD_DEEP), 0, -0.16, 0, 6);
  addCyl(
    g,
    0.145,
    0.145,
    0.3,
    toon('#f0d7a8', { emissive: '#ffb86a', emissiveIntensity: 0.55, side: THREE.DoubleSide }),
    0,
    0,
    0,
    6,
  );
  addCyl(g, 0.008, 0.014, 0.14, toon(CINNABAR), 0, -0.28, 0, 6);
  g.position.set(x, y, z);
  parent.add(g);
}

function bamboo(parent, x, y, z, h, n, lean = 0) {
  for (let i = 0; i < n; i++) {
    const cx = x + (i - (n - 1) / 2) * 0.09;
    const ch = h * (0.72 + ((i * 3) % 5) * 0.06);
    const grp = new THREE.Group();
    addCyl(grp, 0.012, 0.018, ch, toon(i % 2 ? '#3f6b48' : '#2f553c'), 0, ch / 2, 0, 6);
    for (let k = 1; k <= 4; k++) addCyl(grp, 0.022, 0.022, 0.012, toon('#234232'), 0, ch * (k / 5), 0, 6);
    addBox(grp, 0.16, 0.012, 0.05, toon('#2c5a3e'), 0.08, ch * 0.72, 0);
    addBox(grp, 0.14, 0.012, 0.045, toon('#356848'), -0.07, ch * 0.58, 0.02);
    grp.position.set(cx, y, z);
    grp.rotation.z = lean + (i - n / 2) * 0.04;
    parent.add(grp);
  }
}

function fillCase(parent, inst) {
  const bases = [0.05, 0.55, 1.06, 1.57];
  const colors = ['#243246', '#6e2e28', '#c4a36c', '#3e4a40', '#8a5a3a', '#1c140f', '#d8c7a4'];
  bases.forEach((base, shelf) => {
    const count = shelf === 3 ? 4 : 5;
    for (let i = 0; i < count; i++) {
      const x = inst.position[0] + (i - (count - 1) / 2) * 0.15;
      const z = inst.position[2] + 0.05;
      if (shelf === 1 && i === 0) {
        addCyl(parent, 0.05, 0.05, 0.22, toon('#e7dcc4'), x, base + 0.11, z, 12);
      } else if (shelf === 2 && i === count - 1) {
        for (let k = 0; k < 4; k++) {
          addBox(parent, 0.2, 0.012, 0.14, toon(k % 2 ? PAPER : '#e4d3b4'), x, base + 0.01 + k * 0.014, z);
        }
      } else {
        const bh = 0.26 + (i % 3) * 0.04;
        addBox(parent, 0.035 + (i % 2) * 0.02, bh, 0.16, toon(colors[(i + shelf * 2) % colors.length]), x, base + bh / 2, z);
      }
    }
  });
}

function shelfGoods(parent, inst) {
  const y0 = inst.position[1];
  const x = inst.position[0] + 0.1;
  const z = inst.position[2];
  addBox(parent, 0.16, 0.08, 0.1, toon('#6e3a32'), x, y0 + 0.18, z);
  addBox(parent, 0.12, 0.05, 0.08, toon(WOOD_LIT), x, y0 + 0.6, z + 0.04);
  brushPot(parent, x - 0.02, y0 + 0.16, z - 0.02, 3);
}

function makeShell(layout) {
  const g = new THREE.Group();
  g.name = 'shell';
  const { width: W, depth: D, height: H } = layout.meta.room;
  const s = layout.shell;
  const arch = layout.architecture;
  const T = arch.wallThickness;
  const plaster = toon(s.wallColor);
  const wain = toon(s.wainscot);
  const wood = toon(s.woodColor);
  const woodL = toon(s.woodLight);
  const ink = toon(INK);
  const ceil = toon(s.ceilingColor);

  addBox(g, W, 0.08, D, toon(s.floorAlt), 0, -0.04, 0);
  const pitch = 0.22;
  let i = 0;
  for (let x = -W / 2 + 0.16; x < W / 2 - 0.1; x += pitch) {
    addBox(g, 0.2, 0.012, D - 0.2, toon(i % 2 ? s.floorColor : s.floorAlt), x, 0.006, 0);
    i += 1;
  }
  addBox(g, W - 0.08, 0.02, 0.1, ink, 0, 0.012, -D / 2 + 0.12);
  addBox(g, 0.1, 0.02, D - 0.16, ink, -W / 2 + 0.12, 0.012, 0);
  addBox(g, 0.78, 0.01, 5.4, toon('#2a3138'), -0.45, 0.016, 0.85);
  addBox(g, 0.04, 0.012, 5.4, toon(CINNABAR), -0.45 - 0.38, 0.02, 0.85);
  addBox(g, 0.04, 0.012, 5.4, toon(CINNABAR), -0.45 + 0.38, 0.02, 0.85);

  const backZ = -D / 2 + T / 2;
  const leftX = -W / 2 + T / 2;
  addBox(g, W, H, T, plaster, 0, H / 2, backZ);
  addBox(g, W - 0.2, 0.9, 0.04, wain, 0, 0.45, backZ + T / 2 + 0.02);
  addBox(g, W - 0.2, 0.04, 0.06, woodL, 0, 0.92, backZ + T / 2 + 0.03);
  addBox(g, W - 0.3, 0.035, 0.05, wood, 0, 2.55, backZ + T / 2 + 0.03);

  const wins = arch.windows;
  const zStops = [-D / 2, ...wins.flatMap((w) => [w.z0, w.z1]), D / 2];
  for (let k = 0; k < zStops.length; k += 2) {
    const z0 = zStops[k];
    const z1 = zStops[k + 1];
    const h = z1 - z0;
    if (h > 0.05) addBox(g, T, H, h, plaster, leftX, H / 2, (z0 + z1) / 2);
  }
  for (const w of wins) {
    const wz = (w.z0 + w.z1) / 2;
    const ww = w.z1 - w.z0;
    addBox(g, T, w.sill, ww, plaster, leftX, w.sill / 2, wz);
    const headH = H - w.head;
    addBox(g, T, headH, ww, plaster, leftX, w.head + headH / 2, wz);
    addBox(g, 0.1, 0.06, ww + 0.08, woodL, leftX + 0.08, w.sill, wz);
    const glassH = w.head - w.sill;
    const glass = toon(s.windowTint, { transparent: true, opacity: 0.34, side: THREE.DoubleSide });
    addBox(g, 0.02, glassH - 0.08, ww - 0.08, glass, leftX + 0.04, w.sill + glassH / 2, wz);
    const frame = wood;
    addBox(g, 0.07, glassH + 0.08, 0.06, frame, leftX + 0.06, w.sill + glassH / 2, w.z0);
    addBox(g, 0.07, glassH + 0.08, 0.06, frame, leftX + 0.06, w.sill + glassH / 2, w.z1);
    addBox(g, 0.07, 0.06, ww, frame, leftX + 0.06, w.head, wz);
    addBox(g, 0.07, 0.05, ww, frame, leftX + 0.06, w.sill, wz);
    for (let z = w.z0 + 0.18; z < w.z1 - 0.08; z += 0.18) {
      addBox(g, 0.045, glassH - 0.06, 0.025, woodL, leftX + 0.07, w.sill + glassH / 2, z);
    }
    addBox(g, 0.05, 0.025, ww - 0.1, woodL, leftX + 0.075, w.sill + glassH * 0.48, wz);
  }
  addBox(g, 0.045, 0.9, D - 0.3, wain, leftX + T / 2 + 0.02, 0.45, 0);
  addBox(g, 0.06, 0.04, D - 0.3, woodL, leftX + 0.08, 0.92, 0);

  addBox(g, W, 0.06, D, ceil, 0, H - 0.03, 0);
  const beamZ = [-3.35, -1.2, 0.95, 3.1];
  for (const z of beamZ) addBox(g, W - 0.3, 0.2, 0.14, wood, 0, H - 0.16, z);
  addBox(g, 0.16, 0.18, D - 0.4, wood, -1.7, H - 0.16, 0);
  addBox(g, 0.16, 0.18, D - 0.4, wood, 1.5, H - 0.16, 0);

  const p = arch.platform;
  addBox(g, p.w, p.h, p.d, toon('#5a3a28'), p.x, p.h / 2, p.z);
  addBox(g, p.w + 0.06, 0.025, p.d + 0.06, toon(WOOD_LIT), p.x, p.h + 0.01, p.z);
  addBox(g, p.w, 0.02, 0.08, ink, p.x, 0.02, p.z + p.d / 2 + 0.02);

  const plaque = toon(WOOD_DEEP);
  addBox(g, 1.7, 0.22, 0.06, plaque, 0.28, 3.05, backZ + 0.08);
  addBox(g, 1.46, 0.1, 0.02, toon(CINNABAR), 0.28, 3.05, backZ + 0.12);

  return g;
}

function makeProcedural(layout) {
  const g = new THREE.Group();
  g.name = 'procedural';
  const topOf = Object.fromEntries(layout.blocks.map((b) => [b.id, (b.y || 0) + b.h]));

  for (const b of layout.blocks) {
    if (b.role === 'writing_table' || b.role === 'demo_table') writingTable(g, b);
  }
  for (const st of layout.stations) dressStation(g, st, topOf[st.table]);

  const demo = layout.blocks.find((b) => b.id === 'demo_table');
  const demoTop = (demo.y || 0) + demo.h;
  felt(g, demo.x - 0.15, demoTop, demo.z + 0.02, 1.15, 0.48, '#142e28');
  sheet(g, demo.x - 0.22, demoTop + 0.014, demo.z + 0.02, 0.7, 0.42, 'yong-teach', -0.02);
  inkstone(g, demo.x + 0.55, demoTop, demo.z - 0.08, 1.35);
  waterDish(g, demo.x + 0.55, demoTop, demo.z + 0.16);
  sealBox(g, demo.x + 0.28, demoTop, demo.z + 0.18);
  lyingBrush(g, demo.x - 0.05, demoTop, demo.z + 0.16, 0.25, 1.7, true);
  weight(g, demo.x - 0.45, demoTop, demo.z - 0.12);

  sheet(g, -1.82, 0.12 + 0.58, -3.28, 0.28, 0.36, 'yong-full', 0.15, -0.55);

  for (const sc of layout.architecture.scrolls) scroll(g, sc);
  for (const p of layout.architecture.pins) pin(g, p);

  for (const z of [-3.2, -1.2, 0.95, 3.1]) lantern(g, -0.45, 2.55, z);
  lantern(g, 0.35, 2.48, -3.15);

  const side = layout.blocks.find((b) => b.id === 'side_cabinet');
  addBox(g, side.w, side.h, side.d, toon(WOOD), side.x, side.h / 2, side.z);
  addBox(g, side.w * 0.92, 0.02, side.d * 0.9, toon(WOOD_LIT), side.x, side.h + 0.01, side.z);
  for (let k = 0; k < 3; k++) {
    addBox(g, side.w * 0.8, 0.22, 0.02, toon(WOOD_DEEP), side.x + 0.02, 0.18 + k * 0.24, side.z + side.d / 2);
    addCyl(g, 0.015, 0.015, 0.02, toon(BRASS), side.x + 0.02, 0.18 + k * 0.24, side.z + side.d / 2 + 0.02, 8);
  }
  for (let k = 0; k < 5; k++) addBox(g, 0.28, 0.012, 0.2, toon(k % 2 ? PAPER : '#e7d7b8'), side.x, side.h + 0.02 + k * 0.014, side.z + 0.1);
  brushPot(g, side.x - 0.08, side.h, side.z - 0.3, 4);

  const wash = layout.blocks.find((b) => b.id === 'wash');
  addBox(g, wash.w, wash.h, wash.d, toon('#5c4034'), wash.x, wash.h / 2, wash.z);
  addBox(g, wash.w * 0.84, 0.04, wash.d * 0.7, toon(STONE), wash.x, wash.h + 0.02, wash.z);
  addCyl(g, 0.16, 0.14, 0.08, toon(CELADON), wash.x, wash.h + 0.06, wash.z, 18);
  addCyl(g, 0.11, 0.11, 0.03, toon('#1c1814'), wash.x, wash.h + 0.09, wash.z, 16);
  addCyl(g, 0.012, 0.012, 0.34, toon(WOOD_DEEP), wash.x + 0.28, 1.15, wash.z, 8);
  addBox(g, 0.02, 0.16, 0.12, toon('#f4efe6'), wash.x + 0.3, 0.95, wash.z);
  addCyl(g, 0.1, 0.12, 0.16, toon('#4a4038'), wash.x - 0.42, 0.08, wash.z + 0.05, 12);

  const chest = layout.blocks.find((b) => b.id === 'chest');
  addBox(g, chest.w, chest.h, chest.d, toon('#6a4632'), chest.x, chest.h / 2, chest.z);
  for (let k = 0; k < 3; k++) {
    addBox(g, chest.w * 0.86, 0.16, 0.02, toon(WOOD_DEEP), chest.x, 0.16 + k * 0.2, chest.z + chest.d / 2);
    addBox(g, 0.08, 0.012, 0.02, toon(BRASS), chest.x, 0.16 + k * 0.2, chest.z + chest.d / 2 + 0.02);
  }
  brushPot(g, chest.x - 0.2, chest.h, chest.z, 5);
  inkstone(g, chest.x + 0.18, chest.h, chest.z, 1.1);
  for (let k = 0; k < 3; k++) addBox(g, 0.22, 0.008, 0.16, toon(PAPER), chest.x + 0.05, chest.h + 0.05 + k * 0.01, chest.z - 0.08);

  const rack = layout.blocks.find((b) => b.id === 'rack');
  for (const x of [rack.x - rack.w / 2 + 0.06, rack.x + rack.w / 2 - 0.06]) {
    addBox(g, 0.06, rack.h, 0.06, toon(WOOD_DEEP), x, rack.h / 2, rack.z);
  }
  addBox(g, rack.w, 0.05, 0.08, toon(WOOD_DEEP), rack.x, 0.04, rack.z);
  const motifs = ['yong-full', 'shan', 'yong-mid', 'shui', 'yong-marked', 'grid-yong'];
  for (let bar = 0; bar < 2; bar++) {
    const y = 1.48 - bar * 0.62;
    const barMesh = addCyl(g, 0.014, 0.014, rack.w - 0.16, toon(WOOD), rack.x, y, rack.z, 8);
    barMesh.rotation.z = Math.PI / 2;
    for (let s = 0; s < 3; s++) {
      const x = rack.x - 0.62 + s * 0.62;
      const motif = motifs[bar * 3 + s];
      addBox(g, 0.04, 0.03, 0.03, toon(CINNABAR), x, y, rack.z + 0.02);
      const plane = addPlane(g, 0.32, 0.42, toon(PAPER, { map: paperTexture(motif) }), x, y - 0.24, rack.z + 0.03);
      plane.castShadow = false;
    }
  }

  const screen = layout.blocks.find((b) => b.id === 'screen');
  addBox(g, 0.06, screen.h, 0.06, toon(WOOD_DEEP), screen.x - screen.w / 2, screen.h / 2, screen.z);
  addBox(g, 0.06, screen.h, 0.06, toon(WOOD_DEEP), screen.x + screen.w / 2, screen.h / 2, screen.z);
  addBox(g, screen.w, 0.06, 0.05, toon(WOOD_DEEP), screen.x, screen.h - 0.04, screen.z);
  addBox(g, screen.w, 0.08, 0.06, toon(WOOD_DEEP), screen.x, 0.06, screen.z);
  addPlane(
    g,
    screen.w - 0.14,
    screen.h - 0.22,
    toon(PAPER, { map: landscapeTexture(), side: THREE.DoubleSide }),
    screen.x,
    screen.h / 2,
    screen.z + 0.02,
  );

  for (const inst of layout.instances) {
    if (inst.kind === 'display_bookcase') fillCase(g, inst);
    if (inst.kind === 'wall_shelf') shelfGoods(g, inst);
  }

  bamboo(g, -6.45, 0, -2.0, 2.6, 5, 0.02);
  bamboo(g, -6.5, 0, 1.55, 2.8, 4, -0.03);
  bamboo(g, -5.48, 0, 3.95, 1.15, 4, 0);
  bamboo(g, -5.68, 0.82, -3.85, 0.55, 3, 0);

  const bin = layout.blocks.find((b) => b.id === 'wash');
  addBox(g, 0.18, 0.004, 0.22, toon(PAPER, { map: paperTexture('yong-start') }), bin.x - 0.55, 0.02, bin.z + 0.35);

  return g;
}

function onBeforeShade(kind, root) {
  if (kind !== 'library_lamp') return;
  root.traverse((obj) => {
    if (!obj.isMesh || !obj.material) return;
    const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
    const name = obj.name || '';
    mats.forEach((m) => {
      if (!m.color) return;
      if (name === 'green_roof') m.color.set('#e0a85a');
      if (name === 'light_tube') {
        m.color.set('#fff4d8');
        m.userData.emissive = '#fff1c8';
        m.userData.emissiveIntensity = 0.9;
      }
    });
  });
}

boot({
  makeShell,
  makeProcedural,
  onBeforeShade,
  readyText: 'ready — orbit · T toon · U unlit · seats face the teaching wall',
}).catch((err) => {
  window.__errors.push(String(err && err.stack || err));
  const status = document.getElementById('status');
  if (status) status.textContent = String(err);
});
