import * as THREE from 'three';
import { boot, toon } from './scene_lib.js';

/**
 * Neighbourhood pocket plaza.
 * +X east, +Z south, +Y up.
 * Brick residential facade on the east, cafe facade on the north.
 * The southwest corner is the open intersection. Afternoon sun is placed
 * in that open sky (southwest) so one key casts shadows toward the
 * northeast — across the curved bench and the chess nook — and the
 * desire line from the corner ramp stays in sun.
 */

const STONE = ['#c4b6a3', '#b7a894', '#cdc0ab', '#ae9f8b', '#d4c6b2'];
const BRICK = ['#8d5b42', '#7a4d38', '#9a684c', '#6e4332'];
const TILE = ['#6f5e54', '#7b6a60', '#64564c', '#857266'];
const SLAB = ['#b7b2a6', '#aea89c', '#c2bcae', '#a39e92'];
const LEAF = ['#3e5834', '#4e6b3c', '#2c4a2e', '#5a7044', '#364e32', '#6a7a48', '#3a5436'];

function box(g, w, h, d, mat, x, y, z, extra = {}) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  if (extra.ry) m.rotation.y = extra.ry;
  if (extra.rx) m.rotation.x = extra.rx;
  if (extra.noCast) m.userData.noCast = true;
  if (extra.noReceive) m.userData.noReceive = true;
  if (extra.name) m.name = extra.name;
  g.add(m);
  return m;
}

function cyl(g, rTop, rBot, h, mat, x, y, z, seg = 14, extra = {}) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBot, h, seg), mat);
  m.position.set(x, y, z);
  if (extra.rx) m.rotation.x = extra.rx;
  if (extra.ry) m.rotation.y = extra.ry;
  if (extra.rz) m.rotation.z = extra.rz;
  if (extra.noCast) m.userData.noCast = true;
  g.add(m);
  return m;
}

