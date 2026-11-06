# sand3d-scenes

Meetiverse indoor scenes: Three.js (Toon hard) + Sandflow sand3d GLBs.

Method: [sand3d-threejs-scene](https://cursor.com) skill — pick HF assets → screenshot review → photo gap → bake → assemble → densify → trimmed ship.

## Scenes

| folder | status |
|--------|--------|
| `cafe/` | v1 dense Starbucks-ish |
| `train/` | planned |
| `restaurant/` | planned |
| `ktv/` | planned |
| `museum/` | planned |

## Run a scene

```bash
cd cafe && python3 -m http.server 8765 --bind 127.0.0.1
# http://127.0.0.1:8765/
```

Ref JPG/PNG are not tracked; see each scene `refs/SOURCES.md`.
