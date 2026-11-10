# Orchard gathering terrace

A harvest afternoon on three low dry-stone terraces and a crest, with the hill rising behind them. Downhill is +Z. The gathering terrace is the middle one.

## What has to read

- The table under the pergola is the place people come to. Near chairs face the table. The long bench is on the uphill side.
- The press, crates, baskets, and barrels are the work station to the east of the table. The shed door faces the terrace.
- The path is one walk: meadow, steps onto the gathering terrace, west of the pergola, steps into the high orchard, steps onto the crest.
- Trees are apples, pears, and plums with trunks, forks, and leaves on the outer limbs. They are not a grid and not spheres on sticks.
- Light is late-summer golden hour: warm key from the front-left, cool fill, no spotlights.

## Built here

Terrain, walls, steps, path, hill, trees, pergola and vines, plank table, bench, press, crates, barrels, baskets, barrow, and the stone shed are procedural in `orchard.js`. Chairs, mugs, jam jars, the tray, the thermos, and the flowerpots are existing sand3d GLBs, symlinked. Three.js r170 is the cafe vendor, symlinked.

## Cameras

Default looks down the slope and holds the shed, the table, the press, and the hill. Corner is standing height at the east end of the table, looking toward the shed. Close is at the near side of the table.

## Shading

MeshToonMaterial with a 4-step gradient and PCF hard shadows. `U` or `?mode=unlit` swaps to basic materials. Sky and path ribbons do not cast. Fog sits on the hill.
