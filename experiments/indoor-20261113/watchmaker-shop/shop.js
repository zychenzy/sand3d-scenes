import * as THREE from 'three';
import {
  boot, toon, addBox, addCyl, makeCutawayShell,
  woodGradient, metalGradient, clothGradient, plasterGradient,
} from './scene_lib.js';

const labelCache = new Map();

function canvasTex(draw, w, h, repeat) {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  draw(canvas.getContext('2d'), w, h);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;
  if (repeat) {
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(repeat[0], repeat[1]);
  }
  return tex;
}

function grainTex() {
  return canvasTex((g, w, h) => {
    g.fillStyle = '#c8c8c8';
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 36; i++) {
      g.strokeStyle = i % 4 === 0 ? '#8a8a8a' : '#e4e4e4';
      g.globalAlpha = 0.45;
      g.beginPath();
      const y = (i * 7) % h;
      g.moveTo(0, y);
      g.bezierCurveTo(w * 0.3, y + 3, w * 0.7, y - 2, w, y + 1);
      g.stroke();
    }
    g.globalAlpha = 1;
  }, 128, 128);
}

function feltTex() {
  return canvasTex((g, w, h) => {
    g.fillStyle = '#bdbdbd';
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 80; i++) {
      g.fillStyle = i % 2 ? '#9a9a9a' : '#d8d8d8';
      g.fillRect((i * 37) % w, (i * 17) % h, 3, 2);
    }
  }, 64, 64);
}

function plasterTex() {
  return canvasTex((g, w, h) => {
    g.fillStyle = '#d0d0d0';
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 50; i++) {
      g.fillStyle = i % 2 ? '#c4c4c4' : '#dedede';
      g.fillRect((i * 29) % w, (i * 13) % h, 2, 2);
    }
  }, 64, 64);
}

function plankTex(repeatX, repeatY) {
  return canvasTex((g, w, h) => {
    const colors = ['#e0c088', '#d2b07a', '#c49a62', '#e6c896', '#b88850'];
    const rows = 8;
    const ph = h / rows;
    for (let i = 0; i < rows; i++) {
      g.fillStyle = colors[i % colors.length];
      g.fillRect(0, i * ph, w, ph - 2);
      g.fillStyle = '#6a4528';
      g.fillRect(0, i * ph + ph - 2, w, 2);
      g.strokeStyle = 'rgba(90, 50, 20, 0.35)';
      g.beginPath();
      const y = i * ph + ph * 0.35;
      g.moveTo(0, y);
      g.bezierCurveTo(40, y + 4, 140, y - 3, w, y + 1);
      g.stroke();
    }
    g.fillStyle = 'rgba(70, 40, 18, 0.45)';
    g.fillRect(78, 0, 2, h);
    g.fillRect(168, ph * 4, 2, h);
  }, 256, 256, [repeatX, repeatY]);
}

function labelMat(text, bg = '#f3ead6', fg = '#2a2118') {
  const key = text + bg + fg;
  if (labelCache.has(key)) return labelCache.get(key);
  const map = canvasTex((g, w, h) => {
    g.fillStyle = bg;
    g.fillRect(0, 0, w, h);
    g.strokeStyle = '#8a7048';
    g.strokeRect(4, 4, w - 8, h - 8);
    g.fillStyle = fg;
    g.font = '700 42px sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(text, w / 2, h / 2 + 2);
  }, 256, 96);
  const mat = toon('#ffffff', { map, gradientMap: plasterGradient });
  labelCache.set(key, mat);
  return mat;
}

function dialMat(face = '#f7f1e4', ink = '#1a1814') {
  const key = 'dial' + face + ink;
  if (labelCache.has(key)) return labelCache.get(key);
  const map = canvasTex((g, w, h) => {
    g.fillStyle = face;
    g.fillRect(0, 0, w, h);
    g.strokeStyle = ink;
    g.lineWidth = 6;
    g.beginPath();
    g.arc(w / 2, h / 2, w * 0.42, 0, Math.PI * 2);
    g.stroke();
    g.lineWidth = 4;
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2 - Math.PI / 2;
      const r0 = w * (i % 3 === 0 ? 0.28 : 0.34);
      g.beginPath();
      g.moveTo(w / 2 + Math.cos(a) * r0, h / 2 + Math.sin(a) * r0);
      g.lineTo(w / 2 + Math.cos(a) * w * 0.4, h / 2 + Math.sin(a) * h * 0.4);
      g.stroke();
    }
  }, 128, 128);
  const mat = toon('#ffffff', { map, gradientMap: plasterGradient });
  labelCache.set(key, mat);
  return mat;
}

