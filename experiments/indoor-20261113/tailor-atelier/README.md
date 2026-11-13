# Marlow bespoke atelier

One cutaway tailor workroom, 9.4 × 7.4 × 3.32 m. The standing cutting table (3.2 × 1.5 m at 0.92 m) carries a laid bolt, a gridded pattern marked CUT 2 / GRAIN, shears, chalk, a tape, a yardstick, and weights. Two seated sewing tables (0.76 m) each hold a baked vintage machine, spools, and a task lamp. Chairs face the needle. The north wall is a bolt rack. The west end is a fitting platform with a toile, a jacket form, a three-panel mirror, and a measurement card. Pressing sits under the windows: padded board, tailor's ham, sleeve roll, and a baked iron.

Shading defaults to toon-hard (`MeshToonMaterial`, 4-step nearest gradient, `BasicShadowMap`). `U` switches the same meshes to `MeshBasicMaterial`. Bulbs and the mirror glass stay bright. Three.js r170 and `OrbitControls` are vendored by symlink inside this folder. The page has no network imports.

## Launch

Serve from the repository root so the symlinks resolve.

```bash
cd /path/to/sand3d-scenes
python3 -m http.server 8765 --bind 127.0.0.1
```

- http://127.0.0.1:8765/experiments/indoor-20261113/tailor-atelier/
- `?cam=corner` — pressing board and fitting mirror
- `?cam=close` — pattern on the cutting table
- `?mode=unlit` — flat color / form check
- `?hud=0` — hide the overlay (used for the committed shots)
- `T` toon · `U` unlit

```bash
node --test experiments/indoor-20261113/tailor-atelier/tests/layout.test.mjs
```

Shots: `shots/toon_default.png`, `shots/toon_corner.png`, `shots/toon_close.png`, `shots/unlit_default.png`.

Asset credits: `ATTRIBUTIONS.md`. What was not baked: `refs/GAP.md`. Critique notes: `PRIOR_INDOOR_FEEDBACK.md`.
