# Woodland picnic

Shaded afternoon picnic grove on a rocky creek: three staggered tables, a timber footbridge, a park grill with a prep counter, trail signage, and fallen-log seats.

Toon hard is the default. `U` switches to unlit, `T` back to toon.

## Run from the repo root

```bash
python3 -m http.server 8788 --bind 127.0.0.1
```

Open:

- http://127.0.0.1:8788/experiments/outdoor-20261110/woodland-picnic/
- `?cam=corner`
- `?cam=close`
- `?mode=unlit`
- `?hud=0` hides the overlay for shots

Vendor Three.js and the mug, thermos, and jam jar are symlinks into the existing cafe and greenhouse scenes, so the server has to be started at the repo root (or the symlinks have to resolve).

## Checks

```bash
python3 experiments/outdoor-20261110/woodland-picnic/tests/test_layout.py
```

Photo sources and what this grove does not copy are in `refs/SOURCES.md` and `refs/GAP.md`.
