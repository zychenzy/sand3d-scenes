# Fashion design showroom

Small cutaway atelier: a display court (dress form, dressed mannequin, swatch bay, clothing rail), a curtained fitting niche, and a consultation table. The stone inset between them is left clear on purpose.

Catalog meshes (table, chairs, pendant, vase) are symlinked from `workshop/` and `cafe/` bakes. Rails, garments, mannequins, niche, and swatches are procedural in `showroom.js`.

## Open

```bash
cd experiments/sprint-20261110/fashion-showroom
python3 -m http.server 8788 --bind 127.0.0.1
```

http://127.0.0.1:8788/

`T` toon · `U` unlit · `?mode=unlit` · `?cam=corner` · `?cam=close` · `?shot=1` hides the HUD.

The server has to be started in this directory so the `vendor/` and `assets/` symlinks resolve. Do not copy the GLBs.

## Check

```bash
python3 experiments/sprint-20261110/fashion-showroom/tests/check_layout.py
```
