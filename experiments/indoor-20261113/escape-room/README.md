# Tide Lock cipher study

A cutaway harbor office where the chart, the keeper’s slate, the tide staff, the brass wheels, and three combination cabinets all carry the same three marks. Daylight comes through the left window. A runner and a brass strip run from the entry rose to the mechanical panel.

Not a library, and not a black box. Walls are plaster over teal beadboard. The readable focal point is the chart on the easel. The jars, the log, and the chart chest sit on the furniture someone would actually use.

## Open

GLBs and Three.js are symlinks back to the repo kits. Serve this directory (Python follows the links):

```bash
cd experiments/indoor-20261113/escape-room
python3 -m http.server 8813 --bind 127.0.0.1
```

http://127.0.0.1:8813/

`T` toon (the default) · `U` unlit · `?mode=unlit` · `?cam=corner` · `?cam=close` · `?hud=0` hides the overlay.

Click a cabinet dial to step its digit. The scene boots with the chart’s combination already set, and the lantern door open.

## Check

```bash
node --check escape-room.js && node --check scene_lib.js && node --check panels.js
python3 tests/check_layout.py
```

Screenshots, with the server already on port 8813:

```bash
node shoot.mjs
```

Writes `shots/toon_default.png`, `shots/toon_corner.png`, `shots/toon_close.png`, `shots/unlit_default.png`, and the same frames under `/opt/cursor/artifacts/escape-room_*.png`. The shooter fails on console errors, failed responses, or any host other than 127.0.0.1.
