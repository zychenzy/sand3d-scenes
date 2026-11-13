import * as THREE from 'three';
import { boot, toon, addBox, canvasTex } from './scene_lib.js';

const WOOD = ['#e7c48a', '#deb56e', '#e8c792', '#d7a85e', '#efd09a'];

function plankFill(g, w, h, tint) {
  const n = 39;
  for (let i = 0; i < n; i++) {
    const base = WOOD[i % WOOD.length];
    g.fillStyle = i % 2 ? base : tint || base;
    g.fillRect((i * w) / n, 0, w / n + 1, h);
  }
}

function dots(g, cx, y, count, gap, r, color) {
  g.fillStyle = color;
  for (let i = 0; i < count; i++) {
    const x = cx + (i - (count - 1) / 2) * gap;
    g.beginPath();
    g.arc(x, y, r, 0, Math.PI * 2);
    g.fill();
  }
}

function arrow(g, x, y, s) {
  g.fillStyle = '#8d1c14';
  g.beginPath();
  g.moveTo(x, y - s);
  g.lineTo(x + s * 0.42, y + s * 0.05);
  g.lineTo(x + s * 0.16, y + s * 0.05);
  g.lineTo(x + s * 0.16, y + s * 0.72);
  g.lineTo(x - s * 0.16, y + s * 0.72);
  g.lineTo(x - s * 0.16, y + s * 0.05);
  g.lineTo(x - s * 0.42, y + s * 0.05);
  g.closePath();
  g.fill();
}

function laneMap() {
  return canvasTex(640, 1600, (g, w, h) => {
    plankFill(g, w, h);
    g.fillStyle = 'rgba(120, 70, 30, 0.16)';
    g.fillRect(w * 0.41, 0, w * 0.18, h);
    g.fillStyle = 'rgba(90, 48, 22, 0.35)';
    g.fillRect(0, 0, w, h * 0.13);
    for (let i = 0; i < 8; i++) {
      g.fillStyle = i % 2 ? 'rgba(70, 40, 18, 0.25)' : 'rgba(210, 160, 90, 0.18)';
      g.fillRect(0, i * (h * 0.13) / 8, w, (h * 0.13) / 8);
    }
    const scales = [0.62, 0.78, 0.92, 1.15, 0.92, 0.78, 0.62];
    for (const band of [0.72, 0.84]) {
      scales.forEach((s, i) => arrow(g, ((i + 0.5) * w) / 7, h * band, 58 * s));
    }
    dots(g, w / 2, h * 0.52, 7, w / 9, 5, '#3a2416');
    dots(g, w / 2, h * 0.58, 7, w / 9, 4, '#3a2416');
    g.fillStyle = '#141414';
    g.fillRect(0, h - 22, w, 16);
    g.fillStyle = '#c4312e';
    g.fillRect(0, h - 8, w, 6);
  }, false);
}

function approachMap(nLeft, nRight) {
  return canvasTex(720, 640, (g, w, h) => {
    plankFill(g, w, h, '#e3bc7c');
    g.fillStyle = '#161616';
    g.fillRect(0, 0, w, 16);
    g.fillStyle = '#c4312e';
    g.fillRect(0, 14, w, 5);
    for (const cx of [w * 0.27, w * 0.73]) {
      dots(g, cx, h * 0.28, 5, 28, 7, '#3a2416');
      dots(g, cx, h * 0.40, 5, 28, 6, '#3a2416');
    }
    g.fillStyle = '#5a3418';
    g.font = 'bold 92px sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(String(nLeft), w * 0.27, h * 0.72);
    g.fillText(String(nRight), w * 0.73, h * 0.72);
  }, false);
}

const laneTexture = laneMap();