function canvasTex(draw, w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d'), w, h);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

function brickTexture() {
  const tex = canvasTex((g, w, h) => {
    g.fillStyle = '#6a5148';
    g.fillRect(0, 0, w, h);
    const bw = 64;
    const bh = 28;
    const gap = 5;
    for (let row = 0; row < 12; row++) {
      const off = (row % 2) * ((bw + gap) / 2);
      for (let col = -1; col < 6; col++) {
        const n = (row * 5 + col * 3) % 5;
        const r = 138 + n * 10;
        const gv = 62 + (n % 3) * 8;
        g.fillStyle = `rgb(${r},${gv},${52 + (n % 2) * 6})`;
        g.fillRect(col * (bw + gap) + off + gap, row * (bh + gap) + gap, bw, bh);
      }
    }
  }, 256, 256);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

function plasterTexture() {
  const tex = canvasTex((g, w, h) => {
    g.fillStyle = '#e2d1ba';
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 700; i++) {
      const x = (i * 47) % w;
      const y = (i * 91) % h;
      const v = 190 + (i % 5) * 8;
      g.fillStyle = `rgba(${v},${v - 18},${v - 40},0.18)`;
      g.fillRect(x, y, 3 + (i % 4), 2 + (i % 3));
    }
  }, 256, 256);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

function signTexture(label) {
  return canvasTex((g, w, h) => {
    g.fillStyle = '#1c3c34';
    g.fillRect(0, 0, w, h);
    g.strokeStyle = '#e7dcc8';
    g.lineWidth = 8;
    g.strokeRect(8, 8, w - 16, h - 16);
    g.fillStyle = '#f3eadc';
    g.font = '600 72px Georgia, serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(label, w / 2, h / 2 + 2);
  }, 512, 128);
}

function plaqueTexture(label) {
  return canvasTex((g, w, h) => {
    g.fillStyle = '#efe6d6';
    g.fillRect(0, 0, w, h);
    g.strokeStyle = '#5c5348';
    g.lineWidth = 6;
    g.strokeRect(4, 4, w - 8, h - 8);
    g.fillStyle = '#2c3330';
    g.font = '700 78px Georgia, serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(label, w / 2, h / 2 + 4);
  }, 128, 128);
}

function domeTexture() {
  return canvasTex((g, w, h) => {
    g.fillStyle = '#a85b3a';
    g.fillRect(0, 0, w, h);
    g.fillStyle = '#c98462';
    for (let y = 8; y < h; y += 14) {
      const shift = ((y / 14) % 2) * 7;
      for (let x = 8; x < w; x += 14) {
        g.beginPath();
        g.arc(x + shift, y, 4.2, 0, Math.PI * 2);
        g.fill();
      }
    }
  }, 160, 80);
}

function skyTexture() {
  return canvasTex((g, w, h) => {
    const grd = g.createLinearGradient(0, 0, 0, h);
    grd.addColorStop(0, '#8eabc2');
    grd.addColorStop(0.42, '#c5d4e0');
    grd.addColorStop(0.74, '#ead9c6');
    grd.addColorStop(1, '#e4d0b8');
    g.fillStyle = grd;
    g.fillRect(0, 0, w, h);
  }, 8, 512);
}

function hash(i, j) {
  let n = (i * 374761393 + j * 668265263) | 0;
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
}

function inEllipse(x, z, island, pad) {
  const dx = x - island.cx;
  const dz = z - island.cz;
  const c = Math.cos(island.rot);
  const s = Math.sin(island.rot);
  const lx = c * dx + s * dz;
  const lz = -s * dx + c * dz;
  const rx = island.rx + pad;
  const rz = island.rz + pad;
  return (lx * lx) / (rx * rx) + (lz * lz) / (rz * rz) < 1;
}

function inDeck(x, z) {
  if (x < -5.78 || x > 7.08 || z < -6.48 || z > 5.32) return false;
  if (x < -3.7 && z > 3.2) {
    const t = (x + 3.85) / (-5.78 + 3.85);
    const zLine = 5.32 + t * (3.4 - 5.32);
    if (t >= 0 && t <= 1 && z > zLine) return false;
  }
  return true;
}

function rimPoint(island, t, outward = 0) {
  const lx = Math.cos(t) * island.rx;
  const lz = Math.sin(t) * island.rz;
  const c = Math.cos(island.rot);
  const s = Math.sin(island.rot);
  const x = island.cx + c * lx - s * lz;
  const z = island.cz + s * lx + c * lz;
  const dx = x - island.cx;
  const dz = z - island.cz;
  const n = Math.hypot(dx, dz) || 1;
  return {
    x: x + (dx / n) * outward,
    z: z + (dz / n) * outward,
    nx: dx / n,
    nz: dz / n,
  };
}

function distToSeg(px, pz, ax, az, bx, bz) {
  const dx = bx - ax;
  const dz = bz - az;
  const l2 = dx * dx + dz * dz || 1e-8;
  let t = ((px - ax) * dx + (pz - az) * dz) / l2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (ax + t * dx), pz - (az + t * dz));
}

function nearLine(x, z, lines, id, half) {
  const line = lines.find((l) => l.id === id);
  let best = Infinity;
  for (let i = 0; i < line.points.length - 1; i++) {
    const a = line.points[i];
    const b = line.points[i + 1];
    best = Math.min(best, distToSeg(x, z, a[0], a[1], b[0], b[1]));
  }
  return best < half;
}

function addTube(g, a, b, r0, r1, mat) {
  const dir = new THREE.Vector3(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
  const len = dir.length();
  if (len < 1e-4) return;
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(Math.max(r1, 0.012), Math.max(r0, 0.012), len, 7), mat);
  mesh.position.set((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  g.add(mesh);
}

function addSky(g) {
  const mat = new THREE.MeshBasicMaterial({
    map: skyTexture(),
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
  });
  const sky = new THREE.Mesh(new THREE.SphereGeometry(96, 28, 16), mat);
  sky.userData.keepBasic = true;
  sky.renderOrder = -1;
  sky.name = 'sky';
  g.add(sky);
}

function addGround(g, mats) {
  const asphalt = box(g, 34, 0.16, 30, mats.asphalt, -1.2, -0.23, 4.2, { noCast: true });
  asphalt.name = 'asphalt';
  box(g, 3.7, 0.16, 12.4, mats.sidewalk, -10.55, -0.08, 1.9, { noCast: true });
  box(g, 15.2, 0.16, 3.7, mats.sidewalk, -1.2, -0.08, 9.85, { noCast: true });

  const shape = new THREE.Shape();
  const pts = [[-5.9, -6.6], [7.2, -6.6], [7.2, 5.45], [-3.85, 5.45], [-5.9, 3.4]];
  pts.forEach(([x, z], i) => {
    const y = -z;
    if (i === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  });
  shape.closePath();
  const geo = new THREE.ExtrudeGeometry(shape, { depth: 0.16, bevelEnabled: false });
  geo.rotateX(-Math.PI / 2);
  const deck = new THREE.Mesh(geo, mats.curb);
  deck.position.y = -0.16;
  deck.userData.noCast = true;
  deck.name = 'deck';
  g.add(deck);
}

function pushPavers(g) {
  const dummy = new THREE.Object3D();
  const color = new THREE.Color();
  const items = [];
  const push = (x, z, ry, w, d, palette, salt) => {
    items.push({ x, z, ry, w, d, hex: palette[Math.floor(hash(Math.round(x * 20) + salt, Math.round(z * 20)) * palette.length) % palette.length] });
  };

  const lines = [
    { pts: [[-4.55, 4.05], [-3.55, 1.15], [-2.85, -1.7], [-2.2, -4.35], [-1.8, -5.65]], half: 0.82, lead: 0.9 },
    { pts: [[-5.5, -0.55], [-4.35, -0.15], [-3.55, 0.85]], half: 0.7, lead: 0 },
  ];
  for (const line of lines) {
    for (let i = 0; i < line.pts.length - 1; i++) {
      const a = line.pts[i];
      const b = line.pts[i + 1];
      const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
      const ux = (b[0] - a[0]) / len;
      const uz = (b[1] - a[1]) / len;
      const px = -uz;
      const pz = ux;
      const ry = Math.atan2(-uz, ux);
      for (let s = 0.06; s < len; s += 0.21) {
        for (let w = -line.half + 0.055; w <= line.half - 0.04; w += 0.105) {
          const x = a[0] + ux * s + px * w;
          const z = a[1] + uz * s + pz * w;
          if (!inDeck(x, z)) continue;
          if (inEllipse(x, z, { cx: 0.35, cz: -0.15, rx: 2.05, rz: 1.55, rot: -0.18 }, 0.42)) continue;
          if (i === 0 && s < (line.lead || 0)) continue;
          push(x, z, ry, 0.2, 0.098, BRICK, 3);
        }
      }
    }
  }

  const onBrick = (x, z, rad = 0) => lines.some((line) => {
    for (let i = 0; i < line.pts.length - 1; i++) {
      const a = line.pts[i];
      const b = line.pts[i + 1];
      if (distToSeg(x, z, a[0], a[1], b[0], b[1]) < line.half + rad) return true;
    }
    return false;
  });

  const apron = (x, z) => x > -5.15 && x < 0.45 && z > -6.48 && z < -4.72;
  const sidewalk = (x, z) => (x > 4.85 && x < 7.08 && z > -6.4 && z < 5.2) || (z > 4.55 && z < 5.32 && x > -5.6 && x < 7.05);

  for (let row = 0, z = -6.35; z <= 5.2; z += 0.46, row++) {
    const xOff = (row % 2) * 0.32;
    for (let col = 0, x = -5.6 + xOff; x <= 6.95; x += 0.64, col++) {
      if (!inDeck(x, z) || inEllipse(x, z, { cx: 0.35, cz: -0.15, rx: 2.05, rz: 1.55, rot: -0.18 }, 0.28)) continue;
      if (onBrick(x, z, 0.34)) continue;
      if (apron(x, z)) continue;
      if (sidewalk(x, z)) continue;
      push(x, z, 0, 0.56, 0.38, STONE, 1);
    }
  }

  for (let x = -5.0; x <= 0.2; x += 0.44) {
    for (let z = -6.35; z <= -4.85; z += 0.44) {
      if (!inDeck(x, z) || onBrick(x, z, 0.24)) continue;
      push(x, z, 0, 0.4, 0.4, TILE, 5);
    }
  }

  for (let x = 5.15; x <= 6.9; x += 0.95) {
    for (let z = -6.2; z <= 5.05; z += 0.95) {
      if (!inDeck(x, z) || onBrick(x, z, 0.48)) continue;
      push(x, z, 0, 0.86, 0.86, SLAB, 8);
    }
  }
  for (let x = -5.3; x <= 6.8; x += 0.95) {
    for (let z = 4.7; z <= 5.15; z += 0.5) {
      if (!inDeck(x, z) || onBrick(x, z, 0.48) || sidewalk(x, z) === false) continue;
      if (x > 4.85) continue;
      push(x, z, 0, 0.86, 0.42, SLAB, 9);
    }
  }

  const geo = new THREE.BoxGeometry(1, 1, 1);
  const mesh = new THREE.InstancedMesh(geo, toon('#ffffff'), items.length);
  mesh.userData.noCast = true;
  mesh.name = 'pavers';
  items.forEach((it, i) => {
    dummy.position.set(it.x, 0.028, it.z);
    dummy.rotation.set(0, it.ry, 0);
    dummy.scale.set(it.w, 0.05, it.d);
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
    color.set(it.hex);
    mesh.setColorAt(i, color);
  });
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  g.add(mesh);
}

function addFace(pos, nrm, a, b, c) {
  const ax = b[0] - a[0];
  const ay = b[1] - a[1];
  const az = b[2] - a[2];
  const bx = c[0] - a[0];
  const by = c[1] - a[1];
  const bz = c[2] - a[2];
  let nx = ay * bz - az * by;
  let ny = az * bx - ax * bz;
  let nz = ax * by - ay * bx;
  const l = Math.hypot(nx, ny, nz) || 1;
  nx /= l; ny /= l; nz /= l;
  for (const p of [a, b, c]) {
    pos.push(p[0], p[1], p[2]);
    nrm.push(nx, ny, nz);
  }
}

function rampMesh(length, width, flare, yTop, yBot) {
  const hw0 = width / 2;
  const hw1 = width / 2 + flare;
  const yBase = yBot - 0.06;
  const t0 = [-hw0, yTop, 0];
  const t1 = [hw0, yTop, 0];
  const t2 = [-hw1, yBot, length];
  const t3 = [hw1, yBot, length];
  const b0 = [-hw0, yBase, 0];
  const b1 = [hw0, yBase, 0];
  const b2 = [-hw1, yBase, length];
  const b3 = [hw1, yBase, length];
  const pos = [];
  const nrm = [];
  addFace(pos, nrm, t0, t2, t1);
  addFace(pos, nrm, t1, t2, t3);
  addFace(pos, nrm, b0, b1, b2);
  addFace(pos, nrm, b1, b3, b2);
  addFace(pos, nrm, t0, t1, b0);
  addFace(pos, nrm, t1, b1, b0);
  addFace(pos, nrm, t2, b2, t3);
  addFace(pos, nrm, t3, b2, b3);
  addFace(pos, nrm, t0, b0, t2);
  addFace(pos, nrm, t2, b0, b2);
  addFace(pos, nrm, t1, t3, b1);
  addFace(pos, nrm, t3, b3, b1);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
  return geo;
}

function addRamps(g, layout, mats) {
  const streetY = layout.site.streetY;
  const domeMat = toon('#ffffff', { map: domeTexture() });
  for (const ramp of layout.site.ramps) {
    const dx = ramp.bottom[0] - ramp.top[0];
    const dz = ramp.bottom[2] - ramp.top[2];
    const len = Math.hypot(dx, dz);
    const grp = new THREE.Group();
    grp.position.set(ramp.top[0], 0, ramp.top[2]);
    grp.rotation.y = Math.atan2(dx, dz);
    grp.name = 'ramp-' + ramp.id;
    const mesh = new THREE.Mesh(rampMesh(len, ramp.width, 0.32, 0.02, streetY + 0.02), mats.ramp);
    mesh.userData.noCast = true;
    grp.add(mesh);
    const plate = new THREE.Mesh(new THREE.BoxGeometry(ramp.width * 0.96, 0.02, 0.55), domeMat);
    plate.position.set(0, streetY + 0.035, len - 0.32);
    plate.userData.noCast = true;
    grp.add(plate);
    g.add(grp);
  }
}

function addCrosswalk(g, mats, x0, z0, x1, z1, across) {
  const dx = x1 - x0;
  const dz = z1 - z0;
  const len = Math.hypot(dx, dz);
  const ux = dx / len;
  const uz = dz / len;
  const px = -uz;
  const pz = ux;
  const ry = Math.atan2(ux, uz);
  const stripes = 4;
  const span = 1.45;
  for (let i = 0; i < stripes; i++) {
    const w = (i - (stripes - 1) / 2) * (span / stripes);
    const jitter = (i % 2) * 0.08;
    box(
      g,
      0.28,
      0.012,
      len * 0.92,
      mats.stripe,
      (x0 + x1) / 2 + px * w,
      -0.142,
      (z0 + z1) / 2 + pz * w + jitter * uz,
      { ry, noCast: true }
    );
  }
}

function addCrossings(g, mats) {
  addCrosswalk(g, mats, 1.2, 7.05, 1.2, 9.75, 1.5);
  addCrosswalk(g, mats, -7.5, -0.55, -10.35, -0.55, 1.5);
  const grate = box(g, 0.55, 0.02, 0.38, mats.metal, -5.7, -0.135, 5.55, { noCast: true });
  grate.name = 'drain';
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.035, 8, 18), mats.metal);
  ring.rotation.x = Math.PI / 2;
  ring.position.set(-3.4, -0.132, 6.7);
  ring.userData.noCast = true;
  g.add(ring);
  const lid = new THREE.Mesh(new THREE.CircleGeometry(0.28, 16), mats.asphaltDark);
  lid.rotation.x = -Math.PI / 2;
  lid.position.set(-3.4, -0.128, 6.7);
  lid.userData.noCast = true;
  g.add(lid);
}

function punchWindowX(g, mats, x, y, z, w, h, dir) {
  const face = x + dir * 0.02;
  box(g, 0.07, h, w, mats.frame, face, y, z);
  const glass = box(g, 0.03, h - 0.12, w - 0.12, mats.glass, face + dir * 0.03, y, z);
  glass.userData.noCast = true;
  box(g, 0.09, 0.07, w + 0.08, mats.sill, face + dir * 0.04, y - h / 2, z);
}

function punchWindowZ(g, mats, x, y, z, w, h, dir) {
  const face = z + dir * 0.02;
  box(g, w, h, 0.07, mats.frame, x, y, face);
  const glass = box(g, w - 0.12, h - 0.12, 0.03, mats.glass, x, y, face + dir * 0.03);
  glass.userData.noCast = true;
  box(g, w + 0.08, 0.07, 0.09, mats.sill, x, y - h / 2, face + dir * 0.04);
}

function addNorthBuilding(g, mats) {
  const b = new THREE.Group();
  b.name = 'north-building';
  box(b, 13.1, 7.35, 2.65, mats.plaster, 0.65, 3.675, -9.875);
  box(b, 1.15, 7.35, 1.95, mats.plaster, -5.325, 3.675, -7.575);
  box(b, 6.7, 7.35, 1.95, mats.plaster, 3.85, 3.675, -7.575);
  box(b, 5.25, 4.15, 1.95, mats.plaster, -2.125, 5.275, -7.575);
  box(b, 13.2, 0.22, 4.7, mats.cornice, 0.65, 7.28, -8.9);
  box(b, 0.42, 1.15, 0.42, mats.brick, -4.1, 7.9, -9.4);
  box(b, 0.5, 0.12, 0.5, mats.sill, -4.1, 8.5, -9.4);

  punchWindowX(b, mats, -5.9, 1.7, -8.6, 0.7, 1.15, -1);
  punchWindowX(b, mats, -5.9, 1.7, -7.3, 0.55, 0.9, -1);
  punchWindowX(b, mats, -5.9, 4.7, -9.4, 0.7, 1.05, -1);
  punchWindowX(b, mats, -5.9, 4.7, -7.6, 0.7, 1.05, -1);

  const upperX = [-1.1, 0.55, 2.15, 3.7, 5.35];
  upperX.forEach((x, i) => {
    punchWindowZ(b, mats, x, 4.85, -6.6, 0.72, 1.15, 1);
    if (i % 2 === 0) punchWindowZ(b, mats, x, 6.25, -6.6, 0.62, 0.7, 1);
  });
  [-3.55, -2.15, -0.7].forEach((x) => {
    punchWindowZ(b, mats, x, 5.15, -6.6, 0.78, 1.25, 1);
  });

  box(b, 0.14, 2.55, 0.16, mats.cafe, -4.72, 1.45, -6.52);
  box(b, 0.14, 2.55, 0.16, mats.cafe, 0.42, 1.45, -6.52);
  box(b, 0.1, 2.45, 0.12, mats.cafe, -1.22, 1.35, -6.52);
  box(b, 5.3, 0.55, 0.2, mats.cafe, -2.15, 0.28, -6.52);
  box(b, 2.3, 0.7, 0.16, mats.bulk, -3.55, 0.9, -6.5);
  box(b, 1.5, 0.7, 0.16, mats.bulk, -0.4, 0.9, -6.5);

  const shopGlass = box(b, 2.15, 1.7, 0.04, mats.glass, -3.5, 1.85, -6.5);
  shopGlass.userData.noCast = true;
  const shopGlassR = box(b, 1.4, 1.7, 0.04, mats.glass, -0.45, 1.85, -6.5);
  shopGlassR.userData.noCast = true;

  const doorPivot = new THREE.Group();
  doorPivot.position.set(-2.32, 0, -6.58);
  doorPivot.rotation.y = 0.42;
  box(doorPivot, 0.9, 2.15, 0.05, mats.cafe, 0.45, 1.08, 0);
  const doorGlass = box(doorPivot, 0.48, 1.15, 0.02, mats.glass, 0.48, 1.25, 0.03);
  doorGlass.userData.noCast = true;
  box(doorPivot, 0.08, 0.08, 0.08, mats.metal, 0.78, 1.05, 0.05);
  b.add(doorPivot);

  const awning = new THREE.Group();
  awning.name = 'awning';
  const cloth = box(awning, 5.35, 0.045, 1.45, mats.awning, -2.15, 2.72, -5.85);
  cloth.rotation.x = -0.14;
  box(awning, 5.4, 0.05, 0.08, mats.cafe, -2.15, 2.58, -5.16);
  for (let i = 0; i < 9; i++) {
    const drop = 0.12 + (i % 3) * 0.035;
    box(awning, 0.46, drop, 0.025, mats.awning, -4.35 + i * 0.55, 2.5 - drop / 2, -5.14);
  }
  b.add(awning);

  const sign = new THREE.Mesh(
    new THREE.BoxGeometry(2.4, 0.42, 0.06),
    toon('#ffffff', { map: signTexture('LINDEN') })
  );
  sign.position.set(-2.15, 3.05, -6.46);
  b.add(sign);
  const plaque = new THREE.Mesh(
    new THREE.BoxGeometry(0.28, 0.28, 0.03),
    toon('#ffffff', { map: plaqueTexture('18') })
  );
  plaque.position.set(-2.55, 1.55, -6.46);
  b.add(plaque);

  box(b, 1.7, 0.32, 0.46, mats.curb, -4.05, 0.16, -6.22);
  mound(b, -4.35, 0.32, -6.22, 0.22, mats.leafA, mats.leafB);
  spikes(b, -3.75, 0.32, -6.18, mats.leafC);

  box(b, 4.6, 0.06, 2.15, mats.interiorFloor, -2.2, 0.02, -7.55, { noCast: true });
  box(b, 4.8, 2.4, 0.08, mats.interiorWall, -2.2, 1.5, -8.52);

  const menu = new THREE.Group();
  box(menu, 0.42, 0.62, 0.03, mats.menu, 0, 0.48, 0, { ry: 0.18 });
  box(menu, 0.42, 0.62, 0.03, mats.menu, 0, 0.48, 0, { ry: -0.18 });
  menu.position.set(-4.65, 0, -4.7);
  b.add(menu);

  g.add(b);
}

function addEastBuilding(g, mats) {
  const b = new THREE.Group();
  b.name = 'east-building';
  box(b, 3.7, 8.55, 12.05, mats.brickMat, 9.05, 4.275, -0.575);
  box(b, 3.85, 0.72, 12.1, mats.stone, 9.02, 0.36, -0.575);
  box(b, 3.95, 0.28, 12.2, mats.cornice, 9.1, 8.35, -0.575);
  box(b, 3.9, 0.16, 12.15, mats.stringCourse, 9.05, 3.35, -0.575);
  box(b, 0.38, 1.0, 0.38, mats.brick, 8.5, 9.05, 0.8);
  box(b, 0.46, 0.1, 0.46, mats.sill, 8.5, 9.58, 0.8);

  const zs = [-5.15, -3.55, 0.55, 2.35, 4.15];
  zs.forEach((z, i) => {
    const h = i === 2 ? 1.35 : 1.2;
    punchWindowX(b, mats, 7.2, 5.15, z, 0.78, h, -1);
    punchWindowX(b, mats, 7.2, 6.85, z, 0.7, 0.95, -1);
  });
  punchWindowX(b, mats, 7.2, 1.85, -4.7, 1.15, 1.7, -1);
  punchWindowX(b, mats, 7.2, 1.85, 3.7, 0.95, 1.55, -1);

  box(b, 0.08, 2.2, 1.05, mats.door, 7.16, 1.12, -1.65);
  box(b, 0.05, 0.7, 0.42, mats.glass, 7.12, 1.45, -1.65);
  box(b, 0.7, 0.1, 1.25, mats.stone, 6.85, 0.05, -1.65);
  box(b, 0.48, 0.1, 1.05, mats.stone, 6.55, 0.14, -1.65);
  const plaque = new THREE.Mesh(
    new THREE.BoxGeometry(0.04, 0.26, 0.26),
    toon('#ffffff', { map: plaqueTexture('20') })
  );
  plaque.position.set(7.14, 1.7, -2.35);
  b.add(plaque);

  cyl(b, 0.035, 0.04, 6.4, mats.metal, 7.12, 3.5, 5.15, 8);

  box(b, 0.08, 2.0, 0.08, mats.frame, 7.2, 4.6, 5.45);
  punchWindowZ(b, mats, 8.3, 4.8, 5.45, 0.7, 1.1, 1);
  punchWindowZ(b, mats, 8.3, 2.0, 5.45, 0.7, 1.15, 1);

  const ledge = box(b, 0.16, 0.08, 0.7, mats.sill, 7.08, 2.55, -4.7);
  ledge.name = 'window-box';

  g.add(b);
}

function addIvy(g, mats) {
  const greens = [mats.leafA, mats.leafB, mats.leafC, mats.leafD];
  for (let i = 0; i < 26; i++) {
    const col = i % 5;
    const row = Math.floor(i / 5);
    const z = -1.7 + col * 0.46 + (row % 2) * 0.2;
    const y = 0.4 + row * 0.72 + (col % 3) * 0.08;
    const s = 0.2 + (i % 4) * 0.045;
    const leaf = new THREE.Mesh(new THREE.SphereGeometry(s, 7, 5), greens[i % 4]);
    leaf.scale.set(0.42, 0.85, 1.15);
    leaf.position.set(7.14, y, z);
    leaf.rotation.set((i % 5) * 0.2, 0.5, (i % 3) * 0.15);
    leaf.castShadow = true;
    g.add(leaf);
    if (i % 4 === 0) {
      const hang = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.28, 5), greens[(i + 2) % 4]);
      hang.position.set(7.1, y - s * 0.9, z + 0.08);
      hang.rotation.z = 0.4;
      g.add(hang);
    }
  }
}

