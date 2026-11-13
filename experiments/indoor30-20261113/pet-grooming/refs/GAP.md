# Gaps

Photos linked from `SOURCES.md` are storefronts, tool stills, show-table shots, or a self-service wash box. None of them is a full salon interior with a hydraulic arm, a raised tub, and a drying bank in one frame. Those three pieces are procedural.

## Catalog inspection

Existing sand3d bakes were inspected from their node names, materials, and texture counts (every selected GLB has zero embedded images), then rendered in this room.

Selected:

- Dining chair for the receptionist and the two guests. Front is +Z at rotation 0, so guests use π and face the counter.
- Metal dining chair for the two groomers and the bather. Same facing rule. Groomers face −Z into the tables. The bather uses −π/2 and faces the tub.
- Museum bench as the waiting seat, turned so its long axis runs along X.
- Wall shelf over the towel cubby.
- Library lamp on the handoff counter. The shade points −Z, over the staff side.
- Three pendant lamps, scaled to the shade and hung under the beams.
- Jam jars as product bottles on the cubby and the counter. They are jars, not pump bottles.
- Flowerpots at the open front corners.

Rejected after inspection, not copied in:

- Hugging Face bathtubs (`objaverse-afc527818565496dac43d0908a13c3e6` "Bathtub" by Lonit, `objaverse-7427e2c0c32c44b89deb058f6583742a` "Classic Bathtub", `objaverse-385c09d2ebb2483d96a78918c665db51` "Bathtub" by jayjee). They are human floor tubs. A salon wash is a raised tub with a ramp. Not baked.
- Hugging Face scissors hits are stationery and medieval shears, not grooming shears. Shears, clipper, comb, and slicker on the tables and boards are procedural.
- A dataset search for grooming equipment did not return a grooming table, arm, kennel, or stand dryer. The top "dog grooming" rows were a fish scaler, an urn, and an air conditioner.
- Square dining table: reads as a cafe table, not a grooming table.
- Bar counter and cash register: a bar, and the register materials are near black.
- Bar stool: black rubber foot.
- Sofa: a domestic couch, not a salon waiting seat.
- Display bookcase and study desk: library furniture, and the bookcase ships with no materials.
- POS terminal (`pos_terminal__91c277a25bc3`): rendered on the counter. The screen is a near-black slab and blocked the handoff. Removed after that shot.

## Built because nothing in the catalog fit

- Hydraulic grooming tables, five-star bases, gooseneck arms, and hanging loops.
- Raised stainless tub, faucet, sprayer, and treaded ramp.
- Two-by-two drying crates, one door open, and a stand dryer with a hose.
- Towel cubbies and wall tool boards.
- Handoff counter with a lower ledge, leash hooks, and a folded towel.
- Spindle pet gates. The leaves are folded onto the rails so the 0.98 m and 0.95 m openings stay clear.

## Limits

- Jars stand in for shampoo. Pump bottles on the cart and the tub ledge are procedural.
- The wall shelf is a generic shelf. Towels in the cubby are stacked slabs.
- Kennel bars are cylinders, not a welded wire mesh.
- The toon ramp bottoms at 72/255 so shadows stay brown instead of black. Contact discs are fake AO. The vendored toon path has no GTAO.
- Floor tiles are 128² canvas repeats. No photograph textures.
- No animals, no barber chair, no mirror wall, no exam light.
