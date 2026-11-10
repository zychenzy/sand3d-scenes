import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = path.dirname(fileURLToPath(import.meta.url));
const PI = Math.PI;

const instances = [];
function add(id, kind, position, rotationY = 0, extra = {}) {
  instances.push({ id, kind, position, rotationY, ...extra });
}

const booths = [
  ['booth_a', -4.52, -2.22],
  ['booth_b', -4.52, 0.12],
  ['booth_c', -4.52, 2.46],
];
for (const [id, x, z] of booths) {
  add(id, 'diner_booth', [x, 0, z], PI / 2);
  add(`cup_${id}`, 'cup_mug', [x + 0.08, 0.78, z + 0.06], 0.4);
}

const tables = [
  ['t1', 1.55, 2.32],
  ['t2', 1.55, -0.08],
  ['t3', 1.55, -2.46],
];

function chairsFor(id, tx, tz) {
  const sideZ = 0.78;
  const xs = [-0.76, 0, 0.76];
  xs.forEach((dx, i) => {
    add(`${id}_s${i}`, 'dining_chair', [tx + dx, 0, tz + sideZ], PI, {
      lookAt: [tx + dx, tz],
      role: 'faces table',
    });
    add(`${id}_n${i}`, 'dining_chair', [tx + dx, 0, tz - sideZ], 0, {
      lookAt: [tx + dx, tz],
      role: 'faces table',
    });
  });
  add(`${id}_e`, 'dining_chair', [tx + 1.50, 0, tz], -PI / 2, {
    lookAt: [tx, tz],
    role: 'faces table',
  });
  add(`${id}_w`, 'dining_chair', [tx - 1.50, 0, tz], PI / 2, {
    lookAt: [tx, tz],
    role: 'faces table',
  });
}

tables.forEach(([id, x, z], i) => {
  add(id, 'dining_table', [x, 0, z], 0);
  chairsFor(id, x, z);
  add(`pend_${id}a`, 'pendant_lamp', [x - 0.52, 2.72, z], 0.05 * i);
  add(`pend_${id}b`, 'pendant_lamp', [x + 0.52, 2.72, z], -0.08 * (i + 1));
  add(`cup_${id}a`, 'cup_mug', [x - 0.42, 0.77, z + 0.18], 0.7);
  add(`cup_${id}b`, 'cup_mug', [x + 0.38, 0.77, z - 0.16], -0.5);
  add(`jar_${id}`, 'jam_jar', [x + 0.18, 0.77, z + 0.08], 0.3 * (i + 1));
  add(`tray_${id}`, 'tray_napkin', [x - 0.08, 0.77, z - 0.22], 0.15);
});

add('host', 'book_stand', [4.55, 0, 3.55], -0.55);
add('shelf_pass', 'wall_shelf', [-0.15, 1.22, -4.18], 0);
add('shelf_wait', 'wall_shelf', [4.55, 1.28, -3.15], -PI / 2);
add('thermos_pass', 'thermos', [-0.35, 1.38, -4.1], 0.2);
add('jar_pass_a', 'jam_jar', [0.05, 1.38, -4.08], 0.6);
add('jar_pass_b', 'jam_jar', [0.22, 1.38, -4.12], -0.3);
add('cup_pass_a', 'cup_mug', [-0.55, 1.38, -4.06], 0.9);
add('cup_pass_b', 'cup_mug', [-0.72, 1.38, -4.1], -0.4);
add('tray_pass', 'tray_napkin', [0.42, 1.38, -4.08], 0.1);

add('pot_back', 'flowerpot', [-5.35, 0, -3.95], 0.3);
add('pot_front', 'flowerpot', [-5.28, 0, 3.55], -0.2);
add('pot_right', 'flowerpot', [4.85, 0, 2.05], 0.5);
add('pot_wait', 'flowerpot', [4.72, 0.92, -3.15], 0.15, { scale: 0.62 });
add('pot_sill', 'flowerpot', [3.25, 1.12, -4.12], 0.4, { scale: 0.55 });

