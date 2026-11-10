import * as THREE from './vendor/three.module.js';

/** Metres. Water at y=0. The L opens toward +X (east) and +Z (south). */
export const SITE = Object.freeze({
  deckY: 1.22,
  terraceY: 1.7,
  laneY: 2.05,
  wallZ: -1.15,
  wallX: -8.6,
  deckNorth: -6.4,
  deckWest: -12.6,
  quayX1: 7.2,
  quayZ1: 8.2,
  boatA: { x: 0.9, z: 0.42, rot: 0, length: 7.4, beam: 2.48 },
  boatB: { x: -7.42, z: 4.0, rot: -Math.PI / 2, length: 5.05, beam: 1.68 },
});

function mulberry32(seed) {
  let a = seed >>> 0;
  return function rand() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rand = mulberry32(4097);

function hash2(x, y) {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return s - Math.floor(s);
}

function makeTex(w, h, fn) {
  const data = new Uint8Array(w * h * 4);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const c = fn(x, y, w, h);
      const i = (y * w + x) * 4;
      data[i] = c[0];
      data[i + 1] = c[1];
      data[i + 2] = c[2];
      data[i + 3] = c[3] ?? 255;
    }
  }
  const tex = new THREE.DataTexture(data, w, h, THREE.RGBAFormat);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.flipY = true;
  tex.needsUpdate = true;
  return tex;
}

function stonePixel(x, y) {
  const course = 20;
  const cy = Math.floor(y / course);
  const jitter = ((cy * 13) % 9) - 4;
  const mortarH = (y % course) < 2;
  const blockW = 26 + (cy % 4) * 7;
  const mortarV = ((x + jitter + 64) % blockW) < 2;
  const n = hash2(x, y);
  let r = 124 + n * 36;
  let g = 118 + n * 28;
  let b = 106 + n * 22;
  if ((cy + Math.floor(x / blockW)) % 7 === 0) {
    r += 10;
    g += 8;
    b += 6;
  }
  if (mortarH || mortarV) {
    r *= 0.68;
    g *= 0.66;
    b *= 0.62;
  } else if (n > 0.93) {
    g += 16;
    r -= 10;
  }
  return [r | 0, g | 0, b | 0, 255];
}

const stoneTex = makeTex(256, 256, (x, y) => stonePixel(x, y));
stoneTex.magFilter = THREE.LinearFilter;
stoneTex.minFilter = THREE.LinearMipmapLinearFilter;
stoneTex.generateMipmaps = true;

const deckTex = makeTex(256, 256, (x, y) => {
  const c = stonePixel(x, y);
  return [
    Math.min(255, c[0] + 12),
    Math.min(255, c[1] + 8),
    Math.min(255, c[2] + 4),
    255,
  ];
});
deckTex.magFilter = THREE.LinearFilter;
deckTex.minFilter = THREE.LinearMipmapLinearFilter;
deckTex.generateMipmaps = true;

const woodTex = makeTex(128, 256, (x, y) => {
  const plank = 14;
  const gap = (x % plank) === 0;
  const n = hash2(x, y);
  const shade = 0.78 + ((Math.floor(x / plank) * 37) % 10) * 0.025 + n * 0.08;
  let r = 92 * shade;
  let g = 70 * shade;
  let b = 52 * shade;
  if (gap) {
    r *= 0.55;
    g *= 0.55;
    b *= 0.55;
  }
  if (n > 0.97) {
    r *= 0.7;
    g *= 0.65;
  }
  return [r | 0, g | 0, b | 0, 255];
});
woodTex.magFilter = THREE.LinearFilter;
woodTex.minFilter = THREE.LinearMipmapLinearFilter;
woodTex.generateMipmaps = true;

const roofTex = makeTex(64, 128, (x, y) => {
  const ridge = (y % 5) < 2;
  const n = hash2(x, y);
  const rust = n > 0.82;
  const base = ridge ? (rust ? [112, 64, 48] : [78, 76, 74]) : (rust ? [138, 78, 56] : [98, 94, 90]);
  const s = 0.86 + n * 0.22;
  return [(base[0] * s) | 0, (base[1] * s) | 0, (base[2] * s) | 0, 255];
});
roofTex.magFilter = THREE.LinearFilter;
roofTex.minFilter = THREE.LinearFilter;

const netTex = makeTex(64, 64, (x, y) => {
  const gap = 5;
  const line = (x % gap) === 0 || (y % gap) === 0;
  return line ? [186, 196, 190, 255] : [0, 0, 0, 0];
});
netTex.magFilter = THREE.NearestFilter;
netTex.minFilter = THREE.NearestFilter;
netTex.generateMipmaps = false;

const awningTex = makeTex(64, 32, (x) => {
  const stripe = Math.floor(x / 8) % 2 === 0;
  return stripe ? [168, 78, 64, 255] : [236, 226, 206, 255];
});
awningTex.magFilter = THREE.LinearFilter;
awningTex.minFilter = THREE.LinearFilter;

const FONT = {
  C: ['01110', '10001', '10000', '10000', '10000', '10001', '01110'],
  A: ['01110', '10001', '10001', '11111', '10001', '10001', '10001'],
  F: ['11110', '10000', '10000', '11100', '10000', '10000', '10000'],
  E: ['11111', '10000', '10000', '11110', '10000', '10000', '11111'],
  I: ['11111', '00100', '00100', '00100', '00100', '00100', '11111'],
  S: ['01111', '10000', '10000', '01110', '00001', '00001', '11110'],
  H: ['10001', '10001', '10001', '11111', '10001', '10001', '10001'],
};

function signTex(word, fg, bg) {
  const scale = 6;
  const gw = 5;
  const gh = 7;
  const gap = 1;
  const cols = word.length * (gw + gap) - gap;
  const W = cols * scale + scale * 4;
  const H = gh * scale + scale * 4;
  const ox = scale * 2;
  const oy = scale * 2;
  return makeTex(W, H, (x, y) => {
    if (x < 3 || y < 3 || x >= W - 3 || y >= H - 3) return fg;
    const gx = x - ox;
    const gy = y - oy;
    if (gx < 0 || gy < 0) return bg;
    const stride = (gw + gap) * scale;
    const ci = Math.floor(gx / stride);
    if (ci < 0 || ci >= word.length) return bg;
    const lx = gx - ci * stride;
    const col = Math.floor(lx / scale);
    const row = Math.floor(gy / scale);
    if (col < 0 || row < 0 || col >= gw || row >= gh) return bg;
    const glyph = FONT[word[ci]];
    if (!glyph || glyph[row][col] !== '1') return bg;
    return fg;
  });
}

const matCache = new Map();

function mat(color, opts = {}) {
  const key = `${color}|${opts.vertex ? 1 : 0}|${opts.side || 0}|${opts.flat ? 1 : 0}|${opts.alpha || 0}|${opts.map || ''}|${opts.fog === false ? 0 : 1}`;
  if (matCache.has(key)) return matCache.get(key);
  const m = new THREE.MeshToonMaterial({
    color: opts.vertex ? '#ffffff' : color,
    vertexColors: !!opts.vertex,
    side: opts.side ?? THREE.FrontSide,
  });
  if (opts.map) m.map = opts.map;
  if (opts.alpha) m.alphaTest = opts.alpha;
  if (opts.fog === false) m.fog = false;
  if (opts.depthWrite === false) m.depthWrite = false;
  matCache.set(key, m);
  return m;
}

const M = {
  stone: () => mat('#8a8478', { map: 'stone' }),
  deck: () => mat('#948e84', { map: 'deck' }),
  wood: () => mat('#6b5344', { map: 'wood' }),
  roof: () => mat('#6e4e44', { map: 'roof' }),
  net: () => mat('#c5cdc8', { map: 'net', alpha: 0.45, side: THREE.DoubleSide }),
  awning: () => mat('#ffffff', { map: 'awning', side: THREE.DoubleSide }),
};

function bindMaps() {
  M.stone = () => {
    const m = mat('#9a948c');
    m.map = stoneTex;
    return m;
  };
  M.deck = () => {
    const m = mat('#a39e94');
    m.map = deckTex;
    return m;
  };
  M.wood = () => {
    const m = mat('#6b5344');
    m.map = woodTex;
    return m;
  };
  M.roof = () => {
    const m = mat('#6e4e44');
    m.map = roofTex;
    return m;
  };
  M.net = () => {
    const m = mat('#d5ddd8', { side: THREE.DoubleSide, alpha: 0.45 });
    m.map = netTex;
    return m;
  };
  M.awning = () => {
    const m = mat('#ffffff', { side: THREE.DoubleSide });
    m.map = awningTex;
    return m;
  };
}
bindMaps();

function addBox(parent, w, h, d, material, x, y, z, name) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  if (name) mesh.name = name;
  parent.add(mesh);
  return mesh;
}

function addCyl(parent, rTop, rBot, h, material, x, y, z, seg = 10, name) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBot, h, seg), material);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  if (name) mesh.name = name;
  parent.add(mesh);
  return mesh;
}

function flagShadow(mesh, cast = true, receive = true) {
  mesh.userData.noShadow = !cast;
  mesh.userData.noReceive = !receive;
  mesh.castShadow = cast;
  mesh.receiveShadow = receive;
  return mesh;
}

