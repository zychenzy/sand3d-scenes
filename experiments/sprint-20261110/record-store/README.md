# Afterglow Records

Evening vinyl shop. Listening lounge and audition desk on the left, flip bins and a face-out new-release rack in the middle, cashier island on the right, album wall as the focal point. Toon-hard Three.js, vendored runtime via a symlink (not copied).

## Open

From this directory (GLBs resolve through `shared/` symlinks into existing scene folders):

```bash
cd experiments/sprint-20261110/record-store
python3 -m http.server 8788 --bind 127.0.0.1
```

http://127.0.0.1:8788/

`T` toon · `U` unlit · `1` `2` `3` cameras · `?mode=unlit` · `?cam=corner` · `?cam=close` · `?hud=0`

## Check

```bash
node tests/check_layout.mjs
```

Layout, asset paths, and listening/cashier facing are checked there. Visual review is the browser shots in the scene brief.
