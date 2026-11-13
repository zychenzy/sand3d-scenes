# Sources

Links only. Reference photographs are not in git.

Spatial references, not reconstructions:

- [Eye Wish Opticiens, Herestraat, Groningen](https://commons.wikimedia.org/wiki/File:Eye_Wish_Opticiens_Herestraat,_Groningen_(2019)_02.jpg) — Donald Trung, 2019. A small street optician: counter, wall of frames, and a separate back room. Wikimedia Commons.
- [Pearle Opticiens, Winschoten](https://commons.wikimedia.org/wiki/File:Interior_of_a_Pearle_Opticiens,_Winschoten_(2018)_04.jpg) — Donald Trung, 2018. Illuminated frame wall and a clear shop aisle. Wikimedia Commons.
- [Dresden Vision, Rozelle](https://commons.wikimedia.org/wiki/File:Dresden_Vision_Rozelle_store_interior.jpg) — Dresden Vision, 2017. Low display tables of frames in a narrow retail room. Wikimedia Commons.
- [Phoropter](https://commons.wikimedia.org/wiki/File:Phoropter.jpg) — the exam instrument in front of a seated patient. Wikimedia Commons.
- [Snellen chart](https://commons.wikimedia.org/wiki/File:Snellen_chart.svg) — letter rows used as the lane target. The chart in the scene is redrawn, not this file. Wikimedia Commons.

The shop is not a copy of Pearle, Eye Wish, or Dresden Vision. Those photos separate a frame wall and a counter from the test room. The phoropter and the chart fix the exam nook as optometry rather than another display bay.

## Selected bakes

Existing Sandflow/sand3d-objaverse bakes were inspected (node bounds, facing, and the heights already used in library, cafe, and cowork). Nothing was re-baked. Bytes stay in the source scene folders; this folder only symlinks them.

Used:

- Dining chair, study desk, library lamp, display bookcase — `library/assets`. Chair front is +Z. The bookcase is the trial-lens cabinet. The study desk is the exam writing table.
- The waiting seat and the adjustment bench are built in `optician.js`. The museum trestle bench and the thin-legged school desk were set aside: one reads as a gallery slab, the other as a school desk.
- Cash register, POS terminal, pendant, flowerpot, bar stool — `cafe/assets`. Register and terminal sit on the reception top. The stool is the practitioner's perch.
- Monitor — `cowork/assets`. Screen faces +Z at rotation 0, same as the cowork desks, and carries a drawn topography so the panel is not a black slab.

Rejected after inspection:

- Wall shelf: the baked height is the thin axis, so a height fit blows the length up to room scale.
- Bar counter: squat proportions, not a 1.05 m reception desk.
- Museum vitrine and plinth: pedestal silhouettes, not eyewear cases.
- Chalkboard and TV: a classroom board or a black screen, not a sight chart.
- Sofa, round table, coffee table: lounge or café pieces.
- No catalog mesh for acetate frames, a fitting mirror, a phoropter, or a Snellen chart. Those are built in `optician.js`.