function geoMesh(geo, material, name) {
  geo.computeVertexNormals();
  const mesh = new THREE.Mesh(geo, material);
  if (name) mesh.name = name;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function flipIndex(geo) {
  const index = geo.getIndex();
  const arr = index.array;
  for (let i = 0; i < arr.length; i += 3) {
    const t = arr[i + 1];
    arr[i + 1] = arr[i + 2];
    arr[i + 2] = t;
  }
  index.needsUpdate = true;
  geo.computeVertexNormals();
}

function sectionHalf(u, beam, tumble) {
  let s;
  if (u < 0.16) s = Math.pow(u / 0.16, 0.85) * 0.42;
  else if (u < 0.58) {
    const t = (u - 0.16) / 0.42;
    s = 0.42 + 0.58 * Math.sin(t * Math.PI * 0.5);
  } else {
    const t = (u - 0.58) / 0.42;
    s = 1 - t * tumble;
  }
  return (beam / 2) * s;
}

function makeHull(spec) {
  const seg = 12;
  const { length, stations, clinker } = spec;
  const rows = stations.map((st) => {
    const ring = [];
    for (let i = 0; i <= seg; i++) {
      const u = i / seg;
      const y = st.keel + (st.sheer - st.keel) * Math.pow(u, 0.92);
      let half = sectionHalf(u, st.beam, st.tumble ?? 0.1);
      if (clinker && u > 0.14 && u < 0.9 && Math.floor(u * 5) % 2 === 0) half += 0.016;
      const x = (st.t - 0.5) * length + (st.rake ?? 0) * u;
      ring.push({ x, y, half, u });
    }
    return ring;
  });

  const positions = [];
  const colors = [];
  const indexGrid = [];
  const bottom = new THREE.Color(spec.colors.bottom);
  const boot = new THREE.Color(spec.colors.boot);
  const top = new THREE.Color(spec.colors.top);
  const scum = new THREE.Color('#3e4a44');

  function push(x, y, z, u) {
    let col = u < 0.2 ? bottom : u < 0.3 ? boot : top;
    col = col.clone();
    if (Math.abs(y) < 0.07) col.lerp(scum, 0.55);
    const grit = 0.9 + 0.1 * hash2(Math.round(x * 12), Math.round((y + z) * 18));
    col.multiplyScalar(grit);
    positions.push(x, y, z);
    colors.push(col.r, col.g, col.b);
    return positions.length / 3 - 1;
  }

  for (const ring of rows) {
    const pair = [];
    for (const p of ring) {
      pair.push({
        star: push(p.x, p.y, p.half, p.u),
        port: push(p.x, p.y, -p.half, p.u),
      });
    }
    indexGrid.push(pair);
  }

  const indices = [];
  for (let s = 0; s < indexGrid.length - 1; s++) {
    for (let i = 0; i < seg; i++) {
      const a = indexGrid[s][i];
      const b = indexGrid[s][i + 1];
      const c = indexGrid[s + 1][i];
      const d = indexGrid[s + 1][i + 1];
      indices.push(a.star, c.star, d.star, a.star, d.star, b.star);
      indices.push(a.port, b.port, d.port, a.port, d.port, c.port);
    }
  }
  const stern = indexGrid[0];
  for (let i = 0; i < seg; i++) {
    indices.push(stern[0].star, stern[i + 1].star, stern[i].star);
    indices.push(stern[0].port, stern[i].port, stern[i + 1].port);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  const pos = geo.attributes.position;
  const nor = geo.attributes.normal;
  for (let i = 0; i < pos.count; i++) {
    if (pos.getZ(i) > 0.15) {
      if (nor.getZ(i) < 0) flipIndex(geo);
      break;
    }
  }

  let midBeam = 0;
  let bowBeam = 0;
  for (const st of stations) {
    if (st.t > 0.25 && st.t < 0.6) midBeam = Math.max(midBeam, st.beam);
    if (st.t > 0.95) bowBeam = st.beam;
  }
  return {
    geo,
    rows,
    profile: { midBeam, bowBeam, length },
  };
}

function ropeBetween(a, b, sag, radius, material) {
  const mid = a.clone().lerp(b, 0.5);
  mid.y -= sag;
  const curve = new THREE.CatmullRomCurve3([a.clone(), mid, b.clone()]);
  const geo = new THREE.TubeGeometry(curve, 12, radius, 5, false);
  const mesh = new THREE.Mesh(geo, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function waveY(x, z) {
  return (
    Math.sin(x * 0.42 + z * 0.16) * 0.028
    + Math.sin(z * 0.55 - x * 0.2 + 1.4) * 0.016
    + Math.sin(x * 1.45 + z * 1.25) * 0.006
  );
}

function waterColor(x, z) {
  const dWall = Math.min(Math.abs(z - SITE.wallZ), Math.abs(x - SITE.wallX));
  const shore = THREE.MathUtils.clamp(dWall / 5.2, 0, 1);
  const deep = new THREE.Color('#143e4c');
  const shallow = new THREE.Color('#6d9a8e');
  const c = deep.clone().lerp(shallow, Math.pow(1 - shore, 1.25));
  const under = Math.min(
    Math.hypot(x - SITE.boatA.x, z - SITE.boatA.z),
    Math.hypot(x - SITE.boatB.x, z - SITE.boatB.z),
  );
  if (under < 3.4) c.lerp(new THREE.Color('#0f2c36'), (1 - under / 3.4) * 0.45);
  const swell = 0.5 + 0.5 * Math.sin(x * 0.35 + z * 0.22);
  c.lerp(new THREE.Color('#b7d4cc'), swell * swell * 0.06);
  return c;
}

function addWaterPatch(parent, x0, x1, z0, z1, name, step = 0.36) {
  const sx = Math.max(2, Math.round((x1 - x0) / step));
  const sz = Math.max(2, Math.round((z1 - z0) / step));
  const positions = [];
  const colors = [];
  const indices = [];
  const stride = sx + 1;
  for (let iz = 0; iz <= sz; iz++) {
    for (let ix = 0; ix <= sx; ix++) {
      const x = x0 + ((x1 - x0) * ix) / sx;
      const z = z0 + ((z1 - z0) * iz) / sz;
      const y = waveY(x, z);
      positions.push(x, y, z);
      const c = waterColor(x, z);
      colors.push(c.r, c.g, c.b);
    }
  }
  for (let iz = 0; iz < sz; iz++) {
    for (let ix = 0; ix < sx; ix++) {
      const a = iz * stride + ix;
      const b = a + 1;
      const c = a + stride;
      const d = c + 1;
      indices.push(a, c, b, b, c, d);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geo.setIndex(indices);
  const mesh = geoMesh(geo, mat('#ffffff', { vertex: true, side: THREE.DoubleSide }), name);
  // Uniform up-normals keep the toon band even. Depth comes from the vertex colors.
  const normals = mesh.geometry.attributes.normal;
  for (let i = 0; i < normals.count; i++) normals.setXYZ(i, 0, 1, 0);
  normals.needsUpdate = true;
  flagShadow(mesh, false, true);
  parent.add(mesh);
  return mesh;
}

function addFoamStrip(parent, x0, z0, x1, z1, nx, nz) {
  const n = 28;
  const positions = [];
  const colors = [];
  const indices = [];
  const foam = new THREE.Color('#d7e6de');
  const foam2 = new THREE.Color('#edf3ee');
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const x = x0 + (x1 - x0) * t;
    const z = z0 + (z1 - z0) * t;
    const wobble = 0.16 + 0.28 * (0.5 + 0.5 * Math.sin(t * 17.0 + x * 0.7)) + 0.06 * Math.sin(t * 41);
    const y = 0.02 + waveY(x, z) * 0.65;
    positions.push(x, y, z);
    positions.push(x + nx * wobble, y + 0.005, z + nz * wobble);
    const c = foam.clone().lerp(foam2, 0.5 + 0.5 * Math.sin(t * 9));
    colors.push(c.r, c.g, c.b, c.r, c.g, c.b);
  }
  for (let i = 0; i < n; i++) {
    const a = i * 2;
    indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geo.setIndex(indices);
  const mesh = geoMesh(geo, mat('#ffffff', { vertex: true, side: THREE.DoubleSide }), 'water-foam');
  flagShadow(mesh, false, false);
  parent.add(mesh);
}

function addWater(parent) {
  const g = new THREE.Group();
  g.name = 'water';
  addWaterPatch(g, SITE.wallX, 22, SITE.wallZ, 18, 'water-basin', 0.28);
  addWaterPatch(g, SITE.deckWest - 6, SITE.wallX, SITE.quayZ1, 18, 'water-fore', 0.85);
  addWaterPatch(g, -22, SITE.deckWest, -2, 18, 'water-outer', 0.95);
  addFoamStrip(g, SITE.wallX, SITE.wallZ, SITE.quayX1, SITE.wallZ, 0, 1);
  addFoamStrip(g, SITE.wallX, SITE.wallZ, SITE.wallX, SITE.quayZ1, 1, 0);
  addFoamStrip(g, SITE.deckWest, SITE.quayZ1, SITE.wallX, SITE.quayZ1, 0, 1);
  parent.add(g);
}

function deckGeometry() {
  const y = SITE.deckY;
  const S = SITE;
  // Two quads, no overlapping area. North arm includes the landward corner.
  const quads = [
    [
      [S.deckWest, S.deckNorth],
      [S.quayX1, S.deckNorth],
      [S.quayX1, S.wallZ],
      [S.deckWest, S.wallZ],
    ],
    [
      [S.deckWest, S.wallZ],
      [S.wallX, S.wallZ],
      [S.wallX, S.quayZ1],
      [S.deckWest, S.quayZ1],
    ],
  ];
  const positions = [];
  const uvs = [];
  const indices = [];
  for (const q of quads) {
    const base = positions.length / 3;
    for (const [x, z] of q) {
      positions.push(x, y, z);
      uvs.push(x / 2.2, z / 2.2);
    }
    indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  if (geo.attributes.normal.getY(0) < 0) flipIndex(geo);
  return geo;
}

function addWallFace(parent, width, height, material, x, y, z, rotY, name) {
  const geo = new THREE.PlaneGeometry(width, height, 1, 1);
  const pos = geo.attributes.position;
  const uv = geo.attributes.uv;
  for (let i = 0; i < pos.count; i++) {
    uv.setXY(i, (pos.getX(i) + width / 2) / 2.4, (pos.getY(i) + height / 2) / 1.6);
  }
  const mesh = new THREE.Mesh(geo, material);
  mesh.position.set(x, y, z);
  mesh.rotation.y = rotY;
  mesh.receiveShadow = true;
  mesh.castShadow = true;
  if (name) mesh.name = name;
  parent.add(mesh);
  return mesh;
}

function copingRun(parent, x0, z0, x1, z1, ox, oz) {
  const len = Math.hypot(x1 - x0, z1 - z0) || 1;
  const dx = (x1 - x0) / len;
  const dz = (z1 - z0) / len;
  const palette = ['#a39c92', '#8f8980', '#b1a89c', '#7d7872', '#978f84'];
  let t = 0.08;
  while (t < len - 0.25) {
    const stone = 0.68 + rand() * 0.55;
    if (t + stone > len) break;
    const mid = t + stone / 2;
    const x = x0 + dx * mid + ox * (0.02 + rand() * 0.03);
    const z = z0 + dz * mid + oz * (0.02 + rand() * 0.03);
    const h = 0.09 + rand() * 0.04;
    const across = 0.42 + rand() * 0.06;
    const mesh = addBox(
      parent,
      Math.abs(dx) > 0.5 ? stone : across,
      h,
      Math.abs(dz) > 0.5 ? stone : across,
      mat(palette[(rand() * palette.length) | 0]),
      x,
      SITE.deckY + h / 2,
      z,
    );
    mesh.castShadow = true;
    t += stone + 0.025;
  }
}

function addQuay(parent) {
  const g = new THREE.Group();
  g.name = 'quay';
  const deck = geoMesh(deckGeometry(), M.deck(), 'quay-deck');
  g.add(deck);

  const wallH = SITE.deckY + 0.55;
  const wallMid = (SITE.deckY - 0.55) / 2;
  const northLen = SITE.quayX1 - SITE.wallX;
  addWallFace(
    g,
    northLen,
    wallH,
    M.stone(),
    SITE.wallX + northLen / 2,
    wallMid + 0.02,
    SITE.wallZ,
    0,
    'quay-wall-north',
  );
  const westLen = SITE.quayZ1 - SITE.wallZ;
  addWallFace(
    g,
    westLen,
    wallH,
    M.stone(),
    SITE.wallX,
    wallMid + 0.02,
    SITE.wallZ + westLen / 2,
    Math.PI / 2,
    'quay-wall-west',
  );
  const endLen = SITE.wallX - SITE.deckWest;
  addWallFace(
    g,
    endLen,
    wallH,
    M.stone(),
    SITE.deckWest + endLen / 2,
    wallMid + 0.02,
    SITE.quayZ1,
    0,
    'quay-wall-end',
  );
  const eastLen = SITE.wallZ - SITE.deckNorth;
  addBox(
    g,
    0.36,
    wallH,
    eastLen,
    M.stone(),
    SITE.quayX1 - 0.12,
    wallMid + 0.02,
    SITE.deckNorth + eastLen / 2,
    'quay-wall-east',
  );

  // Tide stain and algae, proud of the stone so the waterline reads.
  const bands = [
    { y: 0.1, h: 0.22, color: '#3c5248', name: 'algae' },
    { y: 0.42, h: 0.38, color: '#5a564e', name: 'tide-stain' },
  ];
  for (const b of bands) {
    addBox(g, northLen, b.h, 0.04, mat(b.color), SITE.wallX + northLen / 2, b.y, SITE.wallZ + 0.03, b.name);
    addBox(g, 0.04, b.h, westLen, mat(b.color), SITE.wallX + 0.03, b.y, SITE.wallZ + westLen / 2);
  }

  // A few stones stand proud of the coursed face.
  const proud = [
    [ -2.2, 0.55, 0.34, 0.22 ],
    [ 1.4, 0.78, 0.42, 0.18 ],
    [ 4.1, 0.4, 0.28, 0.26 ],
    [ -6.4, 0.62, 0.36, 0.2 ],
  ];
  for (const [x, y, w, h] of proud) {
    addBox(g, w, h, 0.08, mat('#7a756c'), x, y, SITE.wallZ + 0.05);
  }
  const proudW = [
    [ 1.2, 0.5, 0.2, 0.32 ],
    [ 3.6, 0.85, 0.24, 0.4 ],
    [ 6.1, 0.45, 0.18, 0.28 ],
  ];
  for (const [z, y, h, w] of proudW) {
    addBox(g, 0.08, h, w, mat('#6e6a64'), SITE.wallX + 0.05, y, z);
  }

  copingRun(g, SITE.wallX, SITE.wallZ, SITE.quayX1, SITE.wallZ, 0, 1);
  copingRun(g, SITE.wallX, SITE.wallZ, SITE.wallX, SITE.quayZ1, 1, 0);
  copingRun(g, SITE.deckWest, SITE.quayZ1, SITE.wallX, SITE.quayZ1, 0, 1);

  // Rubbing timbers, broken so they are not one endless beam.
  const timber = mat('#4a3a2c');
  const timberRuns = [
    [ -8.2, -2.4 ],
    [ -1.6, 2.8 ],
    [ 3.4, 6.6 ],
  ];
  for (const [a, b] of timberRuns) {
    addBox(g, b - a, 0.14, 0.16, timber, (a + b) / 2, 0.38, SITE.wallZ + 0.1);
    addBox(g, b - a, 0.12, 0.14, timber, (a + b) / 2, 0.82, SITE.wallZ + 0.09);
  }
  addBox(g, 0.16, 0.14, 3.2, timber, SITE.wallX + 0.1, 0.4, 2.4);
  addBox(g, 0.14, 0.12, 2.4, timber, SITE.wallX + 0.09, 0.84, 5.6);

  // Iron bollards.
  const bollardMat = mat('#3c4144');
  const rust = mat('#7a4e36');
  const spots = [
    { id: 'a-stern', x: -4.6, z: -1.72 },
    { id: 'a-mid', x: 0.2, z: -1.72 },
    { id: 'a-bow', x: 5.45, z: -1.72 },
    { id: 'b-stern', x: -9.25, z: 1.25 },
    { id: 'b-mid', x: -9.25, z: 4.0 },
    { id: 'b-bow', x: -9.25, z: 7.25 },
  ];
  g.userData.bollards = {};
  for (const s of spots) {
    const b = new THREE.Group();
    b.name = `bollard-${s.id}`;
    const base = addCyl(b, 0.16, 0.18, 0.08, bollardMat, 0, 0.04, 0, 8);
    base.castShadow = true;
    addCyl(b, 0.09, 0.11, 0.36, bollardMat, 0, 0.26, 0, 8);
    const cap = addCyl(b, 0.13, 0.1, 0.1, s.id.endsWith('mid') ? rust : bollardMat, 0, 0.46, 0, 8);
    cap.castShadow = true;
    b.position.set(s.x, SITE.deckY, s.z);
    g.add(b);
    g.userData.bollards[s.id] = new THREE.Vector3(s.x, SITE.deckY + 0.5, s.z);
  }

  // Mooring rings and a rust drip under two of them.
  const ringMat = mat('#4a4038');
  const rings = [
    [ -1.1, 0.72 ],
    [ 3.2, 0.66 ],
    [ 6.2, 0.7 ],
  ];
  for (const [x, y] of rings) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.018, 6, 10), ringMat);
    ring.position.set(x, y, SITE.wallZ + 0.06);
    ring.rotation.y = Math.PI / 2;
    g.add(ring);
  }
  addBox(g, 0.04, 0.55, 0.02, rust, 3.2, 0.36, SITE.wallZ + 0.05);
  addBox(g, 0.035, 0.4, 0.02, rust, -1.1, 0.42, SITE.wallZ + 0.05);

  parent.add(g);
  return g;
}

function addLadder(parent, x, z, rotY, name) {
  const g = new THREE.Group();
  g.name = name;
  const y0 = -0.4;
  const y1 = SITE.deckY + 0.55;
  const h = y1 - y0;
  const railMat = mat('#5c6568');
  const rungMat = mat('#6a5a48');
  addBox(g, 0.045, h, 0.045, railMat, -0.18, y0 + h / 2, 0);
  addBox(g, 0.045, h, 0.045, railMat, 0.18, y0 + h / 2, 0);
  const rungs = Math.floor(h / 0.28);
  for (let i = 0; i < rungs; i++) {
    addBox(g, 0.36, 0.028, 0.04, rungMat, 0, y0 + 0.22 + i * 0.28, 0);
  }
  g.position.set(x, 0, z);
  g.rotation.y = rotY;
  parent.add(g);
  return g;
}

function addSlip(parent) {
  const g = new THREE.Group();
  g.name = 'slipway';
  const x0 = -6.5;
  const x1 = -4.7;
  const going = 0.36;
  const rise = 0.26;
  for (let i = 0; i < 6; i++) {
    const top = SITE.deckY - (i + 1) * rise;
    const zc = SITE.wallZ + going * (i + 0.5);
    const wet = top < 0.28;
    addBox(
      g,
      x1 - x0,
      0.14,
      going + 0.04,
      mat(wet ? '#4a534c' : (i % 2 ? '#7e7a72' : '#908a80')),
      (x0 + x1) / 2,
      top - 0.06,
      zc,
    );
  }
  // Handrail on the east side of the steps.
  const rail = mat('#5c6568');
  addCyl(g, 0.03, 0.03, 0.95, rail, x1, SITE.deckY + 0.45, SITE.wallZ + 0.15, 6);
  const slope = ropeBetween(
    new THREE.Vector3(x1, SITE.deckY + 0.85, SITE.wallZ + 0.15),
    new THREE.Vector3(x1, 0.35, SITE.wallZ + 1.7),
    -0.02,
    0.02,
    rail,
  );
  g.add(slope);
  parent.add(g);
}

function addTerrace(parent) {
  const g = new THREE.Group();
  g.name = 'terrace';
  const x0 = 3.55;
  const x1 = SITE.quayX1;
  const z0 = SITE.deckNorth;
  const z1 = SITE.wallZ;
  addBox(
    g,
    x1 - x0,
    SITE.terraceY - SITE.deckY,
    z1 - z0,
    M.deck(),
    (x0 + x1) / 2,
    (SITE.terraceY + SITE.deckY) / 2,
    (z0 + z1) / 2,
    'terrace-slab',
  );
  // Two treads up from the quay, on the west side, toward the water so the path finds them.
  addBox(g, 0.36, 0.16, 1.45, mat('#8d877d'), x0 - 0.52, SITE.deckY + 0.16, -2.15);
  addBox(g, 0.34, 0.16, 1.45, mat('#9a948a'), x0 - 0.18, SITE.deckY + 0.32, -2.15);
  // One tread down from the lane behind the kiosk.
  addBox(g, 2.4, 0.16, 0.32, mat('#8a847c'), 5.5, SITE.laneY - 0.16, -6.52);
  parent.add(g);
}

function addLane(parent) {
  addBox(
    parent,
    22,
    0.34,
    3.15,
    mat('#7a746c'),
    -2.2,
    SITE.laneY - 0.17,
    -7.95,
    'lane',
  );
  // Steps at the west end, quay up to the lane.
  const stair = new THREE.Group();
  stair.name = 'lane-steps';
  for (let i = 0; i < 3; i++) {
    addBox(
      stair,
      1.3,
      0.16,
      0.32,
      mat(i % 2 ? '#867f76' : '#948e84'),
      -11.15,
      SITE.deckY + 0.2 + i * 0.28,
      SITE.deckNorth - 0.15 - i * 0.32,
    );
  }
  parent.add(stair);
}

function pixelSign(parent, word, w, h, x, y, z, rotY) {
  const tex = signTex(word, [32, 52, 64, 255], [236, 226, 206, 255]);
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.needsUpdate = true;
  const m = new THREE.MeshToonMaterial({ color: '#ffffff', map: tex });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), m);
  mesh.position.set(x, y, z);
  mesh.rotation.y = rotY;
  parent.add(mesh);
  return mesh;
}

function addShed(parent) {
  const g = new THREE.Group();
  g.name = 'shed';
  const x0 = -7.35;
  const x1 = -2.55;
  const z0 = -6.2;
  const z1 = -3.22;
  const y0 = SITE.deckY;
  const wallH = 2.45;
  const cx = (x0 + x1) / 2;
  const cz = (z0 + z1) / 2;
  const wood = M.wood();
  // Back, west, east. Front is open with a jamb.
  addBox(g, x1 - x0, wallH, 0.12, wood, cx, y0 + wallH / 2, z0);
  addBox(g, 0.12, wallH, z1 - z0, wood, x0, y0 + wallH / 2, cz);
  addBox(g, 0.12, wallH, z1 - z0, wood, x1, y0 + wallH / 2, cz);
  // Front jambs and a header, door opening toward the east half.
  addBox(g, 1.15, wallH, 0.1, wood, x0 + 0.62, y0 + wallH / 2, z1);
  addBox(g, 0.7, wallH, 0.1, wood, -3.15, y0 + wallH / 2, z1);
  addBox(g, x1 - x0, 0.42, 0.1, wood, cx, y0 + wallH - 0.21, z1);
  // Dark interior back so the opening reads as a room.
  addBox(g, x1 - x0 - 0.4, wallH - 0.3, 0.06, mat('#3a322c'), cx, y0 + wallH / 2, z0 + 0.16);
  addBox(g, x1 - x0 - 0.5, 0.06, z1 - z0 - 0.3, mat('#4a4036'), cx, y0 + 0.04, cz);
  // Roof, pitched by a rotated slab, overhanging the front.
  const roof = addBox(g, x1 - x0 + 0.45, 0.08, z1 - z0 + 0.7, M.roof(), cx, y0 + wallH + 0.16, cz - 0.05);
  roof.rotation.x = 0.08;
  // Gutting table and crates against the front, leaving the water-edge path.
  addBox(g, 1.15, 0.08, 0.62, mat('#6a503c'), -6.55, y0 + 0.86, -2.85);
  addBox(g, 0.08, 0.84, 0.08, mat('#4e4034'), -7.0, y0 + 0.42, -3.05);
  addBox(g, 0.08, 0.84, 0.08, mat('#4e4034'), -6.1, y0 + 0.42, -2.65);
  // Fish boxes, stacked unevenly just east of the door.
  const crateColors = ['#2c4e72', '#e4e0d6', '#2a4668', '#d5d0c6'];
  const stacks = [
    { x: -2.15, z: -3.05, n: 3, rot: 0.04 },
    { x: -2.05, z: -2.55, n: 2, rot: -0.08 },
    { x: -1.55, z: -3.15, n: 1, rot: 0.2 },
  ];
  stacks.forEach((s, si) => {
    for (let i = 0; i < s.n; i++) {
      const c = addBox(
        g,
        0.52,
        0.22,
        0.36,
        mat(crateColors[(si + i) % crateColors.length]),
        s.x,
        y0 + 0.12 + i * 0.23,
        s.z,
      );
      c.rotation.y = s.rot + i * 0.05;
    }
  });
  // Two creels against the shed, one tipped.
  addCreel(g, -5.15, y0, -3.0, 0.2);
  const tipped = addCreel(g, -4.55, y0 + 0.18, -2.72, 1.1);
  tipped.rotation.z = 0.9;
  pixelSign(g, 'FISH', 0.92, 0.32, -5.7, y0 + 2.05, z1 + 0.06, 0);
  parent.add(g);
}

function addCreel(parent, x, y, z, rotY) {
  const g = new THREE.Group();
  const frame = mat('#6a5838');
  addBox(g, 0.62, 0.06, 0.42, frame, 0, 0.04, 0);
  addBox(g, 0.06, 0.32, 0.06, frame, -0.28, 0.2, -0.18);
  addBox(g, 0.06, 0.32, 0.06, frame, 0.28, 0.2, -0.18);
  addBox(g, 0.06, 0.32, 0.06, frame, -0.28, 0.2, 0.18);
  addBox(g, 0.06, 0.32, 0.06, frame, 0.28, 0.2, 0.18);
  addBox(g, 0.62, 0.05, 0.05, frame, 0, 0.36, -0.18);
  addBox(g, 0.62, 0.05, 0.05, frame, 0, 0.36, 0.18);
  const net = new THREE.Mesh(new THREE.PlaneGeometry(0.56, 0.3), M.net());
  net.position.set(0, 0.2, 0.2);
  g.add(net);
  const arch = addCyl(g, 0.04, 0.04, 0.5, frame, 0, 0.48, 0, 6);
  arch.rotation.z = Math.PI / 2;
  g.position.set(x, y, z);
  g.rotation.y = rotY;
  parent.add(g);
  return g;
}

function addCafe(parent) {
  const g = new THREE.Group();
  g.name = 'cafe';
  const y0 = SITE.terraceY;
  const x0 = 4.25;
  const x1 = 6.85;
  const z0 = -6.25;
  const z1 = -4.5;
  const h = 2.28;
  const cx = (x0 + x1) / 2;
  const cz = (z0 + z1) / 2;
  const wall = mat('#efe4cc');
  const trim = mat('#3d5c6e');
  addBox(g, x1 - x0, h, 0.08, wall, cx, y0 + h / 2, z0);
  addBox(g, 0.08, h, z1 - z0, wall, x0, y0 + h / 2, cz);
  addBox(g, 0.08, h, z1 - z0, wall, x1, y0 + h / 2, cz);
  // Front with a serving hatch.
  addBox(g, 0.55, h, 0.08, wall, x0 + 0.3, y0 + h / 2, z1);
  addBox(g, 0.55, h, 0.08, wall, x1 - 0.3, y0 + h / 2, z1);
  addBox(g, x1 - x0, 0.7, 0.08, wall, cx, y0 + h - 0.35, z1);
  addBox(g, x1 - x0, 0.85, 0.08, wall, cx, y0 + 0.42, z1);
  addBox(g, 1.35, 0.06, 0.28, trim, cx, y0 + 1.05, z1 + 0.12);
  addBox(g, 1.2, 0.7, 0.04, mat('#243038'), cx, y0 + 1.45, z1 + 0.02);
  addBox(g, x1 - x0 + 0.2, 0.08, z1 - z0 + 0.25, M.roof(), cx, y0 + h + 0.04, cz);
  // Awning toward the harbour, over the chairs.
  const awning = new THREE.Mesh(new THREE.PlaneGeometry(2.5, 1.25), M.awning());
  awning.position.set(cx, y0 + 2.05, -3.85);
  awning.rotation.x = 0.35;
  g.add(awning);
  addBox(g, 0.06, 0.9, 0.06, trim, x0 + 0.15, y0 + 1.55, -3.35);
  addBox(g, 0.06, 0.9, 0.06, trim, x1 - 0.15, y0 + 1.55, -3.35);
  pixelSign(g, 'CAFE', 1.15, 0.36, cx, y0 + 1.95, z1 + 0.06, 0);
  // Low curb on the water edge of the terrace so the pocket has an edge without a fence.
  addBox(g, x1 - x0 + 0.4, 0.16, 0.16, mat('#8a8478'), cx, y0 + 0.08, SITE.wallZ + 0.02);
  parent.add(g);
}

function addWorkZone(parent) {
  const g = new THREE.Group();
  g.name = 'work-zone';
  const y0 = SITE.deckY;
  const rail = mat('#5a5044');
  addCyl(g, 0.06, 0.07, 1.15, rail, -9.55, y0 + 0.58, 6.15, 6);
  addCyl(g, 0.06, 0.07, 1.15, rail, -9.55, y0 + 0.58, 7.55, 6);
  addCyl(g, 0.045, 0.045, 1.45, rail, -9.55, y0 + 1.12, 6.85, 6).rotation.x = Math.PI / 2;

  const net = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 1.35, 16, 10), M.net());
  const pos = net.geometry.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const sag = 0.28 * (1 - (x / 0.85) ** 2) * Math.max(0, (y + 0.2) / 1.2);
    pos.setZ(i, sag);
  }
  net.geometry.computeVertexNormals();
  net.position.set(-9.55, y0 + 0.72, 6.85);
  net.rotation.x = -0.55;
  net.name = 'net';
  g.add(net);

  // Folded net on the stones, not a second identical drape.
  const heap = new THREE.Mesh(new THREE.PlaneGeometry(1.15, 0.8, 10, 7), M.net());
  const hp = heap.geometry.attributes.position;
  for (let i = 0; i < hp.count; i++) {
    const x = hp.getX(i);
    const y = hp.getY(i);
    hp.setZ(i, 0.08 * Math.sin(x * 6) * Math.cos(y * 5));
  }
  heap.geometry.computeVertexNormals();
  heap.rotation.x = -Math.PI / 2;
  heap.position.set(-10.05, y0 + 0.06, 6.35);
  heap.rotation.z = 0.4;
  g.add(heap);

  addRopePile(g, -10.15, y0, 7.15);
  addBuoyCluster(g, -9.15, y0, 6.35);
  // Small winch.
  const iron = mat('#3e4448');
  addBox(g, 0.5, 0.08, 0.28, iron, -10.7, y0 + 0.28, 5.55);
  addCyl(g, 0.1, 0.1, 0.42, iron, -10.7, y0 + 0.36, 5.55, 8).rotation.z = Math.PI / 2;
  parent.add(g);
}

