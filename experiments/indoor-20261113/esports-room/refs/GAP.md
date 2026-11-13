# Gap notes — North Pit

Closed in this scene because the catalog has no equivalent:

- Esports desks, cable tray, floor raceway, and the spines in the desk gaps.
- High-back chairs. Local +Z is the seat front (lip and bolsters). `rotationY` near π faces the monitor. One chair is pulled out, one is yawed, one wears the headset.
- Keyboards, mice, headset stands, towers, and the coach's note card.
- Replay wall and the draft board. Large flat shapes so the four-stop toon gradient does not wipe the UI.
- Acoustic panels, corner trap, wood-slat diffusers, ceiling clouds.
- Analyst bench. Seat lip faces −Z, toward the replay.

Inspected and not instanced:

- `ktv/assets/tv__7a1ea89eeb48.glb`. The foot is as deep as the panel is wide. The glass is opaque. In the room it read as a black slab with the picture on the edge. The draft board is a framed plane facing +Z instead.

Known limits:

- The monitor arm is a low-poly curve. Facets show along the bottom bezel. The canvas covers the glass; it does not replace the bezel.
- The wall shelf is an open cafe rack. Headsets hang at the rails; they are not on modeled pegs. The rack does not cast, to avoid shadow acne on the plaster.
- Speakers are the small portable box, scaled up on stands. They read as nearfields, not line arrays.
- The pendant's stem is the asset's own. It does not grow a new cord.
- Cable "management" is a channel and a spine, not a braided loom.
- Screens do not animate. There is no bloom pass.
- The default camera shows the pit and the replay. The coach desk, chair front, and round-tape monitor are the corner shot. Only the coach desk's edge enters the wide frame.
- Chair and desk geometry is blocky on purpose under hard toon. It is not a soft-shaded product render.