function scoreMap(left, right, variant) {
  const rows = variant
    ? [['CHO', 'X', 'X', '9/', 'X', '8/', 'X', 'X', '7/', 'X', 'X', '236'],
      ['REYES', '9/', '8/', 'X', '7/', '81', 'X', '9/', 'X', 'X', '9/', '201']]
    : [['OKADA', 'X', '7/', 'X', 'X', '9/', '81', 'X', 'X', 'X', 'X', '247'],
      ['BERG', '62', '8/', '9/', 'X', '7/', '81', '9/', 'X', '8/', '9/', '176']];
  return canvasTex(640, 360, (g, w, h) => {
    g.fillStyle = '#10141c';
    g.fillRect(0, 0, w, h);
    g.fillStyle = '#d4a24a';
    g.fillRect(0, 0, w, 8);
    g.font = 'bold 28px sans-serif';
    g.textAlign = 'left';
    g.textBaseline = 'middle';
    g.fillText('NORTH PINS', 16, 28);
    g.textAlign = 'right';
    g.fillStyle = '#9eb0c4';
    g.font = '16px sans-serif';
    g.fillText('FRAME', w - 16, 28);
    rows.forEach((row, r) => {
      const y = 78 + r * 140;
      g.fillStyle = r ? '#16324a' : '#3a1830';
      g.fillRect(12, y - 36, w - 24, 124);
      g.fillStyle = '#f4f1ea';
      g.font = 'bold 22px sans-serif';
      g.textAlign = 'left';
      g.fillText(`${r ? right : left}  ${row[0]}`, 24, y - 8);
      for (let f = 0; f < 10; f++) {
        const x = 24 + f * 58;
        g.strokeStyle = '#d4a24a';
        g.lineWidth = 2;
        g.strokeRect(x, y + 16, 52, 48);
        g.fillStyle = '#f6e27a';
        g.font = 'bold 20px sans-serif';
        g.textAlign = 'center';
        g.fillText(row[f + 1], x + 26, y + 42);
      }
    });
  }, true);
}

function maskingMap(left, right) {
  return canvasTex(900, 420, (g, w, h) => {
    g.fillStyle = '#10241c';
    g.fillRect(0, 0, w, h);
    g.fillStyle = '#d4a24a';
    g.fillRect(0, 0, w, 14);
    g.fillRect(0, h - 14, w, 14);
    g.beginPath();
    g.moveTo(w * 0.5, 70);
    g.lineTo(w * 0.72, h * 0.48);
    g.lineTo(w * 0.5, h * 0.40);
    g.lineTo(w * 0.28, h * 0.48);
    g.closePath();
    g.fill();
    g.fillStyle = '#f4f1ea';
    g.font = 'bold 42px sans-serif';
    g.textAlign = 'center';
    g.fillText('NORTH PINS', w / 2, h * 0.68);
    g.font = 'bold 120px sans-serif';
    g.fillStyle = '#d4a24a';
    g.fillText(String(left), w * 0.28, h * 0.9);
    g.fillText(String(right), w * 0.72, h * 0.9);
  }, true);
}

function menuMap() {
  return canvasTex(480, 640, (g, w, h) => {
    g.fillStyle = '#1c140e';
    g.fillRect(0, 0, w, h);
    g.strokeStyle = '#d4a24a';
    g.lineWidth = 10;
    g.strokeRect(12, 12, w - 24, h - 24);
    g.fillStyle = '#d4a24a';
    g.font = 'bold 64px sans-serif';
    g.textAlign = 'center';
    g.fillText('SNACKS', w / 2, 92);
    const items = [['FRIES', '4'], ['PRETZEL', '3'], ['NACHOS', '6'], ['SODA', '2']];
    g.font = 'bold 40px sans-serif';
    items.forEach((row, i) => {
      const y = 190 + i * 100;
      g.fillStyle = '#f4f1ea';
      g.textAlign = 'left';
      g.fillText(row[0], 48, y);
      g.textAlign = 'right';
      g.fillStyle = '#d4a24a';
      g.fillText(row[1], w - 48, y);
    });
  }, false);
}

function shoeMap() {
  return canvasTex(640, 200, (g, w, h) => {
    g.fillStyle = '#14221c';
    g.fillRect(0, 0, w, h);
    g.fillStyle = '#d4a24a';
    g.font = 'bold 42px sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText('SHOE RENTAL', w / 2, 48);
    g.font = '28px sans-serif';
    g.fillStyle = '#f4f1ea';
    g.fillText('35   37   39   41   43   45', w / 2, 120);
  }, false);
}

