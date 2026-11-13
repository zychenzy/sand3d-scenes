import test from 'node:test';
import assert from 'node:assert/strict';
import {
  COURT,
  HALL,
  RACKET,
  cableY,
  expandedCourt,
  floorMarkings,
  lightLanes,
  postsFor,
  racketMetrics,
} from './court_spec.mjs';

test('BWF doubles court and net constants', () => {
  assert.equal(COURT.length, 13.4);
  assert.equal(COURT.doublesWidth, 6.1);
  assert.equal(COURT.singlesWidth, 5.18);
  assert.equal(COURT.line, 0.04);
  assert.equal(COURT.shortService, 1.98);
  assert.equal(COURT.doublesLongFromBack, 0.76);
  assert.equal(COURT.netPost, 1.55);
  assert.equal(COURT.netCenter, 1.524);
  assert.equal(COURT.netDepth, 0.76);
  assert.equal(COURT.tape, 0.075);
  assert.ok(Math.abs(Math.hypot(COURT.length, COURT.doublesWidth) - COURT.diagonal) < 0.001);
  assert.ok(COURT.mesh >= COURT.meshMin && COURT.mesh <= COURT.meshMax);
  assert.ok(Math.abs(COURT.doublesWidth - COURT.singlesWidth - 0.92) < 1e-9);
});

test('markings use the outside edge and leave the net unmarked', () => {
  const cx = 4.05;
  const rects = floorMarkings(cx);
  const byId = Object.fromEntries(rects.map((r) => [r.id, r]));
  const L = COURT.line;

  assert.equal(byId['base-s'].z1, HALL.halfLength);
  assert.equal(byId['base-n'].z0, -HALL.halfLength);
  assert.ok(Math.abs(byId['base-s'].z1 - byId['base-s'].z0 - L) < 1e-9);
  assert.equal(byId['dbl-e'].x1, cx + HALL.halfDoubles);
  assert.equal(byId['dbl-w'].x0, cx - HALL.halfDoubles);
  assert.equal(byId['sgl-e'].x1, cx + HALL.halfSingles);
  assert.ok(Math.abs(HALL.halfDoubles - HALL.halfSingles - 0.46) < 1e-9);

  assert.equal(byId['short-s'].z0, COURT.shortService);
  assert.equal(byId['short-n'].z1, -COURT.shortService);
  const longBack = HALL.halfLength - COURT.doublesLongFromBack;
  assert.equal(byId['long-s'].z1, longBack);
  assert.equal(byId['long-n'].z0, -longBack);
  assert.ok(Math.abs(byId['long-s'].z0 - (byId['short-s'].z1) - 3.88) < 1e-9);

  assert.ok(byId['cen-s'].z0 >= COURT.shortService + L - 1e-9);
  assert.ok(byId['cen-n'].z1 <= -(COURT.shortService + L) + 1e-9);
  assert.ok(Math.abs((byId['cen-s'].x0 + byId['cen-s'].x1) / 2 - cx) < 1e-9);

  for (const r of rects) {
    const thin = Math.min(r.x1 - r.x0, r.z1 - r.z0);
    assert.ok(Math.abs(thin - L) < 1e-9, r.id);
    const crossesNet = r.z0 < 0 && r.z1 > 0;
    if (r.id.startsWith('cen') || r.id.startsWith('short') || r.id.startsWith('long') || r.id.startsWith('base')) {
      assert.equal(crossesNet, false, r.id);
    }
  }
  assert.equal(byId['dbl-w'].z0 < 0 && byId['dbl-w'].z1 > 0, true);
  assert.equal(byId['sgl-e'].z0 < 0 && byId['sgl-e'].z1 > 0, true);
});

test('net cable sags from 1.55 m at the posts to 1.524 m at centre', () => {
  assert.equal(cableY(0), 1.55);
  assert.equal(cableY(1), 1.55);
  assert.ok(Math.abs(cableY(0.5) - 1.524) < 1e-12);
  assert.ok(cableY(0.25) > 1.524 && cableY(0.25) < 1.55);
});

test('posts stand on the doubles sideline and do not enter the court', () => {
  for (const cx of HALL.centersX) {
    for (const post of postsFor(cx)) {
      const inner = post.centerX - post.outward * (COURT.post / 2);
      assert.ok(Math.abs(inner - post.inner) < 1e-9);
      const intoCourt = post.outward > 0
        ? post.centerX - COURT.post / 2 < cx + HALL.halfDoubles - 1e-9
        : post.centerX + COURT.post / 2 > cx - HALL.halfDoubles + 1e-9;
      assert.equal(intoCourt, false, post.side);
    }
  }
});

test('racket stays inside the BWF overall limits', () => {
  const built = racketMetrics();
  assert.ok(built.length <= RACKET.limitLength);
  assert.ok(built.width <= RACKET.limitWidth + 1e-9);
  assert.ok(Math.abs(built.length - RACKET.length) < 1e-9);
  assert.ok(Math.abs(built.width - RACKET.width) < 1e-9);
});

test('hall keeps legal run-off, 9 m clear height, and lights off the courts', () => {
  assert.ok(HALL.sideClearance >= HALL.minSide);
  assert.ok(HALL.backClearance >= HALL.minBack);
  assert.ok(HALL.between >= HALL.minSide);
  assert.ok(HALL.clearHeight >= 9);
  assert.ok(Math.abs(HALL.centersX[1] - HALL.centersX[0] - (COURT.doublesWidth + HALL.between)) < 1e-9);
  assert.ok(Math.abs(HALL.galleryInnerX - (HALL.outerLeft - HALL.sideClearance)) < 1e-9);
  assert.ok(Math.abs(HALL.westWallX - (HALL.galleryInnerX - HALL.galleryWidth)) < 1e-9);
  assert.equal(HALL.northWallZ, -HALL.halfLength - HALL.backClearance);

  for (const x of lightLanes()) {
    for (const cx of HALL.centersX) {
      const court = expandedCourt(cx, 0, 0);
      assert.ok(x < court.x0 - HALL.lightClear + 1e-9 || x > court.x1 + HALL.lightClear - 1e-9, `lane ${x}`);
    }
  }
  for (const z of HALL.battenZs) {
    for (const tz of HALL.trussZs) assert.ok(Math.abs(z - tz) > HALL.battenLength / 2);
  }
});
