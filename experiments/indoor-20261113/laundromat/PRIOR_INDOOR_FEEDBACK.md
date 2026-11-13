# Prior indoor feedback

Historical notes carried into this scene, then what the new renders actually show. No scores are invented for older rooms, and those rooms are not rebuilt here.

## Historical notes

Earlier indoor scenes were described as too crude, too sparse, and too monotonous. Shading and rendering were too simple. The request was to raise the design, not to drop more objects under the same shader. Orientation, machine and table and seat proportions, and walkways had to be checked. Unlit frames were required so the geometry could be judged without the toon shading.

## What this room does with that

The plan is a laundry, not a cafe with machines swapped in. Work happens at 0.90 m standing tables. Seats are a waiting row of folding chairs (seat about 0.41 m) facing the washers, plus a 0.46 m backless bench. Chairs are not tucked under the tables. Aisles in `layout.json` are at least 1.05 m and the layout test samples them on a 0.25 m grid.

Shade is not one gradient on every mesh. Enamel and metal use three steps, walls and the floor use four, cloth uses five. The floor is a grout tile map. Signs are painted canvases. Lamps, cycle LEDs, and the ceiling underside carry emissive color so they survive the hard gradient. Shadows are hard (`PCFHardShadowMap`). Unlit is `MeshBasicMaterial`, so the form shot has no shadow and no toon bands.

## Fresh observations from the committed shots

Inspected after the last layout pass, served from the repo root, HUD hidden (`?shot=1`).

- `shots/toon_default.png` reads as one room: dryer bank and pod vendor on the left, washer bank and 巷洗 sign on the back wall, two fold tables, five chairs with their backs toward the camera, carts, the rules board, the bench, and the airer. Doors face the aisles. No HUD.
- `shots/toon_corner.png` shows the washer portholes in a row, hard shadows under the tables, and the ceiling lights as bright fixtures rather than a black lid.
- `shots/toon_close.png` shows the standing table, a lattice basket, folded stacks on the top and the lower shelf, and the red 暂停 / OUT OF ORDER tag on machine 04.
- `shots/unlit_default.png` is the same camera with flat color. Machine boxes, chair frames, cart wire, and the floor grid stay legible without shading.

Fixes made after the first capture: a pair of storefront piers was removed because it cut the establishing view in half; the ceiling underside was given an emissive lift after it crushed to black; the entry cart, airer, and bench were pulled into the frame; a floating OPEN board that blocked the washer row was removed (hours stay on the A-frame).

## Still thin

Washer and dryer cabinets are the same family of white round-door box, separated by signs and placement. Folded laundry is layered boxes. The airer is a short domestic rack. The change machine is in the scene and faces the room, but it sits just outside the default frame. Those limits are listed in `refs/GAP.md`.
