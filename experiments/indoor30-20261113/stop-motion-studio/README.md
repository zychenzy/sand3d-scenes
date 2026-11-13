# Stop-motion studio (Three.js)

A miniature practical set on a raised animation table, with a motion-control camera, small flags, a puppet fabrication bench, an armature rack, and a frame-monitor desk. Human chairs, a pencil, and a jam jar sit next to the 18 cm puppet so the scale reads.

## Open

```bash
cd experiments/indoor30-20261113/stop-motion-studio
python3 -m http.server 8796 --bind 127.0.0.1
```

`http://127.0.0.1:8796/`

`T` toon · `U` unlit · `?mode=unlit` · `?cam=corner` · `?cam=detail`

GLBs and the Three.js vendor folder are relative symlinks into existing scene kits. Serve this directory. The page does not use a CDN.

## Check

```bash
python3 tests/test_layout.py
node tests/shoot.mjs
```

`shoot.mjs` needs Chrome and the server above. It writes `shots/toon_default.png`, `shots/toon_corner.png`, `shots/toon_detail.png`, and `shots/unlit_default.png`.