function signMat() {
  if (labelCache.has('sign')) return labelCache.get('sign');
  const map = canvasTex((g, w, h) => {
    g.fillStyle = '#3a2618';
    g.fillRect(0, 0, w, h);
    g.fillStyle = '#f3e6c8';
    g.font = '700 64px sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText('HORLOGE', w / 2, h * 0.38);
    g.font = '600 32px sans-serif';
    g.fillStyle = '#e0b15a';
    g.fillText('REPAIR  ·  钟表维修', w / 2, h * 0.72);
  }, 512, 160);
  const mat = toon('#ffffff', { map, gradientMap: woodGradient });
  labelCache.set('sign', mat);
  return mat;
}

function traceMat() {
  if (labelCache.has('trace')) return labelCache.get('trace');
  const map = canvasTex((g, w, h) => {
    g.fillStyle = '#102418';
    g.fillRect(0, 0, w, h);
    g.strokeStyle = '#7d8a78';
    g.lineWidth = 1;
    for (let y = 20; y < h; y += 18) {
      g.beginPath();
      g.moveTo(0, y);
      g.lineTo(w, y);
      g.stroke();
    }
    g.strokeStyle = '#9ee68a';
    g.lineWidth = 3;
    g.beginPath();
    for (let x = 0; x < w; x++) {
      const y = h * 0.55 + Math.sin(x * 0.08) * 16 + Math.sin(x * 0.31) * 6;
      if (x === 0) g.moveTo(x, y);
      else g.lineTo(x, y);
    }
    g.stroke();
    g.fillStyle = '#dfffe0';
    g.font = '700 28px sans-serif';
    g.fillText('+6 s/d', 16, 36);
    g.font = '600 18px sans-serif';
    g.fillText('BEAT 0.2 ms', 16, 62);
  }, 256, 128);
  const mat = toon('#ffffff', {
    map,
    gradientMap: plasterGradient,
    emissive: '#9ee68a',
    emissiveIntensity: 0.35,
  });
  labelCache.set('trace', mat);
  return mat;
}

function quiet(mesh, receive = false) {
  mesh.userData.noShadow = true;
  mesh.userData.receiveShadow = receive;
  mesh.castShadow = false;
  return mesh;
}

function makeMaterials(room) {
  const grain = grainTex();
  const felt = feltTex();
  const plaster = plasterTex();
  const { width: W, depth: D } = room;
  const planks = plankTex((W - 0.28) / 1.15, (D - 0.28) / 1.15);
  return {
    walnut: toon('#6a4630', { map: grain, gradientMap: woodGradient }),
    walnutDark: toon('#3c291c', { map: grain, gradientMap: woodGradient }),
    oak: toon('#c9a36c', { map: grain, gradientMap: woodGradient }),
    oakDark: toon('#8d6844', { map: grain, gradientMap: woodGradient }),
    felt: toon('#1e6a44', { map: felt, gradientMap: clothGradient }),
    feltDark: toon('#143828', { map: felt, gradientMap: clothGradient }),
    brass: toon('#e2be72', { map: grain, gradientMap: metalGradient }),
    steel: toon('#d0d7de', { map: grain, gradientMap: metalGradient }),
    blued: toon('#3a4a60', { gradientMap: metalGradient }),
    leather: toon('#6d3a28', { map: felt, gradientMap: clothGradient }),
    plaster: toon('#f6f0e6', { map: plaster, gradientMap: plasterGradient }),
    plasterShade: toon('#e4d8c6', { map: plaster, gradientMap: plasterGradient }),
    ink: toon('#1b1916', { gradientMap: woodGradient }),
    cream: toon('#f4efe4', { gradientMap: plasterGradient }),
    strap: toon('#2a2420', { map: felt, gradientMap: clothGradient }),
    strapTan: toon('#a87848', { map: felt, gradientMap: clothGradient }),
    glass: toon('#d7e6ee', {
      transparent: true, opacity: 0.22, side: THREE.DoubleSide, depthWrite: false, gradientMap: plasterGradient,
    }),
    floor: toon('#ffffff', { map: planks, gradientMap: woodGradient }),
    rug: toon('#6e2e32', { map: felt, gradientMap: clothGradient }),
    rugIn: toon('#8a4038', { map: felt, gradientMap: clothGradient }),
  };
}

