# North Hall gallery (prior-upgrade)

Authored cutaway museum gallery: picture wall, sculpture court, glass vitrines, and two long slab benches that face the paintings. Toon-hard Three.js, vendored offline.

This scene does not replace `museum/`. Furniture GLBs are symlinks to existing sand3d bakes. HF plinth / vitrine / bookcase meshes are not reused — they read as solid columns, so displays are procedural stone plinths and glass cases.

## Launch

```bash
cd experiments/prior-upgrade-20261110/museum
python3 -m http.server 8771 --bind 127.0.0.1
```

Open `http://127.0.0.1:8771/`

`T` toon · `U` unlit · `?mode=unlit` · `?cam=corner` · `?cam=close` · `?hud=0` hides the overlay.

```bash
node --test tests/scene.test.mjs
```

## Zones

- Picture wall: five framed works on the back wall, two on the left, picture rail, gilt frames, labels, picture lights.
- Sculpture court: bronze figure (stanchioned), abstract slabs, marble torso; clear center vista to the hero canvas.
- Viewing benches: two long benches in the aisle, facing −Z toward the paintings. No sofas.
- Object bay: standing glass case (ceramics) and two table vitrines along the cutaway edge.
- Left niche + next-gallery door: bust in a recess; doorway suggests the adjoining hall.
