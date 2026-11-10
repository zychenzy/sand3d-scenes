# North-light artist studio

Daylight painting room: a window wall, three easels turned toward the room, a work table, pigment storage, and a wash alcove. Toon-hard Three.js, same stepped gradient as the other sand3d rooms.

## Launch

Assets and the vendored renderer live elsewhere in the repo, so the server has to start at the **repository root** (not inside this folder):

```bash
python3 -m http.server 8766 --bind 127.0.0.1
```

- http://127.0.0.1:8766/experiments/sprint-20261110/art-studio/
- `T` toon · `U` unlit
- `?mode=unlit`
- `?cam=corner` — storage and wash
- `?cam=close` — hero easel
- `?shot=1` hides the HUD for stills

## Check the layout

```bash
node --test experiments/sprint-20261110/art-studio/tests/layout.test.mjs
```

The test checks that shared GLBs exist, chairs face the work surfaces, the easel stool sits on the canvas side, and the floor pieces do not occupy the same spot.
