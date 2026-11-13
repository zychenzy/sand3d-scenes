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

The lane hall is a tall volume with the ceiling cut away and a lighting truss left in place. The concourse has a lower soffit. The +Z end is open. The right wall of the lane hall stops at the foul-line end so the shoe desk is outside the approaches. The left wall continues into a rack bay.

Seating is one theatre chair per lane, on that lane’s center, behind the approach, rotation 0 so the sitter faces −Z. A scoring console for each pair sits on the return center, still behind the approach, with its graphic on the +Z face. Monitors on those consoles use rotation π so the glass faces the sitters. The cross aisle, from z 6.50 to 8.05 across the lane block, contains no floor furniture.

The waiting bench is in the left bay. Shoe-desk stools stand on the customer side of the counter, which is the −X side after the counter’s quarter turn. Speakers sit on shelves outside the outer gutters at the masking, turned to face −Z.

## Light

Hard toon, no bloom, no outline. A warm key from the concourse side, a cool fill, and a dim hemisphere. Emissive tubes on the truss and a brighter wash over each pin deck. The lane and approach planes do not take the key shadow; a long deck was breaking into acne. Contact blobs mark the furniture. Unlit drops the lights and the toon ramp and keeps the same colors, maps, and emissive reads.
