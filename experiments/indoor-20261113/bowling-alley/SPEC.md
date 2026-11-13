# Northlane — four-lane house

Metres, Y up. Pins and the masking sit on −Z. Bowlers stand on +Z and look toward the pins. `layout.json` holds cameras, lights, and the furniture instances. Lane math lives in `lane_spec.mjs`.

## Lanes

USBC tenpin, from the Equipment Specifications manual:

- Lane width 41½ in. Thirty-nine boards. Board 1 is the right edge, board 20 the center.
- Foul line to the center of the 1 pin: 60 ft.
- Pin deck rear, not counting a tail plank: 60 ft + 34 3/16 in.
- Approach, exclusive of the foul line: 15 ft, at least as wide as the lane, and empty of furniture.
- Foul line ¾ in, inside the ⅜ in–1 in band, across each lane.
- Gutters 9¼ in wide and 1⅞ in deep, from the foul line to the pit, both sides of every lane.
- Ten pin spots, 2¼ in, on a 12 in equilateral triangle. The 7 and 10 pins sit 2¾ in in from the lane edges. The back row is the 31 3/16 in reference, within 1/16 in.
- Seven approach-guide rows, each inside a USBC station band (about 4 in, 3 ft, 6½ ft, 9½ ft, 10–12 ft, 14½ ft). Seven dots per row, on boards 5, 10, 15, 20, 25, 30, and 35.
- Seven arrows 15 ft down the lane on those same boards. That distance is the usual range-finder panel, not a single sentence in the approach-guide rule.

Two natural pairs. Each pair is gutter, lane, gutter, a 300 mm return cap, gutter, lane, gutter. A 220 mm division separates the pairs. The ball-return hood sits on the approach over the cap only, so it does not enter either lane’s walking width. Balls in the hood are 8½ in.

## Rooms

The lane hall is a tall volume. The roof over the lanes is open to the truss; a plaster strip stays along the left wall. Both lane walls run the length of the lanes, with a dark cut along the right wall’s top. The concourse has a slat ceiling over the chairs and a low dado at the entry. Lane cards and a small NORTHLANE plaque sit on the left wall. The left side continues into a rack bay.

Seating is one theatre chair per lane, on that lane’s center, behind the approach, rotation 0 so the sitter faces −Z. A scoring console for each pair sits on the return center, still behind the approach, with its graphic on the +Z face. Monitors on those consoles use rotation π so the glass faces the sitters. The cross aisle, from z 6.50 to 8.05 across the lane block, contains no floor furniture.

The waiting bench is in the left bay. Shoe-desk stools stand on the customer side of the counter, which is the −X side after the counter’s quarter turn. Speakers sit on shelves outside the outer gutters at the masking, turned to face −Z.

## Light

Hard toon, four steps, no bloom, no outline. The hemisphere ground is a warm tan so the shadow step stays readable. A warm key sits off the open right side, with a 4096 shadow map tightened to the house, a small bias, and polygon offset on the decks. Lanes and the approach receive that shadow and do not cast it. Contact blobs stay under the chairs, consoles, hoods, bench, stools, and desk. Emissive tubes on the truss are the bright band; a pin light and a larger numbered plate sit over each deck. The pit, gutters, and truss are warm gray rather than black. Unlit swaps in MeshBasicMaterial: same maps, no toon ramp, no cast shadows, and the tubes and score faces still read because their emissive is strong.
