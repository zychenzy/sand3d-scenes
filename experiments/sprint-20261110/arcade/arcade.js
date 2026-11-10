import * as THREE from 'three';
import { boot, toon, addBox, addCyl, canvasTex } from './scene_lib.js';

const FONT = {
  A: ['01110', '10001', '10001', '11111', '10001', '10001', '10001'],
  C: ['01111', '10000', '10000', '10000', '10000', '10000', '01111'],
  D: ['11110', '10001', '10001', '10001', '10001', '10001', '11110'],
  E: ['11111', '10000', '10000', '11110', '10000', '10000', '11111'],
  K: ['10001', '10010', '10100', '11000', '10100', '10010', '10001'],
  N: ['10001', '11001', '10101', '10011', '10001', '10001', '10001'],
  O: ['01110', '10001', '10001', '10001', '10001', '10001', '01110'],
  R: ['11110', '10001', '10001', '11110', '10100', '10010', '10001'],
  S: ['01111', '10000', '10000', '01110', '00001', '00001', '11110'],
  T: ['11111', '00100', '00100', '00100', '00100', '00100', '00100'],
};

function lit(map, intensity) {
  return toon('#6a6a6a', {
    map,
    emissive: '#ffffff',
    emissiveMap: map,
    emissiveIntensity: intensity,
  });
}

function paint(title, bg, fg) {
  return canvasTex(256, 72, (g, w, h) => {
    g.fillStyle = bg;
    g.fillRect(0, 0, w, h);
    g.fillStyle = fg;
    g.fillRect(0, 0, w, 7);
    g.fillRect(0, h - 7, w, 7);
    g.font = 'bold 36px sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(title, w / 2, h / 2 + 1);
  }, false);
}

