# Luthier string-instrument repair

One cutaway room, metres, hard stepped toon by default and a real unlit pass.

## Zones

- **Task bench** against the back wall. Violin cradle with the top off, loose top beside it, guitar cradle with spool clamps on a crack, a row of spool clamps, curls of shavings, two banker's lamps.
- **Hanging wall** above the bench. Three violins and two guitars on a rail. A tool board of chisels, a finger plane, calipers, and a soundpost setter. A slot rack of plates and molds to the right.
- **Forms**. Three violin inside-molds stand on a rack left of the aisle. A guitar mold leans in front of it.
- **Varnish nook** on the left wall. Counter, bending iron, glue pot, swatches, labelled jars on two wall shelves, and two drying violins.
- **Customer handoff** on a rug at the front-right. Finished violin on felt, soft case, ticket, and a sign. The customer sits on the open side. The luthier sits on the shop side.

## Facing

Dining-chair front is +Z at rotation 0.

- Task chair uses rotation π so it faces the bench.
- Customer chair sits on the open side of the counter and uses rotation −π/2 so it faces the counter.
- Luthier chair uses rotation 0 and sits on the shop side, left of the counter, facing the handoff.
- Banker's lamps use rotation π so the shade reaches over the cradles.
- Wall shelves use −π/2 so they open into the room from the left wall.
- The neck cabinet uses rotation π so the open side faces the room.

## Light

Four-step toon ramp, nearest filter, darkest stop lifted so shadows stay brown. One soft shadow map from the key, which enters through the open front. Cool fill from the left window. Warm pools at the bench lamps, pendants, and varnish counter. Bulb meshes are emissive. Contact discs sit under the furniture. Walls, floor planks, labels, and shavings do not cast. No bloom.

Unlit swaps every mesh to `MeshBasicMaterial` and keeps maps. Emissive bulbs stay bright by folding the emissive color into the base color.

## Circulation

The centre aisle, from just in front of the task chair to the luthier chair, is clear of the bench, varnish counter, forms rack, and handoff counter.