function addRopePile(parent, x, y, z) {
  const g = new THREE.Group();
  g.name = 'rope-coil';
  const colors = ['#c2b48a', '#8a7048', '#3a5870', '#cabb96', '#3e5c48'];
  const coils = [
    { r: 0.22, tube: 0.028, rx: 1.2, ry: 0.2, y: 0.08 },
    { r: 0.16, tube: 0.022, rx: 0.4, ry: 1.1, y: 0.16 },
    { r: 0.18, tube: 0.03, rx: 1.5, ry: 0.6, y: 0.05 },
    { r: 0.12, tube: 0.02, rx: 0.8, ry: 2.2, y: 0.2 },
  ];
  coils.forEach((c, i) => {
    const mesh = new THREE.Mesh(
      new THREE.TorusGeometry(c.r, c.tube, 6, 14),
      mat(colors[i % colors.length]),
    );
    mesh.position.set((i - 1.5) * 0.08, c.y, (i % 2) * 0.06);
    mesh.rotation.x = c.rx;
    mesh.rotation.y = c.ry;
    mesh.castShadow = true;
    g.add(mesh);
  });
  const loose = ropeBetween(
    new THREE.Vector3(-0.2, 0.12, 0.05),
    new THREE.Vector3(0.35, 0.05, 0.22),
    0.04,
    0.018,
    mat('#3a5870'),
  );
  g.add(loose);
  g.position.set(x, y, z);
  parent.add(g);
}

