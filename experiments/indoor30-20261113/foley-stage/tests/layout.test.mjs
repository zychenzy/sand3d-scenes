import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  bindLayout, rotationFor, forwardXZ, norm2, rotatedLocal, pitRect, rectDist, rectGap,
  luminance, aimInfo, expandShoes,
} from '../orient.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const repo = join(root, '../../..');
const layout = JSON.parse(readFileSync(join(root, 'layout.json'), 'utf8'));
const manifest = JSON.parse(readFileSync(join(root, 'assets/manifest.json'), 'utf8'));
const bound = bindLayout(structuredClone(layout), manifest);
const source = readFileSync(join(root, 'foley.js'), 'utf8');

function glbBounds(rel) {
  const buf = readFileSync(join(root, rel));
  assert.equal(buf.toString('utf8', 0, 4), 'glTF');
  const jsonLen = buf.readUInt32LE(12);
  const json = JSON.parse(buf.toString('utf8', 20, 20 + jsonLen));
  const acc = json.accessors.filter((a) => a && a.min && a.max && a.type === 'VEC3');
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  for (const a of acc) {
    if (!json.meshes.some((m) => m.primitives.some((p) => p.attributes.POSITION === json.accessors.indexOf(a)))) continue;
    for (let k = 0; k < 3; k++) {
      min[k] = Math.min(min[k], a.min[k]);
      max[k] = Math.max(max[k], a.max[k]);
    }
  }
  return { min, max, size: min.map((v, i) => max[i] - v), bytes: buf.length };
}

test('large quiet stage with five specialist zones', () => {
  const { width, depth, height } = layout.meta.room;
  assert.ok(width >= 12 && depth >= 10 && height >= 4.2);
  assert.deepEqual(layout.meta.zones.map((z) => z.id), ['pits', 'water', 'props', 'shoes', 'control']);
  assert.equal(layout.meta.style.includes('Toon'), true);
});

test('shared catalog GLBs are root references and baked props stay in this folder', () => {
  const own = new Set(['shotgun_mic', 'foley_shoe', 'foley_shoe_r', 'stage_door', 'water_basin']);
  for (const [kind, spec] of Object.entries(layout.assets)) {
    if (own.has(kind)) {
      assert.equal(spec.glb.startsWith('assets/'), true, kind);
      assert.equal(existsSync(join(root, spec.glb)), true, spec.glb);
      const stat = glbBounds(spec.glb);
      assert.ok(stat.bytes < 80000, `${kind} is oversized (${stat.bytes})`);
      assert.ok(Math.abs(stat.size[1] - spec.targetHeight) / spec.targetHeight < 0.08, `${kind} height ${stat.size[1]} vs ${spec.targetHeight}`);
    } else {
      assert.equal(spec.glb.startsWith('../../../'), true, spec.glb);
      assert.equal(spec.glb.includes('foley-stage'), false);
      assert.equal(existsSync(join(root, spec.glb)), true, spec.glb);
      assert.equal(existsSync(join(repo, spec.glb.replace('../../../', ''))), true);
    }
  }
});

test('gravel, wood, and sand pits are distinct and separated by a safe aisle', () => {
  assert.deepEqual(layout.pits.map((p) => p.id), ['gravel', 'wood', 'sand']);
  const rects = layout.pits.map(pitRect);
  for (let i = 0; i < rects.length; i++) {
    for (let j = i + 1; j < rects.length; j++) {
      const gap = rectGap(rects[i], rects[j]);
      assert.ok(gap >= 0.9, `${rects[i].id} to ${rects[j].id} gap ${gap}`);
    }
    assert.ok(rects[i].maxX - rects[i].minX >= 1.2);
    assert.ok(rects[i].maxZ - rects[i].minZ >= 2);
  }
  const basin = {
    minX: layout.basin.center[0] - layout.basin.size[0] / 2,
    maxX: layout.basin.center[0] + layout.basin.size[0] / 2,
    minZ: layout.basin.center[1] - layout.basin.size[1] / 2,
    maxZ: layout.basin.center[1] + layout.basin.size[1] / 2,
  };
  assert.ok(layout.basin.size[0] < 1.5 && layout.basin.size[1] < 0.9);
  for (const rect of rects) assert.ok(rectGap(basin, rect) >= 0.7, rect.id);
});

