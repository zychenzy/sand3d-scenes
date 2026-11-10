# Outdoor amphitheatre

Small open-air bowl cut into a grass slope. Five curved stone seat tiers face a modest timber stage. Side stairs sit outside the arc. A storage shed is on the stage-right back edge, with lighting poles and a gathering forecourt on the crest. Warm evening, before a performance. Toon hard is the default; Unlit is a flat-color read of the same geometry.

## Run

From the repo root, so the asset and Three.js symlinks resolve:

```bash
python3 -m http.server 8773 --bind 127.0.0.1
```

Open `http://127.0.0.1:8773/experiments/outdoor-20261110/outdoor-amphitheatre/`

`T` toon · `U` unlit · `?mode=unlit` · `?cam=corner` · `?cam=close` · `?hud=0`

## Checks

```bash
node --test experiments/outdoor-20261110/outdoor-amphitheatre/tests/orientation.test.mjs
```

Plan, stair, and facing tests live in `bowl.js`. Shots: `shots/toon_default.png`, `shots/toon_corner.png`, `shots/toon_close.png`, `shots/unlit_default.png`.
