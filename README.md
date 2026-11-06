# sand3d-scenes

Meetiverse indoor scenes: Three.js (Toon hard) + Sandflow sand3d GLBs.

Method: sand3d-threejs-scene skill — pick HF assets → screenshot review → photo gap → bake → assemble → densify → trimmed ship.

Ref JPG/PNG are not tracked; see each scene `refs/SOURCES.md`.

## Scenes

| folder | status |
|--------|--------|
| `cafe/` | v1 dense Starbucks-ish |
| `train/` | v1 dining-coach cutaway (Avanti-style bays) |
| `restaurant/` | v1 Japanese restaurant (square tables, booths, banquette) |
| `ktv/` | v1 karaoke room (U-banquette + solid sofa) |
| `museum/` | v1 gallery (box-base chairs, spaced plinths) |

## Run a scene

```bash
cd cafe && python3 -m http.server 8765 --bind 127.0.0.1
# http://127.0.0.1:8765/
```

Each scene: `T` toon · `U` unlit · `?mode=unlit` · `?cam=corner` · `?cam=close`.
