# GAP — calligraphy classroom

Closed in this scene:

- Two rows of three writing desks, 1.50 × 0.70 m, with a felt mat and a full kit (sheet, inkstone, weight, rest, brush). Elbow gaps between desks are about 0.62 m. The cross aisle, measured past the front-row chair backs, stays above 1.05 m.
- Chair local +Z is the seat front. Students use `rotationY = π` so that front points at the teacher on the −Z wall. The teacher chair uses `rotationY = 0` and faces the class.
- A low platform, a trestle demonstration table, a model-book stand, and hanging scrolls for 人, 永, and 天. The demonstration sheet is turned so the class reads 永 right-side up.
- Paper case, brush case, wall shelf, and a side table clear of the writing aisle.
- Toon is the default: four-step `gradientMap` on `MeshToonMaterial`, hard shadows, warm key plus lantern and desk-lamp pools. `U` and `?mode=unlit` swap every mesh to `MeshBasicMaterial`.

Still open:

- 人, 永, and 天 are canvas stroke paths, not a calligrapher’s hand and not a real brush-pressure outline. At close range 永 reads as a regular-script skeleton.
- Catalog desks were the wrong object (a 0.37 m study top, a metal school desk), so the writing desks, felt, inkstones, and brushes are procedural. Wood grain and felt weave are generated canvases.
- The paper and brush cases are glass display carcasses. Stacks and pots sit on the shelf line; they are not volumes inside a rebate.
- Jam jars and the straw holder stand in for ink bottles and a brush tube. They are tinted, not modeled as ceramic or bamboo.
- The library lamp is a closed shade. The pool on the demonstration sheet comes from a point light, not light through the shade.
- The book stand is a dark catalog prop. It reads more as a lectern mass than as an open model book.
- Dining chairs, not studio stools. Seat height stays near 0.42 m, but the ladder back is western.
- No people, no exterior past the lattice, and the front and right stay open on purpose. Large plaster walls stay mostly one toon band because their normals are flat.
