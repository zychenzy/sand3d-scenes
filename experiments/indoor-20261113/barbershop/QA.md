# QA — King Street barbershop

## Layout

`python3 experiments/indoor-20261113/barbershop/tests/check_layout.py`

Passed. 11 linked assets, all symlinks into existing bakes. Vendor is a symlink to `cafe/vendor`. Three station chairs share rotation π and a 0.52 m seat. Footrest-to-counter gap is 0.52 m. The wash chair rotation is π/2. The loveseat faces −X and the coffee table sits on the room side of it. The runner contains no instances. No CDN URLs in `index.html`.

## Render

`node experiments/indoor-20261113/barbershop/tests/render_shots.mjs`

Headless Chrome, WebGL via SwiftShader, page served from this directory.

| shot | mode | materials | meshes | notes |
| --- | --- | --- | --- | --- |
| `shots/toon_default.png` | toon | MeshToonMaterial only | 695 | KING STREET is clear of the soffit, pole sits beside the desk, runner is open |
| `shots/toon_corner.png` | toon | MeshToonMaterial only | 695 | chair profiles, wash chair at the basin, window and price list, no ceiling disc |
| `shots/toon_close.png` | toon | MeshToonMaterial only | 695 | padded back and headrest, tools on the consoles, chair and barber painted in the glass |
| `shots/unlit_default.png` | unlit | MeshBasicMaterial only | 695 | same camera, flat color, bulbs and mirror pictures still read |

Console had no errors. Network had no failed responses and no host other than `127.0.0.1`. HUD hidden for `?shot=1`.

Screenshot pass: the establishing beam no longer covers the sign, vanity point lights are off the mirror wall, and the left-wall slab is a paned window. The pole stands left of the runner.

## What still looks rough

- Mirror pictures are painted station silhouettes. They do not reflect the actual chairs.
- The close headrest is a single cushion on a post. The back is one oval pad, not a tufted channel.
- A hard chair shadow still breaks across the plaster beside the center console.
- The loveseat bake is gray cloth. The pendant shade does not cast.
- Shelf bottles could clip if the GLB shelf boards move.
