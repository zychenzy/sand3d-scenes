# Crown Barber · 理发店

Isolated indoor experiment. Everything for this shop lives in this folder. It does not change other scenes, the shared renderer, root vendor, or lockfiles.

Three oxblood salon chairs face a mirror wall. Each station has a drawer cabinet, bulbs, and tools (clippers, shears, comb, razor, scissors, jars). The left wall is an open retail bay. Waiting seats and a coffee table sit off the center aisle. Reception, a barber pole, and a wash corner close the plan. The center checker floor stays walkable.

## Run

Serve the repository root so the vendored Three.js import and the asset symlinks resolve:

```bash
python3 -m http.server 8765 --bind 127.0.0.1
# http://127.0.0.1:8765/experiments/indoor-20261113/barbershop/
```

`T` toon (default) · `U` unlit · `?mode=unlit` · `?cam=corner` · `?cam=close` · `?shot=1` hides the HUD.

```bash
node experiments/indoor-20261113/barbershop/tests/layout.test.mjs
```

Toon uses `MeshToonMaterial`, a stepped gradient, and `BasicShadowMap` (this vendored Three.js build has no `PCFHardShadowMap`). Unlit swaps to `MeshBasicMaterial`. No remote scripts.

## Layout

Room 10.4 × 8.6 × 3.22 m. Back wall and left wall are solid; +Z and +X are the cutaway. Salon-chair front is local +Z (the footrest). `rotationY = π` points that footrest at the mirror wall. Waiting chairs face the table. The bench's sitting side faces the table. Work stools are radial and sit beside each chair, not in a cafe row.

## Shots

`shots/toon_default.png`, `shots/toon_corner.png`, `shots/toon_close.png`, `shots/unlit_default.png`. Copies also under `/opt/cursor/artifacts/`.