function arcSolid(g, island, a0, a1, out0, out1, y0, y1, mat) {
  const steps = 72;
  const pos = [];
  const nrm = [];
  const at = (t, out, y) => {
    const r = rimPoint(island, t, out);
    return { p: [r.x, y, r.z], n: [r.nx, 0, r.nz] };
  };
  const tri = (a, b, c, na, nb, nc) => {
    pos.push(a[0], a[1], a[2], b[0], b[1], b[2], c[0], c[1], c[2]);
    nrm.push(na[0], na[1], na[2], nb[0], nb[1], nb[2], nc[0], nc[1], nc[2]);
  };
  const face = (a, b, c, na, nb, nc, want) => {
    const e1x = b[0] - a[0]; const e1y = b[1] - a[1]; const e1z = b[2] - a[2];
    const e2x = c[0] - a[0]; const e2y = c[1] - a[1]; const e2z = c[2] - a[2];
    const nx = e1y * e2z - e1z * e2y;
    const ny = e1z * e2x - e1x * e2z;
    const nz = e1x * e2y - e1y * e2x;
    if (nx * want[0] + ny * want[1] + nz * want[2] >= 0) tri(a, b, c, na, nb, nc);
    else tri(a, c, b, na, nc, nb);
  };
  const up = [0, 1, 0];
  const down = [0, -1, 0];
  for (let i = 0; i < steps; i++) {
    const t0 = a0 + (a1 - a0) * (i / steps);
    const t1 = a0 + (a1 - a0) * ((i + 1) / steps);
    const b00 = at(t0, out0, y0);
    const b01 = at(t0, out1, y0);
    const b10 = at(t1, out0, y0);
    const b11 = at(t1, out1, y0);
    const u00 = at(t0, out0, y1);
    const u01 = at(t0, out1, y1);
    const u10 = at(t1, out0, y1);
    const u11 = at(t1, out1, y1);
    const n0 = b01.n;
    const n1 = b11.n;
    const i0 = [-n0[0], 0, -n0[2]];
    const i1 = [-n1[0], 0, -n1[2]];
    const outWant = [(n0[0] + n1[0]) * 0.5, 0, (n0[2] + n1[2]) * 0.5];
    const inWant = [-outWant[0], 0, -outWant[2]];
    face(u00.p, u10.p, u01.p, up, up, up, up);
    face(u01.p, u11.p, u10.p, up, up, up, up);
    face(b00.p, b01.p, b10.p, down, down, down, down);
    face(b01.p, b11.p, b10.p, down, down, down, down);
    face(b01.p, u01.p, b11.p, n0, n0, n1, outWant);
    face(u01.p, u11.p, b11.p, n0, n1, n1, outWant);
    face(b00.p, b10.p, u00.p, i0, i1, i0, inWant);
    face(u00.p, b10.p, u10.p, i0, i1, i1, inWant);
  }
  const cap = (t, sign) => {
    const b0 = at(t, out0, y0);
    const b1 = at(t, out1, y0);
    const u0 = at(t, out0, y1);
    const u1 = at(t, out1, y1);
    const tx = Math.atan2(-b0.n[0], -b0.n[2]);
    const tangent = [Math.cos(tx) * sign, 0, -Math.sin(tx) * sign];
    tri(b0.p, sign < 0 ? u0.p : b1.p, sign < 0 ? b1.p : u0.p, tangent, tangent, tangent);
    tri(b1.p, sign < 0 ? u0.p : u1.p, sign < 0 ? u1.p : u0.p, tangent, tangent, tangent);
  };
  cap(a0, -1);
  cap(a1, 1);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
  const mesh = new THREE.Mesh(geo, mat);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  g.add(mesh);
}

