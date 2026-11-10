# Dance rehearsal studio

Cutaway ballet rehearsal hall: mirrored barre wall, clear timber floor, sprung-floor section, shoe cubbies, playback monitors, and a lower changing bay.

## Open

From this directory (symlinks resolve to shared GLBs and the vendored Three.js used by the other rooms):

```bash
cd experiments/sprint-20261110/dance-studio
python3 -m http.server 8794 --bind 127.0.0.1
```

http://127.0.0.1:8794/

`T` toon · `U` unlit · `?mode=unlit` · `?cam=corner` · `?cam=close` · `?hud=0` · `?dpr=1`

## Check

```bash
python3 experiments/sprint-20261110/dance-studio/tests/check_layout.py
```
