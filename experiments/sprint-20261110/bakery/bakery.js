import * as THREE from 'three';
import { boot, toon, addBox, addCyl } from './scene_lib.js';

const SERIF = '"Liberation Serif", "DejaVu Serif", serif';
const SANS = '"Liberation Sans", "DejaVu Sans", sans-serif';

function canvasTex(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d'), w, h);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  tex.needsUpdate = true;
  return tex;
}

function tileTex() {
  return canvasTex(2048, 2048, (g, w, h) => {
    const n = 36;
    const tw = w / n;
    const th = h / n;
    for (let y = 0; y < n; y++) {
      for (let x = 0; x < n; x++) {
        const shift = (x * 3 + y * 7) % 5;
        const base = ['#c4784a', '#b86a40', '#d08a58', '#c06e42', '#a85e38'][shift];
        g.fillStyle = base;
        g.fillRect(x * tw, y * th, tw + 1, th + 1);
        if ((x + y * 4) % 17 === 0) {
          g.fillStyle = '#8d9a78';
          g.fillRect(x * tw + 2, y * th + 2, tw - 4, th - 4);
        }
      }
    }
    g.strokeStyle = '#ead7bf';
    g.lineWidth = 3;
    for (let i = 0; i <= n; i++) {
      g.beginPath();
      g.moveTo(i * tw, 0);
      g.lineTo(i * tw, h);
      g.stroke();
      g.beginPath();
      g.moveTo(0, i * th);
      g.lineTo(w, i * th);
      g.stroke();
    }
  });
}

function woodTex() {
  return canvasTex(1024, 1024, (g, w, h) => {
    g.fillStyle = '#a56b3c';
    g.fillRect(0, 0, w, h);
    const rows = 14;
    const rh = h / rows;
    for (let i = 0; i < rows; i++) {
      g.fillStyle = i % 2 ? '#b37844' : '#976036';
      g.fillRect(0, i * rh, w, rh - 3);
      g.fillStyle = '#6a4124';
      g.fillRect(0, i * rh + rh - 3, w, 3);
      const seams = 3 + (i % 3);
      for (let s = 0; s < seams; s++) {
        const x = ((s * 170 + i * 90) % 980) + 10;
        g.fillRect(x, i * rh, 3, rh - 3);
      }
    }
  });
}

function subwayTex() {
  return canvasTex(1024, 512, (g, w, h) => {
    g.fillStyle = '#e7dccb';
    g.fillRect(0, 0, w, h);
    const cols = 16;
    const rows = 8;
    const tw = w / cols;
    const th = h / rows;
    for (let y = 0; y < rows; y++) {
      const ox = y % 2 ? tw / 2 : 0;
      for (let x = -1; x < cols + 1; x++) {
        const sage = (x + y) % 9 === 0;
        g.fillStyle = sage ? '#9aa884' : (x + y) % 2 ? '#f4efe6' : '#efe6d8';
        g.fillRect(x * tw + ox + 2, y * th + 2, tw - 4, th - 4);
      }
    }
  });
}

function beadTex() {
  return canvasTex(512, 256, (g, w, h) => {
    g.fillStyle = '#7a4e32';
    g.fillRect(0, 0, w, h);
    for (let x = 0; x < w; x += 14) {
      g.fillStyle = x % 28 ? '#6b4228' : '#8a5a38';
      g.fillRect(x, 0, 10, h);
    }
  });
}

function signTex(title, subtitle, bg, fg) {
  return canvasTex(1024, 320, (g, w, h) => {
    g.fillStyle = bg;
    g.fillRect(0, 0, w, h);
    g.strokeStyle = '#e6c48a';
    g.lineWidth = 14;
    g.strokeRect(16, 16, w - 32, h - 32);
    g.fillStyle = fg;
    g.font = `700 132px ${SERIF}`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(title, w / 2, h * 0.42);
    g.font = `400 42px ${SANS}`;
    g.fillStyle = '#f0d7a4';
    g.fillText(subtitle, w / 2, h * 0.74);
  });
}

function menuTex() {
  const lines = [
    ['country loaf', '6'],
    ['seeded rye', '7'],
    ['olive batard', '8'],
    ['morning bun', '4'],
    ['croissant', '5'],
    ['fruit tart', '6'],
    ['kouign amann', '5'],
  ];
  return canvasTex(768, 1024, (g, w, h) => {
    g.fillStyle = '#2a322c';
    g.fillRect(0, 0, w, h);
    g.strokeStyle = '#c4a06a';
    g.lineWidth = 16;
    g.strokeRect(12, 12, w - 24, h - 24);
    g.fillStyle = '#f3ead4';
    g.font = `700 72px ${SERIF}`;
    g.textAlign = 'center';
    g.fillText('HEARTH', w / 2, 110);
    g.font = `400 32px ${SANS}`;
    g.fillStyle = '#e6c48a';
    g.fillText("today's bake", w / 2, 168);
    lines.forEach((row, i) => {
      const y = 250 + i * 96;
      g.fillStyle = '#f6efe2';
      g.font = `500 40px ${SANS}`;
      g.textAlign = 'left';
      g.fillText(row[0], 64, y);
      g.textAlign = 'right';
      g.fillText(row[1], w - 64, y);
      g.strokeStyle = '#6d7a68';
      g.lineWidth = 2;
      g.beginPath();
      g.moveTo(64, y + 22);
      g.lineTo(w - 64, y + 22);
      g.stroke();
    });
  });
}

function cardTex(a, b) {
  return canvasTex(512, 320, (g, w, h) => {
    g.fillStyle = '#f6efe2';
    g.fillRect(0, 0, w, h);
    g.strokeStyle = '#6b4228';
    g.lineWidth = 10;
    g.strokeRect(8, 8, w - 16, h - 16);
    g.fillStyle = '#6b2e22';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.font = `700 64px ${SERIF}`;
    g.fillText(a, w / 2, h * 0.38);
    g.font = `500 36px ${SANS}`;
    g.fillStyle = '#3a2a22';
    g.fillText(b, w / 2, h * 0.68);
  });
}

