# Prior indoor feedback

## Historical notes

These are the notes carried into this experiment. They are about earlier indoor scenes as a group. This file does not score those scenes and does not rebuild them.

- The rooms were too crude, too sparse, and too monotonous.
- Shading and rendering were too simple.
- The ask is more design and more specific construction, not a larger pile of props under the same shader.
- Check orientation, table/chair or workstation proportions, and walkways.
- Include an unlit shot so the geometry can be judged without the lighting.

## Fresh observations on this room

Checked against `shots/toon_default.png`, `shots/toon_corner.png`, `shots/toon_close.png`, and `shots/unlit_default.png` after the layout test (9/9).

- The cutting table is a cloth table: 3.2 × 1.5 m at 0.92 m, with a bolt, a sagging length of cloth, a green mat, and a pattern that says CUT 2 and GRAIN. The close shot is that surface, not a generic desktop.
- Sewing tables are 0.76 m. Chair target height is 0.86 m, which is the back, not the seat. Each chair's look direction (this mesh faces local −Z) points at its machine, needle on the sitter's left. The front of the chair sits about 0.38 m off the table edge.
- The east aisle between the cutting table and those chairs is about 1.35 m. `layout.json` paths for the east aisle, the north cross, the fitting approach, and the press lane do not enter the floor footprints at their clearance radii.
- Dress forms stand on the platform and face into the room (+Z). One is a pinned toile, one is a jacket with a collar and sleeve stumps. The silhouette is still a lathe, so the waist is a curve rather than a cage.
- Unlit uses `MeshBasicMaterial` on the same meshes. The unlit hero keeps the table, bolts, forms, and machines readable without the stepped shadow. Window light on the floor is the hard shadow of the mullions; it disappears in unlit, which is the point of that shot.
- Straight plank boards replaced an earlier herringbone. Under a 4-step ramp the herringbone turned into noise.
- A pair of unexplained posts in front of the windows read as pipes and were removed.
- The client chair's ladder back, seen from the south, still resembles a small ladder. A jacket now hangs on that back. The reused flowerpot still reads as a small bucket in the corner shot.
- HUD is hidden when `hud=0`. It is not in the four shots.
