import * as THREE from 'three';
import { boot, toon, addBox, addCyl } from './scene_lib.js';
import * as site from './site.mjs';

const cache = new Map();
function mat(color, opts) {
  const key = `${color}|${opts ? JSON.stringify(opts) : ''}`;
  if (!cache.has(key)) cache.set(key, toon(color, opts));
  return cache.get(key);
}

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function cylBetween(g, a, b, radius, material, seg = 8) {
  const start = new THREE.Vector3(a[0], a[1], a[2]);
  const end = new THREE.Vector3(b[0], b[1], b[2]);
  const dir = new THREE.Vector3().subVectors(end, start);
  const len = dir.length();
  if (len < 1e-4) return null;
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius * 0.92, len, seg), material);
  mesh.position.copy(start).add(end).multiplyScalar(0.5);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  g.add(mesh);
  return mesh;
}

function srgb(rgb) {
  const c = new THREE.Color();
  c.setRGB(rgb[0], rgb[1], rgb[2], THREE.SRGBColorSpace);
  return c;
}

function makeSky(g) {
  const geo = new THREE.SphereGeometry(78, 28, 18);
  const pos = geo.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  const zenith = new THREE.Color('#1a2348');
  const mid = new THREE.Color('#3a4a74');
  const low = new THREE.Color('#7e6884');
  const peach = new THREE.Color('#e0a890');
  const sun = new THREE.Color('#f2c2a4');
  const c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const ny = pos.getY(i) / 78;
    const nx = pos.getX(i) / 78;
    if (ny < 0.0) c.copy(peach);
    else if (ny < 0.16) c.copy(peach).lerp(low, ny / 0.16);
    else if (ny < 0.42) c.copy(low).lerp(mid, (ny - 0.16) / 0.26);
    else c.copy(mid).lerp(zenith, Math.min(1, (ny - 0.42) / 0.5));
    if (nx > 0 && ny < 0.32) c.lerp(sun, nx * (1 - ny / 0.32) * 0.55);
    colors[i * 3] = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const sky = new THREE.Mesh(
    geo,
    new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false, depthWrite: false })
  );
  sky.userData.unshaded = true;
  sky.renderOrder = -2;
  sky.name = 'sky';
  g.add(sky);

  const stars = site.starPositions();
  const addStars = (pts, size, name) => {
    const positions = [];
    const colors = [];
    const col = new THREE.Color('#fff4e4');
    for (const p of pts) {
      positions.push(p[0], p[1], p[2]);
      colors.push(col.r, col.g, col.b);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    const points = new THREE.Points(
      geo,
      new THREE.PointsMaterial({
        size,
        sizeAttenuation: false,
        vertexColors: true,
        fog: false,
        depthWrite: false,
      })
    );
    points.name = name;
    points.renderOrder = 5;
    g.add(points);
  };
  addStars(stars.slice(0, site.STAR_COUNT), 2.4, 'stars');
  addStars(stars.slice(site.STAR_COUNT), 3.3, 'stars-bright');
}

function makeTerrain(g) {
  const width = 40;
  const depth = 38;
  const geo = new THREE.PlaneGeometry(width, depth, 160, 130);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  const shiftZ = 0.6;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i) + shiftZ;
    pos.setY(i, site.heightAt(x, z));
    const c = srgb(site.colorAt(x, z));
    colors[i * 3] = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.computeVertexNormals();
  const groundMat = mat('#ffffff', { vertexColors: true });
  groundMat.polygonOffset = true;
  groundMat.polygonOffsetFactor = 1.5;
  groundMat.polygonOffsetUnits = 1.5;
  const mesh = new THREE.Mesh(geo, groundMat);
  mesh.position.z = shiftZ;
  mesh.userData.receiveOnly = true;
  mesh.name = 'terrain';
  g.add(mesh);

  const plain = new THREE.Mesh(new THREE.PlaneGeometry(130, 130), mat('#b08968'));
  plain.rotation.x = -Math.PI / 2;
  plain.position.set(0, 0.025, -18);
  plain.userData.receiveOnly = true;
  plain.name = 'plain';
  g.add(plain);
}

