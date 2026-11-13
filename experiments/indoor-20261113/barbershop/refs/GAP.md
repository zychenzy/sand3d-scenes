# Gaps

- `sand3d` and `bake_preferred.py` are not in this environment, so nothing new was baked. Barber chairs, the wash chair, basin, mirrors, pole, and counters are procedural solids.
- Mirrors carry a painted station: chair, barber, counter, and checker. They do not reflect the live scene. A reflection pass is not in the vendored toon path.
- Jam jars stand in for tonic. They read as red glass with a gold lid, which is the wrong silhouette for a barber bottle, so most product bottles on the counters are procedural.
- The flowerpot bake is an empty gray vessel. It is tinted and given a procedural plant.
- The "Basic Red Couch" bake is gray cloth. One brass-colored pad shows on the seat from the default camera; the other two sit further into the seat and are easy to miss.
- The oak dining chair bake is 0.33 m wide. It is not used. Waiting seats are the loveseat (1.53 m) and the bench (seat 0.46 m, length 1.51 m).
- The coffee-table bake is 1.00 × 0.40 × 1.82 m. Plan scale is 0.62 and 0.68 so it fits the loveseat. Height is not scaled.
- Shelf bottles are placed from the shelf's node heights, not from a measured board. They read on the shelf in the corner shot; a retarget of the GLB could clip them.
- Contact shadows are flat discs under the chairs, desk, and waiting seats. The pendant shade does not cast. Vanity point lights stay off the mirror wall; a light parked there quantized into a circular blotch. The pole stands left of the runner so the establishing view can see the aisle.
- No people. Clearances are for a standing barber (about 0.6 m) and a seated client, not a posed figure.
- Unlit mode is real `MeshBasicMaterial`. Bulbs stay bright because emissive is folded into the color. The room is flat on purpose in that mode.
