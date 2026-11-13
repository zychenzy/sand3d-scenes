# GAP — old-school boxing gym

## Inspected and used

Existing bakes, via symlink, after checking their world bounds:

- `gym/assets/punching_bag__5a21298417a6.glb` — stand-mounted heavy bag. Native height 1.5 m, footprint about 1.12 × 0.65 m. Scaled to 2.02 m and yawed π/2 so the shallow axis points into the room. Hugging Face render: `objaverse-5a21298417a641d5938fddec15f4bf06`.
- Museum bench, cafe wall shelf, amber pendant, thermos, mug. Shelf and pendant bounds were measured so the shelf sits on the back wall and the pendants hang from the ceiling instead of standing on the floor.

## Inspected and not baked

The sand3d compiler is not installed here (`sand3d` is not on PyPI), so these programs were not turned into GLBs. Renders were pulled from the dataset viewer.

- `objaverse-d3f775220fed4ad3a00f9196e61812b7` — "Boxing ring" by guye0355. The program builds a ~5 m platform only 0.17 m thick and posts 3.3 m tall, with three rails. The render reads as a tall crib, not a club ring. The ring in this scene is procedural at the Wikipedia rope heights instead.
- `objaverse-a7ecd96d199b4a198cb4c24f2b9b6576` — "Bbox Ring Draft" did not return a usable boxing-ring render from search.
- `objaverse-487e01cd3eea41c8a49062956c79eb66` — "Vintage / Old punching bag". A clean hanging cylinder. Credible, but a second bag language next to the stand bake would fight the line. Not baked.
- `objaverse-576b851a49f24693bf37e09a944b0f99` — "Boxing Heavy Bag" with chains. Same decision.
- `objaverse-f693732473fd4a99b1a30dffa8d7a7e2` — "Rustic Punching bag". The body pinches in the middle. Rejected.
- `objaverse-c19f175a3c774360b19d1c5d704547ae` — bag on a wooden gallows. The post is part of the mesh, so a line of them would stack posts. Rejected.
- `objaverse-a00d2eaa0c1d459f893ae4cbb08b866e` and `objaverse-25999b961de04591a22311591e5eec4d` — single hollow display gloves. Useful as one sculpture, not as a pegged pair. Gloves on the rail are procedural.
- `objaverse-79a121c472e3403b9770c5e8fc322b64` and `objaverse-4584f3bbe15f4aafb103b210a35ee4c6` — jump ropes. The first is a tangled knot; the second is a floor coil. Hooks on the bag wall are procedural.
- No catalog row read as a speed-bag platform, a round gym timer, or a corner stool at the right height. The cafe bar stool (`bar_stool__319fcb56afe8`) is a 0.75 m pedestal and was left out.

## Closed in this scene

- Raised ring with four ropes, turnbuckles, rope spacers, coloured corner pads, red and blue stools, steps, and an empty centre circle.
- Three heavy bags with a rubber lane, a strike depth, and a walk to the apron.
- Two speed-bag platforms with a standing mat in front of each.
- Glove pegs, wrap rolls on the catalog shelf, round timer, bell, bout card, water stoop.
- Hard-stepped toon (four nearest bands, shadow floor at 0.46) and a real unlit switch. This three build has no `PCFHardShadowMap`; shadows use `PCFShadowMap` plus bias and normal bias so the canvas does not stripe.

## Still open

- Hanging leather bags and a real speed-bag swivel from the catalog, once a sand3d baker is available.
- The mirror of an old gym is not simulated. Clerestory glass is a tinted pane.
- Museum benches are the crossed-steel catalog bake, tinted warm. They have no back, so "facing the ring" is the long axis along the open edge.
- No branded ring canvas, no fighter posters with real type, no lockers.
