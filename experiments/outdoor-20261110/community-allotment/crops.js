import * as THREE from 'three';
import { hashSeed, mulberry32, toon } from './scene_lib.js';

const geoCache = new Map();

function leafGeometry(len, wid, curl, lobes) {
  const key = [len.toFixed(3), wid.toFixed(3), curl.toFixed(3), lobes].join('|');
  let geo = geoCache.get(key);
  if (geo) return geo;
  geo = new THREE.PlaneGeometry(wid, len, lobes > 0 ? 6 : 4, 7);
  geo.translate(0, len / 2, 0);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const ox = pos.getX(i);
    const y = pos.getY(i);
    const t = THREE.MathUtils.clamp(y / len, 0, 1);
    const xn = ox / (wid * 0.5 || 1);
    let taper = Math.sin(Math.PI * Math.pow(t, 0.7));
    if (lobes > 0) taper *= 0.58 + 0.42 * Math.cos(xn * Math.PI * lobes);
    const x = xn * (wid * 0.5) * (0.14 + 0.86 * Math.max(0.04, taper));
    const fold = Math.abs(xn) * 0.065 * len;
    const curlZ = -Math.pow(t, 1.22) * curl * len;
    pos.setX(i, x);
    pos.setZ(i, curlZ - fold * (1 - t * 0.25));
  }
  geo.computeVertexNormals();
  geoCache.set(key, geo);
  return geo;
}

function kit() {
  const cache = new Map();
  function M(hex, side = THREE.FrontSide) {
    const key = hex + side;
    if (!cache.has(key)) cache.set(key, toon(hex, { side }));
    return cache.get(key);
  }
  const leaf = (hex) => M(hex, THREE.DoubleSide);
  return {
    M,
    leaf,
    soil: M('#3b2a1c'),
    wood: M('#8a6844'),
    cane: M('#c6a56a'),
    caneDark: M('#a68448'),
    vine: M('#3d6a34'),
    bean: leaf('#3f6e38'),
    beanYoung: leaf('#6a9a48'),
    flower: M('#d24d4a'),
    pod: M('#4e7a3a'),
    chard: leaf('#4c7a3c'),
    chardPale: leaf('#7ea85a'),
    stemRed: M('#b64b45'),
    stemCream: M('#e4dcc4'),
    romaine: leaf('#c3d27a'),
    butter: leaf('#d5e2a0'),
    oak: leaf('#7a3d46'),
    oakDark: leaf('#5c3038'),
    baby: leaf('#b6cc78'),
    cabbage: M('#4d7a58'),
    cabbageLeaf: leaf('#3f6b4c'),
    kale: leaf('#1d4030'),
    broccoli: M('#2a5a38'),
    carrot: leaf('#5d8a38'),
    carrotRoot: M('#d07a32'),
    beet: leaf('#3e5a34'),
    onion: M('#d9d0a4'),
    onionLeaf: M('#6e9448'),
    leek: leaf('#7aa45a'),
    leekShank: M('#e6e2d2'),
    tomatoLeaf: leaf('#3e6836'),
    tomatoRipe: M('#c44732'),
    tomatoGreen: M('#7a9a46'),
    stake: M('#7a5a3c'),
    squash: leaf('#5a8a40'),
    squashFruit: M('#e0a04a'),
    raspberry: leaf('#7b9a48'),
    parsley: leaf('#4f8a42'),
    rosemary: M('#5d7348'),
    seedling: leaf('#8cb86a'),
    twine: M('#d9d2c2'),
  };
}

const K = kit();

function leafMesh(mat, len, wid, curl, lobes = 0) {
  const mesh = new THREE.Mesh(leafGeometry(len, wid, curl, lobes), mat);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function setPose(mesh, yaw, tilt) {
  mesh.rotation.order = 'YXZ';
  mesh.rotation.y = yaw;
  mesh.rotation.x = tilt;
}

function grid(w, d, sx, sz, inset, rng, jitter = 0.05) {
  const pts = [];
  const cols = Math.max(1, Math.round((w - inset * 2) / sx));
  const rows = Math.max(1, Math.round((d - inset * 2) / sz));
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = -w / 2 + inset + (c + 0.5) * ((w - inset * 2) / cols) + (rng() - 0.5) * jitter;
      const z = -d / 2 + inset + (r + 0.5) * ((d - inset * 2) / rows) + (rng() - 0.5) * jitter;
      pts.push({ x, z, c, r, cols, rows, u: (r + 0.5) / rows });
    }
  }
  return pts;
}