function makeBuoy(radius, color, band) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.SphereGeometry(radius, 12, 8), mat(color));
  body.scale.y = 1.12;
  body.castShadow = true;
  g.add(body);
  const stripe = new THREE.Mesh(
    new THREE.CylinderGeometry(radius * 1.02, radius * 1.02, radius * 0.28, 10),
    mat(band),
  );
  g.add(stripe);
  return g;
}

function addBuoyCluster(parent, x, y, z) {
  const g = new THREE.Group();
  g.name = 'buoy-cluster';
  const specs = [
    { r: 0.18, c: '#d06a32', b: '#f0ece4', px: 0, pz: 0, py: 0.16 },
    { r: 0.13, c: '#e0b15a', b: '#f4f1ea', px: 0.28, pz: 0.08, py: 0.12 },
    { r: 0.15, c: '#c44838', b: '#efeae2', px: -0.22, pz: 0.16, py: 0.14 },
    { r: 0.1, c: '#d06a32', b: '#2c3338', px: 0.08, pz: -0.22, py: 0.28 },
  ];
  for (const s of specs) {
    const buoy = makeBuoy(s.r, s.c, s.b);
    buoy.position.set(s.px, s.py, s.pz);
    buoy.rotation.z = (s.px || 0.2) * 0.4;
    g.add(buoy);
  }
  g.position.set(x, y, z);
  parent.add(g);
}

