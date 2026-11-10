# Maker workshop (Three.js + sand3d)

Cutaway makerspace: tool pegboard and standing bench, electronics pair, parts bins, a desktop 3D printer, and a communal assembly table.

Catalog GLBs are referenced from `cowork/`, `workshop/`, and `cafe/`. Three.js is the shared workshop vendor. Nothing in this folder copies those files.

## Open

From the repo root, so shared GLBs and the vendored renderer resolve:

```bash
python3 -m http.server 8766 --bind 127.0.0.1
```

http://127.0.0.1:8766/experiments/sprint-20261110/makerspace/

`T` toon · `U` unlit · `?mode=unlit` · `?cam=corner` · `?cam=close` · `?hud=0` hides the overlay · `?debug=1` logs furniture bounds.

## Check

```bash
python3 experiments/sprint-20261110/makerspace/tests/test_layout.py
```