function makeMesas(g) {
  for (const mesa of site.mesas) {
    const grp = new THREE.Group();
    grp.name = mesa.id;
    grp.position.set(mesa.x, 0, mesa.z);
    grp.rotation.y = mesa.yaw || 0;
    let y = -0.2;
    mesa.tiers.forEach((tier, i) => {
      let mesh;
      if (tier.shape === 'cone') {
        mesh = new THREE.Mesh(new THREE.CylinderGeometry(tier.rTop, tier.rBot, tier.h, 7), mat(tier.color));
      } else {
        mesh = new THREE.Mesh(new THREE.BoxGeometry(tier.w, tier.h, tier.d), mat(tier.color));
        mesh.position.x = (i % 2 === 0 ? -1 : 1) * 0.12;
        mesh.position.z = ((i % 3) - 1) * 0.08;
      }
      mesh.position.y = y + tier.h / 2;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      grp.add(mesh);
      y += tier.h;
    });
    if (mesa.spire) {
      const s = mesa.spire;
      const spire = new THREE.Mesh(new THREE.BoxGeometry(s.w, s.h, s.d), mat(s.color));
      spire.position.set(s.dx, 2.4 + s.h / 2, s.dz);
      spire.castShadow = true;
      grp.add(spire);
      const cap = new THREE.Mesh(new THREE.BoxGeometry(s.w + 0.18, 0.28, s.d + 0.12), mat('#e0c8a4'));
      cap.position.set(s.dx, 2.4 + s.h + 0.1, s.dz);
      grp.add(cap);
    }
    g.add(grp);
  }
}

function roofHeight(u, v) {
  const ridge = 2.26 - 0.12 * (u / 2.25) ** 2;
  const side = Math.min(1, Math.abs(v) / 1.65);
  const sag = 0.05 * Math.sin((u / 4.5 + 0.5) * Math.PI) * (1 - side);
  return ridge * (1 - side) + 1.84 * side - sag;
}