function rosette(parent, x, y, z, n, len, wid, curl, tilt, mat, rng, lobes = 0) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  g.rotation.y = rng() * Math.PI * 2;
  for (let i = 0; i < n; i++) {
    const leaf = leafMesh(mat, len * (0.82 + rng() * 0.28), wid * (0.85 + rng() * 0.25), curl, lobes);
    const yaw = (i / n) * Math.PI * 2 + rng() * 0.25;
    setPose(leaf, yaw, tilt + (rng() - 0.5) * 0.18);
    g.add(leaf);
  }
  parent.add(g);
  return g;
}

function chardPlant(parent, x, y, z, scale, red, rng) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  g.rotation.y = rng() * Math.PI * 2;
  const n = 4 + Math.floor(rng() * 3);
  for (let i = 0; i < n; i++) {
    const yaw = (i / n) * Math.PI * 2 + rng() * 0.3;
    const tilt = 0.62 + rng() * 0.55;
    const len = (0.28 + rng() * 0.22) * scale;
    const dir = new THREE.Vector3(Math.sin(yaw) * Math.sin(tilt), Math.cos(tilt), Math.cos(yaw) * Math.sin(tilt));
    const petLen = len * 0.48;
    const pet = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.014, petLen, 5), red ? K.stemRed : K.stemCream);
    pet.position.copy(dir).multiplyScalar(petLen * 0.5);
    pet.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
    g.add(pet);
    const leaf = leafMesh(rng() > 0.7 ? K.chardPale : K.chard, len, len * 0.62, 0.42 + rng() * 0.15, 0);
    leaf.position.copy(dir).multiplyScalar(petLen * 0.92);
    setPose(leaf, yaw, tilt + 0.35);
    g.add(leaf);
  }
  parent.add(g);
}

function cabbage(parent, x, y, z, scale, rng) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.105 * scale, 12, 8), K.cabbage);
  head.scale.set(1, 0.72, 1);
  head.position.y = 0.09 * scale;
  g.add(head);
  const wraps = 5;
  for (let i = 0; i < wraps; i++) {
    const leaf = leafMesh(K.cabbageLeaf, 0.2 * scale, 0.16 * scale, 0.55, 0);
    setPose(leaf, (i / wraps) * Math.PI * 2 + rng() * 0.2, 1.05 + rng() * 0.35);
    g.add(leaf);
  }
  parent.add(g);
}

function kalePlant(parent, x, y, z, scale, rng) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.016, 0.16 * scale, 6), K.stake);
  stem.position.y = 0.08 * scale;
  g.add(stem);
  for (let i = 0; i < 8; i++) {
    const leaf = leafMesh(K.kale, (0.16 + rng() * 0.1) * scale, 0.07 * scale, 0.7, 4);
    leaf.position.y = 0.05 + (i % 3) * 0.03;
    setPose(leaf, (i / 8) * Math.PI * 2, 0.45 + rng() * 0.7);
    g.add(leaf);
  }
  parent.add(g);
}

function broccoli(parent, x, y, z, scale, rng) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  const stemH = 0.22 * scale;
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.026, stemH, 6), K.cabbage);
  stem.position.y = stemH / 2;
  g.add(stem);
  for (let i = 0; i < 9; i++) {
    const floret = new THREE.Mesh(new THREE.SphereGeometry(0.028 * scale, 7, 6), K.broccoli);
    const a = rng() * Math.PI * 2;
    const rad = rng() * 0.05 * scale;
    floret.position.set(Math.cos(a) * rad, stemH + rng() * 0.04 * scale, Math.sin(a) * rad);
    g.add(floret);
  }
  for (let i = 0; i < 4; i++) {
    const leaf = leafMesh(K.cabbageLeaf, 0.24 * scale, 0.12 * scale, 0.4, 0);
    setPose(leaf, (i / 4) * Math.PI * 2, 1.15);
    g.add(leaf);
  }
  parent.add(g);
}

