# SPEC — The Marlowe lobby

Units are metres. Cutaway: back wall at −Z, left wall at −X, open on +X and +Z. Room 13.2 × 10.2 × 4.15.

## Zones

1. **Reception** (back-left). Staff stand behind a 3.9 m desk. Guests approach from +Z. Key grid and the wordmark sit on the back wall under a dropped soffit with a warm cove.
2. **Hearth lounge** (center, on axis with the painting). One sofa on the entry side faces −Z across the coffee table toward the art. Dining chairs close the short ends and face the table. A low round table and banker's lamp sit off the sofa's open end.
3. **Arrival nook** (front-left). Round table at dining height with three chairs. The east side stays open onto the aisle runner.
4. **Arrival edge** (front-right, open corner). Bell cart, a loose case, and an entry mat. Elevator doors and a bench occupy the left wall.

Circulation from the open corner passes between the nook and the lounge, then splits to the desk or the painting. A stone column marks the desk end so the path is not a blank rectangle.

## Facing

- `dining_chair` front is local +Z. `rotationY` 0 faces +Z, π faces −Z, +π/2 faces +X.
- `sofa_solid` front is local −Z. `rotationY` 0 faces the table and the painting.
- `coffee_table` length is local Z; `rotationY` π/2 runs the length along X. Plan scale is `[0.86, 1, 0.86]` so the top stays at 0.42 m.

## Light

Stepped 4-band toon, hard shadow map, contact discs under furniture. Emissive bulbs, banker's-lamp tubes, picture-light bar, elevator indicator, and reception cove. Point lights sit at the pendants, the picture light, and the desk. Unlit mode keeps the same colors and maps.

## Palette

Limestone floor, cream plaster, walnut millwork, brass, oxblood hearth rug, green nook rug, cognac leather sofa, amber glass pendants.
