# Jazz club (Three.js + sand3d)

Intimate room: low stage with a parlor grand, double bass, jazz kit and saxophone, four audience tables turned toward the stage, and a paneled bar along the left wall. Burgundy acoustic drapes and warm pendant pools. Toon-hard shading, vendored Three.js, no CDN.

## Open

From this directory (GLBs are symlinks back to the shared cafe / restaurant / music bakes):

```bash
cd experiments/sprint-20261110/jazz-club
python3 -m http.server 8788 --bind 127.0.0.1
```

`T` toon · `U` unlit · `?mode=unlit` · `?cam=corner` · `?cam=close` · `?hud=0`

## Checks

```bash
node --test tests/layout.test.mjs
node tests/shoot.mjs
```

`shoot.mjs` writes `shots/` and `/opt/cursor/artifacts/jazz-club_<view>.png`.
