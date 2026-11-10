# Dance rehearsal studio

A single cutaway room, not a furniture grid. The long back wall is the mirror and the double barre. The floor in front of it stays empty so the room reads as a place to dance. Two side zones do the rest of the work: a lower changing bay on the left, and a sound corner plus the exposed sprung floor on the right.

## Zones

- Rehearsal floor, center. One tape cross, three pendants, no props.
- Mirror wall. Four glass panels, walnut mullions, a clerestory above. Adult rail at 1.08 m and a second rail at 0.76 m, brass brackets, clear of the glass.
- Accompanist corner, back left. Procedural upright piano and a catalog piano bench facing the keys. A short side barre continues along the left wall.
- Storage. One row of unequal cubbies (slippers, an empty cell, a towel, a bag, a mug). Not a locker grid.
- Changing bay, front left. Lower soffit, cased opening, gathered curtain, bench, wall shelf, plant, shoe tray, one hanging tote.
- Sound. Two catalog speakers on stands, toed into the floor, and a low playback cabinet with an emissive screen.
- Sprung floor. The open right edge is a section: oak finish stops, birch ply covers the far half, and the near half shows battens, neoprene pads, and joists.

## Mirror

`mirror.js` renders one planar bounce into a half-float target. The glass is on layer 1, so the reflection camera cannot see it. Mullions and the frame are ordinary geometry.

## Scale

Room 11.4 × 8.8 × 3.9 m. Barre heights, bench seat, and pendant clearance are in metres in `layout.json`.