function span(layout) {
  const parts = [...layout.lanes, ...layout.caps, ...layout.gutters, ...layout.returns, ...layout.gaps];
  const xs = parts.flatMap((p) => [p.x - p.w / 2, p.x + p.w / 2]);
  const min = Math.min(...xs);
  const max = Math.max(...xs);
  return { min, max, center: (min + max) / 2, width: max - min };
}

function xzPlane(w, len, mat) {
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, len), mat);
  mesh.rotation.x = -Math.PI / 2;
  mesh.userData.noShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function makeShell(layout) {
  const g = new THREE.Group();
  g.name = 'shell';
  const { width: W, depth: D, height: H } = layout.meta.room;
  const s = layout.shell;
  const floor = addBox(g, W, 0.1, D, toon(s.floorColor), 0, -0.05, 0);
  floor.userData.noShadow = true;
  const back = addBox(g, W, H, 0.16, toon(s.wallColor), 0, H / 2, -D / 2);
  back.userData.noShadow = true;
  const left = addBox(g, 0.16, H, D, toon(s.wallColor), -W / 2, H / 2, 0);
  left.userData.noShadow = true;
  const wainscot = toon(s.wainscot);
  const rail = toon(s.woodColor);
  addBox(g, W - 0.28, 1.08, 0.07, wainscot, 0, 0.54, -D / 2 + 0.1).userData.noShadow = true;
  addBox(g, 0.07, 1.08, D - 0.28, wainscot, -W / 2 + 0.1, 0.54, 0).userData.noShadow = true;
  addBox(g, W - 0.2, 0.07, 0.09, rail, 0, 1.12, -D / 2 + 0.12);
  addBox(g, 0.09, 0.07, D - 0.2, rail, -W / 2 + 0.12, 1.12, 0);

  const box = span(layout);
  const ceilD = layout.plan.approachEndZ - (-D / 2) - 0.4;
  const ceilZ = -D / 2 + 0.15 + ceilD / 2;
  const ceil = addBox(g, box.width + 1.2, 0.1, ceilD, toon(s.ceilingColor), box.center, H - 0.08, ceilZ);
  ceil.userData.noShadow = true;
  const fascia = addBox(g, box.width + 1.2, 0.28, 0.12, toon('#1a1714'), box.center, H - 0.28, ceilZ + ceilD / 2);
  fascia.userData.noShadow = true;

  for (let i = 0; i < 6; i++) {
    const z = -D / 2 + 1.3 + i * 1.85;
    const beam = addBox(g, box.width + 0.6, 0.16, 0.1, toon('#1a1714'), box.center, H - 0.28, z);
    beam.userData.noShadow = true;
  }
  return g;
}

function addFloors(g, layout) {
  for (const f of layout.floors) {
    const mesh = addBox(g, f.w, 0.02, f.d, toon(f.color), f.x, 0.012, f.z);
    mesh.userData.noShadow = true;
  }
}

function addApproaches(g, layout) {
  for (const ap of layout.approaches) {
    const pair = layout.pairs[ap.pair];
    const len = ap.z1 - ap.z0;
    const mat = toon('#ffffff', { map: approachMap(pair.lanes[0], pair.lanes[1]) });
    const mesh = xzPlane(ap.w, len, mat);
    mesh.position.set(ap.x, 0.045, (ap.z0 + ap.z1) / 2);
    g.add(mesh);
    addBox(g, ap.w, 0.04, len, toon('#c4965a'), ap.x, 0.02, (ap.z0 + ap.z1) / 2).userData.noShadow = true;
  }
}

