# Weaving & sewing studio — spec

Metres. Toon hard (four steps, darkest stop lifted so daylight does not crush). Cutaway: back wall and left wall only, plus a timber post at the open back-right corner. Soft daylight from three back windows and the open front.

## Zones

1. **Weaving** — indigo rug under the windows. A four-shaft floor loom (warp, shafts, reed, treadles, cloth on the breast beam) with a piano bench in front. A smaller rigid-heddle loom on a stand, with a dining chair facing it. Cone creel beside the floor loom.
2. **Cutting** — trestle layout table at chair height (0.80 m), gridded mat, plaid cloth, pattern sheet, shears, ruler, weights. One dining chair on the near side, facing the top. Notions table (shared square table) and mug to the left. Scrap basket at the right front leg.
3. **Sewing** — two staggered tables, not a grid. Each has a domestic machine (needle to the sitter's left), a dining chair facing the needle, and a library lamp. Ironing board in the open right foreground. Floor spool rack with cones between the aisle and the sewing bay.

Storage is the left wall: horizontal bolt rack (one cloth unrolled), upright bolt bin, warping board, wall spool rack, two aprons. Folded stacks sit on a chest in the front-left. Sample wall hangs under the right window, with a bench in front of it.

## Palette

Architecture is plaster `#f3eadc`, wainscot `#7a5436`, maple tops `#e0c08a`. Cloth repeats indigo, woad, saffron, madder, rust, olive, teal, plum, blush, linen, charcoal. The floor loom cloth is the strongest indigo/saffron note.

## Cameras

- Default: front-right, target between the cutting table and the looms.
- `corner`: further right, across sewing toward the bolt rack.
- `close`: breast beam, reed, and hanging cloth of the floor loom.

## Checks

`tests/check_layout.py` asserts shared GLB paths exist, chairs face their zone, the weaver bench sits in front of the floor loom, and instances stay inside the room.
