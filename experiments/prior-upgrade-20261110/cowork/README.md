# Shared study / cowork (prior-upgrade 20261110)

Authored cutaway cowork: chalkboard presentation wall, unequal locker bays, three window sashes, and four desk clusters that are not a cloned grid. Toon-hard Three.js, vendored offline. Cool window wash plus warm task lamps, pendants, and board spots.

This scene does not replace `cowork/`. Furniture GLBs are symlinks to existing sand3d bakes.

## Launch

```bash
cd experiments/prior-upgrade-20261110/cowork
python3 -m http.server 8773 --bind 127.0.0.1
```

Open `http://127.0.0.1:8773/`

`T` toon · `U` unlit · `?mode=unlit` · `?cam=corner` · `?cam=close` · `?hud=0` hides the overlay.

```bash
node --test tests/scene.test.mjs
```

## Zones

- Board wall: chalkboard niche, chalk tray, presenter lectern, window sashes to the right.
- Window hot-desks: two staggered study desks facing the sashes.
- Focus alcove: two desks facing the lockers, not the board.
- Workshop pair: two desks facing the chalkboard, offset, with a spine aisle.
- Island: two desks facing each other on a rug.
- Huddle square + lounge coffee table, plants and storage density along the left wall.
