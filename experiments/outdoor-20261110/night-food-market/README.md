# Night food market

Compact East Asian open-air night market. Four stalls — grill, noodles, tea, produce — under fabric awnings, with lantern strings, a customer aisle, communal tables, and a service lane behind the counters.

Toon hard is the default. `U` / `?mode=unlit` switches to unlit materials so the awning colors, signs, and food read without the night lighting.

## Open

From the repo root, so the three.js vendor symlink and GLB symlinks stay inside the served tree:

```bash
python3 -m http.server 8791 --bind 127.0.0.1
```

http://127.0.0.1:8791/experiments/outdoor-20261110/night-food-market/

`?mode=unlit` · `?cam=corner` · `?cam=close` · `?shot=1` hides the HUD.

## Checks

```bash
node experiments/outdoor-20261110/night-food-market/tests/layout.test.mjs
```

Chairs face their table, tables stay out of the aisle, and the staff cut lines up with the gap between the noodle stall and the tea stall.
