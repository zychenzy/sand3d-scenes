# Rehearsal hall (prior upgrade 2026-11-10)

Cutaway music rehearsal room: practice dais with piano, drum kit and amps; listening chairs facing that wall; music stands and PA on stands; acoustic foam, bass traps, a slat diffuser and hung clouds.

Lives only under `experiments/prior-upgrade-20261110/music/`. Does not change `music/` or the shared renderer.

## Open

From this directory (symlinks resolve to shared GLBs and the vendored Three.js used by the other rooms):

```bash
cd experiments/prior-upgrade-20261110/music
python3 -m http.server 8774 --bind 127.0.0.1
```

http://127.0.0.1:8774/

`T` toon · `U` unlit · `1`/`2`/`3` cameras · `?mode=unlit` · `?cam=corner` · `?cam=close` · `?hud=0` · `?dpr=1`

## Check

```bash
python3 experiments/prior-upgrade-20261110/music/tests/check_layout.py
```
