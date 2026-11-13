# Attributions

Catalog meshes are existing Sandflow/sand3d-objaverse bakes (CC-BY-4.0), referenced by relative path. They are not copied into this folder.

- **Study desk** (`cowork/assets/study_desk__630f6d76cbcd.glb`, `objaverse-630f6d76cbcd49cbb1d8ce7fe4e41f27`) — "Study Table for any student room" by athgames. Cue desk inside the booth.
- **Wooden dining chair** (`cowork/assets/dining_chair__5e1f7a56da4a.glb`, `objaverse-5e1f7a56da4a4dab8ad64efd46ed9d9f`) — by vikki0612. Engineer seat.
- **Monitor** (`cowork/assets/monitor__b7429da7ef4a.glb`, `objaverse-b7429da7ef4a432ca280a721e8dfe24c`) — by voglreiter.m07. Picture monitor facing the engineer.
- **Library desk lamp** (`cowork/assets/library_lamp__06accd4e0351.glb`, `objaverse-06accd4e0351480e8c4eb2f28fadaa35`) — by oriolescolarcano.
- **Speaker** (`music/assets/speaker__2db67686cd88.glb`, `objaverse-2db67686cd884068b5904b438844d525`) — by vovaustim. One cue speaker in the booth.
- **Groveland square dining table** (`workshop/assets/square_table__7aaf2767b5f0.glb`, `objaverse-7aaf2767b5f04a80b49c950f0bdb918a`) — by allenbranch. Prop table.
- **Modern ceiling lamp** (`workshop/assets/pendant_lamp__1b528c6ab04e.glb`) — by krolzuzannapl, https://sketchfab.com/3d-models/1b528c6ab04e42f990105db142cd71bd
- **Bench** (`museum/assets/museum_bench__0025f9484fc6.glb`, `objaverse-0025f9484fc64af29f59cf11a8beced7`) — by RookeyJerry. Shoe-change bench.
- **Stylized coffee cup** (`cafe/assets/cup_mug__6da6f7f87b8d.glb`) — by n30hrtgdv, https://sketchfab.com/3d-models/6da6f7f87b8d4706a563331657d6b5c3
- **Jam jar** (`cafe/assets/jam_jar__4e43eb29aa14.glb`) — by jwpthecoolguy2, https://sketchfab.com/3d-models/4e43eb29aa144bdbada1ec500d218a81
- **Thermos** (`cafe/assets/thermos__c85ee7b8828b.glb`) — by Platon_Debik, https://sketchfab.com/3d-models/c85ee7b8828b44998bb1cec3971424ec
- **Serving tray** (`cafe/assets/tray_napkin__86821ece655f.glb`) — "IKEA FULLSPÄCKAD - Serving tray" by ceragir, https://sketchfab.com/3d-models/86821ece655f4ca5adb8f2864bb7897e

Baked in this folder (`programs/bake_foley_props.mjs`), original geometry, not Objaverse:

- `assets/shotgun_mic.glb` — shotgun capsule, local +Z is the grille
- `assets/foley_shoe.glb` and `assets/foley_shoe_r.glb` — left and right character shoes
- `assets/stage_door.glb` — rolling stage door on casters, ajar, with a latch
- `assets/water_basin.glb` — galvanized splash tub

Pits, baffles, the cue booth, the picture screen, the pipe grid, the cloth rail, the thunder sheet, the stair unit, the ceiling, and the four-leg work stool are procedural meshes in `foley.js`.

Three.js r170 is the vendored build in `music/vendor/three.module.js`, imported, not copied.
