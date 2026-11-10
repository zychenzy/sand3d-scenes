# Wheelhouse pottery / maker workshop

Prior-upgrade redo of the pre-sprint `workshop/` ceramics room. Cutaway community studio: throwing line, slab roller and wedging, handbuilding island, drying rack, kiln alcove, glaze bench and fired samples. Toon-hard Three.js, vendored offline. Furniture GLBs are symlinks into existing scene folders.

This folder is exclusive. Do not edit `workshop/` at repo root or other agents' experiment dirs.

## Launch

From this directory:

```bash
cd experiments/prior-upgrade-20261110/workshop
python3 -m http.server 8788 --bind 127.0.0.1
```

Open http://127.0.0.1:8788/

- `T` toon · `U` unlit
- `?mode=unlit`
- `?cam=corner` · `?cam=close`
- `?shot=1` hides the HUD for stills

The page loads `vendor/` and `assets/` through relative symlinks, so the server must be started here (or any server that follows those links). No network assets.

## Test

```bash
node --test experiments/prior-upgrade-20261110/workshop/tests/layout.test.mjs
```

## Gaps

See `refs/GAP.md`. Wheels, kiln, ware rack, slab roller, and glaze tiles are procedural. Catalog furniture is reused, not re-baked.
