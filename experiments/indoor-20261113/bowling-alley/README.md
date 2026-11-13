# Northlane — four-lane house

A cutaway tenpin house: four USBC lanes, gutters, foul lines, approach dots, arrows, pin triangles, and a ball return between each pair. Theatre chairs face the pins. The cross aisle behind them is empty. Shoe rental sits off the right of the concourse; the ball rack sits off the left.

Shading is hard 4-step toon. `U` switches to unlit (`MeshBasicMaterial`). Three.js r170 is the copy already in `gym/vendor`. Catalog GLBs are referenced, not copied.

## Open

Serve the **repository root**. Paths such as `../../../cinema/assets/...` only resolve from there.

```bash
cd /path/to/sand3d-scenes
python3 -m http.server 8797 --bind 127.0.0.1
```

http://127.0.0.1:8797/experiments/indoor-20261113/bowling-alley/

`T` toon · `U` unlit · `?mode=unlit` · `?cam=corner` · `?cam=close` · `?shot=1` hides the HUD

## Check

```bash
node --test experiments/indoor-20261113/bowling-alley/test_lane_spec.mjs
```

Lane width, the 60 ft head pin, the 15 ft approach, pin spacing, gutter flanks, and the clear approach and aisle are checked without three.js. Screenshots are in `shots/`.
