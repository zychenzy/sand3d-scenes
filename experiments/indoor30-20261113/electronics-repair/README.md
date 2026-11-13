# Neighborhood electronics repair (Three.js + sand3d)

Walk-in phone and board shop. A microsoldering bench sits against the back wall, a labeled parts cabinet stands in the middle, a test bench is on the right, and a service counter faces the street window. The aisle from the counter to the benches stays open.

## Open

Serve this directory so the symlinked vendor and GLBs resolve:

```bash
cd experiments/indoor30-20261113/electronics-repair
python3 -m http.server 8813 --bind 127.0.0.1
```

`http://127.0.0.1:8813/`

`T` hard-step toon · `U` true unlit (`MeshBasicMaterial`) · `?mode=unlit` · `?cam=corner` · `?cam=detail` · `?shot=1` hides the HUD.

## Check

```bash
python3 experiments/indoor30-20261113/electronics-repair/tests/layout_checks.py
node experiments/indoor30-20261113/electronics-repair/tests/render_shots.mjs
```

Catalog GLBs and `vendor/` are symlinks into `cafe/` and `library/`. The three bakes in this folder (`workbench`, `soldering_iron`, `multimeter`) are the only new meshes. Do not copy the shared files.
