# Quill & Spine — independent bookshop

Cutaway bookshop: glazed shopfront with window seats, a central display island, a double-sided gondola, wall stacks, and a checkout. Toon-hard Three.js, vendored runtime via symlinks (no copied GLBs).

## Launch

Serve from this directory so the asset symlinks resolve:

```bash
cd experiments/sprint-20261110/bookstore
python3 -m http.server 8777 --bind 127.0.0.1
```

Open `http://127.0.0.1:8777/`.

`T` toon · `U` unlit · `?mode=unlit` · `?cam=corner` · `?cam=close` · `?hud=0` hides the label.

## Checks

```bash
node tests/layout_invariants.mjs
```

Screenshots (needs a displayless Chrome with WebGL):

```bash
node tools/capture.mjs "http://127.0.0.1:8777/?hud=0" shots/toon_default.png
```
