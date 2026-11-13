# GAP — Late Corner convenience store

Photo links are in `SOURCES.md`. Nothing from those pages is copied into git.

## What the photos show that this room answers

- A run of glass-door drink coolers along the back, not a closed domestic fridge.
- Gondola aisles with mixed packs, not a single empty bookcase.
- A hot-food station separate from the bakery case and from a diner pass.
- A checkout with a register and a card terminal, and a short window ledge with stools.

## HF and existing bakes

Searched `Sandflow/sand3d-objaverse` (refrigerator ~66, shelf ~2292, bottle ~793, snack 7, vending ~94, freezer 13).

Rejected after inspection:

- Domestic refrigerators (Retro Fridge, Refrigerator, LG LFX, Soviet fridge). Solid doors. They would read as appliance slabs, which is the failure this room is not allowed to ship.
- Branded packs and machines (Pepsi can, Coca can, Doritos, Coke vending). The room stays brand-free.
- `display_bookcase` and `museum_vitrine`. The bookcase has no materials and reads as a bookshop. The vitrine is a pedestal, not a cooler.
- `bar_counter`. Cafe notes that scaling it to counter height makes it enormous, and it reads as a bar, not a checkout.
- `wall_shelf`. Two short planks. Wrong type for a gondola.

Selected bakes, already in `cafe/assets`, referenced and not copied:

- Cash register and POS on the counter.
- Bar stools at the window ledge and on the clerk side. The stool is round; facing is the layout forward (`+Z` at `rotationY = -π/2`, toward the ledge or the customer).
- Mug, thermos, jam jar, and flowerpot as a few real meshes so the ledge and hot counter are not only primitives.

`sand3d` and `bake_preferred.py` are not in this environment, so no new GLB was baked. Coolers, gondolas, and the product silhouettes are procedural on purpose.

## Still open

- Shelf goods are unbranded silhouettes (bottle, can, carton, bag, cup, jar, bar, pint, tub, twin pack, roll). They do not carry printed type.
- Cooler doors do not swing. Glass is a tinted pane in front of a pale interior.
- The jam-jar bake is a dark red glass. It is one condiment on the hot counter, not a cooler door.
- The POS bake is 0.65 m on its long axis at a 0.20 m height. This scene fits it to 0.18 × 0.14 × 0.16 m so it sits on the counter. The screen mesh is tinted teal.
- The stool cushion bake is pure black rubber. It is tinted to a dark green-grey so the seat is not a hole. The mesh file is unchanged.
- No articulated freezer, no ice well, no newspaper rack.
- The night window is a framed pane with a night card (lamp glow and a few distant lights) and a pale interior streak. It is not a street model.
- The ceiling is a finished soffit over the plan. The open front and right stay cut away. The corner camera stands inside the room so that view does not look out the cut.
- Wall treatment is a back-wall header, a price rail (COLD / SNACK / HOT / OPEN), and two unbranded posters. No logos.
- The hot counter is a roller well under a hood. Doors still do not swing, and nothing on the shelves is a printed brand.
