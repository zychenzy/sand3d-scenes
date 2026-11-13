# QA — Northlane

## Geometry

`node --test experiments/indoor-20261113/bowling-alley/test_lane_spec.mjs`

Passed: USBC constants, 10-pin triangle and the 2¾ in edge inset, gutters on both sides of four lanes, hoods off the approaches, approach dots inside the guide bands, arrows on boards 5–35, empty approaches, empty lanes, empty cross aisle, chair rotation 0 on each lane center, monitors at π, stools on the customer side of the shoe desk, and GLB paths that exist outside this folder.

## Render

`node experiments/indoor-20261113/bowling-alley/shoot.mjs`

Serves the repo root and writes `shots/toon_default.png`, `shots/toon_corner.png`, `shots/toon_close.png`, and `shots/unlit_default.png`. The run checks `window.__ready`, `window.__errors`, console errors, and failed network loads. Named nodes `lane_1`, `return_1`, `masking`, `seat_1`, `shoe_counter`, and `pin_2_1` resolve.

Headless Chrome, WebGL via SwiftShader, 1600×1000. No console errors and no failed loads on the four shots. Unlit is `MeshBasicMaterial` (`?mode=unlit`); the HUD reads UNLIT.

## What the frames show

- Default toon: from the open right, above the approach. All four lanes, both returns, the approach boards, the pin triangles, and masking numbers 1–4 are in one view. The NORTHLANE plaque is a small plate on the left wall. The roof is a strip along that wall; the truss tubes stay in the open cut.
- Corner: from the right side of the approach. Chair fronts face the camera, consoles and monitor backs sit toward the lanes, the quiet carpet and the entry-wall dado are behind the chairs, and the approach dots are in the foreground.
- Close: lanes 1–3 at the pit. Number plates, curtain folds, ball doors, the rake and sweep bars, red neck stripes, and maple-capped kickbacks.
- Unlit: the same default camera. Flat color and maps, no toon ramp and no cast shadows. Tubes and the numbered plates still read.

## Known visual limits

See `refs/GAP.md`. The monitor glass stays black. The default frame still has empty ground and sky on the open right. The close frame crops lane 4’s number. The corner’s upper middle is the open roof cut.