function addIsland(g, layout, mats) {
  const island = layout.site.island;
  const bench = layout.site.bench;
  const grp = new THREE.Group();
  grp.name = 'island';

  const wallMatA = mats.wallA;
  const wallMatB = mats.wallB;
  const step = 0.13;
  for (let t = -Math.PI; t < Math.PI - 1e-3; t += step) {
    const a = rimPoint(island, t, 0);
    const onBench = t >= bench.a0 && t <= bench.a1;
    const tangent = Math.atan2(-a.nx, -a.nz);
    const radius = Math.hypot(a.x - island.cx, a.z - island.cz) || 1;
    const seg = radius * step * 1.18;
    if (onBench) continue;
    const baseH = 0.32;
    const m = box(grp, seg, baseH, 0.24, ((Math.round(t * 7) % 2) ? wallMatA : wallMatB), a.x, baseH / 2, a.z, { ry: tangent });
    m.castShadow = true;
    box(grp, seg, 0.045, 0.26, mats.coping, a.x, baseH + 0.02, a.z, { ry: tangent });
  }

  arcSolid(grp, island, bench.a0, bench.a1, -0.16, 0.14, 0, 0.42, wallMatA);
  const seatY = 0.42;
  arcSolid(grp, island, bench.a0, bench.a1, -0.18, -0.02, seatY, seatY + 0.08, mats.wood);
  arcSolid(grp, island, bench.a0, bench.a1, 0.03, 0.18, seatY, seatY + 0.08, mats.woodDark);
  arcSolid(grp, island, bench.a0, bench.a1, 0.11, 0.18, seatY + 0.08, seatY + 0.36, mats.woodDark);
  arcSolid(grp, island, bench.a0, bench.a1, 0.1, 0.18, seatY + 0.34, seatY + 0.4, mats.wood);

  const soil = new THREE.Mesh(new THREE.CircleGeometry(1, 40), mats.soil);
  soil.scale.set(island.rx * 0.9, island.rz * 0.9, 1);
  soil.position.set(island.cx, island.soilY, island.cz);
  soil.rotation.order = 'YXZ';
  soil.rotation.set(-Math.PI / 2, island.rot, 0);
  soil.userData.noCast = true;
  grp.add(soil);

  const cover = [
    [-0.55, 0.25, 0.7, 0.45, '#3f5a34'],
    [0.45, -0.2, 0.55, 0.38, '#4d6a3e'],
    [0.1, 0.55, 0.4, 0.3, '#2e4c30'],
    [-0.2, -0.45, 0.5, 0.28, '#5a7044'],
  ];
  for (const [lx, lz, sx, sz, col] of cover) {
    const c = Math.cos(island.rot);
    const s = Math.sin(island.rot);
    const x = island.cx + c * lx - s * lz;
    const z = island.cz + s * lx + c * lz;
    const patch = new THREE.Mesh(new THREE.CircleGeometry(1, 12), toon(col));
    patch.rotation.x = -Math.PI / 2;
    patch.scale.set(sx, sz, 1);
    patch.position.set(x, island.soilY + 0.015, z);
    patch.userData.noCast = true;
    grp.add(patch);
  }

  addShrubs(grp, island, mats);
  addShadeTree(grp, island.cx - 0.12, island.soilY, island.cz + 0.05, mats);
  g.add(grp);
}

