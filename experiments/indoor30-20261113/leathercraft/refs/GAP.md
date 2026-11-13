# GAP — leathercraft atelier

## Inspected

Existing GLBs in this repo are furniture: dining chair, low bar stool, bankers lamp, pendant, jam jar, wall shelf, flowerpot, mug. The wall-shelf bake reads as a blank vertical board in this room, so it is not placed. The bar stool is a black tulip cafe base, so it is not the clicker perch. Bounds were read from the glTF accessors (chair height 1 m, stool 0.54 m, lamp shade about 0.49 m before scaling). None of them is a clicker, a pony, a hide, or a bag.

Hugging Face `Sandflow/sand3d-objaverse` search (datasets server, November 2026):

- `handbag` returns four rows. Three are mislabeled (a lock, a mask, an electronics part). One is a leather bag: `objaverse-3486704343f64c83b88b72db6adbed0d`, "EMP (WISEL) LIZA 1H" by Cyformstudio, CC-BY-4.0, entry `handbag`, f-score 0.85. Its render is a near-black lofted body and two ring handles. No piping, saddle stitch, or hardware. It was not baked.
- `briefcase` is a drill-rig case, not a bag.
- `saddle` hits are a satellite, a toy button, and a grease gourd. No stitching pony and no hide.

sand3d's GLB export needs Python 3.11 or 3.13 because of `bpy`. This machine has 3.12 only, so the LIZA program was not re-exported. Bag silhouettes in the room follow that loft (soft body, ring handles) and add an edge and a stitch the bake did not have.

## Built procedurally

- Swing-arm clicker, cutting hide, dies, round knife, maul.
- Stitching pony with a saddle seat, four splayed legs, and jaws that pinch a small bag seam. Two needles and a linen thread sit in that seam. The pony is the seat. A four-leg wooden work stool stands at the clicker end.
- Edge-burnish bench: vise, strap with a light burnished edge, canvas wheel, finish bottles. Jam jars stand in for tokonole and dye.
- Four hides on a rail, scalloped and belled, with a lighter flesh edge.
- Hardware cabinet, two drawers open (rivets and rings). Labels are drawer plates, not wall signs.
- Hobo, tote, flap bag, wallets, coiled belt.

## Still approximate

- Tools are toon solids, not scanned knives. Stitching is a linen tube, not individual holes.
- One hard shadow map from the window key, 4096 on a tightened frustum. The ceiling is tucked into the walls and left out of the shadow map. Window muntins are drawn but do not cast, so the floor gets one opening shadow instead of a stair of offset casters. Bias stays small. There is no screen-space AO.
- The toon ramp's darkest step is 0.28 so the shadow side stays a color.
- Window and niche backs are emissive cards. Unlit shows those colors and ignores the point lights, which is the flat check.
- The dining chair is a chair, not a saddle stool. The work stool is a 0.63 m perch beside the clicker, not a seat at a 0.92 m bench.
- Floor planks are a generated canvas, about 0.14 m wide (`floorRepeat` 4 by 8 over an 8-plank tile). Leather grain is a 128² tile repeated several times per hide.
