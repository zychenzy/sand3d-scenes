# Bespoke tailor atelier — spec

Metres. Toon hard is the default: four steps, darkest stop at 0.22, hard shadows, no tone mapping. Unlit is `MeshBasicMaterial`. The shop is enclosed: back, left, front, and right walls, with windows on the back, left, and right. Room 11.6 × 8.4 × 3.32. The corner camera and the fitting mirror stay inside that shell.

## Zones

1. **Customer fitting alcove** (front left). Lowered dark-green ceiling, walnut dado toward the room, and a brass-framed three-panel mirror. Each panel is a planar reflection (its own render target, clipped to the glass), so the glass shows the room instead of a painted panel. A low walnut board marks where the customer stands. The companion bench sits to the side of that board and faces the glass. The order table and its chair are against the back wall, with a swatch fan on the table. A coat hangs on a hook. The oxblood curtain is tied back on the far jamb. The doorway is 1.6 m. A plaque reads FITTING.
2. **Tailor fitting platform**. Walnut dais, 0.18 m, two treads on the room side. Jacket bodies are lathed (hem, waist, chest) with shoulder caps, a two-bone sleeve, a collar, and notched lapels. The basted herringbone coat keeps a canvas front and white basting. The finished navy suit adds trousers with a knee and a cuff, and a flat shirt triangle. A muslin toile, lathed, carries blue balance lines and pins. A brass height rod marks 1.0 m and 1.5 m. None of these is a scanned body.
3. **Pattern cutting table**. Standing top at 0.90 m, 2.30 × 1.12. Kraft grid, jacket-front, sleeve, and trouser patterns, shears with blades and finger bows, a yard rule, weights, a chalk wedge, a pin cushion, a tracing wheel, a button tray, and a folded navy cloth. A walnut cutting stool, round seat and stretchers, sits at the left end, clear of the top. The catalog bar stool is still loaded and hidden; its silhouette was a cafe perch.
4. **Sewing bay**. Seated table at 0.73 m against the back right. One straight-stitch head, needle to the sitter's left, handwheel to the right. The dining chair faces the needle. Banker's lamp, ham, sleeve board, iron. Thread spools on the wall shelf to the right.
5. **Suit rail and cloth books**. Brass rail on the rear left wall with four different jackets and one pair of trousers, and a gap where a suit was taken to the platform. Two walnut cloth cabinets hold horizontal bolts. The catalog display cases are still loaded and hidden. An open swatch book sits on the lectern.

## Circulation

Runners, not a packed floor. Entry aisle on the right of the cutting table, a cross hall between the table and the platform steps, a spur into the alcove, a rail aisle between the jackets and the bookcases, and a sewing approach that stops in front of the chair. `tests/check_layout.py` keeps those centerlines 0.32 m clear of the furniture boxes.

## Facing

Dining-chair and piano-bench fronts are +Z at rotation 0 (back posts at −Z). The banker's lamp shade opens toward −Z at rotation 0, so the sewing lamp is rotated π to throw light toward the sitter. Bookcases open toward −Z locally and are rotated π so the shelves face the room. Those meshes are hidden. The visible walnut cabinets are built opening toward +Z at the same spots.

## Floor

Boards run front to back, about 12 cm wide and about 2.4 m between butt joints. The top face uses a canvas color map and a matching normal map so the seams catch the toon steps. The cut edge of the floor slab is solid maple, not a stretched copy of the plank map.

## Light

Cool window light from the back, the left clerestory, and the right wall. A warm key from the front right throws hard shadows across the table and platform. A low hemisphere keeps the toon steps visible. Warm pools sit on the cutting table, the platform, the alcove, the sewing needle, and the rail. Window panes and bulbs stay bright in unlit mode because that mode uses their emissive color.

## Cameras

- Default: inside the front of the room, framed so the cutting table, fitting alcove, and dress forms fill the view.
- `corner`: inside the room, into the fitting alcove, with the cutting stool and the near corner of the table in the foreground.
- `close`: the pattern table, shears included, platform and rail still in frame. Field of view stays 46 so this framing does not move.
