# GAP — calligraphy classroom

Closed in this scene:

- Two rows of three writing desks, 1.50 × 0.70 m, with a felt mat and a full kit (sheet, inkstone, weight, rest, brush). Elbow gaps between desks are about 0.62 m. The cross aisle, measured past the front-row chair backs, stays above 1.05 m.
- Chair local +Z is the seat front. Students use `rotationY = π` so that front points at the teacher on the −Z wall. The teacher chair uses `rotationY = 0` and faces the class.
- A low platform, a trestle demonstration table, a model-book stand, and hanging scrolls for 人, 永, and 天. The demonstration sheet is turned so the class reads 永 right-side up.
- Paper case, brush case, wall shelf, and a side table clear of the writing aisle.
- Toon is the default: four-step `gradientMap` on `MeshToonMaterial`, hard shadows, warm key plus lantern and desk-lamp pools. `U` and `?mode=unlit` swap every mesh to `MeshBasicMaterial`.
- 人, 永, and 天 are regular-script skeletons: one bar under a dot for 永, a stem that continues into a left hook, and a 捺 that ends in a chisel foot. The demonstration sheet is clear of the brushes, inkstone, and weight.
- Seats are single-plank wood chairs. The desk lamp is a small paper shade on a wood stem. The platform holds an open model book on a copy stand.
- Upper walls carry posts and a plate under the beams. Floor boards run the length of the room in one wood tone, with a quiet grain.

Still open:

- The characters are filled polygons, not a calligrapher’s brush. The dot is still a little faceted, and the hook is small on the far wall in the establishing view.
- Catalog desks were the wrong object, so the writing desks, felt, inkstones, and brushes are procedural. The inkstone well is a dark disc in a slab, not a carved Duan stone.
- The paper and brush cases are glass display carcasses. Stacks sit on the shelf line.
- Jam jars and the straw holder stand in for ink bottles and a brush tube.
- The lamp pool is a point light beside the shade.
- Seats have one back plank so the front stays readable. They are not round studio stools.
- No people, and the front and right stay open. Plaster between the posts is still one toon band.