function addCabin(parent, spec) {
  const g = new THREE.Group();
  g.name = 'cabin';
  // A hair above the flat pad so the wall and the planks do not z-fight.
  const y = 0.72;
  const x0 = -1.1;
  const x1 = 0.22;
  const half = 0.48;
  const h = 0.64;
  const wall = mat(spec.cabin);
  const roof = mat('#2e3438');
  const glass = mat('#1a242c');
  addBox(g, x1 - x0, h, half * 2, wall, (x0 + x1) / 2, y + h / 2, 0);
  addBox(g, x1 - x0 + 0.12, 0.06, half * 2 + 0.1, roof, (x0 + x1) / 2, y + h + 0.03, 0);
  // Windows cut in by darker panes sitting proud.
  addBox(g, 0.02, 0.24, 0.32, glass, x1 + 0.012, y + 0.4, 0);
  addBox(g, 0.26, 0.22, 0.015, glass, 0.05, y + 0.4, half + 0.01);
  addBox(g, 0.26, 0.22, 0.015, glass, 0.05, y + 0.4, -half - 0.01);
  addBox(g, 0.22, 0.2, 0.015, glass, 0.55, y + 0.4, half + 0.01);
  addBox(g, 0.22, 0.2, 0.015, glass, 0.55, y + 0.4, -half - 0.01);
  // Mast, boom, furled sail. Stays are omitted: at site scale they alias.
  const mast = addCyl(g, 0.035, 0.045, 2.5, mat('#d9d3c6'), -0.05, y + h + 1.25, 0, 6);
  mast.castShadow = true;
  const boom = addCyl(g, 0.028, 0.028, 1.5, mat('#cfc6b6'), 0.7, y + h + 0.28, 0, 5);
  boom.rotation.z = Math.PI / 2;
  const sail = addCyl(g, 0.06, 0.06, 1.2, mat('#7a3038'), 0.75, y + h + 0.36, 0.02, 7);
  sail.rotation.z = Math.PI / 2;
  const antenna = addCyl(g, 0.012, 0.012, 0.7, mat('#2a2e30'), 1.15, y + h + 0.4, -0.2, 4);
  antenna.castShadow = false;
  // The house sits on the deck. Its own shadow on that deck breaks into stairs.
  g.traverse((obj) => {
    obj.castShadow = false;
  });
  parent.add(g);
}