function makeShell(layout) {
  const g = makeCutawayShell(layout);
  const { width: W, depth: D, height: H } = layout.meta.room;
  const M = makeMaterials(layout.meta.room);
  const innerB = -D / 2 + 0.07;
  const innerL = -W / 2 + 0.07;

  const floor = new THREE.Mesh(new THREE.PlaneGeometry(W - 0.16, D - 0.16), M.floor);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = 0.006;
  g.add(quiet(floor, true));

  const border = M.walnutDark;
  for (const mesh of [
    addBox(g, W - 0.2, 0.012, 0.08, border, 0, 0.01, innerB + 0.02),
    addBox(g, W - 0.2, 0.012, 0.08, border, 0, 0.01, D / 2 - 0.08),
    addBox(g, 0.08, 0.012, D - 0.2, border, innerL + 0.02, 0.01, 0),
    addBox(g, 0.08, 0.012, D - 0.2, border, W / 2 - 0.1, 0.01, 0.2),
  ]) quiet(mesh, true);

  addBox(g, W - 0.28, 1.02, 0.03, M.walnut, 0, 0.52, innerB + 0.02);
  addBox(g, 0.03, 1.02, D - 0.28, M.walnut, innerL + 0.02, 0.52, 0);
  const panelsX = 7;
  for (let i = 0; i < panelsX; i++) {
    const x = -W / 2 + 0.7 + i * ((W - 1.3) / panelsX);
    addBox(g, 0.035, 0.92, 0.02, M.walnutDark, x, 0.52, innerB + 0.035);
  }
  addBox(g, W - 0.24, 0.06, 0.045, M.oak, 0, 1.06, innerB + 0.03);
  addBox(g, 0.045, 0.06, D - 0.24, M.oak, innerL + 0.03, 1.06, 0);
  addBox(g, W - 0.3, H - 1.2, 0.02, M.plaster, 0, 1.15 + (H - 1.2) / 2, innerB + 0.015);
  addBox(g, 0.02, H - 1.2, D - 0.3, M.plaster, innerL + 0.015, 1.15 + (H - 1.2) / 2, 0);
  addBox(g, W - 0.3, 0.035, 0.03, M.brass, 0, 2.42, innerB + 0.03);
  addBox(g, 0.03, 0.035, D - 0.3, M.brass, innerL + 0.03, 2.42, 0);

  const ao = toon('#2a2118', { transparent: true, opacity: 0.22, depthWrite: false, polygonOffset: true });
  quiet(addBox(g, W - 0.3, 0.08, 0.06, ao, 0, 0.04, innerB + 0.02));
  quiet(addBox(g, 0.06, 0.08, D - 0.3, ao, innerL + 0.02, 0.04, 0));

  addBox(g, W * 0.96, 0.08, D * 0.55, M.plasterShade, -0.05, H - 0.06, -D * 0.18);
  for (const z of [-2.7, -0.9, 1.05]) {
    addBox(g, W - 0.5, 0.1, 0.1, M.walnutDark, -0.05, H - 0.16, z);
  }

  const returnLen = 1.5;
  addBox(g, 0.12, H, returnLen, M.plaster, W / 2 - 0.06, H / 2, -D / 2 + returnLen / 2);
  addBox(g, 0.04, 1.02, returnLen - 0.08, M.walnut, W / 2 - 0.12, 0.52, -D / 2 + returnLen / 2);

  const winZ = 1.15;
  const winY = 1.85;
  const winW = 1.35;
  const winH = 1.05;
  addBox(g, 0.05, winH + 0.08, winW + 0.08, M.walnutDark, innerL + 0.02, winY, winZ);
  const day = toon('#d5e4ee', { emissive: '#f2f7fb', emissiveIntensity: 0.55, gradientMap: plasterGradient });
  quiet(addBox(g, 0.025, (winH - 0.1) / 2 - 0.02, (winW - 0.1) / 2 - 0.02, day, innerL + 0.05, winY + winH * 0.24, winZ - winW * 0.24));
  quiet(addBox(g, 0.025, (winH - 0.1) / 2 - 0.02, (winW - 0.1) / 2 - 0.02, day, innerL + 0.05, winY + winH * 0.24, winZ + winW * 0.24));
  quiet(addBox(g, 0.025, (winH - 0.1) / 2 - 0.02, (winW - 0.1) / 2 - 0.02, day, innerL + 0.05, winY - winH * 0.24, winZ - winW * 0.24));
  quiet(addBox(g, 0.025, (winH - 0.1) / 2 - 0.02, (winW - 0.1) / 2 - 0.02, day, innerL + 0.05, winY - winH * 0.24, winZ + winW * 0.24));
  addBox(g, 0.04, winH - 0.06, 0.045, M.oak, innerL + 0.055, winY, winZ);
  addBox(g, 0.04, 0.045, winW - 0.08, M.oak, innerL + 0.055, winY, winZ);

  const rug = addBox(g, 1.85, 0.015, 1.55, M.rug, -1.9, 0.012, 2.55);
  quiet(rug, true);
  const rugIn = addBox(g, 1.55, 0.008, 1.25, M.rugIn, -1.9, 0.02, 2.55);
  quiet(rugIn, true);
  return g;
}

