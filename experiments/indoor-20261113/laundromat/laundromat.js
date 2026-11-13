import * as THREE from 'three';
import { boot, toon, contactDisc } from './scene_lib.js';

function box(g, sx, sy, sz, mat, x, y, z, rotY = 0, extra = {}) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), mat);
  m.position.set(x, y, z);
  if (rotY) m.rotation.y = rotY;
  if (extra.noShadow) m.userData.noShadow = true;
  m.castShadow = !extra.noShadow && extra.cast !== false;
  m.receiveShadow = !extra.noShadow && extra.receive !== false;
  g.add(m);
  return m;
}

function put(g, geo, mat, x, y, z, rot, extra = {}) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  if (rot) m.rotation.set(rot[0] || 0, rot[1] || 0, rot[2] || 0);
  if (extra.noShadow) m.userData.noShadow = true;
  m.castShadow = !extra.noShadow && extra.cast !== false;
  m.receiveShadow = !extra.noShadow && extra.receive !== false;
  g.add(m);
  return m;
}

function canvasTex(w, h, draw, repeat) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = THREE.RepeatWrapping;
  t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 4;
  if (repeat) t.repeat.set(repeat[0], repeat[1]);
  return t;
}

function makeTextures() {
  const tile = canvasTex(256, 256, (ctx, w, h) => {
    const n = 4;
    ctx.fillStyle = '#a89880';
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        const jitter = ((i * 13 + j * 7) % 5) * 3;
        ctx.fillStyle = (i + j) % 2 === 0 ? `rgb(${203 - jitter}, ${187 - jitter}, ${164 - jitter})` : `rgb(${192 - jitter}, ${176 - jitter}, ${152 - jitter})`;
        ctx.fillRect(i * 64 + 3, j * 64 + 3, 58, 58);
      }
    }
  }, [9.5, 7.4]);

  const plaster = canvasTex(256, 256, (ctx, w, h) => {
    ctx.fillStyle = '#f3ebe3';
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 80; i++) {
      const x = (i * 97) % w;
      const y = (i * 57) % h;
      ctx.fillStyle = i % 2 ? 'rgba(210,190,170,0.18)' : 'rgba(255,252,246,0.2)';
      ctx.fillRect(x, y, 18 + (i % 4) * 6, 10);
    }
  }, [3.2, 2.2]);

  const brush = canvasTex(128, 128, (ctx, w, h) => {
    ctx.fillStyle = '#c5ced4';
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 90; i++) {
      const x = (i * 47) % w;
      const y = (i * 29) % h;
      const shade = 180 + ((i * 13) % 40);
      ctx.fillStyle = `rgba(${shade},${shade + 4},${shade + 8},0.07)`;
      ctx.fillRect(x, y, 10 + (i % 5), 8);
    }
  }, [1, 1]);

  const laminate = canvasTex(256, 128, (ctx, w, h) => {
    ctx.fillStyle = '#efe6d4';
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 18; i++) {
      ctx.strokeStyle = `rgba(150, 120, 80, ${0.05 + (i % 3) * 0.03})`;
      ctx.beginPath();
      ctx.moveTo(0, (i * 19) % h);
      ctx.bezierCurveTo(80, (i * 19 + 8) % h, 160, (i * 13) % h, w, (i * 19 + 4) % h);
      ctx.stroke();
    }
  }, [2.2, 1]);

  const cloth = canvasTex(128, 128, (ctx) => {
    ctx.fillStyle = '#f3ece3';
    ctx.fillRect(0, 0, 128, 128);
    for (let i = 0; i < 70; i++) {
      const x = (i * 41) % 128;
      const y = (i * 23) % 128;
      ctx.fillStyle = i % 2 ? 'rgba(210,190,168,0.16)' : 'rgba(255,252,246,0.2)';
      ctx.beginPath();
      ctx.ellipse(x, y, 8 + (i % 4), 5, (i % 7) * 0.2, 0, Math.PI * 2);
      ctx.fill();
    }
  });

  const ceiling = canvasTex(256, 256, (ctx) => {
    ctx.fillStyle = '#d9d3c8';
    ctx.fillRect(0, 0, 256, 256);
    ctx.fillStyle = '#f7f4ee';
    ctx.fillRect(6, 6, 116, 116);
    ctx.fillRect(134, 6, 116, 116);
    ctx.fillRect(6, 134, 116, 116);
    ctx.fillRect(134, 134, 116, 116);
  }, [4.2, 3.1]);

  const bulkhead = canvasTex(128, 128, (ctx) => {
    ctx.fillStyle = '#c5ccc8';
    ctx.fillRect(0, 0, 128, 128);
    ctx.fillStyle = '#f7f4ee';
    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < 4; j++) ctx.fillRect(i * 32 + 2, j * 32 + 2, 28, 28);
    }
  }, [2, 1.2]);

  return { tile, plaster, brush, laminate, cloth, ceiling, bulkhead };
}

let TEX;
function tex() {
  if (!TEX) TEX = makeTextures();
  return TEX;
}

const labelCache = new Map();
function labelMap(text, bg, fg) {
  const key = `${text}|${bg}|${fg}`;
  if (labelCache.has(key)) return labelCache.get(key);
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 64;
  const g = c.getContext('2d');
  g.fillStyle = bg;
  g.fillRect(0, 0, 128, 64);
  g.fillStyle = fg;
  g.font = '600 34px sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(text, 64, 34);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  labelCache.set(key, t);
  return t;
}

function signMap(text, bg, fg) {
  const key = `sign|${text}|${bg}|${fg}`;
  if (labelCache.has(key)) return labelCache.get(key);
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = bg;
  g.fillRect(0, 0, 512, 128);
  g.fillStyle = fg;
  g.font = '700 72px sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(text, 256, 68);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  labelCache.set(key, t);
  return t;
}

