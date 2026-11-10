# Community allotment

A working plot: narrow raised beds, a cane row of climbing beans, a tool shed with a rain butt and compost bays, a potting bench, and a picnic corner. Paths are the circulation. Pots stay on the bench.

## Open

From the repository root, so the shared vendor and GLB symlinks resolve:

```bash
python3 -m http.server 8765 --bind 127.0.0.1
```

Then open `http://127.0.0.1:8765/experiments/outdoor-20261110/community-allotment/`

`T` toon · `U` unlit · `?mode=unlit` · `?cam=corner` · `?cam=close`

## Check

```bash
node experiments/outdoor-20261110/community-allotment/tests/layout.test.mjs
```

The test checks bed reach, path width, gate clearance, furniture facing, and that the three reused GLBs are present. It does not judge pixels. Shots in `shots/` are the visual check.
