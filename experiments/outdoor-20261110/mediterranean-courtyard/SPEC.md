# Mediterranean courtyard

Open-air social courtyard, not a room with the ceiling removed. Roofs and gallery ceilings cover only the south and west walks. Upward rays over the fountain, the entrance, and the east court must miss every mesh. Rays over the two gallery tables must hit `arcade-roof`.

## Place

- Focal point: raised stone fountain, west of center, with an azulejo band, green water, a low spout, and two urns on the coping.
- Shade: two cafe tables inside the arcades, one table under the olive on the east court.
- Seat: stone bench built into the east wall, facing the fountain.
- Path: north gate posts, down the lane, across the brick court, around the fountain. The walk from the entrance to the north side of the fountain stays clear of tables and the basin.
- Terraces: lane at −0.16 m, court paving at 0, arcade walk at 0.18 m.

Chairs use the cafe facing convention: rotationY 0 looks toward +Z. Each chair faces its table.

## Cameras

Default is a north overview that fits the L of arcades, the fountain, the olive table, and the bench. Corner is a standing view from the entrance. Close is the fountain basin: coping, tile band, water, spout. Unlit keeps the same default frame with `MeshBasicMaterial` and no cast shadows.

## Built here

Paving, arcades, roofs, fountain, olive, citrus, bougainvillea, urns, and the bench are procedural. Tables, chairs, cups, and flowerpots are the cafe GLBs (the pots are tinted terracotta). See `layout.json` for poses.