function labelTex(text) {
  return canvasTex(256, 96, (g, w, h) => {
    g.fillStyle = '#f4efe4';
    g.fillRect(0, 0, w, h);
    g.fillStyle = '#3a2a22';
    g.font = `700 42px ${SANS}`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(text, w / 2, h / 2);
  });
}

let contactMap;
function contactMaterial() {
  if (!contactMap) {
    contactMap = canvasTex(128, 128, (g) => {
      const grd = g.createRadialGradient(64, 64, 6, 64, 64, 62);
      grd.addColorStop(0, 'rgba(48,24,12,0.65)');
      grd.addColorStop(0.5, 'rgba(48,24,12,0.25)');
      grd.addColorStop(1, 'rgba(48,24,12,0)');
      g.fillStyle = grd;
      g.fillRect(0, 0, 128, 128);
    });
  }
  const m = new THREE.MeshBasicMaterial({
    map: contactMap,
    transparent: true,
    opacity: 0.7,
    depthWrite: false,
  });
  m.userData.keepBasic = true;
  return m;
}

function addContact(g, x, z, rx, rz) {
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(rx * 2, rz * 2), contactMaterial());
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set(x, 0.028, z);
  mesh.renderOrder = 2;
  g.add(mesh);
}

function painted(g, tex, w, h, x, y, z, rotY = 0) {
  const mat = toon('#ffffff', { map: tex });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
  mesh.position.set(x, y, z);
  mesh.rotation.y = rotY;
  mesh.userData.noShadow = true;
  mesh.receiveShadow = false;
  g.add(mesh);
  return mesh;
}

