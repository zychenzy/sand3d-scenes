# Desert stargazing camp

Twilight camp on sculpted sand: an open striped shade tent with floor cushions and tea, and a separate plank deck with a fork-mounted telescope on a three-leg tripod. Layered mesas sit behind the site. Stars are a short field in the upper sky so the camp stays visible.

## Run

From the repo root, so the scene's relative asset links resolve:

```bash
python3 -m http.server 8787 --bind 127.0.0.1 --directory experiments/outdoor-20261110/desert-stargazing-camp
```

Open `http://127.0.0.1:8787/`.

- `T` toon (default) · `U` unlit
- `?mode=unlit`
- `?cam=corner` · `?cam=close`
- `?shot=1` hides the HUD for stills

## Checks

```bash
node --test experiments/outdoor-20261110/desert-stargazing-camp/tests/layout.test.mjs
```

The test locks terrain relief, cushion facing, tripod and tube structure, path markers, plant scatter, mesa layering, and camera framing.
