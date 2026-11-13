# Gaps

This environment has no Blender, no `bpy`, and no `sand3d` module, so nothing new was baked. The catalog tables that do exist are the wrong object: `long_dining` is a 1.80 × 0.94 m splay-leg dining table. Stretching it into a writing bench would throw the legs. The writing slabs, felt, brushes, inkstones, and paper are procedural for that reason.

- Brushes, inkstones, water dishes, seals, and brush pots are simple primitives. They read at table distance. They are not carved stones or haired brushes.
- Ink on the sheets is a constructed stroke ribbon (永, 山, 水, and partial copies). It is not a scanned hand or a typeface. The teaching sheet numbers the eight parts of 永; the side scrolls are single characters, not a literary couplet.
- The chair is a Western high-back dining chair. Its seat was measured (0.4165 of the grounded height) and the table was set to match. It is not a Chinese stool or a low writing chair.
- Bookcases are empty display-case meshes. Slipcases, the paper roll, and the flat stacks are boxes placed on the shelf heights. If a shelf plane is a few centimetres off the guess, a stack can sit slightly proud.
- The desk lamp is a library banker lamp with the green shade recolored. The bench is a museum bench. The flowerpot is the cafe pot.
- The drying sheets and the screen are planes. Clips are small boxes.
- Contact marks under the chairs are unlit discs, not an ambient-occlusion bake.
- No people. The cleared mat and the pulled chair are the only signs that someone stood up.
- Unlit mode is MeshBasicMaterial. Maps stay so the ink is still visible; lighting and the hard shadow are gone on purpose.
