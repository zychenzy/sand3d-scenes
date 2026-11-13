# Gaps

Photo reference (links in `SOURCES.md`): a neighborhood key shop reads as a blank wall, a duplicator with two vises and a cutter wheel, trays of cylinders and padlocks, a small rekey bench, and a counter the customer does not walk behind.

## Inspected, not used

Hugging Face `Sandflow/sand3d-objaverse` search, renders opened before any bake:

- `objaverse-c9f0cf0cbbe64ba49001d644244b1d16` — Padlock by nichgon. Render is a real shackle lock. Baked. f-score 0.99.
- `objaverse-0d26d3c8abea4be5839d8e4969984a1d` was requested as a padlock; the row that came back with that search token was an eraser block (`objaverse-7a8ee11ee4c744a6abea5fa00aa7adb6`). Rejected.
- `objaverse-3d043b85f1ce4b29a3fbb03763c86203` was requested as a low-poly padlock; the returned program was a vase. Rejected.
- Toolbox search hit `objaverse-5e76452dfe1146c4878a0368e9548bf2` in the index, but the fetched program was an Xbox case panel. Rejected.
- Workbench / vise search did not return a duplicator (`duplicator` total 0). One fetched "workbench" row was a dumbbell. No carpentry bench was baked; a carpentry bench would not be this rekey bench.
- `key` search returned keyboards. No key-blank GLB.

## Closed in this folder

- Padlock program baked to `assets/padlock__c9f0cf0cbbe6.glb` (about 76 KB, no Draco). Six instances on the cart and the handoff top.
- Key blanks, the duplicator, both vises, pin cylinders, mortise bodies, the pinning mat, and the grille counter are procedural, matched to the photos above rather than scaled cubes.

## Still open

- The baked padlock is the flat nichgon body. A round body lock was not in the clean hits.
- No catalog duplicator, bench vise, key blank, or pin tumbler. Those stay procedural.
- Blank codes on the pegwall (KW1, SC1, Y1, M1, DE6) are row labels, not a full manufacturer board.
- The wall shelf is a cafe shelf used for small stock. It is not a lock cabinet.
- Contact darks are a shadow map with normal bias, not a screen-space AO pass.