test('shoe wall is a rack of pairs, not a single display', () => {
  const shoes = expandShoes(layout.shoes);
  assert.ok(shoes.length >= 48);
  assert.equal(shoes.filter((s) => s.kind === 'foley_shoe').length, shoes.length / 2);
  assert.ok(layout.shoes.pairGap >= 0.13);
  for (const shoe of shoes) {
    assert.ok(shoe.position[0] < -6.2, shoe.id);
    assert.ok(shoe.position[1] < 2, shoe.id);
  }
});

test('control window is a separated double-glazed booth and the mixer faces it', () => {
  const c = layout.control;
  assert.equal(c.panes.length, 2);
  const gap = Math.abs(c.panes[0] - c.panes[1]);
  assert.ok(gap >= 0.04 && gap <= 0.1, gap);
  const seat = layout.instances.find((i) => i.id === 'engineer');
  const mon = layout.instances.find((i) => i.id === 'picture_mon');
  const desk = layout.instances.find((i) => i.id === 'cue_desk');
  assert.ok(seat.position[2] < c.max[1] && seat.position[2] > c.min[1]);
  assert.ok(seat.position[0] > c.min[0] && seat.position[0] < c.max[0]);
  const seatFwd = forwardXZ(rotationFor(seat.modelForward, seat.position, seat.lookAt), seat.modelForward);
  const toWindow = norm2(0, c.max[1] - seat.position[2]);
  assert.ok(seatFwd[0] * toWindow[0] + seatFwd[1] * toWindow[1] > 0.98);
  const monFwd = forwardXZ(rotationFor(mon.modelForward, mon.position, mon.lookAt), mon.modelForward);
  const toSeat = norm2(seat.position[0] - mon.position[0], seat.position[2] - mon.position[2]);
  assert.ok(monFwd[0] * toSeat[0] + monFwd[1] * toSeat[1] > 0.98);
  const side = rotatedLocal(1, 0, desk.rotationY);
  const toSitter = norm2(seat.position[0] - desk.position[0], seat.position[2] - desk.position[2]);
  assert.ok(side[0] * toSitter[0] + side[1] * toSitter[1] > 0.9);
  const spk = layout.instances.find((i) => i.id === 'cue_speaker');
  assert.ok(spk.position[0] > c.min[0] && spk.position[0] < c.max[0]);
  assert.ok(spk.position[2] > c.min[1] && spk.position[2] < c.max[1]);
  assert.equal(layout.instances.filter((i) => i.kind === 'speaker').length, 1);
});

test('suspended mics point at the surface they record', () => {
  const pits = Object.fromEntries(layout.pits.map((p) => [p.id, pitRect(p)]));
  for (const mic of layout.mics.filter((m) => m.role === 'pit')) {
    assert.equal(mic.suspend, true);
    assert.ok(mic.anchor[1] > 3.2, mic.id);
    assert.ok(Math.hypot(mic.anchor[0] - mic.capsule[0], mic.anchor[2] - mic.capsule[2]) < 0.8, mic.id);
    const info = aimInfo(mic.capsule, mic.aim);
    assert.ok(info.down < -0.55, `${mic.id} down ${info.down}`);
    assert.ok(info.dist > 0.45 && info.dist < 1.6, `${mic.id} dist ${info.dist}`);
    const rect = pits[mic.pit];
    assert.ok(rectDist(mic.aim[0], mic.aim[2], rect) === 0, `${mic.id} aim misses the pit`);
    assert.ok(rectDist(mic.capsule[0], mic.capsule[2], rect) === 0, `${mic.id} capsule is not over the pit`);
    assert.ok(mic.capsule[1] > 0.5 && mic.capsule[1] < 1.5);
  }
  const water = layout.mics.find((m) => m.role === 'water');
  const waterInfo = aimInfo(water.capsule, water.aim);
  assert.ok(water.suspend && water.anchor[1] > 3 && waterInfo.down < -0.6);
  assert.ok(Math.hypot(water.aim[0] - layout.basin.center[0], water.aim[2] - layout.basin.center[1]) < 0.2);

  const doorMic = bound.mics.find((m) => m.role === 'door');
  const doorInfo = aimInfo(doorMic.capsule, doorMic.aim);
  assert.equal(doorMic.suspend, true);
  assert.ok(doorMic.anchor[1] > 3);
  assert.ok(doorInfo.down > -0.35 && doorInfo.down < 0.15, doorInfo.down);
  assert.ok(doorInfo.dist > 0.35 && doorInfo.dist < 0.9, doorInfo.dist);
  const latch = bound.door.latch;
  assert.ok(Math.hypot(latch[0] - doorMic.aim[0], latch[1] - doorMic.aim[1], latch[2] - doorMic.aim[2]) < 0.02);

  const talk = layout.mics.find((m) => m.role === 'talkback');
  assert.equal(talk.suspend, false);
  assert.ok(talk.anchor[1] < 1.3 && talk.anchor[1] > 0.6);
  const seat = layout.instances.find((i) => i.id === 'engineer');
  const talkInfo = aimInfo(talk.capsule, talk.aim);
  const toSeat = norm2(seat.position[0] - talk.capsule[0], seat.position[2] - talk.capsule[2]);
  assert.ok(talkInfo.dir[0] * toSeat[0] + talkInfo.dir[2] * toSeat[1] > 0.8);
});