const layout = {
  meta: {
    title: 'Hinoki dining',
    slug: 'hinoki-dining',
    units: 'metres',
    style: 'Toon hard',
    room: { width: 11.6, depth: 8.8, height: 3.28 },
    zones: ['wall-booths', 'table-dining', 'sushi-pass'],
    readyText: 'ready — Hinoki dining · drag orbit · T toon · U unlit',
    notes: [
      'Japanese dining room redo of restaurant/. Three wall booths on the left, three large 8-top tables, sushi pass on the back wall.',
      'No screens, shoji, or partitions. One chair type around the tables; booths are complete diner pairs, not facing islands of pairs.',
      'Chairs face their table (dining-chair forward is +Z at rotationY 0, backrest on −Z). Circulation aisle on the red runner between booths and tables.',
    ],
  },
  assets: {
    diner_booth: {
      glb: '../../../restaurant/assets/diner_booth__c976b6f9406d.glb',
      targetHeight: 1.12,
      forward: 'benches face across local X; rotationY π/2 puts the pair against the left wall',
    },
    dining_chair: {
      glb: '../../../restaurant/assets/dining_chair__5e1f7a56da4a.glb',
      targetHeight: 0.86,
      forward: '+Z at rotationY 0. Backrest sits on −Z.',
    },
    dining_table: {
      glb: '../../../restaurant/assets/long_dining__fb2f8f65156e.glb',
      fit: [2.56, 0.76, 1.14],
      note: 'Native trestle is ~1.8×0.94 m. Non-uniform fit makes an 8-top without a new bake.',
    },
    pendant_lamp: {
      glb: '../../../restaurant/assets/pendant_lamp__1b528c6ab04e.glb',
      targetHeight: 0.46,
    },
    cup_mug: {
      glb: '../../../restaurant/assets/cup_mug__6da6f7f87b8d.glb',
      targetHeight: 0.1,
    },
    flowerpot: {
      glb: '../../../restaurant/assets/flowerpot__4a270f247734.glb',
      targetHeight: 0.28,
    },
    jam_jar: {
      glb: '../../../cafe/assets/jam_jar__4e43eb29aa14.glb',
      targetHeight: 0.14,
    },
    tray_napkin: {
      glb: '../../../cafe/assets/tray_napkin__86821ece655f.glb',
      targetHeight: 0.07,
    },
    wall_shelf: {
      glb: '../../../cafe/assets/wall_shelf__8732f5e14a30.glb',
      targetHeight: 0.5,
    },
    thermos: {
      glb: '../../../cafe/assets/thermos__c85ee7b8828b.glb',
      targetHeight: 0.24,
    },
    book_stand: {
      glb: '../../../library/assets/book_stand__fb784262748d.glb',
      targetHeight: 1.08,
    },
  },
  instances,
  shell: {
    floorColor: '#6a432c',
    plankA: '#c49662',
    plankB: '#b4834e',
    plankC: '#d0a56e',
    wallColor: '#efe6d6',
    wood: '#6b4423',
    woodDark: '#4a2e18',
    woodLight: '#c4a06a',
    stone: '#e4d6c4',
    brass: '#b08d57',
    ink: '#2c2018',
    accent: '#6b1d1d',
    runner: '#5a1818',
    ceiling: '#f3eee4',
    glass: '#cfe0d4',
    clearColor: '#e6ddd0',
    fogColor: '#e6ddd0',
    fogNear: 15,
    fogFar: 34,
  },
  camera: {
    fov: 40,
    position: [6.55, 4.45, 7.05],
    target: [-0.25, 0.95, -0.55],
  },
  cameraPresets: {
    corner: {
      position: [6.15, 2.65, -0.15],
      target: [-0.55, 0.95, -0.35],
    },
    close: {
      position: [0.85, 1.48, 3.55],
      target: [-1.85, 0.9, 0.35],
    },
  },
  lights: {
    hemi: { sky: 16771272, ground: 5914160, intensity: 0.38 },
    key: { color: 16773336, intensity: 0.86, position: [7.2, 9.2, 4.4], shadowSpan: 12 },
    window: { color: 14019062, intensity: 0.28, position: [2.4, 6.5, -8.5], shadowSpan: 8 },
    fill: { color: 16768210, intensity: 0.16, position: [-6, 5, 3] },
  },
};

fs.writeFileSync(path.join(dir, 'layout.json'), JSON.stringify(layout, null, 2) + '\n');
console.log(`wrote layout.json — ${instances.length} instances`);
