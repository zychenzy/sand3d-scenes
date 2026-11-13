# Attributions

Shared meshes are existing Sandflow/sand3d-objaverse bakes (CC-BY-4.0), referenced by path from `cafe/assets`. They are not copied into this folder.

- **cup_mug** — "Stylized Coffee Cup" by n30hrtgdv, https://sketchfab.com/3d-models/6da6f7f87b8d4706a563331657d6b5c3, CC-BY-4.0. Vanity cup.
- **jam_jar** — "jam jar" by jwpthecoolguy2, https://sketchfab.com/3d-models/4e43eb29aa144bdbada1ec500d218a81, CC-BY-4.0. Small jar on the vanity.
- **thermos** — "Thermos" by Platon_Debik, https://sketchfab.com/3d-models/c85ee7b8828b44998bb1cec3971424ec, CC-BY-4.0. Water bottle on the vanity.
- **wall_shelf** — "CC0 - Wall Shelf 4" by plaggy, https://sketchfab.com/3d-models/8732f5e14a30461f83bcb34a9101cbc0, CC-BY-4.0. Scaled to a short shelf beside the mirror.

Baked in this folder with `programs/bake_props.mjs` (vendored Three.js r170 geometries, no image maps). Original geometry for this scene, not a traced Objaverse mesh:

- `assets/reading_lamp.glb` — wall sconce for each berth
- `assets/pillow.glb` — soft pillow
- `assets/luggage_locker.glb` — one luggage locker, instanced as a 4 × 3 bank

Three.js r170 is the cafe vendor build (MIT), imported from `cafe/vendor/three.module.js`. The shell, curtains, ladders, bedding mounds, sink, and mirror are procedural meshes in `capsule.js`.
