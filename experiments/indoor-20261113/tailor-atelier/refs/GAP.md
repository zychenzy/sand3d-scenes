# GAP — bespoke tailor atelier

The catalog has chairs, a table, a stool, lamps, a bench, a bookcase, and a lectern. It does not have a suit, a dress form, a mirror, shears, a sewing head, or a cloth bunch. Those stay procedural.

Built in `atelier.js`:

- Fitting alcove: lowered ceiling, three-panel planar mirror, standing board, tape, curtain, coat hook, plaque.
- Raised platform, steps, height rod, basted jacket, finished suit, muslin toile.
- Standing cutting table, pattern shapes, shears, rule, weights, chalk, tracing wheel, button tray.
- One shaped sewing head (bed, pillar, arm, handwheel, spool), ham, sleeve board, iron.
- Suit rail, hangers, four jackets, trousers.
- Cloth-book spines and an open swatch book. The pale display-case GLB is the shelf; the books are new.
- Floor: repeating ~12 cm boards, butt joints, and a generated normal map.

Still approximate:

- The mirror is a real planar reflection (one render target per panel, about 480×300, shadows reused from the main pass). It is not a cube map. Because the room is a cutaway, the glass also reflects the open sky color. The three panels do not reflect each other. From the corner camera the center panel is the one that reads; the wings are partly oblique.
- Forms have no scanned body and no head. The neck ends in a brass cap. Sleeves are two tapered cylinders with a shoulder sphere and an elbow sphere. Lapels are extruded notches. Cloth does not drape or wrinkle. Across the room the lapel reads smaller than it does in the close shot.
- Basting is a short run of dashes. Shears are a pivot, two flat blades, and two bows, not a scanned tool.
- The sewing head is a toon construction, not a scanned machine. The needle is a bar.
- The reused bookcase is a light museum case, so the cloth library reads paler than a walnut cabinet.
- The cutting perch is the cafe bar stool: round, light, and more modern than a tailor's walnut stool.
- Dining chairs are domestic oak. The alcove companion is a piano bench.
- Pattern pieces are flat shapes on a generated kraft grid, not cut card with real notches.
- The floor is a generated plank texture, not scanned oak. Contact discs stand in for ambient occlusion. One hard shadow map (the front-right key). Window panes are emissive cards.
- The FITTING plaque uses a canvas label, not a font file in the repo.
