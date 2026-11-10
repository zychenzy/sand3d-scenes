import * as THREE from 'three';
import { toon } from './scene_lib.js';

const GEO = {
  sphere: new THREE.SphereGeometry(1, 10, 8),
  sphereLow: new THREE.SphereGeometry(1, 7, 6),
  cone: new THREE.ConeGeometry(1, 1, 7),
  cyl: new THREE.CylinderGeometry(1, 1, 1, 6),
  torus: null,
};

const mats = new Map();

function M(color, opts) {
  const o = opts || {};
  const key = `${color}|${o.opacity ?? ''}|${o.emissive ?? ''}|${o.side === THREE.DoubleSide ? 'd' : ''}|${o.depthWrite === false ? 'n' : ''}`;
  let m = mats.get(key);
  if (!m) {
    m = toon(color, o);
    mats.set(key, m);
  }
  return m;
}

function hash(str) {
  let h = 2166136261;
  const s = String(str);
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function hexLerp(a, b, t) {
  const c = new THREE.Color(a);
  c.lerp(new THREE.Color(b || a), t);
  return `#${c.getHexString()}`;
}

function put(parent, mesh, x, y, z, rot) {
  mesh.position.set(x, y, z);
  if (rot) mesh.rotation.set(rot[0] || 0, rot[1] || 0, rot[2] || 0);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function ball(parent, x, y, z, rx, ry, rz, color, low) {
  const m = new THREE.Mesh(low ? GEO.sphereLow : GEO.sphere, M(color));
  m.scale.set(rx, ry, rz);
  return put(parent, m, x, y, z);
}

function cylBetween(parent, a, b, r, color) {
  const dir = new THREE.Vector3(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
  const len = dir.length() || 0.001;
  const m = new THREE.Mesh(GEO.cyl, M(color));
  m.scale.set(r, len, r);
  m.position.set((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.multiplyScalar(1 / len));
  m.castShadow = true;
  m.receiveShadow = true;
  parent.add(m);
  return m;
}

function lathe(parent, pts, color, opts = {}) {
  const geo = new THREE.LatheGeometry(pts.map(([y, r]) => new THREE.Vector2(r, y)), opts.seg || 14);
  const m = new THREE.Mesh(geo, M(color, opts.mat || {}));
  m.castShadow = true;
  m.receiveShadow = true;
  parent.add(m);
  return m;
}

function leaf(parent, x, y, z, length, width, thick, color, rot) {
  const m = new THREE.Mesh(GEO.sphere, M(color));
  m.scale.set(width * 0.5, thick * 0.5, length * 0.5);
  return put(parent, m, x, y, z, rot);
}

function petal(parent, x, y, z, len, wid, color, rot) {
  return leaf(parent, x, y, z, len, wid, wid * 0.28, color, rot);
}

const LEAF = '#2f6b3c';
const LEAF_D = '#1e4a2c';
const LEAF_B = '#6d9078';
const STEM = '#3e5a32';

function addVessel(g, vessel, spec) {
  const tint = spec.vesselColor;
  if (vessel === 'bucket') {
    lathe(g, [[0, 0.1], [0.02, 0.12], [0.27, 0.15], [0.305, 0.172], [0.33, 0.15]], tint || '#c5ccd1');
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.158, 0.012, 6, 16), M('#8b9499'));
    rim.rotation.x = Math.PI / 2;
    rim.position.y = 0.3;
    rim.castShadow = true;
    g.add(rim);
    const handle = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.007, 5, 14, Math.PI), M('#667075'));
    handle.position.y = 0.4;
    handle.castShadow = true;
    g.add(handle);
    const water = new THREE.Mesh(new THREE.CircleGeometry(0.125, 12), M('#5f7d6c'));
    water.rotation.x = -Math.PI / 2;
    water.position.y = 0.26;
    water.userData.noCast = true;
    g.add(water);
    return 0.3;
  }
  if (vessel === 'compote') {
    lathe(g, [[0, 0.07], [0.03, 0.09], [0.14, 0.035], [0.18, 0.11], [0.28, 0.16], [0.3, 0.145]], tint || '#f4efe6');
    return 0.28;
  }
  if (vessel === 'cylinder') {
    lathe(g, [[0, 0.09], [0.02, 0.1], [0.22, 0.1], [0.25, 0.115], [0.27, 0.09]], tint || '#f7f3ea');
    return 0.25;
  }
  if (vessel === 'crock') {
    lathe(g, [[0, 0.11], [0.04, 0.13], [0.2, 0.12], [0.24, 0.14], [0.26, 0.11]], tint || '#c46a3a');
    return 0.24;
  }
  if (vessel === 'bottle') {
    lathe(g, [[0, 0.045], [0.03, 0.055], [0.16, 0.05], [0.28, 0.028], [0.36, 0.032], [0.38, 0.026]], tint || '#f3efe4');
    return 0.36;
  }
  if (vessel === 'glass') {
    const glass = { transparent: true, opacity: 0.38, side: THREE.DoubleSide, depthWrite: false };
    lathe(g, [[0, 0.055], [0.02, 0.07], [0.2, 0.062], [0.34, 0.07], [0.37, 0.055]], tint || '#d7eee6', { mat: glass, seg: 16 });
    const water = new THREE.Mesh(new THREE.CircleGeometry(0.05, 10), M('#7ea898'));
    water.rotation.x = -Math.PI / 2;
    water.position.y = 0.22;
    water.userData.noCast = true;
    g.add(water);
    return 0.34;
  }
  if (vessel === 'urn') {
    lathe(g, [[0, 0.08], [0.04, 0.1], [0.12, 0.05], [0.2, 0.1], [0.36, 0.16], [0.44, 0.13], [0.47, 0.15]], tint || '#e7e2d4');
    return 0.44;
  }
  if (vessel === 'planter') {
    lathe(g, [[0, 0.16], [0.04, 0.18], [0.32, 0.17], [0.36, 0.19], [0.39, 0.16]], tint || '#d7c3a4');
    const saucer = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.2, 0.035, 14), M('#cbb89a'));
    saucer.position.y = 0.02;
    saucer.castShadow = true;
    saucer.receiveShadow = true;
    g.add(saucer);
    return 0.36;
  }
  if (vessel === 'dish') {
    lathe(g, [[0, 0.09], [0.025, 0.1], [0.06, 0.09], [0.075, 0.07]], tint || '#efeae0');
    return 0.06;
  }
  if (vessel === 'vase') {
    lathe(g, [[0, 0.07], [0.04, 0.09], [0.22, 0.045], [0.5, 0.07], [0.58, 0.09], [0.61, 0.07]], tint || '#efe8dc');
    return 0.58;
  }
  return 0;
}

