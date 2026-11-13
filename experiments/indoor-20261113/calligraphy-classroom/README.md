# Calligraphy classroom

A cutaway practice room: six broad writing desks face a low platform, a demonstration table, and three teaching scrolls (人, 永, 天). Each desk has a felt mat, xuan sheet, inkstone, paperweight, brush rest, and brush. Paper and brushes are stored along the left wall.

Shared GLBs and the vendored Three.js runtime are symlinks. Do not copy them. Student desks are built in this scene because the catalog study desk is 0.37 m wide and the school desk is a 0.60 × 0.44 m metal top.

## Open

From the repo root, so the asset symlinks resolve:

```bash
python3 -m http.server 8937 --bind 127.0.0.1
```

http://127.0.0.1:8937/experiments/indoor-20261113/calligraphy-classroom/

`T` toon (default) · `U` unlit · `?mode=unlit` · `?cam=corner` · `?cam=close` · `?hud=0` hides the label.

Toon uses `MeshToonMaterial` with a four-step gradient map. Unlit replaces those materials with `MeshBasicMaterial` and keeps the maps.

## Check

From the repo root:

```bash
python3 experiments/indoor-20261113/calligraphy-classroom/tests/test_layout.py
```

With the server above still running:

```bash
node experiments/indoor-20261113/calligraphy-classroom/tests/render_qa.mjs
```

The layout test checks chair facing, elbow gaps, the cross aisle, knee clearance, and that brushes and inkstones stay on the writing surface. The render test loads default, corner, close, and unlit, and fails on console errors, failed requests, or a wrong material mode. Review shots land in `shots/`.
