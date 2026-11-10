# Quiet shared study loft

Two-height reading room: a tall communal hall with one long table, and a mezzanine of three built-in carrels reached by a stair against the left wall. Each carrel has its own banker lamp. The undercroft is lined with built-in shelves.

Shared GLBs and the vendored Three.js runtime are symlinks. Do not copy them.

## Open

From this directory (the server follows the symlinks):

```bash
cd experiments/sprint-20261110/study-loft
python3 -m http.server 8788 --bind 127.0.0.1
```

http://127.0.0.1:8788/

`T` toon · `U` unlit · `?mode=unlit` · `?cam=corner` · `?cam=close` · `?hud=0` hides the label.

## Check circulation numbers

From the repo root:

```bash
node --test experiments/sprint-20261110/study-loft/tests/circulation.test.mjs
```

The test checks stair rise/going, the aisle beside the stair, the loft walkway, chair facing, and that task lamps sit on the desks. It does not replace a visual pass.
