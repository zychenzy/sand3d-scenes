# Jeweler atelier (Three.js + sand3d)

Cutaway goldsmith's room: making bench and setting bench against a tooled back wall, materials chest between them, glass display counter as the threshold, and a client salon on a burgundy rug.

## Open

Serve this directory so the symlinked vendor and GLBs resolve:

```bash
cd experiments/sprint-20261110/jewelry-workshop
python3 -m http.server 8791 --bind 127.0.0.1
```

`http://127.0.0.1:8791/`

`T` toon · `U` unlit · `?mode=unlit` · `?cam=corner` · `?cam=close` · `?shot=1` hides the HUD.

## Check poses

```bash
python3 experiments/sprint-20261110/jewelry-workshop/tests/layout_checks.py
```

GLBs are symlinks into `library/`, `cafe/`, `workshop/`, and `museum/`. Do not copy them.
