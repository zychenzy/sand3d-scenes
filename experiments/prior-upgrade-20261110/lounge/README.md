# Billiards lounge (prior upgrade)

Richer cutaway of the pre-sprint `lounge/` room. One table, cue clearance, seating that faces the cloth, bar as a secondary corner.

## Open

```bash
cd experiments/prior-upgrade-20261110/lounge
python3 -m http.server 8778 --bind 127.0.0.1
```

<http://127.0.0.1:8778/>

`T` toon · `U` unlit · `?mode=unlit` · `?cam=corner` · `?cam=close` · `?hud=0`

Layout check (no browser):

```bash
python3 experiments/prior-upgrade-20261110/lounge/tests/check_layout.py
```

GLBs are symlinks into `lounge/` and `cafe/`. Three.js is a symlink to `lounge/vendor`. Serve this directory; do not copy the meshes.