function addLanes(g, layout) {
  const pitMat = toon('#1a120e');
  for (const lane of layout.lanes) {
    const len = lane.foulZ - lane.pitZ;
    const mesh = xzPlane(lane.w, len, toon('#ffffff', { map: laneTexture }));
    mesh.position.set(lane.x, 0.062, (lane.foulZ + lane.pitZ) / 2);
    g.add(mesh);
    const body = addBox(g, lane.w, 0.045, len, toon('#b8894a'), lane.x, 0.03, (lane.foulZ + lane.pitZ) / 2);
    body.userData.noShadow = true;
    addBox(g, lane.w + 0.02, 0.02, 0.04, toon('#111'), lane.x, 0.07, lane.foulZ);
  }
  for (const gutter of layout.gutters) {
    const len = gutter.foulZ - gutter.pitZ;
    const channel = addBox(g, gutter.w, 0.035, len, toon('#2c3036'), gutter.x, 0.02, (gutter.foulZ + gutter.pitZ) / 2);
    channel.userData.noShadow = true;
    addBox(g, 0.025, 0.02, len, toon('#8d939a'), gutter.x - gutter.w / 2 + 0.02, 0.045, (gutter.foulZ + gutter.pitZ) / 2).userData.noShadow = true;
  }
  for (const ret of layout.returns) {
    const len = ret.foulZ - ret.pitZ;
    const cap = addBox(g, ret.w * 0.72, 0.055, len, toon('#243038'), ret.x, 0.048, (ret.foulZ + ret.pitZ) / 2);
    cap.userData.noShadow = true;
  }
  for (const cap of [...layout.caps, ...layout.gaps]) {
    const len = layout.plan.approachEndZ - cap.pitZ;
    const strip = addBox(g, cap.w, 0.05, len, toon('#241c18'), cap.x, 0.04, (layout.plan.approachEndZ + cap.pitZ) / 2);
    strip.userData.noShadow = true;
  }
  for (const lane of layout.lanes) {
    addBox(g, lane.w * 0.72, 0.01, 0.55, pitMat, lane.x, 0.05, lane.pitZ + 0.35).userData.noShadow = true;
  }
}

function counterMesh(g, b) {
  const body = toon(b.color);
  const top = toon(b.top);
  addBox(g, b.w - 0.08, b.h - 0.08, b.d - 0.06, body, -0.02, (b.h - 0.08) / 2, 0);
  addBox(g, b.w + 0.04, 0.055, b.d, top, 0.03, b.h - 0.03, 0);
  addBox(g, 0.035, 0.16, b.d - 0.16, toon(b.accent), b.w / 2 + 0.01, b.h - 0.16, 0);
  addBox(g, b.w - 0.16, 0.1, b.d - 0.2, toon('#141414'), -0.04, 0.05, 0);
  if (b.label === 'SNACKS') {
    addBox(g, 0.34, 0.28, 0.7, toon('#d8ece8', { transparent: true, opacity: 0.45 }), 0.12, b.h + 0.16, -0.15);
    addBox(g, 0.28, 0.02, 0.62, toon('#6a4328'), 0.12, b.h + 0.02, -0.15);
    for (const dz of [-0.18, 0, 0.18]) {
      addBox(g, 0.07, 0.16, 0.07, toon('#c4312e'), 0.1, b.h + 0.1, -0.15 + dz);
    }
    addBox(g, 0.16, 0.08, 0.22, toon('#f4f1ea'), -0.12, b.h + 0.05, 0.35);
  } else {
    addBox(g, b.d * 0.55, 0.012, 0.08, toon('#d4a24a'), 0.08, b.h + 0.01, -0.2);
    shoe(g, 0.16, b.h + 0.01, 0.35, '#c4232a');
    shoe(g, 0.16, b.h + 0.01, 0.48, '#1d4e89');
    shoe(g, 0.16, b.h + 0.01, 0.72, '#f4f1ea');
  }
}

function cubby(g, b) {
  const wood = toon('#4a3428');
  addBox(g, b.w, b.h, b.d, wood, 0, b.h / 2, 0);
  const cols = b.cols;
  const rows = b.rows;
  const cw = (b.d - 0.14) / cols;
  const ch = (b.h - 0.22) / rows;
  const colors = ['#c4232a', '#1d4e89', '#f2f2f2', '#1a1a1a', '#e07a1f', '#1f7a4d', '#5c2d82', '#d4a017', '#0e6b6b', '#b01e6a', '#6a4328', '#cfc6b8'];
  let n = 0;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const z = -b.d / 2 + 0.08 + cw * (c + 0.5);
      const y = 0.14 + ch * r + 0.08;
      addBox(g, 0.02, ch - 0.08, cw - 0.07, toon('#1a120e'), b.w / 2 - 0.005, y + ch * 0.28, z);
      shoe(g, 0.02, y, z - 0.05, colors[n % colors.length]);
      shoe(g, 0.02, y, z + 0.06, colors[n % colors.length]);
      n += 1;
    }
  }
}

