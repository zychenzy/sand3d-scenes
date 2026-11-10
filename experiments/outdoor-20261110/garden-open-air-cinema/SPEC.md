# Garden open-air cinema

Outdoor summer cinema in a brick-walled garden. Units are metres. Y is up. The screen sits on the −Z wall; a chair with `rotationY` near 0 faces that screen (foot rail at local −Z, backrest at local +Z). Do not set chair yaw to π.

## Site

- Lawn, gravel paths, and planted beds inside a brick wall with coping. A barred gate and steps are on the +Z side.
- Tensile screen: raked masts, hem tubes, guy wires, and a fabric with a soft belly. The picture is an original dusk canvas (gradient, disc, arcs, blocks). It is emissive so it stays readable in toon and in unlit. No film still, poster, or lettering.
- 4 rows × 8 folding deckchairs. Odd rows stagger outward. Each chair toes toward the screen. Stripe pairs are terracotta, teal, ochre, and navy.
- Center aisle and two side aisles stay clear of chair footprints.
- Projector booth closes the right aisle. A timber cable cover runs that aisle and turns toward the screen mast. A short drop connects the projector to the cover.
- Drinks cart in a gravel bay cut out of the left bed, with cafe mugs, a thermos, jam jars, and bottles. The through-aisle stays open.
- Festoon catenaries on the walls, across the seating, and at the screen crown. Planted edge: shrubs, lavender, grass, daisies, ferns, climbers, a cypress, and trees with forked trunks and layered canopies outside the walls.

## Light and cameras

Dusk. Hemisphere plus one warm key from the screen-left and a cool fill. No point lights. One shadow-casting key, hard toon steps. Fog takes the meadow into the horizon so the ground does not read as a floating square.

- Default: whole garden, gate in the foreground, screen centered.
- Corner: opposite high view, booth and side path.
- Close: eye height in the right block, chairs and the screen edge.

## Acceptance

`placement.js` is shared by the scene and `tests/facing.mjs`. A chair counts as facing the screen when its foot is closer to the screen than its back, the facing dot is above 0.9, and the yaw stays under about 60°. The same check rejects chair overlap, aisle and cable collisions, booth and cart collisions, and analytic rays from the default and corner cameras that hit the booth, the cart, or a chair before the screen. The running scene repeats the check on the built meshes and requires both camera rays to hit the screen fabric.