function roseBloom(g, x, y, z, color, accent, s = 1) {
  const outer = hexLerp(color, accent, 0.35);
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    petal(g, x + Math.cos(a) * 0.03 * s, y, z + Math.sin(a) * 0.03 * s, 0.055 * s, 0.04 * s, outer, [0.5, a, 0.4]);
  }
  ball(g, x, y + 0.01 * s, z, 0.028 * s, 0.026 * s, 0.028 * s, color);
  ball(g, x, y + 0.028 * s, z, 0.016 * s, 0.018 * s, 0.016 * s, hexLerp(color, '#fff4ea', 0.35));
}

function roseBunch(g, y, spec, rand) {
  const n = 7;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + 0.4;
    const rad = i === 0 ? 0 : 0.055 + rand() * 0.03;
    const x = Math.cos(a) * rad;
    const z = Math.sin(a) * rad;
    const h = 0.16 + rand() * 0.1 + (i === 0 ? 0.06 : 0);
    cylBetween(g, [x * 0.3, y, z * 0.3], [x, y + h, z], 0.006, STEM);
    leaf(g, x + 0.03, y + h * 0.45, z, 0.07, 0.035, 0.012, LEAF, [0.8, a, 0.4]);
    roseBloom(g, x, y + h, z, spec.color, spec.accent, 0.85 + rand() * 0.3);
  }
}

