# Prior indoor feedback

Historical notes are the brief that came with this scene. No scores are invented for older rooms, and none of those rooms were rebuilt.

## What was already said

Earlier indoor scenes were too crude, too sparse, and too monotonous. Shading and rendering were too simple. The ask was to raise complexity and design, not to drop more objects under the same shader. Seat fronts have to face the thing the seat is for. Table and chair proportions and the walkways have to be checked. Unlit stills are for reading the form. HUD must not be baked into the stills.

## What the existing stills actually show

I looked at three committed stills. This is description, not a grade.

- `cafe/shots/toon_default.png` includes the HUD. The ceiling is one slab. Round tables and metal chairs repeat. One rug and a few cups carry the whole counter story. Surfaces are flat color in broad toon steps.
- `cowork/shots/toon_default.png` also includes the HUD. It is a grid of the same pedestal desk and monitor. The board is an empty rectangle. Walls are large single colors. The chairs read tall against the desks. The floor is mostly empty.
- `experiments/sprint-20261110/bookstore/shots/toon_default.png` is denser: beams, filled shelves, a window, rugs, and a counter. That is a bookshop. It is the density bar, not a plan to copy.

## What this room does with that

The program is specific: shared writing tables, felt, ink, a teaching sheet, and work hung to dry. Seats are on the room side of each table and face the teaching wall. The teacher sits on the platform and faces the class. The center runner, the gaps between rows, and the window aisle are reserved in `layout.json` and checked by the test. Shading is still hard toon, with a darker five-step ramp, one hard key, lantern and lamp emission, and ink drawn into the paper maps so a sheet is not a blank white card.

## After looking at this room’s stills

`shots/toon_default.png`, `toon_corner.png`, `toon_close.png`, and `unlit_default.png` were rendered with the HUD off and then opened.

- Student chairs show their backs to the camera and their seats toward the tables and the teaching wall. The teacher’s chair is on the platform at the demonstration table, turned toward the room.
- The close still shows felt, paper, a lying brush, an inkstone, a water dish, and a brush pot, with the chair back in the near corner. Seat and table heights sit in a normal writing relationship: the back rises above the top, the seat does not.
- The center runner and the gaps between rows stay open. The drying line is in the front-right, out of the center aisle. It is large in the default frame because the camera stands just outside that corner.
- Unlit drops the shadows and the toon steps. The same masses remain: tables, chair ladders, window mullions, lantern cylinders, bookcase uprights.
- The wall character and the couplets are bold strokes. They do not read as careful regular script. That limit is in `refs/GAP.md`.
- The right-hand bookcases are in the default frame and easy to miss in the corner frame, which is aimed at the windows and the platform.
