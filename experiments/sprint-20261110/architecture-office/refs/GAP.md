# GAP — architecture studio

Catalog objects reused by symlink (not copied):

- Study desk, dining chair, monitor, banker lamp — cowork bakes
- Square table, easel — workshop bakes
- Wall shelf, bar stool, mug, flowerpot, jam jar — cafe bakes
- Plinth, display bookcase, bench — museum bakes
- Book stand — library bake

Closed in this scene because the catalog has no equivalent:

- Sloped drafting tables with a parallel bar, lip, and rear ledge
- Standing model-making bench, cutting mat, foam massing, flat file
- Pin-up field, drawn sheets, trace overlay, sample chip board
- Five-bay material library and the pulled samples on the wall shelf
- Sawtooth skylights, split oak/concrete floor, entry door
- Pendant drop extended with a cord up to the soffit (the GLB is only the shade and a short stem)

Known limits:

- Task lamps are green banker lamps, not articulated draft lamps.
- Bookcase and plinth GLBs ship without materials; this scene tints them oak and limestone.
- Monitor glass is a black mesh. A canvas screen is placed on the sitter side (local −Z of the mesh, rotation π).
- Dining-chair local +Z is the facing direction, confirmed from the glTF (back posts at −Z, front legs at +Z).
- Wall-shelf sample dressing uses computed shelf heights for `targetHeight` 1.02: lower top ≈ 0.22 m, upper top ≈ 0.83 m.
- Drawings are canvas textures on toon materials, so linework steps with the four-stop gradient.
- Contact marks are floor ellipses, not a screen-space AO pass. Ceiling soffits do not cast, so the skylight volumes do not black out the room; mullions and furniture still cast hard shadows. Plaster walls and pin-up sheets do not receive the shadow map (the large planes aliased). The floor still receives it.
