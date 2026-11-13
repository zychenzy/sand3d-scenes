# Perfumery blending atelier

One cutaway room, 11.4 × 8.8 × 3.35 m. Back wall is −Z, left wall is −X. The front and the right side stay open.

## Zones

- **Scent organ.** Eight-bay semicircle around the nose. Three tiers step back. Bottles cluster by family: citrus (rectangular, straw), floral (shouldered, rose), wood (round, amber), resin (oval, sage). Atomizers sit on the top tier and at intervals. Brass-dark posts mark the family breaks. Plates read CITRUS, FLORAL, WOOD, RESIN.
- **Blending bench.** Inside the arc. Stone inset, brass beam balance, four glass pipettes in a rack, two mixing glasses, an alcohol bottle, a standing blotter fan, a mouillette jar, and a formula card. A banker's lamp shades the scale. An extract hood with a grille and a ceiling duct hangs over the bench. A louvered vent sits above the left window.
- **Consultation.** Oak square table on a sage rug. Two dining chairs face each other across the table. Three sample flacons sit on the top. A pendant hangs above.
- **Archive.** Two tinted bookcases packed with formula volumes, a six-drawer raw-material chest (MUSK, AMBER, HERB, SPICE, BARK, SEED), and two concentrate jars on the chest. A stone plinth by the window holds one larger flacon. One pot with a small citrus plant stands in the corner.

## Facing and paths

Dining-chair front is +Z at rotation 0.

- The nose's chair uses rotation π and faces the bench (−Z).
- The client chair (south of the table) uses rotation π and faces the table.
- The consultation chair (north of the table) uses rotation 0 and faces the table.
- Organ bottles face the arc center.

A runner leads from the open front to the nose. A second path stays west of the table. A third path runs in front of the archive. Layout tests reject anything that closes those paths.

## Light

Four-step toon. The darkest step stays above black. One warm key from the open corner, a cooler fill from the window, and three small pools: the bench lamp, the hood, and the consultation pendant. Contact discs sit under the furniture. Shelf bays do not cast, so the arc does not stripe the floor. Unlit mode replaces materials with `MeshBasicMaterial` and keeps lamp color.

## Cameras

Default is the open southeast corner, taking in the organ, bench, consultation, and archive. `corner` stands at the open front-left and looks across the arc. `detail` looks along the bench at the scale, pipettes, and blotters.
