import * as THREE from 'three';
import { boot, toon, addBox, addCyl } from './scene_lib.js';

const DYE = {
  indigo: '#243e78',
  woad: '#3d5c8a',
  navy: '#1e345f',
  saffron: '#e2a23a',
  gold: '#f0d48a',
  madder: '#a33d3d',
  rust: '#b65c38',
  olive: '#5d6b3c',
  moss: '#3e4a28',
  linen: '#f3ecdf',
  cream: '#f7f1e6',
  charcoal: '#3a3834',
  blush: '#d09090',
  teal: '#2f6b66',
  plum: '#6d3854',
};

const WOOD = {
  timber: '#6e4a30',
  oak: '#8a5a36',
  maple: '#e0c08a',
  top: '#c9a36c',
  peg: '#e6d3a8',
  dark: '#3a2a22',
};

function cylAxis(g, rTop, rBot, len, mat, x, y, z, axis, seg = 14) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBot, len, seg), mat);
  if (axis === 'x') m.rotation.z = Math.PI / 2;
  if (axis === 'z') m.rotation.x = Math.PI / 2;
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  g.add(m);
  return m;
}

function strand(g, ax, ay, az, bx, by, bz, mat, t = 0.006) {
  const dir = new THREE.Vector3(bx - ax, by - ay, bz - az);
  const len = dir.length();
  if (len < 1e-4) return null;
  const m = new THREE.Mesh(new THREE.BoxGeometry(t, t, len), mat);
  m.position.set((ax + bx) / 2, (ay + by) / 2, (az + bz) / 2);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), dir.multiplyScalar(1 / len));
  m.userData.noShadow = true;
  g.add(m);
  return m;
}

function canvasTex(draw, w = 128, h = 128) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = THREE.RepeatWrapping;
  t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 8;
  return t;
}

function fabricTexture(type, colors) {
  const [a, b, d] = colors;
  return canvasTex((ctx, w, h) => {
    ctx.fillStyle = a;
    ctx.fillRect(0, 0, w, h);
    if (type === 'stripe') {
      const bands = [10, 18, 6, 22, 8, 14];
      const cols = [a, b, a, d || b, a, b];
      let y = 0;
      let i = 0;
      while (y < h) {
        const bh = bands[i % bands.length];
        ctx.fillStyle = cols[i % cols.length];
        ctx.fillRect(0, y, w, bh);
        y += bh;
        i += 1;
      }
    } else if (type === 'plaid') {
      ctx.fillStyle = b;
      for (let y = 0; y < h; y += 16) ctx.fillRect(0, y, w, 4);
      ctx.fillStyle = d || a;
      for (let x = 0; x < w; x += 22) ctx.fillRect(x, 0, 3, h);
      ctx.fillStyle = a;
      for (let y = 8; y < h; y += 16) ctx.fillRect(0, y, w, 2);
    } else if (type === 'ikat') {
      for (let y = 0; y < h; y += 16) {
        for (let x = 0; x < w; x += 16) {
          const n = (x / 16 + y / 16) % 3;
          ctx.fillStyle = n === 0 ? a : n === 1 ? b : (d || a);
          ctx.fillRect(x + (y / 16) % 2 * 4, y, 12, 14);
        }
      }
    } else {
      ctx.fillStyle = 'rgba(0,0,0,0.08)';
      for (let y = 0; y < h; y += 4) ctx.fillRect(0, y, w, 1);
      ctx.fillStyle = 'rgba(255,255,255,0.06)';
      for (let x = 0; x < w; x += 4) ctx.fillRect(x, 0, 1, h);
    }
  });
}

function clothMat(tex) {
  return toon('#ffffff', { map: tex });
}

function woodFloorTexture() {
  return canvasTex((ctx, w, h) => {
    const colors = ['#c9a36b', '#d4ae76', '#c09a62', '#b99258', '#cba66e', '#bf955c', '#d2aa70', '#c4a06a'];
    const plank = h / colors.length;
    colors.forEach((col, i) => {
      ctx.fillStyle = col;
      ctx.fillRect(0, i * plank, w, plank);
      ctx.fillStyle = 'rgba(70, 42, 18, 0.3)';
      ctx.fillRect(0, i * plank + plank - 3, w, 3);
      ctx.strokeStyle = 'rgba(90, 55, 20, 0.16)';
      ctx.lineWidth = 1;
      for (let k = 0; k < 4; k++) {
        const y = i * plank + 8 + k * (plank / 5);
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.bezierCurveTo(w * 0.3, y + 2, w * 0.6, y - 2, w, y + 1);
        ctx.stroke();
      }
    });
    ctx.fillStyle = 'rgba(90, 50, 20, 0.18)';
    ctx.beginPath();
    ctx.ellipse(90, 40, 8, 5, 0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(340, 220, 7, 4, -0.3, 0, Math.PI * 2);
    ctx.fill();
  }, 512, 512);
}

function rugTexture() {
  const tex = canvasTex((ctx, w, h) => {
    ctx.fillStyle = '#1e345f';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(255,255,255,0.05)';
    ctx.lineWidth = 1;
    for (let y = 0; y < h; y += 4) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }
    ctx.strokeStyle = '#e6d3a4';
    ctx.lineWidth = 16;
    ctx.strokeRect(12, 12, w - 24, h - 24);
    ctx.strokeStyle = '#e2a23a';
    ctx.lineWidth = 4;
    ctx.strokeRect(26, 26, w - 52, h - 52);
  }, 256, 256);
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  return tex;
}

function matTexture() {
  return canvasTex((ctx, w, h) => {
    ctx.fillStyle = '#d7ddd2';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(70, 90, 70, 0.35)';
    ctx.lineWidth = 1;
    for (let x = 0; x <= w; x += 16) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = 0; y <= h; y += 16) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }
  });
}