function tulipBunch(g, y, spec, rand) {
  const n = 8;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const lean = 0.1 + (i % 3) * 0.04;
    const x = Math.sin(a) * lean;
    const z = Math.cos(a) * (lean * 0.85);
    const h = 0.34 + rand() * 0.12;
    cylBetween(g, [0, y, 0], [x, y + h, z], 0.006, '#3f6a38');
    const bud = new THREE.Mesh(GEO.cone, M(i % 2 ? spec.color : (spec.accent || spec.color)));
    bud.scale.set(0.028, 0.07, 0.028);
    const tip = [x + x * 0.15, y + h + 0.03, z + z * 0.15];
    bud.position.set(tip[0], tip[1], tip[2]);
    bud.rotation.z = -x * 1.4;
    bud.rotation.x = z * 1.4;
    bud.castShadow = true;
    g.add(bud);
    leaf(g, x * 0.4 + 0.04, y + 0.12, z * 0.4, 0.18, 0.035, 0.01, LEAF, [0.9, a, 0.6]);
  }
}

function hydrangea(g, y, spec) {
  const n = 18;
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    const yy = t;
    const rad = Math.sqrt(Math.max(0, 1 - yy * yy)) * 0.11;
    const a = i * 2.399;
    const col = hexLerp(spec.color, spec.accent || '#f7f4ff', (i % 3) / 2);
    ball(g, Math.cos(a) * rad, y + 0.08 + yy * 0.1, Math.sin(a) * rad, 0.028, 0.026, 0.028, col, true);
  }
  leaf(g, -0.08, y + 0.02, 0.02, 0.16, 0.09, 0.02, LEAF, [1.1, 0.4, 0.3]);
  leaf(g, 0.09, y + 0.02, -0.02, 0.15, 0.08, 0.02, LEAF_D, [1.0, -0.6, -0.2]);
}

function poppy(g, y, spec, rand) {
  const n = 3;
  for (let k = 0; k < n; k++) {
    const a0 = rand() * 6;
    const x = (k - 1) * 0.06;
    const z = (k === 1 ? -0.02 : 0.04);
    const h = 0.28 + rand() * 0.1;
    cylBetween(g, [x * 0.2, y, 0], [x, y + h, z], 0.004, '#4a6a38');
    for (let i = 0; i < 5; i++) {
      const a = a0 + (i / 5) * Math.PI * 2;
      petal(g, x + Math.cos(a) * 0.035, y + h, z + Math.sin(a) * 0.035, 0.07, 0.045, i % 2 ? spec.color : (spec.accent || spec.color), [1.15, a, 0]);
    }
    ball(g, x, y + h + 0.005, z, 0.012, 0.008, 0.012, '#1c1418');
  }
  ball(g, 0.05, y + 0.16, -0.03, 0.018, 0.028, 0.018, spec.color);
}

function ranunculus(g, y, spec, rand) {
  for (let k = 0; k < 5; k++) {
    const a = (k / 5) * Math.PI * 2;
    const x = Math.cos(a) * (k === 0 ? 0 : 0.05);
    const z = Math.sin(a) * (k === 0 ? 0 : 0.05);
    const h = 0.14 + rand() * 0.08;
    cylBetween(g, [0, y, 0], [x, y + h, z], 0.005, STEM);
    for (let i = 0; i < 9; i++) {
      const p = (i / 9) * Math.PI * 2;
      const rad = 0.012 + (i % 3) * 0.008;
      petal(
        g,
        x + Math.cos(p) * rad,
        y + h + (i % 2) * 0.006,
        z + Math.sin(p) * rad,
        0.035,
        0.028,
        hexLerp(spec.color, spec.accent || '#fff6d8', (i % 3) / 3),
        [0.7, p, 0.5],
      );
    }
    ball(g, x, y + h + 0.012, z, 0.012, 0.012, 0.012, hexLerp(spec.color, '#fff', 0.4));
  }
}