function carrotPlant(parent, x, y, z, scale, rng) {
  const root = new THREE.Mesh(new THREE.SphereGeometry(0.02 * scale, 6, 5), K.carrotRoot);
  root.scale.set(1, 0.6, 1);
  root.position.set(x, y + 0.008, z);
  parent.add(root);
  rosette(parent, x, y, z, 6, 0.15 * scale, 0.07 * scale, 0.35, 0.85 + rng() * 0.3, K.carrot, rng, 3);
}

function beetPlant(parent, x, y, z, scale, rng) {
  chardPlant(parent, x, y, z, scale * 0.72, true, rng);
}

function onionPlant(parent, x, y, z, scale, rng) {
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.028 * scale, 8, 6), K.onion);
  bulb.scale.set(1, 0.65, 1);
  bulb.position.set(x, y + 0.012, z);
  parent.add(bulb);
  const n = 3 + Math.floor(rng() * 3);
  for (let i = 0; i < n; i++) {
    const h = (0.12 + rng() * 0.16) * scale;
    const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.007, h, 4), K.onionLeaf);
    const yaw = (i / n) * Math.PI * 2;
    tube.position.set(x + Math.sin(yaw) * 0.01, y + h / 2, z + Math.cos(yaw) * 0.01);
    tube.rotation.z = (rng() - 0.5) * 0.25;
    tube.rotation.x = (rng() - 0.5) * 0.25;
    parent.add(tube);
  }
}

function leekPlant(parent, x, y, z, scale, rng) {
  const shankH = 0.1 * scale;
  const shank = new THREE.Mesh(new THREE.CylinderGeometry(0.016 * scale, 0.02 * scale, shankH, 6), K.leekShank);
  shank.position.set(x, y + shankH / 2, z);
  parent.add(shank);
  const n = 5;
  for (let i = 0; i < n; i++) {
    const len = (0.28 + rng() * 0.22) * scale;
    const leaf = leafMesh(K.leek, len, 0.028 * scale, 0.22, 0);
    leaf.position.set(x, y + shankH * 0.6, z);
    setPose(leaf, (i / n) * Math.PI * 2 + rng() * 0.2, 0.18 + rng() * 0.28);
    parent.add(leaf);
  }
}

function tomatoPlant(parent, x, y, z, height, rng) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  const stake = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.014, height + 0.15, 5), K.stake);
  stake.position.y = (height + 0.15) / 2;
  g.add(stake);
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.012, height, 5), K.vine);
  stem.position.y = height / 2;
  g.add(stem);
  const tiers = 3;
  for (let t = 0; t < tiers; t++) {
    const hy = height * (0.38 + t * 0.2);
    const yaw = t * 1.7 + rng();
    for (let side = -1; side <= 1; side += 2) {
      const leaf = compoundLeaf(0.16 + rng() * 0.06, rng);
      leaf.position.y = hy;
      setPose(leaf, yaw + side * 0.9, 0.7 + rng() * 0.3);
      g.add(leaf);
    }
    if (t > 0) {
      const truss = new THREE.Group();
      truss.position.y = hy - 0.04;
      const count = 3 + Math.floor(rng() * 3);
      for (let f = 0; f < count; f++) {
        const ripe = t === tiers - 1 ? rng() > 0.55 : rng() > 0.25;
        const fruit = new THREE.Mesh(new THREE.SphereGeometry(0.022 + rng() * 0.01, 8, 6), ripe ? K.tomatoRipe : K.tomatoGreen);
        fruit.position.set((f - count / 2) * 0.045, -rng() * 0.03, 0.02);
        truss.add(fruit);
      }
      truss.rotation.y = yaw;
      g.add(truss);
    }
  }
  parent.add(g);
}