function makeTent(g) {
  const y0 = site.padHeight();
  const rug = new THREE.Mesh(
    new THREE.BoxGeometry(site.RUG.hw * 2, 0.028, site.RUG.hd * 2),
    mat('#6d5644')
  );
  rug.position.set(site.RUG.x, y0 + 0.014, site.RUG.z);
  g.add(rug);
  const stripes = [
    { w: 3.2, d: 0.22, x: 0.05, z: -0.62, c: '#8a3a32' },
    { w: 3.15, d: 0.12, x: 0.05, z: -0.38, c: '#e6d8bc' },
    { w: 0.18, d: 2.15, x: -0.35, z: 0.05, c: '#2c3a4a' },
    { w: 2.2, d: 0.28, x: 0.2, z: 0.42, c: '#a86a42' },
    { w: 0.95, d: 0.62, x: 0.08, z: -0.02, c: '#7a2e2a' },
  ];
  for (const s of stripes) {
    addBox(g, s.w, 0.01, s.d, mat(s.c), site.RUG.x + s.x, y0 + 0.032, site.RUG.z + s.z);
  }

  for (const seat of site.cushions()) {
    const grp = new THREE.Group();
    grp.name = seat.id;
    grp.position.set(seat.x, y0, seat.z);
    grp.rotation.y = seat.yaw;
    addBox(grp, 0.58, 0.1, 0.46, mat(seat.color), 0, 0.078, 0.04);
    addBox(grp, 0.58, 0.22, 0.15, mat(seat.color), 0, 0.14, -0.18);
    addBox(grp, 0.2, 0.07, 0.15, mat(seat.pip), 0.08, 0.17, 0.06);
    g.add(grp);
  }

  const table = site.tablePoint();
  const top = site.tableTopY();
  const apronH = top - y0 - 0.012;
  addBox(g, 0.62, apronH, 0.4, mat('#5c4030'), table.x, y0 + apronH / 2, table.z);
  addBox(g, 0.74, 0.028, 0.5, mat('#8a6242'), table.x, top - 0.014, table.z);

  const cx = site.TENT.x;
  const cz = site.TENT.z - 0.06;
  const uw = 4.5;
  const ud = 3.3;
  const geo = new THREE.PlaneGeometry(uw, ud, 16, 10);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    pos.setY(i, y0 + roofHeight(pos.getX(i), pos.getZ(i)));
  }
  geo.computeVertexNormals();
  const roof = new THREE.Mesh(geo, mat('#c2ad88', { side: THREE.DoubleSide }));
  roof.position.set(cx, 0, cz);
  roof.name = 'tent-roof';
  g.add(roof);

  const bands = ['#1b1916', '#e6decc', '#1b1916', '#d8d0bc', '#1b1916', '#efe6d6', '#1b1916', '#d4ccb8', '#1b1916', '#e4dcc8'];
  stripedCloth(g, 4.25, 1.58, cx, y0, cz - 1.58, 0, bands);
  stripedCloth(g, 2.35, 1.42, cx - 2.12, y0, cz - 0.35, Math.PI / 2, bands);

  const poleSpots = [
    [-2.12, -1.5],
    [2.12, -1.5],
    [-2.12, 1.5],
    [2.12, 1.5],
    [-0.85, 0],
    [0.95, 0],
  ];
  for (const [u, v] of poleSpots) {
    const h = roofHeight(u, v);
    addCyl(g, 0.045, 0.055, h, mat('#6b4a32'), cx + u, y0 + h / 2, cz + v, 8);
    const out = 0.85;
    const sx = cx + u + Math.sign(u || 1) * out;
    const sz = cz + v + Math.sign(v || 0.2) * out * 0.65;
    cylBetween(g, [cx + u, y0 + h - 0.05, cz + v], [sx, y0 + 0.05, sz], 0.008, mat('#4a3a2c'), 4);
    addCyl(g, 0.03, 0.04, 0.08, mat('#5a4634'), sx, y0 + 0.04, sz, 6);
  }

  lantern(g, cx + 1.55, y0, cz + 1.15);
  lantern(g, cx - 1.7, y0, cz - 1.25);

  // Clay jar by the open east side, human-scale, not a second table.
  addCyl(g, 0.1, 0.13, 0.28, mat('#a86848'), cx + 1.85, y0 + 0.14, cz + 0.55, 10);
  addCyl(g, 0.07, 0.09, 0.08, mat('#c48a62'), cx + 1.85, y0 + 0.32, cz + 0.55, 8);
}

function stripedCloth(g, w, h, x, y, z, rotY, bands) {
  const grp = new THREE.Group();
  const bh = h / bands.length;
  bands.forEach((c, i) => {
    addBox(grp, w, bh + 0.012, 0.045, mat(c), 0, bh * i + bh / 2, 0);
  });
  grp.position.set(x, y, z);
  grp.rotation.y = rotY;
  g.add(grp);
}

function lantern(g, x, y, z) {
  addBox(g, 0.11, 0.15, 0.11, mat('#5c4328'), x, y + 0.09, z);
  addBox(g, 0.07, 0.09, 0.07, mat('#ffb15a', { emissive: '#ff9a3c', emissiveIntensity: 0.65 }), x, y + 0.1, z);
  addBox(g, 0.13, 0.02, 0.13, mat('#3a2c1c'), x, y + 0.175, z);
}

function footprintMin(cx, cz, hw, hd) {
  let m = Infinity;
  for (let i = 0; i <= 4; i++) {
    for (let j = 0; j <= 4; j++) {
      m = Math.min(m, site.heightAt(cx - hw + (2 * hw * i) / 4, cz - hd + (2 * hd * j) / 4));
    }
  }
  return m;
}

