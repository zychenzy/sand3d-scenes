# Jazz club — brief

A small club, not a concert hall and not the rehearsal room. The stage is the focal point. The bar is the second zone. Circulation is the runner from the open front to the steps.

## Plan

- Room 10.6 × 8.6 × 3.28 m. Cutaway drops the front (+Z) and the right (+X). A cheek wall closes stage-right.
- Stage deck 0.36 m, about 5.2 × 1.9 m, against the draped back wall. Steps on the audience-right of the lip.
- Band, all on the deck: parlor grand (keyboard toward stage-right), piano bench facing the keys, double bass, four-piece-ish jazz kit, saxophone on a stand, vocal mic.
- Four brass round tables, irregular, each with chairs whose fronts point at the table. The seat on the audience side also faces the stage. No chair sits with its back to the stage between a table and the deck.
- Bar along the left wall, stools on the room side facing the bar. Bottle shelves and a mirror above the counter. The cafe bar GLB is not used (see GAP).
- Drapes: back wall, stage-left wall, tormentors, valance, cheek. Pendants over tables and the bar. Three stage cans.

## Facing

Dining-chair and piano-bench sand3d programs put the front at +Z. `rotationY = 0` looks toward +Z. `rotationY = π` looks toward the stage (−Z). `rotationY = −π/2` looks toward the bar (−X).

## Acceptance

- Default, corner, close, and unlit frames read as a club: instruments on a stage, tables in front, bar at the side, drapes, warm practicals.
- `node --test tests/layout.test.mjs` passes.
- No remote assets. Shared GLBs are symlinks.