function addShrubs(g, island, mats) {
  const y = island.soilY;
  mound(g, island.cx - 0.85, y, island.cz + 0.55, 0.42, mats.leafA, mats.leafB);
  spikes(g, island.cx + 0.7, y, island.cz - 0.45, mats.leafC);
  fan(g, island.cx + 0.15, y, island.cz + 0.72, mats.leafD, mats.leafA);
}

function mound(g, x, y, z, s, matA, matB) {
  const a = new THREE.Mesh(new THREE.SphereGeometry(s, 10, 8), matA);
  a.scale.set(1.15, 0.62, 0.95);
  a.position.set(x, y + s * 0.45, z);
  const b = new THREE.Mesh(new THREE.SphereGeometry(s * 0.72, 8, 6), matB);
  b.scale.set(1.3, 0.55, 0.8);
  b.position.set(x + s * 0.45, y + s * 0.38, z - s * 0.2);
  g.add(a, b);
}

function spikes(g, x, y, z, mat) {
  for (let i = 0; i < 7; i++) {
    const a = i / 7 * Math.PI * 2;
    const m = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.38 + (i % 3) * 0.08, 5), mat);
    m.position.set(x + Math.cos(a) * 0.16, y + 0.22, z + Math.sin(a) * 0.16);
    m.rotation.z = Math.cos(a) * 0.25;
    m.rotation.x = Math.sin(a) * 0.2;
    g.add(m);
  }
}

