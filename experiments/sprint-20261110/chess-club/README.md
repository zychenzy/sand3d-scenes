# Chess clubhouse (Three.js + sand3d)

Warm-wood clubhouse: a featured match and a side board on the floor, and an analysis / viewing nook behind a timber screen. Chairs face the opponent across each board, or face the analysis table and the match they are watching. Procedural Staunton-style pieces, chess clocks, a wall clock, and two wall diagrams. Tables, chairs, lamps, bookcases, the lectern, mugs and plants are shared GLBs (symlinks — not copied).

## Open

From this directory (the server follows the symlinks into `library/` and `boardgame/`):

```bash
cd experiments/sprint-20261110/chess-club
python3 -m http.server 8793 --bind 127.0.0.1
```

http://127.0.0.1:8793/

`T` toon · `U` unlit · `?mode=unlit` · `?cam=corner` · `?cam=close` · `?hud=0` hides the overlay for shots.

## Check

```bash
node test/check_scene.mjs
```
