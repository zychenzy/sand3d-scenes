# Salle Montjoie — paired fencing pistes

A cutaway club salle: two FIE pistes, a referee aisle, an armory wall, and a coach bay. The strips are the room. Circulation stays off the metal.

Three.js r170 is the copy in `gym/vendor`. Shading is local (`scene_lib.js`): hard 4-step toon with the darkest step lifted off black, plus a real `MeshBasicMaterial` unlit swap. Shared GLBs are referenced from the repo root, not copied.

## Open

Serve the **repository root**. Paths such as `../../../gym/vendor/three.module.js` only resolve when the server root is the repo.

```bash
cd /path/to/sand3d-scenes
python3 -m http.server 8796 --bind 127.0.0.1
```

http://127.0.0.1:8796/experiments/indoor30-20261113/fencing-salle/

`T` toon · `U` unlit · `?mode=unlit` · `?cam=corner` · `?cam=close` · `?hud=0`

Layout and clearance checks (no three.js): `node --test experiments/indoor30-20261113/fencing-salle/tests/salle.test.mjs`
