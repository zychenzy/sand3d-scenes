import * as THREE from 'three';
import { boot, toon, addBox, addCyl } from './scene_lib.js';

const BOOKS = ['#6e2e2a', '#1e3a5f', '#3e5c40', '#8a6232', '#4a3058', '#2c4a62', '#7a4a28', '#243028', '#a34b32', '#5c4032', '#1f4a4a', '#6a3a48'];

function srgbTex(canvas) {
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

function ceilingY(profile, x) {
  let best = null;
  for (let i = 0; i < profile.length - 1; i++) {
    const [x0, y0] = profile[i];
    const [x1, y1] = profile[i + 1];
    const minx = Math.min(x0, x1);
    const maxx = Math.max(x0, x1);
    if (x < minx - 1e-3 || x > maxx + 1e-3) continue;
    const t = Math.abs(x1 - x0) < 1e-4 ? 0 : (x - x0) / (x1 - x0);
    const y = y0 + (y1 - y0) * t;
    if (best == null || y > best) best = y;
  }
  return best ?? profile[profile.length - 1][1];
}

function profileXAtY(profile, y) {
  for (let i = 0; i < profile.length - 1; i++) {
    const [x0, y0] = profile[i];
    const [x1, y1] = profile[i + 1];
    const lo = Math.min(y0, y1);
    const hi = Math.max(y0, y1);
    if (y < lo || y > hi) continue;
    const t = (y - y0) / ((y1 - y0) || 1);
    return x0 + (x1 - x0) * t;
  }
  return profile[0][0];
}

function segFrame(profile, i) {
  const [x0, y0] = profile[i];
  const [x1, y1] = profile[i + 1];
  const dx = x1 - x0;
  const dy = y1 - y0;
  const len = Math.hypot(dx, dy) || 1e-4;
  return {
    len,
    ang: Math.atan2(dy, dx),
    nx: dy / len,
    ny: -dx / len,
    mx: (x0 + x1) / 2,
    my: (y0 + y1) / 2,
  };
}

function addAlong(g, profile, i, z, alongZ, mat, opts = {}) {
  const s = segFrame(profile, i);
  const thick = opts.thick ?? 0.04;
  const proud = opts.proud ?? 0;
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(s.len + (opts.overlap ?? 0.02), thick, alongZ),
    mat
  );
  mesh.position.set(s.mx + s.nx * proud, s.my + s.ny * proud, z);
  mesh.rotation.z = s.ang;
  mesh.castShadow = opts.cast !== false;
  mesh.receiveShadow = opts.receive !== false;
  if (opts.noShadow) mesh.userData.noShadow = true;
  g.add(mesh);
  return mesh;
}

