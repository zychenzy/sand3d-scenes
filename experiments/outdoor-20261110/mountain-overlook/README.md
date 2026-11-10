# Mountain overlook

Sunrise hiking overlook: stone switchback, topographic outcrop, cantilevered timber deck with a bench facing the peaks, and a small open-front trail shelter off the path.

Toon is the default. Unlit is the flat color pass.

## Run from the repo root

```bash
python3 -m http.server 8791 --bind 127.0.0.1 --directory experiments/outdoor-20261110/mountain-overlook
```

Open http://127.0.0.1:8791/

`T` toon · `U` unlit · `?mode=unlit` · `?cam=corner` · `?cam=close`

The bench GLB and Three.js r170 are symlinks back to `museum/` and `greenhouse/vendor`. Serving this directory (not opening the html as a file) is what makes those relative links resolve.

## Tests

```bash
node --test experiments/outdoor-20261110/mountain-overlook/test/orientation.test.mjs
```

Checks the climb, step risers, switchbacks, deck cantilever, bench and shelter facing the view, path clearance, pine variation, and camera placement.
