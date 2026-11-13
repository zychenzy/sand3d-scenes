# QA

Captured with headless Chrome (SwiftShader) at 1440×900 against `serve.py` on port 8873. `?shot=1` hid the HUD. Each shot waited for `window.__scene.ready`. Console errors and failed asset requests (other than a missing favicon) fail the capture.

## What changed after review

The wall “banding” was the plaster texture: a few hundred 18×10 rectangles tiled on a diagonal. The plaster is now a fine stipple. The sawtooth on the bench was `PCFHardShadowMap` over a 22 m frustum at 2048². The key light now uses soft PCF, a 4096 map, and a frustum fitted to the room (`bias` −0.00012, `normalBias` 0.03). Shadows stay on. Walls receive them and do not cast.

Clock faces were buried in the cream wall panel and then mipmapped away, so only the brass rings survived. Dials are crisp canvases (no mipmaps) with numerals and hands, set in front of the panel. One larger shop clock sits between two smaller ones, with the regulator and the longcase beside them.

The floor is one board texture, about 12 cm to the plank, with grain along the length. The maker sits on a wooden stool whose seat is 0.28 m under the bench, in the belly bite. The sign is a front-facing plane on the back wall. The close camera looks down on a 42 mm movement, a loupe, trays, oil cups, screwdrivers, and service tags. Counter watches stay near 38 mm.

## Shots

- `shots/toon_default.png` — sign reads WATCH REPAIR. The parts cabinet, bench, wooden stool, counter, two customer chairs, waiting bench, regulator, and the full longcase are in frame. The clock panel is a row of five dials. The ceiling is closed. Floor seams are quieter than the clocks and the oak counter. Shadows stay soft.
- `shots/toon_corner.png` — inside the shop, under the ceiling, with no open sky. The sign reads WATCH REPAIR. The longcase, waiting bench, five dials, cabinet, bench, and stool are in frame.
- `shots/toon_close.png` — the baize holds two parts trays, oil cups, screwdrivers, tweezers, a dust blower, the movement, the loupe, and tags reading 2824, 7S26, and 6497. The belly bite is the near semicircle. The loupe shadow is soft.
- `shots/unlit_default.png` — same camera as the default, `MeshBasicMaterial`. No shadow map. Slate, maple, walnut, oak, and the white dials still separate. The sign and the clock numerals remain readable.

## Checks

- `python3 experiments/indoor-20261113/watchmaker/test_layout.py` — `ok 16 instances 13 assets`. The stool seat is 0.22–0.32 m under the bench and in reach of the bite. Chairs face the counter. Every GLB path starts with `../../../` and stays inside the repo. The scene uses `PCFSoftShadowMap`, and the cafe bar stool is not the maker’s seat.
- `node --check` on `watchmaker.js` and `scene_lib.js`.
- Capture reported `mode: TOON` for the three toon shots and `mode: UNLIT` for the unlit shot, with an empty error list.

## Still limited

Individual wheels inside the movement are a few millimetres. The close shot shows the plate, a bridge, and the stem, not a full gear train. Drawer abbreviations are short codes. Screws in the trays are slightly enlarged so the close camera can see them. The corner waiting bench is close to the camera, so its near edge is large. See `refs/GAP.md`.
