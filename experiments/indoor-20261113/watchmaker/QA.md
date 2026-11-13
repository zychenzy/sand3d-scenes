# QA

Captured with headless Chrome (SwiftShader) at 1440×900 against `serve.py` on port 8873. `?shot=1` hid the HUD. Each shot waited for `window.__scene.ready`. Console errors and failed asset requests (other than a missing favicon) fail the capture.

## What changed after review

The wall “banding” was the plaster texture: a few hundred 18×10 rectangles tiled on a diagonal. The plaster is now a fine stipple. The sawtooth on the bench was `PCFHardShadowMap` over a 22 m frustum at 2048². The key light now uses soft PCF, a 4096 map, and a frustum fitted to the room (`bias` −0.00012, `normalBias` 0.03). Shadows stay on. Walls receive them and do not cast.

Clock faces were buried in the cream wall panel and then mipmapped away, so only the brass rings survived. Dials are crisp canvases (no mipmaps) with numerals and hands, set in front of the panel. One larger shop clock sits between two smaller ones, with the regulator and the longcase beside them.

The floor is one board texture, about 12 cm to the plank, with grain along the length. The maker sits on a wooden stool whose seat is 0.28 m under the bench, in the belly bite. The sign is a front-facing plane on the back wall. The close camera looks down on a 42 mm movement, a loupe, trays, oil cups, screwdrivers, and service tags. Counter watches stay near 38 mm.

## Shots

- `shots/toon_default.png` — bench, wooden stool, counter with two chairs and a row of small watches, parts cabinet, strap rail, clock wall, and regulator. The sign reads WATCH REPAIR. The longcase is cut by the right edge. Floor grain is narrow. Wall plaster has no rectangular bands. The lamp and stool throw soft shadows.
- `shots/toon_corner.png` — the same sign reads WATCH REPAIR from this side. Clock numerals and hands are legible on the large dial. Cabinet labels, jars, bench, and stool are in frame. The longcase is only an edge.
- `shots/toon_close.png` — overhead on the baize. The belly bite is a semicircle. A brass movement sits under the loupe, with a soft shadow rather than a stair-step. Tags read 2824 and 7S26. Trays, oil cups, and screwdrivers sit on the maple. Grain lines are fine.
- `shots/unlit_default.png` — same camera as the default, `MeshBasicMaterial`. No shadow map. Slate, maple, walnut, oak, and the white dials still separate. The sign and the clock numerals remain readable.

## Checks

- `python3 experiments/indoor-20261113/watchmaker/test_layout.py` — `ok 16 instances 13 assets`. The stool seat is 0.22–0.32 m under the bench and in reach of the bite. Chairs face the counter. Every GLB path starts with `../../../` and stays inside the repo. The scene uses `PCFSoftShadowMap`, and the cafe bar stool is not the maker’s seat.
- `node --check` on `watchmaker.js` and `scene_lib.js`.
- Capture reported `mode: TOON` for the three toon shots and `mode: UNLIT` for the unlit shot, with an empty error list.

## Still limited

Individual wheels inside the movement are a few millimetres. The close shot shows the plate, a bridge, and the stem, not a full gear train. Drawer abbreviations are readable on the cabinet in the establishing view and are still short codes. Screws in the trays are slightly enlarged so the close camera can see them. The right edge of the default frame clips the longcase. See `refs/GAP.md`.
