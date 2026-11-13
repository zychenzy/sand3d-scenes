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

- Default toon: 575 `MeshToonMaterial`, 0 basic, 3 mirror `ShaderMaterial`s (kept in both modes so the glass stays a reflection).
- `?mode=unlit`: 575 `MeshBasicMaterial`, 0 toon, the same 3 mirror shaders. Windows and pendants stay bright because unlit uses the emissive color. The mirror pass renders after the swap, so the glass reflects the unlit room.

## What the shots showed, and what changed

The first review called the suits stacked boxes, the floorboards too wide, and the mirror a dull panel. The alcove also read as a desk.

Floorboards are now about 12 cm wide, with butt joints and a normal map on the top face only. Jacket bodies are lathed, with shoulder caps, a bent sleeve, a collar, and notched lapels. The navy figure has trousers with a knee and a cuff. The toile is a muslin lathe with blue lines, not a box torso. The basted coat no longer wears a second muslin body under the wool.

The fitting glass is a planar reflection: three panels, each with its own target, clipped to the mirror plane, updated before the main draw. Front and right walls close the openings those cameras were using as sky. In the corner shot the glass shows the floor and the far wall, with a window in the left wing. The companion bench sits beside a low standing board. The order table is against the back wall. A coat hangs on a hook. The curtain is tied on the far jamb so it does not cover the glass.

The default camera sits inside the room. The cutting table, the alcove, and the forms fill that frame. The corner camera also sits inside; the floor and the ceiling meet walls, and the walnut cutting stool is in the foreground. The close camera is unchanged, so the shears, tracing wheel, and button tray stay where they were.

The cloth cases are walnut cabinets of horizontal bolts. The pale display-case meshes are loaded and hidden. The cutting stool is a round walnut seat on four legs with stretchers. The cafe stool mesh is loaded and hidden. The sewing chair still faces the machine.

## Still rough

See `refs/GAP.md`. Lapels are small at room scale. Sleeves are still constructed limbs, not draped cloth. Shear blades are flat. The mirror's brightest patch is a reflected window, and from the default camera the glass shows the far wall rather than the worktable. The wing panels stay oblique. The cabinets are open shelves, not a closed cloth press.