function compoundLeaf(len, rng) {
  const g = new THREE.Group();
  const n = 5;
  for (let i = 0; i < n; i++) {
    const along = (i / (n - 1)) * len;
    const side = i === n - 1 ? 0 : (i % 2 === 0 ? -1 : 1);
    const leaflet = leafMesh(K.tomatoLeaf, len * 0.38, len * 0.22, 0.25, 0);
    leaflet.position.set(side * len * 0.18, along, 0);
    leaflet.rotation.z = side * 0.5;
    g.add(leaflet);
  }
  return g;
}

function squashPatch(parent, bed, y, rng) {
  const south = bed.d / 2 - 0.28;
  const crowns = [
    { x: -bed.w * 0.18, z: south - 0.15 },
    { x: bed.w * 0.16, z: south - 0.45 },
  ];
  for (const c of crowns) {
    for (let i = 0; i < 3; i++) {
      const yaw = rng() * Math.PI * 2;
      const reach = 0.18 + rng() * 0.28;
      const tip = new THREE.Vector3(c.x + Math.sin(yaw) * reach, y + 0.04, c.z + Math.cos(yaw) * reach);
      const pet = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.012, reach, 4), K.vine);
      pet.position.set((c.x + tip.x) / 2, y + 0.03, (c.z + tip.z) / 2);
      pet.quaternion.setFromUnitVectors(
        new THREE.Vector3(0, 1, 0),
        new THREE.Vector3(tip.x - c.x, 0.02, tip.z - c.z).normalize()
      );
      parent.add(pet);
      const fan = new THREE.Group();
      fan.position.copy(tip);
      fan.rotation.y = yaw;
      for (let lobe = 0; lobe < 5; lobe++) {
        const leaf = leafMesh(K.squash, 0.22 + rng() * 0.06, 0.12, 0.2, 0);
        const ly = (lobe / 5) * Math.PI * 2;
        leaf.rotation.order = 'YXZ';
        leaf.rotation.y = ly;
        leaf.rotation.x = 1.25;
        fan.add(leaf);
      }
      parent.add(fan);
    }
    if (rng() > 0.3) {
      const fruit = new THREE.Mesh(new THREE.SphereGeometry(0.075 + rng() * 0.02, 10, 8), K.squashFruit);
      fruit.scale.set(1, 0.82, 1);
      fruit.position.set(c.x + 0.08, y + 0.05, c.z + 0.05);
      parent.add(fruit);
    }
  }
}

function parsleyMound(parent, x, y, z, rng) {
  rosette(parent, x, y, z, 10, 0.11, 0.07, 0.3, 0.7, K.parsley, rng, 3);
}

function rosemaryBush(parent, x, y, z, rng) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  for (let i = 0; i < 7; i++) {
    const h = 0.28 + rng() * 0.22;
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.01, h, 4), K.rosemary);
    const yaw = rng() * Math.PI * 2;
    const lean = 0.15 + rng() * 0.35;
    stem.position.set(Math.sin(yaw) * 0.06, h / 2, Math.cos(yaw) * 0.06);
    stem.rotation.z = Math.sin(yaw) * lean;
    stem.rotation.x = Math.cos(yaw) * lean;
    g.add(stem);
    for (let n = 0; n < 5; n++) {
      const needle = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.05, 0.012), K.rosemary);
      needle.position.set(
        stem.position.x + (rng() - 0.5) * 0.04,
        0.08 + rng() * (h - 0.1),
        stem.position.z + (rng() - 0.5) * 0.04
      );
      g.add(needle);
    }
  }
  parent.add(g);
}

function seedlingPair(parent, x, y, z, scale, mature, rng) {
  const h = 0.025 * scale;
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.002, 0.003, h, 4), K.vine);
  stem.position.set(x, y + h / 2, z);
  parent.add(stem);
  const n = mature ? 4 : 2;
  for (let i = 0; i < n; i++) {
    const leaf = leafMesh(K.seedling, 0.028 * scale, 0.016 * scale, 0.15, 0);
    leaf.position.set(x, y + h, z);
    setPose(leaf, (i / n) * Math.PI * 2, mature ? 0.7 : 1.15);
    parent.add(leaf);
  }
}

