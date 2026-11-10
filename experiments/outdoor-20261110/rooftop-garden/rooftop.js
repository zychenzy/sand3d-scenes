import * as THREE from 'three';
import { boot, toon } from './scene_lib.js';

const mats = new Map();
function mat(hex) {
  if (!mats.has(hex)) mats.set(hex, toon(hex));
  return mats.get(hex);
}

function addBox(g, w, h, d, color, x, y, z) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(color));
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  g.add(m);
  return m;
}

function addCyl(g, rTop, rBot, h, color, x, y, z, seg = 7) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBot, h, seg), mat(color));
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  g.add(m);
  return m;
}

const GEO = {
  leaf: new THREE.SphereGeometry(1, 6, 5),
  ball: new THREE.SphereGeometry(1, 5, 4),
  cone: new THREE.ConeGeometry(1, 1, 6),
};

function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hash(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

function leafPaddle(g, color, x, y, z, sx, sy, sz, rx, ry, rz) {
  const m = new THREE.Mesh(GEO.leaf, mat(color));
  m.scale.set(sx, sy, sz);
  m.position.set(x, y, z);
  m.rotation.set(rx, ry, rz);
  m.castShadow = true;
  m.receiveShadow = true;
  g.add(m);
  return m;
}

function addOlive(g, x, y, z, scale, seed) {
  const rand = rng(seed);
  const grp = new THREE.Group();
  const wood = '#5a4332';
  const leaves = ['#6d7848', '#7f8756', '#5a663c', '#8b9160', '#4e5c38'];
  const stems = 3 + (rand() > 0.6 ? 1 : 0);
  for (let i = 0; i < stems; i++) {
    const ang = (i / stems) * Math.PI * 2 + rand() * 0.4;
    const h = 1.15 + rand() * 0.55;
    const lean = 0.18 + rand() * 0.28;
    const trunk = addCyl(grp, 0.028, 0.05, h, wood, Math.cos(ang) * 0.06, h / 2, Math.sin(ang) * 0.06, 6);
    trunk.rotation.z = Math.cos(ang) * lean;
    trunk.rotation.x = -Math.sin(ang) * lean;
    for (let b = 0; b < 2; b++) {
      const bang = ang + (b === 0 ? -0.9 : 0.7) + rand() * 0.3;
      const bh = h * (0.58 + b * 0.22);
      const blen = 0.38 + rand() * 0.32;
      const bx = Math.cos(ang) * 0.06 + Math.cos(bang) * blen * 0.55;
      const bz = Math.sin(ang) * 0.06 + Math.sin(bang) * blen * 0.55;
      const by = bh + 0.05;
      const branch = addCyl(grp, 0.012, 0.02, blen, wood, bx, by, bz, 5);
      branch.rotation.z = Math.cos(bang) * 1.05;
      branch.rotation.x = -Math.sin(bang) * 1.05;
      for (let k = 0; k < 3; k++) {
        const color = leaves[(i + b + k) % leaves.length];
        leafPaddle(
          grp,
          color,
          bx + Math.cos(bang) * 0.16 + (rand() - 0.5) * 0.12,
          by + 0.08 + k * 0.1,
          bz + Math.sin(bang) * 0.16 + (rand() - 0.5) * 0.12,
          0.2 + rand() * 0.08,
          0.09 + rand() * 0.03,
          0.15 + rand() * 0.06,
          rand() * 0.6,
          rand() * 6,
          rand() * 0.5
        );
      }
    }
  }
  grp.position.set(x, y, z);
  grp.scale.setScalar(scale);
  g.add(grp);
}

function addFig(g, x, y, z, scale, seed) {
  const rand = rng(seed);
  const grp = new THREE.Group();
  const h = 0.85;
  addCyl(grp, 0.045, 0.07, h, '#4e3a2c', 0, h / 2, 0, 7);
  addCyl(grp, 0.03, 0.04, 0.55, '#4e3a2c', 0.12, h + 0.05, 0.04, 6).rotation.z = -0.7;
  addCyl(grp, 0.028, 0.038, 0.48, '#4e3a2c', -0.1, h + 0.02, -0.05, 6).rotation.z = 0.65;
  const greens = ['#3f5a34', '#4d6840', '#355030', '#5a7048'];
  for (let i = 0; i < 9; i++) {
    const ang = (i / 9) * Math.PI * 2 + rand() * 0.2;
    const rad = 0.22 + rand() * 0.2;
    const ly = h + 0.15 + rand() * 0.28;
    const pet = addCyl(grp, 0.008, 0.012, rad, '#3e4a30', Math.cos(ang) * rad * 0.45, ly - 0.04, Math.sin(ang) * rad * 0.45, 4);
    pet.rotation.z = Math.cos(ang) * 0.9;
    pet.rotation.x = -Math.sin(ang) * 0.9;
    leafPaddle(
      grp,
      greens[i % greens.length],
      Math.cos(ang) * rad,
      ly,
      Math.sin(ang) * rad,
      0.2 + rand() * 0.06,
      0.035,
      0.12 + rand() * 0.04,
      0.4 + rand() * 0.4,
      ang,
      0.2
    );
  }
  grp.position.set(x, y, z);
  grp.scale.setScalar(scale);
  g.add(grp);
}

function addGrass(g, x, y, z, scale, seed, plume) {
  const rand = rng(seed);
  const grp = new THREE.Group();
  const n = plume ? 16 : 12;
  for (let i = 0; i < n; i++) {
    const ang = rand() * Math.PI * 2;
    const rad = rand() * 0.16;
    const h = (plume ? 0.55 : 0.28) + rand() * (plume ? 0.7 : 0.38);
    const blade = addBox(
      grp,
      0.012,
      h,
      0.03 + rand() * 0.02,
      rand() > 0.75 ? '#c2b48a' : (rand() > 0.5 ? '#6d7a40' : '#8a8a52'),
      Math.cos(ang) * rad,
      h / 2,
      Math.sin(ang) * rad
    );
    blade.rotation.y = ang;
    blade.rotation.z = (rand() - 0.5) * 0.45;
    blade.rotation.x = (rand() - 0.5) * 0.45;
    if (plume && rand() > 0.55) {
      addBox(grp, 0.02, 0.08, 0.02, '#ddd0a4', Math.cos(ang) * rad, h, Math.sin(ang) * rad);
    }
  }
  grp.position.set(x, y, z);
  grp.scale.setScalar(scale);
  g.add(grp);
}

function addShrub(g, x, y, z, scale, seed) {
  const rand = rng(seed);
  const grp = new THREE.Group();
  const colors = ['#4a623c', '#3e5634', '#5d7348', '#2f4a30'];
  for (let layer = 0; layer < 3; layer++) {
    const ly = 0.12 + layer * 0.16;
    const count = 4 - layer;
    for (let i = 0; i < count; i++) {
      const ang = rand() * Math.PI * 2;
      const rad = 0.12 + rand() * 0.16 * (1 - layer * 0.25);
      leafPaddle(
        grp,
        colors[(layer + i) % colors.length],
        Math.cos(ang) * rad,
        ly,
        Math.sin(ang) * rad,
        0.16 + rand() * 0.06,
        0.07,
        0.12,
        rand() * 0.4,
        ang,
        rand() * 0.3
      );
    }
  }
  addCyl(grp, 0.02, 0.03, 0.16, '#4a3a2c', 0, 0.08, 0, 5);
  grp.position.set(x, y, z);
  grp.scale.setScalar(scale);
  g.add(grp);
}

function addRosemary(g, x, y, z, scale, seed) {
  const rand = rng(seed);
  const grp = new THREE.Group();
  const n = 6 + Math.floor(rand() * 3);
  for (let i = 0; i < n; i++) {
    const ang = rand() * Math.PI * 2;
    const rad = rand() * 0.08;
    const h = 0.22 + rand() * 0.22;
    const spike = addCyl(grp, 0.01, 0.02, h, rand() > 0.5 ? '#6a7560' : '#7d886c', Math.cos(ang) * rad, h / 2, Math.sin(ang) * rad, 5);
    spike.rotation.z = (rand() - 0.5) * 0.25;
  }
  grp.position.set(x, y, z);
  grp.scale.setScalar(scale);
  g.add(grp);
}

function addBasil(g, x, y, z, scale, seed) {
  const rand = rng(seed);
  const grp = new THREE.Group();
  const colors = ['#3f6a3c', '#4e7a48', '#356034', '#5a8450'];
  for (let i = 0; i < 7; i++) {
    const ang = (i / 7) * Math.PI * 2 + rand() * 0.2;
    const rad = 0.04 + rand() * 0.08;
    const ly = 0.06 + rand() * 0.12;
    leafPaddle(grp, colors[i % colors.length], Math.cos(ang) * rad, ly, Math.sin(ang) * rad, 0.09, 0.018, 0.055, 0.3, ang, 0.2);
  }
  grp.position.set(x, y, z);
  grp.scale.setScalar(scale);
  g.add(grp);
}

function addThyme(g, x, y, z, scale, seed) {
  const rand = rng(seed);
  const grp = new THREE.Group();
  for (let i = 0; i < 8; i++) {
    const m = new THREE.Mesh(GEO.ball, mat(i % 2 ? '#6a7a44' : '#7d8a52'));
    m.scale.set(0.07 + rand() * 0.03, 0.025, 0.06 + rand() * 0.02);
    m.position.set((rand() - 0.5) * 0.2, 0.02, (rand() - 0.5) * 0.16);
    m.castShadow = true;
    m.receiveShadow = true;
    grp.add(m);
  }
  grp.position.set(x, y, z);
  grp.scale.setScalar(scale);
  g.add(grp);
}

function addSalvia(g, x, y, z, scale, seed) {
  const rand = rng(seed);
  const grp = new THREE.Group();
  const spikes = 4 + Math.floor(rand() * 2);
  for (let i = 0; i < spikes; i++) {
    const ang = rand() * Math.PI * 2;
    const rad = rand() * 0.07;
    const h = 0.28 + rand() * 0.16;
    addCyl(grp, 0.008, 0.012, h, '#3f5a34', Math.cos(ang) * rad, h / 2, Math.sin(ang) * rad, 4);
    for (let k = 0; k < 4; k++) {
      addBox(
        grp,
        0.035,
        0.04,
        0.035,
        k % 2 ? '#a84848' : '#8d3c40',
        Math.cos(ang) * rad,
        h * 0.45 + k * 0.055,
        Math.sin(ang) * rad
      );
    }
  }
  grp.position.set(x, y, z);
  grp.scale.setScalar(scale);
  g.add(grp);
}

function addFern(g, x, y, z, scale, seed) {
  const rand = rng(seed);
  const grp = new THREE.Group();
  for (let f = 0; f < 5; f++) {
    const yaw = -0.5 + f * 0.28 + rand() * 0.05;
    let px = 0;
    let py = 0.02;
    let pz = 0;
    for (let s = 0; s < 4; s++) {
      const len = 0.16 - s * 0.03;
      px += Math.sin(yaw) * len * 0.7;
      pz += Math.cos(yaw) * len * 0.15;
      py += 0.05 - s * 0.03;
      const fr = addBox(grp, 0.08, 0.012, len, s % 2 ? '#4e6a3c' : '#3e5834', px, py, pz);
      fr.rotation.y = yaw;
      fr.rotation.x = -0.5 - s * 0.15;
    }
  }
  grp.position.set(x, y, z);
  grp.scale.setScalar(scale);
  g.add(grp);
}

function addVine(g, pergola) {
  const wood = '#5e7044';
  const leaves = ['#5f7040', '#6d7c4c', '#4a6238', '#7a8654'];
  const x0 = pergola.x0 + 0.08;
  const z = pergola.z1 - 0.02;
  const y0 = pergola.clearH;
  addCyl(g, 0.015, 0.02, pergola.clearH, '#4a6238', pergola.x0 + 0.02, pergola.clearH / 2, pergola.z1 - 0.02, 5);
  for (let i = 0; i < 7; i++) {
    const x = x0 + i * 0.16;
    const hang = 0.18 + (i % 3) * 0.12;
    leafPaddle(g, leaves[i % leaves.length], x, y0 + 0.06, z, 0.1, 0.03, 0.07, 0.4, i, 0.2);
    leafPaddle(g, leaves[(i + 1) % leaves.length], x + 0.04, y0 - hang, z - 0.02, 0.09, 0.025, 0.06, 1.1, i * 0.4, 0.3);
    if (i % 2 === 0) {
      leafPaddle(g, wood, x - 0.03, y0 - hang * 0.55, z + 0.03, 0.07, 0.02, 0.05, 0.8, -i, 0.5);
    }
  }
}

function addPlanter(g, b, wall, soil) {
  const w = b.x1 - b.x0;
  const d = b.z1 - b.z0;
  const cx = (b.x0 + b.x1) / 2;
  const cz = (b.z0 + b.z1) / 2;
  const h = b.h;
  const t = 0.07;
  addBox(g, w - t * 2, h - 0.07, d - t * 2, soil, cx, (h - 0.07) / 2, cz);
  addBox(g, w, h, t, wall, cx, h / 2, b.z0 + t / 2);
  addBox(g, w, h, t, wall, cx, h / 2, b.z1 - t / 2);
  addBox(g, t, h, d, wall, b.x0 + t / 2, h / 2, cz);
  addBox(g, t, h, d, wall, b.x1 - t / 2, h / 2, cz);
  addBox(g, w + 0.03, 0.045, d + 0.03, wall === '#d7d1c6' ? '#e4dfd4' : '#a45c3c', cx, h - 0.02, cz);
}

function subtractIntervals(x0, x1, holes) {
  let segs = [[x0, x1]];
  for (const [h0, h1] of holes) {
    const next = [];
    for (const [a, b] of segs) {
      if (b <= h0 || a >= h1) next.push([a, b]);
      else {
        if (a < h0 - 0.02) next.push([a, h0 - 0.02]);
        if (b > h1 + 0.02) next.push([h1 + 0.02, b]);
      }
    }
    segs = next;
  }
  return segs;
}

function addDecking(g, site) {
  const deck = site.deck;
  const lounge = site.lounge;
  const landing = site.landing;
  const stair = site.stair;
  const colors = ['#8d7056', '#7a5e48', '#96785c', '#6e5644'];
  addBox(g, deck.x1 - deck.x0, 0.24, deck.z1 - deck.z0, '#c4baae', (deck.x0 + deck.x1) / 2, -0.87, (deck.z0 + deck.z1) / 2);
  const pitch = 0.145;
  const boardT = 0.04;
  const boardW = 0.112;
  let i = 0;
  for (let z = deck.z0 + 0.12; z < deck.z1 - 0.08; z += pitch) {
    const holes = [];
    if (z > landing.z0 && z < landing.z1) holes.push([landing.x0, landing.x1]);
    if (z > stair.z0 && z < stair.z1) holes.push([stair.x0, stair.x1]);
    if (z > lounge.z0 && z < lounge.z1) {
      holes.push([lounge.x0, lounge.x1]);
      const m = addBox(
        g,
        lounge.x1 - lounge.x0 - 0.1,
        boardT,
        boardW,
        colors[(i + 1) % colors.length],
        (lounge.x0 + lounge.x1) / 2,
        lounge.y - boardT / 2,
        z
      );
      m.castShadow = false;
      const pad = addBox(
        g,
        lounge.x1 - lounge.x0 - 0.1,
        0.02,
        boardW + 0.03,
        '#4a3c30',
        (lounge.x0 + lounge.x1) / 2,
        lounge.y - boardT - 0.01,
        z
      );
      pad.castShadow = false;
      pad.userData.noCast = true;
      i++;
    }
    for (const [x0, x1] of subtractIntervals(deck.x0 + 0.12, deck.x1 - 0.12, holes)) {
      if (x1 - x0 < 0.25) continue;
      const m = addBox(g, x1 - x0, boardT, boardW, colors[i % colors.length], (x0 + x1) / 2, -boardT / 2, z);
      m.castShadow = false;
      const pad = addBox(g, x1 - x0, 0.02, boardW + 0.03, '#4a3c30', (x0 + x1) / 2, -boardT - 0.012, z);
      pad.castShadow = false;
      pad.userData.noCast = true;
      i++;
    }
  }
  const tiles = ['#8d9290', '#7a807c', '#9a948c', '#6e7470'];
  const tw = 0.42;
  const td = 0.38;
  let ti = 0;
  for (let x = landing.x0 + tw / 2; x < landing.x1; x += tw + 0.025) {
    for (let z = landing.z0 + td / 2; z < landing.z1; z += td + 0.025) {
      const m = addBox(g, tw - 0.02, 0.035, td - 0.02, tiles[ti % tiles.length], x, 0.018, z);
      m.castShadow = false;
      ti++;
    }
  }
}

function addParapets(g, site) {
  const d = site.deck;
  const p = site.parapet;
  const t = p.t;
  const wall = '#cfc6b6';
  const cope = '#e3dcd0';
  const stair = site.stair;
  addBox(g, t, p.sideH, d.z1 - d.z0, wall, d.x0 + t / 2, p.sideH / 2, (d.z0 + d.z1) / 2);
  addBox(g, t, p.sideH, d.z1 - d.z0, wall, d.x1 - t / 2, p.sideH / 2, (d.z0 + d.z1) / 2);
  addBox(g, t + 0.04, 0.05, d.z1 - d.z0, cope, d.x0 + t / 2, p.sideH, (d.z0 + d.z1) / 2);
  addBox(g, t + 0.04, 0.05, d.z1 - d.z0, cope, d.x1 - t / 2, p.sideH, (d.z0 + d.z1) / 2);

  const entryH = p.entryH;
  addBox(g, stair.x0 - d.x0, entryH, t, wall, (d.x0 + stair.x0) / 2, entryH / 2, d.z1 - t / 2);
  addBox(g, d.x1 - stair.x1, entryH, t, wall, (stair.x1 + d.x1) / 2, entryH / 2, d.z1 - t / 2);
  addBox(g, stair.x0 - d.x0, 0.045, t + 0.03, cope, (d.x0 + stair.x0) / 2, entryH, d.z1 - t / 2);
  addBox(g, d.x1 - stair.x1, 0.045, t + 0.03, cope, (stair.x1 + d.x1) / 2, entryH, d.z1 - t / 2);

  addBox(g, d.x1 - d.x0, p.viewH, t, wall, (d.x0 + d.x1) / 2, p.viewH / 2, d.z0 + t / 2);
  addBox(g, d.x1 - d.x0, 0.05, t + 0.04, cope, (d.x0 + d.x1) / 2, p.viewH, d.z0 + t / 2);

  const rail = '#2c3236';
  for (let x = d.x0 + 0.35; x < d.x1 - 0.2; x += 1.15) {
    addBox(g, 0.025, p.railH - p.viewH, 0.025, rail, x, (p.viewH + p.railH) / 2, d.z0 + t / 2);
  }
  addBox(g, d.x1 - d.x0 - 0.3, 0.03, 0.03, rail, (d.x0 + d.x1) / 2, p.railH, d.z0 + t / 2);
  addBox(g, d.x1 - d.x0 - 0.3, 0.02, 0.02, rail, (d.x0 + d.x1) / 2, p.viewH + 0.28, d.z0 + t / 2);

  const drop = 1.35;
  const fascia = '#b3aa9e';
  addBox(g, t + 0.02, drop, d.z1 - d.z0, fascia, d.x0 - 0.01, -drop / 2 + 0.05, (d.z0 + d.z1) / 2);
  addBox(g, t + 0.02, drop, d.z1 - d.z0, fascia, d.x1 + 0.01, -drop / 2 + 0.05, (d.z0 + d.z1) / 2);
  addBox(g, d.x1 - d.x0, drop, t + 0.02, fascia, 0, -drop / 2 + 0.05, d.z0 - 0.01);
  addBox(g, d.x1 - d.x0, drop, t + 0.02, '#a89f94', 0, -drop / 2 + 0.05, d.z1 + 0.01);
}

function addDrainage(g, site) {
  const d = site.deck;
  const metal = '#3a4044';
  const bar = '#8d9498';
  const x = d.x1 - 0.34;
  for (let z = 0.15; z < 3.25; z += 0.14) {
    addBox(g, 0.09, 0.02, 0.1, '#2a2420', x, -0.01, z).castShadow = false;
    addBox(g, 0.085, 0.012, 0.012, bar, x, 0.012, z);
  }
  addBox(g, 0.1, 0.08, 0.16, metal, d.x1 - 0.02, 0.28, d.z0 + 0.28);
  addBox(g, 0.28, 0.05, 0.1, metal, d.x1 + 0.1, 0.3, d.z0 + 0.28);
  addCyl(g, 0.035, 0.04, 1.15, '#6a7174', d.x1 + 0.22, -0.35, d.z0 + 0.28, 8);
  const z = d.z0 + 0.28;
  for (let gx = 1.4; gx < 5.6; gx += 0.16) {
    addBox(g, 0.12, 0.015, 0.07, '#2a2420', gx, -0.008, z).castShadow = false;
    addBox(g, 0.012, 0.01, 0.065, bar, gx, 0.012, z);
  }
}

function addStair(g, stair) {
  const w = stair.x1 - stair.x0;
  const d = stair.z1 - stair.z0;
  const cx = (stair.x0 + stair.x1) / 2;
  const cz = (stair.z0 + stair.z1) / 2;
  const h = stair.h;
  const wall = '#c8c0b2';
  const t = 0.14;
  addBox(g, w, h, t, wall, cx, h / 2, stair.z1 - t / 2);
  addBox(g, t, h, d, wall, stair.x0 + t / 2, h / 2, cz);
  const doorW = stair.doorX1 - stair.doorX0;
  const leftW = stair.doorX0 - stair.x0;
  const rightW = stair.x1 - stair.doorX1;
  addBox(g, leftW, h, t, wall, stair.x0 + leftW / 2, h / 2, stair.z0 + t / 2);
  addBox(g, rightW, h, t, wall, stair.doorX1 + rightW / 2, h / 2, stair.z0 + t / 2);
  addBox(g, doorW, h - 2.05, t, wall, (stair.doorX0 + stair.doorX1) / 2, 2.05 + (h - 2.05) / 2, stair.z0 + t / 2);
  addBox(g, w + 0.16, 0.08, d + 0.12, '#b7afa2', cx, h, cz + 0.02);
  addBox(g, doorW + 0.2, 0.06, 0.55, '#6a4e38', (stair.doorX0 + stair.doorX1) / 2, 2.18, stair.z0 - 0.18);
  addBox(g, 0.06, 2.05, 0.08, '#6a4e38', stair.doorX0, 1.02, stair.z0 + 0.02);
  addBox(g, 0.06, 2.05, 0.08, '#6a4e38', stair.doorX1, 1.02, stair.z0 + 0.02);
  const hinge = new THREE.Group();
  hinge.position.set(stair.doorX0, 0, stair.z0 + 0.02);
  hinge.rotation.y = 0.85;
  addBox(hinge, doorW * 0.92, 1.96, 0.045, '#7a5a3e', doorW * 0.46, 0.98, -0.04);
  g.add(hinge);
  addBox(g, w - t * 2, h - 0.4, 0.08, '#6a5a4c', cx, (h - 0.4) / 2, stair.z1 - t - 0.06);
  for (let s = 0; s < 4; s++) {
    const sy = -0.02 - s * 0.16;
    const sz = stair.z0 + 0.55 + s * 0.28;
    addBox(g, w - 0.5, 0.08, 0.28, s % 2 ? '#b7aea0' : '#c8bfb2', cx + 0.05, sy, sz);
  }
  addBox(g, 0.03, 0.9, 0.03, '#2c3236', cx - 0.35, 0.55, stair.z0 + 0.85);
  addBox(g, 0.03, 0.03, 0.9, '#2c3236', cx - 0.35, 0.98, stair.z0 + 1.15);
  for (let i = 0; i < 3; i++) {
    addBox(g, 0.34, 0.08, 0.04, '#3a4038', cx, h - 0.35 - i * 0.16, stair.z1 - t - 0.02);
  }
}

function addLoungePit(g, lounge) {
  const w = lounge.x1 - lounge.x0;
  const d = lounge.z1 - lounge.z0;
  addBox(g, 0.08, -lounge.y, d, '#8a7058', lounge.x0, lounge.y / 2, (lounge.z0 + lounge.z1) / 2);
  addBox(g, 0.08, -lounge.y, d, '#8a7058', lounge.x1, lounge.y / 2, (lounge.z0 + lounge.z1) / 2);
  addBox(g, w, -lounge.y, 0.08, '#94785c', (lounge.x0 + lounge.x1) / 2, lounge.y / 2, lounge.z1);
  addBox(g, w, 0.04, 0.1, '#8d7056', (lounge.x0 + lounge.x1) / 2, -0.02, lounge.z1 + 0.02);
}

function addPergola(g, p) {
  const wood = '#7a5436';
  const woodDark = '#65462e';
  const posts = [
    [p.x0, p.z0],
    [p.x1, p.z0],
    [p.x0, p.z1],
    [p.x1, p.z1],
  ];
  for (const [x, z] of posts) {
    addBox(g, p.post, p.clearH, p.post, woodDark, x, p.clearH / 2, z);
  }
  const spanX = p.x1 - p.x0;
  addBox(g, spanX, p.beamH, p.beamW, wood, (p.x0 + p.x1) / 2, p.clearH + p.beamH / 2, p.z0);
  addBox(g, spanX, p.beamH, p.beamW, wood, (p.x0 + p.x1) / 2, p.clearH + p.beamH / 2, p.z1);
  const spanZ = p.z1 - p.z0;
  const y = p.clearH + p.beamH + p.rafterH / 2;
  for (let x = p.x0 + 0.18; x < p.x1 - 0.08; x += p.pitch) {
    addBox(g, p.rafter, p.rafterH, spanZ + 0.18, wood, x, y, (p.z0 + p.z1) / 2);
  }
}

function addCan(g) {
  const body = addCyl(g, 0.11, 0.12, 0.2, '#c5ccd0', 2.12, 0.12, 3.22, 10);
  body.castShadow = true;
  addCyl(g, 0.025, 0.03, 0.22, '#aeb6ba', 2.28, 0.2, 3.22, 6).rotation.z = Math.PI / 2.4;
  const handle = new THREE.Mesh(new THREE.TorusGeometry(0.08, 0.01, 6, 10, Math.PI), mat('#aeb6ba'));
  handle.position.set(2.12, 0.26, 3.22);
  handle.rotation.y = Math.PI / 2;
  handle.castShadow = true;
  g.add(handle);
}

function addSky(g) {
  const geo = new THREE.SphereGeometry(78, 20, 12);
  const colors = [];
  const pos = geo.attributes.position;
  const top = new THREE.Color('#5d94cc');
  const mid = new THREE.Color('#f0c096');
  const low = new THREE.Color('#e39258');
  const c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i) / 78;
    const t = y * 0.5 + 0.5;
    if (t > 0.5) c.copy(mid).lerp(top, Math.min(1, (t - 0.5) / 0.09));
    else c.copy(low).lerp(mid, Math.max(0, (t - 0.42) / 0.08));
    colors.push(c.r, c.g, c.b);
  }
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  const mesh = new THREE.Mesh(
    geo,
    new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, depthWrite: false, fog: false })
  );
  mesh.userData.noShade = true;
  mesh.userData.noCast = true;
  mesh.userData.noReceive = true;
  mesh.frustumCulled = false;
  g.add(mesh);
}

