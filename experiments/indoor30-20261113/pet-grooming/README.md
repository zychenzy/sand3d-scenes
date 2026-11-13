# Pet grooming salon

Cutaway grooming room: two hydraulic tables with gooseneck arms and loops, a raised wash tub and treaded ramp, a drying kennel with a stand dryer, towel cubbies, and a customer handoff counter behind pet gates. No animal figures. Not a barber shop and not a vet exam room.

## Open

Serve this directory so the symlinked vendor and GLBs resolve:

```bash
cd experiments/indoor30-20261113/pet-grooming
python3 -m http.server 8871 --bind 127.0.0.1
```

`http://127.0.0.1:8871/`

`T` toon · `U` unlit · `?mode=unlit` · `?cam=corner` · `?cam=close` · `?shot=1` hides the HUD.

Default shading is a four-step hard toon. Unlit is `MeshBasicMaterial`.

## Checks

```bash
node --test experiments/indoor30-20261113/pet-grooming/tests/scene.test.mjs
node experiments/indoor30-20261113/pet-grooming/tests/render_shots.mjs
```

The layout test covers clearances, human scale, facing, and that GLBs and Three.js stay symlinks out of this folder. The render script loads every GLB, fails on console errors, checks table, tub, counter, stool, waiting-chair, and roof heights, and writes the four shots.

GLBs and `vendor/` are symlinks into `cafe/` and `library/`. Do not copy them. Work stools, waiting chairs, and the roof deck are procedural.
