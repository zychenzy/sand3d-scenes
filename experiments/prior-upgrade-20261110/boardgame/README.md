# The Night Board — board-game club room

Prior-upgrade redo of `boardgame/` for the 2026-11-10 quality bar. Play floor, boxed-game wall, and a night-board nook. Toon-hard Three.js, vendored from `boardgame/vendor`. GLBs are referenced in place; nothing in this folder duplicates a mesh.

This is a club play room, not a cafe restyle: no bar, no espresso, no round coffee tables.

## Launch

Serve the **repository root** so the relative GLB paths resolve.

```bash
cd /path/to/sand3d-scenes
python3 -m http.server 8772 --bind 127.0.0.1
# http://127.0.0.1:8772/experiments/prior-upgrade-20261110/boardgame/
```

`T` toon · `U` unlit · `?mode=unlit` · `?cam=corner` · `?cam=close` · `?hud=0` hides the label.

## Check the layout

```bash
node --test experiments/prior-upgrade-20261110/boardgame/test/placement.test.mjs
```

Chair facing, seat gaps, table size, aisle clearance, shelf clearance, and on-disk GLB paths are asserted there. `placement.js` is the only pose source; `layout.json` holds the shell, cameras, lights, and asset catalog.
