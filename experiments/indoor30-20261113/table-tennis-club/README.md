# Nettleton table tennis club

Three ITTF tables in a club hall. Each bay is 10 m × 5 m inside 76 cm surrounds, with a south gate. Scorer benches sit on the east side of the net and face the table. The east gallery holds the paddle rack, ball baskets, a wire cart, and the duty desk.

## Open

From the repo root:

```bash
python3 -m http.server 8765 --bind 127.0.0.1
```

<http://127.0.0.1:8765/experiments/indoor30-20261113/table-tennis-club/>

`T` toon · `U` unlit · `?mode=unlit` · `?cam=corner` · `?cam=detail` (alias `close`) · `?hud=0`

Layout and table checks (no browser):

```bash
node --test experiments/indoor30-20261113/table-tennis-club/test_club_spec.mjs
```

Shared meshes and Three.js r170 are referenced from the repo root (`museum/`, `library/`, `cafe/`, `cowork/`, `gym/vendor`). The table, paddles, basket, and cart are baked in this folder. Do not copy them.
