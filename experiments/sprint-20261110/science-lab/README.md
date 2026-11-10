# Science discovery lab

A cutaway hands-on hall: an optics bay, a tilted orrery, a workshop island, and a storage alcove. Toon-hard Three.js, same stepped gradient as the other sand3d rooms. Furniture GLBs are symlinks into existing scene bakes. Architecture, posters, the orrery, and the light rays are local.

## Open

From the repository root:

```bash
cd experiments/sprint-20261110/science-lab
python3 -m http.server 8774 --bind 127.0.0.1
```

http://127.0.0.1:8774/

- `T` toon, `U` unlit, or `?mode=unlit`
- `?cam=corner` storage alcove, `?cam=close` orrery, `?cam=optics` the prism bench
- `?shot=1` hides the HUD
- Click the prism, the lens, or a planet. `P` pauses the orrery. Click the sun to pause too.

## Check

```bash
node --check science-lab.js && node tests/check-layout.mjs
```