test('pathways stay out of pits, the basin, and the prop keep-outs', () => {
  const obstacles = [
    ...layout.pits.map((p) => ({ id: p.id, ...pitRect(p) })),
    {
      id: 'basin',
      minX: layout.basin.center[0] - layout.basin.size[0] / 2,
      maxX: layout.basin.center[0] + layout.basin.size[0] / 2,
      minZ: layout.basin.center[1] - layout.basin.size[1] / 2,
      maxZ: layout.basin.center[1] + layout.basin.size[1] / 2,
    },
    { id: 'door', ...layout.door.keep },
    { id: 'stairs', ...layout.built.stairs.keep },
    { id: 'cloth', ...layout.built.cloth.keep },
    { id: 'thunder', ...layout.built.thunder.keep },
    { id: 'crate', ...layout.built.crate.keep },
    { id: 'booth', minX: layout.control.min[0], maxX: layout.control.max[0], minZ: layout.control.min[1], maxZ: layout.control.max[1] },
    { id: 'bench', minX: -5.42, maxX: -4.88, minZ: -0.4, maxZ: 1.5 },
    { id: 'table', minX: 2.6, maxX: 3.6, minZ: 2.7, maxZ: 3.7 },
  ];
  for (const path of layout.pathways) {
    for (let s = 0; s < path.points.length - 1; s++) {
      const a = path.points[s];
      const b = path.points[s + 1];
      for (let t = 0; t <= 8; t++) {
        const u = t / 8;
        const x = a[0] + (b[0] - a[0]) * u;
        const z = a[1] + (b[1] - a[1]) * u;
        for (const ob of obstacles) {
          if (path.except?.includes(ob.id)) continue;
          const d = rectDist(x, z, ob);
          assert.ok(d >= path.clearance, `${path.id} comes within ${d.toFixed(2)} of ${ob.id}`);
        }
      }
    }
  }
});

test('shell palette stays out of crushed black and textures stay small', () => {
  for (const [key, value] of Object.entries(layout.shell)) {
    if (typeof value !== 'string' || !value.startsWith('#')) continue;
    assert.ok(luminance(value) > 0.18, `${key} ${value}`);
  }
  const widths = [...source.matchAll(/canvas\((\d+),\s*(\d+)\)/g)];
  assert.ok(widths.length >= 4);
  for (const match of widths) {
    assert.ok(Number(match[1]) <= 256 && Number(match[2]) <= 256, match[0]);
  }
  assert.equal(/on air/i.test(source), false);
  assert.equal(/podcast|vocal booth|piano|guitar/i.test(source + JSON.stringify(layout.assets)), false);
});

test('door, mic, and shoe bakes have usable proportions', () => {
  const door = manifest.stage_door;
  assert.ok(door.size[1] > 2 && door.size[1] < 2.3);
  assert.ok(door.size[0] > 0.9 && door.size[0] < 1.3);
  assert.ok(door.size[2] < 0.7, 'door swing should not become a wall');
  const mic = manifest.shotgun_mic;
  assert.ok(mic.size[2] > 0.22 && mic.size[2] < 0.35);
  assert.ok(mic.max[2] > mic.max[1], 'grille is the +Z end');
  const shoe = manifest.foley_shoe;
  assert.ok(shoe.size[2] > shoe.size[0] * 2, 'shoe is longer than it is wide');
  assert.ok(shoe.min[1] >= -0.001);
  const basin = manifest.water_basin;
  assert.ok(basin.size[0] > basin.size[2] && basin.size[1] < 0.35);
});
