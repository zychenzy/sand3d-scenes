# Public bathhouse changing and wash hall

One side of a neighbourhood sento, unoccupied. Shoes and the payment desk sit at the open entry, timber lockers and a changing bench line the dry hall, and a stepped-in tiled bay holds the wash stools. Screens and a noren frame the bath; only the rim of the tub is in view.

Hard stepped toon (`MeshToonMaterial`, 4-step nearest gradient, hard shadows) and true unlit (`MeshBasicMaterial`). Offline. Shared GLBs and the three.js build are symlinks into the repo root scenes.

## Open

From this directory:

```bash
cd experiments/indoor30-20261113/bathhouse
python3 -m http.server 8794 --bind 127.0.0.1
```

http://127.0.0.1:8794/

`T` toon · `U` unlit · `?mode=unlit` · `?cam=corner` · `?cam=close` · `?hud=0` hides the overlay.

## Check

```bash
python3 experiments/indoor30-20261113/bathhouse/tests/scene_contract.py
```

Screenshots, with the server already running:

```bash
node experiments/indoor30-20261113/bathhouse/tests/shoot.mjs http://127.0.0.1:8794 experiments/indoor30-20261113/bathhouse/shots
```

## What the views are for

- `toon_default` — entry, lockers, and the wash beyond
- `toon_corner` — bath screens, noren, and the wash aisle
- `toon_close` — stool, bucket, tap, and 100 mm tile
- `unlit_default` — the same framing with lights ignored, so the warm timber and cool tile read on their own
