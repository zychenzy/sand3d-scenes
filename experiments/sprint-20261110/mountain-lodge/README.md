# Alpine lodge common room

Cutaway of a mountain-lodge common room: stone fireplace as the focal point, timber beams and an inglenook frame, a communal trestle table on layered rugs, a window reading nook, and a boot / gear wall. Cool daylight comes through the left window; the fire is the warm pool.

Toon-hard (`MeshToonMaterial`, 4-step gradient, hard shadows) and unlit. Local `scene_lib.js` is a copy of the shared room bootstrap with emissive bulbs, a fire spot, and contact-shadow discs. Shared three.js and GLBs are symlinks, not copies.

## Open

```bash
cd experiments/sprint-20261110/mountain-lodge
python3 -m http.server 8794 --bind 127.0.0.1
```

`http://127.0.0.1:8794/`

`T` toon · `U` unlit · `?mode=unlit` · `?cam=corner` · `?cam=close`

## Checks

```bash
python3 test_layout.py
```

Screenshots (Chrome headless, server already running):

```bash
node render_shots.mjs
```
