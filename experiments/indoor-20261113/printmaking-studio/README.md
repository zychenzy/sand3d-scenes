# Intaglio printmaking studio

Cutaway single-printer etching shop. A floor-model roller press sits in the middle with the bed running east-west and the spoked wheel on the near side. East of it, across a clear aisle, is a glass inking slab. Paper soaking, flat files, and portfolios stay on the back wall. Two drying racks face the open front. The wash alcove and a lidded ferric cart are on the east wall, off the paper path.

Toon-hard is the default. `U` switches to unlit (`MeshBasicMaterial`).

## Open

Shared GLBs and the vendored renderer live elsewhere in the repo. Start the server at the **repository root**.

```bash
python3 -m http.server 8873 --bind 127.0.0.1
```

- http://127.0.0.1:8873/experiments/indoor-20261113/printmaking-studio/
- `T` toon · `U` unlit
- `?mode=unlit`
- `?cam=corner` — wash alcove, ferric cart, inking slab
- `?cam=close` — press bed, plate, blankets, wheel
- `?hud=0` or `?shot=1` hides the overlay

## Check

```bash
node --test experiments/indoor-20261113/printmaking-studio/tests/layout.test.mjs
```

Screenshots: `shots/toon_default.png`, `shots/toon_corner.png`, `shots/toon_close.png`, `shots/unlit_default.png`.

Credits: `ATTRIBUTIONS.md`. Gaps: `refs/GAP.md`. Links: `refs/SOURCES.md`. What was actually checked: `QA.md`.
