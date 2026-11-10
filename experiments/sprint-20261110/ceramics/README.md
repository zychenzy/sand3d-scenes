# Ceramics workshop

Cutaway studio: throwing bay, clay preparation under the window, drying rack, kiln corner, and a glaze-sample display. Toon-hard Three.js, vendored offline. Furniture GLBs are symlinks into existing scene folders.

## Launch

From this directory:

```bash
cd experiments/sprint-20261110/ceramics
python3 -m http.server 8791 --bind 127.0.0.1
```

Open http://127.0.0.1:8791/

- `T` toon · `U` unlit
- `?mode=unlit`
- `?cam=corner` · `?cam=close`
- `?shot=1` hides the HUD for stills

The page loads `vendor/` and `assets/` through relative symlinks, so the server must be started here (or any server that follows those links). No network assets.

## Test

```bash
node --test experiments/sprint-20261110/ceramics/tests/layout.test.mjs
```

## Gaps

See `refs/GAP.md`. Wheels, kiln, ware rack, and glaze tiles are procedural. Catalog furniture is reused, not re-baked.