function fern(g, y, spec) {
  const color = spec.color || LEAF;
  const fronds = 6;
  for (let f = 0; f < fronds; f++) {
    const yaw = (f / fronds) * Math.PI * 2 + 0.3;
    const length = 0.28 + (f % 2) * 0.08;
    let prev = [0, y, 0];
    const steps = 7;
    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      const along = t * length;
      const lift = Math.sin(t * Math.PI) * 0.1 - t * t * 0.06;
      const p = [Math.sin(yaw) * along, y + lift, Math.cos(yaw) * along];
      cylBetween(g, prev, p, 0.004, '#3a5a30');
      const side = yaw + Math.PI / 2;
      const ll = 0.07 * (1.15 - t);
      for (const s of [-1, 1]) {
        leaf(
          g,
          p[0] + Math.sin(side) * s * ll * 0.45,
          p[1],
          p[2] + Math.cos(side) * s * ll * 0.45,
          ll,
          ll * 0.38,
          0.008,
          f % 2 ? color : LEAF_D,
          [0.6, yaw, s * 0.4],
        );
      }
      prev = p;
    }
  }
}

function sunflower(g, y, spec) {
  const h = 0.78;
  cylBetween(g, [0, y, 0], [0.02, y + h, 0], 0.012, '#4a6a28');
  leaf(g, 0.08, y + 0.28, 0.02, 0.22, 0.1, 0.018, LEAF, [0.9, 0.2, 0.8]);
  leaf(g, -0.06, y + 0.42, -0.02, 0.2, 0.09, 0.016, LEAF_D, [1.0, 2.4, -0.7]);
  const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.035, 14), M(spec.accent || '#5a3818'));
  disc.position.y = y + h;
  disc.castShadow = true;
  g.add(disc);
  for (let ring = 0; ring < 2; ring++) {
    const count = ring === 0 ? 14 : 10;
    const rad = ring === 0 ? 0.13 : 0.09;
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2 + ring * 0.2;
      petal(
        g,
        Math.cos(a) * rad,
        y + h - 0.005,
        Math.sin(a) * rad,
        0.11,
        0.045,
        ring ? hexLerp(spec.color, '#fff1c2', 0.35) : spec.color,
        [1.15, a, 0.15],
      );
    }
  }
}

function eucalyptus(g, y, spec) {
  const color = spec.color || LEAF_B;
  const stems = 5;
  for (let s = 0; s < stems; s++) {
    const yaw = (s / stems) * Math.PI * 1.4 - 0.5;
    const length = 0.34 + (s % 2) * 0.1;
    let prev = [0, y + 0.02, 0];
    const steps = 6;
    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      const along = t * length;
      const yy = y + Math.sin(t * 1.2) * 0.16 - t * t * 0.28;
      const p = [Math.sin(yaw) * along, yy, Math.cos(yaw) * along];
      cylBetween(g, prev, p, 0.0045, '#5d6b52');
      const side = yaw + Math.PI / 2;
      for (const sg of [-1, 1]) {
        ball(
          g,
          p[0] + Math.sin(side) * sg * 0.035,
          p[1],
          p[2] + Math.cos(side) * sg * 0.035,
          0.028,
          0.012,
          0.018,
          i % 2 ? color : '#8eae96',
          true,
        );
      }
      prev = p;
    }
  }
}

function peony(g, y, spec) {
  leaf(g, -0.1, y + 0.04, 0.04, 0.2, 0.1, 0.02, LEAF, [1.0, 0.5, 0.5]);
  leaf(g, 0.1, y + 0.03, -0.02, 0.18, 0.09, 0.02, LEAF_D, [1.1, -0.8, -0.4]);
  for (let k = 0; k < 3; k++) {
    const a = (k / 3) * Math.PI * 2;
    const x = Math.cos(a) * 0.06;
    const z = Math.sin(a) * 0.05;
    const by = y + 0.1 + (k === 0 ? 0.04 : 0);
    for (let i = 0; i < 8; i++) {
      const p = (i / 8) * Math.PI * 2;
      const rad = 0.02 + (i % 2) * 0.025;
      petal(g, x + Math.cos(p) * rad, by, z + Math.sin(p) * rad, 0.07, 0.05, i % 2 ? spec.color : (spec.accent || spec.color), [0.9, p, 0.3]);
    }
    ball(g, x, by + 0.02, z, 0.03, 0.028, 0.03, hexLerp(spec.color, '#fff', 0.25));
  }
}