function makePlankMap() {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 512;
  const g = c.getContext('2d');
  const plank = 32;
  for (let x = 0; x < 256; x += plank) {
    const alt = (x / plank) % 2 === 0;
    g.fillStyle = alt ? '#c9a67c' : '#b89268';
    g.fillRect(x, 0, plank - 2, 512);
    g.fillStyle = '#7d5a3c';
    g.fillRect(x + plank - 2, 0, 2, 512);
    g.strokeStyle = 'rgba(90, 55, 30, 0.18)';
    g.lineWidth = 1;
    for (let k = 0; k < 8; k++) {
      g.beginPath();
      const y = (k * 67 + (x % 17)) % 512;
      g.moveTo(x + 3, y);
      g.lineTo(x + plank - 6, y + 18);
      g.stroke();
    }
  }
  const tex = srgbTex(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(8, 3);
  return tex;
}

function makeSeaMap() {
  const c = document.createElement('canvas');
  c.width = 8;
  c.height = 256;
  const g = c.getContext('2d');
  const grd = g.createLinearGradient(0, 0, 0, 256);
  grd.addColorStop(0, '#d5e4ee');
  grd.addColorStop(0.38, '#e7eef3');
  grd.addColorStop(0.46, '#f3ead6');
  grd.addColorStop(0.52, '#7eafc2');
  grd.addColorStop(1, '#2c6a84');
  g.fillStyle = grd;
  g.fillRect(0, 0, 8, 256);
  g.fillStyle = 'rgba(255,255,255,0.35)';
  g.fillRect(0, 118, 8, 2);
  return srgbTex(c);
}

function makeChartMap() {
  const c = document.createElement('canvas');
  c.width = 1024;
  c.height = 720;
  const g = c.getContext('2d');
  g.fillStyle = '#efe2c6';
  g.fillRect(0, 0, 1024, 720);
  g.strokeStyle = '#c4b08a';
  g.lineWidth = 18;
  g.strokeRect(16, 16, 992, 688);
  g.strokeStyle = 'rgba(70, 110, 130, 0.35)';
  g.lineWidth = 1;
  for (let x = 80; x < 980; x += 64) {
    g.beginPath();
    g.moveTo(x, 48);
    g.lineTo(x, 640);
    g.stroke();
  }
  for (let y = 64; y < 660; y += 52) {
    g.beginPath();
    g.moveTo(48, y);
    g.lineTo(980, y);
    g.stroke();
  }
  g.fillStyle = '#7f9a78';
  g.beginPath();
  g.moveTo(80, 80);
  g.lineTo(220, 60);
  g.lineTo(340, 140);
  g.lineTo(300, 260);
  g.lineTo(180, 320);
  g.lineTo(90, 240);
  g.closePath();
  g.fill();
  g.fillStyle = '#6d8b68';
  g.beginPath();
  g.moveTo(420, 180);
  g.bezierCurveTo(560, 80, 760, 120, 820, 240);
  g.lineTo(780, 420);
  g.bezierCurveTo(640, 480, 500, 400, 430, 300);
  g.closePath();
  g.fill();
  g.fillStyle = '#8aa67a';
  g.beginPath();
  g.ellipse(250, 460, 70, 36, 0.4, 0, Math.PI * 2);
  g.fill();
  g.beginPath();
  g.ellipse(620, 520, 48, 28, -0.3, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = 'rgba(40, 70, 90, 0.85)';
  g.font = '600 42px Georgia, Times, serif';
  g.fillText('WESTERN APPROACH', 70, 80);
  g.font = '500 22px Georgia, Times, serif';
  g.fillText('SALON DECK  ·  ORIGINAL SKETCH CHART', 70, 112);
  const soundings = [[160, 200, '12'], [480, 160, '28'], [700, 300, '9'], [360, 400, '16'], [800, 500, '34'], [140, 520, '7']];
  g.font = '16px sans-serif';
  g.fillStyle = '#355060';
  for (const [x, y, t] of soundings) g.fillText(t, x, y);
  // compass rose
  const cx = 860;
  const cy = 560;
  g.save();
  g.translate(cx, cy);
  g.strokeStyle = '#8a6232';
  g.lineWidth = 3;
  g.beginPath();
  g.arc(0, 0, 54, 0, Math.PI * 2);
  g.stroke();
  g.fillStyle = '#8a3a32';
  g.beginPath();
  g.moveTo(0, -48);
  g.lineTo(10, 0);
  g.lineTo(0, 48);
  g.lineTo(-10, 0);
  g.closePath();
  g.fill();
  g.fillStyle = '#2c3a4a';
  g.beginPath();
  g.moveTo(-48, 0);
  g.lineTo(0, 8);
  g.lineTo(48, 0);
  g.lineTo(0, -8);
  g.closePath();
  g.fill();
  g.fillStyle = '#2c3a4a';
  g.font = '700 18px sans-serif';
  g.fillText('N', -6, -60);
  g.restore();
  g.strokeStyle = '#5c4030';
  g.lineWidth = 3;
  g.beginPath();
  g.moveTo(80, 660);
  g.lineTo(280, 660);
  g.stroke();
  g.fillStyle = '#3a2a22';
  g.font = '16px sans-serif';
  g.fillText('0        2 cables', 80, 684);
  return srgbTex(c);
}

function makeCompassMap() {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 512;
  const g = c.getContext('2d');
  g.clearRect(0, 0, 512, 512);
  g.translate(256, 256);
  g.fillStyle = '#d7b48a';
  g.beginPath();
  g.arc(0, 0, 240, 0, Math.PI * 2);
  g.fill();
  g.strokeStyle = '#5c3d28';
  g.lineWidth = 10;
  g.stroke();
  g.strokeStyle = '#8a6232';
  g.lineWidth = 4;
  g.beginPath();
  g.arc(0, 0, 180, 0, Math.PI * 2);
  g.stroke();
  for (let i = 0; i < 8; i++) {
    g.rotate(Math.PI / 4);
    g.fillStyle = i % 2 === 0 ? '#8a3a32' : '#2c3e50';
    g.beginPath();
    g.moveTo(0, -150);
    g.lineTo(18, 0);
    g.lineTo(0, 150);
    g.lineTo(-18, 0);
    g.closePath();
    g.fill();
  }
  g.fillStyle = '#efe6d4';
  g.beginPath();
  g.arc(0, 0, 28, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = '#3a2a22';
  g.font = '700 42px sans-serif';
  g.fillText('N', -14, -188);
  const tex = srgbTex(c);
  tex.center.set(0.5, 0.5);
  return tex;
}

function makeRugMap(wPx, hPx) {
  const c = document.createElement('canvas');
  c.width = wPx;
  c.height = hPx;
  const g = c.getContext('2d');
  g.fillStyle = '#1a3358';
  g.fillRect(0, 0, wPx, hPx);
  g.strokeStyle = '#c4a36a';
  g.lineWidth = 10;
  g.strokeRect(16, 16, wPx - 32, hPx - 32);
  g.lineWidth = 3;
  g.strokeRect(28, 28, wPx - 56, hPx - 56);
  g.strokeStyle = 'rgba(196, 163, 106, 0.35)';
  g.beginPath();
  g.moveTo(48, hPx / 2);
  g.lineTo(wPx - 48, hPx / 2);
  g.stroke();
  return srgbTex(c);
}

function flag(mesh, opts = {}) {
  if (opts.noShadow) mesh.userData.noShadow = true;
  if (opts.noShade) mesh.userData.noShade = true;
  return mesh;
}

function makeShell(layout) {
  const g = new THREE.Group();
  g.name = 'shell';
  const shell = layout.shell;
  const hull = layout.meta.hull;
  const profile = hull.profile;
  const ribZ = hull.ribZ;
  const aftZ = hull.aftZ;
  const foreZ = hull.foreZ;
  const cutX = hull.cutX;

  const ivory = toon(shell.panelColor);
  const bandMat = toon(shell.panelColor, { side: THREE.DoubleSide });
  const wallMat = toon(shell.panelColor, { side: THREE.DoubleSide });
  const ivoryD = toon(shell.panelDark);
  const rib = toon(shell.ribColor);
  const teak = toon(shell.teak);
  const ceil = toon(shell.ceilingColor);
  const white = toon(shell.hullWhite);
  const boot = toon(shell.boot);
  const glassMat = toon(shell.glass, { transparent: true, opacity: 0.38, side: THREE.DoubleSide, depthWrite: false });
  const brass = toon(shell.brass);
  const dark = toon('#1a242c');

  const floorW = cutX - hull.floorX0;
  const floorD = foreZ - aftZ;
  const floor = new THREE.Mesh(
    new THREE.BoxGeometry(floorW, 0.08, floorD),
    toon(shell.floorColor, { map: makePlankMap() })
  );
  floor.position.set((cutX + hull.floorX0) / 2, -0.04, (foreZ + aftZ) / 2);
  floor.receiveShadow = true;
  g.add(floor);

  // End bulkheads follow the rib curve so the cutaway reads as a hull section.
  addEndWall(g, profile, aftZ, 0.12, wallMat, cutX, false);
  addEndWall(g, profile, foreZ, 0.12, wallMat, hull.foreCutX, true);

  addBox(g, cutX - hull.floorX0 - 0.4, 0.1, 0.08, teak, (hull.floorX0 + cutX) / 2 - 0.2, 0.05, aftZ + 0.08);
  addBox(g, hull.foreCutX - hull.floorX0 - 0.3, 0.1, 0.08, teak, (hull.floorX0 + hull.foreCutX) / 2, 0.05, foreZ - 0.08);

  // Timber ribs, inner lining, outer plate.
  for (const z of ribZ) {
    for (let i = 0; i < profile.length - 1; i++) {
      addAlong(g, profile, i, z, 0.085, rib, { thick: 0.09, proud: 0.055, overlap: 0.03 });
    }
  }
  const ceilAlt = toon('#c9a67a');
  const seaMat = toon('#9ec4d4', { map: makeSeaMap(), side: THREE.DoubleSide });
  const bays = [[aftZ + 0.04, ribZ[0] - 0.04, false]];
  for (let b = 0; b < ribZ.length - 1; b++) bays.push([ribZ[b] + 0.04, ribZ[b + 1] - 0.04, true]);
  bays.push([ribZ[ribZ.length - 1] + 0.04, foreZ - 0.04, false]);
  for (const [z0, z1, openPort] of bays) {
    const span = Math.max(0.08, z1 - z0);
    const zc = (z0 + z1) / 2;
    for (let i = 0; i < profile.length - 1; i++) {
      if (openPort && i === hull.portholeSegment) {
        const xBand = profileXAtY(profile, hull.portholeY);
        addPortholePlate(g, z0, z1, 0.96, 1.7, zc, hull.portholeY, hull.portholeR * 0.9, xBand + 0.02, bandMat);
        continue;
      }
      const strips = i >= 4 ? 3 : 1;
      const gap = strips > 1 ? 0.012 : 0;
      const stripW = (span - gap * (strips - 1)) / strips;
      for (let s = 0; s < strips; s++) {
        const zs = z0 + stripW / 2 + s * (stripW + gap);
        const mat = i < 2 ? ivory : (i < 4 ? ivoryD : (s % 2 ? ceilAlt : ceil));
        const proud = i >= 4 ? -0.01 : -0.015;
        addAlong(g, profile, i, zs, stripW, mat, { thick: 0.04, proud, overlap: 0.03 });
      }
      if (i < 2) {
        addAlong(g, profile, i, zc, span, i === 0 ? boot : white, {
          thick: 0.03,
          proud: -0.16,
          overlap: 0.02,
          cast: false,
        });
      }
    }
    if (openPort) addPorthole(g, hull, zc, brass, glassMat, seaMat, teak);
  }

  // Deck edge on the cutaway so the sole has thickness.
  addBox(g, 0.1, 0.14, floorD, teak, cutX - 0.02, 0.02, (foreZ + aftZ) / 2);
  addBox(g, 0.08, 0.1, floorD + 0.2, boot, hull.floorX0 - 0.02, -0.02, (foreZ + aftZ) / 2);

  return g;
}

function addEndWall(g, profile, z, thick, mat, xStop, innerIsNegativeZ) {
  const shape = new THREE.Shape();
  const use = [];
  for (const p of profile) {
    if (p[0] > xStop && use.length > 2) break;
    use.push(p);
  }
  if (use.length < 2) return;
  shape.moveTo(use[0][0], 0);
  for (const [x, y] of use) shape.lineTo(Math.min(x, xStop), Math.max(y, 0));
  const endX = Math.min(use[use.length - 1][0], xStop);
  shape.lineTo(endX, 0);
  shape.closePath();
  const geo = new THREE.ExtrudeGeometry(shape, { depth: thick, bevelEnabled: false, curveSegments: 1 });
  geo.translate(0, 0, innerIsNegativeZ ? z - thick : z);
  geo.computeVertexNormals();
  const mesh = new THREE.Mesh(geo, mat);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  g.add(mesh);
}

function addPortholePlate(g, z0, z1, y0, y1, zc, yc, holeR, xFace, mat) {
  const shape = new THREE.Shape();
  shape.moveTo(z0, y0);
  shape.lineTo(z1, y0);
  shape.lineTo(z1, y1);
  shape.lineTo(z0, y1);
  shape.closePath();
  const hole = new THREE.Path();
  hole.absarc(zc, yc, holeR, 0, Math.PI * 2, true);
  shape.holes.push(hole);
  const geo = new THREE.ExtrudeGeometry(shape, { depth: 0.05, bevelEnabled: false });
  // Shape lives in XY as (z, y). rotateY(-90) maps that X to world Z and extrusion to -X.
  geo.rotateY(-Math.PI / 2);
  geo.translate(xFace, 0, 0);
  const mesh = new THREE.Mesh(geo, mat);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  g.add(mesh);
  return mesh;
}

function addPorthole(g, hull, z, brass, glassMat, seaMat, teak) {
  const y = hull.portholeY;
  const r = hull.portholeR;
  const x = profileXAtY(hull.profile, y);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(r + 0.015, 0.028, 8, 28), brass);
  ring.position.set(x + 0.045, y, z);
  ring.rotation.y = Math.PI / 2;
  ring.castShadow = true;
  g.add(ring);
  const glass = new THREE.Mesh(new THREE.CircleGeometry(r, 28), glassMat);
  glass.position.set(x + 0.03, y, z);
  glass.rotation.y = Math.PI / 2;
  flag(glass, { noShadow: true });
  g.add(glass);
  const sea = new THREE.Mesh(new THREE.CircleGeometry(r * 0.82, 24), seaMat);
  sea.position.set(x - 0.22, y, z);
  sea.rotation.y = Math.PI / 2;
  flag(sea, { noShadow: true });
  g.add(sea);
  const tunnel = new THREE.Mesh(
    new THREE.CylinderGeometry(r - 0.01, r - 0.01, 0.22, 20, 1, true),
    toon('#1a242c', { side: THREE.DoubleSide })
  );
  tunnel.rotation.z = Math.PI / 2;
  tunnel.position.set(x - 0.08, y, z);
  flag(tunnel, { noShadow: true });
  g.add(tunnel);
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * Math.PI * 2;
    const dog = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.03, 8), brass);
    dog.rotation.z = Math.PI / 2;
    dog.position.set(x + 0.05, y + Math.sin(a) * (r + 0.012), z + Math.cos(a) * (r + 0.012));
    g.add(dog);
  }
  // teak sill just under the glass, proud of the lining
  addBox(g, 0.16, 0.045, 0.7, teak, x + 0.12, y - r - 0.04, z);
}

