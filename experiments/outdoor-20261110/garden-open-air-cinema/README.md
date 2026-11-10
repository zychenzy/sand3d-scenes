# Garden open-air cinema

A walled garden at dusk, set up as a summer cinema. A tensile screen hangs on the far wall. Four staggered rows of folding deckchairs face it, with a center aisle and two side paths left clear. A timber projector booth and a covered cable run occupy the right aisle. A drinks cart sits in a planted bay on the left, off the through-path. Festoon bulbs follow the walls and the seating.

## Run

Serve from the repository root so the Three.js vendor link and the cafe asset links resolve:

```bash
python3 -m http.server 8791 --bind 127.0.0.1
```

Open http://127.0.0.1:8791/experiments/outdoor-20261110/garden-open-air-cinema/

- Drag to orbit
- `T` toon (default), `U` unlit
- `?mode=unlit` `?cam=corner` `?cam=close` `?hud=0`

## Checks

```bash
node experiments/outdoor-20261110/garden-open-air-cinema/tests/facing.mjs
```

The last run reported 32/32 deckchairs facing the screen (minimum facing dot 0.97) and clear default and corner sightlines. `tests/shoot.mjs` recaptures the four review views with headless Chrome while that server is up. It is a local check, not part of the scene.

Three.js comes from `cinema/vendor` through a relative symlink. Mugs, the thermos, jam jars, and flowerpots come from `cafe/assets` the same way. See `ATTRIBUTIONS.md` and `refs/SOURCES.md`.