const CITY_BASE = -0.9;

function addCity(g, buildings) {
  const palette = {
    block: { body: '#c6ae92', roof: '#8a624c', win: '#f0d2a4' },
    brick: { body: '#a86448', roof: '#6a4034', win: '#e7c49a' },
    tower: { body: '#8e9aa4', roof: '#5e6a72', win: '#d7e2ea' },
    roof: { body: '#b08968', roof: '#5c4038', win: '#e6c8a4' },
  };
  for (const b of buildings) {
    const pal = palette[b.type] || palette.block;
    addBox(g, b.w, b.h, b.d, pal.body, b.x, CITY_BASE + b.h / 2, b.z);
    addBox(g, b.w + 0.08, 0.12, b.d + 0.08, pal.roof, b.x, CITY_BASE + b.h + 0.04, b.z);
    if (b.type === 'tower') {
      addBox(g, b.w * 0.62, b.h * 0.28, b.d * 0.62, '#7f8b96', b.x, CITY_BASE + b.h + b.h * 0.14, b.z);
      addCyl(g, 0.03, 0.04, 1.4, '#4a545c', b.x, CITY_BASE + b.h + b.h * 0.28 + 0.7, b.z, 5);
    }
    if (b.type === 'brick') {
      addBox(g, b.w * 0.55, 0.7, b.d * 0.55, '#8d5840', b.x, CITY_BASE + b.h + 0.4, b.z);
    }
    if (b.type === 'roof') {
      addCyl(g, 0.28, 0.28, 0.55, '#6a7278', b.x + b.w * 0.22, CITY_BASE + b.h + 0.35, b.z, 8);
    }
    const faceZ = b.z + b.d / 2 + 0.03;
    const cols = Math.max(2, Math.round(b.w / 0.72));
    const rows = Math.max(2, Math.round((b.h - 1.1) / 0.78));
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if ((r + c) % 7 === 0) continue;
        const wx = b.x - b.w / 2 + (c + 0.5) * (b.w / cols);
        const wy = CITY_BASE + 0.7 + r * ((b.h - 1.0) / rows);
        const lit = (r + c * 2) % 5 !== 0;
        const win = addBox(g, Math.min(0.34, b.w / cols * 0.55), 0.42, 0.04, lit ? pal.win : '#3e3834', wx, wy, faceZ);
        win.castShadow = false;
        win.receiveShadow = false;
      }
    }
  }
}