function poster(title, bg, accent, motif) {
  return canvasTex(320, 440, (g, w, h) => {
    g.fillStyle = bg;
    g.fillRect(0, 0, w, h);
    g.strokeStyle = accent;
    g.lineWidth = 12;
    g.strokeRect(16, 16, w - 32, h - 32);
    if (motif === 'stripes') {
      g.strokeStyle = accent;
      g.lineWidth = 14;
      for (let i = 0; i < 7; i++) {
        g.beginPath();
        g.moveTo(-20 + i * 56, h - 90);
        g.lineTo(90 + i * 56, 70);
        g.stroke();
      }
    } else if (motif === 'sun') {
      g.fillStyle = accent;
      g.beginPath();
      g.arc(w / 2, h * 0.4, 72, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = bg;
      g.beginPath();
      g.arc(w / 2 + 28, h * 0.4, 56, 0, Math.PI * 2);
      g.fill();
    } else if (motif === 'bars') {
      const cols = ['#ff4f8a', '#ffd24a', '#3ee0c0', '#7aa2ff'];
      for (let i = 0; i < 8; i++) {
        g.fillStyle = cols[i % cols.length];
        const bh = 50 + ((i * 53) % 150);
        g.fillRect(40 + i * 32, h * 0.58 - bh, 20, bh);
      }
    } else if (motif === 'maze') {
      g.strokeStyle = accent;
      g.lineWidth = 8;
      for (let i = 0; i < 5; i++) {
        g.strokeRect(48 + i * 16, 90 + i * 18, w - 96 - i * 32, 170 - i * 16);
      }
    } else if (motif === 'cross') {
      g.lineWidth = 8;
      g.beginPath();
      g.arc(w / 2, h * 0.4, 78, 0, Math.PI * 2);
      g.stroke();
      g.beginPath();
      g.arc(w / 2, h * 0.4, 28, 0, Math.PI * 2);
      g.stroke();
      g.beginPath();
      g.moveTo(w / 2 - 110, h * 0.4);
      g.lineTo(w / 2 - 40, h * 0.4);
      g.moveTo(w / 2 + 40, h * 0.4);
      g.lineTo(w / 2 + 110, h * 0.4);
      g.stroke();
    }
    g.fillStyle = accent;
    g.font = 'bold 52px sans-serif';
    g.textAlign = 'center';
    g.fillText(title, w / 2, h - 62);
  }, false);
}

function buildMaps() {
  const drift = canvasTex(128, 96, (g, w, h) => {
    g.fillStyle = '#1a2744';
    g.fillRect(0, 0, w, h);
    g.fillStyle = '#f0c36a';
    g.fillRect(92, 12, 16, 16);
    g.fillStyle = '#6d3d68';
    g.fillRect(0, 40, w, 12);
    g.fillStyle = '#3c4a60';
    g.beginPath();
    g.moveTo(18, h);
    g.lineTo(52, 52);
    g.lineTo(76, 52);
    g.lineTo(w - 16, h);
    g.fill();
    g.fillStyle = '#ead48a';
    for (let i = 0; i < 5; i++) g.fillRect(60, 60 + i * 7, 8, 3);
    g.fillStyle = '#e23b4a';
    g.fillRect(46, 72, 18, 12);
    g.fillStyle = '#3aa0ff';
    g.fillRect(74, 66, 16, 12);
  });
  const night = canvasTex(128, 96, (g, w, h) => {
    g.fillStyle = '#0e1024';
    g.fillRect(0, 0, w, h);
    g.fillStyle = '#ff4f9a';
    g.fillRect(0, 34, w, 4);
    g.fillStyle = '#2a3358';
    g.beginPath();
    g.moveTo(28, h);
    g.lineTo(56, 40);
    g.lineTo(72, 40);
    g.lineTo(w - 24, h);
    g.fill();
    g.fillStyle = '#3ee0ff';
    for (let i = 0; i < 4; i++) g.fillRect(58, 52 + i * 9, 10, 3);
    g.fillStyle = '#ffd24a';
    g.fillRect(40, 70, 20, 14);
    g.fillStyle = '#c8d4ff';
    g.fillRect(78, 62, 18, 12);
  });
  const voidScr = canvasTex(128, 96, (g, w, h) => {
    g.fillStyle = '#070814';
    g.fillRect(0, 0, w, h);
    g.fillStyle = '#d8e2ff';
    for (let i = 0; i < 30; i++) g.fillRect((i * 47) % w, (i * 29) % h, 2, 2);
    g.fillStyle = '#7d5cff';
    g.beginPath();
    g.arc(78, 40, 18, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#3ee08a';
    g.fillRect(24, 58, 22, 8);
    g.fillRect(42, 54, 6, 6);
    g.fillStyle = '#ff5a6a';
    g.fillRect(96, 62, 12, 12);
  });
  const pulse = canvasTex(128, 96, (g, w, h) => {
    g.fillStyle = '#1a1030';
    g.fillRect(0, 0, w, h);
    const cols = ['#ff4f8a', '#ffd24a', '#3ee0c0', '#7aa2ff', '#ffffff'];
    for (let i = 0; i < 10; i++) {
      g.fillStyle = cols[i % cols.length];
      const bh = 16 + ((i * 17) % 48);
      g.fillRect(10 + i * 11, 70 - bh, 8, bh);
    }
    g.fillStyle = '#ffd24a';
    g.fillRect(8, 78, w - 16, 4);
  });
  const maze = canvasTex(128, 96, (g, w, h) => {
    g.fillStyle = '#0c1a18';
    g.fillRect(0, 0, w, h);
    g.fillStyle = '#14302c';
    g.fillRect(8, 8, w - 16, h - 16);
    g.fillStyle = '#3ee0c0';
    const walls = [[8, 8, 112, 6], [8, 8, 6, 80], [8, 82, 112, 6], [114, 8, 6, 80], [28, 24, 6, 40], [48, 40, 40, 6], [70, 24, 6, 36], [28, 64, 50, 6]];
    for (const r of walls) g.fillRect(r[0], r[1], r[2], r[3]);
    g.fillStyle = '#ffd24a';
    g.fillRect(18, 18, 5, 5);
    g.fillRect(90, 28, 5, 5);
    g.fillRect(40, 70, 5, 5);
    g.fillStyle = '#ff4f8a';
    g.fillRect(56, 28, 8, 8);
  });
  const dusk = canvasTex(128, 96, (g, w, h) => {
    g.fillStyle = '#2a2048';
    g.fillRect(0, 0, w, h);
    g.fillStyle = '#ffb45a';
    g.fillRect(0, 58, w, 38);
    g.fillStyle = '#1a1430';
    g.fillRect(18, 28, 16, 40);
    g.fillRect(40, 40, 12, 28);
    g.fillRect(70, 22, 22, 46);
    g.fillRect(98, 36, 14, 32);
    g.fillStyle = '#fff2c4';
    g.fillRect(24, 36, 4, 6);
    g.fillRect(76, 32, 5, 7);
    g.fillRect(84, 44, 4, 5);
  });
  const raid = canvasTex(128, 96, (g, w, h) => {
    g.fillStyle = '#241018';
    g.fillRect(0, 0, w, h);
    g.strokeStyle = '#ff5a4a';
    g.lineWidth = 3;
    g.strokeRect(16, 14, 96, 68);
    g.beginPath();
    g.arc(64, 48, 16, 0, Math.PI * 2);
    g.stroke();
    g.beginPath();
    g.moveTo(64, 18);
    g.lineTo(64, 34);
    g.moveTo(64, 62);
    g.lineTo(64, 78);
    g.moveTo(24, 48);
    g.lineTo(44, 48);
    g.moveTo(84, 48);
    g.lineTo(104, 48);
    g.stroke();
    g.fillStyle = '#ffd24a';
    g.fillRect(60, 44, 8, 8);
  });
  const playfield = canvasTex(256, 140, (g, w, h) => {
    g.fillStyle = '#1a6a3a';
    g.fillRect(0, 0, w, h);
    g.strokeStyle = '#f3e6a8';
    g.lineWidth = 5;
    g.strokeRect(8, 8, w - 16, h - 16);
    g.beginPath();
    g.moveTo(28, h - 12);
    g.lineTo(70, 28);
    g.lineTo(w - 70, 28);
    g.lineTo(w - 28, h - 12);
    g.stroke();
    const bumps = [[90, 48, '#e23b4a'], [128, 36, '#f0c040'], [166, 52, '#3aa0ff']];
    for (const [x, y, c] of bumps) {
      g.fillStyle = c;
      g.beginPath();
      g.arc(x, y, 11, 0, Math.PI * 2);
      g.fill();
    }
    g.fillStyle = '#f4f1ea';
    g.fillRect(34, h - 30, 46, 8);
    g.fillRect(w - 80, h - 30, 46, 8);
  }, false);
  const score = canvasTex(128, 64, (g, w, h) => {
    g.fillStyle = '#14080e';
    g.fillRect(0, 0, w, h);
    g.fillStyle = '#ff4f6a';
    g.font = 'bold 28px sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText('1250', w / 2, h / 2);
  }, false);
  const cocktail = canvasTex(128, 128, (g, w, h) => {
    g.fillStyle = '#101820';
    g.fillRect(0, 0, w, h);
    g.strokeStyle = '#3ee0ff';
    g.lineWidth = 4;
    g.strokeRect(10, 10, w - 20, h - 20);
    g.fillStyle = '#ffd24a';
    for (let i = 0; i < 8; i++) g.fillRect(24 + (i % 4) * 24, 28 + Math.floor(i / 4) * 36, 8, 8);
    g.fillStyle = '#ff4f8a';
    g.beginPath();
    g.arc(64, 64, 10, 0, Math.PI * 2);
    g.fill();
  });
  const mural = canvasTex(768, 320, (g, w, h) => {
    g.fillStyle = '#120c22';
    g.fillRect(0, 0, w, h);
    g.fillStyle = '#ff4f9a';
    g.beginPath();
    g.arc(w * 0.72, h * 0.42, 70, 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = '#3ee0ff';
    g.lineWidth = 3;
    for (let i = 0; i < 8; i++) {
      g.beginPath();
      g.moveTo(40, h - 30 - i * 18);
      g.lineTo(w - 40, h - 80 - i * 10);
      g.stroke();
    }
    for (let i = 1; i < 8; i++) {
      g.beginPath();
      g.moveTo(80 + i * 80, 40);
      g.lineTo(40 + i * 70, h - 20);
      g.stroke();
    }
    g.fillStyle = '#ffd24a';
    g.font = 'bold 64px sans-serif';
    g.textAlign = 'left';
    g.fillText('NIGHT GRID', 48, 86);
  }, false);
  const price = canvasTex(320, 200, (g, w, h) => {
    g.fillStyle = '#1a1020';
    g.fillRect(0, 0, w, h);
    g.fillStyle = '#ff4f9a';
    g.fillRect(0, 0, w, 8);
    g.font = 'bold 28px sans-serif';
    g.fillStyle = '#f4efe6';
    g.textAlign = 'left';
    g.fillText('TOKENS', 18, 42);
    g.font = '22px sans-serif';
    g.fillStyle = '#ffd24a';
    const lines = ['PLAY ........ 2', 'RACE ........ 4', 'PIN ......... 3'];
    lines.forEach((line, i) => g.fillText(line, 18, 84 + i * 32));
  }, false);
  const aframe = canvasTex(256, 160, (g, w, h) => {
    g.fillStyle = '#201428';
    g.fillRect(0, 0, w, h);
    g.fillStyle = '#3ee0ff';
    g.font = 'bold 28px sans-serif';
    g.textAlign = 'center';
    g.fillText('2 TOKENS', w / 2, 58);
    g.fillStyle = '#f4efe6';
    g.font = '20px sans-serif';
    g.fillText('PER PLAY', w / 2, 96);
  }, false);
  return {
    drift, night, void: voidScr, pulse, maze, dusk, raid, playfield, score, cocktail, mural, price, aframe,
    mqDrift: paint('DRIFT', '#8a1e32', '#ffd9a8'),
    mqVoid: paint('VOID', '#0e3a38', '#d8fff4'),
    mqPulse: paint('PULSE', '#3a2a08', '#ffe08a'),
    mqMaze: paint('MAZE', '#2a1848', '#f0c040'),
    mqDusk: paint('DUSK', '#1a1830', '#f4efe6'),
    mqLock: paint('LOCK', '#3a140c', '#ffb090'),
    mqGrid: paint('GRID DUEL', '#140810', '#ff4f9a'),
    postDrift: poster('DRIFT', '#1a0e18', '#ff4f8a', 'stripes'),
    postPulse: poster('PULSE', '#101820', '#3ee0c0', 'bars'),
    postVoid: poster('VOID', '#12101c', '#c7b6ff', 'sun'),
    postMaze: poster('MAZE', '#101816', '#f0c040', 'maze'),
  };
}

function place(node, spec) {
  node.position.set(spec.x, spec.y || 0, spec.z);
  node.rotation.y = spec.yaw || 0;
  node.name = spec.id;
  return node;
}

function contact(spec) {
  const m = new THREE.Mesh(
    new THREE.BoxGeometry(spec.w * 0.9, 0.012, spec.d * 0.9),
    toon('#07060c')
  );
  m.position.set(spec.x, 0.008, spec.z);
  m.rotation.y = spec.yaw || 0;
  m.userData.noShadow = true;
  m.name = `${spec.id}_contact`;
  return m;
}

function neonWord(text, color, scale) {
  const g = new THREE.Group();
  const mat = toon('#180810', { emissive: color, emissiveIntensity: 0.72 });
  let x = 0;
  const rowsH = 7;
  for (const ch of text) {
    const rows = FONT[ch];
    if (!rows) {
      x += 4 * scale;
      continue;
    }
    for (let r = 0; r < rows.length; r++) {
      for (let c = 0; c < rows[r].length; c++) {
        if (rows[r][c] !== '1') continue;
        addBox(
          g, scale * 0.82, scale * 0.82, scale * 0.55, mat,
          x + c * scale,
          (rowsH - 1 - r) * scale - ((rowsH - 1) * scale) / 2,
          0
        );
      }
    }
    x += (rows[0].length + 1) * scale;
  }
  g.children.forEach((child) => { child.position.x -= x / 2; });
  return g;
}

function panelCluster(g, spec, y, z) {
  const deck = new THREE.Group();
  const w = spec.variant === 'deluxe' ? spec.w - 0.16 : spec.w * 0.92;
  const deckD = spec.variant === 'candy' ? spec.d * 0.5 : spec.d * 0.38;
  const panel = new THREE.Mesh(new THREE.BoxGeometry(w, 0.07, deckD), toon('#4a3828'));
  panel.castShadow = true;
  panel.receiveShadow = true;
  deck.add(panel);
  const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.022, 0.12, 8), toon('#111'));
  stick.position.set(-w * 0.18, 0.08, deckD * 0.08);
  stick.castShadow = true;
  deck.add(stick);
  const ball = new THREE.Mesh(new THREE.SphereGeometry(0.042, 10, 8), toon(spec.trim));
  ball.position.set(-w * 0.18, 0.15, deckD * 0.12);
  ball.castShadow = true;
  deck.add(ball);
  const cols = ['#e23b4a', '#f0c040', '#3ecf8e', '#3aa0ff', '#ffffff'];
  const n = spec.variant === 'candy' ? 5 : 4;
  for (let i = 0; i < n; i++) {
    const b = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.03, 0.028, 8), toon(cols[i]));
    b.position.set(w * 0.0 + i * 0.07, 0.045, deckD * 0.18);
    b.castShadow = true;
    deck.add(b);
  }
  deck.position.set(0, y, z);
  deck.rotation.x = 0.48;
  g.add(deck);
  if (spec.variant === 'blaster' || spec.kind === 'blaster') {
    const gun = new THREE.Group();
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.026, 0.32, 8), toon('#1a1a1a'));
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0.05, 0.06, 0.16);
    barrel.castShadow = true;
    gun.add(barrel);
    const grip = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.1, 0.04), toon('#2a2a2a'));
    grip.position.set(0.05, 0.02, 0.02);
    grip.castShadow = true;
    gun.add(grip);
    gun.position.set(w * 0.22, y + 0.02, z);
    g.add(gun);
  }
}

