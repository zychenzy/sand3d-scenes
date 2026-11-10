# Gap notes — retro arcade

The kit has no arcade-cabinet GLB. Uprights, the pinball, the cocktail table, the racing pair and the token counter are procedural. The counter is millwork rather than the cafe bar: that GLB is about 1.8 m × 0.4 m × 0.9 m native, so a 1.05 m target height stretches it to roughly 4.7 m × 2.3 m and would close the aisle.

Reused as themselves: cash register, POS terminal, three bar stools, three pendant lamps (bulb emissive raised), two speakers, one mug, one flowerpot.

Known limits:

- Screens are still canvases on flat planes, not CRTs.
- The speaker GLB is a wide low box. It reads as a floor monitor, not a horn cluster.
- Stools are round, so facing is only weakly visible. `rotationY` is π toward the counter.
- Attract mode does not animate.
- Glow is emissive plus four point lights. There is no bloom pass, on purpose.
- Pinball flippers are painted on the playfield texture.
