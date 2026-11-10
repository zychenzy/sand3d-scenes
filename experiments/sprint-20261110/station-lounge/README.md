# Northgate waiting hall

Heritage station concourse: ribbed barrel vault, four arched platform windows, timber benches in two seating groups, a booking-office niche, and a clock over the departure board. Cool daylight comes through the arches; warm lamps sit over the counter and the aisle.

Cutaway is open on the platform side (+X) and the approach (+Z). Back wall is −Z, window wall is −X.

## Launch

Assets are symlinks into the shared scene kits. Serve this directory (Python follows the links):

```bash
cd experiments/sprint-20261110/station-lounge
python3 -m http.server 8794 --bind 127.0.0.1
```

Open `http://127.0.0.1:8794/`.

Keys: `T` toon · `U` unlit. Query: `?mode=unlit` · `?cam=corner` · `?cam=close` · `?cam=booking` · `?hud=0` hides the overlay for shots.

```bash
python3 tests/check_scene.py
```

Shots (server must already be on port 8794):

```bash
node shoot.mjs
```

Writes `/opt/cursor/artifacts/station-lounge_toon_default.png`, `_toon_corner`, `_toon_close`, and `_unlit_default`.
