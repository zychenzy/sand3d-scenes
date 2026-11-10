# Hearth — neighborhood bakery

Cutaway bakery: bread wall, pastry counter, open preparation bay, and a window cafe. Toon-hard Three.js, vendored offline. Shared GLBs are referenced, not copied.

## Open

The page loads furniture from `cafe/`, `restaurant/`, `workshop/`, and `cowork/`, and three.js from `workshop/vendor/`. Serve the **repository root**:

```bash
python3 experiments/sprint-20261110/bakery/serve.py
# http://127.0.0.1:8791/experiments/sprint-20261110/bakery/
```

Equivalent:

```bash
python3 -m http.server 8791 --bind 127.0.0.1
# from the sand3d-scenes root, then open the URL above
```

`T` toon · `U` unlit · `?mode=unlit` · `?cam=corner` · `?cam=close` · `?shot=1` hides the HUD.

## Check

```bash
python3 experiments/sprint-20261110/bakery/test_layout.py
```

Screenshots: `shots/toon_default.png`, `shots/toon_corner.png`, `shots/toon_close.png`, `shots/unlit_default.png`.
