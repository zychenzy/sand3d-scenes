# 巷洗 · neighbourhood laundromat

Cutaway self-service laundromat, 14.2 × 9.6 × 3.2 m. Eight front-load washers along the back wall, six tumble dryers along the left wall, one stacked combo at the back-right, a glass-front pod vendor, a coin-change machine, and a detergent shelf. Two standing folding tables sit in the middle. A row of folding chairs faces the machines; a backless bench and a clothes airer sit on the open side. Wire carts, baskets, and a floor basin fill the aisles without blocking them.

Shop name is fictional (巷洗 / LANE WASH).

Toon is the default: `MeshToonMaterial`, a stepped gradient (`NearestFilter`), and `PCFHardShadowMap`. `?mode=unlit` swaps to `MeshBasicMaterial` (flat color, no lights, no shadows). Three.js and OrbitControls are the workshop vendor, symlinked here. Nothing is fetched at runtime.

## Launch

Serve the **repo root** so the bench symlink and the vendor symlink resolve.

```bash
cd /path/to/sand3d-scenes
python3 -m http.server 8765 --bind 127.0.0.1
```

Open `http://127.0.0.1:8765/experiments/indoor-20261113/laundromat/`

- `?mode=unlit` — flat color, for reading geometry
- `?cam=corner` — low view along the washer bank
- `?cam=close` — folding table, basket, machine 04
- `?shot=1` — hides the HUD (used for the committed screenshots)
- Keys `T` / `U` switch toon and unlit

## Check

```bash
node --test experiments/indoor-20261113/laundromat/tests/layout.test.mjs
```

The test checks bank counts, which way machines and chairs face, standing-table and seat heights, aisle clearance, and that every GLB and the vendored Three.js resolve with no CDN.

Screenshots in `shots/` were captured from that server with headless Chrome (swiftshader), 1440×900, HUD hidden.