function shoe(g, x, y, z, color) {
  const s = new THREE.Group();
  addBox(s, 0.2, 0.035, 0.07, toon('#222'), 0, 0.02, 0);
  addBox(s, 0.13, 0.055, 0.062, toon(color), -0.02, 0.055, 0);
  addBox(s, 0.05, 0.03, 0.058, toon('#f6f1e6'), 0.055, 0.05, 0);
  s.position.set(x, y, z);
  g.add(s);
}

function rack(g, b) {
  const metal = toon('#2a2e32');
  const wood = toon('#5a3a24');
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      addBox(g, 0.04, b.h, 0.04, metal, sx * (b.w / 2 - 0.03), b.h / 2, sz * (b.d / 2 - 0.03));
    }
  }
  addBox(g, 0.03, b.h - 0.08, b.d - 0.06, toon('#3a2418'), -b.w / 2 + 0.02, b.h / 2, 0);
  for (const y of [0.20, 0.56, 0.92]) {
    addBox(g, b.w - 0.08, 0.03, b.d - 0.08, wood, 0.02, y, 0);
  }
}

function tray(g, b) {
  const body = toon('#1c1e22');
  addBox(g, 0.05, b.h, b.d, body, -b.w / 2 + 0.025, b.h / 2, 0);
  addBox(g, 0.05, b.h, b.d, body, b.w / 2 - 0.025, b.h / 2, 0);
  addBox(g, b.w - 0.1, 0.06, b.d - 0.06, toon('#3a4048'), 0, 0.30, 0.02);
  addBox(g, b.w, b.h * 0.55, 0.05, body, 0, b.h * 0.28, -b.d / 2 + 0.03);
  addBox(g, 0.1, 0.06, 0.08, toon('#c4312e'), 0, b.h + 0.01, b.d / 2 - 0.08);
}

function consoleUnit(g, b) {
  const map = scoreMap(b.lanes[0], b.lanes[1], b.pair);
  const y = b.y;
  addBox(g, 0.07, y - 0.48, 0.07, toon('#1c1e22'), 0, 0.48 + (y - 0.48) / 2, 0);
  addBox(g, b.w, b.h, b.d, toon('#12161a'), 0, y + b.h / 2, 0);
  const screen = new THREE.Mesh(
    new THREE.PlaneGeometry(b.w - 0.06, b.h - 0.07),
    toon('#ffffff', { map, emissive: '#ffffff', emissiveMap: map, emissiveIntensity: 0.8 }),
  );
  screen.position.set(0, y + b.h / 2, b.d / 2 + 0.006);
  screen.userData.noShadow = true;
  g.add(screen);
}

function masking(g, b) {
  const map = maskingMap(b.lanes[0], b.lanes[1]);
  addBox(g, b.w, b.h, b.d, toon('#10241c'), 0, b.y + b.h / 2, 0).userData.noShadow = true;
  const face = new THREE.Mesh(
    new THREE.PlaneGeometry(b.w - 0.12, b.h - 0.16),
    toon('#ffffff', { map, emissive: '#ffffff', emissiveMap: map, emissiveIntensity: 0.4 }),
  );
  face.position.set(0, b.y + b.h / 2, b.d / 2 + 0.008);
  face.userData.noShadow = true;
  g.add(face);
}

function hood(g, b) {
  addBox(g, b.w, b.h, b.d, toon('#141618'), 0, b.h / 2, 0).userData.noShadow = true;
  addBox(g, b.w * 0.55, 0.62, 0.04, toon('#070809'), 0, 0.55, b.d / 2 + 0.01).userData.noShadow = true;
  addBox(g, 0.08, 0.35, 0.04, toon('#c4312e'), b.w * 0.32, 1.7, b.d / 2 + 0.02);
}