function makeShell(layout) {
  const g = new THREE.Group();
  g.name = 'shell';
  const site = layout.site;
  addSky(g);
  addDecking(g, site);
  addParapets(g, site);
  addLoungePit(g, site.lounge);
  addDrainage(g, site);
  addStair(g, site.stair);
  addPergola(g, site.pergola);
  const ground = addBox(g, 68, 0.2, 34, '#8f7362', 0, -1.02, -22.6);
  ground.userData.noCast = true;
  ground.receiveShadow = true;
  return g;
}

function makeProcedural(layout) {
  const g = new THREE.Group();
  g.name = 'procedural';
  const site = layout.site;
  for (const b of site.planters) addPlanter(g, b, '#d7d1c6', '#4e382c');
  for (const b of site.beds) addPlanter(g, b, '#8d4f34', '#5a3c2a');
  for (const p of site.plants) {
    const seed = hash(p.id);
    const s = p.scale || 1;
    if (p.kind === 'olive') addOlive(g, p.x, p.y, p.z, s, seed);
    else if (p.kind === 'fig') addFig(g, p.x, p.y, p.z, s, seed);
    else if (p.kind === 'grass') addGrass(g, p.x, p.y, p.z, s, seed, false);
    else if (p.kind === 'plume') addGrass(g, p.x, p.y, p.z, s, seed, true);
    else if (p.kind === 'shrub') addShrub(g, p.x, p.y, p.z, s, seed);
    else if (p.kind === 'rosemary') addRosemary(g, p.x, p.y, p.z, s, seed);
    else if (p.kind === 'basil') addBasil(g, p.x, p.y, p.z, s, seed);
    else if (p.kind === 'thyme') addThyme(g, p.x, p.y, p.z, s, seed);
    else if (p.kind === 'salvia') addSalvia(g, p.x, p.y, p.z, s, seed);
    else if (p.kind === 'fern') addFern(g, p.x, p.y, p.z, s, seed);
    else if (p.kind === 'vine') addVine(g, site.pergola);
  }
  const city = new THREE.Group();
  city.name = 'city';
  addCity(city, site.city);
  city.traverse((obj) => {
    if (!obj.isMesh) return;
    obj.userData.noCast = true;
    obj.userData.noReceive = true;
  });
  g.add(city);
  addCan(g);
  return g;
}

boot({
  makeShell,
  makeProcedural,
  readyText: 'ready — rooftop garden · drag orbit · U unlit · T toon',
});