function fan(g, x, y, z, matA, matB) {
  for (let i = 0; i < 6; i++) {
    const a = -1.1 + i * 0.44;
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.11, 6, 5), i % 2 ? matA : matB);
    m.scale.set(1.35, 0.42, 0.75);
    m.position.set(x + Math.sin(a) * 0.14, y + 0.07, z + Math.cos(a) * 0.08);
    m.rotation.y = a;
    g.add(m);
  }
}

function leafPuff(g, x, y, z, s, mats, n, salt) {
  for (let i = 0; i < n; i++) {
    const mat = mats[i % mats.length];
    const geo = i % 3 === 0
      ? new THREE.ConeGeometry(s * 0.55, s * 0.9, 6)
      : new THREE.SphereGeometry(s * 0.48, 7, 5);
    const m = new THREE.Mesh(geo, mat);
    const jx = ((salt * 17 + i * 13) % 10) / 10 - 0.5;
    const jy = ((salt * 9 + i * 7) % 10) / 10 - 0.35;
    const jz = ((salt * 3 + i * 11) % 10) / 10 - 0.5;
    m.position.set(x + jx * s * 1.3, y + jy * s * 0.8, z + jz * s * 1.3);
    m.scale.set(1.2, 0.62, 0.95);
    m.rotation.set(i * 0.4, i * 0.7, i * 0.2);
    m.castShadow = true;
    m.receiveShadow = true;
    g.add(m);
  }
}

