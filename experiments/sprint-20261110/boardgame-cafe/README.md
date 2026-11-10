# Meeple & Bean — social boardgame cafe

Cutaway cafe for the sprint-20261110 scene set. Play floor, boxed-game wall, service bar, and a teaching nook under warm pendant pools. Toon-hard Three.js, vendored from `boardgame/vendor`. GLBs are referenced in place; nothing in this folder duplicates a mesh.

## Launch

Serve the **repository root** so the relative GLB paths resolve.

```bash
cd /path/to/sand3d-scenes
python3 -m http.server 8779 --bind 127.0.0.1
# http://127.0.0.1:8779/experiments/sprint-20261110/boardgame-cafe/
```

`T` toon · `U` unlit · `?mode=unlit` · `?cam=corner` · `?cam=close` · `?hud=0` hides the label.

## Check the layout

```bash
node --test experiments/sprint-20261110/boardgame-cafe/test/placement.test.mjs
```

Chair facing, seat gaps, table size, shelf clearance, and on-disk GLB paths are asserted there. `placement.js` is the only pose source; `layout.json` holds the shell, cameras, lights, and asset catalog.
