import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  SHEET, STONE, LOUNGE, HALL, frame, lineRects, hacks, racks, rackSlots, playedStones, brushes,
} from '../sheet_spec.mjs';

const dir = path.dirname(fileURLToPath(import.meta.url));
const sceneDir = path.resolve(dir, '..');
const repo = path.resolve(sceneDir, '..', '..', '..');
const layout = JSON.parse(fs.readFileSync(path.join(sceneDir, 'layout.json'), 'utf8'));

const BAKES = {
  museum_bench: { x: 418, y: 380, z: 1500 },
  sofa_solid: { x: 2156, y: 1115, z: 1326 },
  round_table: { x: 448, y: 312, z: 448 },
  dining_chair: { x: 361.5, y: 1000, z: 510.1 },
  cup_mug: { x: 75.15, y: 76, z: 75.175 },
  flowerpot: { x: 250, y: 204.2, z: 250 },
  thermos: { x: 85, y: 300, z: 85 },
  pendant_lamp: { x: 246.267, y: 212, z: 246.267 },
};

function aabb(inst) {
  const [fw, fd] = inst.footprint;
  const swap = Math.abs(Math.sin(inst.rotationY || 0)) > 0.5;
  const sx = swap ? fd : fw;
  const sz = swap ? fw : fd;
  const [x, y, z] = inst.position;
  return { x0: x - sx / 2, x1: x + sx / 2, z0: z - sz / 2, z1: z + sz / 2, y };
}

test('WCF sheet is long, not a court reskin', () => {
  assert.equal(SHEET.length, 45.720);
  assert.equal(SHEET.width, 4.750);
  assert.ok(SHEET.length / SHEET.width > 8);
  assert.equal(SHEET.teeFromCentre, 17.375);
  assert.equal(SHEET.backFromTee, 1.829);
  assert.equal(SHEET.hogFromTee, 6.401);
  assert.equal(SHEET.hogWidth, 0.102);
  assert.ok(SHEET.lineWidth <= 0.013);
  assert.equal(SHEET.centreBeyondTee, 3.658);
  assert.deepEqual(SHEET.houseRadii, [1.829, 1.219, 0.610, 0.152]);
  const room = layout.meta.room;
  assert.equal(layout.meta.units, 'metres');
  assert.ok(room.depth / room.width > 4);
  assert.ok(room.depth > SHEET.length);
  assert.ok(room.height >= 4.5 && room.height <= 6.5);
});

test('lines, hacks, and houses sit on the sheet', () => {
  const f = frame();
  assert.ok(Math.abs(f.halfL - 22.860) < 1e-9);
  assert.ok(Math.abs(f.hogInside - (17.375 - 6.401)) < 1e-9);
  assert.ok(Math.abs(f.backOutside - (17.375 + 1.829)) < 1e-9);
  assert.ok(Math.abs(f.centreEnd - (17.375 + 3.658)) < 1e-9);
  assert.ok(f.centreEnd < f.halfL);
  assert.ok(f.backOutside < f.halfL);

  const hog = lineRects().filter((r) => r.hog);
  assert.equal(hog.length, 2);
  for (const rect of hog) {
    assert.ok(Math.abs((rect.z1 - rect.z0) - 0.102) < 1e-9);
    const inside = Math.abs(rect.z0) > Math.abs(rect.z1) ? rect.z0 : rect.z1;
    assert.ok(Math.abs(Math.abs(inside) - f.hogInside) < 1e-6);
  }
  const courtesy = lineRects().filter((r) => r.id.startsWith('courtesy'));
  assert.equal(courtesy.length, 4);
  for (const rect of courtesy) {
    assert.ok(Math.abs((rect.x1 - rect.x0) - 0.152) < 1e-9);
    const z = (rect.z0 + rect.z1) / 2;
    const sign = z > 0 ? 1 : -1;
    assert.ok(Math.abs(Math.abs(z) - (f.hogInside + 1.219)) < 1e-6);
    assert.ok(Math.abs(z) > f.hogInside);
    assert.equal(Math.sign(z), sign);
  }
  for (const rect of lineRects()) {
    assert.ok(rect.x0 >= -f.halfW - 1e-9 && rect.x1 <= f.halfW + 1e-9, rect.id);
    assert.ok(rect.z0 >= -f.halfL - 1e-9 && rect.z1 <= f.halfL + 1e-9, rect.id);
    assert.ok(rect.x1 > rect.x0 && rect.z1 > rect.z0, rect.id);
  }

  const hs = hacks();
  assert.equal(hs.length, 4);
  for (const h of hs) {
    assert.ok(Math.abs((h.x1 - h.x0) - 0.152) < 1e-9);
    const depth = h.z1 - h.z0;
    assert.ok(depth <= 0.203 + 1e-9);
    assert.ok(depth > 0.1);
    const inside = Math.min(Math.abs(h.x0), Math.abs(h.x1));
    assert.ok(Math.abs(inside - 0.076) < 1e-9);
    const back = Math.max(Math.abs(h.z0), Math.abs(h.z1));
    const front = Math.min(Math.abs(h.z0), Math.abs(h.z1));
    assert.ok(Math.abs(back - f.centreEnd) < 1e-6);
    assert.ok(f.centreEnd - front <= 0.203 + 1e-9);
  }
});

