# Neighborhood diner

Cutaway retro diner: a back-to-back booth bank, two generous tables, and a stool counter with a pass shelf and menu. Toon-hard Three.js, same stepped gradient as the other rooms. Furniture GLBs are referenced from `restaurant/` and `cafe/`; they are not copied.

## Launch

Serve the **repo root** so the shared GLBs and the vendored Three.js resolve.

```bash
cd /path/to/sand3d-scenes
python3 -m http.server 8765 --bind 127.0.0.1
```

Open `http://127.0.0.1:8765/experiments/sprint-20261110/diner/`

- `?mode=unlit` flat color check
- `?cam=corner` from the entry side
- `?cam=close` counter, pass shelf, and menu
- Keys `T` / `U` switch toon and unlit

## Check

```bash
python3 experiments/sprint-20261110/diner/test_layout.py
```

The test checks that booth backs meet, chairs face their tables, stools face the counter, and every GLB path points at an existing shared file.
