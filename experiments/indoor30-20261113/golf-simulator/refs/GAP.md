# GAP

Inspected the existing kit and the golf rows in `Sandflow/sand3d-objaverse` (renders, not just titles).

Rejected after looking at the renders:

- Golf carts. They are vehicles, and they do not fit a hitting bay.
- Minigolf platforms and a folded minigolf course. Wrong sport.
- "Golf ball display" (`objaverse-a3ff7c3f2d5c4a7382f4ebe071fd6743`). The render is a blank slab with a speck, not balls.
- Two flagsticks. A pin in the turf would read as an outdoor hole, not a simulator.
- The raw wedge USDA is diagonal. The bake stands it on the shaft. The original heads were thin sheets, so the heads in this folder were rebuilt on those shafts.

Closed in this scene:

- Two separated bays, nets, stance mats, tees, and a driver / iron / wedge rack outside each swing. The driver head is round, the iron is a lofted blade, and the wedge is more open with a wider sole.
- Concave impact screens: bay 01 is a dogleg par 4, bay 02 is a water-carry par 3. A low floor monitor beside each ball reads bay, carry, and club.
- Theatre chairs behind the safety line, rotation 0, cushion toward the screens. No shared club chair exists that is not a dining chair, sofa, or stool, so these seats stay and are narrowed on X.
- A chair rail and a bay card on the side walls, over the dado.
- Entry bench, counter, baskets, and a shrub in the empty pot.

Still open:

- No golf bag and no purpose-built launch monitor in the catalog. The monitor is a procedural floor unit. The housing, screens, nets, mats, and racks are not catalog meshes. Medium.
- Rebuilt heads sit on the baked shafts. They read as driver, iron, and wedge in the detail shot. They are not the original scanned heads, and the iron is still the smallest of the three. Medium.
- Netting is an alpha grid, not woven rope. The screens are painted holes, not photography. Low.
- The flowerpot bake is empty. The shrub is local geometry. Low.
- The bench is backless, so only the theatre chairs have a facing. Low.
- No people, no projector, no moving ball. Low.
