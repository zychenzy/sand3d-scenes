# GAP — bespoke tailor atelier

The catalog has chairs, a table, a stool, lamps, a bench, a bookcase, and a lectern. It does not have a suit, a dress form, a mirror, shears, a sewing head, or a cloth bunch. Those stay procedural.

Built in `atelier.js`:

- Fitting alcove: lowered ceiling, three-panel planar mirror, standing board, tape, curtain, coat hook, plaque.
- Raised platform, steps, height rod, basted jacket, finished suit, muslin toile.
- Standing cutting table, pattern shapes, shears, rule, weights, chalk, tracing wheel, button tray.
- One shaped sewing head (bed, pillar, arm, handwheel, spool), ham, sleeve board, iron.
- Suit rail, hangers, four jackets, trousers.
- Walnut cloth cabinets with horizontal bolts, and an open swatch book. The pale display-case GLB is still loaded and hidden.
- A walnut cutting stool at the left end of the table. The cafe bar-stool GLB is still loaded and hidden.
- Floor: repeating ~12 cm boards, butt joints, and a generated normal map.
- Front and right walls, so the corner camera and the mirror no longer open onto the clear color. Windows on the back, left, and right.

Still approximate:

- The mirror is a real planar reflection (one render target per panel, about 480×300, shadows reused from the main pass). It is not a cube map. The shop is enclosed, so the glass shows plaster, floor, and a window rather than the clear-color void. The reflected window pane is still the brightest patch in the left wing. The three panels do not reflect each other. From the default camera the reflection is the far wall, not the cutting table, because that camera sits between the table and the glass.
- Forms have no scanned body and no head. The neck ends in a brass cap. Sleeves are two tapered cylinders with a shoulder sphere and an elbow sphere. Lapels are extruded notches. Cloth does not drape or wrinkle. Across the room the lapel reads smaller than it does in the close shot.
- Basting is a short run of dashes. Shears are a pivot, two flat blades, and two bows, not a scanned tool.
- The sewing head is a toon construction, not a scanned machine. The needle is a bar.
- The cloth cabinets are open walnut shelves of flat bolts, not a closed tailor's press with sliding doors.
- The cutting stool is a turned walnut perch. The legs are cylinders with a slight splay, not a lathed spindle.
- Dining chairs are domestic oak. The alcove companion is a piano bench.
- Pattern pieces are flat shapes on a generated kraft grid, not cut card with real notches.
- The floor is a generated plank texture, not scanned oak. Contact discs stand in for ambient occlusion. One hard shadow map (the front-right key). Window panes are emissive cards.
- The FITTING plaque uses a canvas label, not a font file in the repo.
