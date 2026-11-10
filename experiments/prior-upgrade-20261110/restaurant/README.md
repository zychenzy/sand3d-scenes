# Hinoki dining (prior-upgrade 2026-11-10)

Redo of root `restaurant/` to the sprint-20261110 authored-cutaway bar. Lives only in this folder. Does not change `restaurant/` or the shared renderer.

Wall-booth zone on the left (three complete diner pairs), three enlarged 8-top tables, sushi pass on the back wall. No screens or partitions. Chairs face their tables. Paper lanterns and pendants stay emissive in toon and unlit.

## Run

Serve the repository root so relative GLB paths resolve:

```bash
python3 -m http.server 8767 --bind 127.0.0.1
# http://127.0.0.1:8767/experiments/prior-upgrade-20261110/restaurant/
```

`T` toon · `U` unlit · `?mode=unlit` · `?cam=corner` · `?cam=close` · `?hud=0`

```bash
node experiments/prior-upgrade-20261110/restaurant/test/layout.test.mjs
```

## Views

Default / corner / close / unlit: `/opt/cursor/artifacts/restaurant_default.png`, `restaurant_corner.png`, `restaurant_close.png`, `restaurant_unlit.png`.
