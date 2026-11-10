# Star Chamber planetarium

Cutaway of a small planetarium: a partial dome, a central projector, theatre chairs turned inward, and a foyer of planetary exhibits. Toon-hard shading with a stepped gradient, plus an unlit mode.

## Open

Serve the **repository root** so shared GLBs and the vendored Three.js build resolve. Do not start the server inside this folder.

```bash
cd /path/to/sand3d-scenes
python3 -m http.server 8788 --bind 127.0.0.1
```

- http://127.0.0.1:8788/experiments/sprint-20261110/planetarium/
- `T` toon · `U` unlit
- `?mode=unlit` · `?cam=corner` · `?cam=close`
- `?hud=0` hides the overlay · `?still=1` draws two frames and stops (useful for screenshots)

## Checks

```bash
node --test experiments/sprint-20261110/planetarium/test/layout.test.mjs
```

Chairs are generated from `seating.mjs` (the GLB faces local −Z; rotation aims that face at the projector). The entry aisle is the open wedge toward +Z. A wider gap in the outer ring is the radial aisle.
