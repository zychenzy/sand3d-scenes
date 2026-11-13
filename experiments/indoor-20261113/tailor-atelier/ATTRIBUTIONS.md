# Attributions

Programs come from Hugging Face [`Sandflow/sand3d-objaverse`](https://huggingface.co/datasets/Sandflow/sand3d-objaverse) (CC-BY-4.0) and were baked to GLB with `sand3d` + Blender `bpy` into this folder only. Shared furniture is a symlink into an existing scene bake, not a new copy of the bytes.

Baked here:

- **Vintage sewing machine** (`objaverse-4f6c74f9f904439b8554078d1be14821`) — "Vintage sewing machine" by halilkantarci, https://sketchfab.com/3d-models/4f6c74f9f904439b8554078d1be14821, CC-BY-4.0; rewritten as a sand3d program. File: `assets/sewing_machine__4f6c74f9f904.glb`.
- **Iron** (`objaverse-3937687366b942cbb7d4ff9ac2389db5`) — "Ironing" by cfmbido, https://sketchfab.com/3d-models/3937687366b942cbb7d4ff9ac2389db5, CC-BY-4.0; rewritten as a sand3d program. File: `assets/iron__3937687366b9.glb`.

Symlinked from existing bakes:

- **Wooden Dining Chair** (`objaverse-5e1f7a56da4a4dab8ad64efd46ed9d9f`) — by vikki0612, CC-BY-4.0. `workshop/assets/dining_chair__5e1f7a56da4a.glb`.
- **Modern ceiling lamp** — by krolzuzannapl, https://sketchfab.com/3d-models/1b528c6ab04e42f990105db142cd71bd, CC-BY-4.0. `workshop/assets/pendant_lamp__1b528c6ab04e.glb`.
- **Flowerpot** — by thespaceman, https://sketchfab.com/3d-models/4a270f2477344b55b359e2913f5530f2, CC-BY-4.0. `workshop/assets/flowerpot__4a270f247734.glb`.
- **Stylized Coffee Cup** — by n30hrtgdv, https://sketchfab.com/3d-models/6da6f7f87b8d4706a563331657d6b5c3, CC-BY-4.0. `cafe/assets/cup_mug__6da6f7f87b8d.glb`.
- **Wall shelf** — "CC0 - Wall Shelf 4" by plaggy, https://sketchfab.com/3d-models/8732f5e14a30461f83bcb34a9101cbc0, CC-BY-4.0. `library/assets/wall_shelf__8732f5e14a30.glb`. End panels named `end_panel` are hidden so it can sit on the east wall.

Three.js r170 is the vendored build in `workshop/vendor/` (`three.module.js`, `OrbitControls.js`, `GLTFLoader.js`, `BufferGeometryUtils.js`), symlinked under `vendor/`.

## Original to this scene

Cutting table, sewing tables, dress forms, bolt rack, notions dresser, pressing board, pattern stand, scrap bin, thread frame, shell, weave and pattern textures, and the client jacket are procedural meshes in `atelier.js`. No downloaded images.
