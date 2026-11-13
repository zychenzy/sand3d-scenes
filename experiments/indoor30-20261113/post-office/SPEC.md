# Cedar Lane post office — spec

Units are metres. Style is a 4-step nearest `MeshToonMaterial`. The darkest step is lifted off zero so shadow sides keep their colour. Shadows use a soft PCF map with a normal bias, so the hard toon bands do not sparkle. Unlit is `MeshBasicMaterial`, including when the page opens with `?mode=unlit`.

Palette: ivory plaster, oak wainscot, brass, a civic red band, ink-green box frames, cream tile in the lobby, olive linoleum in the workroom. No postal-service trademark.

## Zones

**Public lobby** (+Z, open cut). A roof deck and fascia close the cut; the soffit does not cast. Queue lane 1.22 m wide feeds three windows. A slat bench sits clear of the box bay and the queue. PO-box doors are 0.148 × 0.128, ten columns by five rows, with three parcel lockers at the end of the run. The floor parcel scale is a 0.52 × 0.44 platform, not a kitchen scale.

**Boundary.** Counter top at 1.05, base depth 0.62, top depth 0.76. Glass screens, pass slots, and a register at each window sit on the staff half of the top. Each register is a keypad deck and a tilted screen facing the clerk. A latched staff door closes the left end. A short return closes the right end. Brass strip and the floor colour change mark the line.

**Sorting hall** (−Z). Work stools face +Z, and the front of each seat stays behind the counter top. A low rail marks the back of the stool. Sixteen by six pigeonholes, cells 0.15 × 0.105 × 0.25, sit on the back wall above a sorting ledge and four flats bins. A canvas trolley and a wire trolley park off the clerk path (more than 1.15 m from each stool). The packing desk is the study-desk bake, long axis turned onto world X, with tape, a date stamp, and letters. It does not intersect the letter case.

## Assets

| kind | path | target height | axis |
| --- | --- | --- | --- |
| study_desk | library `630f6d76cbcd` | 0.76 | long on local Z, pedestal at +Z |
| library_lamp | library `06accd4e0351` | 0.42 | on the packing top |
| pendant_lamp | cafe `1b528c6ab04e` | 0.52 | hung under the soffit |
| flowerpot | cafe `4a270f247734` | 0.28 | one plant by the entry |

Stools, the lobby bench, and the three registers are original meshes. The roof deck, fascia, and the shallow soffit beams do not cast, so wall shadows stay soft.

## Cameras

Default stands under the roof, close enough that the boxes, queue, windows, and scale fill the frame, and still sees the letter case over the glass. Corner is on the staff side of the counter so the stool fronts and the register screens read. Detail is inside the hall, aimed at the pigeonholes, the canvas trolley, and the packing desk.
