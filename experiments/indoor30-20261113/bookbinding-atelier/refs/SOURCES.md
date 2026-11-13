# SOURCES — bookbinding atelier

No reference photos are stored in git. Links only.

Working-shop references (layout, not traced models):

- Deep Wood Press bindery equipment — standing press, lying press and plough, guillotine, paper cabinets, sewing frames, tool stove: https://www.deepwoodpress.com/bindery.html
- Bindery (forwarding vs finishing): https://en.wikipedia.org/wiki/Bindery
- A binder's bench habits (stand to cut, sit to sew, paste kept to one side, newsprint under the work): https://ariellesbindery.com/2017/01/18/the-bindery/
- Four zones in a small room — cutting, wet work, pressing, flat storage: https://papercraftjournal.com/a-small-space-setup-for-working-with-bookbinding-projects
- Studio planning notes (map drawers, sewing surface, cutter that needs a strong table): https://www.reddit.com/r/bookbinding/comments/1l4tzbo/designing_a_bookbinding_studio_space/

Asset programs already baked in this repo:

- https://huggingface.co/datasets/Sandflow/sand3d-objaverse (CC-BY)

## What was inspected

Existing GLBs were measured from their accessor bounds and checked against renders already in the repo (`library` shots for the ladder chair and green banker lamp, `jewelry-workshop` and `makerspace` for how those meshes sit in a craft room).

Selected, by relative path, because the long axis is height and the footprint stays human-scaled after `targetHeight`:

- Dining chair, overall 0.90 m. Front legs are the local +Z side, so a yaw of π faces a bench on −Z.
- Bar stool, overall 0.68 m, for the standing press and the guillotine.
- Banker's lamp, overall 0.38 m. The shade group sits on local −Z; yaw π opens it toward the sitter. The `light_tube` mesh is marked emissive.
- Pendant, overall 0.40 m. The `bulb` mesh is marked emissive. A short cord continues it to the beam.
- Jam jars at 0.12 m as paste pots, one mug, one thermos, one flowerpot.

Rejected after that inspection:

- Display bookcase and book stand. The stand's program is a 1 m pedestal, and the case is a library wall. Both would reskin this room as a reading room.
- Square dining table and the study / school desks. They read as a dining set or a classroom, and the bindery benches need a long, deep top.
- Wall shelf. Its Y axis is the 25 mm board. Fitting that axis as a "height" blows the plan out to many metres. A procedural rail is used instead.
- Easel, monitor, chalkboard, cash register, piano bench, museum bench. Wrong trade, or the facing is a gallery seat rather than a task seat.

`bake_preferred.py` and the `sand3d` runtime are not in this checkout, so no new program was baked. The machines the catalog does not have are built in `atelier.js`.