function addSettee(g, spec, mats, hull) {
  const { z0, z1 } = spec;
  const xBack = hull.backOuterX;
  const front = hull.frontX;
  const depth = front - xBack;
  const seatY = hull.seatY;
  const zc = (z0 + z1) / 2;
  const len = z1 - z0;
  // plinth to the sole
  addBox(g, depth + 0.04, 0.12, len, mats.deep, xBack + depth / 2 + 0.01, 0.06, zc);
  addBox(g, depth, 0.28, len - 0.04, mats.teak, xBack + depth / 2 + 0.02, 0.26, zc);
  const n = Math.max(2, Math.round((len - 0.16) / 0.62));
  const gap = 0.02;
  const seg = (len - 0.12 - gap * (n - 1)) / n;
  for (let i = 0; i < n; i++) {
    const z = z0 + 0.06 + seg / 2 + i * (seg + gap);
    const cushion = i % 2 ? mats.cushionAlt : mats.cushion;
    addBox(g, depth - 0.08, 0.08, seg, cushion, xBack + depth / 2 + 0.02, seatY, z);
    addBox(g, 0.08, 0.46, seg, cushion, xBack + 0.08, 0.7, z);
    addBox(g, 0.012, 0.5, 0.012, mats.brassDark, xBack + 0.05, 0.72, z - seg / 2);
  }
  addBox(g, 0.1, 0.62, 0.08, mats.teak, xBack + 0.08, 0.5, z0);
  addBox(g, 0.1, 0.62, 0.08, mats.teak, xBack + 0.08, 0.5, z1);
  const rail = addCyl(g, 0.014, 0.014, len - 0.04, mats.brass, xBack + 0.1, hull.backTopY + 0.02, zc, 10);
  rail.rotation.x = Math.PI / 2;
  // bolsters
  const bol = addCyl(g, 0.09, 0.09, depth - 0.12, mats.cushionAlt, xBack + depth * 0.55, seatY + 0.08, z0 + 0.16, 12);
  bol.rotation.z = Math.PI / 2;
  const bol2 = addCyl(g, 0.09, 0.09, depth - 0.12, mats.cushionAlt, xBack + depth * 0.55, seatY + 0.08, z1 - 0.16, 12);
  bol2.rotation.z = Math.PI / 2;
}