function makeDeck(g) {
  const surface = site.deckSurfaceY();
  const { x, z, hw, hd } = site.DECK;
  const bury = footprintMin(x, z, hw + 0.2, hd + 0.35) - 0.5;
  const fasciaTop = surface - 0.04;
  addBox(g, hw * 2, fasciaTop - bury, hd * 2, mat('#5a4030'), x, (fasciaTop + bury) / 2, z);
  const plankW = 0.2;
  const gap = 0.022;
  const count = Math.floor((hw * 2 - 0.08) / (plankW + gap));
  for (let i = 0; i < count; i++) {
    const px = x - hw + 0.08 + plankW / 2 + i * (plankW + gap);
    addBox(
      g,
      plankW,
      0.045,
      hd * 2 - 0.1,
      mat(i % 2 ? '#7d5c3e' : '#6a4c34'),
      px,
      surface - 0.022,
      z
    );
  }

  const railY = surface + 0.36;
  const posts = [];
  for (let i = 0; i <= 4; i++) {
    const px = x - hw + 0.12 + ((hw * 2 - 0.24) * i) / 4;
    posts.push([px, z - hd + 0.08]);
  }
  for (let i = 1; i <= 3; i++) {
    const pz = z - hd + 0.08 + ((hd * 2 - 0.5) * i) / 3;
    posts.push([x - hw + 0.08, pz]);
  }
  for (const [px, pz] of posts) {
    addCyl(g, 0.035, 0.04, 0.74, mat('#6b4e36'), px, surface + 0.37, pz, 6);
  }
  addBox(g, hw * 2 - 0.08, 0.04, 0.05, mat('#7a5a3c'), x, railY + 0.32, z - hd + 0.08);
  addBox(g, 0.05, 0.04, hd * 2 - 0.4, mat('#7a5a3c'), x - hw + 0.08, railY + 0.32, z - 0.12);

  // Treads are columns sunk below the slope, so the stair cannot hover.
  const rise = 0.15;
  const run = 0.36;
  const stairX = 3.85;
  const stairW = 1.3;
  const topZ = z + hd - 0.04;
  const nSteps = 4;
  const farZ = topZ + nSteps * run;
  const stairBottom = footprintMin(stairX, (topZ + farZ) / 2, stairW / 2, (farZ - topZ) / 2) - 0.4;
  for (let i = 1; i <= nSteps; i++) {
    const tread = surface - i * rise;
    const zc = topZ + run * (i - 0.5);
    const h = Math.max(0.08, tread - stairBottom);
    addBox(g, stairW, h, run + 0.05, mat(i % 2 ? '#6d5138' : '#7a5c40'), stairX, stairBottom + h / 2, zc);
  }

  const stool = site.stoolPose();
  const seat = new THREE.Group();
  seat.name = 'scope-stool';
  seat.position.set(stool.x, surface, stool.z);
  seat.rotation.y = stool.yaw;
  addCyl(seat, 0.16, 0.16, 0.04, mat('#7a5a3c'), 0, 0.46, 0, 10);
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2;
    cylBetween(
      seat,
      [Math.sin(a) * 0.11, 0.44, Math.cos(a) * 0.11],
      [Math.sin(a) * 0.16, 0.02, Math.cos(a) * 0.16],
      0.015,
      mat('#4a3428'),
      6
    );
  }
  g.add(seat);
  addBox(g, 0.22, 0.015, 0.16, mat('#2a2624'), stool.x + 0.18, surface + 0.02, stool.z + 0.05);

  const scope = new THREE.Group();
  scope.name = 'telescope';
  scope.position.set(site.SCOPE.x, surface, site.SCOPE.z);
  scope.rotation.y = site.SCOPE.yaw;
  const { parts } = site.telescopeParts();
  for (const p of parts) {
    const seg = p.name === 'optical-tube' || p.name === 'dew-shield' ? 18 : 8;
    const mesh = cylBetween(scope, p.a, p.b, p.radius, mat(p.color), seg);
    if (mesh) mesh.name = p.name;
  }
  for (const p of parts) {
    if (p.name !== 'tripod-leg') continue;
    addCyl(scope, 0.045, 0.05, 0.02, mat('#141618'), p.a[0], 0.01, p.a[2], 8);
  }
  g.add(scope);
  lantern(g, x + hw - 0.35, surface, z + 0.15);
}

function leafFan(g, origin, dir, length, radius, material, seg = 6) {
  const end = [
    origin[0] + dir[0] * length,
    origin[1] + dir[1] * length,
    origin[2] + dir[2] * length,
  ];
  cylBetween(g, origin, end, radius, material, seg);
}

