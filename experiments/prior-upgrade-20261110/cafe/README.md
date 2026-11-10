# Pike House cafe

Pre-sprint cafe redo for the 2026-11-10 upgrade. Lives only in `experiments/prior-upgrade-20261110/cafe/` and does not modify `cafe/` or the shared renderer.

Starbucks-like cutaway: warm wood and brand green. The focal zone is an L espresso/bar with POS, cup towers, syrups, and four stools on the customer side. A floor-standing pastry case and pickup ledge sit on the return. Secondary seating is five round tables with simple chairs facing the tops (window 2-top on the left). A stanchion lane runs from the open front to the register. No sofa.

## Run

From the repository root, so relative vendor and GLB paths resolve:

```bash
python3 -m http.server 8765 --bind 127.0.0.1
```

Open `http://127.0.0.1:8765/experiments/prior-upgrade-20261110/cafe/`

`T` toon · `U` unlit · `?mode=unlit` · `?cam=corner` · `?cam=close` · `?hud=0` · `?shot=1`

Three.js is the copy already in `cafe/vendor`. Models load from `cafe/assets`, `library/assets`, and `cowork/assets`. Nothing here is fetched from a CDN.

## Check

```bash
node experiments/prior-upgrade-20261110/cafe/test/layout.test.mjs
```

The test checks that GLB paths exist, the counter stays at bar scale, every chair's model forward axis points at its table, and stools sit on the customer side of the L-counter.