function monsteraLeafGeo() {
  const s = new THREE.Shape();
  s.moveTo(0, -0.05);
  s.bezierCurveTo(0.22, -0.02, 0.34, 0.18, 0.22, 0.38);
  s.bezierCurveTo(0.14, 0.52, 0.05, 0.46, 0, 0.62);
  s.bezierCurveTo(-0.05, 0.46, -0.14, 0.52, -0.22, 0.38);
  s.bezierCurveTo(-0.34, 0.18, -0.22, -0.02, 0, -0.05);
  const hole = (x, y, rx, ry) => {
    const p = new THREE.Path();
    p.absellipse(x, y, rx, ry, 0, Math.PI * 2, true);
    s.holes.push(p);
  };
  hole(-0.08, 0.22, 0.035, 0.05);
  hole(0.09, 0.28, 0.03, 0.045);
  hole(0.02, 0.4, 0.025, 0.035);
  const geo = new THREE.ShapeGeometry(s, 6);
  geo.computeVertexNormals();
  return geo;
}

let monsteraGeo = null;

function monstera(g, y) {
  if (!monsteraGeo) monsteraGeo = monsteraLeafGeo();
  const poses = [
    [0.02, 0.55, 0.0, -0.9, 0.4, 0.1, 1.15],
    [-0.12, 0.78, 0.08, -1.05, 1.4, 0.2, 0.95],
    [0.16, 0.42, -0.1, -0.7, -0.8, -0.15, 1.05],
    [-0.05, 0.95, -0.06, -1.15, 2.4, 0.25, 0.8],
  ];
  for (const [x, yy, z, rx, ry, rz, sc] of poses) {
    cylBetween(g, [x * 0.2, y, z * 0.2], [x, y + yy * 0.75, z], 0.012, '#2c6a3c');
    const m = new THREE.Mesh(monsteraGeo, M('#1f7a3e', { side: THREE.DoubleSide }));
    m.position.set(x, y + yy, z);
    m.rotation.set(rx, ry, rz);
    m.scale.setScalar(sc);
    m.castShadow = true;
    m.receiveShadow = true;
    g.add(m);
  }
}

function dracaena(g, y) {
  const canes = [[0, 0, 0, 0.95], [-0.07, 0, 0.04, 0.72], [0.08, 0, -0.03, 0.6]];
  for (const [x, , z, h] of canes) {
    cylBetween(g, [x * 0.2, y, z * 0.2], [x, y + h, z], 0.016, '#6a5340');
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2 + h;
      const len = 0.34 + (i % 3) * 0.08;
      const droop = (i % 2) * 0.1;
      const mx = x + Math.cos(a) * len * 0.45;
      const mz = z + Math.sin(a) * len * 0.45;
      const my = y + h + 0.02 - droop * 0.3;
      leaf(g, mx, my, mz, len, 0.055, 0.012, i % 2 ? '#2f8a48' : '#1d6a32', [droop + 0.4, a, 0]);
    }
  }
}

function pampas(g, y, spec) {
  const n = 11;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const rad = 0.015 + (i % 3) * 0.01;
    const h = 0.42 + (i % 4) * 0.1;
    const x = Math.cos(a) * rad;
    const z = Math.sin(a) * rad;
    cylBetween(g, [x * 0.3, y, z * 0.3], [x, y + h, z], 0.0035, '#c2b49a');
    ball(g, x, y + h + 0.045, z, 0.028, 0.07, 0.028, i % 2 ? (spec.color || '#f0e4d0') : '#e7d7c0', true);
  }
}

