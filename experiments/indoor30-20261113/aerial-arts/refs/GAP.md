# GAP — Span Room

Catalog GLBs were inspected by node names and world bounds (metres, facing). `candidates/` is gitignored and not present in this checkout, so there were no official candidate renders to compare. Nothing was copied into this folder.

Used, because the mesh matches the job:

- Museum bench as the waiting seat. Long axis is local Z, seat about 0.46 m, no backrest. Placed along the east canopy, facing the bay.
- Square dining table and wooden chair in the warmup bay. Chair back is local −Z, so `rotationY` of −π/2 faces the table.
- Wall shelf on the west wall for tape and a folded silk. Depth is the thin local Z axis.
- Pendant lamps only under the low soffits. The baked cord hangs downward; the cap is the top of the bbox.
- Library bankers lamp, thermos, and mug on the warmup table. The lamp shade points local −Z, turned to face south into the open floor.
- Two flowerpots, off the mats.

Rejected:

- `gym` punching bag. It is a boxing frame and a heavy bag, not a silk or a lyra.
- Stretch-studio and dance-studio layouts. Those are mat grids and mirrors. This room is not a reskin of either.
- Sofa, pool table, theatre seats, easel, school desk, bar, display vitrine. Wrong rooms.

Not in the catalog, so they are built here instead of baked. `sand3d` is not installed in this environment, and no new GLB was written:

- Steel I-beam grid, posts, and braces. Hang points sit on the crossings.
- Two silk pairs: shaped ribbons with a slow twist, two width pinches, and a coil on the mat. They do not cast or receive the shadow map, because a hard shadow on a thin ribbon turned into acne. Fold shading is the toon step only.
- Two lyras: torus, tape bands, one spanset on the low hoop and a V on the high hoop. Hardware is a plate, an oval ring, and a flat strap. Not a rated carabiner.
- Crash mats are seamed vinyl slabs, 34 cm, not upholstered bags.
- Cubby, roller, ledge tape, and signs.

Still approximate:

- No flyer, no Spanish web, no trapeze, no rescue-8, no crash block, no swivel bearing that actually spins.
- The puddle is a planned spiral, not simulated cloth.
- One hard shadow map from the south key. Contact discs stand in for feet. The ceiling stays in the lifted toon stop and the hemisphere ground color so the slab does not go black.
- The bankers lamp is a library practical. It reads as a desk lamp, not as aerial equipment.
- The flowerpot bake is a vessel without foliage.