function upright(spec, maps) {
  const g = new THREE.Group();
  const { w, d, h } = spec;
  const variant = spec.variant || 'classic';
  const marqueeH = variant === 'tall' ? 0.46 : variant === 'candy' ? 0.2 : 0.28;
  const bodyH = h - marqueeH;
  const bodyW = variant === 'deluxe' ? w - 0.14 : w * 0.96;
  const bodyD = d * 0.78;
  const bodyMat = toon(spec.body);
  const trimMat = toon(spec.trim);
  const dark = toon('#141018');
  addBox(g, bodyW * 0.92, 0.08, bodyD * 0.92, dark, 0, 0.04, -d * 0.04);
  addBox(g, bodyW, bodyH - 0.08, bodyD, bodyMat, 0, 0.08 + (bodyH - 0.08) / 2, -d * 0.06);
  addBox(g, 0.025, bodyH * 0.55, bodyD * 0.72, trimMat, -bodyW / 2 - 0.005, bodyH * 0.48, -d * 0.02);
  addBox(g, 0.025, bodyH * 0.55, bodyD * 0.72, trimMat, bodyW / 2 + 0.005, bodyH * 0.48, -d * 0.02);
  if (variant === 'deluxe') {
    addBox(g, 0.06, bodyH * 0.62, d * 0.42, trimMat, -w / 2 + 0.04, bodyH * 0.46, d * 0.12);
    addBox(g, 0.06, bodyH * 0.62, d * 0.42, trimMat, w / 2 - 0.04, bodyH * 0.46, d * 0.12);
  }
  if (variant === 'tall') {
    addBox(g, bodyW * 0.72, 0.08, d * 0.36, trimMat, 0, h - 0.05, d * 0.02);
  }
  const bezel = addBox(g, bodyW * 0.78, bodyH * 0.42, 0.05, dark, 0, bodyH * 0.62, d * 0.34);
  bezel.position.z = bodyD * 0.5 - d * 0.06;
  const screenMap = maps[spec.screen];
  const screen = new THREE.Mesh(
    new THREE.PlaneGeometry(bodyW * 0.66, bodyH * 0.32),
    lit( screenMap, 0.38)
  );
  screen.position.set(0, bodyH * 0.62, bodyD * 0.5 - d * 0.06 + 0.03);
  screen.rotation.x = 0.12;
  g.add(screen);
  const mq = new THREE.Mesh(
    new THREE.BoxGeometry(w * 0.98, marqueeH * 0.78, d * 0.28),
    trimMat
  );
  mq.position.set(0, bodyH + marqueeH * 0.42, d * 0.02);
  mq.castShadow = true;
  mq.receiveShadow = true;
  g.add(mq);
  const faceMap = {
    drift: maps.mqDrift,
    void: maps.mqVoid,
    pulse: maps.mqPulse,
    maze: maps.mqMaze,
    dusk: maps.mqDusk,
    raid: maps.mqLock,
  }[spec.screen];
  const face = new THREE.Mesh(
    new THREE.PlaneGeometry(w * 0.82, marqueeH * 0.5),
    lit( faceMap, 0.48)
  );
  face.position.set(0, bodyH + marqueeH * 0.42, d * 0.02 + d * 0.14 + 0.01);
  g.add(face);
  addBox(g, bodyW * 0.32, 0.22, 0.02, toon('#c5c8d0'), 0, 0.2, bodyD * 0.5 - d * 0.05);
  addCyl(g, 0.018, 0.018, 0.016, toon('#e7c56a', { emissive: '#a07828', emissiveIntensity: 0.35 }), 0, 0.14, bodyD * 0.5 - d * 0.04, 8);
  panelCluster(g, spec, bodyH * 0.34, d * 0.22);
  const mat = new THREE.Mesh(
    new THREE.BoxGeometry(w * 0.72, 0.012, 0.55),
    toon(spec.body)
  );
  mat.position.set(0, 0.012, d * 0.5 + 0.12);
  mat.userData.noShadow = true;
  g.add(mat);
  return g;
}