function label(parent, text, x, y, z) {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 72;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#f3efe2';
  ctx.fillRect(0, 0, 256, 72);
  ctx.strokeStyle = '#6d5a40';
  ctx.lineWidth = 6;
  ctx.strokeRect(4, 4, 248, 64);
  ctx.fillStyle = '#2a2418';
  ctx.font = '600 36px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 128, 38);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  const board = new THREE.Mesh(new THREE.PlaneGeometry(0.26, 0.07), toon('#ffffff', { map: tex }));
  board.position.set(x, y, z);
  parent.add(board);
  const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.16, 4), K.stake);
  stick.position.set(x, y - 0.09, z);
  parent.add(stick);
}

function addBeans(parent, bed, rng) {
  const y = bed.soil;
  const insetZ = 0.18;
  const spacing = 0.46;
  const count = Math.max(4, Math.floor((bed.d - insetZ * 2) / spacing));
  const structure = new THREE.Group();
  const vines = new THREE.Group();
  vines.userData.shadowMode = 'receive';
  parent.add(structure);
  parent.add(vines);
  const apexY = y + 1.96;
  const baseX = bed.w * 0.28;
  const apices = [];
  for (let i = 0; i < count; i++) {
    const z = -bed.d / 2 + insetZ + (i + 0.5) * ((bed.d - insetZ * 2) / count);
    const jitter = (rng() - 0.5) * 0.05;
    const left = [-baseX + jitter, y, z];
    const right = [baseX + jitter * 0.5, y, z + (rng() - 0.5) * 0.04];
    const apex = [(rng() - 0.5) * 0.06, apexY + (rng() - 0.5) * 0.05, z];
    const caneMat = rng() > 0.5 ? K.cane : K.caneDark;
    span(structure, left, apex, 0.012, caneMat);
    span(structure, right, apex, 0.012, caneMat);
    apices.push(apex);
    const stage = 0.38 + 0.5 * (0.5 + 0.5 * Math.sin(i * 1.7 + 0.6));
    if (stage > 0.18) {
      vineAlong(vines, left, apex, Math.min(0.92, stage), rng);
      if (stage > 0.35) vineAlong(vines, right, apex, Math.min(0.88, stage * 0.92), rng);
    }
  }
  for (let i = 0; i < apices.length - 1; i++) {
    span(structure, apices[i], apices[i + 1], 0.011, K.cane);
    const midA = lerp3(apices[i], [-baseX, y, apices[i][2]], 0.48);
    const midB = lerp3(apices[i + 1], [-baseX, y, apices[i + 1][2]], 0.48);
    span(structure, midA, midB, 0.008, K.twine);
  }
  // East lip: young chard / spinach at the path edge, lower than the canes.
  const lipX = bed.w / 2 - 0.14;
  const lipN = Math.floor(bed.d / 0.3);
  for (let i = 0; i < lipN; i++) {
    const z = -bed.d / 2 + 0.2 + i * ((bed.d - 0.36) / lipN);
    if (rng() < 0.08) continue;
    chardPlant(vines, lipX + (rng() - 0.5) * 0.04, y, z, 0.62 + rng() * 0.28, rng() > 0.55, rng);
  }
}

function lerp3(a, b, t) {
  return [
    a[0] + (b[0] - a[0]) * t,
    a[1] + (b[1] - a[1]) * t,
    a[2] + (b[2] - a[2]) * t,
  ];
}

function span(g, a, b, radius, mat) {
  const start = new THREE.Vector3(a[0], a[1], a[2]);
  const end = new THREE.Vector3(b[0], b[1], b[2]);
  const dir = new THREE.Vector3().subVectors(end, start);
  const len = dir.length();
  if (len < 1e-4) return;
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius * 1.05, len, 5), mat);
  mesh.position.copy(start).add(end).multiplyScalar(0.5);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
  g.add(mesh);
}

