# KTV room — prior-upgrade 20261110

Private karaoke booth redo of root `ktv/`: three sofas around one low long table (long sofa elongated on the long side, seats facing the table), a framed lyric screen on the open wall, a standing microphone on a low stage, and a drink credenza on the entry wall.

Cutaway keeps the front and most of the right side open. Toon hard shading, hard shadows, contact discs under furniture, and emissive practicals (pink cove, stage LED kick, pendant bulbs, sconce, screen).

## Launch

Serve the **repository root** so shared GLBs and vendored Three.js resolve. Do not start the server inside this folder.

```bash
cd /path/to/sand3d-scenes
python3 -m http.server 8778 --bind 127.0.0.1
```

Open http://127.0.0.1:8778/experiments/prior-upgrade-20261110/ktv/

- `T` toon, `U` unlit
- `?mode=unlit`
- `?cam=corner` `?cam=close`
- `?hud=0` hides the overlay

## Check

```bash
python3 experiments/prior-upgrade-20261110/ktv/test_layout.py
```

The test checks sofa facing, the long sofa parallel to the table, stage and table mic placement, panel variety, hanging pendants, and that GLB paths exist. It does not replace a visual pass.
