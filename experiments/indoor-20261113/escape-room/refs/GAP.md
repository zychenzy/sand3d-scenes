# Gaps

Refinement after the first review:

- The entry camera sits closer, and the floor is staggered oak boards plus a runner, so the foreground is the route instead of one beige plane.
- Beadboard, a round chair rail, and a brass picture rail break the plaster. Daylight from the window side throws a shadow across the wall.
- The three cabinets share one oak bank. The chart chest, wall shelves, and tide staff carry the same marks as the easel, so the clues are stored and measured, not only posted.
- The book-stand podium is gone. The compass sits on the clue table. A lathed bell sits on the plinth by the wheels.

Closed in this scene:

- One combination, four tellings: easel chart, keeper’s slate, jar tags, panel wheels. Cabinet doors use the same three colors.
- Study-desk kneehole turned toward the room. Both chairs face their desks. Lamp shade overhangs the sitter’s side. Easel canvas and slate face the room. Checked against rendered front and side views of each GLB before placement.
- A brass floor strip and entry rose mark a walk from the door to the panel, with a branch to the window desk. `tests/check_layout.py` keeps that polyline off the furniture footprints.
- Daylight window, teal beadboard, staggered oak boards, sea rug, runner, and a warm lamp pool so the room is readable in toon and in unlit.
- `wall_shelf` fitted to 0.78 m is a two-board bracket shelf, 0.68 m wide and 0.28 m deep. Two hang on the walls with canisters on the boards. A few-centimetre height fit is what made it collapse before.

Still open:

- No combination cabinet, dial, or telegraph GLB in the catalog. The bank, the wheels, the chests, the bollard, and the bell are shaped stand-ins (lathe, torus, cambered lid), not scanned hardware.
- `display_bookcase` and `museum_vitrine` were inspected and left out. The bookcase has no materials and reads as a blank slab. The vitrine reads as a solid brown box, not glass. Using either as a “cabinet” would look like an empty crate.
- The book stand was removed after the refinement pass. It stayed a dark column and sat in the aisle in front of the slate.
- The chalkboard bake is a brown board on a floor stand, and its face is local +X. A paper sheet carries the readable copy. It is not a black chalkboard.
- The thermos GLB includes a loose cap beside the bottle. On the window desk the cap can sit near the edge.
- The cash register is small and very dark. It reads at close range and as a silhouette in the wide shot.
- Contact shadows are painted discs. Unlit shading drops emissive glow, so the lamp and the indicator gems stay their base colors and do not bloom.
- The easel canvas is a flat gray plane. The cipher is a framed sheet just in front of it. The close shot reads the three numbers; a rim of the gray canvas can still show at a steep angle.
- The bar counter, the long dining table, and the metal café chair were inspected and left out. Height-fitting the bar makes it about 4 m long. The dining table is a 1.9 m lounge table. The chair is a black bistro seat and fights the oak.
- The brass key inside the open lantern cabinet is small. The open amber door is the readable signal.
- Dial clicks step a digit in the page, but the shipped screenshots are the solved state (4, 8, 2) and do not exercise the click.
- Flowerpots are empty meshes. The leaves are local spheres sitting in the rim.
- Monitor, coffee table, bar stool, and sofa were inspected and not used. The monitor’s screen faces −Z and reads as office equipment. The coffee table is about 1.8 m and pulls the room toward a lounge.
