# Skylight yoga studio

Cutaway practice hall: a sectioned timber lantern over spaced mats, with a curtained changing niche and open textile cubbies along the slat wall.

## Launch

From this directory (symlinks resolve locally; no CDN):

```bash
cd experiments/sprint-20261110/yoga-skylight
python3 -m http.server 8787 --bind 127.0.0.1
```

Open `http://127.0.0.1:8787/`.

- `T` toon · `U` unlit
- `?mode=unlit`
- `?cam=corner` side view under the rafters
- `?cam=close` changing niche
- `?shot=1` hides the HUD for captures

Contract check:

```bash
node --test experiments/sprint-20261110/yoga-skylight/tests/scene_contract.test.mjs
```

Screenshots (headless Chrome, from this directory):

```bash
node tests/render_shots.mjs
```

Writes `shots/*.png` and `/opt/cursor/artifacts/yoga-skylight_*.png`.
