# Attributions

No new bulk GLBs. Furniture is symlinked from existing scene bakes of Hugging Face `Sandflow/sand3d-objaverse` programs (CC-BY). Chairs, mirrors, basin, pole, counters, and tools are original geometry in `barbershop.js`.

- **sofa_solid** (`objaverse-2172bb7e3b994189b4b654b258fa03d6`) — "Basic Red Couch". `ktv/assets/sofa_solid__2172bb7e3b99.glb`. The bake renders gray; the oxblood and green pads are procedural.
- **coffee_table** (`objaverse-29a509d8be0b448c8f0332e6102a0d6f`) — "Coffee Table". `ktv/assets/coffee_table__29a509d8be0b.glb`. Height kept at 0.40 m; plan scaled to 0.62 × 0.68 because the bake is 1.82 m long.
- **museum_bench** (`objaverse-0025f9484fc64af29f59cf11a8beced7`) — "Bench". `museum/assets/museum_bench__0025f9484fc6.glb`. Seat height 0.46 m.
- **wall_shelf** — library/cafe bake, Sandflow/sand3d-objaverse, CC-BY. `library/assets/wall_shelf__8732f5e14a30.glb`. Open face is local +Z; rotation π/2 turns it into the room from the left wall.
- **Library Desk Lamp** (`objaverse-06accd4e0351480e8c4eb2f28fadaa35`) — "Library Desk Lamp" by oriolescolarcano, CC-BY-4.0. `library/assets/library_lamp__06accd4e0351.glb`. Shade throws toward local −Z.
- **cash_register** — "Day1.Draft Cash Register" by illusive_skarwing, CC-BY-4.0. `cafe/assets/cash_register__870f6ebb115a.glb`. Key front is local +Z, toward the entry.
- **pendant_lamp** — "Modern ceiling lamp" by krolzuzannapl, CC-BY-4.0. `cafe/assets/pendant_lamp__1b528c6ab04e.glb`.
- **flowerpot** — "Flowerpot" by thespaceman, CC-BY-4.0. `cafe/assets/flowerpot__4a270f247734.glb`. Tinted terracotta. Foliage is procedural.
- **jam_jar** — "jam jar" by jwpthecoolguy2, CC-BY-4.0. `cafe/assets/jam_jar__4e43eb29aa14.glb`. Stands in for tonic bottles.

Three.js r170 is the vendored copy under `cafe/vendor`, linked, not duplicated.

Inspected and not used: the oak dining chair bake is 0.33 m wide at a 0.90 m back, too narrow for an adult seat. The theatre chair is an auditorium seat. The bar stool is a round cafe perch.
