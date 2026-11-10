# Architecture studio (Three.js + sand3d)

Cutaway architect's studio for one project, North Courtyard. Oak drafting bay, concrete model shop, back-wall pin-up, and a five-bay material library under three sawtooth skylights.

## Open

From this directory (asset and Three.js symlinks resolve through the scene server):

```bash
cd experiments/sprint-20261110/architecture-office
python3 -m http.server 8788 --bind 127.0.0.1
```

http://127.0.0.1:8788/

`T` toon · `U` unlit · `?mode=unlit` · `?cam=corner` · `?cam=close` · `?shot=1` hides the HUD.

## Check

```bash
python3 experiments/sprint-20261110/architecture-office/test_layout.py
```

## What is in the room

- **Pin-up** on the back wall: plan, section, and elevation of the same courtyard scheme, plus a trace overlay and a sample chip board. A bench and a crit table face the wall. A lectern and an easel carry the same set.
- **Drafting bay**: two staggered boards, high edge toward the pin-up, chairs on the low side facing the work. A rotated study desk with a monitor is the digital station, not a third clone of the boards.
- **Model shop**: standing-height bench, white massing model, cutting mat, flat file, stools, and a task lamp. The floor changes from oak to concrete at this bay.
- **Material library**: stone, timber, masonry, metal, and textile bays along the left wall, a binder case in the corner, and a pulled sample rack by the model bench.
- **Light**: sawtooth monitors over the pin-up, the senior board, and the model table. Banker-lamp bulbs are emissive, with a short point light at each task lamp. Contact ellipses sit under grounded furniture.

GLBs are symlinks to existing scene bakes. Drafting tables, the model bench, the pin-up, the skylights, and the sample wall are procedural because the catalog has no those objects.
