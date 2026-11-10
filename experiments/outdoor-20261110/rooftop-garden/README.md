# Rooftop garden

Urban roof terrace at golden hour: stair head in the foreground, herb beds, stepped planters, one dining table under a timber pergola, and a low lounge aimed at the skyline.

## Run from the repo root

```bash
python3 -m http.server 8787 --bind 127.0.0.1
```

Open http://127.0.0.1:8787/experiments/outdoor-20261110/rooftop-garden/

`T` toon (default) · `U` unlit · `?mode=unlit` · `?cam=corner` · `?cam=close` · `?shot=1` hides the HUD.

Serving from the repo root keeps the symlinked GLBs and vendored Three.js on paths the static server can follow.

## Checks

```bash
node --test experiments/outdoor-20261110/rooftop-garden/tests/layout.test.mjs
```

Layout numbers, chair facing, lounge orientation, parapet heights, path clearance, and the city saddle are in `layout.json`.