function addCaseBooks(g, x, z) {
  // Case opens toward +Z (into the room) at yaw π. Shelves are inset from the front.
  const shelves = [0.32, 0.74, 1.16, 1.52];
  for (let s = 0; s < shelves.length; s++) {
    addBooks(g, x - 0.3, x + 0.3, shelves[s], z + 0.12, BOOKS, 8);
  }
}

function addBooks(g, x0, x1, y, z, matList, count) {
  const span = x1 - x0;
  for (let i = 0; i < count; i++) {
    const bw = 0.028 + (i % 4) * 0.007;
    const bh = 0.16 + ((i * 5) % 4) * 0.03;
    const t = count === 1 ? 0.5 : i / (count - 1);
    const x = x0 + t * span;
    const m = new THREE.Mesh(new THREE.BoxGeometry(bw, bh, 0.18), toon(matList[(i * 3) % matList.length]));
    m.position.set(x, y + bh / 2, z);
    m.rotation.y = ((i % 5) - 2) * 0.02;
    m.castShadow = true;
    m.receiveShadow = true;
    g.add(m);
  }
}

function addChart(g, hull, mats) {
  const c = hull.chart;
  const tex = makeChartMap();
  const paper = new THREE.Mesh(new THREE.PlaneGeometry(c.w, c.h), toon('#efe2c6', { map: tex }));
  paper.position.set(c.x, c.y, c.z);
  g.add(paper);
  const ft = 0.045;
  addBox(g, c.w + 0.1, ft, 0.04, mats.teak, c.x, c.y + c.h / 2 + ft / 2, c.z - 0.01);
  addBox(g, c.w + 0.1, ft, 0.04, mats.teak, c.x, c.y - c.h / 2 - ft / 2, c.z - 0.01);
  addBox(g, ft, c.h + 0.08, 0.04, mats.teak, c.x - c.w / 2 - ft / 2, c.y, c.z - 0.01);
  addBox(g, ft, c.h + 0.08, 0.04, mats.teak, c.x + c.w / 2 + ft / 2, c.y, c.z - 0.01);
  // brass picture light
  const ly = c.y + c.h / 2 + 0.16;
  const bar = addCyl(g, 0.02, 0.02, c.w * 0.72, mats.brass, c.x, ly, c.z + 0.06, 12);
  bar.rotation.z = Math.PI / 2;
  const glow = addBox(g, c.w * 0.62, 0.02, 0.03, mats.glow, c.x, ly - 0.035, c.z + 0.08);
  glow.userData.keepGlow = true;
  addBox(g, 0.03, 0.08, 0.03, mats.brass, c.x - c.w * 0.28, ly + 0.02, c.z + 0.02);
  addBox(g, 0.03, 0.08, 0.03, mats.brass, c.x + c.w * 0.28, ly + 0.02, c.z + 0.02);
}

