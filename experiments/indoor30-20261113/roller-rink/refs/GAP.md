# GAP — civic maple roller rink

## What was inspected

Every candidate below was loaded from the root catalog, scaled to a real height, and rendered in toon from the front and the back before it was kept or dropped. A red marker sat on local +Z.

| asset | kept | measured size at the chosen height | why |
| --- | --- | --- | --- |
| museum bench | no | 0.42 × 0.46 × 1.51 m, long axis local Z | Backless X-leg gallery bench. It read as leftover furniture at the rental counter, so the lace-up and spectator seats are procedural slat benches instead. |
| pendant | yes, three | 0.35 × 0.64 m teardrop | Woven shade. Only over the rental and the entry. Not the rink rig. |
| speaker, horizontal | yes, two | about 1.14 × 0.48 × 0.34 m at height 0.48 | Broad face is the grille (local +Z). Port is a nub on +X. Both sit on the booth counter, aimed at the oval. |
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
- Uneven rental cubbies and quad skates: high boot, plate, two-by-two wheels, toe stop. Still simple meshes, not scanned boots.
- Slat benches for lacing and one spectator bench. Square legs, three seat boards.
- DJ booth, two-step staff stair, cream back board, and a small mixer between the monitors.
- Back-wall panels and a civic name board reading MAPLE RINK. Empty frames only, no posters.
- Barrel vault, milk-glass globes, four amber/rose cans, one faceted mirror ball.

## Left unresolved

- No skaters, no recorded audio, and the lights do not chase.
- The speaker is a mesh cabinet, not a horn-loaded rink PA. From across the room it reads as a monitor; up close the port is on the end, not a cone in the grille.
- Skates are still stacked boxes and cylinders. The close camera can tell boot from wheel from toe stop; they are not scanned boots.
- The lace-up benches have no backs. They are rental seats, not chairs.
- The mirror ball does not scatter colored light. A real disco ball would.
- The vault is one barrel with five ribs, not the steel truss in the Crystal Palace photo.
- Clerestory glass is an emissive panel, not a transmitted sky.
- One green banker's lamp is more library than rink. It is the only green object, and it stays on the booth.