function ocotillo(g, x, z, scale, rot) {
  const y = site.heightAt(x, z);
  const rng = mulberry32((Math.abs(Math.floor(x * 97 + z * 53)) + 3) >>> 0);
  const canes = 8 + Math.floor(rng() * 3);
  for (let i = 0; i < canes; i++) {
    const a = rot + (i / canes) * Math.PI * 2 + rng() * 0.25;
    const h = (1.45 + rng() * 0.95) * scale;
    let px = x + Math.cos(a) * 0.04;
    let py = y + 0.02;
    let pz = z + Math.sin(a) * 0.04;
    for (let s = 0; s < 3; s++) {
      const lean = (0.16 + rng() * 0.14) * ((s + 1) / 3);
      const nx = x + Math.cos(a) * lean * h;
      const ny = py + h / 3;
      const nz = z + Math.sin(a) * lean * h;
      const color = s === 2 ? '#7a3e36' : '#6a4a32';
      cylBetween(g, [px, py, pz], [nx, ny, nz], (0.014 - s * 0.003) * scale, mat(color), 5);
      px = nx;
      py = ny;
      pz = nz;
    }
  }
}

function creosote(g, x, z, scale, rot) {
  const y = site.heightAt(x, z);
  const rng = mulberry32((Math.abs(Math.floor(x * 61 + z * 88 + rot * 10)) + 11) >>> 0);
  const twigs = 14 + Math.floor(rng() * 6);
  for (let i = 0; i < twigs; i++) {
    const a = rot + rng() * Math.PI * 2;
    const lift = 0.35 + rng() * 0.85;
    const reach = (0.18 + rng() * 0.42) * scale;
    const h = (0.35 + rng() * 0.55) * scale;
    const ox = Math.cos(a) * 0.05;
    const oz = Math.sin(a) * 0.05;
    cylBetween(
      g,
      [x + ox, y + 0.02, z + oz],
      [x + ox + Math.cos(a) * reach, y + h * lift, z + oz + Math.sin(a) * reach],
      0.008 * scale,
      mat(rng() > 0.5 ? '#6d7048' : '#8a8460'),
      4
    );
    addBox(
      g,
      0.08 * scale,
      0.045 * scale,
      0.06 * scale,
      mat('#7d7a52'),
      x + ox + Math.cos(a) * reach,
      y + h * lift,
      z + oz + Math.sin(a) * reach
    );
  }
}

function agave(g, x, z, scale, rot) {
  const y = site.heightAt(x, z);
  const rng = mulberry32((Math.abs(Math.floor(x * 41 + z * 29)) + 5) >>> 0);
  const n = 11 + Math.floor(rng() * 3);
  for (let i = 0; i < n; i++) {
    const a = rot + (i / n) * Math.PI * 2 + rng() * 0.2;
    const up = 0.28 + rng() * 0.45;
    const len = (0.42 + rng() * 0.28) * scale;
    leafFan(
      g,
      [x, y + 0.04, z],
      [Math.cos(a) * Math.cos(up), Math.sin(up), Math.sin(a) * Math.cos(up)],
      len,
      0.028 * scale,
      mat(i % 2 ? '#5e6a48' : '#7a8060'),
      5
    );
  }
}

function yucca(g, x, z, scale, rot) {
  const y = site.heightAt(x, z);
  addCyl(g, 0.05 * scale, 0.08 * scale, 0.42 * scale, mat('#6a5438'), x, y + 0.2 * scale, z, 7);
  const n = 9;
  for (let i = 0; i < n; i++) {
    const a = rot + (i / n) * Math.PI * 2;
    leafFan(
      g,
      [x, y + 0.4 * scale, z],
      [Math.cos(a) * 0.55, 0.55, Math.sin(a) * 0.55],
      0.48 * scale,
      0.02 * scale,
      mat('#6a7048'),
      5
    );
  }
  addCyl(g, 0.012, 0.016, 0.7 * scale, mat('#5a4a34'), x + 0.02, y + 0.75 * scale, z, 5);
  addCyl(g, 0.03, 0.05, 0.16 * scale, mat('#8a8468'), x + 0.02, y + 1.12 * scale, z, 6);
}