function addShadeTree(g, x, y, z, mats) {
  const trunk = mats.trunk;
  const limb = mats.limb;
  cyl(g, 0.18, 0.3, 0.32, trunk, x, y + 0.14, z, 8);
  addTube(g, [x, y + 0.18, z], [x - 0.08, y + 1.7, z + 0.02], 0.22, 0.1, trunk);
  const origin = [x - 0.08, y + 1.62, z + 0.02];
  const primaries = [
    [1.7, 0.7, -1.95],
    [2.15, 0.5, 0.4],
    [0.25, 0.9, -2.05],
    [-1.6, 0.45, 1.4],
    [-1.85, 0.6, -0.4],
    [0.5, 0.95, 1.55],
  ];
  primaries.forEach((d, i) => {
    const end = [origin[0] + d[0], origin[1] + d[1], origin[2] + d[2]];
    addTube(g, origin, end, 0.07, 0.035, limb);
    const tips = [
      [d[0] * 0.45 + 0.35, 0.55, d[2] * 0.35 - 0.25],
      [d[0] * 0.3 - 0.4, 0.4, d[2] * 0.4 + 0.3],
    ];
    tips.forEach((t, k) => {
      const mid = [
        origin[0] + d[0] * 0.62,
        origin[1] + d[1] * 0.62,
        origin[2] + d[2] * 0.62,
      ];
      const tip = [mid[0] + t[0], mid[1] + t[1], mid[2] + t[2]];
      addTube(g, mid, tip, 0.032, 0.016, limb);
      leafPuff(g, tip[0], tip[1], tip[2], 0.55 + (i % 3) * 0.06, [mats.leafA, mats.leafB, mats.leafC, mats.leafD], 4, i * 3 + k);
    });
    leafPuff(g, end[0], end[1] - 0.05, end[2], 0.48, [mats.leafB, mats.leafD], 3, i + 9);
  });
}

function addStreetTree(g, mats) {
  const x = -10.7;
  const z = -3.15;
  const y = 0;
  cyl(g, 0.09, 0.14, 0.25, mats.trunk, x, 0.12, z, 8);
  addTube(g, [x, 0.15, z], [x, 2.3, z], 0.1, 0.05, mats.trunk);
  const arms = [
    [0.35, 1.35, 0.15],
    [-0.4, 1.2, -0.2],
    [0.15, 1.45, -0.35],
    [-0.1, 1.15, 0.4],
  ];
  arms.forEach((d, i) => {
    const a = [x, 2.1, z];
    const b = [x + d[0], 2.1 + d[1], z + d[2]];
    addTube(g, a, b, 0.035, 0.016, mats.limb);
    leafPuff(g, b[0], b[1], b[2], 0.42, [mats.leafC, mats.leafA], 4, i + 4);
  });
  mound(g, x, y, z + 0.35, 0.28, mats.leafB, mats.leafA);
}

function addFountain(g, layout, mats) {
  const { x, z } = layout.site.fountain;
  const f = new THREE.Group();
  f.name = 'fountain';
  f.position.set(x, 0, z);
  box(f, 0.52, 0.08, 0.52, mats.stone, 0, 0.04, 0);
  cyl(f, 0.11, 0.16, 0.78, mats.fountain, 0, 0.47, 0, 12);
  cyl(f, 0.2, 0.16, 0.1, mats.fountain, 0, 0.9, 0, 14);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.028, 8, 18), mats.sill);
  rim.rotation.x = Math.PI / 2;
  rim.position.y = 0.94;
  f.add(rim);
  const water = new THREE.Mesh(new THREE.CircleGeometry(0.13, 16), mats.water);
  water.rotation.x = -Math.PI / 2;
  water.position.y = 0.91;
  water.userData.noCast = true;
  f.add(water);
  cyl(f, 0.028, 0.028, 0.1, mats.metal, 0, 1.02, 0, 8);
  cyl(f, 0.012, 0.012, 0.1, mats.metal, 0, 0.98, 0.1, 6, { rx: Math.PI / 2 });
  const stream = new THREE.Mesh(new THREE.SphereGeometry(0.02, 6, 5), mats.waterLite);
  stream.position.set(0, 0.94, 0.08);
  stream.scale.set(0.6, 1.4, 0.6);
  stream.userData.noCast = true;
  f.add(stream);
  g.add(f);
}

function addBike(g, x, z, color, mats) {
  const b = new THREE.Group();
  b.position.set(x, 0, z);
  const wheelGeo = new THREE.TorusGeometry(0.33, 0.02, 6, 16);
  for (const wz of [-0.52, 0.52]) {
    const w = new THREE.Mesh(wheelGeo, mats.tire);
    w.rotation.y = Math.PI / 2;
    w.position.set(0, 0.33, wz);
    w.castShadow = true;
    b.add(w);
    cyl(b, 0.025, 0.025, 0.08, mats.metal, 0, 0.33, wz, 8, { rx: Math.PI / 2 });
  }
  const frame = toon(color);
  addTube(b, [0, 0.33, -0.52], [0, 0.62, -0.05], 0.02, 0.02, frame);
  addTube(b, [0, 0.62, -0.05], [0, 0.33, 0.52], 0.02, 0.02, frame);
  addTube(b, [0, 0.33, 0.52], [0, 0.72, 0.16], 0.018, 0.018, frame);
  addTube(b, [0, 0.72, 0.16], [0, 0.62, -0.05], 0.018, 0.018, frame);
  addTube(b, [-0.18, 0.78, -0.5], [0.18, 0.78, -0.5], 0.016, 0.016, mats.metal);
  addTube(b, [0, 0.7, -0.48], [0, 0.62, -0.2], 0.016, 0.016, frame);
  box(b, 0.1, 0.04, 0.16, mats.wood, 0, 0.78, 0.12);
  g.add(b);
}

function addRacks(g, mats) {
  const zs = [0.95, 2.1, 3.25];
  zs.forEach((z) => {
    const x = 6.52;
    cyl(g, 0.028, 0.028, 0.78, mats.rack, x - 0.16, 0.42, z, 8);
    cyl(g, 0.028, 0.028, 0.78, mats.rack, x + 0.16, 0.42, z, 8);
    addTube(g, [x - 0.16, 0.78, z], [x + 0.16, 0.78, z], 0.028, 0.028, mats.rack);
  });
  addBike(g, 6.95, 0.95, '#6e2f2a', mats);
  addBike(g, 6.95, 3.25, '#2f3d55', mats);
}

