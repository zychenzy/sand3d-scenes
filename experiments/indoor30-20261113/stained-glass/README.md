# Cold stained-glass workshop

Copper-foil / lead-came shop. A shared pattern light table, vertical coloured-glass racks, a cutting bench, and a soldering bench under a vent hood. A framed leaded window stands on the back wall. This is cold work. It is not the hot glassblowing studio.

Toon is the default (four hard gradient steps). `U` switches to unlit `MeshBasicMaterial`.

## Open

Serve the **repository root** so the shared GLBs and vendored Three.js resolve. Do not copy them into this folder, and do not start the server inside it.

```bash
cd /path/to/sand3d-scenes
python3 -m http.server 8793 --bind 127.0.0.1
```

- http://127.0.0.1:8793/experiments/indoor30-20261113/stained-glass/
- `?cam=corner` solder bench, foil, vent hood
- `?cam=detail` light-table glass
- `?mode=unlit`
- `T` toon · `U` unlit · `?hud=0` hides the overlay

## Check

```bash
python3 experiments/indoor30-20261113/stained-glass/tests/layout_clearance.py
node experiments/indoor30-20261113/stained-glass/tests/render.mjs
```

Screenshots in `shots/`: `toon_default.png`, `toon_corner.png`, `toon_detail.png`, `unlit_default.png`.
