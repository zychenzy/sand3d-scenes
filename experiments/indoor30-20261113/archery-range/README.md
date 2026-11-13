# Gold Line — 18 m indoor archery

A four-lane club range: vertical three-spot butts, a clear shooting hall, a preparation bay, and a waiting line. Hard toon is the default. Unlit is a real material switch.

Serve the **repository root**. Shared GLBs and Three.js resolve from `gym/`, `museum/`, `library/`, `cafe/`, `cowork/`, and `boardgame/`. Serving this folder alone 404s those files.

```bash
cd /path/to/sand3d-scenes
python3 -m http.server 8796 --bind 127.0.0.1
```

http://127.0.0.1:8796/experiments/indoor30-20261113/archery-range/

`T` toon · `U` unlit · `?mode=unlit` · `?cam=corner` · `?cam=close` · `?hud=0`

Geometry, lane clearance, and the waiting path:

```bash
node --test experiments/indoor30-20261113/archery-range/test/safety.mjs
```

Browser load (ready text, console, asset status):

```bash
node experiments/indoor30-20261113/archery-range/test/browser.mjs
```
