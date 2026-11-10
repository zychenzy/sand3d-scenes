# Artisan glass studio

Room 10.8 × 8.2 × 3.5 m. Cutaway drops the front (+Z) and right (+X) walls. Back wall is −Z, left wall is −X. Units are metres.

## Zones

**Hot shop (focal).** A steel glory-hole drum is built into a brick heat wall. The mouth is chest height (1.14 m) and is the warm light: emissive throat plus one point light over the steel floor plate, not a white blow-out. The annealing lehr is a long steel box to the right of the drum, with a framed door, a glowing window, and a sill. A rack of blowpipes stands to the left of the furnace, outside the swing aisle.

**Shaping.** The gaffer bench (`museum_bench`, long axis along X) is centered on the furnace axis. Steel rails run from the seat toward the glory hole and stop 0.86 m short of the mouth so a person can pass. A loaded blowpipe lies on the rails with an emissive gather. The marver sits immediately to the bench’s right at the same depth, square to the room, with jacks, shears, a paddle, a block, and a small cobalt tumbler. A round stool stands on the near side of the marver. There are no dining chairs.

**Finished glass.** A wall shelf runs along the back-right wall. Vessels sit in a row in front of an emissive panel so the glass glows from behind. The foreground floor in front of the default camera is open. Pieces are opaque lathe forms in one palette: cobalt, amber, emerald, ruby, milk, teal, smoke. Each piece is inset on its support (`tests/layout_clearance.py`).

**Material storage.** Three cullet bins along the left wall, two wall shelves of frit and cane, and sand / soda barrels. The test requires 0.90 m of clear floor in front of every bin. One cold-working bench with a vertical grinder wheel sits in the front-left, out of that aisle.

## Light and materials

Four-step toon gradient. Key light from the open corner, cool fill from the left, furnace and pendant point lights for the warm pools. Pendant bulbs and the furnace throat keep an emissive colour in unlit mode. Contact grounding is the directional shadow map plus a scorch stain on the steel plate. No alpha glass, so nothing depends on transparency sort.

## Cameras

Default looks from the open corner down the open floor toward the glory hole, with the gallery on the back-right. `corner` runs along the hot shop so the lehr door and furnace read together. `close` frames the rails, gather, and mouth.
