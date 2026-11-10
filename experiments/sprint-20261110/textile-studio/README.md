# Weaving & sewing studio

Cutaway textile workshop: floor loom and rigid-heddle loom on an indigo rug, a layout table for cutting, and two sewing stations. Cloth storage (bolt rack, upright bin, folded chest) lines the left wall. Hanging samples and two thread racks carry one natural-dye palette.

Shared furniture (chairs, benches, lamps, notions table, mug, plant) is referenced from existing scene GLBs. Looms, machines, racks, and the cutting table are procedural because the catalog has no textile tools.

## Launch

The page loads vendored Three.js and GLBs by relative path, so the server root must be the repository — not this folder.

```bash
cd /path/to/sand3d-scenes
python3 -m http.server 8788 --bind 127.0.0.1
```

- http://127.0.0.1:8788/experiments/sprint-20261110/textile-studio/
- `?cam=corner` — open right corner
- `?cam=close` — floor-loom breast beam
- `?mode=unlit` — flat color check
- `?hud=0` — hide the overlay
- `T` toon · `U` unlit

```bash
python3 experiments/sprint-20261110/textile-studio/tests/check_layout.py
```

## Gaps

See `refs/GAP.md`. Asset credits: `ATTRIBUTIONS.md`.