function addChartChest(g, hull, mats) {
  const c = hull.chest;
  addBox(g, c.w, c.h, c.d, mats.teak, c.x, c.h / 2, c.z);
  addBox(g, c.w + 0.04, 0.05, c.d + 0.04, mats.deep, c.x, c.h - 0.02, c.z + 0.01);
  addBox(g, c.w * 0.42, c.h * 0.62, 0.02, mats.ivory, c.x - c.w * 0.24, c.h * 0.42, c.z + c.d / 2);
  addBox(g, c.w * 0.42, c.h * 0.62, 0.02, mats.ivory, c.x + c.w * 0.24, c.h * 0.42, c.z + c.d / 2);
  addCyl(g, 0.012, 0.012, 0.04, mats.brass, c.x - 0.08, c.h * 0.42, c.z + c.d / 2 + 0.02, 8);
  addCyl(g, 0.012, 0.012, 0.04, mats.brass, c.x + 0.08, c.h * 0.42, c.z + c.d / 2 + 0.02, 8);
  addBox(g, c.w, 0.06, c.d + 0.02, mats.deep, c.x, 0.03, c.z);
  addBooks(g, c.x - c.w * 0.42, c.x + c.w * 0.36, c.h, c.z + 0.02, BOOKS, 13);
  // two flat folios
  const folio = addBox(g, 0.28, 0.025, 0.2, toon('#6e2e2a'), c.x + c.w * 0.28, c.h + 0.02, c.z + 0.06);
  folio.rotation.y = 0.15;
  addBox(g, 0.22, 0.02, 0.16, toon('#1e3a5f'), c.x + c.w * 0.28, c.h + 0.045, c.z + 0.02);
  const roll = addCyl(g, 0.035, 0.035, 0.48, toon('#efe2c6'), c.x - c.w * 0.28, c.h + 0.05, c.z + 0.08, 12);
  roll.rotation.z = Math.PI / 2;
}

