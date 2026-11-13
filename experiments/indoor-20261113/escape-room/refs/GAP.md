# Gaps

Closed in this scene:

- One combination, four tellings: easel chart, keeper’s slate, jar tags, panel wheels. Cabinet doors use the same three colors.
- Study-desk kneehole turned toward the room. Both chairs face their desks. Lamp shade overhangs the sitter’s side. Easel canvas and slate face the room. Checked against rendered front and side views of each GLB before placement.
- A brass floor strip and entry rose mark a walk from the door to the panel, with a branch to the window desk. `tests/check_layout.py` keeps that polyline off the furniture footprints.
- Daylight window, teal wainscot, oak planks, sea rug, and a warm lamp pool so the room is readable in toon and in unlit.

Still open:

- No combination cabinet, dial, or telegraph GLB in the catalog. Those pieces are toon stand-ins.
- `display_bookcase` and `museum_vitrine` were inspected and left out. The bookcase has no materials and reads as a blank slab. The vitrine reads as a solid brown box, not glass. Using either as a “cabinet” would look like an empty crate.
- `wall_shelf` collapses to a few centimetres after the usual height fit (the node scale, not the raw accessor). It is not on the wall.
- The book stand is a dark column, not a slanted lectern. A card is mounted on the room face. It still reads as a podium more than a book rest.
- The chalkboard bake is a brown board on a floor stand, and its face is local +X. A paper sheet carries the readable copy. It is not a black chalkboard.
- The thermos GLB includes a loose cap beside the bottle. On the window desk the cap can sit near the edge.
- The cash register is small and very dark. It reads at close range and as a silhouette in the wide shot.
- Contact shadows are painted discs. Unlit shading drops emissive glow, so the lamp and the indicator gems stay their base colors and do not bloom.
- The easel canvas is a flat gray plane. The cipher is a framed sheet just in front of it. The close shot reads the three numbers; a rim of the gray canvas can still show at a steep angle.
- The entry lectern is a dark column. In the corner camera it sits close to the lens.
- The brass key inside the open lantern cabinet is small. The open amber door is the readable signal.
- Dial clicks step a digit in the page, but the shipped screenshots are the solved state (4, 8, 2) and do not exercise the click.
- Flowerpots are empty meshes. The leaves are local spheres sitting in the rim.
- Monitor, coffee table, bar stool, and sofa were inspected and not used. The monitor’s screen faces −Z and reads as office equipment. The coffee table is about 1.8 m and pulls the room toward a lounge.
