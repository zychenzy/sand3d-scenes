# Gap notes — North Pit

Closed in this scene because the catalog has no equivalent:

- Esports desks, cable tray, floor raceway, and the spines in the desk gaps.
- Bucket chairs: gas lift, five-star base, waterfall seat, side bolsters, a single tall back with a headrest cap. Local +Z is the seat front. `rotationY` near π faces the monitor. Dining and theatre chairs in the kit are the wrong type, and the layout test rejects the dining chair.
- Keyboards are four staggered rows of small caps plus a short spacebar, on a desk mat with a mouse. Towers are mid-cases with a vented front, feet, and a drop cable into the tray.
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
- From behind, the back is a narrow lumbar, a wider shoulder yoke with short wings, and a headrest on two posts. It is still hard-edged toon, not a stitched product chair.
- The daylight shadow is an 8192 hard map fitted to the pit. The old block fringe on the carpet is gone. A hard edge is still a hard edge in the close shot; it is not a soft penumbra.
- The open carpet carries tape ticks at each station and a floor raceway along the left and the near edge. The walk between the chairs and that raceway stays open. The default frame still shows a lot of that floor, now marked.
