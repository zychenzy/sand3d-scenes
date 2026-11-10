# Riverside tea pavilion

Open timber tea hall on a Chinese riverside public garden. Warm misty morning. Single hip roof with upturned corners, bamboo chairs around three tables, a service counter, low steps to the water, a side-creek stone arch, willows and rocks.

Serve from the repo root so the vendor and GLB symlinks resolve:

```bash
python3 -m http.server 8773 --bind 127.0.0.1
```

Open `http://127.0.0.1:8773/experiments/outdoor-20261110/riverside-tea-pavilion/`

`T` toon · `U` unlit · `?mode=unlit` · `?cam=corner` · `?cam=close` · drag to orbit

Layout checks: `python3 experiments/outdoor-20261110/riverside-tea-pavilion/tests/test_layout.py`

Review frames are in `shots/`. Photo notes are in `refs/SOURCES.md` and `refs/GAP.md`. Credits are in `ATTRIBUTIONS.md`.
