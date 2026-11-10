# Lakeside campsite

Blue-hour lakeside camp: ridge tent and dome tent, a stone-ring fire with seats facing it, a picnic and cook kit, and a short timber landing on an uneven shore. Toon is the default; Unlit is a flat color pass.

## Run from the repo root

Relative GLBs and the vendored Three.js build resolve through symlinks, so serve the repository root:

```bash
python3 -m http.server 8788 --bind 127.0.0.1
```

Open `http://127.0.0.1:8788/experiments/outdoor-20261110/lakeside-campsite/`

`T` toon · `U` unlit · `?mode=unlit` · `?cam=corner` · `?cam=close` · `?shot=1` hides the HUD.

## Checks

```bash
node experiments/outdoor-20261110/lakeside-campsite/test_layout.mjs
```

Shots: `shots/toon_default.png`, `shots/toon_corner.png`, `shots/toon_close.png`, `shots/unlit_default.png`.
