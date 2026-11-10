# Neighbourhood pocket plaza

A street-corner pedestrian plaza. A cafe facade and a brick walk-up hold the north and east edges. The southwest corner stays open to the intersection, with curb ramps on the desire lines. A raised shade-tree island carries a curved bench. Chess, a drinking fountain, bicycle racks, and the cafe threshold sit off those lines.

Serve from the repository root so the shared GLBs and the vendored Three.js resolve.

```bash
cd /path/to/sand3d-scenes
python3 -m http.server 8765 --bind 127.0.0.1
```

Open `http://127.0.0.1:8765/experiments/outdoor-20261110/neighbourhood-pocket-plaza/`

- `T` toon (default), `U` unlit
- `?mode=unlit`
- `?cam=corner` from the open corner
- `?cam=close` on the curved bench and the tree

Layout check, from the repository root:

```bash
python3 experiments/outdoor-20261110/neighbourhood-pocket-plaza/tests/layout_orientation.py
```

References: [refs/SOURCES.md](refs/SOURCES.md). What those photos do not cover: [refs/GAP.md](refs/GAP.md). Model credits: [ATTRIBUTIONS.md](ATTRIBUTIONS.md).
