# Gaps — Cedar Lane post office

Photo pages in `SOURCES.md` describe the plan: public boxes, a counter line, and a workroom behind it. The dataset search did not yield a bake that could be dropped in at the right size.

## Inspected, not used

Hugging Face `Sandflow/sand3d-objaverse`, dataset viewer search:

- Mailbox queries return curbside boxes (for example "Mailbox" by julius.j.bib, `objaverse-0dd1fd9ce87f4b50b3a57f2f0dfd93b2`). Scaled up they would be oversized garden props, not a PO-box wall.
- "platform scale" hits a kitchen scale (`objaverse-deee2ca3da`, "Kitchen Scales" by frezer2011) plus unrelated ships. A kitchen scale brought up to parcel size is the failure the brief rules out. The floor scale here is built at 0.52 × 0.44 m.
- "Mail Cart" by MrTheFly (`objaverse-c39d0d6a2fa3430bbbe3e915e639bf63`, entry `trolley`) is the right object class. `sand3d` 1.6 does not install on this machine's Python 3.12 (it requires 3.11 or 3.13, plus `bpy`), so that program was not baked. The two trolleys are original meshes at hamper size (0.58 × 0.92 m bed).
- Shopping trolleys, hotdog carts, and the cafe bar counter were rejected. The bar bake is an L-shaped return about 1.8 × 0.89 × 0.40 m; raising it to a 1.05 m counter makes the top more than 2 m deep.
- Office-chair hits exist. The wood dining chair already baked in `library/` is the clerk seat, yaw 0 toward the lobby.

## Selected bakes

Chair, bench, study desk, desk lamp, pendant, POS terminal, and one flowerpot. All are existing root GLBs with no embedded images, referenced by relative path. See `ATTRIBUTIONS.md`.

## Still open

- PO boxes load from the public face only. A rear-loading corridor would be on the other side of the left wall, which this cutaway does not open.
- Pigeonholes, the scale, the queue, and the trolleys are block construction, not scanned cases.
- No people, no printed postage, no city directory.
- The study desk still reads as a pedestal table once parcels are on it. It is not a purpose-built packing bench.
- Serving this folder alone will not resolve `../../../museum` or `../../../library`. Launch from the repo root.
