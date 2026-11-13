# QA

Static, before the browser:

```bash
node --check escape-room.js && node --check scene_lib.js && node --check panels.js
python3 tests/check_layout.py
```

That checks symlink targets (no copied GLBs), room bounds, chair and desk facing, the circulation polyline, toon as the hard default, and `MeshBasicMaterial` for unlit.

Browser, server on 127.0.0.1:8813:

```bash
node shoot.mjs
```

Four frames, 1600×1000, HUD hidden:

| File | View | Shading |
| --- | --- | --- |
| `shots/toon_default.png` | entry camera | toon |
| `shots/toon_corner.png` | `?cam=corner` | toon |
| `shots/toon_close.png` | `?cam=close` easel chart | toon |
| `shots/unlit_default.png` | entry camera | unlit |

The shooter records console errors and network responses. It fails if a response is 4xx/5xx, a script throws, or any request host is not 127.0.0.1. Copies land in `/opt/cursor/artifacts/escape-room_*.png`.

What the frames are for:

- Default: chart, slate, three cabinets, open lantern door, panel, desk, and the floor path in one view.
- Corner: window desk, bench, and the long axis of the room.
- Close: the chart type is large enough to read.
- Unlit: the same default camera with lights ignored, so the palette has to carry the room.

Findings from the rendered pass belong in the notes below this line once the shots exist.

## Render notes

Shot on 2026-11-13 with headless Chrome, SwiftShader, 1600×1000, HUD hidden. `node shoot.mjs` reported zero console errors, zero failed responses, and every request on `127.0.0.1:8813`. Default and corner stayed on TOON. The fourth frame stayed on UNLIT.

- `toon_default`: window, entry lectern, chart, slate, investigation desk with the chair facing it, clue table, three colored cabinets (lantern door open), wheel panel, compass plinth, floor rose, and the brass path.
- `toon_corner`: the long axis. Chart and slate text, cabinet dials, and the wheel panel (4, 8, 2) are in one view. The lectern sits in the near foreground.
- `toon_close`: the easel chart fills the frame. “TIDE LOCK”, Anchor 4, Gull 8, and Lantern 2 are readable. The gray easel canvas does not cover the numbers.
- `unlit_default`: same camera as the default. Lights drop out. The teal panels, oak floor, cabinet colors, chart, and slate still read from the material colors and canvas maps.

The study chair and the window-desk chair face their desks (yaw π). The lamp stays on the desktop.
