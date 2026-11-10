# Indoor greenhouse (prior upgrade)

Cutaway even-span glasshouse: ridge-and-gutter ironwork, raised brick beds, a gravel spine path, back-wall staging, a potting bench, and a sitting nook. Toon-hard shading with a 4-step gradient, hard shadows, and a leaf spotlight cookie for dappled light.

Catalog furniture and pots are symlinks to existing cafe, library, and museum bakes. Foliage, staging, and the roof are procedural. This folder does not modify the shared renderer or the older `greenhouse/` scene.

## Launch

From this directory (the server must be rooted here so the vendor and asset symlinks resolve):

```bash
cd experiments/prior-upgrade-20261110/greenhouse
python3 -m http.server 8789 --bind 127.0.0.1
```

Open `http://127.0.0.1:8789/`.

- `T` toon, `U` unlit
- `?mode=unlit`
- `?cam=corner` looks back through the rafters from the open side
- `?cam=close` is the island bed, ferns, and path bench
- `?hud=0` hides the overlay for screenshots

## Checks

```bash
node --test tests/layout.test.mjs
```

## Gaps

See `refs/GAP.md`. The roof, beds, staging, and plants are authored geometry. Only the bench tools, tea table, chair, stool, shelf, and lamps are scanned catalog meshes.
