# Community kitchen classroom

A cutaway teaching kitchen: bar-height butcher-block island with stools, and a back-wall cook line (prep, range, wash, coffee). Tasting table and lesson board sit on the left. Shared sand3d GLBs are referenced in place; the room, appliances, and food are local.

## Launch

Serve the **repo root** so the relative GLB and Three.js paths resolve. Do not start the server inside this folder.

```bash
python3 -m http.server 8756 --bind 127.0.0.1
```

Open:

- http://127.0.0.1:8756/experiments/sprint-20261110/community-kitchen/
- `?cam=corner` cook-line corner
- `?cam=close` island top
- `?mode=unlit` flat color pass
- `?hud=0` hides the overlay

Keys: `T` toon, `U` unlit. Drag to orbit.

## Check

```bash
python3 experiments/sprint-20261110/community-kitchen/tests/check_scene.py
```
