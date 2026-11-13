# GAP — civic maple roller rink

## What was inspected

Every candidate below was loaded from the root catalog, scaled to a real height, and rendered in toon from the front and the back before it was kept or dropped. A red marker sat on local +Z.

| asset | kept | measured size at the chosen height | why |
| --- | --- | --- | --- |
| museum bench | yes | 0.42 × 0.46 × 1.51 m, long axis local Z | Backless X-leg bench. Lace-up pair along the rental wall, one spectator bench on the front concourse. Tinted `#e4cba6` so it is not the gallery yellow. |
| pendant | yes, three | 0.35 × 0.64 m teardrop | Woven shade. Only over the rental and the entry. Not the rink rig. |
| speaker, horizontal | yes, two | 0.86 × 0.36 × 0.25 m at height 0.36 | Broad face is the grille (local +Z). Port is a nub on +X. Aimed at the oval center. |
| speaker, stood on end | no | 0.23 × 0.55 × 0.16 m | Z-rotation makes the long axis the height and the cabinet collapses into a skinny column. |
| bar stool | yes, one | 0.48 × 0.64 m | Round, no favored face. Scaled down so the seat sits under the booth counter. |
| library lamp | yes, one | 0.32 × 0.36 m | Green banker's shade. One task light on the booth, not a row. |
| cash register | yes | 0.17 × 0.30 × 0.25 m | Small vintage register on the rental counter, keys toward the room. |
| flowerpot | yes | 0.34 × 0.28 m | Empty pot. A few procedural leaves sit in it. |
| mug | yes | 0.09 × 0.10 m | On the booth counter. |
| POS terminal | no | 0.26 × 0.20 × 0.65 m | Cafe wedge. Would reskin the counter. |
| wall shelf | no | 0.48 × 0.55 × 0.20 m | Cafe shelf. Cubbies are built for the skates instead. |
| simple chair | no | 0.48 × 0.85 × 0.50 m | Bistro chair. The stool is the one seat at the booth. |
| monitor | no | 0.66 × 0.38 × 0.11 m | Curved office display. |
| guitar amp | no | 0.66 × 0.48 × 0.36 m | Reads as a band corner. |

## Built here, because the catalog has no equivalent

The local bake programs do not include a quad skate, an oval floor, a rink rail, an entry gate, or a DJ booth. The `sand3d` Python baker is not installed in this environment, so these were not baked out to new GLBs. They are meshes in `rink.js`:

- Maple oval, burgundy border, lane line, center rings, four small counterclockwise chevrons.
- Three-rail safety fence, kickboard, and a swung-open skate gate on the rental side.
- Entry portal with an open leaf on the front concourse.
- Uneven rental cubbies and blocky quad skates (boot, plate, four wheels, toe stop).
- DJ booth, two-step staff stair, and a small mixer.
- Barrel vault, milk-glass globes, four amber/rose cans, one faceted mirror ball.

## Left unresolved

- No skaters, no recorded audio, and the lights do not chase.
- The speaker is a mesh cabinet, not a horn-loaded rink PA. From across the room it reads as a monitor; up close the port is on the end, not a cone in the grille.
- Skates are blocks with cylinders. They read at the close camera and do not read as scanned boots.
- The bench has no back, so "facing the oval" is the long axis and the sitting side, not a chair back.
- The mirror ball does not scatter colored light. A real disco ball would.
- The vault is one barrel with five ribs, not the steel truss in the Crystal Palace photo.
- Clerestory glass is an emissive panel, not a transmitted sky.
- One green banker's lamp is more library than rink. It is the only green object, and it stays on the booth.
