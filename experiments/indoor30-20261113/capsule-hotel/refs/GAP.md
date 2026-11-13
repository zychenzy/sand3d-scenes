# GAP — Koya sleeping floor

## What was inspected and not used

Hugging Face `Sandflow/sand3d-objaverse` search for "locker" (datasets server, first page) did not yield a luggage locker. The closest program is `objaverse-9797ff34c99a43be86d27868b3f9cb6d`, "Old Locker" by mandaljay10: a vented four-door gym bank about 1.8 m wide and 1.2 m tall. That reads as a gym, so it was not baked. The other hits on that page were a trailer, a locomotive, an armoured car, a fridge, and a truck.

The local kit has no bed, pillow, curtain, ladder, sink, or luggage locker. These were looked at and skipped because they pull the room toward another type:

- `pendant_lamp` — cafe shade, about 0.45 m tall
- `library_lamp` — green banker's lamp
- `sofa_solid`, `train_seat`, `bar_counter`, `bar_stool` — lobby, train, cafe
- `tv` — about 1.45 m wide
- `flowerpot` — empty cafe pot

`sand3d` is not installed here. The package wants Python 3.11 or 3.13 plus bpy; this machine is Python 3.12. The three missing props were baked offline with the vendored Three.js r170 geometries in `programs/bake_props.mjs`. No image textures. Each GLB is under 60 KB.

## Closed in this scene

- Rounded pod openings, not a grid of opaque boxes.
- Bedding you can see in the open berths: mattress, a rectangular pillow, and a mattress-width duvet with a turned cuff.
- A reading sconce in every berth. The point light sits on the shade, dim enough that the duvet, pillow, and shade all stay visible.
- Closed curtains keep a warm sill leak so the hole is not crushed black.
- The −Z end is a wall and an entry door, so the corner view terminates instead of opening onto empty space.
- Curtains hang from a rail as flat overlapping pleats, gathered to the jamb when the berth is open.
- The vanity mirror is a framed painted glass, and the basin is an oval bowl rather than a cylinder.
- Ladders at 0.28 m rung spacing, 0.34 m wide, with a handhold above the upper bunk, outside the walking strip.
- Locker bank and a vanity (counter 0.88 m, mirror, sink, cup, jar, bottle, shelf).
- Hard 4-step toon by default, and a real unlit pass.

## Still open

- Curtain pleats are thin overlapping panels on a rail, with a stepped hem. They read as folded cloth rather than tubes, and they are still not sewn fabric. Unlit, the pleat shading flattens.
- The duvet is a mattress-width rounded slab with a turned cuff and a seam, not a tucked sheet. The pillow is a rounded rectangle, not a loaf. There is no piping or cloth simulation. The berth light stays on the sconce.
- The reading lamp is a plate, arm, and shade.
- The basin is an oval bowl with a rim and a small drain. The faucet is two brass cylinders. The mirror reflection is a painted canvas inside the frame, not a raytraced view of the hall.
- The default camera shows the locker bank, the ladders, the near open berth, and the vanity. The nearest pod's side fascia is still a large beige plane beside that opening.
- The cafe wall shelf, scaled to 0.36 m tall, is a book-shelf proportion sitting beside the mirror. It is not a medicine cabinet.
- Locker doors are flat color. Unlit they sit a step darker than the toon pass because there is no light lift. They are not a photographed wood grain.
- Hard shadows still alias along the curved rims. That is the shadow map on a curve, not a second texture.
- One side of pods only. No second row, no shower room, no person, no in-pod screen.
- The HF look was a keyword page, not a full scan of 66k rows. A better pillow or sconce program may exist and was not baked.
