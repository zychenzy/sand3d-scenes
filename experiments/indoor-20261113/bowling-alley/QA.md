# QA — Northlane

## Geometry

`node --test experiments/indoor-20261113/bowling-alley/test_lane_spec.mjs`

Passed: USBC constants, 10-pin triangle and the 2¾ in edge inset, gutters on both sides of four lanes, hoods off the approaches, approach dots inside the guide bands, arrows on boards 5–35, empty approaches, empty lanes, empty cross aisle, chair rotation 0 on each lane center, monitors at π, stools on the customer side of the shoe desk, and GLB paths that exist outside this folder.

## Render

`node experiments/indoor-20261113/bowling-alley/shoot.mjs`

Serves the repo root and writes `shots/toon_default.png`, `shots/toon_corner.png`, `shots/toon_close.png`, and `shots/unlit_default.png`. The run checks `window.__ready`, `window.__errors`, console errors, and failed network loads. Named nodes `lane_1`, `return_1`, `masking`, `seat_1`, `shoe_counter`, and `pin_2_1` resolve.

Headless Chrome, WebGL via SwiftShader, 1600×1000. No console errors and no failed loads on the four shots. Unlit is `MeshBasicMaterial` (`?mode=unlit`); the HUD reads UNLIT.

## What the frames show

- Default toon: from behind the seating, inside the room. All four lanes run to the masking numbers. Chair tops and the two score consoles sit at the bottom edge. Lane cards, including NORTHLANE, are on the left wall. The right side is a wall, not open ground.
- Corner: under the slat ceiling. Chair fronts face the camera. The entry wing carries HOUSE BALLS, LANE 1, and NORTHLANE above the dado. The lobby screen is a dark score, not a blank glow.
- Close: from above the pin decks. Each lane shows a full triangle, and plates 1–4 are complete. Curtains, ball doors, and rake bars read in a warm gray pit.
- Unlit: the same default camera. Flat color and maps, no toon ramp and no cast shadows. Tubes, score faces, and the numbered plates still read.

## Known visual limits

See `refs/GAP.md`. The pair-monitor glass stays black; the scores are on the console faces and on the lobby screen. The close view stays high enough to keep every pin triangle, so the kickbacks still read as low walls around the decks. A lower camera hides the outer head pins behind those kickbacks.