function patternTexture() {
  return canvasTex((ctx, w, h) => {
    ctx.fillStyle = '#f7f3ea';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#8a5a48';
    ctx.lineWidth = 2;
    ctx.strokeRect(16, 12, w - 36, h - 28);
    ctx.beginPath();
    ctx.moveTo(40, 20);
    ctx.lineTo(70, h - 24);
    ctx.lineTo(w - 28, h * 0.45);
    ctx.stroke();
    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = '#243e78';
    ctx.beginPath();
    ctx.moveTo(20, h * 0.55);
    ctx.lineTo(w - 16, h * 0.4);
    ctx.stroke();
  });
}

let contactMat;
function contactMaterial() {
  if (contactMat) return contactMat;
  const tex = canvasTex((ctx, w, h) => {
    const g = ctx.createRadialGradient(w / 2, h / 2, w * 0.08, w / 2, h / 2, w * 0.48);
    g.addColorStop(0, 'rgba(40, 24, 12, 0.5)');
    g.addColorStop(0.55, 'rgba(40, 24, 12, 0.18)');
    g.addColorStop(1, 'rgba(40, 24, 12, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  });
  contactMat = new THREE.MeshBasicMaterial({
    map: tex,
    transparent: true,
    depthWrite: false,
    color: 0xffffff,
  });
  contactMat.userData.keep = true;
  contactMat.polygonOffset = true;
  contactMat.polygonOffsetFactor = -2;
  contactMat.polygonOffsetUnits = -2;
  return contactMat;
}

function contact(g, x, z, w, d, y = 0.016) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), contactMaterial());
  m.rotation.x = -Math.PI / 2;
  m.scale.set(w, d, 1);
  m.position.set(x, y, z);
  m.userData.noShadow = true;
  m.renderOrder = 2;
  g.add(m);
  return m;
}

function makeShell(layout) {
  const g = new THREE.Group();
  g.name = 'shell';
  const { width: W, depth: D, height: H } = layout.meta.room;
  const s = layout.shell;
  const plaster = toon(s.wallColor);
  const wood = toon(s.woodColor);
  const trim = toon(s.trimColor || '#f4efe6');
  const ceil = toon(s.ceilingColor);
  const floorTex = woodFloorTexture();
  floorTex.repeat.set(3.2, 4);
  const floor = new THREE.Mesh(new THREE.BoxGeometry(W, 0.08, D), toon('#ffffff', { map: floorTex }));
  floor.position.y = -0.04;
  floor.receiveShadow = true;
  g.add(floor);

  const backZ = -D / 2;
  const leftX = -W / 2;
  const sill = 1.7;
  const head = 3.02;
  const innerZ = backZ + 0.09;

  addBox(g, W, sill, 0.14, plaster, 0, sill / 2, backZ);
  addBox(g, W, H - head, 0.14, plaster, 0, (H + head) / 2, backZ);
  const windows = [[-4.35, -2.55], [-1.5, 1.35], [2.15, 3.95]];
  const edges = [-W / 2, ...windows.flat(), W / 2];
  for (let i = 0; i < edges.length; i += 2) {
    const x0 = edges[i];
    const x1 = edges[i + 1];
    addBox(g, x1 - x0, head - sill, 0.14, plaster, (x0 + x1) / 2, (sill + head) / 2, backZ);
  }
  addBox(g, 0.14, H, D, plaster, leftX, H / 2, 0);

  const paneMat = new THREE.MeshBasicMaterial({ color: 0xf4f8fc });
  paneMat.userData.keep = true;
  windows.forEach(([x0, x1]) => {
    const cx = (x0 + x1) / 2;
    const ww = x1 - x0;
    const hh = head - sill;
    const cy = (sill + head) / 2;
    const pane = addBox(g, ww - 0.1, hh - 0.1, 0.02, paneMat, cx, cy, innerZ);
    pane.userData.noShadow = true;
    addBox(g, ww + 0.02, 0.06, 0.07, trim, cx, head - 0.01, innerZ + 0.02);
    addBox(g, ww + 0.02, 0.07, 0.08, trim, cx, sill + 0.02, innerZ + 0.02);
    addBox(g, 0.06, hh, 0.07, trim, x0, cy, innerZ + 0.02);
    addBox(g, 0.06, hh, 0.07, trim, x1, cy, innerZ + 0.02);
    addBox(g, 0.035, hh - 0.12, 0.045, trim, cx, cy, innerZ + 0.03);
    if (ww > 2) addBox(g, ww - 0.12, 0.03, 0.04, trim, cx, cy + 0.05, innerZ + 0.03);
  });

  addBox(g, W - 0.2, 0.92, 0.045, wood, 0, 0.46, backZ + 0.09);
  addBox(g, 0.045, 0.92, D - 0.2, wood, leftX + 0.09, 0.46, 0);
  addBox(g, W - 0.08, 0.08, 0.06, toon(WOOD.dark), 0, 0.04, backZ + 0.1);
  addBox(g, 0.06, 0.08, D - 0.08, toon(WOOD.dark), leftX + 0.1, 0.04, 0);
  addBox(g, W - 0.3, 0.035, 0.04, wood, 0, 2.62, backZ + 0.1);
  addBox(g, 0.04, 0.035, D - 0.4, wood, leftX + 0.1, 2.62, 0);

  const soffit = addBox(g, W * 0.98, 0.1, 2.7, ceil, 0, H - 0.06, backZ + 1.35);
  soffit.castShadow = false;
  for (const bx of [-3.5, -0.32, 3.45]) {
    addBox(g, 0.14, 0.2, 6.3, wood, bx, H - 0.22, -0.85);
  }
  addBox(g, 0.18, H, 0.18, wood, 5.15, H / 2, -3.85);

  const curtainTex = fabricTexture('weave', [DYE.cream, DYE.linen, '#e7dcc8']);
  curtainTex.repeat.set(1, 3);
  const curtain = clothMat(curtainTex);
  for (const side of [-1, 1]) {
    const cx = side < 0 ? -1.38 : 1.22;
    for (let i = 0; i < 3; i++) {
      addBox(g, 0.1, 1.22, 0.025, curtain, cx + side * i * 0.07, 2.32, innerZ + 0.08 + i * 0.01);
    }
  }
  cylAxis(g, 0.015, 0.015, 3.0, toon(WOOD.peg), -0.08, 2.96, innerZ + 0.08, 'x', 8);

  const rug = addBox(g, 5.3, 0.018, 2.55, clothMat(rugTexture()), -0.55, 0.012, -2.45);
  rug.userData.noShadow = true;
  return g;
}