function pinball(spec, maps) {
  const g = new THREE.Group();
  const { w, d } = spec;
  const metal = toon('#c8ccd4');
  const body = toon(spec.body || '#1d4e86');
  const dark = toon('#141018');
  const legZ = d * 0.32;
  for (const x of [-w * 0.32, w * 0.32]) {
    for (const z of [-legZ, legZ * 0.6]) addCyl(g, 0.028, 0.028, 0.72, metal, x, 0.36, z, 8);
  }
  addBox(g, w * 0.92, 0.18, d * 0.78, body, 0, 0.78, -d * 0.04);
  const field = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.72, d * 0.62), lit( maps.playfield, 0.22));
  field.rotation.x = -Math.PI / 2;
  field.position.set(0, 0.88, -d * 0.02);
  g.add(field);
  const glass = addBox(
    g, w * 0.8, 0.015, d * 0.66,
    toon('#9fd0ea', { transparent: true, opacity: 0.22, side: THREE.DoubleSide, depthWrite: false }),
    0, 0.91, -d * 0.02
  );
  glass.userData.noShadow = true;
  addBox(g, w * 0.96, 0.06, 0.04, dark, 0, 0.9, d * 0.36);
  addBox(g, w * 0.96, 0.06, 0.04, dark, 0, 0.9, -d * 0.4);
  addBox(g, w * 0.7, 0.62, 0.28, toon('#c4313e'), 0, 1.18, -d * 0.42);
  const score = new THREE.Mesh(new THREE.PlaneGeometry(0.36, 0.16), lit( maps.score, 0.55));
  score.position.set(0, 1.28, -d * 0.42 + 0.15);
  g.add(score);
  const plunger = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.26, 8), metal);
  plunger.rotation.x = Math.PI / 2;
  plunger.position.set(w * 0.28, 0.84, d * 0.22);
  plunger.castShadow = true;
  g.add(plunger);
  return g;
}

