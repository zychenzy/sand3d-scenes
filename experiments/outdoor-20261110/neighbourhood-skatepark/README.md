# Neighbourhood skatepark

Compact concrete park in late-afternoon light: a shallow oval bowl with a rolled mouth, a transition quarterpipe with steel coping, and a street cluster (manual pad, steel-edged ledge, three stairs, round handrail). The east lane from the gate to the quarter is left clear. Benches and shade trees sit outside the fence.

## Run

From the repo root, so the vendored Three.js symlink and the bench GLB resolve:

```bash
python3 -m http.server 8766 --bind 127.0.0.1
```

Open `http://127.0.0.1:8766/experiments/outdoor-20261110/neighbourhood-skatepark/`

`T` toon · `U` unlit · `?mode=unlit` · `?cam=corner` · `?cam=close`

## Checks

```bash
node experiments/outdoor-20261110/neighbourhood-skatepark/tests/layout.test.mjs
```

Layout numbers are in `tests/results.txt`. The test builds the same bowl and quarter meshes the page uses and checks curve smoothness, coping gap, run-up clearance, gate alignment, and that benches and tree trunks sit outside the fence.
