# Gaps

Photos of a cold shop show a light table or light board, vertical sheet racks, copper-foil rolls, a soldering iron and spool, flux, a grinder with a water tray, running pliers, a glass cutter, lead or zinc came, and a finished panel on a light. The catalog has none of those meshes. They are shaped procedural pieces in `stained.js`.

What the existing bakes could not be:

- No sheet glass, leaded panel, came, foil roll, soldering iron, or vent hood in the repo GLBs. Inspected bounds and material names only. No new Hugging Face bake — a specialist bake would have been a new binary, and this folder does not copy shared assets.
- The trestle table is a dining table with a procedural light box on top. It is not a manufactured light table.
- The solder bench is a narrow student desk. The task lamp is a library lamp; only the pale shade tube is emissive.
- Jam jars stand in for flux, patina, and cutting oil. They read as bottles, not as art glass.
- The easel is a painter’s easel. The cartoon is a generated line drawing on a plane in front of the canvas.
- The chair is a metal cafe chair, not a glassworker’s stool.
- Foil rolls are about 8 cm across so they read in the wide shot. Real copper-foil rolls are closer to 4 cm.
- Glass is hard-step toon with a streak map, partial transparency, and emissive colour. It is not physical transmission, not a refraction shader, and not sorted like studio path tracing. Overlapping rack sheets can blend. The lead lines are solid came in front of the panes.
- No person, no kiln (a paint kiln would blur this room into hot work), no respirator mesh. The vent hood and the empty foreground pad are the safety cues.
- `wall_shelf` board heights are estimated from the GLB. Jars and foil may sit a centimetre off the board.
- Contact shadows are the directional map. The toon path has no ambient occlusion. Thin came does not cast, so it does not speckle the window.

Still distinct from `experiments/sprint-20261110/glass-studio`: no glory hole, blowpipe, marver, lehr, or cullet orbs. Scrap here is flat shards.