function floorLoom(parent, x, z, rot) {
  const g = new THREE.Group();
  g.name = 'floor-loom';
  g.position.set(x, 0, z);
  g.rotation.y = rot;
  const timber = toon(WOOD.timber);
  const oak = toon(WOOD.oak);
  const yarn = toon(DYE.linen);
  for (const sx of [-0.55, 0.55]) {
    for (const sz of [-0.5, 0.52]) addBox(g, 0.07, 1.46, 0.07, timber, sx, 0.73, sz);
    addBox(g, 0.06, 0.08, 1.05, oak, sx, 0.08, 0.0);
  }
  addBox(g, 1.16, 0.07, 0.07, timber, 0, 0.1, -0.5);
  addBox(g, 1.16, 0.07, 0.07, timber, 0, 0.1, 0.52);
  addBox(g, 0.06, 1.62, 0.07, timber, -0.5, 0.81, 0.0);
  addBox(g, 0.06, 1.62, 0.07, timber, 0.5, 0.81, 0.0);
  addBox(g, 1.08, 0.07, 0.08, timber, 0, 1.56, 0.0);

  cylAxis(g, 0.045, 0.045, 1.12, oak, 0, 0.8, 0.56, 'x', 14);
  cylAxis(g, 0.07, 0.07, 1.05, oak, 0, 0.48, -0.62, 'x', 14);
  cylAxis(g, 0.11, 0.11, 0.9, yarn, 0, 0.5, -0.62, 'x', 16);

  const tex = fabricTexture('stripe', [DYE.indigo, DYE.linen, DYE.saffron]);
  tex.repeat.set(2, 3);
  const cloth = clothMat(tex);
  cylAxis(g, 0.075, 0.075, 0.8, cloth, 0, 0.5, 0.62, 'x', 16);
  const web = addBox(g, 0.82, 0.012, 0.26, cloth, 0, 0.845, 0.46);
  web.rotation.x = -0.08;
  addBox(g, 0.8, 0.5, 0.012, cloth, 0, 0.5, 0.7);
  addBox(g, 0.2, 0.02, 0.032, toon(WOOD.maple), 0.12, 0.87, 0.4);

  const reedZ = 0.32;
  addBox(g, 0.045, 0.72, 0.04, oak, -0.46, 0.96, reedZ);
  addBox(g, 0.045, 0.72, 0.04, oak, 0.46, 0.96, reedZ);
  addBox(g, 0.98, 0.04, 0.04, oak, 0, 1.3, reedZ);
  addBox(g, 0.98, 0.03, 0.035, oak, 0, 0.66, reedZ);
  const wire = toon('#c5c8cc');
  for (let i = 0; i < 16; i++) {
    const wx = -0.38 + i * (0.76 / 15);
    addBox(g, 0.004, 0.58, 0.004, wire, wx, 0.98, reedZ);
  }
  addBox(g, 0.03, 0.03, 0.32, oak, -0.48, 1.22, 0.46);
  addBox(g, 0.03, 0.03, 0.32, oak, 0.48, 1.22, 0.46);

  shaft(g, 0.02, 0.96, 1.3, oak, yarn);
  shaft(g, 0.1, 0.88, 1.22, oak, yarn);

  for (let i = 0; i < 11; i++) {
    const wx = -0.36 + i * (0.72 / 10);
    const lift = (i % 2) * 0.07;
    strand(g, wx, 0.58, -0.56, wx, 0.9 + lift, 0.04, yarn, 0.005);
    strand(g, wx, 0.9 + lift, 0.04, wx, 0.84, 0.46, yarn, 0.005);
  }

  const treadle = toon('#5a3e2c');
  for (let i = 0; i < 4; i++) {
    const board = addBox(g, 0.09, 0.018, 0.4, treadle, -0.24 + i * 0.16, 0.07, 0.16);
    board.rotation.x = -0.08 - (i % 2) * 0.06;
  }
  parent.add(g);
}

function shaft(g, z, y0, y1, wood, yarn) {
  const h = y1 - y0;
  const yc = (y0 + y1) / 2;
  addBox(g, 0.84, 0.025, 0.02, wood, 0, y1, z);
  addBox(g, 0.84, 0.025, 0.02, wood, 0, y0, z);
  addBox(g, 0.02, h, 0.02, wood, -0.41, yc, z);
  addBox(g, 0.02, h, 0.02, wood, 0.41, yc, z);
  for (let i = 0; i < 9; i++) {
    addBox(g, 0.004, h - 0.05, 0.004, yarn, -0.32 + i * 0.08, yc, z);
  }
}

function tableLoom(parent, x, z, rot) {
  const g = new THREE.Group();
  g.name = 'table-loom';
  g.position.set(x, 0, z);
  g.rotation.y = rot;
  const wood = toon(WOOD.timber);
  const top = toon(WOOD.top);
  const h = 0.72;
  for (const sx of [-0.36, 0.36]) {
    for (const sz of [-0.26, 0.26]) addBox(g, 0.05, h, 0.05, wood, sx, h / 2, sz);
  }
  addBox(g, 0.84, 0.04, 0.62, top, 0, h, 0);
  addBox(g, 0.04, 0.3, 0.56, wood, -0.34, h + 0.16, 0);
  addBox(g, 0.04, 0.3, 0.56, wood, 0.34, h + 0.16, 0);
  cylAxis(g, 0.04, 0.04, 0.66, wood, 0, h + 0.1, 0.24, 'x', 12);
  cylAxis(g, 0.055, 0.055, 0.66, toon(DYE.linen), 0, h + 0.12, -0.24, 'x', 12);
  addBox(g, 0.62, 0.2, 0.016, toon('#e4dccb'), 0, h + 0.2, 0.02);
  for (let i = 0; i < 10; i++) {
    addBox(g, 0.004, 0.16, 0.004, toon(DYE.charcoal), -0.24 + i * 0.053, h + 0.2, 0.02);
  }
  const tex = fabricTexture('stripe', [DYE.linen, DYE.madder, DYE.olive]);
  tex.repeat.set(2, 2);
  const cloth = clothMat(tex);
  addBox(g, 0.56, 0.01, 0.2, cloth, 0, h + 0.15, 0.12);
  addBox(g, 0.54, 0.2, 0.01, cloth, 0, h - 0.02, 0.25);
  const yarn = toon(DYE.linen);
  for (let i = 0; i < 8; i++) {
    const wx = -0.22 + i * 0.063;
    strand(g, wx, h + 0.12, -0.2, wx, h + 0.2, 0.02, yarn, 0.005);
    strand(g, wx, h + 0.2, 0.02, wx, h + 0.15, 0.16, yarn, 0.005);
  }
  parent.add(g);
}

