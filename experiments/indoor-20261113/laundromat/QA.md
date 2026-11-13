# QA

Served from the repo root on `127.0.0.1:8771`. Headless Chrome (`--use-gl=angle --use-angle=swiftshader`) via `tests/shoot.mjs`. Layout via `tests/check_scene.py`.

## Layout

```
ok — 20 instances, 12 assets, dryer aisle 1.52m, washer aisle 1.48m, 7 dryer columns, 6 washers
```

The checker confirms local GLB paths resolve inside the repo and are not copied into this folder, room bounds, aisle widths at least 1.45 m, folding height 0.88–0.94 m, dryers taller than washers, larger washers taller than standards, chairs facing −Z, chair spacing, bench rotation near π/2, and rotated boxes of chairs, bench, table, and carts staying out of the clearance rects. It also checks Toon plus `MeshBasicMaterial`, hard shadows, no CDN, and the vendored Three.js file.

## Render

Last shoot, console and network clean aside from the ignored favicon 404. `window.__ready` true. Zero asset errors.

| Shot | Bytes | Read |
| --- | ---: | --- |
| `shots/toon_default.png` | 620832 | Both banks, folding counter, sort counter, carts, and chairs. Toon steps and hard shadows on the tile. |
| `shots/toon_corner.png` | 625382 | Dryer bank, folding top, SOAP vendor with colored bottles, attendant desk, lamp, shelf, price board, chairs. |
| `shots/toon_close.png` | 534777 | Dryer doors with radial vanes. One lower door ajar so the drum stays visible. Folding top in the foreground. |
| `shots/unlit_default.png` | 470226 | Same framing as default. Flat color, no shadows. Warm drums still read because unlit uses emissive as the color. |

## Limits still visible

- Drum vanes are three bars on a disc. They read as a star at this scale, not as a deep perforated cylinder.
- The open dryer door is ajar rather than fully open, so the head-on close shot still shows the ring.
- Carts are basket frames with a few rails, not a dense wire mesh.
- The window bench is built and clear of the aisles, and it is mostly outside the four committed frames.
- Large washers sit toward the window and are easy to crop from the default frame.
