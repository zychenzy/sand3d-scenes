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

## Review pass

Loom’s notes on the first stills, and what changed:

- The four diagonal beam stripes are gone. The key light now comes through the clerestory, under a finished ceiling. Beams do not cast. Window and furniture shadows remain.
- The corner and the default no longer open onto empty sky. The ceiling is a full lid with a fascia at the cutaway.
- The default camera is lower and closer (fov 58, eye at 1.7 m). A sliver of the east cart sits on the right edge. The drying racks stay on the left. The entry aisle is still a wide floor; moving closer drops the racks out of the frame.
- The close shot shows a shaped cheek, a steel roller, a thicker spoked wheel with a brass grip, blankets, and a sheet on the bed.
- The slab carries two brayers with yokes and wood handles, plus a knife, on a larger ink film. They read in the default and corner frames.
- Floor boards use a narrow value range. Unlit no longer has high-contrast stripes. Toon still shows clerestory shadows on the floor.

## What the frames actually show

- **Default.** Finished ceiling, west clerestory, drying racks, portfolio case, homasote stack, press, edition board, inking slab with brayers, and a sliver of the east cart at the right edge. The entry floor is still the foreground.
- **Corner.** Finished ceiling, no beam stripes on the north wall. Inking slab, paper bench, flat files, ferric cart, plate rack, and the wash alcove.
- **Close.** Shaped cheek, steel roller, spoked wheel with a brass grip, blankets, and a sheet on the bed.
- **Unlit.** Same framing as default, flat color, quiet floor grain, no shadows.

## Still wrong, or only good enough

- The cheeks are one extruded profile. The wheel is still a torus, the roller a cylinder, the bed a plate. See `refs/GAP.md`.
- Inking and paper stations are dining tables. Ink tins are recolored jam jars. The brayer handles are dowels.
- Glass, the soaking tray, and the window glass are opaque or barely transparent.
- The north wall between the flat files and the wash is bare. Beams no longer stripe it. Filling it would put storage on the paper/solvent path.
- The sink itself is only in the corner frame. The default view gets the east cart, not the basin.
- The ferric label is a small card. At corner distance it reads as a label, not as the letters FeCl3.
- No printer, no rolling bed, no running water. The open floor is the crank stance plus the entry aisle.