function priceMap() {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 640;
  const g = c.getContext('2d');
  g.fillStyle = '#f6f1e6';
  g.fillRect(0, 0, 512, 640);
  g.fillStyle = '#1e4e4a';
  g.fillRect(0, 0, 512, 18);
  g.fillRect(0, 622, 512, 18);
  g.fillStyle = '#1c3d4a';
  g.font = '700 64px sans-serif';
  g.textAlign = 'center';
  g.fillText('WEST END', 256, 120);
  g.font = '600 42px sans-serif';
  g.fillStyle = '#2f6f68';
  g.fillText('WASH', 256, 180);
  g.textAlign = 'left';
  g.font = '500 40px sans-serif';
  g.fillStyle = '#2a2a28';
  const rows = [['Wash', '$4'], ['Large', '$7'], ['Dry', '8 min'], ['Soap', 'vend']];
  rows.forEach((row, i) => {
    const y = 280 + i * 78;
    g.fillText(row[0], 70, y);
    g.textAlign = 'right';
    g.fillText(row[1], 440, y);
    g.textAlign = 'left';
    g.strokeStyle = 'rgba(47,111,104,0.35)';
    g.beginPath();
    g.moveTo(70, y + 22);
    g.lineTo(440, y + 22);
    g.stroke();
  });
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function makeShell(layout) {
  const g = new THREE.Group();
  g.name = 'shell';
  const { width: W, depth: D, height: H } = layout.meta.room;
  const s = layout.shell;
  const z = layout.zones;
  const wall = toon('#ffffff', { map: tex().plaster });
  const teal = toon(s.wainscotColor);
  const trim = toon('#efe8dc');
  const floor = toon('#ffffff', { map: tex().tile });
  const edge = toon('#b7a78f');
  const glass = toon(s.windowTint, { transparent: true, opacity: 0.22, side: THREE.DoubleSide, depthWrite: false });
  const ceil = toon('#ffffff', { map: tex().ceiling });
  const outside = toon('#d5e3dc', { side: THREE.DoubleSide });

  box(g, W, 0.08, D, edge, 0, -0.04, 0);
  box(g, W - 0.04, 0.02, D - 0.04, floor, 0, 0.01, 0);

  const tw = 0.12;
  const bz = -D / 2 + tw / 2;
  const lx = -W / 2 + tw / 2;
  const rx = W / 2 - tw / 2;

  box(g, W, H, tw, wall, 0, H / 2, bz);
  box(g, tw, H, D, wall, lx, H / 2, 0);
  box(g, W, 0.1, tw, teal, 0, 0.05, bz + 0.02);
  box(g, tw, 1.05, D - 0.2, teal, lx + 0.02, 0.52, 0.05);
  box(g, tw, 0.045, D - 0.3, trim, lx + 0.04, 1.08, 0.05);

  const pierZ1 = z.pier.z1;
  const pierLen = pierZ1 - (-D / 2);
  box(g, tw, H, pierLen, wall, rx, H / 2, (-D / 2 + pierZ1) / 2);
  box(g, tw + 0.02, 1.05, pierLen - 0.08, teal, rx - 0.02, 0.52, (-D / 2 + pierZ1) / 2);

  const win = z.window;
  const frontZ = D / 2 - tw / 2;
  const pierW = win.x0 - (-W / 2);
  box(g, pierW, H, tw, wall, -W / 2 + pierW / 2, H / 2, frontZ);
  box(g, pierW - 0.08, 1.05, 0.04, teal, -W / 2 + pierW / 2, 0.52, frontZ - 0.04);
  const winW = win.x1 - win.x0;
  box(g, winW, win.y0, tw, wall, (win.x0 + win.x1) / 2, win.y0 / 2, frontZ);
  box(g, winW, H - win.y1, tw, wall, (win.x0 + win.x1) / 2, (H + win.y1) / 2, frontZ);
  box(g, winW + 0.08, 0.05, 0.08, trim, (win.x0 + win.x1) / 2, win.y1, frontZ + 0.02);
  box(g, winW + 0.08, 0.05, 0.08, trim, (win.x0 + win.x1) / 2, win.y0, frontZ + 0.02);
  box(g, 0.05, win.y1 - win.y0, 0.08, trim, win.x0, (win.y0 + win.y1) / 2, frontZ + 0.02);
  box(g, 0.05, win.y1 - win.y0, 0.08, trim, win.x1, (win.y0 + win.y1) / 2, frontZ + 0.02);
  box(g, 0.035, win.y1 - win.y0 - 0.08, 0.04, trim, (win.x0 + win.x1) / 2, (win.y0 + win.y1) / 2, frontZ + 0.03);
  box(g, winW - 0.1, 0.035, 0.04, trim, (win.x0 + win.x1) / 2, (win.y0 + win.y1) / 2, frontZ + 0.03);
  box(g, winW - 0.12, win.y1 - win.y0 - 0.1, 0.02, glass, (win.x0 + win.x1) / 2, (win.y0 + win.y1) / 2, frontZ + 0.01, 0, { noShadow: true });
  box(g, winW - 0.2, win.y1 - win.y0 - 0.2, 0.02, outside, (win.x0 + win.x1) / 2, (win.y0 + win.y1) / 2, D / 2 + 0.02, 0, { noShadow: true });
  box(g, winW + 0.1, 0.045, 0.16, trim, (win.x0 + win.x1) / 2, win.y0 - 0.01, frontZ - 0.06);

  const ceilD = 5.6;
  box(g, W - 0.5, 0.06, ceilD, ceil, -0.15, H - 0.04, -D / 2 + ceilD / 2 + 0.08, 0, { noShadow: true });
  box(g, 3.6, 0.06, 2.5, ceil, -3.3, H - 0.04, 2.55, 0, { noShadow: true });

  box(g, W - 0.8, 0.08, 0.08, edge, 0.2, 0.04, D / 2 - 0.02);
  return g;
}

function drumInterior(g, axis, mouthX, mouthY, mouthZ, radius, depth, mats, hot, perforated) {
  const quiet = { noShadow: true };
  const wall = hot ? mats.drumWallHot : mats.drumWall;
  const backMat = hot ? mats.cavityHot : (perforated ? mats.drumBackDry : mats.drumBackWash);
  const lifterMat = hot ? mats.lifterHot : mats.lifter;
  const rot = axis === 'x' ? [0, 0, Math.PI / 2] : [Math.PI / 2, 0, 0];
  const cx = axis === 'x' ? mouthX - depth / 2 : mouthX;
  const cz = axis === 'z' ? mouthZ - depth / 2 : mouthZ;
  put(g, new THREE.CylinderGeometry(radius, radius * 0.96, depth, 28, 1, true), wall, cx, mouthY, cz, rot, quiet);
  const bx = axis === 'x' ? mouthX - depth : mouthX;
  const bz = axis === 'z' ? mouthZ - depth : mouthZ;
  const faceRot = axis === 'x' ? [0, -Math.PI / 2, 0] : null;
  put(g, new THREE.CircleGeometry(radius * 0.98, 28), backMat, bx, mouthY, bz, faceRot, quiet);
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 + 0.5;
    const len = radius * 0.46;
    const rad = radius * 0.58;
    const geo = new THREE.BoxGeometry(0.016, len, 0.02);
    const fin = new THREE.Mesh(geo, lifterMat);
    fin.castShadow = false;
    fin.receiveShadow = false;
    if (axis === 'z') {
      fin.position.set(mouthX + Math.cos(a) * rad, mouthY + Math.sin(a) * rad, bz + 0.02);
      fin.rotation.z = a - Math.PI / 2;
    } else {
      fin.position.set(bx + 0.02, mouthY + Math.sin(a) * rad, mouthZ + Math.cos(a) * rad);
      fin.rotation.x = Math.PI / 2 - a;
    }
    g.add(fin);
  }
  if (!perforated) return;
  const hole = hot ? mats.holeHot : mats.hole;
  for (let ring = 0; ring < 2; ring++) {
    const count = ring === 0 ? 12 : 8;
    const pr = radius * (ring === 0 ? 0.62 : 0.34);
    const hr = radius * (ring === 0 ? 0.055 : 0.04);
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2 + ring * 0.2;
      put(g, new THREE.CircleGeometry(hr, 8), hole, mouthX + Math.cos(a) * pr, mouthY + Math.sin(a) * pr, bz + 0.006, null, quiet);
    }
  }
}

