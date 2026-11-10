# Sculpture park

Designed contemporary sculpture garden. A bronze ribbon stands over an irregular reflecting basin. A limestone coil sits on the west mound. Weathered-steel fins stand in an east gravel court. A gravel loop circles the basin. Seats face the works. Soft overcast daylight, Toon hard by default.

## Run from the repo root

```bash
cd experiments/outdoor-20261110/sculpture-park
python3 -m http.server 8791 --bind 127.0.0.1
```

Open http://127.0.0.1:8791/

`T` toon · `U` unlit · `?mode=unlit` · `?cam=corner` · `?cam=close`

The page loads `./vendor` and `./assets` (symlinks into `greenhouse/vendor` and `museum/assets`). Serve this directory so those relative paths resolve. Do not open the file directly.

## Layout check

```bash
python3 experiments/outdoor-20261110/sculpture-park/test_layout.py
```

## Shots

`shots/toon_default.png`, `shots/toon_corner.png`, `shots/toon_close.png`, `shots/unlit_default.png`.
