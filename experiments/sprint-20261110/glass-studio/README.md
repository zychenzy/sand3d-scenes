# Artisan glass studio

Cutaway hot shop: glory-hole furnace as the warm focal light, gaffer bench and marver, annealing lehr, cullet and batch storage with a clear reach aisle, and a finished-glass display. Toon is the default; `U` switches to unlit. Glass is opaque colour (dark mouth, light lip), not stacked transparent shells.

## Open

Serve the **repository root** so the shared GLBs and vendored Three.js resolve. Do not start the server inside this folder.

```bash
cd /path/to/sand3d-scenes
python3 -m http.server 8777 --bind 127.0.0.1
```

- http://127.0.0.1:8777/experiments/sprint-20261110/glass-studio/
- `?cam=corner` along the hot shop
- `?cam=close` bench rails, loaded blowpipe, glory hole
- `?mode=unlit`
- `T` toon · `U` unlit · `?hud=0` hides the overlay

## Check

```bash
python3 experiments/sprint-20261110/glass-studio/tests/layout_clearance.py
```

Screenshots in `shots/`: `toon_default.png`, `toon_corner.png`, `toon_close.png`, `unlit_default.png`.
