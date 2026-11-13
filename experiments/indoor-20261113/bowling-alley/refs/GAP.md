# Gaps

- **Lane length.** A full approach-to-head pin distance is about 18.29 m. This cutaway uses about 11 m from foul (`z = 2.35`) to the head pin (`z = -8.88`) so both ends fit in one frame. Width, gutter, and pin spacing stay at house size.
- **House ball.** Sandflow/sand3d-objaverse search for a bowling ball ranked pins and did not return a grip ball. `programs/house_ball.py` is original. The grip is three dark inserts on the crown. Under MeshToonMaterial a same-color boolean cavity disappears, so the inserts are separate dark plastic. In `shots/toon_close.png` one dark mark reads on the near ball; the other two sit on the crown and are easy to miss at this distance.
- **Shoe desk.** The rental counter, cubbies, register, and size sign are in the layout, on the +Z end of the left wall, facing the concourse. The hero camera favors the lanes, so that desk is only partly in `shots/toon_default.png`.
- **Stools.** The reused bar stool is round. `rotationY = -π/2` points the contractual front at the snack counter; the mesh has no backrest to prove it.
- **Score and menu graphics** are canvas textures, not modeled electronics. Unlit keeps the emissive map so the screens do not go black.
- **No bloom, no ball animation, no pinsetter mechanism.** Masking and the hood are boxes.
- **Vendor and reused GLBs** are symlinks into `cafe/`. They break if this folder is copied without the cafe tree.
- **sand3d 1.6.3** was baked with a Python 3.13 venv outside the repo. Draco/meshopt warnings on export are non-fatal. The venv is not committed.