function sign(g, b) {
  const map = b.text === 'menu' ? menuMap() : shoeMap();
  const towardConcourse = b.face === '+z';
  const face = new THREE.Mesh(
    new THREE.PlaneGeometry(towardConcourse ? b.w : b.d, b.h),
    toon('#ffffff', { map, emissive: '#ffffff', emissiveMap: map, emissiveIntensity: 0.45 }),
  );
  if (towardConcourse) {
    face.position.set(0, b.y + b.h / 2, b.d / 2 + 0.012);
  } else {
    face.position.set(b.w / 2 + 0.01, b.y + b.h / 2, 0);
    face.rotation.y = Math.PI / 2;
  }
  face.userData.noShadow = true;
  g.add(face);
  addBox(g, towardConcourse ? b.w : 0.04, b.h, towardConcourse ? 0.04 : b.d, toon('#1c140e'), 0, b.y + b.h / 2, 0);
}

function placeBlock(g, b) {
  const grp = new THREE.Group();
  grp.position.set(b.x, 0, b.z);
  grp.rotation.y = b.yaw || 0;
  grp.name = b.id;
  if (b.kind === 'counter') counterMesh(grp, b);
  else if (b.kind === 'cubby') cubby(grp, b);
  else if (b.kind === 'rack') rack(grp, b);
  else if (b.kind === 'tray') tray(grp, b);
  else if (b.kind === 'console') consoleUnit(grp, b);
  else if (b.kind === 'masking') masking(grp, b);
  else if (b.kind === 'hood') hood(grp, b);
  else if (b.kind === 'sign') sign(grp, b);
  g.add(grp);
}

function addLights(g, layout) {
  const box = span(layout);
  for (const pair of layout.pairs) {
    const bar = addBox(g, 0.28, 0.06, 8.4, toon('#fff6df', {
      emissive: '#fff1cc',
      emissiveIntensity: 0.85,
    }), pair.x, layout.meta.room.height - 0.42, -1.6);
    bar.userData.noShadow = true;
    const spot = new THREE.SpotLight(0xfff0cc, 6.5, 16, 0.42, 0.35, 1.2);
    spot.position.set(pair.x, 3.85, -1.2);
    spot.target.position.set(pair.x, 0, -6.2);
    spot.castShadow = false;
    g.add(spot);
    g.add(spot.target);
  }
  const concourse = new THREE.PointLight(0xffe1b0, 0.55, 7, 2);
  concourse.position.set(0.8, 3.3, 9.1);
  g.add(concourse);
  void box;
}

function makeProcedural(layout) {
  const g = new THREE.Group();
  g.name = 'procedural';
  addFloors(g, layout);
  addApproaches(g, layout);
  addLanes(g, layout);
  for (const block of layout.blocks) placeBlock(g, block);
  addLights(g, layout);
  return g;
}

function decoratePins(root) {
  root.traverse((obj) => {
    if (!obj.name || !obj.name.startsWith('pin_')) return;
    for (const y of [0.232, 0.278]) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.04, 0.008, 8, 18), toon('#c4312e'));
      ring.rotation.x = Math.PI / 2;
      ring.position.y = y;
      ring.castShadow = true;
      obj.add(ring);
    }
  });
}

boot({
  makeShell,
  makeProcedural,
  tuneAsset(kind, scene) {
    if (kind !== 'pendant_lamp') return;
    scene.traverse((obj) => {
      if (!obj.isMesh || !/bulb/i.test(obj.name || '')) return;
      const src = Array.isArray(obj.material) ? obj.material[0] : obj.material;
      if (!src) return;
      src.emissive = new THREE.Color('#fff4c8');
      src.emissiveIntensity = 1.1;
      src.color = new THREE.Color('#fff8e4');
    });
  },
  onReady(ctx) {
    decoratePins(ctx.scene);
  },
  readyText: 'ready — north pins · drag orbit · U unlit · T toon',
});