function sewingMachine(g, x, y, z) {
  const body = toon('#f6f3ee');
  const trim = toon('#2a2a28');
  const metal = toon('#b7b1a6');
  addBox(g, 0.4, 0.028, 0.18, body, x, y + 0.016, z);
  addBox(g, 0.09, 0.16, 0.14, body, x + 0.12, y + 0.11, z);
  addBox(g, 0.28, 0.055, 0.11, body, x - 0.02, y + 0.2, z);
  addBox(g, 0.11, 0.13, 0.11, body, x - 0.145, y + 0.145, z);
  addBox(g, 0.008, 0.055, 0.008, trim, x - 0.175, y + 0.07, z + 0.02);
  addBox(g, 0.02, 0.006, 0.014, trim, x - 0.175, y + 0.04, z + 0.02);
  cylAxis(g, 0.05, 0.05, 0.02, trim, x + 0.175, y + 0.15, z, 'x', 16);
  addCyl(g, 0.006, 0.006, 0.05, metal, x + 0.08, y + 0.26, z, 6);
  addCyl(g, 0.02, 0.02, 0.028, toon(DYE.indigo), x + 0.08, y + 0.28, z, 10);
  const scrap = fabricTexture('stripe', [DYE.blush, DYE.cream, DYE.madder]);
  addBox(g, 0.14, 0.004, 0.1, clothMat(scrap), x - 0.08, y + 0.034, z + 0.01);
  strand(g, x + 0.08, y + 0.3, z, x - 0.15, y + 0.22, z, toon(DYE.indigo), 0.004);
  strand(g, x - 0.15, y + 0.22, z, x - 0.175, y + 0.07, z + 0.02, toon(DYE.indigo), 0.004);
}

function sewingTable(parent, zone, shelfTex) {
  const g = new THREE.Group();
  g.position.set(zone.x, 0, zone.z);
  g.rotation.y = zone.rot;
  const { w, d, h } = zone;
  const oak = toon(WOOD.oak);
  const top = toon(WOOD.top);
  addBox(g, w, 0.045, d, top, 0, h - 0.022, 0);
  addBox(g, w - 0.1, 0.08, d - 0.08, oak, 0, h - 0.09, 0);
  const ix = w / 2 - 0.08;
  const iz = d / 2 - 0.08;
  for (const sx of [-ix, ix]) {
    for (const sz of [-iz, iz]) addBox(g, 0.065, h - 0.05, 0.065, oak, sx, (h - 0.05) / 2, sz);
  }
  addBox(g, w * 0.36, 0.06, 0.016, toon('#a87448'), -0.08, h - 0.1, d / 2 - 0.008);
  addBox(g, 0.028, 0.012, 0.012, toon(DYE.cream), -0.08, h - 0.1, d / 2 + 0.004);
  addBox(g, w - 0.22, 0.02, d - 0.16, toon('#b88958'), 0, 0.16, 0);
  addBox(g, 0.24, 0.04, 0.16, clothMat(shelfTex), 0.12, 0.19, 0.02);
  sewingMachine(g, 0.02, h, 0.06);
  parent.add(g);
}

function cuttingTable(parent, zone) {
  const g = new THREE.Group();
  g.name = 'cutting-table';
  g.position.set(zone.x, 0, zone.z);
  g.rotation.y = zone.rot;
  const { w, d, h } = zone;
  const maple = toon(WOOD.maple);
  const oak = toon(WOOD.oak);
  addBox(g, w, 0.05, d, maple, 0, h - 0.025, 0);
  addBox(g, w - 0.14, 0.09, d - 0.12, oak, 0, h - 0.1, 0);
  for (const tx of [-w * 0.34, w * 0.34]) {
    addBox(g, 0.08, h - 0.08, d - 0.32, oak, tx, (h - 0.08) / 2, 0);
    addBox(g, 0.1, 0.06, d - 0.2, oak, tx, 0.05, 0);
  }
  addBox(g, w * 0.62, 0.05, 0.08, oak, 0, 0.18, 0);
  addBox(g, w * 0.58, 0.028, d * 0.48, toon(WOOD.top), 0, 0.32, 0);
  const spare = fabricTexture('weave', [DYE.teal, DYE.woad, DYE.teal]);
  spare.repeat.set(2, 1);
  cylAxis(g, 0.09, 0.09, 0.7, clothMat(spare), -0.15, 0.42, 0, 'x', 16);

  const mat = matTexture();
  mat.repeat.set(4, 2);
  addBox(g, w - 0.32, 0.008, d - 0.24, toon('#ffffff', { map: mat }), 0, h + 0.004, 0);

  const clothTex = fabricTexture('plaid', [DYE.madder, DYE.cream, DYE.navy]);
  clothTex.repeat.set(2, 2);
  const piece = addBox(g, 1.2, 0.008, 0.58, clothMat(clothTex), -0.12, h + 0.014, 0.02);
  piece.rotation.y = -0.14;
  const paperTex = patternTexture();
  const paper = addBox(g, 0.46, 0.004, 0.32, toon('#ffffff', { map: paperTex }), -0.55, h + 0.02, -0.12);
  paper.rotation.y = 0.08;

  shears(g, 0.62, h + 0.03, 0.22, -0.4);
  addBox(g, 0.62, 0.008, 0.028, toon('#d7b07a'), 0.15, h + 0.02, -0.34);
  addBox(g, 0.02, 0.008, 0.28, toon('#d7b07a'), 0.42, h + 0.02, -0.22);
  cylAxis(g, 0.045, 0.045, 0.025, toon('#8d9194'), -0.78, h + 0.02, 0.22, 'y', 12);
  cylAxis(g, 0.04, 0.04, 0.02, toon('#6e7276'), -0.92, h + 0.018, 0.02, 'y', 12);
  addBox(g, 0.045, 0.012, 0.016, toon(DYE.cream), 0.35, h + 0.02, 0.28);
  parent.add(g);
}

