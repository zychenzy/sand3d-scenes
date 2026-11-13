# Luthier workshop

Cutaway string-instrument repair shop. A task bench holds an open violin in a curved cradle and a clamped guitar. Violins and guitars hang on the back wall. The left wall is a varnish nook. The front-right counter is the customer handoff. Toon is the default. `U` switches to unlit.

This is not a rehearsal room and not a general woodshop. There are no amps, music stands, or machine tools.

## Open

Serve the repository root so the shared GLB paths and the vendored Three.js symlink resolve.

```bash
cd /path/to/sand3d-scenes
python3 -m http.server 8766 --bind 127.0.0.1
```

http://127.0.0.1:8766/experiments/indoor30-20261113/luthier-workshop/

`T` toon · `U` unlit · `?mode=unlit` · `?cam=corner` · `?cam=close` · `?shot=1` hides the HUD.

## Check

```bash
python3 experiments/indoor30-20261113/luthier-workshop/tests/layout_checks.py
node experiments/indoor30-20261113/luthier-workshop/tests/render_shots.mjs
```

Screenshots in `shots/`: `toon_default.png`, `toon_corner.png`, `toon_close.png`, `unlit_default.png`.
