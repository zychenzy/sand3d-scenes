# West End Wash

A cutaway neighbourhood coin laundry. The back wall is a packed bank of two-pocket dryers. The left wall is a front-load washer bank, standards first and two larger machines toward the storefront window. A laminate folding counter faces the dryers. A shorter stainless sort counter serves the washer aisle. Carts park off those aisles. Waiting chairs and a backless bench sit under the window and face the machines. Detergent vending, a change box, and the attendant ledge close the right pier.

Shared sand3d GLBs are referenced in place. The room, machines, carts, and detergent bottles are local geometry. Toon is the default. Unlit is a real flat color pass.

## Launch

Serve the **repo root** so the relative GLB and Three.js paths resolve. Do not start the server inside this folder.

```bash
python3 -m http.server 8771 --bind 127.0.0.1
```

Open:

- http://127.0.0.1:8771/experiments/indoor-20261113/laundromat/
- `?cam=corner` dryer bank, folding counter, and the service pier
- `?cam=close` dryer doors and the folding top
- `?mode=unlit` flat color pass (`MeshBasicMaterial`)
- `?hud=0` hides the overlay

Keys: `T` toon, `U` unlit. Drag to orbit.

## Check

```bash
python3 experiments/indoor-20261113/laundromat/tests/check_scene.py
node experiments/indoor-20261113/laundromat/tests/shoot.mjs
```

The shooter expects the server above on port 8771. It writes `shots/*.png` and copies under `/opt/cursor/artifacts/`.