function cocktail(spec, maps) {
  const g = new THREE.Group();
  const { w, d, h } = spec;
  const body = toon(spec.body || '#243044');
  const trim = toon('#d7b56a');
  for (const x of [-w * 0.36, w * 0.36]) {
    for (const z of [-d * 0.36, d * 0.36]) addCyl(g, 0.03, 0.034, h * 0.72, toon('#1a1c22'), x, h * 0.36, z, 8);
  }
  addBox(g, w, h * 0.28, d, body, 0, h * 0.78, 0);
  addBox(g, w + 0.04, 0.035, d + 0.04, trim, 0, h * 0.64, 0);
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.62, d * 0.62), lit( maps.cocktail, 0.4));
  screen.rotation.x = -Math.PI / 2;
  screen.position.set(0, h * 0.93, 0);
  g.add(screen);
  const cols = ['#e23b4a', '#3aa0ff'];
  [[-w * 0.28, d * 0.42], [w * 0.28, -d * 0.42]].forEach(([x, z], i) => {
    addCyl(g, 0.018, 0.02, 0.016, toon(cols[i]), x, h * 0.94, z, 8);
  });
  return g;
}

function oneRacer(side, maps) {
  const g = new THREE.Group();
  const body = toon(side.body);
  const accent = toon(side.accent);
  const dark = toon('#121016');
  const seat = toon('#241820');
  addBox(g, 0.84, 0.1, 1.36, dark, 0, 0.05, 0);
  addBox(g, 0.08, 0.26, 1.12, body, -0.4, 0.24, 0.02);
  addBox(g, 0.08, 0.26, 1.12, body, 0.4, 0.24, 0.02);
  addBox(g, 0.02, 0.045, 0.9, accent, -0.45, 0.32, 0.04);
  addBox(g, 0.02, 0.045, 0.9, accent, 0.45, 0.32, 0.04);
  addBox(g, 0.46, 0.08, 0.42, seat, 0, 0.28, -0.28);
  const back = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.48, 0.08), seat);
  back.position.set(0, 0.52, -0.48);
  back.rotation.x = -0.22;
  back.castShadow = true;
  back.receiveShadow = true;
  g.add(back);
  addBox(g, 0.26, 0.1, 0.07, accent, 0, 0.78, -0.5);
  const dash = new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.12, 0.36), body);
  dash.position.set(0, 0.42, 0.28);
  dash.rotation.x = 0.42;
  dash.castShadow = true;
  g.add(dash);
  addBox(g, 0.56, 0.34, 0.04, dark, 0, 0.74, 0.4);
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.48, 0.28), lit( side.screen, 0.4));
  screen.position.set(0, 0.74, 0.43);
  screen.rotation.x = -0.22;
  g.add(screen);
  const wheel = new THREE.Group();
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.016, 8, 18), toon('#2a2a2a'));
  ring.castShadow = true;
  wheel.add(ring);
  for (let i = 0; i < 3; i++) {
    const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.018, 0.016), toon('#3a3a3a'));
    spoke.rotation.z = (i * Math.PI) / 3;
    wheel.add(spoke);
  }
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, 0.04, 10), accent);
  hub.rotation.x = Math.PI / 2;
  wheel.add(hub);
  wheel.position.set(0, 0.52, 0.18);
  wheel.rotation.x = -0.65;
  g.add(wheel);
  addBox(g, 0.07, 0.02, 0.1, toon('#333'), -0.08, 0.12, 0.48);
  addBox(g, 0.07, 0.02, 0.1, toon('#555'), 0.06, 0.12, 0.5);
  const tag = new THREE.Mesh(new THREE.PlaneGeometry(0.12, 0.1), lit(side.tag, 0.35));
  tag.position.set(side.tagX, 0.3, 0.64);
  g.add(tag);
  return g;
}

