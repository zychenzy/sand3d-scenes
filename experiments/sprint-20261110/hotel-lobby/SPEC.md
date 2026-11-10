# SPEC — The Marlowe lobby

Units are metres. Cutaway: back wall at −Z, left wall at −X, open on +X and +Z. Room 13.2 × 10.2 × 4.15.

## Zones

1. **Reception** (the hero). A 7.6 m desk sits forward of the back wall. Behind it, a tall backlit key wall carries the wordmark. Guests approach from +Z along the runner.
2. **Hearth lounge**. One sofa on the entry side faces −Z across the coffee table. Burgundy club chairs close the short ends and face the table. A low round table with a brass fabric lamp sits off the sofa's open end.
3. **Arrival nook** (front-left). Low round table with two club chairs facing each other across it.
4. **Arrival edge** (front-right, open corner). Bell cart. One doormat sits at the open edge. A runner runs from that mat to the desk, with a flower table in the middle. Elevator doors and a bench occupy the left wall.

Circulation from the open corner passes between the nook and the lounge, then splits to the desk or the painting. A stone column marks the desk end so the path is not a blank rectangle.

## Facing

- `sofa_solid` and `club_chair` share the sofa bake. Front is local −Z. `rotationY` 0 faces −Z, π faces +Z, −π/2 faces +X, +π/2 faces −X. Club chairs use scale `[0.62, 1, 1]` and a burgundy fabric tint.
- The hearth sofa (`rotationY` 0) faces the coffee table.
- `coffee_table` length is local Z; `rotationY` π/2 runs the length along X. Plan scale is `[0.86, 1, 0.86]` so the top stays at 0.42 m.

## Light

Stepped 4-band toon, hard shadow map, contact discs under furniture. Emissive bulbs, fabric lamp shades, the key-wall glow, picture-light bar, elevator indicator, and reception cove. Point lights sit at the pendants, the picture light, and the key wall. Unlit mode keeps the same colors and maps.

## Palette

Limestone floor, cream plaster, walnut millwork, brass, oxblood hearth rug, green nook rug, cognac leather sofa, amber glass pendants.
