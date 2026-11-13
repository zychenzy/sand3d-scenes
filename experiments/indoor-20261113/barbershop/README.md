# King Street barbershop

Cutaway three-chair shop. Chairs face a bulb-lit mirror wall, a wash chair reclines into a basin on the left wall, and a loveseat, bench, and coffee table sit off a 1.1 m runner.

Catalog meshes (loveseat, coffee table, bench, shelf, register, lamp, pendant, pot, tonic jars) are symlinks into `ktv/`, `museum/`, `library/`, and `cafe/`. Chairs, mirrors, basin, pole, and counters are procedural. Three.js is the vendored cafe copy, linked, not duplicated.

## Open

```bash
cd experiments/indoor-20261113/barbershop
python3 -m http.server 8863 --bind 127.0.0.1
```

http://127.0.0.1:8863/

`T` toon (default) · `U` unlit · `?mode=unlit` · `?cam=corner` · `?cam=close` · `?shot=1` hides the HUD.

Serve this directory so the `vendor/` and `assets/` symlinks resolve. Do not copy the GLBs.

## Check

```bash
python3 experiments/indoor-20261113/barbershop/tests/check_layout.py
node experiments/indoor-20261113/barbershop/tests/render_shots.mjs
```
