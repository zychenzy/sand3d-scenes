# Attributions

Furniture is referenced from existing Sandflow/sand3d-objaverse bakes (CC-BY-4.0). Files are not copied. Sheet glass, the leaded window, foil rolls, the soldering iron, the vent hood, came, the grinder, and the cartoons are local Three.js meshes in `stained.js` and have no external model credit.

- **wall_shelf** `cafe/assets/wall_shelf__8732f5e14a30.glb` — "CC0 - Wall Shelf 4" by plaggy, https://sketchfab.com/3d-models/8732f5e14a30461f83bcb34a9101cbc0, CC-BY-4.0
- **easel** `workshop/assets/easel__4d7f020db965.glb` — canvas easel, objaverse-4d7f020db96545519c43e5b0ec077a83, by shaanshaikh, CC-BY-4.0. Holds the cartoon.
- **pendant_lamp** `workshop/assets/pendant_lamp__1b528c6ab04e.glb` — "Modern ceiling lamp" by krolzuzannapl, https://sketchfab.com/3d-models/1b528c6ab04e42f990105db142cd71bd, CC-BY-4.0
- **library_lamp** `library/assets/library_lamp__06accd4e0351.glb` — "Library Desk Lamp" by oriolescolarcano, objaverse-06accd4e0351480e8c4eb2f28fadaa35, CC-BY-4.0. Task lamp on the solder bench. The shade tube is marked emissive.
- **jam_jar** `cafe/assets/jam_jar__4e43eb29aa14.glb` — "jam jar" by jwpthecoolguy2, https://sketchfab.com/3d-models/4e43eb29aa144bdbada1ec500d218a81, CC-BY-4.0. Stands in for flux, patina, and cutting oil.

The light table, solder bench, and cutting bench are procedural shop benches (thick top, apron, square legs, lower shelf). The light well is recessed in the bench top. The seats are four-leg shop stools with a foot ring. No catalog mesh had that silhouette: the trestle table, student desk, piano bench, square dining table, and metal cafe chair were removed because they read as domestic furniture.

Three.js r170 is imported from `workshop/vendor/` (MIT). This scene does not vendor a second copy.

Catalog inspection used the baked GLBs already in the repo (node-transformed bounds and material names). No new bake was run: the specialist glass, foil, iron, came, and hood are not in the catalog, and copying a fresh bake into this folder was out of scope.
