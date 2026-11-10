# Indoor conservatory

Cutaway barrel-vault conservatory: iron ribs and glazed bays, three raised brick beds, a potting bench, and a sitting nook. Toon-hard shading with a 4-step gradient, hard shadows, and a leaf spotlight cookie for dappled light.

Catalog furniture and pots are symlinks to existing cafe, library, and museum bakes. Foliage and the vault are procedural. This folder does not modify the shared renderer or the older `greenhouse/` scene.

## Launch

From this directory (the server must be rooted here so the vendor and asset symlinks resolve):

```bash
cd experiments/sprint-20261110/conservatory
python3 -m http.server 8791 --bind 127.0.0.1
```

Open `http://127.0.0.1:8791/`.

- `T` toon, `U` unlit
- `?mode=unlit`
- `?cam=corner` looks back through the vault from the open side
- `?cam=close` is the island bed, ferns, and canopy trunk
- `?hud=0` hides the overlay for screenshots

## Checks

```bash
node --test tests/layout.test.mjs
```

## Gaps

See `refs/GAP.md`. The vault, beds, and plants are authored geometry. Only the bench tools, tea table, chair, stool, shelf, and lamps are scanned catalog meshes.