function drawerStack(g, M, x0, x1, z, d, h, labels) {
  const w = x1 - x0;
  const x = (x0 + x1) / 2;
  const n = labels.length;
  const dh = (h - 0.05) / n;
  addBox(g, w, h, d, M.walnutDark, x, h / 2, z);
  for (let i = 0; i < n; i++) {
    const y = 0.04 + dh * (i + 0.5);
    addBox(g, w - 0.028, dh - 0.014, 0.018, M.oak, x, y, z + d / 2 + 0.004);
    addBox(g, Math.min(0.07, w * 0.28), 0.012, 0.014, M.brass, x, y - dh * 0.18, z + d / 2 + 0.016);
    const plate = new THREE.Mesh(
      new THREE.PlaneGeometry(Math.min(0.18, w * 0.72), Math.min(0.04, dh * 0.34)),
      labelMat(labels[i]),
    );
    plate.position.set(x, y + dh * 0.16, z + d / 2 + 0.018);
    g.add(quiet(plate));
  }
}

function benchTop(g, M, b) {
  const { x, z, w, d, h } = b;
  addBox(g, w, 0.07, d, M.oak, x, h - 0.035, z);
  addBox(g, w * 0.46, 0.012, d * 0.55, M.felt, x - 0.02, h + 0.006, z + 0.04);
  addBox(g, 0.14, 0.018, 0.26, M.oak, x - 0.02, h + 0.016, z + d / 2 - 0.02);
  addBox(g, 0.02, 0.012, 0.1, M.walnutDark, x - 0.05, h + 0.028, z + d / 2 + 0.04);
  addBox(g, 0.02, 0.012, 0.1, M.walnutDark, x + 0.01, h + 0.028, z + d / 2 + 0.04);
}

function toolBoard(g, M, x, y, z, w, h) {
  addBox(g, w + 0.06, h + 0.06, 0.03, M.walnutDark, x, y, z);
  addBox(g, w, h, 0.018, M.oak, x, y, z + 0.02);
  const peg = (px, py, mesh) => {
    mesh.position.set(x + px, y + py, z + 0.055);
    g.add(mesh);
  };
  for (let i = 0; i < 4; i++) {
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.014, 0.07, 8), M.oakDark);
    handle.rotation.z = -0.55 + i * 0.28;
    peg(-w * 0.32 + i * 0.07, 0.1, handle);
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.09, 0.006), M.steel);
    blade.rotation.z = -0.55 + i * 0.28;
    blade.position.set(x - w * 0.32 + i * 0.07, y + 0.02, z + 0.06);
    g.add(blade);
  }
  const tweezersA = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.18, 0.008), M.steel);
  tweezersA.rotation.z = 0.15;
  peg(0.08, -0.04, tweezersA);
  const tweezersB = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.18, 0.008), M.steel);
  tweezersB.rotation.z = -0.15;
  peg(0.12, -0.04, tweezersB);
  const loupe = new THREE.Mesh(new THREE.TorusGeometry(0.04, 0.007, 8, 18), M.brass);
  peg(w * 0.3, 0.08, loupe);
  const lens = new THREE.Mesh(new THREE.CircleGeometry(0.03, 16), toon('#9fd4e0', {
    transparent: true, opacity: 0.7, side: THREE.DoubleSide, depthWrite: false, gradientMap: plasterGradient,
  }));
  lens.position.set(x + w * 0.3, y + 0.08, z + 0.06);
  g.add(quiet(lens));
  addBox(g, 0.016, 0.09, 0.016, M.walnut, x + w * 0.3, y - 0.06, z + 0.055);
}

function loupeStand(g, M, x, y, z) {
  addCyl(g, 0.02, 0.028, 0.012, M.brass, x, y + 0.006, z, 10);
  addCyl(g, 0.008, 0.008, 0.07, M.brass, x, y + 0.04, z, 8);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.032, 0.006, 8, 16), M.brass);
  rim.rotation.x = Math.PI / 2;
  rim.position.set(x, y + 0.09, z);
  g.add(rim);
  const lens = new THREE.Mesh(new THREE.CircleGeometry(0.026, 16), toon('#b9e2ec', {
    transparent: true, opacity: 0.55, side: THREE.DoubleSide, depthWrite: false, gradientMap: plasterGradient,
  }));
  lens.rotation.x = -Math.PI / 2;
  lens.position.set(x, y + 0.09, z);
  g.add(quiet(lens));
}

function driverBlock(g, M, x, y, z) {
  addBox(g, 0.16, 0.035, 0.06, M.walnut, x, y + 0.018, z);
  for (let i = 0; i < 4; i++) {
    addCyl(g, 0.006, 0.006, 0.09, i % 2 ? M.blued : M.steel, x - 0.05 + i * 0.034, y + 0.06, z, 6);
    addCyl(g, 0.01, 0.01, 0.012, M.brass, x - 0.05 + i * 0.034, y + 0.1, z, 6);
  }
}

