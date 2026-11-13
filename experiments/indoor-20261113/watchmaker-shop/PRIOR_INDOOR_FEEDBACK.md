# Prior indoor feedback

## Historical notes

These are the notes this experiment was told to keep. They are not scores, and this folder does not rebuild any older room.

- Earlier indoor scenes were too crude, too sparse, and too monotonous.
- Shading and rendering were too simple.
- The remedy is more design and more shading structure, not only more objects under one shader.
- Check orientation, bench and seat proportions, and walkways.

## Fresh observations

From this shop, after looking at the four committed shots:

- Wood, metal, cloth, and plaster each have their own stepped gradient. The floor is a plank map, the benches carry a grain map, and dials and drawer plates are canvases. Unlit drops those meshes to `MeshBasicMaterial`, so the wide unlit frame is flat albedo with no cast shadows. The toon frames show hard shadow bands on the floor and wainscot, and the task lamps stay warm.
- Bench tops are 0.96 m. The bar-stool seat lands near 0.68 m, with about 0.21 m under the apron for the thighs and about 0.28 m from seat to the work. Waiting chairs face a 0.72 m table, with about 0.30 m from seat to top. `tests/orientation_checks.py` locks those numbers.
- Stools face the benches. The south waiting chair faces +Z into the table and the north chair faces −Z. Register keys face the maker. Lamp shades, which overhang local −Z, are turned π so the light falls toward the stool. The bookcase opens toward +X.
- The aisle from the stool fronts to the back of the counter is 1.26 m. The entry path stays at least 0.38 m off the solids. The default and corner frames show that floor, not a blocked corridor.
- The close frame is the main bench: green felt, maple pin, loupe, drivers, a movement, a strapped watch, the oil jar, and the lamp. A sliver of the stool seat remains at the lower left, which is the seat at the kneehole, not an object parked on the work.
- What is still thin: the watches are enlarged, the side pedestal is wood with pieces on top rather than a glazed vitrine, and the lathe, ultrasonic, and timing screen are built from boxes. The wide shots crop the back-right cabinet. Drawer words are clear up close and small from the door.
