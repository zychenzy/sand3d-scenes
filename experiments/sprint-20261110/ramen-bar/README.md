# Ramen bar

Compact cutaway ramen shop. One wood counter: five metal stools on the guest side face the stock pots, steel range, and hood. Back prep and wall shelves are storage. The left foreground is the storefront — noren, lantern, lattice window, menu.

Toon hard (4-step gradient, hard shadows) with a local adapter in `scene_lib.js`. Shared cafe GLBs are referenced, not copied. Three.js is the vendored r170 build.

## Open

Serve from the **repo root** so the relative GLB and three.js paths resolve:

```bash
cd /path/to/sand3d-scenes
python3 -m http.server 8771 --bind 127.0.0.1
```

http://127.0.0.1:8771/experiments/sprint-20261110/ramen-bar/

`T` toon · `U` unlit · `?mode=unlit` · `?cam=corner` · `?cam=close` · `?shot=1` hides the HUD.

## Check

```bash
python3 experiments/sprint-20261110/ramen-bar/test_layout.py
```
