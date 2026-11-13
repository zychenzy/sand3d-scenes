# Gaps

Candidate GLBs were measured in world space from the baked files. Official `candidates/` renders are not in git. `sand3d` is not installed here, so missing specialist meshes were not baked into new GLBs. They are extruded outlines in `luthier.js`.

## Used, with measured size

- Dining chair, 0.4 × 1.0 × 0.5 m. Back is −Z, front faces +Z. Task, luthier, and customer chairs.
- Banker's lamp, 0.3 × 0.5 × 0.3 m. Shade sits on −Z, so the instances use rotation π and a height of 0.40 m on the bench.
- Pendant, 0.25 × 0.45 × 0.25 m. Near-black cord and cap are lifted to dark walnut in this scene only. A procedural cord finishes the run to the beam.
- Wall shelf, 0.7 × 0.8 × 0.3 m. Lower board at 0.17 m and upper board at 0.65 m above the group's feet. Jars use those heights.
- Jam jar, about 0.12 m tall, garnet glass and a gold lid. Used as varnish pots at 0.12 m, with paper labels. Not scaled into buckets.
- Display bookcase, 0.83 × 2.0 × 0.41 m, no materials. Tinted walnut and filled with neck blanks. Open side is local −Z, so rotation π faces the room.
- Flowerpot and mug, small, one each. The pot is tinted terracotta.

## Rejected

- Guitar amp, Marshall, speakers, piano bench. Those read as a rehearsal room. The cached music scene already notes there is no guitar body in the baked set.
- Square dining table, 1.2 m. A dining top would make the handoff a dining room. The counter is procedural.
- Bar counter. Grey cafe bar, wrong trade.
- Cash register. Several paints are near black (`#080808`, `#191919`) and it reads as a cafe till.
- Book stand. Dark podium, and its bounds sit far from the origin. Same rejection as the jeweler salon.
- Museum plinth. 1.8 m column, gallery scale.
- Museum vitrine. The bake is a walnut pedestal, not a glass case.
- Museum bench. Gallery bench, not a repair chair.
- POS terminal and tray. Cafe props.

## Still open

- Violin and guitar outlines are splines, not scanned plates. Scrolls are torus arcs. F-holes are flat cutouts. They read at room scale and are deliberately larger in line weight than a real 1 mm purfling.
- Spool clamps, cradles, inside molds, the bending iron, and shavings have no catalog mesh.
- Contact discs stand in for AO. The toon ramp stays four hard steps. The shadow map is PCF soft, and the window frame does not cast, so the mullions do not stamp black bars.
- Floor boards are one spruce tone. Seams are hairlines, because unlit shows the albedo directly and a two-tone step was reading as a zebra field.
- The open violin is still a spline rib, maple blocks, a back plate, a torus scroll, and a loose top with f-hole stand-ins. It is not a scanned body. The cradle lining is a row of cork-colored arcs.
- Jar glass stays the baked garnet. Separate amber glass would need a new material on the shared file, which this folder does not edit.
- The neck cabinet tint flattens every bookcase material to one walnut, because the bake shipped without materials.
