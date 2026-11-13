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

Third pass. Default camera is pulled back and left so both banks and both signs are in frame.

| Shot | Bytes | Read |
| --- | ---: | --- |
| `shots/toon_default.png` | 648715 | WASHERS and DRYERS both readable. Washer bank on the left, dryer bank on the right, clock, mesh tote, ceiling intact. |
| `shots/toon_corner.png` | 595129 | Dryer bank, clock, SOAP vendor, attendant desk, price board, mesh tote with handles. |
| `shots/toon_close.png` | 463089 | Perforated dryer drums, metal rings, clock numerals 12/3/6/9. Fold piles show a hem and two thicknesses. |
| `shots/unlit_default.png` | 460192 | Same framing as default. Flat color, no shadows. Both signs still read. Warm drums still read. |

## Limits still visible

- Dryer drums are a recessed cylinder, a ring of holes, and three wall lifters. They are not a fully perforated tumbling drum.
- The open dryer door stays ajar so the head-on close shot still shows the ring.
- Fold piles are two offset thicknesses with a hem. The silhouette is still rectilinear, so a side view can look blocky.
- The window bench is at the storefront and is easy to miss at the left edge of the default frame. The window chairs and side table are in that frame.
- Carts are basket frames, not a dense wire mesh.
- Large washers sit toward the window and are partly behind the standard bank in the default frame.