function shears(g, x, y, z, rot) {
  const grp = new THREE.Group();
  const blade = toon('#d5d8dc');
  const handle = toon('#2a2a28');
  const b1 = addBox(grp, 0.18, 0.008, 0.016, blade, 0.06, 0, 0);
  b1.rotation.y = 0.22;
  const b2 = addBox(grp, 0.18, 0.008, 0.016, blade, 0.06, 0.007, 0);
  b2.rotation.y = -0.22;
  addCyl(grp, 0.012, 0.012, 0.02, toon('#a08040'), 0, 0.01, 0, 8);
  for (const dz of [-0.014, 0.014]) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.026, 0.006, 6, 12), handle);
    ring.rotation.x = Math.PI / 2;
    ring.position.set(-0.055, 0.01, dz);
    grp.add(ring);
  }
  grp.position.set(x, y, z);
  grp.rotation.y = rot;
  g.add(grp);
}

function spool(g, x, y, z, color, axis) {
  const flange = toon(DYE.cream);
  const thread = toon(color);
  const o = 0.016;
  if (axis === 'x') {
    cylAxis(g, 0.028, 0.028, 0.01, flange, x - o, y, z, 'x', 8);
    cylAxis(g, 0.028, 0.028, 0.01, flange, x + o, y, z, 'x', 8);
    cylAxis(g, 0.015, 0.015, 0.03, thread, x, y, z, 'x', 8);
  } else {
    cylAxis(g, 0.026, 0.026, 0.01, flange, x, y, z - o, 'z', 8);
    cylAxis(g, 0.026, 0.026, 0.01, flange, x, y, z + o, 'z', 8);
    cylAxis(g, 0.014, 0.014, 0.028, thread, x, y, z, 'z', 8);
  }
}

function floorThreadRack(parent, x, z, rot) {
  const g = new THREE.Group();
  g.name = 'thread-rack';
  g.position.set(x, 0, z);
  g.rotation.y = rot;
  const wood = toon(WOOD.timber);
  const W = 0.74;
  const H = 1.56;
  addBox(g, W, 0.05, 0.3, wood, 0, 0.04, 0);
  addBox(g, 0.05, H, 0.05, wood, -W / 2 + 0.03, H / 2, 0);
  addBox(g, 0.05, H, 0.05, wood, W / 2 - 0.03, H / 2, 0);
  addBox(g, W, 0.04, 0.05, wood, 0, H - 0.02, 0);
  const rows = [
    { y: 1.32, colors: [DYE.indigo, DYE.woad, DYE.teal, DYE.navy, DYE.indigo, DYE.teal, DYE.woad] },
    { y: 1.08, colors: [DYE.madder, DYE.rust, DYE.blush, DYE.plum, DYE.madder, DYE.rust, DYE.blush] },
    { y: 0.84, colors: [DYE.saffron, DYE.gold, DYE.olive, DYE.saffron, DYE.moss, DYE.gold, DYE.olive] },
    { y: 0.6, colors: [DYE.linen, DYE.charcoal, DYE.cream, DYE.linen, DYE.charcoal, '#c4b39a', DYE.cream] },
  ];
  rows.forEach((row) => {
    cylAxis(g, 0.01, 0.01, W - 0.12, toon(WOOD.top), 0, row.y, 0, 'x', 8);
    row.colors.forEach((col, i) => spool(g, -0.27 + i * 0.09, row.y, 0, col, 'x'));
  });
  [DYE.indigo, DYE.saffron, DYE.madder, DYE.olive].forEach((col, i) => {
    addCyl(g, 0.012, 0.05, 0.15, toon(col), -0.24 + i * 0.16, 0.16, 0.02, 10);
  });
  parent.add(g);
}

function wallThreadRack(g) {
  const x = -5.28;
  const z0 = 1.12;
  const z1 = 2.42;
  const wood = toon(WOOD.timber);
  const zc = (z0 + z1) / 2;
  addBox(g, 0.04, 0.88, 0.04, wood, x, 1.38, z0);
  addBox(g, 0.04, 0.88, 0.04, wood, x, 1.38, z1);
  addBox(g, 0.04, 0.04, z1 - z0, wood, x, 1.8, zc);
  addBox(g, 0.04, 0.04, z1 - z0, wood, x, 0.96, zc);
  const rows = [
    { y: 1.18, colors: [DYE.indigo, DYE.woad, DYE.teal, DYE.navy, DYE.indigo, DYE.teal] },
    { y: 1.42, colors: [DYE.madder, DYE.saffron, DYE.olive, DYE.blush, DYE.rust, DYE.plum] },
    { y: 1.66, colors: [DYE.linen, DYE.charcoal, DYE.gold, DYE.cream, DYE.olive, DYE.madder] },
  ];
  rows.forEach((row) => {
    cylAxis(g, 0.008, 0.008, z1 - z0 - 0.1, toon(WOOD.top), x + 0.045, row.y, zc, 'z', 8);
    row.colors.forEach((col, i) => spool(g, x + 0.07, row.y, z0 + 0.16 + i * 0.2, col, 'z'));
  });
}

