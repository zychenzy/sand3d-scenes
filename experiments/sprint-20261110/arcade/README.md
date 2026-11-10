# Retro arcade (Three.js + sand3d)

Cutaway game room: a staggered row of upright cabinets, a pinball, a blaster, a cocktail table, a linked racing pair, and a token booth. Screens, marquees and wall signs are emissive. There is no bloom pass.

Serve from the **repository root**. Shared GLBs and the vendored Three.js build are referenced with relative paths, and a server rooted in this folder cannot see them.

```bash
cd /path/to/sand3d-scenes
python3 -m http.server 8790 --bind 127.0.0.1
```

Open `http://127.0.0.1:8790/experiments/sprint-20261110/arcade/`

`T` toon · `U` unlit · `?mode=unlit` · `?cam=corner` · `?cam=close` · `?hud=0` hides the overlay.

Layout check (no browser):

```bash
python3 experiments/sprint-20261110/arcade/tests/check_layout.py
```
