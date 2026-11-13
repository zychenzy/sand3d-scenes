# Copperplate Atelier / 版画工坊

Intaglio shop cutaway: etching press with a star wheel, standing inking slab, seated paper table, flat files, a paper soak sink, a separate ink sink, ferric hood, hot plate, drying lines, and a drying rack. Clean paper stays on the west. Ink and acid stay on the east. They meet at the bed.

Toon-hard Three.js (`MeshToonMaterial`, uneven 4-step gradient, one hard key shadow) with a real unlit mode (`MeshBasicMaterial`). Vendor and catalog GLBs are symlinks into this folder. Nothing outside `experiments/indoor-20261113/printmaking-studio/` is modified.

## Launch

Serve from the **repository root** so the symlinks resolve inside the server tree:

```bash
python3 -m http.server 8793 --bind 127.0.0.1
```

Open http://127.0.0.1:8793/experiments/indoor-20261113/printmaking-studio/

- `T` toon · `U` unlit
- `?mode=unlit`
- `?cam=corner` · `?cam=close`
- `?shot=1` hides the HUD for stills

## Test

```bash
node --test experiments/indoor-20261113/printmaking-studio/tests/layout.test.mjs
```

## Gaps

See `refs/GAP.md`. The press, flat files, sinks, hood, and drying gear are procedural. Catalog furniture is reused, not re-baked.