function addCuddy(parent) {
  const g = new THREE.Group();
  g.name = 'cuddy';
  const y = 0.58;
  const x0 = -0.05;
  const x1 = 0.85;
  const wall = mat('#e7e2d6');
  addBox(g, x1 - x0, 0.42, 0.9, wall, (x0 + x1) / 2, y + 0.21, 0);
  addBox(g, 0.36, 0.16, 0.02, mat('#1c2428'), x0 + 0.15, y + 0.28, 0.46);
  addCyl(g, 0.025, 0.03, 1.7, mat('#d5cfc2'), 1.05, y + 1.15, 0, 5);
  // Open-boat thwarts.
  addBox(g, 0.08, 0.04, 1.15, mat('#b08960'), -0.35, 0.5, 0);
  addBox(g, 0.08, 0.04, 1.05, mat('#a67c52'), -1.15, 0.46, 0);
  // Oars along the thwarts.
  const oar = addBox(g, 1.6, 0.03, 0.06, mat('#c2a070'), -0.4, 0.56, 0.15);
  oar.rotation.y = 0.15;
  const oar2 = addBox(g, 1.5, 0.03, 0.06, mat('#b89468'), -0.55, 0.6, -0.12);
  oar2.rotation.y = -0.2;
  g.traverse((obj) => {
    obj.castShadow = false;
  });
  parent.add(g);
}

function buildBoat(spec) {
  const g = new THREE.Group();
  g.name = spec.name;
  const hull = makeHull(spec);
  const mesh = new THREE.Mesh(hull.geo, mat('#ffffff', { vertex: true, side: THREE.DoubleSide }));
  mesh.name = 'hull';
  mesh.userData.profile = hull.profile;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  g.add(mesh);

  // Deck follows the sheer so it stays inside the hull.
  const rows = hull.rows.map((ring) => ring[ring.length - 1]);
  const positions = [];
  const indices = [];
  const pad = spec.cabin
    ? { x0: -1.4, x1: 0.45, y: 0.7 }
    : spec.cuddy
      ? { x0: -0.2, x1: 1.2, y: 0.56 }
      : null;
  rows.forEach((p, s) => {
    const h = Math.max(0.04, p.half - 0.015);
    const onPad = pad && p.x >= pad.x0 && p.x <= pad.x1;
    const edgeY = onPad ? pad.y : p.y - 0.012;
    const deckY = onPad ? pad.y : edgeY - 0.025;
    const base = s * 3;
    positions.push(p.x, deckY, 0, p.x, edgeY, h, p.x, edgeY, -h);
    if (s > 0) {
      const a = base;
      const p0 = base - 3;
      // Winding faces up so the deck takes the same light as the quay.
      indices.push(p0, p0 + 1, a, p0 + 1, a + 1, a);
      indices.push(p0, a, p0 + 2, p0 + 2, a, a + 2);
    }
  });
  const deckGeo = new THREE.BufferGeometry();
  deckGeo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  deckGeo.setIndex(indices);
  const deck = geoMesh(deckGeo, mat(spec.deck, { side: THREE.DoubleSide }), 'deck');
  g.add(deck);
  if (spec.cabin) addCabin(g, spec);
  if (spec.cuddy) addCuddy(g);
  if (spec.crate) {
    addBox(g, 0.42, 0.2, 0.32, mat('#2c4e72'), -1.3, 0.72, 0.15);
  }

  g.position.set(spec.x, 0, spec.z);
  g.rotation.y = spec.rot;
  g.updateMatrixWorld(true);

  const bowLocal = new THREE.Vector3(spec.length * 0.42, spec.bowSheer * 0.75, spec.fenderSide * 0.2);
  const sternLocal = new THREE.Vector3(-spec.length * 0.4, spec.sternSheer * 0.8, spec.fenderSide * 0.2);
  g.userData.cleats = {
    bow: bowLocal.clone().applyMatrix4(g.matrixWorld),
    stern: sternLocal.clone().applyMatrix4(g.matrixWorld),
  };
  return g;
}

function addFenders(parent, boatName, along) {
  const hull = parent.getObjectByName(boatName).getObjectByName('hull');
  const box = new THREE.Box3().setFromObject(hull);
  const matF = mat('#d06a32');
  const n = along === 'z' ? 4 : 3;
  for (let i = 0; i < n; i++) {
    const t = (i + 1) / (n + 1);
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8), matF);
    mesh.scale.y = 0.82;
    mesh.castShadow = true;
    if (along === 'z') {
      const x = box.min.x + (box.max.x - box.min.x) * (0.18 + t * 0.64);
      mesh.position.set(x, 0.22 + (i % 2) * 0.12, (SITE.wallZ + box.min.z) / 2);
    } else {
      const z = box.min.z + (box.max.z - box.min.z) * (0.18 + t * 0.64);
      mesh.position.set((SITE.wallX + box.min.x) / 2, 0.2 + (i % 2) * 0.1, z);
    }
    mesh.name = `fender-${boatName}-${i}`;
    parent.add(mesh);
  }
}

function addMoorings(parent, quay) {
  const g = new THREE.Group();
  g.name = 'moorings';
  const rope = mat('#8a7048');
  const pairs = [
    ['boat-a', 'bow', 'a-bow', 0.22],
    ['boat-a', 'stern', 'a-stern', 0.28],
    ['boat-b', 'bow', 'b-bow', 0.2],
    ['boat-b', 'stern', 'b-stern', 0.24],
  ];
  for (const [boat, end, bollard, sag] of pairs) {
    const cleat = parent.getObjectByName(boat).userData.cleats[end];
    const post = quay.userData.bollards[bollard];
    const line = ropeBetween(cleat, post, sag, 0.018, rope);
    line.name = `rope-${boat}-${end}`;
    g.add(line);
  }
  parent.add(g);
}

function addLand(parent) {
  // North bank rising behind the lane.
  const bankGeo = new THREE.PlaneGeometry(36, 18, 22, 8);
  bankGeo.rotateX(-Math.PI / 2);
  const bp = bankGeo.attributes.position;
  for (let i = 0; i < bp.count; i++) {
    const x = bp.getX(i);
    const z = bp.getZ(i);
    const north = THREE.MathUtils.clamp((4 - z) / 12, 0, 1);
    const h = 2.55 + north * 2.15 + north * Math.sin(x * 0.28) * 0.22;
    bp.setY(i, h);
  }
  bankGeo.computeVertexNormals();
  const colors = [];
  for (let i = 0; i < bp.count; i++) {
    const h = bp.getY(i);
    const c = new THREE.Color('#5e6856').lerp(new THREE.Color('#8a8678'), THREE.MathUtils.clamp((h - 2) / 3, 0, 1));
    colors.push(c.r, c.g, c.b);
  }
  bankGeo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  const bank = geoMesh(bankGeo, mat('#ffffff', { vertex: true }), 'north-bank');
  bank.position.set(-1, 0, SITE.deckNorth - 9.5);
  flagShadow(bank, false, true);
  parent.add(bank);
  // Rise behind the open stretch of quay. Kept clear of the shed and cafe interiors.
  addBox(
    parent,
    6.8,
    1.55,
    1.4,
    mat('#6d675f'),
    0.85,
    SITE.deckY + 0.78,
    SITE.deckNorth - 0.66,
    'quay-riser',
  );

  // Across the bay, a low headland so the sea meets land.
  const ridgeGeo = new THREE.PlaneGeometry(22, 12, 16, 6);
  ridgeGeo.rotateX(-Math.PI / 2);
  const rp = ridgeGeo.attributes.position;
  const rc = [];
  for (let i = 0; i < rp.count; i++) {
    const x = rp.getX(i);
    const z = rp.getZ(i);
    const h = 1.4 + (z + 7) * 0.22 + Math.sin(x * 0.18) * 1.1 + Math.cos(x * 0.05) * 0.6;
    rp.setY(i, Math.max(0.2, h));
    const c = new THREE.Color('#6a7264').lerp(new THREE.Color('#8d897e'), hash2(x, z));
    rc.push(c.r, c.g, c.b);
  }
  ridgeGeo.setAttribute('color', new THREE.Float32BufferAttribute(rc, 3));
  ridgeGeo.computeVertexNormals();
  const ridge = geoMesh(ridgeGeo, mat('#ffffff', { vertex: true }), 'headland');
  ridge.position.set(30, 0, 12);
  flagShadow(ridge, false, false);
  parent.add(ridge);

  // Outer rubble slope of the west pier.
  const slope = new THREE.BufferGeometry();
  const sPos = new Float32Array([
    SITE.deckWest, SITE.deckY, -1.2,
    -16.4, -0.2, -1.6,
    SITE.deckWest, SITE.deckY, SITE.quayZ1,
    -16.8, -0.15, SITE.quayZ1 + 0.6,
  ]);
  slope.setAttribute('position', new THREE.BufferAttribute(sPos, 3));
  slope.setIndex([0, 1, 2, 1, 3, 2]);
  slope.computeVertexNormals();
  const slopeMesh = geoMesh(slope, mat('#6a655e', { side: THREE.DoubleSide }), 'outer-slope');
  flagShadow(slopeMesh, false, true);
  parent.add(slopeMesh);

  // East embankment, meeting the quay face and falling to the water.
  const x0 = SITE.quayX1 + 0.02;
  const x1 = 15.2;
  const z0 = SITE.deckNorth - 2.4;
  const z1 = 1.4;
  const nx = 8;
  const nz = 6;
  const ePos = [];
  const eCol = [];
  const eIdx = [];
  const stride = nx + 1;
  for (let iz = 0; iz <= nz; iz++) {
    for (let ix = 0; ix <= nx; ix++) {
      const x = x0 + ((x1 - x0) * ix) / nx;
      const z = z0 + ((z1 - z0) * iz) / nz;
      const t = ix / nx;
      const back = THREE.MathUtils.clamp((SITE.wallZ - z) / (SITE.wallZ - SITE.deckNorth), 0, 1);
      const edgeH = SITE.deckY * (1 - back) + 2.55 * back;
      const h = edgeH * (1 - t) * (1 - t) + 0.04 * t + Math.sin(x * 0.7 + z) * 0.03 * t;
      ePos.push(x, h, z);
      const c = new THREE.Color('#7d7870').lerp(new THREE.Color('#6a6560'), t);
      eCol.push(c.r, c.g, c.b);
    }
  }
  for (let iz = 0; iz < nz; iz++) {
    for (let ix = 0; ix < nx; ix++) {
      const a = iz * stride + ix;
      eIdx.push(a, a + stride, a + 1, a + 1, a + stride, a + stride + 1);
    }
  }
  const shore = new THREE.BufferGeometry();
  shore.setAttribute('position', new THREE.Float32BufferAttribute(ePos, 3));
  shore.setAttribute('color', new THREE.Float32BufferAttribute(eCol, 3));
  shore.setIndex(eIdx);
  parent.add(geoMesh(shore, mat('#ffffff', { vertex: true, side: THREE.DoubleSide }), 'east-shore'));

  addRocks(parent);
  addMole(parent);
}

