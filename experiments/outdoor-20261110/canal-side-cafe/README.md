# Canal-side café

Outdoor terrace on a European canal quay: brick cellar wall, striped awning, stepped mooring, a small boat, and a bridge fragment. Warm afternoon, toon shading by default.

## Run

From the repo root so the vendored Three.js and baked GLB symlinks resolve:

```bash
python3 -m http.server 8765 --bind 127.0.0.1
# http://127.0.0.1:8765/experiments/outdoor-20261110/canal-side-cafe/
```

`T` toon · `U` unlit · `?mode=unlit` · `?cam=corner` · `?cam=close`

## Layout test

```bash
node experiments/outdoor-20261110/canal-side-cafe/test/layout.test.mjs
```

Checks chair facing (table or canal), seat distance, clear quay / door / stair paths, and that the boat’s keel is below the waterline while the gunwale stays under the paving.
