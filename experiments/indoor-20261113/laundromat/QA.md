# QA

Served from the repo root on `127.0.0.1:8771`. Headless Chrome (`--use-gl=angle --use-angle=swiftshader`) via `tests/shoot.mjs`. Layout via `tests/check_scene.py`.

## Layout

```
ok — 20 instances, 12 assets, dryer aisle 1.52m, washer aisle 1.48m, 7 dryer columns, 6 washers
```

The checker confirms local GLB paths resolve inside the repo and are not copied into this folder, room bounds, aisle widths at least 1.45 m, folding height 0.88–0.94 m, dryers taller than washers, larger washers taller than standards, chairs facing −Z, chair spacing, bench rotation near π/2, and rotated boxes of chairs, bench, table, and carts staying out of the clearance rects. It also checks Toon plus `MeshBasicMaterial`, hard shadows, no CDN, and the vendored Three.js file.

## Render

Last shoot, console and network clean aside from the ignored favicon 404. `window.__ready` true. Zero asset errors.

Second pass after the screenshot review. Shadow map is 4096 over a tighter frustum, thin table lips no longer cast, and the striped steel and cloth maps are gone.

| Shot | Bytes | Read |
| --- | ---: | --- |
| `shots/toon_default.png` | 568997 | DRYERS sign fully in frame. Washer bank left, two-pocket dryers right, folding counter, carts, chairs. No green soffit strips. |
| `shots/toon_corner.png` | 588472 | Dryer bank, SOAP vendor, attendant desk, lamp, shelf, WEST END price board, chairs, floor mat. |
| `shots/toon_close.png` | 458719 | Perforated dryer drums behind dark glass and a metal ring. One lower door ajar. Rolled folds on the table, not page stripes. |
| `shots/unlit_default.png` | 354070 | Same framing as default. Flat color, no shadows. Warm drums still read because unlit uses emissive as the color. |

## Limits still visible

- Dryer drums are a recessed cylinder, a ring of holes, and three wall lifters. They are not a fully perforated tumbling drum.
- The open dryer door stays ajar so the head-on close shot still shows the ring.
- Folded stacks are rolled hems on a soft pile. From the corner they can still look blocky.
- The floor tote reads as a plain box. Carts are basket frames, not a dense wire mesh.
- The center of the default frame is the open aisle. The window bench and the WASHERS sign sit outside that frame.
- Large washers sit toward the window and are easy to crop from the default frame.
