# Attributions

Reused cafe GLBs are symlinks into `cafe/assets/`. Credits match `cafe/ATTRIBUTIONS.md`.

- **bar_stool** → `bar_stool__319fcb56afe8.glb` — "Bar stool lowpoly" by vaporclaws, https://sketchfab.com/3d-models/319fcb56afe845caae5464b129c99633, CC-BY-4.0
- **cup_mug** → `cup_mug__6da6f7f87b8d.glb` — "Stylized Coffee Cup" by n30hrtgdv, https://sketchfab.com/3d-models/6da6f7f87b8d4706a563331657d6b5c3, CC-BY-4.0
- **pendant_lamp** → `pendant_lamp__1b528c6ab04e.glb` — "Modern ceiling lamp" by krolzuzannapl, https://sketchfab.com/3d-models/1b528c6ab04e42f990105db142cd71bd, CC-BY-4.0
- **cash_register** → `cash_register__870f6ebb115a.glb` — "Day1.Draft Cash Register" by illusive_skarwing, https://sketchfab.com/3d-models/870f6ebb115a440da5b8fed8072d7d9e, CC-BY-4.0
- **pos_terminal** → `pos_terminal__91c277a25bc3.glb` — "POS terminal" by Vladyslav.Yarovyi, https://sketchfab.com/3d-models/91c277a25bc34c5bbd080cd1e74161cb, CC-BY-4.0
- **flowerpot** → `flowerpot__4a270f247734.glb` — "Flowerpot" by thespaceman, https://sketchfab.com/3d-models/4a270f2477344b55b359e2913f5530f2, CC-BY-4.0

Baked from Sandflow/sand3d-objaverse (CC-BY-4.0 program):

- **bowling_pin** → `bowling_pin__40a52bb7b68b.glb` — "Bowling Pin" by rawdom, https://sketchfab.com/3d-models/40a52bb7b68b41658f0f657805752468, CC-BY-4.0. Program kept in `programs/bowling_pin__40a52bb7b68b.py`. Red neck rings are added in the scene, not in the mesh.

Original sand3d programs in this folder (no external mesh):

- `programs/house_ball.py` — pearl house ball with three dark grip inserts
- `programs/lane_seat.py` — settee, backrest toward +Z so `rotationY = 0` faces the pins
- `programs/drink_table.py` — low drink table between a seat pair

Lanes, gutters, returns, counters, cubbies, rack, consoles, masking, and signs are Three.js geometry in `bowling.js`. Three.js and OrbitControls are the cafe vendor, symlinked at `vendor/`.