test('stones stay legal and the set is one sheet, not two', () => {
  assert.ok(STONE.diameter * Math.PI <= STONE.maxCircumference);
  assert.ok(STONE.height >= STONE.minHeight);
  assert.ok(STONE.diameter < 0.30 && STONE.diameter > 0.25);

  const slots = racks().flatMap(rackSlots);
  const played = playedStones();
  assert.equal(slots.length + played.length, 16);
  const red = [...slots, ...played].filter((s) => s.color === 'red');
  const yel = [...slots, ...played].filter((s) => s.color === 'yellow');
  assert.equal(red.length, 8);
  assert.equal(yel.length, 8);

  const f = frame();
  for (const slot of slots) {
    assert.ok(Math.abs(slot.x) + STONE.diameter / 2 < f.halfW);
    assert.ok(Math.abs(slot.z) > f.backOutside, 'rack stone must be behind the back line');
    assert.ok(Math.abs(slot.z) + STONE.diameter / 2 < f.halfL);
  }
  const tee = f.tee;
  const houseOuter = tee - 1.829;
  const hog = f.hogInside;
  const inHouse = played.find((s) => s.id === 'red_7');
  const eight = played.find((s) => s.id === 'yellow_8');
  const guard = played.find((s) => s.id === 'red_8');
  const dist = (s) => Math.hypot(s.x, s.z - tee);
  assert.ok(dist(inHouse) > 0.152 && dist(inHouse) < 0.610);
  assert.ok(dist(eight) > 0.610 && dist(eight) < 1.219);
  assert.ok(guard.z > hog && guard.z < houseOuter);

  const near = racks().filter((r) => r.z > 0);
  const left = near.find((r) => r.x < 0);
  const right = near.find((r) => r.x > 0);
  const corridor = (right.x - right.spanX / 2) - (left.x + left.spanX / 2);
  assert.ok(corridor >= 0.9, `end corridor ${corridor}`);
  const rackFront = near[0].z - near[0].spanZ / 2;
  assert.ok(rackFront - f.centreEnd >= 0.4);
  assert.ok(f.halfL - (near[0].z + near[0].spanZ / 2) >= 0.45);
});

test('brushes and lounge circulation stay off the playing ice', () => {
  const f = frame();
  for (const brush of brushes()) {
    assert.ok(Math.abs(brush.x) > f.halfW + 0.15, brush.z);
  }
  assert.ok(LOUNGE.doorZ1 - LOUNGE.doorZ0 >= 0.9);
  assert.ok(LOUNGE.aisle >= 0.75);
  assert.ok(LOUNGE.floorX0 > f.halfW);
  assert.ok(LOUNGE.floorY > 0.1);

  const floorItems = layout.instances.filter((i) => i.position[1] < 0.5);
  for (const inst of floorItems) {
    const box = aabb(inst);
    assert.ok(box.x0 >= LOUNGE.floorX0 + LOUNGE.aisle - 0.02, `${inst.id} blocks the glass aisle`);
    assert.ok(box.x1 <= LOUNGE.floorX1 + 0.02, inst.id);
    assert.ok(box.z0 >= LOUNGE.floorZ0 - 0.02 && box.z1 <= LOUNGE.floorZ1 + 0.02, inst.id);
    assert.ok(box.x0 > f.halfW, `${inst.id} on the ice`);
    const inDoor = box.z1 > LOUNGE.doorZ0 && box.z0 < LOUNGE.doorZ1 && box.x0 < LOUNGE.floorX0 + 1.2;
    assert.equal(inDoor, false, `${inst.id} stands in the door`);
  }

  const mugs = layout.instances.filter((i) => i.kind === 'cup_mug');
  const table = layout.instances.find((i) => i.id === 'table');
  assert.equal(mugs.length, 2);
  for (const mug of mugs) {
    assert.ok(Math.abs(mug.position[1] - (LOUNGE.floorY + layout.assets.round_table.targetHeight)) < 0.02);
    const d = Math.hypot(mug.position[0] - table.position[0], mug.position[2] - table.position[2]);
    assert.ok(d < table.footprint[0] / 2 - 0.05);
  }
});

