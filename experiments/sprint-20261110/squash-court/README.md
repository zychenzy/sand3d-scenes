# Ash Court — boutique singles squash

A cutaway club court: WSF wall and floor markings, a glazed back wall with an inward door, a viewing gallery, and a reception niche. The court is the focal volume. The gallery and desk sit behind the glass.

Three.js r170 is the copy in `gym/vendor`. Shading is local (`scene_lib.js`): hard 4-step toon, plus unlit. Shared GLBs are referenced, not copied.

## Open

Serve the **repository root**. Paths such as `../../../museum/...` only resolve when the server root is the repo. Serving this folder alone 404s the benches, chair, lamp, and three.js.

```bash
cd /path/to/sand3d-scenes
python3 -m http.server 8794 --bind 127.0.0.1
```

http://127.0.0.1:8794/experiments/sprint-20261110/squash-court/

`T` toon · `U` unlit · `?mode=unlit` · `?cam=corner` · `?cam=close`

Marking math (no three.js): `node --test experiments/sprint-20261110/squash-court/test_court_spec.mjs`
