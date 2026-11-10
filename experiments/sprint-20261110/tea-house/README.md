# Contemporary tea house

Cutaway tasting room: a communal table on a walnut dais, a stone preparation counter, and two layers of wood screens in front of the garden window.

## Open

From the repository root (asset and vendor symlinks stay inside the tree):

```bash
python3 -m http.server 8791 --bind 127.0.0.1
```

http://127.0.0.1:8791/experiments/sprint-20261110/tea-house/

`T` toon · `U` unlit · `?mode=unlit` · `?cam=corner` · `?cam=close` · `?hud=0` hides the overlay.

Serving from this folder also works when the HTTP server follows the `assets/` and `vendor/` symlinks.

## Check

```bash
python3 experiments/sprint-20261110/tea-house/tests/test_layout.py
```

## Chair axis

The wooden dining chair faces local **+Z** (backrest toward −Z). `rotationY = 0` looks toward +Z. Side chairs use ±π/2.