function bird(g, y, spec) {
  leaf(g, 0.02, y + 0.35, -0.02, 0.55, 0.12, 0.02, '#1f6a38', [0.4, 0.3, 0.8]);
  leaf(g, -0.04, y + 0.28, 0.04, 0.48, 0.1, 0.018, LEAF, [0.5, -0.8, -0.6]);
  const blooms = [[0.04, 0.42, 0.08, 0.5], [-0.08, 0.5, 0.02, -0.4]];
  for (const [x, yy, z, rot] of blooms) {
    cylBetween(g, [0, y, 0], [x, y + yy, z], 0.008, '#2e6a34');
    const beak = new THREE.Mesh(GEO.cone, M(spec.color || '#e25a1c'));
    beak.scale.set(0.06, 0.2, 0.05);
    beak.position.set(x + 0.06, y + yy, z);
    beak.rotation.z = -1.2;
    beak.rotation.y = rot;
    beak.castShadow = true;
    g.add(beak);
    petal(g, x + 0.1, y + yy + 0.02, z, 0.1, 0.04, spec.accent || '#3a6ea5', [0.2, rot, -0.8]);
  }
}

function orchid(g, y, spec) {
  const sprays = 2;
  for (let s = 0; s < sprays; s++) {
    const yaw = s === 0 ? 0.5 : -0.7;
    let prev = [0, y, 0];
    for (let i = 1; i <= 7; i++) {
      const t = i / 7;
      const p = [
        Math.sin(yaw) * t * 0.22,
        y + 0.08 + Math.sin(t * 1.4) * 0.28,
        Math.cos(yaw) * t * 0.16,
      ];
      cylBetween(g, prev, p, 0.0035, '#6a8a58');
      if (i > 3) {
        const col = spec.color || '#f7f4f2';
        petal(g, p[0], p[1] + 0.02, p[2], 0.045, 0.02, col, [-0.4, yaw, 0]);
        petal(g, p[0] + 0.015, p[1], p[2], 0.04, 0.016, col, [0.2, yaw + 1, 0.6]);
        petal(g, p[0] - 0.015, p[1], p[2], 0.04, 0.016, col, [0.2, yaw - 1, -0.6]);
        petal(g, p[0], p[1] - 0.012, p[2] + 0.005, 0.035, 0.022, spec.accent || '#c44878', [1.2, yaw, 0]);
      }
      prev = p;
    }
  }
}

function hyacinth(g, y, spec) {
  leaf(g, 0.02, y + 0.05, 0, 0.16, 0.035, 0.012, LEAF, [1.2, 0.2, 0.9]);
  leaf(g, -0.02, y + 0.05, 0.01, 0.15, 0.03, 0.01, LEAF_D, [1.15, 1.2, -0.8]);
  const h = 0.22;
  cylBetween(g, [0, y, 0], [0, y + h, 0], 0.008, '#3e6a34');
  for (let i = 0; i < 16; i++) {
    const t = i / 15;
    const a = i * 2.3;
    const rad = 0.02 * (1 - t * 0.4);
    ball(
      g,
      Math.cos(a) * rad,
      y + 0.06 + t * h,
      Math.sin(a) * rad,
      0.016,
      0.014,
      0.016,
      hexLerp(spec.color, spec.accent || '#f2e8ff', (i % 3) / 3),
      true,
    );
  }
}

function succulent(g, y, spec) {
  const layers = [8, 6, 4];
  layers.forEach((n, layer) => {
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + layer * 0.4;
      const rad = 0.055 - layer * 0.014;
      const m = new THREE.Mesh(GEO.cone, M(layer === 2 ? (spec.accent || '#b7d4a8') : (spec.color || '#7eaa78')));
      m.scale.set(0.018, 0.055, 0.012);
      m.position.set(Math.cos(a) * rad, y + 0.03 + layer * 0.012, Math.sin(a) * rad);
      m.rotation.z = Math.cos(a) * 0.9;
      m.rotation.x = -Math.sin(a) * 0.9;
      m.castShadow = true;
      g.add(m);
    }
  });
}

