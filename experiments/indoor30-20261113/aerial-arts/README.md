# Span Room — aerial arts studio

A full-height training bay: dead-hung steel grid, two silk points, a low lyra and a high lyra, a 34 cm crash mat under each point, a lower warmup/storage bay on the west, and a waiting bench under the east canopy, south of the ochre line.

Not a yoga or dance room. There is no mirror wall and no mat grid.

## Open

```bash
cd experiments/indoor30-20261113/aerial-arts
python3 -m http.server 8807 --bind 127.0.0.1
```

http://127.0.0.1:8807/

`T` toon · `U` unlit · `?mode=unlit` · `?cam=corner` · `?cam=close` · `?hud=0`

Vendor Three.js and catalog GLBs are symlinks to repo-root scenes. Serve this directory so those links resolve. Do not copy the GLBs.

## Check

```bash
node tests/safety.mjs
node tests/render_shots.mjs
```

`safety.mjs` checks rigging alignment, mat clearance, the wait bench, pathway width, chair facing, and that assets and Three.js are links. `render_shots.mjs` loads the page in headless Chrome, checks hard-step toon versus true unlit, GLB scale, and writes `shots/`.
