# Gaps

- `sand3d` and `bake_preferred.py` are not in this environment, so nothing new was baked. Barber chairs, the wash chair, basin, mirrors, pole, and counters are procedural solids.
- Station glass is one planar reflection of the live room, shared by the three coplanar mirrors. The pass reuses `MeshToonMaterial` and `MeshBasicMaterial` and projects the render target in the shader. The upper field is pale where the reflection is an empty wall.
- Jam jars stand in for tonic. They read as red glass with a gold lid, which is the wrong silhouette for a barber bottle, so most product bottles on the counters are procedural.
- The flowerpot bake is an empty gray vessel. It is tinted and given a procedural plant.
- The "Basic Red Couch" bake is gray cloth with a modern silhouette. It stays linked and is not drawn. A wood-and-leather waiting settee occupies the same footprint and faces the coffee table.
- The oak dining chair bake is 0.33 m wide. It is not used. Waiting seats are the wood-and-leather settee and the bench (seat 0.46 m, length 1.51 m).
- The coffee-table bake is 1.00 × 0.40 × 1.82 m. Plan scale is 0.62 and 0.68 so it fits the loveseat. Height is not scaled.
- Shelf bottles are placed from the shelf's node heights, not from a measured board. They read on the shelf in the corner shot; a retarget of the GLB could clip them.
- Contact shadows are flat discs under the chairs, desk, and waiting seats. The back wall does not receive the key shadow, so a jagged chair shadow no longer breaks the plaster beside the center console. Floor and furniture still receive it. Vanity point lights stay off the mirror wall. The pole stands left of the runner. The ceiling is a full lid with a fascia on the open edges.
- No people. Clearances are for a standing barber (about 0.6 m) and a seated client, not a posed figure.
- Unlit mode is real `MeshBasicMaterial`. Bulbs stay bright because emissive is folded into the color. The room is flat on purpose in that mode.
