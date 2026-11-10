# Bag-and-iron training gym (prior upgrade)

Cutaway boxing-and-weights studio: a mirrored bag line, a full-height squat rack, a clear turf lane, and a three-mat stretch bay. Rest benches on the open edge face the floor.

This is a redo of the pre-sprint `gym/` scene under `experiments/prior-upgrade-20261110/gym/`. Shared GLBs and the vendored Three.js runtime are relative symlinks. Nothing outside this directory is changed.

## Launch

```bash
cd experiments/prior-upgrade-20261110/gym
python3 -m http.server 8776 --bind 127.0.0.1
```

Open `http://127.0.0.1:8776/`.

- `T` toon · `U` unlit
- `?mode=unlit`
- `?cam=corner` along the bag line
- `?cam=close` squat rack and dumbbell run
- `?shot=1` hides the HUD for captures

Contract check:

```bash
node --test experiments/prior-upgrade-20261110/gym/tests/scene_contract.test.mjs
```

Screenshots (headless Chrome, from this directory):

```bash
node tests/render_shots.mjs
```

Writes `shots/*.png` and `/opt/cursor/artifacts/gym_*.png`.
