# Contemporary annex

A cutaway contemporary gallery: west alcove, central nave, and east sculpture court, joined by two portals. Long oak benches face the walls. Plinth sculptures, a walnut pedestal, framed works, and aimed track spots. No sofas.

## Launch

Asset paths reach the shared GLBs, so serve the repo root (not this folder alone):

```bash
cd /path/to/sand3d-scenes
python3 -m http.server 8771 --bind 127.0.0.1
```

- http://127.0.0.1:8771/experiments/sprint-20261110/gallery/
- `?cam=corner` · `?cam=close` · `?mode=unlit`
- Keys: `T` toon, `U` unlit. Drag to orbit.

## Check

```bash
node --test experiments/sprint-20261110/gallery/tests/layout.test.mjs
```

Three.js is the vendored r170 module under `museum/vendor` (import map). No CDN.
