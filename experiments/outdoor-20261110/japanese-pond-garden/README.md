# Japanese pond garden

Quiet morning stroll garden: an irregular koi pond, an arched timber bridge as the focal point, a stepping-stone loop through the south shallows, and a shaded tea bench facing the water. Maples, pines, a willow, reeds, iris, moss, and a stone lantern sit on contoured ground that rises into a wooded hill.

Toon hard is the default. `T` returns to it, `U` switches to unlit, and `?mode=unlit` starts unlit. `?cam=corner` and `?cam=close` are the other framed views. Orbit controls are on.

## Run

From the repo root, so the vendored Three.js symlink resolves:

```bash
python3 -m http.server 8787 --bind 127.0.0.1
```

Open `http://127.0.0.1:8787/experiments/outdoor-20261110/japanese-pond-garden/`

## Checks

```bash
node --test experiments/outdoor-20261110/japanese-pond-garden/test/layout.test.js
```

Photo notes are in `refs/SOURCES.md`. What the catalog and the references do not cover is in `refs/GAP.md`.
