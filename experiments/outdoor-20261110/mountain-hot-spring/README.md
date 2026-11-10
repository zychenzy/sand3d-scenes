# Mountain hot spring

Open-air mountain onsen at blue hour: an irregular stone pool cut into a terrace, a timber washing shelter, reed and bamboo screens, a short plank bridge over the overflow, and a mountain backdrop.

Water is a mineral basin. The surface sits below the coping, and the floor, seat ledge, and submerged boulders stay visible through it.

## Run

From the repo root, so the vendored Three.js symlink and catalog GLBs resolve:

```bash
python3 -m http.server 8787 --bind 127.0.0.1
```

Open `http://127.0.0.1:8787/experiments/outdoor-20261110/mountain-hot-spring/`

`T` toon · `U` unlit · `?mode=unlit` · `?cam=corner` · `?cam=close` · `?shot=1` hides the HUD.

## Checks

```bash
python3 experiments/outdoor-20261110/mountain-hot-spring/tests/test_layout.py
node experiments/outdoor-20261110/mountain-hot-spring/tests/test_geom.mjs
```

Photo notes: `refs/SOURCES.md`, `refs/GAP.md`. Credits: `ATTRIBUTIONS.md`.
