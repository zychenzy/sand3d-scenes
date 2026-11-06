# sand3d-scenes

Indoor Toon-hard Three.js rooms (vendored three.js, MeshToonMaterial + stepped gradient + hard shadows). Independent sand3d scene set — not a Meetiverse product drop.

Method: public photo refs → HF assets with attribution → gap notes → bake GLB → cutaway assembly → browser screenshot review → slim package.

Ref JPG/PNG and `candidates/` are not tracked; see each scene `refs/SOURCES.md` and `refs/GAP.md`.

## Scenes

| folder | status |
|--------|--------|
| `cafe/` | v1 dense Starbucks-ish |
| `train/` | v1 dining-coach cutaway (Avanti-style bays) |
| `restaurant/` | v1 Japanese restaurant (square tables, booths, six chairs per large table) |
| `ktv/` | v1 karaoke room (U-banquette + solid sofa) |
| `museum/` | v1 gallery (box-base chairs, spaced plinths) |
| `library/` | reading room — stacked books, two communal tables |
| `cinema/` | small screening room — theatre chairs face the screen |
| `boardgame/` | three tables, checkerboards + card felt |
| `cowork/` | study desks, monitors, chalkboard |
| `music/` | rehearsal — piano, guitar, amps, listening row |
| `stretch-studio/` | yoga/stretch — mats, blocks, mirror |
| `gym/` | bag training + rack / kettlebells |
| `workshop/` | ceramics — easels, wheel, kiln, work table |
| `lounge/` | billiards — pool table, sofa facing cloth, cue rack |
| `greenhouse/` | glass conservatory + foliage on pots |

## Run a scene

```bash
cd cafe && python3 -m http.server 8765 --bind 127.0.0.1
# http://127.0.0.1:8765/
```

Each scene: `T` toon · `U` unlit · `?mode=unlit` · `?cam=corner` · `?cam=close`.
