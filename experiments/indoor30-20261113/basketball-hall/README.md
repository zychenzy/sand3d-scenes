# Court 2 — basketball practice hall

A full FIBA practice hall: 28 m × 15 m maple, a 2 m clear runoff, wall-mounted goals, home and away benches facing the court, a scorer’s table, a ball cart, and a storage wall with a tie-up bench, a wall pad, and a ball rack. It is a court, not the bag-and-rack training room in `gym/`.

Three.js r170 stays in `gym/vendor`. Catalog GLBs stay in the scene folders that baked them. This folder references both. Nothing here copies those files.

## Open

Serve the **repository root**. Paths such as `../../../gym/vendor/...` only resolve from there.

```bash
cd /path/to/sand3d-scenes
python3 -m http.server 8813 --bind 127.0.0.1
```

http://127.0.0.1:8813/experiments/indoor30-20261113/basketball-hall/

`T` toon · `U` unlit · `?mode=unlit` · `?cam=corner` · `?cam=detail` · `?hud=0` hides the overlay. The detail still is framed taller than the wide shots so the goal and a slice of the key fill it.

## Check

```bash
node --test experiments/indoor30-20261113/basketball-hall/tests/court.test.mjs
node experiments/indoor30-20261113/basketball-hall/tests/runtime.mjs
```

The first file checks the court, the 2 m runoff, bench and storage facing, and that GLBs are root references. The second boots the page and checks the 4-step toon default, the unlit switch, rim height, and that the bench and cart stay outside the runoff.
