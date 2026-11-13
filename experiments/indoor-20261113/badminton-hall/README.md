# Shuttle Hall — two-court club badminton

A cutaway club hall: two BWF doubles courts on green mats, white 40 mm lines, shallow nets with the legal centre sag, and a side gallery for shoes, rackets, and shuttles. The south end is open so the courts can be read from outside the volume.

Three.js r170 stays in `gym/vendor`. Shading is local (`scene_lib.js`): hard 4-step toon by default, and true unlit (`MeshBasicMaterial`) on `U`. Shared GLBs are referenced from the repository root, not copied.

## Open

Serve the **repository root**. Paths such as `../../../gym/vendor/...` and `../../../museum/assets/...` only resolve when the server root is the repo.

```bash
cd /path/to/sand3d-scenes
python3 -m http.server 8795 --bind 127.0.0.1
```

http://127.0.0.1:8795/experiments/indoor-20261113/badminton-hall/

`T` toon · `U` unlit · `?mode=unlit` · `?cam=corner` · `?cam=close`

Markings, clearances, and asset paths (no three.js):

```bash
node --test experiments/indoor-20261113/badminton-hall/test_court_spec.mjs experiments/indoor-20261113/badminton-hall/test_layout.mjs
```
