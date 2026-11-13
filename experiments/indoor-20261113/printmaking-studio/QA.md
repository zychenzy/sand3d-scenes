# QA

Checked 13 Nov 2026 on this branch, from the repository root.

## Layout

`node --test experiments/indoor-20261113/printmaking-studio/tests/layout.test.mjs`

7 passed, 0 failed.

- Every GLB path starts with `../../../` and resolves. This folder has no `assets/` and no `vendor/`.
- `index.html` imports `print.js` and `workshop/vendor/three.module.js`. No `http` URL.
- Stations present: press footprint, inking table, paper table, two drying racks, flat files, wash, ferric cart, plate rack, homasote stack, edition board. No easel.
- Floor footprints stay inside the 12.4 × 9.4 room and do not overlap.
- Crank stance (in front of the wheel) and the front entry aisle are empty.
- Chair and stool face their tables (dot > 0.85) and stand on the near side. Bookcase rotation is π (back panel is local +Z). Edition board is −π/2. Banker’s lamp is π.
- Press-to-slab aisle is at least 0.9 m. Wash is more than 3.5 m from the paper table along Z and more than 4 m from the flat files, so solvent stays off the paper path.
- Lamp and ink jars sit on the slab top (0.881–0.94 m), not the floor. Thermos and coffee mug sit on the paper table.

## Render

`node experiments/indoor-20261113/printmaking-studio/tests/render.mjs`

Headless Chrome, 1440×900, SwiftShader, cache disabled. Four shots, no console errors, no failed network responses, no uncaught exceptions.

| shot | mode | meshes | toon | basic |
| --- | --- | --- | --- | --- |
| `shots/toon_default.png` | TOON | 432 | 409 | 23 |
| `shots/toon_corner.png` | TOON | 432 | 409 | 23 |
| `shots/toon_close.png` | TOON | 432 | 409 | 23 |
| `shots/unlit_default.png` | UNLIT | 432 | 0 | 432 |

The 23 basic materials in toon mode are the sky card, window panes, floor stains, and the edition-board face, which is kept basic so the chalk stays readable. Unlit replaces every toon material with `MeshBasicMaterial`.

## What the frames actually show

- **Default.** West clerestory, two racks of hanging prints, portfolio case, homasote stack, etching press with wheel and bed, edition board, glass slab with a black film and a green task lamp, paper table behind it. The entry floor in front is empty on purpose.
- **Corner.** Inking slab, paper bench, flat files, lidded ferric cart, copper/steel plate rack, and the wash alcove (tile splash, brass faucet, solvent shelf). This is the frame that proves the wash is in the room. The default camera cannot see it: the alcove is on the east wall, forward of the press, outside a 42° view from the cutaway.
- **Close.** Spoked wheel, upper roller, bed rails, three blankets, copper plate, and a sheet. Iron is a mid grey so the toon steps read instead of a black mass.
- **Unlit.** Same framing as default, flat color, no shadows.

## Still wrong, or only good enough

- The press, brayers, racks, flat files, sink, and plates are boxes and cylinders. The wheel is a torus. See `refs/GAP.md`.
- Inking and paper stations are dining tables. Ink tins are recolored jam jars.
- Glass, the soaking tray, and the window glass are opaque or barely transparent. Toon sorting made real glass worse.
- Beam shadows stripe the north wall between the flat files and the wash. That wall is otherwise bare. Filling it would put storage on the paper/solvent path.
- The ferric label is a small card. At corner distance it reads as a label, not as the letters FeCl3.
- No printer, no rolling bed, no running water. The open floor is the crank stance plus the entry aisle, not missing furniture.