function rollRack(g) {
  const x = -5.05;
  const zs = [-1.55, -0.7, 0.15, 0.85];
  const wood = toon(WOOD.timber);
  zs.forEach((z) => addBox(g, 0.06, 1.72, 0.06, wood, x, 0.86, z));
  addBox(g, 0.08, 0.06, 2.5, wood, x, 1.7, -0.35);
  addBox(g, 0.08, 0.06, 2.5, wood, x, 0.08, -0.35);
  const levels = [0.46, 0.98, 1.46];
  levels.forEach((y) => cylAxis(g, 0.016, 0.016, 2.35, toon(WOOD.top), x, y, -0.35, 'z', 8));
  const bolts = [
    { z: -1.2, y: 0.46, r: 0.13, len: 0.58, type: 'stripe', c: [DYE.indigo, DYE.linen, DYE.saffron], tail: true },
    { z: -0.35, y: 0.46, r: 0.11, len: 0.62, type: 'weave', c: [DYE.olive, DYE.moss, DYE.olive] },
    { z: 0.48, y: 0.46, r: 0.14, len: 0.55, type: 'plaid', c: [DYE.madder, DYE.cream, DYE.navy] },
    { z: -1.28, y: 0.98, r: 0.12, len: 0.5, type: 'ikat', c: [DYE.teal, DYE.cream, DYE.woad] },
    { z: -0.55, y: 0.98, r: 0.15, len: 0.66, type: 'stripe', c: [DYE.saffron, DYE.gold, DYE.linen] },
    { z: 0.28, y: 0.98, r: 0.1, len: 0.48, type: 'weave', c: [DYE.plum, DYE.blush, DYE.plum] },
    { z: -0.95, y: 1.46, r: 0.11, len: 0.6, type: 'stripe', c: [DYE.linen, DYE.charcoal, DYE.linen] },
    { z: 0.05, y: 1.46, r: 0.13, len: 0.52, type: 'plaid', c: [DYE.teal, DYE.saffron, DYE.indigo] },
  ];
  bolts.forEach((b) => {
    const tex = fabricTexture(b.type, b.c);
    tex.repeat.set(1, 2);
    cylAxis(g, b.r, b.r, b.len, clothMat(tex), x, b.y + b.r, b.z, 'z', 18);
    cylAxis(g, b.r * 0.42, b.r * 0.42, b.len + 0.04, toon(DYE.cream), x, b.y + b.r, b.z, 'z', 10);
    if (b.tail) {
      const tail = addBox(g, 0.012, 0.55, b.len * 0.92, clothMat(tex), x + b.r, b.y + b.r - 0.28, b.z);
      tail.castShadow = true;
    }
  });
}

function boltBin(g) {
  const x = -4.58;
  const z = -3.25;
  const wood = toon(WOOD.timber);
  addBox(g, 0.72, 0.06, 0.52, wood, x, 0.04, z);
  addBox(g, 0.72, 0.4, 0.04, wood, x, 0.26, z - 0.24);
  addBox(g, 0.72, 0.22, 0.04, wood, x, 0.16, z + 0.24);
  addBox(g, 0.04, 0.4, 0.52, wood, x - 0.34, 0.26, z);
  addBox(g, 0.04, 0.4, 0.52, wood, x + 0.34, 0.26, z);
  const bolts = [
    { dx: -0.18, r: 0.08, h: 0.58, type: 'stripe', c: [DYE.saffron, DYE.madder, DYE.saffron] },
    { dx: 0.0, r: 0.07, h: 0.46, type: 'weave', c: [DYE.indigo, DYE.navy, DYE.indigo] },
    { dx: 0.18, r: 0.09, h: 0.66, type: 'ikat', c: [DYE.olive, DYE.linen, DYE.teal] },
  ];
  bolts.forEach((b) => {
    const tex = fabricTexture(b.type, b.c);
    tex.repeat.set(1, 2);
    cylAxis(g, b.r, b.r, b.h, clothMat(tex), x + b.dx, 0.08 + b.h / 2, z, 'y', 16);
  });
}

function hangingSamples(g, spec) {
  const { z, y, x0, x1 } = spec;
  cylAxis(g, 0.016, 0.016, x1 - x0 + 0.08, toon(WOOD.peg), (x0 + x1) / 2, y, z, 'x', 10);
  addBox(g, 0.04, 0.08, 0.04, toon(WOOD.timber), x0, y - 0.02, z - 0.02);
  addBox(g, 0.04, 0.08, 0.04, toon(WOOD.timber), x1, y - 0.02, z - 0.02);
  const swatches = [
    { x: 2.4, w: 0.2, h: 0.5, type: 'stripe', c: [DYE.indigo, DYE.linen, DYE.saffron] },
    { x: 2.64, w: 0.15, h: 0.74, type: 'weave', c: [DYE.saffron, '#c48a28', DYE.saffron] },
    { x: 2.86, w: 0.22, h: 0.56, type: 'plaid', c: [DYE.madder, DYE.cream, DYE.navy] },
    { x: 3.08, w: 0.14, h: 0.86, type: 'ikat', c: [DYE.teal, DYE.linen, DYE.indigo] },
    { x: 3.3, w: 0.2, h: 0.46, type: 'stripe', c: [DYE.linen, DYE.olive, DYE.linen] },
    { x: 3.52, w: 0.17, h: 0.68, type: 'weave', c: [DYE.plum, '#4a2438', DYE.plum] },
    { x: 3.76, w: 0.16, h: 0.4, type: 'stripe', c: [DYE.blush, DYE.cream, DYE.madder] },
  ];
  swatches.forEach((s, i) => {
    const tex = fabricTexture(s.type, s.c);
    tex.repeat.set(1, Math.max(1, s.h / 0.35));
    const cloth = addBox(g, s.w, s.h, 0.01, clothMat(tex), s.x, y - 0.05 - s.h / 2, z + 0.03);
    cloth.rotation.y = i % 2 === 0 ? 0.025 : -0.02;
    addBox(g, 0.03, 0.025, 0.02, toon(WOOD.dark), s.x, y - 0.02, z + 0.02);
  });
}

