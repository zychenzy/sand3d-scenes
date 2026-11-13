# Gaps

HF candidate renders were inspected through the dataset viewer. `sand3d` and `bake_preferred.py` are not in this repo, so nothing new was baked. Shared GLBs stay read-only root references.

Looked at, and not used as meshes:

- Cat tree `objaverse-7e117b7dd09b447bb7b74e7768e3bade` ("Cat Tree" by lilithelotor, CC-BY-4.0, f≈0.95, entry `staggered_post`). The render is a grey post with 410 mm square ledges. A carrier here is about 500 mm long, so those ledges cannot hold one. The alcove uses local trays with lips, sized for a carrier, and a sisal post. Same staggered idea, not that mesh.
- Operating table `objaverse-43736bb6a0b64fe8a824542bdbace6bc` ("Game Prop: Mental Asylum Gurney" by eymori). Black top, restraints, handwheel. That reads as a horror gurney, not a consult table. Exam 1 is a stainless top at 0.86 m with a rubber mat.
- Kitchen scale `objaverse-deee2ca3da0548368b435605718933dc` ("Kitchen Scales" by frezer2011). Program housing is about 200 × 149 × 116 mm and the render is a featureless wedge. Right size for a cat counter scale, no readable dial. The exam scale is local geometry at those dimensions, with digits. It is not the walk-on scale.
- Balance `objaverse-e429eb9387f34baba64402b3e4b4a629` ("Old Stylized Weight Scale"). Shop balance with weights. Wrong instrument.
- A dataset search for "veterinary" returned no rows. Sketchfab cat-carrier `0ca7a2d3`, scanned cat-tree `21942f2`, pet-carrier `ae5eab7` (includes a dog), and vet elevation table `24875ff` are not in the dataset USDA tree (404).

Closed in this scene:

- Reception desk at 1.07 m and a 0.84 m writing shelf with open knee space.
- Cat chairs face the perch wall. Dog chairs and the bench face the low table. The stool faces the client edge. The monitor screen faces the stool.
- One carrier sits on the middle perch. Two sit on the floor, cat side and dog side. The dog carrier door is open. No animals.
- Walk-on platform is 70 mm with a clear approach off the entrance spine. Exam 1 is a glimpse, not a lab.
- Entrance clear width is 1.58 m, with a flat threshold rather than a step.
- Floor is linoleum, not a wood photo. Desk grain is a fine repeat. Walls do not cast shadow maps. Contact discs sit under the floor furniture.

Still open:

- Carriers, the walk-on scale, and the exam table are procedural. A CC-BY carrier or floor scale is not in the baked set.
- The wall shelf is a generic two-tier shelf. Product boxes in front of it are local.
- The banker's lamp is the library bake. Its green shade is a task lamp, not a clinic brand.
- Contact shadows are discs, not bent-normal AO.
- The appointment board lists species slots, not a real day sheet.