function tagTex(n, color) {
  return canvasTex(64, 64, (g, w, h) => {
    g.fillStyle = '#120810';
    g.fillRect(0, 0, w, h);
    g.fillStyle = color;
    g.font = 'bold 42px sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(String(n), w / 2, h / 2 + 2);
  }, false);
}

function racingPair(spec, maps) {
  const g = new THREE.Group();
  const p1 = oneRacer({
    body: '#c4313e',
    accent: '#ffd24a',
    screen: maps.drift,
    tag: tagTex(1, '#ffd24a'),
    tagX: -0.34,
  }, maps);
  p1.position.x = -0.48;
  const p2 = oneRacer({
    body: '#1d4f9e',
    accent: '#7af0ff',
    screen: maps.night,
    tag: tagTex(2, '#7af0ff'),
    tagX: 0.34,
  }, maps);
  p2.position.x = 0.48;
  g.add(p1, p2);
  addBox(g, 1.9, 0.1, 0.28, toon('#161018'), 0, 1.12, 0.22);
  const header = new THREE.Mesh(new THREE.PlaneGeometry(1.35, 0.22), lit( maps.mqGrid, 0.5));
  header.position.set(0, 1.12, 0.37);
  g.add(header);
  const tube = addBox(g, 1.55, 0.035, 0.035, toon('#200010', { emissive: '#ff4f9a', emissiveIntensity: 0.7 }), 0, 1.02, 0.36);
  tube.userData.noShadow = true;
  return g;
}