function barrel(g, x, z, scale, rot) {
  const y = site.heightAt(x, z);
  const grp = new THREE.Group();
  grp.position.set(x, y, z);
  grp.rotation.y = rot;
  addCyl(grp, 0.12 * scale, 0.16 * scale, 0.12 * scale, mat('#3f6848'), 0, 0.06 * scale, 0, 10);
  addCyl(grp, 0.18 * scale, 0.16 * scale, 0.22 * scale, mat('#3a6044'), 0, 0.2 * scale, 0, 10);
  addCyl(grp, 0.1 * scale, 0.16 * scale, 0.12 * scale, mat('#4a7050'), 0, 0.34 * scale, 0, 10);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    addBox(
      grp,
      0.02 * scale,
      0.3 * scale,
      0.03 * scale,
      mat('#2f5238'),
      Math.cos(a) * 0.16 * scale,
      0.2 * scale,
      Math.sin(a) * 0.16 * scale
    );
  }
  if (scale > 0.75) {
    addCyl(grp, 0.05 * scale, 0.04 * scale, 0.04 * scale, mat('#c4a05a'), 0.04 * scale, 0.4 * scale, 0, 8);
  }
  g.add(grp);
}

function cholla(g, x, z, scale, rot) {
  const y = site.heightAt(x, z);
  const rng = mulberry32((Math.abs(Math.floor(x * 77 + z * 19)) + 9) >>> 0);
  const grow = (from, segs, dir, depth) => {
    let p = from.slice();
    for (let s = 0; s < segs; s++) {
      const len = (0.16 + rng() * 0.08) * scale;
      const jitter = [(rng() - 0.5) * 0.5, 0.55 + rng() * 0.4, (rng() - 0.5) * 0.5];
      const d = [dir[0] + jitter[0], dir[1] + jitter[1], dir[2] + jitter[2]];
      const m = Math.hypot(d[0], d[1], d[2]) || 1;
      const n = [p[0] + (d[0] / m) * len, p[1] + (d[1] / m) * len, p[2] + (d[2] / m) * len];
      cylBetween(g, p, n, 0.03 * scale, mat('#6a7848'), 6);
      if (depth < 1 && s === 1 && rng() > 0.45) {
        grow(n, 2, [dir[0] + (rng() - 0.5), 0.15, dir[2] + (rng() - 0.5)], depth + 1);
      }
      p = n;
    }
  };
  grow([x, y + 0.02, z], 3, [Math.cos(rot), 0.2, Math.sin(rot)], 0);
  grow([x, y + 0.02, z], 3, [Math.cos(rot + 2.2), 0.15, Math.sin(rot + 2.2)], 0);
}

function sage(g, x, z, scale, rot) {
  const y = site.heightAt(x, z);
  const rng = mulberry32((Math.abs(Math.floor(x * 23 + z * 47)) + 4) >>> 0);
  for (let clump = 0; clump < 3; clump++) {
    const ox = Math.cos(rot + clump) * 0.18 * scale * clump;
    const oz = Math.sin(rot + clump * 1.7) * 0.16 * scale * clump;
    const twigs = 7;
    for (let i = 0; i < twigs; i++) {
      const a = rng() * Math.PI * 2;
      const h = (0.16 + rng() * 0.22) * scale;
      cylBetween(
        g,
        [x + ox, y, z + oz],
        [x + ox + Math.cos(a) * 0.16 * scale, y + h, z + oz + Math.sin(a) * 0.16 * scale],
        0.007,
        mat('#8a8668'),
        4
      );
    }
  }
}

function makePlants(g) {
  const builders = { ocotillo, creosote, agave, yucca, barrel, cholla, sage };
  for (const p of site.plants) builders[p.kind](g, p.x, p.z, p.scale, p.rot);
}

