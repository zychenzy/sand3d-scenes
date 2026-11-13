# Sources

Links only. Reference images, Hugging Face parquet, candidate programs, and the bake venv are not in git.

## Dataset

- Sandflow/sand3d-objaverse — https://huggingface.co/datasets/Sandflow/sand3d-objaverse
- Programs were read from the public parquet shards (columns `id`, `entry`, `family`, `program`, `attribution`, `f_score`). Bakes used sand3d 1.6.3 and bpy 4.5, Python 3.11. Output is metres GLB.

## Models used

Sketchfab pages, all CC-BY-4.0, rewritten as sand3d programs:

- Washing Machine, sixpence — https://sketchfab.com/3d-models/4949ac257c7848c7a6c9149218ecfaae
- Dryer, ra3id — https://sketchfab.com/3d-models/ea0080f2433b41578145944a3d0b350c
- Washer Dryer Machine, rhcreations — https://sketchfab.com/3d-models/8358b47f171d43e98f473083ce55b36e
- Vending Machine, Odd1In — https://sketchfab.com/3d-models/0b4c70c0d73d4f259998d5898e542104
- Folding Chair, GreenLineStudio — https://sketchfab.com/3d-models/29a31e346a0b44659dcc0d939a2cf2d0
- Laundry Basket (lattice), fatihmcnn — https://sketchfab.com/3d-models/b6aa6e7f91d545f3bb5d4027a83e2da1
- Laundry Basket (tub), cirby2180 — https://sketchfab.com/3d-models/74c95870e2a141a9903815715d25b8a7
- 5 Clothes Dryer, SergeyB — https://sketchfab.com/3d-models/0e12a394f1864a629f9022956c8ea349
- parquet detergent with almond oil 1220ml, alex.shulai — https://sketchfab.com/3d-models/b3bdba13378e42caa3574f54e96ee32e
- Bench, RookeyJerry — existing museum bake, Objaverse `0025f9484fc64af29f59cf11a8beced7`

## Room references

The plan is a neighbourhood coin laundry: washer bank on the long wall, dryers on the return, a fold table in the middle, waiting chairs off the work aisle, and a vending run by the entry. It is not a copy of one shop.

- Coin laundry interior, washers and dryers in banks — https://commons.wikimedia.org/wiki/Category:Laundromats
- Self-service laundry, folding table and carts — https://commons.wikimedia.org/wiki/Category:Interiors_of_laundromats