function addBarometer(g, x, y, z, mats) {
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.018, 8, 24), mats.brass);
  ring.position.set(x, y, z);
  g.add(ring);
  const face = new THREE.Mesh(new THREE.CircleGeometry(0.11, 24), toon('#f4efe2'));
  face.position.set(x, y, z + 0.01);
  g.add(face);
  addBox(g, 0.008, 0.09, 0.008, toon('#8a3a32'), x, y + 0.02, z + 0.02);
  addBox(g, 0.05, 0.012, 0.012, toon('#2c3e50'), x + 0.02, y - 0.01, z + 0.02);
}

function addLifeRing(g, x, y, z, yaw, mats) {
  const grp = new THREE.Group();
  for (let i = 0; i < 4; i++) {
    const geo = new THREE.TorusGeometry(0.26, 0.04, 8, 14, Math.PI / 2);
    const mesh = new THREE.Mesh(geo, i % 2 ? toon('#f4f1ea') : toon('#c4372f'));
    mesh.rotation.z = i * Math.PI / 2;
    grp.add(mesh);
  }
  grp.rotation.y = yaw;
  grp.position.set(x, y, z);
  g.add(grp);
}

function addBell(g, x, y, z, mats, axis) {
  const pts = [];
  for (let i = 0; i <= 10; i++) {
    const t = i / 10;
    const r = 0.02 + t * t * 0.07;
    pts.push(new THREE.Vector2(r, (1 - t) * 0.16));
  }
  const bell = new THREE.Mesh(new THREE.LatheGeometry(pts, 16), mats.brass);
  const clapper = new THREE.Mesh(new THREE.SphereGeometry(0.012, 8, 6), mats.brassDark);
  if (axis === 'x') {
    bell.position.set(x + 0.14, y - 0.16, z);
    clapper.position.set(x + 0.14, y - 0.2, z);
    addBox(g, 0.12, 0.035, 0.035, mats.teak, x + 0.06, y, z);
  } else {
    bell.position.set(x, y - 0.16, z);
    clapper.position.set(x, y - 0.2, z);
    addBox(g, 0.04, 0.08, 0.06, mats.teak, x, y + 0.02, z + 0.03);
  }
  g.add(bell);
  g.add(clapper);
}

