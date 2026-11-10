# Small cinema (prior-upgrade)

Richer cutaway of the v1 screening room: ranked theatre chairs split by a **center aisle**, raked landings with stair treads, a framed screen with tied drapes, and a rear foyer/concession.

Shading is Toon-hard (stepped gradient, hard shadows). `U` switches to unlit.

## Launch

From this directory. `vendor/` and the GLBs are **symlinks** into `cinema/` and `cafe/` — do not copy them.

```bash
cd experiments/prior-upgrade-20261110/cinema
python3 -m http.server 8771 --bind 127.0.0.1
```

- http://127.0.0.1:8771/
- `?cam=corner` from the screen, across the seat fronts
- `?cam=close` standing in the center aisle looking at the screen
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
| front | 0.10 m dais | 2 + 2 | shallow arc, center aisle |
| middle | 0.34 m | 3 + 3 | staggered, wider banks |
| rear | 0.60 m | 3 + 3 | rail behind; foyer at the same level |

Walk in through the foyer, down the center aisle steps toward the screen.
