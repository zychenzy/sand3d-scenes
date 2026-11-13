# QA — bespoke tailor atelier

Inspected in Chrome at 1440×900 against a repo-root static server. Shots in `shots/` match the files copied to the review artifacts.

## Layout

`python3 experiments/indoor-20261113/tailor-atelier/tests/check_layout.py`

```
ok — 16 instances, 12 shared GLBs, 6 paths, zones alcove, mirror, alcoveTable, platform, cutting, sewing, rail, books, lectern, toile
```

The test checks room size, standing vs seated table heights, platform height, alcove doorway, no alcove/platform overlap, chair and bench fronts, rail length, shared GLB paths (no local copies, no symlinks), cameras, point lights, and 0.32 m clearance on six paths.

## Loading

All 12 GLBs, `layout.json`, `atelier.js`, and `workshop/vendor/three.module.js` returned HTTP 200. `window.__ready` was true. `window.__errors` was empty.

Console: one 404 for `/favicon.ico`. WebGL `ReadPixels` stall warnings appeared while screenshots were taken. No shader, module, or asset errors.

## Shading

- Default and `?cam=close`: 431 `MeshToonMaterial`, 0 basic.
- `?mode=unlit`: 431 `MeshBasicMaterial`, 0 toon. Windows and pendants stay bright because unlit uses the emissive color.

## What the shots showed, and what changed

First default view put a full-height post in front of the sewing bay and a deep green pier across the alcove. The post was removed. The pier became a slim jamb so the mirror, tape, and FITTING plaque read. The camera moved back and wider (fov 46) so the sewing chair stays in frame and still faces the machine.

The close view's first shears read as two loose bars. They are now a pivot, two blades, and two finger rings on the pattern paper. The cutting stool was pulled clear of the tabletop; it sits at the left end.

Corner view shows the dark alcove as its own volume: mirror, curtain, table, chair, companion seat, and the rail and cloth books beyond. Close view shows the kraft grid, three pattern shapes, shears, the basted form, the navy suit, and the bookcase. Unlit keeps every zone and drops the shadows.

## Still rough

See `refs/GAP.md`. The bookcase is the pale catalog case, the cutting stool is light and modern, and the mirrors do not reflect. Those are visible in the shots and left as catalog limits.
