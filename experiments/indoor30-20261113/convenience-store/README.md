# Late Corner — convenience store

Late-night neighborhood convenience interior. Cutaway only: glass-door drink coolers, two stocked gondolas, a hot-food counter, checkout, and a window eating ledge. Not a bakery and not a diner.

## Run

Serve the repository root so the shared GLBs and the library Three.js build resolve:

```bash
python3 -m http.server 8765 --bind 127.0.0.1
# http://127.0.0.1:8765/experiments/indoor30-20261113/convenience-store/
```

`T` toon (default, hard 4-step) · `U` unlit · `?mode=unlit` · `?cam=corner` · `?cam=detail` · `?hud=0`

```bash
node experiments/indoor30-20261113/convenience-store/tests/layout.test.mjs
```

## Shots

`shots/toon_default.png`, `shots/toon_corner.png`, `shots/toon_detail.png`, `shots/unlit_default.png`.
