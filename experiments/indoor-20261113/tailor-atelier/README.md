# Bespoke tailor atelier

A working Savile Row-style workroom. The customer fitting alcove is a darker mirror room off the front-left aisle; the three brass-framed panels are planar reflections, and a low board marks where the customer stands. The tailor's fitting platform is a raised dais with a basted process jacket and a finished suit, both shaped rather than boxed. The cutting table is standing height. One sewing bay sits on the back right. Suits hang on the rear left wall; cloth books stand on the back wall. Oxblood runners mark the paths between those rooms. Floorboards are about 12 cm wide.

This is not the weaving studio (no looms, bolt racks, or dye wall) and not the fashion showroom (no display court, consultation pair, or stone pause).

Catalog furniture is referenced in place from the repo root. Tailor tools, garments, mirrors, and the shell are procedural. Three.js is the vendored build in `workshop/vendor/`.

## Open

Serve the repository root so the shared GLB paths resolve.

```bash
cd /path/to/sand3d-scenes
python3 -m http.server 8765 --bind 127.0.0.1
```

- http://127.0.0.1:8765/experiments/indoor-20261113/tailor-atelier/
- `?cam=corner` — into the fitting alcove
- `?cam=close` — pattern table, shears, and the platform behind it
- `?mode=unlit` — flat color check
- `?hud=0` — hide the overlay
- `T` toon · `U` unlit

## Check

```bash
python3 experiments/indoor-20261113/tailor-atelier/tests/check_layout.py
```

See `QA.md` for the browser pass. Gaps: `refs/GAP.md`. Credits: `ATTRIBUTIONS.md`.
