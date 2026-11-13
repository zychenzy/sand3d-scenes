# North Pit — esports team training room

A cutaway bootcamp pit: five player stations face a replay wall, a coach desk sits behind the row, and a draft board hangs on the back wall. Chairs are high-back seats whose fronts point at the screens. Cable spines drop in the gaps between desks into a floor raceway.

Toon is the default. `U` switches to true unlit (`MeshBasicMaterial`). Serve from the **repository root** — the Three.js build and the GLBs are shared files, referenced with relative paths.

```bash
cd /path/to/sand3d-scenes
python3 -m http.server 8871 --bind 127.0.0.1
```

Open `http://127.0.0.1:8871/experiments/indoor-20261113/esports-room/`

`T` toon · `U` unlit · `?mode=unlit` · `?cam=corner` · `?cam=close` · `?hud=0` hides the overlay.

```bash
python3 experiments/indoor-20261113/esports-room/tests/check_layout.py
```

Shots (server already on 8871):

```bash
node experiments/indoor-20261113/esports-room/tools/shoot.mjs
```

Writes `shots/toon_default.png`, `shots/toon_corner.png`, `shots/toon_close.png`, `shots/unlit_default.png`.
