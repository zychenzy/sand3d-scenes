# GAP — Court 2 practice hall

Inspected the baked catalog (root scene GLBs, world bounds). Nothing in it is a hoop, backboard, basketball, or ball cart. Those are procedural, at FIBA sizes: rim inside diameter 0.45 m at 3.05 m, backboard 1.80 × 1.05 m, ball diameter 0.24 m. `sand3d` is not installed here, so no new program was baked. Selected existing bakes are referenced, not copied.

Closed in this scene:

- 28 × 15 m court, 5 cm lines, painted keys, free-throw circles (solid outside the lane, dashed inside), 6.75 m arcs, no-charge semi-circles, centre circle, throw-in ticks, bench-area ticks.
- Two wall-mounted goals. Level 2 allows that. The 2 m runoff has no pole in it. Backboard padding and a 1.2 m sleeve on the arm are solid colour, not a regulation profile.
- Home and away benches (7.2 m, about 16 seats) face the court from outside the runoff. Scorer’s table, thermos, and mugs sit between them. Ball cart is in the sideline walkway.
- Storage wall: two bookcases, two wall shelves, chalkboard with a horns diagram, plan desk, tie-up benches, cones. The flowerpot bake is empty; a plant is built on top.

Still open:

- Rebound-place blocks along the lane are not marked. The diagram in the rules was not redrawn mark-for-mark.
- The basket centre is 1.576 m from the endline (1.200 + 0.151 + 0.225). The rules text rounds that point to 1.575 m.
- Glass is an opaque pale panel. It does not transmit or reflect. Nets are cords, not a woven mesh. There is no shot clock and no pressure-release ring.
- The floor does not take the key-light shadow. A shadow map across 32 m was breaking into acne. Contact blobs sit under the benches, table, cart, chairs, and cases. Trusses do not cast.
- No players. The scoreboard is a still 0–0 / 8:00 panel.
- Team benches are built geometry. The museum bench is the tie-up seat, because that bake is 1.5 m and backless, too short for a 16-seat team bench.
