# QA — King Street barbershop

## Layout

`python3 experiments/indoor-20261113/barbershop/tests/check_layout.py`

Passed. 11 linked assets, all symlinks into existing bakes. Vendor is a symlink to `cafe/vendor`. Three station chairs share rotation π and a 0.52 m seat. Footrest-to-counter gap is 0.52 m. The wash chair rotation is π/2. The loveseat faces −X and the coffee table sits on the room side of it. The runner contains no instances. No CDN URLs in `index.html`.

## Render

`node experiments/indoor-20261113/barbershop/tests/render_shots.mjs`

Headless Chrome, WebGL via SwiftShader, page served from this directory.

| shot | mode | materials | meshes | notes |
| --- | --- | --- | --- | --- |
| `shots/toon_default.png` | toon | MeshToonMaterial only | 621 | chairs face the mirrors, pole and runner in frame, waiting table and sofa in the foreground |
| `shots/toon_corner.png` | toon | MeshToonMaterial only | 621 | chair profiles and footrests, wash chair reclined at the basin, shelf with bottles, price board |
| `shots/toon_close.png` | toon | MeshToonMaterial only | 621 | one chair back, tray of tools, drawer fronts, bulb frame |
| `shots/unlit_default.png` | unlit | MeshBasicMaterial only | 621 | same camera, flat color, bulbs still read |

Console had no errors. Network had no failed responses and no host other than `127.0.0.1`. HUD hidden for `?shot=1`.

## What still looks rough

- Mirror glass is a silver panel, so the close shot does not show the client or the barber.
- The loveseat reads gray, with one visible pad, rather than a tufted waiting bench.
- The pendant shade does not cast. A hard disc from that shade was reading as a stain on the runner.
- Shelf bottles could clip if the GLB shelf boards move.
