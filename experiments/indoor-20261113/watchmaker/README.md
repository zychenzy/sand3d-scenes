# Watchmaker repair shop

A cutaway interior for one room: a raised bench, a parts cabinet, a clock wall, and a customer handoff counter. It is a repair shop, not a jewelry salon. There are no gems, hammers, or display cases of rings.

Shading defaults to toon (`MeshToonMaterial` and a five-stop gradient). `U` switches to unlit (`MeshBasicMaterial`). `T` returns to toon. `?mode=unlit` and `?cam=corner` or `?cam=close` set the same from the URL. `?shot=1` hides the HUD for captures. The key light casts a soft shadow from a 4096 map fitted to the room. Walls receive that shadow and do not cast it.

## Run

Serve the **repository root** so the vendored Three.js and the reused GLBs resolve. From the repo root:

```bash
python3 experiments/indoor-20261113/watchmaker/serve.py
```

Open `http://127.0.0.1:8873/experiments/indoor-20261113/watchmaker/`.

Three.js r170 is imported from `workshop/vendor/three.module.js`. It is not copied into this folder.

## Layout

The room is 9.6 × 7.6 × 3.22 m. The back wall is −Z and the left wall is −X. The +Z and +X sides are open.

| Place | Height | Who it is for |
| --- | --- | --- |
| Maple bench, green baize, belly bite | top 1.02 m | The maker, on a wooden stool whose seat is at 0.74 m |
| Oak handoff counter | top 0.74 m | Two ladder-back chairs facing the counter |
| Waiting bench | seat about 0.46 m | The open side of the room, clear of the counter |

The maker walks between the stool and the counter. Customers sit at the counter and can reach the waiting bench without crossing the bench knee-hole.

## Check

```bash
python3 experiments/indoor-20261113/watchmaker/test_layout.py
node --check experiments/indoor-20261113/watchmaker/watchmaker.js
node --check experiments/indoor-20261113/watchmaker/scene_lib.js
```

`capture.mjs` needs the server above and writes `shots/toon_default.png`, `shots/toon_corner.png`, `shots/toon_close.png`, and `shots/unlit_default.png`. It fails if the page reports a console error, a failed asset request, or the wrong shading mode.
