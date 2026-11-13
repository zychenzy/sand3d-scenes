# Copperplate Atelier

Metres. Toon hard: uneven 4-step gradient (`24, 86, 158, 236`), nearest filter, one shadow-casting key from the open front plus a cool north-window fill. Practicals are warm over the bed and the inking slab, and a cool tube in the ferric hood. Unlit drops the lights and keeps emissive coils, bulbs, and the hood tube as flat color.

Cutaway room 12.0 × 9.2 × 3.22. Back wall is -Z, left wall is -X. Front is open. A right stub from the back wall to about z = -0.4 is the wet wall.

`rotationY` 0 looks toward +Z. Forward is `(sin(rotationY), cos(rotationY))`.

## Zones

- **Press** — bed footprint x [-1.20, 1.10], z [-1.51, -0.59], top 0.88. Bed is shifted east so it reads mid-travel. Star wheel radius 0.44 at (-0.05, 1.12, -0.46), on the room side of the south cheek. Felts, a plate, and a sheet sit east of the roller. Operator bay x [-0.82, 0.72], z [-0.10, 1.22] stays empty.
- **Inking slab** — 2.40 × 1.16, top 0.92, center (3.40, 2.20). Standing work. Glass field, cans, brayers, tarlatan, one plate. Stool on the south side faces the slab.
- **Paper table** — 2.20 × 1.10, top 0.78, center (-3.35, 2.45). Seated tearing and registration. Chairs on the west, north, and south face the top. East side stays open toward the press.
- **Flat files** — two steel cabinets on the left wall, 8-drawer and 6-drawer, one drawer open. Not a bookcase.
- **Soak sink** — left wall, between the files and the paper table. Pale water, a sheet in the tray.
- **Dirty wet** — hot plate (grounded plate), ferric hood with a vent duct, ink sink with solvent cans. Aprons and a pegboard on the stub.
- **Drying** — two wires under the north windows with six uneven sheets, plus a slot rack that is not fully loaded.

Aisles: paper-table east edge to press west end ≥ 1.0 m. Press east end to inking west edge ≥ 1.0 m. Press room side to inking north edge ≥ 1.3 m.

## Cameras

- default: (6.05, 3.42, 6.25) → (-0.15, 0.82, -0.55)
- corner: (-5.55, 3.15, 6.15) → (0.85, 0.90, -0.85)
- close: (1.25, 1.48, 1.42) → (-0.15, 1.02, -0.72)

## Acceptance

The press reads as a press in toon and in unlit. Tables are shop-sized. Seats face their tops. Clean points stay off the ink, hood, and ink sink. Dirty points stay off the paper table and the soak sink. No CDN requests. HUD hidden when `shot=1`.