function doorRing(hinge, radius, glassMat, mats, axis) {
  const quiet = { cast: false };
  const rot = axis === 'x' ? [0, Math.PI / 2, 0] : null;
  const hx = axis === 'x' ? 0.018 : radius;
  const hz = axis === 'x' ? radius : 0.018;
  put(hinge, new THREE.TorusGeometry(radius, 0.016, 8, 32), mats.chrome, hx, 0, hz, rot, quiet);
  put(hinge, new THREE.TorusGeometry(radius * 0.9, 0.012, 8, 28), mats.gasket, axis === 'x' ? 0.01 : radius, 0, axis === 'x' ? radius : 0.01, rot, quiet);
  put(hinge, new THREE.CircleGeometry(radius * 0.84, 28), glassMat, axis === 'x' ? 0.026 : radius, 0, axis === 'x' ? radius : 0.026, rot, { noShadow: true });
  if (axis === 'x') {
    box(hinge, 0.018, 0.1, 0.016, mats.chrome, 0.04, -radius * 0.15, radius + radius * 0.72, 0, quiet);
  } else {
    box(hinge, 0.016, 0.09, 0.018, mats.chrome, radius + radius * 0.72, -radius * 0.15, 0.04, 0, quiet);
  }
}

function washerUnit(g, spec, mats) {
  const { faceX, z, w, h, depth, open, large, price, lamp } = spec;
  const body = large ? mats.enamelWarm : mats.enamel;
  const recess = 0.18;
  const bodyD = depth - recess;
  const bodyX = faceX - recess - bodyD / 2;
  box(g, bodyD, h - 0.1, w - 0.016, body, bodyX, (h - 0.1) / 2 + 0.05, z);
  const cheekX = faceX - recess / 2;
  box(g, recess, h - 0.12, 0.05, body, cheekX, h * 0.5, z - w / 2 + 0.03);
  box(g, recess, h - 0.12, 0.05, body, cheekX, h * 0.5, z + w / 2 - 0.03);
  box(g, recess + 0.02, 0.055, w - 0.02, mats.navy, faceX - recess / 2, h - 0.028, z);
  box(g, depth - 0.08, 0.06, w - 0.03, mats.navy, faceX - depth / 2, 0.035, z);
  box(g, recess, 0.045, w - 0.08, mats.enamelInset, cheekX, 0.1, z);

  const slots = large ? 4 : 3;
  const slotW = large ? 0.055 : 0.042;
  for (let i = 0; i < slots; i++) {
    box(g, 0.012, 0.04, slotW, mats.steel, faceX + 0.006, h - 0.1, z - w * 0.28 + i * (slotW + 0.012), 0, { cast: false });
  }

  const doorR = large ? 0.29 : 0.23;
  const doorY = large ? 0.62 : 0.55;
  const mouthX = faceX - 0.02;
  drumInterior(g, 'x', mouthX, doorY, z, doorR * 0.78, 0.16, mats, false, false);
  put(g, new THREE.TorusGeometry(doorR * 0.86, 0.01, 8, 28), mats.steel, mouthX + 0.004, doorY, z, [0, Math.PI / 2, 0], { cast: false });

  const hinge = new THREE.Group();
  hinge.position.set(faceX + 0.01, doorY, z - doorR);
  hinge.rotation.y = open || 0;
  g.add(hinge);
  doorRing(hinge, doorR, mats.glassWash, mats, 'x');

  const plate = toon('#ffffff', { map: labelMap(price, '#142028', '#d5f2e6') });
  box(g, 0.012, 0.07, 0.11, plate, faceX + 0.012, h - 0.16, z + w * 0.28, 0, { cast: false });
  if (lamp) {
    box(g, 0.012, 0.016, 0.016, lamp === 'run' ? mats.ledRun : mats.ledDone, faceX + 0.016, h - 0.22, z + w * 0.28, 0, { noShadow: true });
  }
}