function flatGlass(opacity) {
  const m = new THREE.MeshBasicMaterial({
    color: '#d5e4ea',
    transparent: true,
    opacity,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  m.userData.keepBasic = true;
  return m;
}

function noShadow(mesh) {
  mesh.userData.noShadow = true;
  mesh.castShadow = false;
  return mesh;
}

function bulb(g, x, y, z, r = 0.04) {
  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(r, 10, 8),
    toon('#fff6d4', { emissive: '#ffb04a', emissiveIntensity: 1.8 })
  );
  mesh.position.set(x, y, z);
  noShadow(mesh);
  g.add(mesh);
  return mesh;
}

function point(g, color, intensity, distance, x, y, z) {
  const light = new THREE.PointLight(color, intensity, distance, 2);
  light.position.set(x, y, z);
  g.add(light);
}

function makeShell(layout) {
  const g = new THREE.Group();
  g.name = 'shell';
  const { width: W, depth: D, height: H } = layout.meta.room;
  const plaster = toon(layout.shell.wallColor);
  const wood = toon(layout.shell.woodColor);
  const woodL = toon(layout.shell.woodLight);
  const ceilMat = toon(layout.shell.ceilingColor);
  const glass = flatGlass(0.34);
  const tileMat = toon('#ffffff', { map: tileTex(), polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  const woodFloor = toon('#ffffff', { map: woodTex(), polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 });
  const bead = toon('#ffffff', { map: beadTex() });
  const subway = toon('#ffffff', { map: subwayTex() });

  const floor = new THREE.Mesh(new THREE.BoxGeometry(W, 0.08, D), toon('#a86840'));
  floor.position.set(0, -0.04, 0);
  floor.receiveShadow = true;
  g.add(floor);

  const tile = new THREE.Mesh(new THREE.PlaneGeometry(W - 0.04, D - 0.04), tileMat);
  tile.rotation.x = -Math.PI / 2;
  tile.position.y = 0.006;
  tile.receiveShadow = true;
  g.add(tile);

  const inlay = new THREE.Mesh(new THREE.PlaneGeometry(3.7, 4.35), woodFloor);
  inlay.rotation.x = -Math.PI / 2;
  inlay.position.set(-3.35, 0.012, 1.45);
  inlay.receiveShadow = true;
  g.add(inlay);

  const back = new THREE.Mesh(new THREE.BoxGeometry(W, H, 0.14), plaster);
  back.position.set(0, H / 2, -D / 2);
  back.receiveShadow = true;
  g.add(back);

  const winZ0 = -0.45;
  const winZ1 = 3.2;
  const sill = 0.78;
  const head = 2.42;
  const wallT = 0.14;
  const xw = -W / 2;
  addBox(g, wallT, H, winZ0 + D / 2, plaster, xw, H / 2, (-D / 2 + winZ0) / 2);
  addBox(g, wallT, H, D / 2 - winZ1, plaster, xw, H / 2, (winZ1 + D / 2) / 2);
  addBox(g, wallT, sill, winZ1 - winZ0, plaster, xw, sill / 2, (winZ0 + winZ1) / 2);
  addBox(g, wallT, H - head, winZ1 - winZ0, plaster, xw, (head + H) / 2, (winZ0 + winZ1) / 2);
  const winGlass = addBox(g, 0.03, head - sill - 0.08, winZ1 - winZ0 - 0.08, glass, xw, (sill + head) / 2, (winZ0 + winZ1) / 2);
  noShadow(winGlass);
  winGlass.renderOrder = 3;

  const mullions = 6;
  for (let i = 0; i <= mullions; i++) {
    const z = winZ0 + ((winZ1 - winZ0) * i) / mullions;
    addBox(g, 0.07, head - sill, 0.06, wood, xw + 0.02, (sill + head) / 2, z);
  }
  addBox(g, 0.08, 0.06, winZ1 - winZ0, wood, xw + 0.02, sill + (head - sill) * 0.62, (winZ0 + winZ1) / 2);
  addBox(g, 0.28, 0.08, winZ1 - winZ0 + 0.1, woodL, xw + 0.18, sill + 0.02, (winZ0 + winZ1) / 2);
  addBox(g, 0.08, 0.1, winZ1 - winZ0 + 0.16, wood, xw + 0.04, head, (winZ0 + winZ1) / 2);

  addBox(g, W - 0.2, 0.8, 0.04, bead, 0.05, 0.5, -D / 2 + 0.1);
  addBox(g, 0.04, 0.7, (winZ0 + D / 2) - 0.2, bead, xw + 0.12, 0.42, (-D / 2 + winZ0) / 2);
  const splash = new THREE.Mesh(new THREE.PlaneGeometry(W - 0.4, 1.15), subway);
  splash.position.set(0.1, 1.55, -D / 2 + 0.09);
  g.add(splash);
  addBox(g, W - 0.15, 0.08, 0.06, wood, 0, 0.94, -D / 2 + 0.12);
  addBox(g, W - 0.2, 0.06, 0.08, woodL, 0, 2.82, -D / 2 + 0.1);
  addBox(g, 0.08, 0.06, D * 0.72, woodL, xw + 0.1, 2.82, -0.4);
  addBox(g, W - 0.3, 0.1, 0.1, wood, 0, 0.06, -D / 2 + 0.12);

  const ceil = new THREE.Mesh(new THREE.BoxGeometry(W - 0.3, 0.1, D * 0.48), ceilMat);
  ceil.position.set(0.05, H - 0.05, -D * 0.24);
  g.add(ceil);
  const soffit = new THREE.Mesh(new THREE.BoxGeometry(3.85, 0.1, 3.7), ceilMat);
  soffit.position.set(-3.25, H - 0.05, 1.35);
  g.add(soffit);
  addBox(g, 0.16, 0.22, D * 0.46, wood, -1.6, H - 0.28, -1.7);
  addBox(g, 0.16, 0.22, D * 0.46, wood, 2.4, H - 0.28, -1.7);
  addBox(g, 3.2, 0.18, 0.14, wood, -0.85, H - 0.32, 0.88);
  addBox(g, 4.4, 0.16, 0.14, wood, 0.4, H - 0.28, -2.55);

  const street = toon('#f0d8b4');
  addBox(g, 0.08, 2.2, 3.5, street, xw - 0.45, 1.7, 1.3);
  addBox(g, 0.7, 0.06, 3.7, toon('#d7c4a4'), xw - 0.55, 0.04, 1.35);

  return g;
}

function boule(g, x, y, z, s, color, score) {
  const r = 0.13 * s;
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(r, 16, 12), toon(color));
  mesh.scale.y = 0.68;
  mesh.position.set(x, y + r * 0.68, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  g.add(mesh);
  const top = y + r * 1.32;
  const crust = toon('#5a3018');
  if (score === 'cross') {
    addBox(g, r * 1.15, 0.01, 0.012, crust, x, top, z);
    addBox(g, 0.012, 0.01, r * 1.15, crust, x, top + 0.002, z);
  } else if (score === 'slash') {
    const mark = addBox(g, r * 1.2, 0.01, 0.014, crust, x, top, z);
    mark.rotation.y = 0.6;
  }
}

function batard(g, x, y, z, rotY, s, color) {
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(0.09 * s, 14, 10), toon(color));
  mesh.scale.set(1.45, 0.62, 0.78);
  const grp = new THREE.Group();
  grp.position.set(x, y + 0.05 * s, z);
  grp.rotation.y = rotY;
  mesh.castShadow = true;
  grp.add(mesh);
  g.add(grp);
}

function baguette(g, x, y, z, rotY, len = 0.46) {
  const geo = new THREE.CapsuleGeometry(0.026, len, 3, 8);
  const mesh = new THREE.Mesh(geo, toon('#e0b15e'));
  mesh.rotation.z = Math.PI / 2;
  const grp = new THREE.Group();
  grp.position.set(x, y + 0.03, z);
  grp.rotation.y = rotY;
  mesh.castShadow = true;
  grp.add(mesh);
  const slash = toon('#8a5a30');
  for (let i = -1; i <= 1; i++) {
    const m = addBox(grp, 0.012, 0.008, 0.05, slash, i * 0.1, 0.03, 0);
    m.rotation.y = 0.5;
  }
  g.add(grp);
}

function tinLoaf(g, x, y, z, rotY) {
  const grp = new THREE.Group();
  grp.position.set(x, y, z);
  grp.rotation.y = rotY;
  addBox(grp, 0.12, 0.08, 0.24, toon('#c48448'), 0, 0.04, 0);
  const top = new THREE.Mesh(new THREE.SphereGeometry(0.07, 12, 8), toon('#d7a15c'));
  top.scale.set(0.85, 0.45, 1.6);
  top.position.y = 0.09;
  top.castShadow = true;
  grp.add(top);
  g.add(grp);
}

function rolls(g, x, y, z) {
  const cols = ['#e6c27a', '#d7a15a', '#c98448'];
  const spots = [[0, 0], [0.07, 0.04], [-0.06, 0.05], [0.02, -0.06], [-0.04, -0.03]];
  spots.forEach((p, i) => {
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(0.035, 10, 8), toon(cols[i % 3]));
    mesh.scale.y = 0.75;
    mesh.position.set(x + p[0], y + 0.028, z + p[1]);
    mesh.castShadow = true;
    g.add(mesh);
  });
}

function focaccia(g, x, y, z) {
  addBox(g, 0.28, 0.035, 0.2, toon('#e2c48a'), x, y + 0.02, z);
  const oil = toon('#6a8a48');
  [[-0.08, -0.05], [0.02, 0.04], [0.08, -0.04], [-0.02, 0.06]].forEach((p) => {
    addCyl(g, 0.012, 0.012, 0.012, oil, x + p[0], y + 0.04, z + p[1], 8);
  });
}

function crate(g, x, y, z, w, h, d) {
  const wood = toon('#8a5a32');
  addBox(g, w, 0.02, d, wood, x, y, z);
  addBox(g, 0.02, h, d, wood, x - w / 2, y + h / 2, z);
  addBox(g, 0.02, h, d, wood, x + w / 2, y + h / 2, z);
  addBox(g, w, h, 0.02, wood, x, y + h / 2, z - d / 2);
  addBox(g, w, h * 0.35, 0.02, wood, x, y + h * 0.2, z + d / 2);
}

function breadWall(g, layout) {
  const rack = layout.meta.anchors.breadRack;
  const x0 = rack.x;
  const z = rack.z;
  const wood = toon('#6b4228');
  const shelf = toon('#c4a06a');
  const ys = [0.22, 0.7, 1.16, 1.6];
  for (const x of [0, 1, 2, 3]) {
    addBox(g, 0.055, 2.02, 0.42, wood, x0 + x, 1.01, z);
  }
  ys.forEach((y) => addBox(g, 3.05, 0.035, 0.4, shelf, x0 + 1.5, y, z));
  addBox(g, 3.02, 1.9, 0.03, toon('#d7b88a'), x0 + 1.5, 1.0, z - 0.2);
  addBox(g, 3.08, 0.06, 0.46, wood, x0 + 1.5, 1.98, z);

  const bays = [x0 + 0.5, x0 + 1.5, x0 + 2.5];
  const zf = z + 0.02;
  bays.forEach((bx, i) => {
    const a = i % 2 ? 'boule' : 'baguette';
    const b = i % 2 ? 'baguette' : 'boule';
    loafBasket(g, bx - 0.22, ys[0] + 0.02, zf, a);
    loafBasket(g, bx + 0.22, ys[0] + 0.02, zf, b);
    loafBasket(g, bx - 0.22, ys[1] + 0.02, zf, b);
    loafBasket(g, bx + 0.22, ys[1] + 0.02, zf, a);
  });

  boule(g, bays[0] - 0.26, ys[2] + 0.02, zf, 0.9, '#f0d2a4', 'cross');
  boule(g, bays[0], ys[2] + 0.02, zf + 0.03, 0.78, '#c98448', 'slash');
  boule(g, bays[0] + 0.26, ys[2] + 0.02, zf, 0.85, '#a86838', 'cross');
  baguette(g, bays[1] - 0.16, ys[2] + 0.05, zf, 0.85, 0.36);
  baguette(g, bays[1] + 0.02, ys[2] + 0.08, zf + 0.03, 1.05, 0.34);
  baguette(g, bays[1] + 0.18, ys[2] + 0.05, zf - 0.02, 0.65, 0.32);
  batard(g, bays[2] - 0.18, ys[2] + 0.02, zf, 0.25, 0.95, '#e0b068');
  batard(g, bays[2] + 0.06, ys[2] + 0.02, zf + 0.03, -0.3, 0.85, '#c4844a');
  tinLoaf(g, bays[2] + 0.26, ys[2] + 0.02, zf, 0.15);

  boule(g, bays[0] - 0.16, ys[3] + 0.02, zf, 0.9, '#f3e0b8', 'slash');
  boule(g, bays[0] + 0.12, ys[3] + 0.02, zf + 0.02, 0.75, '#d7a15c', 'cross');
  focaccia(g, bays[1] - 0.12, ys[3] + 0.02, zf);
  rolls(g, bays[1] + 0.18, ys[3] + 0.02, zf);
  tinLoaf(g, bays[2] - 0.14, ys[3] + 0.02, zf, 0.2);
  tinLoaf(g, bays[2] + 0.08, ys[3] + 0.02, zf - 0.02, -0.15);
  rolls(g, bays[2] + 0.26, ys[3] + 0.02, zf);

  const tags = [
    [bays[0], 'BAGUETTE'],
    [bays[1], 'COUNTRY'],
    [bays[2], 'TIN'],
  ];
  tags.forEach(([x, text]) => {
    painted(g, labelTex(text), 0.32, 0.08, x, ys[0] + 0.16, z + 0.22);
  });

  crate(g, -3.55, 0.02, -2.82, 0.62, 0.22, 0.36);
  baguette(g, -3.7, 0.12, -2.8, 0.25, 0.48);
  baguette(g, -3.48, 0.14, -2.78, -0.15, 0.44);
  baguette(g, -3.58, 0.18, -2.86, 0.05, 0.4);
  loafBasket(g, -2.55, 0.02, -2.78, 'boule');
}

function loafBasket(g, x, y, z, kind) {
  addCyl(g, 0.18, 0.14, 0.14, toon('#8a5a32'), x, y + 0.07, z, 14);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.175, 0.016, 6, 16), toon('#3a2418'));
  rim.rotation.x = Math.PI / 2;
  rim.position.set(x, y + 0.145, z);
  rim.castShadow = true;
  g.add(rim);
  if (kind === 'baguette') {
    baguette(g, x - 0.02, y + 0.12, z, 0.35, 0.36);
    baguette(g, x + 0.04, y + 0.16, z + 0.02, -0.2, 0.34);
    baguette(g, x, y + 0.2, z, 0.08, 0.32);
  } else {
    boule(g, x - 0.05, y + 0.12, z - 0.01, 0.82, '#e0b068', 'slash');
    boule(g, x + 0.06, y + 0.12, z + 0.02, 0.72, '#c98448', 'cross');
    boule(g, x, y + 0.2, z, 0.62, '#f3e0b8', false);
  }
}

