# Karaoke suite

Private karaoke room: three sofas around a low long table, the long sofa on the table’s long side, a framed screen facing the seats, a standing microphone on a low stage, and a service credenza along the entry wall.

Cutaway keeps the front and most of the right side open. Toon hard shading, hard shadows, contact discs under the furniture, and a few emissive practicals (pendant bulbs, ceiling cove, sconce, screen).

## Launch

Serve the **repository root** so the shared GLBs and vendored Three.js resolve. Do not start the server inside this folder.

```bash
cd /path/to/sand3d-scenes
python3 -m http.server 8771 --bind 127.0.0.1
```

Open http://127.0.0.1:8771/experiments/sprint-20261110/karaoke-suite/

- `T` toon, `U` unlit
- `?mode=unlit`
- `?cam=corner` `?cam=close`
- `?hud=0` hides the overlay

## Check

```bash
python3 experiments/sprint-20261110/karaoke-suite/test_layout.py
```

The test checks sofa facing, the long sofa parallel to the table, stage and table mic placement, panel variety, hanging pendants, and that GLB paths exist. It does not replace a visual pass.