function tokenCounter(spec, maps) {
  const g = new THREE.Group();
  const { w, d } = spec;
  const h = spec.h || 1.08;
  const body = toon('#5c1d3c');
  const inset = toon('#3a1228');
  const top = toon('#2a241c');
  const brass = toon('#d7b56a');
  addBox(g, w, 0.1, d, toon('#120c10'), 0, 0.05, 0);
  addBox(g, w * 0.98, h - 0.18, d * 0.94, body, 0, 0.1 + (h - 0.18) / 2, 0);
  addBox(g, w * 0.62, 0.46, 0.03, inset, -0.2, 0.5, d / 2);
  addBox(g, 0.5, 0.28, 0.035, brass, -0.55, 0.52, d / 2 + 0.01);
  addBox(g, 0.38, 0.16, 0.02, toon('#1a120c'), -0.55, 0.54, d / 2 + 0.03);
  for (let i = 0; i < 5; i++) {
    addCyl(
      g, 0.022, 0.022, 0.012,
      toon('#e6c15a', { emissive: '#8a6420', emissiveIntensity: 0.3 }),
      -0.66 + i * 0.055, 0.52, d / 2 + 0.045, 8
    );
  }
  addBox(g, w + 0.04, 0.055, d + 0.05, top, 0, h - 0.03, 0);
  addBox(g, w + 0.02, 0.02, 0.025, brass, 0, h - 0.065, d / 2 + 0.02);
  const glow = addBox(
    g, 0.86, 0.045, 0.02,
    toon('#041820', { emissive: '#3ee0ff', emissiveIntensity: 0.75 }),
    -0.35, 0.82, d / 2 + 0.03
  );
  glow.userData.noShadow = true;
  const cx = w / 2 - 0.34;
  addBox(g, 0.62, 0.62, 0.04, toon('#140c14'), cx, 0.52, d / 2 - 0.02);
  const prize = ['#e23b4a', '#f0c040', '#3ecf8e', '#3aa0ff', '#c86bff', '#ff8a3a'];
  for (let r = 0; r < 2; r++) {
    for (let c = 0; c < 3; c++) {
      addBox(g, 0.14, 0.14, 0.08, toon(prize[r * 3 + c]), cx - 0.18 + c * 0.18, 0.32 + r * 0.28, d / 2 - 0.04);
    }
  }
  for (let i = 0; i < 3; i++) {
    addCyl(g, 0.045, 0.038, 0.07, toon('#222'), 0.35 + i * 0.14, h + 0.03, 0.02, 10);
    addCyl(
      g, 0.03, 0.03, 0.016,
      toon('#e6c15a', { emissive: '#8a6420', emissiveIntensity: 0.25 }),
      0.35 + i * 0.14, h + 0.07, 0.02, 8
    );
  }
  const board = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.38), lit( maps.price, 0.32));
  board.position.set(-1.0, h + 0.24, 0.12);
  g.add(board);
  return g;
}

function halfWall(spec) {
  const g = new THREE.Group();
  addBox(g, spec.w, spec.h, spec.d, toon('#241833'), 0, spec.h / 2, 0);
  addBox(g, spec.w, 0.04, spec.d + 0.02, toon('#d7b56a'), 0, spec.h - 0.02, 0);
  return g;
}

function priceSign(spec, maps) {
  const g = new THREE.Group();
  addBox(g, spec.w, 0.04, spec.d, toon('#1a1020'), 0, 0.02, 0);
  const panel = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.28), lit( maps.aframe, 0.3));
  panel.position.set(0, 0.42, 0);
  panel.rotation.x = -0.35;
  g.add(panel);
  addBox(g, 0.04, 0.4, 0.04, toon('#d7b56a'), -0.16, 0.24, 0);
  addBox(g, 0.04, 0.4, 0.04, toon('#d7b56a'), 0.16, 0.24, 0);
  return g;
}

function trashCan() {
  const g = new THREE.Group();
  addCyl(g, 0.16, 0.14, 0.42, toon('#1c1a22'), 0, 0.24, 0, 12);
  addCyl(g, 0.175, 0.175, 0.04, toon('#d7b56a'), 0, 0.46, 0, 12);
  return g;
}

function mural(spec, maps) {
  const art = spec.art === 'mural' ? maps.mural
    : spec.art === 'drift' ? maps.postDrift
      : spec.art === 'pulse' ? maps.postPulse
        : maps.postMaze;
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(spec.w, spec.h), lit( art, spec.art === 'mural' ? 0.22 : 0.3));
  mesh.userData.noShadow = true;
  return mesh;
}

function floorTexture(W, D) {
  const cw = 1024;
  const ch = 800;
  return canvasTex(cw, ch, (g) => {
    const tw = 64;
    const th = 64;
    for (let y = 0; y < ch; y += th) {
      for (let x = 0; x < cw; x += tw) {
        const alt = ((x / tw) + (y / th)) % 2;
        g.fillStyle = alt ? '#16111f' : '#1e1730';
        g.fillRect(x + 1, y + 1, tw - 2, th - 2);
      }
    }
    const px = (x) => ((x + W / 2) / W) * cw;
    const py = (z) => ((z + D / 2) / D) * ch;
    const rect = (x0, z0, x1, z1, color) => {
      const a = px(x0);
      const b = py(z0);
      const c = px(x1);
      const d = py(z1);
      g.fillStyle = color;
      g.fillRect(Math.min(a, c), Math.min(b, d), Math.abs(c - a), Math.abs(d - b));
    };
    rect(-5.1, -3.62, 0.35, -2.95, '#2a2038');
    rect(1.15, -1.75, 3.75, 0.5, '#241428');
    rect(-1.05, -2.6, 0.6, 3.9, '#3a2244');
    rect(-4.6, -2.35, -1.05, -1.7, '#3a2244');
    rect(0.55, 1.15, 1.7, 2.05, '#3a2244');
    g.strokeStyle = '#2ee0d0';
    g.lineWidth = 4;
    g.strokeRect(px(-1.05), py(-2.6), px(0.6) - px(-1.05), py(3.9) - py(-2.6));
  }, false);
}