function croissant(g, x, y, z, rot) {
  const mesh = new THREE.Mesh(
    new THREE.TorusGeometry(0.07, 0.024, 6, 14, Math.PI * 1.35),
    toon('#e2b15a')
  );
  mesh.rotation.set(Math.PI / 2, rot, 0.15);
  mesh.position.set(x, y + 0.02, z);
  mesh.castShadow = true;
  g.add(mesh);
}

function tart(g, x, y, z, fruit) {
  addCyl(g, 0.075, 0.068, 0.04, toon('#f0d2a0'), x, y + 0.02, z, 14);
  const colors = { berry: '#a84858', citrus: '#e2a030', pistachio: '#7a9a58' };
  const c = toon(colors[fruit] || colors.berry);
  [[0, 0], [0.028, 0.02], [-0.026, 0.012], [0.01, -0.028], [-0.01, -0.018]].forEach((p) => {
    const s = new THREE.Mesh(new THREE.SphereGeometry(0.016, 8, 6), c);
    s.position.set(x + p[0], y + 0.048, z + p[1]);
    g.add(s);
  });
}

function eclair(g, x, y, z, rotY) {
  const grp = new THREE.Group();
  grp.position.set(x, y + 0.03, z);
  grp.rotation.y = rotY;
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.026, 0.12, 3, 8), toon('#f2d7b0'));
  body.rotation.z = Math.PI / 2;
  body.castShadow = true;
  grp.add(body);
  addBox(grp, 0.12, 0.016, 0.044, toon('#4a2c22'), 0, 0.028, 0);
  g.add(grp);
}

