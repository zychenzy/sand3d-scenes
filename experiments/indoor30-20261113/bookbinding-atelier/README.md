# Bookbinding atelier (Three.js + sand3d)

Cutaway hand bindery under a full ceiling. Sewing frames and a lying press share a seated bench. A standing press, a board-shear guillotine, flat-file paper drawers, a drying rack, and a leather / finishing-stove wall are separate stations. Four-leg work stools sit beside the press and the shear. Paste stays on the forwarding bench, away from the paper. Establishing cameras stand inside the room.

Catalog GLBs are referenced from `workshop/`, `cafe/`, and `cowork/`. Three.js is the shared workshop vendor. Nothing in this folder copies those files.

## Open

From the repo root, so the shared meshes and the vendored renderer resolve:

```bash
python3 -m http.server 8765 --bind 127.0.0.1
```

http://127.0.0.1:8765/experiments/indoor30-20261113/bookbinding-atelier/

`T` toon · `U` unlit · `?mode=unlit` · `?cam=corner` · `?cam=close` · `?hud=0` hides the overlay.

## Check

```bash
python3 experiments/indoor30-20261113/bookbinding-atelier/tests/test_layout.py
node experiments/indoor30-20261113/bookbinding-atelier/tests/render_shots.mjs
```

The render script needs the server above. It writes `shots/toon_default.png`, `shots/toon_corner.png`, `shots/toon_close.png`, and `shots/unlit_default.png`.
