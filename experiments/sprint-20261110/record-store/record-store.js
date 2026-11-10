import * as THREE from 'three';
import { boot, toon, addBox, addCyl, addContact } from './scene_lib.js';

/** Original sleeve graphics — fictional titles, not scanned covers. */
const COVERS = [
  { template: 'vinyl', bg: '#1a2332', fg: '#e6b15a', accent: '#f4efe4', title: 'NIGHT BUS', sub: 'LOW LAMP' },
  { template: 'split', bg: '#6e2430', fg: '#f2d3a2', accent: '#1c1412', title: 'SALT CIRCLE', sub: 'AFTER GLOW' },
  { template: 'sun', bg: '#e7d7c4', fg: '#c4552a', accent: '#243044', title: 'PAPER MOON', sub: 'QUIET PRESS' },
  { template: 'bars', bg: '#14161c', fg: '#f2f2f2', accent: '#e23b2f', title: 'KIND WIRE', sub: 'WEST ARCHIVE' },
  { template: 'dots', bg: '#12141c', fg: '#3ad0c8', accent: '#f2e27a', title: 'HONEY STATIC', sub: 'CLUB HOUR' },
  { template: 'portrait', bg: '#243024', fg: '#e8dcc0', accent: '#c4a15a', title: 'GLASS HOUR', sub: 'MARLOWE' },
  { template: 'type', bg: '#f2efe6', fg: '#1a1a1a', accent: '#b4332a', title: 'COPPER', sub: 'ROOM' },
  { template: 'vinyl', bg: '#3a1c14', fg: '#f0c9a0', accent: '#f7f1e6', title: 'LATE SHIFT', sub: 'AMBER LINE' },
  { template: 'split', bg: '#1c2744', fg: '#d6e4f2', accent: '#e0a04a', title: 'RIVER TAKE', sub: 'SECOND PRESS' },
  { template: 'sun', bg: '#2a2038', fg: '#f2a35a', accent: '#f4efe8', title: 'SOFT RADAR', sub: 'NIGHT BUS' },
  { template: 'bars', bg: '#f4e6c8', fg: '#2a2118', accent: '#8a3030', title: 'FIELD NOTES', sub: 'QUIET PRESS' },
  { template: 'dots', bg: '#101010', fg: '#f24b8a', accent: '#f6f6f6', title: 'PINK NOISE', sub: 'KIND WIRE' },
  { template: 'portrait', bg: '#4a2a22', fg: '#f0d8b0', accent: '#1a1a1a', title: 'WARM HALO', sub: 'AFTERGLOW' },
  { template: 'type', bg: '#0e1a22', fg: '#f2f6f4', accent: '#e6b15a', title: 'NORTH', sub: 'PLATFORM' },
];

const FAMILIES = {
  jazz: [['#1a2332', '#e6b15a', '#f4efe4'], ['#243044', '#d6e4f2', '#e0a04a'], ['#3a1c14', '#f0c9a0', '#f7f1e6'], ['#1c2744', '#f2efe6', '#8a3030']],
  soul: [['#6e2430', '#f2d3a2', '#1c1412'], ['#8a3a18', '#f2e0b0', '#2a140e'], ['#4a2a22', '#f0d8b0', '#1a1a1a'], ['#5a2218', '#f6f1e6', '#e6b15a']],
  rock: [['#14161c', '#f2f2f2', '#e23b2f'], ['#1a1a1a', '#f2e27a', '#c4552a'], ['#2a140e', '#f4efe4', '#e23b2f'], ['#101010', '#f6f6f6', '#f24b8a']],
  club: [['#12141c', '#3ad0c8', '#f2e27a'], ['#101010', '#f24b8a', '#f6f6f6'], ['#1a1030', '#c8a0f2', '#3ad0c8'], ['#0e1a22', '#f2f6f4', '#e6b15a']],
  new: [['#e7d7c4', '#c4552a', '#243044'], ['#f2efe6', '#1a1a1a', '#b4332a'], ['#243024', '#e8dcc0', '#c4a15a'], ['#f4e6c8', '#2a2118', '#8a3030']],
};

const TITLES = ['NIGHT BUS', 'SALT CIRCLE', 'PAPER MOON', 'KIND WIRE', 'HONEY STATIC', 'GLASS HOUR', 'COPPER ROOM', 'LATE SHIFT', 'RIVER TAKE', 'SOFT RADAR', 'FIELD NOTES', 'PINK NOISE', 'WARM HALO', 'NORTH PLATFORM', 'LOW LAMP', 'QUIET PRESS', 'AMBER LINE', 'SECOND PRESS', 'WEST ARCHIVE', 'CLUB HOUR'];
const TEMPLATES = ['vinyl', 'split', 'sun', 'bars', 'dots', 'portrait', 'type'];

const texCache = new Map();

