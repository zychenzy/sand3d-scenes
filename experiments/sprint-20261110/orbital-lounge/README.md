# Orbital lounge (Three.js)

Stylized habitat-module mess. The hull is a chamfered octagon with padded panels. An aft port frames a large earth limb and a star field. Built-in benches face a rounded pedestal table. Lockers sit flush in the port wall. LED lines run the deck and the ceiling.

## Open

```bash
cd experiments/sprint-20261110/orbital-lounge
./serve.sh 8788
```

Then open `http://127.0.0.1:8788/experiments/sprint-20261110/orbital-lounge/index.html`

`T` toon · `U` unlit · `?mode=unlit` · `?cam=corner` · `?cam=close` · `?hud=0`

The server must start at the repository root (`serve.sh` does). The page uses the vendored Three.js build at `/lounge/vendor/`.

## Check

```bash
node experiments/sprint-20261110/orbital-lounge/test/layout.test.mjs
```

Run that from the repository root. It checks the hull type, the pedestal table, flush lockers, floor and ceiling strips, and that the benches face the table.