function faceted(radius) {
  const geo = new THREE.IcosahedronGeometry(radius, 0);
  geo.computeVertexNormals();
  return geo;
}

function addRocks(parent) {
  const g = new THREE.Group();
  g.name = 'rocks';
  const spots = [
    { x: -15.2, y: 0.05, z: 2.4, s: [0.7, 0.38, 0.55], c: '#5c5954' },
    { x: -14.4, y: 0.12, z: 5.6, s: [0.45, 0.28, 0.4], c: '#6a6560' },
    { x: -15.6, y: -0.02, z: 7.4, s: [0.55, 0.22, 0.48], c: '#4e4c48' },
    { x: 11.4, y: 0.05, z: -0.6, s: [0.6, 0.3, 0.45], c: '#6e6a64' },
    { x: 12.6, y: -0.05, z: 1.2, s: [0.4, 0.2, 0.36], c: '#5a564f' },
    { x: -5.5, y: -0.08, z: 0.15, s: [0.42, 0.16, 0.3], c: '#3e4644' },
  ];
  for (const s of spots) {
    const rock = new THREE.Mesh(faceted(0.5), mat(s.c));
    rock.scale.set(s.s[0], s.s[1], s.s[2]);
    rock.position.set(s.x, s.y, s.z);
    rock.rotation.set(rand(), rand(), rand());
    rock.castShadow = true;
    rock.receiveShadow = true;
    g.add(rock);
  }
  parent.add(g);
}

function addMole(parent) {
  const g = new THREE.Group();
  g.name = 'mole';
  const x0 = 11.2;
  const z0 = 7.4;
  const x1 = 16.4;
  const z1 = 11.6;
  const dx = x1 - x0;
  const dz = z1 - z0;
  const len = Math.hypot(dx, dz);
  const wall = addBox(g, len, 0.9, 1.7, M.stone(), 0, 0.15, 0, 'mole-wall');
  wall.rotation.y = Math.atan2(dz, dx);
  g.position.set((x0 + x1) / 2, 0, (z0 + z1) / 2);
  // Beacon at the outer end, small enough to stay in the background.
  const beacon = new THREE.Group();
  addCyl(beacon, 0.38, 0.5, 1.5, mat('#e7e2d6'), 0, 0.75, 0, 8);
  addCyl(beacon, 0.48, 0.42, 0.12, mat('#2c3338'), 0, 1.55, 0, 8);
  addCyl(beacon, 0.22, 0.22, 0.35, mat('#1c2428'), 0, 1.78, 0, 8);
  addCyl(beacon, 0.28, 0.16, 0.16, mat('#c4553a'), 0, 2.02, 0, 8);
  beacon.position.set(x1, 0.55, z1);
  parent.add(beacon);
  parent.add(g);
}

function addSky(parent) {
  const geo = new THREE.SphereGeometry(86, 36, 18);
  const pos = geo.attributes.position;
  const colors = [];
  const horizon = new THREE.Color('#d7e8f6');
  const zenith = new THREE.Color('#6aa6d6');
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i) / 86;
    const c = horizon.clone().lerp(zenith, THREE.MathUtils.clamp(y * 1.35, 0, 1));
    colors.push(c.r, c.g, c.b);
  }
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  const mesh = new THREE.Mesh(geo, mat('#ffffff', { vertex: true, side: THREE.BackSide, fog: false, depthWrite: false }));
  mesh.name = 'sky';
  mesh.userData.forceUnlit = true;
  flagShadow(mesh, false, false);
  mesh.position.y = 4;
  parent.add(mesh);
}

function addVegetation(parent) {
  const g = new THREE.Group();
  g.name = 'vegetation';
  addTree(g, 8.6, SITE.laneY, -8.3);
  const shrubs = [
    { x: -4.2, z: -8.6, s: 0.7, c: '#4e5a40' },
    { x: -1.2, z: -9.4, s: 0.45, c: '#6a6840' },
    { x: 2.4, z: -8.8, s: 0.55, c: '#3f4a38' },
    { x: 6.2, z: -9.1, s: 0.6, c: '#5c6844' },
    { x: 10.2, z: -7.2, s: 0.4, c: '#6e6a3e' },
    { x: -8.8, z: -8.2, s: 0.5, c: '#44503c' },
    { x: 18, z: 16, s: 0.8, c: '#5a6454' },
    { x: -6, z: 22, s: 0.7, c: '#6a7058' },
  ];
  for (const s of shrubs) {
    addShrub(g, s.x, s.z < -7 ? SITE.laneY : 0.2, s.z, s.s, s.c);
  }
  // Rosemary in the cafe pot. The GLB pot sits on the terrace at this xz.
  addShrub(g, 4.42, SITE.terraceY + 0.28, -5.05, 0.22, '#4a5a3c');
  parent.add(g);
}

function addTree(parent, x, y, z) {
  const g = new THREE.Group();
  g.name = 'tree';
  const bark = mat('#5a4636');
  const trunk = addCyl(g, 0.08, 0.12, 1.5, bark, 0, 0.75, 0, 6);
  trunk.rotation.z = -0.18;
  const limb = addCyl(g, 0.04, 0.06, 1.1, bark, 0.45, 1.7, 0.1, 5);
  limb.rotation.z = -0.7;
  const limb2 = addCyl(g, 0.03, 0.045, 0.8, bark, 0.15, 1.85, -0.35, 5);
  limb2.rotation.z = -0.4;
  limb2.rotation.x = 0.5;
  const leafColors = ['#3e4c36', '#556246', '#2f3c2e', '#6a7048'];
  const puffs = [
    [0.9, 1.85, 0.15, 0.55, 0.32, 0.4],
    [1.15, 2.05, -0.05, 0.38, 0.26, 0.3],
    [0.35, 2.15, -0.45, 0.42, 0.28, 0.36],
    [0.55, 1.7, 0.35, 0.3, 0.22, 0.26],
    [1.3, 1.65, 0.25, 0.28, 0.18, 0.24],
  ];
  puffs.forEach((p, i) => {
    const leaf = new THREE.Mesh(faceted(0.45), mat(leafColors[i % leafColors.length]));
    leaf.scale.set(p[3] / 0.45, p[4] / 0.45, p[5] / 0.45);
    leaf.position.set(p[0], p[1], p[2]);
    leaf.castShadow = true;
    g.add(leaf);
  });
  g.position.set(x, y, z);
  parent.add(g);
}

function addShrub(parent, x, y, z, s, color) {
  const g = new THREE.Group();
  const n = 3 + ((rand() * 2) | 0);
  for (let i = 0; i < n; i++) {
    const leaf = new THREE.Mesh(
      faceted(s * (0.55 + rand() * 0.4)),
      mat(color),
    );
    leaf.scale.set(0.85 + rand() * 0.4, 0.5 + rand() * 0.25, 0.75 + rand() * 0.35);
    leaf.position.set((rand() - 0.5) * s * 0.8, rand() * s * 0.35, (rand() - 0.5) * s * 0.8);
    leaf.castShadow = true;
    g.add(leaf);
  }
  g.position.set(x, y, z);
  parent.add(g);
}

