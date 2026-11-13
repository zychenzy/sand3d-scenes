# QA

Captured with headless Chrome (SwiftShader) at 1440×900 against `serve.py` on port 8873. `?shot=1` hid the HUD. Each shot waited for `window.__scene.ready`. Console errors and failed network requests (other than a missing favicon) fail the capture.

## Shots

- `shots/toon_default.png` — establishing cutaway. The sign reads WATCH REPAIR on the left wall, clear of the clock field. BENCH JOBS is readable. The raised bench, stool, counter, two chairs, cabinet, regulator, longcase, mantel, waiting bench, table, cup, and plant are all inside the frame. The waiting bench does not meet the counter.
- `shots/toon_corner.png` — from the open corner. The stool sits on the green mat and faces the bench. The counter lamp shade points across the watches. The cabinet is a labeled grid with one drawer pulled. From this angle the left-wall sign loses the W to foreshortening and reads as NATCH REPAIR. The default camera shows the full word, so the texture itself is intact.
- `shots/toon_close.png` — the bench top. Green baize, the semicircular belly bite, wing drawers, the movement under a loupe ring on a brass arm, the parts tray, colored screwdrivers, an oil cup, the banker lamp pool, and the timing screen (`+4 s/d`) are visible. The maker’s stool crops the bottom-left because the camera sits just behind that seat.
- `shots/unlit_default.png` — same camera as the default, `MeshBasicMaterial`. No shadow map. Slate wainscot, pale maple, walnut cabinet, oak counter, and white dials still separate by value. Lamp shades keep their color because unlit copies the toon emissive into the albedo.

## Checks

- `python3 experiments/indoor-20261113/watchmaker/test_layout.py` — `ok 17 instances 14 assets`. Chairs and the stool face their `lookAt`. Every GLB path starts with `../../../`, stays inside the repo, and has no remote URL. The bench is at least 0.2 m above the counter. Nothing sits in the customer lane.
- `node --check` on `watchmaker.js` and `scene_lib.js`.
- Capture reported `mode: TOON` for the three toon shots and `mode: UNLIT` for the unlit shot, with an empty error list.

## What is still limited

Drawer abbreviations are a cream grid at room distance. They are present in the corner shot and are not readable as words without a closer orbit than the four shipped cameras.

The loupe, movement, and wristwatches are enlarged so they survive the establishing view. The stool is a cafe bar stool, the right height and the wrong species of furniture. The parts rack is the small cafe etagere, moved to the left end of the bench so it no longer intersects the timing box. Contact shadows are discs. See `refs/GAP.md`.
