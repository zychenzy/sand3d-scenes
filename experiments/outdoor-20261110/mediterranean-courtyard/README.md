# Mediterranean courtyard

Open-sky Córdoba-style social court: an L of one-storey plaster arcades on the south and west, a raised tiled fountain, one olive, bougainvillea on the arcades, terracotta pots, three shaded cafe tables, and a stone bench on the east wall. The court itself has no roof.

Warm afternoon light. The key comes from the southwest and is the only light that casts shadows. Terraces step from the entrance lane, up to the brick court, and up again onto the limestone gallery walks.

## Open

From the repository root, so the cafe asset symlinks resolve:

```bash
python3 -m http.server 8779 --bind 127.0.0.1
```

Then open `http://127.0.0.1:8779/experiments/outdoor-20261110/mediterranean-courtyard/`.

`T` toon · `U` unlit · `?mode=unlit` · `?cam=corner` · `?cam=close` · `?shot=1` hides the HUD.

## Checks

```bash
python3 experiments/outdoor-20261110/mediterranean-courtyard/test_layout.py
node experiments/outdoor-20261110/mediterranean-courtyard/test_shots.mjs
```

`test_shots.mjs` serves the repo root, renders default, corner, close, and unlit, and writes `shots/` plus `/opt/cursor/artifacts/mediterranean-courtyard_*.png`. It needs Playwright and Chrome with software WebGL (`--use-gl=angle --use-angle=swiftshader`).

Photo references and what was not copied: `refs/SOURCES.md`, `refs/GAP.md`. Asset credits: `ATTRIBUTIONS.md`.