function addBoats(parent) {
  const a = buildBoat({
    name: 'boat-a',
    x: SITE.boatA.x,
    z: SITE.boatA.z,
    rot: SITE.boatA.rot,
    length: SITE.boatA.length,
    beam: SITE.boatA.beam,
    fenderSide: -1,
    bowSheer: 1.16,
    sternSheer: 0.58,
    clinker: false,
    cabin: '#e6e0d2',
    deck: '#6d7268',
    crate: true,
    colors: { top: '#2a4f73', boot: '#e4d7c4', bottom: '#7a3a34' },
    stations: [
      { t: 0, keel: 0.02, sheer: 0.58, beam: 1.55, tumble: 0.06, rake: -0.02 },
      { t: 0.1, keel: -0.28, sheer: 0.64, beam: 2.15, tumble: 0.1, rake: 0 },
      { t: 0.32, keel: -0.5, sheer: 0.7, beam: 2.48, tumble: 0.12, rake: 0 },
      { t: 0.55, keel: -0.42, sheer: 0.74, beam: 2.3, tumble: 0.12, rake: 0 },
      { t: 0.75, keel: -0.18, sheer: 0.86, beam: 1.45, tumble: 0.08, rake: 0.08 },
      { t: 0.9, keel: 0.08, sheer: 1.02, beam: 0.62, tumble: 0.04, rake: 0.22 },
      { t: 1, keel: 0.38, sheer: 1.16, beam: 0.1, tumble: 0, rake: 0.38 },
    ],
  });
  const b = buildBoat({
    name: 'boat-b',
    x: SITE.boatB.x,
    z: SITE.boatB.z,
    rot: SITE.boatB.rot,
    length: SITE.boatB.length,
    beam: SITE.boatB.beam,
    fenderSide: 1,
    bowSheer: 1.02,
    sternSheer: 0.46,
    clinker: true,
    cuddy: true,
    deck: '#b08960',
    colors: { top: '#c8922e', boot: '#e7e1d4', bottom: '#3d4a32' },
    stations: [
      { t: 0, keel: 0, sheer: 0.46, beam: 1.2, tumble: 0.05, rake: 0 },
      { t: 0.18, keel: -0.3, sheer: 0.52, beam: 1.62, tumble: 0.08, rake: 0 },
      { t: 0.48, keel: -0.4, sheer: 0.6, beam: 1.68, tumble: 0.1, rake: 0 },
      { t: 0.72, keel: -0.12, sheer: 0.74, beam: 1.05, tumble: 0.05, rake: 0.1 },
      { t: 1, keel: 0.28, sheer: 1.02, beam: 0.08, tumble: 0, rake: 0.46 },
    ],
  });
  parent.add(a, b);
  addFenders(parent, 'boat-a', 'z');
  addFenders(parent, 'boat-b', 'x');
  // A loose buoy and coil in the open boat.
  const buoy = makeBuoy(0.1, '#e0b15a', '#2c3338');
  buoy.position.set(-7.15, 0.62, 2.7);
  parent.add(buoy);
}

function addCapstan(parent) {
  const g = new THREE.Group();
  g.name = 'capstan';
  const iron = mat('#3a4044');
  addCyl(g, 0.2, 0.24, 0.16, iron, 0, 0.08, 0, 8);
  addCyl(g, 0.12, 0.14, 0.55, iron, 0, 0.42, 0, 8);
  addCyl(g, 0.2, 0.16, 0.12, mat('#5a4636'), 0, 0.72, 0, 8);
  g.position.set(-7.7, SITE.deckY, -2.15);
  parent.add(g);
}

function addPuddles(parent) {
  const g = new THREE.Group();
  g.name = 'puddles';
  const puddle = (x, z, rx, rz) => {
    const mesh = new THREE.Mesh(new THREE.CircleGeometry(1, 14), mat('#3a4744'));
    mesh.rotation.x = -Math.PI / 2;
    mesh.scale.set(rx, rz, 1);
    mesh.position.set(x, SITE.deckY + 0.012, z);
    flagShadow(mesh, false, false);
    g.add(mesh);
  };
  puddle(-3.4, -2.4, 0.42, 0.28);
  puddle(2.3, -2.15, 0.26, 0.18);
  parent.add(g);
}

export function pointOnDeck(x, z, inset = 0) {
  const S = SITE;
  const north = x >= S.deckWest + inset && x <= S.quayX1 - inset && z >= S.deckNorth + inset && z <= S.wallZ - inset;
  const west = x >= S.deckWest + inset && x <= S.wallX - inset && z >= S.wallZ + inset && z <= S.quayZ1 - inset;
  return north || west;
}

export function buildSite() {
  const root = new THREE.Group();
  root.name = 'harbour';
  addSky(root);
  addLand(root);
  addWater(root);
  const quay = addQuay(root);
  addSlip(root);
  addTerrace(root);
  addLane(root);
  addLadder(root, -3.55, SITE.wallZ + 0.16, 0, 'ladder-north');
  addLadder(root, SITE.wallX + 0.16, 0.55, -Math.PI / 2, 'ladder-west');
  addLadder(root, -10.6, SITE.quayZ1 + 0.12, Math.PI, 'ladder-end');
  addShed(root);
  addCafe(root);
  addWorkZone(root);
  addBoats(root);
  addMoorings(root, quay);
  addCapstan(root);
  addVegetation(root);
  addPuddles(root);
  // Life ring by the north ladder.
  const post = addCyl(root, 0.04, 0.05, 1.05, mat('#4a4038'), -3.15, SITE.deckY + 0.52, -1.7, 6);
  post.name = 'ring-post';
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.035, 6, 12), mat('#d06030'));
  ring.position.set(-3.15, SITE.deckY + 0.95, -1.58);
  root.add(ring);
  return root;
}

function averageColor(mesh) {
  const attr = mesh.geometry.getAttribute('color');
  if (!attr) {
    const c = mesh.material && mesh.material.color;
    return c ? { r: c.r, g: c.g, b: c.b } : { r: 0, g: 0, b: 0 };
  }
  let r = 0;
  let g = 0;
  let b = 0;
  const n = attr.count;
  for (let i = 0; i < n; i++) {
    r += attr.getX(i);
    g += attr.getY(i);
    b += attr.getZ(i);
  }
  return { r: r / n, g: g / n, b: b / n };
}

function colorSpread(mesh) {
  const attr = mesh.geometry.getAttribute('color');
  if (!attr) return 0;
  let minR = 1;
  let maxR = 0;
  let minG = 1;
  let maxG = 0;
  let minB = 1;
  let maxB = 0;
  for (let i = 0; i < attr.count; i += 3) {
    minR = Math.min(minR, attr.getX(i));
    maxR = Math.max(maxR, attr.getX(i));
    minG = Math.min(minG, attr.getY(i));
    maxG = Math.max(maxG, attr.getY(i));
    minB = Math.min(minB, attr.getZ(i));
    maxB = Math.max(maxB, attr.getZ(i));
  }
  return Math.max(maxR - minR, maxG - minG, maxB - minB);
}

function hullHitsDeck(mesh) {
  const pos = mesh.geometry.attributes.position;
  const v = new THREE.Vector3();
  mesh.updateWorldMatrix(true, true);
  for (let i = 0; i < pos.count; i += 2) {
    v.fromBufferAttribute(pos, i).applyMatrix4(mesh.matrixWorld);
    if (v.y > -0.05 && pointOnDeck(v.x, v.z, 0.05)) return true;
  }
  return false;
}

export function measureSite(group) {
  group.updateMatrixWorld(true);
  const boats = [];
  const ladders = [];
  let water = null;
  const found = {};
  group.traverse((obj) => {
    if (obj.name) found[obj.name] = true;
    if (obj.name === 'hull') {
      const box = new THREE.Box3().setFromObject(obj);
      const size = box.getSize(new THREE.Vector3());
      boats.push({
        name: obj.parent && obj.parent.name,
        length: Math.max(size.x, size.z),
        beam: Math.min(size.x, size.z),
        height: size.y,
        minY: box.min.y,
        maxY: box.max.y,
        verts: obj.geometry.attributes.position.count,
        color: averageColor(obj),
        profile: obj.userData.profile,
        hitsDeck: hullHitsDeck(obj),
      });
    }
    if (obj.name && obj.name.startsWith('ladder-')) {
      const box = new THREE.Box3().setFromObject(obj);
      ladders.push({ name: obj.name, minY: box.min.y, maxY: box.max.y });
    }
    if (obj.name === 'water-basin') {
      const pos = obj.geometry.attributes.position;
      let yMin = Infinity;
      let yMax = -Infinity;
      for (let i = 0; i < pos.count; i++) {
        const y = pos.getY(i);
        yMin = Math.min(yMin, y);
        yMax = Math.max(yMax, y);
      }
      water = {
        yMin,
        yMax,
        yRange: yMax - yMin,
        verts: pos.count,
        mean: averageColor(obj),
        spread: colorSpread(obj),
        isBox: obj.geometry.type === 'BoxGeometry',
      };
    }
  });
  let ropes = 0;
  group.traverse((obj) => {
    if (obj.name && obj.name.startsWith('rope-')) ropes += 1;
  });
  const overlap = boats.length === 2 && (() => {
    const boxes = boats.map((b) => {
      const hull = group.getObjectByName(b.name).getObjectByName('hull');
      return new THREE.Box3().setFromObject(hull);
    });
    return boxes[0].intersectsBox(boxes[1]);
  })();
  return {
    boats,
    water,
    ladders,
    ropes,
    found,
    boatsOverlap: overlap,
    deckY: SITE.deckY,
    terraceY: SITE.terraceY,
    laneY: SITE.laneY,
  };
}