function cinnamon(g, x, y, z) {
  const mesh = new THREE.Mesh(new THREE.TorusGeometry(0.055, 0.022, 6, 12), toon('#c98448'));
  mesh.rotation.x = Math.PI / 2;
  mesh.position.set(x, y + 0.024, z);
  mesh.castShadow = true;
  g.add(mesh);
  addCyl(g, 0.016, 0.016, 0.012, toon('#f4efe4'), x, y + 0.04, z, 8);
}

function macaron(g, x, y, z, color) {
  addCyl(g, 0.032, 0.032, 0.016, toon(color), x, y + 0.012, z, 10);
  addCyl(g, 0.028, 0.028, 0.008, toon('#f4efe4'), x, y + 0.022, z, 8);
  addCyl(g, 0.032, 0.032, 0.016, toon(color), x, y + 0.034, z, 10);
}

function cakeSlice(g, x, y, z, rotY) {
  const mesh = new THREE.Mesh(
    new THREE.CylinderGeometry(0.07, 0.07, 0.05, 12, 1, false, 0, Math.PI * 0.45),
    toon('#f0d8c4')
  );
  mesh.position.set(x, y + 0.025, z);
  mesh.rotation.y = rotY;
  mesh.castShadow = true;
  g.add(mesh);
  const top = new THREE.Mesh(
    new THREE.CylinderGeometry(0.07, 0.07, 0.008, 12, 1, false, 0, Math.PI * 0.45),
    toon('#7a9a58')
  );
  top.position.set(x, y + 0.05, z);
  top.rotation.y = rotY;
  g.add(top);
}

function pastryCase(g, layout) {
  const c = layout.meta.anchors.case;
  const y = layout.meta.anchors.counter.top;
  const wood = toon('#6b4228');
  const pale = toon('#e7d3b4');
  const metal = toon('#3e3a36');
  const glass = flatGlass(0.2);
  const { x, z, w, d, h } = c;
  addBox(g, w, 0.05, d, wood, x, y + 0.025, z);
  const posts = [[-w / 2, -d / 2], [w / 2, -d / 2], [-w / 2, d / 2], [w / 2, d / 2]];
  posts.forEach(([dx, dz]) => addBox(g, 0.022, h, 0.022, metal, x + dx, y + 0.05 + h / 2, z + dz));
  const panels = [
    [w - 0.04, h - 0.06, 0.012, 0, d / 2],
    [w - 0.04, h - 0.06, 0.012, 0, -d / 2],
  ];
  panels.forEach(([pw, ph, pd, dx, dz]) => {
    const mesh = addBox(g, pw, ph, pd, glass, x + dx, y + 0.08 + ph / 2, z + dz);
    noShadow(mesh);
    mesh.renderOrder = 4;
  });
  [-w / 2, w / 2].forEach((dx) => {
    const mesh = addBox(g, 0.012, h - 0.06, d - 0.04, glass, x + dx, y + 0.08 + (h - 0.06) / 2, z);
    noShadow(mesh);
    mesh.renderOrder = 4;
  });
  const lid = addBox(g, w, 0.015, d, glass, x, y + 0.05 + h, z);
  noShadow(lid);
  lid.renderOrder = 4;
  const mid = y + h * 0.5;
  addBox(g, w - 0.1, 0.015, d - 0.1, pale, x, mid, z);
  const strip = addBox(
    g, w - 0.16, 0.02, 0.04,
    toon('#fff1c9', { emissive: '#ffc56a', emissiveIntensity: 0.85 }),
    x, y + h + 0.02, z
  );
  noShadow(strip);
  point(g, 0xffd8a0, 0.4, 2.2, x, y + h * 0.7, z);

  const y0 = y + 0.1;
  const y1 = mid + 0.04;
  const fruits = ['berry', 'citrus', 'pistachio'];
  const macs = ['#d4687a', '#e6c56a', '#8aaa78', '#f2d2c4'];
  const cols = 9;
  const span = w * 0.38;
  const step = (2 * span) / (cols - 1);
  for (let i = 0; i < cols; i++) {
    const px = x - span + step * i;
    const back = px + (i === cols - 1 ? -step * 0.45 : step * 0.45);
    croissant(g, px, y0, z + 0.09, 0.25 + i * 0.17);
    if (i === 0 || i === cols - 1) {
      boule(g, back, y0, z - 0.07, 0.55, i === 0 ? '#e2b56a' : '#c98448', 'slash');
    } else {
      tart(g, back, y0, z - 0.07, fruits[i % 3]);
    }
    if (i % 2 === 0) cinnamon(g, px, y1, z + 0.08);
    else eclair(g, px, y1, z + 0.08, 0.12);
    if (i % 3 === 0) cakeSlice(g, back, y1, z - 0.07, i * 0.2);
    else macaron(g, back, y1, z - 0.07, macs[i % macs.length]);
  }
}

function oven(g, layout) {
  const { x, z } = layout.meta.anchors.oven;
  const stone = toon('#e4d4bc');
  const soot = toon('#2c2826');
  const steel = toon('#4e5154');
  const glow = toon('#ff8a3a', { emissive: '#ff6a1a', emissiveIntensity: 2 });
  addBox(g, 1.12, 0.08, 0.74, stone, x, 0.04, z);
  addBox(g, 1.02, 1.22, 0.66, stone, x, 0.69, z);
  addBox(g, 0.78, 0.4, 0.04, soot, x, 0.48, z + 0.34);
  addBox(g, 0.78, 0.4, 0.04, soot, x, 1.0, z + 0.34);
  const g1 = addBox(g, 0.6, 0.1, 0.02, glow, x, 0.42, z + 0.37);
  const g2 = addBox(g, 0.6, 0.1, 0.02, glow, x, 0.94, z + 0.37);
  noShadow(g1);
  noShadow(g2);
  addBox(g, 0.36, 0.03, 0.04, steel, x, 0.64, z + 0.38);
  addBox(g, 0.36, 0.03, 0.04, steel, x, 1.16, z + 0.38);
  addBox(g, 1.16, 0.07, 0.78, stone, x, 1.34, z);
  addBox(g, 1.08, 0.1, 0.7, steel, x, 1.5, z - 0.02);
  addBox(g, 0.22, 0.7, 0.22, steel, x + 0.28, 1.9, z - 0.12);
  point(g, 0xff7a32, 1.15, 3.4, x, 0.85, z + 0.2);
}

