# Bloom florist

Cutaway flower shop: glazed street front, tiered display, bouquet workbench, wrapping counter. Toon-hard Three.js. Furniture GLBs are symlinks to existing sand3d bakes. Plant silhouettes are procedural and are not copies of one pot.

## Open

From this directory (the HTTP server follows the asset and vendor symlinks):

```bash
cd experiments/sprint-20261110/florist
python3 -m http.server 8794 --bind 127.0.0.1
```

http://127.0.0.1:8794/

`T` toon · `U` unlit · `?mode=unlit` · `?cam=corner` · `?cam=close` · `?hud=0` hides the overlay.

## Test

```bash
node --test experiments/sprint-20261110/florist/test/layout.test.mjs
```

Run that from the repo root.
