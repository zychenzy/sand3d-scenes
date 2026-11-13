# QA — King Street barbershop

## Layout

`python3 experiments/indoor-20261113/barbershop/tests/check_layout.py`

Passed. 11 linked assets, all symlinks into existing bakes. Vendor is a symlink to `cafe/vendor`. Three station chairs share rotation π and a 0.52 m seat. Footrest-to-counter gap is 0.52 m. The wash chair rotation is π/2. The loveseat faces −X and the coffee table sits on the room side of it. The runner contains no instances. No CDN URLs in `index.html`.

## Render

`node experiments/indoor-20261113/barbershop/tests/render_shots.mjs`

Headless Chrome, WebGL via SwiftShader, page served from this directory.

| shot | mode | materials | meshes | notes |
| --- | --- | --- | --- | --- |
| `shots/toon_default.png` | toon | MeshToonMaterial only | 710 | full ceiling, KING STREET clear, leather settee, pole beside the desk |
| `shots/toon_corner.png` | toon | MeshToonMaterial only | 710 | chair profiles, wash chair, live mirror of the window and a chair |
| `shots/toon_close.png` | toon | MeshToonMaterial only | 710 | tools on the console, even plaster, mirror shows the desk and lamp |
| `shots/unlit_default.png` | unlit | MeshBasicMaterial only | 710 | same camera, flat color, ceiling and mirror reflection still read |

Console had no errors. Network had no failed responses and no host other than `127.0.0.1`. HUD hidden for `?shot=1`.

Screenshot pass: the roof is a finished lid with a fascia on the open edges. The back wall does not take the chair's shadow, so the plaster beside the center console stays even. The gray couch bake is hidden; a wood-and-leather settee occupies that footprint. Station glass is a planar reflection of the live room.

## What still looks rough

- The reflected upper field is a pale wall. The mirror shows the room that is actually in front of the glass, including the desk, lamp, and chair backs.
- The settee is one leather pad and a wood frame. From the default camera only the near end is in frame.
- The headrest is still one cushion on a post. The back was left as the oval pad.
- The pendant shade does not cast. Shelf bottles could clip if the GLB shelf boards move.