function prepProps(g, layout) {
  const p = layout.meta.anchors.prep;
  const y = p.top;
  const wood = toon('#a87848');
  const sack = toon('#e7dcc4');
  addBox(g, 0.28, 0.22, 0.18, sack, p.x - 0.42, y + 0.11, p.z + 0.12);
  addBox(g, 0.22, 0.08, 0.16, sack, p.x - 0.42, y + 0.26, p.z + 0.12);
  painted(g, labelTex('FLOUR'), 0.16, 0.06, p.x - 0.42, y + 0.12, p.z + 0.22);
  const dough = new THREE.Mesh(new THREE.SphereGeometry(0.08, 14, 10), toon('#f3ead4'));
  dough.scale.y = 0.55;
  dough.position.set(p.x - 0.05, y + 0.04, p.z - 0.05);
  dough.castShadow = true;
  g.add(dough);
  const pin = new THREE.Mesh(new THREE.CapsuleGeometry(0.018, 0.28, 3, 8), wood);
  pin.rotation.z = Math.PI / 2;
  pin.rotation.y = 0.4;
  pin.position.set(p.x + 0.18, y + 0.02, p.z + 0.08);
  pin.castShadow = true;
  g.add(pin);
  addBox(g, 0.08, 0.012, 0.12, toon('#c0c4c8'), p.x + 0.22, y + 0.01, p.z + 0.22);
  doughTub(g, p.x + 0.53, y, p.z - 0.16);
  kitchenScale(g, p.x + 0.47, y, p.z + 0.27);
  addBox(g, 0.2, 0.14, 0.13, sack, p.x + 0.08, y + 0.07, p.z - 0.28);
  addBox(g, 0.14, 0.05, 0.1, sack, p.x + 0.08, y + 0.16, p.z - 0.28);
  painted(g, labelTex('FLOUR'), 0.12, 0.05, p.x + 0.08, y + 0.08, p.z - 0.2);
  banneton(g, p.x - 0.2, y, p.z + 0.28);
  banneton(g, p.x - 0.58, y, p.z - 0.22);

  const shelfZ = -3.86;
  addBox(g, 1.15, 0.04, 0.28, wood, 3.45, 1.45, shelfZ);
  addBox(g, 1.15, 0.04, 0.28, wood, 3.45, 1.9, shelfZ);
  addBox(g, 0.04, 0.7, 0.04, toon('#6b4228'), 2.92, 1.65, shelfZ);
  addBox(g, 0.04, 0.7, 0.04, toon('#6b4228'), 3.98, 1.65, shelfZ);
  const jars = ['#f4efe4', '#e6d2a0', '#5a3828', '#c45a48', '#d8d2c4'];
  jars.forEach((col, i) => {
    const x = 3.05 + i * 0.2;
    addCyl(g, 0.045, 0.05, 0.12, toon(col), x, 1.53, shelfZ, 10);
    addCyl(g, 0.03, 0.034, 0.03, toon('#d7d2c8'), x, 1.6, shelfZ, 8);
  });
  ['#c45a48', '#e6c56a', '#6a8a48'].forEach((col, i) => {
    addCyl(g, 0.04, 0.045, 0.1, toon(col), 3.15 + i * 0.22, 1.98, shelfZ, 10);
  });

  for (let i = 0; i < 3; i++) {
    const x = 3.55 + i * 0.16;
    addCyl(g, 0.006, 0.006, 0.16, toon('#c0c4c8'), x, 1.22, shelfZ + 0.08, 6);
    const bowl = new THREE.Mesh(new THREE.SphereGeometry(0.045, 10, 8), toon('#d8c4a4'));
    bowl.scale.y = 0.45;
    bowl.position.set(x, 1.12, shelfZ + 0.12);
    g.add(bowl);
  }

  const peel = new THREE.Group();
  peel.position.set(3.55, 0.05, -3.55);
  peel.rotation.z = -0.35;
  peel.rotation.y = 0.5;
  addBox(peel, 0.035, 0.9, 0.035, wood, 0, 0.45, 0);
  addBox(peel, 0.26, 0.02, 0.38, wood, 0, 0.92, 0.08);
  g.add(peel);

  addCyl(g, 0.1, 0.12, 0.08, toon('#c4a574'), 3.55, 0.04, -2.95, 12);
  const proof = new THREE.Mesh(new THREE.SphereGeometry(0.06, 12, 8), toon('#f0e2c8'));
  proof.scale.y = 0.6;
  proof.position.set(3.55, 0.09, -2.95);
  g.add(proof);
  addCyl(g, 0.09, 0.11, 0.08, toon('#b89060'), 3.78, 0.04, -3.05, 12);

  point(g, 0xffd2a0, 0.22, 2.2, p.x, 1.55, p.z);
}

function doughTub(g, x, y, z) {
  addCyl(g, 0.13, 0.11, 0.14, toon('#d7d4cc'), x, y + 0.07, z, 16);
  addCyl(g, 0.135, 0.135, 0.016, toon('#8a9094'), x, y + 0.145, z, 16);
  const dough = new THREE.Mesh(new THREE.SphereGeometry(0.09, 14, 10), toon('#f3ead4'));
  dough.scale.y = 0.42;
  dough.position.set(x, y + 0.12, z);
  dough.castShadow = true;
  g.add(dough);
}