function vineAlong(g, a, b, frac, rng) {
  const start = new THREE.Vector3(a[0], a[1], a[2]);
  const end = new THREE.Vector3(b[0], b[1], b[2]);
  const full = new THREE.Vector3().subVectors(end, start);
  const len = full.length() * frac;
  const dir = full.clone().normalize();
  const helper = Math.abs(dir.y) > 0.85 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0);
  const side = new THREE.Vector3().crossVectors(dir, helper).normalize();
  const bin = new THREE.Vector3().crossVectors(dir, side).normalize();
  const steps = Math.max(5, Math.floor(len / 0.08));
  const turns = len * 1.15;
  const pts = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const ang = t * turns * Math.PI * 2 + 0.4;
    const rad = 0.026;
    pts.push(start.clone()
      .addScaledVector(dir, t * len)
      .addScaledVector(side, Math.cos(ang) * rad)
      .addScaledVector(bin, Math.sin(ang) * rad));
  }
  const curve = new THREE.CatmullRomCurve3(pts);
  const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, steps, 0.0065, 4, false), K.vine);
  g.add(tube);
  for (let i = 2; i < pts.length; i += 3) {
    const p = pts[i];
    const young = frac < 0.4 || i > pts.length * 0.75;
    const leaf = leafMesh(young ? K.beanYoung : K.bean, young ? 0.09 : 0.13, young ? 0.07 : 0.095, 0.22, 1);
    leaf.position.copy(p);
    const along = start.clone().addScaledVector(dir, (i / steps) * len);
    const outward = p.clone().sub(along);
    setPose(leaf, Math.atan2(outward.x, outward.z), 0.85 + rng() * 0.4);
    g.add(leaf);
    if (!young && rng() < 0.2) {
      const flower = new THREE.Mesh(new THREE.ConeGeometry(0.012, 0.02, 5), K.flower);
      flower.position.copy(p);
      flower.position.y += 0.02;
      g.add(flower);
    }
    if (!young && rng() < 0.28 && i < pts.length * 0.65) {
      const pod = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.007, 0.07, 5), K.pod);
      pod.position.copy(p);
      pod.position.y -= 0.05;
      pod.rotation.z = 0.6 + rng() * 0.4;
      g.add(pod);
    }
  }
}

function addSalad(parent, bed, y, rng) {
  const pts = grid(bed.w, bed.d, 0.34, 0.36, 0.1, rng, 0.04);
  for (const p of pts) {
    if (rng() < 0.1) continue;
    if (p.u > 0.78) {
      rosette(parent, p.x, y, p.z, 4, 0.07, 0.04, 0.2, 0.65, K.baby, rng, 0);
    } else if (p.c % 2 === 0 && p.u > 0.4) {
      rosette(parent, p.x, y, p.z, 8, 0.12, 0.08, 0.35, 1.0, rng() > 0.45 ? K.oak : K.oakDark, rng, 3);
    } else if (p.u < 0.45) {
      rosette(parent, p.x, y, p.z, 7, 0.2, 0.08, 0.28, 0.38, K.romaine, rng, 0);
    } else {
      rosette(parent, p.x, y, p.z, 8, 0.13, 0.1, 0.4, 1.05, K.butter, rng, 0);
    }
  }
  rosemaryBush(parent, -bed.w / 2 + 0.16, y, -bed.d / 2 + 0.22, rng);
}

function addChard(parent, bed, y, rng) {
  const pts = grid(bed.w, bed.d, 0.48, 0.5, 0.12, rng, 0.06);
  for (const p of pts) {
    if (rng() < 0.16) continue;
    const young = rng() < 0.22;
    chardPlant(parent, p.x, y, p.z, young ? 0.55 : 0.85 + rng() * 0.35, rng() > 0.55, rng);
  }
}

