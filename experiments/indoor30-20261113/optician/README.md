# Field Opticians

Independent high-street optician. The oak retail room has a full ceiling, frame cabinets, two glass trays, a reception desk, one waiting seat, and a seated fitting mirror. A cased door opens into a linoleum sight lane with a phoropter, a chart, and a trial-lens cabinet.

Shared GLBs and the Three.js runtime are symlinks into `library/`, `cafe/`, `museum/`, and `cowork/`. Do not copy them and do not edit those folders.

## Open

From this directory, so the symlinks resolve:

```bash
cd experiments/indoor30-20261113/optician
python3 -m http.server 8797 --bind 127.0.0.1
```

http://127.0.0.1:8797/

`T` toon · `U` unlit · `?mode=unlit` · `?cam=corner` · `?cam=close` · `?shot=1` hides the label.

Default shading is a four-step toon ramp (nearest filter, darkest stop 0.42) and hard shadow maps. Unlit is `MeshBasicMaterial`.

## Check

From the repo root:

```bash
node --test experiments/indoor30-20261113/optician/tests/scene.test.mjs
node experiments/indoor30-20261113/optician/tests/render_shots.mjs
```

The layout test checks facing, the exam door, retail versus exam, and that asset paths are symlinks. The render script writes four shots and fails on load errors, a missing mirror texture, or a toon/unlit mismatch.