function dryerColumn(g, spec, mats) {
  const { x, frontZ, w, h, depth, open, glow, card } = spec;
  const recess = 0.2;
  const bodyD = depth - recess;
  const cz = frontZ - recess - bodyD / 2;
  box(g, w - 0.01, h - 0.06, bodyD, mats.steelBody, x, h / 2 + 0.01, cz);
  const cheekZ = frontZ - recess / 2;
  box(g, 0.045, h - 0.08, recess, mats.steelBody, x - w / 2 + 0.028, h / 2, cheekZ);
  box(g, 0.045, h - 0.08, recess, mats.steelBody, x + w / 2 - 0.028, h / 2, cheekZ);
  box(g, w - 0.01, 0.05, recess, mats.steelDark, x, h - 0.03, cheekZ);
  box(g, w - 0.02, 0.07, recess + 0.02, mats.steelDark, x, 0.04, cheekZ);
  box(g, w - 0.08, 0.045, 0.03, mats.steelDark, x, 0.95, frontZ - 0.012);

  const doors = [0.5, 1.4];
  doors.forEach((y, index) => {
    const r = 0.24;
    const hot = glow && index === 0;
    const mouthZ = frontZ - 0.025;
    drumInterior(g, 'z', x, y, mouthZ, r * 0.8, 0.16, mats, hot, true);
    put(g, new THREE.TorusGeometry(r * 0.88, 0.01, 8, 28), mats.steel, x, y, mouthZ + 0.004, null, { cast: false });
    const hinge = new THREE.Group();
    hinge.position.set(x - r, y, frontZ + 0.008);
    hinge.rotation.y = open && index === 0 ? open : 0;
    g.add(hinge);
    doorRing(hinge, r, hot ? mats.glassWarm : mats.glassDry, mats, 'z');
    put(g, new THREE.CylinderGeometry(0.014, 0.014, 0.018, 10), mats.knob, x + w * 0.34, y + r * 0.15, frontZ + 0.02, [Math.PI / 2, 0, 0], { cast: false });
  });

  box(g, w - 0.14, 0.04, 0.018, mats.steelDark, x, 0.12, frontZ + 0.006, 0, { cast: false });
  box(g, w * 0.36, 0.012, 0.014, mats.chrome, x, 0.145, frontZ + 0.016, 0, { cast: false });
  if (card) {
    const cardMat = toon('#ffffff', { map: labelMap('OUT', '#f3efe4', '#8a3a32') });
    box(g, 0.16, 0.09, 0.01, cardMat, x, 0.95, frontZ + 0.02, 0, { cast: false });
  }
}

function tableFrame(g, x0, x1, z0, z1, h, top, edge, leg) {
  const w = x1 - x0;
  const d = z1 - z0;
  const cx = (x0 + x1) / 2;
  const cz = (z0 + z1) / 2;
  box(g, w, 0.05, d, top, cx, h - 0.025, cz);
  box(g, w - 0.04, 0.06, d - 0.04, edge, cx, h - 0.08, cz, 0, { cast: false });
  const inset = 0.08;
  for (const x of [x0 + inset, x1 - inset]) {
    for (const z of [z0 + inset, z1 - inset]) {
      box(g, 0.045, h - 0.08, 0.045, leg, x, (h - 0.08) / 2, z);
    }
  }
  box(g, w - 0.24, 0.03, 0.03, leg, cx, 0.16, cz);
}

function cart(g, spec, mats) {
  const [x, , z] = spec.position;
  const root = new THREE.Group();
  root.position.set(x, 0, z);
  root.rotation.y = spec.rotationY || 0;
  g.add(root);
  const w = 0.54;
  const d = 0.78;
  const bed = 0.22;
  const rim = 0.62;
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      put(root, new THREE.CylinderGeometry(0.04, 0.04, 0.05, 12), mats.rubber, sx * (w / 2 - 0.06), 0.045, sz * (d / 2 - 0.07));
    }
  }
  box(root, w, 0.04, d, mats.chrome, 0, bed, 0);
  box(root, 0.012, 0.16, d - 0.08, mats.wire, -w / 2 + 0.02, bed + 0.1, 0);
  box(root, 0.012, 0.16, d - 0.08, mats.wire, w / 2 - 0.02, bed + 0.1, 0);
  box(root, w - 0.08, 0.16, 0.012, mats.wire, 0, bed + 0.1, -d / 2 + 0.02);
  box(root, 0.02, rim - bed, 0.02, mats.chrome, -w / 2, (rim + bed) / 2, -d / 2);
  box(root, 0.02, rim - bed, 0.02, mats.chrome, w / 2, (rim + bed) / 2, -d / 2);
  box(root, 0.02, rim - bed, 0.02, mats.chrome, -w / 2, (rim + bed) / 2, d / 2);
  box(root, 0.02, rim - bed, 0.02, mats.chrome, w / 2, (rim + bed) / 2, d / 2);
  box(root, w, 0.025, 0.025, mats.chrome, 0, rim, 0);
  box(root, 0.025, 0.025, d, mats.chrome, 0, rim, 0);
  for (const sx of [-1, 1]) {
    box(root, 0.012, rim - bed - 0.04, 0.012, mats.wire, sx * w * 0.28, (rim + bed) / 2, 0);
    box(root, 0.012, rim - bed - 0.04, 0.012, mats.wire, 0, (rim + bed) / 2, sx * d * 0.28);
  }
  box(root, 0.02, 0.32, 0.02, mats.chrome, -w / 2, rim + 0.14, d / 2);
  box(root, 0.02, 0.32, 0.02, mats.chrome, w / 2, rim + 0.14, d / 2);
  box(root, w * 0.7, 0.025, 0.025, mats.chrome, 0, rim + 0.3, d / 2 + 0.02);
  if (spec.liner) {
    box(root, w - 0.08, 0.12, d - 0.1, mats.liner, 0, bed + 0.08, 0, 0, { cast: false });
    foldedTextile(root, -0.02, bed + 0.14, 0.02, 0.2, mats, 'blue');
  }
}

