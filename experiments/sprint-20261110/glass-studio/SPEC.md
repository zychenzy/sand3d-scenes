# Artisan glass studio

Room 10.8 × 8.2 × 3.5 m. Cutaway drops the front (+Z) and right (+X) walls. Back wall is −Z, left wall is −X. Units are metres.

## Zones

**Hot shop (focal).** A steel glory-hole drum is built into a brick heat wall. The mouth is chest height (1.14 m) and is the warm light: emissive throat plus one point light over the steel floor plate, not a white blow-out. An annealing lehr sits to the right of the drum with a glowing slit and a pulled tray of cooling pieces. A colour-bar rack occupies the niche between them.

**Shaping.** The gaffer bench (`museum_bench`, long axis along X) faces the furnace. Steel rails run from the seat toward the glory hole and stop 0.90 m short of the mouth so a person can pass. A loaded blowpipe lies on the rails with an emissive gather. The marver is the square dining table to the gaffer’s right, with jacks, shears, a paddle, a block, and a small cobalt tumbler. Its chair sits on the near side and is rotated π so it faces the table (local chair facing is +Z).

**Finished glass.** Limestone columns and the walnut display case stand on a stone pad, clear of the marver by about 0.9 m. Pieces are opaque lathe forms in one palette: cobalt, amber, emerald, ruby, milk, teal, smoke. Each piece is inset on its support (`tests/layout_clearance.py`).

**Material storage.** Three cullet bins along the left wall, two wall shelves of frit and cane, a rod cart, and sand / soda barrels. The test requires 0.90 m of clear floor in front of every bin. A small cold-work table with a lap wheel and a facing chair sits in the front-left, out of that aisle.

## Light and materials

Four-step toon gradient. Key light from the open corner, cool fill from the left, furnace and pendant point lights for the warm pools. Pendant bulbs and the furnace throat keep an emissive colour in unlit mode. Contact grounding is the directional shadow map plus a scorch stain on the steel plate. No alpha glass, so nothing depends on transparency sort.

## Cameras

Default looks from the open corner across the display toward the glory hole. `corner` runs along the hot shop. `close` frames the rails, gather, and mouth.