function addCage(g, x, y, z, mats) {
  addCyl(g, 0.07, 0.05, 0.025, mats.brass, x, y, z, 12);
  addCyl(g, 0.055, 0.055, 0.012, mats.brass, x, y - 0.15, z, 12);
  for (let k = 0; k < 4; k++) {
    const a = (k / 4) * Math.PI * 2;
    addCyl(g, 0.005, 0.005, 0.15, mats.brassDark, x + Math.cos(a) * 0.05, y - 0.075, z + Math.sin(a) * 0.05, 6);
  }
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.035, 12, 10), mats.glow);
  bulb.position.set(x, y - 0.08, z);
  g.add(bulb);
}

function addSconce(g, x, y, z, mats) {
  addCyl(g, 0.04, 0.04, 0.02, mats.brass, x, y, z, 10).rotation.z = Math.PI / 2;
  addBox(g, 0.1, 0.02, 0.02, mats.brass, x + 0.06, y, z);
  addCyl(g, 0.045, 0.02, 0.05, mats.brass, x + 0.12, y - 0.02, z, 10);
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.022, 10, 8), mats.glow);
  bulb.position.set(x + 0.12, y - 0.03, z);
  g.add(bulb);
}

function addBinoculars(g, x, y, z, mats) {
  const body = toon('#2a3034');
  for (const dx of [-0.025, 0.025]) {
    const b = addCyl(g, 0.018, 0.022, 0.09, body, x + dx, y, z, 8);
    b.rotation.x = Math.PI / 2;
  }
  addBox(g, 0.06, 0.012, 0.016, mats.brass, x, y, z);
}

function addRug(g, x, z, w, d, map) {
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, d), toon('#1a3358', {
    map,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -2,
  }));
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set(x, 0.01, z);
  mesh.receiveShadow = true;
  g.add(mesh);
}

