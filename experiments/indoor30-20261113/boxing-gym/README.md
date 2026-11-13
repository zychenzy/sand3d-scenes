# Old-school boxing gym

A cutaway club gym: a 16 ft four-rope ring in the middle of the floor, a line of three stand-mounted heavy bags on the left wall, two speed-bag platforms, glove pegs, a wrap shelf, and a round wall timer. The canvas and the walks stay clear. This is not a weights room.

Shared GLBs and the vendored Three.js runtime are relative symlinks into `gym/` and `cafe/`. Nothing outside this directory is changed.

## Launch

```bash
cd experiments/indoor30-20261113/boxing-gym
python3 -m http.server 8794 --bind 127.0.0.1
```

Open `http://127.0.0.1:8794/`.

- `T` hard-stepped toon (default) · `U` unlit (`MeshBasicMaterial`)
- `?mode=unlit`
- `?cam=corner` from the open side, along the ropes
- `?cam=detail` (alias `?cam=close`) on the back wall: timer, bell, and a speed-bag platform
- `?shot=1` hides the HUD for captures

## Checks

```bash
node --test experiments/indoor30-20261113/boxing-gym/tests/scene_contract.test.mjs
node experiments/indoor30-20261113/boxing-gym/tests/render_shots.mjs
```

The render writes `shots/toon_default.png`, `shots/toon_corner.png`, `shots/toon_detail.png`, `shots/unlit_default.png`, and the same frames under `/opt/cursor/artifacts/boxing_*.png`.
