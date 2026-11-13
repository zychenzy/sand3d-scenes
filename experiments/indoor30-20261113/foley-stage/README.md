# Foley stage

A quiet 14 × 12 × 4.5 m sound-effects stage. Three recessed footstep pits (gravel, wood, sand), a rolling door rig, shoe racks, a small water basin, and a double-glazed cue booth. The pits and the picture screen are the subject. There is no vocal booth, piano, guitar amp, or console in the middle of the room.

Default shading is hard-stepped toon (`MeshToonMaterial`, nearest-neighbor 4-step gradient, shadow band lifted off black). `U` switches every mesh to `MeshBasicMaterial`.

## Open

From the repo root, so the shared vendor and GLB paths resolve:

```bash
python3 -m http.server 8788 --bind 127.0.0.1
```

<http://127.0.0.1:8788/experiments/indoor30-20261113/foley-stage/>

`T` toon · `U` unlit · `?mode=unlit` · `?cam=corner` · `?cam=close` · `?clean=1` hides the HUD.

## Test

```bash
node --test experiments/indoor30-20261113/foley-stage/tests/layout.test.mjs
node experiments/indoor30-20261113/foley-stage/tests/runtime.mjs
```

The layout test checks pit separation, mic aim, the door latch, shoe count, pathway clearance, and texture size. The runtime test loads the page in headless Chrome, checks toon and unlit materials, and writes the four shots in `shots/`.

Shared catalog GLBs and Three.js r170 are read from `cowork/`, `music/`, `workshop/`, `cafe/`, and `museum/`. They are not copied. Foley-only meshes live in `assets/` and are rebuilt with:

```bash
node experiments/indoor30-20261113/foley-stage/programs/bake_foley_props.mjs
```
