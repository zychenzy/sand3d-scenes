# Atrium coffee

Specialty cafe cutaway for the 2026-11-10 scene sprint. It does not modify `cafe/`.

Two zones share one room. The service bar is the focal point: an L-shaped counter (real mesh, refit to bar height), a tiled back bar, espresso on the return, order point at the left end, pastry case, and three stools. The window reading nook is a raised bay on the left wall, with a table, two chairs, a banker lamp, and books on the sill. A glazed roof lantern sits over the centre table. Seating is chairs and bar stools.

## Run

From the repository root, so the page can reach the shared vendor and GLBs:

```bash
python3 -m http.server 8765 --bind 127.0.0.1
```

Open `http://127.0.0.1:8765/experiments/sprint-20261110/cafe-atrium/`

`T` toon · `U` unlit · `?mode=unlit` · `?cam=corner` · `?cam=close` · `?cam=nook` · `?hud=0`

Three.js is the copy already in `cafe/vendor`. Models are loaded from `cafe/assets`, `library/assets`, and `cowork/assets`. Nothing here is fetched from a CDN.

## Check

```bash
node experiments/sprint-20261110/cafe-atrium/test/layout.test.mjs
```

The test checks that GLB paths exist, the counter stays at bar scale, and every chair's model forward axis points at its table.
