# Aquarium visitor hall

Cutaway public hall: one near floor-to-ceiling kelp tank on the back wall, three specimen niches on the left, two benches facing the glass, and interpretation signs. Toon-hard Three.js, offline.

## Launch

From this directory (the vendor and GLB symlinks resolve inside the repo):

```bash
cd experiments/sprint-20261110/aquarium-hall
python3 -m http.server 8771 --bind 127.0.0.1
```

Open http://127.0.0.1:8771/

- `T` toon · `U` unlit
- `?mode=unlit`
- `?cam=corner` · `?cam=close`
- `?hud=0` hides the overlay · `?still=1` freezes the fish for a shot

## Check

```bash
python3 tests/scene_check.py
```

Shared runtime and furniture are symlinks (`vendor/` → museum Three.js, bench and flowerpot GLBs). Do not copy those files into this folder.
