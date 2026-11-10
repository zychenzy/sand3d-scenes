# Small harbour quay

A working L-shaped stone fishing quay in clear late morning. Two different boats, a net and rope patch, a fish shed, and a small cafe pocket above the deck.

Serve from the repo root so the reused GLBs and the vendored Three.js resolve:

```bash
python3 -m http.server 8766 --bind 127.0.0.1
```

Open `http://127.0.0.1:8766/experiments/outdoor-20261110/small-harbour-quay/`

`T` toon · `U` unlit · `?mode=unlit` · `?cam=corner` · `?cam=close`

```bash
node --test experiments/outdoor-20261110/small-harbour-quay/test/harbour.test.mjs
```

`vendor` is a symlink to `greenhouse/vendor` (Three.js r170). Do not copy it.
