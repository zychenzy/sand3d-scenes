# Science discovery lab — spec

Room 13.6 × 9.8 × 3.85 m. Cutaway: back wall (−Z) and left wall (−X) are solid; the front and the front of the east side are open. A partial east wall closes the storage bay only.

## Zones

1. **Optics** (west). Slate floor, low glazed screen, stretched square table used as a seated bench. Two dining chairs face the bench (model forward is +Z at rotation 0, so these sit at rotation −π/2). A prism splits a white beam into five colors; a freestanding lens gathers or spreads a second beam. Posters: “Bending light” and “Moon this month”. A vitrine holds the north end of the bay.
2. **Planets** (north). Raised disc and a tilted brass orrery under a lantern. Mercury through Saturn, with a moon on Earth. Two museum benches face the disc (long axis along X). An armillary sits on the east plinth. Solar-system poster above.
3. **Workshop** (centre). Standing island: toe-kick, door faces, drawer stack, sink, microscope, dye rack, flasks. Three bar stools face the counter (two from the south at rotation π, one from the east at −π/2). Two pendants and a desk lamp. Wood-plank inset only under this zone.
4. **Stores** (east). Partition with an ajar door, sage floor, two bookcases with book slabs, a crate cluster, a specimen shelf, a geode on a plinth. Chalkboard plus a local “Today on the floor” panel and the green-cell poster on the hall side of the back wall.

A brass inlay runs from the entry map toward the orrery. Wayfinding cards name the four zones. The entry disc reads correctly when you stand at the open front and look into the room.

## Interaction

- Prism click cycles three fan angles.
- Lens click toggles gathering and spreading.
- Planet click sets the brass ring and the HUD name. Sun click or `P` pauses the orbits.

## Palette

Limestone floor, cool plaster, slate wainscot, teal cabinets, brass, and a small spectrum used on rays and dyes. Dye bottles are classroom colors. No burners, no hazard marks.

## Cameras

Default looks in from the open southeast. `corner` stands in front of storage and looks north into the bay. `close` frames the orrery. `optics` frames the prism bench.

## Shading

Local `scene_lib.js` keeps the 4-step toon gradient, hard shadows, and unlit mode. Emissive is copied onto toon materials so the sun, lamp bulbs, rays, and posters stay readable. Contact shadows are radial discs. Ceiling soffits do not cast, so the lantern does not black out the hall.