function warpingBoard(g) {
  const x = -5.3;
  const z = -3.4;
  const y = 1.82;
  const wood = toon(WOOD.oak);
  addBox(g, 0.03, 0.92, 0.045, wood, x, y, z - 0.46);
  addBox(g, 0.03, 0.92, 0.045, wood, x, y, z + 0.46);
  addBox(g, 0.03, 0.045, 0.98, wood, x, y + 0.44, z);
  addBox(g, 0.03, 0.045, 0.98, wood, x, y - 0.44, z);
  const peg = toon(WOOD.peg);
  const yarn = toon(DYE.saffron);
  const pegs = [[-0.4, 0.28], [-0.12, 0.16], [0.18, 0.26], [0.4, 0.3], [0.4, -0.02], [0.14, -0.1], [-0.02, -0.32], [-0.4, -0.24], [-0.4, 0.02]];
  pegs.forEach(([dz, dy]) => cylAxis(g, 0.016, 0.016, 0.1, peg, x + 0.05, y + dy, z + dz, 'x', 6));
  for (let i = 0; i < pegs.length - 1; i++) {
    strand(g, x + 0.08, y + pegs[i][1], z + pegs[i][0], x + 0.08, y + pegs[i + 1][1], z + pegs[i + 1][0], yarn, 0.02);
  }
}

function apron(g, x, y, z, color) {
  cylAxis(g, 0.012, 0.012, 0.08, toon(WOOD.peg), x + 0.02, y, z, 'x', 6);
  const tex = fabricTexture('weave', [color, color, DYE.cream]);
  addBox(g, 0.012, 0.46, 0.28, clothMat(tex), x + 0.06, y - 0.28, z);
  addBox(g, 0.012, 0.16, 0.02, toon(color), x + 0.055, y - 0.06, z - 0.07);
  addBox(g, 0.012, 0.16, 0.02, toon(color), x + 0.055, y - 0.06, z + 0.07);
}

function foldChest(parent, x, z, rot) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  g.rotation.y = rot;
  addBox(g, 1.16, 0.42, 0.52, toon(WOOD.timber), 0, 0.21, 0);
  addBox(g, 1.2, 0.04, 0.56, toon(WOOD.top), 0, 0.44, 0);
  const stacks = [
    { x: -0.34, h: 0.1, w: 0.32, d: 0.28, type: 'stripe', c: [DYE.indigo, DYE.linen, DYE.saffron] },
    { x: 0.02, h: 0.15, w: 0.3, d: 0.26, type: 'plaid', c: [DYE.madder, DYE.cream, DYE.navy] },
    { x: 0.36, h: 0.08, w: 0.26, d: 0.3, type: 'weave', c: [DYE.olive, DYE.moss, DYE.olive] },
  ];
  stacks.forEach((s) => {
    const tex = fabricTexture(s.type, s.c);
    tex.repeat.set(2, 2);
    addBox(g, s.w, s.h, s.d, clothMat(tex), s.x, 0.46 + s.h / 2, 0);
  });
  parent.add(g);
}

function iron(g, x, y, z, rot) {
  const grp = new THREE.Group();
  addBox(grp, 0.18, 0.05, 0.1, toon('#d5d8dc'), -0.02, 0.04, 0);
  addBox(grp, 0.07, 0.038, 0.07, toon('#c5c8cc'), 0.1, 0.032, 0);
  addBox(grp, 0.26, 0.012, 0.1, toon('#8e949a'), 0.01, 0.008, 0);
  addBox(grp, 0.1, 0.032, 0.022, toon('#2c2c2a'), -0.02, 0.09, 0);
  addBox(grp, 0.018, 0.05, 0.018, toon('#2c2c2a'), -0.06, 0.065, 0);
  addBox(grp, 0.018, 0.05, 0.018, toon('#2c2c2a'), 0.045, 0.065, 0);
  grp.position.set(x, y, z);
  grp.rotation.y = rot || 0;
  g.add(grp);
}

function ironingBoard(parent, x, z, rot) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  g.rotation.y = rot;
  const padTex = fabricTexture('weave', ['#f4efe4', '#e7ecdf', '#f4efe4']);
  padTex.repeat.set(1, 3);
  const pad = clothMat(padTex);
  const leg = toon('#8d9194');
  addBox(g, 1.02, 0.04, 0.32, pad, -0.06, 0.86, 0);
  addBox(g, 0.2, 0.04, 0.2, pad, 0.5, 0.86, 0);
  addBox(g, 0.035, 0.84, 0.035, leg, -0.22, 0.42, 0.1);
  addBox(g, 0.035, 0.84, 0.035, leg, -0.22, 0.42, -0.1);
  addBox(g, 0.035, 0.84, 0.035, leg, 0.28, 0.42, 0);
  addBox(g, 0.4, 0.025, 0.025, leg, 0.02, 0.28, 0);
  iron(g, -0.28, 0.88, 0, 0.2);
  parent.add(g);
}

function creel(g, x, z) {
  const wood = toon(WOOD.timber);
  addBox(g, 0.58, 0.04, 0.28, wood, x, 0.42, z);
  for (const sx of [-0.25, 0.25]) {
    for (const sz of [-0.1, 0.1]) addBox(g, 0.035, 0.42, 0.035, wood, x + sx, 0.21, z + sz);
  }
  [DYE.indigo, DYE.saffron, DYE.linen, DYE.madder, DYE.teal, DYE.olive].forEach((col, i) => {
    const cx = x - 0.18 + (i % 3) * 0.18;
    const cz = z + (i < 3 ? -0.05 : 0.07);
    addCyl(g, 0.01, 0.045, 0.14, toon(col), cx, 0.53, cz, 10);
  });
}

function basket(g, x, z) {
  addCyl(g, 0.16, 0.12, 0.16, toon('#8a6238'), x, 0.1, z, 12);
  const a = fabricTexture('stripe', [DYE.saffron, DYE.indigo, DYE.linen]);
  const b = fabricTexture('weave', [DYE.madder, DYE.blush, DYE.madder]);
  addBox(g, 0.12, 0.035, 0.1, clothMat(a), x, 0.2, z);
  addBox(g, 0.08, 0.03, 0.07, clothMat(b), x + 0.04, 0.23, z - 0.02);
}