function partsTray(g, M, x, y, z) {
  addBox(g, 0.22, 0.02, 0.14, M.walnutDark, x, y + 0.01, z);
  addBox(g, 0.2, 0.008, 0.008, M.oak, x, y + 0.02, z);
  addBox(g, 0.008, 0.008, 0.12, M.oak, x, y + 0.02, z);
  const colors = ['#d4b15a', '#c0c6cc', '#8a3030', '#1f4a86', '#d0d4d8'];
  for (let i = 0; i < 5; i++) {
    const sx = x - 0.08 + (i % 3) * 0.06;
    const sz = z - 0.03 + Math.floor(i / 3) * 0.05;
    addCyl(g, 0.012, 0.012, 0.006, toon(colors[i], { gradientMap: metalGradient }), sx, y + 0.026, sz, 8);
  }
}

function movement(g, M, x, y, z) {
  addCyl(g, 0.01, 0.014, 0.04, M.brass, x, y + 0.02, z, 8);
  addCyl(g, 0.038, 0.038, 0.008, M.brass, x, y + 0.048, z, 16);
  addCyl(g, 0.028, 0.028, 0.006, M.steel, x, y + 0.056, z, 16);
  const gear = new THREE.Mesh(new THREE.TorusGeometry(0.02, 0.004, 6, 14), M.blued);
  gear.rotation.x = Math.PI / 2;
  gear.position.set(x + 0.01, y + 0.064, z);
  g.add(gear);
  addCyl(g, 0.006, 0.006, 0.01, M.steel, x - 0.012, y + 0.066, z + 0.006, 8);
}

function wristwatch(g, M, x, y, z, strap, dial, rot) {
  const grp = new THREE.Group();
  addBox(grp, 0.036, 0.012, 0.09, strap === 'tan' ? M.strapTan : M.strap, 0, 0.014, -0.065);
  addBox(grp, 0.036, 0.012, 0.09, strap === 'tan' ? M.strapTan : M.strap, 0, 0.014, 0.065);
  addCyl(grp, 0.046, 0.05, 0.02, strap === 'gold' ? M.brass : M.blued, 0, 0.024, 0, 20);
  const face = new THREE.Mesh(new THREE.CircleGeometry(0.032, 20), dialMat(dial));
  face.rotation.x = -Math.PI / 2;
  face.position.y = 0.036;
  grp.add(face);
  addBox(grp, 0.005, 0.006, 0.022, M.ink, 0.003, 0.04, 0.005);
  addBox(grp, 0.016, 0.006, 0.005, M.ink, -0.004, 0.042, -0.002);
  addCyl(grp, 0.007, 0.007, 0.012, M.brass, 0.055, 0.024, 0, 6);
  grp.position.set(x, y, z);
  grp.rotation.y = rot || 0;
  g.add(grp);
}

function pocketWatch(g, M, x, y, z, rot) {
  const grp = new THREE.Group();
  addCyl(grp, 0.05, 0.05, 0.016, M.brass, 0, 0.012, 0, 20);
  const face = new THREE.Mesh(new THREE.CircleGeometry(0.038, 20), dialMat('#f3efe2'));
  face.rotation.x = -Math.PI / 2;
  face.position.y = 0.022;
  grp.add(face);
  addBox(grp, 0.006, 0.008, 0.028, M.ink, 0, 0.028, 0.006);
  addCyl(grp, 0.008, 0.008, 0.012, M.brass, 0, 0.02, -0.055, 8);
  grp.position.set(x, y, z);
  grp.rotation.y = rot || 0;
  g.add(grp);
}

function glassCase(g, M, x, y, z, w, h, d) {
  const t = 0.012;
  for (const mesh of [
    addBox(g, w, t, d, M.glass, x, y + h / 2, z),
    addBox(g, w, h, t, M.glass, x, y, z + d / 2),
    addBox(g, w, h, t, M.glass, x, y, z - d / 2),
    addBox(g, t, h, d, M.glass, x - w / 2, y, z),
    addBox(g, t, h, d, M.glass, x + w / 2, y, z),
  ]) quiet(mesh);
  addBox(g, w + 0.02, 0.016, 0.016, M.brass, x, y + h / 2, z + d / 2);
  addBox(g, w + 0.02, 0.016, 0.016, M.brass, x, y - h / 2, z + d / 2);
  addBox(g, 0.016, h, 0.016, M.brass, x - w / 2, y, z + d / 2);
  addBox(g, 0.016, h, 0.016, M.brass, x + w / 2, y, z + d / 2);
}

function regulator(g, M, x, z) {
  addBox(g, 0.4, 1.2, 0.09, M.walnut, x, 1.55, z);
  addBox(g, 0.3, 0.96, 0.012, M.cream, x, 1.58, z + 0.05);
  const dial = new THREE.Mesh(new THREE.CircleGeometry(0.13, 24), dialMat());
  dial.position.set(x, 1.88, z + 0.062);
  g.add(dial);
  addBox(g, 0.008, 0.1, 0.008, M.ink, x + 0.01, 1.9, z + 0.07);
  addBox(g, 0.012, 0.42, 0.012, M.brass, x, 1.28, z + 0.06);
  addCyl(g, 0.045, 0.045, 0.018, M.brass, x, 1.05, z + 0.07, 14);
}

