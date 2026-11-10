# Reading library

Authored cutaway reading room: tall built-in oak stacks, three window alcoves (carrel, tall sash, window seat), a communal study table, smaller study tables, and two book carts. Toon-hard Three.js, vendored offline. Cool daylight from the alcoves plus warm banker lamps, pendants, and wall sconces.

This scene does not replace `library/`. Furniture GLBs are symlinks to existing sand3d bakes.

## Launch

```bash
cd experiments/sprint-20261110/reading-library
python3 -m http.server 8787 --bind 127.0.0.1
```

Open `http://127.0.0.1:8787/`

`T` toon · `U` unlit · `?mode=unlit` · `?cam=corner` · `?cam=close` · `?hud=0` hides the overlay.

```bash
node --test tests/scene.test.mjs
```

## Zones

- Daylight wall: carrel desk under a window, a tall sash with a bench, a cushioned window seat.
- Stacks floor: built-in bays (one display niche with a globe), communal table, book cart in the aisle.
- Quiet corner: second study desk, square tables, index desk, low book range, catalog lectern.