function kitchenScale(g, x, y, z) {
  addBox(g, 0.16, 0.028, 0.18, toon('#3e3a36'), x, y + 0.014, z);
  addBox(g, 0.13, 0.012, 0.13, toon('#e4e2dc'), x, y + 0.034, z);
  addBox(g, 0.045, 0.018, 0.03, toon('#2a2420'), x, y + 0.048, z - 0.055);
}

function banneton(g, x, y, z) {
  addCyl(g, 0.085, 0.065, 0.07, toon('#c4a06a'), x, y + 0.035, z, 12);
  addCyl(g, 0.09, 0.09, 0.012, toon('#6b4228'), x, y + 0.072, z, 12);
  const dough = new THREE.Mesh(new THREE.SphereGeometry(0.055, 12, 8), toon('#f0e2c8'));
  dough.scale.y = 0.55;
  dough.position.set(x, y + 0.07, z);
  dough.castShadow = true;
  g.add(dough);
}

function breadTableGoods(g, layout) {
  const t = layout.meta.anchors.breadTable;
  const y = t.top;
  boule(g, t.x - 0.28, y, t.z - 0.08, 0.85, '#c98448', 'cross');
  boule(g, t.x - 0.05, y, t.z + 0.12, 0.7, '#e2b56a', 'slash');
  tinLoaf(g, t.x + 0.28, y, t.z, 0.4);
  crate(g, t.x + 0.05, y, t.z - 0.18, 0.36, 0.08, 0.22);
  rolls(g, t.x + 0.05, y + 0.08, t.z - 0.18);
}

function cafeDressing(g, layout) {
  const benchZ0 = -0.4;
  const benchZ1 = 3.2;
  const wood = toon('#6b4228');
  const woodL = toon('#c4a06a');
  addBox(g, 0.42, 0.08, benchZ1 - benchZ0, woodL, -4.95, 0.42, (benchZ0 + benchZ1) / 2);
  addBox(g, 0.08, 0.42, benchZ1 - benchZ0, wood, -5.12, 0.21, (benchZ0 + benchZ1) / 2);
  addBox(g, 0.06, 0.48, benchZ1 - benchZ0, wood, -5.14, 0.78, (benchZ0 + benchZ1) / 2);
  const cushions = [
    [-0.15, 0.85, '#b85a3a'],
    [0.85, 0.7, '#f0e2c8'],
    [1.7, 0.78, '#8c3d32'],
    [2.75, 0.7, '#f0e2c8'],
  ];
  cushions.forEach(([z, len, col]) => {
    addBox(g, 0.36, 0.06, len, toon(col), -4.92, 0.49, z);
  });

  const couple = layout.meta.anchors.couple;
  addBox(g, 1.35, 0.015, 1.7, toon('#3f5c4a'), couple[0], 0.02, couple[1]);
  addBox(g, 0.22, 0.008, 0.16, toon('#f4efe4'), couple[0] + 0.12, 0.735, couple[1] - 0.08);

  const plates = [
    [-4.14, 1.78],
    [-4.02, 0.08],
    [-4.1, 2.88],
    [couple[0], couple[1]],
  ];
  plates.forEach(([x, z]) => addCyl(g, 0.11, 0.11, 0.012, toon('#f7f1e6'), x, 0.736, z, 16));

  const runner = toon('#7a2e2a');
  addBox(g, 2.6, 0.012, 0.7, runner, 1.15, 0.016, -0.55);
  addBox(g, 2.35, 0.008, 0.08, toon('#e6d2b0'), 1.15, 0.022, -0.28);
  addBox(g, 0.9, 0.012, 1.15, toon('#6b4228'), 0.9, 0.016, 3.4);
  queueLane(g);

  const a = new THREE.Group();
  a.position.set(0.55, 0, 3.15);
  const face = toon('#f6efe2', { map: cardTex('TODAY', 'olive loaf') });
  const front = new THREE.Mesh(new THREE.PlaneGeometry(0.48, 0.62), face);
  front.position.set(0, 0.42, 0.08);
  front.rotation.x = -0.22;
  const back = new THREE.Mesh(new THREE.PlaneGeometry(0.48, 0.62), toon('#2a322c'));
  back.position.set(0, 0.42, -0.08);
  back.rotation.x = 0.22;
  a.add(front, back);
  g.add(a);
  painted(g, cardTex('OPEN', '7 to 3'), 0.28, 0.18, -5.16, 1.55, 2.55, -Math.PI / 2);

  const clock = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.04, 20), toon('#f4efe4'));
  clock.rotation.x = Math.PI / 2;
  clock.position.set(-1.15, 2.55, -3.9);
  g.add(clock);
  addBox(g, 0.012, 0.1, 0.012, toon('#2a2420'), -1.15, 2.58, -3.87);
  addBox(g, 0.07, 0.012, 0.012, toon('#2a2420'), -1.12, 2.54, -3.87);

  foliage(g, -4.85, 0.34, 3.62, 1.05);
  foliage(g, -5.02, 0.98, 1.02, 0.45);
  foliage(g, 4.82, 0.34, -0.42, 0.9);
}

function queueLane(g) {
  const mat = toon('#6e3a32');
  addBox(g, 0.9, 0.012, 2.65, mat, 1.55, 0.02, 1.42);
  addBox(g, 0.9, 0.006, 0.05, toon('#e6d2b0'), 1.55, 0.028, 0.14);
  addBox(g, 0.9, 0.006, 0.05, toon('#e6d2b0'), 1.55, 0.028, 2.7);
  const brass = toon('#c4a06a');
  const rope = toon('#8c3d32');
  const zs = [0.2, 1.1, 2.0, 2.68];
  function post(x, z) {
    addCyl(g, 0.05, 0.05, 0.02, brass, x, 0.01, z, 10);
    addCyl(g, 0.015, 0.015, 0.84, toon('#2a2420'), x, 0.44, z, 8);
    addCyl(g, 0.026, 0.026, 0.035, brass, x, 0.86, z, 8);
  }
  function ropeSeg(x, z1, z2) {
    const len = z2 - z1;
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.011, len, 6), rope);
    mesh.rotation.x = Math.PI / 2;
    mesh.position.set(x, 0.7, (z1 + z2) / 2);
    mesh.castShadow = true;
    g.add(mesh);
  }
  [0.98, 2.12].forEach((x) => {
    zs.forEach((z) => post(x, z));
    for (let i = 0; i < zs.length - 1; i++) ropeSeg(x, zs[i], zs[i + 1]);
  });
}