function wallClock(g, M, x, y, z, r) {
  addCyl(g, r + 0.02, r + 0.02, 0.04, M.walnut, x, y, z, 20);
  const dial = new THREE.Mesh(new THREE.CircleGeometry(r, 24), dialMat());
  dial.position.set(x, y, z + 0.024);
  g.add(dial);
  addBox(g, 0.006, r * 0.7, 0.006, M.ink, x, y + r * 0.15, z + 0.03);
}

function lathe(g, M, x, y, z) {
  addBox(g, 0.36, 0.03, 0.1, M.steel, x, y + 0.03, z);
  addBox(g, 0.06, 0.08, 0.08, M.blued, x - 0.12, y + 0.07, z);
  addCyl(g, 0.035, 0.035, 0.02, M.brass, x - 0.12, y + 0.08, z + 0.05, 12);
  addBox(g, 0.05, 0.06, 0.06, M.steel, x + 0.12, y + 0.06, z);
  addCyl(g, 0.008, 0.008, 0.16, M.steel, x, y + 0.07, z, 8);
}

function timingMachine(g, M, x, y, z) {
  addBox(g, 0.32, 0.1, 0.2, M.blued, x, y + 0.05, z);
  addBox(g, 0.22, 0.14, 0.03, M.ink, x - 0.02, y + 0.16, z + 0.02);
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.18, 0.1), traceMat());
  screen.position.set(x - 0.02, y + 0.16, z + 0.038);
  g.add(screen);
  addBox(g, 0.06, 0.02, 0.08, M.brass, x + 0.1, y + 0.11, z);
}

function ultrasonic(g, M, x, y, z) {
  addBox(g, 0.24, 0.1, 0.16, M.steel, x, y + 0.05, z);
  addBox(g, 0.18, 0.012, 0.1, toon('#7eb8c8', {
    transparent: true, opacity: 0.65, gradientMap: plasterGradient,
  }), x, y + 0.09, z);
  addBox(g, 0.2, 0.012, 0.12, M.blued, x, y + 0.11, z - 0.02);
}

function contact(g, x, z, rx, rz) {
  const m = new THREE.Mesh(
    new THREE.CircleGeometry(1, 18),
    toon('#1a120c', { transparent: true, opacity: 0.26, depthWrite: false, polygonOffset: true }),
  );
  m.rotation.x = -Math.PI / 2;
  m.position.set(x, 0.012, z);
  m.scale.set(rx, rz, 1);
  g.add(quiet(m));
}

function fillBookcase(g, M, inst) {
  const grp = new THREE.Group();
  const colors = ['#6b3a2a', '#243f36', '#2c3058', '#7a5a28', '#5a2a3a', '#8a6232', '#1e3f55', '#4a3a28'];
  const shelves = [0.08, 0.52, 0.96, 1.38];
  shelves.forEach((y, s) => {
    const count = s === 0 ? 4 : 6;
    for (let i = 0; i < count; i++) {
      if (s === 0 && i > 2) {
        addBox(grp, 0.12, 0.08, 0.1, M.oakDark, -0.22 + i * 0.14, y + 0.04, -0.02);
        const tag = new THREE.Mesh(new THREE.PlaneGeometry(0.09, 0.03), labelMat(['CAL', 'CRYS', 'STEM'][i - 3] || 'PIN'));
        tag.position.set(-0.22 + i * 0.14, y + 0.085, -0.08);
        grp.add(quiet(tag));
        continue;
      }
      const bh = 0.26 + ((i + s) % 3) * 0.04;
      const bw = 0.045 + (i % 2) * 0.012;
      addBox(grp, bw, bh, 0.14, toon(colors[(i + s * 2) % colors.length], { gradientMap: woodGradient }), -0.28 + i * 0.1, y + bh / 2, -0.02);
    }
  });
  grp.position.set(inst.position[0], inst.position[1], inst.position[2]);
  grp.rotation.y = inst.rotationY || 0;
  g.add(grp);
}

function plant(g, M, x, z) {
  addCyl(g, 0.01, 0.012, 0.16, M.oakDark, x, 0.32, z, 6);
  addBox(g, 0.22, 0.12, 0.16, toon('#2f6a3a', { gradientMap: clothGradient }), x, 0.46, z);
  addBox(g, 0.12, 0.1, 0.12, toon('#3d7a48', { gradientMap: clothGradient }), x + 0.06, 0.52, z - 0.04);
}

