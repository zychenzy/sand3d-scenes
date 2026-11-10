# Dining coach (prior-upgrade)

Richer Avanti-style dining carriage cutaway. Lives only in `experiments/prior-upgrade-20261110/train/` and does not change `train/` or the shared renderer.

Three zones share one coach. **Dining bays** are the focal strip: facing seat pairs around wall-fixed window tables and long-pedestal aisle tables (no square four-leg cafe tables). Yellow partitions match the seat-back width and meet the floor. **Galley** at +Z is the service end (urn, pass, menu). **Vestibule** at −Z is the door / standing bay. Circulation is the centre aisle.

## Run

From the repository root, so relative GLB and vendor paths resolve:

```bash
python3 -m http.server 8765 --bind 127.0.0.1
```

Open `http://127.0.0.1:8765/experiments/prior-upgrade-20261110/train/`

`T` toon · `U` unlit · `?mode=unlit` · `?cam=corner` · `?cam=close` · `?cam=galley` · `?hud=0`

Three.js is the copy already in `train/vendor`. Models load from `train/assets`, `cafe/assets`, `library/assets`, and `cowork/assets`. Nothing here is fetched from a CDN.

## Check

```bash
node experiments/prior-upgrade-20261110/train/test/layout.test.mjs
```

The test checks GLB paths exist, dining seats face their bay tables, partitions are specified floor-to-cap, and no four-leg table assets are referenced.
