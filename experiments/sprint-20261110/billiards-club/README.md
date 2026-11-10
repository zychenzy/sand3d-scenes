# Billiards club (Three.js + sand3d)

Cutaway club room: one 9-foot table under a long shade, brass cue-clearance inlay, scoreboard, wall racks, and a bar / spectator corner outside the swing.

## Open

```bash
cd experiments/sprint-20261110/billiards-club
python3 -m http.server 8891 --bind 127.0.0.1
```

<http://127.0.0.1:8891/>

`T` toon · `U` unlit · `?mode=unlit` · `?cam=corner` · `?cam=close` · `?hud=0`

Layout check (no browser):

```bash
python3 experiments/sprint-20261110/billiards-club/tests/check_layout.py
```

GLBs are symlinks into `lounge/` and `cafe/`. Three.js is a symlink to `lounge/vendor`. Serve this directory; do not copy the meshes.
