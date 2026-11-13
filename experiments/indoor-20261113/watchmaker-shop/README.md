# Watchmaker repair shop · 钟表维修店

Cutaway repair room: two jeweler benches with kneeholes and task lamps, a glass intake counter of watches, parts drawers, and a small waiting corner. Toon is the default. `U` switches to unlit (`MeshBasicMaterial`, lights ignored).

## Open

Serve the **repository root** so this folder's symlinks resolve.

```bash
cd /path/to/sand3d-scenes
python3 -m http.server 8765 --bind 127.0.0.1
```

- http://127.0.0.1:8765/experiments/indoor-20261113/watchmaker-shop/
- `?cam=corner` along the benches
- `?cam=close` the main bench: lamp, loupe, pin, movement
- `?mode=unlit`
- `T` toon · `U` unlit · `?shot=1` or `?hud=0` hides the overlay

## Check

```bash
python3 experiments/indoor-20261113/watchmaker-shop/tests/layout_checks.py
python3 experiments/indoor-20261113/watchmaker-shop/tests/orientation_checks.py
```

Screenshots in `shots/`: `toon_default.png`, `toon_corner.png`, `toon_close.png`, `unlit_default.png`.

GLBs and Three.js are symlinks into existing scene folders. Nothing here copies the shared vendor.
