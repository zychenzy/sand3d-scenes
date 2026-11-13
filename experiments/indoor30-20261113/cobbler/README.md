# Cobbler workshop

Cutaway shoe-repair shop: a seated repair bench with a lasting jack, a stitching horse, a compact sole-finishing wheel, wall lasts, a numbered ticket rack, and a standing handoff counter.

Shared chairs, the waiting bench, lamps, jars, the till, and the plant are referenced from existing scene GLBs. Lasts, shoes, the bench, the finisher, peg tools, and the ticket rack are procedural. The catalog has no cobbler tools.

## Launch

The page loads vendored Three.js and GLBs by relative path. Serve the repository root.

```bash
cd /path/to/sand3d-scenes
python3 -m http.server 8796 --bind 127.0.0.1
```

- http://127.0.0.1:8796/experiments/indoor30-20261113/cobbler/
- `?cam=corner` — open right side, across the bench
- `?cam=close` — stitch horse, welt, and awl
- `?mode=unlit` — `MeshBasicMaterial` flat color
- `?hud=0` — hide the overlay
- `T` toon · `U` unlit

Default shading is a four-stop hard toon gradient. The shadow stop is lifted so leather and iron do not crush to black.

```bash
python3 experiments/indoor30-20261113/cobbler/tests/check_layout.py
node experiments/indoor30-20261113/cobbler/tests/render_shots.mjs
```

## Gaps

See `refs/GAP.md`. Photo links: `refs/SOURCES.md`. Credits: `ATTRIBUTIONS.md`.