function foldTopMap(base, hem) {
  const key = `fold|${base}|${hem}`;
  if (labelCache.has(key)) return labelCache.get(key);
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const ctx = c.getContext('2d');
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 40; i++) {
    ctx.fillStyle = i % 2 ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';
    ctx.beginPath();
    ctx.ellipse((i * 47) % 256, (i * 29) % 256, 18, 8, i * 0.2, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = 'rgba(0,0,0,0.16)';
  ctx.fillRect(18, 118, 220, 10);
  ctx.fillStyle = hem;
  ctx.fillRect(0, 210, 256, 46);
  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  ctx.fillRect(0, 210, 256, 6);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  labelCache.set(key, t);
  return t;
}

function foldedTextile(g, x, y, z, rot, mats, kind) {
  const cloth = kind === 'blue' ? mats.blue : kind === 'clay' ? mats.clay : mats.towel;
  const hem = kind === 'blue' ? mats.blueHem : kind === 'clay' ? mats.clayHem : mats.hem;
  const topColor = kind === 'blue' ? '#6d8ea6' : kind === 'clay' ? '#c4896a' : '#f4efe6';
  const hemColor = kind === 'blue' ? '#4d6a82' : kind === 'clay' ? '#a56d52' : '#ddd0c0';
  const root = new THREE.Group();
  root.position.set(x, y, z);
  root.rotation.y = rot || 0;
  g.add(root);
  const quiet = { cast: false };
  const pile = (ox, oz, yaw, scale) => {
    const p = new THREE.Group();
    p.position.set(ox, 0, oz);
    p.rotation.y = yaw;
    p.scale.setScalar(scale);
    root.add(p);
    box(p, 0.32, 0.05, 0.22, cloth, 0, 0.025, 0, 0, quiet);
    box(p, 0.28, 0.036, 0.15, cloth, 0.008, 0.062, 0.02, 0, quiet);
    box(p, 0.27, 0.018, 0.03, hem, 0.008, 0.078, 0.09, 0, quiet);
    const top = new THREE.Mesh(
      new THREE.PlaneGeometry(0.3, 0.2),
      toon('#ffffff', { map: foldTopMap(topColor, hemColor), side: THREE.DoubleSide }),
    );
    top.rotation.x = -Math.PI / 2;
    top.position.set(0.006, 0.084, 0.01);
    top.userData.noShadow = true;
    p.add(top);
  };
  pile(0, 0, 0.08, 1);
  pile(0.015, -0.01, -0.28, 0.8);
}

function clockFaceMap() {
  const key = 'clock-face';
  if (labelCache.has(key)) return labelCache.get(key);
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#f4efe6';
  ctx.beginPath();
  ctx.arc(128, 128, 122, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#1c2428';
  ctx.lineWidth = 12;
  ctx.stroke();
  ctx.fillStyle = '#1c2428';
  ctx.font = '700 42px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('12', 128, 40);
  ctx.fillText('3', 210, 132);
  ctx.fillText('6', 128, 218);
  ctx.fillText('9', 46, 132);
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  for (let i = 0; i < 12; i++) {
    const theta = (i / 12) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(128 + Math.sin(theta) * 92, 128 - Math.cos(theta) * 92);
    ctx.lineTo(128 + Math.sin(theta) * 106, 128 - Math.cos(theta) * 106);
    ctx.stroke();
  }
  const hand = (hour, len, width) => {
    const theta = (hour / 12) * Math.PI * 2;
    ctx.lineWidth = width;
    ctx.beginPath();
    ctx.moveTo(128, 128);
    ctx.lineTo(128 + Math.sin(theta) * len, 128 - Math.cos(theta) * len);
    ctx.stroke();
  };
  hand(10, 58, 8);
  hand(2, 86, 5);
  ctx.fillStyle = '#8a3a32';
  ctx.beginPath();
  ctx.arc(128, 128, 7, 0, Math.PI * 2);
  ctx.fill();
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  labelCache.set(key, t);
  return t;
}

function makeProcedural(layout) {
  const g = new THREE.Group();
  g.name = 'procedural';
  const zones = layout.zones;
  const { height: H } = layout.meta.room;
  const mats = {
    enamel: toon('#f7f4ee'),
    enamelWarm: toon('#f3efe4'),
    enamelInset: toon('#e7e2d8'),
    navy: toon('#1c3d5a'),
    steel: toon('#d5dde3'),
    steelBody: toon('#c5ced4', { map: tex().brush }),
    steelDark: toon('#5c6a72'),
    chrome: toon('#e7eef2'),
    gasket: toon('#1c2226'),
    glassWash: toon('#4d6468', { transparent: true, opacity: 0.34, side: THREE.DoubleSide, depthWrite: false }),
    glassDry: toon('#6a7c86', { transparent: true, opacity: 0.22, side: THREE.DoubleSide, depthWrite: false }),
    glassWarm: toon('#c4926a', { transparent: true, opacity: 0.2, side: THREE.DoubleSide, depthWrite: false }),
    drumWall: toon('#8d99a1', { side: THREE.DoubleSide }),
    drumWallHot: toon('#a88468', { emissive: '#e0a060', emissiveIntensity: 0.35, side: THREE.DoubleSide }),
    drumBackWash: toon('#2a3338'),
    drumBackDry: toon('#4a555c'),
    cavityHot: toon('#e7b27a', { emissive: '#ffb15a', emissiveIntensity: 0.9 }),
    lifter: toon('#d5dee4'),
    lifterHot: toon('#6a4030'),
    hole: toon('#1a2024'),
    holeHot: toon('#3a2418'),
    knob: toon('#eceff2'),
    ledRun: toon('#b8fff0', { emissive: '#7dffe8', emissiveIntensity: 1.2 }),
    ledDone: toon('#ffd7a8', { emissive: '#ffb15a', emissiveIntensity: 1.1 }),
    wire: toon('#c5ced4'),
    rubber: toon('#2c3134'),
    liner: toon('#3d7a74'),
    towel: toon('#f4efe6', { map: tex().cloth }),
    towelBand: toon('#e4d3c0'),
    hem: toon('#ddd0c0'),
    bag: toon('#c4b49a'),
    mat: toon('#3c4448'),
    clay: toon('#c4896a'),
    blue: toon('#6d8ea6'),
    blueHem: toon('#4d6a82'),
    clayHem: toon('#a56d52'),
    leg: toon('#ece8e0'),
    edge: toon('#c6a36a'),
    lam: toon('#ffffff', { map: tex().laminate }),
    sortTop: toon('#e4eaee'),
    sortEdge: toon('#8d99a1'),
    vendBody: toon('#243833'),
    vendTrim: toon('#f4efe6'),
    bottleA: toon('#2f6f68'),
    bottleB: toon('#e3b15a'),
    bottleC: toon('#f4f7f8'),
    bottleD: toon('#3d6f9a'),
    cap: toon('#1c2428'),
    board: toon('#ffffff', { map: priceMap() }),
    leaf: toon('#3f7a48'),
    leafDark: toon('#2c5a36'),
    potSoil: toon('#5a4030'),
    drain: toon('#3e4650'),
    duct: toon('#c5ced6'),
    flu: toon('#f4f8ff', { emissive: '#f7fbff', emissiveIntensity: 1.15 }),
    fluHousing: toon('#e4e0d8'),
    bulk: toon('#ffffff', { map: tex().bulkhead }),
    trash: toon('#3a4144'),
    trashRim: toon('#d5dbdf'),
    basket: toon('#c9a06a'),
    clockFace: toon('#f7f4ee'),
    clockHand: toon('#1c2428'),
  };

  const dry = zones.dryers;
  const frontZ = dry.wallZ + dry.depth;
  box(g, dry.count * dry.colW + 0.08, dry.h + 0.04, 0.02, mats.bulk, dry.x0 + (dry.count * dry.colW) / 2, dry.h / 2, dry.wallZ - 0.012);
  for (let i = 0; i < dry.count; i++) {
    const x = dry.x0 + dry.colW * (i + 0.5);
    dryerColumn(g, {
      x,
      frontZ,
      w: dry.colW - 0.008,
      h: dry.h,
      depth: dry.depth,
      open: i === dry.openIndex ? -0.62 : 0,
      glow: dry.glow.includes(i),
      card: i === dry.cardIndex,
    }, mats);
  }
  const drySpan = dry.count * dry.colW;
  const dryMid = dry.x0 + drySpan / 2;
  box(g, drySpan, 0.16, 0.28, mats.duct, dryMid, dry.h + 0.12, dry.wallZ + 0.22);
  box(g, 0.32, H - dry.h - 0.28, 0.24, mats.duct, dry.x0 + drySpan - 0.3, (H + dry.h + 0.16) / 2, dry.wallZ + 0.2);
  contactDisc(g, dryMid, frontZ - dry.depth / 2, drySpan * 0.48, 0.42, 0.42);

  const wash = zones.washers;
  const std = wash.standards;
  const big = wash.larges;
  const stdFace = wash.wallX + std.depth;
  const bigFace = wash.wallX + big.depth;
  const stdLen = std.count * std.w + (std.count - 1) * std.gap;
  const bigLen = big.count * big.w + (big.count - 1) * big.gap;
  box(g, 0.02, 1.35, stdLen + bigLen + 0.45, mats.bulk, wash.wallX - 0.012, 0.7, (std.z0 + big.z0 + bigLen) / 2);
  for (let i = 0; i < std.count; i++) {
    const z = std.z0 + std.w / 2 + i * (std.w + std.gap);
    washerUnit(g, {
      faceX: stdFace,
      z,
      w: std.w - 0.01,
      h: std.h,
      depth: std.depth,
      open: i === std.openIndex ? -0.78 : 0,
      large: false,
      price: String(i + 1),
      lamp: i === 1 ? 'run' : i === 3 ? 'done' : null,
    }, mats);
  }
  for (let i = 0; i < big.count; i++) {
    const z = big.z0 + big.w / 2 + i * (big.w + big.gap);
    washerUnit(g, {
      faceX: bigFace,
      z,
      w: big.w - 0.012,
      h: big.h,
      depth: big.depth,
      open: 0,
      large: true,
      price: String(std.count + i + 1),
      lamp: i === 0 ? 'run' : null,
    }, mats);
  }
  contactDisc(g, (stdFace + wash.wallX) / 2, (std.z0 + big.z0 + bigLen) / 2, 0.42, (stdLen + bigLen) * 0.48, 0.35);

  const fold = zones.fold;
  const foldZ1 = fold.backZ + fold.depth;
  tableFrame(g, fold.x0, fold.x1, fold.backZ, foldZ1, fold.h, mats.lam, mats.edge, mats.leg);
  const fx = (fold.x0 + fold.x1) / 2;
  const fz = (fold.backZ + foldZ1) / 2;
  foldedTextile(g, fx - 1.35, fold.h, fz + 0.04, 0.08, mats, 'cream');
  foldedTextile(g, fx - 0.7, fold.h, fz - 0.06, -0.18, mats, 'blue');
  foldedTextile(g, fx + 0.05, fold.h, fz + 0.02, 0.22, mats, 'cream');
  foldedTextile(g, fx + 0.75, fold.h, fz - 0.02, -0.08, mats, 'clay');
  foldedTextile(g, fx + 1.4, fold.h, fz + 0.05, 0.3, mats, 'blue');
  box(g, 0.22, 0.07, 0.16, mats.basket, fx - 1.55, fold.h + 0.04, fz + 0.1, 0.15, { cast: false });
  contactDisc(g, fx, fz, (fold.x1 - fold.x0) * 0.48, fold.depth * 0.55, 0.38);

  const sort = zones.sort;
  tableFrame(g, sort.x0, sort.x1, sort.z0, sort.z1, sort.h, mats.sortTop, mats.sortEdge, mats.leg);
  const sx = (sort.x0 + sort.x1) / 2;
  const sz = (sort.z0 + sort.z1) / 2;
  box(g, 0.32, 0.1, 0.24, mats.basket, sx, sort.h + 0.06, sz - 0.35, 0, { cast: false });
  foldedTextile(g, sx, sort.h + 0.1, sz - 0.35, 0.4, mats, 'blue');
  foldedTextile(g, sx, sort.h, sz + 0.4, 0.5, mats, 'cream');
  contactDisc(g, sx, sz, 0.36, (sort.z1 - sort.z0) * 0.48, 0.32);

  for (const spec of layout.props || []) {
    if (spec.kind === 'cart') cart(g, spec, mats);
    contactDisc(g, spec.position[0], spec.position[2], 0.34, 0.42, 0.4);
  }

  const vend = zones.vending;
  const vFront = vend.z + vend.d / 2;
  box(g, vend.w, vend.h, vend.d, mats.vendBody, vend.x, vend.h / 2, vend.z);
  box(g, 0.06, vend.h - 0.22, 0.03, mats.vendTrim, vend.x - vend.w / 2 + 0.04, vend.h * 0.48, vFront + 0.012);
  box(g, 0.06, vend.h - 0.22, 0.03, mats.vendTrim, vend.x + vend.w / 2 - 0.04, vend.h * 0.48, vFront + 0.012);
  box(g, vend.w - 0.04, 0.08, 0.03, mats.vendTrim, vend.x, 0.28, vFront + 0.012);
  box(g, vend.w - 0.04, 0.08, 0.03, mats.vendTrim, vend.x, vend.h - 0.22, vFront + 0.012);
  const glass = toon('#d5e6ee', { transparent: true, opacity: 0.1, side: THREE.DoubleSide, depthWrite: false });
  box(g, vend.w - 0.16, vend.h - 0.5, 0.01, glass, vend.x, vend.h * 0.5, vFront + 0.03, 0, { noShadow: true });
  const bottles = [mats.bottleA, mats.bottleB, mats.bottleC, mats.bottleD];
  for (let col = 0; col < 4; col++) {
    for (let row = 0; row < 4; row++) {
      const bx = vend.x - 0.24 + col * 0.16;
      const by = 0.48 + row * 0.3;
      put(g, new THREE.CylinderGeometry(0.055, 0.06, 0.24, 10), bottles[(col + row) % 4], bx, by, vFront + 0.016);
      put(g, new THREE.CylinderGeometry(0.034, 0.034, 0.04, 8), mats.cap, bx, by + 0.135, vFront + 0.016);
    }
  }
  box(g, 0.2, 0.07, 0.03, mats.chrome, vend.x, 0.16, vFront + 0.02);
  box(g, 0.05, 0.05, 0.02, mats.ledRun, vend.x - 0.12, 0.16, vFront + 0.03, 0, { noShadow: true });
  box(g, vend.w - 0.2, 0.035, 0.015, mats.flu, vend.x, vend.h - 0.28, vFront - 0.04, 0, { noShadow: true });
  const vendSign = toon('#ffffff', { map: labelMap('SOAP', '#1e4e4a', '#f6f1e6') });
  box(g, vend.w - 0.16, 0.1, 0.02, vendSign, vend.x, vend.h - 0.08, vFront + 0.016);
  contactDisc(g, vend.x, vend.z, vend.w * 0.55, vend.d * 0.6, 0.4);

  const ch = zones.change;
  box(g, ch.w, ch.h, ch.d, mats.steelDark, ch.x, 1.15, ch.z);
  box(g, 0.02, 0.28, 0.16, mats.enamel, ch.x - ch.w / 2 - 0.01, 1.22, ch.z);
  box(g, 0.02, 0.04, 0.1, mats.chrome, ch.x - ch.w / 2 - 0.02, 0.95, ch.z);
  box(g, 0.015, 0.02, 0.02, mats.ledRun, ch.x - ch.w / 2 - 0.02, 1.38, ch.z + 0.06, 0, { noShadow: true });
  const changeSign = toon('#ffffff', { map: signMap('CHANGE', '#2a3034', '#f4efe6') });
  const changeFace = new THREE.Mesh(new THREE.PlaneGeometry(0.22, 0.08), changeSign);
  changeFace.position.set(ch.x - ch.w / 2 - 0.02, 1.22, ch.z);
  changeFace.rotation.y = Math.PI / 2;
  changeFace.userData.noShadow = true;
  g.add(changeFace);

  const desk = zones.attendant;
  tableFrame(
    g,
    desk.x - desk.w / 2,
    desk.x + desk.w / 2,
    desk.z - desk.d / 2,
    desk.z + desk.d / 2,
    desk.h,
    mats.lam,
    mats.edge,
    toon('#6a4c34'),
  );
  contactDisc(g, desk.x, desk.z, desk.w * 0.6, desk.d * 0.48, 0.32);

  box(g, 0.62, 0.78, 0.02, mats.board, 5.62, 1.72, -0.42, -Math.PI / 2);

  function wallSign(text, x, y, z, w, h, rotY) {
    const mat = toon('#ffffff', { map: signMap(text, '#1e4e4a', '#f6f1e6'), side: THREE.DoubleSide });
    const nx = Math.sin(rotY);
    const nz = Math.cos(rotY);
    const face = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
    face.position.set(x + nx * 0.025, y, z + nz * 0.025);
    face.rotation.y = rotY;
    face.userData.noShadow = true;
    g.add(face);
    const back = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.018), toon('#163632'));
    back.position.set(x, y, z);
    back.rotation.y = rotY;
    back.userData.noShadow = true;
    g.add(back);
  }
  wallSign('DRYERS', dryMid, dry.h + 0.28, frontZ + 0.04, 1.45, 0.22, 0);
  const washMidZ = (std.z0 + big.z0 + bigLen) / 2;
  wallSign('WASHERS', wash.wallX + 0.38, 2.24, washMidZ, 1.7, 0.34, 0.85);

  const mat = new THREE.Mesh(new THREE.PlaneGeometry(1.25, 0.8), mats.mat);
  mat.rotation.x = -Math.PI / 2;
  mat.position.set(0.15, 0.025, 1.85);
  mat.userData.noShadow = true;
  g.add(mat);
  const tote = new THREE.Group();
  tote.position.set(1.15, 0, 1.82);
  tote.rotation.y = 0.7;
  g.add(tote);
  const tw = 0.46;
  const td = 0.3;
  const quiet = { cast: false };
  box(tote, tw, 0.025, td, mats.bag, 0, 0.1, 0, 0, quiet);
  box(tote, tw, 0.03, 0.022, mats.hem, 0, 0.38, td / 2, 0, quiet);
  box(tote, tw, 0.03, 0.022, mats.hem, 0, 0.38, -td / 2, 0, quiet);
  box(tote, 0.022, 0.03, td, mats.hem, -tw / 2, 0.38, 0, 0, quiet);
  box(tote, 0.022, 0.03, td, mats.hem, tw / 2, 0.38, 0, 0, quiet);
  for (const side of [-1, 1]) {
    for (let i = 0; i < 5; i++) {
      box(tote, 0.01, 0.26, 0.01, mats.wire, side * (tw / 2), 0.24, -td / 2 + 0.04 + i * (td / 5), 0, quiet);
    }
    box(tote, 0.01, 0.01, td - 0.04, mats.wire, side * (tw / 2), 0.18, 0, 0, quiet);
    box(tote, 0.01, 0.01, td - 0.04, mats.wire, side * (tw / 2), 0.3, 0, 0, quiet);
  }
  for (const end of [-1, 1]) {
    for (let i = 0; i < 4; i++) {
      box(tote, 0.01, 0.26, 0.01, mats.wire, -tw / 2 + 0.07 + i * (tw / 4.2), 0.24, end * (td / 2), 0, quiet);
    }
  }
  foldedTextile(tote, 0.02, 0.12, 0, 0.15, mats, 'blue');
  put(tote, new THREE.TorusGeometry(0.12, 0.012, 8, 18, Math.PI), mats.chrome, 0, 0.39, -0.05, null, quiet);
  put(tote, new THREE.TorusGeometry(0.12, 0.012, 8, 18, Math.PI), mats.chrome, 0, 0.39, 0.05, null, quiet);

  const clockMat = toon('#ffffff', { map: clockFaceMap() });
  put(g, new THREE.CircleGeometry(0.2, 40), clockMat, dryMid - 1.15, 2.55, dry.wallZ + 0.06, null, { noShadow: true });
  put(g, new THREE.TorusGeometry(0.2, 0.012, 8, 32), mats.clockHand, dryMid - 1.15, 2.55, dry.wallZ + 0.07, null, { cast: false });

  for (const p of layout.lights.points) {
    if (p.fixture !== 'fluorescent') continue;
    box(g, 0.72, 0.06, 0.28, mats.fluHousing, p.position[0], H - 0.08, p.position[2], 0, { noShadow: true });
    box(g, 0.62, 0.02, 0.18, mats.flu, p.position[0], H - 0.12, p.position[2], 0, { noShadow: true });
  }

  box(g, 0.28, 0.36, 0.28, mats.trash, 2.2, 0.18, -1.78);
  box(g, 0.3, 0.03, 0.3, mats.trashRim, 2.2, 0.36, -1.78);
  put(g, new THREE.CylinderGeometry(0.16, 0.16, 0.012, 16), mats.drain, -4.15, 0.02, 0.2, null, { noShadow: true });
  for (let i = -2; i <= 2; i++) {
    box(g, 0.3, 0.008, 0.012, mats.drain, -4.15, 0.028, 0.2 + i * 0.05, 0, { noShadow: true });
  }

  for (const inst of layout.instances) {
    if (inst.kind !== 'flowerpot') continue;
    const s = inst.scale || 1;
    const y = inst.position[1] + 0.22 * s * 0.72;
    put(g, new THREE.SphereGeometry(0.08 * s, 8, 6), mats.leaf, inst.position[0], y + 0.06, inst.position[2]);
    put(g, new THREE.SphereGeometry(0.06 * s, 8, 6), mats.leafDark, inst.position[0] + 0.05 * s, y + 0.02, inst.position[2] + 0.03);
    put(g, new THREE.SphereGeometry(0.05 * s, 8, 6), mats.leaf, inst.position[0] - 0.04 * s, y, inst.position[2] - 0.02);
  }

  for (const inst of layout.instances) {
    if (inst.kind === 'simple_chair' || inst.kind === 'bench' || inst.kind === 'side_table') {
      contactDisc(g, inst.position[0], inst.position[2], inst.kind === 'bench' ? 0.85 : 0.32, inst.kind === 'bench' ? 0.28 : 0.32, 0.38);
    }
  }
  return g;
}

function preparePrototype(kind, root) {
  if (kind !== 'desk_lamp') return;
  root.traverse((obj) => {
    if (!obj.isMesh) return;
    const name = (obj.name || '').toLowerCase();
    if (!name.includes('light') && !name.includes('tube')) return;
    const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
    for (const m of mats) {
      if (!m || !m.emissive) continue;
      m.emissive.set('#ffd7a1');
      m.emissiveIntensity = 1.2;
    }
  });
}

boot({
  makeShell,
  makeProcedural,
  preparePrototype,
  readyText: 'ready — West End Wash · drag orbit · U unlit · T toon',
});
