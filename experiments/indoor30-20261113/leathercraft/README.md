# Leathercraft atelier

Cutaway bag-making room: a standing clicker bench, a stitching pony (the seat is the pony), a seated edge-burnish bench, hides on a wall rail, a hardware cabinet with open drawers, and finished bags. North window on the left wall, warm pendants over the three stations.

This is not a weaving or sewing room. There is no loom, bolt rack, or domestic machine.

## Launch

Shared GLBs and vendored Three.js are referenced from the repository root. Start the server there.

```bash
cd /path/to/sand3d-scenes
python3 -m http.server 8796 --bind 127.0.0.1
```

- http://127.0.0.1:8796/experiments/indoor30-20261113/leathercraft/
- `?cam=corner` from the open right side
- `?cam=close` stitching-pony jaws
- `?mode=unlit` flat color
- `?hud=0` hides the overlay
- `T` toon · `U` unlit

```bash
python3 experiments/indoor30-20261113/leathercraft/tests/check_scene.py
```

Shots in `shots/`: `toon_default.png`, `toon_corner.png`, `toon_close.png`, `unlit_default.png`.

## Selected bakes

Existing Sandflow GLBs, referenced in place: dining chair, bar stool, library lamp, pendant, jam jar, flowerpot, mug. The wall-shelf bake was inspected and left out. The HF handbag program `objaverse-3486704343f64c83b88b72db6adbed0d` was inspected and not baked. See `refs/GAP.md`.