function addBrassica(parent, bed, y, rng) {
  const pts = grid(bed.w, bed.d, 0.55, 0.58, 0.14, rng, 0.05);
  const kinds = ['cabbage', 'cabbage', 'kale', 'broccoli', 'young', 'cabbage', 'kale', 'gap'];
  pts.forEach((p, i) => {
    const kind = kinds[(i + Math.floor(rng() * 2)) % kinds.length];
    if (kind === 'gap' || rng() < 0.08) return;
    if (kind === 'kale') kalePlant(parent, p.x, y, p.z, 0.9 + rng() * 0.3, rng);
    else if (kind === 'broccoli') broccoli(parent, p.x, y, p.z, 0.85 + rng() * 0.3, rng);
    else if (kind === 'young') cabbage(parent, p.x, y, p.z, 0.55, rng);
    else cabbage(parent, p.x, y, p.z, 0.9 + rng() * 0.25, rng);
  });
}

function addTomato(parent, bed, y, rng) {
  const pts = grid(bed.w, bed.d, 0.7, 0.85, 0.16, rng, 0.04);
  for (const p of pts) {
    if (p.u > 0.68) continue;
    if (rng() < 0.2) continue;
    const h = p.u < 0.3 ? 0.7 + rng() * 0.15 : 1.05 + rng() * 0.25;
    tomatoPlant(parent, p.x, y, p.z, h, rng);
  }
  squashPatch(parent, bed, y, rng);
}

function addLeek(parent, bed, y, rng) {
  const pts = grid(bed.w, bed.d, 0.28, 0.22, 0.08, rng, 0.02);
  for (const p of pts) {
    if (rng() < 0.14) continue;
    const harvested = rng() < 0.08;
    if (harvested) continue;
    leekPlant(parent, p.x, y, p.z, 0.75 + rng() * 0.55, rng);
  }
}

function addRaspberry(parent, bed, y, rng) {
  const wires = new THREE.Group();
  parent.add(wires);
  const heights = [0.55, 1.05];
  for (const hz of heights) {
    span(wires,
      [-bed.w / 2 + 0.05, y + hz, 0],
      [bed.w / 2 - 0.05, y + hz, 0],
      0.006,
      K.twine);
  }
  const n = Math.max(6, Math.floor(bed.w / 0.38));
  for (let i = 0; i < n; i++) {
    const x = -bed.w / 2 + 0.12 + i * ((bed.w - 0.24) / n);
    const h = 1.15 + rng() * 0.55;
    const cane = new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.011, h, 5), rng() > 0.5 ? K.cane : K.caneDark);
    cane.position.set(x, y + h / 2, (i % 2 === 0 ? -1 : 1) * 0.08);
    cane.rotation.z = (rng() - 0.5) * 0.08;
    parent.add(cane);
    const clumps = 2 + Math.floor(rng() * 2);
    for (let c = 0; c < clumps; c++) {
      const cy = y + 0.35 + c * (h * 0.28);
      rosette(parent, x, cy, cane.position.z, 4, 0.1, 0.06, 0.25, 0.6, K.raspberry, rng, 2);
    }
  }
}

function addSeedlings(parent, bed, y, rng) {
  const cols = Math.max(3, Math.floor(bed.w / 0.16));
  const rows = Math.max(3, Math.floor(bed.d / 0.16));
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (rng() < 0.22) continue;
      const x = -bed.w / 2 + 0.1 + (c + 0.5) * ((bed.w - 0.2) / cols);
      const z = -bed.d / 2 + 0.1 + (r + 0.5) * ((bed.d - 0.2) / rows);
      const mature = r < 2;
      seedlingPair(parent, x, y, z, mature ? 1.5 : 1, mature, rng);
    }
  }
}

function addRoots(parent, bed, y, rng) {
  const pts = grid(bed.w, bed.d, 0.22, 0.24, 0.08, rng, 0.03);
  pts.forEach((p, i) => {
    if (rng() < 0.2) return;
    if (i % 7 === 0) beetPlant(parent, p.x, y, p.z, 0.85, rng);
    else if (i % 5 === 0) onionPlant(parent, p.x, y, p.z, 0.8 + rng() * 0.4, rng);
    else carrotPlant(parent, p.x, y, p.z, 0.75 + rng() * 0.5, rng);
  });
  parsleyMound(parent, bed.w / 2 - 0.12, y, -bed.d / 2 + 0.14, rng);
}

