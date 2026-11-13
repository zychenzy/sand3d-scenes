# Gaps

Inspected the local catalog and Hugging Face `Sandflow/sand3d-objaverse` (search on entry names, plus the dataset renders). Local GLBs have chairs, a stool, a register, lamps, and a thermos. They have no bicycle, wheel, pump, stand, or pegboard.

Baked and kept:

- Gold mountain bike `objaverse-a4c57cc4d44f45a999e48d980a099aaf` (adult frame, 706 mm wheels, saddle, bars, drivetrain).
- Green downhill bike `objaverse-e3cd36c670cd4d19ab630a8468906667` (different color, so the floor bike is not a clone).
- Spoked wheel `objaverse-bc0bc9de84b9419f9e278af8dbb0c250` (rim, tire, hub, crossed spokes).
- Floor pump `objaverse-0fa79af038a3466c829c5795e5599630` (base, barrel, hose, handle).

Rejected after looking at the programs and renders:

- Exercise-bike entries (`exercise_bike`) — stationary trainers, not a shop bike.
- Outdoor `bicycle_rack` `objaverse-256ec995b49245a689b5e2506cda807f` — a 2 m sidewalk loop rack with a sign, not an indoor wheel rack.
- Bare `bicycle_frame` entries — tubes only, no wheels or saddle.
- `bicycle_plaque`, `bicycle_tube`, `cycle_track` — a sign, a furniture tube, and a track, not shop fixtures.
- Other mountain-bike rows were redundant once two distinct adult bikes were baked.

Still procedural, because the catalog has no mesh for them:

- Repair stand, truing-stand frame, pegboard and hand tools, open parts bins, service counter, wheel-rack rails.
- The stand jaws meet the gold bike's seatpost in layout (`anchors.clamp` at the measured post). They are stylized blocks, not a scanned Park clamp.
- Contact shadows are warm discs. Walls do not receive the shadow map, so plaster does not pick up acne.
- The toon ramp's darkest stop is about 0.42. Unlit mode is basic materials with the shadow map disabled.
- The counter pendant is a cafe shade. A second pendant over the bench was removed because it covered the pegboard.
- The only catalog stool is the cafe tulip pedestal (`cafe/assets/bar_stool__319fcb56afe8.glb`). The staff seat is a four-leg shop stool in `bicycle.js`, not that pedestal.