function roundRect(ctx, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

function fitFont(ctx, text, maxW, px, weight, family) {
  let size = px;
  do {
    ctx.font = `${weight} ${size}px ${family}`;
    if (ctx.measureText(text).width <= maxW || size <= 14) break;
    size -= 2;
  } while (size > 14);
  return size;
}

function paintCover(ctx, S, spec) {
  const { bg, fg, accent, title, sub, template } = spec;
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, S, S);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  if (template === 'vinyl') {
    ctx.fillStyle = fg;
    ctx.beginPath();
    ctx.arc(S * 0.5, S * 0.4, S * 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = bg;
    ctx.lineWidth = S * 0.012;
    for (let i = 1; i <= 3; i++) {
      ctx.beginPath();
      ctx.arc(S * 0.5, S * 0.4, S * 0.1 + i * S * 0.045, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.fillStyle = bg;
    ctx.beginPath();
    ctx.arc(S * 0.5, S * 0.4, S * 0.055, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = accent;
    ctx.beginPath();
    ctx.arc(S * 0.5, S * 0.4, S * 0.018, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = fg;
    ctx.fillRect(0, S * 0.76, S, S * 0.24);
    ctx.fillStyle = bg;
    fitFont(ctx, title, S * 0.86, S * 0.09, 700, 'Georgia, serif');
    ctx.fillText(title, S / 2, S * 0.855);
    fitFont(ctx, sub, S * 0.8, S * 0.042, 500, 'Arial, sans-serif');
    ctx.fillText(sub, S / 2, S * 0.935);
  } else if (template === 'split') {
    ctx.fillStyle = fg;
    ctx.beginPath();
    ctx.moveTo(0, S * 0.18);
    ctx.lineTo(S, S * 0.62);
    ctx.lineTo(S, S);
    ctx.lineTo(0, S);
    ctx.fill();
    ctx.fillStyle = accent;
    ctx.beginPath();
    ctx.arc(S * 0.32, S * 0.36, S * 0.16, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = bg;
    ctx.beginPath();
    ctx.arc(S * 0.32, S * 0.36, S * 0.05, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = bg;
    fitFont(ctx, title, S * 0.8, S * 0.1, 700, 'Georgia, serif');
    ctx.textAlign = 'left';
    ctx.fillText(title, S * 0.08, S * 0.8);
    ctx.fillStyle = accent;
    fitFont(ctx, sub, S * 0.7, S * 0.04, 600, 'Arial, sans-serif');
    ctx.fillText(sub, S * 0.08, S * 0.9);
    ctx.textAlign = 'center';
  } else if (template === 'sun') {
    ctx.strokeStyle = fg;
    ctx.lineWidth = S * 0.012;
    for (let i = 1; i <= 5; i++) {
      ctx.beginPath();
      ctx.arc(S * 0.62, S * 0.4, i * S * 0.07, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.fillStyle = fg;
    ctx.beginPath();
    ctx.arc(S * 0.62, S * 0.4, S * 0.05, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = accent;
    ctx.fillRect(0, S * 0.74, S, S * 0.26);
    ctx.fillStyle = fg;
    fitFont(ctx, title, S * 0.84, S * 0.095, 700, 'Georgia, serif');
    ctx.fillText(title, S / 2, S * 0.84);
    fitFont(ctx, sub, S * 0.7, S * 0.04, 500, 'Arial, sans-serif');
    ctx.fillText(sub, S / 2, S * 0.93);
  } else if (template === 'bars') {
    const bands = [0.16, 0.1, 0.22, 0.08, 0.14];
    let y = S * 0.08;
    bands.forEach((h, i) => {
      ctx.fillStyle = i % 2 === 0 ? fg : accent;
      ctx.fillRect(S * 0.1, y, S * 0.8, S * h);
      y += S * h + S * 0.03;
    });
    ctx.fillStyle = bg;
    fitFont(ctx, title, S * 0.7, S * 0.075, 700, 'Arial, sans-serif');
    ctx.fillText(title, S / 2, S * 0.2);
  } else if (template === 'dots') {
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        ctx.fillStyle = (r + c) % 2 === 0 ? fg : accent;
        ctx.beginPath();
        ctx.arc(S * (0.16 + c * 0.09), S * (0.16 + r * 0.08), S * 0.028, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.fillStyle = bg;
    roundRect(ctx, S * 0.08, S * 0.74, S * 0.84, S * 0.18, 8);
    ctx.fill();
    ctx.fillStyle = fg;
    fitFont(ctx, title, S * 0.76, S * 0.07, 700, 'Arial, sans-serif');
    ctx.fillText(title, S / 2, S * 0.83);
  } else if (template === 'portrait') {
    ctx.fillStyle = fg;
    ctx.beginPath();
    ctx.arc(S * 0.34, S * 0.42, S * 0.24, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = accent;
    ctx.beginPath();
    ctx.arc(S * 0.34, S * 0.42, S * 0.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = fg;
    ctx.textAlign = 'left';
    fitFont(ctx, title, S * 0.4, S * 0.07, 700, 'Georgia, serif');
    ctx.fillText(title, S * 0.58, S * 0.38);
    fitFont(ctx, sub, S * 0.36, S * 0.04, 500, 'Arial, sans-serif');
    ctx.fillText(sub, S * 0.58, S * 0.5);
    ctx.textAlign = 'center';
    ctx.fillStyle = accent;
    ctx.fillRect(0, S * 0.82, S, S * 0.018);
  } else {
    ctx.fillStyle = accent;
    ctx.fillRect(0, 0, S * 0.045, S);
    ctx.fillStyle = fg;
    ctx.textAlign = 'left';
    fitFont(ctx, title, S * 0.84, S * 0.16, 700, 'Georgia, serif');
    ctx.fillText(title, S * 0.1, S * 0.4);
    fitFont(ctx, sub, S * 0.6, S * 0.07, 500, 'Arial, sans-serif');
    ctx.fillText(sub, S * 0.1, S * 0.62);
    ctx.fillStyle = accent;
    ctx.fillRect(S * 0.1, S * 0.74, S * 0.28, S * 0.012);
    ctx.textAlign = 'center';
  }
}

function coverSpec(index) {
  return COVERS[((index % COVERS.length) + COVERS.length) % COVERS.length];
}

function coverFromSeed(seed, family) {
  const pals = FAMILIES[family] || FAMILIES.jazz;
  const pal = pals[Math.abs(seed) % pals.length];
  const title = TITLES[Math.abs(seed) % TITLES.length];
  const sub = TITLES[Math.abs(seed * 5 + 3) % TITLES.length];
  return {
    template: TEMPLATES[Math.abs(seed) % TEMPLATES.length],
    bg: pal[0],
    fg: pal[1],
    accent: pal[2],
    title,
    sub,
    family,
  };
}

function canvasTex(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d'), w, h);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

function coverTexture(spec) {
  const key = `${spec.template}|${spec.bg}|${spec.fg}|${spec.accent}|${spec.title}|${spec.sub}`;
  if (!texCache.has(key)) {
    texCache.set(key, canvasTex(512, 512, (ctx, w) => paintCover(ctx, w, spec)));
  }
  return texCache.get(key);
}

function woodTexture() {
  return canvasTex(512, 512, (ctx) => {
    ctx.fillStyle = '#4e3424';
    ctx.fillRect(0, 0, 512, 512);
    const rows = 8;
    for (let i = 0; i < rows; i++) {
      const y = (i * 512) / rows;
      const h = 512 / rows;
      const shift = (i * 47) % 90;
      const tone = 78 + ((i * 19) % 26);
      ctx.fillStyle = `rgb(${tone + 28},${tone + 6},${Math.floor(tone * 0.48)})`;
      ctx.fillRect(0, y + 1, 512, h - 3);
      ctx.strokeStyle = 'rgba(48,24,12,0.28)';
      ctx.lineWidth = 1;
      for (let k = 0; k < 3; k++) {
        ctx.beginPath();
        ctx.moveTo(0, y + 8 + k * (h / 4));
        ctx.bezierCurveTo(140, y + 6 + k * 10, 300, y + 16 + shift / 8, 512, y + 8 + k * 9);
        ctx.stroke();
      }
      ctx.fillStyle = 'rgba(30,16,8,0.45)';
      ctx.fillRect((shift * 5) % 480, y + 1, 2, h - 3);
    }
  });
}

function labelTexture(text) {
  const key = `label:${text}`;
  if (texCache.has(key)) return texCache.get(key);
  const tex = canvasTex(512, 128, (ctx, w, h) => {
    ctx.fillStyle = '#1a120e';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#e7c48a';
    ctx.fillRect(8, 8, w - 16, h - 16);
    ctx.fillStyle = '#2a1a12';
    fitFont(ctx, text, w * 0.84, 64, 700, 'Arial, sans-serif');
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, w / 2, h / 2 + 2);
  });
  texCache.set(key, tex);
  return tex;
}

function signTexture() {
  return canvasTex(1024, 256, (ctx, w, h) => {
    ctx.fillStyle = '#1a0d0a';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#e0893a';
    ctx.lineWidth = 8;
    ctx.strokeRect(10, 10, w - 20, h - 20);
    ctx.fillStyle = '#ffb15e';
    fitFont(ctx, 'AFTERGLOW', w * 0.86, 120, 700, 'Georgia, serif');
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('AFTERGLOW', w / 2, h * 0.42);
    ctx.fillStyle = '#f0d2a4';
    fitFont(ctx, 'RECORDS  ·  LATE HOURS', w * 0.7, 36, 500, 'Arial, sans-serif');
    ctx.fillText('RECORDS  ·  LATE HOURS', w / 2, h * 0.74);
  });
}

function clockTexture() {
  return canvasTex(256, 256, (ctx, s) => {
    ctx.fillStyle = '#f3ecdf';
    ctx.beginPath();
    ctx.arc(s / 2, s / 2, s * 0.48, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#2a1c14';
    ctx.lineWidth = 8;
    ctx.stroke();
    ctx.fillStyle = '#2a1c14';
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2 - Math.PI / 2;
      ctx.beginPath();
      ctx.arc(s / 2 + Math.cos(a) * s * 0.38, s / 2 + Math.sin(a) * s * 0.38, i % 3 === 0 ? 5 : 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.strokeStyle = '#6e2430';
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(s / 2, s / 2);
    ctx.lineTo(s / 2 + 8, s / 2 - 48);
    ctx.stroke();
    ctx.strokeStyle = '#2a1c14';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(s / 2, s / 2);
    ctx.lineTo(s / 2 + 36, s / 2 + 10);
    ctx.stroke();
  });
}

function openTexture() {
  return canvasTex(512, 180, (ctx, w, h) => {
    ctx.fillStyle = '#3a120c';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#ffb15e';
    fitFont(ctx, 'OPEN', w * 0.7, 92, 700, 'Georgia, serif');
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('OPEN', w / 2, h * 0.42);
    ctx.fillStyle = '#f0d2a4';
    fitFont(ctx, 'TIL LATE', w * 0.5, 32, 500, 'Arial, sans-serif');
    ctx.fillText('TIL LATE', w / 2, h * 0.75);
  });
}

function plane(w, h, map, opts = {}) {
  const mat = toon(opts.color || '#ffffff', {
    map,
    emissive: opts.emissive,
    emissiveIntensity: opts.emissiveIntensity,
    emissiveMap: opts.emissiveMap,
    side: opts.side,
    polygonOffset: opts.polygonOffset,
  });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
  m.castShadow = !opts.noCast;
  m.receiveShadow = true;
  if (opts.noCast) m.userData.noCast = true;
  return m;
}

function sleeveMaterials(spec, face) {
  const cover = toon('#ffffff', { map: coverTexture(spec) });
  const paper = toon('#f3ecdf');
  const spine = toon(spec.bg);
  // Box faces: +x, -x, +y, -y, +z, -z
  if (face === 'z') return [spine, spine, paper, paper, cover, paper];
  if (face === 'y') return [paper, paper, cover, paper, spine, spine];
  return [cover, paper, paper, paper, spine, spine];
}

function findInst(layout, id) {
  return (layout.instances || []).find((i) => i.id === id);
}

function makeShell(layout) {
  const g = new THREE.Group();
  g.name = 'shell';
  const { width: W, depth: D, height: H } = layout.meta.room;
  const s = layout.shell;
  const hw = W / 2;
  const hd = D / 2;
  const wallT = 0.16;

  const floorMap = woodTexture();
  floorMap.wrapS = THREE.RepeatWrapping;
  floorMap.wrapT = THREE.RepeatWrapping;
  floorMap.repeat.set(W / 1.35, D / 1.35);
  const floor = addBox(g, W, 0.08, D, toon('#c2a078', { map: floorMap }), 0, -0.04, 0);
  floor.userData.noCast = true;
  floor.receiveShadow = true;

  const plaster = toon(s.wallColor);
  const wainscot = toon(s.woodColor);
  const trim = toon(s.trimColor || '#4a3024');

  addBox(g, W, H, wallT, plaster, 0, H / 2, -hd);

  const winZ0 = 0.15;
  const winZ1 = 2.45;
  const winY0 = 1.18;
  const winY1 = 2.5;
  addBox(g, wallT, H, hd + winZ0, plaster, -hw, H / 2, (-hd + winZ0) / 2);
  addBox(g, wallT, H, hd - winZ1, plaster, -hw, H / 2, (winZ1 + hd) / 2);
  addBox(g, wallT, winY0, winZ1 - winZ0, plaster, -hw, winY0 / 2, (winZ0 + winZ1) / 2);
  addBox(g, wallT, H - winY1, winZ1 - winZ0, plaster, -hw, (H + winY1) / 2, (winZ0 + winZ1) / 2);

  const frame = toon(s.trimColor || '#5a3a28');
  addBox(g, 0.08, winY1 - winY0, 0.06, frame, -hw + 0.06, (winY0 + winY1) / 2, winZ0);
  addBox(g, 0.08, winY1 - winY0, 0.06, frame, -hw + 0.06, (winY0 + winY1) / 2, winZ1);
  addBox(g, 0.08, 0.06, winZ1 - winZ0, frame, -hw + 0.06, winY0, (winZ0 + winZ1) / 2);
  addBox(g, 0.08, 0.06, winZ1 - winZ0, frame, -hw + 0.06, winY1, (winZ0 + winZ1) / 2);
  addBox(g, 0.05, winY1 - winY0, 0.04, frame, -hw + 0.07, (winY0 + winY1) / 2, (winZ0 + winZ1) / 2);
  for (let i = 0; i < 4; i++) {
    const y = winY1 - 0.08 - i * 0.07;
    addBox(g, 0.02, 0.018, (winZ1 - winZ0) * 0.48, toon('#3a2a22'), -hw + 0.1, y, (winZ0 + winZ1) / 2 + 0.28);
  }
  const glass = addBox(
    g, 0.02, winY1 - winY0 - 0.08, winZ1 - winZ0 - 0.08,
    toon('#9eb4c8', { transparent: true, opacity: 0.22, side: THREE.DoubleSide }),
    -hw + 0.02, (winY0 + winY1) / 2, (winZ0 + winZ1) / 2,
  );
  glass.userData.noCast = true;
  const outside = addBox(
    g, 0.04, (winY1 - winY0) + 0.5, (winZ1 - winZ0) + 0.4,
    toon('#1a2433'), -hw - 0.34, (winY0 + winY1) / 2, (winZ0 + winZ1) / 2,
  );
  outside.userData.noCast = true;
  const lampGlow = new THREE.Mesh(
    new THREE.CircleGeometry(0.28, 20),
    toon('#ffd2a0', { emissive: '#ffb060', emissiveIntensity: 1.3, side: THREE.DoubleSide }),
  );
  lampGlow.position.set(-hw - 0.3, 1.85, 1.15);
  lampGlow.rotation.y = Math.PI / 2;
  lampGlow.userData.noCast = true;
  g.add(lampGlow);

  addBox(g, W - 0.2, 0.7, 0.04, wainscot, 0, 0.35, -hd + wallT / 2 + 0.03);
  addBox(g, 0.04, 0.7, (hd + winZ0) - 0.1, wainscot, -hw + wallT / 2 + 0.03, 0.35, (-hd + winZ0) / 2);
  addBox(g, 0.04, 0.7, hd - winZ1 - 0.05, wainscot, -hw + wallT / 2 + 0.03, 0.35, (winZ1 + hd) / 2 - 0.02);
  addBox(g, W - 0.3, 0.045, 0.06, trim, 0, 0.72, -hd + 0.12);
  addBox(g, 0.06, 0.045, hd + winZ0 - 0.15, trim, -hw + 0.12, 0.72, (-hd + winZ0) / 2);
  addBox(g, W, 0.08, 0.06, trim, 0, 0.04, -hd + 0.1);
  addBox(g, 0.06, 0.08, D, trim, -hw + 0.1, 0.04, 0);
  addBox(g, 0.22, 0.04, winZ1 - winZ0 + 0.08, frame, -hw + 0.16, winY0 + 0.01, (winZ0 + winZ1) / 2);

  const ceilD = hd + 2.35;
  const ceil = addBox(g, W - 0.05, 0.08, ceilD, toon(s.ceilingColor), -0.02, H - 0.04, -hd + ceilD / 2);
  ceil.userData.noCast = true;
  addBox(g, W - 0.3, 0.05, 0.07, trim, 0, H - 0.1, -hd + 0.12);

  addBox(g, 0.14, H, 0.14, trim, -hw, H / 2, hd - 0.02);

  const ao = toon('#1a1210');
  const aoStrip = addBox(g, W - 0.3, 0.02, 0.12, ao, 0, 0.01, -hd + 0.16);
  aoStrip.userData.noCast = true;
  const aoLeft = addBox(g, 0.12, 0.02, D - 0.4, ao, -hw + 0.16, 0.01, -0.2);
  aoLeft.userData.noCast = true;

  return g;
}

function hangCover(g, x, y, size, art, zWall, feature) {
  const spec = coverSpec(art);
  const frameT = feature ? 0.055 : 0.032;
  const depth = feature ? 0.045 : 0.03;
  const frame = addBox(g, size + frameT * 2, size + frameT * 2, depth, toon(feature ? '#3a2418' : '#241812'), x, y, zWall);
  if (feature) {
    addBox(g, size + 0.02, size + 0.02, 0.012, toon('#c6a15a'), x, y, zWall + depth * 0.35);
  }
  const print = plane(size, size, coverTexture(spec), { polygonOffset: true });
  print.position.set(x, y, zWall + depth * 0.55);
  g.add(print);
  frame.castShadow = true;
  return print;
}

function addBulb(g, x, y, z, r, color) {
  const m = new THREE.Mesh(
    new THREE.SphereGeometry(r, 12, 10),
    toon(color, { emissive: color, emissiveIntensity: 1.15 }),
  );
  m.position.set(x, y, z);
  m.userData.noCast = true;
  g.add(m);
  return m;
}

function buildFlipBin(parent, spec) {
  const g = new THREE.Group();
  g.name = spec.id;
  const { w, d } = spec;
  const wallH = spec.wall;
  const stain = toon(spec.stain || '#6a432c');
  const dark = toon('#24160f');
  const t = 0.02;
  const base = spec.type === 'crate' ? 0.035 : 0.07;
  if (spec.type !== 'crate') {
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        addBox(g, 0.045, base, 0.045, dark, sx * (w / 2 - 0.055), base / 2, sz * (d / 2 - 0.055));
      }
    }
  }
  const floorY = spec.type === 'crate' ? 0.02 : base;
  addBox(g, w, 0.026, d, stain, 0, floorY + 0.013, 0);
  const wallBottom = floorY + 0.026;
  addBox(g, t, wallH, d, stain, -w / 2, wallBottom + wallH / 2, 0);
  addBox(g, t, wallH, d, stain, w / 2, wallBottom + wallH / 2, 0);
  addBox(g, w, wallH, t, stain, 0, wallBottom + wallH / 2, -d / 2);
  addBox(g, w - t * 2, wallH * 0.62, t, stain, 0, wallBottom + wallH * 0.31, d / 2);
  addBox(g, w - 0.06, 0.02, d - 0.05, dark, 0, wallBottom + 0.02, 0);

  const plate = plane(Math.min(0.5, w * 0.46), 0.075, labelTexture(spec.label));
  plate.position.set(0, wallBottom + wallH * 0.8, d / 2 + 0.014);
  g.add(plate);

  const inner = w - 0.1;
  const count = spec.count || Math.max(8, Math.floor(inner / 0.034));
  const step = inner / count;
  const recH = 0.3;
  const recD = Math.min(0.29, d - 0.08);
  for (let i = 0; i < count; i++) {
    const specC = coverFromSeed(spec.seed + i * 3, (spec.label || 'jazz').toLowerCase());
    const th = 0.014 + ((i * 5) % 3) * 0.004;
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(th, recH, recD), sleeveMaterials(specC, 'x'));
    const pivot = new THREE.Group();
    mesh.position.y = recH / 2;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    pivot.add(mesh);
    const fan = spec.fan || 0;
    const fanned = i >= count - fan;
    pivot.position.set(-inner / 2 + step * (i + 0.5), wallBottom + 0.03, fanned ? 0.05 : 0);
    if (fanned) pivot.rotation.y = -0.42 - (i - (count - fan)) * 0.12;
    else pivot.rotation.z = ((i % 5) - 2) * 0.012;
    g.add(pivot);
    if (i === Math.floor(count * 0.33) || i === Math.floor(count * 0.66)) {
      const tab = addBox(g, 0.012, recH + 0.06, recD * 0.92, toon('#e6d3b0'), pivot.position.x, wallBottom + 0.03 + (recH + 0.06) / 2, 0);
      tab.castShadow = true;
    }
  }

  g.position.set(spec.x, 0, spec.z);
  g.rotation.y = spec.rot || 0;
  addContact(g, 0, 0, w * 0.95, d * 0.95, 0.022);
  parent.add(g);
  return g;
}

function buildFaceOut(parent, spec) {
  const g = new THREE.Group();
  g.name = spec.id;
  const w = spec.w;
  const d = 0.4;
  const wood = toon(spec.stain || '#5c3c28');
  const dark = toon('#2a1c14');
  addBox(g, w, 0.08, d, dark, 0, 0.04, 0);
  addBox(g, w - 0.06, 0.5, d - 0.08, wood, 0, 0.33, 0);
  addBox(g, w, 0.04, d + 0.04, toon('#c4a074'), 0, 0.6, 0);
  addBox(g, w, 0.7, 0.03, dark, 0, 0.95, -d / 2 + 0.02);
  addBox(g, 0.04, 0.7, d, wood, -w / 2, 0.95, 0);
  addBox(g, 0.04, 0.7, d, wood, w / 2, 0.95, 0);
  const plate = plane(w * 0.72, 0.09, labelTexture(spec.label));
  plate.position.set(0, 1.18, -d / 2 + 0.05);
  g.add(plate);

  const n = spec.count || 4;
  const sw = 0.3;
  const span = n * sw;
  const start = -span / 2 + sw / 2;
  for (let i = 0; i < n; i++) {
    const specC = i === 0 ? coverSpec(0) : coverFromSeed(spec.seed + i, 'new');
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(sw - 0.02, sw, 0.016), sleeveMaterials(specC, 'z'));
    const pivot = new THREE.Group();
    mesh.position.y = sw / 2;
    mesh.castShadow = true;
    pivot.add(mesh);
    pivot.position.set(start + i * sw, 0.62, 0.04);
    pivot.rotation.x = -0.16;
    pivot.rotation.y = (i - (n - 1) / 2) * 0.04;
    g.add(pivot);
  }
  g.position.set(spec.x, 0, spec.z);
  g.rotation.y = spec.rot || 0;
  addContact(g, 0, 0, w, d, 0.022);
  parent.add(g);
}

function buildBay(parent, spec) {
  const g = new THREE.Group();
  g.name = spec.label;
  const w = spec.w;
  const d = 0.36;
  const h = 2.16;
  const wood = toon('#5b3b27');
  const dark = toon('#24160f');
  addBox(g, w + 0.04, 0.1, d + 0.05, wood, 0, 0.05, 0);
  addBox(g, 0.045, h, d, wood, -w / 2, h / 2 + 0.02, 0);
  addBox(g, 0.045, h, d, wood, w / 2, h / 2 + 0.02, 0);
  addBox(g, w, h, 0.03, dark, 0, h / 2 + 0.02, -d / 2);
  addBox(g, w + 0.08, 0.07, d + 0.06, wood, 0, h + 0.05, 0);
  const plate = plane(w * 0.78, 0.11, labelTexture(spec.label));
  plate.position.set(0, h - 0.1, d / 2 - 0.01);
  g.add(plate);

  const shelves = [0.2, 0.6, 1.0, 1.4, 1.78];
  const inner = w - 0.12;
  shelves.forEach((y, s) => {
    addBox(g, w - 0.08, 0.028, d - 0.05, wood, 0, y, 0.015);
    const count = Math.floor(inner / 0.032);
    const step = inner / count;
    for (let i = 0; i < count; i++) {
      const family = s % 2 === 0 ? 'rock' : 'club';
      const specC = coverFromSeed(spec.seed + s * 20 + i, family);
      const th = 0.012 + ((i + s) % 3) * 0.004;
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(th, 0.3, 0.28), sleeveMaterials(specC, 'x'));
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      const pivot = new THREE.Group();
      mesh.position.y = 0.15;
      pivot.add(mesh);
      const fan = i === count - 1;
      pivot.position.set(-inner / 2 + step * (i + 0.5), y + 0.03, fan ? 0.06 : 0.01);
      if (fan) pivot.rotation.y = -0.7;
      g.add(pivot);
    }
  });
  g.position.set(spec.x, 0, spec.z);
  g.rotation.y = spec.rot || 0;
  addContact(g, 0, 0, w * 0.95, d, 0.022);
  parent.add(g);
}

function addRug(g, x, z, w, d, fill, edge) {
  const base = addBox(g, w, 0.014, d, toon(edge), x, 0.012, z);
  base.userData.noCast = true;
  const inset = addBox(g, w - 0.12, 0.008, d - 0.12, toon(fill), x, 0.02, z);
  inset.userData.noCast = true;
}

function addFoam(g, z0, z1, y0, y1, wallX) {
  const s = 0.2;
  let i = 0;
  for (let z = z0; z < z1 - 0.02; z += s + 0.014) {
    let j = 0;
    for (let y = y0; y < y1 - 0.02; y += s + 0.014) {
      const deep = (i + j) % 2 === 0 ? 0.04 : 0.07;
      const col = (i + j) % 3 === 0 ? '#3a3438' : '#262226';
      addBox(g, deep, s * 0.92, s * 0.92, toon(col), wallX + deep / 2, y + (s * 0.92) / 2, z + (s * 0.92) / 2);
      j += 1;
    }
    i += 1;
  }
}

function addSlats(g, x, z, along, from, to, y0, y1) {
  const woodA = toon('#5a3a26');
  const woodB = toon('#3e291c');
  const len = y1 - y0;
  for (let t = from; t < to; t += 0.1) {
    const mat = Math.round(t * 10) % 2 === 0 ? woodA : woodB;
    if (along === 'z') addBox(g, 0.035, len, 0.055, mat, x, y0 + len / 2, t);
    else addBox(g, 0.055, len, 0.035, mat, t, y0 + len / 2, z);
  }
}

function addCloud(g, x, y, z, w, d, ceilY) {
  const panel = addBox(g, w, 0.045, d, toon('#3a332e'), x, y, z);
  panel.userData.noCast = true;
  const edge = addBox(g, w + 0.03, 0.012, d + 0.03, toon('#4a4038'), x, y - 0.02, z);
  edge.userData.noCast = true;
  const corners = [[-w / 2 + 0.08, -d / 2 + 0.08], [w / 2 - 0.08, -d / 2 + 0.08], [-w / 2 + 0.08, d / 2 - 0.08], [w / 2 - 0.08, d / 2 - 0.08]];
  for (const [dx, dz] of corners) {
    const cord = addCyl(g, 0.006, 0.006, Math.max(0.05, ceilY - y), toon('#2a221c'), x + dx, y + (ceilY - y) / 2, z + dz, 6);
    cord.userData.noCast = true;
  }
}

function addTurntable(g, x, y, z, rot) {
  const grp = new THREE.Group();
  addBox(grp, 0.46, 0.038, 0.37, toon('#2a211c'), 0, 0.019, 0);
  addBox(grp, 0.4, 0.01, 0.32, toon('#161311'), 0, 0.042, 0);
  addCyl(grp, 0.142, 0.142, 0.012, toon('#101010'), -0.01, 0.052, 0, 28);
  addCyl(grp, 0.052, 0.052, 0.006, toon('#c4553a'), -0.01, 0.06, 0, 16);
  addCyl(grp, 0.007, 0.007, 0.008, toon('#f4efe6'), -0.01, 0.066, 0, 8);
  addCyl(grp, 0.018, 0.022, 0.018, toon('#d0d0d0'), 0.15, 0.05, -0.12, 10);
  const arm = addBox(grp, 0.15, 0.008, 0.012, toon('#e6e6e6'), 0.07, 0.064, -0.05);
  arm.rotation.y = -0.55;
  const led = addBulb(grp, -0.18, 0.05, 0.12, 0.008, '#ff5a32');
  led.scale.setScalar(1);
  grp.position.set(x, y, z);
  grp.rotation.y = rot || 0;
  g.add(grp);
}

function addCans(g, x, y, z, rot) {
  const grp = new THREE.Group();
  const band = new THREE.Mesh(new THREE.TorusGeometry(0.082, 0.007, 6, 18, Math.PI), toon('#1b1b1b'));
  grp.add(band);
  for (const sx of [-1, 1]) {
    addCyl(grp, 0.03, 0.03, 0.02, toon('#222'), sx * 0.082, 0, 0, 12);
    addCyl(grp, 0.024, 0.024, 0.01, toon('#6e2434'), sx * 0.082, 0, 0.012, 12);
  }
  grp.position.set(x, y, z);
  grp.rotation.y = rot || 0.4;
  g.add(grp);
}

function addFlatStack(g, x, y, z, n, seed) {
  for (let i = 0; i < n; i++) {
    const spec = i === 0 ? coverSpec(0) : coverFromSeed(seed + i, 'soul');
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(0.27, 0.008, 0.27), sleeveMaterials(spec, 'y'));
    mesh.position.set(x, y + 0.006 + i * 0.009, z);
    mesh.rotation.y = i * 0.18;
    mesh.castShadow = true;
    g.add(mesh);
  }
}

function counterFixture(g, fx) {
  const { x, z, length: L, depth: D, height: H } = fx;
  const grp = new THREE.Group();
  const body = toon('#4a3224');
  const top = toon('#c4a074');
  const dark = toon('#24160f');
  addBox(grp, D - 0.06, H - 0.14, L - 0.08, body, 0, (H - 0.14) / 2 + 0.06, 0);
  addBox(grp, D - 0.1, 0.08, L - 0.12, dark, 0, 0.04, 0);
  addBox(grp, D + 0.06, 0.045, L + 0.02, top, 0, H - 0.02, 0);
  addBox(grp, 0.018, H * 0.5, L * 0.82, toon('#6b4a32'), -D / 2 - 0.004, H * 0.48, 0);
  addBox(grp, D - 0.16, 0.02, L * 0.7, dark, 0.04, 0.28, 0);
  const plate = plane(0.42, 0.08, labelTexture('PAY HERE'));
  plate.position.set(-D / 2 - 0.012, H * 0.72, L * 0.28);
  plate.rotation.y = -Math.PI / 2;
  grp.add(plate);
  grp.position.set(x, 0, z);
  g.add(grp);
  addContact(g, x, z, D * 1.05, L * 0.98, 0.022);
}

function makeProcedural(layout) {
  const g = new THREE.Group();
  g.name = 'procedural';
  const { depth: D, height: H } = layout.meta.room;
  const hd = D / 2;
  const zWall = -hd + 0.1;
  const fx = layout.fixtures;

  for (const r of fx.rugs) addRug(g, r.x, r.z, r.w, r.d, r.color, r.edge);

  addFoam(g, -3.4, -1.7, 0.86, 2.25, -5.52);
  addSlats(g, -5.5, 0, 'z', -4.05, -3.55, 0.86, 2.45);
  addSlats(g, -5.5, 0, 'z', -1.5, 0.08, 0.86, 2.35);
  addSlats(g, 0, zWall + 0.025, 'x', -5.15, -2.15, 0.86, 2.4);

  const trap = addBox(g, 0.38, 1.35, 0.38, toon('#3a3438'), -5.28, 0.68, -3.92);
  trap.rotation.y = Math.PI / 4;
  const band = addBox(g, 0.4, 0.06, 0.4, toon('#5a534e'), -5.28, 0.95, -3.92);
  band.rotation.y = Math.PI / 4;

  addCloud(g, -4.05, 2.92, -2.45, 2.3, 1.7, H - 0.08);
  addCloud(g, 0.55, 2.9, -1.25, 2.5, 1.7, H - 0.08);
  addCloud(g, 3.9, 2.9, 1.15, 1.7, 1.35, H - 0.08);

  for (const c of fx.covers) hangCover(g, c.x, c.y, c.s, c.art, zWall, !!c.feature);
  const light = addBox(g, 1.15, 0.03, 0.06, toon('#fff1d6', { emissive: '#ffd7a4', emissiveIntensity: 1.1 }), 0.9, 2.1, zWall + 0.1);
  light.userData.noCast = true;
  const signMap = signTexture();
  const sign = plane(2.2, 0.26, signMap, {
    emissive: '#ff9a3c',
    emissiveIntensity: 0.85,
    emissiveMap: signMap,
    noCast: true,
  });
  sign.position.set(0.9, 2.72, zWall + 0.08);
  g.add(sign);
  addBox(g, 3.15, 0.035, 0.05, toon('#4a3022'), 0.85, 0.8, zWall + 0.05);

  for (const bin of fx.bins) {
    if (bin.type === 'face') buildFaceOut(g, bin);
    else buildFlipBin(g, bin);
  }
  for (const bay of fx.bays) buildBay(g, bay);

  counterFixture(g, fx.counter);

  const lounge = findInst(layout, 'lounge_table');
  const audition = findInst(layout, 'audition_table');
  const coffeeH = layout.assets.coffee_table.targetHeight;
  const squareH = layout.assets.square_table.targetHeight;
  if (lounge) {
    addTurntable(g, lounge.position[0] - 0.05, coffeeH, lounge.position[2] - 0.05, 0.25);
    addCans(g, lounge.position[0] - 0.28, coffeeH + 0.05, lounge.position[2] + 0.32, 0.8);
  }
  if (audition) {
    addTurntable(g, audition.position[0] - 0.08, squareH, audition.position[2] - 0.06, -0.4);
    addCans(g, audition.position[0] + 0.12, squareH + 0.05, audition.position[2] + 0.18, -0.6);
  }

  const pendH = layout.assets.pendant_lamp.targetHeight;
  for (const inst of layout.instances) {
    if (inst.kind !== 'pendant_lamp') continue;
    const [x, y, z] = inst.position;
    const cord = addCyl(g, 0.007, 0.007, Math.max(0.08, H - 0.08 - (y + pendH)), toon('#2a221c'), x, (y + pendH + H - 0.08) / 2, z, 6);
    cord.userData.noCast = true;
    addBulb(g, x, y + 0.05, z, 0.04, '#ffd2a4');
  }

  const plinth = findInst(layout, 'plinth_pick');
  if (plinth) {
    const ph = layout.assets.museum_plinth.targetHeight;
    const spec = coverSpec(0);
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 0.016), sleeveMaterials(spec, 'z'));
    const pivot = new THREE.Group();
    mesh.position.y = 0.15;
    pivot.add(mesh);
    pivot.position.set(plinth.position[0], ph + 0.01, plinth.position[2]);
    pivot.rotation.x = -0.2;
    pivot.rotation.y = plinth.rotationY || 0;
    g.add(pivot);
    const card = plane(0.16, 0.05, labelTexture('NOW PLAYING'));
    card.position.set(plinth.position[0], ph + 0.04, plinth.position[2] + 0.16);
    g.add(card);
  }

  const till = fx.counter;
  addFlatStack(g, till.x + 0.08, till.height, till.z - 0.55, 5, 4);
  const now = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.26, 0.014), sleeveMaterials(coverSpec(0), 'z'));
  const nowPivot = new THREE.Group();
  now.position.y = 0.13;
  nowPivot.add(now);
  nowPivot.position.set(till.x - 0.02, till.height, till.z + 0.15);
  nowPivot.rotation.x = -0.35;
  nowPivot.rotation.y = -0.5;
  g.add(nowPivot);

  const clock = plane(0.28, 0.28, clockTexture(), { noCast: true });
  clock.position.set(-5.46, 2.62, -2.7);
  clock.rotation.y = Math.PI / 2;
  g.add(clock);

  const openMap = openTexture();
  const open = plane(0.42, 0.16, openMap, { emissive: '#ff9a3c', emissiveIntensity: 0.7, emissiveMap: openMap, noCast: true });
  open.position.set(-5.42, 2.15, 1.35);
  open.rotation.y = Math.PI / 2;
  g.add(open);

  for (let i = 0; i < 3; i++) {
    const spec = coverFromSeed(70 + i, 'jazz');
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.008, 0.2), sleeveMaterials(spec, 'y'));
    mesh.position.set(-5.42, 1.22 + i * 0.01, 1.55 + i * 0.015);
    mesh.rotation.y = 0.4 + i * 0.25;
    g.add(mesh);
  }

  const floorKinds = new Set(['sofa_solid', 'coffee_table', 'square_table', 'dining_chair', 'speaker', 'guitar_amp', 'bar_stool', 'flowerpot', 'museum_plinth', 'piano_bench']);
  const foot = {
    sofa_solid: [1.15, 1.9],
    coffee_table: [1.15, 1.75],
    square_table: [0.95, 0.95],
    dining_chair: [0.5, 0.55],
    speaker: [0.75, 0.45],
    guitar_amp: [0.7, 0.5],
    bar_stool: [0.5, 0.5],
    flowerpot: [0.4, 0.4],
    museum_plinth: [0.5, 0.5],
    piano_bench: [1.1, 0.55],
  };
  for (const inst of layout.instances) {
    if (!floorKinds.has(inst.kind) || inst.position[1] > 0.2) continue;
    const [w, d] = foot[inst.kind] || [0.5, 0.5];
    const sc = Array.isArray(inst.scale) ? inst.scale[0] : (inst.scale || 1);
    addContact(g, inst.position[0], inst.position[2], w * sc, d * sc, 0.026);
  }

  return g;
}

function decorate(prototypes) {
  const sofa = prototypes.sofa_solid;
  if (sofa) {
    const tint = new THREE.Color('#f3d2c2');
    sofa.traverse((o) => {
      if (!o.isMesh || !o.material) return;
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      for (const m of mats) if (m.color) m.color.multiply(tint);
    });
  }
  const pend = prototypes.pendant_lamp;
  if (pend) {
    pend.traverse((o) => {
      if (!o.isMesh || !o.material) return;
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      for (const m of mats) {
        if (!m.color) continue;
        if (m.color.r > 0.4 && m.color.r > m.color.b * 1.25) {
          m.emissive = m.color.clone();
          m.emissiveIntensity = 0.55;
        }
      }
    });
  }
}

boot({
  makeShell,
  makeProcedural,
  decorate,
  readyText: 'ready — Afterglow Records · drag orbit · T toon · U unlit · 1/2/3 cameras',
}).catch((err) => {
  console.error(err);
  const status = document.getElementById('status');
  if (status) status.textContent = `failed: ${err.message}`;
});