test('signage stays small and cameras cover length, lounge, and house', () => {
  for (const sign of [layout.signage.near, layout.signage.far]) {
    assert.ok(sign.w <= 1.6 && sign.h <= 0.55);
    assert.ok(sign.w * sign.h <= 0.85);
  }
  assert.ok(layout.signage.plate.w <= 0.25 && layout.signage.plate.h <= 0.25);
  const tee = frame().tee;
  const near = layout.signage.near;
  assert.ok(Math.abs(near.z - tee) > 1.829);
  assert.ok(near.y > 1.8);

  const cam = layout.camera;
  assert.ok(cam.position[2] < HALL.z1 - 0.8, 'default camera stands inside the near wall');
  assert.ok(cam.position[2] > frame().halfL + 0.8, 'default camera stays at the home end');
  assert.ok(cam.position[0] < 0);
  assert.ok(cam.position[0] > HALL.x0 + 0.4, 'default camera stands inside the side wall');
  assert.ok(cam.position[1] < HALL.roofY - 0.6);
  assert.ok(cam.target[2] < cam.position[2] - 10);
  const corner = layout.cameraPresets.corner;
  assert.ok(corner.position[0] > LOUNGE.floorX0);
  assert.ok(corner.position[0] < LOUNGE.floorX1);
  assert.ok(corner.position[2] > LOUNGE.floorZ0 && corner.position[2] < LOUNGE.floorZ1);
  assert.ok(corner.position[1] < LOUNGE.soffitY);
  const detail = layout.cameraPresets.detail;
  assert.ok(Math.abs(detail.target[2] - tee) < 2.5);
  assert.ok(detail.position[2] < HALL.z1 - 0.8);
  assert.ok(detail.position[0] > HALL.x0 + 0.35);
  assert.ok(detail.position[1] < HALL.roofY - 0.5);
  assert.equal(layout.cameraPresets.close, undefined);
  assert.ok(HALL.z1 > frame().halfL + 2.4, 'home end wall sits behind the cameras');
  assert.ok(HALL.z0 < -frame().halfL - 0.4);
});

test('shared GLBs and vendor are repo-root references', () => {
  assert.equal(fs.existsSync(path.join(sceneDir, 'vendor')), false);
  assert.equal(fs.existsSync(path.join(sceneDir, 'assets')), false);
  const three = path.resolve(sceneDir, '../../../gym/vendor/three.module.js');
  assert.ok(fs.existsSync(three));
  assert.ok(three.startsWith(repo + path.sep));
  const html = fs.readFileSync(path.join(sceneDir, 'index.html'), 'utf8');
  assert.ok(html.includes('../../../gym/vendor/three.module.js'));
  const lib = fs.readFileSync(path.join(sceneDir, 'scene_lib.js'), 'utf8');
  assert.ok(lib.includes('MeshBasicMaterial'));
  assert.ok(lib.includes('MeshToonMaterial'));
  assert.ok(lib.includes('PCFHardShadowMap'));
  assert.ok(lib.includes('NearestFilter'));

  const ids = layout.instances.map((i) => i.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const inst of layout.instances) {
    const spec = layout.assets[inst.kind];
    assert.ok(spec, inst.kind);
    const glb = path.resolve(sceneDir, spec.glb);
    assert.ok(fs.existsSync(glb), spec.glb);
    const real = fs.realpathSync(glb);
    assert.ok(real.startsWith(repo + path.sep));
    assert.ok(!real.startsWith(sceneDir + path.sep));
    const bake = BAKES[inst.kind];
    const s = spec.targetHeight / bake.y;
    const fp = [bake.x * s, bake.z * s];
    assert.ok(Math.abs(fp[0] - inst.footprint[0]) < 0.01, inst.id);
    assert.ok(Math.abs(fp[1] - inst.footprint[1]) < 0.01, inst.id);
  }
  const refs = fs.readdirSync(path.join(sceneDir, 'refs'));
  for (const name of refs) {
    assert.ok(!/\.(png|jpe?g|webp)$/i.test(name), name);
  }
});
