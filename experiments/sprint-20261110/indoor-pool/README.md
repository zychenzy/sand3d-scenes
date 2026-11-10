# Indoor swimming hall

Short three-lane hall: sloping basin, lane ropes, glazed walls, timber trusses, shallow-end lounge, and a changing niche. Toon-hard Three.js, offline, shared sand3d GLBs by symlink.

## Open

From this directory (the vendor and GLB symlinks resolve here):

```bash
cd experiments/sprint-20261110/indoor-pool
python3 -m http.server 8788 --bind 127.0.0.1
```

http://127.0.0.1:8788/

`T` toon · `U` unlit · `?mode=unlit` · `?cam=corner` · `?cam=close` · `?hud=0` hides the overlay.

## Check

```bash
python3 experiments/sprint-20261110/indoor-pool/tests/scene_contract.py
```

Screenshots (server already running):

```bash
node experiments/sprint-20261110/indoor-pool/tests/shoot.mjs http://127.0.0.1:8788 /opt/cursor/artifacts indoor-pool
```
