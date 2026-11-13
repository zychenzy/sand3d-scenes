# GAP

Inspected the existing kit and the golf rows in `Sandflow/sand3d-objaverse` (renders, not just titles).

Rejected after looking at the renders:

- Golf carts. They are vehicles, and they do not fit a hitting bay.
- Minigolf platforms and a folded minigolf course. Wrong sport.
- "Golf ball display" (`objaverse-a3ff7c3f2d5c4a7382f4ebe071fd6743`). The render is a blank slab with a speck, not balls.
- Two flagsticks. A pin in the turf would read as an outdoor hole, not a simulator.
- The raw wedge USDA is diagonal. The bake stands it on the shaft; the head is still small.

Closed in this scene:

- Two separated bays, nets, stance mats, tees, and a driver / iron / wedge rack outside each swing.
- Concave impact screens with a par 4 and a par 3, plus a low launch monitor beside each ball.
- Theatre chairs behind the safety line, rotation 0, cushion toward the screens.
- Entry bench, counter, baskets, and a shrub in the empty pot.

Still open:

- No golf bag and no purpose-built launch monitor in the catalog. The monitor housing, screen, nets, mats, and racks are procedural. Medium.
- The driver head is a thin profile from the source program. It reads as a wood from the gallery and as an edge from the side. Medium.
- The wedge head stays small after the shaft is straightened. Low.
- Netting is an alpha grid, not woven rope. The screens are painted holes, not photography. Low.
- The flowerpot bake is empty. The shrub is local geometry. Low.
- The bench is backless, so only the theatre chairs have a facing. Low.
- No people, no projector, no moving ball. Low.
