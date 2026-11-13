# Two-bay indoor golf simulator

A cutaway club room with two separated right-handed hitting bays. Each bay has a concave impact screen, side and ceiling net, a stance mat, a floor launch monitor on the screen side of the ball, and a club rack on the outer wall. Six theatre chairs sit behind the yellow safety line and face the screens. The entry holds a bag bench, a service counter, and ball baskets. It is a hitting room with a viewing row, not a lounge that happens to contain a television.

Shading is hard 4-step toon with a single hard shadow. `U` switches the room to unlit `MeshBasicMaterial`. The impact screens and launch-monitor readouts stay basic in both modes so the hole and the numbers stay readable.

Three.js r170 is the copy in `gym/vendor`. Shared chairs, the bench, pendants, pots, thermos, and tray are referenced from the existing bakes. The driver, iron, wedge, and tee are baked into this folder from `Sandflow/sand3d-objaverse`.

## Open

Serve the **repository root**. Paths such as `../../../gym/vendor` and `../../../cinema/assets` only resolve from there.

```bash
cd /path/to/sand3d-scenes
python3 -m http.server 8796 --bind 127.0.0.1
```

http://127.0.0.1:8796/experiments/indoor30-20261113/golf-simulator/

`T` toon · `U` unlit · `?mode=unlit` · `?cam=corner` · `?cam=detail` · `?hud=0`

## Check

```bash
node --test experiments/indoor30-20261113/golf-simulator/tests/bay_contract.test.mjs
```

The contract checks swing cylinders, club paths, ball flights, seat footprints, launch-monitor clearance, and gallery paths. It also checks that the theatre-chair cushion still faces -Z.