function herb(g, x, z) {
  addCyl(g, 0.012, 0.018, 0.2, toon('#4a5a32'), x, 0.34, z, 6);
  addBox(g, 0.26, 0.14, 0.2, toon('#3f6a45'), x, 0.5, z);
  addBox(g, 0.16, 0.1, 0.14, toon('#4e7a4e'), x + 0.06, 0.6, z - 0.03);
  addBox(g, 0.12, 0.08, 0.1, toon('#2f5a38'), x - 0.07, 0.56, z + 0.04);
}

function dressNotions(g, layout) {
  const inst = (layout.instances || []).find((i) => i.id === 'notions_table');
  if (!inst) return;
  const grp = new THREE.Group();
  grp.position.set(inst.position[0], 0.75, inst.position[2]);
  grp.rotation.y = inst.rotationY || 0;
  const cushion = new THREE.Mesh(new THREE.SphereGeometry(0.045, 12, 10), toon(DYE.madder));
  cushion.scale.y = 0.72;
  cushion.position.set(-0.14, 0.03, 0.06);
  grp.add(cushion);
  cylAxis(grp, 0.03, 0.03, 0.018, toon(DYE.saffron), 0.14, 0.02, -0.08, 'y', 10);
  addBox(grp, 0.05, 0.01, 0.016, toon(DYE.cream), 0.02, 0.012, 0.12);
  shears(grp, 0.12, 0.02, 0.1, 1.1);
  const stackTex = fabricTexture('stripe', [DYE.teal, DYE.linen, DYE.teal]);
  addBox(grp, 0.16, 0.035, 0.12, clothMat(stackTex), -0.02, 0.02, -0.12);
  g.add(grp);
}

function pendantDressing(g, layout) {
  const ceil = layout.meta.room.height - 0.12;
  for (const inst of layout.instances || []) {
    if (inst.kind !== 'pendant_lamp') continue;
    const [x, y, z] = inst.position;
    const top = y + 0.42;
    const len = Math.max(0.08, ceil - top);
    addCyl(g, 0.007, 0.007, len, toon(WOOD.dark), x, top + len / 2, z, 6);
    const bulb = new THREE.Mesh(
      new THREE.SphereGeometry(0.04, 12, 10),
      toon('#fff4dc', { emissive: '#ffd18a', emissiveIntensity: 1.35 })
    );
    bulb.position.set(x, y + 0.1, z);
    bulb.userData.noShadow = true;
    g.add(bulb);
  }
  for (const id of ['lamp_a', 'lamp_b']) {
    const inst = (layout.instances || []).find((i) => i.id === id);
    if (!inst) continue;
    const glow = new THREE.Mesh(
      new THREE.SphereGeometry(0.035, 10, 8),
      toon('#fff1cc', { emissive: '#ffc56a', emissiveIntensity: 1.2 })
    );
    glow.position.set(inst.position[0], inst.position[1] + 0.24, inst.position[2]);
    glow.userData.noShadow = true;
    g.add(glow);
  }
}

function makeProcedural(layout) {
  const g = new THREE.Group();
  g.name = 'procedural';
  const z = layout.zones;

  floorLoom(g, z.heroLoom.x, z.heroLoom.z, z.heroLoom.rot);
  tableLoom(g, z.tableLoom.x, z.tableLoom.z, z.tableLoom.rot);
  cuttingTable(g, z.cutting);
  const shelfA = fabricTexture('stripe', [DYE.blush, DYE.cream, DYE.indigo]);
  const shelfB = fabricTexture('weave', [DYE.olive, DYE.linen, DYE.olive]);
  sewingTable(g, z.sewA, shelfA);
  sewingTable(g, z.sewB, shelfB);
  rollRack(g);
  boltBin(g);
  wallThreadRack(g);
  floorThreadRack(g, z.threadFloor.x, z.threadFloor.z, z.threadFloor.rot);
  hangingSamples(g, z.samples);
  warpingBoard(g);
  apron(g, -5.28, 1.55, 2.75, DYE.indigo);
  apron(g, -5.28, 1.55, 3.15, DYE.linen);
  foldChest(g, z.folds.x, z.folds.z, z.folds.rot);
  ironingBoard(g, z.iron.x, z.iron.z, z.iron.rot);
  creel(g, -3.25, -2.35);
  basket(g, 0.95, 1.45);
  herb(g, -4.95, 3.35);
  dressNotions(g, layout);
  pendantDressing(g, layout);

  contact(g, z.heroLoom.x, z.heroLoom.z, 1.5, 1.7, 0.03);
  contact(g, z.tableLoom.x, z.tableLoom.z, 1.05, 0.95, 0.03);
  contact(g, z.cutting.x, z.cutting.z, 2.6, 1.35);
  contact(g, z.sewA.x, z.sewA.z, 1.35, 0.85);
  contact(g, z.sewB.x, z.sewB.z, 1.25, 0.8);
  contact(g, -2.45, 1.85, 0.95, 0.95);
  contact(g, z.threadFloor.x, z.threadFloor.z, 0.9, 0.55);
  contact(g, z.folds.x, z.folds.z, 1.3, 0.7);
  contact(g, z.iron.x, z.iron.z, 1.3, 0.55);
  contact(g, -4.7, -0.35, 0.55, 2.6);
  contact(g, -4.58, -3.25, 0.85, 0.65);
  contact(g, -1.79, -1.38, 1.15, 0.6, 0.03);
  contact(g, 3.12, -3.22, 1.9, 0.6);
  contact(g, -4.95, 3.35, 0.4, 0.4);

  const patchMat = new THREE.MeshBasicMaterial({
    color: 0xfff4e2,
    transparent: true,
    opacity: 0.12,
    depthWrite: false,
  });
  patchMat.userData.keep = true;
  const patch = new THREE.Mesh(new THREE.PlaneGeometry(2.3, 1.7), patchMat);
  patch.rotation.x = -Math.PI / 2;
  patch.position.set(-0.05, 0.025, -2.55);
  patch.userData.noShadow = true;
  g.add(patch);
  return g;
}

boot({
  makeShell,
  makeProcedural,
  readyText: 'ready — weaving & sewing studio · drag orbit · U unlit · T toon',
});
