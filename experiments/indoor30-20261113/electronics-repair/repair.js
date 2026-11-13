import * as THREE from 'three';
import { boot, toon, addBox, addCyl, makeCutawayShell, applyShading } from './scene_lib.js';

const labelCache = new Map();

function labelMat(text, bg, fg, cw = 256, ch = 128, font = 64) {
  const key = [text, bg, fg, cw, ch, font].join('|');
  if (labelCache.has(key)) return labelCache.get(key);
  const canvas = document.createElement('canvas');
  canvas.width = cw;
  canvas.height = ch;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, cw, ch);
  ctx.fillStyle = fg;
  ctx.font = `700 ${font}px Inter, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, cw / 2, ch / 2 + font * 0.04);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  tex.magFilter = THREE.LinearFilter;
  const mat = toon('#ffffff', { map: tex });
  labelCache.set(key, mat);
  return mat;
}

function waveMat() {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 160;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#083024';
  ctx.fillRect(0, 0, 256, 160);
  ctx.strokeStyle = '#1d6a48';
  ctx.lineWidth = 1;
  for (let i = 1; i < 4; i++) {
    ctx.beginPath();
    ctx.moveTo(0, i * 40);
    ctx.lineTo(256, i * 40);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(i * 64, 0);
    ctx.lineTo(i * 64, 160);
    ctx.stroke();
  }
  ctx.strokeStyle = '#c6ff7a';
  ctx.lineWidth = 3;
  ctx.beginPath();
  for (let x = 0; x <= 256; x++) {
    const y = 82 + Math.sin(x * 0.07) * 26 + Math.sin(x * 0.19) * 8;
    if (x === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return toon('#9dffb0', { map: tex, emissive: '#b6ff8a', emissiveIntensity: 0.55 });
}

function quiet(mesh) {
  mesh.castShadow = false;
  mesh.userData.noShadow = true;
  return mesh;
}

function card(g, w, h, mat, x, y, z) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
  m.position.set(x, y, z);
  return quiet(m), g.add(m), m;
}

function makeShell(layout) {
  const g = makeCutawayShell(layout, { ceiling: false });
  const { width: W, depth: D, height: H } = layout.meta.room;
  const innerB = -D / 2 + 0.08;
  const innerL = -W / 2 + 0.08;

  g.traverse((obj) => {
    if (!obj.isMesh || !obj.geometry?.parameters) return;
    const p = obj.geometry.parameters;
    if (p.height === 0.08 && p.width > 5 && p.depth > 5) {
      obj.geometry.dispose();
      obj.geometry = new THREE.BoxGeometry(p.width, 0.014, p.depth);
      obj.position.y = -0.007;
      obj.userData.noShadow = true;
      obj.userData.receiveShadow = true;
    }
  });

  const tileA = toon('#d4c4aa');
  const tileB = toon('#c2b093');
  const grout = toon('#a89880');
  const tw = 0.56;
  const margin = 0.06;
  const nx = Math.floor((W - margin * 2) / tw);
  const nz = Math.floor((D - margin * 2) / tw);
  const ox = -((nx - 1) * tw) / 2;
  const oz = -((nz - 1) * tw) / 2;
  for (let iz = 0; iz < nz; iz++) {
    for (let ix = 0; ix < nx; ix++) {
      quiet(addBox(g, tw - 0.018, 0.008, tw - 0.018, (ix + iz) % 2 ? tileB : tileA, ox + ix * tw, 0.006, oz + iz * tw));
    }
  }
  quiet(addBox(g, W - 0.16, 0.004, 0.012, grout, 0, 0.012, innerB + 0.02));

  const panel = toon('#6a7c88');
  const inset = toon('#7d8e99', { polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 });
  const wood = toon('#5c3d2e');
  const panelH = 1.02;
  const panelY = 0.56;
  const railY = 1.12;
  const backZ = innerB + 0.03;
  const leftX = innerL + 0.03;
  const xEnd = W / 2 - 0.28;
  const zEnd = D / 2 - 0.28;
  quiet(addBox(g, 0.09, panelH, 0.09, panel, leftX, panelY, backZ));
  const nBack = 8;
  const bw = (xEnd - (leftX + 0.06)) / nBack;
  for (let i = 0; i < nBack; i++) {
    const x = leftX + 0.06 + (i + 0.5) * bw;
    quiet(addBox(g, bw - 0.04, panelH, 0.04, panel, x, panelY, backZ));
    quiet(addBox(g, bw - 0.1, panelH - 0.16, 0.012, inset, x, panelY, backZ + 0.018));
  }
  const nLeft = 7;
  const ld = (zEnd - (backZ + 0.06)) / nLeft;
  for (let i = 0; i < nLeft; i++) {
    const z = backZ + 0.06 + (i + 0.5) * ld;
    quiet(addBox(g, 0.04, panelH, ld - 0.04, panel, leftX, panelY, z));
    quiet(addBox(g, 0.012, panelH - 0.16, ld - 0.1, inset, leftX + 0.018, panelY, z));
  }
  addBox(g, xEnd - leftX, 0.055, 0.06, wood, (leftX + xEnd) / 2, railY, backZ);
  addBox(g, 0.06, 0.055, zEnd - backZ, wood, leftX, railY, (backZ + zEnd) / 2);
  addBox(g, 0.1, 0.055, 0.1, wood, leftX, railY, backZ);
  quiet(addBox(g, xEnd - leftX + 0.02, 0.09, 0.028, wood, (leftX + xEnd) / 2, 0.045, backZ + 0.01));
  quiet(addBox(g, 0.028, 0.09, zEnd - backZ, wood, leftX + 0.01, 0.045, (backZ + zEnd) / 2));

  const ceilMat = toon('#f4efe6', { emissive: '#f6f0e4', emissiveIntensity: 0.92, side: THREE.DoubleSide });
  const ceilUnder = H - 0.09;
  quiet(addBox(g, W - 0.1, 0.07, D - 0.1, ceilMat, -0.02, H - 0.05, -0.02));
  const cornY = H - 0.1;
  quiet(addBox(g, xEnd - leftX + 0.04, 0.07, 0.07, wood, (leftX + xEnd) / 2, cornY, backZ));
  quiet(addBox(g, 0.07, 0.07, zEnd - backZ, wood, leftX, cornY, (backZ + zEnd) / 2));
  quiet(addBox(g, 0.1, 0.07, 0.1, wood, leftX, cornY, backZ));
  quiet(addBox(g, 0.08, H - 0.04, 0.1, wood, W / 2 - 0.03, (H - 0.04) / 2, -D / 2 + 0.02));
  quiet(addBox(g, 0.1, H - 0.04, 0.08, wood, -W / 2 + 0.02, (H - 0.04) / 2, D / 2 - 0.03));

  const beam = toon('#5e656c');
  for (const z of [-2.55, -0.35, 1.7]) {
    quiet(addBox(g, W - 0.7, 0.05, 0.06, beam, -0.08, ceilUnder - 0.025, z));
  }

  const tube = toon('#fff6dd', { emissive: '#ffe7b0', emissiveIntensity: 0.85 });
  const housing = toon('#2e3338');
  const hy = ceilUnder - 0.03;
  quiet(addBox(g, 1.5, 0.04, 0.14, housing, -2.05, hy, -2.55));
  quiet(addBox(g, 1.32, 0.01, 0.06, tube, -2.05, hy - 0.026, -2.55));
  quiet(addBox(g, 1.15, 0.04, 0.14, housing, 2.35, hy, -2.45));
  quiet(addBox(g, 0.98, 0.01, 0.06, tube, 2.35, hy - 0.026, -2.45));

  const ao = toon('#2a241c', { transparent: true, opacity: 0.16, depthWrite: false });
  quiet(addBox(g, W - 0.4, 0.04, 0.06, ao, 0, 0.03, innerB));
  quiet(addBox(g, 0.06, 0.04, D - 0.4, ao, innerL, 0.03, 0));

  const runner = quiet(addBox(g, 1.15, 0.012, 2.15, toon('#3a403c'), -0.15, 0.016, 2.55));
  runner.userData.receiveShadow = true;
  quiet(addBox(g, 1.7, 0.012, 0.85, toon('#2c3330'), -2.05, 0.016, -2.15)).userData.receiveShadow = true;
  return g;
}

function contact(g, x, z, rx, rz) {
  const m = new THREE.Mesh(
    new THREE.CircleGeometry(1, 16),
    toon('#241910', { transparent: true, opacity: 0.2, depthWrite: false, polygonOffset: true }),
  );
  m.rotation.x = -Math.PI / 2;
  m.position.set(x, 0.02, z);
  m.scale.set(rx, rz, 1);
  g.add(quiet(m));
}

function stereoScope(g, x, y, z) {
  const grp = new THREE.Group();
  grp.name = 'solder_scope';
  addBox(grp, 0.18, 0.02, 0.12, toon('#2c3136'), 0, 0.01, 0);
  addCyl(grp, 0.016, 0.02, 0.34, toon('#3e464e'), -0.02, 0.19, -0.02, 12);
  addBox(grp, 0.28, 0.018, 0.02, toon('#535c64'), 0.11, 0.35, 0.01);
  addCyl(grp, 0.02, 0.02, 0.028, toon('#2a3034'), 0.24, 0.35, 0.02, 10);
  addCyl(grp, 0.012, 0.014, 0.08, toon('#2e353c'), 0.24, 0.29, 0.07, 10);
  addBox(grp, 0.1, 0.055, 0.06, toon('#1b2126'), 0.24, 0.24, 0.09);
  addCyl(grp, 0.012, 0.018, 0.045, toon('#c6a15a'), 0.24, 0.19, 0.09, 10);
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(0.026, 0.0045, 8, 16),
    toon('#fff4d4', { emissive: '#ffd7a4', emissiveIntensity: 1 }),
  );
  ring.rotation.x = Math.PI / 2;
  ring.position.set(0.24, 0.172, 0.085);
  grp.add(quiet(ring));
  for (const dx of [-0.024, 0.024]) {
    const eye = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.014, 0.07, 10), toon('#e8ebef'));
    eye.position.set(0.24 + dx, 0.3, 0.1);
    eye.rotation.x = -0.55;
    eye.castShadow = true;
    grp.add(eye);
    addCyl(grp, 0.016, 0.016, 0.014, toon('#f7f8f6'), 0.24 + dx, 0.328, 0.132, 8);
  }
  const knob = addCyl(grp, 0.011, 0.011, 0.016, toon('#c6a15a'), 0.288, 0.24, 0.085, 8);
  knob.rotation.z = Math.PI / 2;
  grp.position.set(x, y, z);
  g.add(grp);
}

function fumeExtractor(g, x, y, z) {
  const grp = new THREE.Group();
  grp.name = 'fume_arm';
  addBox(grp, 0.2, 0.22, 0.16, toon('#2f4f49'), 0, 0.11, 0);
  addBox(grp, 0.14, 0.1, 0.008, toon('#1a2824'), 0, 0.12, 0.082);
  for (let i = 0; i < 5; i++) {
    addBox(grp, 0.11, 0.006, 0.004, toon('#0e1614'), 0, 0.09 + i * 0.018, 0.088);
  }
  const tag = new THREE.Mesh(
    new THREE.BoxGeometry(0.1, 0.036, 0.006),
    labelMat('FUME', '#e7f4ec', '#143028', 256, 96, 58),
  );
  tag.position.set(0, 0.2, 0.084);
  grp.add(tag);
  addCyl(grp, 0.018, 0.018, 0.04, toon('#243430'), -0.02, 0.24, 0.02, 8);
  const seg = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.2, 8), toon('#5e6964'));
  seg.position.set(-0.1, 0.32, 0.06);
  seg.rotation.z = 1.05;
  seg.rotation.x = 0.35;
  seg.castShadow = true;
  grp.add(seg);
  addCyl(grp, 0.016, 0.016, 0.02, toon('#2a3330'), -0.16, 0.36, 0.08, 8);
  const seg2 = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.009, 0.16, 8), toon('#6a736e'));
  seg2.position.set(-0.26, 0.34, 0.1);
  seg2.rotation.z = Math.PI / 2;
  seg2.castShadow = true;
  grp.add(seg2);
  addCyl(grp, 0.04, 0.026, 0.045, toon('#243430'), -0.36, 0.33, 0.12, 12);
  addBox(grp, 0.055, 0.01, 0.03, toon('#0e1412'), -0.36, 0.305, 0.12);
  grp.position.set(x, y, z);
  g.add(grp);
}

function partsDrawers(g, a) {
  const grp = new THREE.Group();
  grp.name = 'parts_drawers';
  const { w, d, h } = a;
  addBox(grp, w, 0.06, d, toon('#2a3136'), 0, 0.03, 0);
  addBox(grp, w, h - 0.06, d - 0.02, toon('#4a545c'), 0, 0.06 + (h - 0.06) / 2, -0.01);
  const labels = [
    ['0402', '0603'],
    ['0805', '1206'],
    ['CAP', 'RES'],
    ['IC', 'LED'],
    ['FUSE', 'CONN'],
    ['SCREW', 'SIM'],
    ['BATT', 'FLUX'],
  ];
  const tabs = ['#e0a84a', '#3d7ea6', '#2f7d55', '#c4512c', '#e0a84a', '#3d7ea6', '#2f7d55'];
  const rows = labels.length;
  const dw = (w - 0.1) / 2;
  const dh = (h - 0.16) / rows;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < 2; c++) {
      const open = r === 3 && c === 0;
      const pull = open ? 0.09 : 0;
      const dx = -w / 2 + 0.05 + dw / 2 + c * (dw + 0.02);
      const dy = 0.1 + dh / 2 + r * dh;
      addBox(grp, dw - 0.016, dh - 0.014, 0.018, toon('#e4e7ea'), dx, dy, d / 2 + pull);
      const plate = new THREE.Mesh(
        new THREE.BoxGeometry(dw * 0.62, dh * 0.42, 0.006),
        labelMat(labels[r][c], tabs[r], '#1a140c', 256, 128, 68),
      );
      plate.position.set(dx, dy, d / 2 + 0.014 + pull);
      grp.add(plate);
      addBox(grp, 0.045, 0.01, 0.01, toon('#8d949c'), dx, dy - dh * 0.28, d / 2 + 0.02 + pull);
    }
  }
  grp.position.set(a.x, 0, a.z);
  g.add(grp);
}

function serviceCounter(g, a) {
  const grp = new THREE.Group();
  grp.name = 'service_counter';
  const { w, d, h } = a;
  addBox(grp, w - 0.12, 0.1, d - 0.12, toon('#2a241e'), 0, 0.05, 0.02);
  addBox(grp, w, h - 0.18, d, toon('#5c3d2e'), 0, 0.1 + (h - 0.18) / 2, 0);
  const pw = (w - 0.28) / 3;
  for (let i = 0; i < 3; i++) {
    const px = -w / 2 + 0.16 + pw / 2 + i * pw;
    addBox(grp, pw - 0.08, h * 0.5, 0.018, toon('#3e291f'), px, h * 0.46, d / 2 + 0.004);
  }
  addBox(grp, w + 0.06, 0.04, d + 0.08, toon('#e6dece'), 0, h - 0.02, 0.02);
  addBox(grp, w + 0.06, 0.025, 0.028, toon('#8d8474'), 0, h + 0.005, d / 2 + 0.05);
  addBox(grp, 0.04, 0.02, d, toon('#c6a15a'), w / 2 + 0.01, h - 0.01, 0);
  grp.position.set(a.x, 0, a.z);
  g.add(grp);
}

function counterDressing(g, a) {
  const y = a.h + 0.01;
  const z = a.z + 0.08;
  addBox(g, 0.28, 0.012, 0.2, toon('#24516e'), a.x - 0.85, y, z);
  addBox(g, 0.12, 0.01, 0.064, toon('#1a1e22'), a.x - 0.9, y + 0.012, z);
  addBox(g, 0.1, 0.004, 0.05, toon('#8fd4ff', { emissive: '#b7e6ff', emissiveIntensity: 0.35 }), a.x - 0.9, y + 0.02, z);
  const tag = new THREE.Mesh(
    new THREE.BoxGeometry(0.07, 0.04, 0.004),
    labelMat('A-14', '#f4efe4', '#8a2e16', 256, 128, 64),
  );
  tag.position.set(a.x - 0.72, y + 0.03, z + 0.04);
  tag.rotation.x = -0.4;
  g.add(tag);

  addBox(g, 0.22, 0.008, 0.16, toon('#f7f1e4'), a.x + 0.55, y + 0.004, a.z - 0.02);
  addBox(g, 0.18, 0.004, 0.006, toon('#2a241c'), a.x + 0.55, y + 0.012, a.z - 0.04);
  addBox(g, 0.14, 0.004, 0.006, toon('#2a241c'), a.x + 0.55, y + 0.012, a.z + 0.0);
  addBox(g, 0.16, 0.004, 0.006, toon('#2a241c'), a.x + 0.55, y + 0.012, a.z + 0.04);
  addCyl(g, 0.008, 0.008, 0.09, toon('#8d949c'), a.x + 0.28, y + 0.05, a.z + 0.02, 8);
  for (const [dx, col] of [[-0.02, '#c4512c'], [0.0, '#e0a84a'], [0.02, '#3d7ea6']]) {
    const slip = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.045, 0.03), toon(col));
    slip.position.set(a.x + 0.28 + dx, y + 0.07, a.z + 0.02);
    slip.rotation.z = dx * 2;
    slip.castShadow = true;
    g.add(slip);
  }
  const board = new THREE.Mesh(
    new THREE.BoxGeometry(0.16, 0.004, 0.1),
    labelMat('DROP-OFF', '#f4efe4', '#1c2430', 384, 192, 58),
  );
  board.position.set(a.x + 0.95, y + 0.02, a.z + 0.02);
  board.rotation.x = -0.55;
  g.add(board);
}

function phoneTray(g, x, y, z) {
  const grp = new THREE.Group();
  grp.name = 'device_tray';
  addBox(grp, 0.38, 0.016, 0.26, toon('#245a82'), 0, 0.008, 0);
  addBox(grp, 0.34, 0.006, 0.22, toon('#16344c'), 0, 0.018, 0);
  addBox(grp, 0.15, 0.008, 0.078, toon('#1a1e22'), -0.08, 0.026, 0.03);
  addBox(grp, 0.125, 0.004, 0.06, toon('#9fd4ff', { emissive: '#b7e4ff', emissiveIntensity: 0.3 }), -0.08, 0.032, 0.03);
  addBox(grp, 0.15, 0.006, 0.078, toon('#d5d8dc'), 0.09, 0.024, -0.04);
  addBox(grp, 0.028, 0.008, 0.028, toon('#2a2e32'), 0.13, 0.03, -0.06);
  addBox(grp, 0.12, 0.004, 0.06, toon('#1f6b3a'), 0.02, 0.026, 0.05);
  for (let i = 0; i < 5; i++) {
    quiet(addBox(grp, 0.014, 0.006, 0.01, toon(i % 2 ? '#161616' : '#c9a227'), -0.02 + i * 0.02, 0.032, 0.05));
  }
  for (let i = 0; i < 6; i++) {
    quiet(addCyl(grp, 0.0045, 0.0045, 0.003, toon('#e4e7ea'), -0.14 + i * 0.018, 0.024, -0.08, 6));
  }
  addBox(grp, 0.075, 0.008, 0.042, toon('#1c1e20'), 0.09, 0.026, 0.06);
  grp.position.set(x, y, z);
  g.add(grp);
}

function solderStation(g, x, y, z) {
  addBox(g, 0.1, 0.045, 0.07, toon('#2a3134'), x, y + 0.022, z);
  addBox(g, 0.06, 0.012, 0.03, toon('#163024', { emissive: '#7dffa0', emissiveIntensity: 0.35 }), x, y + 0.048, z);
  addCyl(g, 0.016, 0.018, 0.02, toon('#3a4044'), x + 0.08, y + 0.01, z, 8);
  const spool = new THREE.Mesh(new THREE.TorusGeometry(0.028, 0.008, 6, 12), toon('#ddd6c8'));
  spool.position.set(x - 0.12, y + 0.03, z);
  spool.rotation.y = 0.5;
  spool.castShadow = true;
  g.add(spool);
  addCyl(g, 0.02, 0.02, 0.012, toon('#b08a3e'), x + 0.08, y + 0.008, z + 0.06, 8);
}

function testBench(g, a) {
  const grp = new THREE.Group();
  grp.name = 'test_bench';
  const { w, d, top } = a;
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      addBox(grp, 0.055, top - 0.04, 0.055, toon('#3e2a22'), sx * (w / 2 - 0.06), (top - 0.04) / 2, sz * (d / 2 - 0.05));
    }
  }
  addBox(grp, w - 0.08, 0.02, d - 0.1, toon('#5a3c2c'), 0, 0.22, 0);
  addBox(grp, w, 0.05, d, toon('#6a4632'), 0, top - 0.025, 0);
  addBox(grp, w - 0.16, 0.008, d - 0.14, toon('#1c4a3c'), 0, top + 0.004, 0.01);
  grp.position.set(a.x, 0, a.z);
  g.add(grp);
}

function oscilloscope(g, x, y, z) {
  const grp = new THREE.Group();
  grp.name = 'scope_screen';
  addBox(grp, 0.34, 0.15, 0.2, toon('#2c3338'), 0, 0.08, 0);
  addBox(grp, 0.2, 0.12, 0.01, toon('#12171b'), -0.02, 0.09, 0.1);
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.17, 0.095), waveMat());
  screen.position.set(-0.02, 0.09, 0.108);
  grp.add(quiet(screen));
  for (let i = 0; i < 3; i++) {
    const k = addCyl(grp, 0.013, 0.013, 0.012, toon(i === 2 ? '#c4512c' : '#d5d8dc'), 0.1, 0.05 + i * 0.035, 0.1, 8);
    k.rotation.x = Math.PI / 2;
  }
  addBox(grp, 0.05, 0.01, 0.03, toon('#1a1e22'), -0.1, 0.005, 0.05);
  addBox(grp, 0.05, 0.01, 0.03, toon('#1a1e22'), 0.1, 0.005, 0.05);
  grp.position.set(x, y, z);
  g.add(grp);
}

function benchSupply(g, x, y, z) {
  const grp = new THREE.Group();
  grp.name = 'bench_supply';
  addBox(grp, 0.22, 0.11, 0.16, toon('#d5d0c4'), 0, 0.055, 0);
  addBox(grp, 0.2, 0.09, 0.008, toon('#2a3136'), 0, 0.06, 0.078);
  const read = new THREE.Mesh(
    new THREE.PlaneGeometry(0.07, 0.032),
    labelMat('5.00 V', '#06281c', '#b6ff8a', 256, 96, 48),
  );
  read.position.set(-0.04, 0.075, 0.084);
  grp.add(quiet(read));
  const k1 = addCyl(grp, 0.014, 0.014, 0.012, toon('#e8e4da'), 0.05, 0.07, 0.08, 10);
  k1.rotation.x = Math.PI / 2;
  addCyl(grp, 0.006, 0.006, 0.01, toon('#c4312c'), -0.02, 0.04, 0.084, 6).rotation.x = Math.PI / 2;
  addCyl(grp, 0.006, 0.006, 0.01, toon('#1a1a1a'), 0.0, 0.04, 0.084, 6).rotation.x = Math.PI / 2;
  grp.position.set(x, y, z);
  g.add(grp);
}

function intakeCart(g, x, z) {
  const grp = new THREE.Group();
  grp.name = 'intake_cart';
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      addBox(grp, 0.03, 0.6, 0.03, toon('#3a3f44'), sx * 0.26, 0.3, sz * 0.16);
    }
  }
  addBox(grp, 0.58, 0.035, 0.4, toon('#5c3d2e'), 0, 0.62, 0);
  addBox(grp, 0.5, 0.02, 0.32, toon('#3a3f44'), 0, 0.24, 0);
  addBox(grp, 0.48, 0.012, 0.32, toon('#24516e'), 0, 0.646, 0);
  addBox(grp, 0.36, 0.01, 0.2, toon('#d5d8dc'), -0.02, 0.656, -0.02);
  for (let r = 0; r < 4; r++) {
    const n = r === 3 ? 5 : 12;
    for (let i = 0; i < n; i++) {
      const wide = r === 3 && i === 2;
      const kw = wide ? 0.07 : 0.02;
      const kx = r === 3 ? -0.1 + i * 0.048 : -0.15 + i * 0.026;
      quiet(addBox(grp, kw, 0.007, 0.014, toon('#23272b'), kx, 0.666, -0.07 + r * 0.026));
    }
  }
  addBox(grp, 0.18, 0.1, 0.012, toon('#1a1e22'), 0.14, 0.72, 0.08);
  addBox(grp, 0.15, 0.08, 0.005, toon('#8fd4ff', { emissive: '#b7e6ff', emissiveIntensity: 0.25 }), 0.14, 0.72, 0.088);
  const tag = new THREE.Mesh(
    new THREE.BoxGeometry(0.07, 0.035, 0.004),
    labelMat('B-07', '#f4efe4', '#1c3a6a', 256, 128, 60),
  );
  tag.position.set(-0.16, 0.68, 0.1);
  tag.rotation.x = -0.6;
  grp.add(tag);
  grp.position.set(x, 0, z);
  g.add(grp);
}

function cubbies(g, x, z0) {
  const grp = new THREE.Group();
  grp.name = 'ready_cubbies';
  const cols = 3;
  const rows = 2;
  const cw = 0.28;
  const ch = 0.26;
  const d = 0.16;
  const wood = toon('#6b4632');
  const totalW = cols * cw;
  const totalH = rows * ch;
  const yBase = 1.18;
  addBox(grp, totalW + 0.05, totalH + 0.05, 0.016, wood, 0, yBase + totalH / 2, -d / 2);
  for (let r = 0; r <= rows; r++) {
    addBox(grp, totalW + 0.05, 0.02, d, wood, 0, yBase + r * ch, 0);
  }
  for (let c = 0; c <= cols; c++) {
    addBox(grp, 0.02, totalH + 0.02, d, wood, -totalW / 2 + c * cw, yBase + totalH / 2, 0);
  }
  const phones = new Set(['0,0', '1,1', '2,0']);
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const cx = -totalW / 2 + cw * (c + 0.5);
      const cy = yBase + ch * (r + 0.5);
      addBox(grp, cw - 0.05, ch - 0.05, 0.01, toon('#f4efe4'), cx, cy, -d / 2 + 0.02);
      if (phones.has(`${c},${r}`)) {
        addBox(grp, 0.09, 0.16, 0.014, toon('#1a1e22'), cx, cy, d / 2 + 0.01);
        addBox(grp, 0.07, 0.12, 0.004, toon('#9fd4ff', { emissive: '#d7f3ff', emissiveIntensity: 0.45 }), cx, cy + 0.004, d / 2 + 0.022);
      }
    }
  }
  const sign = new THREE.Mesh(
    new THREE.BoxGeometry(0.62, 0.1, 0.012),
    labelMat('READY', '#f4efe4', '#1c2430', 384, 96, 64),
  );
  sign.position.set(0, yBase + totalH + 0.09, 0.02);
  grp.add(sign);
  grp.position.set(x, 0, z0);
  grp.rotation.y = Math.PI / 2;
  g.add(grp);
}

function shopWindow(g, layout) {
  const { width: W, height: H } = layout.meta.room;
  const x = -W / 2 + 0.07;
  const z0 = 0.55;
  const z1 = 2.55;
  const y0 = 1.25;
  const y1 = 2.55;
  const glass = addBox(
    g,
    0.02,
    y1 - y0,
    z1 - z0,
    toon('#d5e4ea', { transparent: true, opacity: 0.35, side: THREE.DoubleSide }),
    x,
    (y0 + y1) / 2,
    (z0 + z1) / 2,
  );
  quiet(glass);
  const frame = toon('#3e291f');
  addBox(g, 0.06, 0.05, z1 - z0 + 0.08, frame, x + 0.02, y1, (z0 + z1) / 2);
  addBox(g, 0.06, 0.05, z1 - z0 + 0.08, frame, x + 0.02, y0, (z0 + z1) / 2);
  addBox(g, 0.06, y1 - y0, 0.05, frame, x + 0.02, (y0 + y1) / 2, z0);
  addBox(g, 0.06, y1 - y0, 0.05, frame, x + 0.02, (y0 + y1) / 2, z1);
  addBox(g, 0.04, y1 - y0, 0.03, frame, x + 0.03, (y0 + y1) / 2, (z0 + z1) / 2);
  const word = new THREE.Mesh(
    new THREE.PlaneGeometry(1.15, 0.28),
    labelMat('REPAIR', '#f4efe4', '#1c2430', 512, 128, 78),
  );
  word.position.set(x + 0.04, 2.15, 1.55);
  word.rotation.y = Math.PI / 2;
  g.add(quiet(word));
  const sub = new THREE.Mesh(
    new THREE.PlaneGeometry(1.15, 0.12),
    labelMat('PHONES  ·  BOARDS', '#f4efe4', '#3d4a44', 512, 96, 36),
  );
  sub.position.set(x + 0.04, 1.9, 1.55);
  sub.rotation.y = Math.PI / 2;
  g.add(quiet(sub));
  const open = new THREE.Mesh(
    new THREE.PlaneGeometry(0.42, 0.16),
    labelMat('OPEN', '#f2b13a', '#2a1c08', 256, 128, 64),
  );
  open.position.set(x + 0.05, 1.55, 0.85);
  open.rotation.y = Math.PI / 2;
  g.add(quiet(open));
  addBox(g, 0.08, 0.025, z1 - z0, toon('#e6dece'), x + 0.06, y0 - 0.01, (z0 + z1) / 2);
}

function toolRail(g, x, y, z) {
  addBox(g, 1.15, 0.04, 0.03, toon('#2a241c'), x, y, z);
  const cutter = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.12, 0.02), toon('#c4512c'));
  cutter.position.set(x - 0.28, y - 0.08, z + 0.02);
  cutter.castShadow = true;
  g.add(cutter);
  addBox(g, 0.04, 0.02, 0.02, toon('#1a1e22'), x - 0.28, y - 0.14, z + 0.02);
  const tw = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.14, 0.012), toon('#c5c8cc'));
  tw.position.set(x - 0.08, y - 0.08, z + 0.02);
  tw.rotation.z = 0.15;
  tw.castShadow = true;
  g.add(tw);
  const sp = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.14, 0.012), toon('#e0a84a'));
  sp.position.set(x + 0.12, y - 0.08, z + 0.02);
  sp.rotation.z = -0.2;
  sp.castShadow = true;
  g.add(sp);
  addBox(g, 0.09, 0.035, 0.012, toon('#2f4f49'), x + 0.36, y - 0.04, z + 0.02);
}

function shelfDevices(g, layout) {
  const shelf = layout.instances.find((i) => i.id === 'shelf_ready');
  const [x, y, z] = shelf.position;
  addBox(g, 0.1, 0.16, 0.012, toon('#1a1e22'), x - 0.12, y + 0.22, z + 0.08);
  addBox(g, 0.08, 0.12, 0.004, toon('#8fd4ff', { emissive: '#c5ecff', emissiveIntensity: 0.2 }), x - 0.12, y + 0.23, z + 0.09);
  addBox(g, 0.12, 0.012, 0.08, toon('#2a3136'), x + 0.1, y + 0.16, z + 0.06);
  addBox(g, 0.09, 0.14, 0.012, toon('#c4512c'), x + 0.08, y + 0.48, z + 0.08);
}

function pendantCord(g, layout) {
  const p = layout.instances.find((i) => i.id === 'pendant');
  const y0 = p.position[1] + 0.2;
  const y1 = layout.meta.room.height - 0.09;
  addCyl(g, 0.006, 0.006, y1 - y0, toon('#2a241c'), p.position[0], (y0 + y1) / 2, p.position[2], 6);
}

function foliage(g, x, y, z) {
  addCyl(g, 0.01, 0.012, 0.16, toon('#3d5a32'), x, y + 0.1, z, 6);
  addBox(g, 0.16, 0.1, 0.14, toon('#3f6a40'), x, y + 0.2, z);
  addBox(g, 0.1, 0.08, 0.1, toon('#2f5a34'), x + 0.04, y + 0.26, z);
}

function makeProcedural(layout) {
  const g = new THREE.Group();
  g.name = 'procedural';
  const a = layout.anchors;
  const s = a.solder;
  const top = layout.anchors.benchTop;

  addBox(g, 1.2, 0.008, 0.42, toon('#1f6b45'), s.x - 0.05, top + 0.006, s.z + 0.04);
  stereoScope(g, s.x - 0.36, top, s.z + 0.1);
  fumeExtractor(g, s.x + 0.62, top, s.z - 0.02);
  solderStation(g, s.x + 0.15, top + 0.008, s.z + 0.08);
  phoneTray(g, s.x - 0.05, top + 0.01, s.z + 0.16);
  toolRail(g, s.x, 1.15, s.z - 0.28);

  partsDrawers(g, a.drawers);
  serviceCounter(g, a.counter);
  counterDressing(g, a.counter);
  testBench(g, a.test);
  oscilloscope(g, a.test.x + 0.28, a.test.top + 0.01, a.test.z + 0.02);
  benchSupply(g, a.test.x - 0.32, a.test.top + 0.01, a.test.z - 0.02);
  intakeCart(g, a.cart.x, a.cart.z);
  cubbies(g, -4.55, -0.15);
  shopWindow(g, layout);
  shelfDevices(g, layout);
  pendantCord(g, layout);

  const pot = layout.instances.find((i) => i.id === 'plant_window');
  foliage(g, pot.position[0], pot.position[1] + 0.28, pot.position[2]);

  for (const [x, z, rx, rz] of [
    [s.x, s.z, 0.95, 0.45],
    [a.test.x, a.test.z, 0.8, 0.4],
    [a.drawers.x, a.drawers.z, 0.5, 0.28],
    [a.counter.x, a.counter.z, 1.6, 0.45],
    [a.cart.x, a.cart.z, 0.4, 0.28],
    [-2.05, -2.38, 0.28, 0.28],
    [2.45, -2.28, 0.28, 0.28],
    [-1.9, 2.28, 0.26, 0.26],
    [-0.45, 2.34, 0.26, 0.26],
    [-0.55, 0.62, 0.22, 0.22],
  ]) {
    contact(g, x, z, rx, rz);
  }

  addBox(g, 0.08, 0.1, 0.05, toon('#f4f0e6'), -4.58, 0.4, -2.4);
  addBox(g, 0.02, 0.025, 0.02, toon('#1a1e22'), -4.53, 0.42, -2.42);
  return g;
}

boot({
  makeShell,
  makeProcedural,
  readyText: 'ready — electronics repair · drag orbit · U unlit · T toon',
  onReady(sceneApi) {
    const meter = sceneApi.scene.getObjectByName('meter');
    if (meter) {
      let face = null;
      meter.traverse((obj) => {
        if (obj.isMesh && (obj.name || '').toLowerCase() === 'dark_face') face = obj;
      });
      if (face) {
        face.geometry.computeBoundingBox();
        const bb = face.geometry.boundingBox;
        const sz = bb.getSize(new THREE.Vector3());
        const thin = sz.x <= sz.y && sz.x <= sz.z ? 'x' : sz.y <= sz.z ? 'y' : 'z';
        const lcd = new THREE.Mesh(
          new THREE.PlaneGeometry(sz.x * 0.62, sz.z * 0.2),
          toon('#123c28', { emissive: '#c6ff9a', emissiveIntensity: 1.2, side: THREE.DoubleSide }),
        );
        lcd.rotation.x = Math.PI / 2;
        const outward = thin === 'y' ? bb.max.y + sz.y : thin === 'x' ? bb.max.x + sz.x : bb.max.z + sz.z;
        lcd.position.set(bb.getCenter(new THREE.Vector3()).x, thin === 'y' ? outward : bb.getCenter(new THREE.Vector3()).y, bb.min.z + sz.z * 0.27);
        if (thin === 'x') lcd.position.x = outward;
        if (thin === 'z') lcd.position.z = outward;
        lcd.name = 'meter_readout';
        face.add(lcd);
        const mode = (document.getElementById('mode')?.textContent || 'TOON').toLowerCase();
        applyShading(lcd, mode.includes('unlit') ? 'unlit' : 'toon');
      }
    }
    window.__bounds = (name) => {
      const obj = sceneApi.scene.getObjectByName(name);
      if (!obj) return null;
      const box = new THREE.Box3().setFromObject(obj);
      return {
        min: [box.min.x, box.min.y, box.min.z],
        max: [box.max.x, box.max.y, box.max.z],
      };
    };
  },
});