function makeProcedural(layout) {
  const g = new THREE.Group();
  g.name = 'procedural';
  const shell = layout.shell;
  const hull = layout.meta.hull;
  const mats = {
    teak: toon(shell.teak),
    deep: toon(shell.teakDeep),
    brass: toon(shell.brass),
    brassDark: toon(shell.brassDark),
    cushion: toon(shell.cushion),
    cushionAlt: toon(shell.cushionAlt),
    ivory: toon(shell.panelColor),
    glow: toon('#ffe1b0', { emissive: '#ffb15a', emissiveIntensity: 0.9 }),
  };

  for (const settee of hull.settees) addSettee(g, settee, mats, hull);
  addChartChest(g, hull, mats);
  addChart(g, hull, mats);
  addBarometer(g, hull.barometer[0], hull.barometer[1], hull.barometer[2], mats);
  addLifeRing(g, hull.lifeRing[0], hull.lifeRing[1], hull.lifeRing[2], hull.lifeRingYaw || 0, mats);
  addBell(g, hull.bell[0], hull.bell[1], hull.bell[2], mats, hull.bellAxis || 'z');

  const ribZ = hull.ribZ;
  for (let b = 0; b < ribZ.length - 1; b++) {
    if (b % 2 !== 1) continue;
    const z = (ribZ[b] + ribZ[b + 1]) / 2;
    const y = hull.portholeY + hull.portholeR + 0.42;
    const x = profileXAtY(hull.profile, y) + 0.16;
    addSconce(g, x, y, z, mats);
  }
  for (const zi of hull.cageRibs) {
    const z = ribZ[zi];
    const y = ceilingY(hull.profile, -0.2) - 0.06;
    addCage(g, -0.15, y, z, mats);
  }

  // Pendant cords up to the deckhead.
  const pendH = layout.assets.pendant_lamp.targetHeight;
  for (const inst of layout.instances) {
    if (inst.kind !== 'pendant_lamp') continue;
    const [x, bottom, z] = inst.position;
    const top = bottom + pendH;
    const ceil = ceilingY(hull.profile, x) - 0.05;
    if (ceil > top + 0.02) {
      const h = ceil - top;
      addCyl(g, 0.006, 0.006, h, toon('#222222'), x, top + h / 2, z, 6);
      addCyl(g, 0.03, 0.03, 0.02, mats.brass, x, ceil, z, 10);
    }
  }

  const binZ = (ribZ[3] + ribZ[4]) / 2;
  const sillY = hull.portholeY - hull.portholeR - 0.06;
  const binX = profileXAtY(hull.profile, sillY) + 0.2;
  addBinoculars(g, binX, sillY, binZ, mats);

  const bookcase = (layout.instances || []).find((i) => i.id === 'case_lib');
  if (bookcase) addCaseBooks(g, bookcase.position[0], bookcase.position[2]);

  const comp = hull.compass;
  const compMesh = new THREE.Mesh(
    new THREE.CircleGeometry(comp.r, 40),
    toon('#d7b48a', { map: makeCompassMap(), polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 })
  );
  compMesh.rotation.x = -Math.PI / 2;
  compMesh.position.set(comp.x, 0.012, comp.z);
  compMesh.receiveShadow = true;
  g.add(compMesh);

  for (const rug of hull.rugs) {
    addRug(
      g,
      (rug.x0 + rug.x1) / 2,
      (rug.z0 + rug.z1) / 2,
      rug.x1 - rug.x0,
      rug.z1 - rug.z0,
      makeRugMap(256, 384)
    );
  }

  // Flat pilot books on the communal tops are placed in world Y just above the table.
  addBox(g, 0.22, 0.02, 0.16, toon('#3e5c40'), hull.tableBooks[0][0], hull.tableBooks[0][1], hull.tableBooks[0][2]);
  addBox(g, 0.18, 0.018, 0.14, toon('#4a3058'), hull.tableBooks[1][0], hull.tableBooks[1][1], hull.tableBooks[1][2]);

  return g;
}

boot({
  makeShell,
  makeProcedural,
  readyText: 'ready — ship salon · drag orbit · U unlit · T toon',
});