const LABELS = {
  beans: 'Beans',
  chard: 'Chard',
  salad: 'Lettuce',
  brassica: 'Brassicas',
  tomato: 'Tomato',
  leek: 'Leeks',
  raspberry: 'Raspberry',
  seedling: 'Seedlings',
  roots: 'Roots',
};

export function plantBed(parent, bed) {
  const rng = mulberry32(hashSeed(bed.id || bed.crop));
  const y = bed.soil;
  const foliage = new THREE.Group();
  foliage.name = bed.id + '-crop';
  if (bed.crop !== 'beans' && bed.crop !== 'raspberry') foliage.userData.shadowMode = 'receive';
  parent.add(foliage);
  if (bed.crop === 'beans') addBeans(parent, bed, rng);
  else if (bed.crop === 'chard') addChard(foliage, bed, y, rng);
  else if (bed.crop === 'salad') addSalad(foliage, bed, y, rng);
  else if (bed.crop === 'brassica') addBrassica(foliage, bed, y, rng);
  else if (bed.crop === 'tomato') addTomato(foliage, bed, y, rng);
  else if (bed.crop === 'leek') addLeek(foliage, bed, y, rng);
  else if (bed.crop === 'raspberry') addRaspberry(parent, bed, y, rng);
  else if (bed.crop === 'seedling') addSeedlings(foliage, bed, y, rng);
  else if (bed.crop === 'roots') addRoots(foliage, bed, y, rng);
  if (LABELS[bed.crop]) {
    label(parent, LABELS[bed.crop], 0, y + 0.2, bed.d / 2 - 0.08);
  }
}

export function sprouts(parent, x, y, z, n, seed) {
  const rng = mulberry32(hashSeed(seed));
  const g = new THREE.Group();
  g.position.set(x, y, z);
  g.userData.shadowMode = 'receive';
  for (let i = 0; i < n; i++) {
    seedlingPair(g, (rng() - 0.5) * 0.1, 0, (rng() - 0.5) * 0.1, 0.8 + rng() * 0.4, false, rng);
  }
  parent.add(g);
}

export function looseCanopy(parent, x, y, z, spec) {
  const rng = mulberry32(hashSeed(spec.id || `tree-${x}-${z}`));
  const colors = spec.colors.map((hex) => K.leaf(hex));
  const g = new THREE.Group();
  g.position.set(x, y, z);
  const clumps = spec.clumps || 5;
  for (let c = 0; c < clumps; c++) {
    const ox = (rng() - 0.5) * spec.radius * 1.4;
    const oy = (rng() - 0.2) * spec.height * 0.8;
    const oz = (rng() - 0.5) * spec.radius * 1.4;
    const n = spec.leaves || 14;
    for (let i = 0; i < n; i++) {
      const mat = colors[Math.floor(rng() * colors.length)];
      const len = spec.leaf * (0.75 + rng() * 0.5);
      const leaf = leafMesh(mat, len, len * (0.38 + rng() * 0.2), 0.3, spec.lobes || 0);
      const yaw = rng() * Math.PI * 2;
      const rad = rng() * spec.radius * 0.55;
      leaf.position.set(ox + Math.sin(yaw) * rad, oy + (rng() - 0.3) * 0.35, oz + Math.cos(yaw) * rad);
      setPose(leaf, yaw, 0.4 + rng() * 1.1);
      g.add(leaf);
    }
  }
  parent.add(g);
  return g;
}

export function hedgeClump(parent, x, y, z, height, seed) {
  looseCanopy(parent, x, y, z, {
    id: seed,
    radius: 0.38 + (hashSeed(seed) % 12) / 100,
    height: Math.min(height, 0.7),
    leaf: 0.22,
    leaves: 8,
    clumps: 2,
    lobes: 0,
    colors: ['#3e6a40', '#4f7d46', '#2f5534', '#5d8a48'],
  });
}
