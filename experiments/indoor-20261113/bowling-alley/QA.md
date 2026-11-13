# QA — Northlane

## Geometry

`node --test experiments/indoor-20261113/bowling-alley/test_lane_spec.mjs`

Passed: USBC constants, 10-pin triangle and the 2¾ in edge inset, gutters on both sides of four lanes, hoods off the approaches, approach dots inside the guide bands, arrows on boards 5–35, empty approaches, empty lanes, empty cross aisle, chair rotation 0 on each lane center, monitors at π, stools on the customer side of the shoe desk, and GLB paths that exist outside this folder.

## Render

`node experiments/indoor-20261113/bowling-alley/shoot.mjs`

Serves the repo root and writes `shots/toon_default.png`, `shots/toon_corner.png`, `shots/toon_close.png`, and `shots/unlit_default.png`. The run checks `window.__ready`, `window.__errors`, console errors, and failed network loads. Named nodes `lane_1`, `return_1`, `masking`, `seat_1`, `shoe_counter`, and `pin_2_1` resolve.

Headless Chrome, WebGL via SwiftShader, 1600×1000. No console errors and no failed loads on the four shots. Unlit is `MeshBasicMaterial` (`?mode=unlit`); the HUD reads UNLIT.

## What the frames show

- Default toon: open concourse, NORTHLANE soffit, four chairs aimed down the lanes, two returns with balls, gutters, arrows receding to four pin triangles and numbered masking.
- Corner: from a few metres down the lane, chair fronts toward the camera, monitor backs toward the lanes, both returns with three balls each, approach dots, and the rack-bay bench.
- Close: lane 2’s full triangle, red neck stripes, kickbacks, and the dark pit.
- Unlit: the same default camera with flat color, maps, and emissive score and lamp reads, and without the toon ramp or cast shadows.

## Known visual limits

See `refs/GAP.md`. The monitor glass stays black. Lane decks are unshadowed on purpose. The right-hand return in the corner frame is close to the frame edge.
