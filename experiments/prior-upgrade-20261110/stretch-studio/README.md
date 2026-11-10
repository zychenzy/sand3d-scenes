# Clerestory stretch studio

Pre-sprint stretch-studio redo: a cutaway practice hall with a mirrored back wall, a clerestory above it, two rows of mats with walking aisles, and a left-wall cubby / shoe zone.

## Launch

From this directory (symlinks resolve locally; no CDN):

```bash
cd experiments/prior-upgrade-20261110/stretch-studio
python3 -m http.server 8842 --bind 127.0.0.1
```

Open `http://127.0.0.1:8842/`.

- `T` toon · `U` unlit
- `?mode=unlit`
- `?cam=corner` side view of the mirror and platform
- `?cam=close` cubby and shoe storage
- `?shot=1` hides the HUD for captures

Contract check:

```bash
node --test experiments/prior-upgrade-20261110/stretch-studio/tests/scene_contract.test.mjs
```

Screenshots (headless Chrome, from this directory):

```bash
node tests/render_shots.mjs
```

Writes `shots/*.png` and `/opt/cursor/artifacts/stretch-studio_*.png`.
