# Prior indoor feedback

Historical notes from the brief for this experiment, then what this shop actually showed. No scores are invented for older rooms, and those rooms were not rebuilt.

## Historical notes

Earlier indoor scenes were called crude, sparse, and monotonous. Shading and rendering were too simple. Putting more objects under the same shader was not treated as a fix. Seat fronts have to face the thing they are for. Furniture proportions and walkways need a check. Unlit frames are required so the geometry can be judged apart from the lighting.

## What changed in this shop

The room is a barbershop plan: three mirror stations, tool counters, a retail wall, waiting seats, reception, a pole, and a wash corner, with an open checker aisle between them. Toon shading uses two gradients (cloth and metal), hard basic shadows, and practical bulbs. Unlit is a real `MeshBasicMaterial` pass, saved as `shots/unlit_default.png`.

## Fresh observations

Measured on the salon-chair GLB after `prepareAsset`. At yaw 0 the footrest (`leg`) sits on local +Z and the head pad sits on local −Z. The first layout used that yaw, so the tall back faced the mirrors and the footrest pointed into the room. Yaw π turns the footrest toward the mirror wall. World bounds after the fix: head pad near z = −1.82 (room side), footrest toward the cabinets near z = −3.0. A side camera from the room side shows the back closest and the leg rest running at the mirror. Wide-shot captions still sometimes call that tall back a footrest. The mesh bounds are the check, and `tests/layout.test.mjs` requires the declared front to align with each `lookAt`.

The catalog display bookcase rendered as a blank white block and hid the left wall. It is not in the scene. An open procedural shelf holds the bottles and jars. The clipper's long axis was treated as height and landed about 0.7 m long on the counter; it is now fit on its long axis to 0.22 m. The barber pole sat outside the first default frame. The default camera is pulled back so the pole, three stations, desk, and waiting seats are in one view.

Waiting chairs face the coffee table (front +Z, north chair yaw 0, south chair yaw π). The bench's +X side faces the table. Work stools are radial and sit beside the chairs. Walk samples stay at least 0.38 m from the solid footprints, including the salon chair's real 0.52 × 0.86 m extent.

Still thin: mirrors do not reflect, the cape is a card, the flowerpot reads as a pot from above, and the jars are unlabeled. Those are listed in `refs/GAP.md`.