function lilyBunch(g, y, spec, rand) {
  const n = 4;
  for (let k = 0; k < n; k++) {
    const a = (k / n) * Math.PI * 2 + 0.5;
    const x = Math.sin(a) * 0.05;
    const z = Math.cos(a) * 0.05;
    const h = 0.48 + rand() * 0.18;
    cylBetween(g, [0, y, 0], [x, y + h, z], 0.006, '#3d6a34');
    leaf(g, x + 0.05, y + h * 0.4, z, 0.2, 0.04, 0.012, LEAF, [0.7, a, 0.8]);
    const bloom = new THREE.Mesh(GEO.cone, M(spec.color));
    bloom.scale.set(0.04, 0.07, 0.04);
    bloom.position.set(x, y + h + 0.02, z);
    bloom.rotation.x = Math.PI;
    bloom.castShadow = true;
    g.add(bloom);
    for (let i = 0; i < 6; i++) {
      const p = (i / 6) * Math.PI * 2;
      petal(g, x + Math.cos(p) * 0.03, y + h + 0.015, z + Math.sin(p) * 0.03, 0.08, 0.022, spec.accent || spec.color, [0.8, p, 0.5]);
    }
    for (let i = 0; i < 3; i++) {
      cylBetween(
        g,
        [x, y + h + 0.02, z],
        [x + Math.cos(i) * 0.02, y + h + 0.06, z + Math.sin(i) * 0.02],
        0.002,
        '#d8b44a',
      );
    }
  }
}

function palm(g, y, spec) {
  const fans = 5;
  for (let f = 0; f < fans; f++) {
    const yaw = (f / fans) * Math.PI * 2;
    const lift = 0.22 + (f % 2) * 0.08;
    const origin = [Math.sin(yaw) * 0.04, y + lift, Math.cos(yaw) * 0.04];
    cylBetween(g, [0, y, 0], origin, 0.007, '#3e6840');
    for (let i = 0; i < 7; i++) {
      const spread = (i - 3) * 0.18;
      const a = yaw + spread;
      const len = 0.22 - Math.abs(i - 3) * 0.02;
      cylBetween(
        g,
        origin,
        [origin[0] + Math.sin(a) * len, origin[1] + 0.04 + (3 - Math.abs(i - 3)) * 0.01, origin[2] + Math.cos(a) * len],
        0.006,
        f % 2 ? (spec.color || '#2f8a44') : '#246e36',
      );
    }
  }
}

function calla(g, y, spec, rand) {
  const n = 4;
  for (let k = 0; k < n; k++) {
    const a = (k / n) * Math.PI * 2 + 0.6;
    const x = Math.sin(a) * 0.04;
    const z = Math.cos(a) * 0.035;
    const h = 0.28 + rand() * 0.12;
    cylBetween(g, [0, y, 0], [x, y + h, z], 0.006, '#3a6840');
    const spathe = new THREE.Mesh(GEO.cone, M(spec.color || '#f7f6f2'));
    spathe.scale.set(0.045, 0.11, 0.035);
    spathe.position.set(x + Math.sin(a) * 0.02, y + h + 0.02, z + Math.cos(a) * 0.02);
    spathe.rotation.z = -0.7;
    spathe.rotation.y = a;
    spathe.castShadow = true;
    g.add(spathe);
    cylBetween(
      g,
      [x, y + h, z],
      [x + Math.sin(a) * 0.05, y + h + 0.05, z + Math.cos(a) * 0.05],
      0.006,
      spec.accent || '#e2c15a',
    );
    leaf(g, x, y + 0.08, z, 0.16, 0.06, 0.012, LEAF, [1.0, a, 0.4]);
  }
}

function babysbreath(g, y, spec) {
  for (let i = 0; i < 22; i++) {
    const a = i * 2.399;
    const t = (i % 7) / 6;
    const h = 0.08 + t * 0.16;
    const rad = 0.02 + (i % 5) * 0.012;
    const x = Math.cos(a) * rad;
    const z = Math.sin(a) * rad;
    cylBetween(g, [x * 0.2, y, z * 0.2], [x, y + h, z], 0.002, '#7d8a6e');
    ball(g, x, y + h, z, 0.008, 0.008, 0.008, i % 2 ? (spec.color || '#f7f7f4') : '#fffaf2', true);
  }
}