function makeShell(layout) {
  const g = new THREE.Group();
  g.name = 'shell';
  const { width: W, depth: D, height: H } = layout.meta.room;
  const s = layout.shell;
  const floor = new THREE.Mesh(new THREE.BoxGeometry(W, 0.08, D), toon(s.floorColor));
  floor.position.y = -0.04;
  floor.receiveShadow = true;
  g.add(floor);
  const rug = new THREE.Mesh(new THREE.PlaneGeometry(W, D), toon('#ffffff', { map: floorTexture(W, D) }));
  rug.rotation.x = -Math.PI / 2;
  rug.position.y = 0.004;
  rug.receiveShadow = true;
  rug.userData.noShadow = true;
  g.add(rug);

  const wall = toon(s.wallColor);
  const lower = toon(s.wallLower);
  const back = new THREE.Mesh(new THREE.BoxGeometry(W, H, 0.12), wall);
  back.position.set(0, H / 2, -D / 2);
  back.receiveShadow = true;
  g.add(back);
  const left = new THREE.Mesh(new THREE.BoxGeometry(0.12, H, D), wall);
  left.position.set(-W / 2, H / 2, 0);
  left.receiveShadow = true;
  g.add(left);
  addBox(g, W - 0.2, 1.05, 0.04, lower, 0, 0.52, -D / 2 + 0.08);
  addBox(g, 0.04, 1.05, D - 0.2, lower, -W / 2 + 0.08, 0.52, 0);
  addBox(g, W - 0.2, 0.06, 0.05, toon(s.trim), 0, 1.12, -D / 2 + 0.09);
  addBox(g, 0.05, 0.06, D - 0.2, toon(s.trim), -W / 2 + 0.09, 1.12, 0);
  addBox(g, W - 0.15, 0.08, 0.06, toon('#0c0a12'), 0, 0.05, -D / 2 + 0.08);
  addBox(g, 0.06, 0.08, D - 0.15, toon('#0c0a12'), -W / 2 + 0.08, 0.05, 0);

  const ceil = toon(s.ceilingColor);
  addBox(g, W * 0.96, 0.08, D * 0.46, ceil, -0.15, H - 0.06, -D * 0.24);
  addBox(g, 3.4, 0.08, 2.15, ceil, 2.7, H - 0.08, 2.55);
  const tube = addBox(
    g, 4.6, 0.03, 0.03,
    toon('#200814', { emissive: '#ff4f9a', emissiveIntensity: 0.55 }),
    -2.2, H - 0.22, -D / 2 + 0.16
  );
  tube.userData.noShadow = true;
  addBox(g, 1.15, 0.04, 0.28, toon(s.brass), -0.15, 0.02, 3.85);
  return g;
}

const FLOOR_KINDS = new Set(['upright', 'blaster', 'pinball', 'cocktail', 'racing', 'counter', 'trash', 'sign']);

function makeProcedural(layout) {
  const g = new THREE.Group();
  g.name = 'procedural';
  const maps = buildMaps();
  for (const spec of layout.blocks) {
    let node = null;
    if (spec.kind === 'upright' || spec.kind === 'blaster') node = upright(spec, maps);
    else if (spec.kind === 'pinball') node = pinball(spec, maps);
    else if (spec.kind === 'cocktail') node = cocktail(spec, maps);
    else if (spec.kind === 'racing') node = racingPair(spec, maps);
    else if (spec.kind === 'counter') node = tokenCounter(spec, maps);
    else if (spec.kind === 'halfwall') node = halfWall(spec);
    else if (spec.kind === 'sign') node = priceSign(spec, maps);
    else if (spec.kind === 'trash') node = trashCan(spec);
    else if (spec.kind === 'neon') node = neonWord(spec.text, spec.color, spec.scale || 0.05);
    else if (spec.kind === 'mural') node = mural(spec, maps);
    if (!node) continue;
    g.add(place(node, spec));
    if (FLOOR_KINDS.has(spec.kind)) g.add(contact(spec));
  }
  return g;
}

function tuneAsset(kind, scene) {
  if (kind === 'pendant_lamp') {
    scene.traverse((obj) => {
      if (!obj.isMesh || !/bulb/i.test(obj.name || '')) return;
      obj.material = new THREE.MeshStandardMaterial({
        color: new THREE.Color('#fff6d8'),
        emissive: new THREE.Color('#ffb85a'),
        emissiveIntensity: 0.85,
      });
    });
    return;
  }
  if (kind !== 'cash_register') return;
  scene.traverse((obj) => {
    if (!obj.isMesh || !obj.material) return;
    const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
    const next = mats.map((src) => {
      const m = src.clone();
      if (m.color && Math.max(m.color.r, m.color.g, m.color.b) < 0.14) m.color.multiplyScalar(2.6);
      return m;
    });
    obj.material = next.length === 1 ? next[0] : next;
  });
}

boot({
  makeShell,
  makeProcedural,
  tuneAsset,
  readyText: 'ready — retro arcade · drag orbit · U unlit · T toon',
});