function makeRocks(g) {
  for (const r of site.rocks) {
    const y = site.heightAt(r.x, r.z);
    const grp = new THREE.Group();
    grp.name = r.id;
    grp.position.set(r.x, y, r.z);
    grp.rotation.y = r.rot;
    const s = r.scale;
    if (r.kind === 'hoodoo') {
      addCyl(grp, 0.38 * s, 0.5 * s, 0.36 * s, mat('#b07850'), 0, 0.02 * s, 0, 6);
      addCyl(grp, 0.22 * s, 0.28 * s, 0.55 * s, mat('#a85a42'), 0.04 * s, 0.4 * s, 0, 6);
      addCyl(grp, 0.48 * s, 0.36 * s, 0.22 * s, mat('#d2b48a'), -0.02 * s, 0.72 * s, 0.04 * s, 6);
    } else if (r.kind === 'slab') {
      const slab = addBox(grp, 1.1 * s, 0.16 * s, 0.7 * s, mat('#c49a6a'), 0, 0.02 * s, 0);
      slab.rotation.z = 0.08;
      slab.rotation.x = 0.12;
      addBox(grp, 0.7 * s, 0.1 * s, 0.45 * s, mat('#a86848'), 0.2 * s, 0.1 * s, 0.05 * s);
    } else if (r.kind === 'strata') {
      addBox(grp, 1.3 * s, 0.22 * s, 0.8 * s, mat('#a85a42'), 0, 0.04 * s, 0);
      addBox(grp, 1.15 * s, 0.16 * s, 0.7 * s, mat('#d2b48a'), 0.08 * s, 0.2 * s, 0.04 * s);
      addBox(grp, 0.9 * s, 0.18 * s, 0.55 * s, mat('#8d4e3a'), -0.05 * s, 0.36 * s, -0.02 * s);
    } else {
      addCyl(grp, 0.28 * s, 0.34 * s, 0.32 * s, mat('#b06848'), 0, 0.06 * s, 0, 6);
      addCyl(grp, 0.18 * s, 0.22 * s, 0.2 * s, mat('#c48a5c'), 0.12 * s, 0.16 * s, 0.08 * s, 5);
    }
    g.add(grp);
  }
}

function makeMarkers(g) {
  for (const m of site.pathMarkers()) {
    const y = site.heightAt(m.x, m.z);
    if (m.lamp) {
      addCyl(g, 0.11, 0.14, 0.1, mat('#a08060'), m.x, y + 0.03, m.z, 6);
      addCyl(g, 0.05, 0.07, 0.08, mat('#8a5038'), m.x, y + 0.11, m.z, 8);
      addCyl(g, 0.03, 0.04, 0.03, mat('#ffb15a', { emissive: '#ff9a3c', emissiveIntensity: 0.55 }), m.x, y + 0.15, m.z, 8);
    } else {
      addCyl(g, 0.08, 0.12, m.height, mat('#b09070'), m.x, y + m.height / 2 - 0.02, m.z, 6);
    }
  }
}

function makePebbles(g) {
  const rng = mulberry32(77);
  const spots = [
    [-0.4, 2.2],
    [0.8, 1.7],
    [1.4, 2.6],
    [-2.4, 3.3],
    [2.6, 2.4],
    [-3.2, 5.1],
    [4.8, 2.8],
    [5.4, -3.1],
    [-7.2, 5.4],
    [0.2, 4.6],
  ];
  for (const [x, z] of spots) {
    if (site.onRug(x, z) || site.onDeck(x, z) || site.distToPath(x, z) < 0.45) continue;
    const y = site.heightAt(x, z);
    const s = 0.08 + rng() * 0.1;
    const rock = addBox(g, s, s * 0.45, s * 0.7, mat(rng() > 0.5 ? '#a07858' : '#8a5a44'), x, y + s * 0.12, z);
    rock.rotation.y = rng() * 3;
  }
}

function makeShell() {
  const g = new THREE.Group();
  g.name = 'desert';
  makeSky(g);
  makeTerrain(g);
  makeMesas(g);
  makeRocks(g);
  makePlants(g);
  makeMarkers(g);
  makePebbles(g);
  makeTent(g);
  makeDeck(g);
  return g;
}

boot({
  makeShell,
  readyText: 'ready — desert stargazing camp · drag orbit · U unlit · T toon',
});