function makeProcedural(layout) {
  const g = new THREE.Group();
  g.name = 'procedural';
  const M = makeMaterials(layout.meta.room);
  const A = layout.anchors;
  const { height: H } = layout.meta.room;

  for (const b of [A.benchA, A.benchB]) {
    drawerStack(g, M, b.pedL[0], b.pedL[1], b.z, b.d, b.h - 0.07, b === A.benchA
      ? ['MAIN', 'BAL', 'CAP', 'STAFF', 'JEWEL']
      : ['PINION', 'WHEEL', 'CLICK', 'BARREL']);
    drawerStack(g, M, b.pedR[0], b.pedR[1], b.z, b.d, b.h - 0.07, b === A.benchA
      ? ['SPRING', 'HANDS', 'STEM', 'CROWN', 'OIL']
      : ['OIL', 'ROD']);
    benchTop(g, M, b);
    contact(g, b.x, b.z, b.w * 0.46, b.d * 0.46);
  }

  const a = A.benchA;
  loupeStand(g, M, a.x - 0.22, a.h, a.z + 0.06);
  driverBlock(g, M, a.x - 0.38, a.h, a.z - 0.08);
  partsTray(g, M, a.x + 0.32, a.h, a.z - 0.02);
  movement(g, M, a.x - 0.02, a.h, a.z + 0.04);
  wristwatch(g, M, a.x + 0.12, a.h, a.z + 0.12, 'tan', '#f7f3ea', 0.4);
  addBox(g, 0.012, 0.004, 0.16, M.steel, a.x + 0.22, a.h + 0.01, a.z + 0.08);
  addBox(g, 0.01, 0.004, 0.16, M.steel, a.x + 0.24, a.h + 0.012, a.z + 0.08);

  const b = A.benchB;
  timingMachine(g, M, b.x + 0.22, b.h, b.z - 0.02);
  ultrasonic(g, M, b.x - 0.05, b.h, b.z + 0.06);
  addCyl(g, 0.06, 0.07, 0.05, toon('#dfe6ea', { transparent: true, opacity: 0.45, gradientMap: plasterGradient }), b.x - 0.28, b.h + 0.04, b.z + 0.02, 16);
  movement(g, M, b.x - 0.28, b.h, b.z - 0.08);

  const chest = A.chest;
  drawerStack(g, M, chest.x - chest.w / 2, chest.x + chest.w / 2, chest.z, chest.d, chest.h, ['CAL', 'JEWEL', 'SCREW', 'GASKET', 'STAFF', 'PALLET']);
  lathe(g, M, chest.x, chest.h, chest.z);
  contact(g, chest.x, chest.z, chest.w * 0.55, chest.d * 0.55);

  toolBoard(g, M, a.x + 0.15, 1.62, -3.48, 1.15, 0.62);
  const chart = new THREE.Mesh(new THREE.PlaneGeometry(0.46, 0.32), labelMat('RATE  +6 s/d', '#f7f1e2', '#1c3a28'));
  chart.position.set(0.62, 1.72, -3.45);
  g.add(quiet(chart));
  addBox(g, 0.5, 0.36, 0.02, M.walnutDark, 0.62, 1.72, -3.47);

  const sign = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 0.36), signMat());
  sign.position.set(-0.45, 2.52, -3.45);
  g.add(quiet(sign));
  addBox(g, 2.32, 0.42, 0.03, M.walnutDark, -0.45, 2.52, -3.47);

  regulator(g, M, 3.05, -3.46);
  wallClock(g, M, -3.35, 1.85, -3.46, 0.16);
  wallClock(g, M, -0.42, 1.78, -3.46, 0.14);

  const cab = A.cabinet;
  drawerStack(g, M, cab.x - cab.w / 2, cab.x + cab.w / 2, cab.z, cab.d, cab.h, ['CRYSTAL', 'GASKET', 'CROWN', 'HAND', 'TUBE', 'BEZEL', 'CASE']);
  contact(g, cab.x, cab.z, 0.32, 0.24);

  const cart = A.cart;
  addBox(g, cart.w, 0.04, cart.d, M.steel, cart.x, 0.62, cart.z);
  addBox(g, 0.03, 0.6, 0.03, M.steel, cart.x - cart.w / 2 + 0.03, 0.3, cart.z - cart.d / 2 + 0.03);
  addBox(g, 0.03, 0.6, 0.03, M.steel, cart.x + cart.w / 2 - 0.03, 0.3, cart.z - cart.d / 2 + 0.03);
  addBox(g, 0.03, 0.6, 0.03, M.steel, cart.x - cart.w / 2 + 0.03, 0.3, cart.z + cart.d / 2 - 0.03);
  addBox(g, 0.03, 0.6, 0.03, M.steel, cart.x + cart.w / 2 - 0.03, 0.3, cart.z + cart.d / 2 - 0.03);
  addBox(g, cart.w - 0.04, 0.02, cart.d - 0.04, M.felt, cart.x, 0.65, cart.z);
  partsTray(g, M, cart.x, 0.66, cart.z);
  contact(g, cart.x, cart.z, 0.28, 0.22);

  const c = A.counter;
  const x0 = c.x - c.w / 2;
  const x1 = c.x + c.w / 2;
  const baseH = 0.8;
  addBox(g, c.w, baseH, c.d, M.walnut, c.x, baseH / 2, c.z);
  addBox(g, c.w, 0.04, c.d + 0.04, M.oak, c.x, baseH + 0.02, c.z);
  const solidW = x1 - c.solidX;
  addBox(g, solidW, c.h - baseH, c.d, M.walnutDark, (c.solidX + x1) / 2, (baseH + c.h) / 2, c.z);
  const glassW = c.solidX - x0 - 0.08;
  const glassX = x0 + 0.04 + glassW / 2;
  addBox(g, glassW - 0.06, 0.012, c.d - 0.12, M.felt, glassX, baseH + 0.05, c.z);
  glassCase(g, M, glassX, baseH + 0.08, c.z, glassW - 0.08, c.h - baseH - 0.06, c.d - 0.14);
  const dials = ['#f7f3ea', '#1d2430', '#f3efe4', '#f7f1e6', '#102030', '#f6f0e4', '#f4efe2', '#201812'];
  const straps = ['tan', 'dark', 'gold', 'tan', 'dark', 'gold', 'tan', 'dark'];
  for (let i = 0; i < 8; i++) {
    const col = i % 4;
    const row = Math.floor(i / 4);
    wristwatch(
      g, M,
      glassX - glassW * 0.32 + col * (glassW * 0.2),
      baseH + 0.06,
      c.z - 0.1 + row * 0.18,
      straps[i],
      dials[i],
      0.2 * i,
    );
  }
  pocketWatch(g, M, glassX + glassW * 0.28, baseH + 0.06, c.z + 0.02, 0.5);
  addBox(g, 0.12, 0.008, 0.08, M.cream, c.x + 0.15, c.h + 0.01, c.z + 0.12);
  wristwatch(g, M, c.x + 0.15, c.h, c.z + 0.18, 'tan', '#f7f3ea', 1.2);
  const tag = new THREE.Mesh(new THREE.PlaneGeometry(0.06, 0.04), labelMat('INTAKE', '#f7f1df', '#6a3030'));
  tag.rotation.x = -Math.PI / 2;
  tag.position.set(c.x + 0.22, c.h + 0.02, c.z + 0.22);
  g.add(quiet(tag));
  contact(g, c.x, c.z, c.w * 0.48, c.d * 0.48);

  const byId = Object.fromEntries(layout.instances.map((inst) => [inst.id, inst]));
  fillBookcase(g, M, byId.parts_case);
  addBox(g, 0.44, 0.045, 0.86, M.walnutDark, byId.parts_case.position[0], 0.022, byId.parts_case.position[2]);
  const v = byId.vitrine.position;
  const vTop = layout.assets.museum_vitrine.targetHeight;
  addBox(g, 0.36, 0.012, 0.24, M.felt, v[0], vTop + 0.008, v[2]);
  wristwatch(g, M, v[0] - 0.08, vTop, v[2] - 0.02, 'gold', '#f7f3ea', 0.3);
  pocketWatch(g, M, v[0] + 0.08, vTop, v[2] + 0.02, 0.6);

  const pot = byId.pot.position;
  plant(g, M, pot[0], pot[2]);

  for (const inst of layout.instances) {
    if (inst.kind !== 'pendant_lamp') continue;
    const y0 = inst.position[1] + layout.assets.pendant_lamp.targetHeight;
    const len = H - y0;
    addCyl(g, 0.006, 0.006, len, M.ink, inst.position[0], y0 + len / 2, inst.position[2], 6);
  }

  for (const inst of layout.instances) {
    if (inst.position[1] > 0.2 && inst.kind !== 'museum_vitrine') continue;
    const foot = {
      bar_stool: [0.22, 0.22],
      simple_chair: [0.24, 0.26],
      square_table: [0.4, 0.4],
      display_bookcase: [0.42, 0.22],
      wall_shelf: [0.32, 0.16],
      museum_bench: [0.24, 0.62],
      museum_vitrine: [0.4, 0.4],
      flowerpot: [0.16, 0.16],
    }[inst.kind];
    if (!foot) continue;
    contact(g, inst.position[0], inst.position[2], foot[0], foot[1]);
  }

  addBox(g, 0.28, 0.02, 0.2, M.oakDark, A.table.x + 0.12, 0.735, A.table.z - 0.08);
  addBox(g, 0.16, 0.008, 0.22, M.cream, A.table.x - 0.12, 0.728, A.table.z + 0.06);
  return g;
}

boot({
  makeShell,
  makeProcedural,
  readyText: 'ready — orbit · T toon · U unlit',
});
