# GAP — Koya sleeping floor

## What was inspected and not used

Hugging Face `Sandflow/sand3d-objaverse` search for "locker" (datasets server, first page) did not yield a luggage locker. The closest program is `objaverse-9797ff34c99a43be86d27868b3f9cb6d`, "Old Locker" by mandaljay10: a vented four-door gym bank about 1.8 m wide and 1.2 m tall. That reads as a gym, so it was not baked. The other hits on that page were a trailer, a locomotive, an armoured car, a fridge, and a truck.

The local kit has no bed, pillow, curtain, ladder, sink, or luggage locker. These were looked at and skipped because they pull the room toward another type:

- `pendant_lamp` — cafe shade, about 0.45 m tall
- `library_lamp` — green banker's lamp
- `sofa_solid`, `train_seat`, `bar_counter`, `bar_stool` — lobby, train, cafe
- `tv` — about 1.45 m wide
- `flowerpot` — empty cafe pot

`sand3d` is not installed here. The package wants Python 3.11 or 3.13 plus bpy; this machine is Python 3.12. The three missing props were baked offline with the vendored Three.js r170 geometries in `programs/bake_props.mjs`. No image textures. Each GLB is under 50 KB.

## Closed in this scene

- Rounded pod openings, not a grid of opaque boxes.
- Bedding you can see in the open berths: mattress, baked pillow, a second sham, a soft duvet mound.
- A reading sconce in every berth, with a warm pool only on the open and half-open ones.
- Closed curtains keep a warm sill leak so the hole is not crushed black.
- Ladders at 0.28 m rung spacing, 0.34 m wide, with a handhold above the upper bunk, outside the walking strip.
- Locker bank and a vanity (counter 0.88 m, mirror, sink, cup, jar, bottle, shelf).
- Hard 4-step toon by default, and a real unlit pass.

## Still open

- Curtains are a rounded panel plus a few cylinders for the gather. They are not cloth, and the gather can read as a flat orange or blue slab when the camera is close.
- The duvet is one soft mound and a roll, not a tucked sheet with a hem. The pillow is a smooth loaf, no piping.
- The reading lamp is a plate, arm, and shade. In the detail shot the pool on the duvet is brighter than the shade itself.
- The sink is a short cylinder. The faucet is two brass cylinders. The mirror is a pale plane with a frame, not a reflection.
- The cafe wall shelf, scaled to 0.36 m tall, is a book-shelf proportion sitting beside the mirror. It is not a medicine cabinet.
- Locker doors are flat color. Unlit they sit a step darker than the toon pass because there is no light lift. They are not a photographed wood grain.
- Hard shadows still alias along the curved rims. That is the shadow map on a curve, not a second texture.
- One side of pods only. No second row, no shower room, no person, no in-pod screen.
- The HF look was a keyword page, not a full scan of 66k rows. A better pillow or sconce program may exist and was not baked.
