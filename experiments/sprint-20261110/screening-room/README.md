# Boutique screening room

A cutaway private house: framed screen and tied drapes, three stepped rows of theatre chairs, side aisles with stair lights, acoustic panels, and an entry niche on the left wall at the rear cross-aisle.

Shading is Toon-hard (stepped gradient, hard shadows). `U` switches to unlit.

## Launch

From this directory. `vendor/` and the two GLBs are symlinks into `cinema/` — do not copy them.

```bash
cd experiments/sprint-20261110/screening-room
python3 -m http.server 8779 --bind 127.0.0.1
```

- http://127.0.0.1:8779/
- `?cam=corner` from the screen-left, across the seat fronts
- `?cam=close` aisle profile toward the screen
- `?mode=unlit`
- `?hud=0` hides the overlay
- keys `T` / `U`

## Facing check

```bash
python3 tests/test_facing.py
```

The chair program places `back_surface` at local +Z and the cushion toward −Z. With the screen on the −Z wall, `rotationY` stays near 0. A turn of π points the backrest at the screen and fails the test. The page also measures the loaded meshes (`window.__facing`).

## Seats

| row | floor | count | note |
|-----|-------|-------|------|
| front | 0.12 m dais | 4 | shallow arc |
| middle | 0.34 m | 5 | staggered between the front seats |
| loge | 0.62 m | 4 | two pairs with a center gap |

Entry niche floor matches the loge so you come in at the back and walk down the aisles.
