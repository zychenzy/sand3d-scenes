# Orchard gathering terrace

Late-summer harvest place on a sloping orchard. A long table sits under a grape pergola on the middle terrace. A screw press, crates, and barrels are the work edge to the east. A small stone shed is the edge to the west. A path climbs from the meadow through the terraces into the trees.

Serve from the repository root so the asset symlinks resolve.

```bash
python3 -m http.server 8765 --bind 127.0.0.1
```

Open `http://127.0.0.1:8765/experiments/outdoor-20261110/orchard-gathering-terrace/`

`T` toon · `U` unlit · `?mode=unlit` · `?cam=corner` · `?cam=close` · `?shot=1` hides the HUD.

## Checks

From the repository root:

```bash
node --test experiments/outdoor-20261110/orchard-gathering-terrace/tests/layout.test.mjs
node experiments/outdoor-20261110/orchard-gathering-terrace/tests/render.mjs
```

The render script needs Playwright and a Chrome binary. It serves the repo root, waits for `window.__ready`, and writes `shots/toon_default.png`, `shots/toon_corner.png`, `shots/toon_close.png`, and `shots/unlit_default.png`.

Layout tests: 6 passed (files and symlinks, camera framing, chairs facing the table, mixed planting, path clearance, stair gaps).

Last headless render (1440×900, SwiftShader): 20 trees, 414 meshes, `window.__audit.issues` empty on all four views. Frame luma stayed in range (default mean 111, std 66, blown 0; close mean 71, black fraction 0.005; unlit mean 157).
