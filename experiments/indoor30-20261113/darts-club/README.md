# Oche Hall — indoor darts club

Four steel-tip lanes on the back wall, a walk behind the oches, and a communal high table off to the side. The table is a poseur table with stools. There is no bar counter and no pool table.

Bull centre is 1.73 m. The back of each oche is 2.37 m from the board face. Each oche is 38 mm high and 610 mm long. The published diagonal is 2.93 m (the exact hypotenuse of 2.37 and 1.73 is 2.934 m). Ring radii follow the WDF wire edges: double outer 170 mm, treble outer 107.4 mm, rings 8 mm wide, inner bull 12.7 mm, outer bull 31.8 mm. The 20 is at the top and is a dark segment.

Three.js r170 is the copy in `cafe/vendor`. Shading is local (`scene_lib.js`): hard 4-step toon by default, plus a real unlit offline. Shared GLBs are referenced from their existing scene folders. Nothing in this folder copies them.

## Open

Serve the **repository root**. Paths such as `../../../cafe/vendor/three.module.js` only resolve when the server root is the repo.

```bash
cd /path/to/sand3d-scenes
python3 -m http.server 8796 --bind 127.0.0.1
```

http://127.0.0.1:8796/experiments/indoor30-20261113/darts-club/

`T` toon · `U` unlit · `?mode=unlit` · `?cam=corner` · `?cam=close`

Lane math (no three.js): `node --test experiments/indoor30-20261113/darts-club/tests/check_layout.mjs`
