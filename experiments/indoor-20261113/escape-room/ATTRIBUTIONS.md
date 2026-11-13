# Attributions

Furniture GLBs are read-only symlinks to existing sand3d bakes. Nothing in those kits was modified. Three.js r170 is the workshop vendor, also symlinked, and the page loads it only from `./vendor/three.module.js`.

Sources are Hugging Face `Sandflow/sand3d-objaverse` programs, CC-BY-4.0, plus the cafe and museum kit bakes already in this repo.

- **Study Table for any student room** (`objaverse-630f6d76cbcd49cbb1d8ce7fe4e41f27`) — by athgames, CC-BY-4.0 — `library/assets/study_desk__630f6d76cbcd.glb`
- **School Desk** (`objaverse-57f955646049490eba8a12c1a4d8357b`) — "School Desk" by toxicaura_, CC-BY-4.0 — `library/assets/school_desk__57f955646049.glb`
- **Wooden Dining Chair** (`objaverse-5e1f7a56da4a4dab8ad64efd46ed9d9f`) — by vikki0612, CC-BY-4.0 — `library/assets/dining_chair__5e1f7a56da4a.glb`
- **Library Desk Lamp** (`objaverse-06accd4e0351480e8c4eb2f28fadaa35`) — "Library Desk Lamp" by oriolescolarcano, CC-BY-4.0 — `library/assets/library_lamp__06accd4e0351.glb`
- **Book Stand** (`objaverse-fb784262748d414fa1ff882a871a5af8`) — by jba41662, CC-BY-4.0 — `library/assets/book_stand__fb784262748d.glb`
- **canvas** (easel) (`objaverse-4d7f020db96545519c43e5b0ec077a83`) — by shaanshaikh, CC-BY-4.0 — `workshop/assets/easel__4d7f020db965.glb`
- **Groveland Square Dining Table** (`objaverse-7aaf2767b5f04a80b49c950f0bdb918a`) — by allenbranch, CC-BY-4.0 — `workshop/assets/square_table__7aaf2767b5f0.glb`
- **Chalkboard** (`objaverse-72286e591df64c2fbc75f00f085f3d64`) — by chin4grci4, CC-BY-4.0 — `cowork/assets/chalkboard__72286e591df6.glb`
- **Bench** (`objaverse-0025f9484fc64af29f59cf11a8beced7`) — by RookeyJerry, CC-BY-4.0 — `museum/assets/museum_bench__0025f9484fc6.glb`
- **Museum Case** (`objaverse-6bce39246b2c4607896c7d0398a6a917`) — museum plinth bake — `museum/assets/museum_plinth__6bce39246b2c.glb`
- **piano bench** (`objaverse-10332493b3a64b02859519ec64d221d0`) — by doriantsanders, CC-BY-4.0 — `music/assets/piano_bench__10332493b3a6.glb`
- **Modern ceiling lamp** (`pendant_lamp__1b528c6ab04e`) — by krolzuzannapl, Sketchfab CC-BY-4.0 — `cafe/assets/pendant_lamp__1b528c6ab04e.glb`
- **Flowerpot** (`flowerpot__4a270f247734`) — by thespaceman, Sketchfab CC-BY-4.0 — `cafe/assets/flowerpot__4a270f247734.glb`
- **jam jar** (`jam_jar__4e43eb29aa14`) — by jwpthecoolguy2, Sketchfab CC-BY-4.0 — `cafe/assets/jam_jar__4e43eb29aa14.glb`
- **Stylized Coffee Cup** (`cup_mug__6da6f7f87b8d`) — by n30hrtgdv, Sketchfab CC-BY-4.0 — `cafe/assets/cup_mug__6da6f7f87b8d.glb`
- **Thermos** (`thermos__c85ee7b8828b`) — by Platon_Debik, Sketchfab CC-BY-4.0 — `cafe/assets/thermos__c85ee7b8828b.glb`
- **Day1.Draft Cash Register** (`cash_register__870f6ebb115a`) — by illusive_skarwing, Sketchfab CC-BY-4.0 — `cafe/assets/cash_register__870f6ebb115a.glb`
- **Round side coffee table marble top** (`round_table__49e5ede6a16d`) — by 3DTechDesignCo.Ltd, Sketchfab CC-BY-4.0 — `cafe/assets/round_table__49e5ede6a16d.glb`. Used at its own proportions as the window chart table (height 0.70 m, top about 0.84 m across).
- **Straw Holder** (`straw_holder__252f730f1a04`) — by KatH10, Sketchfab CC-BY-4.0 — `cafe/assets/straw_holder__252f730f1a04.glb`. The bake is a lidded canister, not loose straws. Height 0.20 m.
- **IKEA FULLSPÄCKAD serving tray** (`tray_napkin__86821ece655f`) — by ceragir, Sketchfab CC-BY-4.0 — `cafe/assets/tray_napkin__86821ece655f.glb`. The bake is a two-tier stand. Height 0.26 m, about 0.31 m wide.
- **CC0 Wall Shelf 4** (`wall_shelf__8732f5e14a30`) — by plaggy, Sketchfab CC-BY-4.0 — `cafe/assets/wall_shelf__8732f5e14a30.glb`. Height fit 0.78 m gives a shelf about 0.68 m wide and 0.28 m deep. It is not scaled on one axis.

Three.js r170 (MIT) is `workshop/vendor/`, used read-only.

Cabinets, dials, the mechanical panel, the chart, the wall slate, the tide staff, the key, the compass, the bell, the chests, the bollard, the window view, and the plants are local geometry in `escape-room.js` and `panels.js`. They are not external models. The chalkboard GLB stays in the layout and is hidden at runtime: its bake is a brown floor stand, and the readable slate is the local board. The book stand GLB was inspected and not placed: it reads as a dark podium and was blocking the slate.
