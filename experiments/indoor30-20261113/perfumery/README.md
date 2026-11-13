# Perfumery blending atelier

Cutaway room for a nose: a semicircular scent organ, a compounding bench (balance, pipettes, blotters), a seated consultation table, a formula archive, and a brass extract hood. Hard-stepped toon by default. `U` switches to real unlit (`MeshBasicMaterial`).

This is not the science lab and not the cafe. No burners, flasks, microscopes, espresso, or menu boards.

## Open

From the repository root, so the vendor and catalog symlinks resolve:

```bash
cd experiments/indoor30-20261113/perfumery
python3 -m http.server 8766 --bind 127.0.0.1
```

http://127.0.0.1:8766/

`T` toon · `U` unlit · `?mode=unlit` · `?cam=corner` · `?cam=detail` · `?shot=1` hides the HUD.

## Check

```bash
node --test experiments/indoor30-20261113/perfumery/tests/check_layout.mjs
node experiments/indoor30-20261113/perfumery/tests/load_browser.mjs
```

The browser test loads the page, asserts no console errors, and writes `shots/toon_default.png`, `toon_corner.png`, `toon_close.png`, `toon_detail.png`, and `unlit_default.png`. Close and detail share one camera on the bench.

Catalog GLBs are symlinks into `library/`, `cafe/`, `workshop/`, and `museum/`. Flacons, the balance, and the pipette are small bakes from `bake_assets.py` in this folder. Do not copy shared meshes.