function wrapped(g, y, spec) {
  const paper = spec.paper || '#c6a36a';
  const h = spec.tall ? 0.46 : 0.32;
  const top = spec.tall ? 0.13 : 0.15;
  lathe(g, [[0.02, 0.035], [h * 0.3, 0.07], [h * 0.85, top], [h, top * 0.92]], paper, { seg: 12 });
  const ruffle = new THREE.Mesh(new THREE.TorusGeometry(top * 0.95, 0.018, 6, 14), M(spec.tissue || '#f4e4e0'));
  ruffle.rotation.x = Math.PI / 2;
  ruffle.position.y = h * 0.92;
  ruffle.castShadow = true;
  g.add(ruffle);
  const band = new THREE.Mesh(new THREE.TorusGeometry(top * 0.72, 0.01, 5, 14), M(spec.ribbon || '#c44868'));
  band.rotation.x = Math.PI / 2;
  band.position.y = h * 0.62;
  g.add(band);
  const bow = new THREE.Mesh(GEO.sphere, M(spec.ribbon || '#c44868'));
  bow.scale.set(0.04, 0.02, 0.025);
  bow.position.set(top * 0.3, h * 0.62, 0);
  bow.castShadow = true;
  g.add(bow);
  const heads = spec.tall ? 5 : 4;
  for (let i = 0; i < heads; i++) {
    const a = (i / heads) * Math.PI * 2;
    const rad = 0.03 + (i % 2) * 0.02;
    if (spec.blooms === 'tulip') {
      const bud = new THREE.Mesh(GEO.cone, M(i % 2 ? spec.color : (spec.accent || spec.color)));
      bud.scale.set(0.038, 0.09, 0.038);
      bud.position.set(Math.cos(a) * rad, h + 0.07, Math.sin(a) * rad);
      bud.castShadow = true;
      g.add(bud);
    } else {
      roseBloom(g, Math.cos(a) * rad, h + 0.04, Math.sin(a) * rad, spec.color, spec.accent, 0.95);
    }
  }
}

const BUILDERS = {
  rose: roseBunch,
  tulip: tulipBunch,
  hydrangea,
  poppy,
  ranunculus,
  fern,
  sunflower,
  eucalyptus,
  peony,
  monstera,
  dracaena,
  pampas,
  bird,
  orchid,
  hyacinth,
  succulent,
  lily: lilyBunch,
  palm,
  calla,
  babysbreath,
  wrapped,
};

export function addArrangement(parent, spec) {
  const g = new THREE.Group();
  g.name = spec.id || spec.kind;
  const p = spec.position || [0, 0, 0];
  g.position.set(p[0], p[1], p[2]);
  g.rotation.y = spec.rotationY || 0;
  g.scale.setScalar(spec.scale || 1);
  const rand = rng(hash(spec.id || spec.kind));
  const rim = addVessel(g, spec.vessel || 'none', spec);
  const build = BUILDERS[spec.kind];
  if (!build) throw new Error(`unknown botanical ${spec.kind}`);
  build(g, rim, spec, rand);
  parent.add(g);
  return g;
}

export function addSprig(parent, kind, x, y, z) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  if (kind === 'rose-stem') {
    cylBetween(g, [0, 0, 0], [0.01, 0.16, 0], 0.004, STEM);
    leaf(g, 0.03, 0.08, 0, 0.06, 0.028, 0.01, LEAF, [0.8, 0.4, 0.5]);
    roseBloom(g, 0.01, 0.18, 0, '#c4405a', '#e7a0b0', 0.65);
  } else if (kind === 'fern-sprig') {
    fern(g, 0, { color: '#3d8a48' });
    g.scale.setScalar(0.22);
  }
  parent.add(g);
  return g;
}
