# GAP — jazz club

## Closed in this scene

- Parlor grand, double bass, jazz kit, saxophone and vocal mic are procedural. The cached scene set has no those bodies (the music room already notes piano and guitar meshes missing from cached parquet).
- The cafe `bar_counter` bake is a 0.40 m cabinet, about 1.8 × 0.89 m in plan. Raising it to standing height with a uniform scale makes a counter over 2 m deep. The bar here is authored cabinetry (paneled front, brass rail, backbar, bottles) plus the HF bar stools.
- Pendant bulbs and the candle flames are emissive. The local `scene_lib.js` copies emissive through Toon and Unlit. Unlit shows the emissive color so the practicals still read.
- Contact is a hard shadow map from the key light plus dark discs under furniture. The vendored Three build has no SSAO pass. Floor light discs mark the pendant pools in unlit mode as well.
- Dining-chair front axis was taken from the sand3d node tree: back posts at −Z, front legs at +Z.

## Still open

- Instruments are toon primitives, not HF meshes. The saxophone is a chain of tubes with a flared bell, readable at club scale and still not a scanned horn.
- No upholstered club chair in the shared bakes, so the audience sits on the oak dining chair.
- The round-table bake is titled as a marble side table; its material is gold metal. It reads as brass, which fits, but it is not a tablecloth bistro table.
- One flowerpot is a tinted grey vessel with procedural leaves, not a real plant mesh.
- Stage-can aiming is approximate. Spot shadows are on two of the three cans so the kit does not pay for a fourth shadow map beyond the key.