function addStreetFurniture(g, layout, mats) {
  const lamp = layout.site.obstacles.find((o) => o.id === 'lamp');
  cyl(g, 0.1, 0.14, 0.08, mats.metal, lamp.x, 0.04, lamp.z, 8);
  cyl(g, 0.035, 0.045, 2.5, mats.metal, lamp.x, 1.28, lamp.z, 8);
  box(g, 0.28, 0.34, 0.28, mats.lampHead, lamp.x, 2.6, lamp.z);
  box(g, 0.32, 0.04, 0.32, mats.metal, lamp.x, 2.8, lamp.z);

  const trash = layout.site.obstacles.find((o) => o.id === 'trash');
  cyl(g, 0.22, 0.2, 0.72, mats.bin, trash.x, 0.36, trash.z, 12);
  cyl(g, 0.24, 0.24, 0.05, mats.metal, trash.x, 0.74, trash.z, 12);
}

function addChess(g, layout, mats) {
  const table = layout.instances.find((i) => i.id === 'chess_table');
  const grp = new THREE.Group();
  grp.position.set(table.position[0], 0.748, table.position[2]);
  grp.rotation.y = table.rotationY || 0;
  const n = 8;
  const cell = 0.048;
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      box(
        grp,
        cell * 0.94,
        0.012,
        cell * 0.94,
        (i + j) % 2 ? mats.boardDark : mats.boardLite,
        (i - 3.5) * cell,
        0.008,
        (j - 3.5) * cell
      );
    }
  }
  const pieces = [
    [-1, -0.5, 0, 0.045],
    [-1, 0.5, 0, 0.045],
    [0, -0.5, 1, 0.05],
    [0, 0.5, 1, 0.045],
    [1, 0, 0, 0.055],
    [1, 1, 1, 0.04],
    [-2, 1, 1, 0.04],
  ];
  pieces.forEach(([ix, iz, dark, r], k) => {
    const mat = dark ? mats.pieceDark : mats.pieceLite;
    const px = ix * cell;
    const pz = iz * cell;
    if (k % 3 === 0) cyl(grp, r * 0.7, r, 0.09, mat, px, 0.06, pz, 8);
    else if (k % 3 === 1) {
      cyl(grp, r * 0.85, r * 0.85, 0.045, mat, px, 0.04, pz, 8);
      cyl(grp, 0.012, r * 0.5, 0.07, mat, px, 0.09, pz, 6);
    } else {
      const cone = new THREE.Mesh(new THREE.ConeGeometry(r, 0.09, 7), mat);
      cone.position.set(px, 0.07, pz);
      grp.add(cone);
    }
  });
  g.add(grp);
}

function addWindowBoxPlants(g, mats) {
  fan(g, 7.02, 2.62, -4.55, mats.leafD, mats.leafB);
  mound(g, 7.05, 2.58, -4.85, 0.16, mats.leafA, mats.leafC);
}

function addPotFoliage(g, layout, mats) {
  const pots = (layout.instances || []).filter((i) => i.kind === 'flowerpot');
  pots.forEach((p) => {
    const x = p.position[0];
    const z = p.position[2];
    const y = 0.28;
    if (p.foliage === 'upright') spikes(g, x, y, z, mats.leafC);
    else if (p.foliage === 'broad') fan(g, x, y, z, mats.leafD, mats.leafA);
    else mound(g, x, y, z, 0.22, mats.leafA, mats.leafB);
  });
}

function makeShell(layout) {
  const g = new THREE.Group();
  g.name = 'shell';
  const brickTex = brickTexture();
  brickTex.repeat.set(4.2, 5.4);
  const plasterTex = plasterTexture();
  plasterTex.repeat.set(3.2, 2.4);
  const mats = {
    asphalt: toon('#3e444a'),
    asphaltDark: toon('#2f3438'),
    sidewalk: toon('#b7b3a8'),
    curb: toon('#8e887c'),
    ramp: toon('#b3ab9e'),
    stripe: toon('#d9d3c6'),
    metal: toon('#3c4348'),
    brickMat: toon('#ffffff', { map: brickTex }),
    plaster: toon('#ffffff', { map: plasterTex }),
    stone: toon('#c8beae'),
    cornice: toon('#d9d0c2'),
    stringCourse: toon('#cfc4b4'),
    sill: toon('#e4d9c8'),
    frame: toon('#2c3436'),
    glass: toon('#b7c6cc', { transparent: true, opacity: 0.38, side: THREE.DoubleSide, depthWrite: false }),
    cafe: toon('#1c3c34'),
    awning: toon('#245445'),
    bulk: toon('#d7cbb8'),
    door: toon('#3a2a22'),
    hedge: toon('#3d5a36'),
    hedgeDark: toon('#2c4628'),
    interiorFloor: toon('#8a6844'),
    interiorWall: toon('#c4a07a'),
    menu: toon('#f2ead8'),
    wallA: toon('#b7aa98'),
    wallB: toon('#a89886'),
    coping: toon('#d5cbb8'),
    wood: toon('#8a5a34'),
    woodDark: toon('#6e4528'),
    soil: toon('#5a4636'),
    trunk: toon('#5c4030'),
    limb: toon('#6b4c38'),
    leafA: toon(LEAF[0]),
    leafB: toon(LEAF[1]),
    leafC: toon(LEAF[2]),
    leafD: toon(LEAF[3]),
    fountain: toon('#d5d0c6'),
    water: toon('#3e6e76'),
    waterLite: toon('#6d9aa2'),
    tire: toon('#24282c'),
    rack: toon('#4a5156'),
    lampHead: toon('#2a3134'),
    bin: toon('#2e3834'),
    boardLite: toon('#ead9b4'),
    boardDark: toon('#2f4a38'),
    pieceLite: toon('#f4efe4'),
    pieceDark: toon('#2a2e28'),
  };

  addSky(g);
  addGround(g, mats);
  pushPavers(g);
  addRamps(g, layout, mats);
  addCrossings(g, mats);
  addNorthBuilding(g, mats);
  addEastBuilding(g, mats);
  addIvy(g, mats);
  addIsland(g, layout, mats);
  addFountain(g, layout, mats);
  addRacks(g, mats);
  addStreetFurniture(g, layout, mats);
  addChess(g, layout, mats);
  addStreetTree(g, mats);
  addWindowBoxPlants(g, mats);
  return g;
}

function makeProcedural(layout) {
  const g = new THREE.Group();
  g.name = 'pot-foliage';
  const mats = {
    leafA: toon(LEAF[0]),
    leafB: toon(LEAF[1]),
    leafC: toon(LEAF[4]),
    leafD: toon(LEAF[5]),
  };
  addPotFoliage(g, layout, mats);
  return g;
}

boot({
  makeShell,
  makeProcedural,
  readyText: 'ready — pocket plaza · drag orbit · U unlit · T toon',
});