function foliage(g, x, y, z, s) {
  addCyl(g, 0.012 * s, 0.016 * s, 0.16 * s, toon('#4a5a32'), x, y + 0.08 * s, z, 6);
  const leaf = toon('#3d6a42');
  const a = new THREE.Mesh(new THREE.SphereGeometry(0.16 * s, 10, 8), leaf);
  a.position.set(x, y + 0.22 * s, z);
  a.scale.y = 0.8;
  const b = new THREE.Mesh(new THREE.SphereGeometry(0.11 * s, 10, 8), toon('#2f5534'));
  b.position.set(x + 0.08 * s, y + 0.3 * s, z - 0.04 * s);
  g.add(a, b);
}

function serviceBoards(g, layout) {
  const C = layout.meta.anchors.counter;
  painted(g, signTex('HEARTH', 'NEIGHBORHOOD BAKERY', '#6b3a24', '#f6e7c8'), 2.15, 0.5, -3.4, 2.42, -3.9);
  addBox(g, 2.28, 0.06, 0.04, toon('#5a341c'), -3.4, 2.68, -3.9);
  addBox(g, 2.28, 0.05, 0.04, toon('#5a341c'), -3.4, 2.16, -3.9);
  const menu = painted(g, menuTex(), 0.95, 1.15, -0.2, 2.05, -3.9);
  menu.position.z = -3.895;
  addBox(g, 1.02, 0.04, 0.05, toon('#6b4228'), -0.2, 2.64, -3.89);
  addBox(g, 1.02, 0.04, 0.05, toon('#6b4228'), -0.2, 1.46, -3.89);
  painted(g, cardTex('OLIVE', 'loaf  8'), 0.32, 0.22, 1.7, 0.72, C.frontZ + 0.04);

  const bags = toon('#f3ead4');
  addBox(g, 0.12, 0.16, 0.08, bags, 2.7, C.top + 0.08, -1.68);
  addBox(g, 0.1, 0.05, 0.07, bags, 2.7, C.top + 0.18, -1.68);
  addBox(g, 0.11, 0.14, 0.07, toon('#efe2cc'), 2.56, C.top + 0.07, -1.7);
}

function dressLamps(g, layout) {
  const lampH = layout.assets.pendant_lamp.targetHeight;
  for (const inst of layout.instances) {
    if (inst.kind !== 'pendant_lamp') continue;
    const [x, y, z] = inst.position;
    const top = y + lampH;
    const ceiling = z > 0.15 && x > -1.4 ? 2.78 : 3.08;
    const span = Math.max(0.04, ceiling - top);
    addCyl(g, 0.007, 0.007, span, toon('#2a2420'), x, top + span / 2, z, 6);
    addCyl(g, 0.05, 0.05, 0.02, toon('#6b4228'), x, ceiling, z, 10);
    bulb(g, x, y + 0.07, z, 0.038);
    point(g, 0xffc56a, y > 2.4 ? 0.7 : 0.5, 5.5, x, y + 0.1, z);
  }
  for (const inst of layout.instances) {
    if (inst.kind !== 'cup_mug') continue;
    const [x, y, z] = inst.position;
    addCyl(g, 0.05, 0.052, 0.008, toon('#f7f1e6'), x, y + 0.004, z, 12);
  }
  const footprints = {
    bar_counter: [1.94, 0.95],
    round_table: [0.5, 0.5],
    square_table: [0.42, 0.42],
    dining_chair: [0.22, 0.24],
    flowerpot: [0.18, 0.18],
  };
  for (const inst of layout.instances) {
    const base = footprints[inst.kind];
    if (!base) continue;
    let rx = base[0];
    let rz = base[1];
    if (Array.isArray(inst.scale)) {
      rx *= inst.scale[0];
      rz *= inst.scale[2] ?? inst.scale[0];
    } else if (typeof inst.scale === 'number') {
      rx *= inst.scale;
      rz *= inst.scale;
    }
    addContact(g, inst.position[0], inst.position[2], rx, rz);
  }
  const oven = layout.meta.anchors.oven;
  addContact(g, oven.x, oven.z, 0.7, 0.45);
  const rack = layout.meta.anchors.breadRack;
  addContact(g, rack.x + rack.w / 2, rack.z, rack.w / 2, 0.28);
}

function makeProcedural(layout) {
  const g = new THREE.Group();
  g.name = 'procedural';
  breadWall(g, layout);
  pastryCase(g, layout);
  oven(g, layout);
  prepProps(g, layout);
  breadTableGoods(g, layout);
  cafeDressing(g, layout);
  serviceBoards(g, layout);
  dressLamps(g, layout);
  return g;
}

function paintMeshes(root, fn) {
  root.traverse((obj) => {
    if (!obj.isMesh || !obj.material) return;
    const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
    mats.forEach((m) => { if (m) fn(m, obj); });
  });
}

function decoratePrototype(kind, root) {
  if (kind === 'bar_counter') {
    paintMeshes(root, (m, obj) => {
      const n = (obj.name || '').toLowerCase();
      if (n.includes('top')) m.color?.set('#e7d7c0');
      else m.color?.set('#7a4e30');
    });
  }
  if (kind === 'pendant_lamp') {
    paintMeshes(root, (m, obj) => {
      const n = (obj.name || '').toLowerCase();
      if (n.includes('bulb')) {
        m.color?.set('#fff3cc');
        if (m.emissive) m.emissive.set('#ffb04a');
        m.emissiveIntensity = 1.8;
      }
    });
  }
}

boot({
  makeShell,
  makeProcedural,
  decoratePrototype,
  readyText: 'ready — Hearth bakery · drag orbit · U unlit · T toon',
}).catch((err) => {
  console.error(err);
});
